using Microsoft.EntityFrameworkCore;
using HIS.Application.Workflows;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Workflows;

/// <summary>
/// Luồng Điều trị Nội trú (IPD Flow)
///
/// FLOW: Khám bệnh/Cấp cứu → Nội trú → Chỉ định → XN/CĐHA/PTTT → Kho Dược → Thu ngân → BHYT → HSBA
///
/// [Từ Khám bệnh/Cấp cứu]
///      │
///      ▼
/// ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
/// │ Chỉ định   │────▶│ 3. NỘI TRÚ  │────▶│ Tiếp nhận  │
/// │ nhập viện   │     │             │     │ vào khoa   │
/// └─────────────┘     └─────────────┘     └──────┬──────┘
///                                                │
///      ┌─────────────────────────────────────────┘
///      │
///      ▼
/// ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
/// │ Phân giường │────▶│ Tờ điều trị │────▶│ Y lệnh     │
/// │ buồng bệnh  │     │ hàng ngày   │     │ hàng ngày  │
/// └─────────────┘     └─────────────┘     └──────┬──────┘
///                                                │
///      ┌────────────────┬────────────────┬───────┴───────┬────────────────┐
///      │                │                │               │                │
///      ▼                ▼                ▼               ▼                ▼
/// ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
/// │ Chỉ định   │ │ Kê đơn     │ │ Chỉ định   │ │ Chỉ định   │ │ Chăm sóc   │
/// │ CLS        │ │ thuốc/VT   │ │ PTTT       │ │ dinh dưỡng │ │ điều dưỡng │
/// └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └─────────────┘ └─────────────┘
///        │              │               │
///        │              │               ▼
///        │              │        ┌─────────────┐
///        │              │        │ 6. PTTT    │
///        │              │        │ (Phẫu thuật)│
///        │              │        └──────┬──────┘
///        │              │               │
///        ▼              ▼               │
/// ┌─────────────┐ ┌─────────────┐       │
/// │ 7. XN      │ │ 5. KHO DƯỢC │       │
/// │ 8. CĐHA    │ │ (Phiếu lĩnh)│       │
/// └──────┬──────┘ └──────┬──────┘       │
///        │              │               │
///        └──────┬───────┴───────────────┘
///               │
///               ▼
///        ┌─────────────┐
///        │ Theo dõi    │◀──────── [Lặp hàng ngày cho đến khi ra viện]
///        │ diễn biến   │
///        └──────┬──────┘
///               │
///               ▼
///        ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
///        │ Kết thúc    │────▶│ Ra viện/    │────▶│ 10. THU    │
///        │ điều trị    │     │ Chuyển viện │     │     NGÂN   │
///        └─────────────┘     └─────────────┘     └──────┬──────┘
///                                                       │
///                                                       ▼
///                                                ┌─────────────┐
///                                                │ 12. BHYT   │
///                                                │ 16. HSBA   │
///                                                └─────────────┘
/// </summary>
public class IPDWorkflowService : IIPDWorkflowService
{
    private readonly HISDbContext _context;

    public IPDWorkflowService(HISDbContext context)
    {
        _context = context;
    }

    #region Step 1: Nhập viện (Module 3)

