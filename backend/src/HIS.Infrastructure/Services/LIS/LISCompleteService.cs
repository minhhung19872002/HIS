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
/// Complete LIS (Laboratory Information System) Service — Module 7: Xét nghiệm 31+ chức năng.
///
/// K11 phien (2026-05-30): converted to partial class. Files trong subfolder `Services/LIS/`.
/// ZERO runtime change — partial class.
/// </summary>
public partial class LISCompleteService : ILISCompleteService
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

}
