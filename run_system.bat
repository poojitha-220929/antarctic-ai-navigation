@echo off
echo ==================================================================
echo   LAUNCHING ANTARCTIC AI NAVIGATION DECISION SUPPORT SYSTEM
echo ==================================================================
echo.
echo Starting Backend API Server (FastAPI on port 8000)...
start "Antarctic AI Backend" cmd /k "python start_backend.py"

timeout /t 3 /nobreak > nul

echo Starting Frontend Web Client (React + Vite on port 5173)...
cd frontend
start "Antarctic AI Frontend" cmd /k "npm run dev"

echo.
echo ==================================================================
echo System starting up!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo ==================================================================
echo.
timeout /t 2 /nobreak > nul
start http://localhost:5173

