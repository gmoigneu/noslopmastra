// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import {
  cleanup,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShopApp from './ShopApp';
import { FreeShippingProgress } from './FreeShippingProgress';
import type { CartLine } from '../../lib/cart';
import type { Product } from '../../lib/catalog';

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

const teeProduct: Product = {
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
const teeLine = (quantity: number): CartLine => ({
  productId: 'tee',
  color: 'black',
  size: 'M',
  quantity,
});

it('shows free-shipping progress and matching totals across mini cart, cart, checkout and receipt', async () => {
  window.history.replaceState({}, '', '/shop/products/tee');
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  const user = userEvent.setup();
  render(<ShopApp products={[teeProduct]} />);
  await screen.findByRole('heading', { name: teeProduct.slogan });
  // Empty cart: no progress indicator anywhere.
  expect(screen.queryByRole('progressbar')).toBeNull();
  await user.click(screen.getByRole('radio', { name: 'M' }));
  await user.click(screen.getByRole('button', { name: 'Add to cart $32' }));
  await user.click(screen.getByRole('button', { name: 'Open cart, 1 item' }));
  const mini = screen.getByRole('dialog');
  expect(within(mini).getByText('Add $8 to get free shipping')).toBeTruthy();
  expect(
    within(mini).getByRole('progressbar').getAttribute('aria-valuenow'),
  ).toBe('80');
  expect(within(mini).getByText('$9')).toBeTruthy();
  expect(within(mini).getByText('$41')).toBeTruthy();
  await user.click(within(mini).getByRole('link', { name: 'View cart' }));
  await screen.findByRole('heading', { name: 'Your cart.' });
  const main = screen.getByRole('main');
  expect(within(main).getByText('Add $8 to get free shipping')).toBeTruthy();
  expect(within(main).getByText('$9')).toBeTruthy();
  expect(within(main).getByText('$41')).toBeTruthy();

  // Crossing up.
  const quantity = within(main).getByRole('spinbutton', {
    name: 'Quantity for The agreement tee, Black / M',
  }) as HTMLInputElement;
  await user.clear(quantity);
  await user.type(quantity, '2');
  await user.tab();
  expect(within(main).getByText('Free shipping unlocked')).toBeTruthy();
  expect(
    within(main).getByRole('progressbar').getAttribute('aria-valuenow'),
  ).toBe('100');
  expect(within(main).getByText('Free')).toBeTruthy();
  expect(within(main).queryByText('$9')).toBeNull();
  // Crossing down.
  await user.clear(quantity);
  await user.type(quantity, '1');
  await user.tab();
  expect(within(main).getByText('Add $8 to get free shipping')).toBeTruthy();
  expect(within(main).getByText('$9')).toBeTruthy();

  await user.click(screen.getByRole('link', { name: 'Simulated checkout' }));
  await screen.findByRole('heading', { name: 'Almost real.' });
  const checkout = screen.getByRole('main');
  expect(within(checkout).getByText('Shipping')).toBeTruthy();
  expect(within(checkout).getByText('$9')).toBeTruthy();
  expect(within(checkout).getByText('$41')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Place demo order' }));
  await screen.findByRole('heading', {
    name: 'You’re absolutely not being charged.',
  });
  const receipt = screen.getByRole('region', { name: 'Demo order receipt' });
  expect(within(receipt).getByText('Shipping')).toBeTruthy();
  expect(within(receipt).getByText('$9')).toBeTruthy();
  expect(within(receipt).getByText('$41')).toBeTruthy();
  // The cart is empty again, so the progress is hidden.
  await user.click(screen.getByRole('button', { name: 'Open cart, 0 items' }));
  expect(screen.queryByRole('progressbar')).toBeNull();
});

it('renders the progress component for empty, below, exact and above subtotals', () => {
  const priced = (priceCents: number) => [{ ...teeProduct, priceCents }];
  const { rerender } = render(
    <FreeShippingProgress lines={[]} products={priced(2000)} />,
  );
  expect(screen.queryByRole('progressbar')).toBeNull();
  rerender(
    <FreeShippingProgress lines={[teeLine(1)]} products={priced(3999)} />,
  );
  expect(screen.getByText('Add $0.01 to get free shipping')).toBeTruthy();
  expect(
    screen.getByRole('progressbar').getAttribute('aria-valuenow'),
  ).not.toBe('100');
  rerender(
    <FreeShippingProgress lines={[teeLine(2)]} products={priced(2000)} />,
  );
  expect(screen.getByText('Free shipping unlocked')).toBeTruthy();
  const bar = screen.getByRole('progressbar');
  expect(bar.getAttribute('aria-valuenow')).toBe('100');
  expect(bar.getAttribute('aria-valuetext')).toBe('Free shipping unlocked');
  rerender(
    <FreeShippingProgress lines={[teeLine(5)]} products={priced(2000)} />,
  );
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe(
    '100',
  );
});
