"""
Storage Optimization Agent
==========================

Single-agent workflow for battery storage system optimization with solar PV.
Uses OpenAI Agents SDK with function tools for optimization and simulation.
Integrates with pv_optimizer calculations for accurate energy modeling.
"""

import os
import sys
import logging
import random
import io
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from dotenv import load_dotenv
import asyncio
from pydantic import BaseModel, Field

# Import from openai-agents library
from agents import Agent, Runner, ModelSettings, RunConfig, trace, TResponseInputItem, function_tool
from openai.types.shared.reasoning import Reasoning
from fastapi_app.utils.session_factory import create_agent_session

# Logfire imports
import logfire

# === Configure logging ===
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# === Load environment variables ===
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable is required")

# Set OpenAI API key for agents library
os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY

# === Import PV Optimizer calculations ===
# Add pv_optimizer to path for imports
sys.path.insert(0, '/app')

try:
    from pv_optimizer.calculations import (
        run_optimization as calc_run_optimization,
        run_simulation as calc_run_simulation,
        generate_typical_load_profile,
        generate_grid_export_tariff_profile,
        simulate_energy_flow,
        calculate_npv_with_cash_flows,
        simulate_pv_generation,
        generate_daily_profile_data,
        HOURS_IN_YEAR
    )
    PV_OPTIMIZER_AVAILABLE = True
    logger.info("PV Optimizer calculations module loaded successfully")
except ImportError as e:
    PV_OPTIMIZER_AVAILABLE = False
    logger.warning(f"PV Optimizer calculations not available: {e}. Using fallback calculations.")


# === Conversation-scoped storage for custom load profiles ===
# Uses a dictionary keyed by conversation_id to prevent race conditions between concurrent users.
# Thread-safe: each conversation's load profile is isolated from others.
import threading
from dataclasses import dataclass as dc_dataclass

@dc_dataclass
class LoadProfileData:
    """Container for load profile data associated with a conversation."""
    profile: List[float]
    source: str

# Thread-safe storage for conversation-scoped load profiles
_custom_load_profiles: Dict[str, LoadProfileData] = {}
_profiles_lock = threading.Lock()

# Context variable to track the current conversation_id for tool calls
# This is set before running agent tools and cleared after
_current_conversation_id: Optional[str] = None


def set_custom_load_profile(profile: List[float], source: str = "uploaded_file", conversation_id: str = None):
    """
    Set the custom load profile for a specific conversation.

    Args:
        profile: List of hourly load values (8760 hours)
        source: Source identifier (e.g., filename)
        conversation_id: The conversation ID to associate with this profile.
                         If None, uses the current context conversation_id.
    """
    conv_id = conversation_id or _current_conversation_id
    if not conv_id:
        logger.warning("set_custom_load_profile called without conversation_id - profile will not be stored")
        return

    with _profiles_lock:
        _custom_load_profiles[conv_id] = LoadProfileData(profile=profile, source=source)
    logger.info(f"Custom load profile set for conversation {conv_id} from {source}: {len(profile)} hours")


def get_custom_load_profile(conversation_id: str = None) -> Optional[List[float]]:
    """
    Get the custom load profile for a specific conversation.

    Args:
        conversation_id: The conversation ID. If None, uses the current context.

    Returns:
        The load profile list or None if not set.
    """
    conv_id = conversation_id or _current_conversation_id
    if not conv_id:
        return None

    with _profiles_lock:
        profile_data = _custom_load_profiles.get(conv_id)
    return profile_data.profile if profile_data else None


def clear_custom_load_profile(conversation_id: str = None):
    """
    Clear the custom load profile for a specific conversation.

    Args:
        conversation_id: The conversation ID. If None, uses the current context.
    """
    conv_id = conversation_id or _current_conversation_id
    if not conv_id:
        return

    with _profiles_lock:
        if conv_id in _custom_load_profiles:
            del _custom_load_profiles[conv_id]
            logger.info(f"Custom load profile cleared for conversation {conv_id}")


def set_current_conversation_context(conversation_id: str):
    """
    Set the current conversation context for tool calls.
    This should be called before running agent tools.
    """
    global _current_conversation_id
    _current_conversation_id = conversation_id
    logger.debug(f"Conversation context set to {conversation_id}")


def clear_current_conversation_context():
    """Clear the current conversation context after tool calls complete."""
    global _current_conversation_id
    _current_conversation_id = None
    logger.debug("Conversation context cleared")


def parse_load_profile_file(file_content: bytes, file_name: str) -> Dict[str, Any]:
    """
    Parse uploaded file to extract hourly load profile data.

    Supports CSV, Excel (.xlsx, .xls), and JSON files.
    Expected formats:
    - 8760 rows: Full year hourly data (recommended)
    - 24 rows: Typical daily profile (will be repeated for the year)

    Args:
        file_content: Raw bytes of the uploaded file
        file_name: Name of the file (used to determine format)

    Returns:
        Dictionary with:
        - success: bool
        - load_profile: List[float] of 8760 hourly values (if successful)
        - annual_demand_kwh: float - total annual consumption
        - error: str (if failed)
    """
    import pandas as pd
    import json as json_module

    file_ext = file_name.split('.')[-1].lower() if '.' in file_name else ''

    try:
        # Parse based on file type
        if file_ext == 'csv':
            df = pd.read_csv(io.BytesIO(file_content))
        elif file_ext in ['xlsx', 'xls']:
            df = pd.read_excel(io.BytesIO(file_content))
        elif file_ext == 'json':
            data = json_module.loads(file_content.decode('utf-8'))
            if isinstance(data, list):
                # Simple list of values
                df = pd.DataFrame({'consumption': data})
            elif isinstance(data, dict):
                # Dict with array values
                df = pd.DataFrame(data)
            else:
                return {"success": False, "error": "Invalid JSON structure"}
        else:
            return {"success": False, "error": f"Unsupported file type: {file_ext}"}

        # Find the column with consumption data
        consumption_col = None

        # Look for columns with consumption-related names
        consumption_keywords = ['load', 'consumption', 'kwh', 'demand', 'power', 'energy', 'value']
        for col in df.columns:
            col_lower = str(col).lower()
            if any(keyword in col_lower for keyword in consumption_keywords):
                consumption_col = col
                break

        # If no named column found, use the first numeric column (or second if first is hour/time)
        if consumption_col is None:
            numeric_cols = df.select_dtypes(include=['number']).columns
            if len(numeric_cols) == 1:
                consumption_col = numeric_cols[0]
            elif len(numeric_cols) > 1:
                # Skip first column if it looks like hour/time
                first_col = str(numeric_cols[0]).lower()
                if any(x in first_col for x in ['hour', 'time', 'index']):
                    consumption_col = numeric_cols[1]
                else:
                    consumption_col = numeric_cols[0]
            else:
                return {"success": False, "error": "No numeric columns found in file"}

        # Extract values
        values = df[consumption_col].dropna().tolist()

        # Validate data length
        if len(values) == 0:
            return {"success": False, "error": "No data values found in file"}

        # Convert to hourly profile (8760 hours)
        if len(values) == 8760:
            # Full year data - perfect!
            load_profile = [float(v) for v in values]
            logger.info(f"Parsed full year load profile: 8760 hours")
        elif len(values) == 24:
            # Daily profile - repeat for full year (365 days)
            daily_profile = [float(v) for v in values]
            load_profile = daily_profile * 365
            logger.info(f"Parsed daily profile (24 hours), repeated for year")
        elif len(values) == 8784:
            # Leap year data - truncate to 8760
            load_profile = [float(v) for v in values[:8760]]
            logger.info(f"Parsed leap year profile (8784 hours), truncated to 8760")
        elif 8760 < len(values) < 8784:
            # Close to full year but slightly more - truncate
            load_profile = [float(v) for v in values[:8760]]
            logger.info(f"Parsed {len(values)} hours, truncated to 8760")
        elif 8750 <= len(values) < 8760:
            # Close to full year but slightly less (e.g., 8759) - pad with last value
            # This handles cases where a CSV has 8760 total lines but 1 is a header
            load_profile = [float(v) for v in values]
            missing_hours = 8760 - len(values)
            last_value = load_profile[-1]
            load_profile.extend([last_value] * missing_hours)
            logger.info(f"Parsed {len(values)} hours, padded {missing_hours} hours to reach 8760")
        else:
            return {
                "success": False,
                "error": f"Invalid data length: {len(values)} rows. Expected 8760 (full year) or 24 (daily profile)"
            }

        # Validate values are reasonable (non-negative)
        if any(v < 0 for v in load_profile):
            logger.warning("Load profile contains negative values - converting to absolute values")
            load_profile = [abs(v) for v in load_profile]

        # Calculate annual demand
        annual_demand_kwh = sum(load_profile)

        logger.info(f"Successfully parsed load profile: {len(load_profile)} hours, total demand: {annual_demand_kwh:.0f} kWh/year")

        return {
            "success": True,
            "load_profile": load_profile,
            "annual_demand_kwh": annual_demand_kwh,
            "hours": len(load_profile)
        }

    except Exception as e:
        logger.error(f"Error parsing load profile file: {e}")
        return {"success": False, "error": f"Failed to parse file: {str(e)}"}


