# -*- coding: utf-8 -*-
"""AI-ассистент MedPrice (двуязычный RU/KZ).

Движок на наших реальных данных (работает без интернета и ключей).
Понимает: цену услуги, город, симптом->анализы, сборку чек-апа.
Опционально усиливается бесплатным LLM (Gemini/Groq), если задан ключ.
"""
import os
import re
import json
import statistics
import urllib.request
from .normalize import match

CITIES = ['Алматы', 'Астана', 'Шымкент', 'Караганда', 'Актобе', 'Павлодар']
_CITY_HINTS = {
    'алмат': 'Алматы', 'астан': 'Астана', 'столиц': 'Астана', 'нур-султан': 'Астана',
    'шымкент': 'Шымкент', 'караганд': 'Караганда', 'актоб': 'Актобе', 'павлодар': 'Павлодар',
}

# Симптом -> (тема RU, тема KZ, набор анализов). Ключевые слова RU + KZ.
SYMPTOM_BUNDLES = [
    (r'щитовид|тиреоид|ттг|қалқанша', ('щитовидной железы', 'қалқанша безді'), ['тиреотропный гормон', 'Т4 свободный', 'УЗИ щитовидной железы', 'прием эндокринолога']),
    (r'сердц|кардио|давлен|стенокард|аритм|жүрек', ('сердца', 'жүректі'), ['прием кардиолога', 'ЭКГ', 'эхокардиография', 'холестерин']),
    (r'беремен|зачат|жүкті', ('беременности', 'жүктілікті'), ['ведение беременности', 'УЗИ плода', 'общий анализ крови', 'прием акушер-гинеколога']),
    (r'сахар|диабет|глюкоз|қант', ('диабета и сахара', 'диабет пен қантты'), ['глюкоза', 'гликозилированный гемоглобин', 'прием эндокринолога']),
    (r'горло|простуд|кашель|орви|температур|грипп|насморк|тамақ|жөтел|тұмау|суық', ('простуды', 'тұмауды'), ['общий анализ крови', 'прием терапевта']),
    (r'живот|желуд|гастрит|жкт|изжог|кишечник|асқазан|ішек', ('ЖКТ', 'ас қорыту жүйесін'), ['прием гастроэнтеролога', 'УЗИ брюшной полости', 'общий анализ крови']),
    (r'устал|слабост|анеми|железо|шаршау|темір', ('усталости и анемии', 'шаршау мен анемияны'), ['общий анализ крови', 'ферритин', 'глюкоза']),
    (r'почк|мочеис|цистит|уролог|бүйрек|зәр', ('почек и мочеполовой системы', 'бүйрек пен зәр шығару жүйесін'), ['общий анализ мочи', 'УЗИ почек', 'прием уролога']),
    (r'печен|желч|гепат|бауыр', ('печени', 'бауырды'), ['биохимический анализ крови', 'УЗИ брюшной полости']),
    (r'аллерг|сыпь|зуд|бөртпе', ('аллергии', 'аллергияны'), ['прием аллерголога', 'общий анализ крови']),
    (r'голов|мигрен|невролог|памят|бас ауыр', ('неврологии', 'неврологияны'), ['прием невролога', 'МРТ']),
    (r'чек-?ап|обследован|профилактик|провер|диспансер|общее здоров|тексеру', ('общего чек-апа', 'жалпы чек-апты'), ['общий анализ крови', 'общий анализ мочи', 'глюкоза', 'прием терапевта']),
]

_GREET = re.compile(r'\b(привет|здравств|добрый|хай|hello|hi|салам|сәлем)\b', re.IGNORECASE)
_HELP = re.compile(r'\b(помощ|что умеешь|как польз|help|команд|көмек|не істей)\b', re.IGNORECASE)
_CHECKUP_MARK = re.compile(r'провер|обследов|чек-?ап|диспансер|симптом|болит|беспоко|что (сдать|нужно)|тексер|ауыр', re.IGNORECASE)
_FILLER = re.compile(
    r'\b(где|сколько|стоит|стоимость|цена|цены|сдать|сделать|пройти|можно|'
    r'самый|самое|самая|дешевле|дешевый|дешево|недорого|найти|найди|покажи|хочу|мне|нужно|'
    r'нужен|надо|это|пожалуйста|подскажи|қай|жерде|қанша|тұрады|баға|арзан|тапсыр)\b', re.IGNORECASE)


