using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Insurance;
using HIS.Application.DTOs.Reception;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Configuration;
using HIS.Infrastructure.Data;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using iText.IO.Font.Constants;
using iText.Kernel.Font;
using iText.Kernel.Pdf;
using iText.Layout;
using iText.Layout.Properties;
using iText.Barcodes;
using IxPageSize = iText.Kernel.Geom.PageSize;
using QueueDailyStatisticsDto = HIS.Application.DTOs.Reception.QueueDailyStatisticsDto;
using AverageWaitingTimeDto = HIS.Application.DTOs.Reception.AverageWaitingTimeDto;
using QueueReportRequestDto = HIS.Application.DTOs.Reception.QueueReportRequestDto;
using QueueConfigurationDto = HIS.Application.DTOs.Reception.QueueConfigurationDto;


namespace HIS.Infrastructure.Services;

// K9 phien 6 (2026-05-30): tach 4 region (1.12 Visit History + 1.13 Service Orders + 1.16 Billing + 1.17 SmartCard, ~536 dong).
public partial class ReceptionCompleteService {
    #region 1.12 Visit History

    public async Task<List<PatientVisitHistoryDto>> GetPatientVisitHistoryAsync(Guid patientId, int maxRecords = 5)
    {
        var records = await _context.MedicalRecords
            .Include(m => m.Department)
            .Include(m => m.Room)
            .Include(m => m.Doctor)
            .Where(m => m.PatientId == patientId)
            .OrderByDescending(m => m.AdmissionDate)
            .Take(maxRecords)
            .ToListAsync();

        return records.Select(m => new PatientVisitHistoryDto
        {
            MedicalRecordId = m.Id,
            MedicalRecordCode = m.MedicalRecordCode,
            VisitDate = m.AdmissionDate,
            DepartmentName = m.Department?.DepartmentName,
            RoomName = m.Room?.RoomName,
            DoctorName = m.Doctor?.FullName,
            DiagnosisCode = m.MainIcdCode,
            DiagnosisName = m.MainDiagnosis,
            PatientType = m.PatientType
        }).ToList();
    }

    public async Task<PatientVisitHistoryDto?> GetVisitDetailAsync(Guid medicalRecordId)
    {
        var record = await _context.MedicalRecords
            .Include(m => m.Department)
            .Include(m => m.Room)
            .Include(m => m.Doctor)
            .FirstOrDefaultAsync(m => m.Id == medicalRecordId);

        if (record == null) return null;

        return new PatientVisitHistoryDto
        {
            MedicalRecordId = record.Id,
            MedicalRecordCode = record.MedicalRecordCode,
            VisitDate = record.AdmissionDate,
            DepartmentName = record.Department?.DepartmentName,
            RoomName = record.Room?.RoomName,
            DoctorName = record.Doctor?.FullName,
            DiagnosisCode = record.MainIcdCode,
            DiagnosisName = record.MainDiagnosis,
            PatientType = record.PatientType
        };
    }

    public async Task<HistoryDisplayConfigDto> GetHistoryDisplayConfigAsync(Guid userId)
    {
        return new HistoryDisplayConfigDto
        {
            ShowHistory = true,
            MaxHistoryRecords = 5,
            ShowDiagnosis = true,
            ShowServices = true,
            ShowCost = false
        };
    }

    public async Task SaveHistoryDisplayConfigAsync(Guid userId, HistoryDisplayConfigDto config)
    {
        try
        {
            var json = System.Text.Json.JsonSerializer.Serialize(config);
            var existing = await _context.SystemConfigs
                .FirstOrDefaultAsync(c => c.ConfigKey == $"UserPref_HistoryDisplay_{userId}");
            if (existing != null)
            {
                existing.ConfigValue = json;
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                _context.SystemConfigs.Add(new SystemConfig
                {
                    ConfigKey = $"UserPref_HistoryDisplay_{userId}",
                    ConfigValue = json,
                    ConfigType = "JSON",
                    Description = $"History display config for user {userId}",
                    IsActive = true
                });
            }
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            // Silently ignore preference save errors
        }
    }

