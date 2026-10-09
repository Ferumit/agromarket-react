import { useEffect, useState } from 'react';
import { apiFetch } from '../api.js';

const STATUSES = {
  new: 'Новая',
  processing: 'В работе',
  done: 'Выполнена',
  cancelled: 'Отменена',
};

// Бонус ЛР7: панель заявок только для администратора
export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  async function loadOrders() {
    setError('');
    try {
      setOrders(await apiFetch('/orders'));
    } catch (err) {
      setError(err.message);
    }
  }

  // Первая загрузка: состояние меняем только в ответ на пришедшие данные
  useEffect(() => {
    apiFetch('/orders').then(setOrders).catch((err) => setError(err.message));
  }, []);

  async function changeStatus(id, status) {
    try {
      const updated = await apiFetch(`/orders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setOrders(orders.map((o) => (o.id === id ? { ...o, status: updated.status } : o)));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section id="orders" className="orders-panel">
      <div className="catalog-toolbar">
        <h2>Заявки</h2>
        <button type="button" onClick={loadOrders}>Обновить</button>
      </div>
      {error && <p className="error">{error}</p>}
      {orders.length === 0 ? (
        <p>Заявок пока нет</p>
      ) : (
        <div className="table-wrap">
          <table className="orders-table">
            <thead>
              <tr>
                <th>№</th>
                <th>Клиент</th>
                <th>Товар</th>
                <th>Объём, кг</th>
                <th>Доставка</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{o.name}<br /><small>{o.email}</small></td>
                  <td>{o.product_name || '—'}</td>
                  <td>{o.quantity}</td>
                  <td>{o.delivery_date || '—'}</td>
                  <td>
                    <select
                      value={o.status}
                      aria-label={`Статус заявки ${o.id}`}
                      onChange={(e) => changeStatus(o.id, e.target.value)}
                    >
                      {Object.entries(STATUSES).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
