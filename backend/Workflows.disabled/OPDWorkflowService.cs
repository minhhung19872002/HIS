using Microsoft.EntityFrameworkCore;
using HIS.Application.Workflows;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Workflows;

/// <summary>
/// Luồng Khám bệnh Ngoại trú (OPD Flow)
///
/// FLOW: Tiếp đón → Khám bệnh → Chỉ định → XN/CĐHA → Kho Dược → Thu ngân → BHYT
///
/// ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
/// │ 1. TIẾP ĐÓN │────▶│ 2. KHÁM    │────▶│ 4. CHỈ ĐỊNH │
/// │  (Module 1) │     │ (Module 2)  │     │  (Module 4) │
/// └─────────────┘     └─────────────┘     └──────┬──────┘
///                                                │
///        ┌───────────────────────────────────────┼───────────────────────────────────────┐
///        │                                       │                                       │
///        ▼                                       ▼                                       ▼
/// ┌─────────────┐                         ┌─────────────┐                         ┌─────────────┐
/// │ 7. XÉT     │                         │ 8. CĐHA/   │                         │ Dịch vụ    │
/// │    NGHIỆM  │                         │    TDCN    │                         │ khác       │
/// └──────┬──────┘                         └──────┬──────┘                         └─────────────┘
///        │                                       │
///        └───────────────────┬───────────────────┘
///                            ▼
///                     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
///                     │ Kết luận   │────▶│ Kê đơn     │────▶│ 5. KHO DƯỢC │
///                     │ khám bệnh  │     │ thuốc      │     │  (Module 5) │
///                     └─────────────┘     └─────────────┘     └──────┬──────┘
///                                                                    │
///                     ┌──────────────────────────────────────────────┘
///                     ▼
///              ┌─────────────┐     ┌─────────────┐
///              │ 10. THU    │────▶│ 12. BHYT   │
///              │     NGÂN   │     │ (Module 12)│
///              └─────────────┘     └─────────────┘
/// </summary>
public class OPDWorkflowService : IOPDWorkflowService
{
    private readonly HISDbContext _context;

    public OPDWorkflowService(HISDbContext context)
    {
        _context = context;
    }

    #region Step 1: Tiếp đón (Module 1)

    /// <summary>
    /// Đăng ký khám bệnh
    /// - Tìm hoặc tạo mới bệnh nhân
    /// - Tạo hồ sơ bệnh án (MedicalRecord)
    /// - Kiểm tra BHYT (nếu có)
    /// </summary>
    public async Task<VisitRegistrationResult> RegisterVisitAsync(PatientRegistrationDto request)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // 1. Tìm hoặc tạo bệnh nhân
            Patient? patient = null;
            if (!string.IsNullOrEmpty(request.PatientCode))
            {
                patient = await _context.Patients
                    .FirstOrDefaultAsync(p => p.PatientCode == request.PatientCode && !p.IsDeleted);
            }

            if (patient == null)
            {
                // Tạo mã bệnh nhân mới: BNyyyyMMddHHmmss
                var patientCode = $"BN{DateTime.Now:yyyyMMddHHmmss}";
                patient = new Patient
                {
                    Id = Guid.NewGuid(),
                    PatientCode = patientCode,
                    FullName = request.FullName,
                    DateOfBirth = request.DateOfBirth,
                    Gender = request.Gender,
                    IdentityNumber = request.IdentityNumber,
                    PhoneNumber = request.PhoneNumber,
                    InsuranceNumber = request.InsuranceNumber,
                    CreatedAt = DateTime.UtcNow
                };
                await _context.Patients.AddAsync(patient);
            }

            // 2. Tạo hồ sơ bệnh án (MedicalRecord = Visit)
            var medicalRecordCode = $"HS{DateTime.Now:yyyyMMddHHmmss}";
            var medicalRecord = new MedicalRecord
            {
                Id = Guid.NewGuid(),
                MedicalRecordCode = medicalRecordCode,
                PatientId = patient.Id,
                AdmissionDate = DateTime.UtcNow,
                PatientType = request.PatientType, // 1-BHYT, 2-Viện phí, 3-Dịch vụ
                TreatmentType = 1, // Ngoại trú
                InsuranceNumber = request.InsuranceNumber,
                DepartmentId = request.DepartmentId,
                Status = 0, // Chờ khám
                CreatedAt = DateTime.UtcNow
            };
            await _context.MedicalRecords.AddAsync(medicalRecord);

