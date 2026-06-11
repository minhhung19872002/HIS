using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.Radiology;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Implementation of IRISCompleteService — handles all RIS/PACS/Radiology workflows.
/// Standalone mode - No external PACS server required.
///
/// K3 phien 1 (2026-05-30): converted to partial class. Group 8.x core (8.1 Waiting + 8.2
/// PACS + 8.3 Orders &amp; Results + 8.4 Prescriptions + 8.5 Reports ~1730 dong) tach ra
/// `RISCompleteService.Core8x.cs`. ZERO runtime change — partial class chia code physical.
/// </summary>
public partial class RISCompleteService : IRISCompleteService
{
    private readonly HISDbContext _context;
    private readonly IRepository<Patient> _patientRepo;
    private readonly IRepository<RadiologyRequest> _radiologyRequestRepo;
    private readonly IRepository<RadiologyExam> _radiologyExamRepo;
    private readonly IRepository<RadiologyReport> _radiologyReportRepo;
    private readonly IRepository<RadiologyModality> _modalityRepo;
    private readonly IRepository<DicomStudy> _dicomStudyRepo;
    private readonly IRepository<Room> _roomRepo;
    private readonly IRepository<User> _userRepo;
    private readonly IRepository<Service> _serviceRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IConfiguration _configuration;
    private readonly IResultNotificationService _notificationService;
    private readonly ILogger<RISCompleteService> _logger;
    private readonly Microsoft.AspNetCore.Http.IHttpContextAccessor? _httpContextAccessor;
    private Guid? _adminUserIdCache;

    // PACS configuration (optional - for future integration)
    private readonly string _pacsBaseUrl;
    private readonly bool _pacsEnabled;

    public RISCompleteService(
        HISDbContext context,
        IRepository<Patient> patientRepo,
        IRepository<RadiologyRequest> radiologyRequestRepo,
        IRepository<RadiologyExam> radiologyExamRepo,
        IRepository<RadiologyReport> radiologyReportRepo,
        IRepository<RadiologyModality> modalityRepo,
        IRepository<DicomStudy> dicomStudyRepo,
        IRepository<Room> roomRepo,
        IRepository<User> userRepo,
        IRepository<Service> serviceRepo,
        IUnitOfWork unitOfWork,
        IConfiguration configuration,
        IResultNotificationService notificationService,
        ILogger<RISCompleteService> logger,
        Microsoft.AspNetCore.Http.IHttpContextAccessor? httpContextAccessor = null)
    {
        _httpContextAccessor = httpContextAccessor;
        _context = context;
        _patientRepo = patientRepo;
        _radiologyRequestRepo = radiologyRequestRepo;
        _radiologyExamRepo = radiologyExamRepo;
        _radiologyReportRepo = radiologyReportRepo;
        _modalityRepo = modalityRepo;
        _dicomStudyRepo = dicomStudyRepo;
        _roomRepo = roomRepo;
        _userRepo = userRepo;
        _serviceRepo = serviceRepo;
        _unitOfWork = unitOfWork;
        _configuration = configuration;
        _notificationService = notificationService;
        _logger = logger;

        // Optional PACS configuration (disabled by default)
        _pacsEnabled = configuration.GetValue<bool>("PACS:Enabled", false);
        _pacsBaseUrl = configuration["PACS:BaseUrl"] ?? "";
    }




    #region Private Helper Methods

    /// <summary>
    /// User thật từ HttpContext claim thay vì hardcode admin GUID (roadmap data-quality:
    /// "hội chẩn organizer hardcode 9e5309dc..."). Fallback: user admin trong DB khi gọi
    /// ngoài HTTP scope (worker/seed); last-resort = GUID admin seed cũ để không vỡ FK.
    /// </summary>
    private Guid GetCurrentUserIdOrAdmin()
    {
        var claim = _httpContextAccessor?.HttpContext?.User?
            .FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (Guid.TryParse(claim, out var id)) return id;

        _adminUserIdCache ??= _context.Users.AsNoTracking()
            .Where(u => u.Username == "admin" && !u.IsDeleted)
            .Select(u => (Guid?)u.Id)
            .FirstOrDefault();
        return _adminUserIdCache ?? Guid.Parse("9e5309dc-ecf9-4d48-9a09-224cd15347b1");
    }

    private string GenerateAccessionNumber()
    {
        return $"ACC{DateTime.Now:yyyyMMddHHmmss}{new Random().Next(100, 999)}";
    }

    private string GetStatusName(int status)
    {
        return status switch
        {
            0 => "Cho thuc hien",
            1 => "Da hen",
            2 => "Dang thuc hien",
            3 => "Da thuc hien",
            4 => "Da tra ket qua",
            5 => "Da duyet",
            6 => "Da huy",
            _ => "Khong xac dinh"
        };
    }

    private string GetReportStatusName(int status)
    {
        return status switch
        {
            0 => "Draft",
            1 => "PreliminaryApproved",
            2 => "FinalApproved",
            _ => "Unknown"
        };
    }

    private string GetServiceTypeName(int serviceType)
    {
        return serviceType switch
        {
            1 => "X-Ray",
            2 => "CT Scan",
            3 => "MRI",
            4 => "Sieu am",
            5 => "Noi soi",
            6 => "Dien tim",
            7 => "Dien nao",
            _ => "CDHA"
        };
    }

