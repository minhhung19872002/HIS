using HIS.Application.Workflows;
using HIS.Core.Interfaces;
using HIS.Core.Entities;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace HIS.Infrastructure.Workflows;

/// <summary>
/// Luồng 8: Bảo hiểm Y tế (Insurance Flow)
/// Theo HIS_DataFlow_Architecture.md - Mục 2.6 và 5.1
///
/// LUỒNG CHÍNH:
/// [Tiếp đón] → Kiểm tra thẻ BHYT → Xác minh cổng BHXH → Tính chi phí BHYT
///     → Tách chi phí trong/ngoài danh mục → Xuất XML 130/4210
///     → Gửi cổng BHXH → Giám định → Duyệt/Từ chối
///
/// TỶ LỆ BHYT CHI TRẢ (Mục 2.6):
/// | Đối tượng          | Đúng tuyến | Trái tuyến TW | Trái tuyến tỉnh |
/// |--------------------|------------|---------------|-----------------|
/// | Thông thường       | 80%        | 40%           | 60%             |
/// | Hộ nghèo           | 100%       | 100%          | 100%            |
/// | Trẻ em <6 tuổi     | 100%       | 100%          | 100%            |
/// | Hưu trí            | 95%        | 40%           | 60%             |
///
/// BUSINESS RULES (Mục 5.1):
/// RULE_INS_001: Kiểm tra thông tuyến, gọi API BHXH, lưu mã xác nhận
/// RULE_INS_002: Tính chi phí theo đối tượng, tách trong/ngoài danh mục
/// RULE_INS_003: Xuất XML 130/4750/3176/4210, tự động đẩy cổng khi ra viện
///
/// LIÊN KẾT MODULE:
/// - Module 1 (Tiếp đón): Kiểm tra thẻ BHYT
/// - Module 10 (Thu ngân): Tính chi phí BHYT/BN
/// - Module 16 (HSBA): Lưu trữ hồ sơ BHYT
/// </summary>
public class InsuranceWorkflowService : IInsuranceWorkflowService
{
    private readonly IUnitOfWork _unitOfWork;

    public InsuranceWorkflowService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    #region XÁC MINH BHYT

    /// <summary>
    /// Kiểm tra thẻ BHYT
    /// - Gọi API cổng BHXH để xác minh
    /// - Lưu thông tin thẻ và trạng thái
    /// RULE_INS_001
    /// </summary>
    public async Task<InsuranceVerificationResult> VerifyInsuranceCardAsync(string cardNumber)
    {
        try
        {
            if (string.IsNullOrEmpty(cardNumber) || cardNumber.Length < 15)
            {
                return new InsuranceVerificationResult(false, "Số thẻ BHYT không hợp lệ", null, null);
            }

            // Parse card info from number
            // Format: DN4070001234567 (Mã tỉnh + Mã đối tượng + Số thẻ)
            var provinceCode = cardNumber.Substring(0, 2);
            var categoryCode = cardNumber.Substring(2, 2);

            // Determine coverage rate based on category
            var coverageRate = GetCoverageRate(categoryCode, true); // Assuming right route

            // Check if card exists in local database
            var existingCard = await _unitOfWork.GetRepository<InsuranceCard>()
                .Query()
                .FirstOrDefaultAsync(ic => ic.CardNumber == cardNumber && !ic.IsDeleted);

            if (existingCard != null)
            {
                if (existingCard.ExpireDate < DateTime.Now)
                {
                    return new InsuranceVerificationResult(false, "Thẻ BHYT đã hết hạn", null, existingCard.ExpireDate);
                }

                return new InsuranceVerificationResult(true, "Thẻ BHYT hợp lệ", coverageRate, existingCard.ExpireDate);
            }

            // In production: Call BHXH API
            // Simulating API response
            var isValid = cardNumber.Length == 15;
            var expireDate = DateTime.Now.AddYears(1);

            if (isValid)
            {
                // Save card info
                var newCard = new InsuranceCard
                {
                    Id = Guid.NewGuid(),
                    CardNumber = cardNumber,
                    ProvinceCode = provinceCode,
                    CategoryCode = categoryCode,
                    CoverageRate = coverageRate,
                    ExpireDate = expireDate,
                    Status = "Active",
                    VerifiedAt = DateTime.Now,
                    CreatedAt = DateTime.Now
                };

                await _unitOfWork.GetRepository<InsuranceCard>().AddAsync(newCard);
                await _unitOfWork.SaveChangesAsync();
            }

            return new InsuranceVerificationResult(isValid,
                isValid ? "Thẻ BHYT hợp lệ" : "Thẻ BHYT không hợp lệ",
                isValid ? coverageRate : null,
                isValid ? expireDate : null);
        }
        catch (Exception ex)
        {
            return new InsuranceVerificationResult(false, $"Lỗi kiểm tra BHYT: {ex.Message}", null, null);
        }
    }

