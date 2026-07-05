using HIS.Application.Common;

namespace HIS.Application.Interfaces;

/// <summary>
/// Thống kê số lượt thực hiện dịch vụ theo phòng/máy (ExecuteRoom) trong khoảng thời gian.
/// Tách khỏi ServiceVolumeReportController (#202 thin-controller). Behavior-preserving.
/// </summary>
public interface IServiceVolumeReportService
{
    /// <summary>Gom số phiếu chỉ định theo phòng thực hiện (ExecuteRoomId) trong [fromDate, toDate].</summary>
    Task<ServiceOutcome> GetAsync(DateTime? fromDate, DateTime? toDate);
}
