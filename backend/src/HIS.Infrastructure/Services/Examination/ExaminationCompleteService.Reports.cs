using System.Text;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Examination;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;
using ServiceDto = HIS.Application.Services.ServiceDto;
using RoomDto = HIS.Application.Services.RoomDto;
using MedicineDto = HIS.Application.Services.MedicineDto;
using DoctorDto = HIS.Application.Services.DoctorDto;
using ExamWarehouseDto = HIS.Application.Services.ExamWarehouseDto;

namespace HIS.Infrastructure.Services;

// K4 phien 5 (2026-05-30): tach Section 2.9 Management and Reports (~619 dong) khoi
// ExaminationCompleteService.cs. ZERO runtime change — partial class.
public partial class ExaminationCompleteService
{
    #region 2.9 Management and Reports

    public async Task<PagedResultDto<Application.DTOs.ExaminationDto>> SearchExaminationsAsync(Application.DTOs.ExaminationSearchDto dto)
    {
        var query = _context.Examinations.AsNoTracking()
            .Include(e => e.MedicalRecord)
            .ThenInclude(m => m.Patient)
            .Include(e => e.Room)
            .AsQueryable();

        if (!string.IsNullOrEmpty(dto.Keyword))
        {
            query = query.Where(e =>
                e.MedicalRecord.Patient.PatientCode.Contains(dto.Keyword) ||
                e.MedicalRecord.Patient.FullName.Contains(dto.Keyword) ||
                e.MedicalRecord.MedicalRecordCode.Contains(dto.Keyword));
        }

        if (dto.FromDate.HasValue)
            query = query.Where(e => e.MedicalRecord.AdmissionDate >= dto.FromDate.Value);

        if (dto.ToDate.HasValue)
            query = query.Where(e => e.MedicalRecord.AdmissionDate <= dto.ToDate.Value);

        if (dto.DepartmentId.HasValue)
            query = query.Where(e => e.DepartmentId == dto.DepartmentId.Value);

        if (dto.DoctorId.HasValue)
            query = query.Where(e => e.DoctorId == dto.DoctorId.Value);

        var total = await query.CountAsync();
        var page = Math.Max(1, dto.PageIndex ?? 1);
        var pageSize = Math.Clamp(dto.PageSize ?? 20, 1, 200);

        var items = await query
            .OrderByDescending(e => e.MedicalRecord.AdmissionDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResultDto<Application.DTOs.ExaminationDto>
        {
            Items = items.Select(MapToExaminationDto).ToList(),
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<ExaminationStatisticsDto> GetExaminationStatisticsAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null, Guid? roomId = null)
    {
        var query = _context.Examinations.AsNoTracking()
            .Include(e => e.MedicalRecord)
            .Where(e => e.MedicalRecord.AdmissionDate >= fromDate && e.MedicalRecord.AdmissionDate <= toDate);

        if (departmentId.HasValue)
            query = query.Where(e => e.DepartmentId == departmentId.Value);

        if (roomId.HasValue)
            query = query.Where(e => e.RoomId == roomId.Value);

        var examinations = await query.ToListAsync();

        return new ExaminationStatisticsDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            TotalExaminations = examinations.Count,
            InsuranceExaminations = examinations.Count(e => e.MedicalRecord.PatientType == 1),
            FeeExaminations = examinations.Count(e => e.MedicalRecord.PatientType == 2),
            PendingCount = examinations.Count(e => e.Status == 0),
            InProgressCount = examinations.Count(e => e.Status == 1),
            WaitingResultCount = examinations.Count(e => e.Status == 2 || e.Status == 3),
            CompletedCount = examinations.Count(e => e.Status == 4)
        };
    }

    public async Task<List<ExaminationRegisterDto>> GetExaminationRegisterAsync(DateTime fromDate, DateTime toDate, Guid? roomId = null)
    {
        var query = _context.Examinations.AsNoTracking()
            .Include(e => e.MedicalRecord)
            .ThenInclude(m => m.Patient)
            .Include(e => e.Doctor)
            .Where(e => e.MedicalRecord.AdmissionDate >= fromDate && e.MedicalRecord.AdmissionDate <= toDate);

        if (roomId.HasValue)
            query = query.Where(e => e.RoomId == roomId.Value);

        var examinations = await query.OrderBy(e => e.MedicalRecord.AdmissionDate).ToListAsync();

        return examinations.Select((e, i) => new ExaminationRegisterDto
        {
            RowNumber = i + 1,
            ExaminationDate = e.MedicalRecord.AdmissionDate,
            PatientCode = e.MedicalRecord.Patient.PatientCode,
            PatientName = e.MedicalRecord.Patient.FullName,
            Age = CalculateAge(e.MedicalRecord.Patient.DateOfBirth, e.MedicalRecord.Patient.YearOfBirth),
            Gender = e.MedicalRecord.Patient.Gender == 1 ? "Nam" : e.MedicalRecord.Patient.Gender == 2 ? "Nữ" : "Khác",
            Address = e.MedicalRecord.Patient.Address,
            InsuranceNumber = e.MedicalRecord.InsuranceNumber,
            DiagnosisCode = e.MainIcdCode,
            DiagnosisName = e.MainDiagnosis,
            DoctorName = e.Doctor?.FullName
        }).ToList();
    }

    public async Task<byte[]> ExportExaminationRegisterToExcelAsync(DateTime fromDate, DateTime toDate, Guid? roomId = null)
    {
        try
        {
            var data = await GetExaminationRegisterAsync(fromDate, toDate, roomId);
            if (!data.Any()) return Array.Empty<byte>();

            var headers = new[] { "Ngay kham", "Ma BN", "Ho ten", "Tuoi", "Gioi", "Dia chi", "So BHYT", "Ma ICD", "Chan doan", "BS kham" };
            var rows = data.Select(d => new[]
            {
                d.ExaminationDate.ToString("dd/MM/yyyy"),
                d.PatientCode,
                d.PatientName,
                d.Age.ToString(),
                d.Gender,
                d.Address ?? "",
                d.InsuranceNumber ?? "",
                d.DiagnosisCode ?? "",
                d.DiagnosisName ?? "",
                d.DoctorName ?? ""
            }).ToList();

            var html = BuildTableReport(
                "SO KHAM BENH",
                $"Tu {fromDate:dd/MM/yyyy} den {toDate:dd/MM/yyyy}",
                DateTime.Now, headers, rows);
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    public async Task<byte[]> ExportExaminationStatisticsAsync(DateTime fromDate, DateTime toDate, string format = "excel")
    {
        try
        {
            var doctorStats = await GetDoctorStatisticsAsync(fromDate, toDate);
            var diagnosisStats = await GetDiagnosisStatisticsAsync(fromDate, toDate);

            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine(@"<div class=""form-title"">THONG KE KHAM BENH</div>");
            body.AppendLine($@"<div class=""form-number"">Tu {fromDate:dd/MM/yyyy} den {toDate:dd/MM/yyyy}</div>");
            body.AppendLine($@"<div style=""text-align:center;font-style:italic;margin-bottom:10px"">Ngay {DateTime.Now:dd} thang {DateTime.Now:MM} nam {DateTime.Now:yyyy}</div>");

            // Doctor statistics section
            body.AppendLine(@"<h3 style=""margin-top:15px"">I. Thong ke theo bac si</h3>");
            body.AppendLine(@"<table class=""bordered""><thead><tr><th style=""width:30px"">STT</th><th>Ma BS</th><th>Ho ten BS</th><th>Tong kham</th><th>BHYT</th><th>Vien phi</th><th>Dich vu</th><th>Hoan thanh</th><th>Cho xu ly</th></tr></thead><tbody>");
            int idx = 0;
            int totalExams = 0, totalBhyt = 0, totalFee = 0, totalSvc = 0, totalDone = 0, totalPending = 0;
            foreach (var d in doctorStats)
            {
                idx++;
                totalExams += d.TotalExaminations; totalBhyt += d.InsuranceExaminations;
                totalFee += d.FeeExaminations; totalSvc += d.ServiceExaminations;
                totalDone += d.CompletedCount; totalPending += d.PendingCount;
                body.AppendLine($@"<tr><td class=""text-center"">{idx}</td><td>{Esc(d.DoctorCode)}</td><td>{Esc(d.DoctorName)}</td><td class=""text-center"">{d.TotalExaminations}</td><td class=""text-center"">{d.InsuranceExaminations}</td><td class=""text-center"">{d.FeeExaminations}</td><td class=""text-center"">{d.ServiceExaminations}</td><td class=""text-center"">{d.CompletedCount}</td><td class=""text-center"">{d.PendingCount}</td></tr>");
            }
            body.AppendLine($@"<tr><td colspan=""3"" class=""text-right""><b>Tong cong:</b></td><td class=""text-center""><b>{totalExams}</b></td><td class=""text-center""><b>{totalBhyt}</b></td><td class=""text-center""><b>{totalFee}</b></td><td class=""text-center""><b>{totalSvc}</b></td><td class=""text-center""><b>{totalDone}</b></td><td class=""text-center""><b>{totalPending}</b></td></tr>");
            body.AppendLine("</tbody></table>");

            // Diagnosis statistics section
            body.AppendLine(@"<h3 style=""margin-top:15px"">II. Thong ke theo benh (ICD-10)</h3>");
            body.AppendLine(@"<table class=""bordered""><thead><tr><th style=""width:30px"">STT</th><th>Ma ICD - Chan doan</th><th>So luong</th></tr></thead><tbody>");
            idx = 0;
            foreach (var kvp in diagnosisStats)
            {
                idx++;
                body.AppendLine($@"<tr><td class=""text-center"">{idx}</td><td>{Esc(kvp.Key)}</td><td class=""text-center"">{kvp.Value}</td></tr>");
            }
            body.AppendLine("</tbody></table>");

            body.AppendLine(GetSignatureBlock());

            var html = WrapHtmlPage("Thong ke kham benh", body.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    public async Task<List<DoctorExaminationStatDto>> GetDoctorStatisticsAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        var query = _context.Examinations.AsNoTracking()
            .Include(e => e.MedicalRecord)
            .Include(e => e.Doctor)
            .Where(e => e.MedicalRecord.AdmissionDate >= fromDate && e.MedicalRecord.AdmissionDate <= toDate && e.DoctorId.HasValue);

        if (departmentId.HasValue)
            query = query.Where(e => e.DepartmentId == departmentId.Value);

        var examinations = await query.ToListAsync();

        return examinations
            .GroupBy(e => e.DoctorId)
            .Select(g => new DoctorExaminationStatDto
            {
                DoctorId = g.Key ?? Guid.Empty,
                DoctorCode = g.First().Doctor?.UserCode ?? "",
                DoctorName = g.First().Doctor?.FullName ?? "",
                TotalExaminations = g.Count(),
                InsuranceExaminations = g.Count(e => e.MedicalRecord.PatientType == 1),
                FeeExaminations = g.Count(e => e.MedicalRecord.PatientType == 2),
                ServiceExaminations = g.Count(e => e.MedicalRecord.PatientType == 3),
                CompletedCount = g.Count(e => e.Status == 4),
                PendingCount = g.Count(e => e.Status < 4)
            })
            .OrderByDescending(d => d.TotalExaminations)
            .ToList();
    }

    public async Task<Dictionary<string, int>> GetDiagnosisStatisticsAsync(DateTime fromDate, DateTime toDate)
    {
        var examinations = await _context.Examinations.AsNoTracking()
            .Include(e => e.MedicalRecord)
            .Where(e => e.MedicalRecord.AdmissionDate >= fromDate &&
                       e.MedicalRecord.AdmissionDate <= toDate &&
                       !string.IsNullOrEmpty(e.MainIcdCode))
            .ToListAsync();

        return examinations
            .GroupBy(e => $"{e.MainIcdCode} - {e.MainDiagnosis}")
            .OrderByDescending(g => g.Count())
            .Take(50)
            .ToDictionary(g => g.Key, g => g.Count());
    }

    public async Task<List<CommunicableDiseaseReportDto>> GetCommunicableDiseaseReportAsync(DateTime fromDate, DateTime toDate)
    {
        // Get examinations with ICD codes starting with A or B (infectious diseases)
        var examinations = await _context.Examinations.AsNoTracking()
            .Include(e => e.MedicalRecord)
            .ThenInclude(m => m.Patient)
            .Where(e => e.MedicalRecord.AdmissionDate >= fromDate &&
                       e.MedicalRecord.AdmissionDate <= toDate &&
                       !string.IsNullOrEmpty(e.MainIcdCode) &&
                       (e.MainIcdCode.StartsWith("A") || e.MainIcdCode.StartsWith("B")))
            .ToListAsync();

        return examinations.Select(e => new CommunicableDiseaseReportDto
        {
            ExaminationId = e.Id,
            PatientCode = e.MedicalRecord.Patient.PatientCode,
            PatientName = e.MedicalRecord.Patient.FullName,
            Age = CalculateAge(e.MedicalRecord.Patient.DateOfBirth, e.MedicalRecord.Patient.YearOfBirth),
            Gender = e.MedicalRecord.Patient.Gender == 1 ? "Nam" : e.MedicalRecord.Patient.Gender == 2 ? "Nữ" : "Khác",
            Address = e.MedicalRecord.Patient.Address,
            IcdCode = e.MainIcdCode ?? "",
            DiseaseName = e.MainDiagnosis ?? "",
            DiagnosisDate = e.MedicalRecord.AdmissionDate,
            Notes = e.ConclusionNote
        }).ToList();
    }

    public async Task<byte[]> PrintExaminationFormAsync(Guid examinationId)
    {
        try
        {
            var examination = await _context.Examinations.AsNoTracking()
                .Include(e => e.MedicalRecord).ThenInclude(m => m.Patient)
                .Include(e => e.Doctor)
                .Include(e => e.Department)
                .Include(e => e.Room)
                .FirstOrDefaultAsync(e => e.Id == examinationId);
            if (examination == null) return Array.Empty<byte>();

            var patient = examination.MedicalRecord.Patient;

            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine(@"<div class=""form-title"">PHIEU KHAM BENH</div>");
            body.AppendLine(GetPatientInfoBlock(
                patient.PatientCode, patient.FullName, patient.Gender, patient.DateOfBirth,
                patient.Address, patient.PhoneNumber, examination.MedicalRecord.InsuranceNumber,
                examination.MedicalRecord.MedicalRecordCode, examination.Department?.DepartmentName));

            body.AppendLine($@"<div class=""field""><span class=""field-label"">Phong kham:</span><span class=""field-value"">{Esc(examination.Room?.RoomName)}</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">So thu tu:</span><span class=""field-value"">{examination.QueueNumber}</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">Thoi gian kham:</span><span class=""field-value"">{examination.StartTime?.ToString("HH:mm dd/MM/yyyy") ?? ""} - {examination.EndTime?.ToString("HH:mm dd/MM/yyyy") ?? "..."}</span></div>");

            // Vital signs
            body.AppendLine(@"<h3 style=""margin-top:15px;border-bottom:1px solid #000"">I. Dau hieu sinh ton</h3>");
            body.AppendLine(@"<div style=""display:flex;flex-wrap:wrap"">");
            body.AppendLine($@"<div style=""width:25%;padding:3px""><b>Mach:</b> {(examination.Pulse.HasValue ? $"{examination.Pulse} l/p" : "...")}</div>");
            body.AppendLine($@"<div style=""width:25%;padding:3px""><b>Nhiet do:</b> {(examination.Temperature.HasValue ? $"{examination.Temperature}°C" : "...")}</div>");
            body.AppendLine($@"<div style=""width:25%;padding:3px""><b>Huyet ap:</b> {(examination.BloodPressureSystolic.HasValue ? $"{examination.BloodPressureSystolic}/{examination.BloodPressureDiastolic} mmHg" : "...")}</div>");
            body.AppendLine($@"<div style=""width:25%;padding:3px""><b>Nhip tho:</b> {(examination.RespiratoryRate.HasValue ? $"{examination.RespiratoryRate} l/p" : "...")}</div>");
            body.AppendLine($@"<div style=""width:25%;padding:3px""><b>Can nang:</b> {(examination.Weight.HasValue ? $"{examination.Weight} kg" : "...")}</div>");
            body.AppendLine($@"<div style=""width:25%;padding:3px""><b>Chieu cao:</b> {(examination.Height.HasValue ? $"{examination.Height} cm" : "...")}</div>");
            body.AppendLine($@"<div style=""width:25%;padding:3px""><b>SpO2:</b> {(examination.SpO2.HasValue ? $"{examination.SpO2}%" : "...")}</div>");
            body.AppendLine($@"<div style=""width:25%;padding:3px""><b>BMI:</b> {(examination.BMI.HasValue ? $"{examination.BMI:F1}" : "...")}</div>");
            body.AppendLine("</div>");

            // History and examination
            body.AppendLine(@"<h3 style=""margin-top:15px;border-bottom:1px solid #000"">II. Hoi benh</h3>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">Ly do kham:</span><span class=""field-value"">{Esc(examination.ChiefComplaint)}</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">Benh su:</span><span class=""field-value"">{Esc(examination.PresentIllness)}</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">Tien su benh:</span><span class=""field-value"">{Esc(patient.MedicalHistory)}</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">Di ung:</span><span class=""field-value"">{Esc(patient.AllergyHistory)}</span></div>");

            body.AppendLine(@"<h3 style=""margin-top:15px;border-bottom:1px solid #000"">III. Kham lam sang</h3>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">Toan than:</span><span class=""field-value"">{Esc(examination.PhysicalExamination)}</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">Bo phan:</span><span class=""field-value"">{Esc(examination.SystemsReview)}</span></div>");

            // Diagnosis
            body.AppendLine(@"<h3 style=""margin-top:15px;border-bottom:1px solid #000"">IV. Chan doan</h3>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">Chan doan so bo:</span><span class=""field-value"">{Esc(examination.InitialDiagnosis)}</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">Chan doan chinh:</span><span class=""field-value text-bold"">{Esc(examination.MainDiagnosis)} ({Esc(examination.MainIcdCode)})</span></div>");
            if (!string.IsNullOrEmpty(examination.SubDiagnosis))
                body.AppendLine($@"<div class=""field""><span class=""field-label"">Chan doan phu:</span><span class=""field-value"">{Esc(examination.SubDiagnosis)}</span></div>");

            // Conclusion
            body.AppendLine(@"<h3 style=""margin-top:15px;border-bottom:1px solid #000"">V. Ket luan</h3>");
            var conclusionText = examination.ConclusionType switch
            {
                1 => "Cho ve", 2 => "Ke don", 3 => "Nhap vien",
                4 => "Chuyen vien", 5 => "Hen kham lai", 6 => "Tu vong", _ => ""
            };
            body.AppendLine($@"<div class=""field""><span class=""field-label"">Xu tri:</span><span class=""field-value"">{Esc(conclusionText)}</span></div>");
            if (!string.IsNullOrEmpty(examination.ConclusionNote))
                body.AppendLine($@"<div class=""field""><span class=""field-label"">Ghi chu:</span><span class=""field-value"">{Esc(examination.ConclusionNote)}</span></div>");
            if (!string.IsNullOrEmpty(examination.TreatmentPlan))
                body.AppendLine($@"<div class=""field""><span class=""field-label"">Huong dieu tri:</span><span class=""field-value"">{Esc(examination.TreatmentPlan)}</span></div>");
            if (examination.FollowUpDate.HasValue)
                body.AppendLine($@"<div class=""field""><span class=""field-label"">Hen tai kham:</span><span class=""field-value"">{examination.FollowUpDate:dd/MM/yyyy}</span></div>");

            body.AppendLine(GetSignatureBlock(examination.Doctor?.FullName));

            var html = WrapHtmlPage("Phieu kham benh", body.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    public async Task<byte[]> PrintOutpatientMedicalRecordAsync(Guid examinationId)
    {
        try
        {
            var examination = await _context.Examinations.AsNoTracking()
                .Include(e => e.MedicalRecord).ThenInclude(m => m.Patient)
                .Include(e => e.Doctor)
                .Include(e => e.Department)
                .FirstOrDefaultAsync(e => e.Id == examinationId);
            if (examination == null) return Array.Empty<byte>();

            var patient = examination.MedicalRecord.Patient;
            var mr = examination.MedicalRecord;

            // Get prescriptions for this examination
            var prescriptions = await _context.Prescriptions.AsNoTracking()
                .Include(p => p.Details).ThenInclude(d => d.Medicine)
                .Where(p => p.ExaminationId == examinationId || p.MedicalRecordId == mr.Id)
                .ToListAsync();

            // Get service requests
            var serviceRequests = await _context.ServiceRequests.AsNoTracking()
                .Include(sr => sr.Details).ThenInclude(d => d.Service)
                .Where(sr => sr.ExaminationId == examinationId)
                .ToListAsync();

            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine(@"<div class=""form-title"">HO SO BENH AN NGOAI TRU</div>");
            body.AppendLine($@"<div class=""form-number"">So ho so: {Esc(mr.MedicalRecordCode)}</div>");
            body.AppendLine(GetPatientInfoBlock(
                patient.PatientCode, patient.FullName, patient.Gender, patient.DateOfBirth,
                patient.Address, patient.PhoneNumber, mr.InsuranceNumber,
                mr.MedicalRecordCode, examination.Department?.DepartmentName));

            body.AppendLine($@"<div class=""field""><span class=""field-label"">Nghe nghiep:</span><span class=""field-value"">{Esc(patient.Occupation)}</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">Dan toc:</span><span class=""field-value"">{Esc(patient.EthnicName)}</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">CCCD/CMND:</span><span class=""field-value"">{Esc(patient.IdentityNumber)}</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">Ngay kham:</span><span class=""field-value"">{mr.AdmissionDate:dd/MM/yyyy HH:mm}</span></div>");

            var patientTypeText = mr.PatientType switch { 1 => "BHYT", 2 => "Vien phi", 3 => "Dich vu", 4 => "Kham SK", _ => "" };
            body.AppendLine($@"<div class=""field""><span class=""field-label"">Doi tuong:</span><span class=""field-value"">{patientTypeText}</span></div>");

            // Clinical info
            body.AppendLine(@"<h3 style=""margin-top:15px;border-bottom:1px solid #000"">A. HOI BENH</h3>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">1. Ly do kham:</span><span class=""field-value"">{Esc(examination.ChiefComplaint)}</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">2. Benh su:</span><span class=""field-value"">{Esc(examination.PresentIllness)}</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">3. Tien su ban than:</span><span class=""field-value"">{Esc(patient.MedicalHistory)}</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">4. Tien su gia dinh:</span><span class=""field-value"">{Esc(patient.FamilyHistory)}</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">5. Di ung:</span><span class=""field-value"">{Esc(patient.AllergyHistory)}</span></div>");

            body.AppendLine(@"<h3 style=""margin-top:15px;border-bottom:1px solid #000"">B. KHAM LAM SANG</h3>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">Mach: {examination.Pulse?.ToString() ?? "..."} l/p | Nhiet do: {examination.Temperature?.ToString() ?? "..."}°C | HA: {examination.BloodPressureSystolic?.ToString() ?? "..."}/{examination.BloodPressureDiastolic?.ToString() ?? "..."} mmHg | Nhip tho: {examination.RespiratoryRate?.ToString() ?? "..."} l/p</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">Can nang: {examination.Weight?.ToString() ?? "..."} kg | Chieu cao: {examination.Height?.ToString() ?? "..."} cm | BMI: {examination.BMI?.ToString("F1") ?? "..."}</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">1. Toan than:</span><span class=""field-value"">{Esc(examination.PhysicalExamination)}</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">2. Kham bo phan:</span><span class=""field-value"">{Esc(examination.SystemsReview)}</span></div>");

            body.AppendLine(@"<h3 style=""margin-top:15px;border-bottom:1px solid #000"">C. CHAN DOAN</h3>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">Chan doan so bo:</span><span class=""field-value"">{Esc(examination.InitialDiagnosis)}</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">Chan doan xac dinh:</span><span class=""field-value text-bold"">{Esc(examination.MainDiagnosis)} ({Esc(examination.MainIcdCode)})</span></div>");
            if (!string.IsNullOrEmpty(examination.SubDiagnosis))
                body.AppendLine($@"<div class=""field""><span class=""field-label"">Benh kem theo:</span><span class=""field-value"">{Esc(examination.SubDiagnosis)}</span></div>");

            // Service requests
            if (serviceRequests.Any())
            {
                body.AppendLine(@"<h3 style=""margin-top:15px;border-bottom:1px solid #000"">D. CAN LAM SANG</h3>");
                body.AppendLine(@"<table class=""bordered""><thead><tr><th style=""width:30px"">STT</th><th>Dich vu</th><th>Ket qua</th></tr></thead><tbody>");
                int sIdx = 0;
                foreach (var sr in serviceRequests)
                {
                    foreach (var d in sr.Details)
                    {
                        sIdx++;
                        body.AppendLine($@"<tr><td class=""text-center"">{sIdx}</td><td>{Esc(d.Service?.ServiceName)}</td><td>{Esc(d.Result ?? d.ResultDescription ?? "Cho ket qua")}</td></tr>");
                    }
                }
                body.AppendLine("</tbody></table>");
            }

            // Prescriptions
            if (prescriptions.Any())
            {
                body.AppendLine(@"<h3 style=""margin-top:15px;border-bottom:1px solid #000"">E. DON THUOC</h3>");
                foreach (var rx in prescriptions)
                {
                    body.AppendLine(@"<table class=""bordered""><thead><tr><th style=""width:30px"">STT</th><th>Thuoc</th><th>SL</th><th>Cach dung</th></tr></thead><tbody>");
                    int mIdx = 0;
                    foreach (var d in rx.Details)
                    {
                        mIdx++;
                        body.AppendLine($@"<tr><td class=""text-center"">{mIdx}</td><td>{Esc(d.Medicine?.MedicineName)} {Esc(d.Medicine?.Concentration)}</td><td class=""text-center"">{d.Quantity:#,##0} {Esc(d.Unit)}</td><td>{Esc(d.Usage ?? d.UsageInstructions)}</td></tr>");
                    }
                    body.AppendLine("</tbody></table>");
                }
            }

            // Conclusion
            body.AppendLine(@"<h3 style=""margin-top:15px;border-bottom:1px solid #000"">F. KET LUAN</h3>");
            var conclusionText = examination.ConclusionType switch
            {
                1 => "Cho ve", 2 => "Ke don", 3 => "Nhap vien",
                4 => "Chuyen vien", 5 => "Hen kham lai", 6 => "Tu vong", _ => ""
            };
            body.AppendLine($@"<div class=""field""><span class=""field-label"">Xu tri:</span><span class=""field-value"">{Esc(conclusionText)}</span></div>");
            if (!string.IsNullOrEmpty(examination.TreatmentPlan))
                body.AppendLine($@"<div class=""field""><span class=""field-label"">Huong dieu tri:</span><span class=""field-value"">{Esc(examination.TreatmentPlan)}</span></div>");
            if (examination.FollowUpDate.HasValue)
                body.AppendLine($@"<div class=""field""><span class=""field-label"">Hen tai kham:</span><span class=""field-value"">{examination.FollowUpDate:dd/MM/yyyy}</span></div>");

            body.AppendLine(GetSignatureBlock(examination.Doctor?.FullName));

            var html = WrapHtmlPage("Ho so benh an ngoai tru", body.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    public async Task<byte[]> PrintAppointmentSlipAsync(Guid appointmentId)
    {
        try
        {
            var appointment = await _context.Appointments.AsNoTracking()
                .Include(a => a.Patient)
                .Include(a => a.Doctor)
                .Include(a => a.Room)
                .Include(a => a.Department)
                .FirstOrDefaultAsync(a => a.Id == appointmentId);
            if (appointment == null) return Array.Empty<byte>();

            var patient = appointment.Patient;

            var labels = new[]
            {
                "Ho va ten benh nhan", "Ma benh nhan", "Ngay sinh", "Gioi tinh", "Dia chi", "So dien thoai",
                "Ngay hen tai kham", "Gio hen",
                "Phong kham", "Khoa", "Bac si",
                "Ly do hen", "Ghi chu"
            };
            var values = new[]
            {
                patient.FullName,
                patient.PatientCode,
                patient.DateOfBirth?.ToString("dd/MM/yyyy") ?? "",
                patient.Gender == 1 ? "Nam" : patient.Gender == 2 ? "Nu" : "Khac",
                patient.Address ?? "",
                patient.PhoneNumber ?? "",
                appointment.AppointmentDate.ToString("dd/MM/yyyy"),
                appointment.AppointmentTime?.ToString(@"hh\:mm") ?? "Theo thu tu",
                appointment.Room?.RoomName ?? "",
                appointment.Department?.DepartmentName ?? "",
                appointment.Doctor?.FullName ?? "",
                appointment.Reason ?? appointment.Note ?? "",
                appointment.Notes ?? ""
            };

            var html = BuildVoucherReport(
                "PHIEU HEN TAI KHAM",
                appointment.AppointmentCode,
                DateTime.Now, labels, values, appointment.Doctor?.FullName);
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    public async Task<byte[]> PrintAdmissionFormAsync(Guid examinationId)
    {
        try
        {
            var examination = await _context.Examinations.AsNoTracking()
                .Include(e => e.MedicalRecord).ThenInclude(m => m.Patient)
                .Include(e => e.Doctor)
                .Include(e => e.Department)
                .FirstOrDefaultAsync(e => e.Id == examinationId);
            if (examination == null) return Array.Empty<byte>();

            var patient = examination.MedicalRecord.Patient;

            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine(@"<div class=""form-title"">GIAY NHAP VIEN</div>");
            body.AppendLine(GetPatientInfoBlock(
                patient.PatientCode, patient.FullName, patient.Gender, patient.DateOfBirth,
                patient.Address, patient.PhoneNumber, examination.MedicalRecord.InsuranceNumber,
                examination.MedicalRecord.MedicalRecordCode, examination.Department?.DepartmentName));

            body.AppendLine($@"<div class=""field""><span class=""field-label"">Nghe nghiep:</span><span class=""field-value"">{Esc(patient.Occupation)}</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">CCCD/CMND:</span><span class=""field-value"">{Esc(patient.IdentityNumber)}</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">Nguoi giam ho:</span><span class=""field-value"">{Esc(patient.GuardianName)} - SĐT: {Esc(patient.GuardianPhone)} ({Esc(patient.GuardianRelationship)})</span></div>");

            body.AppendLine(@"<hr style=""margin:10px 0"">");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">Chan doan noi gui:</span><span class=""field-value"">{Esc(examination.InitialDiagnosis)}</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">Chan doan khi vao vien:</span><span class=""field-value text-bold"">{Esc(examination.MainDiagnosis)} ({Esc(examination.MainIcdCode)})</span></div>");
            if (!string.IsNullOrEmpty(examination.SubDiagnosis))
                body.AppendLine($@"<div class=""field""><span class=""field-label"">Benh kem theo:</span><span class=""field-value"">{Esc(examination.SubDiagnosis)}</span></div>");

            body.AppendLine($@"<div class=""field""><span class=""field-label"">Ly do nhap vien:</span><span class=""field-value"">{Esc(examination.ConclusionNote)}</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">Huong dieu tri:</span><span class=""field-value"">{Esc(examination.TreatmentPlan)}</span></div>");

            // Vital signs summary
            body.AppendLine(@"<div style=""margin-top:10px"">");
            body.AppendLine($@"<b>Dau hieu sinh ton:</b> Mach: {examination.Pulse?.ToString() ?? "..."} l/p | HA: {examination.BloodPressureSystolic?.ToString() ?? "..."}/{examination.BloodPressureDiastolic?.ToString() ?? "..."} mmHg | Nhiet do: {examination.Temperature?.ToString() ?? "..."}°C | Nhip tho: {examination.RespiratoryRate?.ToString() ?? "..."} l/p");
            body.AppendLine("</div>");

            var patientTypeText = examination.MedicalRecord.PatientType switch { 1 => "BHYT", 2 => "Vien phi", 3 => "Dich vu", _ => "" };
            body.AppendLine($@"<div class=""field"" style=""margin-top:10px""><span class=""field-label"">Doi tuong:</span><span class=""field-value"">{patientTypeText}</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">Ngay gio nhap vien:</span><span class=""field-value"">{DateTime.Now:HH:mm dd/MM/yyyy}</span></div>");

            body.AppendLine(GetSignatureBlock(examination.Doctor?.FullName));

            var html = WrapHtmlPage("Giay nhap vien", body.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    public async Task<byte[]> PrintTransferFormAsync(Guid examinationId)
    {
        try
        {
            var examination = await _context.Examinations.AsNoTracking()
                .Include(e => e.MedicalRecord).ThenInclude(m => m.Patient)
                .Include(e => e.Doctor)
                .Include(e => e.Department)
                .FirstOrDefaultAsync(e => e.Id == examinationId);
            if (examination == null) return Array.Empty<byte>();

            var patient = examination.MedicalRecord.Patient;

            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine(@"<div class=""form-title"">GIAY CHUYEN VIEN</div>");
            body.AppendLine(GetPatientInfoBlock(
                patient.PatientCode, patient.FullName, patient.Gender, patient.DateOfBirth,
                patient.Address, patient.PhoneNumber, examination.MedicalRecord.InsuranceNumber,
                examination.MedicalRecord.MedicalRecordCode, examination.Department?.DepartmentName));

            body.AppendLine($@"<div class=""field""><span class=""field-label"">Nghe nghiep:</span><span class=""field-value"">{Esc(patient.Occupation)}</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">CCCD/CMND:</span><span class=""field-value"">{Esc(patient.IdentityNumber)}</span></div>");

            body.AppendLine(@"<hr style=""margin:10px 0"">");

            // Clinical summary
            body.AppendLine(@"<h3 style=""margin-top:10px"">I. Tom tat benh an</h3>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">Dau hieu lam sang:</span><span class=""field-value"">{Esc(examination.ChiefComplaint)}</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">Kham lam sang:</span><span class=""field-value"">{Esc(examination.PhysicalExamination)}</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">Ket qua CLS:</span><span class=""field-value"">{Esc(examination.SystemsReview)}</span></div>");

            body.AppendLine(@"<h3 style=""margin-top:10px"">II. Chan doan</h3>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">Chan doan:</span><span class=""field-value text-bold"">{Esc(examination.MainDiagnosis)} ({Esc(examination.MainIcdCode)})</span></div>");
            if (!string.IsNullOrEmpty(examination.SubDiagnosis))
                body.AppendLine($@"<div class=""field""><span class=""field-label"">Benh kem theo:</span><span class=""field-value"">{Esc(examination.SubDiagnosis)}</span></div>");

            body.AppendLine(@"<h3 style=""margin-top:10px"">III. Phuong phap xu tri da thuc hien</h3>");
            body.AppendLine($@"<div class=""field""><span class=""field-value"">{Esc(examination.TreatmentPlan ?? "...")}</span></div>");

            body.AppendLine(@"<h3 style=""margin-top:10px"">IV. Ly do chuyen vien</h3>");
            body.AppendLine($@"<div class=""field""><span class=""field-value"">{Esc(examination.ConclusionNote ?? "Vuot kha nang dieu tri")}</span></div>");

            body.AppendLine(@"<h3 style=""margin-top:10px"">V. Tinh trang nguoi benh luc chuyen</h3>");
            body.AppendLine($@"<div style=""margin-top:5px"">");
            body.AppendLine($@"Mach: {examination.Pulse?.ToString() ?? "..."} l/p | HA: {examination.BloodPressureSystolic?.ToString() ?? "..."}/{examination.BloodPressureDiastolic?.ToString() ?? "..."} mmHg | Nhiet do: {examination.Temperature?.ToString() ?? "..."}°C | Nhip tho: {examination.RespiratoryRate?.ToString() ?? "..."} l/p");
            body.AppendLine("</div>");

            body.AppendLine(@"<h3 style=""margin-top:10px"">VI. Huong dieu tri tiep</h3>");
            body.AppendLine($@"<div class=""field""><span class=""field-value"">{Esc(examination.TreatmentPlan ?? "Theo tuyen tren")}</span></div>");

            var patientTypeText = examination.MedicalRecord.PatientType switch { 1 => "BHYT", 2 => "Vien phi", 3 => "Dich vu", _ => "" };
            body.AppendLine($@"<div class=""field"" style=""margin-top:10px""><span class=""field-label"">Doi tuong:</span><span class=""field-value"">{patientTypeText}</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">Phuong tien van chuyen:</span><span class=""field-value"">Xe cap cuu cua benh vien</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">Chuyen den:</span><span class=""field-value"">.......................................................................</span></div>");

            body.AppendLine(GetSignatureBlock(examination.Doctor?.FullName));

            var html = WrapHtmlPage("Giay chuyen vien", body.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    #endregion
}
