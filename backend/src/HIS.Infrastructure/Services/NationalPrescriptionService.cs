using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.NationalPrescription;
using HIS.Application.Services;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class NationalPrescriptionService : INationalPrescriptionService
{
    private readonly HISDbContext _db;
    private readonly INationalPrescriptionGatewayClient _gatewayClient;

    public NationalPrescriptionService(HISDbContext db, INationalPrescriptionGatewayClient gatewayClient)
    {
        _db = db;
        _gatewayClient = gatewayClient;
    }

    public Task<NationalPrescriptionPagedResult> SearchAsync(NationalPrescriptionSearchDto search)
        => SearchCoreAsync(search, null);

    private async Task<NationalPrescriptionPagedResult> SearchCoreAsync(NationalPrescriptionSearchDto search, Guid? onlyId)
    {
        var query = _db.Prescriptions
            .Include(p => p.Details).ThenInclude(d => d.Medicine)
            .Include(p => p.MedicalRecord).ThenInclude(mr => mr.Patient)
            .Include(p => p.Doctor)
            .AsNoTracking();

        if (onlyId.HasValue)
            query = query.Where(p => p.Id == onlyId.Value);

        // #218/T3: màn hình này là Cổng ĐTQG nên bộ lọc trạng thái phải soi trạng thái GỬI,
        // không phải trạng thái duyệt/cấp phát thuốc. Đơn chưa gửi có NationalPortalStatus NULL.
        if (search.Status.HasValue)
            query = query.Where(p => (p.NationalPortalStatus ?? 0) == search.Status.Value);

        if (!string.IsNullOrEmpty(search.DateFrom) && DateTime.TryParse(search.DateFrom, out var from))
            query = query.Where(p => p.PrescriptionDate >= from);

        if (!string.IsNullOrEmpty(search.DateTo) && DateTime.TryParse(search.DateTo, out var to))
            query = query.Where(p => p.PrescriptionDate <= to.AddDays(1));

        if (!string.IsNullOrEmpty(search.Keyword))
        {
            var kw = search.Keyword.ToLower();
            query = query.Where(p =>
                p.PrescriptionCode.ToLower().Contains(kw) ||
                (p.MedicalRecord.Patient.FullName != null && p.MedicalRecord.Patient.FullName.ToLower().Contains(kw)));
        }

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(p => p.PrescriptionDate)
            .Skip(search.PageIndex * search.PageSize)
            .Take(search.PageSize)
            .Select(p => new NationalPrescriptionDto
            {
                Id = p.Id,
                PrescriptionCode = p.PrescriptionCode,
                PatientName = p.MedicalRecord.Patient.FullName ?? "",
                PatientCode = p.MedicalRecord.Patient.PatientCode ?? "",
                PatientIdNumber = p.MedicalRecord.Patient.IdentityNumber,
                InsuranceNumber = p.MedicalRecord.InsuranceNumber,
                DoctorName = p.Doctor != null ? p.Doctor.FullName : "",
                FacilityCode = "BV-LC",
                FacilityName = "Bệnh viện Đa khoa",
                DiagnosisCode = p.DiagnosisCode ?? p.IcdCode ?? "",
                DiagnosisName = p.DiagnosisName ?? p.Diagnosis ?? "",
                PrescriptionDate = p.PrescriptionDate,
                TotalAmount = p.TotalAmount,
                InsuranceAmount = p.InsuranceAmount,
                PatientAmount = p.PatientAmount,
                // Trước đây chiếu thẳng `p.Status` (trạng thái cấp phát) và bịa `SubmittedAt`
                // từ ngày tạo đơn — cả màn hình báo sai. Nay đọc đúng ô của cổng.
                Status = p.NationalPortalStatus ?? 0,
                SubmittedAt = p.NationalPortalSubmittedAt,
                Items = p.Details.Select(d => new NationalPrescriptionItemDto
                {
                    MedicineCode = d.Medicine.MedicineCode,
                    MedicineName = d.Medicine.MedicineName,
                    ActiveIngredient = d.Medicine.ActiveIngredient ?? "",
                    DosageForm = d.Medicine.RouteName ?? "",
                    Strength = d.Medicine.Concentration ?? "",
                    Unit = d.Unit ?? d.Medicine.Unit ?? "",
                    Quantity = d.Quantity,
                    UnitPrice = d.UnitPrice,
                    TotalPrice = d.TotalPrice,
                    Dosage = d.Dosage ?? "",
                    Frequency = d.Frequency ?? "",
                    Duration = d.Days,
                    Route = d.Route ?? d.Medicine.RouteName ?? "",
                    InsuranceCovered = d.Medicine.IsInsuranceCovered
                }).ToList()
            })
            .ToListAsync();

        return new NationalPrescriptionPagedResult
        {
            Items = items,
            TotalCount = totalCount,
            PageIndex = search.PageIndex,
            PageSize = search.PageSize
        };
    }

    public async Task<NationalPrescriptionDto?> GetByIdAsync(Guid id)
    {
        // Was: project EVERY prescription in the database (PageSize = int.MaxValue) then pick one in memory.
        var result = await SearchCoreAsync(new NationalPrescriptionSearchDto { PageIndex = 0, PageSize = 1 }, id);
        return result.Items.FirstOrDefault();
    }

    /// <summary>
    /// Trạng thái gửi Cổng ĐTQG. Tách hẳn khỏi <c>Prescriptions.Status</c> (trạng thái duyệt/cấp
    /// phát thuốc) từ #218/T3 — xem migration 175.
    /// </summary>
    private const int PortalNotSent = 0;
    private const int PortalSent = 1;
    private const int PortalFailed = 2;
    private const int PortalCancelled = 3;

    /// <summary>
    /// R3: every send goes through <see cref="INationalPrescriptionGatewayClient"/> (InMemory client in MockMode,
    /// HTTP client otherwise). Before, submit/batch/retry wrote "sent" with a made-up CQLKCB-… id and never called
    /// the portal. Writes only the portal columns (#218/T3), never <c>Prescriptions.Status</c>.
    /// </summary>
    private async Task<(bool Ok, string? TransactionId, string Message)> SendToGatewayAsync(HIS.Core.Entities.Prescription rx)
    {
        if (rx.Status is HIS.Core.Constants.PrescriptionStatus.Draft or HIS.Core.Constants.PrescriptionStatus.Cancelled)
            return (false, null, "Đơn nháp/đã hủy không gửi lên Cổng ĐTQG.");
        if (rx.Details.Count == 0)
            return (false, null, "Đơn thuốc trống — không gửi được.");

        var facilityCode = await _db.SystemConfigs.AsNoTracking()
            .Where(c => (c.ConfigKey == "NangCap23.NationalGateway.FacilityCode" || c.ConfigKey == "DQGVN:FacilityCode")
                        && c.IsActive && !c.IsDeleted)
            .OrderBy(c => c.ConfigKey == "NangCap23.NationalGateway.FacilityCode" ? 0 : 1)
            .Select(c => c.ConfigValue)
            .FirstOrDefaultAsync() ?? string.Empty;
        var patient = rx.MedicalRecord?.Patient;
        var code = $"DTQG-{DateTime.Now:yyyyMMddHHmmss}-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";
        var payload = System.Text.Json.JsonSerializer.Serialize(new
        {
            submissionCode = code,
            facilityCode,
            prescriptionCode = rx.PrescriptionCode,
            issuedAt = rx.PrescriptionDate.ToString("yyyy-MM-ddTHH:mm:ss"),
            patient = new
            {
                idNumber = patient?.IdentityNumber ?? "",
                fullName = patient?.FullName ?? "",
                gender = patient?.Gender,
                dob = patient?.DateOfBirth?.ToString("yyyy-MM-dd"),
                insuranceNumber = rx.MedicalRecord?.InsuranceNumber,
            },
            diagnosisCode = rx.DiagnosisCode ?? rx.IcdCode,
            diagnosis = rx.DiagnosisName ?? rx.Diagnosis,
            items = rx.Details.Where(d => !d.IsDeleted).Select(d => new
            {
                medicineCode = d.Medicine?.MedicineCode,
                medicineName = d.Medicine?.MedicineName,
                quantity = d.Quantity,
                unit = d.Unit ?? d.Medicine?.Unit,
                dosage = d.Dosage,
                usage = d.Usage ?? d.UsageInstructions,
                durationDays = d.Days
            })
        });

        GatewaySubmissionResult result;
        try { result = await _gatewayClient.SubmitAsync(payload); }
        catch (Exception ex) { result = new GatewaySubmissionResult { Acknowledged = false, ErrorCode = "NETWORK_ERROR", ErrorMessage = ex.Message }; }

        rx.NationalPortalSubmittedAt = DateTime.UtcNow;
        if (result.Acknowledged)
        {
            rx.NationalPortalStatus = PortalSent;
            rx.NationalPortalTransactionId = result.TransactionId ?? code;
            return (true, rx.NationalPortalTransactionId, "Đã gửi đơn thuốc lên Cổng đơn thuốc quốc gia");
        }
        rx.NationalPortalStatus = PortalFailed;
        return (false, null, $"Cổng ĐTQG từ chối/không phản hồi: {result.ErrorCode} {result.ErrorMessage}".Trim());
    }

    private Task<HIS.Core.Entities.Prescription?> LoadForSendAsync(Guid id)
        => _db.Prescriptions
            .Include(p => p.Details).ThenInclude(d => d.Medicine)
            .Include(p => p.MedicalRecord).ThenInclude(m => m.Patient)
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);

    public async Task<object> SubmitAsync(Guid prescriptionId, string userId)
    {
        var prescription = await LoadForSendAsync(prescriptionId);
        if (prescription == null)
            return new { success = false, transactionId = "", message = "Không tìm thấy đơn thuốc" };

        // #218/T3: chặn gửi lại một đơn ĐÃ gửi. Trước đây không kiểm gì, gọi bao nhiêu lần cũng được.
        if (prescription.NationalPortalStatus == PortalSent)
            return new
            {
                success = true,
                transactionId = prescription.NationalPortalTransactionId ?? "",
                message = "Đơn thuốc này đã được gửi lên Cổng ĐTQG trước đó."
            };

        var (ok, transactionId, message) = await SendToGatewayAsync(prescription);
        await _db.SaveChangesAsync();
        // A refused/failed send is an error for the caller (400 via DomainExceptionFilter), not a success toast.
        if (!ok) throw new InvalidOperationException(message);
        return new { success = true, transactionId = transactionId ?? "", message };
    }

    public async Task<SubmitBatchResult> SubmitBatchAsync(List<string> prescriptionIds, string userId)
    {
        var results = new List<BatchItemResult>();
        int success = 0, fail = 0;

        // #195: nạp 1 lần các đơn hợp lệ trong lô thay vì 1 query/đơn.
        var parsedIds = prescriptionIds
            .Select(s => Guid.TryParse(s, out var g) ? g : (Guid?)null)
            .Where(g => g.HasValue)
            .Select(g => g!.Value)
            .Distinct()
            .ToList();
        var prescriptionsById = await _db.Prescriptions
            .Include(p => p.Details).ThenInclude(d => d.Medicine)
            .Include(p => p.MedicalRecord).ThenInclude(m => m.Patient)
            .Where(p => parsedIds.Contains(p.Id) && !p.IsDeleted)
            .ToDictionaryAsync(p => p.Id);

        foreach (var idStr in prescriptionIds)
        {
            if (!Guid.TryParse(idStr, out var id))
            {
                fail++;
                results.Add(new BatchItemResult { Id = idStr, Success = false, Message = "ID không hợp lệ" });
                continue;
            }

            prescriptionsById.TryGetValue(id, out var prescription);
            if (prescription == null)
            {
                fail++;
                results.Add(new BatchItemResult { Id = idStr, Success = false, Message = "Không tìm thấy" });
                continue;
            }

            if (prescription.NationalPortalStatus == PortalSent)
            {
                fail++;
                results.Add(new BatchItemResult { Id = idStr, Success = false, Message = "Đã gửi trước đó" });
                continue;
            }

            // R3: real gateway call per prescription (same path as SubmitAsync), portal columns only.
            var (ok, _, message) = await SendToGatewayAsync(prescription);
            if (ok) success++; else fail++;
            results.Add(new BatchItemResult { Id = idStr, Success = ok, Message = message });
        }

        await _db.SaveChangesAsync();

        return new SubmitBatchResult
        {
            SuccessCount = success,
            FailCount = fail,
            Results = results
        };
    }

    public async Task<NationalPrescriptionStatsDto> GetStatsAsync()
    {
        var prescriptions = _db.Prescriptions.AsNoTracking();
        // #218/T3: bảng số của màn hình Cổng ĐTQG trước đây đếm theo `Status` — tức trạng thái
        // DUYỆT/CẤP PHÁT thuốc. "Đơn bị cổng từ chối" thật ra đang đếm đơn HOÀN TRẢ thuốc,
        // "đã gửi" đếm đơn dược sĩ đã duyệt. Nay đếm đúng ô của cổng.
        var submitted = await prescriptions.CountAsync(p => p.NationalPortalStatus == PortalSent);
        var accepted = await prescriptions.CountAsync(p => p.NationalPortalStatus == PortalSent);
        var rejected = await prescriptions.CountAsync(p => p.NationalPortalStatus == PortalFailed);
        var pending = await prescriptions.CountAsync(p => (p.NationalPortalStatus ?? PortalNotSent) == PortalNotSent);
        var lastSubmitted = await prescriptions
            .Where(p => p.NationalPortalSubmittedAt != null)
            .OrderByDescending(p => p.NationalPortalSubmittedAt)
            .Select(p => p.NationalPortalSubmittedAt)
            .FirstOrDefaultAsync();

        var totalAmount = await prescriptions.SumAsync(p => (decimal?)p.TotalAmount) ?? 0;

        return new NationalPrescriptionStatsDto
        {
            TotalSubmitted = submitted,
            TotalAccepted = accepted,
            TotalRejected = rejected,
            TotalPending = pending,
            TotalAmountSubmitted = totalAmount,
            LastSubmittedAt = lastSubmitted,
            // R3: was hard-coded "Connected"; same gateway ping as TestConnectionAsync (InMemory client in MockMode).
            ConnectionStatus = await PingGatewaySafeAsync() ? "Connected" : "Disconnected"
        };
    }

    private async Task<bool> PingGatewaySafeAsync()
    {
        try { return await _gatewayClient.PingAsync(); }
        catch { return false; }
    }

    public async Task<object> TestConnectionAsync()
    {
        // Was hard-coded `connected = true` with a Random() latency — the screen always reported a
        // healthy connection. Now pings the configured national prescription gateway client.
        var sw = System.Diagnostics.Stopwatch.StartNew();
        var connected = await PingGatewaySafeAsync();
        sw.Stop();
        return new
        {
            connected,
            message = connected
                ? "Kết nối Cổng đơn thuốc quốc gia thành công"
                : "Không kết nối được Cổng đơn thuốc quốc gia",
            latencyMs = (int)sw.ElapsedMilliseconds
        };
    }

    public async Task<object> RetrySubmissionAsync(Guid id, string userId)
    {
        var prescription = await LoadForSendAsync(id);
        if (prescription == null)
            return new { success = false, message = "Không tìm thấy đơn thuốc" };
        // Retry is for a failed or cancelled send only — an accepted one would be sent twice.
        if (prescription.NationalPortalStatus == PortalSent)
            return new { success = false, message = "Đơn thuốc đã được Cổng ĐTQG ghi nhận — không gửi lại." };

        // #218/T3: cũng ghi vào ô riêng của cổng (không đụng Status). R3: gọi cổng thật qua gateway client.
        var (ok, transactionId, message) = await SendToGatewayAsync(prescription);
        await _db.SaveChangesAsync();
        if (!ok) throw new InvalidOperationException(message);

        return new { success = true, transactionId = transactionId ?? "", message };
    }

    public async Task<object> CancelSubmissionAsync(Guid id, string userId)
    {
        var prescription = await _db.Prescriptions.FindAsync(id);
        if (prescription == null)
            return new { success = false, message = "Không tìm thấy đơn thuốc" };

        // #218/T3: hủy GỬI chỉ hủy lượt gửi lên cổng. Trước đây `Status = 4` — mà 4 là "Hủy" của
        // chính đơn thuốc — nên bấm "hủy gửi lên cổng" là voiding đơn thuốc của bệnh nhân.
        prescription.NationalPortalStatus = PortalCancelled;
        await _db.SaveChangesAsync();

        return new { success = true, message = "Đã hủy gửi đơn thuốc" };
    }
}
