import asyncio
import html
import json
import logging
import os
from pathlib import Path
from urllib.parse import quote

from aiohttp import web
from aiogram import Bot, Dispatcher, F
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.exceptions import TelegramAPIError
from aiogram.filters import Command, CommandStart
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    MenuButtonWebApp,
    Message,
    ReplyKeyboardMarkup,
    WebAppInfo,
)

import webapp_api
from reasons import REASONS
from storage import Storage

# ---------- настройки ----------
BOT_TOKEN = os.environ["BOT_TOKEN"]                     # токен берём из переменных окружения
ADMIN_ID = webapp_api.ADMIN_ID                          # переменная окружения ADMIN_ID
PARTNER_ID = webapp_api.PARTNER_ID                      # переменная окружения PARTNER_ID (Дима)
WEBAPP_URL = webapp_api.WEBAPP_URL                      # ссылка на мини-приложение (Vercel)
PORT = int(os.getenv("PORT", "10000"))                  # Render сам передаёт PORT
USERS_FILE = Path("users.json")                         # старый файл — переносим в хранилище
store = Storage(os.getenv("DATABASE_URL") or None)
MAX_MEDIA = 3        # максимум фото/видео в одном сообщении
MAX_ITEMS = 10       # максимум частей (текст + медиа) в одном сообщении
PAGE = 10            # причин на одной странице

SONGS = [
    ("angelik", "symbol"),
    ("lildrughill", "рингтон"),
    ("angelik", "Saint privilege"),
]

# ---------- кнопки меню ----------
BTN_SEND = "💌 Отправить сообщение"
BTN_REASONS = "💯 101 причина"
BTN_PLAYLIST = "🎶 Наш плейлист"
BTN_WRITE = "✉️ Написать пользователю"
BTN_APP = "🐾 Наше приложение"

USER_KB = ReplyKeyboardMarkup(
    keyboard=[[KeyboardButton(text=BTN_SEND)],
              [KeyboardButton(text=BTN_REASONS), KeyboardButton(text=BTN_PLAYLIST)]],
    resize_keyboard=True,
)
ADMIN_KB = ReplyKeyboardMarkup(
    keyboard=[[KeyboardButton(text=BTN_WRITE)],
              [KeyboardButton(text=BTN_REASONS), KeyboardButton(text=BTN_PLAYLIST)]],
    resize_keyboard=True,
)
# для двоих, у кого есть доступ к мини-приложению, добавляем ещё одну строку
APP_ROW = [KeyboardButton(text=BTN_APP)]
USER_APP_KB = ReplyKeyboardMarkup(keyboard=USER_KB.keyboard + [APP_ROW], resize_keyboard=True)
ADMIN_APP_KB = ReplyKeyboardMarkup(keyboard=ADMIN_KB.keyboard + [APP_ROW], resize_keyboard=True)

DRAFT_KB = InlineKeyboardMarkup(inline_keyboard=[[
    InlineKeyboardButton(text="📨 Отправить", callback_data="send"),
    InlineKeyboardButton(text="✖️ Отмена", callback_data="cancel"),
]])

dp = Dispatcher()
logging.basicConfig(level=logging.INFO)

# ---------- пользователи ----------
users: dict[str, str] = {}


async def load_users() -> None:
    users.clear()
    users.update(store.get("users", {}))
    if not users and USERS_FILE.exists():           # переносим старый users.json
        try:
            users.update(json.loads(USERS_FILE.read_text("utf-8")))
            await store.set("users", users)
        except Exception:
            pass


async def remember(u) -> None:
    if u.id == ADMIN_ID:
        return
    name = u.full_name + (f" (@{u.username})" if u.username else "")
    if users.get(str(u.id)) != name:
        users[str(u.id)] = name
        try:
            await store.set("users", users)
        except Exception as e:
            logging.warning("cannot save users: %s", e)