    /// <summary>
    /// Nhập viện bệnh nhân
    /// Điều kiện: Phải có chỉ định nhập viện từ bác sĩ và chẩn đoán vào viện
    /// </summary>
    public async Task<AdmissionResult> AdmitPatientAsync(Guid visitId, AdmissionRequestDto request)
    {
        var medicalRecord = await _context.MedicalRecords
            .Include(m => m.Patient)
            .FirstOrDefaultAsync(m => m.Id == visitId);

        if (medicalRecord == null)
        {
            return new AdmissionResult(false, null, "Không tìm thấy hồ sơ khám");
        }

        // Kiểm tra giường trống
        var availableBed = await _context.Beds
            .Include(b => b.Room)
            .Where(b => b.Room.DepartmentId == request.DepartmentId
                     && b.Status == 0 // Trống
                     && b.IsActive)
            .FirstOrDefaultAsync();

        if (availableBed == null)
        {
            return new AdmissionResult(false, null, "Không còn giường trống trong khoa");
        }

        // Tạo mã vào viện
        var inpatientCode = $"VV{DateTime.Now:yyyyMMddHHmmss}";

        // Cập nhật hồ sơ bệnh án
        medicalRecord.InpatientCode = inpatientCode;
        medicalRecord.TreatmentType = 2; // Nội trú
        medicalRecord.DepartmentId = request.DepartmentId;
        medicalRecord.InitialDiagnosis = request.AdmissionDiagnosis;
        medicalRecord.Status = 1; // Đang điều trị nội trú

        // Tạo bản ghi nhập viện
        var admission = new Admission
        {
            Id = Guid.NewGuid(),
            AdmissionCode = inpatientCode,
            MedicalRecordId = visitId,
            PatientId = medicalRecord.PatientId,
            DepartmentId = request.DepartmentId,
            AdmissionDate = DateTime.UtcNow,
            AdmissionDiagnosis = request.AdmissionDiagnosis,
            AdmissionType = 1, // Từ khám bệnh
            Status = 1, // Đang điều trị
            CreatedAt = DateTime.UtcNow
        };
        await _context.Admissions.AddAsync(admission);

        // Phân giường tự động
        availableBed.Status = 1; // Đang sử dụng
        var bedAssignment = new BedAssignment
        {
            Id = Guid.NewGuid(),
            AdmissionId = admission.Id,
            BedId = availableBed.Id,
            AssignedDate = DateTime.UtcNow,
            Status = 1, // Đang nằm
            CreatedAt = DateTime.UtcNow
        };
        await _context.BedAssignments.AddAsync(bedAssignment);

        await _context.SaveChangesAsync();

        return new AdmissionResult(true, admission.Id, $"Nhập viện thành công - Giường: {availableBed.BedName}");
    }

    /// <summary>
    /// Phân giường/Chuyển giường
    /// </summary>
    public async Task<BedAssignmentResult> AssignBedAsync(Guid admissionId, Guid bedId)
    {
        var admission = await _context.Admissions.FindAsync(admissionId);
        if (admission == null)
        {
            return new BedAssignmentResult(false, null, null, "Không tìm thấy bệnh nhân nội trú");
        }

        var bed = await _context.Beds
            .Include(b => b.Room)
            .FirstOrDefaultAsync(b => b.Id == bedId);

        if (bed == null || bed.Status != 0)
        {
            return new BedAssignmentResult(false, null, null, "Giường không khả dụng");
        }

        // Kết thúc giường cũ (nếu có)
        var currentAssignment = await _context.BedAssignments
            .Include(ba => ba.Bed)
            .Where(ba => ba.AdmissionId == admissionId && ba.Status == 1)
            .FirstOrDefaultAsync();

        if (currentAssignment != null)
        {
            currentAssignment.Status = 0; // Kết thúc
            currentAssignment.EndDate = DateTime.UtcNow;
            currentAssignment.Bed.Status = 0; // Giường trống
        }

        // Phân giường mới
        bed.Status = 1;
        var newAssignment = new BedAssignment
        {
            Id = Guid.NewGuid(),
            AdmissionId = admissionId,
            BedId = bedId,
            AssignedDate = DateTime.UtcNow,
            Status = 1,
            CreatedAt = DateTime.UtcNow
        };
        await _context.BedAssignments.AddAsync(newAssignment);

        await _context.SaveChangesAsync();

        return new BedAssignmentResult(true, bed.BedName, bed.Room?.RoomName, "Đã phân giường");
    }

    #endregion

    #region Step 2: Điều trị hàng ngày

