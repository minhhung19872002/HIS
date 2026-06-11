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
using HIS.Infrastructure.Services.HL7;

// Alias to avoid ambiguity
using ApproveLabResultDtoService = HIS.Application.Services.ApproveLabResultDto;


namespace HIS.Infrastructure.Services;

// K11 phien 3: tach 7.1 Kết nối máy XN + 7.2 Lấy mẫu (~463 dong) vao Services/LIS/.
public partial class LISCompleteService {
    #region 7.1 Kết nối máy xét nghiệm

    public async Task<List<LabAnalyzerDto>> GetAnalyzersAsync(string keyword = null, bool? isActive = null)
    {
        var query = _context.LabAnalyzers.AsQueryable();

        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(a => a.Code.Contains(keyword) || a.Name.Contains(keyword));

        if (isActive.HasValue)
            query = query.Where(a => a.IsActive == isActive.Value);

        var analyzers = await query.Include(a => a.Department).OrderBy(a => a.Name).ToListAsync();

        return analyzers.Select(a => new LabAnalyzerDto
        {
            Id = a.Id,
            Code = a.Code,
            Name = a.Name,
            Manufacturer = a.Manufacturer,
            Model = a.Model,
            SerialNumber = a.SerialNumber,
            ConnectionType = a.ConnectionType,
            Protocol = a.Protocol,
            ConnectionMethod = a.ConnectionMethod,
            ComPort = a.ComPort,
            BaudRate = a.BaudRate,
            IpAddress = a.IpAddress,
            Port = a.Port,
            Status = a.Status,
            IsActive = a.IsActive,
            LastConnectedAt = a.LastConnectedAt,
            LabDepartmentId = a.DepartmentId,
            LabDepartmentName = a.Department?.DepartmentName
        }).ToList();
    }

    public async Task<LabAnalyzerDto> CreateAnalyzerAsync(CreateAnalyzerDto dto)
    {
        var analyzer = new LabAnalyzer
        {
            Code = dto.Code,
            Name = dto.Name,
            Manufacturer = dto.Manufacturer,
            Model = dto.Model,
            Protocol = ParseProtocol(dto.Protocol),
            ConnectionMethod = ParseConnectionMethod(dto.ConnectionType),
            ConnectionType = ParseConnectionType(dto.ConnectionType),
            IpAddress = dto.IpAddress,
            Port = dto.Port,
            ComPort = dto.ComPort,
            BaudRate = dto.BaudRate,
            DepartmentId = dto.DepartmentId,
            IsActive = dto.IsActive,
            Status = 1
        };

        _context.LabAnalyzers.Add(analyzer);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created analyzer {Code} - {Name}", analyzer.Code, analyzer.Name);

        return (await GetAnalyzersAsync()).FirstOrDefault(a => a.Id == analyzer.Id);
    }

    public async Task<LabAnalyzerDto> UpdateAnalyzerAsync(Guid id, UpdateAnalyzerDto dto)
    {
        var analyzer = await _context.LabAnalyzers.FindAsync(id);
        if (analyzer == null)
            throw new InvalidOperationException($"Analyzer {id} not found");

        analyzer.Code = dto.Code;
        analyzer.Name = dto.Name;
        analyzer.Manufacturer = dto.Manufacturer;
        analyzer.Model = dto.Model;
        analyzer.Protocol = ParseProtocol(dto.Protocol);
        analyzer.ConnectionMethod = ParseConnectionMethod(dto.ConnectionType);
        analyzer.ConnectionType = ParseConnectionType(dto.ConnectionType);
        analyzer.IpAddress = dto.IpAddress;
        analyzer.Port = dto.Port;
        analyzer.ComPort = dto.ComPort;
        analyzer.BaudRate = dto.BaudRate;
        analyzer.DepartmentId = dto.DepartmentId;

        await _context.SaveChangesAsync();
        return (await GetAnalyzersAsync()).FirstOrDefault(a => a.Id == id);
    }

