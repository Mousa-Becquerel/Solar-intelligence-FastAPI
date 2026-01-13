"""
Pydantic models for API request/response schemas
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from enum import Enum


class LoadType(str, Enum):
    RESIDENTIAL = "residential"
    COMMERCIAL = "commercial"
    MIXED = "mixed"


class ExportProfileType(str, Enum):
    FLAT = "flat"
    TIME_OF_DAY = "time-of-day"
    SEASONAL = "seasonal"
    DYNAMIC = "dynamic"
    CUSTOM = "custom"


class SystemParameters(BaseModel):
    annual_demand: float = Field(default=10000, description="Annual demand in kWh/year")
    max_pv_size: float = Field(default=10, description="Maximum PV size in kWp")
    max_wind_size: float = Field(default=10, description="Maximum wind turbine size in kW")
    max_battery_size: float = Field(default=20, description="Maximum battery size in kWh")
    load_type: LoadType = Field(default=LoadType.RESIDENTIAL)


class CostParameters(BaseModel):
    pv_cost: float = Field(default=800, description="PV system cost in EUR/kWp")
    wind_cost: float = Field(default=1200, description="Wind turbine cost in EUR/kW")
    battery_cost: float = Field(default=500, description="Battery cost in EUR/kWh")
    electricity_price: float = Field(default=0.25, description="Electricity price in EUR/kWh")
    pv_om_cost: float = Field(default=20, description="PV O&M cost in EUR/kWp/year")
    wind_om_cost: float = Field(default=40, description="Wind O&M cost in EUR/kW/year")
    discount_rate: float = Field(default=0.05, description="Discount rate (0-1)")


class ExportParameters(BaseModel):
    base_export_price: float = Field(default=0.175, description="Base export price in EUR/kWh")
    export_profile_type: ExportProfileType = Field(default=ExportProfileType.FLAT)
    custom_export_profile: Optional[List[float]] = Field(default=None, description="Custom 8760 hourly tariff values")


class CustomProfiles(BaseModel):
    demand_profile: Optional[List[float]] = Field(default=None, description="Custom 8760 hourly demand values in kWh")
    pv_generation_profile: Optional[List[float]] = Field(default=None, description="Custom 8760 hourly PV generation in W")
    wind_generation_profile: Optional[List[float]] = Field(default=None, description="Custom 8760 hourly wind generation in W")


class OptimizationRequest(BaseModel):
    system_params: SystemParameters = Field(default_factory=SystemParameters)
    cost_params: CostParameters = Field(default_factory=CostParameters)
    export_params: ExportParameters = Field(default_factory=ExportParameters)
    custom_profiles: CustomProfiles = Field(default_factory=CustomProfiles)
    strategy: Literal["selfConsumption", "npv"] = Field(default="npv")


class SimulationRequest(BaseModel):
    system_params: SystemParameters = Field(default_factory=SystemParameters)
    cost_params: CostParameters = Field(default_factory=CostParameters)
    export_params: ExportParameters = Field(default_factory=ExportParameters)
    custom_profiles: CustomProfiles = Field(default_factory=CustomProfiles)
    pv_size: float = Field(..., description="PV size to simulate in kWp")
    wind_size: float = Field(default=0, description="Wind turbine size to simulate in kW")
    battery_size: float = Field(..., description="Battery size to simulate in kWh")


class CashFlowYear(BaseModel):
    year: int
    grid_savings: float
    feed_in_revenue: float
    operational_costs: float
    battery_replacement: float
    cash_flow: float
    discounted_cash_flow: Optional[float] = None
    cumulative_npv: float


class EnergyFlowResult(BaseModel):
    self_consumption_ratio: float
    self_sufficiency_ratio: float
    energy_from_grid: float
    energy_to_grid: float
    pv_self_consumption: float
    wind_self_consumption: float
    pv_self_consumption_ratio: float
    wind_self_consumption_ratio: float
    pv_export: float
    wind_export: float
    total_generation: float


class OptimizedDesign(BaseModel):
    pv_size: float
    wind_size: float
    battery_size: float
    self_consumption_ratio: float
    self_sufficiency_ratio: float
    npv: float
    pv_self_consumption: float
    wind_self_consumption: float
    pv_export: float
    wind_export: float
    total_generation: float


class DailyProfileDataPoint(BaseModel):
    hour: int
    demand: float
    pv_generation: float
    wind_generation: float
    total_generation: float
    battery_charge: float
    grid_tariff: float


class OptimizationResponse(BaseModel):
    optimized_design: OptimizedDesign
    cash_flows: List[CashFlowYear]
    daily_profile_june: List[DailyProfileDataPoint]
    daily_profile_december: List[DailyProfileDataPoint]
    export_tariff_sample: List[dict]


class ProfileGenerationRequest(BaseModel):
    annual_demand: float = Field(default=10000)
    load_type: LoadType = Field(default=LoadType.RESIDENTIAL)


class ExportTariffRequest(BaseModel):
    base_export_price: float = Field(default=0.175)
    export_profile_type: ExportProfileType = Field(default=ExportProfileType.FLAT)
