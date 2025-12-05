// index.mjs

import 'dotenv/config';
import { Telegraf } from 'telegraf';
import {
  selectRandomPrize,
  firstSpinPrizes,
  secondSpinNoSubPrizes,
  secondSpinSubscribedPrizes,
} from './prizes.mjs';

const CHANNEL_URL = 'https://t.me/formula_success_tg';
const VIDEO_URL = 'https://t.me/formula_success_tg/93';
const BOOK_URL = 'https://t.me/formula_success_tg/115';
const FORM_URL = 'https://docs.google.com/forms/d/XXXXXXX'; // TODO: вставь свою форму

// ====== ИНИЦИАЛИЗАЦИЯ БОТА ======

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('ERROR: BOT_TOKEN не задан в .env');
  process.exit(1);
}

const bot = new Telegraf(token);

// ====== ТИПЫ / СЕССИИ (как в твоём коде) ======

/**
 * @typedef {'idle'|'first_spin_done'|'second_spin_done'|'book_paid'} UserStage
 */

/**
 * @typedef UserSession
 * @property {UserStage} stage
 * @property {boolean} subscribed
 */

/** @type {Map<string, UserSession>} */
const sessions = new Map();

function getSession(chatId) {
  let s = sessions.get(chatId);
  if (!s) {
    s = { stage: 'idle', subscribed: false };
    sessions.set(chatId, s);
  }
  return s;
}

// ====== ХЕЛПЕРЫ СООБЩЕНИЙ ======

/**
 * payload: { text: string, buttons?: { text: string }[][] }
 * Делаем обычную reply keyboard — Telegram отправляет текст кнопки.
 */
async function sendMessageToChat(ctx, chatId, payload) {
  const { text, buttons } = payload;

  let extra = {};
  if (buttons && buttons.length) {
    const keyboard = buttons.map((row) => row.map((btn) => btn.text));
    extra = {
      reply_markup: {
        keyboard,
        resize_keyboard: true,
        one_time_keyboard: false,
      },
    };
  }

  return ctx.telegram.sendMessage(chatId, text, extra);
}

/**
 * Отправка картинки с подписью + теми же кнопками.
 * photo: URL | file_id | путь к файлу
 */
async function sendPhotoToChat(ctx, chatId, payload) {
  const { photo, caption, buttons } = payload;

  let extra = {};
  if (buttons && buttons.length) {
    const keyboard = buttons.map((row) => row.map((btn) => btn.text));
    extra.reply_markup = {
      keyboard,
      resize_keyboard: true,
      one_time_keyboard: false,
    };
  }
  if (caption) extra.caption = caption;

  return ctx.telegram.sendPhoto(chatId, photo, extra);
}

// ====== ТВОЯ ЛОГИКА ХЕНДЛЕРОВ ======

async function sendStart(ctx, chatId) {
  await sendMessageToChat(ctx, chatId, {
    text:
      '🎰 Добро пожаловать в игру «Колесо Фортуны»!\n\n' +
      '1️⃣ Подпишись на канал, где я разбираю формулу выигрыша:\n' +
      `${CHANNEL_URL}\n\n` +
      '2️⃣ Посмотри вводное видео:\n' +
      `${VIDEO_URL}\n\n` +
      '3️⃣ Потом жми «Первый спин» — заберёшь стартовый приз.\n\n' +
      'После первого спина у тебя будет шанс усилить приз через подписку.',
    buttons: [
      [
        {
          text: '🎡 Первый спин',
          id: 'first_spin',
        },
      ],
    ],
  });
}

