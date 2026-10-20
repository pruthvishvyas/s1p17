export function parseBand(label) {
  const nums = (String(label).match(/\d+/g) || []).map(Number);
  if (!nums.length) return null;
  if (/</.test(label)) return [0, nums[0] - 1];
  if (/\+/.test(label)) return [nums[0], 1000];
  if (nums.length >= 2) return [nums[0], nums[1]];
  return [nums[0], nums[0]];
}

// rows: [{ x: 'Fair 580-619', y: 9.6 }] -> the band containing the score
export function bandLookup(rows, score) {
  const s = Number(score);
  if (!Array.isArray(rows) || !Number.isFinite(s)) return null;
  for (const r of rows) {
    const b = parseBand(r.x);
    if (b && s >= b[0] && s <= b[1]) return { band: r.x, rate: Number(r.y) };
  }
  return null;
}
