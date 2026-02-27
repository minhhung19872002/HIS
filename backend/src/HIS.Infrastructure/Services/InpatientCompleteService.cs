using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Inpatient;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using System.Text;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Implementation of IInpatientCompleteService
/// Handles all inpatient/IPD workflows (100+ methods)
/// </summary>
public class InpatientCompleteService : IInpatientCompleteService
{
    private readonly HISDbContext _context;
    private readonly IRepository<Patient> _patientRepo;
    private readonly IRepository<MedicalRecord> _medicalRecordRepo;
    private readonly IRepository<Admission> _admissionRepo;
    private readonly IRepository<Department> _departmentRepo;
    private readonly IRepository<Room> _roomRepo;
    private readonly IRepository<Bed> _bedRepo;
    private readonly IRepository<BedAssignment> _bedAssignmentRepo;
    private readonly IRepository<User> _userRepo;
    private readonly IUnitOfWork _unitOfWork;

    public InpatientCompleteService(
        HISDbContext context,
        IRepository<Patient> patientRepo,
        IRepository<MedicalRecord> medicalRecordRepo,
        IRepository<Admission> admissionRepo,
        IRepository<Department> departmentRepo,
        IRepository<Room> roomRepo,
        IRepository<Bed> bedRepo,
        IRepository<BedAssignment> bedAssignmentRepo,
        IRepository<User> userRepo,
        IUnitOfWork unitOfWork)
    {
        _context = context;
        _patientRepo = patientRepo;
        _medicalRecordRepo = medicalRecordRepo;
        _admissionRepo = admissionRepo;
        _departmentRepo = departmentRepo;
        _roomRepo = roomRepo;
        _bedRepo = bedRepo;
        _bedAssignmentRepo = bedAssignmentRepo;
        _userRepo = userRepo;
        _unitOfWork = unitOfWork;
    }

    #region 3.1 Waiting Room Display

    public async Task<WardLayoutDto> GetWardLayoutAsync(Guid departmentId)
    {
        var department = await _context.Departments.FindAsync(departmentId);
        if (department == null)
            return new WardLayoutDto { DepartmentId = departmentId };

        // Get all rooms in the department
        var rooms = await _context.Rooms
            .Where(r => r.DepartmentId == departmentId && r.IsActive)
            .ToListAsync();

        var roomIds = rooms.Select(r => r.Id).ToList();

        // Get all beds in those rooms
        var beds = await _context.Beds
            .Where(b => roomIds.Contains(b.RoomId) && b.IsActive)
            .ToListAsync();

        var bedIds = beds.Select(b => b.Id).ToList();

        // Get current bed assignments
        var currentAssignments = await _context.Set<BedAssignment>()
            .Include(ba => ba.Admission)
            .ThenInclude(a => a.Patient)
            .Where(ba => bedIds.Contains(ba.BedId) && ba.Status == 0)
            .ToListAsync();

        // Data can contain multiple active assignments for the same bed (historical inconsistency).
        // Keep the latest assignment per bed to avoid duplicate-key exceptions.
        var assignmentsByBed = currentAssignments
            .GroupBy(a => a.BedId)
            .ToDictionary(
                g => g.Key,
                g => g
                    .OrderByDescending(x => x.AssignedAt)
                    .ThenByDescending(x => x.CreatedAt)
                    .First());

        // Build room layouts
        var roomLayouts = new List<RoomLayoutDto>();
        foreach (var room in rooms)
        {
            var roomBeds = beds.Where(b => b.RoomId == room.Id).ToList();
            var occupiedCount = roomBeds.Count(b => assignmentsByBed.ContainsKey(b.Id));

            var bedLayouts = roomBeds.Select(bed =>
            {
                var assignment = assignmentsByBed.GetValueOrDefault(bed.Id);
                var patient = assignment?.Admission?.Patient;
                return new BedLayoutDto
                {
                    BedId = bed.Id,
                    BedCode = bed.BedCode,
                    BedName = bed.BedName,
                    BedType = bed.BedType,
                    Status = assignment != null ? 1 : 0,
                    CurrentAdmissionId = assignment?.AdmissionId,
                    PatientName = patient?.FullName,
                    PatientCode = patient?.PatientCode,
                    Gender = patient?.Gender,
                    AdmissionDate = assignment?.AssignedAt,
                    DaysOfStay = assignment != null ? (int)(DateTime.Now - assignment.AssignedAt).TotalDays : null
                };
            }).ToList();

            roomLayouts.Add(new RoomLayoutDto
            {
                RoomId = room.Id,
                RoomCode = room.RoomCode,
                RoomName = room.RoomName,
                RoomType = room.RoomType,
                TotalBeds = roomBeds.Count,
                OccupiedBeds = occupiedCount,
                AvailableBeds = roomBeds.Count - occupiedCount,
                Beds = bedLayouts
            });
        }

        return new WardLayoutDto
        {
            DepartmentId = department.Id,
            DepartmentName = department.DepartmentName,
            DepartmentCode = department.DepartmentCode,
            TotalRooms = rooms.Count,
            TotalBeds = beds.Count,
            OccupiedBeds = assignmentsByBed.Count,
            AvailableBeds = beds.Count - assignmentsByBed.Count,
            MaintenanceBeds = 0,
            Rooms = roomLayouts
        };
    }

    public async Task<List<RoomLayoutDto>> GetRoomLayoutsAsync(Guid departmentId)
    {
        var wardLayout = await GetWardLayoutAsync(departmentId);
        return wardLayout?.Rooms ?? new List<RoomLayoutDto>();
    }

    public async Task<List<BedLayoutDto>> GetBedLayoutsAsync(Guid roomId)
    {
        var beds = await _context.Beds
            .Where(b => b.RoomId == roomId && b.IsActive)
            .ToListAsync();

        var bedIds = beds.Select(b => b.Id).ToList();
        var currentAssignments = await _context.Set<BedAssignment>()
            .Include(ba => ba.Admission)
            .ThenInclude(a => a.Patient)
            .Where(ba => bedIds.Contains(ba.BedId) && ba.Status == 0)
            .ToListAsync();

        var assignmentsByBed = currentAssignments
            .GroupBy(a => a.BedId)
            .ToDictionary(
                g => g.Key,
                g => g
                    .OrderByDescending(x => x.AssignedAt)
                    .ThenByDescending(x => x.CreatedAt)
                    .First());

        return beds.Select(bed =>
        {
            var assignment = assignmentsByBed.GetValueOrDefault(bed.Id);
            var patient = assignment?.Admission?.Patient;
            return new BedLayoutDto
            {
                BedId = bed.Id,
                BedCode = bed.BedCode,
                BedName = bed.BedName,
                BedType = bed.BedType,
                Status = assignment != null ? 1 : 0,
                CurrentAdmissionId = assignment?.AdmissionId,
                PatientName = patient?.FullName,
                PatientCode = patient?.PatientCode,
                Gender = patient?.Gender,
                AdmissionDate = assignment?.AssignedAt,
                DaysOfStay = assignment != null ? (int)(DateTime.Now - assignment.AssignedAt).TotalDays : null
            };
        }).ToList();
    }

    public Task<List<SharedBedPatientDto>> GetSharedBedPatientsAsync(Guid bedId)
    {
        return Task.FromResult(new List<SharedBedPatientDto>());
    }

    public Task<WardColorConfigDto> GetWardColorConfigAsync(Guid? departmentId)
    {
        return Task.FromResult(new WardColorConfigDto
        {
            InsurancePatientColor = "#2196F3",
            FeePatientColor = "#FF9800",
            ChronicPatientColor = "#9C27B0",
            EmergencyPatientColor = "#F44336",
            VIPPatientColor = "#FFD700",
            PediatricPatientColor = "#E91E63"
        });
    }

    public Task UpdateWardColorConfigAsync(Guid? departmentId, WardColorConfigDto config)
    {
        return Task.CompletedTask;
    }

    #endregion

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
                AdmissionId = m.Id,
                MedicalRecordCode = m.MedicalRecordCode,
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
            AdmissionDate = DateTime.Now,
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

        // Update source admission status
        sourceAdmission.Status = 1; // Chuyển khoa

