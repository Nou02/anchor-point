const API_BASE_URL = 'http://localhost:5000/api';

export const analyticsService = {
  async getDashboardAnalytics() {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/dashboard`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching dashboard analytics:', error);
      // Return empty data structure when backend is unavailable
      return {
        success: false,
        error: error.message,
        analytics: {
          totalVessels: 0,
          vesselsByStatus: {
            docked: 0,
            atSea: 0,
            maintenance: 0
          },
          operationalEfficiency: 0,
          crewAvailability: {
            captains: { available: 0, total: 0 },
            engineers: { available: 0, total: 0 },
            deckhands: { available: 0, total: 0 }
          },
          recentOperations: [],
          fuelConsumption: {
            today: 0,
            thisWeek: 0,
            vsLastWeek: "0%"
          },
          maintenanceCompliance: {
            onTimePercentage: 0,
            items: []
          },
          vesselStats: {
            uniqueVessels: 0,
            totalOperations: 0
          }
        }
      };
    }
  },

  async getVesselsLogData() {
    try {
      // Fetch Excel file directly from public folder
      const response = await fetch('/Vessels Log.xlsx');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      
      // Dynamically import xlsx library
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // Process all sheets and combine data
      let allVesselsData = [];
      
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Find the header row (look for 'Vessel' column)
        let headerRowIndex = -1;
        for (let i = 0; i < jsonData.length; i++) {
          if (jsonData[i] && jsonData[i].includes('Vessel')) {
            headerRowIndex = i;
            break;
          }
        }
        
        if (headerRowIndex >= 0 && headerRowIndex < jsonData.length - 1) {
          const headers = jsonData[headerRowIndex];
          const dataRows = jsonData.slice(headerRowIndex + 1);
          
          const mappedRows = dataRows.map(row => {
            const obj = {};
            headers.forEach((header, index) => {
              if (header) {
                obj[header] = row[index] || '';
              }
            });
            return obj;
          }).filter(row => row['Vessel'] && row['Vessel'].trim() !== '');
          
          allVesselsData = allVesselsData.concat(mappedRows);
        }
      }
      
      return {
        success: true,
        vessels: allVesselsData.map((vessel, index) => ({
          date: vessel['Date'] || '',
          vessel: vessel['Vessel'] || '',
          voyage: vessel['Voyage Number'] || '',
          port: vessel['Service'] || '',
          purpose: vessel['Service'] || '',
          controlId: vessel['Control Number'] || '',
          updatedBy: 'system@anchorpoint.com'
        }))
      };
    } catch (error) {
      console.error('Error fetching vessels log data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};
