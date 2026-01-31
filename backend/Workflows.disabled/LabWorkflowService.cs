using Microsoft.EntityFrameworkCore;
using HIS.Application.Workflows;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Workflows;

/// <summary>
/// Luồng Xét nghiệm (Lab Flow) - Module 7
///
/// FLOW: Chỉ định → LIS → Kho Dược (vật tư) → Khám bệnh/Nội trú
///
/// [Từ Phòng khám/Khoa LS]
///      │
///      ▼
/// ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
/// │ 4. CHỈ ĐỊNH │────▶│ Phiếu yêu  │────▶│ Gửi Worklist│
/// │             │     │ cầu XN     │     │ (2-way LIS) │
/// └─────────────┘     └─────────────┘     └──────┬──────┘
///                                                │
///                                                ▼
/// ┌─────────────────────────────────────────────────────────────────────────────────┐
/// │                            7. XÉT NGHIỆM (LIS)                                  │
/// ├─────────────────────────────────────────────────────────────────────────────────┤
/// │                                                                                  │
/// │  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                        │
/// │  │ Lấy mẫu    │────▶│ In Barcode │────▶│ Tiếp nhận  │                        │
/// │  │ bệnh phẩm  │     │ ống nghiệm │     │ mẫu        │                        │
/// │  └─────────────┘     └─────────────┘     └──────┬──────┘                        │
/// │                                                 │                               │
/// │       ┌─────────────────────────────────────────┘                               │
/// │       │                                                                         │
/// │       ▼                                                                         │
/// │  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                        │
/// │  │ Chạy máy   │────▶│ Nhận KQ từ │────▶│ Duyệt KQ   │                        │
/// │  │ XN         │     │ máy (Auto) │     │ (BS XN)    │                        │
/// │  └─────────────┘     └─────────────┘     └──────┬──────┘                        │
/// │                             │                   │                               │
/// │                             ▼                   │                               │
/// │                      ┌─────────────┐            │                               │
/// │                      │ Cảnh báo   │            │                               │
/// │                      │ bất thường │            │                               │
/// │                      └─────────────┘            │                               │
/// │                                                 │                               │
/// └─────────────────────────────────────────────────┼───────────────────────────────┘
///                                                   │
///                                                   ▼
///                                            ┌─────────────┐
///                                            │ Trả KQ về  │
///                                            │ Khoa LS    │
///                                            └─────────────┘
/// </summary>
public class LabWorkflowService : ILabWorkflowService
{
    private readonly HISDbContext _context;

    public LabWorkflowService(HISDbContext context)
    {
        _context = context;
    }

    #region Step 1: Tiếp nhận yêu cầu

    /// <summary>
    /// Tiếp nhận yêu cầu xét nghiệm từ chỉ định
    /// </summary>
    public async Task<LabOrderResult> ReceiveLabOrderAsync(Guid serviceOrderId)
    {
        var serviceRequest = await _context.ServiceRequests
            .Include(r => r.Details)
                .ThenInclude(d => d.Service)
            .Include(r => r.MedicalRecord)
                .ThenInclude(m => m.Patient)
            .FirstOrDefaultAsync(r => r.Id == serviceOrderId);

        if (serviceRequest == null)
        {
            return new LabOrderResult(false, null, "Không tìm thấy phiếu chỉ định");
        }

        // Lọc dịch vụ xét nghiệm (ServiceType = 2)
        var labServices = serviceRequest.Details
            .Where(d => d.Service?.ServiceType == 2)
            .ToList();

        if (!labServices.Any())
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
            PatientId = serviceRequest.MedicalRecord.PatientId,
            RequestTime = DateTime.UtcNow,
            Priority = labServices.Max(s => s.Priority ?? 0),
            Status = 0, // Chờ lấy mẫu
            CreatedAt = DateTime.UtcNow
        };
        await _context.LabRequests.AddAsync(labRequest);

        // Thêm chi tiết xét nghiệm
        foreach (var item in labServices)
        {
            var labItem = new LabRequestItem
            {
                Id = Guid.NewGuid(),
                LabRequestId = labRequest.Id,
                ServiceId = item.ServiceId,
                ServiceRequestDetailId = item.Id,
                Status = 0, // Chờ lấy mẫu
                CreatedAt = DateTime.UtcNow
            };
            await _context.LabRequestItems.AddAsync(labItem);

            // Cập nhật trạng thái chi tiết chỉ định
            item.Status = 1; // Đã tiếp nhận
        }

        await _context.SaveChangesAsync();

