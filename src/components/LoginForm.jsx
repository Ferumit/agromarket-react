import { useId, useState } from 'react';
import { apiFetch } from '../api.js';

export default function LoginForm({ onLogin, notice }) {
  const titleId = useId();
  const [mode, setMode] = useState('login'); // 'login' или 'register'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const isLogin = mode === 'login';

  return (
    // Имя формы — её заголовок: на странице два поля «Email» (вход и заявка),
    // и по имени формы и тест, и экранный диктор понимают, какое из них какое
    <form className="login-form" aria-labelledby={titleId} onSubmit={handleSubmit}>
      <h3 id={titleId}>{isLogin ? 'Вход' : 'Регистрация'}</h3>
      {notice && <p className="error" role="status">{notice}</p>}
      {!isLogin && <input name="name" placeholder="Имя" aria-label="Имя" required />}
      <input name="email" type="email" placeholder="Email" aria-label="Email" required />
      <input name="password" type="password" placeholder="Пароль (от 8 символов)"
        aria-label="Пароль" required minLength={8} />
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Подождите…' : isLogin ? 'Войти' : 'Зарегистрироваться'}
      </button>
      <button type="button" className="link-button"
        onClick={() => setMode(isLogin ? 'register' : 'login')}>
        {isLogin ? 'Нет аккаунта? Регистрация' : 'Уже есть аккаунт? Войти'}
      </button>
    </form>
  );
}
