# Step-by-Step Guide: How to Run the Application

## Prerequisites Check

### Step 1: Verify Required Software
Before starting, ensure you have the following installed:

1. **Node.js** (version 16 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **npm** (comes with Node.js)
   - Verify installation: `npm --version`

3. **Python** (version 3.8 or higher)
   - Download from: https://python.org/
   - Verify installation: `python --version`

4. **pip** (comes with Python)
   - Verify installation: `pip --version`

## Firebase Setup

### Step 2: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter a project name (e.g., "shipping-login-app")
4. Enable Google Analytics (optional)
5. Click "Create project"

### Step 3: Enable Authentication
1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Email/Password" provider
5. Click "Save"

### Step 4: Create Firestore Database
1. In your Firebase project, go to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location (choose closest to your region)
5. Click "Done"

### Step 5: Get Firebase Configuration
1. In your Firebase project, click the gear icon (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon (</>)
5. Register your app with a nickname (e.g., "shipping-app")
6. Copy the Firebase configuration object

### Step 6: Update Firebase Configuration
1. Open `src/firebase/config.js`
2. Replace the placeholder configuration with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

### Step 7: Generate Service Account Key
1. In Firebase project settings, go to "Service accounts" tab
2. Click "Generate new private key"
3. Download the JSON file
4. Rename it to `firebase-service-account-key.json`
5. Place it in the `backend/` directory

## Application Setup

### Step 8: Install Frontend Dependencies
1. Open Command Prompt/Terminal
2. Navigate to the project directory: `cd "path/to/Final Project"`
3. Navigate to the frontend directory: `cd src`
4. Install dependencies: `npm install`
5. Wait for installation to complete

### Step 9: Install Backend Dependencies
1. Open a new Command Prompt/Terminal
2. Navigate to the project directory: `cd "path/to/Final Project"`
3. Navigate to the backend directory: `cd backend`
4. Create a virtual environment: `python -m venv venv`
5. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - Mac/Linux: `source venv/bin/activate`
6. Install dependencies: `pip install -r requirements.txt`
7. Wait for installation to complete

## Running the Application

### Step 10: Start the Backend Server
1. Ensure you're in the backend directory with virtual environment activated
2. Run the Flask server: `python app.py`
3. You should see output like:
   ```
   * Running on http://127.0.0.1:5000
   * Debug mode: on
   ```
4. Keep this terminal window open

### Step 11: Start the Frontend Server
1. Open a new Command Prompt/Terminal
2. Navigate to the frontend directory: `cd "path/to/Final Project/src"`
3. Start the React development server: `npm start`
4. Wait for the browser to open automatically
5. If browser doesn't open, go to: http://localhost:3000

## Alternative: Using Automated Scripts

### Option A: Using setup.js (One-time setup)
1. Open Command Prompt/Terminal
2. Navigate to project directory: `cd "path/to/Final Project"`
3. Run: `node setup.js`
4. Follow the prompts for Firebase configuration

### Option B: Using start.bat (Windows only)
1. Double-click `start.bat` in the project directory
2. This will automatically start both servers in separate windows

## Testing the Application

### Step 12: Test Login Functionality
1. The application should open to the login screen
2. Create a test account:
   - Click "Sign Up" or go to Firebase Console → Authentication → Users → Add User
   - Enter email and password
3. Try logging in with the created credentials
4. You should be redirected to the dashboard after successful login

### Step 13: Test API Endpoints
1. Backend should be running on http://localhost:5000
2. Test health endpoint: http://localhost:5000/api/health
3. Should return: `{"message": "Backend is running!", "status": "success"}`

## Troubleshooting

### Common Issues and Solutions

**Issue 1: "Module not found" errors**
- Solution: Run `npm install` in the frontend directory
- Solution: Run `pip install -r requirements.txt` in the backend directory

**Issue 2: Firebase configuration errors**
- Solution: Verify your Firebase config in `src/firebase/config.js`
- Solution: Check that Authentication and Firestore are enabled in Firebase Console

**Issue 3: CORS errors**
- Solution: Ensure backend is running on port 5000
- Solution: Check that Flask-CORS is properly installed

**Issue 4: Port already in use**
- Solution: Kill processes using ports 3000 or 5000
- Windows: `netstat -ano | findstr :3000` then `taskkill /PID <PID>`
- Mac/Linux: `lsof -ti:3000 | xargs kill -9`

**Issue 5: Virtual environment not activated**
- Solution: Ensure you see `(venv)` at the start of your command prompt
- Solution: Run `venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Mac/Linux)

## Stopping the Application

### Step 14: Shutdown
1. In the frontend terminal, press `Ctrl + C`
2. In the backend terminal, press `Ctrl + C`
3. Deactivate virtual environment: `deactivate`

## Development Workflow

### For Future Development:
1. Always activate the virtual environment before working on backend
2. Keep both servers running during development
3. Changes to frontend code will auto-reload
4. Changes to backend code require server restart

### File Structure Reminder:
```
Final Project/
├── src/                    # React frontend
│   ├── components/        # React components
│   ├── firebase/         # Firebase configuration
│   └── services/         # API services
├── backend/              # Flask backend
│   ├── app.py           # Main Flask application
│   ├── config.py        # Configuration settings
│   └── requirements.txt  # Python dependencies
├── README.md            # Project documentation
├── setup.js             # Automated setup script
└── start.bat           # Windows startup script
```

## Summary

The application consists of:
- **Frontend**: React.js running on http://localhost:3000
- **Backend**: Flask API running on http://localhost:5000
- **Database**: Firebase Firestore and Authentication
- **Authentication**: Firebase client-side auth with backend user management

Both servers must be running simultaneously for the application to work properly. 