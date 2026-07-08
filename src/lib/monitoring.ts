// Crash reporting (Sentry). No-op until a DSN is set, so the app runs fine
// without a Sentry account. Get the DSN from sentry.io: create a React Native
// project, copy the DSN here, rebuild.
import * as Sentry from '@sentry/react-native';

export const SENTRY_DSN = '';

export function initMonitoring(): void {
  if (!SENTRY_DSN) return;
  Sentry.init({
    dsn: SENTRY_DSN,
    // Crashes + errors only; keep performance tracing off to stay in free quota.
    tracesSampleRate: 0,
    sendDefaultPii: false,
  });
}

// Tag errors with the signed-in user so crashes are attributable.
export function setMonitoringUser(id: string | null): void {
  if (!SENTRY_DSN) return;
  Sentry.setUser(id ? { id } : null);
}
