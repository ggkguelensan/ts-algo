# ts-algo

Инструменты для повторяющихся задач бизнес-логики на TypeScript: сортировка сущностей, иерархии, связанные события, пространственный поиск и очереди.

Работайте с существующими Map, Set и Iterable. Сущности сохраняют идентичность; индексы хранят их ссылки и необходимые для поиска метаданные. Основные алгоритмы — без runtime-зависимостей, с типами TypeScript и отдельными ESM-экспортами. Опциональные валидаторы используют Zod Mini через отдельный импорт `ts-algo/zod`.

Пакет пока private и не опубликован. Примеры ниже показывают существующие
экспорты под будущим именем пакета. [Цель и выбранное направление](docs/design.md)
обоснованы [сравнениями](experiments/goal/results/business.md); прототипы не
входят в публичный API.

## Установка

После публикации:

```sh
npm install ts-algo
```

```ts
import { sorted, pointIndex } from "ts-algo";
import { tree, subtree } from "ts-algo/tree";
import { timeline, overlapping } from "ts-algo/time";
```

## Брендированные типы

`Brand<T, Name>` различает единицы измерения и идентификаторы на этапе компиляции:

```ts
import type { Brand } from "ts-algo";

type Milliseconds = Brand<number, "Milliseconds">;
type Seconds = Brand<number, "Seconds">;
type UserId = Brand<string, "UserId">;
```

Тип и его импорт стираются из JavaScript. `Milliseconds` остаётся числом, но обычный number и Seconds не присваиваются ему автоматически. Объявление бренда само не проверяет значение; арифметика не сохраняет единицы автоматически.

