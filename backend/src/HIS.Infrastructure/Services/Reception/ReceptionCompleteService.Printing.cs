using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Insurance;
using HIS.Application.DTOs.Reception;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Common;
using HIS.Infrastructure.Configuration;
using HIS.Infrastructure.Data;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using iText.IO.Font.Constants;
using iText.Kernel.Font;
using iText.Kernel.Pdf;
using iText.Layout;
using iText.Layout.Properties;
using iText.Barcodes;
using IxPageSize = iText.Kernel.Geom.PageSize;
using QueueDailyStatisticsDto = HIS.Application.DTOs.Reception.QueueDailyStatisticsDto;
using AverageWaitingTimeDto = HIS.Application.DTOs.Reception.AverageWaitingTimeDto;
using QueueReportRequestDto = HIS.Application.DTOs.Reception.QueueReportRequestDto;
using QueueConfigurationDto = HIS.Application.DTOs.Reception.QueueConfigurationDto;


namespace HIS.Infrastructure.Services;

// K9 phien 3 (2026-05-30): tach 1.14 Printing (~332 dong) khoi ReceptionCompleteService.
public partial class ReceptionCompleteService {
    #region 1.14 Printing

    // Phiếu in trao tay người bệnh Việt Nam ⇒ nhãn + định dạng ngày phải tiếng Việt.
    // (Trước đây 4 phiếu dưới đây in ra toàn tiếng Anh "EXAMINATION SLIP / Patient Name…".)
    private const string VnDateTime = "dd/MM/yyyy HH:mm";
    private const string VnDate = "dd/MM/yyyy";

    private static string GenderName(int gender) =>
        gender == 1 ? "Nam" : gender == 2 ? "Nữ" : "Khác";

    /// <summary>
    /// Tem giấy nhiệt hẹp ⇒ bỏ hẳn dòng rỗng thay vì in "-" cho tốn giấy.
    /// Giữ lại dòng đầu (thường là họ tên) để tem không bao giờ trống thông tin định danh.
    /// </summary>
    private static List<KeyValuePair<string, string>> CompactRows(List<KeyValuePair<string, string>> rows) =>
        rows.Where((r, i) => i == 0 || !string.IsNullOrWhiteSpace(r.Value) && r.Value != "-").ToList();

    public async Task<byte[]> PrintExaminationSlipAsync(Guid medicalRecordId)
    {
        var slip = await GetExaminationSlipDataAsync(medicalRecordId);
        var fields = new List<KeyValuePair<string, string>>
        {
            new("Họ và tên", slip.PatientName),
            new("Giới tính / Tuổi", $"{GenderName(slip.Gender)} · {slip.Age}"),
            new("Số bệnh án", slip.MedicalRecordCode),
            new("Ngày tiếp nhận", slip.AdmissionDate.ToString(VnDateTime)),
            new("Phòng khám", slip.RoomName),
            new("Bác sĩ", slip.DoctorName ?? "-"),
            new("Số thẻ BHYT", slip.InsuranceNumber ?? "-")
        };

        return BuildThermalSlipPdf(
            title: "PHIẾU KHÁM BỆNH",
            // STT là thứ người bệnh nhìn nhiều nhất khi ngồi chờ ⇒ đưa lên cỡ lớn.
            bigValue: slip.QueueNumber > 0 ? $"STT: {slip.QueueNumber}" : null,
            banner: null,
            subtitle: null,
            barcodeValue: slip.PatientCode,
            rows: CompactRows(fields),
            emphasizeRowKey: "Họ và tên");
    }

