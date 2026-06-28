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

    public async Task<AdmissionDto> RegisterFeePatientAsync(FeeRegistrationDto dto, Guid userId)
    {
        Patient? patient = null;

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
            patient = await _context.Patients.FirstOrDefaultAsync(p => p.IdentityNumber == dto.IdentityNumber);
        }
        else if (!string.IsNullOrEmpty(dto.PhoneNumber))
        {
            patient = await _context.Patients.FirstOrDefaultAsync(p => p.PhoneNumber == dto.PhoneNumber);
        }
        else if (dto.NewPatient != null)
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
            throw new Exception("Khong tim thay benh nhan. Vui long nhap thong tin moi.");
        }

        // Check existing active medical record for this patient
        var existingActiveRecord = await _context.MedicalRecords
            .FirstOrDefaultAsync(m => m.PatientId == patient.Id && m.Status < 3 && m.TreatmentType == 1);
        if (existingActiveRecord != null)
            throw new Exception($"Bệnh nhân đã có hồ sơ khám đang hoạt động (Mã: {existingActiveRecord.MedicalRecordCode})");

        // Create medical record
        var room = await _context.Rooms.Include(r => r.Department).FirstOrDefaultAsync(r => r.Id == dto.RoomId);

        var medicalRecord = new MedicalRecord
        {
            Id = Guid.NewGuid(),
            MedicalRecordCode = await GenerateMedicalRecordCodeAsync(),
            PatientId = patient.Id,
            AdmissionDate = DateTime.UtcNow, // dot16: chuẩn UTC — query DayRangeUtc (prod no-op, dev hết lệch +7h)
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
            Status = 0, // Waiting
            CreatedAt = DateTime.UtcNow, // dot16: chuẩn UTC — màn tiếp đón "hôm nay" query CreatedAt qua DayRangeUtc
            CreatedBy = userId.ToString(),
            IsDeleted = false
        };

        await _examinationRepo.AddAsync(examination);

        // Issue queue ticket
        var queueTicket = await IssueQueueTicketAsync(new IssueQueueTicketDto
        {
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
        var patient = await _context.Patients.FirstOrDefaultAsync(p => p.PhoneNumber == phoneNumber);
        if (patient == null) throw new Exception("Khong tim thay benh nhan voi SĐT nay");

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
        if (contract == null) throw new Exception("Contract not found");

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
            .Skip((page - 1) * pageSize)
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

        foreach (var patientData in dto.Patients)
        {
            try
            {
                // Check if patient exists by ID number
                var existingPatient = await _context.Patients
                    .FirstOrDefaultAsync(p => p.IdentityNumber == patientData.IdentityNumber);

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

    public async Task<AdmissionDto> RegisterEmergencyPatientAsync(EmergencyRegistrationDto dto, Guid userId)
    {
        Patient patient;

        if (dto.PatientId.HasValue)
        {
            patient = await _patientRepo.GetByIdAsync(dto.PatientId.Value)
                ?? throw new Exception("Patient not found");
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

        // Get emergency room
        var emergencyRoom = await _context.Rooms
            .Include(r => r.Department)
            .FirstOrDefaultAsync(r => r.RoomType == 3 && r.IsActive); // Emergency room type

        if (emergencyRoom == null)
        {
            emergencyRoom = await _context.Rooms.Include(r => r.Department).FirstOrDefaultAsync(r => r.IsActive);
        }

        var medicalRecord = new MedicalRecord
        {
            Id = Guid.NewGuid(),
            MedicalRecordCode = await GenerateMedicalRecordCodeAsync(),
            PatientId = patient.Id,
            AdmissionDate = DateTime.UtcNow, // dot16: chuẩn UTC
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

        if (medicalRecord == null) throw new Exception("Medical record not found");

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
        // Transfer all records from source to target
        var sourceRecords = await _context.MedicalRecords
            .Where(m => m.PatientId == dto.SourcePatientId)
            .ToListAsync();

        foreach (var record in sourceRecords)
        {
            record.PatientId = dto.TargetPatientId;
        }

        // Delete source patient
        var sourcePatient = await _patientRepo.GetByIdAsync(dto.SourcePatientId);
        if (sourcePatient != null)
        {
            await _patientRepo.DeleteAsync(sourcePatient);
        }

        await _unitOfWork.SaveChangesAsync();
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

        await _unitOfWork.SaveChangesAsync();
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

        // Check recent visit — AdmissionDate ghi DateTime.Now → DayRangeUtc tránh lệch UTC 00h-07h VN.
        var (rvFromUtc, rvToUtc) = HIS.Core.Common.VnTime.DayRangeUtc(HIS.Core.Common.VnTime.TodayVn);
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

        if (medicalRecord == null) throw new Exception("Medical record not found");

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

        if (medicalRecord == null) throw new Exception("Medical record not found");

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

        if (medicalRecord == null) throw new Exception("Medical record not found");

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
        if (patient == null) throw new Exception("Patient not found");

        patient.GuardianName = guardian.FullName;
        patient.GuardianPhone = guardian.PhoneNumber;
        patient.GuardianRelationship = guardian.Relationship;

        await _patientRepo.UpdateAsync(patient);
        await _unitOfWork.SaveChangesAsync();
    }

    #endregion
}
