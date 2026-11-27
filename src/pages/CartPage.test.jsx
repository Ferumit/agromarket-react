// src/pages/CartPage.test.jsx — корзина и оформление заказа (ЛР13)
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router';
import { http, HttpResponse, delay } from 'msw';
import { server } from '../test/server.js';
import { farmer, TOKEN } from '../test/handlers.js';
import CartPage from './CartPage';
import { renderWithProviders } from '../test/utils.jsx';

const cart = [
  { productId: 1, name: 'Мёд гречишный', price: 3500, quantity: 2 },
  { productId: 2, name: 'Картофель молодой', price: 250, quantity: 4 },
];

// user — вошедший пользователь (его хранит App); токен apiFetch возьмёт из localStorage
function renderCart({ loggedIn = true } = {}) {
  localStorage.setItem('cart', JSON.stringify(cart));
  if (loggedIn) localStorage.setItem('token', TOKEN);
  return renderWithProviders(
    <Routes>
      <Route path="/cart" element={<CartPage user={loggedIn ? farmer : null} />} />
      <Route path="/orders" element={<h1>Мои заказы</h1>} />
    </Routes>,
    { route: '/cart' },
  );
}

async function checkout(user) {
  await user.type(screen.getByLabelText(/адрес доставки/i), 'Астана, ул. Женис, 62');
  await user.click(screen.getByRole('button', { name: /оформить заказ/i }));
}

describe('CartPage', () => {
  test('пустая корзина — сообщение и ссылка в каталог', () => {
    renderWithProviders(<CartPage user={farmer} />, { route: '/cart' });
    expect(screen.getByText(/корзина пуста/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /в каталог/i })).toHaveAttribute('href', '/');
  });

  test('показывает позиции и итог', () => {
    renderCart();
    expect(screen.getByText('Мёд гречишный')).toBeInTheDocument();
    expect(screen.getByTestId('cart-total')).toHaveTextContent(/8\s?000/); // 2×3500 + 4×250
  });

  test('«+» и «−» меняют количество и пересчитывают итог', async () => {
    const user = userEvent.setup();
    renderCart();

    await user.click(screen.getByRole('button', { name: 'Больше: Картофель молодой' }));
    expect(screen.getByTestId('cart-total')).toHaveTextContent(/8\s?250/);

    await user.click(screen.getByRole('button', { name: 'Меньше: Мёд гречишный' }));
    expect(screen.getByTestId('cart-total')).toHaveTextContent(/4\s?750/);
    expect(screen.getByRole('button', { name: 'Меньше: Мёд гречишный' })).toBeDisabled(); // меньше 1 нельзя
  });

  test('успешный заказ: в запросе нет цен, корзина очищается, переход к заказам', async () => {
    let sent;
    server.use(http.post('*/api/orders', async ({ request }) => {
      sent = await request.json();
      return HttpResponse.json({ id: 42, status: 'new', total: 8000 }, { status: 201 });
    }));
    const user = userEvent.setup();
    renderCart();

    await checkout(user);

    expect(await screen.findByRole('heading', { name: 'Мои заказы' })).toBeInTheDocument();
    expect(sent.items).toEqual([{ productId: 1, quantity: 2 }, { productId: 2, quantity: 4 }]);
    expect(JSON.parse(localStorage.getItem('cart'))).toEqual([]);
  });

  test('товара не хватило (409) — понятное сообщение, корзина не очищается', async () => {
    server.use(http.post('*/api/orders', () => HttpResponse.json(
      { error: 'Недостаточно товара', details: [{ productId: 2, name: 'Картофель молодой', available: 1 }] },
      { status: 409 })));
    const user = userEvent.setup();
    renderCart();

    await checkout(user);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Недостаточно товара');
    expect(alert).toHaveTextContent('Картофель молодой: в наличии 1 шт.');
    expect(JSON.parse(localStorage.getItem('cart'))).toHaveLength(2);
  });

  test('пока заказ отправляется, кнопка неактивна', async () => {
    server.use(http.post('*/api/orders', async () => {
      await delay(200);
      return HttpResponse.json({ id: 1 }, { status: 201 });
    }));
    const user = userEvent.setup();
    renderCart();

    await checkout(user);

    expect(screen.getByRole('button', { name: /отправляем/i })).toBeDisabled();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Мои заказы' })).toBeInTheDocument());
  });

  test('не вошёл — вместо формы ссылка на вход', () => {
    renderCart({ loggedIn: false });
    expect(screen.queryByRole('button', { name: /оформить заказ/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /войдите/i })).toBeInTheDocument();
  });
});
