import api from "@/lib/api";

export async function csrf() {
  await api.get("/sanctum/csrf-cookie");
}

export async function login(credentials) {
  await csrf();

  await api.post("/api/login", credentials);

  const { data } = await api.get("/api/user");

  return data;
}

export async function logout() {
  await api.post("/api/logout");
}

export async function me() {
  const { data } = await api.get("/api/user");

  return data;
}