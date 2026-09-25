using System.Text;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Surgery;
using HIS.Application.Services;
using HIS.Application.Services.Surgery;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;
using IcdCodeDto = HIS.Application.Services.IcdCodeDto;
using SurgeryServiceDto = HIS.Application.Services.SurgeryServiceDto;

namespace HIS.Infrastructure.Services.Surgery;

public partial class SurgeryOperationServiceImpl
{
    public async Task<string?> GetDiagnosisFromOrderAsync(Guid medicalRecordId)
    {
        // F1 (audit FLOW-FINAL 2026-06-06): đọc chẩn đoán THẬT từ HSBA thay hardcode "Viêm ruột thừa cấp".
        var mr = await _context.MedicalRecords
            .Where(m => m.Id == medicalRecordId)
            .Select(m => new { m.InitialDiagnosis, m.MainIcdCode })
            .FirstOrDefaultAsync();
        if (mr == null) return null;
        return !string.IsNullOrWhiteSpace(mr.InitialDiagnosis) ? mr.InitialDiagnosis : mr.MainIcdCode;
    }

    public async Task<List<IcdCodeDto>> SearchIcdCodesAsync(string keyword, bool byCode)
    {
        // QA0915: was a hard-coded list of 4 codes — the surgery request modal could not find any other
        // pre-op diagnosis. Read the real ICD-10 catalogue (same table the OPD search uses).
        var kw = (keyword ?? string.Empty).Trim();
        var query = _context.IcdCodes.AsNoTracking().Where(i => !i.IsDeleted && i.IsActive);
        if (kw.Length > 0)
            query = byCode
                ? query.Where(i => i.Code.StartsWith(kw))
                : query.Where(i => i.Code.StartsWith(kw) || i.Name.Contains(kw)
                                   || (i.NameNoDiacritics != null && i.NameNoDiacritics.Contains(kw)));

        return await query
            .OrderBy(i => i.Code)
            .Take(50)
            .Select(i => new IcdCodeDto { Code = i.Code, Name = i.Name, NameEnglish = i.NameEnglish, Chapter = i.ChapterName })
            .ToListAsync();
    }

