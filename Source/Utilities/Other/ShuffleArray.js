/**
 * Returns the original array in a shuffled state
 * @template {*} T
 * @param {Array<T>} Arr
 */
function Shuffle(Arr) {
  for (let i = Arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [Arr[i], Arr[j]] = [Arr[j], Arr[i]];
  }
  return Arr;
}

module.exports = Shuffle;
