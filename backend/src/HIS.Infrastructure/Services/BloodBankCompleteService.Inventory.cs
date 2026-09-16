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
        #region 5. Inventory

        public async Task<List<BloodInventoryDto>> GetInventoriesAsync(
            DateTime fromDate, DateTime toDate, string status = null)
        {
            var results = new List<BloodInventoryDto>();
            // #218/T3 (2026-09-04): KHÔNG `using` kết nối này — nó thuộc về DbContext.
            // `using` sẽ Dispose kết nối của EF, nên lệnh kế tiếp trên cùng context ném
            // "The ConnectionString property has not been initialized". Gặp thật khi tạo
            // phiếu chỉ định máu: hàm tra tên chế phẩm đóng kết nối, câu INSERT sau đó hỏng.
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open) await connection.OpenAsync();
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
            // #218/T3 (2026-09-04): KHÔNG `using` kết nối này — nó thuộc về DbContext.
            // `using` sẽ Dispose kết nối của EF, nên lệnh kế tiếp trên cùng context ném
            // "The ConnectionString property has not been initialized". Gặp thật khi tạo
            // phiếu chỉ định máu: hàm tra tên chế phẩm đóng kết nối, câu INSERT sau đó hỏng.
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open) await connection.OpenAsync();

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

        /// <summary>
        /// QA round 4: a counted quantity below zero was accepted, and the header's TotalBagsSystem was
        /// hard-coded 0 so Variance on the sheet never matched the sum of its lines.
        /// </summary>
        private static void ValidateInventoryItems(IEnumerable<CreateBloodInventoryItemDto>? items)
        {
            if (items != null && items.Any(i => i.ActualQuantity < 0))
                throw new ArgumentException("Số lượng kiểm đếm thực tế không được âm.", "Items");
        }

        public async Task<BloodInventoryDto> CreateInventoryAsync(CreateBloodInventoryDto dto)
        {
            ValidateInventoryItems(dto.Items);
            var id = Guid.NewGuid();
            var code = $"INV{DateTime.Now:yyyyMMddHHmmss}";
            var totalActual = dto.Items?.Sum(i => i.ActualQuantity) ?? 0;
            // perf(#195): batch-load product-type names + system quantities once instead of
            // calling GetProductTypeNameAsync/GetSystemQuantityAsync per item (each opens its
            // own DB connection). Read-only lookups against BloodProductTypes/BloodBags; not
            // affected by the loop's own inserts into BloodInventoryItems.
            var (ptNameMap, sysQtyMap) = await GetProductTypeNamesAndSystemQuantitiesAsync();
            var totalSystem = dto.Items?.Sum(i =>
                sysQtyMap.TryGetValue((i.BloodType, i.RhFactor, i.ProductTypeId), out var q) ? q : 0) ?? 0;

            await _context.Database.ExecuteSqlRawAsync(
                @"INSERT INTO BloodInventories (Id, InventoryCode, InventoryDate, Status, ConductedBy, ApprovedBy, ApprovedDate, TotalBagsSystem, TotalBagsActual, Variance, Note)
                VALUES (@p0, @p1, @p2, 'Draft', @p7, NULL, NULL, @p3, @p4, @p5, @p6)",
                P("@p0", id), P("@p1", code), P("@p2", dto.InventoryDate), P("@p3", totalSystem), P("@p4", totalActual),
                P("@p5", totalActual - totalSystem), P("@p6", dto.Note), P("@p7", CurrentUserName));

            if (dto.Items != null)
            {
                foreach (var item in dto.Items)
                {
                    var itemId = Guid.NewGuid();
                    var ptName = ptNameMap.TryGetValue(item.ProductTypeId, out var ptn) ? ptn : "";
                    var sysQty = sysQtyMap.TryGetValue((item.BloodType, item.RhFactor, item.ProductTypeId), out var sq) ? sq : 0;

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

        /// <summary>Trạng thái phiếu kiểm kê; 404 khi không có.</summary>
        private async Task<string> GetInventoryStatusAsync(Guid inventoryId)
        {
            return await _context.Database
                .SqlQueryRaw<string>("SELECT ISNULL(Status, '') AS Value FROM BloodInventories WHERE Id = {0}", inventoryId)
                .FirstOrDefaultAsync()
                ?? throw new KeyNotFoundException("Không tìm thấy phiếu kiểm kê.");
        }

        public async Task<BloodInventoryDto> UpdateInventoryAsync(Guid inventoryId, CreateBloodInventoryDto dto)
        {
            // QA round 4: the header UPDATE was guarded by Status='Draft' but the DELETE of the lines was not —
            // a PUT on an APPROVED sheet wiped its lines and left the approved header pointing at nothing.
            var status = await GetInventoryStatusAsync(inventoryId);
            if (!string.Equals(status, "Draft", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(status, "InProgress", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException($"Phiếu kiểm kê đang ở trạng thái \"{status}\", không sửa được.");
            ValidateInventoryItems(dto.Items);
            var totalActual = dto.Items?.Sum(i => i.ActualQuantity) ?? 0;
            // perf(#195): single batch lookup (see CreateInventoryAsync)
            var (ptNameMap, sysQtyMap) = await GetProductTypeNamesAndSystemQuantitiesAsync();
            var totalSystem = dto.Items?.Sum(i =>
                sysQtyMap.TryGetValue((i.BloodType, i.RhFactor, i.ProductTypeId), out var q) ? q : 0) ?? 0;

            await _context.Database.ExecuteSqlRawAsync(
                @"UPDATE BloodInventories SET InventoryDate=@p0, Note=@p1, TotalBagsActual=@p2, TotalBagsSystem=@p4, Variance=@p5
                WHERE Id=@p3 AND Status IN ('Draft','InProgress')",
                P("@p0", dto.InventoryDate), P("@p1", dto.Note), P("@p2", totalActual), P("@p3", inventoryId),
                P("@p4", totalSystem), P("@p5", totalActual - totalSystem));

            await _context.Database.ExecuteSqlRawAsync(
                "DELETE FROM BloodInventoryItems WHERE InventoryId=@p0", inventoryId);

            if (dto.Items != null)
            {
                foreach (var item in dto.Items)
                {
                    var itemId = Guid.NewGuid();
                    var ptName = ptNameMap.TryGetValue(item.ProductTypeId, out var ptn) ? ptn : "";
                    var sysQty = sysQtyMap.TryGetValue((item.BloodType, item.RhFactor, item.ProductTypeId), out var sq) ? sq : 0;

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
            // QA round 4: unknown id / wrong state used to answer 200 with nothing written
            var status = await GetInventoryStatusAsync(inventoryId);
            if (!string.Equals(status, "Draft", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(status, "InProgress", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException($"Phiếu kiểm kê đang ở trạng thái \"{status}\", không hoàn thành được.");
            var rows = await _context.Database.ExecuteSqlRawAsync(
                "UPDATE BloodInventories SET Status='Completed' WHERE Id=@p0 AND Status IN ('Draft','InProgress')",
                inventoryId);
            return rows > 0;
        }

        public async Task<bool> ApproveInventoryAsync(Guid inventoryId)
        {
            var status = await GetInventoryStatusAsync(inventoryId);
            if (!string.Equals(status, "Completed", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException($"Phiếu kiểm kê đang ở trạng thái \"{status}\", chỉ duyệt được phiếu đã hoàn thành.");
            var rows = await _context.Database.ExecuteSqlRawAsync(
                "UPDATE BloodInventories SET Status='Approved', ApprovedBy=@p2, ApprovedDate=@p0 WHERE Id=@p1 AND Status='Completed'",
                P("@p0", DateTime.Now), P("@p1", inventoryId), P("@p2", CurrentUserName));
            return rows > 0;
        }

        #endregion
    }
}
