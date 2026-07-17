using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using System.Text;

namespace HIS.Infrastructure.Services;

// K-wave5: tach tu BhxhAuditService.cs — Export (CSV/XML/Print) + Import CSV (~350 dong).
public partial class BhxhAuditService
{
    public async Task<byte[]> ExportSessionAsync(Guid sessionId)
    {
        var session = await _context.Set<BhxhAuditSession>()
            .Include(s => s.Errors)
            .FirstOrDefaultAsync(s => s.Id == sessionId && !s.IsDeleted)
            ?? throw new InvalidOperationException("Audit session not found");

        // Generate CSV export
        var sb = new StringBuilder();
        sb.AppendLine("STT,Họ tên BN,Số thẻ BHYT,Loại lỗi,Mô tả,Số tiền gốc,Số tiền điều chỉnh,Đã sửa");

        var i = 1;
        foreach (var error in session.Errors.Where(e => !e.IsDeleted).OrderBy(e => e.ErrorType))
        {
            sb.AppendLine($"{i++}," +
                $"\"{error.PatientName}\"," +
                $"\"{error.InsuranceNumber}\"," +
                $"\"{ErrorTypeNames.GetValueOrDefault(error.ErrorType, error.ErrorType)}\"," +
                $"\"{error.ErrorDescription}\"," +
                $"{error.OriginalAmount}," +
                $"{error.AdjustedAmount}," +
                $"{(error.IsFixed ? "Có" : "Không")}");
        }

        return Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
    }

    public async Task<byte[]> ExportXmlAsync(Guid sessionId)
    {
        var session = await _context.Set<BhxhAuditSession>()
            .Include(s => s.Errors)
            .FirstOrDefaultAsync(s => s.Id == sessionId && !s.IsDeleted)
            ?? throw new InvalidOperationException("Audit session not found");

        // XML130-like format (simplified — real XML130 schema needs BHXH specification)
        var sb = new StringBuilder();
        sb.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        sb.AppendLine("<GiamDinhBHXH xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\">");
        sb.AppendLine($"  <PhienGiamDinh ma=\"{session.SessionCode}\" thang=\"{session.PeriodMonth}\" nam=\"{session.PeriodYear}\"/>");
        sb.AppendLine($"  <TongHop soHoSo=\"{session.TotalRecords}\" tongTien=\"{session.TotalAmount}\" soLoi=\"{session.ErrorCount}\" tienLoi=\"{session.ErrorAmount}\"/>");
        sb.AppendLine("  <DanhSachLoi>");
        int idx = 1;
        foreach (var err in session.Errors.Where(e => !e.IsDeleted))
        {
            sb.AppendLine($"    <Loi stt=\"{idx++}\">");
            sb.AppendLine($"      <HoTenBN>{System.Security.SecurityElement.Escape(err.PatientName ?? "")}</HoTenBN>");
            sb.AppendLine($"      <SoTheBHYT>{System.Security.SecurityElement.Escape(err.InsuranceNumber ?? "")}</SoTheBHYT>");
            sb.AppendLine($"      <LoaiLoi>{System.Security.SecurityElement.Escape(err.ErrorType)}</LoaiLoi>");
            sb.AppendLine($"      <MoTa>{System.Security.SecurityElement.Escape(err.ErrorDescription ?? "")}</MoTa>");
            sb.AppendLine($"      <TienGoc>{err.OriginalAmount}</TienGoc>");
            sb.AppendLine($"      <TienDieuChinh>{err.AdjustedAmount}</TienDieuChinh>");
            sb.AppendLine($"      <DaSua>{(err.IsFixed ? "1" : "0")}</DaSua>");
            sb.AppendLine("    </Loi>");
        }
        sb.AppendLine("  </DanhSachLoi>");
        sb.AppendLine("</GiamDinhBHXH>");

        return Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
    }

    public async Task<byte[]> ExportBatchXmlAsync(IEnumerable<Guid> sessionIds)
    {
        var idList = sessionIds?.ToList() ?? new List<Guid>();
        if (idList.Count == 0)
            throw new ArgumentException("Cần ít nhất 1 phiên giám định");

        using var zipStream = new System.IO.MemoryStream();
        using (var archive = new System.IO.Compression.ZipArchive(zipStream, System.IO.Compression.ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var sessionId in idList)
            {
                var session = await _context.Set<BhxhAuditSession>()
                    .Include(s => s.Errors)
                    .FirstOrDefaultAsync(s => s.Id == sessionId && !s.IsDeleted);

                if (session == null) continue; // bỏ qua session không tồn tại

                var xmlBytes = await ExportXmlAsync(sessionId);
                var entryName = $"{session.SessionCode}.xml";
                var entry = archive.CreateEntry(entryName, System.IO.Compression.CompressionLevel.Optimal);
                using var entryStream = entry.Open();
                await entryStream.WriteAsync(xmlBytes);
            }
        }

        return zipStream.ToArray();
    }

