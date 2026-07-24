const DEFAULT_LOCAL_API_BASE_URL = "http://localhost:18081/api";
const DEFAULT_PRODUCTION_API_BASE_URL = "https://clinops.dpdns.org/api";

export function getApiBaseUrl() {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  const appEnv = process.env.NEXT_PUBLIC_APP_ENV?.trim().toLowerCase();

  if (appEnv === "production") {
    return DEFAULT_PRODUCTION_API_BASE_URL;
  }

  return DEFAULT_LOCAL_API_BASE_URL;
}

export function getAppEnv() {
  return process.env.NEXT_PUBLIC_APP_ENV?.trim().toLowerCase() || "development";
}
