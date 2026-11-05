import { describe, expect, it, vi } from 'vitest';
import {
  CART_KEY,
  ORDER_KEY,
  cartSummary,
  cartTotal,
  createCart,
  lineKey,
  restoreLines,
  shippingFor,
  type StoragePort,
} from './cart';
import { money, type Product } from './catalog';

const shirt: Product = {
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
  sizes: ['XS', 'M', '3XL'],
  images: [
    { color: 'black', src: '/products/right-black.webp', alt: 'Black tee' },
    {
      color: 'off-white',
      src: '/products/right-offwhite.webp',
      alt: 'Off-white tee',
    },
  ],
};
const sticker: Product = {
  ...shirt,
  id: 'sticker',
  title: 'The fix sticker',
  category: 'stickers',
  priceCents: 400,
  colors: ['off-white'],
  sizes: ['One format'],
  images: [
    { color: 'off-white', src: '/products/fixed-sticker.webp', alt: 'Sticker' },
  ],
};
const products = [shirt, sticker];
const line = {
  productId: 'tee',
  color: 'black' as const,
  size: 'M',
  quantity: 1,
};
const saved = (lines: unknown[], version = 1) =>
  JSON.stringify({ version, lines });

function memoryStorage(seed: Record<string, string> = {}): StoragePort {
  const values = new Map(Object.entries(seed));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}
function setup(local = memoryStorage(), session = memoryStorage()) {
  const cart = createCart();
  cart.initialize(products, local, session);
  return { cart, local, session };
}

describe('variant-aware cart', () => {
  it('formats editable prices without rounding away cents', () => {
    expect(money(3200)).toBe('$32');
    expect(money(3250)).toBe('$32.50');
    expect(
      cartTotal([{ ...line, quantity: 3 }], [{ ...shirt, priceCents: 3250 }]),
    ).toBe(9750);
  });
  it('combines matching variants while retaining each color and size separately', () => {
    const { cart } = setup();
    cart.add('tee', 'black', 'M');
    cart.add('tee', 'black', 'M', 2);
    cart.add('tee', 'off-white', 'M');
    cart.add('tee', 'black', 'XS');
    expect(
      cart.store
        .get()
        .lines.map((item) => [item.color, item.size, item.quantity]),
    ).toEqual([
      ['black', 'M', 3],
      ['off-white', 'M', 1],
      ['black', 'XS', 1],
    ]);
    expect(cartTotal(cart.store.get().lines, products)).toBe(16000);
  });

  it('rejects unavailable products, variants and invalid quantities', () => {
    const { cart } = setup();
    expect(cart.add('missing', 'black', 'M')).toBe(false);
    expect(cart.add('tee', 'black', 'XXXXL')).toBe(false);
    expect(cart.add('sticker', 'black', 'One format')).toBe(false);
    for (const value of [0, -1, 1.5, NaN, Infinity])
      expect(cart.add('tee', 'black', 'M', value)).toBe(false);
    expect(cart.store.get().lines).toEqual([]);
  });

  it('edits and removes only the selected variant, with integer cent totals', () => {
    const { cart } = setup();
    cart.add('tee', 'black', 'M');
    cart.add('tee', 'off-white', 'M');
    cart.add('sticker', 'off-white', 'One format', 3);
    cart.quantity(lineKey(line), 4);
    expect(cartTotal(cart.store.get().lines, products)).toBe(17200);
    cart.remove(lineKey(line));
    expect(cart.store.get().lines).toHaveLength(2);
    expect(cartTotal(cart.store.get().lines, products)).toBe(4400);
  });

  it('caps quantity at 99 and rejects invalid quantity edits', () => {
    const { cart } = setup();
    cart.add('tee', 'black', 'M', 100);
    cart.add('tee', 'black', 'M', 2);
    for (const value of [100, -2, 1.2, Infinity, NaN])
      cart.quantity(lineKey(line), value);
    expect(cart.store.get().lines[0]?.quantity).toBe(99);
    cart.quantity(lineKey(line), 0);
    expect(cart.store.get().lines).toEqual([]);
  });

  it('does not allow additions before hydration', () => {
    const cart = createCart(products);
    expect(cart.add('tee', 'black', 'M')).toBe(false);
  });
});

