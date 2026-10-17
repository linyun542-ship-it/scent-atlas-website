"use client";
import { useEffect, useRef, useState } from "react";
import products from "../lib/catalog.json";
import {
  money,
  quote,
  SIZES,
  unitPrice,
  type CartItem,
  type Product,
} from "../lib/commerce";
import type { Order } from "../lib/orders";

function Vial({
  product,
  large = false,
  volume = 5,
}: {
  product?: Product;
  large?: boolean;
  volume?: number;
}) {
  return (
    <div
      className={`vial-scene ${large ? "large" : ""}`}
      style={{ "--juice": product?.color ?? "#c1a268" } as React.CSSProperties}
      aria-hidden="true"
    >
      <div className="vial-shadow" />
      <div className="vial">
        <div className="vial-cap" />
        <div className="vial-neck" />
        <div className="vial-glass">
          <div className="vial-juice" />
          <div className="vial-label">
            <span>SCENT ATLAS</span>
            <b>{product?.name ?? "THE DISCOVERY EDIT"}</b>
            <small>
              {product?.concentration ?? "EAU DE PARFUM"} · {volume} mL
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("All scents");
  const [sort, setSort] = useState("curated");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [size, setSize] = useState(2);
  const [panel, setPanel] = useState<"bag" | "track" | "about" | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<Order | null>(null);
  const [reference, setReference] = useState("");
  const [lookup, setLookup] = useState<Order | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const modalOpen = !!selected || !!panel;

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(
        localStorage.getItem("scent-atlas-bag") || "[]",
      );
      if (Array.isArray(saved) && saved.length) {
        quote(products, saved);
        setCart(saved);
      }
      setReference(localStorage.getItem("scent-atlas-receipt") || "");
    } catch {
      /* Ignore invalid local demo state. */
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem("scent-atlas-bag", JSON.stringify(cart));
  }, [cart, loaded]);
  useEffect(() => {
    if (modalOpen) {
      lastFocus.current = document.activeElement as HTMLElement;
      dialog.current?.showModal();
      document.body.style.overflow = "hidden";
    } else {
      dialog.current?.close();
      document.body.style.overflow = "";
      lastFocus.current?.focus();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 3000);
    return () => clearTimeout(id);
  }, [notice]);

  function close() {
    setSelected(null);
    setPanel(null);
    setError("");
  }
  function openPanel(value: typeof panel) {
    setSelected(null);
    setPanel(value);
    setError("");
  }
  function add(product: Product, sampleSize = 2) {
    const existing = cart.find(
      (item) => item.productId === product.id && item.size === sampleSize,
    );
    if (existing && existing.quantity >= 12) {
      setNotice("Maximum 12 of the same sample.");
      return;
    }
    if (!existing && cart.length >= 30) {
      setNotice("Your bag can hold up to 30 sample selections.");
      return;
    }
    setCart(
      existing
        ? cart.map((item) =>
            item === existing ? { ...item, quantity: item.quantity + 1 } : item,
          )
        : [...cart, { productId: product.id, size: sampleSize, quantity: 1 }],
    );
    setReceipt(null);
    setNotice(`${product.name} · ${sampleSize} mL added to your bag`);
  }
  function quantity(index: number, change: number) {
    setCart(
      cart.flatMap((item, i) =>
        i !== index
          ? [item]
          : item.quantity + change <= 0
            ? []
            : [{ ...item, quantity: Math.min(12, item.quantity + change) }],
      ),
    );
    setReceipt(null);
  }
  async function checkout() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setReceipt(data);
      setReference(data.id);
      localStorage.setItem("scent-atlas-receipt", data.id);
      setCart([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to place demo order.");
    } finally {
      setBusy(false);
    }
  }
  async function track(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setLookup(null);
    try {
      const response = await fetch(
        `/api/orders?id=${encodeURIComponent(reference.trim())}`,
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setLookup(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to find order.");
    } finally {
      setBusy(false);
    }
  }
  const filtered = products.filter(
    (p) =>
      (family === "All scents" || p.family === family) &&
      `${p.name} ${p.brand} ${p.family}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  if (sort === "price-low")
    filtered.sort((a, b) => a.priceCents - b.priceCents);
  if (sort === "name") filtered.sort((a, b) => a.name.localeCompare(b.name));
  const total = cart.length ? quote(products, cart) : null;
  const count = cart.reduce((n, item) => n + item.quantity, 0);

  return (
    <>
      <div className="announcement">
        A small beginning. A lasting impression.
        <span>Portfolio store · No real payments</span>
      </div>
      <header className="header">
        <a href="#" className="wordmark">
          SCENT<span>ATLAS</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#collection">The collection</a>
          <button onClick={() => openPanel("about")}>Our approach</button>
          <button
            onClick={() => {
              setLookup(null);
              openPanel("track");
            }}
          >
            Find your order
          </button>
        </nav>
        <button
          className="bag-button"
          onClick={() => openPanel("bag")}
          aria-label={`Open bag, ${count} samples`}
        >
          Bag <span>{count.toString().padStart(2, "0")}</span>
          <svg
            width="19"
            height="21"
            viewBox="0 0 19 21"
            fill="none"
            aria-hidden="true"
          >
            <path d="M3 6h13l1 14H2L3 6Z" stroke="currentColor" />
            <path d="M6 7V4a3.5 3.5 0 0 1 7 0v3" stroke="currentColor" />
          </svg>
        </button>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">THE ART OF TRYING SOMETHING NEW</p>
            <h1>
              Your signature.
              <br />A little <em>closer.</em>
            </h1>
            <p className="hero-description">
              Meet the fragrances you’ve been curious about.
              <br className="desktop-break" /> Small formats. Room to explore. A
              scent that feels like you.
            </p>
            <a className="button primary" href="#collection">
              Discover the collection <span>↗</span>
            </a>
            <div className="hero-bottom">
              <span>01 — THE DISCOVERY COLLECTION</span>
              <span>2 mL / 5 mL / 10 mL</span>
            </div>
          </div>
          <div className="hero-art">
            <div className="art-orbit" />
            <div className="hero-specimen first">
              <Vial product={products[12]} large />
            </div>
            <div className="hero-specimen second">
              <Vial product={products[5]} large />
            </div>
            <div className="hero-specimen third">
              <Vial product={products[7]} large />
            </div>
            <div className="art-caption">
              <span>
                THE WORLD OF SCENT,
                <br />
                IN SMALLER MEASURES.
              </span>
              <span className="seal">
                S / A<br />
                <small>EST. 2026</small>
              </span>
            </div>
          </div>
        </section>
        <section
          className="promise-strip"
          aria-label="Sample format information"
        >
          <span>
            <i>01</i> Find your fragrance
          </span>
          <span>
            <i>02</i> Choose your sample size
          </span>
          <span>
            <i>03</i> Make room for discovery
          </span>
          <a href="#guide">A guide to sampling ↗</a>
        </section>
        <section id="collection" className="collection">
          <div className="section-heading">
            <div>
              <p className="eyebrow">THE DISCOVERY COLLECTION</p>
              <h2>
                A world, <em>by the milliliter.</em>
              </h2>
            </div>
            <p>
              Thirty fragrances. Endless possibilities.
              <br />
              Start with a little, discover a lot.
            </p>
          </div>
          <div className="catalog-toolbar">
            <div className="tabs" aria-label="Filter by scent collection">
              {["All scents", "Fresh", "Floral", "Woody", "Amber", "Sweet"].map(
                (f) => (
                  <button
                    key={f}
                    aria-pressed={family === f}
                    className={family === f ? "active" : ""}
                    onClick={() => setFamily(f)}
                  >
                    {f}
                  </button>
                ),
              )}
            </div>
            <label className="search">
              <svg
                width="17"
                height="17"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="8" cy="8" r="5" stroke="currentColor" />
                <path d="m12 12 5 5" stroke="currentColor" />
              </svg>
              <input
                aria-label="Search fragrances"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="A name, a house, a feeling…"
              />
            </label>
          </div>
          <div className="catalog-meta">
            <span aria-live="polite">
              {filtered.length} fragrances to discover
            </span>
            <label>
              Sort by{" "}
              <select
                aria-label="Sort fragrances"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="curated">The curated edit</option>
                <option value="price-low">Price: low to high</option>
                <option value="name">Name: A–Z</option>
              </select>
            </label>
          </div>
          <div className="products">
            {filtered.map((p, i) => (
              <article className="product" key={p.id}>
                <button
                  className="product-image"
                  aria-label={`Explore ${p.brand} ${p.name}`}
                  onClick={() => {
                    setSelected(p);
                    setSize(2);
                    setPanel(null);
                  }}
                >
                  <span className="product-index">
                    {(products.indexOf(p) + 1).toString().padStart(2, "0")}
                  </span>
                  <span className="product-family">{p.family}</span>
                  <Vial product={p} />
                  <span className="explore-label">Explore fragrance ↗</span>
                </button>
                <div className="product-info">
                  <p className="brand">{p.brand}</p>
                  <button
                    className="product-title"
                    onClick={() => {
                      setSelected(p);
                      setSize(2);
                      setPanel(null);
                    }}
                  >
                    {p.name}
                  </button>
                  <p className="concentration">
                    {p.concentration} <span>·</span> 2 / 5 / 10 mL
                  </p>
                  <div className="product-bottom">
                    <span>
                      From <strong>{money(p.priceCents)}</strong>
                    </span>
                    <button
                      onClick={() => add(p)}
                      aria-label={`Add 2 mL ${p.name} to bag`}
                    >
                      Add sample <span>+</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!filtered.length && (
            <div className="no-results">
              <h3>A different direction?</h3>
              <p>
                No fragrances match this search. Try a house name or reset your
                filters.
              </p>
              <button
                className="button"
                onClick={() => {
                  setQuery("");
                  setFamily("All scents");
                }}
              >
                Reset filters
              </button>
            </div>
          )}
        </section>
        <section id="guide" className="guide">
          <div>
            <p className="eyebrow">LESS COMMITMENT. MORE POSSIBILITY.</p>
            <h2>
              Good things come
              <br />
              in <em>small measures.</em>
            </h2>
            <p>
              There’s no need to decide on a full bottle.
              <br />
              Make a little space for something unexpected.
            </p>
          </div>
          <div className="size-guide">
            {[
              {
                size: "2",
                title: "The first impression",
                text: "A small introduction to a new fragrance.",
              },
              {
                size: "5",
                title: "A little more time",
                text: "Explore how a scent fits into your routine.",
              },
              {
                size: "10",
                title: "The everyday companion",
                text: "A portable format for a familiar favorite.",
              },
            ].map((s) => (
              <div key={s.size}>
                <strong>
                  {s.size}
                  <small> mL</small>
                </strong>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer>
        <a className="wordmark" href="#">
          SCENT<span>ATLAS</span>
        </a>
        <p>
          An independent fragrance discovery concept.
          <br />
          30 fragrances. One personal journey.
        </p>
        <div>
          <button onClick={() => openPanel("about")}>
            About this collection ↗
          </button>
          <button onClick={() => openPanel("track")}>Order lookup ↗</button>
        </div>
        <div className="footer-bottom">
          <span>© 2026 SCENT ATLAS · PORTFOLIO DEMONSTRATION</span>
          <span>
            Illustrative decant packaging · Demo prices · No brand affiliation
          </span>
        </div>
      </footer>
      <div className={`toast ${notice ? "visible" : ""}`} role="status">
        {notice}
      </div>
      <dialog
        ref={dialog}
        aria-label={
          selected
            ? `${selected.name} sample details`
            : panel === "bag"
              ? "Shopping bag"
              : panel === "track"
                ? "Order lookup"
                : "About Scent Atlas"
        }
        onCancel={close}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className={selected ? "product-dialog" : ""}
      >
        <button className="close" aria-label="Close dialog" onClick={close}>
          ×
        </button>
        {selected && (
          <div className="detail">
            <div className="detail-art">
              <Vial product={selected} large volume={size} />
            </div>
            <div className="detail-copy">
              <p className="eyebrow">{selected.brand}</p>
              <h2>{selected.name}</h2>
              <p>
                {selected.concentration} · {selected.family} collection
              </p>
              <p className="detail-description">
                A little space to get acquainted. Choose a small-format sample
                and explore this fragrance at your own pace.
              </p>
              <fieldset>
                <legend>Choose your sample size</legend>
                <div className="sizes">
                  {SIZES.map((s) => (
                    <button
                      key={s}
                      className={size === s ? "selected" : ""}
                      aria-pressed={size === s}
                      onClick={() => setSize(s)}
                    >
                      <b>{s} mL</b>
                      <span>{money(unitPrice(selected, s))}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
              <button
                className="button primary wide"
                onClick={() => add(selected, size)}
              >
                Add to bag — {money(unitPrice(selected, size))} <span>+</span>
              </button>
              <p className="fineprint">
                Independent decant concept. Packaging is illustrative. Demo
                pricing; no purchase or shipment occurs.
              </p>
              <a
                className="text-link"
                href={selected.source}
                target="_blank"
                rel="noreferrer"
              >
                View collection source ↗
              </a>
            </div>
          </div>
        )}
        {panel === "bag" && (
          <div className="panel">
            <p className="eyebrow">YOUR NEXT DISCOVERY</p>
            <h2>{receipt ? "A lovely beginning." : "The sample bag."}</h2>
            {receipt ? (
              <>
                <div className="success-mark">✓</div>
                <p>
                  Your demo order has been saved. No payment was taken and
                  nothing will be shipped.
                </p>
                <label className="receipt-label">
                  YOUR ORDER REFERENCE
                  <input
                    readOnly
                    value={receipt.id}
                    onFocus={(e) => e.target.select()}
                  />
                </label>
                <p>
                  Total: <strong>{money(receipt.totalCents)}</strong>
                </p>
                <button
                  className="button primary wide"
                  onClick={() => {
                    setLookup(receipt);
                    openPanel("track");
                  }}
                >
                  View order status ↗
                </button>
              </>
            ) : cart.length ? (
              <>
                <ul className="bag-items">
                  {cart.map((item, index) => {
                    const p = products.find((p) => p.id === item.productId)!;
                    return (
                      <li key={`${item.productId}-${item.size}`}>
                        <div className="bag-vial">
                          <Vial product={p} volume={item.size} />
                        </div>
                        <div className="bag-item-info">
                          <p className="brand">{p.brand}</p>
                          <h3>{p.name}</h3>
                          <p>
                            {item.size} mL · {p.concentration}
                          </p>
                          <div className="quantity">
                            <button
                              onClick={() => quantity(index, -1)}
                              aria-label={`Decrease ${p.name} quantity`}
                            >
                              −
                            </button>
                            <span>{item.quantity}</span>
                            <button
                              onClick={() => quantity(index, 1)}
                              aria-label={`Increase ${p.name} quantity`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <strong>
                          {money(unitPrice(p, item.size) * item.quantity)}
                        </strong>
                      </li>
                    );
                  })}
                </ul>
                <dl className="totals">
                  <div>
                    <dt>Samples</dt>
                    <dd>{money(total!.subtotalCents)}</dd>
                  </div>
                  <div>
                    <dt>Demo delivery</dt>
                    <dd>
                      {total!.shippingCents
                        ? money(total!.shippingCents)
                        : "On us"}
                    </dd>
                  </div>
                  <div className="grand-total">
                    <dt>Total</dt>
                    <dd>{money(total!.totalCents)}</dd>
                  </div>
                </dl>
                <p className="fineprint">
                  Illustrative delivery is free at $35. This is a demo order: no
                  payment, shipping address, or email is collected.
                </p>
                <button
                  className="button primary wide"
                  disabled={busy}
                  onClick={checkout}
                >
                  {busy ? "Saving your demo order…" : "Place demo order"}{" "}
                  <span>↗</span>
                </button>
              </>
            ) : (
              <>
                <p className="empty-bag">
                  Your next favorite is waiting.
                  <br />
                  Add a sample to start exploring.
                </p>
                <button className="button primary wide" onClick={close}>
                  Explore the collection ↗
                </button>
              </>
            )}
          </div>
        )}
        {panel === "track" && (
          <div className="panel">
            <p className="eyebrow">FOLLOW YOUR DISCOVERY</p>
            <h2>Your order, at a glance.</h2>
            <form onSubmit={track}>
              <label className="field-label" htmlFor="reference">
                Order reference
              </label>
              <input
                id="reference"
                className="reference-input"
                required
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Paste the reference from your receipt"
              />
              <button className="button primary wide" disabled={busy}>
                {busy ? "Finding your order…" : "Find demo order"}{" "}
                <span>↗</span>
              </button>
            </form>
            {lookup && (
              <div className="order-status">
                <p className="eyebrow">{lookup.status}</p>
                <p>
                  {new Date(lookup.createdAt).toLocaleDateString("en-US", {
                    dateStyle: "long",
                  })}
                </p>
                {lookup.items.map((item) => (
                  <div
                    className="order-line"
                    key={`${item.productId}-${item.size}`}
                  >
                    <span>
                      {item.name} · {item.size} mL × {item.quantity}
                    </span>
                    <strong>{money(item.totalCents)}</strong>
                  </div>
                ))}
                <p>
                  Total including illustrative delivery:{" "}
                  <strong>{money(lookup.totalCents)}</strong>
                </p>
                <p className="fineprint">
                  Simulation only. No payment, real inventory, fulfillment, or
                  shipment.
                </p>
              </div>
            )}
          </div>
        )}
        {panel === "about" && (
          <div className="panel about">
            <p className="eyebrow">THE SCENT ATLAS APPROACH</p>
            <h2>Discovery over certainty.</h2>
            <p>
              We believe getting to know a fragrance should begin with
              curiosity, not a full bottle.
            </p>
            <p>
              This independent portfolio storefront explores how a small-format
              fragrance shop could work: a searchable collection, sample-size
              selection, a persistent bag, server-priced orders, and order
              lookup.
            </p>
            <h3>A collection, not a sales ranking</h3>
            <p>
              The 30 fragrances were selected from FragranceNet’s best-selling
              collection pages, reviewed October 17, 2026. Listings change;
              these are not verified sales positions. Scent families are
              editorial browsing categories.
            </p>
            <h3>A considered demonstration</h3>
            <p>
              All sample prices, packaging, and delivery amounts are
              illustrative. There is no brand affiliation, verified stock, or
              official manufacturer sample claim. Orders are simulations with no
              real payment or shipment.
            </p>
            <a
              className="text-link"
              href="https://www.fragrancenet.com/boutiques/best-selling-perfumes"
              target="_blank"
              rel="noreferrer"
            >
              Browse the catalog reference ↗
            </a>
          </div>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </dialog>
    </>
  );
}
