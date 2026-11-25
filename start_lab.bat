@echo off
title Virtual Sphere Gap Oil BDV Lab Server
echo ============================================================================
echo   BREAKDOWN VOLTAGE TESTING OF TRANSFORMER OIL USING A VIRTUAL SPHERE GAP
echo ============================================================================
echo Starting local web server on port 8000...
echo.
echo Open your browser and navigate to:
echo   http://localhost:8000
echo.
echo Press Ctrl+C in this window to stop the server.
echo ============================================================================
python -m http.server 8000
pause
