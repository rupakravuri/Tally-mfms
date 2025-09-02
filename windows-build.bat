@echo off
echo ========================================
echo Tally Field Extractor - Windows Build
echo ========================================
echo.

echo Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Building application...
npm run build
if %errorlevel% neq 0 (
    echo ERROR: Failed to build application
    pause
    exit /b 1
)

echo.
echo Creating Windows executable...
npm run dist
if %errorlevel% neq 0 (
    echo ERROR: Failed to create executable
    pause
    exit /b 1
)

echo.
echo ========================================
echo BUILD SUCCESSFUL!
echo ========================================
echo.
echo Your Windows executable is ready in the 'release' folder!
echo Double-click the .exe file to run the application.
echo.
pause