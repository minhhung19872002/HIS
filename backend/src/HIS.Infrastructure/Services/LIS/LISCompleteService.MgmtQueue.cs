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

// K11 phien 4: tach 7.4 Quản lý + HL7 + Queue Display (~549 dong) vao Services/LIS/. File goc giu DEV + Helper Methods.
public partial class LISCompleteService {
    #region 7.4 Quản lý

    public async Task<List<LabTestCatalogDto>> GetLabTestCatalogAsync(string keyword = null, Guid? groupId = null, bool? isActive = null)
    {
        try
        {
            var query = _context.Services
                .Where(s => !s.IsDeleted && s.ServiceType == 2); // Type 2 = Lab

            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(s => s.ServiceCode.Contains(keyword) || s.ServiceName.Contains(keyword));

            if (isActive.HasValue)
                query = query.Where(s => s.IsActive == isActive.Value);

            var services = await query
                .Include(s => s.ServiceGroup)
                .OrderBy(s => s.DisplayOrder)
                .ThenBy(s => s.ServiceCode)
                .ToListAsync();

            return services.Select(s => new LabTestCatalogDto
            {
                Id = s.Id,
                Code = s.ServiceCode,
                Name = s.ServiceName,
                GroupId = s.ServiceGroupId,
                GroupName = s.ServiceGroup?.GroupName ?? "",
                Unit = s.Unit ?? "",
                Price = s.UnitPrice,
                InsurancePrice = s.InsurancePrice,
                TATMinutes = s.EstimatedMinutes > 0 ? s.EstimatedMinutes : null,
                IsActive = s.IsActive
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting lab test catalog");
            return new List<LabTestCatalogDto>();
        }
    }

    public async Task<LabTestCatalogDto> SaveLabTestAsync(SaveLabTestDto dto)
    {
        return new LabTestCatalogDto { Code = dto.Code, Name = dto.Name };
    }

    public async Task<List<LabTestGroupDto>> GetLabTestGroupsAsync()
    {
        try
        {
            var groups = await _context.LabTestGroups
                .Where(g => !g.IsDeleted && g.IsActive)
                .OrderBy(g => g.SortOrder)
                .ToListAsync();
            return groups.Select(g => new LabTestGroupDto
            {
                Id = g.Id,
                Code = g.Code,
                Name = g.Name,
                SortOrder = g.SortOrder,
                IsActive = g.IsActive
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting lab test groups");
            return new List<LabTestGroupDto>();
        }
    }

    public async Task<LabTestGroupDto> SaveLabTestGroupAsync(SaveLabTestGroupDto dto)
    {
        return new LabTestGroupDto { Code = dto.Code, Name = dto.Name };
    }

    public async Task<List<ReferenceRangeDto>> GetReferenceRangesAsync(Guid testId)
    {
        try
        {
            var ranges = await _context.Set<LabReferenceRange>()
                .Where(r => !r.IsDeleted && r.IsActive && r.ServiceId == testId)
                .OrderBy(r => r.Gender)
                .ThenBy(r => r.AgeFromDays)
                .ToListAsync();

            return ranges.Select(r => new ReferenceRangeDto
            {
                Id = r.Id,
                TestId = r.ServiceId,
                Gender = r.Gender ?? "",
                AgeFromDays = r.AgeFromDays,
                AgeToDays = r.AgeToDays,
                LowValue = r.LowValue,
                HighValue = r.HighValue,
                TextRange = r.TextRange ?? "",
                Description = r.Description ?? ""
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting reference ranges for test {TestId}", testId);
            return new List<ReferenceRangeDto>();
        }
    }

    public async Task<bool> UpdateReferenceRangesAsync(Guid testId, List<UpdateReferenceRangeDto> ranges)
    {
        return true;
    }

    public async Task<CriticalValueConfigDto> GetCriticalValueConfigAsync(Guid testId)
    {
        try
        {
            var config = await _context.Set<LabCriticalValueConfig>()
                .Include(c => c.Service)
                .FirstOrDefaultAsync(c => !c.IsDeleted && c.IsActive && c.ServiceId == testId);

            if (config == null)
                return new CriticalValueConfigDto { TestId = testId };

            return new CriticalValueConfigDto
            {
                TestId = config.ServiceId,
                TestCode = config.TestCode,
                TestName = config.Service?.ServiceName ?? "",
                CriticalLow = config.CriticalLow,
                CriticalHigh = config.CriticalHigh,
                PanicLow = config.PanicLow,
                PanicHigh = config.PanicHigh,
                RequireAcknowledgment = config.RequireAcknowledgment,
                AcknowledgmentTimeoutMinutes = config.AcknowledgmentTimeoutMinutes,
                NotificationMethod = config.NotificationMethod ?? ""
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting critical value config for test {TestId}", testId);
            return new CriticalValueConfigDto { TestId = testId };
        }
    }

    public async Task<bool> UpdateCriticalValueConfigAsync(Guid testId, UpdateCriticalValueConfigDto dto)
    {
        return true;
    }

    public async Task<List<LabTestNormDto>> GetLabTestNormsAsync(Guid testId)
    {
        try
        {
            var query = _context.LabTestNorms
                .Where(n => n.IsActive && !n.IsDeleted);
            if (testId != Guid.Empty) query = query.Where(n => n.TestId == testId);

            var norms = await query
                .Join(_context.Services, n => n.TestId, s => s.Id, (n, s) => new { n, s })
                .Join(_context.MedicalSupplies, x => x.n.SupplyId, sp => sp.Id, (x, sp) => new { x.n, x.s, sp })
                .Select(x => new {
                    x.n.Id, x.n.TestId,
                    TestCode = x.s.ServiceCode, TestName = x.s.ServiceName,
                    SupplyId = x.sp.Id, SupplyCode = x.sp.SupplyCode, SupplyName = x.sp.SupplyName,
                    Unit = x.n.Unit, Quantity = x.n.Quantity,
                    UnitPrice = x.sp.UnitPrice
                })
                .ToListAsync();

            return norms
                .GroupBy(x => new { x.TestId, x.TestCode, x.TestName })
                .Select(g => new LabTestNormDto
                {
                    Id = g.First().Id,
                    TestId = g.Key.TestId,
                    TestCode = g.Key.TestCode ?? string.Empty,
                    TestName = g.Key.TestName ?? string.Empty,
                    Supplies = g.Select(x => new LabTestNormItemDto
                    {
                        SupplyId = x.SupplyId,
                        SupplyCode = x.SupplyCode ?? string.Empty,
                        SupplyName = x.SupplyName ?? string.Empty,
                        Unit = x.Unit ?? string.Empty,
                        Quantity = x.Quantity,
                        UnitPrice = x.UnitPrice,
                        Amount = x.Quantity * x.UnitPrice
                    }).ToList(),
                    TotalCost = g.Sum(x => x.Quantity * x.UnitPrice)
                })
                .ToList();
        }
        catch (Microsoft.Data.SqlClient.SqlException)
        {
            // Table may not exist on demo DBs that haven't run the latest schema-repair pass.
            return new List<LabTestNormDto>();
        }
    }

    public async Task<bool> UpdateLabTestNormsAsync(Guid testId, List<UpdateLabTestNormDto> norms)
    {
        var existing = await _context.LabTestNorms
            .Where(n => n.TestId == testId && !n.IsDeleted)
            .ToListAsync();
        var keepIds = new HashSet<Guid>();

        foreach (var dto in norms)
        {
            LabTestNorm? entity = null;
            if (dto.Id.HasValue && dto.Id.Value != Guid.Empty)
                entity = existing.FirstOrDefault(e => e.Id == dto.Id.Value);

            if (entity == null)
            {
                entity = new LabTestNorm
                {
                    Id = Guid.NewGuid(),
                    TestId = testId,
                    SupplyId = dto.ReagentId,
                    Quantity = dto.Quantity,
                    Unit = dto.Unit ?? string.Empty,
                    IsActive = true,
                    CreatedAt = DateTime.Now
                };
                _context.LabTestNorms.Add(entity);
            }
            else
            {
                entity.SupplyId = dto.ReagentId;
                entity.Quantity = dto.Quantity;
                entity.Unit = dto.Unit ?? string.Empty;
                entity.UpdatedAt = DateTime.Now;
            }
            keepIds.Add(entity.Id);
        }

        // Soft-delete rows that were removed in the update payload.
        foreach (var stale in existing.Where(e => !keepIds.Contains(e.Id)))
        {
            stale.IsDeleted = true;
            stale.IsActive = false;
            stale.UpdatedAt = DateTime.Now;
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<LabConclusionTemplateDto>> GetConclusionTemplatesAsync(Guid? testId = null)
    {
        try
        {
            var query = _context.Set<LabConclusionTemplate>()
                .Where(t => !t.IsDeleted && t.IsActive);

            if (testId.HasValue)
                query = query.Where(t => t.ServiceId == testId.Value);

            var templates = await query
                .Include(t => t.Service)
                .OrderBy(t => t.SortOrder)
                .ToListAsync();

            return templates.Select(t => new LabConclusionTemplateDto
            {
                Id = t.Id,
                TestId = t.ServiceId,
                TestCode = t.TestCode ?? "",
                TestName = t.Service?.ServiceName ?? "",
                TemplateCode = t.TemplateCode,
                TemplateName = t.TemplateName,
                ConclusionText = t.ConclusionText,
                Condition = t.Condition ?? "",
                IsActive = t.IsActive
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting conclusion templates");
            return new List<LabConclusionTemplateDto>();
        }
    }

    public async Task<LabConclusionTemplateDto> SaveConclusionTemplateAsync(SaveConclusionTemplateDto dto)
    {
        return new LabConclusionTemplateDto { TemplateCode = dto.TemplateCode, TemplateName = dto.TemplateName };
    }

    #endregion


    #region HL7 Event Handlers

    private void OnHL7MessageReceived(object sender, HL7MessageReceivedEventArgs e)
    {
        _logger.LogInformation("HL7 message received from analyzer {AnalyzerId}: {MessageType}", e.AnalyzerId, e.ParsedMessage?.MessageType);

        // Process ORU messages (lab results)
        if (e.ParsedMessage?.MessageType == "ORU" && e.LabResults != null && e.LabResults.Count > 0)
        {
            _ = ProcessLabResultsAsync(e.LabResults, e.AnalyzerId);
        }
    }

    private async Task ProcessLabResultsAsync(List<HL7LabResult> results, Guid analyzerId)
    {
        try
        {
            foreach (var result in results)
            {
                _logger.LogInformation("Processing result: SampleId={SampleId}, TestCode={TestCode}, Value={Value}",
                    result.SampleId, result.TestCode, result.Value);

                // #14b (audit luồng nghiệp vụ 2026-06-06): ghi KQ máy phân tích vào ServiceRequestDetail
                // (model 1) — nguồn-sự-thật CHUNG với KQ nhập tay (SampleReceive) + màn khám. Khớp theo
                // SampleBarcode + mã dịch vụ (HL7 TestCode = Service.ServiceCode). Trước đây ghi
                // LabOrderItems (model 3 — không có creator thật) nên KQ máy không bao giờ vào hệ thống.
                // (Cảnh báo cao/thấp/nguy-kịch per-parameter cần KQ XN cấu trúc — xem tech-debt-roadmap.)
                if (string.IsNullOrWhiteSpace(result.SampleId)) continue;

                var detail = await _context.ServiceRequestDetails
                    .Include(d => d.Service)
                    .FirstOrDefaultAsync(d => d.SampleBarcode == result.SampleId
                                           && d.Service.ServiceCode == result.TestCode
                                           && d.Status != 3);
                if (detail == null)
                {
                    _logger.LogWarning("No ServiceRequestDetail for SampleId={SampleId}, TestCode={TestCode}",
                        result.SampleId, result.TestCode);
                    continue;
                }

                detail.Result = result.Value ?? "";
                detail.ResultDate = result.DateTimeOfObservation ?? DateTime.Now;
                detail.TechnicianRunAt = DateTime.Now;
                detail.Status = 2; // Có KQ
                await _context.SaveChangesAsync();

                _logger.LogInformation("Analyzer result -> ServiceRequestDetail {Id}: {Value}", detail.Id, result.Value);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing lab results from HL7");
        }
    }

    private void OnHL7ConnectionStatusChanged(object sender, HL7ConnectionEventArgs e)
    {
        _logger.LogInformation("HL7 connection status changed for analyzer {AnalyzerId}: {Status}", e.AnalyzerId, e.Status);
    }

    private void OnHL7Error(object sender, HL7ErrorEventArgs e)
    {
        _logger.LogError("HL7 error for analyzer {AnalyzerId}: {Operation} - {Error}", e.AnalyzerId, e.Operation, e.ErrorMessage);
    }

    #endregion
    #region Queue Display (Public)

    public async Task<LabQueueDisplayDto> GetLabQueueDisplayAsync()
    {
        var today = DateTime.Today;
        var now = DateTime.Now;

        var result = new LabQueueDisplayDto { UpdatedAt = now };

        try
        {
            using var connection = new Microsoft.Data.SqlClient.SqlConnection(_context.Database.GetConnectionString());
            await connection.OpenAsync();

            // Query all today's lab orders with patient + department info
            var sql = @"
                SELECT
                    o.Id, o.OrderCode, o.Status, o.IsPriority, o.IsEmergency,
                    o.SampleBarcode, o.SampleType, o.OrderedAt, o.CollectedAt,
                    o.ProcessingStartTime, o.ProcessingEndTime,
                    p.FullName AS PatientName, p.PatientCode,
                    d.DepartmentName,
                    (SELECT COUNT(*) FROM LabRequestItems ri
                     INNER JOIN LabRequests lr ON ri.LabRequestId = lr.Id
                     WHERE lr.LabOrderId = o.Id AND ri.IsDeleted = 0) AS TestCount,
                    (SELECT STRING_AGG(s.ServiceName, N', ')
                     FROM LabRequestItems ri
                     INNER JOIN LabRequests lr ON ri.LabRequestId = lr.Id
                     INNER JOIN Services s ON ri.TestId = s.Id
                     WHERE lr.LabOrderId = o.Id AND ri.IsDeleted = 0) AS TestSummary
                FROM LabOrders o
                INNER JOIN Patients p ON o.PatientId = p.Id
                LEFT JOIN Departments d ON o.OrderDepartmentId = d.Id
                WHERE o.IsDeleted = 0
                AND CAST(o.OrderedAt AS DATE) = CAST(@Today AS DATE)
                ORDER BY o.IsEmergency DESC, o.IsPriority DESC, o.OrderedAt ASC
            ";

            using var command = new Microsoft.Data.SqlClient.SqlCommand(sql, connection);
            command.Parameters.AddWithValue("@Today", today);

            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var status = reader.GetInt32(reader.GetOrdinal("Status"));
                var orderedAt = reader.GetDateTime(reader.GetOrdinal("OrderedAt"));
                DateTime? collectedAt = reader.IsDBNull(reader.GetOrdinal("CollectedAt")) ? null : reader.GetDateTime(reader.GetOrdinal("CollectedAt"));
                DateTime? completedAt = reader.IsDBNull(reader.GetOrdinal("ProcessingEndTime")) ? null : reader.GetDateTime(reader.GetOrdinal("ProcessingEndTime"));

                var item = new LabQueueItemDto
                {
                    Id = reader.GetGuid(reader.GetOrdinal("Id")),
                    OrderCode = reader.GetString(reader.GetOrdinal("OrderCode")),
                    SampleBarcode = reader.IsDBNull(reader.GetOrdinal("SampleBarcode")) ? null : reader.GetString(reader.GetOrdinal("SampleBarcode")),
                    PatientName = reader.GetString(reader.GetOrdinal("PatientName")),
                    PatientCode = reader.IsDBNull(reader.GetOrdinal("PatientCode")) ? null : reader.GetString(reader.GetOrdinal("PatientCode")),
                    SampleType = reader.IsDBNull(reader.GetOrdinal("SampleType")) ? null : reader.GetString(reader.GetOrdinal("SampleType")),
                    TestCount = reader.GetInt32(reader.GetOrdinal("TestCount")),
                    TestSummary = reader.IsDBNull(reader.GetOrdinal("TestSummary")) ? "" : reader.GetString(reader.GetOrdinal("TestSummary")),
                    IsPriority = reader.GetBoolean(reader.GetOrdinal("IsPriority")),
                    IsEmergency = reader.GetBoolean(reader.GetOrdinal("IsEmergency")),
                    Status = status,
                    StatusName = status switch
                    {
                        1 => "Chờ lấy mẫu",
                        2 => "Đã lấy mẫu",
                        3 => "Đang xử lý",
                        4 => "Chờ duyệt",
                        5 => "Hoàn thành",
                        6 => "Đã hủy",
                        _ => "Không rõ"
                    },
                    OrderedAt = orderedAt,
                    CollectedAt = collectedAt,
                    CompletedAt = completedAt,
                    WaitMinutes = (int)(now - orderedAt).TotalMinutes,
                    DepartmentName = reader.IsDBNull(reader.GetOrdinal("DepartmentName")) ? null : reader.GetString(reader.GetOrdinal("DepartmentName"))
                };

                switch (status)
                {
                    case 1 or 2: // Waiting (pending collection or collected)
                        result.WaitingItems.Add(item);
                        break;
                    case 3 or 4: // Processing or awaiting approval
                        result.ProcessingItems.Add(item);
                        break;
                    case 5: // Completed
                        result.CompletedItems.Add(item);
                        break;
                    // Skip cancelled (6)
                }
            }

            // Limit completed to 10 most recent
            if (result.CompletedItems.Count > 10)
            {
                result.CompletedItems = result.CompletedItems
                    .OrderByDescending(c => c.CompletedAt)
                    .Take(10)
                    .ToList();
            }

            result.TotalPending = result.WaitingItems.Count;
            result.TotalProcessing = result.ProcessingItems.Count;
            result.TotalCompletedToday = result.CompletedItems.Count;

            // Average processing time from completed items
            var completedWithTimes = result.CompletedItems
                .Where(c => c.CollectedAt.HasValue && c.CompletedAt.HasValue)
                .ToList();
            if (completedWithTimes.Count > 0)
            {
                result.AverageProcessingMinutes = (int)completedWithTimes
                    .Average(c => (c.CompletedAt!.Value - c.CollectedAt!.Value).TotalMinutes);
            }
        }
        catch
        {
            // Return empty display on DB error
        }

        return result;
    }

    #endregion
}
