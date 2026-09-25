using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Insurance;
using HIS.Application.DTOs.Reception;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
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
using WaitingPhaseAnalysisDto = HIS.Application.DTOs.Reception.WaitingPhaseAnalysisDto;
using PhaseBreakdownDto = HIS.Application.DTOs.Reception.PhaseBreakdownDto;
using DepartmentWaitingDto = HIS.Application.DTOs.Reception.DepartmentWaitingDto;


namespace HIS.Infrastructure.Services;

// K9 phien 7 (2026-05-30): tach Statistics and Reports (~148 dong) khoi ReceptionCompleteService. File goc giu Private Helpers + ctor.
public partial class ReceptionCompleteService {
    #region Statistics and Reports

    public async Task<QueueRoomStatisticsDto> GetRoomQueueStatisticsAsync(Guid roomId, DateTime date)
    {
        var room = await _roomRepo.GetByIdAsync(roomId);
        var stats = await GetRoomStatsAsync(roomId, date);
        // QA-R6: AverageWaitMinutes was a constant 15 and skipped tickets a constant 0.
        var (dayFrom, dayTo) = HIS.Core.Common.VnTime.DayRangeVn(date);
        var roomTickets = await _context.QueueTickets.AsNoTracking()
            .Where(t => t.RoomId == roomId && t.IssueDate >= dayFrom && t.IssueDate < dayTo)
            .Select(t => new { t.Status, t.IssueDate, t.CalledTime })
            .ToListAsync();
        var roomWaits = roomTickets.Where(t => t.CalledTime.HasValue && t.CalledTime.Value >= t.IssueDate)
            .Select(t => (t.CalledTime!.Value - t.IssueDate).TotalMinutes).ToList();

        return new QueueRoomStatisticsDto
        {
            RoomId = roomId,
            RoomName = room?.RoomName ?? "",
            TotalWaiting = stats.Waiting,
            TotalServing = stats.InProgress,
            TotalCompleted = stats.Completed,
            TotalSkipped = roomTickets.Count(t => t.Status == 4),
            AverageWaitMinutes = roomWaits.Count > 0 ? Math.Round(roomWaits.Average(), 1) : 0
        };
    }

    public async Task<List<QueueRoomStatisticsDto>> GetDepartmentQueueStatisticsAsync(Guid departmentId, DateTime date)
    {
        var rooms = await _context.Rooms.Where(r => r.DepartmentId == departmentId).ToListAsync();
        var result = new List<QueueRoomStatisticsDto>();

        foreach (var room in rooms)
        {
            result.Add(await GetRoomQueueStatisticsAsync(room.Id, date));
        }

        return result;
    }

