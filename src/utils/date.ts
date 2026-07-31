export function startOfUtcDay(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function formatMatchDate(value: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

export function parseOpenFootballDate(date: string, time?: string): Date {
  const safeTime = /^\d{2}:\d{2}$/.test(time ?? "") ? time : "12:00";
  return new Date(`${date}T${safeTime}:00.000Z`);
}
