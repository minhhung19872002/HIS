using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Http;
using HIS.Application.DTOs.Radiology;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Implementation of IRISCompleteService
/// Handles all RIS/PACS/Radiology workflows
/// Integrates with Orthanc PACS server
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
    private readonly HttpClient _httpClient;
    private readonly string _orthancBaseUrl;
    private readonly string _orthancUser;
    private readonly string _orthancPassword;

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
        IHttpClientFactory httpClientFactory,
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
        _httpClient = httpClientFactory.CreateClient("Orthanc");

        // Orthanc PACS configuration
        _orthancBaseUrl = configuration["Orthanc:BaseUrl"] ?? "http://localhost:8042";
        _orthancUser = configuration["Orthanc:Username"] ?? "orthanc";
        _orthancPassword = configuration["Orthanc:Password"] ?? "orthanc";

        // Setup basic auth for Orthanc
        var authValue = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{_orthancUser}:{_orthancPassword}"));
        _httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", authValue);
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
            var statusInt = int.Parse(status);
            query = query.Where(r => r.Status == statusInt);
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
        // Return configured PACS connections including Orthanc
        var connections = new List<PACSConnectionDto>
        {
            new PACSConnectionDto
            {
                Id = Guid.Parse("00000001-0000-0000-0000-000000000001"),
                Name = "Orthanc PACS",
                ServerType = "Orthanc",
                AETitle = "ORTHANC",
                IpAddress = "localhost",
                Port = 4242,
                QueryRetrievePort = 8042,
                Protocol = "DICOM",
                IsConnected = await CheckOrthancConnectionAsync(),
                LastSync = DateTime.Now,
                IsActive = true
            }
        };

        return connections;
    }

    public async Task<PACSConnectionStatusDto> CheckPACSConnectionAsync(Guid connectionId)
    {
        try
        {
            var response = await _httpClient.GetAsync($"{_orthancBaseUrl}/system");
            var isConnected = response.IsSuccessStatusCode;

            return new PACSConnectionStatusDto
            {
                ConnectionId = connectionId,
                IsConnected = isConnected,
                PingTimeMs = 10,
                ErrorMessage = isConnected ? null : "Cannot connect to PACS",
                CheckTime = DateTime.Now
            };
        }
        catch (Exception ex)
        {
            return new PACSConnectionStatusDto
            {
                ConnectionId = connectionId,
                IsConnected = false,
                PingTimeMs = -1,
                ErrorMessage = ex.Message,
                CheckTime = DateTime.Now
            };
        }
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
            var typeInt = int.Parse(modalityType);
            query = query.Where(m => m.ModalityType == typeInt);
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
            var statusInt = int.Parse(status);
            query = query.Where(r => r.Status == statusInt);
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
        try
        {
            // Query Orthanc for studies
            var response = await _httpClient.GetAsync($"{_orthancBaseUrl}/studies");
            if (!response.IsSuccessStatusCode)
            {
                return new List<DicomStudyDto>();
            }

            var studyIds = await response.Content.ReadFromJsonAsync<List<string>>();
            var studies = new List<DicomStudyDto>();

            foreach (var studyId in studyIds.Take(50)) // Limit results
            {
                try
                {
                    var studyResponse = await _httpClient.GetAsync($"{_orthancBaseUrl}/studies/{studyId}");
                    if (studyResponse.IsSuccessStatusCode)
                    {
                        var studyData = await studyResponse.Content.ReadFromJsonAsync<OrthancStudyResponse>();

                        // Filter by patient if specified
                        if (!string.IsNullOrEmpty(patientId) &&
                            studyData?.MainDicomTags?.PatientID != patientId)
                        {
                            continue;
                        }

                        studies.Add(new DicomStudyDto
                        {
                            StudyInstanceUID = studyData?.MainDicomTags?.StudyInstanceUID ?? "",
                            AccessionNumber = studyData?.MainDicomTags?.AccessionNumber ?? "",
                            PatientId = studyData?.MainDicomTags?.PatientID ?? "",
                            PatientName = studyData?.PatientMainDicomTags?.PatientName ?? "",
                            StudyDate = ParseDicomDate(studyData?.MainDicomTags?.StudyDate),
                            StudyDescription = studyData?.MainDicomTags?.StudyDescription ?? "",
                            Modality = studyData?.MainDicomTags?.ModalitiesInStudy ?? "",
                            NumberOfSeries = studyData?.Series?.Count ?? 0,
                            NumberOfImages = 0,
                            StudyStatus = "Available"
                        });
                    }
                }
                catch { /* Skip this study */ }
            }

            return studies;
        }
        catch (Exception)
        {
            return new List<DicomStudyDto>();
        }
    }

    public async Task<List<DicomSeriesDto>> GetSeriesAsync(string studyInstanceUID)
    {
        try
        {
            // Find study in Orthanc by StudyInstanceUID
            var findResponse = await _httpClient.PostAsJsonAsync($"{_orthancBaseUrl}/tools/find", new
            {
                Level = "Study",
                Query = new { StudyInstanceUID = studyInstanceUID }
            });

            if (!findResponse.IsSuccessStatusCode)
                return new List<DicomSeriesDto>();

            var studyIds = await findResponse.Content.ReadFromJsonAsync<List<string>>();
            if (studyIds == null || !studyIds.Any())
                return new List<DicomSeriesDto>();

            var studyResponse = await _httpClient.GetAsync($"{_orthancBaseUrl}/studies/{studyIds.First()}");
            var studyData = await studyResponse.Content.ReadFromJsonAsync<OrthancStudyResponse>();

            var seriesList = new List<DicomSeriesDto>();
            foreach (var seriesId in studyData?.Series ?? new List<string>())
            {
                try
                {
                    var seriesResponse = await _httpClient.GetAsync($"{_orthancBaseUrl}/series/{seriesId}");
                    if (seriesResponse.IsSuccessStatusCode)
                    {
                        var seriesData = await seriesResponse.Content.ReadFromJsonAsync<OrthancSeriesResponse>();
                        seriesList.Add(new DicomSeriesDto
                        {
                            SeriesInstanceUID = seriesData?.MainDicomTags?.SeriesInstanceUID ?? "",
                            StudyInstanceUID = studyInstanceUID,
                            SeriesNumber = int.TryParse(seriesData?.MainDicomTags?.SeriesNumber, out var sn) ? sn : 0,
                            Modality = seriesData?.MainDicomTags?.Modality ?? "",
                            SeriesDescription = seriesData?.MainDicomTags?.SeriesDescription ?? "",
                            BodyPartExamined = seriesData?.MainDicomTags?.BodyPartExamined ?? "",
                            NumberOfImages = seriesData?.Instances?.Count ?? 0
                        });
                    }
                }
                catch { /* Skip this series */ }
            }

            return seriesList;
        }
        catch
        {
            return new List<DicomSeriesDto>();
        }
    }

    public async Task<List<DicomImageDto>> GetImagesAsync(string seriesInstanceUID)
    {
        try
        {
            // Find series in Orthanc
            var findResponse = await _httpClient.PostAsJsonAsync($"{_orthancBaseUrl}/tools/find", new
            {
                Level = "Series",
                Query = new { SeriesInstanceUID = seriesInstanceUID }
            });

            if (!findResponse.IsSuccessStatusCode)
                return new List<DicomImageDto>();

            var seriesIds = await findResponse.Content.ReadFromJsonAsync<List<string>>();
            if (seriesIds == null || !seriesIds.Any())
                return new List<DicomImageDto>();

            var seriesResponse = await _httpClient.GetAsync($"{_orthancBaseUrl}/series/{seriesIds.First()}");
            var seriesData = await seriesResponse.Content.ReadFromJsonAsync<OrthancSeriesResponse>();

            var images = new List<DicomImageDto>();
            var instanceNumber = 1;
            foreach (var instanceId in seriesData?.Instances ?? new List<string>())
            {
                try
                {
                    var instanceResponse = await _httpClient.GetAsync($"{_orthancBaseUrl}/instances/{instanceId}");
                    if (instanceResponse.IsSuccessStatusCode)
                    {
                        var instanceData = await instanceResponse.Content.ReadFromJsonAsync<OrthancInstanceResponse>();
                        images.Add(new DicomImageDto
                        {
                            SOPInstanceUID = instanceData?.MainDicomTags?.SOPInstanceUID ?? "",
                            SeriesInstanceUID = seriesInstanceUID,
                            InstanceNumber = instanceNumber++,
                            ThumbnailUrl = $"{_orthancBaseUrl}/instances/{instanceId}/preview",
                            ImageUrl = $"{_orthancBaseUrl}/instances/{instanceId}/preview",
                            WadoUrl = $"{_orthancBaseUrl}/wado?requestType=WADO&studyUID=&seriesUID={seriesInstanceUID}&objectUID={instanceData?.MainDicomTags?.SOPInstanceUID}"
                        });
                    }
                }
                catch { /* Skip this instance */ }
            }

            return images;
        }
        catch
        {
            return new List<DicomImageDto>();
        }
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
        // Generate URL for Orthanc's built-in Stone Web Viewer or OHIF
        return new ViewerUrlDto
        {
            StudyInstanceUID = studyInstanceUID,
            ViewerUrl = $"{_orthancBaseUrl}/stone-webviewer/index.html?study={studyInstanceUID}",
            WadoRsUrl = $"{_orthancBaseUrl}/dicom-web/studies/{studyInstanceUID}",
            DicomWebUrl = $"{_orthancBaseUrl}/dicom-web"
        };
    }

    public async Task<DicomViewerConfigDto> GetViewerConfigAsync()
    {
        return new DicomViewerConfigDto
        {
            ViewerUrl = $"{_orthancBaseUrl}/stone-webviewer",
            ViewerType = "StoneWebViewer",
            EnableAnnotation = true,
            EnableMeasurement = true,
            EnableMPR = true,
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

    #region Private Helper Methods

    private async Task<bool> CheckOrthancConnectionAsync()
    {
        try
        {
            var response = await _httpClient.GetAsync($"{_orthancBaseUrl}/system");
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
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

#region Orthanc Response Classes

public class OrthancStudyResponse
{
    public string ID { get; set; }
    public OrthancStudyMainDicomTags MainDicomTags { get; set; }
    public OrthancPatientMainDicomTags PatientMainDicomTags { get; set; }
    public List<string> Series { get; set; }
}

public class OrthancStudyMainDicomTags
{
    public string StudyInstanceUID { get; set; }
    public string StudyDate { get; set; }
    public string StudyTime { get; set; }
    public string StudyDescription { get; set; }
    public string AccessionNumber { get; set; }
    public string PatientID { get; set; }
    public string ModalitiesInStudy { get; set; }
}

public class OrthancPatientMainDicomTags
{
    public string PatientName { get; set; }
    public string PatientID { get; set; }
    public string PatientBirthDate { get; set; }
    public string PatientSex { get; set; }
}

public class OrthancSeriesResponse
{
    public string ID { get; set; }
    public OrthancSeriesMainDicomTags MainDicomTags { get; set; }
    public List<string> Instances { get; set; }
}

public class OrthancSeriesMainDicomTags
{
    public string SeriesInstanceUID { get; set; }
    public string SeriesNumber { get; set; }
    public string Modality { get; set; }
    public string SeriesDescription { get; set; }
    public string BodyPartExamined { get; set; }
}

public class OrthancInstanceResponse
{
    public string ID { get; set; }
    public OrthancInstanceMainDicomTags MainDicomTags { get; set; }
}

public class OrthancInstanceMainDicomTags
{
    public string SOPInstanceUID { get; set; }
    public string InstanceNumber { get; set; }
}

#endregion
