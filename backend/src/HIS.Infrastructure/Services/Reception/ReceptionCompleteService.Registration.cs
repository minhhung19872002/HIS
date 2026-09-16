using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Insurance;
using HIS.Application.DTOs.Reception;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Configuration;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
using HIS.Infrastructure.Security;
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

// K9 phien 5 (2026-05-30): tach 4 region Registration (1.8 Fee + 1.9 HealthCheck + 1.10 Emergency + 1.11 Other, ~663 dong).
public partial class ReceptionCompleteService {
    #region 1.8 Fee Registration

    public Task<AdmissionDto> RegisterFeePatientAsync(FeeRegistrationDto dto, Guid userId)
        => WithRegistrationLockAsync(() => RegisterFeePatientCoreAsync(dto, userId));

    private async Task<AdmissionDto> RegisterFeePatientCoreAsync(FeeRegistrationDto dto, Guid userId)
    {
        Patient? patient = null;
        var useNewPatient = false;

        // Find or create patient
        if (dto.PatientId.HasValue)
        {
            patient = await _patientRepo.GetByIdAsync(dto.PatientId.Value);
        }
        else if (!string.IsNullOrEmpty(dto.PatientCode))
        {
            patient = await _context.Patients.FirstOrDefaultAsync(p => p.PatientCode == dto.PatientCode);
        }
        else if (!string.IsNullOrEmpty(dto.IdentityNumber))
        {
            patient = await _context.Patients
                .Where(p => !p.IsDeleted)
                .FindByIdentityNumberDecryptedAsync(dto.IdentityNumber);
        }
        else if (!string.IsNullOrEmpty(dto.PhoneNumber))
        {
            patient = await _context.Patients
                .Where(p => !p.IsDeleted)
                .FindByPhoneNumberDecryptedAsync(dto.PhoneNumber);
        }
        else if (dto.NewPatient != null)
        {
            useNewPatient = true;
            ValidateNewPatient(dto.NewPatient);

            // The v2 reception wizard always sends CCCD inside NewPatient (never top-level), so the
            // lookup above never ran and every re-registration created a second patient record with
            // the same CCCD. Reuse the existing patient first, mirroring RegisterInsurancePatientAsync.
            if (!string.IsNullOrWhiteSpace(dto.NewPatient.IdentityNumber))
            {
                patient = await _context.Patients
                    .Where(p => !p.IsDeleted)
                    .FindByIdentityNumberDecryptedAsync(dto.NewPatient.IdentityNumber.Trim());
                // A mistyped CCCD matching another person must not silently open the visit on that
                // person's record (their allergies/history) — make reception confirm.
                if (patient != null) EnsureSamePerson(patient, dto.NewPatient);

                // QA-R4: two counters submitting the same new patient at once both saw "no such CCCD" and both
                // created a patient + visit (two BN codes for one CCCD). Take the registration lock and look the
                // CCCD up AGAIN — whoever got there first is now visible. The lock stays lazy on purpose: the
                // lookup above decrypts the whole Patients table, and holding a single hospital-wide lock across
                // it would serialise every counter on the slowest step of the flow.
                if (patient == null)
                {
                    await EnsureRegistrationLockAsync();
                    patient = await _context.Patients
                        .Where(p => !p.IsDeleted)
                        .FindByIdentityNumberDecryptedAsync(dto.NewPatient.IdentityNumber.Trim());
                    if (patient != null) EnsureSamePerson(patient, dto.NewPatient);
                }
            }
        }

        if (patient == null && useNewPatient && dto.NewPatient != null)
        {
            patient = new Patient
            {
                Id = Guid.NewGuid(),
                PatientCode = await GeneratePatientCodeAsync(),
                FullName = dto.NewPatient.FullName,
                DateOfBirth = dto.NewPatient.DateOfBirth,
                YearOfBirth = dto.NewPatient.YearOfBirth,
                Gender = dto.NewPatient.Gender,
                IdentityNumber = dto.NewPatient.IdentityNumber,
                PhoneNumber = dto.NewPatient.PhoneNumber,
                Email = dto.NewPatient.Email,
                Address = dto.NewPatient.Address,
                WardCode = dto.NewPatient.WardCode,
                WardName = dto.NewPatient.WardName,
                DistrictCode = dto.NewPatient.DistrictCode,
                DistrictName = dto.NewPatient.DistrictName,
                ProvinceCode = dto.NewPatient.ProvinceCode,
                ProvinceName = dto.NewPatient.ProvinceName,
                EthnicCode = dto.NewPatient.EthnicCode,
                EthnicName = dto.NewPatient.EthnicName,
                Occupation = dto.NewPatient.Occupation,
                InsuranceNumber = dto.NewPatient.InsuranceNumber,
                InsuranceExpireDate = dto.NewPatient.InsuranceExpireDate,
                InsuranceFacilityCode = dto.NewPatient.InsuranceFacilityCode,
                InsuranceFacilityName = dto.NewPatient.InsuranceFacilityName,
                GuardianName = dto.NewPatient.GuardianName,
                GuardianPhone = dto.NewPatient.GuardianPhone,
                GuardianRelationship = dto.NewPatient.GuardianRelationship,
                BranchId = await GetUserBranchIdAsync(userId), // R3 đa cơ sở
                CreatedAt = DateTime.Now,
                CreatedBy = userId.ToString(),
                IsDeleted = false
            };
            await _patientRepo.AddAsync(patient);
        }

        if (patient == null)
        {
            throw new KeyNotFoundException("Khong tim thay benh nhan. Vui long nhap thong tin moi.");
        }

        // Check existing active medical record for this patient — TODAY only (VN day). Outpatient
        // records that were never closed on previous days (thousands in the DB) otherwise block a
        // returning patient forever; the v2 wizard only "worked" because it created a duplicate patient.
        // Slow lookups are done by now: take the registration lock here so a double-submit cannot race
        // past this check (no-op outside WithRegistrationLockAsync).
        await EnsureRegistrationLockAsync();
        await EnsureNoActiveOutpatientRecordTodayAsync(patient.Id);

        // Create medical record. Unknown room used to surface as an FK violation (HTTP 500).
        var room = await _context.Rooms.Include(r => r.Department).FirstOrDefaultAsync(r => r.Id == dto.RoomId)
            ?? throw new KeyNotFoundException("Khong tim thay phong kham");

        var medicalRecord = new MedicalRecord
        {
            Id = Guid.NewGuid(),
            MedicalRecordCode = await GenerateMedicalRecordCodeAsync(),
            PatientId = patient.Id,
            AdmissionDate = HIS.Core.Common.VnTime.NowVn, // business timestamp = VN local (query via VnTime.DayRangeVn)
            PatientType = dto.ServiceType, // 2-Vien phi, 3-Dich vu
            TreatmentType = 1, // Ngoai tru
            RoomId = dto.RoomId,
            DoctorId = dto.DoctorId,
            DepartmentId = room?.DepartmentId,
            Status = 0, // Waiting
            CreatedAt = DateTime.UtcNow, // dot16: chuẩn UTC — màn tiếp đón "hôm nay" query CreatedAt qua DayRangeUtc
            CreatedBy = userId.ToString(),
            IsDeleted = false
        };

        await _medicalRecordRepo.AddAsync(medicalRecord);

        // Create examination
        var examination = new Examination
        {
            Id = Guid.NewGuid(),
            MedicalRecordId = medicalRecord.Id,
            ExaminationType = 1, // Primary
            DepartmentId = room?.DepartmentId ?? Guid.Empty,
            RoomId = dto.RoomId,
            DoctorId = dto.DoctorId,
            // Reception collects "Lý do khám" as a required field; it used to be dropped here.
            ChiefComplaint = string.IsNullOrWhiteSpace(dto.ChiefComplaint) ? null : dto.ChiefComplaint.Trim(),
            Status = 0, // Waiting
            CreatedAt = DateTime.UtcNow, // dot16: chuẩn UTC — màn tiếp đón "hôm nay" query CreatedAt qua DayRangeUtc
            CreatedBy = userId.ToString(),
            IsDeleted = false
        };

        await _examinationRepo.AddAsync(examination);

        // Issue queue ticket
        var queueTicket = await IssueQueueTicketAsync(new IssueQueueTicketDto
        {
            // Tiếp đón từ lịch hẹn thì dùng lại số đã giữ, không cấp số mới (migration 187).
            AppointmentId = dto.AppointmentId,
            // Quầy kéo vé đang cầm vào đăng ký thì giữ nguyên số đó.
            SourceQueueTicketId = dto.SourceQueueTicketId,
            MedicalRecordId = medicalRecord.Id,
            PatientId = patient.Id,
            PatientName = patient.FullName,
            RoomId = dto.RoomId,
            QueueType = 2, // Kham benh
            Priority = dto.IsPriority ? 1 : 0,
            Source = "Reception"
        });

        examination.QueueNumber = queueTicket.QueueNumber;
        await _examinationRepo.UpdateAsync(examination);
        await _unitOfWork.SaveChangesAsync();

        return MapToAdmissionDto(medicalRecord, patient, room, queueTicket);
    }

