// Текст ошибки сервера под полем формы (ЛР11). id совпадает с aria-describedby из invalidProps
export default function FieldError({ errors, field, baseId }) {
  if (!errors[field]) return null;
  return <p id={`${baseId}-${field}`} className="error field-error">{errors[field]}</p>;
}
