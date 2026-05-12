using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using FellowOakDicom;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Phase 3 — Xuất kết quả AI sang định dạng tiêu chuẩn.
/// HTML report (browser print → PDF), DICOM SR (đẩy về Orthanc PACS),
/// merge findings vào RadiologyReport hiện có.
/// </summary>
public class AiReportService : IAiReportService
{
    private readonly HISDbContext _db;
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _httpFactory;
    private readonly ILogger<AiReportService> _logger;

    public AiReportService(
        HISDbContext db,
        IConfiguration config,
        IHttpClientFactory httpFactory,
        ILogger<AiReportService> logger)
    {
        _db = db;
        _config = config;
        _httpFactory = httpFactory;
        _logger = logger;
    }

    // ------------------------------------------------------------------
    // Common loader — both PDF + DICOM SR start from the same query.
    // ------------------------------------------------------------------

    private async Task<(AiLabelingResult Result, Patient? Patient, RadiologyRequest? Request, User? Reviewer, User? Creator)>
        LoadAsync(Guid aiResultId)
    {
        var result = await _db.AiLabelingResults
            .Include(r => r.Patient)
            .Include(r => r.RadiologyRequest!)
                .ThenInclude(rr => rr.Service)
            .FirstOrDefaultAsync(r => r.Id == aiResultId)
            ?? throw new InvalidOperationException($"AiLabelingResult {aiResultId} không tồn tại");

        User? reviewer = null;
        if (result.ReviewedBy.HasValue)
            reviewer = await _db.Users.FirstOrDefaultAsync(u => u.Id == result.ReviewedBy.Value);

        User? creator = null;
        if (Guid.TryParse(result.CreatedBy, out var cbId))
            creator = await _db.Users.FirstOrDefaultAsync(u => u.Id == cbId);

        return (result, result.Patient, result.RadiologyRequest, reviewer, creator);
    }

    // ------------------------------------------------------------------
    // Parse the LabelsJson + AcceptedLabelsJson into a flat list.
    // ------------------------------------------------------------------

    private record AiFinding(string Label, string LabelVi, double Score, bool Accepted);

    private static IReadOnlyList<AiFinding> ParseFindings(AiLabelingResult r)
    {
        var raw = ParseLabelArray(r.LabelsJson);
        var accepted = ParseLabelArray(r.AcceptedLabelsJson ?? "[]");
        var acceptedKeys = new HashSet<string>(accepted.Select(a => a.label), StringComparer.OrdinalIgnoreCase);

        return raw
            .OrderByDescending(x => x.score)
            .Select(x => new AiFinding(x.label, x.labelVi, x.score, acceptedKeys.Contains(x.label)))
            .ToList();
    }