    /// <summary>
    /// Kiểm tra đúng tuyến
    /// - So sánh nơi đăng ký KCB với cơ sở hiện tại
    /// - Xác định tỷ lệ chi trả theo tuyến
    /// RULE_INS_001
    /// </summary>
    public async Task<RightRouteResult> CheckRightRouteAsync(string cardNumber, string facilityCode)
    {
        try
        {
            var card = await _unitOfWork.GetRepository<InsuranceCard>()
                .Query()
                .FirstOrDefaultAsync(ic => ic.CardNumber == cardNumber && !ic.IsDeleted);

            if (card == null)
            {
                return new RightRouteResult(false, null, "Không tìm thấy thông tin thẻ BHYT");
            }

            // Check if registered facility matches current facility
            var isRightRoute = card.RegisteredFacilityCode == facilityCode;

            string routeType;
            if (isRightRoute)
            {
                routeType = "RightRoute"; // Đúng tuyến
            }
            else
            {
                // Check facility level for cross-route type
                var facility = await _unitOfWork.GetRepository<HealthFacility>()
                    .Query()
                    .FirstOrDefaultAsync(hf => hf.Code == facilityCode && !hf.IsDeleted);

                routeType = facility?.Level switch
                {
                    "Central" => "CrossRouteCentral",  // Trái tuyến TW
                    "Provincial" => "CrossRouteProvincial", // Trái tuyến tỉnh
                    _ => "CrossRouteDistrict" // Trái tuyến huyện
                };
            }

            return new RightRouteResult(isRightRoute, routeType,
                isRightRoute ? "Đúng tuyến BHYT" : $"Trái tuyến: {routeType}");
        }
        catch (Exception ex)
        {
            return new RightRouteResult(false, null, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Kiểm tra 5 năm liên tục
    /// - Xác định BN có đóng BHYT 5 năm liên tục không
    /// - Ảnh hưởng đến mức hưởng khi đồng chi trả
    /// </summary>
    public async Task<ContinuousYearsResult> CheckContinuous5YearsAsync(string cardNumber)
    {
        try
        {
            // In production: Call BHXH API to verify continuous years
            var card = await _unitOfWork.GetRepository<InsuranceCard>()
                .Query()
                .FirstOrDefaultAsync(ic => ic.CardNumber == cardNumber && !ic.IsDeleted);

            if (card == null)
            {
                return new ContinuousYearsResult(false, null, "Không tìm thấy thông tin thẻ");
            }

            // Simulating - check ContinuousYears field
            var isContinuous = card.ContinuousYears >= 5;

            return new ContinuousYearsResult(isContinuous, card.ContinuousYears,
                isContinuous ? "Đã đóng BHYT 5 năm liên tục" : $"Đã đóng BHYT {card.ContinuousYears} năm");
        }
        catch (Exception ex)
        {
            return new ContinuousYearsResult(false, null, $"Lỗi: {ex.Message}");
        }
    }

    #endregion

    #region TÍNH CHI PHÍ BHYT

    /// <summary>
    /// Tính chi phí BHYT chi trả
    /// - Áp dụng tỷ lệ theo đối tượng và tuyến
    /// - Tách chi phí trong/ngoài danh mục
    /// RULE_INS_002
    /// </summary>
    public async Task<InsuranceCalculationResult> CalculateInsuranceCoverageAsync(Guid visitId)
    {
        try
        {
            var visit = await _unitOfWork.GetRepository<Visit>()
                .Query()
                .Include(v => v.InsuranceInfo)
                .Include(v => v.Patient)
                .FirstOrDefaultAsync(v => v.Id == visitId && !v.IsDeleted);

            if (visit?.InsuranceInfo == null)
            {
                return new InsuranceCalculationResult(false, null, null, null, "Không có thông tin BHYT");
            }

            // Get charge collection
            var charges = await _unitOfWork.GetRepository<ChargeCollection>()
                .Query()
                .Include(cc => cc.Items)
                .FirstOrDefaultAsync(cc => cc.VisitId == visitId && !cc.IsDeleted);

            if (charges == null)
            {
                return new InsuranceCalculationResult(false, null, null, null, "Chưa có tổng hợp chi phí");
            }

            var coverageRate = visit.InsuranceInfo.CoverageRate ?? 0.8m;
            decimal insuranceAmount = 0;
            decimal patientAmount = 0;

            foreach (var item in charges.Items)
            {
                // Check if item is in insurance catalog
                var isInCatalog = await IsInInsuranceCatalogAsync(item.ServiceId, item.MedicineId);

                if (isInCatalog)
                {
                    var insAmt = item.Amount * coverageRate;
                    item.IsInsuranceCovered = true;
                    item.InsuranceAmount = insAmt;
                    item.PatientAmount = item.Amount - insAmt;
                    insuranceAmount += insAmt;
                    patientAmount += item.Amount - insAmt;
                }
                else
                {
                    item.IsInsuranceCovered = false;
                    item.PatientAmount = item.Amount;
                    patientAmount += item.Amount;
                }

                item.UpdatedAt = DateTime.Now;
            }

            charges.InsuranceAmount = insuranceAmount;
            charges.PatientAmount = patientAmount;
            charges.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new InsuranceCalculationResult(true, insuranceAmount, patientAmount, coverageRate,
                $"BHYT chi trả {insuranceAmount:N0} VNĐ ({coverageRate:P0})");
        }
        catch (Exception ex)
        {
            return new InsuranceCalculationResult(false, null, null, null, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Tính đồng chi trả của BN
    /// - Phần BN phải trả sau khi trừ BHYT
    /// </summary>
    public async Task<CopaymentResult> CalculateCopaymentAsync(Guid visitId)
    {
        try
        {
            var charges = await _unitOfWork.GetRepository<ChargeCollection>()
                .Query()
                .FirstOrDefaultAsync(cc => cc.VisitId == visitId && !cc.IsDeleted);

            if (charges == null)
            {
                return new CopaymentResult(false, null, "Chưa có tổng hợp chi phí");
            }

            return new CopaymentResult(true, charges.PatientAmount,
                $"BN đồng chi trả: {charges.PatientAmount:N0} VNĐ");
        }
        catch (Exception ex)
        {
            return new CopaymentResult(false, null, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Kiểm tra trần thanh toán BHYT
    /// - Một số dịch vụ có trần thanh toán
    /// </summary>
    public async Task<CeilingCheckResult> CheckInsuranceCeilingAsync(Guid visitId)
    {
        try
        {
            var charges = await _unitOfWork.GetRepository<ChargeCollection>()
                .Query()
                .Include(cc => cc.Items)
                .FirstOrDefaultAsync(cc => cc.VisitId == visitId && !cc.IsDeleted);

            if (charges == null)
            {
                return new CeilingCheckResult(false, null, null, "Chưa có tổng hợp chi phí");
            }

            // Check against ceiling limits (example: 40 months of base salary)
            var baseSalary = 1800000m; // Base salary in VND
            var ceiling = baseSalary * 40;
            var isOverCeiling = charges.InsuranceAmount > ceiling;

            return new CeilingCheckResult(isOverCeiling, charges.InsuranceAmount, ceiling,
                isOverCeiling ? $"Vượt trần BHYT {(charges.InsuranceAmount - ceiling):N0} VNĐ" : "Trong trần BHYT");
        }
        catch (Exception ex)
        {
            return new CeilingCheckResult(false, null, null, $"Lỗi: {ex.Message}");
        }
    }

    #endregion

    #region XUẤT XML

    /// <summary>
    /// Xuất XML 130 cho BN nội trú
    /// RULE_INS_003
    /// </summary>
    public async Task<XmlGenerationResult> GenerateXml130Async(Guid admissionId)
    {
        try
        {
            var admission = await _unitOfWork.GetRepository<Admission>()
                .Query()
                .Include(a => a.Patient)
                .Include(a => a.Visit)
                    .ThenInclude(v => v!.InsuranceInfo)
                .FirstOrDefaultAsync(a => a.Id == admissionId && !a.IsDeleted);

            if (admission == null)
            {
                return new XmlGenerationResult(false, null, null, "Không tìm thấy bệnh án nội trú");
            }

            // Generate XML content (simplified)
            var xmlContent = GenerateXml130Content(admission);

            // Save XML record
            var xmlRecord = new InsuranceXml
            {
                Id = Guid.NewGuid(),
                AdmissionId = admissionId,
                XmlType = "130",
                XmlContent = xmlContent,
                Status = "Generated",
                GeneratedAt = DateTime.Now,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<InsuranceXml>().AddAsync(xmlRecord);
            await _unitOfWork.SaveChangesAsync();

            return new XmlGenerationResult(true, xmlRecord.Id, xmlContent, "Đã xuất XML 130");
        }
        catch (Exception ex)
        {
            return new XmlGenerationResult(false, null, null, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Xuất XML 4210 cho BN ngoại trú
    /// RULE_INS_003
    /// </summary>
    public async Task<XmlGenerationResult> GenerateXml4210Async(Guid visitId)
    {
        try
        {
            var visit = await _unitOfWork.GetRepository<Visit>()
                .Query()
                .Include(v => v.Patient)
                .Include(v => v.InsuranceInfo)
                .Include(v => v.Examination)
                .FirstOrDefaultAsync(v => v.Id == visitId && !v.IsDeleted);

            if (visit == null)
            {
                return new XmlGenerationResult(false, null, null, "Không tìm thấy lượt khám");
            }

            // Generate XML content
            var xmlContent = GenerateXml4210Content(visit);

            // Save XML record
            var xmlRecord = new InsuranceXml
            {
                Id = Guid.NewGuid(),
                VisitId = visitId,
                XmlType = "4210",
                XmlContent = xmlContent,
                Status = "Generated",
                GeneratedAt = DateTime.Now,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<InsuranceXml>().AddAsync(xmlRecord);
            await _unitOfWork.SaveChangesAsync();

            return new XmlGenerationResult(true, xmlRecord.Id, xmlContent, "Đã xuất XML 4210");
        }
        catch (Exception ex)
        {
            return new XmlGenerationResult(false, null, null, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Kiểm tra tính hợp lệ của XML
    /// - Validate theo schema BHXH
    /// - Kiểm tra dữ liệu bắt buộc
    /// </summary>
    public async Task<XmlValidationResult> ValidateXmlAsync(Guid xmlId)
    {
        try
        {
            var xml = await _unitOfWork.GetRepository<InsuranceXml>()
                .Query()
                .FirstOrDefaultAsync(x => x.Id == xmlId && !x.IsDeleted);

            if (xml == null)
            {
                return new XmlValidationResult(false, null, "Không tìm thấy XML");
            }

            var errors = new List<string>();

            // Validate required fields
            if (string.IsNullOrEmpty(xml.XmlContent))
            {
                errors.Add("Nội dung XML trống");
            }

            // In production: Validate against XSD schema
            // Here we do basic checks
            if (!xml.XmlContent?.Contains("<THONGTINBENHNHAN>") ?? true)
            {
                errors.Add("Thiếu thông tin bệnh nhân");
            }

            xml.IsValid = errors.Count == 0;
            xml.ValidationErrors = string.Join("; ", errors);
            xml.ValidatedAt = DateTime.Now;
            xml.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new XmlValidationResult(errors.Count == 0,
                errors.Count > 0 ? errors : null,
                errors.Count == 0 ? "XML hợp lệ" : "XML có lỗi");
        }
        catch (Exception ex)
        {
            return new XmlValidationResult(false, null, $"Lỗi: {ex.Message}");
        }
    }

    #endregion

    #region GỬI CỔNG BHXH

    /// <summary>
    /// Gửi XML lên cổng BHXH
    /// RULE_INS_003: Tự động đẩy cổng khi ra viện
    /// </summary>
    public async Task<PortalSubmissionResult> SubmitToPortalAsync(Guid xmlId)
    {
        try
        {
            var xml = await _unitOfWork.GetRepository<InsuranceXml>()
                .Query()
                .FirstOrDefaultAsync(x => x.Id == xmlId && !x.IsDeleted);

            if (xml == null)
            {
                return new PortalSubmissionResult(false, null, "Không tìm thấy XML");
            }

            if (!xml.IsValid)
            {
                return new PortalSubmissionResult(false, null, "XML chưa được validate hoặc không hợp lệ");
            }

            // In production: Call BHXH Portal API
            // Simulating submission
            var submissionId = $"SUB{DateTime.Now:yyyyMMddHHmmss}{new Random().Next(1000, 9999)}";

            // Create submission record
            var submission = new PortalSubmission
            {
                Id = Guid.NewGuid(),
                XmlId = xmlId,
                SubmissionId = submissionId,
                Status = "Submitted",
                SubmittedAt = DateTime.Now,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<PortalSubmission>().AddAsync(submission);

            // Update XML status
            xml.Status = "Submitted";
            xml.SubmittedAt = DateTime.Now;
            xml.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new PortalSubmissionResult(true, submissionId, "Đã gửi XML lên cổng BHXH");
        }
        catch (Exception ex)
        {
            return new PortalSubmissionResult(false, null, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Kiểm tra phản hồi từ cổng BHXH
    /// </summary>
    public async Task<PortalResponseResult> CheckPortalResponseAsync(Guid submissionId)
    {
        try
        {
            var submission = await _unitOfWork.GetRepository<PortalSubmission>()
                .Query()
                .FirstOrDefaultAsync(ps => ps.Id == submissionId && !ps.IsDeleted);

            if (submission == null)
            {
                return new PortalResponseResult(false, null, "Không tìm thấy gửi yêu cầu");
            }

            // In production: Poll BHXH API for response
            // Simulating response
            var status = "Approved"; // Approved, Rejected, Pending

            submission.ResponseStatus = status;
            submission.ResponseAt = DateTime.Now;
            submission.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new PortalResponseResult(true, status, $"Trạng thái: {status}");
        }
        catch (Exception ex)
        {
            return new PortalResponseResult(false, null, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Xử lý từ chối từ BHXH
    /// </summary>
    public async Task<RejectionHandleResult> HandleRejectionAsync(Guid submissionId, string reason)
    {
        try
        {
            var submission = await _unitOfWork.GetRepository<PortalSubmission>()
                .Query()
                .Include(ps => ps.Xml)
                .FirstOrDefaultAsync(ps => ps.Id == submissionId && !ps.IsDeleted);

            if (submission == null)
            {
                return new RejectionHandleResult(false, "Không tìm thấy yêu cầu gửi");
            }

            // Log rejection
            var rejection = new InsuranceRejection
            {
                Id = Guid.NewGuid(),
                SubmissionId = submissionId,
                XmlId = submission.XmlId,
                RejectionReason = reason,
                Status = "Pending", // Pending → Corrected → Resubmitted
                RejectedAt = DateTime.Now,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<InsuranceRejection>().AddAsync(rejection);

            // Update submission status
            submission.ResponseStatus = "Rejected";
            submission.RejectionReason = reason;
            submission.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new RejectionHandleResult(true, "Đã ghi nhận từ chối, cần sửa và gửi lại");
        }
        catch (Exception ex)
        {
            return new RejectionHandleResult(false, $"Lỗi: {ex.Message}");
        }
    }

    #endregion

    #region GIÁM ĐỊNH

    /// <summary>
    /// Xem xét hồ sơ claim BHYT
    /// </summary>
    public async Task<ClaimReviewResult> ReviewClaimAsync(Guid claimId)
    {
        try
        {
            var claim = await _unitOfWork.GetRepository<InsuranceClaim>()
                .Query()
                .FirstOrDefaultAsync(c => c.Id == claimId && !c.IsDeleted);

            if (claim == null)
            {
                return new ClaimReviewResult(false, "Không tìm thấy hồ sơ claim");
            }

            claim.Status = "UnderReview";
            claim.ReviewStartedAt = DateTime.Now;
            claim.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new ClaimReviewResult(true, "Đang xem xét hồ sơ");
        }
        catch (Exception ex)
        {
            return new ClaimReviewResult(false, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Duyệt claim BHYT
    /// </summary>
    public async Task<ClaimApprovalResult> ApproveClaimAsync(Guid claimId)
    {
        try
        {
            var claim = await _unitOfWork.GetRepository<InsuranceClaim>()
                .Query()
                .FirstOrDefaultAsync(c => c.Id == claimId && !c.IsDeleted);

            if (claim == null)
            {
                return new ClaimApprovalResult(false, "Không tìm thấy hồ sơ claim");
            }

            claim.Status = "Approved";
            claim.ApprovedAt = DateTime.Now;
            claim.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new ClaimApprovalResult(true, "Đã duyệt claim BHYT");
        }
        catch (Exception ex)
        {
            return new ClaimApprovalResult(false, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Từ chối claim BHYT
    /// </summary>
    public async Task<ClaimRejectionResult> RejectClaimAsync(Guid claimId, string reason)
    {
        try
        {
            var claim = await _unitOfWork.GetRepository<InsuranceClaim>()
                .Query()
                .FirstOrDefaultAsync(c => c.Id == claimId && !c.IsDeleted);

            if (claim == null)
            {
                return new ClaimRejectionResult(false, "Không tìm thấy hồ sơ claim");
            }

            claim.Status = "Rejected";
            claim.RejectionReason = reason;
            claim.RejectedAt = DateTime.Now;
            claim.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new ClaimRejectionResult(true, $"Đã từ chối claim: {reason}");
        }
        catch (Exception ex)
        {
            return new ClaimRejectionResult(false, $"Lỗi: {ex.Message}");
        }
    }

    #endregion

    #region Helper Methods

    private decimal GetCoverageRate(string categoryCode, bool isRightRoute)
    {
        // Category codes and coverage rates based on Vietnamese BHYT regulations
        return categoryCode switch
        {
            "DN" => isRightRoute ? 0.80m : 0.40m,  // Thông thường
            "HN" => 1.00m,                          // Hộ nghèo
            "TE" => 1.00m,                          // Trẻ em < 6 tuổi
            "HT" => isRightRoute ? 0.95m : 0.40m,  // Hưu trí
            "CC" => 1.00m,                          // Người có công
            "TN" => isRightRoute ? 0.80m : 0.60m,  // Thân nhân
            _ => isRightRoute ? 0.80m : 0.40m      // Default
        };
    }

    private async Task<bool> IsInInsuranceCatalogAsync(Guid? serviceId, Guid? medicineId)
    {
        if (serviceId.HasValue)
        {
            var service = await _unitOfWork.GetRepository<Service>()
                .Query()
                .FirstOrDefaultAsync(s => s.Id == serviceId && !s.IsDeleted);

            return service?.IsInsuranceCovered ?? false;
        }

        if (medicineId.HasValue)
        {
            var medicine = await _unitOfWork.GetRepository<Medicine>()
                .Query()
                .FirstOrDefaultAsync(m => m.Id == medicineId && !m.IsDeleted);

            return medicine?.IsInsuranceCovered ?? false;
        }

        return false;
    }

    private string GenerateXml130Content(Admission admission)
    {
        var sb = new StringBuilder();
        sb.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        sb.AppendLine("<GIAMDINHBHYT>");
        sb.AppendLine("  <THONGTINHOSO>");
        sb.AppendLine($"    <MA_LK>{admission.Id}</MA_LK>");
        sb.AppendLine($"    <MA_BN>{admission.Patient?.PatientCode}</MA_BN>");
        sb.AppendLine($"    <HO_TEN>{admission.Patient?.FullName}</HO_TEN>");
        sb.AppendLine($"    <NGAY_SINH>{admission.Patient?.DateOfBirth:yyyyMMdd}</NGAY_SINH>");
        sb.AppendLine($"    <GIOI_TINH>{admission.Patient?.Gender}</GIOI_TINH>");
        sb.AppendLine($"    <MA_THE>{admission.Visit?.InsuranceInfo?.CardNumber}</MA_THE>");
        sb.AppendLine($"    <NGAY_VAO>{admission.AdmittedAt:yyyyMMddHHmm}</NGAY_VAO>");
        sb.AppendLine($"    <NGAY_RA>{admission.DischargedAt:yyyyMMddHHmm}</NGAY_RA>");
        sb.AppendLine("  </THONGTINHOSO>");
        sb.AppendLine("  <THONGTINBENHNHAN>");
        // Additional patient info...
        sb.AppendLine("  </THONGTINBENHNHAN>");
        sb.AppendLine("  <THONGTINCHIPHI>");
        // Cost details...
        sb.AppendLine("  </THONGTINCHIPHI>");
        sb.AppendLine("</GIAMDINHBHYT>");
        return sb.ToString();
    }

    private string GenerateXml4210Content(Visit visit)
    {
        var sb = new StringBuilder();
        sb.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        sb.AppendLine("<GIAMDINHBHYT>");
        sb.AppendLine("  <THONGTINHOSO>");
        sb.AppendLine($"    <MA_LK>{visit.Id}</MA_LK>");
        sb.AppendLine($"    <MA_BN>{visit.Patient?.PatientCode}</MA_BN>");
        sb.AppendLine($"    <HO_TEN>{visit.Patient?.FullName}</HO_TEN>");
        sb.AppendLine($"    <MA_THE>{visit.InsuranceInfo?.CardNumber}</MA_THE>");
        sb.AppendLine($"    <NGAY_KCB>{visit.VisitDate:yyyyMMdd}</NGAY_KCB>");
        sb.AppendLine("  </THONGTINHOSO>");
        sb.AppendLine("  <THONGTINBENHNHAN>");
        sb.AppendLine("  </THONGTINBENHNHAN>");
        sb.AppendLine("</GIAMDINHBHYT>");
        return sb.ToString();
    }

    #endregion
}
