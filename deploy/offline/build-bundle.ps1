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
  Builds the offline bundle: the Superset image, PostgreSQL and Redis images,
  security scan reports, compose files and install scripts, with checksums.

.DESCRIPTION
  Run on a machine WITH internet access and Docker Desktop, from anywhere:
    powershell -ExecutionPolicy Bypass -File deploy\offline\build-bundle.ps1
  The bundle is written to dist\danehnama-offline-<tag>. Copy that whole folder
  to the offline server and follow README.fa.md.

.PARAMETER SkipScan
  Skip the vulnerability, secret and malware scans (not recommended).
#>
param(
    [string]$Tag = "",
    [string]$ImageName = "danehnama/superset",
    [string]$PostgresImage = "postgres:17",
    [string]$RedisImage = "redis:7",
    [switch]$SkipScan
)

$ErrorActionPreference = "Stop"
# Scanner images, pinned to exact versions.
$TrivyImage = "aquasec/trivy:0.58.1"
$SyftImage = "anchore/syft:v1.18.1"
$ClamImage = "clamav/clamav:1.4.1"

function Step($text) { Write-Host "`n==> $text" -ForegroundColor Cyan }
function Run {
    param([string]$Exe, [string[]]$Arguments)
    & $Exe @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Exe $($Arguments -join ' ') failed ($LASTEXITCODE)" }
}

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $Root
if (-not $Tag) {
    $Tag = (git rev-parse --short=10 HEAD).Trim()
    if (git status --porcelain) { $Tag = "$Tag-dirty" }
}
$Image = "${ImageName}:$Tag"
$Out = Join-Path $Root "dist\danehnama-offline-$Tag"
if (Test-Path $Out) { Remove-Item -Recurse -Force $Out }
New-Item -ItemType Directory -Force -Path (Join-Path $Out "reports") | Out-Null

Step "Building $Image (frontend, translations, AD and forecasting included)"
$env:DOCKER_BUILDKIT = "1"
Run docker @("build", "--target", "superset", "--build-arg", "BUILD_TRANSLATIONS=true",
    "--label", "org.opencontainers.image.revision=$(git rev-parse HEAD)",
    "-t", $Image, ".")

Step "Checking the image"
Run docker @("run", "--rm", "--entrypoint", "python", $Image, "-c",
    "import ldap, prophet, psycopg2, superset; from superset.brand_theme import BRAND_NAME; print('ok', superset.__file__, BRAND_NAME)")
Run docker @("run", "--rm", "--entrypoint", "sh", $Image, "-c",
    "ls /app/superset/translations/fa/LC_MESSAGES/messages.json /app/superset/translations/fa/LC_MESSAGES/messages.mo /app/superset/static/assets/images/brand/logo-horiz.svg")

Step "Pulling $PostgresImage and $RedisImage"
Run docker @("pull", $PostgresImage)
Run docker @("pull", $RedisImage)
$Images = @($Image, $PostgresImage, $RedisImage)

