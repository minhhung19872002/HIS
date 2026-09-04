using Microsoft.EntityFrameworkCore;
using HIS.Infrastructure.Security;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Insurance;
using HIS.Application.DTOs.Reception;
using HIS.Application.Services;
using HIS.Core.Common;
using HIS.Core.Constants;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Configuration;
using HIS.Infrastructure.Data;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using iText.IO.Font.Constants;
using iText.Kernel.Font;
using iText.Kernel.Pdf;
using iText.Layout;
using iText.Layout.Properties;
using iText.Barcodes;
using IxPageSize = iText.Kernel.Geom.PageSize;
using QueueDailyStatisticsDto = HIS.Application.DTOs.Reception.QueueDailyStatisticsDto;
using AverageWaitingTimeDto = HIS.Application.DTOs.Reception.AverageWaitingTimeDto;
using QueueReportRequestDto = HIS.Application.DTOs.Reception.QueueReportRequestDto;
using QueueConfigurationDto = HIS.Application.DTOs.Reception.QueueConfigurationDto;


namespace HIS.Infrastructure.Services;

// K9 phien 2 (2026-05-30): tach 3 region Insurance (1.3 BHYT + 1.4 Newborn + 1.7 Registration, ~534 dong) khoi ReceptionCompleteService.
public partial class ReceptionCompleteService {
    #region 1.3 Insurance (BHYT)

    public async Task<InsuranceVerificationResultDto> VerifyInsuranceAsync(InsuranceVerificationRequestDto dto)
    {
        // Chặn số thẻ sai định dạng NGAY tại backend. Trước đây nhánh mock trả "hợp lệ" cho mọi
        // chuỗi ký tự, nên tiếp đón có thể đăng ký lượt khám BHYT trên một số thẻ mà cổng BHXH
        // không bao giờ chấp nhận — sai quyền lợi và sai thanh toán.
        if (!BhytCardNumber.TryValidate(dto.InsuranceNumber, out var cardNumber, out var formatError))
        {
            return new InsuranceVerificationResultDto
            {
                IsValid = false,
                InsuranceNumber = cardNumber,
                DataSource = "VALIDATION",
                ErrorMessage = formatError
            };
        }

        // Nhập 15 số thuần → infer nơi KKCB ban đầu từ mã thẻ
        // Nhập 20 số → có 5 số cuối là mã KKCB, realtime check thông tuyến
        var coreCardNumber = BhytCardNumber.CoreOf(cardNumber);
        var facilityCodeFromCard = BhytCardNumber.FacilityCodeOf(cardNumber);

        // Blacklist check (nội bộ — BN đã bị chặn vì lạm dụng quyền lợi).
        // Đối chiếu cả chuỗi đã chuẩn hóa lẫn phần thẻ 15 ký tự: danh sách chặn lưu thẻ 15 ký tự,
        // nhưng đầu đọc có thể đưa vào chuỗi 20 ký tự.
        var blocked = await _context.BlockedInsurances
            .FirstOrDefaultAsync(b => b.IsBlocked
                && (b.InsuranceNumber == cardNumber || b.InsuranceNumber == coreCardNumber));

        var settings = _bhxhSettings != null ? await _bhxhSettings.GetAsync() : null;
        var facilityCode = settings?.FacilityCode ?? _bhxhOptions.FacilityCode;

        // Dùng mock khi cổng BHXH chưa được cấu hình đủ tài khoản (sandbox)
        var useMock = settings?.UseMock
            ?? (_bhxhOptions.UseMock || string.IsNullOrWhiteSpace(_bhxhOptions.Username));
        if (useMock)
        {
            return BuildMockInsuranceResult(dto, coreCardNumber, facilityCodeFromCard, facilityCode, blocked);
        }

        try
        {
            var request = new BhxhCardVerifyRequest
            {
                MaThe = coreCardNumber,
                HoTen = dto.PatientName ?? string.Empty,
                NgaySinh = dto.DateOfBirth ?? default,
                MaCsKcb = facilityCode
            };
            var response = await _bhxhClient.VerifyCardAsync(request);

            var isOwnFacility = !string.IsNullOrEmpty(response.MaDkbd)
                && response.MaDkbd.Equals(facilityCode, StringComparison.OrdinalIgnoreCase);
            var rightRoute = isOwnFacility ? 1 : (facilityCodeFromCard == null ? 3 : 2);

            return new InsuranceVerificationResultDto
            {
                IsValid = response.DuDkKcb,
                InsuranceNumber = coreCardNumber,
                PatientName = response.HoTen,
                DateOfBirth = response.NgaySinh == default ? null : response.NgaySinh,
                Gender = response.GioiTinh,
                Address = response.DiaChi,
                InsuranceCode = response.LoaiThe,
                StartDate = response.GtTheTu == default ? null : response.GtTheTu,
                EndDate = response.GtTheDen == default ? null : response.GtTheDen,
                IsExpired = response.GtTheDen != default && response.GtTheDen < DateTime.Today,
                FacilityCode = response.MaDkbd,
                FacilityName = response.TenDkbd,
                RightRoute = rightRoute,
                PaymentRate = ParsePaymentRate(response.MucHuong),
                IsBlacklisted = blocked != null,
                BlacklistReason = blocked?.ReasonDetail,
                Warnings = BuildInsuranceWarnings(response, blocked),
                DataSource = "BHXH",
                ErrorMessage = response.DuDkKcb ? null : (response.LyDoKhongDuDk ?? "Thẻ BHYT không đủ điều kiện KCB")
            };
        }
        catch (Exception ex)
        {
            _receptionLogger?.LogWarning(ex, "BHXH gateway verify failed for card {Card}", coreCardNumber);
            return new InsuranceVerificationResultDto
            {
                IsValid = false,
                InsuranceNumber = coreCardNumber,
                DataSource = "BHXH",
                ErrorMessage = "Không kết nối được cổng BHXH: " + ex.Message
            };
        }
    }

