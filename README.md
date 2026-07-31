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
     OpenFootball + StatsBomb basic
```

Основные принципы:

- интерфейс Telegram не показывает пользователю технические детали;
- OpenFootball — основной источник расписаний и результатов;
- StatsBomb MVP импортирует только список турниров и матчи;
- AI получает только команды, дату, лигу и счёт;
- при отсутствии OpenAI API используется локальное безопасное объяснение;
- Free и Pro ограничиваются дневными лимитами;
- Coach зарезервирован для версии 2.

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
- `StatsBombCompetition`, `StatsBombMatch`;
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

Административные:

- `/admin`
- `/setplan telegram_id pro`
- `/sync_openfootball`
- `/sync_statsbomb_basic`

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
```

StatsBomb содержит много открытых соревнований, поэтому базовая синхронизация может занять несколько минут.

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
| Coach | 100 в MVP | зарезервирован, расширения скоро |

Реальная оплата в MVP не подключена. Администратор меняет тариф:

```text
/setplan 123456789 pro
```

Пользователь должен хотя бы один раз выполнить `/start`.

## Безопасное AI-объяснение

Модель получает только:

- команды;
- дату;
- лигу;
- итоговый счёт.

Prompt прямо запрещает выдумывать xG, удары, владение, передачи, тактические детали и событийные данные. Ответ всегда содержит ограничение о том, что по одному счёту нельзя оценить владение и качество моментов. При ошибке AI бот автоматически формирует детерминированный ответ.

## Проверка проекта

```bash
npm run build
npm test
```

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
