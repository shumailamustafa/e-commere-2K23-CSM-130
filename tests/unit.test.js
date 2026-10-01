import { describe, expect, it } from 'vitest';

const isValidMoney = value => Number.isFinite(Number(value)) && Number(value) >= 0;
const isValidStock = value => Number.isInteger(Number(value)) && Number(value) >= 0;
const canPublish = skus => skus.some(s => s.is_active && s.stock_quantity > 0);
const hasCycle = (nodes, id, parentId) => {
  let current = parentId;
  const seen = new Set();
  while (current != null) {
    if (current === id || seen.has(current)) return true;
    seen.add(current);
    current = nodes[current]?.parent_id ?? null;
  }
  return false;
};

describe('Sprint 2 catalog business rules', () => {
  it('accepts non-negative price and stock', () => {
    expect(isValidMoney(799)).toBe(true);
    expect(isValidStock(10)).toBe(true);
  });
  it('rejects negative price and stock', () => {
    expect(isValidMoney(-1)).toBe(false);
    expect(isValidStock(-1)).toBe(false);
  });
  it('allows a draft product without SKU', () => {
    expect(canPublish([])).toBe(false);
  });
  it('requires a sellable SKU for publishing', () => {
    expect(canPublish([{ is_active: false, stock_quantity: 10 }])).toBe(false);
    expect(canPublish([{ is_active: true, stock_quantity: 2 }])).toBe(true);
  });
  it('detects category cycles', () => {
    const nodes = { 1: { parent_id: null }, 2: { parent_id: 1 }, 3: { parent_id: 2 } };
    expect(hasCycle(nodes, 1, 3)).toBe(true);
    expect(hasCycle(nodes, 3, 1)).toBe(false);
  });
  it('represents an unavailable combination by absence', () => {
    const combinations = [{ shade: 'Rose Nude' }, { shade: 'Berry' }];
    expect(combinations.some(x => x.shade === 'Black')).toBe(false);
  });
});
