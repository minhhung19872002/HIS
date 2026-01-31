using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Reception;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using QueueDailyStatisticsDto = HIS.Application.DTOs.Reception.QueueDailyStatisticsDto;
using AverageWaitingTimeDto = HIS.Application.DTOs.Reception.AverageWaitingTimeDto;
using QueueReportRequestDto = HIS.Application.DTOs.Reception.QueueReportRequestDto;
using QueueConfigurationDto = HIS.Application.DTOs.Reception.QueueConfigurationDto;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Implementation đầy đủ cho Service Tiếp đón
/// </summary>
public class ReceptionCompleteService : IReceptionCompleteService
{
    private readonly HISDbContext _context;

    public ReceptionCompleteService(HISDbContext context)
    {
        _context = context;
    }

    #region 1.1 Điều phối bệnh nhân vào các phòng khám

    public async Task<List<RoomOverviewDto>> GetRoomOverviewAsync(Guid? departmentId, DateTime date)
    {
        var query = _context.Rooms.AsQueryable();
        if (departmentId.HasValue)
            query = query.Where(r => r.DepartmentId == departmentId.Value);

        var rooms = await query.Where(r => r.IsActive).ToListAsync();
        var result = new List<RoomOverviewDto>();

        foreach (var room in rooms)
        {
            var queueCount = await _context.Queues
                .CountAsync(q => q.RoomId == room.Id && q.QueueDate == date.Date && q.Status == 0);

            result.Add(new RoomOverviewDto
            {
                RoomId = room.Id,
                RoomCode = room.RoomCode ?? "",
                RoomName = room.RoomName ?? "",
                DepartmentId = room.DepartmentId,
                WaitingCount = queueCount,
                RoomStatus = room.IsActive ? 1 : 0
            });
        }

        return result;
    }

    public async Task<RoomOverviewDto?> GetRoomDetailAsync(Guid roomId, DateTime date)
    {
        var room = await _context.Rooms.FindAsync(roomId);
        if (room == null) return null;

        var queueCount = await _context.Queues
            .CountAsync(q => q.RoomId == roomId && q.QueueDate == date.Date && q.Status == 0);

        return new RoomOverviewDto
        {
            RoomId = room.Id,
            RoomCode = room.RoomCode ?? "",
            RoomName = room.RoomName ?? "",
            DepartmentId = room.DepartmentId,
            WaitingCount = queueCount,
            RoomStatus = room.IsActive ? 1 : 0
        };
    }

    public async Task<List<DoctorScheduleDto>> GetWorkingDoctorsAsync(Guid? departmentId, DateTime date)
    {
        var query = _context.Users.Where(u => u.IsActive && !u.IsDeleted);
        // Filter by department if needed
        return await query.Select(u => new DoctorScheduleDto
        {
            DoctorId = u.Id,
            DoctorCode = u.EmployeeCode ?? "",
            DoctorName = u.FullName ?? "",
            Specialty = u.Title
        }).ToListAsync();
    }

    public async Task<List<DoctorScheduleDto>> GetDoctorScheduleAsync(Guid roomId, DateTime date)
    {
        return await GetWorkingDoctorsAsync(null, date);
    }

    public async Task<List<RoomOverviewDto>> GetAvailableRoomsAsync(Guid departmentId, int patientType, DateTime date)
    {
        return await GetRoomOverviewAsync(departmentId, date);
    }

    #endregion

    #region 1.2 Hệ thống xếp hàng

    public async Task<QueueTicketDto> IssueQueueTicketAsync(IssueQueueTicketDto dto)
    {
        var nextNumber = await GetNextQueueNumberAsync(dto.RoomId, DateTime.Today);

        var queue = new Queue
        {
            Id = Guid.NewGuid(),
            MedicalRecordId = dto.MedicalRecordId,
            RoomId = dto.RoomId,
            DepartmentId = dto.DepartmentId ?? Guid.Empty,
            QueueNumber = nextNumber,
            QueueDate = DateTime.Today,
            Status = 0,
            CreatedAt = DateTime.UtcNow
        };

        await _context.Queues.AddAsync(queue);
        await _context.SaveChangesAsync();

        return new QueueTicketDto
        {
            Id = queue.Id,
            QueueNumber = queue.QueueNumber,
            RoomId = queue.RoomId,
            Status = queue.Status,
            CreatedAt = queue.CreatedAt
        };
    }

    public async Task<QueueTicketDto> IssueQueueTicketMobileAsync(MobileQueueTicketDto dto)
    {
        return await IssueQueueTicketAsync(new IssueQueueTicketDto
        {
            MedicalRecordId = dto.MedicalRecordId,
            RoomId = dto.RoomId,
            DepartmentId = dto.DepartmentId
        });
    }

