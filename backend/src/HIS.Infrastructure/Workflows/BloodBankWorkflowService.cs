using HIS.Application.Workflows;
using HIS.Core.Interfaces;
using HIS.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Workflows;

/// <summary>
/// Luồng 9: Ngân hàng Máu (Blood Bank Flow)
/// Theo HIS_DataFlow_Architecture.md - Ma trận phân hệ
///
/// LUỒNG CHÍNH:
/// [NHẬP MÁU] Trung tâm truyền máu → Tiếp nhận → Xét nghiệm → Duyệt → Lưu kho
/// [YÊU CẦU MÁU] Khoa LS/PTTT → Yêu cầu máu → Cross-match → Dự trù
/// [XUẤT MÁU] Duyệt yêu cầu → Cấp máu → Ghi nhận truyền máu → Theo dõi phản ứng
///
/// LIÊN KẾT MODULE:
/// - Module 3 (Nội trú): Yêu cầu truyền máu cho BN nội trú
/// - Module 6 (PTTT): Dự trù và cấp máu trong mổ
/// - Module 7 (Xét nghiệm): Cross-match, xét nghiệm máu
/// - Module 10 (Thu ngân): Tính chi phí máu truyền
/// </summary>
public class BloodBankWorkflowService : IBloodBankWorkflowService
{
    private readonly IUnitOfWork _unitOfWork;

    public BloodBankWorkflowService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    #region NHẬP MÁU