    public async Task<bool> DeleteAnalyzerAsync(Guid id)
    {
        var analyzer = await _context.LabAnalyzers.FindAsync(id);
        if (analyzer == null) return false;

        analyzer.IsDeleted = true;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<AnalyzerTestMappingDto>> GetAnalyzerTestMappingsAsync(Guid analyzerId)
    {
        var mappings = await _context.LabAnalyzerTestMappings
            .Where(m => m.AnalyzerId == analyzerId && !m.IsDeleted)
            .Include(m => m.Service)
            .ToListAsync();

        return mappings.Select(m => new AnalyzerTestMappingDto
        {
            Id = m.Id,
            AnalyzerId = m.AnalyzerId,
            TestId = m.ServiceId ?? Guid.Empty,
            TestCode = m.HisTestCode,
            TestName = m.HisTestName,
            AnalyzerTestCode = m.AnalyzerTestCode,
            AnalyzerTestName = m.AnalyzerTestName,
            Unit = m.Unit
        }).ToList();
    }

    public async Task<bool> UpdateAnalyzerTestMappingsAsync(Guid analyzerId, List<UpdateAnalyzerTestMappingDto> mappings)
    {
        var existingMappings = await _context.LabAnalyzerTestMappings.Where(m => m.AnalyzerId == analyzerId).ToListAsync();
        _context.LabAnalyzerTestMappings.RemoveRange(existingMappings);

        foreach (var dto in mappings)
        {
            var mapping = new LabAnalyzerTestMapping
            {
                AnalyzerId = analyzerId,
                ServiceId = dto.TestId,
                HisTestCode = dto.AnalyzerTestCode,
                AnalyzerTestCode = dto.AnalyzerTestCode,
                AnalyzerTestName = dto.AnalyzerTestName,
                ConversionFactor = dto.Factor,
                IsActive = dto.IsActive
            };
            _context.LabAnalyzerTestMappings.Add(mapping);
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<AnalyzerConnectionStatusDto> CheckAnalyzerConnectionAsync(Guid analyzerId)
    {
        var analyzer = await _context.LabAnalyzers.FindAsync(analyzerId);
        if (analyzer == null)
            throw new InvalidOperationException($"Analyzer {analyzerId} not found");

        var status = _hl7Manager.GetConnectionStatus(analyzerId);

        return new AnalyzerConnectionStatusDto
        {
            AnalyzerId = analyzerId,
            AnalyzerName = analyzer.Name,
            IsConnected = status.Status == HL7ConnectionStatus.Connected || status.Status == HL7ConnectionStatus.Listening,
            Status = status.Status.ToString(),
            LastConnectedAt = analyzer.LastConnectedAt,
            LastDataReceivedAt = analyzer.LastDataReceivedAt,
            ActiveConnectionCount = status.ActiveConnections?.Count ?? 0,
            ServerRunning = status.ServerRunning
        };
    }

    public async Task<bool> ToggleAnalyzerConnectionAsync(Guid analyzerId, bool connect)
    {
        var analyzer = await _context.LabAnalyzers.FindAsync(analyzerId);
        if (analyzer == null)
            throw new InvalidOperationException($"Analyzer {analyzerId} not found");

        if (connect)
        {
            switch (analyzer.ConnectionMethod)
            {
                case 2:
                    return await _hl7Manager.StartServerAsync(analyzerId, analyzer.IpAddress, analyzer.Port ?? 2575);
                case 3:
                    var connectionId = await _hl7Manager.ConnectAsClientAsync(analyzerId, analyzer.IpAddress, analyzer.Port ?? 2575);
                    return connectionId != Guid.Empty;
                default:
                    throw new NotSupportedException($"Connection method {analyzer.ConnectionMethod} not supported");
            }
        }
        else
        {
            return _hl7Manager.StopServer(analyzerId);
        }
    }

    public async Task<List<RawDataDto>> GetRawDataFromAnalyzerAsync(Guid analyzerId, DateTime fromDate, DateTime toDate)
    {
        var results = await _context.LabRawResults
            .Where(r => r.AnalyzerId == analyzerId && r.CreatedAt >= fromDate && r.CreatedAt <= toDate)
            .OrderByDescending(r => r.CreatedAt)
            .Take(500)
            .ToListAsync();

        return results.Select(r => new RawDataDto
        {
            Id = r.Id,
            AnalyzerId = r.AnalyzerId,
            RawContent = r.RawMessage ?? "",
            ReceivedAt = r.CreatedAt,
            ProcessStatus = r.Status
        }).ToList();
    }

    public async Task<List<ParsedLabResultDto>> ParseRawDataAsync(Guid analyzerId, List<string> rawDataLines)
    {
        var results = new List<ParsedLabResultDto>();
        foreach (var line in rawDataLines)
        {
            try
            {
                var message = _hl7Parser.Parse(line);
                var labResults = _hl7Parser.ParseORU(message);
                results.AddRange(labResults.Select(r => new ParsedLabResultDto
                {
                    SampleId = r.SampleId,
                    PatientId = r.PatientId,
                    TestCode = r.TestCode,
                    Result = r.Value,
                    Unit = r.Units,
                    Flag = r.AbnormalFlag,
                    ResultTime = r.ResultDateTime,
                    RawData = line
                }));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to parse raw data");
            }
        }
        return results;
    }

    public async Task<List<AnalyzerConnectionLogDto>> GetConnectionLogsAsync(Guid analyzerId, DateTime fromDate, DateTime toDate)
    {
        var logs = await _context.LabConnectionLogs
            .Where(l => l.AnalyzerId == analyzerId && l.EventTime >= fromDate && l.EventTime <= toDate)
            .OrderByDescending(l => l.EventTime)
            .Take(500)
            .ToListAsync();

        return logs.Select(l => new AnalyzerConnectionLogDto
        {
            Id = l.Id,
            AnalyzerId = l.AnalyzerId,
            EventTime = l.EventTime,
            EventType = l.EventType.ToString(),
            Message = l.EventDescription,
            RawData = l.RawData
        }).ToList();
    }

    #endregion

    #region 7.2 Lấy mẫu xét nghiệm

    public async Task<List<SampleCollectionListDto>> GetSampleCollectionListAsync(DateTime date, Guid? departmentId = null, string patientType = null, string keyword = null)
    {
        // Return basic structure - implement full logic based on actual requirements
        return new List<SampleCollectionListDto>
        {
            new SampleCollectionListDto
            {
                Date = date,
                TotalPending = 0,
                TotalCollected = 0,
                Items = new List<SampleCollectionItemDto>()
            }
        };
    }

    public async Task<List<SampleCollectionItemDto>> GetPatientSamplesAsync(Guid patientId, Guid visitId)
    {
        // visitId is the medical record id
        // #14b: model 1 ServiceRequests (RequestType=1, chưa có KQ đầy đủ); model 2 LabRequests chết
        var requests = await _context.ServiceRequests
            .Include(r => r.MedicalRecord).ThenInclude(m => m.Patient)
            .Include(r => r.MedicalRecord).ThenInclude(m => m.Department)
            .Include(r => r.Details.Where(d => !d.IsDeleted && d.Status != 3)).ThenInclude(d => d.Service)
            .Where(r => r.MedicalRecord.PatientId == patientId
                        && (visitId == Guid.Empty || r.MedicalRecordId == visitId)
                        && !r.IsDeleted
                        && r.RequestType == 1
                        && r.Status < 3) // chưa có KQ / chưa hủy
            .OrderByDescending(r => r.RequestDate)
            .ToListAsync();

        var result = new List<SampleCollectionItemDto>();
        var seq = 1;
        foreach (var r in requests)
        {
            var details = r.Details?.ToList() ?? new List<ServiceRequestDetail>();
            var received = details.Count > 0 && details.All(d => d.ReceiveStatus == 1);
            var collected = details.Count > 0 && details.All(d => d.IsSampleCollected);
            var patient = r.MedicalRecord?.Patient;
            result.Add(new SampleCollectionItemDto
            {
                Id = r.Id,
                LabOrderId = r.Id,
                OrderCode = r.RequestCode,
                PatientId = r.MedicalRecord?.PatientId ?? Guid.Empty,
                PatientCode = patient?.PatientCode ?? "",
                PatientName = patient?.FullName ?? "",
                DateOfBirth = patient?.DateOfBirth,
                Gender = patient?.Gender == 1 ? "Nam" : patient?.Gender == 2 ? "Nữ" : null,
                MedicalRecordId = r.MedicalRecordId,
                PatientType = r.MedicalRecord?.TreatmentType ?? 0,
                DepartmentName = r.MedicalRecord?.Department?.DepartmentName,
                BedCode = null,
                QueueNumber = seq++,
                Tests = details.Select(d => new LabTestItemDto
                {
                    Id = d.Id,
                    LabOrderId = r.Id,
                    TestCode = d.Service?.ServiceCode ?? "",
                    TestName = d.Service?.ServiceName ?? "",
                    Result = d.Result,
                }).ToList(),
                RequiredSamples = new List<SampleTypeDto>(),
                Status = received ? 3 : collected ? 2 : 1,
                StatusName = received ? "Đã tiếp nhận" : collected ? "Đã lấy mẫu" : "Chờ lấy mẫu",
                IsPriority = r.IsPriority || r.IsEmergency,
                IsEmergency = r.IsEmergency,
                OrderedAt = r.RequestDate,
            });
        }
        return result;
    }

    public async Task<CollectSampleResultDto> CollectSampleAsync(CollectSampleDto dto)
    {
        try
        {
            // Generate barcode: LIS + date + orderId (4 chars) — công thức giữ nguyên từ model 3
            var today = DateTime.Now;
            var barcode = $"LIS{today:yyMMdd}{dto.LabOrderId.ToString().Substring(0, 4).ToUpper()}";
            var collectionTime = dto.Samples.FirstOrDefault()?.CollectedAt ?? DateTime.Now;

            // #14e-B: EF Core model 1 — thay raw-SQL (model 3) bằng load ServiceRequest + Details
            var sr = await _context.ServiceRequests
                .Include(r => r.Details)
                .FirstOrDefaultAsync(r => r.Id == dto.LabOrderId && !r.IsDeleted && r.RequestType == 1);

            if (sr == null)
                return new CollectSampleResultDto { Success = false, Message = "Order not found" };

            var activeDetails = sr.Details.Where(d => !d.IsDeleted && d.Status != 3).ToList();

            foreach (var d in activeDetails)
            {
                d.IsSampleCollected = true;
                d.SampleCollectedAt = collectionTime;
                // Chỉ set barcode nếu chưa có — không đè barcode đã tồn tại
                if (string.IsNullOrEmpty(d.SampleBarcode))
                    d.SampleBarcode = barcode;
                if (dto.CollectorUserId.HasValue)
                    d.CollectedByUserId = dto.CollectorUserId.Value;
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("Sample collected for order {OrderId}, barcode: {Barcode}", dto.LabOrderId, barcode);
            return new CollectSampleResultDto
            {
                Success = true,
                Barcode = barcode,
                SampleId = dto.LabOrderId
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error collecting sample for order {OrderId}", dto.LabOrderId);
            return new CollectSampleResultDto { Success = false, Message = ex.Message };
        }
    }

    public async Task<byte[]> PrintSampleBarcodeAsync(Guid sampleId)
    {
        return System.Text.Encoding.UTF8.GetBytes($"BARCODE:{sampleId}");
    }

    public async Task<byte[]> PrintSampleBarcodesBatchAsync(List<Guid> sampleIds)
    {
        return System.Text.Encoding.UTF8.GetBytes($"BARCODES:{string.Join(",", sampleIds)}");
    }

    public async Task<bool> CancelSampleAsync(Guid sampleId, string reason)
    {
        return true;
    }

    public async Task<List<SampleTypeDto>> GetSampleTypesAsync()
    {
        var types = await _context.LabSampleTypes.Where(t => t.IsActive).ToListAsync();
        return types.Select(t => new SampleTypeDto
        {
            Id = t.Id,
            Code = t.Code,
            Name = t.Name
        }).ToList();
    }

    public async Task<List<TubeTypeDto>> GetTubeTypesAsync()
    {
        var types = await _context.LabTubeTypes.Where(t => t.IsActive).ToListAsync();
        return types.Select(t => new TubeTypeDto
        {
            Id = t.Id,
            Code = t.Code,
            Name = t.Name,
            Color = t.Color,
            ColorHex = t.ColorHex,
            Description = t.Description,
            IsActive = t.IsActive
        }).ToList();
    }

    public async Task<SampleValidationResultDto> ValidateSampleAsync(Guid sampleId)
    {
        var result = new SampleValidationResultDto
        {
            SampleId = sampleId,
            IsValid = true,
            Warnings = new List<string>(),
            Errors = new List<string>()
        };

        try
        {
            // #14e-B: EF Core model 1 — thay raw-SQL SELECT (model 3) bằng load ServiceRequest + Details
            // sampleId = dto.LabOrderId = ServiceRequest.Id (theo contract CollectSampleDto)
            var sr = await _context.ServiceRequests
                .Include(r => r.Details)
                .FirstOrDefaultAsync(r => r.Id == sampleId && !r.IsDeleted && r.RequestType == 1);

            if (sr != null)
            {
                var details = sr.Details.Where(d => !d.IsDeleted).ToList();
                var status = LisModel1Map.ComputeOrderStatus(details);
                var collectedAt = LisModel1Map.CollectedAt(details);
                var barcode = LisModel1Map.FirstBarcode(details);
                // orderedAt = r.RequestDate (sampleType không có tương đương model 1 → null)

                if (string.IsNullOrEmpty(barcode))
                    result.Errors.Add("Mẫu chưa có mã barcode");

                if (collectedAt.HasValue && (DateTime.Now - collectedAt.Value).TotalHours > 24)
                    result.Warnings.Add("Mẫu đã lấy hơn 24 giờ, có thể ảnh hưởng kết quả");

                if (status >= 5)
                    result.Warnings.Add("Mẫu đã có kết quả duyệt");

                result.IsValid = !result.Errors.Any();
            }
            else
            {
                result.IsValid = false;
                result.Errors.Add("Không tìm thấy mẫu");
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error validating sample {SampleId}", sampleId);
        }

        return result;
    }

    #endregion
}
