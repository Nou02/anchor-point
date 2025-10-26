import React, { useEffect, useMemo, useState } from 'react';
import './Report.css';
// Using dynamic import for xlsx to handle potential module resolution issues
let XLSX;

const Analytics = () => {
  const { refreshData } = useExcelData();
  
  return (
    <div className="report-page-bg" style={{ minHeight: '100vh', width: '100vw', margin: 0, padding: 0 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        minHeight: '100vh',
        padding: '5px'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1)',
          padding: '20px',
          margin: '10px',
          maxWidth: 'calc(100vw - 20px)',
          minWidth: '800px',
          width: 'calc(100vw - 20px)',
          height: 'calc(100vh - 20px)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexShrink: 0 }}>
            <h2 style={{ marginTop: 0, color: '#1e3a8a', fontSize: '1.8rem', fontWeight: '800' }}>Analytics Dashboard</h2>
            <button
              onClick={() => {
                // Force refresh by clearing any cached data and reloading
                refreshData();
              }}
              style={{
                background: '#2F3B70',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600',
                boxShadow: '0 2px 8px rgba(47, 59, 112, 0.3)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#1e2a5e';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#2F3B70';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              Refresh Data
            </button>
          </div>
          <AnalyticsContent refreshData={refreshData} />
        </div>
      </div>

      <div className="report-nav-btns">
        <button
          className="report-nav-btn"
          onClick={() => {
            localStorage.setItem('activeMenu', 'reports');
            window.location.reload();
          }}
          style={{ opacity: 1 }}
        >
          &#8592; Previous
        </button>
        <button
          className="report-nav-btn"
          style={{ opacity: 0.6, pointerEvents: 'none' }}
          disabled
        >
          Next &#8594;
        </button>
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
          
          // Convert to objects with proper column mapping
          const mappedRows = dataRows.map(row => {
            const obj = {};
            
            // Handle different sheet structures
            if (sheetName === '2023') {
              // 2023 structure: No., Vessel, Service (control numbers), ID, Date
              obj['No'] = row[0] || '';
              obj['Vessel'] = row[1] || '';
              obj['Service'] = 'W/MOORING BUOY'; // Default service for 2023
              obj['Control Number'] = row[2] || ''; // Service column contains control numbers
              obj['Voyage Number'] = row[3] || ''; // ID column
              obj['Date'] = row[4] || '';
            } else if (sheetName === '2024') {
              // 2024 structure: No., Vessel, Service (empty), Control Number, Voyage Number, Date
              obj['No'] = row[0] || '';
              obj['Vessel'] = row[1] || '';
              obj['Service'] = 'W/MOORING BUOY'; // Default service for 2024
              obj['Control Number'] = row[3] || '';
              obj['Voyage Number'] = row[4] || '';
              obj['Date'] = row[5] || '';
            } else {
              // 2025 structure: No., Vessel, Service, Control Number, Voyage Number, Date
              obj['No'] = row[0] || '';
              obj['Vessel'] = row[1] || '';
              obj['Service'] = row[2] || '';
              obj['Control Number'] = row[3] || '';
              obj['Voyage Number'] = row[4] || '';
              obj['Date'] = row[5] || '';
            }
            return obj;
          });
          
          console.log(`Sheet ${sheetName}:`, { headers, dataRows: dataRows.length, mappedRows: mappedRows.length });
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

  return { rows, loading, error, refreshData };
};

const AnalyticsContent = ({ refreshData }) => {
  const { rows, loading, error } = useExcelData();

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
      console.log('Processing row:', r);
      
      // Use the actual date from the Excel file
      const dateVal = r['Date'] ?? r.date ?? r['date'] ?? '';
      const dt = normalizeDate(dateVal);
      if (!dt) {
        console.log('No valid date found for row:', r);
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
      
      console.log('Mapped result:', result);
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

  if (loading) return <div style={{ color: '#2F3B70' }}>Loading analytics…</div>;
  if (error) return <div style={{ color: '#dc3545' }}>Error: {error}</div>;
  if (!stats.total) return (
    <div style={{ textAlign: 'center', padding: '40px' }}>
      <p style={{ color: '#6c757d' }}>No valid data rows found in Excel file.</p>
      <p style={{ fontSize: '14px', color: '#666' }}>
        Make sure the Excel file has columns: date, Vessel, Service, Control Number, Voyage number
      </p>
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', flex: 1, overflow: 'hidden' }}>
      {/* Key Performance Indicators */}
      <Card title="Key Performance Indicators" style={{ gridColumn: '1 / -1' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', padding: '20px' }}>
          <div style={{ textAlign: 'center', padding: '20px', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', borderRadius: '12px', border: '1px solid rgba(30, 58, 138, 0.1)', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '8px' }}>{stats.total}</div>
            <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: '600' }}>Total Vessels</div>
          </div>
          <div style={{ textAlign: 'center', padding: '20px', background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.2)', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#059669', marginBottom: '8px' }}>{stats.byYear.length}</div>
            <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: '600' }}>Years Active</div>
          </div>
          <div style={{ textAlign: 'center', padding: '20px', background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#d97706', marginBottom: '8px' }}>{stats.topServices.length}</div>
            <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: '600' }}>Service Types</div>
          </div>
          <div style={{ textAlign: 'center', padding: '20px', background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', borderRadius: '12px', border: '1px solid rgba(14, 165, 233, 0.2)', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#0284c7', marginBottom: '8px' }}>{stats.topVessels.length}</div>
            <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: '600' }}>Unique Vessels</div>
          </div>
        </div>
      </Card>

      {/* Vessel Operations Overview */}
      <Card title="Vessel Operations Overview">
        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ color: '#2F3B70', marginBottom: '5px', fontSize: '0.9rem' }}>Peak Quarter</h4>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ width: '60px', fontSize: '0.9rem', color: '#6c757d' }}>
                {Object.keys(stats.byQuarter).reduce((a, b) => stats.byQuarter[a] > stats.byQuarter[b] ? a : b)}
              </div>
              <div style={{ flex: 1, height: '12px', background: '#e9ecef', borderRadius: '6px', margin: '0 10px', overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  background: 'linear-gradient(90deg, #2F3B70, #4a6fa5)', 
                  width: `${(Math.max(...Object.values(stats.byQuarter)) / Math.max(...Object.values(stats.byQuarter))) * 100}%`,
                  borderRadius: '10px'
                }}></div>
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2F3B70' }}>{Math.max(...Object.values(stats.byQuarter))}</div>
            </div>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#2F3B70', marginBottom: '10px' }}>Busiest Month</h4>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ width: '60px', fontSize: '0.9rem', color: '#6c757d' }}>
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][stats.byMonth.indexOf(Math.max(...stats.byMonth))]}
              </div>
              <div style={{ flex: 1, height: '12px', background: '#e9ecef', borderRadius: '6px', margin: '0 10px', overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  background: 'linear-gradient(90deg, #28a745, #5cb85c)', 
                  width: `${(Math.max(...stats.byMonth) / Math.max(...stats.byMonth)) * 100}%`,
                  borderRadius: '10px'
                }}></div>
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#28a745' }}>{Math.max(...stats.byMonth)}</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Service Distribution */}
      <Card title="Service Distribution">
        <div style={{ padding: '20px' }}>
          {stats.topServices.slice(0, 5).map((service, index) => (
            <div key={index} style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontSize: '0.9rem', color: '#2F3B70' }}>{service.name}</span>
                <span style={{ fontWeight: 'bold', color: '#2F3B70' }}>{service.count}</span>
              </div>
              <div style={{ height: '8px', background: '#e9ecef', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  background: `hsl(${index * 60}, 70%, 50%)`,
                  width: `${(service.count / stats.topServices[0].count) * 100}%`,
                  borderRadius: '4px'
                }}></div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Yearly Growth */}
      <Card title="Yearly Growth">
        <div style={{ padding: '20px' }}>
          {stats.byYear.map(({ year, count }, index) => (
            <div key={year} style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontSize: '0.9rem', color: '#2F3B70' }}>{year}</span>
                <span style={{ fontWeight: 'bold', color: '#2F3B70' }}>{count}</span>
              </div>
              <div style={{ height: '12px', background: '#e9ecef', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  background: `linear-gradient(90deg, #17a2b8, #5bc0de)`,
                  width: `${(count / Math.max(...stats.byYear.map(y => y.count))) * 100}%`,
                  borderRadius: '6px'
                }}></div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Top Vessels */}
      <Card title="Top Vessels">
        <div style={{ padding: '20px' }}>
          {stats.topVessels.slice(0, 5).map((vessel, index) => (
            <div key={index} style={{ 
              display: 'flex', 
              alignItems: 'center',
              padding: '16px 0',
              borderBottom: index < 4 ? '1px solid #f0f0f0' : 'none',
              transition: 'all 0.2s ease'
            }}>
              {/* Rank Number */}
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: index === 0 ? '#2F3B70' : '#f5f5f5',
                color: index === 0 ? 'white' : '#666',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
                fontWeight: '600',
                marginRight: '16px',
                flexShrink: 0
              }}>
                {index + 1}
              </div>

              {/* Vessel Info */}
              <div style={{ 
                flex: 1,
                minWidth: 0
              }}>
                <div style={{ 
                  fontSize: '1rem', 
                  fontWeight: '500',
                  color: '#2F3B70',
                  marginBottom: '4px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {vessel.name}
                </div>
                <div style={{ 
                  fontSize: '0.85rem',
                  color: '#888'
                }}>
                  {vessel.count} operations
                </div>
              </div>

              {/* Count Badge */}
              <div style={{ 
                background: '#f8f9fa',
                color: '#2F3B70',
                padding: '6px 12px',
                borderRadius: '16px',
                fontSize: '0.9rem',
                fontWeight: '600',
                flexShrink: 0
              }}>
                {vessel.count}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Predictive Analytics */}
      <Card title="Predictive Analytics" style={{ gridColumn: '1 / -1' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '20px' }}>
          {/* Next Quarter Forecast */}
          <div>
            <h4 style={{ color: '#2F3B70', marginBottom: '15px' }}>Next Quarter Forecast</h4>
            <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.9rem', color: '#6c757d' }}>Expected Vessels</span>
                <span style={{ fontWeight: 'bold', color: '#2F3B70' }}>
                  {Math.round(stats.total / stats.byYear.length * 1.1)}
                </span>
              </div>
              <div style={{ height: '8px', background: '#e9ecef', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  background: 'linear-gradient(90deg, #28a745, #5cb85c)', 
                  width: '85%',
                  borderRadius: '4px'
                }}></div>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '5px' }}>
                +10% growth projection
              </div>
            </div>
          </div>

          {/* Peak Period Prediction */}
          <div>
            <h4 style={{ color: '#2F3B70', marginBottom: '15px' }}>Peak Period Prediction</h4>
            <div style={{ background: '#fff3cd', padding: '15px', borderRadius: '8px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.9rem', color: '#6c757d' }}>Predicted Peak Month</span>
                <span style={{ fontWeight: 'bold', color: '#ffc107' }}>
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][stats.byMonth.indexOf(Math.max(...stats.byMonth))]}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
                Based on historical patterns
              </div>
            </div>
          </div>

          {/* Service Demand Forecast */}
          <div>
            <h4 style={{ color: '#2F3B70', marginBottom: '15px' }}>Service Demand Forecast</h4>
            <div style={{ background: '#d1ecf1', padding: '15px', borderRadius: '8px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.9rem', color: '#6c757d' }}>Top Service Demand</span>
                <span style={{ fontWeight: 'bold', color: '#17a2b8' }}>
                  {stats.topServices[0]?.name || 'N/A'}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
                Expected to remain dominant
              </div>
            </div>
          </div>

          {/* Capacity Planning */}
          <div>
            <h4 style={{ color: '#2F3B70', marginBottom: '15px' }}>Capacity Planning</h4>
            <div style={{ background: '#e8f5e8', padding: '15px', borderRadius: '8px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.9rem', color: '#6c757d' }}>Recommended Capacity</span>
                <span style={{ fontWeight: 'bold', color: '#28a745' }}>
                  {Math.round(stats.total / stats.byYear.length * 1.2)} vessels
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
                +20% buffer for peak periods
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Operational Insights */}
      <Card title="Operational Insights">
        <div style={{ padding: '20px' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '20px' 
          }}>
            {/* Peak Day Card */}
            <div style={{ 
              background: '#f8f9fa', 
              padding: '20px', 
              borderRadius: '12px',
              border: '1px solid #e9ecef',
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: '2.5rem', 
                fontWeight: 'bold', 
                color: '#28a745',
                marginBottom: '8px'
              }}>
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][stats.byWeekday.indexOf(Math.max(...stats.byWeekday))]}
              </div>
              <div style={{ 
                color: '#2F3B70', 
                fontWeight: '600', 
                marginBottom: '5px',
                fontSize: '0.9rem'
              }}>
                Peak Day
              </div>
              <div style={{ color: '#6c757d', fontSize: '0.8rem' }}>
                {Math.max(...stats.byWeekday)} vessels
              </div>
            </div>

            {/* Most Active Vessel Card */}
            <div style={{ 
              background: '#fff3cd', 
              padding: '20px', 
              borderRadius: '12px',
              border: '1px solid #ffeaa7',
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: '1.1rem', 
                fontWeight: 'bold', 
                color: '#2F3B70',
                marginBottom: '8px',
                wordBreak: 'break-word'
              }}>
                {stats.topVessels[0]?.name || 'N/A'}
              </div>
              <div style={{ 
                color: '#2F3B70', 
                fontWeight: '600', 
                marginBottom: '5px',
                fontSize: '0.9rem'
              }}>
                Most Active Vessel
              </div>
              <div style={{ color: '#6c757d', fontSize: '0.8rem' }}>
                {stats.topVessels[0]?.count || 0} operations
              </div>
            </div>

            {/* Service Efficiency Card */}
            <div style={{ 
              background: '#d1ecf1', 
              padding: '20px', 
              borderRadius: '12px',
              border: '1px solid #bee5eb',
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: '1.1rem', 
                fontWeight: 'bold', 
                color: '#17a2b8',
                marginBottom: '8px',
                wordBreak: 'break-word'
              }}>
                {stats.topServices[0]?.name || 'N/A'}
              </div>
              <div style={{ 
                color: '#2F3B70', 
                fontWeight: '600', 
                marginBottom: '5px',
                fontSize: '0.9rem'
              }}>
                Service Efficiency
              </div>
              <div style={{ color: '#6c757d', fontSize: '0.8rem' }}>
                {stats.topServices[0]?.count || 0} operations ({Math.round((stats.topServices[0]?.count || 0) / stats.total * 100)}% of total)
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