def detect_city(msg):
    low = msg.lower()
    for k, v in _CITY_HINTS.items():
        if k in low:
            return v
    return None


def _clean_query(msg):
    low = msg.lower()
    for k in _CITY_HINTS:
        low = re.sub(r'\b' + k + r'\w*', ' ', low)
    low = _FILLER.sub(' ', low)
    low = re.sub(r'[?!.,;:]', ' ', low)
    low = re.sub(r'\b(в|во|на|по|и|с|у|о|к|за|из|для)\b', ' ', low)
    low = re.sub(r'\b\w\b', ' ', low)
    return re.sub(r'\s+', ' ', low).strip()


def resolve_service(conn, idx, q):
    m = match(q, None, idx)
    if m['service_id'] and conn.execute(
            "SELECT 1 FROM offers WHERE service_id=? LIMIT 1", (m['service_id'],)).fetchone():
        return m['service_id']
    like = f"%{q}%"
    r = conn.execute("""SELECT s.id FROM services s JOIN offers o ON o.service_id=s.id
        WHERE s.name LIKE ? OR s.synonyms LIKE ? GROUP BY s.id
        ORDER BY COUNT(DISTINCT o.clinic_id) DESC LIMIT 1""", (like, like)).fetchone()
    return r['id'] if r else None


def _offers(conn, sid, city):
    params = [sid]
    wcity = ''
    if city:
        wcity = ' AND cl.city=?'; params.append(city)
    return conn.execute(f"""
        SELECT o.price_kzt, o.service_id, s.name, cl.id clinic_id, cl.name clinic, cl.city
        FROM offers o JOIN clinics cl ON cl.id=o.clinic_id JOIN services s ON s.id=o.service_id
        WHERE o.service_id=?{wcity} ORDER BY o.price_kzt""", params).fetchall()


def _fmt(n):
    return f"{round(n):,}".replace(',', ' ') + ' ₸'


def _price_answer(conn, sid, city, lang='ru'):
    asked = city
    offers = _offers(conn, sid, city)
    note = ''
    if not offers and city:
        offers = _offers(conn, sid, None)
        note = (f"В г. {asked} эту услугу не нашёл, показываю по всем городам. " if lang != 'kk'
                else f"{asked} қаласынан бұл қызмет табылмады, барлық қала бойынша көрсетемін. ")
        city = None
    if not offers:
        return None
    prices = [o['price_kzt'] for o in offers]
    med = statistics.median(prices)
    cheap = offers[0]
    name = cheap['name']
    pct = round((med - cheap['price_kzt']) / med * 100) if med else 0
    save = prices[-1] - prices[0]
    if lang == 'kk':
        where = f" {city} қ." if city else ''
        reply = f"{note}«{name}»{where}: {len(offers)} клиника табылды. Ең арзаны — {cheap['clinic']} ({cheap['city']}) — {_fmt(cheap['price_kzt'])}"
        if pct > 0:
            reply += f", бұл нарық медианасынан {pct}% төмен ({_fmt(med)})"
        reply += '.'
        if save > 0 and len(offers) > 1:
            reply += f" Баға айырмасы — {_fmt(save)} дейін, үнемдеуге болады."
        sugg = ['Чек-ап жинау', 'Картадан көрсету', 'Барлық клиниканы салыстыру']
    else:
        where = f" в г. {city}" if city else ''
        reply = (f"{note}«{name}»{where}: нашёл {len(offers)} "
                 f"{'клинику' if len(offers) == 1 else 'клиник'}. "
                 f"Дешевле всего — {cheap['clinic']} ({cheap['city']}) за {_fmt(cheap['price_kzt'])}")
        if pct > 0:
            reply += f", это на {pct}% ниже медианы рынка ({_fmt(med)})"
        reply += '.'
        if save > 0 and len(offers) > 1:
            reply += f" Разброс цен — до {_fmt(save)}, есть на чём сэкономить."
        sugg = ['Собрать чек-ап', 'Показать на карте', 'Сравнить все клиники']
    return dict(
        kind='price', reply=reply, service_id=sid, service_name=name,
        stats=dict(min=prices[0], max=prices[-1], median=med, count=len(offers)),
        offers=[dict(clinic=o['clinic'], city=o['city'], clinic_id=o['clinic_id'],
                     price_kzt=o['price_kzt']) for o in offers[:4]],
        suggestions=sugg)


