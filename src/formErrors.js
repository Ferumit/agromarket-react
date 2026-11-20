// Ошибки валидации сервера в формах (ЛР11).
// Сервер отвечает 400 { error, details: [{ field, message }] }, apiFetch кладёт details в ApiError

// details → { price: 'Цена должна быть больше 0', ... }
export function fieldErrors(err) {
  return Object.fromEntries((err?.details ?? []).map((d) => [d.field, d.message]));
}

// Атрибуты поля с ошибкой: красная рамка и ссылка на текст подсказки,
// чтобы экранный диктор прочитал его вместе с полем
export function invalidProps(errors, field, baseId) {
  return errors[field]
    ? { 'aria-invalid': true, 'aria-describedby': `${baseId}-${field}` }
    : {};
}
