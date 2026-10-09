# АгроМаркет — React

Frontend «АгроМаркета» на React + Vite. Учебный проект по дисциплине «Fullstack-разработка».

Связанные репозитории: [agromarket](https://github.com/Ferumit/agromarket) — статичная
версия и `db.json` для json-server (лаб. 1–2).

## Запуск

```bash
# окно 1 — данные: в папке agromarket (лаб. 1–2)
npx json-server --watch db.json --port 3001

# окно 2 — этот проект, http://localhost:5173
npm install
npm run dev
```

## Лабораторная 3 — компоненты, props, state, hooks

- проект создан командой `npm create vite@latest agromarket-react -- --template react`, демо-счётчик удалён;
- `src/components/ProductCard.jsx` — карточка товара, данные приходят через props (`product`, `onAdd`);
- `App.jsx`: список товаров в `useState`, загрузка с json-server в `useEffect(..., [])`, вывод через `.map()` с `key`;
- поиск — управляемый (controlled) input: значение в состоянии `searchTerm`, фильтр `.filter()` + `.toLowerCase()`;
- корзина — состояние `cartCount` в App, функция `handleAddToCart` передаётся в карточку как prop (lifting state up);
- бонус: состояния `loading` и `error`, fetch обёрнут в try/catch.

### Ответы для защиты

- **Зачем `[]` в useEffect.** Второй аргумент — список зависимостей. Пустой массив означает «выполнить
  эффект один раз, после первого рендера». Без него эффект запускался бы после каждого рендера:
  `setProducts` вызывает новый рендер, тот снова запускает fetch — бесконечный цикл запросов.
- **Что такое props.** Объект с данными, который родитель передаёт компоненту снаружи:
  `<ProductCard product={product} onAdd={handleAddToCart} />`. Компонент props только читает, не меняет.
- **Controlled input.** У обычного input значение живёт в DOM, React о нём не знает. У управляемого
  значение хранится в state (`value={searchTerm}`), а `onChange` обновляет state на каждый символ —
  React решает, что показать в поле, и может сразу использовать значение (фильтр каталога).
