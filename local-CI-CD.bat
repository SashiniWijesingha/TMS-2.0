@echo off
echo ==================================================
echo Simulating CI/CD Build Process Locally
echo ==================================================

echo.
echo [1/7] Cleaning up old build artifacts...
if exist "backend\dist" rmdir /s /q "backend\dist"
if exist "backend\frontend" rmdir /s /q "backend\frontend"
if exist "frontend\dist" rmdir /s /q "frontend\dist"

echo.
echo [2/7] Setting up Environment Variables...
if exist ".env.backend" (
    echo Copying .env.backend to backend/.env
    copy /Y ".env.backend" "backend\.env"
) else if exist ".env" (
    echo Copying root .env to backend/.env
    copy /Y ".env" "backend\.env"
)

if exist ".env.frontend" (
    echo Copying .env.frontend to frontend/.env
    copy /Y ".env.frontend" "frontend\.env"
)

echo.
echo [3/7] Installing Backend Dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo Backend install failed!
    exit /b %errorlevel%
)

echo.
echo [4/7] Building Backend...
call npm run build
if %errorlevel% neq 0 (
    echo Backend build failed!
    exit /b %errorlevel%
)
cd ..

echo.
echo [5/7] Installing Frontend Dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo Frontend install failed!
    exit /b %errorlevel%
)

echo.
echo [6/7] Building Frontend...
call npm run build
if %errorlevel% neq 0 (
    echo Frontend build failed!
    exit /b %errorlevel%
)
cd ..

echo.
echo [7/7] Copying Frontend build to Backend...
if not exist "backend\frontend" mkdir "backend\frontend"
xcopy /E /I /Y "frontend\dist\*" "backend\frontend\"
if %errorlevel% neq 0 (
    echo Failed to copy frontend artifacts!
    exit /b %errorlevel%
)

echo.
echo ==================================================
echo Build Successful! Artifacts are ready in the 'backend' folder.
echo You can test the production build by running:
echo cd backend ^&^& node dist/index.js
echo ==================================================
