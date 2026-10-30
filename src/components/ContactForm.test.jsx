import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContactForm from './ContactForm';
import { mockFetch, requestOf } from '../test/fetch.js';

const products = [
  { id: 1, name: 'Картофель' },
  { id: 2, name: 'Мёд натуральный' },
];

// Заполняет обязательные поля и выбирает товар
async function fillOrder(ui) {
  await ui.type(screen.getByLabelText('Имя / организация'), 'КХ «Береке»');
  await ui.type(screen.getByLabelText('Email'), 'bereke@agromarket.kz');
  await ui.selectOptions(screen.getByLabelText('Товар'), 'Мёд натуральный');
  await ui.type(screen.getByLabelText(/объём заказа/i), '25');
}

describe('ContactForm — оформление заявки', () => {
  test('вошедший клиент: в запросе заголовок Authorization с токеном', async () => {
    const ui = userEvent.setup();
    localStorage.setItem('token', 'test-token'); // ключ — как в App.jsx (ЛР7)
    const spy = mockFetch({ id: 42, status: 'new' }, 201);
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<ContactForm products={products} />);

    await fillOrder(ui);
    await ui.click(screen.getByRole('button', { name: 'Отправить заявку' }));

    expect(alert).toHaveBeenCalledWith('Заявка №42 принята!');
    const request = requestOf(spy);
    expect(request.url).toMatch(/\/api\/orders$/);
    expect(request.method).toBe('POST');
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
    const spy = mockFetch({ id: 43, status: 'new' }, 201);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<ContactForm products={products} />);

    await fillOrder(ui);
    await ui.click(screen.getByRole('button', { name: 'Отправить заявку' }));

    expect(requestOf(spy).headers.has('Authorization')).toBe(false);
  });

  test('объём меньше 10 кг не отправляется', async () => {
    const ui = userEvent.setup();
    const spy = mockFetch({});
    render(<ContactForm products={products} />);

    await fillOrder(ui);
    await ui.clear(screen.getByLabelText(/объём заказа/i));
    await ui.type(screen.getByLabelText(/объём заказа/i), '5');
    await ui.click(screen.getByRole('button', { name: 'Отправить заявку' }));

    expect(spy).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/объём заказа/i).validity.rangeUnderflow).toBe(true);
  });

  test('ошибку сервера показывает пользователю, данные формы не теряются', async () => {
    const ui = userEvent.setup();
    mockFetch({ error: 'Поле quantity должно быть не меньше 10' }, 400);
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<ContactForm products={products} />);

    await fillOrder(ui);
    await ui.click(screen.getByRole('button', { name: 'Отправить заявку' }));

    expect(alert).toHaveBeenCalledWith('Ошибка: Поле quantity должно быть не меньше 10');
    expect(screen.getByLabelText('Email')).toHaveValue('bereke@agromarket.kz');
    expect(screen.getByRole('button', { name: 'Отправить заявку' })).toBeEnabled();
  });

  test('сервер недоступен — понятное сообщение', async () => {
    const ui = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<ContactForm products={products} />);

    await fillOrder(ui);
    await ui.click(screen.getByRole('button', { name: 'Отправить заявку' }));

    expect(alert).toHaveBeenCalledWith(expect.stringMatching(/сервер недоступен/i));
  });
});
