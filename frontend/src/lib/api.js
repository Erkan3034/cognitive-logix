import axios from "axios";
import { supabase } from "./supabaseClient.js";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL,
  timeout: 30_000,
});

api.interceptors.request.use(async (config) => {
  if (!supabase) return config;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }

  const tenantId =
    session?.user?.user_metadata?.tenant_id ||
    session?.user?.app_metadata?.tenant_id;

  if (tenantId) {
    config.headers["x-tenant-id"] = tenantId;
  }
  if (session?.user?.id) {
    config.headers["x-user-id"] = session.user.id;
  }

  return config;
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

export async function getRiskMap(params = {}) {
  const { data } = await api.get("/metrics/risk-map", { params });
  return data;
}

export async function getIncidents(params = {}) {
  const { data } = await api.get("/metrics/incidents", { params });
  return data;
}

export async function getDataDrift() {
  const { data } = await api.get("/metrics/drift");
  return data;
}

export async function getModelHealth() {
  const { data } = await api.get("/metrics/model-health");
  return data;
}

export async function getUsage(params = {}) {
  const { data } = await api.get("/ops/usage", { params });
  return data;
}

export async function getAuditLogs(params = {}) {
  const { data } = await api.get("/ops/audit", { params });
  return data;
}

export async function getIncidentActions(params = {}) {
  const { data } = await api.get("/ops/incident-actions", { params });
  return data;
}

export async function postIncidentAction(payload) {
  const { data } = await api.post("/ops/incident-actions", payload);
  return data;
}

export async function getLiveConnections() {
  const { data } = await api.get("/ops/live-connections");
  return data;
}

export async function getDecisionImpact(params = {}) {
  const { data } = await api.get("/ops/decision-impact", { params });
  return data;
}

export async function postRouteIntelligence(payload) {
  const { data } = await api.post("/ops/route-intelligence", payload);
  return data;
}

export async function previewCsvFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post("/api/v1/ingest/csv-preview", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 300_000, // 5 minutes for large file parsing
  });
  return data;
}

export async function getIngestHistory(params = {}) {
  const { data } = await api.get("/api/v1/ingest/history", { params });
  return data;
}

export async function deleteIngestHistory(recordId) {
  const { data } = await api.delete(`/api/v1/ingest/history/${recordId}`);
  return data;
}

export async function confirmMapping(payload) {
  const { data } = await api.post("/api/v1/ingest/confirm-mapping", payload, {
    timeout: 600_000, // 10 minutes for large file ingestion (470K+ rows)
  });
  return data;
}

export async function getApiKeys() {
  const { data } = await api.get("/api/v1/keys");
  return data;
}

export async function createApiKey(payload) {
  const { data } = await api.post("/api/v1/keys", payload);
  return data;
}

export async function revokeApiKey(keyId) {
  const { data } = await api.delete(`/api/v1/keys/${keyId}`);
  return data;
}

export async function getBillingStatus() {
  const { data } = await api.get("/api/v1/billing/status");
  return data;
}

export async function onboardBilling(payload) {
  const { data } = await api.post("/api/v1/billing/onboard", payload);
  return data;
}

export async function upgradePlan(payload) {
  const { data } = await api.post("/api/v1/billing/upgrade", payload);
  return data;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 429) {
      if (window.location.pathname.startsWith("/app") && !window.location.pathname.includes("/app/billing")) {
        window.location.href = "/app/billing?error=quota_exceeded";
      }
    }
    return Promise.reject(error);
  }
);
