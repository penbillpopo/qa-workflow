# QA 環境一鍵安裝（Windows 10 / 11）
# 使用方式：在檔案總管對 setup-windows.cmd 按兩下。可以重複執行，已經裝好的會自動跳過。

$ErrorActionPreference = 'Continue'
Set-Location -Path $PSScriptRoot
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Say($text, $color = 'White') { Write-Host $text -ForegroundColor $color }
function Ok($text)   { Say "  [完成] $text" 'Green' }
function Warn($text) { Say "  [注意] $text" 'Yellow' }
function Fail($text) { Say "  [失敗] $text" 'Red' }

function Refresh-Path {
  $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $user    = [Environment]::GetEnvironmentVariable('Path', 'User')
  $env:Path = "$machine;$user;$env:USERPROFILE\.local\bin"
}
function Has($cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }

function Install-WithWinget($id, $name, $check) {
  if (& $check) { Ok "$name 已經安裝"; return }
  if (-not (Has 'winget')) {
    Fail "找不到 winget，無法自動安裝 $name。請到 Microsoft Store 安裝「應用程式安裝程式」(App Installer) 後再執行一次。"
    return
  }
  Say "  正在安裝 $name …"
  winget install --id $id -e --silent --accept-source-agreements --accept-package-agreements | Out-Host
  Refresh-Path
  if (& $check) { Ok "$name 安裝完成" } else { Warn "$name 可能已安裝但還沒生效。請關掉這個視窗，再對 setup-windows.cmd 按兩下一次。" }
}

Say ''
Say '==============================================' 'Cyan'
Say '  QA 環境一鍵安裝' 'Cyan'
Say '==============================================' 'Cyan'
Say "專案位置：$PSScriptRoot"
if ($PSScriptRoot -match '[^\x00-\x7F]' -or $PSScriptRoot -match '\s') {
  Warn '專案路徑含有中文或空白，部分工具可能出錯。建議把資料夾搬到 C:\QA-workflow 再執行。'
}
if ($PSScriptRoot -match 'OneDrive') {
  Warn '專案放在 OneDrive 裡，同步可能鎖住檔案。建議搬到 C:\QA-workflow 再執行。'
}

Refresh-Path

Say ''
Say '[1/5] 安裝必要軟體' 'Cyan'
Install-WithWinget 'OpenJS.NodeJS.LTS' 'Node.js' { Has 'node' }
Install-WithWinget 'Git.Git'           'Git'     { Has 'git' }
Install-WithWinget 'Google.Chrome'     'Google Chrome' {
  (Test-Path "$env:ProgramFiles\Google\Chrome\Application\chrome.exe") -or
  (Test-Path "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe") -or
  (Test-Path "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe")
}

Say ''
Say '[2/5] 安裝 Claude Code' 'Cyan'
if (Has 'claude') {
  Ok 'Claude Code 已經安裝'
} else {
  Say '  正在安裝 Claude Code …'
  try { Invoke-RestMethod https://claude.ai/install.ps1 | Invoke-Expression } catch { Fail "安裝程式出錯：$($_.Exception.Message)" }
  Refresh-Path
  if (Has 'claude') { Ok 'Claude Code 安裝完成' }
  else { Warn 'Claude Code 已安裝但還沒生效。請關掉這個視窗，再對 setup-windows.cmd 按兩下一次。' }
}

Say ''
Say '[3/5] 安裝專案套件' 'Cyan'
if (Has 'npm') {
  npm install --no-fund --no-audit | Out-Host
  if (Test-Path 'node_modules\playwright') { Ok '專案套件安裝完成' } else { Fail '專案套件沒有裝好，請把上面的訊息截圖給主管。' }
} else {
  Fail '找不到 npm（Node.js 還沒生效）。請關掉視窗後重新執行一次。'
}

Say ''
Say '[4/5] 設定帳號密碼（.env）' 'Cyan'
if (Test-Path '.env.txt') { Rename-Item '.env.txt' '.env'; Warn '已把 .env.txt 改名為 .env' }
if (-not (Test-Path '.env')) {
  Copy-Item '.env.example' '.env'
  Ok '已建立 .env，接下來會用記事本打開'
}
$envText = Get-Content '.env' -Raw -Encoding UTF8
$required = 'TESTRAIL_USERNAME','TESTRAIL_API_KEY','GOMONEY_ADMIN_USERNAME','GOMONEY_ADMIN_PASSWORD','PLATFORM_ADMIN_USERNAME','PLATFORM_ADMIN_PASSWORD','OTP_CODE'
$empty = $required | Where-Object { $envText -notmatch "(?m)^$_=\S+" }
if ($empty) {
  Warn ("這些欄位還沒填：" + ($empty -join '、'))
  Say  '  請在記事本填好、按 Ctrl+S 存檔、關掉記事本，安裝會自動繼續。' 'Yellow'
  Start-Process notepad.exe -ArgumentList '.env' -Wait
  $envText = Get-Content '.env' -Raw -Encoding UTF8
  $empty = $required | Where-Object { $envText -notmatch "(?m)^$_=\S+" }
}
if ($empty) { Warn ("還是有欄位沒填：" + ($empty -join '、') + "。填好後再執行一次這個安裝。") } else { Ok '.env 都填好了' }

Say ''
Say '[5/5] 設定 Claude Code 連線工具' 'Cyan'
if ((Has 'claude') -and (Has 'node') -and -not $empty) {
  node scripts/setup-mcp.mjs | Out-Host
} else {
  Warn '前面還有步驟沒完成，先跳過。全部完成後再執行一次這個安裝。'
}

Say ''
Say '==============================================' 'Cyan'
Say '  最後檢查' 'Cyan'
Say '==============================================' 'Cyan'
if (Has 'node') { node scripts/doctor.mjs | Out-Host }

Say ''
Say '接下來：' 'Cyan'
Say '  1. 關掉這個視窗。'
Say '  2. 在專案資料夾的空白處按住 Shift 再按右鍵，選「在終端機中開啟」。'
Say '  3. 輸入 claude 按 Enter。第一次會打開瀏覽器請你登入 claude.ai。'
Say '  4. 進入 Claude 後輸入 /qa-help，它會帶你檢查和處理剩下的問題。'
Say ''
Read-Host '按 Enter 關閉視窗'