    /// <summary>
    /// Tạo tờ điều trị hàng ngày
    /// </summary>
    public async Task<TreatmentSheetResult> CreateDailyTreatmentSheetAsync(Guid admissionId, DateTime date)
    {
        var admission = await _context.Admissions.FindAsync(admissionId);
        if (admission == null)
        {
            return new TreatmentSheetResult(false, null, "Không tìm thấy bệnh nhân nội trú");
        }

        // Kiểm tra đã có tờ điều trị chưa
        var existing = await _context.DailyProgresses
            .FirstOrDefaultAsync(d => d.AdmissionId == admissionId && d.ProgressDate.Date == date.Date);

        if (existing != null)
        {
            return new TreatmentSheetResult(true, existing.Id, "Tờ điều trị đã tồn tại");
        }

        var dailyProgress = new DailyProgress
        {
            Id = Guid.NewGuid(),
            AdmissionId = admissionId,
            ProgressDate = date.Date,
            DayNumber = (int)(date.Date - admission.AdmissionDate.Date).TotalDays + 1,
            Status = 0, // Đang điều trị
            CreatedAt = DateTime.UtcNow
        };
        await _context.DailyProgresses.AddAsync(dailyProgress);
        await _context.SaveChangesAsync();

        return new TreatmentSheetResult(true, dailyProgress.Id, "Đã tạo tờ điều trị");
    }

    /// <summary>
    /// Tạo y lệnh
    /// </summary>
    public async Task<MedicalOrderResult> CreateMedicalOrderAsync(Guid treatmentSheetId, MedicalOrderDto order)
    {
        var dailyProgress = await _context.DailyProgresses.FindAsync(treatmentSheetId);
        if (dailyProgress == null)
        {
            return new MedicalOrderResult(false, null, "Không tìm thấy tờ điều trị");
        }

        dailyProgress.DoctorOrder = order.OrderContent;
        dailyProgress.TreatmentPlan = order.OrderContent;
        dailyProgress.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new MedicalOrderResult(true, treatmentSheetId, "Đã ghi y lệnh");
    }

    #endregion

    #region Step 3: Chỉ định CLS (Module 4)

    /// <summary>
    /// Tạo chỉ định CLS cho bệnh nhân nội trú
    /// </summary>
    public async Task<ServiceOrderResult> CreateInpatientServiceOrderAsync(Guid treatmentSheetId, List<ServiceOrderItemDto> items)
    {
        var dailyProgress = await _context.DailyProgresses
            .Include(d => d.Admission)
            .FirstOrDefaultAsync(d => d.Id == treatmentSheetId);

        if (dailyProgress == null)
        {
            return new ServiceOrderResult(false, null, null, "Không tìm thấy tờ điều trị");
        }

        var serviceRequest = new ServiceRequest
        {
            Id = Guid.NewGuid(),
            RequestCode = $"YCNT{DateTime.Now:yyyyMMddHHmmss}",
            MedicalRecordId = dailyProgress.Admission.MedicalRecordId,
            AdmissionId = dailyProgress.AdmissionId,
            RequestDate = DateTime.UtcNow,
            Status = 0,
            CreatedAt = DateTime.UtcNow
        };
        await _context.ServiceRequests.AddAsync(serviceRequest);

        var orderItemIds = new List<Guid>();
        foreach (var item in items)
        {
            var detail = new ServiceRequestDetail
            {
                Id = Guid.NewGuid(),
                ServiceRequestId = serviceRequest.Id,
                ServiceId = item.ServiceId,
                Quantity = item.Quantity,
                Note = item.Note,
                Status = 0,
                CreatedAt = DateTime.UtcNow
            };
            await _context.ServiceRequestDetails.AddAsync(detail);
            orderItemIds.Add(detail.Id);
        }

        await _context.SaveChangesAsync();

        return new ServiceOrderResult(true, serviceRequest.Id, orderItemIds, "Đã tạo chỉ định");
    }

    #endregion

    #region Step 4: Kê đơn thuốc nội trú

