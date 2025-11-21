# AnchorPoint Demo Script - Reports Page
## Capstone 2 Defense Demonstration

---

## Pre-Demo Setup (Before Presentation)

1. **Ensure System is Running**:
   - Backend Flask server is running on `http://localhost:5000`
   - Frontend React app is running on `http://localhost:3000`
   - User is logged in with appropriate permissions
   - Excel file with vessel data is accessible

2. **Prepare Test Data**:
   - Ensure the Excel file has vessel entries from different dates
   - Have data spanning multiple years if possible
   - Include various vessel types (Local and Foreign)

---

## Demo Script

### **Introduction (30 seconds)**

"Now I'll demonstrate the Reports module, which provides comprehensive historical records and analytics of all maritime operations. This module transforms scheduling data into actionable insights and maintains complete operational history."

---

### **1. Reports Page Overview (1 minute)**

**Action**: Navigate to the Reports page

**Narration**:
- "The Reports page displays a comprehensive overview of all past maritime operations"
- "All data is pulled directly from our Excel database, ensuring accuracy and completeness"
- "The page shows vessel operations, schedules, and transaction history in a structured, searchable format"

**Key Points to Highlight**:
- Clean, professional interface
- Comprehensive data display
- Direct Excel integration

---

### **2. Data Loading and Display (1 minute)**

**Action**: Point to the loading state (if visible) or the data table

**Narration**:
- "The system automatically loads all vessel data from the Excel file"
- "You can see the loading indicator while data is being fetched"
- "Once loaded, all transactions are displayed in a sortable, filterable table"
- "The data is sorted by date, with the most recent operations appearing first"

**Action**: Scroll through the table if there are many entries

**Narration**:
- "The table is fully scrollable and handles large datasets efficiently"
- "Each row represents a completed vessel operation with all relevant details"

**Key Points to Highlight**:
- Automatic data loading
- Efficient handling of large datasets
- Chronological organization

---

### **3. Table Structure and Columns (1.5 minutes)**

**Action**: Point to each column header

**Narration**:
- "The reports table includes all critical operational information:"
  - "**Date**: When the operation occurred"
  - "**Time**: Scheduled start time"
  - "**Time Finished**: Operation completion time"
  - "**Vessel**: Name of the vessel"
  - "**Voyage**: Voyage identification number"
  - "**Purpose**: Type of operation (Mooring, Unmooring, Shifting)"
  - "**Control ID**: Control number for tracking"

**Action**: Point to a specific row

**Narration**:
- "Each entry provides complete information about the operation"
- "This data is essential for auditing, analysis, and historical reference"
- "Notice how the data is formatted consistently for easy reading"

**Key Points to Highlight**:
- Comprehensive data fields
- Consistent formatting
- Complete operational records

---

### **4. Year Filter (1.5 minutes)**

**Action**: Click on the "Select Year" dropdown

**Narration**:
- "One of the most powerful features is the year filter"
- "The system automatically extracts all available years from the data"
- "This allows us to view operations from specific time periods"

**Action**: Select a year from the dropdown

**Narration**:
- "When I select a year, the table immediately filters to show only operations from that year"
- "Notice how the record count updates to reflect the filtered results"
- "This is particularly useful for annual reporting and analysis"

**Action**: Select "All Years" to show all data again

**Narration**:
- "We can easily return to viewing all data by selecting 'All Years'"
- "The filter is instant and doesn't require page refresh"

**Key Points to Highlight**:
- Quick year-based filtering
- Automatic year extraction
- Instant filtering without refresh

---

### **5. Advanced Filters (2 minutes)**

**Action**: Click the "Advanced Filters" button

**Narration**:
- "For more detailed analysis, we have advanced filtering options"
- "These filters allow us to search and filter by multiple criteria simultaneously"

**Action**: Expand the advanced filters section

**Narration**:
- "The advanced filters include:"
  - "**Vessel Name**: Search for specific vessels"
  - "**Voyage ID**: Filter by voyage number"
  - "**Control ID**: Search by control number"
  - "**Date From/To**: Filter by date range"

**Action**: Enter a vessel name in the Vessel Name filter

**Narration**:
- "I'll search for a specific vessel name"
- "The table immediately updates to show only matching entries"
- "The search is case-insensitive and supports partial matching"

**Action**: Add a date range filter

**Narration**:
- "I can also filter by date range to see operations within a specific period"
- "This is useful for monthly or quarterly reporting"
- "Multiple filters work together - I can combine vessel name, date range, and other criteria"

**Key Points to Highlight**:
- Multiple filter options
- Real-time filtering
- Combined filter support
- Case-insensitive search

---

### **6. Clear All Filters (30 seconds)**

**Action**: Click the "Clear All" button

**Narration**:
- "The 'Clear All' button instantly resets all filters"
- "This returns us to viewing all records"
- "It's a quick way to start a new search or analysis"

**Key Points to Highlight**:
- Quick filter reset
- Easy navigation

---

### **7. Record Count Display (30 seconds)**

**Action**: Point to the record count display

**Narration**:
- "The system always shows how many records are currently displayed"
- "This updates dynamically as we apply filters"
- "It helps us understand the scope of our filtered data"
- "For example, it shows 'Showing 15 of 150 records for 2024'"

