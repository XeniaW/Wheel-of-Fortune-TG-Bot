// prizes.mjs

export function selectRandomPrize(list) {
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('Prize list is empty');
  }
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
}

export const secondSpinNoSubPrizes = [
  { emoji: '😐', title: 'Базовый доступ без углублённых материалов' },
  { emoji: '📎', title: 'Небольшой чек-лист без формулы' },
];

export const secondSpinSubscribedPrizes = [
  { emoji: '📗', title: 'Фрагмент книги с формулой выигрыша' },
  { emoji: '📘', title: 'Расширенный разбор вероятностей и стриков' },
  {
    emoji: '🎯',
    title: 'Гайд по настройке своей стратегии по стрикам',
  },
];
