# Verification notes

Checked October 17, 2026 on Node.js 24 with a local Next.js production server.

## Automated checks

- TypeScript compilation and optimized production build pass.
- Five Node test cases pass: server-authoritative prices, free-delivery calculation, malformed bags, invalid catalog/size/quantity/duplicate selections, and size multipliers.
- API smoke checks pass: create an order with same-origin browser headers, ignore an injected client price, retrieve the saved receipt, reject unsupported sizes and empty bags, reject cross-origin requests, and reject malformed order references.

## Browser checks

- Desktop viewport: 1440 × 1000.
- Mobile viewport: 390 × 844; document scroll width equals viewport width, with 30 catalog cards rendered.
- Search for Creed yields one card, Aventus.
- Selecting the 5 mL Aventus variant displays $30.45.
- Add-to-bag and bag persistence after reload checked.
- Browser checkout saves an order and displays the reference and server total.
- Order lookup returns the same saved receipt.
- Modal closes using Escape.

The browser checkout initially exposed a local origin-normalization mismatch; the handler now validates the incoming Host header and protocol, and browser checkout was retested successfully. The initial missing favicon was replaced with an original SVG app icon.

## Limits

This is not a penetration test, WCAG certification, payment validation, load test, or multi-instance durability test. File persistence targets one Node process on retained disk. No real payment, shipping, fulfillment, account authentication, stock integration, or email delivery is implemented in this portfolio version.
