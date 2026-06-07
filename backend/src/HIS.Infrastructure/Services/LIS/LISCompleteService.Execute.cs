using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Microsoft.Data.SqlClient;
using HIS.Application.DTOs.Laboratory;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Services.HL7;

// Alias to avoid ambiguity
using ApproveLabResultDtoService = HIS.Application.Services.ApproveLabResultDto;


namespace HIS.Infrastructure.Services;

// K11 phien 1 (2026-05-30, post-feedback Plan A): tach 7.3 Thực hiện xét nghiệm (~1008 dong) vao subfolder Services/LIS/.
public partial class LISCompleteService {
    #region 7.3 Thực hiện xét nghiệm

    public async Task<List<LabOrderDto>> GetPendingLabOrdersAsync(DateTime date, Guid? departmentId = null, Guid? analyzerId = null, string patientType = null, string keyword = null)
    {
        // Handle invalid date - use today if date is MinValue or out of SQL range
        if (date == DateTime.MinValue || date.Year < 1753)
        {
            date = DateTime.Today;
        }

        // Query từ database thật
        var sql = @"
            SELECT
                o.Id, o.OrderCode, o.PatientId, o.Status, o.IsPriority, o.IsEmergency,
                o.Diagnosis, o.Notes, o.ClinicalNotes, o.SampleBarcode, o.SampleType,
                o.CollectedAt, o.ProcessingStartTime, o.ProcessingEndTime, o.OrderedAt, o.ApprovedAt,
                o.OrderDepartmentId, o.AnalyzerId,
                p.PatientCode, p.FullName AS PatientName, p.DateOfBirth, p.Gender,
                d.DepartmentName AS OrderDepartmentName,
                u.FullName AS OrderDoctorName
            FROM LabOrders o
            INNER JOIN Patients p ON o.PatientId = p.Id
            LEFT JOIN Departments d ON o.OrderDepartmentId = d.Id
            LEFT JOIN Users u ON o.OrderDoctorId = u.Id
            WHERE o.IsDeleted = 0
            AND CAST(o.OrderedAt AS DATE) = CAST(@Date AS DATE)
        ";

        var parameters = new List<Microsoft.Data.SqlClient.SqlParameter>
        {
            new Microsoft.Data.SqlClient.SqlParameter("@Date", date)
        };

        if (departmentId.HasValue)
        {
            sql += " AND o.OrderDepartmentId = @DeptId";
            parameters.Add(new Microsoft.Data.SqlClient.SqlParameter("@DeptId", departmentId.Value));
        }

        if (!string.IsNullOrEmpty(keyword))
        {
            sql += " AND (p.PatientCode LIKE @Keyword OR p.FullName LIKE @Keyword OR o.OrderCode LIKE @Keyword)";
            parameters.Add(new Microsoft.Data.SqlClient.SqlParameter("@Keyword", $"%{keyword}%"));
        }

        sql += " ORDER BY o.IsEmergency DESC, o.IsPriority DESC, o.OrderedAt DESC";

        var result = new List<LabOrderDto>();

        using (var connection = new Microsoft.Data.SqlClient.SqlConnection(_context.Database.GetConnectionString()))
        {
            await connection.OpenAsync();
            using (var command = new Microsoft.Data.SqlClient.SqlCommand(sql, connection))
            {
                command.Parameters.AddRange(parameters.ToArray());
                using (var reader = await command.ExecuteReaderAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        var orderId = reader.GetGuid(reader.GetOrdinal("Id"));
                        var dto = new LabOrderDto
                        {
                            Id = orderId,
                            OrderCode = reader.GetString(reader.GetOrdinal("OrderCode")),
                            PatientId = reader.GetGuid(reader.GetOrdinal("PatientId")),
                            PatientCode = reader.IsDBNull(reader.GetOrdinal("PatientCode")) ? "" : reader.GetString(reader.GetOrdinal("PatientCode")),
                            PatientName = reader.IsDBNull(reader.GetOrdinal("PatientName")) ? "" : reader.GetString(reader.GetOrdinal("PatientName")),
                            DateOfBirth = reader.IsDBNull(reader.GetOrdinal("DateOfBirth")) ? null : reader.GetDateTime(reader.GetOrdinal("DateOfBirth")),
                            Gender = reader.IsDBNull(reader.GetOrdinal("Gender")) ? null : reader.GetInt32(reader.GetOrdinal("Gender")) == 1 ? "Nam" : "Nữ",
                            OrderDepartmentName = reader.IsDBNull(reader.GetOrdinal("OrderDepartmentName")) ? null : reader.GetString(reader.GetOrdinal("OrderDepartmentName")),
                            OrderDoctorName = reader.IsDBNull(reader.GetOrdinal("OrderDoctorName")) ? "" : reader.GetString(reader.GetOrdinal("OrderDoctorName")),
                            Status = reader.GetInt32(reader.GetOrdinal("Status")),
                            IsPriority = reader.GetBoolean(reader.GetOrdinal("IsPriority")),
                            IsEmergency = reader.GetBoolean(reader.GetOrdinal("IsEmergency")),
                            Diagnosis = reader.IsDBNull(reader.GetOrdinal("Diagnosis")) ? null : reader.GetString(reader.GetOrdinal("Diagnosis")),
                            Notes = reader.IsDBNull(reader.GetOrdinal("Notes")) ? null : reader.GetString(reader.GetOrdinal("Notes")),
                            OrderedAt = reader.GetDateTime(reader.GetOrdinal("OrderedAt")),
                            CollectedAt = reader.IsDBNull(reader.GetOrdinal("CollectedAt")) ? null : reader.GetDateTime(reader.GetOrdinal("CollectedAt")),
                            CompletedAt = reader.IsDBNull(reader.GetOrdinal("ProcessingEndTime")) ? null : reader.GetDateTime(reader.GetOrdinal("ProcessingEndTime")),
                            ApprovedAt = reader.IsDBNull(reader.GetOrdinal("ApprovedAt")) ? null : reader.GetDateTime(reader.GetOrdinal("ApprovedAt")),
                            SampleBarcode = reader.IsDBNull(reader.GetOrdinal("SampleBarcode")) ? null : reader.GetString(reader.GetOrdinal("SampleBarcode")),
                            SampleType = reader.IsDBNull(reader.GetOrdinal("SampleType")) ? null : reader.GetString(reader.GetOrdinal("SampleType")),
                            Tests = new List<LabTestItemDto>()
                        };
                        result.Add(dto);
                    }
                }
            }

            // Load test items for each order
            foreach (var order in result)
            {
                var itemsSql = @"
                    SELECT Id, TestCode, TestName, TestGroupName, Unit, ReferenceRange,
                           NormalMin, NormalMax, CriticalLow, CriticalHigh, Result, ResultStatus
                    FROM LabOrderItems
                    WHERE LabOrderId = @OrderId";

                using (var itemCmd = new Microsoft.Data.SqlClient.SqlCommand(itemsSql, connection))
                {
                    itemCmd.Parameters.AddWithValue("@OrderId", order.Id);
                    using (var itemReader = await itemCmd.ExecuteReaderAsync())
                    {
                        while (await itemReader.ReadAsync())
                        {
                            order.Tests.Add(new LabTestItemDto
                            {
                                Id = itemReader.GetGuid(0),
                                TestCode = itemReader.GetString(1),
                                TestName = itemReader.GetString(2),
                                TestGroup = itemReader.IsDBNull(3) ? null : itemReader.GetString(3),
                                Unit = itemReader.IsDBNull(4) ? null : itemReader.GetString(4),
                                ReferenceRange = itemReader.IsDBNull(5) ? null : itemReader.GetString(5),
                                NormalMin = itemReader.IsDBNull(6) ? null : itemReader.GetDecimal(6),
                                NormalMax = itemReader.IsDBNull(7) ? null : itemReader.GetDecimal(7),
                                CriticalLow = itemReader.IsDBNull(8) ? null : itemReader.GetDecimal(8),
                                CriticalHigh = itemReader.IsDBNull(9) ? null : itemReader.GetDecimal(9),
                                Result = itemReader.IsDBNull(10) ? null : itemReader.GetString(10),
                                ResultStatus = itemReader.IsDBNull(11) ? null : itemReader.GetInt32(11)
                            });
                        }
                    }
                }
            }
        }

