using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using HIS.Application.Common;
using HIS.Application.DTOs.EmrAdmin;
using HIS.Application.Services;
using HIS.Core.Constants;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services
{
    public partial class EmrAdminService
    {
        // ============ Archive Barcode ============
        public async Task<ArchiveBarcodeDto?> GetArchiveBarcodeAsync(Guid archiveId)
        {
            var archive = await _db.MedicalRecordArchives.AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == archiveId);
            if (archive == null) return null;

            var record = await _db.MedicalRecords.AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == archive.MedicalRecordId);
            var patient = record != null ? await _db.Patients.AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == record.PatientId) : null;

            return new ArchiveBarcodeDto
            {
                ArchiveId = archive.Id,
                BarcodeData = $"MRA-{archive.Id:N}".Substring(0, 20).ToUpperInvariant(),
                PatientCode = patient?.PatientCode ?? "",
                PatientName = patient?.FullName ?? "",
                MedicalRecordCode = record?.MedicalRecordCode,
                ArchiveLocation = archive.StorageLocation,
                ArchivedAt = archive.CreatedAt
            };
        }

        // ============ HL7 Import/Export ============
        public async Task<Hl7ImportResultDto> ImportHl7Async(Hl7ImportDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Hl7Content))
                return new Hl7ImportResultDto { Success = false, Message = "Noi dung HL7 trong", Errors = new List<string> { "Empty HL7 content" } };

            var segments = dto.Hl7Content.Split('\r', '\n').Where(s => !string.IsNullOrWhiteSpace(s)).ToList();
            var msh = segments.FirstOrDefault(s => s.StartsWith("MSH"));
            if (msh == null)
                return new Hl7ImportResultDto { Success = false, Message = "Khong tim thay MSH segment", Errors = new List<string> { "Missing MSH segment" } };

            var fields = msh.Split('|');
            var sendingFacility = fields.Length > 3 && !string.IsNullOrWhiteSpace(fields[3]) ? fields[3] : dto.SourceFacilityCode ?? "UNKNOWN";
            var messageType = fields.Length > 8 ? fields[8] : "";
            var pidCount = segments.Count(s => s.StartsWith("PID"));
            if (pidCount == 0)
                return new Hl7ImportResultDto { Success = false, Message = "Thông điệp HL7 không có segment PID (người bệnh)", Errors = new List<string> { "Missing PID segment" } };

            // QA-R3: this used to write one audit row per PID and answer "Da import N ban ghi" while nothing reached
            // the medical record (no patient match, no ADT/ORU mapping). Importing external demographics / results
            // into a patient's EMR needs matching + review rules that do not exist yet, so say so honestly (501)
            // instead of a false success. Lab results from analyzers arrive through the LIS HL7 receiver, not here.
            return new Hl7ImportResultDto
            {
                Success = false,
                Message = $"Chưa hỗ trợ nhập thông điệp HL7 {messageType} vào hồ sơ bệnh án (nguồn {sendingFacility}, {pidCount} người bệnh) — không có dữ liệu nào được ghi.",
                ImportedRecords = 0,
                Errors = new List<string> { Hl7ImportResultDto.NotSupportedCode },
            };
        }

        public async Task<Hl7ExportResultDto?> ExportHl7Async(Guid medicalRecordId)
        {
            var record = await _db.MedicalRecords.AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == medicalRecordId);
            if (record == null) return null;

            var patient = await _db.Patients.AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == record.PatientId);
            if (patient == null) return null;

            var exam = await _db.Examinations.AsNoTracking()
                .Include(e => e.Doctor)
                .FirstOrDefaultAsync(e => e.MedicalRecordId == medicalRecordId);

            // Build HL7 v2.4 message with authenticator info
            var ts = DateTime.UtcNow.ToString("yyyyMMddHHmmss");
            var msgId = Guid.NewGuid().ToString("N").Substring(0, 20);
            var hl7 = $"MSH|^~\\&|HIS|HOSPITAL|RECEIVING|FACILITY|{ts}||ADT^A01|{msgId}|P|2.4\r";
            hl7 += $"PID|1||{patient.PatientCode}||{patient.FullName?.Replace(" ", "^")}||{patient.DateOfBirth:yyyyMMdd}|{(patient.Gender == 1 ? "M" : "F")}\r";

            if (exam != null)
            {
                hl7 += $"DG1|1||{exam.MainIcdCode}|||A\r";
            }

            // Authenticator info (who signed/approved the record)
            var authenticator = exam?.Doctor?.FullName ?? GetCurrentUserName() ?? "System";
            hl7 += $"AUT|{authenticator}|||{ts}\r";

            return new Hl7ExportResultDto
            {
                Hl7Content = hl7,
                AuthenticatorInfo = authenticator,
                FacilityCode = "HOSPITAL",
                ExportedAt = DateTime.UtcNow
            };
        }
    }
}
