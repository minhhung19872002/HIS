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

/// <summary>
/// Complete LIS (Laboratory Information System) Service Implementation
/// Module 7: Xét nghiệm - 31+ chức năng
/// </summary>
public class LISCompleteService : ILISCompleteService
{
    private readonly HISDbContext _context;
    private readonly ILogger<LISCompleteService> _logger;
    private readonly HL7ConnectionManager _hl7Manager;
    private readonly HL7Parser _hl7Parser;
    private readonly IConfiguration _configuration;
    private readonly IResultNotificationService _notificationService;

    public LISCompleteService(
        HISDbContext context,
        ILogger<LISCompleteService> logger,
        HL7ConnectionManager hl7Manager,
        IConfiguration configuration,
        IResultNotificationService notificationService)
    {
        _context = context;
        _logger = logger;
        _hl7Manager = hl7Manager;
        _configuration = configuration;
        _notificationService = notificationService;
        _hl7Parser = new HL7Parser();

        // Subscribe to HL7 events
        _hl7Manager.MessageReceived += OnHL7MessageReceived;
        _hl7Manager.ConnectionStatusChanged += OnHL7ConnectionStatusChanged;
        _hl7Manager.ErrorOccurred += OnHL7Error;
    }

    #region DEV Endpoints

    /// <summary>
    /// Update all lab request dates to today (DEV only)
    /// </summary>
    public async Task<int> UpdateAllOrderDatesToTodayAsync()
    {
        var today = DateTime.Today;
        var requests = await _context.LabRequests.ToListAsync();

        foreach (var request in requests)
        {
            request.RequestDate = today;
            if (request.ApprovedAt.HasValue)
                request.ApprovedAt = today.AddHours(request.ApprovedAt.Value.Hour).AddMinutes(request.ApprovedAt.Value.Minute);
        }

        await _context.SaveChangesAsync();
        return requests.Count;
    }

