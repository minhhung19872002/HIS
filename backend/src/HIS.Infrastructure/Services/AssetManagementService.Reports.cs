using System.Text;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.Asset;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

public partial class AssetManagementService
{
    // ===== REPORTS =====

    public Task<List<AssetReportTypeDto>> GetAssetReportTypesAsync()
    {
        var types = new List<AssetReportTypeDto>
        {
            new() { Code = 1, Name = "So TSCD", Description = "So tai san co dinh - liet ke toan bo tai san", Category = "So sach" },
            new() { Code = 2, Name = "The TSCD", Description = "The tai san co dinh - chi tiet tung tai san", Category = "So sach" },
            new() { Code = 3, Name = "So theo doi TSCD tai noi su dung", Description = "Theo doi tai san theo khoa/phong su dung", Category = "So sach" },
            new() { Code = 4, Name = "Bien ban giao nhan TSCD", Description = "Bien ban ban giao tai san co dinh", Category = "Bien ban" },
            new() { Code = 5, Name = "Bien ban thanh ly TSCD", Description = "Bien ban thanh ly tai san co dinh", Category = "Bien ban" },
            new() { Code = 6, Name = "Bien ban danh gia lai TSCD", Description = "Bien ban danh gia lai gia tri tai san", Category = "Bien ban" },
            new() { Code = 7, Name = "Bien ban kiem ke TSCD", Description = "Bien ban kiem ke tai san co dinh", Category = "Bien ban" },
            new() { Code = 8, Name = "Bien ban giao nhan TSCD sau nang cap", Description = "Bien ban giao nhan sau sua chua, nang cap", Category = "Bien ban" },
            new() { Code = 9, Name = "Bang tinh hao mon TSCD", Description = "Bang tinh khau hao tai san co dinh", Category = "Khau hao" },
            new() { Code = 10, Name = "Bang tinh va phan bo khau hao TSCD", Description = "Phan bo khau hao theo khoa/phong", Category = "Khau hao" },
            new() { Code = 11, Name = "BC ke khai 04A - TSCD la nha", Description = "Bao cao ke khai tai san la nha, cong trinh", Category = "Ke khai" },
            new() { Code = 12, Name = "BC ke khai 04C - O to", Description = "Bao cao ke khai tai san la o to", Category = "Ke khai" },
            new() { Code = 13, Name = "BC ke khai 04D - Phuong tien khac", Description = "Bao cao ke khai phuong tien van tai khac", Category = "Ke khai" },
            new() { Code = 14, Name = "BC ke khai 04DD - Tai san khac > 500tr", Description = "Bao cao tai san khac co gia tri tren 500 trieu", Category = "Ke khai" },
            new() { Code = 15, Name = "BC ke khai 04E - TSCD vo hinh", Description = "Bao cao ke khai tai san co dinh vo hinh", Category = "Ke khai" },
            new() { Code = 16, Name = "BC ke khai 04G - TSCD dac biet", Description = "Bao cao ke khai tai san co dinh dac biet", Category = "Ke khai" },
            new() { Code = 17, Name = "BC ke khai 04H - Khai thac khac", Description = "Bao cao ke khai hinh thuc khai thac khac", Category = "Ke khai" },
            new() { Code = 18, Name = "BC ke khai 04I - Doanh thu khai thac", Description = "Bao cao doanh thu tu khai thac tai san", Category = "Ke khai" },
            new() { Code = 19, Name = "BC ke khai xoa thong tin (07)", Description = "Bao cao xoa thong tin tai san trong co so du lieu", Category = "Ke khai" },
            new() { Code = 20, Name = "BC tong hop hien trang 08a (I-III)", Description = "Bao cao tong hop hien trang su dung tai san", Category = "Tong hop" },
            new() { Code = 21, Name = "BC tang giam 08b (I-III)", Description = "Bao cao tang giam tai san trong ky", Category = "Tong hop" },
            new() { Code = 22, Name = "BC cong khai 09a", Description = "Bao cao cong khai tinh hinh quan ly tai san", Category = "Cong khai" },
            new() { Code = 23, Name = "BC cong khai 09b", Description = "Bao cao cong khai tinh hinh xu ly tai san", Category = "Cong khai" },
            new() { Code = 24, Name = "BC cong khai 09c", Description = "Bao cao cong khai tinh hinh dau tu, mua sam tai san", Category = "Cong khai" },
        };
        return Task.FromResult(types);
    }

    public async Task<AssetQrCodeDto> GetAssetQrCodeDataAsync(Guid assetId)
    {
        var asset = await _context.FixedAssets.Where(a => a.Id == assetId && !a.IsDeleted).FirstOrDefaultAsync()
            ?? throw new Exception("Asset not found");

        string? deptName = null;
        if (asset.DepartmentId.HasValue)
        {
            deptName = await _context.Departments.Where(d => d.Id == asset.DepartmentId.Value).Select(d => d.DepartmentName).FirstOrDefaultAsync();
        }

        var qrContent = $"ASSET:{asset.AssetCode}|{asset.AssetName}|{deptName ?? ""}|{asset.OriginalValue:N0}|SN:{asset.SerialNumber ?? ""}";

        return new AssetQrCodeDto
        {
            AssetId = asset.Id,
            AssetCode = asset.AssetCode,
            AssetName = asset.AssetName,
            DepartmentName = deptName,
            OriginalValue = asset.OriginalValue,
            SerialNumber = asset.SerialNumber,
            LocationDescription = asset.LocationDescription,
            QrContent = qrContent,
        };
    }