    public async Task<AdmissionDto> QuickRegisterByPhoneAsync(string phoneNumber, Guid roomId, int serviceType, Guid userId)
    {
        var patient = await _context.Patients
            .Where(p => !p.IsDeleted)
            .FindByPhoneNumberDecryptedAsync(phoneNumber);
        if (patient == null) throw new KeyNotFoundException("Khong tim thay benh nhan voi SĐT nay");

        return await RegisterFeePatientAsync(new FeeRegistrationDto
        {
            PatientId = patient.Id,
            RoomId = roomId,
            ServiceType = serviceType
        }, userId);
    }

    #endregion

    #region 1.9 Health Check Registration

    public async Task<HealthCheckContractDto> CreateHealthCheckContractAsync(HealthCheckContractDto dto, Guid userId)
    {
        var contract = new HealthCheckContract
        {
            Id = Guid.NewGuid(),
            ContractCode = dto.ContractCode ?? $"HDKS{DateTime.Now:yyyyMMddHHmmss}",
            ContractName = dto.ContractName,
            CompanyName = dto.CompanyName,
            CompanyAddress = dto.CompanyAddress,
            CompanyPhone = dto.CompanyPhone,
            ContactPerson = dto.ContactPerson,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            TotalPatients = dto.TotalPatients,
            TotalAmount = dto.TotalAmount,
            DiscountRate = dto.DiscountRate,
            Status = 0, // Draft
            CreatedByUserId = userId
        };

        await _context.HealthCheckContracts.AddAsync(contract);
        await _unitOfWork.SaveChangesAsync();

        dto.Id = contract.Id;
        dto.Status = 0;
        return dto;
    }

