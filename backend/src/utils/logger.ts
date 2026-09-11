export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogEntry {
  level: LogLevel;
  event: string;
  message?: string;
  [key: string]: unknown;
}

export function log(entry: LogEntry): void {
  const timestamp = new Date().toISOString();
  process.stdout.write(`${JSON.stringify({ timestamp, ...entry })}\n`);
}

export const logger = {
  info(event: string, data: Record<string, unknown> = {}): void {
    log({ level: "info", event, ...data });
  },
  warn(event: string, data: Record<string, unknown> = {}): void {
    log({ level: "warn", event, ...data });
  },
  error(event: string, data: Record<string, unknown> = {}): void {
    log({ level: "error", event, ...data });
  },
  debug(event: string, data: Record<string, unknown> = {}): void {
    log({ level: "debug", event, ...data });
  },
};
