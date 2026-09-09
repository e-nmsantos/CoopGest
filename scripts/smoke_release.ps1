param(
    [Parameter(Mandatory = $true)]
    [string]$ZipPath
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $ZipPath)) {
    throw "ZIP nao encontrado: $ZipPath"
}

$ZipParent = Split-Path -Parent (Resolve-Path -LiteralPath $ZipPath)
$SmokeDir = Join-Path $ZipParent "_smoke_release"
if (Test-Path -LiteralPath $SmokeDir) {
    Remove-Item -LiteralPath $SmokeDir -Recurse -Force
}
New-Item -ItemType Directory -Path $SmokeDir | Out-Null

Expand-Archive -LiteralPath $ZipPath -DestinationPath $SmokeDir -Force
$ReleaseRoot = $SmokeDir
if (-not (Test-Path -LiteralPath (Join-Path $ReleaseRoot "app.py"))) {
    $Extracted = Get-ChildItem -LiteralPath $SmokeDir -Directory | Select-Object -First 1
    if (-not $Extracted) {
        throw "ZIP sem app.py nem pasta raiz extraida."
    }
    $ReleaseRoot = $Extracted.FullName
}

$RequiredFiles = @(
    "app.py",
    "wsgi.py",
    "requirements.txt",
    "run.bat",
    "arrancar.bat",
    "coopgest_windows.py",
    "INSTRUCOES.md",
    "checksums.txt",
    "dist\index.html",
    "coopgest\application.py"
)

foreach ($RelativePath in $RequiredFiles) {
    $FullPath = Join-Path $ReleaseRoot $RelativePath
    if (-not (Test-Path -LiteralPath $FullPath)) {
        throw "Ficheiro obrigatorio em falta no release: $RelativePath"
    }
}

py -3.13 -m compileall -q `
    (Join-Path $ReleaseRoot "app.py") `
    (Join-Path $ReleaseRoot "wsgi.py") `
    (Join-Path $ReleaseRoot "coopgest")

if ($LASTEXITCODE -ne 0) {
    throw "compileall falhou no release extraido."
}

$ZipName = Split-Path -Leaf $ZipPath
$ZipHashFile = "$ZipPath.sha256"
if (-not (Test-Path -LiteralPath $ZipHashFile)) {
    throw "Ficheiro de checksum externo em falta: $ZipHashFile"
}

$ExpectedZipHash = (Get-Content -LiteralPath $ZipHashFile -Raw).Trim()
$ActualZipHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $ZipPath).Hash.ToLowerInvariant()
if ($ExpectedZipHash -notmatch [regex]::Escape($ActualZipHash) -or $ExpectedZipHash -notmatch [regex]::Escape($ZipName)) {
    throw "Checksum externo do ZIP invalido."
}

Remove-Item -LiteralPath $SmokeDir -Recurse -Force
Write-Host "Smoke release OK: $ZipName"
