using HIS.Application.Workflows;
using HIS.Core.Interfaces;
using HIS.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Workflows;

/// <summary>
/// Luồng 3: Phẫu thuật Thủ thuật (Surgery Flow)
/// Theo HIS_DataFlow_Architecture.md - Mục 2.3
///
/// LUỒNG CHÍNH:
/// [Khoa Lâm sàng] → Chỉ định PTTT → Hội chẩn (nếu cần) → Duyệt mổ → Lên lịch mổ
///     → Tiếp nhận vào phòng mổ → Chuẩn bị trước mổ → Gây mê/Gây tê
///     → Thực hiện PTTT → Kê thuốc/VT trong mổ → Kết thúc PTTT
///     → Hồi tỉnh → Chuyển về khoa LS → Tính công ekip mổ
///
/// LIÊN KẾT MODULE:
/// - Module 3 (Nội trú): Nguồn bệnh nhân cần phẫu thuật
/// - Module 5 (Kho Dược): Xuất vật tư, thuốc mê
/// - Module 9 (Kho Máu): Dự trù và cấp máu trong mổ
/// - Module 11 (Tài chính): Tính chi phí phẫu thuật, công ekip
/// </summary>
public class SurgeryWorkflowService : ISurgeryWorkflowService
{
    private readonly IUnitOfWork _unitOfWork;

    public SurgeryWorkflowService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    #region Step 1: Yêu cầu PTTT

