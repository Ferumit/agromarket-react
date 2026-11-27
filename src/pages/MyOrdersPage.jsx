// src/pages/MyOrdersPage.jsx — «Мои заказы» (ЛР13): заказы из корзины и оптовые заявки покупателя
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { apiFetch } from '../api.js';
import { money } from '../money.js';
import { ORDER_STATUSES, formatDate } from '../orderStatus.js';

export default function MyOrdersPage({ user }) {
  const [orders, setOrders] = useState(null); // null — ещё загружаем
  const [error, setError] = useState('');
  const [params] = useSearchParams();
  const created = params.get('created'); // /orders?created=42 — сюда ведёт оформление заказа

  useEffect(() => {
    if (!user) return;
    apiFetch('/orders/my').then(setOrders).catch((err) => setError(err.message));
  }, [user]);

  async function cancel(id) {
    setError('');
    try {
      await apiFetch(`/orders/${id}/cancel`, { method: 'POST' });
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: 'cancelled' } : o)));
    } catch (err) {
      setError(err.message);
    }
  }

  if (!user) {
    return (
      <main className="page page--single">
        <h1>Мои заказы</h1>
        <p><Link to="/#account">Войдите</Link>, чтобы увидеть свои заказы.</p>
      </main>
    );
  }

  return (
    <main className="page page--single">
      <h1>Мои заказы</h1>
      {created && <p className="success" role="status">Заказ №{created} оформлен</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {orders === null && !error && <p>Загрузка...</p>}
      {orders?.length === 0 && <p>Заказов пока нет. <Link to="/">Перейти в каталог</Link></p>}

      {orders?.map((o) => (
        <article key={o.id} className="order" aria-label={`Заказ №${o.id}`}>
          <h2>Заказ №{o.id} <small>от {formatDate(o.created_at)}</small></h2>
          <p>Статус: <b>{ORDER_STATUSES[o.status] ?? o.status}</b></p>
          {o.items.length > 0 ? (
            <>
              <ul>
                {o.items.map((i) => (
                  <li key={i.productId}>{i.name} × {i.quantity} — {money(i.price * i.quantity)}</li>
                ))}
              </ul>
              <p>Итого: <b>{money(o.total)}</b>. Доставка: {o.address}</p>
            </>
          ) : (
            // оптовая заявка из формы (ЛР6): один товар и объём в кг, цену согласует менеджер
            <p>Оптовая заявка: {o.product_name ?? 'товар не указан'}, {o.quantity} кг</p>
          )}
          {o.status === 'new' && (
            <button type="button" onClick={() => cancel(o.id)}>Отменить</button>
          )}
        </article>
      ))}
    </main>
  );
}
