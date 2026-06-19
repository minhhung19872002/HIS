# =============================================================================
# Tái sinh manifest.js — quét mọi ảnh trong các thư mục con của evidence/
# (bỏ qua data/ và assets/). Chạy: powershell -ExecutionPolicy Bypass -File gen-manifest.ps1
# =============================================================================
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$exts = @('.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp')
$skip = @('data', 'assets')

$imgs = Get-ChildItem -Path $root -Recurse -File |
    Where-Object { $exts -contains $_.Extension.ToLower() } |
    ForEach-Object { $_.FullName.Substring($root.Length + 1).Replace('\', '/') } |
    Where-Object { ($_ -match '/') -and (-not ($skip -contains ($_ -split '/')[0])) } |
    Sort-Object

$body = ($imgs | ForEach-Object { '  "' + $_ + '"' }) -join ",`n"
$content = "/* AUTO-GENERATED bằng gen-manifest.ps1 — KHÔNG sửa tay */`r`nwindow.TP_IMAGES = [`r`n$body`r`n];`r`n"
Set-Content -Path (Join-Path $root 'manifest.js') -Value $content -Encoding UTF8
Write-Host "manifest.js: $($imgs.Count) anh"
