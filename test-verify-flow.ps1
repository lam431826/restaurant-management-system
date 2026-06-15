#!/usr/bin/env pwsh
# Test script: UN_ACTIVE → ACTIVE via OTP flow for TanTDHE191221
# Usage: .\test-verify-flow.ps1 [-Otp <6-digit-code>]
# On first run, omit -Otp. The script will print the masked email and pause so you
# can retrieve the OTP from MailHog (http://localhost:8025) or Gmail, then re-run
# with -Otp 123456.

param(
    [string]$BaseUrl = "http://localhost:8386",
    [string]$Otp = ""
)

$ErrorActionPreference = "Stop"
$headers = @{ "Content-Type" = "application/json" }

# ── Step 1: Login ─────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "=== STEP 1: Login (expect requiresVerification=true) ===" -ForegroundColor Cyan

$loginBody = @{ username = "TanTDHE191221"; password = "Qwedsa@1" } | ConvertTo-Json
$loginResp = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/auth/login" `
    -Headers $headers -Body $loginBody

if (-not $loginResp.requiresVerification) {
    Write-Host "ERROR: requiresVerification is not true. Response:" -ForegroundColor Red
    $loginResp | ConvertTo-Json | Write-Host
    exit 1
}

$verifyToken = $loginResp.verifyToken
Write-Host "OK  requiresVerification = $($loginResp.requiresVerification)" -ForegroundColor Green
Write-Host "OK  verifyToken          = $verifyToken" -ForegroundColor Green

# ── Step 2: POST /verify/info (sends OTP email) ───────────────────────────────
Write-Host ""
Write-Host "=== STEP 2: POST /api/auth/verify/info (send OTP email) ===" -ForegroundColor Cyan

$infoHeaders = $headers + @{ "X-Verify-Token" = $verifyToken }
$infoResp = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/auth/verify/info" `
    -Headers $infoHeaders

$maskedEmail = $infoResp.data.maskedEmail
$expiresAt   = $infoResp.data.expiresAt
Write-Host "OK  OTP sent to : $maskedEmail" -ForegroundColor Green
Write-Host "OK  OTP expires : $expiresAt" -ForegroundColor Green

if ($Otp -eq "") {
    Write-Host ""
    Write-Host ">>> Check MailHog at http://localhost:8025 (or Gmail inbox for tranduytanrobin@gmail.com)" -ForegroundColor Yellow
    Write-Host ">>> Then re-run with:  .\test-verify-flow.ps1 -Otp <6-digit-code>" -ForegroundColor Yellow
    Write-Host ">>> verifyToken (keep this):  $verifyToken" -ForegroundColor Yellow
    exit 0
}

# ── Step 3: POST /verify/otp ──────────────────────────────────────────────────
Write-Host ""
Write-Host "=== STEP 3: POST /api/auth/verify/otp (OTP=$Otp) ===" -ForegroundColor Cyan

$otpBody = @{ otp = $Otp } | ConvertTo-Json
$otpHeaders = $headers + @{ "X-Verify-Token" = $verifyToken }
$otpResp = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/auth/verify/otp" `
    -Headers $otpHeaders -Body $otpBody

if (-not $otpResp.accessToken) {
    Write-Host "ERROR: No accessToken in response." -ForegroundColor Red
    $otpResp | ConvertTo-Json | Write-Host
    exit 1
}

Write-Host "OK  accessToken  = $($otpResp.accessToken.Substring(0,20))..." -ForegroundColor Green
Write-Host "OK  refreshToken = $($otpResp.refreshToken.Substring(0,20))..." -ForegroundColor Green
Write-Host "OK  expiresIn    = $($otpResp.expiresIn) s" -ForegroundColor Green
Write-Host "OK  user.role    = $($otpResp.user.role)" -ForegroundColor Green

# ── Step 4: Verify account is now ACTIVE via /api/users (admin token) ─────────
Write-Host ""
Write-Host "=== STEP 4: Verify account is ACTIVE (login again) ===" -ForegroundColor Cyan

$login2Resp = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/auth/login" `
    -Headers $headers -Body $loginBody

if ($login2Resp.accessToken) {
    Write-Host "OK  Second login succeeded → account is ACTIVE" -ForegroundColor Green
} else {
    Write-Host "WARN  Unexpected response on second login:" -ForegroundColor Yellow
    $login2Resp | ConvertTo-Json | Write-Host
}

Write-Host ""
Write-Host "=== ALL STEPS PASSED ===" -ForegroundColor Green
