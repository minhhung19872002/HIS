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
                // perf(#195): batch-load product-type names instead of GetProductTypeNameAsync per
                // item (each opens its own DB connection). Read-only lookup, unaffected by this
                // loop's own inserts into BloodOrderItems.
                var ptNameMap = await GetProductTypeNamesAsync(dto.Items.Select(i => i.ProductTypeId));

                foreach (var item in dto.Items)
                {
                    var itemId = Guid.NewGuid();
                    var ptName = ptNameMap.TryGetValue(item.ProductTypeId, out var ptn) ? ptn : "";

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
    }
}
