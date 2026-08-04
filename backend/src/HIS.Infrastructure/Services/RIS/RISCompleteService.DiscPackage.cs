using System.IO.Compression;
using System.Net.Http.Headers;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.Radiology;

namespace HIS.Infrastructure.Services;

/// <summary>
/// NangCap26 — RIS I.4 mục 3 / RIS #59 / CAPTURE #118: ghi đĩa CD/DVD hình ảnh + kết quả ca chụp.
///
/// Trình duyệt KHÔNG ghi đĩa trực tiếp được, nên backend đóng gói thành 1 file ZIP
/// (ảnh DICOM tải từ Orthanc + phiếu kết quả + README) rồi FE tải về; người dùng ghi
/// đĩa bằng công cụ của hệ điều hành. Mọi lần xuất đều ghi log vì dữ liệu bệnh nhân
/// rời khỏi hệ thống.
/// </summary>
public partial class RISCompleteService
{
    /// <summary>
    /// Kiểm tra điều kiện ghi đĩa trước khi tải: study có tồn tại, có ảnh, PACS bật.
    /// </summary>
    public async Task<DiscPackageCheckDto> CheckDiscPackageAsync(Guid studyId)
    {
        var study = await _context.DicomStudies.AsNoTracking()
            .Where(s => s.Id == studyId && !s.IsDeleted)
            .Select(s => new
            {
                s.Id, s.StudyInstanceUID, s.PatientName, s.PatientID, s.StudyDate,
                s.StudyDescription, s.Modality, s.NumberOfSeries, s.NumberOfImages, s.StorageSize
            })
            .FirstOrDefaultAsync();

        if (study == null)
            return new DiscPackageCheckDto { CanBurn = false, Message = "Không tìm thấy ca chụp." };

        var pacsEnabled = string.Equals(_configuration["PACS:Enabled"], "true", StringComparison.OrdinalIgnoreCase);
        if (!pacsEnabled)
            return new DiscPackageCheckDto { CanBurn = false, Message = "PACS đang tắt — không tải được ảnh để ghi đĩa." };

        if (string.IsNullOrWhiteSpace(study.StudyInstanceUID))
            return new DiscPackageCheckDto { CanBurn = false, Message = "Ca chụp chưa liên kết dữ liệu hình ảnh trên PACS." };

        if (study.NumberOfImages <= 0)
            return new DiscPackageCheckDto { CanBurn = false, Message = "Ca chụp chưa có ảnh nào trên PACS." };

        return new DiscPackageCheckDto
        {
            CanBurn = true,
            StudyId = study.Id,
            StudyInstanceUid = study.StudyInstanceUID,
            PatientName = study.PatientName,
            PatientCode = study.PatientID,
            StudyDate = study.StudyDate,
            StudyDescription = study.StudyDescription,
            Modality = study.Modality,
            SeriesCount = study.NumberOfSeries,
            ImageCount = study.NumberOfImages,
            EstimatedSizeBytes = study.StorageSize,
            Message = "Sẵn sàng ghi đĩa."
        };
    }

    /// <summary>
    /// Đóng gói ca chụp thành ZIP: ảnh DICOM (archive từ Orthanc) + phiếu kết quả (nếu có) + README.
    /// </summary>
    public async Task<(byte[] Content, string FileName)> BuildDiscPackageAsync(Guid studyId, Guid userId)
    {
        var check = await CheckDiscPackageAsync(studyId);
        if (!check.CanBurn)
            throw new InvalidOperationException(check.Message);

        var ms = new MemoryStream();
        using (var zip = new ZipArchive(ms, ZipArchiveMode.Create, leaveOpen: true))
        {
            // 1) Ảnh DICOM — tải archive của study từ Orthanc.
            var dicomBytes = await DownloadStudyArchiveAsync(check.StudyInstanceUid!);
            if (dicomBytes is { Length: > 0 })
            {
                var e = zip.CreateEntry($"DICOM/{check.StudyInstanceUid}.zip", CompressionLevel.NoCompression);
                await using var s = e.Open();
                await s.WriteAsync(dicomBytes);
            }
            else
            {
                // Không chặn cả gói: vẫn xuất phiếu kết quả + ghi rõ lý do thiếu ảnh.
                var e = zip.CreateEntry("DICOM/README-LOI.txt");
                await using var w = new StreamWriter(e.Open(), Encoding.UTF8);
                await w.WriteLineAsync("Khong tai duoc anh DICOM tu PACS tai thoi diem dong goi.");
                await w.WriteLineAsync($"StudyInstanceUID: {check.StudyInstanceUid}");
            }

            // 2) Phiếu kết quả chẩn đoán (nếu ca chụp đã có kết luận).
            var report = await BuildReportTextAsync(studyId, check);
            if (!string.IsNullOrWhiteSpace(report))
            {
                var e = zip.CreateEntry("KETQUA/phieu-ket-qua.txt");
                await using var w = new StreamWriter(e.Open(), Encoding.UTF8);
                await w.WriteAsync(report);
            }

            // 3) README hướng dẫn ghi đĩa.
            var readme = zip.CreateEntry("README.txt");
            await using (var w = new StreamWriter(readme.Open(), Encoding.UTF8))
            {
                await w.WriteLineAsync("GOI DU LIEU CA CHUP - GHI DIA CD/DVD");
                await w.WriteLineAsync("=====================================");
                await w.WriteLineAsync($"Benh nhan : {check.PatientName} ({check.PatientCode})");
                await w.WriteLineAsync($"Ngay chup : {check.StudyDate:dd/MM/yyyy}");
                await w.WriteLineAsync($"Dich vu   : {check.StudyDescription} [{check.Modality}]");
                await w.WriteLineAsync($"So series : {check.SeriesCount} - So anh: {check.ImageCount}");
                await w.WriteLineAsync();
                await w.WriteLineAsync("Thu muc DICOM/  : anh goc dinh dang DICOM (mo bang phan mem xem DICOM).");
                await w.WriteLineAsync("Thu muc KETQUA/ : phieu ket qua chan doan.");
                await w.WriteLineAsync();
                await w.WriteLineAsync("Cach ghi dia: giai nen goi nay roi ghi toan bo thu muc ra CD/DVD");
                await w.WriteLineAsync("bang cong cu ghi dia cua he dieu hanh.");
                await w.WriteLineAsync();
                await w.WriteLineAsync($"Xuat luc: {DateTime.Now:dd/MM/yyyy HH:mm:ss}");
            }
        }

        _logger.LogInformation(
            "NangCap26 disc-package: user={UserId} xuat goi ghi dia studyId={StudyId} uid={Uid} patient={PatientCode}",
            userId, studyId, check.StudyInstanceUid, check.PatientCode);

        var safeName = (check.PatientCode ?? "BN").Replace('/', '-').Replace('\\', '-');
        var fileName = $"CD_{safeName}_{check.StudyDate:yyyyMMdd}_{DateTime.Now:HHmmss}.zip";
        return (ms.ToArray(), fileName);
    }

