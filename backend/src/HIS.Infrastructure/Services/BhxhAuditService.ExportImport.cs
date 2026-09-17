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

        // QA-R10: cells were wrapped in quotes without escaping — a '"' in a name/description broke the
        // row, and a leading '=' ran as a formula in Excel. CsvUtil escapes and neutralises both.
        var i = 1;
        foreach (var error in session.Errors.Where(e => !e.IsDeleted).OrderBy(e => e.ErrorType))
        {
            sb.AppendLine(Export.CsvUtil.Line(i++,
                error.PatientName,
                error.InsuranceNumber,
                ErrorTypeNames.GetValueOrDefault(error.ErrorType, error.ErrorType),
                error.ErrorDescription,
                error.OriginalAmount,
                error.AdjustedAmount,
                error.IsFixed ? "Có" : "Không"));
        }

        return Export.CsvUtil.ToBytes(sb.ToString());
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

        // #195: nạp 1 lần các phiên cần đóng gói thay vì 1 query/phiên.
        var sessionsById = await _context.Set<BhxhAuditSession>()
            .Include(s => s.Errors)
            .Where(s => idList.Contains(s.Id) && !s.IsDeleted)
            .ToDictionaryAsync(s => s.Id);

        using var zipStream = new System.IO.MemoryStream();
        using (var archive = new System.IO.Compression.ZipArchive(zipStream, System.IO.Compression.ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var sessionId in idList)
            {
                if (!sessionsById.TryGetValue(sessionId, out var session))
                    continue; // bỏ qua session không tồn tại

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
        // Suffix: two uploads in the same second shared one batch code (the batch filter mixed both files).
        var batchCode = $"IMPORT-{DateTime.UtcNow:yyyyMMdd-HHmmss}-{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}";
        var result = new BhxhAuditImportResultDto
        {
            ImportBatchCode = batchCode,
            FileName = fileName
        };

        // QA-R10: shared CsvUtil — the BOM of an Excel "CSV UTF-8" file used to hide the MaHoSo header
        // (every such file was rejected), and Split(',') shifted every column after a quoted "Ho, Ten".
        List<(int LineNumber, List<string> Cells)> records;
        try { records = Export.CsvUtil.ReadRecords(Export.CsvUtil.DecodeText(csvContent)); }
        catch (InvalidOperationException ex)
        {
            result.Errors.Add(new BhxhAuditImportRowErrorDto { RowNumber = 0, MaHoSo = "", ErrorMessage = ex.Message });
            return result;
        }

        if (records.Count < 2)
        {
            result.Errors.Add(new BhxhAuditImportRowErrorDto
            {
                RowNumber = 0, MaHoSo = "",
                ErrorMessage = "File CSV rong hoac thieu header."
            });
            return result;
        }

        var hdr = records[0].Cells;
        int col(string name) => Export.CsvUtil.IndexOf(hdr, name);
        string val(List<string> cols, int idx) => Export.CsvUtil.Get(cols, idx);

        int iMaHoSo   = col("mahoso");
        int iMaBN      = col("mabenhnhan");
        int iHoTen     = col("hoten");
        int iSoThe     = col("sothebhyt");
        int iNgayVao   = col("ngayvao");
        int iNgayRa    = col("ngayra");
        int iMaKhoa    = col("makhoa");
        int iTenKhoa   = col("tenkhoa");
        int iMaCD      = col("machandoan");
        int iTienVP    = col("tienvienphi");
        int iTienBHYT  = col("tienbhyt");
        int iTienBN    = col("tienbenhnhan");
        int iTrangThai = col("trangthaigiamdinhh"); if (iTrangThai < 0) iTrangThai = col("trangthaigiamdinh");
        int iGhiChu    = col("ghichu");

        if (iMaHoSo < 0)
        {
            result.Errors.Add(new BhxhAuditImportRowErrorDto
            {
                RowNumber = 1, MaHoSo = "",
                ErrorMessage = $"Thieu cot 'MaHoSo'. Header hien tai: {string.Join(",", hdr)}"
            });
            return result;
        }

        result.TotalRows = records.Count - 1;
        var rows = new List<BhxhAuditImport>();

        // Re-importing used to add every MaHoSo again (dashboard counts doubled). An already imported
        // MaHoSo is now UPDATED in place (a later list moves "Chua duyet" -> "Da duyet").
        var codesInFile = records.Skip(1).Select(r => val(r.Cells, iMaHoSo)).Where(c => c.Length > 0).Distinct().ToList();
        var alreadyImported = (await _context.BhxhAuditImports
                .Where(x => !x.IsDeleted && codesInFile.Contains(x.MaHoSo))
                .OrderByDescending(x => x.ImportedAt)
                .ToListAsync())
            .GroupBy(x => x.MaHoSo, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);
        var seenInFile = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var (lineNumber, cols) in records.Skip(1))
        {
            int rowNum = lineNumber;
            var maHoSo = val(cols, iMaHoSo);

            void Reject(string message)
            {
                result.SkippedRows++;
                result.Errors.Add(new BhxhAuditImportRowErrorDto { RowNumber = rowNum, MaHoSo = maHoSo, ErrorMessage = message });
            }

            if (string.IsNullOrWhiteSpace(maHoSo)) { Reject("MaHoSo trong"); continue; }
            if (!seenInFile.Add(maHoSo)) { Reject("MaHoSo trung voi dong truoc trong file"); continue; }

            // Money: VN "1.500.000" / EN "1,500,000.00" (CsvUtil.ParseMoney). A non-numeric amount is a row
            // error — it used to be imported silently as 0.
            decimal? tienVP = Export.CsvUtil.ParseMoney(val(cols, iTienVP));
            decimal? tienBHYT = Export.CsvUtil.ParseMoney(val(cols, iTienBHYT));
            decimal? tienBN = Export.CsvUtil.ParseMoney(val(cols, iTienBN));
            if ((val(cols, iTienVP).Length > 0 && tienVP == null) || (val(cols, iTienBHYT).Length > 0 && tienBHYT == null)
                || (val(cols, iTienBN).Length > 0 && tienBN == null))
            { Reject("So tien khong hop le"); continue; }
            if (tienVP < 0 || tienBHYT < 0 || tienBN < 0) { Reject("So tien am"); continue; }
            // Parse trang thai: 0/1/2 hoac text. "Chua duyet" contains "duyet" and was read as
            // 1 (Da duyet) — the very label this module prints for status 0.
            int trangThai = 0;
            var ttStr = val(cols, iTrangThai);
            if (int.TryParse(ttStr, out var ttNum))
            {
                if (ttNum is < 0 or > 2) { Reject($"TrangThaiGiamDinh khong hop le: '{ttStr}' (0/1/2)"); continue; }
                trangThai = ttNum;
            }
            else if (ttStr.Length > 0)
            {
                trangThai = ttStr.Contains("chua", StringComparison.OrdinalIgnoreCase) || ttStr.Contains("chưa", StringComparison.OrdinalIgnoreCase) ? 0 :
                            ttStr.Contains("choi", StringComparison.OrdinalIgnoreCase) || ttStr.Contains("chối", StringComparison.OrdinalIgnoreCase) ? 2 :
                            ttStr.Contains("duyet", StringComparison.OrdinalIgnoreCase) || ttStr.Contains("duyệt", StringComparison.OrdinalIgnoreCase) ? 1 : -1;
                if (trangThai < 0) { Reject($"TrangThaiGiamDinh khong hop le: '{ttStr}'"); continue; }
            }

            // Dates: dd/MM/yyyy (CsvUtil.ParseDate). An unreadable date was silently stored as NULL.
            var ngayVao = Export.CsvUtil.ParseDate(val(cols, iNgayVao));
            var ngayRa = Export.CsvUtil.ParseDate(val(cols, iNgayRa));
            if ((val(cols, iNgayVao).Length > 0 && ngayVao == null) || (val(cols, iNgayRa).Length > 0 && ngayRa == null))
            { Reject("Ngay khong hop le (dd/MM/yyyy)"); continue; }
            if (ngayVao.HasValue && ngayRa.HasValue && ngayRa < ngayVao) { Reject("NgayRa truoc NgayVao"); continue; }

            if (!alreadyImported.TryGetValue(maHoSo, out var row))
            {
                row = new BhxhAuditImport();
                rows.Add(row);
            }
            row.ImportBatchCode    = batchCode;
            row.ImportedAt         = DateTime.UtcNow;
            row.ImportedByUserId   = importedByUserId == Guid.Empty ? null : importedByUserId;
            row.FileName           = fileName;
            row.RowNumber          = rowNum;
            row.MaHoSo             = maHoSo;
            row.MaBenhNhan         = val(cols, iMaBN);
            row.HoTen              = val(cols, iHoTen);
            row.SoTheBHYT         = val(cols, iSoThe);
            row.NgayVao            = ngayVao;
            row.NgayRa             = ngayRa;
            row.MaKhoa             = val(cols, iMaKhoa);
            row.TenKhoa            = val(cols, iTenKhoa);
            row.MaChanDoan         = val(cols, iMaCD);
            row.TienVienPhi        = tienVP ?? 0;
            row.TienBHYT           = tienBHYT ?? 0;
            row.TienBenhNhan       = tienBN ?? 0;
            row.TrangThaiGiamDinh  = trangThai;
            row.GhiChu             = val(cols, iGhiChu);
            row.IsValid            = true;
            // BhxhAuditImports.UpdatedAt is NOT NULL (script 129) — EF sent NULL and every import failed.
            row.UpdatedAt          = DateTime.UtcNow;

            result.ImportedRows++;
        }

        if (result.ImportedRows > 0)
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