**Key Points to Highlight**:
- Dynamic record counting
- Filter feedback
- Data scope visibility

---

### **8. Refresh Data (1 minute)**

**Action**: Click the "Refresh Data" button

**Narration**:
- "The 'Refresh Data' button reloads all data from the Excel file"
- "This ensures we're always viewing the most current information"
- "It's particularly useful after new operations have been added to the schedule"

**Action**: Show the loading state during refresh

**Narration**:
- "During refresh, the system reads the latest Excel data"
- "This ensures our reports are always synchronized with the scheduling system"
- "The refresh is automatic in the background, but manual refresh is available when needed"

**Key Points to Highlight**:
- Manual data refresh
- Synchronization with Excel
- Always current data

---

### **9. Data Export and Analysis (1 minute)**

**Action**: Point to the table structure

**Narration**:
- "The data displayed here can be used for various purposes:"
  - "**Operational Analysis**: Understanding patterns in vessel operations"
  - "**Performance Tracking**: Monitoring operation completion times"
  - "**Historical Reference**: Maintaining complete operational records"
  - "**Audit Trail**: Providing documentation for compliance and auditing"

**Action**: Scroll through different entries

**Narration**:
- "The comprehensive data allows management to:"
  - "Identify peak operation periods"
  - "Analyze vessel type distribution"
  - "Track operational efficiency"
  - "Generate reports for stakeholders"

**Key Points to Highlight**:
- Multiple use cases
- Business intelligence
- Compliance support
- Strategic planning

---

### **10. Integration with Other Modules (1 minute)**

**Action**: Navigate back to Scheduling briefly, then return to Reports

**Narration**:
- "The Reports module is fully integrated with the Scheduling system"
- "When a vessel operation is scheduled and completed, it automatically appears in these reports"
- "The data flows seamlessly from scheduling to reporting"
- "This integration ensures data consistency and eliminates manual data entry"

**Action**: Show a recently scheduled vessel (if available)

**Narration**:
- "For example, if I schedule a vessel today, once it's completed, it will appear in these reports"
- "The system maintains a complete lifecycle of each operation:"
  - "Scheduled in the Scheduling module"
  - "Tracked during operations"
  - "Recorded in the Reports module"
  - "Used for payroll calculations"

**Key Points to Highlight**:
- Seamless module integration
- Complete data lifecycle
- Automatic data flow
- No manual entry required

---

### **11. Empty State Handling (30 seconds)**

**Action**: If no data exists, show the empty state (or mention it)

**Narration**:
- "When no data is available, the system displays a helpful empty state"
- "This guides users and explains what data will appear here"
- "The system gracefully handles all data scenarios"

**Key Points to Highlight**:
- User-friendly empty states
- Graceful error handling

---

### **Summary and Key Benefits (1 minute)**

**Narration**:
- "The Reports module provides comprehensive operational oversight by:"
  - "**Maintaining Complete History**: All operations are recorded and accessible"
  - "**Powerful Filtering**: Find specific operations quickly using multiple criteria"
  - "**Real-time Data**: Always synchronized with the latest scheduling data"
  - "**Analytics Support**: Data structure supports business intelligence and analysis"
  - "**Audit Compliance**: Complete records for regulatory and compliance requirements"

- "This module addresses the 'overseeing' aspect of our first objective by providing complete visibility into all maritime operations"
- "Managers can quickly assess operational patterns, identify trends, and make data-driven decisions"

- "The integration with Scheduling ensures that all operations are automatically tracked, and the integration with Payroll ensures accurate compensation based on actual operations performed"

---

## Troubleshooting Tips

1. **If data doesn't load**: 
   - Check Excel file path in backend
   - Verify backend API is running
   - Check browser console for errors

2. **If filters don't work**:
   - Ensure data is fully loaded first
   - Check that filter values match data format

3. **If year filter is empty**:
   - Verify Excel file has date data
   - Check date format in Excel file

---

## Key Features to Emphasize

✅ **Comprehensive Data Display** - All operational records in one place  
✅ **Year-based Filtering** - Quick access to specific time periods  
✅ **Advanced Search** - Multiple filter criteria  
✅ **Real-time Synchronization** - Always current data  
✅ **Excel Integration** - Direct database connection  
✅ **Complete History** - Full audit trail  
✅ **Analytics Ready** - Data structure supports analysis  
✅ **User-friendly Interface** - Easy to navigate and use  

---

## Connection to Objective 1

**Emphasize how Reports supports Objective 1**:

- **Overseeing Operations**: The Reports module provides complete oversight of all maritime operations, allowing managers to monitor, analyze, and track every aspect of vessel operations.

- **Integration with Scheduling**: Reports automatically capture all scheduling data, ensuring that the optimization of worker scheduling is fully documented and trackable.

- **Support for Payroll**: The operational data in Reports feeds into payroll calculations, ensuring workers are compensated based on actual operations performed.

- **Inventory Insights**: While inventory is managed separately, Reports can help identify patterns that affect inventory usage and planning.

---

*Total Demo Time: Approximately 10-12 minutes*



