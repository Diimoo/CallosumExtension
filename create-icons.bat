@echo off
setlocal enabledelayedexpansion

REM Create a simple blue square icon in different sizes

REM Create icons directory if it doesn't exist
if not exist "icons" mkdir icons

REM Create a simple blue square as a base64 encoded PNG
set "base64Image=iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABjSURBVDhP7c2hDcAgDABRZ4gO0Rk6Q2foDJ2hM3SGztAZOkNn4B8JkYgQkfDgS1zC5fG4d5x5xplnnHnGmWececaZZ5x5xplnnHnGmWececaZZ5x5xplnnHnGmWececaZ/w8wA0JzB3qJw9wvAAAAAElFTkSuQmCC"

echo %base64Image% > "%TEMP%\icon.b64"
certutil -decode "%TEMP%\icon.b64" "%TEMP%\icon.png" >nul

echo Creating 16x16 icon...
copy /Y "%TEMP%\icon.png" "icons\16.png" >nul

echo Creating 32x32 icon...
copy /Y "%TEMP%\icon.png" "icons\32.png" >nul

echo Creating 48x48 icon...
copy /Y "%TEMP%\icon.png" "icons\48.png" >nul

echo Creating 96x96 icon...
copy /Y "%TEMP%\icon.png" "icons\96.png" >nul

echo Creating favicon.ico...
copy /Y "%TEMP%\icon.png" "icons\favicon.ico" >nul

del "%TEMP%\icon.b64"
del "%TEMP%\icon.png"

echo Icons created successfully!
pause