    #endregion

    #region 1.13 Service Orders at Reception

    public async Task<List<ServiceOrderResultDto>> OrderServicesAtReceptionAsync(ReceptionServiceOrderDto dto, Guid userId)
    {
        var results = new List<ServiceOrderResultDto>();

        foreach (var item in dto.Services)
        {
            var service = await _context.Services.FindAsync(item.ServiceId);
            if (service == null) continue;

            var serviceRequest = new ServiceRequest
            {
                Id = Guid.NewGuid(),
                MedicalRecordId = dto.MedicalRecordId,
                ServiceId = item.ServiceId,
                Quantity = item.Quantity,
                UnitPrice = service.UnitPrice,
                TotalPrice = service.UnitPrice * item.Quantity,
                RoomId = item.RoomId,
                Status = 0, // Pending
                RequestedByUserId = userId,
                RequestedDate = DateTime.Now,
                Notes = item.Notes
            };

            await _context.ServiceRequests.AddAsync(serviceRequest);

            results.Add(new ServiceOrderResultDto
            {
                Id = serviceRequest.Id,
                ServiceId = service.Id,
                ServiceCode = service.ServiceCode,
                ServiceName = service.ServiceName,
                Quantity = item.Quantity,
                UnitPrice = service.UnitPrice,
                TotalPrice = serviceRequest.TotalPrice,
                RoomId = item.RoomId,
                Status = 0
            });
        }

        await _unitOfWork.SaveChangesAsync();
        return results;
    }

    public async Task<List<ServiceOrderResultDto>> OrderServicesByGroupAsync(Guid medicalRecordId, Guid groupId, Guid userId)
    {
        // Get service group template with items
        var template = await _context.ServiceGroupTemplates
            .Include(t => t.Items)
            .ThenInclude(i => i.Service)
            .FirstOrDefaultAsync(t => t.Id == groupId && t.IsActive);

        if (template == null) return new List<ServiceOrderResultDto>();

        var results = new List<ServiceOrderResultDto>();

        foreach (var item in template.Items)
        {
            var service = item.Service;
            if (service == null || !service.IsActive) continue;

            var serviceRequest = new ServiceRequest
            {
                Id = Guid.NewGuid(),
                MedicalRecordId = medicalRecordId,
                ServiceId = item.ServiceId,
                Quantity = item.Quantity,
                UnitPrice = service.UnitPrice,
                TotalPrice = service.UnitPrice * item.Quantity,
                Status = 0, // Pending
                RequestedByUserId = userId,
                RequestedDate = DateTime.Now,
                Notes = item.Notes
            };

            await _context.ServiceRequests.AddAsync(serviceRequest);

            results.Add(new ServiceOrderResultDto
            {
                Id = serviceRequest.Id,
                ServiceId = service.Id,
                ServiceCode = service.ServiceCode,
                ServiceName = service.ServiceName,
                Quantity = item.Quantity,
                UnitPrice = service.UnitPrice,
                TotalPrice = serviceRequest.TotalPrice,
                Status = 0
            });
        }

        await _unitOfWork.SaveChangesAsync();
        return results;
    }

    public async Task<ServiceOrderResultDto> UpdateServiceOrderAsync(Guid orderId, ServiceOrderItemDto dto, Guid userId)
    {
        var request = await _context.ServiceRequests.FindAsync(orderId);
        if (request == null) throw new Exception("Service order not found");

        request.Quantity = dto.Quantity;
        request.TotalPrice = request.UnitPrice * dto.Quantity;
        request.RoomId = dto.RoomId;
        request.Notes = dto.Notes;

        await _unitOfWork.SaveChangesAsync();

        var service = await _context.Services.FindAsync(request.ServiceId);

        return new ServiceOrderResultDto
        {
            Id = request.Id,
            ServiceId = request.ServiceId ?? Guid.Empty,
            ServiceCode = service?.ServiceCode ?? "",
            ServiceName = service?.ServiceName ?? "",
            Quantity = request.Quantity,
            UnitPrice = request.UnitPrice,
            TotalPrice = request.TotalPrice,
            RoomId = request.RoomId,
            Status = request.Status
        };
    }

