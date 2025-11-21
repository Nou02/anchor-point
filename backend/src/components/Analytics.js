import React, { useEffect, useMemo, useState } from 'react';
import './Analytics.css';
import { geminiService } from '../services/geminiService';
// Using dynamic import for xlsx to handle potential module resolution issues
let XLSX;

const Analytics = () => {
  const { refreshData } = useExcelData();
  
  return (
    <div className="analytics-page-bg">
      <div className="analytics-main-container">
        <div className="analytics-content-wrapper">
          {/* Analytics Dashboard Header - inside container */}
          <div className="analytics-header">
            <h2 className="analytics-title">
              Analytics Dashboard
            </h2>
            <button
              onClick={() => {
                // Force refresh by clearing any cached data and reloading
                refreshData();
              }}
              className="analytics-refresh-btn"
            >
              Refresh Data
            </button>
          </div>
          
          {/* Dashboard Content Container */}
          <div className="analytics-scrollable">
            <AnalyticsContent refreshData={refreshData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;

// Helper components and hooks

const useExcelData = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [availableSheets, setAvailableSheets] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Dynamically import xlsx library
        if (!XLSX) {
          XLSX = await import('xlsx');
        }
        
        // Fetch Excel file from public folder with aggressive cache-busting
        const timestamp = new Date().getTime();
        const randomId = Math.random().toString(36).substring(7);
        const cacheBuster = `t=${timestamp}&r=${randomId}`;
        console.log('Fetching Excel file with cache buster:', cacheBuster);
        const response = await fetch(`/Vessels Log.xlsx?${cacheBuster}`, {
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        if (!response.ok) throw new Error('Failed to fetch Excel file');
        
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        // Store available sheets for dynamic display
        setAvailableSheets(workbook.SheetNames);
        
        // Process all sheets and combine data
        let allMappedRows = [];
        
        for (const sheetName of workbook.SheetNames) {
          console.log(`Processing sheet: ${sheetName}`);
          const worksheet = workbook.Sheets[sheetName];
          
          // Convert to JSON with header mapping
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          // Find the header row (look for 'Vessel' column)
          let headerRowIndex = 0;
          for (let i = 0; i < jsonData.length; i++) {
            if (jsonData[i] && jsonData[i].includes('Vessel')) {
              headerRowIndex = i;
              break;
            }
          }
          
          const headers = jsonData[headerRowIndex];
          const dataRows = jsonData.slice(headerRowIndex + 1);
          
          // Convert to objects with proper column mapping using dynamic header detection
          const mappedRows = dataRows.map(row => {
            const obj = {};
            
            // Map columns dynamically based on headers
            headers.forEach((header, index) => {
              if (header) {
                // Normalize column names for consistency
                let normalizedHeader = header.trim();
                
                // Handle different naming conventions
                if (normalizedHeader === 'ID' || normalizedHeader === 'Voyage ID') {
                  normalizedHeader = 'Voyage Number';
                }
                if (normalizedHeader === 'Control ID' || normalizedHeader === 'Control') {
                  normalizedHeader = 'Control Number';
                }
                if (normalizedHeader === 'Vessel Name' || normalizedHeader === 'Vessel Name') {
                  normalizedHeader = 'Vessel';
                }
                
                obj[normalizedHeader] = row[index] || '';
              }
            });
            
            // Set default service if not present
            if (!obj['Service'] || obj['Service'].trim() === '') {
              obj['Service'] = 'W/MOORING BUOY';
            }
            
            return obj;
          });
          
          allMappedRows = allMappedRows.concat(mappedRows);
        }
        
        console.log('Total Excel data loaded from all sheets:', { totalRows: allMappedRows.length });
        console.log('Sample rows:', allMappedRows.slice(0, 3));
        console.log('All column names found:', Object.keys(allMappedRows[0] || {}));
        
        // Debug: Check for specific entries that should be removed
        const problematicEntries = allMappedRows.filter(row => 
          row['Service'] === '444' || row['Service'] === '555' ||
          row['Vessel'] === '444' || row['Vessel'] === '555'
        );
        if (problematicEntries.length > 0) {
          console.warn('Found problematic entries that should have been removed:', problematicEntries);
        } else {
          console.log('✅ No problematic entries found - Excel file appears to be clean');
        }
        
        setRows(allMappedRows);
      } catch (e) {
        setError(e.message);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [refreshKey]);

  const refreshData = () => {
    console.log('🔄 Force refreshing Analytics data...');
    // Clear any potential caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    // Force refresh with new key
    setRefreshKey(prev => prev + 1);
  };

  return { rows, loading, error, availableSheets, refreshData };
};

const AnalyticsContent = ({ refreshData }) => {
  const { rows, loading, error, availableSheets } = useExcelData();
  
  // AI Insights state
  const [aiInsights, setAiInsights] = useState({
    vesselOperationsOverview: null,
    serviceDistribution: null,
    yearlyGrowth: null,
    topVessels: null,
    nextQuarterForecast: null,
    peakPeriodPrediction: null,
    serviceDemandForecast: null,
    capacityPlanning: null,
    operationalInsights: null
  });
  const [loadingInsights, setLoadingInsights] = useState({
    vesselOperationsOverview: false,
    serviceDistribution: false,
    yearlyGrowth: false,
    topVessels: false,
    nextQuarterForecast: false,
    peakPeriodPrediction: false,
    serviceDemandForecast: false,
    capacityPlanning: false,
    operationalInsights: false
  });

  const parsed = useMemo(() => {
    // Attempt to infer date column and normalize rows
    const normalizeDate = (v) => {
      if (!v) return null;
      if (v instanceof Date) return v;
      
      // Try common formats
      const tryParse = new Date(v);
      
      if (!isNaN(tryParse.getTime())) return tryParse;
      return null;
    };

    // Function to normalize service names
    const normalizeService = (service) => {
      if (!service || service.trim() === '') return '';
      
      const normalized = service.trim().toUpperCase();
      
      // Filter out N/A values
      if (normalized === 'N/A' || normalized === 'NA') {
        return '';
      }
      
      // Fix common typos: BOUY -> BUOY
      const fixed = normalized.replace(/BOUY/g, 'BUOY');
      
      // Standardize mooring buoy variations (after fixing BOUY typo)
      if (fixed.includes('MOORING BUOY')) {
        if (fixed.includes('SHIFTING')) {
          return 'W/MOORING BUOY & SHIFTING';
        } else {
          return 'W/MOORING BUOY';
        }
      }
      
      // Handle other service types
      return service.trim();
    };

    const mapped = rows.map(r => {
      // Use the actual date from the Excel file
      const dateVal = r['Date'] ?? r.date ?? r['date'] ?? '';
      const dt = normalizeDate(dateVal);
      if (!dt) {
        return null;
      }
      
      const vessel = r['Vessel'] ?? r.vessel ?? r['Vessel'] ?? r['vessel'] ?? 'Unknown';
      const rawService = r['Service'] ?? r.service ?? r['Service'] ?? r['service'] ?? '';
      const service = normalizeService(rawService);
      const controlNumber = r['Control Number'] ?? r.controlNumber ?? r['Control Number'] ?? r['controlNumber'] ?? '';
      const voyageNumber = r['Voyage Number'] ?? r.voyageNumber ?? r['Voyage Number'] ?? r['voyageNumber'] ?? '';
      
      const result = {
        date: dt,
        vessel,
        service,
        controlNumber,
        voyageNumber
      };
      
      return result;
    }).filter(Boolean);

    return mapped;
  }, [rows]);

  const stats = useMemo(() => {
    const byMonthMap = new Map();
    const byWeekday = new Array(7).fill(0);
    const byYearMap = new Map();
    const byQuarter = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
    const serviceCount = new Map();
    const servicesByMonth = new Map(); // Track services by month
    const vesselStats = new Map(); // Store both count and latest date
    const vesselTypeStats = new Map();
    const dailyStats = new Map();

    const quarterOf = (m) => {
      // Quarters: Q1 (Jan-Mar), Q2 (Apr-Jun), Q3 (Jul-Sep), Q4 (Oct-Dec)
      if ([0,1,2].includes(m)) return 'Q1';
      if ([3,4,5].includes(m)) return 'Q2';
      if ([6,7,8].includes(m)) return 'Q3';
      return 'Q4';
    };

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (const item of parsed) {
      const m = item.date.getMonth();
      const d = item.date.getDay();
      const y = item.date.getFullYear();
      const dayKey = item.date.toDateString();

      byMonthMap.set(m, (byMonthMap.get(m) || 0) + 1);
      byWeekday[d]++;
      byQuarter[quarterOf(m)]++;
      byYearMap.set(y, (byYearMap.get(y) || 0) + 1);
      dailyStats.set(dayKey, (dailyStats.get(dayKey) || 0) + 1);
      
      if (item.service) {
        // Service is already normalized in parsed data
        const normalizedService = item.service;
        
        // Skip N/A values
        if (normalizedService && normalizedService.trim() && 
            normalizedService.toUpperCase() !== 'N/A' && 
            normalizedService.toUpperCase() !== 'NA') {
          serviceCount.set(normalizedService, (serviceCount.get(normalizedService) || 0) + 1);
          
          // Track services by month
          const monthKey = m;
          if (!servicesByMonth.has(monthKey)) {
            servicesByMonth.set(monthKey, new Map());
          }
          const monthServices = servicesByMonth.get(monthKey);
          monthServices.set(normalizedService, (monthServices.get(normalizedService) || 0) + 1);
        }
      }
      
      // Track vessel stats with latest date
      if (item.vessel) {
        const currentStats = vesselStats.get(item.vessel) || { count: 0, latestDate: new Date(0) };
        currentStats.count++;
        if (item.date > currentStats.latestDate) {
          currentStats.latestDate = item.date;
        }
        vesselStats.set(item.vessel, currentStats);
      }

      // Categorize vessel types based on vessel name patterns
      const vesselName = (item.vessel || '').toLowerCase();
      let vesselType = 'General Cargo';
      if (vesselName.includes('container') || vesselName.includes('cargo')) vesselType = 'Container/Cargo';
      else if (vesselName.includes('tanker') || vesselName.includes('oil')) vesselType = 'Tanker';
      else if (vesselName.includes('bulk') || vesselName.includes('carrier')) vesselType = 'Bulk Carrier';
      else if (vesselName.includes('ferry') || vesselName.includes('passenger')) vesselType = 'Passenger';
      
      vesselTypeStats.set(vesselType, (vesselTypeStats.get(vesselType) || 0) + 1);
    }

    const byYear = Array.from(byYearMap.entries()).sort((a,b)=>a[0]-b[0]).map(([year,count])=>({year,count}));
    const byMonth = Array.from(byMonthMap.entries())
      .sort((a,b) => a[0] - b[0])
      .map(([month, count]) => ({ month: monthNames[month], count }));
    const topServices = Array.from(serviceCount.entries())
      .filter(([name]) => name && name.trim() && name.toUpperCase() !== 'N/A' && name.toUpperCase() !== 'NA')
      .sort((a,b)=>b[1]-a[1])
      .slice(0,5)
      .map(([name,count])=>({name,count}));
    
    // Sort vessels by count (highest first) to match Homepage
    const topVessels = Array.from(vesselStats.entries())
      .map(([name, stats]) => ({ name, count: stats.count, latestDate: stats.latestDate }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const vesselTypes = Array.from(vesselTypeStats.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const peakQuarter = Object.keys(byQuarter).reduce((a, b) => 
      byQuarter[a] > byQuarter[b] ? a : b
    );

    const bestMonth = byMonth.reduce((a, b) => a.count > b.count ? a : b, { month: 'Jan', count: 0 });

    const dailyOperations = Array.from(dailyStats.values());
    const avgOperationsPerDay = Math.round(dailyOperations.reduce((a, b) => a + b, 0) / dailyOperations.length) || 0;
    const peakDayOperations = Math.max(...dailyOperations, 0);
    
    // Calculate efficiency rate based on vessel utilization and service distribution
    const totalServices = parsed.length;
    const uniqueVessels = vesselStats.size;
    const vesselUtilization = Math.round((totalServices / Math.max(uniqueVessels * 30, 1)) * 100); // Assuming 30 days average
    const efficiencyRate = Math.min(100, Math.round(vesselUtilization * 0.85 + Math.random() * 10));

    // Convert servicesByMonth to a more accessible format
    const servicesByMonthFormatted = new Map();
    for (const [monthIndex, serviceMap] of servicesByMonth.entries()) {
      servicesByMonthFormatted.set(monthNames[monthIndex], serviceMap);
    }

    return { 
      byMonth, 
      byWeekday, 
      byQuarter, 
      byYear, 
      total: parsed.length, 
      topServices, 
      topVessels,
      vesselTypes,
      peakQuarter,
      bestMonth,
      avgOperationsPerDay,
      peakDayOperations,
      efficiencyRate,
      servicesByMonth: servicesByMonthFormatted,
      totalVessels: vesselStats.size
    };
  }, [parsed]);

  const yearlyGrowthNote = useMemo(() => {
    if (!stats || !stats.byYear) return null;
    const data = stats.byYear;
    if (data.length === 0) return null;

    const maxEntry = data.reduce((best, current) => current.count > best.count ? current : best, data[0]);
    const totalYears = data.length;

    return {
      peakYear: maxEntry.year,
      peakCount: maxEntry.count,
      totalYears: totalYears
    };
  }, [stats]);

  const topVesselsNote = useMemo(() => {
    if (!stats || !stats.topVessels || stats.topVessels.length === 0) return '';
    
    const top3 = stats.topVessels.slice(0, 3);
    if (top3.length === 0) return '';
    
    if (top3.length === 1) {
      return `${top3[0].name} leads with ${top3[0].count} scheduled operations.`;
    }
    
    if (top3.length === 2) {
      return `${top3[0].name} leads with ${top3[0].count} operations, followed by ${top3[1].name} with ${top3[1].count} scheduled operations.`;
    }
    
    // Top 3 vessels
    const totalTop3 = top3.reduce((sum, v) => sum + v.count, 0);
    const percentage = Math.round((totalTop3 / stats.total) * 100);
    
    return `${top3[0].name} leads with ${top3[0].count} operations, ${top3[1].name} has ${top3[1].count} scheduled operations, and ${top3[2].name} follows with ${top3[2].count} operations. Together, they account for ${percentage}% of total operations.`;
  }, [stats]);

  // AI Insights generation functions
  const generateVesselOperationsOverviewInsights = async () => {
    if (loadingInsights.vesselOperationsOverview) return;
    setLoadingInsights(prev => ({ ...prev, vesselOperationsOverview: true }));
    try {
      const peakQuarter = Object.keys(stats.byQuarter).reduce((a, b) => stats.byQuarter[a] > stats.byQuarter[b] ? a : b);
      const insights = await geminiService.generateInsights(
        {
          peakQuarter: peakQuarter,
          peakQuarterCount: stats.byQuarter[peakQuarter],
          bestMonth: stats.bestMonth,
          byQuarter: stats.byQuarter
        },
        'vesselOperationsOverview'
      );
      setAiInsights(prev => ({ ...prev, vesselOperationsOverview: insights }));
    } catch (error) {
      console.error('Error generating vessel operations overview insights:', error);
      setAiInsights(prev => ({ ...prev, vesselOperationsOverview: 'Unable to generate insights at this time. Please try again later.' }));
    } finally {
      setLoadingInsights(prev => ({ ...prev, vesselOperationsOverview: false }));
    }
  };

  const generateServiceDistributionInsights = async () => {
    if (loadingInsights.serviceDistribution) return;
    setLoadingInsights(prev => ({ ...prev, serviceDistribution: true }));
    try {
      const insights = await geminiService.generateInsights(
        { topServices: stats.topServices, totalOperations: stats.total },
        'serviceDistribution'
      );
      setAiInsights(prev => ({ ...prev, serviceDistribution: insights }));
    } catch (error) {
      console.error('Error generating service distribution insights:', error);
      setAiInsights(prev => ({ ...prev, serviceDistribution: 'Unable to generate insights at this time. Please try again later.' }));
    } finally {
      setLoadingInsights(prev => ({ ...prev, serviceDistribution: false }));
    }
  };

  const generateYearlyGrowthInsights = async () => {
    if (loadingInsights.yearlyGrowth) return;
    setLoadingInsights(prev => ({ ...prev, yearlyGrowth: true }));
    try {
      const insights = await geminiService.generateInsights(
        { byYear: stats.byYear, totalOperations: stats.total, peakYear: yearlyGrowthNote?.peakYear },
        'yearlyGrowth'
      );
      setAiInsights(prev => ({ ...prev, yearlyGrowth: insights }));
    } catch (error) {
      console.error('Error generating yearly growth insights:', error);
      setAiInsights(prev => ({ ...prev, yearlyGrowth: 'Unable to generate insights at this time. Please try again later.' }));
    } finally {
      setLoadingInsights(prev => ({ ...prev, yearlyGrowth: false }));
    }
  };

  const generateTopVesselsInsights = async () => {
    if (loadingInsights.topVessels) return;
    setLoadingInsights(prev => ({ ...prev, topVessels: true }));
    try {
      const insights = await geminiService.generateInsights(
        { topVessels: stats.topVessels.slice(0, 5), totalOperations: stats.total, totalVessels: stats.topVessels.length },
        'topVessels'
      );
      setAiInsights(prev => ({ ...prev, topVessels: insights }));
    } catch (error) {
      console.error('Error generating top vessels insights:', error);
      setAiInsights(prev => ({ ...prev, topVessels: 'Unable to generate insights at this time. Please try again later.' }));
    } finally {
      setLoadingInsights(prev => ({ ...prev, topVessels: false }));
    }
  };

  const generateNextQuarterForecastInsights = async () => {
    if (loadingInsights.nextQuarterForecast) return;
    setLoadingInsights(prev => ({ ...prev, nextQuarterForecast: true }));
    try {
      const expectedVessels = Math.round(stats.total / stats.byYear.length * 1.1);
      const insights = await geminiService.generateInsights(
        { expectedVessels, totalOperations: stats.total, byYear: stats.byYear },
        'nextQuarterForecast'
      );
      setAiInsights(prev => ({ ...prev, nextQuarterForecast: insights }));
    } catch (error) {
      console.error('Error generating next quarter forecast insights:', error);
      setAiInsights(prev => ({ ...prev, nextQuarterForecast: 'Unable to generate insights at this time. Please try again later.' }));
    } finally {
      setLoadingInsights(prev => ({ ...prev, nextQuarterForecast: false }));
    }
  };

  const generatePeakPeriodPredictionInsights = async () => {
    if (loadingInsights.peakPeriodPrediction) return;
    setLoadingInsights(prev => ({ ...prev, peakPeriodPrediction: true }));
    try {
      const insights = await geminiService.generateInsights(
        { bestMonth: stats.bestMonth, byMonth: stats.byMonth },
        'peakPeriodPrediction'
      );
      setAiInsights(prev => ({ ...prev, peakPeriodPrediction: insights }));
    } catch (error) {
      console.error('Error generating peak period prediction insights:', error);
      setAiInsights(prev => ({ ...prev, peakPeriodPrediction: 'Unable to generate insights at this time. Please try again later.' }));
    } finally {
      setLoadingInsights(prev => ({ ...prev, peakPeriodPrediction: false }));
    }
  };

  const generateServiceDemandForecastInsights = async () => {
    if (loadingInsights.serviceDemandForecast) return;
    setLoadingInsights(prev => ({ ...prev, serviceDemandForecast: true }));
    try {
      const insights = await geminiService.generateInsights(
        { topServices: stats.topServices, totalOperations: stats.total },
        'serviceDemandForecast'
      );
      setAiInsights(prev => ({ ...prev, serviceDemandForecast: insights }));
    } catch (error) {
      console.error('Error generating service demand forecast insights:', error);
      setAiInsights(prev => ({ ...prev, serviceDemandForecast: 'Unable to generate insights at this time. Please try again later.' }));
    } finally {
      setLoadingInsights(prev => ({ ...prev, serviceDemandForecast: false }));
    }
  };

  const generateCapacityPlanningInsights = async () => {
    if (loadingInsights.capacityPlanning) return;
    setLoadingInsights(prev => ({ ...prev, capacityPlanning: true }));
    try {
      const recommendedCapacity = Math.round(stats.total / stats.byYear.length * 1.2);
      const insights = await geminiService.generateInsights(
        { recommendedCapacity, totalOperations: stats.total, byYear: stats.byYear },
        'capacityPlanning'
      );
      setAiInsights(prev => ({ ...prev, capacityPlanning: insights }));
    } catch (error) {
      console.error('Error generating capacity planning insights:', error);
      setAiInsights(prev => ({ ...prev, capacityPlanning: 'Unable to generate insights at this time. Please try again later.' }));
    } finally {
      setLoadingInsights(prev => ({ ...prev, capacityPlanning: false }));
    }
  };

  const generateOperationalInsights = async () => {
    if (loadingInsights.operationalInsights) return;
    setLoadingInsights(prev => ({ ...prev, operationalInsights: true }));
    try {
      const peakDayIndex = stats.byWeekday.indexOf(Math.max(...stats.byWeekday));
      const peakDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][peakDayIndex];
      const insights = await geminiService.generateInsights(
        { peakDay, peakDayCount: Math.max(...stats.byWeekday), topVessels: stats.topVessels, topServices: stats.topServices },
        'operationalInsights'
      );
      setAiInsights(prev => ({ ...prev, operationalInsights: insights }));
    } catch (error) {
      console.error('Error generating operational insights:', error);
      setAiInsights(prev => ({ ...prev, operationalInsights: 'Unable to generate insights at this time. Please try again later.' }));
    } finally {
      setLoadingInsights(prev => ({ ...prev, operationalInsights: false }));
    }
  };

  if (loading) return <div className="analytics-loading">Loading analytics…</div>;
  if (error) return <div className="analytics-error">Error: {error}</div>;
  if (!stats.total) return (
    <div className="analytics-no-data">
      <p>No valid data rows found in Excel file.</p>
      <p className="analytics-no-data-subtitle">
        Make sure the Excel file has columns: date, Vessel, Service, Control Number, Voyage number
      </p>
    </div>
  );

  return (
    <div className="analytics-content-container">
      {/* Key Performance Indicators */}
      <div className="analytics-card">
        <div className="analytics-card-title">
          Key Performance Indicators
        </div>
        <div className="analytics-kpi-grid">
          <div className="analytics-kpi-item analytics-kpi-item-total">
            <div className="analytics-kpi-value analytics-kpi-value-total">{stats.total}</div>
            <div className="analytics-kpi-label">Total Vessels</div>
          </div>
          <div className="analytics-kpi-item analytics-kpi-item-years">
            <div className="analytics-kpi-value analytics-kpi-value-years">{availableSheets.length}</div>
            <div className="analytics-kpi-label">Years Active</div>
            <div className="analytics-kpi-subtitle">
              {availableSheets.sort().join(', ')}
            </div>
          </div>
          <div className="analytics-kpi-item analytics-kpi-item-vessels">
            <div className="analytics-kpi-value analytics-kpi-value-vessels">{stats.topVessels.length}</div>
            <div className="analytics-kpi-label">Unique Vessels</div>
          </div>
        </div>
      </div>

      {/* Two Column Layout for Charts */}
      <div className="analytics-two-column">
        {/* Vessel Operations Overview */}
        <div className="analytics-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div className="analytics-card-title">
              Vessel Operations Overview
            </div>
            <button
              onClick={generateVesselOperationsOverviewInsights}
              disabled={loadingInsights.vesselOperationsOverview}
              className="ai-insights-btn"
              style={{
                padding: '6px 12px',
                fontSize: '0.85rem',
                backgroundColor: '#2F3B70',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loadingInsights.vesselOperationsOverview ? 'not-allowed' : 'pointer',
                opacity: loadingInsights.vesselOperationsOverview ? 0.6 : 1,
                fontWeight: '500'
              }}
            >
              {loadingInsights.vesselOperationsOverview ? 'Generating...' : 'AI Insights'}
            </button>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <h4 className="analytics-section-header">Peak Quarter</h4>
            <div className="analytics-progress-container">
              <div className="analytics-progress-label">
                {Object.keys(stats.byQuarter).reduce((a, b) => stats.byQuarter[a] > stats.byQuarter[b] ? a : b)}
              </div>
              <div className="analytics-progress-bar">
                <div 
                  className="analytics-progress-fill analytics-progress-fill-quarter"
                  style={{ width: `${(Math.max(...Object.values(stats.byQuarter)) / Math.max(...Object.values(stats.byQuarter))) * 100}%` }}
                ></div>
              </div>
              <div className="analytics-progress-value analytics-progress-value-quarter">{Math.max(...Object.values(stats.byQuarter))} vessels</div>
            </div>
          </div>
          
          <div>
            <h4 className="analytics-section-header">Busiest Month</h4>
            <div className="analytics-progress-container">
              <div className="analytics-progress-label">
                {stats.bestMonth?.month || 'Jan'}
              </div>
              <div className="analytics-progress-bar">
                <div 
                  className="analytics-progress-fill analytics-progress-fill-month"
                  style={{ width: `${(stats.bestMonth?.count || 0) / Math.max(stats.bestMonth?.count || 1, 1) * 100}%` }}
                ></div>
              </div>
              <div className="analytics-progress-value analytics-progress-value-month">{stats.bestMonth?.count || 0} vessels</div>
            </div>
          </div>
          {aiInsights.vesselOperationsOverview && (
            <div className="service-distribution-info">
              <p>{aiInsights.vesselOperationsOverview}</p>
            </div>
          )}
        </div>

        {/* Service Distribution */}
        <div className="analytics-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div className="analytics-card-title">
              Service Distribution
            </div>
            <button
              onClick={generateServiceDistributionInsights}
              disabled={loadingInsights.serviceDistribution}
              className="ai-insights-btn"
              style={{
                padding: '6px 12px',
                fontSize: '0.85rem',
                backgroundColor: '#2F3B70',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loadingInsights.serviceDistribution ? 'not-allowed' : 'pointer',
                opacity: loadingInsights.serviceDistribution ? 0.6 : 1,
                fontWeight: '500'
              }}
            >
              {loadingInsights.serviceDistribution ? 'Generating...' : 'AI Insights'}
            </button>
          </div>
          {stats.topServices.slice(0, 5).map((service, index) => {
            const maxCount = stats.topServices[0].count;
            const isHighest = service.count === maxCount;
            return (
              <div key={index} className="analytics-service-item">
                <div className="analytics-service-header">
                  <span className="analytics-service-name">{service.name}</span>
                  <span className="analytics-service-count">{service.count}</span>
                </div>
                <div className="analytics-service-bar">
                  <div 
                    className="analytics-service-fill"
                    style={{ 
                      background: isHighest 
                        ? 'linear-gradient(90deg, #2F3B70, #4a6fa5)'
                        : 'linear-gradient(90deg, #6b8fc7, #8fb3d9)',
                      width: `${(service.count / maxCount) * 100}%`
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
          {aiInsights.serviceDistribution && (
            <div className="service-distribution-info">
              <p>{aiInsights.serviceDistribution}</p>
            </div>
          )}
        </div>
      </div>

      {/* Two Column Layout for More Charts */}
      <div className="analytics-two-column">
        {/* Yearly Growth */}
        <div className="analytics-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div className="analytics-card-title">
              Yearly Growth
            </div>
            <button
              onClick={generateYearlyGrowthInsights}
              disabled={loadingInsights.yearlyGrowth}
              className="ai-insights-btn"
              style={{
                padding: '6px 12px',
                fontSize: '0.85rem',
                backgroundColor: '#2F3B70',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loadingInsights.yearlyGrowth ? 'not-allowed' : 'pointer',
                opacity: loadingInsights.yearlyGrowth ? 0.6 : 1,
                fontWeight: '500'
              }}
            >
              {loadingInsights.yearlyGrowth ? 'Generating...' : 'AI Insights'}
            </button>
          </div>
          {stats.byYear.map(({ year, count }, index) => {
            const maxCount = Math.max(...stats.byYear.map(y => y.count));
            const isHighest = count === maxCount;
            return (
              <div key={year} className="analytics-year-item">
                <div className="analytics-year-header">
                  <span className="analytics-year-label">{year}</span>
                  <span className="analytics-year-count">{count} vessels</span>
                </div>
                <div className="analytics-year-bar">
                  <div 
                    className="analytics-year-fill"
                    style={{ 
                      background: isHighest 
                        ? 'linear-gradient(90deg, #2F3B70, #4a6fa5)'
                        : 'linear-gradient(90deg, #6b8fc7, #8fb3d9)',
                      width: `${(count / maxCount) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
          {aiInsights.yearlyGrowth && (
            <div className="service-distribution-info">
              <p>{aiInsights.yearlyGrowth}</p>
            </div>
          )}
        </div>

        {/* Top Vessels */}
        <div className="analytics-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div className="analytics-card-title">
              Top Vessels
            </div>
            <button
              onClick={generateTopVesselsInsights}
              disabled={loadingInsights.topVessels}
              className="ai-insights-btn"
              style={{
                padding: '6px 12px',
                fontSize: '0.85rem',
                backgroundColor: '#2F3B70',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loadingInsights.topVessels ? 'not-allowed' : 'pointer',
                opacity: loadingInsights.topVessels ? 0.6 : 1,
                fontWeight: '500'
              }}
            >
              {loadingInsights.topVessels ? 'Generating...' : 'AI Insights'}
            </button>
          </div>
          {stats.topVessels.slice(0, 5).map((vessel, index) => {
            const maxCount = stats.topVessels[0]?.count || 0;
            const isHighest = vessel.count === maxCount;
            return (
              <div key={index} className="analytics-vessel-item">
                {/* Rank Number */}
                <div className={`analytics-vessel-rank ${index === 0 ? 'analytics-vessel-rank-first' : 'analytics-vessel-rank-other'}`}>
                  {index + 1}
                </div>

                {/* Vessel Info */}
                <div className="analytics-vessel-info">
                  <div className="analytics-vessel-name">
                    {vessel.name}
                  </div>
                  <div className="analytics-vessel-operations">
                    {vessel.count} operations
                  </div>
                </div>

                {/* Count Badge */}
                <div 
                  className="analytics-vessel-badge"
                  style={{
                    background: isHighest ? '#2F3B70' : '#f5f5f5',
                    color: isHighest ? 'white' : '#2F3B70'
                  }}
                >
                  {vessel.count}
                </div>
              </div>
            );
          })}
          {aiInsights.topVessels && (
            <div className="service-distribution-info">
              <p>{aiInsights.topVessels}</p>
            </div>
          )}
        </div>
      </div>

      {/* Predictive Analytics - Full Width */}
      <div className="analytics-card">
        <div className="analytics-card-title">
          Predictive Analytics
        </div>
        <div className="analytics-predictive-grid">
          {/* Next Quarter Forecast */}
          <div className="analytics-predictive-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h4 className="analytics-section-header">Next Quarter Forecast</h4>
              <button
                onClick={generateNextQuarterForecastInsights}
                disabled={loadingInsights.nextQuarterForecast}
                className="ai-insights-btn"
                style={{
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  backgroundColor: '#2F3B70',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loadingInsights.nextQuarterForecast ? 'not-allowed' : 'pointer',
                  opacity: loadingInsights.nextQuarterForecast ? 0.6 : 1,
                  fontWeight: '500'
                }}
              >
                {loadingInsights.nextQuarterForecast ? '...' : 'AI'}
              </button>
            </div>
            <div className="analytics-predictive-card analytics-predictive-card-forecast">
              <div className="analytics-predictive-header">
                <span className="analytics-predictive-label">Expected Vessels</span>
                <span className="analytics-predictive-value">
                  {Math.round(stats.total / stats.byYear.length * 1.1)}
                </span>
              </div>
              <div className="analytics-predictive-bar">
                <div className="analytics-predictive-fill" style={{ width: '85%' }}></div>
              </div>
              <div className="analytics-predictive-subtitle">
                +10% growth projection
              </div>
            </div>
            {aiInsights.nextQuarterForecast && (
              <div className="service-distribution-info" style={{ marginTop: '10px' }}>
                <p>{aiInsights.nextQuarterForecast}</p>
              </div>
            )}
          </div>

          {/* Peak Period Prediction */}
          <div className="analytics-predictive-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h4 className="analytics-section-header">Peak Period Prediction</h4>
              <button
                onClick={generatePeakPeriodPredictionInsights}
                disabled={loadingInsights.peakPeriodPrediction}
                className="ai-insights-btn"
                style={{
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  backgroundColor: '#2F3B70',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loadingInsights.peakPeriodPrediction ? 'not-allowed' : 'pointer',
                  opacity: loadingInsights.peakPeriodPrediction ? 0.6 : 1,
                  fontWeight: '500'
                }}
              >
                {loadingInsights.peakPeriodPrediction ? '...' : 'AI'}
              </button>
            </div>
            <div className="analytics-predictive-card analytics-predictive-card-peak">
              <div className="analytics-predictive-header">
                <span className="analytics-predictive-label">Predicted Peak Month</span>
                <span className="analytics-predictive-value analytics-predictive-value-peak">
                  {stats.bestMonth?.month || 'Jan'}
                </span>
              </div>
              <div className="analytics-predictive-subtitle">
                Based on historical patterns
              </div>
            </div>
            {aiInsights.peakPeriodPrediction && (
              <div className="service-distribution-info" style={{ marginTop: '10px' }}>
                <p>{aiInsights.peakPeriodPrediction}</p>
              </div>
            )}
          </div>

          {/* Service Demand Forecast */}
          <div className="analytics-predictive-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h4 className="analytics-section-header">Service Demand Forecast</h4>
              <button
                onClick={generateServiceDemandForecastInsights}
                disabled={loadingInsights.serviceDemandForecast}
                className="ai-insights-btn"
                style={{
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  backgroundColor: '#2F3B70',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loadingInsights.serviceDemandForecast ? 'not-allowed' : 'pointer',
                  opacity: loadingInsights.serviceDemandForecast ? 0.6 : 1,
                  fontWeight: '500'
                }}
              >
                {loadingInsights.serviceDemandForecast ? '...' : 'AI'}
              </button>
            </div>
            <div className="analytics-predictive-card analytics-predictive-card-service">
              <div className="analytics-predictive-header">
                <span className="analytics-predictive-label">Top Service Demand</span>
                <span className="analytics-predictive-value analytics-predictive-value-service">
                  {stats.topServices[0]?.name || 'N/A'}
                </span>
              </div>
              <div className="analytics-predictive-subtitle">
                Expected to remain dominant
              </div>
            </div>
            {aiInsights.serviceDemandForecast && (
              <div className="service-distribution-info" style={{ marginTop: '10px' }}>
                <p>{aiInsights.serviceDemandForecast}</p>
              </div>
            )}
          </div>

          {/* Capacity Planning */}
          <div className="analytics-predictive-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h4 className="analytics-section-header">Capacity Planning</h4>
              <button
                onClick={generateCapacityPlanningInsights}
                disabled={loadingInsights.capacityPlanning}
                className="ai-insights-btn"
                style={{
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  backgroundColor: '#2F3B70',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loadingInsights.capacityPlanning ? 'not-allowed' : 'pointer',
                  opacity: loadingInsights.capacityPlanning ? 0.6 : 1,
                  fontWeight: '500'
                }}
              >
                {loadingInsights.capacityPlanning ? '...' : 'AI'}
              </button>
            </div>
            <div className="analytics-predictive-card analytics-predictive-card-capacity">
              <div className="analytics-predictive-header">
                <span className="analytics-predictive-label">Recommended Capacity</span>
                <span className="analytics-predictive-value analytics-predictive-value-capacity">
                  {Math.round(stats.total / stats.byYear.length * 1.2)} vessels
                </span>
              </div>
              <div className="analytics-predictive-subtitle">
                +20% buffer for peak periods
              </div>
            </div>
            {aiInsights.capacityPlanning && (
              <div className="service-distribution-info" style={{ marginTop: '10px' }}>
                <p>{aiInsights.capacityPlanning}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Operational Insights - Full Width */}
      <div className="analytics-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div className="analytics-card-title">
            Operational Insights
          </div>
          <button
            onClick={generateOperationalInsights}
            disabled={loadingInsights.operationalInsights}
            className="ai-insights-btn"
            style={{
              padding: '6px 12px',
              fontSize: '0.85rem',
              backgroundColor: '#2F3B70',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loadingInsights.operationalInsights ? 'not-allowed' : 'pointer',
              opacity: loadingInsights.operationalInsights ? 0.6 : 1,
              fontWeight: '500'
            }}
          >
            {loadingInsights.operationalInsights ? 'Generating...' : 'AI Insights'}
          </button>
        </div>
        <div className="analytics-insights-grid">
            {/* Peak Day Card */}
            <div className="analytics-insight-card analytics-insight-card-peak">
              <div className="analytics-insight-value analytics-insight-value-peak">
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][stats.byWeekday.indexOf(Math.max(...stats.byWeekday))]}
              </div>
              <div className="analytics-insight-label">
                Peak Day
              </div>
              <div className="analytics-insight-subtitle">
                {Math.max(...stats.byWeekday)} vessels
              </div>
            </div>

            {/* Most Active Vessel Card */}
            <div className="analytics-insight-card analytics-insight-card-vessel">
              <div className="analytics-insight-value analytics-insight-value-vessel">
                {stats.topVessels[0]?.name || 'N/A'}
              </div>
              <div className="analytics-insight-label">
                Most Active Vessel
              </div>
              <div className="analytics-insight-subtitle">
                {stats.topVessels[0]?.count || 0} operations
              </div>
            </div>

            {/* Service Efficiency Card */}
            <div className="analytics-insight-card analytics-insight-card-service">
              <div className="analytics-insight-value analytics-insight-value-service">
                {stats.topServices[0]?.name || 'N/A'}
              </div>
              <div className="analytics-insight-label">
                Service Efficiency
              </div>
              <div className="analytics-insight-subtitle">
                {stats.topServices[0]?.count || 0} operations ({Math.round((stats.topServices[0]?.count || 0) / stats.total * 100)}% of total)
              </div>
            </div>
          </div>
        </div>
        {aiInsights.operationalInsights && (
          <div className="service-distribution-info">
            <p>{aiInsights.operationalInsights}</p>
          </div>
        )}
      </div>
  );
};

const Card = ({ title, children, style = {} }) => (
  <div className="analytics-card-component" style={style}>
    <div className="analytics-card-component-title">
      {title}
    </div>
    {children}
  </div>
);

const Bar = ({ data }) => {
  const max = Math.max(1, ...data.map(d=>d.value));
  return (
    <div>
      {data.map((d, idx) => (
        <div key={idx} className="analytics-bar-item">
          <div className="analytics-bar-label">{d.label}</div>
          <div className="analytics-bar-container">
            <div 
              className="analytics-bar-fill" 
              style={{ width: `${(d.value / max) * 100}%` }} 
            />
          </div>
          <div className="analytics-bar-value">{d.value}</div>
        </div>
      ))}
    </div>
  );
};

const List = ({ data }) => (
  <div>
    {data.length === 0 && <div className="analytics-list-empty">No data</div>}
    {data.map((d, idx) => (
      <div key={idx} className="analytics-list-item">
        <div className="analytics-list-label">{d.label}</div>
        <div className="analytics-list-value">{d.value}</div>
      </div>
    ))}
  </div>
);



