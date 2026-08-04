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
using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

// K3 phien 1 (2026-05-30): tach RIS Module 8 (5 region 8.1+8.2+8.3+8.4+8.5, ~1730 dong)
// khoi RISCompleteService.cs god-file (5679 dong). ZERO runtime change â€" partial class.
// Ctor + 13 DI deps + PACS config o file goc.
public partial class RISCompleteService
{
    #region 8.1 Waiting List (Man hinh cho thuc hien)

    public async Task<List<RadiologyWaitingListDto>> GetWaitingListAsync(
        DateTime date,
        Guid? roomId = null,
        string serviceType = null,
        string status = null,
        string keyword = null,
        bool overdueOnly = false,
        string examGroupName = null)
    {
        // RequestDate ghi báº±ng DateTime.Now â€" dÃ¹ng DayRangeUtc Ä'á»ƒ trÃ¡nh lá»‡ch UTC 00h-07h VN.
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

        // F2.6 #136: lọc theo Tên đoàn khám (KSK theo đoàn)
        if (!string.IsNullOrEmpty(examGroupName))
        {
            query = query.Where(r => r.ExamGroupName != null && r.ExamGroupName.Contains(examGroupName));
        }

        var requests = await query.OrderBy(r => r.RequestDate).ToBoundedListAsync("RIS.GetWaitingList");

        // Đọc ngưỡng TAT từ SystemConfig (key: RIS.TAT.DefaultThresholdMinutes, mặc định 60 phút)
        var tatThresholdMinutes = 60;
        var tatConfig = await _context.SystemConfigs.AsNoTracking()
            .FirstOrDefaultAsync(c => c.ConfigKey == "RIS.TAT.DefaultThresholdMinutes" && c.IsActive);
        if (tatConfig != null && int.TryParse(tatConfig.ConfigValue, out var parsed) && parsed > 0)
            tatThresholdMinutes = parsed;

        var nowVn = HIS.Core.Common.VnTime.NowVn;

        var result = requests.Select((r, index) =>
        {
            // Mốc TAT: RequestDate lưu UTC, VnTime.NowVn = UTC+7 local.
            // Đơn giản: diff = nowVn - (requestDate_utc + 7h) đều là local VN.
            var orderTimeVn = DateTime.SpecifyKind(r.RequestDate, DateTimeKind.Utc).AddHours(7);
            var tatMinutes = (int)(nowVn - orderTimeVn).TotalMinutes;
            if (tatMinutes < 0) tatMinutes = 0;
            var isOverdue = tatMinutes > tatThresholdMinutes;

            return new RadiologyWaitingListDto
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
                ServiceTypeName = GetRadiologyServiceTypeName(r.Service),
                RoomName = r.Exams.FirstOrDefault()?.Room?.RoomName ?? "",
                QueueNumber = index + 1,
                StatusCode = r.Status,
                Status = GetStatusName(r.Status),
                PatientType = r.PatientType == 1 ? "BHYT" : "Vien phi",
                Priority = r.Priority == 3 ? "Cap cuu" : r.Priority == 2 ? "Khan" : "Binh thuong",
                CalledTime = null,
                StartTime = r.Exams.FirstOrDefault()?.StartTime,
                StudyInstanceUID = r.Exams.SelectMany(e => e.DicomStudies).FirstOrDefault()?.StudyInstanceUID ?? "",
                HasImages = r.Exams.Any(e => e.DicomStudies.Any()),
                TATMinutes = tatMinutes,
                IsOverdue = isOverdue,
                ExamGroupName = r.ExamGroupName,
            };
        }).ToList();

        return overdueOnly ? result.Where(x => x.IsOverdue).ToList() : result;
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
        var today = DateTime.UtcNow.Date; // dot16: chuẩn UTC (00:00Z = 07:00 VN — vẫn trong cửa sổ DayRangeUtc hôm nay)
        // #356: write-bulk (dev/test util, không cần audit từng dòng) → ExecuteUpdate set-based,
        // KHÔNG bound thiếu record, không load nguyên bảng. Query-filter (soft-delete) vẫn áp dụng.
        return await _context.RadiologyRequests.ExecuteUpdateAsync(
            s => s.SetProperty(r => r.RequestDate, today));
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
}