    /// <summary>
    /// Tạo yêu cầu phẫu thuật từ khoa lâm sàng
    /// - Kiểm tra bệnh nhân đang nằm viện
    /// - Kiểm tra dịch vụ PTTT hợp lệ
    /// - Tạo phiếu yêu cầu PTTT
    /// </summary>
    public async Task<SurgeryRequestResult> RequestSurgeryAsync(Guid admissionId, SurgeryRequestDto request)
    {
        try
        {
            // Verify admission exists and is active
            var admission = await _unitOfWork.GetRepository<Admission>()
                .Query()
                .FirstOrDefaultAsync(a => a.Id == admissionId && !a.IsDeleted && a.Status == "Active");

            if (admission == null)
            {
                return new SurgeryRequestResult(false, null, "Không tìm thấy bệnh án nội trú hoặc bệnh nhân đã ra viện");
            }

            // Verify surgery service exists
            var service = await _unitOfWork.GetRepository<Service>()
                .Query()
                .FirstOrDefaultAsync(s => s.Id == request.ServiceId && !s.IsDeleted && s.IsActive);

            if (service == null)
            {
                return new SurgeryRequestResult(false, null, "Dịch vụ PTTT không tồn tại hoặc không hoạt động");
            }

            // Create surgery request
            var surgeryRequest = new SurgeryRequest
            {
                Id = Guid.NewGuid(),
                AdmissionId = admissionId,
                ServiceId = request.ServiceId,
                SurgeryName = request.SurgeryName,
                SurgeryType = request.SurgeryType, // 1: Phẫu thuật, 2: Thủ thuật
                Status = "Requested", // Requested → Approved → Scheduled → InProgress → Completed
                RequestedAt = DateTime.Now,
                Note = request.Note,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<SurgeryRequest>().AddAsync(surgeryRequest);
            await _unitOfWork.SaveChangesAsync();

            return new SurgeryRequestResult(true, surgeryRequest.Id, "Đã tạo yêu cầu PTTT thành công");
        }
        catch (Exception ex)
        {
            return new SurgeryRequestResult(false, null, $"Lỗi khi tạo yêu cầu PTTT: {ex.Message}");
        }
    }

    #endregion

    #region Step 2: Hội chẩn (nếu cần)

    /// <summary>
    /// Yêu cầu hội chẩn trước phẫu thuật
    /// - Áp dụng cho phẫu thuật loại II, III hoặc ca phức tạp
    /// - Mời các bác sĩ liên quan tham gia
    /// </summary>
    public async Task<ConsultationResult> RequestConsultationAsync(Guid surgeryRequestId)
    {
        try
        {
            var surgeryRequest = await _unitOfWork.GetRepository<SurgeryRequest>()
                .Query()
                .FirstOrDefaultAsync(sr => sr.Id == surgeryRequestId && !sr.IsDeleted);

            if (surgeryRequest == null)
            {
                return new ConsultationResult(false, null, "Không tìm thấy yêu cầu PTTT");
            }

            // Create consultation request
            var consultation = new MedicalConsultation
            {
                Id = Guid.NewGuid(),
                SurgeryRequestId = surgeryRequestId,
                Status = "Pending", // Pending → InProgress → Completed
                RequestedAt = DateTime.Now,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<MedicalConsultation>().AddAsync(consultation);

            // Update surgery request status
            surgeryRequest.Status = "PendingConsultation";
            surgeryRequest.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new ConsultationResult(true, consultation.Id, "Đã yêu cầu hội chẩn thành công");
        }
        catch (Exception ex)
        {
            return new ConsultationResult(false, null, $"Lỗi khi yêu cầu hội chẩn: {ex.Message}");
        }
    }

    /// <summary>
    /// Phê duyệt kết quả hội chẩn
    /// - Ghi nhận kết luận hội chẩn
    /// - Quyết định tiến hành hoặc không tiến hành phẫu thuật
    /// </summary>
    public async Task<ConsultationResult> ApproveConsultationAsync(Guid consultationId, ConsultationApprovalDto approval)
    {
        try
        {
            var consultation = await _unitOfWork.GetRepository<MedicalConsultation>()
                .Query()
                .Include(c => c.SurgeryRequest)
                .FirstOrDefaultAsync(c => c.Id == consultationId && !c.IsDeleted);

            if (consultation == null)
            {
                return new ConsultationResult(false, null, "Không tìm thấy phiếu hội chẩn");
            }

            // Update consultation
            consultation.Status = "Completed";
            consultation.IsApproved = approval.IsApproved;
            consultation.Conclusion = approval.Note;
            consultation.CompletedAt = DateTime.Now;
            consultation.UpdatedAt = DateTime.Now;

            // Update surgery request
            if (consultation.SurgeryRequest != null)
            {
                consultation.SurgeryRequest.Status = approval.IsApproved ? "ConsultationApproved" : "ConsultationRejected";
                consultation.SurgeryRequest.UpdatedAt = DateTime.Now;
            }

            await _unitOfWork.SaveChangesAsync();

            return new ConsultationResult(true, consultationId,
                approval.IsApproved ? "Hội chẩn đồng ý phẫu thuật" : "Hội chẩn không đồng ý phẫu thuật");
        }
        catch (Exception ex)
        {
            return new ConsultationResult(false, null, $"Lỗi khi phê duyệt hội chẩn: {ex.Message}");
        }
    }

    #endregion

    #region Step 3: Duyệt & Lên lịch

    /// <summary>
    /// Phê duyệt yêu cầu phẫu thuật
    /// - Kiểm tra đủ điều kiện phẫu thuật
    /// - Phê duyệt bởi Trưởng khoa hoặc Lãnh đạo
    /// </summary>
    public async Task<SurgeryApprovalResult> ApproveSurgeryAsync(Guid surgeryRequestId, Guid approverId)
    {
        try
        {
            var surgeryRequest = await _unitOfWork.GetRepository<SurgeryRequest>()
                .Query()
                .FirstOrDefaultAsync(sr => sr.Id == surgeryRequestId && !sr.IsDeleted);

            if (surgeryRequest == null)
            {
                return new SurgeryApprovalResult(false, null, "Không tìm thấy yêu cầu PTTT");
            }

            if (surgeryRequest.Status != "ConsultationApproved" && surgeryRequest.Status != "Requested")
            {
                return new SurgeryApprovalResult(false, null, $"Trạng thái yêu cầu không hợp lệ: {surgeryRequest.Status}");
            }

            // Verify approver exists
            var approver = await _unitOfWork.GetRepository<User>()
                .Query()
                .FirstOrDefaultAsync(u => u.Id == approverId && !u.IsDeleted && u.IsActive);

            if (approver == null)
            {
                return new SurgeryApprovalResult(false, null, "Người duyệt không tồn tại");
            }

            // Approve surgery
            surgeryRequest.Status = "Approved";
            surgeryRequest.ApprovedById = approverId;
            surgeryRequest.ApprovedAt = DateTime.Now;
            surgeryRequest.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new SurgeryApprovalResult(true, DateTime.Now, "Đã duyệt yêu cầu PTTT thành công");
        }
        catch (Exception ex)
        {
            return new SurgeryApprovalResult(false, null, $"Lỗi khi duyệt yêu cầu PTTT: {ex.Message}");
        }
    }

    /// <summary>
    /// Lên lịch phẫu thuật
    /// - Chọn phòng mổ và thời gian
    /// - Phân công ekip phẫu thuật
    /// - Dự kiến thời gian mổ
    /// </summary>
    public async Task<SurgeryScheduleResult> ScheduleSurgeryAsync(Guid surgeryRequestId, SurgeryScheduleDto schedule)
    {
        try
        {
            var surgeryRequest = await _unitOfWork.GetRepository<SurgeryRequest>()
                .Query()
                .FirstOrDefaultAsync(sr => sr.Id == surgeryRequestId && !sr.IsDeleted && sr.Status == "Approved");

            if (surgeryRequest == null)
            {
                return new SurgeryScheduleResult(false, null, null, "Không tìm thấy yêu cầu PTTT đã được duyệt");
            }

            // Check operating room availability
            var conflictingSchedule = await _unitOfWork.GetRepository<SurgerySchedule>()
                .Query()
                .AnyAsync(ss => ss.OperatingRoomId == schedule.OperatingRoomId
                    && !ss.IsDeleted
                    && ss.Status != "Cancelled"
                    && ss.ScheduledStartTime < schedule.ScheduledTime.AddMinutes(schedule.EstimatedDuration)
                    && ss.ScheduledEndTime > schedule.ScheduledTime);

            if (conflictingSchedule)
            {
                return new SurgeryScheduleResult(false, null, null, "Phòng mổ đã có lịch trong khoảng thời gian này");
            }

            // Create surgery schedule
            var surgerySchedule = new SurgerySchedule
            {
                Id = Guid.NewGuid(),
                SurgeryRequestId = surgeryRequestId,
                OperatingRoomId = schedule.OperatingRoomId,
                ScheduledStartTime = schedule.ScheduledTime,
                ScheduledEndTime = schedule.ScheduledTime.AddMinutes(schedule.EstimatedDuration),
                EstimatedDuration = schedule.EstimatedDuration,
                Status = "Scheduled", // Scheduled → InProgress → Completed → Cancelled
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<SurgerySchedule>().AddAsync(surgerySchedule);

            // Add team members
            foreach (var memberId in schedule.TeamMemberIds)
            {
                var teamMember = new SurgeryTeamMember
                {
                    Id = Guid.NewGuid(),
                    SurgeryScheduleId = surgerySchedule.Id,
                    UserId = memberId,
                    CreatedAt = DateTime.Now
                };
                await _unitOfWork.GetRepository<SurgeryTeamMember>().AddAsync(teamMember);
            }

            // Update surgery request
            surgeryRequest.Status = "Scheduled";
            surgeryRequest.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new SurgeryScheduleResult(true, surgerySchedule.Id, schedule.ScheduledTime, "Đã lên lịch phẫu thuật thành công");
        }
        catch (Exception ex)
        {
            return new SurgeryScheduleResult(false, null, null, $"Lỗi khi lên lịch phẫu thuật: {ex.Message}");
        }
    }

    #endregion

    #region Step 4: Chuẩn bị trước mổ

    /// <summary>
    /// Kiểm tra trước mổ (Pre-operative Check)
    /// - Xét nghiệm tiền phẫu (công thức máu, đông máu, nhóm máu)
    /// - ECG, X-quang ngực
    /// - Đánh giá ASA
    /// - Nhịn ăn uống
    /// </summary>
    public async Task<PreOpCheckResult> PerformPreOpCheckAsync(Guid surgeryScheduleId)
    {
        try
        {
            var schedule = await _unitOfWork.GetRepository<SurgerySchedule>()
                .Query()
                .Include(ss => ss.SurgeryRequest)
                    .ThenInclude(sr => sr!.Admission)
                .FirstOrDefaultAsync(ss => ss.Id == surgeryScheduleId && !ss.IsDeleted);

            if (schedule == null)
            {
                return new PreOpCheckResult(false, null, "Không tìm thấy lịch phẫu thuật");
            }

            var issues = new List<string>();

            // Check for required lab results
            var patientId = schedule.SurgeryRequest?.Admission?.PatientId;
            if (patientId.HasValue)
            {
                // Check blood type
                var bloodTypeResult = await _unitOfWork.GetRepository<LabResult>()
                    .Query()
                    .AnyAsync(lr => lr.PatientId == patientId && lr.TestCode == "BLOOD_TYPE" && !lr.IsDeleted);

                if (!bloodTypeResult)
                {
                    issues.Add("Thiếu kết quả xét nghiệm nhóm máu");
                }

                // Check coagulation tests
                var coagulationResult = await _unitOfWork.GetRepository<LabResult>()
                    .Query()
                    .AnyAsync(lr => lr.PatientId == patientId && lr.TestCode == "COAG" && !lr.IsDeleted);

                if (!coagulationResult)
                {
                    issues.Add("Thiếu kết quả xét nghiệm đông máu");
                }
            }

            // Create pre-op check record
            var preOpCheck = new PreOperativeCheck
            {
                Id = Guid.NewGuid(),
                SurgeryScheduleId = surgeryScheduleId,
                CheckedAt = DateTime.Now,
                IsPassed = issues.Count == 0,
                Issues = string.Join("; ", issues),
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<PreOperativeCheck>().AddAsync(preOpCheck);
            await _unitOfWork.SaveChangesAsync();

            return new PreOpCheckResult(issues.Count == 0, issues.Count > 0 ? issues : null,
                issues.Count == 0 ? "Đạt yêu cầu tiền phẫu" : "Cần bổ sung xét nghiệm tiền phẫu");
        }
        catch (Exception ex)
        {
            return new PreOpCheckResult(false, null, $"Lỗi khi kiểm tra tiền phẫu: {ex.Message}");
        }
    }

    /// <summary>
    /// Dự trù máu cho phẫu thuật
    /// - Xác định nhóm máu cần dùng
    /// - Liên kết với Module 9 (Kho Máu)
    /// - Cross-match máu trước mổ
    /// </summary>
    public async Task<BloodReservationResult> ReserveBloodAsync(Guid surgeryScheduleId, BloodReservationDto request)
    {
        try
        {
            var schedule = await _unitOfWork.GetRepository<SurgerySchedule>()
                .Query()
                .FirstOrDefaultAsync(ss => ss.Id == surgeryScheduleId && !ss.IsDeleted);

            if (schedule == null)
            {
                return new BloodReservationResult(false, null, "Không tìm thấy lịch phẫu thuật");
            }

            // Check blood availability from Blood Bank (Module 9)
            var availableUnits = await _unitOfWork.GetRepository<BloodUnit>()
                .Query()
                .Where(bu => bu.BloodType == request.BloodType
                    && !bu.IsDeleted
                    && bu.Status == "Available"
                    && bu.ExpiryDate > DateTime.Now)
                .Take(request.Units)
                .ToListAsync();

            if (availableUnits.Count < request.Units)
            {
                return new BloodReservationResult(false, null,
                    $"Không đủ máu {request.BloodType}. Có sẵn: {availableUnits.Count}, Cần: {request.Units}");
            }

            var reservedUnitIds = new List<Guid>();

            // Reserve blood units
            foreach (var unit in availableUnits)
            {
                unit.Status = "Reserved";
                unit.ReservedForSurgeryId = surgeryScheduleId;
                unit.UpdatedAt = DateTime.Now;
                reservedUnitIds.Add(unit.Id);
            }

            // Create blood reservation record
            var reservation = new BloodReservation
            {
                Id = Guid.NewGuid(),
                SurgeryScheduleId = surgeryScheduleId,
                BloodType = request.BloodType,
                Units = request.Units,
                Status = "Reserved",
                Note = request.Note,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<BloodReservation>().AddAsync(reservation);
            await _unitOfWork.SaveChangesAsync();

            return new BloodReservationResult(true, reservedUnitIds, $"Đã dự trù {request.Units} đơn vị máu {request.BloodType}");
        }
        catch (Exception ex)
        {
            return new BloodReservationResult(false, null, $"Lỗi khi dự trù máu: {ex.Message}");
        }
    }

    /// <summary>
    /// Chuẩn bị vật tư mổ
    /// - Liên kết với Module 5 (Kho Dược)
    /// - Xuất dự trù vật tư, thuốc mê
    /// </summary>
    public async Task<MaterialPreparationResult> PrepareMaterialsAsync(Guid surgeryScheduleId)
    {
        try
        {
            var schedule = await _unitOfWork.GetRepository<SurgerySchedule>()
                .Query()
                .Include(ss => ss.SurgeryRequest)
                    .ThenInclude(sr => sr!.Service)
                .FirstOrDefaultAsync(ss => ss.Id == surgeryScheduleId && !ss.IsDeleted);

            if (schedule == null)
            {
                return new MaterialPreparationResult(false, "Không tìm thấy lịch phẫu thuật");
            }

            // Get standard material list for this surgery type
            var materialTemplate = await _unitOfWork.GetRepository<SurgeryMaterialTemplate>()
                .Query()
                .Include(smt => smt.Items)
                .FirstOrDefaultAsync(smt => smt.ServiceId == schedule.SurgeryRequest!.ServiceId && !smt.IsDeleted);

            if (materialTemplate != null)
            {
                // Create material requisition from pharmacy (Module 5)
                var requisition = new MaterialRequisition
                {
                    Id = Guid.NewGuid(),
                    SurgeryScheduleId = surgeryScheduleId,
                    Status = "Pending",
                    CreatedAt = DateTime.Now
                };

                await _unitOfWork.GetRepository<MaterialRequisition>().AddAsync(requisition);

                foreach (var item in materialTemplate.Items)
                {
                    var reqItem = new MaterialRequisitionItem
                    {
                        Id = Guid.NewGuid(),
                        RequisitionId = requisition.Id,
                        ItemId = item.ItemId,
                        Quantity = item.Quantity,
                        CreatedAt = DateTime.Now
                    };
                    await _unitOfWork.GetRepository<MaterialRequisitionItem>().AddAsync(reqItem);
                }
            }

            // Update schedule status
            schedule.MaterialsPrepared = true;
            schedule.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new MaterialPreparationResult(true, "Đã chuẩn bị vật tư mổ thành công");
        }
        catch (Exception ex)
        {
            return new MaterialPreparationResult(false, $"Lỗi khi chuẩn bị vật tư: {ex.Message}");
        }
    }

    #endregion

    #region Step 5: Tiếp nhận vào phòng mổ

    /// <summary>
    /// Tiếp nhận bệnh nhân vào phòng mổ
    /// - Xác nhận danh tính bệnh nhân
    /// - Kiểm tra checklist an toàn phẫu thuật (WHO)
    /// - Ghi nhận thời gian vào phòng mổ
    /// </summary>
    public async Task<SurgeryAdmissionResult> AdmitToOperatingRoomAsync(Guid surgeryScheduleId)
    {
        try
        {
            var schedule = await _unitOfWork.GetRepository<SurgerySchedule>()
                .Query()
                .Include(ss => ss.SurgeryRequest)
                .FirstOrDefaultAsync(ss => ss.Id == surgeryScheduleId && !ss.IsDeleted);

            if (schedule == null)
            {
                return new SurgeryAdmissionResult(false, null, "Không tìm thấy lịch phẫu thuật");
            }

            if (schedule.Status != "Scheduled")
            {
                return new SurgeryAdmissionResult(false, null, $"Trạng thái không hợp lệ: {schedule.Status}");
            }

            // Create surgery record
            var surgery = new Surgery
            {
                Id = Guid.NewGuid(),
                SurgeryScheduleId = surgeryScheduleId,
                AdmissionId = schedule.SurgeryRequest!.AdmissionId,
                Status = "Admitted", // Admitted → Anesthesia → InProgress → Completed
                AdmittedAt = DateTime.Now,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<Surgery>().AddAsync(surgery);

            // Update schedule status
            schedule.Status = "InProgress";
            schedule.ActualStartTime = DateTime.Now;
            schedule.UpdatedAt = DateTime.Now;

            // Update surgery request
            schedule.SurgeryRequest.Status = "InProgress";
            schedule.SurgeryRequest.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new SurgeryAdmissionResult(true, DateTime.Now, "Đã tiếp nhận bệnh nhân vào phòng mổ");
        }
        catch (Exception ex)
        {
            return new SurgeryAdmissionResult(false, null, $"Lỗi khi tiếp nhận vào phòng mổ: {ex.Message}");
        }
    }

    #endregion

    #region Step 6: Thực hiện PTTT

    /// <summary>
    /// Ghi nhận thông tin gây mê/gây tê
    /// - Loại gây mê (toàn thân, tủy sống, ngoài màng cứng, tại chỗ)
    /// - Thuốc sử dụng
    /// - Theo dõi sinh hiệu trong mổ
    /// </summary>
    public async Task<AnesthesiaResult> RecordAnesthesiaAsync(Guid surgeryId, AnesthesiaRecordDto record)
    {
        try
        {
            var surgery = await _unitOfWork.GetRepository<Surgery>()
                .Query()
                .FirstOrDefaultAsync(s => s.Id == surgeryId && !s.IsDeleted);

            if (surgery == null)
            {
                return new AnesthesiaResult(false, null, "Không tìm thấy ca phẫu thuật");
            }

            // Create anesthesia record
            var anesthesia = new AnesthesiaRecord
            {
                Id = Guid.NewGuid(),
                SurgeryId = surgeryId,
                AnesthesiaType = record.AnesthesiaType, // General, Spinal, Epidural, Local
                StartTime = record.StartTime,
                EndTime = record.EndTime,
                Note = record.Note,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<AnesthesiaRecord>().AddAsync(anesthesia);

            // Update surgery status
            surgery.Status = "Anesthesia";
            surgery.AnesthesiaStartTime = record.StartTime;
            surgery.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new AnesthesiaResult(true, anesthesia.Id, "Đã ghi nhận thông tin gây mê");
        }
        catch (Exception ex)
        {
            return new AnesthesiaResult(false, null, $"Lỗi khi ghi nhận gây mê: {ex.Message}");
        }
    }

    /// <summary>
    /// Ghi nhận tiến trình phẫu thuật
    /// - Các bước thực hiện
    /// - Thời gian từng bước
    /// - Ghi chú đặc biệt
    /// </summary>
    public async Task<SurgeryProgressResult> RecordSurgeryProgressAsync(Guid surgeryId, SurgeryProgressDto progress)
    {
        try
        {
            var surgery = await _unitOfWork.GetRepository<Surgery>()
                .Query()
                .FirstOrDefaultAsync(s => s.Id == surgeryId && !s.IsDeleted);

            if (surgery == null)
            {
                return new SurgeryProgressResult(false, "Không tìm thấy ca phẫu thuật");
            }

            // Create progress record
            var progressRecord = new SurgeryProgress
            {
                Id = Guid.NewGuid(),
                SurgeryId = surgeryId,
                Stage = progress.Stage,
                Description = progress.Description,
                RecordedAt = progress.Time,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<SurgeryProgress>().AddAsync(progressRecord);

            // Update surgery status if needed
            if (progress.Stage == "Incision")
            {
                surgery.Status = "InProgress";
                surgery.IncisionTime = progress.Time;
            }

            surgery.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new SurgeryProgressResult(true, $"Đã ghi nhận: {progress.Stage}");
        }
        catch (Exception ex)
        {
            return new SurgeryProgressResult(false, $"Lỗi khi ghi nhận tiến trình: {ex.Message}");
        }
    }

    /// <summary>
    /// Ghi nhận vật tư tiêu hao trong mổ
    /// - Thuốc, vật tư y tế sử dụng
    /// - Liên kết với Module 5 (Kho Dược) để xuất kho
    /// </summary>
    public async Task<IntraOpMaterialResult> RecordIntraOpMaterialsAsync(Guid surgeryId, List<MaterialUsageDto> materials)
    {
        try
        {
            var surgery = await _unitOfWork.GetRepository<Surgery>()
                .Query()
                .FirstOrDefaultAsync(s => s.Id == surgeryId && !s.IsDeleted);

            if (surgery == null)
            {
                return new IntraOpMaterialResult(false, "Không tìm thấy ca phẫu thuật");
            }

            foreach (var material in materials)
            {
                // Record material usage
                var usage = new SurgeryMaterialUsage
                {
                    Id = Guid.NewGuid(),
                    SurgeryId = surgeryId,
                    ItemId = material.ItemId,
                    Quantity = material.Quantity,
                    Note = material.Note,
                    CreatedAt = DateTime.Now
                };

                await _unitOfWork.GetRepository<SurgeryMaterialUsage>().AddAsync(usage);

                // Create stock transaction (Module 5)
                var stockTransaction = new StockTransaction
                {
                    Id = Guid.NewGuid(),
                    ItemId = material.ItemId,
                    TransactionType = "SurgeryConsumption",
                    Quantity = -material.Quantity,
                    ReferenceId = surgeryId,
                    ReferenceType = "Surgery",
                    TransactionDate = DateTime.Now,
                    CreatedAt = DateTime.Now
                };

                await _unitOfWork.GetRepository<StockTransaction>().AddAsync(stockTransaction);
            }

            await _unitOfWork.SaveChangesAsync();

            return new IntraOpMaterialResult(true, $"Đã ghi nhận {materials.Count} loại vật tư");
        }
        catch (Exception ex)
        {
            return new IntraOpMaterialResult(false, $"Lỗi khi ghi nhận vật tư: {ex.Message}");
        }
    }

    #endregion

    #region Step 7: Kết thúc PTTT

    /// <summary>
    /// Hoàn thành phẫu thuật
    /// - Ghi nhận kết quả phẫu thuật
    /// - Chẩn đoán sau mổ
    /// - Biến chứng (nếu có)
    /// </summary>
    public async Task<SurgeryCompletionResult> CompleteSurgeryAsync(Guid surgeryId, SurgeryCompletionDto completion)
    {
        try
        {
            var surgery = await _unitOfWork.GetRepository<Surgery>()
                .Query()
                .Include(s => s.SurgerySchedule)
                .FirstOrDefaultAsync(s => s.Id == surgeryId && !s.IsDeleted);

            if (surgery == null)
            {
                return new SurgeryCompletionResult(false, "Không tìm thấy ca phẫu thuật");
            }

            // Update surgery record
            surgery.Status = "Completed";
            surgery.EndTime = completion.EndTime;
            surgery.Findings = completion.Findings;
            surgery.Procedure = completion.Procedure;
            surgery.Complications = completion.Complications;
            surgery.UpdatedAt = DateTime.Now;

            // Update schedule
            if (surgery.SurgerySchedule != null)
            {
                surgery.SurgerySchedule.Status = "Completed";
                surgery.SurgerySchedule.ActualEndTime = completion.EndTime;
                surgery.SurgerySchedule.UpdatedAt = DateTime.Now;
            }

            await _unitOfWork.SaveChangesAsync();

            return new SurgeryCompletionResult(true, "Đã hoàn thành phẫu thuật");
        }
        catch (Exception ex)
        {
            return new SurgeryCompletionResult(false, $"Lỗi khi hoàn thành phẫu thuật: {ex.Message}");
        }
    }

    /// <summary>
    /// Chuyển bệnh nhân đến phòng hồi tỉnh
    /// - Theo dõi sau mổ
    /// - Điểm Aldrete để đánh giá hồi tỉnh
    /// </summary>
    public async Task<RecoveryResult> TransferToRecoveryAsync(Guid surgeryId)
    {
        try
        {
            var surgery = await _unitOfWork.GetRepository<Surgery>()
                .Query()
                .FirstOrDefaultAsync(s => s.Id == surgeryId && !s.IsDeleted && s.Status == "Completed");

            if (surgery == null)
            {
                return new RecoveryResult(false, null, "Không tìm thấy ca phẫu thuật đã hoàn thành");
            }

            // Create recovery record
            var recovery = new PostOperativeRecovery
            {
                Id = Guid.NewGuid(),
                SurgeryId = surgeryId,
                AdmittedAt = DateTime.Now,
                Status = "InRecovery", // InRecovery → Stable → Transferred
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<PostOperativeRecovery>().AddAsync(recovery);

            // Update surgery
            surgery.Status = "InRecovery";
            surgery.RecoveryStartTime = DateTime.Now;
            surgery.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new RecoveryResult(true, recovery.Id, "Đã chuyển bệnh nhân đến phòng hồi tỉnh");
        }
        catch (Exception ex)
        {
            return new RecoveryResult(false, null, $"Lỗi khi chuyển phòng hồi tỉnh: {ex.Message}");
        }
    }

    /// <summary>
    /// Chuyển bệnh nhân về khoa lâm sàng
    /// - Bệnh nhân ổn định sau hồi tỉnh
    /// - Bàn giao cho khoa điều trị
    /// </summary>
    public async Task<WardTransferResult> TransferToWardAsync(Guid surgeryId)
    {
        try
        {
            var surgery = await _unitOfWork.GetRepository<Surgery>()
                .Query()
                .Include(s => s.PostOperativeRecovery)
                .FirstOrDefaultAsync(s => s.Id == surgeryId && !s.IsDeleted);

            if (surgery == null)
            {
                return new WardTransferResult(false, null, "Không tìm thấy ca phẫu thuật");
            }

            // Update recovery record
            if (surgery.PostOperativeRecovery != null)
            {
                surgery.PostOperativeRecovery.Status = "Transferred";
                surgery.PostOperativeRecovery.DischargedAt = DateTime.Now;
                surgery.PostOperativeRecovery.UpdatedAt = DateTime.Now;
            }

            // Update surgery status
            surgery.Status = "TransferredToWard";
            surgery.RecoveryEndTime = DateTime.Now;
            surgery.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new WardTransferResult(true, DateTime.Now, "Đã chuyển bệnh nhân về khoa điều trị");
        }
        catch (Exception ex)
        {
            return new WardTransferResult(false, null, $"Lỗi khi chuyển về khoa: {ex.Message}");
        }
    }

    #endregion

    #region Step 8: Tính chi phí

    /// <summary>
    /// Tính chi phí phẫu thuật
    /// - Chi phí dịch vụ PTTT
    /// - Chi phí vật tư, thuốc sử dụng
    /// - Chi phí máu truyền (nếu có)
    /// - Liên kết với Module 11 (Tài chính)
    /// </summary>
    public async Task<SurgeryCostResult> CalculateSurgeryCostAsync(Guid surgeryId)
    {
        try
        {
            var surgery = await _unitOfWork.GetRepository<Surgery>()
                .Query()
                .Include(s => s.SurgerySchedule)
                    .ThenInclude(ss => ss!.SurgeryRequest)
                        .ThenInclude(sr => sr!.Service)
                .Include(s => s.MaterialUsages)
                    .ThenInclude(mu => mu.Item)
                .FirstOrDefaultAsync(s => s.Id == surgeryId && !s.IsDeleted);

            if (surgery == null)
            {
                return new SurgeryCostResult(false, null, "Không tìm thấy ca phẫu thuật");
            }

            decimal totalCost = 0;

            // Surgery service cost
            var servicePrice = surgery.SurgerySchedule?.SurgeryRequest?.Service?.Price ?? 0;
            totalCost += servicePrice;

            // Material costs
            foreach (var usage in surgery.MaterialUsages)
            {
                totalCost += (usage.Item?.Price ?? 0) * usage.Quantity;
            }

            // Blood costs (if any)
            var bloodCost = await _unitOfWork.GetRepository<BloodUsage>()
                .Query()
                .Where(bu => bu.SurgeryId == surgeryId && !bu.IsDeleted)
                .SumAsync(bu => bu.Cost);

            totalCost += bloodCost;

            // Create cost record
            var costRecord = new SurgeryCost
            {
                Id = Guid.NewGuid(),
                SurgeryId = surgeryId,
                ServiceCost = servicePrice,
                MaterialCost = surgery.MaterialUsages.Sum(mu => (mu.Item?.Price ?? 0) * mu.Quantity),
                BloodCost = bloodCost,
                TotalCost = totalCost,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<SurgeryCost>().AddAsync(costRecord);
            await _unitOfWork.SaveChangesAsync();

            return new SurgeryCostResult(true, totalCost, "Đã tính chi phí phẫu thuật");
        }
        catch (Exception ex)
        {
            return new SurgeryCostResult(false, null, $"Lỗi khi tính chi phí: {ex.Message}");
        }
    }

    /// <summary>
    /// Tính công ekip phẫu thuật
    /// - Phân chia theo vai trò (Phẫu thuật viên chính, phụ mổ, gây mê...)
    /// - Tính theo hệ số và loại phẫu thuật
    /// - Liên kết với Module 11 (Tài chính)
    /// </summary>
    public async Task<TeamFeeResult> CalculateTeamFeeAsync(Guid surgeryId)
    {
        try
        {
            var surgery = await _unitOfWork.GetRepository<Surgery>()
                .Query()
                .Include(s => s.SurgerySchedule)
                    .ThenInclude(ss => ss!.TeamMembers)
                .Include(s => s.SurgerySchedule)
                    .ThenInclude(ss => ss!.SurgeryRequest)
                        .ThenInclude(sr => sr!.Service)
                .FirstOrDefaultAsync(s => s.Id == surgeryId && !s.IsDeleted);

            if (surgery == null)
            {
                return new TeamFeeResult(false, null, "Không tìm thấy ca phẫu thuật");
            }

            decimal totalFee = 0;
            var baseFee = surgery.SurgerySchedule?.SurgeryRequest?.Service?.Price ?? 0;

            // Calculate fees for each team member based on role
            foreach (var member in surgery.SurgerySchedule?.TeamMembers ?? new List<SurgeryTeamMember>())
            {
                decimal memberFee = member.Role switch
                {
                    "MainSurgeon" => baseFee * 0.40m,      // Phẫu thuật viên chính: 40%
                    "AssistantSurgeon" => baseFee * 0.15m, // Phụ mổ: 15%
                    "Anesthesiologist" => baseFee * 0.20m, // Gây mê: 20%
                    "ScrubNurse" => baseFee * 0.10m,       // Điều dưỡng dụng cụ: 10%
                    "CirculatingNurse" => baseFee * 0.08m, // Điều dưỡng vòng ngoài: 8%
                    _ => baseFee * 0.05m                   // Khác: 5%
                };

                // Create team member fee record
                var teamFee = new SurgeryTeamFee
                {
                    Id = Guid.NewGuid(),
                    SurgeryId = surgeryId,
                    UserId = member.UserId,
                    Role = member.Role,
                    Fee = memberFee,
                    CreatedAt = DateTime.Now
                };

                await _unitOfWork.GetRepository<SurgeryTeamFee>().AddAsync(teamFee);
                totalFee += memberFee;
            }

            await _unitOfWork.SaveChangesAsync();

            return new TeamFeeResult(true, totalFee, "Đã tính công ekip phẫu thuật");
        }
        catch (Exception ex)
        {
            return new TeamFeeResult(false, null, $"Lỗi khi tính công ekip: {ex.Message}");
        }
    }

    #endregion
}
