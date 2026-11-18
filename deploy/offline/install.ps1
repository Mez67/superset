# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
<#
.SYNOPSIS
  Installs or updates the offline bundle on a Windows server without internet
  access (Docker Desktop). Run from the bundle folder:
    powershell -ExecutionPolicy Bypass -File .\install.ps1
#>
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Step($text) { Write-Host "`n==> $text" -ForegroundColor Cyan }
function Fail($text) { Write-Host "`nERROR: $text" -ForegroundColor Red; exit 1 }

docker compose version | Out-Null
if ($LASTEXITCODE -ne 0) { Fail "Docker Desktop (with Compose) is not running." }

Step "Checking file integrity (SHA256SUMS.txt)"
foreach ($line in Get-Content "SHA256SUMS.txt") {
    $hash, $file = $line -split "  ", 2
    $actual = (Get-FileHash -Algorithm SHA256 $file).Hash.ToLower()
    if ($actual -ne $hash) { Fail "$file differs from the bundle. Copy the bundle again." }
}
Write-Host "ok"

Step "Loading images (a few minutes)"
docker load -i images.tar
if ($LASTEXITCODE -ne 0) { Fail "docker load failed." }

Step "Checking image IDs"
foreach ($line in Get-Content "IMAGE_IDS.txt") {
    $image, $expected = $line -split " ", 2
    $actual = (docker image inspect --format "{{.Id}}" $image).Trim()
    if ($actual -ne $expected) { Fail "$image has ID $actual, expected $expected" }
    Write-Host "ok  $image"
}

if (-not (Test-Path ".env")) {
    Copy-Item "env.example" ".env"
    Fail "Created .env: set every CHANGE_ME in it, then run install.ps1 again."
}
$envText = Get-Content ".env" -Raw
if ($envText -match "(?m)^[^#\r\n]*CHANGE_ME") { Fail ".env still contains CHANGE_ME values." }
# Keep the image of this bundle, even when .env came from an older one.
$imageLine = (Get-Content "env.example" | Where-Object { $_ -match "^SUPERSET_IMAGE=" })
(Get-Content ".env") -replace "^SUPERSET_IMAGE=.*", $imageLine | Set-Content -Encoding ascii ".env"

Step "Starting (database migrations run first)"
docker compose up -d
if ($LASTEXITCODE -ne 0) { Fail "docker compose up failed." }

$port = ((Get-Content ".env" | Where-Object { $_ -match "^SUPERSET_HOST_PORT=" }) -split "=", 2)[1]
if (-not $port) { $port = "8088" }
Step "Waiting for http://localhost:$port/health"
for ($i = 0; $i -lt 90; $i++) {
    try {
        Invoke-WebRequest -UseBasicParsing "http://localhost:$port/health" | Out-Null
        Step "Ready: http://localhost:$port  (user: admin)"
        exit 0
    }
    catch { Start-Sleep -Seconds 5 }
}
docker compose ps
Fail "Superset did not answer within 7.5 minutes; see: docker compose logs superset-init superset"