            // 3. Tạo số thứ tự hàng đợi
            var queueNumber = await GetNextQueueNumberAsync(request.DepartmentId ?? Guid.Empty);
            var queue = new Queue
            {
                Id = Guid.NewGuid(),
                MedicalRecordId = medicalRecord.Id,
                DepartmentId = request.DepartmentId ?? Guid.Empty,
                QueueNumber = queueNumber,
                QueueDate = DateTime.Today,
                Status = 0, // Đang chờ
                CreatedAt = DateTime.UtcNow
            };
            await _context.Queues.AddAsync(queue);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return new VisitRegistrationResult(
                Success: true,
                VisitId: medicalRecord.Id,
                PatientCode: patient.PatientCode,
                QueueNumber: queueNumber,
                Message: "Đăng ký khám thành công"
            );
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return new VisitRegistrationResult(false, null, null, 0, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Kiểm tra thẻ BHYT qua cổng BHXH
    /// </summary>
    public async Task<InsuranceVerificationResult> VerifyInsuranceAsync(string insuranceNumber)
    {
        // TODO: Gọi API cổng BHXH để xác minh thẻ
        // Hiện tại trả về mock data
        await Task.Delay(100); // Simulate API call

        if (string.IsNullOrEmpty(insuranceNumber))
        {
            return new InsuranceVerificationResult(false, "Số thẻ BHYT không hợp lệ", null, null);
        }

        // Mock: Giả sử thẻ hợp lệ
        return new InsuranceVerificationResult(
            IsValid: true,
            Message: "Thẻ BHYT hợp lệ",
            CoverageRate: 0.8m, // 80%
            ExpireDate: DateTime.Today.AddYears(1)
        );
    }

    /// <summary>
    /// Cấp số thứ tự khám
    /// </summary>
    public async Task<QueueTicketResult> AssignQueueAsync(Guid visitId, Guid roomId)
    {
        var medicalRecord = await _context.MedicalRecords
            .Include(m => m.Department)
            .FirstOrDefaultAsync(m => m.Id == visitId);

        if (medicalRecord == null)
        {
            return new QueueTicketResult(false, 0, null, 0);
        }

        var room = await _context.Rooms.FindAsync(roomId);
        var queueNumber = await GetNextQueueNumberAsync(medicalRecord.DepartmentId ?? Guid.Empty);

        // Ước tính thời gian chờ (mỗi BN ~ 10 phút)
        var waitingCount = await _context.Queues
            .CountAsync(q => q.DepartmentId == medicalRecord.DepartmentId
                          && q.QueueDate == DateTime.Today
                          && q.Status == 0);

        return new QueueTicketResult(
            Success: true,
            QueueNumber: queueNumber,
            RoomName: room?.RoomName,
            EstimatedWaitMinutes: waitingCount * 10
        );
    }

    #endregion

    #region Step 2: Khám bệnh (Module 2)

    /// <summary>
    /// Bắt đầu khám bệnh
    /// - Gọi bệnh nhân theo số thứ tự
    /// - Tạo lượt khám (Examination)
    /// </summary>
    public async Task<ExaminationResult> StartExaminationAsync(Guid visitId, Guid doctorId)
    {
        var medicalRecord = await _context.MedicalRecords.FindAsync(visitId);
        if (medicalRecord == null)
        {
            return new ExaminationResult(false, null, "Không tìm thấy hồ sơ");
        }

        // Cập nhật hàng đợi
        var queue = await _context.Queues
            .FirstOrDefaultAsync(q => q.MedicalRecordId == visitId && q.Status == 0);
        if (queue != null)
        {
            queue.Status = 1; // Đang khám
            queue.CalledAt = DateTime.UtcNow;
        }

        // Tạo lượt khám
        var examination = new Examination
        {
            Id = Guid.NewGuid(),
            MedicalRecordId = visitId,
            ExaminationType = 1, // Khám chính
            QueueNumber = queue?.QueueNumber ?? 0,
            DepartmentId = medicalRecord.DepartmentId ?? Guid.Empty,
            RoomId = medicalRecord.RoomId ?? Guid.Empty,
            DoctorId = doctorId,
            StartTime = DateTime.UtcNow,
            Status = 1, // Đang khám
            CreatedAt = DateTime.UtcNow
        };
        await _context.Examinations.AddAsync(examination);

        // Cập nhật trạng thái hồ sơ
        medicalRecord.Status = 1; // Đang khám
        medicalRecord.DoctorId = doctorId;

        await _context.SaveChangesAsync();

        return new ExaminationResult(true, examination.Id, "Bắt đầu khám");
    }

    /// <summary>
    /// Ghi nhận dấu hiệu sinh tồn
    /// </summary>
    public async Task<ExaminationResult> RecordVitalSignsAsync(Guid examinationId, VitalSignsDto vitalSigns)
    {
        var examination = await _context.Examinations.FindAsync(examinationId);
        if (examination == null)
        {
            return new ExaminationResult(false, null, "Không tìm thấy lượt khám");
        }

        examination.Temperature = vitalSigns.Temperature;
        examination.Pulse = vitalSigns.Pulse;
        examination.BloodPressureSystolic = vitalSigns.BPSystolic;
        examination.BloodPressureDiastolic = vitalSigns.BPDiastolic;
        examination.RespiratoryRate = vitalSigns.RespiratoryRate;
        examination.Height = vitalSigns.Height;
        examination.Weight = vitalSigns.Weight;
        examination.SpO2 = vitalSigns.SpO2;

        // Tính BMI
        if (vitalSigns.Height > 0 && vitalSigns.Weight > 0)
        {
            var heightInMeters = vitalSigns.Height.Value / 100;
            examination.BMI = vitalSigns.Weight.Value / (heightInMeters * heightInMeters);
        }

        await _context.SaveChangesAsync();

        return new ExaminationResult(true, examinationId, "Đã ghi nhận sinh hiệu");
    }

    /// <summary>
    /// Ghi nhận chẩn đoán
    /// </summary>
    public async Task<ExaminationResult> RecordDiagnosisAsync(Guid examinationId, DiagnosisDto diagnosis)
    {
        var examination = await _context.Examinations.FindAsync(examinationId);
        if (examination == null)
        {
            return new ExaminationResult(false, null, "Không tìm thấy lượt khám");
        }

        // Kiểm tra mã ICD hợp lệ
        var icdCode = await _context.IcdCodes
            .FirstOrDefaultAsync(i => i.Code == diagnosis.MainIcdCode && i.IsActive);
        if (icdCode == null)
        {
            return new ExaminationResult(false, null, "Mã ICD không hợp lệ");
        }

        examination.MainIcdCode = diagnosis.MainIcdCode;
        examination.MainDiagnosis = diagnosis.MainDiagnosis;
        examination.SubIcdCodes = diagnosis.SubIcdCodes != null
            ? string.Join(",", diagnosis.SubIcdCodes)
            : null;
        examination.SubDiagnosis = diagnosis.SubDiagnosis;

        // Cập nhật vào hồ sơ bệnh án
        var medicalRecord = await _context.MedicalRecords.FindAsync(examination.MedicalRecordId);
        if (medicalRecord != null)
        {
            medicalRecord.MainIcdCode = diagnosis.MainIcdCode;
            medicalRecord.MainDiagnosis = diagnosis.MainDiagnosis;
            medicalRecord.SubIcdCodes = examination.SubIcdCodes;
            medicalRecord.SubDiagnosis = diagnosis.SubDiagnosis;
        }

        await _context.SaveChangesAsync();

        return new ExaminationResult(true, examinationId, "Đã ghi nhận chẩn đoán");
    }

    #endregion

    #region Step 3: Chỉ định dịch vụ (Module 4)

    /// <summary>
    /// Tạo chỉ định dịch vụ CLS
    /// </summary>
    public async Task<ServiceOrderResult> CreateServiceOrderAsync(Guid examinationId, List<ServiceOrderItemDto> items)
    {
        var examination = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .FirstOrDefaultAsync(e => e.Id == examinationId);

        if (examination == null)
        {
            return new ServiceOrderResult(false, null, null, "Không tìm thấy lượt khám");
        }

        // Kiểm tra trùng dịch vụ trong ngày
        var existingServices = await _context.ServiceRequestDetails
            .Include(d => d.ServiceRequest)
            .Where(d => d.ServiceRequest.MedicalRecordId == examination.MedicalRecordId
                     && d.ServiceRequest.RequestDate.Date == DateTime.Today.Date)
            .Select(d => d.ServiceId)
            .ToListAsync();

        var duplicates = items.Where(i => existingServices.Contains(i.ServiceId)).ToList();
        if (duplicates.Any())
        {
            return new ServiceOrderResult(false, null, null,
                $"Dịch vụ đã được chỉ định trong ngày: {duplicates.Count} dịch vụ");
        }

        // Tạo phiếu yêu cầu
        var serviceRequest = new ServiceRequest
        {
            Id = Guid.NewGuid(),
            RequestCode = $"YC{DateTime.Now:yyyyMMddHHmmss}",
            MedicalRecordId = examination.MedicalRecordId,
            ExaminationId = examinationId,
            RequestDate = DateTime.UtcNow,
            RequestedById = examination.DoctorId ?? Guid.Empty,
            Status = 0, // Chờ thực hiện
            CreatedAt = DateTime.UtcNow
        };
        await _context.ServiceRequests.AddAsync(serviceRequest);

        // Thêm chi tiết
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
                Priority = item.Priority ?? 0,
                Status = 0, // Chờ thực hiện
                CreatedAt = DateTime.UtcNow
            };
            await _context.ServiceRequestDetails.AddAsync(detail);
            orderItemIds.Add(detail.Id);
        }

