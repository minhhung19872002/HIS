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
using HIS.Infrastructure.Extensions;
using static HIS.Infrastructure.Services.PdfTemplateHelper;
using ServiceDto = HIS.Application.Services.ServiceDto;
using RoomDto = HIS.Application.Services.RoomDto;
using MedicineDto = HIS.Application.Services.MedicineDto;
using DoctorDto = HIS.Application.Services.DoctorDto;
using ExamWarehouseDto = HIS.Application.Services.ExamWarehouseDto;

namespace HIS.Infrastructure.Services;

// wave-8a (2026-07-17): tach khoi ExaminationCompleteService.Prescriptions.cs (PURE VERBATIM, khong doi logic).
public partial class ExaminationCompleteService
{
    #region 2.7 Prescriptions — Instruction Library / Print / Drug Interaction Import / Recent Search
    public async Task<List<InstructionLibraryDto>> GetInstructionLibraryAsync(string? category = null)
    {
        var query = _context.InstructionLibraries.Where(i => i.IsActive);

        if (!string.IsNullOrEmpty(category))
            query = query.Where(i => i.Category == category);

        return await query
            .OrderBy(i => i.Category)
            .ThenBy(i => i.SortOrder)
            .ThenBy(i => i.Instruction)
            .Select(i => new InstructionLibraryDto
            {
                Id = i.Id,
                Category = i.Category,
                Code = i.Code,
                Instruction = i.Instruction,
                Description = i.Description,
                SortOrder = i.SortOrder
            })
            .ToBoundedListAsync("ExaminationCompleteService.GetInstructionLibraryAsync");
    }

    public async Task<InstructionLibraryDto> AddInstructionAsync(InstructionLibraryDto dto)
    {
        var instruction = new InstructionLibrary
        {
            Id = Guid.NewGuid(),
            Category = dto.Category,
            Code = dto.Code ?? $"HD{DateTime.Now:yyyyMMddHHmmss}",
            Instruction = dto.Instruction,
            Description = dto.Description,
            SortOrder = dto.SortOrder,
            IsActive = true
        };

        await _context.InstructionLibraries.AddAsync(instruction);
        await _unitOfWork.SaveChangesAsync();

        dto.Id = instruction.Id;
        return dto;
    }

