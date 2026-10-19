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
from aiogram.filters import CommandStart
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    Message,
    ReplyKeyboardMarkup,
)

from reasons import REASONS

# ---------- настройки ----------
BOT_TOKEN = os.environ["BOT_TOKEN"]                     # токен берём из переменных окружения
ADMIN_ID = int(os.getenv("ADMIN_ID", "1482422281"))
PORT = int(os.getenv("PORT", "10000"))                  # Render сам передаёт PORT
USERS_FILE = Path("users.json")
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

DRAFT_KB = InlineKeyboardMarkup(inline_keyboard=[[
    InlineKeyboardButton(text="📨 Отправить", callback_data="send"),
    InlineKeyboardButton(text="✖️ Отмена", callback_data="cancel"),
]])

dp = Dispatcher()
logging.basicConfig(level=logging.INFO)

# ---------- пользователи ----------
def load_users() -> dict:
    try:
        return json.loads(USERS_FILE.read_text("utf-8"))
    except Exception:
        return {}


users: dict[str, str] = load_users()


def remember(u) -> None:
    if u.id == ADMIN_ID:
        return
    name = u.full_name + (f" (@{u.username})" if u.username else "")
    if users.get(str(u.id)) != name:
        users[str(u.id)] = name
        try:
            USERS_FILE.write_text(json.dumps(users, ensure_ascii=False, indent=1), "utf-8")
        except Exception:
            pass


def kb_for(uid: int):
    return ADMIN_KB if uid == ADMIN_ID else USER_KB


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
    remember(m.from_user)
    drafts.pop(m.from_user.id, None)
    if m.from_user.id == ADMIN_ID:
        await m.answer("👑 Привет, админ! Здесь можно написать любому, кто заходил в бота.",
                       reply_markup=ADMIN_KB)
        return
    await m.answer(
        "Привет, любимый 💗\n\n"
        "Этот бот — маленький подарок, который я сделала специально для тебя.\n\n"
        "💌 Здесь можно написать мне что угодно — текстом или до 3 фото и видео, а я отвечу.\n"
        "💯 Тут спрятана 101 причина, почему я тебя люблю.\n"
        "🎶 И наши песни.\n\n"
        "Жми на кнопки внизу 👇",
        reply_markup=USER_KB,
    )


# ---------- меню ----------
@dp.message(F.text == BTN_SEND)
async def menu_send(m: Message):
    remember(m.from_user)
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
    remember(m.from_user)
    d = drafts.get(uid)
    if d is None:
        if uid == ADMIN_ID:
            await m.answer("Выбери действие в меню 👇", reply_markup=ADMIN_KB)
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


async def main():
    app = web.Application()
    app.router.add_get("/", health)
    runner = web.AppRunner(app)
    await runner.setup()
    await web.TCPSite(runner, "0.0.0.0", PORT).start()
    logging.info("web server on port %s", PORT)

    bot = Bot(BOT_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
