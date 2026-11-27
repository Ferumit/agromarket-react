// src/pages/MyOrdersPage.test.jsx — «Мои заказы» (ЛР13)
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server, recordRequests } from '../test/server.js';
import { farmer, TOKEN } from '../test/handlers.js';
import MyOrdersPage from './MyOrdersPage';
import { renderWithProviders } from '../test/utils.jsx';

const orders = [
  { id: 42, status: 'new', total: 8000, address: 'Астана, ул. Женис, 62', created_at: '2026-11-27T05:00:00Z',
    product_name: null, quantity: null,
    items: [{ productId: 1, name: 'Мёд гречишный', quantity: 2, price: 3500 },
      { productId: 2, name: 'Картофель молодой', quantity: 4, price: 250 }] },
  { id: 7, status: 'done', total: null, address: null, created_at: '2026-10-20T05:00:00Z',
    product_name: 'Картофель', quantity: 50, items: [] },
];

function renderPage(route = '/orders') {
  localStorage.setItem('token', TOKEN);
  return renderWithProviders(<MyOrdersPage user={farmer} />, { route });
}

describe('MyOrdersPage', () => {
  test('показывает загрузку, потом заказы с позициями и оптовую заявку', async () => {
    server.use(http.get('*/api/orders/my', () => HttpResponse.json(orders)));
    renderPage();

    expect(screen.getByText(/загрузка/i)).toBeInTheDocument();
    const order = await screen.findByRole('article', { name: 'Заказ №42' });
    expect(order).toHaveTextContent('Мёд гречишный × 2');
    expect(order).toHaveTextContent(/Итого: 8\s?000 ₸/);
    expect(screen.getByRole('article', { name: 'Заказ №7' })).toHaveTextContent('Оптовая заявка: Картофель, 50 кг');
  });

  test('после оформления (?created=42) — «Заказ №42 оформлен»', async () => {
    server.use(http.get('*/api/orders/my', () => HttpResponse.json(orders)));
    renderPage('/orders?created=42');

    expect(screen.getByRole('status')).toHaveTextContent('Заказ №42 оформлен');
    await screen.findByRole('article', { name: 'Заказ №42' });
  });

  test('заказов нет — «Заказов пока нет», сервер упал — ошибка с role="alert"', async () => {
    const { unmount } = renderPage();
    expect(await screen.findByText(/заказов пока нет/i)).toBeInTheDocument();
    unmount();

    server.use(http.get('*/api/orders/my', () =>
      HttpResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Внутренняя ошибка сервера');
  });

  test('«Отменить» есть только у нового заказа и шлёт POST /orders/:id/cancel', async () => {
    server.use(
      http.get('*/api/orders/my', () => HttpResponse.json(orders)),
      http.post('*/api/orders/42/cancel', () => HttpResponse.json({ id: 42, status: 'cancelled' })),
    );
    const requests = recordRequests();
    const user = userEvent.setup();
    renderPage();

    const order = await screen.findByRole('article', { name: 'Заказ №42' });
    expect(within(screen.getByRole('article', { name: 'Заказ №7' })).queryByRole('button')).not.toBeInTheDocument();
    await user.click(within(order).getByRole('button', { name: 'Отменить' }));

    expect(await within(order).findByText('Отменён')).toBeInTheDocument();
    expect(within(order).queryByRole('button', { name: 'Отменить' })).not.toBeInTheDocument();
    expect(requests.map((r) => `${r.method} ${r.path}`)).toContain('POST /api/orders/42/cancel');
  });
});
