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
            // #217/T2: các trường bị lệch một bậc. Cờ bất thường phải nằm ở OBX-8 (HL7Parser đọc
            // GetField(8)), nhưng bản cũ đặt nó ngay sau đơn vị nên nó rơi vào OBX-7 = khoảng tham
            // chiếu; kết quả là cờ máy gửi bị vứt lặng lẽ và hệ thống tự suy cờ từ range. Trạng thái
            // "F" cũng vì thế nằm ở OBX-10 thay vì OBX-11. Đo được: máy gửi H, DB ghi L.
            // Đúng thứ tự: 7 = khoảng tham chiếu (để trống), 8 = cờ, 11 = trạng thái, 14 = giờ đo.
            sb.AppendLine($"OBX|1|NM|{item.TestCode}^{item.TestCode}||{item.Result}|{item.Unit ?? ""}||{item.Flag ?? "N"}|||F|||{obTime}");
        }

        return await ProcessAnalyzerResultAsync(analyzerId, sb.ToString());
    }

    #endregion
}
