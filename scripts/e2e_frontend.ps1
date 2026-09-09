$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Dist = Join-Path $Root "dist"
$TempDist = Join-Path ([System.IO.Path]::GetTempPath()) "coopgest-e2e-dist"

Push-Location $Root
try {
    npm.cmd run build --silent
    if ($LASTEXITCODE -ne 0) {
        throw "Frontend build failed."
    }

    if (Test-Path -LiteralPath $TempDist) {
        Remove-Item -LiteralPath $TempDist -Recurse -Force
    }
    New-Item -ItemType Directory -Path $TempDist | Out-Null
    Copy-Item -Path (Join-Path $Dist "*") -Destination $TempDist -Recurse -Force

    $env:E2E_DIST_DIR = $TempDist
    node scripts/e2e_static_server.mjs
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
