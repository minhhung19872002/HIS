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
        #region 1-2. Import Receipts

        public async Task<List<BloodImportReceiptDto>> GetImportReceiptsAsync(
            DateTime fromDate, DateTime toDate, Guid? supplierId = null, string status = null)
        {
            var results = new List<BloodImportReceiptDto>();
            // #218/T3 (2026-09-04): KHÔNG `using` kết nối này — nó thuộc về DbContext.
            // `using` sẽ Dispose kết nối của EF, nên lệnh kế tiếp trên cùng context ném
            // "The ConnectionString property has not been initialized". Gặp thật khi tạo
            // phiếu chỉ định máu: hàm tra tên chế phẩm đóng kết nối, câu INSERT sau đó hỏng.
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open) await connection.OpenAsync();
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
            // #218/T3 (2026-09-04): KHÔNG `using` kết nối này — nó thuộc về DbContext.
            // `using` sẽ Dispose kết nối của EF, nên lệnh kế tiếp trên cùng context ném
            // "The ConnectionString property has not been initialized". Gặp thật khi tạo
            // phiếu chỉ định máu: hàm tra tên chế phẩm đóng kết nối, câu INSERT sau đó hỏng.
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open) await connection.OpenAsync();

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

            // #218/T3 (2026-09-04): `DBNull.Value` truyền thẳng làm đối số cho `ExecuteSqlRawAsync`
            // thì EF Core không ánh xạ được kiểu. Ba chỗ trong vòng lặp dưới bắn DBNull **vô điều
            // kiện** (DonorName · Temperature · Note) nên tạo phiếu nhập máu hỏng 100% mỗi khi có
            // dòng hàng — đo được: HTTP 400 INVALID_STATE "store type mapping ... 'DBNull'".
            // `SqlParameter` có tên thì EF không phải đoán kiểu nữa.
            await _context.Database.ExecuteSqlRawAsync(
                @"INSERT INTO BloodImportReceipts (Id, ReceiptCode, ReceiptDate, SupplierId, DeliveryPerson, ReceiverName, Status, TotalBags, TotalAmount, Note, CreatedAt, CreatedBy)
                VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10, @p11)",
                P("@p0", receiptId), P("@p1", receiptCode), P("@p2", dto.ReceiptDate), P("@p3", dto.SupplierId),
                P("@p4", dto.DeliveryPerson), P("@p5", "System"),
                P("@p6", "Draft"), P("@p7", totalBags), P("@p8", totalAmount),
                P("@p9", dto.Note), P("@p10", DateTime.Now), P("@p11", "System"));

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
                        P("@p0", itemId), P("@p1", receiptId), P("@p2", bagId), P("@p3", item.BagCode), P("@p4", barcode),
                        P("@p5", item.BloodType), P("@p6", item.RhFactor), P("@p7", item.ProductTypeId),
                        P("@p8", item.Volume), P("@p9", "mL"), P("@p10", item.CollectionDate), P("@p11", item.ExpiryDate),
                        P("@p12", item.DonorCode), P("@p13", item.Price), P("@p14", amount),
                        P("@p15", item.TestResults));

                    await _context.Database.ExecuteSqlRawAsync(
                        @"INSERT INTO BloodBags (Id, BagCode, Barcode, BloodType, RhFactor, ProductTypeId, Volume, Unit, CollectionDate, ExpiryDate, DonorCode, DonorName, SupplierId, Status, StorageLocation, Temperature, TestResults, IsTestPassed, Note, CreatedAt, CreatedBy)
                        VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10, @p11, @p12, @p13, @p14, @p15, @p16, @p17, @p18, @p19, @p20)",
                        P("@p0", bagId), P("@p1", item.BagCode), P("@p2", barcode), P("@p3", item.BloodType), P("@p4", item.RhFactor),
                        P("@p5", item.ProductTypeId), P("@p6", item.Volume), P("@p7", "mL"),
                        P("@p8", item.CollectionDate), P("@p9", item.ExpiryDate),
                        P("@p10", item.DonorCode), P("@p11", null),
                        P("@p12", dto.SupplierId), P("@p13", "Available"), P("@p14", "Kho mau"),
                        P("@p15", null), P("@p16", item.TestResults),
                        P("@p17", true), P("@p18", null), P("@p19", DateTime.Now), P("@p20", "System"));
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
    }
}