        // Cập nhật trạng thái khám: Chờ CLS
        examination.Status = 2;

        await _context.SaveChangesAsync();

        return new ServiceOrderResult(true, serviceRequest.Id, orderItemIds, "Đã tạo chỉ định");
    }

    #endregion

    #region Step 4: Xét nghiệm & CĐHA (Module 7, 8)

    /// <summary>
    /// Gửi yêu cầu xét nghiệm đến LIS
    /// </summary>
    public async Task<LabOrderResult> SendLabOrderAsync(Guid serviceOrderId)
    {
        var serviceRequest = await _context.ServiceRequests
            .Include(r => r.Details)
                .ThenInclude(d => d.Service)
            .FirstOrDefaultAsync(r => r.Id == serviceOrderId);

        if (serviceRequest == null)
        {
            return new LabOrderResult(false, null, "Không tìm thấy phiếu yêu cầu");
        }

        // Lọc các dịch vụ xét nghiệm (ServiceType = 2)
        var labItems = serviceRequest.Details
            .Where(d => d.Service?.ServiceType == 2)
            .ToList();

        if (!labItems.Any())
        {
            return new LabOrderResult(false, null, "Không có dịch vụ xét nghiệm");
        }

        // Tạo Lab Request
        var labRequest = new LabRequest
        {
            Id = Guid.NewGuid(),
            RequestCode = $"XN{DateTime.Now:yyyyMMddHHmmss}",
            ServiceRequestId = serviceOrderId,
            MedicalRecordId = serviceRequest.MedicalRecordId,
            RequestTime = DateTime.UtcNow,
            Status = 0, // Chờ lấy mẫu
            CreatedAt = DateTime.UtcNow
        };
        await _context.LabRequests.AddAsync(labRequest);

        // Thêm chi tiết xét nghiệm
        foreach (var item in labItems)
        {
            var labItem = new LabRequestItem
            {
                Id = Guid.NewGuid(),
                LabRequestId = labRequest.Id,
                ServiceId = item.ServiceId,
                Status = 0, // Chờ lấy mẫu
                CreatedAt = DateTime.UtcNow
            };
            await _context.LabRequestItems.AddAsync(labItem);
        }

        await _context.SaveChangesAsync();

        return new LabOrderResult(true, labRequest.Id, "Đã gửi yêu cầu xét nghiệm");
    }

    /// <summary>
    /// Gửi yêu cầu CĐHA đến RIS
    /// </summary>
    public async Task<ImagingOrderResult> SendImagingOrderAsync(Guid serviceOrderId)
    {
        var serviceRequest = await _context.ServiceRequests
            .Include(r => r.Details)
                .ThenInclude(d => d.Service)
            .FirstOrDefaultAsync(r => r.Id == serviceOrderId);

        if (serviceRequest == null)
        {
            return new ImagingOrderResult(false, null, "Không tìm thấy phiếu yêu cầu");
        }

        // Lọc các dịch vụ CĐHA (ServiceType = 3)
        var imagingItems = serviceRequest.Details
            .Where(d => d.Service?.ServiceType == 3)
            .ToList();

        if (!imagingItems.Any())
        {
            return new ImagingOrderResult(false, null, "Không có dịch vụ CĐHA");
        }

        // Tạo Radiology Request
        var radiologyRequest = new RadiologyRequest
        {
            Id = Guid.NewGuid(),
            RequestCode = $"CDHA{DateTime.Now:yyyyMMddHHmmss}",
            ServiceRequestId = serviceOrderId,
            MedicalRecordId = serviceRequest.MedicalRecordId,
            RequestTime = DateTime.UtcNow,
            Status = 0, // Chờ thực hiện
            CreatedAt = DateTime.UtcNow
        };
        await _context.RadiologyRequests.AddAsync(radiologyRequest);

        await _context.SaveChangesAsync();

        return new ImagingOrderResult(true, radiologyRequest.Id, "Đã gửi yêu cầu CĐHA");
    }

    /// <summary>
    /// Chờ kết quả CLS
    /// </summary>
    public async Task WaitForResultsAsync(Guid examinationId)
    {
        // Kiểm tra tất cả CLS đã có kết quả chưa
        var pendingLabs = await _context.LabRequests
            .Include(l => l.ServiceRequest)
            .Where(l => l.ServiceRequest.ExaminationId == examinationId && l.Status < 3)
            .CountAsync();

        var pendingImaging = await _context.RadiologyRequests
            .Include(r => r.ServiceRequest)
            .Where(r => r.ServiceRequest.ExaminationId == examinationId && r.Status < 3)
            .CountAsync();

        if (pendingLabs == 0 && pendingImaging == 0)
        {
            // Cập nhật trạng thái khám: Chờ kết luận
            var examination = await _context.Examinations.FindAsync(examinationId);
            if (examination != null)
            {
                examination.Status = 3; // Chờ kết luận
                await _context.SaveChangesAsync();
            }
        }
    }

    #endregion

    #region Step 5: Kết luận & Kê đơn

    /// <summary>
    /// Ghi nhận kết luận khám bệnh
    /// </summary>
    public async Task<ConclusionResult> RecordConclusionAsync(Guid examinationId, ConclusionDto conclusion)
    {
        var examination = await _context.Examinations.FindAsync(examinationId);
        if (examination == null)
        {
            return new ConclusionResult(false, "Không tìm thấy lượt khám");
        }

        examination.ConclusionType = conclusion.ConclusionType;
        examination.ConclusionNote = conclusion.Note;
        examination.FollowUpDate = conclusion.FollowUpDate;
        examination.TreatmentPlan = conclusion.TreatmentPlan;
        examination.EndTime = DateTime.UtcNow;
        examination.Status = 4; // Hoàn thành

        // Cập nhật hồ sơ bệnh án
        var medicalRecord = await _context.MedicalRecords.FindAsync(examination.MedicalRecordId);
        if (medicalRecord != null)
        {
            medicalRecord.Status = 3; // Hoàn thành khám

            // Nếu kết luận nhập viện
            if (conclusion.ConclusionType == 3) // Nhập viện
            {
                medicalRecord.TreatmentType = 2; // Chuyển sang nội trú
            }
        }

        // Cập nhật hàng đợi
        var queue = await _context.Queues
            .FirstOrDefaultAsync(q => q.MedicalRecordId == examination.MedicalRecordId);
        if (queue != null)
        {
            queue.Status = 2; // Hoàn thành
            queue.CompletedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        return new ConclusionResult(true, "Đã ghi nhận kết luận");
    }

    /// <summary>
    /// Tạo đơn thuốc
    /// </summary>
    public async Task<PrescriptionResult> CreatePrescriptionAsync(Guid examinationId, PrescriptionDto prescription)
    {
        var examination = await _context.Examinations
            .Include(e => e.MedicalRecord)
                .ThenInclude(m => m.Patient)
            .FirstOrDefaultAsync(e => e.Id == examinationId);

        if (examination == null)
        {
            return new PrescriptionResult(false, null, "Không tìm thấy lượt khám");
        }

        // Kiểm tra dị ứng thuốc
        var patientAllergies = examination.MedicalRecord?.Patient?.AllergyHistory;
        // TODO: Kiểm tra tương tác thuốc

        // Tạo đơn thuốc
        var newPrescription = new Prescription
        {
            Id = Guid.NewGuid(),
            PrescriptionCode = $"DT{DateTime.Now:yyyyMMddHHmmss}",
            MedicalRecordId = examination.MedicalRecordId,
            ExaminationId = examinationId,
            PrescribedById = examination.DoctorId ?? Guid.Empty,
            PrescribedDate = DateTime.UtcNow,
            Diagnosis = examination.MainDiagnosis,
            DiagnosisCode = examination.MainIcdCode,
            Note = prescription.Note,
            Status = 0, // Chờ phát thuốc
            CreatedAt = DateTime.UtcNow
        };
        await _context.Prescriptions.AddAsync(newPrescription);

        // Thêm chi tiết đơn thuốc
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

        return new PrescriptionResult(true, newPrescription.Id, "Đã tạo đơn thuốc");
    }

    #endregion

    #region Step 6: Xuất thuốc (Module 5)

    /// <summary>
    /// Phát thuốc theo đơn
    /// FIFO/FEFO: Xuất lô cũ/sắp hết hạn trước
    /// </summary>
    public async Task<DispenseResult> DispenseMedicineAsync(Guid prescriptionId)
    {
        var prescription = await _context.Prescriptions
            .Include(p => p.Details)
                .ThenInclude(d => d.Medicine)
            .FirstOrDefaultAsync(p => p.Id == prescriptionId);

        if (prescription == null)
        {
            return new DispenseResult(false, null, "Không tìm thấy đơn thuốc");
        }

        // Tạo phiếu xuất thuốc
        var dispenseRequest = new DispenseRequest
        {
            Id = Guid.NewGuid(),
            RequestCode = $"XT{DateTime.Now:yyyyMMddHHmmss}",
            PrescriptionId = prescriptionId,
            RequestTime = DateTime.UtcNow,
            Status = 0, // Chờ xuất
            CreatedAt = DateTime.UtcNow
        };
        await _context.DispenseRequests.AddAsync(dispenseRequest);

        decimal totalAmount = 0;

        // Xuất từng thuốc theo FIFO/FEFO
        foreach (var item in prescription.Details)
        {
            // Tìm lô thuốc còn hạn, ưu tiên hết hạn trước (FEFO)
            var inventoryItems = await _context.InventoryItems
                .Where(i => i.MedicineId == item.MedicineId
                         && i.Quantity > 0
                         && i.ExpiryDate > DateTime.Today)
                .OrderBy(i => i.ExpiryDate) // FEFO
                .ThenBy(i => i.CreatedAt)   // FIFO
                .ToListAsync();

            var remainingQty = item.Quantity;
            foreach (var inv in inventoryItems)
            {
                if (remainingQty <= 0) break;

                var dispenseQty = Math.Min(remainingQty, inv.Quantity);
                inv.Quantity -= dispenseQty;
                remainingQty -= dispenseQty;

                // Ghi chi tiết xuất
                var dispenseItem = new DispenseRequestItem
                {
                    Id = Guid.NewGuid(),
                    DispenseRequestId = dispenseRequest.Id,
                    MedicineId = item.MedicineId,
                    BatchNumber = inv.BatchNumber,
                    OrderedQuantity = dispenseQty,
                    DispensedQuantity = dispenseQty,
                    UnitPrice = inv.UnitPrice,
                    Amount = dispenseQty * inv.UnitPrice,
                    CreatedAt = DateTime.UtcNow
                };
                await _context.DispenseRequestItems.AddAsync(dispenseItem);

                totalAmount += dispenseItem.Amount;

                // Ghi nhận stock movement
                var movement = new StockMovement
                {
                    Id = Guid.NewGuid(),
                    InventoryItemId = inv.Id,
                    MovementType = "OUT",
                    Quantity = dispenseQty,
                    ReferenceType = "DISPENSE",
                    ReferenceId = dispenseRequest.Id,
                    MovementDate = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow
                };
                await _context.StockMovements.AddAsync(movement);
            }

            if (remainingQty > 0)
            {
                return new DispenseResult(false, null, $"Không đủ tồn kho: {item.Medicine?.MedicineName}");
            }
        }

        dispenseRequest.TotalAmount = totalAmount;
        dispenseRequest.Status = 1; // Đã xuất
        prescription.Status = 1; // Đã phát thuốc

        await _context.SaveChangesAsync();

        return new DispenseResult(true, dispenseRequest.Id, "Đã phát thuốc thành công");
    }

    #endregion

    #region Step 7: Thanh toán (Module 10)

    /// <summary>
    /// Tổng hợp hóa đơn
    /// </summary>
    public async Task<InvoiceResult> GenerateInvoiceAsync(Guid visitId)
    {
        var medicalRecord = await _context.MedicalRecords
            .Include(m => m.Patient)
            .Include(m => m.ServiceRequests)
                .ThenInclude(s => s.Details)
                    .ThenInclude(d => d.Service)
            .Include(m => m.Prescriptions)
                .ThenInclude(p => p.Details)
                    .ThenInclude(d => d.Medicine)
            .FirstOrDefaultAsync(m => m.Id == visitId);

        if (medicalRecord == null)
        {
            return new InvoiceResult(false, null, null, null, "Không tìm thấy hồ sơ");
        }

        // Tính tổng chi phí
        decimal totalServices = 0;
        decimal totalMedicines = 0;

        // Chi phí dịch vụ
        foreach (var request in medicalRecord.ServiceRequests)
        {
            foreach (var detail in request.Details)
            {
                if (detail.Service != null)
                {
                    totalServices += detail.Service.UnitPrice * detail.Quantity;
                }
            }
        }

        // Chi phí thuốc (lấy từ DispenseRequest)
        var dispenseRequests = await _context.DispenseRequests
            .Where(d => d.Prescription != null && d.Prescription.MedicalRecordId == visitId)
            .SumAsync(d => d.TotalAmount);
        totalMedicines = dispenseRequests;

        var totalAmount = totalServices + totalMedicines;

        // Tính phần BHYT (nếu có)
        decimal insuranceAmount = 0;
        if (medicalRecord.PatientType == 1 && !string.IsNullOrEmpty(medicalRecord.InsuranceNumber))
        {
            // Giả sử BHYT chi trả 80%
            insuranceAmount = totalAmount * 0.8m;
        }

        var patientAmount = totalAmount - insuranceAmount;

        // Tạo hóa đơn
        var receipt = new Receipt
        {
            Id = Guid.NewGuid(),
            ReceiptCode = $"HD{DateTime.Now:yyyyMMddHHmmss}",
            MedicalRecordId = visitId,
            PatientId = medicalRecord.PatientId,
            ReceiptDate = DateTime.UtcNow,
            TotalAmount = totalAmount,
            InsuranceAmount = insuranceAmount,
            PatientAmount = patientAmount,
            PaidAmount = 0,
            Status = 0, // Chờ thanh toán
            CreatedAt = DateTime.UtcNow
        };
        await _context.Receipts.AddAsync(receipt);

        await _context.SaveChangesAsync();

        return new InvoiceResult(true, receipt.Id, receipt.ReceiptCode, totalAmount, "Đã tạo hóa đơn");
    }

    /// <summary>
    /// Xử lý thanh toán
    /// </summary>
    public async Task<PaymentResult> ProcessPaymentAsync(Guid invoiceId, PaymentDto payment)
    {
        var receipt = await _context.Receipts.FindAsync(invoiceId);
        if (receipt == null)
        {
            return new PaymentResult(false, null, null, "Không tìm thấy hóa đơn");
        }

        receipt.PaidAmount += payment.Amount;
        receipt.PaymentMethod = payment.PaymentMethod;
        receipt.PaymentReference = payment.Reference;
        receipt.PaidAt = DateTime.UtcNow;

        if (receipt.PaidAmount >= receipt.PatientAmount)
        {
            receipt.Status = 1; // Đã thanh toán

            // Cập nhật hồ sơ bệnh án
            var medicalRecord = await _context.MedicalRecords.FindAsync(receipt.MedicalRecordId);
            if (medicalRecord != null)
            {
                medicalRecord.Status = 4; // Đã thanh toán
            }
        }

        // Ghi sổ quỹ
        var cashBook = new CashBook
        {
            Id = Guid.NewGuid(),
            EntryDate = DateTime.Today,
            ReceiptId = receipt.Id,
            TotalReceipt = payment.Amount,
            CreatedAt = DateTime.UtcNow
        };
        await _context.CashBooks.AddAsync(cashBook);

        await _context.SaveChangesAsync();

        var receiptNumber = $"PT{DateTime.Now:yyyyMMddHHmmss}";
        return new PaymentResult(true, receipt.Id, receiptNumber, "Thanh toán thành công");
    }

    #endregion

    #region Step 8: BHYT (Module 12)

    /// <summary>
    /// Gửi hồ sơ BHYT
    /// </summary>
    public async Task<InsuranceClaimResult> SubmitInsuranceClaimAsync(Guid visitId)
    {
        var medicalRecord = await _context.MedicalRecords
            .Include(m => m.Patient)
            .FirstOrDefaultAsync(m => m.Id == visitId);

        if (medicalRecord == null || medicalRecord.PatientType != 1)
        {
            return new InsuranceClaimResult(false, null, "Không phải bệnh nhân BHYT");
        }

        // Tạo claim
        var claim = new InsuranceClaim
        {
            Id = Guid.NewGuid(),
            ClaimCode = $"BHYT{DateTime.Now:yyyyMMddHHmmss}",
            MedicalRecordId = visitId,
            PatientId = medicalRecord.PatientId,
            InsuranceNumber = medicalRecord.InsuranceNumber,
            ClaimDate = DateTime.UtcNow,
            Status = 0, // Chờ gửi
            CreatedAt = DateTime.UtcNow
        };
        await _context.InsuranceClaims.AddAsync(claim);

        // TODO: Xuất XML 4210/130
        // TODO: Gửi cổng BHXH

        await _context.SaveChangesAsync();

        return new InsuranceClaimResult(true, claim.Id, "Đã tạo hồ sơ BHYT");
    }

    #endregion

    #region Helper Methods

    private async Task<int> GetNextQueueNumberAsync(Guid departmentId)
    {
        var maxQueue = await _context.Queues
            .Where(q => q.DepartmentId == departmentId && q.QueueDate == DateTime.Today)
            .MaxAsync(q => (int?)q.QueueNumber) ?? 0;

        return maxQueue + 1;
    }

    #endregion
}
