// Статусы заказа — как в CHECK таблицы orders на сервере
export const ORDER_STATUSES = {
  new: 'Новый',
  processing: 'В работе',
  done: 'Выполнен',
  cancelled: 'Отменён',
};

export const formatDate = (iso) => new Date(iso).toLocaleDateString('ru-RU');