async function handleFirstSpin(ctx, chatId) {
  const session = getSession(chatId);

  if (session.stage !== 'idle') {
    await sendMessageToChat(ctx, chatId, {
      text:
        'Ты уже сделал первый спин 😉\n' +
        'Сейчас главное — забрать усиленный приз через подписку.',
      buttons: [
        [{ text: '✅ Я подписался', id: 'i_subscribed' }],
        [{ text: '🙅 Крутить без подписки', id: 'spin_without_sub' }],
      ],
    });
    return;
  }

  session.stage = 'first_spin_done';
  session.subscribed = false;

  const prize = selectRandomPrize(firstSpinPrizes);

  await sendMessageToChat(ctx, chatId, {
    text:
      `${prize.emoji} Поздравляю!\n\n` +
      `Тебе выпал приз: ${prize.title}\n\n` +
      'Хочешь выжать из этого ещё один шанс и забрать подарок покруче?\n\n' +
      `📲 Подпишись на канал: ${CHANNEL_URL}\n\n` +
      'Потом нажми «Я подписался» — открою второй спин.',
    buttons: [
      [{ text: '✅ Я подписался', id: 'i_subscribed' }],
      [{ text: '🙅 Крутить без подписки', id: 'spin_without_sub' }],
    ],
  });
}

async function handleSecondSpinWithoutSub(ctx, chatId) {
  const session = getSession(chatId);

  if (session.stage !== 'first_spin_done') {
    await sendMessageToChat(ctx, chatId, {
      text: 'Сначала сделай первый спин. Потом я дам тебе шанс усилить приз 😉',
      buttons: [[{ text: '🎡 Первый спин', id: 'first_spin' }]],
    });
    return;
  }

  session.stage = 'second_spin_done';
  session.subscribed = false;

  const prize = selectRandomPrize(secondSpinNoSubPrizes); // всегда prize2

  await sendMessageToChat(ctx, chatId, {
    text:
      `${prize.emoji} ${prize.title}\n\n` +
      'Чтобы открыть нормальные призы и отрывок из книги — подпишись на канал и напиши «Я подписался».\n\n' +
      `Канал: ${CHANNEL_URL}`,
    buttons: [
      [{ text: '✅ Я всё-таки подписался', id: 'i_subscribed' }],
    ],
  });
}

async function handleSecondSpinWithSub(ctx, chatId) {
  const session = getSession(chatId);

  session.stage = 'second_spin_done';
  session.subscribed = true;

  const prize = selectRandomPrize(secondSpinSubscribedPrizes);

  const text =
    '🎯 Поздравляю!\n' +
    `Тебе выпал приз — ${prize.title}\n\n` +
    '⚠️ В этих главах нет “магических стратегий”.\n' +
    'Здесь — понимание, с которого начинается выигрыш.\n' +
    'Прочитай внимательно — и ты начнёшь видеть закономерности,\n' +
    'которые казино прячет за словами “удача” и “везение”.\n\n' +
    '📎 Фрагмент книги здесь:\n' +
    `${BOOK_URL}\n\n` +
    '📗 В этом же посте можно забрать полную книгу.';

  await sendMessageToChat(ctx, chatId, {
    text,
    buttons: [[{ text: '💸 Получить книгу', id: 'buy_book' }]],
  });

  // Пример: сюда можно дополнительно отправить картинку-обложку книги.
  // Заменишь 'https://example.com/cover.jpg' на свой URL или file_id.
  // await sendPhotoToChat(ctx, chatId, {
  //   photo: 'https://example.com/cover.jpg',
  //   caption: 'Обложка книги',
  //   buttons: [[{ text: '💸 Получить книгу', id: 'buy_book' }]]
  // });
}

async function handleUserSubscribed(ctx, chatId) {
  const session = getSession(chatId);

  if (session.stage === 'book_paid') {
    await sendMessageToChat(ctx, chatId, {
      text: 'Ты уже забрал книгу и формулу, дальше работаем по расчётам 😉',
    });
    return;
  }

  session.subscribed = true;

  if (session.stage === 'idle') {
    await sendMessageToChat(ctx, chatId, {
      text: 'Отлично. Подписка есть — теперь крутим первый спин и забираем стартовый приз.',
      buttons: [[{ text: '🎡 Первый спин', id: 'first_spin' }]],
    });
    return;
  }

  if (
    session.stage === 'first_spin_done' ||
    session.stage === 'second_spin_done'
  ) {
    await handleSecondSpinWithSub(ctx, chatId);
    return;
  }
}

