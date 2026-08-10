export const API_BASE_URL = "https://taste-trail.onrender.com";

export const apiUrl = (endpoint) => `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