    public async Task<byte[]> PrintAuditFormAsync(Guid sessionId)
    {
        var session = await _context.Set<BhxhAuditSession>()
            .Include(s => s.Auditor)
            .Include(s => s.Errors)
            .FirstOrDefaultAsync(s => s.Id == sessionId && !s.IsDeleted)
            ?? throw new InvalidOperationException("Audit session not found");

        var sb = new StringBuilder();
        sb.AppendLine("<!DOCTYPE html><html><head><meta charset='utf-8'/>");
        sb.AppendLine("<style>");
        sb.AppendLine("body{font-family:Times New Roman,serif;font-size:12pt;margin:20px;}");
        sb.AppendLine("table{width:100%;border-collapse:collapse;margin:8px 0;}");
        sb.AppendLine("th,td{border:1px solid #333;padding:4px 6px;font-size:11pt;}");
        sb.AppendLine("th{background:#f0f0f0;font-weight:bold;text-align:center;}");
        sb.AppendLine(".title{text-align:center;font-weight:bold;font-size:14pt;margin-bottom:4px;}");
        sb.AppendLine(".subtitle{text-align:center;margin-bottom:12px;}");
        sb.AppendLine("@media print{body{margin:10mm;}}");
        sb.AppendLine("</style></head><body>");
        sb.AppendLine("<div class='title'>PHIẾU GIÁM ĐỊNH BHXH</div>");
        sb.AppendLine($"<div class='subtitle'>Kỳ: Tháng {session.PeriodMonth}/{session.PeriodYear} &nbsp;|&nbsp; Mã phiên: {System.Web.HttpUtility.HtmlEncode(session.SessionCode)}</div>");
        sb.AppendLine("<table>");
        sb.AppendLine("<tr><th colspan='2'>THÔNG TIN PHIÊN GIÁM ĐỊNH</th></tr>");
        sb.AppendLine($"<tr><td>Mã phiên</td><td>{System.Web.HttpUtility.HtmlEncode(session.SessionCode)}</td></tr>");
        sb.AppendLine($"<tr><td>Kỳ giám định</td><td>Tháng {session.PeriodMonth}/{session.PeriodYear}</td></tr>");
        sb.AppendLine($"<tr><td>Tổng hồ sơ</td><td>{session.TotalRecords:N0}</td></tr>");
        sb.AppendLine($"<tr><td>Tổng tiền</td><td>{session.TotalAmount:N0} VND</td></tr>");
        sb.AppendLine($"<tr><td>Số lỗi</td><td>{session.ErrorCount}</td></tr>");
        sb.AppendLine($"<tr><td>Tiền lỗi</td><td>{session.ErrorAmount:N0} VND</td></tr>");
        sb.AppendLine($"<tr><td>Kiểm toán viên</td><td>{System.Web.HttpUtility.HtmlEncode(session.Auditor?.FullName ?? "")}</td></tr>");
        sb.AppendLine($"<tr><td>Ngày lập</td><td>{session.CreatedAt:dd/MM/yyyy HH:mm}</td></tr>");
        sb.AppendLine("</table>");

        if (session.Errors.Any(e => !e.IsDeleted))
        {
            sb.AppendLine("<table>");
            sb.AppendLine("<tr><th>STT</th><th>Họ tên BN</th><th>Số thẻ BHYT</th><th>Loại lỗi</th><th>Mô tả</th><th>Tiền gốc</th><th>Tiền điều chỉnh</th><th>Đã sửa</th></tr>");
            int i = 1;
            foreach (var err in session.Errors.Where(e => !e.IsDeleted).OrderBy(e => e.ErrorType))
            {
                sb.AppendLine($"<tr><td>{i++}</td><td>{System.Web.HttpUtility.HtmlEncode(err.PatientName ?? "")}</td><td>{System.Web.HttpUtility.HtmlEncode(err.InsuranceNumber ?? "")}</td><td>{System.Web.HttpUtility.HtmlEncode(ErrorTypeNames.GetValueOrDefault(err.ErrorType, err.ErrorType))}</td><td>{System.Web.HttpUtility.HtmlEncode(err.ErrorDescription ?? "")}</td><td style='text-align:right'>{err.OriginalAmount:N0}</td><td style='text-align:right'>{err.AdjustedAmount:N0}</td><td style='text-align:center'>{(err.IsFixed ? "✓" : "")}</td></tr>");
            }
            sb.AppendLine("</table>");
        }

        sb.AppendLine("<script>window.onload=function(){window.print();}</script>");
        sb.AppendLine("</body></html>");

        return Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
    }

