import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Scent Atlas — A little closer to your signature.",
  description:
    "Explore 30 fragrances in small-format samples. An independent fragrance discovery storefront and portfolio demonstration.",
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
