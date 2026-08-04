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

    public async Task<byte[]> PrintExaminationSlipAsync(Guid medicalRecordId)
    {
        var slip = await GetExaminationSlipDataAsync(medicalRecordId);
        var fields = new List<KeyValuePair<string, string>>
        {
            new("Medical Record", slip.MedicalRecordCode),
            new("Patient Code", slip.PatientCode),
            new("Patient Name", slip.PatientName),
            new("Gender", slip.Gender == 1 ? "Male" : slip.Gender == 2 ? "Female" : "Other"),
            new("Age", slip.Age.ToString()),
            new("Admission Date", slip.AdmissionDate.ToString("yyyy-MM-dd HH:mm")),
            new("Queue Number", slip.QueueNumber.ToString()),
            new("Room", slip.RoomName),
            new("Doctor", slip.DoctorName ?? "-"),
            new("Insurance Number", slip.InsuranceNumber ?? "-")
        };

        return BuildSimplePdf("EXAMINATION SLIP", fields);
    }

    public async Task<byte[]> PrintInsuranceCardHoldSlipAsync(Guid documentHoldId)
    {
        var hold = await _context.DocumentHolds.AsNoTracking()
            .Include(x => x.Patient)
            .Include(x => x.MedicalRecord)
            .FirstOrDefaultAsync(x => x.Id == documentHoldId);

        if (hold == null)
            throw new Exception("Document hold not found");

        var fields = new List<KeyValuePair<string, string>>
        {
            new("Patient Code", hold.Patient?.PatientCode ?? "-"),
            new("Patient Name", hold.Patient?.FullName ?? "-"),
            new("Medical Record", hold.MedicalRecord?.MedicalRecordCode ?? "-"),
            new("Document Type", GetDocumentTypeName(hold.DocumentType)),
            new("Document Number", hold.DocumentNumber),
            new("Quantity", hold.Quantity.ToString()),
            new("Hold Date", hold.HoldDate.ToString("yyyy-MM-dd HH:mm")),
            new("Held By", hold.HoldBy),
            new("Status", hold.Status == 0 ? "Holding" : hold.Status == 1 ? "Returned" : "Lost")
        };

        return BuildSimplePdf("INSURANCE/DOCUMENT HOLD RECEIPT", fields);
    }

    public async Task<byte[]> PrintPatientCardAsync(Guid patientId)
    {
        var patient = await _context.Patients.AsNoTracking().FirstOrDefaultAsync(x => x.Id == patientId);
        if (patient == null)
            throw new Exception("Patient not found");

        var latestRecord = await _context.MedicalRecords.AsNoTracking()
            .Include(x => x.Room)
            .Where(x => x.PatientId == patientId)
            .OrderByDescending(x => x.AdmissionDate)
            .FirstOrDefaultAsync();

        var fields = new List<KeyValuePair<string, string>>
        {
            new("Patient Code", patient.PatientCode),
            new("Patient Name", patient.FullName),
            new("Gender", patient.Gender == 1 ? "Male" : patient.Gender == 2 ? "Female" : "Other"),
            new("Date of Birth", patient.DateOfBirth?.ToString("yyyy-MM-dd") ?? "-"),
            new("Phone", patient.PhoneNumber ?? "-"),
            new("Address", patient.Address ?? "-"),
            new("Insurance Number", patient.InsuranceNumber ?? "-"),
            new("Latest Medical Record", latestRecord?.MedicalRecordCode ?? "-"),
            new("Latest Room", latestRecord?.Room?.RoomName ?? "-")
        };

        return BuildSimplePdf("PATIENT CARD", fields);
    }

    public async Task<byte[]> PrintServiceOrderSlipAsync(Guid medicalRecordId)
    {
        var medicalRecord = await _context.MedicalRecords.AsNoTracking()
            .Include(x => x.Patient)
            .FirstOrDefaultAsync(x => x.Id == medicalRecordId);

        if (medicalRecord == null)
            throw new Exception("Medical record not found");

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
            new("Medical Record", medicalRecord.MedicalRecordCode),
            new("Patient Code", medicalRecord.Patient?.PatientCode ?? "-"),
            new("Patient Name", medicalRecord.Patient?.FullName ?? "-"),
            new("Total Requests", serviceRequests.Count.ToString()),
            new("Total Amount", serviceRequests.Sum(x => x.TotalPrice).ToString("N0"))
        };

        var details = serviceRequests.Select(x =>
            $"{x.RequestCode} | {(x.Service?.ServiceName ?? "-")} | Qty: {x.Quantity} | Amount: {x.TotalPrice:N0}");

        return BuildSimplePdf("SERVICE ORDER SLIP", fields, details);
    }

    public async Task<ExaminationSlipDto> GetExaminationSlipDataAsync(Guid medicalRecordId)
    {
        var record = await _context.MedicalRecords.AsNoTracking()
            .Include(m => m.Patient)
            .Include(m => m.Room)
            .Include(m => m.Doctor)
            .FirstOrDefaultAsync(m => m.Id == medicalRecordId);

        if (record == null) throw new Exception("Medical record not found");

        var examination = await _context.Examinations.AsNoTracking()
            .FirstOrDefaultAsync(e => e.MedicalRecordId == medicalRecordId);

        return new ExaminationSlipDto
        {
            HospitalName = "BENH VIEN",
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

        var fields = new List<KeyValuePair<string, string>>
        {
            new("Số thứ tự", ticket.TicketNumber),
            new("Loại", queueTypeName),
            new("Phòng", room?.RoomName ?? "-"),
            new("Vị trí", roomLocation),
            new("Khoa", room?.Department?.DepartmentName ?? "-"),
            new("Mã BN", patient?.PatientCode ?? "-"),
            new("Họ tên", patient?.FullName ?? "-"),
            new("Đối tượng", ticket.QueueType == 1 ? "Tiếp đón" : "Khám bệnh"),
            new("Thời gian chờ ước tính", estimatedWait > 0 ? $"~{estimatedWait} phút" : "Không có người chờ"),
            new("Ngày giờ", ticket.IssueDate.ToString("dd/MM/yyyy HH:mm"))
        };

        if (!string.IsNullOrEmpty(priorityName))
        {
            fields.Insert(2, new KeyValuePair<string, string>("Ưu tiên", priorityName));
        }

        IEnumerable<string>? details = null;
        if (clsLocationLines.Count > 0)
        {
            var locationDetails = new List<string> { "=== VỊ TRÍ PHÒNG CẬN LÂM SÀNG ===" };
            locationDetails.AddRange(clsLocationLines);
            details = locationDetails;
        }

        return BuildSimplePdf("PHIẾU SỐ THỨ TỰ", fields, details);
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
