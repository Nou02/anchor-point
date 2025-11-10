import React, { useState, useEffect } from 'react';
import { getCurrentWeather, getWeatherForecast } from '../services/weatherService';
import './Weather.css';

const Weather = () => {
  const [currentWeather, setCurrentWeather] = useState(null);
  const [forecast, setForecast] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWeatherData = async () => {
      setLoading(true);
      try {
        const [current, forecastData] = await Promise.all([
          getCurrentWeather(),
          getWeatherForecast()
        ]);
        
        setCurrentWeather(current);
        setForecast(forecastData);
        setError(null);
      } catch (err) {
        setError('Failed to fetch weather data');
        console.error('Weather fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWeatherData();
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: 'calc(100vh - 32px)',
        background: '#eaf2ff'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.2rem', color: '#2F3B70', marginBottom: '16px' }}>
            Loading weather data for Sta. Rita Aplaya, Batangas...
          </div>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #2F3B70',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
        </div>
      </div>
    );
  }

  if (error) {
  return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: 'calc(100vh - 32px)',
        background: '#eaf2ff',
        flexDirection: 'column'
      }}>
        <div style={{ 
          color: '#dc3545', 
          fontSize: '1.2rem', 
          marginBottom: '16px',
          textAlign: 'center'
        }}>
          {error}
        </div>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            background: '#2F3B70',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{
      height: 'calc(100vh - 32px)',
      width: '100%',
      padding: '20px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        boxSizing: 'border-box',
        overflowY: 'auto'
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '30px',
        color: 'white'
      }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 'bold', 
          marginBottom: '8px',
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
        }}>
          Weather Forecast
        </h1>
        <p style={{ 
          fontSize: '1.2rem', 
          opacity: 0.9,
          textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
        }}>
          Sta. Rita Aplaya, Batangas, Philippines
        </p>
      </div>

      {/* Current Weather */}
      {currentWeather && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '20px',
          padding: '30px',
          marginBottom: '30px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h2 style={{ 
            color: '#2F3B70', 
            marginBottom: '20px',
            fontSize: '1.8rem'
          }}>
            Current Conditions
          </h2>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '20px',
            flexWrap: 'wrap'
          }}>
            <div style={{
              background: currentWeather.color,
              color: currentWeather.color === '#FFD700' || currentWeather.color === '#FFFFFF' ? '#000' : '#fff',
              padding: '20px',
              borderRadius: '15px',
              minWidth: '120px',
              fontWeight: 'bold',
              fontSize: '1.1rem'
            }}>
              {currentWeather.condition}
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#2F3B70' }}>
              {currentWeather.temperature}°C
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>Humidity:</strong> {currentWeather.humidity}%
              </div>
              <div>
                <strong>Wind Speed:</strong> {currentWeather.windSpeed} km/h
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5-Day Forecast */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '20px',
        padding: '30px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ 
          color: '#2F3B70', 
          marginBottom: '20px',
          fontSize: '1.8rem',
          textAlign: 'center'
        }}>
          5-Day Forecast
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px'
        }}>
          {Object.values(forecast).slice(0, 5).map((day, index) => (
            <div key={index} style={{
              background: day.color,
              color: day.color === '#FFD700' || day.color === '#FFFFFF' ? '#000' : '#fff',
              padding: '20px',
              borderRadius: '15px',
              textAlign: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
            }}>
              <div style={{ 
                fontSize: '1.1rem', 
                fontWeight: 'bold',
                marginBottom: '8px'
              }}>
                {new Date(day.date).toLocaleDateString('en-US', { 
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
              <div style={{ 
                fontSize: '2rem', 
                fontWeight: 'bold',
                marginBottom: '8px'
              }}>
                {day.temperature}°C
              </div>
              <div style={{ 
                fontSize: '1rem',
                marginBottom: '8px'
              }}>
                {day.condition}
              </div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                Humidity: {day.humidity}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weather Legend */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '15px',
        padding: '20px',
        marginTop: '20px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ 
          color: '#2F3B70', 
          marginBottom: '15px',
          textAlign: 'center'
        }}>
          Weather Color Legend
        </h3>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '20px',
          flexWrap: 'wrap'
        }}>
          {[
            { color: '#FFD700', label: 'Sunny' },
            { color: '#D3D3D3', label: 'Cloudy' },
            { color: '#FFB6C1', label: 'Light Rain' },
            { color: '#FF6B6B', label: 'Rain' },
            { color: '#DC143C', label: 'Heavy Rain' },
            { color: '#8B0000', label: 'Storm' }
          ].map((item, index) => (
            <div key={index} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                background: item.color,
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}></div>
              <span style={{ color: '#2F3B70', fontWeight: '500' }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Weather;