    public async Task<List<SurgeryServiceDto>> SearchServicesAsync(string? keyword, int? serviceType)
    {
        // E2E fix (prod-e2e 2026-06-17): trước đây trả mock hardcode với GUID random mỗi call → không
        // drive được surgery lifecycle (serviceId không tồn tại trong DB → FK-fail khi tạo yêu cầu PTTT).
        // Nay query bảng Services THẬT. PTTT = ServiceType 5 (theo comment entity Service); caller lọc qua serviceType.
        var query = _context.Set<Service>().Where(s => s.IsActive && !s.IsDeleted);
        if (serviceType.HasValue)
            query = query.Where(s => s.ServiceType == serviceType.Value);
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var k = keyword.Trim();
            query = query.Where(s => s.ServiceCode.Contains(k) || s.ServiceName.Contains(k));
        }
        return await query
            .OrderBy(s => s.ServiceName)
            .Take(100)
            .Select(s => new SurgeryServiceDto
            {
                Id = s.Id,
                Code = s.ServiceCode,
                Name = s.ServiceName,
                ServiceType = s.ServiceType,
                UnitPrice = s.UnitPrice,
                InsurancePrice = s.InsurancePrice,
                IsActive = s.IsActive,
            })
            .ToListAsync();
    }

    /// <summary>
    /// QA-R6 refused these endpoints instead of faking them; QA-R11 implements them for real. A surgery order is an
    /// ordinary ServiceRequest (+ one ServiceRequestDetail per service) on the surgery's medical record — the same
    /// rows LIS/RIS, the cashier ledger and the BHYT split already read — tagged with ServiceRequests.SurgeryRequestId
    /// so this screen can list / cost its own orders. One "order" row of the API = one ServiceRequestDetail (its id).
    /// </summary>
    private static InvalidOperationException NotImplementedYet(string feature) =>
        new($"{feature} trong module Phẫu thuật chưa được cài đặt trên máy chủ nên chưa lưu/tính được. "
            + "Vui lòng chỉ định qua màn nội trú / khám bệnh và báo quản trị.");

    private sealed record SurgeryOrderContext(SurgeryRequest Surgery, MedicalRecord Record, Guid DepartmentId, Guid PatientId);

    private async Task<SurgeryOrderContext> LoadSurgeryOrderContextAsync(Guid surgeryId)
    {
        var surgery = await _context.SurgeryRequests.FirstOrDefaultAsync(r => r.Id == surgeryId && !r.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy ca phẫu thuật.");
        if (surgery.Status == 4)
            throw new InvalidOperationException("Ca phẫu thuật đã hủy — không chỉ định dịch vụ được.");
        if (surgery.MedicalRecordId is not Guid recordId)
            throw new InvalidOperationException("Ca phẫu thuật chưa gắn hồ sơ bệnh án — không chỉ định dịch vụ được.");
        var record = await _context.MedicalRecords.FirstOrDefaultAsync(m => m.Id == recordId)
            ?? throw new KeyNotFoundException("Không tìm thấy hồ sơ bệnh án của ca mổ.");
        await EmrLockGuard.EnsureEditableBySurgeryRequestAsync(_context, surgeryId); // TT46
        // Ordering department: the active stay's ward, else the record's department.
        var stayDept = await _context.Set<Admission>().AsNoTracking()
            .Where(a => a.MedicalRecordId == recordId && !a.IsDeleted && (a.Status == 0 || a.Status == 6))
            .Select(a => (Guid?)a.DepartmentId).FirstOrDefaultAsync();
        var deptId = stayDept ?? record.DepartmentId
            ?? throw new InvalidOperationException("Hồ sơ bệnh án chưa có khoa điều trị — không chỉ định dịch vụ được.");
        return new SurgeryOrderContext(surgery, record, deptId, surgery.PatientId);
    }

    private async Task<List<Guid>> CreateSurgeryOrdersAsync(SurgeryOrderContext ctx, List<CreateSurgeryServiceOrderDto> dtos, Guid userId)
    {
        if (dtos == null || dtos.Count == 0)
            throw new ArgumentException("Chưa chọn dịch vụ nào.", nameof(dtos));
        if (dtos.Any(d => d.Quantity <= 0))
            throw new ArgumentException("Số lượng dịch vụ phải lớn hơn 0.", nameof(dtos));
        var serviceIds = dtos.Select(d => d.ServiceId).Distinct().ToList();
        var services = await _context.Services
            .Where(s => serviceIds.Contains(s.Id) && s.IsActive && !s.IsDeleted)
            .ToDictionaryAsync(s => s.Id);
        var missing = serviceIds.Where(id => !services.ContainsKey(id)).ToList();
        if (missing.Count > 0)
            throw new ArgumentException("Có dịch vụ không tồn tại hoặc đã ngừng sử dụng.", nameof(dtos));

        var now = DateTime.Now;
        var code = $"CDPT{now:yyyyMMddHHmmssfff}";
        var defaultPatientType = ctx.Record.PatientType == HIS.Core.Constants.PatientType.BHYT
            ? HIS.Core.Constants.PatientType.BHYT : HIS.Core.Constants.PatientType.Fee;
        var byKey = new Dictionary<(int Type, bool Emergency, bool Priority), ServiceRequest>();
        var detailIds = new List<Guid>();
        foreach (var dto in dtos)
        {
            var svc = services[dto.ServiceId];
            var type = HIS.Core.Constants.ServiceRequestType.FromServiceType(svc.ServiceType);
            var key = (type, dto.IsEmergency, dto.IsPriority || dto.IsEmergency);
            if (!byKey.TryGetValue(key, out var sr))
            {
                sr = new ServiceRequest
                {
                    Id = Guid.NewGuid(),
                    RequestCode = code,
                    RequestDate = HIS.Core.Common.VnTime.NowVn,
                    MedicalRecordId = ctx.Record.Id,
                    ExaminationId = ctx.Surgery.ExaminationId,
                    DoctorId = userId,
                    DepartmentId = ctx.DepartmentId,
                    ExecuteRoomId = dto.ExecuteRoomId,
                    RequestType = type,
                    IsEmergency = key.Item2,
                    IsPriority = key.Item3,
                    Diagnosis = ctx.Surgery.PreOpDiagnosis,
                    IcdCode = ctx.Surgery.PreOpIcdCode,
                    Notes = dto.Notes,
                    RequestedByUserId = userId,
                    RequestedDate = now,
                    Status = 0,
                    SurgeryRequestId = ctx.Surgery.Id,
                    CreatedAt = now,
                    CreatedBy = userId.ToString(),
                };
                byKey[key] = sr;
            }
            var amount = svc.UnitPrice * dto.Quantity;
            var detailId = Guid.NewGuid();
            sr.Details.Add(new ServiceRequestDetail
            {
                Id = detailId,
                ServiceRequestId = sr.Id,
                ServiceId = svc.Id,
                Quantity = dto.Quantity,
                UnitPrice = svc.UnitPrice,
                Amount = amount,
                InsuranceAmount = 0,
                PatientAmount = amount,
                PatientType = dto.PaymentObject is 1 or 2 or 3 ? dto.PaymentObject : defaultPatientType,
                Status = 0,
                Note = dto.Notes,
                CreatedAt = now,
                CreatedBy = userId.ToString(),
            });
            detailIds.Add(detailId);
        }
        foreach (var sr in byKey.Values)
        {
            var first = sr.Details.First();
            sr.ServiceId = first.ServiceId;
            sr.UnitPrice = first.UnitPrice;
            sr.Quantity = sr.Details.Sum(d => d.Quantity);
            sr.TotalPrice = sr.TotalAmount = sr.PatientAmount = sr.Details.Sum(d => d.Amount);
            sr.InsuranceAmount = 0;
            _context.ServiceRequests.Add(sr);
        }
        await SaveWithBhytSplitAsync(ctx.Record.Id);
        return detailIds;
    }

    /// <summary>Order rows + BHYT re-split of the visit commit together (same as the inpatient order path).</summary>
    private async Task SaveWithBhytSplitAsync(Guid medicalRecordId)
    {
        await using var tx = await SqlAppLock.BeginAsync(_context);
        await _context.SaveChangesAsync();
        if (await new BhytVisitPricing(_context).RecalculateAsync(medicalRecordId) != null)
            await _context.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();
    }

    private async Task<List<SurgeryServiceOrderDto>> LoadSurgeryOrdersAsync(Guid surgeryId, IReadOnlyCollection<Guid>? detailIds = null)
    {
        var q = _context.ServiceRequestDetails.AsNoTracking()
            .Where(d => !d.IsDeleted && d.ServiceRequest.SurgeryRequestId == surgeryId && !d.ServiceRequest.IsDeleted);
        if (detailIds != null) q = q.Where(d => detailIds.Contains(d.Id));
        var rows = await q
            .OrderBy(d => d.ServiceRequest.RequestDate)
            .Select(d => new
            {
                d.Id, d.ServiceId, d.Service.ServiceCode, d.Service.ServiceName, d.Service.ServiceType,
                d.Quantity, d.UnitPrice, d.Amount, d.InsuranceAmount, d.PatientType, d.InsurancePaymentRate, d.Status,
                d.Note, d.ServiceRequest.ExecuteRoomId, d.ServiceRequest.DoctorId, d.ServiceRequest.IsPriority,
                d.ServiceRequest.IsEmergency, d.ServiceRequest.RequestDate, d.ResultDate,
                RequestCancelled = d.ServiceRequest.Status == 4,
            })
            .ToListAsync();
        var doctorIds = rows.Select(r => r.DoctorId).Distinct().ToList();
        var doctors = await _context.Users.AsNoTracking().Where(u => doctorIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName);
        var roomIds = rows.Where(r => r.ExecuteRoomId.HasValue).Select(r => r.ExecuteRoomId!.Value).Distinct().ToList();
        var rooms = await _context.Rooms.AsNoTracking().Where(r => roomIds.Contains(r.Id))
            .ToDictionaryAsync(r => r.Id, r => r.RoomName);
        return rows.Select(r =>
        {
            var status = r.RequestCancelled ? 3 : r.Status;
            return new SurgeryServiceOrderDto
            {
                Id = r.Id,
                SurgeryId = surgeryId,
                ServiceId = r.ServiceId,
                ServiceCode = r.ServiceCode,
                ServiceName = r.ServiceName,
                ServiceType = r.ServiceType,
                Quantity = r.Quantity,
                UnitPrice = r.UnitPrice,
                Amount = r.Amount,
                ExecuteRoomId = r.ExecuteRoomId,
                ExecuteRoomName = r.ExecuteRoomId.HasValue ? rooms.GetValueOrDefault(r.ExecuteRoomId.Value) : null,
                OrderDoctorId = r.DoctorId,
                OrderDoctorName = doctors.GetValueOrDefault(r.DoctorId) ?? string.Empty,
                PaymentObject = r.PatientType,
                PaymentObjectName = HIS.Core.Constants.PatientType.GetName(r.PatientType),
                InsuranceRate = r.InsurancePaymentRate,
                IsPriority = r.IsPriority,
                IsEmergency = r.IsEmergency,
                Notes = r.Note,
                Status = status,
                StatusName = status switch { 0 => "Chờ thực hiện", 1 => "Đang thực hiện", 2 => "Có kết quả", 3 => "Đã hủy", _ => "" },
                OrderedAt = r.RequestDate,
                ExecutedAt = r.ResultDate,
            };
        }).ToList();
    }

    /// <summary>Loads one surgery order line that may still be changed: pending, request not cancelled, not paid.</summary>
    private async Task<ServiceRequestDetail> LoadEditableSurgeryOrderAsync(Guid orderId)
    {
        var detail = await _context.ServiceRequestDetails
            .Include(d => d.ServiceRequest).ThenInclude(r => r.Details)
            .FirstOrDefaultAsync(d => d.Id == orderId && !d.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy chỉ định dịch vụ.");
        if (detail.ServiceRequest.SurgeryRequestId is not Guid surgeryId)
            throw new InvalidOperationException("Chỉ định này không thuộc ca phẫu thuật nào — sửa ở màn đã chỉ định.");
        await EmrLockGuard.EnsureEditableBySurgeryRequestAsync(_context, surgeryId); // TT46
        if (detail.Status != 0 || detail.ServiceRequest.Status == 4)
            throw new InvalidOperationException("Chỉ định đã thực hiện hoặc đã hủy — không sửa được.");
        var paid = detail.ServiceRequest.IsPaid || await _context.ReceiptDetails.AnyAsync(rd => !rd.IsDeleted
            && rd.ServiceRequestDetailId == detail.Id && rd.Receipt.Status == 1 && !rd.Receipt.IsDeleted && rd.Receipt.ReceiptType == 2);
        if (paid)
            throw new InvalidOperationException("Dịch vụ đã thu tiền — không sửa/hủy trực tiếp, hãy làm phiếu hoàn tiền tại quầy thu ngân.");
        return detail;
    }

    private static void RefreshRequestTotals(ServiceRequest sr)
    {
        var live = sr.Details.Where(d => !d.IsDeleted && d.Status != 3).ToList();
        if (live.Count == 0) { sr.Status = 4; return; } // every line cancelled → the request is cancelled
        sr.Quantity = live.Sum(d => d.Quantity);
        sr.TotalPrice = sr.TotalAmount = live.Sum(d => d.Amount);
        sr.InsuranceAmount = live.Sum(d => d.InsuranceAmount);
        sr.PatientAmount = live.Sum(d => d.PatientAmount);
    }

    public async Task<SurgeryServiceOrderDto> OrderServiceAsync(CreateSurgeryServiceOrderDto dto, Guid userId)
        => (await OrderServicesAsync(dto.SurgeryId, new List<CreateSurgeryServiceOrderDto> { dto }, userId)).First();

    public async Task<List<SurgeryServiceOrderDto>> OrderServicesAsync(Guid surgeryId, List<CreateSurgeryServiceOrderDto> dtos, Guid userId)
    {
        // QA-R12 racescan: a double-click fired two creates — one deadlocked in the BHYT re-split (500), otherwise both
        // committed. Serialize per surgery, and treat the SAME services from the same user within a few seconds as the
        // double-submit it is: answer with the rows just created instead of ordering them again.
        await using var tx = await SqlAppLock.BeginAsync(_context);
        await SqlAppLock.AcquireAsync(_context, $"HIS.Surgery.Orders.{surgeryId:N}",
            "Ca mổ đang có một chỉ định khác đang được lưu, vui lòng thử lại.");
        var ctx = await LoadSurgeryOrderContextAsync(surgeryId);
        var ids = await FindJustCreatedSurgeryOrdersAsync(surgeryId, dtos, userId)
                  ?? await CreateSurgeryOrdersAsync(ctx, dtos, userId);
        if (tx != null) await tx.CommitAsync();
        return await LoadSurgeryOrdersAsync(surgeryId, ids);
    }

    private async Task<List<Guid>?> FindJustCreatedSurgeryOrdersAsync(Guid surgeryId, List<CreateSurgeryServiceOrderDto> dtos, Guid userId)
    {
        if (dtos == null || dtos.Count == 0) return null;
        var since = HIS.Core.Common.VnTime.NowVn.AddSeconds(-10);
        var by = userId.ToString();
        var recent = await _context.ServiceRequestDetails.AsNoTracking()
            .Where(d => !d.IsDeleted && d.Status != 3 && d.CreatedBy == by
                        && d.ServiceRequest.SurgeryRequestId == surgeryId && !d.ServiceRequest.IsDeleted
                        && d.ServiceRequest.RequestDate >= since)
            .Select(d => new { d.Id, d.ServiceId, d.Quantity })
            .ToListAsync();
        if (recent.Count != dtos.Count) return null;
        var want = dtos.Select(d => (d.ServiceId, (decimal)d.Quantity)).OrderBy(x => x.ServiceId).ThenBy(x => x.Item2).ToList();
        var have = recent.Select(d => (d.ServiceId, (decimal)d.Quantity)).OrderBy(x => x.ServiceId).ThenBy(x => x.Item2).ToList();
        return want.SequenceEqual(have) ? recent.Select(d => d.Id).ToList() : null;
    }

    public Task<SurgeryPackageOrderDto> OrderPackageAsync(Guid surgeryId, Guid packageId, Guid userId)
        => throw NotImplementedYet("Chỉ định gói PTTT"); // no surgery-package tables (see GetSurgeryPackagesAsync)

    public async Task<List<SurgeryServiceOrderDto>> CopyPreviousOrdersAsync(Guid surgeryId, Guid sourceSurgeryId, Guid userId)
    {
        if (surgeryId == sourceSurgeryId)
            throw new InvalidOperationException("Ca nguồn trùng ca hiện tại.");
        var ctx = await LoadSurgeryOrderContextAsync(surgeryId);
        var source = await _context.SurgeryRequests.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == sourceSurgeryId && !r.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy ca phẫu thuật nguồn.");
        if (source.PatientId != ctx.PatientId)
            throw new InvalidOperationException("Ca nguồn thuộc bệnh nhân khác — không sao chép chỉ định được.");
        var lines = await _context.ServiceRequestDetails.AsNoTracking()
            .Where(d => !d.IsDeleted && d.Status != 3 && d.ServiceRequest.SurgeryRequestId == sourceSurgeryId
                        && d.ServiceRequest.Status != 4 && !d.ServiceRequest.IsDeleted)
            .Select(d => new CreateSurgeryServiceOrderDto
            {
                SurgeryId = surgeryId, ServiceId = d.ServiceId, Quantity = d.Quantity, PaymentObject = d.PatientType,
                ExecuteRoomId = d.ServiceRequest.ExecuteRoomId, Notes = d.Note,
            })
            .ToListAsync();
        if (lines.Count == 0)
            throw new InvalidOperationException("Ca nguồn chưa có chỉ định dịch vụ nào để sao chép.");
        var ids = await CreateSurgeryOrdersAsync(ctx, lines, userId);
        return await LoadSurgeryOrdersAsync(surgeryId, ids);
    }

    public async Task<SurgeryServiceOrderDto> UpdateServiceOrderAsync(Guid orderId, CreateSurgeryServiceOrderDto dto, Guid userId)
    {
        if (dto.Quantity <= 0)
            throw new ArgumentException("Số lượng dịch vụ phải lớn hơn 0.", nameof(dto.Quantity));
        var detail = await LoadEditableSurgeryOrderAsync(orderId);
        if (dto.ServiceId != Guid.Empty && dto.ServiceId != detail.ServiceId)
            throw new InvalidOperationException("Không đổi được dịch vụ của chỉ định — hủy chỉ định cũ rồi chỉ định mới.");
        detail.Quantity = dto.Quantity;
        detail.Amount = detail.UnitPrice * dto.Quantity;
        detail.InsuranceAmount = 0;
        detail.PatientAmount = detail.Amount;
        if (dto.PaymentObject is 1 or 2 or 3) detail.PatientType = dto.PaymentObject;
        detail.Note = dto.Notes;
        detail.UpdatedAt = DateTime.Now;
        detail.UpdatedBy = userId.ToString();
        RefreshRequestTotals(detail.ServiceRequest);
        await SaveWithBhytSplitAsync(detail.ServiceRequest.MedicalRecordId);
        return (await LoadSurgeryOrdersAsync(detail.ServiceRequest.SurgeryRequestId!.Value, new[] { detail.Id })).First();
    }

    public async Task<bool> DeleteServiceOrderAsync(Guid orderId, Guid userId)
    {
        var detail = await LoadEditableSurgeryOrderAsync(orderId);
        detail.Status = 3; // hủy dòng
        detail.UpdatedAt = DateTime.Now;
        detail.UpdatedBy = userId.ToString();
        RefreshRequestTotals(detail.ServiceRequest);
        await SaveWithBhytSplitAsync(detail.ServiceRequest.MedicalRecordId);
        return true;
    }

    public async Task<List<SurgeryServiceOrderDto>> GetServiceOrdersAsync(Guid surgeryId)
    {
        if (!await _context.SurgeryRequests.AnyAsync(r => r.Id == surgeryId && !r.IsDeleted))
            throw new KeyNotFoundException("Không tìm thấy ca phẫu thuật.");
        return await LoadSurgeryOrdersAsync(surgeryId);
    }

    public async Task<SurgeryServiceOrderDto> ChangeOrderDoctorAsync(Guid orderId, Guid newDoctorId, Guid userId)
    {
        var detail = await LoadEditableSurgeryOrderAsync(orderId);
        if (!await _context.Users.AnyAsync(u => u.Id == newDoctorId && u.IsActive))
            throw new ArgumentException("Bác sĩ chỉ định không tồn tại hoặc đã ngừng hoạt động.", nameof(newDoctorId));
        // The ordering doctor lives on the request header — every pending line of that header moves with it.
        detail.ServiceRequest.DoctorId = newDoctorId;
        detail.ServiceRequest.UpdatedAt = DateTime.Now;
        detail.ServiceRequest.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
        return (await LoadSurgeryOrdersAsync(detail.ServiceRequest.SurgeryRequestId!.Value, new[] { detail.Id })).First();
    }

    public async Task<SurgeryServiceOrderDto> ChangePaymentObjectAsync(Guid orderId, int paymentObject, Guid userId)
    {
        if (paymentObject is not (1 or 2 or 3))
            throw new ArgumentException("Đối tượng thanh toán không hợp lệ (1 BHYT · 2 viện phí · 3 dịch vụ).", nameof(paymentObject));
        var detail = await LoadEditableSurgeryOrderAsync(orderId);
        detail.PatientType = paymentObject;
        // Reset to the hospital price; the BHYT re-split below re-applies the fund share when the line is covered.
        detail.Amount = detail.UnitPrice * detail.Quantity;
        detail.InsuranceAmount = 0;
        detail.PatientAmount = detail.Amount;
        detail.UpdatedAt = DateTime.Now;
        detail.UpdatedBy = userId.ToString();
        RefreshRequestTotals(detail.ServiceRequest);
        await SaveWithBhytSplitAsync(detail.ServiceRequest.MedicalRecordId);
        return (await LoadSurgeryOrdersAsync(detail.ServiceRequest.SurgeryRequestId!.Value, new[] { detail.Id })).First();
    }

    public async Task<ServiceCostInfoDto> GetServiceCostInfoAsync(Guid surgeryId)
    {
        var surgery = await _context.SurgeryRequests.AsNoTracking().FirstOrDefaultAsync(r => r.Id == surgeryId && !r.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy ca phẫu thuật.");
        // Service lines (incl. the PTTT fee) + billed medicines/supplies — shared with the surgery list (SurgeryCostQuery).
        var cost = (await SurgeryCostQuery.GetAsync(_context, new[] { surgeryId }))[surgeryId];
        var deposit = await _context.Deposits.AsNoTracking()
            .Where(d => d.PatientId == surgery.PatientId && d.Status != HIS.Core.Constants.DepositStatus.Cancelled && !d.IsDeleted)
            .SumAsync(d => (decimal?)d.RemainingAmount) ?? 0m;
        var total = cost.ServiceAmount + cost.MedicineAmount;
        var insurance = cost.ServiceInsurance;
        var patientPay = cost.ServicePatient + cost.MedicineAmount;
        return new ServiceCostInfoDto
        {
            TotalServiceCost = total,
            InsuranceCoverage = insurance,
            PatientPayment = patientPay,
            DepositBalance = deposit,
            RemainingDeposit = deposit - patientPay,
            HasSufficientDeposit = deposit >= patientPay,
        };
    }

    public async Task<List<ServiceOrderWarningDto>> CheckOrderWarningsAsync(Guid surgeryId, Guid serviceId)
    {
        var surgery = await _context.SurgeryRequests.AsNoTracking().FirstOrDefaultAsync(r => r.Id == surgeryId && !r.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy ca phẫu thuật.");
        var service = await _context.Services.AsNoTracking().FirstOrDefaultAsync(s => s.Id == serviceId)
            ?? throw new KeyNotFoundException("Không tìm thấy dịch vụ.");
        var warnings = new List<ServiceOrderWarningDto>();
        var (dayFrom, dayTo) = HIS.Core.Common.VnTime.DayRangeVn(HIS.Core.Common.VnTime.NowVn.Date);
        var duplicate = surgery.MedicalRecordId is Guid recordId && await _context.ServiceRequestDetails.AsNoTracking()
            .AnyAsync(d => !d.IsDeleted && d.Status != 3 && d.ServiceId == serviceId
                           && d.ServiceRequest.MedicalRecordId == recordId && d.ServiceRequest.Status != 4
                           && (d.ServiceRequest.SurgeryRequestId == surgeryId
                               || (d.ServiceRequest.RequestDate >= dayFrom && d.ServiceRequest.RequestDate < dayTo)));
        if (duplicate)
            warnings.Add(new ServiceOrderWarningDto
            {
                WarningType = 1, WarningTypeName = "Trùng dịch vụ",
                Message = $"{service.ServiceName} đã được chỉ định cho ca mổ này hoặc trong hôm nay.",
            });
        var deposit = await _context.Deposits.AsNoTracking()
            .Where(d => d.PatientId == surgery.PatientId && d.Status != HIS.Core.Constants.DepositStatus.Cancelled && !d.IsDeleted)
            .SumAsync(d => (decimal?)d.RemainingAmount) ?? 0m;
        if (service.UnitPrice > deposit)
            warnings.Add(new ServiceOrderWarningDto
            {
                WarningType = 2, WarningTypeName = "Hết tiền tạm ứng",
                Message = $"Giá dịch vụ {service.UnitPrice:#,##0}đ vượt số tạm ứng còn lại {deposit:#,##0}đ.",
            });
        return warnings;
    }

    // Service groups = the shared ServiceGroupTemplates table (same as OPD / inpatient templates).
    public async Task<List<SurgeryServiceGroupDto>> GetServiceGroupsAsync(Guid userId)
    {
        var rows = await _context.ServiceGroupTemplates.AsNoTracking().Include(t => t.Items)
            .Where(t => t.IsActive && !t.IsDeleted && (t.IsPublic || t.CreatedByUserId == userId))
            .OrderBy(t => t.SortOrder).ThenBy(t => t.TemplateName)
            .Take(200)
            .ToListAsync();
        return rows.Select(ToServiceGroupDto).ToList();
    }

    private static SurgeryServiceGroupDto ToServiceGroupDto(ServiceGroupTemplate t) => new()
    {
        Id = t.Id,
        Code = t.TemplateCode,
        Name = t.TemplateName,
        CreatedBy = t.CreatedByUserId ?? Guid.Empty,
        IsShared = t.IsPublic,
        ServiceIds = t.Items.Where(i => !i.IsDeleted).OrderBy(i => i.SortOrder).Select(i => i.ServiceId).ToList(),
    };

    private async Task<List<Guid>> ValidateGroupServicesAsync(SurgeryServiceGroupDto dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.Name))
            throw new ArgumentException("Chưa nhập tên nhóm dịch vụ.", nameof(dto.Name));
        var ids = (dto.ServiceIds ?? new()).Where(id => id != Guid.Empty).Distinct().ToList();
        if (ids.Count == 0)
            throw new ArgumentException("Nhóm dịch vụ chưa có dịch vụ nào.", nameof(dto.ServiceIds));
        var active = await _context.Services.CountAsync(s => ids.Contains(s.Id) && s.IsActive && !s.IsDeleted);
        if (active != ids.Count)
            throw new ArgumentException("Nhóm có dịch vụ không tồn tại hoặc đã ngừng sử dụng.", nameof(dto.ServiceIds));
        return ids;
    }

    public async Task<SurgeryServiceGroupDto> CreateServiceGroupAsync(SurgeryServiceGroupDto dto, Guid userId)
    {
        var ids = await ValidateGroupServicesAsync(dto);
        var now = DateTime.Now;
        var template = new ServiceGroupTemplate
        {
            Id = Guid.NewGuid(),
            TemplateCode = string.IsNullOrWhiteSpace(dto.Code) ? $"DVPT{HIS.Core.Common.VnTime.NowVn:yyyyMMddHHmmssfff}" : dto.Code.Trim(),
            TemplateName = dto.Name.Trim(),
            IsPublic = dto.IsShared,
            CreatedByUserId = userId == Guid.Empty ? null : userId,
            IsActive = true,
            CreatedAt = now,
            CreatedBy = userId.ToString(),
        };
        var order = 0;
        foreach (var id in ids)
            template.Items.Add(new ServiceGroupTemplateItem
            {
                Id = Guid.NewGuid(), ServiceGroupTemplateId = template.Id, ServiceId = id, Quantity = 1,
                SortOrder = order++, CreatedAt = now, CreatedBy = userId.ToString(),
            });
        _context.ServiceGroupTemplates.Add(template);
        await _context.SaveChangesAsync();
        return ToServiceGroupDto(template);
    }

    private async Task<ServiceGroupTemplate> LoadOwnGroupAsync(Guid groupId, Guid userId)
    {
        var template = await _context.ServiceGroupTemplates.Include(t => t.Items)
            .FirstOrDefaultAsync(t => t.Id == groupId && !t.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy nhóm dịch vụ.");
        if (template.CreatedByUserId != userId)
            throw new InvalidOperationException("Chỉ người tạo nhóm dịch vụ mới được sửa/xóa nhóm.");
        return template;
    }

    public async Task<SurgeryServiceGroupDto> UpdateServiceGroupAsync(Guid groupId, SurgeryServiceGroupDto dto, Guid userId)
    {
        var ids = await ValidateGroupServicesAsync(dto);
        var template = await LoadOwnGroupAsync(groupId, userId);
        var now = DateTime.Now;
        template.TemplateName = dto.Name.Trim();
        template.IsPublic = dto.IsShared;
        template.UpdatedAt = now;
        template.UpdatedBy = userId.ToString();
        _context.ServiceGroupTemplateItems.RemoveRange(template.Items);
        var order = 0;
        foreach (var id in ids)
            _context.ServiceGroupTemplateItems.Add(new ServiceGroupTemplateItem
            {
                Id = Guid.NewGuid(), ServiceGroupTemplateId = template.Id, ServiceId = id, Quantity = 1,
                SortOrder = order++, CreatedAt = now, CreatedBy = userId.ToString(),
            });
        await _context.SaveChangesAsync();
        var reloaded = await _context.ServiceGroupTemplates.AsNoTracking().Include(t => t.Items).FirstAsync(t => t.Id == groupId);
        return ToServiceGroupDto(reloaded);
    }

    public async Task<bool> DeleteServiceGroupAsync(Guid groupId, Guid userId)
    {
        var template = await LoadOwnGroupAsync(groupId, userId);
        template.IsDeleted = true;
        template.IsActive = false;
        template.UpdatedAt = DateTime.Now;
        template.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<SurgeryServiceOrderDto>> OrderByGroupAsync(Guid surgeryId, Guid groupId, Guid userId)
    {
        var template = await _context.ServiceGroupTemplates.AsNoTracking().Include(t => t.Items)
            .FirstOrDefaultAsync(t => t.Id == groupId && t.IsActive && !t.IsDeleted
                                      && (t.IsPublic || t.CreatedByUserId == userId))
            ?? throw new KeyNotFoundException("Không tìm thấy nhóm dịch vụ.");
        var dtos = template.Items.Where(i => !i.IsDeleted).OrderBy(i => i.SortOrder)
            .Select(i => new CreateSurgeryServiceOrderDto
            {
                SurgeryId = surgeryId, ServiceId = i.ServiceId, Quantity = i.Quantity > 0 ? i.Quantity : 1,
                ExecuteRoomId = i.DefaultRoomId, Notes = i.Notes,
            }).ToList();
        if (dtos.Count == 0)
            throw new InvalidOperationException("Nhóm dịch vụ chưa có dịch vụ nào.");
        return await OrderServicesAsync(surgeryId, dtos, userId);
    }

}
