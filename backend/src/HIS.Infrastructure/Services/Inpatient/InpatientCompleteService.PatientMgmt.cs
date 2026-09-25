using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Inpatient;
using HIS.Application.Services;
using HIS.Core.Constants;
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
            .Where(m => m.TreatmentType == 2) // 2 = Inpatient
            // QA0915 wave-2: records flagged inpatient but without any Admission (seed / half-finished
            // flows) came back with AdmissionId = Guid.Empty and every row action failed. Every inpatient
            // endpoint is keyed by admissionId, so only list records that actually have a stay.
            .Where(m => _context.Set<Admission>().Any(a => a.MedicalRecordId == m.Id && !a.IsDeleted));

        // Apply filters
        if (searchDto.FromDate.HasValue)
            query = query.Where(m => m.AdmissionDate >= searchDto.FromDate.Value);

        if (searchDto.ToDate.HasValue)
            query = query.Where(m => m.AdmissionDate <= searchDto.ToDate.Value);

        if (searchDto.DepartmentId.HasValue)
            query = query.Where(m => m.DepartmentId == searchDto.DepartmentId.Value);

        if (searchDto.RoomId.HasValue)
            query = query.Where(m => m.RoomId == searchDto.RoomId.Value);

        // Filter on the current stay's Admissions.Status (same pick as AdmissionId/Status below), not
        // MedicalRecords.Status (0-3 exam vocabulary): DoctorPortal's "đang điều trị" filter returned 2 of 33 patients.
        if (searchDto.Status.HasValue)
            query = query.Where(m => _context.Set<Admission>()
                .Where(a => a.MedicalRecordId == m.Id && !a.IsDeleted)
                .OrderByDescending(a => a.Status == 0 || a.Status == 6)
                .ThenByDescending(a => a.AdmissionDate)
                .Select(a => a.Status)
                .FirstOrDefault() == searchDto.Status.Value);

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
            .Skip(Math.Max(0, searchDto.Page - 1) * searchDto.PageSize)
            .Take(searchDto.PageSize)
            .Select(m => new InpatientListDto
            {
                AdmissionId = _context.Set<Admission>()
                    .Where(a => a.MedicalRecordId == m.Id && !a.IsDeleted)
                    // QA0915: prefer the stay still in treatment (0/6) over an older closed one (e.g. 5 = transferred dept)
                    .OrderByDescending(a => a.Status == 0 || a.Status == 6)
                    .ThenByDescending(a => a.AdmissionDate)
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
                Status = _context.Set<Admission>()
                    .Where(a => a.MedicalRecordId == m.Id && !a.IsDeleted)
                    .OrderByDescending(a => a.Status == 0 || a.Status == 6)
                    .ThenByDescending(a => a.AdmissionDate)
                    .Select(a => a.Status)
                    .FirstOrDefault(),
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
        // QA-R6: a cancelled / deleted outpatient record was admitted (200) and the stay hung off a dead visit.
        if (medicalRecord.IsDeleted || medicalRecord.Status == MedicalRecordStatus.Cancelled)
            throw new InvalidOperationException("Hồ sơ khám này đã hủy, không nhập viện từ hồ sơ này được.");

        // QA-R6: the two guards below were read-then-write — three parallel "Nhập viện" clicks all passed and
        // the patient ended with three open stays on one record. Serialize admissions per patient (and per
        // target bed) until the new stay is committed.
        await using var tx = await SqlAppLock.BeginAsync(_context);
        await SqlAppLock.AcquireAsync(_context, $"HIS.Inpatient.Patient.{medicalRecord.PatientId:N}",
            "Bệnh nhân này đang được nhập viện ở máy khác, vui lòng thử lại.");
        if (dto.BedId.HasValue && _context.Database.CurrentTransaction != null) await LockBedAsync(dto.BedId.Value);

        // QA0915: one active inpatient stay per medical record. Without this guard a double-click /
        // retry created 2-3 concurrent Admissions on the same record, each holding its own bed
        // (ward map showed one patient on several beds).
        var hasActiveAdmission = await _context.Set<Admission>()
            .AnyAsync(a => a.MedicalRecordId == dto.MedicalRecordId
                           && (a.Status == AdmissionStatus.InTreatment || a.Status == AdmissionStatus.PendingDischarge));
        if (hasActiveAdmission)
            throw new InvalidOperationException("Hồ sơ này đã có lượt nội trú đang điều trị, không nhập viện lần nữa được.");

        // QA-R4: the guard above is per medical record — the same PATIENT with an open stay on another
        // record (R1 found 3-4 parallel admissions per patient) was still admitted again. One person
        // cannot occupy two inpatient stays at once; the open one must be discharged / transferred first.
        var otherOpenStay = await _context.Set<Admission>()
            .Where(a => a.PatientId == medicalRecord.PatientId && a.MedicalRecordId != dto.MedicalRecordId && !a.IsDeleted
                        && (a.Status == AdmissionStatus.InTreatment || a.Status == AdmissionStatus.PendingDischarge))
            .Select(a => a.MedicalRecord.MedicalRecordCode)
            .FirstOrDefaultAsync();
        // Pre-push review: 4 patients in the existing data already hold two open stays, and v2 has no screen to
        // close a stay you did not open — a hard block would strand them at reception. So only a stay opened in
        // the last 24h blocks (that is the double-submit / duplicate-admission this guard is for); an older one
        // is legacy housekeeping and is logged instead.
        if (otherOpenStay != null)
        {
            var openedRecently = await _context.Set<Admission>()
                .AnyAsync(a => a.PatientId == medicalRecord.PatientId && a.MedicalRecordId != dto.MedicalRecordId && !a.IsDeleted
                               && (a.Status == AdmissionStatus.InTreatment || a.Status == AdmissionStatus.PendingDischarge)
                               && a.AdmissionDate >= DateTime.Now.AddDays(-1));
            if (openedRecently)
                throw new InvalidOperationException(
                    $"Bệnh nhân vừa được nhập viện ở hồ sơ {otherOpenStay} (trong 24 giờ qua) — phải ra viện/chuyển viện lượt đó trước.");
        }

        // QA0915: target bed must exist and be free (same rule as TransferBedAsync).
        if (dto.BedId.HasValue)
            await EnsureBedAvailableAsync(dto.BedId.Value, null, dto.DepartmentId);

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
            AdmissionDate = HIS.Core.Common.VnTime.NowVn, // business timestamp = VN local
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
        if (tx != null) await tx.CommitAsync();

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
        // QA-R6: a double "Tiếp nhận chuyển khoa" read the source stay as active twice and opened two new
        // stays. Serialize on the source stay (lock taken BEFORE reading it) and on the target bed.
        await using var tx = await SqlAppLock.BeginAsync(_context);
        await SqlAppLock.AcquireAsync(_context, $"HIS.Inpatient.Admission.{dto.SourceAdmissionId:N}",
            "Lượt nội trú này đang được chuyển khoa ở máy khác, vui lòng thử lại.");
        if (dto.TargetBedId.HasValue && _context.Database.CurrentTransaction != null)
            await LockBedAsync(dto.TargetBedId.Value);

        var sourceAdmission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord)
            .FirstOrDefaultAsync(a => a.Id == dto.SourceAdmissionId);
        if (sourceAdmission == null)
            throw new KeyNotFoundException("Source admission not found");

        // QA0915: same guards as TransferDepartmentAsync — a finished stay cannot be moved, and the
        // target bed must be free.
        if (!AdmissionStatus.IsActive(sourceAdmission.Status))
            throw new InvalidOperationException(
                $"Lượt nội trú đã kết thúc ({AdmissionStatus.Label(sourceAdmission.Status)}), không tiếp nhận chuyển khoa được.");
        if (dto.TargetBedId.HasValue)
            await EnsureBedAvailableAsync(dto.TargetBedId.Value, dto.SourceAdmissionId, dto.TargetDepartmentId);

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
            AdmissionDate = HIS.Core.Common.VnTime.NowVn, // business timestamp = VN local
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
        if (tx != null) await tx.CommitAsync();

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

    // QA-R8: combined treatment is persisted in CombinedTreatments (mig 213); round 7 refused it for lack of a table.
    public async Task<CombinedTreatmentDto> CreateCombinedTreatmentAsync(CreateCombinedTreatmentDto dto, Guid userId)
    {
        if (dto == null || dto.AdmissionId == Guid.Empty || dto.ConsultingDepartmentId == Guid.Empty)
            throw new ArgumentException("Thiếu lượt nội trú hoặc khoa điều trị kết hợp.");

        var admission = await _context.Admissions.AsNoTracking()
            .Where(a => a.Id == dto.AdmissionId)
            .Select(a => new { a.Id, a.Status, a.DepartmentId })
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("Không tìm thấy lượt nội trú.");
        if (!AdmissionStatus.IsActive(admission.Status))
            throw new InvalidOperationException(
                $"Lượt nội trú không còn đang điều trị ({AdmissionStatus.Label(admission.Status)}), không gửi điều trị kết hợp được.");

        var department = await _context.Departments.AsNoTracking()
            .Where(d => d.Id == dto.ConsultingDepartmentId)
            .Select(d => new { d.Id, d.DepartmentName })
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("Không tìm thấy khoa điều trị kết hợp.");
        if (department.Id == admission.DepartmentId)
            throw new InvalidOperationException("Khoa điều trị kết hợp phải khác khoa đang điều trị của bệnh nhân.");

        await using var tx = await SqlAppLock.BeginAsync(_context);
        await SqlAppLock.AcquireAsync(_context, $"HIS.CombinedTreatment.{admission.Id}",
            "Đang có yêu cầu điều trị kết hợp khác cho lượt nội trú này, vui lòng thử lại.");

        var duplicate = await _context.CombinedTreatments.AnyAsync(c =>
            c.AdmissionId == admission.Id && c.ConsultingDepartmentId == department.Id && (c.Status == 0 || c.Status == 1));
        if (duplicate)
            throw new InvalidOperationException("Đã có yêu cầu điều trị kết hợp đang mở với khoa này.");

        var entity = new CombinedTreatment
        {
            Id = Guid.NewGuid(),
            AdmissionId = admission.Id,
            ConsultingDepartmentId = department.Id,
            RequestDate = HIS.Core.Common.VnTime.NowVn,
            RequestReason = string.IsNullOrWhiteSpace(dto.RequestReason) ? null : dto.RequestReason.Trim(),
            ConsultingDiagnosis = string.IsNullOrWhiteSpace(dto.ConsultingDiagnosis) ? null : dto.ConsultingDiagnosis.Trim(),
            Status = 0,
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString(),
        };
        _context.CombinedTreatments.Add(entity);
        await _context.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();

        return ToCombinedTreatmentDto(entity, department.DepartmentName, null);
    }

    public async Task<List<CombinedTreatmentDto>> GetCombinedTreatmentsAsync(Guid admissionId)
    {
        var rows = await _context.CombinedTreatments.AsNoTracking()
            .Where(c => c.AdmissionId == admissionId)
            .OrderByDescending(c => c.RequestDate)
            .ToListAsync();
        if (rows.Count == 0) return new List<CombinedTreatmentDto>();

        var deptIds = rows.Select(r => r.ConsultingDepartmentId).Distinct().ToList();
        var deptNames = await _context.Departments.AsNoTracking()
            .Where(d => deptIds.Contains(d.Id)).ToDictionaryAsync(d => d.Id, d => d.DepartmentName);
        var docIds = rows.Where(r => r.ConsultingDoctorId.HasValue).Select(r => r.ConsultingDoctorId!.Value).Distinct().ToList();
        var docNames = docIds.Count == 0 ? new Dictionary<Guid, string>()
            : await _context.Users.AsNoTracking().Where(u => docIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName);

        return rows.Select(r => ToCombinedTreatmentDto(r,
            deptNames.TryGetValue(r.ConsultingDepartmentId, out var dn) ? dn : "",
            r.ConsultingDoctorId.HasValue && docNames.TryGetValue(r.ConsultingDoctorId.Value, out var doc) ? doc : null)).ToList();
    }

    public async Task<CombinedTreatmentDto> CompleteCombinedTreatmentAsync(Guid id, string treatmentResult, Guid userId)
    {
        if (string.IsNullOrWhiteSpace(treatmentResult))
            throw new ArgumentException("Phải nhập kết quả điều trị kết hợp.");
        var result = treatmentResult.Trim();
        var now = HIS.Core.Common.VnTime.NowVn;
        Guid? doctorId = userId == Guid.Empty ? null : userId;

        // Atomic 0/1 → 2 transition: a second (or concurrent) completion updates nothing.
        var updated = await _context.CombinedTreatments
            .Where(c => c.Id == id && (c.Status == 0 || c.Status == 1))
            .ExecuteUpdateAsync(s => s
                .SetProperty(c => c.Status, 2)
                .SetProperty(c => c.TreatmentResult, result)
                .SetProperty(c => c.CompletedDate, now)
                .SetProperty(c => c.ConsultingDoctorId, c => c.ConsultingDoctorId ?? doctorId)
                .SetProperty(c => c.UpdatedAt, DateTime.Now)
                .SetProperty(c => c.UpdatedBy, userId.ToString()));

        var entity = await _context.CombinedTreatments.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id)
            ?? throw new KeyNotFoundException("Không tìm thấy yêu cầu điều trị kết hợp.");
        if (updated == 0)
            throw new InvalidOperationException(entity.Status == 2
                ? "Điều trị kết hợp đã hoàn thành trước đó."
                : "Yêu cầu điều trị kết hợp đã hủy, không hoàn thành được.");

        var deptName = await _context.Departments.AsNoTracking()
            .Where(d => d.Id == entity.ConsultingDepartmentId).Select(d => d.DepartmentName).FirstOrDefaultAsync();
        var doctorName = entity.ConsultingDoctorId.HasValue
            ? await _context.Users.AsNoTracking().Where(u => u.Id == entity.ConsultingDoctorId.Value)
                .Select(u => u.FullName).FirstOrDefaultAsync()
            : null;
        return ToCombinedTreatmentDto(entity, deptName ?? "", doctorName);
    }

    private static CombinedTreatmentDto ToCombinedTreatmentDto(CombinedTreatment c, string departmentName, string? doctorName) => new()
    {
        Id = c.Id,
        AdmissionId = c.AdmissionId,
        ConsultingDepartmentId = c.ConsultingDepartmentId,
        ConsultingDepartmentName = departmentName,
        RequestDate = c.RequestDate,
        RequestReason = c.RequestReason,
        ConsultingDiagnosis = c.ConsultingDiagnosis,
        ConsultingDoctorId = c.ConsultingDoctorId ?? Guid.Empty,
        ConsultingDoctorName = doctorName,
        Status = c.Status,
        CompletedDate = c.CompletedDate,
        TreatmentResult = c.TreatmentResult,
    };

    public async Task<AdmissionDto> TransferDepartmentAsync(DepartmentTransferDto dto, Guid userId)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .FirstOrDefaultAsync(a => a.Id == dto.AdmissionId);
        if (admission == null)
            throw new KeyNotFoundException("Admission not found");

        // T3/#218 (2026-09-04): lượt nội trú đã kết thúc thì không chuyển khoa được nữa. Trước đây
        // đường này không đọc `Status` lần nào, nên một bệnh nhân ĐÃ XUẤT VIỆN (hoặc đã tử vong,
        // đã chuyển viện, đã bỏ về) vẫn chuyển được sang khoa khác và được xếp giường ở đó.
        if (!AdmissionStatus.IsActive(admission.Status))
            throw new InvalidOperationException(
                $"Lượt nội trú đã kết thúc ({AdmissionStatus.Label(admission.Status)}), không chuyển khoa được.");

        // QA0915: "transfer" to the department the patient is already in released the bed and wrote a
        // bogus A→A handover row. Moving inside a department goes through transfer-bed.
        if (dto.TargetDepartmentId == admission.DepartmentId)
            throw new InvalidOperationException(
                "Bệnh nhân đang ở chính khoa này — dùng chức năng Chuyển giường để đổi phòng/giường trong khoa.");

        // QA0915: the target room must belong to the target department (a room of another department
        // was accepted, leaving the admission in dept B but room of dept A).
        var targetRoom = await _context.Rooms.AsNoTracking().FirstOrDefaultAsync(r => r.Id == dto.TargetRoomId)
            ?? throw new KeyNotFoundException("Không tìm thấy phòng đích.");
        if (targetRoom.DepartmentId != dto.TargetDepartmentId)
            throw new InvalidOperationException("Phòng đích không thuộc khoa chuyển đến.");

        // T3/#218: giường đích phải còn trống. Đây là cùng một luật mà `TransferBedAsync` đã thi
        // hành (và câu báo lỗi lấy nguyên của nó cho nhất quán) — chỉ riêng đường chuyển khoa là bỏ
        // trống, nên hai bệnh nhân nằm chung một giường.
        // QA-R11: the check below ran without the per-bed lock that AssignBed/TransferBed take, so a transfer-department
        // racing an assign-bed to the same free bed could both pass and double-book it. Same lock + transaction.
        await using var bedTx = dto.TargetBedId.HasValue ? await _context.Database.BeginTransactionAsync() : null;
        if (dto.TargetBedId.HasValue)
        {
            await LockBedAsync(dto.TargetBedId.Value);
            var targetBed = await _context.Beds.FirstOrDefaultAsync(b => b.Id == dto.TargetBedId.Value);
            if (targetBed == null)
                throw new KeyNotFoundException("Không tìm thấy giường đích.");
            if (targetBed.RoomId != dto.TargetRoomId)
                throw new InvalidOperationException("Giường đích không thuộc phòng đích.");
            if (!targetBed.IsActive || targetBed.Status == 2) // QA-R4: out-of-service bed
                throw new InvalidOperationException($"Giường {targetBed.BedName} đang ngừng sử dụng / bảo trì, không phân được.");

            var bedOccupied = await _context.Set<BedAssignment>()
                .AnyAsync(ba => ba.BedId == dto.TargetBedId.Value
                                && ba.Status == 0
                                && ba.AdmissionId != dto.AdmissionId);
            if (bedOccupied)
                throw new InvalidOperationException(
                    $"Giường {targetBed.BedName} đã có bệnh nhân, vui lòng chọn giường khác");
        }

        // Ghi lại bàn giao TRƯỚC khi đổi khoa — cần khoa/phòng/giường cũ để lưu vào lịch sử.
        var transferLog = new DepartmentTransfer
        {
            Id = Guid.NewGuid(),
            AdmissionId = admission.Id,
            FromDepartmentId = admission.DepartmentId,
            FromRoomId = admission.RoomId,
            FromBedId = admission.BedId,
            ToDepartmentId = dto.TargetDepartmentId,
            ToRoomId = dto.TargetRoomId,
            ToBedId = dto.TargetBedId,
            TransferredAt = DateTime.Now,
            ReceivingDoctorId = dto.ReceivingDoctorId == Guid.Empty ? null : dto.ReceivingDoctorId,
            TransferReason = dto.TransferReason,
            DiagnosisOnTransfer = dto.DiagnosisOnTransfer,
            TreatmentSummary = dto.TreatmentSummary,
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString(),
        };
        _context.DepartmentTransfers.Add(transferLog);

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
        if (bedTx != null) await bedTx.CommitAsync();

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

    /// <summary>
    /// Lịch sử chuyển khoa của một lượt nội trú, mới nhất trước (#218 / T3).
    /// Cửa đọc cho phần bàn giao lâm sàng mà trước đây bị bỏ rơi không lưu ở đâu cả.
    /// </summary>
    public async Task<List<DepartmentTransferHistoryDto>> GetDepartmentTransfersAsync(Guid admissionId)
    {
        var rows = await _context.DepartmentTransfers
            .AsNoTracking()
            .Where(t => t.AdmissionId == admissionId && !t.IsDeleted)
            .OrderByDescending(t => t.TransferredAt)
            .ToListAsync();
        if (rows.Count == 0) return new List<DepartmentTransferHistoryDto>();

        // Gom tên trong 3 truy vấn thay vì tra từng dòng (tránh N+1 như đợt #195 đã dọn).
        var deptIds = rows.Select(r => r.FromDepartmentId).Concat(rows.Select(r => r.ToDepartmentId)).Distinct().ToList();
        var bedIds = rows.Select(r => r.FromBedId).Concat(rows.Select(r => r.ToBedId))
            .Where(b => b.HasValue).Select(b => b!.Value).Distinct().ToList();
        var docIds = rows.Where(r => r.ReceivingDoctorId.HasValue).Select(r => r.ReceivingDoctorId!.Value).Distinct().ToList();

        var deptNames = await _context.Departments.AsNoTracking()
            .Where(d => deptIds.Contains(d.Id)).ToDictionaryAsync(d => d.Id, d => d.DepartmentName);
        var bedNames = bedIds.Count == 0 ? new Dictionary<Guid, string>()
            : await _context.Beds.AsNoTracking().Where(b => bedIds.Contains(b.Id))
                .ToDictionaryAsync(b => b.Id, b => b.BedName);
        var docNames = docIds.Count == 0 ? new Dictionary<Guid, string>()
            : await _context.Users.AsNoTracking().Where(u => docIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.FullName);

        string? BedName(Guid? id) => id.HasValue && bedNames.TryGetValue(id.Value, out var n) ? n : null;

        return rows.Select(t => new DepartmentTransferHistoryDto
        {
            Id = t.Id,
            AdmissionId = t.AdmissionId,
            FromDepartmentId = t.FromDepartmentId,
            FromDepartmentName = deptNames.TryGetValue(t.FromDepartmentId, out var fd) ? fd : "",
            ToDepartmentId = t.ToDepartmentId,
            ToDepartmentName = deptNames.TryGetValue(t.ToDepartmentId, out var td) ? td : "",
            FromBedName = BedName(t.FromBedId),
            ToBedName = BedName(t.ToBedId),
            TransferredAt = t.TransferredAt,
            ReceivingDoctorId = t.ReceivingDoctorId,
            ReceivingDoctorName = t.ReceivingDoctorId.HasValue && docNames.TryGetValue(t.ReceivingDoctorId.Value, out var dn) ? dn : null,
            TransferReason = t.TransferReason,
            DiagnosisOnTransfer = t.DiagnosisOnTransfer,
            TreatmentSummary = t.TreatmentSummary,
        }).ToList();
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

    // QA-R11: the specialty-consult endpoints were stubs (request echoed a random id, list always empty,
    // complete wrote nothing). They now persist in InpatientConsultations with ConsultationType = 5 and the
    // invited department in SpecialtyDepartmentId (Chairman = requesting doctor, Secretary = consulting doctor
    // once answered). Status: 0 chờ khám · 1 đã khám · 2 hủy (SpecialtyConsultRequestDto vocabulary).
    private const int SpecialtyConsultType = 5;

    public async Task<SpecialtyConsultRequestDto> RequestSpecialtyConsultAsync(CreateSpecialtyConsultDto dto, Guid userId)
    {
        var admission = await _context.Admissions.AsNoTracking()
            .Where(a => a.Id == dto.AdmissionId && !a.IsDeleted)
            .Select(a => new { a.Id, a.Status, a.DepartmentId })
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("Không tìm thấy lượt nội trú.");
        if (!AdmissionStatus.IsActive(admission.Status))
            throw new InvalidOperationException(
                $"Lượt nội trú đã kết thúc ({AdmissionStatus.Label(admission.Status)}), không gửi khám chuyên khoa được.");
        if (dto.SpecialtyDepartmentId == Guid.Empty
            || !await _context.Departments.AnyAsync(d => d.Id == dto.SpecialtyDepartmentId && !d.IsDeleted))
            throw new ArgumentException("Chưa chọn khoa chuyên khoa hợp lệ.", nameof(dto.SpecialtyDepartmentId));
        if (dto.SpecialtyDepartmentId == admission.DepartmentId)
            throw new InvalidOperationException("Khoa chuyên khoa trùng khoa đang điều trị — dùng Hội chẩn khoa.");
        await EmrLockGuard.EnsureEditableByAdmissionAsync(_context, dto.AdmissionId); // TT46
        var now = DateTime.Now;
        var entity = new InpatientConsultation
        {
            Id = Guid.NewGuid(),
            AdmissionId = dto.AdmissionId,
            ConsultationType = SpecialtyConsultType,
            SpecialtyDepartmentId = dto.SpecialtyDepartmentId,
            ConsultationDate = now,
            ConsultationTime = now.TimeOfDay,
            ChairmanId = userId,
            SecretaryId = Guid.Empty,
            Reason = dto.RequestReason,
            ClinicalFindings = dto.ClinicalInfo,
            Status = 0,
            CreatedAt = now,
            CreatedBy = userId.ToString(),
        };
        _context.InpatientConsultations.Add(entity);
        await _context.SaveChangesAsync();
        return (await LoadSpecialtyConsultsAsync(q => q.Where(c => c.Id == entity.Id))).First();
    }

    public Task<List<SpecialtyConsultRequestDto>> GetSpecialtyConsultRequestsAsync(Guid admissionId)
        => LoadSpecialtyConsultsAsync(q => q.Where(c => c.AdmissionId == admissionId));

    public async Task<SpecialtyConsultRequestDto> CompleteSpecialtyConsultAsync(Guid id, string result, string recommendations, Guid doctorId)
    {
        var entity = await _context.InpatientConsultations
            .FirstOrDefaultAsync(c => c.Id == id && c.ConsultationType == SpecialtyConsultType && !c.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy yêu cầu khám chuyên khoa.");
        if (entity.Status != 0)
            throw new InvalidOperationException("Yêu cầu khám chuyên khoa đã được trả kết quả hoặc đã hủy.");
        if (string.IsNullOrWhiteSpace(result))
            throw new ArgumentException("Chưa nhập kết quả khám chuyên khoa.", nameof(result));
        await EmrLockGuard.EnsureEditableByAdmissionAsync(_context, entity.AdmissionId); // TT46
        entity.Status = 1;
        entity.SecretaryId = doctorId;
        entity.Conclusion = result.Trim();
        entity.Treatment = recommendations;
        entity.UpdatedAt = DateTime.Now;
        entity.UpdatedBy = doctorId.ToString();
        await _context.SaveChangesAsync();
        return (await LoadSpecialtyConsultsAsync(q => q.Where(c => c.Id == id))).First();
    }

    private async Task<List<SpecialtyConsultRequestDto>> LoadSpecialtyConsultsAsync(
        Func<IQueryable<InpatientConsultation>, IQueryable<InpatientConsultation>> filter)
    {
        var rows = await filter(_context.InpatientConsultations.AsNoTracking()
                .Where(c => c.ConsultationType == SpecialtyConsultType && !c.IsDeleted))
            .OrderByDescending(c => c.ConsultationDate)
            .Take(200)
            .ToListAsync();
        if (rows.Count == 0) return new List<SpecialtyConsultRequestDto>();

        var admissionIds = rows.Select(r => r.AdmissionId).Distinct().ToList();
        var patientNames = await _context.Admissions.AsNoTracking()
            .Where(a => admissionIds.Contains(a.Id))
            .Select(a => new { a.Id, a.Patient.FullName })
            .ToDictionaryAsync(a => a.Id, a => a.FullName);
        var deptIds = rows.Where(r => r.SpecialtyDepartmentId.HasValue).Select(r => r.SpecialtyDepartmentId!.Value).Distinct().ToList();
        var deptNames = await _context.Departments.AsNoTracking()
            .Where(d => deptIds.Contains(d.Id)).ToDictionaryAsync(d => d.Id, d => d.DepartmentName);
        var userIds = rows.Select(r => r.ChairmanId).Concat(rows.Select(r => r.SecretaryId))
            .Where(u => u != Guid.Empty).Distinct().ToList();
        var userNames = await _context.Users.AsNoTracking()
            .Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName);

        return rows.Select(c => new SpecialtyConsultRequestDto
        {
            Id = c.Id,
            AdmissionId = c.AdmissionId,
            PatientName = patientNames.GetValueOrDefault(c.AdmissionId) ?? string.Empty,
            SpecialtyDepartmentId = c.SpecialtyDepartmentId ?? Guid.Empty,
            SpecialtyDepartmentName = c.SpecialtyDepartmentId.HasValue ? deptNames.GetValueOrDefault(c.SpecialtyDepartmentId.Value) ?? string.Empty : string.Empty,
            RequestingDoctorId = c.ChairmanId,
            RequestingDoctorName = userNames.GetValueOrDefault(c.ChairmanId) ?? string.Empty,
            RequestDate = c.ConsultationDate,
            RequestReason = c.Reason,
            ClinicalInfo = c.ClinicalFindings,
            Status = c.Status,
            ConsultingDoctorId = c.SecretaryId == Guid.Empty ? null : c.SecretaryId,
            ConsultingDoctorName = c.SecretaryId == Guid.Empty ? null : userNames.GetValueOrDefault(c.SecretaryId),
            ConsultDate = c.Status == 1 ? c.UpdatedAt : null,
            ConsultResult = c.Conclusion,
            Recommendations = c.Treatment,
        }).ToList();
    }

    // QA-R11: both "chuyển mổ" endpoints answered true without writing anything (the patient never reached the
    // surgery list). They now create a real SurgeryRequest on the stay's medical record — status 0 "Chờ duyệt",
    // priority 1 mổ phiên / 3 cấp cứu — which the surgery screen then approves and schedules as usual.
    public Task<bool> TransferToScheduledSurgeryAsync(SurgeryTransferDto dto, Guid userId)
        => CreateSurgeryRequestFromWardAsync(dto, userId, emergency: false);

    public Task<bool> TransferToEmergencySurgeryAsync(SurgeryTransferDto dto, Guid userId)
        => CreateSurgeryRequestFromWardAsync(dto, userId, emergency: true);

    private async Task<bool> CreateSurgeryRequestFromWardAsync(SurgeryTransferDto dto, Guid userId, bool emergency)
    {
        var admission = await _context.Admissions
            .Include(a => a.MedicalRecord)
            .FirstOrDefaultAsync(a => a.Id == dto.AdmissionId && !a.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy lượt nội trú.");
        if (!AdmissionStatus.IsActive(admission.Status))
            throw new InvalidOperationException(
                $"Lượt nội trú đã kết thúc ({AdmissionStatus.Label(admission.Status)}), không chuyển mổ được.");
        if (!emergency && dto.ScheduledDate != default && dto.ScheduledDate.Date < HIS.Core.Common.VnTime.NowVn.Date)
            throw new InvalidOperationException("Ngày mổ phiên dự kiến đã qua.");
        await EmrLockGuard.EnsureEditableByRecordAsync(_context, admission.MedicalRecordId); // TT46

        var now = DateTime.Now;
        var notes = new List<string>();
        if (dto.ScheduledDate != default)
            notes.Add($"Ngày mổ dự kiến: {dto.ScheduledDate:dd/MM/yyyy}{(dto.ScheduledTime.HasValue ? " " + dto.ScheduledTime.Value.ToString(@"hh\:mm") : "")}");
        if (!string.IsNullOrWhiteSpace(dto.SpecialNotes)) notes.Add(dto.SpecialNotes.Trim());
        _context.SurgeryRequests.Add(new SurgeryRequest
        {
            Id = Guid.NewGuid(),
            RequestCode = $"PT{now:yyyyMMddHHmmssfff}{Random.Shared.Next(100):D2}",
            PatientId = admission.PatientId,
            MedicalRecordId = admission.MedicalRecordId,
            RequestDate = now,
            SurgeryType = "Phẫu thuật",
            RequestingDoctorId = userId,
            Priority = emergency ? 3 : 1,
            Status = 0,
            PreOpDiagnosis = dto.PreopDiagnosis ?? admission.MedicalRecord?.MainDiagnosis ?? admission.DiagnosisOnAdmission,
            PreOpIcdCode = admission.MedicalRecord?.MainIcdCode,
            PlannedProcedure = dto.PlannedProcedure,
            EstimatedDuration = 60,
            Notes = notes.Count > 0 ? string.Join("\n", notes) : null,
            CreatedAt = now,
            CreatedBy = userId.ToString(),
        });
        await _context.SaveChangesAsync();
        return true;
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

    /// <summary>
    /// QA-R11: answered true without writing — the record stayed BHYT and every line kept its fund share.
    /// Now: record → viện phí (PatientType 2) and every UNPAID, non-cancelled service / medicine line of the record is
    /// re-priced at the hospital price with no fund share. Paid lines are left alone (refund/adjust goes through the
    /// cashier, same rule as order cancel).
    /// </summary>
    public async Task<bool> ConvertToFeePayingAsync(Guid admissionId, Guid userId)
    {
        var admission = await _context.Admissions.FirstOrDefaultAsync(a => a.Id == admissionId && !a.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy lượt nội trú.");
        if (!AdmissionStatus.IsActive(admission.Status))
            throw new InvalidOperationException(
                $"Lượt nội trú đã kết thúc ({AdmissionStatus.Label(admission.Status)}), không đổi đối tượng được.");
        var record = await _context.MedicalRecords.FirstOrDefaultAsync(m => m.Id == admission.MedicalRecordId)
            ?? throw new KeyNotFoundException("Không tìm thấy hồ sơ bệnh án.");
        if (record.PatientType == PatientType.Fee)
            throw new InvalidOperationException("Hồ sơ đã là đối tượng viện phí.");
        await EmrLockGuard.EnsureEditableByRecordAsync(_context, record.Id); // TT46

        var requests = await _context.ServiceRequests.Include(r => r.Details)
            .Where(r => r.MedicalRecordId == record.Id && !r.IsDeleted && r.Status != 4 && !r.IsPaid)
            .ToListAsync();
        // Paid = allocated by an active payment receipt (same rule as BhytVisitPricing / InvoiceLedger).
        var allocated = await _context.ReceiptDetails.AsNoTracking()
            .Where(rd => !rd.IsDeleted && rd.Receipt.Status == 1 && !rd.Receipt.IsDeleted
                         && rd.Receipt.ReceiptType == 2 && rd.Receipt.MedicalRecordId == record.Id)
            .Select(rd => new { rd.ServiceRequestDetailId, rd.PrescriptionDetailId })
            .ToListAsync();
        var paidSrd = allocated.Where(a => a.ServiceRequestDetailId != null).Select(a => a.ServiceRequestDetailId!.Value).ToHashSet();
        var paidPd = allocated.Where(a => a.PrescriptionDetailId != null).Select(a => a.PrescriptionDetailId!.Value).ToHashSet();
        foreach (var sr in requests)
        {
            foreach (var d in sr.Details.Where(d => !d.IsDeleted && d.Status != 3 && !paidSrd.Contains(d.Id)))
            {
                d.PatientType = PatientType.Fee;
                d.Amount = d.UnitPrice * d.Quantity;
                d.InsuranceAmount = 0;
                d.PatientAmount = d.Amount;
                d.InsurancePaymentRate = 0;
            }
            var live = sr.Details.Where(d => !d.IsDeleted && d.Status != 3).ToList();
            if (live.Count > 0)
            {
                sr.InsuranceAmount = live.Sum(d => d.InsuranceAmount);
                sr.PatientAmount = live.Sum(d => d.PatientAmount);
            }
            else
            {
                sr.InsuranceAmount = 0;
                sr.PatientAmount = sr.TotalAmount;
            }
        }

        var prescriptions = await _context.Prescriptions.Include(p => p.Details)
            .Where(p => p.MedicalRecordId == record.Id && !p.IsDeleted && !p.IsPaid
                        && InvoiceLedger.BillableRxStatuses.Contains(p.Status))
            .ToListAsync();
        foreach (var rx in prescriptions)
        {
            foreach (var d in rx.Details.Where(d => !d.IsDeleted && !paidPd.Contains(d.Id)))
            {
                d.PatientType = PatientType.Fee;
                d.Amount = d.UnitPrice * d.Quantity;
                d.InsuranceAmount = 0;
                d.PatientAmount = d.Amount;
                d.InsurancePaymentRate = 0;
            }
            var live = rx.Details.Where(d => !d.IsDeleted).ToList();
            rx.InsuranceAmount = live.Sum(d => d.InsuranceAmount);
            rx.PatientAmount = live.Sum(d => d.PatientAmount);
        }

        record.PatientType = PatientType.Fee;
        record.UpdatedAt = DateTime.Now;
        record.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync(); // one SaveChanges = one transaction
        return true;
    }

    #endregion
}