    public async Task<InsuranceVerificationResultDto> VerifyInsuranceByQRAsync(string qrData)
    {
        // QR thẻ BHYT / QR CCCD gắn chip có thể nối thêm nhiều trường sau số thẻ. Rút đúng khối mã
        // thẻ (2 chữ + 13 số, kèm 5 số mã CSKCB nếu có) — cách cũ lọc lấy chữ số sẽ cắt mất 2 ký tự
        // chữ đầu và cho ra số thẻ luôn sai định dạng.
        var insuranceNumber = BhytCardNumber.ExtractFrom(qrData);
        return await VerifyInsuranceAsync(new InsuranceVerificationRequestDto { InsuranceNumber = insuranceNumber });
    }

    /// <summary>
    /// Kết quả mô phỏng khi cơ sở chưa có tài khoản cổng giám định BHYT. Hạn thẻ và mức hưởng ở đây
    /// là giá trị giả định — luôn kèm cảnh báo + DataSource="MOCK" để tiếp đón không hiểu nhầm là
    /// đã tra cứu thật.
    /// </summary>
    private InsuranceVerificationResultDto BuildMockInsuranceResult(
        InsuranceVerificationRequestDto dto,
        string coreCardNumber,
        string? facilityCodeFromCard,
        string facilityCode,
        BlockedInsurance? blocked)
    {
        var rightRoute = facilityCodeFromCard == null ? 3
            : facilityCodeFromCard.Equals(facilityCode, StringComparison.OrdinalIgnoreCase) ? 1
            : 2;
        var warnings = new List<string>
        {
            "Chưa kết nối cổng BHXH — dữ liệu thẻ là mô phỏng, chưa đối chiếu quyền lợi thật"
        };
        if (blocked != null)
            warnings.Add("Bệnh nhân nằm trong danh sách chặn BHYT");

        return new InsuranceVerificationResultDto
        {
            IsValid = blocked == null,
            InsuranceNumber = coreCardNumber,
            PatientName = dto.PatientName,
            DateOfBirth = dto.DateOfBirth,
            StartDate = DateTime.Today.AddYears(-1),
            EndDate = DateTime.Today.AddYears(1),
            FacilityCode = facilityCodeFromCard ?? facilityCode,
            FacilityName = facilityCodeFromCard != null ? "Nơi KKCB (mock)" : "Nơi KKCB cùng cơ sở",
            RightRoute = rightRoute,
            PaymentRate = 80,
            IsBlacklisted = blocked != null,
            BlacklistReason = blocked?.ReasonDetail,
            DataSource = "MOCK",
            Warnings = warnings
        };
    }

