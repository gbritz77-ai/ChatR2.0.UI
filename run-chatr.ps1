# PowerShell script to build and run ChatR2.0 backend and frontend

# --- BACKEND ---
cd ../ChatR2.0.BE

dotnet restore
dotnet build
dotnet ef database update
Start-Process powershell -ArgumentList 'dotnet run' -NoNewWindow

# --- FRONTEND ---
cd ../ChatR2.0.UI

# (Optional) Create .env file for frontend API URL
$envFile = ".env"
if (!(Test-Path $envFile)) {
    "VITE_API_URL=https://localhost:7227" | Out-File -Encoding utf8 $envFile
}

npm install
Start-Process powershell -ArgumentList 'npm run dev' -NoNewWindow
