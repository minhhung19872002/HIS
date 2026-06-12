using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Insurance;
using HIS.Application.DTOs.Reception;
using HIS.Application.Services;
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
        if (string.IsNullOrWhiteSpace(dto.InsuranceNumber))
        {
            return new InsuranceVerificationResultDto
            {
                IsValid = false,
                InsuranceNumber = dto.InsuranceNumber ?? string.Empty,
                ErrorMessage = "Số BHYT không được để trống"
            };
        }

        // Blacklist check (nội bộ — BN đã bị chặn vì lạm dụng quyền lợi)
        var blocked = await _context.BlockedInsurances
            .FirstOrDefaultAsync(b => b.InsuranceNumber == dto.InsuranceNumber && b.IsBlocked);

        // Nhập 15 số thuần → infer nơi KKCB ban đầu từ mã thẻ
        // Nhập 20 số → có 5 số cuối là mã KKCB, realtime check thông tuyến
        var rawCard = dto.InsuranceNumber.Trim();
        var coreCardNumber = rawCard.Length >= 15 ? rawCard.Substring(0, 15) : rawCard;
        var facilityCodeFromCard = rawCard.Length >= 20 ? rawCard.Substring(15, 5) : null;

        // Dùng mock khi gateway chưa cấu hình (sandbox)
        if (_bhxhOptions.UseMock || string.IsNullOrWhiteSpace(_bhxhOptions.Username))
        {
            return BuildMockInsuranceResult(dto, coreCardNumber, facilityCodeFromCard, blocked);
        }

        try
        {
            var request = new BhxhCardVerifyRequest
            {
                MaThe = coreCardNumber,
                HoTen = dto.PatientName ?? string.Empty,
                NgaySinh = dto.DateOfBirth ?? default,
                MaCsKcb = _bhxhOptions.FacilityCode
            };
            var response = await _bhxhClient.VerifyCardAsync(request);

            var isOwnFacility = !string.IsNullOrEmpty(response.MaDkbd)
                && response.MaDkbd.Equals(_bhxhOptions.FacilityCode, StringComparison.OrdinalIgnoreCase);
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
                ErrorMessage = "Không kết nối được cổng BHXH: " + ex.Message
            };
        }
    }

    public async Task<InsuranceVerificationResultDto> VerifyInsuranceByQRAsync(string qrData)
    {
        // QR BHYT chuẩn: chuỗi có tối đa 20 ký tự số. QR CCCD tích hợp BHYT có thêm
        // phần CCCD nối sau. Parser rút 15-20 số BHYT đầu tiên.
        var digits = new string((qrData ?? string.Empty).Where(char.IsDigit).ToArray());
        var insuranceNumber = digits.Length >= 20 ? digits.Substring(0, 20)
            : digits.Length >= 15 ? digits.Substring(0, 15) : digits;
        return await VerifyInsuranceAsync(new InsuranceVerificationRequestDto { InsuranceNumber = insuranceNumber });
    }

    private InsuranceVerificationResultDto BuildMockInsuranceResult(
        InsuranceVerificationRequestDto dto,
        string coreCardNumber,
        string? facilityCodeFromCard,
        BlockedInsurance? blocked)
    {
        var rightRoute = facilityCodeFromCard == null ? 3
            : facilityCodeFromCard.Equals(_bhxhOptions.FacilityCode, StringComparison.OrdinalIgnoreCase) ? 1
            : 2;
        return new InsuranceVerificationResultDto
        {
            IsValid = blocked == null,
            InsuranceNumber = coreCardNumber,
            PatientName = dto.PatientName,
            DateOfBirth = dto.DateOfBirth,
            StartDate = DateTime.Today.AddYears(-1),
            EndDate = DateTime.Today.AddYears(1),
            FacilityCode = facilityCodeFromCard ?? _bhxhOptions.FacilityCode,
            FacilityName = facilityCodeFromCard != null ? "Nơi KKCB (mock)" : "Nơi KKCB cùng cơ sở",
            RightRoute = rightRoute,
            PaymentRate = 80,
            IsBlacklisted = blocked != null,
            BlacklistReason = blocked?.ReasonDetail,
            Warnings = blocked == null ? new List<string>() : new List<string> { "Bệnh nhân nằm trong danh sách chặn BHYT" }
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

    public async Task<(bool IsEligible, string Message)> CheckTemporaryInsuranceEligibilityAsync(DateTime dateOfBirth)
    {
        var age = DateTime.Today.Year - dateOfBirth.Year;
        if (age <= 6)
            return (true, "Du dieu kien cap the BHYT tam");
        return (false, "Tre tren 6 tuoi khong du dieu kien");
    }

    public async Task<TemporaryInsuranceCardDto> CreateTemporaryInsuranceAsync(CreateTemporaryInsuranceDto dto, Guid userId)
    {
        var eligibility = await CheckTemporaryInsuranceEligibilityAsync(dto.DateOfBirth);

        return new TemporaryInsuranceCardDto
        {
            PatientId = Guid.NewGuid(),
            PatientName = dto.PatientName,
            DateOfBirth = dto.DateOfBirth,
            BirthCertificateNumber = dto.BirthCertificateNumber,
            Guardian = dto.Guardian,
            TemporaryInsuranceNumber = $"TM{DateTime.Now:yyyyMMddHHmmss}",
            IssueDate = DateTime.Now,
            ExpiryDate = dto.DateOfBirth.AddYears(6),
            IsEligible = eligibility.IsEligible,
            EligibilityMessage = eligibility.Message
        };
    }

    public async Task<TemporaryInsuranceCardDto?> GetTemporaryInsuranceAsync(Guid patientId)
    {
        var patient = await _patientRepo.GetByIdAsync(patientId);
        if (patient == null) return null;

        // Temporary insurance cards are for newborns/children under 6
        var isEligible = patient.DateOfBirth.HasValue &&
            (DateTime.Now - patient.DateOfBirth.Value).TotalDays < 365 * 6;

        return new TemporaryInsuranceCardDto
        {
            PatientId = patientId,
            PatientName = patient.FullName,
            DateOfBirth = patient.DateOfBirth ?? DateTime.Now,
            TemporaryInsuranceNumber = $"TMP-{patientId.ToString()[..8].ToUpper()}",
            IssueDate = DateTime.Now,
            ExpiryDate = patient.DateOfBirth?.AddYears(6) ?? DateTime.Now.AddYears(6),
            IsEligible = isEligible,
            EligibilityMessage = isEligible ? "Đủ điều kiện cấp thẻ BHYT tạm" : "Không đủ điều kiện (trên 6 tuổi)"
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
            patient = await _context.Patients.FirstOrDefaultAsync(p => p.IdentityNumber == dto.IdentityNumber);
        }
        else if (!string.IsNullOrEmpty(dto.InsuranceNumber))
        {
            patient = await _context.Patients.FirstOrDefaultAsync(p => p.InsuranceNumber == dto.InsuranceNumber);
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
            throw new Exception("Khong tim thay benh nhan. Vui long dang ky moi.");
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
            throw new Exception($"The BHYT khong hop le: {insuranceResult.ErrorMessage}");
        }

        // Check insurance card expiry date
        if (insuranceResult.EndDate.HasValue && insuranceResult.EndDate.Value.Date < DateTime.Today)
        {
            throw new Exception($"Thẻ BHYT đã hết hạn ngày {insuranceResult.EndDate.Value:dd/MM/yyyy}");
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
        if (patient == null) throw new Exception("Khong tim thay benh nhan");

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

        if (appointment == null) throw new Exception("Khong tim thay lich hen hoac lich hen da su dung");

        var patient = appointment.Patient;
        var roomId = appointment.RoomId ?? throw new Exception("Lich hen khong co phong kham");

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
        var patient = await _context.Patients.FirstOrDefaultAsync(p => p.IdentityNumber == identityNumber);
        if (patient == null) throw new Exception("Khong tim thay benh nhan voi CCCD nay");

        return await QuickRegisterByPatientCodeAsync(patient.PatientCode, roomId, userId);
    }

    public async Task<AdmissionDto> RegisterByTreatmentCodeAsync(string treatmentCode, Guid roomId, Guid userId)
    {
        var medicalRecord = await _context.MedicalRecords
            .Include(m => m.Patient)
            .FirstOrDefaultAsync(m => m.MedicalRecordCode == treatmentCode);

        if (medicalRecord == null) throw new Exception("Khong tim thay ma dieu tri");

        return await QuickRegisterByPatientCodeAsync(medicalRecord.Patient.PatientCode, roomId, userId);
    }

    public async Task<AdmissionDto> RegisterBySmartCardAsync(string cardData, Guid roomId, Guid userId)
    {
        var smartCardData = await ReadSmartCardAsync(cardData);

        if (!string.IsNullOrEmpty(smartCardData.PatientCode))
        {
            return await QuickRegisterByPatientCodeAsync(smartCardData.PatientCode, roomId, userId);
        }

        throw new Exception("Khong doc duoc thong tin tu the");
    }

    #endregion
}
