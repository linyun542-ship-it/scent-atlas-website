import { test } from "node:test";
import assert from "node:assert/strict";
import { quote, unitPrice, type Product } from "../lib/commerce.ts";
const product: Product = {
  id: "test",
  brand: "House",
  name: "Sample",
  concentration: "EDP",
  family: "Fresh",
  priceCents: 650,
  color: "#aaa",
  source: "https://example.com",
};
test("server ignores submitted price and calculates size/quantity from catalog", () => {
  const result = quote(
    [product],
    [{ productId: "test", size: 5, quantity: 2, priceCents: 1 }],
  );
  assert.equal(result.items[0].unitPriceCents, 1365);
  assert.equal(result.subtotalCents, 2730);
  assert.equal(result.shippingCents, 495);
  assert.equal(result.totalCents, 3225);
});
test("illustrative delivery becomes free at $35", () => {
  assert.equal(
    quote([product], [{ productId: "test", size: 10, quantity: 2 }])
      .shippingCents,
    0,
  );
});
test("reject malformed, oversized and empty bags", () => {
  for (const input of [null, [], "cart", new Array(31).fill({})])
    assert.throws(() => quote([product], input));
});
test("reject invalid product, sizes, quantity, duplicate lines", () => {
  for (const item of [
    { productId: "unknown", size: 2, quantity: 1 },
    { productId: "test", size: 3, quantity: 1 },
    { productId: "test", size: 2, quantity: -1 },
    { productId: "test", size: 2, quantity: 1.5 },
    { productId: "test", size: 2, quantity: 13 },
  ])
    assert.throws(() => quote([product], [item]));
  const item = { productId: "test", size: 2, quantity: 1 };
  assert.throws(() => quote([product], [item, item]));
});
test("all supported sample sizes have deterministic cent prices", () => {
  assert.equal(unitPrice(product, 2), 650);
  assert.equal(unitPrice(product, 5), 1365);
  assert.equal(unitPrice(product, 10), 2470);
});