Для проверки внешних данных рекомендуем [Zod Mini](https://zod.dev/packages/mini), устанавливаемый отдельно (`npm install zod`). Можно использовать его собственные бренды:

```ts
import * as z from "zod/mini";
import { sorted } from "ts-algo";

const UserIdSchema = z.string().check(z.minLength(1)).brand<"UserId">();
type UserId = z.infer<typeof UserIdSchema>;

const users = new Map<UserId, { age: number }>([
  [UserIdSchema.parse("anna"), { age: 30 }],
  [UserIdSchema.parse("boris"), { age: 20 }],
]);

const keys = sorted(users, user => user.age, (a, b) => a - b);
// UserId[]: бренд Zod сохраняется без преобразования.
```

Собственный Brand и бренд Zod используют разные unique symbol и не взаимозаменяемы даже при одинаковом имени. Выберите одно определение для каждого доменного типа. Алгоритмы ts-algo обобщённые и сохраняют оба варианта; Zod не является зависимостью библиотеки. Создание схемы и парсинг выполняются в runtime, поэтому проверяйте данные на входе приложения, а не внутри компаратора сортировки.

## Источники и выборки

`from` связывает ссылки с сущностями. Для Map ключи и значения читаются из
текущего хранилища; Array/Set/Iterable используют элементы как сущности.
Повторный `from(source)` сохраняет привязку. Одноразовый Iterable остаётся
одноразовым; `subset` меняет набор ссылок без копирования переданного источника.

```ts
import { from, subset, entity, collect, sorted } from "ts-algo";

const people = new Map([
  ["anna", { age: 30, active: true }],
  ["boris", { age: 20, active: false }],
  ["vera", { age: 25, active: true }],
]);
const source = from(people);
const rows = collect(source, {
  context: { minimum: 21 },
  where: (person, id, ctx) => person.active && person.age >= ctx.minimum,
  select: (person, id) => ({ id, age: person.age }),
  limit: 20,
});
// [{ id: "anna", age: 30 }, { id: "vera", age: 25 }]

const order = sorted(source, person => person.age, (a, b) => a - b);
const first = collect(subset(source, order), { limit: 1 }); // ["boris"]
const boris = entity(source, "boris");
```

Порядок collect фиксирован: where → select → limit. Без select возвращаются
ссылки, с select — значения проекции без добавленного происхождения. Resolver
вызывается один раз на посещённую ссылку, если callback требует сущность.
Reference-only collect не проверяет наличие сущностей. limit=0 не читает источник;
ранняя остановка и ошибка callback закрывают итератор.

Внешний источник можно передать явно:
`from(ids, { context: storage, get: (id, storage) => storage.load(id) })`.
Getter синхронный и задаёт собственную политику отсутствия/ошибок. Для Map
отсутствующий ключ при entity/projection вызывает RangeError, присутствующий
undefined остаётся допустимым значением. Привязка удерживает resolver/контекст;
она не делает snapshot сущностей. Снимок создаётся явно через `new Map(people)`.

Контекст collect/sorted задаётся отдельно от контекста источника. Для sorted
он передаётся четвёртым аргументом `{ context }`. Колбэки не должны изменять
состав источника во время операции. Для «ограничить, затем сортировать» сначала
вызовите collect, затем sorted; это отличается от сортировки полной выборки.

## Сортировка

Получите новый массив ссылок, упорядоченный по выбранному значению. Для Map результат содержит ключи, для Set, массива и Iterable — исходные элементы.

```ts
import { sorted } from "ts-algo";

const people = new Map([
  ["anna", { age: 30 }],
  ["boris", { age: 20 }],
  ["vera", { age: 30 }],
]);

const keys = sorted(people, person => person.age, (a, b) => a - b);
// ["boris", "anna", "vera"]

const items = [...people.values()];
const ordered = sorted(items, person => person.age, (a, b) => a - b);
// Исходные объекты в новом порядке; items и people не изменяются.
```

Сортировка устойчива: равные значения сохраняют порядок источника. При двух и более элементах селектор вызывается один раз на каждое вхождение; пустой и одноэлементный источники не вызывают селектор. Значения кешируются, порядок определяется нативным `Array.sort`.

Принимайте согласованный компаратор, используйте плотные массивы и конечные Iterable. Колбэки не должны менять источник. [Подробный контракт и стоимость](docs/sorting.md).

## Проверка контрактов

Для проверки внешних массивов установите Zod (`npm install zod`) и используйте отдельный модуль:

```ts
import * as z from "zod/mini";
import { denseArray } from "ts-algo/zod";
import { sorted } from "ts-algo";

const schema = denseArray(z.optional(z.number()));
schema.safeParse([1, , 3]).success;         // false: дырка
schema.safeParse([1, undefined, 3]).success; // true: явное значение

const numbers = denseArray(z.number()).parse([3, 1, 2]);
const ordered = sorted(numbers, value => value, (a, b) => a - b);
// [1, 2, 3]
```

`denseArray` проверяет исходный массив до парсинга элементов, поддерживает их преобразования и асинхронные схемы. Если нужна только проверка плотности существующего массива, `isDenseArray(value)` из `ts-algo` не копирует элементы и не требует Zod. Проверяйте данные при получении, затем сохраняйте контракт при изменении массива. [Контракт, стоимость и ограничения](docs/validation.md).

## Дерево

`ts-algo/tree` хранит снимок связей отдельно от живых сущностей.

```ts
import { from, entity, collect, sorted } from "ts-algo";
import { tree, children, subtree, nextSibling, previousSibling, sortChildren } from "ts-algo/tree";

const items = from(new Map([
  ["catalog", { title: "Каталог" }],
  ["phones", { title: "Телефоны" }],
  ["books", { title: "Книги" }],
]));
const parents = from(new Map<string, string | null>([
  ["catalog", null], ["phones", "catalog"], ["books", "catalog"],
]));
const catalog = tree(items, (_, id) => entity(parents, id));
children(catalog, "catalog");       // ["phones", "books"]
nextSibling(catalog, "phones");     // "books"
previousSibling(catalog, "books");  // "phones"
collect(subtree(catalog, "catalog")); // ["catalog", "phones", "books"]

const ordered = sortChildren(catalog, item => item.title, (a, b) => a.localeCompare(b));
children(ordered, "catalog"); // ["books", "phones"]
const flat = sorted(catalog, item => item.title, (a, b) => a.localeCompare(b));
// Плоская сортировка ссылок; порядок детей исходного дерева не меняется.
```

Если родитель хранится в сущности, getter может читать item.parentId.
Контекст построения берётся из Source; контекст sortChildren задаётся отдельно
четвёртым аргументом `{ context }`. Одиночные группы не вызывают селектор.

Несколько корней поддерживаются. Null/undefined обозначают отсутствие родителя
и не могут быть ключами дерева. Отсутствующие родители, дубликаты и циклы
отклоняются. Обход итеративный; subtree/ancestors повторяемы и допускают limit.
Tree сам является Source с обходом preorder; parent, roots и переходы — функции.
Связи меняются только перестроением; замена сущности видна при разрешении.
Прямые roots/children — заимствованные readonly-массивы, не runtime freeze.
[Контракт](docs/design.md#деревья-зависимости-и-пространство).

## Время и диапазоны

`ts-algo/time` — статический временной индекс над Source. События могут не иметь
временных полей: время задаёт getter из сущности или внешнего хранилища.
Индекс не содержит причинного графа и не знает бизнес-поля вроде ownerId.

```ts
import { from, entity, collect } from "ts-algo";
import { timeline, startsBetween, overlapping } from "ts-algo/time";
import { conflicts, freeSlots, overloaded } from "ts-algo/ranges";

const events = from(new Map([
  ["order", { owner: "customer", units: 2 }],
  ["payment", { owner: "customer", units: 2 }],
]));
const times = from(new Map([
  ["order", { start: 0, end: 10 }],
  ["payment", { start: 5, end: 15 }],
]));
const history = timeline(events, (_, id) => entity(times, id));
const window = { start: 0, end: 20 };
collect(startsBetween(history, { start: 5, end: 6 })); // ["payment"]
collect(overlapping(history, { start: 5, end: 6 })); // ["order", "payment"]
const reservations = collect(overlapping(history, window), {
  context: { owner: "customer" },
  where: (event, id, ctx) => event.owner === ctx.owner,
  select: (event, id) => ({ ...entity(times, id), units: event.units }),
});
conflicts(reservations);            // [[0, 1]]: индексы в reservations
freeSlots(reservations, window);    // [{ start: 15, end: 20 }]
overloaded(reservations, window, 3); // [{ start: 5, end: 10 }]
```

Окна полуоткрытые: `[start,end)`. Нулевая длительность — событие-точка; пустое
окно не содержит событий. Range-операции не считают точку занятой длительностью.
Результаты времени идут по началу события с сохранением порядка равных начал.

Date и number нормализуются при построении; со смешанными Date числа означают
epoch milliseconds. Интерфейс start/end структурно совместим с date-fns Interval
для Date/number, без runtime- или type-зависимости от date-fns. Строки разберите
заранее с явной политикой часового пояса. Календарные addDays и длительность
addHours имеют разную семантику на переходе летнего времени.

Состав/время фиксируются в индексе; сущности читаются из текущего хранилища.
Временные выборки ленивы и повторяемы, окно фиксируется при вызове. Для массива
результата используйте collect; limit может остановить поиск и разрешение
сущностей раньше. Изменение времени требует перестроения. При частых правках
или больших результатах прямой проход может быть дешевле индекса.

Диапазоны используют конечные числовые start/end и не делают календарной
арифметики. Вместимость и units неотрицательны; переполнение накопленной
нагрузки отклоняется. Обычная арифметика IEEE-754 не обеспечивает точные суммы.
[Контракты и границы](docs/design.md#время).

Старый timeline с методами/причинностью перенесён в references и исключён из
поставки. Причинность доступна отдельным импортом ниже.

## Причинные зависимости

`ts-algo/dependencies` создаёт статический DAG независимо от времени.

```ts
import { from, entity, collect } from "ts-algo";
import { dependencies, causesOf, effectsOf, descendants, causalOrder } from "ts-algo/dependencies";

const jobs = from(new Map([
  ["order", { status: "done", owner: "alice" }],
  ["payment", { status: "pending", owner: "alice" }],
]));
const links = new Map([["order", []], ["payment", ["order"]]]);
const graph = dependencies(jobs, (_, id) => links.get(id) ?? []);
causesOf(graph, "payment"); // ["order"]
effectsOf(graph, "order");  // ["payment"]
collect(causalOrder(graph)); // ["order", "payment"]
collect(descendants(graph, "order"), { select: (job, id) => ({ id, owner: job.owner }) });
const ready = collect(graph, {
  where: (job, id) => job.status === "pending"
    && causesOf(graph, id).every(cause => entity(graph, cause).status === "done"),
}); // ["payment"]
```

Повторные рёбра объединяются; отсутствующие ссылки и циклы отклоняются.
Причины задаются getter с контекстом Source; сущность не обязана знать свои связи.
causalOrder использует порядок, рассчитанный при проверке циклов. ancestors и
descendants обходят граф в ширину, исключают начальный узел и дубли, возвращают
ленивый Source. Прямые причины/следствия — readonly-массивы ссылок.
Исходный порядок Graph Source — порядок входа, не топологический порядок.
Состав/рёбра фиксируются, сущности читаются из текущего источника.

## Пространственный поиск

Найдите точки внутри области или ближайшую точку на плоскости.

```ts
import { pointIndex } from "ts-algo";

const places = new Map([
  ["office", { x: 10, y: 20 }],
  ["warehouse", { x: 80, y: 90 }],
]);
const index = pointIndex(places, { x: place => place.x, y: place => place.y });

index.within({ minX: 0, minY: 0, maxX: 50, maxY: 50 }); // ["office"]
index.nearest(12, 20, 10); // { reference: "office", distance: 2 }
```

Map возвращает ключи; Set, массив и Iterable — элементы. Границы области и радиус включены. Порядок `within` не определён; при равном расстоянии `nearest` выбирает первое вхождение источника. Если подходящей точки нет, результат — undefined.

Координаты считываются один раз и должны быть конечными. После изменения координат или состава пересоздайте индекс. [Устройство и ограничения](docs/design.md#пространство).

## Очереди

FIFO для обработки заданий и deque для операций с обоих концов.

```ts
import { queue, deque } from "ts-algo";

const jobs = queue<string>();
jobs.enqueue("send-email");
jobs.enqueue("update-report");
jobs.dequeue(); // "send-email"
jobs.peek();    // "update-report"

const pending = deque(["regular"]);
pending.pushFront("urgent");
pending.pushBack("later");
pending.popFront(); // "urgent"
pending.popBack();  // "later"
```

Операции с концами амортизированно O(1). Значения хранятся в массивах без объекта-узла на каждый элемент. Пустое извлечение возвращает undefined; если undefined — допустимое значение, проверяйте `size`.

## Связные списки

Используйте стабильные узлы для вставок и удаления рядом с известной позицией.

```ts
import { linkedList, doublyLinkedList } from "ts-algo";

const single = linkedList(["a"]);
const first = single.first;
if (first) single.insertAfter(first, "b");
// [...single]: ["a", "b"]

const sequence = doublyLinkedList(["a", "c"]);
const last = sequence.last;
if (last) {
  const middle = sequence.insertBefore(last, "b");
  middle.previous?.value; // "a"
  middle.next?.value;     // "c"
  sequence.remove(middle);
}
// [...sequence]: ["a", "c"]
```

У односвязного списка есть `next`, у двусвязного — также `previous`. Связи узлов доступны только для чтения; изменение выполняется методами списка. Чужие и отсоединённые узлы вызывают RangeError.

Все очереди и списки реализуют Iterable и работают с `sorted`. Сортировка возвращает массив значений; порядок самой коллекции сохраняется. [Операции, сложность и выбор структуры](docs/sequences.md).

## Производительность и размер

Измерения сравнивают операции с нативными решениями и учитывают стоимость построения индексов. Выбор зависит от данных: массив с курсором эффективен для разового FIFO, пакетный `filter` — для массовых удалений, индексы — для повторных выборочных запросов.

| Область | Node / V8 | Bun / JavaScriptCore |
|---|---|---|
| Точки | [Отчёт](docs/spatial-results-node.md) | [Отчёт](docs/spatial-results-bun.md) |
| Дерево и хронология | [Отчёт](docs/hierarchy-time-results-node.md) | [Отчёт](docs/hierarchy-time-results-bun.md) |
| Очереди, списки и интервалы | [Отчёт](docs/sequences-intervals-results-node.md) | [Отчёт](docs/sequences-intervals-results-bun.md) |

[Сортировка и кеширование](docs/benchmark-results.md) · [Map/Set](docs/collections-results.md) · [Размер отдельных импортов](docs/bundle-results.md).

Отчёты фиксируют конкретные версии runtime и одну машину. Они не измеряют браузеры или пиковую память. Учебные алгоритмы находятся в [references](references/README.md) и используются только для сравнений.

## Разработка

[Сборка, проверки и запуск бенчмарков](docs/contributing.md) · [Принципы и план развития](docs/design.md).
