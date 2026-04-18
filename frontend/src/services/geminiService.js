// Use relative URL if API_URL is not set, otherwise use full URL
const getApiBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  // Try to detect if we're in development (localhost) or production
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

export const geminiService = {
  async generateInsights(data, chartType) {
    try {
      console.log('Calling Gemini API endpoint:', `${API_BASE_URL}/gemini/insights`);
      
      const response = await fetch(`${API_BASE_URL}/gemini/insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: data,
          chartType: chartType
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || `HTTP error! status: ${response.status}`;
        console.error('Gemini API error:', errorMessage);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      if (result.success && result.insights) {
        return result.insights;
      }
      
      throw new Error(result.error || 'Invalid response format from API');
    } catch (error) {
      console.error('Error generating insights with Gemini:', error);
      
      // Provide more helpful error messages
      if (error.message.includes('404') || error.message.includes('Failed to fetch')) {
        throw new Error('Backend server may not be running. Please ensure the Flask server is running on port 5000.');
      }
      
      throw error;
    }
  }
};

