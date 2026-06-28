# -*- coding: utf-8 -*-
"""Общие утилиты очистки и нормализации — ядро качества данных."""
import re

# --- OCR: починка цифр в сканах ---------------------------------------------
# В числовом контексте сканер путает буквы и цифры.
OCR_DIGIT = {
    'О': '0', 'о': '0', 'O': '0', 'o': '0', 'Q': '0',
    'С': '0', 'с': '0',          # в этих прайсах С на конце числа = 0 (10 80С -> 10800)
    'З': '3', 'з': '3',
    'б': '6', 'Б': '6',
    'l': '1', 'I': '1', '|': '1', 'i': '1', '!': '1',
    'Ч': '4',
}
CURRENCY_NOISE = re.compile(r'(тенге|тг\.?|kzt|₸|руб|\bр\b)', re.IGNORECASE)


def clean_price(s):
    """Грязная строка цены -> float КЗТ или None.

    Чинит OCR-цифры, убирает разделители тысяч и валютный шум.
    Берём ПЕРВОЕ валидное число (для строк с несколькими тарифами цену РК
    парсеры передают отдельной колонкой; здесь — общий случай)."""
    if s is None:
        return None
    s = str(s)
    s = CURRENCY_NOISE.sub(' ', s)
    # вытащить токены, похожие на число (цифры + пробелы-разделители + OCR-буквы)
    # сначала схлопнем "16 600" -> "16600", учитывая OCR-замены внутри числа
    # ищем последовательности из цифр/пробелов/known-OCR-букв длиной от 2
    best = None
    for m in re.finditer(r'[\dОоOoQСсЗзбБlI|i!Ч](?:[\dОоOoQСсЗзбБlI|i!Ч  ]{0,12})', s):
        tok = m.group(0)
        digits = ''.join(OCR_DIGIT.get(ch, ch) for ch in tok if ch not in '  ')
        if not digits.isdigit():
            continue
        val = int(digits)
        # отбрасываем мусорные коды/годы/нумерацию строк
        if 50 <= val <= 5_000_000:
            # берём максимальное правдоподобное число в строке (цена обычно крупнее № п/п)
            if best is None or val > best:
                best = val
    return float(best) if best is not None else None


def clean_price_first(s):
    """Как clean_price, но берёт ПЕРВОЕ валидное число (для колонок-цен РК)."""
    if s is None:
        return None
    s = CURRENCY_NOISE.sub(' ', str(s))
    for m in re.finditer(r'[\dОоOoQСсЗзбБlI|i!Ч][\dОоOoQСсЗзбБlI|i!Ч  ]{0,12}', s):
        digits = ''.join(OCR_DIGIT.get(ch, ch) for ch in m.group(0) if ch not in '  ')
        if digits.isdigit():
            val = int(digits)
            if 50 <= val <= 5_000_000:
                return float(val)
    return None


# --- Нормализация кода тарификатора -----------------------------------------
# Cyrillic-гомоглифы -> Latin/цифры, чтобы «ВОЗ.335.002» (OCR) == «B03.335.002».
CYR2LAT = {'А': 'A', 'В': 'B', 'С': 'C', 'Е': 'E', 'Н': 'H', 'К': 'K',
           'М': 'M', 'Р': 'P', 'Т': 'T', 'Х': 'X', 'О': '0', 'З': '3'}
_TARIF_RE = re.compile(r'[A-ZА-Я][0-9OОЗз]{2}\.[0-9OОЗз]{3}\.[0-9OОЗз]{1,3}')


def norm_tarif(s):
    """Извлечь и нормализовать код тарификатора (или None)."""
    if not s:
        return None
    s = str(s).strip()
    m = _TARIF_RE.search(s)
    if not m:
        return None
    code = m.group(0)
    out = []
    for i, ch in enumerate(code):
        if ch == '.':
            out.append('.')
        elif i == 0:               # первая буква -> Latin
            out.append(CYR2LAT.get(ch, ch).upper() if not ch.isdigit() else ch)
        else:                      # остальное -> цифры
            out.append(CYR2LAT.get(ch, ch))
    code = ''.join(out)
    # финальная валидация формата X NN . NNN . N..
    if re.match(r'^[A-Z]\d{2}\.\d{3}\.\d{1,3}$', code):
        return code
    return None


# --- Разделение строки на имя и тарифные цены --------------------------------
def _num_token(tok):
    """Если токен — число (с починкой OCR), вернуть строку цифр, иначе None."""
    rep = ''.join(OCR_DIGIT.get(ch, ch) for ch in tok)
    return rep if (rep.isdigit() and len(rep) >= 1) else None


_CODE_RE = re.compile(r'^([A-Za-zА-Яа-я]{0,4}\d+(?:[.\-/]\d+)*[A-Za-zА-Яа-я]?)$')


