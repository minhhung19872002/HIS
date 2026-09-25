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
            // #218/T3 (2026-09-04): KHÔNG `using` kết nối này — nó thuộc về DbContext.
            // `using` sẽ Dispose kết nối của EF, nên lệnh kế tiếp trên cùng context ném
            // "The ConnectionString property has not been initialized". Gặp thật khi tạo
            // phiếu chỉ định máu: hàm tra tên chế phẩm đóng kết nối, câu INSERT sau đó hỏng.
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open) await connection.OpenAsync();
            using var command = connection.CreateCommand();

            var sql = @"SELECT b.BloodType, b.RhFactor, b.ProductTypeId, pt.Name AS ProductTypeName,
                COUNT(*) AS TotalBags,
                -- expired bags are not usable stock (issue guard rejects them) — they were counted as available
                SUM(CASE WHEN b.Status='Available' AND CAST(b.ExpiryDate AS date) >= CAST(GETDATE() AS date) THEN 1 ELSE 0 END) AS AvailableBags,
                SUM(CASE WHEN b.Status='Reserved' THEN 1 ELSE 0 END) AS ReservedBags,
                SUM(CASE WHEN b.Status='Available' AND b.ExpiryDate <= DATEADD(day,7,GETDATE()) AND b.ExpiryDate > GETDATE() THEN 1 ELSE 0 END) AS ExpiringWithin7Days,
                SUM(CASE WHEN CAST(b.ExpiryDate AS date) < CAST(GETDATE() AS date) AND b.Status NOT IN ('Destroyed','Expired') THEN 1 ELSE 0 END) AS ExpiredBags,
                SUM(b.Volume) AS TotalVolume
                FROM BloodBags b
                LEFT JOIN BloodProductTypes pt ON b.ProductTypeId = pt.Id
                WHERE b.Status NOT IN ('Destroyed','Transfused','Cancelled')";

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
            // #218/T3 (2026-09-04): KHÔNG `using` kết nối này — nó thuộc về DbContext.
            // `using` sẽ Dispose kết nối của EF, nên lệnh kế tiếp trên cùng context ném
            // "The ConnectionString property has not been initialized". Gặp thật khi tạo
            // phiếu chỉ định máu: hàm tra tên chế phẩm đóng kết nối, câu INSERT sau đó hỏng.
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open) await connection.OpenAsync();
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
            // Patient safety: this free-form setter is what the v2 "cấp phát từ kho sắp hết hạn" button calls.
            // It used to put an EXPIRED bag into 'Issued', and could revive Transfused/Destroyed bags.
            var bag = await GetBloodBagAsync(bloodBagId);
            if (bag == null) return false;
            // QA round 3: "Issued" via this setter handed a bag out with no recipient and no ABO/Rh check at all.
            // Issuing must go through an issue request (patient + ABO check in EnsureIssuableAsync).
            if (string.Equals(status, "Issued", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(bag.Status, "Issued", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException(
                    $"Không cấp phát túi máu {bag.BagCode} trực tiếp được: xuất máu phải qua phiếu yêu cầu xuất máu có bệnh nhân "
                    + "(tab \"Yêu cầu\" → Duyệt → Xuất máu, hệ thống kiểm tra tương thích ABO/Rh).");
            // QA-R11 (P0): the old guard only ran for "usable" targets, so Transfused → Returned → Available (or
            // Transfused → Expired → Available, or any free text like "FOO") put an already-transfused bag back in
            // stock. Explicit from → to whitelist; Transfusing/Transfused are set only by the transfusion endpoints.
            var target = BagManualTransitions.Keys.Concat(BagManualTransitions.Values.SelectMany(v => v))
                .FirstOrDefault(s => string.Equals(s, status?.Trim(), StringComparison.OrdinalIgnoreCase));
            if (target == null)
                throw new ArgumentException($"Trạng thái túi máu \"{status}\" không hợp lệ.", nameof(status));
            var from = BagManualTransitions.Keys.FirstOrDefault(s => string.Equals(s, bag.Status, StringComparison.OrdinalIgnoreCase));
            if (from == null || !BagManualTransitions[from].Contains(target))
                throw new InvalidOperationException(
                    $"Túi máu {bag.BagCode} đang \"{bag.Status}\", không chuyển sang \"{target}\" được.");
            if ((target == "Available" || target == "Reserved")
                && bag.ExpiryDate != default && bag.ExpiryDate.Date < DateTime.Now.Date)
                throw new InvalidOperationException(
                    $"Túi máu {bag.BagCode} đã hết hạn ngày {bag.ExpiryDate:dd/MM/yyyy}, không chuyển sang \"{target}\" được.");

            // Optimistic check on the status read above (a concurrent transfusion start must not be overwritten).
            var rows = await _context.Database.ExecuteSqlRawAsync(
                "UPDATE BloodBags SET Status=@p0, Note=@p1 WHERE Id=@p2 AND Status=@p3",
                P("@p0", target), P("@p1", reason), P("@p2", bloodBagId), P("@p3", bag.Status));
            if (rows == 0)
                throw new InvalidOperationException($"Túi máu {bag.BagCode} vừa được người khác đổi trạng thái — tải lại rồi thử lại.");
            return true;
        }

        /// <summary>
        /// QA-R11: date-only upper bound (FE/controller default "today 00:00") = whole day inclusive — same rule as
        /// GetIssueRequestsAsync. `&lt;= 00:00` hid every receipt/issue/inventory/order made today.
        /// </summary>
        private static DateTime InclusiveEndOfDay(DateTime toDate)
        {
            var sqlMax = (DateTime)System.Data.SqlTypes.SqlDateTime.MaxValue;
            return toDate.TimeOfDay == TimeSpan.Zero && toDate < sqlMax.AddDays(-1)
                ? toDate.AddDays(1).AddMilliseconds(-3) // datetime precision: 23:59:59.997
                : toDate;
        }

        /// <summary>
        /// Manual status changes allowed by <see cref="UpdateBloodBagStatusAsync"/>. Terminal: Transfused, Destroyed,
        /// Cancelled (no entry = nothing allowed). 'Quarantine' = pulled during a reaction (QA round 4), never back
        /// to stock. Issued/Transfusing/Transfused are reached only through the issue / transfusion workflow.
        /// </summary>
        private static readonly Dictionary<string, string[]> BagManualTransitions = new()
        {
            ["Available"]   = new[] { "Reserved", "Quarantine", "Expired", "Destroyed" },
            ["Reserved"]    = new[] { "Available", "Quarantine", "Expired", "Destroyed" },
            ["Issued"]      = new[] { "Returned", "Quarantine" },
            ["Returned"]    = new[] { "Available", "Quarantine", "Destroyed" },
            ["Expired"]     = new[] { "Destroyed" },
            ["Quarantine"]  = new[] { "Destroyed" },
            ["Transfusing"] = Array.Empty<string>(),
            ["Transfused"]  = Array.Empty<string>(),
            ["Destroyed"]   = Array.Empty<string>(),
            ["Cancelled"]   = Array.Empty<string>(),
        };

        public async Task<List<BloodStockDetailDto>> GetExpiringBloodBagsAsync(int daysUntilExpiry = 7)
        {
            // No status filter: show Available + Reserved bags nearing expiry
            return await GetBloodStockDetailInternalAsync(null, null, null, null, daysUntilExpiry, false);
        }

        public async Task<List<BloodStockDetailDto>> GetExpiredBloodBagsAsync()
        {
            return await GetBloodStockDetailInternalAsync(null, null, null, null, null, true);
        }

        public async Task<bool> DestroyExpiredBloodBagsAsync(List<Guid> bloodBagIds, string reason)
        {
            if (bloodBagIds == null || !bloodBagIds.Any())
                throw new ArgumentException("Chọn ít nhất một túi máu để tiêu hủy.", nameof(bloodBagIds));
            // QA round 4: reason is the audit trail of a destroyed unit — the v2 modal already requires it
            if (string.IsNullOrWhiteSpace(reason))
                throw new ArgumentException("Nhập lý do tiêu hủy túi máu.", nameof(reason));

            // #195: 1 UPDATE cho cả danh sách thay vì 1 UPDATE/túi. Tham số vẫn truyền riêng
            // từng id (không nội suy vào chuỗi SQL); huỷ cả lô giờ là một thao tác nguyên khối
            // chứ không còn nửa chừng khi lỗi giữa vòng lặp.
            var ids = bloodBagIds.Distinct().ToList();
            var idParams = string.Join(",", ids.Select((_, i) => $"@p{i + 1}"));
            var args = new object[ids.Count + 1];
            args[0] = reason;
            for (int i = 0; i < ids.Count; i++) args[i + 1] = ids[i];

            // QA round 4: any id was destroyable — a bag mid-transfusion, an already transfused one, a reserved
            // one (its assignment kept pointing at a destroyed unit), and unknown ids answered 200. Check the
            // whole batch first so a bad id destroys nothing.
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open) await connection.OpenAsync();
            var found = new Dictionary<Guid, (string Code, string Status)>();
            using (var cmd = connection.CreateCommand())
            {
                cmd.CommandText = "SELECT Id, BagCode, Status FROM BloodBags WHERE Id IN (" + idParams + ")";
                for (int i = 0; i < ids.Count; i++) cmd.Parameters.Add(new SqlParameter($"@p{i + 1}", ids[i]));
                using var r = await cmd.ExecuteReaderAsync();
                while (await r.ReadAsync())
                    found[r.GetGuid(0)] = (r.IsDBNull(1) ? "" : r.GetString(1), r.IsDBNull(2) ? "" : r.GetString(2));
            }
            var missing = ids.FirstOrDefault(id => !found.ContainsKey(id));
            if (missing != Guid.Empty || found.Count != ids.Count)
                throw new KeyNotFoundException($"Không tìm thấy túi máu {missing}.");
            var blocked = new[] { "Reserved", "Transfusing", "Transfused", "Destroyed" };
            foreach (var (code, status) in found.Values)
                if (blocked.Contains(status, StringComparer.OrdinalIgnoreCase))
                    throw new InvalidOperationException(
                        $"Túi máu {code} đang ở trạng thái \"{status}\", không tiêu hủy được (hủy gán/kết thúc truyền trước).");

            // Nối chuỗi thay vì nội suy: chỉ có tên tham số được ghép vào câu lệnh, và tránh
            // luôn cảnh báo EF1002 (nội suy vào SQL thô) vốn không nên xuất hiện ở module này.
            var sql = "UPDATE BloodBags SET Status='Destroyed', Note=@p0 WHERE Id IN (" + idParams + ")"
                    + " AND Status NOT IN ('Reserved','Transfusing','Transfused','Destroyed')";
            await _context.Database.ExecuteSqlRawAsync(sql, args);
            return true;
        }

        #endregion
    }
}