    public async Task<byte[]> PrintInsuranceCardHoldSlipAsync(Guid documentHoldId)
    {
        var hold = await _context.DocumentHolds.AsNoTracking()
            .Include(x => x.Patient)
            .Include(x => x.MedicalRecord)
            .FirstOrDefaultAsync(x => x.Id == documentHoldId);

        if (hold == null)
            throw new KeyNotFoundException("Document hold not found");

        var fields = new List<KeyValuePair<string, string>>
        {
            new("Mã bệnh nhân", hold.Patient?.PatientCode ?? "-"),
            new("Họ và tên", hold.Patient?.FullName ?? "-"),
            new("Số bệnh án", hold.MedicalRecord?.MedicalRecordCode ?? "-"),
            new("Loại giấy tờ", GetDocumentTypeName(hold.DocumentType)),
            new("Số giấy tờ", hold.DocumentNumber),
            new("Số lượng", hold.Quantity.ToString()),
            new("Ngày giữ", hold.HoldDate.ToString(VnDateTime)),
            new("Người giữ", hold.HoldBy),
            new("Trạng thái", hold.Status == 0 ? "Đang giữ" : hold.Status == 1 ? "Đã trả" : "Thất lạc")
        };

        return BuildThermalSlipPdf(
            title: "BIÊN NHẬN GIỮ GIẤY TỜ",
            bigValue: null,
            banner: null,
            subtitle: null,
            barcodeValue: hold.Patient?.PatientCode,
            rows: CompactRows(fields),
            emphasizeRowKey: "Họ và tên",
            notes: new List<string> { "Người bệnh giữ biên nhận này để nhận lại giấy tờ." });
    }

    public async Task<byte[]> PrintPatientCardAsync(Guid patientId)
    {
        var patient = await _context.Patients.AsNoTracking().FirstOrDefaultAsync(x => x.Id == patientId);
        if (patient == null)
            throw new KeyNotFoundException("Patient not found");

        var latestRecord = await _context.MedicalRecords.AsNoTracking()
            .Include(x => x.Room)
            .Where(x => x.PatientId == patientId)
            .OrderByDescending(x => x.AdmissionDate)
            .FirstOrDefaultAsync();

        var fields = new List<KeyValuePair<string, string>>
        {
            new("Mã bệnh nhân", patient.PatientCode),
            new("Họ và tên", patient.FullName),
            new("Giới tính", GenderName(patient.Gender)),
            new("Ngày sinh", patient.DateOfBirth?.ToString(VnDate) ?? "-"),
            new("Điện thoại", patient.PhoneNumber ?? "-"),
            new("Địa chỉ", patient.Address ?? "-"),
            new("Số thẻ BHYT", patient.InsuranceNumber ?? "-"),
            new("Bệnh án gần nhất", latestRecord?.MedicalRecordCode ?? "-"),
            new("Phòng gần nhất", latestRecord?.Room?.RoomName ?? "-")
        };

        return BuildThermalSlipPdf(
            title: "THẺ BỆNH NHÂN",
            bigValue: null,
            banner: null,
            subtitle: null,
            barcodeValue: patient.PatientCode,
            rows: CompactRows(fields),
            emphasizeRowKey: "Họ và tên");
    }

    public async Task<byte[]> PrintServiceOrderSlipAsync(Guid medicalRecordId)
    {
        var medicalRecord = await _context.MedicalRecords.AsNoTracking()
            .Include(x => x.Patient)
            .FirstOrDefaultAsync(x => x.Id == medicalRecordId);

        if (medicalRecord == null)
            throw new KeyNotFoundException("Medical record not found");

        List<ServiceRequest> serviceRequests;
        try
        {
            serviceRequests = await _context.ServiceRequests.AsNoTracking()
                .Include(x => x.Service)
                .Where(x => x.MedicalRecordId == medicalRecordId)
                .OrderByDescending(x => x.RequestDate)
                .Take(20)
                .ToListAsync();
        }
        catch
        {
            // Fallback for environments where service-order schema is incomplete.
            serviceRequests = new List<ServiceRequest>();
        }

        var fields = new List<KeyValuePair<string, string>>
        {
            new("Số bệnh án", medicalRecord.MedicalRecordCode),
            new("Mã bệnh nhân", medicalRecord.Patient?.PatientCode ?? "-"),
            new("Họ và tên", medicalRecord.Patient?.FullName ?? "-"),
            new("Số dịch vụ chỉ định", serviceRequests.Count.ToString()),
            new("Tổng tiền", serviceRequests.Sum(x => x.TotalPrice).ToString("N0") + " đ")
        };

        // Tem hẹp 80mm: mỗi dịch vụ xuống dòng riêng thay vì nhồi 1 dòng dài rồi bị ngắt xấu.
        var details = serviceRequests
            .Select(x => $"• {(x.Service?.ServiceName ?? "-")}  (SL {x.Quantity} · {x.TotalPrice:N0} đ)")
            .ToList();

        return BuildThermalSlipPdf(
            title: "PHIẾU CHỈ ĐỊNH DỊCH VỤ",
            bigValue: null,
            banner: null,
            subtitle: null,
            barcodeValue: medicalRecord.Patient?.PatientCode,
            rows: CompactRows(fields),
            emphasizeRowKey: "Họ và tên",
            sectionHeading: details.Count > 0 ? "DANH SÁCH DỊCH VỤ" : null,
            sectionLines: details);
    }

