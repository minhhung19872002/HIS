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
    public class BloodBankCompleteService : IBloodBankCompleteService
    {
        private readonly HISDbContext _context;
        private readonly IConfiguration _configuration;

        public BloodBankCompleteService(HISDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        #region 1-2. Import Receipts

        public async Task<List<BloodImportReceiptDto>> GetImportReceiptsAsync(
            DateTime fromDate, DateTime toDate, Guid? supplierId = null, string status = null)
        {
            var results = new List<BloodImportReceiptDto>();
            using var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();
            using var command = connection.CreateCommand();

            var sql = @"SELECT r.Id, r.ReceiptCode, r.ReceiptDate, r.SupplierId,
                s.Name AS SupplierName, s.Address AS SupplierAddress,
                r.DeliveryPerson, r.ReceiverName, r.Status, r.TotalBags,
                r.TotalAmount, r.Note, r.CreatedAt, r.CreatedBy
                FROM BloodImportReceipts r
                LEFT JOIN BloodSuppliers s ON r.SupplierId = s.Id
                WHERE r.ReceiptDate >= @fromDate AND r.ReceiptDate <= @toDate";

            if (supplierId.HasValue)
                sql += " AND r.SupplierId = @supplierId";
            if (!string.IsNullOrEmpty(status))
                sql += " AND r.Status = @status";
            sql += " ORDER BY r.ReceiptDate DESC";

            command.CommandText = sql;
            command.Parameters.Add(new SqlParameter("@fromDate", fromDate));
            command.Parameters.Add(new SqlParameter("@toDate", toDate));
            if (supplierId.HasValue)
                command.Parameters.Add(new SqlParameter("@supplierId", supplierId.Value));
            if (!string.IsNullOrEmpty(status))
                command.Parameters.Add(new SqlParameter("@status", status));

            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                results.Add(new BloodImportReceiptDto
                {
                    Id = reader.GetGuid(reader.GetOrdinal("Id")),
                    ReceiptCode = reader["ReceiptCode"]?.ToString(),
                    ReceiptDate = reader.GetDateTime(reader.GetOrdinal("ReceiptDate")),
                    SupplierId = reader.GetGuid(reader.GetOrdinal("SupplierId")),
                    SupplierName = reader["SupplierName"]?.ToString(),
                    SupplierAddress = reader["SupplierAddress"]?.ToString(),
                    DeliveryPerson = reader["DeliveryPerson"]?.ToString(),
                    ReceiverName = reader["ReceiverName"]?.ToString(),
                    Status = reader["Status"]?.ToString(),
                    TotalBags = reader.IsDBNull(reader.GetOrdinal("TotalBags")) ? 0 : reader.GetInt32(reader.GetOrdinal("TotalBags")),
                    TotalAmount = reader.IsDBNull(reader.GetOrdinal("TotalAmount")) ? 0 : reader.GetDecimal(reader.GetOrdinal("TotalAmount")),
                    Note = reader["Note"]?.ToString(),
                    CreatedAt = reader.GetDateTime(reader.GetOrdinal("CreatedAt")),
                    CreatedBy = reader["CreatedBy"]?.ToString(),
                    Items = new List<BloodImportItemDto>()
                });
            }
            return results;
        }

        public async Task<BloodImportReceiptDto> GetImportReceiptAsync(Guid receiptId)
        {
            BloodImportReceiptDto receipt = null;
            using var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();

            using (var cmd = connection.CreateCommand())
            {
                cmd.CommandText = @"SELECT r.Id, r.ReceiptCode, r.ReceiptDate, r.SupplierId,
                    s.Name AS SupplierName, s.Address AS SupplierAddress,
                    r.DeliveryPerson, r.ReceiverName, r.Status, r.TotalBags,
                    r.TotalAmount, r.Note, r.CreatedAt, r.CreatedBy
                    FROM BloodImportReceipts r
                    LEFT JOIN BloodSuppliers s ON r.SupplierId = s.Id
                    WHERE r.Id = @receiptId";
                cmd.Parameters.Add(new SqlParameter("@receiptId", receiptId));

                using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    receipt = new BloodImportReceiptDto
                    {
                        Id = reader.GetGuid(reader.GetOrdinal("Id")),
                        ReceiptCode = reader["ReceiptCode"]?.ToString(),
                        ReceiptDate = reader.GetDateTime(reader.GetOrdinal("ReceiptDate")),
                        SupplierId = reader.GetGuid(reader.GetOrdinal("SupplierId")),
                        SupplierName = reader["SupplierName"]?.ToString(),
                        SupplierAddress = reader["SupplierAddress"]?.ToString(),
                        DeliveryPerson = reader["DeliveryPerson"]?.ToString(),
                        ReceiverName = reader["ReceiverName"]?.ToString(),
                        Status = reader["Status"]?.ToString(),
                        TotalBags = reader.IsDBNull(reader.GetOrdinal("TotalBags")) ? 0 : reader.GetInt32(reader.GetOrdinal("TotalBags")),
                        TotalAmount = reader.IsDBNull(reader.GetOrdinal("TotalAmount")) ? 0 : reader.GetDecimal(reader.GetOrdinal("TotalAmount")),
                        Note = reader["Note"]?.ToString(),
                        CreatedAt = reader.GetDateTime(reader.GetOrdinal("CreatedAt")),
                        CreatedBy = reader["CreatedBy"]?.ToString(),
                        Items = new List<BloodImportItemDto>()
                    };
                }
            }

            if (receipt == null) return null;

            using (var cmd2 = connection.CreateCommand())
            {
                cmd2.CommandText = @"SELECT i.Id, i.BagCode, i.Barcode, i.BloodType, i.RhFactor,
                    i.ProductTypeId, pt.Name AS ProductTypeName, i.Volume, pt.Unit,
                    i.CollectionDate, i.ExpiryDate, i.DonorCode, i.Price, i.Amount, i.TestResults
                    FROM BloodImportItems i
                    LEFT JOIN BloodProductTypes pt ON i.ProductTypeId = pt.Id
                    WHERE i.ReceiptId = @receiptId";
                cmd2.Parameters.Add(new SqlParameter("@receiptId", receiptId));

                using var reader2 = await cmd2.ExecuteReaderAsync();
                while (await reader2.ReadAsync())
                {
                    receipt.Items.Add(new BloodImportItemDto
                    {
                        Id = reader2.GetGuid(reader2.GetOrdinal("Id")),
                        BagCode = reader2["BagCode"]?.ToString(),
                        Barcode = reader2["Barcode"]?.ToString(),
                        BloodType = reader2["BloodType"]?.ToString(),
                        RhFactor = reader2["RhFactor"]?.ToString(),
                        ProductTypeId = reader2.GetGuid(reader2.GetOrdinal("ProductTypeId")),
                        ProductTypeName = reader2["ProductTypeName"]?.ToString(),
                        Volume = reader2.IsDBNull(reader2.GetOrdinal("Volume")) ? 0 : reader2.GetDecimal(reader2.GetOrdinal("Volume")),
                        Unit = reader2["Unit"]?.ToString(),
                        CollectionDate = reader2.GetDateTime(reader2.GetOrdinal("CollectionDate")),
                        ExpiryDate = reader2.GetDateTime(reader2.GetOrdinal("ExpiryDate")),
                        DonorCode = reader2["DonorCode"]?.ToString(),
                        Price = reader2.IsDBNull(reader2.GetOrdinal("Price")) ? 0 : reader2.GetDecimal(reader2.GetOrdinal("Price")),
                        Amount = reader2.IsDBNull(reader2.GetOrdinal("Amount")) ? 0 : reader2.GetDecimal(reader2.GetOrdinal("Amount")),
                        TestResults = reader2["TestResults"]?.ToString()
                    });
                }
            }
            return receipt;
        }

        public async Task<BloodImportReceiptDto> CreateImportReceiptAsync(CreateBloodImportDto dto)
        {
            var receiptId = Guid.NewGuid();
            var receiptCode = $"IMP{DateTime.Now:yyyyMMddHHmmss}";
            var totalBags = dto.Items?.Count ?? 0;
            var totalAmount = dto.Items?.Sum(i => i.Price * i.Volume) ?? 0;

            await _context.Database.ExecuteSqlRawAsync(
                @"INSERT INTO BloodImportReceipts (Id, ReceiptCode, ReceiptDate, SupplierId, DeliveryPerson, ReceiverName, Status, TotalBags, TotalAmount, Note, CreatedAt, CreatedBy)
                VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10, @p11)",
                receiptId, receiptCode, dto.ReceiptDate, dto.SupplierId,
                dto.DeliveryPerson ?? (object)DBNull.Value, "System",
                "Draft", totalBags, totalAmount,
                dto.Note ?? (object)DBNull.Value, DateTime.Now, "System");

            if (dto.Items != null)
            {
                foreach (var item in dto.Items)
                {
                    var itemId = Guid.NewGuid();
                    var bagId = Guid.NewGuid();
                    var barcode = item.Barcode ?? $"BB{DateTime.Now:yyyyMMddHHmmss}{Guid.NewGuid().ToString("N").Substring(0, 6).ToUpper()}";
                    var amount = item.Price * item.Volume;

                    await _context.Database.ExecuteSqlRawAsync(
                        @"INSERT INTO BloodImportItems (Id, ReceiptId, BloodBagId, BagCode, Barcode, BloodType, RhFactor, ProductTypeId, Volume, Unit, CollectionDate, ExpiryDate, DonorCode, Price, Amount, TestResults)
                        VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10, @p11, @p12, @p13, @p14, @p15)",
                        itemId, receiptId, bagId, item.BagCode, barcode,
                        item.BloodType, item.RhFactor, item.ProductTypeId,
                        item.Volume, "mL", item.CollectionDate, item.ExpiryDate,
                        item.DonorCode ?? (object)DBNull.Value, item.Price, amount,
                        item.TestResults ?? (object)DBNull.Value);

                    await _context.Database.ExecuteSqlRawAsync(
                        @"INSERT INTO BloodBags (Id, BagCode, Barcode, BloodType, RhFactor, ProductTypeId, Volume, Unit, CollectionDate, ExpiryDate, DonorCode, DonorName, SupplierId, Status, StorageLocation, Temperature, TestResults, IsTestPassed, Note, CreatedAt, CreatedBy)
                        VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10, @p11, @p12, @p13, @p14, @p15, @p16, @p17, @p18, @p19, @p20)",
                        bagId, item.BagCode, barcode, item.BloodType, item.RhFactor,
                        item.ProductTypeId, item.Volume, "mL",
                        item.CollectionDate, item.ExpiryDate,
                        item.DonorCode ?? (object)DBNull.Value, (object)DBNull.Value,
                        dto.SupplierId, "Available", "Kho mau",
                        (object)DBNull.Value, item.TestResults ?? (object)DBNull.Value,
                        true, (object)DBNull.Value, DateTime.Now, "System");
                }
            }
            return await GetImportReceiptAsync(receiptId);
        }

        public async Task<BloodImportReceiptDto> UpdateImportReceiptAsync(Guid receiptId, CreateBloodImportDto dto)
        {
            var totalBags = dto.Items?.Count ?? 0;
            var totalAmount = dto.Items?.Sum(i => i.Price * i.Volume) ?? 0;

            await _context.Database.ExecuteSqlRawAsync(
                @"UPDATE BloodImportReceipts SET ReceiptDate=@p0, SupplierId=@p1, DeliveryPerson=@p2, Note=@p3, TotalBags=@p4, TotalAmount=@p5
                WHERE Id=@p6 AND Status='Draft'",
                dto.ReceiptDate, dto.SupplierId, dto.DeliveryPerson ?? (object)DBNull.Value,
                dto.Note ?? (object)DBNull.Value, totalBags, totalAmount, receiptId);

            await _context.Database.ExecuteSqlRawAsync(
                "DELETE FROM BloodImportItems WHERE ReceiptId=@p0", receiptId);

            if (dto.Items != null)
            {
                foreach (var item in dto.Items)
                {
                    var itemId = Guid.NewGuid();
                    var bagId = Guid.NewGuid();
                    var barcode = item.Barcode ?? $"BB{DateTime.Now:yyyyMMddHHmmss}{Guid.NewGuid().ToString("N").Substring(0, 6).ToUpper()}";
                    var amount = item.Price * item.Volume;

                    await _context.Database.ExecuteSqlRawAsync(
                        @"INSERT INTO BloodImportItems (Id, ReceiptId, BloodBagId, BagCode, Barcode, BloodType, RhFactor, ProductTypeId, Volume, Unit, CollectionDate, ExpiryDate, DonorCode, Price, Amount, TestResults)
                        VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10, @p11, @p12, @p13, @p14, @p15)",
                        itemId, receiptId, bagId, item.BagCode, barcode,
                        item.BloodType, item.RhFactor, item.ProductTypeId,
                        item.Volume, "mL", item.CollectionDate, item.ExpiryDate,
                        item.DonorCode ?? (object)DBNull.Value, item.Price, amount,
                        item.TestResults ?? (object)DBNull.Value);
                }
            }
            return await GetImportReceiptAsync(receiptId);
        }

        public async Task<bool> ConfirmImportReceiptAsync(Guid receiptId)
        {
            var rows = await _context.Database.ExecuteSqlRawAsync(
                "UPDATE BloodImportReceipts SET Status='Confirmed' WHERE Id=@p0 AND Status='Draft'",
                receiptId);
            return rows > 0;
        }

        public async Task<bool> CancelImportReceiptAsync(Guid receiptId, string reason)
        {
            var rows = await _context.Database.ExecuteSqlRawAsync(
                "UPDATE BloodImportReceipts SET Status='Cancelled', Note=@p0 WHERE Id=@p1 AND Status='Draft'",
                reason ?? "", receiptId);
            return rows > 0;
        }

        public async Task<byte[]> PrintImportReceiptAsync(Guid receiptId)
        {
            var receipt = await GetImportReceiptAsync(receiptId);
            if (receipt == null) return Encoding.UTF8.GetBytes("<html><body>Not found</body></html>");

            var sb = new StringBuilder();
            sb.AppendLine("<!DOCTYPE html><html><head><meta charset='utf-8'/><title>Phieu nhap mau</title>");
            sb.AppendLine("<style>body{font-family:Arial;margin:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:6px;text-align:left}th{background:#f0f0f0}</style></head><body>");
            sb.AppendLine("<h2 style='text-align:center'>PHIEU NHAP MAU TU NHA CUNG CAP</h2>");
            sb.AppendLine($"<p><strong>Ma phieu:</strong> {receipt.ReceiptCode}</p>");
            sb.AppendLine($"<p><strong>Ngay nhap:</strong> {receipt.ReceiptDate:dd/MM/yyyy}</p>");
            sb.AppendLine($"<p><strong>Nha cung cap:</strong> {receipt.SupplierName}</p>");
            sb.AppendLine($"<p><strong>Nguoi giao:</strong> {receipt.DeliveryPerson}</p>");
            sb.AppendLine($"<p><strong>Nguoi nhan:</strong> {receipt.ReceiverName}</p>");
            sb.AppendLine("<table><tr><th>STT</th><th>Ma tui</th><th>Nhom mau</th><th>Rh</th><th>Loai CP</th><th>The tich (mL)</th><th>Ngay thu</th><th>Han dung</th><th>Don gia</th><th>Thanh tien</th></tr>");
            int stt = 1;
            foreach (var item in receipt.Items)
            {
                sb.AppendLine($"<tr><td>{stt++}</td><td>{item.BagCode}</td><td>{item.BloodType}</td><td>{item.RhFactor}</td><td>{item.ProductTypeName}</td><td>{item.Volume}</td><td>{item.CollectionDate:dd/MM/yyyy}</td><td>{item.ExpiryDate:dd/MM/yyyy}</td><td>{item.Price:N0}</td><td>{item.Amount:N0}</td></tr>");
            }
            sb.AppendLine($"</table><p><strong>Tong so tui:</strong> {receipt.TotalBags} | <strong>Tong tien:</strong> {receipt.TotalAmount:N0}</p>");
            sb.AppendLine($"<p><strong>Ghi chu:</strong> {receipt.Note}</p>");
            sb.AppendLine("<div style='margin-top:40px;display:flex;justify-content:space-around'><div style='text-align:center'><p><strong>Nguoi giao</strong></p><br/><br/></div><div style='text-align:center'><p><strong>Nguoi nhan</strong></p><br/><br/></div><div style='text-align:center'><p><strong>Thu kho</strong></p><br/><br/></div></div>");
            sb.AppendLine("</body></html>");
            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        #endregion

        #region 3. Issue Requests

        public async Task<List<BloodIssueRequestDto>> GetIssueRequestsAsync(
            DateTime fromDate, DateTime toDate, Guid? departmentId = null, string status = null)
        {
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

        #region 4. Blood Stock

        public async Task<List<BloodStockDto>> GetBloodStockAsync(
            string bloodType = null, string rhFactor = null, Guid? productTypeId = null)
        {
            var results = new List<BloodStockDto>();
            using var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();
            using var command = connection.CreateCommand();

            var sql = @"SELECT b.BloodType, b.RhFactor, b.ProductTypeId, pt.Name AS ProductTypeName,
                COUNT(*) AS TotalBags,
                SUM(CASE WHEN b.Status='Available' THEN 1 ELSE 0 END) AS AvailableBags,
                SUM(CASE WHEN b.Status='Reserved' THEN 1 ELSE 0 END) AS ReservedBags,
                SUM(CASE WHEN b.Status='Available' AND b.ExpiryDate <= DATEADD(day,7,GETDATE()) AND b.ExpiryDate > GETDATE() THEN 1 ELSE 0 END) AS ExpiringWithin7Days,
                SUM(CASE WHEN b.ExpiryDate <= GETDATE() AND b.Status NOT IN ('Destroyed','Expired') THEN 1 ELSE 0 END) AS ExpiredBags,
                SUM(b.Volume) AS TotalVolume
                FROM BloodBags b
                LEFT JOIN BloodProductTypes pt ON b.ProductTypeId = pt.Id
                WHERE b.Status NOT IN ('Destroyed','Transfused')";

            if (!string.IsNullOrEmpty(bloodType))
                sql += " AND b.BloodType = @bloodType";
            if (!string.IsNullOrEmpty(rhFactor))
                sql += " AND b.RhFactor = @rhFactor";
            if (productTypeId.HasValue)
                sql += " AND b.ProductTypeId = @productTypeId";
            sql += " GROUP BY b.BloodType, b.RhFactor, b.ProductTypeId, pt.Name ORDER BY b.BloodType, b.RhFactor";

            command.CommandText = sql;
            if (!string.IsNullOrEmpty(bloodType))
                command.Parameters.Add(new SqlParameter("@bloodType", bloodType));
            if (!string.IsNullOrEmpty(rhFactor))
                command.Parameters.Add(new SqlParameter("@rhFactor", rhFactor));
            if (productTypeId.HasValue)
                command.Parameters.Add(new SqlParameter("@productTypeId", productTypeId.Value));

            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                results.Add(new BloodStockDto
                {
                    BloodType = reader["BloodType"]?.ToString(),
                    RhFactor = reader["RhFactor"]?.ToString(),
                    ProductTypeId = reader.GetGuid(reader.GetOrdinal("ProductTypeId")),
                    ProductTypeName = reader["ProductTypeName"]?.ToString(),
                    TotalBags = reader.GetInt32(reader.GetOrdinal("TotalBags")),
                    AvailableBags = reader.GetInt32(reader.GetOrdinal("AvailableBags")),
                    ReservedBags = reader.GetInt32(reader.GetOrdinal("ReservedBags")),
                    ExpiringWithin7Days = reader.GetInt32(reader.GetOrdinal("ExpiringWithin7Days")),
                    ExpiredBags = reader.GetInt32(reader.GetOrdinal("ExpiredBags")),
                    TotalVolume = reader.GetDecimal(reader.GetOrdinal("TotalVolume"))
                });
            }
            return results;
        }

        public async Task<List<BloodStockDetailDto>> GetBloodStockDetailAsync(
            string bloodType = null, string rhFactor = null, Guid? productTypeId = null, string status = null)
        {
            return await GetBloodStockDetailInternalAsync(bloodType, rhFactor, productTypeId, status, null, false);
        }

        public async Task<BloodBagDto> GetBloodBagAsync(Guid bloodBagId)
        {
            using var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();
            using var command = connection.CreateCommand();
            command.CommandText = @"SELECT b.*, pt.Name AS ProductTypeName, s.Name AS SupplierName
                FROM BloodBags b
                LEFT JOIN BloodProductTypes pt ON b.ProductTypeId = pt.Id
                LEFT JOIN BloodSuppliers s ON b.SupplierId = s.Id
                WHERE b.Id = @id";
            command.Parameters.Add(new SqlParameter("@id", bloodBagId));

            using var reader = await command.ExecuteReaderAsync();
            if (await reader.ReadAsync())
                return ReadBloodBagFromReader(reader);
            return null;
        }

        public async Task<bool> UpdateBloodBagStatusAsync(Guid bloodBagId, string status, string reason = null)
        {
            var rows = await _context.Database.ExecuteSqlRawAsync(
                "UPDATE BloodBags SET Status=@p0, Note=@p1 WHERE Id=@p2",
                status, reason ?? (object)DBNull.Value, bloodBagId);
            return rows > 0;
        }

        public async Task<List<BloodStockDetailDto>> GetExpiringBloodBagsAsync(int daysUntilExpiry = 7)
        {
            return await GetBloodStockDetailInternalAsync(null, null, null, "Available", daysUntilExpiry, false);
        }

        public async Task<List<BloodStockDetailDto>> GetExpiredBloodBagsAsync()
        {
            return await GetBloodStockDetailInternalAsync(null, null, null, null, null, true);
        }

        public async Task<bool> DestroyExpiredBloodBagsAsync(List<Guid> bloodBagIds, string reason)
        {
            if (bloodBagIds == null || !bloodBagIds.Any()) return false;
            foreach (var id in bloodBagIds)
            {
                await _context.Database.ExecuteSqlRawAsync(
                    "UPDATE BloodBags SET Status='Destroyed', Note=@p0 WHERE Id=@p1",
                    reason ?? "Het han", id);
            }
            return true;
        }

        #endregion

        #region 5. Inventory

        public async Task<List<BloodInventoryDto>> GetInventoriesAsync(
            DateTime fromDate, DateTime toDate, string status = null)
        {
            var results = new List<BloodInventoryDto>();
            using var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();
            using var command = connection.CreateCommand();

            var sql = @"SELECT Id, InventoryCode, InventoryDate, Status, ConductedBy, ApprovedBy, ApprovedDate,
                TotalBagsSystem, TotalBagsActual, Variance, Note
                FROM BloodInventories
                WHERE InventoryDate >= @fromDate AND InventoryDate <= @toDate";
            if (!string.IsNullOrEmpty(status))
                sql += " AND Status = @status";
            sql += " ORDER BY InventoryDate DESC";

            command.CommandText = sql;
            command.Parameters.Add(new SqlParameter("@fromDate", fromDate));
            command.Parameters.Add(new SqlParameter("@toDate", toDate));
            if (!string.IsNullOrEmpty(status))
                command.Parameters.Add(new SqlParameter("@status", status));

            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                results.Add(ReadInventoryFromReader(reader));
            }
            return results;
        }

        public async Task<BloodInventoryDto> GetInventoryAsync(Guid inventoryId)
        {
            BloodInventoryDto inv = null;
            using var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();

            using (var cmd = connection.CreateCommand())
            {
                cmd.CommandText = @"SELECT Id, InventoryCode, InventoryDate, Status, ConductedBy, ApprovedBy, ApprovedDate,
                    TotalBagsSystem, TotalBagsActual, Variance, Note
                    FROM BloodInventories WHERE Id = @id";
                cmd.Parameters.Add(new SqlParameter("@id", inventoryId));

                using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                    inv = ReadInventoryFromReader(reader);
            }

            if (inv == null) return null;

            using (var cmd2 = connection.CreateCommand())
            {
                cmd2.CommandText = @"SELECT Id, BloodType, RhFactor, ProductTypeName,
                    SystemQuantity, ActualQuantity, Variance, Note
                    FROM BloodInventoryItems WHERE InventoryId = @id";
                cmd2.Parameters.Add(new SqlParameter("@id", inventoryId));

                inv.Items = new List<BloodInventoryItemDto>();
                using var reader2 = await cmd2.ExecuteReaderAsync();
                while (await reader2.ReadAsync())
                {
                    inv.Items.Add(new BloodInventoryItemDto
                    {
                        Id = reader2.GetGuid(reader2.GetOrdinal("Id")),
                        BloodType = reader2["BloodType"]?.ToString(),
                        RhFactor = reader2["RhFactor"]?.ToString(),
                        ProductTypeName = reader2["ProductTypeName"]?.ToString(),
                        SystemQuantity = reader2.IsDBNull(reader2.GetOrdinal("SystemQuantity")) ? 0 : reader2.GetInt32(reader2.GetOrdinal("SystemQuantity")),
                        ActualQuantity = reader2.IsDBNull(reader2.GetOrdinal("ActualQuantity")) ? 0 : reader2.GetInt32(reader2.GetOrdinal("ActualQuantity")),
                        Variance = reader2.IsDBNull(reader2.GetOrdinal("Variance")) ? 0 : reader2.GetInt32(reader2.GetOrdinal("Variance")),
                        Note = reader2["Note"]?.ToString()
                    });
                }
            }
            return inv;
        }

        public async Task<BloodInventoryDto> CreateInventoryAsync(CreateBloodInventoryDto dto)
        {
            var id = Guid.NewGuid();
            var code = $"INV{DateTime.Now:yyyyMMddHHmmss}";
            var totalSystem = 0;
            var totalActual = dto.Items?.Sum(i => i.ActualQuantity) ?? 0;

            await _context.Database.ExecuteSqlRawAsync(
                @"INSERT INTO BloodInventories (Id, InventoryCode, InventoryDate, Status, ConductedBy, ApprovedBy, ApprovedDate, TotalBagsSystem, TotalBagsActual, Variance, Note)
                VALUES (@p0, @p1, @p2, 'Draft', 'System', NULL, NULL, @p3, @p4, @p5, @p6)",
                id, code, dto.InventoryDate, totalSystem, totalActual, totalActual - totalSystem,
                dto.Note ?? (object)DBNull.Value);

            if (dto.Items != null)
            {
                foreach (var item in dto.Items)
                {
                    var itemId = Guid.NewGuid();
                    var ptName = await GetProductTypeNameAsync(item.ProductTypeId);
                    var sysQty = await GetSystemQuantityAsync(item.BloodType, item.RhFactor, item.ProductTypeId);

                    await _context.Database.ExecuteSqlRawAsync(
                        @"INSERT INTO BloodInventoryItems (Id, InventoryId, BloodType, RhFactor, ProductTypeName, SystemQuantity, ActualQuantity, Variance, Note)
                        VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8)",
                        itemId, id, item.BloodType, item.RhFactor, ptName,
                        sysQty, item.ActualQuantity, item.ActualQuantity - sysQty,
                        item.Note ?? (object)DBNull.Value);
                }
            }
            return await GetInventoryAsync(id);
        }

        public async Task<BloodInventoryDto> UpdateInventoryAsync(Guid inventoryId, CreateBloodInventoryDto dto)
        {
            var totalActual = dto.Items?.Sum(i => i.ActualQuantity) ?? 0;

            await _context.Database.ExecuteSqlRawAsync(
                @"UPDATE BloodInventories SET InventoryDate=@p0, Note=@p1, TotalBagsActual=@p2
                WHERE Id=@p3 AND Status='Draft'",
                dto.InventoryDate, dto.Note ?? (object)DBNull.Value, totalActual, inventoryId);

            await _context.Database.ExecuteSqlRawAsync(
                "DELETE FROM BloodInventoryItems WHERE InventoryId=@p0", inventoryId);

            if (dto.Items != null)
            {
                foreach (var item in dto.Items)
                {
                    var itemId = Guid.NewGuid();
                    var ptName = await GetProductTypeNameAsync(item.ProductTypeId);
                    var sysQty = await GetSystemQuantityAsync(item.BloodType, item.RhFactor, item.ProductTypeId);

                    await _context.Database.ExecuteSqlRawAsync(
                        @"INSERT INTO BloodInventoryItems (Id, InventoryId, BloodType, RhFactor, ProductTypeName, SystemQuantity, ActualQuantity, Variance, Note)
                        VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8)",
                        itemId, inventoryId, item.BloodType, item.RhFactor, ptName,
                        sysQty, item.ActualQuantity, item.ActualQuantity - sysQty,
                        item.Note ?? (object)DBNull.Value);
                }
            }
            return await GetInventoryAsync(inventoryId);
        }

        public async Task<bool> CompleteInventoryAsync(Guid inventoryId)
        {
            var rows = await _context.Database.ExecuteSqlRawAsync(
                "UPDATE BloodInventories SET Status='Completed' WHERE Id=@p0 AND Status IN ('Draft','InProgress')",
                inventoryId);
            return rows > 0;
        }

        public async Task<bool> ApproveInventoryAsync(Guid inventoryId)
        {
            var rows = await _context.Database.ExecuteSqlRawAsync(
                "UPDATE BloodInventories SET Status='Approved', ApprovedBy='System', ApprovedDate=@p0 WHERE Id=@p1 AND Status='Completed'",
                DateTime.Now, inventoryId);
            return rows > 0;
        }

        #endregion

        #region 6. Reports

        public async Task<BloodStockCardDto> GetStockCardAsync(
            string bloodType, string rhFactor, Guid productTypeId, DateTime fromDate, DateTime toDate)
        {
            var ptName = await GetProductTypeNameAsync(productTypeId);
            var transactions = new List<BloodStockCardTransactionDto>();

            using var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();

            // Get imports
            using (var cmd = connection.CreateCommand())
            {
                cmd.CommandText = @"SELECT r.ReceiptDate AS TransactionDate, r.ReceiptCode AS DocumentCode, COUNT(*) AS Quantity
                    FROM BloodImportItems i
                    INNER JOIN BloodImportReceipts r ON i.ReceiptId = r.Id
                    WHERE i.BloodType = @bt AND i.RhFactor = @rh AND i.ProductTypeId = @pt
                    AND r.ReceiptDate >= @from AND r.ReceiptDate <= @to AND r.Status = 'Confirmed'
                    GROUP BY r.ReceiptDate, r.ReceiptCode ORDER BY r.ReceiptDate";
                cmd.Parameters.Add(new SqlParameter("@bt", bloodType));
                cmd.Parameters.Add(new SqlParameter("@rh", rhFactor));
                cmd.Parameters.Add(new SqlParameter("@pt", productTypeId));
                cmd.Parameters.Add(new SqlParameter("@from", fromDate));
                cmd.Parameters.Add(new SqlParameter("@to", toDate));

                using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    transactions.Add(new BloodStockCardTransactionDto
                    {
                        TransactionDate = reader.GetDateTime(reader.GetOrdinal("TransactionDate")),
                        TransactionType = "Import",
                        DocumentCode = reader["DocumentCode"]?.ToString(),
                        Description = "Nhap mau tu NCC",
                        Quantity = reader.GetInt32(reader.GetOrdinal("Quantity")),
                        Balance = 0
                    });
                }
            }

            // Get exports
            using (var cmd2 = connection.CreateCommand())
            {
                cmd2.CommandText = @"SELECT r.IssueDate AS TransactionDate, r.ReceiptCode AS DocumentCode, COUNT(*) AS Quantity
                    FROM BloodIssueItems i
                    INNER JOIN BloodIssueReceipts r ON i.ReceiptId = r.Id
                    WHERE i.BloodType = @bt AND i.RhFactor = @rh AND i.ProductTypeName = @ptName
                    AND r.IssueDate >= @from AND r.IssueDate <= @to
                    GROUP BY r.IssueDate, r.ReceiptCode ORDER BY r.IssueDate";
                cmd2.Parameters.Add(new SqlParameter("@bt", bloodType));
                cmd2.Parameters.Add(new SqlParameter("@rh", rhFactor));
                cmd2.Parameters.Add(new SqlParameter("@ptName", ptName));
                cmd2.Parameters.Add(new SqlParameter("@from", fromDate));
                cmd2.Parameters.Add(new SqlParameter("@to", toDate));

                using var reader2 = await cmd2.ExecuteReaderAsync();
                while (await reader2.ReadAsync())
                {
                    transactions.Add(new BloodStockCardTransactionDto
                    {
                        TransactionDate = reader2.GetDateTime(reader2.GetOrdinal("TransactionDate")),
                        TransactionType = "Export",
                        DocumentCode = reader2["DocumentCode"]?.ToString(),
                        Description = "Xuat mau cho khoa",
                        Quantity = reader2.GetInt32(reader2.GetOrdinal("Quantity")),
                        Balance = 0
                    });
                }
            }

            transactions = transactions.OrderBy(t => t.TransactionDate).ToList();
            int totalImport = transactions.Where(t => t.TransactionType == "Import").Sum(t => t.Quantity);
            int totalExport = transactions.Where(t => t.TransactionType == "Export").Sum(t => t.Quantity);

            // Calculate running balance
            int balance = 0;
            foreach (var t in transactions)
            {
                balance += t.TransactionType == "Import" ? t.Quantity : -t.Quantity;
                t.Balance = balance;
            }

            return new BloodStockCardDto
            {
                BloodType = bloodType,
                RhFactor = rhFactor,
                ProductTypeName = ptName,
                FromDate = fromDate,
                ToDate = toDate,
                OpeningBalance = 0,
                TotalImport = totalImport,
                TotalExport = totalExport,
                ClosingBalance = totalImport - totalExport,
                Transactions = transactions
            };
        }

        public async Task<BloodInventoryReportDto> GetInventoryReportAsync(DateTime fromDate, DateTime toDate)
        {
            var items = new List<BloodInventoryReportItemDto>();
            using var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();
            using var command = connection.CreateCommand();

            command.CommandText = @"SELECT b.BloodType, b.RhFactor, pt.Name AS ProductTypeName,
                SUM(CASE WHEN b.CreatedAt < @from AND b.Status NOT IN ('Destroyed','Transfused') THEN 1 ELSE 0 END) AS OpeningStock,
                SUM(CASE WHEN b.CreatedAt >= @from AND b.CreatedAt <= @to THEN 1 ELSE 0 END) AS ImportQuantity,
                SUM(CASE WHEN b.Status = 'Issued' THEN 1 ELSE 0 END) AS ExportQuantity,
                SUM(CASE WHEN b.Status = 'Expired' THEN 1 ELSE 0 END) AS ExpiredQuantity,
                SUM(CASE WHEN b.Status = 'Destroyed' THEN 1 ELSE 0 END) AS DestroyedQuantity,
                SUM(CASE WHEN b.Status IN ('Available','Reserved') THEN 1 ELSE 0 END) AS ClosingStock
                FROM BloodBags b
                LEFT JOIN BloodProductTypes pt ON b.ProductTypeId = pt.Id
                GROUP BY b.BloodType, b.RhFactor, pt.Name
                ORDER BY b.BloodType, b.RhFactor";
            command.Parameters.Add(new SqlParameter("@from", fromDate));
            command.Parameters.Add(new SqlParameter("@to", toDate));

            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                items.Add(new BloodInventoryReportItemDto
                {
                    BloodType = reader["BloodType"]?.ToString(),
                    RhFactor = reader["RhFactor"]?.ToString(),
                    ProductTypeName = reader["ProductTypeName"]?.ToString(),
                    OpeningStock = reader.IsDBNull(reader.GetOrdinal("OpeningStock")) ? 0 : reader.GetInt32(reader.GetOrdinal("OpeningStock")),
                    ImportQuantity = reader.IsDBNull(reader.GetOrdinal("ImportQuantity")) ? 0 : reader.GetInt32(reader.GetOrdinal("ImportQuantity")),
                    ExportQuantity = reader.IsDBNull(reader.GetOrdinal("ExportQuantity")) ? 0 : reader.GetInt32(reader.GetOrdinal("ExportQuantity")),
                    ExpiredQuantity = reader.IsDBNull(reader.GetOrdinal("ExpiredQuantity")) ? 0 : reader.GetInt32(reader.GetOrdinal("ExpiredQuantity")),
                    DestroyedQuantity = reader.IsDBNull(reader.GetOrdinal("DestroyedQuantity")) ? 0 : reader.GetInt32(reader.GetOrdinal("DestroyedQuantity")),
                    ClosingStock = reader.IsDBNull(reader.GetOrdinal("ClosingStock")) ? 0 : reader.GetInt32(reader.GetOrdinal("ClosingStock"))
                });
            }

            return new BloodInventoryReportDto
            {
                FromDate = fromDate,
                ToDate = toDate,
                Items = items
            };
        }

        public async Task<byte[]> PrintImportReportAsync(DateTime fromDate, DateTime toDate, Guid? supplierId = null)
        {
            var receipts = await GetImportReceiptsAsync(fromDate, toDate, supplierId);
            var sb = new StringBuilder();
            sb.AppendLine("<!DOCTYPE html><html><head><meta charset='utf-8'/><title>Bao cao nhap mau</title>");
            sb.AppendLine("<style>body{font-family:Arial;margin:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:6px;text-align:left}th{background:#f0f0f0}</style></head><body>");
            sb.AppendLine("<h2 style='text-align:center'>BAO CAO NHAP MAU</h2>");
            sb.AppendLine($"<p>Tu ngay: {fromDate:dd/MM/yyyy} - Den ngay: {toDate:dd/MM/yyyy}</p>");
            sb.AppendLine("<table><tr><th>STT</th><th>Ma phieu</th><th>Ngay nhap</th><th>NCC</th><th>So tui</th><th>Tong tien</th><th>Trang thai</th></tr>");
            int stt = 1;
            foreach (var r in receipts)
            {
                sb.AppendLine($"<tr><td>{stt++}</td><td>{r.ReceiptCode}</td><td>{r.ReceiptDate:dd/MM/yyyy}</td><td>{r.SupplierName}</td><td>{r.TotalBags}</td><td>{r.TotalAmount:N0}</td><td>{r.Status}</td></tr>");
            }
            sb.AppendLine("</table></body></html>");
            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        public async Task<byte[]> PrintExportReportAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null)
        {
            var receipts = await GetIssueReceiptsAsync(fromDate, toDate, departmentId);
            var sb = new StringBuilder();
            sb.AppendLine("<!DOCTYPE html><html><head><meta charset='utf-8'/><title>Bao cao xuat mau</title>");
            sb.AppendLine("<style>body{font-family:Arial;margin:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:6px;text-align:left}th{background:#f0f0f0}</style></head><body>");
            sb.AppendLine("<h2 style='text-align:center'>BAO CAO XUAT MAU</h2>");
            sb.AppendLine($"<p>Tu ngay: {fromDate:dd/MM/yyyy} - Den ngay: {toDate:dd/MM/yyyy}</p>");
            sb.AppendLine("<table><tr><th>STT</th><th>Ma phieu</th><th>Ngay xuat</th><th>So tui</th><th>Trang thai</th></tr>");
            int stt = 1;
            foreach (var r in receipts)
            {
                sb.AppendLine($"<tr><td>{stt++}</td><td>{r.ReceiptCode}</td><td>{r.IssueDate:dd/MM/yyyy}</td><td>{r.TotalBags}</td><td>{r.Status}</td></tr>");
            }
            sb.AppendLine("</table></body></html>");
            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        public async Task<byte[]> PrintInventoryReportAsync(Guid inventoryId)
        {
            var inv = await GetInventoryAsync(inventoryId);
            if (inv == null) return Encoding.UTF8.GetBytes("<html><body>Not found</body></html>");

            var sb = new StringBuilder();
            sb.AppendLine("<!DOCTYPE html><html><head><meta charset='utf-8'/><title>Bien ban kiem ke</title>");
            sb.AppendLine("<style>body{font-family:Arial;margin:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:6px;text-align:left}th{background:#f0f0f0}</style></head><body>");
            sb.AppendLine("<h2 style='text-align:center'>BIEN BAN KIEM KE KHO MAU</h2>");
            sb.AppendLine($"<p><strong>Ma phieu:</strong> {inv.InventoryCode}</p>");
            sb.AppendLine($"<p><strong>Ngay kiem ke:</strong> {inv.InventoryDate:dd/MM/yyyy}</p>");
            sb.AppendLine($"<p><strong>Nguoi thuc hien:</strong> {inv.ConductedBy}</p>");
            sb.AppendLine("<table><tr><th>STT</th><th>Nhom mau</th><th>Rh</th><th>Loai CP</th><th>Ton he thong</th><th>Ton thuc te</th><th>Chenh lech</th><th>Ghi chu</th></tr>");
            int stt = 1;
            if (inv.Items != null)
            {
                foreach (var item in inv.Items)
                {
                    sb.AppendLine($"<tr><td>{stt++}</td><td>{item.BloodType}</td><td>{item.RhFactor}</td><td>{item.ProductTypeName}</td><td>{item.SystemQuantity}</td><td>{item.ActualQuantity}</td><td>{item.Variance}</td><td>{item.Note}</td></tr>");
                }
            }
            sb.AppendLine($"</table><p><strong>Tong he thong:</strong> {inv.TotalBagsSystem} | <strong>Tong thuc te:</strong> {inv.TotalBagsActual} | <strong>Chenh lech:</strong> {inv.Variance}</p>");
            sb.AppendLine("<div style='margin-top:40px;display:flex;justify-content:space-around'><div style='text-align:center'><p><strong>Nguoi kiem ke</strong></p></div><div style='text-align:center'><p><strong>Nguoi duyet</strong></p></div></div>");
            sb.AppendLine("</body></html>");
            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        public async Task<byte[]> PrintStockReportAsync(DateTime fromDate, DateTime toDate)
        {
            var report = await GetInventoryReportAsync(fromDate, toDate);
            var sb = new StringBuilder();
            sb.AppendLine("<!DOCTYPE html><html><head><meta charset='utf-8'/><title>Bao cao nhap xuat ton</title>");
            sb.AppendLine("<style>body{font-family:Arial;margin:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:6px;text-align:left}th{background:#f0f0f0}</style></head><body>");
            sb.AppendLine("<h2 style='text-align:center'>BAO CAO NHAP XUAT TON KHO MAU</h2>");
            sb.AppendLine($"<p>Tu ngay: {fromDate:dd/MM/yyyy} - Den ngay: {toDate:dd/MM/yyyy}</p>");
            sb.AppendLine("<table><tr><th>Nhom mau</th><th>Rh</th><th>Loai CP</th><th>Ton dau</th><th>Nhap</th><th>Xuat</th><th>Het han</th><th>Huy</th><th>Ton cuoi</th></tr>");
            foreach (var item in report.Items)
            {
                sb.AppendLine($"<tr><td>{item.BloodType}</td><td>{item.RhFactor}</td><td>{item.ProductTypeName}</td><td>{item.OpeningStock}</td><td>{item.ImportQuantity}</td><td>{item.ExportQuantity}</td><td>{item.ExpiredQuantity}</td><td>{item.DestroyedQuantity}</td><td>{item.ClosingStock}</td></tr>");
            }
            sb.AppendLine("</table></body></html>");
            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        #endregion

        #region 7. Blood Orders

        public async Task<List<BloodOrderDto>> GetBloodOrdersAsync(
            DateTime fromDate, DateTime toDate, Guid? departmentId = null, Guid? patientId = null, string status = null)
        {
            var results = new List<BloodOrderDto>();
            using var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();
            using var command = connection.CreateCommand();

            var sql = @"SELECT Id, OrderCode, OrderDate, PatientId, PatientCode, PatientName,
                PatientBloodType, PatientRhFactor, VisitId, DepartmentId, DepartmentName,
                OrderDoctorName, Diagnosis, ClinicalIndication, Status, CreatedAt
                FROM BloodOrders
                WHERE OrderDate >= @fromDate AND OrderDate <= @toDate";
            if (departmentId.HasValue) sql += " AND DepartmentId = @departmentId";
            if (patientId.HasValue) sql += " AND PatientId = @patientId";
            if (!string.IsNullOrEmpty(status)) sql += " AND Status = @status";
            sql += " ORDER BY OrderDate DESC";

            command.CommandText = sql;
            command.Parameters.Add(new SqlParameter("@fromDate", fromDate));
            command.Parameters.Add(new SqlParameter("@toDate", toDate));
            if (departmentId.HasValue)
                command.Parameters.Add(new SqlParameter("@departmentId", departmentId.Value));
            if (patientId.HasValue)
                command.Parameters.Add(new SqlParameter("@patientId", patientId.Value));
            if (!string.IsNullOrEmpty(status))
                command.Parameters.Add(new SqlParameter("@status", status));

            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                results.Add(new BloodOrderDto
                {
                    Id = reader.GetGuid(reader.GetOrdinal("Id")),
                    OrderCode = reader["OrderCode"]?.ToString(),
                    OrderDate = reader.GetDateTime(reader.GetOrdinal("OrderDate")),
                    PatientId = reader.GetGuid(reader.GetOrdinal("PatientId")),
                    PatientCode = reader["PatientCode"]?.ToString(),
                    PatientName = reader["PatientName"]?.ToString(),
                    PatientBloodType = reader["PatientBloodType"]?.ToString(),
                    PatientRhFactor = reader["PatientRhFactor"]?.ToString(),
                    VisitId = reader.IsDBNull(reader.GetOrdinal("VisitId")) ? Guid.Empty : reader.GetGuid(reader.GetOrdinal("VisitId")),
                    DepartmentId = reader.IsDBNull(reader.GetOrdinal("DepartmentId")) ? Guid.Empty : reader.GetGuid(reader.GetOrdinal("DepartmentId")),
                    DepartmentName = reader["DepartmentName"]?.ToString(),
                    OrderDoctorName = reader["OrderDoctorName"]?.ToString(),
                    Diagnosis = reader["Diagnosis"]?.ToString(),
                    ClinicalIndication = reader["ClinicalIndication"]?.ToString(),
                    Status = reader["Status"]?.ToString(),
                    CreatedAt = reader.GetDateTime(reader.GetOrdinal("CreatedAt")),
                    Items = new List<BloodOrderItemDto>()
                });
            }
            return results;
        }

        public async Task<BloodOrderDto> GetBloodOrderAsync(Guid orderId)
        {
            BloodOrderDto order = null;
            using var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();

            using (var cmd = connection.CreateCommand())
            {
                cmd.CommandText = @"SELECT Id, OrderCode, OrderDate, PatientId, PatientCode, PatientName,
                    PatientBloodType, PatientRhFactor, VisitId, DepartmentId, DepartmentName,
                    OrderDoctorName, Diagnosis, ClinicalIndication, Status, CreatedAt
                    FROM BloodOrders WHERE Id = @id";
                cmd.Parameters.Add(new SqlParameter("@id", orderId));

                using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    order = new BloodOrderDto
                    {
                        Id = reader.GetGuid(reader.GetOrdinal("Id")),
                        OrderCode = reader["OrderCode"]?.ToString(),
                        OrderDate = reader.GetDateTime(reader.GetOrdinal("OrderDate")),
                        PatientId = reader.GetGuid(reader.GetOrdinal("PatientId")),
                        PatientCode = reader["PatientCode"]?.ToString(),
                        PatientName = reader["PatientName"]?.ToString(),
                        PatientBloodType = reader["PatientBloodType"]?.ToString(),
                        PatientRhFactor = reader["PatientRhFactor"]?.ToString(),
                        VisitId = reader.IsDBNull(reader.GetOrdinal("VisitId")) ? Guid.Empty : reader.GetGuid(reader.GetOrdinal("VisitId")),
                        DepartmentId = reader.IsDBNull(reader.GetOrdinal("DepartmentId")) ? Guid.Empty : reader.GetGuid(reader.GetOrdinal("DepartmentId")),
                        DepartmentName = reader["DepartmentName"]?.ToString(),
                        OrderDoctorName = reader["OrderDoctorName"]?.ToString(),
                        Diagnosis = reader["Diagnosis"]?.ToString(),
                        ClinicalIndication = reader["ClinicalIndication"]?.ToString(),
                        Status = reader["Status"]?.ToString(),
                        CreatedAt = reader.GetDateTime(reader.GetOrdinal("CreatedAt")),
                        Items = new List<BloodOrderItemDto>()
                    };
                }
            }

            if (order == null) return null;

            using (var cmd2 = connection.CreateCommand())
            {
                cmd2.CommandText = @"SELECT Id, ProductTypeId, ProductTypeName, BloodType, RhFactor,
                    OrderedQuantity, IssuedQuantity, TransfusedQuantity, Status, Note
                    FROM BloodOrderItems WHERE OrderId = @id";
                cmd2.Parameters.Add(new SqlParameter("@id", orderId));

                using var reader2 = await cmd2.ExecuteReaderAsync();
                while (await reader2.ReadAsync())
                {
                    var orderItem = new BloodOrderItemDto
                    {
                        Id = reader2.GetGuid(reader2.GetOrdinal("Id")),
                        ProductTypeId = reader2.GetGuid(reader2.GetOrdinal("ProductTypeId")),
                        ProductTypeName = reader2["ProductTypeName"]?.ToString(),
                        BloodType = reader2["BloodType"]?.ToString(),
                        RhFactor = reader2["RhFactor"]?.ToString(),
                        OrderedQuantity = reader2.IsDBNull(reader2.GetOrdinal("OrderedQuantity")) ? 0 : reader2.GetInt32(reader2.GetOrdinal("OrderedQuantity")),
                        IssuedQuantity = reader2.IsDBNull(reader2.GetOrdinal("IssuedQuantity")) ? 0 : reader2.GetInt32(reader2.GetOrdinal("IssuedQuantity")),
                        TransfusedQuantity = reader2.IsDBNull(reader2.GetOrdinal("TransfusedQuantity")) ? 0 : reader2.GetInt32(reader2.GetOrdinal("TransfusedQuantity")),
                        Status = reader2["Status"]?.ToString(),
                        Note = reader2["Note"]?.ToString(),
                        AssignedBags = new List<BloodBagAssignmentDto>()
                    };
                    order.Items.Add(orderItem);
                }
            }

            // Load assigned bags for each order item
            foreach (var item in order.Items)
            {
                using var cmd3 = connection.CreateCommand();
                cmd3.CommandText = @"SELECT BloodBagId, BagCode, BloodType, RhFactor, Volume, ExpiryDate,
                    CrossMatchResult, CrossMatchDate, TransfusionStatus, TransfusionStartTime,
                    TransfusionEndTime, TransfusionNote
                    FROM BloodBagAssignments WHERE OrderItemId = @itemId";
                cmd3.Parameters.Add(new SqlParameter("@itemId", item.Id));

                using var reader3 = await cmd3.ExecuteReaderAsync();
                while (await reader3.ReadAsync())
                {
                    item.AssignedBags.Add(new BloodBagAssignmentDto
                    {
                        BloodBagId = reader3.GetGuid(reader3.GetOrdinal("BloodBagId")),
                        BagCode = reader3["BagCode"]?.ToString(),
                        BloodType = reader3["BloodType"]?.ToString(),
                        RhFactor = reader3["RhFactor"]?.ToString(),
                        Volume = reader3.IsDBNull(reader3.GetOrdinal("Volume")) ? 0 : reader3.GetDecimal(reader3.GetOrdinal("Volume")),
                        ExpiryDate = reader3.GetDateTime(reader3.GetOrdinal("ExpiryDate")),
                        CrossMatchResult = reader3["CrossMatchResult"]?.ToString(),
                        CrossMatchDate = reader3.IsDBNull(reader3.GetOrdinal("CrossMatchDate")) ? null : (DateTime?)reader3.GetDateTime(reader3.GetOrdinal("CrossMatchDate")),
                        TransfusionStatus = reader3["TransfusionStatus"]?.ToString(),
                        TransfusionStartTime = reader3.IsDBNull(reader3.GetOrdinal("TransfusionStartTime")) ? null : (DateTime?)reader3.GetDateTime(reader3.GetOrdinal("TransfusionStartTime")),
                        TransfusionEndTime = reader3.IsDBNull(reader3.GetOrdinal("TransfusionEndTime")) ? null : (DateTime?)reader3.GetDateTime(reader3.GetOrdinal("TransfusionEndTime")),
                        TransfusionNote = reader3["TransfusionNote"]?.ToString()
                    });
                }
            }
            return order;
        }

        public async Task<BloodOrderDto> CreateBloodOrderAsync(CreateBloodOrderDto dto)
        {
            var orderId = Guid.NewGuid();
            var orderCode = $"ORD{DateTime.Now:yyyyMMddHHmmss}";

            await _context.Database.ExecuteSqlRawAsync(
                @"INSERT INTO BloodOrders (Id, OrderCode, OrderDate, PatientId, PatientCode, PatientName, PatientBloodType, PatientRhFactor, VisitId, DepartmentId, DepartmentName, OrderDoctorName, Diagnosis, ClinicalIndication, Status, CreatedAt)
                VALUES (@p0, @p1, @p2, @p3, '', '', '', '', @p4, @p5, '', '', @p6, @p7, 'Pending', @p8)",
                orderId, orderCode, DateTime.Now, dto.PatientId,
                dto.VisitId, Guid.Empty,
                dto.Diagnosis ?? (object)DBNull.Value,
                dto.ClinicalIndication ?? (object)DBNull.Value,
                DateTime.Now);

            if (dto.Items != null)
            {
                foreach (var item in dto.Items)
                {
                    var itemId = Guid.NewGuid();
                    var ptName = await GetProductTypeNameAsync(item.ProductTypeId);

                    await _context.Database.ExecuteSqlRawAsync(
                        @"INSERT INTO BloodOrderItems (Id, OrderId, ProductTypeId, ProductTypeName, BloodType, RhFactor, OrderedQuantity, IssuedQuantity, TransfusedQuantity, Status, Note)
                        VALUES (@p0, @p1, @p2, @p3, '', '', @p4, 0, 0, 'Pending', @p5)",
                        itemId, orderId, item.ProductTypeId, ptName,
                        item.Quantity, item.Note ?? (object)DBNull.Value);
                }
            }
            return await GetBloodOrderAsync(orderId);
        }

        public async Task<bool> CancelBloodOrderAsync(Guid orderId, string reason)
        {
            var rows = await _context.Database.ExecuteSqlRawAsync(
                "UPDATE BloodOrders SET Status='Cancelled' WHERE Id=@p0 AND Status='Pending'",
                orderId);

            if (rows > 0)
            {
                await _context.Database.ExecuteSqlRawAsync(
                    "UPDATE BloodOrderItems SET Status='Cancelled' WHERE OrderId=@p0", orderId);
            }
            return rows > 0;
        }

        public async Task<bool> AssignBloodBagToPatientAsync(Guid orderItemId, Guid bloodBagId)
        {
            var assignId = Guid.NewGuid();
            await _context.Database.ExecuteSqlRawAsync(
                @"INSERT INTO BloodBagAssignments (Id, OrderItemId, BloodBagId, BagCode, BloodType, RhFactor, Volume, ExpiryDate, CrossMatchResult, CrossMatchDate, TransfusionStatus, TransfusionStartTime, TransfusionEndTime, TransfusionNote)
                SELECT @p0, @p1, b.Id, b.BagCode, b.BloodType, b.RhFactor, b.Volume, b.ExpiryDate,
                    NULL, NULL, 'Reserved', NULL, NULL, NULL
                FROM BloodBags b WHERE b.Id = @p2",
                assignId, orderItemId, bloodBagId);

            await _context.Database.ExecuteSqlRawAsync(
                "UPDATE BloodBags SET Status='Reserved' WHERE Id=@p0", bloodBagId);

            await _context.Database.ExecuteSqlRawAsync(
                "UPDATE BloodOrderItems SET IssuedQuantity = IssuedQuantity + 1 WHERE Id=@p0", orderItemId);

            return true;
        }

        public async Task<bool> UnassignBloodBagAsync(Guid orderItemId, Guid bloodBagId, string reason)
        {
            await _context.Database.ExecuteSqlRawAsync(
                "DELETE FROM BloodBagAssignments WHERE OrderItemId=@p0 AND BloodBagId=@p1",
                orderItemId, bloodBagId);

            await _context.Database.ExecuteSqlRawAsync(
                "UPDATE BloodBags SET Status='Available', Note=@p0 WHERE Id=@p1",
                reason ?? (object)DBNull.Value, bloodBagId);

            await _context.Database.ExecuteSqlRawAsync(
                "UPDATE BloodOrderItems SET IssuedQuantity = CASE WHEN IssuedQuantity > 0 THEN IssuedQuantity - 1 ELSE 0 END WHERE Id=@p0",
                orderItemId);

            return true;
        }

        public async Task<bool> RecordCrossMatchResultAsync(Guid orderItemId, Guid bloodBagId, string result, string note)
        {
            var rows = await _context.Database.ExecuteSqlRawAsync(
                @"UPDATE BloodBagAssignments SET CrossMatchResult=@p0, CrossMatchDate=@p1, TransfusionNote=@p2
                WHERE OrderItemId=@p3 AND BloodBagId=@p4",
                result, DateTime.Now, note ?? (object)DBNull.Value, orderItemId, bloodBagId);
            return rows > 0;
        }

        public async Task<bool> StartTransfusionAsync(Guid orderItemId, Guid bloodBagId)
        {
            var rows = await _context.Database.ExecuteSqlRawAsync(
                @"UPDATE BloodBagAssignments SET TransfusionStatus='Transfusing', TransfusionStartTime=@p0
                WHERE OrderItemId=@p1 AND BloodBagId=@p2",
                DateTime.Now, orderItemId, bloodBagId);

            await _context.Database.ExecuteSqlRawAsync(
                "UPDATE BloodBags SET Status='Transfusing' WHERE Id=@p0", bloodBagId);

            return rows > 0;
        }

        public async Task<bool> CompleteTransfusionAsync(Guid orderItemId, Guid bloodBagId, string note)
        {
            var rows = await _context.Database.ExecuteSqlRawAsync(
                @"UPDATE BloodBagAssignments SET TransfusionStatus='Completed', TransfusionEndTime=@p0, TransfusionNote=@p1
                WHERE OrderItemId=@p2 AND BloodBagId=@p3",
                DateTime.Now, note ?? (object)DBNull.Value, orderItemId, bloodBagId);

            await _context.Database.ExecuteSqlRawAsync(
                "UPDATE BloodBags SET Status='Transfused' WHERE Id=@p0", bloodBagId);

            await _context.Database.ExecuteSqlRawAsync(
                "UPDATE BloodOrderItems SET TransfusedQuantity = TransfusedQuantity + 1 WHERE Id=@p0",
                orderItemId);

            return rows > 0;
        }

        public async Task<bool> RecordTransfusionReactionAsync(Guid orderItemId, Guid bloodBagId, string reaction, string action)
        {
            var note = $"Phan ung: {reaction}. Xu tri: {action}";
            var rows = await _context.Database.ExecuteSqlRawAsync(
                @"UPDATE BloodBagAssignments SET TransfusionStatus='Returned', TransfusionEndTime=@p0, TransfusionNote=@p1
                WHERE OrderItemId=@p2 AND BloodBagId=@p3",
                DateTime.Now, note, orderItemId, bloodBagId);

            await _context.Database.ExecuteSqlRawAsync(
                "UPDATE BloodBags SET Status='Returned', Note=@p0 WHERE Id=@p1",
                note, bloodBagId);

            return rows > 0;
        }

        #endregion

        #region 8-9. Issue Summary / Patient

        public async Task<byte[]> PrintBloodIssueSummaryAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null)
        {
            var summary = await GetBloodIssueSummaryAsync(fromDate, toDate, departmentId);
            var sb = new StringBuilder();
            sb.AppendLine("<!DOCTYPE html><html><head><meta charset='utf-8'/><title>Phieu linh mau tong hop</title>");
            sb.AppendLine("<style>body{font-family:Arial;margin:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:6px;text-align:left}th{background:#f0f0f0}</style></head><body>");
            sb.AppendLine("<h2 style='text-align:center'>PHIEU LINH MAU TONG HOP</h2>");
            sb.AppendLine($"<p>Tu ngay: {fromDate:dd/MM/yyyy} - Den ngay: {toDate:dd/MM/yyyy}</p>");
            sb.AppendLine($"<p><strong>Tong so tui:</strong> {summary.TotalBags} | <strong>Tong the tich:</strong> {summary.TotalVolume} mL</p>");
            sb.AppendLine("<h3>Theo loai che pham</h3><table><tr><th>Loai CP</th><th>So luong</th><th>The tich (mL)</th></tr>");
            if (summary.ByProductType != null)
            {
                foreach (var item in summary.ByProductType)
                    sb.AppendLine($"<tr><td>{item.ProductTypeName}</td><td>{item.Quantity}</td><td>{item.Volume}</td></tr>");
            }
            sb.AppendLine("</table><h3>Theo khoa</h3><table><tr><th>Khoa</th><th>So luong</th><th>The tich (mL)</th></tr>");
            if (summary.ByDepartment != null)
            {
                foreach (var item in summary.ByDepartment)
                    sb.AppendLine($"<tr><td>{item.DepartmentName}</td><td>{item.Quantity}</td><td>{item.Volume}</td></tr>");
            }
            sb.AppendLine("</table></body></html>");
            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        public async Task<BloodIssueSummaryDto> GetBloodIssueSummaryAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null)
        {
            var result = new BloodIssueSummaryDto
            {
                FromDate = fromDate,
                ToDate = toDate,
                DepartmentId = departmentId,
                ByProductType = new List<BloodIssueSummaryByTypeDto>(),
                ByDepartment = new List<BloodIssueSummaryByDeptDto>()
            };

            using var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();

            // By product type
            using (var cmd = connection.CreateCommand())
            {
                var sql = @"SELECT i.ProductTypeName, COUNT(*) AS Quantity, SUM(i.Volume) AS Volume
                    FROM BloodIssueItems i
                    INNER JOIN BloodIssueReceipts r ON i.ReceiptId = r.Id
                    WHERE r.IssueDate >= @from AND r.IssueDate <= @to";
                if (departmentId.HasValue)
                    sql += " AND r.DepartmentId = @deptId";
                sql += " GROUP BY i.ProductTypeName";

                cmd.CommandText = sql;
                cmd.Parameters.Add(new SqlParameter("@from", fromDate));
                cmd.Parameters.Add(new SqlParameter("@to", toDate));
                if (departmentId.HasValue)
                    cmd.Parameters.Add(new SqlParameter("@deptId", departmentId.Value));

                using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    result.ByProductType.Add(new BloodIssueSummaryByTypeDto
                    {
                        ProductTypeName = reader["ProductTypeName"]?.ToString(),
                        Quantity = reader.GetInt32(reader.GetOrdinal("Quantity")),
                        Volume = reader.GetDecimal(reader.GetOrdinal("Volume"))
                    });
                }
            }

            // By department
            using (var cmd2 = connection.CreateCommand())
            {
                var sql2 = @"SELECT ISNULL(r.DepartmentId, '00000000-0000-0000-0000-000000000000') AS DeptId,
                    COUNT(*) AS Quantity, SUM(i.Volume) AS Volume
                    FROM BloodIssueItems i
                    INNER JOIN BloodIssueReceipts r ON i.ReceiptId = r.Id
                    WHERE r.IssueDate >= @from AND r.IssueDate <= @to";
                if (departmentId.HasValue)
                    sql2 += " AND r.DepartmentId = @deptId";
                sql2 += " GROUP BY r.DepartmentId";

                cmd2.CommandText = sql2;
                cmd2.Parameters.Add(new SqlParameter("@from", fromDate));
                cmd2.Parameters.Add(new SqlParameter("@to", toDate));
                if (departmentId.HasValue)
                    cmd2.Parameters.Add(new SqlParameter("@deptId", departmentId.Value));

                using var reader2 = await cmd2.ExecuteReaderAsync();
                while (await reader2.ReadAsync())
                {
                    result.ByDepartment.Add(new BloodIssueSummaryByDeptDto
                    {
                        DepartmentName = reader2["DeptId"]?.ToString(),
                        Quantity = reader2.GetInt32(reader2.GetOrdinal("Quantity")),
                        Volume = reader2.GetDecimal(reader2.GetOrdinal("Volume"))
                    });
                }
            }

            result.TotalBags = result.ByProductType.Sum(x => x.Quantity);
            result.TotalVolume = result.ByProductType.Sum(x => x.Volume);
            return result;
        }

        public async Task<byte[]> PrintBloodIssueByPatientAsync(Guid patientId, DateTime fromDate, DateTime toDate)
        {
            var data = await GetBloodIssueByPatientAsync(patientId, fromDate, toDate);
            if (data == null) return Encoding.UTF8.GetBytes("<html><body>Not found</body></html>");

            var sb = new StringBuilder();
            sb.AppendLine("<!DOCTYPE html><html><head><meta charset='utf-8'/><title>Phieu linh mau benh nhan</title>");
            sb.AppendLine("<style>body{font-family:Arial;margin:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:6px;text-align:left}th{background:#f0f0f0}</style></head><body>");
            sb.AppendLine("<h2 style='text-align:center'>PHIEU LINH MAU THEO BENH NHAN</h2>");
            sb.AppendLine($"<p><strong>Ho ten:</strong> {data.PatientName} | <strong>Ma BN:</strong> {data.PatientCode}</p>");
            sb.AppendLine($"<p><strong>Tuoi:</strong> {data.Age} | <strong>Gioi tinh:</strong> {data.Gender} | <strong>Nhom mau:</strong> {data.BloodType} {data.RhFactor}</p>");
            sb.AppendLine($"<p><strong>Chan doan:</strong> {data.Diagnosis} | <strong>Khoa:</strong> {data.DepartmentName}</p>");
            sb.AppendLine("<table><tr><th>STT</th><th>Ngay cap</th><th>Ma tui</th><th>Loai CP</th><th>The tich</th><th>Trang thai</th></tr>");
            int stt = 1;
            if (data.Items != null)
            {
                foreach (var item in data.Items)
                    sb.AppendLine($"<tr><td>{stt++}</td><td>{item.IssueDate:dd/MM/yyyy}</td><td>{item.BagCode}</td><td>{item.ProductTypeName}</td><td>{item.Volume}</td><td>{item.TransfusionStatus}</td></tr>");
            }
            sb.AppendLine("</table></body></html>");
            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        public async Task<BloodIssueByPatientDto> GetBloodIssueByPatientAsync(Guid patientId, DateTime fromDate, DateTime toDate)
        {
            var result = new BloodIssueByPatientDto
            {
                PatientId = patientId,
                Items = new List<BloodIssueByPatientItemDto>()
            };

            using var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();

            using (var cmd = connection.CreateCommand())
            {
                cmd.CommandText = @"SELECT i.BagCode, i.ProductTypeName, i.Volume, r.IssueDate,
                    i.PatientCode, i.PatientName
                    FROM BloodIssueItems i
                    INNER JOIN BloodIssueReceipts r ON i.ReceiptId = r.Id
                    WHERE i.PatientId = @patientId AND r.IssueDate >= @from AND r.IssueDate <= @to
                    ORDER BY r.IssueDate DESC";
                cmd.Parameters.Add(new SqlParameter("@patientId", patientId));
                cmd.Parameters.Add(new SqlParameter("@from", fromDate));
                cmd.Parameters.Add(new SqlParameter("@to", toDate));

                using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    if (string.IsNullOrEmpty(result.PatientCode))
                    {
                        result.PatientCode = reader["PatientCode"]?.ToString();
                        result.PatientName = reader["PatientName"]?.ToString();
                    }
                    result.Items.Add(new BloodIssueByPatientItemDto
                    {
                        IssueDate = reader.GetDateTime(reader.GetOrdinal("IssueDate")),
                        BagCode = reader["BagCode"]?.ToString(),
                        ProductTypeName = reader["ProductTypeName"]?.ToString(),
                        Volume = reader.IsDBNull(reader.GetOrdinal("Volume")) ? 0 : reader.GetDecimal(reader.GetOrdinal("Volume")),
                        TransfusionStatus = "Issued",
                        TransfusionDate = null
                    });
                }
            }
            return result;
        }

        #endregion

        #region 10. Barcode/QRCode

        public async Task<ScanBloodBagResultDto> ScanBloodBagAsync(ScanBloodBagDto dto)
        {
            if (string.IsNullOrEmpty(dto?.BarcodeOrQRCode))
            {
                return new ScanBloodBagResultDto
                {
                    Found = false,
                    Message = "Ma vach khong hop le",
                    Warnings = new List<string>()
                };
            }

            var bag = await GetBloodBagByBarcodeAsync(dto.BarcodeOrQRCode);
            if (bag == null)
            {
                return new ScanBloodBagResultDto
                {
                    Found = false,
                    Message = $"Khong tim thay tui mau voi ma: {dto.BarcodeOrQRCode}",
                    Warnings = new List<string>()
                };
            }

            var warnings = new List<string>();
            if (bag.ExpiryDate <= DateTime.Now)
                warnings.Add("Tui mau da het han su dung!");
            else if (bag.ExpiryDate <= DateTime.Now.AddDays(7))
                warnings.Add($"Tui mau sap het han ({bag.ExpiryDate:dd/MM/yyyy})");
            if (bag.Status == "Destroyed")
                warnings.Add("Tui mau da bi huy!");
            if (bag.Status == "Issued")
                warnings.Add("Tui mau da duoc xuat kho");

            return new ScanBloodBagResultDto
            {
                Found = true,
                BloodBag = bag,
                Message = "Tim thay tui mau",
                Warnings = warnings
            };
        }

        public async Task<byte[]> PrintBloodBagBarcodesAsync(PrintBloodBagBarcodeDto dto)
        {
            var sb = new StringBuilder();
            sb.AppendLine("<!DOCTYPE html><html><head><meta charset='utf-8'/><title>Ma vach tui mau</title>");
            sb.AppendLine("<style>body{font-family:Arial;margin:10px}.label{border:1px solid #333;padding:10px;margin:5px;display:inline-block;width:280px;text-align:center}.barcode{font-family:'Libre Barcode 39',monospace;font-size:40px}</style></head><body>");

            if (dto?.BloodBagIds != null)
            {
                foreach (var bagId in dto.BloodBagIds)
                {
                    var bag = await GetBloodBagAsync(bagId);
                    if (bag != null)
                    {
                        sb.AppendLine("<div class='label'>");
                        sb.AppendLine($"<p class='barcode'>*{bag.Barcode}*</p>");
                        sb.AppendLine($"<p><strong>{bag.BagCode}</strong></p>");
                        sb.AppendLine($"<p>{bag.BloodType} {bag.RhFactor} | {bag.ProductTypeName}</p>");
                        sb.AppendLine($"<p>Vol: {bag.Volume} mL | Exp: {bag.ExpiryDate:dd/MM/yyyy}</p>");
                        sb.AppendLine("</div>");
                    }
                }
            }
            sb.AppendLine("</body></html>");
            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        public async Task<BloodBagDto> GetBloodBagByBarcodeAsync(string barcode)
        {
            using var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();
            using var command = connection.CreateCommand();
            command.CommandText = @"SELECT b.*, pt.Name AS ProductTypeName, s.Name AS SupplierName
                FROM BloodBags b
                LEFT JOIN BloodProductTypes pt ON b.ProductTypeId = pt.Id
                LEFT JOIN BloodSuppliers s ON b.SupplierId = s.Id
                WHERE b.Barcode = @barcode OR b.BagCode = @barcode";
            command.Parameters.Add(new SqlParameter("@barcode", barcode));

            using var reader = await command.ExecuteReaderAsync();
            if (await reader.ReadAsync())
                return ReadBloodBagFromReader(reader);
            return null;
        }

        #endregion

        #region Catalogs

        public async Task<List<BloodProductTypeDto>> GetProductTypesAsync()
        {
            var results = new List<BloodProductTypeDto>();
            using var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();
            using var command = connection.CreateCommand();
            command.CommandText = "SELECT * FROM BloodProductTypes ORDER BY Code";

            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                results.Add(new BloodProductTypeDto
                {
                    Id = reader.GetGuid(reader.GetOrdinal("Id")),
                    Code = reader["Code"]?.ToString(),
                    Name = reader["Name"]?.ToString(),
                    Description = reader["Description"]?.ToString(),
                    ShelfLifeDays = reader.IsDBNull(reader.GetOrdinal("ShelfLifeDays")) ? 0 : reader.GetInt32(reader.GetOrdinal("ShelfLifeDays")),
                    MinTemperature = reader.IsDBNull(reader.GetOrdinal("MinTemperature")) ? null : (decimal?)reader.GetDecimal(reader.GetOrdinal("MinTemperature")),
                    MaxTemperature = reader.IsDBNull(reader.GetOrdinal("MaxTemperature")) ? null : (decimal?)reader.GetDecimal(reader.GetOrdinal("MaxTemperature")),
                    StandardVolume = reader.IsDBNull(reader.GetOrdinal("StandardVolume")) ? null : (decimal?)reader.GetDecimal(reader.GetOrdinal("StandardVolume")),
                    Unit = reader["Unit"]?.ToString(),
                    Price = reader.IsDBNull(reader.GetOrdinal("Price")) ? 0 : reader.GetDecimal(reader.GetOrdinal("Price")),
                    InsurancePrice = reader.IsDBNull(reader.GetOrdinal("InsurancePrice")) ? 0 : reader.GetDecimal(reader.GetOrdinal("InsurancePrice")),
                    IsActive = !reader.IsDBNull(reader.GetOrdinal("IsActive")) && reader.GetBoolean(reader.GetOrdinal("IsActive"))
                });
            }
            return results;
        }

        public async Task<BloodProductTypeDto> SaveProductTypeAsync(BloodProductTypeDto dto)
        {
            if (dto.Id == Guid.Empty)
            {
                dto.Id = Guid.NewGuid();
                await _context.Database.ExecuteSqlRawAsync(
                    @"INSERT INTO BloodProductTypes (Id, Code, Name, Description, ShelfLifeDays, MinTemperature, MaxTemperature, StandardVolume, Unit, Price, InsurancePrice, IsActive)
                    VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10, @p11)",
                    dto.Id, dto.Code, dto.Name, dto.Description ?? (object)DBNull.Value,
                    dto.ShelfLifeDays, dto.MinTemperature ?? (object)DBNull.Value,
                    dto.MaxTemperature ?? (object)DBNull.Value,
                    dto.StandardVolume ?? (object)DBNull.Value,
                    dto.Unit ?? "mL", dto.Price, dto.InsurancePrice, dto.IsActive);
            }
            else
            {
                await _context.Database.ExecuteSqlRawAsync(
                    @"UPDATE BloodProductTypes SET Code=@p0, Name=@p1, Description=@p2, ShelfLifeDays=@p3,
                    MinTemperature=@p4, MaxTemperature=@p5, StandardVolume=@p6, Unit=@p7,
                    Price=@p8, InsurancePrice=@p9, IsActive=@p10 WHERE Id=@p11",
                    dto.Code, dto.Name, dto.Description ?? (object)DBNull.Value,
                    dto.ShelfLifeDays, dto.MinTemperature ?? (object)DBNull.Value,
                    dto.MaxTemperature ?? (object)DBNull.Value,
                    dto.StandardVolume ?? (object)DBNull.Value,
                    dto.Unit ?? "mL", dto.Price, dto.InsurancePrice, dto.IsActive, dto.Id);
            }
            return dto;
        }

        public async Task<List<BloodSupplierDto>> GetSuppliersAsync(string keyword = null)
        {
            var results = new List<BloodSupplierDto>();
            using var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();
            using var command = connection.CreateCommand();

            var sql = "SELECT * FROM BloodSuppliers WHERE 1=1";
            if (!string.IsNullOrEmpty(keyword))
                sql += " AND (Name LIKE @kw OR Code LIKE @kw OR Phone LIKE @kw)";
            sql += " ORDER BY Code";

            command.CommandText = sql;
            if (!string.IsNullOrEmpty(keyword))
                command.Parameters.Add(new SqlParameter("@kw", $"%{keyword}%"));

            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                results.Add(new BloodSupplierDto
                {
                    Id = reader.GetGuid(reader.GetOrdinal("Id")),
                    Code = reader["Code"]?.ToString(),
                    Name = reader["Name"]?.ToString(),
                    Address = reader["Address"]?.ToString(),
                    Phone = reader["Phone"]?.ToString(),
                    Email = reader["Email"]?.ToString(),
                    ContactPerson = reader["ContactPerson"]?.ToString(),
                    License = reader["License"]?.ToString(),
                    LicenseExpiryDate = reader.IsDBNull(reader.GetOrdinal("LicenseExpiryDate")) ? null : (DateTime?)reader.GetDateTime(reader.GetOrdinal("LicenseExpiryDate")),
                    IsActive = !reader.IsDBNull(reader.GetOrdinal("IsActive")) && reader.GetBoolean(reader.GetOrdinal("IsActive"))
                });
            }
            return results;
        }

        public async Task<BloodSupplierDto> SaveSupplierAsync(BloodSupplierDto dto)
        {
            if (dto.Id == Guid.Empty)
            {
                dto.Id = Guid.NewGuid();
                await _context.Database.ExecuteSqlRawAsync(
                    @"INSERT INTO BloodSuppliers (Id, Code, Name, Address, Phone, Email, ContactPerson, License, LicenseExpiryDate, IsActive)
                    VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9)",
                    dto.Id, dto.Code, dto.Name,
                    dto.Address ?? (object)DBNull.Value,
                    dto.Phone ?? (object)DBNull.Value,
                    dto.Email ?? (object)DBNull.Value,
                    dto.ContactPerson ?? (object)DBNull.Value,
                    dto.License ?? (object)DBNull.Value,
                    dto.LicenseExpiryDate ?? (object)DBNull.Value,
                    dto.IsActive);
            }
            else
            {
                await _context.Database.ExecuteSqlRawAsync(
                    @"UPDATE BloodSuppliers SET Code=@p0, Name=@p1, Address=@p2, Phone=@p3,
                    Email=@p4, ContactPerson=@p5, License=@p6, LicenseExpiryDate=@p7, IsActive=@p8
                    WHERE Id=@p9",
                    dto.Code, dto.Name,
                    dto.Address ?? (object)DBNull.Value,
                    dto.Phone ?? (object)DBNull.Value,
                    dto.Email ?? (object)DBNull.Value,
                    dto.ContactPerson ?? (object)DBNull.Value,
                    dto.License ?? (object)DBNull.Value,
                    dto.LicenseExpiryDate ?? (object)DBNull.Value,
                    dto.IsActive, dto.Id);
            }
            return dto;
        }

        #endregion

        #region Private Helpers

        private BloodIssueRequestDto ReadIssueRequestFromReader(System.Data.Common.DbDataReader reader)
        {
            return new BloodIssueRequestDto
            {
                Id = reader.GetGuid(reader.GetOrdinal("Id")),
                RequestCode = reader["RequestCode"]?.ToString(),
                RequestDate = reader.GetDateTime(reader.GetOrdinal("RequestDate")),
                DepartmentId = reader.IsDBNull(reader.GetOrdinal("DepartmentId")) ? Guid.Empty : reader.GetGuid(reader.GetOrdinal("DepartmentId")),
                RequestedById = reader.IsDBNull(reader.GetOrdinal("RequestedById")) ? Guid.Empty : reader.GetGuid(reader.GetOrdinal("RequestedById")),
                PatientId = reader.IsDBNull(reader.GetOrdinal("PatientId")) ? null : (Guid?)reader.GetGuid(reader.GetOrdinal("PatientId")),
                PatientCode = reader["PatientCode"]?.ToString(),
                PatientName = reader["PatientName"]?.ToString(),
                BloodType = reader["BloodType"]?.ToString(),
                RhFactor = reader["RhFactor"]?.ToString(),
                ProductTypeId = reader.GetGuid(reader.GetOrdinal("ProductTypeId")),
                ProductTypeName = reader["ProductTypeName"]?.ToString(),
                RequestedQuantity = reader.IsDBNull(reader.GetOrdinal("RequestedQuantity")) ? 0 : reader.GetInt32(reader.GetOrdinal("RequestedQuantity")),
                IssuedQuantity = reader.IsDBNull(reader.GetOrdinal("IssuedQuantity")) ? 0 : reader.GetInt32(reader.GetOrdinal("IssuedQuantity")),
                Urgency = reader["Urgency"]?.ToString(),
                Status = reader["Status"]?.ToString(),
                ClinicalIndication = reader["ClinicalIndication"]?.ToString(),
                Note = reader["Note"]?.ToString(),
                CreatedAt = reader.GetDateTime(reader.GetOrdinal("CreatedAt"))
            };
        }

        private BloodBagDto ReadBloodBagFromReader(System.Data.Common.DbDataReader reader)
        {
            return new BloodBagDto
            {
                Id = reader.GetGuid(reader.GetOrdinal("Id")),
                BagCode = reader["BagCode"]?.ToString(),
                Barcode = reader["Barcode"]?.ToString(),
                BloodType = reader["BloodType"]?.ToString(),
                RhFactor = reader["RhFactor"]?.ToString(),
                ProductTypeId = reader.GetGuid(reader.GetOrdinal("ProductTypeId")),
                ProductTypeName = reader["ProductTypeName"]?.ToString(),
                Volume = reader.IsDBNull(reader.GetOrdinal("Volume")) ? 0 : reader.GetDecimal(reader.GetOrdinal("Volume")),
                Unit = reader["Unit"]?.ToString(),
                CollectionDate = reader.GetDateTime(reader.GetOrdinal("CollectionDate")),
                ExpiryDate = reader.GetDateTime(reader.GetOrdinal("ExpiryDate")),
                DonorCode = reader["DonorCode"]?.ToString(),
                DonorName = reader["DonorName"]?.ToString(),
                SupplierId = reader.GetGuid(reader.GetOrdinal("SupplierId")),
                SupplierName = reader["SupplierName"]?.ToString(),
                Status = reader["Status"]?.ToString(),
                StorageLocation = reader["StorageLocation"]?.ToString(),
                Temperature = reader.IsDBNull(reader.GetOrdinal("Temperature")) ? null : (decimal?)reader.GetDecimal(reader.GetOrdinal("Temperature")),
                TestResults = reader["TestResults"]?.ToString(),
                IsTestPassed = !reader.IsDBNull(reader.GetOrdinal("IsTestPassed")) && reader.GetBoolean(reader.GetOrdinal("IsTestPassed")),
                Note = reader["Note"]?.ToString(),
                CreatedAt = reader.GetDateTime(reader.GetOrdinal("CreatedAt"))
            };
        }

        private BloodInventoryDto ReadInventoryFromReader(System.Data.Common.DbDataReader reader)
        {
            return new BloodInventoryDto
            {
                Id = reader.GetGuid(reader.GetOrdinal("Id")),
                InventoryCode = reader["InventoryCode"]?.ToString(),
                InventoryDate = reader.GetDateTime(reader.GetOrdinal("InventoryDate")),
                Status = reader["Status"]?.ToString(),
                ConductedBy = reader["ConductedBy"]?.ToString(),
                ApprovedBy = reader["ApprovedBy"]?.ToString(),
                ApprovedDate = reader.IsDBNull(reader.GetOrdinal("ApprovedDate")) ? null : (DateTime?)reader.GetDateTime(reader.GetOrdinal("ApprovedDate")),
                TotalBagsSystem = reader.IsDBNull(reader.GetOrdinal("TotalBagsSystem")) ? 0 : reader.GetInt32(reader.GetOrdinal("TotalBagsSystem")),
                TotalBagsActual = reader.IsDBNull(reader.GetOrdinal("TotalBagsActual")) ? 0 : reader.GetInt32(reader.GetOrdinal("TotalBagsActual")),
                Variance = reader.IsDBNull(reader.GetOrdinal("Variance")) ? 0 : reader.GetInt32(reader.GetOrdinal("Variance")),
                Note = reader["Note"]?.ToString(),
                Items = new List<BloodInventoryItemDto>()
            };
        }

        private async Task<BloodIssueReceiptDto> GetIssueReceiptByIdAsync(Guid receiptId)
        {
            BloodIssueReceiptDto receipt = null;
            using var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();

            using (var cmd = connection.CreateCommand())
            {
                cmd.CommandText = @"SELECT Id, ReceiptCode, IssueDate, DepartmentId,
                    RequestedBy, IssuedBy, Status, TotalBags, Note, CreatedAt
                    FROM BloodIssueReceipts WHERE Id = @id";
                cmd.Parameters.Add(new SqlParameter("@id", receiptId));

                using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    receipt = new BloodIssueReceiptDto
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
                    };
                }
            }

            if (receipt == null) return null;

            using (var cmd2 = connection.CreateCommand())
            {
                cmd2.CommandText = @"SELECT Id, BloodBagId, BagCode, BloodType, RhFactor,
                    ProductTypeName, Volume, ExpiryDate, PatientId, PatientCode, PatientName
                    FROM BloodIssueItems WHERE ReceiptId = @id";
                cmd2.Parameters.Add(new SqlParameter("@id", receiptId));

                using var reader2 = await cmd2.ExecuteReaderAsync();
                while (await reader2.ReadAsync())
                {
                    receipt.Items.Add(new BloodIssueItemDto
                    {
                        Id = reader2.GetGuid(reader2.GetOrdinal("Id")),
                        BloodBagId = reader2.GetGuid(reader2.GetOrdinal("BloodBagId")),
                        BagCode = reader2["BagCode"]?.ToString(),
                        BloodType = reader2["BloodType"]?.ToString(),
                        RhFactor = reader2["RhFactor"]?.ToString(),
                        ProductTypeName = reader2["ProductTypeName"]?.ToString(),
                        Volume = reader2.IsDBNull(reader2.GetOrdinal("Volume")) ? 0 : reader2.GetDecimal(reader2.GetOrdinal("Volume")),
                        ExpiryDate = reader2.GetDateTime(reader2.GetOrdinal("ExpiryDate")),
                        PatientId = reader2.IsDBNull(reader2.GetOrdinal("PatientId")) ? null : (Guid?)reader2.GetGuid(reader2.GetOrdinal("PatientId")),
                        PatientCode = reader2["PatientCode"]?.ToString(),
                        PatientName = reader2["PatientName"]?.ToString()
                    });
                }
            }
            return receipt;
        }

        private async Task<List<BloodStockDetailDto>> GetBloodStockDetailInternalAsync(
            string bloodType, string rhFactor, Guid? productTypeId, string status, int? daysUntilExpiry, bool expiredOnly)
        {
            var results = new List<BloodStockDetailDto>();
            using var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();
            using var command = connection.CreateCommand();

            var sql = @"SELECT b.Id AS BloodBagId, b.BagCode, b.Barcode, b.BloodType, b.RhFactor,
                pt.Name AS ProductTypeName, b.Volume, b.CollectionDate, b.ExpiryDate,
                DATEDIFF(day, GETDATE(), b.ExpiryDate) AS DaysUntilExpiry,
                b.StorageLocation, b.Status
                FROM BloodBags b
                LEFT JOIN BloodProductTypes pt ON b.ProductTypeId = pt.Id
                WHERE 1=1";

            if (!string.IsNullOrEmpty(bloodType))
                sql += " AND b.BloodType = @bloodType";
            if (!string.IsNullOrEmpty(rhFactor))
                sql += " AND b.RhFactor = @rhFactor";
            if (productTypeId.HasValue)
                sql += " AND b.ProductTypeId = @productTypeId";
            if (!string.IsNullOrEmpty(status))
                sql += " AND b.Status = @status";
            if (daysUntilExpiry.HasValue)
                sql += " AND b.ExpiryDate <= DATEADD(day, @days, GETDATE()) AND b.ExpiryDate > GETDATE()";
            if (expiredOnly)
                sql += " AND b.ExpiryDate <= GETDATE() AND b.Status NOT IN ('Destroyed','Transfused')";

            sql += " ORDER BY b.ExpiryDate ASC";

            command.CommandText = sql;
            if (!string.IsNullOrEmpty(bloodType))
                command.Parameters.Add(new SqlParameter("@bloodType", bloodType));
            if (!string.IsNullOrEmpty(rhFactor))
                command.Parameters.Add(new SqlParameter("@rhFactor", rhFactor));
            if (productTypeId.HasValue)
                command.Parameters.Add(new SqlParameter("@productTypeId", productTypeId.Value));
            if (!string.IsNullOrEmpty(status))
                command.Parameters.Add(new SqlParameter("@status", status));
            if (daysUntilExpiry.HasValue)
                command.Parameters.Add(new SqlParameter("@days", daysUntilExpiry.Value));

            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                results.Add(new BloodStockDetailDto
                {
                    BloodBagId = reader.GetGuid(reader.GetOrdinal("BloodBagId")),
                    BagCode = reader["BagCode"]?.ToString(),
                    Barcode = reader["Barcode"]?.ToString(),
                    BloodType = reader["BloodType"]?.ToString(),
                    RhFactor = reader["RhFactor"]?.ToString(),
                    ProductTypeName = reader["ProductTypeName"]?.ToString(),
                    Volume = reader.IsDBNull(reader.GetOrdinal("Volume")) ? 0 : reader.GetDecimal(reader.GetOrdinal("Volume")),
                    CollectionDate = reader.GetDateTime(reader.GetOrdinal("CollectionDate")),
                    ExpiryDate = reader.GetDateTime(reader.GetOrdinal("ExpiryDate")),
                    DaysUntilExpiry = reader.IsDBNull(reader.GetOrdinal("DaysUntilExpiry")) ? 0 : reader.GetInt32(reader.GetOrdinal("DaysUntilExpiry")),
                    StorageLocation = reader["StorageLocation"]?.ToString(),
                    Status = reader["Status"]?.ToString()
                });
            }
            return results;
        }

        private async Task<string> GetProductTypeNameAsync(Guid productTypeId)
        {
            using var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();
            using var command = connection.CreateCommand();
            command.CommandText = "SELECT Name FROM BloodProductTypes WHERE Id = @id";
            command.Parameters.Add(new SqlParameter("@id", productTypeId));
            var result = await command.ExecuteScalarAsync();
            return result?.ToString() ?? "";
        }

        private async Task<int> GetSystemQuantityAsync(string bloodType, string rhFactor, Guid productTypeId)
        {
            using var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();
            using var command = connection.CreateCommand();
            command.CommandText = @"SELECT COUNT(*) FROM BloodBags
                WHERE BloodType = @bt AND RhFactor = @rh AND ProductTypeId = @pt
                AND Status IN ('Available','Reserved')";
            command.Parameters.Add(new SqlParameter("@bt", bloodType));
            command.Parameters.Add(new SqlParameter("@rh", rhFactor));
            command.Parameters.Add(new SqlParameter("@pt", productTypeId));
            var result = await command.ExecuteScalarAsync();
            return result != null ? Convert.ToInt32(result) : 0;
        }

        #endregion
    }
}
