$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
New-Item -ItemType Directory -Force .tools/spacetime | Out-Null

# Portable tools only. No PATH/profile, execution policy, or system installation changes.
$nodeVersion = '24.22.2'
$nodeArchive = ".tools/node-v$nodeVersion.zip"
if (-not (Test-Path ".tools/node-v$nodeVersion-win-x64/node.exe")) {
    Invoke-WebRequest -UseBasicParsing "https://nodejs.org/dist/v$nodeVersion/node-v$nodeVersion-win-x64.zip" -OutFile $nodeArchive
    $checksums = (Invoke-WebRequest -UseBasicParsing "https://nodejs.org/dist/v$nodeVersion/SHASUMS256.txt").Content
    $expected = (($checksums -split "`n" | Where-Object { $_ -match "  node-v$nodeVersion-win-x64.zip\s*$" }) -split ' ')[0]
    $actual = (Get-FileHash -LiteralPath $nodeArchive -Algorithm SHA256).Hash.ToLower()
    if ($actual -ne $expected) { throw 'Node checksum mismatch.' }
    Expand-Archive -LiteralPath $nodeArchive -DestinationPath .tools -Force
}
if (-not (Test-Path '.tools/spacetime/spacetimedb-cli.exe')) {
    Invoke-WebRequest -UseBasicParsing 'https://github.com/clockworklabs/SpacetimeDB/releases/download/v2.14.1/spacetime-x86_64-pc-windows-msvc.zip' -OutFile .tools/spacetime-2.14.1.zip
    Expand-Archive -LiteralPath .tools/spacetime-2.14.1.zip -DestinationPath .tools/spacetime -Force
}
$env:PATH = (Join-Path (Get-Location) ".tools/node-v$nodeVersion-win-x64") + ';' + $env:PATH
npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency install failed.' }
npm.cmd ci --prefix spacetimedb
if ($LASTEXITCODE -ne 0) { throw 'Backend dependency install failed.' }
Write-Output 'Local tools and dependencies ready. Follow README.md to start the backend and frontend.'
