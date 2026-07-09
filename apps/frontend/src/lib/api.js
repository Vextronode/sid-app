import axios from "axios";

// Cookie-based auth (Sanctum SPA) — bukan bearer token
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  withCredentials: true,
  withXSRFToken: true,
});

export default api;
