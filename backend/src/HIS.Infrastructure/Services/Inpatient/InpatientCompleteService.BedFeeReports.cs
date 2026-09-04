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

// wave-8a (2026-07-17): tach khoi InpatientCompleteService.PatientMgmt.cs (PURE VERBATIM, khong doi logic).
public partial class InpatientCompleteService {
    #region 3.2 Patient Management — Bed Assignment / Lab & Surgery Print / Fee Overview / Transfer Warnings
    public async Task<BedAssignmentDto> AssignBedAsync(CreateBedAssignmentDto dto, Guid userId)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .FirstOrDefaultAsync(a => a.Id == dto.AdmissionId);
        if (admission == null)
            throw new KeyNotFoundException("Admission not found");

        var bed = await _context.Beds
            .Include(b => b.Room)
            .ThenInclude(r => r.Department)
            .FirstOrDefaultAsync(b => b.Id == dto.BedId);
        if (bed == null)
            throw new KeyNotFoundException("Bed not found");

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
            throw new KeyNotFoundException("New bed not found");

        // Check destination bed availability
        var bedOccupied = await _context.Set<BedAssignment>()
            .AnyAsync(ba => ba.BedId == dto.NewBedId && ba.Status == 0);
        if (bedOccupied)
            throw new InvalidOperationException($"Giường {newBed.BedName} đã có bệnh nhân, vui lòng chọn giường khác");

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
