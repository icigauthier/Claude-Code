@echo off
title CRM iciGauthier
rem --- Rend Node accessible meme s'il n'est pas dans le PATH ---
set "PATH=C:\Users\Ant_G\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.18.0-win-x64;%PATH%"
cd /d "%~dp0"
echo.
echo   Demarrage du CRM iciGauthier...
echo   (Le navigateur va s'ouvrir tout seul dans quelques secondes.)
echo   Pour arreter le CRM : ferme cette fenetre.
echo.
rem --- Ouvre le navigateur apres 3 secondes, le temps que le serveur demarre ---
start "" powershell -WindowStyle Hidden -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:4321'"
node server.js
pause
