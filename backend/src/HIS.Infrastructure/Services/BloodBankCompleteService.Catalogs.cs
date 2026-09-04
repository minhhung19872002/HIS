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
        #region Catalogs

        public async Task<List<BloodProductTypeDto>> GetProductTypesAsync()
        {
            var results = new List<BloodProductTypeDto>();
            // #218/T3 (2026-09-04): KHÔNG `using` kết nối này — nó thuộc về DbContext.
            // `using` sẽ Dispose kết nối của EF, nên lệnh kế tiếp trên cùng context ném
            // "The ConnectionString property has not been initialized". Gặp thật khi tạo
            // phiếu chỉ định máu: hàm tra tên chế phẩm đóng kết nối, câu INSERT sau đó hỏng.
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open) await connection.OpenAsync();
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
            // #218/T3 (2026-09-04): KHÔNG `using` kết nối này — nó thuộc về DbContext.
            // `using` sẽ Dispose kết nối của EF, nên lệnh kế tiếp trên cùng context ném
            // "The ConnectionString property has not been initialized". Gặp thật khi tạo
            // phiếu chỉ định máu: hàm tra tên chế phẩm đóng kết nối, câu INSERT sau đó hỏng.
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open) await connection.OpenAsync();
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
    }
}
