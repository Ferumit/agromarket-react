import { useState } from 'react';
import { apiFetch } from '../api.js';

function ContactForm({ products = [] }) {
  // Бонус ЛР5: пока запрос идёт, кнопка заблокирована и показывает «Отправка…»
  const [sending, setSending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault(); // не перезагружать страницу
    const form = e.target;

    // Собираем все поля формы в объект { name: ..., email: ..., ... }
    const data = Object.fromEntries(new FormData(form));

    setSending(true);
    try {
      // apiFetch приложит токен, если клиент вошёл: заявка привяжется к его аккаунту
      const result = await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      alert(`Заявка №${result.id} принята!`);
      form.reset();
    } catch (err) {
      // TypeError — fetch не достучался до сервера; иначе это ошибка API (например, 400)
      alert(err instanceof TypeError
        ? 'Сервер недоступен. Запущен ли agromarket-server?'
        : 'Ошибка: ' + err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <section id="contact" className="contact">
      <h2>Оптовая заявка</h2>
      <form className="contact-form" onSubmit={handleSubmit}>
        <label htmlFor="name">Имя / организация</label>
        <input id="name" name="name" type="text" required />

        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required
          placeholder="farmer@mail.kz" />

        {/* Бонус ЛР6: выбор товара — сервер сохранит product_id и покажет product_name в заявках */}
        <label htmlFor="product_id">Товар</label>
        <select id="product_id" name="product_id" defaultValue="">
          <option value="">— не выбран —</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <label htmlFor="phone">Телефон</label>
        <input id="phone" name="phone" type="tel" placeholder="+7 7XX XXX XX XX" />

        <label htmlFor="quantity">Объём заказа, кг</label>
        <input id="quantity" name="quantity" type="number" min="10" required />

        <label htmlFor="date">Желаемая дата доставки</label>
        <input id="date" name="date" type="date" />

        <label htmlFor="comment">Комментарий</label>
        <textarea id="comment" name="comment" rows="4" />

        <button type="submit" disabled={sending}>
          {sending ? 'Отправка…' : 'Отправить заявку'}
        </button>
      </form>
    </section>
  );
}

export default ContactForm;
