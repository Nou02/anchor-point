@echo off
setlocal

echo ======================================================
echo   AnchorPoint - Maritime Management System Installer
echo ======================================================
echo.

:: Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python 3.8 or higher.
    pause
    exit /b 1
)

:: Check for Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js v16 or higher.
    pause
    exit /b 1
)

echo [1/3] Setting up Backend...
cd ..\backend
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)
echo Installing backend dependencies...
call venv\Scripts\activate
pip install -r requirements.txt
echo.

echo [2/3] Setting up Frontend...
cd ..\frontend
echo Installing frontend dependencies (this may take a few minutes)...
call npm install
echo.

echo [3/3] Creating Start Script...
cd ..
echo @echo off > start_app.bat
echo echo Starting AnchorPoint Application... >> start_app.bat
echo cd frontend >> start_app.bat
echo start npm run start:dev >> start_app.bat
echo.

echo ======================================================
echo   Installation Complete!
echo ======================================================
echo.
echo To start the application, run 'start_app.bat' in the project root.
echo.
echo Please refer to 'Installer\README_INSTALL.md' for more details.
echo.
pause
