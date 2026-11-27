import { test, expect } from '@playwright/test';

// Сценарий покупателя (ЛР10): регистрация → вход → корзина → заявка.
// Создаёт пользователя и заявку, поэтому — только локально (npm run e2e), не на продакшене
const email = `e2e+${Date.now()}@agromarket.test`; // каждый запуск — новый покупатель
const password = 'E2e-Test-Password-123';
const name = 'E2E Покупатель';

test('покупатель регистрируется, входит и оформляет заявку', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('product-card').first()).toBeVisible();

  // Регистрация: после неё сервер сразу выдаёт токен — пользователь уже вошёл
  await page.getByRole('button', { name: /нет аккаунта/i }).click();
  const register = page.getByRole('form', { name: 'Регистрация' });
  await register.getByLabel('Имя').fill(name);
  await register.getByLabel('Email').fill(email);
  await register.getByLabel('Пароль').fill(password);
  await register.getByRole('button', { name: /зарегистр/i }).click();

  const account = page.getByText(/вы вошли как/i);
  await expect(account).toContainText(name);

  // Выход и вход с тем же паролем
  await page.getByRole('button', { name: 'Выйти' }).click();
  const login = page.getByRole('form', { name: 'Вход' });
  await login.getByLabel('Email').fill(email);
  await login.getByLabel('Пароль').fill(password);
  await login.getByRole('button', { name: 'Войти' }).click();
  await expect(account).toContainText(name);

  // Товар в корзину — счётчик в шапке
  const card = page.getByTestId('product-card').first();
  const productName = (await card.getByRole('heading').textContent()).trim();
  await card.getByRole('button', { name: /в корзину/i }).click();
  await expect(page.getByRole('link', { name: /корзина \(1\)/i })).toBeVisible(); // счётчик — ссылка на /cart (ЛР13)

  // Заявка на этот товар
  const order = page.getByRole('form', { name: 'Оптовая заявка' });
  await order.getByLabel('Имя / организация').fill(name);
  await order.getByLabel('Email').fill(email);
  await order.getByLabel('Товар').selectOption({ label: productName });
  await order.getByLabel(/объём заказа/i).fill('25');
  await order.getByLabel('Комментарий').fill('Автотест E2E, обрабатывать не нужно');

  // Об успехе форма сообщает через alert — ловим диалог и читаем текст
  const dialogPromise = page.waitForEvent('dialog');
  await order.getByRole('button', { name: 'Отправить заявку' }).click();
  const dialog = await dialogPromise;
  expect(dialog.message()).toMatch(/^Заявка №\d+ принята!$/);
  await dialog.accept();
  await expect(order.getByLabel('Email')).toHaveValue(''); // форма очищена
});

test('@smoke гость не видит админ-панель', async ({ page }) => {
  // Отдельной страницы /admin нет: панель — часть главной и видна только администратору
  const response = await page.goto('/admin');
  expect(response.status()).toBe(200);
  await expect(page.getByTestId('product-card').first()).toBeVisible({ timeout: 60_000 });

  await expect(page.getByRole('form', { name: 'Вход' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Новый товар' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Заявки' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Удалить' })).toHaveCount(0);
});
