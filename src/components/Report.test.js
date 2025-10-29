import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Report from './Report';

// Mock the API service
jest.mock('../services/api', () => ({
  get: jest.fn(() => Promise.resolve({
    data: {
      success: true,
      vessels: [
        {
          date: '2024-01-15',
          vessel: 'Test Vessel 1',
          voyage: 'VOY001',
          port: 'Port A',
          purpose: 'Cargo Loading',
          controlId: 'CTRL001',
          updatedBy: 'admin@example.com'
        },
        {
          date: '2024-01-16',
          vessel: 'Test Vessel 2',
          voyage: 'VOY002',
          port: 'Port B',
          purpose: 'Maintenance',
          controlId: 'CTRL002',
          updatedBy: 'admin@example.com'
        }
      ],
      total: 2
    }
  })),
  post: jest.fn(() => Promise.resolve({ data: { success: true } })),
  delete: jest.fn(() => Promise.resolve({ data: { success: true } }))
}));

describe('Report Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders report title', async () => {
    render(<Report />);
    
    await waitFor(() => {
      expect(screen.getByText('Vessel Reports')).toBeInTheDocument();
    });
  });

  test('displays vessel data in table', async () => {
    render(<Report />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Vessel 1')).toBeInTheDocument();
      expect(screen.getByText('Test Vessel 2')).toBeInTheDocument();
      expect(screen.getByText('VOY001')).toBeInTheDocument();
      expect(screen.getByText('VOY002')).toBeInTheDocument();
    });
  });

  test('shows add report form when add button is clicked', async () => {
    render(<Report />);
    
    const addButton = screen.getByText('Add New Report');
    fireEvent.click(addButton);
    
    expect(screen.getByText('Add Vessel Report')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Vessel Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Voyage Number')).toBeInTheDocument();
  });

  test('validates required fields in add report form', async () => {
    render(<Report />);
    
    const addButton = screen.getByText('Add New Report');
    fireEvent.click(addButton);
    
    const saveButton = screen.getByText('Save Report');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please enter vessel name')).toBeInTheDocument();
      expect(screen.getByText('Please enter voyage number')).toBeInTheDocument();
    });
  });

  test('validates date format in add report form', async () => {
    render(<Report />);
    
    const addButton = screen.getByText('Add New Report');
    fireEvent.click(addButton);
    
    const vesselInput = screen.getByPlaceholderText('Vessel Name');
    const voyageInput = screen.getByPlaceholderText('Voyage Number');
    const dateInput = screen.getByPlaceholderText('Date (YYYY-MM-DD)');
    const saveButton = screen.getByText('Save Report');
    
    fireEvent.change(vesselInput, { target: { value: 'Test Vessel' } });
    fireEvent.change(voyageInput, { target: { value: 'VOY001' } });
    fireEvent.change(dateInput, { target: { value: 'invalid-date' } });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid date in YYYY-MM-DD format')).toBeInTheDocument();
    });
  });

  test('submits add report form with valid data', async () => {
    const { post } = require('../services/api');
    
    render(<Report />);
    
    const addButton = screen.getByText('Add New Report');
    fireEvent.click(addButton);
    
    const vesselInput = screen.getByPlaceholderText('Vessel Name');
    const voyageInput = screen.getByPlaceholderText('Voyage Number');
    const dateInput = screen.getByPlaceholderText('Date (YYYY-MM-DD)');
    const purposeInput = screen.getByPlaceholderText('Purpose of Call');
    const controlInput = screen.getByPlaceholderText('Control ID');
    const saveButton = screen.getByText('Save Report');
    
    fireEvent.change(vesselInput, { target: { value: 'New Vessel' } });
    fireEvent.change(voyageInput, { target: { value: 'VOY003' } });
    fireEvent.change(dateInput, { target: { value: '2024-01-20' } });
    fireEvent.change(purposeInput, { target: { value: 'Cargo Loading' } });
    fireEvent.change(controlInput, { target: { value: 'CTRL003' } });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/api/excel/save-report', {
        vesselName: 'New Vessel',
        voyageNo: 'VOY003',
        date: '2024-01-20',
        purposeOfCall: 'Cargo Loading',
        controlId: 'CTRL003'
      });
    });
  });

  test('shows edit form when edit button is clicked', async () => {
    render(<Report />);
    
    await waitFor(() => {
      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);
    });
    
    expect(screen.getByText('Edit Vessel Report')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Vessel 1')).toBeInTheDocument();
  });

  test('shows delete confirmation when delete button is clicked', async () => {
    render(<Report />);
    
    await waitFor(() => {
      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);
    });
    
    expect(screen.getByText('Are you sure you want to delete this report?')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  test('filters vessels by search term', async () => {
    render(<Report />);
    
    const searchInput = screen.getByPlaceholderText('Search vessels...');
    fireEvent.change(searchInput, { target: { value: 'Test Vessel 1' } });
    
    await waitFor(() => {
      expect(screen.getByText('Test Vessel 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Vessel 2')).not.toBeInTheDocument();
    });
  });

  test('shows loading state while fetching data', () => {
    const { get } = require('../services/api');
    get.mockImplementation(() => new Promise(resolve => 
      setTimeout(() => resolve({ data: { success: true, vessels: [], total: 0 } }), 100)
    ));
    
    render(<Report />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('shows error message when API call fails', async () => {
    const { get } = require('../services/api');
    get.mockRejectedValue(new Error('API Error'));
    
    render(<Report />);
    
    await waitFor(() => {
      expect(screen.getByText('Error loading vessel reports')).toBeInTheDocument();
    });
  });
});
