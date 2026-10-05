export type Compare<T> = (a: T, b: T) => number;

/**
 * Three-way Quicksort for dense arrays. Mutates items; is not stable.
 * Average O(n log n), worst O(n²), stack O(log n).
 * compare must define a consistent order and must not mutate items.
 */
export function quickSortInPlace<T>(items: T[], compare: Compare<T>): void {
  // Assertions below rely on inclusive bounds and a dense input array.
  // Swaps preserve these invariants; assertions add no runtime checks.
  function swap(a: number, b: number): void {
    const temp = items[a]!;
    items[a] = items[b]!;
    items[b] = temp;
  }

  function sort(lo: number, hi: number): void {
    while (lo < hi) {
      const pivot = items[lo + Math.floor((hi - lo) / 2)]!;
      let lt = lo;
      let i = lo;
      let gt = hi;

      // [lo, lt): less; [lt, i): equal; [i, gt]: unknown; (gt, hi]: greater.
      while (i <= gt) {
        const result = compare(items[i]!, pivot);
        if (result < 0) {
          swap(lt++, i++);
        } else if (result > 0) {
          swap(i, gt--);
        } else {
          i++;
        }
      }

      // Only the smaller partition consumes a recursive stack frame.
      if (lt - lo < hi - gt) {
        sort(lo, lt - 1);
        lo = gt + 1;
      } else {
        sort(gt + 1, hi);
        hi = lt - 1;
      }
    }
  }

  sort(0, items.length - 1);
}
