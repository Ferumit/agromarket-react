import { test, expect } from '@playwright/test';

// E2E на продакшене работает с настоящей базой: тест создаёт только своего
// покупателя с уникальным e-mail и чужие данные не трогает
const email = `e2e+${Date.now()}@agromarket.test`; // каждый запуск — новый покупатель
const password = 'E2e-Test-Password-123';
const name = 'E2E Покупатель';

// Каталог появился — значит, React на Vercel достучался до API на Render, а тот — до базы.
// Сервер Free после простоя просыпается до минуты, поэтому ждём дольше обычного
async function waitForCatalog(page) {
  await expect(page.getByRole('article').first()).toBeVisible({ timeout: 60_000 });
}

test('каталог загружается с сервера', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/АгроМаркет/i);
  await waitForCatalog(page);
  await expect(page.getByRole('article').first().getByRole('heading')).not.toBeEmpty();
  await expect(page.getByText('Не удалось загрузить товары')).toBeHidden();
});

test('прямая ссылка на внутреннюю страницу не даёт 404', async ({ page }) => {
  const response = await page.goto('/login'); // проверка rewrites в vercel.json из ЛР9
  expect(response.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Каталог' })).toBeVisible();
});

test('покупатель регистрируется, входит и оформляет заявку', async ({ page }) => {
  await page.goto('/');
  await waitForCatalog(page);

  // Регистрация: после неё сервер сразу выдаёт токен — пользователь уже вошёл
  await page.getByRole('button', { name: /нет аккаунта/i }).click();
  const register = page.getByRole('form', { name: 'Регистрация' });
  await register.getByLabel('Имя').fill(name);
  await register.getByLabel('Email').fill(email);
  await register.getByLabel('Пароль').fill(password);
  await register.getByRole('button', { name: /зарегистр/i }).click();

  const account = page.getByText(/вы вошли как/i);
  await expect(account).toContainText(name);

  // После F5 вход сохраняется: токен в localStorage, сервер подтверждает его через /auth/me
  await page.reload();
  await expect(account).toContainText(name);

  // Выход и вход с тем же паролем
  await page.getByRole('button', { name: 'Выйти' }).click();
  const login = page.getByRole('form', { name: 'Вход' });
  await login.getByLabel('Email').fill(email);
  await login.getByLabel('Пароль').fill(password);
  await login.getByRole('button', { name: 'Войти' }).click();
  await expect(account).toContainText(name);

  // Товар в корзину — счётчик в шапке
  const card = page.getByRole('article').first();
  const productName = (await card.getByRole('heading').textContent()).trim();
  await card.getByRole('button', { name: /в корзину/i }).click();
  await expect(page.getByText(/корзина: 1/i)).toBeVisible();

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

test('короткий пароль: браузер не отправляет регистрацию', async ({ page }) => {
  // Компонентный тест этого не проверит: в jsdom minlength не работает
  const requests = [];
  page.on('request', (r) => r.url().includes('/auth/') && requests.push(r.url()));
  await page.goto('/');

  await page.getByRole('button', { name: /нет аккаунта/i }).click();
  const register = page.getByRole('form', { name: 'Регистрация' });
  await register.getByLabel('Имя').fill(name);
  await register.getByLabel('Email').fill(`e2e-short+${Date.now()}@agromarket.test`);
  await register.getByLabel('Пароль').fill('1234567');
  await register.getByRole('button', { name: /зарегистр/i }).click();

  const tooShort = await register.getByLabel('Пароль').evaluate((el) => el.validity.tooShort);
  expect(tooShort).toBe(true);
  await expect(register).toBeVisible();
  expect(requests).toEqual([]);
});

test('гость не видит админ-панель', async ({ page }) => {
  // Отдельной страницы /admin нет: панель — часть главной и видна только администратору
  const response = await page.goto('/admin');
  expect(response.status()).toBe(200);
  await waitForCatalog(page);

  await expect(page.getByRole('form', { name: 'Вход' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Новый товар' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Заявки' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Удалить' })).toHaveCount(0);
});