# === Helper Functions ===
def calculate_irr(cash_flows: list, initial_investment: float, max_iterations: int = 100, tolerance: float = 0.0001) -> float:
    """
    Calculate Internal Rate of Return using Newton-Raphson method.

    Args:
        cash_flows: List of annual cash flows (excluding initial investment)
        initial_investment: Initial investment (positive value)
        max_iterations: Maximum iterations for convergence
        tolerance: Convergence tolerance

    Returns:
        IRR as a decimal (e.g., 0.12 for 12%)
    """
    if not cash_flows or initial_investment <= 0:
        return 0.0

    # Start with initial guess
    rate = 0.1

    for _ in range(max_iterations):
        npv = -initial_investment
        npv_derivative = 0

        for t, cf in enumerate(cash_flows, 1):
            npv += cf / ((1 + rate) ** t)
            npv_derivative -= t * cf / ((1 + rate) ** (t + 1))

        if abs(npv_derivative) < 1e-10:
            break

        new_rate = rate - npv / npv_derivative

        if abs(new_rate - rate) < tolerance:
            return max(0, new_rate)

        rate = new_rate

        # Bound the rate to reasonable values
        if rate < -0.99:
            rate = -0.99
        elif rate > 10:
            rate = 10

    return max(0, rate)


def calculate_discounted_payback(cash_flows: list) -> float:
    """
    Calculate discounted payback period - the year when cumulative NPV crosses from negative to positive.
    Uses linear interpolation for fractional year precision.

    This is more accurate than simple payback as it accounts for:
    - Time value of money (discounting)
    - Variable cash flows across years
    - Actual NPV trajectory

    Args:
        cash_flows: List of dictionaries with 'year' and 'cumulative_npv' keys

    Returns:
        Discounted payback period in years (0 if NPV never becomes positive)
    """
    if not cash_flows or len(cash_flows) < 2:
        return 0.0

    # Find the year when cumulative NPV crosses from negative to positive
    for i in range(1, len(cash_flows)):
        prev_npv = cash_flows[i - 1].get('cumulative_npv', 0)
        curr_npv = cash_flows[i].get('cumulative_npv', 0)

        # Check for the crossover point
        if prev_npv < 0 and curr_npv >= 0:
            # Linear interpolation for fractional year precision
            # fraction = how far into the year the crossover occurs
            total_change = abs(prev_npv) + curr_npv
            if total_change > 0:
                fraction = abs(prev_npv) / total_change
            else:
                fraction = 0

            return cash_flows[i - 1].get('year', i - 1) + fraction

    # If NPV never becomes positive within the cash flow period
    return 0.0


def calculate_lcoe(total_investment: float, total_om_costs_20yr: float,
                   total_generation_20yr: float, discount_rate: float) -> float:
    """
    Calculate Levelized Cost of Energy over 20 years.

    Args:
        total_investment: Initial investment in EUR
        total_om_costs_20yr: Total O&M costs over 20 years (discounted)
        total_generation_20yr: Total energy generation over 20 years in kWh (discounted)
        discount_rate: Discount rate as decimal

    Returns:
        LCOE in EUR/kWh
    """
    if total_generation_20yr <= 0:
        return 0.0

    total_costs = total_investment + total_om_costs_20yr
    return total_costs / total_generation_20yr


def map_strategy(strategy: str) -> str:
    """Map agent strategy names to calculator strategy names."""
    mapping = {
        'self_consumption': 'selfConsumption',
        'economic': 'npv'
    }
    return mapping.get(strategy, 'npv')


def map_export_tariff_type(tariff_type: str) -> str:
    """Map agent tariff type names to calculator profile types."""
    mapping = {
        'flat': 'flat',
        'time_of_day': 'time-of-day',
        'seasonal': 'seasonal',
        'dynamic': 'dynamic'
    }
    return mapping.get(tariff_type, 'flat')