const Card = ({ title, children }) => (
  <div style={{
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    border: '1px solid #e9ecef',
    padding: '20px'
  }}>
    <div style={{ color: '#2F3B70', fontWeight: 700, marginBottom: 12 }}>{title}</div>
    {children}
  </div>
);

const Bar = ({ data }) => {
  const max = Math.max(1, ...data.map(d=>d.value));
  return (
    <div>
      {data.map((d, idx) => (
        <div key={idx} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ width: 80, color: '#6c757d', fontSize: '0.9rem' }}>{d.label}</div>
          <div style={{ flex: 1, background: '#f8f9fa', height: 12, borderRadius: 6, overflow: 'hidden', border: '1px solid #e9ecef' }}>
            <div style={{ width: `${(d.value / max) * 100}%`, height: '100%', background: 'linear-gradient(135deg,#2F3B70,#4156a1)', borderRadius: 6 }} />
          </div>
          <div style={{ width: 50, textAlign: 'right', marginLeft: 8, color: '#2F3B70', fontWeight: 600 }}>{d.value}</div>
        </div>
      ))}
    </div>
  );
};

const List = ({ data }) => (
  <div>
    {data.length === 0 && <div style={{ color: '#6c757d' }}>No data</div>}
    {data.map((d, idx) => (
      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f3f5' }}>
        <div style={{ color: '#2F3B70', fontWeight: 600 }}>{d.label}</div>
        <div style={{ color: '#2F3B70' }}>{d.value}</div>
      </div>
    ))}
  </div>
);


