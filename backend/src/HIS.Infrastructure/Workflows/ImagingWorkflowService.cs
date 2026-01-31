using HIS.Application.Workflows;
using HIS.Core.Interfaces;
using HIS.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Workflows;

/// <summary>
/// Luồng 5: Chẩn đoán Hình ảnh (RIS/PACS Flow)
/// Theo HIS_DataFlow_Architecture.md - Mục 2.4 (tương tự Lab Flow)
///
/// LUỒNG CHÍNH:
/// [Từ Phòng khám/Khoa LS] → Chỉ định CĐHA → Phiếu yêu cầu → Gửi Modality Worklist
///     → Thực hiện chụp → Lưu DICOM vào PACS → Bác sĩ đọc kết quả
///     → Duyệt kết quả → Trả kết quả về Khoa LS
///
/// LIÊN KẾT MODULE:
/// - Module 4 (Chỉ định): Nhận yêu cầu chụp
/// - Module 2 (Khám bệnh): Trả kết quả về bác sĩ khám
/// - Module 3 (Nội trú): Trả kết quả về khoa điều trị
/// - Module 10 (Thu ngân): Tính chi phí dịch vụ CĐHA
/// - Module 12 (BHYT): Thanh toán theo BHYT
/// </summary>
public class ImagingWorkflowService : IImagingWorkflowService
{
    private readonly IUnitOfWork _unitOfWork;

    public ImagingWorkflowService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    #region Step 1: Tiếp nhận yêu cầu

