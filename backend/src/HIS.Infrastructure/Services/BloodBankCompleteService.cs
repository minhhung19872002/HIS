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
    public partial class BloodBankCompleteService : IBloodBankCompleteService
    {
        private readonly HISDbContext _context;
        private readonly IConfiguration _configuration;

        public BloodBankCompleteService(HISDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }









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
            // #218/T3 (2026-09-04): KHÔNG `using` kết nối này — nó thuộc về DbContext.
            // `using` sẽ Dispose kết nối của EF, nên lệnh kế tiếp trên cùng context ném
            // "The ConnectionString property has not been initialized". Gặp thật khi tạo
            // phiếu chỉ định máu: hàm tra tên chế phẩm đóng kết nối, câu INSERT sau đó hỏng.
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open) await connection.OpenAsync();

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
            // #218/T3 (2026-09-04): KHÔNG `using` kết nối này — nó thuộc về DbContext.
            // `using` sẽ Dispose kết nối của EF, nên lệnh kế tiếp trên cùng context ném
            // "The ConnectionString property has not been initialized". Gặp thật khi tạo
            // phiếu chỉ định máu: hàm tra tên chế phẩm đóng kết nối, câu INSERT sau đó hỏng.
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open) await connection.OpenAsync();
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
            // #218/T3 (2026-09-04): KHÔNG `using` kết nối này — nó thuộc về DbContext.
            // `using` sẽ Dispose kết nối của EF, nên lệnh kế tiếp trên cùng context ném
            // "The ConnectionString property has not been initialized". Gặp thật khi tạo
            // phiếu chỉ định máu: hàm tra tên chế phẩm đóng kết nối, câu INSERT sau đó hỏng.
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open) await connection.OpenAsync();
            using var command = connection.CreateCommand();
            command.CommandText = "SELECT Name FROM BloodProductTypes WHERE Id = @id";
            command.Parameters.Add(new SqlParameter("@id", productTypeId));
            var result = await command.ExecuteScalarAsync();
            return result?.ToString() ?? "";
        }

        private async Task<int> GetSystemQuantityAsync(string bloodType, string rhFactor, Guid productTypeId)
        {
            // #218/T3 (2026-09-04): KHÔNG `using` kết nối này — nó thuộc về DbContext.
            // `using` sẽ Dispose kết nối của EF, nên lệnh kế tiếp trên cùng context ném
            // "The ConnectionString property has not been initialized". Gặp thật khi tạo
            // phiếu chỉ định máu: hàm tra tên chế phẩm đóng kết nối, câu INSERT sau đó hỏng.
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open) await connection.OpenAsync();
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

        // perf(#195): batch equivalent of GetProductTypeNameAsync used by CreateBloodOrderAsync's
        // item loop. Single round-trip for all requested product-type ids.
        private async Task<Dictionary<Guid, string>> GetProductTypeNamesAsync(IEnumerable<Guid> productTypeIds)
        {
            var ids = productTypeIds.Distinct().ToList();
            var map = new Dictionary<Guid, string>();
            if (ids.Count == 0) return map;

            // #218/T3 (2026-09-04): KHÔNG `using` kết nối này — nó thuộc về DbContext.
            // `using` sẽ Dispose kết nối của EF, nên lệnh kế tiếp trên cùng context ném
            // "The ConnectionString property has not been initialized". Gặp thật khi tạo
            // phiếu chỉ định máu: hàm tra tên chế phẩm đóng kết nối, câu INSERT sau đó hỏng.
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open) await connection.OpenAsync();
            using var cmd = connection.CreateCommand();
            var ps = ids.Select((_, idx) => $"@pt{idx}").ToList();
            cmd.CommandText = $"SELECT Id, Name FROM BloodProductTypes WHERE Id IN ({string.Join(",", ps)})";
            for (int idx = 0; idx < ids.Count; idx++)
                cmd.Parameters.Add(new SqlParameter($"@pt{idx}", ids[idx]));
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
                map[reader.GetGuid(0)] = reader["Name"]?.ToString() ?? "";
            return map;
        }

        // perf(#195): batch equivalent of GetProductTypeNameAsync + GetSystemQuantityAsync used by
        // CreateInventoryAsync/UpdateInventoryAsync item loops. Single round-trip for all product
        // type names + a single grouped scan of BloodBags for all (BloodType, RhFactor, ProductTypeId)
        // combos, instead of 2 queries per item (each on its own connection).
        private async Task<(Dictionary<Guid, string> ProductTypeNames, Dictionary<(string BloodType, string RhFactor, Guid ProductTypeId), int> SystemQuantities)> GetProductTypeNamesAndSystemQuantitiesAsync()
        {
            var ptNameMap = new Dictionary<Guid, string>();
            var sysQtyMap = new Dictionary<(string, string, Guid), int>();

            // #218/T3 (2026-09-04): KHÔNG `using` kết nối này — nó thuộc về DbContext.
            // `using` sẽ Dispose kết nối của EF, nên lệnh kế tiếp trên cùng context ném
            // "The ConnectionString property has not been initialized". Gặp thật khi tạo
            // phiếu chỉ định máu: hàm tra tên chế phẩm đóng kết nối, câu INSERT sau đó hỏng.
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open) await connection.OpenAsync();

            using (var cmd = connection.CreateCommand())
            {
                cmd.CommandText = "SELECT Id, Name FROM BloodProductTypes";
                using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                    ptNameMap[reader.GetGuid(0)] = reader["Name"]?.ToString() ?? "";
            }

            using (var cmd2 = connection.CreateCommand())
            {
                cmd2.CommandText = @"SELECT BloodType, RhFactor, ProductTypeId, COUNT(*) AS Cnt
                    FROM BloodBags
                    WHERE Status IN ('Available','Reserved')
                    GROUP BY BloodType, RhFactor, ProductTypeId";
                using var reader2 = await cmd2.ExecuteReaderAsync();
                while (await reader2.ReadAsync())
                {
                    var key = (reader2["BloodType"]?.ToString() ?? "", reader2["RhFactor"]?.ToString() ?? "", reader2.GetGuid(reader2.GetOrdinal("ProductTypeId")));
                    sysQtyMap[key] = reader2.GetInt32(reader2.GetOrdinal("Cnt"));
                }
            }

            return (ptNameMap, sysQtyMap);
        }

        #endregion
    }
}