def has_app(uid: int) -> bool:
    return bool(WEBAPP_URL) and uid in webapp_api.ALLOWED


def kb_for(uid: int):
    if uid == ADMIN_ID:
        return ADMIN_APP_KB if has_app(uid) else ADMIN_KB
    return USER_APP_KB if has_app(uid) else USER_KB


def app_inline() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="✨ Открыть приложение", web_app=WebAppInfo(url=WEBAPP_URL))]])


# ---------- черновики сообщений ----------
# uid -> {"to": id получателя, "items": [message_id, ...], "media": кол-во фото/видео}
drafts: dict[int, dict] = {}


async def start_compose(bot: Bot, uid: int, to: int) -> None:
    drafts[uid] = {"to": to, "items": [], "media": 0}
    if uid == ADMIN_ID:
        who = html.escape(users.get(str(to), str(to)))
        text = (f"✍️ Пишешь для <b>{who}</b>\n\n"
                f"Отправь текст и/или до {MAX_MEDIA} фото или видео, "
                f"потом нажми «📨 Отправить».")
    else:
        text = ("💗 Напиши мне всё, что хочется\n\n"
                f"Можно текстом, а ещё можно скинуть до {MAX_MEDIA} фоток или видео ✨\n"
                "Когда всё будет готово — нажми «📨 Отправить», и я сразу получу 💌")
    await bot.send_message(uid, text, reply_markup=InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="✖️ Отмена", callback_data="cancel")]]))


def reply_button(cb_data: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="↩️ Ответить", callback_data=cb_data)]])


# ---------- /start ----------
@dp.message(CommandStart())
async def cmd_start(m: Message):
    await remember(m.from_user)
    drafts.pop(m.from_user.id, None)
    if m.from_user.id == ADMIN_ID:
        await m.answer("👑 Привет, админ! Здесь можно написать любому, кто заходил в бота.",
                       reply_markup=kb_for(m.from_user.id))
        if has_app(m.from_user.id):
            await m.answer("🐾 Наше мини-приложение:", reply_markup=app_inline())
        return
    await m.answer(
        "Привет, любимый 💗\n\n"
        "Этот бот — маленький подарок, который я сделала специально для тебя.\n\n"
        "💌 Здесь можно написать мне что угодно — текстом или до 3 фото и видео, а я отвечу.\n"
        "💯 Тут спрятана 101 причина, почему я тебя люблю.\n"
        "🎶 И наши песни.\n\n"
        "Жми на кнопки внизу 👇",
        reply_markup=kb_for(m.from_user.id),
    )
    if has_app(m.from_user.id):
        await m.answer("🐾 А ещё у нас есть своё маленькое приложение: таймер до дембеля, "
                       "наш питомец и важные мелочи друг о друге 💞", reply_markup=app_inline())


# ---------- мини-приложение ----------
@dp.message(F.text == BTN_APP)
@dp.message(Command("app"))
async def menu_app(m: Message):
    if not has_app(m.from_user.id):
        await m.answer("Приложение пока недоступно 🙈")
        return
    await m.answer("🐾 Открывай 👇", reply_markup=app_inline())


@dp.message(Command("myid"))
async def cmd_myid(m: Message):
    await m.answer(f"Твой Telegram ID: <code>{m.from_user.id}</code>")


# ---------- меню ----------
@dp.message(F.text == BTN_SEND)
async def menu_send(m: Message):
    await remember(m.from_user)
    if m.from_user.id == ADMIN_ID:
        return await menu_write(m)
    await start_compose(m.bot, m.from_user.id, ADMIN_ID)


@dp.message(F.text == BTN_WRITE)
async def menu_write(m: Message):
    if m.from_user.id != ADMIN_ID:
        return
    if not users:
        await m.answer("Пока никто не заходил в бота 🤷‍♀️")
        return
    rows = [[InlineKeyboardButton(text=name[:60], callback_data=f"to:{uid}")]
            for uid, name in users.items()]
    await m.answer("Кому написать?", reply_markup=InlineKeyboardMarkup(inline_keyboard=rows))


