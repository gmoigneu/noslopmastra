import { Link, useNavigate } from '@tanstack/react-router';
import { cart, cartPricing, lineKey } from '../../lib/cart';
import { colorLabel, money, productImage } from '../../lib/catalog';
import { useCatalog } from './CatalogContext';
import { useCart } from './useCart';
import { StorageNotice } from './Cart';
import { Arrow } from './Icons';
import { EmptyState } from './EmptyState';

export default function Checkout() {
  const state = useCart();
  const products = useCatalog();
  const navigate = useNavigate();
  if (!state.ready)
    return (
      <main id="main" className="wrap empty-page">
        <p role="status">Checking your cart…</p>
      </main>
    );
  if (!state.lines.length)
    return (
      <EmptyState
        eyebrow="SIMULATED CHECKOUT"
        title={
          <>
            Nothing to
            <br /> <em>overthink.</em>
          </>
        }
        description="Add an object to your cart before placing a demo order."
      />
    );
  const pricing = cartPricing(state.lines, products);
  return (
    <main className="wrap flow-page" id="main">
      <Link className="text-button back-link" to="/cart">
        ← Back to your cart
      </Link>
      <span className="eyebrow">02 / THE SIMULATION</span>
      <h1>
        Almost <em>real.</em>
      </h1>
      <div className="flow-layout">
        <section className="checkout-explanation">
          <span className="simulation-symbol" aria-hidden="true">
            ↳
          </span>
          <h2>
            All the checkout.
            <br />
            None of the commitment.
          </h2>
          <p>
            This is a simulated order. We won’t ask for your name, address,
            payment details, or a convincing reason to buy another shirt.
          </p>
          <div className="demo-panel">
            <span className="status-dot" />
            <div>
              <strong>Nothing will be charged or shipped.</strong>
              <p>
                You’ll get a fake order confirmation. Your cart will then be
                cleared.
              </p>
            </div>
          </div>
          <StorageNotice />
        </section>
        <aside className="order-summary">
          <h2>Your imaginary order.</h2>
          <ul className="summary-items">
            {state.lines.map((line) => {
              const product = products.find(
                (item) => item.id === line.productId,
              );
              if (!product) return null;
              return (
                <li key={lineKey(line)}>
                  <img
                    src={productImage(product, line.color).src}
                    alt=""
                    width="64"
                    height="64"
                  />
                  <div>
                    <strong>{product.title}</strong>
                    <p className="meta">
                      {colorLabel(line.color)} / {line.size} · Qty{' '}
                      {line.quantity}
                    </p>
                  </div>
                  <span>{money(product.priceCents * line.quantity)}</span>
                </li>
              );
            })}
          </ul>
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
          <div className="total-row order-summary__total">
            <strong>Total</strong>
            <strong>{money(pricing.totalCents)}</strong>
          </div>
          <p className="meta">USD. Tax is not charged.</p>
          <button
            className="button button--dark button--wide"
            type="button"
            onClick={() => {
              const order = cart.placeOrder();
              if (order) void navigate({ to: '/confirmation' });
            }}
          >
            Place demo order <Arrow />
          </button>
          <p className="demo-disclosure">
            No payment. No personal information. No actual order.
          </p>
        </aside>
      </div>
    </main>
  );
}
