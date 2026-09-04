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

        // AUTHZ-3 (#369) — guard: kill-switch OFF by default (Auth:TreatmentRelationshipEnabled=false).
        if (_currentUser.UserGuid.HasValue)
            await _treatRel.EnsureCanAccessPatientAsync(
                _currentUser.UserGuid.Value, _currentUser.Roles, admission.PatientId);

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
            throw new KeyNotFoundException("Medical record not found");

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
            throw new KeyNotFoundException("Source admission not found");

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
            throw new KeyNotFoundException("Admission not found");

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
            throw new KeyNotFoundException("Admission not found");

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

    #endregion
}
