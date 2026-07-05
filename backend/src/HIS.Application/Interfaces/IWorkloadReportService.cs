using System;
using HIS.Application.Common;

namespace HIS.Application.Interfaces;

/// <summary>
/// QW3.10 — Thống kê khối lượng công việc theo BS/KTV — tách khỏi WorkloadReportController (#202 thin-controller).
/// Đếm exam/prescription per doctor, studies per radiologist/tech, lab tests per ordering doctor, in a date range.
/// Trả ServiceOutcome để controller map về IActionResult giữ nguyên status code + body.
/// </summary>
public interface IWorkloadReportService
{
    Task<ServiceOutcome> GetWorkloadAsync(DateTime? fromDate, DateTime? toDate);
}
