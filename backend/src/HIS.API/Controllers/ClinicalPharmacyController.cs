using HIS.Application.DTOs.Examination;
using HIS.Application.Services;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HIS.API.Controllers;

/// <summary>
/// Kiểm tra dược lâm sàng — N1.04.
/// Page review đầy đủ thuốc + CLS + dị ứng + tương tác BN trước cấp phát.
/// </summary>
[ApiController]
[Route("api/clinical-pharmacy")]
[Authorize]
public class ClinicalPharmacyController : ControllerBase
{
    private readonly HISDbContext _db;
    private readonly IExaminationCompleteService _examinationService;

    public ClinicalPharmacyController(HISDbContext db, IExaminationCompleteService examinationService)
    {
        _db = db;
        _examinationService = examinationService;
    }

    [HttpGet("patient-summary/{patientId:guid}")]
    public async Task<IActionResult> PatientSummary(Guid patientId)
    {
        var patient = await _db.Patients.FirstOrDefaultAsync(p => p.Id == patientId);
        if (patient == null) return NotFound();

        var records = await _db.MedicalRecords
            .Where(m => m.PatientId == patientId && !m.IsDeleted)
            .OrderByDescending(m => m.AdmissionDate)
            .Take(5)
            .ToListAsync();
        var recordIds = records.Select(r => r.Id).ToList();

        var prescriptions = await _db.Prescriptions
            .Include(p => p.Details).ThenInclude(d => d.Medicine)
            .Where(p => recordIds.Contains(p.MedicalRecordId))
            .OrderByDescending(p => p.CreatedAt)
            .Take(20)
            .ToListAsync();

        var services = await _db.ServiceRequestDetails
            .Include(d => d.Service)
            .Include(d => d.ServiceRequest)
            .Where(d => recordIds.Contains(d.ServiceRequest.MedicalRecordId))
            .OrderByDescending(d => d.CreatedAt)
            .Take(30)
            .ToListAsync();

        // Dị ứng từ patient record
        var flags = await _db.PatientFlags
            .Where(f => f.PatientId == patientId && f.IsActive)
            .ToListAsync();

        // Tương tác thuốc sơ bộ: tìm cặp thuốc cùng đang dùng có trong DrugInteractions
        var activeMedicineIds = prescriptions
            .Where(p => !p.IsDispensed)
            .SelectMany(p => p.Details)
            .Select(d => d.MedicineId)
            .Distinct()
            .ToList();
        var interactions = await _db.DrugInteractions
            .Where(di => activeMedicineIds.Contains(di.Medicine1Id) && activeMedicineIds.Contains(di.Medicine2Id))
            .ToListAsync();

        return Ok(new
        {
            patient = new
            {
                patient.Id,
                patient.PatientCode,
                patient.FullName,
                patient.Gender,
                patient.DateOfBirth,
                patient.PhoneNumber,
                patient.Address,
                patient.InsuranceNumber,
            },
            activeMedicalRecords = records.Select(r => new
            {
                r.Id,
                r.MedicalRecordCode,
                r.AdmissionDate,
                r.MainDiagnosis,
                r.PatientType,
            }),
            prescriptions = prescriptions.Select(p => new
            {
                p.Id,
                p.PrescriptionCode,
                p.PrescriptionDate,
                p.PrescriptionType,
                p.TotalAmount,
                p.IsDispensed,
                items = p.Details.Select(d => new
                {
                    d.Id,
                    MedicineName = d.Medicine.MedicineName,
                    MedicineCode = d.Medicine.MedicineCode,
                    d.Quantity,
                    d.Dosage,
                    d.Days,
                    d.UsageInstructions,
                }),
            }),
            services = services.Select(d => new
            {
                ServiceName = d.Service.ServiceName,
                d.Amount,
                d.Status,
                d.Result,
                d.CreatedAt,
            }),
            flags = flags.Select(f => new { f.Id, f.FlagType, f.Color, f.Note }),
            interactions = interactions.Select(i => new
            {
                i.Id,
                i.Medicine1Id,
                i.Medicine2Id,
                i.Severity,
                i.Description,
                Management = i.Recommendation,
            }),
            summary = new
            {
                totalActiveMedicines = activeMedicineIds.Count,
                totalPrescriptions = prescriptions.Count,
                totalServices = services.Count,
                warningFlagsCount = flags.Count,
                drugInteractionsCount = interactions.Count,
            },
        });
    }

    /// <summary>
    /// Import danh sach cap tuong tac thuoc tu file CSV.
    /// CSV format (header bat buoc): ActiveIngredient1,ActiveIngredient2,Severity,InteractionType,Description,Recommendation
    /// Severity: 1=Nhe 2=TrungBinh 3=Nang 4=ChongChiDinhTuyetDoi
    /// Upsert theo cap hoat chat (doi xung A-B == B-A).
    /// NOTE: Excel can them thu vien ClosedXML/EPPlus; hien tai chi ho tro CSV.
    /// </summary>
    [HttpPost("drug-interactions/import-csv")]
    [Authorize(Roles = "Admin,Pharmacist")]
    public async Task<ActionResult<DrugInteractionImportResultDto>> ImportDrugInteractionsCsv(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Chua chon file CSV" });

        if (!file.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Chi ho tro file CSV. Excel can them thu vien ClosedXML/EPPlus." });

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        var result = await _examinationService.ImportDrugInteractionsAsync(ms.ToArray());
        return Ok(result);
    }
}
