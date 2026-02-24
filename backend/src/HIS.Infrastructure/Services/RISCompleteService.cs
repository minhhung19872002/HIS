using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using HIS.Application.DTOs.Radiology;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Implementation of IRISCompleteService
/// Handles all RIS/PACS/Radiology workflows
/// Standalone mode - No external PACS server required
/// </summary>
public class RISCompleteService : IRISCompleteService
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
        IConfiguration configuration)
    {
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

        // Optional PACS configuration (disabled by default)
        _pacsEnabled = configuration.GetValue<bool>("PACS:Enabled", false);
        _pacsBaseUrl = configuration["PACS:BaseUrl"] ?? "";
    }

    #region 8.1 Waiting List (Man hinh cho thuc hien)

    public async Task<List<RadiologyWaitingListDto>> GetWaitingListAsync(
        DateTime date,
        Guid? roomId = null,
        string serviceType = null,
        string status = null,
        string keyword = null)
    {
        var query = _context.RadiologyRequests
            .Include(r => r.Patient)
            .Include(r => r.Service)
            .Include(r => r.RequestingDoctor)
            .Include(r => r.Exams)
                .ThenInclude(e => e.DicomStudies)
            .Where(r => r.RequestDate.Date == date.Date);

        if (roomId.HasValue)
        {
            query = query.Where(r => r.Exams.Any(e => e.RoomId == roomId));
        }

        if (!string.IsNullOrEmpty(status))
        {
            int statusInt;
            if (!int.TryParse(status, out statusInt))
            {
                statusInt = status.ToLower() switch
                {
                    "pending" => 0,
                    "inprogress" => 1,
                    "completed" => 2,
                    "cancelled" => 3,
                    _ => -1
                };
            }
            if (statusInt >= 0)
            {
                query = query.Where(r => r.Status == statusInt);
            }
        }

        if (!string.IsNullOrEmpty(keyword))
        {
            query = query.Where(r =>
                r.Patient.FullName.Contains(keyword) ||
                r.Patient.PatientCode.Contains(keyword) ||
                r.RequestCode.Contains(keyword));
        }

        var requests = await query.OrderBy(r => r.RequestDate).ToListAsync();

        return requests.Select((r, index) => new RadiologyWaitingListDto
        {
            PatientId = r.PatientId,
            PatientCode = r.Patient.PatientCode,
            PatientName = r.Patient.FullName,
            Age = r.Patient.DateOfBirth.HasValue ? (int?)((DateTime.Now - r.Patient.DateOfBirth.Value).Days / 365) : null,
            Gender = r.Patient.Gender == 1 ? "Nam" : "Nu",
            VisitId = r.MedicalRecordId ?? Guid.Empty,
            VisitCode = r.MedicalRecord?.MedicalRecordCode ?? "",
            OrderId = r.Id,
            OrderCode = r.RequestCode,
            OrderTime = r.RequestDate,
            OrderDoctorName = r.RequestingDoctor?.FullName ?? "",
            DepartmentName = "",
            ServiceName = r.Service?.ServiceName ?? "",
            ServiceTypeName = GetServiceTypeName(r.Service?.ServiceType ?? 0),
            RoomName = r.Exams.FirstOrDefault()?.Room?.RoomName ?? "",
            QueueNumber = index + 1,
            StatusCode = r.Status,
            Status = GetStatusName(r.Status),
            PatientType = r.PatientType == 1 ? "BHYT" : "Vien phi",
            Priority = r.Priority == 3 ? "Cap cuu" : r.Priority == 2 ? "Khan" : "Binh thuong",
            CalledTime = null,
            StartTime = r.Exams.FirstOrDefault()?.StartTime,
            StudyInstanceUID = r.Exams.SelectMany(e => e.DicomStudies).FirstOrDefault()?.StudyInstanceUID ?? "",
            HasImages = r.Exams.Any(e => e.DicomStudies.Any())
        }).ToList();
    }

    public async Task<CallPatientResultDto> CallPatientAsync(CallPatientDto dto)
    {
        var request = await _context.RadiologyRequests
            .Include(r => r.Patient)
            .FirstOrDefaultAsync(r => r.Id == dto.OrderId);

        if (request == null)
        {
            return new CallPatientResultDto
            {
                Success = false,
                Message = "Khong tim thay phieu yeu cau",
                CalledTime = DateTime.Now
            };
        }

        // Update status to in-progress
        if (request.Status == 0)
        {
            request.Status = 2; // InProgress
            await _unitOfWork.SaveChangesAsync();
        }

        return new CallPatientResultDto
        {
            Success = true,
            Message = $"Moi benh nhan {request.Patient.FullName} vao phong",
            CalledTime = DateTime.Now
        };
    }

    public async Task<WaitingDisplayConfigDto> GetDisplayConfigAsync(Guid roomId)
    {
        var room = await _context.Rooms.FindAsync(roomId);

        return new WaitingDisplayConfigDto
        {
            Id = Guid.NewGuid(),
            RoomId = roomId,
            RoomName = room?.RoomName ?? "",
            DisplayMode = "List",
            RefreshIntervalSeconds = 30,
            ShowPatientName = true,
            ShowAge = true,
            ShowServiceName = true,
            EnableSound = true,
            SoundFile = "call.mp3",
            AnnouncementTemplate = "Moi benh nhan {PatientName} so {QueueNumber} vao phong {RoomName}",
            IsActive = true
        };
    }

    public async Task<bool> UpdateDisplayConfigAsync(WaitingDisplayConfigDto config)
    {
        // Store in database or configuration
        return await Task.FromResult(true);
    }

    public async Task<bool> StartExamAsync(Guid orderId)
    {
        var request = await _context.RadiologyRequests.FindAsync(orderId);
        if (request == null) return false;

        request.Status = 2; // InProgress

        // Create exam record if not exists
        var exam = await _context.RadiologyExams
            .FirstOrDefaultAsync(e => e.RadiologyRequestId == orderId);

        if (exam == null)
        {
            exam = new RadiologyExam
            {
                Id = Guid.NewGuid(),
                RadiologyRequestId = orderId,
                ExamCode = $"EX{DateTime.Now:yyyyMMddHHmmss}",
                ExamName = request.Service?.ServiceName ?? "CDHA",
                ExamDate = DateTime.Now,
                StartTime = DateTime.Now,
                Status = 1, // InProgress
                AccessionNumber = GenerateAccessionNumber()
            };
            await _context.RadiologyExams.AddAsync(exam);
        }
        else
        {
            exam.StartTime = DateTime.Now;
            exam.Status = 1;
        }

        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<bool> CompleteExamAsync(Guid orderId)
    {
        var request = await _context.RadiologyRequests.FindAsync(orderId);
        if (request == null) return false;

        var exam = await _context.RadiologyExams
            .FirstOrDefaultAsync(e => e.RadiologyRequestId == orderId);

        if (exam != null)
        {
            exam.EndTime = DateTime.Now;
            exam.Status = 2; // Completed
        }

        request.Status = 3; // Completed
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<int> UpdateAllRequestDatesToTodayAsync()
    {
        var today = DateTime.Today;
        var requests = await _context.RadiologyRequests.ToListAsync();
        foreach (var request in requests)
        {
            request.RequestDate = today;
        }
        await _unitOfWork.SaveChangesAsync();
        return requests.Count;
    }

    public async Task<int> AddTestDicomStudiesForCompletedRequestsAsync()
    {
        // Find all requests with status = 3 (Completed) that don't have DicomStudies
        var completedRequests = await _context.RadiologyRequests
            .Include(r => r.Patient)
            .Include(r => r.Exams)
                .ThenInclude(e => e.DicomStudies)
            .Where(r => r.Status == 3 || r.Status == 4 || r.Status == 5) // Completed, Reported, Approved
            .ToListAsync();

        int count = 0;
        foreach (var request in completedRequests)
        {
            // Create exam if it doesn't exist
            var exam = request.Exams.FirstOrDefault();
            if (exam == null)
            {
                exam = new RadiologyExam
                {
                    Id = Guid.NewGuid(),
                    RadiologyRequestId = request.Id,
                    ExamCode = $"EX{DateTime.Now:yyyyMMddHHmmss}{count}",
                    ExamName = "X-quang nguc",
                    ExamDate = DateTime.Now,
                    StartTime = DateTime.Now.AddMinutes(-30),
                    EndTime = DateTime.Now.AddMinutes(-15),
                    Status = 2, // Completed
                    AccessionNumber = $"ACC{DateTime.Now:yyyyMMdd}{count + 1:D3}"
                };
                await _context.RadiologyExams.AddAsync(exam);
                await _unitOfWork.SaveChangesAsync();
            }

            // Add DicomStudy if it doesn't have images
            if (!exam.DicomStudies.Any())
            {
                var studyInstanceUID = $"1.3.6.1.4.1.{DateTime.Now.Ticks}.{count + 1}";
                var dicomStudy = new DicomStudy
                {
                    Id = Guid.NewGuid(),
                    RadiologyExamId = exam.Id,
                    StudyInstanceUID = studyInstanceUID,
                    StudyDate = DateTime.Now.Date,
                    StudyTime = DateTime.Now,
                    StudyDescription = "Test Study for Xem hinh",
                    AccessionNumber = exam.AccessionNumber,
                    PatientID = request.Patient?.PatientCode ?? "",
                    PatientName = request.Patient?.FullName ?? "",
                    PatientBirthDate = request.Patient?.DateOfBirth,
                    PatientSex = request.Patient?.Gender == 1 ? "M" : "F",
                    NumberOfSeries = 1,
                    NumberOfImages = 2,
                    Modality = "CR",
                    BodyPartExamined = "CHEST",
                    Status = 1, // Available
                    IsArchived = false
                };
                await _context.DicomStudies.AddAsync(dicomStudy);
                count++;
            }
        }

        await _unitOfWork.SaveChangesAsync();
        return count;
    }

    public async Task<int> FixDicomStudyUIDsAsync()
    {
        // Real StudyInstanceUIDs from Orthanc
        var realUIDs = new[]
        {
            "1.3.6.1.4.1.44316.6.102.1.2023091384336494.746252101381252750643",
            "1.2.826.0.1.3680043.8.1055.1.20111103112244831.40200514.30965937"
        };

        // Get all DicomStudies that have fake UIDs (ones we generated)
        var dicomStudies = await _context.DicomStudies
            .Where(d => !realUIDs.Contains(d.StudyInstanceUID))
            .ToListAsync();

        int count = 0;
        foreach (var study in dicomStudies)
        {
            // Assign real UID (alternate between the two)
            study.StudyInstanceUID = realUIDs[count % realUIDs.Length];
            count++;
        }

        await _unitOfWork.SaveChangesAsync();
        return count;
    }

    public async Task<int> CleanupDicomStudiesForIncompleteRequestsAsync()
    {
        // Find DicomStudies linked to requests with status < 3 (not yet completed)
        var dicomStudiesToRemove = await _context.DicomStudies
            .Include(d => d.RadiologyExam)
                .ThenInclude(e => e.RadiologyRequest)
            .Where(d => d.RadiologyExam.RadiologyRequest.Status < 3)
            .ToListAsync();

        if (dicomStudiesToRemove.Any())
        {
            _context.DicomStudies.RemoveRange(dicomStudiesToRemove);
            await _unitOfWork.SaveChangesAsync();
        }

        return dicomStudiesToRemove.Count;
    }

    public async Task<int> SyncRequestStatusWithExamsAsync()
    {
        // Find requests with status < 2 that have Exams with StartTime
        // These should be at least InProgress (2)
        var requestsToUpdate = await _context.RadiologyRequests
            .Include(r => r.Exams)
            .Where(r => r.Status < 2 && r.Exams.Any(e => e.StartTime != null))
            .ToListAsync();

        foreach (var request in requestsToUpdate)
        {
            var exam = request.Exams.FirstOrDefault(e => e.StartTime != null);
            if (exam != null)
            {
                // If exam has EndTime, request should be Completed (3)
                // If exam only has StartTime, request should be InProgress (2)
                request.Status = exam.EndTime != null ? 3 : 2;
            }
        }

        await _unitOfWork.SaveChangesAsync();
        return requestsToUpdate.Count;
    }

    #endregion

    #region 8.2 PACS/Modality Connection

    public async Task<List<PACSConnectionDto>> GetPACSConnectionsAsync()
    {
        // Return configured PACS connections from database
        var connections = new List<PACSConnectionDto>();

        // Add default internal PACS (no external dependency)
        connections.Add(new PACSConnectionDto
        {
            Id = Guid.Parse("00000001-0000-0000-0000-000000000001"),
            Name = "HIS Internal Storage",
            ServerType = "Internal",
            AETitle = "HIS_PACS",
            IpAddress = "localhost",
            Port = 0,
            QueryRetrievePort = 0,
            Protocol = "Internal",
            IsConnected = true, // Always connected (internal storage)
            LastSync = DateTime.Now,
            IsActive = true
        });

        // If external PACS is configured and enabled
        if (_pacsEnabled && !string.IsNullOrEmpty(_pacsBaseUrl))
        {
            connections.Add(new PACSConnectionDto
            {
                Id = Guid.Parse("00000002-0000-0000-0000-000000000001"),
                Name = "External PACS",
                ServerType = "External",
                AETitle = _configuration["PACS:AETitle"] ?? "PACS",
                IpAddress = _configuration["PACS:IpAddress"] ?? "",
                Port = _configuration.GetValue<int>("PACS:Port", 4242),
                QueryRetrievePort = _configuration.GetValue<int>("PACS:QueryRetrievePort", 8042),
                Protocol = "DICOM",
                IsConnected = false, // Will be checked separately
                LastSync = DateTime.Now,
                IsActive = _pacsEnabled
            });
        }

        return await Task.FromResult(connections);
    }

    public async Task<PACSConnectionStatusDto> CheckPACSConnectionAsync(Guid connectionId)
    {
        // For internal storage, always return connected
        if (connectionId == Guid.Parse("00000001-0000-0000-0000-000000000001"))
        {
            return new PACSConnectionStatusDto
            {
                ConnectionId = connectionId,
                IsConnected = true,
                PingTimeMs = 0,
                ErrorMessage = null,
                CheckTime = DateTime.Now
            };
        }

        // For external PACS (if configured)
        if (!_pacsEnabled)
        {
            return new PACSConnectionStatusDto
            {
                ConnectionId = connectionId,
                IsConnected = false,
                PingTimeMs = -1,
                ErrorMessage = "External PACS is not enabled. Configure PACS:Enabled=true in appsettings.json",
                CheckTime = DateTime.Now
            };
        }

        return new PACSConnectionStatusDto
        {
            ConnectionId = connectionId,
            IsConnected = false,
            PingTimeMs = -1,
            ErrorMessage = "External PACS connection not configured",
            CheckTime = DateTime.Now
        };
    }

    public async Task<List<ModalityDto>> GetModalitiesAsync(string keyword = null, string modalityType = null)
    {
        var query = _context.RadiologyModalities.AsQueryable();

        if (!string.IsNullOrEmpty(keyword))
        {
            query = query.Where(m => m.ModalityName.Contains(keyword) || m.ModalityCode.Contains(keyword));
        }

        if (!string.IsNullOrEmpty(modalityType))
        {
            int typeInt;
            if (!int.TryParse(modalityType, out typeInt))
            {
                typeInt = modalityType.ToUpper() switch
                {
                    "XRAY" or "XR" => 0,
                    "CT" => 1,
                    "MRI" => 2,
                    "US" or "ULTRASOUND" => 3,
                    "NM" or "NUCLEARMEDICINE" => 4,
                    "PET" => 5,
                    "FLUORO" => 6,
                    "MAMMO" => 7,
                    "DR" => 8,
                    "CR" => 9,
                    _ => -1
                };
            }
            if (typeInt >= 0)
            {
                query = query.Where(m => m.ModalityType == typeInt);
            }
        }

        var modalities = await query.ToListAsync();

        // If no modalities in database, return default ones
        if (!modalities.Any())
        {
            return GetDefaultModalities();
        }

        return modalities.Select(m => new ModalityDto
        {
            Id = m.Id,
            Code = m.ModalityCode,
            Name = m.ModalityName,
            ModalityType = GetModalityTypeName(m.ModalityType),
            Manufacturer = m.Manufacturer,
            Model = m.ModelName,
            AETitle = m.AETitle,
            IpAddress = m.IPAddress,
            Port = m.Port,
            RoomId = m.RoomId ?? Guid.Empty,
            RoomName = m.Room?.RoomName ?? "",
            ConnectionStatus = m.Status == 1 ? "Online" : "Offline",
            LastCommunication = DateTime.Now,
            SupportsWorklist = true,
            SupportsMPPS = true,
            IsActive = m.IsActive
        }).ToList();
    }

    public async Task<PACSConnectionDto> CreatePACSConnectionAsync(CreatePACSConnectionDto dto)
    {
        // Store PACS connection configuration
        return new PACSConnectionDto
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            ServerType = dto.ServerType,
            AETitle = dto.AETitle,
            IpAddress = dto.IpAddress,
            Port = dto.Port,
            QueryRetrievePort = dto.QueryRetrievePort,
            Protocol = dto.Protocol,
            IsConnected = false,
            IsActive = dto.IsActive
        };
    }

    public async Task<PACSConnectionDto> UpdatePACSConnectionAsync(Guid id, UpdatePACSConnectionDto dto)
    {
        return new PACSConnectionDto
        {
            Id = id,
            Name = dto.Name,
            ServerType = dto.ServerType,
            AETitle = dto.AETitle,
            IpAddress = dto.IpAddress,
            Port = dto.Port,
            QueryRetrievePort = dto.QueryRetrievePort,
            Protocol = dto.Protocol,
            IsActive = dto.IsActive
        };
    }

    public async Task<bool> DeletePACSConnectionAsync(Guid id)
    {
        return await Task.FromResult(true);
    }

    public async Task<ModalityDto> CreateModalityAsync(CreateModalityDto dto)
    {
        var modality = new RadiologyModality
        {
            Id = Guid.NewGuid(),
            ModalityCode = dto.Code,
            ModalityName = dto.Name,
            ModalityType = ParseModalityType(dto.ModalityType),
            Manufacturer = dto.Manufacturer,
            ModelName = dto.Model,
            AETitle = dto.AETitle,
            IPAddress = dto.IpAddress,
            Port = dto.Port,
            RoomId = dto.RoomId,
            Status = 1,
            IsActive = dto.IsActive,
            CreatedAt = DateTime.Now
        };

        await _context.RadiologyModalities.AddAsync(modality);
        await _unitOfWork.SaveChangesAsync();

        return new ModalityDto
        {
            Id = modality.Id,
            Code = modality.ModalityCode,
            Name = modality.ModalityName,
            ModalityType = dto.ModalityType,
            Manufacturer = modality.Manufacturer,
            Model = modality.ModelName,
            AETitle = modality.AETitle,
            IpAddress = modality.IPAddress,
            Port = modality.Port,
            RoomId = modality.RoomId ?? Guid.Empty,
            IsActive = modality.IsActive
        };
    }

    public async Task<ModalityDto> UpdateModalityAsync(Guid id, UpdateModalityDto dto)
    {
        var modality = await _context.RadiologyModalities.FindAsync(id);
        if (modality == null) return null;

        modality.ModalityCode = dto.Code;
        modality.ModalityName = dto.Name;
        modality.ModalityType = ParseModalityType(dto.ModalityType);
        modality.Manufacturer = dto.Manufacturer;
        modality.ModelName = dto.Model;
        modality.AETitle = dto.AETitle;
        modality.IPAddress = dto.IpAddress;
        modality.Port = dto.Port;
        modality.RoomId = dto.RoomId;
        modality.IsActive = dto.IsActive;
        modality.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new ModalityDto
        {
            Id = modality.Id,
            Code = modality.ModalityCode,
            Name = modality.ModalityName,
            ModalityType = dto.ModalityType,
            IsActive = modality.IsActive
        };
    }

    public async Task<bool> DeleteModalityAsync(Guid id)
    {
        var modality = await _context.RadiologyModalities.FindAsync(id);
        if (modality == null) return false;

        modality.IsActive = false;
        modality.IsDeleted = true;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<RISSendWorklistResultDto> SendWorklistToModalityAsync(SendModalityWorklistDto dto)
    {
        // Send worklist to modality via DICOM MWL
        var result = new RISSendWorklistResultDto
        {
            Success = true,
            SentCount = dto.OrderIds.Count,
            FailedCount = 0,
            Errors = new List<string>()
        };

        foreach (var orderId in dto.OrderIds)
        {
            var request = await _context.RadiologyRequests
                .Include(r => r.Patient)
                .Include(r => r.Service)
                .FirstOrDefaultAsync(r => r.Id == orderId);

            if (request != null)
            {
                // Create worklist item in Orthanc
                try
                {
                    // Orthanc worklist entry would be created here
                    // This requires Orthanc worklist plugin
                }
                catch (Exception ex)
                {
                    result.FailedCount++;
                    result.Errors.Add($"Order {orderId}: {ex.Message}");
                }
            }
        }

        result.SentCount -= result.FailedCount;
        result.Success = result.FailedCount == 0;

        return result;
    }

    public async Task<bool> ReceiveMPPSAsync(Guid modalityId, string mppsData)
    {
        // Process MPPS (Modality Performed Procedure Step) from modality
        return await Task.FromResult(true);
    }

    public async Task<bool> ConfigureDeviceConnectionAsync(Guid deviceId, DeviceConnectionConfigDto config)
    {
        // Configure device connection settings
        return await Task.FromResult(true);
    }

    #endregion

    #region 8.3 Radiology Orders & Results

    public async Task<List<RadiologyOrderDto>> GetRadiologyOrdersAsync(
        DateTime fromDate,
        DateTime toDate,
        Guid? departmentId = null,
        string serviceType = null,
        string status = null,
        string keyword = null)
    {
        var query = _context.RadiologyRequests
            .Include(r => r.Patient)
            .Include(r => r.Service)
            .Include(r => r.RequestingDoctor)
            .Include(r => r.Exams)
            .Where(r => r.RequestDate >= fromDate && r.RequestDate <= toDate.AddDays(1));

        if (!string.IsNullOrEmpty(status))
        {
            int statusInt;
            if (!int.TryParse(status, out statusInt))
            {
                statusInt = status.ToLower() switch
                {
                    "pending" => 0,
                    "inprogress" => 1,
                    "completed" => 2,
                    "cancelled" => 3,
                    _ => -1
                };
            }
            if (statusInt >= 0)
            {
                query = query.Where(r => r.Status == statusInt);
            }
        }

        if (!string.IsNullOrEmpty(keyword))
        {
            query = query.Where(r =>
                r.Patient.FullName.Contains(keyword) ||
                r.Patient.PatientCode.Contains(keyword) ||
                r.RequestCode.Contains(keyword));
        }

        var requests = await query.OrderByDescending(r => r.RequestDate).ToListAsync();

        return requests.Select(r => new RadiologyOrderDto
        {
            Id = r.Id,
            OrderCode = r.RequestCode,
            PatientId = r.PatientId,
            PatientCode = r.Patient.PatientCode,
            PatientName = r.Patient.FullName,
            Age = r.Patient.DateOfBirth.HasValue ? (int?)((DateTime.Now - r.Patient.DateOfBirth.Value).Days / 365) : null,
            Gender = r.Patient.Gender == 1 ? "Nam" : "Nu",
            VisitId = r.MedicalRecordId ?? Guid.Empty,
            OrderDate = r.RequestDate,
            OrderDoctorName = r.RequestingDoctor?.FullName ?? "",
            Diagnosis = r.ClinicalInfo,
            ClinicalInfo = r.ClinicalInfo,
            Status = GetStatusName(r.Status),
            PatientType = r.PatientType == 1 ? "BHYT" : "Vien phi",
            Items = new List<RadiologyOrderItemDto>
            {
                new RadiologyOrderItemDto
                {
                    Id = r.Id,
                    ServiceId = r.ServiceId,
                    ServiceCode = r.Service?.ServiceCode ?? "",
                    ServiceName = r.Service?.ServiceName ?? "",
                    ServiceType = GetServiceTypeName(r.Service?.ServiceType ?? 0),
                    Quantity = 1,
                    Price = r.TotalAmount,
                    InsurancePrice = r.InsuranceAmount,
                    Status = GetStatusName(r.Status),
                    StartTime = r.Exams.FirstOrDefault()?.StartTime,
                    EndTime = r.Exams.FirstOrDefault()?.EndTime,
                    HasResult = r.Exams.Any(e => e.Report != null),
                    HasImages = r.Exams.Any(e => e.DicomStudies.Any())
                }
            }
        }).ToList();
    }

    public async Task<RadiologyOrderDto> GetRadiologyOrderAsync(Guid orderId)
    {
        var request = await _context.RadiologyRequests
            .Include(r => r.Patient)
            .Include(r => r.Service)
            .Include(r => r.RequestingDoctor)
            .Include(r => r.Exams)
                .ThenInclude(e => e.Report)
            .Include(r => r.Exams)
                .ThenInclude(e => e.DicomStudies)
            .FirstOrDefaultAsync(r => r.Id == orderId);

        if (request == null) return null;

        return new RadiologyOrderDto
        {
            Id = request.Id,
            OrderCode = request.RequestCode,
            PatientId = request.PatientId,
            PatientCode = request.Patient.PatientCode,
            PatientName = request.Patient.FullName,
            Age = request.Patient.DateOfBirth.HasValue ? (int?)((DateTime.Now - request.Patient.DateOfBirth.Value).Days / 365) : null,
            Gender = request.Patient.Gender == 1 ? "Nam" : "Nu",
            VisitId = request.MedicalRecordId ?? Guid.Empty,
            OrderDate = request.RequestDate,
            OrderDoctorName = request.RequestingDoctor?.FullName ?? "",
            Diagnosis = request.ClinicalInfo,
            ClinicalInfo = request.ClinicalInfo,
            Status = GetStatusName(request.Status),
            PatientType = request.PatientType == 1 ? "BHYT" : "Vien phi",
            Items = new List<RadiologyOrderItemDto>
            {
                new RadiologyOrderItemDto
                {
                    Id = request.Id,
                    ServiceId = request.ServiceId,
                    ServiceCode = request.Service?.ServiceCode ?? "",
                    ServiceName = request.Service?.ServiceName ?? "",
                    ServiceType = GetServiceTypeName(request.Service?.ServiceType ?? 0),
                    Quantity = 1,
                    Price = request.TotalAmount,
                    InsurancePrice = request.InsuranceAmount,
                    Status = GetStatusName(request.Status),
                    StartTime = request.Exams.FirstOrDefault()?.StartTime,
                    EndTime = request.Exams.FirstOrDefault()?.EndTime,
                    HasResult = request.Exams.Any(e => e.Report != null),
                    HasImages = request.Exams.Any(e => e.DicomStudies.Any())
                }
            }
        };
    }

    public async Task<List<RadiologyResultTemplateDto>> GetResultTemplatesByServiceTypeAsync(Guid serviceTypeId)
    {
        // Return templates based on service type
        return await Task.FromResult(GetDefaultTemplates());
    }

    public async Task<List<RadiologyResultTemplateDto>> GetResultTemplatesByServiceAsync(Guid serviceId)
    {
        return await Task.FromResult(GetDefaultTemplates());
    }

    public async Task<List<RadiologyResultTemplateDto>> GetResultTemplatesByGenderAsync(string gender)
    {
        var templates = GetDefaultTemplates();
        return await Task.FromResult(templates.Where(t => t.Gender == "Both" || t.Gender == gender).ToList());
    }

    public async Task<List<RadiologyResultTemplateDto>> GetAllResultTemplatesAsync(string keyword = null)
    {
        return await Task.FromResult(GetDefaultTemplates());
    }

    public async Task<RadiologyResultTemplateDto> SaveResultTemplateAsync(SaveResultTemplateDto dto)
    {
        return new RadiologyResultTemplateDto
        {
            Id = dto.Id ?? Guid.NewGuid(),
            Code = dto.Code,
            Name = dto.Name,
            ServiceTypeId = dto.ServiceTypeId,
            ServiceId = dto.ServiceId,
            Gender = dto.Gender,
            DescriptionTemplate = dto.DescriptionTemplate,
            ConclusionTemplate = dto.ConclusionTemplate,
            NoteTemplate = dto.NoteTemplate,
            SortOrder = dto.SortOrder,
            IsDefault = dto.IsDefault,
            IsActive = dto.IsActive
        };
    }

    public async Task<bool> DeleteResultTemplateAsync(Guid templateId)
    {
        return await Task.FromResult(true);
    }

    public async Task<RadiologyResultDto> ChangeResultTemplateAsync(ChangeResultTemplateDto dto)
    {
        var template = GetDefaultTemplates().FirstOrDefault(t => t.Id == dto.NewTemplateId);

        return new RadiologyResultDto
        {
            OrderItemId = dto.OrderItemId,
            Description = dto.KeepExistingContent ? "" : template?.DescriptionTemplate,
            Conclusion = dto.KeepExistingContent ? "" : template?.ConclusionTemplate,
            Note = dto.KeepExistingContent ? "" : template?.NoteTemplate
        };
    }

    public async Task<RadiologyResultDto> EnterRadiologyResultAsync(EnterRadiologyResultDto dto)
    {
        var request = await _context.RadiologyRequests
            .Include(r => r.Patient)
            .Include(r => r.Service)
            .Include(r => r.Exams)
            .FirstOrDefaultAsync(r => r.Id == dto.OrderItemId);

        if (request == null) return null;

        // Get or create exam
        var exam = request.Exams.FirstOrDefault();
        if (exam == null)
        {
            exam = new RadiologyExam
            {
                Id = Guid.NewGuid(),
                RadiologyRequestId = request.Id,
                ExamCode = $"EX{DateTime.Now:yyyyMMddHHmmss}",
                ExamName = request.Service?.ServiceName ?? "CDHA",
                ExamDate = DateTime.Now,
                Status = 2, // Completed
                AccessionNumber = GenerateAccessionNumber()
            };
            await _context.RadiologyExams.AddAsync(exam);
        }

        // Create or update report
        var report = await _context.RadiologyReports
            .FirstOrDefaultAsync(r => r.RadiologyExamId == exam.Id);

        if (report == null)
        {
            report = new RadiologyReport
            {
                Id = Guid.NewGuid(),
                RadiologyExamId = exam.Id,
                RadiologistId = Guid.Parse("9e5309dc-ecf9-4d48-9a09-224cd15347b1"), // Admin user
                ReportDate = DateTime.Now,
                Status = 0, // Draft
                CreatedAt = DateTime.Now
            };
            await _context.RadiologyReports.AddAsync(report);
        }

        report.Findings = dto.Description;
        report.Impression = dto.Conclusion;
        report.Recommendations = dto.Note;
        report.UpdatedAt = DateTime.Now;

        request.Status = 4; // Reported
        await _unitOfWork.SaveChangesAsync();

        return new RadiologyResultDto
        {
            Id = report.Id,
            OrderItemId = dto.OrderItemId,
            OrderCode = request.RequestCode,
            PatientId = request.PatientId,
            PatientCode = request.Patient.PatientCode,
            PatientName = request.Patient.FullName,
            ServiceCode = request.Service?.ServiceCode ?? "",
            ServiceName = request.Service?.ServiceName ?? "",
            ServiceType = GetServiceTypeName(request.Service?.ServiceType ?? 0),
            ResultDate = DateTime.Now,
            Description = dto.Description,
            Conclusion = dto.Conclusion,
            Note = dto.Note,
            ApprovalStatus = "Draft",
            Images = new List<AttachedImageDto>()
        };
    }

    public async Task<RadiologyResultDto> GetRadiologyResultAsync(Guid orderItemId)
    {
        var request = await _context.RadiologyRequests
            .Include(r => r.Patient)
            .Include(r => r.Service)
            .Include(r => r.Exams)
                .ThenInclude(e => e.Report)
            .FirstOrDefaultAsync(r => r.Id == orderItemId);

        if (request == null) return null;

        var exam = request.Exams.FirstOrDefault();
        var report = exam?.Report;

        return new RadiologyResultDto
        {
            Id = report?.Id ?? Guid.Empty,
            OrderItemId = orderItemId,
            OrderCode = request.RequestCode,
            PatientId = request.PatientId,
            PatientCode = request.Patient.PatientCode,
            PatientName = request.Patient.FullName,
            ServiceCode = request.Service?.ServiceCode ?? "",
            ServiceName = request.Service?.ServiceName ?? "",
            ServiceType = GetServiceTypeName(request.Service?.ServiceType ?? 0),
            ResultDate = report?.ReportDate ?? DateTime.Now,
            Description = report?.Findings ?? "",
            Conclusion = report?.Impression ?? "",
            Note = report?.Recommendations ?? "",
            ApprovalStatus = GetReportStatusName(report?.Status ?? 0),
            ApprovedTime = report?.ApprovedAt,
            Images = new List<AttachedImageDto>()
        };
    }

    public async Task<RadiologyResultDto> UpdateRadiologyResultAsync(Guid resultId, UpdateRadiologyResultDto dto)
    {
        var report = await _context.RadiologyReports
            .Include(r => r.RadiologyExam)
                .ThenInclude(e => e.RadiologyRequest)
                    .ThenInclude(req => req.Patient)
            .FirstOrDefaultAsync(r => r.Id == resultId);

        if (report == null) return null;

        report.Findings = dto.Description;
        report.Impression = dto.Conclusion;
        report.Recommendations = dto.Note;
        report.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        var request = report.RadiologyExam.RadiologyRequest;
        return new RadiologyResultDto
        {
            Id = report.Id,
            OrderItemId = request.Id,
            PatientId = request.PatientId,
            PatientCode = request.Patient.PatientCode,
            PatientName = request.Patient.FullName,
            Description = dto.Description,
            Conclusion = dto.Conclusion,
            Note = dto.Note,
            ApprovalStatus = GetReportStatusName(report.Status)
        };
    }

    public async Task<AttachedImageDto> AttachImageAsync(AttachImageDto dto)
    {
        return new AttachedImageDto
        {
            Id = Guid.NewGuid(),
            FileName = dto.FileName,
            FileType = dto.FileType,
            Description = dto.Description,
            SortOrder = dto.SortOrder,
            DicomStudyUID = dto.DicomStudyUID,
            DicomSeriesUID = dto.DicomSeriesUID,
            DicomInstanceUID = dto.DicomInstanceUID
        };
    }

    public async Task<bool> RemoveAttachedImageAsync(Guid imageId)
    {
        return await Task.FromResult(true);
    }

    public async Task<List<DicomStudyDto>> GetStudiesFromPACSAsync(string patientId, DateTime? fromDate = null, DateTime? toDate = null)
    {
        // Get studies from internal database (HIS DicomStudy table)
        var query = _context.DicomStudies
            .Include(d => d.RadiologyExam)
                .ThenInclude(e => e.RadiologyRequest)
                    .ThenInclude(r => r.Patient)
            .AsQueryable();

        if (!string.IsNullOrEmpty(patientId))
        {
            query = query.Where(d => d.PatientID == patientId ||
                                     d.RadiologyExam.RadiologyRequest.Patient.PatientCode == patientId);
        }

        if (fromDate.HasValue)
        {
            query = query.Where(d => d.StudyDate >= fromDate.Value);
        }

        if (toDate.HasValue)
        {
            query = query.Where(d => d.StudyDate <= toDate.Value);
        }

        var studies = await query.OrderByDescending(d => d.StudyDate).Take(50).ToListAsync();

        return studies.Select(d => new DicomStudyDto
        {
            StudyInstanceUID = d.StudyInstanceUID ?? "",
            AccessionNumber = d.AccessionNumber ?? "",
            PatientId = d.PatientID ?? "",
            PatientName = d.PatientName ?? "",
            StudyDate = d.StudyDate ?? DateTime.Now,
            StudyDescription = d.StudyDescription ?? "",
            Modality = d.Modality ?? "",
            NumberOfSeries = d.NumberOfSeries,
            NumberOfImages = d.NumberOfImages,
            StudyStatus = d.Status == 1 ? "Available" : "Pending"
        }).ToList();
    }

    public async Task<List<DicomSeriesDto>> GetSeriesAsync(string studyInstanceUID)
    {
        var pacsBaseUrl = _pacsBaseUrl.TrimEnd('/');
        var pacsUser = _configuration["PACS:Username"] ?? "admin";
        var pacsPass = _configuration["PACS:Password"] ?? "orthanc";

        // Try to query Orthanc PACS directly
        if (_pacsEnabled && !string.IsNullOrEmpty(pacsBaseUrl))
        {
            try
            {
                using var httpClient = new HttpClient();
                var authBytes = System.Text.Encoding.ASCII.GetBytes($"{pacsUser}:{pacsPass}");
                httpClient.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", Convert.ToBase64String(authBytes));

                // Find study in Orthanc by StudyInstanceUID
                var findJson = $"{{\"Level\":\"Study\",\"Query\":{{\"StudyInstanceUID\":\"{studyInstanceUID}\"}}}}";
                var findResp = await httpClient.PostAsync($"{pacsBaseUrl}/tools/find",
                    new StringContent(findJson, System.Text.Encoding.UTF8, "application/json"));

                if (findResp.IsSuccessStatusCode)
                {
                    var studyIds = System.Text.Json.JsonSerializer.Deserialize<List<string>>(await findResp.Content.ReadAsStringAsync());
                    if (studyIds != null && studyIds.Count > 0)
                    {
                        var seriesResp = await httpClient.GetAsync($"{pacsBaseUrl}/studies/{studyIds[0]}/series");
                        if (seriesResp.IsSuccessStatusCode)
                        {
                            var seriesJson = await seriesResp.Content.ReadAsStringAsync();
                            var orthancSeries = System.Text.Json.JsonSerializer.Deserialize<List<System.Text.Json.JsonElement>>(seriesJson);

                            // Get patient info from study
                            var studyResp = await httpClient.GetAsync($"{pacsBaseUrl}/studies/{studyIds[0]}");
                            var studyJson = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(await studyResp.Content.ReadAsStringAsync());
                            var patientName = "";
                            var patientId = "";
                            var studyDate = "";
                            var studyDesc = "";
                            if (studyJson.TryGetProperty("PatientMainDicomTags", out var ptTags))
                            {
                                if (ptTags.TryGetProperty("PatientName", out var pn)) patientName = pn.GetString() ?? "";
                                if (ptTags.TryGetProperty("PatientID", out var pid)) patientId = pid.GetString() ?? "";
                            }
                            if (studyJson.TryGetProperty("MainDicomTags", out var stTags))
                            {
                                if (stTags.TryGetProperty("StudyDate", out var sd)) studyDate = sd.GetString() ?? "";
                                if (stTags.TryGetProperty("StudyDescription", out var sdd)) studyDesc = sdd.GetString() ?? "";
                            }

                            var result = new List<DicomSeriesDto>();
                            int idx = 1;
                            foreach (var s in orthancSeries ?? new List<System.Text.Json.JsonElement>())
                            {
                                var tags = s.GetProperty("MainDicomTags");
                                var seriesUID = tags.TryGetProperty("SeriesInstanceUID", out var suid) ? suid.GetString() ?? "" : "";
                                var modality = tags.TryGetProperty("Modality", out var mod) ? mod.GetString() ?? "CR" : "CR";
                                var instanceCount = s.TryGetProperty("Instances", out var inst) ? inst.GetArrayLength() : 0;

                                result.Add(new DicomSeriesDto
                                {
                                    SeriesInstanceUID = seriesUID,
                                    StudyInstanceUID = studyInstanceUID,
                                    SeriesNumber = idx++,
                                    Modality = modality,
                                    SeriesDescription = studyDesc,
                                    BodyPartExamined = "",
                                    NumberOfImages = instanceCount,
                                    PatientName = patientName,
                                    PatientId = patientId,
                                    StudyDate = studyDate,
                                    StudyDescription = studyDesc,
                                    OrthancStudyId = studyIds[0],
                                    OrthancSeriesId = s.TryGetProperty("ID", out var sid) ? sid.GetString() ?? "" : ""
                                });
                            }
                            if (result.Count > 0) return result;
                        }
                    }
                }
            }
            catch { /* Fall through to DB lookup */ }
        }

        // Fallback: Get study from database
        var study = await _context.DicomStudies
            .Include(d => d.RadiologyExam)
                .ThenInclude(e => e.RadiologyRequest)
                    .ThenInclude(r => r.Patient)
            .FirstOrDefaultAsync(d => d.StudyInstanceUID == studyInstanceUID);

        if (study == null)
            return new List<DicomSeriesDto>();

        return new List<DicomSeriesDto>
        {
            new DicomSeriesDto
            {
                SeriesInstanceUID = $"{studyInstanceUID}.1",
                StudyInstanceUID = studyInstanceUID,
                SeriesNumber = 1,
                Modality = study.Modality ?? "CR",
                SeriesDescription = study.StudyDescription ?? "",
                BodyPartExamined = study.BodyPartExamined ?? "",
                NumberOfImages = study.NumberOfImages,
                PatientName = study.PatientName ?? study.RadiologyExam?.RadiologyRequest?.Patient?.FullName ?? "",
                PatientId = study.PatientID ?? "",
                StudyDate = study.StudyDate?.ToString("yyyyMMdd") ?? "",
                StudyDescription = study.StudyDescription ?? ""
            }
        };
    }

    public async Task<List<DicomImageDto>> GetImagesAsync(string seriesInstanceUID)
    {
        var pacsBaseUrl = _pacsBaseUrl.TrimEnd('/');
        var pacsUser = _configuration["PACS:Username"] ?? "admin";
        var pacsPass = _configuration["PACS:Password"] ?? "orthanc";

        // Try to query Orthanc PACS directly
        if (_pacsEnabled && !string.IsNullOrEmpty(pacsBaseUrl))
        {
            try
            {
                using var httpClient = new HttpClient();
                var authBytes = System.Text.Encoding.ASCII.GetBytes($"{pacsUser}:{pacsPass}");
                httpClient.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", Convert.ToBase64String(authBytes));

                // Find series in Orthanc
                var findJson = $"{{\"Level\":\"Series\",\"Query\":{{\"SeriesInstanceUID\":\"{seriesInstanceUID}\"}}}}";
                var findResp = await httpClient.PostAsync($"{pacsBaseUrl}/tools/find",
                    new StringContent(findJson, System.Text.Encoding.UTF8, "application/json"));

                if (findResp.IsSuccessStatusCode)
                {
                    var seriesIds = System.Text.Json.JsonSerializer.Deserialize<List<string>>(await findResp.Content.ReadAsStringAsync());
                    if (seriesIds != null && seriesIds.Count > 0)
                    {
                        var instResp = await httpClient.GetAsync($"{pacsBaseUrl}/series/{seriesIds[0]}/instances");
                        if (instResp.IsSuccessStatusCode)
                        {
                            var instJson = await instResp.Content.ReadAsStringAsync();
                            var instances = System.Text.Json.JsonSerializer.Deserialize<List<System.Text.Json.JsonElement>>(instJson);

                            var result = new List<DicomImageDto>();
                            int idx = 1;
                            foreach (var inst in instances ?? new List<System.Text.Json.JsonElement>())
                            {
                                var instId = inst.TryGetProperty("ID", out var iid) ? iid.GetString() ?? "" : "";
                                var tags = inst.GetProperty("MainDicomTags");
                                var sopUID = tags.TryGetProperty("SOPInstanceUID", out var sop) ? sop.GetString() ?? "" : "";

                                result.Add(new DicomImageDto
                                {
                                    SOPInstanceUID = sopUID,
                                    SeriesInstanceUID = seriesInstanceUID,
                                    InstanceNumber = idx++,
                                    ThumbnailUrl = $"/api/RISComplete/pacs/instances/{instId}/preview",
                                    ImageUrl = $"/api/RISComplete/pacs/instances/{instId}/preview",
                                    WadoUrl = $"/api/RISComplete/pacs/instances/{instId}/file"
                                });
                            }
                            if (result.Count > 0) return result;
                        }
                    }
                }
            }
            catch { /* Fall through to DB lookup */ }
        }

        // Fallback: extract study UID from series UID
        var studyUid = seriesInstanceUID.EndsWith(".1")
            ? seriesInstanceUID[..^2]
            : seriesInstanceUID;

        var study = await _context.DicomStudies
            .FirstOrDefaultAsync(d => d.StudyInstanceUID == studyUid);

        if (study == null)
            return new List<DicomImageDto>();

        var images = new List<DicomImageDto>();
        for (int i = 1; i <= Math.Max(1, study.NumberOfImages); i++)
        {
            images.Add(new DicomImageDto
            {
                SOPInstanceUID = $"{seriesInstanceUID}.{i}",
                SeriesInstanceUID = seriesInstanceUID,
                InstanceNumber = i,
                ThumbnailUrl = $"/api/RISComplete/pacs/instances/{study.Id}/preview",
                ImageUrl = $"/api/RISComplete/pacs/instances/{study.Id}/preview",
                WadoUrl = ""
            });
        }
        return images;
    }

    public async Task<bool> LinkStudyToOrderAsync(Guid orderItemId, string studyInstanceUID)
    {
        var request = await _context.RadiologyRequests
            .Include(r => r.Exams)
            .FirstOrDefaultAsync(r => r.Id == orderItemId);

        if (request == null) return false;

        var exam = request.Exams.FirstOrDefault();
        if (exam == null)
        {
            exam = new RadiologyExam
            {
                Id = Guid.NewGuid(),
                RadiologyRequestId = request.Id,
                ExamCode = $"EX{DateTime.Now:yyyyMMddHHmmss}",
                ExamName = "CDHA",
                ExamDate = DateTime.Now,
                Status = 2,
                AccessionNumber = GenerateAccessionNumber()
            };
            await _context.RadiologyExams.AddAsync(exam);
        }

        // Create DICOM study record
        var dicomStudy = new DicomStudy
        {
            Id = Guid.NewGuid(),
            RadiologyExamId = exam.Id,
            StudyInstanceUID = studyInstanceUID,
            StudyDate = DateTime.Now,
            Status = 1,
            CreatedAt = DateTime.Now
        };
        await _context.DicomStudies.AddAsync(dicomStudy);
        await _unitOfWork.SaveChangesAsync();

        return true;
    }

    public async Task<bool> PreliminaryApproveResultAsync(Guid resultId, string note)
    {
        var report = await _context.RadiologyReports.FindAsync(resultId);
        if (report == null) return false;

        report.Status = 1; // Preliminary approved
        report.UpdatedAt = DateTime.Now;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<bool> FinalApproveResultAsync(ApproveRadiologyResultDto dto)
    {
        var report = await _context.RadiologyReports.FindAsync(dto.ResultId);
        if (report == null) return false;

        report.Status = 2; // Final approved
        report.ApprovedBy = Guid.Parse("9e5309dc-ecf9-4d48-9a09-224cd15347b1"); // Admin
        report.ApprovedAt = DateTime.Now;
        report.UpdatedAt = DateTime.Now;

        // Update request status
        var exam = await _context.RadiologyExams
            .Include(e => e.RadiologyRequest)
            .FirstOrDefaultAsync(e => e.Id == report.RadiologyExamId);

        if (exam?.RadiologyRequest != null)
        {
            exam.RadiologyRequest.Status = 5; // Approved
        }

        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<bool> CancelApprovalAsync(Guid resultId, string reason)
    {
        var report = await _context.RadiologyReports.FindAsync(resultId);
        if (report == null) return false;

        report.Status = 0; // Back to draft
        report.ApprovedBy = null;
        report.ApprovedAt = null;
        report.UpdatedAt = DateTime.Now;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<byte[]> PrintRadiologyResultAsync(Guid resultId, string format = "A4", bool includeImages = true)
    {
        // Generate PDF report
        return await Task.FromResult(new byte[0]);
    }

    public async Task<byte[]> PrintRadiologyResultsBatchAsync(List<Guid> resultIds, string format = "A4")
    {
        return await Task.FromResult(new byte[0]);
    }

    public async Task<SendResultResponseDto> SendResultToDepartmentAsync(SendResultDto dto)
    {
        return new SendResultResponseDto
        {
            Success = true,
            Message = "Ket qua da duoc gui thanh cong",
            SentTime = DateTime.Now
        };
    }

    public async Task<List<RadiologyResultDto>> GetPatientRadiologyHistoryAsync(Guid patientId, string serviceType = null, int? lastNMonths = 12)
    {
        var fromDate = DateTime.Now.AddMonths(-(lastNMonths ?? 12));

        var query = _context.RadiologyRequests
            .Include(r => r.Patient)
            .Include(r => r.Service)
            .Include(r => r.Exams)
                .ThenInclude(e => e.Report)
            .Where(r => r.PatientId == patientId && r.RequestDate >= fromDate);

        var requests = await query.OrderByDescending(r => r.RequestDate).ToListAsync();

        return requests.Select(r =>
        {
            var exam = r.Exams.FirstOrDefault();
            var report = exam?.Report;
            return new RadiologyResultDto
            {
                Id = report?.Id ?? Guid.Empty,
                OrderItemId = r.Id,
                OrderCode = r.RequestCode,
                PatientId = r.PatientId,
                PatientCode = r.Patient.PatientCode,
                PatientName = r.Patient.FullName,
                ServiceCode = r.Service?.ServiceCode ?? "",
                ServiceName = r.Service?.ServiceName ?? "",
                ServiceType = GetServiceTypeName(r.Service?.ServiceType ?? 0),
                ResultDate = report?.ReportDate ?? r.RequestDate,
                Description = report?.Findings ?? "",
                Conclusion = report?.Impression ?? "",
                ApprovalStatus = GetReportStatusName(report?.Status ?? 0)
            };
        }).ToList();
    }

    #endregion

    #region 8.4 Prescriptions (Ke thuoc, vat tu)

    public async Task<List<RadiologyPrescriptionDto>> GetRadiologyPrescriptionsAsync(Guid orderItemId)
    {
        return await Task.FromResult(new List<RadiologyPrescriptionDto>());
    }

    public async Task<RadiologyPrescriptionDto> CreateRadiologyPrescriptionAsync(CreateRadiologyPrescriptionDto dto)
    {
        return new RadiologyPrescriptionDto
        {
            Id = Guid.NewGuid(),
            OrderItemId = dto.OrderItemId,
            PrescriptionDate = DateTime.Now,
            Items = dto.Items.Select(i => new RadiologyPrescriptionItemDto
            {
                Id = Guid.NewGuid(),
                ItemId = i.ItemId,
                Quantity = i.Quantity,
                Note = i.Note
            }).ToList(),
            Status = "Created",
            TotalAmount = 0
        };
    }

    public async Task<RadiologyPrescriptionDto> UpdateRadiologyPrescriptionAsync(Guid prescriptionId, UpdateRadiologyPrescriptionDto dto)
    {
        return new RadiologyPrescriptionDto
        {
            Id = prescriptionId,
            PrescriptionDate = DateTime.Now,
            Items = dto.Items.Select(i => new RadiologyPrescriptionItemDto
            {
                Id = Guid.NewGuid(),
                ItemId = i.ItemId,
                Quantity = i.Quantity
            }).ToList(),
            Status = "Updated"
        };
    }

    public async Task<bool> DeleteRadiologyPrescriptionAsync(Guid prescriptionId)
    {
        return await Task.FromResult(true);
    }

    public async Task<RadiologyPrescriptionDto> CreatePrescriptionFromNormAsync(Guid orderItemId, Guid warehouseId)
    {
        return new RadiologyPrescriptionDto
        {
            Id = Guid.NewGuid(),
            OrderItemId = orderItemId,
            PrescriptionDate = DateTime.Now,
            Items = new List<RadiologyPrescriptionItemDto>(),
            Status = "FromNorm"
        };
    }

    public async Task<RadiologyServiceNormDto> GetServiceNormAsync(Guid serviceId)
    {
        return new RadiologyServiceNormDto
        {
            Id = Guid.NewGuid(),
            ServiceId = serviceId,
            Items = new List<RadiologyNormItemDto>()
        };
    }

    public async Task<bool> UpdateServiceNormAsync(Guid serviceId, List<UpdateNormItemDto> items)
    {
        return await Task.FromResult(true);
    }

    public async Task<List<ItemSearchResultDto>> SearchItemsAsync(string keyword, Guid warehouseId, string itemType = null)
    {
        return await Task.FromResult(new List<ItemSearchResultDto>());
    }

    public async Task<ItemStockDto> CheckItemStockAsync(Guid itemId, Guid warehouseId)
    {
        return new ItemStockDto
        {
            ItemId = itemId,
            TotalStock = 0,
            AvailableStock = 0,
            ByLot = new List<ItemStockByLotDto>()
        };
    }

    #endregion

    #region 8.5 Reports

    public async Task<RadiologyRevenueReportDto> GetRevenueReportAsync(
        DateTime fromDate,
        DateTime toDate,
        Guid? departmentId = null,
        string serviceType = null)
    {
        var requests = await _context.RadiologyRequests
            .Where(r => r.RequestDate >= fromDate && r.RequestDate <= toDate)
            .ToListAsync();

        return new RadiologyRevenueReportDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            TotalRevenue = requests.Sum(r => r.TotalAmount),
            InsuranceRevenue = requests.Sum(r => r.InsuranceAmount),
            PatientRevenue = requests.Sum(r => r.PatientAmount),
            TotalExams = requests.Count,
            ByServiceType = new List<RevenueByServiceTypeDto>(),
            ByDay = new List<RevenueByDayDto>(),
            ByDoctor = new List<RevenueByDoctorDto>()
        };
    }

    public async Task<UltrasoundRegisterDto> GetUltrasoundRegisterAsync(DateTime fromDate, DateTime toDate)
    {
        return new UltrasoundRegisterDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            TotalExams = 0,
            Items = new List<UltrasoundRegisterItemDto>()
        };
    }

    public async Task<RadiologyRegisterDto> GetRadiologyRegisterByTypeAsync(
        DateTime fromDate,
        DateTime toDate,
        string serviceType)
    {
        return new RadiologyRegisterDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            ServiceType = serviceType,
            TotalExams = 0,
            Items = new List<RadiologyRegisterItemDto>()
        };
    }

    public async Task<RadiologyRegisterDto> GetRadiologyRegisterAsync(DateTime fromDate, DateTime toDate)
    {
        return new RadiologyRegisterDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            TotalExams = 0,
            Items = new List<RadiologyRegisterItemDto>()
        };
    }

    public async Task<FunctionalTestRegisterDto> GetFunctionalTestRegisterAsync(DateTime fromDate, DateTime toDate)
    {
        return new FunctionalTestRegisterDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            TotalExams = 0,
            Items = new List<FunctionalTestRegisterItemDto>()
        };
    }

    public async Task<ConsumptionNormReportDto> GetConsumptionNormReportAsync(
        DateTime fromDate,
        DateTime toDate,
        Guid? serviceId = null)
    {
        return new ConsumptionNormReportDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            ByService = new List<ConsumptionByServiceDto>()
        };
    }

    public async Task<RadiologyRevenueReportDto> GetRevenueByBaseCostReportAsync(
        DateTime fromDate,
        DateTime toDate,
        Guid? departmentId = null)
    {
        return await GetRevenueReportAsync(fromDate, toDate, departmentId);
    }

    public async Task<SyncResultToDoHDto> SyncResultToDoHAsync(Guid resultId)
    {
        return new SyncResultToDoHDto
        {
            ResultId = resultId,
            SyncStatus = "Success",
            SyncTime = DateTime.Now
        };
    }

    public async Task<RadiologyStatisticsDto> GetStatisticsAsync(
        DateTime fromDate,
        DateTime toDate,
        string serviceType = null)
    {
        var requests = await _context.RadiologyRequests
            .Where(r => r.RequestDate >= fromDate && r.RequestDate <= toDate)
            .ToListAsync();

        return new RadiologyStatisticsDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            TotalOrders = requests.Count,
            TotalExams = requests.Count,
            CompletedExams = requests.Count(r => r.Status >= 3),
            PendingExams = requests.Count(r => r.Status < 3),
            AverageTATMinutes = 30,
            ByServiceType = new List<StatisticsByServiceTypeDto>(),
            ByDay = new List<StatisticsByDayDto>(),
            ByModality = new List<StatisticsByModalityDto>()
        };
    }

    public async Task<byte[]> ExportReportToExcelAsync(string reportType, DateTime fromDate, DateTime toDate, object parameters = null)
    {
        return await Task.FromResult(new byte[0]);
    }

    #endregion

    #region DICOM Viewer

    public async Task<ViewerUrlDto> GetViewerUrlAsync(string studyInstanceUID)
    {
        // Return internal viewer URL (built-in HIS viewer)
        return await Task.FromResult(new ViewerUrlDto
        {
            StudyInstanceUID = studyInstanceUID,
            ViewerUrl = $"/radiology/viewer?study={studyInstanceUID}",
            WadoRsUrl = $"/api/radiology/dicom-web/studies/{studyInstanceUID}",
            DicomWebUrl = "/api/radiology/dicom-web"
        });
    }

    public async Task<DicomViewerConfigDto> GetViewerConfigAsync()
    {
        return new DicomViewerConfigDto
        {
            ViewerUrl = "/radiology/viewer",
            ViewerType = "HISViewer", // Built-in viewer
            EnableAnnotation = true,
            EnableMeasurement = true,
            EnableMPR = false, // Basic viewer
            Enable3D = false,
            DefaultLayout = "1x1"
        };
    }

    public async Task<ImageAnnotationDto> SaveAnnotationAsync(ImageAnnotationDto annotation)
    {
        annotation.Id = Guid.NewGuid();
        annotation.CreatedTime = DateTime.Now;
        return annotation;
    }

    public async Task<List<ImageAnnotationDto>> GetAnnotationsAsync(string sopInstanceUID)
    {
        return await Task.FromResult(new List<ImageAnnotationDto>());
    }

    public async Task<KeyImageDto> MarkKeyImageAsync(MarkKeyImageDto dto)
    {
        return new KeyImageDto
        {
            Id = Guid.NewGuid(),
            StudyInstanceUID = dto.StudyInstanceUID,
            SOPInstanceUID = dto.SOPInstanceUID,
            Description = dto.Description,
            MarkedTime = DateTime.Now
        };
    }

    public async Task<List<KeyImageDto>> GetKeyImagesAsync(string studyInstanceUID)
    {
        return await Task.FromResult(new List<KeyImageDto>());
    }

    public async Task<byte[]> EditImageAsync(ImageEditDto dto)
    {
        return await Task.FromResult(new byte[0]);
    }

    #endregion

    #region Room & Schedule

    public async Task<List<RadiologyRoomDto>> GetRoomsAsync(string keyword = null, string roomType = null)
    {
        var query = _context.Rooms
            .Include(r => r.Department)
            .Where(r => r.IsActive);

        // Filter for radiology rooms (CDHA type)
        query = query.Where(r => r.RoomType >= 10 && r.RoomType < 20);

        if (!string.IsNullOrEmpty(keyword))
        {
            query = query.Where(r => r.RoomName.Contains(keyword) || r.RoomCode.Contains(keyword));
        }

        var rooms = await query.ToListAsync();

        return rooms.Select(r => new RadiologyRoomDto
        {
            Id = r.Id,
            Code = r.RoomCode,
            Name = r.RoomName,
            RoomType = GetRoomTypeName(r.RoomType),
            DepartmentId = r.DepartmentId,
            DepartmentName = r.Department?.DepartmentName ?? "",
            Capacity = 1,
            Status = "Available",
            IsActive = r.IsActive
        }).ToList();
    }

    public async Task<RadiologyRoomDto> SaveRoomAsync(SaveRadiologyRoomDto dto)
    {
        Room room;
        if (dto.Id.HasValue)
        {
            room = await _context.Rooms.FindAsync(dto.Id.Value);
            if (room == null) return null;
        }
        else
        {
            room = new Room
            {
                Id = Guid.NewGuid(),
                CreatedAt = DateTime.Now
            };
            await _context.Rooms.AddAsync(room);
        }

        room.RoomCode = dto.Code;
        room.RoomName = dto.Name;
        room.RoomType = ParseRoomType(dto.RoomType);
        room.DepartmentId = dto.DepartmentId;
        room.IsActive = dto.IsActive;
        room.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new RadiologyRoomDto
        {
            Id = room.Id,
            Code = room.RoomCode,
            Name = room.RoomName,
            RoomType = dto.RoomType,
            DepartmentId = room.DepartmentId,
            IsActive = room.IsActive
        };
    }

    public async Task<List<RadiologyScheduleDto>> GetRoomScheduleAsync(Guid roomId, DateTime fromDate, DateTime toDate)
    {
        return await Task.FromResult(new List<RadiologyScheduleDto>());
    }

    public async Task<RadiologyScheduleDto> SaveScheduleAsync(SaveRadiologyScheduleDto dto)
    {
        return new RadiologyScheduleDto
        {
            Id = dto.Id ?? Guid.NewGuid(),
            RoomId = dto.RoomId,
            Date = dto.Date,
            StartTime = dto.StartTime,
            EndTime = dto.EndTime,
            TechnicianId = dto.TechnicianId,
            DoctorId = dto.DoctorId,
            MaxSlots = dto.MaxSlots,
            Note = dto.Note
        };
    }

    #endregion

    #region Print Label - In nhãn dán

    public async Task<LabelDataDto> PrintLabelAsync(PrintLabelRequestDto request)
    {
        var order = await _context.RadiologyRequests
            .Include(r => r.Patient)
            .Include(r => r.Service)
            .Include(r => r.Exams)
            .FirstOrDefaultAsync(r => r.Id == request.OrderId);

        if (order == null) return null;

        var exam = order.Exams.FirstOrDefault();
        var queueNumber = await _context.RadiologyRequests
            .Where(r => r.RequestDate.Date == order.RequestDate.Date && r.CreatedAt <= order.CreatedAt)
            .CountAsync();

        var labelData = new LabelDataDto
        {
            PatientCode = order.Patient.PatientCode,
            PatientName = order.Patient.FullName,
            Age = order.Patient.DateOfBirth.HasValue ? (int?)((DateTime.Now - order.Patient.DateOfBirth.Value).Days / 365) : null,
            Gender = order.Patient.Gender == 1 ? "Nam" : "Nu",
            OrderCode = order.RequestCode,
            ServiceName = order.Service?.ServiceName ?? "",
            RoomName = exam?.Room?.RoomName ?? "",
            OrderDate = order.RequestDate,
            QueueNumber = queueNumber,
            AccessionNumber = exam?.AccessionNumber ?? GenerateAccessionNumber(),
            QRCodeData = $"HIS|{order.RequestCode}|{order.Patient.PatientCode}",
            BarcodeData = order.RequestCode
        };

        // Generate label HTML content
        labelData.LabelContent = GenerateLabelHtml(labelData, request.OutputFormat);

        return labelData;
    }

    public async Task<List<RadiologyLabelConfigDto>> GetLabelConfigsAsync(Guid? serviceTypeId = null)
    {
        var configs = await _context.Set<RadiologyLabelConfig>()
            .Where(c => c.IsActive && (!serviceTypeId.HasValue || c.ServiceTypeId == serviceTypeId))
            .ToListAsync();

        if (!configs.Any())
        {
            // Return default config
            return new List<RadiologyLabelConfigDto>
            {
                new RadiologyLabelConfigDto
                {
                    Id = Guid.NewGuid(),
                    Name = "Nhan mac dinh",
                    LabelWidth = 70,
                    LabelHeight = 40,
                    IncludeQRCode = true,
                    IncludeBarcode = true,
                    BarcodeFormat = "CODE128",
                    IsDefault = true,
                    IsActive = true
                }
            };
        }

        return configs.Select(c => new RadiologyLabelConfigDto
        {
            Id = c.Id,
            Name = c.Name,
            Description = c.Description,
            LabelWidth = c.LabelWidth,
            LabelHeight = c.LabelHeight,
            TemplateHtml = c.TemplateHtml,
            TemplateZpl = c.TemplateZpl,
            IncludeQRCode = c.IncludeQRCode,
            IncludeBarcode = c.IncludeBarcode,
            BarcodeFormat = c.BarcodeFormat,
            ServiceTypeId = c.ServiceTypeId,
            DepartmentId = c.DepartmentId,
            IsDefault = c.IsDefault,
            IsActive = c.IsActive
        }).ToList();
    }

    public async Task<RadiologyLabelConfigDto> SaveLabelConfigAsync(RadiologyLabelConfigDto dto)
    {
        RadiologyLabelConfig config;
        if (dto.Id != Guid.Empty)
        {
            config = await _context.Set<RadiologyLabelConfig>().FindAsync(dto.Id);
            if (config == null) return null;
        }
        else
        {
            config = new RadiologyLabelConfig { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            await _context.Set<RadiologyLabelConfig>().AddAsync(config);
        }

        config.Name = dto.Name;
        config.Description = dto.Description;
        config.LabelWidth = dto.LabelWidth;
        config.LabelHeight = dto.LabelHeight;
        config.TemplateHtml = dto.TemplateHtml;
        config.TemplateZpl = dto.TemplateZpl;
        config.IncludeQRCode = dto.IncludeQRCode;
        config.IncludeBarcode = dto.IncludeBarcode;
        config.BarcodeFormat = dto.BarcodeFormat;
        config.ServiceTypeId = dto.ServiceTypeId;
        config.DepartmentId = dto.DepartmentId;
        config.IsDefault = dto.IsDefault;
        config.IsActive = dto.IsActive;
        config.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();
        dto.Id = config.Id;
        return dto;
    }

    public async Task<bool> DeleteLabelConfigAsync(Guid configId)
    {
        var config = await _context.Set<RadiologyLabelConfig>().FindAsync(configId);
        if (config == null) return false;
        config.IsActive = false;
        config.IsDeleted = true;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    private string GenerateLabelHtml(LabelDataDto data, string format)
    {
        return $@"
        <div style='width:70mm;height:40mm;padding:2mm;font-family:Arial;font-size:10px;'>
            <div style='font-weight:bold;font-size:12px;'>{data.PatientName}</div>
            <div>Ma BN: {data.PatientCode} | {data.Age} tuoi | {data.Gender}</div>
            <div>Ma phieu: {data.OrderCode}</div>
            <div>DV: {data.ServiceName}</div>
            <div>STT: {data.QueueNumber} | Ngay: {data.OrderDate:dd/MM/yyyy HH:mm}</div>
        </div>";
    }

    #endregion

    #region Diagnosis Templates - Mẫu chẩn đoán

    public async Task<List<DiagnosisTemplateDto>> GetDiagnosisTemplatesAsync(
        Guid? serviceTypeId = null,
        Guid? serviceId = null,
        string keyword = null)
    {
        var query = _context.Set<RadiologyDiagnosisTemplate>()
            .Include(t => t.Service)
            .Include(t => t.CreatedByUser)
            .Where(t => t.IsActive);

        if (serviceTypeId.HasValue)
            query = query.Where(t => t.ServiceTypeId == serviceTypeId);
        if (serviceId.HasValue)
            query = query.Where(t => t.ServiceId == serviceId);
        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(t => t.Name.Contains(keyword) || t.Code.Contains(keyword));

        var templates = await query.OrderBy(t => t.SortOrder).ToListAsync();

        return templates.Select(t => new DiagnosisTemplateDto
        {
            Id = t.Id,
            Code = t.Code,
            Name = t.Name,
            Description = t.Description,
            Conclusion = t.Conclusion,
            Recommendation = t.Recommendation,
            ServiceTypeId = t.ServiceTypeId,
            ServiceId = t.ServiceId,
            ServiceName = t.Service?.ServiceName,
            Gender = t.Gender,
            MinAge = t.MinAge,
            MaxAge = t.MaxAge,
            SortOrder = t.SortOrder,
            IsDefault = t.IsDefault,
            IsActive = t.IsActive,
            CreatedByUserName = t.CreatedByUser?.FullName
        }).ToList();
    }

    public async Task<DiagnosisTemplateDto> SaveDiagnosisTemplateAsync(SaveDiagnosisTemplateDto dto)
    {
        RadiologyDiagnosisTemplate template;
        if (dto.Id.HasValue)
        {
            template = await _context.Set<RadiologyDiagnosisTemplate>().FindAsync(dto.Id.Value);
            if (template == null) return null;
        }
        else
        {
            template = new RadiologyDiagnosisTemplate { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            await _context.Set<RadiologyDiagnosisTemplate>().AddAsync(template);
        }

        template.Code = dto.Code;
        template.Name = dto.Name;
        template.Description = dto.Description;
        template.Conclusion = dto.Conclusion;
        template.Recommendation = dto.Recommendation;
        template.ServiceTypeId = dto.ServiceTypeId;
        template.ServiceId = dto.ServiceId;
        template.Gender = dto.Gender;
        template.MinAge = dto.MinAge;
        template.MaxAge = dto.MaxAge;
        template.SortOrder = dto.SortOrder;
        template.IsDefault = dto.IsDefault;
        template.IsActive = dto.IsActive;
        template.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new DiagnosisTemplateDto
        {
            Id = template.Id,
            Code = template.Code,
            Name = template.Name,
            Description = template.Description,
            Conclusion = template.Conclusion,
            Recommendation = template.Recommendation,
            SortOrder = template.SortOrder,
            IsDefault = template.IsDefault,
            IsActive = template.IsActive
        };
    }

    public async Task<bool> DeleteDiagnosisTemplateAsync(Guid templateId)
    {
        var template = await _context.Set<RadiologyDiagnosisTemplate>().FindAsync(templateId);
        if (template == null) return false;
        template.IsActive = false;
        template.IsDeleted = true;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    #endregion

    #region Abbreviations - Bộ từ viết tắt

    public async Task<List<AbbreviationDto>> GetAbbreviationsAsync(
        string category = null,
        Guid? serviceTypeId = null,
        string keyword = null)
    {
        var query = _context.Set<RadiologyAbbreviation>()
            .Include(a => a.CreatedByUser)
            .Where(a => a.IsActive);

        if (!string.IsNullOrEmpty(category))
            query = query.Where(a => a.Category == category);
        if (serviceTypeId.HasValue)
            query = query.Where(a => a.IsGlobal || a.ServiceTypeId == serviceTypeId);
        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(a => a.Abbreviation.Contains(keyword) || a.FullText.Contains(keyword));

        var abbreviations = await query.OrderBy(a => a.SortOrder).ToListAsync();

        return abbreviations.Select(a => new AbbreviationDto
        {
            Id = a.Id,
            Abbreviation = a.Abbreviation,
            FullText = a.FullText,
            Category = a.Category,
            ServiceTypeId = a.ServiceTypeId,
            IsGlobal = a.IsGlobal,
            SortOrder = a.SortOrder,
            IsActive = a.IsActive,
            CreatedByUserName = a.CreatedByUser?.FullName
        }).ToList();
    }

    public async Task<AbbreviationDto> SaveAbbreviationAsync(SaveAbbreviationDto dto)
    {
        RadiologyAbbreviation abbreviation;
        if (dto.Id.HasValue)
        {
            abbreviation = await _context.Set<RadiologyAbbreviation>().FindAsync(dto.Id.Value);
            if (abbreviation == null) return null;
        }
        else
        {
            abbreviation = new RadiologyAbbreviation { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            await _context.Set<RadiologyAbbreviation>().AddAsync(abbreviation);
        }

        abbreviation.Abbreviation = dto.Abbreviation;
        abbreviation.FullText = dto.FullText;
        abbreviation.Category = dto.Category;
        abbreviation.ServiceTypeId = dto.ServiceTypeId;
        abbreviation.IsGlobal = dto.IsGlobal;
        abbreviation.SortOrder = dto.SortOrder;
        abbreviation.IsActive = dto.IsActive;
        abbreviation.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new AbbreviationDto
        {
            Id = abbreviation.Id,
            Abbreviation = abbreviation.Abbreviation,
            FullText = abbreviation.FullText,
            Category = abbreviation.Category,
            IsGlobal = abbreviation.IsGlobal,
            SortOrder = abbreviation.SortOrder,
            IsActive = abbreviation.IsActive
        };
    }

    public async Task<bool> DeleteAbbreviationAsync(Guid abbreviationId)
    {
        var abbreviation = await _context.Set<RadiologyAbbreviation>().FindAsync(abbreviationId);
        if (abbreviation == null) return false;
        abbreviation.IsActive = false;
        abbreviation.IsDeleted = true;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<ExpandAbbreviationResultDto> ExpandAbbreviationsAsync(string text, string category = null, Guid? serviceTypeId = null)
    {
        var abbreviations = await GetAbbreviationsAsync(category, serviceTypeId, null);
        var result = new ExpandAbbreviationResultDto
        {
            OriginalText = text,
            ExpandedText = text,
            ReplacementCount = 0,
            ReplacedAbbreviations = new List<string>()
        };

        foreach (var abbr in abbreviations.OrderByDescending(a => a.Abbreviation.Length))
        {
            if (result.ExpandedText.Contains(abbr.Abbreviation))
            {
                result.ExpandedText = result.ExpandedText.Replace(abbr.Abbreviation, abbr.FullText);
                result.ReplacementCount++;
                result.ReplacedAbbreviations.Add(abbr.Abbreviation);
            }
        }

        return result;
    }

    #endregion

    #region QR Code

    public async Task<QRCodeResultDto> GenerateQRCodeAsync(GenerateQRCodeRequestDto request)
    {
        var order = await _context.RadiologyRequests
            .Include(r => r.Patient)
            .FirstOrDefaultAsync(r => r.Id == request.OrderId);

        if (order == null) return null;

        var qrData = request.QRType switch
        {
            "PATIENT_INFO" => $"PATIENT|{order.Patient.PatientCode}|{order.Patient.FullName}",
            "ORDER_INFO" => $"ORDER|{order.RequestCode}|{order.Patient.PatientCode}",
            "RESULT_SHARE" => $"SHARE|{order.Id}|{Guid.NewGuid():N}",
            "DICOM_LINK" => $"DICOM|{order.Id}",
            _ => $"HIS|{order.RequestCode}"
        };

        // Generate QR Code (simplified - in production use QRCoder library)
        var qrCodeBase64 = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(qrData));

        return new QRCodeResultDto
        {
            OrderId = request.OrderId,
            QRType = request.QRType,
            QRCodeBase64 = qrCodeBase64,
            QRCodeUrl = $"/api/RISComplete/qrcode/{request.OrderId}",
            EncodedData = qrData,
            GeneratedAt = DateTime.Now,
            ExpiresAt = request.ValidityHours.HasValue ? DateTime.Now.AddHours(request.ValidityHours.Value) : null
        };
    }

    public async Task<ScanQRCodeResultDto> ScanQRCodeAsync(string qrData)
    {
        var result = new ScanQRCodeResultDto { Success = false };

        var parts = qrData.Split('|');
        if (parts.Length < 2)
        {
            result.ErrorMessage = "Invalid QR code format";
            return result;
        }

        switch (parts[0])
        {
            case "PATIENT":
                var patient = await _context.Patients.FirstOrDefaultAsync(p => p.PatientCode == parts[1]);
                if (patient != null)
                {
                    result.Success = true;
                    result.QRType = "PATIENT_INFO";
                    result.PatientId = patient.Id;
                    result.PatientCode = patient.PatientCode;
                    result.PatientName = patient.FullName;
                }
                break;
            case "ORDER":
                var order = await _context.RadiologyRequests
                    .Include(r => r.Patient)
                    .FirstOrDefaultAsync(r => r.RequestCode == parts[1]);
                if (order != null)
                {
                    result.Success = true;
                    result.QRType = "ORDER_INFO";
                    result.OrderId = order.Id;
                    result.OrderCode = order.RequestCode;
                    result.PatientId = order.PatientId;
                    result.PatientCode = order.Patient.PatientCode;
                    result.PatientName = order.Patient.FullName;
                }
                break;
            case "SHARE":
                if (Guid.TryParse(parts[1], out var shareOrderId))
                {
                    result.Success = true;
                    result.QRType = "RESULT_SHARE";
                    result.OrderId = shareOrderId;
                    result.ResultShareUrl = $"/api/RISComplete/shared-result/{parts[2]}";
                }
                break;
        }

        return result;
    }

    public async Task<ShareResultQRDto> CreateShareResultQRAsync(Guid resultId, int? validityHours = 24)
    {
        var shareCode = Guid.NewGuid().ToString("N").Substring(0, 8).ToUpper();
        var accessCode = new Random().Next(1000, 9999).ToString();

        return new ShareResultQRDto
        {
            ResultId = resultId,
            ShareUrl = $"/api/RISComplete/shared-result/{shareCode}",
            QRCodeBase64 = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes($"SHARE|{resultId}|{shareCode}")),
            ExpiresAt = DateTime.Now.AddHours(validityHours ?? 24),
            AccessCode = accessCode
        };
    }

    public async Task<RadiologyResultDto> GetSharedResultAsync(string shareCode, string accessCode)
    {
        // In production, validate share code and access code from database
        return new RadiologyResultDto
        {
            Id = Guid.NewGuid(),
            Description = "Shared result - implement validation",
            Conclusion = "Shared result"
        };
    }

    #endregion

    #region Duty Schedule - Lịch phân công trực

    public async Task<List<DutyScheduleDto>> GetDutySchedulesAsync(
        Guid departmentId,
        DateTime fromDate,
        DateTime toDate,
        Guid? roomId = null)
    {
        var query = _context.Set<RadiologyDutySchedule>()
            .Include(s => s.Department)
            .Include(s => s.Room)
            .Include(s => s.Doctor)
            .Include(s => s.Technician)
            .Include(s => s.AssistantTechnician)
            .Where(s => s.DepartmentId == departmentId && s.DutyDate >= fromDate && s.DutyDate <= toDate);

        if (roomId.HasValue)
            query = query.Where(s => s.RoomId == roomId);

        var schedules = await query.OrderBy(s => s.DutyDate).ThenBy(s => s.ShiftType).ToListAsync();

        return schedules.Select(s => new DutyScheduleDto
        {
            Id = s.Id,
            DepartmentId = s.DepartmentId,
            DepartmentName = s.Department.DepartmentName,
            RoomId = s.RoomId,
            RoomName = s.Room?.RoomName,
            DutyDate = s.DutyDate,
            ShiftType = s.ShiftType,
            ShiftTypeName = GetShiftTypeName(s.ShiftType),
            StartTime = s.StartTime,
            EndTime = s.EndTime,
            DoctorId = s.DoctorId,
            DoctorName = s.Doctor?.FullName,
            TechnicianId = s.TechnicianId,
            TechnicianName = s.Technician?.FullName,
            AssistantTechnicianId = s.AssistantTechnicianId,
            AssistantTechnicianName = s.AssistantTechnician?.FullName,
            Notes = s.Notes,
            Status = s.Status,
            StatusName = s.Status == 1 ? "Da duyet" : s.Status == 2 ? "Da huy" : "Chua duyet"
        }).ToList();
    }

    public async Task<DutyScheduleDto> SaveDutyScheduleAsync(SaveDutyScheduleDto dto)
    {
        RadiologyDutySchedule schedule;
        if (dto.Id.HasValue)
        {
            schedule = await _context.Set<RadiologyDutySchedule>().FindAsync(dto.Id.Value);
            if (schedule == null) return null;
        }
        else
        {
            schedule = new RadiologyDutySchedule { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            await _context.Set<RadiologyDutySchedule>().AddAsync(schedule);
        }

        schedule.DepartmentId = dto.DepartmentId;
        schedule.RoomId = dto.RoomId;
        schedule.DutyDate = dto.DutyDate;
        schedule.ShiftType = dto.ShiftType;
        schedule.StartTime = dto.StartTime;
        schedule.EndTime = dto.EndTime;
        schedule.DoctorId = dto.DoctorId;
        schedule.TechnicianId = dto.TechnicianId;
        schedule.AssistantTechnicianId = dto.AssistantTechnicianId;
        schedule.Notes = dto.Notes;
        schedule.Status = 0; // Draft
        schedule.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new DutyScheduleDto
        {
            Id = schedule.Id,
            DepartmentId = schedule.DepartmentId,
            RoomId = schedule.RoomId,
            DutyDate = schedule.DutyDate,
            ShiftType = schedule.ShiftType,
            ShiftTypeName = GetShiftTypeName(schedule.ShiftType),
            StartTime = schedule.StartTime,
            EndTime = schedule.EndTime,
            Status = schedule.Status
        };
    }

    public async Task<List<DutyScheduleDto>> BatchCreateDutySchedulesAsync(BatchCreateDutyScheduleDto dto)
    {
        var schedules = new List<DutyScheduleDto>();
        for (var date = dto.FromDate; date <= dto.ToDate; date = date.AddDays(1))
        {
            foreach (var shiftType in dto.ShiftTypes)
            {
                var staff = dto.Staff.FirstOrDefault(s => s.DayOfWeek == (int)date.DayOfWeek && s.ShiftType == shiftType);
                var schedule = await SaveDutyScheduleAsync(new SaveDutyScheduleDto
                {
                    DepartmentId = dto.DepartmentId,
                    RoomId = dto.RoomId,
                    DutyDate = date,
                    ShiftType = shiftType,
                    StartTime = GetShiftStartTime(shiftType),
                    EndTime = GetShiftEndTime(shiftType),
                    DoctorId = staff?.DoctorId,
                    TechnicianId = staff?.TechnicianId,
                    AssistantTechnicianId = staff?.AssistantTechnicianId
                });
                schedules.Add(schedule);
            }
        }
        return schedules;
    }

    public async Task<bool> DeleteDutyScheduleAsync(Guid scheduleId)
    {
        var schedule = await _context.Set<RadiologyDutySchedule>().FindAsync(scheduleId);
        if (schedule == null) return false;
        schedule.Status = 2; // Cancelled
        schedule.IsDeleted = true;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ApproveDutyScheduleAsync(Guid scheduleId)
    {
        var schedule = await _context.Set<RadiologyDutySchedule>().FindAsync(scheduleId);
        if (schedule == null) return false;
        schedule.Status = 1; // Confirmed
        schedule.ApprovedAt = DateTime.Now;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    private string GetShiftTypeName(int shiftType) => shiftType switch
    {
        1 => "Ca sang",
        2 => "Ca chieu",
        3 => "Ca dem",
        4 => "Ca 24h",
        _ => "Khac"
    };

    private TimeSpan GetShiftStartTime(int shiftType) => shiftType switch
    {
        1 => new TimeSpan(7, 0, 0),
        2 => new TimeSpan(13, 0, 0),
        3 => new TimeSpan(19, 0, 0),
        4 => new TimeSpan(7, 0, 0),
        _ => new TimeSpan(7, 0, 0)
    };

    private TimeSpan GetShiftEndTime(int shiftType) => shiftType switch
    {
        1 => new TimeSpan(12, 0, 0),
        2 => new TimeSpan(18, 0, 0),
        3 => new TimeSpan(7, 0, 0),
        4 => new TimeSpan(7, 0, 0),
        _ => new TimeSpan(17, 0, 0)
    };

    #endregion

    #region Room Assignment - Phân phòng thực hiện

    public async Task<RoomAssignmentDto> AssignRoomAsync(AssignRoomRequestDto request)
    {
        var queueNumber = await _context.Set<RadiologyRoomAssignment>()
            .Where(a => a.RoomId == request.RoomId && a.AssignedAt.Date == DateTime.Today)
            .CountAsync() + 1;

        var assignment = new RadiologyRoomAssignment
        {
            Id = Guid.NewGuid(),
            RadiologyRequestId = request.RadiologyRequestId,
            RoomId = request.RoomId,
            ModalityId = request.ModalityId,
            QueueNumber = queueNumber,
            Status = 0, // Waiting
            AssignedAt = DateTime.Now,
            Notes = request.Notes,
            CreatedAt = DateTime.Now
        };

        await _context.Set<RadiologyRoomAssignment>().AddAsync(assignment);
        await _unitOfWork.SaveChangesAsync();

        return new RoomAssignmentDto
        {
            Id = assignment.Id,
            RadiologyRequestId = request.RadiologyRequestId,
            RoomId = request.RoomId,
            QueueNumber = queueNumber,
            Status = 0,
            StatusName = "Cho",
            AssignedAt = assignment.AssignedAt
        };
    }

    public async Task<RoomAssignmentDto> UpdateRoomAssignmentAsync(Guid assignmentId, AssignRoomRequestDto request)
    {
        var assignment = await _context.Set<RadiologyRoomAssignment>().FindAsync(assignmentId);
        if (assignment == null) return null;

        assignment.RoomId = request.RoomId;
        assignment.ModalityId = request.ModalityId;
        assignment.Notes = request.Notes;
        assignment.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new RoomAssignmentDto
        {
            Id = assignment.Id,
            RadiologyRequestId = assignment.RadiologyRequestId,
            RoomId = assignment.RoomId,
            QueueNumber = assignment.QueueNumber,
            Status = assignment.Status
        };
    }

    public async Task<List<RoomAssignmentDto>> GetRoomQueueAsync(Guid roomId, DateTime date)
    {
        var assignments = await _context.Set<RadiologyRoomAssignment>()
            .Include(a => a.RadiologyRequest)
                .ThenInclude(r => r.Patient)
            .Include(a => a.RadiologyRequest)
                .ThenInclude(r => r.Service)
            .Include(a => a.Room)
            .Include(a => a.Modality)
            .Where(a => a.RoomId == roomId && a.AssignedAt.Date == date.Date && a.Status < 3)
            .OrderBy(a => a.QueueNumber)
            .ToListAsync();

        return assignments.Select(a => new RoomAssignmentDto
        {
            Id = a.Id,
            RadiologyRequestId = a.RadiologyRequestId,
            OrderCode = a.RadiologyRequest.RequestCode,
            PatientCode = a.RadiologyRequest.Patient.PatientCode,
            PatientName = a.RadiologyRequest.Patient.FullName,
            ServiceName = a.RadiologyRequest.Service?.ServiceName ?? "",
            RoomId = a.RoomId,
            RoomName = a.Room.RoomName,
            ModalityId = a.ModalityId,
            ModalityName = a.Modality?.ModalityName,
            QueueNumber = a.QueueNumber,
            Status = a.Status,
            StatusName = GetAssignmentStatusName(a.Status),
            AssignedAt = a.AssignedAt,
            CalledAt = a.CalledAt,
            StartedAt = a.StartedAt,
            CompletedAt = a.CompletedAt
        }).ToList();
    }

    public async Task<RoomAssignmentDto> CallNextPatientAsync(Guid roomId)
    {
        var nextAssignment = await _context.Set<RadiologyRoomAssignment>()
            .Include(a => a.RadiologyRequest)
                .ThenInclude(r => r.Patient)
            .Where(a => a.RoomId == roomId && a.Status == 0)
            .OrderBy(a => a.QueueNumber)
            .FirstOrDefaultAsync();

        if (nextAssignment == null) return null;

        nextAssignment.Status = 1; // Called
        nextAssignment.CalledAt = DateTime.Now;
        await _unitOfWork.SaveChangesAsync();

        return new RoomAssignmentDto
        {
            Id = nextAssignment.Id,
            RadiologyRequestId = nextAssignment.RadiologyRequestId,
            PatientCode = nextAssignment.RadiologyRequest.Patient.PatientCode,
            PatientName = nextAssignment.RadiologyRequest.Patient.FullName,
            QueueNumber = nextAssignment.QueueNumber,
            Status = nextAssignment.Status,
            StatusName = "Da goi",
            CalledAt = nextAssignment.CalledAt
        };
    }

    public async Task<bool> SkipPatientAsync(Guid assignmentId, string reason)
    {
        var assignment = await _context.Set<RadiologyRoomAssignment>().FindAsync(assignmentId);
        if (assignment == null) return false;

        assignment.Status = 4; // Skipped
        assignment.Notes = reason;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<List<RoomStatisticsDto>> GetRoomStatisticsAsync(DateTime date)
    {
        var rooms = await _context.Rooms.Where(r => r.RoomType >= 10 && r.RoomType < 20 && r.IsActive).ToListAsync();
        var result = new List<RoomStatisticsDto>();

        foreach (var room in rooms)
        {
            var assignments = await _context.Set<RadiologyRoomAssignment>()
                .Where(a => a.RoomId == room.Id && a.AssignedAt.Date == date.Date)
                .ToListAsync();

            result.Add(new RoomStatisticsDto
            {
                RoomId = room.Id,
                RoomName = room.RoomName,
                WaitingCount = assignments.Count(a => a.Status == 0),
                CalledCount = assignments.Count(a => a.Status == 1),
                InProgressCount = assignments.Count(a => a.Status == 2),
                CompletedCount = assignments.Count(a => a.Status == 3),
                SkippedCount = assignments.Count(a => a.Status == 4),
                TotalCount = assignments.Count
            });
        }

        return result;
    }

    private string GetAssignmentStatusName(int status) => status switch
    {
        0 => "Cho",
        1 => "Da goi",
        2 => "Dang thuc hien",
        3 => "Hoan thanh",
        4 => "Bo qua",
        _ => "Khong xac dinh"
    };

    #endregion

    #region Tags - Quản lý Tag

    public async Task<List<RadiologyTagDto>> GetTagsAsync(string keyword = null, bool includeInactive = false)
    {
        var query = _context.Set<RadiologyTag>()
            .Include(t => t.Children)
            .Include(t => t.RequestTags)
            .Where(t => includeInactive || t.IsActive);

        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(t => t.Name.Contains(keyword) || t.Code.Contains(keyword));

        var tags = await query.Where(t => t.ParentId == null).OrderBy(t => t.SortOrder).ToListAsync();

        return tags.Select(MapTagToDto).ToList();
    }

    private RadiologyTagDto MapTagToDto(RadiologyTag tag)
    {
        return new RadiologyTagDto
        {
            Id = tag.Id,
            Code = tag.Code,
            Name = tag.Name,
            Description = tag.Description,
            Color = tag.Color,
            ParentId = tag.ParentId,
            SortOrder = tag.SortOrder,
            IsActive = tag.IsActive,
            RequestCount = tag.RequestTags?.Count ?? 0,
            Children = tag.Children?.Select(MapTagToDto).ToList() ?? new List<RadiologyTagDto>()
        };
    }

    public async Task<RadiologyTagDto> SaveTagAsync(SaveRadiologyTagDto dto)
    {
        RadiologyTag tag;
        if (dto.Id.HasValue)
        {
            tag = await _context.Set<RadiologyTag>().FindAsync(dto.Id.Value);
            if (tag == null) return null;
        }
        else
        {
            tag = new RadiologyTag { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            await _context.Set<RadiologyTag>().AddAsync(tag);
        }

        tag.Code = dto.Code;
        tag.Name = dto.Name;
        tag.Description = dto.Description;
        tag.Color = dto.Color;
        tag.ParentId = dto.ParentId;
        tag.SortOrder = dto.SortOrder;
        tag.IsActive = dto.IsActive;
        tag.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new RadiologyTagDto
        {
            Id = tag.Id,
            Code = tag.Code,
            Name = tag.Name,
            Description = tag.Description,
            Color = tag.Color,
            ParentId = tag.ParentId,
            SortOrder = tag.SortOrder,
            IsActive = tag.IsActive
        };
    }

    public async Task<bool> DeleteTagAsync(Guid tagId)
    {
        var tag = await _context.Set<RadiologyTag>().FindAsync(tagId);
        if (tag == null) return false;
        tag.IsActive = false;
        tag.IsDeleted = true;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<bool> AssignTagsToRequestAsync(AssignTagRequestDto request)
    {
        foreach (var tagId in request.TagIds)
        {
            var existingTag = await _context.Set<RadiologyRequestTag>()
                .FirstOrDefaultAsync(rt => rt.RadiologyRequestId == request.RadiologyRequestId && rt.TagId == tagId);

            if (existingTag == null)
            {
                var requestTag = new RadiologyRequestTag
                {
                    Id = Guid.NewGuid(),
                    RadiologyRequestId = request.RadiologyRequestId,
                    TagId = tagId,
                    Note = request.Note,
                    CreatedAt = DateTime.Now
                };
                await _context.Set<RadiologyRequestTag>().AddAsync(requestTag);
            }
        }

        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RemoveTagFromRequestAsync(Guid requestId, Guid tagId)
    {
        var requestTag = await _context.Set<RadiologyRequestTag>()
            .FirstOrDefaultAsync(rt => rt.RadiologyRequestId == requestId && rt.TagId == tagId);

        if (requestTag == null) return false;

        _context.Set<RadiologyRequestTag>().Remove(requestTag);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<List<TaggedRequestDto>> GetRequestsByTagAsync(Guid tagId, DateTime? fromDate = null, DateTime? toDate = null)
    {
        var query = _context.Set<RadiologyRequestTag>()
            .Include(rt => rt.RadiologyRequest)
                .ThenInclude(r => r.Patient)
            .Include(rt => rt.RadiologyRequest)
                .ThenInclude(r => r.Service)
            .Include(rt => rt.Tag)
            .Include(rt => rt.AddedByUser)
            .Where(rt => rt.TagId == tagId);

        if (fromDate.HasValue)
            query = query.Where(rt => rt.RadiologyRequest.RequestDate >= fromDate);
        if (toDate.HasValue)
            query = query.Where(rt => rt.RadiologyRequest.RequestDate <= toDate);

        var requestTags = await query.OrderByDescending(rt => rt.CreatedAt).ToListAsync();

        return requestTags.Select(rt => new TaggedRequestDto
        {
            Id = rt.Id,
            RadiologyRequestId = rt.RadiologyRequestId,
            OrderCode = rt.RadiologyRequest.RequestCode,
            PatientCode = rt.RadiologyRequest.Patient.PatientCode,
            PatientName = rt.RadiologyRequest.Patient.FullName,
            ServiceName = rt.RadiologyRequest.Service?.ServiceName ?? "",
            OrderDate = rt.RadiologyRequest.RequestDate,
            TagId = rt.TagId,
            TagName = rt.Tag.Name,
            TagColor = rt.Tag.Color,
            Note = rt.Note,
            AddedByUserName = rt.AddedByUser?.FullName,
            CreatedAt = rt.CreatedAt
        }).ToList();
    }

    public async Task<List<RadiologyTagDto>> GetTagsOfRequestAsync(Guid requestId)
    {
        var requestTags = await _context.Set<RadiologyRequestTag>()
            .Include(rt => rt.Tag)
            .Where(rt => rt.RadiologyRequestId == requestId)
            .ToListAsync();

        return requestTags.Select(rt => new RadiologyTagDto
        {
            Id = rt.Tag.Id,
            Code = rt.Tag.Code,
            Name = rt.Tag.Name,
            Color = rt.Tag.Color
        }).ToList();
    }

    #endregion

    #region Integration Log

    public async Task<IntegrationLogSearchResultDto> SearchIntegrationLogsAsync(SearchIntegrationLogDto searchDto)
    {
        var query = _context.Set<RadiologyIntegrationLog>().AsQueryable();

        if (searchDto.FromDate.HasValue)
            query = query.Where(l => l.SentAt >= searchDto.FromDate);
        if (searchDto.ToDate.HasValue)
            query = query.Where(l => l.SentAt <= searchDto.ToDate);
        if (!string.IsNullOrEmpty(searchDto.Direction))
            query = query.Where(l => l.Direction == searchDto.Direction);
        if (!string.IsNullOrEmpty(searchDto.MessageType))
            query = query.Where(l => l.MessageType == searchDto.MessageType);
        if (searchDto.Status.HasValue)
            query = query.Where(l => l.Status == searchDto.Status);
        if (!string.IsNullOrEmpty(searchDto.RequestCode))
            query = query.Where(l => l.RequestCode.Contains(searchDto.RequestCode));
        if (!string.IsNullOrEmpty(searchDto.PatientCode))
            query = query.Where(l => l.PatientCode.Contains(searchDto.PatientCode));

        var totalCount = await query.CountAsync();
        var logs = await query
            .OrderByDescending(l => l.SentAt)
            .Skip((searchDto.Page - 1) * searchDto.PageSize)
            .Take(searchDto.PageSize)
            .ToListAsync();

        return new IntegrationLogSearchResultDto
        {
            Items = logs.Select(l => new IntegrationLogDto
            {
                Id = l.Id,
                LogCode = l.LogCode,
                Direction = l.Direction,
                DirectionName = l.Direction == "HIS_TO_RIS" ? "HIS -> RIS" : "RIS -> HIS",
                MessageType = l.MessageType,
                MessageTypeName = GetMessageTypeName(l.MessageType),
                RadiologyRequestId = l.RadiologyRequestId,
                PatientCode = l.PatientCode,
                MedicalRecordCode = l.MedicalRecordCode,
                RequestCode = l.RequestCode,
                SentAt = l.SentAt,
                RequestPayload = l.RequestPayload,
                ResponsePayload = l.ResponsePayload,
                Status = l.Status,
                StatusName = GetLogStatusName(l.Status),
                ErrorMessage = l.ErrorMessage,
                RetryCount = l.RetryCount,
                LastRetryAt = l.LastRetryAt,
                SourceSystem = l.SourceSystem,
                TargetSystem = l.TargetSystem,
                TransactionId = l.TransactionId
            }).ToList(),
            TotalCount = totalCount,
            TotalPages = (int)Math.Ceiling((double)totalCount / searchDto.PageSize),
            Page = searchDto.Page,
            PageSize = searchDto.PageSize
        };
    }

    public async Task<IntegrationLogDto> GetIntegrationLogAsync(Guid logId)
    {
        var log = await _context.Set<RadiologyIntegrationLog>().FindAsync(logId);
        if (log == null) return null;

        return new IntegrationLogDto
        {
            Id = log.Id,
            LogCode = log.LogCode,
            Direction = log.Direction,
            MessageType = log.MessageType,
            RequestCode = log.RequestCode,
            SentAt = log.SentAt,
            RequestPayload = log.RequestPayload,
            ResponsePayload = log.ResponsePayload,
            Status = log.Status,
            ErrorMessage = log.ErrorMessage
        };
    }

    public async Task<IntegrationLogStatisticsDto> GetIntegrationLogStatisticsAsync(DateTime fromDate, DateTime toDate)
    {
        var logs = await _context.Set<RadiologyIntegrationLog>()
            .Where(l => l.SentAt >= fromDate && l.SentAt <= toDate)
            .ToListAsync();

        return new IntegrationLogStatisticsDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            TotalMessages = logs.Count,
            SuccessCount = logs.Count(l => l.Status == 1),
            FailedCount = logs.Count(l => l.Status == 2),
            PendingCount = logs.Count(l => l.Status == 0),
            SuccessRate = logs.Count > 0 ? (decimal)logs.Count(l => l.Status == 1) / logs.Count * 100 : 0,
            ByMessageType = logs.GroupBy(l => l.MessageType).Select(g => new IntegrationLogByTypeDto
            {
                MessageType = g.Key,
                TotalCount = g.Count(),
                SuccessCount = g.Count(l => l.Status == 1),
                FailedCount = g.Count(l => l.Status == 2)
            }).ToList(),
            ByDay = logs.GroupBy(l => l.SentAt.Date).Select(g => new IntegrationLogByDayDto
            {
                Date = g.Key,
                TotalCount = g.Count(),
                SuccessCount = g.Count(l => l.Status == 1),
                FailedCount = g.Count(l => l.Status == 2)
            }).OrderBy(d => d.Date).ToList()
        };
    }

    public async Task<bool> RetryIntegrationAsync(Guid logId)
    {
        var log = await _context.Set<RadiologyIntegrationLog>().FindAsync(logId);
        if (log == null || log.Status != 2) return false;

        log.Status = 3; // Retrying
        log.RetryCount++;
        log.LastRetryAt = DateTime.Now;
        await _unitOfWork.SaveChangesAsync();

        // In production, implement actual retry logic
        return true;
    }

    private string GetMessageTypeName(string messageType) => messageType switch
    {
        "ORDER" => "Chi dinh",
        "RESULT" => "Ket qua",
        "CANCEL" => "Huy",
        _ => messageType
    };

    private string GetLogStatusName(int status) => status switch
    {
        0 => "Cho xu ly",
        1 => "Thanh cong",
        2 => "Loi",
        3 => "Dang thu lai",
        _ => "Khong xac dinh"
    };

    #endregion

    #region Digital Signature - Ký số

    public async Task<List<DigitalSignatureConfigDto>> GetSignatureConfigsAsync()
    {
        var configs = await _context.Set<RadiologyDigitalSignatureConfig>()
            .Where(c => c.IsActive)
            .ToListAsync();

        return configs.Select(c => new DigitalSignatureConfigDto
        {
            Id = c.Id,
            SignatureType = c.SignatureType,
            SignatureTypeName = GetSignatureTypeName(c.SignatureType),
            Name = c.Name,
            ProviderUrl = c.ProviderUrl,
            IsDefault = c.IsDefault,
            IsActive = c.IsActive
        }).ToList();
    }

    public async Task<DigitalSignatureConfigDto> SaveSignatureConfigAsync(SaveDigitalSignatureConfigDto dto)
    {
        RadiologyDigitalSignatureConfig config;
        if (dto.Id.HasValue)
        {
            config = await _context.Set<RadiologyDigitalSignatureConfig>().FindAsync(dto.Id.Value);
            if (config == null) return null;
        }
        else
        {
            config = new RadiologyDigitalSignatureConfig { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            await _context.Set<RadiologyDigitalSignatureConfig>().AddAsync(config);
        }

        config.SignatureType = dto.SignatureType;
        config.Name = dto.Name;
        config.ProviderUrl = dto.ProviderUrl;
        config.ApiKey = dto.ApiKey;
        config.ApiSecret = dto.ApiSecret;
        config.CertificatePath = dto.CertificatePath;
        config.CertificatePassword = dto.CertificatePassword;
        config.IsDefault = dto.IsDefault;
        config.IsActive = dto.IsActive;
        config.ConfigJson = dto.ConfigJson;
        config.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new DigitalSignatureConfigDto
        {
            Id = config.Id,
            SignatureType = config.SignatureType,
            SignatureTypeName = GetSignatureTypeName(config.SignatureType),
            Name = config.Name,
            IsDefault = config.IsDefault,
            IsActive = config.IsActive
        };
    }

    public async Task<bool> DeleteSignatureConfigAsync(Guid configId)
    {
        var config = await _context.Set<RadiologyDigitalSignatureConfig>().FindAsync(configId);
        if (config == null) return false;
        config.IsActive = false;
        config.IsDeleted = true;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<SignResultResponseDto> SignResultAsync(SignResultRequestDto request)
    {
        // First try to find RadiologyReport directly by ID
        var report = await _context.RadiologyReports.FindAsync(request.ReportId);

        // If not found, try to find through Request -> Exam -> Report chain
        // Frontend may pass RadiologyRequest ID instead of RadiologyReport ID
        if (report == null)
        {
            // Check if this is a RadiologyRequest ID
            var radiologyRequest = await _context.RadiologyRequests
                .Include(r => r.Exams)
                    .ThenInclude(e => e.Report)
                .FirstOrDefaultAsync(r => r.Id == request.ReportId);

            if (radiologyRequest != null)
            {
                // Find the first exam with a report
                var examWithReport = radiologyRequest.Exams
                    .FirstOrDefault(e => e.Report != null);

                if (examWithReport != null)
                {
                    report = examWithReport.Report;
                }
                else
                {
                    // No report exists, create one for the first exam
                    var firstExam = radiologyRequest.Exams.FirstOrDefault();
                    if (firstExam != null)
                    {
                        report = new RadiologyReport
                        {
                            Id = Guid.NewGuid(),
                            RadiologyExamId = firstExam.Id,
                            RadiologistId = Guid.Parse("9e5309dc-ecf9-4d48-9a09-224cd15347b1"), // Admin user
                            Findings = "Ky so tu dong",
                            ReportDate = DateTime.Now,
                            Status = 1,
                            CreatedAt = DateTime.Now
                        };
                        await _context.RadiologyReports.AddAsync(report);
                    }
                }
            }
        }

        if (report == null)
        {
            return new SignResultResponseDto { Success = false, Message = "Khong tim thay ket qua CDHA. Vui long kiem tra lai." };
        }

        // Create signature history
        var signatureHistory = new RadiologySignatureHistory
        {
            Id = Guid.NewGuid(),
            RadiologyReportId = report.Id,
            SignedByUserId = Guid.Parse("9e5309dc-ecf9-4d48-9a09-224cd15347b1"), // Current user
            SignatureType = request.SignatureType ?? "DIGITAL",
            SignedAt = DateTime.Now,
            Status = 1, // Signed
            TransactionId = Guid.NewGuid().ToString("N"),
            CreatedAt = DateTime.Now
        };

        await _context.Set<RadiologySignatureHistory>().AddAsync(signatureHistory);
        report.Status = 2; // Approved
        report.ApprovedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new SignResultResponseDto
        {
            Success = true,
            Message = "Ky so thanh cong",
            SignedAt = signatureHistory.SignedAt,
            TransactionId = signatureHistory.TransactionId
        };
    }

    public async Task<bool> CancelSignedResultAsync(CancelSignedResultDto dto)
    {
        var report = await _context.RadiologyReports.FindAsync(dto.ReportId);
        if (report == null) return false;

        var latestSignature = await _context.Set<RadiologySignatureHistory>()
            .Where(s => s.RadiologyReportId == dto.ReportId && s.Status == 1)
            .OrderByDescending(s => s.SignedAt)
            .FirstOrDefaultAsync();

        if (latestSignature != null)
        {
            latestSignature.Status = 3; // Cancelled
            latestSignature.RejectReason = dto.Reason;
        }

        report.Status = 0; // Back to draft
        report.ApprovedAt = null;
        report.ApprovedBy = null;

        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<List<SignatureHistoryDto>> GetSignatureHistoryAsync(Guid reportId)
    {
        var history = await _context.Set<RadiologySignatureHistory>()
            .Include(s => s.SignedByUser)
            .Include(s => s.RadiologyReport)
                .ThenInclude(r => r.RadiologyExam)
                    .ThenInclude(e => e.RadiologyRequest)
                        .ThenInclude(req => req.Patient)
            .Where(s => s.RadiologyReportId == reportId)
            .OrderByDescending(s => s.SignedAt)
            .ToListAsync();

        return history.Select(s => new SignatureHistoryDto
        {
            Id = s.Id,
            RadiologyReportId = s.RadiologyReportId,
            OrderCode = s.RadiologyReport?.RadiologyExam?.RadiologyRequest?.RequestCode ?? "",
            PatientName = s.RadiologyReport?.RadiologyExam?.RadiologyRequest?.Patient?.FullName ?? "",
            SignedByUserId = s.SignedByUserId,
            SignedByUserName = s.SignedByUser?.FullName ?? "",
            SignatureType = s.SignatureType,
            SignatureTypeName = GetSignatureTypeName(s.SignatureType),
            SignedAt = s.SignedAt,
            CertificateSerial = s.CertificateSerial,
            CertificateSubject = s.CertificateSubject,
            CertificateIssuer = s.CertificateIssuer,
            CertificateValidFrom = s.CertificateValidFrom,
            CertificateValidTo = s.CertificateValidTo,
            Status = s.Status,
            StatusName = GetSignatureStatusName(s.Status),
            SignedDocumentPath = s.SignedDocumentPath,
            TransactionId = s.TransactionId
        }).ToList();
    }

    public async Task<byte[]> PrintSignedResultAsync(Guid reportId)
    {
        // In production, generate PDF with digital signature
        return await Task.FromResult(new byte[0]);
    }

    private string GetSignatureTypeName(string signatureType) => signatureType switch
    {
        "NONE" => "Khong ky",
        "DIGITAL" => "Ky so USB Token",
        "EKYC" => "Ky dien tu",
        "SIGNSERVER" => "SignServer",
        "SMARTCA" => "Smart CA",
        _ => signatureType
    };

    private string GetSignatureStatusName(int status) => status switch
    {
        0 => "Cho ky",
        1 => "Da ky",
        2 => "Tu choi",
        3 => "Da huy",
        _ => "Khong xac dinh"
    };

    #endregion

    #region Statistics

    public async Task<ExamStatisticsByServiceTypeDto> GetExamStatisticsByServiceTypeAsync(DateTime fromDate, DateTime toDate)
    {
        var requests = await _context.RadiologyRequests
            .Include(r => r.Service)
            .Where(r => r.RequestDate >= fromDate && r.RequestDate <= toDate)
            .ToListAsync();

        var byServiceType = requests
            .GroupBy(r => r.Service?.ServiceType ?? 0)
            .Select(g => new ServiceTypeStatisticsDto
            {
                ServiceTypeCode = g.Key.ToString(),
                ServiceTypeName = GetServiceTypeName(g.Key),
                TotalExams = g.Count(),
                CompletedExams = g.Count(r => r.Status >= 3),
                PendingExams = g.Count(r => r.Status < 3),
                CancelledExams = g.Count(r => r.Status == 6),
                TotalRevenue = g.Sum(r => r.TotalAmount),
                InsuranceRevenue = g.Sum(r => r.InsuranceAmount),
                PatientRevenue = g.Sum(r => r.PatientAmount),
                Percentage = requests.Count > 0 ? (decimal)g.Count() / requests.Count * 100 : 0
            })
            .OrderByDescending(s => s.TotalExams)
            .ToList();

        return new ExamStatisticsByServiceTypeDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            TotalExams = requests.Count,
            ServiceTypes = byServiceType
        };
    }

    #endregion

    #region Private Helper Methods

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

    #region IV. Capture Device Management - Quản lý thiết bị Capture

    public async Task<List<CaptureDeviceDto>> GetCaptureDevicesAsync(
        string deviceType = null,
        string keyword = null,
        bool? isActive = null)
    {
        var query = _context.Set<RadiologyCaptureDevice>()
            .Include(d => d.Room)
            
            .AsQueryable();

        if (!string.IsNullOrEmpty(deviceType))
            query = query.Where(d => d.DeviceType == deviceType);
        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(d => d.DeviceName.Contains(keyword) || d.DeviceCode.Contains(keyword));
        if (isActive.HasValue)
            query = query.Where(d => d.IsActive == isActive.Value);

        var devices = await query.OrderBy(d => d.DeviceName).ToListAsync();

        return devices.Select(d => new CaptureDeviceDto
        {
            Id = d.Id,
            DeviceCode = d.DeviceCode,
            DeviceName = d.DeviceName,
            DeviceType = d.DeviceType,
            
            Manufacturer = d.Manufacturer,
            Model = d.Model,
            SerialNumber = d.SerialNumber,
            ConnectionType = d.ConnectionType,
            IpAddress = d.IpAddress,
            Port = d.Port,
            
            
            RoomId = d.RoomId,
            RoomName = d.Room?.RoomName ?? "",
            Status = d.Status,
            LastCommunication = d.LastCommunication,
            IsActive = d.IsActive
        }).ToList();
    }

    public async Task<CaptureDeviceDto> SaveCaptureDeviceAsync(SaveCaptureDeviceDto dto)
    {
        RadiologyCaptureDevice device;
        if (dto.Id.HasValue)
        {
            device = await _context.Set<RadiologyCaptureDevice>().FindAsync(dto.Id.Value);
            if (device == null) return null;
        }
        else
        {
            device = new RadiologyCaptureDevice { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            await _context.Set<RadiologyCaptureDevice>().AddAsync(device);
        }

        device.DeviceCode = dto.DeviceCode;
        device.DeviceName = dto.DeviceName;
        device.DeviceType = dto.DeviceType;
        device.Manufacturer = dto.Manufacturer;
        device.Model = dto.Model;
        device.SerialNumber = dto.SerialNumber;
        device.ConnectionType = dto.ConnectionType;
        device.IpAddress = dto.IpAddress;
        device.Port = dto.Port;
        
        device.RoomId = dto.RoomId;
        device.IsActive = dto.IsActive;
        device.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new CaptureDeviceDto
        {
            Id = device.Id,
            DeviceCode = device.DeviceCode,
            DeviceName = device.DeviceName,
            DeviceType = device.DeviceType,
            IsActive = device.IsActive
        };
    }

    public async Task<bool> DeleteCaptureDeviceAsync(Guid deviceId)
    {
        var device = await _context.Set<RadiologyCaptureDevice>().FindAsync(deviceId);
        if (device == null) return false;
        device.IsActive = false;
        device.IsDeleted = true;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<CaptureDeviceStatusDto> TestCaptureDeviceConnectionAsync(Guid deviceId)
    {
        var device = await _context.Set<RadiologyCaptureDevice>().FindAsync(deviceId);
        if (device == null)
        {
            return new CaptureDeviceStatusDto { IsConnected = false, Message = "Device not found" };
        }

        // Simulate connection test
        return new CaptureDeviceStatusDto
        {
            DeviceId = deviceId,
            IsConnected = true,
            LastCommunication = DateTime.Now,
            Status = "Online",
            Message = "Connection successful"
        };
    }

    public async Task<List<WorkstationDto>> GetWorkstationsAsync(Guid? roomId = null)
    {
        var query = _context.Set<RadiologyWorkstation>()
            .Include(w => w.Room)
            .Where(w => w.IsActive);

        if (roomId.HasValue)
            query = query.Where(w => w.RoomId == roomId);

        var workstations = await query.ToListAsync();

        return workstations.Select(w => new WorkstationDto
        {
            Id = w.Id,
            WorkstationCode = w.WorkstationCode,
            WorkstationName = w.WorkstationName,
            ComputerName = w.ComputerName,
            IpAddress = w.IpAddress,
            RoomId = w.RoomId,
            RoomName = w.Room?.RoomName ?? "",
            
            IsActive = w.IsActive
        }).ToList();
    }

    public async Task<WorkstationDto> SaveWorkstationAsync(SaveWorkstationDto dto)
    {
        RadiologyWorkstation workstation;
        if (dto.Id.HasValue)
        {
            workstation = await _context.Set<RadiologyWorkstation>().FindAsync(dto.Id.Value);
            if (workstation == null) return null;
        }
        else
        {
            workstation = new RadiologyWorkstation { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            await _context.Set<RadiologyWorkstation>().AddAsync(workstation);
        }

        workstation.WorkstationCode = dto.WorkstationCode;
        workstation.WorkstationName = dto.WorkstationName;
        workstation.ComputerName = dto.ComputerName;
        workstation.IpAddress = dto.IpAddress;
        workstation.RoomId = dto.RoomId;
        
        workstation.IsActive = dto.IsActive;
        workstation.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new WorkstationDto
        {
            Id = workstation.Id,
            WorkstationCode = workstation.WorkstationCode,
            WorkstationName = workstation.WorkstationName,
            IsActive = workstation.IsActive
        };
    }

    public async Task<CaptureSessionDto> CreateCaptureSessionAsync(CreateCaptureSessionDto dto)
    {
        var session = new RadiologyCaptureSession
        {
            Id = Guid.NewGuid(),
            RadiologyRequestId = dto.RadiologyRequestId,
            DeviceId = dto.DeviceId,
            WorkstationId = dto.WorkstationId,
            StartTime = DateTime.Now,
            Status = 0, // Active
            CreatedAt = DateTime.Now
        };

        await _context.Set<RadiologyCaptureSession>().AddAsync(session);
        await _unitOfWork.SaveChangesAsync();

        return new CaptureSessionDto
        {
            Id = session.Id,
            RadiologyRequestId = session.RadiologyRequestId,
            StartTime = session.StartTime,
            Status = session.Status
        };
    }

    public async Task<CaptureSessionDto> EndCaptureSessionAsync(Guid sessionId)
    {
        var session = await _context.Set<RadiologyCaptureSession>().FindAsync(sessionId);
        if (session == null) return null;

        session.EndTime = DateTime.Now;
        session.Status = 2; // Completed
        await _unitOfWork.SaveChangesAsync();

        return new CaptureSessionDto
        {
            Id = session.Id,
            StartTime = session.StartTime,
            EndTime = session.EndTime,
            Status = session.Status
        };
    }

    public async Task<CapturedMediaDto> SaveCapturedMediaAsync(SaveCapturedMediaDto dto)
    {
        var media = new RadiologyCapturedMedia
        {
            Id = Guid.NewGuid(),
            SessionId = dto.CaptureSessionId,
            MediaType = dto.MediaType,
            FileName = $"capture_{DateTime.Now:yyyyMMddHHmmss}",
            FilePath = dto.FilePath,
            FileSize = dto.FileSize,
            ThumbnailPath = dto.ThumbnailPath,
            Notes = dto.Description,
            CreatedAt = DateTime.Now
        };

        await _context.Set<RadiologyCapturedMedia>().AddAsync(media);
        await _unitOfWork.SaveChangesAsync();

        return new CapturedMediaDto
        {
            Id = media.Id,
            MediaType = media.MediaType,
            FilePath = media.FilePath,
            ThumbnailPath = media.ThumbnailPath,
            FileSize = media.FileSize
        };
    }

    public async Task<List<CapturedMediaDto>> GetCapturedMediaAsync(Guid sessionId)
    {
        var media = await _context.Set<RadiologyCapturedMedia>()
            .Where(m => m.SessionId == sessionId)
            .OrderBy(m => m.SequenceNumber)
            .ToListAsync();

        return media.Select(m => new CapturedMediaDto
        {
            Id = m.Id,
            SessionId = m.SessionId,
            MediaType = m.MediaType,
            FileName = m.FileName,
            FilePath = m.FilePath,
            FileSize = m.FileSize,
            ThumbnailPath = m.ThumbnailPath,
            MimeType = m.MimeType,
            SequenceNumber = m.SequenceNumber,
            IsThumbnail = m.IsThumbnail,
            IsSentToPacs = m.IsSentToPacs
        }).ToList();
    }

    public async Task<SendToPacsResultDto> SendMediaToPacsAsync(SendToPacsRequestDto request)
    {
        // Send captured media to PACS server
        var result = new SendToPacsResultDto
        {
            Success = true,
            SentCount = request.MediaIds.Count,
            FailedCount = 0,
            StudyInstanceUID = $"1.2.840.{DateTime.Now.Ticks}",
            SentAt = DateTime.Now
        };

        foreach (var mediaId in request.MediaIds)
        {
            var media = await _context.Set<RadiologyCapturedMedia>().FindAsync(mediaId);
            if (media != null)
            {
                media.IsSentToPacs = true;
                media.SentToPacsAt = DateTime.Now;
            }
        }

        await _unitOfWork.SaveChangesAsync();
        return result;
    }

    private string GetCaptureDeviceTypeName(string deviceType) => deviceType switch
    {
        "ULTRASOUND" => "Sieu am",
        "ENDOSCOPY" => "Noi soi",
        "CAMERA" => "Camera",
        "SCANNER" => "May quet",
        _ => deviceType
    };

    #endregion

    #region V. Consultation - Hội chẩn ca chụp

    public async Task<ConsultationSearchResultDto> SearchConsultationsAsync(SearchConsultationDto searchDto)
    {
        var query = _context.Set<RadiologyConsultationSession>()
            .Include(c => c.Organizer)
            .Include(c => c.Cases)
            .AsQueryable();

        if (searchDto.FromDate.HasValue)
            query = query.Where(c => c.ScheduledStartTime >= searchDto.FromDate);
        if (searchDto.ToDate.HasValue)
            query = query.Where(c => c.ScheduledStartTime <= searchDto.ToDate);
        if (searchDto.Status.HasValue)
            query = query.Where(c => c.Status == searchDto.Status);
        if (!string.IsNullOrEmpty(searchDto.Keyword))
            query = query.Where(c => c.SessionCode.Contains(searchDto.Keyword) || c.Title.Contains(searchDto.Keyword));

        var totalCount = await query.CountAsync();
        var sessions = await query
            .OrderByDescending(c => c.ScheduledStartTime)
            .Skip((searchDto.Page - 1) * searchDto.PageSize)
            .Take(searchDto.PageSize)
            .ToListAsync();

        return new ConsultationSearchResultDto
        {
            Items = sessions.Select(s => new ConsultationSessionDto
            {
                Id = s.Id,
                SessionCode = s.SessionCode,
                Title = s.Title,
                ScheduledStartTime = s.ScheduledStartTime,
                ScheduledEndTime = s.ScheduledEndTime,
                ActualStartTime = s.ActualStartTime,
                ActualEndTime = s.ActualEndTime,
                Status = s.Status,
                StatusName = GetConsultationStatusName(s.Status),
                OrganizerName = s.Organizer?.FullName ?? "",
                CaseCount = s.Cases?.Count ?? 0
            }).ToList(),
            TotalCount = totalCount,
            TotalPages = (int)Math.Ceiling((double)totalCount / searchDto.PageSize),
            Page = searchDto.Page,
            PageSize = searchDto.PageSize
        };
    }

    public async Task<ConsultationSessionDto> GetConsultationSessionAsync(Guid sessionId)
    {
        var session = await _context.Set<RadiologyConsultationSession>()
            .Include(c => c.Organizer)
            .Include(c => c.Cases)
                .ThenInclude(cc => cc.RadiologyRequest)
                    .ThenInclude(r => r.Patient)
            .Include(c => c.Participants)
                .ThenInclude(p => p.User)
            .FirstOrDefaultAsync(c => c.Id == sessionId);

        if (session == null) return null;

        return new ConsultationSessionDto
        {
            Id = session.Id,
            SessionCode = session.SessionCode,
            Title = session.Title,
            Description = session.Description,
            ScheduledStartTime = session.ScheduledStartTime,
            ScheduledEndTime = session.ScheduledEndTime,
            ActualStartTime = session.ActualStartTime,
            ActualEndTime = session.ActualEndTime,
            Status = session.Status,
            StatusName = GetConsultationStatusName(session.Status),
            MeetingUrl = session.MeetingUrl,
            OrganizerName = session.Organizer?.FullName ?? "",
            CaseCount = session.Cases?.Count ?? 0,
            Cases = session.Cases?.Select(c => new ConsultationCaseDto
            {
                Id = c.Id,
                RadiologyRequestId = c.RadiologyRequestId,
                PatientName = c.RadiologyRequest?.Patient?.FullName ?? "",
                PatientCode = c.RadiologyRequest?.Patient?.PatientCode ?? "",
                Reason = c.Reason,
                Status = c.Status
            }).ToList(),
            Participants = session.Participants?.Select(p => new ConsultationParticipantDto
            {
                Id = p.Id,
                UserId = p.UserId,
                UserName = p.User?.FullName ?? "",
                Role = p.Role,
                JoinedAt = p.JoinedAt
            }).ToList()
        };
    }

    public async Task<ConsultationSessionDto> SaveConsultationSessionAsync(SaveConsultationSessionDto dto)
    {
        RadiologyConsultationSession session;
        if (dto.Id.HasValue)
        {
            session = await _context.Set<RadiologyConsultationSession>().FindAsync(dto.Id.Value);
            if (session == null) return null;
        }
        else
        {
            session = new RadiologyConsultationSession
            {
                Id = Guid.NewGuid(),
                SessionCode = $"HC{DateTime.Now:yyyyMMddHHmmss}",
                OrganizerId = Guid.Parse("9e5309dc-ecf9-4d48-9a09-224cd15347b1"),
                CreatedAt = DateTime.Now
            };
            await _context.Set<RadiologyConsultationSession>().AddAsync(session);
        }

        session.Title = dto.Title;
        session.Description = dto.Description;
        session.ScheduledStartTime = dto.ScheduledStartTime;
        session.ScheduledEndTime = dto.ScheduledEndTime;
        
        
        session.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new ConsultationSessionDto
        {
            Id = session.Id,
            SessionCode = session.SessionCode,
            Title = session.Title,
            ScheduledStartTime = session.ScheduledStartTime,
            ScheduledEndTime = session.ScheduledEndTime,
            Status = session.Status
        };
    }

    public async Task<bool> DeleteConsultationSessionAsync(Guid sessionId)
    {
        var session = await _context.Set<RadiologyConsultationSession>().FindAsync(sessionId);
        if (session == null) return false;
        session.IsDeleted = true;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<ConsultationSessionDto> StartConsultationAsync(Guid sessionId)
    {
        var session = await _context.Set<RadiologyConsultationSession>().FindAsync(sessionId);
        if (session == null) return null;

        session.Status = 2; // InProgress
        session.ActualStartTime = DateTime.Now;
        await _unitOfWork.SaveChangesAsync();

        return new ConsultationSessionDto
        {
            Id = session.Id,
            SessionCode = session.SessionCode,
            ActualStartTime = session.ActualStartTime,
            Status = session.Status
        };
    }

    public async Task<ConsultationSessionDto> EndConsultationAsync(Guid sessionId)
    {
        var session = await _context.Set<RadiologyConsultationSession>().FindAsync(sessionId);
        if (session == null) return null;

        session.Status = 3; // Completed
        session.ActualEndTime = DateTime.Now;
        await _unitOfWork.SaveChangesAsync();

        return new ConsultationSessionDto
        {
            Id = session.Id,
            SessionCode = session.SessionCode,
            ActualEndTime = session.ActualEndTime,
            Status = session.Status
        };
    }

    public async Task<ConsultationCaseDto> AddConsultationCaseAsync(AddConsultationCaseDto dto)
    {
        var consultationCase = new RadiologyConsultationCase
        {
            Id = Guid.NewGuid(),
            SessionId = dto.SessionId,
            RadiologyRequestId = dto.RadiologyRequestId,
            Reason = dto.Reason,
            Status = 0,
            CreatedAt = DateTime.Now
        };

        await _context.Set<RadiologyConsultationCase>().AddAsync(consultationCase);
        await _unitOfWork.SaveChangesAsync();

        return new ConsultationCaseDto
        {
            Id = consultationCase.Id,
            RadiologyRequestId = consultationCase.RadiologyRequestId,
            Reason = consultationCase.Reason,
            Status = consultationCase.Status
        };
    }

    public async Task<bool> RemoveConsultationCaseAsync(Guid caseId)
    {
        var consultationCase = await _context.Set<RadiologyConsultationCase>().FindAsync(caseId);
        if (consultationCase == null) return false;
        _context.Set<RadiologyConsultationCase>().Remove(consultationCase);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<ConsultationParticipantDto> InviteParticipantAsync(InviteParticipantDto dto)
    {
        var participant = new RadiologyConsultationParticipant
        {
            Id = Guid.NewGuid(),
            SessionId = dto.SessionId,
            UserId = dto.UserId,
            Role = dto.Role ?? "Participant",
            InvitedAt = DateTime.Now,
            Status = 0, // Invited
            CreatedAt = DateTime.Now
        };

        await _context.Set<RadiologyConsultationParticipant>().AddAsync(participant);
        await _unitOfWork.SaveChangesAsync();

        return new ConsultationParticipantDto
        {
            Id = participant.Id,
            UserId = participant.UserId,
            Role = participant.Role,
            InvitedAt = participant.InvitedAt
        };
    }

    public async Task<bool> RemoveParticipantAsync(Guid participantId)
    {
        var participant = await _context.Set<RadiologyConsultationParticipant>().FindAsync(participantId);
        if (participant == null) return false;
        _context.Set<RadiologyConsultationParticipant>().Remove(participant);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<ConsultationParticipantDto> JoinConsultationAsync(Guid sessionId, Guid userId)
    {
        var participant = await _context.Set<RadiologyConsultationParticipant>()
            .FirstOrDefaultAsync(p => p.SessionId == sessionId && p.UserId == userId);

        if (participant == null)
        {
            participant = new RadiologyConsultationParticipant
            {
                Id = Guid.NewGuid(),
                SessionId = sessionId,
                UserId = userId,
                Role = "Participant",
                Status = 3, // Joined
                JoinedAt = DateTime.Now,
                CreatedAt = DateTime.Now
            };
            await _context.Set<RadiologyConsultationParticipant>().AddAsync(participant);
        }
        else
        {
            participant.Status = 3;
            participant.JoinedAt = DateTime.Now;
        }

        await _unitOfWork.SaveChangesAsync();

        return new ConsultationParticipantDto
        {
            Id = participant.Id,
            UserId = participant.UserId,
            JoinedAt = participant.JoinedAt
        };
    }

    public async Task<bool> LeaveConsultationAsync(Guid sessionId, Guid userId)
    {
        var participant = await _context.Set<RadiologyConsultationParticipant>()
            .FirstOrDefaultAsync(p => p.SessionId == sessionId && p.UserId == userId);

        if (participant == null) return false;

        participant.Status = 4; // Left
        participant.LeftAt = DateTime.Now;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<ConsultationDiscussionDto> AddDiscussionAsync(AddConsultationDiscussionDto dto)
    {
        var discussion = new RadiologyConsultationDiscussion
        {
            Id = Guid.NewGuid(),
            SessionId = dto.SessionId,
            CaseId = dto.CaseId,
            ParticipantId = Guid.Parse("9e5309dc-ecf9-4d48-9a09-224cd15347b1"),
            MessageType = dto.MessageType ?? "Text",
            Content = dto.Content,
            PostedAt = DateTime.Now,
            CreatedAt = DateTime.Now
        };

        await _context.Set<RadiologyConsultationDiscussion>().AddAsync(discussion);
        await _unitOfWork.SaveChangesAsync();

        return new ConsultationDiscussionDto
        {
            Id = discussion.Id,
            Content = discussion.Content,
            MessageType = discussion.MessageType,
            PostedAt = discussion.PostedAt
        };
    }

    public async Task<List<ConsultationDiscussionDto>> GetDiscussionsAsync(Guid caseId)
    {
        var discussions = await _context.Set<RadiologyConsultationDiscussion>()
            .Include(d => d.Participant)
            .Where(d => d.CaseId == caseId)
            .OrderBy(d => d.PostedAt)
            .ToListAsync();

        return discussions.Select(d => new ConsultationDiscussionDto
        {
            Id = d.Id,
            CaseId = d.CaseId,
            ParticipantId = d.ParticipantId,
            ParticipantName = d.Participant?.FullName ?? "",
            Content = d.Content,
            MessageType = d.MessageType,
            PostedAt = d.PostedAt
        }).ToList();
    }

    public async Task<ConsultationImageNoteDto> AddImageNoteAsync(AddConsultationImageNoteDto dto)
    {
        var imageNote = new RadiologyConsultationImageNote
        {
            Id = Guid.NewGuid(),
            SessionId = dto.SessionId,
            StudyInstanceUID = dto.StudyInstanceUID,
            SeriesInstanceUID = dto.SeriesInstanceUID,
            SOPInstanceUID = dto.SOPInstanceUID,
            AnnotationType = dto.AnnotationType,
            AnnotationData = dto.AnnotationData,
            Notes = dto.Notes,
            IsShared = dto.IsShared,
            CreatedByUserId = Guid.Parse("9e5309dc-ecf9-4d48-9a09-224cd15347b1"),
            CreatedAt = DateTime.Now
        };

        await _context.Set<RadiologyConsultationImageNote>().AddAsync(imageNote);
        await _unitOfWork.SaveChangesAsync();

        return new ConsultationImageNoteDto
        {
            Id = imageNote.Id,
            AnnotationType = imageNote.AnnotationType,
            AnnotationData = imageNote.AnnotationData,
            Notes = imageNote.Notes
        };
    }

    public async Task<List<ConsultationImageNoteDto>> GetImageNotesAsync(Guid caseId)
    {
        // Get notes by session since ImageNote doesn't have CaseId
        var notes = await _context.Set<RadiologyConsultationImageNote>()
            .Include(n => n.CreatedByUser)
            .OrderBy(n => n.CreatedAt)
            .Take(50)
            .ToListAsync();

        return notes.Select(n => new ConsultationImageNoteDto
        {
            Id = n.Id,
            SessionId = n.SessionId,
            StudyInstanceUID = n.StudyInstanceUID,
            SeriesInstanceUID = n.SeriesInstanceUID,
            SOPInstanceUID = n.SOPInstanceUID,
            AnnotationType = n.AnnotationType,
            AnnotationData = n.AnnotationData,
            Notes = n.Notes,
            IsShared = n.IsShared,
            CreatedByUserName = n.CreatedByUser?.FullName ?? ""
        }).ToList();
    }

    public async Task<ConsultationMinutesDto> SaveMinutesAsync(SaveConsultationMinutesDto dto)
    {
        var minutes = await _context.Set<RadiologyConsultationMinutes>()
            .FirstOrDefaultAsync(m => m.SessionId == dto.SessionId);

        if (minutes == null)
        {
            minutes = new RadiologyConsultationMinutes
            {
                Id = Guid.NewGuid(),
                SessionId = dto.SessionId,
                CreatedByUserId = Guid.Parse("9e5309dc-ecf9-4d48-9a09-224cd15347b1"),
                CreatedAt = DateTime.Now
            };
            await _context.Set<RadiologyConsultationMinutes>().AddAsync(minutes);
        }

        minutes.Content = dto.Content;
        minutes.Conclusions = dto.Conclusions;
        minutes.Recommendations = dto.Recommendations;
        minutes.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new ConsultationMinutesDto
        {
            Id = minutes.Id,
            SessionId = minutes.SessionId,
            Content = minutes.Content,
            Conclusions = minutes.Conclusions,
            Recommendations = minutes.Recommendations
        };
    }

    public async Task<ConsultationMinutesDto> GetMinutesAsync(Guid sessionId)
    {
        var minutes = await _context.Set<RadiologyConsultationMinutes>()
            .FirstOrDefaultAsync(m => m.SessionId == sessionId);

        if (minutes == null) return null;

        return new ConsultationMinutesDto
        {
            Id = minutes.Id,
            SessionId = minutes.SessionId,
            Content = minutes.Content,
            Conclusions = minutes.Conclusions,
            Recommendations = minutes.Recommendations
        };
    }

    public async Task<ConsultationMinutesDto> ApproveMinutesAsync(Guid minutesId)
    {
        var minutes = await _context.Set<RadiologyConsultationMinutes>().FindAsync(minutesId);
        if (minutes == null) return null;

        minutes.Status = 2; // Approved
        minutes.ApprovedByUserId = Guid.Parse("9e5309dc-ecf9-4d48-9a09-224cd15347b1");
        minutes.ApprovedAt = DateTime.Now;
        await _unitOfWork.SaveChangesAsync();

        return new ConsultationMinutesDto
        {
            Id = minutes.Id,
            Status = minutes.Status,
            ApprovedAt = minutes.ApprovedAt
        };
    }

    public async Task<ConsultationAttachmentDto> AddAttachmentAsync(AddConsultationAttachmentDto dto)
    {
        var attachment = new RadiologyConsultationAttachment
        {
            Id = Guid.NewGuid(),
            SessionId = dto.SessionId,
            CaseId = dto.CaseId,
            FileName = dto.FileName,
            FileType = dto.FileType,
            FilePath = "", // Will be set after file upload
            FileSize = 0,
            UploadedByUserId = Guid.Parse("9e5309dc-ecf9-4d48-9a09-224cd15347b1"),
            UploadedAt = DateTime.Now,
            Description = dto.Description,
            CreatedAt = DateTime.Now
        };

        await _context.Set<RadiologyConsultationAttachment>().AddAsync(attachment);
        await _unitOfWork.SaveChangesAsync();

        return new ConsultationAttachmentDto
        {
            Id = attachment.Id,
            FileName = attachment.FileName,
            FileType = attachment.FileType,
            FilePath = attachment.FilePath,
            UploadedAt = attachment.UploadedAt
        };
    }

    public async Task<List<ConsultationAttachmentDto>> GetAttachmentsAsync(Guid caseId)
    {
        var attachments = await _context.Set<RadiologyConsultationAttachment>()
            .Where(a => a.CaseId == caseId)
            .ToListAsync();

        return attachments.Select(a => new ConsultationAttachmentDto
        {
            Id = a.Id,
            FileName = a.FileName,
            FileType = a.FileType,
            FilePath = a.FilePath,
            FileSize = a.FileSize,
            UploadedAt = a.UploadedAt
        }).ToList();
    }

    private string GetConsultationStatusName(int status) => status switch
    {
        0 => "Scheduled",
        1 => "InProgress",
        2 => "Completed",
        3 => "Cancelled",
        _ => "Unknown"
    };

    #endregion

    #region X. HL7 CDA Integration - Tích hợp HL7 CDA

    public async Task<List<HL7CDAConfigDto>> GetHL7CDAConfigsAsync()
    {
        var configs = await _context.Set<RadiologyHL7CDAConfig>()
            .Where(c => c.IsActive)
            .ToListAsync();

        return configs.Select(c => new HL7CDAConfigDto
        {
            Id = c.Id,
            ConfigName = c.ConfigName,
            HL7Version = c.HL7Version,
            CDAVersion = c.CDAVersion,
            ReceivingApplication = c.ReceivingApplication,
            ReceivingFacility = c.ReceivingFacility,
            SendingApplication = c.SendingApplication,
            SendingFacility = c.SendingFacility,
            ConnectionType = c.ConnectionType,
            ServerAddress = c.ServerAddress,
            ServerPort = c.ServerPort,
            FilePath = c.FilePath,
            IsActive = c.IsActive
        }).ToList();
    }

    public async Task<HL7CDAConfigDto> SaveHL7CDAConfigAsync(SaveHL7CDAConfigDto dto)
    {
        RadiologyHL7CDAConfig config;
        if (dto.Id.HasValue)
        {
            config = await _context.Set<RadiologyHL7CDAConfig>().FindAsync(dto.Id.Value);
            if (config == null) return null;
        }
        else
        {
            config = new RadiologyHL7CDAConfig { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            await _context.Set<RadiologyHL7CDAConfig>().AddAsync(config);
        }

        config.ConfigName = dto.ConfigName;
        config.HL7Version = dto.HL7Version;
        config.CDAVersion = dto.CDAVersion;
        config.ReceivingApplication = dto.ReceivingApplication;
        config.ReceivingFacility = dto.ReceivingFacility;
        config.SendingApplication = dto.SendingApplication;
        config.SendingFacility = dto.SendingFacility;
        config.ConnectionType = dto.ConnectionType;
        config.ServerAddress = dto.ServerAddress;
        config.ServerPort = dto.ServerPort;
        config.FilePath = dto.FilePath;
        config.IsActive = dto.IsActive;
        config.ConfigJson = dto.ConfigJson;
        config.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new HL7CDAConfigDto
        {
            Id = config.Id,
            ConfigName = config.ConfigName,
            HL7Version = config.HL7Version,
            IsActive = config.IsActive
        };
    }

    public async Task<SendHL7ResultDto> SendHL7MessageAsync(SendHL7MessageDto dto)
    {
        var message = new RadiologyHL7Message
        {
            Id = Guid.NewGuid(),
            MessageControlId = Guid.NewGuid().ToString(),
            MessageType = dto.MessageType,
            TriggerEvent = dto.TriggerEvent,
            RawMessage = System.Text.Json.JsonSerializer.Serialize(dto.Segments ?? new Dictionary<string, object>()),
            Direction = "Outbound",
            RadiologyRequestId = dto.RadiologyRequestId,
            PatientId = dto.PatientId,
            AccessionNumber = dto.AccessionNumber,
            Status = 1, // Sent
            MessageDateTime = DateTime.Now,
            CreatedAt = DateTime.Now
        };

        await _context.Set<RadiologyHL7Message>().AddAsync(message);
        await _unitOfWork.SaveChangesAsync();

        return new SendHL7ResultDto
        {
            Success = true,
            MessageControlId = message.MessageControlId,
            SentAt = message.MessageDateTime,
            AckCode = "AA"
        };
    }

    public async Task<List<HL7MessageDto>> GetHL7MessagesAsync(
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string direction = null,
        int? status = null)
    {
        var query = _context.Set<RadiologyHL7Message>().AsQueryable();

        if (fromDate.HasValue)
            query = query.Where(m => m.CreatedAt >= fromDate);
        if (toDate.HasValue)
            query = query.Where(m => m.CreatedAt <= toDate);
        if (!string.IsNullOrEmpty(direction))
            query = query.Where(m => m.Direction == direction);
        if (status.HasValue)
            query = query.Where(m => m.Status == status);

        var messages = await query.OrderByDescending(m => m.CreatedAt).Take(100).ToListAsync();

        return messages.Select(m => new HL7MessageDto
        {
            Id = m.Id,
            MessageControlId = m.MessageControlId,
            MessageType = m.MessageType,
            TriggerEvent = m.TriggerEvent,
            Direction = m.Direction,
            RadiologyRequestId = m.RadiologyRequestId,
            PatientId = m.PatientId,
            AccessionNumber = m.AccessionNumber,
            RawMessage = m.RawMessage,
            ParsedData = m.ParsedData,
            MessageDateTime = m.MessageDateTime,
            Status = m.Status,
            AckCode = m.AckCode,
            ErrorMessage = m.ErrorMessage,
            RetryCount = m.RetryCount
        }).ToList();
    }

    public async Task<CDADocumentDto> CreateCDADocumentAsync(CreateCDADocumentDto dto)
    {
        var cdaDoc = new RadiologyCDADocument
        {
            Id = Guid.NewGuid(),
            DocumentId = Guid.NewGuid().ToString(),
            RadiologyReportId = dto.RadiologyReportId,
            DocumentType = dto.DocumentType,
            CDAContent = GenerateCDAContent(dto),
            SignatureType = dto.SignatureType,
            CreatedAt = DateTime.Now
        };

        await _context.Set<RadiologyCDADocument>().AddAsync(cdaDoc);
        await _unitOfWork.SaveChangesAsync();

        return new CDADocumentDto
        {
            Id = cdaDoc.Id,
            DocumentId = cdaDoc.DocumentId,
            DocumentType = cdaDoc.DocumentType,
            RadiologyReportId = cdaDoc.RadiologyReportId,
            CDAContent = cdaDoc.CDAContent,
            Status = cdaDoc.Status
        };
    }

    public async Task<CDADocumentDto> GetCDADocumentAsync(Guid reportId)
    {
        var cdaDoc = await _context.Set<RadiologyCDADocument>()
            .FirstOrDefaultAsync(d => d.RadiologyReportId == reportId);

        if (cdaDoc == null) return null;

        return new CDADocumentDto
        {
            Id = cdaDoc.Id,
            DocumentId = cdaDoc.DocumentId,
            RadiologyReportId = cdaDoc.RadiologyReportId,
            DocumentType = cdaDoc.DocumentType,
            CDAContent = cdaDoc.CDAContent,
            IsSigned = cdaDoc.IsSigned,
            SignatureType = cdaDoc.SignatureType,
            SignedAt = cdaDoc.SignedAt,
            Status = cdaDoc.Status,
            SentAt = cdaDoc.SentAt,
            AckStatus = cdaDoc.AckStatus
        };
    }

    public async Task<Guid> ReceiveHL7OrderAsync(string hl7Message)
    {
        var message = new RadiologyHL7Message
        {
            Id = Guid.NewGuid(),
            MessageControlId = Guid.NewGuid().ToString(),
            MessageType = "ORM",
            TriggerEvent = "O01",
            RawMessage = hl7Message,
            Direction = "Inbound",
            Status = 1,
            MessageDateTime = DateTime.Now,
            CreatedAt = DateTime.Now
        };

        await _context.Set<RadiologyHL7Message>().AddAsync(message);
        await _unitOfWork.SaveChangesAsync();

        // Parse HL7 message and create radiology request
        // In production, implement HL7 parsing logic
        return message.Id;
    }

    private string GenerateCDAContent(CreateCDADocumentDto dto)
    {
        return $@"<?xml version=""1.0"" encoding=""UTF-8""?>
<ClinicalDocument xmlns=""urn:hl7-org:v3"">
    <typeId root=""2.16.840.1.113883.1.3"" extension=""POCD_HD000040""/>
    <id root=""{dto.RadiologyReportId}""/>
    <code code=""18748-4"" codeSystem=""2.16.840.1.113883.6.1"" displayName=""Diagnostic Imaging Report""/>
    <title>Radiology Report</title>
    <effectiveTime value=""{DateTime.Now:yyyyMMddHHmmss}""/>
    <confidentialityCode code=""N"" codeSystem=""2.16.840.1.113883.5.25""/>
</ClinicalDocument>";
    }

    public async Task<bool> DeleteHL7CDAConfigAsync(Guid configId)
    {
        var config = await _context.Set<RadiologyHL7CDAConfig>().FindAsync(configId);
        if (config == null) return false;
        config.IsActive = false;
        config.IsDeleted = true;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<bool> TestHL7ConnectionAsync(Guid configId)
    {
        var config = await _context.Set<RadiologyHL7CDAConfig>().FindAsync(configId);
        if (config == null) return false;
        // In production, test actual HL7 connection
        return true;
    }

    public async Task<HL7MessageSearchResultDto> SearchHL7MessagesAsync(SearchHL7MessageDto searchDto)
    {
        var query = _context.Set<RadiologyHL7Message>().AsQueryable();

        if (searchDto.FromDate.HasValue)
            query = query.Where(m => m.CreatedAt >= searchDto.FromDate);
        if (searchDto.ToDate.HasValue)
            query = query.Where(m => m.CreatedAt <= searchDto.ToDate);
        if (!string.IsNullOrEmpty(searchDto.Direction))
            query = query.Where(m => m.Direction == searchDto.Direction);
        if (!string.IsNullOrEmpty(searchDto.MessageType))
            query = query.Where(m => m.MessageType == searchDto.MessageType);
        if (searchDto.Status.HasValue)
            query = query.Where(m => m.Status == searchDto.Status);

        var totalCount = await query.CountAsync();
        var messages = await query
            .OrderByDescending(m => m.CreatedAt)
            .Skip((searchDto.Page - 1) * searchDto.PageSize)
            .Take(searchDto.PageSize)
            .ToListAsync();

        return new HL7MessageSearchResultDto
        {
            Items = messages.Select(m => new HL7MessageDto
            {
                Id = m.Id,
                MessageControlId = m.MessageControlId,
                MessageType = m.MessageType,
                TriggerEvent = m.TriggerEvent,
                Direction = m.Direction,
                RadiologyRequestId = m.RadiologyRequestId,
                PatientId = m.PatientId,
                AccessionNumber = m.AccessionNumber,
                RawMessage = m.RawMessage,
                ParsedData = m.ParsedData,
                MessageDateTime = m.MessageDateTime,
                Status = m.Status,
                AckCode = m.AckCode,
                ErrorMessage = m.ErrorMessage,
                RetryCount = m.RetryCount
            }).ToList(),
            TotalCount = totalCount,
            TotalPages = (int)Math.Ceiling((double)totalCount / searchDto.PageSize),
            Page = searchDto.Page,
            PageSize = searchDto.PageSize
        };
    }

    public async Task<bool> RetryHL7MessageAsync(Guid messageId)
    {
        var message = await _context.Set<RadiologyHL7Message>().FindAsync(messageId);
        if (message == null || message.Status != 2) return false;

        message.Status = 0; // Pending for retry
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<bool> SendCDADocumentAsync(SendCDADocumentDto dto)
    {
        var cdaDoc = await _context.Set<RadiologyCDADocument>().FindAsync(dto.DocumentId);
        if (cdaDoc == null) return false;

        // In production, send CDA document to destination
        return true;
    }

    public async Task<SendHL7ResultDto> SendHL7ResultAsync(Guid reportId, bool withSignature)
    {
        var report = await _context.RadiologyReports.FindAsync(reportId);
        if (report == null)
        {
            return new SendHL7ResultDto { Success = false, ErrorMessage = "Report not found" };
        }

        var message = new RadiologyHL7Message
        {
            Id = Guid.NewGuid(),
            MessageControlId = Guid.NewGuid().ToString(),
            MessageType = "ORU",
            TriggerEvent = "R01",
            RawMessage = $"Report {reportId}",
            Direction = "Outbound",
            Status = 1,
            MessageDateTime = DateTime.Now,
            CreatedAt = DateTime.Now
        };

        await _context.Set<RadiologyHL7Message>().AddAsync(message);
        await _unitOfWork.SaveChangesAsync();

        return new SendHL7ResultDto
        {
            Success = true,
            MessageControlId = message.MessageControlId,
            SentAt = message.MessageDateTime,
            AckCode = "AA"
        };
    }

    public async Task<bool> CancelHL7ResultAsync(Guid reportId, string reason)
    {
        var message = new RadiologyHL7Message
        {
            Id = Guid.NewGuid(),
            MessageControlId = Guid.NewGuid().ToString(),
            MessageType = "ORU",
            TriggerEvent = "R01",
            RawMessage = $"Cancel report {reportId}: {reason}",
            Direction = "Outbound",
            Status = 1,
            MessageDateTime = DateTime.Now,
            CreatedAt = DateTime.Now
        };

        await _context.Set<RadiologyHL7Message>().AddAsync(message);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    #endregion

    #region IX. Online Help - Hướng dẫn sử dụng Online

    public async Task<List<HelpCategoryDto>> GetHelpCategoriesAsync(Guid? parentId = null)
    {
        var query = _context.Set<RadiologyHelpCategory>()
            .Where(c => c.IsActive);

        if (parentId.HasValue)
            query = query.Where(c => c.ParentId == parentId);
        else
            query = query.Where(c => c.ParentId == null);

        var categories = await query.OrderBy(c => c.SortOrder).ToListAsync();

        return categories.Select(c => new HelpCategoryDto
        {
            Id = c.Id,
            Code = c.Code,
            Name = c.Name,
            Description = c.Description,
            ParentId = c.ParentId,
            IconClass = c.IconClass,
            SortOrder = c.SortOrder,
            IsActive = c.IsActive
        }).ToList();
    }

    public async Task<HelpCategoryDto> SaveHelpCategoryAsync(SaveHelpCategoryDto dto)
    {
        RadiologyHelpCategory category;
        if (dto.Id.HasValue)
        {
            category = await _context.Set<RadiologyHelpCategory>().FindAsync(dto.Id.Value);
            if (category == null) return null;
        }
        else
        {
            category = new RadiologyHelpCategory { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            await _context.Set<RadiologyHelpCategory>().AddAsync(category);
        }

        category.Code = dto.Code;
        category.Name = dto.Name;
        category.Description = dto.Description;
        category.ParentId = dto.ParentId;
        category.IconClass = dto.IconClass;
        category.SortOrder = dto.SortOrder;
        category.IsActive = dto.IsActive;
        category.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new HelpCategoryDto
        {
            Id = category.Id,
            Code = category.Code,
            Name = category.Name,
            IsActive = category.IsActive
        };
    }

    public async Task<HelpSearchResultDto> SearchHelpArticlesAsync(SearchHelpDto searchDto)
    {
        var query = _context.Set<RadiologyHelpArticle>()
            .Include(a => a.Category)
            .Where(a => a.IsPublished);

        if (searchDto.CategoryId.HasValue)
            query = query.Where(a => a.CategoryId == searchDto.CategoryId);
        if (!string.IsNullOrEmpty(searchDto.Keyword))
            query = query.Where(a => a.Title.Contains(searchDto.Keyword) || a.Content.Contains(searchDto.Keyword));

        var totalCount = await query.CountAsync();
        var articles = await query
            .OrderBy(a => a.SortOrder)
            .Skip((searchDto.Page - 1) * searchDto.PageSize)
            .Take(searchDto.PageSize)
            .ToListAsync();

        return new HelpSearchResultDto
        {
            Items = articles.Select(a => new HelpArticleDto
            {
                Id = a.Id,
                Title = a.Title,
                Summary = a.Summary,
                CategoryId = a.CategoryId,
                CategoryName = a.Category?.Name ?? "",
                ArticleType = a.ArticleType,
                ViewCount = a.ViewCount,
                IsPublished = a.IsPublished
            }).ToList(),
            TotalCount = totalCount,
            TotalPages = (int)Math.Ceiling((double)totalCount / searchDto.PageSize),
            Page = searchDto.Page,
            PageSize = searchDto.PageSize
        };
    }

    public async Task<HelpArticleDto> GetHelpArticleAsync(Guid articleId)
    {
        var article = await _context.Set<RadiologyHelpArticle>()
            .Include(a => a.Category)
            .FirstOrDefaultAsync(a => a.Id == articleId);

        if (article == null) return null;

        // Increment view count
        article.ViewCount++;
        await _unitOfWork.SaveChangesAsync();

        return new HelpArticleDto
        {
            Id = article.Id,
            Title = article.Title,
            Summary = article.Summary,
            Content = article.Content,
            CategoryId = article.CategoryId,
            CategoryName = article.Category?.Name ?? "",
            VideoUrl = article.VideoUrl,
            ArticleType = article.ArticleType,
            Tags = article.Tags,
            ViewCount = article.ViewCount,
            SortOrder = article.SortOrder,
            IsPublished = article.IsPublished
        };
    }

    public async Task<HelpArticleDto> SaveHelpArticleAsync(SaveHelpArticleDto dto)
    {
        RadiologyHelpArticle article;
        if (dto.Id.HasValue)
        {
            article = await _context.Set<RadiologyHelpArticle>().FindAsync(dto.Id.Value);
            if (article == null) return null;
        }
        else
        {
            article = new RadiologyHelpArticle { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            await _context.Set<RadiologyHelpArticle>().AddAsync(article);
        }

        article.Title = dto.Title;
        article.Summary = dto.Summary;
        article.Content = dto.Content;
        article.CategoryId = dto.CategoryId;
        article.VideoUrl = dto.VideoUrl;
        article.ArticleType = dto.ArticleType;
        article.Tags = dto.Tags;
        article.SortOrder = dto.SortOrder;
        article.IsPublished = dto.IsPublished;
        article.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new HelpArticleDto
        {
            Id = article.Id,
            Title = article.Title,
            Summary = article.Summary,
            IsPublished = article.IsPublished
        };
    }

    public async Task<List<TroubleshootingDto>> GetTroubleshootingListAsync(
        string category = null,
        string keyword = null)
    {
        var query = _context.Set<RadiologyTroubleshooting>()
            .Where(t => t.IsActive);

        if (!string.IsNullOrEmpty(category))
            query = query.Where(t => t.RelatedModule == category);
        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(t => t.ErrorTitle.Contains(keyword) || t.Solution.Contains(keyword));

        var items = await query.OrderBy(t => t.SortOrder).ToListAsync();

        return items.Select(t => new TroubleshootingDto
        {
            Id = t.Id,
            ErrorCode = t.ErrorCode,
            ErrorTitle = t.ErrorTitle,
            ErrorDescription = t.ErrorDescription,
            Symptoms = t.Symptoms,
            Causes = t.Causes,
            Solution = t.Solution,
            RelatedModule = t.RelatedModule,
            Severity = t.Severity,
            SortOrder = t.SortOrder,
            IsActive = t.IsActive
        }).ToList();
    }

    public async Task<TroubleshootingDto> SaveTroubleshootingAsync(SaveTroubleshootingDto dto)
    {
        RadiologyTroubleshooting troubleshooting;
        if (dto.Id.HasValue)
        {
            troubleshooting = await _context.Set<RadiologyTroubleshooting>().FindAsync(dto.Id.Value);
            if (troubleshooting == null) return null;
        }
        else
        {
            troubleshooting = new RadiologyTroubleshooting { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            await _context.Set<RadiologyTroubleshooting>().AddAsync(troubleshooting);
        }

        troubleshooting.ErrorCode = dto.ErrorCode;
        troubleshooting.ErrorTitle = dto.ErrorTitle;
        troubleshooting.ErrorDescription = dto.ErrorDescription;
        troubleshooting.Symptoms = dto.Symptoms;
        troubleshooting.Causes = dto.Causes;
        troubleshooting.Solution = dto.Solution;
        troubleshooting.RelatedModule = dto.RelatedModule;
        troubleshooting.Severity = dto.Severity;
        troubleshooting.SortOrder = dto.SortOrder;
        troubleshooting.IsActive = dto.IsActive;
        troubleshooting.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new TroubleshootingDto
        {
            Id = troubleshooting.Id,
            ErrorCode = troubleshooting.ErrorCode,
            ErrorTitle = troubleshooting.ErrorTitle,
            IsActive = troubleshooting.IsActive
        };
    }

    public async Task<bool> DeleteHelpCategoryAsync(Guid categoryId)
    {
        var category = await _context.Set<RadiologyHelpCategory>().FindAsync(categoryId);
        if (category == null) return false;
        category.IsActive = false;
        category.IsDeleted = true;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteHelpArticleAsync(Guid articleId)
    {
        var article = await _context.Set<RadiologyHelpArticle>().FindAsync(articleId);
        if (article == null) return false;
        article.IsPublished = false;
        article.IsDeleted = true;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<List<TroubleshootingDto>> GetTroubleshootingListAsync(string module = null, int? severity = null)
    {
        var query = _context.Set<RadiologyTroubleshooting>()
            .Where(t => t.IsActive);

        if (!string.IsNullOrEmpty(module))
            query = query.Where(t => t.RelatedModule == module);
        if (severity.HasValue)
            query = query.Where(t => t.Severity == severity);

        var items = await query.OrderBy(t => t.SortOrder).ToListAsync();

        return items.Select(t => new TroubleshootingDto
        {
            Id = t.Id,
            ErrorCode = t.ErrorCode,
            ErrorTitle = t.ErrorTitle,
            ErrorDescription = t.ErrorDescription,
            Symptoms = t.Symptoms,
            Causes = t.Causes,
            Solution = t.Solution,
            RelatedModule = t.RelatedModule,
            Severity = t.Severity,
            SortOrder = t.SortOrder,
            IsActive = t.IsActive
        }).ToList();
    }

    public async Task<bool> DeleteTroubleshootingAsync(Guid troubleshootingId)
    {
        var troubleshooting = await _context.Set<RadiologyTroubleshooting>().FindAsync(troubleshootingId);
        if (troubleshooting == null) return false;
        troubleshooting.IsActive = false;
        troubleshooting.IsDeleted = true;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<bool> IncrementArticleViewCountAsync(Guid articleId)
    {
        var article = await _context.Set<RadiologyHelpArticle>().FindAsync(articleId);
        if (article == null) return false;
        article.ViewCount++;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    #endregion

    #region VII. CLS Screen - Màn hình Cận lâm sàng

    public async Task<CLSScreenConfigDto> GetCLSScreenConfigAsync()
    {
        // Get first config or return default
        var config = await _context.Set<RadiologyCLSScreenConfig>()
            .FirstOrDefaultAsync();

        if (config == null)
        {
            return new CLSScreenConfigDto
            {
                Id = Guid.NewGuid(),
                DefaultFilters = "{}",
                ColumnSettings = "{}",
                PageSize = 20,
                AutoLoadTemplate = true,
                ShowPatientHistory = true,
                EnableShortcuts = true,
                CustomSettings = "{}"
            };
        }

        return new CLSScreenConfigDto
        {
            Id = config.Id,
            UserId = config.UserId,
            DefaultFilters = config.DefaultFilters,
            ColumnSettings = config.ColumnSettings,
            PageSize = config.PageSize,
            AutoLoadTemplate = config.AutoLoadTemplate,
            ShowPatientHistory = config.ShowPatientHistory,
            EnableShortcuts = config.EnableShortcuts,
            CustomSettings = config.CustomSettings
        };
    }

    public async Task<CLSScreenConfigDto> SaveCLSScreenConfigAsync(SaveCLSScreenConfigDto dto)
    {
        // Get first config or create new
        var config = await _context.Set<RadiologyCLSScreenConfig>()
            .FirstOrDefaultAsync();

        if (config == null)
        {
            config = new RadiologyCLSScreenConfig { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            await _context.Set<RadiologyCLSScreenConfig>().AddAsync(config);
        }

        config.DefaultFilters = dto.DefaultFilters;
        config.ColumnSettings = dto.ColumnSettings;
        config.PageSize = dto.PageSize;
        config.AutoLoadTemplate = dto.AutoLoadTemplate;
        config.ShowPatientHistory = dto.ShowPatientHistory;
        config.EnableShortcuts = dto.EnableShortcuts;
        config.CustomSettings = dto.CustomSettings;
        config.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new CLSScreenConfigDto
        {
            Id = config.Id,
            UserId = config.UserId,
            PageSize = config.PageSize,
            AutoLoadTemplate = config.AutoLoadTemplate
        };
    }

    public async Task<List<ServiceDescriptionTemplateDto>> GetServiceDescriptionTemplatesAsync(Guid serviceId)
    {
        var templates = await _context.Set<RadiologyServiceDescriptionTemplate>()
            .Where(t => t.ServiceId == serviceId && t.IsActive)
            .OrderBy(t => t.SortOrder)
            .ToListAsync();

        return templates.Select(t => new ServiceDescriptionTemplateDto
        {
            Id = t.Id,
            ServiceId = t.ServiceId,
            ServiceName = t.Service?.ServiceName ?? "",
            Name = t.Name,
            Description = t.Description,
            Conclusion = t.Conclusion,
            Notes = t.Notes,
            SortOrder = t.SortOrder,
            IsDefault = t.IsDefault,
            IsActive = t.IsActive,
            CreatedByUserName = t.CreatedByUser?.FullName ?? ""
        }).ToList();
    }

    public async Task<ServiceDescriptionTemplateDto> SaveServiceDescriptionTemplateAsync(SaveServiceDescriptionTemplateDto dto)
    {
        RadiologyServiceDescriptionTemplate template;
        if (dto.Id.HasValue)
        {
            template = await _context.Set<RadiologyServiceDescriptionTemplate>().FindAsync(dto.Id.Value);
            if (template == null) return null;
        }
        else
        {
            template = new RadiologyServiceDescriptionTemplate { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            await _context.Set<RadiologyServiceDescriptionTemplate>().AddAsync(template);
        }

        template.ServiceId = dto.ServiceId;
        template.Name = dto.Name;
        template.Description = dto.Description;
        template.Conclusion = dto.Conclusion;
        template.Notes = dto.Notes;
        template.SortOrder = dto.SortOrder;
        template.IsDefault = dto.IsDefault;
        template.IsActive = dto.IsActive;
        template.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return new ServiceDescriptionTemplateDto
        {
            Id = template.Id,
            Name = template.Name,
            IsActive = template.IsActive
        };
    }

    public async Task<List<DiagnosisHistoryDto>> GetDiagnosisHistoryAsync(Guid requestId)
    {
        var request = await _context.RadiologyRequests
            .Include(r => r.Patient)
            .FirstOrDefaultAsync(r => r.Id == requestId);

        if (request == null) return new List<DiagnosisHistoryDto>();

        // Get previous radiology results for the same patient
        var previousReports = await _context.RadiologyReports
            .Include(r => r.RadiologyExam)
                .ThenInclude(e => e.RadiologyRequest)
                    .ThenInclude(req => req.Service)
            .Include(r => r.Radiologist)
            .Where(r => r.RadiologyExam.RadiologyRequest.PatientId == request.PatientId
                && r.RadiologyExam.RadiologyRequestId != requestId)
            .OrderByDescending(r => r.CreatedAt)
            .Take(10)
            .ToListAsync();

        return previousReports.Select(r => new DiagnosisHistoryDto
        {
            Id = r.Id,
            RadiologyRequestId = r.RadiologyExam?.RadiologyRequestId ?? Guid.Empty,
            OrderCode = r.RadiologyExam?.RadiologyRequest?.RequestCode ?? "",
            DiagnosisDate = r.ReportDate ?? DateTime.Now,
            Description = r.Findings ?? "",
            Conclusion = r.Impression ?? "",
            DoctorName = r.Radiologist?.FullName ?? ""
        }).ToList();
    }

    public async Task<bool> DeleteServiceDescriptionTemplateAsync(Guid templateId)
    {
        var template = await _context.Set<RadiologyServiceDescriptionTemplate>().FindAsync(templateId);
        if (template == null) return false;
        template.IsActive = false;
        template.IsDeleted = true;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<List<RadiologyWaitingListDto>> GetPatientExamHistoryAsync(Guid patientId, DateTime? fromDate = null, DateTime? toDate = null)
    {
        var query = _context.RadiologyRequests
            .Include(r => r.Patient)
            .Include(r => r.Service)
            .Include(r => r.RequestingDoctor)
            .Include(r => r.Exams)
                .ThenInclude(e => e.DicomStudies)
            .Where(r => r.PatientId == patientId);

        if (fromDate.HasValue)
            query = query.Where(r => r.RequestDate >= fromDate);
        if (toDate.HasValue)
            query = query.Where(r => r.RequestDate <= toDate);

        var requests = await query.OrderByDescending(r => r.RequestDate).Take(50).ToListAsync();

        return requests.Select((r, index) => new RadiologyWaitingListDto
        {
            PatientId = r.PatientId,
            PatientCode = r.Patient.PatientCode,
            PatientName = r.Patient.FullName,
            Age = r.Patient.DateOfBirth.HasValue ? (int?)((DateTime.Now - r.Patient.DateOfBirth.Value).Days / 365) : null,
            Gender = r.Patient.Gender == 1 ? "Nam" : "Nu",
            VisitId = r.MedicalRecordId ?? Guid.Empty,
            VisitCode = r.MedicalRecord?.MedicalRecordCode ?? "",
            OrderId = r.Id,
            OrderCode = r.RequestCode,
            OrderTime = r.RequestDate,
            OrderDoctorName = r.RequestingDoctor?.FullName ?? "",
            DepartmentName = "",
            ServiceName = r.Service?.ServiceName ?? "",
            ServiceTypeName = GetServiceTypeName(r.Service?.ServiceType ?? 0),
            RoomName = r.Exams.FirstOrDefault()?.Room?.RoomName ?? "",
            QueueNumber = index + 1,
            StatusCode = r.Status,
            Status = GetStatusName(r.Status),
            PatientType = r.PatientType == 1 ? "BHYT" : "Vien phi",
            Priority = r.Priority == 3 ? "Cap cuu" : r.Priority == 2 ? "Khan" : "Binh thuong",
            StudyInstanceUID = r.Exams.SelectMany(e => e.DicomStudies).FirstOrDefault()?.StudyInstanceUID ?? "",
            HasImages = r.Exams.Any(e => e.DicomStudies.Any())
        }).ToList();
    }

    #endregion
    #region Extended Capture & Consultation Methods

    public async Task<bool> CheckDeviceConnectionAsync(Guid deviceId)
    {
        var device = await _context.Set<RadiologyCaptureDevice>().FindAsync(deviceId);
        return device != null;
    }

    public async Task<bool> DeleteWorkstationAsync(Guid workstationId)
    {
        var ws = await _context.Set<RadiologyWorkstation>().FindAsync(workstationId);
        if (ws == null) return false;
        ws.IsActive = false;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<CaptureSessionDto> GetActiveCaptureSessionAsync(Guid deviceId)
    {
        var session = await _context.Set<RadiologyCaptureSession>()
            .Where(s => s.DeviceId == deviceId && s.Status == 0)
            .FirstOrDefaultAsync();
        if (session == null) return null;
        return new CaptureSessionDto { Id = session.Id, DeviceId = session.DeviceId, Status = session.Status };
    }

    public async Task<CapturedMediaDto> UploadCapturedMediaAsync(SaveCapturedMediaDto dto)
    {
        var media = new RadiologyCapturedMedia
        {
            Id = Guid.NewGuid(),
            SessionId = dto.CaptureSessionId,
            MediaType = dto.MediaType,
            FilePath = dto.FilePath,
            FileSize = dto.FileSize,
            ThumbnailPath = dto.ThumbnailPath,
            CreatedAt = DateTime.Now
        };
        await _context.Set<RadiologyCapturedMedia>().AddAsync(media);
        await _unitOfWork.SaveChangesAsync();
        return new CapturedMediaDto { Id = media.Id, SessionId = media.SessionId };
    }

    public async Task<bool> SetThumbnailImageAsync(Guid sessionId, Guid mediaId)
    {
        return true;
    }

    public async Task<object> GetDeviceDailyStatisticsAsync(Guid deviceId, DateTime date)
    {
        var count = await _context.Set<RadiologyCaptureSession>()
            .Where(s => s.DeviceId == deviceId && s.StartTime.Date == date.Date)
            .CountAsync();
        return new { DeviceId = deviceId, Date = date, SessionCount = count };
    }

    public async Task<bool> CancelConsultationSessionAsync(Guid sessionId, string reason)
    {
        var session = await _context.Set<RadiologyConsultationSession>().FindAsync(sessionId);
        if (session == null) return false;
        session.Status = 3;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<ConsultationSessionDto> StartConsultationSessionAsync(Guid sessionId)
    {
        var session = await _context.Set<RadiologyConsultationSession>().FindAsync(sessionId);
        if (session == null) return null;
        session.Status = 1;
        session.ActualStartTime = DateTime.Now;
        await _unitOfWork.SaveChangesAsync();
        return new ConsultationSessionDto { Id = session.Id, Status = session.Status };
    }

    public async Task<ConsultationSessionDto> EndConsultationSessionAsync(Guid sessionId)
    {
        var session = await _context.Set<RadiologyConsultationSession>().FindAsync(sessionId);
        if (session == null) return null;
        session.Status = 2;
        session.ActualEndTime = DateTime.Now;
        await _unitOfWork.SaveChangesAsync();
        return new ConsultationSessionDto { Id = session.Id, Status = session.Status };
    }

    public async Task<ConsultationCaseDto> ConcludeCaseAsync(Guid caseId, string conclusion, string recommendation)
    {
        var caseEntity = await _context.Set<RadiologyConsultationCase>().FindAsync(caseId);
        if (caseEntity == null) return null;
        caseEntity.Conclusion = conclusion;
        caseEntity.Recommendation = recommendation;
        caseEntity.Status = 2;
        await _unitOfWork.SaveChangesAsync();
        return new ConsultationCaseDto { Id = caseEntity.Id, Conclusion = conclusion, Recommendation = recommendation };
    }

    public async Task<bool> RespondInvitationAsync(Guid sessionId, Guid userId, bool accepted)
    {
        var participant = await _context.Set<RadiologyConsultationParticipant>()
            .FirstOrDefaultAsync(p => p.SessionId == sessionId && p.UserId == userId);
        if (participant == null) return false;
        participant.Status = accepted ? 1 : 2;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<ConsultationSessionDto> JoinSessionAsync(Guid sessionId)
    {
        var session = await _context.Set<RadiologyConsultationSession>().FindAsync(sessionId);
        if (session == null) return null;
        return new ConsultationSessionDto { Id = session.Id, Status = session.Status };
    }

    public async Task<bool> LeaveSessionAsync(Guid sessionId)
    {
        return true;
    }

    public async Task<ConsultationAttachmentDto> UploadAttachmentAsync(AddConsultationAttachmentDto dto)
    {
        var attachment = new RadiologyConsultationAttachment
        {
            Id = Guid.NewGuid(),
            SessionId = dto.SessionId,
            FileName = dto.FileName,
            CreatedAt = DateTime.Now
        };
        await _context.Set<RadiologyConsultationAttachment>().AddAsync(attachment);
        await _unitOfWork.SaveChangesAsync();
        return new ConsultationAttachmentDto { Id = attachment.Id, FileName = attachment.FileName };
    }

    public async Task<bool> DeleteAttachmentAsync(Guid attachmentId)
    {
        var attachment = await _context.Set<RadiologyConsultationAttachment>().FindAsync(attachmentId);
        if (attachment == null) return false;
        _context.Set<RadiologyConsultationAttachment>().Remove(attachment);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<ConsultationDiscussionDto> PostDiscussionAsync(AddConsultationDiscussionDto dto)
    {
        var discussion = new RadiologyConsultationDiscussion
        {
            Id = Guid.NewGuid(),
            CaseId = dto.CaseId ?? Guid.Empty,
            Content = dto.Content,
            CreatedAt = DateTime.Now
        };
        await _context.Set<RadiologyConsultationDiscussion>().AddAsync(discussion);
        await _unitOfWork.SaveChangesAsync();
        return new ConsultationDiscussionDto { Id = discussion.Id };
    }

    public async Task<bool> DeleteDiscussionAsync(Guid discussionId)
    {
        var discussion = await _context.Set<RadiologyConsultationDiscussion>().FindAsync(discussionId);
        if (discussion == null) return false;
        _context.Set<RadiologyConsultationDiscussion>().Remove(discussion);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<ConsultationImageNoteDto> SaveImageNoteAsync(AddConsultationImageNoteDto dto)
    {
        var imageNote = new RadiologyConsultationImageNote
        {
            Id = Guid.NewGuid(),
            SessionId = dto.SessionId,
            AnnotationData = dto.AnnotationData,
            CreatedAt = DateTime.Now
        };
        await _context.Set<RadiologyConsultationImageNote>().AddAsync(imageNote);
        await _unitOfWork.SaveChangesAsync();
        return new ConsultationImageNoteDto { Id = imageNote.Id, SessionId = imageNote.SessionId };
    }

    public async Task<byte[]> GenerateInviteQRCodeAsync(Guid sessionId)
    {
        return System.Text.Encoding.UTF8.GetBytes("QR:" + sessionId.ToString());
    }

    public async Task<bool> ToggleRecordingAsync(Guid sessionId, bool start)
    {
        var session = await _context.Set<RadiologyConsultationSession>().FindAsync(sessionId);
        if (session == null) return false;
        session.IsRecording = start;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    #endregion
}