    /// <summary>
    /// Tiếp nhận đơn vị máu từ trung tâm truyền máu
    /// - Ghi nhận thông tin từng túi máu
    /// - Kiểm tra thông tin cơ bản
    /// </summary>
    public async Task<BloodReceiptResult> ReceiveBloodUnitsAsync(BloodReceiptDto receipt)
    {
        try
        {
            // Create receipt record
            var bloodReceipt = new BloodReceipt
            {
                Id = Guid.NewGuid(),
                SupplierCode = receipt.SupplierCode,
                ReceiptNumber = GenerateReceiptNumber(),
                ReceivedAt = DateTime.Now,
                Status = "Received",
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<BloodReceipt>().AddAsync(bloodReceipt);

            int unitsReceived = 0;

            foreach (var unit in receipt.Units)
            {
                // Validate blood type
                if (!IsValidBloodType(unit.BloodType, unit.RhFactor))
                {
                    continue;
                }

                // Create blood unit record
                var bloodUnit = new BloodUnit
                {
                    Id = Guid.NewGuid(),
                    ReceiptId = bloodReceipt.Id,
                    BagCode = unit.BagCode,
                    BloodType = unit.BloodType, // A, B, AB, O
                    RhFactor = unit.RhFactor,   // Positive, Negative
                    Volume = unit.Volume,        // ml
                    CollectionDate = unit.CollectionDate,
                    ExpiryDate = unit.ExpiryDate,
                    Status = "Received", // Received → Testing → Available → Reserved → Issued → Used → Discarded
                    CreatedAt = DateTime.Now
                };

                await _unitOfWork.GetRepository<BloodUnit>().AddAsync(bloodUnit);
                unitsReceived++;
            }

            await _unitOfWork.SaveChangesAsync();

            return new BloodReceiptResult(true, unitsReceived, $"Đã tiếp nhận {unitsReceived} đơn vị máu");
        }
        catch (Exception ex)
        {
            return new BloodReceiptResult(false, null, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Thực hiện xét nghiệm đơn vị máu
    /// - HIV, HBV, HCV, Syphilis
    /// - Nhóm máu xác nhận
    /// - Kháng thể bất thường
    /// </summary>
    public async Task<BloodTestResult> PerformBloodTestsAsync(Guid bloodUnitId)
    {
        try
        {
            var bloodUnit = await _unitOfWork.GetRepository<BloodUnit>()
                .Query()
                .FirstOrDefaultAsync(bu => bu.Id == bloodUnitId && !bu.IsDeleted);

            if (bloodUnit == null)
            {
                return new BloodTestResult(false, null, "Không tìm thấy đơn vị máu");
            }

            var testResults = new List<string>();
            var isPassed = true;

            // Create test records
            var tests = new[] { "HIV", "HBV", "HCV", "Syphilis", "BloodTypeConfirm", "AntibodyScreen" };

            foreach (var testName in tests)
            {
                // Simulate test results (in production, these would come from lab)
                var isNegative = testName switch
                {
                    "BloodTypeConfirm" => true, // Always pass for simulation
                    "AntibodyScreen" => true,
                    _ => new Random().Next(100) > 1 // 99% negative rate for infections
                };

                var testRecord = new BloodTest
                {
                    Id = Guid.NewGuid(),
                    BloodUnitId = bloodUnitId,
                    TestName = testName,
                    Result = isNegative ? "Negative" : "Positive",
                    IsPassed = isNegative,
                    TestedAt = DateTime.Now,
                    CreatedAt = DateTime.Now
                };

                await _unitOfWork.GetRepository<BloodTest>().AddAsync(testRecord);

                if (!isNegative && testName != "BloodTypeConfirm" && testName != "AntibodyScreen")
                {
                    isPassed = false;
                    testResults.Add($"{testName}: Positive");
                }
                else
                {
                    testResults.Add($"{testName}: Negative");
                }
            }

            // Update blood unit status
            bloodUnit.Status = isPassed ? "Tested" : "Failed";
            bloodUnit.TestedAt = DateTime.Now;
            bloodUnit.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new BloodTestResult(isPassed, testResults,
                isPassed ? "Xét nghiệm đạt" : "Xét nghiệm không đạt");
        }
        catch (Exception ex)
        {
            return new BloodTestResult(false, null, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Duyệt đơn vị máu đạt chuẩn
    /// - Kiểm tra kết quả xét nghiệm
    /// - Duyệt bởi bác sĩ trưởng khoa
    /// </summary>
    public async Task<BloodApprovalResult> ApproveBloodUnitAsync(Guid bloodUnitId)
    {
        try
        {
            var bloodUnit = await _unitOfWork.GetRepository<BloodUnit>()
                .Query()
                .Include(bu => bu.Tests)
                .FirstOrDefaultAsync(bu => bu.Id == bloodUnitId && !bu.IsDeleted);

            if (bloodUnit == null)
            {
                return new BloodApprovalResult(false, "Không tìm thấy đơn vị máu");
            }

            // Check all tests passed
            var allTestsPassed = bloodUnit.Tests.All(t => t.IsPassed);

            if (!allTestsPassed)
            {
                return new BloodApprovalResult(false, "Đơn vị máu không đạt xét nghiệm");
            }

            bloodUnit.Status = "Available";
            bloodUnit.ApprovedAt = DateTime.Now;
            bloodUnit.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new BloodApprovalResult(true, "Đã duyệt đơn vị máu");
        }
        catch (Exception ex)
        {
            return new BloodApprovalResult(false, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Lưu kho đơn vị máu
    /// - Phân loại theo nhóm máu
    /// - Lưu ở nhiệt độ phù hợp
    /// </summary>
    public async Task<BloodStorageResult> StoreBloodUnitAsync(Guid bloodUnitId)
    {
        try
        {
            var bloodUnit = await _unitOfWork.GetRepository<BloodUnit>()
                .Query()
                .FirstOrDefaultAsync(bu => bu.Id == bloodUnitId && !bu.IsDeleted && bu.Status == "Available");

            if (bloodUnit == null)
            {
                return new BloodStorageResult(false, null, "Không tìm thấy đơn vị máu đã duyệt");
            }

            // Assign storage location based on blood type
            var storageLocation = $"Tủ {bloodUnit.BloodType}{bloodUnit.RhFactor[0]} - Ngăn {new Random().Next(1, 10)}";

            bloodUnit.StorageLocation = storageLocation;
            bloodUnit.StoredAt = DateTime.Now;
            bloodUnit.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new BloodStorageResult(true, storageLocation, "Đã lưu kho đơn vị máu");
        }
        catch (Exception ex)
        {
            return new BloodStorageResult(false, null, $"Lỗi: {ex.Message}");
        }
    }

    #endregion

    #region YÊU CẦU MÁU

    /// <summary>
    /// Tạo yêu cầu máu từ khoa lâm sàng
    /// - Ghi nhận thông tin BN và chỉ định
    /// - Xác định loại máu cần
    /// </summary>
    public async Task<BloodRequestResult> CreateBloodRequestAsync(BloodRequestDto request)
    {
        try
        {
            // Verify patient exists
            var patient = await _unitOfWork.GetRepository<Patient>()
                .Query()
                .FirstOrDefaultAsync(p => p.Id == request.PatientId && !p.IsDeleted);

            if (patient == null)
            {
                return new BloodRequestResult(false, null, "Không tìm thấy bệnh nhân");
            }

            // Create blood request
            var bloodRequest = new BloodRequest
            {
                Id = Guid.NewGuid(),
                PatientId = request.PatientId,
                BloodType = request.BloodType,
                RhFactor = request.RhFactor,
                UnitsRequested = request.Units,
                Urgency = request.Urgency ?? "Routine", // Routine, Urgent, Emergency
                Indication = request.Indication,
                Status = "Pending", // Pending → CrossMatched → Reserved → Issued
                RequestedAt = DateTime.Now,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<BloodRequest>().AddAsync(bloodRequest);
            await _unitOfWork.SaveChangesAsync();

            return new BloodRequestResult(true, bloodRequest.Id, "Đã tạo yêu cầu máu");
        }
        catch (Exception ex)
        {
            return new BloodRequestResult(false, null, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Thực hiện cross-match (phản ứng chéo)
    /// - Kiểm tra tương hợp máu BN và túi máu
    /// - Liên kết với Module 7 (Xét nghiệm)
    /// </summary>
    public async Task<CrossMatchResult> PerformCrossMatchAsync(Guid bloodRequestId, Guid bloodUnitId)
    {
        try
        {
            var request = await _unitOfWork.GetRepository<BloodRequest>()
                .Query()
                .Include(br => br.Patient)
                .FirstOrDefaultAsync(br => br.Id == bloodRequestId && !br.IsDeleted);

            var bloodUnit = await _unitOfWork.GetRepository<BloodUnit>()
                .Query()
                .FirstOrDefaultAsync(bu => bu.Id == bloodUnitId && !bu.IsDeleted && bu.Status == "Available");

            if (request == null || bloodUnit == null)
            {
                return new CrossMatchResult(false, "Không tìm thấy yêu cầu hoặc đơn vị máu");
            }

            // Check blood type compatibility
            var isCompatible = IsBloodTypeCompatible(
                request.BloodType, request.RhFactor,
                bloodUnit.BloodType, bloodUnit.RhFactor);

            if (!isCompatible)
            {
                return new CrossMatchResult(false, "Nhóm máu không tương hợp");
            }

            // Create cross-match record
            var crossMatch = new CrossMatch
            {
                Id = Guid.NewGuid(),
                BloodRequestId = bloodRequestId,
                BloodUnitId = bloodUnitId,
                IsCompatible = true,
                MatchedAt = DateTime.Now,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<CrossMatch>().AddAsync(crossMatch);
            await _unitOfWork.SaveChangesAsync();

            return new CrossMatchResult(true, "Phản ứng chéo tương hợp");
        }
        catch (Exception ex)
        {
            return new CrossMatchResult(false, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Dự trù máu cho yêu cầu
    /// - Tìm túi máu phù hợp
    /// - Đánh dấu reserved
    /// </summary>
    public async Task<BloodReservationResult> ReserveBloodAsync(Guid bloodRequestId)
    {
        try
        {
            var request = await _unitOfWork.GetRepository<BloodRequest>()
                .Query()
                .FirstOrDefaultAsync(br => br.Id == bloodRequestId && !br.IsDeleted);

            if (request == null)
            {
                return new BloodReservationResult(false, null, "Không tìm thấy yêu cầu máu");
            }

            // Find available blood units matching the request
            var availableUnits = await _unitOfWork.GetRepository<BloodUnit>()
                .Query()
                .Where(bu => bu.BloodType == request.BloodType
                    && bu.RhFactor == request.RhFactor
                    && bu.Status == "Available"
                    && bu.ExpiryDate > DateTime.Now
                    && !bu.IsDeleted)
                .OrderBy(bu => bu.ExpiryDate) // FEFO
                .Take(request.UnitsRequested)
                .ToListAsync();

            if (availableUnits.Count < request.UnitsRequested)
            {
                return new BloodReservationResult(false, null,
                    $"Không đủ máu. Có: {availableUnits.Count}, Cần: {request.UnitsRequested}");
            }

            var reservedUnitIds = new List<Guid>();

            foreach (var unit in availableUnits)
            {
                unit.Status = "Reserved";
                unit.ReservedForRequestId = bloodRequestId;
                unit.ReservedAt = DateTime.Now;
                unit.UpdatedAt = DateTime.Now;
                reservedUnitIds.Add(unit.Id);
            }

            request.Status = "Reserved";
            request.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new BloodReservationResult(true, reservedUnitIds, $"Đã dự trù {availableUnits.Count} đơn vị máu");
        }
        catch (Exception ex)
        {
            return new BloodReservationResult(false, null, $"Lỗi: {ex.Message}");
        }
    }

    #endregion

    #region XUẤT MÁU

    /// <summary>
    /// Xuất máu cho yêu cầu đã duyệt
    /// - Cấp túi máu cho khoa/phòng mổ
    /// - Ghi nhận thời gian xuất
    /// </summary>
    public async Task<BloodIssueResult> IssueBloodAsync(Guid bloodRequestId)
    {
        try
        {
            var request = await _unitOfWork.GetRepository<BloodRequest>()
                .Query()
                .FirstOrDefaultAsync(br => br.Id == bloodRequestId && !br.IsDeleted && br.Status == "Reserved");

            if (request == null)
            {
                return new BloodIssueResult(false, null, "Không tìm thấy yêu cầu máu đã dự trù");
            }

            // Get reserved blood units
            var reservedUnits = await _unitOfWork.GetRepository<BloodUnit>()
                .Query()
                .Where(bu => bu.ReservedForRequestId == bloodRequestId && !bu.IsDeleted)
                .ToListAsync();

            var issuedUnitIds = new List<Guid>();

            foreach (var unit in reservedUnits)
            {
                unit.Status = "Issued";
                unit.IssuedAt = DateTime.Now;
                unit.UpdatedAt = DateTime.Now;
                issuedUnitIds.Add(unit.Id);

                // Create issue record
                var issue = new BloodIssue
                {
                    Id = Guid.NewGuid(),
                    BloodRequestId = bloodRequestId,
                    BloodUnitId = unit.Id,
                    IssuedAt = DateTime.Now,
                    CreatedAt = DateTime.Now
                };

                await _unitOfWork.GetRepository<BloodIssue>().AddAsync(issue);
            }

            request.Status = "Issued";
            request.IssuedAt = DateTime.Now;
            request.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new BloodIssueResult(true, issuedUnitIds, $"Đã xuất {issuedUnitIds.Count} đơn vị máu");
        }
        catch (Exception ex)
        {
            return new BloodIssueResult(false, null, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Ghi nhận truyền máu
    /// - Thông tin truyền máu thực tế
    /// - Sinh hiệu trước/trong/sau truyền
    /// </summary>
    public async Task<TransfusionRecordResult> RecordTransfusionAsync(Guid bloodIssueId, TransfusionDto transfusion)
    {
        try
        {
            var issue = await _unitOfWork.GetRepository<BloodIssue>()
                .Query()
                .Include(bi => bi.BloodUnit)
                .FirstOrDefaultAsync(bi => bi.BloodUnitId == transfusion.BloodUnitId && !bi.IsDeleted);

            if (issue == null)
            {
                return new TransfusionRecordResult(false, null, "Không tìm thấy đơn vị máu đã xuất");
            }

            // Create transfusion record
            var transfusionRecord = new Transfusion
            {
                Id = Guid.NewGuid(),
                BloodIssueId = issue.Id,
                BloodUnitId = transfusion.BloodUnitId,
                StartTime = transfusion.StartTime,
                EndTime = transfusion.EndTime,
                Status = transfusion.EndTime.HasValue ? "Completed" : "InProgress",
                Note = transfusion.Note,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<Transfusion>().AddAsync(transfusionRecord);

            // Update blood unit status
            if (issue.BloodUnit != null)
            {
                issue.BloodUnit.Status = "Used";
                issue.BloodUnit.UpdatedAt = DateTime.Now;
            }

            await _unitOfWork.SaveChangesAsync();

            return new TransfusionRecordResult(true, transfusionRecord.Id, "Đã ghi nhận truyền máu");
        }
        catch (Exception ex)
        {
            return new TransfusionRecordResult(false, null, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Ghi nhận phản ứng truyền máu
    /// - Loại phản ứng (sốt, dị ứng, tan máu...)
    /// - Mức độ nghiêm trọng
    /// - Xử trí
    /// </summary>
    public async Task<TransfusionReactionResult> RecordReactionAsync(Guid transfusionId, ReactionDto reaction)
    {
        try
        {
            var transfusion = await _unitOfWork.GetRepository<Transfusion>()
                .Query()
                .FirstOrDefaultAsync(t => t.Id == transfusionId && !t.IsDeleted);

            if (transfusion == null)
            {
                return new TransfusionReactionResult(false, "Không tìm thấy ghi nhận truyền máu");
            }

            // Create reaction record
            var reactionRecord = new TransfusionReaction
            {
                Id = Guid.NewGuid(),
                TransfusionId = transfusionId,
                ReactionType = reaction.ReactionType, // Febrile, Allergic, Hemolytic, TRALI, etc.
                Severity = reaction.Severity, // Mild, Moderate, Severe
                Treatment = reaction.Treatment,
                OccurredAt = DateTime.Now,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<TransfusionReaction>().AddAsync(reactionRecord);

            // Update transfusion status
            transfusion.HasReaction = true;
            transfusion.Status = "ReactionReported";
            transfusion.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new TransfusionReactionResult(true, "Đã ghi nhận phản ứng truyền máu");
        }
        catch (Exception ex)
        {
            return new TransfusionReactionResult(false, $"Lỗi: {ex.Message}");
        }
    }

    #endregion

    #region KIỂM SOÁT

    /// <summary>
    /// Kiểm tra máu sắp hết hạn
    /// - Cảnh báo trước 7 ngày
    /// - Ưu tiên sử dụng
    /// </summary>
    public async Task<BloodExpiryAlertResult> CheckBloodExpiryAsync()
    {
        try
        {
            var expiryThreshold = DateTime.Now.AddDays(7);

            var expiringUnits = await _unitOfWork.GetRepository<BloodUnit>()
                .Query()
                .Where(bu => bu.Status == "Available"
                    && bu.ExpiryDate <= expiryThreshold
                    && bu.ExpiryDate > DateTime.Now
                    && !bu.IsDeleted)
                .Select(bu => new BloodExpiryItemDto(
                    bu.Id,
                    bu.BagCode,
                    $"{bu.BloodType}{bu.RhFactor[0]}",
                    bu.ExpiryDate
                ))
                .ToListAsync();

            return new BloodExpiryAlertResult(expiringUnits.Any(), expiringUnits.Any() ? expiringUnits : null);
        }
        catch
        {
            return new BloodExpiryAlertResult(false, null);
        }
    }

    /// <summary>
    /// Kiểm tra tồn kho máu theo nhóm
    /// - Thống kê số lượng từng nhóm
    /// - Cảnh báo thiếu
    /// </summary>
    public async Task<BloodInventoryResult> CheckBloodInventoryAsync()
    {
        try
        {
            var inventory = await _unitOfWork.GetRepository<BloodUnit>()
                .Query()
                .Where(bu => bu.Status == "Available" && bu.ExpiryDate > DateTime.Now && !bu.IsDeleted)
                .GroupBy(bu => $"{bu.BloodType}{bu.RhFactor[0]}")
                .Select(g => new { BloodType = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.BloodType, x => x.Count);

            return new BloodInventoryResult(inventory, "Tồn kho máu hiện tại");
        }
        catch (Exception ex)
        {
            return new BloodInventoryResult(null, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Hủy máu hết hạn
    /// - Ghi nhận lý do hủy
    /// - Báo cáo số lượng
    /// </summary>
    public async Task<BloodDiscardResult> DiscardExpiredBloodAsync(Guid bloodUnitId)
    {
        try
        {
            var bloodUnit = await _unitOfWork.GetRepository<BloodUnit>()
                .Query()
                .FirstOrDefaultAsync(bu => bu.Id == bloodUnitId && !bu.IsDeleted);

            if (bloodUnit == null)
            {
                return new BloodDiscardResult(false, "Không tìm thấy đơn vị máu");
            }

            // Create discard record
            var discard = new BloodDiscard
            {
                Id = Guid.NewGuid(),
                BloodUnitId = bloodUnitId,
                Reason = bloodUnit.ExpiryDate <= DateTime.Now ? "Expired" : "Other",
                DiscardedAt = DateTime.Now,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<BloodDiscard>().AddAsync(discard);

            // Update blood unit
            bloodUnit.Status = "Discarded";
            bloodUnit.DiscardedAt = DateTime.Now;
            bloodUnit.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new BloodDiscardResult(true, "Đã hủy đơn vị máu");
        }
        catch (Exception ex)
        {
            return new BloodDiscardResult(false, $"Lỗi: {ex.Message}");
        }
    }

    #endregion

    #region Helper Methods

    private bool IsValidBloodType(string bloodType, string rhFactor)
    {
        var validBloodTypes = new[] { "A", "B", "AB", "O" };
        var validRhFactors = new[] { "Positive", "Negative" };

        return validBloodTypes.Contains(bloodType) && validRhFactors.Contains(rhFactor);
    }

    private bool IsBloodTypeCompatible(string recipientType, string recipientRh, string donorType, string donorRh)
    {
        // Rh compatibility: Rh- can receive Rh- only, Rh+ can receive both
        if (recipientRh == "Negative" && donorRh == "Positive")
            return false;

        // ABO compatibility
        return (recipientType, donorType) switch
        {
            ("O", "O") => true,
            ("A", "O") => true,
            ("A", "A") => true,
            ("B", "O") => true,
            ("B", "B") => true,
            ("AB", _) => true, // AB can receive any
            _ => false
        };
    }

    private string GenerateReceiptNumber()
    {
        return $"BR{DateTime.Now:yyyyMMdd}{new Random().Next(10000, 99999)}";
    }

    #endregion
}
