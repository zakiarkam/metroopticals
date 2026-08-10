@echo off
REM Jenkins Setup Script for Windows
REM This script provides setup instructions for Jenkins

echo.
echo ================================
echo Jenkins Setup for Metro Opticals
echo ================================
echo.

REM Check if Jenkins is accessible
curl -s http://localhost:8080 >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Jenkins is not running on localhost:8080
    echo Please start Jenkins and try again
    pause
    exit /b 1
)

echo [OK] Jenkins is running
echo.

echo ================================================
echo Required Jenkins Plugins
echo ================================================
echo.
echo Please install these plugins in Jenkins:
echo 1. Docker Pipeline
echo 2. Docker Plugin
echo 3. Git Plugin
echo 4. SSH Agent Plugin
echo 5. Pipeline Stage View
echo 6. Blue Ocean
echo 7. Slack Notification (optional)
echo 8. Email Extension Plugin
echo 9. Credentials Binding Plugin
echo.
echo Install at: http://localhost:8080/pluginManager/available
echo.
pause

echo.
echo ================================================
echo Credential Setup Instructions
echo ================================================
echo.
echo Create the following credentials in Jenkins:
echo.
echo 1. Docker Hub Credentials
echo    - ID: dockerhub-credentials
echo    - Type: Username with password
echo.
echo 2. GitHub Credentials
echo    - ID: github-credentials
echo    - Type: Username with password
echo.
echo 3. Environment File
echo    - ID: metroopticals-env-file
echo    - Type: Secret file
echo    - File: Upload .env.jenkins
echo.
echo 4. SSH Deploy Credentials
echo    - ID: ssh-deploy-credentials
echo    - Type: SSH Username with private key
echo.
echo URL: http://localhost:8080/credentials/
echo.
pause

echo.
echo ================================================
echo Pipeline Job Setup
echo ================================================
echo.
echo Create a new Pipeline job:
echo 1. Go to: http://localhost:8080/view/all/newJob
echo 2. Enter name: metroopticals-pipeline
echo 3. Select: Pipeline
echo 4. Click OK
echo.
echo Configure the pipeline:
echo 1. Definition: Pipeline script from SCM
echo 2. SCM: Git
echo 3. Repository URL: https://github.com/Darts-Ecommerce/metroopticals.git
echo 4. Branch: */main
echo 5. Script Path: Jenkinsfile
echo 6. Save
echo.
pause

echo.
echo ================================
echo Setup Instructions Complete!
echo ================================
echo.
echo Next steps:
echo 1. Complete the credential setup in Jenkins
echo 2. Create the pipeline job
echo 3. Run your first build
echo.
pause
