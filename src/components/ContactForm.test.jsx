import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import ContactForm from './ContactForm';
import { server, recordRequests } from '../test/server.js';
import { validationError } from '../test/handlers.js';

const products = [
  { id: 1, name: 'Картофель' },
  { id: 2, name: 'Мёд натуральный' },
];

// Заполняет обязательные поля и выбирает товар
async function fillOrder(ui, email = 'bereke@agromarket.kz') {
  await ui.type(screen.getByLabelText('Имя / организация'), 'КХ «Береке»');
  await ui.type(screen.getByLabelText('Email'), email);
  await ui.selectOptions(screen.getByLabelText('Товар'), 'Мёд натуральный');
  await ui.type(screen.getByLabelText(/объём заказа/i), '25');
}

describe('ContactForm — оформление заявки', () => {
  test('вошедший клиент: в запросе заголовок Authorization с токеном', async () => {
    const ui = userEvent.setup();
    localStorage.setItem('token', 'test-token'); // ключ — как в App.jsx (ЛР7)
    const requests = recordRequests();
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<ContactForm products={products} />);

    await fillOrder(ui);
    await ui.click(screen.getByRole('button', { name: 'Отправить заявку' }));

    await waitFor(() => expect(alert).toHaveBeenCalledWith('Заявка №42 принята!'));
    const [request] = requests;
    expect(request).toMatchObject({ method: 'POST', path: '/api/orders' });
    expect(request.headers.get('Authorization')).toBe('Bearer test-token');
    expect(request.body).toMatchObject({
      name: 'КХ «Береке»',
      email: 'bereke@agromarket.kz',
      product_id: '2',
      quantity: '25',
    });
    expect(screen.getByLabelText('Email')).toHaveValue(''); // форма очищена
  });

  test('гость: заявка уходит без заголовка Authorization', async () => {
    const ui = userEvent.setup();
    const requests = recordRequests();
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<ContactForm products={products} />);

    await fillOrder(ui);
    await ui.click(screen.getByRole('button', { name: 'Отправить заявку' }));

    await waitFor(() => expect(alert).toHaveBeenCalled());
    expect(requests[0].headers.has('Authorization')).toBe(false);
  });

  test('объём меньше 10 кг не отправляется', async () => {
    const ui = userEvent.setup();
    const requests = recordRequests();
    render(<ContactForm products={products} />);

    await fillOrder(ui);
    await ui.clear(screen.getByLabelText(/объём заказа/i));
    await ui.type(screen.getByLabelText(/объём заказа/i), '5');
    await ui.click(screen.getByRole('button', { name: 'Отправить заявку' }));

    expect(requests).toEqual([]);
    expect(screen.getByLabelText(/объём заказа/i).validity.rangeUnderflow).toBe(true);
  });

  test('ошибка валидации сервера (400, details) — понятный текст, данные формы не теряются', async () => {
    // «bereke@agromarket» браузер пропускает, а схема zod на сервере — нет
    server.use(http.post('*/api/orders', () => validationError(['email', 'Некорректный e-mail'])));
    const ui = userEvent.setup();
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<ContactForm products={products} />);

    await fillOrder(ui, 'bereke@agromarket');
    await ui.click(screen.getByRole('button', { name: 'Отправить заявку' }));

    // Не «Ошибка валидации», а то, что именно не так (ApiError собирает текст из details)
    await waitFor(() => expect(alert).toHaveBeenCalledWith('Ошибка: Некорректный e-mail'));
    expect(screen.getByLabelText('Email')).toHaveValue('bereke@agromarket');
    expect(screen.getByRole('button', { name: 'Отправить заявку' })).toBeEnabled();
  });

  test('сервер недоступен — понятное сообщение', async () => {
    server.use(http.post('*/api/orders', () => HttpResponse.error()));
    const ui = userEvent.setup();
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<ContactForm products={products} />);

    await fillOrder(ui);
    await ui.click(screen.getByRole('button', { name: 'Отправить заявку' }));

    await waitFor(() => expect(alert).toHaveBeenCalledWith(expect.stringMatching(/сервер недоступен/i)));
  });
});
