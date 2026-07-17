using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using HIS.Application.DTOs.BloodBank;
using HIS.Application.Services;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services
{
    public partial class BloodBankCompleteService
    {
        #region 3. Issue Requests

        public async Task<List<BloodIssueRequestDto>> GetIssueRequestsAsync(
            DateTime fromDate, DateTime toDate, Guid? departmentId = null, string status = null)
        {
            // Clamp into SQL Server's valid datetime range (1753-01-01 .. 9999-12-31).
            // Callers that omit fromDate/toDate send DateTime.MinValue (0001-01-01),
            // which overflows SqlDateTime -> 500. An empty upper bound means "no limit".
            var sqlMin = (DateTime)System.Data.SqlTypes.SqlDateTime.MinValue;
            var sqlMax = (DateTime)System.Data.SqlTypes.SqlDateTime.MaxValue;
            if (fromDate < sqlMin) fromDate = sqlMin;
            if (toDate < sqlMin) toDate = sqlMax;
            else if (toDate > sqlMax) toDate = sqlMax;

            var results = new List<BloodIssueRequestDto>();
            using var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();
            using var command = connection.CreateCommand();

            var sql = @"SELECT r.Id, r.RequestCode, r.RequestDate, r.DepartmentId,
                r.RequestedById, r.PatientId, r.PatientCode, r.PatientName,
                r.BloodType, r.RhFactor, r.ProductTypeId, pt.Name AS ProductTypeName,
                r.RequestedQuantity, r.IssuedQuantity, r.Urgency, r.Status,
                r.ClinicalIndication, r.Note, r.CreatedAt
                FROM BloodIssueRequests r
                LEFT JOIN BloodProductTypes pt ON r.ProductTypeId = pt.Id
                WHERE r.RequestDate >= @fromDate AND r.RequestDate <= @toDate";

            if (departmentId.HasValue)
                sql += " AND r.DepartmentId = @departmentId";
            if (!string.IsNullOrEmpty(status))
                sql += " AND r.Status = @status";
            sql += " ORDER BY r.RequestDate DESC";

            command.CommandText = sql;
            command.Parameters.Add(new SqlParameter("@fromDate", fromDate));
            command.Parameters.Add(new SqlParameter("@toDate", toDate));
            if (departmentId.HasValue)
                command.Parameters.Add(new SqlParameter("@departmentId", departmentId.Value));
            if (!string.IsNullOrEmpty(status))
                command.Parameters.Add(new SqlParameter("@status", status));

            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                results.Add(ReadIssueRequestFromReader(reader));
            }
            return results;
        }

        public async Task<BloodIssueRequestDto> GetIssueRequestAsync(Guid requestId)
        {
            using var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();
            using var command = connection.CreateCommand();

            command.CommandText = @"SELECT r.Id, r.RequestCode, r.RequestDate, r.DepartmentId,
                r.RequestedById, r.PatientId, r.PatientCode, r.PatientName,
                r.BloodType, r.RhFactor, r.ProductTypeId, pt.Name AS ProductTypeName,
                r.RequestedQuantity, r.IssuedQuantity, r.Urgency, r.Status,
                r.ClinicalIndication, r.Note, r.CreatedAt
                FROM BloodIssueRequests r
                LEFT JOIN BloodProductTypes pt ON r.ProductTypeId = pt.Id
                WHERE r.Id = @requestId";
            command.Parameters.Add(new SqlParameter("@requestId", requestId));

            using var reader = await command.ExecuteReaderAsync();
            if (await reader.ReadAsync())
                return ReadIssueRequestFromReader(reader);
            return null;
        }

        public async Task<BloodIssueRequestDto> CreateIssueRequestAsync(CreateBloodIssueRequestDto dto)
        {
            var id = Guid.NewGuid();
            var code = $"REQ{DateTime.Now:yyyyMMddHHmmss}";

            await _context.Database.ExecuteSqlRawAsync(
                @"INSERT INTO BloodIssueRequests (Id, RequestCode, RequestDate, DepartmentId, RequestedById, PatientId, PatientCode, PatientName, BloodType, RhFactor, ProductTypeId, RequestedQuantity, IssuedQuantity, Urgency, Status, ClinicalIndication, Note, CreatedAt)
                VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10, @p11, 0, @p12, 'Pending', @p13, @p14, @p15)",
                id, code, DateTime.Now, dto.DepartmentId,
                dto.DepartmentId,
                dto.PatientId ?? (object)DBNull.Value,
                (object)DBNull.Value, (object)DBNull.Value,
                dto.BloodType ?? (object)DBNull.Value,
                dto.RhFactor ?? (object)DBNull.Value,
                dto.ProductTypeId,
                dto.RequestedQuantity,
                dto.Urgency ?? "Normal",
                dto.ClinicalIndication ?? (object)DBNull.Value,
                dto.Note ?? (object)DBNull.Value,
                DateTime.Now);

            return await GetIssueRequestAsync(id);
        }

        public async Task<bool> ApproveIssueRequestAsync(Guid requestId)
        {
            var rows = await _context.Database.ExecuteSqlRawAsync(
                "UPDATE BloodIssueRequests SET Status='Approved' WHERE Id=@p0 AND Status='Pending'",
                requestId);
            return rows > 0;
        }

        public async Task<bool> RejectIssueRequestAsync(Guid requestId, string reason)
        {
            var rows = await _context.Database.ExecuteSqlRawAsync(
                "UPDATE BloodIssueRequests SET Status='Cancelled', Note=@p0 WHERE Id=@p1 AND Status='Pending'",
                reason ?? "", requestId);
            return rows > 0;
        }

        public async Task<BloodIssueReceiptDto> IssueBloodAsync(IssueBloodDto dto)
        {
            var receiptId = Guid.NewGuid();
            var receiptCode = $"ISS{DateTime.Now:yyyyMMddHHmmss}";

            await _context.Database.ExecuteSqlRawAsync(
                @"INSERT INTO BloodIssueReceipts (Id, ReceiptCode, IssueDate, DepartmentId, RequestedBy, IssuedBy, Status, TotalBags, Note, CreatedAt)
                VALUES (@p0, @p1, @p2, (SELECT DepartmentId FROM BloodIssueRequests WHERE Id=@p3), 'System', 'System', 'Issued', @p4, @p5, @p6)",
                receiptId, receiptCode, DateTime.Now, dto.RequestId,
                dto.BloodBagIds?.Count ?? 0, dto.Note ?? (object)DBNull.Value, DateTime.Now);

            if (dto.BloodBagIds != null)
            {
                foreach (var bagId in dto.BloodBagIds)
                {
                    var itemId = Guid.NewGuid();
                    await _context.Database.ExecuteSqlRawAsync(
                        @"INSERT INTO BloodIssueItems (Id, ReceiptId, BloodBagId, BagCode, BloodType, RhFactor, ProductTypeName, Volume, ExpiryDate, PatientId, PatientCode, PatientName)
                        SELECT @p0, @p1, b.Id, b.BagCode, b.BloodType, b.RhFactor,
                            pt.Name, b.Volume, b.ExpiryDate,
                            (SELECT PatientId FROM BloodIssueRequests WHERE Id=@p3),
                            (SELECT PatientCode FROM BloodIssueRequests WHERE Id=@p3),
                            (SELECT PatientName FROM BloodIssueRequests WHERE Id=@p3)
                        FROM BloodBags b
                        LEFT JOIN BloodProductTypes pt ON b.ProductTypeId = pt.Id
                        WHERE b.Id = @p2",
                        itemId, receiptId, bagId, dto.RequestId);

                    await _context.Database.ExecuteSqlRawAsync(
                        "UPDATE BloodBags SET Status='Issued' WHERE Id=@p0", bagId);
                }
            }

            await _context.Database.ExecuteSqlRawAsync(
                @"UPDATE BloodIssueRequests SET IssuedQuantity = IssuedQuantity + @p0,
                Status = CASE WHEN IssuedQuantity + @p0 >= RequestedQuantity THEN 'FullyIssued' ELSE 'PartiallyIssued' END
                WHERE Id=@p1",
                dto.BloodBagIds?.Count ?? 0, dto.RequestId);

            return await GetIssueReceiptByIdAsync(receiptId);
        }

        public async Task<List<BloodIssueReceiptDto>> GetIssueReceiptsAsync(
            DateTime fromDate, DateTime toDate, Guid? departmentId = null)
        {
            var results = new List<BloodIssueReceiptDto>();
            using var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();
            using var command = connection.CreateCommand();

            var sql = @"SELECT r.Id, r.ReceiptCode, r.IssueDate, r.DepartmentId,
                r.RequestedBy, r.IssuedBy, r.Status, r.TotalBags, r.Note, r.CreatedAt
                FROM BloodIssueReceipts r
                WHERE r.IssueDate >= @fromDate AND r.IssueDate <= @toDate";

            if (departmentId.HasValue)
                sql += " AND r.DepartmentId = @departmentId";
            sql += " ORDER BY r.IssueDate DESC";

            command.CommandText = sql;
            command.Parameters.Add(new SqlParameter("@fromDate", fromDate));
            command.Parameters.Add(new SqlParameter("@toDate", toDate));
            if (departmentId.HasValue)
                command.Parameters.Add(new SqlParameter("@departmentId", departmentId.Value));

            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                results.Add(new BloodIssueReceiptDto
                {
                    Id = reader.GetGuid(reader.GetOrdinal("Id")),
                    ReceiptCode = reader["ReceiptCode"]?.ToString(),
                    IssueDate = reader.GetDateTime(reader.GetOrdinal("IssueDate")),
                    DepartmentId = reader.IsDBNull(reader.GetOrdinal("DepartmentId")) ? Guid.Empty : reader.GetGuid(reader.GetOrdinal("DepartmentId")),
                    RequestedBy = reader["RequestedBy"]?.ToString(),
                    IssuedBy = reader["IssuedBy"]?.ToString(),
                    Status = reader["Status"]?.ToString(),
                    TotalBags = reader.IsDBNull(reader.GetOrdinal("TotalBags")) ? 0 : reader.GetInt32(reader.GetOrdinal("TotalBags")),
                    Note = reader["Note"]?.ToString(),
                    CreatedAt = reader.GetDateTime(reader.GetOrdinal("CreatedAt")),
                    Items = new List<BloodIssueItemDto>()
                });
            }
            return results;
        }

        public async Task<byte[]> PrintIssueReceiptAsync(Guid receiptId)
        {
            var receipt = await GetIssueReceiptByIdAsync(receiptId);
            if (receipt == null) return Encoding.UTF8.GetBytes("<html><body>Not found</body></html>");

            var sb = new StringBuilder();
            sb.AppendLine("<!DOCTYPE html><html><head><meta charset='utf-8'/><title>Phieu xuat mau</title>");
            sb.AppendLine("<style>body{font-family:Arial;margin:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:6px;text-align:left}th{background:#f0f0f0}</style></head><body>");
            sb.AppendLine("<h2 style='text-align:center'>PHIEU XUAT KHO MAU</h2>");
            sb.AppendLine($"<p><strong>Ma phieu:</strong> {receipt.ReceiptCode}</p>");
            sb.AppendLine($"<p><strong>Ngay xuat:</strong> {receipt.IssueDate:dd/MM/yyyy}</p>");
            sb.AppendLine($"<p><strong>Nguoi yeu cau:</strong> {receipt.RequestedBy}</p>");
            sb.AppendLine($"<p><strong>Nguoi xuat:</strong> {receipt.IssuedBy}</p>");
            sb.AppendLine("<table><tr><th>STT</th><th>Ma tui</th><th>Nhom mau</th><th>Rh</th><th>Loai CP</th><th>The tich</th><th>Han dung</th><th>Benh nhan</th></tr>");
            int stt = 1;
            foreach (var item in receipt.Items)
            {
                sb.AppendLine($"<tr><td>{stt++}</td><td>{item.BagCode}</td><td>{item.BloodType}</td><td>{item.RhFactor}</td><td>{item.ProductTypeName}</td><td>{item.Volume}</td><td>{item.ExpiryDate:dd/MM/yyyy}</td><td>{item.PatientName}</td></tr>");
            }
            sb.AppendLine($"</table><p><strong>Tong so tui:</strong> {receipt.TotalBags}</p>");
            sb.AppendLine($"<p><strong>Ghi chu:</strong> {receipt.Note}</p>");
            sb.AppendLine("<div style='margin-top:40px;display:flex;justify-content:space-around'><div style='text-align:center'><p><strong>Nguoi xuat</strong></p></div><div style='text-align:center'><p><strong>Nguoi nhan</strong></p></div></div>");
            sb.AppendLine("</body></html>");
            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        #endregion
    }
}
