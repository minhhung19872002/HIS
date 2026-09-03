using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Billing;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

// #364 wave-8b (2026-07-17): tach 10.4 Statistics & Insurance + 10.5 Dao but toan dich vu khoi BillingCompleteService.AdminReports.cs
public partial class BillingCompleteService {

    #region 10.4 Statistics & Insurance

    public async Task<BillingStatisticsDto> GetBillingStatisticsAsync(BillingStatisticsRequestDto dto)
    {
        try
        {
            var receiptsQuery = _context.Receipts
                .Include(r => r.MedicalRecord)
                .Where(r => r.ReceiptDate >= dto.FromDate && r.ReceiptDate <= dto.ToDate && r.Status == 1);

            if (dto.DepartmentId.HasValue)
                receiptsQuery = receiptsQuery.Where(r => r.MedicalRecord != null && r.MedicalRecord.DepartmentId == dto.DepartmentId);

            var receipts = await receiptsQuery.ToListAsync();

            var serviceRequests = await _context.ServiceRequests
                .Where(sr => sr.RequestDate >= dto.FromDate && sr.RequestDate <= dto.ToDate && sr.Status != 4)
                .ToListAsync();

            var deposits = await _context.Deposits
                .Where(d => d.ReceiptDate >= dto.FromDate && d.ReceiptDate <= dto.ToDate)
                .ToListAsync();

            var outpatientReceipts = receipts.Where(r => r.MedicalRecord?.TreatmentType == 1).ToList();
            var inpatientReceipts = receipts.Where(r => r.MedicalRecord?.TreatmentType == 2).ToList();
            var totalRevenue = receipts.Where(r => r.ReceiptType != 3).Sum(r => r.FinalAmount)
                             - receipts.Where(r => r.ReceiptType == 3).Sum(r => r.FinalAmount);

            var result = new BillingStatisticsDto
            {
                FromDate = dto.FromDate,
                ToDate = dto.ToDate,
                TotalPatients = receipts.Select(r => r.PatientId).Distinct().Count(),
                OutpatientCount = outpatientReceipts.Select(r => r.PatientId).Distinct().Count(),
                InpatientCount = inpatientReceipts.Select(r => r.PatientId).Distinct().Count(),
                TotalRevenue = totalRevenue,
                ServiceRevenue = serviceRequests.Where(sr => sr.RequestType != 0).Sum(sr => sr.TotalAmount),
                InsuranceRevenue = serviceRequests.Sum(sr => sr.InsuranceAmount),
                PatientRevenue = serviceRequests.Sum(sr => sr.PatientAmount),
                TotalDeposit = deposits.Where(d => d.Status != 3).Sum(d => d.Amount),
                DepositUsed = deposits.Sum(d => d.UsedAmount),
                DepositRefund = deposits.Where(d => d.Status == 3).Sum(d => d.Amount),
                TotalDebt = serviceRequests.Where(sr => !sr.IsPaid).Sum(sr => sr.PatientAmount)
            };

            if (dto.IncludeDailyTrend)
            {
                result.DailyTrend = receipts
                    .GroupBy(r => r.ReceiptDate.Date)
                    .Select(g => new DailyRevenueItemDto
                    {
                        Date = g.Key,
                        PatientCount = g.Select(r => r.PatientId).Distinct().Count(),
                        InvoiceCount = g.Count(),
                        TotalAmount = g.Where(r => r.ReceiptType != 3).Sum(r => r.FinalAmount)
                                     - g.Where(r => r.ReceiptType == 3).Sum(r => r.FinalAmount)
                    })
                    .OrderBy(d => d.Date)
                    .ToList();
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetBillingStatisticsAsync failed {From}-{To}", dto.FromDate, dto.ToDate);
            return new BillingStatisticsDto { FromDate = dto.FromDate, ToDate = dto.ToDate, IsError = true, ErrorMessage = ex.Message };
        }
    }

    public async Task<DailyRevenueReportDto> GetDailyRevenueAsync(DateTime date)
    {
        try
        {
            var dayStart = date.Date;
            var dayEnd = dayStart.AddDays(1);

            var receipts = await _context.Receipts
                .Include(r => r.MedicalRecord)
                .Where(r => r.ReceiptDate >= dayStart && r.ReceiptDate < dayEnd && r.Status == 1)
                .ToListAsync();

            var deposits = await _context.Deposits
                .Where(d => d.ReceiptDate >= dayStart && d.ReceiptDate < dayEnd && d.Status != 3)
                .ToListAsync();

            var outpatient = receipts.Where(r => r.MedicalRecord?.TreatmentType == 1).ToList();
            var inpatient = receipts.Where(r => r.MedicalRecord?.TreatmentType == 2).ToList();

            var refunds = receipts.Where(r => r.ReceiptType == 3).ToList();

            return new DailyRevenueReportDto
            {
                Date = date.Date,
                OutpatientCount = outpatient.Select(r => r.PatientId).Distinct().Count(),
                OutpatientRevenue = outpatient.Where(r => r.ReceiptType != 3).Sum(r => r.FinalAmount),
                InpatientCount = inpatient.Select(r => r.PatientId).Distinct().Count(),
                InpatientRevenue = inpatient.Where(r => r.ReceiptType != 3).Sum(r => r.FinalAmount),
                DepositCount = deposits.Count,
                DepositAmount = deposits.Sum(d => d.Amount),
                RefundCount = refunds.Count,
                RefundAmount = refunds.Sum(r => r.FinalAmount),
                TotalRevenue = receipts.Where(r => r.ReceiptType != 3).Sum(r => r.FinalAmount)
                             - receipts.Where(r => r.ReceiptType == 3).Sum(r => r.FinalAmount)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetDailyRevenueAsync failed for {Date}", date.Date);
            return new DailyRevenueReportDto { Date = date.Date, IsError = true, ErrorMessage = ex.Message };
        }
    }

    public async Task<List<DepartmentRevenueDto>> GetRevenueByDepartmentAsync(DepartmentRevenueRequestDto dto)
    {
        try
        {
            var query = _context.Receipts
                .Include(r => r.MedicalRecord).ThenInclude(mr => mr!.Department)
                .Include(r => r.Details)
                .Where(r => r.ReceiptDate >= dto.FromDate && r.ReceiptDate <= dto.ToDate
                    && r.Status == 1 && r.MedicalRecord != null && r.MedicalRecord.DepartmentId != null);

            if (dto.PatientType.HasValue)
                query = query.Where(r => r.MedicalRecord!.PatientType == dto.PatientType.Value);

            if (dto.DepartmentIds != null && dto.DepartmentIds.Any())
                query = query.Where(r => dto.DepartmentIds.Contains(r.MedicalRecord!.DepartmentId!.Value));

            var receipts = await query.ToListAsync();

            return receipts
                .Where(r => r.MedicalRecord?.Department != null)
                .GroupBy(r => new
                {
                    DeptId = r.MedicalRecord!.DepartmentId!.Value,
                    DeptCode = r.MedicalRecord.Department!.DepartmentCode ?? "",
                    DeptName = r.MedicalRecord.Department.DepartmentName ?? ""
                })
                .Select(g =>
                {
                    var details = g.SelectMany(r => r.Details ?? Enumerable.Empty<ReceiptDetail>()).ToList();
                    return new DepartmentRevenueDto
                    {
                        DepartmentId = g.Key.DeptId,
                        DepartmentCode = g.Key.DeptCode,
                        DepartmentName = g.Key.DeptName,
                        TotalRevenue = g.Where(r => r.ReceiptType != 3).Sum(r => r.FinalAmount)
                                     - g.Where(r => r.ReceiptType == 3).Sum(r => r.FinalAmount),
                        ServiceRevenue = details.Where(d => d.ItemType == 1).Sum(d => d.FinalAmount),
                        MedicineRevenue = details.Where(d => d.ItemType == 2).Sum(d => d.FinalAmount),
                        SupplyRevenue = details.Where(d => d.ItemType == 3).Sum(d => d.FinalAmount),
                        PatientCount = g.Select(r => r.PatientId).Distinct().Count()
                    };
                })
                .OrderByDescending(d => d.TotalRevenue)
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetRevenueByDepartmentAsync failed {From}-{To}", dto.FromDate, dto.ToDate);
            throw;
        }
    }

    public async Task<DebtStatisticsDto> GetDebtStatisticsAsync(DateTime? asOfDate)
    {
        try
        {
            var cutoff = asOfDate ?? DateTime.Now;

            var unpaidRequests = await _context.ServiceRequests
                .Include(sr => sr.MedicalRecord).ThenInclude(mr => mr.Patient)
                .Where(sr => !sr.IsPaid && sr.Status != 4 && sr.PatientAmount > 0)
                .ToListAsync();

            var debtByPatient = unpaidRequests
                .GroupBy(sr => new
                {
                    PatientId = sr.MedicalRecord?.PatientId ?? Guid.Empty,
                    PatientCode = sr.MedicalRecord?.Patient?.PatientCode ?? "",
                    PatientName = sr.MedicalRecord?.Patient?.FullName ?? "",
                    Phone = sr.MedicalRecord?.Patient?.PhoneNumber
                })
                .Select(g => new
                {
                    g.Key.PatientId,
                    g.Key.PatientCode,
                    g.Key.PatientName,
                    g.Key.Phone,
                    DebtAmount = g.Sum(sr => sr.PatientAmount),
                    OldestDate = g.Min(sr => sr.RequestDate)
                })
                .ToList();

            var totalDebt = debtByPatient.Sum(d => d.DebtAmount);

            return new DebtStatisticsDto
            {
                AsOfDate = cutoff,
                TotalDebtors = debtByPatient.Count,
                TotalDebt = totalDebt,
                Debt0To30Days = debtByPatient.Where(d => (cutoff - d.OldestDate).TotalDays <= 30).Sum(d => d.DebtAmount),
                Debt30To60Days = debtByPatient.Where(d => (cutoff - d.OldestDate).TotalDays > 30 && (cutoff - d.OldestDate).TotalDays <= 60).Sum(d => d.DebtAmount),
                Debt60To90Days = debtByPatient.Where(d => (cutoff - d.OldestDate).TotalDays > 60 && (cutoff - d.OldestDate).TotalDays <= 90).Sum(d => d.DebtAmount),
                DebtOver90Days = debtByPatient.Where(d => (cutoff - d.OldestDate).TotalDays > 90).Sum(d => d.DebtAmount),
                TopDebtors = debtByPatient
                    .OrderByDescending(d => d.DebtAmount)
                    .Take(20)
                    .Select(d => new DebtorDto
                    {
                        PatientId = d.PatientId,
                        PatientCode = d.PatientCode,
                        PatientName = d.PatientName,
                        PhoneNumber = d.Phone,
                        DebtAmount = d.DebtAmount,
                        DaysOverdue = (int)(cutoff - d.OldestDate).TotalDays,
                        LastPaymentDate = d.OldestDate
                    })
                    .ToList()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetDebtStatisticsAsync failed asOf={AsOf}", asOfDate);
            return new DebtStatisticsDto { AsOfDate = asOfDate ?? DateTime.Now, IsError = true, ErrorMessage = ex.Message };
        }
    }

    public async Task<InsuranceClaimDto> GenerateInsuranceClaimAsync(Guid medicalRecordId)
    {
        try
        {
            var record = await _context.MedicalRecords
                .Include(r => r.Patient)
                .FirstOrDefaultAsync(r => r.Id == medicalRecordId);
            if (record == null) return new InsuranceClaimDto();

            var serviceRequests = await _context.ServiceRequests
                .Where(sr => sr.MedicalRecordId == medicalRecordId && sr.Status != 4)
                .ToListAsync();

            var totalAmount = serviceRequests.Sum(sr => sr.TotalAmount);
            var insuranceAmount = serviceRequests.Sum(sr => sr.InsuranceAmount);
            var patientAmount = serviceRequests.Sum(sr => sr.PatientAmount);

            return new InsuranceClaimDto
            {
                Id = Guid.NewGuid(),
                MedicalRecordId = medicalRecordId,
                MedicalRecordCode = record.MedicalRecordCode,
                PatientName = record.Patient?.FullName ?? string.Empty,
                InsuranceCardNumber = record.InsuranceNumber ?? record.Patient?.InsuranceNumber ?? string.Empty,
                TotalAmount = totalAmount,
                InsuranceAmount = insuranceAmount,
                PatientAmount = patientAmount,
                Status = 1,
                StatusName = "Cho giam dinh",
                CreatedAt = DateTime.Now
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GenerateInsuranceClaimAsync failed for record {MedicalRecordId}", medicalRecordId);
            return new InsuranceClaimDto { IsError = true, ErrorMessage = ex.Message };
        }
    }

    public async Task<Xml4210ResultDto> GenerateXml4210Async(GenerateXml4210RequestDto dto)
    {
        try
        {
            var query = _context.MedicalRecords
                .Include(r => r.Patient)
                .Where(r => r.AdmissionDate >= dto.FromDate && (r.DischargeDate == null || r.DischargeDate <= dto.ToDate)
                    && r.InsuranceNumber != null);

            if (dto.PatientType.HasValue)
                query = query.Where(r => r.PatientType == dto.PatientType.Value);

            if (dto.MedicalRecordIds != null && dto.MedicalRecordIds.Any())
                query = query.Where(r => dto.MedicalRecordIds.Contains(r.Id));

            var records = await query.ToListAsync();

            var xmlBuilder = new StringBuilder();
            xmlBuilder.AppendLine("<?xml version=\"1.0\" encoding=\"utf-8\"?>");
            xmlBuilder.AppendLine("<GIAMDINHHS>");
            xmlBuilder.AppendLine($"  <THONGTINDONVI>");
            xmlBuilder.AppendLine($"    <MACSKCB>79025</MACSKCB>");
            xmlBuilder.AppendLine($"  </THONGTINDONVI>");
            xmlBuilder.AppendLine($"  <DSHOSO>");

            decimal totalAmount = 0;
            var errors = new List<string>();

            // #195: 1 query gom tiền dịch vụ theo hồ sơ thay vì 1 sum/hồ sơ.
            var xmlRecordIds = records.Select(r => r.Id).ToList();
            var srTotalByRecord = (await _context.ServiceRequests
                    .Where(sr => xmlRecordIds.Contains(sr.MedicalRecordId) && sr.Status != 4)
                    .GroupBy(sr => sr.MedicalRecordId)
                    .Select(g => new { RecordId = g.Key, Total = g.Sum(sr => sr.TotalAmount) })
                    .ToListAsync())
                .ToDictionary(x => x.RecordId, x => x.Total);

            foreach (var record in records)
            {
                if (string.IsNullOrEmpty(record.InsuranceNumber))
                {
                    errors.Add($"HS {record.MedicalRecordCode}: Thieu so the BHYT");
                    continue;
                }

                var srTotal = srTotalByRecord.TryGetValue(record.Id, out var recordTotal) ? recordTotal : 0;
                totalAmount += srTotal;

                xmlBuilder.AppendLine($"    <HOSO>");
                xmlBuilder.AppendLine($"      <MABN>{record.Patient?.PatientCode}</MABN>");
                xmlBuilder.AppendLine($"      <HOTENBN>{record.Patient?.FullName}</HOTENBN>");
                xmlBuilder.AppendLine($"      <MATHE>{record.InsuranceNumber}</MATHE>");
                xmlBuilder.AppendLine($"      <MABA>{record.MedicalRecordCode}</MABA>");
                xmlBuilder.AppendLine($"      <NGAYVAO>{record.AdmissionDate:yyyyMMddHHmm}</NGAYVAO>");
                xmlBuilder.AppendLine($"      <NGAYRA>{record.DischargeDate:yyyyMMddHHmm}</NGAYRA>");
                xmlBuilder.AppendLine($"      <CHANDOAN>{record.MainDiagnosis}</CHANDOAN>");
                xmlBuilder.AppendLine($"      <MAICD>{record.MainIcdCode}</MAICD>");
                xmlBuilder.AppendLine($"      <TONGCHI>{srTotal:F0}</TONGCHI>");
                xmlBuilder.AppendLine($"    </HOSO>");
            }

            xmlBuilder.AppendLine($"  </DSHOSO>");
            xmlBuilder.AppendLine("</GIAMDINHHS>");

            var xmlContent = xmlBuilder.ToString();
            return new Xml4210ResultDto
            {
                Success = !errors.Any(),
                FileName = $"XML4210_{dto.FromDate:yyyyMMdd}_{dto.ToDate:yyyyMMdd}.xml",
                FileContent = Encoding.UTF8.GetBytes(xmlContent),
                TotalRecords = records.Count,
                TotalAmount = totalAmount,
                Errors = errors
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GenerateXml4210Async failed {From}-{To}", dto.FromDate, dto.ToDate);
            return new Xml4210ResultDto { Errors = new List<string> { ex.Message } };
        }
    }

    public async Task<InsuranceClaimStatisticsDto> GetInsuranceClaimStatisticsAsync(DateTime fromDate, DateTime toDate)
    {
        try
        {
            var invoices = await _context.InvoiceSummaries
                .Include(i => i.MedicalRecord)
                .Where(i => i.InvoiceDate >= fromDate && i.InvoiceDate <= toDate
                    && i.MedicalRecord.InsuranceNumber != null)
                .ToListAsync();

            var outpatient = invoices.Where(i => i.MedicalRecord?.TreatmentType == 1).ToList();
            var inpatient = invoices.Where(i => i.MedicalRecord?.TreatmentType == 2).ToList();

            return new InsuranceClaimStatisticsDto
            {
                FromDate = fromDate,
                ToDate = toDate,
                TotalClaims = invoices.Count,
                PendingClaims = invoices.Count(i => !i.IsApprovedByAccountant),
                ApprovedClaims = invoices.Count(i => i.IsApprovedByAccountant && i.Status >= 1),
                RejectedClaims = 0,
                TotalClaimAmount = invoices.Sum(i => i.InsuranceAmount),
                ApprovedAmount = invoices.Where(i => i.IsApprovedByAccountant).Sum(i => i.InsuranceAmount),
                RejectedAmount = 0,
                OutpatientAmount = outpatient.Sum(i => i.InsuranceAmount),
                InpatientAmount = inpatient.Sum(i => i.InsuranceAmount)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetInsuranceClaimStatisticsAsync failed {From}-{To}", fromDate, toDate);
            return new InsuranceClaimStatisticsDto { FromDate = fromDate, ToDate = toDate, IsError = true, ErrorMessage = ex.Message };
        }
    }

    #endregion

    #region 10.5 Đảo bút toán dịch vụ

    public async Task<BillingReversalDto> ReverseServiceChargeAsync(ReverseServiceChargeDto dto, Guid userId)
    {
        // Tìm ServiceRequest
        var serviceRequest = await _context.ServiceRequests
            .FirstOrDefaultAsync(sr => sr.Id == dto.ServiceRequestId);

        if (serviceRequest == null)
            throw new InvalidOperationException("Không tìm thấy chỉ định dịch vụ");

        var serviceName = await _context.Services
            .Where(s => s.Id == serviceRequest.ServiceId)
            .Select(s => s.ServiceName)
            .FirstOrDefaultAsync() ?? "Dịch vụ";

        // Tính số tiền cần đảo
        var amount = await _context.Set<ServiceRequestDetail>()
            .Where(d => d.ServiceRequestId == dto.ServiceRequestId)
            .SumAsync(d => d.Quantity * d.UnitPrice);

        // Tạo bản ghi đảo bút toán
        var reversalId = Guid.NewGuid();
        try
        {
            await _context.Database.ExecuteSqlRawAsync(
                @"INSERT INTO BillingReversals (Id, MedicalRecordId, ServiceRequestId, ServiceName,
                  OriginalAmount, ReversedAmount, Reason, ReversedBy, ReversedAt, Status, CreatedAt, CreatedBy, IsDeleted)
                  VALUES ({0}, {1}, {2}, {3}, {4}, {5}, {6}, {7}, GETDATE(), 2, GETDATE(), {8}, 0)",
                reversalId, dto.MedicalRecordId, dto.ServiceRequestId, serviceName,
                amount, amount, dto.Reason, userId, userId.ToString());
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "ReverseServiceChargeAsync: ghi BillingReversals thất bại (bảng có thể chưa tồn tại) — bỏ qua audit, vẫn tiếp tục đảo bút toán");
            // Table may not exist - return stub
        }

        // Cập nhật hóa đơn (giảm tổng)
        var invoice = await _context.Set<InvoiceSummary>()
            .FirstOrDefaultAsync(i => i.MedicalRecordId == dto.MedicalRecordId);

        if (invoice != null)
        {
            invoice.TotalServiceAmount -= amount;
            invoice.TotalAmount -= amount;
            if (invoice.TotalServiceAmount < 0) invoice.TotalServiceAmount = 0;
            if (invoice.TotalAmount < 0) invoice.TotalAmount = 0;
            invoice.UpdatedAt = DateTime.Now;
            // #187: KHÔNG SaveChanges riêng — gộp với cập nhật ServiceRequest bên dưới (1 transaction atomic)
        }

        // Hủy ServiceRequest
        serviceRequest.Status = 4; // Cancelled
        serviceRequest.UpdatedAt = DateTime.Now;
        serviceRequest.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync(); // #187: invoice + serviceRequest atomic trong 1 SaveChanges

        var user = await _context.Users.FindAsync(userId);

        return new BillingReversalDto
        {
            Id = reversalId,
            MedicalRecordId = dto.MedicalRecordId,
            ServiceRequestId = dto.ServiceRequestId,
            ServiceName = serviceName,
            OriginalAmount = amount,
            ReversedAmount = amount,
            Reason = dto.Reason,
            ReversedByName = user?.FullName ?? "",
            ReversedAt = DateTime.Now,
            Status = 2,
            StatusName = "Đã duyệt"
        };
    }

    public async Task<List<BillingReversalDto>> GetReversalHistoryAsync(Guid? medicalRecordId, DateTime? fromDate, DateTime? toDate)
    {
        try
        {
            var from = fromDate ?? DateTime.Today.AddMonths(-1);
            var to = toDate ?? DateTime.Today.AddDays(1);

            if (medicalRecordId.HasValue)
            {
                return await _context.Database.SqlQueryRaw<BillingReversalDto>(
                    @"SELECT br.Id, br.MedicalRecordId, br.ServiceRequestId, br.ServiceName,
                             br.OriginalAmount, br.ReversedAmount, br.Reason, u.FullName as ReversedByName,
                             br.ReversedAt, br.Status, CASE br.Status WHEN 1 THEN N'Chờ duyệt' WHEN 2 THEN N'Đã duyệt' ELSE N'Từ chối' END as StatusName
                      FROM BillingReversals br LEFT JOIN Users u ON br.ReversedBy = u.Id
                      WHERE br.MedicalRecordId = {0} AND br.IsDeleted = 0
                      ORDER BY br.ReversedAt DESC", medicalRecordId.Value).ToListAsync();
            }

            return await _context.Database.SqlQueryRaw<BillingReversalDto>(
                @"SELECT br.Id, br.MedicalRecordId, br.ServiceRequestId, br.ServiceName,
                         br.OriginalAmount, br.ReversedAmount, br.Reason, u.FullName as ReversedByName,
                         br.ReversedAt, br.Status, CASE br.Status WHEN 1 THEN N'Chờ duyệt' WHEN 2 THEN N'Đã duyệt' ELSE N'Từ chối' END as StatusName
                  FROM BillingReversals br LEFT JOIN Users u ON br.ReversedBy = u.Id
                  WHERE br.IsDeleted = 0 AND br.ReversedAt BETWEEN {0} AND {1}
                  ORDER BY br.ReversedAt DESC", from, to).ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "GetReversalHistoryAsync: truy vấn BillingReversals thất bại (bảng có thể chưa tồn tại) — trả danh sách rỗng");
            // Table may not exist
            return new List<BillingReversalDto>();
        }
    }

    #endregion
}
