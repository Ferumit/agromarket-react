// src/pages/IncomingOrdersPage.jsx — «Заказы на мои товары» для фермера (ЛР13)
import { useEffect, useState } from 'react';
import { apiFetch } from '../api.js';
import { money } from '../money.js';
import { ORDER_STATUSES, formatDate } from '../orderStatus.js';

export default function IncomingOrdersPage({ user }) {
  const isFarmer = user?.role === 'farmer';
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isFarmer) return;
    apiFetch('/orders/incoming').then(setRows).catch((err) => setError(err.message));
  }, [isFarmer]);

  if (!isFarmer) {
    return (
      <main className="page page--single">
        <h1>Заказы на мои товары</h1>
        <p>Эта страница — для фермеров.</p>
      </main>
    );
  }

  return (
    <main className="page page--single">
      <h1>Заказы на мои товары</h1>
      {error && <p className="error" role="alert">{error}</p>}
      {rows === null && !error && <p>Загрузка...</p>}
      {rows?.length === 0 && <p>На ваши товары заказов пока нет</p>}
      {rows?.length > 0 && (
        <div className="table-wrap">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Заказ</th><th>Покупатель</th><th>Адрес</th><th>Товар</th>
                <th>Кол-во</th><th>Сумма</th><th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.orderId}-${r.product}`}>
                  <td>№{r.orderId}<br /><small>{formatDate(r.created_at)}</small></td>
                  <td>{r.buyerName}</td>
                  <td>{r.address}</td>
                  <td>{r.product}</td>
                  <td>{r.quantity}</td>
                  <td>{money(r.price * r.quantity)}</td>
                  <td>{ORDER_STATUSES[r.status] ?? r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
