import { createContext, useContext, useState, useCallback } from 'react'

const DICT = {
  ru: {
    // nav / footer
    'nav.search': 'Поиск', 'nav.map': 'Карта', 'nav.data': 'Данные', 'nav.basket': 'Медкорзина',
    'footer': 'MedPrice.kz · Хакатон 2026 · агрегатор цен на медуслуги Казахстана · данные из открытых прайсов клиник',
    // hero
    'hero.badge': 'Сравнение цен на медуслуги · Казахстан',
    'hero.title1': 'Сравните цены на медуслуги', 'hero.title2': 'и не переплачивайте',
    'hero.subtitle': 'Один поиск вместо обхода десятков сайтов клиник. Анализы, приёмы врачей, диагностика — прозрачные цены по всему Казахстану.',
    'hero.popular': 'Популярное:',
    // stats
    'stat.offers': 'цен в базе', 'stat.clinics': 'клиник', 'stat.cities': 'городов',
    'stat.services': 'услуг', 'stat.tarif': 'точных совпадений по коду',
    // presets
    'presets.title': 'Готовые чек-апы',
    'presets.subtitle': 'Соберём корзину услуг и найдём, где дешевле всего пройти целиком.',
    'presets.cta': 'Собрать корзину', 'presets.count': 'услуг в корзине',
    'preset.checkup_basic': 'Базовый чек-ап', 'preset.heart': 'Здоровье сердца',
    'preset.thyroid': 'Щитовидная железа', 'preset.pregnancy': 'Беременность',
    // popular
    'popular.title': 'Где переплата заметнее всего',
    'popular.subtitle': 'Одна и та же услуга — разница в цене между клиниками.',
    'from': 'от', 'saveUpTo': 'экономия до', 'clinicsN': 'клиник',
    // search
    'search.big': 'Анализ крови, УЗИ, приём врача…', 'search.small': 'Поиск услуги…', 'search.btn': 'Найти',
    // categories
    'cat.лаборатория': 'лаборатория', 'cat.приём врача': 'приём врача',
    'cat.диагностика': 'диагностика', 'cat.процедура': 'процедура',
    // results
    'results.title': 'Результаты поиска', 'allCities': 'Все города', 'allCats': 'Все категории',
    'sort': 'Сортировка:', 'sort.popular': 'популярные', 'sort.cheap': 'дешевле',
    'sort.expensive': 'дороже', 'sort.rating': 'по рейтингу',
    'results.empty': 'Ничего не найдено. Попробуйте другой запрос.', 'code': 'код',
    // service detail
    'back': 'на главную', 'addToBasket': 'Добавить в Медкорзину',
    'st.min': 'мин. цена', 'st.median': 'медиана рынка', 'st.max': 'макс. цена', 'st.spread': 'разброс',
    'marketDyn': 'Динамика рынка:', 'priceDyn': 'динамика цен', 'hideDyn': 'скрыть динамику',
    'byTarif': 'по коду тарификатора', 'source': 'источник',
    'noOffers': 'Нет предложений по фильтру', 'svcNotFound': 'Услуга не найдена',
    'noDyn': 'Недостаточно данных для динамики.',
    // fair badge
    'fair.best': 'Лучшая цена', 'fair.below': '% ниже рынка', 'fair.above': '% выше рынка', 'fair.market': 'рыночная',
    'loading': 'Загрузка',
    // basket
    'basket.empty': 'Медкорзина пуста',
    'basket.emptyHint': 'Добавьте услуги — и мы найдём, где пройти их дешевле всего: целиком в одной клинике или с оптимальной раскладкой по нескольким.',
    'basket.pick': 'Подобрать услуги', 'basket.optimize': 'оптимизируем стоимость',
    'clear': 'Очистить', 'services': 'Услуги', 'city': 'Город',
    'basket.split': 'Оптимальная раскладка по клиникам',
    'basket.saveUpTo': 'Экономия до', 'basket.vsWorst': 'против самого дорогого варианта',
    'basket.notFoundCity': 'услуг не найдено в выбранном городе',
    'basket.single': 'Если хотите всё в одном месте', 'basket.covers': 'покрывает',
    'of': 'из', 'svcGen': 'услуг', 'basket.missing': 'нет',
    // map
    'map.title': 'Клиники на карте',
    'map.subA': 'клиник в', 'map.subB': 'городах. Цифра на маркере — число услуг с ценой.',
    // admin
    'admin.title': 'Панель данных',
    'admin.subtitle': 'Журнал парсинга, raw→normalized слои и очередь ручной разметки — по требованиям ТЗ.',
    'admin.sources': 'Источники', 'admin.queue': 'Очередь разметки',
    'th.clinic': 'Клиника', 'th.file': 'Файл', 'th.format': 'Формат', 'th.year': 'Год',
    'th.parser': 'Парсер', 'th.rows': 'Строк', 'th.status': 'Статус',
    'admin.queueHint': 'Непривязанные услуги с AI-подсказкой совпадения. В проде — кнопка «подтвердить/исправить».',
    'admin.looksLike': 'похоже на',
    // assistant
    'ai.btn': 'AI-ассистент', 'ai.title': 'AI-ассистент MedPrice', 'ai.subtitle': 'подберёт анализы и цены',
    'ai.compareAll': 'Сравнить все клиники', 'ai.openBasket': 'Открыть Медкорзину',
    'ai.input': 'Спросите про услугу или симптом',
    'ai.hello': 'Здравствуйте! Я AI-ассистент MedPrice. Спросите «где дешевле сдать кровь на сахар?» или назовите симптом — подберу анализы и найду, где выгоднее.',
    'ai.sug1': 'Где дешевле общий анализ крови?', 'ai.sug2': 'Проверить щитовидку', 'ai.sug3': 'Чек-ап для сердца',
    'ai.err': 'Ошибка соединения с сервером',
    // фильтр цены / избранное / клиника / запись / админка
    'priceLabel': 'Цена, ₸', 'priceFrom': 'от', 'priceTo': 'до', 'reset': 'Сбросить',
    'nav.fav': 'Избранное', 'fav.add': 'В избранное', 'fav.remove': 'Убрать из избранного',
    'fav.empty': 'В избранном пока пусто',
    'fav.emptyHint': 'Нажмите на сердечко у услуги — и она сохранится сюда.',
    'book': 'Записаться', 'clinic.services': 'Услуги клиники', 'clinic.back': 'к карте',
    'bk.title': 'Запись на услугу', 'bk.clinic': 'Клиника', 'bk.service': 'Услуга',
    'bk.name': 'Ваше имя', 'bk.phone': 'Телефон', 'bk.date': 'Удобная дата',
    'bk.submit': 'Отправить заявку', 'bk.cancel': 'Отмена',
    'bk.done': 'Заявка принята', 'bk.doneHint': 'Клиника свяжется с вами для подтверждения.',
    'admin.overview': 'Обзор', 'admin.bookings': 'Заявки', 'admin.noBookings': 'Заявок пока нет',
    'fn.pipeline': 'Конвейер данных', 'fn.raw': 'Сырых строк', 'fn.norm': 'Нормализовано',
    'fn.offers': 'Предложений', 'fn.unmatched': 'В очереди разметки',
    'fn.methods': 'Методы сопоставления', 'fn.coverage': 'Покрытие по клиникам',
    'g2': 'Открыть в 2ГИС', 'g2.rev': 'Адрес и отзывы в 2ГИС', 'reviews': 'отзывы', 'rangeTo': 'до',
    'g2.route': 'Маршрут в 2ГИС', 'y.open': 'Открыть в Яндекс.Картах', 'map.openY': 'Открыть на Яндекс.Картах', 'map.list': 'Все клиники', 'map.svc': 'услуг',
    'fl.rating': 'Рейтинг', 'fl.any': 'любой', 'fl.found': 'Найдено клиник',
  },
  kk: {
    'nav.search': 'Іздеу', 'nav.map': 'Карта', 'nav.data': 'Деректер', 'nav.basket': 'Медсебет',
    'footer': 'MedPrice.kz · 2026 хакатоны · Қазақстанның медқызмет баға агрегаторы · клиникалардың ашық прайстарынан',
    'hero.badge': 'Медқызмет бағаларын салыстыру · Қазақстан',
    'hero.title1': 'Медқызмет бағаларын салыстырыңыз', 'hero.title2': 'және артық төлемеңіз',
    'hero.subtitle': 'Ондаған клиника сайтын аралаудың орнына — бір іздеу. Анализдер, дәрігер қабылдаулары, диагностика: Қазақстан бойынша ашық бағалар.',
    'hero.popular': 'Танымал:',
    'stat.offers': 'базадағы баға', 'stat.clinics': 'клиника', 'stat.cities': 'қала',
    'stat.services': 'қызмет', 'stat.tarif': 'код бойынша дәл сәйкестік',
    'presets.title': 'Дайын чек-аптар',
    'presets.subtitle': 'Қызметтер себетін жинап, толық өтуге қай жерде арзан екенін табамыз.',
    'presets.cta': 'Себет жинау', 'presets.count': 'қызмет себетте',
    'preset.checkup_basic': 'Негізгі чек-ап', 'preset.heart': 'Жүрек денсаулығы',
    'preset.thyroid': 'Қалқанша без', 'preset.pregnancy': 'Жүктілік',
    'popular.title': 'Артық төлем қай жерде байқалады',
    'popular.subtitle': 'Бір қызмет — клиникалар арасындағы баға айырмасы.',
    'from': 'бастап', 'saveUpTo': 'үнемдеу', 'clinicsN': 'клиника',
    'search.big': 'Қан анализі, УДЗ, дәрігер қабылдауы…', 'search.small': 'Қызметті іздеу…', 'search.btn': 'Табу',
    'cat.лаборатория': 'зертхана', 'cat.приём врача': 'дәрігер қабылдауы',
    'cat.диагностика': 'диагностика', 'cat.процедура': 'процедура',
    'results.title': 'Іздеу нәтижелері', 'allCities': 'Барлық қала', 'allCats': 'Барлық санат',
    'sort': 'Сұрыптау:', 'sort.popular': 'танымал', 'sort.cheap': 'арзан',
    'sort.expensive': 'қымбат', 'sort.rating': 'рейтинг бойынша',
    'results.empty': 'Ештеңе табылмады. Басқа сұраныс жасап көріңіз.', 'code': 'код',
    'back': 'басты бетке', 'addToBasket': 'Медсебетке қосу',
    'st.min': 'ең төмен баға', 'st.median': 'нарық медианасы', 'st.max': 'ең жоғары баға', 'st.spread': 'айырма',
    'marketDyn': 'Нарық динамикасы:', 'priceDyn': 'баға динамикасы', 'hideDyn': 'динамиканы жасыру',
    'byTarif': 'тарификатор коды бойынша', 'source': 'дереккөз',
    'noOffers': 'Сүзгі бойынша ұсыныс жоқ', 'svcNotFound': 'Қызмет табылмады',
    'noDyn': 'Динамика үшін дерек жеткіліксіз.',
    'fair.best': 'Ең тиімді баға', 'fair.below': '% нарықтан төмен', 'fair.above': '% нарықтан жоғары', 'fair.market': 'нарықтық',
    'loading': 'Жүктелуде',
    'basket.empty': 'Медсебет бос',
    'basket.emptyHint': 'Қызметтерді қосыңыз — оларды қай жерде арзан өтуге болатынын табамыз: бір клиникада толық немесе бірнешеуіне оңтайлы бөлумен.',
    'basket.pick': 'Қызмет таңдау', 'basket.optimize': 'құнын оңтайландырамыз',
    'clear': 'Тазалау', 'services': 'Қызметтер', 'city': 'Қала',
    'basket.split': 'Клиникалар бойынша оңтайлы бөлу',
    'basket.saveUpTo': 'Үнемдеу', 'basket.vsWorst': 'ең қымбат нұсқамен салыстырғанда',
    'basket.notFoundCity': 'қызмет таңдалған қалада табылмады',
    'basket.single': 'Барлығын бір жерден алғыңыз келсе', 'basket.covers': 'қамтиды',
    'of': 'ішінен', 'svcGen': 'қызмет', 'basket.missing': 'жоқ',
    'map.title': 'Картадағы клиникалар',
    'map.subA': 'клиника', 'map.subB': 'қалада. Маркердегі сан — бағасы бар қызмет саны.',
    'admin.title': 'Деректер панелі',
    'admin.subtitle': 'Парсинг журналы, raw→normalized қабаттары және қолмен белгілеу кезегі — ТЗ талаптары бойынша.',
    'admin.sources': 'Дереккөздер', 'admin.queue': 'Белгілеу кезегі',
    'th.clinic': 'Клиника', 'th.file': 'Файл', 'th.format': 'Формат', 'th.year': 'Жыл',
    'th.parser': 'Парсер', 'th.rows': 'Жол', 'th.status': 'Күй',
    'admin.queueHint': 'Сәйкестендірілмеген қызметтер AI-болжамымен. Өнімде — «растау/түзету» батырмасы.',
    'admin.looksLike': 'ұқсайды',
    'ai.btn': 'AI-көмекші', 'ai.title': 'MedPrice AI-көмекшісі', 'ai.subtitle': 'анализ бен бағаны таңдайды',
    'ai.compareAll': 'Барлық клиниканы салыстыру', 'ai.openBasket': 'Медсебетті ашу',
    'ai.input': 'Қызмет немесе симптом туралы сұраңыз',
    'ai.hello': 'Сәлеметсіз бе! Мен MedPrice AI-көмекшісімін. «Қандағы қантты қай жерде арзан тапсыруға болады?» деп сұраңыз немесе симптомды атаңыз — анализ таңдап, тиімдісін табам.',
    'ai.sug1': 'Қан жалпы анализі қай жерде арзан?', 'ai.sug2': 'Қалқанша безді тексеру', 'ai.sug3': 'Жүрекке чек-ап',
    'ai.err': 'Сервермен байланыс қатесі',
    'priceLabel': 'Баға, ₸', 'priceFrom': 'бастап', 'priceTo': 'дейін', 'reset': 'Тазарту',
    'nav.fav': 'Таңдаулы', 'fav.add': 'Таңдаулыға', 'fav.remove': 'Таңдаулыдан алу',
    'fav.empty': 'Таңдаулы әзірге бос',
    'fav.emptyHint': 'Қызметтегі жүрекшені бассаңыз — осында сақталады.',
    'book': 'Жазылу', 'clinic.services': 'Клиника қызметтері', 'clinic.back': 'картаға',
    'bk.title': 'Қызметке жазылу', 'bk.clinic': 'Клиника', 'bk.service': 'Қызмет',
    'bk.name': 'Атыңыз', 'bk.phone': 'Телефон', 'bk.date': 'Ыңғайлы күн',
    'bk.submit': 'Өтінім жіберу', 'bk.cancel': 'Бас тарту',
    'bk.done': 'Өтінім қабылданды', 'bk.doneHint': 'Клиника растау үшін хабарласады.',
    'admin.overview': 'Шолу', 'admin.bookings': 'Өтінімдер', 'admin.noBookings': 'Өтінім әзірге жоқ',
    'fn.pipeline': 'Деректер конвейері', 'fn.raw': 'Шикі жолдар', 'fn.norm': 'Нормаланған',
    'fn.offers': 'Ұсыныстар', 'fn.unmatched': 'Белгілеу кезегінде',
    'fn.methods': 'Сәйкестендіру әдістері', 'fn.coverage': 'Клиникалар бойынша қамту',
    'g2': '2ГИС-те ашу', 'g2.rev': '2ГИС: мекенжай мен пікірлер', 'reviews': 'пікірлер', 'rangeTo': 'дейін',
    'g2.route': '2ГИС-те бағыт', 'y.open': 'Яндекс.Картада ашу', 'map.openY': 'Яндекс.Картада ашу', 'map.list': 'Барлық клиника', 'map.svc': 'қызмет',
    'fl.rating': 'Рейтинг', 'fl.any': 'кез келген', 'fl.found': 'Табылған клиника',
  },
}

const Ctx = createContext({ lang: 'ru', setLang: () => {}, t: (k) => k })

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('lang') || 'ru')
  const setLang = useCallback((l) => { localStorage.setItem('lang', l); setLangState(l) }, [])
  const t = useCallback((key, vars) => {
    let s = (DICT[lang] && DICT[lang][key]) ?? DICT.ru[key] ?? key
    if (vars) for (const k in vars) s = s.replace(`{${k}}`, vars[k])
    return s
  }, [lang])
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>
}

export const useLang = () => useContext(Ctx)
