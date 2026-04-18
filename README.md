# AnchorPoint - Maritime Management System

A modern maritime management application featuring a beautiful homepage with a shipping/port theme, built with React.js frontend and Flask backend.

## Features

- **Beautiful Landing Page**: Dark maritime theme with centered branding and click-to-enter functionality
- **Interactive Homepage**: Recreates the provided image with a maritime theme and port background
- **Functional Calendar**: Interactive scheduling calendar with month navigation and date selection
- **Modern UI/UX**: Responsive design with smooth animations and transitions
- **Navigation Menu**: Sidebar navigation with Home, Scheduling, Reports, Payroll, and Weather options
- **Authentication**: Secure user authentication and management
- **Gemini AI Integration**: Advanced AI-powered insights for operational data and performance trends
- **Flask Backend API**: RESTful API for user management and data operations
- **Dashboard**: Post-login dashboard with shipping management features
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices

## Tech Stack

### Frontend
- **React.js 18**: Modern React with hooks and functional components
- **CSS3**: Custom styling with animations and responsive design
- **Axios**: HTTP client for API communication
- **Recharts**: Data visualization for analytics

### Backend
- **Flask**: Python web framework for API development
- **Flask-CORS**: Cross-origin resource sharing support
- **Openpyxl**: Excel file processing

## Project Structure

```
AnchorPoint/
├── frontend/             # React frontend
│   ├── public/           # Static assets
│   ├── src/              # Source code
│   │   ├── components/   # React components
│   │   ├── services/     # API services
│   │   └── assets/       # Images and media
│   └── package.json      # Frontend dependencies
├── backend/              # Flask backend
│   ├── app.py            # Main Flask application
│   ├── config.py         # Configuration settings
│   ├── models.py         # Data models
│   └── requirements.txt  # Python dependencies
└── README.md             # Project documentation
```

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- Python (v3.8 or higher)

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # Mac/Linux:
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the Flask server:
   ```bash
   python app.py
   ```

The backend API will be available at `http://localhost:5000`

### 2. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

The frontend will be available at `http://localhost:3000`

## Usage

1. **Landing Page**: The application starts with a beautiful landing page featuring the AnchorPoint branding.
2. **Click to Enter**: Users can click anywhere on the landing page to enter the main application.
3. **Homepage**: After clicking, users see the interactive homepage with maritime management interface.
4. **Navigation**: Users can navigate between Home, Scheduling, Reports, Payroll, and Weather sections.
5. **Analytics**: The dashboard includes shipment tracking, order management, and operational analytics.

## API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/register` - User registration

### Data Operations
- `GET /api/ships` - Get ship schedules
- `GET /api/crew` - Get crew assignments
- `GET /api/excel/read` - Read operational data from Excel
- `POST /api/excel/append` - Add new operational entries

### Health Check
- `GET /api/health` - API health check