    // ============================================================
    // Import danh sach giam dinh BHXH tu CSV (Issue #97/#121/#122)
    // NOTE: Excel can them thu vien ClosedXML/EPPlus; hien tai chi ho tro CSV.
    // ============================================================

    private static readonly string[] TrangThaiNames = { "Chua duyet", "Da duyet", "Tu choi" };

    /// <summary>
    /// Import CSV giam dinh BHXH — moi dong 1 ho so.
    /// Header bat buoc: MaHoSo,MaBenhNhan,HoTen,SoTheBHYT,NgayVao,NgayRa,MaKhoa,TenKhoa,MaChanDoan,TienVienPhi,TienBHYT,TienBenhNhan,TrangThaiGiamDinh,GhiChu
    /// </summary>
    public async Task<BhxhAuditImportResultDto> ImportAuditListAsync(byte[] csvContent, string? fileName, Guid importedByUserId)
    {
        var batchCode = $"IMPORT-{DateTime.UtcNow:yyyyMMdd-HHmmss}";
        var result = new BhxhAuditImportResultDto
        {
            ImportBatchCode = batchCode,
            FileName = fileName
        };

        var lines = Encoding.UTF8.GetString(csvContent)
            .Split('\n', StringSplitOptions.RemoveEmptyEntries);

        if (lines.Length < 2)
        {
            result.Errors.Add(new BhxhAuditImportRowErrorDto
            {
                RowNumber = 0, MaHoSo = "",
                ErrorMessage = "File CSV rong hoac thieu header."
            });
            return result;
        }

        // Header index mapping (case-insensitive)
        var headerCols = lines[0].Trim().Split(',');
        var hdr = headerCols.Select(h => h.Trim().ToLowerInvariant()).ToArray();

        int col(string name) => Array.IndexOf(hdr, name);
        string val(string[] cols, int idx) => idx >= 0 && idx < cols.Length ? cols[idx].Trim() : "";

        int iMaHoSo   = col("mahoSo");   if (iMaHoSo < 0)   iMaHoSo   = col("mahoso");
        int iMaBN      = col("mabenhNhan"); if (iMaBN < 0)    iMaBN     = col("mabenhnhan");
        int iHoTen     = col("hoten");
        int iSoThe     = col("sothebhyt");
        int iNgayVao   = col("ngayvao");
        int iNgayRa    = col("ngayra");
        int iMaKhoa    = col("makhoa");
        int iTenKhoa   = col("tenkhoa");
        int iMaCD      = col("machandoan");
        int iTienVP    = col("tienvienPhi");    if (iTienVP < 0) iTienVP = col("tienvienphi");
        int iTienBHYT  = col("tienbhyt");
        int iTienBN    = col("tienbenhNhan");   if (iTienBN < 0) iTienBN = col("tienbenhnhan");
        int iTrangThai = col("trangthaigiamdinhh"); if (iTrangThai < 0) iTrangThai = col("trangthaigiamdinh");
        int iGhiChu    = col("ghichu");

        if (iMaHoSo < 0)
        {
            result.Errors.Add(new BhxhAuditImportRowErrorDto
            {
                RowNumber = 1, MaHoSo = "",
                ErrorMessage = $"Thieu cot 'MaHoSo'. Header hien tai: {lines[0].Trim()}"
            });
            return result;
        }

        result.TotalRows = lines.Length - 1;
        var rows = new List<BhxhAuditImport>();

        for (int i = 1; i < lines.Length; i++)
        {
            var line = lines[i].Trim();
            if (string.IsNullOrWhiteSpace(line)) { result.TotalRows--; continue; }

            var cols = line.Split(',');
            int rowNum = i + 1;
            var maHoSo = val(cols, iMaHoSo);

            if (string.IsNullOrWhiteSpace(maHoSo))
            {
                result.SkippedRows++;
                result.Errors.Add(new BhxhAuditImportRowErrorDto
                {
                    RowNumber = rowNum, MaHoSo = maHoSo,
                    ErrorMessage = "MaHoSo trong"
                });
                continue;
            }

            // Parse so tien
            decimal ParseMoney(string s) =>
                decimal.TryParse(s.Replace(".", "").Replace(",", ""), out var v) ? v : 0;

            // Parse trang thai: 0/1/2 hoac text
            int trangThai = 0;
            var ttStr = val(cols, iTrangThai);
            if (!int.TryParse(ttStr, out trangThai))
                trangThai = ttStr.Contains("duyet", StringComparison.OrdinalIgnoreCase) ? 1 :
                            ttStr.Contains("choi", StringComparison.OrdinalIgnoreCase)   ? 2 : 0;

            // Parse ngay
            DateTime? ParseDate(string s) =>
                DateTime.TryParse(s, out var d) ? (DateTime?)d : null;

            rows.Add(new BhxhAuditImport
            {
                ImportBatchCode    = batchCode,
                ImportedAt         = DateTime.UtcNow,
                ImportedByUserId   = importedByUserId == Guid.Empty ? null : importedByUserId,
                FileName           = fileName,
                RowNumber          = rowNum,
                MaHoSo             = maHoSo,
                MaBenhNhan         = val(cols, iMaBN),
                HoTen              = val(cols, iHoTen),
                SoTheBHYT         = val(cols, iSoThe),
                NgayVao            = ParseDate(val(cols, iNgayVao)),
                NgayRa             = ParseDate(val(cols, iNgayRa)),
                MaKhoa             = val(cols, iMaKhoa),
                TenKhoa            = val(cols, iTenKhoa),
                MaChanDoan         = val(cols, iMaCD),
                TienVienPhi        = ParseMoney(val(cols, iTienVP)),
                TienBHYT           = ParseMoney(val(cols, iTienBHYT)),
                TienBenhNhan       = ParseMoney(val(cols, iTienBN)),
                TrangThaiGiamDinh  = trangThai,
                GhiChu             = val(cols, iGhiChu),
                IsValid            = true,
            });

            result.ImportedRows++;
        }

        if (rows.Any())
        {
            _context.BhxhAuditImports.AddRange(rows);
            await _context.SaveChangesAsync();
        }

        return result;
    }

