using System.Text.Json;
using HIS.Application.DTOs.PatientPortal;
using HIS.Application.Services;
using HIS.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Những mảng kết quả mà cổng bệnh nhân trước đây không có đường nào lấy: thăm dò chức năng
/// (GAP 25), khám sức khoẻ hợp đồng tra theo bệnh nhân (GAP 27), và danh sách ảnh PACS của một phiếu
/// kết quả CĐHA (GAP 29, 30 — hai route cũ mà giao diện đang gọi đều đã chết).
/// </summary>
public partial class PatientPortalServiceImpl
{
    // ------------------------------------------------- thăm dò chức năng (GAP 25)

    public async Task<List<PortalFunctionalResultDto>> GetFunctionalResultsAsync(
        Guid patientId, DateTime? fromDate = null, DateTime? toDate = null, Guid? visitId = null)
    {
        var query = _context.FunctionalDiagnosticTests.AsNoTracking()
            // Chỉ trả phiếu đã có kết quả hoặc đã duyệt. Phiếu mới chỉ định thì chưa có gì để đọc,
            // mà hiện ra lại khiến người bệnh tưởng đã xong.
            .Where(t => t.PatientId == patientId && (t.Status == 2 || t.Status == 3));

        if (fromDate.HasValue) query = query.Where(t => t.PerformedAt >= fromDate);
        if (toDate.HasValue) query = query.Where(t => t.PerformedAt <= toDate);
        if (visitId.HasValue) query = query.Where(t => t.ExaminationId == visitId);

        var list = await query.OrderByDescending(t => t.PerformedAt).Take(30).ToListAsync();
        return list.Select(MapFunctionalResult).ToList();
    }

