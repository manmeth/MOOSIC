$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendRoot = Join-Path $repoRoot 'Frontend\MOOSIC-visual-refresh-final\MOOSIC-visual-refresh'
$backendRoot = Join-Path $repoRoot 'moosic-backend'

Push-Location $frontendRoot
try {
    pnpm --filter @workspace/moodsic-app run build
    if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
} finally {
    Pop-Location
}

Push-Location $backendRoot
try {
    & '.\.venv\Scripts\python.exe' -m uvicorn main:app --host 127.0.0.1 --port 8000
} finally {
    Pop-Location
}
