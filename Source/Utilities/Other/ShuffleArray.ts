/**
 * Returns the original array in a shuffled state
 */
export default function Shuffle<T>(Arr: Array<T>) {
  for (let i = Arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [Arr[i], Arr[j]] = [Arr[j], Arr[i]];
  }
  return Arr;
}
