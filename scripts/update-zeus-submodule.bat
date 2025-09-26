@echo off
setlocal enabledelayedexpansion
cd /d %~dp0\..

if not exist src\zeus-site\.git (
  echo Initializing submodules...
  git submodule update --init --recursive
)

echo Ensuring sparse-checkout is configured for zeus/ ...
git -C src/zeus-site sparse-checkout set zeus/
git -C src/zeus-site sparse-checkout list

echo Pulling latest from tracked branch...
git submodule update --remote --merge

echo Done. Contents available under src\zeus-site\zeus
endlocal
