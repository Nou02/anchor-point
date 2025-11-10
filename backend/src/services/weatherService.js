// Weather service for Sta. Rita Aplaya Batangas
// Coordinates: 13.8333° N, 120.9167° E (approximate for Sta. Rita Aplaya, Batangas)

// Get API key from environment variable (set in .env file)
const WEATHER_API_KEY = process.env.REACT_APP_OPENWEATHERMAP_API_KEY || '';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Debug: Log API key status (check console after server restart)
if (!WEATHER_API_KEY || WEATHER_API_KEY.trim() === '') {
  console.warn('⚠️ OpenWeatherMap API key not found. Weather data will be unavailable until REACT_APP_OPENWEATHERMAP_API_KEY is set and the app is rebuilt.');
} else {
  console.log('✅ OpenWeatherMap API key loaded:', WEATHER_API_KEY.substring(0, 8) + '...' + WEATHER_API_KEY.substring(WEATHER_API_KEY.length - 4));
}

// Coordinates for Sta. Rita Aplaya, Batangas, Philippines
const LOCATION_COORDS = {
  lat: 13.8333,
  lon: 120.9167
};

// Weather condition mapping to colors
const WEATHER_COLORS = {
  // Clear/Sunny conditions
  'clear': '#FFD700', // Gold/Yellow
  'sunny': '#FFD700',
  
  // Cloudy conditions
  'clouds': '#D3D3D3', // Light Gray
  'overcast': '#A9A9A9', // Dark Gray
  
  // Rain conditions
  'rain': '#FF6B6B', // Light Red
  'light rain': '#FFB6C1', // Light Pink
  'moderate rain': '#FF8C8C', // Medium Red
  'heavy rain': '#DC143C', // Dark Red
  'drizzle': '#FFB6C1', // Light Pink
  
  // Storm conditions
  'thunderstorm': '#8B0000', // Dark Red
  'storm': '#8B0000',
  
  // Snow conditions (unlikely in Philippines but included for completeness)
  'snow': '#FFFFFF', // White
  'light snow': '#F0F8FF', // Alice Blue
  
  // Fog/Mist conditions
  'fog': '#C0C0C0', // Silver
  'mist': '#D3D3D3', // Light Gray
  'haze': '#D3D3D3', // Light Gray
  
  // Default
  'default': '#E0E0E0' // Light Gray
};

// Get weather color based on condition
export const getWeatherColor = (condition) => {
  if (!condition) return WEATHER_COLORS.default;
  
  const conditionLower = condition.toLowerCase();
  
  // Check for specific conditions
  for (const [key, color] of Object.entries(WEATHER_COLORS)) {
    if (conditionLower.includes(key)) {
      return color;
    }
  }
  
  return WEATHER_COLORS.default;
};

// Fetch current weather
export const getCurrentWeather = async () => {
  // Check if API key is configured
  if (!WEATHER_API_KEY || WEATHER_API_KEY.trim() === '') {
    throw new Error('OpenWeatherMap API key is not configured.');
  }

  try {
    // Build URL with proper encoding
    const url = `${BASE_URL}/weather?lat=${LOCATION_COORDS.lat}&lon=${LOCATION_COORDS.lon}&appid=${encodeURIComponent(WEATHER_API_KEY)}&units=metric`;
    const response = await fetch(url);
    
    if (!response.ok) {
      // Handle 401 Unauthorized specifically
      if (response.status === 401) {
        console.warn('⚠️ OpenWeatherMap API returned 401 Unauthorized. Please verify your API key is valid and activated.');
        throw new Error('Invalid API key or API key not activated');
      }
      throw new Error(`Failed to fetch weather data: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return {
      temperature: Math.round(data.main.temp),
      condition: data.weather[0].main,
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      color: getWeatherColor(data.weather[0].main)
    };
  } catch (error) {
    console.error('Failed to fetch current weather:', error);
    throw error;
  }
};

// Fetch 5-day weather forecast
export const getWeatherForecast = async () => {
  // Check if API key is configured
  if (!WEATHER_API_KEY || WEATHER_API_KEY.trim() === '') {
    throw new Error('OpenWeatherMap API key is not configured.');
  }

  try {
    // Build URL with proper encoding
    const url = `${BASE_URL}/forecast?lat=${LOCATION_COORDS.lat}&lon=${LOCATION_COORDS.lon}&appid=${encodeURIComponent(WEATHER_API_KEY)}&units=metric`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      // Handle 401 Unauthorized specifically
      if (response.status === 401) {
        console.warn('⚠️ OpenWeatherMap API returned 401 Unauthorized. Please verify your API key is valid and activated.');
        throw new Error('Invalid API key or API key not activated');
      }
      throw new Error(`Failed to fetch weather forecast: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Group forecast by date and get daily weather
    const dailyForecast = {};
    
    data.list.forEach(item => {
      const date = new Date(item.dt * 1000);
      const dateKey = date.toISOString().split('T')[0];
      
      if (!dailyForecast[dateKey]) {
        dailyForecast[dateKey] = {
          date: dateKey,
          temperature: Math.round(item.main.temp),
          condition: item.weather[0].main,
          description: item.weather[0].description,
          humidity: item.main.humidity,
          windSpeed: item.wind.speed,
          color: getWeatherColor(item.weather[0].main)
        };
      }
    });
    
    return dailyForecast;
  } catch (error) {
    console.error('Failed to fetch weather forecast:', error);
    throw error;
  }
};

// Mock weather data for development (when API key is not available)
export const getMockWeatherData = () => {
  const mockData = {};
  const today = new Date();
  
  // Generate mock weather for the next 30 days
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateKey = date.toISOString().split('T')[0];
    
    // Random weather conditions
    const conditions = ['Clear', 'Clouds', 'Rain', 'Thunderstorm', 'Drizzle'];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    
    mockData[dateKey] = {
      date: dateKey,
      temperature: Math.floor(Math.random() * 15) + 25, // 25-40°C
      condition: condition,
      description: condition.toLowerCase(),
      humidity: Math.floor(Math.random() * 40) + 60, // 60-100%
      windSpeed: Math.floor(Math.random() * 10) + 5, // 5-15 km/h
      color: getWeatherColor(condition)
    };
  }
  
  return mockData;
};

// Get weather for a specific date
export const getWeatherForDate = async (date) => {
  try {
    const forecast = await getWeatherForecast();
    const dateKey = date.toISOString().split('T')[0];
    return forecast[dateKey] || null;
  } catch (error) {
    return null;
  }
};
