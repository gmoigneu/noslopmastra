import { useRef } from 'react';
import type { Product } from '../lib/catalog';
import { cartTotal } from '../lib/cart';
import { money } from '../lib/catalog';
import { CartItems } from './shop/CartItems';
import { FreeShippingProgress } from './shop/FreeShippingProgress';
import { Arrow, Bag } from './shop/Icons';
import { useCart, useCartConnection } from './shop/useCart';
import { ShopLink } from './shop/ShopLink';

export default function Header({
  products,
  shop = false,
}: {
  products: Product[];
  shop?: boolean;
}) {
  useCartConnection(products);
  const state = useCart();
  const dialog = useRef<HTMLDialogElement>(null);
  const count = state.lines.reduce((sum, line) => sum + line.quantity, 0);
  return (
    <>
      <header className="site-header">
        <a className="brand" href="/" aria-label="noslopfactory home">
          <span className="brand__mark" aria-hidden="true">
            n<span>/</span>
          </span>
          <span>
            noslopfactory<span className="brand__dot">.</span>
          </span>
        </a>
        <nav className="capsule-nav" aria-label="Main navigation">
          <a href="/" aria-current={!shop ? 'page' : undefined}>
            The project
          </a>
          <ShopLink href="/shop" aria-current={shop ? 'page' : undefined}>
            The shop <span aria-hidden="true">↗</span>
          </ShopLink>
        </nav>
        <button
          className="cart-trigger"
          type="button"
          aria-haspopup="dialog"
          aria-label={`Open cart, ${count} ${count === 1 ? 'item' : 'items'}`}
          onClick={() => dialog.current?.showModal()}
        >
          <Bag />
          <span>Cart</span>
          <span className="cart-count">{count}</span>
        </button>
      </header>
      <dialog
        className="mini-cart"
        ref={dialog}
        aria-labelledby="mini-cart-title"
      >
        <div className="mini-cart__head">
          <div>
            <span className="eyebrow">YOUR SELECTION</span>
            <h2 id="mini-cart-title">
              The cart<span className="serif-italic">.</span>
            </h2>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Close cart"
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
        </div>
        {state.lines.length ? (
          <>
            <CartItems
              lines={state.lines}
              products={products}
              compact
              onNavigate={() => dialog.current?.close()}
            />
            <div className="mini-cart__bottom">
              <FreeShippingProgress lines={state.lines} products={products} />
              <div className="total-row">
                <span>Subtotal</span>
                <strong>{money(cartTotal(state.lines, products))}</strong>
              </div>
              <p className="meta">Demo products. No real charges.</p>
              <ShopLink
                className="button button--dark button--wide"
                href="/shop/cart"
                onClick={() => dialog.current?.close()}
              >
                View cart <Arrow />
              </ShopLink>
              <ShopLink
                className="text-button continue-link"
                href="/shop"
                onClick={() => dialog.current?.close()}
              >
                Keep looking
              </ShopLink>
            </div>
          </>
        ) : (
          <div className="empty-mini">
            <Bag />
            <h3>No slop in here. Yet.</h3>
            <p>Your cart is empty.</p>
            <ShopLink
              className="button button--dark"
              href="/shop"
              onClick={() => dialog.current?.close()}
            >
              Explore the collection <Arrow />
            </ShopLink>
          </div>
        )}
      </dialog>
    </>
  );
}
