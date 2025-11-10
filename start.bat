@echo off
echo ⚓ Starting Anchor Point Application...
echo.

echo 🐍 Starting Backend (Flask)...
start "Backend Server" cmd /k "cd /d ""%~dp0backend"" && python app.py"

echo.
echo Waiting 3 seconds for backend to initialize...
timeout /t 3 /nobreak > nul

echo 📦 Starting Frontend (React)...
start "Frontend" cmd /k "cd /d ""%~dp0backend"" && npm start"

echo.
echo ✅ Both servers are starting...
echo.
echo 🌐 Frontend will be available at: http://localhost:3000
echo 🔧 Backend API will be available at: http://localhost:5000
echo.
echo Press any key to exit this window...
pause > nul 