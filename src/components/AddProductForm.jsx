import { useId, useState } from 'react';
import { apiFetch } from '../api.js';
import { fieldErrors, invalidProps } from '../formErrors.js';
import FieldError from './FieldError.jsx';

export default function AddProductForm({ onAdded }) {
  const titleId = useId();
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({}); // ошибки по полям из details (ЛР11)

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setErrors({});
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));

    try {
      // Токен администратора apiFetch добавит сам; price отправляем числом
      const product = await apiFetch('/products', {
        method: 'POST',
        body: JSON.stringify({ ...data, price: Number(data.price) }),
      });
      onAdded(product); // сообщаем App о новом товаре
      form.reset();
    } catch (err) {
      const byField = fieldErrors(err);
      if (Object.keys(byField).length) setErrors(byField);
      else setError(err.message);
    }
  }

  // Каждое поле — в своей ячейке вместе с подсказкой, чтобы сетка формы на десктопе не съезжала.
  // min="1" и required — проверка браузера для удобства; та же проверка есть на сервере (zod)
  return (
    <form className="admin-form" aria-labelledby={titleId} onSubmit={handleSubmit}>
      <h3 id={titleId}>Новый товар</h3>
      <div className="field">
        <input name="name" placeholder="Название" aria-label="Название" required
          {...invalidProps(errors, 'name', titleId)} />
        <FieldError errors={errors} field="name" baseId={titleId} />
      </div>
      <div className="field">
        <input name="category" placeholder="Категория" aria-label="Категория" required
          {...invalidProps(errors, 'category', titleId)} />
        <FieldError errors={errors} field="category" baseId={titleId} />
      </div>
      <div className="field">
        <input name="price" type="number" min="1" placeholder="Цена, ₸" aria-label="Цена" required
          {...invalidProps(errors, 'price', titleId)} />
        <FieldError errors={errors} field="price" baseId={titleId} />
      </div>
      <div className="field">
        <input name="unit" placeholder="Единица (кг, л)" aria-label="Единица" defaultValue="кг"
          {...invalidProps(errors, 'unit', titleId)} />
        <FieldError errors={errors} field="unit" baseId={titleId} />
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <button type="submit">Добавить</button>
    </form>
  );
}
