import { Link } from '@tanstack/react-router';
import { cartPricing } from '../../lib/cart';
import { money } from '../../lib/catalog';
import { useCatalog } from './CatalogContext';
import { useCart } from './useCart';
import { CartItems } from './CartItems';
import { FreeShippingProgress } from './FreeShippingProgress';
import { Arrow } from './Icons';

export function StorageNotice() {
  const { storageBlocked } = useCart();
  return storageBlocked ? (
    <p className="storage-notice" role="status">
      Your browser is blocking storage. Your cart works for this visit, but it
      may not survive a reload.
    </p>
  ) : null;
}

export default function Cart() {
  const state = useCart();
  const products = useCatalog();
  if (!state.ready)
    return (
      <main id="main" className="wrap empty-page">
        <p role="status">Checking your cart…</p>
      </main>
    );
  if (!state.lines.length)
    return (
      <main className="wrap empty-page" id="main">
        <span className="eyebrow">YOUR CART</span>
        <h1>
          No slop in here.
          <br />
          <em>Yet.</em>
        </h1>
        <p>Your next questionable purchase is waiting.</p>
        <Link className="button button--dark" to="/">
          Explore the collection <Arrow />
        </Link>
        <StorageNotice />
      </main>
    );
  const pricing = cartPricing(state.lines, products);
  return (
    <main className="wrap flow-page" id="main">
      <Link className="text-button back-link" to="/">
        ← Back to the collection
      </Link>
      <span className="eyebrow">01 / THE SELECTION</span>
      <h1>
        Your <em>cart.</em>
      </h1>
      <StorageNotice />
      <div className="flow-layout">
        <CartItems lines={state.lines} products={products} />
        <aside className="order-summary">
          <h2>The short version.</h2>
          <FreeShippingProgress lines={state.lines} products={products} />
          <div className="total-row">
            <span>Subtotal</span>
            <span>{money(pricing.subtotalCents)}</span>
          </div>
          <div className="total-row">
            <span>Shipping</span>
            <span>
              {pricing.shippingCents ? money(pricing.shippingCents) : 'Free'}
            </span>
          </div>
          <p className="meta">USD. Tax is not charged.</p>
          <div className="total-row order-summary__total">
            <strong>Total</strong>
            <strong>{money(pricing.totalCents)}</strong>
          </div>
          <Link className="button button--dark button--wide" to="/checkout">
            Simulated checkout <Arrow />
          </Link>
          <p className="demo-disclosure">
            This is a demo. No payment or personal information required.
          </p>
        </aside>
      </div>
    </main>
  );
}
