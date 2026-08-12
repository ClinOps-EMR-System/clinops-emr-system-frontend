const DEFAULT_LOCAL_API_BASE_URL = "http://localhost:18081/api";
const DEFAULT_PRODUCTION_API_BASE_URL = "https://clinops.dpdns.org/api";

function isProductionEnvironment() {
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV?.trim().toLowerCase();

  return (
    appEnv === "production" ||
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  );
}

export function getApiBaseUrl() {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (isProductionEnvironment()) {
    return DEFAULT_PRODUCTION_API_BASE_URL;
  }

  return DEFAULT_LOCAL_API_BASE_URL;
}

export function getAppEnv() {
  const configuredAppEnv = process.env.NEXT_PUBLIC_APP_ENV?.trim().toLowerCase();

  if (configuredAppEnv) {
    return configuredAppEnv;
  }

  if (isProductionEnvironment()) {
    return "production";
  }

  return "development";
}

export function getRealtimeUrl() {
  const configuredWsUrl = process.env.NEXT_PUBLIC_WS_URL?.trim();

  if (configuredWsUrl) {
    return configuredWsUrl;
  }

  if (isProductionEnvironment()) {
    return "wss://clinops.dpdns.org:6001";
  }

  return "ws://localhost:6001";
}
