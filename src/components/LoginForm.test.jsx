import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import LoginForm from './LoginForm';
import { server, recordRequests } from '../test/server.js';
import { farmer, PASSWORD, TOKEN, validationError } from '../test/handlers.js';

// LoginForm сам отправляет запрос через apiFetch, ответ даёт MSW,
// а onLogin — шпион: так App узнаёт о вошедшем пользователе
async function fillAndSubmit(ui, email, password) {
  await ui.type(screen.getByLabelText(/email/i), email);
  await ui.type(screen.getByLabelText(/пароль/i), password);
  await ui.click(screen.getByRole('button', { name: /^(войти|зарегистрироваться)$/i }));
}

describe('LoginForm', () => {
  test('отправляет введённые e-mail и пароль и сообщает о входе', async () => {
    const ui = userEvent.setup();
    const requests = recordRequests();
    const onLogin = vi.fn();
    render(<LoginForm onLogin={onLogin} />);

    await fillAndSubmit(ui, farmer.email, PASSWORD);

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith(farmer, TOKEN));
    expect(requests).toMatchObject([{
      method: 'POST',
      path: '/api/auth/login',
      body: { email: farmer.email, password: PASSWORD },
    }]);
  });

  test('с пустыми полями не отправляет запрос, поля отмечены как ошибочные', async () => {
    const ui = userEvent.setup();
    const requests = recordRequests();
    const onLogin = vi.fn();
    render(<LoginForm onLogin={onLogin} />);

    await ui.click(screen.getByRole('button', { name: /войти/i }));

    expect(requests).toEqual([]);
    expect(onLogin).not.toHaveBeenCalled();
    // Текст ошибки здесь — подсказка браузера «Заполните это поле» (атрибут required).
    // jsdom её не рисует, поэтому проверяем само состояние поля
    expect(screen.getByLabelText(/email/i).validity.valueMissing).toBe(true);
    expect(screen.getByLabelText(/пароль/i)).toBeInvalid();
  });

  test('некорректный e-mail (без @) не отправляется', async () => {
    const ui = userEvent.setup();
    const requests = recordRequests();
    render(<LoginForm onLogin={vi.fn()} />);

    await fillAndSubmit(ui, 'farmer.agromarket.kz', PASSWORD);

    expect(requests).toEqual([]);
    expect(screen.getByLabelText(/email/i).validity.typeMismatch).toBe(true);
  });

  test('пароль: обязателен и не короче 8 символов', () => {
    render(<LoginForm onLogin={vi.fn()} />);

    // Длину проверяет браузер по атрибуту minlength. jsdom эту проверку не выполняет
    // (validity.tooShort там всегда false), поэтому её проверяет E2E-тест в Chromium
    const password = screen.getByLabelText(/пароль/i);
    expect(password).toBeRequired();
    expect(password).toHaveAttribute('minlength', '8');
    expect(password).toHaveAttribute('type', 'password');
  });

  test('неверный пароль (401) — текст ошибки с сервера, токена нет', async () => {
    const ui = userEvent.setup();
    const onLogin = vi.fn();
    render(<LoginForm onLogin={onLogin} />);

    await fillAndSubmit(ui, farmer.email, 'wrong-password');

    expect(await screen.findByRole('alert')).toHaveTextContent('Неверный email или пароль');
    expect(onLogin).not.toHaveBeenCalled();
    expect(localStorage.getItem('token')).toBeNull();
    expect(screen.getByRole('button', { name: /войти/i })).toBeEnabled(); // можно попробовать снова
  });

  test('слишком много попыток (429) — сообщение из ответа сервера', async () => {
    server.use(http.post('*/api/auth/login', () => HttpResponse.json(
      { error: 'Слишком много попыток входа. Попробуйте через 15 минут' },
      { status: 429, headers: { 'Retry-After': '900' } },
    )));
    const ui = userEvent.setup();
    render(<LoginForm onLogin={vi.fn()} />);

    await fillAndSubmit(ui, farmer.email, PASSWORD);

    expect(await screen.findByRole('alert')).toHaveTextContent(/слишком много попыток/i);
  });

  test('пока сервер отвечает, кнопка заблокирована: второй клик не шлёт второй запрос', async () => {
    server.use(http.post('*/api/auth/login', () => delay('infinite'))); // ответа нет
    const ui = userEvent.setup();
    const requests = recordRequests();
    render(<LoginForm onLogin={vi.fn()} />);

    await fillAndSubmit(ui, farmer.email, PASSWORD);
    const button = screen.getByRole('button', { name: /подождите/i });
    expect(button).toBeDisabled();
    await ui.click(button);

    expect(requests).toHaveLength(1);
  });

  test('регистрация: появляется поле «Имя», запрос уходит на /auth/register', async () => {
    const ui = userEvent.setup();
    const requests = recordRequests();
    const onLogin = vi.fn();
    render(<LoginForm onLogin={onLogin} />);

    expect(screen.queryByLabelText('Имя')).not.toBeInTheDocument();
    await ui.click(screen.getByRole('button', { name: /нет аккаунта/i }));
    expect(screen.getByRole('heading', { name: 'Регистрация' })).toBeInTheDocument();

    await ui.type(screen.getByLabelText('Имя'), 'Айгерим');
    await fillAndSubmit(ui, 'aigerim@agromarket.kz', PASSWORD);

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith(
      { ...farmer, name: 'Айгерим', email: 'aigerim@agromarket.kz' }, TOKEN));
    expect(requests[0]).toMatchObject({
      path: '/api/auth/register',
      body: { name: 'Айгерим', email: 'aigerim@agromarket.kz', password: PASSWORD },
    });
  });

  test('регистрация: 400 с details — ошибка под полем e-mail (ЛР11)', async () => {
    // «farmer@agro» браузер пропускает (по HTML-стандарту это e-mail), а zod на сервере — нет
    server.use(http.post('*/api/auth/register', () =>
      validationError(['email', 'Некорректный e-mail'])));
    const ui = userEvent.setup();
    const onLogin = vi.fn();
    render(<LoginForm onLogin={onLogin} />);

    await ui.click(screen.getByRole('button', { name: /нет аккаунта/i }));
    await ui.type(screen.getByLabelText('Имя'), 'Айгерим');
    await fillAndSubmit(ui, 'farmer@agro', PASSWORD);

    const email = screen.getByLabelText(/email/i);
    await waitFor(() => expect(email).toHaveAccessibleDescription('Некорректный e-mail'));
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Имя')).not.toHaveAttribute('aria-invalid');
    expect(onLogin).not.toHaveBeenCalled();
  });
});
