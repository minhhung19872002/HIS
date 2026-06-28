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
        var endDate = startDate.AddMonths(1).AddDays(-1);

        var claims = await _context.InsuranceClaims
            .Where(c => c.ServiceDate >= startDate && c.ServiceDate <= endDate)
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

    public async Task<ReportC79aDto> GetReportC79aAsync(int month, int year)
    {
        return new ReportC79aDto
        {
            MaCsKcb = "01001",
            TenCsKcb = "Benh vien Da khoa",
            Month = month,
            Year = year,
            Lines = new List<ReportC79aLineDto>(),
            TotalAmount = 0,
            TotalInsuranceAmount = 0
        };
    }

    public async Task<Report80aDto> GetReport80aAsync(int month, int year)
    {
        return new Report80aDto
        {
            MaCsKcb = "01001",
            TenCsKcb = "Benh vien Da khoa",
            Month = month,
            Year = year,
            Details = new List<Report80aDetailDto>(),
            TotalPatients = 0,
            TotalInsuranceAmount = 0
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

            var html = BuildTableReport($"BAO CAO C79-HD THANG {month}/{year}",
                $"Tong BHYT: {report.TotalInsuranceAmount:N0}", DateTime.Now,
                new[] { "STT", "Ten chi tieu", "So luot", "Tien tam ung", "Tien de nghi", "Tien quyet toan" }, rows);
            return Encoding.UTF8.GetBytes(html);
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

            var html = BuildTableReport($"BAO CAO 80a-HD THANG {month}/{year}",
                $"Tong: {report.TotalPatients} benh nhan, BHYT: {report.TotalInsuranceAmount:N0}", DateTime.Now,
                new[] { "STT", "Loai the", "So luot KCB", "So nguoi", "Tien de nghi", "Tien quyet toan" }, rows);
            return Encoding.UTF8.GetBytes(html);
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
            var html = BuildTableReport($"MAU 16/BHYT - CHE PHAM YHCT THANG {month}/{year}",
                $"Tong: {report.TotalItems} loai thuoc YHCT, Tong tien: {report.TotalAmount:N0}", DateTime.Now,
                new[] { "STT", "Ma thuoc", "Ten che pham", "Hoat chat", "DVT",
                         "So luong", "Don gia", "Thanh tien", "Tien BHYT" }, rows);
            return Encoding.UTF8.GetBytes(html);
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
            var html = BuildTableReport($"MAU 17/BHYT - VI THUOC YHCT THANG {month}/{year}",
                $"Tong: {report.TotalItems} vi thuoc YHCT, Tong tien: {report.TotalAmount:N0}", DateTime.Now,
                new[] { "STT", "Ma thuoc", "Ten vi thuoc", "DVT",
                         "So luong", "Don gia", "Thanh tien", "Tien BHYT" }, rows);
            return Encoding.UTF8.GetBytes(html);
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
            var html = BuildTableReport($"MAU 19/BHYT - VAT TU Y TE THANG {month}/{year}",
                $"Tong: {report.TotalItems} loai VTYT, BHYT: {report.TotalInsuranceAmount:N0}", DateTime.Now,
                new[] { "STT", "Ma VTYT", "Ten vat tu", "DVT",
                         "So luong", "Don gia", "Thanh tien", "Tien BHYT", "BN tra" }, rows);
            return Encoding.UTF8.GetBytes(html);
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
            var html = BuildTableReport($"MAU 20/BHYT - THUOC BN BHYT THANG {month}/{year}",
                $"Tong: {report.TotalItems} loai thuoc, BHYT: {report.TotalInsuranceAmount:N0}", DateTime.Now,
                new[] { "STT", "Ma thuoc", "Ten thuoc", "Hoat chat", "DVT",
                         "So luong", "Don gia", "Thanh tien", "Tien BHYT", "BN tra" }, rows);
            return Encoding.UTF8.GetBytes(html);
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
            var html = BuildTableReport($"MAU 21/BHYT - DVKT BN BHYT THANG {month}/{year}",
                $"Tong: {report.TotalItems} loai DVKT, BHYT: {report.TotalInsuranceAmount:N0}", DateTime.Now,
                new[] { "STT", "Ma DVKT", "Ten dich vu", "DVT",
                         "So luong", "Don gia", "Thanh tien", "Tien BHYT", "BN tra" }, rows);
            return Encoding.UTF8.GetBytes(html);
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
            var html = BuildTableReport($"MAU 21/BHYT THEO CV 285/BHXH-CSYT THANG {month}/{year}",
                $"Tong: {report.TotalItems} DVKT, BHYT: {report.TotalInsuranceAmount:N0}", DateTime.Now,
                new[] { "STT", "Nhom DVKT", "Ma DVKT", "Ten dich vu", "DVT",
                         "So luong", "Don gia", "Thanh tien", "Tien BHYT", "BN tra" }, rows);
            return Encoding.UTF8.GetBytes(html);
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
            MaCsKcb = "01001",
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
            var html = BuildTableReport($"BAO CAO C79B-HD THANG {month}/{year}",
                $"Tong {report.TotalVisits} luot ngoai tru, BHYT: {report.TotalInsuranceAmount:N0}", DateTime.Now,
                new[] { "STT", "Nhom DVKT", "So luot", "Tien de nghi", "Tien quyet toan", "Ghi chu" }, rows);
            return Encoding.UTF8.GetBytes(html);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "#190 BHYT report/Excel export failed (see stack for method)");
            throw;
        }
    }

}