def _checkup_answer(conn, idx, topic, queries, city, lang='ru'):
    items = []
    for q in queries:
        sid = resolve_service(conn, idx, q)
        if sid:
            offs = _offers(conn, sid, city) or _offers(conn, sid, None)
            if offs:
                items.append(dict(service_id=sid, name=offs[0]['name'], min=offs[0]['price_kzt']))
    if not items:
        return None
    split_total = sum(i['min'] for i in items)
    listing = ', '.join(i['name'] for i in items)
    top = topic[1] if lang == 'kk' else topic[0]
    if lang == 'kk':
        top = top[:1].upper() + top[1:]
        reply = (f"{top} тексеру үшін әдетте мынаны тапсырады: {listing}. Себет жинадым — "
                 f"толық өту ең арзаны {_fmt(split_total)} (клиникалар бойынша оңтайлы бөлу). "
                 f"Бөлу мен үнемдеуді көру үшін «Медсебетті ашу» басыңыз.")
        sugg = ['Медсебетті ашу', 'Тек Астанада', 'Тек Алматыда']
    else:
        reply = (f"Для проверки {top} обычно сдают: {listing}. Я собрал корзину — дешевле всего "
                 f"пройти за {_fmt(split_total)} (оптимальная раскладка по клиникам). "
                 f"Нажмите «Открыть Медкорзину», чтобы увидеть раскладку и экономию.")
        sugg = ['Открыть Медкорзину', 'Только в Астане', 'Только в Алматы']
    return dict(kind='checkup', reply=reply, topic=top,
                basket=[dict(service_id=i['service_id'], name=i['name']) for i in items],
                items=items, split_total=split_total, suggestions=sugg)


def answer(conn, idx, message, city_pref=None, lang='ru'):
    msg = (message or '').strip()
    if not msg:
        return _help(lang)
    city = detect_city(msg) or city_pref

    if _GREET.search(msg) and len(msg) < 40:
        if lang == 'kk':
            return dict(kind='greeting', reply=(
                "Сәлеметсіз бе! Мен MedPrice AI-көмекшісімін. «Қандағы қантты қай жерде арзан тапсыруға "
                "болады?» деп сұраңыз немесе симптомды атаңыз — анализ таңдап, тиімдісін табам."),
                suggestions=['Қан жалпы анализі қай жерде арзан?', 'Қалқанша безді тексеру', 'Жүрекке чек-ап'])
        return dict(kind='greeting', reply=(
            "Здравствуйте! Я AI-ассистент MedPrice. Спросите «где дешевле сдать кровь на сахар?» или "
            "назовите симптом — подберу анализы и найду, где пройти выгоднее."),
            suggestions=['Где дешевле общий анализ крови?', 'Проверить щитовидку', 'Чек-ап для сердца'])
    if _HELP.search(msg):
        return _help(lang)

    explicit_checkup = bool(_CHECKUP_MARK.search(msg))

    def try_bundle():
        for rx, topic, queries in SYMPTOM_BUNDLES:
            if re.search(rx, msg, re.IGNORECASE):
                return _checkup_answer(conn, idx, topic, queries, city, lang)
        return None

    if explicit_checkup:
        res = try_bundle()
        if res:
            return res
        res = _checkup_answer(conn, idx, ('общего здоровья', 'жалпы денсаулықты'),
                              ['общий анализ крови', 'общий анализ мочи', 'глюкоза', 'прием терапевта'], city, lang)
        if res:
            return res

    q = _clean_query(msg)
    if q:
        sid = resolve_service(conn, idx, q)
        if sid:
            res = _price_answer(conn, sid, city, lang)
            if res:
                return res

    res = try_bundle()
    if res:
        return res

    if lang == 'kk':
        return dict(kind='fallback', reply=(
            "Мұндай қызмет базада табылмады. Нақтырақ жазып көріңіз: «қан жалпы анализі», "
            "«бүйрек УДЗ», «кардиолог қабылдауы». Немесе симптомды атаңыз — нені тапсыру керегін айтам."),
            suggestions=['Қан жалпы анализі', 'УДЗ', 'Қалқанша безді тексеру'])
    return dict(kind='fallback', reply=(
        "Не нашёл такую услугу в базе. Попробуйте конкретнее: «общий анализ крови», "
        "«УЗИ почек», «приём кардиолога». Или назовите симптом — подскажу, что сдать."),
        suggestions=['Общий анализ крови', 'УЗИ', 'Проверить щитовидку'])


