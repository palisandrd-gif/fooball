# MatchMind Bot MVP

MatchMind Bot — Telegram-бот по футбольной аналитике. MVP показывает расписание, результаты, историю очных встреч, избранные команды и коротко объясняет сыгранный матч только на основе доступных фактов.

## Архитектура

```text
Telegram / Telegraf
        │
        ▼
commands + handlers
        │
        ├── users / subscriptions / daily limits
        ├── match summaries / head-to-head analytics
        ├── safe AI explanation
        └── admin + data synchronization
                │
                ▼
          Prisma ORM / PostgreSQL
                ▲
                │
 OpenFootball + StatsBomb + API-Football + TheSportsDB
```

Основные принципы:

- интерфейс Telegram не показывает пользователю технические детали;
- OpenFootball — основной источник расписаний и результатов;
- StatsBomb импортирует матчи, события и составы для ограниченной выборки;
- API-Football дополняет актуальные матчи событиями и командной статистикой;
- TheSportsDB добавляет логотипы, стадионы и ссылки на сайты команд;
- обычное AI-объяснение получает только команды, дату, лигу и счёт;
- при отсутствии OpenAI API используется локальное безопасное объяснение;
- Free, Pro и Coach ограничиваются отдельными дневными лимитами;
- Coach даёт отчёты формы, сравнение команд и расширенный разбор матча;
- поиск команд и история встреч принимают русские и английские названия, включая распространённые варианты вроде «Бавария» и «ПСЖ».

## Структура проекта

```text
src/
  bot/
    commands/       Telegram-команды
    handlers/       пользовательские сценарии
    keyboards/      меню и кнопки
    index.ts        запуск бота
  modules/
    users/
    subscriptions/
    openfootball/
    statsbomb/
    analytics/
    ai/
    coach/
    admin/
  db/
    prisma.ts
    schema.prisma
  config/
  utils/
  scripts/
  tests/
```

## Модель данных

Prisma-схема находится в `src/db/schema.prisma` и включает:

- `User`, `Subscription`, `DailyUsage`;
- `League`, `Season`, `Team`, `Match`, `MatchResult`;
- `FavoriteTeam`;
- `StatsBombCompetition`, `StatsBombMatch`, `StatsBombEvent`, `StatsBombLineupPlayer`;
- `ApiFootballFixture`, `ApiFootballEvent`, `ApiFootballStatistic`;
- `DataSyncLog`, `AuditLog`.

Данные матчей нормализованы. Сырой JSON не используется как основной формат хранения.

## Команды бота

Пользовательские:

- `/start`
- `/help`
- `/myplan`
- `/team`
- `/schedule`
- `/results`
- `/history`
- `/favorites`
- `/subscribe`
- `/sources`
- `/explain`
- `/coach`

Административные:

- `/admin`
- `/setplan telegram_id pro`
- `/sync_openfootball`
- `/sync_statsbomb_basic`
- `/sync_statsbomb_details [match_id]`
- `/sync_api_football`
- `/sync_thesportsdb`

## Быстрый запуск

Требования:

- Node.js 20 или новее;
- Docker и Docker Compose;
- токен Telegram-бота от BotFather.

1. Установите зависимости:

```bash
npm install
```

2. Создайте локальный файл настроек:

```bash
cp .env.example .env
```

3. Заполните минимум:

```dotenv
BOT_TOKEN=ваш_telegram_bot_token
DATABASE_URL=postgresql://matchmind:matchmind@localhost:5432/matchmind?schema=public
ADMIN_TELEGRAM_IDS=ваш_telegram_id
```

Несколько администраторов указываются через запятую. `OPENAI_API_KEY` необязателен: без него бот использует безопасное объяснение по счёту.

Для расширенных источников добавьте полученные у поставщиков ключи:

```dotenv
API_FOOTBALL_KEY=ваш_ключ_api_football
THESPORTSDB_API_KEY=ваш_ключ_thesportsdb
```

Если ключ не указан, бот продолжает работать на OpenFootball и StatsBomb; соответствующая синхронизация просто недоступна.

4. Запустите PostgreSQL:

```bash
docker compose up -d postgres
```