    /// <summary>
    /// Kê đơn thuốc nội trú (theo ngày)
    /// </summary>
    public async Task<PrescriptionResult> CreateInpatientPrescriptionAsync(Guid treatmentSheetId, PrescriptionDto prescription)
    {
        var dailyProgress = await _context.DailyProgresses
            .Include(d => d.Admission)
            .FirstOrDefaultAsync(d => d.Id == treatmentSheetId);

        if (dailyProgress == null)
        {
            return new PrescriptionResult(false, null, "Không tìm thấy tờ điều trị");
        }

        var newPrescription = new Prescription
        {
            Id = Guid.NewGuid(),
            PrescriptionCode = $"DTNT{DateTime.Now:yyyyMMddHHmmss}",
            MedicalRecordId = dailyProgress.Admission.MedicalRecordId,
            AdmissionId = dailyProgress.AdmissionId,
            PrescriptionType = 2, // Nội trú
            PrescribedDate = DateTime.UtcNow,
            Note = prescription.Note,
            Status = 0,
            CreatedAt = DateTime.UtcNow
        };
        await _context.Prescriptions.AddAsync(newPrescription);

        foreach (var item in prescription.Items)
        {
            var detail = new PrescriptionDetail
            {
                Id = Guid.NewGuid(),
                PrescriptionId = newPrescription.Id,
                MedicineId = item.MedicineId,
                Quantity = item.Quantity,
                Dosage = item.Dosage,
                Frequency = item.Frequency,
                Days = item.Days,
                Note = item.Note,
                CreatedAt = DateTime.UtcNow
            };
            await _context.PrescriptionDetails.AddAsync(detail);
        }

        await _context.SaveChangesAsync();

        return new PrescriptionResult(true, newPrescription.Id, "Đã kê đơn thuốc nội trú");
    }

    #endregion

    #region Step 5: Tổng hợp & Xuất thuốc (Module 5)

    /// <summary>
    /// Tạo phiếu lĩnh thuốc cho khoa
    /// Tổng hợp tất cả đơn thuốc trong ngày của khoa
    /// </summary>
    public async Task<RequisitionResult> CreateDrugRequisitionAsync(Guid wardId, DateTime date)
    {
        // Lấy tất cả đơn thuốc nội trú chưa xuất của khoa trong ngày
        var prescriptions = await _context.Prescriptions
            .Include(p => p.Details)
            .Include(p => p.Admission)
            .Where(p => p.PrescriptionType == 2
                     && p.Status == 0
                     && p.Admission.DepartmentId == wardId
                     && p.PrescribedDate.Date == date.Date)
            .ToListAsync();

        if (!prescriptions.Any())
        {
            return new RequisitionResult(false, null, "Không có đơn thuốc cần tổng hợp");
        }

        // Tổng hợp thuốc theo loại
        var aggregatedItems = prescriptions
            .SelectMany(p => p.Details)
            .GroupBy(d => d.MedicineId)
            .Select(g => new
            {
                MedicineId = g.Key,
                TotalQuantity = g.Sum(d => d.Quantity)
            })
            .ToList();

        // Tạo phiếu lĩnh
        var requisition = new ExportReceipt
        {
            Id = Guid.NewGuid(),
            ExportCode = $"PL{DateTime.Now:yyyyMMddHHmmss}",
            ExportType = 2, // Xuất khoa
            DepartmentId = wardId,
            ExportDate = DateTime.UtcNow,
            Status = 0, // Chờ duyệt
            CreatedAt = DateTime.UtcNow
        };
        await _context.ExportReceipts.AddAsync(requisition);

        foreach (var item in aggregatedItems)
        {
            var detail = new ExportReceiptDetail
            {
                Id = Guid.NewGuid(),
                ExportReceiptId = requisition.Id,
                MedicineId = item.MedicineId,
                Quantity = item.TotalQuantity,
                CreatedAt = DateTime.UtcNow
            };
            await _context.ExportReceiptDetails.AddAsync(detail);
        }

        // Cập nhật trạng thái đơn thuốc
        foreach (var p in prescriptions)
        {
            p.RequisitionId = requisition.Id;
        }

        await _context.SaveChangesAsync();

        return new RequisitionResult(true, requisition.Id, $"Đã tổng hợp {prescriptions.Count} đơn thuốc");
    }