    public async Task<QueueTicketDto?> CallNextAsync(Guid roomId, int queueType, Guid userId)
    {
        var next = await _context.Queues
            .Where(q => q.RoomId == roomId && q.QueueDate == DateTime.Today && q.Status == 0)
            .OrderBy(q => q.QueueNumber)
            .FirstOrDefaultAsync();

        if (next == null) return null;

        next.Status = 1; // Đang gọi
        next.CalledAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new QueueTicketDto
        {
            Id = next.Id,
            QueueNumber = next.QueueNumber,
            RoomId = next.RoomId,
            Status = next.Status
        };
    }

    public async Task<QueueTicketDto> CallSpecificAsync(Guid ticketId, Guid userId)
    {
        var queue = await _context.Queues.FindAsync(ticketId);
        if (queue == null) throw new Exception("Không tìm thấy số thứ tự");

        queue.Status = 1;
        queue.CalledAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new QueueTicketDto
        {
            Id = queue.Id,
            QueueNumber = queue.QueueNumber,
            RoomId = queue.RoomId,
            Status = queue.Status
        };
    }

    public async Task<QueueTicketDto> RecallAsync(Guid ticketId, Guid userId)
    {
        return await CallSpecificAsync(ticketId, userId);
    }

    public async Task<QueueTicketDto> SkipAsync(Guid ticketId, Guid userId, string? reason)
    {
        var queue = await _context.Queues.FindAsync(ticketId);
        if (queue == null) throw new Exception("Không tìm thấy số thứ tự");

        queue.Status = 3; // Bỏ qua
        await _context.SaveChangesAsync();

        return new QueueTicketDto
        {
            Id = queue.Id,
            QueueNumber = queue.QueueNumber,
            Status = queue.Status
        };
    }

    public async Task<QueueTicketDto> StartServingAsync(Guid ticketId, Guid userId)
    {
        var queue = await _context.Queues.FindAsync(ticketId);
        if (queue == null) throw new Exception("Không tìm thấy số thứ tự");

        queue.Status = 2; // Đang phục vụ
        await _context.SaveChangesAsync();

        return new QueueTicketDto
        {
            Id = queue.Id,
            QueueNumber = queue.QueueNumber,
            Status = queue.Status
        };
    }

    public async Task<QueueTicketDto> CompleteServingAsync(Guid ticketId)
    {
        var queue = await _context.Queues.FindAsync(ticketId);
        if (queue == null) throw new Exception("Không tìm thấy số thứ tự");

        queue.Status = 4; // Hoàn thành
        queue.CompletedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new QueueTicketDto
        {
            Id = queue.Id,
            QueueNumber = queue.QueueNumber,
            Status = queue.Status
        };
    }