@dp.callback_query(F.data.startswith("to:"))
async def cb_to(c: CallbackQuery):
    if c.from_user.id != ADMIN_ID:
        return await c.answer()
    await c.answer()
    await start_compose(c.bot, ADMIN_ID, int(c.data.split(":", 1)[1]))


@dp.callback_query(F.data.startswith("reply:"))
async def cb_reply(c: CallbackQuery):
    target = c.data.split(":", 1)[1]
    await c.answer()
    if target == "admin":
        await start_compose(c.bot, c.from_user.id, ADMIN_ID)
    elif c.from_user.id == ADMIN_ID:
        await start_compose(c.bot, ADMIN_ID, int(target))


@dp.callback_query(F.data == "cancel")
async def cb_cancel(c: CallbackQuery):
    drafts.pop(c.from_user.id, None)
    await c.answer("Отменено")
    try:
        await c.message.edit_text("✖️ Отменено")
    except TelegramAPIError:
        pass


@dp.callback_query(F.data == "send")
async def cb_send(c: CallbackQuery):
    uid = c.from_user.id
    d = drafts.get(uid)
    if not d or not d["items"]:
        return await c.answer("Сначала напиши что-нибудь 🙂", show_alert=True)
    drafts.pop(uid, None)
    to = d["to"]

    if uid == ADMIN_ID:
        header = "💌 Тебе новое сообщение"
        markup = reply_button("reply:admin")
    else:
        name = html.escape(users.get(str(uid), c.from_user.full_name))
        header = f"💌 Новое сообщение от <b>{name}</b>"
        markup = reply_button(f"reply:{uid}")

    try:
        await c.bot.send_message(to, header)
        last = len(d["items"]) - 1
        for i, mid in enumerate(d["items"]):
            await c.bot.copy_message(to, uid, mid, reply_markup=markup if i == last else None)
    except TelegramAPIError as e:
        logging.warning("send failed: %s", e)
        await c.answer("Не получилось доставить 😔 Возможно, бот заблокирован.", show_alert=True)
        return

    await c.answer("Отправлено 💖")
    try:
        await c.message.edit_text("💖 Отправлено!")
    except TelegramAPIError:
        pass


# ---------- 101 причина ----------
def reasons_page(p: int):
    pages = (len(REASONS) + PAGE - 1) // PAGE
    p = max(0, min(p, pages - 1))
    chunk = REASONS[p * PAGE:(p + 1) * PAGE]
    lines = [f"<b>{p * PAGE + i + 1}.</b> {r}" for i, r in enumerate(chunk)]
    text = (f"💯 <b>101 причина, почему я тебя люблю</b>\n"
            f"<i>страница {p + 1} из {pages}</i>\n\n" + "\n\n".join(lines))
    if p == pages - 1:
        text += "\n\n❤️ <i>И ещё миллион причин, которые просто не поместились в этого бота.</i>"
    nav = []
    if p > 0:
        nav.append(InlineKeyboardButton(text="◀️", callback_data=f"r:{p - 1}"))
    nav.append(InlineKeyboardButton(text=f"{p + 1}/{pages}", callback_data="noop"))
    if p < pages - 1:
        nav.append(InlineKeyboardButton(text="▶️", callback_data=f"r:{p + 1}"))
    return text, InlineKeyboardMarkup(inline_keyboard=[nav])


@dp.message(F.text == BTN_REASONS)
async def menu_reasons(m: Message):
    text, kb = reasons_page(0)
    await m.answer(text, reply_markup=kb)


@dp.callback_query(F.data.startswith("r:"))
async def cb_reasons(c: CallbackQuery):
    text, kb = reasons_page(int(c.data.split(":", 1)[1]))
    await c.answer()
    try:
        await c.message.edit_text(text, reply_markup=kb)
    except TelegramAPIError:
        pass