async function handleBuyBook(ctx, chatId) {
  const session = getSession(chatId);
  session.stage = 'book_paid';

  await sendMessageToChat(ctx, chatId, {
    text:
      'Поздравляю — книга твоя!\n' +
      'Ты только что сделал шаг от случайных ставок к расчёту.\n\n' +
      '📘 Книга здесь:\n' +
      `${BOOK_URL}\n\n` +
      '💬 Хочешь, я помогу применить формулу под твои данные?\n' +
      'Напиши слово «ФОРМУЛА», и я разберу твою ситуацию лично.',
    buttons: [[{ text: 'ФОРМУЛА', id: 'formula' }]],
  });

  // При желании можно здесь тоже кинуть обложку:
  // await sendPhotoToChat(ctx, chatId, {
  //   photo: 'https://example.com/cover.jpg',
  //   caption: 'Книга отправлена, смотри по ссылке выше 👆',
  //   buttons: [[{ text: 'ФОРМУЛА', id: 'formula' }]]
  // });
}

async function handleFormula(ctx, chatId) {
  const text =
    'Отлично. Значит, ты не просто читаешь — ты хочешь понять,\n' +
    'как применить расчёт под себя.\n\n' +
    'Я провожу разборы:\n' +
    '– где теряешь фокус,\n' +
    '– как управлять банком,\n' +
    '– и как построить систему ставок по вероятности.\n\n' +
    '15 минут в Telegram.\n' +
    'Заполни короткую заявку по кнопке ниже — я пришлю время для разбора.';

  await sendMessageToChat(ctx, chatId, {
    text,
    buttons: [[{ text: '📝 Записаться на разбор', id: 'form_url' }]],
  });

  await ctx.telegram.sendMessage(
    chatId,
    `Заполнить форму: ${FORM_URL}`
  );
}

// ====== МАРШРУТИЗАЦИЯ СООБЩЕНИЙ ======

// /start
bot.start(async (ctx) => {
  const chatId = String(ctx.chat.id);
  const session = getSession(chatId);
  session.stage = 'idle';
  session.subscribed = false;
  await sendStart(ctx, chatId);
});

// Любой текст
bot.on('text', async (ctx) => {
  const chatId = String(ctx.chat.id);
  const rawText = (ctx.message.text || '').trim();
  const text = rawText;
  const lower = text.toLowerCase();

  // Первый спин
  if (
    text === '/spin' ||
    text === '🎡 Крутить колесо!' ||
    text === '🎡 Первый спин' ||
    text === 'first_spin' ||
    text === 'spin'
  ) {
    await handleFirstSpin(ctx, chatId);
    return;
  }

  // "Я подписался"
  if (
    lower === 'я подписался' ||
    lower === 'я всё-таки подписался' ||
    text === '✅ Я подписался' ||
    text === '✅ Я всё-таки подписался' ||
    text === 'i_subscribed'
  ) {
    await handleUserSubscribed(ctx, chatId);
    return;
  }

  // Второй спин без подписки
  if (
    text === '🙅 Крутить без подписки' ||
    lower === 'крутить без подписки' ||
    text === 'spin_without_sub'
  ) {
    await handleSecondSpinWithoutSub(ctx, chatId);
    return;
  }

  // Покупка книги
  if (
    text === '💸 Получить книгу' ||
    lower === 'получить книгу' ||
    text === 'buy_book'
  ) {
    await handleBuyBook(ctx, chatId);
    return;
  }

  // Формула
  if (lower === 'формула' || text === 'formula') {
    await handleFormula(ctx, chatId);
    return;
  }

  // Фоллбек
  await sendMessageToChat(ctx, chatId, {
    text:
      'Используй кнопки ниже:\n' +
      '— /start чтобы начать заново\n' +
      '— «🎡 Первый спин», чтобы крутить.',
    buttons: [[{ text: '🎡 Первый спин', id: 'first_spin' }]],
  });
});

// Глобальный catch
bot.catch((err, ctx) => {
  console.error(`Bot error for update ${ctx.updateType}`, err);
});

// Запуск long polling
bot.launch().then(() => {
  console.log('Bot started with long polling');
});

// Корректное завершение
process.once('SIGINT', () => {
  bot.stop('SIGINT');
  process.exit(0);
});
process.once('SIGTERM', () => {
  bot.stop('SIGTERM');
  process.exit(0);
});
