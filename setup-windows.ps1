# PyroNav Windows Setup Script - Member 2
# This script checks dependencies and guides you through setup

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  PyroNav Complete Setup - Member 2" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = $PSScriptRoot
$backendPath = Join-Path $projectRoot "backend"

# Function to check if command exists
function Test-Command {
    param($Command)
    try {
        if (Get-Command $Command -ErrorAction Stop) { return $true }
    } catch { return $false }
}

# Function to check Docker Desktop is running
function Test-DockerRunning {
    try {
        $result = docker ps 2>&1
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

Write-Host "STEP 1: Checking Prerequisites..." -ForegroundColor Yellow
Write-Host ""

# Check Python
Write-Host "Checking Python..." -NoNewline
if (Test-Command python) {
    $pythonVersion = python --version
    Write-Host " ✓ Found: $pythonVersion" -ForegroundColor Green
} else {
    Write-Host " ✗ Not found!" -ForegroundColor Red
    Write-Host "  Please install Python 3.10+ from python.org" -ForegroundColor Red
    exit 1
}

# Check Node.js
Write-Host "Checking Node.js..." -NoNewline
if (Test-Command node) {
    $nodeVersion = node --version
    Write-Host " ✓ Found: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host " ✗ Not found!" -ForegroundColor Red
    Write-Host "  Please install Node.js from nodejs.org" -ForegroundColor Red
    exit 1
}

# Check Docker
Write-Host "Checking Docker..." -NoNewline
if (Test-Command docker) {
    $dockerVersion = docker --version
    Write-Host " ✓ Found: $dockerVersion" -ForegroundColor Green
    
    # Check if Docker is running
    Write-Host "Checking Docker is running..." -NoNewline
    if (Test-DockerRunning) {
        Write-Host " ✓ Docker Desktop is running" -ForegroundColor Green
    } else {
        Write-Host " ✗ Docker Desktop is not running!" -ForegroundColor Red
        Write-Host "  Please start Docker Desktop application" -ForegroundColor Yellow
        Write-Host "  Waiting for Docker to start..."
        
        # Wait for Docker
        $maxWait = 60
        $waited = 0
        while (-not (Test-DockerRunning) -and $waited -lt $maxWait) {
            Start-Sleep -Seconds 2
            $waited += 2
            Write-Host "." -NoNewline
        }
        
        if (Test-DockerRunning) {
            Write-Host " ✓ Docker started!" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "  Docker did not start. Please start it manually and re-run this script." -ForegroundColor Red
            exit 1
        }
    }
} else {
    Write-Host " ✗ Not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "DOCKER NOT INSTALLED!" -ForegroundColor Red
    Write-Host "Docker is required to run PostgreSQL and MQTT broker." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "OPTIONS:" -ForegroundColor Cyan
    Write-Host "1. Install Docker Desktop (Recommended):" -ForegroundColor White
    Write-Host "   - Download from: https://www.docker.com/products/docker-desktop/" -ForegroundColor White
    Write-Host "   - Install and restart computer" -ForegroundColor White
    Write-Host "   - Re-run this script" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Use Demo Mode (Work without database):" -ForegroundColor White
    Write-Host "   - Run: cd backend; .\start_api_demo.bat" -ForegroundColor White
    Write-Host "   - Install Docker later" -ForegroundColor White
    Write-Host ""
    
    $choice = Read-Host "Press Enter to open Docker download page, or Ctrl+C to exit"
    Start-Process "https://www.docker.com/products/docker-desktop/"
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "STEP 2: Installing Python Dependencies" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $backendPath

Write-Host "Installing backend requirements..." -ForegroundColor Yellow
pip install -r requirements.txt --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to install backend dependencies" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "STEP 3: Starting Docker Services" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $projectRoot

Write-Host "Starting PostgreSQL database and API..." -ForegroundColor Yellow
docker compose up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Docker services started" -ForegroundColor Green
    Write-Host "  Waiting for database to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15
} else {
    Write-Host "✗ Failed to start Docker services" -ForegroundColor Red
    Write-Host "  Check docker-compose.yml for errors" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Checking service status..." -ForegroundColor Yellow
docker compose ps

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "STEP 4: Starting MQTT Broker" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$mqttPath = Join-Path $backendPath "mqtt"
if (Test-Path $mqttPath) {
    Set-Location $mqttPath
    
    Write-Host "Starting MQTT broker (Mosquitto)..." -ForegroundColor Yellow
    docker compose up -d
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ MQTT broker started" -ForegroundColor Green
    } else {
        Write-Host "⚠ MQTT broker may already be running" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠ MQTT directory not found - skipping" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "STEP 5: Testing Decision Engine" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $backendPath

Write-Host "Running Decision Engine test suite..." -ForegroundColor Yellow
python test_decision_engine.py

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ All Decision Engine tests passed!" -ForegroundColor Green
} else {
    Write-Host "⚠ Some tests failed - but system may still work" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "STEP 6: Installing Frontend Dependencies" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Main frontend
$frontendPath = Join-Path $projectRoot "frontend"
if (Test-Path $frontendPath) {
    Set-Location $frontendPath
    
    if (Test-Path "package.json") {
        Write-Host "Installing main frontend dependencies..." -ForegroundColor Yellow
        npm install
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Frontend dependencies installed" -ForegroundColor Green
        }
    }
}

# Hospital 3D
$hospital3dPath = Join-Path $projectRoot "hospital-3d"
if (Test-Path $hospital3dPath) {
    Set-Location $hospital3dPath
    
    if (Test-Path "package.json") {
        Write-Host "Installing Hospital 3D dependencies..." -ForegroundColor Yellow
        npm install
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Hospital 3D dependencies installed" -ForegroundColor Green
        }
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "SETUP COMPLETE!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "✅ Services Running:" -ForegroundColor Green
Write-Host "  • PostgreSQL database: localhost:5432" -ForegroundColor White
Write-Host "  • FastAPI backend: http://localhost:8000" -ForegroundColor White
Write-Host "  • MQTT broker: localhost:1883" -ForegroundColor White
Write-Host ""

Write-Host "🚀 Next Steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Start Hospital 3D Simulator:" -ForegroundColor White
Write-Host "   cd hospital-3d" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host "   → Opens at http://localhost:5174" -ForegroundColor Gray
Write-Host ""

Write-Host "2. Start Frontend Dashboard:" -ForegroundColor White
Write-Host "   cd frontend" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host "   → Opens at http://localhost:5173" -ForegroundColor Gray
Write-Host ""

Write-Host "3. Test Your Decision Engine:" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   python test_decision_engine.py" -ForegroundColor Gray
Write-Host ""

Write-Host "4. View API Documentation:" -ForegroundColor White
Write-Host "   http://localhost:8000/docs" -ForegroundColor Gray
Write-Host ""

Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "  • Complete guide: COMPLETE-SETUP-GUIDE.md" -ForegroundColor White
Write-Host "  • Quick commands: .member-2-personal\QUICK-COMMANDS.md" -ForegroundColor White
Write-Host "  • Your work summary: .member-2-personal\START-HERE.md" -ForegroundColor White
Write-Host ""

Write-Host "🛠️  Useful Commands:" -ForegroundColor Cyan
Write-Host "  • View logs: docker compose logs -f" -ForegroundColor White
Write-Host "  • Restart services: docker compose restart" -ForegroundColor White
Write-Host "  • Stop all: docker compose down" -ForegroundColor White
Write-Host ""

Set-Location $projectRoot

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Happy coding! 🎉" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
