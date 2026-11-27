import { test, expect } from '@playwright/test';

// @smoke — только чтение: их можно запускать на продакшене (npm run e2e:smoke).
// Каталог появился — значит, React достучался до API, а тот — до базы
test('@smoke главная открывается, каталог показывает товары', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/АгроМаркет/);
  // Название магазина в шапке — его видит каждый посетитель (тренировка отката ЛР11 меняла его на «СЛОМАНО»)
  await expect(page.getByRole('banner').getByRole('link').first()).toHaveText(/АгроМаркет/);
  await expect(page.getByRole('heading', { name: 'Каталог' })).toBeVisible();
  await expect(page.getByTestId('product-card').first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole('alert')).toHaveCount(0); // «Не удалось загрузить товары» нет
});

test('@smoke поиск по каталогу оставляет подходящие товары', async ({ page }) => {
  // Отдельных страниц товаров в нашем React нет (один экран), поэтому второй smoke — поиск
  await page.goto('/');
  const cards = page.getByTestId('product-card');
  await expect(cards.first()).toBeVisible({ timeout: 60_000 });
  const total = await cards.count();
  const name = (await cards.first().getByRole('heading').innerText()).trim();

  await page.getByRole('searchbox').fill(name);
  await expect(cards.first().getByRole('heading')).toHaveText(name);
  expect(await cards.count()).toBeLessThanOrEqual(total);

  await page.getByRole('searchbox').fill('такого-товара-нет');
  await expect(cards).toHaveCount(0);
  await expect(page.getByText(/ничего не найдено/)).toBeVisible();
});

test('@smoke прямая ссылка на внутренний адрес не даёт 404', async ({ page }) => {
  const response = await page.goto('/login'); // rewrites в vercel.json (ЛР9)
  expect(response.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Каталог' })).toBeVisible();
});

test('@smoke корзина открывается', async ({ page }) => {
  // ничего не меняет: пустая корзина живёт в localStorage браузера (ЛР13)
  await page.goto('/cart');
  await expect(page.getByRole('heading', { name: 'Корзина' })).toBeVisible();
  await expect(page.getByText(/корзина пуста/i)).toBeVisible();
});