    /// <summary>
    /// Xuất thuốc theo phiếu lĩnh
    /// </summary>
    public async Task<DispenseResult> DispenseToWardAsync(Guid requisitionId)
    {
        var requisition = await _context.ExportReceipts
            .Include(r => r.Details)
            .FirstOrDefaultAsync(r => r.Id == requisitionId);

        if (requisition == null)
        {
            return new DispenseResult(false, null, "Không tìm thấy phiếu lĩnh");
        }

        decimal totalAmount = 0;

        foreach (var item in requisition.Details)
        {
            // Xuất theo FIFO/FEFO
            var inventoryItems = await _context.InventoryItems
                .Where(i => i.MedicineId == item.MedicineId
                         && i.Quantity > 0
                         && i.ExpiryDate > DateTime.Today)
                .OrderBy(i => i.ExpiryDate)
                .ThenBy(i => i.CreatedAt)
                .ToListAsync();

            var remainingQty = item.Quantity;
            foreach (var inv in inventoryItems)
            {
                if (remainingQty <= 0) break;

                var dispenseQty = Math.Min(remainingQty, inv.Quantity);
                inv.Quantity -= dispenseQty;
                remainingQty -= dispenseQty;

                item.UnitPrice = inv.UnitPrice;
                item.Amount = dispenseQty * inv.UnitPrice;
                totalAmount += item.Amount;

                // Stock movement
                var movement = new StockMovement
                {
                    Id = Guid.NewGuid(),
                    InventoryItemId = inv.Id,
                    MovementType = "OUT",
                    Quantity = dispenseQty,
                    ReferenceType = "WARD_DISPENSE",
                    ReferenceId = requisitionId,
                    MovementDate = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow
                };
                await _context.StockMovements.AddAsync(movement);
            }

            if (remainingQty > 0)
            {
                return new DispenseResult(false, null, $"Không đủ tồn kho cho thuốc ID: {item.MedicineId}");
            }
        }

        requisition.TotalAmount = totalAmount;
        requisition.Status = 1; // Đã xuất

        // Cập nhật đơn thuốc
        var prescriptions = await _context.Prescriptions
            .Where(p => p.RequisitionId == requisitionId)
            .ToListAsync();
        foreach (var p in prescriptions)
        {
            p.Status = 1; // Đã phát
        }

        await _context.SaveChangesAsync();

        return new DispenseResult(true, requisitionId, "Đã xuất thuốc cho khoa");
    }

    #endregion

    #region Step 6: Phẫu thuật (Module 6)

    /// <summary>
    /// Lên lịch phẫu thuật
    /// </summary>
    public async Task<SurgeryScheduleResult> ScheduleSurgeryAsync(Guid admissionId, SurgeryRequestDto request)
    {
        var admission = await _context.Admissions.FindAsync(admissionId);
        if (admission == null)
        {
            return new SurgeryScheduleResult(false, null, null, "Không tìm thấy bệnh nhân nội trú");
        }

        // Tạo yêu cầu phẫu thuật
        var surgeryRequest = new SurgeryRequest
        {
            Id = Guid.NewGuid(),
            RequestCode = $"YC-PT{DateTime.Now:yyyyMMddHHmmss}",
            AdmissionId = admissionId,
            ServiceId = request.ServiceId,
            SurgeryName = request.SurgeryName,
            SurgeryType = request.SurgeryType,
            RequestDate = DateTime.UtcNow,
            Status = 0, // Chờ duyệt
            Note = request.Note,
            CreatedAt = DateTime.UtcNow
        };
        await _context.SurgeryRequests.AddAsync(surgeryRequest);
        await _context.SaveChangesAsync();

        return new SurgeryScheduleResult(true, surgeryRequest.Id, null, "Đã tạo yêu cầu phẫu thuật");
    }

