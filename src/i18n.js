/* Centralised translation strings — add keys here, consume via useLang(). */

function ruForm(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m100 >= 11 && m100 <= 19) return many;
  if (m10 === 1) return one;
  if (m10 >= 2 && m10 <= 4) return few;
  return many;
}

export const translations = {
  en: {
    nav: {
      compete:    "Compete",
      howItWorks: "How it works",
      organize:   "Organize",
      signIn:     "Sign in",
      register:   "Register",
    },

    hero: {
      eyebrow:      "Multi-sport · 38 cities",
      h1_1:         "Find your next",
      h1_2:         "competition.",
      h1_accent:    "Show up. Compete.",
      body:         "Browse open events across running, cycling, tennis and more — filter by sport, city, date and your skill category, then register in minutes.",
      findCta:      "Find a competition",
      organizeCta:  "Organize an event",
      stat_events:   "events",
      stat_athletes: "athletes",
      stat_sports:   "sports",
      // floating card inside HeroSplit
      card_location: "London · Jun 18 · 21.1 km",
      card_spots:    "41 spots left",

      // centered variant
      c_eyebrow:   "Multi-sport competitions",
      c_h1:        "Every competition,",
      c_h1_accent: "one place to compete.",
      c_body:      "Search open events by sport and city, filter by date and skill category, and register to take part.",
      c_sportLbl:  "Sport",
      c_cityLbl:   "City",
      c_anySport:  "Any sport",
      c_anywhere:  "Anywhere",
      c_searchCta: "Search",
      c_popular:   "Popular",

      // editorial variant
      e_eyebrow:      "Multi-sport · 8 disciplines",
      e_h1:           "Your next start line is waiting.",
      e_body:         "Browse and register for open competitions near you — or organize your own.",
      e_stat_events:  "open events",
      e_stat_cities:  "cities",
      e_stat_athletes:"athletes",
    },

    browse: {
      eyebrow:      "Upcoming competitions",
      title:        "Browse what's open now.",
      subtitle:     "Filter by sport, city, date and skill category to find a competition that fits.",
      sportLbl:     "Sport",
      allSports:    "All",
      cityLbl:      "City",
      whenLbl:      "When",
      levelLbl:     "Level",
      anyTime:      "Any time",
      allLevels:    "All levels",
      anywhere:     "Anywhere",
      clearFilters: "Clear filters",
      noMatchTitle: "No competitions match those filters",
      noMatchSub:   "Try widening your search.",
      resetFilters: "Reset filters",
      foundFn:      (n) => `${n} ${n === 1 ? "competition" : "competitions"} found`,
    },

    participate: {
      eyebrow: "How to participate",
      title:   "Four steps to your start line.",
      body:    "Choose a sport, a location, a time and your category — then register.",
      steps: [
        { label: "Sport",    q: "What do you compete in?" },
        { label: "Location", q: "Where do you want to race?" },
        { label: "Time",     q: "When works for you?" },
        { label: "Category", q: "What's your level?" },
      ],
      stepOf:          "Step",
      stepOfSep:       "/",
      back:            "← Back",
      skip:            "Skip this step →",
      selectionLabel:  "Your selection",
      any:             "Any",
      matchFn:         (n) => `${n} ${n === 1 ? "competition matches" : "competitions match"} your pick.`,
      registerTop:     "Register for top match",
      noMatches:       "No matches",
      seeAllMatches:   "See all matches",
      startOver:       "Start over",
    },

    organizer: {
      eyebrow: "For organizers",
      title:   "Run your own competition.",
      body:    "Everything you need to launch, fill and grow an event — from registration and brackets to sponsorship and promotion.",
      features: [
        {
          tag:   "Create & manage",
          title: "Set up a competition in minutes",
          body:  "Pick a sport, set dates and categories, define capacity and pricing, then publish. Manage registrations, brackets and check-ins from one dashboard.",
          label: "dashboard preview",
        },
        {
          tag:   "Find sponsors",
          title: "Connect with brands that fit",
          body:  "List sponsorship slots, share your audience reach, and match with sponsors looking for events like yours — handled through Rally.",
          label: "sponsor matching",
        },
        {
          tag:   "Promote",
          title: "Run ads & promotions",
          body:  "Boost your event in search, send targeted invites to nearby athletes, and offer early-bird codes to fill your start line faster.",
          label: "promotion tools",
        },
      ],
      cta:       "Start organizing",
      priceNote: "Free to publish · 4% per paid registration",
    },

    finalCta: {
      title:       "Ready to compete?",
      body:        "Create a free account, find an event that fits, and claim your spot on the start line.",
      competeCta:  "Register & compete",
      organizeCta: "I want to organize",
    },

    footer: {
      cols: [
        { h: "Compete",  items: ["Browse events", "How it works", "Skill categories", "Cities"] },
        { h: "Organize", items: ["Create a competition", "Sponsorship", "Promotion", "Pricing"] },
        { h: "Company",  items: ["About", "Careers", "Press", "Contact"] },
      ],
      tagline:   "The home for organizing and joining sports competitions — for athletes and organizers alike.",
      copyright: "© 2026 Rally. A concept design.",
      privacy:   "Privacy",
      terms:     "Terms",
      cookies:   "Cookies",
    },

    register: {
      nameLbl:        "Full name",
      namePlaceholder:"Alex Morgan",
      emailLbl:       "Email",
      categoryLbl:    "Category",
      entry:          "entry",
      confirmCta:     "Confirm & register",
      successTitleFn: (name) => `You're in, ${name}!`,
      successBodyFn:  (title, cat, email) =>
        `Your spot for ${title} (${cat}) is reserved. A confirmation is on its way to ${email}.`,
      doneCta: "Done",
    },

    card: {
      spotsLeftFn: (n) => `${n} spot${n === 1 ? "" : "s"} left`,
      entryLbl:    "entry",
      registerBtn: "Register",
    },

    data: {
      sports: {
        running:    "Running",
        cycling:    "Cycling",
        tennis:     "Tennis",
        football:   "Football",
        swimming:   "Swimming",
        triathlon:  "Triathlon",
        basketball: "Basketball",
        padel:      "Padel",
      },
      locations: {
        london:    "London, UK",
        berlin:    "Berlin, DE",
        barcelona: "Barcelona, ES",
        amsterdam: "Amsterdam, NL",
        lisbon:    "Lisbon, PT",
        milan:     "Milan, IT",
      },
      windows: {
        week:  "This week",
        month: "This month",
        later: "Later",
      },
      categories: {
        open:         "Open",
        amateur:      "Amateur",
        intermediate: "Intermediate",
        pro:          "Pro",
      },
    },
  },

  /* ------------------------------------------------------------------ RU -- */
  ru: {
    nav: {
      compete:    "Участвовать",
      howItWorks: "Как это работает",
      organize:   "Организовать",
      signIn:     "Войти",
      register:   "Регистрация",
    },

    hero: {
      eyebrow:      "Мультиспорт · 38 городов",
      h1_1:         "Найди своё",
      h1_2:         "соревнование.",
      h1_accent:    "Выходи. Соревнуйся.",
      body:         "Просматривай открытые мероприятия по бегу, велоспорту, теннису и другим видам спорта — фильтруй по виду, городу, дате и категории, а затем регистрируйся за несколько минут.",
      findCta:      "Найти соревнование",
      organizeCta:  "Организовать мероприятие",
      stat_events:   "мероприятий",
      stat_athletes: "атлетов",
      stat_sports:   "видов спорта",
      card_location: "Лондон · 18 июн · 21,1 км",
      card_spots:    "41 место осталось",

      c_eyebrow:   "Мультиспортивные соревнования",
      c_h1:        "Все соревнования —",
      c_h1_accent: "в одном месте.",
      c_body:      "Ищи открытые мероприятия по виду спорта и городу, фильтруй по дате и уровню, а затем регистрируйся.",
      c_sportLbl:  "Спорт",
      c_cityLbl:   "Город",
      c_anySport:  "Любой спорт",
      c_anywhere:  "Везде",
      c_searchCta: "Найти",
      c_popular:   "Популярное",

      e_eyebrow:      "Мультиспорт · 8 дисциплин",
      e_h1:           "Твой старт уже ждёт.",
      e_body:         "Просматривай и регистрируйся на ближайшие соревнования — или организуй своё.",
      e_stat_events:  "открытых мероприятий",
      e_stat_cities:  "городов",
      e_stat_athletes:"атлетов",
    },

    browse: {
      eyebrow:      "Предстоящие соревнования",
      title:        "Что открыто прямо сейчас.",
      subtitle:     "Фильтруй по виду спорта, городу, дате и уровню, чтобы найти подходящее соревнование.",
      sportLbl:     "Вид спорта",
      allSports:    "Все",
      cityLbl:      "Город",
      whenLbl:      "Когда",
      levelLbl:     "Уровень",
      anyTime:      "Любое время",
      allLevels:    "Все уровни",
      anywhere:     "Везде",
      clearFilters: "Сбросить фильтры",
      noMatchTitle: "Нет соревнований по этим фильтрам",
      noMatchSub:   "Попробуй расширить поиск.",
      resetFilters: "Сбросить фильтры",
      foundFn:      (n) => `${n} ${ruForm(n, "соревнование", "соревнования", "соревнований")} найдено`,
    },

    participate: {
      eyebrow: "Как участвовать",
      title:   "Четыре шага до старта.",
      body:    "Выбери вид спорта, место, время и категорию — затем зарегистрируйся.",
      steps: [
        { label: "Спорт",     q: "Чем ты занимаешься?" },
        { label: "Место",     q: "Где хочешь участвовать?" },
        { label: "Время",     q: "Когда тебе удобно?" },
        { label: "Категория", q: "Какой у тебя уровень?" },
      ],
      stepOf:         "Шаг",
      stepOfSep:      "/",
      back:           "← Назад",
      skip:           "Пропустить этот шаг →",
      selectionLabel: "Твой выбор",
      any:            "Любой",
      matchFn:        (n) => `${n} ${ruForm(n, "соревнование подходит", "соревнования подходят", "соревнований подходят")}.`,
      registerTop:    "Зарегистрироваться на лучший",
      noMatches:      "Нет совпадений",
      seeAllMatches:  "Посмотреть все",
      startOver:      "Начать заново",
    },

    organizer: {
      eyebrow: "Для организаторов",
      title:   "Проведи своё соревнование.",
      body:    "Всё необходимое для запуска, наполнения и развития мероприятия — от регистрации и сеток до спонсорства и продвижения.",
      features: [
        {
          tag:   "Создать и управлять",
          title: "Запусти соревнование за минуты",
          body:  "Выбери вид спорта, установи даты и категории, определи вместимость и цену, затем опубликуй. Управляй регистрациями, сетками и проверкой из единой панели.",
          label: "панель управления",
        },
        {
          tag:   "Найти спонсоров",
          title: "Свяжись с подходящими брендами",
          body:  "Размести спонсорские слоты, поделись охватом аудитории и найди спонсоров для мероприятий именно такого формата.",
          label: "поиск спонсоров",
        },
        {
          tag:   "Продвижение",
          title: "Запускай рекламу и акции",
          body:  "Продвигай мероприятие в поиске, рассылай приглашения ближайшим атлетам и предлагай скидки для раннего бронирования.",
          label: "инструменты продвижения",
        },
      ],
      cta:       "Начать организацию",
      priceNote: "Бесплатная публикация · 4% с платной регистрации",
    },

    finalCta: {
      title:       "Готов соревноваться?",
      body:        "Создай бесплатный аккаунт, найди подходящее мероприятие и займи своё место на старте.",
      competeCta:  "Регистрация и участие",
      organizeCta: "Хочу организовать",
    },

    footer: {
      cols: [
        { h: "Участие",     items: ["Просмотр мероприятий", "Как это работает", "Категории", "Города"] },
        { h: "Организация", items: ["Создать соревнование", "Спонсорство", "Продвижение", "Цены"] },
        { h: "Компания",    items: ["О нас", "Карьера", "Пресса", "Контакты"] },
      ],
      tagline:   "Платформа для организации и участия в спортивных соревнованиях.",
      copyright: "© 2026 Rally. Концепт-дизайн.",
      privacy:   "Конфиденциальность",
      terms:     "Условия",
      cookies:   "Куки",
    },

    register: {
      nameLbl:         "Полное имя",
      namePlaceholder: "Алекс Морган",
      emailLbl:        "Email",
      categoryLbl:     "Категория",
      entry:           "взнос",
      confirmCta:      "Подтвердить и зарегистрироваться",
      successTitleFn:  (name) => `Ты в деле, ${name}!`,
      successBodyFn:   (title, cat, email) =>
        `Твоё место на ${title} (${cat}) зарезервировано. Подтверждение отправлено на ${email}.`,
      doneCta: "Готово",
    },

    card: {
      spotsLeftFn: (n) => `${n} ${ruForm(n, "место", "места", "мест")} осталось`,
      entryLbl:    "взнос",
      registerBtn: "Регистрация",
    },

    data: {
      sports: {
        running:    "Бег",
        cycling:    "Велоспорт",
        tennis:     "Теннис",
        football:   "Футбол",
        swimming:   "Плавание",
        triathlon:  "Триатлон",
        basketball: "Баскетбол",
        padel:      "Падель",
      },
      locations: {
        london:    "Лондон, Великобритания",
        berlin:    "Берлин, Германия",
        barcelona: "Барселона, Испания",
        amsterdam: "Амстердам, Нидерланды",
        lisbon:    "Лиссабон, Португалия",
        milan:     "Милан, Италия",
      },
      windows: {
        week:  "Эта неделя",
        month: "Этот месяц",
        later: "Позже",
      },
      categories: {
        open:         "Открытая",
        amateur:      "Любитель",
        intermediate: "Средний уровень",
        pro:          "Профи",
      },
    },
  },
};
