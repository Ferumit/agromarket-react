// 3500 → «3 500 ₸». Цены и суммы — целые тенге, как в базе
export const money = (n) => `${n.toLocaleString('ru-RU')} ₸`;
