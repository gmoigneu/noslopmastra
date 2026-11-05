// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShopApp from './ShopApp';
import type { Product } from '../../lib/catalog';
import { cart } from '../../lib/cart';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('retains a memory-only cart through header navigation and simulated checkout when storage writes fail', async () => {
  window.history.replaceState({}, '', '/shop/products/tee');
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Storage blocked');
  });
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  // jsdom does not implement the browser's native dialog methods.
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  const product: Product = {
    id: 'tee',
    title: 'The agreement tee',
    slogan: 'You’re absolutely right.',
    category: 'shirts',
    typography: 'serif',
    description: 'A test product.',
    details: ['Cotton'],
    priceCents: 3200,
    order: 0,
    colors: ['black', 'off-white'],
    sizes: ['M', 'L'],
    images: [
      { color: 'black', src: '/products/right-black.webp', alt: 'Black tee' },
      {
        color: 'off-white',
        src: '/products/right-offwhite.webp',
        alt: 'Off-white tee',
      },
    ],
  };
  const user = userEvent.setup();
  render(<ShopApp products={[product]} />);
  await screen.findByRole('heading', { name: product.slogan });
  await user.tab();
  expect(document.activeElement).toBe(
    screen.getByRole('link', { name: 'noslopfactory home' }),
  );
  await user.click(screen.getByRole('radio', { name: 'M' }));
  await user.click(screen.getByRole('button', { name: 'Add to cart $32' }));
  await user.click(screen.getByRole('button', { name: 'Open cart, 1 item' }));
  await user.click(
    within(screen.getByRole('dialog')).getByRole('link', {
      name: 'View cart',
    }),
  );
  await screen.findByRole('heading', { name: 'Your cart.' });
  await waitFor(() => expect(document.activeElement?.id).toBe('main'), {
    onTimeout: (error) => error,
  });
  expect(screen.getByText(/Your browser is blocking storage/)).toBeTruthy();
  expect(
    screen
      .getByRole('spinbutton', {
        name: 'Quantity for The agreement tee, Black / M',
      })
      .getAttribute('value'),
  ).toBe('1');
  expect(screen.queryByRole('dialog')).toBeNull();
  const quantity = screen.getByRole('spinbutton', {
    name: 'Quantity for The agreement tee, Black / M',
  }) as HTMLInputElement;
  await user.clear(quantity);
  expect(quantity.value).toBe('');
  await user.type(quantity, '2');
  await user.tab();
  expect(quantity.value).toBe('2');
  await user.clear(quantity);
  await user.tab();
  expect(quantity.value).toBe('2');
  await user.clear(quantity);
  await user.type(quantity, '150');
  expect(screen.getByText(/Use a whole number from 1 to 99/)).toBeTruthy();
  expect(quantity.getAttribute('aria-invalid')).toBe('true');
  expect(quantity.getAttribute('aria-describedby')).toBeTruthy();
  await user.tab();
  expect(quantity.value).toBe('15');
  expect(quantity.getAttribute('aria-invalid')).toBe('false');
  expect(quantity.getAttribute('aria-describedby')).toBeNull();
  expect(screen.getByText(/Quantity restored to 15/)).toBeTruthy();
  expect(screen.getByText(/Use a whole number from 1 to 99/)).toBeTruthy();
  await user.clear(quantity);
  await user.type(quantity, '1');
  await user.tab();
  await user.click(
    within(screen.getByRole('main')).getByRole('link', { name: product.title }),
  );
  await screen.findByRole('heading', { name: product.slogan });
  expect(
    screen.getByRole('button', { name: 'Open cart, 1 item' }),
  ).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Open cart, 1 item' }));
  await user.click(
    within(screen.getByRole('dialog')).getByRole('link', {
      name: 'View cart',
    }),
  );
  await screen.findByRole('heading', { name: 'Your cart.' });
  await user.click(screen.getByRole('link', { name: 'Simulated checkout' }));
  await screen.findByRole('heading', { name: 'Almost real.' });
  await user.click(screen.getByRole('button', { name: 'Place demo order' }));
  await screen.findByRole('heading', {
    name: 'You’re absolutely not being charged.',
  });
  expect(
    screen.getByRole('button', { name: 'Open cart, 0 items' }),
  ).toBeTruthy();
  expect(screen.getByText('Actually charged')).toBeTruthy();
  expect(window.localStorage.length).toBe(0);
});

const shippingProduct: Product = {
  id: 'tee',
  title: 'The agreement tee',
  slogan: 'You’re absolutely right.',
  category: 'shirts',
  typography: 'serif',
  description: 'A test product.',
  details: ['Cotton'],
  priceCents: 3200,
  order: 0,
  colors: ['black', 'off-white'],
  sizes: ['M', 'L'],
  images: [
    { color: 'black', src: '/products/right-black.webp', alt: 'Black tee' },
    {
      color: 'off-white',
      src: '/products/right-offwhite.webp',
      alt: 'Off-white tee',
    },
  ],
};

function miniCart() {
  return within(document.querySelector('dialog.mini-cart') as HTMLElement);
}
function progress(scope: ReturnType<typeof within>) {
  return scope.getByRole('progressbar', {
    name: 'Free shipping progress',
    hidden: true,
  });
}
function row(scope: ReturnType<typeof within>, label: string) {
  return scope.getByText(label).parentElement?.textContent;
}

