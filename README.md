# ts-algo

Инструменты для повторяющихся задач бизнес-логики на TypeScript: сортировка сущностей, иерархии, связанные события, пространственный поиск и очереди.

Работайте с существующими Map, Set и Iterable. Сущности сохраняют идентичность; индексы хранят их ссылки и необходимые для поиска метаданные. Основные алгоритмы — без runtime-зависимостей, с типами TypeScript и отдельными ESM-экспортами. Опциональные валидаторы используют Zod Mini через отдельный импорт `ts-algo/zod`.

## Установка

```sh
npm install ts-algo
```

```ts
import { sorted, tree, timeline, pointIndex } from "ts-algo";
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

Создайте иерархию из Map с селектором родителя. Несколько корней допустимы.

```ts
import { tree, sorted } from "ts-algo";

type Item = Readonly<{ parentId: string | null; title: string }>;
const items = new Map<string, Item>([
  ["catalog", { parentId: null, title: "Каталог" }],
  ["phones", { parentId: "catalog", title: "Телефоны" }],
  ["books", { parentId: "catalog", title: "Книги" }],
]);

const catalog = tree(items, { parent: item => item.parentId });
catalog.children("catalog");     // ["phones", "books"]
catalog.nextSibling("phones");   // "books"
catalog.previousSibling("books"); // "phones"
[...catalog.subtree("catalog")]; // ["catalog", "phones", "books"]

const ordered = catalog.sortBy(item => item.title, (a, b) => a.localeCompare(b));
ordered.children("catalog"); // ["books", "phones"]

const keys = sorted(catalog, item => item.title, (a, b) => a.localeCompare(b));
// Плоский массив ключей, упорядоченный по названию.
```

`sortBy` возвращает новый вид с сохранением иерархии. Переходы к соседям остаются внутри одной группы детей. Корневой родитель — null/undefined; ключи узлов должны быть non-nullish. Отсутствующий родитель и циклы вызывают RangeError. Состав и связи — снимок при создании. [Контракт дерева](docs/tree-timeline.md#дерево).

## Хронология

Привяжите события к моменту или промежутку времени и причинным связям. Бизнес-свойства, например `ownerId`, остаются у событий.

```ts
import { timeline } from "ts-algo";

type Event = Readonly<{
  start: number;
  end: number;
  ownerId: string;
  causes: readonly string[];
}>;
const storage = new Map<string, Event>([
  ["order", { start: 0, end: 10, ownerId: "customer", causes: [] }],
  ["payment", { start: 5, end: 5, ownerId: "customer", causes: ["order"] }],
]);

const history = timeline(storage);
history.between(5, 6);     // ["payment"]: начало внутри окна
history.overlapping(5, 6); // ["order", "payment"]: пересечение окна
history.filter(event => event.ownerId === "customer"); // ["order", "payment"]
history.causesOf("payment"); // ["order"]
history.effectsOf("order");  // ["payment"]
```

Без селекторов поддерживаются поля `{ at }` или `{ start, end }` и необязательные `causes`/`effects`. Для другой формы данных передайте `time`, `causes` и/или `effects`. Через `context` и `get` можно получать сущности и метаданные из внешних источников.

Окна и длительности полуоткрытые: `[start, end)`. Нулевая длительность — точечное событие. Время должно быть конечным числом в единицах вызывающего кода; часовые пояса автоматически не преобразуются. Причинные связи допускают несколько причин, но запрещают отсутствующие ссылки и циклы.

Состав, время и причинность кешируются при создании. Чтение сущностей и фильтры обращаются к актуальному внешнему источнику; изменение временных метаданных требует перестроения. [Все операции и пример внешнего хранилища](docs/tree-timeline.md#хронология-ссылки-время-и-причинность).

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
