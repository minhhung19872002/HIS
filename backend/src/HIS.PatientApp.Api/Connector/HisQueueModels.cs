using System.Text.Json.Serialization;

namespace HIS.PatientApp.Api.Connector;

// ============================================================================
// Số thứ tự (HSMT I.2 #3)
// ============================================================================

/// <summary>Khoa khám mở cho đặt lịch / lấy số.</summary>
public class HisDepartment
{
    [JsonPropertyName("id")] public Guid Id { get; set; }
    [JsonPropertyName("code")] public string? Code { get; set; }
    [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;
    [JsonPropertyName("description")] public string? Description { get; set; }
    [JsonPropertyName("availableDoctors")] public int AvailableDoctors { get; set; }
}

public class HisDoctor
{
    [JsonPropertyName("id")] public Guid Id { get; set; }
    [JsonPropertyName("fullName")] public string FullName { get; set; } = string.Empty;
    [JsonPropertyName("title")] public string? Title { get; set; }
    [JsonPropertyName("specialty")] public string? Specialty { get; set; }
    [JsonPropertyName("departmentId")] public Guid? DepartmentId { get; set; }
    [JsonPropertyName("departmentName")] public string? DepartmentName { get; set; }
}

/// <summary>Phòng khám — app cần để chọn nơi lấy số.</summary>
public class HisRoom
{
    [JsonPropertyName("roomId")] public Guid RoomId { get; set; }
    [JsonPropertyName("roomName")] public string RoomName { get; set; } = string.Empty;
    [JsonPropertyName("departmentId")] public Guid? DepartmentId { get; set; }
    [JsonPropertyName("departmentName")] public string? DepartmentName { get; set; }
    [JsonPropertyName("doctorName")] public string? DoctorName { get; set; }
    [JsonPropertyName("waitingCount")] public int WaitingCount { get; set; }
}

/// <summary>Vé xếp hàng vừa cấp.</summary>
public class HisQueueTicket
{
    [JsonPropertyName("id")] public Guid Id { get; set; }
    [JsonPropertyName("ticketCode")] public string TicketCode { get; set; } = string.Empty;
    [JsonPropertyName("queueNumber")] public int QueueNumber { get; set; }
    [JsonPropertyName("roomId")] public Guid RoomId { get; set; }
    [JsonPropertyName("roomName")] public string? RoomName { get; set; }
    [JsonPropertyName("queueType")] public int QueueType { get; set; }
    [JsonPropertyName("priority")] public int Priority { get; set; }
    [JsonPropertyName("priorityName")] public string? PriorityName { get; set; }
    [JsonPropertyName("priorityReason")] public int? PriorityReason { get; set; }
    [JsonPropertyName("priorityReasonName")] public string? PriorityReasonName { get; set; }
    [JsonPropertyName("priorityVerified")] public bool PriorityVerified { get; set; }
    [JsonPropertyName("status")] public int Status { get; set; }
    [JsonPropertyName("statusName")] public string? StatusName { get; set; }
    [JsonPropertyName("estimatedWaitMinutes")] public int EstimatedWaitMinutes { get; set; }
    [JsonPropertyName("queueDate")] public DateTime QueueDate { get; set; }
}

/// <summary>Trạng thái vé, dùng cho app hỏi lại định kỳ.</summary>
public class HisQueueTicketStatus
{
    [JsonPropertyName("ticketId")] public Guid TicketId { get; set; }
    [JsonPropertyName("ticketCode")] public string TicketCode { get; set; } = string.Empty;
    [JsonPropertyName("queueNumber")] public int QueueNumber { get; set; }
    [JsonPropertyName("roomId")] public Guid RoomId { get; set; }
    [JsonPropertyName("roomName")] public string RoomName { get; set; } = string.Empty;
    [JsonPropertyName("status")] public int Status { get; set; }
    [JsonPropertyName("statusName")] public string? StatusName { get; set; }
    [JsonPropertyName("priority")] public int Priority { get; set; }
    [JsonPropertyName("priorityVerified")] public bool PriorityVerified { get; set; }
    [JsonPropertyName("currentServingTicket")] public string? CurrentServingTicket { get; set; }
    [JsonPropertyName("peopleAhead")] public int PeopleAhead { get; set; }
    [JsonPropertyName("estimatedWaitMinutes")] public int EstimatedWaitMinutes { get; set; }
}

// ============================================================================
// Đặt khám (HSMT I.2 #4)
// ============================================================================

public class HisTimeSlot
{
    [JsonPropertyName("startTime")] public TimeSpan StartTime { get; set; }
    [JsonPropertyName("endTime")] public TimeSpan EndTime { get; set; }
    [JsonPropertyName("displayTime")] public string DisplayTime { get; set; } = string.Empty;
    [JsonPropertyName("isAvailable")] public bool IsAvailable { get; set; }
    [JsonPropertyName("currentBookings")] public int CurrentBookings { get; set; }
    [JsonPropertyName("maxBookings")] public int MaxBookings { get; set; }
}

public class HisSlotResult
{
    [JsonPropertyName("date")] public DateTime Date { get; set; }
    [JsonPropertyName("departmentName")] public string? DepartmentName { get; set; }
    [JsonPropertyName("doctorName")] public string? DoctorName { get; set; }
    [JsonPropertyName("morningSlots")] public List<HisTimeSlot> MorningSlots { get; set; } = new();
    [JsonPropertyName("afternoonSlots")] public List<HisTimeSlot> AfternoonSlots { get; set; } = new();
    [JsonPropertyName("totalAvailable")] public int TotalAvailable { get; set; }
}

public class HisBookingResult
{
    [JsonPropertyName("success")] public bool Success { get; set; }
    [JsonPropertyName("message")] public string? Message { get; set; }
    [JsonPropertyName("appointmentCode")] public string? AppointmentCode { get; set; }
    [JsonPropertyName("appointmentDate")] public DateTime AppointmentDate { get; set; }
    [JsonPropertyName("appointmentTime")] public TimeSpan? AppointmentTime { get; set; }
    [JsonPropertyName("departmentName")] public string? DepartmentName { get; set; }
    [JsonPropertyName("doctorName")] public string? DoctorName { get; set; }
    [JsonPropertyName("roomName")] public string? RoomName { get; set; }
}

public class HisBookingStatus
{
    [JsonPropertyName("appointmentCode")] public string AppointmentCode { get; set; } = string.Empty;
    [JsonPropertyName("patientName")] public string? PatientName { get; set; }
    [JsonPropertyName("appointmentDate")] public DateTime AppointmentDate { get; set; }
    [JsonPropertyName("appointmentTime")] public TimeSpan? AppointmentTime { get; set; }
    [JsonPropertyName("departmentName")] public string? DepartmentName { get; set; }
    [JsonPropertyName("doctorName")] public string? DoctorName { get; set; }
    [JsonPropertyName("roomName")] public string? RoomName { get; set; }
    [JsonPropertyName("status")] public int Status { get; set; }
    [JsonPropertyName("statusName")] public string? StatusName { get; set; }
    [JsonPropertyName("appointmentType")] public int AppointmentType { get; set; }
    [JsonPropertyName("reason")] public string? Reason { get; set; }
}
