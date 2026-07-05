const getApiBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const cleanUrl = configuredUrl.replace(/\/$/, "");

  if (typeof window === "undefined") return cleanUrl;

  const frontendHost = window.location.hostname;
  const isFrontendLocal = ["localhost", "127.0.0.1", "::1"].includes(frontendHost);
  const isFrontendLan = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(frontendHost);
  const isConfiguredLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(cleanUrl);

  if (isFrontendLan && isConfiguredLocalhost) {
    return `${window.location.protocol}//${frontendHost}:5000`;
  }

  if (!isFrontendLocal && isConfiguredLocalhost) {
    return "https://taste-trail-api.onrender.com";
  }

  return cleanUrl;
};

export const API_BASE_URL = getApiBaseUrl();

export const apiUrl = (path) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};