def extract_code(name_tokens):
    """Вытащить ведущий код услуги (U1.6, AL4.7, U1.1) из токенов имени."""
    if name_tokens and _CODE_RE.match(name_tokens[0]) and any(ch.isdigit() for ch in name_tokens[0]):
        return name_tokens[0], name_tokens[1:]
    return None, name_tokens


def split_name_prices(line, drop_leading_int=True):
    """Разбить строку прайса на (название, [цены тарифов]).

    Цены — хвостовая группа числовых токенов; склеиваем разделители тысяч
    («16 600» -> 16600), чиним OCR. Первая цена группы = тариф РК (граждане
    указаны первой колонкой). Возвращает (name, prices, code)."""
    toks = str(line).split()
    if not toks:
        return '', [], None
    i = len(toks)
    while i > 0 and _num_token(toks[i - 1]) is not None:
        i -= 1
    name_toks = toks[:i]
    num_toks = [_num_token(t) for t in toks[i:]]

    # склейка тысяч: первая группа 1-3 цифры, далее ровно по 3 цифры
    prices, cur = [], ''
    for d in num_toks:
        if cur == '':
            cur = d
        elif len(d) == 3:
            cur += d
        else:
            prices.append(int(cur)); cur = d
    if cur:
        prices.append(int(cur))
    prices = [p for p in prices if 50 <= p <= 5_000_000]

    # снять ведущий № п/п
    if drop_leading_int and name_toks and name_toks[0].isdigit() and len(name_toks[0]) <= 4:
        name_toks = name_toks[1:]
    code, name_toks = extract_code(name_toks)
    return ' '.join(name_toks).strip(' .—-'), prices, code


# --- Нормализация текста для матчинга ----------------------------------------
_PUNCT = re.compile(r'[^\w\sа-яёa-z0-9]', re.IGNORECASE)
_WS = re.compile(r'\s+')
STOP = {'и', 'в', 'на', 'с', 'по', 'для', 'от', 'до', 'или', 'без', 'шт', 'услуга',
        'посещение', 'исследование', 'анализ', 'ед', 'изм'}

# Доменные эквиваленты: разные слова -> один канон (бустит точные совпадения)
CANON = {
    'консультация': 'прием', 'консультативный': 'прием', 'консультацию': 'прием',
    'консультации': 'прием', 'консультативная': 'прием', 'консультативной': 'прием',
    'консультативного': 'прием', 'приём': 'прием',
}
_CANON_RE = re.compile(r'\b(' + '|'.join(map(re.escape, CANON)) + r')\b')


def norm_text(s):
    """Канонизировать название услуги для сравнения."""
    if not s:
        return ''
    s = str(s).lower().replace('ё', 'е').replace(' ', ' ')
    s = _PUNCT.sub(' ', s)
    s = _CANON_RE.sub(lambda m: CANON[m.group(1)], s)
    s = _WS.sub(' ', s).strip()
    return s


def tokens(s):
    return [t for t in norm_text(s).split() if t not in STOP and len(t) > 1]


# --- Эвристики разделов и категорий ------------------------------------------
SECTION_RE = re.compile(r'^(раздел|блок|глава|отделение)\b|^[А-ЯA-Z][А-ЯA-Z \-\.\d]{6,}$')


def looks_like_section(name, has_price):
    """Строка — заголовок раздела (нет цены, капс/ключевое слово)?"""
    if has_price:
        return False
    n = (name or '').strip()
    if len(n) < 3:
        return False
    if re.match(r'^(раздел|блок|глава|отделение|приём|прием)\b', n, re.IGNORECASE) and not has_price:
        return True
    letters = [c for c in n if c.isalpha()]
    if letters and sum(c.isupper() for c in letters) / len(letters) > 0.7 and len(n) > 5:
        return True
    return False


# Ключевые слова -> категория ТЗ
_CAT_RULES = [
    ('диагностика', re.compile(r'\b(узи|кт\b|мрт|рентген|ренген|флюорограф|эхо|экг|ээг|эндоскоп|колоноскоп|гастроскоп|маммограф|денситометр|допплер|сцинтиграф|холтер|спирограф|томограф)', re.IGNORECASE)),
    ('лаборатория', re.compile(r'\b(анализ|кровь|крови|моч[аи]|оак|оам|биохими|гормон|пцр|ифа|посев|мазок|соэ|глюкоз|холестерин|антитела|маркер|цитолог|гистолог|коагулограмм|клиническ.{0,3}анализ)', re.IGNORECASE)),
    ('приём врача', re.compile(r'\b(при[её]м|консультац|осмотр|врач|специалист|терапевт|хирург|ведение беременн)', re.IGNORECASE)),
    ('процедура', re.compile(r'\b(процедур|инъекц|укол|капельниц|перевязк|массаж|физиотерап|операц|удаление|биопси|пункц|вакцин|прививк|лечени|терапи|манипуляц|забор)', re.IGNORECASE)),
]


def guess_category(name, specialty=''):
    text = f'{name} {specialty}'
    for cat, rx in _CAT_RULES:
        if rx.search(text):
            return cat
    return 'процедура'