    private string GetModalityTypeName(int modalityType)
    {
        return modalityType switch
        {
            1 => "XRay",
            2 => "CT",
            3 => "MRI",
            4 => "Ultrasound",
            5 => "Mammography",
            6 => "PET",
            _ => "Other"
        };
    }

    private int ParseModalityType(string modalityType)
    {
        return modalityType?.ToUpper() switch
        {
            "XRAY" or "XR" => 1,
            "CT" => 2,
            "MRI" or "MR" => 3,
            "ULTRASOUND" or "US" => 4,
            "MAMMOGRAPHY" or "MG" => 5,
            "PET" => 6,
            _ => 7
        };
    }

    private string GetRoomTypeName(int roomType)
    {
        return roomType switch
        {
            10 => "XRay",
            11 => "CT",
            12 => "MRI",
            13 => "Ultrasound",
            14 => "Endoscopy",
            15 => "ECG",
            _ => "Radiology"
        };
    }

    private int ParseRoomType(string roomType)
    {
        return roomType?.ToUpper() switch
        {
            "XRAY" => 10,
            "CT" => 11,
            "MRI" => 12,
            "ULTRASOUND" => 13,
            "ENDOSCOPY" => 14,
            "ECG" => 15,
            _ => 10
        };
    }

    private DateTime ParseDicomDate(string dicomDate)
    {
        if (string.IsNullOrEmpty(dicomDate)) return DateTime.Now;

        if (DateTime.TryParseExact(dicomDate, "yyyyMMdd", null, System.Globalization.DateTimeStyles.None, out var date))
            return date;

        return DateTime.Now;
    }

    private List<ModalityDto> GetDefaultModalities()
    {
        return new List<ModalityDto>
        {
            new ModalityDto
            {
                Id = Guid.Parse("00000001-0001-0001-0001-000000000001"),
                Code = "XR01",
                Name = "X-Ray Room 1",
                ModalityType = "XRay",
                Manufacturer = "Siemens",
                Model = "Ysio Max",
                AETitle = "XR01",
                ConnectionStatus = "Online",
                SupportsWorklist = true,
                SupportsMPPS = true,
                IsActive = true
            },
            new ModalityDto
            {
                Id = Guid.Parse("00000001-0001-0001-0001-000000000002"),
                Code = "CT01",
                Name = "CT Scanner",
                ModalityType = "CT",
                Manufacturer = "GE Healthcare",
                Model = "Revolution CT",
                AETitle = "CT01",
                ConnectionStatus = "Online",
                SupportsWorklist = true,
                SupportsMPPS = true,
                IsActive = true
            },
            new ModalityDto
            {
                Id = Guid.Parse("00000001-0001-0001-0001-000000000003"),
                Code = "US01",
                Name = "Ultrasound Room 1",
                ModalityType = "Ultrasound",
                Manufacturer = "Philips",
                Model = "EPIQ 7",
                AETitle = "US01",
                ConnectionStatus = "Online",
                SupportsWorklist = true,
                SupportsMPPS = false,
                IsActive = true
            }
        };
    }

    private List<RadiologyResultTemplateDto> GetDefaultTemplates()
    {
        return new List<RadiologyResultTemplateDto>
        {
            new RadiologyResultTemplateDto
            {
                Id = Guid.Parse("00000001-0002-0001-0001-000000000001"),
                Code = "XRAY_CHEST",
                Name = "X-Quang nguc thang",
                ServiceTypeName = "X-Ray",
                Gender = "Both",
                DescriptionTemplate = "X-Quang nguc thang:\n- Hinh anh phoi 2 ben trong, khong thay tham nhiem.\n- Bong tim khong to.\n- Xuc nguc, co hoành binh thuong.",
                ConclusionTemplate = "Phoi khong thay ton thuong.",
                IsDefault = true,
                IsActive = true
            },
            new RadiologyResultTemplateDto
            {
                Id = Guid.Parse("00000001-0002-0001-0001-000000000002"),
                Code = "US_ABDOMEN",
                Name = "Sieu am bung tong quat",
                ServiceTypeName = "Ultrasound",
                Gender = "Both",
                DescriptionTemplate = "Sieu am bung tong quat:\n- Gan: Kich thuoc binh thuong, nhu mo dong nhat.\n- Tui mat: Khong so.\n- Tuy: Binh thuong.\n- Lach: Binh thuong.\n- Than 2 ben: Binh thuong.",
                ConclusionTemplate = "Sieu am bung trong gioi han binh thuong.",
                IsDefault = true,
                IsActive = true
            },
            new RadiologyResultTemplateDto
            {
                Id = Guid.Parse("00000001-0002-0001-0001-000000000003"),
                Code = "CT_HEAD",
                Name = "CT So nao khong can quang",
                ServiceTypeName = "CT",
                Gender = "Both",
                DescriptionTemplate = "CT so nao khong can quang:\n- Khong thay ton thuong chay mau, nhoi mau.\n- He thong nao that binh thuong.\n- Cau truc duong giua khong lech.",
                ConclusionTemplate = "CT so nao khong thay ton thuong.",
                IsDefault = true,
                IsActive = true
            }
        };
    }

    #endregion






}
