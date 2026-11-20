import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import AddProductForm from './AddProductForm';
import { server, recordRequests } from '../test/server.js';
import { TOKEN, validationError } from '../test/handlers.js';

// Форма «Новый товар» видна только администратору. Цену проверяют дважды:
// браузер (min="1") — для удобства, сервер (zod, ЛР11) — для безопасности
async function fill(ui, { name = 'Мёд гречишный', category = 'Мёд', price = '3500' } = {}) {
  await ui.type(screen.getByLabelText('Название'), name);
  await ui.type(screen.getByLabelText('Категория'), category);
  await ui.type(screen.getByLabelText('Цена'), price);
}

describe('AddProductForm', () => {
  test('создаёт товар с токеном администратора и очищает форму', async () => {
    localStorage.setItem('token', TOKEN);
    const ui = userEvent.setup();
    const requests = recordRequests();
    const onAdded = vi.fn();
    render(<AddProductForm onAdded={onAdded} />);

    await fill(ui);
    await ui.click(screen.getByRole('button', { name: 'Добавить' }));

    await waitFor(() => expect(onAdded).toHaveBeenCalledWith(
      expect.objectContaining({ id: 100, name: 'Мёд гречишный', price: 3500 })));
    expect(requests[0].headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
    expect(requests[0].body).toEqual({ name: 'Мёд гречишный', category: 'Мёд', price: 3500, unit: 'кг' });
    expect(screen.getByLabelText('Название')).toHaveValue('');
  });

  test('цена -500: браузер не отправляет форму (min="1")', async () => {
    const ui = userEvent.setup();
    const requests = recordRequests();
    render(<AddProductForm onAdded={vi.fn()} />);

    await fill(ui, { price: '-500' });
    await ui.click(screen.getByRole('button', { name: 'Добавить' }));

    expect(requests).toEqual([]);
    expect(screen.getByLabelText('Цена').validity.rangeUnderflow).toBe(true);
  });

  test('цена -500 в обход браузера: сервер отвечает 400, ошибка у поля «Цена»', async () => {
    // Запрос можно отправить и без формы (Postman, Console), а старый браузер
    // может не проверить min. submit без проверки браузера — как такой случай
    server.use(http.post('*/api/products', () =>
      validationError(['price', 'Цена должна быть больше 0'])));
    const ui = userEvent.setup();
    const requests = recordRequests();
    const onAdded = vi.fn();
    render(<AddProductForm onAdded={onAdded} />);

    await fill(ui, { price: '-500' });
    fireEvent.submit(screen.getByRole('form', { name: 'Новый товар' }));

    const price = screen.getByLabelText('Цена');
    await waitFor(() => expect(price).toHaveAccessibleDescription('Цена должна быть больше 0'));
    expect(price).toHaveAttribute('aria-invalid', 'true');
    expect(requests[0].body.price).toBe(-500);
    expect(onAdded).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Название')).toHaveValue('Мёд гречишный'); // введённое не пропало
  });
});
