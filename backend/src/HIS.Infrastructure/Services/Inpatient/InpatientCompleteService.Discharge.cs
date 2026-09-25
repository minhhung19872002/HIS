using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Inpatient;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Constants;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using System.Text;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

// K6 phien 4 (2026-05-30): tach 3.7 Discharge (~495 dong) khoi InpatientCompleteService.
public partial class InpatientCompleteService {
    #region 3.7 Discharge

    public async Task<PreDischargeCheckDto> CheckPreDischargeAsync(Guid admissionId)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null)
            throw new KeyNotFoundException("Admission not found");

        // Check unpaid prescriptions
        var unclaimedRx = await _context.Prescriptions
            .CountAsync(p => p.MedicalRecordId == admission.MedicalRecordId && p.Status < 2);

        // Check pending results
        var pendingResults = await _context.ServiceRequests
            .CountAsync(sr => sr.MedicalRecordId == admission.MedicalRecordId && sr.Status < 2);

        // QA-R11: an open surgery (chờ duyệt / đã lên lịch / đang mổ) did not stop the discharge — dev data holds a
        // discharged stay whose surgery is still "Đang mổ". It must be completed or cancelled first.
        // Pre-push review: only a surgery that is really running blocks (status "Đang mổ" touched in the last 24h);
        // pending / scheduled requests and stale legacy "Đang mổ" rows only warn so a stuck row never traps a patient.
        var openSurgeryRows = await _context.SurgeryRequests.AsNoTracking()
            .Where(r => r.MedicalRecordId == admission.MedicalRecordId && !r.IsDeleted
                        && (r.Status == 0 || r.Status == SurgeryStatus.RequestScheduled || r.Status == SurgeryStatus.RequestInProgress))
            .Select(r => new { r.RequestCode, r.Status, Touched = r.UpdatedAt ?? r.CreatedAt })
            .ToListAsync();
        var openSurgeries = openSurgeryRows.Select(r => r.RequestCode).ToList();
        var runningSince = DateTime.UtcNow.AddHours(-24);
        var surgeryRunning = openSurgeryRows.Any(r => r.Status == SurgeryStatus.RequestInProgress && r.Touched >= runningSince);

        // Query billing for unpaid balance.
        // QA-R3: services only → medicines and bed days were never owed at discharge. Same ledger as the cashier.
        var charges = await InvoiceLedger.LoadAsync(_context, admission.MedicalRecordId);
        var totalServiceAmount = charges.PatientTotal;
        // QA0915 (M6): payments = receipts of this stay (see GetStayPaymentsAsync) + the deposit balance
        // still available. Filtering receipts strictly by MedicalRecordId dropped QR payments (MR null)
        // and blocked discharge of patients who had already paid.
        var (receiptsPaid, depositBalance) = await GetStayPaymentsAsync(admission, ledgerCharges: true);
        var totalPaid = receiptsPaid + depositBalance;
        var remainingAmount = totalServiceAmount - totalPaid;
        // QA-R3 review B4: for this release bed days only WARN (bed history has open/stale assignments) — the block
        // stays on services + medicines debt, as before.
        var nonBedRemaining = (totalServiceAmount - charges.BedPatientTotal) - totalPaid;
        var hasUnpaidBalance = nonBedRemaining > 0;

        var warnings = new List<string>();
        if (unclaimedRx > 0)
            warnings.Add($"Còn {unclaimedRx} đơn thuốc chưa cấp phát");
        if (hasUnpaidBalance)
            warnings.Add($"Còn nợ viện phí {remainingAmount:N0}đ");
        else if (remainingAmount > 0)
            warnings.Add($"Còn nợ tiền giường {remainingAmount:N0}đ — không chặn ra viện; thu tại quầy thu ngân (kiểm tra ngày giường)");
        if (pendingResults > 0)
            warnings.Add($"Còn {pendingResults} chỉ định chưa có kết quả");
        if (openSurgeries.Count > 0)
            warnings.Add(surgeryRunning
                ? $"Bệnh nhân đang mổ ({string.Join(", ", openSurgeries)}) — hoàn thành hoặc hủy ca mổ trước khi ra viện"
                : $"Còn yêu cầu phẫu thuật chưa kết thúc ({string.Join(", ", openSurgeries)}) — không chặn ra viện; hủy/hoàn thành tại khoa PTTT");

        return new PreDischargeCheckDto
        {
            AdmissionId = admissionId,
            PatientName = admission.Patient.FullName,
            IsInsuranceValid = true,
            TotalAmount = totalServiceAmount,
            PaidAmount = totalPaid,
            RemainingAmount = remainingAmount,
            HasUnpaidBalance = hasUnpaidBalance,
            HasUnclaimedMedicine = unclaimedRx > 0,
            UnclaimedPrescriptionCount = unclaimedRx,
            HasPendingResults = pendingResults > 0,
            PendingResultCount = pendingResults,
            IsMedicalRecordComplete = true,
            MissingDocuments = new List<string>(),
            CanDischarge = !hasUnpaidBalance && unclaimedRx == 0 && pendingResults == 0 && !surgeryRunning,
            Warnings = warnings
        };
    }

    /// <summary>
    /// QA0915 (M6/M7): money already taken for one inpatient stay.
    /// <para>Receipts (type 2, status 1): those on this medical record, PLUS those with no medical record
    /// for the same patient dated within the stay — QR/gateway payments are written with
    /// MedicalRecordId = null. Receipts on another record are not counted (other visits).</para>
    /// <para>Deposit balance: deposits of this record (or record-less deposits of the patient within the
    /// stay), not cancelled, RemainingAmount (= Amount − used) minus refunds raised on the deposit that
    /// are not rejected/cancelled — same rule as BillingCompleteService.UseDepositForPaymentAsync.
    /// Used deposit money is already inside the receipts, so it is not counted twice.</para>
    /// </summary>
    private async Task<(decimal ReceiptsPaid, decimal DepositBalance)> GetStayPaymentsAsync(Admission admission, bool ledgerCharges = false)
    {
        var mrId = admission.MedicalRecordId;
        var patientId = admission.PatientId;
        // AdmissionDate is UTC on new rows / local on old ones — a day of slack for record-less items.
        var stayStart = admission.AdmissionDate.Date.AddDays(-1);
        var stayEnd = await _context.Set<Discharge>().AsNoTracking()
            .Where(d => d.AdmissionId == admission.Id)
            .Select(d => (DateTime?)d.DischargeDate)
            .FirstOrDefaultAsync() ?? DateTime.Now;
        stayEnd = stayEnd.Date.AddDays(2);

        // QA-R3 (ledgerCharges, pre-discharge): the charges come from InvoiceLedger, which leaves out items paid by
        // per-order/kiosk/prescription QR — so their receipts, and deposit-QR receipts (the deposit is counted as
        // balance / when spent), are not stay payments either; paid-out refunds of a payment give money back.
        var outOfLedger = InvoiceLedger.OutOfLedgerReceiptIds(_context);
        var receiptsPaid = await _context.Receipts.AsNoTracking()
            .Where(r => !r.IsDeleted && r.ReceiptType == 2 && r.Status == 1
                        && (!ledgerCharges || !outOfLedger.Contains(r.Id))
                        && (r.MedicalRecordId == mrId
                            || (r.MedicalRecordId == null && r.PatientId == patientId
                                && r.ReceiptDate >= stayStart && r.ReceiptDate < stayEnd)))
            .SumAsync(r => (decimal?)r.FinalAmount) ?? 0m;
        if (ledgerCharges)
            receiptsPaid -= await _context.Receipts.AsNoTracking()
                .Where(r => !r.IsDeleted && r.ReceiptType == 3 && r.Status == HIS.Core.Constants.RefundStatus.Paid
                            && r.OriginalPaymentId != null && r.MedicalRecordId == mrId
                            // review B7: refunds of out-of-ledger payments were never counted as paid
                            && !outOfLedger.Contains(r.OriginalPaymentId.Value))
                .SumAsync(r => (decimal?)r.FinalAmount) ?? 0m;

        var deposits = await _context.Deposits.AsNoTracking()
            .Where(d => !d.IsDeleted && d.Status != HIS.Core.Constants.DepositStatus.Cancelled
                        && (d.MedicalRecordId == mrId
                            || (d.MedicalRecordId == null && d.PatientId == patientId
                                && d.ReceiptDate >= stayStart && d.ReceiptDate < stayEnd)))
            .Select(d => new { d.Id, d.RemainingAmount })
            .ToListAsync();
        var depositIds = deposits.Select(d => d.Id).ToList();
        var refunds = depositIds.Count == 0 ? new Dictionary<Guid, decimal>()
            : await _context.Receipts.AsNoTracking()
                .Where(r => r.ReceiptType == 3 && !r.IsDeleted && r.OriginalDepositId != null
                            && depositIds.Contains(r.OriginalDepositId.Value)
                            && r.Status != HIS.Core.Constants.RefundStatus.Rejected
                            && r.Status != HIS.Core.Constants.RefundStatus.Cancelled)
                .GroupBy(r => r.OriginalDepositId!.Value)
                .Select(g => new { g.Key, Sum = g.Sum(r => r.FinalAmount) })
                .ToDictionaryAsync(x => x.Key, x => x.Sum);
        var depositBalance = deposits.Sum(d => Math.Max(0m, d.RemainingAmount - (refunds.TryGetValue(d.Id, out var rf) ? rf : 0m)));
        return (receiptsPaid, depositBalance);
    }

    public async Task<DischargeDto> DischargePatientAsync(CompleteDischargeDto dto, Guid userId)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .FirstOrDefaultAsync(a => a.Id == dto.AdmissionId);
        if (admission == null)
            throw new KeyNotFoundException("Admission not found");
        if (admission.Status != 0)
            // Business guard → InvalidOperationException để DomainExceptionFilter trả 400 (INVALID_STATE) thay vì 500.
            throw new InvalidOperationException("Bệnh nhân không trong trạng thái đang điều trị, không thể xuất viện");

        // QA0915: a discharge date before the admission date was accepted (negative length of stay on
        // the 6556 statement). Business timestamps are VN local: a client ISO value with "Z" (toISOString)
        // binds as Kind=Utc → store it as VN local; compare calendar days (a date-only discharge on the
        // admission day is valid).
        if (dto.DischargeDate.Kind == DateTimeKind.Utc)
            dto.DischargeDate = HIS.Core.Common.VnTime.UtcToVn(dto.DischargeDate);
        if (dto.DischargeDate.Date < admission.AdmissionDate.Date)
            throw new InvalidOperationException(
                $"Ngày ra viện ({dto.DischargeDate:dd/MM/yyyy}) không được trước ngày vào viện ({admission.AdmissionDate:dd/MM/yyyy}).");
        // QA-R4: a discharge dated 2030 was accepted — MedicalRecords.DischargeDate / 4210 export / bed-day
        // end then carry a future date.
        if (dto.DischargeDate.Date > HIS.Core.Common.VnTime.TodayVn)
            throw new InvalidOperationException(
                $"Ngày ra viện ({dto.DischargeDate:dd/MM/yyyy}) không được sau ngày hôm nay.");

        // Enforce pre-discharge checks
        var preCheck = await CheckPreDischargeAsync(dto.AdmissionId);
        if (!preCheck.CanDischarge)
        {
            var issues = preCheck.Warnings.Any() ? string.Join("; ", preCheck.Warnings) : "Chưa đủ điều kiện xuất viện";
            // Business guard (nợ phí / chỉ định chưa KQ...) → 400 message rõ, KHÔNG 500.
            throw new InvalidOperationException($"Không thể xuất viện: {issues}");
        }

        // QA0915 (P1): Discharges.AdmissionId carries a UNIQUE constraint, while CancelDischargeAsync
        // soft-deletes (#218). Re-discharging after a cancel therefore hit the constraint (409 DUPLICATE)
        // and the patient could never be discharged again. Reuse the cancelled row; its previous content
        // was written to AuditLogs by CancelDischargeAsync. Proper fix = filtered unique index (see report).
        var discharge = await _context.Set<Discharge>().IgnoreQueryFilters()
            .FirstOrDefaultAsync(d => d.AdmissionId == dto.AdmissionId && d.IsDeleted);
        if (discharge == null)
        {
            discharge = new Discharge
            {
                Id = Guid.NewGuid(),
                AdmissionId = dto.AdmissionId,
                CreatedAt = DateTime.Now,
                CreatedBy = null
            };
            _context.Set<Discharge>().Add(discharge);
        }
        else
        {
            discharge.IsDeleted = false;
            discharge.UpdatedAt = DateTime.UtcNow;
            discharge.UpdatedBy = userId.ToString();
        }
        discharge.DischargeDate = dto.DischargeDate;
        discharge.DischargeType = dto.DischargeType;
        discharge.DischargeCondition = dto.DischargeCondition;
        discharge.DischargeDiagnosis = dto.DischargeDiagnosis;
        discharge.DischargeInstructions = dto.DischargeInstructions;
        discharge.FollowUpDate = dto.FollowUpDate;
        discharge.DischargedBy = userId;

        // Update admission status
        admission.Status = dto.DischargeType switch
        {
            1 => 1, // Xuất viện
            2 => 2, // Chuyển viện
            3 => 4, // Bỏ về
            4 => 3, // Tử vong
            _ => 1
        };

        // Release bed
        var bedAssignment = await _context.Set<BedAssignment>()
            .FirstOrDefaultAsync(ba => ba.AdmissionId == dto.AdmissionId && ba.Status == 0);
        if (bedAssignment != null)
        {
            bedAssignment.Status = 1;
            bedAssignment.ReleasedAt = DateTime.Now;
        }

        // Update medical record
        var medRecord = await _context.MedicalRecords.FindAsync(admission.MedicalRecordId);
        if (medRecord != null)
        {
            medRecord.Status = 3; // Đã xuất viện
            medRecord.MainDiagnosis = dto.DischargeDiagnosis;
            // Length-of-stay, XML/4210 export and archive deadlines read MedicalRecords.DischargeDate,
            // which no discharge ever filled (every discharged record had it NULL).
            medRecord.DischargeDate = dto.DischargeDate;
        }

        await _context.SaveChangesAsync();

        var dischargeTypeName = dto.DischargeType switch
        {
            1 => "Ra viện",
            2 => "Chuyển viện",
            3 => "Bỏ về",
            4 => "Tử vong",
            _ => "Khác"
        };

        return new DischargeDto
        {
            Id = discharge.Id,
            AdmissionId = dto.AdmissionId,
            PatientName = admission.Patient.FullName,
            DischargeDate = dto.DischargeDate,
            DischargeType = dischargeTypeName,
            DischargeStatus = "Đã xuất viện",
            FinalDiagnosis = dto.DischargeDiagnosis ?? string.Empty,
            TreatmentSummary = dto.TreatmentSummary ?? string.Empty,
            DischargeInstructions = dto.DischargeInstructions ?? string.Empty,
            FollowUpDate = dto.FollowUpDate?.ToString("dd/MM/yyyy"),
            DischargedBy = userId.ToString()
        };
    }

    public async Task<bool> CancelDischargeAsync(Guid admissionId, string reason, Guid userId)
    {
        var discharge = await _context.Set<Discharge>()
            .FirstOrDefaultAsync(d => d.AdmissionId == admissionId);
        if (discharge == null)
            throw new KeyNotFoundException("Discharge record not found");

        var admission = await _context.Set<Admission>().FindAsync(admissionId);

        // #218/T3: không hủy được lượt đã ghi TỬ VONG. Trước đây `admission.Status = 0` gán cứng,
        // nên một lượt đã ghi tử vong bấm "hủy xuất viện" là bệnh nhân quay lại "đang điều trị".
        if (admission != null && admission.Status == AdmissionStatus.Died)
            throw new InvalidOperationException(
                "Lượt nội trú đã ghi nhận tử vong — không hủy xuất viện được. "
                + "Nếu ghi nhầm loại ra viện thì phải sửa qua đường tu chỉnh hồ sơ, có lưu vết.");

        // QA-R6: re-opening was allowed on a record whose bill was already locked / settled / sent to BHYT
        // (new charges then landed on a closed invoice), and while the patient already had another open stay.
        if (admission != null)
        {
            var record = await _context.MedicalRecords.AsNoTracking()
                .Where(m => m.Id == admission.MedicalRecordId)
                .Select(m => new { m.IsClosed, m.Status })
                .FirstOrDefaultAsync();
            if (record != null && (record.IsClosed || record.Status == MedicalRecordStatus.Cancelled || record.Status == MedicalRecordStatus.Paid))
                throw new InvalidOperationException(
                    "Hồ sơ đã khóa viện phí / đã thanh toán / đã hủy — mở khóa hồ sơ trước khi hủy ra viện.");
            if (await _context.InsuranceClaims.AnyAsync(c => c.MedicalRecordId == admission.MedicalRecordId && !c.IsDeleted && c.ClaimStatus >= 1))
                throw new InvalidOperationException("Hồ sơ đã duyệt/gửi BHYT — không hủy ra viện được.");
            if (await _context.Set<Admission>().AnyAsync(a => a.PatientId == admission.PatientId && a.Id != admissionId && !a.IsDeleted
                    && (a.Status == AdmissionStatus.InTreatment || a.Status == AdmissionStatus.PendingDischarge)))
                throw new InvalidOperationException("Bệnh nhân đang có lượt nội trú khác chưa kết thúc — không mở lại lượt này được.");
        }

        // #218/T3: XOÁ MỀM, không xoá cứng. `Discharge` giữ chẩn đoán ra viện, tóm tắt điều trị,
        // hướng dẫn sau xuất viện, ngày hẹn tái khám và người cho ra viện — tức một phần hồ sơ bệnh
        // án. `Remove()` trước đây xoá hẳn khỏi bảng, bấm một nút là mất sạch không còn gì đối chiếu.
        // Entity kế thừa BaseEntity và HISDbContext đã có bộ lọc xóa-mềm toàn cục, nên dòng đã đánh
        // dấu sẽ tự biến khỏi mọi truy vấn thường mà vẫn còn nguyên trong bảng.
        discharge.IsDeleted = true;
        discharge.UpdatedAt = DateTime.UtcNow;
        discharge.UpdatedBy = userId.ToString();

        // Revert admission status
        if (admission != null)
            admission.Status = AdmissionStatus.InTreatment;

        // QA0915 wave-2: discharge released the bed (assignment Status 1) but cancelling left the stay
        // "in treatment" with Admission.BedId pointing to a bed it no longer holds. Re-occupy the last
        // bed if it is still free; otherwise clear the pointer so the ward can assign a new bed.
        if (admission != null)
        {
            var lastBed = await _context.Set<BedAssignment>()
                .Where(ba => ba.AdmissionId == admissionId && ba.Status == 1)
                .OrderByDescending(ba => ba.ReleasedAt)
                .FirstOrDefaultAsync();
            var bedStillFree = lastBed != null && !await _context.Set<BedAssignment>()
                .AnyAsync(ba => ba.BedId == lastBed.BedId && ba.Status == 0);
            var alreadyHoldsBed = await _context.Set<BedAssignment>()
                .AnyAsync(ba => ba.AdmissionId == admissionId && ba.Status == 0);
            if (!alreadyHoldsBed && bedStillFree)
            {
                _context.Set<BedAssignment>().Add(new BedAssignment
                {
                    Id = Guid.NewGuid(),
                    AdmissionId = admissionId,
                    BedId = lastBed!.BedId,
                    AssignedAt = DateTime.Now,
                    Status = 0,
                    CreatedAt = DateTime.Now,
                    CreatedBy = userId.ToString()
                });
                admission.BedId = lastBed.BedId;
            }
            else if (!alreadyHoldsBed)
            {
                admission.BedId = null;
            }
        }

        // Update medical record
        var medRecord = await _context.MedicalRecords.FindAsync(admission?.MedicalRecordId);
        if (medRecord != null)
        {
            medRecord.Status = 2; // Đang điều trị
            medRecord.DischargeDate = null; // stay is open again
            if (admission != null) medRecord.BedId = admission.BedId; // QA0915: keep in sync with the restored/cleared bed
        }

        // #218/T3: LÝ DO trước đây nhận rồi vứt — hủy một quyết định ra viện là việc phải giải trình
        // được. `Discharge` không có ô nào để ghi, nên ghi vào nhật ký kiểm toán: đó mới là chỗ đúng
        // cho "ai làm gì, lúc nào, vì sao", và từ đợt sửa trước (#218) bảng này đã thật sự chống
        // sửa/xoá bằng trigger nên lý do ghi vào đây không bị xoá đi được.
        _context.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid(),
            TableName = "Discharges",
            RecordId = discharge.Id,
            EntityType = "Discharge",
            EntityId = discharge.Id.ToString(),
            Action = "CancelDischarge",
            Module = "Inpatient",
            UserId = userId,
            Timestamp = DateTime.UtcNow,
            Details = System.Text.Json.JsonSerializer.Serialize(new
            {
                admissionId,
                reason,
                dischargeType = discharge.DischargeType,
                dischargeDate = discharge.DischargeDate,
                // QA0915: the row is reused on re-discharge (unique AdmissionId) — keep its clinical content here.
                dischargeCondition = discharge.DischargeCondition,
                dischargeDiagnosis = discharge.DischargeDiagnosis,
                dischargeInstructions = discharge.DischargeInstructions,
                followUpDate = discharge.FollowUpDate,
                dischargedBy = discharge.DischargedBy,
            }),
            CreatedAt = DateTime.UtcNow,
        });

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<byte[]> PrintDischargeCertificateAsync(Guid admissionId)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = medRecord.Department;
        var doctor = await _context.Users.FindAsync(admission.AdmittingDoctorId);

        var discharge = await _context.Set<Discharge>()
            .FirstOrDefaultAsync(d => d.AdmissionId == admissionId);

        var html = GetDischargeLetter(
            patient.PatientCode, patient.FullName, patient.Gender, patient.DateOfBirth,
            patient.Address, patient.PhoneNumber, medRecord.InsuranceNumber,
            medRecord.MedicalRecordCode, dept?.DepartmentName,
            admission.AdmissionDate, discharge?.DischargeDate ?? DateTime.Now,
            admission.DiagnosisOnAdmission, discharge?.DischargeDiagnosis ?? medRecord.MainDiagnosis,
            discharge?.DischargeCondition.ToString(), discharge?.DischargeType ?? 1,
            discharge?.DischargeInstructions, discharge?.FollowUpDate,
            doctor?.FullName, null);

        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<byte[]> PrintReferralCertificateAsync(Guid admissionId, ReferralCertificateDto data)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = medRecord.Department;

        var bodyContent = new StringBuilder();
        bodyContent.AppendLine($@"<div class=""section-title"">I. CƠ SỞ CHUYỂN ĐI</div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Tên cơ sở:</span><span class=""field-value"">{Esc(data.FromHospitalName)}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Mã cơ sở:</span><span class=""field-value"">{Esc(data.FromHospitalCode)}</span></div>");
        bodyContent.AppendLine($@"<div class=""section-title"">II. CƠ SỞ NHẬN</div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Tên cơ sở:</span><span class=""field-value"">{Esc(data.ToHospitalName)}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Mã cơ sở:</span><span class=""field-value"">{Esc(data.ToHospitalCode)}</span></div>");
        bodyContent.AppendLine($@"<div class=""section-title"">III. THÔNG TIN CHUYỂN TUYẾN</div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Lý do chuyển:</span><span class=""field-value"">{Esc(data.TransferReason)}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Chẩn đoán:</span><span class=""field-value"">{Esc(data.Diagnosis)}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Tóm tắt điều trị:</span><span class=""field-value"">{Esc(data.TreatmentSummary)}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Tình trạng hiện tại:</span><span class=""field-value"">{Esc(data.CurrentCondition)}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Yêu cầu dịch vụ:</span><span class=""field-value"">{Esc(data.RequestedServices)}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Ngày chuyển:</span><span class=""field-value"">{data.TransferDate:dd/MM/yyyy}</span></div>");

        var html = GetGenericForm(
            "GIẤY CHUYỂN TUYẾN", "Theo TT 14/2014/TT-BYT",
            patient.PatientCode, patient.FullName, patient.Gender, patient.DateOfBirth,
            patient.Address, patient.PhoneNumber, medRecord.InsuranceNumber,
            medRecord.MedicalRecordCode, dept?.DepartmentName,
            bodyContent.ToString(), data.DoctorName);

        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<byte[]> PrintServiceDisclosureAsync(Guid admissionId)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = medRecord.Department;

        var details = await _context.ServiceRequestDetails
            .Include(d => d.Service)
            .Include(d => d.ServiceRequest)
            .Where(d => d.ServiceRequest.MedicalRecordId == medRecord.Id && !d.IsDeleted)
            .OrderBy(d => d.ServiceRequest.RequestDate)
            .ToListAsync();

        var headers = new[] { "Ngày", "Tên dịch vụ", "ĐVT", "SL", "Đơn giá", "Thành tiền", "Nguồn" };
        var rows = details.Select(d =>
        {
            var source = d.PatientType switch { 1 => "BHYT", 2 => "Viện phí", _ => "Khác" };
            return new[]
            {
                d.ServiceRequest.RequestDate.ToString("dd/MM/yyyy"),
                d.Service?.ServiceName ?? "",
                d.Service?.Unit ?? "",
                d.Quantity.ToString("#,##0"),
                d.UnitPrice.ToString("#,##0"),
                d.Amount.ToString("#,##0"),
                source
            };
        }).ToList();

        var html = BuildTableReport(
            "BẢNG CÔNG KHAI DỊCH VỤ",
            $"BN: {Esc(patient.FullName)} - Mã BN: {Esc(patient.PatientCode)} - Mã HS: {Esc(medRecord.MedicalRecordCode)} - Khoa: {Esc(dept?.DepartmentName)}",
            null,
            headers, rows);

        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<byte[]> PrintMedicineDisclosureAsync(Guid admissionId)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = medRecord.Department;

        var prescriptionDetails = await _context.PrescriptionDetails
            .Include(d => d.Medicine)
            .Include(d => d.Prescription)
            .Where(d => d.Prescription.MedicalRecordId == medRecord.Id && d.Prescription.PrescriptionType == 2)
            .OrderBy(d => d.Prescription.PrescriptionDate)
            .ToListAsync();

        var headers = new[] { "Ngày", "Tên thuốc", "ĐVT", "SL", "Đơn giá", "Thành tiền", "Nguồn" };
        var rows = prescriptionDetails.Select(d =>
        {
            var source = d.PatientType switch { 1 => "BHYT", 2 => "Viện phí", _ => "Khác" };
            return new[]
            {
                d.Prescription.PrescriptionDate.ToString("dd/MM/yyyy"),
                d.Medicine?.MedicineName ?? "",
                d.Unit ?? "",
                d.Quantity.ToString("#,##0"),
                d.UnitPrice.ToString("#,##0"),
                d.Amount.ToString("#,##0"),
                source
            };
        }).ToList();

        var html = BuildTableReport(
            "BẢNG CÔNG KHAI THUỐC",
            $"BN: {Esc(patient.FullName)} - Mã BN: {Esc(patient.PatientCode)} - Mã HS: {Esc(medRecord.MedicalRecordCode)} - Khoa: {Esc(dept?.DepartmentName)}",
            null,
            headers, rows);

        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<BillingStatement6556Dto> GetBillingStatement6556Async(Guid admissionId)
    {
        // QA0915 wave-2: was a stub (admission = today-7, 7 days, no lines) shown on the v2 6556 modal.
        // Built from the real stay, discharge, service lines and inpatient drug lines (cancelled / draft
        // lines excluded), plus the deposits taken on this medical record.
        var admission = await _context.Set<Admission>().AsNoTracking()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord)
            .FirstOrDefaultAsync(a => a.Id == admissionId)
            ?? throw new KeyNotFoundException("Admission not found");
        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var discharge = await _context.Set<Discharge>().AsNoTracking()
            .FirstOrDefaultAsync(d => d.AdmissionId == admissionId);

        var endDate = discharge?.DischargeDate ?? DateTime.Now;
        // Calendar days between admission and discharge (min 1). Whether BHYT's "+1 day" rule applies is a
        // billing-policy decision — see QA report.
        var days = Math.Max(1, (endDate.Date - admission.AdmissionDate.Date).Days);

        var serviceLines = await _context.ServiceRequestDetails.AsNoTracking()
            .Include(d => d.Service)
            .Where(d => d.ServiceRequest.MedicalRecordId == medRecord.Id && !d.IsDeleted && d.Status != 3
                        && d.ServiceRequest.Status != 4)
            .ToListAsync();
        var drugLines = await _context.PrescriptionDetails.AsNoTracking()
            .Include(d => d.Medicine)
            .Where(d => d.Prescription.MedicalRecordId == medRecord.Id && d.Prescription.PrescriptionType == 2
                        && !d.Prescription.IsDeleted
                        && d.Prescription.Status != HIS.Core.Constants.PrescriptionStatus.Cancelled
                        && d.Prescription.Status != HIS.Core.Constants.PrescriptionStatus.Draft)
            .ToListAsync();

        static string ServiceGroup(int serviceType) => serviceType switch
        {
            2 => "XN", 3 => "CĐHA", 4 => "TDCN", 5 => "PTTT", 1 => "Khám", _ => "DV"
        };

        var items = new List<HIS.Application.DTOs.Inpatient.BillingItemDto>();
        foreach (var d in serviceLines)
            items.Add(new HIS.Application.DTOs.Inpatient.BillingItemDto
            {
                ItemCode = d.Service?.ServiceCode ?? string.Empty,
                ItemName = d.Service?.ServiceName ?? string.Empty,
                Unit = d.Service?.Unit ?? string.Empty,
                Quantity = d.Quantity,
                UnitPrice = d.UnitPrice,
                Amount = d.Amount,
                InsuranceAmount = d.InsuranceAmount,
                PatientAmount = d.PatientAmount,
                InsuranceRatio = d.Amount > 0 ? Math.Round(d.InsuranceAmount * 100 / d.Amount, 0) : 0,
                ItemType = ServiceGroup(d.Service?.ServiceType ?? 0),
            });
        foreach (var d in drugLines)
            items.Add(new HIS.Application.DTOs.Inpatient.BillingItemDto
            {
                ItemCode = d.Medicine?.MedicineCode ?? string.Empty,
                ItemName = d.Medicine?.MedicineName ?? string.Empty,
                Unit = d.Unit ?? string.Empty,
                Quantity = d.Quantity,
                UnitPrice = d.UnitPrice,
                Amount = d.Amount,
                InsuranceAmount = d.InsuranceAmount,
                PatientAmount = d.PatientAmount,
                InsuranceRatio = d.Amount > 0 ? Math.Round(d.InsuranceAmount * 100 / d.Amount, 0) : 0,
                ItemType = "Thuốc",
            });
        // QA-R4 (money): bed days were missing from the 6556 statement while the cashier ledger and the
        // pre-discharge check charge them — same InvoiceLedger lines (nights × Beds.DailyPrice, BHYT split).
        var bedLines = (await InvoiceLedger.LoadAsync(_context, medRecord.Id)).Beds;
        foreach (var b in bedLines)
            items.Add(new HIS.Application.DTOs.Inpatient.BillingItemDto
            {
                ItemCode = b.Code,
                ItemName = b.Name,
                Unit = b.Unit ?? "Ngày",
                Quantity = b.Quantity,
                UnitPrice = b.UnitPrice,
                Amount = b.Amount,
                InsuranceAmount = b.InsuranceAmount,
                PatientAmount = b.PatientAmount,
                InsuranceRatio = b.Amount > 0 ? Math.Round(b.InsuranceAmount * 100 / b.Amount, 0) : 0,
                ItemType = "Giường",
            });
        for (var i = 0; i < items.Count; i++) items[i].OrderNo = i + 1;

        // QA0915 (M7): deposit = balance still available (net of usage and refunds), and receipts already
        // paid for this stay are subtracted too — summing raw deposit Amount inflated AmountDue/RefundAmount.
        var (receiptsPaid, deposit) = await GetStayPaymentsAsync(admission);

        var total = items.Sum(x => x.Amount);
        var insurance = items.Sum(x => x.InsuranceAmount);
        var patientPay = items.Sum(x => x.PatientAmount);
        var coPay = serviceLines.Where(d => d.PatientType == 1).Sum(d => d.PatientAmount)
                    + drugLines.Where(d => d.PatientType == 1).Sum(d => d.PatientAmount)
                    + bedLines.Where(b => b.InsuranceAmount > 0).Sum(b => b.PatientAmount);

        return new BillingStatement6556Dto
        {
            AdmissionId = admissionId,
            PatientName = patient?.FullName ?? string.Empty,
            PatientCode = patient?.PatientCode ?? string.Empty,
            InsuranceNumber = medRecord.InsuranceNumber,
            Gender = patient?.Gender ?? 0,
            DateOfBirth = patient?.DateOfBirth,
            Address = patient?.Address,
            AdmissionDate = admission.AdmissionDate,
            DischargeDate = endDate,
            DaysOfStay = days,
            Diagnosis = discharge?.DischargeDiagnosis ?? medRecord.MainDiagnosis ?? admission.DiagnosisOnAdmission,
            DiagnosisCode = medRecord.MainIcdCode,
            Items = items,
            TotalAmount = total,
            InsuranceAmount = insurance,
            PatientCoPayAmount = coPay,
            OutOfPocketAmount = patientPay - coPay,
            DepositAmount = deposit,
            RefundAmount = Math.Max(0, deposit - Math.Max(0, patientPay - receiptsPaid)),
            AmountDue = Math.Max(0, patientPay - receiptsPaid - deposit),
        };
    }

    public async Task<byte[]> PrintBillingStatement6556Async(Guid admissionId)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = medRecord.Department;
        var discharge = await _context.Set<Discharge>()
            .FirstOrDefaultAsync(d => d.AdmissionId == admissionId);
        var daysOfStay = discharge != null
            ? (discharge.DischargeDate - admission.AdmissionDate).Days
            : (DateTime.Now - admission.AdmissionDate).Days;

        // Gather services
        var serviceDetails = await _context.ServiceRequestDetails
            .Include(d => d.Service)
            .Include(d => d.ServiceRequest)
            .Where(d => d.ServiceRequest.MedicalRecordId == medRecord.Id && !d.IsDeleted)
            .ToListAsync();

        // Gather medicines
        var rxDetails = await _context.PrescriptionDetails
            .Include(d => d.Medicine)
            .Include(d => d.Prescription)
            .Where(d => d.Prescription.MedicalRecordId == medRecord.Id && d.Prescription.PrescriptionType == 2)
            .ToListAsync();

        var headers = new[] { "Nội dung", "ĐVT", "SL", "Đơn giá BHYT", "Thành tiền", "Tỷ lệ TT(%)", "Nguồn" };
        var rows = new List<string[]>();

        foreach (var d in serviceDetails)
        {
            rows.Add(new[]
            {
                d.Service?.ServiceName ?? "",
                d.Service?.Unit ?? "",
                d.Quantity.ToString("#,##0"),
                d.UnitPrice.ToString("#,##0"),
                d.Amount.ToString("#,##0"),
                "100",
                d.PatientType == 1 ? "BHYT" : "VP"
            });
        }
        foreach (var d in rxDetails)
        {
            rows.Add(new[]
            {
                d.Medicine?.MedicineName ?? "",
                d.Unit ?? "",
                d.Quantity.ToString("#,##0"),
                d.UnitPrice.ToString("#,##0"),
                d.Amount.ToString("#,##0"),
                "100",
                d.PatientType == 1 ? "BHYT" : "VP"
            });
        }

        var html = BuildTableReport(
            "BẢNG KÊ CHI PHÍ KHÁM CHỮA BỆNH",
            $"(Mẫu 6556 - TT 09/2024/TT-BYT) | BN: {Esc(patient.FullName)} - {Esc(patient.PatientCode)} | HS: {Esc(medRecord.MedicalRecordCode)} | Khoa: {Esc(dept?.DepartmentName)} | Vào: {admission.AdmissionDate:dd/MM/yyyy} | Ra: {discharge?.DischargeDate.ToString("dd/MM/yyyy") ?? "---"} | Số ngày: {daysOfStay}",
            null,
            headers, rows);

        // NangCap25 III.2 — còn nợ viện phí → nhúng QR động thanh toán ra viện
        // (helper tự bỏ qua khi BN không còn nợ / lỗi — phiếu vẫn in bình thường)
        var qrBlock = await _paymentGateway.BuildPrintQrBlockHtmlAsync(
            new HIS.Application.DTOs.Payment.DynamicQrRequestDto
            {
                ReferenceType = "discharge",
                ReferenceId = admissionId
            }, Guid.Empty);
        if (!string.IsNullOrEmpty(qrBlock))
            html = html.Replace("</body>", qrBlock + "</body>");

        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<byte[]> PrintBillingStatement6556ByPatientTypeAsync(Guid admissionId, int patientType)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = medRecord.Department;
        var typeName = patientType switch { 1 => "BHYT", 2 => "Viện phí", 3 => "Bên thứ 3", _ => "Khác" };

        var serviceDetails = await _context.ServiceRequestDetails
            .Include(d => d.Service)
            .Include(d => d.ServiceRequest)
            .Where(d => d.ServiceRequest.MedicalRecordId == medRecord.Id && !d.IsDeleted && d.PatientType == patientType)
            .ToListAsync();

        var rxDetails = await _context.PrescriptionDetails
            .Include(d => d.Medicine)
            .Include(d => d.Prescription)
            .Where(d => d.Prescription.MedicalRecordId == medRecord.Id && d.Prescription.PrescriptionType == 2 && d.PatientType == patientType)
            .ToListAsync();

        var headers = new[] { "Nội dung", "ĐVT", "SL", "Đơn giá", "Thành tiền" };
        var rows = new List<string[]>();
        foreach (var d in serviceDetails)
        {
            rows.Add(new[] { d.Service?.ServiceName ?? "", d.Service?.Unit ?? "", d.Quantity.ToString("#,##0"), d.UnitPrice.ToString("#,##0"), d.Amount.ToString("#,##0") });
        }
        foreach (var d in rxDetails)
        {
            rows.Add(new[] { d.Medicine?.MedicineName ?? "", d.Unit ?? "", d.Quantity.ToString("#,##0"), d.UnitPrice.ToString("#,##0"), d.Amount.ToString("#,##0") });
        }

        var html = BuildTableReport(
            $"BẢNG KÊ CHI PHÍ - {typeName}",
            $"BN: {Esc(patient.FullName)} - Mã HS: {Esc(medRecord.MedicalRecordCode)} - Khoa: {Esc(dept?.DepartmentName)}",
            null, headers, rows);

        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<byte[]> PrintBillingStatement6556ByDepartmentAsync(Guid admissionId, Guid departmentId)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = await _context.Departments.FindAsync(departmentId);

        var serviceDetails = await _context.ServiceRequestDetails
            .Include(d => d.Service)
            .Include(d => d.ServiceRequest)
            .Where(d => d.ServiceRequest.MedicalRecordId == medRecord.Id && !d.IsDeleted
                && d.ServiceRequest.DepartmentId == departmentId)
            .ToListAsync();

        var rxDetails = await _context.PrescriptionDetails
            .Include(d => d.Medicine)
            .Include(d => d.Prescription)
            .Where(d => d.Prescription.MedicalRecordId == medRecord.Id
                && d.Prescription.PrescriptionType == 2
                && d.Prescription.DepartmentId == departmentId)
            .ToListAsync();

        var headers = new[] { "Nội dung", "ĐVT", "SL", "Đơn giá", "Thành tiền", "Nguồn" };
        var rows = new List<string[]>();
        foreach (var d in serviceDetails)
        {
            rows.Add(new[] { d.Service?.ServiceName ?? "", d.Service?.Unit ?? "", d.Quantity.ToString("#,##0"), d.UnitPrice.ToString("#,##0"), d.Amount.ToString("#,##0"), d.PatientType == 1 ? "BHYT" : "VP" });
        }
        foreach (var d in rxDetails)
        {
            rows.Add(new[] { d.Medicine?.MedicineName ?? "", d.Unit ?? "", d.Quantity.ToString("#,##0"), d.UnitPrice.ToString("#,##0"), d.Amount.ToString("#,##0"), d.PatientType == 1 ? "BHYT" : "VP" });
        }

        var html = BuildTableReport(
            $"BẢNG KÊ CHI PHÍ THEO KHOA",
            $"BN: {Esc(patient.FullName)} - Khoa: {Esc(dept?.DepartmentName)} - Mã HS: {Esc(medRecord.MedicalRecordCode)}",
            null, headers, rows);

        return Encoding.UTF8.GetBytes(html);
    }

    #endregion
}
