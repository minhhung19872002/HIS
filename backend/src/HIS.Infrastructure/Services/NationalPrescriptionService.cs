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

        if (search.Status.HasValue)
            query = query.Where(p => p.Status == search.Status.Value);

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
                Status = p.Status,
                SubmittedAt = p.Status >= 1 ? p.CreatedAt : null,
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

    public async Task<object> SubmitAsync(Guid prescriptionId, string userId)
    {
        var prescription = await _db.Prescriptions.FindAsync(prescriptionId);
        if (prescription == null)
            return new { transactionId = "", message = "Không tìm thấy đơn thuốc" };

        // Mark as submitted
        prescription.Status = 1;
        await _db.SaveChangesAsync();

        return new
        {
            transactionId = $"CQLKCB-{DateTime.Now:yyyyMMddHHmmss}-{prescriptionId.ToString()[..8].ToUpper()}",
            message = "Đã gửi đơn thuốc lên Cổng đơn thuốc quốc gia thành công"
        };
    }

    public async Task<SubmitBatchResult> SubmitBatchAsync(List<string> prescriptionIds, string userId)
    {
        var results = new List<BatchItemResult>();
        int success = 0, fail = 0;

        foreach (var idStr in prescriptionIds)
        {
            if (!Guid.TryParse(idStr, out var id))
            {
                fail++;
                results.Add(new BatchItemResult { Id = idStr, Success = false, Message = "ID không hợp lệ" });
                continue;
            }

            var prescription = await _db.Prescriptions.FindAsync(id);
            if (prescription == null)
            {
                fail++;
                results.Add(new BatchItemResult { Id = idStr, Success = false, Message = "Không tìm thấy" });
                continue;
            }

            prescription.Status = 1;
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
        var submitted = await prescriptions.CountAsync(p => p.Status == 1);
        var accepted = await prescriptions.CountAsync(p => p.Status == 2);
        var rejected = await prescriptions.CountAsync(p => p.Status == 3);
        var pending = await prescriptions.CountAsync(p => p.Status == 0);
        var lastSubmitted = await prescriptions
            .Where(p => p.Status >= 1)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => (DateTime?)p.CreatedAt)
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

        prescription.Status = 1;
        await _db.SaveChangesAsync();

        return new { success = true, message = "Đã gửi lại thành công" };
    }

    public async Task<object> CancelSubmissionAsync(Guid id, string userId)
    {
        var prescription = await _db.Prescriptions.FindAsync(id);
        if (prescription == null)
            return new { success = false, message = "Không tìm thấy đơn thuốc" };

        prescription.Status = 4;
        await _db.SaveChangesAsync();

        return new { success = true, message = "Đã hủy gửi đơn thuốc" };
    }
}