    /// <summary>
    /// Hoàn thành phẫu thuật
    /// </summary>
    public async Task<SurgeryResult> CompleteSurgeryAsync(Guid surgeryId, SurgeryRecordDto record)
    {
        var surgery = await _context.SurgerySchedules.FindAsync(surgeryId);
        if (surgery == null)
        {
            return new SurgeryResult(false, null, "Không tìm thấy ca phẫu thuật");
        }

        // Tạo biên bản phẫu thuật
        var surgeryRecord = new SurgeryRecord
        {
            Id = Guid.NewGuid(),
            SurgeryScheduleId = surgeryId,
            StartTime = record.StartTime,
            EndTime = record.EndTime,
            Procedure = record.Procedure,
            Findings = record.Findings,
            Complications = record.Complications,
            Status = 1, // Hoàn thành
            CreatedAt = DateTime.UtcNow
        };
        await _context.SurgeryRecords.AddAsync(surgeryRecord);

        surgery.Status = 2; // Hoàn thành

        await _context.SaveChangesAsync();

        return new SurgeryResult(true, surgeryRecord.Id, "Đã hoàn thành phẫu thuật");
    }

    #endregion

    #region Step 7: Theo dõi điều dưỡng

    /// <summary>
    /// Ghi nhận chăm sóc điều dưỡng
    /// </summary>
    public async Task<NursingCareResult> RecordNursingCareAsync(Guid admissionId, NursingCareDto care)
    {
        var admission = await _context.Admissions.FindAsync(admissionId);
        if (admission == null)
        {
            return new NursingCareResult(false, null, "Không tìm thấy bệnh nhân nội trú");
        }

        var nursingCare = new NursingCare
        {
            Id = Guid.NewGuid(),
            AdmissionId = admissionId,
            CareType = care.CareType,
            CareContent = care.CareContent,
            CareTime = care.CareTime,
            CreatedAt = DateTime.UtcNow
        };
        await _context.NursingCares.AddAsync(nursingCare);
        await _context.SaveChangesAsync();

        return new NursingCareResult(true, nursingCare.Id, "Đã ghi nhận chăm sóc");
    }

    /// <summary>
    /// Ghi nhận dấu hiệu sinh tồn
    /// </summary>
    public async Task<VitalSignsResult> RecordVitalSignsAsync(Guid admissionId, VitalSignsDto vitalSigns)
    {
        var dailyProgress = await _context.DailyProgresses
            .Where(d => d.AdmissionId == admissionId && d.ProgressDate.Date == DateTime.Today)
            .FirstOrDefaultAsync();

        if (dailyProgress == null)
        {
            // Tạo mới nếu chưa có
            dailyProgress = new DailyProgress
            {
                Id = Guid.NewGuid(),
                AdmissionId = admissionId,
                ProgressDate = DateTime.Today,
                CreatedAt = DateTime.UtcNow
            };
            await _context.DailyProgresses.AddAsync(dailyProgress);
        }

        dailyProgress.Temperature = vitalSigns.Temperature;
        dailyProgress.Pulse = vitalSigns.Pulse;
        dailyProgress.BloodPressureSystolic = vitalSigns.BPSystolic;
        dailyProgress.BloodPressureDiastolic = vitalSigns.BPDiastolic;
        dailyProgress.RespiratoryRate = vitalSigns.RespiratoryRate;
        dailyProgress.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new VitalSignsResult(true, dailyProgress.Id, "Đã ghi nhận sinh hiệu");
    }

    #endregion

    #region Step 8: Ra viện