describe('browser persistence', () => {
  it('clears a transient storage warning after the failed storage port recovers', () => {
    const saved = memoryStorage();
    let rejectWrites = true;
    const local: StoragePort = {
      getItem: saved.getItem,
      setItem: (key, value) => {
        if (rejectWrites) throw new Error('Temporary quota failure');
        saved.setItem(key, value);
      },
    };
    const { cart } = setup(local);
    cart.add('tee', 'black', 'M');
    expect(cart.store.get().storageBlocked).toBe(true);
    rejectWrites = false;
    cart.quantity(lineKey(line), 2);
    expect(cart.store.get().storageBlocked).toBe(false);
    expect(setup(local).cart.store.get().lines[0]?.quantity).toBe(2);
  });
  it('restores selections but derives prices from the current catalog', () => {
    const local = memoryStorage({
      [CART_KEY]: saved([{ ...line, priceCents: 1, quantity: 2 }]),
    });
    const { cart } = setup(local);
    expect(cartTotal(cart.store.get().lines, products)).toBe(6400);
    cart.add('sticker', 'off-white', 'One format');
    const refreshed = setup(local).cart;
    expect(refreshed.store.get().lines).toHaveLength(2);
    expect(local.getItem(CART_KEY)).not.toContain('priceCents');
  });

  it.each([
    null,
    'not json',
    '{}',
    '[]',
    saved([line], 2),
    JSON.stringify({ version: 1, lines: {} }),
  ])('recovers from malformed or unsupported storage: %s', (raw) => {
    expect(restoreLines(raw, products)).toEqual([]);
  });

  it('discards stale entries and merges duplicate saved variants within the quantity limit', () => {
    const raw = saved([
      line,
      { ...line, quantity: 300 },
      { ...line, productId: 'removed' },
      { ...line, size: 'retired' },
      { ...line, quantity: '2' },
      { ...line, quantity: 1.5 },
      null,
    ]);
    expect(restoreLines(raw, products)).toEqual([{ ...line, quantity: 99 }]);
  });

  it('stays functional when both reading and writing storage fail', () => {
    const unavailable: StoragePort = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    const { cart } = setup(unavailable, unavailable);
    expect(cart.store.get().storageBlocked).toBe(true);
    expect(cart.add('tee', 'black', 'M')).toBe(true);
    expect(cart.placeOrder(() => 'DEMO-BLOCKED')?.totalCents).toBe(4100);
    expect(cart.store.get().lines).toEqual([]);
  });

  it('accepts cross-tab updates without echoing writes and handles a cleared cart', () => {
    const local = memoryStorage();
    const { cart } = setup(local);
    cart.sync(saved([line]));
    expect(cart.store.get().lines).toEqual([line]);
    expect(local.getItem(CART_KEY)).toBeNull();
    cart.sync(null);
    expect(cart.store.get().lines).toEqual([]);
  });

  it('does not overwrite a live cart if the header reconnects', () => {
    const { cart } = setup();
    cart.add('tee', 'black', 'M');
    cart.initialize(products, memoryStorage());
    expect(cart.store.get().lines).toEqual([line]);
  });
});

