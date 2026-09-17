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
using static HIS.Infrastructure.Services.PdfTemplateHelper;

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
            ValidateImportItems(dto.ReceiptDate, dto.Items); // before any insert → no half-written receipt
            await EnsureImportCodesAndProductsAsync(dto.Items, null);
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
                P("@p9", dto.Note), P("@p10", DateTime.UtcNow), P("@p11", "System")); // CreatedAt UTC

            if (dto.Items != null)
            {
                foreach (var item in dto.Items)
                    await InsertImportItemWithBagAsync(receiptId, dto.SupplierId, item);
            }
            return await GetImportReceiptAsync(receiptId);
        }

        /// <summary>One import line + its physical bag (shared by create and update so both keep them in sync).</summary>
        /// <summary>
        /// A unit that was already expired when received (or expires before it was collected) is invalid data and
        /// must not enter stock as 'Available'. Measured against the receipt date so back-dated entry still works.
        /// </summary>
        private static void ValidateImportItems(DateTime receiptDate, IEnumerable<CreateBloodImportItemDto>? items)
        {
            foreach (var item in items ?? Enumerable.Empty<CreateBloodImportItemDto>())
            {
                if (item.ExpiryDate.Date < receiptDate.Date || item.ExpiryDate < item.CollectionDate)
                    throw new InvalidOperationException(
                        $"Túi máu {item.BagCode} có hạn dùng {item.ExpiryDate:dd/MM/yyyy} không hợp lệ (hết hạn trước ngày nhập hoặc trước ngày thu), không nhập kho được.");
                // QA-R6 (patient safety): a bag typed "Z"/"?" entered stock as Available, and BloodCompatibility treats
                // an unreadable group as "unknown → allow" — it was issued to an A− patient. Also -5 mL / negative price.
                if (string.IsNullOrWhiteSpace(item.BagCode))
                    throw new ArgumentException("Túi máu thiếu mã túi.");
                if (HIS.Core.Constants.BloodCompatibility.NormalizeAbo(item.BloodType) == null || HIS.Core.Constants.BloodCompatibility.NormalizeRh(item.RhFactor) == null)
                    throw new ArgumentException($"Túi máu {item.BagCode}: nhóm máu \"{item.BloodType}{item.RhFactor}\" không hợp lệ (ABO: O/A/B/AB, Rh: +/−).");
                if (item.Volume <= 0 || item.Price < 0)
                    throw new ArgumentException($"Túi máu {item.BagCode}: thể tích phải > 0 và đơn giá không âm.");
            }
            var dupCode = (items ?? Enumerable.Empty<CreateBloodImportItemDto>())
                .SelectMany(i => new[] { i.BagCode?.Trim(), (i.Barcode ?? i.BagCode)?.Trim() }.Distinct())
                .Where(c => !string.IsNullOrEmpty(c))
                .GroupBy(c => c!, StringComparer.OrdinalIgnoreCase).FirstOrDefault(g => g.Count() > 1);
            if (dupCode != null)
                throw new ArgumentException($"Mã túi máu {dupCode.Key} bị trùng trong phiếu nhập.");
        }

        /// <summary>
        /// QA-R6 (patient safety): the same bag code/barcode could be imported twice (once O+, once B−); a barcode scan
        /// then returned either bag. Codes of bags still in circulation (not Cancelled) must be unique, and the product
        /// type must exist (no FK on the raw insert). <paramref name="ignoreReceiptId"/>: the receipt being edited,
        /// whose own bags are cancelled and re-created by the update.
        /// </summary>
        private async Task EnsureImportCodesAndProductsAsync(IEnumerable<CreateBloodImportItemDto>? items, Guid? ignoreReceiptId)
        {
            foreach (var item in items ?? Enumerable.Empty<CreateBloodImportItemDto>())
            {
                var productExists = await _context.Database
                    .SqlQueryRaw<int>("SELECT COUNT(*) AS Value FROM BloodProductTypes WHERE Id = {0}", item.ProductTypeId)
                    .FirstOrDefaultAsync();
                if (productExists == 0)
                    throw new KeyNotFoundException($"Túi máu {item.BagCode}: không tìm thấy loại chế phẩm máu.");

                var code = item.BagCode.Trim();
                var barcode = (item.Barcode ?? item.BagCode).Trim();
                var taken = await _context.Database.SqlQueryRaw<int>(
                        @"SELECT COUNT(*) AS Value FROM BloodBags b
                          WHERE b.Status <> 'Cancelled' AND (b.BagCode IN ({0}, {1}) OR b.Barcode IN ({0}, {1}))
                            AND NOT EXISTS (SELECT 1 FROM BloodImportItems i WHERE i.BloodBagId = b.Id AND i.ReceiptId = {2})",
                        code, barcode, ignoreReceiptId ?? Guid.Empty)
                    .FirstOrDefaultAsync();
                if (taken > 0)
                    throw new InvalidOperationException($"Mã túi máu {code} đã tồn tại trong kho — không nhập trùng.");
            }
        }

        private async Task InsertImportItemWithBagAsync(Guid receiptId, Guid supplierId, CreateBloodImportItemDto item)
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
                P("@p12", supplierId), P("@p13", "Available"), P("@p14", "Kho mau"),
                P("@p15", null), P("@p16", item.TestResults),
                P("@p17", true), P("@p18", null), P("@p19", DateTime.UtcNow), P("@p20", "System")); // CreatedAt UTC
        }

        /// <summary>
        /// Bags created by a receipt that are still untouched in stock. Update/cancel may only proceed when every
        /// bag of the receipt is still 'Available' (none issued/reserved/transfused yet).
        /// </summary>
        private async Task EnsureReceiptBagsUntouchedAsync(Guid receiptId)
        {
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open) await connection.OpenAsync();
            using var cmd = connection.CreateCommand();
            cmd.CommandText = @"SELECT COUNT(*) FROM BloodImportItems i JOIN BloodBags b ON b.Id = i.BloodBagId
                WHERE i.ReceiptId = @id AND b.Status NOT IN ('Available', 'Cancelled')";
            cmd.Parameters.Add(new SqlParameter("@id", receiptId));
            var used = Convert.ToInt32(await cmd.ExecuteScalarAsync());
            if (used > 0)
                throw new InvalidOperationException(
                    $"Phiếu nhập có {used} túi máu đã được xuất/giữ/truyền — không sửa/hủy phiếu được.");
        }

        public async Task<BloodImportReceiptDto> UpdateImportReceiptAsync(Guid receiptId, CreateBloodImportDto dto)
        {
            var totalBags = dto.Items?.Count ?? 0;
            var totalAmount = dto.Items?.Sum(i => i.Price * i.Volume) ?? 0;

            ValidateImportItems(dto.ReceiptDate, dto.Items);
            await EnsureImportCodesAndProductsAsync(dto.Items, receiptId);
            await EnsureReceiptBagsUntouchedAsync(receiptId);

            await using var tx = await _context.Database.BeginTransactionAsync();
            var headerRows = await _context.Database.ExecuteSqlRawAsync(
                @"UPDATE BloodImportReceipts SET ReceiptDate=@p0, SupplierId=@p1, DeliveryPerson=@p2, Note=@p3, TotalBags=@p4, TotalAmount=@p5
                WHERE Id=@p6 AND Status='Draft'",
                P("@p0", dto.ReceiptDate), P("@p1", dto.SupplierId), P("@p2", dto.DeliveryPerson),
                P("@p3", dto.Note), P("@p4", totalBags), P("@p5", totalAmount), P("@p6", receiptId));
            // The item wipe below used to run even for a Confirmed/Cancelled receipt (header update matched 0 rows)
            if (headerRows == 0)
                throw new InvalidOperationException("Chỉ sửa được phiếu nhập máu ở trạng thái nháp.");

            // Old lines' bags left stock as orphans and new lines got NO bag at all (stock drift both ways).
            await _context.Database.ExecuteSqlRawAsync(
                @"UPDATE BloodBags SET Status='Cancelled', Note=N'Phiếu nhập đã sửa'
                WHERE Id IN (SELECT BloodBagId FROM BloodImportItems WHERE ReceiptId=@p0) AND Status='Available'",
                receiptId);
            await _context.Database.ExecuteSqlRawAsync(
                "DELETE FROM BloodImportItems WHERE ReceiptId=@p0", receiptId);

            if (dto.Items != null)
            {
                foreach (var item in dto.Items)
                    await InsertImportItemWithBagAsync(receiptId, dto.SupplierId, item);
            }
            await tx.CommitAsync();
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
            await EnsureReceiptBagsUntouchedAsync(receiptId);
            var rows = await _context.Database.ExecuteSqlRawAsync(
                "UPDATE BloodImportReceipts SET Status='Cancelled', Note=@p0 WHERE Id=@p1 AND Status='Draft'",
                reason ?? "", receiptId);
            // Bags are created 'Available' with the draft; cancelling the receipt left them issuable (phantom stock)
            if (rows > 0)
                await _context.Database.ExecuteSqlRawAsync(
                    @"UPDATE BloodBags SET Status='Cancelled', Note=N'Phiếu nhập đã hủy'
                    WHERE Id IN (SELECT BloodBagId FROM BloodImportItems WHERE ReceiptId=@p0) AND Status='Available'",
                    receiptId);
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
            sb.AppendLine($"<p><strong>Ma phieu:</strong> {Esc(receipt.ReceiptCode)}</p>");
            sb.AppendLine($"<p><strong>Ngay nhap:</strong> {receipt.ReceiptDate:dd/MM/yyyy}</p>");
            sb.AppendLine($"<p><strong>Nha cung cap:</strong> {Esc(receipt.SupplierName)}</p>");
            sb.AppendLine($"<p><strong>Nguoi giao:</strong> {Esc(receipt.DeliveryPerson)}</p>");
            sb.AppendLine($"<p><strong>Nguoi nhan:</strong> {Esc(receipt.ReceiverName)}</p>");
            sb.AppendLine("<table><tr><th>STT</th><th>Ma tui</th><th>Nhom mau</th><th>Rh</th><th>Loai CP</th><th>The tich (mL)</th><th>Ngay thu</th><th>Han dung</th><th>Don gia</th><th>Thanh tien</th></tr>");
            int stt = 1;
            foreach (var item in receipt.Items)
            {
                sb.AppendLine($"<tr><td>{stt++}</td><td>{Esc(item.BagCode)}</td><td>{Esc(item.BloodType)}</td><td>{Esc(item.RhFactor)}</td><td>{Esc(item.ProductTypeName)}</td><td>{item.Volume}</td><td>{item.CollectionDate:dd/MM/yyyy}</td><td>{item.ExpiryDate:dd/MM/yyyy}</td><td>{item.Price:N0}</td><td>{item.Amount:N0}</td></tr>");
            }
            sb.AppendLine($"</table><p><strong>Tong so tui:</strong> {receipt.TotalBags} | <strong>Tong tien:</strong> {receipt.TotalAmount:N0}</p>");
            sb.AppendLine($"<p><strong>Ghi chu:</strong> {Esc(receipt.Note)}</p>");
            sb.AppendLine("<div style='margin-top:40px;display:flex;justify-content:space-around'><div style='text-align:center'><p><strong>Nguoi giao</strong></p><br/><br/></div><div style='text-align:center'><p><strong>Nguoi nhan</strong></p><br/><br/></div><div style='text-align:center'><p><strong>Thu kho</strong></p><br/><br/></div></div>");
            sb.AppendLine("</body></html>");
            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        #endregion
    }
}
