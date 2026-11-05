import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  cartSummary,
  type CartLine,
} from '../../lib/cart';
import { money, type Product } from '../../lib/catalog';

export function FreeShippingProgress({
  lines,
  products,
}: {
  lines: CartLine[];
  products: Product[];
}) {
  const { subtotalCents, remainingCents, progress, unlocked } = cartSummary(
    lines,
    products,
  );
  if (subtotalCents <= 0) return null;
  const percent = Math.floor(
    Math.min(100, (subtotalCents / FREE_SHIPPING_THRESHOLD_CENTS) * 100),
  );
  const message = unlocked
    ? 'Free shipping unlocked'
    : `Add ${money(remainingCents)} to get free shipping`;
  return (
    <div className="shipping-progress">
      <p className="shipping-progress__text" role="status">
        {message}
      </p>
      <div
        className="shipping-progress__track"
        role="progressbar"
        aria-label="Free shipping progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={message}
      >
        <div
          className="shipping-progress__fill"
          style={{ width: `${Math.min(100, progress * 100)}%` }}
        />
      </div>
    </div>
  );
}
