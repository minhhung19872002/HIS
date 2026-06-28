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

    public async Task<ImportResultDto> ImportMedicineCatalogAsync(byte[] fileContent)
    {
        return new ImportResultDto { TotalRows = 0, SuccessRows = 0, FailedRows = 0, Errors = new List<ImportError>() };
    }

    public async Task<ImportResultDto> ImportServiceCatalogAsync(byte[] fileContent)
    {
        return new ImportResultDto { TotalRows = 0, SuccessRows = 0, FailedRows = 0, Errors = new List<ImportError>() };
    }

    public async Task<InsurancePriceUpdateBatchDto> UpdateInsurancePricesAsync(InsurancePriceUpdateBatchDto dto)
    {
        return dto;
    }

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