    // #459: luồng BN OPD 7 trạng thái chuẩn MQSoft — đếm trực tiếp trên MedicalRecord.Status.
    public async Task<OpdFlowStatsDto> GetOpdFlowStatsAsync(DateTime date)
    {
        // CreatedAt lưu UTC; date là ngày local VN từ FE → so theo khoảng UTC của trọn ngày VN.
        var (fromUtc, toUtc) = HIS.Core.Common.VnTime.DayRangeUtc(date);
        var counts = await _context.MedicalRecords
            .Where(m => m.CreatedAt >= fromUtc && m.CreatedAt < toUtc)
            .GroupBy(m => m.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        int C(int s) => counts.FirstOrDefault(x => x.Status == s)?.Count ?? 0;
        return new OpdFlowStatsDto
        {
            Registered = counts.Where(x => x.Status != 6).Sum(x => x.Count), // trừ 6-Hủy
            Waiting = C(0),
            InProgress = C(1),
            WaitingCls = C(5),
            ClsResultReady = C(2), // 2-Chờ kết luận = đã có kết quả CLS
            Completed = C(3),
            Paid = C(4)
        };
    }

    public async Task<QueueDailyStatisticsDto> GetDailyStatisticsAsync(DateTime date, Guid? departmentId)
    {
        // IssueDate = VN local time (business timestamp convention).
        var (dsFromUtc, dsToUtc) = HIS.Core.Common.VnTime.DayRangeVn(date);
        var query = _context.QueueTickets.Where(t => t.IssueDate >= dsFromUtc && t.IssueDate < dsToUtc);

        if (departmentId.HasValue)
        {
            var roomIds = await _context.Rooms
                .Where(r => r.DepartmentId == departmentId.Value)
                .Select(r => r.Id)
                .ToListAsync();
            query = query.Where(t => t.RoomId.HasValue && roomIds.Contains(t.RoomId.Value));
        }

        var tickets = await query.ToListAsync();

        // QA-R6: waiting/service time were constants (15 / 10 min) and the peak hour always 0.
        // Measured from the ticket's own VN-local timestamps; tickets without the timestamps are not guessed.
        var waits = tickets.Where(t => t.CalledTime.HasValue && t.CalledTime.Value >= t.IssueDate)
            .Select(t => (t.CalledTime!.Value - t.IssueDate).TotalMinutes).ToList();
        var services = tickets.Where(t => t.CalledTime.HasValue && t.CompletedTime.HasValue && t.CompletedTime.Value >= t.CalledTime.Value)
            .Select(t => (t.CompletedTime!.Value - t.CalledTime!.Value).TotalMinutes).ToList();
        var peak = tickets.GroupBy(t => t.IssueDate.Hour).OrderByDescending(g => g.Count()).FirstOrDefault();

        return new QueueDailyStatisticsDto
        {
            Date = date,
            TotalTickets = tickets.Count,
            ServedTickets = tickets.Count(t => t.Status == 3),
            SkippedTickets = tickets.Count(t => t.Status == 4),
            AverageWaitingTime = waits.Count > 0 ? Math.Round(waits.Average(), 1) : 0,
            AverageServiceTime = services.Count > 0 ? Math.Round(services.Average(), 1) : 0,
            PeakHour = peak?.Key ?? 0,
            PeakHourCount = peak?.Count() ?? 0
        };
    }

    public async Task<AverageWaitingTimeDto> GetAverageWaitingTimeAsync(DateTime fromDate, DateTime toDate, Guid? roomId)
    {
        // Legacy endpoint — delegate to phase analysis for real calculation, return summary shape.
        var analysis = await GetWaitingPhaseAnalysisAsync(fromDate, toDate, null);
        return new AverageWaitingTimeDto
        {
            OverallAverage = analysis.RegistrationToExamMinutes,
            InsurancePatientAverage = analysis.InsurancePatients.RegistrationToExamMinutes,
            FeePatientAverage = analysis.FeePatients.RegistrationToExamMinutes,
            ServicePatientAverage = analysis.ServicePatients.RegistrationToExamMinutes
        };
    }

    /// <summary>
    /// F9.4 — Phân tích thời gian chờ theo từng khâu thực.
    ///
    /// Mốc timestamp dùng:
    ///   Đăng ký      = MedicalRecord.AdmissionDate (VN local, DayRangeVn)
    ///   Bắt đầu khám = Examination.StartTime (nullable; bỏ qua nếu null)
    ///   Kết thúc khám= Examination.EndTime   (nullable; bỏ qua nếu null)
    ///   Chỉ định CLS  = ServiceRequest.CreatedAt (không phải RequestDate — dùng audit CreatedAt)
    ///   Có KQ CLS     = ServiceRequest.UpdatedAt khi Status=3 (GIẢ ĐỊNH: UpdatedAt phản ánh thời điểm có KQ)
    ///   Kê đơn        = Prescription.PrescriptionDate
    ///
    /// Giả định cần lưu ý:
    ///   - ServiceRequest.UpdatedAt@Status=3 được coi là thời điểm có kết quả CLS.
    ///     Nếu UpdatedAt bị cập nhật vì lý do khác (sửa giá, hủy…) sẽ bị sai.
    ///     Giải pháp chính xác hơn: thêm cột CompletedAt vào ServiceRequest (issue riêng).
    ///   - Chỉ tính các lượt khám có cả StartTime và EndTime (đã hoàn thành).
    /// </summary>
    public async Task<WaitingPhaseAnalysisDto> GetWaitingPhaseAnalysisAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId)
    {
        // AdmissionDate = VN local time (business timestamp convention) → VN day range.
        var (fromUtc, _) = HIS.Core.Common.VnTime.DayRangeVn(fromDate);
        var (_, toUtc)   = HIS.Core.Common.VnTime.DayRangeVn(toDate);

        // Lấy hồ sơ OPD (ngoại trú), trong khoảng ngày.
        // Áp filter departmentId trước Include để EF Core sinh SQL hiệu quả hơn.
        var baseQuery = _context.MedicalRecords
            .AsNoTracking()
            .Where(mr => mr.AdmissionDate >= fromUtc && mr.AdmissionDate < toUtc
                      && mr.TreatmentType == 1); // 1-Ngoại trú

        if (departmentId.HasValue)
            baseQuery = baseQuery.Where(mr => mr.DepartmentId == departmentId.Value);

        var records = await baseQuery
            .Include(mr => mr.Department)
            .Include(mr => mr.Examinations)
            .Include(mr => mr.ServiceRequests)
            .Include(mr => mr.Prescriptions)
            .ToListAsync();

        // Hàm an toàn tính delta phút (bỏ giá trị âm do data dirty)
        static double SafeMinutes(DateTime? from, DateTime? to)
        {
            if (from == null || to == null) return -1;
            var delta = (to.Value - from.Value).TotalMinutes;
            return delta >= 0 ? delta : -1;
        }

        // Accumulator per patient type
        var buckets = new Dictionary<int, (List<double> regToExam, List<double> examDur, List<double> overall)>
        {
            [1] = (new(), new(), new()), // BHYT
            [2] = (new(), new(), new()), // Viện phí
            [3] = (new(), new(), new()), // Dịch vụ
        };

        // Phase accumulators (tất cả loại đối tượng)
        var allRegToExam  = new List<double>();
        var allExamDur    = new List<double>();
        var allExamToCls  = new List<double>();
        var allClsToResult = new List<double>();
        var allResultToRx = new List<double>();
        var allOverall    = new List<double>();

        // Break-down theo khoa
        var deptAccum = new Dictionary<Guid, (string Name, List<double> regToExam, List<double> overall)>();

        foreach (var mr in records)
        {
            var pType = mr.PatientType; // 1/2/3; nếu khác chuẩn thì bỏ qua bucket
            var admDate = mr.AdmissionDate; // VN local, same clock as Examination.StartTime/EndTime

            // Lấy lượt khám chính (ExaminationType=1 hoặc lượt đầu nếu không có)
            var exam = mr.Examinations
                .OrderBy(e => e.CreatedAt)
                .FirstOrDefault(e => e.ExaminationType == 1)
                ?? mr.Examinations.OrderBy(e => e.CreatedAt).FirstOrDefault();

            var regToExam  = SafeMinutes(admDate, exam?.StartTime);
            var examDur    = SafeMinutes(exam?.StartTime, exam?.EndTime);
            var overall    = SafeMinutes(admDate, exam?.EndTime);

            if (regToExam >= 0) allRegToExam.Add(regToExam);
            if (examDur >= 0) allExamDur.Add(examDur);
            if (overall >= 0) allOverall.Add(overall);

            if (buckets.TryGetValue(pType, out var b))
            {
                if (regToExam >= 0) b.regToExam.Add(regToExam);
                if (examDur >= 0) b.examDur.Add(examDur);
                if (overall >= 0) b.overall.Add(overall);
            }

            // CLS: ServiceRequest chỉ định trong lượt này (liên kết qua ExaminationId hoặc MedicalRecordId)
            var clsReqs = mr.ServiceRequests
                .Where(sr => sr.ExaminationId == exam?.Id || sr.MedicalRecordId == mr.Id)
                .OrderBy(sr => sr.CreatedAt)
                .ToList();

            if (clsReqs.Any() && exam?.StartTime != null)
            {
                // Khám → Chỉ định CLS đầu tiên
                var firstCls = clsReqs.First();
                var examToCls = SafeMinutes(exam.StartTime, HIS.Core.Common.VnTime.UtcToVn(firstCls.CreatedAt)); // CreatedAt is UTC
                if (examToCls >= 0) allExamToCls.Add(examToCls);

                // CLS → Có KQ (UpdatedAt khi Status=3 — GIẢ ĐỊNH, xem comment class)
                var clsWithResult = clsReqs.Where(sr => sr.Status == 3 && sr.UpdatedAt != null).ToList();
                if (clsWithResult.Any())
                {
                    var lastResultAt = clsWithResult.Max(sr => sr.UpdatedAt!.Value);
                    var clsToResult  = SafeMinutes(firstCls.CreatedAt, lastResultAt);
                    if (clsToResult >= 0) allClsToResult.Add(clsToResult);

                    // Có KQ → Kê đơn
                    var firstRx = mr.Prescriptions.OrderBy(p => p.PrescriptionDate).FirstOrDefault();
                    if (firstRx != null)
                    {
                        var resultToRx = SafeMinutes(HIS.Core.Common.VnTime.UtcToVn(lastResultAt), firstRx.PrescriptionDate); // UpdatedAt UTC vs VN local
                        if (resultToRx >= 0) allResultToRx.Add(resultToRx);
                    }
                }
            }

            // Break-down theo khoa
            if (mr.DepartmentId.HasValue)
            {
                var dId   = mr.DepartmentId.Value;
                var dName = mr.Department?.DepartmentName ?? dId.ToString();
                if (!deptAccum.TryGetValue(dId, out var da))
                {
                    da = (dName, new List<double>(), new List<double>());
                    deptAccum[dId] = da;
                }
                if (regToExam >= 0) da.regToExam.Add(regToExam);
                if (overall >= 0)   da.overall.Add(overall);
            }
        }

        static double Avg(List<double> lst) => lst.Count > 0 ? Math.Round(lst.Average(), 1) : 0;

        PhaseBreakdownDto BuildBreakdown(int pType) => new()
        {
            VisitCount                = buckets[pType].regToExam.Count,
            RegistrationToExamMinutes = Avg(buckets[pType].regToExam),
            ExamDurationMinutes       = Avg(buckets[pType].examDur),
            OverallMinutes            = Avg(buckets[pType].overall),
        };

        return new WaitingPhaseAnalysisDto
        {
            FromDate                        = fromDate.Date,
            ToDate                          = toDate.Date,
            TotalVisits                     = records.Count,
            RegistrationToExamMinutes       = Avg(allRegToExam),
            ExamDurationMinutes             = Avg(allExamDur),
            ExamToClsRequestMinutes         = Avg(allExamToCls),
            ClsRequestToResultMinutes       = Avg(allClsToResult),
            ClsResultToPrescriptionMinutes  = Avg(allResultToRx),
            OverallMinutes                  = Avg(allOverall),
            InsurancePatients               = BuildBreakdown(1),
            FeePatients                     = BuildBreakdown(2),
            ServicePatients                 = BuildBreakdown(3),
            ByDepartment                    = deptAccum.Select(kv => new DepartmentWaitingDto
            {
                DepartmentId              = kv.Key,
                DepartmentName            = kv.Value.Name,
                VisitCount                = Math.Max(kv.Value.regToExam.Count, kv.Value.overall.Count),
                RegistrationToExamMinutes = Avg(kv.Value.regToExam),
                OverallMinutes            = Avg(kv.Value.overall),
            }).OrderByDescending(d => d.VisitCount).ToList(),
        };
    }