    /// <summary>
    /// Cho bệnh nhân ra viện
    /// Điều kiện: Hoàn thành thanh toán hoặc xác nhận nợ
    /// </summary>
    public async Task<DischargeResult> DischargePatientAsync(Guid admissionId, DischargeRequestDto request)
    {
        var admission = await _context.Admissions
            .Include(a => a.MedicalRecord)
            .FirstOrDefaultAsync(a => a.Id == admissionId);

        if (admission == null)
        {
            return new DischargeResult(false, null, "Không tìm thấy bệnh nhân nội trú");
        }

        // Kiểm tra CLS chưa có kết quả
        var pendingServices = await _context.ServiceRequestDetails
            .Include(d => d.ServiceRequest)
            .Where(d => d.ServiceRequest.AdmissionId == admissionId && d.Status < 2)
            .CountAsync();

        if (pendingServices > 0)
        {
            return new DischargeResult(false, null, $"Còn {pendingServices} dịch vụ chưa có kết quả");
        }

        // Tạo bản ghi ra viện
        var discharge = new Discharge
        {
            Id = Guid.NewGuid(),
            AdmissionId = admissionId,
            DischargeDate = DateTime.UtcNow,
            DischargeType = request.DischargeType,
            TreatmentResult = request.TreatmentResult,
            DischargeDiagnosis = request.DischargeDiagnosis,
            DischargeNote = request.Note,
            CreatedAt = DateTime.UtcNow
        };
        await _context.Discharges.AddAsync(discharge);

        // Cập nhật trạng thái
        admission.Status = 0; // Đã ra viện
        admission.DischargeDate = DateTime.UtcNow;

        admission.MedicalRecord.DischargeDate = DateTime.UtcNow;
        admission.MedicalRecord.TreatmentResult = request.TreatmentResult;
        admission.MedicalRecord.DischargeType = request.DischargeType;
        admission.MedicalRecord.IsClosed = true;

        // Trả giường
        var bedAssignment = await _context.BedAssignments
            .Include(ba => ba.Bed)
            .Where(ba => ba.AdmissionId == admissionId && ba.Status == 1)
            .FirstOrDefaultAsync();

        if (bedAssignment != null)
        {
            bedAssignment.Status = 0;
            bedAssignment.EndDate = DateTime.UtcNow;
            bedAssignment.Bed.Status = 0; // Giường trống
        }

        await _context.SaveChangesAsync();

        return new DischargeResult(true, DateTime.UtcNow, "Đã cho ra viện");
    }

    #endregion

    #region Step 9: Thanh toán (Module 10)

    /// <summary>
    /// Tổng hợp hóa đơn nội trú
    /// </summary>
    public async Task<InvoiceResult> GenerateInpatientInvoiceAsync(Guid admissionId)
    {
        var admission = await _context.Admissions
            .Include(a => a.MedicalRecord)
                .ThenInclude(m => m.Patient)
            .FirstOrDefaultAsync(a => a.Id == admissionId);

        if (admission == null)
        {
            return new InvoiceResult(false, null, null, null, "Không tìm thấy bệnh nhân nội trú");
        }

        // Tính chi phí giường
        var bedDays = (int)(DateTime.Today - admission.AdmissionDate.Date).TotalDays + 1;
        var bedAssignment = await _context.BedAssignments
            .Include(ba => ba.Bed)
            .Where(ba => ba.AdmissionId == admissionId)
            .FirstOrDefaultAsync();
        var bedCost = bedDays * (bedAssignment?.Bed?.DailyPrice ?? 0);

        // Chi phí dịch vụ
        var serviceCost = await _context.ServiceRequestDetails
            .Include(d => d.ServiceRequest)
            .Include(d => d.Service)
            .Where(d => d.ServiceRequest.AdmissionId == admissionId)
            .SumAsync(d => (d.Service.UnitPrice * d.Quantity));

        // Chi phí thuốc
        var medicineCost = await _context.DispenseRequests
            .Where(d => d.Prescription.AdmissionId == admissionId)
            .SumAsync(d => d.TotalAmount);

        var totalAmount = bedCost + serviceCost + medicineCost;

        // Tính BHYT
        decimal insuranceAmount = 0;
        if (admission.MedicalRecord.PatientType == 1)
        {
            insuranceAmount = totalAmount * 0.8m;
        }

        var patientAmount = totalAmount - insuranceAmount;

        // Tạo hóa đơn
        var receipt = new Receipt
        {
            Id = Guid.NewGuid(),
            ReceiptCode = $"HDNT{DateTime.Now:yyyyMMddHHmmss}",
            MedicalRecordId = admission.MedicalRecordId,
            AdmissionId = admissionId,
            PatientId = admission.PatientId,
            ReceiptDate = DateTime.UtcNow,
            TotalAmount = totalAmount,
            InsuranceAmount = insuranceAmount,
            PatientAmount = patientAmount,
            Status = 0,
            CreatedAt = DateTime.UtcNow
        };
        await _context.Receipts.AddAsync(receipt);
        await _context.SaveChangesAsync();

        return new InvoiceResult(true, receipt.Id, receipt.ReceiptCode, totalAmount,
            $"Giường: {bedCost:N0}, DV: {serviceCost:N0}, Thuốc: {medicineCost:N0}");
    }

