using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using HIS.Application.DTOs.Laboratory;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Services.HL7;

// Alias to avoid ambiguity
using ApproveLabResultDtoService = HIS.Application.Services.ApproveLabResultDto;
using HIS.Infrastructure.Extensions;


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
                .ToBoundedListAsync("LISCompleteService.GetLabTestCatalogAsync");

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

    /// <summary>
    /// Thêm/sửa một chỉ số xét nghiệm trong danh mục.
    ///
    /// <para>#218/T3 — trước đây là <c>return new LabTestCatalogDto { Code = dto.Code, Name = dto.Name };</c>:
    /// kỹ thuật viên khai một xét nghiệm mới, phần mềm báo xong, mở lại thì không có. Đường đọc
    /// <see cref="GetLabTestCatalogAsync"/> lấy từ <c>Services</c> với <c>ServiceType = 2</c> nên bảng
    /// đã có sẵn — lại là nhóm A, chỉ thiếu đường ghi.</para>
    ///
    /// <para>Nhưng <see cref="SaveLabTestDto"/> mang theo <c>ResultType</c>, <c>SampleType</c>,
    /// <c>TubeType</c>, <c>DecimalPlaces</c>, <c>ResultOptions</c>, <c>EnglishName</c> mà
    /// <c>Services</c> chưa có ô nào để giữ. Ghi mà im lặng bỏ mất mấy trường ấy thì vẫn là cùng một
    /// lỗi, chỉ nhỏ hơn — migration 182 thêm cột. Đó là thông số quyết định cách nhập/hiển thị kết
    /// quả và nội dung in trên nhãn dán ống.</para>
    /// </summary>
    public async Task<LabTestCatalogDto> SaveLabTestAsync(SaveLabTestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Code))
            throw new InvalidOperationException("Chưa nhập mã xét nghiệm.");
        if (string.IsNullOrWhiteSpace(dto.Name))
            throw new InvalidOperationException("Chưa nhập tên xét nghiệm.");

        var code = dto.Code.Trim();
        var now = DateTime.Now;

        Service? svc = null;
        if (dto.Id.HasValue && dto.Id.Value != Guid.Empty)
        {
            svc = await _context.Services.FirstOrDefaultAsync(s => s.Id == dto.Id.Value && !s.IsDeleted)
                ?? throw new KeyNotFoundException("Không tìm thấy xét nghiệm cần sửa");
        }

        // Mã dịch vụ là thứ dùng để chỉ định và để đối chiếu BHYT — trùng mã là chỉ định nhầm.
        var trung = await _context.Services.AnyAsync(s =>
            !s.IsDeleted && s.ServiceCode == code && (svc == null || s.Id != svc.Id));
        if (trung)
            throw new InvalidOperationException($"Mã dịch vụ {code} đã được dùng cho dịch vụ khác.");

        if (svc == null)
        {
            if (dto.GroupId == Guid.Empty)
                throw new InvalidOperationException("Chưa chọn nhóm xét nghiệm.");
            var coNhom = await _context.ServiceGroups.AnyAsync(g => g.Id == dto.GroupId && !g.IsDeleted);
            if (!coNhom) throw new KeyNotFoundException("Không tìm thấy nhóm xét nghiệm");

            svc = new Service
            {
                Id = Guid.NewGuid(),
                ServiceType = 2, // Lab — cùng giá trị mà đường đọc lọc theo
                ServiceGroupId = dto.GroupId,
                CreatedAt = now,
            };
            _context.Services.Add(svc);
        }
        else
        {
            if (dto.GroupId != Guid.Empty) svc.ServiceGroupId = dto.GroupId;
            svc.UpdatedAt = now;
        }

        svc.ServiceCode = code;
        svc.ServiceName = dto.Name.Trim();
        svc.EnglishName = dto.EnglishName;
        svc.Unit = dto.Unit;
        svc.ResultType = dto.ResultType;
        svc.ResultOptions = dto.ResultOptions;
        svc.DecimalPlaces = dto.DecimalPlaces;
        svc.SampleType = dto.SampleType;
        svc.TubeType = dto.TubeType;
        if (dto.Price.HasValue) svc.UnitPrice = dto.Price.Value;
        if (dto.InsurancePrice.HasValue) svc.InsurancePrice = dto.InsurancePrice.Value;
        if (dto.TATMinutes.HasValue) svc.EstimatedMinutes = dto.TATMinutes.Value;
        svc.RequiresResult = true;
        svc.RequiresSample = !string.IsNullOrWhiteSpace(dto.SampleType);
        svc.IsActive = dto.IsActive;

        await _context.SaveChangesAsync();

        var group = await _context.ServiceGroups
            .FirstOrDefaultAsync(g => g.Id == svc.ServiceGroupId);

        return new LabTestCatalogDto
        {
            Id = svc.Id,
            Code = svc.ServiceCode,
            Name = svc.ServiceName,
            GroupId = svc.ServiceGroupId,
            GroupName = group?.GroupName ?? string.Empty,
            Unit = svc.Unit ?? string.Empty,
            Price = svc.UnitPrice,
            InsurancePrice = svc.InsurancePrice,
            TATMinutes = svc.EstimatedMinutes > 0 ? svc.EstimatedMinutes : null,
            IsActive = svc.IsActive,
        };
    }

    public async Task<List<LabTestGroupDto>> GetLabTestGroupsAsync()
    {
        try
        {
            var groups = await _context.LabTestGroups
                .Where(g => !g.IsDeleted && g.IsActive)
                .OrderBy(g => g.SortOrder)
                .ToBoundedListAsync("LISCompleteService.GetLabTestGroupsAsync");
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

    /// <summary>
    /// Lưu nhóm xét nghiệm. #218/T3 — trước đây hàm này chỉ vọng lại đúng cái vừa nhận vào
    /// (`return new LabTestGroupDto { Code = dto.Code, Name = dto.Name }`), không ghi gì, trong khi
    /// bảng `LabTestGroups` đã có sẵn và `GetLabTestGroupsAsync` ngay dưới vẫn truy vấn nó.
    /// </summary>
    public async Task<LabTestGroupDto> SaveLabTestGroupAsync(SaveLabTestGroupDto dto)
    {
        LabTestGroup entity;
        if (dto.Id.HasValue)
        {
            entity = await _context.LabTestGroups.FirstOrDefaultAsync(g => g.Id == dto.Id.Value && !g.IsDeleted)
                ?? throw new KeyNotFoundException("Không tìm thấy nhóm xét nghiệm");
        }
        else
        {
            entity = new LabTestGroup { Id = Guid.NewGuid(), CreatedAt = DateTime.UtcNow };
            await _context.LabTestGroups.AddAsync(entity);
        }

        entity.Code = dto.Code;
        entity.Name = dto.Name;
        entity.SortOrder = dto.SortOrder;
        entity.IsActive = dto.IsActive;
        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new LabTestGroupDto
        {
            Id = entity.Id,
            Code = entity.Code,
            Name = entity.Name,
            SortOrder = entity.SortOrder,
            IsActive = entity.IsActive,
        };
    }

    public async Task<List<ReferenceRangeDto>> GetReferenceRangesAsync(Guid testId)
    {
        try
        {
            var ranges = await _context.Set<LabReferenceRange>()
                .Where(r => !r.IsDeleted && r.IsActive && r.ServiceId == testId)
                .OrderBy(r => r.Gender)
                .ThenBy(r => r.AgeFromDays)
                .ToBoundedListAsync("LISCompleteService.GetReferenceRangesAsync");

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
                .ToBoundedListAsync("LISCompleteService.GetConclusionTemplatesAsync");

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

    /// <summary>Lưu mẫu kết luận xét nghiệm. #218/T3 — trước đây là vỏ rỗng, xem SaveLabTestGroupAsync.</summary>
    public async Task<LabConclusionTemplateDto> SaveConclusionTemplateAsync(SaveConclusionTemplateDto dto)
    {
        LabConclusionTemplate entity;
        if (dto.Id.HasValue)
        {
            entity = await _context.LabConclusionTemplates.FirstOrDefaultAsync(t => t.Id == dto.Id.Value && !t.IsDeleted)
                ?? throw new KeyNotFoundException("Không tìm thấy mẫu kết luận");
        }
        else
        {
            entity = new LabConclusionTemplate { Id = Guid.NewGuid(), CreatedAt = DateTime.UtcNow };
            await _context.LabConclusionTemplates.AddAsync(entity);
        }

        entity.ServiceId = dto.TestId;
        entity.TemplateCode = dto.TemplateCode;
        entity.TemplateName = dto.TemplateName;
        entity.ConclusionText = dto.ConclusionText;
        entity.Condition = dto.Condition;
        entity.IsActive = dto.IsActive;
        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new LabConclusionTemplateDto
        {
            Id = entity.Id,
            TemplateCode = entity.TemplateCode,
            TemplateName = entity.TemplateName,
            ConclusionText = entity.ConclusionText,
            IsActive = entity.IsActive,
        };
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
            // Handler chạy ngoài HTTP request (event từ singleton HL7ConnectionManager, fire-and-forget)
            // → _context (scoped) đã dispose. BẮT BUỘC tạo scope DbContext riêng cho mỗi lần xử lý.
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HISDbContext>();

            foreach (var result in results)
            {
                _logger.LogInformation("Processing result: SampleId={SampleId}, TestCode={TestCode}, Value={Value}",
                    result.SampleId, result.TestCode, result.Value);

                // #14b (audit luồng nghiệp vụ 2026-06-06): ghi KQ máy phân tích vào ServiceRequestDetail
                // (model 1) — nguồn-sự-thật CHUNG với KQ nhập tay (SampleReceive) + màn khám. Trước đây ghi
                // ServiceRequestDetailParameters (model 1) nên KQ máy không bao giờ vào hệ thống.
                if (string.IsNullOrWhiteSpace(result.SampleId)) continue;

                // Match 1: OBX TestCode = mã DỊCH VỤ (dịch vụ 1 chỉ số / analyzer gửi theo service).
                var detail = await db.ServiceRequestDetails
                    .Include(d => d.Service)
                    .FirstOrDefaultAsync(d => d.SampleBarcode == result.SampleId
                                           && d.Service.ServiceCode == result.TestCode
                                           && d.Status != 3);
                bool directMatch = detail != null;

                // R1 (2a): Match 2 — OBX TestCode = mã CHỈ SỐ con (WBC/HGB… của dịch vụ nhiều chỉ số):
                // tra catalog LisTestParameter (Code/Hl7Code) → ServiceId → SRD cùng barcode.
                LisTestParameter cat = null;
                if (detail == null)
                {
                    cat = await db.LisTestParameters
                        .FirstOrDefaultAsync(p => (p.Code == result.TestCode || p.Hl7Code == result.TestCode)
                                               && p.ServiceId != null && p.IsActive && !p.IsDeleted);
                    if (cat != null)
                        detail = await db.ServiceRequestDetails
                            .FirstOrDefaultAsync(d => d.SampleBarcode == result.SampleId
                                                   && d.ServiceId == cat.ServiceId
                                                   && d.Status != 3);
                }
                if (detail == null)
                {
                    _logger.LogWarning("No ServiceRequestDetail for SampleId={SampleId}, TestCode={TestCode}",
                        result.SampleId, result.TestCode);
                    continue;
                }
                cat ??= await db.LisTestParameters
                    .FirstOrDefaultAsync(p => p.ServiceId == detail.ServiceId
                                           && (p.Code == result.TestCode || p.Hl7Code == result.TestCode)
                                           && p.IsActive && !p.IsDeleted);

                // R1 (2a): upsert chỉ số con per-OBX (idempotent theo ParameterCode khi analyzer gửi lại).
                // Cờ: ưu tiên cờ HL7 OBX-8 (N/H/L/HH/LL), thiếu/khác chuẩn → tính từ catalog.
                var num = LabFlagEvaluator.TryParse(result.Value);
                var min = cat?.ReferenceLow ?? cat?.NormalMinMale;
                var max = cat?.ReferenceHigh ?? cat?.NormalMaxMale;
                var flag = LabFlagEvaluator.NormalizeHl7Flag(result.AbnormalFlag)
                           ?? LabFlagEvaluator.EvaluateFlag(num, min, max, cat?.CriticalLow, cat?.CriticalHigh);
                var row = await db.ServiceRequestDetailParameters
                    .FirstOrDefaultAsync(x => x.ServiceRequestDetailId == detail.Id
                                           && x.ParameterCode == result.TestCode && !x.IsDeleted);
                if (row == null)
                {
                    row = new ServiceRequestDetailParameter
                    {
                        Id = Guid.NewGuid(),
                        ServiceRequestDetailId = detail.Id,
                        ParameterCode = result.TestCode ?? "",
                        SequenceNumber = await db.ServiceRequestDetailParameters
                            .CountAsync(x => x.ServiceRequestDetailId == detail.Id && !x.IsDeleted),
                        CreatedAt = DateTime.Now,
                    };
                    db.ServiceRequestDetailParameters.Add(row);
                }
                row.ParameterName = !string.IsNullOrWhiteSpace(result.TestName) ? result.TestName
                                    : (cat?.Name ?? result.TestCode ?? "");
                row.Value = result.Value;
                row.NumericValue = num;
                row.Unit = string.IsNullOrWhiteSpace(result.Units) ? cat?.Unit : result.Units;
                row.ReferenceMin = min;
                row.ReferenceMax = max;
                row.ReferenceRange = !string.IsNullOrWhiteSpace(result.ReferenceRange)
                    ? result.ReferenceRange : LabFlagEvaluator.BuildReferenceRange(min, max);
                row.Flag = flag;
                row.UpdatedAt = DateTime.Now;

                if (directMatch)
                    detail.Result = result.Value ?? ""; // dịch vụ 1 chỉ số: giữ hành vi cũ (giá trị trần)
                detail.ResultDate = result.DateTimeOfObservation ?? DateTime.Now;
                detail.TechnicianRunAt = DateTime.Now;
                detail.Status = 2; // Có KQ
                await db.SaveChangesAsync();

                // Dịch vụ nhiều chỉ số: srd.Result = tóm tắt từ các chỉ số con (rebuild → idempotent khi re-run).
                if (!directMatch)
                {
                    var rows = await db.ServiceRequestDetailParameters
                        .Where(x => x.ServiceRequestDetailId == detail.Id && !x.IsDeleted)
                        .OrderBy(x => x.SequenceNumber).ToListAsync();
                    detail.Result = string.Join("; ", rows.Select(r => $"{r.ParameterName} {r.Value}"));
                    await db.SaveChangesAsync();
                }

                _logger.LogInformation("Analyzer result -> ServiceRequestDetail {Id}: {Code}={Value} [{Flag}]",
                    detail.Id, result.TestCode, result.Value, flag);
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
        var tomorrow = today.AddDays(1);
        var now = DateTime.Now;

        var result = new LabQueueDisplayDto { UpdatedAt = now };

        try
        {
            // #14e-B: EF Core model 1 — thay toàn bộ raw SQL (model 3) bằng ServiceRequests + Details
            // ServiceRequests RequestType==1 hôm nay, include đủ nav để map shape DTO
            var requests = await _context.ServiceRequests
                .Where(r => !r.IsDeleted
                         && r.RequestType == 1
                         && r.RequestDate >= today
                         && r.RequestDate < tomorrow)
                .Include(r => r.MedicalRecord)
                    .ThenInclude(m => m.Patient)
                .Include(r => r.MedicalRecord)
                    .ThenInclude(m => m.Department)
                .Include(r => r.Details.Where(d => !d.IsDeleted))
                    .ThenInclude(d => d.Service)
                .OrderByDescending(r => r.IsEmergency)
                .ThenByDescending(r => r.IsPriority)
                .ThenBy(r => r.RequestDate)
                .ToListAsync();

            foreach (var r in requests)
            {
                var details = r.Details?.ToList() ?? new List<ServiceRequestDetail>();
                var activeDetails = details.Where(d => !d.IsDeleted && d.Status != 3).ToList();

                var status = LisModel1Map.ComputeOrderStatus(activeDetails);
                var collectedAt = LisModel1Map.CollectedAt(activeDetails);
                var barcode = LisModel1Map.FirstBarcode(activeDetails);

                // ProcessingStartTime = min TechnicianRunAt; ProcessingEndTime = max ResultDate
                var processingStart = activeDetails
                    .Where(d => d.TechnicianRunAt.HasValue)
                    .OrderBy(d => d.TechnicianRunAt)
                    .Select(d => d.TechnicianRunAt)
                    .FirstOrDefault();
                var processingEnd = activeDetails
                    .Where(d => d.ResultDate.HasValue)
                    .OrderByDescending(d => d.ResultDate)
                    .Select(d => d.ResultDate)
                    .FirstOrDefault();

                var patient = r.MedicalRecord?.Patient;
                var department = r.MedicalRecord?.Department;

                var item = new LabQueueItemDto
                {
                    Id = r.Id,
                    OrderCode = r.RequestCode ?? "",
                    SampleBarcode = barcode,
                    PatientName = patient?.FullName ?? "",
                    PatientCode = patient?.PatientCode,
                    SampleType = null, // không có tương đương trong model 1
                    TestCount = activeDetails.Count,
                    TestSummary = string.Join(", ", activeDetails
                        .Where(d => d.Service != null)
                        .Select(d => d.Service!.ServiceName)),
                    IsPriority = r.IsPriority,
                    IsEmergency = r.IsEmergency,
                    Status = status,
                    // Map label theo status kiểu model 3 (ComputeOrderStatus): 0 chờ mẫu · 1 đã lấy mẫu ·
                    // 2 đang XN · 3 chờ duyệt · 4 sơ duyệt (KTV) · 5 đã duyệt chính thức
                    StatusName = status switch
                    {
                        0 => "Chờ lấy mẫu",
                        1 => "Đã lấy mẫu",
                        2 => "Đang xử lý",
                        3 => "Chờ duyệt",
                        4 => "Sơ duyệt",
                        5 => "Hoàn thành",
                        _ => "Không rõ"
                    },
                    OrderedAt = r.RequestDate,
                    CollectedAt = collectedAt,
                    CompletedAt = processingEnd,
                    WaitMinutes = (int)(now - r.RequestDate).TotalMinutes,
                    DepartmentName = department?.DepartmentName
                };

                // Phân bucket: 0/1 → Waiting; 2/3/4 (đang XN / chờ duyệt / sơ duyệt) → Processing; 5 → Completed
                switch (status)
                {
                    case 0 or 1: // Chờ lấy mẫu / Đã lấy mẫu
                        result.WaitingItems.Add(item);
                        break;
                    case 2 or 3 or 4: // Đang XN / Chờ duyệt / Sơ duyệt
                        result.ProcessingItems.Add(item);
                        break;
                    case 5: // Đã duyệt (hoàn thành)
                        result.CompletedItems.Add(item);
                        break;
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