if (-not $SkipScan) {
    $Reports = Join-Path $Out "reports"
    $Cache = Join-Path $Root "dist\.scan-cache"
    New-Item -ItemType Directory -Force -Path $Cache | Out-Null
    foreach ($img in $Images) {
        $name = ($img -replace "[/:]", "_")
        Step "Trivy: vulnerabilities, secrets and misconfigurations in $img"
        Run docker @("run", "--rm", "-v", "//var/run/docker.sock:/var/run/docker.sock",
            "-v", "${Cache}:/root/.cache", "-v", "${Reports}:/out", $TrivyImage,
            "image", "--scanners", "vuln,secret,misconfig", "--format", "table",
            "--output", "/out/trivy-$name.txt", $img)
        Run docker @("run", "--rm", "-v", "//var/run/docker.sock:/var/run/docker.sock",
            "-v", "${Cache}:/root/.cache", "-v", "${Reports}:/out", $TrivyImage,
            "image", "--scanners", "vuln,secret", "--severity", "CRITICAL",
            "--exit-code", "0", "--format", "json", "--output", "/out/trivy-$name.json", $img)
        Step "Syft: software bill of materials of $img"
        Run docker @("run", "--rm", "-v", "//var/run/docker.sock:/var/run/docker.sock",
            "-v", "${Reports}:/out", $SyftImage, $img, "-o", "spdx-json=/out/sbom-$name.spdx.json")
    }

    Step "ClamAV: malware scan of every file in $Image"
    $cid = (docker create $Image).Trim()
    $volume = "danehnama-scan-$Tag"
    try {
        Run docker @("volume", "create", $volume)
        # Unpack the image's file system into a volume, then scan it.
        $rootfs = Join-Path $Cache "rootfs.tar"
        Run docker @("export", "-o", $rootfs, $cid)
        Run docker @("run", "--rm", "-v", "${volume}:/scan", "-v", "${Cache}:/in:ro",
            "--entrypoint", "tar", $ClamImage, "-xf", "/in/rootfs.tar", "-C", "/scan")
        Remove-Item $rootfs
        Run docker @("run", "--rm", "-v", "${volume}:/scan:ro", "-v", "${Reports}:/out",
            "--entrypoint", "sh", $ClamImage, "-c",
            "freshclam --stdout >/dev/null && clamscan -r -i --max-filesize=500M --max-scansize=2000M /scan > /out/clamav-superset.txt; tail -12 /out/clamav-superset.txt; grep -q '^Infected files: 0$' /out/clamav-superset.txt")
    }
    finally {
        docker rm -f $cid | Out-Null
        docker volume rm -f $volume | Out-Null
    }

    Step "Summary of CRITICAL findings"
    foreach ($img in $Images) {
        $name = ($img -replace "[/:]", "_")
        $json = Get-Content (Join-Path $Reports "trivy-$name.json") -Raw | ConvertFrom-Json
        $vulns = @($json.Results | ForEach-Object { $_.Vulnerabilities } | Where-Object { $_ })
        $secrets = @($json.Results | ForEach-Object { $_.Secrets } | Where-Object { $_ })
        Write-Host ("{0}: {1} critical vulnerabilities, {2} secrets" -f $img, $vulns.Count, $secrets.Count)
    }
}

Step "Saving images to images.tar (this takes a while)"
docker save -o (Join-Path $Out "images.tar") @Images
if ($LASTEXITCODE -ne 0) { throw "docker save failed" }
$Images | ForEach-Object {
    "{0} {1}" -f $_, (docker image inspect --format "{{.Id}}" $_).Trim()
} | Set-Content -Encoding ascii (Join-Path $Out "IMAGE_IDS.txt")

Step "Copying deployment files"
$Bundle = Join-Path $Root "deploy\offline"
Copy-Item (Join-Path $Bundle "docker-compose.yml"), (Join-Path $Bundle "README.fa.md"),
    (Join-Path $Bundle "install.sh"), (Join-Path $Bundle "install.ps1") $Out
New-Item -ItemType Directory -Force -Path (Join-Path $Out "config") | Out-Null
Copy-Item (Join-Path $Root "docker\pythonpath_dev\superset_config.py") (Join-Path $Out "config")
Copy-Item (Join-Path $Bundle "config\superset_config_docker.py") (Join-Path $Out "config")
(Get-Content (Join-Path $Bundle "env.example")) `
    -replace "^SUPERSET_IMAGE=.*", "SUPERSET_IMAGE=$Image" `
    -replace "^POSTGRES_IMAGE=.*", "POSTGRES_IMAGE=$PostgresImage" `
    -replace "^REDIS_IMAGE=.*", "REDIS_IMAGE=$RedisImage" |
    Set-Content -Encoding ascii (Join-Path $Out "env.example")
# Shell scripts must keep LF line endings to run on Linux.
foreach ($f in @("install.sh")) {
    $p = Join-Path $Out $f
    [IO.File]::WriteAllText($p, ([IO.File]::ReadAllText($p) -replace "`r`n", "`n"))
}
git rev-parse HEAD | Set-Content -Encoding ascii (Join-Path $Out "SOURCE_COMMIT.txt")

Step "Writing SHA256SUMS.txt"
Push-Location $Out
Get-ChildItem -Recurse -File | Where-Object { $_.Name -ne "SHA256SUMS.txt" } | ForEach-Object {
    $rel = (Resolve-Path -Relative $_.FullName).Substring(2) -replace "\\", "/"
    "{0}  {1}" -f (Get-FileHash -Algorithm SHA256 $_.FullName).Hash.ToLower(), $rel
} | Set-Content -Encoding ascii "SHA256SUMS.txt"
Pop-Location

Step "Done: $Out"
Write-Host "Copy the whole folder to the offline server and follow README.fa.md."