    public async Task<PortalFunctionalResultDto> GetFunctionalResultAsync(Guid id)
    {
        var e = await _context.FunctionalDiagnosticTests.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id);
        return e == null ? null! : MapFunctionalResult(e);
    }

    private static PortalFunctionalResultDto MapFunctionalResult(FunctionalDiagnosticTest e) =>
        new()
        {
            Id = e.Id,
            TestCode = e.TestCode,
            TestType = e.TestType,
            TestTypeName = DescribeFunctionalTestType(e.TestType),
            PerformedAt = e.PerformedAt,
            PerformingDoctorName = e.PerformingDoctorName ?? "",
            DeviceName = e.DeviceName ?? "",
            ClinicalIndication = e.ClinicalIndication ?? "",
            Findings = e.Findings ?? "",
            Conclusion = e.Conclusion ?? "",
            Recommendation = e.Recommendation ?? "",
            Measurements = ParseMeasurements(e.MeasurementsJson),
            ImageCount = CountJsonArray(e.ImagesJson),
            Status = e.Status,
            StatusName = e.Status switch
            {
                2 => "Đã có kết quả",
                3 => "Đã duyệt",
                4 => "Đã huỷ",
                1 => "Đang thực hiện",
                _ => "Chờ thực hiện",
            },
            VisitId = e.ExaminationId,
        };

    private static string DescribeFunctionalTestType(string code) => code switch
    {
        "ECG" => "Điện tim thường quy",
        "ECGStress" => "Điện tim gắng sức",
        "Endoscopy" => "Nội soi",
        "BoneDensity" => "Đo loãng xương",
        "EEG" => "Điện não",
        "EMG" => "Điện cơ",
        "Spirometry" => "Đo chức năng hô hấp",
        "Audiometry" => "Đo thính lực",
        _ => code,
    };

    /// <summary>
    /// Số đo lưu dưới dạng đối tượng JSON phẳng. Hỏng JSON thì trả danh sách rỗng chứ không ném:
    /// một trường phụ hỏng không được phép chặn người bệnh xem kết luận.
    /// </summary>
    private static List<FunctionalMeasurementDto> ParseMeasurements(string? json)
    {
        var result = new List<FunctionalMeasurementDto>();
        if (string.IsNullOrWhiteSpace(json)) return result;

        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind != JsonValueKind.Object) return result;

            foreach (var property in doc.RootElement.EnumerateObject())
            {
                result.Add(new FunctionalMeasurementDto
                {
                    Name = property.Name,
                    Value = property.Value.ValueKind == JsonValueKind.String
                        ? property.Value.GetString() ?? ""
                        : property.Value.ToString(),
                });
            }
        }
        catch (JsonException)
        {
            // bỏ qua — xem phần tóm tắt ở trên
        }

        return result;
    }

    private static int CountJsonArray(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return 0;
        try
        {
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.ValueKind == JsonValueKind.Array ? doc.RootElement.GetArrayLength() : 0;
        }
        catch (JsonException)
        {
            return 0;
        }
    }

    // ------------------------------------- khám sức khoẻ hợp đồng (GAP 27)

    public async Task<List<PortalHealthCheckupDto>> GetHealthCheckupsAsync(Guid patientId)
    {
        var list = await _context.HealthCheckupRecords.AsNoTracking()
            .Include(r => r.Campaign)
            .Where(r => r.PatientId == patientId)
            .OrderByDescending(r => r.CheckupDate)
            .Take(20)
            .ToListAsync();

        return list.Select(r => new PortalHealthCheckupDto
        {
            Id = r.Id,
            RecordCode = r.EmployeeCode ?? "",
            CampaignName = r.Campaign?.CampaignName ?? "",
            CompanyName = r.Campaign?.OrganizationName ?? "",
            CheckupDate = r.CheckupDate,
            HealthClassification = DescribeClassification(r.Classification),
            Conclusion = r.ResultSummary ?? "",
            Recommendation = r.Notes ?? "",
            CertificateIssued = r.CertificateIssued,
            CertificateNumber = r.CertificateNumber ?? "",
            CertificateDate = r.CertificateIssued ? r.CheckupDate : null,
        }).ToList();
    }

    /// <summary>
    /// Phân loại sức khoẻ lưu chữ A…E; người bệnh đọc "Loại I - Rất khoẻ" dễ hiểu hơn một chữ cái
    /// trần. Thang I…V theo Quyết định 1613/BYT-QĐ.
    /// </summary>
    private static string DescribeClassification(string? code) => (code ?? "").ToUpperInvariant() switch
    {
        "A" => "Loại I - Rất khoẻ",
        "B" => "Loại II - Khoẻ",
        "C" => "Loại III - Trung bình",
        "D" => "Loại IV - Yếu",
        "E" => "Loại V - Rất yếu",
        "" => "",
        _ => code!,
    };

    // ------------------------------------------------- ảnh PACS (GAP 29, 30)

    public async Task<List<PortalImagingInstanceDto>> GetImagingInstancesAsync(Guid reportId)
    {
        var study = await GetStudyAsync(reportId);

        // Ca chụp chưa có ảnh thì dừng ngay, KHÔNG hỏi PACS. Đường dự phòng của RIS bịa ra một ảnh
        // trỏ vào id nội bộ khi study trống — với màn hình nội bộ thì chỉ là một ô hỏng, nhưng đưa
        // cho người bệnh thì thành "bệnh viện có ảnh của tôi mà không xem được".
        if (study is null || study.NumberOfImages <= 0 || string.IsNullOrWhiteSpace(study.StudyInstanceUID))
            return new List<PortalImagingInstanceDto>();

        var studyUid = study.StudyInstanceUID;

        var result = new List<PortalImagingInstanceDto>();
        var series = await _ris.GetSeriesAsync(studyUid);

        foreach (var s in series)
        {
            if (string.IsNullOrWhiteSpace(s.SeriesInstanceUID)) continue;

            foreach (var image in await _ris.GetImagesAsync(s.SeriesInstanceUID))
            {
                if (string.IsNullOrWhiteSpace(image.OrthancInstanceId)) continue;

                result.Add(new PortalImagingInstanceDto
                {
                    InstanceId = image.OrthancInstanceId!,
                    SeriesInstanceUid = s.SeriesInstanceUID,
                    SeriesNumber = s.SeriesNumber,
                    InstanceNumber = image.InstanceNumber,
                    SeriesDescription = s.SeriesDescription ?? "",
                });
            }
        }

        return result;
    }

    public async Task<bool> IsInstanceInReportAsync(Guid reportId, string instanceId)
    {
        if (string.IsNullOrWhiteSpace(instanceId)) return false;

        // Đối chiếu thật với danh sách ảnh của ca chụp. Đây là chốt chặn duy nhất giữa "xem ảnh của
        // mình" và "xem ảnh của người khác": id instance của Orthanc đoán không ra, nhưng khó đoán
        // chưa bao giờ là một cơ chế phân quyền.
        var instances = await GetImagingInstancesAsync(reportId);
        return instances.Any(i => string.Equals(i.InstanceId, instanceId, StringComparison.Ordinal));
    }

    private async Task<DicomStudy?> GetStudyAsync(Guid reportId) => await _context.RadiologyReports
        .AsNoTracking()
        .Where(r => r.Id == reportId)
        .SelectMany(r => r.RadiologyExam.DicomStudies)
        .OrderByDescending(s => s.StudyDate)
        .FirstOrDefaultAsync();

    // ------------------------------------------------------ chủ sở hữu kết quả

    public async Task<Guid?> GetResultOwnerPatientIdAsync(string resultKind, Guid resultId) =>
        (resultKind ?? "").ToLowerInvariant() switch
        {
            "lab" => await _context.ServiceRequestDetails.AsNoTracking()
                .Where(d => d.Id == resultId)
                .Select(d => (Guid?)d.ServiceRequest.MedicalRecord!.PatientId)
                .FirstOrDefaultAsync(),

            "imaging" => await _context.RadiologyReports.AsNoTracking()
                .Where(r => r.Id == resultId)
                .Select(r => (Guid?)r.RadiologyExam.RadiologyRequest.PatientId)
                .FirstOrDefaultAsync(),

            "functional" => await _context.FunctionalDiagnosticTests.AsNoTracking()
                .Where(t => t.Id == resultId)
                .Select(t => (Guid?)t.PatientId)
                .FirstOrDefaultAsync(),

            _ => null,
        };
}
