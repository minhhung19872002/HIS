using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using HIS.Application.DTOs.NangCap24;
using HIS.Application.Services;
using HIS.Core.Constants;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

namespace HIS.Infrastructure.Services;

public class EmrHl7ArchiveService : IEmrHl7ArchiveService
{
    private readonly HISDbContext _db;
    private readonly IConfiguration _config;

    public EmrHl7ArchiveService(HISDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public async Task<Hl7ExportResponseDto> GenerateAsync(Hl7ExportRequestDto request)
    {
        var record = await _db.MedicalRecords
            .Include(m => m.Patient)
            .Include(m => m.Department)
            .FirstOrDefaultAsync(m => m.Id == request.MedicalRecordId);
        if (record == null) throw new KeyNotFoundException("Hồ sơ không tồn tại");

        var msgCount = 0;
        var sb = new StringBuilder();
        var sendingApp = _config["Hl7:SendingApp"] ?? "HIS";
        var sendingFac = _config["Hl7:SendingFacility"] ?? "BV-DEMO";

        // 1. MSH + ADT^A04 (Register patient)
        var msh = BuildMsh(sendingApp, sendingFac, "ADT^A04", $"HIS-{record.Id}-1");
        sb.AppendLine(msh);
        sb.AppendLine(BuildPid(record));
        sb.AppendLine(BuildPv1(record));
        sb.AppendLine();
        msgCount++;

        // 2. Service orders (ORM^O01)
        if (request.IncludeServices)
        {
            var requests = await _db.ServiceRequests
                .Include(r => r.Details)
                    .ThenInclude(d => d.Service)
                .Where(r => r.MedicalRecordId == record.Id)
                .ToListAsync();
            foreach (var req in requests)
            {
                sb.AppendLine(BuildMsh(sendingApp, sendingFac, "ORM^O01", $"HIS-{record.Id}-ORM-{req.Id.ToString()[..8]}"));
                sb.AppendLine(BuildPid(record));
                foreach (var d in req.Details)
                {
                    var svcCode = d.Service?.ServiceCode ?? "";
                    var svcName = d.Service?.ServiceName ?? "";
                    sb.AppendLine($"ORC|NW|{d.Id}|||CM");
                    sb.AppendLine($"OBR|1|{d.Id}||{svcCode}^{svcName}|||{req.CreatedAt:yyyyMMddHHmmss}");
                }
                sb.AppendLine();
                msgCount++;
            }
        }

        // 3. Prescriptions (RDE^O11 - Pharmacy order)
        if (request.IncludePrescriptions)
        {
            var rxes = await _db.Prescriptions
                .Include(p => p.Details)
                    .ThenInclude(i => i.Medicine)
                .Where(p => p.MedicalRecordId == record.Id)
                .ToListAsync();
            foreach (var rx in rxes)
            {
                sb.AppendLine(BuildMsh(sendingApp, sendingFac, "RDE^O11", $"HIS-{record.Id}-RDE-{rx.Id.ToString()[..8]}"));
                sb.AppendLine(BuildPid(record));
                sb.AppendLine($"ORC|NW|{rx.Id}|||CM|||||{rx.CreatedAt:yyyyMMddHHmmss}");
                foreach (var item in rx.Details)
                {
                    var medCode = item.Medicine?.MedicineCode ?? "";
                    var medName = item.Medicine?.MedicineName ?? "";
                    sb.AppendLine($"RXE||{medCode}^{medName}|{item.Quantity}||{item.Unit ?? "viên"}|||{item.Usage ?? "Uống"}|{item.Frequency ?? "1"}");
                }
                sb.AppendLine();
                msgCount++;
            }
        }

        // 4. Lab results (ORU^R01)
        if (request.IncludeLabResults)
        {
            // #14e: model 1 — chỉ số con per-parameter (model 2 đã gỡ)
            var labs = await (
                from p in _db.ServiceRequestDetailParameters
                join d in _db.ServiceRequestDetails on p.ServiceRequestDetailId equals d.Id
                join req in _db.ServiceRequests on d.ServiceRequestId equals req.Id
                where req.MedicalRecordId == record.Id && req.RequestType == 1 && !p.IsDeleted && d.Status != 3
                select new
                {
                    p.Id,
                    p.ParameterCode,
                    p.ParameterName,
                    ResultValue = p.Value,
                    p.Unit,
                    p.ReferenceRange,
                    IsAbnormal = p.Flag != null && p.Flag != "N",
                    LabRequestId = d.ServiceRequestId,
                    PerformedAt = d.ResultDate ?? p.CreatedAt
                }).ToListAsync();
            foreach (var lab in labs)
            {
                sb.AppendLine(BuildMsh(sendingApp, sendingFac, "ORU^R01", $"HIS-{record.Id}-ORU-{lab.Id.ToString()[..8]}"));
                sb.AppendLine(BuildPid(record));
                sb.AppendLine($"OBR|1|{lab.LabRequestId}|||||{lab.PerformedAt:yyyyMMddHHmmss}");
                sb.AppendLine($"OBX|1|ST|{lab.ParameterCode}^{lab.ParameterName}||{lab.ResultValue ?? ""}|{lab.Unit ?? ""}|{lab.ReferenceRange ?? ""}|{(lab.IsAbnormal ? "A" : "N")}|||F");
                sb.AppendLine();
                msgCount++;
            }
        }

        // 5. Radiology reports (ORU^R01)
        if (request.IncludeRadiologyReports)
        {
            var rads = await _db.RadiologyReports
                .Include(r => r.RadiologyExam)
                    .ThenInclude(e => e != null ? e.RadiologyRequest : null)
                .Where(r => r.RadiologyExam != null &&
                    r.RadiologyExam.RadiologyRequest != null &&
                    r.RadiologyExam.RadiologyRequest.MedicalRecordId == record.Id)
                .ToListAsync();
            foreach (var rad in rads)
            {
                sb.AppendLine(BuildMsh(sendingApp, sendingFac, "ORU^R01", $"HIS-{record.Id}-RAD-{rad.Id.ToString()[..8]}"));
                sb.AppendLine(BuildPid(record));
                sb.AppendLine($"OBR|1|{rad.RadiologyExamId}|||||{(rad.ReportDate ?? rad.CreatedAt):yyyyMMddHHmmss}");
                sb.AppendLine($"OBX|1|TX|REPORT^Radiology Report||{EscapeHl7(rad.Findings ?? "")}|||N|||F");
                sb.AppendLine($"OBX|2|TX|CONCLUSION^Conclusion||{EscapeHl7(rad.Impression ?? "")}|||N|||F");
                sb.AppendLine();
                msgCount++;
            }
        }

        // 6. Discharge summary (MDM^T02 - Document)
        if (record.DischargeDate.HasValue)
        {
            sb.AppendLine(BuildMsh(sendingApp, sendingFac, "MDM^T02", $"HIS-{record.Id}-MDM"));
            sb.AppendLine(BuildPid(record));
            sb.AppendLine($"TXA|1|DI|TX|{record.DischargeDate:yyyyMMddHHmmss}|||||{record.MedicalRecordCode}|||||||AU");
            sb.AppendLine($"OBX|1|TX|DISCHARGE^Discharge Summary||{EscapeHl7(record.MainDiagnosis ?? "")}|||N|||F");
            sb.AppendLine();
            msgCount++;
        }

        var content = sb.ToString();
        var bytes = Encoding.UTF8.GetByteCount(content);

        return new Hl7ExportResponseDto
        {
            MedicalRecordId = record.Id,
            MedicalRecordCode = record.MedicalRecordCode,
            Hl7Content = content,
            FileName = $"HSBA_{record.MedicalRecordCode}_{DateTime.Now:yyyyMMdd}.hl7",
            MessageCount = msgCount,
            ContentSizeBytes = bytes,
            GeneratedAt = DateTime.UtcNow
        };
    }

    private static string BuildMsh(string sendingApp, string sendingFac, string msgType, string ctrlId)
    {
        var ts = DateTime.UtcNow.ToString("yyyyMMddHHmmss");
        return $"MSH|^~\\&|{sendingApp}|{sendingFac}|EMR-ARCHIVE|HOSPITAL|{ts}||{msgType}|{ctrlId}|P|2.5";
    }

    private static string BuildPid(MedicalRecord rec)
    {
        var p = rec.Patient;
        if (p == null) return "PID|1";
        var gender = p.Gender == 1 ? "M" : p.Gender == 2 ? "F" : "U";
        var dob = p.DateOfBirth?.ToString("yyyyMMdd") ?? "";
        return $"PID|1||{p.PatientCode}^^^HIS^MR||{EscapeHl7(p.FullName ?? "")}||{dob}|{gender}|||{EscapeHl7(p.Address ?? "")}||{p.PhoneNumber ?? ""}|||||{p.InsuranceNumber ?? ""}";
    }

    private static string BuildPv1(MedicalRecord rec)
    {
        // PatientType: 1-BHYT, 2-Viện phí, 3-Dịch vụ, 4-Khám SK
        var patientClass = rec.DischargeDate.HasValue ? "I" : "O";
        var deptCode = rec.Department?.DepartmentCode ?? "";
        return $"PV1|1|{patientClass}|{deptCode}^^^^^^^^|||||||||||||||||{rec.MedicalRecordCode}||||||||||||||||||||||||||{rec.AdmissionDate:yyyyMMddHHmmss}|{rec.DischargeDate?.ToString("yyyyMMddHHmmss") ?? ""}";
    }

    private static string EscapeHl7(string s)
    {
        if (string.IsNullOrEmpty(s)) return string.Empty;
        return s.Replace("\\", "\\E\\").Replace("|", "\\F\\").Replace("^", "\\S\\").Replace("&", "\\T\\").Replace("~", "\\R\\").Replace("\r", " ").Replace("\n", " ");
    }
}
