@echo off
REM Check if Python is installed
python --version >nul 2>&1
IF ERRORLEVEL 1 (
    echo [ERROR] Python is not installed or not found in PATH.
    echo Please install Python 3 from https://www.python.org/downloads/
    exit /b 1
)

echo [OK] Python detected.
echo Starting local server on port 8000...
python -m http.server 8000