5. Создайте Prisma Client и примените миграцию:

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```

6. Импортируйте основные данные:

```bash
npm run sync:openfootball
npm run sync:statsbomb
npm run sync:statsbomb-details
npm run sync:api-football
npm run sync:thesportsdb
```

StatsBomb содержит много открытых соревнований, поэтому базовая синхронизация может занять несколько минут.

Расширенная синхронизация StatsBomb по умолчанию обрабатывает 10 последних матчей без событий. Для конкретного матча можно передать его StatsBomb ID:

```bash
npm run sync:statsbomb-details -- 123456
```

API-Football по умолчанию загружает сезоны `2025` и `2026` для пяти ведущих европейских лиг. Параметры `API_FOOTBALL_LEAGUE_IDS`, `API_FOOTBALL_SEASONS` и `API_FOOTBALL_DETAIL_LIMIT` управляют покрытием и расходом дневного лимита. TheSportsDB обрабатывает до 20 ещё не проверенных команд за один запуск.

## Расширенная информация о матчах

После синхронизации под последним матчем команды появляется кнопка «📊 Статистика матча». Бот сначала использует события StatsBomb Open Data, когда они доступны, затем ищет актуальные показатели API-Football. В ответ могут входить удары, владение, угловые, карточки, xG, ключевые события и стартовые составы — только если соответствующие факты сохранены в базе.

Если нужный матч ещё не детализирован, бот может безопасно загрузить его при первом нажатии и сохранить в кэше. Запросы API-Football автоматически ограничены скоростью бесплатного тарифа; первый ответ может занять до 20 секунд. Подтверждённая расширенная статистика также добавляется после базового AI-объяснения матча.

7. Запустите бота:

```bash
npm run dev
```

Для production:

```bash
npm run build
npm start
```

## Поддерживаемые данные OpenFootball

Лиги:

- English Premier League;
- Bundesliga;
- La Liga;
- Serie A;
- Ligue 1.

Сезоны:

- 2023-24;
- 2024-25;
- 2025-26, если файл доступен.

Недоступный набор не останавливает полную синхронизацию: он записывается как предупреждение.

## Тарифы и лимиты

| Тариф | Дневной лимит | Возможности |
|---|---:|---|
| Free | 5 | поиск, результаты, расписание |
| Pro | 100 | Free + история, объяснение, избранное |
| Coach | 500 | Pro + форма команды, Coach-разбор матча, сравнение команд |

Реальная оплата в MVP не подключена. Администратор меняет тариф:

```text
/setplan 123456789 pro
```

Для назначения Coach:

```text
/setplan 123456789 coach
```

Лимиты настраиваются переменными `FREE_DAILY_LIMIT`, `PRO_DAILY_LIMIT` и `COACH_DAILY_LIMIT`. Значение Coach по умолчанию — 500 запросов в день.

Пользователь должен хотя бы один раз выполнить `/start`.

## Безопасное AI-объяснение

Модель получает только:

- команды;
- дату;
- лигу;
- итоговый счёт.

Prompt прямо запрещает выдумывать xG, удары, владение, передачи, тактические детали и событийные данные. Ответ всегда содержит ограничение о том, что по одному счёту нельзя оценить владение и качество моментов. При ошибке AI бот автоматически формирует детерминированный ответ.

## Coach V1

Coach открывается командой `/coach` или кнопкой «🎯 Coach-аналитика». Режим включает:

- отчёт по последним пяти матчам команды;
- победы, ничьи, поражения, голы, средние показатели и матчи без пропущенных голов;
- текущую серию и ближайшие матчи;
- сравнение формы двух команд и историю очных встреч;
- расширенный разбор выбранного матча;
- короткий Coach AI-вывод с программной проверкой неподтверждённых утверждений.

Coach сначала читает PostgreSQL. Внешний API вызывается только тогда, когда детальная информация о выбранном матче ещё не сохранена. Если StatsBomb или API-Football не содержат расширенных показателей, пользователь всё равно получает базовый отчёт по счёту с явным сообщением об ограничении данных.

Для локальной проверки:

1. Выполните `/start` в Telegram.
2. Назначьте себе тариф: `/setplan ваш_telegram_id coach`.
3. Проверьте `/myplan`, затем откройте `/coach`.
4. Для событий StatsBomb выполните `npm run sync:statsbomb-details`.
5. Для актуальной статистики выполните `npm run sync:api-football` при настроенном `API_FOOTBALL_KEY`.

Coach V2 оставлен без реализации: PDF-отчёты, собственная xG-модель, карты ударов, pass networks, web-dashboard и прогнозные ML-модели.

## Проверка проекта

```bash
npm run build
npm test
```

Для pull request и `main` те же проверки автоматически запускаются через GitHub Actions. Railway использует настройки из `railway.json`, поэтому команды сборки, обновления схемы и запуска хранятся вместе с кодом.

Отчёт production-аудита и остаточные риски: [`docs/PRODUCTION_AUDIT.md`](docs/PRODUCTION_AUDIT.md).

## Автоматическое обновление OpenFootball

Для production рекомендуется отдельная Railway Cron-служба с командой:

```bash
npm run cron:openfootball
```

Расписание `15 3 * * *` запускает импорт каждый день в 03:15 UTC. Cron-службе нужны только `DATABASE_URL` и, при необходимости, `OPENFOOTBALL_BASE_URL`; Telegram- и OpenAI-секреты ей не передаются.

Пошаговая настройка: [`docs/RAILWAY_CRON.md`](docs/RAILWAY_CRON.md).

Настройка StatsBomb events, API-Football и TheSportsDB: [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md).

## План реализации на 14 дней

1. Каркас TypeScript, Telegraf, `/start`, главное меню.
2. PostgreSQL, Prisma, пользователи и тарифы.
3. Импорт OpenFootball.
4. Поиск и нормализация команд.
5. Расписание и последние результаты.
6. Очные встречи и базовые расчёты.
7. Избранные команды.
8. Free/Pro и дневные лимиты.
9. Admin-команды и ручная смена тарифа.
10. Базовый импорт StatsBomb.
11. Безопасное AI-объяснение.
12. UX и обработка ошибок.
13. Документация и локальная проверка.
14. Исправления, smoke test и подготовка к деплою.

## Что оставлено для версии 2

- платежная система;
- StatsBomb events, lineups и 360;
- xG и продвинутый скаутинг;
- карты ударов и сети передач;
- PDF-отчёты;
- web-dashboard;
- фоновые очереди BullMQ и Redis при росте нагрузки.

## Источники данных

Fixture and result data from [openfootball/football.json](https://github.com/openfootball/football.json).

Data source: [StatsBomb Open Data](https://github.com/statsbomb/open-data).

MatchMind Bot не является официальным продуктом StatsBomb.
