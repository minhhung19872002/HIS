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
}

