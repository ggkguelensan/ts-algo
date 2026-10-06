# Публичные операции диапазонов

Проверяются dense валидные числовые интервалы; units включают ноль. Прототип — выбранные исследовательские ranges, а не прежний публичный API: у исходного пакета этих самостоятельных операций не было. Free проверяется независимой clipped union, capacity — сканированием всех elementary segments, conflicts — всеми парами до измерения.

| Runtime | n | Shape | Work | Variant | Median ms | Min–max ms |
|---|---:|---|---|---|---:|---|
| node | 100 | disjoint | free union incl validation and materialization | publicFree | 0.001158 | 0.001136–0.001401 |
| node | 100 | disjoint | free union incl validation and materialization | prototypeFree | 0.001374 | 0.001324–0.001493 |
| node | 100 | disjoint | free union incl validation and materialization | nativeClippedFree | 0.001423 | 0.001385–0.001521 |
| node | 100 | disjoint | free union incl validation and materialization | nativeDirectFree | 0.000879 | 0.000863–0.001068 |
| node | 100 | disjoint | conflict pairs incl validation and materialization | publicPairs | 0.003187 | 0.003086–0.003457 |
| node | 100 | disjoint | conflict pairs incl validation and materialization | prototypePairs | 0.003339 | 0.003252–0.003443 |
| node | 100 | disjoint | conflict pairs incl validation and materialization | nativeAllPairs | 0.004926 | 0.004896–0.005056 |
| node | 100 | disjoint | capacity sweep incl overflow checks and materialization | publicLoad | 0.004667 | 0.004599–0.004874 |
| node | 100 | disjoint | capacity sweep incl overflow checks and materialization | prototypeLoad | 0.004661 | 0.004573–0.004915 |
| node | 100 | short | free union incl validation and materialization | publicFree | 0.003189 | 0.003142–0.003809 |
| node | 100 | short | free union incl validation and materialization | prototypeFree | 0.003390 | 0.003315–0.003475 |
| node | 100 | short | free union incl validation and materialization | nativeClippedFree | 0.003377 | 0.003219–0.003457 |
| node | 100 | short | free union incl validation and materialization | nativeDirectFree | 0.003357 | 0.003256–0.003462 |
| node | 100 | short | conflict pairs incl validation and materialization | publicPairs | 0.011169 | 0.011006–0.011321 |
| node | 100 | short | conflict pairs incl validation and materialization | prototypePairs | 0.011253 | 0.011117–0.012728 |
| node | 100 | short | conflict pairs incl validation and materialization | nativeAllPairs | 0.006060 | 0.005949–0.006344 |
| node | 100 | short | capacity sweep incl overflow checks and materialization | publicLoad | 0.007395 | 0.007328–0.007438 |
| node | 100 | short | capacity sweep incl overflow checks and materialization | prototypeLoad | 0.007564 | 0.007495–0.007680 |
| node | 100 | nested | free union incl validation and materialization | publicFree | 0.000946 | 0.000908–0.000962 |
| node | 100 | nested | free union incl validation and materialization | prototypeFree | 0.001139 | 0.001088–0.001166 |
| node | 100 | nested | free union incl validation and materialization | nativeClippedFree | 0.001238 | 0.001205–0.001250 |
| node | 100 | nested | free union incl validation and materialization | nativeDirectFree | 0.000729 | 0.000705–0.000755 |
| node | 100 | nested | conflict pairs incl validation and materialization | publicPairs | 0.211954 | 0.204945–0.217534 |
| node | 100 | nested | conflict pairs incl validation and materialization | prototypePairs | 0.209044 | 0.203527–0.223837 |
| node | 100 | nested | conflict pairs incl validation and materialization | nativeAllPairs | 0.017655 | 0.017422–0.042785 |
| node | 100 | nested | capacity sweep incl overflow checks and materialization | publicLoad | 0.009276 | 0.009218–0.009483 |
| node | 100 | nested | capacity sweep incl overflow checks and materialization | prototypeLoad | 0.009520 | 0.009351–0.009745 |
| node | 1000 | disjoint | free union incl validation and materialization | publicFree | 0.011928 | 0.011671–0.012277 |
| node | 1000 | disjoint | free union incl validation and materialization | prototypeFree | 0.013869 | 0.013540–0.014030 |
| node | 1000 | disjoint | free union incl validation and materialization | nativeClippedFree | 0.015606 | 0.015382–0.015740 |
| node | 1000 | disjoint | free union incl validation and materialization | nativeDirectFree | 0.008774 | 0.008635–0.008868 |
| node | 1000 | disjoint | conflict pairs incl validation and materialization | publicPairs | 0.031345 | 0.031061–0.031562 |
| node | 1000 | disjoint | conflict pairs incl validation and materialization | prototypePairs | 0.032521 | 0.032194–0.032887 |
| node | 1000 | disjoint | conflict pairs incl validation and materialization | nativeAllPairs | 0.474736 | 0.465255–0.583049 |
| node | 1000 | disjoint | capacity sweep incl overflow checks and materialization | publicLoad | 0.044353 | 0.043559–0.044964 |
| node | 1000 | disjoint | capacity sweep incl overflow checks and materialization | prototypeLoad | 0.043687 | 0.043311–0.045194 |
| node | 1000 | short | free union incl validation and materialization | publicFree | 0.049958 | 0.046537–0.051330 |
| node | 1000 | short | free union incl validation and materialization | prototypeFree | 0.053644 | 0.049056–0.058730 |
| node | 1000 | short | free union incl validation and materialization | nativeClippedFree | 0.053475 | 0.052572–0.056743 |
| node | 1000 | short | free union incl validation and materialization | nativeDirectFree | 0.056370 | 0.051421–0.060042 |
| node | 1000 | short | conflict pairs incl validation and materialization | publicPairs | 0.211863 | 0.200466–0.242651 |
| node | 1000 | short | conflict pairs incl validation and materialization | prototypePairs | 0.208561 | 0.202935–0.217266 |
| node | 1000 | short | conflict pairs incl validation and materialization | nativeAllPairs | 0.914977 | 0.888492–0.937487 |
| node | 1000 | short | capacity sweep incl overflow checks and materialization | publicLoad | 0.102268 | 0.101468–0.115386 |
| node | 1000 | short | capacity sweep incl overflow checks and materialization | prototypeLoad | 0.105894 | 0.102790–0.111462 |
| node | 1000 | nested | free union incl validation and materialization | publicFree | 0.009140 | 0.008997–0.009419 |
| node | 1000 | nested | free union incl validation and materialization | prototypeFree | 0.011506 | 0.011389–0.012357 |
| node | 1000 | nested | free union incl validation and materialization | nativeClippedFree | 0.013506 | 0.013256–0.013667 |
| node | 1000 | nested | free union incl validation and materialization | nativeDirectFree | 0.006721 | 0.006668–0.006879 |
| node | 1000 | nested | conflict pairs incl validation and materialization | publicPairs | 23.735542 | 23.126166–25.407125 |
| node | 1000 | nested | conflict pairs incl validation and materialization | prototypePairs | 23.709709 | 23.130041–24.301667 |
| node | 1000 | nested | conflict pairs incl validation and materialization | nativeAllPairs | 2.679667 | 2.585938–2.826687 |
| node | 1000 | nested | capacity sweep incl overflow checks and materialization | publicLoad | 0.100442 | 0.098521–0.101449 |
| node | 1000 | nested | capacity sweep incl overflow checks and materialization | prototypeLoad | 0.099844 | 0.098180–0.102812 |
| node | 10000 | disjoint | free union incl validation and materialization | publicFree | 0.112327 | 0.110388–0.113491 |
| node | 10000 | disjoint | free union incl validation and materialization | prototypeFree | 0.132641 | 0.131137–0.133300 |
| node | 10000 | disjoint | free union incl validation and materialization | nativeClippedFree | 0.154491 | 0.153841–0.158137 |
| node | 10000 | disjoint | free union incl validation and materialization | nativeDirectFree | 0.083991 | 0.082258–0.085875 |
| node | 10000 | disjoint | conflict pairs incl validation and materialization | publicPairs | 0.311897 | 0.308600–0.317155 |
| node | 10000 | disjoint | conflict pairs incl validation and materialization | prototypePairs | 0.329264 | 0.326957–0.334096 |
| node | 10000 | disjoint | conflict pairs incl validation and materialization | nativeAllPairs | 51.269542 | 48.789209–51.897875 |
| node | 10000 | disjoint | capacity sweep incl overflow checks and materialization | publicLoad | 0.844721 | 0.759237–0.924034 |
| node | 10000 | disjoint | capacity sweep incl overflow checks and materialization | prototypeLoad | 0.845417 | 0.753581–1.125943 |
| node | 10000 | short | free union incl validation and materialization | publicFree | 0.923638 | 0.911508–0.947479 |
| node | 10000 | short | free union incl validation and materialization | prototypeFree | 0.936995 | 0.921552–0.958966 |
| node | 10000 | short | free union incl validation and materialization | nativeClippedFree | 0.940906 | 0.928758–0.969497 |
| node | 10000 | short | free union incl validation and materialization | nativeDirectFree | 1.011953 | 0.975117–1.023776 |
| node | 10000 | short | conflict pairs incl validation and materialization | publicPairs | 3.295104 | 3.244656–3.394500 |
| node | 10000 | short | conflict pairs incl validation and materialization | prototypePairs | 3.296969 | 3.223927–3.393073 |
| node | 10000 | short | conflict pairs incl validation and materialization | nativeAllPairs | 130.679083 | 130.056917–133.003750 |
| node | 10000 | short | capacity sweep incl overflow checks and materialization | publicLoad | 1.790281 | 1.726458–1.990656 |
| node | 10000 | short | capacity sweep incl overflow checks and materialization | prototypeLoad | 1.822875 | 1.762396–1.879479 |
| bun | 100 | disjoint | free union incl validation and materialization | publicFree | 0.001295 | 0.001261–0.001315 |
| bun | 100 | disjoint | free union incl validation and materialization | prototypeFree | 0.001263 | 0.001241–0.001277 |
| bun | 100 | disjoint | free union incl validation and materialization | nativeClippedFree | 0.001442 | 0.001413–0.001513 |
| bun | 100 | disjoint | free union incl validation and materialization | nativeDirectFree | 0.000950 | 0.000922–0.000991 |
| bun | 100 | disjoint | conflict pairs incl validation and materialization | publicPairs | 0.001263 | 0.001226–0.001318 |
| bun | 100 | disjoint | conflict pairs incl validation and materialization | prototypePairs | 0.001255 | 0.001236–0.001328 |
| bun | 100 | disjoint | conflict pairs incl validation and materialization | nativeAllPairs | 0.004814 | 0.004029–0.005539 |
| bun | 100 | disjoint | capacity sweep incl overflow checks and materialization | publicLoad | 0.004477 | 0.004389–0.004579 |
| bun | 100 | disjoint | capacity sweep incl overflow checks and materialization | prototypeLoad | 0.004401 | 0.004329–0.004471 |
| bun | 100 | short | free union incl validation and materialization | publicFree | 0.002867 | 0.002798–0.002903 |
| bun | 100 | short | free union incl validation and materialization | prototypeFree | 0.002816 | 0.002773–0.002860 |
| bun | 100 | short | free union incl validation and materialization | nativeClippedFree | 0.003072 | 0.002977–0.003157 |
| bun | 100 | short | free union incl validation and materialization | nativeDirectFree | 0.002790 | 0.002718–0.002885 |
| bun | 100 | short | conflict pairs incl validation and materialization | publicPairs | 0.008037 | 0.007915–0.008237 |
| bun | 100 | short | conflict pairs incl validation and materialization | prototypePairs | 0.008056 | 0.007926–0.008260 |
| bun | 100 | short | conflict pairs incl validation and materialization | nativeAllPairs | 0.010405 | 0.010329–0.010661 |
| bun | 100 | short | capacity sweep incl overflow checks and materialization | publicLoad | 0.006571 | 0.006452–0.006631 |
| bun | 100 | short | capacity sweep incl overflow checks and materialization | prototypeLoad | 0.006424 | 0.006327–0.006563 |
| bun | 100 | nested | free union incl validation and materialization | publicFree | 0.001130 | 0.001099–0.001146 |
| bun | 100 | nested | free union incl validation and materialization | prototypeFree | 0.001062 | 0.001035–0.001113 |
| bun | 100 | nested | free union incl validation and materialization | nativeClippedFree | 0.001319 | 0.001288–0.001356 |
| bun | 100 | nested | free union incl validation and materialization | nativeDirectFree | 0.000816 | 0.000775–0.000876 |
| bun | 100 | nested | conflict pairs incl validation and materialization | publicPairs | 0.171752 | 0.170320–0.176476 |
| bun | 100 | nested | conflict pairs incl validation and materialization | prototypePairs | 0.170768 | 0.169036–0.175445 |
| bun | 100 | nested | conflict pairs incl validation and materialization | nativeAllPairs | 0.021731 | 0.021319–0.022229 |
| bun | 100 | nested | capacity sweep incl overflow checks and materialization | publicLoad | 0.008701 | 0.008587–0.009004 |
| bun | 100 | nested | capacity sweep incl overflow checks and materialization | prototypeLoad | 0.008673 | 0.008512–0.009043 |
| bun | 1000 | disjoint | free union incl validation and materialization | publicFree | 0.012158 | 0.011858–0.012380 |
| bun | 1000 | disjoint | free union incl validation and materialization | prototypeFree | 0.011537 | 0.011287–0.011846 |
| bun | 1000 | disjoint | free union incl validation and materialization | nativeClippedFree | 0.014748 | 0.014653–0.015070 |
| bun | 1000 | disjoint | free union incl validation and materialization | nativeDirectFree | 0.009632 | 0.009400–0.009806 |
| bun | 1000 | disjoint | conflict pairs incl validation and materialization | publicPairs | 0.012150 | 0.011876–0.012407 |
| bun | 1000 | disjoint | conflict pairs incl validation and materialization | prototypePairs | 0.011957 | 0.011787–0.012089 |
| bun | 1000 | disjoint | conflict pairs incl validation and materialization | nativeAllPairs | 0.904672 | 0.894422–0.921419 |
| bun | 1000 | disjoint | capacity sweep incl overflow checks and materialization | publicLoad | 0.046227 | 0.045039–0.050175 |
| bun | 1000 | disjoint | capacity sweep incl overflow checks and materialization | prototypeLoad | 0.045467 | 0.044333–0.048302 |
| bun | 1000 | short | free union incl validation and materialization | publicFree | 0.049073 | 0.048335–0.050138 |
| bun | 1000 | short | free union incl validation and materialization | prototypeFree | 0.048642 | 0.047605–0.049936 |
| bun | 1000 | short | free union incl validation and materialization | nativeClippedFree | 0.051491 | 0.050452–0.052725 |
| bun | 1000 | short | free union incl validation and materialization | nativeDirectFree | 0.053794 | 0.052168–0.054441 |
| bun | 1000 | short | conflict pairs incl validation and materialization | publicPairs | 0.151646 | 0.147940–0.154334 |
| bun | 1000 | short | conflict pairs incl validation and materialization | prototypePairs | 0.150424 | 0.148169–0.153131 |
| bun | 1000 | short | conflict pairs incl validation and materialization | nativeAllPairs | 1.615714 | 1.601875–1.649240 |
| bun | 1000 | short | capacity sweep incl overflow checks and materialization | publicLoad | 0.098800 | 0.098031–0.106185 |
| bun | 1000 | short | capacity sweep incl overflow checks and materialization | prototypeLoad | 0.098833 | 0.097591–0.114028 |
| bun | 1000 | nested | free union incl validation and materialization | publicFree | 0.009801 | 0.009639–0.010160 |
| bun | 1000 | nested | free union incl validation and materialization | prototypeFree | 0.009328 | 0.009130–0.009767 |
| bun | 1000 | nested | free union incl validation and materialization | nativeClippedFree | 0.012130 | 0.011872–0.012411 |
| bun | 1000 | nested | free union incl validation and materialization | nativeDirectFree | 0.007554 | 0.007173–0.007834 |
| bun | 1000 | nested | conflict pairs incl validation and materialization | publicPairs | 19.752250 | 19.538958–24.711750 |
| bun | 1000 | nested | conflict pairs incl validation and materialization | prototypePairs | 19.758000 | 19.618542–27.980708 |
| bun | 1000 | nested | conflict pairs incl validation and materialization | nativeAllPairs | 3.631979 | 2.305375–5.401125 |
| bun | 1000 | nested | capacity sweep incl overflow checks and materialization | publicLoad | 0.089891 | 0.087358–0.092778 |
| bun | 1000 | nested | capacity sweep incl overflow checks and materialization | prototypeLoad | 0.088141 | 0.086656–0.089206 |
| bun | 10000 | disjoint | free union incl validation and materialization | publicFree | 0.112531 | 0.109777–0.120984 |
| bun | 10000 | disjoint | free union incl validation and materialization | prototypeFree | 0.107168 | 0.104412–0.117577 |
| bun | 10000 | disjoint | free union incl validation and materialization | nativeClippedFree | 0.140519 | 0.134573–0.143244 |
| bun | 10000 | disjoint | free union incl validation and materialization | nativeDirectFree | 0.089179 | 0.087687–0.094275 |
| bun | 10000 | disjoint | conflict pairs incl validation and materialization | publicPairs | 0.119983 | 0.116080–0.122486 |
| bun | 10000 | disjoint | conflict pairs incl validation and materialization | prototypePairs | 0.116662 | 0.113028–0.120599 |
| bun | 10000 | disjoint | conflict pairs incl validation and materialization | nativeAllPairs | 90.808375 | 90.493291–96.635583 |
| bun | 10000 | disjoint | capacity sweep incl overflow checks and materialization | publicLoad | 0.545747 | 0.497388–0.566289 |
| bun | 10000 | disjoint | capacity sweep incl overflow checks and materialization | prototypeLoad | 0.555161 | 0.511992–0.653385 |
| bun | 10000 | short | free union incl validation and materialization | publicFree | 0.890260 | 0.870924–0.901648 |
| bun | 10000 | short | free union incl validation and materialization | prototypeFree | 0.877687 | 0.870302–0.896596 |
| bun | 10000 | short | free union incl validation and materialization | nativeClippedFree | 0.912776 | 0.902667–0.923091 |
| bun | 10000 | short | free union incl validation and materialization | nativeDirectFree | 0.952125 | 0.938549–0.959581 |
| bun | 10000 | short | conflict pairs incl validation and materialization | publicPairs | 2.714479 | 2.696021–2.920542 |
| bun | 10000 | short | conflict pairs incl validation and materialization | prototypePairs | 2.713000 | 2.663750–2.777834 |
| bun | 10000 | short | conflict pairs incl validation and materialization | nativeAllPairs | 158.913500 | 158.582167–159.215125 |
| bun | 10000 | short | capacity sweep incl overflow checks and materialization | publicLoad | 1.565917 | 1.504479–1.634807 |
| bun | 10000 | short | capacity sweep incl overflow checks and materialization | prototypeLoad | 1.598813 | 1.524068–1.630083 |

Public validation дополнительно отклоняет дырки/некорректную форму Span и переполнение нагрузки. Prototype не предоставляет полностью тот же ошибочный-input контракт. Измерения валидных входов не скрывают эту разницу. Native direct union сортирует один массив ссылок и сливает без clipped descriptor на каждый элемент; clipped native вариант материализует нормализованные spans и поэтому не является минимальным baseline.

Dense nested conflicts имеют квадратичный размер результата; максимальный такой вход ограничен 1000 (499500 пар). Для disjoint/short также измеряются 10000. Конфликты включают сортировку и полную выдачу пар; результаты нельзя сравнивать с count-only sweep. Capacity включает накопление, сортировку, overflow checks и материализацию; это IEEE-754, не точная денежная арифметика.

Тяжёлые Node/Bun измерения последовательны; CPU/версии, настройки, девять raw samples и разброс находятся в [Node JSON](migration-ranges-node.json) и [Bun JSON](migration-ranges-bun.json). Воспроизведение из experiments/goal: `node bench-public-ranges.ts`, затем `bun bench-public-ranges.ts`.
