import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';

const generateTypicalLoadProfile = (annualDemand, loadType) => {
  const patterns = {
    residential: [
      0.6, 0.5, 0.4, 0.4, 0.4, 0.5,    // 00:00 - 05:59
      0.8, 1.2, 1.1, 0.9, 0.8, 0.8,    // 06:00 - 11:59
      0.9, 0.9, 0.8, 0.8, 0.9, 1.2,    // 12:00 - 17:59
      1.5, 1.8, 1.6, 1.3, 1.0, 0.7     // 18:00 - 23:59
    ],
    commercial: [
      0.2, 0.2, 0.2, 0.2, 0.2, 0.3,    // 00:00 - 05:59
      0.5, 1.4, 1.8, 1.9, 1.9, 1.8,    // 06:00 - 11:59
      1.7, 1.8, 1.8, 1.8, 1.7, 1.2,    // 12:00 - 17:59
      0.7, 0.4, 0.3, 0.2, 0.2, 0.2     // 18:00 - 23:59
    ]
  };

  const weeklyPattern = {
    residential: [1, 1, 1, 1, 1, 0.9, 0.8],
    commercial: [1, 1, 1, 1, 1, 0.3, 0.2]
  };

  const seasonalPattern = {
    residential: [1.2, 1.2, 1.0, 0.9, 0.8, 0.7, 0.7, 0.7, 0.8, 0.9, 1.0, 1.1],
    commercial: [1.1, 1.1, 1.0, 0.9, 0.9, 0.9, 0.9, 0.8, 0.9, 1.0, 1.1, 1.1]
  };

  let hourlyDemand = [];
  const hoursInYear = 8760;
  const avgHourlyDemand = annualDemand / hoursInYear;

  for (let hour = 0; hour < hoursInYear; hour++) {
    const dayOfWeek = Math.floor(hour / 24) % 7;
    const hourOfDay = hour % 24;
    const month = Math.floor(hour / (hoursInYear / 12));
    
    let dailyPattern, weeklyFactor, seasonalFactor;

    if (loadType === 'mixed') {
      const residentialWeight = 0.6;
      const commercialWeight = 0.4;

      dailyPattern = (patterns.residential[hourOfDay] * residentialWeight +
                     patterns.commercial[hourOfDay] * commercialWeight);
      weeklyFactor = (weeklyPattern.residential[dayOfWeek] * residentialWeight +
                     weeklyPattern.commercial[dayOfWeek] * commercialWeight);
      seasonalFactor = (seasonalPattern.residential[month] * residentialWeight +
                       seasonalPattern.commercial[month] * commercialWeight);
    } else {
      dailyPattern = patterns[loadType][hourOfDay];
      weeklyFactor = weeklyPattern[loadType][dayOfWeek];
      seasonalFactor = seasonalPattern[loadType][month];
    }

    const randomFactor = 0.9 + Math.random() * 0.2;
    const hourlyValue = avgHourlyDemand * dailyPattern * weeklyFactor * seasonalFactor * randomFactor;
    hourlyDemand.push(hourlyValue);
  }

  const sum = hourlyDemand.reduce((a, b) => a + b, 0);
  return hourlyDemand.map(value => value * (annualDemand / sum));
};