    public async Task<byte[]> ExportQueueReportAsync(QueueReportRequestDto dto)
    {
        try
        {
            var ticketQuery = _context.QueueTickets.AsNoTracking()
                .Include(q => q.Room)
                .Where(q => q.CreatedAt.Date >= dto.FromDate.Date && q.CreatedAt.Date <= dto.ToDate.Date);
            // QA-R11: room/queue-type/department filters were accepted and ignored.
            if (dto.RoomId.HasValue) ticketQuery = ticketQuery.Where(q => q.RoomId == dto.RoomId);
            if (dto.QueueType.HasValue) ticketQuery = ticketQuery.Where(q => q.QueueType == dto.QueueType);
            if (dto.DepartmentId.HasValue) ticketQuery = ticketQuery.Where(q => q.Room != null && q.Room.DepartmentId == dto.DepartmentId);
            var tickets = await ticketQuery.OrderBy(q => q.CreatedAt).ToListAsync();

            var html = $@"<html><head><meta charset='utf-8'/>
<style>body{{font-family:'Times New Roman';}} table{{border-collapse:collapse;width:100%;}} th,td{{border:1px solid #000;padding:4px;text-align:center;}} th{{background:#f0f0f0;}}</style></head>
<body><h2 style='text-align:center'>BÁO CÁO HÀNG ĐỢI</h2>
<p>Từ ngày: {dto.FromDate:dd/MM/yyyy} - Đến ngày: {dto.ToDate:dd/MM/yyyy}</p>
<table><tr><th>STT</th><th>Số</th><th>Phòng</th><th>Loại</th><th>Trạng thái</th><th>Thời gian tạo</th><th>Thời gian gọi</th></tr>";
            var i = 1;
            foreach (var t in tickets)
            {
                var qType = t.QueueType switch { 1 => "Thường", 2 => "Ưu tiên", 3 => "Cấp cứu", _ => "Khác" };
                var status = t.Status switch { 0 => "Chờ", 1 => "Đang gọi", 2 => "Đã khám", 3 => "Bỏ qua", _ => "Khác" };
                html += "<tr><td>" + i++ + "</td><td>" + t.QueueNumber + "</td><td>" + (t.Room?.RoomName ?? "") + "</td><td>" + qType + "</td><td>" + status + "</td><td>" + t.CreatedAt.ToString("HH:mm") + "</td><td>" + (t.CalledTime?.ToString("HH:mm") ?? "") + "</td></tr>";
            }
            html += $"</table><p>Tổng: {tickets.Count} lượt</p></body></html>";
            // QA-R11: this HTML was served as .xlsx / application/pdf (neither opened). Same format rule as the
            // controller: "PDF" → real PDF, anything else → real xlsx.
            if (dto.ExportFormat == "PDF") return Export.ReportFileRenderer.HtmlToPdf(html);
            var n = 1;
            var rows = tickets.Select(t => new[]
            {
                (n++).ToString(), t.QueueNumber.ToString(), t.Room?.RoomName ?? "",
                t.QueueType switch { 1 => "Thường", 2 => "Ưu tiên", 3 => "Cấp cứu", _ => "Khác" },
                t.Status switch { 0 => "Chờ", 1 => "Đang gọi", 2 => "Đã khám", 3 => "Bỏ qua", _ => "Khác" },
                t.CreatedAt.ToString("dd/MM/yyyy HH:mm"), t.CalledTime?.ToString("HH:mm") ?? "",
            }).ToList();
            return Export.ReportFileRenderer.TableToXlsx("BAO CAO HANG DOI",
                new[] { "STT", "Số", "Phòng", "Loại", "Trạng thái", "Thời gian tạo", "Thời gian gọi" }, rows);
        }
        catch (Exception ex)
        {
            // Queue report export error - return empty
            return Array.Empty<byte>();
        }
    }

    public async Task<QueueConfigurationDto?> GetQueueConfigurationAsync(Guid roomId, int queueType)
    {
        var config = await _context.QueueConfigurations
            .FirstOrDefaultAsync(c => c.RoomId == roomId && c.QueueType == queueType);

        if (config == null) return null;

        return new QueueConfigurationDto
        {
            RoomId = config.RoomId,
            QueueType = config.QueueType,
            NumberPrefix = config.Prefix,
            StartNumber = config.StartNumber,
            ResetDaily = config.ResetDaily,
            MaxCallCount = 3,
            CallIntervalSeconds = 30,
            AutoSkipMinutes = 15,
            EnableVoiceCall = true,
            DisplayRows = 5
        };
    }

    public async Task<QueueConfigurationDto> SaveQueueConfigurationAsync(QueueConfigurationDto dto)
    {
        var config = await _context.QueueConfigurations
            .FirstOrDefaultAsync(c => c.RoomId == dto.RoomId && c.QueueType == dto.QueueType);

        if (config == null)
        {
            config = new QueueConfiguration
            {
                Id = Guid.NewGuid(),
                RoomId = dto.RoomId,
                QueueType = dto.QueueType
            };
            await _context.QueueConfigurations.AddAsync(config);
        }

        config.Prefix = dto.NumberPrefix;
        config.StartNumber = dto.StartNumber;
        config.ResetDaily = dto.ResetDaily;

        await _unitOfWork.SaveChangesAsync();
        return dto;
    }

    #endregion
}