    public async Task<ExaminationSlipDto> GetExaminationSlipDataAsync(Guid medicalRecordId)
    {
        var record = await _context.MedicalRecords.AsNoTracking()
            .Include(m => m.Patient)
            .Include(m => m.Room)
            .Include(m => m.Doctor)
            .FirstOrDefaultAsync(m => m.Id == medicalRecordId);

        if (record == null) throw new KeyNotFoundException("Medical record not found");

        var examination = await _context.Examinations.AsNoTracking()
            .FirstOrDefaultAsync(e => e.MedicalRecordId == medicalRecordId);

        return new ExaminationSlipDto
        {
            // Tên bệnh viện thật lấy từ cấu hình triển khai (SystemConfig 'HospitalName' /
            // env VITE_HOSPITAL_NAME phía FE); ở đây chỉ là nhãn mặc định khi chưa cấu hình.
            HospitalName = "BỆNH VIỆN",
            MedicalRecordCode = record.MedicalRecordCode,
            QueueNumber = examination?.QueueNumber ?? 0,
            AdmissionDate = record.AdmissionDate,
            PatientCode = record.Patient.PatientCode,
            PatientName = record.Patient.FullName,
            Gender = record.Patient.Gender,
            Age = record.Patient.DateOfBirth.HasValue
                ? DateTime.Today.Year - record.Patient.DateOfBirth.Value.Year
                : record.Patient.YearOfBirth.HasValue
                    ? DateTime.Today.Year - record.Patient.YearOfBirth.Value
                    : 0,
            Address = record.Patient.Address,
            PatientType = record.PatientType,
            InsuranceNumber = record.InsuranceNumber,
            RoomName = record.Room?.RoomName ?? "",
            DoctorName = record.Doctor?.FullName
        };
    }

