import { cartPricing, type CartLine } from '../../lib/cart';
import { money, type Product } from '../../lib/catalog';

export function FreeShippingProgress({
  lines,
  products,
}: {
  lines: CartLine[];
  products: Product[];
}) {
  if (!lines.length) return null;
  const { remainingCents, progress, qualifies } = cartPricing(lines, products);
  const message = qualifies
    ? 'Free shipping unlocked'
    : `Add ${money(remainingCents)} to get free shipping`;
  const percent = Math.round(progress * 100);
  return (
    <div className="shipping-progress">
      <p className="shipping-progress__message" role="status">
        {message}
      </p>
      <div
        className="shipping-progress__bar"
        role="progressbar"
        aria-label="Free shipping progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={qualifies ? 100 : Math.min(99, percent)}
        aria-valuetext={message}
      >
        <span
          className="shipping-progress__fill"
          style={{ width: `${qualifies ? 100 : Math.min(99, percent)}%` }}
        />
      </div>
    </div>
  );
}