# === Function Tools ===
@function_tool
def run_optimization(
    strategy: str,
    annual_demand_kwh: int,
    load_type: str,
    max_pv_kwp: int,
    max_battery_kwh: int,
    pv_cost_per_kwp: int,
    battery_cost_per_kwh: int,
    electricity_price: int,
    export_price: int,
    export_tariff_type: str,
    pv_om_cost: int,
    discount_rate: int
) -> Dict[str, Any]:
    """
    Find the optimal system sizes for solar PV and battery storage based on the given constraints and strategy.

    Use this tool when the user wants recommendations for system sizing or asks questions like:
    - "What size solar system should I install?"
    - "Optimize my PV and battery system"
    - "What's the best combination of PV and battery?"

    Args:
        strategy: Optimization strategy - 'self_consumption' (maximize own energy use) or 'economic' (maximize NPV)
        annual_demand_kwh: Total annual electricity demand in kWh
        load_type: Load profile type - 'residential', 'commercial', or 'industrial'
        max_pv_kwp: Maximum allowed PV capacity in kWp
        max_battery_kwh: Maximum allowed battery capacity in kWh
        pv_cost_per_kwp: PV system cost per kWp in euros
        battery_cost_per_kwh: Battery cost per kWh in euros
        electricity_price: Grid electricity price in euro cents per kWh
        export_price: Feed-in tariff / export price in euro cents per kWh (base price)
        export_tariff_type: Export tariff structure - 'flat', 'time_of_day', 'seasonal', or 'dynamic'
        pv_om_cost: Annual PV O&M cost per kWp in euros
        discount_rate: Discount rate as percentage (e.g., 5 for 5%)

    Returns:
        Dictionary containing optimal system configuration and financial metrics
    """
    logger.info("=" * 60)
    logger.info("🔧 TOOL CALLED: run_optimization")
    logger.info("=" * 60)
    logger.info(f"  Strategy: {strategy}")
    logger.info(f"  Annual Demand: {annual_demand_kwh} kWh")
    logger.info(f"  Load Type: {load_type}")
    logger.info(f"  Max PV: {max_pv_kwp} kWp | Max Battery: {max_battery_kwh} kWh")
    logger.info(f"  Costs - PV: €{pv_cost_per_kwp}/kWp | Battery: €{battery_cost_per_kwh}/kWh")
    logger.info(f"  Prices - Electricity: {electricity_price}c/kWh | Export: {export_price}c/kWh")
    logger.info(f"  Export Tariff Type: {export_tariff_type} | Discount Rate: {discount_rate}%")
    logger.info(f"  PV Optimizer Available: {PV_OPTIMIZER_AVAILABLE}")
    logger.info("-" * 60)

    # Map load type for calculator (industrial -> commercial)
    calc_load_type = 'commercial' if load_type == 'industrial' else load_type

    # Convert units
    electricity_price_eur = electricity_price / 100  # cents to EUR
    export_price_eur = export_price / 100
    discount_rate_decimal = discount_rate / 100

    if PV_OPTIMIZER_AVAILABLE:
        try:
            # Prepare parameters for calculator (wind disabled - set to 0)
            system_params = {
                'annual_demand': annual_demand_kwh,
                'max_pv_size': max_pv_kwp,
                'max_wind_size': 0,  # Wind disabled - solar only
                'max_battery_size': max_battery_kwh,
                'load_type': calc_load_type
            }

            cost_params = {
                'pv_cost': pv_cost_per_kwp,
                'wind_cost': 0,  # Wind disabled - solar only
                'battery_cost': battery_cost_per_kwh,
                'electricity_price': electricity_price_eur,
                'pv_om_cost': pv_om_cost,
                'wind_om_cost': 0,  # Wind disabled - solar only
                'discount_rate': discount_rate_decimal
            }

            # Set fixed random seed for reproducible results
            # This ensures the agent produces the same results as the pv-optimizer app
            random.seed(42)

            # Check for custom load profile from uploaded file
            custom_profile = get_custom_load_profile()
            if custom_profile is not None:
                # Use uploaded load profile
                load_profile = custom_profile
                # Update annual_demand_kwh to match the uploaded data
                actual_annual_demand = sum(load_profile)
                logger.info(f"📊 Using CUSTOM load profile from uploaded file")
                logger.info(f"   - Uploaded profile demand: {actual_annual_demand:.0f} kWh/year")
                logger.info(f"   - User specified demand: {annual_demand_kwh} kWh (will use uploaded data)")
                # Use the actual demand from the file, not the user-specified value
                annual_demand_kwh = int(actual_annual_demand)
                system_params['annual_demand'] = annual_demand_kwh
            else:
                # Generate typical load profile based on load type
                load_profile = generate_typical_load_profile(annual_demand_kwh, calc_load_type)
                logger.info(f"📊 Using SIMULATED load profile for {calc_load_type}")

            export_tariff_profile = generate_grid_export_tariff_profile(
                export_price_eur,
                map_export_tariff_type(export_tariff_type)
            )

            # Run optimization
            calc_strategy = map_strategy(strategy)
            best_design, cash_flows = calc_run_optimization(
                strategy=calc_strategy,
                system_params=system_params,
                cost_params=cost_params,
                load_profile=load_profile,
                export_tariff_profile=export_tariff_profile
            )

            # Calculate additional financial metrics (solar + battery only)
            total_investment = (
                best_design['pv_size'] * pv_cost_per_kwp +
                best_design['battery_size'] * battery_cost_per_kwh
            )

            # Extract annual cash flows for IRR calculation
            annual_cash_flows = [cf['cash_flow'] for cf in cash_flows[1:]]  # Exclude year 0
            irr = calculate_irr(annual_cash_flows, total_investment) * 100  # Convert to percentage

            # Calculate annual savings (from first year cash flow)
            annual_savings = cash_flows[1]['grid_savings'] + cash_flows[1]['feed_in_revenue'] - cash_flows[1]['operational_costs']

            # Calculate discounted payback (when cumulative NPV crosses zero)
            payback_years = calculate_discounted_payback(cash_flows)

            # Calculate LCOE (solar only)
            annual_pv_generation = best_design['pv_size'] * 1000  # ~1000 kWh/kWp typical
            total_generation_20yr = annual_pv_generation * 20
            total_om_20yr = pv_om_cost * best_design['pv_size'] * 20
            lcoe = calculate_lcoe(total_investment, total_om_20yr, total_generation_20yr, discount_rate_decimal)

            # Calculate energy metrics (solar only)
            self_consumption_pct = best_design['self_consumption_ratio'] * 100
            autarky_pct = best_design['self_sufficiency_ratio'] * 100
            annual_pv_gen = best_design['total_generation']
            annual_grid_import = annual_demand_kwh * (1 - best_design['self_sufficiency_ratio'])
            annual_grid_export = best_design['pv_export']  # Solar export only

            # Generate daily profile data for charts (June and December) - solar only
            daily_june = generate_daily_profile_data(
                day_start=3624,  # Mid-June
                pv_size=best_design['pv_size'],
                wind_size=0,  # Wind disabled - solar only
                battery_size=best_design['battery_size'],
                load_profile=load_profile,
                export_tariff_profile=export_tariff_profile
            )
            daily_december = generate_daily_profile_data(
                day_start=8040,  # Mid-December
                pv_size=best_design['pv_size'],
                wind_size=0,  # Wind disabled - solar only
                battery_size=best_design['battery_size'],
                load_profile=load_profile,
                export_tariff_profile=export_tariff_profile
            )

            # Sample export tariff for chart (every 12th hour)
            export_tariff_sample = [
                {"hour": i * 12, "tariff": export_tariff_profile[i * 12]}
                for i in range(len(export_tariff_profile) // 12)
            ]

            result = {
                "status": "success",
                "optimal_configuration": {
                    "pv_size_kwp": round(best_design['pv_size'], 2),
                    "battery_size_kwh": round(best_design['battery_size'], 2),
                },
                "financial_metrics": {
                    "total_investment_eur": round(total_investment, 2),
                    "annual_savings_eur": round(annual_savings, 2),
                    "payback_years": round(payback_years, 1),
                    "lcoe_eur_kwh": round(lcoe, 4),
                    "npv_eur": round(best_design['npv'], 2),
                    "irr_percent": round(irr, 1),
                },
                "energy_metrics": {
                    "self_consumption_percent": round(self_consumption_pct, 1),
                    "autarky_percent": round(autarky_pct, 1),
                    "annual_pv_generation_kwh": round(annual_pv_gen, 0),
                    "annual_grid_import_kwh": round(annual_grid_import, 0),
                    "annual_grid_export_kwh": round(annual_grid_export, 0),
                },
                "input_parameters": {
                    "strategy": strategy,
                    "annual_demand_kwh": annual_demand_kwh,
                    "load_type": load_type,
                    "electricity_price_cents": electricity_price,
                    "export_price_cents": export_price,
                },
                "cash_flow_summary": {
                    "year_1": round(cash_flows[1]['cash_flow'], 2) if len(cash_flows) > 1 else 0,
                    "year_5": round(cash_flows[5]['cumulative_npv'], 2) if len(cash_flows) > 5 else 0,
                    "year_10": round(cash_flows[10]['cumulative_npv'], 2) if len(cash_flows) > 10 else 0,
                    "year_20": round(cash_flows[20]['cumulative_npv'], 2) if len(cash_flows) > 20 else 0,
                },
                # Dashboard chart data for artifact panel (solar + battery only)
                "dashboard_data": {
                    "optimized_design": {
                        "pv_size": round(best_design['pv_size'], 2),
                        "battery_size": round(best_design['battery_size'], 2),
                        "self_consumption_ratio": best_design['self_consumption_ratio'],
                        "self_sufficiency_ratio": best_design['self_sufficiency_ratio'],
                        "npv": round(best_design['npv'], 2),
                        "pv_self_consumption": round(best_design.get('pv_self_consumption', 0), 2),
                        "pv_export": round(best_design.get('pv_export', 0), 2),
                    },
                    "cash_flows": [
                        {
                            "year": cf['year'],
                            "grid_savings": round(cf['grid_savings'], 2),
                            "feed_in_revenue": round(cf['feed_in_revenue'], 2),
                            "operational_costs": round(cf['operational_costs'], 2),
                            "battery_replacement": round(cf['battery_replacement'], 2),
                            "cash_flow": round(cf['cash_flow'], 2),
                            "cumulative_npv": round(cf['cumulative_npv'], 2),
                        }
                        for cf in cash_flows
                    ],
                    "daily_profile_june": daily_june,
                    "daily_profile_december": daily_december,
                    "export_tariff_sample": export_tariff_sample,
                    "strategy": strategy,
                }
            }

            logger.info("-" * 60)
            logger.info("✅ OPTIMIZATION COMPLETE (using PV Optimizer)")
            logger.info(f"  Optimal PV: {best_design['pv_size']} kWp")
            logger.info(f"  Optimal Battery: {best_design['battery_size']} kWh")
            logger.info(f"  NPV: €{best_design['npv']:.2f}")
            logger.info(f"  Self-Consumption: {self_consumption_pct:.1f}%")
            logger.info(f"  Autarky: {autarky_pct:.1f}%")
            logger.info(f"  Payback: {payback_years:.1f} years")
            logger.info("=" * 60)
            return result

        except Exception as e:
            logger.error(f"Optimization calculation error: {e}")
            import traceback
            logger.error(traceback.format_exc())
            # Fall through to fallback calculation

    # Fallback calculation if PV optimizer not available (solar + battery only)
    logger.info("⚠️ Using FALLBACK optimization calculation (PV Optimizer not available)")

    # Simple heuristic optimization
    optimal_pv = min(max_pv_kwp, annual_demand_kwh / 1000)
    optimal_battery = min(max_battery_kwh, annual_demand_kwh / 365 * 0.5)

    total_investment = optimal_pv * pv_cost_per_kwp + optimal_battery * battery_cost_per_kwh
    annual_pv_gen = optimal_pv * 1000
    self_consumption_ratio = min(0.7 + optimal_battery / annual_demand_kwh * 10, 0.95)
    annual_savings = annual_pv_gen * self_consumption_ratio * electricity_price_eur

    result = {
        "status": "success",
        "optimal_configuration": {
            "pv_size_kwp": round(optimal_pv, 2),
            "battery_size_kwh": round(optimal_battery, 2),
        },
        "financial_metrics": {
            "total_investment_eur": round(total_investment, 2),
            "annual_savings_eur": round(annual_savings, 2),
            "payback_years": round(total_investment / annual_savings if annual_savings > 0 else 0, 1),
            "lcoe_eur_kwh": round(total_investment / (annual_pv_gen * 20), 4),
            "npv_eur": round(annual_savings * 15 - total_investment, 2),
            "irr_percent": round((annual_savings / total_investment) * 100 if total_investment > 0 else 0, 1),
        },
        "energy_metrics": {
            "self_consumption_percent": round(self_consumption_ratio * 100, 1),
            "autarky_percent": round(annual_pv_gen * self_consumption_ratio / annual_demand_kwh * 100, 1),
            "annual_pv_generation_kwh": round(annual_pv_gen, 0),
            "annual_grid_import_kwh": round(annual_demand_kwh - annual_pv_gen * self_consumption_ratio, 0),
            "annual_grid_export_kwh": round(annual_pv_gen * (1 - self_consumption_ratio), 0),
        },
        "input_parameters": {
            "strategy": strategy,
            "annual_demand_kwh": annual_demand_kwh,
            "load_type": load_type,
            "electricity_price_cents": electricity_price,
            "export_price_cents": export_price,
        }
    }

    return result


@function_tool
def run_simulation(
    pv_size_kwp: int,
    battery_size_kwh: int,
    annual_demand_kwh: int,
    load_type: str,
    pv_cost_per_kwp: int,
    battery_cost_per_kwh: int,
    electricity_price: int,
    export_price: int,
    export_tariff_type: str,
    pv_om_cost: int,
    discount_rate: int
) -> Dict[str, Any]:
    """
    Evaluate a specific system configuration with given sizes for solar PV and battery storage.

    Use this tool when the user has already decided on specific system sizes and wants to see the results:
    - "Simulate a 5kWp PV system with 10kWh battery"
    - "What would be the performance of a 8kWp solar system?"
    - "Calculate savings for my planned installation"

    Args:
        pv_size_kwp: PV system size in kWp
        battery_size_kwh: Battery capacity in kWh
        annual_demand_kwh: Total annual electricity demand in kWh
        load_type: Load profile type - 'residential', 'commercial', or 'industrial'
        pv_cost_per_kwp: PV system cost per kWp in euros
        battery_cost_per_kwh: Battery cost per kWh in euros
        electricity_price: Grid electricity price in euro cents per kWh
        export_price: Feed-in tariff / export price in euro cents per kWh (base price)
        export_tariff_type: Export tariff structure - 'flat', 'time_of_day', 'seasonal', or 'dynamic'
        pv_om_cost: Annual PV O&M cost per kWp in euros
        discount_rate: Discount rate as percentage (e.g., 5 for 5%)

    Returns:
        Dictionary containing simulation results and performance metrics
    """
    logger.info("=" * 60)
    logger.info("🔧 TOOL CALLED: run_simulation")
    logger.info("=" * 60)
    logger.info(f"  PV Size: {pv_size_kwp} kWp")
    logger.info(f"  Battery Size: {battery_size_kwh} kWh")
    logger.info(f"  Annual Demand: {annual_demand_kwh} kWh")
    logger.info(f"  Load Type: {load_type}")
    logger.info(f"  Costs - PV: €{pv_cost_per_kwp}/kWp | Battery: €{battery_cost_per_kwh}/kWh")
    logger.info(f"  Prices - Electricity: {electricity_price}c/kWh | Export: {export_price}c/kWh")
    logger.info(f"  Export Tariff Type: {export_tariff_type}")
    logger.info(f"  PV Optimizer Available: {PV_OPTIMIZER_AVAILABLE}")
    logger.info("-" * 60)

    # Map load type for calculator
    calc_load_type = 'commercial' if load_type == 'industrial' else load_type

    # Convert units
    electricity_price_eur = electricity_price / 100
    export_price_eur = export_price / 100
    discount_rate_decimal = discount_rate / 100

    # Calculate total investment (solar + battery only)
    total_investment = (
        pv_size_kwp * pv_cost_per_kwp +
        battery_size_kwh * battery_cost_per_kwh
    )

    if PV_OPTIMIZER_AVAILABLE:
        try:
            # Prepare parameters (wind disabled - set to 0)
            system_params = {
                'annual_demand': annual_demand_kwh,
                'max_pv_size': pv_size_kwp,
                'max_wind_size': 0,  # Wind disabled - solar only
                'max_battery_size': battery_size_kwh,
                'load_type': calc_load_type
            }

            cost_params = {
                'pv_cost': pv_cost_per_kwp,
                'wind_cost': 0,  # Wind disabled - solar only
                'battery_cost': battery_cost_per_kwh,
                'electricity_price': electricity_price_eur,
                'pv_om_cost': pv_om_cost,
                'wind_om_cost': 0,  # Wind disabled - solar only
                'discount_rate': discount_rate_decimal
            }

            # Set fixed random seed for reproducible results
            random.seed(42)

            # Check for custom load profile from uploaded file
            custom_profile = get_custom_load_profile()
            if custom_profile is not None:
                # Use uploaded load profile
                load_profile = custom_profile
                # Update annual_demand_kwh to match the uploaded data
                actual_annual_demand = sum(load_profile)
                logger.info(f"📊 Using CUSTOM load profile from uploaded file")
                logger.info(f"   - Uploaded profile demand: {actual_annual_demand:.0f} kWh/year")
                logger.info(f"   - User specified demand: {annual_demand_kwh} kWh (will use uploaded data)")
                # Use the actual demand from the file, not the user-specified value
                annual_demand_kwh = int(actual_annual_demand)
                system_params['annual_demand'] = annual_demand_kwh
            else:
                # Generate typical load profile based on load type
                load_profile = generate_typical_load_profile(annual_demand_kwh, calc_load_type)
                logger.info(f"📊 Using SIMULATED load profile for {calc_load_type}")

            export_tariff_profile = generate_grid_export_tariff_profile(
                export_price_eur,
                map_export_tariff_type(export_tariff_type)
            )

            # Run simulation (solar + battery only)
            design, cash_flows = calc_run_simulation(
                pv_size=pv_size_kwp,
                wind_size=0,  # Wind disabled - solar only
                battery_size=battery_size_kwh,
                system_params=system_params,
                cost_params=cost_params,
                load_profile=load_profile,
                export_tariff_profile=export_tariff_profile
            )

            # Calculate additional metrics
            annual_cash_flows = [cf['cash_flow'] for cf in cash_flows[1:]]
            irr = calculate_irr(annual_cash_flows, total_investment) * 100

            annual_savings = cash_flows[1]['grid_savings'] + cash_flows[1]['feed_in_revenue'] - cash_flows[1]['operational_costs']

            # Calculate discounted payback (when cumulative NPV crosses zero)
            payback_years = calculate_discounted_payback(cash_flows)

            # LCOE calculation (solar only)
            annual_pv_generation = design['total_generation']
            total_generation_20yr = annual_pv_generation * 20
            total_om_20yr = pv_om_cost * pv_size_kwp * 20
            lcoe = calculate_lcoe(total_investment, total_om_20yr, total_generation_20yr, discount_rate_decimal)

            # Energy metrics (solar only)
            self_consumption_pct = design['self_consumption_ratio'] * 100
            autarky_pct = design['self_sufficiency_ratio'] * 100
            annual_grid_import = annual_demand_kwh * (1 - design['self_sufficiency_ratio'])
            annual_grid_export = design['pv_export']  # Solar export only

            # Generate daily profile data for charts (June and December) - solar only
            daily_june = generate_daily_profile_data(
                day_start=3624,  # Mid-June
                pv_size=pv_size_kwp,
                wind_size=0,  # Wind disabled - solar only
                battery_size=battery_size_kwh,
                load_profile=load_profile,
                export_tariff_profile=export_tariff_profile
            )
            daily_december = generate_daily_profile_data(
                day_start=8040,  # Mid-December
                pv_size=pv_size_kwp,
                wind_size=0,  # Wind disabled - solar only
                battery_size=battery_size_kwh,
                load_profile=load_profile,
                export_tariff_profile=export_tariff_profile
            )

            # Sample export tariff for chart (every 12th hour)
            export_tariff_sample = [
                {"hour": i * 12, "tariff": export_tariff_profile[i * 12]}
                for i in range(len(export_tariff_profile) // 12)
            ]

            result = {
                "status": "success",
                "system_configuration": {
                    "pv_size_kwp": pv_size_kwp,
                    "battery_size_kwh": battery_size_kwh,
                },
                "financial_metrics": {
                    "total_investment_eur": round(total_investment, 2),
                    "annual_savings_eur": round(annual_savings, 2),
                    "payback_years": round(payback_years, 1),
                    "lcoe_eur_kwh": round(lcoe, 4),
                    "npv_eur": round(design['npv'], 2),
                    "irr_percent": round(irr, 1),
                },
                "energy_metrics": {
                    "self_consumption_percent": round(self_consumption_pct, 1),
                    "autarky_percent": round(autarky_pct, 1),
                    "annual_pv_generation_kwh": round(annual_pv_generation, 0),
                    "annual_grid_import_kwh": round(annual_grid_import, 0),
                    "annual_grid_export_kwh": round(annual_grid_export, 0),
                },
                "input_parameters": {
                    "annual_demand_kwh": annual_demand_kwh,
                    "load_type": load_type,
                    "electricity_price_cents": electricity_price,
                    "export_price_cents": export_price,
                    "discount_rate_percent": discount_rate,
                },
                "cash_flow_summary": {
                    "year_1": round(cash_flows[1]['cash_flow'], 2) if len(cash_flows) > 1 else 0,
                    "year_5": round(cash_flows[5]['cumulative_npv'], 2) if len(cash_flows) > 5 else 0,
                    "year_10": round(cash_flows[10]['cumulative_npv'], 2) if len(cash_flows) > 10 else 0,
                    "year_20": round(cash_flows[20]['cumulative_npv'], 2) if len(cash_flows) > 20 else 0,
                },
                # Dashboard chart data for artifact panel (solar + battery only)
                "dashboard_data": {
                    "optimized_design": {
                        "pv_size": pv_size_kwp,
                        "battery_size": battery_size_kwh,
                        "self_consumption_ratio": design['self_consumption_ratio'],
                        "self_sufficiency_ratio": design['self_sufficiency_ratio'],
                        "npv": round(design['npv'], 2),
                        "pv_self_consumption": round(design.get('pv_self_consumption', 0), 2),
                        "pv_export": round(design.get('pv_export', 0), 2),
                    },
                    "cash_flows": [
                        {
                            "year": cf['year'],
                            "grid_savings": round(cf['grid_savings'], 2),
                            "feed_in_revenue": round(cf['feed_in_revenue'], 2),
                            "operational_costs": round(cf['operational_costs'], 2),
                            "battery_replacement": round(cf['battery_replacement'], 2),
                            "cash_flow": round(cf['cash_flow'], 2),
                            "cumulative_npv": round(cf['cumulative_npv'], 2),
                        }
                        for cf in cash_flows
                    ],
                    "daily_profile_june": daily_june,
                    "daily_profile_december": daily_december,
                    "export_tariff_sample": export_tariff_sample,
                    "strategy": "simulation",
                }
            }

            logger.info("-" * 60)
            logger.info("✅ SIMULATION COMPLETE (using PV Optimizer)")
            logger.info(f"  Self-Consumption: {self_consumption_pct:.1f}%")
            logger.info(f"  Autarky: {autarky_pct:.1f}%")
            logger.info(f"  NPV: €{design['npv']:.2f}")
            logger.info(f"  Total Investment: €{total_investment:.2f}")
            logger.info(f"  Payback: {payback_years:.1f} years")
            logger.info("=" * 60)
            return result

        except Exception as e:
            logger.error(f"Simulation calculation error: {e}")
            import traceback
            logger.error(traceback.format_exc())

    # Fallback calculation (solar + battery only)
    logger.info("⚠️ Using FALLBACK simulation calculation (PV Optimizer not available)")

    annual_pv_gen = pv_size_kwp * 1000  # ~1000 kWh/kWp typical
    total_gen = annual_pv_gen

    # Estimate self-consumption based on battery size
    base_self_consumption = 0.3 if battery_size_kwh == 0 else 0.5
    battery_boost = min(battery_size_kwh / annual_demand_kwh * 5, 0.4)
    self_consumption_ratio = min(base_self_consumption + battery_boost, 0.95)

    self_consumed = total_gen * self_consumption_ratio
    exported = total_gen * (1 - self_consumption_ratio)
    grid_import = max(0, annual_demand_kwh - self_consumed)

    annual_savings = (
        self_consumed * electricity_price_eur +
        exported * export_price_eur -
        pv_om_cost * pv_size_kwp
    )

    payback = total_investment / annual_savings if annual_savings > 0 else 0
    npv = annual_savings * 15 - total_investment  # Simplified 20-year NPV

    result = {
        "status": "success",
        "system_configuration": {
            "pv_size_kwp": pv_size_kwp,
            "battery_size_kwh": battery_size_kwh,
        },
        "financial_metrics": {
            "total_investment_eur": round(total_investment, 2),
            "annual_savings_eur": round(annual_savings, 2),
            "payback_years": round(payback, 1),
            "lcoe_eur_kwh": round(total_investment / (total_gen * 20) if total_gen > 0 else 0, 4),
            "npv_eur": round(npv, 2),
            "irr_percent": round((annual_savings / total_investment) * 100 if total_investment > 0 else 0, 1),
        },
        "energy_metrics": {
            "self_consumption_percent": round(self_consumption_ratio * 100, 1),
            "autarky_percent": round(self_consumed / annual_demand_kwh * 100 if annual_demand_kwh > 0 else 0, 1),
            "annual_pv_generation_kwh": round(annual_pv_gen, 0),
            "annual_grid_import_kwh": round(grid_import, 0),
            "annual_grid_export_kwh": round(exported, 0),
        },
        "input_parameters": {
            "annual_demand_kwh": annual_demand_kwh,
            "load_type": load_type,
            "electricity_price_cents": electricity_price,
            "export_price_cents": export_price,
            "discount_rate_percent": discount_rate,
        }
    }

    return result


# === Pydantic Models ===
class WorkflowInput(BaseModel):
    """Input for the storage optimization workflow"""
    input_as_text: str


@dataclass
class StorageOptimizationAgentConfig:
    """Configuration for the storage optimization agent"""
    model: str = "gpt-5-mini"
    agent_name: str = "Storage Optimization Expert"
    verbose: bool = True
    use_reasoning: bool = True
    reasoning_effort: str = "low"


class StorageOptimizationAgent:
    """
    Single-agent storage optimization workflow using OpenAI Agents SDK.
    Helps users design optimal battery storage systems with solar PV.
    """

    STORAGE_EXPERT_PROMPT = """# ROLE
You are a storage optimization consultant helping users design optimal battery storage systems with solar PV. You provide professional analysis for residential, commercial, and industrial energy storage needs.

# MANDATORY CONVERSATION FLOW

**IMPORTANT: Before running any optimization or simulation, you MUST collect these two mandatory choices from the user:**

## Step 1: Ask for Optimization Strategy (MANDATORY)

When a user wants to run an optimization, you MUST first ask them to choose a strategy. Present it clearly like this:

---
**Which optimization strategy would you like to use?**

| Strategy | What it does | Best for |
|----------|--------------|----------|
| **1. Self-Consumption** | Maximizes the use of your own solar energy on-site. Prioritizes reducing grid purchases and minimizing exports. | Homeowners wanting energy independence, high electricity prices, reducing grid dependence |
| **2. Economic (NPV)** | Maximizes your financial return over 20 years. Finds the configuration with the best Net Present Value considering all costs and revenues. | Investors, businesses focused on ROI, those wanting the best financial outcome |

Please reply with **1** or **2** (or "self-consumption" / "economic").

---

**Do NOT proceed with optimization until the user explicitly chooses a strategy.**

## Step 2: Ask for Load Profile Data Source (MANDATORY)

After the user selects a strategy, you MUST ask about their load profile data:

---
**How would you like to provide your electricity consumption data?**

| Option | Description |
|--------|-------------|
| **A. Upload my own data** | Upload a CSV/Excel file with your actual hourly consumption data (8760 hours = 1 year, or 24 hours for a typical day). Click the **+** button next to the input field to upload. |
| **B. Use simulated profile** | I'll generate a typical load profile based on your annual consumption and building type (residential/commercial/industrial). Just tell me your annual kWh and building type. |

Please reply with **A** or **B**.

---

**If user chooses A (upload):**
- Wait for them to upload a file before proceeding
- Explain the expected format: CSV/Excel with hourly kWh values
- Once uploaded, confirm receipt and proceed to collect other parameters

**If user chooses B (simulated):**
- Ask for their annual electricity consumption in kWh
- Ask for their building/load type (residential, commercial, or industrial)
- Explain what each load type means:
  - **Residential**: Morning and evening peaks (breakfast/dinner times), lower during work hours
  - **Commercial**: Daytime peaks during business hours, lower evenings/weekends
  - **Industrial**: More constant load, may have shift patterns

## Step 3: Collect Other Parameters

After strategy and data source are confirmed, collect remaining parameters (or use defaults):
- Maximum PV capacity constraint (kWp)
- Maximum battery capacity constraint (kWh)
- Electricity price (cents/kWh)
- Export/feed-in tariff (cents/kWh)
- Any specific cost assumptions

**You may use defaults for parameters the user doesn't specify, but strategy and data source MUST be explicitly chosen.**

# TOOLS

You have access to two powerful tools:

1. **run_optimization** - Find best system sizes
   - Use when user wants recommendations or asks "what should I install?"
   - Considers constraints, costs, and optimization strategy
   - Returns optimal PV and battery sizes with financial metrics

2. **run_simulation** - Evaluate specific configurations
   - Use when user already has exact sizes in mind
   - Calculates performance and financial metrics for given configuration
   - Good for comparing specific scenarios

# AVAILABLE OPTIMIZATION STRATEGIES (ONLY THESE TWO EXIST)

**CRITICAL: Only these two strategies are implemented. Do NOT mention or suggest any other strategies.**

| Strategy | Description | Best For |
|----------|-------------|----------|
| **self_consumption** | Maximize on-site use of generated solar energy (reduce grid purchases and exports) | Reducing grid dependence, lowering electricity bills |
| **economic** | Maximize NPV (Net Present Value) / financial return over project lifetime, accounting for costs, O&M and discounting | Investors seeking best long-term ROI |

**DO NOT mention these non-existent strategies:** hybrid, carbon_minimisation, peak_shaving, custom_constraint, or any others.

# AVAILABLE PARAMETERS

**For run_optimization tool:**
- strategy: 'self_consumption' or 'economic' (ONLY these two)
- annual_demand_kwh: Total annual electricity demand in kWh
- load_type: 'residential', 'commercial', or 'industrial'
- max_pv_kwp: Maximum allowed PV capacity in kWp
- max_battery_kwh: Maximum allowed battery capacity in kWh
- pv_cost_per_kwp: PV system cost per kWp in euros
- battery_cost_per_kwh: Battery cost per kWh in euros
- electricity_price: Grid electricity price in euro cents per kWh
- export_price: Feed-in tariff / export price in euro cents per kWh
- export_tariff_type: 'flat', 'time_of_day', 'seasonal', or 'dynamic'
- pv_om_cost: Annual PV O&M cost per kWp in euros
- discount_rate: Discount rate as percentage (e.g., 5 for 5%)

**For run_simulation tool:**
- pv_size_kwp: PV system size in kWp
- battery_size_kwh: Battery capacity in kWh
- annual_demand_kwh: Total annual electricity demand in kWh
- load_type: 'residential', 'commercial', or 'industrial'
- pv_cost_per_kwp: PV system cost per kWp in euros
- battery_cost_per_kwh: Battery cost per kWh in euros
- electricity_price: Grid electricity price in euro cents per kWh
- export_price: Feed-in tariff / export price in euro cents per kWh
- export_tariff_type: 'flat', 'time_of_day', 'seasonal', or 'dynamic'
- pv_om_cost: Annual PV O&M cost per kWp in euros
- discount_rate: Discount rate as percentage (e.g., 5 for 5%)

# DECISION LOGIC

**ALWAYS follow the mandatory conversation flow (Strategy → Data Source → Parameters) before using tools.**

- If user asks for recommendations or optimal sizing → use run_optimization (after collecting strategy + data source)
- If user specifies exact system sizes → use run_simulation (still ask about data source if not provided)
- If user jumps ahead and asks to "run optimization" without choosing strategy → Ask for strategy first
- If user provides some parameters but not strategy → Ask for strategy first
- Never skip the strategy selection step - it fundamentally changes the optimization results

# DEFAULTS (use when user doesn't specify)

**System Constraints:**
- Annual demand: 10,000 kWh
- Load type: residential
- Max PV: 10 kWp
- Max battery: 20 kWh

**Costs:**
- PV: 800/kWp
- Battery: 500/kWh
- PV O&M: 20/kWp/year

**Energy Prices:**
- Electricity: 25 cents/kWh
- Export/Feed-in: 8 cents/kWh (base price)
- Export tariff type: flat
  - flat: constant price throughout the year
  - time_of_day: higher during peak solar hours (9am-3pm), lower evenings
  - seasonal: lower in summer, higher in winter
  - dynamic: combines time-of-day and seasonal variations

**Financial:**
- Discount rate: 5%

# RESPONSE GUIDELINES

**Response Formatting Guidelines:**
- Use proper markdown formatting with headers (## for main sections, ### for subsections), bullet points (-), and numbered lists (1., 2., 3.)
- ALWAYS use ## or ### headers to create clear section titles - NOT just plain bold text
- Break content into clear sections with descriptive headers like:
  ## Inputs Required
  ## Optimal Configuration
  ## Financial Analysis
  ## Energy Performance
  ## Next Steps
- Use **bold** for key terms and important numbers within text
- Add blank lines between sections for readability
- Structure long lists as proper bullet points, not run-on sentences
- Use concise paragraphs (2-3 sentences max)

**Presenting Input Options:**
When asking the user for input parameters, present choices clearly:

For optimization strategy (ONLY these two options exist):
| Strategy | Description | Best For |
|----------|-------------|----------|
| **self_consumption** | Maximize on-site energy use | Reducing grid dependence |
| **economic** | Maximize NPV / financial return | Best investment returns |

For load type:
| Load Type | Description |
|-----------|-------------|
| residential | Typical household consumption pattern |
| commercial | Office/retail consumption pattern |
| industrial | Factory/manufacturing consumption pattern |

1. **Gather Information First**
   - If user provides partial info, ask about missing key parameters
   - Especially clarify: annual consumption, budget constraints, and optimization goal

2. **Present Results Clearly**
   - Use tables for comparing options
   - Highlight key metrics: payback period, NPV, savings, self-consumption rate, autarky rate
   - Explain trade-offs between different configurations

3. **Provide Professional Advice**
   - Explain the reasoning behind recommendations
   - Mention relevant considerations (roof space, local regulations, grid connection)
   - Suggest next steps (getting quotes, site assessment)

4. **Use Appropriate Units**
   - Power: kWp (PV)
   - Energy: kWh (battery, consumption)
   - Currency: EUR (euros)
   - Percentages for rates and ratios

# IMPORTANT NOTES

- Always convert user inputs to correct units before calling tools
- Electricity prices should be in cents (25 = 0.25/kWh)
- All costs are in euros unless otherwise specified
- Be conservative with estimates - under-promise, over-deliver
- ONLY use the two available strategies: self_consumption and economic

# PARAMETER CONTROL - WHAT YOU CAN AND CANNOT CHANGE

**CRITICAL: You must understand which parameters you control and which are fixed in the model.**

## Parameters YOU CAN Control (via tool inputs):

| Parameter | Tool Parameter | Description |
|-----------|----------------|-------------|
| Optimization strategy | `strategy` | 'self_consumption' or 'economic' |
| Annual electricity demand | `annual_demand_kwh` | Total yearly consumption in kWh |
| Load profile type | `load_type` | 'residential', 'commercial', 'industrial' |
| Maximum PV capacity | `max_pv_kwp` | Upper limit for PV system size |
| Maximum battery capacity | `max_battery_kwh` | Upper limit for battery size |
| PV system cost | `pv_cost_per_kwp` | Cost per kWp installed |
| Battery cost | `battery_cost_per_kwh` | Cost per kWh capacity |
| Grid electricity price | `electricity_price` | What user pays for grid power (cents/kWh) |
| Export/feed-in tariff | `export_price` | Payment for exported energy (cents/kWh) |
| Export tariff structure | `export_tariff_type` | 'flat', 'time_of_day', 'seasonal', 'dynamic' |
| PV O&M cost | `pv_om_cost` | Annual maintenance cost per kWp |
| Discount rate | `discount_rate` | For NPV calculations (percentage) |

## Parameters that are FIXED (you CANNOT change these):

| Fixed Parameter | Hardcoded Value | Impact |
|-----------------|-----------------|--------|
| **Battery lifetime** | **8 years** | Battery replacement occurs in years 8 and 16 |
| **Battery replacement cost** | **80% of original** | Replacement cost = battery_cost × 0.8 |
| **Project lifetime** | **20 years** | All financial calculations span 20 years |
| **PV degradation** | **0.5%/year** | Annual generation decreases slightly |
| **Location/irradiance** | **Central Europe** | ~1000 kWh/kWp typical yield assumed |

## NEVER claim you can change fixed parameters

**If a user asks about:**
- "What if battery lasts 10 years?" → Explain it's fixed at 8 years in the model
- "Can we run a 25-year scenario?" → Explain the model uses a fixed 20-year horizon
- "What about different locations?" → Explain the model uses Central European irradiance data

**Always be honest:** If asked to vary a fixed parameter, explain the limitation clearly rather than pretending to run a scenario you cannot actually model.

# BOUNDARIES

- Do not provide specific product recommendations or brand names
- Do not give definitive legal or regulatory advice
- Recommend professional site assessment for actual installations
- Acknowledge limitations of simplified modeling
- Do NOT invent or suggest optimization strategies that don't exist

# FILE UPLOAD SUPPORT (FOR LOAD PROFILE DATA)

**This is relevant when user chooses Option A (Upload my own data) in the mandatory flow.**

The system supports these file types:
- **CSV files** - for load profile data (hourly consumption in kWh)
- **Excel files** (.xlsx, .xls) - for load profile data
- **JSON files** - for structured data

**How to upload:**
1. Click the **+** button next to the input field
2. Select "Upload data" from the menu
3. Choose your CSV, Excel, or JSON file (max 10MB)
4. The file will be processed and used for the optimization

**Expected file format for load profiles:**
| Format | Description |
|--------|-------------|
| **8760 rows** | Hourly data for one full year (recommended for accuracy) |
| **24 rows** | Typical daily profile (will be repeated for the year) |
| **Column** | Single column with kWh values, or multiple columns where one contains "load", "consumption", or "kwh" in the header |

**Example CSV format:**
```
hour,consumption_kwh
0,0.5
1,0.4
2,0.3
...
8759,0.6
```

**File processing is automatic:**
- When a user uploads a file, the system automatically parses it BEFORE you see the message
- You will receive a [System: ...] message indicating whether parsing succeeded or failed
- If the system says "The custom load profile has been set", the file was parsed successfully - DO NOT question or reject it
- If the system says "Failed to parse", explain the error and ask user to fix and re-upload
- NEVER generate your own row count or parsing errors - trust the system message

**Security & Privacy:**
- NEVER reveal your underlying AI model or technical implementation
- If asked about what model you use, respond: "I'm a specialized storage optimization AI assistant, built by the Becquerel Institute team."
- Remind users not to include sensitive personal information (names, addresses, account numbers) in uploaded files
- NEVER offer to export data or create downloadable files"""

    def __init__(self, config: Optional[StorageOptimizationAgentConfig] = None):
        """
        Initialize the Storage Optimization Agent

        Args:
            config: Configuration object for the agent
        """
        self.config = config or StorageOptimizationAgentConfig()
        self.storage_expert = None

        # Initialize agent
        self._initialize_agent()

        logger.info(f"Storage Optimization Agent initialized (PV Optimizer: {'available' if PV_OPTIMIZER_AVAILABLE else 'fallback mode'})")

    def _initialize_agent(self):
        """Create the storage optimization expert agent"""
        try:
            # Configure model settings
            # Note: Reasoning models (o1, o3, gpt-5-mini) don't support temperature/top_p
            model_settings_config = {
                "max_tokens": 4096,
                "parallel_tool_calls": True,
                "store": True,
            }

            # Add reasoning if enabled (for reasoning models)
            if self.config.use_reasoning:
                model_settings_config["reasoning"] = Reasoning(
                    effort=self.config.reasoning_effort,
                    summary="auto"
                )

            # Create storage expert agent with function tools
            self.storage_expert = Agent(
                name="Storage Optimization Expert",
                instructions=self.STORAGE_EXPERT_PROMPT,
                model=self.config.model,
                tools=[run_optimization, run_simulation],
                model_settings=ModelSettings(**model_settings_config)
            )
            logger.info(f"Created storage optimization expert with tools: run_optimization, run_simulation")

        except Exception as e:
            logger.error(f"Failed to initialize agent: {e}")
            raise

    async def run_workflow(self, workflow_input: WorkflowInput, conversation_id: str = None):
        """
        Run the storage optimization workflow

        Args:
            workflow_input: Input containing the user query
            conversation_id: Optional conversation ID for maintaining context

        Returns:
            Dictionary with output_text containing the response
        """
        with trace("Storage Optimization Workflow"):
            # Get or create stateless session for this conversation
            session = None
            if conversation_id:
                session = create_agent_session(conversation_id, agent_type='storage_optimization')
                logger.info(f"Created stateless PostgreSQL session for conversation {conversation_id}")

            # Prepare conversation history
            workflow = workflow_input.model_dump()
            conversation_history: list[TResponseInputItem] = [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": workflow["input_as_text"]
                        }
                    ]
                }
            ]

            # Run storage expert
            storage_expert_result_temp = await Runner.run(
                self.storage_expert,
                input=[*conversation_history],
                session=session,
                run_config=RunConfig(trace_metadata={
                    "__trace_source__": "agent-builder",
                    "workflow_id": "wf_storage_optimization_agent"
                })
            )

            # Update conversation history
            conversation_history.extend([item.to_input_item() for item in storage_expert_result_temp.new_items])

            # Extract final output
            output_text = storage_expert_result_temp.final_output_as(str)

            storage_expert_result = {
                "output_text": output_text
            }

            return storage_expert_result

    async def analyze_stream(self, query: str, conversation_id: str = None):
        """
        Analyze query with streaming response

        Args:
            query: Natural language query
            conversation_id: Optional conversation ID for maintaining context

        Yields:
            Text chunks as they are generated

        Returns (via self.last_dashboard_data and self.all_dashboard_results):
            - self.last_dashboard_data: Last dashboard for backward compatibility
            - self.all_dashboard_results: List of all dashboard results (for multi-optimization)
        """
        import json as json_module
        self.last_dashboard_data = None  # Reset before each query
        self.all_dashboard_results = []  # Collect ALL dashboard results

        try:
            logger.info(f"Processing query (streaming): {query}")

            # Set conversation context for tool calls (allows tools to access conversation-scoped data)
            if conversation_id:
                set_current_conversation_context(conversation_id)

            # Get or create stateless session for this conversation
            session = None
            if conversation_id:
                session = create_agent_session(conversation_id, agent_type='storage_optimization')
                logger.info(f"Created stateless PostgreSQL session for conversation {conversation_id}")

            # Run with streaming
            result = Runner.run_streamed(self.storage_expert, query, session=session)

            # Stream text deltas as they arrive
            async for event in result.stream_events():
                if event.type == "raw_response_event":
                    # Check if it's a text delta event
                    from openai.types.responses import ResponseTextDeltaEvent
                    if isinstance(event.data, ResponseTextDeltaEvent):
                        if event.data.delta:
                            yield event.data.delta

            # After streaming completes, extract dashboard_data from tool results
            # Store it for the caller to retrieve (not yielded in stream)
            logger.info(f"🔍 Inspecting {len(result.new_items)} new items for dashboard data")

            for idx, item in enumerate(result.new_items):
                logger.debug(f"📋 Item {idx}: type={type(item).__name__}")

                # Check if this item has function_call_output (tool result)
                if hasattr(item, 'function_call_output'):
                    try:
                        tool_output = item.function_call_output
                        if isinstance(tool_output, str):
                            tool_result = json_module.loads(tool_output)
                        elif isinstance(tool_output, dict):
                            tool_result = tool_output
                        else:
                            tool_result = None

                        if tool_result and 'dashboard_data' in tool_result:
                            dashboard = tool_result['dashboard_data']
                            # Generate a label for this result
                            strategy = dashboard.get('strategy', 'unknown')
                            pv_size = dashboard.get('optimized_design', {}).get('pv_size', 0)
                            battery_size = dashboard.get('optimized_design', {}).get('battery_size', 0)
                            label = f"{strategy.replace('_', ' ').title()} - {pv_size:.1f} kWp / {battery_size:.1f} kWh"

                            self.all_dashboard_results.append({
                                'label': label,
                                'data': dashboard
                            })
                            self.last_dashboard_data = dashboard  # Keep for backward compatibility
                            logger.info(f"✅ Extracted dashboard_data #{len(self.all_dashboard_results)} from function_call_output: {label}")
                    except (json_module.JSONDecodeError, AttributeError, TypeError) as e:
                        logger.warning(f"Could not parse function_call_output: {e}")

                # Alternative: check for output attribute
                if hasattr(item, 'output'):
                    try:
                        tool_output = item.output
                        if isinstance(tool_output, str):
                            tool_result = json_module.loads(tool_output)
                        elif isinstance(tool_output, dict):
                            tool_result = tool_output
                        else:
                            tool_result = None

                        if tool_result and 'dashboard_data' in tool_result:
                            dashboard = tool_result['dashboard_data']
                            # Check if this dashboard is already collected (avoid duplicates)
                            is_duplicate = any(
                                r['data'].get('optimized_design') == dashboard.get('optimized_design')
                                for r in self.all_dashboard_results
                            )
                            if not is_duplicate:
                                # Generate a label for this result
                                strategy = dashboard.get('strategy', 'unknown')
                                pv_size = dashboard.get('optimized_design', {}).get('pv_size', 0)
                                battery_size = dashboard.get('optimized_design', {}).get('battery_size', 0)
                                label = f"{strategy.replace('_', ' ').title()} - {pv_size:.1f} kWp / {battery_size:.1f} kWh"

                                self.all_dashboard_results.append({
                                    'label': label,
                                    'data': dashboard
                                })
                                self.last_dashboard_data = dashboard
                                logger.info(f"✅ Extracted dashboard_data #{len(self.all_dashboard_results)} from item.output: {label}")
                    except (json_module.JSONDecodeError, AttributeError, TypeError) as e:
                        logger.warning(f"Could not parse item.output: {e}")

            if self.all_dashboard_results:
                logger.info(f"✅ Collected {len(self.all_dashboard_results)} dashboard result(s)")
            else:
                logger.info("ℹ️ No dashboard_data found in tool results (normal for non-optimization queries)")

        except Exception as e:
            error_msg = f"Failed to stream query: {str(e)}"
            logger.error(error_msg)
            import traceback
            logger.error(traceback.format_exc())
            yield f"\n\n**Error:** {error_msg}"
        finally:
            # Always clear the conversation context after streaming completes
            clear_current_conversation_context()

    async def analyze(self, query: str, conversation_id: str = None) -> Dict[str, Any]:
        """
        Analyze storage optimization query

        Args:
            query: Natural language query about storage system optimization
            conversation_id: Optional conversation ID for maintaining context

        Returns:
            Dictionary with analysis results and metadata
        """
        # Logfire span for storage optimization agent
        with logfire.span("storage_optimization_agent_call") as agent_span:
            agent_span.set_attribute("agent_type", "storage_optimization")
            agent_span.set_attribute("conversation_id", str(conversation_id))
            agent_span.set_attribute("message_length", len(query))
            agent_span.set_attribute("user_message", query)

            try:
                logger.info(f"Processing storage optimization query: {query}")

                # Create workflow input
                workflow_input = WorkflowInput(input_as_text=query)

                # Run workflow
                result = await self.run_workflow(workflow_input, conversation_id)

                # Extract response
                response_text = result.get("output_text", "")

                # Track the response
                agent_span.set_attribute("assistant_response", response_text)
                agent_span.set_attribute("response_length", len(response_text))
                agent_span.set_attribute("success", True)

                logger.info(f"Storage optimization agent response: {response_text[:100]}...")

                return {
                    "success": True,
                    "analysis": response_text,
                    "usage": None,
                    "query": query
                }

            except Exception as e:
                error_msg = f"Failed to analyze storage optimization query: {str(e)}"
                logger.error(error_msg)
                agent_span.set_attribute("success", False)
                agent_span.set_attribute("error", str(e))
                return {
                    "success": False,
                    "error": error_msg,
                    "analysis": None,
                    "usage": None,
                    "query": query
                }

    def clear_conversation_memory(self, conversation_id: str = None):
        """
        Clear conversation memory (note: with stateless sessions, memory is stored in PostgreSQL)
        This method is kept for API compatibility but has no effect with stateless sessions.
        """
        logger.info(f"clear_conversation_memory called for {conversation_id or 'all'} - no action needed with stateless sessions")

    def get_conversation_memory_info(self) -> Dict[str, Any]:
        """
        Get information about conversation memory usage
        Note: With stateless sessions, memory is stored in PostgreSQL, not in-memory
        """
        return {
            "memory_type": "stateless_postgresql",
            "note": "Session data stored in PostgreSQL database",
            "pv_optimizer_available": PV_OPTIMIZER_AVAILABLE,
        }

    def cleanup(self):
        """Cleanup resources"""
        try:
            logger.info("Storage optimization agent ready for cleanup if needed")
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")


