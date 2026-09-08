using System.Net;
using System.Text;
using HIS.Application.DTOs.PatientPortal;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Bản in phiếu kết quả xét nghiệm cho người bệnh (HSMT app I.2 #5 — "xem file kết quả xét nghiệm").
///
/// <para>Trả về <b>HTML in được</b>, đúng cách mọi bản in khác của HIS đang làm (xem
/// <c>InpatientCompleteService.PrintMedicineDisclosureAsync</c>). Không sinh PDF vì HIS chưa có thư
/// viện PDF nào, và thêm một thư viện chỉ cho một phiếu là đổi lấy rủi ro nâng cấp không đáng.</para>
///
/// <para>App mở tệp này trong khung xem web, in ra hoặc gửi cho bác sĩ khác đều được.</para>
/// </summary>
public partial class PatientPortalServiceImpl
{
    public async Task<byte[]> GetLabResultReportAsync(Guid resultId)
    {
        var detail = await GetLabResultAsync(resultId);
        if (detail is null) return Array.Empty<byte>();

        var patient = await _context.ServiceRequestDetails.AsNoTracking()
            .Where(d => d.Id == resultId)
            .Select(d => new
            {
                d.ServiceRequest.MedicalRecord!.Patient!.FullName,
                d.ServiceRequest.MedicalRecord.Patient.PatientCode,
                d.ServiceRequest.MedicalRecord.Patient.DateOfBirth,
                d.ServiceRequest.MedicalRecord.MedicalRecordCode,
            })
            .FirstOrDefaultAsync();

        var html = new StringBuilder();

        html.Append(
            """
            <!DOCTYPE html>
            <html lang="vi"><head><meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Phiếu kết quả xét nghiệm</title>
            <style>
              body { font-family: system-ui, "Segoe UI", Arial, sans-serif; font-size: 14px;
                     color: #111; margin: 16px; }
              h1 { font-size: 18px; text-align: center; margin: 0 0 4px; }
              .sub { text-align: center; color: #555; margin-bottom: 16px; }
              .meta { margin-bottom: 16px; line-height: 1.6; }
              .meta b { display: inline-block; min-width: 130px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #bbb; padding: 6px 8px; text-align: left; }
              th { background: #f2f2f2; }
              td.num { text-align: right; white-space: nowrap; }
              tr.abnormal td { color: #b00020; font-weight: 600; }
              .note { margin-top: 16px; font-size: 12px; color: #555; line-height: 1.5; }
              @media print { body { margin: 0; } }
            </style></head><body>
            """);

        html.Append("<h1>PHIẾU KẾT QUẢ XÉT NGHIỆM</h1>");
        html.Append($"<div class=\"sub\">{Esc(detail.ServiceName ?? detail.OrderCode)}</div>");

        html.Append("<div class=\"meta\">");
        Row(html, "Họ tên", patient?.FullName);
        Row(html, "Mã bệnh nhân", patient?.PatientCode);
        Row(html, "Ngày sinh", patient?.DateOfBirth?.ToString("dd/MM/yyyy"));
        Row(html, "Mã hồ sơ", patient?.MedicalRecordCode);
        Row(html, "Mã phiếu", detail.OrderCode);
        Row(html, "Bác sĩ chỉ định", detail.OrderingDoctor);
        Row(html, "Khoa", detail.Department);
        Row(html, "Ngày trả kết quả", detail.ResultDate?.ToString("HH:mm dd/MM/yyyy"));
        html.Append("</div>");

        if (detail.TestItems is { Count: > 0 })
        {
            html.Append(
                "<table><thead><tr><th>Chỉ số</th><th>Kết quả</th><th>Đơn vị</th>"
                + "<th>Khoảng bình thường</th></tr></thead><tbody>");

            foreach (var item in detail.TestItems)
            {
                var abnormal = item.Flag is "High" or "Low" or "Critical";
                var arrow = item.Flag switch { "High" => " ↑", "Low" => " ↓", "Critical" => " ‼", _ => "" };

                html.Append(abnormal ? "<tr class=\"abnormal\">" : "<tr>");
                html.Append($"<td>{Esc(item.TestName)}</td>");
                html.Append($"<td class=\"num\">{Esc(item.Result)}{arrow}</td>");
                html.Append($"<td>{Esc(item.Unit)}</td>");
                html.Append($"<td>{Esc(item.NormalRange)}</td>");
                html.Append("</tr>");
            }

            html.Append("</tbody></table>");
        }
        else
        {
            html.Append("<p>Phiếu này chưa có chỉ số nào được trả về.</p>");
        }

        // Câu này bắt buộc phải có trên bản in: bản in rời khỏi app rất dễ được đọc một mình, không
        // còn ngữ cảnh nào nhắc người bệnh rằng một chỉ số lệch chưa phải là một chẩn đoán.
        html.Append(
            "<div class=\"note\">Các chỉ số trên chỉ có ý nghĩa khi được bác sĩ đọc cùng tình trạng "
            + "thực tế của người bệnh. Vui lòng không tự chẩn đoán hay tự điều chỉnh thuốc.</div>");

        html.Append("</body></html>");

        return Encoding.UTF8.GetBytes(html.ToString());
    }

    private static void Row(StringBuilder html, string label, string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return;
        html.Append($"<div><b>{Esc(label)}:</b> {Esc(value)}</div>");
    }

    /// <summary>
    /// Thoát ký tự HTML. Tên thuốc và ghi chú của kỹ thuật viên là dữ liệu người dùng nhập — ghép
    /// thẳng vào HTML là mở đường cho kịch bản lạ chạy trong khung xem web của app.
    /// </summary>
    private static string Esc(string? value) => WebUtility.HtmlEncode(value ?? "");
}
