"""
Core calculation logic for PV + Wind + Battery optimization.
This module contains all the computational logic ported from the JavaScript implementation.
"""
import numpy as np
from typing import List, Optional, Tuple, Dict, Any
import random

HOURS_IN_YEAR = 8760


def generate_typical_load_profile(annual_demand: float, load_type: str) -> List[float]:
    """
    Generate a synthetic 8760-hour load profile based on load type.

    Args:
        annual_demand: Annual electricity demand in kWh/year
        load_type: One of 'residential', 'commercial', or 'mixed'

    Returns:
        List of 8760 hourly demand values in kWh
    """
    patterns = {
        'residential': [
            0.6, 0.5, 0.4, 0.4, 0.4, 0.5,    # 00:00 - 05:59
            0.8, 1.2, 1.1, 0.9, 0.8, 0.8,    # 06:00 - 11:59
            0.9, 0.9, 0.8, 0.8, 0.9, 1.2,    # 12:00 - 17:59
            1.5, 1.8, 1.6, 1.3, 1.0, 0.7     # 18:00 - 23:59
        ],
        'commercial': [
            0.2, 0.2, 0.2, 0.2, 0.2, 0.3,    # 00:00 - 05:59
            0.5, 1.4, 1.8, 1.9, 1.9, 1.8,    # 06:00 - 11:59
            1.7, 1.8, 1.8, 1.8, 1.7, 1.2,    # 12:00 - 17:59
            0.7, 0.4, 0.3, 0.2, 0.2, 0.2     # 18:00 - 23:59
        ]
    }

    weekly_pattern = {
        'residential': [1, 1, 1, 1, 1, 0.9, 0.8],
        'commercial': [1, 1, 1, 1, 1, 0.3, 0.2]
    }

    seasonal_pattern = {
        'residential': [1.2, 1.2, 1.0, 0.9, 0.8, 0.7, 0.7, 0.7, 0.8, 0.9, 1.0, 1.1],
        'commercial': [1.1, 1.1, 1.0, 0.9, 0.9, 0.9, 0.9, 0.8, 0.9, 1.0, 1.1, 1.1]
    }

    hourly_demand = []
    avg_hourly_demand = annual_demand / HOURS_IN_YEAR

    for hour in range(HOURS_IN_YEAR):
        day_of_week = (hour // 24) % 7
        hour_of_day = hour % 24
        month = int(hour // (HOURS_IN_YEAR / 12))

        if load_type == 'mixed':
            residential_weight = 0.6
            commercial_weight = 0.4

            daily_pattern = (patterns['residential'][hour_of_day] * residential_weight +
                           patterns['commercial'][hour_of_day] * commercial_weight)
            weekly_factor = (weekly_pattern['residential'][day_of_week] * residential_weight +
                           weekly_pattern['commercial'][day_of_week] * commercial_weight)
            seasonal_factor = (seasonal_pattern['residential'][month] * residential_weight +
                             seasonal_pattern['commercial'][month] * commercial_weight)
        else:
            daily_pattern = patterns[load_type][hour_of_day]
            weekly_factor = weekly_pattern[load_type][day_of_week]
            seasonal_factor = seasonal_pattern[load_type][month]

        random_factor = 0.9 + random.random() * 0.2
        hourly_value = avg_hourly_demand * daily_pattern * weekly_factor * seasonal_factor * random_factor
        hourly_demand.append(hourly_value)

    # Normalize to match annual demand
    total = sum(hourly_demand)
    hourly_demand = [value * (annual_demand / total) for value in hourly_demand]

    return hourly_demand


def simulate_pv_generation(pv_size: float) -> List[float]:
    """
    Simulate PV generation for a year based on system size.

    Args:
        pv_size: PV system size in kWp

    Returns:
        List of 8760 hourly generation values in kWh
    """
    annual_irradiance = 1700  # kWh/m²/year typical value

    generation = []
    for hour in range(HOURS_IN_YEAR):
        day_of_year = hour // 24
        hour_of_day = hour % 24

        # Seasonal factor - peaks in summer
        seasonal_factor = np.sin((day_of_year - 28) * 2 * np.pi / 365 + np.pi / 2)

        # Daily solar cycle - sun rises at 6, sets at 18
        daily_solar_cycle = max(0, np.sin((hour_of_day - 6) * np.pi / 12))

        # Cloud factor - random reduction 0-30%
        cloud_factor = max(0, 1 - random.random() * 0.3)

        # Base generation calculation
        base_generation = pv_size * annual_irradiance / 4380

        hourly_gen = base_generation * (1 + seasonal_factor * 0.3) * daily_solar_cycle * (0.7 + cloud_factor * 0.3)
        generation.append(hourly_gen)

    return generation


def simulate_wind_generation(turbine_size: float, wind_profile: Optional[List[float]] = None) -> List[float]:
    """
    Simulate wind turbine generation for a year.

    Args:
        turbine_size: Wind turbine size in kW
        wind_profile: Optional custom wind profile (8760 values in W)

    Returns:
        List of 8760 hourly generation values in kWh
    """
    # If custom profile provided, scale it
    if wind_profile is not None:
        total = sum(wind_profile)
        scale_factor = (turbine_size * HOURS_IN_YEAR) / total if total > 0 else 0
        return [value * scale_factor for value in wind_profile]

    avg_wind_speed = 6  # m/s

    # Seasonal patterns - windier in winter
    seasonal_pattern = [1.3, 1.2, 1.1, 0.9, 0.8, 0.7, 0.7, 0.8, 0.9, 1.0, 1.1, 1.3]

    # Diurnal pattern - often windier at night
    diurnal_pattern = [
        1.2, 1.2, 1.2, 1.1, 1.1, 1.0,    # 00:00 - 05:59
        0.9, 0.8, 0.7, 0.7, 0.8, 0.8,    # 06:00 - 11:59
        0.9, 0.9, 1.0, 1.0, 1.1, 1.1,    # 12:00 - 17:59
        1.1, 1.2, 1.2, 1.2, 1.2, 1.2     # 18:00 - 23:59
    ]

    def power_curve(wind_speed: float) -> float:
        """Wind turbine power curve approximation."""
        cut_in = 3.0
        rated = 12.0
        cut_out = 25.0

        if wind_speed < cut_in or wind_speed > cut_out:
            return 0
        elif wind_speed >= rated:
            return 1
        else:
            # Cubic relationship between cut-in and rated
            return ((wind_speed - cut_in) / (rated - cut_in)) ** 3

    hourly_generation = []
    for hour in range(HOURS_IN_YEAR):
        month = int(hour // (HOURS_IN_YEAR / 12))
        hour_of_day = hour % 24

        seasonal_factor = seasonal_pattern[month]
        diurnal_factor = diurnal_pattern[hour_of_day]

        # Random turbulence factor
        turbulence_factor = 0.7 + random.random() * 0.6

        # Calculate wind speed
        wind_speed = avg_wind_speed * seasonal_factor * diurnal_factor * turbulence_factor

        # Convert to power output
        power_output = power_curve(wind_speed) * turbine_size
        hourly_generation.append(power_output)

    return hourly_generation


def generate_grid_export_tariff_profile(base_export_price: float, profile_type: str) -> List[float]:
    """
    Generate grid export tariff profile for a year.

    Args:
        base_export_price: Base export price in EUR/kWh
        profile_type: One of 'flat', 'time-of-day', 'seasonal', 'dynamic'

    Returns:
        List of 8760 hourly tariff values in EUR/kWh
    """
    hourly_tariffs = [0.0] * HOURS_IN_YEAR

    if profile_type == 'flat':
        return [base_export_price] * HOURS_IN_YEAR

    elif profile_type == 'time-of-day':
        for hour in range(HOURS_IN_YEAR):
            hour_of_day = hour % 24

            # Peak hours (9am-3pm) get higher rates
            if 9 <= hour_of_day < 15:
                hourly_tariffs[hour] = base_export_price * 1.2
            # Evening hours (6pm-9pm) get lower rates
            elif 18 <= hour_of_day < 21:
                hourly_tariffs[hour] = base_export_price * 0.8
            else:
                hourly_tariffs[hour] = base_export_price

    elif profile_type == 'seasonal':
        for hour in range(HOURS_IN_YEAR):
            month = int(hour // (HOURS_IN_YEAR / 12))

            # Summer months (May-Aug) get lower rates
            if 4 <= month <= 7:
                hourly_tariffs[hour] = base_export_price * 0.7
            # Winter months (Nov-Feb) get higher rates
            elif month >= 10 or month <= 1:
                hourly_tariffs[hour] = base_export_price * 1.3
            else:
                hourly_tariffs[hour] = base_export_price

    elif profile_type == 'dynamic':
        for hour in range(HOURS_IN_YEAR):
            hour_of_day = hour % 24
            month = int(hour // (HOURS_IN_YEAR / 12))

            price = base_export_price

            # Time-of-day factors
            if 9 <= hour_of_day < 15:
                price *= 1.1
            elif 18 <= hour_of_day < 21:
                price *= 0.9

            # Seasonal factors
            if 4 <= month <= 7:
                price *= 0.8
            elif month >= 10 or month <= 1:
                price *= 1.2

            # Random variation (±5%)
            random_factor = 0.95 + random.random() * 0.1
            price *= random_factor

            hourly_tariffs[hour] = price

    return hourly_tariffs


def simulate_energy_flow(
    demand: List[float],
    pv_generation: List[float],
    wind_generation: List[float],
    battery_size: float
) -> Dict[str, Any]:
    """
    Simulate hourly energy flow through the system.

    Args:
        demand: 8760 hourly demand values in kWh
        pv_generation: 8760 hourly PV generation values in kWh
        wind_generation: 8760 hourly wind generation values in kWh
        battery_size: Battery capacity in kWh

    Returns:
        Dictionary containing energy flow metrics
    """
    battery_charge = 0.0
    hourly_direct_consumption = 0.0
    total_demand = 0.0
    energy_from_grid = 0.0
    hourly_energy_to_grid = [0.0] * len(demand)
    pv_self_consumption = 0.0
    wind_self_consumption = 0.0
    pv_export = 0.0
    wind_export = 0.0

    for i in range(len(demand)):
        hourly_demand = demand[i]
        hourly_pv = pv_generation[i]
        hourly_wind = wind_generation[i]
        hourly_generation = hourly_pv + hourly_wind
        total_demand += hourly_demand

        direct_consumption = min(hourly_demand, hourly_generation)
        hourly_direct_consumption += direct_consumption

        # Calculate proportional allocation
        if hourly_generation > 0:
            pv_share = hourly_pv / hourly_generation
            pv_direct_consumption = direct_consumption * pv_share
            wind_direct_consumption = direct_consumption * (1 - pv_share)

            pv_self_consumption += pv_direct_consumption
            wind_self_consumption += wind_direct_consumption

        net_generation = hourly_generation - direct_consumption

        if hourly_demand > hourly_generation:
            discharge_demand = hourly_demand - hourly_generation
            dischargeable = min(battery_charge, discharge_demand)
            battery_charge -= dischargeable
            hourly_direct_consumption += dischargeable

            if discharge_demand > dischargeable:
                energy_from_grid += discharge_demand - dischargeable

        if net_generation > 0:
            space_in_battery = battery_size - battery_charge
            charge_amount = min(net_generation, space_in_battery)
            battery_charge += charge_amount

            remaining_generation = net_generation - charge_amount
            if remaining_generation > 0:
                hourly_energy_to_grid[i] = remaining_generation

                # Calculate export by source
                if hourly_generation > 0:
                    pv_share = hourly_pv / hourly_generation
                    pv_export += remaining_generation * pv_share
                    wind_export += remaining_generation * (1 - pv_share)

    energy_to_grid = sum(hourly_energy_to_grid)
    pv_total_generation = sum(pv_generation)
    wind_total_generation = sum(wind_generation)
    total_renewable_generation = pv_total_generation + wind_total_generation
    total_self_consumption = hourly_direct_consumption

    return {
        'self_consumption_ratio': total_self_consumption / total_renewable_generation if total_renewable_generation > 0 else 0,
        'self_sufficiency_ratio': total_self_consumption / total_demand if total_demand > 0 else 0,
        'energy_from_grid': energy_from_grid,
        'hourly_energy_to_grid': hourly_energy_to_grid,
        'energy_to_grid': energy_to_grid,
        'pv_self_consumption': pv_self_consumption,
        'wind_self_consumption': wind_self_consumption,
        'pv_self_consumption_ratio': pv_self_consumption / pv_total_generation if pv_total_generation > 0 else 0,
        'wind_self_consumption_ratio': wind_self_consumption / wind_total_generation if wind_total_generation > 0 else 0,
        'pv_export': pv_export,
        'wind_export': wind_export,
        'total_generation': total_renewable_generation
    }


def calculate_npv_with_cash_flows(
    pv_size: float,
    wind_size: float,
    battery_size: float,
    annual_demand: float,
    load_profile: List[float],
    export_tariff_profile: List[float],
    pv_generation: List[float],
    wind_generation: List[float],
    cost_params: Dict[str, float]
) -> Dict[str, Any]:
    """
    Calculate NPV and detailed cash flows over 20-year project lifetime.

    Args:
        pv_size: PV system size in kWp
        wind_size: Wind turbine size in kW
        battery_size: Battery size in kWh
        annual_demand: Annual demand in kWh
        load_profile: 8760 hourly load values
        export_tariff_profile: 8760 hourly export tariff values
        pv_generation: 8760 hourly PV generation values
        wind_generation: 8760 hourly wind generation values
        cost_params: Dictionary of cost parameters

    Returns:
        Dictionary containing NPV and cash flow data
    """
    pv_cost = cost_params['pv_cost']
    wind_cost = cost_params['wind_cost']
    battery_cost = cost_params['battery_cost']
    electricity_price = cost_params['electricity_price']
    pv_om_cost = cost_params['pv_om_cost']
    wind_om_cost = cost_params['wind_om_cost']
    discount_rate = cost_params['discount_rate']

    grid_only_annual_cost = annual_demand * electricity_price

    # Simulate energy flow
    energy_flow = simulate_energy_flow(load_profile, pv_generation, wind_generation, battery_size)

    # Calculate annual feed-in revenue
    annual_feed_in_revenue = 0.0
    for hour in range(HOURS_IN_YEAR):
        hourly_export_tariff = export_tariff_profile[hour]
        energy_exported = energy_flow['hourly_energy_to_grid'][hour]
        annual_feed_in_revenue += energy_exported * hourly_export_tariff

    # Calculate costs
    initial_investment = (pv_size * pv_cost) + (wind_size * wind_cost) + (battery_size * battery_cost)
    battery_replacement_year = 8

    annual_grid_savings = grid_only_annual_cost - energy_flow['energy_from_grid'] * electricity_price
    annual_pv_om_costs = pv_om_cost * pv_size
    annual_wind_om_costs = wind_om_cost * wind_size
    annual_om_costs = annual_pv_om_costs + annual_wind_om_costs

    cumulative_npv = -initial_investment

    cash_flows = [{
        'year': 0,
        'cash_flow': -initial_investment,
        'cumulative_npv': -initial_investment,
        'grid_savings': 0,
        'feed_in_revenue': 0,
        'operational_costs': 0,
        'battery_replacement': 0
    }]

    # Calculate annual cash flows over 20 years
    for year in range(1, 21):
        battery_replacement_cost = 0
        if year == battery_replacement_year or year == battery_replacement_year * 2:
            battery_replacement_cost = battery_size * battery_cost * 0.8

        cash_flow = annual_grid_savings + annual_feed_in_revenue - annual_om_costs - battery_replacement_cost
        discounted_cash_flow = cash_flow / ((1 + discount_rate) ** year)
        cumulative_npv += discounted_cash_flow

        cash_flows.append({
            'year': year,
            'grid_savings': annual_grid_savings,
            'feed_in_revenue': annual_feed_in_revenue,
            'operational_costs': annual_om_costs,
            'battery_replacement': battery_replacement_cost,
            'cash_flow': cash_flow,
            'discounted_cash_flow': discounted_cash_flow,
            'cumulative_npv': cumulative_npv
        })

    return {
        'npv': cumulative_npv,
        'cash_flows': cash_flows,
        'pv_self_consumption': energy_flow['pv_self_consumption'],
        'wind_self_consumption': energy_flow['wind_self_consumption'],
        'pv_export': energy_flow['pv_export'],
        'wind_export': energy_flow['wind_export'],
        'energy_flow': energy_flow
    }


def run_optimization(
    strategy: str,
    system_params: Dict[str, Any],
    cost_params: Dict[str, float],
    load_profile: List[float],
    export_tariff_profile: List[float],
    normalized_pv_generation: Optional[List[float]] = None,
    normalized_wind_generation: Optional[List[float]] = None
) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    """
    Run grid search optimization to find optimal system design.

    Args:
        strategy: 'selfConsumption' or 'npv'
        system_params: System parameters dictionary
        cost_params: Cost parameters dictionary
        load_profile: 8760 hourly load values
        export_tariff_profile: 8760 hourly export tariff values
        normalized_pv_generation: Optional custom PV profile (in W)
        normalized_wind_generation: Optional custom wind profile (in W)

    Returns:
        Tuple of (best_design, cash_flows)
    """
    max_pv_size = system_params['max_pv_size']
    max_wind_size = system_params['max_wind_size']
    max_battery_size = system_params['max_battery_size']
    annual_demand = system_params['annual_demand']

    step_count = 5
    pv_sizes = [max_pv_size * i / step_count for i in range(step_count + 1)]
    wind_sizes = [max_wind_size * i / step_count for i in range(step_count + 1)]
    battery_sizes = [max_battery_size * i / step_count for i in range(step_count + 1)]

    best_design = {
        'pv_size': 0,
        'wind_size': 0,
        'battery_size': 0,
        'self_consumption_ratio': 0,
        'self_sufficiency_ratio': 0,
        'npv': float('-inf'),
        'pv_self_consumption': 0,
        'wind_self_consumption': 0,
        'pv_export': 0,
        'wind_export': 0,
        'total_generation': 0
    }
    best_cash_flows = None

    # Generate base profiles (for 1 kW/kWp)
    if normalized_pv_generation is not None:
        base_pv_generation = [g / 1000 for g in normalized_pv_generation]
    else:
        base_pv_generation = simulate_pv_generation(1)

    if normalized_wind_generation is not None:
        base_wind_generation = [g / 1000 for g in normalized_wind_generation]
    else:
        base_wind_generation = simulate_wind_generation(1)

    # Grid search
    for pv_size in pv_sizes:
        scaled_pv_generation = [g * pv_size for g in base_pv_generation]

        for wind_size in wind_sizes:
            scaled_wind_generation = [g * wind_size for g in base_wind_generation]

            for battery_size in battery_sizes:
                energy_flow = simulate_energy_flow(
                    load_profile,
                    scaled_pv_generation,
                    scaled_wind_generation,
                    battery_size
                )

                npv_result = calculate_npv_with_cash_flows(
                    pv_size,
                    wind_size,
                    battery_size,
                    annual_demand,
                    load_profile,
                    export_tariff_profile,
                    scaled_pv_generation,
                    scaled_wind_generation,
                    cost_params
                )

                if strategy == 'selfConsumption':
                    objective_score = energy_flow['self_consumption_ratio']
                    best_score = best_design['self_consumption_ratio']
                else:
                    objective_score = npv_result['npv']
                    best_score = best_design['npv']

                if objective_score > best_score:
                    best_design = {
                        'pv_size': pv_size,
                        'wind_size': wind_size,
                        'battery_size': battery_size,
                        'self_consumption_ratio': energy_flow['self_consumption_ratio'],
                        'self_sufficiency_ratio': energy_flow['self_sufficiency_ratio'],
                        'npv': npv_result['npv'],
                        'pv_self_consumption': npv_result['pv_self_consumption'],
                        'wind_self_consumption': npv_result['wind_self_consumption'],
                        'pv_export': npv_result['pv_export'],
                        'wind_export': npv_result['wind_export'],
                        'total_generation': energy_flow['total_generation']
                    }
                    best_cash_flows = npv_result['cash_flows']

    return best_design, best_cash_flows


def run_simulation(
    pv_size: float,
    wind_size: float,
    battery_size: float,
    system_params: Dict[str, Any],
    cost_params: Dict[str, float],
    load_profile: List[float],
    export_tariff_profile: List[float],
    normalized_pv_generation: Optional[List[float]] = None,
    normalized_wind_generation: Optional[List[float]] = None
) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    """
    Run simulation for a specific system configuration.

    Args:
        pv_size: PV size in kWp
        wind_size: Wind turbine size in kW
        battery_size: Battery size in kWh
        system_params: System parameters dictionary
        cost_params: Cost parameters dictionary
        load_profile: 8760 hourly load values
        export_tariff_profile: 8760 hourly export tariff values
        normalized_pv_generation: Optional custom PV profile (in W)
        normalized_wind_generation: Optional custom wind profile (in W)

    Returns:
        Tuple of (design_result, cash_flows)
    """
    annual_demand = system_params['annual_demand']

    # Generate or scale PV generation
    if normalized_pv_generation is not None:
        pv_generation = [g / 1000 * pv_size for g in normalized_pv_generation]
    else:
        pv_generation = simulate_pv_generation(pv_size)

    # Generate or scale wind generation
    if normalized_wind_generation is not None:
        wind_generation = [g / 1000 * wind_size for g in normalized_wind_generation]
    else:
        wind_generation = simulate_wind_generation(wind_size)

    # Simulate energy flow
    energy_flow = simulate_energy_flow(load_profile, pv_generation, wind_generation, battery_size)

    # Calculate NPV
    npv_result = calculate_npv_with_cash_flows(
        pv_size,
        wind_size,
        battery_size,
        annual_demand,
        load_profile,
        export_tariff_profile,
        pv_generation,
        wind_generation,
        cost_params
    )

    design = {
        'pv_size': pv_size,
        'wind_size': wind_size,
        'battery_size': battery_size,
        'self_consumption_ratio': energy_flow['self_consumption_ratio'],
        'self_sufficiency_ratio': energy_flow['self_sufficiency_ratio'],
        'npv': npv_result['npv'],
        'pv_self_consumption': npv_result['pv_self_consumption'],
        'wind_self_consumption': npv_result['wind_self_consumption'],
        'pv_export': npv_result['pv_export'],
        'wind_export': npv_result['wind_export'],
        'total_generation': energy_flow['total_generation']
    }

    return design, npv_result['cash_flows']


def generate_daily_profile_data(
    day_start: int,
    pv_size: float,
    wind_size: float,
    battery_size: float,
    load_profile: List[float],
    export_tariff_profile: List[float],
    normalized_pv_generation: Optional[List[float]] = None,
    normalized_wind_generation: Optional[List[float]] = None
) -> List[Dict[str, Any]]:
    """
    Generate 24-hour profile data for charts.

    Args:
        day_start: Starting hour index (e.g., 3624 for June, 8040 for December)
        pv_size: PV size in kWp
        wind_size: Wind turbine size in kW
        battery_size: Battery capacity in kWh
        load_profile: 8760 hourly load values
        export_tariff_profile: 8760 hourly export tariff values
        normalized_pv_generation: Optional custom PV profile (in W)
        normalized_wind_generation: Optional custom wind profile (in W)

    Returns:
        List of 24 hourly data points
    """
    # Generate profiles
    if normalized_pv_generation is not None:
        pv_profile = [g / 1000 * pv_size for g in normalized_pv_generation]
    else:
        pv_profile = simulate_pv_generation(pv_size)

    if normalized_wind_generation is not None:
        wind_profile = [g / 1000 * wind_size for g in normalized_wind_generation]
    else:
        wind_profile = simulate_wind_generation(wind_size)

    battery_charge = 0.0
    data = []

    for i in range(24):
        hour_index = day_start + i

        demand = load_profile[hour_index]
        pv_generation = pv_profile[hour_index]
        wind_generation = wind_profile[hour_index]
        total_generation = pv_generation + wind_generation

        # Calculate battery state
        net_generation = total_generation - demand
        if net_generation > 0:
            space_in_battery = battery_size - battery_charge
            charge_amount = min(net_generation, space_in_battery)
            battery_charge += charge_amount
        else:
            discharge_demand = -net_generation
            dischargeable = min(battery_charge, discharge_demand)
            battery_charge -= dischargeable

        data.append({
            'hour': i,
            'demand': demand,
            'pv_generation': pv_generation,
            'wind_generation': wind_generation,
            'total_generation': total_generation,
            'battery_charge': battery_charge,
            'grid_tariff': export_tariff_profile[hour_index]
        })

    return data