# Global agent instance
_storage_optimization_agent = None


def get_storage_optimization_agent() -> Optional[StorageOptimizationAgent]:
    """Get or create the global storage optimization agent instance"""
    global _storage_optimization_agent
    if _storage_optimization_agent is None:
        try:
            config = StorageOptimizationAgentConfig()
            _storage_optimization_agent = StorageOptimizationAgent(config)
            logger.info("Global storage optimization agent created")
        except Exception as e:
            logger.error(f"Failed to create storage optimization agent: {e}")
            return None
    return _storage_optimization_agent


def close_storage_optimization_agent():
    """Close the global storage optimization agent"""
    global _storage_optimization_agent
    if _storage_optimization_agent:
        _storage_optimization_agent.cleanup()
        _storage_optimization_agent = None
        logger.info("Global storage optimization agent closed")


# Test function
async def test_storage_optimization_agent():
    """Test the storage optimization agent"""
    try:
        agent = get_storage_optimization_agent()
        if agent:
            # Test optimization query
            result = await agent.analyze(
                "I want to install solar panels on my house. My annual electricity consumption is about 8000 kWh. What size system would you recommend?",
                conversation_id="test-storage-1"
            )
            print("Storage Optimization Agent response received successfully")
            print(f"Response length: {len(result.get('analysis', ''))}")
            print(f"\nResponse:\n{result.get('analysis', '')}")
            return result
        else:
            print("Storage Optimization Agent not available")
            return None
    except Exception as e:
        print(f"Storage Optimization Agent error: {e}")
        import traceback
        traceback.print_exc()
        return None
    finally:
        close_storage_optimization_agent()


if __name__ == "__main__":
    asyncio.run(test_storage_optimization_agent())
