"use client";
import { useEffect, useState } from "react";
import { NEXT, type Order, type Status } from "../../lib/order-model";
import { money } from "../../lib/commerce";
export default function Admin() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  async function refresh() {
    const response = await fetch("/api/admin/orders", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401) setAuthenticated(false);
      throw new Error(data.error);
    }
    setOrders(data.orders);
  }
  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/admin/session");
        const data = await response.json();
        if (data.authenticated) {
          setAuthenticated(true);
          await refresh();
        }
      } catch {
        setError("Could not check administrator session.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  async function signin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setPassword("");
      setAuthenticated(true);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }
  async function update(order: Order, status: Status) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, status, version: order.version }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) setAuthenticated(false);
        if (response.status === 409) await refresh();
        throw new Error(data.error);
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    const response = await fetch("/api/admin/session", { method: "DELETE" });
    if (response.ok) {
      setAuthenticated(false);
      setOrders([]);
    } else setError("Could not sign out. Please retry.");
  }
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <a className="wordmark" href="/">
          SCENT<span>ATLAS</span>
        </a>
        <span className="eyebrow">STUDIO / ORDER DESK</span>
        {authenticated && (
          <button className="text-link" onClick={logout}>
            Sign out
          </button>
        )}
      </header>
      {loading ? (
        <p role="status">Checking session…</p>
      ) : !authenticated ? (
        <section className="admin-login">
          <p className="eyebrow">AUTHORIZED ACCESS</p>
          <h1>The order desk.</h1>
          <p>Sign in with your approved administrator account.</p>
          <form onSubmit={signin}>
            <label className="field-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="reference-input"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label className="field-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="reference-input"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button className="button primary wide" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <p className="fineprint">
            Restricted workspace. All orders are simulations; no payment or
            shipping occurs.
          </p>
        </section>
      ) : (
        <section>
          <div className="admin-title">
            <div>
              <p className="eyebrow">A LITTLE CARE, AT EVERY STEP</p>
              <h1>The order desk.</h1>
              <p>
                Latest {orders.length} demo orders · Changes appear in customer
                order lookup.
              </p>
            </div>
            <button
              className="button"
              disabled={busy}
              onClick={() => {
                setError("");
                refresh().catch((e) => setError(e.message));
              }}
            >
              Refresh orders ↻
            </button>
          </div>
          <div className="admin-orders">
            {orders.map((order) => (
              <article className="admin-order" key={order.id}>
                <div className="admin-order-head">
                  <div>
                    <p className="eyebrow">{order.status}</p>
                    <code>{order.id}</code>
                    <p>{new Date(order.createdAt).toLocaleString()}</p>
                  </div>
                  <strong>{money(order.totalCents)}</strong>
                </div>
                <ul>
                  {order.items.map((item) => (
                    <li key={`${item.productId}:${item.size}`}>
                      <span>
                        {item.brand} · {item.name}
                        <small>
                          {item.size} mL × {item.quantity}
                        </small>
                      </span>
                      <span>{money(item.totalCents)}</span>
                    </li>
                  ))}
                </ul>
                <div className="admin-actions">
                  {NEXT[order.status].map((status) => (
                    <button
                      className="button"
                      key={status}
                      disabled={busy}
                      onClick={() => update(order, status)}
                    >
                      {status === "Demo cancelled"
                        ? "Cancel demo order"
                        : `Mark ${status.replace("Demo ", "")}`}
                    </button>
                  ))}
                  {!NEXT[order.status].length && (
                    <span className="fineprint">
                      This demo order is closed.
                    </span>
                  )}
                </div>
              </article>
            ))}
            {!orders.length && (
              <p className="empty-bag">
                No demo orders yet. Create one in the storefront to start
                testing the workflow.
              </p>
            )}
          </div>
        </section>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
