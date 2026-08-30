$ErrorActionPreference = "Stop"

$port = 4000
$envPath = Join-Path (Join-Path $PSScriptRoot "..") ".env"

if (Test-Path $envPath) {
  $portLine = Get-Content $envPath | Where-Object { $_ -match '^PORT=\d+$' } | Select-Object -First 1
  if ($portLine) {
    $parsedPort = [int]($portLine -replace '^PORT=', '')
    if ($parsedPort -ge 1 -and $parsedPort -le 65535) {
      $port = $parsedPort
    }
  }
}

$base = "http://localhost:$port"
$appRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$serverProcess = $null
$serverStartedBySmoke = $false
$serverStdout = Join-Path ([System.IO.Path]::GetTempPath()) "atlasx-smoke-$PID.stdout.log"
$serverStderr = Join-Path ([System.IO.Path]::GetTempPath()) "atlasx-smoke-$PID.stderr.log"

function Get-AppHealth {
  try {
    return Invoke-RestMethod -Method Get -Uri "$base/api/health" -TimeoutSec 2 -ErrorAction Stop
  } catch {
    return $null
  }
}

function Start-AppIfNeeded {
  $health = Get-AppHealth
  if ($health) {
    return $health
  }

  $script:serverProcess = Start-Process -FilePath "node" `
    -ArgumentList "src/server.js" `
    -WorkingDirectory $appRoot `
    -RedirectStandardOutput $serverStdout `
    -RedirectStandardError $serverStderr `
    -PassThru
  $script:serverStartedBySmoke = $true

  for ($attempt = 0; $attempt -lt 40; $attempt += 1) {
    $health = Get-AppHealth
    if ($health) {
      return $health
    }

    if ($serverProcess.HasExited) {
      $stdout = if (Test-Path $serverStdout) { Get-Content $serverStdout -Raw } else { "" }
      $stderr = if (Test-Path $serverStderr) { Get-Content $serverStderr -Raw } else { "" }
      throw "Application exited during startup.`n$stdout`n$stderr"
    }

    Start-Sleep -Milliseconds 250
  }

  throw "Application did not become ready at $base within 10 seconds."
}

function Invoke-JsonPost {
  param(
    [string]$Url,
    [hashtable]$Body,
    [hashtable]$Headers = @{}
  )

  return Invoke-RestMethod -Method Post -Uri $Url -Headers $Headers -ContentType "application/json" -Body ($Body | ConvertTo-Json)
}

try {
  $health = Start-AppIfNeeded
  if (-not $health.ok) {
    throw "Health check failed"
  }

  $user = "smoke" + (Get-Random -Minimum 10000 -Maximum 99999)
  $email = "$user@example.com"
  $password = "Passw0rd!"

  $reg = Invoke-JsonPost -Url "$base/api/auth/register" -Body @{
    username = $user
    email = $email
    password = $password
  }

  if (-not $reg.token) {
    throw "Register did not return token"
  }

  $headers = @{ Authorization = "Bearer $($reg.token)" }

  $setup = Invoke-RestMethod -Method Get -Uri "$base/api/setup/status" -Headers $headers
  if (-not $setup) {
    throw "Setup status unavailable"
  }

  $import = Invoke-JsonPost -Url "$base/api/bsc/import-address" -Headers $headers -Body @{
    address = "0x0000000000000000000000000000000000001004"
  }

  $wallet = Invoke-RestMethod -Method Get -Uri "$base/api/bsc/wallet" -Headers $headers
  $sync = Invoke-RestMethod -Method Post -Uri "$base/api/bsc/sync-bnb-balance" -Headers $headers

  [PSCustomObject]@{
    healthOk = $health.ok
    user = $user
    setupBsc = $setup.gateways.bsc.status
    setupSolana = $setup.gateways.solana.status
    imported = $import.address
    walletBlock = $wallet.blockNumber
    syncMessage = $sync.message
  } | Format-List

  exit 0
} catch {
  Write-Error $_
  exit 1
} finally {
  if ($serverStartedBySmoke -and $serverProcess -and -not $serverProcess.HasExited) {
    Stop-Process -Id $serverProcess.Id -Force
    $serverProcess.WaitForExit()
  }
  Remove-Item $serverStdout, $serverStderr -Force -ErrorAction SilentlyContinue
}
