using HIS.Application.DTOs.PatientPortal;
using HIS.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Nội trú cho cổng bệnh nhân (HSMT app I.2 #6 — GAP 31, 32, 33, 34).
///
/// Trước đây bệnh nhân không có đường nào để: liệt kê đợt nằm viện của mình (31), xem bảng công khai
/// thuốc dưới dạng dữ liệu thay vì bản in (32), lọc kết quả cận lâm sàng theo đợt điều trị (33), hay
/// biết số thứ tự thực hiện của một chỉ định (34).
/// </summary>
public partial class PatientPortalServiceImpl
{
    public async Task<List<PortalAdmissionDto>> GetAdmissionsAsync(Guid patientId)
    {
        var admissions = await _context.Admissions.AsNoTracking()
            .Include(a => a.MedicalRecord)
            .Include(a => a.Department)
            .Include(a => a.Room)
            .Include(a => a.Bed)
            .Include(a => a.AdmittingDoctor)
            .Include(a => a.Discharge)
            .Where(a => a.PatientId == patientId && !a.IsDeleted)
            .OrderByDescending(a => a.AdmissionDate)
            .Take(20)
            .ToListAsync();

        return admissions.Select(a =>
        {
            var dischargeDate = a.Discharge?.DischargeDate;
            return new PortalAdmissionDto
            {
                Id = a.Id,
                MedicalRecordId = a.MedicalRecordId,
                MedicalRecordCode = a.MedicalRecord?.MedicalRecordCode ?? "",
                AdmissionDate = a.AdmissionDate,
                DischargeDate = dischargeDate,
                // Đợt còn đang điều trị thì đếm tới hôm nay — người bệnh muốn biết "đã nằm mấy ngày
                // rồi", không phải một ô trống.
                DaysOfStay = Math.Max(0, ((dischargeDate ?? DateTime.Now) - a.AdmissionDate).Days),
                DepartmentName = a.Department?.DepartmentName ?? "",
                RoomName = a.Room?.RoomName ?? "",
                BedName = a.Bed?.BedName ?? "",
                AdmittingDoctorName = a.AdmittingDoctor?.FullName ?? "",
                ReasonForAdmission = a.ReasonForAdmission ?? "",
                DiagnosisOnAdmission = a.DiagnosisOnAdmission ?? "",
                DischargeDiagnosis = a.Discharge?.DischargeDiagnosis ?? "",
                Status = a.Status,
                StatusName = DescribeAdmissionStatus(a.Status),
                IsInProgress = a.Status == 0,
            };
        }).ToList();
    }

    /// <summary>Từ vựng theo <c>HIS.Core.Constants.AdmissionStatus</c>.</summary>
    private static string DescribeAdmissionStatus(int status) => status switch
    {
        0 => "Đang điều trị",
        1 => "Đã ra viện",
        2 => "Chuyển viện",
        3 => "Tử vong",
        4 => "Xin về",
        5 => "Đã chuyển khoa",
        6 => "Chờ ra viện",
        _ => "",
    };

    // ------------------------------------------------- công khai thuốc (GAP 32)

    public async Task<PortalMedicineDisclosureDto> GetMedicineDisclosureAsync(Guid patientId, Guid admissionId)
    {
        var medicalRecordId = await ResolveAdmissionRecordAsync(patientId, admissionId);
        if (medicalRecordId is null) return null!;

        // PrescriptionType = 2 là đơn nội trú — cùng điều kiện mà bản in DD.09/BV-01 đang dùng, để
        // con số trên app và con số trên giấy không bao giờ lệch nhau.
        var details = await _context.PrescriptionDetails.AsNoTracking()
            .Include(d => d.Medicine)
            .Include(d => d.Prescription)
            .Where(d => d.Prescription.MedicalRecordId == medicalRecordId
                        && d.Prescription.PrescriptionType == 2
                        && !d.IsDeleted)
            .OrderBy(d => d.Prescription.PrescriptionDate)
            .ToListAsync();

        var items = details.Select(d => new PortalMedicineDisclosureItemDto
        {
            PrescriptionDate = d.Prescription.PrescriptionDate,
            MedicineCode = d.Medicine?.MedicineCode ?? "",
            MedicineName = d.Medicine?.MedicineName ?? "",
            ActiveIngredient = d.Medicine?.ActiveIngredient ?? "",
            Unit = d.Unit ?? d.Medicine?.Unit ?? "",
            Quantity = d.Quantity,
            UnitPrice = d.UnitPrice,
            Amount = d.Amount,
            PaymentSourceName = d.PatientType switch { 1 => "BHYT", 2 => "Viện phí", _ => "Khác" },
            Dosage = d.Dosage ?? "",
            Frequency = d.Frequency ?? "",
            UsageInstructions = d.UsageInstructions ?? "",
        }).ToList();

        return new PortalMedicineDisclosureDto
        {
            AdmissionId = admissionId,
            FromDate = items.Count == 0 ? null : items.First().PrescriptionDate,
            ToDate = items.Count == 0 ? null : items.Last().PrescriptionDate,
            Items = items,
            TotalAmount = details.Sum(d => d.Amount),
            InsuranceAmount = details.Sum(d => d.InsuranceAmount),
            PatientAmount = details.Sum(d => d.PatientAmount),
        };
    }

    // ----------------------------------------- chỉ định cận lâm sàng (GAP 34)

    public async Task<List<PortalServiceOrderDto>> GetServiceOrdersAsync(Guid patientId, Guid admissionId)
    {
        var medicalRecordId = await ResolveAdmissionRecordAsync(patientId, admissionId);
        if (medicalRecordId is null) return new List<PortalServiceOrderDto>();

        var details = await _context.ServiceRequestDetails.AsNoTracking()
            .Include(d => d.Service)
            .Include(d => d.ServiceRequest).ThenInclude(r => r.Doctor)
            .Include(d => d.ServiceRequest).ThenInclude(r => r.ExecuteRoom)
            .Where(d => d.ServiceRequest.MedicalRecordId == medicalRecordId && !d.IsDeleted)
            .OrderByDescending(d => d.ServiceRequest.RequestDate)
            .Take(100)
            .ToListAsync();

        if (details.Count == 0) return new List<PortalServiceOrderDto>();

        var tickets = await LoadExecutionTicketsAsync(patientId, details);

        return details.Select(d =>
        {
            var request = d.ServiceRequest;
            var ticket = MatchTicket(tickets, request.ExecuteRoomId, request.RequestDate);

            return new PortalServiceOrderDto
            {
                Id = d.Id,
                OrderCode = request.RequestCode,
                OrderDate = request.RequestDate,
                ServiceName = d.Service?.ServiceName ?? "",
                RequestType = request.RequestType,
                RequestTypeName = DescribeRequestType(request.RequestType),
                ExecuteRoomName = request.ExecuteRoom?.RoomName ?? "",
                OrderingDoctor = request.Doctor?.FullName ?? "",
                Status = d.Status,
                StatusName = DescribeOrderStatus(d.Status),
                ResultDate = d.ResultDate,
                QueueNumber = ticket?.TicketNumber ?? "",
                PeopleAhead = ticket is null ? -1 : CountAhead(tickets, ticket),
            };
        }).ToList();
    }

    /// <summary>
    /// Vé xếp hàng cận lâm sàng của bệnh nhân trong khoảng ngày có chỉ định.
    ///
    /// HIS **không** có liên kết trực tiếp giữa phiếu chỉ định và vé xếp hàng, nên phải đối chiếu
    /// theo (bệnh nhân, phòng thực hiện, ngày) — đúng cách một điều dưỡng đối chiếu bằng mắt. Hệ quả
    /// đã biết: hai chỉ định cùng phòng trong cùng ngày sẽ nhận cùng một số, vì thực tế người bệnh
    /// cũng chỉ xếp hàng một lần cho cả hai. Số thứ tự luôn kèm tên phòng để không bị hiểu nhầm.
    /// </summary>
    private async Task<List<QueueTicket>> LoadExecutionTicketsAsync(
        Guid patientId, List<ServiceRequestDetail> details)
    {
        var rooms = details
            .Select(d => d.ServiceRequest.ExecuteRoomId)
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct()
            .ToList();

        if (rooms.Count == 0) return new List<QueueTicket>();

        var from = details.Min(d => d.ServiceRequest.RequestDate).Date;

        return await _context.QueueTickets.AsNoTracking()
            .Where(t => t.PatientId == patientId
                        && t.RoomId != null && rooms.Contains(t.RoomId.Value)
                        && t.IssueDate >= from
                        && !t.IsDeleted)
            .ToListAsync();
    }

    private static QueueTicket? MatchTicket(List<QueueTicket> tickets, Guid? roomId, DateTime orderDate)
    {
        if (roomId is null) return null;

        return tickets
            .Where(t => t.RoomId == roomId && t.IssueDate.Date == orderDate.Date)
            .OrderBy(t => t.QueueNumber)
            .FirstOrDefault();
    }

    /// <summary>Số người còn đứng trước trong cùng phòng, cùng ngày, chưa được gọi.</summary>
    private static int CountAhead(List<QueueTicket> tickets, QueueTicket ticket) => tickets.Count(
        t => t.RoomId == ticket.RoomId
             && t.IssueDate.Date == ticket.IssueDate.Date
             && t.Status == 0
             && t.QueueNumber < ticket.QueueNumber);

    private static string DescribeRequestType(int type) => type switch
    {
        1 => "Xét nghiệm",
        2 => "Chẩn đoán hình ảnh",
        3 => "Thăm dò chức năng",
        4 => "Thủ thuật",
        _ => "Khác",
    };

    private static string DescribeOrderStatus(int status) => status switch
    {
        0 => "Chờ thực hiện",
        1 => "Đang thực hiện",
        2 => "Đã có kết quả",
        3 => "Đã huỷ",
        _ => "",
    };

    /// <summary>
    /// Đợt nội trú → mã hồ sơ bệnh án, kèm phép kiểm đợt đó có đúng của bệnh nhân này không.
    ///
    /// Trả null cho cả hai trường hợp "không tồn tại" và "không phải của bạn": phân biệt hai thứ đó
    /// chính là cách người ngoài dò ra ai từng nằm viện.
    /// </summary>
    private async Task<Guid?> ResolveAdmissionRecordAsync(Guid patientId, Guid? admissionId)
    {
        if (admissionId is null) return null;

        return await _context.Admissions.AsNoTracking()
            .Where(a => a.Id == admissionId && a.PatientId == patientId && !a.IsDeleted)
            .Select(a => (Guid?)a.MedicalRecordId)
            .FirstOrDefaultAsync();
    }
}