        return result;
    }

    public async Task<LabOrderDetailDto> GetLabOrderDetailAsync(Guid orderId)
    {
        using var connection = new SqlConnection(_context.Database.GetConnectionString());
        await connection.OpenAsync();

        var orderSql = @"
            SELECT o.Id, o.OrderCode, o.PatientId, o.OrderedAt, o.Diagnosis, o.ClinicalNotes,
                   o.SampleBarcode, o.SampleType, o.Status,
                   p.PatientCode, p.FullName AS PatientName,
                   d.DepartmentName, u.FullName AS OrderDoctorName
            FROM LabOrders o
            INNER JOIN Patients p ON o.PatientId = p.Id
            LEFT JOIN Departments d ON o.OrderDepartmentId = d.Id
            LEFT JOIN Users u ON o.OrderDoctorId = u.Id
            WHERE o.Id = @OrderId AND o.IsDeleted = 0";

        var result = new LabOrderDetailDto { Id = orderId };

        using (var cmd = new SqlCommand(orderSql, connection))
        {
            cmd.Parameters.AddWithValue("@OrderId", orderId);
            using var reader = await cmd.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                result.OrderCode = reader.IsDBNull(reader.GetOrdinal("OrderCode")) ? "" : reader.GetString(reader.GetOrdinal("OrderCode"));
                result.PatientId = reader.GetGuid(reader.GetOrdinal("PatientId"));
                result.PatientCode = reader.IsDBNull(reader.GetOrdinal("PatientCode")) ? "" : reader.GetString(reader.GetOrdinal("PatientCode"));
                result.PatientName = reader.IsDBNull(reader.GetOrdinal("PatientName")) ? "" : reader.GetString(reader.GetOrdinal("PatientName"));
                result.OrderDate = reader.GetDateTime(reader.GetOrdinal("OrderedAt"));
                result.OrderDoctorName = reader.IsDBNull(reader.GetOrdinal("OrderDoctorName")) ? "" : reader.GetString(reader.GetOrdinal("OrderDoctorName"));
                result.DepartmentName = reader.IsDBNull(reader.GetOrdinal("DepartmentName")) ? "" : reader.GetString(reader.GetOrdinal("DepartmentName"));
                result.Diagnosis = reader.IsDBNull(reader.GetOrdinal("Diagnosis")) ? "" : reader.GetString(reader.GetOrdinal("Diagnosis"));
                result.ClinicalInfo = reader.IsDBNull(reader.GetOrdinal("ClinicalNotes")) ? "" : reader.GetString(reader.GetOrdinal("ClinicalNotes"));
            }
            else
            {
                return result; // Order not found, return empty
            }
        }

        // Load test items
        result.TestItems = new List<LabTestItemDto>();
        var itemsSql = @"
            SELECT i.Id, i.LabOrderId, i.TestCode, i.TestName, i.TestGroupName,
                   i.Unit, i.ReferenceRange, i.NormalMin, i.NormalMax, i.CriticalLow, i.CriticalHigh,
                   i.Result, i.ResultStatus, i.ResultEnteredAt,
                   s.Id AS TestId, s.UnitPrice AS UnitPrice, s.InsurancePrice
            FROM LabOrderItems i
            LEFT JOIN Services s ON i.TestCode = s.ServiceCode AND s.IsDeleted = 0
            WHERE i.LabOrderId = @OrderId";

        using (var cmd = new SqlCommand(itemsSql, connection))
        {
            cmd.Parameters.AddWithValue("@OrderId", orderId);
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var statusVal = reader.IsDBNull(reader.GetOrdinal("ResultStatus")) ? 1 : reader.GetInt32(reader.GetOrdinal("ResultStatus"));
                var hasResult = !reader.IsDBNull(reader.GetOrdinal("Result")) && reader.GetString(reader.GetOrdinal("Result")) != "";
                int itemStatus = hasResult ? (statusVal >= 5 ? 5 : 4) : 1; // 4=Có KQ, 5=Đã duyệt, 1=Chờ

                result.TestItems.Add(new LabTestItemDto
                {
                    Id = reader.GetGuid(reader.GetOrdinal("Id")),
                    LabOrderId = reader.GetGuid(reader.GetOrdinal("LabOrderId")),
                    TestId = reader.IsDBNull(reader.GetOrdinal("TestId")) ? Guid.Empty : reader.GetGuid(reader.GetOrdinal("TestId")),
                    TestCode = reader.GetString(reader.GetOrdinal("TestCode")),
                    TestName = reader.GetString(reader.GetOrdinal("TestName")),
                    TestGroup = reader.IsDBNull(reader.GetOrdinal("TestGroupName")) ? null : reader.GetString(reader.GetOrdinal("TestGroupName")),
                    Unit = reader.IsDBNull(reader.GetOrdinal("Unit")) ? null : reader.GetString(reader.GetOrdinal("Unit")),
                    ReferenceRange = reader.IsDBNull(reader.GetOrdinal("ReferenceRange")) ? null : reader.GetString(reader.GetOrdinal("ReferenceRange")),
                    NormalMin = reader.IsDBNull(reader.GetOrdinal("NormalMin")) ? null : reader.GetDecimal(reader.GetOrdinal("NormalMin")),
                    NormalMax = reader.IsDBNull(reader.GetOrdinal("NormalMax")) ? null : reader.GetDecimal(reader.GetOrdinal("NormalMax")),
                    CriticalLow = reader.IsDBNull(reader.GetOrdinal("CriticalLow")) ? null : reader.GetDecimal(reader.GetOrdinal("CriticalLow")),
                    CriticalHigh = reader.IsDBNull(reader.GetOrdinal("CriticalHigh")) ? null : reader.GetDecimal(reader.GetOrdinal("CriticalHigh")),
                    Result = reader.IsDBNull(reader.GetOrdinal("Result")) ? null : reader.GetString(reader.GetOrdinal("Result")),
                    ResultStatus = reader.IsDBNull(reader.GetOrdinal("ResultStatus")) ? null : reader.GetInt32(reader.GetOrdinal("ResultStatus")),
                    AbnormalFlag = reader.IsDBNull(reader.GetOrdinal("ResultStatus")) ? null : reader.GetInt32(reader.GetOrdinal("ResultStatus")),
                    AbnormalFlagName = reader.IsDBNull(reader.GetOrdinal("ResultStatus")) ? null : reader.GetInt32(reader.GetOrdinal("ResultStatus")) switch
                    {
                        0 => "Bình thường", 1 => "Thấp", 2 => "Cao", 3 => "Nguy hiểm thấp", 4 => "Nguy hiểm cao", _ => null
                    },
                    Status = itemStatus,
                    StatusName = itemStatus switch { 1 => "Chờ mẫu", 2 => "Có mẫu", 3 => "Đang XN", 4 => "Có KQ", 5 => "Đã duyệt", _ => "Chờ" },
                    UnitPrice = reader.IsDBNull(reader.GetOrdinal("UnitPrice")) ? 0 : reader.GetDecimal(reader.GetOrdinal("UnitPrice")),
                    InsurancePrice = reader.IsDBNull(reader.GetOrdinal("InsurancePrice")) ? 0 : reader.GetDecimal(reader.GetOrdinal("InsurancePrice")),
                    ResultAt = reader.IsDBNull(reader.GetOrdinal("ResultEnteredAt")) ? null : reader.GetDateTime(reader.GetOrdinal("ResultEnteredAt")),
                });
            }
        }

        // Load sample collection info
        result.Samples = new List<SampleCollectionItemDto>();

        return result;
    }

    public async Task<SendWorklistResultDto> SendWorklistToAnalyzerAsync(SendWorklistDto dto)
    {
        // MockMode: log the order list and return real count from DB — no socket sent.
        // TODO(real): when analyzer driver is available, open TCP/serial and send HL7 ORM.
        bool mockMode = _configuration.GetValue<bool>("LIS:MockMode", true);

        // Count real pending orders for the analyzer
        int realCount = 0;
        if (dto.OrderIds != null && dto.OrderIds.Count > 0)
        {
            realCount = dto.OrderIds.Count;
        }
        else
        {
            // Count all pending worklist items for this analyzer from DB
            realCount = await _context.LabWorklists
                .CountAsync(w => w.AnalyzerId == dto.AnalyzerId && w.Status == 0);
        }

        _logger.LogInformation(
            "[MockMode={MockMode}] SendWorklistToAnalyzer: analyzerId={AnalyzerId}, orderCount={Count}",
            mockMode, dto.AnalyzerId, realCount);

        if (!mockMode)
        {
            // TODO: real driver — open connection and send HL7 ORM^O01 per order
            _logger.LogWarning("SendWorklistToAnalyzer real driver not yet implemented — falling back to MockMode");
        }

        return new SendWorklistResultDto
        {
            Success = true,
            SentCount = realCount,
            FailedCount = 0,
            Errors = mockMode ? new List<string> { "[MockMode] Worklist logged, not sent via hardware" } : new List<string>()
        };
    }

    public async Task<ReceiveResultDto> ReceiveResultFromAnalyzerAsync(Guid analyzerId)
    {
        // Trigger ProcessAnalyzerResultAsync with an empty payload so the inbox reflects
        // results already pushed via HL7ReceiverService (TCP) or mock-receive endpoint.
        // For polling-based analyzers: TODO — pull from analyzer socket here.
        bool mockMode = _configuration.GetValue<bool>("LIS:MockMode", true);

        _logger.LogInformation(
            "[MockMode={MockMode}] ReceiveResultFromAnalyzer: analyzerId={AnalyzerId}",
            mockMode, analyzerId);

        // Return summary of current inbox state for this analyzer
        var inboxItems = await _context.LabRawResults
            .Where(r => r.AnalyzerId == analyzerId && !r.IsDeleted)
            .ToListAsync();

        var pending  = inboxItems.Count(r => r.Status == 0);
        var matched  = inboxItems.Count(r => r.Status == 1);
        var errored  = inboxItems.Count(r => r.Status == 3);

        return new ReceiveResultDto
        {
            ReceivedCount  = inboxItems.Count,
            ProcessedCount = matched,
            ErrorCount     = errored,
            Errors = mockMode
                ? new List<string> { $"[MockMode] Inbox has {pending} pending, {matched} matched" }
                : new List<string>(),
            Results = inboxItems.Take(50).Select(r => new AnalyzerResultDto
            {
                SampleId   = r.SampleId ?? "",
                TestCode   = r.TestCode ?? "",
                Result     = r.Result ?? "",
                Unit       = r.Unit,
                Flag       = r.Flag,
                ResultTime = r.ResultTime ?? r.CreatedAt,
                AnalyzerId = r.AnalyzerId
            }).ToList()
        };
    }

    public async Task<List<AnalyzerInboxItemDto>> GetAnalyzerInboxAsync(AnalyzerInboxQueryDto query)
    {
        var q = _context.LabRawResults
            .Include(r => r.Analyzer)
            .Where(r => !r.IsDeleted)
            .AsQueryable();

        if (query.AnalyzerId.HasValue)
            q = q.Where(r => r.AnalyzerId == query.AnalyzerId.Value);

        if (query.Status.HasValue)
            q = q.Where(r => r.Status == query.Status.Value);

        if (query.FromDate.HasValue)
            q = q.Where(r => r.CreatedAt >= query.FromDate.Value);

        if (query.ToDate.HasValue)
        {
            var toEnd = query.ToDate.Value.Date.AddDays(1);
            q = q.Where(r => r.CreatedAt < toEnd);
        }

        var items = await q
            .OrderByDescending(r => r.CreatedAt)
            .Skip(query.Page * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync();

        return items.Select(r => new AnalyzerInboxItemDto
        {
            Id                      = r.Id,
            AnalyzerId              = r.AnalyzerId,
            AnalyzerName            = r.Analyzer?.Name ?? "",
            SampleBarcode           = r.SampleId ?? "",
            TestCode                = r.TestCode ?? "",
            Result                  = r.Result ?? "",
            Unit                    = r.Unit ?? "",
            Flag                    = r.Flag ?? "",
            ResultTime              = r.ResultTime,
            ReceivedAt              = r.CreatedAt,
            Status                  = r.Status,
            StatusName              = r.Status switch
            {
                0 => "Chờ",
                1 => "Đã khớp",
                2 => "Khớp thủ công",
                3 => "Từ chối",
                4 => "Đã chuyển",
                _ => "Không rõ"
            },
            MatchedLabRequestItemId = r.MappedToLabRequestItemId,
            RejectedReason          = r.RejectedReason,
            TransferredAt           = r.TransferredAt,
        }).ToList();
    }

    public async Task<bool> TransferInboxResultAsync(Guid inboxId, Guid? userId = null)
    {
        var raw = await _context.LabRawResults.FindAsync(inboxId);
        if (raw == null) throw new InvalidOperationException($"Inbox item {inboxId} not found");
        if (raw.Status != 1 && raw.Status != 2)
            throw new InvalidOperationException("Only Matched or ManualMapped items can be transferred");
        if (!raw.MappedToLabRequestItemId.HasValue)
            throw new InvalidOperationException("No matched LabRequestItem — cannot transfer");

        // Reuse existing EnterLabResultAsync flow to write result into LabOrderItem
        var enterDto = new EnterLabResultDto
        {
            LabTestItemId = raw.MappedToLabRequestItemId.Value,
            Result        = raw.Result ?? "",
            Notes         = $"[Auto-transferred from analyzer inbox {inboxId}]",
        };

        var success = await EnterLabResultAsync(enterDto);
        if (!success) return false;

        // Mark as Transferred
        raw.Status        = 4;
        raw.TransferredAt = DateTime.UtcNow;
        raw.UpdatedAt     = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Transferred inbox result {InboxId} to LabOrderItem {ItemId}", inboxId, raw.MappedToLabRequestItemId);
        return true;
    }

    public async Task<bool> RejectInboxResultAsync(Guid inboxId, string reason)
    {
        var raw = await _context.LabRawResults.FindAsync(inboxId);
        if (raw == null) throw new InvalidOperationException($"Inbox item {inboxId} not found");

        raw.Status         = 3; // Ignored/Rejected
        raw.RejectedReason = reason;
        raw.UpdatedAt      = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Rejected inbox result {InboxId}, reason: {Reason}", inboxId, reason);
        return true;
    }

    public async Task<ProcessAnalyzerResultDto> MockReceiveResultsAsync(Guid analyzerId, List<MockLabResultDto> results)
    {
        // Build minimal HL7 ORU^R01 from JSON list → reuse ProcessAnalyzerResultAsync parser
        // This is the mock-receive path; real HL7 push goes through HL7ReceiverService TCP.
        _logger.LogInformation("[MockReceive] analyzer={AnalyzerId}, items={Count}", analyzerId, results.Count);

        var sb = new System.Text.StringBuilder();
        var ts = DateTime.Now.ToString("yyyyMMddHHmmss");
        sb.AppendLine($"MSH|^~\\&|MOCK|LAB|HIS|HOSPITAL|{ts}||ORU^R01|MOCK{ts}|P|2.5");
        sb.AppendLine("PID|1||MOCKPID^^^MRN||MOCK^PATIENT||19800101|M");

        foreach (var item in results)
        {
            var barcode = item.SampleBarcode ?? "MOCK001";
            var obTime  = (item.ResultTime ?? DateTime.Now).ToString("yyyyMMddHHmmss");
            sb.AppendLine($"OBR|1|{barcode}|{barcode}|{item.TestCode}^{item.TestCode}||{obTime}");
            sb.AppendLine($"OBX|1|NM|{item.TestCode}^{item.TestCode}||{item.Result}|{item.Unit ?? ""}|{item.Flag ?? "N"}|||F|||{obTime}");
        }

        return await ProcessAnalyzerResultAsync(analyzerId, sb.ToString());
    }

    public async Task<bool> EnterLabResultAsync(EnterLabResultDto dto)
    {
        using var connection = new SqlConnection(_context.Database.GetConnectionString());
        await connection.OpenAsync();

        // Get reference ranges for abnormal flag calculation
        var getSql = @"SELECT NormalMin, NormalMax, CriticalLow, CriticalHigh, LabOrderId
                       FROM LabOrderItems WHERE Id = @ItemId";
        decimal? normalMin = null, normalMax = null, criticalLow = null, criticalHigh = null;
        Guid? labOrderId = null;

        using (var getCmd = new SqlCommand(getSql, connection))
        {
            getCmd.Parameters.AddWithValue("@ItemId", dto.LabTestItemId);
            using var reader = await getCmd.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                normalMin = reader.IsDBNull(0) ? null : reader.GetDecimal(0);
                normalMax = reader.IsDBNull(1) ? null : reader.GetDecimal(1);
                criticalLow = reader.IsDBNull(2) ? null : reader.GetDecimal(2);
                criticalHigh = reader.IsDBNull(3) ? null : reader.GetDecimal(3);
                labOrderId = reader.GetGuid(4);
            }
        }

        // Calculate result status
        int resultStatus = 0;
        if (decimal.TryParse(dto.Result, out var numericValue))
        {
            if (criticalLow.HasValue && numericValue < criticalLow.Value) resultStatus = 3;
            else if (criticalHigh.HasValue && numericValue > criticalHigh.Value) resultStatus = 4;
            else if (normalMin.HasValue && numericValue < normalMin.Value) resultStatus = 1;
            else if (normalMax.HasValue && numericValue > normalMax.Value) resultStatus = 2;
        }

        var updateSql = @"UPDATE LabOrderItems
                          SET Result = @Result, ResultStatus = @ResultStatus, ResultEnteredAt = GETDATE()
                          WHERE Id = @ItemId";
        using (var cmd = new SqlCommand(updateSql, connection))
        {
            cmd.Parameters.AddWithValue("@Result", dto.Result);
            cmd.Parameters.AddWithValue("@ResultStatus", resultStatus);
            cmd.Parameters.AddWithValue("@ItemId", dto.LabTestItemId);
            await cmd.ExecuteNonQueryAsync();
        }

        // Update order status if all items have results
        if (labOrderId.HasValue)
        {
            var checkSql = @"SELECT COUNT(*) FROM LabOrderItems
                             WHERE LabOrderId = @OrderId AND (Result IS NULL OR Result = '')";
            using var checkCmd = new SqlCommand(checkSql, connection);
            checkCmd.Parameters.AddWithValue("@OrderId", labOrderId.Value);
            var pending = (int)await checkCmd.ExecuteScalarAsync();

            var orderStatus = pending == 0 ? 3 : 2; // 3=Chờ duyệt, 2=Đang XN
            var updateOrderSql = @"UPDATE LabOrders SET Status = @Status,
                                   ProcessingEndTime = CASE WHEN @Status = 3 THEN GETDATE() ELSE ProcessingEndTime END
                                   WHERE Id = @OrderId AND Status < 3";
            using var updateOrderCmd = new SqlCommand(updateOrderSql, connection);
            updateOrderCmd.Parameters.AddWithValue("@Status", orderStatus);
            updateOrderCmd.Parameters.AddWithValue("@OrderId", labOrderId.Value);
            await updateOrderCmd.ExecuteNonQueryAsync();
        }

        return true;
    }

    public async Task<bool> ApproveLabResultAsync(ApproveLabResultDtoService dto)
    {
        using var connection = new SqlConnection(_context.Database.GetConnectionString());
        await connection.OpenAsync();

        // Update specific items or all items
        if (dto.ItemIds != null && dto.ItemIds.Any())
        {
            foreach (var itemId in dto.ItemIds)
            {
                var sql = @"UPDATE LabOrderItems SET ResultStatus = 5 WHERE Id = @ItemId AND Result IS NOT NULL";
                using var cmd = new SqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@ItemId", itemId);
                await cmd.ExecuteNonQueryAsync();
            }
        }
        else
        {
            var sql = @"UPDATE LabOrderItems SET ResultStatus = 5 WHERE LabOrderId = @OrderId AND Result IS NOT NULL";
            using var cmd = new SqlCommand(sql, connection);
            cmd.Parameters.AddWithValue("@OrderId", dto.OrderId);
            await cmd.ExecuteNonQueryAsync();
        }

        // Check if all items approved, update order status to 5 (Đã duyệt)
        var checkSql = @"SELECT COUNT(*) FROM LabOrderItems
                         WHERE LabOrderId = @OrderId AND (ResultStatus IS NULL OR ResultStatus < 5)
                         AND Result IS NOT NULL AND Result <> ''";
        using (var checkCmd = new SqlCommand(checkSql, connection))
        {
            checkCmd.Parameters.AddWithValue("@OrderId", dto.OrderId);
            var pendingApproval = (int)await checkCmd.ExecuteScalarAsync();
            if (pendingApproval == 0)
            {
                var updateOrderSql = @"UPDATE LabOrders SET Status = 5, ApprovedAt = GETDATE(),
                                       ApprovedById = @ApprovedBy
                                       WHERE Id = @OrderId";
                using var updateCmd = new SqlCommand(updateOrderSql, connection);
                updateCmd.Parameters.AddWithValue("@OrderId", dto.OrderId);
                updateCmd.Parameters.AddWithValue("@ApprovedBy", dto.ApprovedByUserId.HasValue ? (object)dto.ApprovedByUserId.Value : DBNull.Value);
                await updateCmd.ExecuteNonQueryAsync();
            }
        }

        _ = _notificationService.NotifyLabResultAsync(dto.OrderId, "Bác sĩ duyệt");
        return true;
    }

    public async Task<bool> PreliminaryApproveLabResultAsync(Guid orderId, string technicianNote, Guid? approvedByUserId = null)
    {
        using var connection = new SqlConnection(_context.Database.GetConnectionString());
        await connection.OpenAsync();

        // Set order status to 4 (Sơ duyệt - Preliminary approved)
        var sql = @"UPDATE LabOrders SET Status = 4, ApprovedById = @ApprovedBy,
                    Notes = COALESCE(Notes + CHAR(10), '') + @Note
                    WHERE Id = @OrderId AND Status >= 3";
        using var cmd = new SqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@OrderId", orderId);
        cmd.Parameters.AddWithValue("@ApprovedBy", approvedByUserId.HasValue ? (object)approvedByUserId.Value : DBNull.Value);
        cmd.Parameters.AddWithValue("@Note", $"[KTV] {technicianNote ?? ""}");
        await cmd.ExecuteNonQueryAsync();

        return true;
    }

    public async Task<bool> FinalApproveLabResultAsync(Guid orderId, string doctorNote, Guid? approvedByUserId = null)
    {
        using var connection = new SqlConnection(_context.Database.GetConnectionString());
        await connection.OpenAsync();

        // Approve all items
        var approveItemsSql = @"UPDATE LabOrderItems SET ResultStatus = 5
                                WHERE LabOrderId = @OrderId AND Result IS NOT NULL AND Result <> ''";
        using (var cmd = new SqlCommand(approveItemsSql, connection))
        {
            cmd.Parameters.AddWithValue("@OrderId", orderId);
            await cmd.ExecuteNonQueryAsync();
        }

        // Set order status to 5 (Đã duyệt cuối)
        var sql = @"UPDATE LabOrders SET Status = 5, ApprovedAt = GETDATE(), ApprovedById = @ApprovedBy,
                    Notes = COALESCE(Notes + CHAR(10), '') + @Note
                    WHERE Id = @OrderId";
        using (var cmd = new SqlCommand(sql, connection))
        {
            cmd.Parameters.AddWithValue("@OrderId", orderId);
            cmd.Parameters.AddWithValue("@ApprovedBy", approvedByUserId.HasValue ? (object)approvedByUserId.Value : DBNull.Value);
            cmd.Parameters.AddWithValue("@Note", $"[BS duyệt] {doctorNote ?? ""}");
            await cmd.ExecuteNonQueryAsync();
        }

        // Fire-and-forget email notification
        _ = _notificationService.NotifyLabResultAsync(orderId, "Bác sĩ duyệt");
        return true;
    }

    public async Task<bool> CancelApprovalAsync(Guid orderId, string reason)
    {
        using var connection = new SqlConnection(_context.Database.GetConnectionString());
        await connection.OpenAsync();

        // Revert item approval status back to 4 (Có KQ, chưa duyệt)
        var revertItemsSql = @"UPDATE LabOrderItems SET ResultStatus = 0
                               WHERE LabOrderId = @OrderId AND ResultStatus = 5";
        using (var cmd = new SqlCommand(revertItemsSql, connection))
        {
            cmd.Parameters.AddWithValue("@OrderId", orderId);
            await cmd.ExecuteNonQueryAsync();
        }

        // Set order status back to 3 (Chờ duyệt)
        var sql = @"UPDATE LabOrders SET Status = 3, ApprovedAt = NULL, ApprovedById = NULL,
                    Notes = COALESCE(Notes + CHAR(10), '') + @Note
                    WHERE Id = @OrderId AND Status >= 4";
        using (var cmd = new SqlCommand(sql, connection))
        {
            cmd.Parameters.AddWithValue("@OrderId", orderId);
            cmd.Parameters.AddWithValue("@Note", $"[Hủy duyệt] {reason ?? ""}");
            await cmd.ExecuteNonQueryAsync();
        }

        return true;
    }

    public async Task<byte[]> PrintLabResultAsync(Guid orderId, string format = "A4")
    {
        // Rule tài liệu: chưa duyệt KQ (Status < 4 — chưa duyệt sơ bộ/chính thức) → KHÔNG in,
        // báo "Không có số liệu". (Màn tại giường BedLabResultSection đã enforce; đây là màn chính.)
        var orderStatus = await _context.Database
            .SqlQueryRaw<int>("SELECT Status AS Value FROM LabOrders WHERE Id = {0} AND IsDeleted = 0", orderId)
            .FirstOrDefaultAsync();
        if (orderStatus < 4)
            throw new InvalidOperationException("Chưa duyệt kết quả — không có số liệu để in.");

        try
        {
            using var connection = new Microsoft.Data.SqlClient.SqlConnection(_context.Database.GetConnectionString());
            await connection.OpenAsync();

            // Get order info
            var orderSql = @"
                SELECT o.OrderCode, o.OrderedAt, o.SampleBarcode, o.SampleType, o.Diagnosis,
                       o.CollectedAt, o.ProcessingStartTime, o.ProcessingEndTime,
                       p.FullName AS PatientName, p.PatientCode, p.DateOfBirth, p.Gender, p.Address,
                       d.DepartmentName, u.FullName AS DoctorName
                FROM LabOrders o
                INNER JOIN Patients p ON o.PatientId = p.Id
                LEFT JOIN Departments d ON o.OrderDepartmentId = d.Id
                LEFT JOIN Users u ON o.OrderDoctorId = u.Id
                WHERE o.Id = @OrderId AND o.IsDeleted = 0";

            string? orderCode = null, patientName = null, patientCode = null, gender = null, address = null;
            string? sampleBarcode = null, sampleType = null, diagnosis = null, deptName = null, doctorName = null;
            DateTime? dob = null, orderedAt = null, collectedAt = null, completedAt = null;

            using (var cmd = new Microsoft.Data.SqlClient.SqlCommand(orderSql, connection))
            {
                cmd.Parameters.AddWithValue("@OrderId", orderId);
                using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    orderCode = reader["OrderCode"]?.ToString();
                    orderedAt = reader["OrderedAt"] as DateTime?;
                    sampleBarcode = reader["SampleBarcode"]?.ToString();
                    sampleType = reader["SampleType"]?.ToString();
                    diagnosis = reader["Diagnosis"]?.ToString();
                    collectedAt = reader["CollectedAt"] as DateTime?;
                    completedAt = reader["ProcessingEndTime"] as DateTime?;
                    patientName = reader["PatientName"]?.ToString();
                    patientCode = reader["PatientCode"]?.ToString();
                    dob = reader["DateOfBirth"] as DateTime?;
                    gender = reader["Gender"]?.ToString();
                    address = reader["Address"]?.ToString();
                    deptName = reader["DepartmentName"]?.ToString();
                    doctorName = reader["DoctorName"]?.ToString();
                }
            }

            if (orderCode == null)
                return System.Text.Encoding.UTF8.GetBytes("Order not found");

            // Get test results
            var resultSql = @"
                SELECT
                    COALESCE(s.ServiceName, i.TestName) AS TestName,
                    i.TestCode,
                    CAST(NULL AS nvarchar(255)) AS ParameterName,
                    i.Result,
                    CAST(NULL AS decimal(18,2)) AS NumericResult,
                    COALESCE(i.Unit, s.Unit) AS Unit,
                    i.ReferenceRange,
                    i.NormalMin AS ReferenceMin,
                    i.NormalMax AS ReferenceMax,
                    CASE WHEN i.ResultStatus IN (1, 2, 3, 4) THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS IsAbnormal,
                    i.ResultStatus AS AbnormalType,
                    0 AS SequenceNumber,
                    s.Id AS TestId
                FROM LabOrderItems i
                LEFT JOIN Services s ON i.TestCode = s.ServiceCode AND s.IsDeleted = 0
                WHERE i.LabOrderId = @OrderId
                ORDER BY COALESCE(s.ServiceName, i.TestName), i.TestCode";

            var results = new System.Collections.Generic.List<(string testName, string paramName, string result, string unit, string refRange, bool isAbnormal, int? abnormalType)>();

            using (var cmd2 = new Microsoft.Data.SqlClient.SqlCommand(resultSql, connection))
            {
                cmd2.Parameters.AddWithValue("@OrderId", orderId);
                using var reader2 = await cmd2.ExecuteReaderAsync();
                while (await reader2.ReadAsync())
                {
                    results.Add((
                        reader2["TestName"]?.ToString() ?? "",
                        reader2["ParameterName"]?.ToString() ?? "",
                        reader2["Result"]?.ToString() ?? reader2["NumericResult"]?.ToString() ?? "",
                        reader2["Unit"]?.ToString() ?? "",
                        reader2["ReferenceRange"]?.ToString() ?? (reader2["ReferenceMin"] != DBNull.Value && reader2["ReferenceMax"] != DBNull.Value
                            ? $"{reader2["ReferenceMin"]} - {reader2["ReferenceMax"]}" : ""),
                        reader2["IsAbnormal"] is bool ab && ab,
                        reader2["AbnormalType"] as int?
                    ));
                }
            }

            // Get approver
            var approverSql = @"
                SELECT u.FullName
                FROM LabOrders o
                INNER JOIN Users u ON o.ApprovedById = u.Id
                WHERE o.Id = @OrderId AND o.IsDeleted = 0 AND o.ApprovedById IS NOT NULL";
            string? approverName = null;
            using (var cmd3 = new Microsoft.Data.SqlClient.SqlCommand(approverSql, connection))
            {
                cmd3.Parameters.AddWithValue("@OrderId", orderId);
                approverName = (await cmd3.ExecuteScalarAsync())?.ToString();
            }

            // Build HTML using existing PdfTemplateHelper
            int genderInt = gender?.ToLower() switch { "nam" or "male" => 1, "nữ" or "nu" or "female" => 2, _ => 0 };
            var labResults = results.Select(r => new PdfTemplateHelper.LabResultRow
            {
                TestName = string.IsNullOrEmpty(r.paramName) ? r.testName : $"{r.testName} - {r.paramName}",
                Result = r.result,
                Unit = r.unit,
                ReferenceRange = r.refRange,
                IsAbnormal = r.isAbnormal
            }).ToList();

            var html = PdfTemplateHelper.GetLabResult(
                patientCode, patientName, genderInt, dob,
                address, null, null,
                diagnosis, doctorName, deptName,
                orderedAt ?? DateTime.Now, completedAt,
                labResults, approverName);

            return System.Text.Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return System.Text.Encoding.UTF8.GetBytes($"LAB RESULT: {orderId}");
        }
    }

    public async Task<bool> ProcessCriticalValueAsync(ProcessCriticalValueDto dto)
    {
        try
        {
            var alert = await _context.Set<LabCriticalValueAlert>().FindAsync(dto.AlertId);
            if (alert == null) return false;

            if (dto.Action == "Acknowledge")
            {
                alert.IsAcknowledged = true;
                alert.AcknowledgedAt = DateTime.Now;
            }

            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error processing critical value alert {AlertId}", dto.AlertId);
            return true;
        }
    }

    public async Task<List<CriticalValueAlertDto>> GetCriticalValueAlertsAsync(DateTime fromDate, DateTime toDate, bool? acknowledged = null)
    {
        try
        {
            var query = _context.Set<LabCriticalValueAlert>()
                .Where(a => !a.IsDeleted && a.AlertTime >= fromDate && a.AlertTime <= toDate);

            if (acknowledged.HasValue)
                query = query.Where(a => a.IsAcknowledged == acknowledged.Value);

            var alerts = await query.OrderByDescending(a => a.AlertTime).ToListAsync();

            return alerts.Select(a => new CriticalValueAlertDto
            {
                LabTestItemId = a.LabResultId,
                LabOrderId = a.LabResultId,
                PatientName = a.Patient?.FullName ?? "",
                PatientCode = a.Patient?.PatientCode ?? "",
                TestName = a.TestName,
                Result = a.Result ?? a.NumericResult?.ToString() ?? "",
                Unit = a.Unit ?? "",
                ReferenceRange = $"{a.CriticalLow} - {a.CriticalHigh}",
                AbnormalFlag = a.AlertType,
                AlertAt = a.AlertTime,
                IsAcknowledged = a.IsAcknowledged,
                AcknowledgedAt = a.AcknowledgedAt,
                AcknowledgedBy = a.AcknowledgedByUser?.FullName
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting critical value alerts");
            return new List<CriticalValueAlertDto>();
        }
    }

    public async Task<bool> AcknowledgeCriticalValueAsync(Guid alertId, AcknowledgeCriticalValueDto dto)
    {
        try
        {
            var alert = await _context.Set<LabCriticalValueAlert>().FindAsync(alertId);
            if (alert == null) return false;

            alert.IsAcknowledged = true;
            alert.AcknowledgedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error acknowledging critical value {AlertId}", alertId);
            return true;
        }
    }

    public async Task<List<LabResultHistoryDto>> GetLabResultHistoryAsync(Guid patientId, string testCode = null, int? lastNMonths = 12)
    {
        var months = lastNMonths ?? 12;
        var fromDate = DateTime.Now.AddMonths(-months);

        var sql = @"
            SELECT o.Id AS OrderId, o.OrderedAt AS TestDate, o.ApprovedAt,
                   i.TestCode, i.TestName, i.Result, i.Unit, i.ReferenceRange, i.ResultStatus,
                   u.FullName AS ApprovedBy
            FROM LabOrderItems i
            INNER JOIN LabOrders o ON i.LabOrderId = o.Id
            LEFT JOIN Users u ON o.ApprovedById = u.Id
            WHERE o.PatientId = @PatientId AND o.IsDeleted = 0
              AND o.OrderedAt >= @FromDate
              AND i.Result IS NOT NULL AND i.Result <> ''";

        if (!string.IsNullOrEmpty(testCode))
        {
            sql += " AND i.TestCode = @TestCode";
        }

        sql += " ORDER BY o.OrderedAt DESC, i.TestName";

        var results = new List<LabResultHistoryDto>();

        using var connection = new SqlConnection(_context.Database.GetConnectionString());
        await connection.OpenAsync();
        using var cmd = new SqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@PatientId", patientId);
        cmd.Parameters.AddWithValue("@FromDate", fromDate);
        if (!string.IsNullOrEmpty(testCode))
            cmd.Parameters.AddWithValue("@TestCode", testCode);

        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var resultStatus = reader.IsDBNull(reader.GetOrdinal("ResultStatus")) ? 0 : reader.GetInt32(reader.GetOrdinal("ResultStatus"));
            results.Add(new LabResultHistoryDto
            {
                OrderId = reader.GetGuid(reader.GetOrdinal("OrderId")),
                TestDate = reader.GetDateTime(reader.GetOrdinal("TestDate")),
                TestCode = reader.GetString(reader.GetOrdinal("TestCode")),
                TestName = reader.GetString(reader.GetOrdinal("TestName")),
                Result = reader.IsDBNull(reader.GetOrdinal("Result")) ? "" : reader.GetString(reader.GetOrdinal("Result")),
                Unit = reader.IsDBNull(reader.GetOrdinal("Unit")) ? "" : reader.GetString(reader.GetOrdinal("Unit")),
                ReferenceRange = reader.IsDBNull(reader.GetOrdinal("ReferenceRange")) ? "" : reader.GetString(reader.GetOrdinal("ReferenceRange")),
                Flag = resultStatus switch { 0 => "Normal", 1 => "Low", 2 => "High", 3 => "Critical", 4 => "Critical", _ => "Normal" },
                ApprovedBy = reader.IsDBNull(reader.GetOrdinal("ApprovedBy")) ? "" : reader.GetString(reader.GetOrdinal("ApprovedBy"))
            });
        }

        return results;
    }

    public async Task<LabResultComparisonDto> CompareLabResultsAsync(Guid patientId, string testCode, int lastNTimes = 5)
    {
        var sql = @"
            SELECT TOP (@Count) o.OrderedAt AS TestDate, i.TestCode, i.TestName, i.Unit,
                   i.Result, i.ResultStatus
            FROM LabOrderItems i
            INNER JOIN LabOrders o ON i.LabOrderId = o.Id
            WHERE o.PatientId = @PatientId AND o.IsDeleted = 0
              AND i.TestCode = @TestCode
              AND i.Result IS NOT NULL AND i.Result <> ''
            ORDER BY o.OrderedAt DESC";

        var result = new LabResultComparisonDto { TestCode = testCode, DataPoints = new List<LabResultPointDto>() };

        using var connection = new SqlConnection(_context.Database.GetConnectionString());
        await connection.OpenAsync();
        using var cmd = new SqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@Count", lastNTimes);
        cmd.Parameters.AddWithValue("@PatientId", patientId);
        cmd.Parameters.AddWithValue("@TestCode", testCode);

        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            result.TestName ??= reader.IsDBNull(reader.GetOrdinal("TestName")) ? testCode : reader.GetString(reader.GetOrdinal("TestName"));
            result.Unit ??= reader.IsDBNull(reader.GetOrdinal("Unit")) ? "" : reader.GetString(reader.GetOrdinal("Unit"));

            var resultStr = reader.IsDBNull(reader.GetOrdinal("Result")) ? "" : reader.GetString(reader.GetOrdinal("Result"));
            var statusVal = reader.IsDBNull(reader.GetOrdinal("ResultStatus")) ? 0 : reader.GetInt32(reader.GetOrdinal("ResultStatus"));

            if (decimal.TryParse(resultStr, out var numericVal))
            {
                result.DataPoints.Add(new LabResultPointDto
                {
                    Date = reader.GetDateTime(reader.GetOrdinal("TestDate")),
                    Value = numericVal,
                    Flag = statusVal switch { 0 => "Normal", 1 => "Low", 2 => "High", 3 => "Critical", 4 => "Critical", _ => "Normal" }
                });
            }
        }

        // Reverse to chronological order and calculate trend
        result.DataPoints.Reverse();
        if (result.DataPoints.Count >= 2)
        {
            var first = result.DataPoints.First().Value;
            var last = result.DataPoints.Last().Value;
            if (first != 0)
            {
                result.TrendPercentage = Math.Round((last - first) / first * 100, 1);
                result.TrendDirection = result.TrendPercentage > 5 ? "Increasing" : result.TrendPercentage < -5 ? "Decreasing" : "Stable";
            }
        }

        return result;
    }

    public async Task<DeltaCheckResultDto> PerformDeltaCheckAsync(Guid orderId)
    {
        var result = new DeltaCheckResultDto { OrderId = orderId, Items = new List<DeltaCheckItemDto>() };

        // Get current order items and patient
        var sql = @"
            SELECT i.Id AS TestId, i.TestCode, i.TestName, i.Result AS CurrentResult, o.PatientId
            FROM LabOrderItems i
            INNER JOIN LabOrders o ON i.LabOrderId = o.Id
            WHERE o.Id = @OrderId AND o.IsDeleted = 0
              AND i.Result IS NOT NULL AND i.Result <> ''";

        using var connection = new SqlConnection(_context.Database.GetConnectionString());
        await connection.OpenAsync();

        var currentItems = new List<(Guid TestId, string TestCode, string TestName, string CurrentResult, Guid PatientId)>();
        using (var cmd = new SqlCommand(sql, connection))
        {
            cmd.Parameters.AddWithValue("@OrderId", orderId);
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                currentItems.Add((
                    reader.GetGuid(0),
                    reader.GetString(1),
                    reader.GetString(2),
                    reader.GetString(3),
                    reader.GetGuid(4)
                ));
            }
        }

        if (!currentItems.Any()) return result;
        var patientId = currentItems.First().PatientId;

        // For each test, find previous result
        foreach (var item in currentItems)
        {
            if (!decimal.TryParse(item.CurrentResult, out var currentVal)) continue;

            var prevSql = @"
                SELECT TOP 1 i2.Result, o2.OrderedAt
                FROM LabOrderItems i2
                INNER JOIN LabOrders o2 ON i2.LabOrderId = o2.Id
                WHERE o2.PatientId = @PatientId AND o2.Id <> @OrderId AND o2.IsDeleted = 0
                  AND i2.TestCode = @TestCode AND i2.Result IS NOT NULL AND i2.Result <> ''
                ORDER BY o2.OrderedAt DESC";

            using var prevCmd = new SqlCommand(prevSql, connection);
            prevCmd.Parameters.AddWithValue("@PatientId", patientId);
            prevCmd.Parameters.AddWithValue("@OrderId", orderId);
            prevCmd.Parameters.AddWithValue("@TestCode", item.TestCode);

            decimal? prevVal = null;
            DateTime? prevDate = null;
            using (var prevReader = await prevCmd.ExecuteReaderAsync())
            {
                if (await prevReader.ReadAsync())
                {
                    var prevStr = prevReader.IsDBNull(0) ? null : prevReader.GetString(0);
                    if (prevStr != null && decimal.TryParse(prevStr, out var pv))
                    {
                        prevVal = pv;
                        prevDate = prevReader.GetDateTime(1);
                    }
                }
            }

            decimal? deltaPercent = null;
            decimal deltaThreshold = 50m; // Default 50% threshold
            bool isCritical = false;

            if (prevVal.HasValue && prevVal.Value != 0)
            {
                deltaPercent = Math.Round(Math.Abs((currentVal - prevVal.Value) / prevVal.Value * 100), 1);
                isCritical = deltaPercent > deltaThreshold;
            }

            result.Items.Add(new DeltaCheckItemDto
            {
                TestId = item.TestId,
                TestCode = item.TestCode,
                TestName = item.TestName,
                CurrentValue = currentVal,
                PreviousValue = prevVal,
                PreviousDate = prevDate,
                DeltaPercent = deltaPercent,
                DeltaThreshold = deltaThreshold,
                IsCritical = isCritical
            });

            if (isCritical) result.HasCriticalDelta = true;
        }

        return result;
    }

    public async Task<bool> RerunLabTestAsync(Guid orderItemId, string reason)
    {
        using var connection = new SqlConnection(_context.Database.GetConnectionString());
        await connection.OpenAsync();

        // Clear previous result and reset status
        var sql = @"UPDATE LabOrderItems
                    SET Result = NULL, ResultStatus = NULL, ResultEnteredAt = NULL,
                        Notes = COALESCE(Notes + CHAR(10), '') + @Note
                    WHERE Id = @ItemId";
        using var cmd = new SqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@ItemId", orderItemId);
        cmd.Parameters.AddWithValue("@Note", $"[Làm lại] {reason ?? ""}");
        await cmd.ExecuteNonQueryAsync();

        // Update order status back to processing
        var orderSql = @"UPDATE LabOrders SET Status = 2
                         WHERE Id = (SELECT LabOrderId FROM LabOrderItems WHERE Id = @ItemId)
                         AND Status > 2";
        using var orderCmd = new SqlCommand(orderSql, connection);
        orderCmd.Parameters.AddWithValue("@ItemId", orderItemId);
        await orderCmd.ExecuteNonQueryAsync();

        return true;
    }

    public async Task<QCResultDto> RunQCAsync(RunQCDto dto)
    {
        // Validate QC result against Westgard rules
        var violations = new List<string>();
        bool isAccepted = true;
        decimal mean = 0, sd = 1, zScore = 0;

        try
        {
            using var connection = new SqlConnection(_context.Database.GetConnectionString());
            await connection.OpenAsync();

            // Find QC lot by lot number
            var lotSql = @"SELECT Id, Mean, SD FROM QCLots WHERE LotNumber = @LotNumber AND IsActive = 1";
            Guid? lotId = null;
            using (var cmd = new SqlCommand(lotSql, connection))
            {
                cmd.Parameters.AddWithValue("@LotNumber", dto.QCLotNumber ?? "");
                using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    lotId = reader.GetGuid(0);
                    mean = reader.IsDBNull(1) ? 0 : reader.GetDecimal(1);
                    sd = reader.IsDBNull(2) ? 1 : reader.GetDecimal(2);
                }
            }

            if (sd > 0)
            {
                zScore = Math.Round((dto.QCValue - mean) / sd, 2);
                var absZ = Math.Abs(zScore);
                if (absZ > 3) { violations.Add("1-3s: Vượt 3SD"); isAccepted = false; }
                else if (absZ > 2) { violations.Add("1-2s: Cảnh báo vượt 2SD"); }
            }

            // Save QC result
            if (lotId.HasValue)
            {
                var insertSql = @"INSERT INTO QCResults (Id, QCLotId, AnalyzerId, TestCode, Value, IsAccepted, Violations, RunDate, CreatedAt)
                                  VALUES (NEWID(), @LotId, @AnalyzerId, @TestCode, @Value, @IsAccepted, @Violations, @RunTime, GETDATE())";
                using (var cmd = new SqlCommand(insertSql, connection))
                {
                    cmd.Parameters.AddWithValue("@LotId", lotId.Value);
                    cmd.Parameters.AddWithValue("@AnalyzerId", dto.AnalyzerId);
                    cmd.Parameters.AddWithValue("@TestCode", "");
                    cmd.Parameters.AddWithValue("@Value", dto.QCValue);
                    cmd.Parameters.AddWithValue("@IsAccepted", isAccepted);
                    cmd.Parameters.AddWithValue("@Violations", string.Join("; ", violations));
                    cmd.Parameters.AddWithValue("@RunTime", dto.RunTime);
                    await cmd.ExecuteNonQueryAsync();
                }
            }
        }
        catch (SqlException ex) when (ex.Message.Contains("Invalid object name"))
        {
            _logger.LogWarning("QC tables not found: {Message}", ex.Message);
        }

        return new QCResultDto
        {
            IsAccepted = isAccepted,
            Violations = violations,
            Value = dto.QCValue,
            Mean = mean,
            SD = sd,
            ZScore = zScore,
            CV = mean != 0 ? Math.Round(sd / mean * 100, 2) : 0,
            QCLevel = dto.QCLevel,
            WestgardRule = violations.Any() ? violations.First() : "Pass"
        };
    }

    public async Task<LeveyJenningsChartDto> GetLeveyJenningsChartAsync(Guid testId, Guid analyzerId, DateTime fromDate, DateTime toDate)
    {
        var result = new LeveyJenningsChartDto { DataPoints = new List<QCDataPointDto>() };

        try
        {
            using var connection = new SqlConnection(_context.Database.GetConnectionString());
            await connection.OpenAsync();

            // Get QC lot mean/SD for chart reference lines
            var lotSql = @"SELECT TOP 1 Mean, SD FROM QCLots
                           WHERE AnalyzerId = @AnalyzerId AND IsActive = 1
                           ORDER BY CreatedAt DESC";
            using (var cmd = new SqlCommand(lotSql, connection))
            {
                cmd.Parameters.AddWithValue("@AnalyzerId", analyzerId);
                using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    result.Mean = reader.IsDBNull(0) ? 0 : reader.GetDecimal(0);
                    result.SD = reader.IsDBNull(1) ? 0 : reader.GetDecimal(1);
                }
            }

            // Calculate SD lines
            result.Plus1SD = result.Mean + result.SD;
            result.Plus2SD = result.Mean + 2 * result.SD;
            result.Plus3SD = result.Mean + 3 * result.SD;
            result.Minus1SD = result.Mean - result.SD;
            result.Minus2SD = result.Mean - 2 * result.SD;
            result.Minus3SD = result.Mean - 3 * result.SD;

            // Get QC data points
            var dataSql = @"SELECT RunDate, Value, IsAccepted, Violations
                           FROM QCResults
                           WHERE AnalyzerId = @AnalyzerId
                             AND RunDate >= @FromDate AND RunDate < @ToDate
                           ORDER BY RunDate";
            using (var cmd = new SqlCommand(dataSql, connection))
            {
                cmd.Parameters.AddWithValue("@AnalyzerId", analyzerId);
                cmd.Parameters.AddWithValue("@FromDate", fromDate);
                cmd.Parameters.AddWithValue("@ToDate", toDate.AddDays(1));
                using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    result.DataPoints.Add(new QCDataPointDto
                    {
                        Date = reader.GetDateTime(0),
                        Value = reader.GetDecimal(1),
                        IsRejected = !reader.GetBoolean(2),
                        Violations = reader.IsDBNull(3) ? null : reader.GetString(3)
                    });
                }
            }
        }
        catch (SqlException ex) when (ex.Message.Contains("Invalid object name"))
        {
            _logger.LogWarning("QC tables not found for Levey-Jennings chart: {Message}", ex.Message);
        }

        return result;
    }

    #endregion
}
