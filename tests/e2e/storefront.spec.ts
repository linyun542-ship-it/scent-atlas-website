import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
test("shopping, persisted bag, receipt, administrator update and customer lookup", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "Search fragrances" }).fill("Creed");
  await expect(page.locator("article.product")).toHaveCount(1);
  await page.getByRole("button", { name: "Explore Creed Aventus" }).click();
  await page.getByRole("button", { name: "5 mL $30.45" }).click();
  await page.getByRole("button", { name: "Add to bag — $30.45" }).click();
  await page.keyboard.press("Escape");
  await page.reload();
  await page.getByRole("button", { name: "Open bag, 1 samples" }).click();
  await page.getByRole("button", { name: "Place demo order" }).click();
  await expect(
    page.getByRole("heading", { name: "A lovely beginning." }),
  ).toBeVisible();
  const id = await page
    .getByRole("textbox", { name: "YOUR ORDER REFERENCE" })
    .inputValue();
  await page.goto("/admin");
  await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("test-fixture-password-only");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const order = page.locator(".admin-order").filter({ hasText: id });
  await expect(order).toBeVisible();
  await order.getByRole("button", { name: "Mark preparing" }).click();
  await expect(order.locator(".eyebrow")).toHaveText("Demo preparing");
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.goto("/");
  await page
    .getByRole("button", { name: "Find your order", exact: true })
    .click();
  await page.getByLabel("Order reference", { exact: true }).fill(id);
  await page.getByRole("button", { name: "Find demo order" }).click();
  await expect(page.locator(".order-status .eyebrow")).toHaveText(
    "Demo preparing",
  );
});
test("API rejects unauthorized administration and invalid input, and retries are idempotent", async ({
  request,
}) => {
  expect((await request.get("/api/admin/orders")).status()).toBe(401);
  expect(
    (
      await request.patch("/api/admin/orders", {
        data: { id: randomUUID(), status: "Demo preparing", version: 0 },
      })
    ).status(),
  ).toBe(401);
  const checkoutKey = randomUUID();
  const data = {
    checkoutKey,
    items: [
      {
        productId: "dolce-gabbana-light-blue",
        size: 2,
        quantity: 1,
        priceCents: 1,
      },
    ],
  };
  const first = await request.post("/api/orders", { data });
  expect(first.status()).toBe(201);
  const order = await first.json();
  expect(order.totalCents).toBe(1145);
  const second = await request.post("/api/orders", { data });
  expect((await second.json()).id).toBe(order.id);
  expect(
    (
      await request.post("/api/orders", {
        data: { ...data, items: [{ ...data.items[0], quantity: 2 }] },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await request.post("/api/orders", {
        data: { checkoutKey: randomUUID(), items: [] },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/orders", {
        data,
        headers: { Origin: "https://untrusted.example" },
      })
    ).status(),
  ).toBe(403);
});
test("mobile catalog has no horizontal overflow and filters to a coherent subset", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("article.product")).toHaveCount(30);
  await page.getByRole("button", { name: "Fresh", exact: true }).click();
  await expect(page.locator(".product-family").first()).toHaveText("Fresh");
  const dimensions = await page.evaluate(() => ({
    width: innerWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.width);
});
