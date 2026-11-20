import { useId, useState } from 'react';
import { apiFetch } from '../api.js';
import { fieldErrors, invalidProps } from '../formErrors.js';
import FieldError from './FieldError.jsx';

export default function LoginForm({ onLogin, notice }) {
  const titleId = useId();
  const [mode, setMode] = useState('login'); // 'login' или 'register'
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({}); // ошибки по полям из details (ЛР11)
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setErrors({});
    setLoading(true);
    const data = Object.fromEntries(new FormData(e.target));
    try {
      // /auth/login или /auth/register — оба возвращают { user, token }
      const result = await apiFetch(`/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      onLogin(result.user, result.token);
    } catch (err) {
      // 400 с details — подсказки у полей; 401, 409, 429 и прочее — текст сервера под формой
      const byField = fieldErrors(err);
      if (Object.keys(byField).length) setErrors(byField);
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
    setErrors({});
  }

  const isLogin = mode === 'login';

  return (
    // Имя формы — её заголовок: на странице два поля «Email» (вход и заявка),
    // и по имени формы и тест, и экранный диктор понимают, какое из них какое
    <form className="login-form" aria-labelledby={titleId} onSubmit={handleSubmit}>
      <h3 id={titleId}>{isLogin ? 'Вход' : 'Регистрация'}</h3>
      {notice && <p className="error" role="status">{notice}</p>}
      {!isLogin && (
        <>
          <input name="name" placeholder="Имя" aria-label="Имя" required
            {...invalidProps(errors, 'name', titleId)} />
          <FieldError errors={errors} field="name" baseId={titleId} />
        </>
      )}
      <input name="email" type="email" placeholder="Email" aria-label="Email" required
        {...invalidProps(errors, 'email', titleId)} />
      <FieldError errors={errors} field="email" baseId={titleId} />
      <input name="password" type="password" placeholder="Пароль (от 8 символов)"
        aria-label="Пароль" required minLength={8}
        {...invalidProps(errors, 'password', titleId)} />
      <FieldError errors={errors} field="password" baseId={titleId} />
      {error && <p className="error" role="alert">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Подождите…' : isLogin ? 'Войти' : 'Зарегистрироваться'}
      </button>
      <button type="button" className="link-button" onClick={switchMode}>
        {isLogin ? 'Нет аккаунта? Регистрация' : 'Уже есть аккаунт? Войти'}
      </button>
    </form>
  );
}
