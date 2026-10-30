import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from './LoginForm';
import { mockFetch, requestOf } from '../test/fetch.js';

const user = { id: 7, name: 'Фермер', email: 'farmer@agromarket.kz', role: 'user' };

// LoginForm сам отправляет запрос через apiFetch, поэтому подменяем fetch,
// а onLogin — шпион: так App узнаёт о вошедшем пользователе
describe('LoginForm', () => {
  test('отправляет введённые e-mail и пароль и сообщает о входе', async () => {
    const ui = userEvent.setup();
    const spy = mockFetch({ user, token: 'jwt-token' });
    const onLogin = vi.fn();
    render(<LoginForm onLogin={onLogin} />);

    await ui.type(screen.getByLabelText(/e-?mail|почта/i), 'farmer@agromarket.kz');
    await ui.type(screen.getByLabelText(/пароль/i), 'secret123');
    await ui.click(screen.getByRole('button', { name: /войти/i }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith(user, 'jwt-token'));
    const request = requestOf(spy);
    expect(request.url).toMatch(/\/api\/auth\/login$/);
    expect(request.method).toBe('POST');
    expect(request.body).toEqual({ email: 'farmer@agromarket.kz', password: 'secret123' });
  });

  test('с пустыми полями не отправляет запрос, поля отмечены как ошибочные', async () => {
    const ui = userEvent.setup();
    const spy = mockFetch({});
    const onLogin = vi.fn();
    render(<LoginForm onLogin={onLogin} />);

    await ui.click(screen.getByRole('button', { name: /войти/i }));

    expect(spy).not.toHaveBeenCalled();
    expect(onLogin).not.toHaveBeenCalled();
    // Текст ошибки здесь — подсказка браузера «Заполните это поле» (атрибут required).
    // jsdom её не рисует, поэтому проверяем само состояние поля
    expect(screen.getByLabelText(/email/i)).toBeInvalid();
    expect(screen.getByLabelText(/email/i).validity.valueMissing).toBe(true);
    expect(screen.getByLabelText(/пароль/i)).toBeInvalid();
  });

  test('некорректный e-mail (без @) не отправляется', async () => {
    const ui = userEvent.setup();
    const spy = mockFetch({});
    render(<LoginForm onLogin={vi.fn()} />);

    await ui.type(screen.getByLabelText(/email/i), 'farmer.agromarket.kz');
    await ui.type(screen.getByLabelText(/пароль/i), 'secret123');
    await ui.click(screen.getByRole('button', { name: /войти/i }));

    expect(spy).not.toHaveBeenCalled();
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

  test('ошибку сервера показывает под формой', async () => {
    const ui = userEvent.setup();
    mockFetch({ error: 'Неверный email или пароль' }, 401);
    const onLogin = vi.fn();
    render(<LoginForm onLogin={onLogin} />);

    await ui.type(screen.getByLabelText(/email/i), 'farmer@agromarket.kz');
    await ui.type(screen.getByLabelText(/пароль/i), 'wrong-password');
    await ui.click(screen.getByRole('button', { name: /войти/i }));

    expect(await screen.findByText('Неверный email или пароль')).toBeInTheDocument();
    expect(onLogin).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /войти/i })).toBeEnabled(); // можно попробовать снова
  });

  test('пока сервер отвечает, кнопка заблокирована', async () => {
    const ui = userEvent.setup();
    // ответ не приходит никогда — форма так и остаётся в ожидании
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => {}));
    render(<LoginForm onLogin={vi.fn()} />);

    await ui.type(screen.getByLabelText(/email/i), 'farmer@agromarket.kz');
    await ui.type(screen.getByLabelText(/пароль/i), 'secret123');
    await ui.click(screen.getByRole('button', { name: /войти/i }));

    expect(screen.getByRole('button', { name: /подождите/i })).toBeDisabled();
  });

  test('регистрация: появляется поле «Имя», запрос уходит на /auth/register', async () => {
    const ui = userEvent.setup();
    const spy = mockFetch({ user, token: 'jwt-token' }, 201);
    const onLogin = vi.fn();
    render(<LoginForm onLogin={onLogin} />);

    expect(screen.queryByLabelText('Имя')).not.toBeInTheDocument();
    await ui.click(screen.getByRole('button', { name: /нет аккаунта/i }));
    expect(screen.getByRole('heading', { name: 'Регистрация' })).toBeInTheDocument();

    await ui.type(screen.getByLabelText('Имя'), 'Фермер');
    await ui.type(screen.getByLabelText(/email/i), 'farmer@agromarket.kz');
    await ui.type(screen.getByLabelText(/пароль/i), 'secret123');
    await ui.click(screen.getByRole('button', { name: 'Зарегистрироваться' }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith(user, 'jwt-token'));
    expect(requestOf(spy).url).toMatch(/\/api\/auth\/register$/);
    expect(requestOf(spy).body).toEqual({
      name: 'Фермер',
      email: 'farmer@agromarket.kz',
      password: 'secret123',
    });
  });
});