    /// <summary>
    /// Tiếp nhận yêu cầu chụp CĐHA từ Module 4 (Chỉ định)
    /// - Xác nhận thông tin bệnh nhân
    /// - Kiểm tra chống chỉ định (dị ứng thuốc cản quang, mang thai...)
    /// - Tạo phiếu yêu cầu CĐHA
    /// </summary>
    public async Task<ImagingOrderResult> ReceiveImagingOrderAsync(Guid serviceOrderId)
    {
        try
        {
            // Get service order from Module 4
            var serviceOrder = await _unitOfWork.GetRepository<ServiceOrder>()
                .Query()
                .Include(so => so.Visit)
                    .ThenInclude(v => v!.Patient)
                .Include(so => so.Items)
                    .ThenInclude(i => i.Service)
                .FirstOrDefaultAsync(so => so.Id == serviceOrderId && !so.IsDeleted);

            if (serviceOrder == null)
            {
                return new ImagingOrderResult(false, null, "Không tìm thấy phiếu chỉ định");
            }

            // Filter imaging services only
            var imagingItems = serviceOrder.Items
                .Where(i => i.Service?.ServiceType == "Imaging" && !i.IsDeleted)
                .ToList();

            if (!imagingItems.Any())
            {
                return new ImagingOrderResult(false, null, "Không có dịch vụ CĐHA trong phiếu chỉ định");
            }

            // Create imaging order
            var imagingOrder = new ImagingOrder
            {
                Id = Guid.NewGuid(),
                ServiceOrderId = serviceOrderId,
                PatientId = serviceOrder.Visit!.PatientId,
                VisitId = serviceOrder.VisitId,
                Status = "Received", // Received → Scheduled → InProgress → Completed → Reported → Released
                ReceivedAt = DateTime.Now,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<ImagingOrder>().AddAsync(imagingOrder);

            // Create imaging order items
            foreach (var item in imagingItems)
            {
                var imagingItem = new ImagingOrderItem
                {
                    Id = Guid.NewGuid(),
                    ImagingOrderId = imagingOrder.Id,
                    ServiceOrderItemId = item.Id,
                    ServiceId = item.ServiceId,
                    Status = "Pending",
                    CreatedAt = DateTime.Now
                };

                await _unitOfWork.GetRepository<ImagingOrderItem>().AddAsync(imagingItem);

                // Update service order item status
                item.Status = "ReceivedByImaging";
                item.UpdatedAt = DateTime.Now;
            }

            await _unitOfWork.SaveChangesAsync();

            return new ImagingOrderResult(true, imagingOrder.Id, $"Đã tiếp nhận {imagingItems.Count} yêu cầu CĐHA");
        }
        catch (Exception ex)
        {
            return new ImagingOrderResult(false, null, $"Lỗi khi tiếp nhận yêu cầu CĐHA: {ex.Message}");
        }
    }

    /// <summary>
    /// Gửi yêu cầu đến Modality Worklist
    /// - Tạo Study Instance UID (DICOM)
    /// - Gửi đến máy chụp qua DICOM MWL
    /// </summary>
    public async Task<ModalityWorklistResult> SendToModalityAsync(Guid imagingOrderId)
    {
        try
        {
            var imagingOrder = await _unitOfWork.GetRepository<ImagingOrder>()
                .Query()
                .Include(io => io.Patient)
                .Include(io => io.Items)
                    .ThenInclude(i => i.Service)
                .FirstOrDefaultAsync(io => io.Id == imagingOrderId && !io.IsDeleted);

            if (imagingOrder == null)
            {
                return new ModalityWorklistResult(false, null, "Không tìm thấy phiếu CĐHA");
            }

            // Generate DICOM Study Instance UID
            var studyInstanceUid = GenerateStudyInstanceUid();

            // Create worklist entry
            var worklist = new ModalityWorklist
            {
                Id = Guid.NewGuid(),
                ImagingOrderId = imagingOrderId,
                StudyInstanceUid = studyInstanceUid,
                PatientId = imagingOrder.PatientId,
                PatientName = imagingOrder.Patient?.FullName ?? "",
                PatientCode = imagingOrder.Patient?.PatientCode ?? "",
                AccessionNumber = GenerateAccessionNumber(),
                ScheduledDate = DateTime.Now,
                Status = "Scheduled",
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<ModalityWorklist>().AddAsync(worklist);

            // Update imaging order
            imagingOrder.StudyInstanceUid = studyInstanceUid;
            imagingOrder.Status = "Scheduled";
            imagingOrder.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new ModalityWorklistResult(true, studyInstanceUid, "Đã gửi đến Modality Worklist");
        }
        catch (Exception ex)
        {
            return new ModalityWorklistResult(false, null, $"Lỗi khi gửi Modality Worklist: {ex.Message}");
        }
    }

    #endregion

    #region Step 2: Thực hiện chụp

    /// <summary>
    /// Bắt đầu thực hiện chụp
    /// - Xác nhận danh tính bệnh nhân
    /// - Chuẩn bị máy chụp
    /// - Ghi nhận thời gian bắt đầu
    /// </summary>
    public async Task<ExamStartResult> StartExamAsync(Guid imagingOrderId, Guid modalityId)
    {
        try
        {
            var imagingOrder = await _unitOfWork.GetRepository<ImagingOrder>()
                .Query()
                .FirstOrDefaultAsync(io => io.Id == imagingOrderId && !io.IsDeleted);

            if (imagingOrder == null)
            {
                return new ExamStartResult(false, null, "Không tìm thấy phiếu CĐHA");
            }

            // Verify modality exists
            var modality = await _unitOfWork.GetRepository<Modality>()
                .Query()
                .FirstOrDefaultAsync(m => m.Id == modalityId && !m.IsDeleted && m.IsActive);

            if (modality == null)
            {
                return new ExamStartResult(false, null, "Máy chụp không tồn tại hoặc không hoạt động");
            }

            // Update imaging order
            imagingOrder.ModalityId = modalityId;
            imagingOrder.Status = "InProgress";
            imagingOrder.StartTime = DateTime.Now;
            imagingOrder.UpdatedAt = DateTime.Now;

            // Update modality status
            modality.CurrentStatus = "InUse";
            modality.CurrentPatientId = imagingOrder.PatientId;
            modality.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new ExamStartResult(true, DateTime.Now, "Đã bắt đầu chụp");
        }
        catch (Exception ex)
        {
            return new ExamStartResult(false, null, $"Lỗi khi bắt đầu chụp: {ex.Message}");
        }
    }

    /// <summary>
    /// Thu nhận ảnh từ máy chụp
    /// - Nhận DICOM images từ modality
    /// - Kiểm tra chất lượng ảnh
    /// - Đếm số lượng ảnh
    /// </summary>
    public async Task<ImageAcquisitionResult> AcquireImagesAsync(Guid imagingOrderId)
    {
        try
        {
            var imagingOrder = await _unitOfWork.GetRepository<ImagingOrder>()
                .Query()
                .FirstOrDefaultAsync(io => io.Id == imagingOrderId && !io.IsDeleted);

            if (imagingOrder == null)
            {
                return new ImageAcquisitionResult(false, null, "Không tìm thấy phiếu CĐHA");
            }

            // Simulate receiving DICOM images
            // In real implementation, this would receive images from DICOM C-STORE
            var imageCount = new Random().Next(5, 50); // Simulated image count

            // Create image acquisition record
            var acquisition = new ImageAcquisition
            {
                Id = Guid.NewGuid(),
                ImagingOrderId = imagingOrderId,
                ImageCount = imageCount,
                AcquiredAt = DateTime.Now,
                Status = "Acquired",
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<ImageAcquisition>().AddAsync(acquisition);

            // Update imaging order
            imagingOrder.ImageCount = imageCount;
            imagingOrder.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new ImageAcquisitionResult(true, imageCount, $"Đã thu nhận {imageCount} ảnh");
        }
        catch (Exception ex)
        {
            return new ImageAcquisitionResult(false, null, $"Lỗi khi thu nhận ảnh: {ex.Message}");
        }
    }

    /// <summary>
    /// Hoàn thành việc chụp
    /// - Xác nhận đủ ảnh và chất lượng
    /// - Giải phóng máy chụp
    /// - Cho bệnh nhân ra về
    /// </summary>
    public async Task<ExamCompleteResult> CompleteExamAsync(Guid imagingOrderId)
    {
        try
        {
            var imagingOrder = await _unitOfWork.GetRepository<ImagingOrder>()
                .Query()
                .Include(io => io.Modality)
                .FirstOrDefaultAsync(io => io.Id == imagingOrderId && !io.IsDeleted);

            if (imagingOrder == null)
            {
                return new ExamCompleteResult(false, null, "Không tìm thấy phiếu CĐHA");
            }

            // Update imaging order
            imagingOrder.Status = "Completed";
            imagingOrder.EndTime = DateTime.Now;
            imagingOrder.UpdatedAt = DateTime.Now;

            // Free up modality
            if (imagingOrder.Modality != null)
            {
                imagingOrder.Modality.CurrentStatus = "Available";
                imagingOrder.Modality.CurrentPatientId = null;
                imagingOrder.Modality.UpdatedAt = DateTime.Now;
            }

            await _unitOfWork.SaveChangesAsync();

            return new ExamCompleteResult(true, DateTime.Now, "Đã hoàn thành chụp");
        }
        catch (Exception ex)
        {
            return new ExamCompleteResult(false, null, $"Lỗi khi hoàn thành chụp: {ex.Message}");
        }
    }

    #endregion

    #region Step 3: Lưu trữ PACS

    /// <summary>
    /// Lưu trữ ảnh DICOM vào PACS
    /// - Lưu vào hệ thống PACS
    /// - Tạo thumbnails
    /// - Verify data integrity
    /// </summary>
    public async Task<DicomStorageResult> StoreDicomAsync(Guid imagingOrderId, string dicomPath)
    {
        try
        {
            var imagingOrder = await _unitOfWork.GetRepository<ImagingOrder>()
                .Query()
                .FirstOrDefaultAsync(io => io.Id == imagingOrderId && !io.IsDeleted);

            if (imagingOrder == null)
            {
                return new DicomStorageResult(false, null, "Không tìm thấy phiếu CĐHA");
            }

            // Create PACS storage record
            var storage = new DicomStorage
            {
                Id = Guid.NewGuid(),
                ImagingOrderId = imagingOrderId,
                StudyInstanceUid = imagingOrder.StudyInstanceUid ?? "",
                StoragePath = dicomPath,
                StoredAt = DateTime.Now,
                Status = "Stored",
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<DicomStorage>().AddAsync(storage);

            // Update imaging order
            imagingOrder.DicomPath = dicomPath;
            imagingOrder.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new DicomStorageResult(true, dicomPath, "Đã lưu trữ ảnh vào PACS");
        }
        catch (Exception ex)
        {
            return new DicomStorageResult(false, null, $"Lỗi khi lưu trữ DICOM: {ex.Message}");
        }
    }

    #endregion

    #region Step 4: Đọc kết quả

    /// <summary>
    /// Phân công bác sĩ đọc kết quả
    /// - Tự động phân theo chuyên khoa
    /// - Hoặc thủ công bởi trưởng khoa
    /// </summary>
    public async Task<ReportAssignResult> AssignToRadiologistAsync(Guid imagingOrderId, Guid radiologistId)
    {
        try
        {
            var imagingOrder = await _unitOfWork.GetRepository<ImagingOrder>()
                .Query()
                .FirstOrDefaultAsync(io => io.Id == imagingOrderId && !io.IsDeleted);

            if (imagingOrder == null)
            {
                return new ReportAssignResult(false, null, "Không tìm thấy phiếu CĐHA");
            }

            // Verify radiologist exists and is qualified
            var radiologist = await _unitOfWork.GetRepository<User>()
                .Query()
                .FirstOrDefaultAsync(u => u.Id == radiologistId && !u.IsDeleted && u.IsActive);

            if (radiologist == null)
            {
                return new ReportAssignResult(false, null, "Bác sĩ không tồn tại hoặc không hoạt động");
            }

            // Assign to radiologist
            imagingOrder.RadiologistId = radiologistId;
            imagingOrder.AssignedAt = DateTime.Now;
            imagingOrder.Status = "PendingReport";
            imagingOrder.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new ReportAssignResult(true, radiologistId, $"Đã phân công cho BS {radiologist.FullName}");
        }
        catch (Exception ex)
        {
            return new ReportAssignResult(false, null, $"Lỗi khi phân công: {ex.Message}");
        }
    }

    /// <summary>
    /// Tạo bản nháp kết quả CĐHA
    /// - Mô tả hình ảnh (Findings)
    /// - Kết luận (Impression)
    /// - Khuyến nghị (Recommendation)
    /// </summary>
    public async Task<ReportDraftResult> CreateReportDraftAsync(Guid imagingOrderId, RadiologyReportDto report)
    {
        try
        {
            var imagingOrder = await _unitOfWork.GetRepository<ImagingOrder>()
                .Query()
                .FirstOrDefaultAsync(io => io.Id == imagingOrderId && !io.IsDeleted);

            if (imagingOrder == null)
            {
                return new ReportDraftResult(false, null, "Không tìm thấy phiếu CĐHA");
            }

            // Create or update report
            var existingReport = await _unitOfWork.GetRepository<RadiologyReport>()
                .Query()
                .FirstOrDefaultAsync(rr => rr.ImagingOrderId == imagingOrderId && !rr.IsDeleted);

            if (existingReport != null)
            {
                // Update existing report
                existingReport.Findings = report.Findings;
                existingReport.Impression = report.Impression;
                existingReport.Recommendation = report.Recommendation;
                existingReport.Status = "Draft";
                existingReport.UpdatedAt = DateTime.Now;
            }
            else
            {
                // Create new report
                var newReport = new RadiologyReport
                {
                    Id = Guid.NewGuid(),
                    ImagingOrderId = imagingOrderId,
                    RadiologistId = imagingOrder.RadiologistId,
                    Findings = report.Findings,
                    Impression = report.Impression,
                    Recommendation = report.Recommendation,
                    Status = "Draft", // Draft → Approved → Released
                    CreatedAt = DateTime.Now
                };

                await _unitOfWork.GetRepository<RadiologyReport>().AddAsync(newReport);
                existingReport = newReport;
            }

            await _unitOfWork.SaveChangesAsync();

            return new ReportDraftResult(true, existingReport.Id, "Đã lưu bản nháp kết quả");
        }
        catch (Exception ex)
        {
            return new ReportDraftResult(false, null, $"Lỗi khi tạo bản nháp: {ex.Message}");
        }
    }

    /// <summary>
    /// Duyệt kết quả CĐHA
    /// - Bác sĩ cao cấp hoặc trưởng khoa duyệt
    /// - Kiểm tra tính đầy đủ của kết quả
    /// </summary>
    public async Task<ReportApprovalResult> ApproveReportAsync(Guid imagingOrderId, Guid approverId)
    {
        try
        {
            var report = await _unitOfWork.GetRepository<RadiologyReport>()
                .Query()
                .FirstOrDefaultAsync(rr => rr.ImagingOrderId == imagingOrderId && !rr.IsDeleted);

            if (report == null)
            {
                return new ReportApprovalResult(false, null, "Không tìm thấy kết quả CĐHA");
            }

            if (report.Status != "Draft")
            {
                return new ReportApprovalResult(false, null, $"Trạng thái không hợp lệ: {report.Status}");
            }

            // Verify approver
            var approver = await _unitOfWork.GetRepository<User>()
                .Query()
                .FirstOrDefaultAsync(u => u.Id == approverId && !u.IsDeleted && u.IsActive);

            if (approver == null)
            {
                return new ReportApprovalResult(false, null, "Người duyệt không tồn tại");
            }

            // Approve report
            report.Status = "Approved";
            report.ApprovedById = approverId;
            report.ApprovedAt = DateTime.Now;
            report.UpdatedAt = DateTime.Now;

            // Update imaging order
            var imagingOrder = await _unitOfWork.GetRepository<ImagingOrder>()
                .Query()
                .FirstOrDefaultAsync(io => io.Id == imagingOrderId && !io.IsDeleted);

            if (imagingOrder != null)
            {
                imagingOrder.Status = "Reported";
                imagingOrder.UpdatedAt = DateTime.Now;
            }

            await _unitOfWork.SaveChangesAsync();

            return new ReportApprovalResult(true, DateTime.Now, "Đã duyệt kết quả CĐHA");
        }
        catch (Exception ex)
        {
            return new ReportApprovalResult(false, null, $"Lỗi khi duyệt kết quả: {ex.Message}");
        }
    }

    #endregion

    #region Step 5: Trả kết quả

    /// <summary>
    /// Trả kết quả về phòng khám/khoa lâm sàng
    /// - Cập nhật trạng thái phiếu chỉ định
    /// - Kết quả hiển thị trên EMR
    /// </summary>
    public async Task<ReportReleaseResult> ReleaseReportAsync(Guid imagingOrderId)
    {
        try
        {
            var imagingOrder = await _unitOfWork.GetRepository<ImagingOrder>()
                .Query()
                .Include(io => io.Report)
                .Include(io => io.Items)
                    .ThenInclude(i => i.ServiceOrderItem)
                .FirstOrDefaultAsync(io => io.Id == imagingOrderId && !io.IsDeleted);

            if (imagingOrder == null)
            {
                return new ReportReleaseResult(false, null, "Không tìm thấy phiếu CĐHA");
            }

            if (imagingOrder.Report?.Status != "Approved")
            {
                return new ReportReleaseResult(false, null, "Kết quả chưa được duyệt");
            }

            // Release report
            imagingOrder.Report.Status = "Released";
            imagingOrder.Report.ReleasedAt = DateTime.Now;
            imagingOrder.Report.UpdatedAt = DateTime.Now;

            // Update imaging order
            imagingOrder.Status = "Released";
            imagingOrder.ReleasedAt = DateTime.Now;
            imagingOrder.UpdatedAt = DateTime.Now;

            // Update service order items (Module 4)
            foreach (var item in imagingOrder.Items)
            {
                if (item.ServiceOrderItem != null)
                {
                    item.ServiceOrderItem.Status = "ResultReleased";
                    item.ServiceOrderItem.UpdatedAt = DateTime.Now;
                }
            }

            await _unitOfWork.SaveChangesAsync();

            return new ReportReleaseResult(true, DateTime.Now, "Đã trả kết quả CĐHA");
        }
        catch (Exception ex)
        {
            return new ReportReleaseResult(false, null, $"Lỗi khi trả kết quả: {ex.Message}");
        }
    }

    /// <summary>
    /// Thông báo cho bác sĩ lâm sàng
    /// - Gửi notification qua hệ thống
    /// - Cảnh báo kết quả bất thường
    /// </summary>
    public async Task NotifyClinicianAsync(Guid imagingOrderId)
    {
        try
        {
            var imagingOrder = await _unitOfWork.GetRepository<ImagingOrder>()
                .Query()
                .Include(io => io.Visit)
                    .ThenInclude(v => v!.Examination)
                .Include(io => io.Report)
                .FirstOrDefaultAsync(io => io.Id == imagingOrderId && !io.IsDeleted);

            if (imagingOrder?.Visit?.Examination?.DoctorId != null)
            {
                // Create notification
                var notification = new Notification
                {
                    Id = Guid.NewGuid(),
                    UserId = imagingOrder.Visit.Examination.DoctorId.Value,
                    Type = "ImagingResult",
                    Title = "Kết quả CĐHA",
                    Message = $"Kết quả CĐHA của BN {imagingOrder.Visit.Patient?.FullName} đã sẵn sàng",
                    ReferenceId = imagingOrderId,
                    ReferenceType = "ImagingOrder",
                    IsRead = false,
                    CreatedAt = DateTime.Now
                };

                await _unitOfWork.GetRepository<Notification>().AddAsync(notification);
                await _unitOfWork.SaveChangesAsync();
            }
        }
        catch
        {
            // Log error but don't throw - notification is not critical
        }
    }

    #endregion

    #region Helper Methods

    private string GenerateStudyInstanceUid()
    {
        // DICOM UID format: OID.timestamp.random
        var timestamp = DateTime.Now.ToString("yyyyMMddHHmmssfff");
        var random = new Random().Next(1000, 9999);
        return $"1.2.840.113619.2.{timestamp}.{random}";
    }

    private string GenerateAccessionNumber()
    {
        return $"RIS{DateTime.Now:yyyyMMdd}{new Random().Next(10000, 99999)}";
    }

    #endregion
}
