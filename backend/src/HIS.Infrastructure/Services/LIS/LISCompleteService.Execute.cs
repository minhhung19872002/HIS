using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using HIS.Application.DTOs.Laboratory;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
using HIS.Infrastructure.Services.HL7;

// Alias to avoid ambiguity
using ApproveLabResultDtoService = HIS.Application.Services.ApproveLabResultDto;


namespace HIS.Infrastructure.Services;

// K11 phien 1 (2026-05-30, post-feedback Plan A): tach 7.3 Thực hiện xét nghiệm (~1008 dong) vao subfolder Services/LIS/.
// #14e-B (2026-06-11): rewrite 12 method raw-SQL (LabOrders/LabOrderItems) → EF Core LINQ trên model 1
//   (ServiceRequest/ServiceRequestDetail/ServiceRequestDetailParameter). LabOrders/LabOrderItems sắp DROP.
public partial class LISCompleteService {
    #region 7.3 Thực hiện xét nghiệm

    public async Task<List<LabOrderDto>> GetPendingLabOrdersAsync(DateTime date, Guid? departmentId = null, Guid? analyzerId = null, string patientType = null, string keyword = null)
    {
        // Handle invalid date - use today if date is MinValue or out of SQL range
        if (date == DateTime.MinValue || date.Year < 1753)
        {
            date = DateTime.Today;
        }

        // dot16: RequestDate lưu UTC — date là ngày local VN từ FE → so theo cửa sổ UTC của trọn ngày VN
        // (trước so raw [date, date+1) → lệch biên 7h, worklist rỗng khung 00h-07h sáng VN).
        var (dateFrom, dateTo) = HIS.Core.Common.VnTime.DayRangeUtc(date);

        var query = _context.ServiceRequests
            .Where(r => r.RequestType == 1 && !r.IsDeleted
                     && r.RequestDate >= dateFrom && r.RequestDate < dateTo)
            .Include(r => r.MedicalRecord).ThenInclude(mr => mr.Patient)
            .Include(r => r.Doctor)
            .Include(r => r.Department)
            .Include(r => r.Details).ThenInclude(d => d.Service).ThenInclude(s => s.ServiceGroup)
            .AsQueryable();

        if (departmentId.HasValue)
            query = query.Where(r => r.DepartmentId == departmentId.Value);

        if (!string.IsNullOrEmpty(keyword))
        {
            var kw = keyword.Trim();
            query = query.Where(r =>
                r.MedicalRecord.Patient.PatientCode.Contains(kw) ||
                r.MedicalRecord.Patient.FullName.Contains(kw) ||
                r.RequestCode.Contains(kw));
        }

        var requests = await query
            .OrderByDescending(r => r.IsEmergency)
            .ThenByDescending(r => r.IsPriority)
            .ThenByDescending(r => r.RequestDate)
            .ToBoundedListAsync("LISCompleteService.GetPendingLabOrdersAsync");

        // Load all detail IDs for params batch query (avoid N+1)
        var allDetailIds = requests.SelectMany(r => r.Details.Where(d => !d.IsDeleted && d.Status != 3).Select(d => d.Id)).ToList();
        var paramsByDetail = await LoadParamsDictAsync(allDetailIds);

        // Load catalog per ServiceId (1 query)
        var serviceIds = requests.SelectMany(r => r.Details.Where(d => !d.IsDeleted && d.Status != 3).Select(d => d.ServiceId)).Distinct().ToList();
        var catalogByService = await LoadCatalogFirstRowAsync(serviceIds);

        var result = requests.Select(r =>
        {
            var activeDetails = r.Details.Where(d => !d.IsDeleted && d.Status != 3).ToList();
            var patient = r.MedicalRecord?.Patient;

            return new LabOrderDto
            {
                Id = r.Id,
                OrderCode = r.RequestCode,
                PatientId = patient?.Id ?? Guid.Empty,
                PatientCode = patient?.PatientCode ?? "",
                PatientName = patient?.FullName ?? "",
                DateOfBirth = patient?.DateOfBirth,
                Gender = patient?.Gender == 1 ? "Nam" : patient?.Gender == 2 ? "Nữ" : null,
                OrderDepartmentName = r.Department?.DepartmentName,
                OrderDoctorName = r.Doctor?.FullName ?? "",
                Status = LisModel1Map.ComputeOrderStatus(activeDetails),
                IsPriority = r.IsPriority,
                IsEmergency = r.IsEmergency,
                Diagnosis = r.Diagnosis,
                Notes = r.Notes ?? r.Note,
                OrderedAt = r.RequestDate,
                SampleBarcode = LisModel1Map.FirstBarcode(activeDetails),
                SampleType = null,
                CollectedAt = LisModel1Map.CollectedAt(activeDetails),
                CompletedAt = activeDetails.Select(d => d.ResultDate).Where(x => x.HasValue).OrderByDescending(x => x).FirstOrDefault(),
                ApprovedAt = LisModel1Map.ApprovedAt(activeDetails),
                Tests = activeDetails.Select(d =>
                {
                    var cat = catalogByService.GetValueOrDefault(d.ServiceId);
                    paramsByDetail.TryGetValue(d.Id, out var dParams);
                    return new LabTestItemDto
                    {
                        Id = d.Id,
                        TestCode = d.Service?.ServiceCode ?? "",
                        TestName = d.Service?.ServiceName ?? "",
                        TestGroup = d.Service?.ServiceGroup?.GroupName,
                        Unit = cat?.Unit,
                        NormalMin = cat?.NormalMinMale ?? cat?.ReferenceLow,
                        NormalMax = cat?.NormalMaxMale ?? cat?.ReferenceHigh,
                        CriticalLow = cat?.CriticalLow,
                        CriticalHigh = cat?.CriticalHigh,
                        ReferenceRange = LabFlagEvaluator.BuildReferenceRange(
                            cat?.NormalMinMale ?? cat?.ReferenceLow,
                            cat?.NormalMaxMale ?? cat?.ReferenceHigh),
                        Result = d.Result,
                        ResultStatus = LisModel1Map.ComputeItemResultStatus(d, dParams),
                        // R1: per-parameter details
                        Parameters = dParams == null || dParams.Count == 0 ? null
                            : dParams.Select(p => new HIS.Application.DTOs.Laboratory.LabResultParameterDto
                            {
                                ParameterCode = p.ParameterCode,
                                ParameterName = p.ParameterName,
                                Value = p.Value,
                                NumericValue = p.NumericValue,
                                Unit = p.Unit,
                                RefMin = p.ReferenceMin,
                                RefMax = p.ReferenceMax,
                                RefRange = p.ReferenceRange,
                                Flag = p.Flag,
                                Sequence = p.SequenceNumber,
                            }).ToList(),
                    };
                }).ToList()
            };
        }).ToList();

        return result;
    }

