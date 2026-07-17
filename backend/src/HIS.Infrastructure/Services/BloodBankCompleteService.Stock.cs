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
    }
}
