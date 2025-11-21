import React, { useState, useEffect } from 'react';
import './Scheduling.css';
import { getFirestore, collection, addDoc, query, where, getDocs, getDoc, updateDoc, doc, setDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import '../firebase/config';
import { getWeatherForecast } from '../services/weatherService';
import CrewAvailabilityTable from './CrewAvailabilityTable';
import * as XLSX from 'xlsx';
import api, { excelAPI } from '../services/api';
import notificationService from '../services/notificationService';

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
  const [originalVesselName, setOriginalVesselName] = useState(null);
  const [originalVesselData, setOriginalVesselData] = useState(null);
  const [vesselFormData, setVesselFormData] = useState({
    vesselName: '',
    voyageId: '',
    controlId: '',
    vesselType: 'Local',
    purpose: [],
    time: '',
    timeFinished: '',
    assignedWorkers: []
  });
  const [showWorkerAssignmentModal, setShowWorkerAssignmentModal] = useState(false);
  const [availableWorkers, setAvailableWorkers] = useState([]);
  
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
  const [weatherError, setWeatherError] = useState(null);
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
  const [openOverflowDateKey, setOpenOverflowDateKey] = useState(null);
  const [weatherWarningModal, setWeatherWarningModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    date: null
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

    
  const openVesselModalForDate = (date) => {
    setClickedDate(date);
    setIsEditingVessel(false);
    setEditingVesselId(null);
    setOriginalVesselName(null);
    setOriginalVesselData(null);
    setVesselFormData({
      vesselName: '',
      voyageId: '',
      controlId: '',
      vesselType: 'Local',
      purpose: [],
      time: '',
      timeFinished: ''
    });
    setShowVesselModal(true);
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

    const dateKey = `${clickedDate.getFullYear()}-${String(clickedDate.getMonth() + 1).padStart(2, '0')}-${String(clickedDate.getDate()).padStart(2, '0')}`;
    const weatherInfoForDate = weatherData[dateKey];
    if (weatherInfoForDate) {
      const weatherRecommendation = generateAIRecommendation(weatherInfoForDate, clickedDate);
      if (weatherRecommendation && (weatherRecommendation.type === 'warning' || weatherRecommendation.type === 'danger')) {
        setWeatherWarningModal({
          isOpen: true,
          title: weatherRecommendation.title,
          message: weatherRecommendation.message,
          type: weatherRecommendation.type,
          date: clickedDate
        });
        return;
      }
    }
      
    openVesselModalForDate(clickedDate);
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

  const handleWeatherWarningProceed = () => {
    if (weatherWarningModal.date) {
      openVesselModalForDate(weatherWarningModal.date);
    }
    setWeatherWarningModal({
      isOpen: false,
      title: '',
      message: '',
      type: 'warning',
      date: null
    });
  };

  const handleWeatherWarningCancel = () => {
    setWeatherWarningModal({
      isOpen: false,
      title: '',
      message: '',
      type: 'warning',
      date: null
    });
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
      alert('Please fill in all required fields');
      return;
    }
    
    if (vesselFormData.purpose.length === 0) {
      alert('Please select at least one purpose');
      return;
    }
    
    
    let dateKey = `${clickedDate.getFullYear()}-${String(clickedDate.getMonth() + 1).padStart(2, '0')}-${String(clickedDate.getDate()).padStart(2, '0')}`;
    
    try {
      if (isEditingVessel) {
        // Use stored original vessel data if available (more reliable)
        let originalVessel = originalVesselData;
        let actualDateKey = dateKey;
        
        // If originalVesselData not available, try to find in state
        if (!originalVessel) {
          // Try to find by ID first using the clicked date
          originalVessel = vesselEntries[dateKey]?.find(v => v.id === editingVesselId);
          
          // If not found, try to find across all dates (in case date changed or vessel was moved)
          if (!originalVessel) {
            for (const key in vesselEntries) {
              originalVessel = vesselEntries[key]?.find(v => v.id === editingVesselId);
              if (originalVessel) {
                // Found it in a different date - use that date for Excel lookup
                actualDateKey = key;
                break;
              }
            }
          }
        } else {
          // If we have originalVesselData, use its date
          if (originalVesselData.date) {
            const originalDate = new Date(originalVesselData.date);
            actualDateKey = `${originalDate.getFullYear()}-${String(originalDate.getMonth() + 1).padStart(2, '0')}-${String(originalDate.getDate()).padStart(2, '0')}`;
          }
        }
        
        if (!originalVessel) {
          alert('Error: Could not find original vessel entry. Please try refreshing the page.');
          return;
        }
        
        // Use the actual dateKey where the vessel was found
        dateKey = actualDateKey;

        // Use the stored original vessel name for Excel lookup
        // This ensures we can find the entry even if the vessel name was changed in previous edits
        const vesselNameForExcel = originalVesselName || originalVessel.vesselName;
        
        if (!vesselNameForExcel) {
          alert('Error: Could not find vessel name for update');
          return;
        }

        // Update Excel file
        const excelUpdateData = {
          "Vessel": vesselFormData.vesselName,
          "Voyage Number": vesselFormData.voyageId,
          "Control Number": vesselFormData.controlId,
          "Service": vesselFormData.purpose.join(', '),
          "Time": vesselFormData.time,
          "Time Finished": vesselFormData.timeFinished,
          "Vessel Type": vesselFormData.vesselType
        };

        try {
          await excelAPI.updateVesselEntry(
            dateKey,
            vesselNameForExcel,
            excelUpdateData
          );
          // Refresh upcoming scheduled vessels after successful update
          // Add a small delay to ensure Excel file is written
          setTimeout(() => {
            loadUpcomingScheduledVessels();
          }, 500);
          
          // Create notification for all users
          const formattedDate = new Date(dateKey).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          notificationService.addNotification({
            title: "Vessel Schedule Updated",
            message: `${vesselFormData.vesselName} schedule has been updated for ${formattedDate} by ${userFullName || userName || 'System'}.`,
            type: "scheduling",
            priority: "medium",
            fromUser: userFullName || userName || 'System',
            targetRole: "all", // Visible to all roles
            status: "active"
          });
        } catch (excelError) {
          // If update fails, try with current vessel name as fallback
          if (vesselNameForExcel !== originalVessel.vesselName) {
            console.warn('First update attempt failed, trying with current vessel name');
            await excelAPI.updateVesselEntry(
              dateKey,
              originalVessel.vesselName,
              excelUpdateData
            );
            // Refresh upcoming scheduled vessels after successful fallback update
            setTimeout(() => {
              loadUpcomingScheduledVessels();
            }, 500);
            
            // Create notification for all users
            const formattedDate = new Date(dateKey).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
            notificationService.addNotification({
              title: "Vessel Schedule Updated",
              message: `${vesselFormData.vesselName} schedule has been updated for ${formattedDate} by ${userFullName || userName || 'System'}.`,
              type: "scheduling",
              priority: "medium",
              fromUser: userFullName || userName || 'System',
              targetRole: "all", // Visible to all roles
              status: "active"
            });
          } else {
            throw excelError;
          }
        }

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
                    purpose: vesselFormData.purpose,
                    time: vesselFormData.time,
                    timeFinished: vesselFormData.timeFinished,
                    assignedWorkers: vesselFormData.assignedWorkers || []
                  }
                : vessel
            ) || []
          };
          // Save to local storage
          saveVesselEntriesToLocalStorage(updatedEntries);
          return updatedEntries;
        });
        
        // Keep the originalVesselName as-is (don't update it)
        // We always want to use the original vessel name from when we first started editing
        // This ensures we can find the entry in Excel even after multiple edits
        
        // Trigger vessel update in Firestore to notify other browsers
        await triggerVesselUpdate();
        
        // Update payroll for newly assigned workers only (only if date has passed)
        // Get previously assigned workers from original vessel data to avoid duplicate counts
        const previouslyAssignedWorkers = originalVesselData?.assignedWorkers || [];
        if (vesselFormData.assignedWorkers && vesselFormData.assignedWorkers.length > 0) {
          await updatePayrollForAssignedWorkers(
            vesselFormData.assignedWorkers,
            vesselFormData.vesselType,
            vesselFormData.purpose,
            clickedDate,
            vesselFormData.timeFinished,
            previouslyAssignedWorkers // Pass previously assigned workers to avoid duplicates
          );
        }
        
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
          time: vesselFormData.time,
          timeFinished: vesselFormData.timeFinished
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
          timeFinished: vesselFormData.timeFinished,
          assignedWorkers: vesselFormData.assignedWorkers || [],
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
          // Trigger vessel update in Firestore to notify other browsers
          await triggerVesselUpdate();
          
          // Create notification for all users
          const formattedDate = clickedDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          notificationService.addNotification({
            title: "New Vessel Scheduled",
            message: `${vesselFormData.vesselName} has been scheduled for ${formattedDate} by ${userFullName || userName || 'System'}.`,
            type: "scheduling",
            priority: "medium",
            fromUser: userFullName || userName || 'System',
            targetRole: "all", // Visible to all roles
            status: "active"
          });
        } catch (excelError) {
          // Don't throw - vessel is already added locally
        }
        
        // Update payroll for assigned workers (only if date has passed)
        if (vesselFormData.assignedWorkers && vesselFormData.assignedWorkers.length > 0) {
          await updatePayrollForAssignedWorkers(
            vesselFormData.assignedWorkers,
            vesselFormData.vesselType,
            vesselFormData.purpose,
            clickedDate,
            vesselFormData.timeFinished
          );
        }
        
        alert('Vessel entry added successfully!');
      }
    } catch (error) {
      alert('Error saving vessel entry. Please try again.');
      return;
    }
    
    // Close modal and reset form
    setShowVesselModal(false);
    setIsEditingVessel(false);
    setEditingVesselId(null);
    setOriginalVesselName(null);
    setVesselFormData({
      vesselName: '',
      voyageId: '',
      controlId: '',
      vesselType: 'Local',
      purpose: [],
      time: '',
      timeFinished: '',
      assignedWorkers: []
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
    setOriginalVesselName(null);
    setVesselFormData({
      vesselName: '',
      voyageId: '',
      controlId: '',
      vesselType: 'Local',
      purpose: [],
      time: '',
      timeFinished: '',
      assignedWorkers: []
    });
    setClickedDate(null);
  };

  // Handle worker assignment toggle
  const handleWorkerToggle = (workerName) => {
    setVesselFormData(prev => {
      const currentWorkers = prev.assignedWorkers || [];
      const isSelected = currentWorkers.includes(workerName);
      
      return {
        ...prev,
        assignedWorkers: isSelected
          ? currentWorkers.filter(w => w !== workerName)
          : [...currentWorkers, workerName]
      };
    });
  };

  // Handle worker assignment modal close
  const handleWorkerAssignmentClose = () => {
    setShowWorkerAssignmentModal(false);
  };

  // Update payroll when workers are assigned to a vessel
  const updatePayrollForAssignedWorkers = async (assignedWorkers, vesselType, purpose, vesselDate, timeFinished, previouslyAssignedWorkers = []) => {
    console.log('=== PAYROLL UPDATE FUNCTION CALLED ===');
    console.log('Parameters:', {
      assignedWorkers,
      previouslyAssignedWorkers,
      vesselType,
      purpose,
      vesselDate: vesselDate ? vesselDate.toISOString() : 'null',
      timeFinished
    });
    
    if (!assignedWorkers || assignedWorkers.length === 0) {
      console.log('No workers assigned, skipping payroll update');
      return; // No workers assigned, nothing to update
    }
    
    // Find newly added workers (workers in assignedWorkers but not in previouslyAssignedWorkers)
    const previousWorkersSet = new Set((previouslyAssignedWorkers || []).map(w => w.toLowerCase().trim()));
    const newlyAssignedWorkers = (assignedWorkers || []).filter(worker => 
      !previousWorkersSet.has(worker.toLowerCase().trim())
    );
    
    console.log('Worker comparison:', {
      previouslyAssigned: previouslyAssignedWorkers,
      currentlyAssigned: assignedWorkers,
      newlyAssigned: newlyAssignedWorkers
    });
    
    // If no new workers were added, skip payroll update
    if (newlyAssignedWorkers.length === 0) {
      console.log('No new workers added, skipping payroll update to avoid duplicates');
      return;
    }
    
    // Use only newly assigned workers for payroll update
    const workersToUpdate = newlyAssignedWorkers;

    try {
      const db = getFirestore();
      
      // Use the vessel date, or today's date if not provided
      const dateToUse = vesselDate || new Date();
      
      // Check if the vessel date has passed (only update payroll after the date has finished)
      const now = new Date();
      
      // Get today's date components for accurate comparison (avoid timezone issues)
      const todayYear = now.getFullYear();
      const todayMonth = now.getMonth();
      const todayDay = now.getDate();
      const today = new Date(todayYear, todayMonth, todayDay, 0, 0, 0, 0);
      
      // Get vessel date components
      const vesselYear = dateToUse.getFullYear();
      const vesselMonth = dateToUse.getMonth();
      const vesselDay = dateToUse.getDate();
      const vesselDateOnly = new Date(vesselYear, vesselMonth, vesselDay, 0, 0, 0, 0);
      
      console.log('Payroll update check:', {
        vesselDate: dateToUse.toISOString(),
        vesselDateComponents: { year: vesselYear, month: vesselMonth, day: vesselDay },
        vesselDateOnly: vesselDateOnly.toISOString(),
        todayComponents: { year: todayYear, month: todayMonth, day: todayDay },
        today: today.toISOString(),
        timeFinished: timeFinished,
        now: now.toISOString()
      });
      
      // If vessel date is in the future, don't update payroll yet
      if (vesselDateOnly > today) {
        console.log('Vessel date is in the future, payroll will be updated after the date passes');
        return;
      }
      
      // For today's date, only update if timeFinished is provided
      const isToday = vesselYear === todayYear && vesselMonth === todayMonth && vesselDay === todayDay;
      if (isToday) {
        if (!timeFinished || timeFinished.trim() === '') {
          console.log('Vessel date is today but timeFinished is not provided, payroll will not be updated yet');
          return;
        }
        // If timeFinished is provided, check if the work is actually finished
        // Parse timeFinished which could be in "HH:MM" or "HH:MM AM/PM" format
        let parsedHours = 0;
        let parsedMinutes = 0;
        
        if (timeFinished.includes('AM') || timeFinished.includes('PM')) {
          // Handle AM/PM format (e.g., "10:09 am" or "2:30 PM")
          const timeMatch = timeFinished.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (timeMatch) {
            let hours = parseInt(timeMatch[1], 10);
            const minutes = parseInt(timeMatch[2], 10);
            const ampm = timeMatch[3].toUpperCase();
            
            if (ampm === 'PM' && hours !== 12) {
              hours += 12;
            } else if (ampm === 'AM' && hours === 12) {
              hours = 0;
            }
            
            parsedHours = hours;
            parsedMinutes = minutes;
          }
        } else {
          // Handle 24-hour format (e.g., "10:09" or "14:30")
          const [hours, minutes] = timeFinished.split(':');
          parsedHours = parseInt(hours, 10);
          parsedMinutes = parseInt(minutes, 10);
        }
        
        // Use today's date for the finished time comparison (use current date components directly)
        const finishedDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        finishedDateTime.setHours(
          isNaN(parsedHours) ? 23 : parsedHours, 
          isNaN(parsedMinutes) ? 59 : parsedMinutes, 
          0, 
          0  // Set seconds and milliseconds to 0 for cleaner comparison
        );
        
        console.log('Time comparison for today:', {
          timeFinished: timeFinished,
          parsedHours: parsedHours,
          parsedMinutes: parsedMinutes,
          finishedDateTimeLocal: finishedDateTime.toString(),
          finishedDateTimeUTC: finishedDateTime.toISOString(),
          nowLocal: now.toString(),
          nowUTC: now.toISOString(),
          finishedTimeMs: finishedDateTime.getTime(),
          nowTimeMs: now.getTime(),
          isFinished: finishedDateTime.getTime() <= now.getTime(),
          timeDifferenceMs: now.getTime() - finishedDateTime.getTime(),
          timeDifferenceMinutes: Math.round((now.getTime() - finishedDateTime.getTime()) / 1000 / 60)
        });
        
        // Only update if the finished time has passed
        // Compare using getTime() which is timezone-independent (milliseconds since epoch)
        if (finishedDateTime.getTime() > now.getTime()) {
          const minutesRemaining = Math.round((finishedDateTime.getTime() - now.getTime()) / 1000 / 60);
          console.log('Vessel work is not finished yet, payroll will be updated after timeFinished');
          console.log('Time remaining:', minutesRemaining, 'minutes');
          return;
        }
        
        console.log('TimeFinished has passed, proceeding with payroll update');
      } else {
        // For past dates, proceed with update immediately
        // Since the date has already passed, we don't need to check timeFinished
        // The vessel work is considered finished
        console.log('Vessel date is in the past, proceeding with payroll update immediately');
      }
      
      // Determine which count to increment based on purpose
      // Check if purpose array contains mooring operations (MOORING)
      const hasMooring = purpose.some(p => {
        const pUpper = p.toUpperCase().trim();
        return pUpper === 'MOORING' || 
               pUpper.includes('MOORING');
      });
      
      // Check if purpose array contains unmooring operations
      const hasUnmooring = purpose.some(p => {
        const pUpper = p.toUpperCase().trim();
        return pUpper === 'UNMOORING' || 
               pUpper.includes('UNMOORING');
      });
      
      console.log('Proceeding with payroll update...', {
        assignedWorkers,
        vesselType,
        purpose,
        hasMooring,
        hasUnmooring
      });
      
      const month = dateToUse.getMonth() + 1;
      const day = dateToUse.getDate();
      const year = dateToUse.getFullYear();
      
      const workersPayrollId = `workerspayroll(${month},${day},${year})`;
      const workersPayrollRef = doc(db, 'workerPayrolls', workersPayrollId);
      
      console.log('Payroll document ID:', workersPayrollId);
      
      // Get existing payroll data
      const workersPayrollDoc = await getDoc(workersPayrollRef);
      const existingData = workersPayrollDoc.exists() ? workersPayrollDoc.data() : { workers: [] };
      
      console.log('Existing payroll data:', {
        exists: workersPayrollDoc.exists(),
        workersCount: existingData.workers?.length || 0,
        existingWorkers: existingData.workers?.map(w => ({
          name: w.workerName,
          localMooring: w.localMooringCount || 0,
          localUnmooring: w.localUnmooringCount || 0,
          foreignMooring: w.foreignMooringCount || 0,
          foreignUnmooring: w.foreignUnmooringCount || 0
        })) || []
      });
      
      // Prepare updated workers data
      const updatedWorkers = existingData.workers || [];
      const workersMap = new Map();
      
      // Convert existing workers array to map for easier lookup
      if (Array.isArray(updatedWorkers)) {
        updatedWorkers.forEach(worker => {
          workersMap.set(worker.workerName, { ...worker });
        });
      }
      
      console.log('Workers map after loading existing data:', {
        mapSize: workersMap.size,
        mapKeys: Array.from(workersMap.keys()),
        workersToUpdate: workersToUpdate
      });
      
      // Update counts for each newly assigned worker only
      workersToUpdate.forEach(workerName => {
        let workerData = workersMap.get(workerName);
        
        if (!workerData) {
          // Initialize new worker data
          workerData = {
            workerName: workerName,
            localMooringCount: 0,
            localUnmooringCount: 0,
            foreignMooringCount: 0,
            foreignUnmooringCount: 0,
            totalEarnings: 0,
            sss: 0,
            pagibig: 0,
            philhealth: 0,
            cashAdvance: 0,
            netTotal: 0
          };
        }
        
        // Increment appropriate count based on vessel type and purpose
        console.log(`Processing worker ${workerName}, vesselType: "${vesselType}", hasMooring: ${hasMooring}, hasUnmooring: ${hasUnmooring}`);
        
        // Normalize vessel type for comparison (handle case variations)
        const normalizedVesselType = (vesselType || '').trim();
        const normalizedLower = normalizedVesselType.toLowerCase();
        
        console.log(`Vessel type comparison for ${workerName}:`, {
          original: vesselType,
          normalized: normalizedVesselType,
          normalizedLower: normalizedLower,
          isLocal: normalizedLower === 'local',
          isForeign: normalizedLower === 'foreign'
        });
        
        if (normalizedLower === 'local') {
          if (hasMooring) {
            const oldCount = workerData.localMooringCount || 0;
            workerData.localMooringCount = oldCount + 1;
            console.log(`✓ Incremented localMooringCount for ${workerName}: ${oldCount} -> ${workerData.localMooringCount}`);
          }
          if (hasUnmooring) {
            const oldCount = workerData.localUnmooringCount || 0;
            workerData.localUnmooringCount = oldCount + 1;
            console.log(`✓ Incremented localUnmooringCount for ${workerName}: ${oldCount} -> ${workerData.localUnmooringCount}`);
          }
        } else if (normalizedLower === 'foreign') {
          if (hasMooring) {
            const oldCount = workerData.foreignMooringCount || 0;
            workerData.foreignMooringCount = oldCount + 1;
            console.log(`✓ Incremented foreignMooringCount for ${workerName}: ${oldCount} -> ${workerData.foreignMooringCount}`);
          }
          if (hasUnmooring) {
            const oldCount = workerData.foreignUnmooringCount || 0;
            workerData.foreignUnmooringCount = oldCount + 1;
            console.log(`✓ Incremented foreignUnmooringCount for ${workerName}: ${oldCount} -> ${workerData.foreignUnmooringCount}`);
          }
        } else {
          console.warn(`⚠ Unknown vessel type: "${vesselType}" (normalized: "${normalizedLower}") for worker ${workerName}`);
        }
        
        workersMap.set(workerName, workerData);
      });
      
      // Convert map back to array
      const updatedWorkersArray = Array.from(workersMap.values());
      
      console.log('Final workers array before saving:', {
        totalWorkers: updatedWorkersArray.length,
        workers: updatedWorkersArray.map(w => ({
          name: w.workerName,
          localMooring: w.localMooringCount || 0,
          localUnmooring: w.localUnmooringCount || 0,
          foreignMooring: w.foreignMooringCount || 0,
          foreignUnmooring: w.foreignUnmooringCount || 0
        }))
      });
      
      // Save updated payroll data
      // Use merge: false to completely replace the document and ensure all workers are preserved
      await setDoc(workersPayrollRef, {
        workers: updatedWorkersArray,
        status: existingData.status || 'pending',
        createdBy: existingData.createdBy || '',
        createdByName: existingData.createdByName || 'System',
        createdAt: existingData.createdAt || new Date().toISOString(),
        lastModified: new Date().toISOString()
      }, { merge: false });
      
      console.log('Payroll updated successfully for newly assigned workers:', {
        workersPayrollId: workersPayrollId,
        newlyAssignedWorkers: workersToUpdate,
        allAssignedWorkers: assignedWorkers,
        previouslyAssignedWorkers: previouslyAssignedWorkers,
        updatedCounts: updatedWorkersArray.map(w => ({
          name: w.workerName,
          localMooring: w.localMooringCount,
          localUnmooring: w.localUnmooringCount,
          foreignMooring: w.foreignMooringCount,
          foreignUnmooring: w.foreignUnmooringCount
        }))
      });
    } catch (error) {
      console.error('Error updating payroll for assigned workers:', error);
      // Don't throw - payroll update failure shouldn't block vessel saving
    }
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
      // Error loading recent finished vessels
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
      // Error loading upcoming scheduled vessels
    }
  };

  // Trigger vessel update in Firestore (to notify other browsers)
  const triggerVesselUpdate = async () => {
    try {
      const updateDocRef = doc(db, 'system', 'vesselUpdates');
      await setDoc(updateDocRef, {
        lastUpdated: Timestamp.now(),
        timestamp: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error('Error triggering vessel update:', error);
    }
  };

  // Load vessel entries from Excel file
  const loadVesselEntriesFromExcel = async () => {
    try {
      const response = await excelAPI.getVesselsData();
      
      if (response.success && response.vessels) {
        // Use functional update to get current state and preserve assignedWorkers
        setVesselEntries(prevEntries => {
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
            
            // Try to find existing vessel entry to preserve assignedWorkers
            const existingVessel = prevEntries[dateKey]?.find(existing => 
              existing.vesselName === (vessel.vessel || '') &&
              existing.voyageId === (vessel.voyage || '') &&
              existing.controlId === (vessel.controlId || '')
            );
            
            const vesselEntry = {
              id: existingVessel?.id || `excel_${index}_${Date.now()}`,
              vesselName: vessel.vessel || '',
              voyageId: vessel.voyage || '',
              controlId: vessel.controlId || '',
              vesselType: vessel.vesselType || 'Local',
              purpose: vessel.purpose ? vessel.purpose.split(', ').filter(p => p.trim()) : [],
              time: vessel.time || '',
              timeFinished: vessel.timeFinished || '',
              assignedWorkers: existingVessel?.assignedWorkers || [],
              date: new Date(dateKey)
            };
            
            entries[dateKey].push(vesselEntry);
          });
          
          // Save to local storage as backup
          saveVesselEntriesToLocalStorage(entries);
          return entries;
        });
      } else {
        // Try to load from local storage as fallback
        loadVesselEntriesFromLocalStorage();
      }
    } catch (error) {
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
      // Error loading vessel entries from local storage
    }
  };

  // Save vessel entries to local storage
  const saveVesselEntriesToLocalStorage = (entries) => {
    try {
      localStorage.setItem('vesselEntries', JSON.stringify(entries));
    } catch (error) {
      // Error saving vessel entries to local storage
    }
  };

  // Convert AM/PM time format to HH:MM format for time input
  const convertToTimeInputFormat = (timeStr) => {
    if (!timeStr || timeStr.trim() === '') return '';
    
    try {
      const timeStrTrimmed = timeStr.trim();
      
      // If already in HH:MM format, return as is
      if (/^\d{1,2}:\d{2}$/.test(timeStrTrimmed)) {
        return timeStrTrimmed;
      }
      
      // Try to parse AM/PM format (e.g., "2:30 PM", "10:15 AM")
      if (timeStrTrimmed.includes('AM') || timeStrTrimmed.includes('PM')) {
        const isPM = timeStrTrimmed.toUpperCase().includes('PM');
        const timeWithoutAmPm = timeStrTrimmed.replace(/AM|PM/gi, '').trim();
        const [hours, minutes = '00'] = timeWithoutAmPm.split(':').map(s => s.trim());
        
        let hour24 = parseInt(hours, 10);
        
        if (isPM && hour24 !== 12) {
          hour24 += 12;
        } else if (!isPM && hour24 === 12) {
          hour24 = 0;
        }
        
        return `${String(hour24).padStart(2, '0')}:${minutes.padStart(2, '0')}`;
      }
      
      // If format doesn't match, try to parse as HH:MM directly
      if (timeStrTrimmed.includes(':')) {
        const [hours, minutes = '00'] = timeStrTrimmed.split(':').map(s => s.trim());
        const hour24 = parseInt(hours, 10);
        if (!isNaN(hour24) && hour24 >= 0 && hour24 <= 23) {
          return `${String(hour24).padStart(2, '0')}:${minutes.padStart(2, '0')}`;
        }
      }
      
      return '';
    } catch (e) {
      return '';
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
    // Store the original vessel data for Excel lookup (important if vessel name was changed in previous edits)
    setOriginalVesselName(vessel.vesselName);
    setOriginalVesselData({ ...vessel }); // Store a copy of the entire vessel object
    setVesselFormData({
      vesselName: vessel.vesselName,
      voyageId: vessel.voyageId,
      controlId: vessel.controlId,
      vesselType: vessel.vesselType,
      purpose: [...vessel.purpose],
      time: convertToTimeInputFormat(vessel.time || ''),
      timeFinished: convertToTimeInputFormat(vessel.timeFinished || ''),
      assignedWorkers: vessel.assignedWorkers || []
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
    
    try {
      // Find the vessel to get its name for Excel deletion
      const vesselToDelete = vesselEntries[dateKey]?.find(vessel => vessel.id === vesselId);
      if (!vesselToDelete) {
        alert('Error: Could not find vessel entry to delete');
        return;
      }

      // Delete from Excel
      await excelAPI.deleteVesselEntry(dateKey, vesselToDelete.vesselName);

      // Delete from local state
      setVesselEntries(prev => {
        const beforeCount = prev[dateKey]?.length || 0;
        const updatedEntries = {
          ...prev,
          [dateKey]: prev[dateKey]?.filter(vessel => vessel.id !== vesselId) || []
        };
        
        // Save to local storage
        saveVesselEntriesToLocalStorage(updatedEntries);
        return updatedEntries;
      });
      
      // Trigger vessel update in Firestore to notify other browsers
      await triggerVesselUpdate();
      
      // Create notification for all users
      const formattedDate = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      notificationService.addNotification({
        title: "Vessel Schedule Removed",
        message: `${vesselToDelete.vesselName} has been removed from the schedule for ${formattedDate} by ${userFullName || userName || 'System'}.`,
        type: "scheduling",
        priority: "medium",
        fromUser: userFullName || userName || 'System',
        targetRole: "all", // Visible to all roles
        status: "active"
      });
      
      alert('Vessel entry deleted successfully!');
    } catch (error) {
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
    setOpenOverflowDateKey(null);
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
      const year = entryData.date.getFullYear();
      const month = String(entryData.date.getMonth() + 1).padStart(2, '0');
      const day = String(entryData.date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      const newRow = {
        'Vessel': entryData.vesselName,
        'Voyage Number': entryData.voyageNumber,
        'Control Number': entryData.controlId,
        'Service': entryData.mooringOperations.join(', '),
        'Date': dateString,
        'Time': entryData.time,
        'Vessel Type': entryData.vesselType
      };

      let response;
      
      if (isUpdate && originalDate) {
        // This is an update - use the update endpoint
        // Get the original vessel name from the vessel entries
        const originalYear = originalDate.getFullYear();
        const originalMonth = String(originalDate.getMonth() + 1).padStart(2, '0');
        const originalDay = String(originalDate.getDate()).padStart(2, '0');
        const originalDateKey = `${originalYear}-${originalMonth}-${originalDay}`;
        const originalEntry = vesselEntries[originalDateKey];
        
        if (originalEntry && originalEntry.vesselName) {
          response = await api.put('/excel/update-entry', {
            date: dateString,
            vesselName: originalEntry.vesselName,
            newData: newRow
          });
          
          if (!response.data.success) {
            // Fallback to append if update fails
            response = await api.post('/excel/append', {
              object: newRow
            });
          }
        } else {
          response = await api.post('/excel/append', {
            object: newRow
          });
        }
      } else {
        // This is a new entry - use the append endpoint
        response = await api.post('/excel/append', {
          object: newRow
        });
      }

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to save to Excel');
      }
    } catch (error) {
      // Error saving to Excel
    }
  };

  const removeFromExcel = async (entryData) => {
    try {
      // Entry cleared from calendar (Excel entry remains)
    } catch (error) {
      // Error processing clear request
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
        // Error saving dates
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
        if (forecast && Object.keys(forecast).length > 0) {
          setWeatherData(forecast);
          setWeatherError(null);
        } else {
          setWeatherData({});
          setWeatherError('No weather data available for the selected range.');
        }
      } catch (error) {
        console.error('Failed to load weather forecast:', error);
        setWeatherData({});
        setWeatherError(error.message || 'Failed to load weather information.');
      } finally {
        setWeatherLoading(false);
      }
    };

    fetchWeatherData();
  }, [currentDate]);

  // Load vessel entries on component mount
  useEffect(() => {
    // First load from localStorage to preserve assignedWorkers, then merge with Excel data
    loadVesselEntriesFromLocalStorage();
    loadVesselEntriesFromExcel();
    loadRecentFinishedVessels();
    loadUpcomingScheduledVessels();
  }, []);

  // Fetch available workers (only Crew/Worker roles)
  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const q = query(collection(db, 'users'));
        const querySnapshot = await getDocs(q);
        
        const workers = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          
          // Get and normalize role
          let role = data.role || data.type || 'Crew';
          if (role === 'Employee') role = 'Crew';
          
          // Filter to only include Crew/Worker roles
          // Exclude: HR, Manager, Admin, Senior Supervisor, Scheduler
          const excludedRoles = ['HR', 'Manager', 'Admin', 'Senior Supervisor', 'Scheduler'];
          if (excludedRoles.includes(role)) {
            return; // Skip this user
          }
          
          const firstName = data.firstName || '';
          const lastName = data.lastName || '';
          
          let name = '';
          if (firstName && lastName) {
            name = `${lastName}, ${firstName}`.trim();
          } else if (data.fullName) {
            name = data.fullName;
          } else if (data.username) {
            name = data.username;
          } else {
            name = data.name || 'Unknown';
          }
          
          workers.push({
            id: doc.id,
            name: name,
            email: data.email || '',
            role: role
          });
        });
        
        workers.sort((a, b) => a.name.localeCompare(b.name));
        setAvailableWorkers(workers);
      } catch (error) {
        console.error('Error fetching workers:', error);
      }
    };
    
    fetchWorkers();
  }, []);

  // Set up real-time listener for vessel updates
  useEffect(() => {
    const updateDocRef = doc(db, 'system', 'vesselUpdates');
    
    // Listen for changes to vessel updates
    const unsubscribe = onSnapshot(updateDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        // Vessel data was updated, reload it
        loadVesselEntriesFromExcel();
        loadRecentFinishedVessels();
        loadUpcomingScheduledVessels();
      }
    }, (error) => {
      console.error('Error listening to vessel updates:', error);
    });

    return () => unsubscribe();
  }, []);




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
                    
                    return (
                      <div key={index} className="upcoming-vessel-card">
                        <div className="vessel-info">
                          <div className="vessel-name-row">
                            <span className="vessel-name">{vessel.vessel || 'N/A'}</span>
                            <span className="control-number-label">Control No: {vessel.controlId || 'N/A'}</span>
                          </div>
                          <div className="vessel-date-row">
                            <span className="vessel-date">{formattedDate}</span>
                            <span className="voyage-number-label">Voyage No: {vessel.voyage || 'N/A'}</span>
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
                    
                    return (
                      <div key={index} className="finished-vessel-card">
                        <div className="vessel-info">
                          <div className="vessel-name-row">
                            <span className="vessel-name">{vessel.vessel || 'N/A'}</span>
                            <span className="control-number-label">Control No: {vessel.controlId || 'N/A'}</span>
                          </div>
                          <div className="vessel-date-row">
                            <span className="vessel-date">{formattedDate}</span>
                            <span className="voyage-number-label">Voyage No: {vessel.voyage || 'N/A'}</span>
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

                const dateKey = dayData.isCurrentMonth && dayData.day
                  ? `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayData.day).padStart(2, '0')}`
                  : null;
                const vesselsForDay = getVesselEntriesForDate(dayData.day, dayData.isCurrentMonth);
                const visibleVessels = vesselsForDay.slice(0, 2);
                const overflowCount = vesselsForDay.length > 2 ? vesselsForDay.length - 2 : 0;
                const overflowSchedules = overflowCount > 0 ? vesselsForDay.slice(2) : [];

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
                      <div className="day-number-modern">
                        {dayData.day !== undefined && dayData.day !== null && dayData.day !== '' ? dayData.day : ''}
                      </div>
                    {weatherInfo && (
                        <div className="weather-indicator-modern">
                        {weatherInfo.temperature}°C
                      </div>
                    )}
                    
                    {/* Vessel entry bars */}
                    <div className="vessel-container-modern">
                      {visibleVessels.length === 0 ? null : visibleVessels.map((vessel) => {
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
                      })}
                    </div>
                    {overflowCount > 0 && (
                      <div 
                        className="schedule-overflow-indicator"
                        title={`${vesselsForDay.length} schedules total`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenOverflowDateKey(prev => (prev === dateKey ? null : dateKey));
                        }}
                      >
                        +{overflowCount}
                        {openOverflowDateKey === dateKey && (
                          <div 
                            className="schedule-overflow-popover"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="overflow-popover-header">
                              <div className="overflow-title">Other schedules</div>
                              <button
                                className="overflow-close-button"
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenOverflowDateKey(null);
                                }}
                                aria-label="Close overflow schedules"
                              >
                                ×
                              </button>
                            </div>
                            <ul className="overflow-list">
                              {overflowSchedules.map((schedule) => (
                                <li 
                                  key={schedule.id} 
                                  className="overflow-item"
                                  onClick={(e) => {
                                    handleVesselBarClick(schedule, dayData.day, dayData.isCurrentMonth, e);
                                    setOpenOverflowDateKey(null);
                                  }}
                                >
                                  <div className="overflow-item-header">
                                    <span className="overflow-item-name">{schedule.vesselName}</span>
                                    <div className="overflow-item-chips">
                                      {schedule.time && (
                                        <span className="overflow-chip">{schedule.time}</span>
                                      )}
                                      {schedule.vesselType && (
                                        <span className="overflow-chip type">{schedule.vesselType}</span>
                                      )}
                                      <button
                                        className="overflow-delete-btn"
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleVesselDelete(schedule.id, dayData.day, dayData.isCurrentMonth);
                                        }}
                                        title="Delete vessel entry"
                                        aria-label={`Delete ${schedule.vesselName}`}
                                      >
                                        ×
                                      </button>
                                    </div>
                                  </div>
                                  <div className="overflow-item-meta">
                                    {schedule.voyageId && (
                                      <span className="overflow-meta">Voyage: {schedule.voyageId}</span>
                                    )}
                                    {schedule.controlId && (
                                      <span className="overflow-meta">Control: {schedule.controlId}</span>
                                    )}
                                  </div>
                                  {schedule.purpose && schedule.purpose.length > 0 && (
                                    <div className="overflow-item-purpose">
                                      {schedule.purpose.join(', ')}
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
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
            {weatherError && (
              <div className="weather-error-banner">
                ⚠️ {weatherError}
              </div>
            )}
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

    {weatherWarningModal.isOpen && (
      <div className="modal-overlay-modern" onClick={handleWeatherWarningCancel}>
        <div 
          className={`weather-warning-modal ${weatherWarningModal.type}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="weather-warning-header">
            <div className="weather-warning-title">{weatherWarningModal.title}</div>
          </div>
          <p className="weather-warning-message">{weatherWarningModal.message}</p>
          <p className="weather-warning-question">
            Do you still want to add a vessel schedule for this date?
          </p>
          <div className="weather-warning-actions">
            <button 
              type="button" 
              className="weather-warning-cancel" 
              onClick={handleWeatherWarningCancel}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="weather-warning-proceed" 
              onClick={handleWeatherWarningProceed}
            >
              Continue
            </button>
          </div>
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
                  <label>Time Finished:</label>
                  <input
                    type="time"
                      value={vesselFormData.timeFinished}
                      onChange={(e) => handleVesselInputChange('timeFinished', e.target.value)}
                      className="form-input-modern"
                    placeholder="Select time finished"
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
                      {['MOORING', 'UNMOORING'].map(purpose => (
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
                      className="assign-workers-btn-modern"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowWorkerAssignmentModal(true);
                      }}
                  >
                    Assign Workers
                  </button>
                  <button 
                    type="button"
                      className="save-btn-modern"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
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

    {/* Worker Assignment Modal */}
    {showWorkerAssignmentModal && (
      <div className="modal-overlay-modern" onClick={handleWorkerAssignmentClose}>
        <div className="date-modal-modern" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content-modern">
            <div className="modal-header-modern">
              <h2>Assign Workers to Vessel</h2>
              <button 
                className="close-button-modern"
                onClick={handleWorkerAssignmentClose}
              >
                ×
              </button>
            </div>

            <div className="modal-body-modern">
              <div className="form-section-modern">
                <p className="worker-assignment-info">
                  Select workers to assign to <strong>{vesselFormData.vesselName || 'this vessel'}</strong>
                </p>
                
                <div className="workers-list-modern">
                  {availableWorkers.length === 0 ? (
                    <p>No workers available</p>
                  ) : (
                    availableWorkers.map((worker) => {
                      const isSelected = (vesselFormData.assignedWorkers || []).includes(worker.name);
                      return (
                        <label key={worker.id} className="worker-checkbox-label-modern">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleWorkerToggle(worker.name)}
                            className="worker-checkbox-input-modern"
                          />
                          <span className="worker-checkbox-text-modern">
                            {worker.name}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>

                {vesselFormData.assignedWorkers && vesselFormData.assignedWorkers.length > 0 && (
                  <div className="selected-workers-summary">
                    <strong>Selected: {vesselFormData.assignedWorkers.length} worker(s)</strong>
                    <div className="selected-workers-list">
                      {vesselFormData.assignedWorkers.map((workerName, index) => (
                        <span key={index} className="selected-worker-tag">
                          {workerName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="modal-actions-modern">
                  <button 
                    type="button"
                    className="save-btn-modern"
                    onClick={handleWorkerAssignmentClose}
                  >
                    Done
                  </button>
                </div>
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
