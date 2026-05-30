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


namespace HIS.Infrastructure.Services;

// K9 phien 7 (2026-05-30): tach Statistics and Reports (~148 dong) khoi ReceptionCompleteService. File goc giu Private Helpers + ctor.
public partial class ReceptionCompleteService {
    #region Statistics and Reports

    public async Task<QueueRoomStatisticsDto> GetRoomQueueStatisticsAsync(Guid roomId, DateTime date)
    {
        var room = await _roomRepo.GetByIdAsync(roomId);
        var stats = await GetRoomStatsAsync(roomId, date);

        return new QueueRoomStatisticsDto
        {
            RoomId = roomId,
            RoomName = room?.RoomName ?? "",
            TotalWaiting = stats.Waiting,
            TotalServing = stats.InProgress,
            TotalCompleted = stats.Completed,
            TotalSkipped = 0,
            AverageWaitMinutes = 15
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

    public async Task<QueueDailyStatisticsDto> GetDailyStatisticsAsync(DateTime date, Guid? departmentId)
    {
        var query = _context.QueueTickets.Where(t => t.IssueDate.Date == date.Date);

        if (departmentId.HasValue)
        {
            var roomIds = await _context.Rooms
                .Where(r => r.DepartmentId == departmentId.Value)
                .Select(r => r.Id)
                .ToListAsync();
            query = query.Where(t => t.RoomId.HasValue && roomIds.Contains(t.RoomId.Value));
        }

        var tickets = await query.ToListAsync();

        return new QueueDailyStatisticsDto
        {
            Date = date,
            TotalTickets = tickets.Count,
            ServedTickets = tickets.Count(t => t.Status == 3),
            SkippedTickets = tickets.Count(t => t.Status == 4),
            AverageWaitingTime = 15,
            AverageServiceTime = 10
        };
    }

    public async Task<AverageWaitingTimeDto> GetAverageWaitingTimeAsync(DateTime fromDate, DateTime toDate, Guid? roomId)
    {
        return new AverageWaitingTimeDto
        {
            OverallAverage = 15,
            InsurancePatientAverage = 20,
            FeePatientAverage = 10,
            ServicePatientAverage = 8
        };
    }

    public async Task<byte[]> ExportQueueReportAsync(QueueReportRequestDto dto)
    {
        try
        {
            var tickets = await _context.QueueTickets.AsNoTracking()
                .Include(q => q.Room)
                .Where(q => q.CreatedAt.Date >= dto.FromDate.Date && q.CreatedAt.Date <= dto.ToDate.Date)
                .OrderBy(q => q.CreatedAt)
                .ToListAsync();

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
            return System.Text.Encoding.UTF8.GetBytes(html);
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
