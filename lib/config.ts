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

export function getWsUrl() {
  const configuredWsUrl = process.env.NEXT_PUBLIC_WS_URL?.trim();

  if (configuredWsUrl) {
    return configuredWsUrl;
  }

  return "ws://localhost:6001";
}

export function getPublicAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  if (path.startsWith("/")) {
    const origin = getApiBaseUrl().replace(/\/api\/?$/, "");
    return `${origin}${path}`;
  }
  return path;
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