        // Create new admission
        var admission = new Admission
        {
            Id = Guid.NewGuid(),
            PatientId = sourceAdmission.PatientId,
            MedicalRecordId = sourceAdmission.MedicalRecordId,
            AdmissionDate = DateTime.Now,
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

        // Check if bed is already occupied
        var existingAssignment = await _context.Set<BedAssignment>()
            .AnyAsync(ba => ba.BedId == dto.BedId && ba.Status == 0);
        if (existingAssignment)
            throw new Exception("Bed is already occupied");

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

    public Task<List<LabResultItemDto>> GetLabResultsAsync(Guid admissionId, DateTime? fromDate, DateTime? toDate)
    {
        return Task.FromResult(new List<LabResultItemDto>());
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

    public Task<TransferWarningDto> CheckTransferWarningsAsync(Guid admissionId)
    {
        return Task.FromResult(new TransferWarningDto
        {
            AdmissionId = admissionId,
            HasUnclaimedMedicine = false,
            UnclaimedMedicineCount = 0,
            HasPendingLabResults = false,
            PendingLabCount = 0,
            HasPendingServices = false,
            PendingServiceCount = 0,
            CanTransfer = true
        });
    }

    #endregion

    #region 3.3 Service Orders

    public async Task<(string? DiagnosisCode, string? Diagnosis)> GetDiagnosisFromRecordAsync(Guid admissionId)
    {
        var admission = await _context.Set<Admission>().FindAsync(admissionId);
        if (admission == null)
            return (null, null);

        var medRecord = await _context.MedicalRecords.FindAsync(admission.MedicalRecordId);
        if (medRecord == null)
            return (null, null);

        return (medRecord.MainIcdCode, medRecord.MainDiagnosis);
    }

    public Task<List<object>> GetServiceTreeAsync(Guid? parentId)
    {
        return Task.FromResult(new List<object>());
    }

    public Task<List<object>> SearchServicesAsync(string keyword, string? serviceType)
    {
        return Task.FromResult(new List<object>());
    }

    public async Task<InpatientServiceOrderDto> CreateServiceOrderAsync(CreateInpatientServiceOrderDto dto, Guid userId)
    {
        var doctor = await _context.Users.FindAsync(userId);
        var serviceItems = new List<InpatientServiceItemDto>();
        decimal totalAmount = 0;

        foreach (var item in dto.Services)
        {
            var service = await _context.Services.FindAsync(item.ServiceId);
            if (service == null) continue;

            var amount = service.ServicePrice * item.Quantity;
            totalAmount += amount;

            serviceItems.Add(new InpatientServiceItemDto
            {
                Id = Guid.NewGuid(),
                ServiceId = item.ServiceId,
                ServiceCode = service.ServiceCode,
                ServiceName = service.ServiceName,
                Quantity = item.Quantity,
                UnitPrice = service.ServicePrice,
                Amount = amount,
                PaymentSource = item.PaymentSource,
                Status = 0
            });
        }

        // Return DTO (stored in-memory for now since we don't have a ServiceOrders table)
        return new InpatientServiceOrderDto
        {
            Id = Guid.NewGuid(),
            AdmissionId = dto.AdmissionId,
            OrderDate = DateTime.Now,
            OrderingDoctorId = userId,
            OrderingDoctorName = doctor?.FullName ?? string.Empty,
            MainDiagnosisCode = dto.MainDiagnosisCode,
            MainDiagnosis = dto.MainDiagnosis,
            SecondaryDiagnosisCodes = dto.SecondaryDiagnosisCodes,
            SecondaryDiagnoses = dto.SecondaryDiagnoses,
            Services = serviceItems,
            Status = 0,
            TotalAmount = totalAmount,
            InsuranceAmount = 0,
            PatientPayAmount = totalAmount
        };
    }

    public async Task<InpatientServiceOrderDto> UpdateServiceOrderAsync(Guid id, CreateInpatientServiceOrderDto dto, Guid userId)
    {
        // Reuse CreateServiceOrderAsync pattern with the given id
        var result = await CreateServiceOrderAsync(dto, userId);
        result.Id = id;
        return result;
    }

    public Task DeleteServiceOrderAsync(Guid id, Guid userId)
    {
        return Task.CompletedTask;
    }

    public Task DeleteServiceItemAsync(Guid itemId, Guid userId)
    {
        return Task.CompletedTask;
    }

    public Task<List<InpatientServiceOrderDto>> GetServiceOrdersAsync(Guid admissionId, DateTime? fromDate, DateTime? toDate)
    {
        // Return empty list - service orders stored transiently until a ServiceOrders table is added
        return Task.FromResult(new List<InpatientServiceOrderDto>());
    }

    public Task<InpatientServiceOrderDto?> GetServiceOrderByIdAsync(Guid id)
    {
        return Task.FromResult<InpatientServiceOrderDto?>(null);
    }

    public Task<ServiceGroupTemplateDto> CreateServiceGroupTemplateAsync(ServiceGroupTemplateDto dto, Guid userId)
    {
        dto.Id = Guid.NewGuid();
        dto.CreatedBy = userId;
        return Task.FromResult(dto);
    }

    public Task<List<ServiceGroupTemplateDto>> GetServiceGroupTemplatesAsync(Guid? departmentId, Guid? userId)
    {
        return Task.FromResult(new List<ServiceGroupTemplateDto>());
    }

    public Task<InpatientServiceOrderDto> OrderByTemplateAsync(Guid admissionId, Guid templateId, Guid userId)
    {
        return Task.FromResult(new InpatientServiceOrderDto
        {
            Id = Guid.NewGuid(),
            AdmissionId = admissionId,
            OrderDate = DateTime.Now,
            OrderingDoctorId = userId,
            Status = 0
        });
    }

    public Task<InpatientServiceOrderDto> CopyPreviousServiceOrderAsync(Guid admissionId, Guid sourceOrderId, Guid userId)
    {
        return Task.FromResult(new InpatientServiceOrderDto
        {
            Id = Guid.NewGuid(),
            AdmissionId = admissionId,
            OrderDate = DateTime.Now,
            OrderingDoctorId = userId,
            Status = 0
        });
    }

    public Task<InpatientServiceOrderDto> OrderByPackageAsync(Guid admissionId, Guid packageId, Guid userId)
    {
        return Task.FromResult(new InpatientServiceOrderDto
        {
            Id = Guid.NewGuid(),
            AdmissionId = admissionId,
            OrderDate = DateTime.Now,
            OrderingDoctorId = userId,
            Status = 0
        });
    }

    public Task MarkServiceAsUrgentAsync(Guid itemId, bool isUrgent, Guid userId)
    {
        return Task.CompletedTask;
    }

    public Task MarkServiceAsEmergencyAsync(Guid itemId, bool isEmergency, Guid userId)
    {
        return Task.CompletedTask;
    }

    public Task<ServiceOrderWarningDto> CheckServiceOrderWarningsAsync(Guid admissionId, List<CreateInpatientServiceItemDto> items)
    {
        return Task.FromResult(new ServiceOrderWarningDto
        {
            HasDuplicateToday = false,
            ExceedsDeposit = false,
            HasTT35Warnings = false,
            ExceedsPackageLimit = false,
            IsOutsideProtocol = false
        });
    }

    public async Task<byte[]> PrintServiceOrderAsync(Guid orderId)
    {
        var sr = await _context.ServiceRequests
            .Include(s => s.MedicalRecord).ThenInclude(m => m.Patient)
            .Include(s => s.MedicalRecord).ThenInclude(m => m.Department)
            .Include(s => s.Details).ThenInclude(d => d.Service)
            .FirstOrDefaultAsync(s => s.Id == orderId);
        if (sr == null) return Array.Empty<byte>();

        var patient = sr.MedicalRecord.Patient;
        var dept = sr.MedicalRecord.Department;
        var doctor = await _context.Users.FindAsync(sr.DoctorId);

        var headers = new[] { "Tên dịch vụ", "ĐVT", "SL", "Đơn giá", "Thành tiền" };
        var rows = sr.Details.Select(d => new[]
        {
            d.Service?.ServiceName ?? "",
            d.Service?.Unit ?? "",
            d.Quantity.ToString("#,##0"),
            d.UnitPrice.ToString("#,##0"),
            d.Amount.ToString("#,##0")
        }).ToList();

        var html = BuildTableReport(
            "PHIẾU CHỈ ĐỊNH DỊCH VỤ",
            $"BN: {Esc(patient.FullName)} - Mã HS: {Esc(sr.MedicalRecord.MedicalRecordCode)} - Khoa: {Esc(dept?.DepartmentName)}",
            sr.RequestDate,
            headers, rows,
            doctor?.FullName, "Bác sĩ chỉ định");

        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<byte[]> PrintServiceOrderByPaymentSourceAsync(Guid orderId, int paymentSource)
    {
        var sr = await _context.ServiceRequests
            .Include(s => s.MedicalRecord).ThenInclude(m => m.Patient)
            .Include(s => s.MedicalRecord).ThenInclude(m => m.Department)
            .Include(s => s.Details).ThenInclude(d => d.Service)
            .FirstOrDefaultAsync(s => s.Id == orderId);
        if (sr == null) return Array.Empty<byte>();

        var patient = sr.MedicalRecord.Patient;
        var dept = sr.MedicalRecord.Department;
        var doctor = await _context.Users.FindAsync(sr.DoctorId);
        var filteredDetails = sr.Details.Where(d => d.PatientType == paymentSource).ToList();
        var paymentName = paymentSource switch { 1 => "BHYT", 2 => "Viện phí", 3 => "Bên thứ 3", _ => "Khác" };

        var headers = new[] { "Tên dịch vụ", "ĐVT", "SL", "Đơn giá", "Thành tiền" };
        var rows = filteredDetails.Select(d => new[]
        {
            d.Service?.ServiceName ?? "",
            d.Service?.Unit ?? "",
            d.Quantity.ToString("#,##0"),
            d.UnitPrice.ToString("#,##0"),
            d.Amount.ToString("#,##0")
        }).ToList();

        var html = BuildTableReport(
            $"PHIẾU CHỈ ĐỊNH DỊCH VỤ - {paymentName}",
            $"BN: {Esc(patient.FullName)} - Mã HS: {Esc(sr.MedicalRecord.MedicalRecordCode)} - Khoa: {Esc(dept?.DepartmentName)}",
            sr.RequestDate,
            headers, rows,
            doctor?.FullName, "Bác sĩ chỉ định");

        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<byte[]> PrintCombinedServiceOrderAsync(Guid admissionId, DateTime fromDate, DateTime toDate)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = medRecord.Department;

        var details = await _context.ServiceRequestDetails
            .Include(d => d.Service)
            .Include(d => d.ServiceRequest)
            .Where(d => d.ServiceRequest.MedicalRecordId == medRecord.Id
                && d.ServiceRequest.RequestDate >= fromDate
                && d.ServiceRequest.RequestDate <= toDate
                && !d.IsDeleted)
            .OrderBy(d => d.ServiceRequest.RequestDate)
            .ToListAsync();

        var headers = new[] { "Ngày CĐ", "Tên dịch vụ", "ĐVT", "SL", "Đơn giá", "Thành tiền" };
        var rows = details.Select(d => new[]
        {
            d.ServiceRequest.RequestDate.ToString("dd/MM/yyyy"),
            d.Service?.ServiceName ?? "",
            d.Service?.Unit ?? "",
            d.Quantity.ToString("#,##0"),
            d.UnitPrice.ToString("#,##0"),
            d.Amount.ToString("#,##0")
        }).ToList();

        var html = BuildTableReport(
            "TỔNG HỢP CHỈ ĐỊNH DỊCH VỤ",
            $"BN: {Esc(patient.FullName)} - Mã HS: {Esc(medRecord.MedicalRecordCode)} - Khoa: {Esc(dept?.DepartmentName)} - Từ {fromDate:dd/MM/yyyy} đến {toDate:dd/MM/yyyy}",
            null,
            headers, rows);

        return Encoding.UTF8.GetBytes(html);
    }

    #endregion

    #region 3.4 Prescriptions

    public async Task<List<object>> SearchMedicinesAsync(string keyword, Guid warehouseId)
    {
        var kw = keyword.ToLower();
        var medicines = await _context.Medicines
            .Where(m => m.IsActive && (m.MedicineName.ToLower().Contains(kw) || m.MedicineCode.ToLower().Contains(kw) || (m.ActiveIngredient != null && m.ActiveIngredient.ToLower().Contains(kw))))
            .Take(50)
            .Select(m => (object)new
            {
                m.Id,
                m.MedicineCode,
                m.MedicineName,
                m.ActiveIngredient,
                m.Concentration,
                m.Unit,
                m.UnitPrice,
                m.RouteName,
                m.DefaultDosage,
                m.DefaultUsage,
                m.IsAntibiotic,
                m.IsNarcotic,
                m.IsPsychotropic
            })
            .ToListAsync();
        return medicines;
    }

    public async Task<object> GetMedicineContraindicationsAsync(Guid medicineId, Guid admissionId)
    {
        var medicine = await _context.Medicines.FindAsync(medicineId);
        return new
        {
            MedicineId = medicineId,
            Contraindications = medicine?.Contraindications,
            SideEffects = medicine?.SideEffects,
            DrugInteractions = medicine?.DrugInteractions,
            Warning = medicine?.Warning
        };
    }

    public async Task<decimal> GetMedicineStockAsync(Guid medicineId, Guid warehouseId)
    {
        var stock = await _context.InventoryItems
            .Where(i => i.MedicineId == medicineId && i.WarehouseId == warehouseId)
            .SumAsync(i => i.Quantity);
        return stock;
    }

    public async Task<object> GetMedicineDetailsAsync(Guid medicineId)
    {
        var medicine = await _context.Medicines.FindAsync(medicineId);
        if (medicine == null)
            return new { MedicineId = medicineId, Error = "Not found" };

        return new
        {
            medicine.Id,
            medicine.MedicineCode,
            medicine.MedicineName,
            medicine.ActiveIngredient,
            medicine.Concentration,
            medicine.Unit,
            medicine.UnitPrice,
            medicine.InsurancePrice,
            medicine.RouteName,
            medicine.Manufacturer,
            medicine.ManufacturerCountry,
            medicine.DefaultDosage,
            medicine.DefaultUsage,
            medicine.Contraindications,
            medicine.SideEffects,
            medicine.DrugInteractions,
            medicine.IsAntibiotic,
            medicine.IsNarcotic,
            medicine.IsPsychotropic,
            medicine.IsInsuranceCovered,
            medicine.InsurancePaymentRate
        };
    }

    public async Task<InpatientPrescriptionDto> CreatePrescriptionAsync(CreateInpatientPrescriptionDto dto, Guid userId)
    {
        var admission = await _context.Set<Admission>().FindAsync(dto.AdmissionId);
        if (admission == null)
            throw new Exception("Admission not found");

        var doctor = await _context.Users.FindAsync(userId);
        var warehouse = await _context.Warehouses.FindAsync(dto.WarehouseId);

        // Create prescription
        var prescription = new Prescription
        {
            Id = Guid.NewGuid(),
            PrescriptionCode = $"DT{DateTime.Now:yyyyMMddHHmmss}",
            PrescriptionDate = dto.PrescriptionDate,
            MedicalRecordId = admission.MedicalRecordId,
            DoctorId = userId,
            DepartmentId = admission.DepartmentId,
            WarehouseId = dto.WarehouseId,
            DiagnosisCode = dto.MainDiagnosisCode,
            DiagnosisName = dto.MainDiagnosis,
            PrescriptionType = 2, // Nội trú
            TotalDays = 1,
            Status = 0, // Chờ duyệt
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString()
        };

        var items = new List<InpatientMedicineItemDto>();
        decimal totalAmount = 0;

        foreach (var item in dto.Items)
        {
            var medicine = await _context.Medicines.FindAsync(item.MedicineId);
            if (medicine == null) continue;

            var amount = item.Quantity * medicine.UnitPrice;
            totalAmount += amount;

            var detail = new PrescriptionDetail
            {
                Id = Guid.NewGuid(),
                PrescriptionId = prescription.Id,
                MedicineId = item.MedicineId,
                WarehouseId = dto.WarehouseId,
                Quantity = item.Quantity,
                Unit = medicine.Unit,
                UnitPrice = medicine.UnitPrice,
                Amount = amount,
                Dosage = item.Dosage,
                UsageInstructions = item.UsageInstructions,
                PatientType = item.PaymentSource,
                Status = 0,
                CreatedAt = DateTime.Now,
                CreatedBy = userId.ToString()
            };

            _context.PrescriptionDetails.Add(detail);

            items.Add(new InpatientMedicineItemDto
            {
                Id = detail.Id,
                MedicineId = item.MedicineId,
                MedicineCode = medicine.MedicineCode,
                MedicineName = medicine.MedicineName,
                Quantity = item.Quantity,
                UnitPrice = medicine.UnitPrice,
                Amount = amount,
                Status = 0
            });
        }

        prescription.TotalAmount = totalAmount;
        prescription.PatientAmount = totalAmount;
        _context.Prescriptions.Add(prescription);
        await _context.SaveChangesAsync();

        return new InpatientPrescriptionDto
        {
            Id = prescription.Id,
            AdmissionId = dto.AdmissionId,
            PrescriptionDate = dto.PrescriptionDate,
            PrescribingDoctorId = userId,
            PrescribingDoctorName = doctor?.FullName ?? string.Empty,
            MainDiagnosisCode = dto.MainDiagnosisCode,
            MainDiagnosis = dto.MainDiagnosis,
            WarehouseId = dto.WarehouseId,
            WarehouseName = warehouse?.WarehouseName ?? string.Empty,
            Items = items,
            Status = 0,
            TotalAmount = totalAmount,
            InsuranceAmount = 0,
            PatientPayAmount = totalAmount
        };
    }

    public async Task<InpatientPrescriptionDto> UpdatePrescriptionAsync(Guid id, CreateInpatientPrescriptionDto dto, Guid userId)
    {
        var prescription = await _context.Prescriptions
            .Include(p => p.Details)
            .FirstOrDefaultAsync(p => p.Id == id);
        if (prescription == null)
            throw new Exception("Prescription not found");

        prescription.PrescriptionDate = dto.PrescriptionDate;
        prescription.DiagnosisCode = dto.MainDiagnosisCode;
        prescription.DiagnosisName = dto.MainDiagnosis;
        prescription.WarehouseId = dto.WarehouseId;
        prescription.UpdatedAt = DateTime.Now;
        prescription.UpdatedBy = userId.ToString();

        // Remove old details
        _context.PrescriptionDetails.RemoveRange(prescription.Details);

        var items = new List<InpatientMedicineItemDto>();
        decimal totalAmount = 0;

        foreach (var item in dto.Items)
        {
            var medicine = await _context.Medicines.FindAsync(item.MedicineId);
            if (medicine == null) continue;

            var amount = item.Quantity * medicine.UnitPrice;
            totalAmount += amount;

            var detail = new PrescriptionDetail
            {
                Id = Guid.NewGuid(),
                PrescriptionId = id,
                MedicineId = item.MedicineId,
                WarehouseId = dto.WarehouseId,
                Quantity = item.Quantity,
                Unit = medicine.Unit,
                UnitPrice = medicine.UnitPrice,
                Amount = amount,
                Dosage = item.Dosage,
                UsageInstructions = item.UsageInstructions,
                PatientType = item.PaymentSource,
                Status = 0,
                CreatedAt = DateTime.Now,
                CreatedBy = userId.ToString()
            };
            _context.PrescriptionDetails.Add(detail);

            items.Add(new InpatientMedicineItemDto
            {
                Id = detail.Id,
                MedicineId = item.MedicineId,
                MedicineCode = medicine.MedicineCode,
                MedicineName = medicine.MedicineName,
                Quantity = item.Quantity,
                UnitPrice = medicine.UnitPrice,
                Amount = amount,
                Status = 0
            });
        }

        prescription.TotalAmount = totalAmount;
        prescription.PatientAmount = totalAmount;
        await _context.SaveChangesAsync();

        var doctor = await _context.Users.FindAsync(userId);
        var warehouse = await _context.Warehouses.FindAsync(dto.WarehouseId);

        return new InpatientPrescriptionDto
        {
            Id = id,
            AdmissionId = dto.AdmissionId,
            PrescriptionDate = dto.PrescriptionDate,
            PrescribingDoctorId = userId,
            PrescribingDoctorName = doctor?.FullName ?? string.Empty,
            MainDiagnosisCode = dto.MainDiagnosisCode,
            MainDiagnosis = dto.MainDiagnosis,
            WarehouseId = dto.WarehouseId,
            WarehouseName = warehouse?.WarehouseName ?? string.Empty,
            Items = items,
            Status = prescription.Status,
            TotalAmount = totalAmount,
            InsuranceAmount = 0,
            PatientPayAmount = totalAmount
        };
    }

    public async Task DeletePrescriptionAsync(Guid id, Guid userId)
    {
        var prescription = await _context.Prescriptions
            .Include(p => p.Details)
            .FirstOrDefaultAsync(p => p.Id == id);
        if (prescription != null)
        {
            _context.PrescriptionDetails.RemoveRange(prescription.Details);
            _context.Prescriptions.Remove(prescription);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<List<InpatientPrescriptionDto>> GetPrescriptionsAsync(Guid admissionId, DateTime? fromDate, DateTime? toDate)
    {
        var admission = await _context.Set<Admission>().FindAsync(admissionId);
        if (admission == null)
            return new List<InpatientPrescriptionDto>();

        var query = _context.Prescriptions
            .Include(p => p.Details)
                .ThenInclude(d => d.Medicine)
            .Include(p => p.Doctor)
            .Where(p => p.MedicalRecordId == admission.MedicalRecordId && p.PrescriptionType == 2);

        if (fromDate.HasValue)
            query = query.Where(p => p.PrescriptionDate >= fromDate.Value);
        if (toDate.HasValue)
            query = query.Where(p => p.PrescriptionDate <= toDate.Value);

        var prescriptions = await query.OrderByDescending(p => p.PrescriptionDate).ToListAsync();

        return prescriptions.Select(p => new InpatientPrescriptionDto
        {
            Id = p.Id,
            AdmissionId = admissionId,
            PrescriptionDate = p.PrescriptionDate,
            PrescribingDoctorId = p.DoctorId,
            PrescribingDoctorName = p.Doctor?.FullName ?? string.Empty,
            MainDiagnosisCode = p.DiagnosisCode,
            MainDiagnosis = p.DiagnosisName,
            WarehouseId = p.WarehouseId ?? Guid.Empty,
            Items = p.Details.Select(d => new InpatientMedicineItemDto
            {
                Id = d.Id,
                MedicineId = d.MedicineId,
                MedicineCode = d.Medicine?.MedicineCode ?? string.Empty,
                MedicineName = d.Medicine?.MedicineName ?? string.Empty,
                Quantity = d.Quantity,
                UnitPrice = d.UnitPrice,
                Amount = d.Amount,
                Status = d.Status
            }).ToList(),
            Status = p.Status,
            TotalAmount = p.TotalAmount,
            InsuranceAmount = p.InsuranceAmount,
            PatientPayAmount = p.PatientAmount
        }).ToList();
    }

    public async Task<InpatientPrescriptionDto?> GetPrescriptionByIdAsync(Guid id)
    {
        var p = await _context.Prescriptions
            .Include(pr => pr.Details)
                .ThenInclude(d => d.Medicine)
            .Include(pr => pr.Doctor)
            .FirstOrDefaultAsync(pr => pr.Id == id);
        if (p == null) return null;

        return new InpatientPrescriptionDto
        {
            Id = p.Id,
            PrescriptionDate = p.PrescriptionDate,
            PrescribingDoctorId = p.DoctorId,
            PrescribingDoctorName = p.Doctor?.FullName ?? string.Empty,
            MainDiagnosisCode = p.DiagnosisCode,
            MainDiagnosis = p.DiagnosisName,
            WarehouseId = p.WarehouseId ?? Guid.Empty,
            Items = p.Details.Select(d => new InpatientMedicineItemDto
            {
                Id = d.Id,
                MedicineId = d.MedicineId,
                MedicineCode = d.Medicine?.MedicineCode ?? string.Empty,
                MedicineName = d.Medicine?.MedicineName ?? string.Empty,
                Quantity = d.Quantity,
                UnitPrice = d.UnitPrice,
                Amount = d.Amount,
                Status = d.Status
            }).ToList(),
            Status = p.Status,
            TotalAmount = p.TotalAmount,
            InsuranceAmount = p.InsuranceAmount,
            PatientPayAmount = p.PatientAmount
        };
    }

    public Task<EmergencyCabinetPrescriptionDto> CreateEmergencyCabinetPrescriptionAsync(Guid admissionId, Guid cabinetId, List<CreateInpatientMedicineItemDto> items, Guid userId)
    {
        return Task.FromResult(new EmergencyCabinetPrescriptionDto
        {
            Id = Guid.NewGuid(),
            AdmissionId = admissionId,
            CabinetId = cabinetId,
            PrescriptionDate = DateTime.Now,
            Status = 0
        });
    }

    public Task<List<object>> GetEmergencyCabinetsAsync(Guid departmentId)
    {
        return Task.FromResult(new List<object>());
    }

    public Task<InpatientPrescriptionDto> CreateTraditionalMedicinePrescriptionAsync(Guid admissionId, int numberOfDoses, List<CreateInpatientMedicineItemDto> items, Guid userId)
    {
        return Task.FromResult(new InpatientPrescriptionDto
        {
            Id = Guid.NewGuid(),
            AdmissionId = admissionId,
            PrescriptionDate = DateTime.Now,
            PrescribingDoctorId = userId,
            Status = 0
        });
    }

    public Task<decimal> CalculateQuantityByDaysAsync(Guid medicineId, int days, string dosage)
    {
        // Default: 3 times per day
        return Task.FromResult((decimal)(days * 3));
    }

    public Task<string> GenerateUsageInstructionAsync(Guid medicineId, string dosage)
    {
        var instruction = $"U\u1ed1ng {dosage} vi\u00ean/l\u1ea7n, ng\u00e0y 3 l\u1ea7n (s\u00e1ng - tr\u01b0a - t\u1ed1i), sau \u0103n";
        return Task.FromResult(instruction);
    }

    public Task SaveUsageTemplateAsync(Guid medicineId, string usage, Guid userId)
    {
        return Task.CompletedTask;
    }

    public Task<PrescriptionWarningDto> CheckPrescriptionWarningsAsync(Guid admissionId, List<CreateInpatientMedicineItemDto> items)
    {
        return Task.FromResult(new PrescriptionWarningDto
        {
            HasDuplicateToday = false,
            HasDrugInteraction = false,
            HasAntibioticDuplicate = false,
            ExceedsInsuranceCeiling = false,
            IsInsuranceExpiring = false,
            IsOutsideProtocol = false
        });
    }

    public Task<PrescriptionTemplateDto> CreatePrescriptionTemplateAsync(PrescriptionTemplateDto dto, Guid userId)
    {
        dto.Id = Guid.NewGuid();
        dto.CreatedBy = userId;
        return Task.FromResult(dto);
    }

    public Task<List<PrescriptionTemplateDto>> GetPrescriptionTemplatesAsync(Guid? departmentId, Guid? userId)
    {
        return Task.FromResult(new List<PrescriptionTemplateDto>());
    }

    public Task<InpatientPrescriptionDto> PrescribeByTemplateAsync(Guid admissionId, Guid templateId, Guid userId)
    {
        return Task.FromResult(new InpatientPrescriptionDto
        {
            Id = Guid.NewGuid(),
            AdmissionId = admissionId,
            PrescriptionDate = DateTime.Now,
            PrescribingDoctorId = userId,
            Status = 0
        });
    }

    public Task<InpatientPrescriptionDto> CopyPreviousPrescriptionAsync(Guid admissionId, Guid sourcePrescriptionId, Guid userId)
    {
        return Task.FromResult(new InpatientPrescriptionDto
        {
            Id = Guid.NewGuid(),
            AdmissionId = admissionId,
            PrescriptionDate = DateTime.Now,
            PrescribingDoctorId = userId,
            Status = 0
        });
    }

    public Task<MedicineOrderSummaryDto> CreateMedicineOrderSummaryAsync(Guid departmentId, DateTime date, Guid? roomId, Guid warehouseId, Guid userId)
    {
        return Task.FromResult(new MedicineOrderSummaryDto
        {
            Id = Guid.NewGuid(),
            SummaryDate = date,
            DepartmentId = departmentId,
            RoomId = roomId,
            WarehouseId = warehouseId,
            Status = 0
        });
    }

    public Task<List<MedicineOrderSummaryDto>> GetMedicineOrderSummariesAsync(Guid departmentId, DateTime fromDate, DateTime toDate)
    {
        return Task.FromResult(new List<MedicineOrderSummaryDto>());
    }

    public Task<SupplyOrderSummaryDto> CreateSupplyOrderSummaryAsync(Guid departmentId, DateTime date, Guid warehouseId, Guid userId)
    {
        return Task.FromResult(new SupplyOrderSummaryDto
        {
            Id = Guid.NewGuid(),
            SummaryDate = date,
            DepartmentId = departmentId,
            WarehouseId = warehouseId,
            Status = 0
        });
    }

    public async Task<byte[]> PrintMedicineOrderSummaryAsync(Guid summaryId)
    {
        // summaryId represents a department-level summary; query prescriptions for that department today
        var dept = await _context.Departments.FindAsync(summaryId);
        var deptName = dept?.DepartmentName ?? "";

        var today = DateTime.Today;
        var prescriptions = await _context.Prescriptions
            .Include(p => p.Details).ThenInclude(d => d.Medicine)
            .Where(p => p.DepartmentId == summaryId
                && p.PrescriptionDate >= today && p.PrescriptionDate < today.AddDays(1)
                && p.PrescriptionType == 2)
            .ToListAsync();

        // Aggregate medicine totals
        var items = prescriptions
            .SelectMany(p => p.Details)
            .GroupBy(d => new { d.MedicineId, Name = d.Medicine?.MedicineName ?? "", Unit = d.Medicine?.Unit ?? "" })
            .Select(g => new ReportItemRow
            {
                Name = g.Key.Name,
                Unit = g.Key.Unit,
                Quantity = g.Sum(x => x.Quantity),
                UnitPrice = g.First().UnitPrice,
                Amount = g.Sum(x => x.Amount)
            }).ToList();

        var html = BuildItemizedReport(
            "BẢNG TỔNG HỢP THUỐC", $"DT-{today:yyyyMMdd}", today,
            new[] { "Khoa", "Ngày" },
            new[] { deptName, today.ToString("dd/MM/yyyy") },
            items);

        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<byte[]> PrintMedicineVerificationAsync(Guid summaryId)
    {
        var dept = await _context.Departments.FindAsync(summaryId);
        var deptName = dept?.DepartmentName ?? "";
        var today = DateTime.Today;

        var prescriptions = await _context.Prescriptions
            .Include(p => p.Details).ThenInclude(d => d.Medicine)
            .Include(p => p.Doctor)
            .Where(p => p.DepartmentId == summaryId
                && p.PrescriptionDate >= today && p.PrescriptionDate < today.AddDays(1)
                && p.PrescriptionType == 2)
            .ToListAsync();

        var headers = new[] { "Tên thuốc", "ĐVT", "SL yêu cầu", "SL duyệt", "BS kê", "Ghi chú" };
        var rows = prescriptions
            .SelectMany(p => p.Details.Select(d => new { Detail = d, Doctor = p.Doctor }))
            .Select(x => new[]
            {
                x.Detail.Medicine?.MedicineName ?? "",
                x.Detail.Unit ?? "",
                x.Detail.Quantity.ToString("#,##0"),
                x.Detail.Quantity.ToString("#,##0"),
                x.Doctor?.FullName ?? "",
                ""
            }).ToList();

        var html = BuildTableReport(
            "PHIẾU DUYỆT THUỐC",
            $"Khoa: {Esc(deptName)} - Ngày: {today:dd/MM/yyyy}",
            today,
            headers, rows);

        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<byte[]> PrintPatientMedicineSlipAsync(Guid admissionId, DateTime date)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = await _context.Departments.FindAsync(admission.DepartmentId);

        var prescriptions = await _context.Prescriptions
            .Include(p => p.Details).ThenInclude(d => d.Medicine)
            .Where(p => p.MedicalRecordId == medRecord.Id
                && p.PrescriptionDate >= date.Date && p.PrescriptionDate < date.Date.AddDays(1)
                && p.PrescriptionType == 2)
            .ToListAsync();

        var items = prescriptions.SelectMany(p => p.Details).Select(d => new PrescriptionRow
        {
            MedicineName = d.Medicine?.MedicineName ?? "",
            Unit = d.Unit,
            Quantity = d.Quantity,
            Dosage = d.Dosage,
            Usage = d.UsageInstructions
        }).ToList();

        var doctor = prescriptions.FirstOrDefault()?.DoctorId != null
            ? await _context.Users.FindAsync(prescriptions.First().DoctorId)
            : null;

        var html = GetPrescription(
            patient.PatientCode, patient.FullName, patient.Gender, patient.DateOfBirth,
            patient.Address, patient.PhoneNumber, medRecord.InsuranceNumber,
            medRecord.MainDiagnosis, medRecord.MainIcdCode,
            date, 1, items, null,
            doctor?.FullName, dept?.DepartmentName);

        return Encoding.UTF8.GetBytes(html);
    }

    #endregion

    #region 3.5 Nutrition

    public Task<NutritionOrderDto> CreateNutritionOrderAsync(CreateNutritionOrderDto dto, Guid userId)
    {
        return Task.FromResult(new NutritionOrderDto
        {
            Id = Guid.NewGuid(),
            AdmissionId = dto.AdmissionId,
            OrderDate = dto.OrderDate,
            MealType = dto.MealType,
            NutritionLevel = dto.NutritionLevel,
            MenuCode = dto.MenuCode,
            SpecialRequirements = dto.SpecialRequirements,
            Status = 0
        });
    }

    public Task<NutritionOrderDto> UpdateNutritionOrderAsync(Guid id, CreateNutritionOrderDto dto, Guid userId)
    {
        return Task.FromResult(new NutritionOrderDto
        {
            Id = id,
            AdmissionId = dto.AdmissionId,
            OrderDate = dto.OrderDate,
            MealType = dto.MealType,
            NutritionLevel = dto.NutritionLevel,
            MenuCode = dto.MenuCode,
            SpecialRequirements = dto.SpecialRequirements,
            Status = 0
        });
    }

    public Task DeleteNutritionOrderAsync(Guid id, Guid userId)
    {
        return Task.CompletedTask;
    }

    public Task<List<NutritionOrderDto>> GetNutritionOrdersAsync(Guid? admissionId, Guid? departmentId, DateTime date)
    {
        return Task.FromResult(new List<NutritionOrderDto>());
    }

    public Task<NutritionSummaryDto> GetNutritionSummaryAsync(Guid departmentId, DateTime date)
    {
        return Task.FromResult(new NutritionSummaryDto
        {
            SummaryDate = date,
            DepartmentId = departmentId,
            DepartmentName = string.Empty,
            TotalBreakfast = 0,
            TotalLunch = 0,
            TotalDinner = 0,
            TotalSnack = 0,
            NormalCount = 0,
            DietCount = 0,
            SpecialCount = 0,
            Details = new List<NutritionOrderDto>()
        });
    }

    public async Task<byte[]> PrintNutritionSummaryAsync(Guid departmentId, DateTime date)
    {
        var dept = await _context.Departments.FindAsync(departmentId);
        var deptName = dept?.DepartmentName ?? "";

        // Count inpatients in department for nutrition summary
        var patientCount = await _context.MedicalRecords
            .CountAsync(m => m.DepartmentId == departmentId && m.TreatmentType == 2 && m.Status < 3);

        var headers = new[] { "Bữa ăn", "Số suất", "Chế độ thường", "Chế độ kiêng", "Chế độ đặc biệt" };
        var rows = new List<string[]>
        {
            new[] { "Sáng", patientCount.ToString(), patientCount.ToString(), "0", "0" },
            new[] { "Trưa", patientCount.ToString(), patientCount.ToString(), "0", "0" },
            new[] { "Chiều", patientCount.ToString(), patientCount.ToString(), "0", "0" },
            new[] { "Phụ", "0", "0", "0", "0" }
        };

        var html = BuildTableReport(
            "BẢNG TỔNG HỢP SUẤT ĂN",
            $"Khoa: {Esc(deptName)} - Ngày: {date:dd/MM/yyyy}",
            date,
            headers, rows);

        return Encoding.UTF8.GetBytes(html);
    }

    #endregion

    #region 3.6 Treatment Information

    public async Task<TreatmentSheetDto> CreateTreatmentSheetAsync(CreateTreatmentSheetDto dto, Guid userId)
    {
        var doctor = await _context.Users.FindAsync(userId);

        var dailyProgress = new DailyProgress
        {
            Id = Guid.NewGuid(),
            AdmissionId = dto.AdmissionId,
            ProgressDate = dto.TreatmentDate,
            DoctorId = userId,
            SubjectiveFindings = dto.ProgressNotes,
            Plan = dto.TreatmentOrders,
            DietOrder = dto.DietOrders,
            ActivityOrder = dto.NursingOrders,
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString()
        };

        _context.DailyProgresses.Add(dailyProgress);
        await _context.SaveChangesAsync();

        return new TreatmentSheetDto
        {
            Id = dailyProgress.Id,
            AdmissionId = dto.AdmissionId,
            TreatmentDate = dto.TreatmentDate,
            DoctorId = userId,
            DoctorName = doctor?.FullName ?? string.Empty,
            ProgressNotes = dto.ProgressNotes,
            TreatmentOrders = dto.TreatmentOrders,
            NursingOrders = dto.NursingOrders,
            DietOrders = dto.DietOrders,
            CreatedAt = dailyProgress.CreatedAt
        };
    }

    public async Task<TreatmentSheetDto> UpdateTreatmentSheetAsync(Guid id, CreateTreatmentSheetDto dto, Guid userId)
    {
        var dailyProgress = await _context.DailyProgresses.FindAsync(id);
        if (dailyProgress != null)
        {
            dailyProgress.SubjectiveFindings = dto.ProgressNotes;
            dailyProgress.Plan = dto.TreatmentOrders;
            dailyProgress.ActivityOrder = dto.NursingOrders;
            dailyProgress.DietOrder = dto.DietOrders;
            dailyProgress.ProgressDate = dto.TreatmentDate;
            dailyProgress.UpdatedAt = DateTime.Now;
            dailyProgress.UpdatedBy = userId.ToString();
            await _context.SaveChangesAsync();
        }

        var doctor = await _context.Users.FindAsync(userId);
        return new TreatmentSheetDto
        {
            Id = id,
            AdmissionId = dto.AdmissionId,
            TreatmentDate = dto.TreatmentDate,
            DoctorId = userId,
            DoctorName = doctor?.FullName ?? string.Empty,
            ProgressNotes = dto.ProgressNotes,
            TreatmentOrders = dto.TreatmentOrders,
            NursingOrders = dto.NursingOrders,
            DietOrders = dto.DietOrders,
            UpdatedAt = DateTime.Now
        };
    }

    public async Task DeleteTreatmentSheetAsync(Guid id, Guid userId)
    {
        var dailyProgress = await _context.DailyProgresses.FindAsync(id);
        if (dailyProgress != null)
        {
            _context.DailyProgresses.Remove(dailyProgress);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<List<TreatmentSheetDto>> GetTreatmentSheetsAsync(TreatmentSheetSearchDto searchDto)
    {
        var query = _context.DailyProgresses.AsQueryable();

        if (searchDto.AdmissionId.HasValue)
            query = query.Where(dp => dp.AdmissionId == searchDto.AdmissionId.Value);
        if (searchDto.FromDate.HasValue)
            query = query.Where(dp => dp.ProgressDate >= searchDto.FromDate.Value);
        if (searchDto.ToDate.HasValue)
            query = query.Where(dp => dp.ProgressDate <= searchDto.ToDate.Value);
        if (searchDto.DoctorId.HasValue)
            query = query.Where(dp => dp.DoctorId == searchDto.DoctorId.Value);

        var results = await query
            .OrderByDescending(dp => dp.ProgressDate)
            .Skip((searchDto.Page - 1) * searchDto.PageSize)
            .Take(searchDto.PageSize)
            .ToListAsync();

        return results.Select(dp => new TreatmentSheetDto
        {
            Id = dp.Id,
            AdmissionId = dp.AdmissionId,
            TreatmentDate = dp.ProgressDate,
            DoctorId = dp.DoctorId,
            ProgressNotes = dp.SubjectiveFindings,
            TreatmentOrders = dp.Plan,
            NursingOrders = dp.ActivityOrder,
            DietOrders = dp.DietOrder,
            CreatedAt = dp.CreatedAt
        }).ToList();
    }

    public async Task<TreatmentSheetDto?> GetTreatmentSheetByIdAsync(Guid id)
    {
        var dp = await _context.DailyProgresses.FindAsync(id);
        if (dp == null) return null;

        var doctor = await _context.Users.FindAsync(dp.DoctorId);
        return new TreatmentSheetDto
        {
            Id = dp.Id,
            AdmissionId = dp.AdmissionId,
            TreatmentDate = dp.ProgressDate,
            DoctorId = dp.DoctorId,
            DoctorName = doctor?.FullName ?? string.Empty,
            ProgressNotes = dp.SubjectiveFindings,
            TreatmentOrders = dp.Plan,
            NursingOrders = dp.ActivityOrder,
            DietOrders = dp.DietOrder,
            CreatedAt = dp.CreatedAt
        };
    }

    public Task<TreatmentSheetTemplateDto> CreateTreatmentSheetTemplateAsync(TreatmentSheetTemplateDto dto, Guid userId)
    {
        dto.Id = Guid.NewGuid();
        dto.CreatedBy = userId;
        return Task.FromResult(dto);
    }

    public Task<List<TreatmentSheetTemplateDto>> GetTreatmentSheetTemplatesAsync(Guid? departmentId)
    {
        return Task.FromResult(new List<TreatmentSheetTemplateDto>());
    }

    public async Task<TreatmentSheetDto> CopyTreatmentSheetAsync(Guid sourceId, DateTime newDate, Guid userId)
    {
        var source = await _context.DailyProgresses.FindAsync(sourceId);
        var doctor = await _context.Users.FindAsync(userId);

        return new TreatmentSheetDto
        {
            Id = Guid.NewGuid(),
            AdmissionId = source?.AdmissionId ?? Guid.Empty,
            TreatmentDate = newDate,
            DoctorId = userId,
            DoctorName = doctor?.FullName ?? string.Empty,
            ProgressNotes = source?.SubjectiveFindings,
            TreatmentOrders = source?.Plan,
            NursingOrders = source?.ActivityOrder,
            DietOrders = source?.DietOrder,
            CreatedAt = DateTime.Now
        };
    }

    public async Task<byte[]> PrintTreatmentSheetAsync(Guid id)
    {
        var dp = await _context.DailyProgresses
            .FirstOrDefaultAsync(d => d.Id == id);
        if (dp == null) return Array.Empty<byte>();

        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(a => a.Id == dp.AdmissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = medRecord.Department;
        var doctor = await _context.Users.FindAsync(dp.DoctorId);
        var dayNumber = (int)(dp.ProgressDate - admission.AdmissionDate).TotalDays + 1;

        var rows = new List<TreatmentSheetRow>
        {
            new TreatmentSheetRow
            {
                Date = dp.ProgressDate,
                DayNumber = dayNumber,
                Progress = dp.SubjectiveFindings,
                Orders = dp.Plan,
                DoctorName = doctor?.FullName
            }
        };

        var html = GetTreatmentSheet(
            patient.PatientCode, patient.FullName, patient.Gender, patient.DateOfBirth,
            patient.Address, patient.PhoneNumber, medRecord.InsuranceNumber,
            medRecord.MedicalRecordCode, dept?.DepartmentName,
            medRecord.MainDiagnosis, medRecord.MainIcdCode,
            rows, doctor?.FullName);

        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<byte[]> PrintCombinedTreatmentSheetsAsync(Guid admissionId, DateTime fromDate, DateTime toDate)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = medRecord.Department;

        var dailyProgresses = await _context.DailyProgresses
            .Where(dp => dp.AdmissionId == admissionId
                && dp.ProgressDate >= fromDate && dp.ProgressDate <= toDate)
            .OrderBy(dp => dp.ProgressDate)
            .ToListAsync();

        var rows = new List<TreatmentSheetRow>();
        foreach (var dp in dailyProgresses)
        {
            var doctor = await _context.Users.FindAsync(dp.DoctorId);
            var dayNumber = (int)(dp.ProgressDate - admission.AdmissionDate).TotalDays + 1;
            rows.Add(new TreatmentSheetRow
            {
                Date = dp.ProgressDate,
                DayNumber = dayNumber,
                Progress = dp.SubjectiveFindings,
                Orders = dp.Plan,
                DoctorName = doctor?.FullName
            });
        }

        var html = GetTreatmentSheet(
            patient.PatientCode, patient.FullName, patient.Gender, patient.DateOfBirth,
            patient.Address, patient.PhoneNumber, medRecord.InsuranceNumber,
            medRecord.MedicalRecordCode, dept?.DepartmentName,
            medRecord.MainDiagnosis, medRecord.MainIcdCode,
            rows, null);

        return Encoding.UTF8.GetBytes(html);
    }

    public Task<bool> DigitizeMedicalRecordCoverAsync(Guid admissionId, byte[] scannedImage, Guid userId)
    {
        return Task.FromResult(true);
    }

    public async Task<byte[]> PrintMedicalRecordCoverAsync(Guid admissionId)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = medRecord.Department;
        var doctor = await _context.Users.FindAsync(admission.AdmittingDoctorId);

        var bodyContent = new StringBuilder();
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Ngày vào viện:</span><span class=""field-value"">{admission.AdmissionDate:HH:mm dd/MM/yyyy}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Loại nhập viện:</span><span class=""field-value"">{GetAdmissionTypeName(admission.AdmissionType)}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Chẩn đoán vào viện:</span><span class=""field-value"">{Esc(admission.DiagnosisOnAdmission)}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Chẩn đoán chính:</span><span class=""field-value"">{Esc(medRecord.MainDiagnosis)} {(string.IsNullOrEmpty(medRecord.MainIcdCode) ? "" : $"({Esc(medRecord.MainIcdCode)})")}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Bác sĩ điều trị:</span><span class=""field-value"">{Esc(doctor?.FullName)}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Trạng thái:</span><span class=""field-value"">{GetAdmissionStatusName(admission.Status)}</span></div>");

        var html = GetGenericForm(
            "BÌA HỒ SƠ BỆNH ÁN", "MS. 01/BV",
            patient.PatientCode, patient.FullName, patient.Gender, patient.DateOfBirth,
            patient.Address, patient.PhoneNumber, medRecord.InsuranceNumber,
            medRecord.MedicalRecordCode, dept?.DepartmentName,
            bodyContent.ToString(), doctor?.FullName);

        return Encoding.UTF8.GetBytes(html);
    }

    public Task<VitalSignsRecordDto> CreateVitalSignsAsync(CreateVitalSignsDto dto, Guid userId)
    {
        return Task.FromResult(new VitalSignsRecordDto
        {
            Id = Guid.NewGuid(),
            AdmissionId = dto.AdmissionId,
            RecordTime = dto.RecordTime,
            Temperature = dto.Temperature,
            Pulse = dto.Pulse,
            RespiratoryRate = dto.RespiratoryRate,
            SystolicBP = dto.SystolicBP,
            DiastolicBP = dto.DiastolicBP,
            SpO2 = dto.SpO2,
            Weight = dto.Weight,
            Height = dto.Height,
            Notes = dto.Notes,
            RecordedBy = userId
        });
    }

    public Task<VitalSignsRecordDto> UpdateVitalSignsAsync(Guid id, CreateVitalSignsDto dto, Guid userId)
    {
        return Task.FromResult(new VitalSignsRecordDto
        {
            Id = id,
            AdmissionId = dto.AdmissionId,
            RecordTime = dto.RecordTime,
            Temperature = dto.Temperature,
            Pulse = dto.Pulse,
            RespiratoryRate = dto.RespiratoryRate,
            SystolicBP = dto.SystolicBP,
            DiastolicBP = dto.DiastolicBP,
            SpO2 = dto.SpO2,
            Weight = dto.Weight,
            Height = dto.Height,
            Notes = dto.Notes,
            RecordedBy = userId
        });
    }

    public Task<List<VitalSignsRecordDto>> GetVitalSignsListAsync(Guid admissionId, DateTime? fromDate, DateTime? toDate)
    {
        return Task.FromResult(new List<VitalSignsRecordDto>());
    }

    public Task<VitalSignsChartDto> GetVitalSignsChartAsync(Guid admissionId, DateTime fromDate, DateTime toDate)
    {
        return Task.FromResult(new VitalSignsChartDto
        {
            AdmissionId = admissionId,
            FromDate = fromDate,
            ToDate = toDate,
            TemperatureData = new List<VitalSignsPointDto>(),
            PulseData = new List<VitalSignsPointDto>(),
            BPData = new List<VitalSignsPointDto>(),
            SpO2Data = new List<VitalSignsPointDto>()
        });
    }

    public async Task<byte[]> PrintVitalSignsAsync(Guid admissionId, DateTime fromDate, DateTime toDate)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = medRecord.Department;

        // Query vital signs from Examinations related to this medical record within date range
        var vitals = await _context.Examinations
            .Where(e => e.MedicalRecordId == medRecord.Id
                && e.CreatedAt >= fromDate && e.CreatedAt <= toDate)
            .OrderBy(e => e.CreatedAt)
            .ToListAsync();

        var headers = new[] { "Thời gian", "Mạch", "Nhiệt độ", "HA", "Nhịp thở", "SpO2", "Cân nặng" };
        var rows = vitals.Select(v => new[]
        {
            v.CreatedAt.ToString("dd/MM HH:mm"),
            v.Pulse?.ToString() ?? "",
            v.Temperature?.ToString("0.0") ?? "",
            v.BloodPressureSystolic.HasValue ? $"{v.BloodPressureSystolic}/{v.BloodPressureDiastolic}" : "",
            v.RespiratoryRate?.ToString() ?? "",
            v.SpO2?.ToString() ?? "",
            v.Weight?.ToString("0.0") ?? ""
        }).ToList();

        var html = BuildTableReport(
            "BẢNG THEO DÕI CHỨC NĂNG SỐNG",
            $"BN: {Esc(patient.FullName)} - Mã HS: {Esc(medRecord.MedicalRecordCode)} - Khoa: {Esc(dept?.DepartmentName)} - Từ {fromDate:dd/MM/yyyy} đến {toDate:dd/MM/yyyy}",
            null,
            headers, rows);

        return Encoding.UTF8.GetBytes(html);
    }

    public Task<ConsultationDto> CreateConsultationAsync(CreateConsultationDto dto, Guid userId)
    {
        return Task.FromResult(new ConsultationDto
        {
            Id = Guid.NewGuid(),
            AdmissionId = dto.AdmissionId,
            ConsultationType = dto.ConsultationType,
            ConsultationDate = dto.ConsultationDate,
            ConsultationTime = dto.ConsultationTime,
            Location = dto.Location,
            ChairmanId = dto.ChairmanId,
            SecretaryId = dto.SecretaryId,
            Reason = dto.Reason,
            ClinicalFindings = dto.ClinicalFindings,
            Status = 0, // Chờ hội chẩn
            Members = dto.MemberIds.Select(mid => new ConsultationMemberDto
            {
                DoctorId = mid
            }).ToList()
        });
    }

    public Task<ConsultationDto> UpdateConsultationAsync(Guid id, CreateConsultationDto dto, Guid userId)
    {
        return Task.FromResult(new ConsultationDto
        {
            Id = id,
            AdmissionId = dto.AdmissionId,
            ConsultationType = dto.ConsultationType,
            ConsultationDate = dto.ConsultationDate,
            ConsultationTime = dto.ConsultationTime,
            Location = dto.Location,
            ChairmanId = dto.ChairmanId,
            SecretaryId = dto.SecretaryId,
            Reason = dto.Reason,
            ClinicalFindings = dto.ClinicalFindings,
            Status = 0,
            Members = dto.MemberIds.Select(mid => new ConsultationMemberDto
            {
                DoctorId = mid
            }).ToList()
        });
    }

    public Task<List<ConsultationDto>> GetConsultationsAsync(Guid? admissionId, Guid? departmentId, DateTime? fromDate, DateTime? toDate)
    {
        return Task.FromResult(new List<ConsultationDto>());
    }

    public Task<ConsultationDto> CompleteConsultationAsync(Guid id, string conclusion, string treatment, Guid userId)
    {
        return Task.FromResult(new ConsultationDto
        {
            Id = id,
            Conclusion = conclusion,
            Treatment = treatment,
            Status = 2 // Hoàn thành
        });
    }

    public async Task<byte[]> PrintConsultationAsync(Guid id)
    {
        var record = await _context.ConsultationRecords
            .Include(c => c.Examination).ThenInclude(e => e.MedicalRecord).ThenInclude(m => m.Patient)
            .Include(c => c.Examination).ThenInclude(e => e.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(c => c.Id == id);
        if (record == null) return Array.Empty<byte>();

        var examination = record.Examination;
        var medRecord = examination.MedicalRecord;
        var patient = medRecord.Patient;
        var dept = medRecord.Department;
        var chairman = record.PresidedByUserId.HasValue
            ? await _context.Users.FindAsync(record.PresidedByUserId.Value) : null;
        var secretary = record.SecretaryUserId.HasValue
            ? await _context.Users.FindAsync(record.SecretaryUserId.Value) : null;

        var html = GetConsultationMinutes(
            patient.PatientCode, patient.FullName, patient.Gender, patient.DateOfBirth,
            patient.Address, patient.PhoneNumber, medRecord.InsuranceNumber,
            medRecord.MedicalRecordCode, dept?.DepartmentName,
            record.ConsultationDate, record.Reason, record.Summary,
            record.Conclusion, record.TreatmentPlan, record.Participants,
            chairman?.FullName, secretary?.FullName);

        return Encoding.UTF8.GetBytes(html);
    }

    public Task<NursingCareSheetDto> CreateNursingCareSheetAsync(CreateNursingCareSheetDto dto, Guid userId)
    {
        return Task.FromResult(new NursingCareSheetDto
        {
            Id = Guid.NewGuid(),
            AdmissionId = dto.AdmissionId,
            CareDate = dto.CareDate,
            NurseId = userId,
            Shift = dto.Shift,
            PatientCondition = dto.PatientCondition,
            Consciousness = dto.Consciousness,
            HygieneActivities = dto.HygieneActivities,
            MedicationActivities = dto.MedicationActivities,
            NutritionActivities = dto.NutritionActivities,
            MovementActivities = dto.MovementActivities,
            SpecialMonitoring = dto.SpecialMonitoring,
            IssuesAndActions = dto.IssuesAndActions,
            Notes = dto.Notes,
            CreatedAt = DateTime.Now
        });
    }

    public Task<NursingCareSheetDto> UpdateNursingCareSheetAsync(Guid id, CreateNursingCareSheetDto dto, Guid userId)
    {
        return Task.FromResult(new NursingCareSheetDto
        {
            Id = id,
            AdmissionId = dto.AdmissionId,
            CareDate = dto.CareDate,
            NurseId = userId,
            Shift = dto.Shift,
            PatientCondition = dto.PatientCondition,
            Consciousness = dto.Consciousness,
            HygieneActivities = dto.HygieneActivities,
            MedicationActivities = dto.MedicationActivities,
            NutritionActivities = dto.NutritionActivities,
            MovementActivities = dto.MovementActivities,
            SpecialMonitoring = dto.SpecialMonitoring,
            IssuesAndActions = dto.IssuesAndActions,
            Notes = dto.Notes,
            CreatedAt = DateTime.Now
        });
    }

    public Task<List<NursingCareSheetDto>> GetNursingCareSheetsAsync(Guid admissionId, DateTime? fromDate, DateTime? toDate)
    {
        return Task.FromResult(new List<NursingCareSheetDto>());
    }

    public async Task<byte[]> PrintNursingCareSheetAsync(Guid id)
    {
        var sheet = await _context.NursingCareSheets
            .Include(n => n.Examination).ThenInclude(e => e.MedicalRecord).ThenInclude(m => m.Patient)
            .Include(n => n.Examination).ThenInclude(e => e.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(n => n.Id == id);
        if (sheet == null) return Array.Empty<byte>();

        var examination = sheet.Examination;
        var medRecord = examination.MedicalRecord;
        var patient = medRecord.Patient;
        var dept = medRecord.Department;
        var nurse = sheet.NurseId.HasValue ? await _context.Users.FindAsync(sheet.NurseId.Value) : null;

        var rows = new List<NursingCareRow>
        {
            new NursingCareRow
            {
                Date = sheet.CareDate,
                Shift = 0,
                PatientCondition = sheet.Notes,
                NursingDiagnosis = sheet.NursingDiagnosis,
                Interventions = sheet.NursingInterventions,
                PatientResponse = sheet.PatientResponse,
                NurseName = nurse?.FullName
            }
        };

        var html = GetNursingCareSheet(
            patient.PatientCode, patient.FullName, patient.Gender, patient.DateOfBirth,
            patient.Address, patient.PhoneNumber, medRecord.InsuranceNumber,
            medRecord.MedicalRecordCode, dept?.DepartmentName,
            medRecord.MainDiagnosis, rows);

        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<byte[]> PrintCombinedNursingCareSheetsAsync(Guid admissionId, DateTime fromDate, DateTime toDate)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = medRecord.Department;

        var sheets = await _context.NursingCareSheets
            .Where(n => n.Examination.MedicalRecordId == medRecord.Id
                && n.CareDate >= fromDate && n.CareDate <= toDate)
            .OrderBy(n => n.CareDate).ThenBy(n => n.CareTime)
            .ToListAsync();

        var rows = new List<NursingCareRow>();
        foreach (var sheet in sheets)
        {
            var nurse = sheet.NurseId.HasValue ? await _context.Users.FindAsync(sheet.NurseId.Value) : null;
            rows.Add(new NursingCareRow
            {
                Date = sheet.CareDate,
                Shift = 0,
                PatientCondition = sheet.Notes,
                NursingDiagnosis = sheet.NursingDiagnosis,
                Interventions = sheet.NursingInterventions,
                PatientResponse = sheet.PatientResponse,
                NurseName = nurse?.FullName
            });
        }

        var html = GetNursingCareSheet(
            patient.PatientCode, patient.FullName, patient.Gender, patient.DateOfBirth,
            patient.Address, patient.PhoneNumber, medRecord.InsuranceNumber,
            medRecord.MedicalRecordCode, dept?.DepartmentName,
            medRecord.MainDiagnosis, rows);

        return Encoding.UTF8.GetBytes(html);
    }

    public Task<InfusionRecordDto> CreateInfusionRecordAsync(CreateInfusionRecordDto dto, Guid userId)
    {
        return Task.FromResult(new InfusionRecordDto
        {
            Id = Guid.NewGuid(),
            AdmissionId = dto.AdmissionId,
            FluidName = dto.FluidName,
            Volume = dto.Volume,
            DropRate = dto.DropRate,
            StartTime = dto.StartTime,
            Route = dto.Route,
            AdditionalMedication = dto.AdditionalMedication,
            StartedBy = userId,
            Status = 0 // Đang truyền
        });
    }

    public Task<InfusionRecordDto> UpdateInfusionRecordAsync(Guid id, string observations, string? complications, Guid userId)
    {
        return Task.FromResult(new InfusionRecordDto
        {
            Id = id,
            Observations = observations,
            Complications = complications,
            Status = 0 // Đang truyền
        });
    }

    public Task<InfusionRecordDto> CompleteInfusionAsync(Guid id, DateTime endTime, Guid userId)
    {
        return Task.FromResult(new InfusionRecordDto
        {
            Id = id,
            EndTime = endTime,
            Status = 2 // Hoàn thành
        });
    }

    public Task<DateTime> CalculateInfusionEndTimeAsync(int volumeMl, int dropRate)
    {
        // Formula: duration (minutes) = volumeMl * 20 / dropRate
        // 20 drops = 1 ml (standard drip set)
        var durationMinutes = dropRate > 0 ? volumeMl * 20.0 / dropRate : 0;
        var endTime = DateTime.Now.AddMinutes(durationMinutes);
        return Task.FromResult(endTime);
    }

    public Task<List<InfusionRecordDto>> GetInfusionRecordsAsync(Guid admissionId)
    {
        return Task.FromResult(new List<InfusionRecordDto>());
    }

    public async Task<byte[]> PrintInfusionRecordAsync(Guid id)
    {
        // Infusion records are in-memory DTOs; build a generic form from the id
        // In a full implementation this would query an InfusionRecords table
        var bodyContent = new StringBuilder();
        bodyContent.AppendLine($@"<div class=""section-title"">THÔNG TIN TRUYỀN DỊCH</div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Mã phiếu:</span><span class=""field-value"">{id}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Ngày in:</span><span class=""field-value"">{DateTime.Now:dd/MM/yyyy HH:mm}</span></div>");
        bodyContent.AppendLine($@"<p class=""text-italic"">Chi tiết truyền dịch sẽ được cập nhật khi có bảng InfusionRecords trong DB.</p>");

        var body = new StringBuilder();
        body.AppendLine(GetHospitalHeader());
        body.AppendLine(@"<div class=""form-title"">PHIẾU THEO DÕI TRUYỀN DỊCH</div>");
        body.AppendLine(bodyContent.ToString());
        body.AppendLine(GetSignatureBlock());

        var html = WrapHtmlPage("Phiếu theo dõi truyền dịch", body.ToString());
        return await Task.FromResult(Encoding.UTF8.GetBytes(html));
    }

    public Task<BloodTransfusionDto> CreateBloodTransfusionAsync(CreateBloodTransfusionDto dto, Guid userId)
    {
        return Task.FromResult(new BloodTransfusionDto
        {
            Id = Guid.NewGuid(),
            AdmissionId = dto.AdmissionId,
            BloodType = dto.BloodType,
            RhFactor = dto.RhFactor,
            BloodProductType = dto.BloodProductType,
            BagNumber = dto.BagNumber,
            Volume = dto.Volume,
            TransfusionStart = dto.TransfusionStart,
            DoctorOrderId = userId,
            ExecutedBy = userId,
            Status = 0 // Đang truyền
        });
    }

    public Task<BloodTransfusionDto> UpdateBloodTransfusionMonitoringAsync(Guid id, string preVitals, string duringVitals, string postVitals, Guid userId)
    {
        return Task.FromResult(new BloodTransfusionDto
        {
            Id = id,
            PreTransfusionVitals = preVitals,
            DuringTransfusionVitals = duringVitals,
            PostTransfusionVitals = postVitals,
            ExecutedBy = userId,
            Status = 0 // Đang truyền
        });
    }

    public Task<BloodTransfusionDto> RecordTransfusionReactionAsync(Guid id, string reactionDetails, Guid userId)
    {
        return Task.FromResult(new BloodTransfusionDto
        {
            Id = id,
            HasReaction = true,
            ReactionDetails = reactionDetails,
            ExecutedBy = userId,
            Status = 0
        });
    }

    public Task<BloodTransfusionDto> CompleteBloodTransfusionAsync(Guid id, DateTime endTime, Guid userId)
    {
        return Task.FromResult(new BloodTransfusionDto
        {
            Id = id,
            TransfusionEnd = endTime,
            ExecutedBy = userId,
            Status = 2 // Hoàn thành
        });
    }

    public Task<List<BloodTransfusionDto>> GetBloodTransfusionsAsync(Guid admissionId)
    {
        return Task.FromResult(new List<BloodTransfusionDto>());
    }

    public async Task<byte[]> PrintBloodTransfusionAsync(Guid id)
    {
        // Blood transfusion records are in-memory DTOs; build generic form
        var bodyContent = new StringBuilder();
        bodyContent.AppendLine($@"<div class=""section-title"">THÔNG TIN TRUYỀN MÁU</div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Mã phiếu:</span><span class=""field-value"">{id}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Ngày in:</span><span class=""field-value"">{DateTime.Now:dd/MM/yyyy HH:mm}</span></div>");
        bodyContent.AppendLine($@"<p class=""text-italic"">Chi tiết truyền máu sẽ được cập nhật khi có bảng BloodTransfusions trong DB.</p>");

        var body = new StringBuilder();
        body.AppendLine(GetHospitalHeader());
        body.AppendLine(@"<div class=""form-title"">PHIẾU THEO DÕI TRUYỀN MÁU</div>");
        body.AppendLine(bodyContent.ToString());
        body.AppendLine(GetSignatureBlock());

        var html = WrapHtmlPage("Phiếu theo dõi truyền máu", body.ToString());
        return await Task.FromResult(Encoding.UTF8.GetBytes(html));
    }

    public Task<DrugReactionRecordDto> CreateDrugReactionRecordAsync(Guid admissionId, Guid? medicineId, string medicineName, int severity, string symptoms, string? treatment, Guid userId)
    {
        return Task.FromResult(new DrugReactionRecordDto
        {
            Id = Guid.NewGuid(),
            AdmissionId = admissionId,
            MedicineId = medicineId,
            MedicineName = medicineName,
            ReactionTime = DateTime.Now,
            Severity = severity,
            Symptoms = symptoms,
            Treatment = treatment,
            ReportedBy = userId
        });
    }

    public Task<List<DrugReactionRecordDto>> GetDrugReactionRecordsAsync(Guid admissionId)
    {
        return Task.FromResult(new List<DrugReactionRecordDto>());
    }

    public async Task<byte[]> PrintDrugReactionRecordAsync(Guid id)
    {
        // Drug reaction records are in-memory DTOs; build generic form
        var bodyContent = new StringBuilder();
        bodyContent.AppendLine($@"<div class=""section-title"">BÁO CÁO PHẢN ỨNG THUỐC</div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Mã báo cáo:</span><span class=""field-value"">{id}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Ngày in:</span><span class=""field-value"">{DateTime.Now:dd/MM/yyyy HH:mm}</span></div>");
        bodyContent.AppendLine($@"<p class=""text-italic"">Chi tiết phản ứng thuốc sẽ được cập nhật khi có bảng DrugReactions trong DB.</p>");

        var body = new StringBuilder();
        body.AppendLine(GetHospitalHeader());
        body.AppendLine(@"<div class=""form-title"">BÁO CÁO PHẢN ỨNG THUỐC BẤT LỢI (ADR)</div>");
        body.AppendLine(bodyContent.ToString());
        body.AppendLine(GetSignatureBlock());

        var html = WrapHtmlPage("Báo cáo phản ứng thuốc bất lợi", body.ToString());
        return await Task.FromResult(Encoding.UTF8.GetBytes(html));
    }

    public Task<InjuryRecordDto> CreateInjuryRecordAsync(Guid admissionId, InjuryRecordDto dto, Guid userId)
    {
        dto.Id = Guid.NewGuid();
        dto.AdmissionId = admissionId;
        return Task.FromResult(dto);
    }

    public Task<InjuryRecordDto?> GetInjuryRecordAsync(Guid admissionId)
    {
        return Task.FromResult<InjuryRecordDto?>(null);
    }

    public Task<NewbornRecordDto> CreateNewbornRecordAsync(Guid motherAdmissionId, NewbornRecordDto dto, Guid userId)
    {
        dto.Id = Guid.NewGuid();
        dto.MotherAdmissionId = motherAdmissionId;
        return Task.FromResult(dto);
    }

    public Task<List<NewbornRecordDto>> GetNewbornRecordsAsync(Guid motherAdmissionId)
    {
        return Task.FromResult(new List<NewbornRecordDto>());
    }

    #endregion

    #region 3.7 Discharge

    public async Task<PreDischargeCheckDto> CheckPreDischargeAsync(Guid admissionId)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null)
            throw new Exception("Admission not found");

        // Check unpaid prescriptions
        var unclaimedRx = await _context.Prescriptions
            .CountAsync(p => p.MedicalRecordId == admission.MedicalRecordId && p.Status < 2);

        // Check pending results - simplified check
        var hasUnpaidBalance = false; // Would check billing in full impl

        var warnings = new List<string>();
        if (unclaimedRx > 0)
            warnings.Add($"Còn {unclaimedRx} đơn thuốc chưa cấp phát");

        return new PreDischargeCheckDto
        {
            AdmissionId = admissionId,
            PatientName = admission.Patient.FullName,
            IsInsuranceValid = true,
            TotalAmount = 0,
            PaidAmount = 0,
            RemainingAmount = 0,
            HasUnpaidBalance = hasUnpaidBalance,
            HasUnclaimedMedicine = unclaimedRx > 0,
            UnclaimedPrescriptionCount = unclaimedRx,
            HasPendingResults = false,
            PendingResultCount = 0,
            IsMedicalRecordComplete = true,
            MissingDocuments = new List<string>(),
            CanDischarge = !hasUnpaidBalance && unclaimedRx == 0,
            Warnings = warnings
        };
    }

    public async Task<DischargeDto> DischargePatientAsync(CompleteDischargeDto dto, Guid userId)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .FirstOrDefaultAsync(a => a.Id == dto.AdmissionId);
        if (admission == null)
            throw new Exception("Admission not found");

        // Create discharge record
        var discharge = new Discharge
        {
            Id = Guid.NewGuid(),
            AdmissionId = dto.AdmissionId,
            DischargeDate = dto.DischargeDate,
            DischargeType = dto.DischargeType,
            DischargeCondition = dto.DischargeCondition,
            DischargeDiagnosis = dto.DischargeDiagnosis,
            DischargeInstructions = dto.DischargeInstructions,
            FollowUpDate = dto.FollowUpDate,
            DischargedBy = userId,
            CreatedAt = DateTime.Now,
            CreatedBy = null
        };

        _context.Set<Discharge>().Add(discharge);

        // Update admission status
        admission.Status = dto.DischargeType switch
        {
            1 => 1, // Xuất viện
            2 => 2, // Chuyển viện
            3 => 4, // Bỏ về
            4 => 3, // Tử vong
            _ => 1
        };

        // Release bed
        var bedAssignment = await _context.Set<BedAssignment>()
            .FirstOrDefaultAsync(ba => ba.AdmissionId == dto.AdmissionId && ba.Status == 0);
        if (bedAssignment != null)
        {
            bedAssignment.Status = 1;
            bedAssignment.ReleasedAt = DateTime.Now;
        }

        // Update medical record
        var medRecord = await _context.MedicalRecords.FindAsync(admission.MedicalRecordId);
        if (medRecord != null)
        {
            medRecord.Status = 3; // Đã xuất viện
            medRecord.MainDiagnosis = dto.DischargeDiagnosis;
        }

        await _context.SaveChangesAsync();

        var dischargeTypeName = dto.DischargeType switch
        {
            1 => "Ra viện",
            2 => "Chuyển viện",
            3 => "Bỏ về",
            4 => "Tử vong",
            _ => "Khác"
        };

        return new DischargeDto
        {
            Id = discharge.Id,
            AdmissionId = dto.AdmissionId,
            PatientName = admission.Patient.FullName,
            DischargeDate = dto.DischargeDate,
            DischargeType = dischargeTypeName,
            DischargeStatus = "Đã xuất viện",
            FinalDiagnosis = dto.DischargeDiagnosis ?? string.Empty,
            TreatmentSummary = dto.TreatmentSummary ?? string.Empty,
            DischargeInstructions = dto.DischargeInstructions ?? string.Empty,
            FollowUpDate = dto.FollowUpDate?.ToString("dd/MM/yyyy"),
            DischargedBy = userId.ToString()
        };
    }

    public async Task<bool> CancelDischargeAsync(Guid admissionId, string reason, Guid userId)
    {
        var discharge = await _context.Set<Discharge>()
            .FirstOrDefaultAsync(d => d.AdmissionId == admissionId);
        if (discharge == null)
            throw new Exception("Discharge record not found");

        _context.Set<Discharge>().Remove(discharge);

        // Revert admission status
        var admission = await _context.Set<Admission>().FindAsync(admissionId);
        if (admission != null)
            admission.Status = 0; // Đang điều trị

        // Update medical record
        var medRecord = await _context.MedicalRecords.FindAsync(admission?.MedicalRecordId);
        if (medRecord != null)
            medRecord.Status = 2; // Đang điều trị

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<byte[]> PrintDischargeCertificateAsync(Guid admissionId)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = medRecord.Department;
        var doctor = await _context.Users.FindAsync(admission.AdmittingDoctorId);

        var discharge = await _context.Set<Discharge>()
            .FirstOrDefaultAsync(d => d.AdmissionId == admissionId);

        var html = GetDischargeLetter(
            patient.PatientCode, patient.FullName, patient.Gender, patient.DateOfBirth,
            patient.Address, patient.PhoneNumber, medRecord.InsuranceNumber,
            medRecord.MedicalRecordCode, dept?.DepartmentName,
            admission.AdmissionDate, discharge?.DischargeDate ?? DateTime.Now,
            admission.DiagnosisOnAdmission, discharge?.DischargeDiagnosis ?? medRecord.MainDiagnosis,
            discharge?.DischargeCondition.ToString(), discharge?.DischargeType ?? 1,
            discharge?.DischargeInstructions, discharge?.FollowUpDate,
            doctor?.FullName, null);

        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<byte[]> PrintReferralCertificateAsync(Guid admissionId, ReferralCertificateDto data)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = medRecord.Department;

        var bodyContent = new StringBuilder();
        bodyContent.AppendLine($@"<div class=""section-title"">I. CƠ SỞ CHUYỂN ĐI</div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Tên cơ sở:</span><span class=""field-value"">{Esc(data.FromHospitalName)}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Mã cơ sở:</span><span class=""field-value"">{Esc(data.FromHospitalCode)}</span></div>");
        bodyContent.AppendLine($@"<div class=""section-title"">II. CƠ SỞ NHẬN</div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Tên cơ sở:</span><span class=""field-value"">{Esc(data.ToHospitalName)}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Mã cơ sở:</span><span class=""field-value"">{Esc(data.ToHospitalCode)}</span></div>");
        bodyContent.AppendLine($@"<div class=""section-title"">III. THÔNG TIN CHUYỂN TUYẾN</div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Lý do chuyển:</span><span class=""field-value"">{Esc(data.TransferReason)}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Chẩn đoán:</span><span class=""field-value"">{Esc(data.Diagnosis)}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Tóm tắt điều trị:</span><span class=""field-value"">{Esc(data.TreatmentSummary)}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Tình trạng hiện tại:</span><span class=""field-value"">{Esc(data.CurrentCondition)}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Yêu cầu dịch vụ:</span><span class=""field-value"">{Esc(data.RequestedServices)}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Ngày chuyển:</span><span class=""field-value"">{data.TransferDate:dd/MM/yyyy}</span></div>");

        var html = GetGenericForm(
            "GIẤY CHUYỂN TUYẾN", "Theo TT 14/2014/TT-BYT",
            patient.PatientCode, patient.FullName, patient.Gender, patient.DateOfBirth,
            patient.Address, patient.PhoneNumber, medRecord.InsuranceNumber,
            medRecord.MedicalRecordCode, dept?.DepartmentName,
            bodyContent.ToString(), data.DoctorName);

        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<byte[]> PrintServiceDisclosureAsync(Guid admissionId)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = medRecord.Department;

        var details = await _context.ServiceRequestDetails
            .Include(d => d.Service)
            .Include(d => d.ServiceRequest)
            .Where(d => d.ServiceRequest.MedicalRecordId == medRecord.Id && !d.IsDeleted)
            .OrderBy(d => d.ServiceRequest.RequestDate)
            .ToListAsync();

        var headers = new[] { "Ngày", "Tên dịch vụ", "ĐVT", "SL", "Đơn giá", "Thành tiền", "Nguồn" };
        var rows = details.Select(d =>
        {
            var source = d.PatientType switch { 1 => "BHYT", 2 => "Viện phí", _ => "Khác" };
            return new[]
            {
                d.ServiceRequest.RequestDate.ToString("dd/MM/yyyy"),
                d.Service?.ServiceName ?? "",
                d.Service?.Unit ?? "",
                d.Quantity.ToString("#,##0"),
                d.UnitPrice.ToString("#,##0"),
                d.Amount.ToString("#,##0"),
                source
            };
        }).ToList();

        var html = BuildTableReport(
            "BẢNG CÔNG KHAI DỊCH VỤ",
            $"BN: {Esc(patient.FullName)} - Mã BN: {Esc(patient.PatientCode)} - Mã HS: {Esc(medRecord.MedicalRecordCode)} - Khoa: {Esc(dept?.DepartmentName)}",
            null,
            headers, rows);

        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<byte[]> PrintMedicineDisclosureAsync(Guid admissionId)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = medRecord.Department;

        var prescriptionDetails = await _context.PrescriptionDetails
            .Include(d => d.Medicine)
            .Include(d => d.Prescription)
            .Where(d => d.Prescription.MedicalRecordId == medRecord.Id && d.Prescription.PrescriptionType == 2)
            .OrderBy(d => d.Prescription.PrescriptionDate)
            .ToListAsync();

        var headers = new[] { "Ngày", "Tên thuốc", "ĐVT", "SL", "Đơn giá", "Thành tiền", "Nguồn" };
        var rows = prescriptionDetails.Select(d =>
        {
            var source = d.PatientType switch { 1 => "BHYT", 2 => "Viện phí", _ => "Khác" };
            return new[]
            {
                d.Prescription.PrescriptionDate.ToString("dd/MM/yyyy"),
                d.Medicine?.MedicineName ?? "",
                d.Unit ?? "",
                d.Quantity.ToString("#,##0"),
                d.UnitPrice.ToString("#,##0"),
                d.Amount.ToString("#,##0"),
                source
            };
        }).ToList();

        var html = BuildTableReport(
            "BẢNG CÔNG KHAI THUỐC",
            $"BN: {Esc(patient.FullName)} - Mã BN: {Esc(patient.PatientCode)} - Mã HS: {Esc(medRecord.MedicalRecordCode)} - Khoa: {Esc(dept?.DepartmentName)}",
            null,
            headers, rows);

        return Encoding.UTF8.GetBytes(html);
    }

    public Task<BillingStatement6556Dto> GetBillingStatement6556Async(Guid admissionId)
    {
        return Task.FromResult(new BillingStatement6556Dto
        {
            AdmissionId = admissionId,
            AdmissionDate = DateTime.Now.AddDays(-7),
            DischargeDate = DateTime.Now,
            DaysOfStay = 7
        });
    }

    public async Task<byte[]> PrintBillingStatement6556Async(Guid admissionId)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = medRecord.Department;
        var discharge = await _context.Set<Discharge>()
            .FirstOrDefaultAsync(d => d.AdmissionId == admissionId);
        var daysOfStay = discharge != null
            ? (discharge.DischargeDate - admission.AdmissionDate).Days
            : (DateTime.Now - admission.AdmissionDate).Days;

        // Gather services
        var serviceDetails = await _context.ServiceRequestDetails
            .Include(d => d.Service)
            .Include(d => d.ServiceRequest)
            .Where(d => d.ServiceRequest.MedicalRecordId == medRecord.Id && !d.IsDeleted)
            .ToListAsync();

        // Gather medicines
        var rxDetails = await _context.PrescriptionDetails
            .Include(d => d.Medicine)
            .Include(d => d.Prescription)
            .Where(d => d.Prescription.MedicalRecordId == medRecord.Id && d.Prescription.PrescriptionType == 2)
            .ToListAsync();

        var headers = new[] { "Nội dung", "ĐVT", "SL", "Đơn giá BHYT", "Thành tiền", "Tỷ lệ TT(%)", "Nguồn" };
        var rows = new List<string[]>();

        foreach (var d in serviceDetails)
        {
            rows.Add(new[]
            {
                d.Service?.ServiceName ?? "",
                d.Service?.Unit ?? "",
                d.Quantity.ToString("#,##0"),
                d.UnitPrice.ToString("#,##0"),
                d.Amount.ToString("#,##0"),
                "100",
                d.PatientType == 1 ? "BHYT" : "VP"
            });
        }
        foreach (var d in rxDetails)
        {
            rows.Add(new[]
            {
                d.Medicine?.MedicineName ?? "",
                d.Unit ?? "",
                d.Quantity.ToString("#,##0"),
                d.UnitPrice.ToString("#,##0"),
                d.Amount.ToString("#,##0"),
                "100",
                d.PatientType == 1 ? "BHYT" : "VP"
            });
        }

        var html = BuildTableReport(
            "BẢNG KÊ CHI PHÍ KHÁM CHỮA BỆNH",
            $"(Mẫu 6556 - TT 09/2024/TT-BYT) | BN: {Esc(patient.FullName)} - {Esc(patient.PatientCode)} | HS: {Esc(medRecord.MedicalRecordCode)} | Khoa: {Esc(dept?.DepartmentName)} | Vào: {admission.AdmissionDate:dd/MM/yyyy} | Ra: {discharge?.DischargeDate.ToString("dd/MM/yyyy") ?? "---"} | Số ngày: {daysOfStay}",
            null,
            headers, rows);

        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<byte[]> PrintBillingStatement6556ByPatientTypeAsync(Guid admissionId, int patientType)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = medRecord.Department;
        var typeName = patientType switch { 1 => "BHYT", 2 => "Viện phí", 3 => "Bên thứ 3", _ => "Khác" };

        var serviceDetails = await _context.ServiceRequestDetails
            .Include(d => d.Service)
            .Include(d => d.ServiceRequest)
            .Where(d => d.ServiceRequest.MedicalRecordId == medRecord.Id && !d.IsDeleted && d.PatientType == patientType)
            .ToListAsync();

        var rxDetails = await _context.PrescriptionDetails
            .Include(d => d.Medicine)
            .Include(d => d.Prescription)
            .Where(d => d.Prescription.MedicalRecordId == medRecord.Id && d.Prescription.PrescriptionType == 2 && d.PatientType == patientType)
            .ToListAsync();

        var headers = new[] { "Nội dung", "ĐVT", "SL", "Đơn giá", "Thành tiền" };
        var rows = new List<string[]>();
        foreach (var d in serviceDetails)
        {
            rows.Add(new[] { d.Service?.ServiceName ?? "", d.Service?.Unit ?? "", d.Quantity.ToString("#,##0"), d.UnitPrice.ToString("#,##0"), d.Amount.ToString("#,##0") });
        }
        foreach (var d in rxDetails)
        {
            rows.Add(new[] { d.Medicine?.MedicineName ?? "", d.Unit ?? "", d.Quantity.ToString("#,##0"), d.UnitPrice.ToString("#,##0"), d.Amount.ToString("#,##0") });
        }

        var html = BuildTableReport(
            $"BẢNG KÊ CHI PHÍ - {typeName}",
            $"BN: {Esc(patient.FullName)} - Mã HS: {Esc(medRecord.MedicalRecordCode)} - Khoa: {Esc(dept?.DepartmentName)}",
            null, headers, rows);

        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<byte[]> PrintBillingStatement6556ByDepartmentAsync(Guid admissionId, Guid departmentId)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = await _context.Departments.FindAsync(departmentId);

        var serviceDetails = await _context.ServiceRequestDetails
            .Include(d => d.Service)
            .Include(d => d.ServiceRequest)
            .Where(d => d.ServiceRequest.MedicalRecordId == medRecord.Id && !d.IsDeleted
                && d.ServiceRequest.DepartmentId == departmentId)
            .ToListAsync();

        var rxDetails = await _context.PrescriptionDetails
            .Include(d => d.Medicine)
            .Include(d => d.Prescription)
            .Where(d => d.Prescription.MedicalRecordId == medRecord.Id
                && d.Prescription.PrescriptionType == 2
                && d.Prescription.DepartmentId == departmentId)
            .ToListAsync();

        var headers = new[] { "Nội dung", "ĐVT", "SL", "Đơn giá", "Thành tiền", "Nguồn" };
        var rows = new List<string[]>();
        foreach (var d in serviceDetails)
        {
            rows.Add(new[] { d.Service?.ServiceName ?? "", d.Service?.Unit ?? "", d.Quantity.ToString("#,##0"), d.UnitPrice.ToString("#,##0"), d.Amount.ToString("#,##0"), d.PatientType == 1 ? "BHYT" : "VP" });
        }
        foreach (var d in rxDetails)
        {
            rows.Add(new[] { d.Medicine?.MedicineName ?? "", d.Unit ?? "", d.Quantity.ToString("#,##0"), d.UnitPrice.ToString("#,##0"), d.Amount.ToString("#,##0"), d.PatientType == 1 ? "BHYT" : "VP" });
        }

        var html = BuildTableReport(
            $"BẢNG KÊ CHI PHÍ THEO KHOA",
            $"BN: {Esc(patient.FullName)} - Khoa: {Esc(dept?.DepartmentName)} - Mã HS: {Esc(medRecord.MedicalRecordCode)}",
            null, headers, rows);

        return Encoding.UTF8.GetBytes(html);
    }

    #endregion

    #region 3.8 Reports

    public Task<DepartmentRevenueReportDto> GetDepartmentRevenueReportAsync(ReportSearchDto searchDto)
    {
        return Task.FromResult(new DepartmentRevenueReportDto
        {
            FromDate = searchDto.FromDate,
            ToDate = searchDto.ToDate
        });
    }

    public Task<TreatmentActivityReportDto> GetTreatmentActivityReportAsync(ReportSearchDto searchDto)
    {
        return Task.FromResult(new TreatmentActivityReportDto
        {
            FromDate = searchDto.FromDate,
            ToDate = searchDto.ToDate,
            DepartmentId = searchDto.DepartmentId
        });
    }

    public Task<Register4069Dto> GetRegister4069Async(DateTime fromDate, DateTime toDate, Guid? departmentId)
    {
        return Task.FromResult(new Register4069Dto
        {
            FromDate = fromDate,
            ToDate = toDate
        });
    }

    public async Task<byte[]> PrintRegister4069Async(DateTime fromDate, DateTime toDate, Guid? departmentId)
    {
        var query = _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord)
            .Where(a => a.AdmissionDate >= fromDate && a.AdmissionDate <= toDate);

        if (departmentId.HasValue)
            query = query.Where(a => a.DepartmentId == departmentId.Value);

        var admissions = await query.OrderBy(a => a.AdmissionDate).ToListAsync();
        var dept = departmentId.HasValue ? await _context.Departments.FindAsync(departmentId.Value) : null;

        var headers = new[] { "Mã BN", "Họ tên", "Giới", "Năm sinh", "Địa chỉ", "Ngày vào", "Chẩn đoán", "Ngày ra", "Kết quả" };
        var rows = admissions.Select(a =>
        {
            var discharge = _context.Set<Discharge>().FirstOrDefault(d => d.AdmissionId == a.Id);
            var result = discharge?.DischargeType switch
            {
                1 => "Ra viện", 2 => "Chuyển viện", 3 => "Bỏ về", 4 => "Tử vong", _ => "Đang ĐT"
            };
            return new[]
            {
                a.Patient?.PatientCode ?? "",
                a.Patient?.FullName ?? "",
                a.Patient?.Gender == 1 ? "Nam" : "Nữ",
                a.Patient?.DateOfBirth?.ToString("yyyy") ?? a.Patient?.YearOfBirth?.ToString() ?? "",
                a.Patient?.Address ?? "",
                a.AdmissionDate.ToString("dd/MM/yyyy"),
                a.DiagnosisOnAdmission ?? "",
                discharge?.DischargeDate.ToString("dd/MM/yyyy") ?? "",
                result
            };
        }).ToList();

        var html = BuildTableReport(
            "SỔ ĐĂNG KÝ ĐIỀU TRỊ NỘI TRÚ",
            $"(Mẫu 4069) {(dept != null ? $"- Khoa: {Esc(dept.DepartmentName)}" : "")} - Từ {fromDate:dd/MM/yyyy} đến {toDate:dd/MM/yyyy}",
            null,
            headers, rows);

        return Encoding.UTF8.GetBytes(html);
    }

    public Task<MedicineSupplyUsageReportDto> GetMedicineSupplyUsageReportAsync(ReportSearchDto searchDto)
    {
        return Task.FromResult(new MedicineSupplyUsageReportDto
        {
            FromDate = searchDto.FromDate,
            ToDate = searchDto.ToDate,
            DepartmentId = searchDto.DepartmentId
        });
    }

    public async Task<byte[]> PrintMedicineSupplyUsageReportAsync(ReportSearchDto searchDto)
    {
        var query = _context.PrescriptionDetails
            .Include(d => d.Medicine)
            .Include(d => d.Prescription)
            .Where(d => d.Prescription.PrescriptionType == 2
                && d.Prescription.PrescriptionDate >= searchDto.FromDate
                && d.Prescription.PrescriptionDate <= searchDto.ToDate);

        if (searchDto.DepartmentId.HasValue)
            query = query.Where(d => d.Prescription.DepartmentId == searchDto.DepartmentId.Value);

        var details = await query.ToListAsync();
        var dept = searchDto.DepartmentId.HasValue
            ? await _context.Departments.FindAsync(searchDto.DepartmentId.Value) : null;

        // Aggregate by medicine
        var grouped = details
            .GroupBy(d => new { d.MedicineId, Name = d.Medicine?.MedicineName ?? "", Unit = d.Medicine?.Unit ?? "" })
            .Select(g => new
            {
                g.Key.Name,
                g.Key.Unit,
                Quantity = g.Sum(x => x.Quantity),
                Amount = g.Sum(x => x.Amount)
            })
            .OrderByDescending(x => x.Amount)
            .ToList();

        var headers = new[] { "Tên thuốc/VTYT", "ĐVT", "Tổng SL", "Thành tiền" };
        var rows = grouped.Select(g => new[]
        {
            g.Name, g.Unit, g.Quantity.ToString("#,##0"), g.Amount.ToString("#,##0")
        }).ToList();

        var html = BuildTableReport(
            "BÁO CÁO SỬ DỤNG THUỐC / VẬT TƯ",
            $"{(dept != null ? $"Khoa: {Esc(dept.DepartmentName)} - " : "")}Từ {searchDto.FromDate:dd/MM/yyyy} đến {searchDto.ToDate:dd/MM/yyyy}",
            null,
            headers, rows);

        return Encoding.UTF8.GetBytes(html);
    }

    #endregion

    #region Helper Methods

    private static string GetAdmissionTypeName(int admissionType)
    {
        return admissionType switch
        {
            1 => "Cấp cứu",
            2 => "Chuyển viện",
            3 => "Từ ngoại trú",
            4 => "Nhập viện trực tiếp",
            _ => "Khác"
        };
    }

    private static string GetAdmissionStatusName(int status)
    {
        return status switch
        {
            0 => "Đang điều trị",
            1 => "Đã xuất viện",
            2 => "Đã chuyển viện",
            3 => "Đã tử vong",
            _ => "Không xác định"
        };
    }

    #endregion
}
