"""
FastAPI application for PV + Wind + Battery System Optimizer
"""
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import csv
import io

from .models import (
    OptimizationRequest,
    SimulationRequest,
    OptimizationResponse,
    OptimizedDesign,
    CashFlowYear,
    DailyProfileDataPoint,
    ProfileGenerationRequest,
    ExportTariffRequest,
    LoadType,
    ExportProfileType
)
from .calculations import (
    generate_typical_load_profile,
    simulate_pv_generation,
    simulate_wind_generation,
    generate_grid_export_tariff_profile,
    run_optimization,
    run_simulation,
    generate_daily_profile_data,
    HOURS_IN_YEAR
)

app = FastAPI(
    title="PV Optimizer API",
    description="API for PV + Wind + Battery System Optimization - Becquerel Institute Italia",
    version="1.1.0"
)

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "ok", "message": "PV Optimizer API is running"}


@app.post("/api/generate-load-profile")
async def generate_load_profile(request: ProfileGenerationRequest) -> dict:
    """
    Generate a synthetic load profile based on annual demand and load type.

    Returns 8760 hourly values in kWh.
    """
    profile = generate_typical_load_profile(
        request.annual_demand,
        request.load_type.value
    )
    return {
        "profile": profile,
        "total": sum(profile),
        "min": min(profile),
        "max": max(profile),
        "average": sum(profile) / len(profile)
    }


@app.post("/api/generate-export-tariff")
async def generate_export_tariff(request: ExportTariffRequest) -> dict:
    """
    Generate a grid export tariff profile.

    Returns 8760 hourly values in EUR/kWh.
    """
    profile = generate_grid_export_tariff_profile(
        request.base_export_price,
        request.export_profile_type.value
    )
    return {
        "profile": profile,
        "min": min(profile),
        "max": max(profile),
        "average": sum(profile) / len(profile)
    }