const DefaultComponent = () => {
  // Existing state variables
  const [annualDemand, setAnnualDemand] = useState(10000);
  const [maxPVSize, setMaxPVSize] = useState(10);
  const [maxBatterySize, setMaxBatterySize] = useState(20);
  const [optimizedDesign, setOptimizedDesign] = useState(null);
  const [optimizationStrategy, setOptimizationStrategy] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [cashFlowData, setCashFlowData] = useState(null);
  const [normalizedDemand, setNormalizedDemand] = useState(null);
  const [normalizedPVGeneration, setNormalizedPVGeneration] = useState(null);
  const [simulationPVSize, setSimulationPVSize] = useState(null);
  const [simulationBatterySize, setSimulationBatterySize] = useState(null);

  // New cost-related state variables
  const [pvCost, setPvCost] = useState(800); // €/kWp
  const [batteryCost, setBatteryCost] = useState(500); // €/kWh
  const [electricityPrice, setElectricityPrice] = useState(0.25); // €/kWh
  const [PVOMCost, setPVOMCost] = useState(20); // €/kWp/year
  const [discountRate, setDiscountRate] = useState(0.05); // 5%
  const [loadType, setLoadType] = useState('residential');
  const [currentLoadProfile, setCurrentLoadProfile] = useState(null);

  const [baseExportPrice, setBaseExportPrice] = useState(0.175); // Default 70% of electricity price
  const [exportProfileType, setExportProfileType] = useState('flat');
  const [customExportProfile, setCustomExportProfile] = useState(null);
  const [currentExportTariffProfile, setCurrentExportTariffProfile] = useState(null);

  // Wind-related state variables
  const [maxWindSize, setMaxWindSize] = useState(10);
  const [simulationWindSize, setSimulationWindSize] = useState(null);
  const [normalizedWindGeneration, setNormalizedWindGeneration] = useState(null);
  const [windCost, setWindCost] = useState(1200); // €/kW
  const [windOMCost, setWindOMCost] = useState(40); // €/kW/year

  useEffect(() => {
    const newExportProfile = customExportProfile || 
      generateGridExportTariffProfile(baseExportPrice, exportProfileType);
    setCurrentExportTariffProfile(newExportProfile);
  }, [baseExportPrice, exportProfileType, customExportProfile]);

  useEffect(() => {
    const newProfile = normalizedDemand || generateTypicalLoadProfile(annualDemand, loadType);
    setCurrentLoadProfile(newProfile);
  }, [annualDemand, loadType, normalizedDemand]);

  // Helper functions - FIX #4: Wrap simulatePVGeneration in useCallback
  const simulatePVGeneration = useCallback((pvSize, location = { lat: 40, lon: -75 }) => {
    const annualIrradiance = 1700;
    const cloudModel = () => Math.max(0, 1 - Math.random() * 0.3);
    
    return Array.from({ length: 8760 }, (_, hour) => {
      const dayOfYear = Math.floor(hour / 24);
      const seasonalFactor = Math.sin((dayOfYear - 28) * 2 * Math.PI / 365 + Math.PI/2);
      const hourOfDay = hour % 24;
      const dailySolarCycle = Math.max(0, Math.sin((hourOfDay - 6) * Math.PI / 12));
      const cloudFactor = cloudModel();
      const baseGeneration = pvSize * annualIrradiance / 4380;
      return baseGeneration * (1 + seasonalFactor * 0.3) * dailySolarCycle * (0.7 + cloudFactor * 0.3);
    });
  }, []);

  // FIX #4: Wrap simulateWindGeneration in useCallback for consistency
  const simulateWindGeneration = useCallback((turbineSize, windProfile = null) => {
    // If a custom wind profile is provided, scale it to the turbine size
    if (windProfile) {
      const sum = windProfile.reduce((a, b) => a + b, 0);
      const scaleFactor = (turbineSize * 8760) / sum; // Scale to match annual generation
      return windProfile.map(value => value * scaleFactor);
    }

    // Otherwise generate a synthetic wind profile
    const hoursInYear = 8760;
    const avgWindSpeed = 6; // m/s
    let hourlyGeneration = [];

    // Seasonal patterns - windier in winter, less in summer
    const seasonalPattern = [
      1.3, 1.2, 1.1, 0.9, 0.8, 0.7, 0.7, 0.8, 0.9, 1.0, 1.1, 1.3
    ];
    
    // Diurnal pattern - often windier at night
    const diurnalPattern = [
      1.2, 1.2, 1.2, 1.1, 1.1, 1.0,    // 00:00 - 05:59
      0.9, 0.8, 0.7, 0.7, 0.8, 0.8,    // 06:00 - 11:59
      0.9, 0.9, 1.0, 1.0, 1.1, 1.1,    // 12:00 - 17:59
      1.1, 1.2, 1.2, 1.2, 1.2, 1.2     // 18:00 - 23:59
    ];

    // Wind turbine power curve approximation
    const powerCurve = (windSpeed) => {
      const cutIn = 3.0; // Cut-in wind speed
      const rated = 12.0; // Rated wind speed
      const cutOut = 25.0; // Cut-out wind speed
      
      if (windSpeed < cutIn || windSpeed > cutOut) {
        return 0;
      } else if (windSpeed >= rated) {
        return 1;
      } else {
        // Cubic relationship between cut-in and rated
        return Math.pow((windSpeed - cutIn) / (rated - cutIn), 3);
      }
    };

    for (let hour = 0; hour < hoursInYear; hour++) {
      const month = Math.floor(hour / (hoursInYear / 12));
      const hourOfDay = hour % 24;
      
      // Base wind speed with seasonal and diurnal patterns
      const seasonalFactor = seasonalPattern[month];
      const diurnalFactor = diurnalPattern[hourOfDay];
      
      // Add random turbulence and gusts
      const turbulenceFactor = 0.7 + Math.random() * 0.6; // Random factor between 0.7 and 1.3
      
      // Calculate wind speed for this hour
      const windSpeed = avgWindSpeed * seasonalFactor * diurnalFactor * turbulenceFactor;
      
      // Convert wind speed to power output using power curve
      const powerOutput = powerCurve(windSpeed) * turbineSize;
      
      hourlyGeneration.push(powerOutput);
    }

    return hourlyGeneration;
  }, []);

  const generateGridExportTariffProfile = (baseExportPrice, profileType) => {
    const hoursInYear = 8760;
    let hourlyTariffs = new Array(hoursInYear);
    
    if (profileType === 'flat') {
      // Flat rate all year
      return hourlyTariffs.fill(baseExportPrice);
    } 
    else if (profileType === 'time-of-day') {
      // Different rates by time of day
      for (let hour = 0; hour < hoursInYear; hour++) {
        const hourOfDay = hour % 24;
        
        // Peak hours (9am-3pm) get higher rates
        if (hourOfDay >= 9 && hourOfDay < 15) {
          hourlyTariffs[hour] = baseExportPrice * 1.2; // 20% premium
        }
        // Evening hours (6pm-9pm) get lower rates
        else if (hourOfDay >= 18 && hourOfDay < 21) {
          hourlyTariffs[hour] = baseExportPrice * 0.8; // 20% discount
        }
        // All other hours get base rate
        else {
          hourlyTariffs[hour] = baseExportPrice;
        }
      }
    }
    else if (profileType === 'seasonal') {
      // Different rates by season
      for (let hour = 0; hour < hoursInYear; hour++) {
        const month = Math.floor(hour / (hoursInYear / 12));
        
        // Summer months (May-Aug, indexes 4-7) get lower rates (more PV production)
        if (month >= 4 && month <= 7) {
          hourlyTariffs[hour] = baseExportPrice * 0.7; // 30% lower in summer
        }
        // Winter months (Nov-Feb, indexes 10-11, 0-1) get higher rates (less PV production)
        else if (month >= 10 || month <= 1) {
          hourlyTariffs[hour] = baseExportPrice * 1.3; // 30% higher in winter
        }
        // Spring/Fall months get base rate
        else {
          hourlyTariffs[hour] = baseExportPrice;
        }
      }
    }
    else if (profileType === 'dynamic') {
      // Combination of time-of-day and seasonal factors
      for (let hour = 0; hour < hoursInYear; hour++) {
        const hourOfDay = hour % 24;
        const month = Math.floor(hour / (hoursInYear / 12));
        
        // Start with base price
        let price = baseExportPrice;
        
        // Apply time-of-day factors
        if (hourOfDay >= 9 && hourOfDay < 15) {
          price *= 1.1; // 10% premium during daytime
        } else if (hourOfDay >= 18 && hourOfDay < 21) {
          price *= 0.9; // 10% discount during evening peak
        }
        
        // Apply seasonal factors
        if (month >= 4 && month <= 7) {
          price *= 0.8; // 20% discount in summer
        } else if (month >= 10 || month <= 1) {
          price *= 1.2; // 20% premium in winter
        }
        
        // Add small random variation (±5%)
        const randomFactor = 0.95 + Math.random() * 0.1;
        price *= randomFactor;
        
        hourlyTariffs[hour] = price;
      }
    }
    
    return hourlyTariffs;
  };

  // FIX #1: Updated simulateEnergyFlow with corrected self-consumption ratio
  const simulateEnergyFlow = useCallback((demand, pvGeneration, windGeneration, batterySize) => {
    let batteryCharge = 0;
    let hourlyDirectConsumption = 0;
    let totalDemand = 0;
    let energyFromGrid = 0;
    let hourlyEnergyToGrid = new Array(demand.length).fill(0);
    let pvSelfConsumption = 0;
    let windSelfConsumption = 0;
    let pvExport = 0;
    let windExport = 0;

    // Combine PV and wind generation
    const totalGeneration = pvGeneration.map((pv, i) => pv + windGeneration[i]);

    for (let i = 0; i < demand.length; i++) {
      const hourlyDemand = demand[i];
      const hourlyPV = pvGeneration[i];
      const hourlyWind = windGeneration[i];
      const hourlyGeneration = totalGeneration[i];
      totalDemand += hourlyDemand;
      
      const directConsumption = Math.min(hourlyDemand, hourlyGeneration);
      hourlyDirectConsumption += directConsumption;
      
      // Calculate how much of each source is directly consumed
      // Proportional allocation based on generation amounts
      if (hourlyGeneration > 0) {
        const pvShare = hourlyPV / hourlyGeneration;
        const pvDirectConsumption = directConsumption * pvShare;
        const windDirectConsumption = directConsumption * (1 - pvShare);
        
        pvSelfConsumption += pvDirectConsumption;
        windSelfConsumption += windDirectConsumption;
      }
      
      const netGeneration = hourlyGeneration - directConsumption;

      if (hourlyDemand > hourlyGeneration) {
        const dischargeDemand = hourlyDemand - hourlyGeneration;
        const dischargeable = Math.min(batteryCharge, dischargeDemand);
        batteryCharge -= dischargeable;
        hourlyDirectConsumption += dischargeable;
        
        if (dischargeDemand > dischargeable) {
          energyFromGrid += dischargeDemand - dischargeable;
        }
      }

      if (netGeneration > 0) {
        const spaceInBattery = batterySize - batteryCharge;
        const chargeAmount = Math.min(netGeneration, spaceInBattery);
        batteryCharge += chargeAmount;
        
        const remainingGeneration = netGeneration - chargeAmount;
        if (remainingGeneration > 0) {
          hourlyEnergyToGrid[i] = remainingGeneration;
          
          // Calculate export by source (proportional allocation)
          if (hourlyGeneration > 0) {
            const pvShare = hourlyPV / hourlyGeneration;
            pvExport += remainingGeneration * pvShare;
            windExport += remainingGeneration * (1 - pvShare);
          }
        }
      }
    }

    const energyToGrid = hourlyEnergyToGrid.reduce((sum, value) => sum + value, 0);
    const pvTotalGeneration = pvGeneration.reduce((sum, value) => sum + value, 0);
    const windTotalGeneration = windGeneration.reduce((sum, value) => sum + value, 0);
    const totalRenewableGeneration = pvTotalGeneration + windTotalGeneration;
    const totalSelfConsumption = hourlyDirectConsumption;

    // FIX #1: Corrected self-consumption ratio calculation
    // Self-consumption ratio = percentage of generation that is consumed on-site
    // Alternative: percentage of demand met by self-generation = totalSelfConsumption / totalDemand
    return { 
      selfConsumptionRatio: totalRenewableGeneration > 0 
        ? totalSelfConsumption / totalRenewableGeneration 
        : 0,
      selfSufficiencyRatio: totalDemand > 0 
        ? totalSelfConsumption / totalDemand 
        : 0,
      energyFromGrid,
      hourlyEnergyToGrid,
      energyToGrid,
      pvSelfConsumption,
      windSelfConsumption,
      pvSelfConsumptionRatio: pvTotalGeneration > 0 ? pvSelfConsumption / pvTotalGeneration : 0,
      windSelfConsumptionRatio: windTotalGeneration > 0 ? windSelfConsumption / windTotalGeneration : 0,
      pvExport,
      windExport,
      totalGeneration: totalRenewableGeneration
    };
  }, []);

  // FIX #5: Add null check for currentExportTariffProfile
  const calculateNPVWithCashFlows = useCallback((pvSize, windSize, batterySize, annualDemand) => {
    // Early return if required profiles are not ready
    if (!currentLoadProfile || !currentExportTariffProfile) {
      return { npv: 0, cashFlows: [], pvSelfConsumption: 0, windSelfConsumption: 0, pvExport: 0, windExport: 0 };
    }

    const gridOnlyAnnualCost = annualDemand * electricityPrice;
    
    // Generate or use provided profiles
    const pvGeneration = normalizedPVGeneration 
      ? normalizedPVGeneration.map(g => g / 1000 * pvSize) 
      : simulatePVGeneration(pvSize);
    
    const windGeneration = normalizedWindGeneration 
      ? normalizedWindGeneration.map(g => g / 1000 * windSize) 
      : simulateWindGeneration(windSize);
    
    const { 
      energyFromGrid, 
      hourlyEnergyToGrid, 
      pvSelfConsumption, 
      windSelfConsumption,
      pvExport,
      windExport
    } = simulateEnergyFlow(
      currentLoadProfile,
      pvGeneration,
      windGeneration,
      batterySize
    );

    let annualFeedInRevenue = 0;
    const hoursPerTimestep = 1;
    for (let hour = 0; hour < 8760; hour++) {
      const hourlyExportTariff = currentExportTariffProfile[hour];
      const powerExportedInKW = hourlyEnergyToGrid[hour];
      const energyExportedInKWh = powerExportedInKW * hoursPerTimestep;
      const revenue = energyExportedInKWh * hourlyExportTariff;
      annualFeedInRevenue += revenue;
    }

    // Calculate costs and investments
    const initialInvestment = (pvSize * pvCost) + (windSize * windCost) + (batterySize * batteryCost);
    const batteryReplacementYear = 8;
    
    const annualGridSavings = (gridOnlyAnnualCost - energyFromGrid * electricityPrice);
    const annualPVOMCosts = PVOMCost * pvSize;
    const annualWindOMCosts = windOMCost * windSize;
    const annualOMCosts = annualPVOMCosts + annualWindOMCosts;
      
    let cumulativeNPV = -initialInvestment;
    
    const cashFlows = [{
      year: 0,
      cashFlow: -initialInvestment,
      cumulativeNPV: -initialInvestment,
      gridSavings: 0,
      feedInRevenue: 0,
      operationalCosts: 0,
      batteryReplacement: 0
    }];

    // Calculate annual cash flows over project lifetime (20 years)
    for (let year = 1; year <= 20; year++) {
      let batteryReplacementCost = 0;
      if (year === batteryReplacementYear || year === batteryReplacementYear * 2) {
        batteryReplacementCost = batterySize * batteryCost * 0.8;
      }
      
      const cashFlow = annualGridSavings + annualFeedInRevenue - annualOMCosts - batteryReplacementCost;
      const discountedCashFlow = cashFlow / Math.pow(1 + discountRate, year);
      cumulativeNPV += discountedCashFlow;

      cashFlows.push({
        year,
        gridSavings: annualGridSavings,
        feedInRevenue: annualFeedInRevenue,
        operationalCosts: annualOMCosts,
        batteryReplacement: batteryReplacementCost,
        cashFlow,
        discountedCashFlow,
        cumulativeNPV
      });
    }

    return {
      npv: cumulativeNPV,
      cashFlows,
      pvSelfConsumption,
      windSelfConsumption,
      pvExport,
      windExport
    };
  }, [
    pvCost, 
    windCost,
    batteryCost, 
    electricityPrice, 
    PVOMCost, 
    windOMCost,
    discountRate, 
    simulatePVGeneration,
    simulateWindGeneration,
    simulateEnergyFlow, 
    currentExportTariffProfile,
    normalizedPVGeneration,
    normalizedWindGeneration,
    currentLoadProfile
  ]);

  const handleExportTariffFile = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const text = await file.text();
      Papa.parse(text, {
        complete: (results) => {
          const values = results.data.flat().filter(x => !isNaN(x)).map(Number);
          if (values.length === 8760) {
            setCustomExportProfile(values);
            setExportProfileType('custom');
          } else {
            alert('Export tariff profile should contain 8760 hourly values');
          }
        },
        skipEmptyLines: true
      });
    }
  };

  const handleWindGenerationFile = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const text = await file.text();
      Papa.parse(text, {
        complete: (results) => {
          const values = results.data.flat().filter(x => !isNaN(x)).map(Number);
          if (values.length === 8760) {
            setNormalizedWindGeneration(values);
          } else {
            alert('Wind generation file should contain 8760 hourly values');
          }
        },
        skipEmptyLines: true
      });
    }
  };

  const runOptimization = useCallback((strategy) => {
    if (!currentLoadProfile || !currentExportTariffProfile) {
      alert('Please wait for profiles to initialize');
      return;
    }

    setIsCalculating(true);
    setOptimizationStrategy(strategy);
    
    // Set up the grid search parameters
    const stepCount = 5; // Reduce steps for 3D search to keep runtime reasonable
    const pvSizes = [...Array(stepCount + 1)].map((_, i) => maxPVSize * i / stepCount);
    const windSizes = [...Array(stepCount + 1)].map((_, i) => maxWindSize * i / stepCount);
    const batterySizes = [...Array(stepCount + 1)].map((_, i) => maxBatterySize * i / stepCount);
    
    let bestDesign = { 
      pvSize: 0, 
      windSize: 0, 
      batterySize: 0, 
      selfConsumptionRatio: 0,
      selfSufficiencyRatio: 0,
      npv: -Infinity,
      pvSelfConsumption: 0,
      windSelfConsumption: 0,
      pvExport: 0,
      windExport: 0,
      totalGeneration: 0
    };
    let bestCashFlows = null;

    // Generate base profiles once
    const basePVGeneration = normalizedPVGeneration 
      ? normalizedPVGeneration.map(g => g / 1000)
      : simulatePVGeneration(1);
    
    const baseWindGeneration = normalizedWindGeneration
      ? normalizedWindGeneration.map(g => g / 1000)
      : simulateWindGeneration(1);

    // Grid search through all combinations
    pvSizes.forEach(pvSize => {
      const scaledPVGeneration = basePVGeneration.map(g => g * pvSize);
      
      windSizes.forEach(windSize => {
        const scaledWindGeneration = baseWindGeneration.map(g => g * windSize);
        
        batterySizes.forEach(batterySize => {
          const { 
            selfConsumptionRatio,
            selfSufficiencyRatio,
            pvSelfConsumption,
            windSelfConsumption,
            pvExport,
            windExport,
            totalGeneration
          } = simulateEnergyFlow(
            currentLoadProfile, 
            scaledPVGeneration, 
            scaledWindGeneration, 
            batterySize
          );
          
          const { npv, cashFlows } = calculateNPVWithCashFlows(
            pvSize, 
            windSize, 
            batterySize, 
            annualDemand
          );
          
          const objectiveScore = strategy === 'selfConsumption' ? selfConsumptionRatio : npv;
          
          if (objectiveScore > (strategy === 'selfConsumption' ? bestDesign.selfConsumptionRatio : bestDesign.npv)) {
            bestDesign = { 
              pvSize, 
              windSize, 
              batterySize, 
              selfConsumptionRatio,
              selfSufficiencyRatio,
              npv,
              pvSelfConsumption,
              windSelfConsumption,
              pvExport,
              windExport,
              totalGeneration
            };
            bestCashFlows = cashFlows;
          }
        });
      });
    });

    setOptimizedDesign(bestDesign);
    setCashFlowData(bestCashFlows);
    setIsCalculating(false);
  }, [
    annualDemand,
    maxPVSize,
    maxWindSize,
    maxBatterySize,
    currentLoadProfile,
    currentExportTariffProfile,
    normalizedPVGeneration,
    normalizedWindGeneration,
    simulatePVGeneration,
    simulateWindGeneration,
    simulateEnergyFlow,
    calculateNPVWithCashFlows
  ]);

  // FIX #6: Add simulationWindSize to validation
  const runSimulation = useCallback(() => {
    if (!currentLoadProfile || !currentExportTariffProfile) {
      alert('Please wait for profiles to initialize');
      return;
    }

    setIsCalculating(true);
    setOptimizationStrategy('simulation');
    
    // Use 0 as default for wind size if not specified
    const windSize = simulationWindSize || 0;
    
    // Scale generation profiles by sizes
    const pvGeneration = normalizedPVGeneration 
      ? normalizedPVGeneration.map(g => g / 1000 * simulationPVSize) 
      : simulatePVGeneration(simulationPVSize);
    
    const windGeneration = normalizedWindGeneration 
      ? normalizedWindGeneration.map(g => g / 1000 * windSize) 
      : simulateWindGeneration(windSize);
    
    // Calculate system performance
    const { 
      selfConsumptionRatio,
      selfSufficiencyRatio,
      pvSelfConsumption,
      windSelfConsumption,
      pvExport,
      windExport,
      totalGeneration
    } = simulateEnergyFlow(
      currentLoadProfile,
      pvGeneration,
      windGeneration,
      simulationBatterySize
    );
    
    const { npv, cashFlows } = calculateNPVWithCashFlows(
      simulationPVSize, 
      windSize, 
      simulationBatterySize, 
      annualDemand
    );
    
    // Set results
    setOptimizedDesign({
      pvSize: simulationPVSize,
      windSize: windSize,
      batterySize: simulationBatterySize,
      selfConsumptionRatio,
      selfSufficiencyRatio,
      npv,
      pvSelfConsumption,
      windSelfConsumption,
      pvExport,
      windExport,
      totalGeneration
    });
    setCashFlowData(cashFlows);
    setIsCalculating(false);
  }, [
    annualDemand,
    simulationPVSize,
    simulationWindSize,
    simulationBatterySize,
    currentLoadProfile,
    currentExportTariffProfile,
    normalizedPVGeneration,
    normalizedWindGeneration,
    simulatePVGeneration,
    simulateWindGeneration,
    simulateEnergyFlow,
    calculateNPVWithCashFlows
  ]);

  // File handling functions
  const handleDemandFile = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const text = await file.text();
      Papa.parse(text, {
        complete: (results) => {
          const values = results.data.flat().filter(x => !isNaN(x)).map(Number);
          if (values.length === 8760) {
            setNormalizedDemand(values);
          } else {
            alert('Demand file should contain 8760 hourly values');
          }
        },
        skipEmptyLines: true
      });
    }
  };

  const handleGenerationFile = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const text = await file.text();
      Papa.parse(text, {
        complete: (results) => {
          const values = results.data.flat().filter(x => !isNaN(x)).map(Number);
          if (values.length === 8760) {
            // Store the raw values in Watts - conversion to kW will happen during calculations
            setNormalizedPVGeneration(values);
          } else {
            alert('Generation file should contain 8760 hourly values');
          }
        },
        skipEmptyLines: true
      });
    }
  };

  // FIX #7: Removed unused variables from GenerationMixChart
  const GenerationMixChart = () => {
    const data = React.useMemo(() => {
      if (!optimizedDesign) return [];
      
      return [
        { name: 'PV', selfConsumption: optimizedDesign.pvSelfConsumption, export: optimizedDesign.pvExport },
        { name: 'Wind', selfConsumption: optimizedDesign.windSelfConsumption, export: optimizedDesign.windExport }
      ];
    }, [optimizedDesign]);
    
    return (
      <div style={{flex: '1 1 0', minWidth: '400px'}}>
        <h4 className="text-lg font-semibold mb-4">Generation Mix</h4>
        <BarChart
          width={400}
          height={250}
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis label={{ value: 'Energy (kWh)', angle: -90, position: 'insideLeft' }} />
          <Tooltip formatter={(value) => `${value.toFixed(2)} kWh`} />
          <Legend />
          <Bar dataKey="selfConsumption" name="Self-Consumed" stackId="a" fill="#10b981" />
          <Bar dataKey="export" name="Exported" stackId="a" fill="#3b82f6" />
        </BarChart>
      </div>
    );
  };

  // FIX #2 & #3: Updated DailyProfileChart with pre-computed profiles and complete dependencies
  const DailyProfileChart = ({ dayStart, title }) => {
    const data = React.useMemo(() => {
      if (!optimizedDesign || !currentLoadProfile || !currentExportTariffProfile) return [];
      
      const pvSize = optimizedDesign.pvSize;
      const windSize = optimizedDesign.windSize;
      const batterySize = optimizedDesign.batterySize;
      
      // FIX #2: Generate profiles ONCE outside the loop
      const pvProfile = normalizedPVGeneration 
        ? normalizedPVGeneration.map(g => g / 1000 * pvSize)
        : simulatePVGeneration(pvSize);
      
      const windProfile = normalizedWindGeneration
        ? normalizedWindGeneration.map(g => g / 1000 * windSize)
        : simulateWindGeneration(windSize);
      
      let batteryCharge = 0;
      
      return Array.from({length: 24}, (_, i) => {
        const hourIndex = dayStart + i;
        
        const demand = currentLoadProfile[hourIndex];
        const pvGeneration = pvProfile[hourIndex];
        const windGeneration = windProfile[hourIndex];
        const totalGeneration = pvGeneration + windGeneration;
        
        // Calculate battery state
        const netGeneration = totalGeneration - demand;
        if (netGeneration > 0) {
          const spaceInBattery = batterySize - batteryCharge;
          const chargeAmount = Math.min(netGeneration, spaceInBattery);
          batteryCharge += chargeAmount;
        } else {
          const dischargeDemand = -netGeneration;
          const dischargeable = Math.min(batteryCharge, dischargeDemand);
          batteryCharge -= dischargeable;
        }
        
        return {
          hour: i,
          demand,
          pvGeneration,
          windGeneration,
          totalGeneration,
          batteryCharge,
          gridTariff: currentExportTariffProfile[hourIndex]
        };
      });
    }, [
      optimizedDesign, 
      currentLoadProfile, 
      currentExportTariffProfile,
      normalizedPVGeneration,
      normalizedWindGeneration,
      simulatePVGeneration,
      simulateWindGeneration,
      dayStart
    ]); // FIX #3: Added missing dependencies

    return (
      <div style={{flex: '1 1 0', minWidth: '400px'}}>
        <h4 className="text-lg font-semibold mb-4">{title}</h4>
        <LineChart 
          width={400}
          height={250}
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" />
          <YAxis />
          <Tooltip 
            formatter={(value, name, props) => {
              if (name === "Grid Export Tariff") {
                return [`€${value.toFixed(3)}/kWh`, name];
              }
              return [`${value.toFixed(2)} kW`, name];
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="pvGeneration" name="PV Generation" stroke="#f59e0b" />
          <Line type="monotone" dataKey="windGeneration" name="Wind Generation" stroke="#3b82f6" />
          <Line type="monotone" dataKey="demand" name="Demand" stroke="#ef4444" />
          <Line type="monotone" dataKey="batteryCharge" name="Battery Charge" stroke="#10b981" />
          <Line type="monotone" dataKey="gridTariff" name="Grid Export Tariff" stroke="#8b5cf6" strokeDasharray="3 3" />
        </LineChart>
      </div>
    );
  };

  const ExportTariffChart = ({ title }) => {
    const chartData = React.useMemo(() => {
      if (!currentExportTariffProfile) return [];
      
      // Create a sample (every 12th hour for clarity)
      return currentExportTariffProfile
        .filter((_, index) => index % 12 === 0)
        .map((value, index) => ({
          hour: index * 12,
          tariff: value
        }));
    }, [currentExportTariffProfile]);

    return (
      <div style={{flex: '1 1 0', minWidth: '400px'}}>
        <h4 className="text-lg font-semibold mb-4">{title}</h4>
        <LineChart 
          width={400}
          height={250}
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" label={{ value: 'Hour of Year', position: 'insideBottom', offset: -5 }} />
          <YAxis label={{ value: '€/kWh', angle: -90, position: 'insideLeft' }} />
          <Tooltip formatter={(value) => `€${value.toFixed(3)}/kWh`} />
          <Legend />
          <Line type="monotone" dataKey="tariff" name="Grid Export Tariff" stroke="#9932cc" />
        </LineChart>
      </div>
    );
  };

  const containerStyle = {
    padding: '20px',
    maxWidth: '100%'
  };

  const inputGridStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
    marginBottom: '20px'
  };

  const sectionStyle = {
    flex: '1',
    minWidth: '300px',
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #e0e0e0'
  };

  const inputGroupStyle = {
    marginBottom: '15px'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '14px',
    marginBottom: '5px'
  };

  const inputContainerStyle = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  };

  const inputStyle = {
    width: '100%',
    padding: '8px',
    paddingRight: '65px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px'
  };

  const unitStyle = {
    position: 'absolute',
    right: '8px',
    color: '#666',
    fontSize: '14px'
  };

  const fileUploadStyle = {
    border: '2px dashed #ddd',
    borderRadius: '4px',
    padding: '15px',
    textAlign: 'center',
    cursor: 'pointer',
    marginBottom: '10px'
  };

  return (
    <div style={containerStyle}>
      {/* Becquerel Institute Logo Banner */}
      <div style={{ 
        backgroundColor: '#000066', 
        padding: '15px', 
        marginBottom: '20px',
        borderRadius: '4px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {/* Logo and text */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* SVG with B and I */}
          <svg width="60" height="60" viewBox="0 0 100 100" style={{ marginRight: '15px' }}>
            {/* Main circle */}
            <circle cx="50" cy="50" r="45" fill="transparent" stroke="#FFA500" strokeWidth="3" />
            
            {/* Arc segment */}
            <path d="M 50 5 A 45 45 0 0 1 95 50" stroke="#FFA500" strokeWidth="3" fill="transparent" />
            
            {/* B letter */}
            <text x="38" y="65" fill="white" fontSize="40" fontWeight="bold" fontFamily="Arial">B</text>
            
            {/* I letter - orange/gold */}
            <text x="58" y="65" fill="#FFA500" fontSize="40" fontWeight="bold" fontFamily="Arial">I</text>
          </svg>
          
          <div>
            <div style={{ 
              color: 'white', 
              fontSize: '24px', 
              fontWeight: 'bold',
              letterSpacing: '1px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <span>BECQUEREL</span>
              <span style={{ color: '#FFA500', marginLeft: '8px' }}>INSTITUTE</span>
            </div>
            <div style={{ 
              color: 'white', 
              fontSize: '14px',
              marginTop: '2px'
            }}>
              Strategy Consulting in Solar PV
            </div>
          </div>
        </div>
        
        {/* Optional: Add a version or contact info on the right */}
        <div style={{ color: 'white', fontSize: '14px', textAlign: 'right' }}>
          PV + Wind + BESS Optimizer v1.1 (Becquerel Institute Italia)
        </div>
      </div>

      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>PV + Wind + Battery System Optimizer</h1>
        
      <div style={inputGridStyle}>
        {/* System Parameters */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '18px', marginBottom: '15px' }}>System Parameters</h2>
          
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Annual Demand</label>
            <div style={inputContainerStyle}>
              <input 
                type="number" 
                value={annualDemand}
                onChange={(e) => setAnnualDemand(Number(e.target.value))}
                style={inputStyle}
                min="0"
              />
              <span style={unitStyle}>kWh/year</span>
            </div>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Load Type</label>
            <select 
              value={loadType}
              onChange={(e) => setLoadType(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="residential">Residential</option>
              <option value="commercial">Commercial (Office)</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Max PV Size</label>
            <div style={inputContainerStyle}>
              <input 
                type="number" 
                value={maxPVSize}
                onChange={(e) => setMaxPVSize(Number(e.target.value))}
                style={inputStyle}
                min="0"
              />
              <span style={unitStyle}>kWp</span>
            </div>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Max Battery Size</label>
            <div style={inputContainerStyle}>
              <input 
                type="number" 
                value={maxBatterySize}
                onChange={(e) => setMaxBatterySize(Number(e.target.value))}
                style={inputStyle}
                min="0"
              />
              <span style={unitStyle}>kWh</span>
            </div>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Max Wind Turbine Size</label>
            <div style={inputContainerStyle}>
              <input 
                type="number" 
                value={maxWindSize}
                onChange={(e) => setMaxWindSize(Number(e.target.value))}
                style={inputStyle}
                min="0"
              />
              <span style={unitStyle}>kW</span>
            </div>
          </div>
        </div>

        {/* Cost Parameters */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '18px', marginBottom: '15px' }}>Cost Parameters</h2>
          
          <div style={inputGroupStyle}>
            <label style={labelStyle}>PV System Cost</label>
            <div style={inputContainerStyle}>
              <input 
                type="number" 
                value={pvCost}
                onChange={(e) => setPvCost(Number(e.target.value))}
                style={inputStyle}
                min="0"
                step="50"
              />
              <span style={unitStyle}>€/kWp</span>
            </div>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Battery Cost</label>
            <div style={inputContainerStyle}>
              <input 
                type="number" 
                value={batteryCost}
                onChange={(e) => setBatteryCost(Number(e.target.value))}
                style={inputStyle}
                min="0"
                step="50"
              />
              <span style={unitStyle}>€/kWh</span>
            </div>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Electricity Price</label>
            <div style={inputContainerStyle}>
              <input 
                type="number" 
                value={electricityPrice}
                onChange={(e) => setElectricityPrice(Number(e.target.value))}
                style={inputStyle}
                min="0"
                step="0.01"
              />
              <span style={unitStyle}>€/kWh</span>
            </div>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>PV O&M Cost</label>
            <div style={inputContainerStyle}>
              <input 
                type="number" 
                value={PVOMCost}
                onChange={(e) => setPVOMCost(Number(e.target.value))}
                style={inputStyle}
                min="0"
                step="1"
              />
              <span style={unitStyle}>€/kWp/year</span>
            </div>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Discount Rate</label>
            <div style={inputContainerStyle}>
              <input 
                type="number" 
                value={discountRate * 100}
                onChange={(e) => setDiscountRate(Number(e.target.value) / 100)}
                style={inputStyle}
                min="0"
                max="100"
                step="0.1"
              />
              <span style={unitStyle}>%</span>
            </div>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Wind Turbine Cost</label>
            <div style={inputContainerStyle}>
              <input 
                type="number" 
                value={windCost}
                onChange={(e) => setWindCost(Number(e.target.value))}
                style={inputStyle}
                min="0"
                step="50"
              />
              <span style={unitStyle}>€/kW</span>
            </div>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Wind O&M Cost</label>
            <div style={inputContainerStyle}>
              <input 
                type="number" 
                value={windOMCost}
                onChange={(e) => setWindOMCost(Number(e.target.value))}
                style={inputStyle}
                min="0"
                step="1"
              />
              <span style={unitStyle}>€/kW/year</span>
            </div>
          </div>
        </div>

        {/* Grid Export Parameters */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '18px', marginBottom: '15px' }}>Grid Export Parameters</h2>
          
          {currentExportTariffProfile && (
            <div style={{ marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span>Min: €{Math.min(...currentExportTariffProfile).toFixed(3)}/kWh</span>
                <span>Max: €{Math.max(...currentExportTariffProfile).toFixed(3)}/kWh</span>
              </div>
              <div style={{ fontSize: '14px', textAlign: 'center' }}>
                Avg: €{(currentExportTariffProfile.reduce((a, b) => a + b, 0) / 8760).toFixed(3)}/kWh
              </div>
            </div>
          )}

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Base Export Price</label>
            <div style={inputContainerStyle}>
              <input 
                type="number" 
                value={baseExportPrice}
                onChange={(e) => setBaseExportPrice(Number(e.target.value))}
                style={inputStyle}
                min="0"
                step="0.01"
                max={electricityPrice} // Typically export price doesn't exceed retail price
              />
              <span style={unitStyle}>€/kWh</span>
            </div>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Export Price Profile</label>
            <select 
              value={exportProfileType}
              onChange={(e) => {
                setExportProfileType(e.target.value);
                setCustomExportProfile(null); // Reset custom profile when switching
              }}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="flat">Flat Rate</option>
              <option value="time-of-day">Time-of-Day Variation</option>
              <option value="seasonal">Seasonal Variation</option>
              <option value="dynamic">Dynamic (Time + Season)</option>
              {customExportProfile && <option value="custom">Custom (Uploaded)</option>}
            </select>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Custom Export Profile</label>
            <div style={fileUploadStyle}>
              <input 
                type="file" 
                accept=".csv"
                onChange={handleExportTariffFile}
                style={{ display: 'none' }}
                id="export-tariff-file"
              />
              <label htmlFor="export-tariff-file" style={{ cursor: 'pointer' }}>
                <div style={{ color: '#2563eb' }}>Upload CSV</div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                  8760 hourly values (€/kWh)
                </div>
              </label>
              {customExportProfile && (
                <div style={{ fontSize: '14px', color: '#059669', marginTop: '8px' }}>
                  ✓ File loaded
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Load Profiles */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '18px', marginBottom: '15px' }}>Load Profiles</h2>
          
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Demand Profile</label>
            <div style={fileUploadStyle}>
              <input 
                type="file" 
                accept=".csv"
                onChange={handleDemandFile}
                style={{ display: 'none' }}
                id="demand-file"
              />
              <label htmlFor="demand-file" style={{ cursor: 'pointer' }}>
                <div style={{ color: '#2563eb' }}>Upload CSV</div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                  8760 hourly values
                </div>
              </label>
              {normalizedDemand && (
                <div style={{ fontSize: '14px', color: '#059669', marginTop: '8px' }}>
                  ✓ File loaded
                </div>
              )}
            </div>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Wind Generation Profile</label>
            <div style={fileUploadStyle}>
              <input 
                type="file" 
                accept=".csv"
                onChange={handleWindGenerationFile}
                style={{ display: 'none' }}
                id="wind-generation-file"
              />
              <label htmlFor="wind-generation-file" style={{ cursor: 'pointer' }}>
                <div style={{ color: '#2563eb' }}>Upload CSV</div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                  8760 hourly values (W)
                </div>
              </label>
              {normalizedWindGeneration && (
                <div style={{ fontSize: '14px', color: '#059669', marginTop: '8px' }}>
                  ✓ File loaded
                </div>
              )}
            </div>
          </div>
          
          <div style={inputGroupStyle}>
            <label style={labelStyle}>PV Generation Profile</label>
            <div style={fileUploadStyle}>
              <input 
                type="file" 
                accept=".csv"
                onChange={handleGenerationFile}
                style={{ display: 'none' }}
                id="generation-file"
              />
              <label htmlFor="generation-file" style={{ cursor: 'pointer' }}>
                <div style={{ color: '#2563eb' }}>Upload CSV</div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                  8760 hourly values (W)
                </div>
              </label>
              {normalizedPVGeneration && (
                <div style={{ fontSize: '14px', color: '#059669', marginTop: '8px' }}>
                  ✓ File loaded
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Mode Selection Section */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        border: '1px solid #e0e0e0',
        marginTop: '20px'
      }}>
        <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>Analysis Mode</h2>
        
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {/* Optimization Mode */}
          <div style={{ 
            flex: 1,
            minWidth: '300px',
            padding: '20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
          }}>
            <h3 style={{ 
              fontSize: '16px',
              marginBottom: '15px',
              color: '#2c3e50'
            }}>Optimization Mode</h3>
            
            <div style={{ 
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <button 
                onClick={() => runOptimization('selfConsumption')}
                disabled={isCalculating}
                style={{
                  padding: '10px 15px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isCalculating ? 'not-allowed' : 'pointer',
                  opacity: isCalculating ? 0.7 : 1,
                  transition: 'background-color 0.2s',
                  fontSize: '14px'
                }}
              >
                {isCalculating ? 'Calculating...' : 'Optimize for Self-Consumption'}
              </button>

              <button 
                onClick={() => runOptimization('npv')}
                disabled={isCalculating}
                style={{
                  padding: '10px 15px',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isCalculating ? 'not-allowed' : 'pointer',
                  opacity: isCalculating ? 0.7 : 1,
                  transition: 'background-color 0.2s',
                  fontSize: '14px'
                }}
              >
                {isCalculating ? 'Calculating...' : 'Optimize for NPV'}
              </button>
            </div>
          </div>

          {/* Simulation Mode */}
          <div style={{ 
            flex: 1,
            minWidth: '300px',
            padding: '20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
          }}>
            <h3 style={{ 
              fontSize: '16px',
              marginBottom: '15px',
              color: '#2c3e50'
            }}>Simulation Mode</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  marginBottom: '5px',
                  color: '#2c3e50'
                }}>PV Size</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="number"
                    value={simulationPVSize || ''}
                    onChange={(e) => setSimulationPVSize(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '8px',
                      paddingRight: '50px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                    placeholder="Enter PV size"
                  />
                  <span style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#666',
                    fontSize: '14px'
                  }}>kWp</span>
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  marginBottom: '5px',
                  color: '#2c3e50'
                }}>Battery Size</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="number"
                    value={simulationBatterySize || ''}
                    onChange={(e) => setSimulationBatterySize(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '8px',
                      paddingRight: '50px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                    placeholder="Enter battery size"
                  />
                  <span style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#666',
                    fontSize: '14px'
                  }}>kWh</span>
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  marginBottom: '5px',
                  color: '#2c3e50'
                }}>Wind Turbine Size</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="number"
                    value={simulationWindSize || ''}
                    onChange={(e) => setSimulationWindSize(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '8px',
                      paddingRight: '50px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                    placeholder="Enter wind size (optional)"
                  />
                  <span style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#666',
                    fontSize: '14px'
                  }}>kW</span>
                </div>
              </div>

              <button 
                onClick={runSimulation}
                disabled={isCalculating || !simulationPVSize || !simulationBatterySize}
                style={{
                  padding: '10px 15px',
                  backgroundColor: '#9C27B0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: (isCalculating || !simulationPVSize || !simulationBatterySize) ? 'not-allowed' : 'pointer',
                  opacity: (isCalculating || !simulationPVSize || !simulationBatterySize) ? 0.7 : 1,
                  transition: 'background-color 0.2s',
                  marginTop: '10px',
                  fontSize: '14px'
                }}
              >
                Run Simulation
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {optimizedDesign && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg" style={{ 
          marginTop: '20px', 
          padding: '20px', 
          backgroundColor: '#f9fafb', 
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ 
            fontSize: '20px', 
            fontWeight: 'bold', 
            marginBottom: '16px'
          }}>
            {optimizationStrategy === 'simulation' ? 'Simulation Results' : 
            `Optimized Design (${optimizationStrategy === 'selfConsumption' ? 'Self-Consumption' : '20-Year NPV'})`}
          </h3>

          <table style={{
            width: '100%', 
            borderCollapse: 'collapse', 
            border: '1px solid #e5e7eb'
          }}>
            <thead>
              <tr style={{borderBottom: '2px solid #e5e7eb', backgroundColor: '#f3f4f6'}}>
                <th style={{
                  padding: '1rem', 
                  textAlign: 'left', 
                  borderRight: '1px solid #e5e7eb'
                }}>Metric</th>
                <th style={{padding: '1rem', textAlign: 'left'}}>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{borderBottom: '1px solid #e5e7eb'}}>
                <td style={{
                  padding: '1rem', 
                  borderRight: '1px solid #e5e7eb'
                }}>PV Size</td>
                <td style={{padding: '1rem', color: 'blue'}}>{optimizedDesign.pvSize.toFixed(2)} kWp</td>
              </tr>
              {/* FIX #9: Added missing border style */}
              <tr style={{borderBottom: '1px solid #e5e7eb'}}>
                <td style={{
                  padding: '1rem', 
                  borderRight: '1px solid #e5e7eb'
                }}>Wind Turbine Size</td>
                <td style={{padding: '1rem', color: '#3b82f6'}}>{optimizedDesign.windSize.toFixed(2)} kW</td>
              </tr>
              <tr style={{borderBottom: '1px solid #e5e7eb'}}>
                <td style={{
                  padding: '1rem', 
                  borderRight: '1px solid #e5e7eb'
                }}>Battery Size</td>
                <td style={{padding: '1rem', color: 'green'}}>{optimizedDesign.batterySize.toFixed(2)} kWh</td>
              </tr>
              <tr style={{borderBottom: '1px solid #e5e7eb'}}>
                <td style={{
                  padding: '1rem', 
                  borderRight: '1px solid #e5e7eb'
                }}>Self-Consumption Ratio</td>
                <td style={{padding: '1rem', color: 'purple'}}>
                  {(optimizedDesign.selfConsumptionRatio * 100).toFixed(2)}%
                  <span style={{fontSize: '12px', color: '#666', marginLeft: '8px'}}>
                    (% of generation used on-site)
                  </span>
                </td>
              </tr>
              <tr style={{borderBottom: '1px solid #e5e7eb'}}>
                <td style={{
                  padding: '1rem', 
                  borderRight: '1px solid #e5e7eb'
                }}>Self-Sufficiency Ratio</td>
                <td style={{padding: '1rem', color: '#059669'}}>
                  {(optimizedDesign.selfSufficiencyRatio * 100).toFixed(2)}%
                  <span style={{fontSize: '12px', color: '#666', marginLeft: '8px'}}>
                    (% of demand met by self-generation)
                  </span>
                </td>
              </tr>
              <tr>
                <td style={{
                  padding: '1rem', 
                  borderRight: '1px solid #e5e7eb'
                }}>Net Present Value (20 years)</td>
                <td style={{padding: '1rem', color: 'red'}}>
                  €{optimizedDesign.npv.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* FIX #8: Removed duplicate ExportTariffChart - keeping only one in the charts section below */}

          {cashFlowData && (
            <>
              <div style={{
                display: 'flex', 
                flexDirection: 'row', 
                flexWrap: 'wrap',
                justifyContent: 'space-between', 
                gap: '20px', 
                marginTop: '20px'
              }}>
                {/* Financial charts */}
                <div style={{flex: '1 1 0', minWidth: '400px'}}>
                  <h4 style={{fontSize: '16px', fontWeight: '600', marginBottom: '16px'}}>Annual Cash Flow</h4>
                  <BarChart
                    width={400}
                    height={250}
                    data={cashFlowData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip formatter={(value) => `€${value.toFixed(2)}`} />
                    <Legend />
                    <Bar dataKey="cashFlow" name="Annual Cash Flow" fill="#82ca9d" />
                  </BarChart>
                </div>

                <div style={{flex: '1 1 0', minWidth: '400px'}}>
                  <h4 style={{fontSize: '16px', fontWeight: '600', marginBottom: '16px'}}>Cumulative NPV</h4>
                  <LineChart 
                    width={400}
                    height={250}
                    data={cashFlowData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip formatter={(value) => `€${value.toFixed(2)}`} />
                    <Legend />
                    <Line type="monotone" dataKey="cumulativeNPV" name="Cumulative NPV" stroke="#8884d8" />
                  </LineChart>
                </div>

                {/* Daily profile charts */}
                <DailyProfileChart dayStart={3624} title="Daily Profile - June" />
                <DailyProfileChart dayStart={8040} title="Daily Profile - December" />

                <div style={{ marginTop: '20px', width: '100%' }}>
                  <h3 style={{ fontSize: '18px', marginBottom: '15px' }}>Generation & Export Analysis</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                    <ExportTariffChart title="Grid Export Tariff Sample" />
                    <GenerationMixChart />
                  </div>
                </div>

              </div>

              <div style={{ marginTop: '24px' }}>
                <h4 style={{fontSize: '16px', fontWeight: '600', marginBottom: '16px'}}>Detailed Financial Breakdown</h4>
                <table style={{
                  width: '100%', 
                  borderCollapse: 'collapse', 
                  border: '1px solid #e5e7eb'
                }}>
                  <thead style={{backgroundColor: '#f3f4f6'}}>
                    <tr style={{borderBottom: '2px solid #e5e7eb'}}>
                      {['Year', 'Grid Savings', 'Feed-in Revenue', 'O&M Costs', 'Battery Replacement', 'Net Cash Flow', 'Cumulative NPV'].map((header) => (
                        <th key={header} style={{
                          padding: '0.75rem', 
                          textAlign: 'left', 
                          borderRight: '1px solid #e5e7eb',
                          fontWeight: 'bold'
                        }}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cashFlowData.map((year) => (
                      <tr key={year.year} style={{borderBottom: '1px solid #e5e7eb'}}>
                        <td style={{
                          padding: '0.75rem', 
                          borderRight: '1px solid #e5e7eb'
                        }}>{year.year}</td>
                        <td style={{
                          padding: '0.75rem', 
                          borderRight: '1px solid #e5e7eb'
                        }}>€{year.gridSavings.toFixed(2)}</td>
                        <td style={{
                          padding: '0.75rem', 
                          borderRight: '1px solid #e5e7eb'
                        }}>€{year.feedInRevenue.toFixed(2)}</td>
                        <td style={{
                          padding: '0.75rem', 
                          borderRight: '1px solid #e5e7eb'
                        }}>€{year.operationalCosts.toFixed(2)}</td>
                        <td style={{
                          padding: '0.75rem', 
                          borderRight: '1px solid #e5e7eb'
                        }}>€{year.batteryReplacement.toFixed(2)}</td>
                        <td style={{
                          padding: '0.75rem', 
                          borderRight: '1px solid #e5e7eb'
                        }}>€{year.cashFlow.toFixed(2)}</td>
                        <td style={{
                          padding: '0.75rem'
                        }}>€{year.cumulativeNPV.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DefaultComponent;
