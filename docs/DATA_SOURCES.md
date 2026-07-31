# Расширенные источники данных

Интеграции работают независимо. Если внешний ключ не настроен или поставщик временно недоступен, основной бот продолжает использовать сохранённые данные OpenFootball.

## 1. StatsBomb Open Data

Ключ не требуется.

Сначала импортируйте турниры и матчи:

```bash
npm run sync:statsbomb
```

Затем загрузите события и составы для ограниченной выборки:

```bash
npm run sync:statsbomb-details
```

Переменная `STATSBOMB_DETAIL_MATCH_LIMIT=10` защищает базу и память от случайного импорта всего архива. Для одного матча используйте `npm run sync:statsbomb-details -- MATCH_ID` или админ-команду `/sync_statsbomb_details MATCH_ID`.

## 2. API-Football

1. Зарегистрируйтесь на `https://dashboard.api-football.com/`.
2. Скопируйте API key.
3. Добавьте в Railway Variables:

```dotenv
API_FOOTBALL_KEY=...
API_FOOTBALL_LEAGUE_IDS=39,78,140,135,61
API_FOOTBALL_SEASONS=2025,2026
API_FOOTBALL_DETAIL_LIMIT=15
```

ID по умолчанию: Premier League — 39, Bundesliga — 78, La Liga — 140, Serie A — 135, Ligue 1 — 61.

Запуск:

```bash
npm run sync:api-football
```

или `/sync_api_football` от Telegram-администратора. Конфигурация по умолчанию расходует около 40 запросов: 10 запросов списка матчей и до 30 запросов событий/статистики. Перед увеличением лимитов проверьте квоту своего тарифа.

## 3. TheSportsDB

1. Получите API key на `https://www.thesportsdb.com/`.
2. Добавьте в Railway Variables:

```dotenv
THESPORTSDB_API_KEY=...
THESPORTSDB_SYNC_LIMIT=20
```

Запуск:

```bash
npm run sync:thesportsdb
```

или `/sync_thesportsdb` от администратора. За один запуск проверяется не более 20 команд. Повторяйте команду, пока все нужные команды не получат карточки. Не найденные команды помечаются как проверенные, чтобы не блокировать обработку остальных.

## Рекомендуемый порядок первого запуска

1. Дождитесь успешного Railway deploy: pre-deploy автоматически применит Prisma-схему.
2. Выполните `/sync_statsbomb_basic`.
3. Выполните `/sync_statsbomb_details`.
4. Добавьте `API_FOOTBALL_KEY` и выполните `/sync_api_football`.
5. Добавьте `THESPORTSDB_API_KEY` и несколько раз выполните `/sync_thesportsdb`.
6. Найдите команду через `/team` и нажмите «📊 Подробности матча».

## Источники в интерфейсе

Бот подписывает расширенные ответы конкретным поставщиком. Нельзя смешивать данные разных матчей или приписывать StatsBomb, API-Football либо TheSportsDB статус официального партнёра MatchMind.