    public async Task<byte[]> PrintQueueTicketAsync(Guid ticketId)
    {
        var ticket = await _context.QueueTickets.AsNoTracking()
            .Include(t => t.Patient)
            .Include(t => t.Room)
                .ThenInclude(r => r!.Department)
            .FirstOrDefaultAsync(t => t.Id == ticketId);

        if (ticket == null)
            return Array.Empty<byte>();

        var room = ticket.Room;
        var patient = ticket.Patient;
        var estimatedWait = await CalculateEstimatedWaitAsync(ticket.RoomId ?? Guid.Empty, ticket.QueueType);

        // Build CLS location info: next steps after exam (lab, radiology, pharmacy, billing)
        var clsLocationLines = new List<string>();
        if (ticket.MedicalRecordId.HasValue)
        {
            var serviceRequests = await _context.ServiceRequests.AsNoTracking()
                .Include(sr => sr.Room)
                .Where(sr => sr.MedicalRecordId == ticket.MedicalRecordId && sr.Status < 2)
                .OrderBy(sr => sr.RequestDate)
                .ToListAsync();

            foreach (var sr in serviceRequests)
            {
                var srRoom = sr.Room;
                if (srRoom != null)
                {
                    var loc = new List<string>();
                    if (!string.IsNullOrEmpty(srRoom.Building)) loc.Add($"Tòa {srRoom.Building}");
                    if (!string.IsNullOrEmpty(srRoom.Floor)) loc.Add($"Tầng {srRoom.Floor}");
                    if (!string.IsNullOrEmpty(srRoom.Location)) loc.Add(srRoom.Location);
                    var locationStr = loc.Count > 0 ? string.Join(", ", loc) : "";
                    clsLocationLines.Add($"{srRoom.RoomName} - {locationStr}");
                }
            }
        }

        // Build queue type name
        var queueTypeName = ticket.QueueType switch
        {
            1 => "Tiếp đón",
            2 => "Khám bệnh",
            3 => "Xét nghiệm",
            4 => "CĐHA",
            5 => "Nhà thuốc",
            6 => "Thanh toán",
            _ => "Khác"
        };

        var priorityName = ticket.Priority switch
        {
            1 => "ƯU TIÊN",
            2 => "CẤP CỨU",
            _ => ""
        };

        // Room location
        var roomLocation = "";
        if (room != null)
        {
            var parts = new List<string>();
            if (!string.IsNullOrEmpty(room.Building)) parts.Add($"Tòa {room.Building}");
            if (!string.IsNullOrEmpty(room.Floor)) parts.Add($"Tầng {room.Floor}");
            if (!string.IsNullOrEmpty(room.Location)) parts.Add(room.Location);
            roomLocation = parts.Count > 0 ? string.Join(", ", parts) : "";
        }

        // Năm sinh: ưu tiên ngày sinh đầy đủ, không có thì lấy năm.
        var birth = patient?.DateOfBirth?.Year.ToString()
            ?? patient?.YearOfBirth?.ToString()
            ?? "-";

        var rows = new List<KeyValuePair<string, string>>
        {
            new("Tên bệnh nhân", patient?.FullName ?? "-"),
            new("Năm sinh", birth),
            new("Điện thoại", string.IsNullOrWhiteSpace(patient?.PhoneNumber) ? "-" : patient!.PhoneNumber!),
            new("Địa chỉ", string.IsNullOrWhiteSpace(patient?.Address) ? "-" : patient!.Address!),
            // Phòng + khoa là thứ người bệnh cần để biết đi đâu — giữ lại dù mẫu tham chiếu không có.
            new("Phòng khám", string.IsNullOrEmpty(roomLocation)
                ? (room?.RoomName ?? "-")
                : $"{room?.RoomName ?? "-"} ({roomLocation})"),
            new("Khoa", room?.Department?.DepartmentName ?? "-"),
            new("Ngày khám", ticket.IssueDate.ToString("dd/MM/yyyy HH:mm")),
        };

        // Tem giấy nhiệt: bỏ hẳn dòng không có dữ liệu thay vì in "-" (vé lấy số ở quầy CLS
        // không gắn phòng khám/khoa ⇒ trước đây tốn 2 dòng trống). Luôn giữ dòng tên bệnh nhân.
        rows = rows
            .Where(r => r.Key == "Tên bệnh nhân" || r.Value != "-")
            .ToList();

        var notes = new List<string>();
        if (estimatedWait > 0) notes.Add($"Thời gian chờ ước tính: ~{estimatedWait} phút");

        return BuildThermalSlipPdf(
            title: "PHIẾU ĐĂNG KÝ KHÁM BỆNH",
            bigValue: $"STT: {ticket.TicketNumber}",
            banner: priorityName,
            subtitle: queueTypeName,
            barcodeValue: patient?.PatientCode,
            rows: rows,
            emphasizeRowKey: "Tên bệnh nhân",
            notes: notes,
            sectionHeading: clsLocationLines.Count > 0 ? "PHÒNG CẬN LÂM SÀNG" : null,
            sectionLines: clsLocationLines);
    }