    public async Task<HealthCheckContractDto> UpdateHealthCheckContractAsync(Guid id, HealthCheckContractDto dto, Guid userId)
    {
        var contract = await _context.HealthCheckContracts.FindAsync(id);
        if (contract == null) throw new KeyNotFoundException("Contract not found");

        contract.ContractName = dto.ContractName;
        contract.CompanyName = dto.CompanyName;
        contract.CompanyAddress = dto.CompanyAddress;
        contract.CompanyPhone = dto.CompanyPhone;
        contract.ContactPerson = dto.ContactPerson;
        contract.StartDate = dto.StartDate;
        contract.EndDate = dto.EndDate;
        contract.TotalPatients = dto.TotalPatients;
        contract.TotalAmount = dto.TotalAmount;
        contract.DiscountRate = dto.DiscountRate;

        await _unitOfWork.SaveChangesAsync();

        dto.Id = id;
        return dto;
    }

    public async Task<PagedResultDto<HealthCheckContractDto>> GetHealthCheckContractsAsync(string? keyword, int? status, int page, int pageSize)
    {
        var query = _context.HealthCheckContracts.AsQueryable();

        if (!string.IsNullOrEmpty(keyword))
        {
            query = query.Where(c => c.ContractCode.Contains(keyword) ||
                                    c.ContractName.Contains(keyword) ||
                                    c.CompanyName.Contains(keyword));
        }

        if (status.HasValue)
            query = query.Where(c => c.Status == status.Value);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip(Math.Max(0, page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new HealthCheckContractDto
            {
                Id = c.Id,
                ContractCode = c.ContractCode,
                ContractName = c.ContractName,
                CompanyName = c.CompanyName,
                CompanyAddress = c.CompanyAddress,
                CompanyPhone = c.CompanyPhone,
                ContactPerson = c.ContactPerson,
                StartDate = c.StartDate,
                EndDate = c.EndDate,
                TotalPatients = c.TotalPatients,
                TotalAmount = c.TotalAmount,
                DiscountRate = c.DiscountRate,
                Status = c.Status
            })
            .ToListAsync();

        return new PagedResultDto<HealthCheckContractDto>
        {
            Items = items,
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<(int Success, int Failed, List<string> Errors)> ImportHealthCheckPatientsAsync(HealthCheckImportDto dto, Guid userId)
    {
        var success = 0;
        var failed = 0;
        var errors = new List<string>();

        if (dto.Patients == null) return (success, failed, errors);

        var importBranchId = await GetUserBranchIdAsync(userId); // R3 đa cơ sở — tính 1 lần cho cả batch

        // #195: CCCD được mã hoá ngẫu nhiên nên không so được trong SQL — FindByIdentityNumber-
        // DecryptedAsync phải nạp + giải mã TOÀN BỘ bảng Patients mỗi lần gọi. Trong vòng lặp
        // import thì mỗi dòng file là một lần quét cả bảng. Nạp 1 lần cho cả lô, đối chiếu y hệt
        // (trim + không phân biệt hoa thường, lấy bản khớp đầu tiên).
        // Danh sách này cũng nhận luôn bệnh nhân vừa tạo, nên file có 2 dòng cùng CCCD không còn
        // đẻ ra 2 hồ sơ: trước đây mỗi dòng hỏi lại DB mà bản vừa Add thì chưa SaveChanges.
        var importCandidates = await _context.Patients.Where(p => !p.IsDeleted).ToListAsync();

        foreach (var patientData in dto.Patients)
        {
            try
            {
                // Check if patient exists by ID number
                var identityNumber = patientData.IdentityNumber?.Trim();
                var existingPatient = string.IsNullOrWhiteSpace(identityNumber)
                    ? null
                    : importCandidates.FirstOrDefault(p => string.Equals(
                        p.IdentityNumber?.Trim(), identityNumber, StringComparison.OrdinalIgnoreCase));

                if (existingPatient == null)
                {
                    // Create new patient
                    existingPatient = new Patient
                    {
                        Id = Guid.NewGuid(),
                        PatientCode = await GeneratePatientCodeAsync(),
                        FullName = patientData.FullName,
                        DateOfBirth = patientData.DateOfBirth,
                        Gender = patientData.Gender,
                        IdentityNumber = patientData.IdentityNumber,
                        PhoneNumber = patientData.PhoneNumber,
                        Address = patientData.Address,
                        BranchId = importBranchId // R3 đa cơ sở
                    };
                    await _patientRepo.AddAsync(existingPatient);
                    importCandidates.Add(existingPatient);
                }

                success++;
            }
            catch (Exception ex)
            {
                failed++;
                errors.Add($"Loi dong {patientData.RowNumber}: {ex.Message}");
            }
        }

        await _unitOfWork.SaveChangesAsync();
        return (success, failed, errors);
    }

    public async Task<AdmissionDto> RegisterHealthCheckPatientAsync(HealthCheckRegistrationDto dto, Guid userId)
    {
        // Get health check package to determine room
        var package = dto.PackageId != Guid.Empty
            ? await _context.HealthCheckPackages.FindAsync(dto.PackageId)
            : null;

        // Get first room for health check (type 5)
        var healthCheckRoom = await _context.Rooms
            .Include(r => r.Department)
            .FirstOrDefaultAsync(r => r.IsActive && r.RoomType == 5);

        // Use fee registration with health check type
        return await RegisterFeePatientAsync(new FeeRegistrationDto
        {
            PatientId = dto.PatientId,
            NewPatient = dto.NewPatient,
            RoomId = healthCheckRoom?.Id ?? Guid.Empty,
            ServiceType = 4 // Health check
        }, userId);
    }

    public async Task<List<HealthCheckPackageDto>> GetHealthCheckPackagesAsync(int? forGender = null, int? age = null)
    {
        var query = _context.HealthCheckPackages
            .Include(p => p.PackageServices)
            .ThenInclude(s => s.Service)
            .Where(p => p.IsActive);

        if (forGender.HasValue)
            query = query.Where(p => p.ApplicableGender == null || p.ApplicableGender == forGender.Value);

        if (age.HasValue)
            query = query.Where(p => (p.MinAge == null || p.MinAge <= age.Value) &&
                                    (p.MaxAge == null || p.MaxAge >= age.Value));

        return await query
            .OrderBy(p => p.PackageName)
            .Select(p => new HealthCheckPackageDto
            {
                Id = p.Id,
                PackageCode = p.PackageCode,
                PackageName = p.PackageName,
                Description = p.Description,
                Price = p.PackagePrice,
                ApplicableGender = p.ApplicableGender,
                MinAge = p.MinAge,
                MaxAge = p.MaxAge,
                PackageServices = p.PackageServices.Select(s => new HealthCheckPackageServiceDto
                {
                    ServiceId = s.ServiceId,
                    ServiceCode = s.Service.ServiceCode,
                    ServiceName = s.Service.ServiceName,
                    IsMandatory = s.IsMandatory
                }).ToList()
            })
            .ToBoundedListAsync("ReceptionCompleteService.GetHealthCheckPackagesAsync");
    }

    #endregion

    #region 1.10 Emergency Registration

    public Task<AdmissionDto> RegisterEmergencyPatientAsync(EmergencyRegistrationDto dto, Guid userId)
        => WithRegistrationLockAsync(() => RegisterEmergencyPatientCoreAsync(dto, userId));

    private async Task<AdmissionDto> RegisterEmergencyPatientCoreAsync(EmergencyRegistrationDto dto, Guid userId)
    {
        Patient patient;

        if (dto.PatientId.HasValue)
        {
            patient = await _patientRepo.GetByIdAsync(dto.PatientId.Value)
                ?? throw new KeyNotFoundException("Patient not found");
        }
        else
        {
            // Create temporary patient for emergency
            patient = new Patient
            {
                Id = Guid.NewGuid(),
                PatientCode = await GeneratePatientCodeAsync(),
                FullName = dto.PatientName ?? "BENH NHAN CAP CUU",
                Gender = dto.Gender ?? 3,
                YearOfBirth = dto.EstimatedAge.HasValue ? DateTime.Today.Year - dto.EstimatedAge.Value : null,
                IdentityNumber = dto.IdentityNumber,
                PhoneNumber = dto.PhoneNumber,
                InsuranceNumber = dto.InsuranceNumber,
                BranchId = await GetUserBranchIdAsync(userId), // R3 đa cơ sở
                CreatedAt = DateTime.Now,
                CreatedBy = userId.ToString(),
                IsDeleted = false
            };
            await _patientRepo.AddAsync(patient);
        }

        // Phòng cấp cứu = RoomType 6 (bảng mã chuẩn ở Room.RoomType / migration 165).
        // Trước đây tra RoomType == 3 với chú thích "Emergency room type", nhưng 3 là PHÒNG MỔ
        // → trên prod BN cấp cứu bị đẩy vào "Phòng VIP 103" (phòng duy nhất mang type 3).
        var emergencyRoom = await _context.Rooms
            .Include(r => r.Department)
            .FirstOrDefaultAsync(r => r.RoomType == 6 && r.IsActive);

        if (emergencyRoom == null)
        {
            // Fallback cũ lấy ĐẠI một phòng đang hoạt động — có thể rơi vào quầy tiếp đón hoặc
            // phòng xét nghiệm. Thu hẹp về phòng khám để ít nhất còn là nơi khám được người bệnh.
            emergencyRoom = await _context.Rooms
                .Include(r => r.Department)
                .FirstOrDefaultAsync(r => r.RoomType == 1 && r.IsActive);
            _receptionLogger?.LogWarning(
                "Đăng ký cấp cứu: không có phòng cấp cứu (RoomType=6) đang hoạt động — tạm dùng {Room}. "
                + "Cần khai báo phòng cấp cứu trong danh mục phòng.",
                emergencyRoom?.RoomName ?? "(không có phòng khám nào)");
        }

        var medicalRecord = new MedicalRecord
        {
            Id = Guid.NewGuid(),
            MedicalRecordCode = await GenerateMedicalRecordCodeAsync(),
            PatientId = patient.Id,
            AdmissionDate = HIS.Core.Common.VnTime.NowVn, // business timestamp = VN local
            PatientType = dto.PatientType,
            TreatmentType = 3, // Emergency
            InsuranceNumber = dto.InsuranceNumber,
            RoomId = emergencyRoom?.Id,
            DepartmentId = emergencyRoom?.DepartmentId,
            InitialDiagnosis = dto.ChiefComplaint,
            Status = 0,
            CreatedAt = DateTime.UtcNow, // dot16: chuẩn UTC — màn tiếp đón "hôm nay" query CreatedAt qua DayRangeUtc
            CreatedBy = userId.ToString(),
            IsDeleted = false
        };

        await _medicalRecordRepo.AddAsync(medicalRecord);

        // Create examination with emergency priority
        var examination = new Examination
        {
            Id = Guid.NewGuid(),
            MedicalRecordId = medicalRecord.Id,
            ExaminationType = 1,
            DepartmentId = emergencyRoom?.DepartmentId ?? Guid.Empty,
            RoomId = emergencyRoom?.Id ?? Guid.Empty,
            ChiefComplaint = dto.ChiefComplaint,
            Status = 0,
            CreatedAt = DateTime.UtcNow, // dot16: chuẩn UTC — màn tiếp đón "hôm nay" query CreatedAt qua DayRangeUtc
            CreatedBy = userId.ToString(),
            IsDeleted = false
        };

        await _examinationRepo.AddAsync(examination);

        // Issue emergency queue ticket
        var queueTicket = await IssueQueueTicketAsync(new IssueQueueTicketDto
        {
            // Link the ticket to the record like the fee/BHYT paths do; without it calling/serving the
            // emergency ticket never synced the record status and the ticket was orphaned from the visit.
            MedicalRecordId = medicalRecord.Id,
            PatientId = patient.Id,
            PatientName = patient.FullName,
            RoomId = emergencyRoom?.Id ?? Guid.Empty,
            QueueType = 2,
            Priority = 2, // Emergency priority
            Source = "Emergency"
        });

        examination.QueueNumber = queueTicket.QueueNumber;
        await _unitOfWork.SaveChangesAsync();

        return MapToAdmissionDto(medicalRecord, patient, emergencyRoom, queueTicket);
    }

    public async Task<AdmissionDto> UpdateEmergencyPatientInfoAsync(UpdateEmergencyPatientDto dto, Guid userId)
    {
        var medicalRecord = await _context.MedicalRecords
            .Include(m => m.Patient)
            .FirstOrDefaultAsync(m => m.Id == dto.MedicalRecordId);

        if (medicalRecord == null) throw new KeyNotFoundException("Medical record not found");

        var patient = medicalRecord.Patient;
        patient.FullName = dto.FullName;
        patient.DateOfBirth = dto.DateOfBirth;
        patient.Gender = dto.Gender;
        patient.IdentityNumber = dto.IdentityNumber;
        patient.PhoneNumber = dto.PhoneNumber;
        patient.Address = dto.Address;
        patient.InsuranceNumber = dto.InsuranceNumber;

        if (dto.Guardian != null)
        {
            patient.GuardianName = dto.Guardian.FullName;
            patient.GuardianPhone = dto.Guardian.PhoneNumber;
            patient.GuardianRelationship = dto.Guardian.Relationship;
        }

        await _patientRepo.UpdateAsync(patient);
        await _unitOfWork.SaveChangesAsync();

        var room = medicalRecord.RoomId.HasValue
            ? await _context.Rooms.Include(r => r.Department).FirstOrDefaultAsync(r => r.Id == medicalRecord.RoomId)
            : null;

        return MapToAdmissionDto(medicalRecord, patient, room, null);
    }

    public async Task MergePatientsAsync(MergePatientDto dto, Guid userId)
    {
        if (dto.SourcePatientId == dto.TargetPatientId)
            throw new InvalidOperationException("Không thể ghép một bệnh nhân vào chính nó.");

        // Kiểm cả hai TRƯỚC khi đụng dữ liệu: trước đây mã đích sai thì hồ sơ vẫn bị chuyển sang một
        // id không tồn tại rồi hồ sơ nguồn bị xoá — dữ liệu mồ côi, không màn nào mở ra được.
        var sourcePatient = await _context.Patients.FirstOrDefaultAsync(p => p.Id == dto.SourcePatientId)
            ?? throw new InvalidOperationException("Không tìm thấy bệnh nhân cần ghép.");
        _ = await _context.Patients.FirstOrDefaultAsync(p => p.Id == dto.TargetPatientId)
            ?? throw new InvalidOperationException("Không tìm thấy bệnh nhân đích.");

        // Chuyển MỌI dữ liệu trỏ tới bệnh nhân nguồn — không chỉ MedicalRecords như trước (lịch hẹn, vé,
        // nhập viện, CĐHA, dị ứng, thẻ BHYT… bị bỏ lại trên hồ sơ bị xoá). Xem PatientReferenceReassigner.
        var moved = await PatientReferenceReassigner.ReassignAsync(_context, dto.SourcePatientId, dto.TargetPatientId);

        sourcePatient.IsDeleted = true;
        sourcePatient.UpdatedAt = DateTime.UtcNow;
        sourcePatient.UpdatedBy = userId.ToString();
        // Ghi lại đã ghép vào ai — app hỗ trợ người bệnh giữ id hồ sơ nguồn và cần đi theo người sang hồ sơ
        // còn lại, nếu không người bệnh thấy lịch sử khám trống (đo trên prod 15/09).
        sourcePatient.MergedIntoPatientId = dto.TargetPatientId;
        // Nén chuỗi: hồ sơ trước đó đã ghép vào nguồn giờ trỏ thẳng tới đích, tra một bước là tới.
        var earlierMerged = await _context.Patients.IgnoreQueryFilters()
            .Where(p => p.MergedIntoPatientId == dto.SourcePatientId)
            .ToListAsync();
        foreach (var p in earlierMerged) p.MergedIntoPatientId = dto.TargetPatientId;

        // Một SaveChanges duy nhất: hoặc ghép trọn, hoặc không đổi gì.
        await _unitOfWork.SaveChangesAsync();

        _receptionLogger?.LogInformation(
            "Ghép bệnh nhân {Source} → {Target} bởi {User}. Lý do: {Reason}. Đã chuyển: {Moved}",
            dto.SourcePatientId, dto.TargetPatientId, userId, dto.Reason,
            string.Join(", ", moved.Select(kv => $"{kv.Key}={kv.Value}")));
    }

    public async Task SplitPatientAsync(SplitPatientDto dto, Guid userId)
    {
        // #99 Tách bệnh án: di chuyển các hồ sơ đã chọn từ BN nguồn sang BN đích (đã tồn tại).
        // Patient-safety: chỉ reassign FK PatientId (không xóa dữ liệu), có audit, trong 1 SaveChanges.
        if (dto.MedicalRecordIds == null || dto.MedicalRecordIds.Count == 0)
            throw new InvalidOperationException("Chưa chọn hồ sơ để tách.");
        if (dto.TargetPatientId == Guid.Empty || dto.TargetPatientId == dto.SourcePatientId)
            throw new InvalidOperationException("Bệnh nhân đích không hợp lệ.");

        var target = await _patientRepo.GetByIdAsync(dto.TargetPatientId)
            ?? throw new InvalidOperationException("Không tìm thấy bệnh nhân đích.");

        var records = await _context.MedicalRecords
            .Where(m => dto.MedicalRecordIds.Contains(m.Id) && m.PatientId == dto.SourcePatientId)
            .ToListAsync();
        if (records.Count == 0)
            throw new InvalidOperationException("Không có hồ sơ hợp lệ để tách (kiểm tra hồ sơ thuộc BN nguồn).");

        foreach (var r in records)
        {
            r.PatientId = target.Id;
            r.UpdatedAt = DateTime.UtcNow;
            r.UpdatedBy = userId.ToString();
        }

        // Trước đây chỉ đổi MedicalRecords.PatientId: đợt nhập viện, phiếu CĐHA, hoá đơn, vé… của chính
        // các hồ sơ đó (50 bảng gắn PatientId kèm hồ sơ/đợt/lượt khám) vẫn nằm ở bệnh nhân nguồn — hồ sơ
        // đã sang người đích mà đợt nằm viện của nó thì không. Xem PatientReferenceReassigner.
        var moved = await PatientReferenceReassigner.ReassignForRecordsAsync(
            _context, dto.SourcePatientId, target.Id, records.Select(r => r.Id).ToList());

        await _unitOfWork.SaveChangesAsync();

        _receptionLogger?.LogInformation(
            "Tách {Count} hồ sơ từ bệnh nhân {Source} sang {Target} bởi {User}. Đã chuyển kèm: {Moved}",
            records.Count, dto.SourcePatientId, target.Id, userId,
            string.Join(", ", moved.Select(kv => $"{kv.Key}={kv.Value}")));
    }

    public async Task<DepositReceiptDto> CreateEmergencyDepositAsync(Guid medicalRecordId, decimal amount, Guid userId)
    {
        return await CreateDepositAsync(new ReceptionDepositDto
        {
            MedicalRecordId = medicalRecordId,
            Amount = amount,
            PaymentMethod = 1, // Cash
            Notes = "Tam ung cap cuu"
        }, userId);
    }

    #endregion

    #region 1.11 Other Reception Management

    public async Task<List<ReceptionWarningDto>> GetReceptionWarningsAsync(Guid patientId)
    {
        var warnings = new List<ReceptionWarningDto>();

        // Check debt
        var hasDebt = await _context.MedicalRecords
            .AnyAsync(m => m.PatientId == patientId && m.Status != 4); // Not fully paid

        if (hasDebt)
        {
            warnings.Add(new ReceptionWarningDto
            {
                WarningType = 1,
                Message = "Benh nhan con no vien phi tu lan kham truoc",
                IsBlocking = false
            });
        }

        // Check recent visit — AdmissionDate = VN local time → VN day range.
        var (rvFromUtc, rvToUtc) = HIS.Core.Common.VnTime.DayRangeVn(HIS.Core.Common.VnTime.TodayVn);
        var recentVisit = await _context.MedicalRecords
            .Where(m => m.PatientId == patientId && m.AdmissionDate >= rvFromUtc && m.AdmissionDate < rvToUtc)
            .AnyAsync();

        if (recentVisit)
        {
            warnings.Add(new ReceptionWarningDto
            {
                WarningType = 3,
                Message = "Benh nhan da dang ky kham trong ngay hom nay",
                IsBlocking = false
            });
        }

        return warnings;
    }

    public async Task<AdmissionDto> ChangeRoomAsync(ChangeRoomDto dto, Guid userId)
    {
        var medicalRecord = await _context.MedicalRecords
            .Include(m => m.Patient)
            .FirstOrDefaultAsync(m => m.Id == dto.MedicalRecordId);

        if (medicalRecord == null) throw new KeyNotFoundException("Medical record not found");

        medicalRecord.RoomId = dto.NewRoomId;
        if (dto.NewDoctorId.HasValue)
            medicalRecord.DoctorId = dto.NewDoctorId;

        // Update examination
        var examination = await _context.Examinations
            .Where(e => e.MedicalRecordId == dto.MedicalRecordId && e.Status < 4)
            .FirstOrDefaultAsync();

        if (examination != null)
        {
            examination.RoomId = dto.NewRoomId;
            if (dto.NewDoctorId.HasValue)
                examination.DoctorId = dto.NewDoctorId;
        }

        await _unitOfWork.SaveChangesAsync();

        var room = await _context.Rooms.Include(r => r.Department).FirstOrDefaultAsync(r => r.Id == dto.NewRoomId);
        return MapToAdmissionDto(medicalRecord, medicalRecord.Patient, room, null);
    }

    public async Task<AdmissionDto> UpdateAdmissionAsync(Guid id, Application.DTOs.UpdateAdmissionDto dto, Guid userId)
    {
        var medicalRecord = await _context.MedicalRecords
            .Include(m => m.Patient)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (medicalRecord == null) throw new KeyNotFoundException("Medical record not found");

        // #218/T3: `InitialDiagnosis` là nội dung lâm sàng — hồ sơ đã khoá TT46 thì không sửa được.
        // Khoa/phòng/bác sĩ phụ trách là thông tin điều phối, không thuộc phạm vi khoá nội dung, nên
        // chỉ gác đúng nhánh ghi chẩn đoán chứ không chặn cả hàm.
        // AdmissionDto.ChiefComplaint is read from MedicalRecord.InitialDiagnosis (BuildAdmissionDto) and the reception
        // drawer sends only `chiefComplaint` — it used to be ignored, so "Lý do khám" edits were never saved.
        if (string.IsNullOrEmpty(dto.InitialDiagnosis) && !string.IsNullOrEmpty(dto.ChiefComplaint))
            dto.InitialDiagnosis = dto.ChiefComplaint;

        if (!string.IsNullOrEmpty(dto.InitialDiagnosis))
            await EmrLockGuard.EnsureEditableByRecordAsync(_context, medicalRecord.Id);

        if (dto.DepartmentId.HasValue)
            medicalRecord.DepartmentId = dto.DepartmentId;
        if (dto.RoomId.HasValue)
            medicalRecord.RoomId = dto.RoomId;
        if (dto.AttendingDoctorId.HasValue)
            medicalRecord.DoctorId = dto.AttendingDoctorId;
        if (!string.IsNullOrEmpty(dto.InitialDiagnosis))
            medicalRecord.InitialDiagnosis = dto.InitialDiagnosis;

        await _unitOfWork.SaveChangesAsync();

        var room = medicalRecord.RoomId.HasValue
            ? await _context.Rooms.Include(r => r.Department).FirstOrDefaultAsync(r => r.Id == medicalRecord.RoomId)
            : null;

        return MapToAdmissionDto(medicalRecord, medicalRecord.Patient, room, null);
    }

    public async Task<AdmissionDto> RegisterWithOtherPayerAsync(Guid admissionId, Guid payerId, Guid userId)
    {
        var medicalRecord = await _context.MedicalRecords
            .Include(m => m.Patient)
            .FirstOrDefaultAsync(m => m.Id == admissionId);

        if (medicalRecord == null) throw new KeyNotFoundException("Medical record not found");

        // Link to other payer by updating PatientType and payer reference
        medicalRecord.PatientType = 3; // 3 = Other payer
        medicalRecord.UpdatedAt = DateTime.Now;
        await _unitOfWork.SaveChangesAsync();

        var room = medicalRecord.RoomId.HasValue
            ? await _context.Rooms.Include(r => r.Department).FirstOrDefaultAsync(r => r.Id == medicalRecord.RoomId)
            : null;

        return MapToAdmissionDto(medicalRecord, medicalRecord.Patient, room, null);
    }

    public async Task<List<OtherPayerDto>> GetOtherPayersAsync()
    {
        return await _context.OtherPayers
            .Where(p => p.IsActive)
            .OrderBy(p => p.PayerName)
            .Select(p => new OtherPayerDto
            {
                Id = p.Id,
                PayerCode = p.PayerCode,
                PayerName = p.PayerName,
                PayerType = p.PayerType,
                TaxCode = p.TaxCode,
                Address = p.Address,
                PhoneNumber = p.PhoneNumber,
                Email = p.Email,
                ContactPerson = p.ContactPerson,
                CreditLimit = p.CreditLimit,
                CurrentDebt = p.CurrentDebt,
                IsActive = p.IsActive
            })
            .ToBoundedListAsync("ReceptionCompleteService.GetOtherPayersAsync");
    }

    public async Task SaveGuardianInfoAsync(Guid patientId, GuardianInfoDto guardian, Guid userId)
    {
        var patient = await _patientRepo.GetByIdAsync(patientId);
        if (patient == null) throw new KeyNotFoundException("Patient not found");

        patient.GuardianName = guardian.FullName;
        patient.GuardianPhone = guardian.PhoneNumber;
        patient.GuardianRelationship = guardian.Relationship;

        await _patientRepo.UpdateAsync(patient);
        await _unitOfWork.SaveChangesAsync();
    }

    #endregion
}