describe('simulated checkout', () => {
  it('creates demo references even when secure-context crypto APIs are unavailable', () => {
    vi.stubGlobal('crypto', undefined);
    try {
      const { cart } = setup();
      cart.add('tee', 'black', 'M');
      expect(cart.placeOrder()?.reference).toMatch(/^DEMO-[A-Z0-9-]+$/);
      expect(cart.store.get().lines).toEqual([]);
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it('creates a stable receipt, clears persistent cart, and prevents duplicate submission', () => {
    const { cart, local, session } = setup();
    cart.add('tee', 'black', 'M', 2);
    cart.add('sticker', 'off-white', 'One format');
    const order = cart.placeOrder(() => 'DEMO-TEST');
    expect(order?.totalCents).toBe(6800);
    expect(order?.lines[0]?.title).toBe(shirt.title);
    expect(cart.store.get().lines).toEqual([]);
    expect(JSON.parse(local.getItem(CART_KEY)!)).toEqual({
      version: 1,
      lines: [],
    });
    expect(cart.placeOrder(() => 'DEMO-DUPLICATE')).toBeNull();
    expect(setup(local, session).cart.store.get().order).toEqual(order);
    cart.add('tee', 'black', 'XS');
    expect(cart.store.get().order?.totalCents).toBe(6800);
    expect(cart.store.get().order?.lines).toHaveLength(2);
  });

  it('does not collect or persist personal information or payment fields', () => {
    const { cart, session } = setup();
    cart.add('tee', 'black', 'M');
    const order = cart.placeOrder(() => 'DEMO-PRIVATE');
    expect(Object.keys(order!).sort()).toEqual([
      'createdAt',
      'lines',
      'reference',
      'shippingCents',
      'subtotalCents',
      'totalCents',
    ]);
    expect(session.getItem(ORDER_KEY)).not.toMatch(
      /email|address|payment|cardNumber/,
    );
  });

  it('rejects corrupted or externally supplied confirmation data', () => {
    const { cart } = setup();
    cart.add('tee', 'black', 'M');
    const order = cart.placeOrder(() => 'DEMO-VALID')!;
    for (const tampered of [
      { ...order, totalCents: 1 },
      { ...order, reference: 'REAL-ORDER' },
      { ...order, lines: [] },
      {
        ...order,
        lines: [{ ...order.lines[0], image: 'https://tracker.example/pixel' }],
      },
      { ...order, lines: [{ ...order.lines[0], quantity: -1 }] },
    ]) {
      const session = memoryStorage({ [ORDER_KEY]: JSON.stringify(tampered) });
      expect(setup(memoryStorage(), session).cart.store.get().order).toBeNull();
    }
  });
});

describe('free shipping', () => {
  const summaryFor = (quantity: number, stickers = 0) =>
    cartSummary(
      [
        ...(quantity ? [{ ...line, quantity }] : []),
        ...(stickers
          ? [
              {
                productId: 'sticker',
                color: 'off-white' as const,
                size: 'One format',
                quantity: stickers,
              },
            ]
          : []),
      ],
      products,
    );

  it('charges no shipping on an empty cart', () => {
    expect(summaryFor(0)).toMatchObject({
      subtotalCents: 0,
      shippingCents: 0,
      totalCents: 0,
      progress: 0,
      unlocked: false,
    });
    expect(shippingFor(0)).toBe(0);
  });

  it('charges $9 below $40, based on the subtotal rather than the total', () => {
    expect(summaryFor(1)).toMatchObject({
      subtotalCents: 3200,
      shippingCents: 900,
      totalCents: 4100,
      remainingCents: 800,
      progress: 0.8,
      unlocked: false,
    });
    expect(shippingFor(3999)).toBe(900);
    expect(summaryFor(0, 9)).toMatchObject({ subtotalCents: 3600 });
  });

  it('is free at exactly $40 and above, capping progress at 100%', () => {
    expect(summaryFor(1, 2)).toMatchObject({
      subtotalCents: 4000,
      shippingCents: 0,
      totalCents: 4000,
      remainingCents: 0,
      progress: 1,
      unlocked: true,
    });
    expect(shippingFor(4001)).toBe(0);
    expect(summaryFor(2, 8)).toMatchObject({
      subtotalCents: 9600,
      shippingCents: 0,
      remainingCents: 0,
      progress: 1,
      unlocked: true,
    });
  });

  it('updates when additions, quantity changes and removals cross the threshold', () => {
    const { cart } = setup();
    const summary = () => cartSummary(cart.store.get().lines, products);
    cart.add('tee', 'black', 'M');
    expect(summary().shippingCents).toBe(900);
    cart.add('sticker', 'off-white', 'One format', 2);
    expect(summary()).toMatchObject({ subtotalCents: 4000, shippingCents: 0 });
    cart.quantity(
      lineKey({
        ...line,
        productId: 'sticker',
        color: 'off-white',
        size: 'One format',
      }),
      1,
    );
    expect(summary()).toMatchObject({
      subtotalCents: 3600,
      shippingCents: 900,
    });
    cart.quantity(lineKey(line), 2);
    expect(summary()).toMatchObject({ subtotalCents: 6800, shippingCents: 0 });
    cart.remove(lineKey(line));
    expect(summary()).toMatchObject({ subtotalCents: 400, shippingCents: 900 });
  });

  it('snapshots subtotal, shipping and total in new receipts', () => {
    for (const [quantity, stickers, shipping] of [
      [1, 0, 900],
      [1, 2, 0],
      [2, 0, 0],
    ] as const) {
      const { cart } = setup();
      cart.add('tee', 'black', 'M', quantity);
      if (stickers) cart.add('sticker', 'off-white', 'One format', stickers);
      const order = cart.placeOrder(() => 'DEMO-SHIP')!;
      const subtotal = quantity * 3200 + stickers * 400;
      expect(order).toMatchObject({
        subtotalCents: subtotal,
        shippingCents: shipping,
        totalCents: subtotal + shipping,
      });
    }
  });

  describe('receipt restoration', () => {
    const receipt = (quantity: number) => {
      const { cart } = setup();
      cart.add('tee', 'black', 'M', quantity);
      return cart.placeOrder(() => 'DEMO-RESTORE')!;
    };
    const restore = (value: unknown) =>
      setup(
        memoryStorage(),
        memoryStorage({ [ORDER_KEY]: JSON.stringify(value) }),
      ).cart.store.get().order;

    it('keeps legacy receipts unchanged', () => {
      const { subtotalCents, shippingCents, ...legacy } = receipt(1);
      void subtotalCents;
      void shippingCents;
      const legacyOrder = { ...legacy, totalCents: 3200 };
      expect(restore(legacyOrder)).toEqual(legacyOrder);
    });

    it('restores valid new receipts below and above the threshold', () => {
      for (const quantity of [1, 2]) {
        const order = receipt(quantity);
        expect(restore(order)).toEqual(order);
      }
    });

    it('rejects tampered new receipts', () => {
      const order = receipt(1);
      for (const tampered of [
        { ...order, shippingCents: 0 },
        { ...order, totalCents: 3200 },
        { ...order, subtotalCents: 3100 },
        { ...order, shippingCents: 900.5 },
        { ...order, shippingCents: '900' },
        { ...order, subtotalCents: undefined },
        { ...order, shippingCents: undefined },
      ]) {
        expect(restore(tampered)).toBeNull();
      }
    });
  });
});
