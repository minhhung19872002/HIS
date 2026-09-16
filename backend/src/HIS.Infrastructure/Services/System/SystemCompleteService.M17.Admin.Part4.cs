using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.System;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

public partial class SystemCompleteService
{

    public async Task<List<ItTicketDto>> GetItTicketsAsync(ItTicketSearchDto search)
    {
        try
        {
            // Try to query ItTickets table if it exists
            var sql = "SELECT TOP 200 * FROM ItTickets WHERE 1=1";
            var conditions = new List<string>();
            if (search.Status.HasValue) conditions.Add($"Status = {search.Status.Value}");
            if (search.Priority.HasValue) conditions.Add($"Priority = {search.Priority.Value}");
            // Keyword is bound as a parameter (was string-concatenated → SQL injection).
            if (!string.IsNullOrEmpty(search.Keyword)) conditions.Add("(Title LIKE @Keyword OR Description LIKE @Keyword)");
            if (conditions.Any()) sql += " AND " + string.Join(" AND ", conditions);
            sql += " ORDER BY CreatedAt DESC";

            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open)
                await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = sql;
            if (!string.IsNullOrEmpty(search.Keyword))
            {
                var kw = command.CreateParameter(); kw.ParameterName = "@Keyword"; kw.Value = $"%{search.Keyword}%"; command.Parameters.Add(kw);
            }
            using var reader = await command.ExecuteReaderAsync();

            var results = new List<ItTicketDto>();
            while (await reader.ReadAsync())
            {
                results.Add(new ItTicketDto
                {
                    Id = reader.GetGuid(reader.GetOrdinal("Id")),
                    Title = reader.GetString(reader.GetOrdinal("Title")),
                    Description = reader.IsDBNull(reader.GetOrdinal("Description")) ? "" : reader.GetString(reader.GetOrdinal("Description")),
                    DepartmentName = reader.IsDBNull(reader.GetOrdinal("DepartmentName")) ? "" : reader.GetString(reader.GetOrdinal("DepartmentName")),
                    RequestedByName = reader.IsDBNull(reader.GetOrdinal("RequestedByName")) ? "" : reader.GetString(reader.GetOrdinal("RequestedByName")),
                    Priority = reader.GetInt32(reader.GetOrdinal("Priority")),
                    Status = reader.GetInt32(reader.GetOrdinal("Status")),
                    Response = reader.IsDBNull(reader.GetOrdinal("Response")) ? null : reader.GetString(reader.GetOrdinal("Response")),
                    AssignedToName = reader.IsDBNull(reader.GetOrdinal("AssignedToName")) ? null : reader.GetString(reader.GetOrdinal("AssignedToName")),
                    CreatedAt = reader.GetDateTime(reader.GetOrdinal("CreatedAt")),
                    ResolvedAt = reader.IsDBNull(reader.GetOrdinal("ResolvedAt")) ? null : reader.GetDateTime(reader.GetOrdinal("ResolvedAt")),
                });
            }
            return results;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "ItTickets table may not exist, returning empty list");
            return new List<ItTicketDto>();
        }
    }

    public async Task<ItTicketDto> CreateItTicketAsync(CreateItTicketDto dto, string userId, string userName, string departmentName)
    {
        // QA-R4: untitled tickets were created from an empty body.
        if (string.IsNullOrWhiteSpace(dto.Title))
            throw new ArgumentException("Tiêu đề sự cố IT là bắt buộc.");
        try
        {
            var id = Guid.NewGuid();
            var now = DateTime.UtcNow;
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open)
                await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = @"INSERT INTO ItTickets (Id, Title, Description, DepartmentName, RequestedByName, Priority, Status, CreatedAt, CreatedBy)
                VALUES (@Id, @Title, @Description, @DepartmentName, @RequestedByName, @Priority, 0, @CreatedAt, @CreatedBy)";

            var p1 = command.CreateParameter(); p1.ParameterName = "@Id"; p1.Value = id; command.Parameters.Add(p1);
            var p2 = command.CreateParameter(); p2.ParameterName = "@Title"; p2.Value = dto.Title; command.Parameters.Add(p2);
            var p3 = command.CreateParameter(); p3.ParameterName = "@Description"; p3.Value = dto.Description ?? ""; command.Parameters.Add(p3);
            var p4 = command.CreateParameter(); p4.ParameterName = "@DepartmentName"; p4.Value = departmentName ?? ""; command.Parameters.Add(p4);
            var p5 = command.CreateParameter(); p5.ParameterName = "@RequestedByName"; p5.Value = userName; command.Parameters.Add(p5);
            var p6 = command.CreateParameter(); p6.ParameterName = "@Priority"; p6.Value = dto.Priority; command.Parameters.Add(p6);
            var p7 = command.CreateParameter(); p7.ParameterName = "@CreatedAt"; p7.Value = now; command.Parameters.Add(p7);
            var p8 = command.CreateParameter(); p8.ParameterName = "@CreatedBy"; p8.Value = userId; command.Parameters.Add(p8);

            await command.ExecuteNonQueryAsync();

            return new ItTicketDto
            {
                Id = id,
                Title = dto.Title,
                Description = dto.Description,
                DepartmentName = departmentName,
                RequestedByName = userName,
                Priority = dto.Priority,
                Status = 0,
                CreatedAt = now,
            };
        }
        catch (Exception ex)
        {
            // Surface the failure: a fake "created" ticket made users believe the request was saved.
            _logger.LogWarning(ex, "Failed to create IT ticket");
            throw;
        }
    }

    public async Task<ItTicketDto> RespondToItTicketAsync(Guid ticketId, RespondItTicketDto dto, string respondedByName)
    {
        // QA-R4: an empty response on an unknown ticket returned 200 with a zero-GUID DTO (silent no-op).
        if (string.IsNullOrWhiteSpace(dto.Response))
            throw new ArgumentException("Nội dung phản hồi là bắt buộc.");
        try
        {
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open)
                await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = @"UPDATE ItTickets SET Response = @Response, AssignedToName = @AssignedToName, Status = 1, ResolvedAt = @ResolvedAt WHERE Id = @Id";

            var p1 = command.CreateParameter(); p1.ParameterName = "@Id"; p1.Value = ticketId; command.Parameters.Add(p1);
            var p2 = command.CreateParameter(); p2.ParameterName = "@Response"; p2.Value = dto.Response; command.Parameters.Add(p2);
            var p3 = command.CreateParameter(); p3.ParameterName = "@AssignedToName"; p3.Value = respondedByName; command.Parameters.Add(p3);
            var p4 = command.CreateParameter(); p4.ParameterName = "@ResolvedAt"; p4.Value = DateTime.UtcNow; command.Parameters.Add(p4);

            var affected = await command.ExecuteNonQueryAsync();
            if (affected == 0) throw new KeyNotFoundException("Phiếu sự cố IT không tồn tại.");

            return new ItTicketDto
            {
                Id = ticketId,
                Response = dto.Response,
                AssignedToName = respondedByName,
                Status = 1,
                ResolvedAt = DateTime.UtcNow,
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to respond to IT ticket {TicketId}", ticketId);
            throw;
        }
    }

    public async Task<bool> CloseItTicketAsync(Guid ticketId)
    {
        try
        {
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open)
                await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = "UPDATE ItTickets SET Status = 3, ResolvedAt = @ResolvedAt WHERE Id = @Id";

            var p1 = command.CreateParameter(); p1.ParameterName = "@Id"; p1.Value = ticketId; command.Parameters.Add(p1);
            var p2 = command.CreateParameter(); p2.ParameterName = "@ResolvedAt"; p2.Value = DateTime.UtcNow; command.Parameters.Add(p2);

            var affected = await command.ExecuteNonQueryAsync();
            // QA-R4: closing an unknown ticket answered 200/true — 404 instead of a silent no-op.
            if (affected == 0) throw new KeyNotFoundException("Phiếu sự cố IT không tồn tại.");
            return true;
        }
        catch (KeyNotFoundException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to close IT ticket {TicketId}", ticketId);
            return false;
        }
    }

    public async Task<ItTicketStatsDto> GetItTicketStatsAsync()
    {
        try
        {
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open)
                await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = @"SELECT
                SUM(CASE WHEN Status = 0 THEN 1 ELSE 0 END) AS NewCount,
                SUM(CASE WHEN Status = 1 THEN 1 ELSE 0 END) AS InProgressCount,
                SUM(CASE WHEN Status = 2 THEN 1 ELSE 0 END) AS ResolvedCount,
                SUM(CASE WHEN Status = 3 THEN 1 ELSE 0 END) AS ClosedCount,
                COUNT(*) AS TotalCount
                FROM ItTickets";

            using var reader = await command.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                return new ItTicketStatsDto
                {
                    NewCount = reader.IsDBNull(0) ? 0 : reader.GetInt32(0),
                    InProgressCount = reader.IsDBNull(1) ? 0 : reader.GetInt32(1),
                    ResolvedCount = reader.IsDBNull(2) ? 0 : reader.GetInt32(2),
                    ClosedCount = reader.IsDBNull(3) ? 0 : reader.GetInt32(3),
                    TotalCount = reader.IsDBNull(4) ? 0 : reader.GetInt32(4),
                };
            }
            return new ItTicketStatsDto();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "ItTickets table may not exist, returning empty stats");
            return new ItTicketStatsDto();
        }
    }

}
