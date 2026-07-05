using HIS.Application.Common;
using HIS.Application.DTOs.SampleCollection;

namespace HIS.Application.Interfaces;

/// <summary>
/// Lấy mẫu bệnh phẩm với STT tuần tự theo ngày + thêm XN cùng mẫu + hẹn lấy mẫu định kỳ.
/// Logic tách khỏi SampleCollectionController (#202 thin-controller). Behavior-preserving:
/// giữ nguyên query/projection/response shape + message; userId truyền từ controller
/// (thay cho GetUserId() cũ đọc claim). throw KeyNotFoundException/ArgumentException/
/// InvalidOperationException giữ nguyên (controller propagate).
/// </summary>
public interface ISampleCollectionService
{
    Task<ServiceOutcome> AssignSequenceAsync(AssignSequenceDto dto, Guid userId);

    Task<ServiceOutcome> AddTestsAsync(AddTestsToSampleDto dto, Guid userId);

    Task<ServiceOutcome> UpdateSequenceAsync(UpdateSequenceDto dto);

    Task<ServiceOutcome> CreateAppointmentAsync(CreateAppointmentDto dto, Guid userId);

    Task<ServiceOutcome> GetAppointmentsAsync(Guid? patientId, string? status, DateTime? fromDate, DateTime? toDate);

    Task<ServiceOutcome> UpdateAppointmentAsync(Guid id, UpdateAppointmentDto dto, Guid userId);

    Task<ServiceOutcome> HistoryAsync(Guid patientId);
}
