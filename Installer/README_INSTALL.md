# AnchorPoint - Installation Guide

This guide will help you set up the AnchorPoint Maritime Management System on your local machine.

## Prerequisites
Before you begin, ensure you have the following installed:
1. **Python 3.8 or higher**: [Download here](https://www.python.org/downloads/)
2. **Node.js v16 or higher**: [Download here](https://nodejs.org/)

## Automatic Installation (Windows)
1. Open the project folder.
2. Navigate to the `Installer` directory.
3. Double-click `setup.bat`.
4. The script will:
   - Create a Python virtual environment.
   - Install backend dependencies.
   - Install frontend dependencies.
   - Create a `start_app.bat` shortcut in the root directory.

## Manual Installation

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Frontend Setup
```bash
cd frontend
npm install
```

## Running the Application
Once installation is complete, you can start both the frontend and backend using:

### Using the shortcut (Windows):
Double-click `start_app.bat` in the project root.

### Manually:
1. Start Backend:
   ```bash
   cd backend
   venv\Scripts\activate
   python app.py
   ```
2. Start Frontend:
   ```bash
   cd frontend
   npm start
   ```

## Login Credentials
Refer to `Installer\CREDENTIALS.txt` for demo login information.

## Database Design
Refer to `Installer\DATABASE_DESIGN.md` for information about the data structure.