        return new LabOrderResult(true, labRequest.Id, "Đã tiếp nhận yêu cầu xét nghiệm");
    }

    /// <summary>
    /// Gửi worklist đến máy xét nghiệm (LIS 2-way)
    /// </summary>
    public async Task<WorklistResult> SendToWorklistAsync(Guid labOrderId)
    {
        var labRequest = await _context.LabRequests
            .Include(r => r.Items)
                .ThenInclude(i => i.Service)
            .Include(r => r.MedicalRecord)
                .ThenInclude(m => m.Patient)
            .FirstOrDefaultAsync(r => r.Id == labOrderId);

        if (labRequest == null)
        {
            return new WorklistResult(false, null, "Không tìm thấy phiếu xét nghiệm");
        }

        // Tạo Worklist ID cho LIS
        var worklistId = $"WL{DateTime.Now:yyyyMMddHHmmss}{labRequest.Id.ToString().Substring(0, 8).ToUpper()}";

        labRequest.WorklistId = worklistId;
        labRequest.Status = 1; // Đã gửi worklist

        // TODO: Gửi HL7/ASTM message đến LIS
        // Format: ORU^R01 hoặc ORM^O01

        await _context.SaveChangesAsync();

        return new WorklistResult(true, worklistId, "Đã gửi worklist đến máy xét nghiệm");
    }

    #endregion

    #region Step 2: Lấy mẫu

    /// <summary>
    /// Lấy mẫu bệnh phẩm
    /// </summary>
    public async Task<SpecimenCollectionResult> CollectSpecimenAsync(Guid labOrderId, SpecimenCollectionDto collection)
    {
        var labRequest = await _context.LabRequests
            .Include(r => r.Items)
            .FirstOrDefaultAsync(r => r.Id == labOrderId);

        if (labRequest == null)
        {
            return new SpecimenCollectionResult(false, null, null, "Không tìm thấy phiếu xét nghiệm");
        }

        // Tạo barcode cho ống mẫu
        var barcode = $"SP{DateTime.Now:yyMMddHHmmss}{new Random().Next(1000, 9999)}";

        // Cập nhật thông tin lấy mẫu
        labRequest.SpecimenType = collection.SpecimenType;
        labRequest.CollectionTime = collection.CollectionTime;
        labRequest.CollectedById = collection.CollectorId;
        labRequest.Barcode = barcode;
        labRequest.Status = 2; // Đã lấy mẫu

        // Cập nhật trạng thái items
        foreach (var item in labRequest.Items)
        {
            item.Status = 2; // Đã lấy mẫu
            item.Barcode = barcode;
        }

        await _context.SaveChangesAsync();

        return new SpecimenCollectionResult(true, labRequest.Id, barcode, "Đã lấy mẫu");
    }

    /// <summary>
    /// In barcode ống nghiệm
    /// </summary>
    public async Task<BarcodeResult> PrintBarcodeAsync(Guid specimenId)
    {
        var labRequest = await _context.LabRequests
            .Include(r => r.MedicalRecord)
                .ThenInclude(m => m.Patient)
            .FirstOrDefaultAsync(r => r.Id == specimenId);

        if (labRequest == null || string.IsNullOrEmpty(labRequest.Barcode))
        {
            return new BarcodeResult(false, null, "Không tìm thấy mẫu");
        }

        // TODO: Tích hợp printer để in barcode thực tế
        // Trả về barcode image base64

        var barcodeImage = $"BARCODE:{labRequest.Barcode}|{labRequest.MedicalRecord?.Patient?.FullName}|{labRequest.SpecimenType}";

        return new BarcodeResult(true, barcodeImage, "Đã in barcode");
    }

    #endregion

    #region Step 3: Tiếp nhận mẫu

    /// <summary>
    /// Tiếp nhận mẫu tại phòng xét nghiệm
    /// </summary>
    public async Task<SpecimenReceiveResult> ReceiveSpecimenAsync(Guid specimenId)
    {
        var labRequest = await _context.LabRequests.FindAsync(specimenId);
        if (labRequest == null)
        {
            return new SpecimenReceiveResult(false, null, "Không tìm thấy mẫu");
        }

        labRequest.ReceivedTime = DateTime.UtcNow;
        labRequest.Status = 3; // Đã tiếp nhận mẫu

        await _context.SaveChangesAsync();

        return new SpecimenReceiveResult(true, labRequest.ReceivedTime, "Đã tiếp nhận mẫu");
    }

    /// <summary>
    /// Từ chối mẫu (không đạt)
    /// </summary>
    public async Task<SpecimenRejectResult> RejectSpecimenAsync(Guid specimenId, string reason)
    {
        var labRequest = await _context.LabRequests
            .Include(r => r.Items)
            .FirstOrDefaultAsync(r => r.Id == specimenId);

        if (labRequest == null)
        {
            return new SpecimenRejectResult(false, "Không tìm thấy mẫu");
        }

        labRequest.Status = -1; // Từ chối
        labRequest.RejectReason = reason;
        labRequest.RejectedTime = DateTime.UtcNow;

        // Cập nhật items
        foreach (var item in labRequest.Items)
        {
            item.Status = -1;
            item.RejectReason = reason;
        }

        await _context.SaveChangesAsync();

        // TODO: Thông báo cho phòng khám để lấy mẫu lại

        return new SpecimenRejectResult(true, $"Đã từ chối mẫu: {reason}");
    }

    #endregion

    #region Step 4: Thực hiện XN

    /// <summary>
    /// Chạy xét nghiệm trên máy
    /// </summary>
    public async Task<LabRunResult> RunTestAsync(Guid labOrderItemId)
    {
        var labItem = await _context.LabRequestItems
            .Include(i => i.LabRequest)
            .FirstOrDefaultAsync(i => i.Id == labOrderItemId);

        if (labItem == null)
        {
            return new LabRunResult(false, "Không tìm thấy chỉ định xét nghiệm");
        }

        labItem.Status = 4; // Đang chạy máy
        labItem.RunTime = DateTime.UtcNow;

        // Cập nhật lab request nếu tất cả items đang chạy
        var allRunning = await _context.LabRequestItems
            .Where(i => i.LabRequestId == labItem.LabRequestId)
            .AllAsync(i => i.Status >= 4);

        if (allRunning)
        {
            labItem.LabRequest.Status = 4;
        }

        await _context.SaveChangesAsync();

        return new LabRunResult(true, "Đang chạy xét nghiệm");
    }

    /// <summary>
    /// Nhận kết quả tự động từ máy (LIS Interface)
    /// </summary>
    public async Task<AutoResultResult> ReceiveAutoResultAsync(Guid labOrderItemId, LabResultDto result)
    {
        var labItem = await _context.LabRequestItems
            .Include(i => i.Service)
            .FirstOrDefaultAsync(i => i.Id == labOrderItemId);

        if (labItem == null)
        {
            return new AutoResultResult(false, "Không tìm thấy chỉ định xét nghiệm");
        }

        // Tạo kết quả xét nghiệm
        var labResult = new LabResult
        {
            Id = Guid.NewGuid(),
            LabRequestItemId = labOrderItemId,
            ResultValue = result.ResultValue,
            Unit = result.Unit ?? labItem.Service?.Unit,
            ReferenceRange = result.ReferenceRange,
            IsAbnormal = result.IsAbnormal ?? false,
            ResultTime = DateTime.UtcNow,
            ResultSource = "AUTO", // Tự động từ máy
            Status = 0, // Chờ duyệt
            CreatedAt = DateTime.UtcNow
        };
        await _context.LabResults.AddAsync(labResult);

        labItem.Status = 5; // Có kết quả
        labItem.ResultTime = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new AutoResultResult(true, "Đã nhận kết quả tự động");
    }

    /// <summary>
    /// Nhập kết quả thủ công
    /// </summary>
    public async Task<ManualResultResult> EnterManualResultAsync(Guid labOrderItemId, LabResultDto result)
    {
        var labItem = await _context.LabRequestItems
            .Include(i => i.Service)
            .FirstOrDefaultAsync(i => i.Id == labOrderItemId);

        if (labItem == null)
        {
            return new ManualResultResult(false, "Không tìm thấy chỉ định xét nghiệm");
        }

        var labResult = new LabResult
        {
            Id = Guid.NewGuid(),
            LabRequestItemId = labOrderItemId,
            ResultValue = result.ResultValue,
            Unit = result.Unit ?? labItem.Service?.Unit,
            ReferenceRange = result.ReferenceRange,
            IsAbnormal = result.IsAbnormal ?? false,
            ResultTime = DateTime.UtcNow,
            ResultSource = "MANUAL", // Nhập thủ công
            Status = 0, // Chờ duyệt
            CreatedAt = DateTime.UtcNow
        };
        await _context.LabResults.AddAsync(labResult);

        labItem.Status = 5;
        labItem.ResultTime = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new ManualResultResult(true, "Đã nhập kết quả");
    }

    #endregion

    #region Step 5: Duyệt kết quả

    /// <summary>
    /// Duyệt kết quả xét nghiệm (Bác sĩ XN)
    /// </summary>
    public async Task<ResultValidationResult> ValidateResultAsync(Guid labOrderItemId, Guid validatorId)
    {
        var labResult = await _context.LabResults
            .Include(r => r.LabRequestItem)
                .ThenInclude(i => i.LabRequest)
            .FirstOrDefaultAsync(r => r.LabRequestItemId == labOrderItemId);

        if (labResult == null)
        {
            return new ResultValidationResult(false, null, null, "Không tìm thấy kết quả");
        }

        labResult.Status = 1; // Đã duyệt
        labResult.ValidatedById = validatorId;
        labResult.ValidatedTime = DateTime.UtcNow;

        labResult.LabRequestItem.Status = 6; // Đã duyệt kết quả

        // Kiểm tra tất cả items đã duyệt chưa
        var labRequestId = labResult.LabRequestItem.LabRequestId;
        var allValidated = await _context.LabRequestItems
            .Where(i => i.LabRequestId == labRequestId)
            .AllAsync(i => i.Status >= 6);

        if (allValidated)
        {
            labResult.LabRequestItem.LabRequest.Status = 5; // Hoàn thành
        }

        await _context.SaveChangesAsync();

        return new ResultValidationResult(true, validatorId, DateTime.UtcNow, "Đã duyệt kết quả");
    }

    /// <summary>
    /// Kiểm tra kết quả bất thường
    /// </summary>
    public async Task<AbnormalAlertResult> CheckAbnormalAsync(Guid labOrderItemId)
    {
        var labResult = await _context.LabResults
            .Include(r => r.LabRequestItem)
                .ThenInclude(i => i.Service)
            .FirstOrDefaultAsync(r => r.LabRequestItemId == labOrderItemId);

        if (labResult == null)
        {
            return new AbnormalAlertResult(false, null, "Không tìm thấy kết quả");
        }

        var abnormalItems = new List<string>();

        if (labResult.IsAbnormal)
        {
            abnormalItems.Add($"{labResult.LabRequestItem?.Service?.ServiceName}: {labResult.ResultValue} (Ref: {labResult.ReferenceRange})");
        }

        // TODO: Kiểm tra critical values và gửi cảnh báo

        return new AbnormalAlertResult(
            HasAbnormal: abnormalItems.Any(),
            AbnormalItems: abnormalItems,
            Message: abnormalItems.Any() ? "Có kết quả bất thường" : "Kết quả bình thường"
        );
    }

    #endregion

    #region Step 6: Trả kết quả

    /// <summary>
    /// Trả kết quả về phòng khám/khoa lâm sàng
    /// </summary>
    public async Task<ResultReleaseResult> ReleaseResultAsync(Guid labOrderId)
    {
        var labRequest = await _context.LabRequests
            .Include(r => r.Items)
                .ThenInclude(i => i.Results)
            .FirstOrDefaultAsync(r => r.Id == labOrderId);

        if (labRequest == null)
        {
            return new ResultReleaseResult(false, null, "Không tìm thấy phiếu xét nghiệm");
        }

        // Kiểm tra tất cả kết quả đã duyệt
        var allValidated = labRequest.Items.All(i => i.Status >= 6);
        if (!allValidated)
        {
            return new ResultReleaseResult(false, null, "Còn kết quả chưa duyệt");
        }

        labRequest.Status = 6; // Đã trả kết quả
        labRequest.ReleasedTime = DateTime.UtcNow;

        // Cập nhật Service Request Detail
        foreach (var item in labRequest.Items)
        {
            if (item.ServiceRequestDetailId.HasValue)
            {
                var serviceDetail = await _context.ServiceRequestDetails.FindAsync(item.ServiceRequestDetailId.Value);
                if (serviceDetail != null)
                {
                    serviceDetail.Status = 2; // Có kết quả
                    serviceDetail.CompletedAt = DateTime.UtcNow;
                }
            }
        }

        await _context.SaveChangesAsync();

        return new ResultReleaseResult(true, DateTime.UtcNow, "Đã trả kết quả");
    }

    /// <summary>
    /// Thông báo cho bác sĩ lâm sàng
    /// </summary>
    public async Task NotifyClinicianAsync(Guid labOrderId)
    {
        var labRequest = await _context.LabRequests
            .Include(r => r.MedicalRecord)
                .ThenInclude(m => m.Doctor)
            .Include(r => r.Items)
                .ThenInclude(i => i.Results)
            .FirstOrDefaultAsync(r => r.Id == labOrderId);

        if (labRequest == null) return;

        // Kiểm tra có kết quả bất thường không
        var hasAbnormal = labRequest.Items.Any(i => i.Results.Any(r => r.IsAbnormal));

        // Tạo notification
        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = labRequest.MedicalRecord?.DoctorId,
            Title = hasAbnormal ? "⚠️ Kết quả XN bất thường" : "Kết quả XN đã có",
            Content = $"BN: {labRequest.MedicalRecord?.Patient?.FullName} - Phiếu: {labRequest.RequestCode}",
            NotificationType = hasAbnormal ? "CRITICAL" : "INFO",
            ReferenceType = "LAB_RESULT",
            ReferenceId = labOrderId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };
        await _context.Notifications.AddAsync(notification);
        await _context.SaveChangesAsync();

        // TODO: Gửi push notification / SMS nếu critical
    }

    #endregion
}
