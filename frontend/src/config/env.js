/**
 * SystemPilot Client-Side Environment Configuration & Validation Module
 * 
 * Safely parses, validates, and clamps environment variables provided via Vite (import.meta.env).
 * Guarantees safe fallbacks to prevent performance degradation or startup failure.
 */

const rawEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};

// Helper: Parse integer with range clamping and safe default fallback
function parseClampedInt(val, min, max, defaultVal) {
  const parsed = parseInt(val, 10);
  if (isNaN(parsed)) return defaultVal;
  return Math.min(Math.max(parsed, min), max);
}

// Helper: Parse boolean with safe default fallback
function parseBool(val, defaultVal) {
  if (val === undefined || val === null || val === '') return defaultVal;
  if (typeof val === 'boolean') return val;
  const str = String(val).trim().toLowerCase();
  if (str === 'true' || str === '1' || str === 'yes') return true;
  if (str === 'false' || str === '0' || str === 'no') return false;
  return defaultVal;
}

// Helper: Validate enum with fallback
function parseEnum(val, allowedValues, defaultVal) {
  if (!val) return defaultVal;
  const clean = String(val).trim().toLowerCase();
  return allowedValues.includes(clean) ? clean : defaultVal;
}

export const env = Object.freeze({
  // 1. Application Environment & Debugging
  appEnv: parseEnum(rawEnv.APP_ENV || rawEnv.MODE, ['development', 'production', 'test'], 'development'),
  appDebug: parseBool(rawEnv.APP_DEBUG, rawEnv.DEV ?? false),
  isDev: Boolean(rawEnv.DEV),
  isProd: Boolean(rawEnv.PROD),

  // 2. Development Server & Networking
  appPort: parseClampedInt(rawEnv.APP_PORT || rawEnv.VITE_PORT, 1024, 65535, 1420),
  devHost: rawEnv.VITE_DEV_HOST || '127.0.0.1',

  // 3. UI Refresh & Polling Rates (Clamped for performance protection)
  defaultRefreshMs: parseClampedInt(rawEnv.VITE_DEFAULT_REFRESH_MS, 500, 60000, 1000),
  processRefreshMs: parseClampedInt(rawEnv.VITE_PROCESS_REFRESH_MS, 1000, 60000, 2000),

  // 4. Hardware Telemetry & Monitoring Preferences
  enableHardwareSensors: parseBool(rawEnv.VITE_ENABLE_HARDWARE_SENSORS, true),
  enableGpuMonitoring: parseBool(rawEnv.VITE_ENABLE_GPU_MONITORING, true),

  // 5. Logging & Diagnostics
  logLevel: parseEnum(rawEnv.VITE_LOG_LEVEL, ['debug', 'info', 'warn', 'error'], 'info'),
  enableDiagnosticOverlays: parseBool(rawEnv.VITE_ENABLE_DIAGNOSTIC_OVERLAYS, false),

  // 6. Performance & Resource Limits
  maxTelemetryPoints: parseClampedInt(rawEnv.VITE_MAX_TELEMETRY_POINTS, 10, 120, 30),

  // 7. Feature Flags
  featureBenchmark: parseBool(rawEnv.VITE_FEATURE_BENCHMARK, true),
  featureFanControl: parseBool(rawEnv.VITE_FEATURE_FAN_CONTROL, true),
  featureSystemCleanup: parseBool(rawEnv.VITE_FEATURE_SYSTEM_CLEANUP, true),

  // 8. Offline & Privacy Guard
  allowExternalConnections: parseBool(rawEnv.VITE_ALLOW_EXTERNAL_CONNECTIONS, false),
});

export default env;