    public async Task DeleteServiceOrderAsync(Guid orderId, Guid userId)
    {
        var request = await _context.ServiceRequests.FindAsync(orderId);
        if (request != null && request.Status == 0)
        {
            _context.ServiceRequests.Remove(request);
            await _unitOfWork.SaveChangesAsync();
        }
    }

    public async Task<List<ServiceGroupDto>> GetServiceGroupsAsync(Guid userId)
    {
        // Get user's service group templates
        var templates = await _context.ServiceGroupTemplates
            .Include(t => t.Items)
            .ThenInclude(i => i.Service)
            .Where(t => t.IsActive && (t.IsPublic || t.CreatedByUserId == userId))
            .OrderBy(t => t.TemplateName)
            .ToListAsync();

        return templates.Select(t => new ServiceGroupDto
        {
            Id = t.Id,
            GroupCode = t.TemplateCode,
            GroupName = t.TemplateName,
            IsPublic = t.IsPublic,
            Services = t.Items.Select(i => new ServiceGroupItemDto
            {
                ServiceId = i.ServiceId,
                ServiceCode = i.Service?.ServiceCode ?? "",
                ServiceName = i.Service?.ServiceName ?? "",
                Quantity = i.Quantity,
                UnitPrice = i.Service?.UnitPrice ?? 0
            }).ToList()
        }).ToList();
    }

    public async Task<ServiceGroupDto> CreateServiceGroupAsync(ServiceGroupDto dto, Guid userId)
    {
        var template = new ServiceGroupTemplate
        {
            Id = Guid.NewGuid(),
            TemplateCode = dto.GroupCode ?? $"NDV{DateTime.Now:yyyyMMddHHmmss}",
            TemplateName = dto.GroupName,
            IsPublic = dto.IsPublic,
            IsActive = true,
            CreatedByUserId = userId,
            Items = new List<ServiceGroupTemplateItem>()
        };

        if (dto.Services != null)
        {
            foreach (var item in dto.Services)
            {
                template.Items.Add(new ServiceGroupTemplateItem
                {
                    Id = Guid.NewGuid(),
                    ServiceGroupTemplateId = template.Id,
                    ServiceId = item.ServiceId,
                    Quantity = item.Quantity
                });
            }
        }

        await _context.ServiceGroupTemplates.AddAsync(template);
        await _unitOfWork.SaveChangesAsync();

        dto.Id = template.Id;
        return dto;
    }

    public async Task<OptimalPathResultDto> CalculateOptimalPathAsync(Guid medicalRecordId)
    {
        // Get pending service requests for this medical record
        var serviceRequests = await _context.ServiceRequests
            .Include(r => r.Service)
            .Include(r => r.Room)
            .ThenInclude(r => r.Department)
            .Where(r => r.MedicalRecordId == medicalRecordId && r.Status == 0)
            .OrderBy(r => r.Service.ServiceType)
            .ToListAsync();

        var steps = new List<PathStepDto>();
        var totalMinutes = 0;
        var stepNumber = 1;

        foreach (var request in serviceRequests)
        {
            // Find optimal room for this service
            var room = request.Room;
            if (room == null && request.Service != null)
            {
                room = await _context.Rooms
                    .Include(r => r.Department)
                    .FirstOrDefaultAsync(r => r.IsActive && r.RoomType == request.Service.ServiceType);
            }

            var estimatedMinutes = request.Service?.ServiceType switch
            {
                1 => 15, // Examination
                2 => 30, // Lab
                3 => 20, // Imaging
                4 => 10, // Procedure
                _ => 15
            };

            steps.Add(new PathStepDto
            {
                StepNumber = stepNumber++,
                ServiceId = request.ServiceId ?? Guid.Empty,
                ServiceName = request.Service?.ServiceName ?? "",
                RoomId = room?.Id ?? Guid.Empty,
                RoomCode = room?.RoomCode ?? "",
                RoomName = room?.RoomName ?? "",
                DepartmentName = room?.Department?.DepartmentName ?? "",
                Floor = room?.Floor ?? "",
                Building = room?.Building ?? "",
                EstimatedMinutes = estimatedMinutes,
                WaitingCount = 0 // Could be calculated from queue
            });

            totalMinutes += estimatedMinutes;
        }

        return new OptimalPathResultDto
        {
            TotalEstimatedMinutes = totalMinutes,
            Steps = steps
        };
    }

