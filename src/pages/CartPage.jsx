// src/pages/CartPage.jsx — корзина и оформление заказа (ЛР13)
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useCart } from '../context/CartContext.jsx';
import { apiFetch } from '../api.js';
import { money } from '../money.js';

export default function CartPage({ user }) {
  const { items, setQuantity, clear, total } = useCart();
  const [address, setAddress] = useState('');
  const [error, setError] = useState(null); // { message, details: [] }
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <main className="page page--single">
        <h1>Корзина</h1>
        <p>Корзина пуста. <Link to="/">Перейти в каталог</Link></p>
      </main>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      // отправляем только id и количество: цену и сумму считает сервер
      const order = await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({ address, items: items.map(({ productId, quantity }) => ({ productId, quantity })) }),
      });
      clear();
      navigate(`/orders?created=${order.id}`);
    } catch (err) {
      if (err instanceof TypeError) {
        setError({ message: 'Нет связи с сервером. Попробуйте ещё раз', details: [] });
      } else if (err.status === 401) {
        // apiFetch уже вышел из аккаунта (SESSION_EXPIRED) — App покажет форму входа
        setError({ message: 'Сессия истекла — войдите заново', details: [] });
      } else {
        // 409: details — что и сколько осталось; 400: details — ошибки полей
        setError({ message: err.error ?? err.message, details: err.details });
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="page page--single">
      <h1>Корзина</h1>
      <div className="table-wrap">
        <table className="orders-table">
          <thead>
            <tr><th>Товар</th><th>Цена</th><th>Количество</th><th>Сумма</th><th></th></tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.productId}>
                <td>{i.name}</td>
                <td>{money(i.price)}</td>
                <td className="qty">
                  {/* кнопки, а не input type="number": стёртое поле дало бы 0 и удалило товар */}
                  <button type="button" aria-label={`Меньше: ${i.name}`} disabled={i.quantity <= 1}
                    onClick={() => setQuantity(i.productId, i.quantity - 1)}>−</button>
                  <span> {i.quantity} </span>
                  <button type="button" aria-label={`Больше: ${i.name}`}
                    onClick={() => setQuantity(i.productId, i.quantity + 1)}>+</button>
                </td>
                <td>{money(i.price * i.quantity)}</td>
                <td>
                  <button type="button" className="link-button" onClick={() => setQuantity(i.productId, 0)}>
                    Удалить {i.name}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="cart-total">Итого: <strong data-testid="cart-total">{money(total)}</strong></p>

      {error && (
        <div className="error" role="alert">
          <p>{error.message}</p>
          {error.details.length > 0 && (
            <ul>
              {error.details.map((d) => (
                <li key={d.productId ?? d.field}>
                  {d.message ?? `${d.name}: в наличии ${d.available} шт.`}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {user ? (
        <form className="checkout-form" onSubmit={handleSubmit}>
          <label htmlFor="address">Адрес доставки</label>
          <input id="address" value={address} onChange={(e) => setAddress(e.target.value)} required minLength={5} />
          <button type="submit" disabled={sending}>{sending ? 'Отправляем…' : 'Оформить заказ'}</button>
        </form>
      ) : (
        <p><Link to="/#account">Войдите</Link>, чтобы оформить заказ.</p>
      )}
    </main>
  );
}