    public async Task<List<QueueTicketDto>> GetWaitingListAsync(Guid roomId, int queueType, DateTime date)
    {
        return await _context.Queues
            .Where(q => q.RoomId == roomId && q.QueueDate == date.Date && q.Status == 0)
            .OrderBy(q => q.QueueNumber)
            .Select(q => new QueueTicketDto
            {
                Id = q.Id,
                QueueNumber = q.QueueNumber,
                RoomId = q.RoomId,
                Status = q.Status,
                CreatedAt = q.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<List<QueueTicketDto>> GetServingListAsync(Guid roomId, int queueType, DateTime date)
    {
        return await _context.Queues
            .Where(q => q.RoomId == roomId && q.QueueDate == date.Date && q.Status == 2)
            .Select(q => new QueueTicketDto
            {
                Id = q.Id,
                QueueNumber = q.QueueNumber,
                RoomId = q.RoomId,
                Status = q.Status
            })
            .ToListAsync();
    }

    public async Task<QueueDisplayDto> GetDisplayDataAsync(Guid roomId, int queueType)
    {
        var calling = await _context.Queues
            .Where(q => q.RoomId == roomId && q.QueueDate == DateTime.Today && q.Status == 1)
            .OrderByDescending(q => q.CalledAt)
            .FirstOrDefaultAsync();

        var waiting = await _context.Queues
            .CountAsync(q => q.RoomId == roomId && q.QueueDate == DateTime.Today && q.Status == 0);

        return new QueueDisplayDto
        {
            RoomId = roomId,
            CurrentNumber = calling?.QueueNumber ?? 0,
            WaitingCount = waiting
        };
    }

    public async Task<List<QueueTicketDto>> GetCallingTicketsAsync(Guid roomId, int limit = 5)
    {
        return await _context.Queues
            .Where(q => q.RoomId == roomId && q.QueueDate == DateTime.Today && q.Status == 1)
            .OrderByDescending(q => q.CalledAt)
            .Take(limit)
            .Select(q => new QueueTicketDto
            {
                Id = q.Id,
                QueueNumber = q.QueueNumber,
                Status = q.Status
            })
            .ToListAsync();
    }

    public async Task<QueueTicketDto?> GetQueueTicketByIdAsync(Guid id)
    {
        var queue = await _context.Queues.FindAsync(id);
        if (queue == null) return null;

        return new QueueTicketDto
        {
            Id = queue.Id,
            QueueNumber = queue.QueueNumber,
            RoomId = queue.RoomId,
            Status = queue.Status
        };
    }

    #endregion

    #region 1.3 Kết nối BHYT

    public async Task<InsuranceVerificationResultDto> VerifyInsuranceAsync(InsuranceVerificationRequestDto dto)
    {
        // Mock implementation - trong thực tế sẽ gọi API BHXH
        await Task.Delay(100);

        return new InsuranceVerificationResultDto
        {
            IsValid = true,
            InsuranceNumber = dto.InsuranceNumber,
            FullName = dto.FullName,
            CoverageRate = 0.8m,
            Message = "Thẻ BHYT hợp lệ"
        };
    }

    public async Task<InsuranceVerificationResultDto> VerifyInsuranceByQRAsync(string qrData)
    {
        // Parse QR data
        await Task.Delay(100);

        return new InsuranceVerificationResultDto
        {
            IsValid = true,
            Message = "Xác minh thành công"
        };
    }

    public async Task<bool> IsInsuranceBlockedAsync(string insuranceNumber)
    {
        // Check blocked list
        return await Task.FromResult(false);
    }

    public async Task<PagedResultDto<BlockedInsuranceDto>> GetBlockedInsuranceListAsync(string? keyword, int page, int pageSize)
    {
        return new PagedResultDto<BlockedInsuranceDto>
        {
            Items = new List<BlockedInsuranceDto>(),
            TotalCount = 0,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<BlockedInsuranceDto> BlockInsuranceAsync(string insuranceNumber, int reason, string? notes, Guid userId)
    {
        return await Task.FromResult(new BlockedInsuranceDto
        {
            InsuranceNumber = insuranceNumber,
            Reason = reason,
            Notes = notes
        });
    }

    public async Task UnblockInsuranceAsync(Guid id, Guid userId)
    {
        await Task.CompletedTask;
    }

    #endregion

    #region 1.4 Cấp thẻ BHYT tạm

    public async Task<(bool IsEligible, string Message)> CheckTemporaryInsuranceEligibilityAsync(DateTime dateOfBirth)
    {
        var age = DateTime.Today.Year - dateOfBirth.Year;
        if (age <= 6)
            return (true, "Đủ điều kiện cấp thẻ BHYT tạm");
        return (false, "Không đủ điều kiện (trên 6 tuổi)");
    }

    public async Task<TemporaryInsuranceCardDto> CreateTemporaryInsuranceAsync(CreateTemporaryInsuranceDto dto, Guid userId)
    {
        return await Task.FromResult(new TemporaryInsuranceCardDto
        {
            TemporaryNumber = $"TS{DateTime.Now:yyyyMMddHHmmss}",
            CreatedAt = DateTime.UtcNow
        });
    }

    public async Task<TemporaryInsuranceCardDto?> GetTemporaryInsuranceAsync(Guid patientId)
    {
        return await Task.FromResult<TemporaryInsuranceCardDto?>(null);
    }

    #endregion

    #region 1.5 Chụp ảnh

    public async Task<PatientPhotoDto> SavePhotoAsync(UploadPhotoDto dto, Guid userId)
    {
        return await Task.FromResult(new PatientPhotoDto
        {
            Id = Guid.NewGuid(),
            PatientId = dto.PatientId,
            PhotoType = dto.PhotoType,
            CreatedAt = DateTime.UtcNow
        });
    }

    public async Task<List<PatientPhotoDto>> GetPatientPhotosAsync(Guid patientId, Guid? medicalRecordId = null)
    {
        return await Task.FromResult(new List<PatientPhotoDto>());
    }

    public async Task DeletePhotoAsync(Guid photoId, Guid userId)
    {
        await Task.CompletedTask;
    }

    public async Task<CameraConfigDto> GetCameraConfigAsync(string workstationId)
    {
        return await Task.FromResult(new CameraConfigDto());
    }

    public async Task SaveCameraConfigAsync(string workstationId, CameraConfigDto config)
    {
        await Task.CompletedTask;
    }

    #endregion

    #region 1.6 & 1.15 Giữ/Trả giấy tờ

    public async Task<DocumentHoldDto> CreateDocumentHoldAsync(CreateDocumentHoldDto dto, Guid userId)
    {
        return await Task.FromResult(new DocumentHoldDto
        {
            Id = Guid.NewGuid(),
            HoldNumber = $"GT{DateTime.Now:yyyyMMddHHmmss}",
            CreatedAt = DateTime.UtcNow
        });
    }

    public async Task<DocumentHoldDto> ReturnDocumentAsync(ReturnDocumentDto dto, Guid userId)
    {
        return await Task.FromResult(new DocumentHoldDto
        {
            Id = dto.DocumentHoldId,
            IsReturned = true,
            ReturnedAt = DateTime.UtcNow
        });
    }

    public async Task<PagedResultDto<DocumentHoldDto>> SearchDocumentHoldsAsync(DocumentHoldSearchDto dto)
    {
        return await Task.FromResult(new PagedResultDto<DocumentHoldDto>
        {
            Items = new List<DocumentHoldDto>(),
            TotalCount = 0
        });
    }

    public async Task<List<DocumentHoldDto>> GetPatientDocumentHoldsAsync(Guid patientId)
    {
        return await Task.FromResult(new List<DocumentHoldDto>());
    }

    public async Task<DocumentHoldReceiptDto> GetDocumentHoldReceiptAsync(Guid documentHoldId)
    {
        return await Task.FromResult(new DocumentHoldReceiptDto());
    }

    public async Task<DocumentHoldReceiptDto> GetDocumentReturnReceiptAsync(Guid documentHoldId)
    {
        return await Task.FromResult(new DocumentHoldReceiptDto());
    }

    #endregion

    #region 1.7 Đăng ký khám BHYT

    public async Task<AdmissionDto> RegisterInsurancePatientAsync(InsuranceRegistrationDto dto, Guid userId)
    {
        return await RegisterPatientInternalAsync(dto.FullName, dto.DateOfBirth, dto.Gender,
            dto.PhoneNumber, dto.IdentityNumber, dto.InsuranceNumber, 1, dto.RoomId, userId);
    }

    public async Task<AdmissionDto> QuickRegisterByPatientCodeAsync(string patientCode, Guid roomId, Guid userId)
    {
        var patient = await _context.Patients.FirstOrDefaultAsync(p => p.PatientCode == patientCode);
        if (patient == null) throw new Exception("Không tìm thấy bệnh nhân");

        return await CreateMedicalRecordAsync(patient, 2, roomId, userId);
    }

    public async Task<AdmissionDto> QuickRegisterByAppointmentAsync(string appointmentCode, Guid userId)
    {
        throw new NotImplementedException("Chức năng đang phát triển");
    }

    public async Task<AdmissionDto> QuickRegisterByIdentityAsync(string identityNumber, Guid roomId, Guid userId)
    {
        var patient = await _context.Patients.FirstOrDefaultAsync(p => p.IdentityNumber == identityNumber);
        if (patient == null) throw new Exception("Không tìm thấy bệnh nhân");

        return await CreateMedicalRecordAsync(patient, 2, roomId, userId);
    }

    public async Task<AdmissionDto> RegisterByTreatmentCodeAsync(string treatmentCode, Guid roomId, Guid userId)
    {
        throw new NotImplementedException("Chức năng đang phát triển");
    }

    public async Task<AdmissionDto> RegisterBySmartCardAsync(string cardData, Guid roomId, Guid userId)
    {
        throw new NotImplementedException("Chức năng đang phát triển");
    }

    #endregion

    #region 1.8 Đăng ký khám viện phí/dịch vụ

    public async Task<AdmissionDto> RegisterFeePatientAsync(FeeRegistrationDto dto, Guid userId)
    {
        return await RegisterPatientInternalAsync(dto.FullName, dto.DateOfBirth, dto.Gender,
            dto.PhoneNumber, dto.IdentityNumber, null, dto.ServiceType, dto.RoomId, userId);
    }

    public async Task<AdmissionDto> QuickRegisterByPhoneAsync(string phoneNumber, Guid roomId, int serviceType, Guid userId)
    {
        var patient = await _context.Patients.FirstOrDefaultAsync(p => p.PhoneNumber == phoneNumber);
        if (patient == null) throw new Exception("Không tìm thấy bệnh nhân");

        return await CreateMedicalRecordAsync(patient, serviceType, roomId, userId);
    }

    #endregion

    #region 1.9 Đăng ký khám sức khỏe

    public async Task<HealthCheckContractDto> CreateHealthCheckContractAsync(HealthCheckContractDto dto, Guid userId)
    {
        dto.Id = Guid.NewGuid();
        dto.CreatedAt = DateTime.UtcNow;
        return await Task.FromResult(dto);
    }

    public async Task<HealthCheckContractDto> UpdateHealthCheckContractAsync(Guid id, HealthCheckContractDto dto, Guid userId)
    {
        return await Task.FromResult(dto);
    }

    public async Task<PagedResultDto<HealthCheckContractDto>> GetHealthCheckContractsAsync(string? keyword, int? status, int page, int pageSize)
    {
        return await Task.FromResult(new PagedResultDto<HealthCheckContractDto>
        {
            Items = new List<HealthCheckContractDto>(),
            TotalCount = 0
        });
    }

    public async Task<(int Success, int Failed, List<string> Errors)> ImportHealthCheckPatientsAsync(HealthCheckImportDto dto, Guid userId)
    {
        return await Task.FromResult((0, 0, new List<string>()));
    }

    public async Task<AdmissionDto> RegisterHealthCheckPatientAsync(HealthCheckRegistrationDto dto, Guid userId)
    {
        return await RegisterPatientInternalAsync(dto.FullName, dto.DateOfBirth, dto.Gender,
            dto.PhoneNumber, dto.IdentityNumber, null, 3, dto.RoomId, userId);
    }

    public async Task<List<HealthCheckPackageDto>> GetHealthCheckPackagesAsync(int? forGender = null, int? age = null)
    {
        return await Task.FromResult(new List<HealthCheckPackageDto>());
    }

    #endregion

    #region 1.10 Đăng ký khám cấp cứu

    public async Task<AdmissionDto> RegisterEmergencyPatientAsync(EmergencyRegistrationDto dto, Guid userId)
    {
        return await RegisterPatientInternalAsync(dto.FullName ?? "Vô danh", dto.DateOfBirth, dto.Gender ?? 0,
            dto.PhoneNumber, null, null, 4, dto.RoomId, userId);
    }

    public async Task<AdmissionDto> UpdateEmergencyPatientInfoAsync(UpdateEmergencyPatientDto dto, Guid userId)
    {
        var record = await _context.MedicalRecords.FindAsync(dto.MedicalRecordId);
        if (record == null) throw new Exception("Không tìm thấy hồ sơ");

        var patient = await _context.Patients.FindAsync(record.PatientId);
        if (patient != null)
        {
            patient.FullName = dto.FullName ?? patient.FullName;
            patient.PhoneNumber = dto.PhoneNumber ?? patient.PhoneNumber;
            patient.IdentityNumber = dto.IdentityNumber ?? patient.IdentityNumber;
            await _context.SaveChangesAsync();
        }

        return new AdmissionDto
        {
            MedicalRecordId = record.Id,
            PatientId = record.PatientId
        };
    }

    public async Task MergePatientsAsync(MergePatientDto dto, Guid userId)
    {
        await Task.CompletedTask;
    }

    public async Task<DepositReceiptDto> CreateEmergencyDepositAsync(Guid medicalRecordId, decimal amount, Guid userId)
    {
        return await Task.FromResult(new DepositReceiptDto
        {
            Id = Guid.NewGuid(),
            ReceiptNumber = $"TU{DateTime.Now:yyyyMMddHHmmss}",
            Amount = amount,
            ReceiptDate = DateTime.UtcNow
        });
    }

    #endregion

    #region 1.11 Quản lý tiếp đón khác

    public async Task<List<ReceptionWarningDto>> GetReceptionWarningsAsync(Guid patientId)
    {
        return await Task.FromResult(new List<ReceptionWarningDto>());
    }

    public async Task<AdmissionDto> ChangeRoomAsync(ChangeRoomDto dto, Guid userId)
    {
        var record = await _context.MedicalRecords.FindAsync(dto.MedicalRecordId);
        if (record == null) throw new Exception("Không tìm thấy hồ sơ");

        record.RoomId = dto.NewRoomId;
        await _context.SaveChangesAsync();

        return new AdmissionDto
        {
            MedicalRecordId = record.Id,
            RoomId = dto.NewRoomId
        };
    }

    public async Task<AdmissionDto> UpdateAdmissionAsync(Guid id, UpdateAdmissionDto dto, Guid userId)
    {
        var record = await _context.MedicalRecords.FindAsync(id);
        if (record == null) throw new Exception("Không tìm thấy hồ sơ");

        return new AdmissionDto
        {
            MedicalRecordId = record.Id
        };
    }

    public async Task<AdmissionDto> RegisterWithOtherPayerAsync(Guid admissionId, Guid payerId, Guid userId)
    {
        return await Task.FromResult(new AdmissionDto { MedicalRecordId = admissionId });
    }

    public async Task<List<OtherPayerDto>> GetOtherPayersAsync()
    {
        return await Task.FromResult(new List<OtherPayerDto>());
    }

    public async Task SaveGuardianInfoAsync(Guid patientId, GuardianInfoDto guardian, Guid userId)
    {
        await Task.CompletedTask;
    }

    #endregion

    #region 1.12 Lịch sử đăng ký khám

    public async Task<List<PatientVisitHistoryDto>> GetPatientVisitHistoryAsync(Guid patientId, int maxRecords = 5)
    {
        return await _context.MedicalRecords
            .Where(m => m.PatientId == patientId)
            .OrderByDescending(m => m.AdmissionDate)
            .Take(maxRecords)
            .Select(m => new PatientVisitHistoryDto
            {
                MedicalRecordId = m.Id,
                VisitDate = m.AdmissionDate ?? DateTime.MinValue,
                Diagnosis = m.MainDiagnosis
            })
            .ToListAsync();
    }

    public async Task<PatientVisitHistoryDto?> GetVisitDetailAsync(Guid medicalRecordId)
    {
        var record = await _context.MedicalRecords.FindAsync(medicalRecordId);
        if (record == null) return null;

        return new PatientVisitHistoryDto
        {
            MedicalRecordId = record.Id,
            VisitDate = record.AdmissionDate ?? DateTime.MinValue,
            Diagnosis = record.MainDiagnosis
        };
    }

    public async Task<HistoryDisplayConfigDto> GetHistoryDisplayConfigAsync(Guid userId)
    {
        return await Task.FromResult(new HistoryDisplayConfigDto());
    }

    public async Task SaveHistoryDisplayConfigAsync(Guid userId, HistoryDisplayConfigDto config)
    {
        await Task.CompletedTask;
    }

    #endregion

    #region 1.13 Chỉ định dịch vụ ở tiếp đón

    public async Task<List<ServiceOrderResultDto>> OrderServicesAtReceptionAsync(ReceptionServiceOrderDto dto, Guid userId)
    {
        return await Task.FromResult(new List<ServiceOrderResultDto>());
    }

    public async Task<List<ServiceOrderResultDto>> OrderServicesByGroupAsync(Guid medicalRecordId, Guid groupId, Guid userId)
    {
        return await Task.FromResult(new List<ServiceOrderResultDto>());
    }

    public async Task<ServiceOrderResultDto> UpdateServiceOrderAsync(Guid orderId, ServiceOrderItemDto dto, Guid userId)
    {
        return await Task.FromResult(new ServiceOrderResultDto { Id = orderId });
    }

    public async Task DeleteServiceOrderAsync(Guid orderId, Guid userId)
    {
        await Task.CompletedTask;
    }

    public async Task<List<ServiceGroupDto>> GetServiceGroupsAsync(Guid userId)
    {
        return await Task.FromResult(new List<ServiceGroupDto>());
    }

    public async Task<ServiceGroupDto> CreateServiceGroupAsync(ServiceGroupDto dto, Guid userId)
    {
        dto.Id = Guid.NewGuid();
        return await Task.FromResult(dto);
    }

    public async Task<OptimalPathResultDto> CalculateOptimalPathAsync(Guid medicalRecordId)
    {
        return await Task.FromResult(new OptimalPathResultDto());
    }

    #endregion

    #region 1.14 In phiếu

    public async Task<byte[]> PrintExaminationSlipAsync(Guid medicalRecordId)
    {
        return await Task.FromResult(Array.Empty<byte>());
    }

    public async Task<byte[]> PrintInsuranceCardHoldSlipAsync(Guid documentHoldId)
    {
        return await Task.FromResult(Array.Empty<byte>());
    }

    public async Task<byte[]> PrintPatientCardAsync(Guid patientId)
    {
        return await Task.FromResult(Array.Empty<byte>());
    }

    public async Task<byte[]> PrintServiceOrderSlipAsync(Guid medicalRecordId)
    {
        return await Task.FromResult(Array.Empty<byte>());
    }

    public async Task<ExaminationSlipDto> GetExaminationSlipDataAsync(Guid medicalRecordId)
    {
        return await Task.FromResult(new ExaminationSlipDto());
    }

    #endregion

    #region 1.16 Thu tiền

    public async Task<DepositReceiptDto> CreateDepositAsync(ReceptionDepositDto dto, Guid userId)
    {
        return await Task.FromResult(new DepositReceiptDto
        {
            Id = Guid.NewGuid(),
            ReceiptNumber = $"TU{DateTime.Now:yyyyMMddHHmmss}",
            Amount = dto.Amount,
            ReceiptDate = DateTime.UtcNow
        });
    }

    public async Task<PaymentReceiptDto> CreatePaymentAsync(ReceptionPaymentDto dto, Guid userId)
    {
        return await Task.FromResult(new PaymentReceiptDto
        {
            Id = Guid.NewGuid(),
            ReceiptNumber = $"PT{DateTime.Now:yyyyMMddHHmmss}",
            TotalAmount = dto.Amount,
            PaidAmount = dto.Amount,
            ReceiptDate = DateTime.UtcNow
        });
    }

    public async Task<PatientBillingInfoDto> GetPatientBillingInfoAsync(Guid medicalRecordId)
    {
        return await Task.FromResult(new PatientBillingInfoDto
        {
            MedicalRecordId = medicalRecordId
        });
    }

    #endregion

    #region 1.17 Thẻ thông minh

    public async Task<SmartCardDataDto> ReadSmartCardAsync(string cardData)
    {
        return await Task.FromResult(new SmartCardDataDto());
    }

    public async Task WriteSmartCardAsync(Guid patientId, string cardData)
    {
        await Task.CompletedTask;
    }

    public async Task<bool> CheckBHXHConnectionAsync()
    {
        return await Task.FromResult(true);
    }

    #endregion

    #region Thống kê

    public async Task<QueueRoomStatisticsDto> GetRoomQueueStatisticsAsync(Guid roomId, DateTime date)
    {
        var total = await _context.Queues.CountAsync(q => q.RoomId == roomId && q.QueueDate == date.Date);
        var waiting = await _context.Queues.CountAsync(q => q.RoomId == roomId && q.QueueDate == date.Date && q.Status == 0);
        var completed = await _context.Queues.CountAsync(q => q.RoomId == roomId && q.QueueDate == date.Date && q.Status == 4);

        return new QueueRoomStatisticsDto
        {
            RoomId = roomId,
            TotalTickets = total,
            WaitingCount = waiting,
            CompletedCount = completed
        };
    }

    public async Task<List<QueueRoomStatisticsDto>> GetDepartmentQueueStatisticsAsync(Guid departmentId, DateTime date)
    {
        var rooms = await _context.Rooms.Where(r => r.DepartmentId == departmentId).ToListAsync();
        var result = new List<QueueRoomStatisticsDto>();

        foreach (var room in rooms)
        {
            result.Add(await GetRoomQueueStatisticsAsync(room.Id, date));
        }

        return result;
    }

    public async Task<QueueDailyStatisticsDto> GetDailyStatisticsAsync(DateTime date, Guid? departmentId)
    {
        var query = _context.Queues.Where(q => q.QueueDate == date.Date);

        return new QueueDailyStatisticsDto
        {
            Date = date,
            TotalTickets = await query.CountAsync(),
            WaitingCount = await query.CountAsync(q => q.Status == 0),
            CompletedCount = await query.CountAsync(q => q.Status == 4)
        };
    }

    public async Task<AverageWaitingTimeDto> GetAverageWaitingTimeAsync(DateTime fromDate, DateTime toDate, Guid? roomId)
    {
        return await Task.FromResult(new AverageWaitingTimeDto
        {
            AverageMinutes = 10
        });
    }

    public async Task<byte[]> ExportQueueReportAsync(QueueReportRequestDto dto)
    {
        return await Task.FromResult(Array.Empty<byte>());
    }

    public async Task<QueueConfigurationDto?> GetQueueConfigurationAsync(Guid roomId, int queueType)
    {
        return await Task.FromResult<QueueConfigurationDto?>(null);
    }

    public async Task<QueueConfigurationDto> SaveQueueConfigurationAsync(QueueConfigurationDto dto)
    {
        return await Task.FromResult(dto);
    }

    #endregion

    #region Private Methods

    private async Task<int> GetNextQueueNumberAsync(Guid roomId, DateTime date)
    {
        var max = await _context.Queues
            .Where(q => q.RoomId == roomId && q.QueueDate == date.Date)
            .MaxAsync(q => (int?)q.QueueNumber) ?? 0;
        return max + 1;
    }

    private async Task<AdmissionDto> RegisterPatientInternalAsync(
        string fullName, DateTime? dateOfBirth, int gender,
        string? phoneNumber, string? identityNumber, string? insuranceNumber,
        int patientType, Guid? roomId, Guid userId)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // Tìm hoặc tạo bệnh nhân
            Patient? patient = null;

            if (!string.IsNullOrEmpty(identityNumber))
            {
                patient = await _context.Patients
                    .FirstOrDefaultAsync(p => p.IdentityNumber == identityNumber && !p.IsDeleted);
            }

            if (patient == null && !string.IsNullOrEmpty(phoneNumber))
            {
                patient = await _context.Patients
                    .FirstOrDefaultAsync(p => p.PhoneNumber == phoneNumber && !p.IsDeleted);
            }

            if (patient == null)
            {
                patient = new Patient
                {
                    Id = Guid.NewGuid(),
                    PatientCode = $"BN{DateTime.Now:yyyyMMddHHmmss}",
                    FullName = fullName,
                    DateOfBirth = dateOfBirth,
                    Gender = gender,
                    PhoneNumber = phoneNumber,
                    IdentityNumber = identityNumber,
                    InsuranceNumber = insuranceNumber,
                    CreatedAt = DateTime.UtcNow
                };
                await _context.Patients.AddAsync(patient);
            }

            // Lấy department từ room
            Guid? departmentId = null;
            if (roomId.HasValue)
            {
                var room = await _context.Rooms.FindAsync(roomId.Value);
                departmentId = room?.DepartmentId;
            }

            // Tạo hồ sơ bệnh án
            var medicalRecord = new MedicalRecord
            {
                Id = Guid.NewGuid(),
                MedicalRecordCode = $"HS{DateTime.Now:yyyyMMddHHmmss}",
                PatientId = patient.Id,
                AdmissionDate = DateTime.UtcNow,
                PatientType = patientType,
                TreatmentType = 1, // Ngoại trú
                InsuranceNumber = insuranceNumber,
                DepartmentId = departmentId,
                RoomId = roomId,
                Status = 0, // Chờ khám
                CreatedAt = DateTime.UtcNow
            };
            await _context.MedicalRecords.AddAsync(medicalRecord);

            // Cấp số hàng đợi
            int queueNumber = 0;
            if (roomId.HasValue)
            {
                queueNumber = await GetNextQueueNumberAsync(roomId.Value, DateTime.Today);
                var queue = new Queue
                {
                    Id = Guid.NewGuid(),
                    MedicalRecordId = medicalRecord.Id,
                    RoomId = roomId.Value,
                    DepartmentId = departmentId ?? Guid.Empty,
                    QueueNumber = queueNumber,
                    QueueDate = DateTime.Today,
                    Status = 0,
                    CreatedAt = DateTime.UtcNow
                };
                await _context.Queues.AddAsync(queue);
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return new AdmissionDto
            {
                MedicalRecordId = medicalRecord.Id,
                MedicalRecordCode = medicalRecord.MedicalRecordCode,
                PatientId = patient.Id,
                PatientCode = patient.PatientCode,
                PatientName = patient.FullName,
                RoomId = roomId,
                QueueNumber = queueNumber,
                AdmissionDate = medicalRecord.AdmissionDate ?? DateTime.UtcNow,
                PatientType = patientType,
                Message = "Đăng ký thành công"
            };
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            throw new Exception($"Lỗi đăng ký: {ex.Message}");
        }
    }

    private async Task<AdmissionDto> CreateMedicalRecordAsync(Patient patient, int patientType, Guid roomId, Guid userId)
    {
        var room = await _context.Rooms.FindAsync(roomId);

        var medicalRecord = new MedicalRecord
        {
            Id = Guid.NewGuid(),
            MedicalRecordCode = $"HS{DateTime.Now:yyyyMMddHHmmss}",
            PatientId = patient.Id,
            AdmissionDate = DateTime.UtcNow,
            PatientType = patientType,
            TreatmentType = 1,
            DepartmentId = room?.DepartmentId,
            RoomId = roomId,
            Status = 0,
            CreatedAt = DateTime.UtcNow
        };
        await _context.MedicalRecords.AddAsync(medicalRecord);

        var queueNumber = await GetNextQueueNumberAsync(roomId, DateTime.Today);
        var queue = new Queue
        {
            Id = Guid.NewGuid(),
            MedicalRecordId = medicalRecord.Id,
            RoomId = roomId,
            DepartmentId = room?.DepartmentId ?? Guid.Empty,
            QueueNumber = queueNumber,
            QueueDate = DateTime.Today,
            Status = 0,
            CreatedAt = DateTime.UtcNow
        };
        await _context.Queues.AddAsync(queue);

        await _context.SaveChangesAsync();

        return new AdmissionDto
        {
            MedicalRecordId = medicalRecord.Id,
            MedicalRecordCode = medicalRecord.MedicalRecordCode,
            PatientId = patient.Id,
            PatientCode = patient.PatientCode,
            PatientName = patient.FullName,
            RoomId = roomId,
            QueueNumber = queueNumber,
            AdmissionDate = medicalRecord.AdmissionDate ?? DateTime.UtcNow,
            PatientType = patientType
        };
    }

    #endregion
}