    #endregion


    #region 1.16 Billing at Reception

    public async Task<DepositReceiptDto> CreateDepositAsync(ReceptionDepositDto dto, Guid userId)
    {
        // 2026-06-13: HSBA phải tồn tại — không tạo phiếu mồ côi với MedicalRecordId rác
        var medicalRecord = await _context.MedicalRecords.FindAsync(dto.MedicalRecordId)
            ?? throw new KeyNotFoundException("Không tìm thấy hồ sơ bệnh án (medicalRecordId không tồn tại)");

        var receiptNumber = await GenerateDepositReceiptNumberAsync();

        var deposit = new Deposit
        {
            Id = Guid.NewGuid(),
            ReceiptNumber = receiptNumber,
            ReceiptDate = DateTime.UtcNow, // dot16: chuẩn UTC — Deposits/Payments bị query DayRangeUtc
            MedicalRecordId = dto.MedicalRecordId,
            Amount = dto.Amount,
            PaymentMethod = dto.PaymentMethod,
            TransactionReference = dto.TransactionReference,
            Notes = dto.Notes,
            ReceivedByUserId = userId,
            Status = 1, // Active
            UsedAmount = 0,
            RemainingAmount = dto.Amount,
            PatientId = medicalRecord.PatientId
        };

        await _context.Deposits.AddAsync(deposit);
        // 2026-06-12 (sweep prod): KHÔNG set shadow "ReceivedById" nữa — Fluent FK đã map nav
        // ReceivedBy → ReceivedByUserId (HISDbContext) nên shadow không tồn tại, Entry.Property("ReceivedById")
        // nổ "property could not be found" với MỌI request. Cột DB ReceivedById cũ đã nullable (legacy).
        await _unitOfWork.SaveChangesAsync();

        return new DepositReceiptDto
        {
            Id = deposit.Id,
            ReceiptNumber = deposit.ReceiptNumber,
            ReceiptDate = deposit.ReceiptDate,
            Amount = deposit.Amount,
            PaymentMethod = deposit.PaymentMethod,
            TransactionReference = deposit.TransactionReference,
            Notes = deposit.Notes
        };
    }

    public async Task<PaymentReceiptDto> CreatePaymentAsync(ReceptionPaymentDto dto, Guid userId)
    {
        // 2026-06-13: HSBA phải tồn tại — không tạo phiếu thu mồ côi với MedicalRecordId rác
        var medicalRecord = await _context.MedicalRecords.FindAsync(dto.MedicalRecordId)
            ?? throw new KeyNotFoundException("Không tìm thấy hồ sơ bệnh án (medicalRecordId không tồn tại)");

        var receiptNumber = await GeneratePaymentReceiptNumberAsync();

        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            ReceiptNumber = receiptNumber,
            ReceiptDate = DateTime.UtcNow, // dot16: chuẩn UTC
            MedicalRecordId = dto.MedicalRecordId,
            TotalAmount = dto.TotalAmount,
            InsuranceAmount = dto.InsuranceAmount,
            PatientAmount = dto.PatientAmount,
            DiscountAmount = dto.DiscountAmount,
            PaidAmount = dto.PaidAmount,
            ChangeAmount = dto.PaidAmount - dto.PatientAmount,
            PaymentMethod = dto.PaymentMethod,
            TransactionReference = dto.TransactionReference,
            ReceivedByUserId = userId,
            Status = 1, // Paid
            PatientId = medicalRecord.PatientId
        };