    private static List<(string label, string labelVi, double score)> ParseLabelArray(string json)
    {
        var list = new List<(string, string, double)>();
        if (string.IsNullOrWhiteSpace(json)) return list;
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind != JsonValueKind.Array) return list;
            foreach (var item in doc.RootElement.EnumerateArray())
            {
                var label = item.TryGetProperty("label", out var l) ? l.GetString() ?? "" : "";
                var labelVi = item.TryGetProperty("labelVi", out var lv) ? lv.GetString() ?? label : label;
                var score = item.TryGetProperty("score", out var s) && s.ValueKind == JsonValueKind.Number ? s.GetDouble() : 0.0;
                list.Add((label, labelVi, score));
            }
        }
        catch
        {
            /* tolerate malformed JSON — return empty */
        }
        return list;
    }

    // ==================================================================
    // 1. HTML report (browser print → PDF)
    // ==================================================================

    public async Task<byte[]> GenerateAiReportHtmlAsync(Guid aiResultId)
    {
        var (result, patient, request, reviewer, creator) = await LoadAsync(aiResultId);
        var findings = ParseFindings(result);

        var status = result.ReviewStatus switch
        {
            1 => "Bác sĩ chấp nhận toàn bộ",
            2 => "Bác sĩ chấp nhận một phần",
            3 => "Bác sĩ từ chối",
            _ => "Chờ bác sĩ xem xét"
        };

        var body = new StringBuilder();
        body.Append(GetHospitalHeader());
        body.AppendLine(@"<h2 style=""text-align:center;margin:15px 0;text-transform:uppercase;letter-spacing:1px"">BÁO CÁO PHÂN TÍCH HÌNH ẢNH BẰNG AI</h2>");
        body.AppendLine(@"<div style=""text-align:center;font-style:italic;font-size:11px;margin-bottom:15px"">AI hỗ trợ chẩn đoán — bác sĩ chịu trách nhiệm cuối cùng về kết luận</div>");

        // Patient block (nếu có)
        if (patient != null)
        {
            body.Append(GetPatientInfoBlock(
                patient.PatientCode, patient.FullName, patient.Gender, patient.DateOfBirth,
                patient.Address, patient.PhoneNumber, patient.InsuranceNumber,
                medicalRecordCode: request?.MedicalRecord?.MedicalRecordCode));
        }
        else
        {
            body.AppendLine(@"<div style=""margin-bottom:10px;font-style:italic;color:#666"">(Không tìm thấy thông tin bệnh nhân — Study được chụp ngoài hệ thống)</div>");
        }

        // Study info
        body.AppendLine(@"<h3 style=""margin-top:15px"">1. Thông tin chụp</h3>");
        body.AppendLine(@"<table style=""width:100%;border-collapse:collapse;margin-top:5px""><tbody>");
        body.AppendLine($@"<tr><td style=""padding:4px 8px;width:30%""><b>Study Instance UID:</b></td><td style=""padding:4px 8px"">{H(result.StudyInstanceUID)}</td></tr>");
        if (request != null)
        {
            body.AppendLine($@"<tr><td style=""padding:4px 8px""><b>Phiếu CĐHA:</b></td><td style=""padding:4px 8px"">{H(request.RequestCode)}</td></tr>");
            body.AppendLine($@"<tr><td style=""padding:4px 8px""><b>Dịch vụ:</b></td><td style=""padding:4px 8px"">{H(request.Service?.ServiceName)}</td></tr>");
            body.AppendLine($@"<tr><td style=""padding:4px 8px""><b>Vùng chụp:</b></td><td style=""padding:4px 8px"">{H(request.BodyPart)}</td></tr>");
        }
        body.AppendLine($@"<tr><td style=""padding:4px 8px""><b>Ngày phân tích:</b></td><td style=""padding:4px 8px"">{result.CreatedAt.ToLocalTime():dd/MM/yyyy HH:mm}</td></tr>");
        body.AppendLine("</tbody></table>");

        // Model info
        body.AppendLine(@"<h3 style=""margin-top:15px"">2. Mô hình AI</h3>");
        body.AppendLine(@"<table style=""width:100%;border-collapse:collapse;margin-top:5px""><tbody>");
        body.AppendLine($@"<tr><td style=""padding:4px 8px;width:30%""><b>Tên mô hình:</b></td><td style=""padding:4px 8px"">{H(result.ModelName)}</td></tr>");
        body.AppendLine($@"<tr><td style=""padding:4px 8px""><b>Phiên bản:</b></td><td style=""padding:4px 8px"">{H(result.ModelVersion)}</td></tr>");
        body.AppendLine($@"<tr><td style=""padding:4px 8px""><b>Thời gian xử lý:</b></td><td style=""padding:4px 8px"">{result.DurationMs} ms</td></tr>");
        if (!string.IsNullOrWhiteSpace(result.InputImageHash))
            body.AppendLine($@"<tr><td style=""padding:4px 8px""><b>Hash ảnh đầu vào (SHA-256):</b></td><td style=""padding:4px 8px;font-family:monospace;font-size:10px"">{H(result.InputImageHash)}</td></tr>");
        body.AppendLine("</tbody></table>");

        // Findings table
        body.AppendLine(@"<h3 style=""margin-top:15px"">3. Kết quả phân tích AI</h3>");
        if (findings.Count == 0)
        {
            body.AppendLine(@"<div style=""font-style:italic;color:#666"">(Không có kết quả phân tích — mô hình có thể đã lỗi. Xem AI Labeling audit log.)</div>");
        }
        else
        {
            body.AppendLine(@"<table style=""width:100%;border-collapse:collapse;margin-top:5px;border:1px solid #000"">
<thead>
<tr style=""background:#eee"">
    <th style=""border:1px solid #000;padding:6px;width:40%;text-align:left"">Chẩn đoán gợi ý</th>
    <th style=""border:1px solid #000;padding:6px;width:20%;text-align:center"">Độ tin cậy</th>
    <th style=""border:1px solid #000;padding:6px;width:15%;text-align:center"">Mức độ</th>
    <th style=""border:1px solid #000;padding:6px;width:25%;text-align:center"">Xác nhận BS</th>
</tr></thead>
<tbody>");
            foreach (var f in findings)
            {
                var severity = f.Score >= 0.7 ? "Cao" : f.Score >= 0.4 ? "Trung bình" : "Thấp";
                var sevColor = f.Score >= 0.7 ? "#cf1322" : f.Score >= 0.4 ? "#fa8c16" : "#888";
                var accepted = f.Accepted
                    ? @"<span style=""color:#52c41a;font-weight:bold"">✓ Xác nhận</span>"
                    : @"<span style=""color:#999"">—</span>";
                body.AppendLine($@"<tr>
    <td style=""border:1px solid #000;padding:6px"">
        <b>{H(f.LabelVi)}</b>
        <div style=""font-size:10px;color:#666"">{H(f.Label)}</div>
    </td>
    <td style=""border:1px solid #000;padding:6px;text-align:center;font-weight:bold"">{Math.Round(f.Score * 100)}%</td>
    <td style=""border:1px solid #000;padding:6px;text-align:center;color:{sevColor};font-weight:bold"">{severity}</td>
    <td style=""border:1px solid #000;padding:6px;text-align:center"">{accepted}</td>
</tr>");
            }
            body.AppendLine("</tbody></table>");
        }

        // BS review
        body.AppendLine(@"<h3 style=""margin-top:15px"">4. Ý kiến của bác sĩ</h3>");
        body.AppendLine($@"<div style=""padding:8px 12px;background:#f9f9f9;border-left:3px solid #1890ff;margin-top:5px"">
    <div><b>Trạng thái:</b> {status}</div>");
        if (reviewer != null && result.ReviewedAt.HasValue)
        {
            body.AppendLine($@"    <div><b>BS xác nhận:</b> {H(reviewer.FullName)} — {result.ReviewedAt.Value.ToLocalTime():dd/MM/yyyy HH:mm}</div>");
        }
        if (!string.IsNullOrWhiteSpace(result.ReviewNote))
        {
            body.AppendLine($@"    <div style=""margin-top:5px""><b>Ghi chú:</b><br/>{H(result.ReviewNote)}</div>");
        }
        body.AppendLine("</div>");

        // Disclaimer
        body.AppendLine(@"<div style=""margin-top:20px;padding:8px;background:#fffbe6;border:1px solid #ffe58f;font-size:11px"">
    <b>Lưu ý quan trọng:</b> Kết quả phân tích này được sinh tự động bởi hệ thống AI hỗ trợ chẩn đoán hình ảnh,
    chỉ mang tính chất tham khảo. Việc chẩn đoán và điều trị cuối cùng phải do bác sĩ có thẩm quyền quyết định
    dựa trên toàn bộ thông tin lâm sàng. Tuân thủ TT 54/2017/TT-BYT và TT 32/2023/TT-BYT về quản lý chất lượng
    chẩn đoán hình ảnh y khoa.
</div>");

        // Signature
        body.Append(GetSignatureBlock(
            doctorName: reviewer?.FullName ?? creator?.FullName,
            includePatient: false));

        return Encoding.UTF8.GetBytes(WrapHtmlPage("Báo cáo phân tích AI", body.ToString()));
    }

    // ==================================================================
    // 2. DICOM SR (TID 1500 simplified — basic-text SR)
    // ==================================================================

    public Task<byte[]> GenerateDicomSrAsync(Guid aiResultId)
    {
        return BuildDicomSrAsync(aiResultId);
    }

    private async Task<byte[]> BuildDicomSrAsync(Guid aiResultId)
    {
        var (result, patient, request, reviewer, _) = await LoadAsync(aiResultId);
        var findings = ParseFindings(result);

        // Required SR module:
        //   SOPClassUID = Basic Text SR (1.2.840.10008.5.1.4.1.1.88.11)
        //   Plus Patient/Study/Series/SOP Common modules.
        var sopInstanceUid = DicomUIDGenerator.GenerateDerivedFromUUID().UID;
        var seriesInstanceUid = DicomUIDGenerator.GenerateDerivedFromUUID().UID;

        // Disable strict VR validation — legacy/test StudyInstanceUIDs may
        // contain non-digit chars that fo-dicom otherwise rejects. The SR is
        // still well-formed and any conforming reader can parse it.
        var ds = new DicomDataset(DicomTransferSyntax.ExplicitVRLittleEndian) { AutoValidate = false };

        // Patient
        ds.AddOrUpdate(DicomTag.PatientName, patient?.FullName ?? "ANONYMOUS");
        ds.AddOrUpdate(DicomTag.PatientID, patient?.PatientCode ?? "UNKNOWN");
        if (patient?.DateOfBirth is { } dob)
            ds.AddOrUpdate(DicomTag.PatientBirthDate, dob.ToString("yyyyMMdd"));
        ds.AddOrUpdate(DicomTag.PatientSex,
            patient?.Gender == 1 ? "M" : patient?.Gender == 2 ? "F" : "O");

        // Study — reference the ORIGINAL imaging study so the SR shows up
        // alongside its CR/CT/US in any DICOM viewer.
        ds.AddOrUpdate(DicomTag.StudyInstanceUID, result.StudyInstanceUID);
        ds.AddOrUpdate(DicomTag.StudyDate, result.CreatedAt.ToString("yyyyMMdd"));
        ds.AddOrUpdate(DicomTag.StudyTime, result.CreatedAt.ToString("HHmmss"));
        ds.AddOrUpdate(DicomTag.AccessionNumber, request?.RequestCode ?? "");
        ds.AddOrUpdate(DicomTag.ReferringPhysicianName, request?.RequestingDoctor?.FullName ?? "");

        // Series — new series, modality=SR
        ds.AddOrUpdate(DicomTag.SeriesInstanceUID, seriesInstanceUid);
        ds.AddOrUpdate(DicomTag.Modality, "SR");
        ds.AddOrUpdate(DicomTag.SeriesNumber, "9001");
        ds.AddOrUpdate(DicomTag.SeriesDescription, $"AI Analysis — {result.ModelName} {result.ModelVersion}");

        // SOP Common
        ds.AddOrUpdate(DicomTag.SOPClassUID, DicomUID.BasicTextSRStorage);
        ds.AddOrUpdate(DicomTag.SOPInstanceUID, sopInstanceUid);
        ds.AddOrUpdate(DicomTag.InstanceNumber, "1");
        ds.AddOrUpdate(DicomTag.ContentDate, DateTime.UtcNow.ToString("yyyyMMdd"));
        ds.AddOrUpdate(DicomTag.ContentTime, DateTime.UtcNow.ToString("HHmmss"));
        ds.AddOrUpdate(DicomTag.Manufacturer, "HIS-AI");
        ds.AddOrUpdate(DicomTag.ManufacturerModelName, result.ModelName);
        ds.AddOrUpdate(DicomTag.SoftwareVersions, result.ModelVersion);

        // SR document
        ds.AddOrUpdate(DicomTag.ValueType, "CONTAINER");
        ds.AddOrUpdate(DicomTag.CompletionFlag, result.ReviewStatus == 1 || result.ReviewStatus == 2 ? "COMPLETE" : "PARTIAL");
        ds.AddOrUpdate(DicomTag.VerificationFlag, reviewer != null ? "VERIFIED" : "UNVERIFIED");
        ds.AddOrUpdate(DicomTag.ContinuityOfContent, "SEPARATE");

        // ConceptNameCodeSequence: DCM 11528 (Imaging Report)
        var conceptNameSeq = new DicomSequence(DicomTag.ConceptNameCodeSequence,
            CodeItem("11528-7", "LN", "Radiology Report"));
        ds.Add(conceptNameSeq);

        // Verified-by (if BS reviewed)
        if (reviewer != null && result.ReviewedAt.HasValue)
        {
            var verifySeq = new DicomSequence(DicomTag.VerifyingObserverSequence, new DicomDataset
            {
                { DicomTag.VerifyingOrganization, "HIS" },
                { DicomTag.VerificationDateTime, result.ReviewedAt.Value.ToString("yyyyMMddHHmmss") },
                { DicomTag.VerifyingObserverName, reviewer.FullName ?? "" },
            });
            ds.Add(verifySeq);
        }

        // ContentSequence: one TextContentItem per finding + meta items
        var contentItems = new List<DicomDataset>
        {
            BuildTextItem("121111", "DCM", "Summary",
                BuildSummaryText(result, findings, reviewer)),
            BuildTextItem("121071", "DCM", "Finding",
                string.Join("\n", findings
                    .Where(f => f.Score >= 0.4 || f.Accepted)
                    .Select(f => $"{f.LabelVi} ({f.Label}): {Math.Round(f.Score * 100)}%{(f.Accepted ? " [BS xác nhận]" : "")}"))),
        };

        if (!string.IsNullOrWhiteSpace(result.ReviewNote))
        {
            contentItems.Add(BuildTextItem("121106", "DCM", "Comment", result.ReviewNote!));
        }

        ds.Add(new DicomSequence(DicomTag.ContentSequence, contentItems.ToArray()));

        // Wrap as DICOM file with proper meta info
        var dicomFile = new DicomFile(ds);
        dicomFile.FileMetaInfo.MediaStorageSOPClassUID = DicomUID.BasicTextSRStorage;
        dicomFile.FileMetaInfo.MediaStorageSOPInstanceUID = DicomUID.Parse(sopInstanceUid);
        dicomFile.FileMetaInfo.TransferSyntax = DicomTransferSyntax.ExplicitVRLittleEndian;
        dicomFile.FileMetaInfo.ImplementationClassUID = DicomUID.Parse("1.2.826.0.1.3680043.2.1545.0.0.1");
        dicomFile.FileMetaInfo.ImplementationVersionName = "HIS-AI-1.0";

        using var ms = new MemoryStream();
        await dicomFile.SaveAsync(ms);
        return ms.ToArray();
    }

    /// <summary>HTML escape (PdfTemplateHelper's helper is private). Returns "" for null.</summary>
    private static string H(string? s)
    {
        if (string.IsNullOrEmpty(s)) return "";
        return s.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace("\"", "&quot;");
    }

    private static DicomDataset CodeItem(string codeValue, string codingScheme, string codeMeaning) => new()
    {
        { DicomTag.CodeValue, codeValue },
        { DicomTag.CodingSchemeDesignator, codingScheme },
        { DicomTag.CodeMeaning, codeMeaning },
    };

    private static DicomDataset BuildTextItem(string codeValue, string codingScheme, string codeMeaning, string text)
    {
        var ds = new DicomDataset
        {
            { DicomTag.RelationshipType, "CONTAINS" },
            { DicomTag.ValueType, "TEXT" },
            { DicomTag.TextValue, text ?? "" },
        };
        ds.Add(new DicomSequence(DicomTag.ConceptNameCodeSequence,
            CodeItem(codeValue, codingScheme, codeMeaning)));
        return ds;
    }

    private static string BuildSummaryText(AiLabelingResult r, IReadOnlyList<AiFinding> findings, User? reviewer)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"AI model: {r.ModelName} ({r.ModelVersion})");
        sb.AppendLine($"Processing time: {r.DurationMs} ms");
        sb.AppendLine($"Top findings (≥40% confidence):");
        foreach (var f in findings.Where(x => x.Score >= 0.4).Take(5))
            sb.AppendLine($"  - {f.LabelVi}: {Math.Round(f.Score * 100)}%");
        if (reviewer != null)
            sb.AppendLine($"Reviewed by: {reviewer.FullName}");
        sb.AppendLine("Disclaimer: AI-assisted analysis. Clinical interpretation by attending physician required.");
        return sb.ToString();
    }

    // ==================================================================
    // 3. Upload DICOM SR → Orthanc PACS
    // ==================================================================

    public async Task<(string OrthancInstanceId, string StudyInstanceUid)> UploadDicomSrToOrthancAsync(Guid aiResultId)
    {
        var pacsBase = _config["PACS:BaseUrl"];
        if (string.IsNullOrWhiteSpace(pacsBase))
            throw new InvalidOperationException("PACS:BaseUrl chưa được cấu hình");

        var srBytes = await BuildDicomSrAsync(aiResultId);

        using var http = _httpFactory.CreateClient("OrthancUpload");
        http.BaseAddress = new Uri(pacsBase.TrimEnd('/') + "/");

        // Basic auth nếu admin đặt credentials
        var user = _config["PACS:Username"];
        var pass = _config["PACS:Password"];
        if (!string.IsNullOrEmpty(user))
        {
            var basic = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{user}:{pass}"));
            http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", basic);
        }

        using var content = new ByteArrayContent(srBytes);
        content.Headers.ContentType = MediaTypeHeaderValue.Parse("application/dicom");

        var resp = await http.PostAsync("instances", content);
        var body = await resp.Content.ReadAsStringAsync();
        if (!resp.IsSuccessStatusCode)
            throw new InvalidOperationException($"Orthanc upload thất bại ({(int)resp.StatusCode}): {body}");

        // Orthanc returns { "ID": "<instance-id>", "Status": "Success", "ParentSeries": "...", ... }
        var instanceId = "";
        try
        {
            using var doc = JsonDocument.Parse(body);
            if (doc.RootElement.TryGetProperty("ID", out var idEl)) instanceId = idEl.GetString() ?? "";
        }
        catch { /* leave empty */ }

        _logger.LogInformation("AI DICOM SR uploaded to Orthanc: instanceId={InstanceId}, aiResultId={AiId}", instanceId, aiResultId);

        var result = await _db.AiLabelingResults.FirstAsync(r => r.Id == aiResultId);
        return (instanceId, result.StudyInstanceUID);
    }

    // ==================================================================
    // 4. Merge findings → RadiologyReport.Findings
    // ==================================================================

    /// <summary>Marker used to identify (and replace) previously-merged AI text.</summary>
    private const string MergeMarker = "=== AI hỗ trợ chẩn đoán ===";

    public async Task<Guid?> MergeToRadiologyReportAsync(Guid aiResultId)
    {
        var (result, _, request, reviewer, _) = await LoadAsync(aiResultId);
        var findings = ParseFindings(result);
        var accepted = findings.Where(f => f.Accepted).ToList();
        if (accepted.Count == 0)
        {
            _logger.LogInformation("AI result {AiId} has no accepted findings — skipping merge", aiResultId);
            return null;
        }

        // Find the RadiologyReport that belongs to this study.
        // Path: RadiologyRequest → RadiologyExam → RadiologyReport (1-1 latest)
        RadiologyReport? report = null;
        if (request != null)
        {
            report = await _db.RadiologyReports
                .Include(r => r.RadiologyExam)
                .Where(r => r.RadiologyExam.RadiologyRequestId == request.Id && !r.IsDeleted)
                .OrderByDescending(r => r.CreatedAt)
                .FirstOrDefaultAsync();
        }

        // Fallback: match by StudyInstanceUID across all exams (some flows don't link RadiologyRequestId)
        if (report == null && !string.IsNullOrEmpty(result.StudyInstanceUID))
        {
            var examIds = await _db.DicomStudies
                .Where(d => d.StudyInstanceUID == result.StudyInstanceUID)
                .Select(d => d.RadiologyExamId)
                .Distinct()
                .ToListAsync();

            if (examIds.Count > 0)
            {
                report = await _db.RadiologyReports
                    .Where(r => examIds.Contains(r.RadiologyExamId) && !r.IsDeleted)
                    .OrderByDescending(r => r.CreatedAt)
                    .FirstOrDefaultAsync();
            }
        }

        if (report == null)
        {
            _logger.LogInformation("No RadiologyReport matched StudyInstanceUID {UID} or request {ReqId}",
                result.StudyInstanceUID, request?.Id);
            return null;
        }

        // Build the AI text block.
        var sb = new StringBuilder();
        sb.AppendLine(MergeMarker);
        sb.AppendLine($"Mô hình: {result.ModelName} {result.ModelVersion}");
        sb.AppendLine($"BS xác nhận: {reviewer?.FullName ?? "(chưa rõ)"} — {result.ReviewedAt?.ToLocalTime():dd/MM/yyyy HH:mm}");
        sb.AppendLine("Các phát hiện được bác sĩ chấp nhận:");
        foreach (var f in accepted.OrderByDescending(f => f.Score))
            sb.AppendLine($"  • {f.LabelVi} ({f.Label}): {Math.Round(f.Score * 100)}% confidence");
        sb.AppendLine("=== Hết phần AI ===");

        // Idempotent merge: strip any previous AI block before appending.
        var existing = report.Findings ?? "";
        var startIdx = existing.IndexOf(MergeMarker, StringComparison.Ordinal);
        if (startIdx >= 0)
        {
            var endMarker = "=== Hết phần AI ===";
            var endIdx = existing.IndexOf(endMarker, startIdx, StringComparison.Ordinal);
            if (endIdx >= 0)
            {
                var tail = endIdx + endMarker.Length;
                existing = (existing[..startIdx] + (tail < existing.Length ? existing[tail..] : "")).TrimEnd();
            }
            else
            {
                existing = existing[..startIdx].TrimEnd();
            }
        }

        report.Findings = string.IsNullOrWhiteSpace(existing)
            ? sb.ToString()
            : existing + "\n\n" + sb.ToString();
        report.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        _logger.LogInformation("AI findings merged into RadiologyReport {ReportId} from aiResult {AiId}", report.Id, aiResultId);
        return report.Id;
    }
}
