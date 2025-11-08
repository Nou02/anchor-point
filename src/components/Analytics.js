import React, { useEffect, useMemo, useState } from 'react';
import './Analytics.css';
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
      
      // Standardize mooring buoy variations
      if (normalized.includes('MOORING BUOY')) {
        if (normalized.includes('SHIFTING')) {
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
    const byMonth = new Array(12).fill(0);
    const byWeekday = new Array(7).fill(0);
    const byYearMap = new Map();
    const byQuarter = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
    const serviceCount = new Map();
    const vesselStats = new Map(); // Store both count and latest date

    const quarterOf = (m) => {
      // Quarters: Q1 (Jan-Mar), Q2 (Apr-Jun), Q3 (Jul-Sep), Q4 (Oct-Dec)
      if ([0,1,2].includes(m)) return 'Q1';
      if ([3,4,5].includes(m)) return 'Q2';
      if ([6,7,8].includes(m)) return 'Q3';
      return 'Q4';
    };

    for (const item of parsed) {
      const m = item.date.getMonth();
      const d = item.date.getDay();
      const y = item.date.getFullYear();

      byMonth[m]++;
      byWeekday[d]++;
      byQuarter[quarterOf(m)]++;
      byYearMap.set(y, (byYearMap.get(y) || 0) + 1);
      if (item.service) serviceCount.set(item.service, (serviceCount.get(item.service) || 0) + 1);
      
      // Track vessel stats with latest date
      if (item.vessel) {
        const currentStats = vesselStats.get(item.vessel) || { count: 0, latestDate: new Date(0) };
        currentStats.count++;
        if (item.date > currentStats.latestDate) {
          currentStats.latestDate = item.date;
        }
        vesselStats.set(item.vessel, currentStats);
      }
    }

    const byYear = Array.from(byYearMap.entries()).sort((a,b)=>a[0]-b[0]).map(([year,count])=>({year,count}));
    const topServices = Array.from(serviceCount.entries()).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,count])=>({name,count}));
    
    // Sort vessels by most recent activity (latest date first)
    const topVessels = Array.from(vesselStats.entries())
      .map(([name, stats]) => ({ name, count: stats.count, latestDate: stats.latestDate }))
      .sort((a, b) => {
        // Primary sort: by latest date (most recent first)
        if (b.latestDate.getTime() !== a.latestDate.getTime()) {
          return b.latestDate.getTime() - a.latestDate.getTime();
        }
        // Secondary sort: by count (highest first) if dates are equal
        return b.count - a.count;
      })
      .slice(0, 5);
    return { byMonth, byWeekday, byQuarter, byYear, total: parsed.length, topServices, topVessels };
  }, [parsed]);

  const yearlyGrowthNote = useMemo(() => {
    const data = stats.byYear;
    if (!data || data.length === 0) return '';
    if (data.length === 1) {
      return `${data[0].year} recorded ${data[0].count} operations.`;
    }

    const first = data[0];
    const last = data[data.length - 1];
    const maxEntry = data.reduce((best, current) => current.count > best.count ? current : best, data[0]);
    const minEntry = data.reduce((best, current) => current.count < best.count ? current : best, data[0]);
    const total = data.reduce((sum, entry) => sum + entry.count, 0);
    const average = Math.round(total / data.length);
    const range = maxEntry.count - minEntry.count;

    const isIncreasing = data.every((entry, index) => index === 0 || entry.count >= data[index - 1].count);
    const isDecreasing = data.every((entry, index) => index === 0 || entry.count <= data[index - 1].count);

    if (isIncreasing && last.count > first.count) {
      return `Operations climbed from ${first.year} to ${last.year}.`;
    }

    if (isDecreasing && last.count < first.count) {
      return `Operations cooled from ${first.year} to ${last.year}.`;
    }

    if (range <= Math.max(3, Math.round(average * 0.1))) {
      return `Operations held near ${average} per year.`;
    }

    if (maxEntry.year === last.year && last.count >= first.count) {
      return `Operations hit a high in ${last.year}.`;
    }

    if (maxEntry.year === first.year && last.count < first.count) {
      return `Operations have eased since ${first.year}.`;
    }

    if (maxEntry.year === last.year) {
      return `Operations finished strong in ${last.year}.`;
    }

    return `Operations peaked in ${maxEntry.year} and eased in ${last.year}.`;
  }, [stats.byYear]);

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
          <div className="analytics-kpi-item analytics-kpi-item-services">
            <div className="analytics-kpi-value analytics-kpi-value-services">{stats.topServices.length}</div>
            <div className="analytics-kpi-label">Service Types</div>
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
          <div className="analytics-card-title">
            Vessel Operations Overview
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
              <div className="analytics-progress-value analytics-progress-value-quarter">{Math.max(...Object.values(stats.byQuarter))}</div>
            </div>
          </div>
          
          <div>
            <h4 className="analytics-section-header">Busiest Month</h4>
            <div className="analytics-progress-container">
              <div className="analytics-progress-label">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][stats.byMonth.indexOf(Math.max(...stats.byMonth))]}
              </div>
              <div className="analytics-progress-bar">
                <div 
                  className="analytics-progress-fill analytics-progress-fill-month"
                  style={{ width: `${(Math.max(...stats.byMonth) / Math.max(...stats.byMonth)) * 100}%` }}
                ></div>
              </div>
              <div className="analytics-progress-value analytics-progress-value-month">{Math.max(...stats.byMonth)}</div>
            </div>
          </div>
        </div>

        {/* Service Distribution */}
        <div className="analytics-card">
          <div className="analytics-card-title">
            Service Distribution
          </div>
          {stats.topServices.slice(0, 5).map((service, index) => (
            <div key={index} className="analytics-service-item">
              <div className="analytics-service-header">
                <span className="analytics-service-name">{service.name}</span>
                <span className="analytics-service-count">{service.count}</span>
              </div>
              <div className="analytics-service-bar">
                <div 
                  className="analytics-service-fill"
                  style={{ 
                    background: `hsl(${index * 60}, 70%, 50%)`,
                    width: `${(service.count / stats.topServices[0].count) * 100}%`
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout for More Charts */}
      <div className="analytics-two-column">
        {/* Yearly Growth */}
        <div className="analytics-card">
          <div className="analytics-card-title">
            Yearly Growth
          </div>
          {stats.byYear.map(({ year, count }, index) => (
            <div key={year} className="analytics-year-item">
              <div className="analytics-year-header">
                <span className="analytics-year-label">{year}</span>
                <span className="analytics-year-count">{count}</span>
              </div>
              <div className="analytics-year-bar">
                <div 
                  className="analytics-year-fill"
                  style={{ width: `${(count / Math.max(...stats.byYear.map(y => y.count))) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
          {yearlyGrowthNote && (
            <div className="analytics-year-note">
              {yearlyGrowthNote}
            </div>
          )}
        </div>

        {/* Top Vessels */}
        <div className="analytics-card">
          <div className="analytics-card-title">
            Top Vessels
          </div>
          {stats.topVessels.slice(0, 5).map((vessel, index) => (
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
              <div className="analytics-vessel-badge">
                {vessel.count}
              </div>
            </div>
          ))}
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
            <h4 className="analytics-section-header">Next Quarter Forecast</h4>
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
          </div>

          {/* Peak Period Prediction */}
          <div className="analytics-predictive-section">
            <h4 className="analytics-section-header">Peak Period Prediction</h4>
            <div className="analytics-predictive-card analytics-predictive-card-peak">
              <div className="analytics-predictive-header">
                <span className="analytics-predictive-label">Predicted Peak Month</span>
                <span className="analytics-predictive-value analytics-predictive-value-peak">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][stats.byMonth.indexOf(Math.max(...stats.byMonth))]}
                </span>
              </div>
              <div className="analytics-predictive-subtitle">
                Based on historical patterns
              </div>
            </div>
          </div>

          {/* Service Demand Forecast */}
          <div className="analytics-predictive-section">
            <h4 className="analytics-section-header">Service Demand Forecast</h4>
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
          </div>

          {/* Capacity Planning */}
          <div className="analytics-predictive-section">
            <h4 className="analytics-section-header">Capacity Planning</h4>
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
          </div>
        </div>
      </div>

      {/* Operational Insights - Full Width */}
      <div className="analytics-card">
        <div className="analytics-card-title">
          Operational Insights
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


