from typing import Dict, List, Literal

from pydantic import BaseModel, Field


class MetricsOverviewResponse(BaseModel):
    on_time_delivery_pct: float
    late_delivery_risk_pct: float
    demand_risk_pct: float
    demand_risk_categories: int
    financial_exposure_usd: float
    loss_making_orders: int


class WhatIfScenarioRequest(BaseModel):
    port_closed: bool = False
    demand_surge_pct: float = Field(0.0, ge=0.0, le=100.0)
    supplier_strike: Literal["none", "local", "global"] = "none"


class XaiResponse(BaseModel):
    explanations: Dict[str, str]
    scenario_drivers: List[str] = Field(default_factory=list)


class WhatIfScenarioResponse(BaseModel):
    metrics: MetricsOverviewResponse
    explanations: Dict[str, str]
    scenario_drivers: List[str] = Field(default_factory=list)
    applied_factors: Dict[str, float]


class DrilldownSkuItem(BaseModel):
    sku: str
    product_name: str
    order_region: str
    shipping_mode: str
    category_name: str
    late_risk_pct: float
    avg_sales_usd: float
    sample_order_id: int


class DrilldownSkuResponse(BaseModel):
    total: int
    items: List[DrilldownSkuItem]


class IncidentItem(BaseModel):
    id: str
    type: Literal["logistics", "demand", "fraud", "inventory"]
    severity: Literal["low", "medium", "high", "critical"]
    title: str
    description: str
    impact_usd: float = 0.0
    confidence: float = 0.0
    recommended_action: str
    drilldown_params: Dict[str, str] = Field(default_factory=dict)


class IncidentResponse(BaseModel):
    total: int
    items: List[IncidentItem]


class RiskMapItem(BaseModel):
    id: str
    order_region: str
    shipping_mode: str
    category_name: str
    late_risk_pct: float
    financial_exposure_usd: float
    order_count: int
    sku: str


class RiskMapResponse(BaseModel):
    total: int
    items: List[RiskMapItem]


class DriftMetric(BaseModel):
    feature: str
    psi: float
    status: Literal["stable", "watch", "drift"]


class DriftResponse(BaseModel):
    window_a_rows: int
    window_b_rows: int
    metrics: List[DriftMetric]


class ModelHealthItem(BaseModel):
    name: str
    status: Literal["ready", "missing", "invalid"]
    model_version: str | None = None
    model_type: str | None = None
    artifact_created_at: str | None = None
    validation_metrics: Dict[str, object] = Field(default_factory=dict)
    error: str | None = None


class ModelHealthResponse(BaseModel):
    models: List[ModelHealthItem]
    drift: DriftResponse
