<#
.SYNOPSIS
  Sửa mojibake (double-encoding UTF-8 đọc nhầm CP1252) trên DB HIS — bảng Roles + Permissions.

.DESCRIPTION
  Nguyên nhân: dữ liệu được seed bằng SQL script chạy qua sqlcmd sai codepage, byte UTF-8 của
  N'...' bị diễn giải thành CP1252 trước khi insert. Kết quả: "Quản trị hệ thống" hiển thị
  "Quản trị hệ thống". Cột là NVARCHAR Unicode nên DB lưu được tiếng Việt — chỉ data hỏng.

  Reversal: UTF8.GetString( CP1252.GetBytes(value) ). Đã verify khớp 100% trên dữ liệu prod.

  AN TOÀN:
    - Dry-run mặc định (BEGIN TRAN -> preview -> ROLLBACK). Phải truyền -Commit mới ghi thật.
    - Bộ lọc round-trip nghiêm ngặt (EncoderExceptionFallback): chỉ sửa giá trị mojibake
      byte-stable; tiếng Việt đã đúng / ASCII thuần sẽ bị BỎ QUA, không bao giờ ghi đè.
    - Idempotent: chạy lại lần 2 không đổi gì (dòng đã sạch không match).
    - Tham số NVARCHAR (không phụ thuộc codepage của file/console).

.PARAMETER ConnectionString
  Chuỗi kết nối ADO.NET đầy đủ. Mặc định trỏ Cloud SQL Auth Proxy ở localhost,1433.

.PARAMETER Commit
  Bật để THỰC SỰ ghi (COMMIT). Không bật = dry-run (chỉ in preview, rollback).

.EXAMPLE
  # 1) Dry-run (xem trước, không ghi) — qua Auth Proxy, thay <user>/<pass> bằng cred prod:
  .\fix_prod_encoding.ps1 -ConnectionString "Server=127.0.0.1,1433;Database=HIS;User Id=<user>;Password=<pass>;TrustServerCertificate=True;Encrypt=False"

  # 2) Ghi thật:
  .\fix_prod_encoding.ps1 -ConnectionString "Server=127.0.0.1,1433;Database=HIS;User Id=<user>;Password=<pass>;TrustServerCertificate=True;Encrypt=False" -Commit
#>
param(
  [string]$ConnectionString = "Server=127.0.0.1,1433;Database=HIS;User Id=sa;Password=CHANGE_ME;TrustServerCertificate=True;Encrypt=False;Connect Timeout=30",
  [switch]$Commit
)

$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}  # preview tiếng Việt đọc được

# Encodings nghiêm ngặt: ném lỗi khi gặp ký tự không map được -> tránh best-fit làm sai.
$enc1252 = [System.Text.Encoding]::GetEncoding(1252,
  [System.Text.EncoderExceptionFallback]::new(),
  [System.Text.DecoderExceptionFallback]::new())
$encUtf8 = [System.Text.UTF8Encoding]::new($false, $true)  # throwOnInvalidBytes = true

# Trả về chuỗi đã sửa nếu value là mojibake byte-stable; ngược lại trả $null (bỏ qua).
function Get-Fixed([string]$v) {
  if ([string]::IsNullOrEmpty($v)) { return $null }
  try {
    $rev  = $encUtf8.GetString( $enc1252.GetBytes($v) )           # đảo mojibake
    if ($rev -ceq $v) { return $null }                            # không đổi -> không phải mojibake
    $back = $enc1252.GetString( $encUtf8.GetBytes($rev) )         # tái-hỏng để kiểm chứng
    if ($back -ceq $v) { return $rev }                            # round-trip khớp -> mojibake thật
    return $null
  } catch {
    return $null                                                  # ký tự không map -> chuỗi đã sạch, bỏ qua
  }
}

# Bảng + cột text cần quét (khóa = Id).
$targets = @(
  @{ Table = 'Roles';       Cols = @('RoleName','Description') },
  @{ Table = 'Permissions'; Cols = @('PermissionName','Description','Module') }
)

$cn = New-Object System.Data.SqlClient.SqlConnection $ConnectionString
$cn.Open()
Write-Host ("Đã kết nối: {0}" -f $cn.DataSource) -ForegroundColor Cyan
$tran = $cn.BeginTransaction()
$totalFixed = 0
try {
  foreach ($t in $targets) {
    $tbl  = $t.Table
    $cols = $t.Cols
    $sel = $cn.CreateCommand(); $sel.Transaction = $tran
    $sel.CommandText = "SELECT Id, $($cols -join ', ') FROM [$tbl]"
    $rows = @()
    $rd = $sel.ExecuteReader()
    while ($rd.Read()) {
      $o = @{ Id = $rd['Id'] }
      foreach ($c in $cols) { $o[$c] = if ($rd[$c] -is [System.DBNull]) { $null } else { [string]$rd[$c] } }
      $rows += [pscustomobject]$o
    }
    $rd.Close()

    Write-Host "`n=== $tbl ===" -ForegroundColor Yellow
    foreach ($row in $rows) {
      $set = @{}
      foreach ($c in $cols) {
        $fixed = Get-Fixed $row.$c
        if ($null -ne $fixed) { $set[$c] = $fixed; Write-Host ("  [{0}] {1}: {2}  ->  {3}" -f $tbl, $c, $row.$c, $fixed) }
      }
      if ($set.Count -gt 0) {
        $assign = ($set.Keys | ForEach-Object { "[$_] = @$_" }) -join ', '
        $upd = $cn.CreateCommand(); $upd.Transaction = $tran
        $upd.CommandText = "UPDATE [$tbl] SET $assign WHERE Id = @Id"
        foreach ($k in $set.Keys) {
          $p = $upd.Parameters.Add("@$k", [System.Data.SqlDbType]::NVarChar, -1); $p.Value = $set[$k]
        }
        $pid = $upd.Parameters.Add("@Id", [System.Data.SqlDbType]::UniqueIdentifier); $pid.Value = $row.Id
        $totalFixed += $upd.ExecuteNonQuery()
      }
    }
  }

  if ($Commit) {
    $tran.Commit()
    Write-Host ("`nĐÃ COMMIT. Số dòng sửa: {0}" -f $totalFixed) -ForegroundColor Green
  } else {
    $tran.Rollback()
    Write-Host ("`nDRY-RUN (đã ROLLBACK). Số dòng SẼ sửa nếu chạy -Commit: {0}" -f $totalFixed) -ForegroundColor Magenta
  }
} catch {
  $tran.Rollback()
  Write-Host ("LỖI -> đã ROLLBACK: {0}" -f $_.Exception.Message) -ForegroundColor Red
  throw
} finally {
  $cn.Close()
}
