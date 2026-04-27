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
