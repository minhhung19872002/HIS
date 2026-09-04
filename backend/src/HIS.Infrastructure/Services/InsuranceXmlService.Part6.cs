using System.IO.Compression;
using System.Text;
using System.Xml.Linq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Insurance;
using HIS.Application.Services;
using HIS.Core.Common;
using HIS.Core.Entities;
using HIS.Infrastructure.Configuration;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

public partial class InsuranceXmlService
{
    // =========================================================================
    // C80B-HD - Tổng hợp nội trú bản B (phân nhóm đối tượng BHYT)
    // =========================================================================

    public async Task<ReportC80bDto> GetReportC80bAsync(int month, int year)
    {
        var (from, to) = MonthRange(month, year);

        // Nội trú: TreatmentType=2, phân nhóm theo InsuranceType
        var rows = await _context.InsuranceClaims
            .Where(c => !c.IsDeleted && c.TreatmentType == 2
                && c.ServiceDate >= @from && c.ServiceDate < to)
            .Select(c => new
            {
                c.InsuranceType,
                NgayVao = c.ServiceDate,
                NgayRa = c.DischargeDate,
                c.TotalAmount,
                c.InsuranceAmount,
            })
            .ToListAsync();

        static string InsuranceTypeLabel(int t) => t switch
        {
            1 => "Cung tuyen",
            2 => "Trai tuyen co giay chuyen",
            3 => "Trai tuyen khong giay chuyen",
            4 => "Dung tuyen",
            5 => "Thong tuyen",
            _ => "Khac",
        };

        var grouped = rows.GroupBy(r => r.InsuranceType)
            .OrderBy(g => g.Key)
            .Select((g, i) => new ReportC80bLineDto
            {
                Stt = i + 1,
                NhomDoiTuong = InsuranceTypeLabel(g.Key),
                SoBenhNhan = g.Count(),
                SoNgayDieuTri = g.Sum(x =>
                    (int)((x.NgayRa ?? DateTime.UtcNow).Date - x.NgayVao.Date).TotalDays),
                TienDeNghi = g.Sum(x => x.TotalAmount),
                TienQuyetToan = g.Sum(x => x.InsuranceAmount),
            })
            .ToList();

        return new ReportC80bDto
        {
            MaCsKcb = "01001",
            TenCsKcb = "Benh vien Da khoa",
            Month = month,
            Year = year,
            Lines = grouped,
            TotalAmount = grouped.Sum(l => l.TienDeNghi),
            TotalInsuranceAmount = grouped.Sum(l => l.TienQuyetToan),
            TotalPatients = grouped.Sum(l => l.SoBenhNhan),
        };
    }

