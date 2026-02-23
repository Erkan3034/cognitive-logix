import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL,
  timeout: 30_000
});

export async function postPredict(payload) {
  const { data } = await api.post("/predict", payload);
  return data;
}

export async function postForecast(payload) {
  const { data } = await api.post("/forecast", payload);
  return data;
}

export async function postFraud(payload) {
  const { data } = await api.post("/fraud", payload);
  return data;
}

