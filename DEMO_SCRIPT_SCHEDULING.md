# AnchorPoint Demo Script - Scheduling Page
## Capstone 2 Defense Demonstration

---

## Pre-Demo Setup (Before Presentation)

1. **Ensure System is Running**:
   - Backend Flask server is running on `http://localhost:5000`
   - Frontend React app is running on `http://localhost:3000`
   - User is logged in as Alice (or authorized user with scheduling permissions)

2. **Prepare Test Data** (Optional):
   - Have a few sample vessel entries ready to demonstrate
   - Ensure weather API is accessible for weather forecast display

---

## Demo Script

### **Introduction (30 seconds)**

"Now I'll demonstrate the Scheduling module, which is the core of our worker scheduling optimization. This module allows authorized personnel to manage vessel schedules efficiently while considering weather conditions and operational requirements."

---

### **1. Calendar Overview (1 minute)**

**Action**: Navigate to the Scheduling page

**Narration**:
- "Here we see the main scheduling interface - an interactive monthly calendar"
- "The calendar displays all scheduled vessels with color-coded indicators"
- "Green indicates Local vessels, Blue indicates Foreign vessels, and Purple indicates days with both types"
- "Notice the weather indicators on each date showing temperature and conditions"

**Key Points to Highlight**:
- Modern, intuitive calendar interface
- Visual representation of scheduled operations
- Weather integration visible on calendar dates

---

### **2. Calendar Navigation (30 seconds)**

**Action**: Use the navigation arrows to move between months

**Narration**:
- "We can easily navigate between months using these arrow buttons"
- "The 'Today' button quickly returns us to the current month"
- "The calendar maintains all scheduled data across months"

**Key Points to Highlight**:
- Easy month-to-month navigation
- Quick access to current date

---

### **3. Sidebar Widgets (1 minute)**

**Action**: Point to the left sidebar

**Narration**:
- "On the left, we have two important widgets"
- "The 'Upcoming Schedules' widget shows the next 5 scheduled vessels, helping us plan ahead"
- "The 'Recent Finished' widget displays the last 5 completed operations, providing quick access to recent history"
- "These widgets help managers quickly assess current and upcoming operations"

**Key Points to Highlight**:
- Quick overview of upcoming operations
- Recent history tracking
- Planning assistance

---

### **4. Adding a New Vessel Schedule (2 minutes)**

**Action**: Click on a future date in the calendar

**Narration**:
- "To add a new vessel schedule, I simply click on any future date"
- "The system checks weather conditions for that date before allowing scheduling"
- "If weather conditions are unfavorable, we'll see a warning modal"

**Action**: If weather warning appears, explain it, then proceed

**Narration**:
- "The system provides AI-powered weather recommendations"
- "For this demonstration, I'll proceed to show the vessel entry form"

**Action**: Fill out the vessel entry form:
- Vessel Name: "MV Demo Vessel"
- Voyage ID: "VOY-2024-001"
- Control ID: "CTRL-2024-001"
- Time: Select a time (e.g., "09:00")
- Time Finished: Select a time (e.g., "12:00")
- Vessel Type: Select "Local" or "Foreign"
- Purpose: Check "W/ MOORING BUOY" and "UNMOORING"

**Narration**:
- "The form captures all essential vessel information"
- "We can select multiple purposes for a single vessel operation"
- "The system validates all required fields before submission"

**Action**: Click "Add Vessel"

**Narration**:
- "The vessel is now scheduled and appears on the calendar"
- "Notice how it appears as a colored bar on the selected date"
- "The entry is automatically saved to our Excel database for record-keeping"
- "All authorized users will see this update in real-time"

**Key Points to Highlight**:
- Weather-based scheduling recommendations
- Comprehensive data capture
- Real-time synchronization
- Automatic Excel integration

---

### **5. Viewing Multiple Schedules (1 minute)**

**Action**: If multiple vessels exist on a date, point to the overflow indicator

**Narration**:
- "When multiple vessels are scheduled on the same date, we see an overflow indicator"
- "Clicking the '+2' or similar indicator shows all schedules for that date"
- "This prevents calendar clutter while maintaining full visibility of all operations"

**Action**: Click on the overflow indicator to show the popover

**Narration**:
- "Here we can see all scheduled vessels for this date"
- "We can edit or delete any entry directly from this view"
- "This feature is essential for busy days with multiple operations"

**Key Points to Highlight**:
- Handles multiple schedules efficiently
- Easy access to all operations
- Quick edit/delete capabilities

---

### **6. Editing a Vessel Schedule (1 minute)**

