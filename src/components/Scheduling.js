import React, { useState, useEffect } from 'react';
import './Scheduling.css';
import { getFirestore, collection, addDoc, query, where, getDocs, getDoc, updateDoc, doc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import '../firebase/config';
import { getWeatherForecast, getMockWeatherData } from '../services/weatherService';
import CrewAvailabilityTable from './CrewAvailabilityTable';
import * as XLSX from 'xlsx';
import api, { excelAPI } from '../services/api';

const Scheduling = () => {
  // Initialize Firestore database
  const db = getFirestore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Vessel entry modal state
  const [showVesselModal, setShowVesselModal] = useState(false);
  const [clickedDate, setClickedDate] = useState(null);
  const [isEditingVessel, setIsEditingVessel] = useState(false);
  const [editingVesselId, setEditingVesselId] = useState(null);
  const [vesselFormData, setVesselFormData] = useState({
    vesselName: '',
    voyageId: '',
    controlId: '',
    vesselType: 'Local',
    purpose: [],
    time: ''
  });
  
  // State for recent finished vessels
  const [recentFinishedVessels, setRecentFinishedVessels] = useState([]);
  
  // State for upcoming scheduled vessels
  const [upcomingScheduledVessels, setUpcomingScheduledVessels] = useState([]);
  
  // Vessel entries storage - stores multiple vessels per date
  const [vesselEntries, setVesselEntries] = useState({});





  const [view, setView] = useState('calendar');
  const [formData, setFormData] = useState({});
  const [savedEntries, setSavedEntries] = useState([]);
  const [userName, setUserName] = useState('');
  const [userFullName, setUserFullName] = useState('');
  const [crewAvailability, setCrewAvailability] = useState({});
  const [assignedWorkers, setAssignedWorkers] = useState({});
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  const [weatherData, setWeatherData] = useState({});
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [selectedDateForAI, setSelectedDateForAI] = useState(null);
  const [hoveredDate, setHoveredDate] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [hoverTimeout, setHoverTimeout] = useState(null);
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showExtendedView, setShowExtendedView] = useState(false);
  const [timeTrackingRows, setTimeTrackingRows] = useState([]);
  const [appointmentFormData, setAppointmentFormData] = useState({
    time: '',
    serviceType: 'Mooring',
    vesselType: 'Local',
    selectedWorkers: []
  });

  // Get current month and year
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Get the first day of the month and number of days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const firstDayIndex = firstDayOfMonth.getDay();

  // Generate calendar days
  const generateCalendarDays = () => {
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: '', isCurrentMonth: false });
    }
    
    // Add days of the current month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ 
        day, 
        isCurrentMonth: true,
        isToday: isToday(day),
        isSelected: isSelected(day)
      });
    }
    
    // Add days from next month to complete the grid
    const remainingCells = 42 - days.length;
    for (let day = 1; day <= remainingCells; day++) {
      days.push({ day, isCurrentMonth: false });
    }
    
    return days;
  };

  // Check if a day is today
  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && 
           currentMonth === today.getMonth() && 
           currentYear === today.getFullYear();
  };

  // Check if a day is selected
  const isSelected = (day) => {
    return selectedDates.some(date =>
      day === date.getDate() &&
      currentMonth === date.getMonth() &&
      currentYear === date.getFullYear()
    );
  };

  // Build availability document ID
  const buildAvailabilityDocId = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Check if a day is in the past
  const isPastDate = (day) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(currentYear, currentMonth, day);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Check if current user is Alice
  const isAlice = () => {
    const auth = getAuth();
    const user = auth.currentUser;
    const userEmail = user ? user.email : '';
    const matchName = userFullName || userName;
    
    const isAliceUser = 
      matchName === 'Alice Margaretha Santos' || 
      matchName === 'Alice' ||
      (matchName && matchName.toLowerCase().includes('alice')) ||
      (userEmail && userEmail.toLowerCase().includes('alice'));
    
    return isAliceUser;
  };

    
  // Handle date click to show vessel entry modal
  const handleDateClick = (day, isCurrentMonth) => {
    
    if (!isAlice()) {
      alert('Only Alice can add vessel entries');
      return;
    }
    
    if (!isCurrentMonth || !day) {
      return;
    }
    
      const clickedDate = new Date(currentYear, currentMonth, day);
    const isPast = isPastDate(day);
    
    
    if (isPast) {
      alert('Cannot add vessels to dates that have already passed');
        return;
      }
      
    setClickedDate(clickedDate);
    setIsEditingVessel(false);
    setEditingVesselId(null);
    setVesselFormData({
      vesselName: '',
      voyageId: '',
      controlId: '',
      vesselType: 'Local',
      purpose: [],
      time: ''
    });
    setShowVesselModal(true);
  };

  // Handle vessel form input changes
  const handleVesselInputChange = (field, value) => {
    setVesselFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle purpose checkbox changes
  const handlePurposeChange = (purpose, isChecked) => {
    setVesselFormData(prev => ({
      ...prev,
      purpose: isChecked 
        ? [...prev.purpose, purpose]
        : prev.purpose.filter(p => p !== purpose)
    }));
  };

  // Handle vessel form submission
  const handleVesselSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent any form submission
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    
    if (!vesselFormData.vesselName || !vesselFormData.voyageId || !vesselFormData.controlId) {
      console.log('❌ Validation failed: Missing required fields');
      alert('Please fill in all required fields');
      return;
    }
    
    if (vesselFormData.purpose.length === 0) {
      alert('Please select at least one purpose');
      return;
    }
    
    
    const dateKey = `${clickedDate.getFullYear()}-${String(clickedDate.getMonth() + 1).padStart(2, '0')}-${String(clickedDate.getDate()).padStart(2, '0')}`;
    
    try {
      if (isEditingVessel) {
        // Find the original vessel data for Excel update
        const originalVessel = vesselEntries[dateKey]?.find(v => v.id === editingVesselId);
        if (!originalVessel) {
          alert('Error: Could not find original vessel entry');
          return;
        }

        // Update Excel file
        const excelUpdateData = {
          "Vessel": vesselFormData.vesselName,
          "Voyage Number": vesselFormData.voyageId,
          "Control Number": vesselFormData.controlId,
          "Service": vesselFormData.purpose.join(', '),
          "Vessel Type": vesselFormData.vesselType
        };

        await excelAPI.updateVesselEntry(
          dateKey,
          originalVessel.vesselName,
          excelUpdateData
        );

        // Update local state
        setVesselEntries(prev => {
          const updatedEntries = {
            ...prev,
            [dateKey]: prev[dateKey]?.map(vessel => 
              vessel.id === editingVesselId 
                ? {
                    ...vessel,
                    vesselName: vesselFormData.vesselName,
                    voyageId: vesselFormData.voyageId,
                    controlId: vesselFormData.controlId,
                    vesselType: vesselFormData.vesselType,
                    purpose: vesselFormData.purpose
                  }
                : vessel
            ) || []
          };
          // Save to local storage
          saveVesselEntriesToLocalStorage(updatedEntries);
          return updatedEntries;
        });
        
        console.log('Vessel entry updated in Excel and local state:', { id: editingVesselId, ...vesselFormData });
        alert('Vessel entry updated successfully!');
      } else {
        // Create new vessel entry for Excel
        const excelData = {
          date: dateKey,
          vesselName: vesselFormData.vesselName,
          voyageNo: vesselFormData.voyageId,
          purposeOfCall: vesselFormData.purpose.join(', '),
          controlId: vesselFormData.controlId,
          vesselType: vesselFormData.vesselType,
          time: vesselFormData.time
        };

        // Create local vessel entry first
        const vesselEntry = {
          id: `vessel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // More unique ID generation
          vesselName: vesselFormData.vesselName,
          voyageId: vesselFormData.voyageId,
          controlId: vesselFormData.controlId,
          vesselType: vesselFormData.vesselType,
          purpose: vesselFormData.purpose,
          time: vesselFormData.time,
          date: clickedDate
        };
        
        // Add vessel entry to local state immediately
        const newVesselEntries = {
          ...vesselEntries,
          [dateKey]: [...(vesselEntries[dateKey] || []), vesselEntry]
        };
        
        setVesselEntries(newVesselEntries);
        saveVesselEntriesToLocalStorage(newVesselEntries);

        // Try to save to Excel (but don't let it block the UI update)
        try {
          await excelAPI.addVesselEntry(excelData);
        } catch (excelError) {
          console.error('Excel save failed, but vessel added locally:', excelError);
          // Don't throw - vessel is already added locally
        }
        
        alert('Vessel entry added successfully!');
      }
    } catch (error) {
      console.error('Error saving vessel entry:', error);
      alert('Error saving vessel entry. Please try again.');
      return;
    }
    
    // Close modal and reset form
    setShowVesselModal(false);
    setIsEditingVessel(false);
    setEditingVesselId(null);
    setVesselFormData({
      vesselName: '',
      voyageId: '',
      controlId: '',
      vesselType: 'Local',
      purpose: [],
      time: ''
    });
    setClickedDate(null);
    
    // Prevent any default behavior
    return false;
  };

  // Handle modal close
  const handleModalClose = () => {
    setShowVesselModal(false);
    setIsEditingVessel(false);
    setEditingVesselId(null);
    setVesselFormData({
      vesselName: '',
      voyageId: '',
      controlId: '',
      vesselType: 'Local',
      purpose: [],
      time: ''
    });
    setClickedDate(null);
  };

  // Get vessel entries for a specific date
  const getVesselEntriesForDate = (day, isCurrentMonth) => {
    if (!isCurrentMonth || !day) return [];
    
    const date = new Date(currentYear, currentMonth, day);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    const entries = vesselEntries[dateKey] || [];
    
    return entries;
  };

  // Load recent finished vessels
  const loadRecentFinishedVessels = async () => {
    try {
      const response = await excelAPI.getVesselsData();
      
      if (response.success && response.vessels) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const finishedVessels = response.vessels
          .filter(vessel => {
            if (!vessel.date || vessel.date === 'N/A') return false;
            
            try {
              const vesselDate = new Date(vessel.date);
              vesselDate.setHours(0, 0, 0, 0);
              return vesselDate < today;
            } catch (e) {
              return false;
            }
          })
          .sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateB - dateA; // Most recent first
          })
          .slice(0, 5); // Show last 5 finished vessels
        
        setRecentFinishedVessels(finishedVessels);
      }
    } catch (error) {
      console.error('Error loading recent finished vessels:', error);
    }
  };

  const loadUpcomingScheduledVessels = async () => {
    try {
      const response = await excelAPI.getVesselsData();
      
      if (response.success && response.vessels) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const upcomingVessels = response.vessels
          .filter(vessel => {
            if (!vessel.date || vessel.date === 'N/A') return false;
            
            try {
              const vesselDate = new Date(vessel.date);
              vesselDate.setHours(0, 0, 0, 0);
              return vesselDate >= today;
            } catch (e) {
              return false;
            }
          })
          .sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateA - dateB; // Earliest first
          })
          .slice(0, 5); // Show next 5 upcoming vessels
        
        setUpcomingScheduledVessels(upcomingVessels);
      }
    } catch (error) {
      console.error('Error loading upcoming scheduled vessels:', error);
    }
  };

  // Load vessel entries from Excel file
  const loadVesselEntriesFromExcel = async () => {
    try {
      const response = await excelAPI.getVesselsData();
      
      if (response.success && response.vessels) {
        // Convert Excel data to vessel entries format
        const entries = {};
        
        response.vessels.forEach((vessel, index) => {
          const dateKey = vessel.date;
          
          if (!dateKey || dateKey === 'N/A') {
            return;
          }
          
          if (!entries[dateKey]) {
            entries[dateKey] = [];
          }
          
          const vesselEntry = {
            id: `excel_${index}_${Date.now()}`,
            vesselName: vessel.vessel || '',
            voyageId: vessel.voyage || '',
            controlId: vessel.controlId || '',
            vesselType: vessel.vesselType || 'Local',
            purpose: vessel.purpose ? vessel.purpose.split(', ').filter(p => p.trim()) : [],
            time: vessel.time || '',
            date: new Date(dateKey)
          };
          
          entries[dateKey].push(vesselEntry);
        });
        
        setVesselEntries(entries);
        // Also save to local storage as backup
        saveVesselEntriesToLocalStorage(entries);
      } else {
        // Try to load from local storage as fallback
        loadVesselEntriesFromLocalStorage();
      }
    } catch (error) {
      console.error('Error loading vessel entries from Excel:', error);
      // Try to load from local storage as fallback
      loadVesselEntriesFromLocalStorage();
    }
  };

  // Load vessel entries from local storage (fallback)
  const loadVesselEntriesFromLocalStorage = () => {
    try {
      const savedEntries = localStorage.getItem('vesselEntries');
      
      if (savedEntries) {
        const entries = JSON.parse(savedEntries);
        
        // Convert date strings back to Date objects
        Object.keys(entries).forEach(dateKey => {
          entries[dateKey].forEach(entry => {
            entry.date = new Date(entry.date);
          });
        });
        
        setVesselEntries(entries);
      }
    } catch (error) {
      console.error('Error loading vessel entries from local storage:', error);
    }
  };

  // Save vessel entries to local storage
  const saveVesselEntriesToLocalStorage = (entries) => {
    try {
      localStorage.setItem('vesselEntries', JSON.stringify(entries));
    } catch (error) {
      console.error('Error saving vessel entries to local storage:', error);
    }
  };

  // Handle vessel bar click for editing
  const handleVesselBarClick = (vessel, day, isCurrentMonth, e) => {
    e.stopPropagation(); // Prevent triggering date click
    
    if (!isAlice()) {
      alert('Only Alice can edit vessel entries');
      return;
    }
    
    const date = new Date(currentYear, currentMonth, day);
    setClickedDate(date);
    setIsEditingVessel(true);
    setEditingVesselId(vessel.id);
    setVesselFormData({
      vesselName: vessel.vesselName,
      voyageId: vessel.voyageId,
      controlId: vessel.controlId,
      vesselType: vessel.vesselType,
      purpose: [...vessel.purpose],
      time: vessel.time || ''
    });
    setShowVesselModal(true);
  };

  // Handle vessel deletion
  const handleVesselDelete = async (vesselId, day, isCurrentMonth) => {
    if (!isAlice()) {
      alert('Only Alice can delete vessel entries');
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this vessel entry?')) {
      return;
    }
    
    const date = new Date(currentYear, currentMonth, day);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    console.log(`🗑️ Deleting vessel with ID: ${vesselId} for date: ${dateKey}`);
    console.log(`📋 Current vessels for this date:`, vesselEntries[dateKey]);
    
    try {
      // Find the vessel to get its name for Excel deletion
      const vesselToDelete = vesselEntries[dateKey]?.find(vessel => vessel.id === vesselId);
      if (!vesselToDelete) {
        console.error(`❌ Vessel with ID ${vesselId} not found in entries:`, vesselEntries[dateKey]);
        alert('Error: Could not find vessel entry to delete');
        return;
      }

      console.log(`✅ Found vessel to delete:`, vesselToDelete);

      // Delete from Excel
      await excelAPI.deleteVesselEntry(dateKey, vesselToDelete.vesselName);

      // Delete from local state
      setVesselEntries(prev => {
        const beforeCount = prev[dateKey]?.length || 0;
        const updatedEntries = {
          ...prev,
          [dateKey]: prev[dateKey]?.filter(vessel => {
            const shouldKeep = vessel.id !== vesselId;
            if (!shouldKeep) {
              console.log(`🗑️ Removing vessel:`, vessel);
            }
            return shouldKeep;
          }) || []
        };
        const afterCount = updatedEntries[dateKey]?.length || 0;
        console.log(`📊 Vessel count for ${dateKey}: ${beforeCount} → ${afterCount}`);
        
        // Save to local storage
        saveVesselEntriesToLocalStorage(updatedEntries);
        return updatedEntries;
      });
      
      console.log('✅ Vessel entry deleted from Excel and local state:', vesselToDelete);
      alert('Vessel entry deleted successfully!');
    } catch (error) {
      console.error('❌ Error deleting vessel entry:', error);
      alert('Error deleting vessel entry. Please try again.');
    }
  };
  const handleDateHover = (day, isCurrentMonth, event) => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }

    if (isCurrentMonth && day) {
      const hoveredDate = new Date(currentYear, currentMonth, day);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      hoveredDate.setHours(0, 0, 0, 0);
      
      if (hoveredDate >= today) {
        const timeout = setTimeout(() => {
          setHoveredDate(hoveredDate);
          
          const rect = event.target.getBoundingClientRect();
          const tooltipWidth = 320;
          const viewportWidth = window.innerWidth;
          
          let x = rect.left + rect.width / 2;
          let y = rect.top - 10;
          
          if (x + tooltipWidth / 2 > viewportWidth) {
            x = viewportWidth - tooltipWidth / 2 - 10;
          }
          if (x - tooltipWidth / 2 < 0) {
            x = tooltipWidth / 2 + 10;
          }
          
          setTooltipPosition({ x, y });
        }, 1000);
        
        setHoverTimeout(timeout);
        } else {
        setHoveredDate(null);
      }
    } else {
      setHoveredDate(null);
    }
  };

  // Handle date hover end
  const handleDateHoverEnd = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    setHoveredDate(null);
  };

  // Handle form input change
  const handleInputChange = (idx, field, value) => {
    setFormData(prev => ({
      ...prev,
      [idx]: {
        ...prev[idx],
        [field]: value
      }
    }));
  };

  // Handle date click form input change


  // Time tracking functions
  const addTimeTrackingRow = () => {
    const newRow = {
      id: Date.now(),
      operation: 'Mooring',
      timeListed: '',
      timeStarted: '',
      timeFinished: ''
    };
    setTimeTrackingRows(prev => [...prev, newRow]);
  };

  const removeTimeTrackingRow = (id) => {
    setTimeTrackingRows(prev => prev.filter(row => row.id !== id));
  };

  const updateTimeTrackingRow = (id, field, value) => {
    setTimeTrackingRows(prev => 
      prev.map(row => 
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };



  // Excel export functions
  const saveToExcel = async (entryData, isUpdate = false, originalDate = null) => {
    try {
      console.log('=== saveToExcel called ===');
      console.log('isUpdate:', isUpdate);
      console.log('originalDate:', originalDate);
      console.log('entryData:', entryData);
      
      console.log('saveToExcel - entryData.date:', {
        date: entryData.date,
        dateISO: entryData.date.toISOString(),
        dateLocal: entryData.date.toLocaleDateString(),
        currentDate: new Date().toISOString()
      });
      
      const year = entryData.date.getFullYear();
      const month = String(entryData.date.getMonth() + 1).padStart(2, '0');
      const day = String(entryData.date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      console.log('saveToExcel - processed date:', {
        year,
        month,
        day,
        dateString
      });
      
      const newRow = {
        'Vessel': entryData.vesselName,
        'Voyage Number': entryData.voyageNumber,
        'Control Number': entryData.controlId,
        'Service': entryData.mooringOperations.join(', '),
        'Date': dateString,
        'Time': entryData.time,
        'Vessel Type': entryData.vesselType
      };

      console.log('Saving new/updated row with date:', newRow.Date);
      console.log('Full new row:', newRow);

      let response;
      
      if (isUpdate && originalDate) {
        // This is an update - use the update endpoint
        console.log('This is an update - using update endpoint');
        
        // Get the original vessel name from the vessel entries
        const originalYear = originalDate.getFullYear();
        const originalMonth = String(originalDate.getMonth() + 1).padStart(2, '0');
        const originalDay = String(originalDate.getDate()).padStart(2, '0');
        const originalDateKey = `${originalYear}-${originalMonth}-${originalDay}`;
        const originalEntry = vesselEntries[originalDateKey];
        
        if (originalEntry && originalEntry.vesselName) {
          console.log('Updating existing entry for vessel:', originalEntry.vesselName);
          
          response = await api.put('/excel/update-entry', {
            date: dateString,
            vesselName: originalEntry.vesselName,
            newData: newRow
          });
          
          if (response.data.success) {
            console.log('Entry updated successfully:', response.data);
          } else {
            console.warn('Update failed, falling back to append:', response.data.message);
            // Fallback to append if update fails
            response = await api.post('/excel/append', {
          object: newRow
        });
          }
        } else {
          console.warn('No original entry found, falling back to append');
          response = await api.post('/excel/append', {
            object: newRow
          });
        }
      } else {
        // This is a new entry - use the append endpoint
        console.log('This is a new entry - using append endpoint');
        response = await api.post('/excel/append', {
          object: newRow
        });
      }

        if (response.data.success) {
          console.log('Vessel entry saved to Vessels Log.xlsx:', response.data);
        if (isUpdate) {
          console.log('Update completed successfully');
        } else {
          console.log('New entry created successfully');
        }
      } else {
          throw new Error(response.data.error || 'Failed to save to Excel');
      }
    } catch (error) {
      console.error('Error saving to Excel:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      // Don't use alert to prevent page refresh
      console.warn('Excel save failed - check console for details');
    }
  };

  const removeFromExcel = async (entryData) => {
    try {
      console.log('Entry cleared from calendar (Excel entry remains):', entryData);
    } catch (error) {
      console.error('Error processing clear request:', error);
    }
  };

  // Handle vessel entry bar click

  // Handle date click form submission


  // Load saved selected dates from Firebase and localStorage on component mount
  useEffect(() => {
    const loadSavedDates = async () => {
      try {
          const savedDates = localStorage.getItem('schedulingSelectedDates');
          if (savedDates) {
            const parsedDates = JSON.parse(savedDates).map(dateStr => new Date(dateStr));
          setSelectedDates(parsedDates);
        }
        setIsInitialLoad(false);
      } catch (error) {
        console.error('Error loading saved dates:', error);
        setIsInitialLoad(false);
      }
    };

    loadSavedDates();
  }, []);

  // Save selected dates to localStorage whenever they change
  useEffect(() => {
    if (isInitialLoad) {
      return;
    }
    
      try {
        localStorage.setItem('schedulingSelectedDates', JSON.stringify(selectedDates));
      } catch (error) {
        console.error('Error saving dates:', error);
      }
  }, [selectedDates, isInitialLoad]);

  // Get logged-in user's name and full name from Firestore if needed
  useEffect(() => {
    const auth = getAuth();
    const db = getFirestore();
    const unsubscribe = auth.onAuthStateChanged(async user => {
      if (user) {
        let name = user.displayName || (user.email ? user.email.split('@')[0] : '');
        setUserName(name);
        
        if (!user.displayName || name === user.email.split('@')[0]) {
          const q = query(collection(db, 'users'), where('email', '==', user.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            if (userData.fullName) {
              setUserFullName(userData.fullName);
            } else {
              setUserFullName(name);
            }
          } else {
            setUserFullName(name);
          }
        } else {
          setUserFullName(name);
        }
      } else {
        setUserName('');
        setUserFullName('');
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch weather data for calendar
  useEffect(() => {
    const fetchWeatherData = async () => {
      setWeatherLoading(true);
      try {
        const forecast = await getWeatherForecast();
        if (Object.keys(forecast).length > 0) {
          setWeatherData(forecast);
        } else {
          const mockData = getMockWeatherData();
          setWeatherData(mockData);
        }
      } catch (error) {
        console.error('Error fetching weather data:', error);
        const mockData = getMockWeatherData();
        setWeatherData(mockData);
      } finally {
        setWeatherLoading(false);
      }
    };

    fetchWeatherData();
  }, [currentDate]);

  // Load vessel entries on component mount
  useEffect(() => {
    loadVesselEntriesFromExcel();
    loadRecentFinishedVessels();
    loadUpcomingScheduledVessels();
  }, []);

  // Debug vessel entries changes (only log when entries are added/removed)
  useEffect(() => {
    const totalEntries = Object.values(vesselEntries).flat().length;
    if (totalEntries > 0) {
      console.log(`Vessel entries updated: ${totalEntries} total entries across ${Object.keys(vesselEntries).length} dates`);
    }
  }, [vesselEntries]);



  // Helper: get vessel type info for each day in current month
  const getDayVesselTypes = () => {
    const vesselMap = {};
    savedEntries.forEach(entry => {
      if (entry.date && entry.vesselType) {
        const d = new Date(entry.date);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          const day = d.getDate();
          if (!vesselMap[day]) vesselMap[day] = new Set();
          vesselMap[day].add(entry.vesselType);
        }
      }
    });
    return vesselMap;
  };

  // Helper: get weather data for a specific date
  const getWeatherForDate = (day) => {
    if (!day || !day.isCurrentMonth) return null;
    
    const date = new Date(currentYear, currentMonth, day.day);
    const dateKey = date.toISOString().split('T')[0];
    return weatherData[dateKey] || null;
  };

  // Generate AI recommendation based on weather
  const generateAIRecommendation = (weatherInfo, date) => {
    if (!weatherInfo) {
      return {
        title: "No Weather Data Available",
        message: "Weather forecast is not available for this date. Please proceed with caution and monitor local weather conditions.",
        type: "warning",
        color: "#FF9800"
      };
    }

    const condition = weatherInfo.condition.toLowerCase();
    const temperature = weatherInfo.temperature;
    const windSpeed = weatherInfo.windSpeed || 0;

    if (condition.includes('clear') || condition.includes('sunny')) {
      return {
        title: "✅ Optimal Conditions for Operations",
        message: `Perfect weather for mooring activities! Clear skies and ${temperature}°C temperature provide excellent visibility and safe working conditions. All outdoor operations can proceed as scheduled.`,
        type: "success",
        color: "#4CAF50"
      };
    } else if (condition.includes('cloud')) {
      return {
        title: "✅ Good Conditions for Operations",
        message: `Cloudy weather with ${temperature}°C is suitable for mooring activities. Visibility may be slightly reduced, but operations can proceed safely. Monitor conditions throughout the day.`,
        type: "success",
        color: "#4CAF50"
      };
    } else if (condition.includes('light rain')) {
      return {
        title: "⚠️ Proceed with Caution",
        message: `Light rain conditions with ${temperature}°C require extra safety measures. Ensure all workers have proper rain gear and non-slip footwear. Consider shorter work shifts and increased supervision.`,
        type: "warning",
        color: "#FF9800"
      };
    } else if (condition.includes('rain')) {
      return {
        title: "⚠️ High Risk - Consider Rescheduling",
        message: `Rainy conditions with ${temperature}°C pose safety risks for mooring operations. Wet surfaces increase slip hazards. Consider rescheduling non-critical activities or implement enhanced safety protocols.`,
        type: "warning",
        color: "#FF5722"
      };
    } else if (condition.includes('heavy rain')) {
      return {
        title: "❌ Not Recommended for Operations",
        message: `Heavy rain with ${temperature}°C creates dangerous working conditions. Strongly recommend rescheduling all outdoor mooring activities. Safety of personnel is the top priority.`,
        type: "danger",
        color: "#F44336"
      };
    } else if (condition.includes('storm') || condition.includes('thunderstorm')) {
      return {
        title: "❌ Operations Suspended",
        message: `Storm conditions with ${temperature}°C are extremely dangerous. All outdoor operations must be suspended immediately. Ensure all personnel are in safe locations and equipment is secured.`,
        type: "danger",
        color: "#D32F2F"
      };
    } else if (windSpeed > 30) {
      return {
        title: "⚠️ High Wind Warning",
        message: `High wind speeds (${windSpeed} km/h) create dangerous conditions for mooring operations. Consider postponing activities until wind conditions improve.`,
        type: "warning",
        color: "#FF9800"
      };
    } else {
      return {
        title: "ℹ️ Weather Advisory",
        message: `Current conditions: ${weatherInfo.condition} with ${temperature}°C. Please assess local conditions and proceed with appropriate safety measures.`,
        type: "info",
        color: "#2196F3"
      };
    }
  };

  const dayVesselTypes = getDayVesselTypes();
  const calendarDays = generateCalendarDays();

return (
  <div className="scheduling-container">
    <div className="scheduling-overlay" />
    
    <div className="scheduling-content">
      {view === 'calendar' ? (
        <div className="calendar-layout">
          {/* Left Sidebar - Recent Finished Vessels */}
          <div className="calendar-sidebar">
            {/* Upcoming Scheduled Vessels Widget */}
            <div className="upcoming-vessels-widget">
              <div className="widget-header">
                <h3>Upcoming Schedules</h3>
                <span className="vessel-count">{upcomingScheduledVessels.length}</span>
              </div>
              
              <div className="upcoming-vessels-scroll">
                {upcomingScheduledVessels.length === 0 ? (
                  <div className="no-vessels-message">
                    <p>No upcoming schedules</p>
                  </div>
                ) : (
                  upcomingScheduledVessels.map((vessel, index) => {
                    const vesselDate = new Date(vessel.date);
                    const formattedDate = vesselDate.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    });
                    
                    const formattedTime = vessel.time ? (() => {
                      try {
                        const timeStr = vessel.time.trim();
                        if (timeStr.includes('AM') || timeStr.includes('PM')) {
                          return timeStr;
                        }
                        if (timeStr.includes(':')) {
                          const [hours, minutes] = timeStr.split(':');
                          const hour24 = parseInt(hours, 10);
                          const mins = minutes || '00';
                          
                          if (hour24 === 0) return `12:${mins} AM`;
                          if (hour24 < 12) return `${hour24}:${mins} AM`;
                          if (hour24 === 12) return `12:${mins} PM`;
                          return `${hour24 - 12}:${mins} PM`;
                        }
                        return timeStr;
                      } catch (e) {
                        return vessel.time;
                      }
                    })() : '';
                    
                    return (
                      <div key={index} className="upcoming-vessel-card">
                        <div className="vessel-info">
                          <div className="vessel-name">{vessel.vessel}</div>
                          <div className="vessel-details">
                            <span className="vessel-date">{formattedDate}</span>
                            {formattedTime && <span className="vessel-time">{formattedTime}</span>}
                          </div>
                          <div className="vessel-meta">
                            <span className="vessel-type">{vessel.vesselType || 'Local'}</span>
                            <span className="voyage-id">{vessel.voyage || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="vessel-status">
                          <span className="status-badge upcoming">Upcoming</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Recent Finished Vessels Widget */}
            <div className="recent-vessels-widget">
              <div className="widget-header">
                <h3>Recent Finished</h3>
              </div>
              
              <div className="finished-vessels-scroll">
                {recentFinishedVessels.length === 0 ? (
                  <div className="no-vessels-message">
                    <p>No recent finished vessels</p>
                  </div>
                ) : (
                  recentFinishedVessels.map((vessel, index) => {
                    const vesselDate = new Date(vessel.date);
                    const formattedDate = vesselDate.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    });
                    
                    const formattedTime = vessel.time ? (() => {
                      try {
                        const timeStr = vessel.time.trim();
                        if (timeStr.includes('AM') || timeStr.includes('PM')) {
                          return timeStr;
                        }
                        if (timeStr.includes(':')) {
                          const [hours, minutes] = timeStr.split(':');
                          const hour24 = parseInt(hours, 10);
                          const mins = minutes || '00';
                          
                          if (hour24 === 0) return `12:${mins} AM`;
                          if (hour24 < 12) return `${hour24}:${mins} AM`;
                          if (hour24 === 12) return `12:${mins} PM`;
                          return `${hour24 - 12}:${mins} PM`;
                        }
                        return timeStr;
                      } catch (e) {
                        return vessel.time;
                      }
                    })() : '';
                    
                    return (
                      <div key={index} className="finished-vessel-card">
                        <div className="vessel-info">
                          <div className="vessel-name">{vessel.vessel}</div>
                          <div className="vessel-details">
                            <span className="vessel-date">{formattedDate}</span>
                            {formattedTime && <span className="vessel-time">{formattedTime}</span>}
                          </div>
                          <div className="vessel-meta">
                            <span className="vessel-type">{vessel.vesselType || 'Local'}</span>
                            <span className="voyage-id">{vessel.voyage || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="vessel-status">
                          <span className="status-badge completed">Completed</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Calendar */}
          <div className="calendar-main">
            <div className="modern-calendar">
            {/* Modern Calendar Header */}
            <div className="calendar-header-modern">
            <div className="calendar-header-left">
                <div className="calendar-title-modern">
                  <div className="calendar-icon-modern">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                  </svg>
                </div>
                  <h1 className="calendar-title-text">Vessel Scheduling</h1>
              </div>
              <button 
                  className="today-btn-modern" 
                  onClick={() => setCurrentDate(new Date())}
              >
                Today
              </button>
            </div>
              
              <div className="calendar-navigation-modern">
            <button 
                  className="nav-btn-modern" 
              onClick={goToPreviousMonth}
              aria-label="Previous month"
            >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
            </button>
                <h2 className="month-year-modern">
                {monthNames[currentMonth]} {currentYear}
            </h2>
            <button 
                  className="nav-btn-modern"
              onClick={goToNextMonth}
              aria-label="Next month"
            >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                </svg>
            </button>
          </div>

              
              

            <div className="calendar-header-right">
              <div className="create-button-container">
                <button 
                    className="create-btn-modern"
                  onClick={() => setShowCreateDropdown(!showCreateDropdown)}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                    Add Vessel
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="dropdown-arrow">
                    <path d="M7 10l5 5 5-5z"/>
                  </svg>
                </button>
                {showCreateDropdown && (
                    <div className="create-dropdown-modern">
                    <div 
                        className="dropdown-item-modern"
                      onClick={() => {
                        setShowAppointmentModal(true);
                        setShowCreateDropdown(false);
                      }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                      </svg>
                        Schedule Appointment
              </div>
              </div>
                )}
              </div>
              </div>
              </div>

            {/* Modern Calendar Grid */}
            <div className="calendar-grid-modern">
            {/* Weekday headers */}
              <div className="weekday-header-modern">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
                const today = new Date();
                const isCurrentDay = today.getDay() === index;
                return (
                  <div 
                    key={day}
                      className={`weekday-modern ${isCurrentDay ? 'current-day' : ''}`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
              
            {/* Calendar days */}
              <div className="calendar-days-modern">
              {calendarDays.map((dayData, index) => {
                let bgColor = '';
                let weatherInfo = null;
                
                if (dayData.isCurrentMonth && dayData.day) {
                  const vesselTypes = dayVesselTypes[dayData.day];
                  if (vesselTypes) {
                    if (vesselTypes.has('Local') && vesselTypes.has('International')) {
                        bgColor = '#e6d6ff';
                    } else if (vesselTypes.has('Local')) {
                        bgColor = '#d6f5d6';
                    } else if (vesselTypes.has('International')) {
                        bgColor = '#d6eaff';
                    }
                  }
                  
                  weatherInfo = getWeatherForDate(dayData);
                }

                const isPast = dayData.isCurrentMonth && dayData.day && isPastDate(dayData.day);
                const canClick = isAlice() && dayData.isCurrentMonth && dayData.day && !isPast;
                
                let titleText = '';
                if (!isAlice() && dayData.isCurrentMonth && dayData.day) {
                  titleText = 'Only Alice can select dates';
                } else if (isPast) {
                  titleText = 'This date has already passed';
                }
                
                return (
                  <div
                    key={index}
                      className={`calendar-day-modern ${
                      dayData.isCurrentMonth ? 'current-month' : 'other-month'
                    } ${dayData.isToday ? 'today' : ''} ${
                      dayData.isSelected ? 'selected' : ''
                    } ${!canClick && dayData.isCurrentMonth && dayData.day ? 'non-clickable' : ''} ${
                      isPast ? 'past-date' : ''
                    }`}
                    style={{ 
                      ...bgColor ? { background: bgColor } : {},
                      ...weatherInfo ? { 
                        background: weatherInfo.color,
                        color: weatherInfo.color === '#FFD700' || weatherInfo.color === '#FFFFFF' ? '#000' : '#fff',
                        fontWeight: 'bold'
                      } : {},
                      cursor: canClick ? 'pointer' : 'default'
                    }}
                    onClick={() => handleDateClick(dayData.day, dayData.isCurrentMonth)}
                    onMouseEnter={(e) => handleDateHover(dayData.day, dayData.isCurrentMonth, e)}
                    onMouseLeave={handleDateHoverEnd}
                    title={titleText}
                  >
                      <div className="day-number-modern">{dayData.day}</div>
                    {weatherInfo && (
                        <div className="weather-indicator-modern">
                        {weatherInfo.temperature}°C
                      </div>
                    )}
                    
                    {/* Vessel entry bars */}
                    <div className="vessel-container-modern">
                      {(() => {
                        const vessels = getVesselEntriesForDate(dayData.day, dayData.isCurrentMonth);
                        
                        if (vessels.length === 0) {
                          return null;
                        }
                        
                        return vessels.map((vessel, index) => {
                        console.log(`🎨 Rendering vessel bar ${index + 1}:`, {
                          id: vessel.id,
                          vesselName: vessel.vesselName,
                          day: dayData.day
                        });
                        
                        return (
                          <div 
                            key={vessel.id} 
                            className="vessel-bar-modern"
                            title={`${vessel.vesselName} - ${vessel.vesselType} - ${vessel.purpose.join(', ')}`}
                            onClick={(e) => handleVesselBarClick(vessel, dayData.day, dayData.isCurrentMonth, e)}
                          >
                            <div className="vessel-bar-content">
                              <div className="vessel-main-info">
                                {vessel.time && (
                                  <span className="vessel-time">{vessel.time}</span>
                                )}
                                <span className="vessel-name">{vessel.vesselName}</span>
                              </div>
                              <div className="vessel-bar-actions">
                                <span className="vessel-type">{vessel.vesselType}</span>
                                <button 
                                  className="vessel-delete-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    console.log(`🔘 Delete button clicked for vessel:`, {
                                      id: vessel.id,
                                      vesselName: vessel.vesselName,
                                      day: dayData.day
                                    });
                                    handleVesselDelete(vessel.id, dayData.day, dayData.isCurrentMonth);
                                  }}
                                  title="Delete vessel entry"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                    </div>
                </div>
                  );
              })}
              </div>
          </div>
          
            {/* Weather Legend */}
            <div className="weather-legend-modern">
              <span className="weather-legend-title">Weather Conditions:</span>
              <div className="weather-legend-items">
                <div className="weather-item-modern">
                  <div className="weather-indicator sunny"></div>
                  <span>Sunny</span>
                        </div>
                <div className="weather-item-modern">
                  <div className="weather-indicator cloudy"></div>
                  <span>Cloudy</span>
                          </div>
                <div className="weather-item-modern">
                  <div className="weather-indicator light-rain"></div>
                  <span>Light Rain</span>
                            </div>
                <div className="weather-item-modern">
                  <div className="weather-indicator rain"></div>
                  <span>Rain</span>
                              </div>
                <div className="weather-item-modern">
                  <div className="weather-indicator heavy-rain"></div>
                  <span>Heavy Rain</span>
        </div>
                <div className="weather-item-modern">
                  <div className="weather-indicator storm"></div>
                  <span>Storm</span>
              </div>
            </div>
          </div>
            </div>
          </div>
        </div>
      ) : (
        <CrewAvailabilityTable 
          crewAvailability={crewAvailability}
          setCrewAvailability={setCrewAvailability}
        />
      )}

        {/* Navigation buttons */}
      <div className="report-nav-btns">
        <button
          className="report-nav-btn"
          onClick={() => setView('calendar')}
          disabled={view === 'calendar'}
        >
            Calendar
        </button>
        <button
          className="report-nav-btn"
          onClick={() => setView('table')}
          disabled={view === 'table'}
        >
            Crew Table
        </button>
      </div>
    </div>

      {/* Weather Hover Tooltip */}
      {hoveredDate && (
        <div 
          className="weather-tooltip-modern"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="tooltip-content-modern">
            <div className="tooltip-header-modern">
              <div className="tooltip-date-modern">
                {hoveredDate.toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric' 
                })}
          </div>
              <div className="tooltip-title-modern">Weather Forecast</div>
            </div>

            {(() => {
              const dateKey = hoveredDate.toISOString().split('T')[0];
              const weatherInfo = weatherData[dateKey];
              const recommendation = generateAIRecommendation(weatherInfo, hoveredDate);
              
              return (
                <div className="tooltip-body-modern">
                  <div className="recommendation-header-modern">
                    <h4 className="recommendation-title-modern">{recommendation.title}</h4>
                    <div className={`priority-badge-modern ${recommendation.type}`}>
                      {recommendation.type === 'success' ? 'OPTIMAL' : 
                       recommendation.type === 'warning' ? 'CAUTION' : 
                       recommendation.type === 'danger' ? 'CRITICAL' : 'ADVISORY'}
            </div>
              </div>
                  <p className="recommendation-message-modern">
                    {recommendation.message}
                  </p>
            </div>
              );
            })()}
        </div>
      </div>
    )}

    {/* Vessel Entry Modal */}
    {showVesselModal && (
      <div className="modal-overlay-modern" onClick={handleModalClose}>
        <div className="date-modal-modern" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content-modern">
            <div className="modal-header-modern">
              <h2>{isEditingVessel ? 'Edit Vessel Entry' : 'Add Vessel Entry'}</h2>
              <button 
                className="close-button-modern"
                onClick={handleModalClose}
              >
                ×
              </button>
            </div>

            <div className="modal-body-modern">
              <div className="form-section-modern">
                <div className="date-display-modern">
                <strong>Date:</strong> {clickedDate && clickedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>

                <form className="vessel-form-modern">
                  <div className="form-group-modern">
                  <label>Vessel Name:</label>
                  <input
                    type="text"
                      value={vesselFormData.vesselName}
                      onChange={(e) => handleVesselInputChange('vesselName', e.target.value)}
                      className="form-input-modern"
                    placeholder="Enter vessel name"
                    required
                  />
                </div>

                  <div className="form-group-modern">
                    <label>Voyage ID:</label>
                  <input
                    type="text"
                      value={vesselFormData.voyageId}
                      onChange={(e) => handleVesselInputChange('voyageId', e.target.value)}
                      className="form-input-modern"
                      placeholder="Enter voyage ID"
                    required
                  />
                </div>

                  <div className="form-group-modern">
                  <label>Control ID:</label>
                  <input
                    type="text"
                      value={vesselFormData.controlId}
                      onChange={(e) => handleVesselInputChange('controlId', e.target.value)}
                      className="form-input-modern"
                    placeholder="Enter control ID"
                    required
                  />
                </div>

                  <div className="form-group-modern">
                  <label>Time:</label>
                  <input
                    type="time"
                      value={vesselFormData.time}
                      onChange={(e) => handleVesselInputChange('time', e.target.value)}
                      className="form-input-modern"
                    placeholder="Select time"
                  />
                </div>

                  <div className="form-group-modern">
                  <label>Vessel Type:</label>
                  <select
                      value={vesselFormData.vesselType}
                      onChange={(e) => handleVesselInputChange('vesselType', e.target.value)}
                      className="form-select-modern"
                  >
                    <option value="Local">Local</option>
                    <option value="Foreign">Foreign</option>
                  </select>
                </div>

                  <div className="mooring-operations-section-modern">
                  <label>Purpose:</label>
                    <p className="mooring-help-text">
                    Select all applicable operations
                  </p>
                    <div className="checkbox-group-modern">
                      {['W/ MOORING BUOY', 'SHIFTING', 'UNMOORING'].map(purpose => (
                        <label key={purpose} className="checkbox-label-modern">
                        <input
                          type="checkbox"
                            checked={vesselFormData.purpose.includes(purpose)}
                            onChange={(e) => handlePurposeChange(purpose, e.target.checked)}
                            className="checkbox-input-modern"
                          />
                          <span className="checkbox-text-modern">{purpose}</span>
                      </label>
                    ))}
                  </div>
                </div>

                  <div className="modal-actions-modern">
                  <button 
                    type="button"
                      className="cancel-btn-modern"
                      onClick={handleModalClose}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button"
                      className="save-btn-modern"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🔘 SUBMIT BUTTON CLICKED');
                        console.log('🔘 Form data at click:', vesselFormData);
                        console.log('🔘 Clicked date at click:', clickedDate);
                        handleVesselSubmit(e);
                      }}
                    >
                      {isEditingVessel ? 'Update Vessel' : 'Add Vessel'}
                  </button>
                </div>
              </form>
              </div>
                </div>
          </div>
        </div>
      </div>
    )}

  </div>
  );
};

export default Scheduling;