    /// <summary>
    /// Xử lý thanh toán nội trú
    /// </summary>
    public async Task<PaymentResult> ProcessInpatientPaymentAsync(Guid invoiceId, PaymentDto payment)
    {
        var receipt = await _context.Receipts.FindAsync(invoiceId);
        if (receipt == null)
        {
            return new PaymentResult(false, null, null, "Không tìm thấy hóa đơn");
        }

        receipt.PaidAmount += payment.Amount;
        receipt.PaymentMethod = payment.PaymentMethod;
        receipt.PaidAt = DateTime.UtcNow;

        if (receipt.PaidAmount >= receipt.PatientAmount)
        {
            receipt.Status = 1;
        }

        await _context.SaveChangesAsync();

        return new PaymentResult(true, receipt.Id, $"PT{DateTime.Now:yyyyMMddHHmmss}", "Thanh toán thành công");
    }

    #endregion

    #region Step 10: BHYT & Lưu trữ (Module 12, 16)

    /// <summary>
    /// Gửi hồ sơ BHYT nội trú (XML 130)
    /// </summary>
    public async Task<InsuranceClaimResult> SubmitInpatientClaimAsync(Guid admissionId)
    {
        var admission = await _context.Admissions
            .Include(a => a.MedicalRecord)
            .FirstOrDefaultAsync(a => a.Id == admissionId);

        if (admission == null || admission.MedicalRecord.PatientType != 1)
        {
            return new InsuranceClaimResult(false, null, "Không phải bệnh nhân BHYT");
        }

        var claim = new InsuranceClaim
        {
            Id = Guid.NewGuid(),
            ClaimCode = $"BHYT-NT{DateTime.Now:yyyyMMddHHmmss}",
            MedicalRecordId = admission.MedicalRecordId,
            AdmissionId = admissionId,
            PatientId = admission.PatientId,
            InsuranceNumber = admission.MedicalRecord.InsuranceNumber,
            ClaimType = 2, // Nội trú
            ClaimDate = DateTime.UtcNow,
            Status = 0,
            CreatedAt = DateTime.UtcNow
        };
        await _context.InsuranceClaims.AddAsync(claim);

        // TODO: Xuất XML 130

        await _context.SaveChangesAsync();

        return new InsuranceClaimResult(true, claim.Id, "Đã tạo hồ sơ BHYT nội trú");
    }

    /// <summary>
    /// Lưu trữ hồ sơ bệnh án
    /// </summary>
    public async Task<ArchiveResult> ArchiveMedicalRecordAsync(Guid admissionId)
    {
        var admission = await _context.Admissions
            .Include(a => a.MedicalRecord)
            .FirstOrDefaultAsync(a => a.Id == admissionId);

        if (admission == null)
        {
            return new ArchiveResult(false, null, null, "Không tìm thấy hồ sơ");
        }

        // Tạo mã lưu trữ
        var archiveCode = $"LT{DateTime.Now:yyyyMMddHHmmss}";

        admission.MedicalRecord.ArchiveCode = archiveCode;
        admission.MedicalRecord.IsClosed = true;

        await _context.SaveChangesAsync();

        return new ArchiveResult(true, admission.MedicalRecordId, archiveCode, "Đã lưu trữ hồ sơ");
    }

    #endregion
}
