export interface BotCommandDefinition {
  command: string;
  description: string;
}

export const USER_BOT_COMMANDS: BotCommandDefinition[] = [
  { command: "start", description: "Открыть главное меню" },
  { command: "help", description: "Показать список возможностей" },
  { command: "team", description: "Найти футбольную команду" },
  { command: "schedule", description: "Посмотреть расписание матчей" },
  { command: "results", description: "Посмотреть последние результаты" },
  { command: "history", description: "Сравнить историю двух команд" },
  { command: "favorites", description: "Открыть избранные команды" },
  { command: "explain", description: "Получить объяснение матча" },
  { command: "coach", description: "Открыть Coach-аналитику" },
  { command: "myplan", description: "Проверить тариф и дневной лимит" },
  { command: "subscribe", description: "Посмотреть доступные тарифы" },
  { command: "sources", description: "Посмотреть источники данных" }
];

export const ADMIN_BOT_COMMANDS: BotCommandDefinition[] = [
  { command: "admin", description: "Показать статистику администратора" },
  { command: "setplan", description: "Изменить тариф пользователя" },
  { command: "sync_openfootball", description: "Обновить результаты и расписание" },
  { command: "sync_statsbomb_basic", description: "Обновить базовые данные StatsBomb" },
  { command: "sync_statsbomb_details", description: "Обновить события StatsBomb" },
  { command: "sync_api_football", description: "Обновить статистику API-Football" },
  { command: "sync_thesportsdb", description: "Обновить профили команд" }
];