**Action**: Click on an existing vessel bar on the calendar

**Narration**:
- "To edit an existing schedule, I simply click on the vessel bar"
- "The same form opens, but now pre-filled with existing data"
- "I can modify any field as needed"

**Action**: Make a small change (e.g., update the time)

**Narration**:
- "I'll update the time to reflect a schedule change"
- "The system tracks the original vessel name to ensure accurate Excel updates"
- "This is important for maintaining data integrity across multiple edits"

**Action**: Click "Update Vessel"

**Narration**:
- "The update is saved immediately"
- "Both the calendar display and Excel database are updated"
- "A notification is sent to all users about this schedule change"

**Key Points to Highlight**:
- Easy editing process
- Data integrity maintained
- Automatic notifications

---

### **7. Weather Integration and Hover Tooltip (1.5 minutes)**

**Action**: Hover over a date with weather data (hold for 1 second)

**Narration**:
- "One of our key features is weather integration"
- "When I hover over a date, after one second, a detailed weather tooltip appears"
- "This provides AI-powered recommendations based on forecasted conditions"

**Action**: Wait for tooltip to appear

**Narration**:
- "The tooltip shows weather conditions, temperature, and operational recommendations"
- "Green indicates optimal conditions, yellow suggests caution, and red warns of dangerous conditions"
- "This helps schedulers make informed decisions about when to schedule operations"

**Key Points to Highlight**:
- Weather-based decision support
- AI-powered recommendations
- Safety considerations

---

### **8. Weather Warning System (1 minute)**

**Action**: Try to schedule a vessel on a date with poor weather (if available)

**Narration**:
- "If we attempt to schedule a vessel during adverse weather, the system shows a warning"
- "The warning explains the weather conditions and potential risks"
- "We can choose to proceed anyway or cancel and reschedule"

**Action**: Show the weather warning modal (if it appears)

**Narration**:
- "This proactive warning system helps prevent scheduling operations during unsafe conditions"
- "It's an example of how the system optimizes scheduling by considering multiple factors"
- "Safety is always prioritized in maritime operations"

**Key Points to Highlight**:
- Proactive safety warnings
- Weather-based optimization
- Risk mitigation

---

### **9. Crew Availability Table (1 minute)**

**Action**: Click the "Crew Table" button at the bottom

**Narration**:
- "The scheduling module also includes a Crew Availability Table"
- "This allows us to track which workers are available on specific dates"
- "This information integrates with payroll to ensure accurate compensation"

**Action**: Show the table view briefly

**Narration**:
- "We can switch back to the calendar view at any time"
- "Both views provide different perspectives on scheduling data"

**Key Points to Highlight**:
- Multiple view options
- Crew availability tracking
- Integration with payroll

---

### **10. Real-time Updates (30 seconds)**

**Action**: If possible, open the system in another browser/device

**Narration**:
- "One of the system's strengths is real-time synchronization"
- "When I make a change in one browser, it immediately appears in all other connected devices"
- "This ensures all team members always have the latest schedule information"
- "No refresh is needed - updates happen automatically"

**Key Points to Highlight**:
- Real-time synchronization
- Multi-device support
- Automatic updates

---

### **Summary and Transition (30 seconds)**

**Narration**:
- "The Scheduling module successfully optimizes worker scheduling by providing:"
  - "Visual calendar interface for easy schedule management"
  - "Weather integration for safe operation planning"
  - "Real-time synchronization across all devices"
  - "Comprehensive vessel information capture"
  - "Historical tracking and reporting capabilities"

- "All scheduled operations automatically feed into our payroll system, ensuring workers are compensated accurately based on actual operations performed."

- "Now, let me demonstrate the Reports page to show how all this scheduling data is transformed into comprehensive operational reports."

---

## Troubleshooting Tips

1. **If weather data doesn't load**: Mention that weather API requires internet connection, but scheduling works offline
2. **If Excel save fails**: Explain that data is saved locally first, then synced to Excel
3. **If real-time sync doesn't work**: Check Firebase connection, but explain the feature works when connected

---

## Key Features to Emphasize

✅ **Visual Calendar Interface** - Easy to understand and use  
✅ **Weather Integration** - Safety-first scheduling  
✅ **Real-time Synchronization** - Always up-to-date  
✅ **Multi-vessel Support** - Handles busy schedules  
✅ **Excel Integration** - Automatic record-keeping  
✅ **Role-based Access** - Secure and controlled  
✅ **Historical Tracking** - Complete audit trail  

---

*Total Demo Time: Approximately 10-12 minutes*