def _help(lang='ru'):
    if lang == 'kk':
        return dict(kind='help', reply=(
            "Мен мынаны істей аламын:\n"
            "• қызмет қай жерде арзан екенін табу — «Астанада қантты қай жерде арзан тапсыруға болады»\n"
            "• симптом бойынша анализ таңдау — «тамақ ауырады», «қалқанша безді тексеру»\n"
            "• чек-ап себетін жинап, үнемдеуді есептеу.\n"
            "Сұрағыңызды өз сөзіңізбен жазыңыз."),
            suggestions=['УДЗ қай жерде арзан?', 'Жүрекке чек-ап', 'Қалқанша безді тексеру'])
    return dict(kind='help', reply=(
        "Я умею:\n"
        "• найти, где услуга дешевле — «где дешевле сдать сахар в Астане»\n"
        "• подобрать анализы по симптому — «болит горло», «проверить щитовидку»\n"
        "• собрать чек-ап-корзину и посчитать экономию.\n"
        "Просто напишите вопрос своими словами."),
        suggestions=['Где дешевле УЗИ?', 'Чек-ап для сердца', 'Проверить щитовидку'])


# --- Опциональный бесплатный LLM (Gemini / Groq) ----------------------------
def llm_rephrase(message, ctx, lang='ru'):
    lang_line = ("Жауапты ҚАЗАҚ тілінде бер." if lang == 'kk' else "Отвечай на РУССКОМ языке.")
    sys = ("Ты дружелюбный ассистент сервиса MedPrice.kz (сравнение цен на медуслуги в Казахстане). "
           f"{lang_line} Отвечай кратко (2-4 предложения) ТОЛЬКО по данным ниже. "
           "Не выдумывай цены и клиники. Не давай медицинских советов и диагнозов — только помощь "
           "с ценами и какие анализы обычно сдают. Цены в тенге.\n\n"
           f"Вопрос пользователя: {message}\nДанные: {json.dumps(ctx, ensure_ascii=False)}")
    gem = os.environ.get('GEMINI_API_KEY')
    groq = os.environ.get('GROQ_API_KEY')
    try:
        if gem:
            model = os.environ.get('GEMINI_MODEL', 'gemini-2.0-flash')
            url = (f"https://generativelanguage.googleapis.com/v1beta/models/"
                   f"{model}:generateContent?key={gem}")
            body = {"contents": [{"parts": [{"text": sys}]}],
                    "generationConfig": {"temperature": 0.4, "maxOutputTokens": 220}}
            data = _post_json(url, body)
            return data['candidates'][0]['content']['parts'][0]['text'].strip()
        if groq:
            model = os.environ.get('GROQ_MODEL', 'llama-3.3-70b-versatile')
            url = "https://api.groq.com/openai/v1/chat/completions"
            body = {"model": model, "temperature": 0.4, "max_tokens": 220,
                    "messages": [{"role": "user", "content": sys}]}
            data = _post_json(url, body, headers={"Authorization": f"Bearer {groq}"})
            return data['choices'][0]['message']['content'].strip()
    except Exception:
        return None
    return None


def _post_json(url, body, headers=None):
    req = urllib.request.Request(url, data=json.dumps(body).encode('utf-8'),
                                 headers={'Content-Type': 'application/json', **(headers or {})})
    with urllib.request.urlopen(req, timeout=8) as r:
        return json.loads(r.read().decode('utf-8'))
