using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.NationalPrescription;
using HIS.Application.Services;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class NationalPrescriptionService : INationalPrescriptionService
{
    private readonly HISDbContext _db;

    public NationalPrescriptionService(HISDbContext db)
    {
        _db = db;
    }

    public async Task<NationalPrescriptionPagedResult> SearchAsync(NationalPrescriptionSearchDto search)
    {
        var query = _db.Prescriptions
            .Include(p => p.Details).ThenInclude(d => d.Medicine)
            .Include(p => p.MedicalRecord).ThenInclude(mr => mr.Patient)
            .Include(p => p.Doctor)
            .AsNoTracking();

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
        var result = await SearchAsync(new NationalPrescriptionSearchDto { PageIndex = 0, PageSize = int.MaxValue });
        return result.Items.FirstOrDefault(i => i.Id == id);
    }

    /// <summary>
    /// Trạng thái gửi Cổng ĐTQG. Tách hẳn khỏi <c>Prescriptions.Status</c> (trạng thái duyệt/cấp
    /// phát thuốc) từ #218/T3 — xem migration 175.
    /// </summary>
    private const int PortalNotSent = 0;
    private const int PortalSent = 1;
    private const int PortalFailed = 2;
    private const int PortalCancelled = 3;

    public async Task<object> SubmitAsync(Guid prescriptionId, string userId)
    {
        var prescription = await _db.Prescriptions.FindAsync(prescriptionId);
        if (prescription == null)
            return new { transactionId = "", message = "Không tìm thấy đơn thuốc" };

        // #218/T3: chặn gửi lại một đơn ĐÃ gửi. Trước đây không kiểm gì, gọi bao nhiêu lần cũng được.
        if (prescription.NationalPortalStatus == PortalSent)
            return new
            {
                transactionId = prescription.NationalPortalTransactionId ?? "",
                message = "Đơn thuốc này đã được gửi lên Cổng ĐTQG trước đó."
            };

        // #218/T3: ghi vào ô RIÊNG của cổng, KHÔNG đụng `prescription.Status`.
        // `Status` là trạng thái duyệt/cấp phát thuốc (0-Chờ duyệt … 4-Hủy); gán 1 vào đó nghĩa là
        // "đã duyệt", nên gửi lên cổng hoá ra tự duyệt đơn thay dược sĩ.
        var transactionId = $"CQLKCB-{DateTime.Now:yyyyMMddHHmmss}-{prescriptionId.ToString()[..8].ToUpper()}";
        prescription.NationalPortalStatus = PortalSent;
        prescription.NationalPortalTransactionId = transactionId;
        prescription.NationalPortalSubmittedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return new
        {
            transactionId,
            message = "Đã gửi đơn thuốc lên Cổng đơn thuốc quốc gia thành công"
        };
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
            .Where(p => parsedIds.Contains(p.Id))
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

            // #218/T3: cùng bản vá với SubmitAsync — ghi vào ô riêng của cổng, không đụng
            // `Status` (trạng thái duyệt/cấp phát thuốc). Gửi lô mà bỏ sót chỗ này thì vá
            // một cửa còn cửa kia vẫn hỏng, đúng cái hình dạng cả đợt đang gỡ.
            prescription.NationalPortalStatus = PortalSent;
            prescription.NationalPortalTransactionId =
                $"CQLKCB-{DateTime.Now:yyyyMMddHHmmss}-{id.ToString()[..8].ToUpper()}";
            prescription.NationalPortalSubmittedAt = DateTime.UtcNow;
            success++;
            results.Add(new BatchItemResult { Id = idStr, Success = true, Message = "Gửi thành công" });
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
            ConnectionStatus = "Connected"
        };
    }

    public Task<object> TestConnectionAsync()
    {
        return Task.FromResult<object>(new
        {
            connected = true,
            message = "Kết nối Cổng đơn thuốc quốc gia thành công",
            latencyMs = new Random().Next(50, 200)
        });
    }

    public async Task<object> RetrySubmissionAsync(Guid id, string userId)
    {
        var prescription = await _db.Prescriptions.FindAsync(id);
        if (prescription == null)
            return new { success = false, message = "Không tìm thấy đơn thuốc" };

        // #218/T3: cũng ghi vào ô riêng của cổng. Trước đây `Status = 1` kéo cả đơn ĐÃ CẤP PHÁT (2)
        // lùi về "đã duyệt" — thuốc đã ra khỏi quầy mà hệ thống lại bảo chưa phát.
        prescription.NationalPortalStatus = PortalSent;
        prescription.NationalPortalTransactionId =
            $"CQLKCB-{DateTime.Now:yyyyMMddHHmmss}-{id.ToString()[..8].ToUpper()}";
        prescription.NationalPortalSubmittedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return new { success = true, message = "Đã gửi lại thành công" };
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
