using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Inpatient;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
using System.Text;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

// K6 phien 1 (2026-05-30): tach 3.2 Patient Management (~942 dong) khoi InpatientCompleteService.
public partial class InpatientCompleteService {
    #region 3.2 Patient Management

    /// <summary>
    /// Get list of inpatients with search filters
    /// </summary>
    public async Task<PagedResultDto<InpatientListDto>> GetInpatientListAsync(InpatientSearchDto searchDto)
    {
        var query = _context.MedicalRecords
            .Include(m => m.Patient)
            .Include(m => m.Department)
            .Include(m => m.Room)
            .Include(m => m.Bed)
            .Include(m => m.Doctor)
            .Where(m => m.TreatmentType == 2); // 2 = Inpatient

        // Apply filters
        if (searchDto.FromDate.HasValue)
            query = query.Where(m => m.AdmissionDate >= searchDto.FromDate.Value);

        if (searchDto.ToDate.HasValue)
            query = query.Where(m => m.AdmissionDate <= searchDto.ToDate.Value);

        if (searchDto.DepartmentId.HasValue)
            query = query.Where(m => m.DepartmentId == searchDto.DepartmentId.Value);

        if (searchDto.RoomId.HasValue)
            query = query.Where(m => m.RoomId == searchDto.RoomId.Value);

        if (searchDto.Status.HasValue)
            query = query.Where(m => m.Status == searchDto.Status.Value);

        if (searchDto.IsInsurance.HasValue)
        {
            if (searchDto.IsInsurance.Value)
                query = query.Where(m => m.PatientType == 1); // BHYT
            else
                query = query.Where(m => m.PatientType != 1); // Non-BHYT
        }

        if (!string.IsNullOrWhiteSpace(searchDto.Keyword))
        {
            var keyword = searchDto.Keyword.ToLower();
            query = query.Where(m =>
                m.MedicalRecordCode.ToLower().Contains(keyword) ||
                m.Patient.PatientCode.ToLower().Contains(keyword) ||
                m.Patient.FullName.ToLower().Contains(keyword));
        }

        // Get total count
        var totalCount = await query.CountAsync();

        // Apply sorting
        if (!string.IsNullOrWhiteSpace(searchDto.SortBy))
        {
            query = searchDto.SortBy.ToLower() switch
            {
                "admissiondate" => searchDto.SortDesc
                    ? query.OrderByDescending(m => m.AdmissionDate)
                    : query.OrderBy(m => m.AdmissionDate),
                "patientname" => searchDto.SortDesc
                    ? query.OrderByDescending(m => m.Patient.FullName)
                    : query.OrderBy(m => m.Patient.FullName),
                "bedname" => searchDto.SortDesc
                    ? query.OrderByDescending(m => m.Bed!.BedName)
                    : query.OrderBy(m => m.Bed!.BedName),
                _ => query.OrderByDescending(m => m.AdmissionDate)
            };
        }
        else
        {
            query = query.OrderByDescending(m => m.AdmissionDate);
        }

        // Apply pagination
        var items = await query
            .Skip((searchDto.Page - 1) * searchDto.PageSize)
            .Take(searchDto.PageSize)
            .Select(m => new InpatientListDto
            {
                AdmissionId = _context.Set<Admission>()
                    .Where(a => a.MedicalRecordId == m.Id && !a.IsDeleted)
                    .OrderByDescending(a => a.AdmissionDate)
                    .Select(a => a.Id)
                    .FirstOrDefault(),
                MedicalRecordCode = m.MedicalRecordCode,
                PatientId = m.Patient.Id,
                PatientCode = m.Patient.PatientCode,
                PatientName = m.Patient.FullName,
                Gender = m.Patient.Gender,
                DateOfBirth = m.Patient.DateOfBirth,
                Age = m.Patient.DateOfBirth.HasValue
                    ? DateTime.Now.Year - m.Patient.DateOfBirth.Value.Year
                    : (m.Patient.YearOfBirth.HasValue ? DateTime.Now.Year - m.Patient.YearOfBirth.Value : null),
                InsuranceNumber = m.InsuranceNumber,
                IsInsurance = m.PatientType == 1,
                InsuranceExpiry = m.InsuranceExpireDate,
                DepartmentName = m.Department != null ? m.Department.DepartmentName : "",
                RoomName = m.Room != null ? m.Room.RoomName : "",
                BedName = m.Bed != null ? m.Bed.BedName : null,
                AdmissionDate = m.AdmissionDate,
                DaysOfStay = (int)(DateTime.Now - m.AdmissionDate).TotalDays,
                MainDiagnosis = m.MainDiagnosis,
                AttendingDoctorName = m.Doctor != null ? m.Doctor.FullName : null,
                Status = m.Status,
                HasPendingOrders = _context.ServiceRequests
                    .Any(sr => sr.MedicalRecordId == m.Id && !sr.IsDeleted && sr.Status < 2),
                HasPendingLabResults = _context.ServiceRequestDetails
                    .Any(srd => srd.ServiceRequest.MedicalRecordId == m.Id
                        && !srd.IsDeleted && srd.Status < 2
                        && srd.ServiceRequest.RequestType == 1),
                HasUnclaimedMedicine = _context.Prescriptions
                    .Any(p => p.MedicalRecordId == m.Id && !p.IsDeleted && !p.IsDispensed && p.Status < 2),
                IsDebtWarning = _context.ServiceRequests
                    .Any(sr => sr.MedicalRecordId == m.Id && !sr.IsDeleted && !sr.IsPaid && sr.Status != 4),
                TotalDebt = _context.ServiceRequests
                    .Where(sr => sr.MedicalRecordId == m.Id && !sr.IsDeleted && !sr.IsPaid && sr.Status != 4)
                    .Sum(sr => (decimal?)sr.PatientAmount),
                IsInsuranceExpiring = m.InsuranceExpireDate.HasValue &&
                    m.InsuranceExpireDate.Value <= DateTime.Now.AddDays(7)
            })
            .ToListAsync();

        return new PagedResultDto<InpatientListDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = searchDto.Page,
            PageSize = searchDto.PageSize
        };
    }

    public async Task<AdmissionDto?> GetAdmissionDetailAsync(Guid admissionId)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null)
            return null;

        var dept = await _context.Departments.FindAsync(admission.DepartmentId);
        var room = admission.RoomId != Guid.Empty ? await _context.Rooms.FindAsync(admission.RoomId) : null;
        var bed = admission.BedId.HasValue ? await _context.Beds.FindAsync(admission.BedId.Value) : null;
        var doctor = admission.AdmittingDoctorId != Guid.Empty ? await _context.Users.FindAsync(admission.AdmittingDoctorId) : null;

        return new AdmissionDto
        {
            Id = admission.Id,
            PatientId = admission.PatientId,
            PatientCode = admission.Patient.PatientCode,
            PatientName = admission.Patient.FullName,
            DateOfBirth = admission.Patient.DateOfBirth,
            Gender = admission.Patient.Gender == 1 ? "Nam" : "Nữ",
            Address = admission.Patient.Address,
            PhoneNumber = admission.Patient.PhoneNumber,
            IdentityNumber = admission.Patient.IdentityNumber,
            InsuranceNumber = admission.Patient.InsuranceNumber,
            AdmissionDate = admission.AdmissionDate,
            AdmissionType = GetAdmissionTypeName(admission.AdmissionType),
            DepartmentId = admission.DepartmentId,
            DepartmentName = dept?.DepartmentName ?? "",
            RoomId = admission.RoomId,
            RoomName = room?.RoomName ?? "",
            BedId = admission.BedId,
            BedName = bed?.BedName ?? "",
            InitialDiagnosis = admission.DiagnosisOnAdmission,
            ChiefComplaint = admission.ReasonForAdmission,
            AttendingDoctorId = admission.AdmittingDoctorId,
            AttendingDoctorName = doctor?.FullName ?? "",
            Status = GetAdmissionStatusName(admission.Status),
            CreatedDate = admission.CreatedAt
        };
    }

    /// <summary>
    /// Get bed status with occupancy information
    /// </summary>
    public async Task<List<BedStatusDto>> GetBedStatusAsync(Guid? departmentId, Guid? roomId)
    {
        var query = _context.Beds
            .Include(b => b.Room)
            .ThenInclude(r => r.Department)
            .Where(b => b.IsActive);

        if (departmentId.HasValue)
            query = query.Where(b => b.Room.DepartmentId == departmentId.Value);

        if (roomId.HasValue)
            query = query.Where(b => b.RoomId == roomId.Value);

        var beds = await query.ToListAsync();

        // Get current bed assignments
        var bedIds = beds.Select(b => b.Id).ToList();
        var currentAssignments = await _context.Set<BedAssignment>()
            .Include(ba => ba.Admission)
            .ThenInclude(a => a.Patient)
            .Where(ba => bedIds.Contains(ba.BedId) && ba.Status == 0) // 0 = Active
            .ToListAsync();

        var result = beds.Select(bed =>
        {
            var assignment = currentAssignments.FirstOrDefault(ba => ba.BedId == bed.Id);
            var bedStatus = assignment != null ? 1 : 0; // 0=Empty, 1=Occupied, 2=Maintenance
            var daysOfStay = assignment?.AssignedAt != null
                ? (int)(DateTime.Now - assignment.AssignedAt).TotalDays
                : (int?)null;

            return new BedStatusDto
            {
                BedId = bed.Id,
                BedCode = bed.BedCode,
                BedName = bed.BedName,
                RoomId = bed.RoomId,
                RoomName = bed.Room.RoomName,
                DepartmentId = bed.Room.DepartmentId,
                DepartmentName = bed.Room.Department.DepartmentName,
                BedStatus = bedStatus,
                BedStatusName = bedStatus switch
                {
                    0 => "Trống",
                    1 => "Có bệnh nhân",
                    2 => "Bảo trì",
                    _ => "Không xác định"
                },
                CurrentAdmissionId = assignment?.AdmissionId,
                PatientName = assignment?.Admission?.Patient?.FullName,
                PatientCode = assignment?.Admission?.Patient?.PatientCode,
                AdmissionDate = assignment?.AssignedAt,
                DaysOfStay = daysOfStay
            };
        }).ToList();

        return result;
    }

    public async Task<AdmissionDto> AdmitFromOpdAsync(AdmitFromOpdDto dto, Guid userId)
    {
        // Get the medical record
        var medicalRecord = await _context.MedicalRecords
            .Include(m => m.Patient)
            .FirstOrDefaultAsync(m => m.Id == dto.MedicalRecordId);

        if (medicalRecord == null)
            throw new Exception("Medical record not found");

        // Update medical record to IPD type
        medicalRecord.TreatmentType = 2; // Inpatient
        medicalRecord.DepartmentId = dto.DepartmentId;
        medicalRecord.RoomId = dto.RoomId;
        medicalRecord.BedId = dto.BedId;
        medicalRecord.DoctorId = dto.AttendingDoctorId;
        medicalRecord.InitialDiagnosis = dto.DiagnosisOnAdmission;
        medicalRecord.UpdatedAt = DateTime.Now;

        // Create admission record
        var admission = new Admission
        {
            Id = Guid.NewGuid(),
            PatientId = medicalRecord.PatientId,
            MedicalRecordId = medicalRecord.Id,
            AdmissionDate = DateTime.UtcNow, // dot16: chuẩn UTC
            AdmissionType = dto.AdmissionType,
            AdmittingDoctorId = dto.AttendingDoctorId,
            DepartmentId = dto.DepartmentId,
            RoomId = dto.RoomId,
            BedId = dto.BedId,
            DiagnosisOnAdmission = dto.DiagnosisOnAdmission,
            ReasonForAdmission = dto.ReasonForAdmission,
            Status = 0, // 0 = Active
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString()
        };

        _context.Set<Admission>().Add(admission);

        // Create bed assignment if bed is specified
        if (dto.BedId.HasValue)
        {
            var bedAssignment = new BedAssignment
            {
                Id = Guid.NewGuid(),
                AdmissionId = admission.Id,
                BedId = dto.BedId.Value,
                AssignedAt = DateTime.Now,
                Status = 0, // Active
                CreatedAt = DateTime.Now,
                CreatedBy = userId.ToString()
            };
            _context.Set<BedAssignment>().Add(bedAssignment);
        }

        await _context.SaveChangesAsync();

        // Get department and room names for response
        var department = await _context.Departments.FindAsync(dto.DepartmentId);
        var room = await _context.Rooms.FindAsync(dto.RoomId);
        var bed = dto.BedId.HasValue ? await _context.Beds.FindAsync(dto.BedId.Value) : null;

        return new AdmissionDto
        {
            Id = admission.Id,
            PatientId = admission.PatientId,
            PatientCode = medicalRecord.Patient.PatientCode,
            PatientName = medicalRecord.Patient.FullName,
            DateOfBirth = medicalRecord.Patient.DateOfBirth,
            Gender = medicalRecord.Patient.Gender == 1 ? "Nam" : "Nữ",
            Address = medicalRecord.Patient.Address,
            PhoneNumber = medicalRecord.Patient.PhoneNumber,
            IdentityNumber = medicalRecord.Patient.IdentityNumber,
            AdmissionDate = admission.AdmissionDate,
            AdmissionType = GetAdmissionTypeName(admission.AdmissionType),
            DepartmentId = admission.DepartmentId,
            DepartmentName = department?.DepartmentName ?? "",
            RoomId = admission.RoomId,
            RoomName = room?.RoomName ?? "",
            BedId = admission.BedId,
            BedName = bed?.BedName ?? "",
            InitialDiagnosis = admission.DiagnosisOnAdmission,
            ChiefComplaint = admission.ReasonForAdmission,
            AttendingDoctorId = admission.AdmittingDoctorId,
            Status = GetAdmissionStatusName(admission.Status),
            CreatedDate = admission.CreatedAt
        };
    }

    public async Task<AdmissionDto> AdmitFromDepartmentAsync(AdmitFromDepartmentDto dto, Guid userId)
    {
        var sourceAdmission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord)
            .FirstOrDefaultAsync(a => a.Id == dto.SourceAdmissionId);
        if (sourceAdmission == null)
            throw new Exception("Source admission not found");

        var medicalRecord = sourceAdmission.MedicalRecord;
        medicalRecord.DepartmentId = dto.TargetDepartmentId;
        medicalRecord.RoomId = dto.TargetRoomId;
        medicalRecord.BedId = dto.TargetBedId;
        medicalRecord.DoctorId = dto.AttendingDoctorId;
        medicalRecord.UpdatedAt = DateTime.Now;

        // Update source admission status — #11: dùng 5 "Đã chuyển khoa" (trước đây =1 trùng
        // "Đã xuất viện", làm BN chuyển khoa bị coi như đã ra viện).
        sourceAdmission.Status = 5; // Đã chuyển khoa

        // Create new admission
        var admission = new Admission
        {
            Id = Guid.NewGuid(),
            PatientId = sourceAdmission.PatientId,
            MedicalRecordId = sourceAdmission.MedicalRecordId,
            AdmissionDate = DateTime.UtcNow, // dot16: chuẩn UTC
            AdmissionType = sourceAdmission.AdmissionType,
            AdmittingDoctorId = dto.AttendingDoctorId,
            DepartmentId = dto.TargetDepartmentId,
            RoomId = dto.TargetRoomId,
            BedId = dto.TargetBedId,
            DiagnosisOnAdmission = dto.DiagnosisOnTransfer,
            ReasonForAdmission = dto.TransferReason,
            Status = 0,
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString()
        };

        _context.Set<Admission>().Add(admission);

        // Release old bed
        var oldBedAssignment = await _context.Set<BedAssignment>()
            .FirstOrDefaultAsync(ba => ba.AdmissionId == dto.SourceAdmissionId && ba.Status == 0);
        if (oldBedAssignment != null)
        {
            oldBedAssignment.Status = 2;
            oldBedAssignment.ReleasedAt = DateTime.Now;
        }

        // Assign new bed
        if (dto.TargetBedId.HasValue)
        {
            var bedAssignment = new BedAssignment
            {
                Id = Guid.NewGuid(),
                AdmissionId = admission.Id,
                BedId = dto.TargetBedId.Value,
                AssignedAt = DateTime.Now,
                Status = 0,
                CreatedAt = DateTime.Now,
                CreatedBy = userId.ToString()
            };
            _context.Set<BedAssignment>().Add(bedAssignment);
        }

        await _context.SaveChangesAsync();

        var department = await _context.Departments.FindAsync(dto.TargetDepartmentId);
        var room = await _context.Rooms.FindAsync(dto.TargetRoomId);
        var bed = dto.TargetBedId.HasValue ? await _context.Beds.FindAsync(dto.TargetBedId.Value) : null;

        return new AdmissionDto
        {
            Id = admission.Id,
            PatientId = admission.PatientId,
            PatientCode = sourceAdmission.Patient.PatientCode,
            PatientName = sourceAdmission.Patient.FullName,
            DateOfBirth = sourceAdmission.Patient.DateOfBirth,
            Gender = sourceAdmission.Patient.Gender == 1 ? "Nam" : "N\u1eef",
            AdmissionDate = admission.AdmissionDate,
            AdmissionType = GetAdmissionTypeName(admission.AdmissionType),
            DepartmentId = dto.TargetDepartmentId,
            DepartmentName = department?.DepartmentName ?? "",
            RoomId = dto.TargetRoomId,
            RoomName = room?.RoomName ?? "",
            BedId = dto.TargetBedId,
            BedName = bed?.BedName ?? "",
            InitialDiagnosis = admission.DiagnosisOnAdmission,
            ChiefComplaint = admission.ReasonForAdmission,
            AttendingDoctorId = admission.AdmittingDoctorId,
            Status = GetAdmissionStatusName(admission.Status),
            CreatedDate = admission.CreatedAt
        };
    }

    public Task<CombinedTreatmentDto> CreateCombinedTreatmentAsync(CreateCombinedTreatmentDto dto, Guid userId)
    {
        return Task.FromResult(new CombinedTreatmentDto
        {
            Id = Guid.NewGuid(),
            AdmissionId = dto.AdmissionId,
            ConsultingDepartmentId = dto.ConsultingDepartmentId,
            RequestDate = DateTime.Now,
            RequestReason = dto.RequestReason,
            ConsultingDiagnosis = dto.ConsultingDiagnosis,
            ConsultingDoctorId = userId,
            Status = 0
        });
    }

    public Task<List<CombinedTreatmentDto>> GetCombinedTreatmentsAsync(Guid admissionId)
    {
        return Task.FromResult(new List<CombinedTreatmentDto>());
    }

    public Task<CombinedTreatmentDto> CompleteCombinedTreatmentAsync(Guid id, string treatmentResult, Guid userId)
    {
        return Task.FromResult(new CombinedTreatmentDto
        {
            Id = id,
            Status = 2,
            TreatmentResult = treatmentResult,
            CompletedDate = DateTime.Now
        });
    }

    public async Task<AdmissionDto> TransferDepartmentAsync(DepartmentTransferDto dto, Guid userId)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .FirstOrDefaultAsync(a => a.Id == dto.AdmissionId);
        if (admission == null)
            throw new Exception("Admission not found");

        // Release current bed
        var currentBedAssignment = await _context.Set<BedAssignment>()
            .FirstOrDefaultAsync(ba => ba.AdmissionId == dto.AdmissionId && ba.Status == 0);
        if (currentBedAssignment != null)
        {
            currentBedAssignment.Status = 2; // Chuyển
            currentBedAssignment.ReleasedAt = DateTime.Now;
        }

        // Update admission
        admission.DepartmentId = dto.TargetDepartmentId;
        admission.RoomId = dto.TargetRoomId;
        admission.BedId = dto.TargetBedId;

        // Update medical record
        var medRecord = await _context.MedicalRecords.FindAsync(admission.MedicalRecordId);
        if (medRecord != null)
        {
            medRecord.DepartmentId = dto.TargetDepartmentId;
            medRecord.RoomId = dto.TargetRoomId;
            medRecord.BedId = dto.TargetBedId;
        }

        // Assign new bed if specified
        if (dto.TargetBedId.HasValue)
        {
            var newAssignment = new BedAssignment
            {
                Id = Guid.NewGuid(),
                AdmissionId = dto.AdmissionId,
                BedId = dto.TargetBedId.Value,
                AssignedAt = DateTime.Now,
                Status = 0,
                CreatedAt = DateTime.Now,
                CreatedBy = userId.ToString()
            };
            _context.Set<BedAssignment>().Add(newAssignment);
        }

        await _context.SaveChangesAsync();

        var dept = await _context.Departments.FindAsync(dto.TargetDepartmentId);
        var room = await _context.Rooms.FindAsync(dto.TargetRoomId);
        var bed = dto.TargetBedId.HasValue ? await _context.Beds.FindAsync(dto.TargetBedId.Value) : null;

        return new AdmissionDto
        {
            Id = admission.Id,
            PatientId = admission.PatientId,
            PatientCode = admission.Patient.PatientCode,
            PatientName = admission.Patient.FullName,
            DateOfBirth = admission.Patient.DateOfBirth,
            Gender = admission.Patient.Gender == 1 ? "Nam" : "Nữ",
            AdmissionDate = admission.AdmissionDate,
            AdmissionType = GetAdmissionTypeName(admission.AdmissionType),
            DepartmentId = dto.TargetDepartmentId,
            DepartmentName = dept?.DepartmentName ?? "",
            RoomId = dto.TargetRoomId,
            RoomName = room?.RoomName ?? "",
            BedId = dto.TargetBedId,
            BedName = bed?.BedName ?? "",
            InitialDiagnosis = admission.DiagnosisOnAdmission,
            Status = GetAdmissionStatusName(admission.Status),
            CreatedDate = admission.CreatedAt
        };
    }

    public Task<CombinedTreatmentDto> TransferCombinedTreatmentAsync(Guid combinedTreatmentId, Guid newDepartmentId, Guid userId)
    {
        return Task.FromResult(new CombinedTreatmentDto
        {
            Id = combinedTreatmentId,
            ConsultingDepartmentId = newDepartmentId,
            Status = 1
        });
    }

    public Task<SpecialtyConsultRequestDto> RequestSpecialtyConsultAsync(CreateSpecialtyConsultDto dto, Guid userId)
    {
        return Task.FromResult(new SpecialtyConsultRequestDto
        {
            Id = Guid.NewGuid(),
            AdmissionId = dto.AdmissionId,
            SpecialtyDepartmentId = dto.SpecialtyDepartmentId,
            RequestingDoctorId = userId,
            RequestDate = DateTime.Now,
            RequestReason = dto.RequestReason,
            ClinicalInfo = dto.ClinicalInfo,
            Status = 0
        });
    }

    public Task<List<SpecialtyConsultRequestDto>> GetSpecialtyConsultRequestsAsync(Guid admissionId)
    {
        return Task.FromResult(new List<SpecialtyConsultRequestDto>());
    }

    public Task<SpecialtyConsultRequestDto> CompleteSpecialtyConsultAsync(Guid id, string result, string recommendations, Guid doctorId)
    {
        return Task.FromResult(new SpecialtyConsultRequestDto
        {
            Id = id,
            ConsultingDoctorId = doctorId,
            ConsultDate = DateTime.Now,
            ConsultResult = result,
            Recommendations = recommendations,
            Status = 2
        });
    }

    public Task<bool> TransferToScheduledSurgeryAsync(SurgeryTransferDto dto, Guid userId)
    {
        return Task.FromResult(true);
    }

    public Task<bool> TransferToEmergencySurgeryAsync(SurgeryTransferDto dto, Guid userId)
    {
        return Task.FromResult(true);
    }

    public async Task<AdmissionDto> UpdateInsuranceAsync(UpdateInsuranceDto dto, Guid userId)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .FirstOrDefaultAsync(a => a.Id == dto.AdmissionId);
        if (admission == null)
            throw new Exception("Admission not found");

        var medRecord = await _context.MedicalRecords.FindAsync(admission.MedicalRecordId);
        if (medRecord != null)
        {
            medRecord.InsuranceNumber = dto.InsuranceNumber;
            medRecord.InsuranceExpireDate = dto.InsuranceEndDate;
            medRecord.InsuranceFacilityCode = dto.InitialFacilityCode;
            medRecord.PatientType = 1; // BHYT
            medRecord.UpdatedAt = DateTime.Now;
        }

        await _context.SaveChangesAsync();

        var department = await _context.Departments.FindAsync(admission.DepartmentId);
        return new AdmissionDto
        {
            Id = admission.Id,
            PatientId = admission.PatientId,
            PatientCode = admission.Patient.PatientCode,
            PatientName = admission.Patient.FullName,
            InsuranceNumber = dto.InsuranceNumber,
            AdmissionDate = admission.AdmissionDate,
            DepartmentId = admission.DepartmentId,
            DepartmentName = department?.DepartmentName ?? "",
            Status = GetAdmissionStatusName(admission.Status),
            CreatedDate = admission.CreatedAt
        };
    }

    public Task<InsuranceReferralCheckDto> CheckInsuranceReferralAsync(Guid admissionId)
    {
        return Task.FromResult(new InsuranceReferralCheckDto
        {
            AdmissionId = admissionId,
            IsValid = true,
            IsCorrectRoute = true,
            RequiresReferral = false,
            BenefitLevel = 1,
            Message = "Th\u1ebb BHYT h\u1ee3p l\u1ec7"
        });
    }

    public Task<bool> ConvertToFeePayingAsync(Guid admissionId, Guid userId)
    {
        return Task.FromResult(true);
    }

    public async Task<BedAssignmentDto> AssignBedAsync(CreateBedAssignmentDto dto, Guid userId)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .FirstOrDefaultAsync(a => a.Id == dto.AdmissionId);
        if (admission == null)
            throw new Exception("Admission not found");

        var bed = await _context.Beds
            .Include(b => b.Room)
            .ThenInclude(r => r.Department)
            .FirstOrDefaultAsync(b => b.Id == dto.BedId);
        if (bed == null)
            throw new Exception("Bed not found");

        // E2E fix (prod-e2e 2026-06-17): idempotent. Nếu giường đã gán ACTIVE cho CHÍNH admission này
        // (vd admit-from-opd đã tự gán giường đầu trống trong phòng) → trả assignment hiện có thay vì ném
        // Exception thô (gây 500) ở luồng admit→bed. Giường bị admission KHÁC chiếm → vẫn báo lỗi.
        var existingActive = await _context.Set<BedAssignment>()
            .FirstOrDefaultAsync(ba => ba.BedId == dto.BedId && ba.Status == 0);
        if (existingActive != null)
        {
            if (existingActive.AdmissionId != dto.AdmissionId)
                throw new InvalidOperationException("Giường đã có bệnh nhân khác sử dụng");
            admission.BedId = dto.BedId;
            admission.RoomId = bed.RoomId;
            await _context.SaveChangesAsync();
            return new BedAssignmentDto
            {
                Id = existingActive.Id,
                AdmissionId = dto.AdmissionId,
                BedId = dto.BedId,
                BedCode = bed.BedCode,
                BedName = bed.BedName,
                RoomId = bed.RoomId,
                RoomName = bed.Room.RoomName,
                DepartmentId = bed.Room.DepartmentId,
                DepartmentName = bed.Room.Department.DepartmentName,
                AssignedDate = existingActive.AssignedAt,
                Status = "Đang sử dụng",
                AssignedBy = userId.ToString()
            };
        }

        var assignment = new BedAssignment
        {
            Id = Guid.NewGuid(),
            AdmissionId = dto.AdmissionId,
            BedId = dto.BedId,
            AssignedAt = DateTime.Now,
            Status = 0, // Active
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString()
        };

        _context.Set<BedAssignment>().Add(assignment);

        // Update admission bed
        admission.BedId = dto.BedId;
        admission.RoomId = bed.RoomId;

        await _context.SaveChangesAsync();

        return new BedAssignmentDto
        {
            Id = assignment.Id,
            AdmissionId = dto.AdmissionId,
            BedId = dto.BedId,
            BedCode = bed.BedCode,
            BedName = bed.BedName,
            RoomId = bed.RoomId,
            RoomName = bed.Room.RoomName,
            DepartmentId = bed.Room.DepartmentId,
            DepartmentName = bed.Room.Department.DepartmentName,
            AssignedDate = assignment.AssignedAt,
            Status = "Đang sử dụng",
            AssignedBy = userId.ToString()
        };
    }

    public async Task<BedAssignmentDto> TransferBedAsync(TransferBedDto dto, Guid userId)
    {
        // Release current bed
        var currentAssignment = await _context.Set<BedAssignment>()
            .FirstOrDefaultAsync(ba => ba.AdmissionId == dto.AdmissionId && ba.Status == 0);
        if (currentAssignment != null)
        {
            currentAssignment.Status = 2; // Chuyển giường
            currentAssignment.ReleasedAt = DateTime.Now;
        }

        var newBed = await _context.Beds
            .Include(b => b.Room)
            .ThenInclude(r => r.Department)
            .FirstOrDefaultAsync(b => b.Id == dto.NewBedId);
        if (newBed == null)
            throw new Exception("New bed not found");

        // Check destination bed availability
        var bedOccupied = await _context.Set<BedAssignment>()
            .AnyAsync(ba => ba.BedId == dto.NewBedId && ba.Status == 0);
        if (bedOccupied)
            throw new Exception($"Giường {newBed.BedName} đã có bệnh nhân, vui lòng chọn giường khác");

        // Create new assignment
        var newAssignment = new BedAssignment
        {
            Id = Guid.NewGuid(),
            AdmissionId = dto.AdmissionId,
            BedId = dto.NewBedId,
            AssignedAt = DateTime.Now,
            Status = 0,
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString()
        };

        _context.Set<BedAssignment>().Add(newAssignment);

        // Update admission
        var admission = await _context.Set<Admission>().FindAsync(dto.AdmissionId);
        if (admission != null)
        {
            admission.BedId = dto.NewBedId;
            admission.RoomId = newBed.RoomId;
        }

        await _context.SaveChangesAsync();

        return new BedAssignmentDto
        {
            Id = newAssignment.Id,
            AdmissionId = dto.AdmissionId,
            BedId = dto.NewBedId,
            BedCode = newBed.BedCode,
            BedName = newBed.BedName,
            RoomId = newBed.RoomId,
            RoomName = newBed.Room.RoomName,
            DepartmentId = newBed.Room.DepartmentId,
            DepartmentName = newBed.Room.Department.DepartmentName,
            AssignedDate = newAssignment.AssignedAt,
            Status = "Đang sử dụng",
            AssignedBy = userId.ToString()
        };
    }

    public Task<bool> RegisterSharedBedAsync(Guid admissionId, Guid bedId, Guid userId)
    {
        return Task.FromResult(true);
    }

    public async Task ReleaseBedAsync(Guid admissionId, Guid userId)
    {
        var assignment = await _context.Set<BedAssignment>()
            .FirstOrDefaultAsync(ba => ba.AdmissionId == admissionId && ba.Status == 0);
        if (assignment == null)
            return;

        assignment.Status = 1; // Đã trả
        assignment.ReleasedAt = DateTime.Now;

        var admission = await _context.Set<Admission>().FindAsync(admissionId);
        if (admission != null)
            admission.BedId = null;

        await _context.SaveChangesAsync();
    }

    public Task<DailyOrderSummaryDto> GetDailyOrderSummaryAsync(Guid admissionId, DateTime date)
    {
        return Task.FromResult(new DailyOrderSummaryDto
        {
            OrderDate = date,
            AdmissionId = admissionId,
            MedicineOrderCount = 0,
            MedicineIssuedCount = 0,
            MedicinePendingCount = 0,
            ServiceOrderCount = 0,
            ServiceCompletedCount = 0,
            ServicePendingCount = 0,
            LabOrderCount = 0,
            LabResultCount = 0,
            LabPendingCount = 0
        });
    }

    public async Task<List<LabResultItemDto>> GetLabResultsAsync(Guid admissionId, DateTime? fromDate, DateTime? toDate)
    {
        // KQ XN nội trú đọc từ ServiceRequestDetail (model 1) — nguồn-sự-thật, giống màn khám OPD
        // (audit luồng nghiệp vụ 2026-06-06 #1/#2). Trước đây trả rỗng.
        var admission = await _context.Set<Admission>().FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return new List<LabResultItemDto>();

        var query = _context.ServiceRequestDetails
            .Include(d => d.Service)
            .Include(d => d.ServiceRequest)
            .Where(d => d.ServiceRequest.MedicalRecordId == admission.MedicalRecordId
                     && d.ServiceRequest.RequestType == 1
                     && d.Status != 3
                     && (d.Status == 2 || d.Result != null || d.ResultDate != null));
        if (fromDate.HasValue) query = query.Where(d => d.ResultDate >= fromDate.Value);
        if (toDate.HasValue) query = query.Where(d => d.ResultDate <= toDate.Value);

        var details = await query.OrderByDescending(d => d.ResultDate).ToBoundedListAsync("InpatientCompleteService.GetLabResultsAsync");
        return details.Select(d => new LabResultItemDto
        {
            Id = d.Id,
            TestCode = d.Service.ServiceCode,
            TestName = d.Service.ServiceName,
            Result = d.Result,
            Unit = null,
            ReferenceRange = null,
            IsAbnormal = false,
            Status = d.Status == 2 ? 1 : 0,
            ResultDate = d.ResultDate
        }).ToList();
    }

    public async Task<List<PendingAdmissionDto>> GetPendingAdmissionsAsync(Guid? departmentId)
    {
        // Worklist "chờ nhập viện" (audit luồng nghiệp vụ 2026-06-06 #4): phiên khám OPD đã kết
        // luận nhập viện (ConclusionType=3 + có khoa đề nghị) nhưng chưa tạo Admission. Trước đây
        // khoa nội trú không thấy BN này, phải gõ tay Mã HSBA.
        var query = _context.Examinations
            .Include(e => e.MedicalRecord).ThenInclude(m => m.Patient)
            .Where(e => e.ConclusionType == 3
                     && e.HospitalizationDepartmentId != null
                     && !_context.Admissions.Any(a => a.MedicalRecordId == e.MedicalRecordId));
        if (departmentId.HasValue && departmentId.Value != Guid.Empty)
            query = query.Where(e => e.HospitalizationDepartmentId == departmentId.Value);

        var exams = await query.OrderByDescending(e => e.EndTime).Take(200).ToListAsync();

        var deptIds = exams.Where(e => e.HospitalizationDepartmentId.HasValue)
            .Select(e => e.HospitalizationDepartmentId!.Value).Distinct().ToList();
        var deptNames = await _context.Departments
            .Where(d => deptIds.Contains(d.Id))
            .ToDictionaryAsync(d => d.Id, d => d.DepartmentName);

        return exams.Select(e => new PendingAdmissionDto
        {
            ExaminationId = e.Id,
            MedicalRecordId = e.MedicalRecordId,
            MedicalRecordCode = e.MedicalRecord?.MedicalRecordCode ?? string.Empty,
            PatientId = e.MedicalRecord?.PatientId ?? Guid.Empty,
            PatientName = e.MedicalRecord?.Patient?.FullName ?? string.Empty,
            PatientCode = e.MedicalRecord?.Patient?.PatientCode ?? string.Empty,
            DepartmentId = e.HospitalizationDepartmentId,
            DepartmentName = e.HospitalizationDepartmentId.HasValue && deptNames.ContainsKey(e.HospitalizationDepartmentId.Value)
                ? deptNames[e.HospitalizationDepartmentId.Value] : null,
            IsEmergency = e.HospitalizationIsEmergency,
            DiagnosisCode = e.HospitalizationDiagnosisCode,
            DiagnosisName = e.HospitalizationDiagnosisName,
            Reason = e.ConclusionNote,
            RequestedAt = e.EndTime,
        }).ToList();
    }

    public async Task<string> GenerateTreatmentSummaryAsync(Guid admissionId)
    {
        // #15 (audit luồng nghiệp vụ): tự tổng hợp tóm tắt điều trị thay field text tay.
        var admission = await _context.Set<Admission>()
            .Include(a => a.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return string.Empty;
        var mrId = admission.MedicalRecordId;

        var progresses = await _context.DailyProgresses
            .Where(p => p.AdmissionId == admissionId && !p.IsDeleted)
            .OrderBy(p => p.ProgressDate)
            .ToListAsync();
        var rxCount = await _context.Prescriptions
            .CountAsync(p => p.MedicalRecordId == mrId && p.PrescriptionType == 2 && p.Status != 4 && !p.IsDeleted);
        var clsCount = await _context.ServiceRequests
            .CountAsync(r => r.MedicalRecordId == mrId && r.Status != 4);
        var surgeries = await _context.SurgeryRequests
            .Where(s => s.MedicalRecordId == mrId && !s.IsDeleted)
            .Select(s => s.PlannedProcedure ?? s.SurgeryType)
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine($"TÓM TẮT QUÁ TRÌNH ĐIỀU TRỊ (tự tổng hợp {DateTime.Now:dd/MM/yyyy HH:mm}):");
        sb.AppendLine($"- Vào viện: {admission.AdmissionDate:dd/MM/yyyy} · Khoa: {admission.MedicalRecord?.Department?.DepartmentName ?? "-"}");
        sb.AppendLine($"- Chẩn đoán vào viện: {admission.DiagnosisOnAdmission ?? "-"}");
        sb.AppendLine($"- Số ngày có ghi diễn biến: {progresses.Count}");
        var last = progresses.LastOrDefault();
        if (last != null)
        {
            if (!string.IsNullOrWhiteSpace(last.Assessment))
                sb.AppendLine($"- Đánh giá gần nhất ({last.ProgressDate:dd/MM}): {last.Assessment}");
            if (!string.IsNullOrWhiteSpace(last.Plan))
                sb.AppendLine($"- Hướng xử trí gần nhất: {last.Plan}");
        }
        sb.AppendLine($"- Đơn thuốc nội trú: {rxCount} · Chỉ định CLS: {clsCount}");
        var surgList = surgeries.Where(x => !string.IsNullOrWhiteSpace(x)).ToList();
        if (surgList.Count > 0)
            sb.AppendLine($"- Phẫu thuật/thủ thuật: {string.Join("; ", surgList)}");
        return sb.ToString();
    }

    public async Task<TreatmentStatAggregateDto> GetTreatmentStatAggregateAsync(Guid admissionId)
    {
        // Lay MedicalRecordId tu admission
        var mrId = await _context.Set<Admission>()
            .Where(a => a.Id == admissionId)
            .Select(a => (Guid?)a.MedicalRecordId)
            .FirstOrDefaultAsync();
        if (mrId == null) return new TreatmentStatAggregateDto();

        // --- Drug counts: lay tu don thuoc noi tru (PrescriptionType=2), tru da huy (Status=4) ---
        var prescriptionIds = await _context.Prescriptions
            .Where(p => p.MedicalRecordId == mrId.Value
                     && p.PrescriptionType == 2
                     && p.Status != 4
                     && !p.IsDeleted)
            .Select(p => p.Id)
            .ToListAsync();

        // Join PrescriptionDetail + Medicine de lay ten thuoc, khong dung Include truoc GroupBy (EF Core constraint)
        var drugCounts = await _context.Set<PrescriptionDetail>()
            .Where(d => prescriptionIds.Contains(d.PrescriptionId))
            .Join(_context.Set<Medicine>(),
                d => d.MedicineId,
                m => m.Id,
                (d, m) => new { d.MedicineId, m.MedicineName, d.Quantity })
            .GroupBy(x => new { x.MedicineId, x.MedicineName })
            .Select(g => new DrugCountItemDto
            {
                MedicineId = g.Key.MedicineId.ToString(),
                MedicineName = g.Key.MedicineName,
                TotalQuantity = g.Sum(x => x.Quantity),
            })
            .OrderByDescending(x => x.TotalQuantity)
            .ToListAsync();

        // --- Diagnosis frequency: dem theo DiagnosisCode tu Prescription noi tru ---
        var diagFrequency = await _context.Prescriptions
            .Where(p => p.MedicalRecordId == mrId.Value
                     && p.PrescriptionType == 2
                     && p.Status != 4
                     && !p.IsDeleted
                     && p.DiagnosisCode != null && p.DiagnosisCode != string.Empty)
            .GroupBy(p => new { p.DiagnosisCode, p.DiagnosisName })
            .Select(g => new DiagnosisFrequencyItemDto
            {
                DiagnosisCode = g.Key.DiagnosisCode!,
                DiagnosisName = g.Key.DiagnosisName ?? string.Empty,
                Count = g.Count(),
            })
            .OrderByDescending(x => x.Count)
            .ToListAsync();

        return new TreatmentStatAggregateDto
        {
            DrugCounts = drugCounts,
            DiagnosisFrequency = diagFrequency,
        };
    }

    public async Task<byte[]> PrintLabResultsAsync(Guid admissionId, List<Guid> resultIds)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = await _context.Departments.FindAsync(admission.DepartmentId);
        var doctor = await _context.Users.FindAsync(admission.AdmittingDoctorId);

        // Build lab result rows from ServiceRequestDetails
        var labRows = new List<LabResultRow>();
        var details = await _context.ServiceRequestDetails
            .Include(d => d.Service)
            .Include(d => d.ServiceRequest)
            .Where(d => d.ServiceRequest.MedicalRecordId == medRecord.Id
                && d.ServiceRequest.RequestType == 1
                && (resultIds.Count == 0 || resultIds.Contains(d.Id)))
            .OrderBy(d => d.CreatedAt)
            .ToListAsync();

        foreach (var d in details)
        {
            labRows.Add(new LabResultRow
            {
                TestName = d.Service?.ServiceName ?? "",
                Result = d.Result,
                Unit = d.Service?.Unit,
                ReferenceRange = "",
                IsAbnormal = false
            });
        }

        var html = GetLabResult(
            patient.PatientCode, patient.FullName, patient.Gender, patient.DateOfBirth,
            patient.Address, patient.PhoneNumber, medRecord.InsuranceNumber,
            medRecord.MainDiagnosis, doctor?.FullName, dept?.DepartmentName,
            medRecord.CreatedAt, DateTime.Now,
            labRows, doctor?.FullName);

        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<byte[]> PrintSurgeryFormAsync(Guid surgeryId)
    {
        var surgery = await _context.Set<SurgeryRequest>()
            .Include(s => s.MedicalRecord).ThenInclude(m => m.Patient)
            .Include(s => s.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(s => s.Id == surgeryId);
        if (surgery == null) return Array.Empty<byte>();

        var patient = surgery.MedicalRecord.Patient;
        var dept = surgery.MedicalRecord.Department;
        var surgeon = await _context.Users.FindAsync(surgery.RequestingDoctorId);

        var bodyContent = new StringBuilder();
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Loại phẫu thuật:</span><span class=""field-value"">{Esc(surgery.SurgeryType)}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Chẩn đoán trước mổ:</span><span class=""field-value"">{Esc(surgery.PreOpDiagnosis)}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Phương pháp phẫu thuật:</span><span class=""field-value"">{Esc(surgery.PlannedProcedure)}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Phương pháp vô cảm:</span><span class=""field-value"">{(surgery.AnesthesiaType.HasValue ? surgery.AnesthesiaType.Value.ToString() : "")}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Ngày phẫu thuật:</span><span class=""field-value"">{surgery.RequestDate:dd/MM/yyyy HH:mm}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Phẫu thuật viên:</span><span class=""field-value"">{Esc(surgeon?.FullName)}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Ghi chú:</span><span class=""field-value"">{Esc(surgery.Notes)}</span></div>");

        var html = GetGenericForm(
            "PHIẾU PHẪU THUẬT", "MS. 13/BV",
            patient.PatientCode, patient.FullName, patient.Gender, patient.DateOfBirth,
            patient.Address, patient.PhoneNumber, surgery.MedicalRecord.InsuranceNumber,
            surgery.MedicalRecord.MedicalRecordCode, dept?.DepartmentName,
            bodyContent.ToString(), surgeon?.FullName);

        return Encoding.UTF8.GetBytes(html);
    }

    public Task<DepartmentFeeOverviewDto> GetDepartmentFeeOverviewAsync(Guid departmentId)
    {
        return Task.FromResult(new DepartmentFeeOverviewDto
        {
            DepartmentId = departmentId,
            TotalPatients = 0,
            InsurancePatients = 0,
            FeePatients = 0,
            TotalAmount = 0,
            InsuranceAmount = 0,
            PatientPayAmount = 0,
            DepositAmount = 0,
            DebtAmount = 0
        });
    }

    public Task<PatientFeeItemDto> GetPatientFeeAsync(Guid admissionId)
    {
        return Task.FromResult(new PatientFeeItemDto
        {
            AdmissionId = admissionId,
            TotalAmount = 0,
            InsuranceAmount = 0,
            PatientPayAmount = 0,
            DepositAmount = 0,
            DebtAmount = 0,
            DaysOfStay = 0
        });
    }

    public Task<DepositRequestDto> CreateDepositRequestAsync(CreateDepositRequestDto dto, Guid userId)
    {
        return Task.FromResult(new DepositRequestDto
        {
            Id = Guid.NewGuid(),
            AdmissionId = dto.AdmissionId,
            RequestedAmount = dto.RequestedAmount,
            Reason = dto.Reason,
            RequestedBy = userId,
            RequestDate = DateTime.Now,
            Status = 0
        });
    }

    public Task<List<DepositRequestDto>> GetDepositRequestsAsync(Guid? departmentId, int? status)
    {
        return Task.FromResult(new List<DepositRequestDto>());
    }

    public async Task<TransferWarningDto> CheckTransferWarningsAsync(Guid admissionId)
    {
        // #16 (audit luồng nghiệp vụ): cảnh báo THẬT trước khi chuyển khoa — trước đây stub luôn
        // CanTransfer=true, không soi đơn chưa cấp / CLS chưa KQ. Cảnh báo mang tính advisory
        // (chuyển khoa có thể cần dù còn pending) → UI hiển thị để người dùng quyết.
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null)
            return new TransferWarningDto { AdmissionId = admissionId, CanTransfer = false };

        var mrId = admission.MedicalRecordId;

        var unclaimedRx = await _context.Prescriptions
            .CountAsync(p => p.MedicalRecordId == mrId && p.PrescriptionType == 2 && p.Status < 2 && !p.IsDeleted);

        var pendingDetails = await _context.ServiceRequestDetails
            .Include(d => d.Service)
            .Include(d => d.ServiceRequest)
            .Where(d => d.ServiceRequest.MedicalRecordId == mrId && d.Status < 2)
            .ToListAsync();
        var pendingLab = pendingDetails.Where(d => d.ServiceRequest.RequestType == 1).ToList();
        var pendingSvc = pendingDetails.Where(d => d.ServiceRequest.RequestType != 1).ToList();

        return new TransferWarningDto
        {
            AdmissionId = admissionId,
            PatientName = admission.Patient?.FullName ?? string.Empty,
            HasUnclaimedMedicine = unclaimedRx > 0,
            UnclaimedMedicineCount = unclaimedRx,
            HasPendingLabResults = pendingLab.Count > 0,
            PendingLabCount = pendingLab.Count,
            PendingLabNames = pendingLab.Select(d => d.Service?.ServiceName ?? "").Where(s => s.Length > 0).Take(20).ToList(),
            HasPendingServices = pendingSvc.Count > 0,
            PendingServiceCount = pendingSvc.Count,
            CanTransfer = true
        };
    }

    #endregion
}
