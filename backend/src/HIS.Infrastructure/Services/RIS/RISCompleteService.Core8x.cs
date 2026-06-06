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

// K3 phien 1 (2026-05-30): tach RIS Module 8 (5 region 8.1+8.2+8.3+8.4+8.5, ~1730 dong)
// khoi RISCompleteService.cs god-file (5679 dong). ZERO runtime change — partial class.
// Ctor + 13 DI deps + PACS config o file goc.
public partial class RISCompleteService
{
    #region 8.1 Waiting List (Man hinh cho thuc hien)

    public async Task<List<RadiologyWaitingListDto>> GetWaitingListAsync(
        DateTime date,
        Guid? roomId = null,
        string serviceType = null,
        string status = null,
        string keyword = null)
    {
        // RequestDate ghi bằng DateTime.Now — dùng DayRangeUtc để tránh lệch UTC 00h-07h VN.
        var (rdFromUtc, rdToUtc) = HIS.Core.Common.VnTime.DayRangeUtc(date);
        var query = _context.RadiologyRequests
            .Include(r => r.Patient)
            .Include(r => r.Service)
            .Include(r => r.RequestingDoctor)
            .Include(r => r.Exams)
                .ThenInclude(e => e.DicomStudies)
            .Where(r => r.RequestDate >= rdFromUtc && r.RequestDate < rdToUtc);

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
        // Live StudyInstanceUIDs pulled from our Orthanc/R2 PACS. Anything already
        // holding one of these is considered already-real and is skipped.
        string[] realUIDs;

        try
        {
            var pacsBaseUrl = _pacsBaseUrl.TrimEnd('/');
            var pacsUser = _configuration["PACS:Username"] ?? "admin";
            var pacsPass = _configuration["PACS:Password"] ?? "orthanc";

            using var http = new HttpClient();
            var authBytes = System.Text.Encoding.ASCII.GetBytes($"{pacsUser}:{pacsPass}");
            http.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", Convert.ToBase64String(authBytes));
            http.Timeout = TimeSpan.FromSeconds(20);

            var studiesJson = await http.GetStringAsync($"{pacsBaseUrl}/studies?expand=true");
            var studies = System.Text.Json.JsonSerializer.Deserialize<List<System.Text.Json.JsonElement>>(studiesJson);
            var uids = new List<string>();
            foreach (var s in studies ?? new List<System.Text.Json.JsonElement>())
            {
                if (s.TryGetProperty("MainDicomTags", out var tags) &&
                    tags.TryGetProperty("StudyInstanceUID", out var uid))
                {
                    var v = uid.GetString();
                    if (!string.IsNullOrEmpty(v)) uids.Add(v);
                }
            }
            realUIDs = uids.Count > 0 ? uids.ToArray() : new[]
            {
                "1.3.6.1.4.1.5962.1.2.1.20040119072730.12322",
                "1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463",
            };
        }
        catch
        {
            realUIDs = new[]
            {
                "1.3.6.1.4.1.5962.1.2.1.20040119072730.12322",
                "1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463",
            };
        }

        // Get all DicomStudies that have fake UIDs (ones we generated)
        var dicomStudies = await _context.DicomStudies
            .Where(d => !realUIDs.Contains(d.StudyInstanceUID))
            .ToListAsync();

        int count = 0;
        foreach (var study in dicomStudies)
        {
            // Assign real UID (round-robin across whatever PACS currently holds)
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
                .ThenInclude(e => e.DicomStudies)
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
            StudyInstanceUID = r.Exams.SelectMany(e => e.DicomStudies).FirstOrDefault()?.StudyInstanceUID,
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
            StudyInstanceUID = request.Exams.SelectMany(e => e.DicomStudies).FirstOrDefault()?.StudyInstanceUID,
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
                        // Pull series-level metadata once to know Modality (cheap)
                        string? seriesModality = null;
                        try
                        {
                            var seriesResp = await httpClient.GetAsync($"{pacsBaseUrl}/series/{seriesIds[0]}");
                            if (seriesResp.IsSuccessStatusCode)
                            {
                                var serJson = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(
                                    await seriesResp.Content.ReadAsStringAsync());
                                if (serJson.TryGetProperty("MainDicomTags", out var sTags) &&
                                    sTags.TryGetProperty("Modality", out var modProp))
                                    seriesModality = modProp.GetString();
                            }
                        }
                        catch { /* best effort */ }

                        var instResp = await httpClient.GetAsync($"{pacsBaseUrl}/series/{seriesIds[0]}/instances");
                        if (instResp.IsSuccessStatusCode)
                        {
                            var instJson = await instResp.Content.ReadAsStringAsync();
                            var instances = System.Text.Json.JsonSerializer.Deserialize<List<System.Text.Json.JsonElement>>(instJson);

                            var result = new List<DicomImageDto>();
                            int idx = 1;
                            // For mammography (≤16 instances typical), fetch per-instance laterality/viewPosition.
                            // For larger CT/MR series, skip the extra round-trips.
                            bool fetchExtraTags = seriesModality == "MG" || (instances?.Count ?? 0) <= 16;

                            foreach (var inst in instances ?? new List<System.Text.Json.JsonElement>())
                            {
                                var instId = inst.TryGetProperty("ID", out var iid) ? iid.GetString() ?? "" : "";
                                var tags = inst.GetProperty("MainDicomTags");
                                var sopUID = tags.TryGetProperty("SOPInstanceUID", out var sop) ? sop.GetString() ?? "" : "";

                                string? laterality = null;
                                string? viewPosition = null;
                                decimal? pixelSpacing = null;

                                if (fetchExtraTags && !string.IsNullOrEmpty(instId))
                                {
                                    try
                                    {
                                        var tagsResp = await httpClient.GetAsync($"{pacsBaseUrl}/instances/{instId}/tags?simplify");
                                        if (tagsResp.IsSuccessStatusCode)
                                        {
                                            var tagsObj = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(
                                                await tagsResp.Content.ReadAsStringAsync());
                                            if (tagsObj.TryGetProperty("ImageLaterality", out var latProp))
                                                laterality = latProp.GetString();
                                            if (laterality == null && tagsObj.TryGetProperty("Laterality", out var lat2))
                                                laterality = lat2.GetString();
                                            if (tagsObj.TryGetProperty("ViewPosition", out var vpProp))
                                                viewPosition = vpProp.GetString();
                                            if (tagsObj.TryGetProperty("PixelSpacing", out var psProp))
                                            {
                                                var psStr = psProp.GetString();
                                                if (!string.IsNullOrEmpty(psStr))
                                                {
                                                    var parts = psStr.Split('\\', '/', ',');
                                                    if (parts.Length > 0 && decimal.TryParse(parts[0],
                                                        System.Globalization.NumberStyles.Float,
                                                        System.Globalization.CultureInfo.InvariantCulture, out var ps))
                                                        pixelSpacing = ps;
                                                }
                                            }
                                        }
                                    }
                                    catch { /* best effort per instance */ }
                                }

                                result.Add(new DicomImageDto
                                {
                                    SOPInstanceUID = sopUID,
                                    SeriesInstanceUID = seriesInstanceUID,
                                    InstanceNumber = idx++,
                                    ThumbnailUrl = $"/api/RISComplete/pacs/instances/{instId}/preview",
                                    ImageUrl = $"/api/RISComplete/pacs/instances/{instId}/rendered?width=1024",
                                    WadoUrl = $"/api/RISComplete/pacs/instances/{instId}/file",
                                    Laterality = laterality,
                                    ViewPosition = viewPosition,
                                    Modality = seriesModality,
                                    PixelSpacing = pixelSpacing,
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
                ImageUrl = $"/api/RISComplete/pacs/instances/{study.Id}/rendered?width=1024",
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

        // G-36: per-modality permission check.
        // Chỉ áp khi ApprovingUserId có giá trị (controller điền từ JWT).
        // Logic: nếu user có RadiologyPermission row nào cho modality của ca chụp
        // → phải có bit DuyetKQ (0x0010). Không có row nào = không hạn chế (backward-compat).
        if (dto.ApprovingUserId.HasValue && dto.ApprovingUserId.Value != Guid.Empty)
        {
            var examForCheck = await _context.RadiologyExams
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == report.RadiologyExamId);

            if (examForCheck != null)
            {
                const int DuyetKQFlag = 0x0010;
                var modalityPerms = await _context.RadiologyPermissions
                    .Where(p =>
                        p.UserId == dto.ApprovingUserId.Value &&
                        p.IsActive &&
                        (p.ModalityId == examForCheck.ModalityId || p.ModalityId == null))
                    .ToListAsync();

                // Có row hạn chế → phải có flag DuyetKQ
                if (modalityPerms.Count > 0 && !modalityPerms.Any(p => (p.Permissions & DuyetKQFlag) != 0))
                {
                    throw new UnauthorizedAccessException(
                        "Bạn không có quyền duyệt kết quả cho loại máy chụp này.");
                }
            }
        }

        report.Status = 2; // Final approved
        report.ApprovedBy = dto.ApprovingUserId ?? Guid.Parse("9e5309dc-ecf9-4d48-9a09-224cd15347b1");
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

        // Fire-and-forget email notification
        _ = _notificationService.NotifyRadiologyResultAsync(report.Id, "Bác sĩ duyệt");

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
}
