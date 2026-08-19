export type LogLevel = "debug" | "info" | "warn" | "error";
const levels: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export function createLogger(scope: string) {
  const configured = (process.env.LOG_LEVEL ?? "info") as LogLevel;
  const threshold = levels[configured] ?? levels.info;
  const write = (level: LogLevel, message: string, fields: Record<string, unknown> = {}) => {
    if (levels[level] < threshold) return;
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, scope, message, ...fields }));
  };
  return { debug: (message: string, fields?: Record<string, unknown>) => write("debug", message, fields), info: (message: string, fields?: Record<string, unknown>) => write("info", message, fields), warn: (message: string, fields?: Record<string, unknown>) => write("warn", message, fields), error: (message: string, fields?: Record<string, unknown>) => write("error", message, fields) };
}