    public async Task<BhxhAuditImportPagedResult> GetImportedRowsAsync(BhxhAuditImportSearchDto filter)
    {
        var q = _context.BhxhAuditImports.Where(x => !x.IsDeleted);

        if (!string.IsNullOrWhiteSpace(filter.ImportBatchCode))
            q = q.Where(x => x.ImportBatchCode == filter.ImportBatchCode);

        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var kw = filter.Keyword.Trim();
            q = q.Where(x => x.MaHoSo.Contains(kw)
                           || (x.HoTen != null && x.HoTen.Contains(kw))
                           || (x.SoTheBHYT != null && x.SoTheBHYT.Contains(kw)));
        }

        if (filter.TrangThai.HasValue)
            q = q.Where(x => x.TrangThaiGiamDinh == filter.TrangThai.Value);

        var total        = await q.CountAsync();
        var chuaDuyet    = await q.CountAsync(x => x.TrangThaiGiamDinh == 0);
        var daDuyet      = await q.CountAsync(x => x.TrangThaiGiamDinh == 1);
        var tuChoi       = await q.CountAsync(x => x.TrangThaiGiamDinh == 2);

        var items = await q
            .OrderByDescending(x => x.ImportedAt)
            .ThenBy(x => x.RowNumber)
            .Skip(filter.PageIndex * filter.PageSize)
            .Take(filter.PageSize)
            .Select(x => new BhxhAuditImportRowDto
            {
                Id                = x.Id,
                ImportBatchCode   = x.ImportBatchCode,
                ImportedAt        = x.ImportedAt,
                FileName          = x.FileName,
                RowNumber         = x.RowNumber,
                MaHoSo            = x.MaHoSo,
                MaBenhNhan        = x.MaBenhNhan,
                HoTen             = x.HoTen,
                SoTheBHYT        = x.SoTheBHYT,
                NgayVao           = x.NgayVao,
                NgayRa            = x.NgayRa,
                MaKhoa            = x.MaKhoa,
                TenKhoa           = x.TenKhoa,
                MaChanDoan        = x.MaChanDoan,
                TienVienPhi       = x.TienVienPhi,
                TienBHYT          = x.TienBHYT,
                TienBenhNhan      = x.TienBenhNhan,
                TrangThaiGiamDinh = x.TrangThaiGiamDinh,
                TrangThaiName     = x.TrangThaiGiamDinh == 1 ? "Da duyet"
                                  : x.TrangThaiGiamDinh == 2 ? "Tu choi" : "Chua duyet",
                GhiChu            = x.GhiChu,
                IsValid           = x.IsValid,
                ValidationError   = x.ValidationError,
            })
            .ToListAsync();

        return new BhxhAuditImportPagedResult
        {
            Items         = items,
            TotalCount    = total,
            PageIndex     = filter.PageIndex,
            PageSize      = filter.PageSize,
            CountChuaDuyet = chuaDuyet,
            CountDaDuyet  = daDuyet,
            CountTuChoi   = tuChoi,
        };
    }
}
