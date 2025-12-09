import React, { useState, useCallback, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import {
  runOptimization as apiRunOptimization,
  runSimulation as apiRunSimulation,
  uploadProfile,
  transformOptimizationResponse
} from './api';

const DefaultComponent = () => {
  // System parameters
  const [annualDemand, setAnnualDemand] = useState(10000);
  const [maxPVSize, setMaxPVSize] = useState(10);
  const [maxBatterySize, setMaxBatterySize] = useState(20);
  const [maxWindSize, setMaxWindSize] = useState(10);
  const [loadType, setLoadType] = useState('residential');

  // Cost parameters
  const [pvCost, setPvCost] = useState(800);
  const [batteryCost, setBatteryCost] = useState(500);
  const [electricityPrice, setElectricityPrice] = useState(0.25);
  const [PVOMCost, setPVOMCost] = useState(20);
  const [discountRate, setDiscountRate] = useState(0.05);
  const [windCost, setWindCost] = useState(1200);
  const [windOMCost, setWindOMCost] = useState(40);

  // Export parameters
  const [baseExportPrice, setBaseExportPrice] = useState(0.175);
  const [exportProfileType, setExportProfileType] = useState('flat');
  const [customExportProfile, setCustomExportProfile] = useState(null);
  const [exportTariffStats, setExportTariffStats] = useState(null);

  // Custom profiles
  const [normalizedDemand, setNormalizedDemand] = useState(null);
  const [normalizedPVGeneration, setNormalizedPVGeneration] = useState(null);
  const [normalizedWindGeneration, setNormalizedWindGeneration] = useState(null);

  // Simulation mode inputs
  const [simulationPVSize, setSimulationPVSize] = useState(null);
  const [simulationBatterySize, setSimulationBatterySize] = useState(null);
  const [simulationWindSize, setSimulationWindSize] = useState(null);

  // Results state
  const [optimizedDesign, setOptimizedDesign] = useState(null);
  const [optimizationStrategy, setOptimizationStrategy] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [cashFlowData, setCashFlowData] = useState(null);
  const [dailyProfileJune, setDailyProfileJune] = useState(null);
  const [dailyProfileDecember, setDailyProfileDecember] = useState(null);
  const [exportTariffSample, setExportTariffSample] = useState(null);
  const [error, setError] = useState(null);

  // Prepare parameters for API calls
  const getApiParams = useCallback(() => ({
    systemParams: {
      annualDemand,
      maxPVSize,
      maxWindSize,
      maxBatterySize,
      loadType,
    },
    costParams: {
      pvCost,
      windCost,
      batteryCost,
      electricityPrice,
      PVOMCost,
      windOMCost,
      discountRate,
    },
    exportParams: {
      baseExportPrice,
      exportProfileType: exportProfileType === 'custom' ? 'flat' : exportProfileType,
      customExportProfile,
    },
    customProfiles: {
      demandProfile: normalizedDemand,
      pvGenerationProfile: normalizedPVGeneration,
      windGenerationProfile: normalizedWindGeneration,
    },
  }), [
    annualDemand, maxPVSize, maxWindSize, maxBatterySize, loadType,
    pvCost, windCost, batteryCost, electricityPrice, PVOMCost, windOMCost, discountRate,
    baseExportPrice, exportProfileType, customExportProfile,
    normalizedDemand, normalizedPVGeneration, normalizedWindGeneration
  ]);

  const runOptimization = useCallback(async (strategy) => {
    setIsCalculating(true);
    setError(null);
    setOptimizationStrategy(strategy);

    try {
      const params = getApiParams();
      params.strategy = strategy;

      const response = await apiRunOptimization(params);
      const transformed = transformOptimizationResponse(response);

      setOptimizedDesign(transformed.optimizedDesign);
      setCashFlowData(transformed.cashFlows);
      setDailyProfileJune(transformed.dailyProfileJune);
      setDailyProfileDecember(transformed.dailyProfileDecember);
      setExportTariffSample(transformed.exportTariffSample);
    } catch (err) {
      setError(err.message);
      console.error('Optimization error:', err);
    } finally {
      setIsCalculating(false);
    }
  }, [getApiParams]);

  const runSimulation = useCallback(async () => {
    if (!simulationPVSize || !simulationBatterySize) {
      setError('Please enter PV size and battery size for simulation');
      return;
    }

    setIsCalculating(true);
    setError(null);
    setOptimizationStrategy('simulation');

    try {
      const params = getApiParams();
      params.pvSize = simulationPVSize;
      params.windSize = simulationWindSize || 0;
      params.batterySize = simulationBatterySize;

      const response = await apiRunSimulation(params);
      const transformed = transformOptimizationResponse(response);

      setOptimizedDesign(transformed.optimizedDesign);
      setCashFlowData(transformed.cashFlows);
      setDailyProfileJune(transformed.dailyProfileJune);
      setDailyProfileDecember(transformed.dailyProfileDecember);
      setExportTariffSample(transformed.exportTariffSample);
    } catch (err) {
      setError(err.message);
      console.error('Simulation error:', err);
    } finally {
      setIsCalculating(false);
    }
  }, [getApiParams, simulationPVSize, simulationWindSize, simulationBatterySize]);

  // File upload handlers
  const handleDemandFile = useCallback(async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        const result = await uploadProfile(file, 'demand');
        setNormalizedDemand(result.profile);
        setError(null);
      } catch (err) {
        setError(err.message);
      }
    }
  }, []);

  const handleGenerationFile = useCallback(async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        const result = await uploadProfile(file, 'pv');
        setNormalizedPVGeneration(result.profile);
        setError(null);
      } catch (err) {
        setError(err.message);
      }
    }
  }, []);

  const handleWindGenerationFile = useCallback(async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        const result = await uploadProfile(file, 'wind');
        setNormalizedWindGeneration(result.profile);
        setError(null);
      } catch (err) {
        setError(err.message);
      }
    }
  }, []);

  const handleExportTariffFile = useCallback(async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        const result = await uploadProfile(file, 'exportTariff');
        setCustomExportProfile(result.profile);
        setExportProfileType('custom');
        setExportTariffStats({
          min: result.min,
          max: result.max,
          average: result.average
        });
        setError(null);
      } catch (err) {
        setError(err.message);
      }
    }
  }, []);

  // Chart components
  const GenerationMixChart = () => {
    const data = useMemo(() => {
      if (!optimizedDesign) return [];
      return [
        { name: 'PV', selfConsumption: optimizedDesign.pvSelfConsumption, export: optimizedDesign.pvExport },
        { name: 'Wind', selfConsumption: optimizedDesign.windSelfConsumption, export: optimizedDesign.windExport }
      ];
    }, []);

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

  const DailyProfileChart = ({ data, title }) => {
    if (!data) return null;

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
            formatter={(value, name) => {
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
    const chartData = useMemo(() => {
      if (!exportTariffSample) return [];
      return exportTariffSample.map(item => ({
        hour: item.hour,
        tariff: item.tariff
      }));
    }, []);

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

  // Styles
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
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <svg width="60" height="60" viewBox="0 0 100 100" style={{ marginRight: '15px' }}>
            <circle cx="50" cy="50" r="45" fill="transparent" stroke="#FFA500" strokeWidth="3" />
            <path d="M 50 5 A 45 45 0 0 1 95 50" stroke="#FFA500" strokeWidth="3" fill="transparent" />
            <text x="38" y="65" fill="white" fontSize="40" fontWeight="bold" fontFamily="Arial">B</text>
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
        <div style={{ color: 'white', fontSize: '14px', textAlign: 'right' }}>
          PV + Wind + BESS Optimizer v1.1 (Becquerel Institute Italia)
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          color: '#dc2626'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

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

          {exportTariffStats && (
            <div style={{ marginTop: '10px', marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span>Min: €{exportTariffStats.min.toFixed(3)}/kWh</span>
                <span>Max: €{exportTariffStats.max.toFixed(3)}/kWh</span>
              </div>
              <div style={{ fontSize: '14px', textAlign: 'center' }}>
                Avg: €{exportTariffStats.average.toFixed(3)}/kWh
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
                max={electricityPrice}
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
                if (e.target.value !== 'custom') {
                  setCustomExportProfile(null);
                  setExportTariffStats(null);
                }
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
                <DailyProfileChart data={dailyProfileJune} title="Daily Profile - June" />
                <DailyProfileChart data={dailyProfileDecember} title="Daily Profile - December" />

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
