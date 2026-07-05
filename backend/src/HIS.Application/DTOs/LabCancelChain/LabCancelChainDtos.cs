namespace HIS.Application.DTOs.LabCancelChain;

// Giữ tên field cũ cho tương thích, NHƯNG nay là id của ServiceRequestDetail/ServiceRequest (model 1).
public record CancelRequest(Guid ServiceRequestDetailId, string Reason);

public record CancelResponse(bool Success, int NewStatus, string NewStatusLabel, string Message);
