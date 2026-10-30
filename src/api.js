// Адрес API — из переменной окружения Vite.
// Локально берётся из .env.development, на хостинге (ЛР9) — из настроек сборки
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Событие window: сервер ответил 401 на запрос с токеном
export const SESSION_EXPIRED = 'agromarket:session-expired';

// Обёртка над fetch: добавляет токен, разбирает JSON и превращает ошибки API в исключения
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = res.status === 204 ? null : await res.json();

  // Токен был, но сервер его не принял (истёк / подделан) — выходим из аккаунта.
  // Без перезагрузки страницы: App ловит событие и показывает форму входа,
  // а введённое в формах не теряется
  if (res.status === 401 && token) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event(SESSION_EXPIRED));
  }

  if (!res.ok) {
    throw new Error(data?.error || `Ошибка ${res.status}`);
  }
  return data;
}