    private static decimal ParsePaymentRate(string mucHuong)
    {
        if (string.IsNullOrWhiteSpace(mucHuong)) return 0;
        if (int.TryParse(new string(mucHuong.Where(char.IsDigit).ToArray()), out var code))
        {
            return code switch
            {
                1 => 100,
                2 => 100,
                3 => 95,
                4 => 80,
                5 => 100,
                _ => 80
            };
        }
        return 80;
    }

    private static List<string> BuildInsuranceWarnings(BhxhCardVerifyResponse response, BlockedInsurance? blocked)
    {
        var warnings = new List<string>();
        if (response.GtTheDen != default && response.GtTheDen < DateTime.Today.AddDays(30))
            warnings.Add($"Thẻ BHYT hết hạn {response.GtTheDen:dd/MM/yyyy}");
        if (response.NgayDu5Nam.HasValue && response.NgayDu5Nam.Value > DateTime.Today)
            warnings.Add($"Đủ 5 năm liên tục từ {response.NgayDu5Nam.Value:dd/MM/yyyy}");
        if (response.MienCungCt)
            warnings.Add("BN thuộc diện miễn cùng chi trả");
        if (blocked != null)
            warnings.Add("BN trong danh sách chặn BHYT của cơ sở");
        return warnings;
    }

    public async Task<bool> IsInsuranceBlockedAsync(string insuranceNumber)
    {
        return await _context.BlockedInsurances
            .AnyAsync(b => b.InsuranceNumber == insuranceNumber && b.IsBlocked);
    }

