using System.Text.Json;
using System.Text;
using HIS.Application.DTOs.NangCap23;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

/// <summary>Internal helpers shared by NangCap23 services.</summary>
internal static class NangCap23ServiceHelpers
{
    /// <summary>True khi DbUpdateException là do vi phạm UNIQUE/PRIMARY constraint
    /// (SQL Server error 2601 hoặc 2627).</summary>
    public static bool IsUniqueViolation(DbUpdateException ex)
    {
        return ex.InnerException is SqlException sql
            && (sql.Number == 2601 || sql.Number == 2627);
    }

    /// <summary>QA-R11: the InMemory gateway fakes (NationalGateway:MockMode=true) acknowledge everything with a
    /// "MOCK-" transaction id. Such an ack is not a receipt from the real gateway and must not be shown as one.</summary>
    public static bool IsMockAck(string? transactionId)
        => transactionId != null && transactionId.StartsWith("MOCK-", StringComparison.Ordinal);

    /// <summary>Status name with an explicit "MOCK" marker when the ack came from a fake gateway client.</summary>
    public static string WithMockLabel(string statusName, string? transactionId)
        => IsMockAck(transactionId) ? $"{statusName} (MOCK — chưa gửi cổng thật)" : statusName;

    /// <summary>Gateway transport failures that leave a submission in "Đã gửi" (1) without an answer.</summary>
    public static bool IsTransientError(string? errorCode)
        => errorCode is "NETWORK_ERROR" or "TIMEOUT" or "CIRCUIT_OPEN";
}

