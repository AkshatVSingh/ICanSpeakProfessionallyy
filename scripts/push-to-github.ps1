param(
  [Parameter(Mandatory=$true)]
  [string]$RepoUrl
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "Git is not installed or not available in PATH. Install Git for Windows first."
}

if (-not (Test-Path ".\index.html")) {
  throw "Run this script from the project root folder that contains index.html."
}

if (-not (Test-Path ".\.git")) {
  git init
}

git branch -M main
git add .

$hasCommit = $true
try {
  git rev-parse --verify HEAD *> $null
} catch {
  $hasCommit = $false
}

$status = git status --porcelain
if ($status) {
  git commit -m "Build local professional speak converter"
} elseif (-not $hasCommit) {
  git commit --allow-empty -m "Initial commit"
} else {
  Write-Host "No file changes to commit."
}

$originExists = git remote | Select-String -Pattern "^origin$" -Quiet
if ($originExists) {
  git remote set-url origin $RepoUrl
} else {
  git remote add origin $RepoUrl
}

git push -u origin main
Write-Host "Pushed to GitHub successfully."