    public async Task<LabOrderDetailDto> GetLabOrderDetailAsync(Guid orderId)
    {
        var r = await _context.ServiceRequests
            .Where(r => r.Id == orderId && r.RequestType == 1 && !r.IsDeleted)
            .Include(r => r.MedicalRecord).ThenInclude(mr => mr.Patient)
            .Include(r => r.Doctor)
            .Include(r => r.Department)
            .Include(r => r.Details).ThenInclude(d => d.Service).ThenInclude(s => s.ServiceGroup)
            .FirstOrDefaultAsync();

        if (r == null)
            return new LabOrderDetailDto { Id = orderId };

        var activeDetails = r.Details.Where(d => !d.IsDeleted && d.Status != 3).ToList();
        var patient = r.MedicalRecord?.Patient;

        var detailIds = activeDetails.Select(d => d.Id).ToList();
        var paramsByDetail = await LoadParamsDictAsync(detailIds);

        var serviceIds = activeDetails.Select(d => d.ServiceId).Distinct().ToList();
        var catalogByService = await LoadCatalogFirstRowAsync(serviceIds);

        var testItems = activeDetails.Select(d =>
        {
            var cat = catalogByService.GetValueOrDefault(d.ServiceId);
            paramsByDetail.TryGetValue(d.Id, out var dParams);
            var resultStatusVal = LisModel1Map.ComputeItemResultStatus(d, dParams);
            var hasResult = !string.IsNullOrEmpty(d.Result);
            // item status: duyệt→5, có KQ→4, else 1
            int itemStatus = hasResult ? (d.ReviewedAt != null ? 5 : 4) : 1;

            return new LabTestItemDto
            {
                Id = d.Id,
                LabOrderId = orderId,
                TestId = d.ServiceId,
                TestCode = d.Service?.ServiceCode ?? "",
                TestName = d.Service?.ServiceName ?? "",
                TestGroup = d.Service?.ServiceGroup?.GroupName,
                Unit = cat?.Unit,
                NormalMin = cat?.NormalMinMale ?? cat?.ReferenceLow,
                NormalMax = cat?.NormalMaxMale ?? cat?.ReferenceHigh,
                CriticalLow = cat?.CriticalLow,
                CriticalHigh = cat?.CriticalHigh,
                ReferenceRange = LabFlagEvaluator.BuildReferenceRange(
                    cat?.NormalMinMale ?? cat?.ReferenceLow,
                    cat?.NormalMaxMale ?? cat?.ReferenceHigh),
                Result = d.Result,
                ResultStatus = resultStatusVal,
                AbnormalFlag = resultStatusVal,
                AbnormalFlagName = resultStatusVal switch
                {
                    0 => "Bình thường", 1 => "Thấp", 2 => "Cao", 3 => "Nguy hiểm thấp", 4 => "Nguy hiểm cao", _ => null
                },
                Status = itemStatus,
                StatusName = itemStatus switch { 1 => "Chờ mẫu", 2 => "Có mẫu", 3 => "Đang XN", 4 => "Có KQ", 5 => "Đã duyệt", _ => "Chờ" },
                UnitPrice = d.UnitPrice,
                InsurancePrice = d.InsuranceAmount,
                ResultAt = d.TechnicianRunAt ?? d.ResultDate,
                // R1: per-parameter details (null → FE fallback to Result string)
                Parameters = dParams == null || dParams.Count == 0 ? null
                    : dParams.Select(p => new HIS.Application.DTOs.Laboratory.LabResultParameterDto
                    {
                        ParameterCode = p.ParameterCode,
                        ParameterName = p.ParameterName,
                        Value = p.Value,
                        NumericValue = p.NumericValue,
                        Unit = p.Unit,
                        RefMin = p.ReferenceMin,
                        RefMax = p.ReferenceMax,
                        RefRange = p.ReferenceRange,
                        Flag = p.Flag,
                        Sequence = p.SequenceNumber,
                    }).ToList(),
            };
        }).ToList();

        return new LabOrderDetailDto
        {
            Id = orderId,
            OrderCode = r.RequestCode,
            PatientId = patient?.Id ?? Guid.Empty,
            MedicalRecordId = r.MedicalRecordId,
            PatientCode = patient?.PatientCode ?? "",
            PatientName = patient?.FullName ?? "",
            OrderDate = r.RequestDate,
            OrderDoctorName = r.Doctor?.FullName ?? "",
            DepartmentName = r.Department?.DepartmentName ?? "",
            Diagnosis = r.Diagnosis ?? "",
            ClinicalInfo = r.Notes ?? r.Note ?? "",
            TestItems = testItems,
            Samples = new List<SampleCollectionItemDto>()
        };
    }