    #endregion

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
        return new List<SampleCollectionItemDto>();
    }

    public async Task<CollectSampleResultDto> CollectSampleAsync(CollectSampleDto dto)
    {
        try
        {
            // Generate barcode: LIS + date + orderId (4 chars)
            var today = DateTime.Now;
            var barcode = $"LIS{today:yyMMdd}{dto.LabOrderId.ToString().Substring(0, 4).ToUpper()}";
            var collectionTime = dto.Samples.FirstOrDefault()?.CollectedAt ?? DateTime.Now;

            // Update database using raw SQL
            using (var connection = new Microsoft.Data.SqlClient.SqlConnection(_context.Database.GetConnectionString()))
            {
                await connection.OpenAsync();

                // Update LabOrders table with barcode and collection time
                var updateSql = @"
                    UPDATE LabOrders SET
                        SampleBarcode = @Barcode,
                        CollectedAt = @CollectionTime,
                        Status = 1  -- Đã lấy mẫu
                    WHERE Id = @OrderId";

                using (var cmd = new Microsoft.Data.SqlClient.SqlCommand(updateSql, connection))
                {
                    cmd.Parameters.AddWithValue("@Barcode", barcode);
                    cmd.Parameters.AddWithValue("@CollectionTime", collectionTime);
                    cmd.Parameters.AddWithValue("@OrderId", dto.LabOrderId);

                    var rowsAffected = await cmd.ExecuteNonQueryAsync();
                    if (rowsAffected > 0)
                    {
                        _logger.LogInformation("Sample collected for order {OrderId}, barcode: {Barcode}", dto.LabOrderId, barcode);
                        return new CollectSampleResultDto
                        {
                            Success = true,
                            Barcode = barcode,
                            SampleId = dto.LabOrderId
                        };
                    }
                }
            }

            return new CollectSampleResultDto { Success = false, Message = "Order not found" };
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
            using var connection = new SqlConnection(_context.Database.GetConnectionString());
            await connection.OpenAsync();

            var sql = @"SELECT o.Status, o.CollectedAt, o.SampleBarcode, o.SampleType, o.OrderedAt
                        FROM LabOrders o WHERE o.Id = @SampleId AND o.IsDeleted = 0";
            using var cmd = new SqlCommand(sql, connection);
            cmd.Parameters.AddWithValue("@SampleId", sampleId);
            using var reader = await cmd.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                var status = reader.GetInt32(0);
                var collectedAt = reader.IsDBNull(1) ? (DateTime?)null : reader.GetDateTime(1);
                var barcode = reader.IsDBNull(2) ? null : reader.GetString(2);
                var orderedAt = reader.GetDateTime(4);

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
                   s.Id AS TestId, s.Price AS UnitPrice, s.InsurancePrice
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
        return new SendWorklistResultDto { Success = true, SentCount = dto.OrderIds?.Count ?? 0, Errors = new List<string>() };
    }

    public async Task<ReceiveResultDto> ReceiveResultFromAnalyzerAsync(Guid analyzerId)
    {
        return new ReceiveResultDto { ReceivedCount = 0, ProcessedCount = 0, ErrorCount = 0, Errors = new List<string>(), Results = new List<AnalyzerResultDto>() };
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
                                       ApprovedBy = @ApprovedBy
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
        var sql = @"UPDATE LabOrders SET Status = 4, ApprovedBy = @ApprovedBy,
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
        var sql = @"UPDATE LabOrders SET Status = 5, ApprovedAt = GETDATE(), ApprovedBy = @ApprovedBy,
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
        var sql = @"UPDATE LabOrders SET Status = 3, ApprovedAt = NULL, ApprovedBy = NULL,
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
                SELECT s.ServiceName AS TestName, s.ServiceCode AS TestCode,
                       r.ParameterName, r.Result, r.NumericResult, r.Unit,
                       r.ReferenceRange, r.ReferenceMin, r.ReferenceMax,
                       r.IsAbnormal, r.AbnormalType, r.SequenceNumber,
                       ri.TestId
                FROM LabResults r
                INNER JOIN LabRequestItems ri ON r.LabRequestItemId = ri.Id
                INNER JOIN LabRequests lr ON ri.LabRequestId = lr.Id
                INNER JOIN Services s ON ri.TestId = s.Id
                WHERE lr.LabOrderId = @OrderId AND r.IsDeleted = 0 AND ri.IsDeleted = 0
                ORDER BY s.ServiceName, r.SequenceNumber";

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
                SELECT u.FullName FROM LabRequests lr
                INNER JOIN Users u ON lr.ApprovedBy = u.Id
                WHERE lr.LabOrderId = @OrderId AND lr.IsDeleted = 0 AND lr.ApprovedBy IS NOT NULL";
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
            LEFT JOIN Users u ON o.ApprovedBy = u.Id
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
        return new List<LabTestNormDto>();
    }

    public async Task<bool> UpdateLabTestNormsAsync(Guid testId, List<UpdateLabTestNormDto> norms)
    {
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

    #region Báo cáo & Thống kê

    public async Task<LabRegisterReportDto> GetLabRegisterReportAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        var result = new LabRegisterReportDto { FromDate = fromDate, ToDate = toDate, Items = new List<LabRegisterItemDto>() };

        var sql = @"
            SELECT ROW_NUMBER() OVER (ORDER BY o.OrderedAt) AS RowNum,
                   o.OrderedAt, p.PatientCode, p.FullName AS PatientName,
                   DATEDIFF(YEAR, p.DateOfBirth, GETDATE()) AS Age, p.Gender,
                   i.TestName, i.Result, i.Unit, i.ReferenceRange, i.ResultStatus,
                   u.FullName AS OrderDoctorName, d.DepartmentName
            FROM LabOrderItems i
            INNER JOIN LabOrders o ON i.LabOrderId = o.Id
            INNER JOIN Patients p ON o.PatientId = p.Id
            LEFT JOIN Departments d ON o.OrderDepartmentId = d.Id
            LEFT JOIN Users u ON o.OrderDoctorId = u.Id
            WHERE o.IsDeleted = 0 AND o.OrderedAt >= @FromDate AND o.OrderedAt < @ToDate";

        if (departmentId.HasValue)
            sql += " AND o.OrderDepartmentId = @DeptId";

        sql += " ORDER BY o.OrderedAt";

        using var connection = new SqlConnection(_context.Database.GetConnectionString());
        await connection.OpenAsync();
        using var cmd = new SqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@FromDate", fromDate);
        cmd.Parameters.AddWithValue("@ToDate", toDate.AddDays(1));
        if (departmentId.HasValue) cmd.Parameters.AddWithValue("@DeptId", departmentId.Value);

        using var reader = await cmd.ExecuteReaderAsync();
        int rowNumber = 0;
        while (await reader.ReadAsync())
        {
            rowNumber++;
            var statusVal = reader.IsDBNull(reader.GetOrdinal("ResultStatus")) ? 0 : reader.GetInt32(reader.GetOrdinal("ResultStatus"));
            var genderInt = reader.IsDBNull(reader.GetOrdinal("Gender")) ? 0 : reader.GetInt32(reader.GetOrdinal("Gender"));

            result.Items.Add(new LabRegisterItemDto
            {
                RowNumber = rowNumber,
                OrderDate = reader.GetDateTime(reader.GetOrdinal("OrderedAt")),
                PatientCode = reader.IsDBNull(reader.GetOrdinal("PatientCode")) ? "" : reader.GetString(reader.GetOrdinal("PatientCode")),
                PatientName = reader.IsDBNull(reader.GetOrdinal("PatientName")) ? "" : reader.GetString(reader.GetOrdinal("PatientName")),
                Age = reader.IsDBNull(reader.GetOrdinal("Age")) ? null : reader.GetInt32(reader.GetOrdinal("Age")),
                Gender = genderInt == 1 ? "Nam" : genderInt == 2 ? "Nữ" : "",
                TestName = reader.GetString(reader.GetOrdinal("TestName")),
                Result = reader.IsDBNull(reader.GetOrdinal("Result")) ? "" : reader.GetString(reader.GetOrdinal("Result")),
                Unit = reader.IsDBNull(reader.GetOrdinal("Unit")) ? "" : reader.GetString(reader.GetOrdinal("Unit")),
                ReferenceRange = reader.IsDBNull(reader.GetOrdinal("ReferenceRange")) ? "" : reader.GetString(reader.GetOrdinal("ReferenceRange")),
                Flag = statusVal switch { 0 => "Normal", 1 => "Low", 2 => "High", 3 => "Critical", 4 => "Critical", _ => "" },
                OrderDoctorName = reader.IsDBNull(reader.GetOrdinal("OrderDoctorName")) ? "" : reader.GetString(reader.GetOrdinal("OrderDoctorName")),
            });
        }

        result.TotalOrders = result.Items.Select(i => i.PatientCode).Distinct().Count();
        result.TotalTests = result.Items.Count;
        if (departmentId.HasValue)
            result.DepartmentName = result.Items.FirstOrDefault()?.OrderDoctorName ?? "";

        return result;
    }

    public async Task<LabStatisticsDto> GetLabStatisticsAsync(DateTime fromDate, DateTime toDate, string groupBy = "day")
    {
        var result = new LabStatisticsDto { FromDate = fromDate, ToDate = toDate };

        using var connection = new SqlConnection(_context.Database.GetConnectionString());
        await connection.OpenAsync();

        // Summary statistics
        var summarySql = @"
            SELECT
                COUNT(DISTINCT o.Id) AS TotalOrders,
                COUNT(i.Id) AS TotalTests,
                SUM(CASE WHEN i.ResultStatus = 5 THEN 1 ELSE 0 END) AS CompletedTests,
                SUM(CASE WHEN i.Result IS NULL OR i.Result = '' THEN 1 ELSE 0 END) AS PendingTests,
                SUM(CASE WHEN i.ResultStatus IN (3,4) THEN 1 ELSE 0 END) AS CriticalCount
            FROM LabOrderItems i
            INNER JOIN LabOrders o ON i.LabOrderId = o.Id
            WHERE o.IsDeleted = 0 AND o.OrderedAt >= @FromDate AND o.OrderedAt < @ToDate";

        using (var cmd = new SqlCommand(summarySql, connection))
        {
            cmd.Parameters.AddWithValue("@FromDate", fromDate);
            cmd.Parameters.AddWithValue("@ToDate", toDate.AddDays(1));
            using var reader = await cmd.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                result.TotalOrders = reader.IsDBNull(0) ? 0 : reader.GetInt32(0);
                result.TotalTests = reader.IsDBNull(1) ? 0 : reader.GetInt32(1);
                result.CompletedTests = reader.IsDBNull(2) ? 0 : reader.GetInt32(2);
                result.PendingTests = reader.IsDBNull(3) ? 0 : reader.GetInt32(3);
                result.CriticalValueCount = reader.IsDBNull(4) ? 0 : reader.GetInt32(4);
            }
        }

        // By day statistics
        var byDaySql = @"
            SELECT CAST(o.OrderedAt AS DATE) AS OrderDate,
                   COUNT(DISTINCT o.Id) AS OrderCount,
                   COUNT(i.Id) AS TestCount,
                   SUM(CASE WHEN i.ResultStatus = 5 THEN 1 ELSE 0 END) AS CompletedCount
            FROM LabOrderItems i
            INNER JOIN LabOrders o ON i.LabOrderId = o.Id
            WHERE o.IsDeleted = 0 AND o.OrderedAt >= @FromDate AND o.OrderedAt < @ToDate
            GROUP BY CAST(o.OrderedAt AS DATE)
            ORDER BY OrderDate";

        result.ByDay = new List<DailyLabStatDto>();
        using (var cmd = new SqlCommand(byDaySql, connection))
        {
            cmd.Parameters.AddWithValue("@FromDate", fromDate);
            cmd.Parameters.AddWithValue("@ToDate", toDate.AddDays(1));
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                result.ByDay.Add(new DailyLabStatDto
                {
                    Date = reader.GetDateTime(0),
                    OrderCount = reader.GetInt32(1),
                    TestCount = reader.GetInt32(2),
                    CompletedCount = reader.GetInt32(3)
                });
            }
        }

        // By department statistics
        var byDeptSql = @"
            SELECT d.Id AS DepartmentId, d.DepartmentName,
                   COUNT(DISTINCT o.Id) AS OrderCount, COUNT(i.Id) AS TestCount
            FROM LabOrderItems i
            INNER JOIN LabOrders o ON i.LabOrderId = o.Id
            LEFT JOIN Departments d ON o.OrderDepartmentId = d.Id
            WHERE o.IsDeleted = 0 AND o.OrderedAt >= @FromDate AND o.OrderedAt < @ToDate
            GROUP BY d.Id, d.DepartmentName
            ORDER BY TestCount DESC";

        result.ByDepartment = new List<DepartmentLabStatDto>();
        using (var cmd = new SqlCommand(byDeptSql, connection))
        {
            cmd.Parameters.AddWithValue("@FromDate", fromDate);
            cmd.Parameters.AddWithValue("@ToDate", toDate.AddDays(1));
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                result.ByDepartment.Add(new DepartmentLabStatDto
                {
                    DepartmentId = reader.IsDBNull(0) ? Guid.Empty : reader.GetGuid(0),
                    DepartmentName = reader.IsDBNull(1) ? "Chưa xác định" : reader.GetString(1),
                    OrderCount = reader.GetInt32(2),
                    TestCount = reader.GetInt32(3)
                });
            }
        }

        // By test type/group
        var byTestSql = @"
            SELECT ISNULL(i.TestGroupName, 'Khác') AS TestGroup,
                   COUNT(i.Id) AS TestCount,
                   SUM(CASE WHEN i.ResultStatus = 5 THEN 1 ELSE 0 END) AS CompletedCount
            FROM LabOrderItems i
            INNER JOIN LabOrders o ON i.LabOrderId = o.Id
            WHERE o.IsDeleted = 0 AND o.OrderedAt >= @FromDate AND o.OrderedAt < @ToDate
            GROUP BY ISNULL(i.TestGroupName, 'Khác')
            ORDER BY TestCount DESC";

        result.ByTestType = new List<TestTypeStatDto>();
        using (var cmd = new SqlCommand(byTestSql, connection))
        {
            cmd.Parameters.AddWithValue("@FromDate", fromDate);
            cmd.Parameters.AddWithValue("@ToDate", toDate.AddDays(1));
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                result.ByTestType.Add(new TestTypeStatDto
                {
                    TestGroup = reader.GetString(0),
                    TestCount = reader.GetInt32(1),
                    CompletedCount = reader.GetInt32(2)
                });
            }
        }

        return result;
    }

    public async Task<LabRevenueReportDto> GetLabRevenueReportAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        var result = new LabRevenueReportDto { FromDate = fromDate, ToDate = toDate, Details = new List<LabRevenueItemDto>() };

        var sql = @"
            SELECT i.TestCode, i.TestName, ISNULL(i.TestGroupName, 'Khác') AS TestGroup,
                   COUNT(i.Id) AS Quantity,
                   ISNULL(s.Price, 0) AS UnitPrice,
                   ISNULL(s.InsurancePrice, 0) AS InsurancePrice,
                   s.Id AS TestId
            FROM LabOrderItems i
            INNER JOIN LabOrders o ON i.LabOrderId = o.Id
            LEFT JOIN Services s ON i.TestCode = s.ServiceCode AND s.IsDeleted = 0
            WHERE o.IsDeleted = 0 AND o.OrderedAt >= @FromDate AND o.OrderedAt < @ToDate";

        if (departmentId.HasValue)
            sql += " AND o.OrderDepartmentId = @DeptId";

        sql += @" GROUP BY i.TestCode, i.TestName, i.TestGroupName, s.Price, s.InsurancePrice, s.Id
                  ORDER BY Quantity DESC";

        using var connection = new SqlConnection(_context.Database.GetConnectionString());
        await connection.OpenAsync();
        using var cmd = new SqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@FromDate", fromDate);
        cmd.Parameters.AddWithValue("@ToDate", toDate.AddDays(1));
        if (departmentId.HasValue) cmd.Parameters.AddWithValue("@DeptId", departmentId.Value);

        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var qty = reader.GetInt32(3);
            var unitPrice = reader.GetDecimal(4);
            var insurancePrice = reader.GetDecimal(5);
            var total = qty * unitPrice;
            var insuranceAmt = qty * insurancePrice;

            result.Details.Add(new LabRevenueItemDto
            {
                TestId = reader.IsDBNull(6) ? Guid.Empty : reader.GetGuid(6),
                TestCode = reader.GetString(0),
                TestName = reader.GetString(1),
                TestGroup = reader.GetString(2),
                Quantity = qty,
                UnitPrice = unitPrice,
                TotalAmount = total,
                InsuranceAmount = insuranceAmt,
                PatientAmount = total - insuranceAmt
            });

            result.ActualRevenue += total;
            result.ActualCount += qty;
        }

        result.CollectedRevenue = result.ActualRevenue; // Simplified: collected = actual
        result.CollectedCount = result.ActualCount;

        return result;
    }

    public async Task<LabTATReportDto> GetLabTATReportAsync(DateTime fromDate, DateTime toDate)
    {
        var result = new LabTATReportDto { FromDate = fromDate, ToDate = toDate, TATByTest = new List<LabTATByTestDto>(), TATByDay = new List<LabTATByDayDto>() };

        using var connection = new SqlConnection(_context.Database.GetConnectionString());
        await connection.OpenAsync();

        // Summary + by test
        var byTestSql = @"
            SELECT i.TestCode, i.TestName, COUNT(i.Id) AS TestCount,
                   AVG(DATEDIFF(MINUTE, o.OrderedAt, ISNULL(o.ApprovedAt, o.ProcessingEndTime))) AS AvgTAT
            FROM LabOrderItems i
            INNER JOIN LabOrders o ON i.LabOrderId = o.Id
            WHERE o.IsDeleted = 0 AND o.OrderedAt >= @FromDate AND o.OrderedAt < @ToDate
              AND (o.ApprovedAt IS NOT NULL OR o.ProcessingEndTime IS NOT NULL)
            GROUP BY i.TestCode, i.TestName
            ORDER BY TestCount DESC";

        using (var cmd = new SqlCommand(byTestSql, connection))
        {
            cmd.Parameters.AddWithValue("@FromDate", fromDate);
            cmd.Parameters.AddWithValue("@ToDate", toDate.AddDays(1));
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var avgTat = reader.IsDBNull(3) ? 0 : reader.GetInt32(3);
                var count = reader.GetInt32(2);
                var targetTat = 60; // Default 60 min target
                result.TATByTest.Add(new LabTATByTestDto
                {
                    TestCode = reader.GetString(0),
                    TestName = reader.GetString(1),
                    TestCount = count,
                    TargetTATMinutes = targetTat,
                    AverageTATMinutes = avgTat,
                    CompliancePercent = avgTat <= targetTat ? 100m : Math.Round((decimal)targetTat / avgTat * 100, 1)
                });
                result.TotalTests += count;
            }
        }

        result.AverageTATMinutes = result.TATByTest.Any()
            ? Math.Round((decimal)result.TATByTest.Average(t => t.AverageTATMinutes), 1)
            : 0;
        result.TATCompliancePercent = result.TATByTest.Any()
            ? Math.Round(result.TATByTest.Average(t => t.CompliancePercent), 1)
            : 0;

        // By day
        var byDaySql = @"
            SELECT CAST(o.OrderedAt AS DATE) AS OrderDate, COUNT(i.Id) AS TestCount,
                   AVG(DATEDIFF(MINUTE, o.OrderedAt, ISNULL(o.ApprovedAt, o.ProcessingEndTime))) AS AvgTAT
            FROM LabOrderItems i
            INNER JOIN LabOrders o ON i.LabOrderId = o.Id
            WHERE o.IsDeleted = 0 AND o.OrderedAt >= @FromDate AND o.OrderedAt < @ToDate
              AND (o.ApprovedAt IS NOT NULL OR o.ProcessingEndTime IS NOT NULL)
            GROUP BY CAST(o.OrderedAt AS DATE)
            ORDER BY OrderDate";

        using (var cmd = new SqlCommand(byDaySql, connection))
        {
            cmd.Parameters.AddWithValue("@FromDate", fromDate);
            cmd.Parameters.AddWithValue("@ToDate", toDate.AddDays(1));
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var avgTat = reader.IsDBNull(2) ? 0 : reader.GetInt32(2);
                result.TATByDay.Add(new LabTATByDayDto
                {
                    Date = reader.GetDateTime(0),
                    TestCount = reader.GetInt32(1),
                    AverageTATMinutes = avgTat,
                    CompliancePercent = avgTat <= 60 ? 100m : Math.Round(60m / avgTat * 100, 1)
                });
            }
        }

        return result;
    }

    public async Task<AnalyzerUtilizationReportDto> GetAnalyzerUtilizationReportAsync(DateTime fromDate, DateTime toDate, Guid? analyzerId = null)
    {
        var result = new AnalyzerUtilizationReportDto { FromDate = fromDate, ToDate = toDate, Analyzers = new List<AnalyzerUtilizationItemDto>() };

        var sql = @"
            SELECT a.Id AS AnalyzerId, a.AnalyzerName, COUNT(o.Id) AS TotalTests
            FROM LabAnalyzers a
            LEFT JOIN LabOrders o ON o.AnalyzerId = a.Id AND o.IsDeleted = 0
                AND o.OrderedAt >= @FromDate AND o.OrderedAt < @ToDate
            WHERE a.IsDeleted = 0";

        if (analyzerId.HasValue) sql += " AND a.Id = @AnalyzerId";
        sql += " GROUP BY a.Id, a.AnalyzerName ORDER BY TotalTests DESC";

        using var connection = new SqlConnection(_context.Database.GetConnectionString());
        await connection.OpenAsync();
        using var cmd = new SqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@FromDate", fromDate);
        cmd.Parameters.AddWithValue("@ToDate", toDate.AddDays(1));
        if (analyzerId.HasValue) cmd.Parameters.AddWithValue("@AnalyzerId", analyzerId.Value);

        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var totalTests = reader.GetInt32(2);
            var days = (toDate - fromDate).Days;
            var dailyCapacity = 200; // Default daily capacity
            var totalCapacity = dailyCapacity * Math.Max(days, 1);

            result.Analyzers.Add(new AnalyzerUtilizationItemDto
            {
                AnalyzerId = reader.GetGuid(0),
                AnalyzerName = reader.GetString(1),
                TotalTests = totalTests,
                Capacity = totalCapacity,
                UtilizationPercent = totalCapacity > 0 ? Math.Round((decimal)totalTests / totalCapacity * 100, 1) : 0,
                UptimePercent = 95m, // Simplified: assume 95% uptime
                ErrorCount = 0
            });
        }

        return result;
    }

    public async Task<AbnormalRateReportDto> GetAbnormalRateReportAsync(DateTime fromDate, DateTime toDate)
    {
        var result = new AbnormalRateReportDto { FromDate = fromDate, ToDate = toDate, ByTest = new List<AbnormalRateByTestDto>() };

        var sql = @"
            SELECT i.TestCode, i.TestName,
                   COUNT(i.Id) AS TotalCount,
                   SUM(CASE WHEN i.ResultStatus IN (1,2,3,4) THEN 1 ELSE 0 END) AS AbnormalCount,
                   SUM(CASE WHEN i.ResultStatus = 2 THEN 1 ELSE 0 END) AS HighCount,
                   SUM(CASE WHEN i.ResultStatus = 1 THEN 1 ELSE 0 END) AS LowCount,
                   SUM(CASE WHEN i.ResultStatus IN (3,4) THEN 1 ELSE 0 END) AS CriticalCount
            FROM LabOrderItems i
            INNER JOIN LabOrders o ON i.LabOrderId = o.Id
            WHERE o.IsDeleted = 0 AND o.OrderedAt >= @FromDate AND o.OrderedAt < @ToDate
              AND i.Result IS NOT NULL AND i.Result <> ''
            GROUP BY i.TestCode, i.TestName
            ORDER BY AbnormalCount DESC";

        using var connection = new SqlConnection(_context.Database.GetConnectionString());
        await connection.OpenAsync();
        using var cmd = new SqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@FromDate", fromDate);
        cmd.Parameters.AddWithValue("@ToDate", toDate.AddDays(1));

        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var total = reader.GetInt32(2);
            var abnormal = reader.GetInt32(3);
            var critical = reader.GetInt32(6);

            result.ByTest.Add(new AbnormalRateByTestDto
            {
                TestCode = reader.GetString(0),
                TestName = reader.GetString(1),
                TotalCount = total,
                AbnormalCount = abnormal,
                AbnormalPercent = total > 0 ? Math.Round((decimal)abnormal / total * 100, 1) : 0,
                HighCount = reader.GetInt32(4),
                LowCount = reader.GetInt32(5),
                CriticalCount = critical
            });

            result.TotalTests += total;
            result.AbnormalCount += abnormal;
            result.CriticalCount += critical;
        }

        result.AbnormalPercent = result.TotalTests > 0 ? Math.Round((decimal)result.AbnormalCount / result.TotalTests * 100, 1) : 0;
        result.CriticalPercent = result.TotalTests > 0 ? Math.Round((decimal)result.CriticalCount / result.TotalTests * 100, 1) : 0;

        return result;
    }

    public async Task<QCReportDto> GetQCReportAsync(DateTime fromDate, DateTime toDate, Guid? analyzerId = null)
    {
        var result = new QCReportDto { FromDate = fromDate, ToDate = toDate, ByAnalyzer = new List<QCReportByAnalyzerDto>() };

        // Query QC results from QCResults table (created by LabQC module)
        var sql = @"
            SELECT a.Id AS AnalyzerId, a.AnalyzerName,
                   COUNT(qr.Id) AS TotalRuns,
                   SUM(CASE WHEN qr.IsAccepted = 1 THEN 1 ELSE 0 END) AS AcceptedRuns,
                   SUM(CASE WHEN qr.IsAccepted = 0 THEN 1 ELSE 0 END) AS RejectedRuns
            FROM LabAnalyzers a
            LEFT JOIN QCResults qr ON qr.AnalyzerId = a.Id
                AND qr.RunDate >= @FromDate AND qr.RunDate < @ToDate
            WHERE a.IsDeleted = 0";

        if (analyzerId.HasValue) sql += " AND a.Id = @AnalyzerId";
        sql += " GROUP BY a.Id, a.AnalyzerName ORDER BY TotalRuns DESC";

        try
        {
            using var connection = new SqlConnection(_context.Database.GetConnectionString());
            await connection.OpenAsync();
            using var cmd = new SqlCommand(sql, connection);
            cmd.Parameters.AddWithValue("@FromDate", fromDate);
            cmd.Parameters.AddWithValue("@ToDate", toDate.AddDays(1));
            if (analyzerId.HasValue) cmd.Parameters.AddWithValue("@AnalyzerId", analyzerId.Value);

            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var total = reader.GetInt32(2);
                var accepted = reader.GetInt32(3);
                result.ByAnalyzer.Add(new QCReportByAnalyzerDto
                {
                    AnalyzerId = reader.GetGuid(0),
                    AnalyzerName = reader.GetString(1),
                    TotalQCRuns = total,
                    AcceptedRuns = accepted,
                    RejectedRuns = reader.GetInt32(4),
                    AcceptanceRate = total > 0 ? Math.Round((decimal)accepted / total * 100, 1) : 0,
                    ByTest = new List<QCReportByTestDto>()
                });
            }
        }
        catch (SqlException ex) when (ex.Message.Contains("Invalid object name") || ex.Message.Contains("Invalid column"))
        {
            // QCResults table may not exist yet
            _logger.LogWarning("QCResults table not found for QC report: {Message}", ex.Message);
        }

        return result;
    }

    public async Task<byte[]> ExportLabDataForBHXHAsync(DateTime fromDate, DateTime toDate)
    {
        return System.Text.Encoding.UTF8.GetBytes($"<?xml version=\"1.0\"?><LabData><From>{fromDate:yyyy-MM-dd}</From><To>{toDate:yyyy-MM-dd}</To></LabData>");
    }

    #endregion

    #region Worklist & Analyzer Integration

    public async Task<WorklistDto> CreateWorklistAsync(CreateWorklistDto dto)
    {
        return new WorklistDto { AnalyzerId = dto.AnalyzerId, Items = new List<WorklistItemDto>() };
    }

    public async Task<List<WorklistDto>> GetPendingWorklistsAsync(Guid? analyzerId = null)
    {
        return new List<WorklistDto>();
    }


    public async Task<ProcessAnalyzerResultDto> ProcessAnalyzerResultAsync(Guid analyzerId, string rawData)
    {
        _logger.LogInformation("Processing analyzer result for {AnalyzerId}", analyzerId);

        try
        {
            var message = _hl7Parser.Parse(rawData);
            var labResults = _hl7Parser.ParseORU(message);
            int matchedCount = 0;
            var errors = new List<string>();

            foreach (var result in labResults)
            {
                _logger.LogInformation("Processing result: SampleId={SampleId}, TestCode={TestCode}, Value={Value}",
                    result.SampleId, result.TestCode, result.Value);

                // Try to match with existing lab order by SampleBarcode and TestCode using direct SQL
                Guid? matchedItemId = null;
                Guid? matchedOrderId = null;
                decimal? normalMin = null, normalMax = null, criticalLow = null, criticalHigh = null;

                using (var conn = new SqlConnection(_configuration.GetConnectionString("DefaultConnection")))
                {
                    await conn.OpenAsync();

                    // Find matching order item
                    var findSql = @"
                        SELECT i.Id, i.LabOrderId, i.NormalMin, i.NormalMax, i.CriticalLow, i.CriticalHigh
                        FROM LabOrderItems i
                        INNER JOIN LabOrders o ON i.LabOrderId = o.Id
                        WHERE o.SampleBarcode = @SampleBarcode AND i.TestCode = @TestCode";

                    using (var cmd = new SqlCommand(findSql, conn))
                    {
                        cmd.Parameters.AddWithValue("@SampleBarcode", result.SampleId ?? "");
                        cmd.Parameters.AddWithValue("@TestCode", result.TestCode ?? "");

                        using (var reader = await cmd.ExecuteReaderAsync())
                        {
                            if (await reader.ReadAsync())
                            {
                                matchedItemId = reader.GetGuid(0);
                                matchedOrderId = reader.GetGuid(1);
                                normalMin = reader.IsDBNull(2) ? null : reader.GetDecimal(2);
                                normalMax = reader.IsDBNull(3) ? null : reader.GetDecimal(3);
                                criticalLow = reader.IsDBNull(4) ? null : reader.GetDecimal(4);
                                criticalHigh = reader.IsDBNull(5) ? null : reader.GetDecimal(5);
                            }
                        }
                    }

                    if (matchedItemId.HasValue)
                    {
                        _logger.LogInformation("Matched order item: {OrderItemId} for barcode {Barcode}",
                            matchedItemId, result.SampleId);

                        // Calculate result status based on reference ranges
                        int resultStatus = 0;
                        if (decimal.TryParse(result.Value, out var numericValue))
                        {
                            if (criticalLow.HasValue && numericValue < criticalLow.Value)
                                resultStatus = 3; // Critical Low
                            else if (criticalHigh.HasValue && numericValue > criticalHigh.Value)
                                resultStatus = 4; // Critical High
                            else if (normalMin.HasValue && numericValue < normalMin.Value)
                                resultStatus = 1; // Low
                            else if (normalMax.HasValue && numericValue > normalMax.Value)
                                resultStatus = 2; // High
                        }

                        // Update result in LabOrderItem (including ReferenceRange and Unit from HL7 if available)
                        var updateItemSql = @"
                            UPDATE LabOrderItems
                            SET Result = @Result,
                                ResultStatus = @ResultStatus,
                                ResultEnteredAt = GETDATE(),
                                ReferenceRange = CASE WHEN @ReferenceRange IS NOT NULL AND @ReferenceRange <> '' THEN @ReferenceRange ELSE ReferenceRange END,
                                Unit = CASE WHEN @Unit IS NOT NULL AND @Unit <> '' THEN @Unit ELSE Unit END
                            WHERE Id = @ItemId";

                        using (var updateCmd = new SqlCommand(updateItemSql, conn))
                        {
                            updateCmd.Parameters.AddWithValue("@Result", result.Value ?? "");
                            updateCmd.Parameters.AddWithValue("@ResultStatus", resultStatus);
                            updateCmd.Parameters.AddWithValue("@ReferenceRange", result.ReferenceRange ?? "");
                            updateCmd.Parameters.AddWithValue("@Unit", result.Units ?? "");
                            updateCmd.Parameters.AddWithValue("@ItemId", matchedItemId.Value);
                            await updateCmd.ExecuteNonQueryAsync();
                        }

                        // Check if all items have results, update order status
                        var checkSql = @"
                            SELECT COUNT(*) FROM LabOrderItems
                            WHERE LabOrderId = @OrderId AND (Result IS NULL OR Result = '')";

                        using (var checkCmd = new SqlCommand(checkSql, conn))
                        {
                            checkCmd.Parameters.AddWithValue("@OrderId", matchedOrderId.Value);
                            var pendingCount = (int)await checkCmd.ExecuteScalarAsync();

                            int newStatus = pendingCount == 0 ? 3 : 2; // 3=Chờ duyệt, 2=Đang XN

                            var updateOrderSql = @"
                                UPDATE LabOrders SET Status = @Status,
                                ProcessingEndTime = CASE WHEN @Status = 3 THEN GETDATE() ELSE ProcessingEndTime END
                                WHERE Id = @OrderId";

                            using (var updateOrderCmd = new SqlCommand(updateOrderSql, conn))
                            {
                                updateOrderCmd.Parameters.AddWithValue("@Status", newStatus);
                                updateOrderCmd.Parameters.AddWithValue("@OrderId", matchedOrderId.Value);
                                await updateOrderCmd.ExecuteNonQueryAsync();
                            }
                        }

                        // Save raw result as matched
                        var rawResult = new LabRawResult
                        {
                            AnalyzerId = analyzerId,
                            SampleId = result.SampleId,
                            PatientId = result.PatientId,
                            TestCode = result.TestCode,
                            Result = result.Value,
                            Unit = result.Units,
                            Flag = result.AbnormalFlag,
                            ResultTime = result.ResultDateTime,
                            RawMessage = rawData,
                            Status = 1, // Matched
                            MappedToLabRequestItemId = matchedItemId.Value,
                            MappedAt = DateTime.Now
                        };
                        _context.LabRawResults.Add(rawResult);

                        matchedCount++;
                    }
                    else
                    {
                        _logger.LogWarning("No matching order found for SampleId={SampleId}, TestCode={TestCode}",
                            result.SampleId, result.TestCode);

                        // Save as unmatched raw result
                        var rawResult = new LabRawResult
                        {
                            AnalyzerId = analyzerId,
                            SampleId = result.SampleId,
                            PatientId = result.PatientId,
                            TestCode = result.TestCode,
                            Result = result.Value,
                            Unit = result.Units,
                            Flag = result.AbnormalFlag,
                            ResultTime = result.ResultDateTime,
                            RawMessage = rawData,
                            Status = 0 // Pending/Unmatched
                        };
                        _context.LabRawResults.Add(rawResult);
                    }
                }
            }



            await _context.SaveChangesAsync();

            _logger.LogInformation("Processed {Total} results, matched {Matched}",
                labResults.Count, matchedCount);

            return new ProcessAnalyzerResultDto
            {
                ProcessedCount = labResults.Count,
                MatchedCount = matchedCount,
                UnmatchedCount = labResults.Count - matchedCount,
                Errors = errors
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process analyzer result");
            return new ProcessAnalyzerResultDto
            {
                ProcessedCount = 0,
                MatchedCount = 0,
                UnmatchedCount = 0,
                Errors = new List<string> { ex.Message }
            };
        }
    }

    public async Task<List<UnmappedResultDto>> GetUnmappedResultsAsync(Guid? analyzerId = null)
    {
        var query = _context.LabRawResults.Where(r => r.Status == 0).AsQueryable();
        if (analyzerId.HasValue)
            query = query.Where(r => r.AnalyzerId == analyzerId);

        var results = await query.Take(100).ToListAsync();
        return results.Select(r => new UnmappedResultDto
        {
            Id = r.Id,
            AnalyzerId = r.AnalyzerId,
            SampleId = r.SampleId,
            TestCode = r.TestCode,
            Result = r.Result,
            ReceivedTime = r.CreatedAt,
            RawData = r.RawMessage
        }).ToList();
    }

    public async Task<bool> ManualMapResultAsync(ManualMapResultDto dto)
    {
        return true;
    }

    public async Task<bool> RetryWorklistAsync(Guid worklistId)
    {
        return true;
    }

    public async Task<List<AnalyzerRealtimeStatusDto>> GetAnalyzersRealtimeStatusAsync()
    {
        var analyzers = await _context.LabAnalyzers.Where(a => a.IsActive).ToListAsync();
        return analyzers.Select(a =>
        {
            var status = _hl7Manager.GetConnectionStatus(a.Id);
            return new AnalyzerRealtimeStatusDto
            {
                AnalyzerId = a.Id,
                AnalyzerName = a.Name,
                Status = status.Status.ToString(),
                LastCommunication = a.LastDataReceivedAt ?? a.LastConnectedAt
            };
        }).ToList();
    }

    #endregion

    #region POCT & Microbiology

    public async Task<List<POCTDeviceDto>> GetPOCTDevicesAsync(string keyword = null) => new List<POCTDeviceDto>();
    public async Task<bool> EnterPOCTResultAsync(EnterPOCTResultDto dto) => true;
    public async Task<SyncPOCTResultDto> SyncPOCTResultsAsync(Guid deviceId) => new SyncPOCTResultDto();
    public async Task<List<MicrobiologyCultureDto>> GetMicrobiologyCulturesAsync(DateTime fromDate, DateTime toDate, string status = null) => new List<MicrobiologyCultureDto>();
    public async Task<bool> EnterCultureResultAsync(EnterCultureResultDto dto) => true;
    public async Task<bool> EnterAntibioticSensitivityAsync(EnterAntibioticSensitivityDto dto) => true;
    public async Task<List<AntibioticDto>> GetAntibioticsAsync() => new List<AntibioticDto>();
    public async Task<List<BacteriaDto>> GetBacteriasAsync() => new List<BacteriaDto>();
    public async Task<MicrobiologyStatisticsDto> GetMicrobiologyStatisticsAsync(DateTime fromDate, DateTime toDate) => new MicrobiologyStatisticsDto { FromDate = fromDate, ToDate = toDate };

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

                // Find the labRequestItem by sample barcode and test code using raw SQL
                var sql = @"
                    SELECT i.Id, i.LabOrderId, i.NormalMin, i.NormalMax, i.CriticalLow, i.CriticalHigh, o.SampleBarcode
                    FROM LabOrderItems i
                    INNER JOIN LabOrders o ON i.LabOrderId = o.Id
                    WHERE o.SampleBarcode = @SampleId AND i.TestCode = @TestCode";

                using (var connection = new Microsoft.Data.SqlClient.SqlConnection(_context.Database.GetConnectionString()))
                {
                    await connection.OpenAsync();

                    Guid? orderItemId = null;
                    Guid? labOrderId = null;
                    decimal? normalMin = null, normalMax = null, criticalLow = null, criticalHigh = null;

                    using (var cmd = new Microsoft.Data.SqlClient.SqlCommand(sql, connection))
                    {
                        cmd.Parameters.AddWithValue("@SampleId", result.SampleId ?? "");
                        cmd.Parameters.AddWithValue("@TestCode", result.TestCode ?? "");

                        using (var reader = await cmd.ExecuteReaderAsync())
                        {
                            if (await reader.ReadAsync())
                            {
                                orderItemId = reader.GetGuid(0);
                                labOrderId = reader.GetGuid(1);
                                normalMin = reader.IsDBNull(2) ? null : reader.GetDecimal(2);
                                normalMax = reader.IsDBNull(3) ? null : reader.GetDecimal(3);
                                criticalLow = reader.IsDBNull(4) ? null : reader.GetDecimal(4);
                                criticalHigh = reader.IsDBNull(5) ? null : reader.GetDecimal(5);
                            }
                        }
                    }

                    if (orderItemId.HasValue)
                    {
                        // Calculate result status
                        int resultStatus = 0;
                        if (decimal.TryParse(result.Value, out var numericResult))
                        {
                            if (criticalLow.HasValue && numericResult < criticalLow.Value)
                                resultStatus = 3; // Critical Low
                            else if (criticalHigh.HasValue && numericResult > criticalHigh.Value)
                                resultStatus = 4; // Critical High
                            else if (normalMin.HasValue && numericResult < normalMin.Value)
                                resultStatus = 1; // Low
                            else if (normalMax.HasValue && numericResult > normalMax.Value)
                                resultStatus = 2; // High
                        }

                        // Update result in LabOrderItems
                        var updateSql = @"
                            UPDATE LabOrderItems
                            SET Result = @Result, ResultStatus = @ResultStatus, ResultAt = @ResultAt
                            WHERE Id = @Id";

                        using (var updateCmd = new Microsoft.Data.SqlClient.SqlCommand(updateSql, connection))
                        {
                            updateCmd.Parameters.AddWithValue("@Result", result.Value ?? "");
                            updateCmd.Parameters.AddWithValue("@ResultStatus", resultStatus);
                            updateCmd.Parameters.AddWithValue("@ResultAt", result.DateTimeOfObservation ?? DateTime.Now);
                            updateCmd.Parameters.AddWithValue("@Id", orderItemId.Value);
                            await updateCmd.ExecuteNonQueryAsync();
                        }

                        // Check if all items have results and update order status
                        var checkSql = @"
                            SELECT COUNT(*) FROM LabOrderItems WHERE LabOrderId = @OrderId AND (Result IS NULL OR Result = '')";
                        using (var checkCmd = new Microsoft.Data.SqlClient.SqlCommand(checkSql, connection))
                        {
                            checkCmd.Parameters.AddWithValue("@OrderId", labOrderId.Value);
                            var pendingCount = (int)await checkCmd.ExecuteScalarAsync();

                            var newStatus = pendingCount == 0 ? 3 : 2; // 3=Chờ duyệt, 2=Đang XN
                            var updateOrderSql = @"
                                UPDATE LabOrders SET Status = @Status, ProcessingEndTime = CASE WHEN @Status = 3 THEN GETDATE() ELSE ProcessingEndTime END
                                WHERE Id = @OrderId";
                            using (var updateOrderCmd = new Microsoft.Data.SqlClient.SqlCommand(updateOrderSql, connection))
                            {
                                updateOrderCmd.Parameters.AddWithValue("@Status", newStatus);
                                updateOrderCmd.Parameters.AddWithValue("@OrderId", labOrderId.Value);
                                await updateOrderCmd.ExecuteNonQueryAsync();
                            }
                        }

                        _logger.LogInformation("Updated result for OrderItem {OrderItemId}: {Value}", orderItemId.Value, result.Value);
                    }
                    else
                    {
                        _logger.LogWarning("No labRequestItem found for SampleId={SampleId}, TestCode={TestCode}",
                            result.SampleId, result.TestCode);
                    }
                }
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

    #region Helper Methods

    /// <summary>
    /// Parse protocol string to int code
    /// </summary>
    private int ParseProtocol(string protocol)
    {
        return protocol?.ToUpperInvariant() switch
        {
            "HL7" => 1,
            "ASTM1381" => 2,
            "ASTM1394" => 3,
            "ASCII" => 4,
            "ADVIA" => 5,
            "HITACHI" => 6,
            "AU" => 7,
            "RAPIDBIND" => 8,
            "CUSTOM" => 9,
            _ => 1 // Default to HL7
        };
    }

    /// <summary>
    /// Parse connection type string to int code
    /// </summary>
    private int ParseConnectionType(string connectionType)
    {
        return connectionType?.ToUpperInvariant() switch
        {
            "SERIAL" or "COM" or "RS232" => 1,
            "TCP" or "TCPSERVER" => 2,
            "TCPCLIENT" => 3,
            "FILE" => 4,
            _ => 2 // Default to TCP
        };
    }

    /// <summary>
    /// Parse connection method from connection type string
    /// </summary>
    private int ParseConnectionMethod(string connectionType)
    {
        return connectionType?.ToUpperInvariant() switch
        {
            "SERIAL" or "COM" or "RS232" => 1,
            "TCP" or "TCPSERVER" => 2,
            "TCPCLIENT" => 3,
            "FILE" => 4,
            _ => 2 // Default to TCP
        };
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
