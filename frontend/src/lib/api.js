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

export async function getOverviewMetrics() {
  const { data } = await api.get("/metrics/overview");
  return data;
}

export async function getXaiExplanations(params = {}) {
  const { data } = await api.get("/metrics/xai", { params });
  return data;
}

export async function postWhatIfScenario(payload) {
  const { data } = await api.post("/metrics/simulate", payload);
  return data;
}

export async function getDrilldownSkus(params = {}) {
  const { data } = await api.get("/metrics/drilldown-skus", { params });
  return data;
}
