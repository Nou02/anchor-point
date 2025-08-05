@echo off
echo ⚓ Starting Anchor Point Application...
echo.

echo 📦 Starting Frontend (React)...
start "Frontend" cmd /k "npm start"

echo.
echo 🐍 Starting Backend (Flask)...
cd backend
start "Backend" cmd /k "python app.py"

echo.
echo ✅ Both servers are starting...
echo.
echo 🌐 Frontend will be available at: http://localhost:3000
echo 🔧 Backend API will be available at: http://localhost:5000
echo.
echo Press any key to exit this window...
pause > nul 