        await _context.Payments.AddAsync(payment);
        // 2026-06-12 (sweep prod): bỏ set shadow "ReceivedById" — như CreateDepositAsync ở trên,
        // shadow không còn sau Fluent FK ReceivedByUserId → từng làm endpoint này hỏng 100% request.
        await _unitOfWork.SaveChangesAsync();

        return new PaymentReceiptDto
        {
            Id = payment.Id,
            ReceiptNumber = payment.ReceiptNumber,
            ReceiptDate = payment.ReceiptDate,
            TotalAmount = payment.TotalAmount,
            PaidAmount = payment.PaidAmount,
            ChangeAmount = payment.ChangeAmount,
            PaymentMethod = payment.PaymentMethod
        };
    }

    public async Task<PatientBillingInfoDto> GetPatientBillingInfoAsync(Guid medicalRecordId)
    {
        var record = await _context.MedicalRecords
            .Include(m => m.Patient)
            .FirstOrDefaultAsync(m => m.Id == medicalRecordId);

        if (record == null) throw new Exception("Medical record not found");

        // Calculate total service amount
        var totalServiceAmount = await _context.ServiceRequests
            .Where(s => s.MedicalRecordId == medicalRecordId)
            .SumAsync(s => s.TotalPrice);

        // Calculate prescription amount
        var prescriptionAmount = await _context.Prescriptions
            .Where(p => p.MedicalRecordId == medicalRecordId)
            .SumAsync(p => p.TotalAmount);

        var totalAmount = totalServiceAmount + prescriptionAmount;

        // Calculate insurance coverage
        var insuranceAmount = await _context.ServiceRequests
            .Where(s => s.MedicalRecordId == medicalRecordId)
            .SumAsync(s => s.InsuranceAmount);

        insuranceAmount += await _context.Prescriptions
            .Where(p => p.MedicalRecordId == medicalRecordId)
            .SumAsync(p => p.InsuranceAmount);

        // Get deposits
        var depositAmount = await _context.Deposits
            .Where(d => d.MedicalRecordId == medicalRecordId && d.Status == 1)
            .SumAsync(d => d.RemainingAmount);

        // Get payments
        var paidAmount = await _context.Payments
            .Where(p => p.MedicalRecordId == medicalRecordId && p.Status == 1)
            .SumAsync(p => p.PaidAmount);

        var patientAmount = totalAmount - insuranceAmount;
        var remainingAmount = patientAmount - paidAmount - depositAmount;

        return new PatientBillingInfoDto
        {
            MedicalRecordId = medicalRecordId,
            PatientName = record.Patient.FullName,
            PatientType = record.PatientType,
            TotalServiceAmount = totalAmount,
            InsuranceCoverage = insuranceAmount,
            PatientResponsibility = patientAmount,
            DepositAmount = depositAmount,
            PaidAmount = paidAmount,
            RemainingAmount = remainingAmount > 0 ? remainingAmount : 0
        };
    }

    #endregion

    #region 1.17 Smart Card

    public async Task<SmartCardDataDto> ReadSmartCardAsync(string cardData)
    {
        // Parse smart card data
        return new SmartCardDataDto
        {
            CardNumber = cardData.Length > 10 ? cardData.Substring(0, 10) : cardData,
            PatientName = "Unknown",
            RecentVisits = new List<SmartCardVisitDto>()
        };
    }

    public async Task WriteSmartCardAsync(Guid patientId, string cardData)
    {
        // TODO: Implement smart card writing
    }

    public async Task<bool> CheckBHXHConnectionAsync()
    {
        try
        {
            return await _bhxhClient.TestConnectionAsync();
        }
        catch
        {
            return false;
        }
    }

    #endregion
}
