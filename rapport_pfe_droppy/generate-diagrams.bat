@echo off
title Generation des diagrammes PlantUML
echo ========================================================
echo   Generation des diagrammes UML pour le rapport PFE
echo ========================================================
echo.

set SCRIPT_DIR=%~dp0
set DIAGRAMS_DIR=%SCRIPT_DIR%diagrams
set IMAGES_DIR=%SCRIPT_DIR%images
set PLANTUML_JAR=%SCRIPT_DIR%plantuml.jar

if not exist "%IMAGES_DIR%" mkdir "%IMAGES_DIR%"

if not exist "%PLANTUML_JAR%" (
    echo [INFO] Telechargement de plantuml.jar...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/plantuml/plantuml/releases/download/v1.2024.8/plantuml-1.2024.8.jar' -OutFile '%PLANTUML_JAR%'"
    if errorlevel 1 (
        echo [ERREUR] Impossible de telecharger plantuml.jar
        echo Installez Java JDK et telechargez manuellement plantuml.jar
        pause
        exit /b 1
    )
)

where java >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Java JDK non trouve. Installez Java pour generer les diagrammes.
    pause
    exit /b 1
)

echo [OK] Generation des PNG depuis diagrams/ vers images/...
java -jar "%PLANTUML_JAR%" -tpng -o "%IMAGES_DIR%" "%DIAGRAMS_DIR%\*.puml"

if errorlevel 1 (
    echo [ERREUR] Echec de la generation
    pause
    exit /b 1
)

echo.
echo [OK] Diagrammes generes dans images/
dir /b "%IMAGES_DIR%\*.png" 2>nul
echo.
echo Vous pouvez maintenant compiler main.tex avec pdflatex ou Overleaf.
pause