    public async Task<PagedResultDto<BlockedInsuranceDto>> GetBlockedInsuranceListAsync(string? keyword, int page, int pageSize)
    {
        var query = _context.BlockedInsurances
            .Include(b => b.BlockedBy)
            .Where(b => b.IsBlocked);

        if (!string.IsNullOrEmpty(keyword))
        {
            query = query.Where(b => b.InsuranceNumber.Contains(keyword) ||
                                    (b.ReasonDetail != null && b.ReasonDetail.Contains(keyword)));
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(b => b.BlockedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(b => new BlockedInsuranceDto
            {
                Id = b.Id,
                InsuranceNumber = b.InsuranceNumber,
                BlockReason = b.BlockReason,
                Notes = b.ReasonDetail,
                BlockedAt = b.BlockedAt,
                BlockedBy = b.BlockedBy.FullName
            })
            .ToListAsync();

        return new PagedResultDto<BlockedInsuranceDto>
        {
            Items = items,
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<BlockedInsuranceDto> BlockInsuranceAsync(string insuranceNumber, int reason, string? notes, Guid userId)
    {
        var blockedInsurance = new BlockedInsurance
        {
            Id = Guid.NewGuid(),
            InsuranceNumber = insuranceNumber,
            BlockReason = reason,
            ReasonDetail = notes,
            BlockedAt = DateTime.Now,
            BlockedByUserId = userId,
            IsBlocked = true,
            Notes = notes
        };

        await _context.BlockedInsurances.AddAsync(blockedInsurance);
        await _unitOfWork.SaveChangesAsync();

        var user = await _userRepo.GetByIdAsync(userId);

        return new BlockedInsuranceDto
        {
            Id = blockedInsurance.Id,
            InsuranceNumber = insuranceNumber,
            BlockReason = reason,
            Notes = notes,
            BlockedAt = blockedInsurance.BlockedAt,
            BlockedBy = user?.FullName
        };
    }

    public async Task UnblockInsuranceAsync(Guid id, Guid userId)
    {
        var blockedInsurance = await _context.BlockedInsurances.FindAsync(id);
        if (blockedInsurance != null)
        {
            blockedInsurance.IsBlocked = false;
            blockedInsurance.UnblockedAt = DateTime.Now;
            blockedInsurance.UnblockedByUserId = userId;
            await _unitOfWork.SaveChangesAsync();
        }
    }

    #endregion

    #region 1.4 Temporary Insurance for Newborns

    /// <summary>
    /// Chế độ áp dụng cho trẻ **dưới 6 tuổi** (CV 3434/BYT-BH), thẻ giá trị đến ngày trẻ đủ 72 tháng.
    ///
    /// <para>#218/T3 — trước đây file này có **hai luật tuổi khác nhau**, và luật dùng để CẤP thì
    /// sai: <c>Today.Year - dateOfBirth.Year &lt;= 6</c> nhận cả trẻ đã 6 tuổi, lại còn trừ năm cho
    /// nhau nên trẻ sinh cuối năm bị tính già thêm gần một tuổi. Hàm đọc bên dưới lại dùng luật khác
    /// (<c>&lt; 365*6</c> ngày). Nay cả hai gọi chung <see cref="InsuranceCardType.IsUnderSix"/> —
    /// lần thứ mười bảy trong đợt gặp hình dạng "một luật, hai cửa, mỗi cửa hiểu một kiểu".</para>
    /// </summary>
    public async Task<(bool IsEligible, string Message)> CheckTemporaryInsuranceEligibilityAsync(DateTime dateOfBirth)
    {
        await Task.CompletedTask;
        if (dateOfBirth.Date > DateTime.Today)
            return (false, "Ngày sinh ở tương lai, không hợp lệ.");
        if (InsuranceCardType.IsUnderSix(dateOfBirth, DateTime.Today))
            return (true, "Đủ điều kiện cấp thẻ BHYT tạm (trẻ dưới 6 tuổi).");
        return (false, "Trẻ đã đủ 72 tháng tuổi, không còn thuộc diện cấp thẻ BHYT tạm.");
    }

    /// <summary>
    /// Cấp thẻ BHYT tạm cho trẻ dưới 6 tuổi chưa có thẻ chính thức.
    ///
    /// <para>#218/T3 — trước đây hàm này **không ghi gì** và trả <c>PatientId = Guid.NewGuid()</c>,
    /// tức một mã bệnh nhân không thuộc về ai. Người tiếp đón cấp thẻ, phần mềm in ra số thẻ, bệnh
    /// viện không giữ bản ghi nào. Nó cũng **tính điều kiện rồi bỏ qua kết quả**: trẻ 8 tuổi vẫn
    /// nhận HTTP 200 kèm một tấm thẻ, chỉ khác mỗi cờ <c>IsEligible = false</c> mà không ai đọc.</para>
    ///
    /// <para>Bảng <c>InsuranceCards</c> đã có sẵn 18 cột — đây là **nhóm A** (thiếu đường ghi), tôi
    /// xếp nhầm sang nhóm B lúc khảo sát §38. Ghi vào đó cũng làm sống lại một đường đọc đang chết:
    /// <c>KioskService</c> cho bệnh nhân tự check-in bằng số thẻ BHYT qua chính bảng này, mà trước
    /// nay không chỗ nào ghi vào nên tra cứu ấy luôn trượt.</para>
    /// </summary>
    public async Task<TemporaryInsuranceCardDto> CreateTemporaryInsuranceAsync(CreateTemporaryInsuranceDto dto, Guid userId)
    {
        if (string.IsNullOrWhiteSpace(dto.PatientName))
            throw new InvalidOperationException("Chưa nhập họ tên trẻ.");

        var (duDieuKien, thongBao) = await CheckTemporaryInsuranceEligibilityAsync(dto.DateOfBirth);
        if (!duDieuKien)
            throw new InvalidOperationException(thongBao);

        // Trẻ có thể đã được tiếp đón trước đó — tra theo giấy khai sinh để không tạo trùng hồ sơ.
        Patient? patient = null;
        if (!string.IsNullOrWhiteSpace(dto.BirthCertificateNumber))
        {
            // Cột mã hoá ⇒ tra giải mã, không so bằng `==` dưới SQL (khuôn `PatientPiiLookup`).
            patient = await _context.Patients.Where(p => !p.IsDeleted)
                .FindByBirthCertificateNumberDecryptedAsync(dto.BirthCertificateNumber.Trim());
        }

        if (patient == null)
        {
            patient = new Patient
            {
                Id = Guid.NewGuid(),
                PatientCode = await GeneratePatientCodeAsync(),
                FullName = dto.PatientName.Trim(),
                DateOfBirth = dto.DateOfBirth,
                YearOfBirth = dto.DateOfBirth.Year,
                Gender = dto.Gender,
                BirthCertificateNumber = dto.BirthCertificateNumber?.Trim(),
                Address = dto.Address,
                GuardianName = dto.Guardian?.FullName,
                GuardianPhone = dto.Guardian?.PhoneNumber,
                GuardianRelationship = dto.Guardian?.Relationship,
                BranchId = await GetUserBranchIdAsync(userId),
                CreatedAt = DateTime.Now,
                CreatedBy = userId.ToString(),
                IsDeleted = false,
            };
            await _patientRepo.AddAsync(patient);
        }

        // Một trẻ chỉ giữ một thẻ tạm còn hiệu lực.
        var theCu = await _context.InsuranceCards.FirstOrDefaultAsync(c =>
            !c.IsDeleted && c.PatientId == patient.Id
            && c.CardType == InsuranceCardType.TemporaryUnderSix && c.IsActive);
        if (theCu != null)
            throw new InvalidOperationException(
                $"Trẻ này đã có thẻ BHYT tạm số {theCu.CardNumber} còn hiệu lực đến "
                + $"{theCu.EndDate:dd/MM/yyyy}. Muốn cấp lại thì phải thu hồi thẻ cũ.");

        var homNay = DateTime.Now;
        var ngay = homNay.ToString("yyyyMMdd");
        // Đánh số theo bộ đếm trong ngày. Bản cũ dùng `TM{yyyyMMddHHmmss}`: hai lượt cấp trong cùng
        // một giây ra trùng số, mà số thẻ là thứ người ta cầm đi đối chiếu.
        var soTrongNgay = await _context.InsuranceCards
            .CountAsync(c => c.CardNumber.StartsWith($"TM{ngay}"));

        var card = new InsuranceCard
        {
            Id = Guid.NewGuid(),
            PatientId = patient.Id,
            CardNumber = $"TM{ngay}{(soTrongNgay + 1):D4}",
            StartDate = homNay,
            EndDate = InsuranceCardType.ExpiryFor(dto.DateOfBirth),
            CardType = InsuranceCardType.TemporaryUnderSix,
            PaymentRate = InsuranceCardType.UnderSixPaymentRate, // trẻ dưới 6 tuổi hưởng 100%
            Note = $"Thẻ tạm cấp theo giấy khai sinh {dto.BirthCertificateNumber}",
            IsActive = true,
            CreatedAt = homNay,
            CreatedBy = userId.ToString(),
        };
        _context.InsuranceCards.Add(card);
        await _unitOfWork.SaveChangesAsync();

        return new TemporaryInsuranceCardDto
        {
            PatientId = patient.Id,
            PatientName = patient.FullName,
            DateOfBirth = dto.DateOfBirth,
            BirthCertificateNumber = dto.BirthCertificateNumber,
            Guardian = dto.Guardian,
            TemporaryInsuranceNumber = card.CardNumber,
            IssueDate = card.StartDate ?? homNay,
            ExpiryDate = card.EndDate ?? InsuranceCardType.ExpiryFor(dto.DateOfBirth),
            IsEligible = true,
            EligibilityMessage = thongBao,
        };
    }

    /// <summary>
    /// Tra thẻ BHYT tạm ĐÃ CẤP của một bệnh nhân. Chưa cấp thì trả <c>null</c>.
    ///
    /// <para>#218/T3 — trước đây hàm này **bịa thẻ cho bất kỳ ai**: nó không đọc thẻ đã cấp mà sinh
    /// <c>TemporaryInsuranceNumber = $"TMP-{patientId[..8]}"</c> cho mọi bệnh nhân truyền vào, kể cả
    /// cụ già 70 tuổi, kèm ngày cấp là hôm nay. Nó không bao giờ trả "chưa có thẻ". Cùng họ với vụ
    /// ký số tự sinh <c>Findings = "Ky so tu dong"</c> (§31): phần mềm tự tạo ra dữ liệu chưa ai
    /// nhập. Số thẻ nó sinh còn khác hẳn số mà cửa cấp thẻ in ra (<c>TM…</c> vs <c>TMP-…</c>), nên
    /// kể cả có lưu thì hai đầu cũng không khớp nhau.</para>
    /// </summary>
    public async Task<TemporaryInsuranceCardDto?> GetTemporaryInsuranceAsync(Guid patientId)
    {
        var card = await _context.InsuranceCards
            .Where(c => !c.IsDeleted && c.PatientId == patientId
                        && c.CardType == InsuranceCardType.TemporaryUnderSix && c.IsActive)
            .OrderByDescending(c => c.StartDate)
            .FirstOrDefaultAsync();
        if (card == null) return null;

        var patient = await _patientRepo.GetByIdAsync(patientId);
        var dob = patient?.DateOfBirth ?? card.EndDate?.AddYears(-6) ?? DateTime.Today;
        // Thẻ hết hạn khi trẻ đủ 72 tháng — dùng chung một luật với cửa cấp thẻ.
        var conHan = InsuranceCardType.IsUnderSix(dob, DateTime.Today)
                     && (card.EndDate == null || card.EndDate.Value.Date >= DateTime.Today);

        return new TemporaryInsuranceCardDto
        {
            PatientId = patientId,
            PatientName = patient?.FullName ?? string.Empty,
            DateOfBirth = dob,
            BirthCertificateNumber = patient?.BirthCertificateNumber,
            Guardian = new GuardianInfoDto
            {
                FullName = patient?.GuardianName ?? string.Empty,
                PhoneNumber = patient?.GuardianPhone,
                Relationship = patient?.GuardianRelationship,
            },
            TemporaryInsuranceNumber = card.CardNumber,
            IssueDate = card.StartDate ?? card.CreatedAt,
            ExpiryDate = card.EndDate ?? InsuranceCardType.ExpiryFor(dob),
            IsEligible = conHan,
            EligibilityMessage = conHan
                ? "Thẻ còn hiệu lực."
                : "Thẻ đã hết hiệu lực (trẻ đã đủ 72 tháng tuổi).",
        };
    }

    #endregion
    #region 1.7 Insurance Registration (BHYT)

    public async Task<AdmissionDto> RegisterInsurancePatientAsync(InsuranceRegistrationDto dto, Guid userId)
    {
        Patient? patient = null;
        bool isNewPatient = false;

        // Find existing patient
        if (dto.PatientId.HasValue)
        {
            patient = await _patientRepo.GetByIdAsync(dto.PatientId.Value);
        }
        else if (!string.IsNullOrEmpty(dto.PatientCode))
        {
            patient = await _context.Patients.FirstOrDefaultAsync(p => p.PatientCode == dto.PatientCode);
        }
        else if (!string.IsNullOrEmpty(dto.IdentityNumber))
        {
            patient = await _context.Patients
                .Where(p => !p.IsDeleted)
                .FindByIdentityNumberDecryptedAsync(dto.IdentityNumber);
        }
        else if (!string.IsNullOrEmpty(dto.InsuranceNumber))
        {
            patient = await _context.Patients
                .Where(p => !p.IsDeleted)
                .FindByInsuranceNumberDecryptedAsync(dto.InsuranceNumber);
        }

        // BN chưa có trong hệ thống (đăng ký BHYT lần đầu) → tạo mới từ NewPatient
        if (patient == null && dto.NewPatient != null)
        {
            patient = new Patient
            {
                Id = Guid.NewGuid(),
                PatientCode = await GeneratePatientCodeAsync(),
                FullName = dto.NewPatient.FullName,
                DateOfBirth = dto.NewPatient.DateOfBirth,
                YearOfBirth = dto.NewPatient.YearOfBirth,
                Gender = dto.NewPatient.Gender,
                IdentityNumber = dto.NewPatient.IdentityNumber ?? dto.IdentityNumber,
                PhoneNumber = dto.NewPatient.PhoneNumber,
                Email = dto.NewPatient.Email,
                Address = dto.NewPatient.Address,
                WardCode = dto.NewPatient.WardCode,
                WardName = dto.NewPatient.WardName,
                DistrictCode = dto.NewPatient.DistrictCode,
                DistrictName = dto.NewPatient.DistrictName,
                ProvinceCode = dto.NewPatient.ProvinceCode,
                ProvinceName = dto.NewPatient.ProvinceName,
                EthnicCode = dto.NewPatient.EthnicCode,
                EthnicName = dto.NewPatient.EthnicName,
                Occupation = dto.NewPatient.Occupation,
                InsuranceNumber = dto.InsuranceNumber,
                GuardianName = dto.NewPatient.GuardianName,
                GuardianPhone = dto.NewPatient.GuardianPhone,
                GuardianRelationship = dto.NewPatient.GuardianRelationship,
                BranchId = await GetUserBranchIdAsync(userId), // R3 đa cơ sở
                CreatedAt = DateTime.Now,
                CreatedBy = userId.ToString(),
                IsDeleted = false
            };
            await _patientRepo.AddAsync(patient);
            isNewPatient = true;
        }

        if (patient == null)
        {
            throw new KeyNotFoundException("Khong tim thay benh nhan. Vui long dang ky moi.");
        }

        // Verify insurance
        var insuranceResult = await VerifyInsuranceAsync(new InsuranceVerificationRequestDto
        {
            InsuranceNumber = dto.InsuranceNumber,
            PatientName = patient.FullName,
            DateOfBirth = patient.DateOfBirth
        });

        if (!insuranceResult.IsValid)
        {
            throw new InvalidOperationException($"The BHYT khong hop le: {insuranceResult.ErrorMessage}");
        }

        // Check insurance card expiry date
        if (insuranceResult.EndDate.HasValue && insuranceResult.EndDate.Value.Date < DateTime.Today)
        {
            throw new InvalidOperationException($"Thẻ BHYT đã hết hạn ngày {insuranceResult.EndDate.Value:dd/MM/yyyy}");
        }

        // Update patient insurance info.
        // BN mới đang ở state Added → KHÔNG gọi UpdateAsync (sẽ chuyển Added→Modified
        // khiến EF ra lệnh UPDATE thay vì INSERT → FK conflict); set field là đủ, SaveChanges sẽ INSERT.
        patient.InsuranceNumber = dto.InsuranceNumber;
        patient.InsuranceExpireDate = insuranceResult.EndDate;
        if (!isNewPatient)
        {
            await _patientRepo.UpdateAsync(patient);
        }

        // Create medical record
        var medicalRecord = new MedicalRecord
        {
            Id = Guid.NewGuid(),
            MedicalRecordCode = await GenerateMedicalRecordCodeAsync(),
            PatientId = patient.Id,
            AdmissionDate = DateTime.UtcNow, // dot16: chuẩn UTC
            PatientType = 1, // BHYT
            TreatmentType = 1, // Ngoai tru
            InsuranceNumber = dto.InsuranceNumber,
            InsuranceExpireDate = insuranceResult.EndDate,
            InsuranceFacilityCode = insuranceResult.FacilityCode,
            InsuranceRightRoute = insuranceResult.RightRoute,
            RoomId = dto.RoomId,
            DoctorId = dto.DoctorId,
            Status = 0, // Waiting
            CreatedAt = DateTime.UtcNow, // dot16: chuẩn UTC — query DayRangeUtc
            CreatedBy = userId.ToString(),
            IsDeleted = false
        };

        await _medicalRecordRepo.AddAsync(medicalRecord);

        // Get room info
        var room = await _context.Rooms.Include(r => r.Department).FirstOrDefaultAsync(r => r.Id == dto.RoomId);

        // Create examination
        var examination = new Examination
        {
            Id = Guid.NewGuid(),
            MedicalRecordId = medicalRecord.Id,
            ExaminationType = 1, // Primary
            DepartmentId = room?.DepartmentId ?? Guid.Empty,
            RoomId = dto.RoomId,
            DoctorId = dto.DoctorId,
            Status = 0, // Waiting
            CreatedAt = DateTime.UtcNow, // dot16: chuẩn UTC — query DayRangeUtc
            CreatedBy = userId.ToString(),
            IsDeleted = false
        };

        await _examinationRepo.AddAsync(examination);

        // Issue queue ticket
        var queueTicket = await IssueQueueTicketAsync(new IssueQueueTicketDto
        {
            PatientId = patient.Id,
            PatientName = patient.FullName,
            RoomId = dto.RoomId,
            QueueType = 2, // Kham benh
            Priority = dto.IsPriority ? 1 : 0,
            Source = "Reception"
        });

        examination.QueueNumber = queueTicket.QueueNumber;
        await _examinationRepo.UpdateAsync(examination);
        await _unitOfWork.SaveChangesAsync();

        return MapToAdmissionDto(medicalRecord, patient, room, queueTicket);
    }

    public async Task<AdmissionDto> QuickRegisterByPatientCodeAsync(string patientCode, Guid roomId, Guid userId)
    {
        var patient = await _context.Patients.FirstOrDefaultAsync(p => p.PatientCode == patientCode);
        if (patient == null) throw new KeyNotFoundException("Khong tim thay benh nhan");

        if (!string.IsNullOrEmpty(patient.InsuranceNumber))
        {
            return await RegisterInsurancePatientAsync(new InsuranceRegistrationDto
            {
                PatientId = patient.Id,
                InsuranceNumber = patient.InsuranceNumber,
                RoomId = roomId
            }, userId);
        }
        else
        {
            return await RegisterFeePatientAsync(new FeeRegistrationDto
            {
                PatientId = patient.Id,
                RoomId = roomId,
                ServiceType = 2 // Vien phi
            }, userId);
        }
    }

    public async Task<AdmissionDto> QuickRegisterByAppointmentAsync(string appointmentCode, Guid userId)
    {
        var appointment = await _context.Appointments
            .Include(a => a.Patient)
            .FirstOrDefaultAsync(a => a.AppointmentCode == appointmentCode && a.Status == 1);

        if (appointment == null) throw new KeyNotFoundException("Khong tim thay lich hen hoac lich hen da su dung");

        var patient = appointment.Patient;
        var roomId = appointment.RoomId ?? throw new InvalidOperationException("Lich hen khong co phong kham");

        // Mark appointment as used
        appointment.Status = 2; // Used
        await _unitOfWork.SaveChangesAsync();

        if (!string.IsNullOrEmpty(patient.InsuranceNumber))
        {
            return await RegisterInsurancePatientAsync(new InsuranceRegistrationDto
            {
                PatientId = patient.Id,
                InsuranceNumber = patient.InsuranceNumber,
                RoomId = roomId
            }, userId);
        }
        else
        {
            return await RegisterFeePatientAsync(new FeeRegistrationDto
            {
                PatientId = patient.Id,
                RoomId = roomId,
                ServiceType = 2
            }, userId);
        }
    }

    public async Task<AdmissionDto> QuickRegisterByIdentityAsync(string identityNumber, Guid roomId, Guid userId)
    {
        var patient = await _context.Patients
            .Where(p => !p.IsDeleted)
            .FindByIdentityNumberDecryptedAsync(identityNumber);
        if (patient == null) throw new KeyNotFoundException("Khong tim thay benh nhan voi CCCD nay");

        return await QuickRegisterByPatientCodeAsync(patient.PatientCode, roomId, userId);
    }

    public async Task<AdmissionDto> RegisterByTreatmentCodeAsync(string treatmentCode, Guid roomId, Guid userId)
    {
        var medicalRecord = await _context.MedicalRecords
            .Include(m => m.Patient)
            .FirstOrDefaultAsync(m => m.MedicalRecordCode == treatmentCode);

        if (medicalRecord == null) throw new KeyNotFoundException("Khong tim thay ma dieu tri");

        return await QuickRegisterByPatientCodeAsync(medicalRecord.Patient.PatientCode, roomId, userId);
    }

    public async Task<AdmissionDto> RegisterBySmartCardAsync(string cardData, Guid roomId, Guid userId)
    {
        var smartCardData = await ReadSmartCardAsync(cardData);

        if (!string.IsNullOrEmpty(smartCardData.PatientCode))
        {
            return await QuickRegisterByPatientCodeAsync(smartCardData.PatientCode, roomId, userId);
        }

        throw new InvalidOperationException("Khong doc duoc thong tin tu the");
    }

    #endregion
}