    /// <summary>
    /// Tem số thứ tự khổ giấy nhiệt 80mm (chuẩn máy in bill quầy tiếp đón), KHÔNG dùng
    /// <c>BuildSimplePdf</c> khổ A4 nữa: phiếu cũ in ra nguyên tờ A4 cho vài dòng chữ.
    /// Bố cục: tiêu đề nhỏ → STT cỡ lớn → mã vạch mã BN → bảng thông tin → ghi chú chờ.
    /// Chiều cao trang tính bằng 2 lượt render (lượt 1 đo chỗ thật sự dùng) nên tem cắt sát
    /// nội dung — ước lượng tay sẽ hoặc phí giấy, hoặc tràn sang tem thứ hai.
    /// </summary>
    private static byte[] BuildThermalSlipPdf(
        string title,
        string? bigValue,
        string? banner,
        string? subtitle,
        string? barcodeValue,
        List<KeyValuePair<string, string>> rows,
        string? emphasizeRowKey = null,
        List<string>? notes = null,
        string? sectionHeading = null,
        List<string>? sectionLines = null)
    {
        const float rollWidth = 226.77f;   // 80mm
        const float margin = 8f;
        const float probeHeight = 2000f;   // trang nháp đủ cao để không ngắt trang khi ĐO

        var contentHeight = MeasureContentHeight();
        // Chặn dưới để tem quá ngắn không bị dao cắt ăn vào chữ.
        var pageHeight = Math.Max(160f, contentHeight + 2 * margin);
        return Render(pageHeight);

        // Lượt 1: vẽ lên trang nháp rất cao rồi hỏi renderer còn trống bao nhiêu.
        float MeasureContentHeight()
        {
            using var ms = new MemoryStream();
            using var writer = new PdfWriter(ms);
            using var pdf = new PdfDocument(writer);
            pdf.SetDefaultPageSize(new IxPageSize(rollWidth, probeHeight));
            var doc = new Document(pdf);
            doc.SetMargins(margin, margin, margin, margin);
            Compose(doc, pdf);

            // BBox vùng-còn-lại giữ nguyên đáy, chỉ TỤT CHIỀU CAO khi phần tử được thêm vào
            // ⇒ phải đo bằng GetHeight(), không phải GetY().
            var remaining = doc.GetRenderer().GetCurrentArea().GetBBox().GetHeight();
            doc.Close();
            return (probeHeight - 2 * margin) - remaining;
        }

        byte[] Render(float pageHeight)
        {
            using var ms = new MemoryStream();
            using var writer = new PdfWriter(ms);
            using var pdf = new PdfDocument(writer);
            pdf.SetDefaultPageSize(new IxPageSize(rollWidth, pageHeight));
            var doc = new Document(pdf);
            doc.SetMargins(margin, margin, margin, margin);
            Compose(doc, pdf);
            doc.Close();
            return ms.ToArray();
        }

        void Compose(Document doc, PdfDocument pdf)
        {
            var bold = VietnamesePdfFonts.Bold();
            var regular = VietnamesePdfFonts.Regular();
            var contentWidth = rollWidth - 2 * margin;

            doc.Add(new iText.Layout.Element.Paragraph(title)
                .SetFont(bold).SetFontSize(9).SetTextAlignment(TextAlignment.CENTER)
                .SetMargin(0).SetMultipliedLeading(1f));

            if (!string.IsNullOrEmpty(banner))
            {
                doc.Add(new iText.Layout.Element.Paragraph(banner)
                    .SetFont(bold).SetFontSize(10).SetTextAlignment(TextAlignment.CENTER)
                    .SetMarginTop(2).SetMarginBottom(0).SetMultipliedLeading(1f));
            }

            if (!string.IsNullOrEmpty(bigValue))
            {
                doc.Add(new iText.Layout.Element.Paragraph(bigValue)
                    .SetFont(bold).SetFontSize(26).SetTextAlignment(TextAlignment.CENTER)
                    .SetMarginTop(2).SetMarginBottom(2).SetMultipliedLeading(1f));
            }

            if (!string.IsNullOrEmpty(subtitle))
            {
                doc.Add(new iText.Layout.Element.Paragraph(subtitle)
                    .SetFont(regular).SetFontSize(8).SetTextAlignment(TextAlignment.CENTER)
                    .SetMargin(0).SetMultipliedLeading(1f));
            }

            // Mã vạch để quầy quét lại, giống mẫu tham chiếu.
            if (!string.IsNullOrWhiteSpace(barcodeValue))
            {
                const float quietZone = 10f;
                var maxBarWidth = contentWidth - 2 * quietZone;
                var barcode = new Barcode128(pdf);
                barcode.SetCode(barcodeValue);
                barcode.SetFont(regular);
                barcode.SetSize(6f);
                barcode.SetBarHeight(26f);
                barcode.SetCodeType(Barcode128.CODE128);
                barcode.SetX(1.0f);
                var measured = barcode.GetBarcodeSize().GetWidth();
                if (measured > maxBarWidth) barcode.SetX(1.0f * maxBarWidth / measured);

                doc.Add(new iText.Layout.Element.Image(barcode.CreateFormXObject(pdf))
                    .SetHorizontalAlignment(HorizontalAlignment.CENTER)
                    .SetMarginTop(4).SetMarginBottom(2));
            }

            var table = new iText.Layout.Element.Table(
                iText.Layout.Properties.UnitValue.CreatePercentArray(new float[] { 38, 62 }))
                .UseAllAvailableWidth();

            foreach (var r in rows)
            {
                // Dòng trọng tâm (thường là tên bệnh nhân) in đậm + to hơn — thứ nhân viên gọi
                // và người bệnh tự đối chiếu.
                var isName = emphasizeRowKey != null && r.Key == emphasizeRowKey;
                table.AddCell(new iText.Layout.Element.Cell()
                    .Add(new iText.Layout.Element.Paragraph(r.Key)
                        .SetFont(regular).SetFontSize(7.5f).SetMargin(0).SetMultipliedLeading(1.1f))
                    .SetPadding(3).SetVerticalAlignment(VerticalAlignment.MIDDLE));
                table.AddCell(new iText.Layout.Element.Cell()
                    .Add(new iText.Layout.Element.Paragraph(r.Value)
                        .SetFont(isName ? bold : regular)
                        .SetFontSize(isName ? 11f : 8f)
                        .SetMargin(0).SetMultipliedLeading(1.1f))
                    .SetPadding(3).SetVerticalAlignment(VerticalAlignment.MIDDLE));
            }
            doc.Add(table);

            if (notes is { Count: > 0 })
            {
                foreach (var line in notes)
                {
                    doc.Add(new iText.Layout.Element.Paragraph(line)
                        .SetFont(regular).SetFontSize(7.5f).SetTextAlignment(TextAlignment.CENTER)
                        .SetMarginTop(4).SetMarginBottom(0).SetMultipliedLeading(1.1f));
                }
            }

            if (sectionLines is { Count: > 0 })
            {
                if (!string.IsNullOrEmpty(sectionHeading))
                {
                    doc.Add(new iText.Layout.Element.Paragraph(sectionHeading)
                        .SetFont(bold).SetFontSize(7.5f).SetTextAlignment(TextAlignment.CENTER)
                        .SetMarginTop(4).SetMarginBottom(1).SetMultipliedLeading(1.1f));
                }
                foreach (var line in sectionLines)
                {
                    doc.Add(new iText.Layout.Element.Paragraph(line)
                        .SetFont(regular).SetFontSize(7f).SetTextAlignment(TextAlignment.LEFT)
                        .SetMargin(0).SetMultipliedLeading(1.1f));
                }
            }
        }
    }

