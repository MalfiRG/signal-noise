export const PLACEHOLDER_TIME = "--:--:--";
export const PLACEHOLDER_DATE = "----/--/--";

const pad2 = (n: number): string => String(n).padStart(2, "0");

export function formatTimeOfDay(d: Date, timeZone?: string): string {
  if (timeZone) {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone,
    });
    return fmt.format(d);
  }
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

export function formatUtcDate(d: Date): string {
  return `${d.getUTCFullYear()}/${pad2(d.getUTCMonth() + 1)}/${pad2(d.getUTCDate())}`;
}