@dp.callback_query(F.data == "noop")
async def cb_noop(c: CallbackQuery):
    await c.answer("💗")


# ---------- плейлист ----------
@dp.message(F.text == BTN_PLAYLIST)
async def menu_playlist(m: Message):
    lines = [f"{i}. <b>{html.escape(a)}</b> — {html.escape(t)}" for i, (a, t) in enumerate(SONGS, 1)]
    text = ("🎶 <b>Наш плейлист</b>\n\n"
            "Песни, которые всегда будут про нас 💞\n\n" + "\n".join(lines) +
            "\n\n<i>Включай и вспоминай меня 🎧</i>")
    rows = []
    for a, t in SONGS:
        q = quote(f"{a} {t}")
        rows.append([
            InlineKeyboardButton(text=f"🎧 {t}", url=f"https://music.yandex.ru/search?text={q}"),
            InlineKeyboardButton(text="▶️ YouTube", url=f"https://www.youtube.com/results?search_query={q}"),
        ])
    await m.answer(text, reply_markup=InlineKeyboardMarkup(inline_keyboard=rows))


# ---------- всё остальное: наполнение черновика ----------
@dp.message()
async def any_message(m: Message):
    uid = m.from_user.id
    await remember(m.from_user)
    d = drafts.get(uid)
    if d is None:
        if uid == ADMIN_ID:
            await m.answer("Выбери действие в меню 👇", reply_markup=kb_for(uid))
            return
        drafts[uid] = d = {"to": ADMIN_ID, "items": [], "media": 0}

    is_media = bool(m.photo or m.video)
    if not (m.text or is_media):
        await m.answer("Пока я умею передавать только текст, фото и видео 🙈")
        return
    if is_media and d["media"] >= MAX_MEDIA:
        await m.answer(f"Можно не больше {MAX_MEDIA} фото или видео за раз 💫\n"
                       "Нажми «📨 Отправить», а остальное скинешь следующим сообщением.",
                       reply_markup=DRAFT_KB)
        return
    if len(d["items"]) >= MAX_ITEMS:
        await m.answer("Сообщение уже большое 🙂 Нажми «📨 Отправить».", reply_markup=DRAFT_KB)
        return

    d["items"].append(m.message_id)
    if is_media:
        d["media"] += 1
    await m.answer(f"✅ Добавлено (фото/видео: {d['media']}/{MAX_MEDIA})\n"
                   "Можешь добавить ещё или отправить 💌",
                   reply_markup=DRAFT_KB)


# ---------- веб-заглушка для Render + запуск ----------
async def health(_request):
    return web.Response(text="ok, bot is alive 💗")


async def setup_menu_buttons(bot: Bot) -> None:
    """Кнопка «Приложение» слева от поля ввода — только у нас двоих."""
    if not WEBAPP_URL:
        return
    for uid in webapp_api.ALLOWED:
        try:
            await bot.set_chat_menu_button(
                chat_id=uid,
                menu_button=MenuButtonWebApp(text="Наше 💞", web_app=WebAppInfo(url=WEBAPP_URL)))
        except TelegramAPIError as e:
            logging.info("menu button for %s: %s", uid, e)


async def main():
    await store.init()
    await load_users()
    bot = Bot(BOT_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))

    app = web.Application()
    app.router.add_get("/", health)
    webapp_api.setup(app, bot, store)
    runner = web.AppRunner(app)
    await runner.setup()
    await web.TCPSite(runner, "0.0.0.0", PORT).start()
    logging.info("web server on port %s", PORT)

    reminders = asyncio.create_task(webapp_api.reminders_loop(app))
    await setup_menu_buttons(bot)
    await bot.delete_webhook(drop_pending_updates=True)
    try:
        await dp.start_polling(bot)
    finally:
        reminders.cancel()
        await store.close()


if __name__ == "__main__":
    asyncio.run(main())