    /// <summary>
    /// In nhãn mã vạch Code128 để dán lên HSBA giấy (NangCap18 Mù Cang Chải).
    /// Kích thước nhãn: 60mm x 30mm (chuẩn máy in Zebra ZD230 / Brother QL-800).
    /// </summary>
    public async Task<byte[]> PrintMedicalRecordBarcodeAsync(Guid medicalRecordId)
    {
        // Accept either a MedicalRecord ID, or an Examination ID and resolve
        // to its parent MR — caller pages sometimes only have one or the other.
        var mr = await _context.MedicalRecords.AsNoTracking()
            .Include(m => m.Patient)
            .Include(m => m.Department)
            .FirstOrDefaultAsync(m => m.Id == medicalRecordId);

        if (mr == null)
        {
            var exam = await _context.Examinations.AsNoTracking()
                .Include(e => e.MedicalRecord!).ThenInclude(m => m.Patient)
                .Include(e => e.MedicalRecord!).ThenInclude(m => m.Department)
                .FirstOrDefaultAsync(e => e.Id == medicalRecordId);
            mr = exam?.MedicalRecord;
        }

        if (mr == null) return Array.Empty<byte>();

        using var memoryStream = new MemoryStream();
        using var writer = new PdfWriter(memoryStream);
        using var pdf = new PdfDocument(writer);

        // Label size: 60mm x 30mm => ~170pt x 85pt (1mm ≈ 2.83pt)
        var labelSize = new IxPageSize(170, 85);
        pdf.SetDefaultPageSize(labelSize);
        using var document = new Document(pdf);
        document.SetMargins(4, 6, 4, 6);

        var bold = VietnamesePdfFonts.Bold();
        var regular = VietnamesePdfFonts.Regular();

        var code = mr.MedicalRecordCode ?? "-";
        // Nhãn 60x30mm = 170x85pt, trừ lề còn 158x77pt. Chỗ đứng rất chật: mọi Paragraph phải
        // ghim margin 0 + leading 1.0, nếu không margin/leading mặc định của iText đẩy dòng cuối
        // sang TRANG 2 (bản cũ đã bị vậy — mỗi bệnh nhân in ra 2 nhãn).
        const float usableWidth = 158f;
        const float qrSize = 32f;          // 11,3mm -> 0,39mm/module, điện thoại quét thoải mái
        const float qrColWidth = qrSize + 2f;
        const float textColWidth = usableWidth - qrColWidth;

        // Hàng trên: mã HSBA + tên BN bên trái, QR bên phải.
        // Thêm QR vì camera điện thoại quét mã 1D rất kém (nhất là chụp từ màn hình),
        // còn súng quét của quầy vẫn dùng Code128 bên dưới như cũ.
        var dobStr = mr.Patient?.DateOfBirth?.ToString("dd/MM/yyyy") ?? "";
        var name = mr.Patient?.FullName ?? "-";
        var infoLine = string.IsNullOrEmpty(dobStr) ? name : $"{name} {dobStr}";
        // Cắt theo BỀ RỘNG THẬT của font, không theo số ký tự: tên dài sẽ xuống dòng làm cao
        // thêm ô và lại tràn trang.
        while (infoLine.Length > 1 && regular.GetWidth(infoLine, 7f) > textColWidth - 2f)
        {
            infoLine = infoLine.Substring(0, infoLine.Length - 2) + "…";
        }

        var headerTable = new iText.Layout.Element.Table(new float[] { textColWidth, qrColWidth });
        var textCell = new iText.Layout.Element.Cell()
            .SetBorder(iText.Layout.Borders.Border.NO_BORDER)
            .SetPadding(0)
            .SetVerticalAlignment(VerticalAlignment.MIDDLE);
        textCell.Add(new iText.Layout.Element.Paragraph(code)
            .SetFont(bold)
            .SetFontSize(11)
            .SetMargin(0)
            .SetMultipliedLeading(1f));
        textCell.Add(new iText.Layout.Element.Paragraph(infoLine)
            .SetFont(regular)
            .SetFontSize(7)
            .SetMargin(0)
            .SetMultipliedLeading(1f));
        headerTable.AddCell(textCell);

        var qr = new BarcodeQRCode(code);
        var qrCell = new iText.Layout.Element.Cell()
            .SetBorder(iText.Layout.Borders.Border.NO_BORDER)
            .SetPadding(0);
        qrCell.Add(new iText.Layout.Element.Image(qr.CreateFormXObject(pdf))
            .SetWidth(qrSize).SetHeight(qrSize));
        headerTable.AddCell(qrCell);
        document.Add(headerTable);

        // Barcode: Code128 encoding the MR code.
        // X mặc định của iText là 0.8pt (0,28mm) — đạt chuẩn tối thiểu nhưng quá mảnh cho camera
        // điện thoại. Nâng lên 1.0pt (0,35mm) và co lại nếu mã dài, để luôn giữ quiet zone hai bên.
        const float quietZone = 12f; // ≈4,2mm mỗi bên; Code128 yêu cầu ≥10 lần bề rộng module
        var maxBarcodeWidth = usableWidth - 2 * quietZone;
        var barcode = new Barcode128(pdf);
        barcode.SetCode(code);
        barcode.SetFont(regular);
        barcode.SetSize(6f);
        barcode.SetBarHeight(24f);
        barcode.SetCodeType(Barcode128.CODE128);
        barcode.SetX(1.0f);
        var measuredWidth = barcode.GetBarcodeSize().GetWidth();
        if (measuredWidth > maxBarcodeWidth)
        {
            barcode.SetX(1.0f * maxBarcodeWidth / measuredWidth);
        }
        var barcodeImage = new iText.Layout.Element.Image(barcode.CreateFormXObject(pdf))
            .SetHorizontalAlignment(HorizontalAlignment.CENTER)
            .SetMargins(1, 0, 0, 0);
        document.Add(barcodeImage);

        // Line 3: department + print date (small)
        var dept = mr.Department?.DepartmentName ?? "-";
        var printedAt = DateTime.Now.ToString("dd/MM/yyyy HH:mm");
        document.Add(new iText.Layout.Element.Paragraph($"{dept} · {printedAt}")
            .SetFont(regular)
            .SetFontSize(6)
            .SetTextAlignment(TextAlignment.CENTER)
            .SetMargin(0)
            .SetMultipliedLeading(1f));

        document.Close();
        return memoryStream.ToArray();
    }

    #endregion
}