    public async Task<bool> DeleteInstructionAsync(Guid id)
    {
        var instruction = await _context.InstructionLibraries.FindAsync(id);
        if (instruction == null) return false;

        instruction.IsActive = false;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<List<MedicineDto>> GetFrequentMedicinesAsync(Guid doctorId, int limit = 20)
    {
        return await SearchMedicinesAsync("", null, limit);
    }

    public async Task<byte[]> PrintPrescriptionAsync(Guid prescriptionId)
    {
        try
        {
            var rx = await _context.Prescriptions
                .Include(p => p.MedicalRecord).ThenInclude(m => m.Patient)
                .Include(p => p.Doctor)
                .Include(p => p.Department)
                .Include(p => p.Details).ThenInclude(d => d.Medicine)
                .FirstOrDefaultAsync(p => p.Id == prescriptionId);
            if (rx == null) return Array.Empty<byte>();

            var patient = rx.MedicalRecord.Patient;

            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine(@"<div class=""form-title"">DON THUOC</div>");
            body.AppendLine($@"<div class=""form-number"">So: {Esc(rx.PrescriptionCode)}</div>");
            body.AppendLine(GetPatientInfoBlock(
                patient.PatientCode, patient.FullName, patient.Gender, patient.DateOfBirth,
                patient.Address, patient.PhoneNumber, rx.MedicalRecord.InsuranceNumber,
                rx.MedicalRecord.MedicalRecordCode, rx.Department?.DepartmentName));

            body.AppendLine($@"<div class=""field""><span class=""field-label"">Chan doan:</span><span class=""field-value"">{Esc(rx.Diagnosis)} ({Esc(rx.IcdCode)})</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">So ngay:</span><span class=""field-value"">{rx.TotalDays} ngay</span></div>");

            body.AppendLine(@"<table class=""bordered""><thead><tr><th style=""width:30px"">STT</th><th>Ten thuoc</th><th>Ham luong</th><th>DVT</th><th>SL</th><th>Cach dung</th></tr></thead><tbody>");
            int idx = 0;
            foreach (var detail in rx.Details)
            {
                idx++;
                var dosageText = new StringBuilder();
                if (!string.IsNullOrEmpty(detail.Usage)) dosageText.Append(detail.Usage);
                else
                {
                    if (detail.MorningDose.HasValue) dosageText.Append($"Sang: {detail.MorningDose} ");
                    if (detail.NoonDose.HasValue) dosageText.Append($"Trua: {detail.NoonDose} ");
                    if (detail.EveningDose.HasValue) dosageText.Append($"Chieu: {detail.EveningDose} ");
                    if (detail.NightDose.HasValue) dosageText.Append($"Toi: {detail.NightDose} ");
                    if (!string.IsNullOrEmpty(detail.Frequency)) dosageText.Append($"({detail.Frequency})");
                }
                if (!string.IsNullOrEmpty(detail.Route)) dosageText.Append($" - {detail.Route}");

                body.AppendLine($@"<tr><td class=""text-center"">{idx}</td><td>{Esc(detail.Medicine?.MedicineName)}</td><td>{Esc(detail.Medicine?.Concentration)}</td><td class=""text-center"">{Esc(detail.Unit ?? detail.Medicine?.Unit)}</td><td class=""text-center"">{detail.Quantity:#,##0}</td><td>{Esc(dosageText.ToString())}</td></tr>");
            }
            body.AppendLine("</tbody></table>");

            if (!string.IsNullOrEmpty(rx.Note))
                body.AppendLine($@"<div class=""field"" style=""margin-top:10px""><span class=""field-label"">Loi dan:</span><span class=""field-value"">{Esc(rx.Note)}</span></div>");
            if (rx.MedicalRecord.Patient.DateOfBirth.HasValue)
            {
                var followUp = rx.MedicalRecord.DischargeDate ?? DateTime.Now.AddDays(rx.TotalDays);
                body.AppendLine($@"<div class=""field""><span class=""field-label"">Tai kham:</span><span class=""field-value"">{followUp:dd/MM/yyyy}</span></div>");
            }

            body.AppendLine(GetSignatureBlock(rx.Doctor?.FullName));

            var html = WrapHtmlPage("Don thuoc", body.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    public async Task<byte[]> PrintExternalPrescriptionAsync(Guid prescriptionId)
    {
        try
        {
            var rx = await _context.Prescriptions
                .Include(p => p.MedicalRecord).ThenInclude(m => m.Patient)
                .Include(p => p.Doctor)
                .Include(p => p.Department)
                .Include(p => p.Details).ThenInclude(d => d.Medicine)
                .FirstOrDefaultAsync(p => p.Id == prescriptionId);
            if (rx == null) return Array.Empty<byte>();

            var patient = rx.MedicalRecord.Patient;

            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine(@"<div class=""form-title"">DON THUOC (MUA NGOAI)</div>");
            body.AppendLine($@"<div class=""form-number"">So: {Esc(rx.PrescriptionCode)}</div>");
            body.AppendLine(GetPatientInfoBlock(
                patient.PatientCode, patient.FullName, patient.Gender, patient.DateOfBirth,
                patient.Address, patient.PhoneNumber, rx.MedicalRecord.InsuranceNumber,
                rx.MedicalRecord.MedicalRecordCode, rx.Department?.DepartmentName));

            body.AppendLine($@"<div class=""field""><span class=""field-label"">Chan doan:</span><span class=""field-value"">{Esc(rx.Diagnosis)} ({Esc(rx.IcdCode)})</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">So ngay:</span><span class=""field-value"">{rx.TotalDays} ngay</span></div>");

            body.AppendLine(@"<table class=""bordered""><thead><tr><th style=""width:30px"">STT</th><th>Ten thuoc</th><th>Ham luong</th><th>DVT</th><th>SL</th><th>Cach dung</th></tr></thead><tbody>");
            int idx = 0;
            foreach (var detail in rx.Details)
            {
                idx++;
                var dosageText = new StringBuilder();
                if (!string.IsNullOrEmpty(detail.Usage)) dosageText.Append(detail.Usage);
                else
                {
                    if (detail.MorningDose.HasValue) dosageText.Append($"Sang: {detail.MorningDose} ");
                    if (detail.NoonDose.HasValue) dosageText.Append($"Trua: {detail.NoonDose} ");
                    if (detail.EveningDose.HasValue) dosageText.Append($"Chieu: {detail.EveningDose} ");
                    if (detail.NightDose.HasValue) dosageText.Append($"Toi: {detail.NightDose} ");
                    if (!string.IsNullOrEmpty(detail.Frequency)) dosageText.Append($"({detail.Frequency})");
                }
                if (!string.IsNullOrEmpty(detail.Route)) dosageText.Append($" - {detail.Route}");

                body.AppendLine($@"<tr><td class=""text-center"">{idx}</td><td>{Esc(detail.Medicine?.MedicineName)}</td><td>{Esc(detail.Medicine?.Concentration)}</td><td class=""text-center"">{Esc(detail.Unit ?? detail.Medicine?.Unit)}</td><td class=""text-center"">{detail.Quantity:#,##0}</td><td>{Esc(dosageText.ToString())}</td></tr>");
            }
            body.AppendLine("</tbody></table>");

            body.AppendLine(@"<div style=""margin-top:15px;padding:10px;border:1px dashed #999;font-style:italic"">Luu y: Don thuoc nay mua tai nha thuoc ben ngoai. Benh nhan tu chiu trach nhiem ve chat luong thuoc.</div>");

            if (!string.IsNullOrEmpty(rx.Note))
                body.AppendLine($@"<div class=""field"" style=""margin-top:10px""><span class=""field-label"">Loi dan:</span><span class=""field-value"">{Esc(rx.Note)}</span></div>");

            body.AppendLine(GetSignatureBlock(rx.Doctor?.FullName));

            var html = WrapHtmlPage("Don thuoc mua ngoai", body.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    public async Task<PrescriptionFullDto> CopyPrescriptionFromHistoryAsync(Guid examinationId, Guid sourcePrescriptionId)
    {
        var source = await GetPrescriptionByIdAsync(sourcePrescriptionId);
        if (source == null) throw new Exception("Source prescription not found");

        source.Id = Guid.NewGuid();
        source.ExaminationId = examinationId;
        source.PrescriptionDate = DateTime.Now;

        return source;
    }

    public async Task<List<ExamWarehouseDto>> GetDispensaryWarehousesAsync()
    {
        var warehouses = await _context.Warehouses
            .Where(w => w.IsActive && w.WarehouseType == 2) // Dispensary type
            .ToBoundedListAsync("ExaminationCompleteService.GetDispensaryWarehousesAsync");

        return warehouses.Select(w => new ExamWarehouseDto
        {
            Id = w.Id,
            Code = w.WarehouseCode,
            Name = w.WarehouseName,
            WarehouseType = w.WarehouseType,
            IsActive = w.IsActive
        }).ToList();
    }

    /// <summary>
    /// Import danh sach cap tuong tac thuoc tu CSV.
    /// Header bat buoc: ActiveIngredient1,ActiveIngredient2,Severity,InteractionType,Description,Recommendation
    /// Upsert: tim cap thuoc theo (ActiveIngredient trim lower) — doi xung (A,B) == (B,A).
    /// NOTE: Excel can them thu vien ClosedXML/EPPlus; hien tai chi ho tro CSV.
    /// </summary>
    public async Task<DrugInteractionImportResultDto> ImportDrugInteractionsAsync(byte[] csvContent)
    {
        var result = new DrugInteractionImportResultDto();
        var lines = Encoding.UTF8.GetString(csvContent)
            .Split('\n', StringSplitOptions.RemoveEmptyEntries);

        if (lines.Length < 2)
        {
            result.Errors.Add(new DrugInteractionImportErrorDto
            {
                RowNumber = 0,
                ErrorMessage = "File CSV rong hoac thieu header. Header bat buoc: ActiveIngredient1,ActiveIngredient2,Severity,InteractionType,Description,Recommendation"
            });
            return result;
        }

        // Validate header (case-insensitive)
        var headerCols = lines[0].Trim().Split(',');
        string[] requiredHeaders = { "activeingredient1", "activeingredient2", "severity" };
        var headerLower = headerCols.Select(h => h.Trim().ToLowerInvariant()).ToArray();
        foreach (var req in requiredHeaders)
        {
            if (!headerLower.Contains(req))
            {
                result.Errors.Add(new DrugInteractionImportErrorDto
                {
                    RowNumber = 1,
                    ErrorMessage = $"Thieu cot bat buoc: {req}. Header hien tai: {lines[0].Trim()}"
                });
                return result;
            }
        }

        int idxAI1       = Array.IndexOf(headerLower, "activeingredient1");
        int idxAI2       = Array.IndexOf(headerLower, "activeingredient2");
        int idxSeverity  = Array.IndexOf(headerLower, "severity");
        int idxType      = Array.IndexOf(headerLower, "interactiontype");
        int idxDesc      = Array.IndexOf(headerLower, "description");
        int idxRec       = Array.IndexOf(headerLower, "recommendation");

        // Load tat ca medicines de lookup theo ActiveIngredient (case-insensitive)
        var allMedicines = await _context.Medicines
            .Where(m => !m.IsDeleted && m.ActiveIngredient != null)
            .Select(m => new { m.Id, m.ActiveIngredient })
            .ToListAsync();

        // Group by ActiveIngredient (lowercase) — 1 hoat chat co the co nhieu medicine
        var aiIndex = allMedicines
            .GroupBy(m => m.ActiveIngredient!.Trim().ToLowerInvariant())
            .ToDictionary(g => g.Key, g => g.Select(x => x.Id).ToList());

        // Load existing interactions de upsert
        var existingInteractions = await _context.DrugInteractions
            .Where(d => !d.IsDeleted)
            .ToListAsync();

        result.TotalRows = lines.Length - 1;

        for (int i = 1; i < lines.Length; i++)
        {
            var line = lines[i].Trim();
            if (string.IsNullOrWhiteSpace(line)) { result.TotalRows--; continue; }

            var cols = line.Split(',');
            int rowNum = i + 1; // 1-based, row 1 = header

            try
            {
                if (cols.Length <= Math.Max(idxAI1, idxAI2))
                {
                    result.Skipped++;
                    result.Errors.Add(new DrugInteractionImportErrorDto
                    {
                        RowNumber = rowNum,
                        ErrorMessage = "Khong du cot"
                    });
                    continue;
                }

                var ai1 = idxAI1 < cols.Length ? cols[idxAI1].Trim() : "";
                var ai2 = idxAI2 < cols.Length ? cols[idxAI2].Trim() : "";
                var severityStr = idxSeverity < cols.Length ? cols[idxSeverity].Trim() : "1";

                if (string.IsNullOrWhiteSpace(ai1) || string.IsNullOrWhiteSpace(ai2))
                {
                    result.Skipped++;
                    result.Errors.Add(new DrugInteractionImportErrorDto
                    {
                        RowNumber = rowNum, ActiveIngredient1 = ai1, ActiveIngredient2 = ai2,
                        ErrorMessage = "Hoat chat 1 hoac hoat chat 2 trong"
                    });
                    continue;
                }

                if (!int.TryParse(severityStr, out var severity) || severity < 1 || severity > 4)
                {
                    result.Skipped++;
                    result.Errors.Add(new DrugInteractionImportErrorDto
                    {
                        RowNumber = rowNum, ActiveIngredient1 = ai1, ActiveIngredient2 = ai2,
                        ErrorMessage = $"Severity khong hop le: '{severityStr}' (phai 1-4)"
                    });
                    continue;
                }

                var ai1Key = ai1.ToLowerInvariant();
                var ai2Key = ai2.ToLowerInvariant();

                if (!aiIndex.TryGetValue(ai1Key, out var med1Ids) || !med1Ids.Any())
                {
                    result.Skipped++;
                    result.Errors.Add(new DrugInteractionImportErrorDto
                    {
                        RowNumber = rowNum, ActiveIngredient1 = ai1, ActiveIngredient2 = ai2,
                        ErrorMessage = $"Khong tim thay thuoc co hoat chat: '{ai1}'"
                    });
                    continue;
                }

                if (!aiIndex.TryGetValue(ai2Key, out var med2Ids) || !med2Ids.Any())
                {
                    result.Skipped++;
                    result.Errors.Add(new DrugInteractionImportErrorDto
                    {
                        RowNumber = rowNum, ActiveIngredient1 = ai1, ActiveIngredient2 = ai2,
                        ErrorMessage = $"Khong tim thay thuoc co hoat chat: '{ai2}'"
                    });
                    continue;
                }

                var interactionType = idxType >= 0 && idxType < cols.Length ? cols[idxType].Trim() : null;
                var description     = idxDesc >= 0 && idxDesc < cols.Length ? cols[idxDesc].Trim() : null;
                var recommendation  = idxRec  >= 0 && idxRec  < cols.Length ? cols[idxRec].Trim()  : null;

                // Upsert: lap qua tung cap (med1, med2) cua (ai1, ai2)
                bool isNewForThisPair = false;
                foreach (var m1Id in med1Ids)
                {
                    foreach (var m2Id in med2Ids)
                    {
                        if (m1Id == m2Id) continue; // bo qua cung thuoc

                        var existing = existingInteractions.FirstOrDefault(d =>
                            (d.Medicine1Id == m1Id && d.Medicine2Id == m2Id) ||
                            (d.Medicine1Id == m2Id && d.Medicine2Id == m1Id));

                        if (existing != null)
                        {
                            // Update
                            existing.Severity        = severity;
                            existing.InteractionType = interactionType;
                            existing.Description     = description;
                            existing.Recommendation  = recommendation;
                            existing.IsActive        = true;
                            existing.UpdatedAt       = DateTime.UtcNow;
                        }
                        else
                        {
                            // Insert
                            var newEntry = new DrugInteraction
                            {
                                Medicine1Id     = m1Id,
                                Medicine2Id     = m2Id,
                                Severity        = severity,
                                InteractionType = interactionType,
                                Description     = description,
                                Recommendation  = recommendation,
                                IsActive        = true,
                            };
                            _context.DrugInteractions.Add(newEntry);
                            existingInteractions.Add(newEntry); // cap nhat cache local
                            isNewForThisPair = true;
                        }
                    }
                }

                if (isNewForThisPair) result.Imported++;
                else result.Updated++;
            }
            catch (Exception ex)
            {
                result.Skipped++;
                result.Errors.Add(new DrugInteractionImportErrorDto
                {
                    RowNumber = rowNum,
                    ErrorMessage = $"Loi xu ly dong: {ex.Message}"
                });
            }
        }

        await _context.SaveChangesAsync();
        return result;
    }

    // ── Recent prescriptions + search by code (Issue #202 — moved from controller) ─

    public async Task<object> GetRecentPrescriptionsAsync(DateTime fromDate, DateTime toDate, string? keyword, int pageSize)
    {
        if (pageSize <= 0 || pageSize > 500) pageSize = 100;
        var q = _context.Prescriptions
            .Include(p => p.MedicalRecord).ThenInclude(m => m!.Patient)
            .Include(p => p.Doctor)
            .Include(p => p.Department)
            .Include(p => p.Details).ThenInclude(i => i.Medicine)
            .Where(p => p.PrescriptionDate >= fromDate && p.PrescriptionDate <= toDate);
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            q = q.Where(p => p.PrescriptionCode.Contains(kw)
                || (p.MedicalRecord != null && p.MedicalRecord.Patient != null
                    && (p.MedicalRecord.Patient.FullName.Contains(kw)
                        || p.MedicalRecord.Patient.PatientCode.Contains(kw))));
        }
        var list = await q.OrderByDescending(p => p.PrescriptionDate).Take(pageSize).ToListAsync();
        var legacyMedicalRecordIds = list
            .Where(p => !p.ExaminationId.HasValue || p.ExaminationId == Guid.Empty)
            .Select(p => p.MedicalRecordId)
            .Distinct()
            .ToList();
        var fallbackExaminations = legacyMedicalRecordIds.Count == 0
            ? new List<Examination>()
            : await _context.Examinations
                .Where(e => legacyMedicalRecordIds.Contains(e.MedicalRecordId))
                .ToListAsync();
        var examinationsByRecord = fallbackExaminations
            .GroupBy(e => e.MedicalRecordId)
            .ToDictionary(g => g.Key, g => (IEnumerable<Examination>)g.ToList());

        return list.Select(p => new
        {
            id = p.Id,
            examinationId = ResolvePrescriptionExaminationId(
                p,
                examinationsByRecord.TryGetValue(p.MedicalRecordId, out var exams)
                    ? exams
                    : Enumerable.Empty<Examination>()),
            prescriptionCode = p.PrescriptionCode,
            prescriptionDate = p.PrescriptionDate,
            prescribedAt = p.PrescriptionDate,
            patientId = p.MedicalRecord != null ? p.MedicalRecord.PatientId : (Guid?)null,
            patientCode = p.MedicalRecord?.Patient?.PatientCode,
            patientName = p.MedicalRecord?.Patient?.FullName,
            gender = p.MedicalRecord?.Patient?.Gender,
            doctorName = p.Doctor?.FullName,
            departmentName = p.Department?.DepartmentName,
            diagnosis = p.DiagnosisName ?? p.Diagnosis,
            instructions = p.Instructions,
            isDispensed = p.IsDispensed,
            status = p.Status,
            statusName = p.Status switch
            {
                HIS.Core.Constants.PrescriptionStatus.PendingApproval => "Chờ duyệt",
                HIS.Core.Constants.PrescriptionStatus.Approved => "Đã duyệt",
                HIS.Core.Constants.PrescriptionStatus.Dispensed => "Đã cấp phát",
                HIS.Core.Constants.PrescriptionStatus.PartialDispensed => "Cấp một phần",
                HIS.Core.Constants.PrescriptionStatus.Returned => "Hoàn trả",
                HIS.Core.Constants.PrescriptionStatus.Cancelled => "Đã hủy",
                _ => "Không xác định",
            },
            totalAmount = p.TotalAmount,
            items = p.Details.Select(i => new
            {
                id = i.Id,
                drugName = i.Medicine != null ? i.Medicine.MedicineName : null,
                genericName = i.Medicine != null ? i.Medicine.ActiveIngredient : null,
                quantity = i.Quantity,
                unit = i.Unit ?? (i.Medicine != null ? i.Medicine.Unit : null),
                dosage = i.Dosage,
                frequency = i.Frequency,
                route = i.Route,
                days = i.Days,
                duration = i.Days + " ngày",
                instructions = i.UsageInstructions,
            }),
        });
    }

    public async Task<object?> SearchPrescriptionByCodeAsync(string code)
    {
        var trimmed = code.Trim();
        var q = _context.Prescriptions
            .Include(p => p.MedicalRecord).ThenInclude(m => m!.Patient)
            .Include(p => p.Doctor)
            .Include(p => p.Details).ThenInclude(i => i.Medicine)
            .AsQueryable();
        var p = await q.FirstOrDefaultAsync(x => x.PrescriptionCode == trimmed);
        if (p == null && Guid.TryParse(trimmed, out var pid))
            p = await q.FirstOrDefaultAsync(x => x.Id == pid);
        if (p == null) return null;
        return new
        {
            id = p.Id,
            prescriptionCode = p.PrescriptionCode,
            prescriptionDate = p.PrescriptionDate,
            prescribedAt = p.PrescriptionDate,
            patientCode = p.MedicalRecord?.Patient?.PatientCode,
            patientName = p.MedicalRecord?.Patient?.FullName,
            gender = p.MedicalRecord?.Patient?.Gender,
            doctorName = p.Doctor?.FullName,
            diagnosis = p.Diagnosis,
            isDispensed = p.IsDispensed,
            status = p.Status,
            totalAmount = p.TotalAmount,
            insuranceType = p.PrescriptionType switch
            {
                1 => "Ngoại trú",
                2 => "Nội trú",
                3 => "Nhà thuốc",
                _ => "Thu phí",
            },
            items = p.Details.Select(i => new
            {
                id = i.Id,
                medicineName = i.Medicine != null ? i.Medicine.MedicineName : null,
                quantity = i.Quantity,
                unit = i.Unit ?? (i.Medicine != null ? i.Medicine.Unit : null),
                dosage = i.Dosage,
                days = i.Days,
            }),
        };
    }

    #endregion
}
