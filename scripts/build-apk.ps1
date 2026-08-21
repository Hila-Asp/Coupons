#Requires -Version 5.1
$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$StagingRoot = 'C:\Users\Hila\voucher-apk-build'
$DistDir = Join-Path $RepoRoot 'dist-apk'
$OutApkName = 'VoucherManager.apk'
$GradleApkRel = Join-Path 'android' (Join-Path 'app' (Join-Path 'build' (Join-Path 'outputs' (Join-Path 'apk' (Join-Path 'release' 'app-release.apk')))))

function Write-Step {
  param([Parameter(Mandatory = $true)][string]$Message)
  Write-Host ''
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Test-HostileGradlePath {
  param([Parameter(Mandatory = $true)][string]$Path)
  return ($Path -match '[^\x00-\x7F]') -or ($Path -match ' ')
}

function Assert-Command {
  param([Parameter(Mandatory = $true)][string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $Name"
  }
}

function Invoke-Checked {
  param(
    [Parameter(Mandatory = $true)][scriptblock]$Command,
    [Parameter(Mandatory = $true)][string]$FailMessage
  )
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$FailMessage (exit $LASTEXITCODE)"
  }
}

function Invoke-RobocopyDir {
  param(
    [Parameter(Mandatory = $true)][string]$From,
    [Parameter(Mandatory = $true)][string]$To,
    # Deletes files missing from the source. Vite renames bundles on every
    # build, so a plain copy would keep stale ones and ship them in the APK.
    [switch]$Mirror
  )
  New-Item -ItemType Directory -Force -Path $To | Out-Null
  $mode = if ($Mirror) { '/MIR' } else { '/E' }
  & robocopy $From $To $mode /NFL /NDL /NJH /NJS /NC /NS /NP `
    /XD .gradle build captures .idea .cxx .externalNativeBuild `
    /XF *.apk *.aab *.iml local.properties
  if ($LASTEXITCODE -ge 8) {
    throw "robocopy failed ($LASTEXITCODE): $From -> $To"
  }
  $global:LASTEXITCODE = 0
}

function Sync-StagingFromRepo {
  Write-Step "Syncing needed files to $StagingRoot"
  New-Item -ItemType Directory -Force -Path $StagingRoot | Out-Null

  foreach ($file in @('package.json', 'package-lock.json', 'capacitor.config.ts')) {
    $src = Join-Path $RepoRoot $file
    if (Test-Path -LiteralPath $src) {
      Copy-Item -LiteralPath $src -Destination (Join-Path $StagingRoot $file) -Force
    }
  }

  foreach ($dir in @('node_modules', 'scripts')) {
    $src = Join-Path $RepoRoot $dir
    if (Test-Path -LiteralPath $src) {
      Invoke-RobocopyDir -From $src -To (Join-Path $StagingRoot $dir)
    }
  }

  $distSrc = Join-Path $RepoRoot 'dist'
  if (Test-Path -LiteralPath $distSrc) {
    Invoke-RobocopyDir -From $distSrc -To (Join-Path $StagingRoot 'dist') -Mirror
  }

  $androidSrc = Join-Path $RepoRoot 'android'
  if (Test-Path -LiteralPath $androidSrc) {
    Invoke-RobocopyDir -From $androidSrc -To (Join-Path $StagingRoot 'android')
  }

  foreach ($signFile in @('release.keystore', 'keystore.properties')) {
    $src = Join-Path $RepoRoot (Join-Path 'android' $signFile)
    if (Test-Path -LiteralPath $src) {
      Copy-Item -LiteralPath $src -Destination (Join-Path $StagingRoot (Join-Path 'android' $signFile)) -Force
    }
  }
}

function Copy-AndroidSourceBack {
  $src = Join-Path $StagingRoot 'android'
  $dst = Join-Path $RepoRoot 'android'
  if ((Test-Path -LiteralPath $src) -and -not (Test-Path -LiteralPath $dst)) {
    Write-Step 'Copying generated android/ source back to the repo'
    Invoke-RobocopyDir -From $src -To $dst
  }
}

function Ensure-AndroidPlatform {
  param([Parameter(Mandatory = $true)][string]$Root)
  $androidDir = Join-Path $Root 'android'
  if (Test-Path -LiteralPath $androidDir) {
    Write-Host 'android/ already present'
    return
  }
  Write-Step 'Adding Capacitor Android platform'
  Push-Location -LiteralPath $Root
  try {
    Invoke-Checked { npx --yes cap add android } 'npx cap add android failed'
  } finally {
    Pop-Location
  }
}

function Ensure-ShareIntent {
  param([Parameter(Mandatory = $true)][string]$Root)
  Write-Step 'Ensuring SEND text/* share intent'
  $script = Join-Path $PSScriptRoot 'ensure-share-intent.mjs'
  Invoke-Checked { node $script $Root } 'ensure-share-intent failed'
}

function Clear-WebAssets {
  param([Parameter(Mandatory = $true)][string]$Root)
  $public = Join-Path $Root 'android/app/src/main/assets/public'
  if (Test-Path -LiteralPath $public) {
    Write-Step 'Clearing previously synced web assets'
    Remove-Item -LiteralPath $public -Recurse -Force
  }
}

function Sync-Capacitor {
  param([Parameter(Mandatory = $true)][string]$Root)
  Write-Step 'Syncing Capacitor'
  Clear-WebAssets -Root $Root
  Push-Location -LiteralPath $Root
  try {
    Invoke-Checked { npx --yes cap sync } 'npx cap sync failed'
  } finally {
    Pop-Location
  }
}

function Invoke-AssembleRelease {
  param([Parameter(Mandatory = $true)][string]$Root)
  Write-Step "Assembling release APK in $Root"
  $wrapper = Join-Path $Root (Join-Path 'android' 'gradlew.bat')
  if (-not (Test-Path -LiteralPath $wrapper)) {
    throw "Gradle wrapper not found: $wrapper"
  }
  Push-Location -LiteralPath (Join-Path $Root 'android')
  try {
    & .\gradlew.bat assembleRelease --no-daemon
    return ($LASTEXITCODE -eq 0)
  } finally {
    Pop-Location
  }
}

function Copy-ApkOut {
  param([Parameter(Mandatory = $true)][string]$BuildRoot)
  $src = Join-Path $BuildRoot $GradleApkRel
  if (-not (Test-Path -LiteralPath $src)) {
    throw "APK not found: $src"
  }
  New-Item -ItemType Directory -Force -Path $DistDir | Out-Null
  $dest = Join-Path $DistDir $OutApkName
  Copy-Item -LiteralPath $src -Destination $dest -Force
  Write-Host "Copied APK to $dest"
}

Assert-Command -Name node
Assert-Command -Name npm
Assert-Command -Name npx

if (-not $env:ANDROID_HOME -and -not $env:ANDROID_SDK_ROOT) {
  throw 'ANDROID_HOME or ANDROID_SDK_ROOT must be set'
}

if (-not $env:JAVA_HOME) {
  Write-Warning 'JAVA_HOME is not set. JDK 17+ must still be on PATH.'
}

Write-Step 'Generating icons'
Set-Location -LiteralPath $RepoRoot
Invoke-Checked { npm run icons } 'npm run icons failed'

Write-Step 'Building native web assets'
Invoke-Checked { npm run build:native } 'npm run build:native failed'

$useStaging = Test-HostileGradlePath -Path $RepoRoot
$buildRoot = $RepoRoot

if ($useStaging) {
  Write-Host "Repo path has spaces or non-ASCII characters. Gradle will run at $StagingRoot"
  Sync-StagingFromRepo
  $buildRoot = $StagingRoot
}

Ensure-AndroidPlatform -Root $buildRoot
Ensure-ShareIntent -Root $buildRoot
Sync-Capacitor -Root $buildRoot

$assembled = $false
try {
  $assembled = Invoke-AssembleRelease -Root $buildRoot
} catch {
  Write-Warning $_.Exception.Message
  $assembled = $false
}

if (-not $assembled -and -not $useStaging) {
  Write-Warning "Gradle failed in the repo path. Retrying at $StagingRoot"
  Sync-StagingFromRepo
  $buildRoot = $StagingRoot
  Ensure-AndroidPlatform -Root $buildRoot
  Ensure-ShareIntent -Root $buildRoot
  Sync-Capacitor -Root $buildRoot
  $assembled = Invoke-AssembleRelease -Root $buildRoot
}

if (-not $assembled) {
  throw 'gradlew assembleRelease failed'
}

if ($useStaging -or ($buildRoot -eq $StagingRoot)) {
  Copy-AndroidSourceBack
}

Copy-ApkOut -BuildRoot $buildRoot
Write-Host 'Done.'