    public async Task<SendWorklistResultDto> SendWorklistToAnalyzerAsync(SendWorklistDto dto)
    {
        // Config: Lis:Worklist:MockMode (default true) — khi false gửi TCP thật tới máy.
        // Fallback: Lis:MockMode để tương thích config cũ.
        bool mockMode = _configuration.GetValue<bool>("Lis:Worklist:MockMode",
                            _configuration.GetValue<bool>("LIS:MockMode", true));

        var errors = new List<string>();
        int sentCount = 0;
        int failedCount = 0;

        // 1. Load ServiceRequests cần gửi
        List<ServiceRequest> requests;
        if (dto.OrderIds != null && dto.OrderIds.Count > 0)
        {
            requests = await _context.ServiceRequests
                .Include(r => r.MedicalRecord).ThenInclude(m => m.Patient)
                .Include(r => r.Doctor)
                .Include(r => r.Details.Where(d => !d.IsDeleted && d.Status != 3)).ThenInclude(d => d.Service)
                .Where(r => dto.OrderIds.Contains(r.Id) && !r.IsDeleted && r.RequestType == 1)
                .ToListAsync();
        }
        else
        {
            // Tất cả XN chưa gửi worklist hôm nay
            var today = DateTime.Today;
            requests = await _context.ServiceRequests
                .Include(r => r.MedicalRecord).ThenInclude(m => m.Patient)
                .Include(r => r.Doctor)
                .Include(r => r.Details.Where(d => !d.IsDeleted && d.Status != 3)).ThenInclude(d => d.Service)
                .Where(r => !r.IsDeleted && r.RequestType == 1
                         && r.WorklistSentAt == null
                         && r.RequestDate >= today && r.RequestDate < today.AddDays(1))
                .ToListAsync();
        }

        _logger.LogInformation(
            "[MockMode={MockMode}] SendWorklistToAnalyzer: analyzerId={AnalyzerId}, orderCount={Count}",
            mockMode, dto.AnalyzerId, requests.Count);

        // 2. Chuẩn bị gửi TCP nếu không MockMode
        Guid? connectionId = null;
        if (!mockMode)
        {
            // Lấy host/port từ LisAnalyzer (config ưu tiên) hoặc SystemConfig
            var analyzer = await _context.LisAnalyzers.FirstOrDefaultAsync(a => a.Id == dto.AnalyzerId);
            var host = analyzer?.IpAddress
                       ?? _configuration["Lis:Worklist:Host"]
                       ?? _configuration["LIS:WorklistHost"];
            var portStr = analyzer?.Port?.ToString()
                          ?? _configuration["Lis:Worklist:Port"]
                          ?? _configuration["LIS:WorklistPort"];

            if (string.IsNullOrEmpty(host) || !int.TryParse(portStr, out var port))
            {
                _logger.LogWarning("SendWorklistToAnalyzer: no host/port config — falling back to MockMode");
                mockMode = true;
            }
            else
            {
                try
                {
                    connectionId = await _hl7Manager.ConnectAsClientAsync(dto.AnalyzerId, host, port);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "SendWorklistToAnalyzer: TCP connect failed to {Host}:{Port}", host, portStr);
                    mockMode = true;
                    errors.Add($"TCP connect failed: {ex.Message} — switched to MockMode");
                }
            }
        }

        // 3. Build HL7 ORM^O01 và gửi từng order
        var now = DateTime.Now;
        foreach (var req in requests)
        {
            try
            {
                var patient = req.MedicalRecord?.Patient;
                var tests = req.Details
                    .Where(d => !d.IsDeleted && d.Status != 3)
                    .Select(d => new HL7TestRequest
                    {
                        TestCode = d.Service?.ServiceCode ?? d.ServiceId.ToString(),
                        TestName = d.Service?.ServiceName ?? "",
                        FillerOrderNumber = d.SampleBarcode ?? d.Id.ToString("N")[..12]
                    }).ToList();

                if (tests.Count == 0)
                {
                    _logger.LogWarning("SendWorklistToAnalyzer: order {OrderId} has no active details — skipped", req.Id);
                    continue;
                }

                var worklistReq = new HL7WorklistRequest
                {
                    MessageControlId  = req.Id.ToString("N")[..20],
                    SendingApplication = "HIS",
                    SendingFacility   = _configuration["Lis:Worklist:SendingFacility"] ?? "HOSPITAL",
                    ReceivingApplication = "LIS",
                    ReceivingFacility = _configuration["Lis:Worklist:ReceivingFacility"] ?? "LAB",
                    PatientId         = patient?.PatientCode ?? req.Id.ToString("N")[..10],
                    PatientFamilyName = patient?.FullName ?? "",
                    PatientGivenName  = "",
                    DateOfBirth       = patient?.DateOfBirth,
                    Gender            = patient?.Gender == 1 ? "M" : patient?.Gender == 2 ? "F" : "U",
                    PatientClass      = "O", // O=Outpatient
                    SampleId          = req.RequestCode,
                    PlacerOrderNumber = req.RequestCode,
                    OrderingProvider  = req.Doctor?.FullName ?? "",
                    RequestedDateTime = req.RequestDate,
                    CollectionDateTime = req.RequestDate,
                    IsPriority        = req.IsPriority || req.IsEmergency,
                    Tests             = tests
                };

                var hl7Message = _hl7Parser.BuildORM(worklistReq);

                if (mockMode)
                {
                    // MockMode: log message, không gửi socket
                    _logger.LogInformation(
                        "[MockMode] Worklist ORM^O01 built for order {OrderCode}:\n{Message}",
                        req.RequestCode, hl7Message);
                }
                else if (connectionId.HasValue)
                {
                    // Real mode: gửi qua TCP, chờ ACK
                    var ack = await _hl7Manager.SendWorklistAsync(connectionId.Value, worklistReq);
                    _logger.LogInformation(
                        "Worklist sent for order {OrderCode}, ACK={AckCode}",
                        req.RequestCode, ack?.MessageType);
                }

                // Đánh dấu đã gửi
                req.WorklistSentAt = now;
                sentCount++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SendWorklistToAnalyzer: failed for order {OrderId}", req.Id);
                errors.Add($"Order {req.RequestCode}: {ex.Message}");
                failedCount++;
            }
        }

