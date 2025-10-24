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
      const response = await fetch(`${API_BASE_URL}/excel/vessels-log`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching vessels log data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};