@app.post("/api/optimize", response_model=OptimizationResponse)
async def optimize_system(request: OptimizationRequest) -> OptimizationResponse:
    """
    Run optimization to find the best system configuration.

    Supports two strategies:
    - selfConsumption: Maximize self-consumption ratio
    - npv: Maximize 20-year Net Present Value
    """
    # Prepare system parameters
    system_params = {
        'annual_demand': request.system_params.annual_demand,
        'max_pv_size': request.system_params.max_pv_size,
        'max_wind_size': request.system_params.max_wind_size,
        'max_battery_size': request.system_params.max_battery_size,
        'load_type': request.system_params.load_type.value
    }

    # Prepare cost parameters
    cost_params = {
        'pv_cost': request.cost_params.pv_cost,
        'wind_cost': request.cost_params.wind_cost,
        'battery_cost': request.cost_params.battery_cost,
        'electricity_price': request.cost_params.electricity_price,
        'pv_om_cost': request.cost_params.pv_om_cost,
        'wind_om_cost': request.cost_params.wind_om_cost,
        'discount_rate': request.cost_params.discount_rate
    }

    # Generate or use custom load profile
    if request.custom_profiles.demand_profile:
        if len(request.custom_profiles.demand_profile) != HOURS_IN_YEAR:
            raise HTTPException(status_code=400, detail="Demand profile must have 8760 values")
        load_profile = request.custom_profiles.demand_profile
    else:
        load_profile = generate_typical_load_profile(
            request.system_params.annual_demand,
            request.system_params.load_type.value
        )

    # Generate or use custom export tariff profile
    if request.export_params.custom_export_profile:
        if len(request.export_params.custom_export_profile) != HOURS_IN_YEAR:
            raise HTTPException(status_code=400, detail="Export tariff profile must have 8760 values")
        export_tariff_profile = request.export_params.custom_export_profile
    else:
        export_tariff_profile = generate_grid_export_tariff_profile(
            request.export_params.base_export_price,
            request.export_params.export_profile_type.value
        )

    # Get custom generation profiles if provided
    normalized_pv = request.custom_profiles.pv_generation_profile
    normalized_wind = request.custom_profiles.wind_generation_profile

    if normalized_pv and len(normalized_pv) != HOURS_IN_YEAR:
        raise HTTPException(status_code=400, detail="PV generation profile must have 8760 values")
    if normalized_wind and len(normalized_wind) != HOURS_IN_YEAR:
        raise HTTPException(status_code=400, detail="Wind generation profile must have 8760 values")

    # Run optimization
    best_design, cash_flows = run_optimization(
        strategy=request.strategy,
        system_params=system_params,
        cost_params=cost_params,
        load_profile=load_profile,
        export_tariff_profile=export_tariff_profile,
        normalized_pv_generation=normalized_pv,
        normalized_wind_generation=normalized_wind
    )

    # Generate daily profile data for charts
    daily_june = generate_daily_profile_data(
        day_start=3624,  # Mid-June
        pv_size=best_design['pv_size'],
        wind_size=best_design['wind_size'],
        battery_size=best_design['battery_size'],
        load_profile=load_profile,
        export_tariff_profile=export_tariff_profile,
        normalized_pv_generation=normalized_pv,
        normalized_wind_generation=normalized_wind
    )

    daily_december = generate_daily_profile_data(
        day_start=8040,  # Mid-December
        pv_size=best_design['pv_size'],
        wind_size=best_design['wind_size'],
        battery_size=best_design['battery_size'],
        load_profile=load_profile,
        export_tariff_profile=export_tariff_profile,
        normalized_pv_generation=normalized_pv,
        normalized_wind_generation=normalized_wind
    )

    # Sample export tariff for chart (every 12th hour)
    export_tariff_sample = [
        {"hour": i * 12, "tariff": export_tariff_profile[i * 12]}
        for i in range(len(export_tariff_profile) // 12)
    ]

    return OptimizationResponse(
        optimized_design=OptimizedDesign(**best_design),
        cash_flows=[CashFlowYear(
            year=cf['year'],
            grid_savings=cf['grid_savings'],
            feed_in_revenue=cf['feed_in_revenue'],
            operational_costs=cf['operational_costs'],
            battery_replacement=cf['battery_replacement'],
            cash_flow=cf['cash_flow'],
            discounted_cash_flow=cf.get('discounted_cash_flow'),
            cumulative_npv=cf['cumulative_npv']
        ) for cf in cash_flows],
        daily_profile_june=[DailyProfileDataPoint(**dp) for dp in daily_june],
        daily_profile_december=[DailyProfileDataPoint(**dp) for dp in daily_december],
        export_tariff_sample=export_tariff_sample
    )


@app.post("/api/simulate", response_model=OptimizationResponse)
async def simulate_system(request: SimulationRequest) -> OptimizationResponse:
    """
    Run simulation for a specific system configuration.
    """
    # Prepare system parameters
    system_params = {
        'annual_demand': request.system_params.annual_demand,
        'max_pv_size': request.system_params.max_pv_size,
        'max_wind_size': request.system_params.max_wind_size,
        'max_battery_size': request.system_params.max_battery_size,
        'load_type': request.system_params.load_type.value
    }

    # Prepare cost parameters
    cost_params = {
        'pv_cost': request.cost_params.pv_cost,
        'wind_cost': request.cost_params.wind_cost,
        'battery_cost': request.cost_params.battery_cost,
        'electricity_price': request.cost_params.electricity_price,
        'pv_om_cost': request.cost_params.pv_om_cost,
        'wind_om_cost': request.cost_params.wind_om_cost,
        'discount_rate': request.cost_params.discount_rate
    }

    # Generate or use custom load profile
    if request.custom_profiles.demand_profile:
        if len(request.custom_profiles.demand_profile) != HOURS_IN_YEAR:
            raise HTTPException(status_code=400, detail="Demand profile must have 8760 values")
        load_profile = request.custom_profiles.demand_profile
    else:
        load_profile = generate_typical_load_profile(
            request.system_params.annual_demand,
            request.system_params.load_type.value
        )

    # Generate or use custom export tariff profile
    if request.export_params.custom_export_profile:
        if len(request.export_params.custom_export_profile) != HOURS_IN_YEAR:
            raise HTTPException(status_code=400, detail="Export tariff profile must have 8760 values")
        export_tariff_profile = request.export_params.custom_export_profile
    else:
        export_tariff_profile = generate_grid_export_tariff_profile(
            request.export_params.base_export_price,
            request.export_params.export_profile_type.value
        )

    # Get custom generation profiles if provided
    normalized_pv = request.custom_profiles.pv_generation_profile
    normalized_wind = request.custom_profiles.wind_generation_profile

    if normalized_pv and len(normalized_pv) != HOURS_IN_YEAR:
        raise HTTPException(status_code=400, detail="PV generation profile must have 8760 values")
    if normalized_wind and len(normalized_wind) != HOURS_IN_YEAR:
        raise HTTPException(status_code=400, detail="Wind generation profile must have 8760 values")

    # Run simulation
    design, cash_flows = run_simulation(
        pv_size=request.pv_size,
        wind_size=request.wind_size,
        battery_size=request.battery_size,
        system_params=system_params,
        cost_params=cost_params,
        load_profile=load_profile,
        export_tariff_profile=export_tariff_profile,
        normalized_pv_generation=normalized_pv,
        normalized_wind_generation=normalized_wind
    )

    # Generate daily profile data for charts
    daily_june = generate_daily_profile_data(
        day_start=3624,
        pv_size=request.pv_size,
        wind_size=request.wind_size,
        battery_size=request.battery_size,
        load_profile=load_profile,
        export_tariff_profile=export_tariff_profile,
        normalized_pv_generation=normalized_pv,
        normalized_wind_generation=normalized_wind
    )

    daily_december = generate_daily_profile_data(
        day_start=8040,
        pv_size=request.pv_size,
        wind_size=request.wind_size,
        battery_size=request.battery_size,
        load_profile=load_profile,
        export_tariff_profile=export_tariff_profile,
        normalized_pv_generation=normalized_pv,
        normalized_wind_generation=normalized_wind
    )

    # Sample export tariff for chart
    export_tariff_sample = [
        {"hour": i * 12, "tariff": export_tariff_profile[i * 12]}
        for i in range(len(export_tariff_profile) // 12)
    ]

    return OptimizationResponse(
        optimized_design=OptimizedDesign(**design),
        cash_flows=[CashFlowYear(
            year=cf['year'],
            grid_savings=cf['grid_savings'],
            feed_in_revenue=cf['feed_in_revenue'],
            operational_costs=cf['operational_costs'],
            battery_replacement=cf['battery_replacement'],
            cash_flow=cf['cash_flow'],
            discounted_cash_flow=cf.get('discounted_cash_flow'),
            cumulative_npv=cf['cumulative_npv']
        ) for cf in cash_flows],
        daily_profile_june=[DailyProfileDataPoint(**dp) for dp in daily_june],
        daily_profile_december=[DailyProfileDataPoint(**dp) for dp in daily_december],
        export_tariff_sample=export_tariff_sample
    )


@app.post("/api/upload/demand-profile")
async def upload_demand_profile(file: UploadFile = File(...)) -> dict:
    """
    Upload a custom demand profile CSV file.

    Expected format: 8760 rows with hourly demand values in kWh.
    """
    try:
        contents = await file.read()
        decoded = contents.decode('utf-8')
        reader = csv.reader(io.StringIO(decoded))

        values = []
        for row in reader:
            for cell in row:
                cell = cell.strip()
                if cell:
                    try:
                        values.append(float(cell))
                    except ValueError:
                        continue

        if len(values) != HOURS_IN_YEAR:
            raise HTTPException(
                status_code=400,
                detail=f"File must contain exactly 8760 values, got {len(values)}"
            )

        return {
            "profile": values,
            "total": sum(values),
            "min": min(values),
            "max": max(values),
            "average": sum(values) / len(values)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")


@app.post("/api/upload/pv-generation-profile")
async def upload_pv_generation_profile(file: UploadFile = File(...)) -> dict:
    """
    Upload a custom PV generation profile CSV file.

    Expected format: 8760 rows with hourly generation values in Watts.
    """
    try:
        contents = await file.read()
        decoded = contents.decode('utf-8')
        reader = csv.reader(io.StringIO(decoded))

        values = []
        for row in reader:
            for cell in row:
                cell = cell.strip()
                if cell:
                    try:
                        values.append(float(cell))
                    except ValueError:
                        continue

        if len(values) != HOURS_IN_YEAR:
            raise HTTPException(
                status_code=400,
                detail=f"File must contain exactly 8760 values, got {len(values)}"
            )

        return {
            "profile": values,
            "total": sum(values),
            "min": min(values),
            "max": max(values),
            "average": sum(values) / len(values)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")


@app.post("/api/upload/wind-generation-profile")
async def upload_wind_generation_profile(file: UploadFile = File(...)) -> dict:
    """
    Upload a custom wind generation profile CSV file.

    Expected format: 8760 rows with hourly generation values in Watts.
    """
    try:
        contents = await file.read()
        decoded = contents.decode('utf-8')
        reader = csv.reader(io.StringIO(decoded))

        values = []
        for row in reader:
            for cell in row:
                cell = cell.strip()
                if cell:
                    try:
                        values.append(float(cell))
                    except ValueError:
                        continue

        if len(values) != HOURS_IN_YEAR:
            raise HTTPException(
                status_code=400,
                detail=f"File must contain exactly 8760 values, got {len(values)}"
            )

        return {
            "profile": values,
            "total": sum(values),
            "min": min(values),
            "max": max(values),
            "average": sum(values) / len(values)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")


@app.post("/api/upload/export-tariff-profile")
async def upload_export_tariff_profile(file: UploadFile = File(...)) -> dict:
    """
    Upload a custom export tariff profile CSV file.

    Expected format: 8760 rows with hourly tariff values in EUR/kWh.
    """
    try:
        contents = await file.read()
        decoded = contents.decode('utf-8')
        reader = csv.reader(io.StringIO(decoded))

        values = []
        for row in reader:
            for cell in row:
                cell = cell.strip()
                if cell:
                    try:
                        values.append(float(cell))
                    except ValueError:
                        continue

        if len(values) != HOURS_IN_YEAR:
            raise HTTPException(
                status_code=400,
                detail=f"File must contain exactly 8760 values, got {len(values)}"
            )

        return {
            "profile": values,
            "min": min(values),
            "max": max(values),
            "average": sum(values) / len(values)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")