        // 4. Lưu WorklistSentAt
        if (sentCount > 0)
            await _context.SaveChangesAsync();

        // 5. Ngắt kết nối TCP nếu đã mở
        if (connectionId.HasValue)
            _hl7Manager.Disconnect(connectionId.Value);

        if (mockMode)
            errors.Add($"[MockMode] {sentCount} worklist(s) logged — not sent via hardware");

        return new SendWorklistResultDto
        {
            Success    = failedCount == 0,
            SentCount  = sentCount,
            FailedCount = failedCount,
            Errors     = errors
        };
    }

    /// <summary>
    /// Gửi worklist HL7 ORM^O01 cho một phiếu XN cụ thể.
    /// MockMode (config Lis:Worklist:MockMode=true): build message + log, không mở socket.
    /// Real mode: gửi TCP tới LisAnalyzer.IpAddress/Port cấu hình trong bảng.
    /// </summary>
    public async Task<SendWorklistResultDto> SendWorklistForOrderAsync(Guid orderId)
    {
        return await SendWorklistToAnalyzerAsync(new SendWorklistDto
        {
            AnalyzerId = Guid.Empty, // không cần AnalyzerId khi gửi theo orderId
            OrderIds   = new List<Guid> { orderId }
        });
    }

    /// <summary>
    /// Trả về trạng thái gửi worklist của một phiếu XN.
    /// </summary>
    public async Task<WorklistStatusDto> GetWorklistStatusAsync(Guid orderId)
    {
        var req = await _context.ServiceRequests
            .Where(r => r.Id == orderId && !r.IsDeleted)
            .Select(r => new { r.Id, r.RequestCode, r.WorklistSentAt })
            .FirstOrDefaultAsync();

        if (req == null)
            return new WorklistStatusDto { OrderId = orderId, IsSent = false };

        bool mockMode = _configuration.GetValue<bool>("Lis:Worklist:MockMode",
                            _configuration.GetValue<bool>("LIS:MockMode", true));

        return new WorklistStatusDto
        {
            OrderId      = req.Id,
            OrderCode    = req.RequestCode,
            IsSent       = req.WorklistSentAt.HasValue,
            SentAt       = req.WorklistSentAt,
            MockMode     = mockMode
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

        // Reuse existing EnterLabResultAsync flow to write result into ServiceRequestDetail
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

        _logger.LogInformation("Transferred inbox result {InboxId} to ServiceRequestDetail {ItemId}", inboxId, raw.MappedToLabRequestItemId);
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
        // dto.LabTestItemId = ServiceRequestDetail.Id
        var d = await _context.ServiceRequestDetails
            .Include(x => x.Service)
            .FirstOrDefaultAsync(x => x.Id == dto.LabTestItemId && !x.IsDeleted);

        if (d == null) return false;

        // Write result directly onto SRD (model 1 is the source of truth now)
        d.Result = dto.Result;
        d.ResultDate = DateTime.Now;
        d.TechnicianRunAt = DateTime.Now;
        d.Status = 2; // Có KQ

        // R1-2b: per-parameter block — catalog ranges, EvaluateFlag, fallback range from input
        if (dto.Parameters is { Count: > 0 })
        {
            var oldParams = await _context.ServiceRequestDetailParameters
                .Where(x => x.ServiceRequestDetailId == d.Id && !x.IsDeleted).ToListAsync();
            if (oldParams.Count > 0) _context.ServiceRequestDetailParameters.RemoveRange(oldParams); // re-run idempotent

            var catalog = await _context.LisTestParameters
                .Where(p => p.ServiceId == d.ServiceId && p.IsActive && !p.IsDeleted).ToListAsync();

            // Fallback ranges: catalog row first, then input (single param case)
            bool single = dto.Parameters.Count == 1;
            // For single-param fallback: load first catalog entry ranges
            decimal? singleCatCritLow = single ? catalog.FirstOrDefault()?.CriticalLow : null;
            decimal? singleCatCritHigh = single ? catalog.FirstOrDefault()?.CriticalHigh : null;

            int seq = 0;
            foreach (var p in dto.Parameters)
            {
                var cat = catalog.FirstOrDefault(c => c.Code == p.ParameterCode || c.Hl7Code == p.ParameterCode);
                var min = p.ReferenceMin ?? cat?.ReferenceLow ?? cat?.NormalMinMale ?? (single ? (decimal?)null : null);
                var max = p.ReferenceMax ?? cat?.ReferenceHigh ?? cat?.NormalMaxMale ?? (single ? (decimal?)null : null);
                var num = LabFlagEvaluator.TryParse(p.Value);
                var flag = LabFlagEvaluator.EvaluateFlag(num, min, max,
                    cat?.CriticalLow ?? singleCatCritLow,
                    cat?.CriticalHigh ?? singleCatCritHigh);
                _context.ServiceRequestDetailParameters.Add(new ServiceRequestDetailParameter
                {
                    Id = Guid.NewGuid(),
                    ServiceRequestDetailId = d.Id,
                    ParameterCode = p.ParameterCode,
                    ParameterName = p.ParameterName,
                    Value = p.Value,
                    NumericValue = num,
                    Unit = string.IsNullOrEmpty(p.Unit) ? cat?.Unit : p.Unit,
                    ReferenceMin = min,
                    ReferenceMax = max,
                    ReferenceRange = LabFlagEvaluator.BuildReferenceRange(min, max),
                    Flag = flag,
                    SequenceNumber = seq++,
                    CreatedAt = DateTime.Now,
                });
            }
            if (string.IsNullOrWhiteSpace(d.Result))
                d.Result = string.Join("; ", dto.Parameters.Select(p => $"{p.ParameterName} {p.Value}"));
        }

        // Update header SR.Status: only raise (never lower); guard: don't touch if header already cancelled (Status==4)
        var sr = await _context.ServiceRequests.FindAsync(d.ServiceRequestId);
        if (sr != null && sr.Status != 4)
        {
            // Reload all active details (including the one just updated — SaveChanges not called yet, so check d directly)
            var allActive = await _context.ServiceRequestDetails
                .Where(x => x.ServiceRequestId == sr.Id && !x.IsDeleted && x.Status != 3)
                .ToListAsync();
            // Apply in-memory update for the current detail (not yet in DB)
            var idx = allActive.FindIndex(x => x.Id == d.Id);
            if (idx >= 0) allActive[idx] = d;

            bool allHaveResult = allActive.Count > 0 && allActive.All(x => !string.IsNullOrEmpty(x.Result));
            int newStatus = allHaveResult ? 3 : 2; // 3=Có KQ, 2=Đang XN
            if (newStatus > sr.Status)
                sr.Status = newStatus;
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ApproveLabResultAsync(ApproveLabResultDtoService dto)
    {
        IQueryable<ServiceRequestDetail> detailQuery;

        if (dto.ItemIds != null && dto.ItemIds.Any())
        {
            var ids = dto.ItemIds;
            detailQuery = _context.ServiceRequestDetails
                .Where(d => ids.Contains(d.Id) && !d.IsDeleted && d.Status != 3);
        }
        else
        {
            detailQuery = _context.ServiceRequestDetails
                .Where(d => d.ServiceRequestId == dto.OrderId && !d.IsDeleted && d.Status != 3);
        }

        var details = await detailQuery.ToListAsync();

        foreach (var d in details.Where(x => !string.IsNullOrEmpty(x.Result)))
        {
            d.ReviewedAt = DateTime.Now;
            d.ReviewerUserId = dto.ApprovedByUserId;
        }

        await _context.SaveChangesAsync();

        _ = _notificationService.NotifyLabResultAsync(dto.OrderId, "Bác sĩ duyệt");
        return true;
    }

    public async Task<bool> PreliminaryApproveLabResultAsync(Guid orderId, string technicianNote, Guid? approvedByUserId = null)
    {
        // Model 1 không có "sơ duyệt" riêng — set TechnicianUserId + TechnicianRunAt cho details có Result,
        // append note vào SR.Notes. KHÔNG set ReviewedAt (đó là final approve).
        var details = await _context.ServiceRequestDetails
            .Where(d => d.ServiceRequestId == orderId && !d.IsDeleted && d.Status != 3)
            .ToListAsync();

        foreach (var d in details.Where(x => !string.IsNullOrEmpty(x.Result)))
        {
            if (approvedByUserId.HasValue)
                d.TechnicianUserId = approvedByUserId.Value;
            if (d.TechnicianRunAt == null)
                d.TechnicianRunAt = DateTime.Now;
        }

        var sr = await _context.ServiceRequests.FindAsync(orderId);
        if (sr != null)
        {
            var notePrefix = string.IsNullOrWhiteSpace(sr.Notes) ? "" : sr.Notes + "\n";
            sr.Notes = notePrefix + $"[KTV] {technicianNote ?? ""}";
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> FinalApproveLabResultAsync(Guid orderId, string doctorNote, Guid? approvedByUserId = null)
    {
        var details = await _context.ServiceRequestDetails
            .Where(d => d.ServiceRequestId == orderId && !d.IsDeleted && d.Status != 3)
            .ToListAsync();

        foreach (var d in details.Where(x => !string.IsNullOrEmpty(x.Result)))
        {
            d.ReviewedAt = DateTime.Now;
            d.ReviewerUserId = approvedByUserId;
        }

        var sr = await _context.ServiceRequests.FindAsync(orderId);
        if (sr != null)
        {
            var notePrefix = string.IsNullOrWhiteSpace(sr.Notes) ? "" : sr.Notes + "\n";
            sr.Notes = notePrefix + $"[BS duyệt] {doctorNote ?? ""}";
        }

        await _context.SaveChangesAsync();

        _ = _notificationService.NotifyLabResultAsync(orderId, "Bác sĩ duyệt");
        return true;
    }

    public async Task<bool> CancelApprovalAsync(Guid orderId, string reason)
    {
        // Hủy duyệt revert cả 2 bước: final (ReviewedAt) lẫn sơ duyệt (TechnicianUserId) → order về 3 "Chờ duyệt"
        // (khớp FE: nút Hủy duyệt hiện khi status >= 4). Trade-off: mất dấu KTV sơ duyệt — chấp nhận như model 3 cũ.
        var details = await _context.ServiceRequestDetails
            .Where(d => d.ServiceRequestId == orderId && !d.IsDeleted && d.Status != 3
                && (d.ReviewedAt != null || d.TechnicianUserId != null))
            .ToListAsync();

        foreach (var d in details)
        {
            d.ReviewedAt = null;
            d.ReviewerUserId = null;
            d.TechnicianUserId = null;
        }

        var sr = await _context.ServiceRequests.FindAsync(orderId);
        if (sr != null)
        {
            var notePrefix = string.IsNullOrWhiteSpace(sr.Notes) ? "" : sr.Notes + "\n";
            sr.Notes = notePrefix + $"[Hủy duyệt] {reason ?? ""}";
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<byte[]> PrintLabResultAsync(Guid orderId, string format = "A4")
    {
        // Gate: chưa duyệt → KHÔNG in
        var sr = await _context.ServiceRequests
            .Where(r => r.Id == orderId && r.RequestType == 1 && !r.IsDeleted)
            .Include(r => r.MedicalRecord).ThenInclude(mr => mr.Patient)
            .Include(r => r.Doctor)
            .Include(r => r.Department)
            .Include(r => r.Details).ThenInclude(d => d.Service)
            .FirstOrDefaultAsync();

        if (sr == null)
            return System.Text.Encoding.UTF8.GetBytes("Order not found");

        var activeDetails = sr.Details.Where(d => !d.IsDeleted && d.Status != 3).ToList();

        // Gate: có KQ và tất cả KQ đều ReviewedAt != null
        var detailsWithResult = activeDetails.Where(d => !string.IsNullOrEmpty(d.Result)).ToList();
        if (detailsWithResult.Count == 0 || !detailsWithResult.All(d => d.ReviewedAt != null))
            throw new InvalidOperationException("Chưa duyệt kết quả — không có số liệu để in.");

        try
        {
            var detailIds = activeDetails.Select(d => d.Id).ToList();
            var paramsByDetail = await LoadParamsDictAsync(detailIds);

            // Approver lookup
            var approverUserId = LisModel1Map.ApprovedBy(activeDetails);
            string? approverName = null;
            if (approverUserId.HasValue)
            {
                var approver = await _context.Users.FindAsync(approverUserId.Value);
                approverName = approver?.FullName;
            }

            var patient = sr.MedicalRecord?.Patient;
            int genderInt = patient?.Gender ?? 0;

            // Build LabResultRows: if SRD has params → 1 row/param, else row per SRD
            var labResults = new List<PdfTemplateHelper.LabResultRow>();
            foreach (var d in activeDetails.Where(x => !string.IsNullOrEmpty(x.Result)))
            {
                paramsByDetail.TryGetValue(d.Id, out var dParams);
                if (dParams != null && dParams.Any())
                {
                    foreach (var p in dParams.OrderBy(x => x.SequenceNumber))
                    {
                        labResults.Add(new PdfTemplateHelper.LabResultRow
                        {
                            TestName = $"{d.Service?.ServiceName ?? ""} - {p.ParameterName}",
                            Result = p.Value ?? "",
                            Unit = p.Unit ?? "",
                            ReferenceRange = p.ReferenceRange ?? "",
                            IsAbnormal = LabFlagEvaluator.IsAbnormal(p.Flag)
                        });
                    }
                }
                else
                {
                    labResults.Add(new PdfTemplateHelper.LabResultRow
                    {
                        TestName = d.Service?.ServiceName ?? "",
                        Result = d.Result ?? "",
                        Unit = "",
                        ReferenceRange = "",
                        IsAbnormal = false
                    });
                }
            }

            var completedAt = detailsWithResult.Select(d => d.ResultDate).Where(x => x.HasValue).OrderByDescending(x => x).FirstOrDefault();

            var html = PdfTemplateHelper.GetLabResult(
                patient?.PatientCode, patient?.FullName, genderInt, patient?.DateOfBirth,
                patient?.Address, null, null,
                sr.Diagnosis, sr.Doctor?.FullName, sr.Department?.DepartmentName,
                sr.RequestDate, completedAt,
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

            var alerts = await query.OrderByDescending(a => a.AlertTime).ToBoundedListAsync("LISCompleteService.GetCriticalValueAlertsAsync");

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

        // Load SRDs có Result, của SR XN, theo MedicalRecord.PatientId, RequestDate >= fromDate
        var query = _context.ServiceRequestDetails
            .Where(d => !d.IsDeleted && d.Status != 3
                     && !string.IsNullOrEmpty(d.Result)
                     && d.ServiceRequest.RequestType == 1
                     && !d.ServiceRequest.IsDeleted
                     && d.ServiceRequest.MedicalRecord.PatientId == patientId
                     && d.ServiceRequest.RequestDate >= fromDate)
            .Include(d => d.ServiceRequest)
            .Include(d => d.Service)
            .AsQueryable();

        if (!string.IsNullOrEmpty(testCode))
            query = query.Where(d => d.Service.ServiceCode == testCode);

        var items = await query
            .OrderByDescending(d => d.ServiceRequest.RequestDate)
            .ThenBy(d => d.Service.ServiceName)
            .ToBoundedListAsync("LISCompleteService.GetLabResultHistoryAsync");

        if (!items.Any()) return new List<LabResultHistoryDto>();

        // Catalog for unit/range
        var svcIds = items.Select(d => d.ServiceId).Distinct().ToList();
        var catalogByService = await LoadCatalogFirstRowAsync(svcIds);

        // Approver names: collect unique ReviewerUserIds → batch lookup
        var reviewerIds = items.Where(d => d.ReviewerUserId.HasValue).Select(d => d.ReviewerUserId!.Value).Distinct().ToList();
        var reviewerNames = reviewerIds.Any()
            ? (await _context.Users.Where(u => reviewerIds.Contains(u.Id)).ToListAsync())
                .ToDictionary(u => u.Id, u => u.FullName)
            : new Dictionary<Guid, string>();

        // Detail params — for flag computation
        var detailIds = items.Select(d => d.Id).ToList();
        var paramsByDetail = await LoadParamsDictAsync(detailIds);

        return items.Select(d =>
        {
            var cat = catalogByService.GetValueOrDefault(d.ServiceId);
            paramsByDetail.TryGetValue(d.Id, out var dParams);

            // Compute flag from params (ignoring ReviewedAt for history display)
            string flag = ComputeFlagStringFromParams(dParams);

            return new LabResultHistoryDto
            {
                OrderId = d.ServiceRequestId,
                TestDate = d.ServiceRequest.RequestDate,
                TestCode = d.Service?.ServiceCode ?? "",
                TestName = d.Service?.ServiceName ?? "",
                Result = d.Result ?? "",
                Unit = cat?.Unit ?? "",
                ReferenceRange = LabFlagEvaluator.BuildReferenceRange(
                    cat?.NormalMinMale ?? cat?.ReferenceLow,
                    cat?.NormalMaxMale ?? cat?.ReferenceHigh) ?? "",
                Flag = flag,
                ApprovedBy = d.ReviewerUserId.HasValue
                    ? reviewerNames.GetValueOrDefault(d.ReviewerUserId.Value, "")
                    : ""
            };
        }).ToList();
    }

    public async Task<LabResultComparisonDto> CompareLabResultsAsync(Guid patientId, string testCode, int lastNTimes = 5)
    {
        var items = await _context.ServiceRequestDetails
            .Where(d => !d.IsDeleted && d.Status != 3
                     && !string.IsNullOrEmpty(d.Result)
                     && d.Service.ServiceCode == testCode
                     && d.ServiceRequest.RequestType == 1
                     && !d.ServiceRequest.IsDeleted
                     && d.ServiceRequest.MedicalRecord.PatientId == patientId)
            .Include(d => d.ServiceRequest)
            .Include(d => d.Service)
            .OrderByDescending(d => d.ServiceRequest.RequestDate)
            .Take(lastNTimes)
            .ToListAsync();

        var result = new LabResultComparisonDto { TestCode = testCode, DataPoints = new List<LabResultPointDto>() };
        if (!items.Any()) return result;

        result.TestName = items.First().Service?.ServiceName ?? testCode;

        var svcIds = items.Select(d => d.ServiceId).Distinct().ToList();
        var catalogByService = await LoadCatalogFirstRowAsync(svcIds);
        result.Unit = catalogByService.GetValueOrDefault(items.First().ServiceId)?.Unit ?? "";

        var detailIds = items.Select(d => d.Id).ToList();
        var paramsByDetail = await LoadParamsDictAsync(detailIds);

        foreach (var d in items)
        {
            if (!decimal.TryParse(d.Result, System.Globalization.NumberStyles.Any,
                System.Globalization.CultureInfo.InvariantCulture, out var numericVal))
                continue;

            paramsByDetail.TryGetValue(d.Id, out var dParams);
            string flag = ComputeFlagStringFromParams(dParams);

            result.DataPoints.Add(new LabResultPointDto
            {
                Date = d.ServiceRequest.RequestDate,
                Value = numericVal,
                Flag = flag
            });
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

        // Load current order details with result
        var sr = await _context.ServiceRequests
            .Where(r => r.Id == orderId && !r.IsDeleted)
            .Include(r => r.MedicalRecord)
            .Include(r => r.Details).ThenInclude(d => d.Service)
            .FirstOrDefaultAsync();

        if (sr == null) return result;

        var currentDetails = sr.Details
            .Where(d => !d.IsDeleted && !string.IsNullOrEmpty(d.Result))
            .ToList();

        if (!currentDetails.Any()) return result;

        var patientId = sr.MedicalRecord?.PatientId;
        if (!patientId.HasValue) return result;

        // Load previous SRDs for each service code — batch by unique service codes
        var serviceCodes = currentDetails.Select(d => d.Service?.ServiceCode).Where(c => !string.IsNullOrEmpty(c)).Distinct().ToList();

        // Get all previous matching SRDs (different SR, same patient, same service code, has result)
        var previousDetails = await _context.ServiceRequestDetails
            .Where(d => !d.IsDeleted
                     && !string.IsNullOrEmpty(d.Result)
                     && d.ServiceRequestId != orderId
                     && d.ServiceRequest.MedicalRecord.PatientId == patientId.Value
                     && d.ServiceRequest.RequestType == 1
                     && !d.ServiceRequest.IsDeleted
                     && serviceCodes.Contains(d.Service.ServiceCode))
            .Include(d => d.ServiceRequest)
            .Include(d => d.Service)
            .OrderByDescending(d => d.ServiceRequest.RequestDate)
            .ToListAsync();

        // Group previous by ServiceCode for fast lookup
        var prevByCode = previousDetails
            .GroupBy(d => d.Service?.ServiceCode ?? "")
            .ToDictionary(g => g.Key, g => g.First()); // most recent per code

        foreach (var d in currentDetails)
        {
            var code = d.Service?.ServiceCode ?? "";
            if (!decimal.TryParse(d.Result, System.Globalization.NumberStyles.Any,
                System.Globalization.CultureInfo.InvariantCulture, out var currentVal))
                continue;

            decimal? prevVal = null;
            DateTime? prevDate = null;

            if (prevByCode.TryGetValue(code, out var prev) &&
                decimal.TryParse(prev.Result, System.Globalization.NumberStyles.Any,
                    System.Globalization.CultureInfo.InvariantCulture, out var pv))
            {
                prevVal = pv;
                prevDate = prev.ServiceRequest.RequestDate;
            }

            decimal? deltaPercent = null;
            decimal deltaThreshold = 50m;
            bool isCritical = false;

            if (prevVal.HasValue && prevVal.Value != 0)
            {
                deltaPercent = Math.Round(Math.Abs((currentVal - prevVal.Value) / prevVal.Value * 100), 1);
                isCritical = deltaPercent > deltaThreshold;
            }

            result.Items.Add(new DeltaCheckItemDto
            {
                TestId = d.Id,
                TestCode = code,
                TestName = d.Service?.ServiceName ?? "",
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
        // orderItemId = ServiceRequestDetail.Id
        var d = await _context.ServiceRequestDetails
            .FindAsync(orderItemId);

        if (d == null) return false;

        // Clear result fields
        d.Result = null;
        d.ResultDate = null;
        d.TechnicianRunAt = null;
        d.Status = 1; // Đang thực hiện
        var notePrefix = string.IsNullOrWhiteSpace(d.Note) ? "" : d.Note + "\n";
        d.Note = notePrefix + $"[Làm lại] {reason ?? ""}";

        // Delete associated ServiceRequestDetailParameters
        var oldParams = await _context.ServiceRequestDetailParameters
            .Where(p => p.ServiceRequestDetailId == orderItemId && !p.IsDeleted)
            .ToListAsync();
        if (oldParams.Count > 0)
            _context.ServiceRequestDetailParameters.RemoveRange(oldParams);

        // Header SR.Status: nếu đang 3 → 2 (có KQ → đang XN)
        var sr = await _context.ServiceRequests.FindAsync(d.ServiceRequestId);
        if (sr != null && sr.Status == 3)
            sr.Status = 2;

        await _context.SaveChangesAsync();
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
            using var connection = new Microsoft.Data.SqlClient.SqlConnection(_context.Database.GetConnectionString());
            await connection.OpenAsync();

            // Find QC lot by lot number
            var lotSql = @"SELECT Id, Mean, SD FROM QCLots WHERE LotNumber = @LotNumber AND IsActive = 1";
            Guid? lotId = null;
            using (var cmd = new Microsoft.Data.SqlClient.SqlCommand(lotSql, connection))
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
                using (var cmd = new Microsoft.Data.SqlClient.SqlCommand(insertSql, connection))
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
        catch (Microsoft.Data.SqlClient.SqlException ex) when (ex.Message.Contains("Invalid object name"))
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
            using var connection = new Microsoft.Data.SqlClient.SqlConnection(_context.Database.GetConnectionString());
            await connection.OpenAsync();

            // Get QC lot mean/SD for chart reference lines
            var lotSql = @"SELECT TOP 1 Mean, SD FROM QCLots
                           WHERE AnalyzerId = @AnalyzerId AND IsActive = 1
                           ORDER BY CreatedAt DESC";
            using (var cmd = new Microsoft.Data.SqlClient.SqlCommand(lotSql, connection))
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
            using (var cmd = new Microsoft.Data.SqlClient.SqlCommand(dataSql, connection))
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
        catch (Microsoft.Data.SqlClient.SqlException ex) when (ex.Message.Contains("Invalid object name"))
        {
            _logger.LogWarning("QC tables not found for Levey-Jennings chart: {Message}", ex.Message);
        }

        return result;
    }

    #endregion

    #region Private helpers (#14e-B EF LINQ)

    /// <summary>
    /// Batch load ServiceRequestDetailParameters cho danh sách detail IDs → dictionary by detailId.
    /// Tránh N+1 query.
    /// </summary>
    private async Task<Dictionary<Guid, List<ServiceRequestDetailParameter>>> LoadParamsDictAsync(List<Guid> detailIds)
    {
        if (!detailIds.Any()) return new Dictionary<Guid, List<ServiceRequestDetailParameter>>();

        var allParams = await _context.ServiceRequestDetailParameters
            .Where(p => detailIds.Contains(p.ServiceRequestDetailId) && !p.IsDeleted)
            .OrderBy(p => p.SequenceNumber)
            .ToListAsync();

        return allParams
            .GroupBy(p => p.ServiceRequestDetailId)
            .ToDictionary(g => g.Key, g => g.ToList());
    }

    /// <summary>
    /// Batch load LisTestParameter — 1 row đầu tiên per ServiceId (catalog cho unit/range).
    /// </summary>
    private async Task<Dictionary<Guid, LisTestParameter>> LoadCatalogFirstRowAsync(List<Guid> serviceIds)
    {
        if (!serviceIds.Any()) return new Dictionary<Guid, LisTestParameter>();

        var rows = await _context.LisTestParameters
            .Where(p => p.ServiceId.HasValue && serviceIds.Contains(p.ServiceId.Value) && p.IsActive && !p.IsDeleted)
            .ToListAsync();

        // Keep first row per ServiceId (arbitrary but deterministic — matches old model-3 behaviour)
        return rows
            .GroupBy(p => p.ServiceId!.Value)
            .ToDictionary(g => g.Key, g => g.First());
    }

    /// <summary>
    /// Compute flag string (Normal/Low/High/Critical) từ params cho history/compare display.
    /// Tính từ Flag trực tiếp (không xét ReviewedAt — lịch sử hiển thị cờ thực tế).
    /// HH/LL → "Critical"; H → "High"; L → "Low"; else "Normal".
    /// </summary>
    private static string ComputeFlagStringFromParams(List<ServiceRequestDetailParameter>? dParams)
    {
        if (dParams == null || !dParams.Any()) return "Normal";
        var flags = dParams.Select(p => p.Flag).Where(f => !string.IsNullOrEmpty(f)).ToList();
        if (flags.Contains("HH") || flags.Contains("LL")) return "Critical";
        if (flags.Contains("H")) return "High";
        if (flags.Contains("L")) return "Low";
        return "Normal";
    }

    #endregion
}