    public async Task<byte[]> ExportReportC80bToExcelAsync(int month, int year)
    {
        try
        {
            var report = await GetReportC80bAsync(month, year);
            var rows = report.Lines.Select(d => new string[]
            {
                d.Stt.ToString(), d.NhomDoiTuong,
                d.SoBenhNhan.ToString("N0"), d.SoNgayDieuTri.ToString("N0"),
                d.TienDeNghi.ToString("N0"), d.TienQuyetToan.ToString("N0"),
            }).ToList();
            var html = BuildTableReport($"BAO CAO C80B-HD THANG {month}/{year}",
                $"Tong {report.TotalPatients} BN noi tru, BHYT: {report.TotalInsuranceAmount:N0}", DateTime.Now,
                new[] { "STT", "Nhom doi tuong", "So BN", "So ngay DT", "Tien de nghi", "Tien quyet toan" }, rows);
            return Encoding.UTF8.GetBytes(html);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "#190 BHYT report/Excel export failed (see stack for method)");
            throw;
        }
    }

    public async Task<List<TreatmentTypeReportDto>> GetTreatmentTypeReportAsync(int month, int year)
    {
        var (from, to) = MonthRange(month, year);
        var rows = await _context.InvoiceSummaries
            .Include(i => i.MedicalRecord).ThenInclude(m => m.Patient)
            .Where(i => !i.IsDeleted
                        && i.MedicalRecord != null
                        && i.MedicalRecord.Patient != null
                        && !string.IsNullOrEmpty(i.MedicalRecord.Patient.InsuranceNumber)
                        && i.InvoiceDate >= from && i.InvoiceDate < to)
            .Select(i => new {
                TreatmentType = i.MedicalRecord!.TreatmentType,
                i.TotalAmount,
                i.InsuranceAmount,
                i.PatientCoPayment,
            })
            .ToListAsync();

        return rows.GroupBy(r => r.TreatmentType)
            .Select(g => new TreatmentTypeReportDto
            {
                TreatmentTypeCode = g.Key.ToString(),
                TreatmentTypeName = g.Key switch { 1 => "Ngoại trú", 2 => "Nội trú", 3 => "Cấp cứu", _ => "Khác" },
                VisitCount = g.Count(),
                TotalCost = g.Sum(x => x.TotalAmount),
                InsurancePaid = g.Sum(x => x.InsuranceAmount),
                PatientPaid = g.Sum(x => x.PatientCoPayment),
            })
            .OrderByDescending(d => d.VisitCount)
            .ToList();
    }

    public async Task<List<DiseaseStatDto>> GetTopDiseasesReportAsync(int month, int year, int top = 20)
    {
        var (from, to) = MonthRange(month, year);
        var rows = await _context.InvoiceSummaries
            .Include(i => i.MedicalRecord).ThenInclude(m => m.Patient)
            .Where(i => !i.IsDeleted
                        && i.MedicalRecord != null
                        && i.MedicalRecord.Patient != null
                        && !string.IsNullOrEmpty(i.MedicalRecord.Patient.InsuranceNumber)
                        && !string.IsNullOrEmpty(i.MedicalRecord.MainIcdCode)
                        && i.InvoiceDate >= from && i.InvoiceDate < to)
            .Select(i => new {
                i.MedicalRecord!.MainIcdCode,
                i.MedicalRecord.MainDiagnosis,
                i.TotalAmount,
            })
            .ToListAsync();

        return rows.GroupBy(r => r.MainIcdCode!)
            .Select(g => new DiseaseStatDto
            {
                IcdCode = g.Key,
                DiseaseName = g.First().MainDiagnosis ?? "",
                Count = g.Count(),
                TotalCost = g.Sum(x => x.TotalAmount),
            })
            .OrderByDescending(d => d.Count)
            .Take(top)
            .ToList();
    }

    public async Task<List<MedicineStatDto>> GetTopMedicinesReportAsync(int month, int year, int top = 20)
    {
        var (from, to) = MonthRange(month, year);
        var rows = await _context.PrescriptionDetails
            .Include(d => d.Medicine)
            .Include(d => d.Prescription).ThenInclude(p => p.MedicalRecord).ThenInclude(m => m!.Patient)
            .Where(d => !d.IsDeleted
                        && d.Prescription != null
                        && d.Prescription.MedicalRecord != null
                        && d.Prescription.MedicalRecord.Patient != null
                        && !string.IsNullOrEmpty(d.Prescription.MedicalRecord.Patient.InsuranceNumber)
                        && d.Prescription.PrescriptionDate >= from && d.Prescription.PrescriptionDate < to)
            .Select(d => new { d.MedicineId, d.Medicine!.MedicineCode, d.Medicine.MedicineName, d.Quantity, d.Amount })
            .ToListAsync();

        return rows.GroupBy(r => r.MedicineId)
            .Select(g => new MedicineStatDto
            {
                MedicineCode = g.First().MedicineCode,
                MedicineName = g.First().MedicineName,
                TotalQuantity = g.Sum(x => x.Quantity),
                TotalCost = g.Sum(x => x.Amount),
            })
            .OrderByDescending(m => m.TotalCost)
            .Take(top)
            .ToList();
    }

    public async Task<List<DepartmentInsuranceReportDto>> GetDepartmentReportAsync(int month, int year)
    {
        var (from, to) = MonthRange(month, year);
        var rows = await _context.InvoiceSummaries
            .Include(i => i.MedicalRecord).ThenInclude(m => m.Patient)
            .Include(i => i.MedicalRecord).ThenInclude(m => m.Department)
            .Where(i => !i.IsDeleted
                        && i.MedicalRecord != null
                        && i.MedicalRecord.Patient != null
                        && !string.IsNullOrEmpty(i.MedicalRecord.Patient.InsuranceNumber)
                        && i.InvoiceDate >= from && i.InvoiceDate < to)
            .Select(i => new {
                DepartmentId = i.MedicalRecord!.DepartmentId,
                DepartmentCode = i.MedicalRecord.Department.DepartmentCode,
                DepartmentName = i.MedicalRecord.Department.DepartmentName,
                i.TotalAmount,
                i.InsuranceAmount,
                i.TotalServiceAmount,
                i.TotalMedicineAmount,
            })
            .ToListAsync();

        return rows.GroupBy(r => r.DepartmentId)
            .Select(g => new DepartmentInsuranceReportDto
            {
                DepartmentId = g.Key ?? Guid.Empty,
                DepartmentCode = g.First().DepartmentCode,
                DepartmentName = g.First().DepartmentName,
                VisitCount = g.Count(),
                TotalCost = g.Sum(x => x.TotalAmount),
                InsurancePaid = g.Sum(x => x.InsuranceAmount),
                MedicineCost = g.Sum(x => x.TotalMedicineAmount),
                ServiceCost = g.Sum(x => x.TotalServiceAmount),
            })
            .OrderByDescending(d => d.TotalCost)
            .ToList();
    }

    private static (DateTime from, DateTime to) MonthRange(int month, int year)
    {
        if (month < 1 || month > 12) month = DateTime.UtcNow.Month;
        if (year < 2000) year = DateTime.UtcNow.Year;
        var from = new DateTime(year, month, 1);
        var to = from.AddMonths(1);
        return (from, to);
    }



    public async Task<List<ServiceInsuranceMapDto>> GetServiceMappingsAsync(string? keyword = null)
    {
        var query = _context.InsurancePriceConfigs
            .Where(c => c.ServiceId != null && c.IsActive);

        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(c => c.ItemCode.Contains(keyword) || c.ItemName.Contains(keyword));

        var items = await query.Take(100).ToListAsync();
        return items.Select(c => new ServiceInsuranceMapDto
        {
            Id = c.Id,
            ServiceId = c.ServiceId ?? Guid.Empty,
            ServiceCode = c.ItemCode,
            ServiceName = c.ItemName,
            InsuranceCode = c.ItemCode,
            InsuranceGroupCode = "",
            InsurancePrice = c.InsurancePrice,
            PaymentRatio = (int)c.PaymentRate,
            EffectiveDate = c.EffectiveFrom,
            ExpiredDate = c.EffectiveTo,
            IsActive = c.IsActive
        }).ToList();
    }

    public async Task<ServiceInsuranceMapDto> UpdateServiceMappingAsync(Guid id, ServiceInsuranceMapDto dto)
    {
        var config = await _context.InsurancePriceConfigs.FindAsync(id);
        if (config == null)
            throw new InvalidOperationException($"Service mapping {id} not found");

        config.InsurancePrice = dto.InsurancePrice;
        config.PaymentRate = dto.PaymentRatio;
        config.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();

        return dto;
    }

    public async Task<List<MedicineInsuranceMapDto>> GetMedicineMappingsAsync(string? keyword = null)
    {
        var query = _context.InsurancePriceConfigs
            .Where(c => c.MedicineId != null && c.IsActive);

        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(c => c.ItemCode.Contains(keyword) || c.ItemName.Contains(keyword));

        var items = await query.Take(100).ToListAsync();
        return items.Select(c => new MedicineInsuranceMapDto
        {
            Id = c.Id,
            MedicineId = c.MedicineId ?? Guid.Empty,
            MedicineCode = c.ItemCode,
            MedicineName = c.ItemName,
            InsuranceCode = c.ItemCode,
            InsuranceGroupCode = "",
            InsurancePrice = c.InsurancePrice,
            PaymentRatio = (int)c.PaymentRate,
            EffectiveDate = c.EffectiveFrom,
            ExpiredDate = c.EffectiveTo,
            IsActive = c.IsActive
        }).ToList();
    }

    public async Task<MedicineInsuranceMapDto> UpdateMedicineMappingAsync(Guid id, MedicineInsuranceMapDto dto)
    {
        var config = await _context.InsurancePriceConfigs.FindAsync(id);
        if (config == null)
            throw new InvalidOperationException($"Medicine mapping {id} not found");

        config.InsurancePrice = dto.InsurancePrice;
        config.PaymentRate = dto.PaymentRatio;
        config.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();

        return dto;
    }

    // ════════════════════════════════════════════════════════════════════════════════════════
    // Nhập danh mục BHYT — #218/T3
    //
    // Hai hàm nhập trước đây trả cứng `{ TotalRows = 0, SuccessRows = 0, FailedRows = 0 }` không kèm
    // lỗi nào. Cách phản hồi ấy đáng nói riêng: nó đọc ra thành "file của bạn rỗng", chứ không phải
    // "chức năng này chưa làm gì". Người quản trị nhập danh mục theo một quyết định mới của Bộ, thấy
    // 0 dòng, sẽ đi kiểm tra lại file của mình. Một hàm rỗng IM LẶNG còn đỡ hơn một hàm rỗng ĐỔ LỖI
    // CHO DỮ LIỆU NGƯỜI DÙNG.
    //
    // `InsurancePriceConfigs` có sẵn `EffectiveFrom`/`EffectiveTo`/`DecisionNumber` — giá BHYT được
    // thiết kế để CÓ PHIÊN BẢN theo ngày hiệu lực, vì hồ sơ thanh toán tháng trước phải được giám
    // định theo giá tháng trước. Nên nhập giá mới ĐÓNG bản cũ và MỞ bản mới, không ghi đè: ghi đè là
    // xoá mất căn cứ của mọi hồ sơ đã gửi.
    // ════════════════════════════════════════════════════════════════════════════════════════

    private static readonly string[] CatalogColumns =
        { "ItemCode", "ItemName", "Unit", "InsurancePrice", "PaymentRate", "EffectiveFrom", "DecisionNumber" };

    /// <summary>
    /// Tách file CSV thành các dòng ô. Dự án không có thư viện đọc Excel/CSV nào nên tự tách; đủ dùng
    /// cho tệp danh mục BHYT xuất ra CSV (có hỗ trợ ô bọc trong dấu nháy kép).
    /// </summary>
    private static List<string> SplitCsvLine(string line)
    {
        var cells = new List<string>();
        var sb = new StringBuilder();
        bool inQuote = false;
        for (int i = 0; i < line.Length; i++)
        {
            var c = line[i];
            if (inQuote)
            {
                if (c == '"' && i + 1 < line.Length && line[i + 1] == '"') { sb.Append('"'); i++; }
                else if (c == '"') inQuote = false;
                else sb.Append(c);
            }
            else if (c == '"') inQuote = true;
            else if (c == ',') { cells.Add(sb.ToString().Trim()); sb.Clear(); }
            else sb.Append(c);
        }
        cells.Add(sb.ToString().Trim());
        return cells;
    }

    /// <summary>
    /// Nhập một tệp danh mục giá BHYT. <paramref name="isMedicine"/> quyết định đối chiếu mã sang
    /// `Medicines` hay `Services`.
    /// </summary>
    private async Task<ImportResultDto> ImportCatalogAsync(byte[] fileContent, bool isMedicine)
    {
        var result = new ImportResultDto();

        if (fileContent == null || fileContent.Length == 0)
            throw new InvalidOperationException("Chưa chọn tệp danh mục để nhập.");

        string text;
        try
        {
            text = new UTF8Encoding(false, throwOnInvalidBytes: true)
                .GetString(fileContent).TrimStart('﻿');
        }
        catch (Exception)
        {
            // Trước đây chỗ này trả "0 dòng" và người dùng đi kiểm tra lại file của mình.
            throw new InvalidOperationException(
                "Không đọc được nội dung tệp. Danh mục phải là tệp CSV mã hoá UTF-8, "
                + "cột: " + string.Join(", ", CatalogColumns) + ".");
        }

        var lines = text.Replace("\r\n", "\n").Split('\n')
            .Where(l => !string.IsNullOrWhiteSpace(l)).ToList();
        if (lines.Count == 0)
            throw new InvalidOperationException("Tệp danh mục rỗng.");

        var header = SplitCsvLine(lines[0]);
        var thieuCot = CatalogColumns
            .Where(c => !header.Any(h => string.Equals(h, c, StringComparison.OrdinalIgnoreCase)))
            .ToList();
        if (thieuCot.Count > 0)
            throw new InvalidOperationException(
                $"Tệp thiếu cột bắt buộc: {string.Join(", ", thieuCot)}. "
                + "Dòng đầu tiên phải là dòng tiêu đề cột.");

        int Idx(string name) => header.FindIndex(h => string.Equals(h, name, StringComparison.OrdinalIgnoreCase));
        int iCode = Idx("ItemCode"), iName = Idx("ItemName"), iUnit = Idx("Unit"),
            iPrice = Idx("InsurancePrice"), iRate = Idx("PaymentRate"),
            iFrom = Idx("EffectiveFrom"), iQd = Idx("DecisionNumber");

        var now = DateTime.Now;
        for (int r = 1; r < lines.Count; r++)
        {
            result.TotalRows++;
            var soDong = r + 1; // số dòng trong tệp, tính cả dòng tiêu đề — để người dùng mở ra sửa
            var cells = SplitCsvLine(lines[r]);

            string Cell(int i) => i >= 0 && i < cells.Count ? cells[i] : string.Empty;

            void Loi(string cot, string thongBao)
            {
                result.FailedRows++;
                result.Errors.Add(new ImportError
                {
                    RowNumber = soDong,
                    ColumnName = cot,
                    ErrorMessage = thongBao,
                });
            }

            var code = Cell(iCode);
            if (string.IsNullOrWhiteSpace(code)) { Loi("ItemCode", "Thiếu mã danh mục."); continue; }
            if (string.IsNullOrWhiteSpace(Cell(iName))) { Loi("ItemName", "Thiếu tên danh mục."); continue; }

            if (!decimal.TryParse(Cell(iPrice), System.Globalization.NumberStyles.Any,
                                  System.Globalization.CultureInfo.InvariantCulture, out var gia)
                || gia < 0)
            { Loi("InsurancePrice", "Giá BHYT không hợp lệ hoặc bỏ trống."); continue; }

            if (!decimal.TryParse(Cell(iRate), System.Globalization.NumberStyles.Any,
                                  System.Globalization.CultureInfo.InvariantCulture, out var tyLe)
                || tyLe < 0 || tyLe > 100)
            { Loi("PaymentRate", "Tỷ lệ thanh toán phải trong khoảng 0-100."); continue; }

            if (!DateTime.TryParse(Cell(iFrom), System.Globalization.CultureInfo.InvariantCulture,
                                   System.Globalization.DateTimeStyles.None, out var hieuLucTu))
            { Loi("EffectiveFrom", "Ngày hiệu lực không hợp lệ (định dạng yyyy-MM-dd)."); continue; }

            var qd = Cell(iQd);

            // Đóng bản giá đang hiệu lực của cùng mã, thay vì ghi đè lên nó.
            var dangHieuLuc = await _context.InsurancePriceConfigs
                .Where(c => !c.IsDeleted && c.IsActive && c.ItemCode == code)
                .ToListAsync();
            foreach (var cu in dangHieuLuc)
            {
                cu.IsActive = false;
                cu.EffectiveTo = hieuLucTu.AddDays(-1);
                cu.UpdatedAt = now;
            }

            Guid? medicineId = null, serviceId = null;
            if (isMedicine)
                medicineId = await _context.Medicines
                    .Where(m => !m.IsDeleted && m.MedicineCode == code)
                    .Select(m => (Guid?)m.Id).FirstOrDefaultAsync();
            else
                serviceId = await _context.Services
                    .Where(s => !s.IsDeleted && s.ServiceCode == code)
                    .Select(s => (Guid?)s.Id).FirstOrDefaultAsync();

            _context.InsurancePriceConfigs.Add(new InsurancePriceConfig
            {
                Id = Guid.NewGuid(),
                MedicineId = medicineId,
                ServiceId = serviceId,
                ItemCode = code,
                ItemName = Cell(iName),
                Unit = Cell(iUnit),
                InsurancePrice = gia,
                PaymentRate = tyLe,
                IsActive = true,
                EffectiveFrom = hieuLucTu,
                DecisionNumber = string.IsNullOrWhiteSpace(qd) ? null : qd,
                DecisionDate = string.IsNullOrWhiteSpace(qd) ? null : hieuLucTu,
                CreatedAt = now,
            });
            result.SuccessRows++;
        }

        await _context.SaveChangesAsync();
        _logger?.LogInformation(
            "Nhập danh mục BHYT ({Loai}): {Tong} dòng, {Ok} thành công, {Hong} hỏng",
            isMedicine ? "thuốc" : "dịch vụ", result.TotalRows, result.SuccessRows, result.FailedRows);
        return result;
    }

    public Task<ImportResultDto> ImportMedicineCatalogAsync(byte[] fileContent)
        => ImportCatalogAsync(fileContent, isMedicine: true);

    public Task<ImportResultDto> ImportServiceCatalogAsync(byte[] fileContent)
        => ImportCatalogAsync(fileContent, isMedicine: false);

    /// <summary>
    /// #218/T3 — hàm này trước đây là `return dto;`: báo cập nhật giá hàng loạt thành công mà không
    /// đổi giá nào.
    ///
    /// <para>Cố ý **KHÔNG tự cài** thay vì cài đoán: <see cref="InsurancePriceUpdateBatchDto"/> chỉ
    /// mang phần đầu của đợt (mã đợt, số quyết định, ngày hiệu lực, số lượng) và **không có danh sách
    /// dòng giá nào** — không có gì để áp. Đoán ra nguồn giá thì dễ dựng sai luồng tiền hơn là để
    /// nguyên. Đường đi đúng đã có: nhập tệp danh mục qua
    /// <see cref="ImportMedicineCatalogAsync"/> / <see cref="ImportServiceCatalogAsync"/>.</para>
    ///
    /// <para>Nay báo lỗi rõ ràng thay vì báo thành công suông — để người dùng biết mình chưa cập nhật
    /// được giá nào, đúng bài học của cả đợt này.</para>
    /// </summary>
    public Task<InsurancePriceUpdateBatchDto> UpdateInsurancePricesAsync(InsurancePriceUpdateBatchDto dto)
        => throw new InvalidOperationException(
            "Cập nhật giá BHYT theo đợt chưa dùng được: phiếu đợt không mang danh sách dòng giá. "
            + "Hãy nhập tệp danh mục qua chức năng \"Nhập danh mục thuốc/dịch vụ BHYT\".");

    public async Task<List<IcdInsuranceMapDto>> GetValidIcdCodesAsync(string? keyword = null)
    {
        var query = _context.IcdInsuranceMaps
            .Where(m => !m.IsDeleted && m.IsActive && m.IsCovered
                        && (m.EffectiveTo == null || m.EffectiveTo >= DateTime.UtcNow));
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var k = keyword.Trim();
            query = query.Where(m => m.IcdCode.Contains(k) || m.IcdName.Contains(k));
        }
        var rows = await query.OrderBy(m => m.IcdCode).Take(500).ToListAsync();
        return rows.Select(m => new IcdInsuranceMapDto
        {
            IcdCode = m.IcdCode,
            IcdName = m.IcdName,
            IsValidForOutpatient = true,
            IsValidForInpatient = true,
        }).ToList();
    }



    public async Task<InsurancePortalConfigDto> GetPortalConfigAsync()
    {
        return new InsurancePortalConfigDto
        {
            PortalUrl = "https://gdbhyt.baohiemxahoi.gov.vn",
            Username = "",
            CertificatePath = "",
            TimeoutSeconds = 60,
            TestMode = true
        };
    }

    public async Task<InsurancePortalConfigDto> UpdatePortalConfigAsync(InsurancePortalConfigDto config)
    {
        return config;
    }

    public async Task<PortalConnectionTestResult> TestPortalConnectionAsync()
    {
        var startTime = DateTime.UtcNow;
        try
        {
            var isConnected = await _gatewayClient.TestConnectionAsync();
            var elapsed = (int)(DateTime.UtcNow - startTime).TotalMilliseconds;

            return new PortalConnectionTestResult
            {
                IsConnected = isConnected,
                ResponseTimeMs = elapsed,
                ErrorMessage = isConnected ? null : "Ket noi that bai - vui long kiem tra thong tin dang nhap",
                TestedAt = DateTime.Now
            };
        }
        catch (Exception ex)
        {
            var elapsed = (int)(DateTime.UtcNow - startTime).TotalMilliseconds;
            _logger.LogWarning(ex, "BHXH gateway connection test failed");

            return new PortalConnectionTestResult
            {
                IsConnected = false,
                ResponseTimeMs = elapsed,
                ErrorMessage = $"Loi ket noi: {ex.Message}",
                TestedAt = DateTime.Now
            };
        }
    }

    public async Task<FacilityInfoDto> GetFacilityInfoAsync()
    {
        return new FacilityInfoDto
        {
            MaCsKcb = "01001",
            TenCsKcb = "Benh vien Da khoa",
            DiaChi = "",
            MaTinh = "01",
            MaHuyen = "001",
            HangBenhVien = 2,
            TuyenKcb = 2
        };
    }

    public async Task<FacilityInfoDto> UpdateFacilityInfoAsync(FacilityInfoDto dto)
    {
        return dto;
    }


}
