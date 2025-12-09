/**
 * API service for communicating with the FastAPI backend
 */

// Use relative URL for Docker (nginx proxy) or localhost for development
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Generic fetch wrapper with error handling
 */
async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = await fetch(url, { ...defaultOptions, ...options });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP error ${response.status}`);
  }

  return response.json();
}

/**
 * Generate a synthetic load profile
 */
export async function generateLoadProfile(annualDemand, loadType) {
  return fetchApi('/generate-load-profile', {
    method: 'POST',
    body: JSON.stringify({
      annual_demand: annualDemand,
      load_type: loadType,
    }),
  });
}

/**
 * Generate an export tariff profile
 */
export async function generateExportTariff(baseExportPrice, exportProfileType) {
  return fetchApi('/generate-export-tariff', {
    method: 'POST',
    body: JSON.stringify({
      base_export_price: baseExportPrice,
      export_profile_type: exportProfileType,
    }),
  });
}

/**
 * Run optimization
 */
export async function runOptimization(params) {
  const {
    systemParams,
    costParams,
    exportParams,
    customProfiles,
    strategy,
  } = params;

  return fetchApi('/optimize', {
    method: 'POST',
    body: JSON.stringify({
      system_params: {
        annual_demand: systemParams.annualDemand,
        max_pv_size: systemParams.maxPVSize,
        max_wind_size: systemParams.maxWindSize,
        max_battery_size: systemParams.maxBatterySize,
        load_type: systemParams.loadType,
      },
      cost_params: {
        pv_cost: costParams.pvCost,
        wind_cost: costParams.windCost,
        battery_cost: costParams.batteryCost,
        electricity_price: costParams.electricityPrice,
        pv_om_cost: costParams.PVOMCost,
        wind_om_cost: costParams.windOMCost,
        discount_rate: costParams.discountRate,
      },
      export_params: {
        base_export_price: exportParams.baseExportPrice,
        export_profile_type: exportParams.exportProfileType,
        custom_export_profile: exportParams.customExportProfile,
      },
      custom_profiles: {
        demand_profile: customProfiles.demandProfile,
        pv_generation_profile: customProfiles.pvGenerationProfile,
        wind_generation_profile: customProfiles.windGenerationProfile,
      },
      strategy: strategy,
    }),
  });
}

/**
 * Run simulation for specific system configuration
 */
export async function runSimulation(params) {
  const {
    systemParams,
    costParams,
    exportParams,
    customProfiles,
    pvSize,
    windSize,
    batterySize,
  } = params;

  return fetchApi('/simulate', {
    method: 'POST',
    body: JSON.stringify({
      system_params: {
        annual_demand: systemParams.annualDemand,
        max_pv_size: systemParams.maxPVSize,
        max_wind_size: systemParams.maxWindSize,
        max_battery_size: systemParams.maxBatterySize,
        load_type: systemParams.loadType,
      },
      cost_params: {
        pv_cost: costParams.pvCost,
        wind_cost: costParams.windCost,
        battery_cost: costParams.batteryCost,
        electricity_price: costParams.electricityPrice,
        pv_om_cost: costParams.PVOMCost,
        wind_om_cost: costParams.windOMCost,
        discount_rate: costParams.discountRate,
      },
      export_params: {
        base_export_price: exportParams.baseExportPrice,
        export_profile_type: exportParams.exportProfileType,
        custom_export_profile: exportParams.customExportProfile,
      },
      custom_profiles: {
        demand_profile: customProfiles.demandProfile,
        pv_generation_profile: customProfiles.pvGenerationProfile,
        wind_generation_profile: customProfiles.windGenerationProfile,
      },
      pv_size: pvSize,
      wind_size: windSize,
      battery_size: batterySize,
    }),
  });
}

/**
 * Upload a CSV file and parse it
 */
export async function uploadProfile(file, profileType) {
  const formData = new FormData();
  formData.append('file', file);

  const endpoints = {
    demand: '/upload/demand-profile',
    pv: '/upload/pv-generation-profile',
    wind: '/upload/wind-generation-profile',
    exportTariff: '/upload/export-tariff-profile',
  };

  const endpoint = endpoints[profileType];
  if (!endpoint) {
    throw new Error(`Unknown profile type: ${profileType}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP error ${response.status}`);
  }

  return response.json();
}

/**
 * Transform backend response to frontend format
 */
export function transformOptimizationResponse(response) {
  return {
    optimizedDesign: {
      pvSize: response.optimized_design.pv_size,
      windSize: response.optimized_design.wind_size,
      batterySize: response.optimized_design.battery_size,
      selfConsumptionRatio: response.optimized_design.self_consumption_ratio,
      selfSufficiencyRatio: response.optimized_design.self_sufficiency_ratio,
      npv: response.optimized_design.npv,
      pvSelfConsumption: response.optimized_design.pv_self_consumption,
      windSelfConsumption: response.optimized_design.wind_self_consumption,
      pvExport: response.optimized_design.pv_export,
      windExport: response.optimized_design.wind_export,
      totalGeneration: response.optimized_design.total_generation,
    },
    cashFlows: response.cash_flows.map(cf => ({
      year: cf.year,
      gridSavings: cf.grid_savings,
      feedInRevenue: cf.feed_in_revenue,
      operationalCosts: cf.operational_costs,
      batteryReplacement: cf.battery_replacement,
      cashFlow: cf.cash_flow,
      discountedCashFlow: cf.discounted_cash_flow,
      cumulativeNPV: cf.cumulative_npv,
    })),
    dailyProfileJune: response.daily_profile_june.map(dp => ({
      hour: dp.hour,
      demand: dp.demand,
      pvGeneration: dp.pv_generation,
      windGeneration: dp.wind_generation,
      totalGeneration: dp.total_generation,
      batteryCharge: dp.battery_charge,
      gridTariff: dp.grid_tariff,
    })),
    dailyProfileDecember: response.daily_profile_december.map(dp => ({
      hour: dp.hour,
      demand: dp.demand,
      pvGeneration: dp.pv_generation,
      windGeneration: dp.wind_generation,
      totalGeneration: dp.total_generation,
      batteryCharge: dp.battery_charge,
      gridTariff: dp.grid_tariff,
    })),
    exportTariffSample: response.export_tariff_sample,
  };
}
