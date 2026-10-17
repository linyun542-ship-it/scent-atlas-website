export type Product = {
  id: string;
  brand: string;
  name: string;
  concentration: string;
  family: string;
  priceCents: number;
  color: string;
  source: string;
};
export type CartItem = { productId: string; size: number; quantity: number };
export const SIZES = [2, 5, 10] as const;
export function unitPrice(product: Product, size: number) {
  if (!SIZES.includes(size as 2 | 5 | 10))
    throw new Error("Choose a 2, 5, or 10 mL sample.");
  return Math.round(
    product.priceCents * ({ 2: 1, 5: 2.1, 10: 3.8 }[size] ?? 0),
  );
}
export function quote(catalog: Product[], input: unknown) {
  if (!Array.isArray(input) || !input.length || input.length > 30)
    throw new Error("Your bag must contain between 1 and 30 items.");
  const seen = new Set<string>();
  const items = input.map((raw) => {
    if (!raw || typeof raw !== "object") throw new Error("Invalid bag item.");
    const { productId, size, quantity } = raw as CartItem;
    const product = catalog.find((p) => p.id === productId);
    if (
      !product ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 12
    )
      throw new Error("Invalid product or quantity (maximum 12 per sample).");
    const key = `${productId}:${size}`;
    if (seen.has(key)) throw new Error("Duplicate sample selection.");
    seen.add(key);
    const priceCents = unitPrice(product, size);
    return {
      productId,
      name: product.name,
      brand: product.brand,
      size,
      quantity,
      unitPriceCents: priceCents,
      totalCents: priceCents * quantity,
    };
  });
  const subtotalCents = items.reduce((sum, item) => sum + item.totalCents, 0);
  const shippingCents = subtotalCents >= 3500 ? 0 : 495;
  return {
    items,
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
    currency: "USD",
    demo: true,
  };
}
export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
