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
                // perf(#195): batch-load product-type names + system quantities once instead of
                // calling GetProductTypeNameAsync/GetSystemQuantityAsync per item (each opens its
                // own DB connection). Read-only lookups against BloodProductTypes/BloodBags; not
                // affected by this loop's own inserts into BloodInventoryItems.
                var (ptNameMap, sysQtyMap) = await GetProductTypeNamesAndSystemQuantitiesAsync();

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
                // perf(#195): batch-load product-type names + system quantities once instead of
                // calling GetProductTypeNameAsync/GetSystemQuantityAsync per item (each opens its
                // own DB connection). Read-only lookups against BloodProductTypes/BloodBags; not
                // affected by this loop's own inserts into BloodInventoryItems.
                var (ptNameMap, sysQtyMap) = await GetProductTypeNamesAndSystemQuantitiesAsync();

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
    }
}
