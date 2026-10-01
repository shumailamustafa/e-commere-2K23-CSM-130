export function isValidMoney(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0;
}

export function isValidStock(value) {
  return Number.isInteger(Number(value)) && Number(value) >= 0;
}

export function canPublish(skus) {
  return skus.some((s) => s.is_active && Number(s.stock_quantity) > 0);
}

export function hasCategoryCycle(nodes, id, parentId) {
  let current = parentId;
  const seen = new Set();
  while (current != null) {
    if (String(current) === String(id) || seen.has(String(current))) return true;
    seen.add(String(current));
    current = nodes[current]?.parent_id ?? null;
  }
  return false;
}
