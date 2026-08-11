export const API_BASE_URL = "https://tastewise-842n.onrender.com";

export const apiUrl = (endpoint) => `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
