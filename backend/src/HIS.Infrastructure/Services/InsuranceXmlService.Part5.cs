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

    public async Task<MonthlyInsuranceReportDto> GetMonthlyInsuranceReportAsync(int month, int year)
    {
        if (month <= 0 || month > 12) month = DateTime.Now.Month;
        if (year <= 0 || year > 9999) year = DateTime.Now.Year;
        var startDate = new DateTime(year, month, 1);
        var endDate = startDate.AddMonths(1); // EXCLUSIVE: `<= last day 00:00` dropped last-day claims

        var claims = await _context.InsuranceClaims
            .Where(c => c.ServiceDate >= startDate && c.ServiceDate < endDate)
            .ToListAsync();

        return new MonthlyInsuranceReportDto
        {
            Month = month,
            Year = year,
            TotalVisits = claims.Count,
            OutpatientVisits = claims.Count(c => c.TreatmentType == 1),
            InpatientVisits = claims.Count(c => c.TreatmentType == 2),
            EmergencyVisits = claims.Count(c => c.TreatmentType == 3),
            TotalCost = claims.Sum(c => c.TotalAmount),
            InsurancePaid = claims.Sum(c => c.InsuranceAmount),
            PatientPaid = claims.Sum(c => c.PatientAmount),
            TopDiseases = new List<DiseaseStatDto>(),
            TopMedicines = new List<MedicineStatDto>()
        };
    }

    /// <summary>
    /// Facility code in force (the "Cấu hình BHXH" screen first, appsettings second — same source as the
    /// XML export); legacy placeholder only when not configured. Was appsettings only, so a code saved
    /// in the admin screen printed on the XML but not on the C79/80 reports.
    /// </summary>
    private async Task<string> ReportFacilityCodeAsync()
    {
        var code = await ResolveFacilityCodeAsync();
        return !string.IsNullOrWhiteSpace(code) ? code : "01001";
    }

    /// <summary>
    /// Claims of the period with their settled BHYT amount (quyết toán). Settled = requested minus
    /// BHXH rejections (same rule as CalculateReconciliationDifferenceAsync), and only for claims BHXH
    /// has actually processed (2 approved, 3 partially rejected, 5 paid); fully rejected (4) → 0.
    /// </summary>
    private async Task<List<(InsuranceClaim Claim, decimal Settled)>> LoadClaimsWithSettledAsync(
        int month, int year, Func<InsuranceClaim, bool> filter)
    {
        var (from, to) = MonthRange(month, year);
        var claims = (await _context.InsuranceClaims
                .AsNoTracking()
                .Where(c => !c.IsDeleted && c.ServiceDate >= @from && c.ServiceDate < to)
                .ToListAsync())
            .Where(filter)
            .ToList();
        var ids = claims.Select(c => c.Id).ToList();
        var rejectedByClaim = ids.Count == 0
            ? new Dictionary<Guid, decimal>()
            : (await _context.InsuranceRejections
                    .AsNoTracking()
                    .Where(r => !r.IsDeleted && ids.Contains(r.ClaimId))
                    .ToListAsync())
                .GroupBy(r => r.ClaimId)
                .ToDictionary(g => g.Key, g => g.Sum(r => r.RejectedAmount));

        return claims.Select(c =>
        {
            decimal settled = c.ClaimStatus switch
            {
                2 or 3 or 5 => Math.Max(0, c.InsuranceAmount - (rejectedByClaim.TryGetValue(c.Id, out var rj) ? rj : 0)),
                _ => 0m,
            };
            return (c, settled);
        }).ToList();
    }

    public async Task<ReportC79aDto> GetReportC79aAsync(int month, int year)
    {
        // C79a-HD: outpatient (incl. emergency not admitted) claims requested for payment, by route.
        // Was a stub returning no lines and 0 totals although the Insurance page calls it.
        var rows = await LoadClaimsWithSettledAsync(month, year, c => c.TreatmentType != 2);

        static (int Order, string Name) RouteOf(int insuranceType) => insuranceType switch
        {
            1 or 4 => (1, "Người bệnh KCB đúng tuyến"),
            2 => (2, "Người bệnh chuyển tuyến đến (có giấy chuyển)"),
            3 => (3, "Người bệnh trái tuyến (không giấy chuyển)"),
            5 => (4, "Người bệnh thông tuyến"),
            _ => (9, "Khác"),
        };

        var lines = rows
            .GroupBy(r => RouteOf(r.Claim.InsuranceType))
            .OrderBy(g => g.Key.Order)
            .Select((g, i) => new ReportC79aLineDto
            {
                Stt = i + 1,
                TenChiTieu = g.Key.Name,
                SoLuot = g.Count(),
                TienTamUng = 0, // no BHXH advance data is stored
                TienDeNghi = g.Sum(r => r.Claim.InsuranceAmount),
                TienQuyetToan = g.Sum(r => r.Settled),
            })
            .ToList();

        return new ReportC79aDto
        {
            MaCsKcb = await ReportFacilityCodeAsync(),
            TenCsKcb = "Benh vien Da khoa",
            Month = month,
            Year = year,
            Lines = lines,
            TotalAmount = rows.Sum(r => r.Claim.TotalAmount),
            TotalInsuranceAmount = lines.Sum(l => l.TienDeNghi)
        };
    }

    public async Task<Report80aDto> GetReport80aAsync(int month, int year)
    {
        // 80a-HD: inpatient claims requested for payment, grouped by card type (first 3 chars of the
        // BHYT card: object code + benefit level, e.g. DN4, TE1). Was a stub returning 0.
        var rows = await LoadClaimsWithSettledAsync(month, year, c => c.TreatmentType == 2);

        var details = rows
            .GroupBy(r =>
            {
                var card = r.Claim.InsuranceNumber?.Trim() ?? "";
                return card.Length >= 3 ? card.Substring(0, 3).ToUpperInvariant() : "Khác";
            })
            .OrderBy(g => g.Key)
            .Select((g, i) => new Report80aDetailDto
            {
                Stt = i + 1,
                LoaiThe = g.Key,
                SoLuotKcb = g.Count(),
                SoNguoi = g.Select(r => r.Claim.PatientId).Distinct().Count(),
                TienDeNghi = g.Sum(r => r.Claim.InsuranceAmount),
                TienQuyetToan = g.Sum(r => r.Settled),
            })
            .ToList();

        return new Report80aDto
        {
            MaCsKcb = await ReportFacilityCodeAsync(),
            TenCsKcb = "Benh vien Da khoa",
            Month = month,
            Year = year,
            Details = details,
            TotalPatients = rows.Select(r => r.Claim.PatientId).Distinct().Count(),
            TotalInsuranceAmount = details.Sum(d => d.TienDeNghi)
        };
    }

    public async Task<byte[]> ExportReportC79aToExcelAsync(int month, int year)
    {
        try
        {
            var report = await GetReportC79aAsync(month, year);
            var rows = report.Lines?.Select(d => new string[] {
                d.Stt.ToString(), d.TenChiTieu ?? "", d.SoLuot.ToString(),
                d.TienTamUng.ToString("N0"), d.TienDeNghi.ToString("N0"), d.TienQuyetToan.ToString("N0")
            }).ToList() ?? new List<string[]>();

            // QA-R10: real .xlsx (was printable HTML served as .xlsx - Excel refused to open it).
            return Export.ReportFileRenderer.TableToXlsx($"BAO CAO C79-HD THANG {month}/{year}", new[] { "STT", "Ten chi tieu", "So luot", "Tien tam ung", "Tien de nghi", "Tien quyet toan" }, rows);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "#190 BHYT report/Excel export failed (see stack for method)");
            throw;
        }
    }

    public async Task<byte[]> ExportReport80aToExcelAsync(int month, int year)
    {
        try
        {
            var report = await GetReport80aAsync(month, year);
            var rows = report.Details?.Select(d => new string[] {
                d.Stt.ToString(), d.LoaiThe ?? "", d.SoLuotKcb.ToString(),
                d.SoNguoi.ToString(), d.TienDeNghi.ToString("N0"), d.TienQuyetToan.ToString("N0")
            }).ToList() ?? new List<string[]>();

            // QA-R10: real .xlsx (was printable HTML served as .xlsx - Excel refused to open it).
            return Export.ReportFileRenderer.TableToXlsx($"BAO CAO 80a-HD THANG {month}/{year}", new[] { "STT", "Loai the", "So luot KCB", "So nguoi", "Tien de nghi", "Tien quyet toan" }, rows);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "#190 BHYT report/Excel export failed (see stack for method)");
            throw;
        }
    }

    // =========================================================================
    // Mẫu 16/BHYT - Chế phẩm YHCT
    // =========================================================================

    public async Task<Report16BhytDto> GetReport16BhytAsync(int month, int year)
    {
        var (from, to) = MonthRange(month, year);

        // Lấy chi tiết thuốc YHCT (MedicineType=2) từ đơn thuốc của bệnh nhân BHYT trong tháng
        var rows = await _context.PrescriptionDetails
            .Include(d => d.Medicine)
            .Include(d => d.Prescription)
                .ThenInclude(p => p.MedicalRecord)
                    .ThenInclude(m => m!.Patient)
            .Where(d => !d.IsDeleted
                && d.Medicine != null
                && d.Medicine.MedicineType == 2
                && d.Prescription != null
                && d.Prescription.MedicalRecord != null
                && d.Prescription.MedicalRecord.Patient != null
                && !string.IsNullOrEmpty(d.Prescription.MedicalRecord.Patient.InsuranceNumber)
                && d.Prescription.PrescriptionDate >= from
                && d.Prescription.PrescriptionDate < to)
            .Select(d => new
            {
                d.MedicineId,
                d.Medicine!.MedicineCode,
                d.Medicine.MedicineName,
                HoatChat = d.Medicine.ActiveIngredient ?? "",
                DonVi = d.Medicine.Unit ?? "",
                DonGia = d.Medicine.InsurancePrice,
                d.Quantity,
                d.Amount,
                d.Medicine.InsurancePaymentRate,  // int, tính % sau ToListAsync
            })
            .ToListAsync();

        var grouped = rows.GroupBy(r => r.MedicineId)
            .OrderBy(g => g.First().MedicineName)
            .Select((g, i) => new Report16BhytLineDto
            {
                Stt = i + 1,
                MaThuoc = g.First().MedicineCode,
                TenThuoc = g.First().MedicineName,
                HoatChat = g.First().HoatChat,
                DonViTinh = g.First().DonVi,
                SoLuong = g.Sum(x => x.Quantity),
                DonGia = g.First().DonGia,
                ThanhTien = g.Sum(x => x.Amount),
                TienBhyt = g.Sum(x => x.Amount * x.InsurancePaymentRate / 100m),
            })
            .ToList();

        return new Report16BhytDto
        {
            Month = month,
            Year = year,
            TotalItems = grouped.Count,
            TotalAmount = grouped.Sum(l => l.ThanhTien),
            Lines = grouped,
        };
    }

    public async Task<byte[]> ExportReport16BhytToExcelAsync(int month, int year)
    {
        try
        {
            var report = await GetReport16BhytAsync(month, year);
            var rows = report.Lines.Select(d => new string[]
            {
                d.Stt.ToString(), d.MaThuoc, d.TenThuoc, d.HoatChat, d.DonViTinh,
                d.SoLuong.ToString("N0"), d.DonGia.ToString("N0"),
                d.ThanhTien.ToString("N0"), d.TienBhyt.ToString("N0"),
            }).ToList();
            // QA-R10: real .xlsx (was printable HTML served as .xlsx - Excel refused to open it).
            return Export.ReportFileRenderer.TableToXlsx($"MAU 16/BHYT - CHE PHAM YHCT THANG {month}/{year}", new[] { "STT", "Ma thuoc", "Ten che pham", "Hoat chat", "DVT",
                         "So luong", "Don gia", "Thanh tien", "Tien BHYT" }, rows);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "#190 BHYT report/Excel export failed (see stack for method)");
            throw;
        }
    }

    // =========================================================================
    // Mẫu 17/BHYT - Vị thuốc YHCT (đơn YHCT PrescriptionType=4)
    // =========================================================================

    public async Task<Report17BhytDto> GetReport17BhytAsync(int month, int year)
    {
        var (from, to) = MonthRange(month, year);

        // Vị thuốc = chi tiết đơn YHCT (PrescriptionType=4) của bệnh nhân BHYT
        var rows = await _context.PrescriptionDetails
            .Include(d => d.Medicine)
            .Include(d => d.Prescription)
                .ThenInclude(p => p.MedicalRecord)
                    .ThenInclude(m => m!.Patient)
            .Where(d => !d.IsDeleted
                && d.Medicine != null
                && d.Prescription != null
                && d.Prescription.PrescriptionType == 4   // YHCT
                && d.Prescription.MedicalRecord != null
                && d.Prescription.MedicalRecord.Patient != null
                && !string.IsNullOrEmpty(d.Prescription.MedicalRecord.Patient.InsuranceNumber)
                && d.Prescription.PrescriptionDate >= from
                && d.Prescription.PrescriptionDate < to)
            .Select(d => new
            {
                d.MedicineId,
                d.Medicine!.MedicineCode,
                d.Medicine.MedicineName,
                DonVi = d.Medicine.Unit ?? "",
                DonGia = d.Medicine.InsurancePrice,
                d.Quantity,
                d.Amount,
                d.Medicine.InsurancePaymentRate,  // int, tính % sau ToListAsync
            })
            .ToListAsync();

        var grouped = rows.GroupBy(r => r.MedicineId)
            .OrderBy(g => g.First().MedicineName)
            .Select((g, i) => new Report17BhytLineDto
            {
                Stt = i + 1,
                MaThuoc = g.First().MedicineCode,
                TenViThuoc = g.First().MedicineName,
                DonViTinh = g.First().DonVi,
                SoLuong = g.Sum(x => x.Quantity),
                DonGia = g.First().DonGia,
                ThanhTien = g.Sum(x => x.Amount),
                TienBhyt = g.Sum(x => x.Amount * x.InsurancePaymentRate / 100m),
            })
            .ToList();

        return new Report17BhytDto
        {
            Month = month,
            Year = year,
            TotalItems = grouped.Count,
            TotalAmount = grouped.Sum(l => l.ThanhTien),
            Lines = grouped,
        };
    }

    public async Task<byte[]> ExportReport17BhytToExcelAsync(int month, int year)
    {
        try
        {
            var report = await GetReport17BhytAsync(month, year);
            var rows = report.Lines.Select(d => new string[]
            {
                d.Stt.ToString(), d.MaThuoc, d.TenViThuoc, d.DonViTinh,
                d.SoLuong.ToString("N0"), d.DonGia.ToString("N0"),
                d.ThanhTien.ToString("N0"), d.TienBhyt.ToString("N0"),
            }).ToList();
            // QA-R10: real .xlsx (was printable HTML served as .xlsx - Excel refused to open it).
            return Export.ReportFileRenderer.TableToXlsx($"MAU 17/BHYT - VI THUOC YHCT THANG {month}/{year}", new[] { "STT", "Ma thuoc", "Ten vi thuoc", "DVT",
                         "So luong", "Don gia", "Thanh tien", "Tien BHYT" }, rows);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "#190 BHYT report/Excel export failed (see stack for method)");
            throw;
        }
    }

    // =========================================================================
    // Mẫu 19/BHYT - Vật tư y tế BHYT
    // =========================================================================

    public async Task<Report19BhytDto> GetReport19BhytAsync(int month, int year)
    {
        var (from, to) = MonthRange(month, year);

        var rows = await (
            from c in _context.InsuranceClaims
            where !c.IsDeleted && c.ServiceDate >= @from && c.ServiceDate < to
            join d in _context.InsuranceClaimDetails on c.Id equals d.ClaimId
            where d.ItemType == 3 && !d.IsDeleted  // ItemType=3: Vật tư
            select new
            {
                d.ItemCode,
                d.ItemName,
                d.Unit,
                d.Quantity,
                d.UnitPrice,
                d.Amount,
                d.InsuranceAmount,
                d.PatientAmount,
            }).ToListAsync();

        var grouped = rows.GroupBy(r => r.ItemCode)
            .OrderBy(g => g.Key)
            .Select((g, i) => new Report19BhytLineDto
            {
                Stt = i + 1,
                MaVatTu = g.Key,
                TenVatTu = g.First().ItemName,
                DonViTinh = g.First().Unit ?? "",
                SoLuong = g.Sum(x => x.Quantity),
                DonGia = g.First().UnitPrice,
                ThanhTien = g.Sum(x => x.Amount),
                TienBhyt = g.Sum(x => x.InsuranceAmount),
                TienBenhNhan = g.Sum(x => x.PatientAmount),
            })
            .ToList();

        return new Report19BhytDto
        {
            Month = month,
            Year = year,
            TotalItems = grouped.Count,
            TotalAmount = grouped.Sum(l => l.ThanhTien),
            TotalInsuranceAmount = grouped.Sum(l => l.TienBhyt),
            Lines = grouped,
        };
    }

    public async Task<byte[]> ExportReport19BhytToExcelAsync(int month, int year)
    {
        try
        {
            var report = await GetReport19BhytAsync(month, year);
            var rows = report.Lines.Select(d => new string[]
            {
                d.Stt.ToString(), d.MaVatTu, d.TenVatTu, d.DonViTinh,
                d.SoLuong.ToString("N0"), d.DonGia.ToString("N0"),
                d.ThanhTien.ToString("N0"), d.TienBhyt.ToString("N0"), d.TienBenhNhan.ToString("N0"),
            }).ToList();
            // QA-R10: real .xlsx (was printable HTML served as .xlsx - Excel refused to open it).
            return Export.ReportFileRenderer.TableToXlsx($"MAU 19/BHYT - VAT TU Y TE THANG {month}/{year}", new[] { "STT", "Ma VTYT", "Ten vat tu", "DVT",
                         "So luong", "Don gia", "Thanh tien", "Tien BHYT", "BN tra" }, rows);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "#190 BHYT report/Excel export failed (see stack for method)");
            throw;
        }
    }

    // =========================================================================
    // Mẫu 20/BHYT - Thuốc sử dụng cho bệnh nhân BHYT
    // =========================================================================

    public async Task<Report20BhytDto> GetReport20BhytAsync(int month, int year)
    {
        var (from, to) = MonthRange(month, year);

        // Join InsuranceClaimDetail (thuoc) + Medicine để lấy hoạt chất
        var rows = await (
            from c in _context.InsuranceClaims
            where !c.IsDeleted && c.ServiceDate >= @from && c.ServiceDate < to
            join d in _context.InsuranceClaimDetails on c.Id equals d.ClaimId
            where d.ItemType == 2 && !d.IsDeleted
            join m in _context.Medicines on d.MedicineId equals m.Id into mj
            from m in mj.DefaultIfEmpty()
            select new
            {
                d.ItemCode,
                d.ItemName,
                HoatChat = m != null ? m.ActiveIngredient ?? "" : "",
                d.Unit,
                d.Quantity,
                d.UnitPrice,
                d.Amount,
                d.InsuranceAmount,
                d.PatientAmount,
            }).ToListAsync();

        var grouped = rows.GroupBy(r => r.ItemCode)
            .OrderBy(g => g.First().ItemName)
            .Select((g, i) => new Report20BhytLineDto
            {
                Stt = i + 1,
                MaThuoc = g.Key,
                TenThuoc = g.First().ItemName,
                HoatChat = g.First().HoatChat,
                DonViTinh = g.First().Unit ?? "",
                SoLuong = g.Sum(x => x.Quantity),
                DonGia = g.First().UnitPrice,
                ThanhTien = g.Sum(x => x.Amount),
                TienBhyt = g.Sum(x => x.InsuranceAmount),
                TienBenhNhan = g.Sum(x => x.PatientAmount),
            })
            .ToList();

        return new Report20BhytDto
        {
            Month = month,
            Year = year,
            TotalItems = grouped.Count,
            TotalAmount = grouped.Sum(l => l.ThanhTien),
            TotalInsuranceAmount = grouped.Sum(l => l.TienBhyt),
            Lines = grouped,
        };
    }

    public async Task<byte[]> ExportReport20BhytToExcelAsync(int month, int year)
    {
        try
        {
            var report = await GetReport20BhytAsync(month, year);
            var rows = report.Lines.Select(d => new string[]
            {
                d.Stt.ToString(), d.MaThuoc, d.TenThuoc, d.HoatChat, d.DonViTinh,
                d.SoLuong.ToString("N0"), d.DonGia.ToString("N0"),
                d.ThanhTien.ToString("N0"), d.TienBhyt.ToString("N0"), d.TienBenhNhan.ToString("N0"),
            }).ToList();
            // QA-R10: real .xlsx (was printable HTML served as .xlsx - Excel refused to open it).
            return Export.ReportFileRenderer.TableToXlsx($"MAU 20/BHYT - THUOC BN BHYT THANG {month}/{year}", new[] { "STT", "Ma thuoc", "Ten thuoc", "Hoat chat", "DVT",
                         "So luong", "Don gia", "Thanh tien", "Tien BHYT", "BN tra" }, rows);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "#190 BHYT report/Excel export failed (see stack for method)");
            throw;
        }
    }

    // =========================================================================
    // Mẫu 21/BHYT - Dịch vụ kỹ thuật cho bệnh nhân BHYT
    // =========================================================================

    public async Task<Report21BhytDto> GetReport21BhytAsync(int month, int year)
    {
        var (from, to) = MonthRange(month, year);

        var rows = await (
            from c in _context.InsuranceClaims
            where !c.IsDeleted && c.ServiceDate >= @from && c.ServiceDate < to
            join d in _context.InsuranceClaimDetails on c.Id equals d.ClaimId
            where d.ItemType == 1 && !d.IsDeleted  // ItemType=1: Dịch vụ
            select new
            {
                d.ItemCode,
                d.ItemName,
                d.Unit,
                d.Quantity,
                d.UnitPrice,
                d.Amount,
                d.InsuranceAmount,
                d.PatientAmount,
            })
            .ToListAsync();

        var grouped = rows.GroupBy(r => r.ItemCode)
            .OrderBy(g => g.First().ItemName)
            .Select((g, i) => new Report21BhytLineDto
            {
                Stt = i + 1,
                MaDvkt = g.Key,
                TenDvkt = g.First().ItemName,
                DonViTinh = g.First().Unit ?? "",
                SoLuong = (int)g.Sum(x => x.Quantity),
                DonGia = g.First().UnitPrice,
                ThanhTien = g.Sum(x => x.Amount),
                TienBhyt = g.Sum(x => x.InsuranceAmount),
                TienBenhNhan = g.Sum(x => x.PatientAmount),
            })
            .ToList();

        return new Report21BhytDto
        {
            Month = month,
            Year = year,
            TotalItems = grouped.Count,
            TotalAmount = grouped.Sum(l => l.ThanhTien),
            TotalInsuranceAmount = grouped.Sum(l => l.TienBhyt),
            Lines = grouped,
        };
    }

    public async Task<byte[]> ExportReport21BhytToExcelAsync(int month, int year)
    {
        try
        {
            var report = await GetReport21BhytAsync(month, year);
            var rows = report.Lines.Select(d => new string[]
            {
                d.Stt.ToString(), d.MaDvkt, d.TenDvkt, d.DonViTinh,
                d.SoLuong.ToString("N0"), d.DonGia.ToString("N0"),
                d.ThanhTien.ToString("N0"), d.TienBhyt.ToString("N0"), d.TienBenhNhan.ToString("N0"),
            }).ToList();
            // QA-R10: real .xlsx (was printable HTML served as .xlsx - Excel refused to open it).
            return Export.ReportFileRenderer.TableToXlsx($"MAU 21/BHYT - DVKT BN BHYT THANG {month}/{year}", new[] { "STT", "Ma DVKT", "Ten dich vu", "DVT",
                         "So luong", "Don gia", "Thanh tien", "Tien BHYT", "BN tra" }, rows);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "#190 BHYT report/Excel export failed (see stack for method)");
            throw;
        }
    }

    // =========================================================================
    // Mẫu 285/BHXH - DVKT kèm nhóm dịch vụ (CV 285/BHXH-CSYT)
    // =========================================================================

    public async Task<Report285BhytDto> GetReport285BhytAsync(int month, int year)
    {
        var (from, to) = MonthRange(month, year);

        // Join explicit để lấy ServiceGroup.GroupName
        var rows = await (
            from c in _context.InsuranceClaims
            where !c.IsDeleted && c.ServiceDate >= @from && c.ServiceDate < to
            join d in _context.Set<InsuranceClaimDetail>() on c.Id equals d.ClaimId
            where d.ItemType == 1 && !d.IsDeleted
            join svc in _context.Services on d.ServiceId equals svc.Id into sj
            from svc in sj.DefaultIfEmpty()
            join grp in _context.ServiceGroups on svc.ServiceGroupId equals grp.Id into gj
            from grp in gj.DefaultIfEmpty()
            select new
            {
                d.ItemCode,
                d.ItemName,
                d.Unit,
                d.Quantity,
                d.UnitPrice,
                d.Amount,
                d.InsuranceAmount,
                d.PatientAmount,
                NhomDvkt = grp != null ? grp.GroupName : "Khac",
            }).ToListAsync();

        var grouped = rows.GroupBy(r => r.ItemCode)
            .OrderBy(g => g.First().NhomDvkt).ThenBy(g => g.First().ItemName)
            .Select((g, i) => new Report285BhytLineDto
            {
                Stt = i + 1,
                NhomDvkt = g.First().NhomDvkt,
                MaDvkt = g.Key,
                TenDvkt = g.First().ItemName,
                DonViTinh = g.First().Unit ?? "",
                SoLuong = (int)g.Sum(x => x.Quantity),
                DonGia = g.First().UnitPrice,
                ThanhTien = g.Sum(x => x.Amount),
                TienBhyt = g.Sum(x => x.InsuranceAmount),
                TienBenhNhan = g.Sum(x => x.PatientAmount),
            })
            .ToList();

        return new Report285BhytDto
        {
            Month = month,
            Year = year,
            TotalItems = grouped.Count,
            TotalAmount = grouped.Sum(l => l.ThanhTien),
            TotalInsuranceAmount = grouped.Sum(l => l.TienBhyt),
            Lines = grouped,
        };
    }

    public async Task<byte[]> ExportReport285BhytToExcelAsync(int month, int year)
    {
        try
        {
            var report = await GetReport285BhytAsync(month, year);
            var rows = report.Lines.Select(d => new string[]
            {
                d.Stt.ToString(), d.NhomDvkt, d.MaDvkt, d.TenDvkt, d.DonViTinh,
                d.SoLuong.ToString("N0"), d.DonGia.ToString("N0"),
                d.ThanhTien.ToString("N0"), d.TienBhyt.ToString("N0"), d.TienBenhNhan.ToString("N0"),
            }).ToList();
            // QA-R10: real .xlsx (was printable HTML served as .xlsx - Excel refused to open it).
            return Export.ReportFileRenderer.TableToXlsx($"MAU 21/BHYT THEO CV 285/BHXH-CSYT THANG {month}/{year}", new[] { "STT", "Nhom DVKT", "Ma DVKT", "Ten dich vu", "DVT",
                         "So luong", "Don gia", "Thanh tien", "Tien BHYT", "BN tra" }, rows);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "#190 BHYT report/Excel export failed (see stack for method)");
            throw;
        }
    }

    // =========================================================================
    // C79B-HD - Tổng hợp ngoại trú bản B (phân nhóm DVKT)
    // =========================================================================

    public async Task<ReportC79bDto> GetReportC79bAsync(int month, int year)
    {
        var (from, to) = MonthRange(month, year);

        // Ngoại trú: TreatmentType=1, phân nhóm theo ServiceGroup (join explicit)
        var rows = await (
            from c in _context.InsuranceClaims
            where !c.IsDeleted && c.TreatmentType == 1
                && c.ServiceDate >= @from && c.ServiceDate < to
            join d in _context.Set<InsuranceClaimDetail>() on c.Id equals d.ClaimId
            where d.ItemType == 1 && !d.IsDeleted
            join svc in _context.Services on d.ServiceId equals svc.Id into sj
            from svc in sj.DefaultIfEmpty()
            join grp in _context.ServiceGroups on svc.ServiceGroupId equals grp.Id into gj
            from grp in gj.DefaultIfEmpty()
            select new
            {
                NhomDvkt = grp != null ? grp.GroupName : "Kham benh",
                d.Quantity,
                d.Amount,
                d.InsuranceAmount,
            }).ToListAsync();

        var grouped = rows.GroupBy(r => r.NhomDvkt)
            .OrderBy(g => g.Key)
            .Select((g, i) => new ReportC79bLineDto
            {
                Stt = i + 1,
                NhomDvkt = g.Key,
                SoLuot = (int)g.Sum(x => x.Quantity),
                TienDeNghi = g.Sum(x => x.Amount),
                TienQuyetToan = g.Sum(x => x.InsuranceAmount),
                GhiChu = "",
            })
            .ToList();

        // Tổng số lượt = số claim ngoại trú
        var totalVisits = await _context.InsuranceClaims
            .CountAsync(c => !c.IsDeleted && c.TreatmentType == 1
                && c.ServiceDate >= @from && c.ServiceDate < to);

        return new ReportC79bDto
        {
            MaCsKcb = await ReportFacilityCodeAsync(),
            TenCsKcb = "Benh vien Da khoa",
            Month = month,
            Year = year,
            Lines = grouped,
            TotalAmount = grouped.Sum(l => l.TienDeNghi),
            TotalInsuranceAmount = grouped.Sum(l => l.TienQuyetToan),
            TotalVisits = totalVisits,
        };
    }

    public async Task<byte[]> ExportReportC79bToExcelAsync(int month, int year)
    {
        try
        {
            var report = await GetReportC79bAsync(month, year);
            var rows = report.Lines.Select(d => new string[]
            {
                d.Stt.ToString(), d.NhomDvkt, d.SoLuot.ToString("N0"),
                d.TienDeNghi.ToString("N0"), d.TienQuyetToan.ToString("N0"), d.GhiChu,
            }).ToList();
            // QA-R10: real .xlsx (was printable HTML served as .xlsx - Excel refused to open it).
            return Export.ReportFileRenderer.TableToXlsx($"BAO CAO C79B-HD THANG {month}/{year}", new[] { "STT", "Nhom DVKT", "So luot", "Tien de nghi", "Tien quyet toan", "Ghi chu" }, rows);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "#190 BHYT report/Excel export failed (see stack for method)");
            throw;
        }
    }

}