    public async Task<byte[]> PrintAssetReportAsync(int reportType, AssetReportFilterDto filter)
    {
        var html = reportType switch
        {
            1 => await BuildReport01_SoTSCD(filter),
            2 => await BuildReport02_TheTSCD(filter),
            3 => await BuildReport03_TheoDoiNoiSuDung(filter),
            4 => await BuildReport04_BienBanGiaoNhan(filter),
            5 => await BuildReport05_BienBanThanhLy(filter),
            6 => await BuildReport06_DanhGiaLai(filter),
            7 => await BuildReport07_KiemKe(filter),
            8 => await BuildReport08_GiaoNhanSauNangCap(filter),
            9 => await BuildReport09_BangTinhHaoMon(filter),
            10 => await BuildReport10_PhanBoKhauHao(filter),
            >= 11 and <= 24 => await BuildReportGovernment(reportType, filter),
            _ => throw new Exception($"Invalid report type: {reportType}"),
        };
        return Encoding.UTF8.GetBytes(html);
    }

    private static string ReportHeader(string title, string subtitle = "")
    {
        return $@"<html><head><meta charset='utf-8'/>
<style>
body {{ font-family: 'Times New Roman', serif; font-size: 13px; margin: 20px; }}
h2 {{ text-align: center; margin-bottom: 4px; }}
h3 {{ text-align: center; margin-top: 0; font-weight: normal; font-style: italic; }}
table {{ border-collapse: collapse; width: 100%; margin-top: 12px; }}
th, td {{ border: 1px solid #333; padding: 4px 6px; font-size: 12px; }}
th {{ background: #f0f0f0; text-align: center; font-weight: bold; }}
td.num {{ text-align: right; }}
td.center {{ text-align: center; }}
.header-row {{ display: flex; justify-content: space-between; margin-bottom: 8px; }}
.header-left {{ text-align: left; }}
.header-right {{ text-align: right; }}
.sign-block {{ display: flex; justify-content: space-between; margin-top: 30px; text-align: center; }}
.sign-block div {{ width: 30%; }}
.sign-block p {{ margin: 2px 0; }}
.no-border {{ border: none !important; }}
@media print {{ body {{ margin: 10mm; }} @page {{ size: A4 landscape; }} }}
</style></head><body>
<div class='header-row'>
  <div class='header-left'><strong>DON VI: BENH VIEN</strong></div>
  <div class='header-right'>Ngay in: {DateTime.Now:dd/MM/yyyy HH:mm}</div>
</div>
<h2>{title}</h2>
{(string.IsNullOrEmpty(subtitle) ? "" : $"<h3>{subtitle}</h3>")}";
    }

    private static string SignatureBlock()
    {
        return @"<div class='sign-block'>
<div><p><strong>Nguoi lap bieu</strong></p><p><em>(Ky, ho ten)</em></p><br/><br/><br/></div>
<div><p><strong>Ke toan truong</strong></p><p><em>(Ky, ho ten)</em></p><br/><br/><br/></div>
<div><p><strong>Giam doc</strong></p><p><em>(Ky, ho ten, dong dau)</em></p><br/><br/><br/></div>
</div></body></html>";
    }

    private async Task<string> BuildReport01_SoTSCD(AssetReportFilterDto filter)
    {
        var query = _context.FixedAssets.Where(a => !a.IsDeleted);
        if (filter.AssetGroupCode != null) query = query.Where(a => a.AssetGroupId == filter.AssetGroupCode);
        if (filter.FromDate.HasValue) query = query.Where(a => a.PurchaseDate >= filter.FromDate.Value);
        if (filter.ToDate.HasValue) query = query.Where(a => a.PurchaseDate <= filter.ToDate.Value);

        var assets = await query.OrderBy(a => a.AssetCode).ToListAsync();

        var deptIds = assets.Where(a => a.DepartmentId.HasValue).Select(a => a.DepartmentId!.Value).Distinct().ToList();
        var depts = deptIds.Any() ? await _context.Departments.Where(d => deptIds.Contains(d.Id)).ToDictionaryAsync(d => d.Id, d => d.DepartmentName) : new Dictionary<Guid, string>();

        var sb = new StringBuilder(ReportHeader("SO TAI SAN CO DINH", filter.Year.HasValue ? $"Nam {filter.Year}" : $"Tinh den ngay {DateTime.Now:dd/MM/yyyy}"));
        sb.Append("<table><tr><th>STT</th><th>Ma TS</th><th>Ten tai san</th><th>So serial</th><th>Khoa/Phong</th><th>Ngay mua</th><th>Nguyen gia</th><th>KH luy ke</th><th>Gia tri con lai</th><th>Trang thai</th></tr>");

        var statusNames = new Dictionary<int, string> { {1,"Dang dung"},{2,"Hong"},{3,"Dang sua"},{4,"Cho TL"},{5,"Da TL"},{6,"Da chuyen"} };
        int stt = 0;
        decimal totalOriginal = 0, totalAccum = 0, totalCurrent = 0;
        foreach (var a in assets)
        {
            stt++;
            totalOriginal += a.OriginalValue;
            totalAccum += a.AccumulatedDepreciation;
            totalCurrent += a.CurrentValue;
            var dept = a.DepartmentId.HasValue && depts.TryGetValue(a.DepartmentId.Value, out var dn) ? dn : "";
            sb.Append($"<tr><td class='center'>{stt}</td><td>{a.AssetCode}</td><td>{a.AssetName}</td><td>{a.SerialNumber}</td><td>{dept}</td><td class='center'>{a.PurchaseDate:dd/MM/yyyy}</td><td class='num'>{a.OriginalValue:N0}</td><td class='num'>{a.AccumulatedDepreciation:N0}</td><td class='num'>{a.CurrentValue:N0}</td><td class='center'>{statusNames.GetValueOrDefault(a.Status, "")}</td></tr>");
        }
        sb.Append($"<tr style='font-weight:bold'><td colspan='6' class='center'>TONG CONG</td><td class='num'>{totalOriginal:N0}</td><td class='num'>{totalAccum:N0}</td><td class='num'>{totalCurrent:N0}</td><td></td></tr>");
        sb.Append("</table>");
        sb.Append(SignatureBlock());
        return sb.ToString();
    }

    private async Task<string> BuildReport02_TheTSCD(AssetReportFilterDto filter)
    {
        if (!filter.AssetId.HasValue) return ReportHeader("THE TAI SAN CO DINH", "Vui long chon tai san") + "</body></html>";

        var asset = await _context.FixedAssets.FirstOrDefaultAsync(a => a.Id == filter.AssetId.Value && !a.IsDeleted);
        if (asset == null) return ReportHeader("THE TAI SAN CO DINH", "Khong tim thay tai san") + "</body></html>";

        string? deptName = null;
        if (asset.DepartmentId.HasValue)
            deptName = await _context.Departments.Where(d => d.Id == asset.DepartmentId.Value).Select(d => d.DepartmentName).FirstOrDefaultAsync();

        var depreciations = await _context.AssetDepreciations.Where(d => d.FixedAssetId == asset.Id && !d.IsDeleted)
            .OrderBy(d => d.Year).ThenBy(d => d.Month).ToListAsync();

        var sb = new StringBuilder(ReportHeader("THE TAI SAN CO DINH"));
        sb.Append($"<table class='no-border' style='margin-bottom:12px'>");
        sb.Append($"<tr><td class='no-border' style='width:30%'><strong>Ma tai san:</strong> {asset.AssetCode}</td><td class='no-border'><strong>Ten tai san:</strong> {asset.AssetName}</td></tr>");
        sb.Append($"<tr><td class='no-border'><strong>So serial:</strong> {asset.SerialNumber}</td><td class='no-border'><strong>Nhom TS:</strong> {asset.AssetGroupId}</td></tr>");
        sb.Append($"<tr><td class='no-border'><strong>Khoa/Phong:</strong> {deptName}</td><td class='no-border'><strong>Vi tri:</strong> {asset.LocationDescription}</td></tr>");
        sb.Append($"<tr><td class='no-border'><strong>Ngay mua:</strong> {asset.PurchaseDate:dd/MM/yyyy}</td><td class='no-border'><strong>PP khau hao:</strong> {(asset.DepreciationMethod == 1 ? "Duong thang" : "Giam dan")}</td></tr>");
        sb.Append($"<tr><td class='no-border'><strong>Nguyen gia:</strong> {asset.OriginalValue:N0} VND</td><td class='no-border'><strong>Thoi gian SD:</strong> {asset.UsefulLifeMonths} thang</td></tr>");
        sb.Append($"<tr><td class='no-border'><strong>KH luy ke:</strong> {asset.AccumulatedDepreciation:N0} VND</td><td class='no-border'><strong>Gia tri con lai:</strong> {asset.CurrentValue:N0} VND</td></tr>");
        sb.Append("</table>");

        if (depreciations.Any())
        {
            sb.Append("<h3 style='text-align:left;font-style:normal;font-weight:bold'>Lich su khau hao</h3>");
            sb.Append("<table><tr><th>Ky</th><th>Gia tri dau ky</th><th>Khau hao</th><th>Gia tri cuoi ky</th><th>Ngay tinh</th></tr>");
            foreach (var d in depreciations)
            {
                sb.Append($"<tr><td class='center'>{d.Month:00}/{d.Year}</td><td class='num'>{d.OpeningValue:N0}</td><td class='num'>{d.DepreciationAmount:N0}</td><td class='num'>{d.ClosingValue:N0}</td><td class='center'>{d.CalculatedAt:dd/MM/yyyy}</td></tr>");
            }
            sb.Append("</table>");
        }
        sb.Append(SignatureBlock());
        return sb.ToString();
    }

    private async Task<string> BuildReport03_TheoDoiNoiSuDung(AssetReportFilterDto filter)
    {
        var query = _context.FixedAssets.Where(a => !a.IsDeleted && a.DepartmentId.HasValue);
        if (filter.FromDate.HasValue) query = query.Where(a => a.PurchaseDate >= filter.FromDate.Value);
        if (filter.ToDate.HasValue) query = query.Where(a => a.PurchaseDate <= filter.ToDate.Value);

        var assets = await query.OrderBy(a => a.DepartmentId).ThenBy(a => a.AssetCode).ToListAsync();
        var deptIds = assets.Select(a => a.DepartmentId!.Value).Distinct().ToList();
        var depts = deptIds.Any() ? await _context.Departments.Where(d => deptIds.Contains(d.Id)).ToDictionaryAsync(d => d.Id, d => d.DepartmentName) : new Dictionary<Guid, string>();

        var sb = new StringBuilder(ReportHeader("SO THEO DOI TAI SAN CO DINH TAI NOI SU DUNG"));
        var grouped = assets.GroupBy(a => a.DepartmentId!.Value);

        foreach (var group in grouped)
        {
            var deptName = depts.TryGetValue(group.Key, out var dn) ? dn : group.Key.ToString();
            sb.Append($"<h3 style='text-align:left;font-style:normal;font-weight:bold;margin-top:16px'>Khoa/Phong: {deptName}</h3>");
            sb.Append("<table><tr><th>STT</th><th>Ma TS</th><th>Ten tai san</th><th>So serial</th><th>Nguyen gia</th><th>Gia tri con lai</th><th>Trang thai</th></tr>");
            int stt = 0;
            decimal subtotalOrig = 0, subtotalCur = 0;
            foreach (var a in group)
            {
                stt++;
                subtotalOrig += a.OriginalValue;
                subtotalCur += a.CurrentValue;
                var statusNames = new Dictionary<int, string> { {1,"Dang dung"},{2,"Hong"},{3,"Dang sua"},{4,"Cho TL"},{5,"Da TL"},{6,"Da chuyen"} };
                sb.Append($"<tr><td class='center'>{stt}</td><td>{a.AssetCode}</td><td>{a.AssetName}</td><td>{a.SerialNumber}</td><td class='num'>{a.OriginalValue:N0}</td><td class='num'>{a.CurrentValue:N0}</td><td class='center'>{statusNames.GetValueOrDefault(a.Status, "")}</td></tr>");
            }
            sb.Append($"<tr style='font-weight:bold'><td colspan='4' class='center'>Cong</td><td class='num'>{subtotalOrig:N0}</td><td class='num'>{subtotalCur:N0}</td><td></td></tr>");
            sb.Append("</table>");
        }
        sb.Append(SignatureBlock());
        return sb.ToString();
    }

    private async Task<string> BuildReport04_BienBanGiaoNhan(AssetReportFilterDto filter)
    {
        var handovers = await _context.AssetHandovers.Include(h => h.FixedAsset).Where(h => !h.IsDeleted)
            .Where(h => !filter.FromDate.HasValue || h.HandoverDate >= filter.FromDate.Value)
            .Where(h => !filter.ToDate.HasValue || h.HandoverDate <= filter.ToDate.Value)
            .OrderByDescending(h => h.HandoverDate).Take(100).ToListAsync();

        var deptIds = handovers.SelectMany(h => new[] { h.FromDepartmentId, h.ToDepartmentId }).Where(d => d.HasValue).Select(d => d!.Value).Distinct().ToList();
        var depts = deptIds.Any() ? await _context.Departments.Where(d => deptIds.Contains(d.Id)).ToDictionaryAsync(d => d.Id, d => d.DepartmentName) : new Dictionary<Guid, string>();

        var sb = new StringBuilder(ReportHeader("BIEN BAN GIAO NHAN TAI SAN CO DINH"));
        sb.Append("<table><tr><th>STT</th><th>Ma TS</th><th>Ten tai san</th><th>Nguyen gia</th><th>Ben giao</th><th>Ben nhan</th><th>Ngay BG</th><th>Loai</th><th>Trang thai</th></tr>");
        var handoverTypes = new Dictionary<int, string> { {1,"Tiep nhan"},{2,"Dieu chuyen"},{3,"Muon"},{4,"Tra"} };
        int stt = 0;
        foreach (var h in handovers)
        {
            stt++;
            var fromDept = h.FromDepartmentId.HasValue && depts.TryGetValue(h.FromDepartmentId.Value, out var fn) ? fn : "";
            var toDept = h.ToDepartmentId.HasValue && depts.TryGetValue(h.ToDepartmentId.Value, out var tn) ? tn : "";
            sb.Append($"<tr><td class='center'>{stt}</td><td>{h.FixedAsset?.AssetCode}</td><td>{h.FixedAsset?.AssetName}</td><td class='num'>{h.FixedAsset?.OriginalValue:N0}</td><td>{fromDept}</td><td>{toDept}</td><td class='center'>{h.HandoverDate:dd/MM/yyyy}</td><td class='center'>{handoverTypes.GetValueOrDefault(h.HandoverType, "")}</td><td class='center'>{(h.Status == 2 ? "Xac nhan" : "Cho")}</td></tr>");
        }
        sb.Append("</table>");
        sb.Append(@"<div class='sign-block'>
<div><p><strong>Ben giao</strong></p><p><em>(Ky, ho ten)</em></p><br/><br/><br/></div>
<div><p><strong>Ben nhan</strong></p><p><em>(Ky, ho ten)</em></p><br/><br/><br/></div>
<div><p><strong>Giam doc</strong></p><p><em>(Ky, ho ten, dong dau)</em></p><br/><br/><br/></div>
</div></body></html>");
        return sb.ToString();
    }

    private async Task<string> BuildReport05_BienBanThanhLy(AssetReportFilterDto filter)
    {
        var disposals = await _context.AssetDisposals.Include(d => d.FixedAsset).Where(d => !d.IsDeleted)
            .Where(d => !filter.FromDate.HasValue || d.ProposalDate >= filter.FromDate.Value)
            .Where(d => !filter.ToDate.HasValue || d.ProposalDate <= filter.ToDate.Value)
            .OrderByDescending(d => d.ProposalDate).Take(100).ToListAsync();

        var disposalTypes = new Dictionary<int, string> { {1,"Thanh ly"},{2,"Dau gia"},{3,"Xoa so"} };
        var disposalStatus = new Dictionary<int, string> { {1,"De xuat"},{2,"Da duyet"},{3,"Hoan thanh"},{4,"Tu choi"} };

        var sb = new StringBuilder(ReportHeader("BIEN BAN THANH LY TAI SAN CO DINH"));
        sb.Append("<table><tr><th>STT</th><th>Ma TS</th><th>Ten tai san</th><th>Nguyen gia</th><th>Gia tri con lai</th><th>Gia thanh ly</th><th>Loai</th><th>Ngay de xuat</th><th>Trang thai</th><th>Ly do</th></tr>");
        int stt = 0;
        decimal totalOrig = 0, totalDisp = 0, totalResid = 0;
        foreach (var d in disposals)
        {
            stt++;
            totalOrig += d.FixedAsset?.OriginalValue ?? 0;
            totalDisp += d.DisposalValue;
            totalResid += d.ResidualValue;
            sb.Append($"<tr><td class='center'>{stt}</td><td>{d.FixedAsset?.AssetCode}</td><td>{d.FixedAsset?.AssetName}</td><td class='num'>{d.FixedAsset?.OriginalValue:N0}</td><td class='num'>{d.ResidualValue:N0}</td><td class='num'>{d.DisposalValue:N0}</td><td class='center'>{disposalTypes.GetValueOrDefault(d.DisposalType, "")}</td><td class='center'>{d.ProposalDate:dd/MM/yyyy}</td><td class='center'>{disposalStatus.GetValueOrDefault(d.Status, "")}</td><td>{d.Reason}</td></tr>");
        }
        sb.Append($"<tr style='font-weight:bold'><td colspan='3' class='center'>TONG CONG</td><td class='num'>{totalOrig:N0}</td><td class='num'>{totalResid:N0}</td><td class='num'>{totalDisp:N0}</td><td colspan='4'></td></tr>");
        sb.Append("</table>");
        sb.Append(SignatureBlock());
        return sb.ToString();
    }

    private async Task<string> BuildReport06_DanhGiaLai(AssetReportFilterDto filter)
    {
        var assets = await _context.FixedAssets.Where(a => !a.IsDeleted)
            .Where(a => !filter.AssetId.HasValue || a.Id == filter.AssetId.Value)
            .OrderBy(a => a.AssetCode).Take(200).ToListAsync();

        var sb = new StringBuilder(ReportHeader("BIEN BAN DANH GIA LAI TAI SAN CO DINH", $"Ngay {DateTime.Now:dd/MM/yyyy}"));
        sb.Append("<p>Can cu vao Quyet dinh so ......./QD-BV ngay ...../...../........ cua Giam doc benh vien ve viec danh gia lai tai san co dinh.</p>");
        sb.Append("<p>Hoi dong danh gia gom co:</p><ul><li>Chu tich: .................................</li><li>Uy vien: .................................</li><li>Thu ky: .................................</li></ul>");
        sb.Append("<table><tr><th>STT</th><th>Ma TS</th><th>Ten tai san</th><th>Nguyen gia cu</th><th>KH luy ke</th><th>GTCL cu</th><th>Nguyen gia moi</th><th>GTCL moi</th><th>Chenh lech</th></tr>");
        int stt = 0;
        foreach (var a in assets)
        {
            stt++;
            sb.Append($"<tr><td class='center'>{stt}</td><td>{a.AssetCode}</td><td>{a.AssetName}</td><td class='num'>{a.OriginalValue:N0}</td><td class='num'>{a.AccumulatedDepreciation:N0}</td><td class='num'>{a.CurrentValue:N0}</td><td class='num'></td><td class='num'></td><td class='num'></td></tr>");
        }
        sb.Append("</table>");
        sb.Append(SignatureBlock());
        return sb.ToString();
    }

    private async Task<string> BuildReport07_KiemKe(AssetReportFilterDto filter)
    {
        var query = _context.FixedAssets.Where(a => !a.IsDeleted);
        if (filter.AssetGroupCode != null) query = query.Where(a => a.AssetGroupId == filter.AssetGroupCode);

        var assets = await query.OrderBy(a => a.DepartmentId).ThenBy(a => a.AssetCode).ToListAsync();
        var deptIds = assets.Where(a => a.DepartmentId.HasValue).Select(a => a.DepartmentId!.Value).Distinct().ToList();
        var depts = deptIds.Any() ? await _context.Departments.Where(d => deptIds.Contains(d.Id)).ToDictionaryAsync(d => d.Id, d => d.DepartmentName) : new Dictionary<Guid, string>();

        var sb = new StringBuilder(ReportHeader("BIEN BAN KIEM KE TAI SAN CO DINH", $"Thoi diem: {DateTime.Now:dd/MM/yyyy}"));
        sb.Append("<p>Hoi dong kiem ke gom co:</p><ul><li>Truong ban: .................................</li><li>Uy vien: .................................</li></ul>");
        sb.Append("<table><tr><th>STT</th><th>Ma TS</th><th>Ten tai san</th><th>Khoa/Phong</th><th>So serial</th><th>Nguyen gia</th><th>So sach</th><th>Thuc te</th><th>Chenh lech</th><th>Ghi chu</th></tr>");
        var statusNames = new Dictionary<int, string> { {1,"Tot"},{2,"Hong"},{3,"Dang sua"},{4,"Cho TL"},{5,"Da TL"},{6,"Chuyen"} };
        int stt = 0;
        foreach (var a in assets)
        {
            stt++;
            var dept = a.DepartmentId.HasValue && depts.TryGetValue(a.DepartmentId.Value, out var dn) ? dn : "";
            sb.Append($"<tr><td class='center'>{stt}</td><td>{a.AssetCode}</td><td>{a.AssetName}</td><td>{dept}</td><td>{a.SerialNumber}</td><td class='num'>{a.OriginalValue:N0}</td><td class='center'>1</td><td class='center'></td><td class='center'></td><td>{statusNames.GetValueOrDefault(a.Status, "")}</td></tr>");
        }
        sb.Append("</table>");
        sb.Append(@"<div class='sign-block'>
<div><p><strong>Truong ban kiem ke</strong></p><p><em>(Ky, ho ten)</em></p><br/><br/><br/></div>
<div><p><strong>Ke toan</strong></p><p><em>(Ky, ho ten)</em></p><br/><br/><br/></div>
<div><p><strong>Giam doc</strong></p><p><em>(Ky, ho ten, dong dau)</em></p><br/><br/><br/></div>
</div></body></html>");
        return sb.ToString();
    }

    private async Task<string> BuildReport08_GiaoNhanSauNangCap(AssetReportFilterDto filter)
    {
        var handovers = await _context.AssetHandovers.Include(h => h.FixedAsset).Where(h => !h.IsDeleted && h.HandoverType == 4) // Type 4 = Tra (return after upgrade)
            .Where(h => !filter.FromDate.HasValue || h.HandoverDate >= filter.FromDate.Value)
            .Where(h => !filter.ToDate.HasValue || h.HandoverDate <= filter.ToDate.Value)
            .OrderByDescending(h => h.HandoverDate).Take(50).ToListAsync();

        var sb = new StringBuilder(ReportHeader("BIEN BAN GIAO NHAN TAI SAN CO DINH SAU SUA CHUA, NANG CAP"));
        sb.Append("<p>Can cu Quyet dinh so ........./QD-BV ngay ..../..../......... ve viec sua chua, nang cap tai san co dinh.</p>");
        sb.Append("<table><tr><th>STT</th><th>Ma TS</th><th>Ten tai san</th><th>Nguyen gia truoc NC</th><th>Chi phi nang cap</th><th>Nguyen gia sau NC</th><th>Ngay hoan thanh</th><th>Ghi chu</th></tr>");
        int stt = 0;
        foreach (var h in handovers)
        {
            stt++;
            sb.Append($"<tr><td class='center'>{stt}</td><td>{h.FixedAsset?.AssetCode}</td><td>{h.FixedAsset?.AssetName}</td><td class='num'>{h.FixedAsset?.OriginalValue:N0}</td><td class='num'></td><td class='num'></td><td class='center'>{h.HandoverDate:dd/MM/yyyy}</td><td>{h.Notes}</td></tr>");
        }
        if (!handovers.Any())
            sb.Append("<tr><td colspan='8' class='center'><em>Khong co du lieu</em></td></tr>");
        sb.Append("</table>");
        sb.Append(SignatureBlock());
        return sb.ToString();
    }

    private async Task<string> BuildReport09_BangTinhHaoMon(AssetReportFilterDto filter)
    {
        var query = _context.AssetDepreciations.Where(d => !d.IsDeleted);
        if (filter.Month.HasValue) query = query.Where(d => d.Month == filter.Month.Value);
        if (filter.Year.HasValue) query = query.Where(d => d.Year == filter.Year.Value);

        var depreciations = await query.OrderBy(d => d.Year).ThenBy(d => d.Month)
            .Join(_context.FixedAssets, d => d.FixedAssetId, a => a.Id, (d, a) => new { d, a })
            .ToListAsync();

        var sb = new StringBuilder(ReportHeader("BANG TINH HAO MON TAI SAN CO DINH",
            filter.Year.HasValue ? $"Nam {filter.Year}{(filter.Month.HasValue ? $" - Thang {filter.Month}" : "")}" : ""));
        sb.Append("<table><tr><th>STT</th><th>Ma TS</th><th>Ten tai san</th><th>Nguyen gia</th><th>Ti le KH (%/thang)</th><th>So KH trong ky</th><th>KH luy ke</th><th>Gia tri con lai</th></tr>");
        int stt = 0;
        decimal totalDep = 0;
        foreach (var x in depreciations)
        {
            stt++;
            totalDep += x.d.DepreciationAmount;
            var rate = x.a.UsefulLifeMonths > 0 ? (100m / x.a.UsefulLifeMonths) : 0;
            sb.Append($"<tr><td class='center'>{stt}</td><td>{x.a.AssetCode}</td><td>{x.a.AssetName}</td><td class='num'>{x.a.OriginalValue:N0}</td><td class='center'>{rate:N2}</td><td class='num'>{x.d.DepreciationAmount:N0}</td><td class='num'>{x.a.AccumulatedDepreciation:N0}</td><td class='num'>{x.d.ClosingValue:N0}</td></tr>");
        }
        sb.Append($"<tr style='font-weight:bold'><td colspan='5' class='center'>TONG CONG</td><td class='num'>{totalDep:N0}</td><td colspan='2'></td></tr>");
        sb.Append("</table>");
        sb.Append(SignatureBlock());
        return sb.ToString();
    }

    private async Task<string> BuildReport10_PhanBoKhauHao(AssetReportFilterDto filter)
    {
        var month = filter.Month ?? DateTime.Now.Month;
        var year = filter.Year ?? DateTime.Now.Year;

        var depreciations = await _context.AssetDepreciations
            .Where(d => !d.IsDeleted && d.Month == month && d.Year == year)
            .Join(_context.FixedAssets, d => d.FixedAssetId, a => a.Id, (d, a) => new { d, a })
            .ToListAsync();

        var deptIds = depreciations.Where(x => x.a.DepartmentId.HasValue).Select(x => x.a.DepartmentId!.Value).Distinct().ToList();
        var depts = deptIds.Any() ? await _context.Departments.Where(d => deptIds.Contains(d.Id)).ToDictionaryAsync(d => d.Id, d => d.DepartmentName) : new Dictionary<Guid, string>();

        var sb = new StringBuilder(ReportHeader("BANG TINH VA PHAN BO KHAU HAO TAI SAN CO DINH", $"Thang {month}/{year}"));
        sb.Append("<table><tr><th>STT</th><th>Khoa/Phong</th><th>So luong TS</th><th>Tong nguyen gia</th><th>KH trong ky</th><th>Ti le (%)</th></tr>");

        var grouped = depreciations.GroupBy(x => x.a.DepartmentId ?? Guid.Empty);
        int stt = 0;
        decimal grandTotal = depreciations.Sum(x => x.d.DepreciationAmount);
        foreach (var g in grouped.OrderByDescending(g => g.Sum(x => x.d.DepreciationAmount)))
        {
            stt++;
            var deptName = g.Key != Guid.Empty && depts.TryGetValue(g.Key, out var dn) ? dn : "Chua phan bo";
            var deptDep = g.Sum(x => x.d.DepreciationAmount);
            var deptOrig = g.Sum(x => x.a.OriginalValue);
            var pct = grandTotal > 0 ? (deptDep / grandTotal * 100) : 0;
            sb.Append($"<tr><td class='center'>{stt}</td><td>{deptName}</td><td class='center'>{g.Count()}</td><td class='num'>{deptOrig:N0}</td><td class='num'>{deptDep:N0}</td><td class='center'>{pct:N1}%</td></tr>");
        }
        sb.Append($"<tr style='font-weight:bold'><td colspan='2' class='center'>TONG CONG</td><td class='center'>{depreciations.Count}</td><td class='num'>{depreciations.Sum(x => x.a.OriginalValue):N0}</td><td class='num'>{grandTotal:N0}</td><td class='center'>100%</td></tr>");
        sb.Append("</table>");
        sb.Append(SignatureBlock());
        return sb.ToString();
    }

    private Task<string> BuildReportGovernment(int reportType, AssetReportFilterDto filter)
    {
        var reportNames = new Dictionary<int, (string code, string title)>
        {
            { 11, ("04A", "BAO CAO KE KHAI TAI SAN LA NHA, CONG TRINH XAY DUNG") },
            { 12, ("04C", "BAO CAO KE KHAI TAI SAN LA O TO") },
            { 13, ("04D", "BAO CAO KE KHAI TAI SAN LA PHUONG TIEN VAN TAI KHAC") },
            { 14, ("04DD", "BAO CAO KE KHAI TAI SAN KHAC CO GIA TRI TREN 500 TRIEU DONG") },
            { 15, ("04E", "BAO CAO KE KHAI TAI SAN CO DINH VO HINH") },
            { 16, ("04G", "BAO CAO KE KHAI TAI SAN CO DINH DAC BIET") },
            { 17, ("04H", "BAO CAO KE KHAI HINH THUC KHAI THAC KHAC") },
            { 18, ("04I", "BAO CAO DOANH THU TU KHAI THAC TAI SAN") },
            { 19, ("07", "BAO CAO XOA THONG TIN TAI SAN TRONG CO SO DU LIEU") },
            { 20, ("08a", "BAO CAO TONG HOP HIEN TRANG SU DUNG TAI SAN (I-III)") },
            { 21, ("08b", "BAO CAO TANG GIAM TAI SAN TRONG KY (I-III)") },
            { 22, ("09a", "BAO CAO CONG KHAI TINH HINH QUAN LY TAI SAN") },
            { 23, ("09b", "BAO CAO CONG KHAI TINH HINH XU LY TAI SAN") },
            { 24, ("09c", "BAO CAO CONG KHAI TINH HINH DAU TU, MUA SAM TAI SAN") },
        };

        var (code, title) = reportNames.GetValueOrDefault(reportType, ("", "BAO CAO"));
        var year = filter.Year ?? DateTime.Now.Year;

        var sb = new StringBuilder(ReportHeader($"Mau so {code}", title));
        sb.Append($"<p style='text-align:center'>Nam bao cao: <strong>{year}</strong></p>");
        sb.Append("<p style='text-align:center'>Don vi bao cao: <strong>BENH VIEN</strong></p>");
        sb.Append("<p style='text-align:center;font-style:italic'>(Ban in tu phan mem quan ly tai san co dinh)</p>");

        // Generate appropriate table structure based on report type category
        if (reportType >= 11 && reportType <= 16) // Ke khai 04A-04G
        {
            sb.Append("<table><tr><th>STT</th><th>Ten tai san</th><th>Dia chi/Vi tri</th><th>Dien tich (m2)</th><th>Nam dua vao SD</th><th>Nguyen gia</th><th>Gia tri con lai</th><th>Hien trang SD</th><th>Ghi chu</th></tr>");
            sb.Append("<tr><td class='center'>1</td><td></td><td></td><td class='num'></td><td class='center'></td><td class='num'></td><td class='num'></td><td></td><td></td></tr>");
            sb.Append("<tr><td colspan='9' class='center'><em>(Du lieu se duoc dien tu he thong quan ly TSCD)</em></td></tr>");
            sb.Append("</table>");
        }
        else if (reportType == 17) // 04H - Khai thac khac
        {
            sb.Append("<table><tr><th>STT</th><th>Ten tai san</th><th>Hinh thuc khai thac</th><th>Doi tac</th><th>Thoi han</th><th>Gia tri hop dong</th><th>Ghi chu</th></tr>");
            sb.Append("<tr><td colspan='7' class='center'><em>(Du lieu se duoc dien tu he thong quan ly TSCD)</em></td></tr>");
            sb.Append("</table>");
        }
        else if (reportType == 18) // 04I - Doanh thu
        {
            sb.Append("<table><tr><th>STT</th><th>Ten tai san</th><th>Hinh thuc khai thac</th><th>Doanh thu</th><th>Chi phi</th><th>Loi nhuan</th><th>Nop NSNN</th><th>Ghi chu</th></tr>");
            sb.Append("<tr><td colspan='8' class='center'><em>(Du lieu se duoc dien tu he thong quan ly TSCD)</em></td></tr>");
            sb.Append("</table>");
        }
        else if (reportType == 19) // 07 - Xoa thong tin
        {
            sb.Append("<table><tr><th>STT</th><th>Ten tai san</th><th>Ma TS</th><th>Nguyen gia</th><th>Ly do xoa</th><th>Ngay xoa</th><th>So quyet dinh</th><th>Ghi chu</th></tr>");
            sb.Append("<tr><td colspan='8' class='center'><em>(Du lieu se duoc dien tu he thong quan ly TSCD)</em></td></tr>");
            sb.Append("</table>");
        }
        else if (reportType == 20 || reportType == 21) // 08a, 08b
        {
            var label = reportType == 20 ? "Hien trang" : "Tang giam";
            sb.Append($"<table><tr><th>STT</th><th>Chi tieu</th><th>So luong</th><th>Nguyen gia</th><th>Gia tri con lai</th><th>Ghi chu</th></tr>");
            sb.Append("<tr><td class='center'>I</td><td><strong>Tong tai san dau ky</strong></td><td class='num'></td><td class='num'></td><td class='num'></td><td></td></tr>");
            sb.Append($"<tr><td class='center'>II</td><td><strong>{label} trong ky</strong></td><td class='num'></td><td class='num'></td><td class='num'></td><td></td></tr>");
            sb.Append("<tr><td class='center'>III</td><td><strong>Tong tai san cuoi ky</strong></td><td class='num'></td><td class='num'></td><td class='num'></td><td></td></tr>");
            sb.Append("<tr><td colspan='6' class='center'><em>(Du lieu se duoc dien tu he thong quan ly TSCD)</em></td></tr>");
            sb.Append("</table>");
        }
        else // 09a, 09b, 09c - Cong khai
        {
            sb.Append("<table><tr><th>STT</th><th>Noi dung</th><th>So luong</th><th>Gia tri</th><th>Ghi chu</th></tr>");
            sb.Append("<tr><td colspan='5' class='center'><em>(Du lieu se duoc dien tu he thong quan ly TSCD)</em></td></tr>");
            sb.Append("</table>");
        }

        sb.Append(SignatureBlock());
        return Task.FromResult(sb.ToString());
    }
}
