import { Link } from '@tanstack/react-router';
import { lineKey } from '../../lib/cart';
import { colorLabel, money } from '../../lib/catalog';
import { useCart } from './useCart';
import { Arrow } from './Icons';
import { EmptyState } from './EmptyState';

export default function Confirmation() {
  const { ready, order } = useCart();
  if (!ready)
    return (
      <main id="main" className="wrap empty-page">
        <p role="status">Finding your imaginary order…</p>
      </main>
    );
  if (!order)
    return (
      <EmptyState
        eyebrow="NO DEMO ORDER YET"
        title={
          <>
            Probably
            <br /> <em>hallucinated.</em>
          </>
        }
        description="There’s no order confirmation in this tab yet."
      />
    );
  return (
    <main className="wrap confirmation-page" id="main">
      <div className="confirmation-heading">
        <span className="confirmation-check" aria-hidden="true">
          ✓
        </span>
        <span className="eyebrow">03 / MISSION SIMULATED</span>
        <h1>
          You’re absolutely
          <br /> <em>not being charged.</em>
        </h1>
        <p>
          Your demo order is confirmed. Nothing will be shipped.
          <br />
          The skepticism looks good on you, though.
        </p>
        <span className="order-reference mono">{order.reference}</span>
      </div>
      <section className="confirmation-receipt" aria-label="Demo order receipt">
        <div className="total-row">
          <h2>Your imaginary haul.</h2>
          <span className="eyebrow">DEMO CONFIRMATION</span>
        </div>
        <ul className="summary-items">
          {order.lines.map((line) => (
            <li key={lineKey(line)}>
              <img src={line.image} alt="" width="80" height="80" />
              <div>
                <strong>{line.title}</strong>
                <p className="meta">
                  {colorLabel(line.color)} / {line.size} · Qty {line.quantity}
                </p>
              </div>
              <span>{money(line.priceCents * line.quantity)}</span>
            </li>
          ))}
        </ul>
        {order.shippingCents !== undefined ? (
          <>
            <div className="total-row">
              <span>Subtotal</span>
              <span>{money(order.subtotalCents ?? 0)}</span>
            </div>
            <div className="total-row">
              <span>Shipping</span>
              <span>
                {order.shippingCents ? money(order.shippingCents) : 'Free'}
              </span>
            </div>
          </>
        ) : null}
        <div className="total-row order-summary__total">
          <span>
            Demo total <span className="meta">USD</span>
          </span>
          <strong>{money(order.totalCents)}</strong>
        </div>
        <div className="total-row">
          <span>Actually charged</span>
          <strong>$0</strong>
        </div>
      </section>
      <Link className="button button--dark" to="/">
        Back to the collection <Arrow />
      </Link>
    </main>
  );
}