    /// <summary>Tải archive (zip DICOM) của 1 study từ Orthanc. Trả null nếu không lấy được.</summary>
    private async Task<byte[]?> DownloadStudyArchiveAsync(string studyInstanceUid)
    {
        var baseUrl = _configuration["PACS:BaseUrl"];
        if (string.IsNullOrWhiteSpace(baseUrl)) return null;

        try
        {
            using var http = new HttpClient { Timeout = TimeSpan.FromMinutes(5) };
            var user = _configuration["PACS:Username"];
            var pass = _configuration["PACS:Password"];
            if (!string.IsNullOrWhiteSpace(user))
            {
                var token = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{user}:{pass}"));
                http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", token);
            }

            // Orthanc: tìm study theo StudyInstanceUID → lấy internal id → tải archive.
            var findBody = new StringContent(
                $"{{\"Level\":\"Study\",\"Query\":{{\"StudyInstanceUID\":\"{studyInstanceUid}\"}}}}",
                Encoding.UTF8, "application/json");
            var findResp = await http.PostAsync($"{baseUrl.TrimEnd('/')}/tools/find", findBody);
            if (!findResp.IsSuccessStatusCode) return null;

            var ids = System.Text.Json.JsonSerializer.Deserialize<List<string>>(await findResp.Content.ReadAsStringAsync());
            var orthancId = ids?.FirstOrDefault();
            if (string.IsNullOrWhiteSpace(orthancId)) return null;

            var archResp = await http.GetAsync($"{baseUrl.TrimEnd('/')}/studies/{orthancId}/archive");
            if (!archResp.IsSuccessStatusCode) return null;

            return await archResp.Content.ReadAsByteArrayAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "NangCap26 disc-package: khong tai duoc archive tu PACS cho uid={Uid}", studyInstanceUid);
            return null;
        }
    }

    /// <summary>Dựng nội dung phiếu kết quả dạng text để kèm vào đĩa.</summary>
    private async Task<string?> BuildReportTextAsync(Guid studyId, DiscPackageCheckDto info)
    {
        // Kết quả đọc nằm ở RadiologyReport (Findings/Impression), không phải RadiologyExam.
        var examId = await _context.DicomStudies.AsNoTracking()
            .Where(s => s.Id == studyId)
            .Select(s => (Guid?)s.RadiologyExamId)
            .FirstOrDefaultAsync();
        if (examId == null) return null;

        var report = await _context.RadiologyReports.AsNoTracking()
            .Where(r => r.RadiologyExamId == examId.Value && !r.IsDeleted)
            .OrderByDescending(r => r.ReportDate)
            .Select(r => new { r.Findings, r.Impression, r.Recommendations })
            .FirstOrDefaultAsync();
        if (report == null) return null;

        var sb = new StringBuilder();
        sb.AppendLine("PHIEU KET QUA CHAN DOAN HINH ANH");
        sb.AppendLine("================================");
        sb.AppendLine($"Benh nhan : {info.PatientName} ({info.PatientCode})");
        sb.AppendLine($"Ngay chup : {info.StudyDate:dd/MM/yyyy}");
        sb.AppendLine($"Dich vu   : {info.StudyDescription} [{info.Modality}]");
        sb.AppendLine();
        sb.AppendLine("MO TA:");
        sb.AppendLine(report.Findings ?? "(chua co)");
        sb.AppendLine();
        sb.AppendLine("KET LUAN:");
        sb.AppendLine(report.Impression ?? "(chua co)");
        return sb.ToString();
    }
}
