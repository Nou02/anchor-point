import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from './Dashboard';

// Mock the API service
jest.mock('../services/api', () => ({
  get: jest.fn(() => Promise.resolve({
    data: {
      success: true,
      analytics: {
        totalVessels: 5,
        vesselsByStatus: {
          docked: 3,
          atSea: 2,
          maintenance: 0
        },
        operationalEfficiency: 85.5,
        crewAvailability: {
          captains: { available: 4, total: 5 },
          engineers: { available: 6, total: 8 },
          deckhands: { available: 12, total: 15 }
        },
        recentOperations: [
          { vessel: 'Test Vessel 1', status: 'Docked', time: '2 hours ago', voyage: 'VOY001' },
          { vessel: 'Test Vessel 2', status: 'At Sea', time: '4 hours ago', voyage: 'VOY002' }
        ],
        fuelConsumption: {
          today: 1500,
          thisWeek: 10500,
          vsLastWeek: '+5%'
        },
        maintenanceCompliance: {
          onTimePercentage: 92,
          items: [
            { task: 'Safety Inspection', status: 'Complete' },
            { task: 'Navigation Systems', status: 'Complete' }
          ]
        }
      }
    }
  }))
}));

// Mock the weather service
jest.mock('../services/weatherService', () => ({
  getWeatherData: jest.fn(() => Promise.resolve({
    temperature: 22,
    condition: 'Sunny',
    windSpeed: 15,
    humidity: 65
  }))
}));

describe('Dashboard Component', () => {
  test('renders dashboard title', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  test('displays vessel statistics', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument(); // Total vessels
      expect(screen.getByText('Docked')).toBeInTheDocument();
      expect(screen.getByText('At Sea')).toBeInTheDocument();
    });
  });

  test('displays crew availability', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Captains')).toBeInTheDocument();
      expect(screen.getByText('Engineers')).toBeInTheDocument();
      expect(screen.getByText('Deckhands')).toBeInTheDocument();
    });
  });

  test('displays operational efficiency', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('85.5%')).toBeInTheDocument();
    });
  });

  test('displays recent operations', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Vessel 1')).toBeInTheDocument();
      expect(screen.getByText('Test Vessel 2')).toBeInTheDocument();
    });
  });

  test('displays fuel consumption data', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('1,500')).toBeInTheDocument(); // Today's consumption
      expect(screen.getByText('10,500')).toBeInTheDocument(); // This week's consumption
    });
  });

  test('displays maintenance compliance', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('92%')).toBeInTheDocument();
      expect(screen.getByText('Safety Inspection')).toBeInTheDocument();
    });
  });
});