it('shows free-shipping progress in the mini cart and cart, and keeps totals consistent through checkout', async () => {
  window.history.replaceState({}, '', '/shop/products/tee');
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  const user = userEvent.setup();
  render(<ShopApp products={[shippingProduct]} />);
  await screen.findByRole('heading', { name: shippingProduct.slogan });

  // Empty cart: no progress indicator.
  expect(miniCart().queryByRole('progressbar', { hidden: true })).toBeNull();

  await user.click(screen.getByRole('radio', { name: 'M' }));
  await user.click(screen.getByRole('button', { name: 'Add to cart $32' }));

  // Below $40: $8 to go.
  let mini = progress(miniCart());
  expect(mini.getAttribute('aria-valuenow')).toBe('80');
  expect(mini.getAttribute('aria-valuetext')).toBe(
    'Add $8 to get free shipping',
  );
  expect(miniCart().getByText('Add $8 to get free shipping')).toBeTruthy();

  await user.click(screen.getByRole('button', { name: 'Open cart, 1 item' }));
  await user.click(miniCart().getByRole('link', { name: 'View cart' }));
  await screen.findByRole('heading', { name: 'Your cart.' });
  const summary = () => within(screen.getByRole('complementary'));
  expect(progress(summary()).getAttribute('aria-valuenow')).toBe('80');
  expect(summary().getByText('Add $8 to get free shipping')).toBeTruthy();
  expect(row(summary(), 'Subtotal')).toBe('Subtotal$32');
  expect(row(summary(), 'Shipping')).toBe('Shipping$9');
  expect(row(summary(), 'Total')).toBe('Total$41');

  // Crossing up: $64 unlocks free shipping in both displays.
  const label = 'Quantity for The agreement tee, Black / M';
  await user.click(
    screen.getByRole('button', { name: `Increase ${label.toLowerCase()}` }),
  );
  for (const scope of [summary(), miniCart()]) {
    expect(progress(scope).getAttribute('aria-valuenow')).toBe('100');
    expect(progress(scope).getAttribute('aria-valuetext')).toBe(
      'Free shipping unlocked',
    );
    expect(scope.getByText('Free shipping unlocked')).toBeTruthy();
  }
  expect(row(summary(), 'Shipping')).toBe('ShippingFree');
  expect(row(summary(), 'Total')).toBe('Total$64');

  // Crossing down again restores the fee and the prompt.
  await user.click(
    screen.getByRole('button', { name: `Decrease ${label.toLowerCase()}` }),
  );
  for (const scope of [summary(), miniCart()]) {
    expect(progress(scope).getAttribute('aria-valuenow')).toBe('80');
    expect(scope.getByText('Add $8 to get free shipping')).toBeTruthy();
  }
  expect(row(summary(), 'Shipping')).toBe('Shipping$9');

  // Removing the last item hides the indicator.
  await user.click(
    screen.getByRole('button', {
      name: 'Remove The agreement tee, Black / M',
    }),
  );
  await screen.findByRole('heading', { name: /No slop in here/ });
  expect(miniCart().queryByRole('progressbar', { hidden: true })).toBeNull();
  act(() => {
    cart.add('tee', 'black', 'M');
  });
  await screen.findByRole('heading', { name: 'Your cart.' });

  await user.click(screen.getByRole('link', { name: 'Simulated checkout' }));
  await screen.findByRole('heading', { name: 'Almost real.' });
  expect(row(summary(), 'Subtotal')).toBe('Subtotal$32');
  expect(row(summary(), 'Shipping')).toBe('Shipping$9');
  expect(row(summary(), 'Total')).toBe('Total$41');
  await user.click(screen.getByRole('button', { name: 'Place demo order' }));
  await screen.findByRole('heading', {
    name: 'You’re absolutely not being charged.',
  });
  const receipt = within(
    screen.getByRole('region', { name: 'Demo order receipt' }),
  );
  expect(row(receipt, 'Subtotal')).toBe('Subtotal$32');
  expect(row(receipt, 'Shipping')).toBe('Shipping$9');
  expect(cart.store.get().order).toMatchObject({
    subtotalCents: 3200,
    shippingCents: 900,
    totalCents: 4100,
  });
  expect(receipt.getByText('$41')).toBeTruthy();
});

it('renders legacy receipts without a shipping row', async () => {
  window.history.replaceState({}, '', '/shop/confirmation');
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  act(() => {
    cart.store.setState((state) => ({
      ...state,
      order: {
        reference: 'DEMO-LEGACY',
        createdAt: new Date().toISOString(),
        lines: [
          {
            productId: 'tee',
            color: 'black',
            size: 'M',
            quantity: 1,
            title: 'The agreement tee',
            priceCents: 3200,
            image: '/products/right-black.webp',
          },
        ],
        totalCents: 3200,
      },
    }));
  });
  render(<ShopApp products={[shippingProduct]} />);
  const receipt = within(
    await screen.findByRole('region', { name: 'Demo order receipt' }),
  );
  expect(receipt.queryByText('Shipping')).toBeNull();
  expect(receipt.queryByText('Subtotal')).toBeNull();
  expect(receipt.getAllByText('$32').length).toBeGreaterThan(0);
  expect(receipt.getByText('Actually charged')).toBeTruthy();
});
