using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Reception;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using iText.IO.Font.Constants;
using iText.Kernel.Font;
using iText.Kernel.Pdf;
using iText.Layout;
using iText.Layout.Properties;
using QueueDailyStatisticsDto = HIS.Application.DTOs.Reception.QueueDailyStatisticsDto;
using AverageWaitingTimeDto = HIS.Application.DTOs.Reception.AverageWaitingTimeDto;
using QueueReportRequestDto = HIS.Application.DTOs.Reception.QueueReportRequestDto;
using QueueConfigurationDto = HIS.Application.DTOs.Reception.QueueConfigurationDto;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Implementation of IReceptionCompleteService
/// Handles all reception/registration workflows
/// </summary>
public class ReceptionCompleteService : IReceptionCompleteService
{
    private readonly HISDbContext _context;
    private readonly IRepository<Patient> _patientRepo;
    private readonly IRepository<MedicalRecord> _medicalRecordRepo;
    private readonly IRepository<Examination> _examinationRepo;
    private readonly IRepository<QueueTicket> _queueTicketRepo;
    private readonly IRepository<QueueConfiguration> _queueConfigRepo;
    private readonly IRepository<Room> _roomRepo;
    private readonly IRepository<Department> _departmentRepo;
    private readonly IRepository<User> _userRepo;
    private readonly IUnitOfWork _unitOfWork;

    public ReceptionCompleteService(
        HISDbContext context,
        IRepository<Patient> patientRepo,
        IRepository<MedicalRecord> medicalRecordRepo,
        IRepository<Examination> examinationRepo,
        IRepository<QueueTicket> queueTicketRepo,
        IRepository<QueueConfiguration> queueConfigRepo,
        IRepository<Room> roomRepo,
        IRepository<Department> departmentRepo,
        IRepository<User> userRepo,
        IUnitOfWork unitOfWork)
    {
        _context = context;
        _patientRepo = patientRepo;
        _medicalRecordRepo = medicalRecordRepo;
        _examinationRepo = examinationRepo;
        _queueTicketRepo = queueTicketRepo;
        _queueConfigRepo = queueConfigRepo;
        _roomRepo = roomRepo;
        _departmentRepo = departmentRepo;
        _userRepo = userRepo;
        _unitOfWork = unitOfWork;
    }

    #region 1.1 Room Overview

    public async Task<List<RoomOverviewDto>> GetRoomOverviewAsync(Guid? departmentId, DateTime date)
    {
        var query = _context.Rooms
            .Include(r => r.Department)
            .Where(r => r.IsActive);

        if (departmentId.HasValue)
            query = query.Where(r => r.DepartmentId == departmentId.Value);

        var rooms = await query.ToListAsync();
        var result = new List<RoomOverviewDto>();

        foreach (var room in rooms)
        {
            var stats = await GetRoomStatsAsync(room.Id, date);
            result.Add(new RoomOverviewDto
            {
                RoomId = room.Id,
                RoomCode = room.RoomCode,
                RoomName = room.RoomName,
                DepartmentId = room.DepartmentId,
                DepartmentName = room.Department.DepartmentName,
                TotalPatientsToday = stats.Total,
                WaitingCount = stats.Waiting,
                InProgressCount = stats.InProgress,
                WaitingResultCount = stats.WaitingResult,
                CompletedCount = stats.Completed,
                DoingLabCount = stats.DoingLab,
                MaxPatientsPerDay = room.MaxPatients,
                MaxInsurancePatientsPerDay = room.MaxInsurancePatients,
                InsurancePatientsToday = stats.InsuranceCount,
                RoomStatus = 1 // Active
            });
        }

        return result;
    }

    public async Task<RoomOverviewDto?> GetRoomDetailAsync(Guid roomId, DateTime date)
    {
        var room = await _context.Rooms
            .Include(r => r.Department)
            .FirstOrDefaultAsync(r => r.Id == roomId);

        if (room == null) return null;

        var stats = await GetRoomStatsAsync(roomId, date);

        return new RoomOverviewDto
        {
            RoomId = room.Id,
            RoomCode = room.RoomCode,
            RoomName = room.RoomName,
            DepartmentId = room.DepartmentId,
            DepartmentName = room.Department.DepartmentName,
            TotalPatientsToday = stats.Total,
            WaitingCount = stats.Waiting,
            InProgressCount = stats.InProgress,
            WaitingResultCount = stats.WaitingResult,
            CompletedCount = stats.Completed,
            DoingLabCount = stats.DoingLab,
            MaxPatientsPerDay = room.MaxPatients,
            MaxInsurancePatientsPerDay = room.MaxInsurancePatients,
            InsurancePatientsToday = stats.InsuranceCount,
            RoomStatus = 1
        };
    }

    public async Task<List<DoctorScheduleDto>> GetWorkingDoctorsAsync(Guid? departmentId, DateTime date)
    {
        var query = _context.Users
            .Where(u => u.IsActive && u.UserType == 2); // 2 = Doctor

        if (departmentId.HasValue)
            query = query.Where(u => u.DepartmentId == departmentId.Value);

        var doctors = await query.ToListAsync();

        return doctors.Select(d => new DoctorScheduleDto
        {
            DoctorId = d.Id,
            DoctorCode = d.UserCode,
            DoctorName = d.FullName,
            Specialty = d.Specialty,
            ScheduleDate = date,
            StartTime = new TimeSpan(7, 0, 0),
            EndTime = new TimeSpan(17, 0, 0),
            MaxPatients = 50,
            CurrentPatients = 0,
            IsAvailable = true
        }).ToList();
    }

    public async Task<List<DoctorScheduleDto>> GetDoctorScheduleAsync(Guid roomId, DateTime date)
    {
        var room = await _roomRepo.GetByIdAsync(roomId);
        if (room == null) return new List<DoctorScheduleDto>();

        return await GetWorkingDoctorsAsync(room.DepartmentId, date);
    }

    public async Task<List<RoomOverviewDto>> GetAvailableRoomsAsync(Guid departmentId, int patientType, DateTime date)
    {
        var allRooms = await GetRoomOverviewAsync(departmentId, date);

        return allRooms.Where(r =>
            r.RoomStatus == 1 &&
            r.WaitingCount < r.MaxPatientsPerDay &&
            (patientType != 1 || r.InsurancePatientsToday < r.MaxInsurancePatientsPerDay))
            .ToList();
    }

    public async Task<List<AdmissionDto>> GetTodayAdmissionsAsync(Guid? roomId, DateTime date)
    {
        var query = _context.MedicalRecords
            .Include(m => m.Patient)
            .Include(m => m.Room)
            .ThenInclude(r => r!.Department)
            .Where(m => m.CreatedAt.Date == date.Date);

        if (roomId.HasValue)
        {
            query = query.Where(m => m.RoomId == roomId.Value);
        }

        var records = await query.OrderByDescending(m => m.CreatedAt).ToListAsync();

        return records.Select(m => new AdmissionDto
        {
            Id = m.Id,
            AdmissionCode = m.MedicalRecordCode,
            PatientId = m.PatientId,
            PatientCode = m.Patient?.PatientCode ?? "",
            PatientName = m.Patient?.FullName ?? "",
            DateOfBirth = m.Patient?.DateOfBirth,
            YearOfBirth = m.Patient?.YearOfBirth,
            Gender = m.Patient?.Gender == 1 ? "Nam" : m.Patient?.Gender == 2 ? "Nữ" : "Khác",
            Address = m.Patient?.Address,
            PhoneNumber = m.Patient?.PhoneNumber,
            IdentityNumber = m.Patient?.IdentityNumber,
            InsuranceNumber = m.Patient?.InsuranceNumber,
            InsuranceFacilityName = m.Patient?.InsuranceFacilityName,
            AdmissionDate = m.CreatedAt,
            DepartmentId = m.DepartmentId ?? m.Room?.DepartmentId ?? Guid.Empty,
            DepartmentName = m.Room?.Department?.DepartmentName,
            RoomId = m.RoomId,
            RoomName = m.Room?.RoomName,
            Status = m.Status == 0 ? "Waiting" : m.Status == 1 ? "InProgress" : m.Status == 2 ? "WaitingResult" : "Completed",
            IsEmergency = m.TreatmentType == 3,
            IsPriority = m.TreatmentType == 3,
            QueueNumber = 0,
            QueueCode = "",
            Priority = m.TreatmentType == 3 ? 1 : 0,
            Notes = m.DischargeNote ?? ""
        }).ToList();
    }

    #endregion

    #region 1.2 Queue System

    public async Task<QueueTicketDto> IssueQueueTicketAsync(IssueQueueTicketDto dto)
    {
        var today = DateTime.Today;

        // Get or create queue config
        var config = await _context.QueueConfigurations
            .FirstOrDefaultAsync(c => c.RoomId == dto.RoomId && c.QueueType == dto.QueueType);

        int nextNumber;
        if (config == null)
        {
            config = new QueueConfiguration
            {
                Id = Guid.NewGuid(),
                RoomId = dto.RoomId,
                QueueType = dto.QueueType,
                Prefix = dto.QueueType == 1 ? "A" : dto.QueueType == 2 ? "B" : "C",
                StartNumber = 1,
                CurrentNumber = 1,
                ResetDaily = true,
                LastResetDate = today,
                MaxPatients = 200,
                MaxInsurancePatients = 100,
                IsActive = true
            };
            await _context.QueueConfigurations.AddAsync(config);
            nextNumber = 1;
        }
        else
        {
            if (config.ResetDaily && config.LastResetDate < today)
            {
                config.CurrentNumber = config.StartNumber;
                config.LastResetDate = today;
            }
            nextNumber = config.CurrentNumber;
            config.CurrentNumber++;
        }

        var room = await _roomRepo.GetByIdAsync(dto.RoomId);

        var ticket = new QueueTicket
        {
            Id = Guid.NewGuid(),
            TicketNumber = $"{config.Prefix}{nextNumber:D3}",
            QueueNumber = nextNumber,
            IssueDate = DateTime.Now,
            QueueType = dto.QueueType,
            Priority = dto.Priority,
            Status = 0, // Waiting
            PatientId = dto.PatientId,
            RoomId = dto.RoomId,
            Notes = dto.Source
        };

        await _context.QueueTickets.AddAsync(ticket);
        await _unitOfWork.SaveChangesAsync();

        return new QueueTicketDto
        {
            Id = ticket.Id,
            TicketCode = ticket.TicketNumber,
            QueueNumber = ticket.QueueNumber,
            QueueDate = ticket.IssueDate,
            PatientId = ticket.PatientId,
            RoomId = ticket.RoomId ?? Guid.Empty,
            RoomName = room?.RoomName ?? "",
            QueueType = ticket.QueueType,
            Priority = ticket.Priority,
            Status = ticket.Status,
            EstimatedWaitMinutes = await CalculateEstimatedWaitAsync(dto.RoomId, dto.QueueType)
        };
    }

    public async Task<QueueTicketDto> IssueQueueTicketMobileAsync(MobileQueueTicketDto dto)
    {
        // Find patient by phone
        var patient = await _context.Patients
            .FirstOrDefaultAsync(p => p.PhoneNumber == dto.PatientPhone);

        return await IssueQueueTicketAsync(new IssueQueueTicketDto
        {
            PatientId = patient?.Id,
            PatientName = dto.PatientName ?? patient?.FullName,
            RoomId = dto.RoomId,
            QueueType = dto.QueueType,
            Priority = 0,
            Source = "Mobile"
        });
    }

    public async Task<QueueTicketDto?> CallNextAsync(Guid roomId, int queueType, Guid userId)
    {
        var today = DateTime.Today;

        var nextTicket = await _context.QueueTickets
            .Where(t => t.RoomId == roomId &&
                       t.QueueType == queueType &&
                       t.IssueDate.Date == today &&
                       t.Status == 0) // Waiting
            .OrderBy(t => t.Priority == 2 ? 0 : t.Priority == 1 ? 1 : 2) // Emergency first
            .ThenBy(t => t.QueueNumber)
            .FirstOrDefaultAsync();

        if (nextTicket == null) return null;

        nextTicket.Status = 1; // Calling
        nextTicket.CalledTime = DateTime.Now;
        nextTicket.CalledByUserId = userId;

        await _unitOfWork.SaveChangesAsync();

        return await GetQueueTicketByIdAsync(nextTicket.Id);
    }

    public async Task<QueueTicketDto> CallSpecificAsync(Guid ticketId, Guid userId)
    {
        var ticket = await _context.QueueTickets.FindAsync(ticketId);
        if (ticket == null) throw new Exception("Ticket not found");

        ticket.Status = 1; // Calling
        ticket.CalledTime = DateTime.Now;
        ticket.CalledByUserId = userId;

        await _unitOfWork.SaveChangesAsync();

        return (await GetQueueTicketByIdAsync(ticketId))!;
    }

    public async Task<QueueTicketDto> RecallAsync(Guid ticketId, Guid userId)
    {
        var ticket = await _context.QueueTickets.FindAsync(ticketId);
        if (ticket == null) throw new Exception("Ticket not found");

        ticket.CalledTime = DateTime.Now;
        ticket.CalledByUserId = userId;

        await _unitOfWork.SaveChangesAsync();

        return (await GetQueueTicketByIdAsync(ticketId))!;
    }

    public async Task<QueueTicketDto> SkipAsync(Guid ticketId, Guid userId, string? reason)
    {
        var ticket = await _context.QueueTickets.FindAsync(ticketId);
        if (ticket == null) throw new Exception("Ticket not found");

        ticket.Status = 4; // Skipped
        ticket.Notes = reason;

        await _unitOfWork.SaveChangesAsync();

        return (await GetQueueTicketByIdAsync(ticketId))!;
    }

    public async Task<QueueTicketDto> StartServingAsync(Guid ticketId, Guid userId)
    {
        var ticket = await _context.QueueTickets.FindAsync(ticketId);
        if (ticket == null) throw new Exception("Ticket not found");

        ticket.Status = 2; // Serving

        await _unitOfWork.SaveChangesAsync();

        return (await GetQueueTicketByIdAsync(ticketId))!;
    }

    public async Task<QueueTicketDto> CompleteServingAsync(Guid ticketId)
    {
        var ticket = await _context.QueueTickets.FindAsync(ticketId);
        if (ticket == null) throw new Exception("Ticket not found");

        ticket.Status = 3; // Completed
        ticket.CompletedTime = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        return (await GetQueueTicketByIdAsync(ticketId))!;
    }

    public async Task<List<QueueTicketDto>> GetWaitingListAsync(Guid roomId, int queueType, DateTime date)
    {
        var tickets = await _context.QueueTickets
            .Include(t => t.Patient)
            .Include(t => t.Room)
            .Where(t => t.RoomId == roomId &&
                       t.QueueType == queueType &&
                       t.IssueDate.Date == date.Date &&
                       t.Status == 0)
            .OrderBy(t => t.Priority == 2 ? 0 : t.Priority == 1 ? 1 : 2)
            .ThenBy(t => t.QueueNumber)
            .ToListAsync();

        return tickets.Select(MapToQueueTicketDto).ToList();
    }

    public async Task<List<QueueTicketDto>> GetServingListAsync(Guid roomId, int queueType, DateTime date)
    {
        var tickets = await _context.QueueTickets
            .Include(t => t.Patient)
            .Include(t => t.Room)
            .Where(t => t.RoomId == roomId &&
                       t.QueueType == queueType &&
                       t.IssueDate.Date == date.Date &&
                       t.Status == 2)
            .ToListAsync();

        return tickets.Select(MapToQueueTicketDto).ToList();
    }

    public async Task<QueueDisplayDto> GetDisplayDataAsync(Guid roomId, int queueType)
    {
        var room = await _roomRepo.GetByIdAsync(roomId);
        var today = DateTime.Today;

        var currentServing = await _context.QueueTickets
            .Include(t => t.Patient)
            .Where(t => t.RoomId == roomId && t.QueueType == queueType && t.IssueDate.Date == today && t.Status == 2)
            .FirstOrDefaultAsync();

        var callingList = await GetCallingTicketsAsync(roomId, 5);
        var waitingList = await GetWaitingListAsync(roomId, queueType, today);

        return new QueueDisplayDto
        {
            RoomId = roomId,
            RoomName = room?.RoomName ?? "",
            CurrentServing = currentServing != null ? MapToQueueTicketDto(currentServing) : null,
            CallingList = callingList,
            WaitingList = waitingList.Take(10).ToList(),
            TotalWaiting = waitingList.Count,
            AverageWaitMinutes = await CalculateEstimatedWaitAsync(roomId, queueType)
        };
    }

    public async Task<List<QueueTicketDto>> GetCallingTicketsAsync(Guid roomId, int limit = 5)
    {
        var today = DateTime.Today;
        var tickets = await _context.QueueTickets
            .Include(t => t.Patient)
            .Include(t => t.Room)
            .Where(t => t.RoomId == roomId && t.IssueDate.Date == today && t.Status == 1)
            .OrderByDescending(t => t.CalledTime)
            .Take(limit)
            .ToListAsync();

        return tickets.Select(MapToQueueTicketDto).ToList();
    }

    public async Task<QueueTicketDto?> GetQueueTicketByIdAsync(Guid id)
    {
        var ticket = await _context.QueueTickets
            .Include(t => t.Patient)
            .Include(t => t.Room)
            .Include(t => t.CalledByUser)
            .FirstOrDefaultAsync(t => t.Id == id);

        return ticket != null ? MapToQueueTicketDto(ticket) : null;
    }

    #endregion

    #region 1.3 Insurance (BHYT)

    public async Task<InsuranceVerificationResultDto> VerifyInsuranceAsync(InsuranceVerificationRequestDto dto)
    {
        // TODO: Connect to real BHXH gateway
        // For now, return mock data
        return new InsuranceVerificationResultDto
        {
            IsValid = true,
            InsuranceNumber = dto.InsuranceNumber,
            PatientName = dto.PatientName,
            DateOfBirth = dto.DateOfBirth,
            StartDate = DateTime.Today.AddYears(-1),
            EndDate = DateTime.Today.AddYears(1),
            RightRoute = 1, // Dung tuyen
            PaymentRate = 80
        };
    }

    public async Task<InsuranceVerificationResultDto> VerifyInsuranceByQRAsync(string qrData)
    {
        // Parse QR data to extract insurance number
        var insuranceNumber = qrData.Length > 15 ? qrData.Substring(0, 15) : qrData;
        return await VerifyInsuranceAsync(new InsuranceVerificationRequestDto { InsuranceNumber = insuranceNumber });
    }

    public async Task<bool> IsInsuranceBlockedAsync(string insuranceNumber)
    {
        return await _context.BlockedInsurances
            .AnyAsync(b => b.InsuranceNumber == insuranceNumber && b.IsBlocked);
    }

    public async Task<PagedResultDto<BlockedInsuranceDto>> GetBlockedInsuranceListAsync(string? keyword, int page, int pageSize)
    {
        var query = _context.BlockedInsurances
            .Include(b => b.BlockedBy)
            .Where(b => b.IsBlocked);

        if (!string.IsNullOrEmpty(keyword))
        {
            query = query.Where(b => b.InsuranceNumber.Contains(keyword) ||
                                    (b.ReasonDetail != null && b.ReasonDetail.Contains(keyword)));
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(b => b.BlockedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(b => new BlockedInsuranceDto
            {
                Id = b.Id,
                InsuranceNumber = b.InsuranceNumber,
                BlockReason = b.BlockReason,
                Notes = b.ReasonDetail,
                BlockedAt = b.BlockedAt,
                BlockedBy = b.BlockedBy.FullName
            })
            .ToListAsync();

        return new PagedResultDto<BlockedInsuranceDto>
        {
            Items = items,
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<BlockedInsuranceDto> BlockInsuranceAsync(string insuranceNumber, int reason, string? notes, Guid userId)
    {
        var blockedInsurance = new BlockedInsurance
        {
            Id = Guid.NewGuid(),
            InsuranceNumber = insuranceNumber,
            BlockReason = reason,
            ReasonDetail = notes,
            BlockedAt = DateTime.Now,
            BlockedByUserId = userId,
            IsBlocked = true,
            Notes = notes
        };

        await _context.BlockedInsurances.AddAsync(blockedInsurance);
        await _unitOfWork.SaveChangesAsync();

        var user = await _userRepo.GetByIdAsync(userId);

        return new BlockedInsuranceDto
        {
            Id = blockedInsurance.Id,
            InsuranceNumber = insuranceNumber,
            BlockReason = reason,
            Notes = notes,
            BlockedAt = blockedInsurance.BlockedAt,
            BlockedBy = user?.FullName
        };
    }

    public async Task UnblockInsuranceAsync(Guid id, Guid userId)
    {
        var blockedInsurance = await _context.BlockedInsurances.FindAsync(id);
        if (blockedInsurance != null)
        {
            blockedInsurance.IsBlocked = false;
            blockedInsurance.UnblockedAt = DateTime.Now;
            blockedInsurance.UnblockedByUserId = userId;
            await _unitOfWork.SaveChangesAsync();
        }
    }

    #endregion

    #region 1.4 Temporary Insurance for Newborns

    public async Task<(bool IsEligible, string Message)> CheckTemporaryInsuranceEligibilityAsync(DateTime dateOfBirth)
    {
        var age = DateTime.Today.Year - dateOfBirth.Year;
        if (age <= 6)
            return (true, "Du dieu kien cap the BHYT tam");
        return (false, "Tre tren 6 tuoi khong du dieu kien");
    }

    public async Task<TemporaryInsuranceCardDto> CreateTemporaryInsuranceAsync(CreateTemporaryInsuranceDto dto, Guid userId)
    {
        var eligibility = await CheckTemporaryInsuranceEligibilityAsync(dto.DateOfBirth);

        return new TemporaryInsuranceCardDto
        {
            PatientId = Guid.NewGuid(),
            PatientName = dto.PatientName,
            DateOfBirth = dto.DateOfBirth,
            BirthCertificateNumber = dto.BirthCertificateNumber,
            Guardian = dto.Guardian,
            TemporaryInsuranceNumber = $"TM{DateTime.Now:yyyyMMddHHmmss}",
            IssueDate = DateTime.Now,
            ExpiryDate = dto.DateOfBirth.AddYears(6),
            IsEligible = eligibility.IsEligible,
            EligibilityMessage = eligibility.Message
        };
    }

    public async Task<TemporaryInsuranceCardDto?> GetTemporaryInsuranceAsync(Guid patientId)
    {
        // TODO: Implement
        return null;
    }

    #endregion

    #region 1.5 Patient Photos

    public async Task<PatientPhotoDto> SavePhotoAsync(UploadPhotoDto dto, Guid userId)
    {
        var fileName = dto.FileName ?? $"photo_{DateTime.Now:yyyyMMddHHmmss}.jpg";
        var filePath = $"/photos/{dto.PatientId}/{Guid.NewGuid()}{Path.GetExtension(fileName)}";

        var photo = new PatientPhoto
        {
            Id = Guid.NewGuid(),
            PatientId = dto.PatientId,
            MedicalRecordId = dto.MedicalRecordId,
            PhotoType = dto.PhotoType,
            FileName = fileName,
            FilePath = filePath,
            CapturedAt = DateTime.Now,
            CapturedByUserId = userId,
            IsActive = true
        };

        await _context.PatientPhotos.AddAsync(photo);
        await _unitOfWork.SaveChangesAsync();

        return new PatientPhotoDto
        {
            Id = photo.Id,
            PatientId = photo.PatientId,
            MedicalRecordId = photo.MedicalRecordId,
            PhotoType = photo.PhotoType,
            FileName = photo.FileName,
            FilePath = photo.FilePath,
            CapturedAt = photo.CapturedAt
        };
    }

    public async Task<List<PatientPhotoDto>> GetPatientPhotosAsync(Guid patientId, Guid? medicalRecordId = null)
    {
        var query = _context.PatientPhotos
            .Where(p => p.PatientId == patientId && p.IsActive);

        if (medicalRecordId.HasValue)
            query = query.Where(p => p.MedicalRecordId == medicalRecordId.Value);

        return await query
            .OrderByDescending(p => p.CapturedAt)
            .Select(p => new PatientPhotoDto
            {
                Id = p.Id,
                PatientId = p.PatientId,
                MedicalRecordId = p.MedicalRecordId,
                PhotoType = p.PhotoType,
                FileName = p.FileName,
                FilePath = p.FilePath,
                CapturedAt = p.CapturedAt
            })
            .ToListAsync();
    }

    public async Task DeletePhotoAsync(Guid photoId, Guid userId)
    {
        var photo = await _context.PatientPhotos.FindAsync(photoId);
        if (photo != null)
        {
            photo.IsActive = false;
            await _unitOfWork.SaveChangesAsync();
        }
    }

    public async Task<CameraConfigDto> GetCameraConfigAsync(string workstationId)
    {
        var config = await _context.CameraConfigurations
            .FirstOrDefaultAsync(c => c.WorkstationId == workstationId && c.IsActive);

        if (config == null)
        {
            return new CameraConfigDto
            {
                DeviceId = workstationId,
                DeviceName = "Default Camera",
                Resolution = 2,
                PhotoCountLimit = 5,
                AutoCapture = false
            };
        }

        return new CameraConfigDto
        {
            DeviceId = config.DeviceId ?? workstationId,
            DeviceName = config.DeviceName ?? "Camera",
            Resolution = config.Resolution,
            PhotoCountLimit = config.PhotoCountLimit,
            AutoCapture = config.AutoCapture
        };
    }

    public async Task SaveCameraConfigAsync(string workstationId, CameraConfigDto config)
    {
        var existing = await _context.CameraConfigurations
            .FirstOrDefaultAsync(c => c.WorkstationId == workstationId);

        if (existing == null)
        {
            existing = new CameraConfiguration
            {
                Id = Guid.NewGuid(),
                WorkstationId = workstationId
            };
            await _context.CameraConfigurations.AddAsync(existing);
        }

        existing.DeviceId = config.DeviceId;
        existing.DeviceName = config.DeviceName;
        existing.Resolution = config.Resolution;
        existing.PhotoCountLimit = config.PhotoCountLimit;
        existing.AutoCapture = config.AutoCapture;
        existing.IsActive = true;

        await _unitOfWork.SaveChangesAsync();
    }

    #endregion

    #region 1.6 & 1.15 Document Hold

    public async Task<DocumentHoldDto> CreateDocumentHoldAsync(CreateDocumentHoldDto dto, Guid userId)
    {
        var docHold = new DocumentHold
        {
            Id = Guid.NewGuid(),
            MedicalRecordId = dto.AdmissionId,
            DocumentType = int.TryParse(dto.DocumentType, out var dt) ? dt : 1,
            DocumentNumber = dto.DocumentNumber,
            Description = dto.Description,
            HoldDate = DateTime.Now,
            HeldByUserId = userId,
            Status = 1, // Holding
            Notes = dto.Note
        };

        await _context.DocumentHolds.AddAsync(docHold);
        await _unitOfWork.SaveChangesAsync();

        return await MapToDocumentHoldDtoAsync(docHold);
    }

    public async Task<DocumentHoldDto> ReturnDocumentAsync(ReturnDocumentDto dto, Guid userId)
    {
        var docHold = await _context.DocumentHolds.FindAsync(dto.DocumentHoldId);
        if (docHold == null) throw new Exception("Document hold not found");

        docHold.ReturnDate = DateTime.Now;
        docHold.ReturnedByUserId = userId;
        docHold.Status = 2; // Returned
        docHold.Notes = dto.Note;

        await _unitOfWork.SaveChangesAsync();

        return await MapToDocumentHoldDtoAsync(docHold);
    }

    public async Task<PagedResultDto<DocumentHoldDto>> SearchDocumentHoldsAsync(DocumentHoldSearchDto dto)
    {
        var query = _context.DocumentHolds.AsQueryable();

        if (dto.PatientId.HasValue)
        {
            var mrIds = await _context.MedicalRecords
                .Where(m => m.PatientId == dto.PatientId.Value)
                .Select(m => m.Id)
                .ToListAsync();
            query = query.Where(d => d.MedicalRecordId.HasValue && mrIds.Contains(d.MedicalRecordId.Value));
        }

        if (dto.DocumentType.HasValue)
            query = query.Where(d => d.DocumentType == dto.DocumentType.Value);

        if (dto.Status.HasValue)
            query = query.Where(d => d.Status == dto.Status.Value);

        var total = await query.CountAsync();
        var items = await query
            .Skip((dto.Page - 1) * dto.PageSize)
            .Take(dto.PageSize)
            .ToListAsync();

        var dtos = new List<DocumentHoldDto>();
        foreach (var item in items)
        {
            dtos.Add(await MapToDocumentHoldDtoAsync(item));
        }

        return new PagedResultDto<DocumentHoldDto>
        {
            Items = dtos,
            TotalCount = total,
            Page = dto.Page,
            PageSize = dto.PageSize
        };
    }

    public async Task<List<DocumentHoldDto>> GetPatientDocumentHoldsAsync(Guid patientId)
    {
        var mrIds = await _context.MedicalRecords
            .Where(m => m.PatientId == patientId)
            .Select(m => m.Id)
            .ToListAsync();

        var holds = await _context.DocumentHolds
            .Where(d => d.MedicalRecordId.HasValue && mrIds.Contains(d.MedicalRecordId.Value) && d.Status == 1)
            .ToListAsync();

        var result = new List<DocumentHoldDto>();
        foreach (var hold in holds)
        {
            result.Add(await MapToDocumentHoldDtoAsync(hold));
        }
        return result;
    }

    public async Task<DocumentHoldReceiptDto> GetDocumentHoldReceiptAsync(Guid documentHoldId)
    {
        var hold = await _context.DocumentHolds
            .Include(d => d.MedicalRecord)
            .ThenInclude(m => m.Patient)
            .FirstOrDefaultAsync(d => d.Id == documentHoldId);

        if (hold == null) throw new Exception("Document hold not found");

        return new DocumentHoldReceiptDto
        {
            ReceiptNumber = $"GGT{hold.HoldDate:yyyyMMdd}{hold.Id.ToString().Substring(0, 4).ToUpper()}",
            ReceiptDate = hold.HoldDate,
            PatientCode = hold.MedicalRecord?.Patient?.PatientCode ?? "",
            PatientName = hold.MedicalRecord?.Patient?.FullName ?? "",
            PatientPhone = hold.MedicalRecord?.Patient?.PhoneNumber,
            Documents = new List<DocumentHoldItemDto>
            {
                new DocumentHoldItemDto
                {
                    DocumentTypeName = GetDocumentTypeName(hold.DocumentType),
                    DocumentNumber = hold.DocumentNumber ?? "",
                    Quantity = 1,
                    Description = hold.Description
                }
            },
            Notes = hold.Notes
        };
    }

    public async Task<DocumentHoldReceiptDto> GetDocumentReturnReceiptAsync(Guid documentHoldId)
    {
        var receipt = await GetDocumentHoldReceiptAsync(documentHoldId);
        receipt.ReceiptNumber = $"TGT{receipt.ReceiptDate:yyyyMMdd}{documentHoldId.ToString().Substring(0, 4).ToUpper()}";
        return receipt;
    }

    #endregion

    #region 1.7 Insurance Registration (BHYT)

    public async Task<AdmissionDto> RegisterInsurancePatientAsync(InsuranceRegistrationDto dto, Guid userId)
    {
        Patient? patient = null;

        // Find existing patient
        if (dto.PatientId.HasValue)
        {
            patient = await _patientRepo.GetByIdAsync(dto.PatientId.Value);
        }
        else if (!string.IsNullOrEmpty(dto.PatientCode))
        {
            patient = await _context.Patients.FirstOrDefaultAsync(p => p.PatientCode == dto.PatientCode);
        }
        else if (!string.IsNullOrEmpty(dto.IdentityNumber))
        {
            patient = await _context.Patients.FirstOrDefaultAsync(p => p.IdentityNumber == dto.IdentityNumber);
        }
        else if (!string.IsNullOrEmpty(dto.InsuranceNumber))
        {
            patient = await _context.Patients.FirstOrDefaultAsync(p => p.InsuranceNumber == dto.InsuranceNumber);
        }

        if (patient == null)
        {
            throw new Exception("Khong tim thay benh nhan. Vui long dang ky moi.");
        }

        // Verify insurance
        var insuranceResult = await VerifyInsuranceAsync(new InsuranceVerificationRequestDto
        {
            InsuranceNumber = dto.InsuranceNumber,
            PatientName = patient.FullName,
            DateOfBirth = patient.DateOfBirth
        });

        if (!insuranceResult.IsValid)
        {
            throw new Exception($"The BHYT khong hop le: {insuranceResult.ErrorMessage}");
        }

        // Update patient insurance info
        patient.InsuranceNumber = dto.InsuranceNumber;
        patient.InsuranceExpireDate = insuranceResult.EndDate;
        await _patientRepo.UpdateAsync(patient);

        // Create medical record
        var medicalRecord = new MedicalRecord
        {
            Id = Guid.NewGuid(),
            MedicalRecordCode = await GenerateMedicalRecordCodeAsync(),
            PatientId = patient.Id,
            AdmissionDate = DateTime.Now,
            PatientType = 1, // BHYT
            TreatmentType = 1, // Ngoai tru
            InsuranceNumber = dto.InsuranceNumber,
            InsuranceExpireDate = insuranceResult.EndDate,
            InsuranceFacilityCode = insuranceResult.FacilityCode,
            InsuranceRightRoute = insuranceResult.RightRoute,
            RoomId = dto.RoomId,
            DoctorId = dto.DoctorId,
            Status = 0 // Waiting
        };

        await _medicalRecordRepo.AddAsync(medicalRecord);

        // Get room info
        var room = await _context.Rooms.Include(r => r.Department).FirstOrDefaultAsync(r => r.Id == dto.RoomId);

        // Create examination
        var examination = new Examination
        {
            Id = Guid.NewGuid(),
            MedicalRecordId = medicalRecord.Id,
            ExaminationType = 1, // Primary
            DepartmentId = room?.DepartmentId ?? Guid.Empty,
            RoomId = dto.RoomId,
            DoctorId = dto.DoctorId,
            Status = 0 // Waiting
        };

        await _examinationRepo.AddAsync(examination);

        // Issue queue ticket
        var queueTicket = await IssueQueueTicketAsync(new IssueQueueTicketDto
        {
            PatientId = patient.Id,
            PatientName = patient.FullName,
            RoomId = dto.RoomId,
            QueueType = 2, // Kham benh
            Priority = dto.IsPriority ? 1 : 0,
            Source = "Reception"
        });

        examination.QueueNumber = queueTicket.QueueNumber;
        await _examinationRepo.UpdateAsync(examination);
        await _unitOfWork.SaveChangesAsync();

        return MapToAdmissionDto(medicalRecord, patient, room, queueTicket);
    }

    public async Task<AdmissionDto> QuickRegisterByPatientCodeAsync(string patientCode, Guid roomId, Guid userId)
    {
        var patient = await _context.Patients.FirstOrDefaultAsync(p => p.PatientCode == patientCode);
        if (patient == null) throw new Exception("Khong tim thay benh nhan");

        if (!string.IsNullOrEmpty(patient.InsuranceNumber))
        {
            return await RegisterInsurancePatientAsync(new InsuranceRegistrationDto
            {
                PatientId = patient.Id,
                InsuranceNumber = patient.InsuranceNumber,
                RoomId = roomId
            }, userId);
        }
        else
        {
            return await RegisterFeePatientAsync(new FeeRegistrationDto
            {
                PatientId = patient.Id,
                RoomId = roomId,
                ServiceType = 2 // Vien phi
            }, userId);
        }
    }

    public async Task<AdmissionDto> QuickRegisterByAppointmentAsync(string appointmentCode, Guid userId)
    {
        var appointment = await _context.Appointments
            .Include(a => a.Patient)
            .FirstOrDefaultAsync(a => a.AppointmentCode == appointmentCode && a.Status == 1);

        if (appointment == null) throw new Exception("Khong tim thay lich hen hoac lich hen da su dung");

        var patient = appointment.Patient;
        var roomId = appointment.RoomId ?? throw new Exception("Lich hen khong co phong kham");

        // Mark appointment as used
        appointment.Status = 2; // Used
        await _unitOfWork.SaveChangesAsync();

        if (!string.IsNullOrEmpty(patient.InsuranceNumber))
        {
            return await RegisterInsurancePatientAsync(new InsuranceRegistrationDto
            {
                PatientId = patient.Id,
                InsuranceNumber = patient.InsuranceNumber,
                RoomId = roomId
            }, userId);
        }
        else
        {
            return await RegisterFeePatientAsync(new FeeRegistrationDto
            {
                PatientId = patient.Id,
                RoomId = roomId,
                ServiceType = 2
            }, userId);
        }
    }

    public async Task<AdmissionDto> QuickRegisterByIdentityAsync(string identityNumber, Guid roomId, Guid userId)
    {
        var patient = await _context.Patients.FirstOrDefaultAsync(p => p.IdentityNumber == identityNumber);
        if (patient == null) throw new Exception("Khong tim thay benh nhan voi CCCD nay");

        return await QuickRegisterByPatientCodeAsync(patient.PatientCode, roomId, userId);
    }

    public async Task<AdmissionDto> RegisterByTreatmentCodeAsync(string treatmentCode, Guid roomId, Guid userId)
    {
        var medicalRecord = await _context.MedicalRecords
            .Include(m => m.Patient)
            .FirstOrDefaultAsync(m => m.MedicalRecordCode == treatmentCode);

        if (medicalRecord == null) throw new Exception("Khong tim thay ma dieu tri");

        return await QuickRegisterByPatientCodeAsync(medicalRecord.Patient.PatientCode, roomId, userId);
    }

    public async Task<AdmissionDto> RegisterBySmartCardAsync(string cardData, Guid roomId, Guid userId)
    {
        var smartCardData = await ReadSmartCardAsync(cardData);

        if (!string.IsNullOrEmpty(smartCardData.PatientCode))
        {
            return await QuickRegisterByPatientCodeAsync(smartCardData.PatientCode, roomId, userId);
        }

        throw new Exception("Khong doc duoc thong tin tu the");
    }

    #endregion

    #region 1.8 Fee Registration

    public async Task<AdmissionDto> RegisterFeePatientAsync(FeeRegistrationDto dto, Guid userId)
    {
        Patient? patient = null;

        // Find or create patient
        if (dto.PatientId.HasValue)
        {
            patient = await _patientRepo.GetByIdAsync(dto.PatientId.Value);
        }
        else if (!string.IsNullOrEmpty(dto.PatientCode))
        {
            patient = await _context.Patients.FirstOrDefaultAsync(p => p.PatientCode == dto.PatientCode);
        }
        else if (!string.IsNullOrEmpty(dto.IdentityNumber))
        {
            patient = await _context.Patients.FirstOrDefaultAsync(p => p.IdentityNumber == dto.IdentityNumber);
        }
        else if (!string.IsNullOrEmpty(dto.PhoneNumber))
        {
            patient = await _context.Patients.FirstOrDefaultAsync(p => p.PhoneNumber == dto.PhoneNumber);
        }
        else if (dto.NewPatient != null)
        {
            patient = new Patient
            {
                Id = Guid.NewGuid(),
                PatientCode = await GeneratePatientCodeAsync(),
                FullName = dto.NewPatient.FullName,
                DateOfBirth = dto.NewPatient.DateOfBirth,
                YearOfBirth = dto.NewPatient.YearOfBirth,
                Gender = dto.NewPatient.Gender,
                IdentityNumber = dto.NewPatient.IdentityNumber,
                PhoneNumber = dto.NewPatient.PhoneNumber,
                Email = dto.NewPatient.Email,
                Address = dto.NewPatient.Address,
                WardCode = dto.NewPatient.WardCode,
                WardName = dto.NewPatient.WardName,
                DistrictCode = dto.NewPatient.DistrictCode,
                DistrictName = dto.NewPatient.DistrictName,
                ProvinceCode = dto.NewPatient.ProvinceCode,
                ProvinceName = dto.NewPatient.ProvinceName,
                EthnicCode = dto.NewPatient.EthnicCode,
                EthnicName = dto.NewPatient.EthnicName,
                Occupation = dto.NewPatient.Occupation,
                InsuranceNumber = dto.NewPatient.InsuranceNumber,
                InsuranceExpireDate = dto.NewPatient.InsuranceExpireDate,
                InsuranceFacilityCode = dto.NewPatient.InsuranceFacilityCode,
                InsuranceFacilityName = dto.NewPatient.InsuranceFacilityName,
                GuardianName = dto.NewPatient.GuardianName,
                GuardianPhone = dto.NewPatient.GuardianPhone,
                GuardianRelationship = dto.NewPatient.GuardianRelationship
            };
            await _patientRepo.AddAsync(patient);
        }

        if (patient == null)
        {
            throw new Exception("Khong tim thay benh nhan. Vui long nhap thong tin moi.");
        }

        // Create medical record
        var room = await _context.Rooms.Include(r => r.Department).FirstOrDefaultAsync(r => r.Id == dto.RoomId);

        var medicalRecord = new MedicalRecord
        {
            Id = Guid.NewGuid(),
            MedicalRecordCode = await GenerateMedicalRecordCodeAsync(),
            PatientId = patient.Id,
            AdmissionDate = DateTime.Now,
            PatientType = dto.ServiceType, // 2-Vien phi, 3-Dich vu
            TreatmentType = 1, // Ngoai tru
            RoomId = dto.RoomId,
            DoctorId = dto.DoctorId,
            DepartmentId = room?.DepartmentId,
            Status = 0 // Waiting
        };

        await _medicalRecordRepo.AddAsync(medicalRecord);

        // Create examination
        var examination = new Examination
        {
            Id = Guid.NewGuid(),
            MedicalRecordId = medicalRecord.Id,
            ExaminationType = 1, // Primary
            DepartmentId = room?.DepartmentId ?? Guid.Empty,
            RoomId = dto.RoomId,
            DoctorId = dto.DoctorId,
            Status = 0 // Waiting
        };

        await _examinationRepo.AddAsync(examination);

        // Issue queue ticket
        var queueTicket = await IssueQueueTicketAsync(new IssueQueueTicketDto
        {
            PatientId = patient.Id,
            PatientName = patient.FullName,
            RoomId = dto.RoomId,
            QueueType = 2, // Kham benh
            Priority = dto.IsPriority ? 1 : 0,
            Source = "Reception"
        });

        examination.QueueNumber = queueTicket.QueueNumber;
        await _examinationRepo.UpdateAsync(examination);
        await _unitOfWork.SaveChangesAsync();

        return MapToAdmissionDto(medicalRecord, patient, room, queueTicket);
    }

    public async Task<AdmissionDto> QuickRegisterByPhoneAsync(string phoneNumber, Guid roomId, int serviceType, Guid userId)
    {
        var patient = await _context.Patients.FirstOrDefaultAsync(p => p.PhoneNumber == phoneNumber);
        if (patient == null) throw new Exception("Khong tim thay benh nhan voi SĐT nay");

        return await RegisterFeePatientAsync(new FeeRegistrationDto
        {
            PatientId = patient.Id,
            RoomId = roomId,
            ServiceType = serviceType
        }, userId);
    }

    #endregion

    #region 1.9 Health Check Registration

    public async Task<HealthCheckContractDto> CreateHealthCheckContractAsync(HealthCheckContractDto dto, Guid userId)
    {
        var contract = new HealthCheckContract
        {
            Id = Guid.NewGuid(),
            ContractCode = dto.ContractCode ?? $"HDKS{DateTime.Now:yyyyMMddHHmmss}",
            ContractName = dto.ContractName,
            CompanyName = dto.CompanyName,
            CompanyAddress = dto.CompanyAddress,
            CompanyPhone = dto.CompanyPhone,
            ContactPerson = dto.ContactPerson,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            TotalPatients = dto.TotalPatients,
            TotalAmount = dto.TotalAmount,
            DiscountRate = dto.DiscountRate,
            Status = 0, // Draft
            CreatedByUserId = userId
        };

        await _context.HealthCheckContracts.AddAsync(contract);
        await _unitOfWork.SaveChangesAsync();

        dto.Id = contract.Id;
        dto.Status = 0;
        return dto;
    }

    public async Task<HealthCheckContractDto> UpdateHealthCheckContractAsync(Guid id, HealthCheckContractDto dto, Guid userId)
    {
        var contract = await _context.HealthCheckContracts.FindAsync(id);
        if (contract == null) throw new Exception("Contract not found");

        contract.ContractName = dto.ContractName;
        contract.CompanyName = dto.CompanyName;
        contract.CompanyAddress = dto.CompanyAddress;
        contract.CompanyPhone = dto.CompanyPhone;
        contract.ContactPerson = dto.ContactPerson;
        contract.StartDate = dto.StartDate;
        contract.EndDate = dto.EndDate;
        contract.TotalPatients = dto.TotalPatients;
        contract.TotalAmount = dto.TotalAmount;
        contract.DiscountRate = dto.DiscountRate;

        await _unitOfWork.SaveChangesAsync();

        dto.Id = id;
        return dto;
    }

    public async Task<PagedResultDto<HealthCheckContractDto>> GetHealthCheckContractsAsync(string? keyword, int? status, int page, int pageSize)
    {
        var query = _context.HealthCheckContracts.AsQueryable();

        if (!string.IsNullOrEmpty(keyword))
        {
            query = query.Where(c => c.ContractCode.Contains(keyword) ||
                                    c.ContractName.Contains(keyword) ||
                                    c.CompanyName.Contains(keyword));
        }

        if (status.HasValue)
            query = query.Where(c => c.Status == status.Value);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new HealthCheckContractDto
            {
                Id = c.Id,
                ContractCode = c.ContractCode,
                ContractName = c.ContractName,
                CompanyName = c.CompanyName,
                CompanyAddress = c.CompanyAddress,
                CompanyPhone = c.CompanyPhone,
                ContactPerson = c.ContactPerson,
                StartDate = c.StartDate,
                EndDate = c.EndDate,
                TotalPatients = c.TotalPatients,
                TotalAmount = c.TotalAmount,
                DiscountRate = c.DiscountRate,
                Status = c.Status
            })
            .ToListAsync();

        return new PagedResultDto<HealthCheckContractDto>
        {
            Items = items,
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<(int Success, int Failed, List<string> Errors)> ImportHealthCheckPatientsAsync(HealthCheckImportDto dto, Guid userId)
    {
        var success = 0;
        var failed = 0;
        var errors = new List<string>();

        if (dto.Patients == null) return (success, failed, errors);

        foreach (var patientData in dto.Patients)
        {
            try
            {
                // Check if patient exists by ID number
                var existingPatient = await _context.Patients
                    .FirstOrDefaultAsync(p => p.IdentityNumber == patientData.IdentityNumber);

                if (existingPatient == null)
                {
                    // Create new patient
                    existingPatient = new Patient
                    {
                        Id = Guid.NewGuid(),
                        PatientCode = await GeneratePatientCodeAsync(),
                        FullName = patientData.FullName,
                        DateOfBirth = patientData.DateOfBirth,
                        Gender = patientData.Gender,
                        IdentityNumber = patientData.IdentityNumber,
                        PhoneNumber = patientData.PhoneNumber,
                        Address = patientData.Address
                    };
                    await _patientRepo.AddAsync(existingPatient);
                }

                success++;
            }
            catch (Exception ex)
            {
                failed++;
                errors.Add($"Loi dong {patientData.RowNumber}: {ex.Message}");
            }
        }

        await _unitOfWork.SaveChangesAsync();
        return (success, failed, errors);
    }

    public async Task<AdmissionDto> RegisterHealthCheckPatientAsync(HealthCheckRegistrationDto dto, Guid userId)
    {
        // Get health check package to determine room
        var package = dto.PackageId != Guid.Empty
            ? await _context.HealthCheckPackages.FindAsync(dto.PackageId)
            : null;

        // Get first room for health check (type 5)
        var healthCheckRoom = await _context.Rooms
            .Include(r => r.Department)
            .FirstOrDefaultAsync(r => r.IsActive && r.RoomType == 5);

        // Use fee registration with health check type
        return await RegisterFeePatientAsync(new FeeRegistrationDto
        {
            PatientId = dto.PatientId,
            NewPatient = dto.NewPatient,
            RoomId = healthCheckRoom?.Id ?? Guid.Empty,
            ServiceType = 4 // Health check
        }, userId);
    }

    public async Task<List<HealthCheckPackageDto>> GetHealthCheckPackagesAsync(int? forGender = null, int? age = null)
    {
        var query = _context.HealthCheckPackages
            .Include(p => p.PackageServices)
            .ThenInclude(s => s.Service)
            .Where(p => p.IsActive);

        if (forGender.HasValue)
            query = query.Where(p => p.ApplicableGender == null || p.ApplicableGender == forGender.Value);

        if (age.HasValue)
            query = query.Where(p => (p.MinAge == null || p.MinAge <= age.Value) &&
                                    (p.MaxAge == null || p.MaxAge >= age.Value));

        return await query
            .OrderBy(p => p.PackageName)
            .Select(p => new HealthCheckPackageDto
            {
                Id = p.Id,
                PackageCode = p.PackageCode,
                PackageName = p.PackageName,
                Description = p.Description,
                Price = p.PackagePrice,
                ApplicableGender = p.ApplicableGender,
                MinAge = p.MinAge,
                MaxAge = p.MaxAge,
                PackageServices = p.PackageServices.Select(s => new HealthCheckPackageServiceDto
                {
                    ServiceId = s.ServiceId,
                    ServiceCode = s.Service.ServiceCode,
                    ServiceName = s.Service.ServiceName,
                    IsMandatory = s.IsMandatory
                }).ToList()
            })
            .ToListAsync();
    }

    #endregion

    #region 1.10 Emergency Registration

    public async Task<AdmissionDto> RegisterEmergencyPatientAsync(EmergencyRegistrationDto dto, Guid userId)
    {
        Patient patient;

        if (dto.PatientId.HasValue)
        {
            patient = await _patientRepo.GetByIdAsync(dto.PatientId.Value)
                ?? throw new Exception("Patient not found");
        }
        else
        {
            // Create temporary patient for emergency
            patient = new Patient
            {
                Id = Guid.NewGuid(),
                PatientCode = await GeneratePatientCodeAsync(),
                FullName = dto.PatientName ?? "BENH NHAN CAP CUU",
                Gender = dto.Gender ?? 3,
                YearOfBirth = dto.EstimatedAge.HasValue ? DateTime.Today.Year - dto.EstimatedAge.Value : null,
                IdentityNumber = dto.IdentityNumber,
                PhoneNumber = dto.PhoneNumber,
                InsuranceNumber = dto.InsuranceNumber
            };
            await _patientRepo.AddAsync(patient);
        }

        // Get emergency room
        var emergencyRoom = await _context.Rooms
            .Include(r => r.Department)
            .FirstOrDefaultAsync(r => r.RoomType == 3 && r.IsActive); // Emergency room type

        if (emergencyRoom == null)
        {
            emergencyRoom = await _context.Rooms.Include(r => r.Department).FirstOrDefaultAsync(r => r.IsActive);
        }

        var medicalRecord = new MedicalRecord
        {
            Id = Guid.NewGuid(),
            MedicalRecordCode = await GenerateMedicalRecordCodeAsync(),
            PatientId = patient.Id,
            AdmissionDate = DateTime.Now,
            PatientType = dto.PatientType,
            TreatmentType = 3, // Emergency
            InsuranceNumber = dto.InsuranceNumber,
            RoomId = emergencyRoom?.Id,
            DepartmentId = emergencyRoom?.DepartmentId,
            InitialDiagnosis = dto.ChiefComplaint,
            Status = 0
        };

        await _medicalRecordRepo.AddAsync(medicalRecord);

        // Create examination with emergency priority
        var examination = new Examination
        {
            Id = Guid.NewGuid(),
            MedicalRecordId = medicalRecord.Id,
            ExaminationType = 1,
            DepartmentId = emergencyRoom?.DepartmentId ?? Guid.Empty,
            RoomId = emergencyRoom?.Id ?? Guid.Empty,
            ChiefComplaint = dto.ChiefComplaint,
            Status = 0
        };

        await _examinationRepo.AddAsync(examination);

        // Issue emergency queue ticket
        var queueTicket = await IssueQueueTicketAsync(new IssueQueueTicketDto
        {
            PatientId = patient.Id,
            PatientName = patient.FullName,
            RoomId = emergencyRoom?.Id ?? Guid.Empty,
            QueueType = 2,
            Priority = 2, // Emergency priority
            Source = "Emergency"
        });

        examination.QueueNumber = queueTicket.QueueNumber;
        await _unitOfWork.SaveChangesAsync();

        return MapToAdmissionDto(medicalRecord, patient, emergencyRoom, queueTicket);
    }

    public async Task<AdmissionDto> UpdateEmergencyPatientInfoAsync(UpdateEmergencyPatientDto dto, Guid userId)
    {
        var medicalRecord = await _context.MedicalRecords
            .Include(m => m.Patient)
            .FirstOrDefaultAsync(m => m.Id == dto.MedicalRecordId);

        if (medicalRecord == null) throw new Exception("Medical record not found");

        var patient = medicalRecord.Patient;
        patient.FullName = dto.FullName;
        patient.DateOfBirth = dto.DateOfBirth;
        patient.Gender = dto.Gender;
        patient.IdentityNumber = dto.IdentityNumber;
        patient.PhoneNumber = dto.PhoneNumber;
        patient.Address = dto.Address;
        patient.InsuranceNumber = dto.InsuranceNumber;

        if (dto.Guardian != null)
        {
            patient.GuardianName = dto.Guardian.FullName;
            patient.GuardianPhone = dto.Guardian.PhoneNumber;
            patient.GuardianRelationship = dto.Guardian.Relationship;
        }

        await _patientRepo.UpdateAsync(patient);
        await _unitOfWork.SaveChangesAsync();

        var room = medicalRecord.RoomId.HasValue
            ? await _context.Rooms.Include(r => r.Department).FirstOrDefaultAsync(r => r.Id == medicalRecord.RoomId)
            : null;

        return MapToAdmissionDto(medicalRecord, patient, room, null);
    }

    public async Task MergePatientsAsync(MergePatientDto dto, Guid userId)
    {
        // Transfer all records from source to target
        var sourceRecords = await _context.MedicalRecords
            .Where(m => m.PatientId == dto.SourcePatientId)
            .ToListAsync();

        foreach (var record in sourceRecords)
        {
            record.PatientId = dto.TargetPatientId;
        }

        // Delete source patient
        var sourcePatient = await _patientRepo.GetByIdAsync(dto.SourcePatientId);
        if (sourcePatient != null)
        {
            await _patientRepo.DeleteAsync(sourcePatient);
        }

        await _unitOfWork.SaveChangesAsync();
    }

    public async Task<DepositReceiptDto> CreateEmergencyDepositAsync(Guid medicalRecordId, decimal amount, Guid userId)
    {
        return await CreateDepositAsync(new ReceptionDepositDto
        {
            MedicalRecordId = medicalRecordId,
            Amount = amount,
            PaymentMethod = 1, // Cash
            Notes = "Tam ung cap cuu"
        }, userId);
    }

    #endregion

    #region 1.11 Other Reception Management

    public async Task<List<ReceptionWarningDto>> GetReceptionWarningsAsync(Guid patientId)
    {
        var warnings = new List<ReceptionWarningDto>();

        // Check debt
        var hasDebt = await _context.MedicalRecords
            .AnyAsync(m => m.PatientId == patientId && m.Status != 4); // Not fully paid

        if (hasDebt)
        {
            warnings.Add(new ReceptionWarningDto
            {
                WarningType = 1,
                Message = "Benh nhan con no vien phi tu lan kham truoc",
                IsBlocking = false
            });
        }

        // Check recent visit
        var recentVisit = await _context.MedicalRecords
            .Where(m => m.PatientId == patientId && m.AdmissionDate.Date == DateTime.Today)
            .AnyAsync();

        if (recentVisit)
        {
            warnings.Add(new ReceptionWarningDto
            {
                WarningType = 3,
                Message = "Benh nhan da dang ky kham trong ngay hom nay",
                IsBlocking = false
            });
        }

        return warnings;
    }

    public async Task<AdmissionDto> ChangeRoomAsync(ChangeRoomDto dto, Guid userId)
    {
        var medicalRecord = await _context.MedicalRecords
            .Include(m => m.Patient)
            .FirstOrDefaultAsync(m => m.Id == dto.MedicalRecordId);

        if (medicalRecord == null) throw new Exception("Medical record not found");

        medicalRecord.RoomId = dto.NewRoomId;
        if (dto.NewDoctorId.HasValue)
            medicalRecord.DoctorId = dto.NewDoctorId;

        // Update examination
        var examination = await _context.Examinations
            .Where(e => e.MedicalRecordId == dto.MedicalRecordId && e.Status < 4)
            .FirstOrDefaultAsync();

        if (examination != null)
        {
            examination.RoomId = dto.NewRoomId;
            if (dto.NewDoctorId.HasValue)
                examination.DoctorId = dto.NewDoctorId;
        }

        await _unitOfWork.SaveChangesAsync();

        var room = await _context.Rooms.Include(r => r.Department).FirstOrDefaultAsync(r => r.Id == dto.NewRoomId);
        return MapToAdmissionDto(medicalRecord, medicalRecord.Patient, room, null);
    }

    public async Task<AdmissionDto> UpdateAdmissionAsync(Guid id, Application.DTOs.UpdateAdmissionDto dto, Guid userId)
    {
        var medicalRecord = await _context.MedicalRecords
            .Include(m => m.Patient)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (medicalRecord == null) throw new Exception("Medical record not found");

        if (dto.DepartmentId.HasValue)
            medicalRecord.DepartmentId = dto.DepartmentId;
        if (dto.RoomId.HasValue)
            medicalRecord.RoomId = dto.RoomId;
        if (dto.AttendingDoctorId.HasValue)
            medicalRecord.DoctorId = dto.AttendingDoctorId;
        if (!string.IsNullOrEmpty(dto.InitialDiagnosis))
            medicalRecord.InitialDiagnosis = dto.InitialDiagnosis;

        await _unitOfWork.SaveChangesAsync();

        var room = medicalRecord.RoomId.HasValue
            ? await _context.Rooms.Include(r => r.Department).FirstOrDefaultAsync(r => r.Id == medicalRecord.RoomId)
            : null;

        return MapToAdmissionDto(medicalRecord, medicalRecord.Patient, room, null);
    }

    public async Task<AdmissionDto> RegisterWithOtherPayerAsync(Guid admissionId, Guid payerId, Guid userId)
    {
        var medicalRecord = await _context.MedicalRecords
            .Include(m => m.Patient)
            .FirstOrDefaultAsync(m => m.Id == admissionId);

        if (medicalRecord == null) throw new Exception("Medical record not found");

        // TODO: Link to other payer
        await _unitOfWork.SaveChangesAsync();

        var room = medicalRecord.RoomId.HasValue
            ? await _context.Rooms.Include(r => r.Department).FirstOrDefaultAsync(r => r.Id == medicalRecord.RoomId)
            : null;

        return MapToAdmissionDto(medicalRecord, medicalRecord.Patient, room, null);
    }

    public async Task<List<OtherPayerDto>> GetOtherPayersAsync()
    {
        return await _context.OtherPayers
            .Where(p => p.IsActive)
            .OrderBy(p => p.PayerName)
            .Select(p => new OtherPayerDto
            {
                Id = p.Id,
                PayerCode = p.PayerCode,
                PayerName = p.PayerName,
                PayerType = p.PayerType,
                TaxCode = p.TaxCode,
                Address = p.Address,
                PhoneNumber = p.PhoneNumber,
                Email = p.Email,
                ContactPerson = p.ContactPerson,
                CreditLimit = p.CreditLimit,
                CurrentDebt = p.CurrentDebt,
                IsActive = p.IsActive
            })
            .ToListAsync();
    }

    public async Task SaveGuardianInfoAsync(Guid patientId, GuardianInfoDto guardian, Guid userId)
    {
        var patient = await _patientRepo.GetByIdAsync(patientId);
        if (patient == null) throw new Exception("Patient not found");

        patient.GuardianName = guardian.FullName;
        patient.GuardianPhone = guardian.PhoneNumber;
        patient.GuardianRelationship = guardian.Relationship;

        await _patientRepo.UpdateAsync(patient);
        await _unitOfWork.SaveChangesAsync();
    }

    #endregion

    #region 1.12 Visit History

    public async Task<List<PatientVisitHistoryDto>> GetPatientVisitHistoryAsync(Guid patientId, int maxRecords = 5)
    {
        var records = await _context.MedicalRecords
            .Include(m => m.Department)
            .Include(m => m.Room)
            .Include(m => m.Doctor)
            .Where(m => m.PatientId == patientId)
            .OrderByDescending(m => m.AdmissionDate)
            .Take(maxRecords)
            .ToListAsync();

        return records.Select(m => new PatientVisitHistoryDto
        {
            MedicalRecordId = m.Id,
            MedicalRecordCode = m.MedicalRecordCode,
            VisitDate = m.AdmissionDate,
            DepartmentName = m.Department?.DepartmentName,
            RoomName = m.Room?.RoomName,
            DoctorName = m.Doctor?.FullName,
            DiagnosisCode = m.MainIcdCode,
            DiagnosisName = m.MainDiagnosis,
            PatientType = m.PatientType
        }).ToList();
    }

    public async Task<PatientVisitHistoryDto?> GetVisitDetailAsync(Guid medicalRecordId)
    {
        var record = await _context.MedicalRecords
            .Include(m => m.Department)
            .Include(m => m.Room)
            .Include(m => m.Doctor)
            .FirstOrDefaultAsync(m => m.Id == medicalRecordId);

        if (record == null) return null;

        return new PatientVisitHistoryDto
        {
            MedicalRecordId = record.Id,
            MedicalRecordCode = record.MedicalRecordCode,
            VisitDate = record.AdmissionDate,
            DepartmentName = record.Department?.DepartmentName,
            RoomName = record.Room?.RoomName,
            DoctorName = record.Doctor?.FullName,
            DiagnosisCode = record.MainIcdCode,
            DiagnosisName = record.MainDiagnosis,
            PatientType = record.PatientType
        };
    }

    public async Task<HistoryDisplayConfigDto> GetHistoryDisplayConfigAsync(Guid userId)
    {
        return new HistoryDisplayConfigDto
        {
            ShowHistory = true,
            MaxHistoryRecords = 5,
            ShowDiagnosis = true,
            ShowServices = true,
            ShowCost = false
        };
    }

    public async Task SaveHistoryDisplayConfigAsync(Guid userId, HistoryDisplayConfigDto config)
    {
        // TODO: Save user preferences
    }

    #endregion

    #region 1.13 Service Orders at Reception

    public async Task<List<ServiceOrderResultDto>> OrderServicesAtReceptionAsync(ReceptionServiceOrderDto dto, Guid userId)
    {
        var results = new List<ServiceOrderResultDto>();

        foreach (var item in dto.Services)
        {
            var service = await _context.Services.FindAsync(item.ServiceId);
            if (service == null) continue;

            var serviceRequest = new ServiceRequest
            {
                Id = Guid.NewGuid(),
                MedicalRecordId = dto.MedicalRecordId,
                ServiceId = item.ServiceId,
                Quantity = item.Quantity,
                UnitPrice = service.UnitPrice,
                TotalPrice = service.UnitPrice * item.Quantity,
                RoomId = item.RoomId,
                Status = 0, // Pending
                RequestedByUserId = userId,
                RequestedDate = DateTime.Now,
                Notes = item.Notes
            };

            await _context.ServiceRequests.AddAsync(serviceRequest);

            results.Add(new ServiceOrderResultDto
            {
                Id = serviceRequest.Id,
                ServiceId = service.Id,
                ServiceCode = service.ServiceCode,
                ServiceName = service.ServiceName,
                Quantity = item.Quantity,
                UnitPrice = service.UnitPrice,
                TotalPrice = serviceRequest.TotalPrice,
                RoomId = item.RoomId,
                Status = 0
            });
        }

        await _unitOfWork.SaveChangesAsync();
        return results;
    }

    public async Task<List<ServiceOrderResultDto>> OrderServicesByGroupAsync(Guid medicalRecordId, Guid groupId, Guid userId)
    {
        // Get service group template with items
        var template = await _context.ServiceGroupTemplates
            .Include(t => t.Items)
            .ThenInclude(i => i.Service)
            .FirstOrDefaultAsync(t => t.Id == groupId && t.IsActive);

        if (template == null) return new List<ServiceOrderResultDto>();

        var results = new List<ServiceOrderResultDto>();

        foreach (var item in template.Items)
        {
            var service = item.Service;
            if (service == null || !service.IsActive) continue;

            var serviceRequest = new ServiceRequest
            {
                Id = Guid.NewGuid(),
                MedicalRecordId = medicalRecordId,
                ServiceId = item.ServiceId,
                Quantity = item.Quantity,
                UnitPrice = service.UnitPrice,
                TotalPrice = service.UnitPrice * item.Quantity,
                Status = 0, // Pending
                RequestedByUserId = userId,
                RequestedDate = DateTime.Now,
                Notes = item.Notes
            };

            await _context.ServiceRequests.AddAsync(serviceRequest);

            results.Add(new ServiceOrderResultDto
            {
                Id = serviceRequest.Id,
                ServiceId = service.Id,
                ServiceCode = service.ServiceCode,
                ServiceName = service.ServiceName,
                Quantity = item.Quantity,
                UnitPrice = service.UnitPrice,
                TotalPrice = serviceRequest.TotalPrice,
                Status = 0
            });
        }

        await _unitOfWork.SaveChangesAsync();
        return results;
    }

    public async Task<ServiceOrderResultDto> UpdateServiceOrderAsync(Guid orderId, ServiceOrderItemDto dto, Guid userId)
    {
        var request = await _context.ServiceRequests.FindAsync(orderId);
        if (request == null) throw new Exception("Service order not found");

        request.Quantity = dto.Quantity;
        request.TotalPrice = request.UnitPrice * dto.Quantity;
        request.RoomId = dto.RoomId;
        request.Notes = dto.Notes;

        await _unitOfWork.SaveChangesAsync();

        var service = await _context.Services.FindAsync(request.ServiceId);

        return new ServiceOrderResultDto
        {
            Id = request.Id,
            ServiceId = request.ServiceId ?? Guid.Empty,
            ServiceCode = service?.ServiceCode ?? "",
            ServiceName = service?.ServiceName ?? "",
            Quantity = request.Quantity,
            UnitPrice = request.UnitPrice,
            TotalPrice = request.TotalPrice,
            RoomId = request.RoomId,
            Status = request.Status
        };
    }

    public async Task DeleteServiceOrderAsync(Guid orderId, Guid userId)
    {
        var request = await _context.ServiceRequests.FindAsync(orderId);
        if (request != null && request.Status == 0)
        {
            _context.ServiceRequests.Remove(request);
            await _unitOfWork.SaveChangesAsync();
        }
    }

    public async Task<List<ServiceGroupDto>> GetServiceGroupsAsync(Guid userId)
    {
        // Get user's service group templates
        var templates = await _context.ServiceGroupTemplates
            .Include(t => t.Items)
            .ThenInclude(i => i.Service)
            .Where(t => t.IsActive && (t.IsPublic || t.CreatedByUserId == userId))
            .OrderBy(t => t.TemplateName)
            .ToListAsync();

        return templates.Select(t => new ServiceGroupDto
        {
            Id = t.Id,
            GroupCode = t.TemplateCode,
            GroupName = t.TemplateName,
            IsPublic = t.IsPublic,
            Services = t.Items.Select(i => new ServiceGroupItemDto
            {
                ServiceId = i.ServiceId,
                ServiceCode = i.Service?.ServiceCode ?? "",
                ServiceName = i.Service?.ServiceName ?? "",
                Quantity = i.Quantity,
                UnitPrice = i.Service?.UnitPrice ?? 0
            }).ToList()
        }).ToList();
    }

    public async Task<ServiceGroupDto> CreateServiceGroupAsync(ServiceGroupDto dto, Guid userId)
    {
        var template = new ServiceGroupTemplate
        {
            Id = Guid.NewGuid(),
            TemplateCode = dto.GroupCode ?? $"NDV{DateTime.Now:yyyyMMddHHmmss}",
            TemplateName = dto.GroupName,
            IsPublic = dto.IsPublic,
            IsActive = true,
            CreatedByUserId = userId,
            Items = new List<ServiceGroupTemplateItem>()
        };

        if (dto.Services != null)
        {
            foreach (var item in dto.Services)
            {
                template.Items.Add(new ServiceGroupTemplateItem
                {
                    Id = Guid.NewGuid(),
                    ServiceGroupTemplateId = template.Id,
                    ServiceId = item.ServiceId,
                    Quantity = item.Quantity
                });
            }
        }

        await _context.ServiceGroupTemplates.AddAsync(template);
        await _unitOfWork.SaveChangesAsync();

        dto.Id = template.Id;
        return dto;
    }

    public async Task<OptimalPathResultDto> CalculateOptimalPathAsync(Guid medicalRecordId)
    {
        // Get pending service requests for this medical record
        var serviceRequests = await _context.ServiceRequests
            .Include(r => r.Service)
            .Include(r => r.Room)
            .ThenInclude(r => r.Department)
            .Where(r => r.MedicalRecordId == medicalRecordId && r.Status == 0)
            .OrderBy(r => r.Service.ServiceType)
            .ToListAsync();

        var steps = new List<PathStepDto>();
        var totalMinutes = 0;
        var stepNumber = 1;

        foreach (var request in serviceRequests)
        {
            // Find optimal room for this service
            var room = request.Room;
            if (room == null && request.Service != null)
            {
                room = await _context.Rooms
                    .Include(r => r.Department)
                    .FirstOrDefaultAsync(r => r.IsActive && r.RoomType == request.Service.ServiceType);
            }

            var estimatedMinutes = request.Service?.ServiceType switch
            {
                1 => 15, // Examination
                2 => 30, // Lab
                3 => 20, // Imaging
                4 => 10, // Procedure
                _ => 15
            };

            steps.Add(new PathStepDto
            {
                StepNumber = stepNumber++,
                ServiceId = request.ServiceId ?? Guid.Empty,
                ServiceName = request.Service?.ServiceName ?? "",
                RoomId = room?.Id ?? Guid.Empty,
                RoomCode = room?.RoomCode ?? "",
                RoomName = room?.RoomName ?? "",
                DepartmentName = room?.Department?.DepartmentName ?? "",
                Floor = room?.Floor ?? "",
                Building = room?.Building ?? "",
                EstimatedMinutes = estimatedMinutes,
                WaitingCount = 0 // Could be calculated from queue
            });

            totalMinutes += estimatedMinutes;
        }

        return new OptimalPathResultDto
        {
            TotalEstimatedMinutes = totalMinutes,
            Steps = steps
        };
    }

    #endregion

    #region 1.14 Printing

    public async Task<byte[]> PrintExaminationSlipAsync(Guid medicalRecordId)
    {
        var slip = await GetExaminationSlipDataAsync(medicalRecordId);
        var fields = new List<KeyValuePair<string, string>>
        {
            new("Medical Record", slip.MedicalRecordCode),
            new("Patient Code", slip.PatientCode),
            new("Patient Name", slip.PatientName),
            new("Gender", slip.Gender == 1 ? "Male" : slip.Gender == 2 ? "Female" : "Other"),
            new("Age", slip.Age.ToString()),
            new("Admission Date", slip.AdmissionDate.ToString("yyyy-MM-dd HH:mm")),
            new("Queue Number", slip.QueueNumber.ToString()),
            new("Room", slip.RoomName),
            new("Doctor", slip.DoctorName ?? "-"),
            new("Insurance Number", slip.InsuranceNumber ?? "-")
        };

        return BuildSimplePdf("EXAMINATION SLIP", fields);
    }

    public async Task<byte[]> PrintInsuranceCardHoldSlipAsync(Guid documentHoldId)
    {
        var hold = await _context.DocumentHolds
            .Include(x => x.Patient)
            .Include(x => x.MedicalRecord)
            .FirstOrDefaultAsync(x => x.Id == documentHoldId);

        if (hold == null)
            throw new Exception("Document hold not found");

        var fields = new List<KeyValuePair<string, string>>
        {
            new("Patient Code", hold.Patient?.PatientCode ?? "-"),
            new("Patient Name", hold.Patient?.FullName ?? "-"),
            new("Medical Record", hold.MedicalRecord?.MedicalRecordCode ?? "-"),
            new("Document Type", GetDocumentTypeName(hold.DocumentType)),
            new("Document Number", hold.DocumentNumber),
            new("Quantity", hold.Quantity.ToString()),
            new("Hold Date", hold.HoldDate.ToString("yyyy-MM-dd HH:mm")),
            new("Held By", hold.HoldBy),
            new("Status", hold.Status == 0 ? "Holding" : hold.Status == 1 ? "Returned" : "Lost")
        };

        return BuildSimplePdf("INSURANCE/DOCUMENT HOLD RECEIPT", fields);
    }

    public async Task<byte[]> PrintPatientCardAsync(Guid patientId)
    {
        var patient = await _context.Patients.FirstOrDefaultAsync(x => x.Id == patientId);
        if (patient == null)
            throw new Exception("Patient not found");

        var latestRecord = await _context.MedicalRecords
            .Include(x => x.Room)
            .Where(x => x.PatientId == patientId)
            .OrderByDescending(x => x.AdmissionDate)
            .FirstOrDefaultAsync();

        var fields = new List<KeyValuePair<string, string>>
        {
            new("Patient Code", patient.PatientCode),
            new("Patient Name", patient.FullName),
            new("Gender", patient.Gender == 1 ? "Male" : patient.Gender == 2 ? "Female" : "Other"),
            new("Date of Birth", patient.DateOfBirth?.ToString("yyyy-MM-dd") ?? "-"),
            new("Phone", patient.PhoneNumber ?? "-"),
            new("Address", patient.Address ?? "-"),
            new("Insurance Number", patient.InsuranceNumber ?? "-"),
            new("Latest Medical Record", latestRecord?.MedicalRecordCode ?? "-"),
            new("Latest Room", latestRecord?.Room?.RoomName ?? "-")
        };

        return BuildSimplePdf("PATIENT CARD", fields);
    }

    public async Task<byte[]> PrintServiceOrderSlipAsync(Guid medicalRecordId)
    {
        var medicalRecord = await _context.MedicalRecords
            .Include(x => x.Patient)
            .FirstOrDefaultAsync(x => x.Id == medicalRecordId);

        if (medicalRecord == null)
            throw new Exception("Medical record not found");

        List<ServiceRequest> serviceRequests;
        try
        {
            serviceRequests = await _context.ServiceRequests
                .Include(x => x.Service)
                .Where(x => x.MedicalRecordId == medicalRecordId)
                .OrderByDescending(x => x.RequestDate)
                .Take(20)
                .ToListAsync();
        }
        catch
        {
            // Fallback for environments where service-order schema is incomplete.
            serviceRequests = new List<ServiceRequest>();
        }

        var fields = new List<KeyValuePair<string, string>>
        {
            new("Medical Record", medicalRecord.MedicalRecordCode),
            new("Patient Code", medicalRecord.Patient?.PatientCode ?? "-"),
            new("Patient Name", medicalRecord.Patient?.FullName ?? "-"),
            new("Total Requests", serviceRequests.Count.ToString()),
            new("Total Amount", serviceRequests.Sum(x => x.TotalPrice).ToString("N0"))
        };

        var details = serviceRequests.Select(x =>
            $"{x.RequestCode} | {(x.Service?.ServiceName ?? "-")} | Qty: {x.Quantity} | Amount: {x.TotalPrice:N0}");

        return BuildSimplePdf("SERVICE ORDER SLIP", fields, details);
    }

    public async Task<ExaminationSlipDto> GetExaminationSlipDataAsync(Guid medicalRecordId)
    {
        var record = await _context.MedicalRecords
            .Include(m => m.Patient)
            .Include(m => m.Room)
            .Include(m => m.Doctor)
            .FirstOrDefaultAsync(m => m.Id == medicalRecordId);

        if (record == null) throw new Exception("Medical record not found");

        var examination = await _context.Examinations
            .FirstOrDefaultAsync(e => e.MedicalRecordId == medicalRecordId);

        return new ExaminationSlipDto
        {
            HospitalName = "BENH VIEN",
            MedicalRecordCode = record.MedicalRecordCode,
            QueueNumber = examination?.QueueNumber ?? 0,
            AdmissionDate = record.AdmissionDate,
            PatientCode = record.Patient.PatientCode,
            PatientName = record.Patient.FullName,
            Gender = record.Patient.Gender,
            Age = record.Patient.DateOfBirth.HasValue
                ? DateTime.Today.Year - record.Patient.DateOfBirth.Value.Year
                : record.Patient.YearOfBirth.HasValue
                    ? DateTime.Today.Year - record.Patient.YearOfBirth.Value
                    : 0,
            Address = record.Patient.Address,
            PatientType = record.PatientType,
            InsuranceNumber = record.InsuranceNumber,
            RoomName = record.Room?.RoomName ?? "",
            DoctorName = record.Doctor?.FullName
        };
    }

    #endregion

    #region 1.16 Billing at Reception

    public async Task<DepositReceiptDto> CreateDepositAsync(ReceptionDepositDto dto, Guid userId)
    {
        var receiptNumber = await GenerateDepositReceiptNumberAsync();

        var deposit = new Deposit
        {
            Id = Guid.NewGuid(),
            ReceiptNumber = receiptNumber,
            ReceiptDate = DateTime.Now,
            MedicalRecordId = dto.MedicalRecordId,
            Amount = dto.Amount,
            PaymentMethod = dto.PaymentMethod,
            TransactionReference = dto.TransactionReference,
            Notes = dto.Notes,
            ReceivedByUserId = userId,
            Status = 1, // Active
            UsedAmount = 0,
            RemainingAmount = dto.Amount
        };

        // Get patient from medical record
        var medicalRecord = await _context.MedicalRecords.FindAsync(dto.MedicalRecordId);
        if (medicalRecord != null)
        {
            deposit.PatientId = medicalRecord.PatientId;
        }

        await _context.Deposits.AddAsync(deposit);
        await _unitOfWork.SaveChangesAsync();

        return new DepositReceiptDto
        {
            Id = deposit.Id,
            ReceiptNumber = deposit.ReceiptNumber,
            ReceiptDate = deposit.ReceiptDate,
            Amount = deposit.Amount,
            PaymentMethod = deposit.PaymentMethod,
            TransactionReference = deposit.TransactionReference,
            Notes = deposit.Notes
        };
    }

    public async Task<PaymentReceiptDto> CreatePaymentAsync(ReceptionPaymentDto dto, Guid userId)
    {
        var receiptNumber = await GeneratePaymentReceiptNumberAsync();

        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            ReceiptNumber = receiptNumber,
            ReceiptDate = DateTime.Now,
            MedicalRecordId = dto.MedicalRecordId,
            TotalAmount = dto.TotalAmount,
            InsuranceAmount = dto.InsuranceAmount,
            PatientAmount = dto.PatientAmount,
            DiscountAmount = dto.DiscountAmount,
            PaidAmount = dto.PaidAmount,
            ChangeAmount = dto.PaidAmount - dto.PatientAmount,
            PaymentMethod = dto.PaymentMethod,
            TransactionReference = dto.TransactionReference,
            ReceivedByUserId = userId,
            Status = 1 // Paid
        };

        // Get patient from medical record
        var medicalRecord = await _context.MedicalRecords.FindAsync(dto.MedicalRecordId);
        if (medicalRecord != null)
        {
            payment.PatientId = medicalRecord.PatientId;
        }

        await _context.Payments.AddAsync(payment);
        await _unitOfWork.SaveChangesAsync();

        return new PaymentReceiptDto
        {
            Id = payment.Id,
            ReceiptNumber = payment.ReceiptNumber,
            ReceiptDate = payment.ReceiptDate,
            TotalAmount = payment.TotalAmount,
            PaidAmount = payment.PaidAmount,
            ChangeAmount = payment.ChangeAmount,
            PaymentMethod = payment.PaymentMethod
        };
    }

    public async Task<PatientBillingInfoDto> GetPatientBillingInfoAsync(Guid medicalRecordId)
    {
        var record = await _context.MedicalRecords
            .Include(m => m.Patient)
            .FirstOrDefaultAsync(m => m.Id == medicalRecordId);

        if (record == null) throw new Exception("Medical record not found");

        // Calculate total service amount
        var totalServiceAmount = await _context.ServiceRequests
            .Where(s => s.MedicalRecordId == medicalRecordId)
            .SumAsync(s => s.TotalPrice);

        // Calculate prescription amount
        var prescriptionAmount = await _context.Prescriptions
            .Where(p => p.MedicalRecordId == medicalRecordId)
            .SumAsync(p => p.TotalAmount);

        var totalAmount = totalServiceAmount + prescriptionAmount;

        // Calculate insurance coverage
        var insuranceAmount = await _context.ServiceRequests
            .Where(s => s.MedicalRecordId == medicalRecordId)
            .SumAsync(s => s.InsuranceAmount);

        insuranceAmount += await _context.Prescriptions
            .Where(p => p.MedicalRecordId == medicalRecordId)
            .SumAsync(p => p.InsuranceAmount);

        // Get deposits
        var depositAmount = await _context.Deposits
            .Where(d => d.MedicalRecordId == medicalRecordId && d.Status == 1)
            .SumAsync(d => d.RemainingAmount);

        // Get payments
        var paidAmount = await _context.Payments
            .Where(p => p.MedicalRecordId == medicalRecordId && p.Status == 1)
            .SumAsync(p => p.PaidAmount);

        var patientAmount = totalAmount - insuranceAmount;
        var remainingAmount = patientAmount - paidAmount - depositAmount;

        return new PatientBillingInfoDto
        {
            MedicalRecordId = medicalRecordId,
            PatientName = record.Patient.FullName,
            PatientType = record.PatientType,
            TotalServiceAmount = totalAmount,
            InsuranceCoverage = insuranceAmount,
            PatientResponsibility = patientAmount,
            DepositAmount = depositAmount,
            PaidAmount = paidAmount,
            RemainingAmount = remainingAmount > 0 ? remainingAmount : 0
        };
    }

    #endregion

    #region 1.17 Smart Card

    public async Task<SmartCardDataDto> ReadSmartCardAsync(string cardData)
    {
        // Parse smart card data
        return new SmartCardDataDto
        {
            CardNumber = cardData.Length > 10 ? cardData.Substring(0, 10) : cardData,
            PatientName = "Unknown",
            RecentVisits = new List<SmartCardVisitDto>()
        };
    }

    public async Task WriteSmartCardAsync(Guid patientId, string cardData)
    {
        // TODO: Implement smart card writing
    }

    public async Task<bool> CheckBHXHConnectionAsync()
    {
        // TODO: Implement BHXH gateway connection check
        return true;
    }

    #endregion

    #region Statistics and Reports

    public async Task<QueueRoomStatisticsDto> GetRoomQueueStatisticsAsync(Guid roomId, DateTime date)
    {
        var room = await _roomRepo.GetByIdAsync(roomId);
        var stats = await GetRoomStatsAsync(roomId, date);

        return new QueueRoomStatisticsDto
        {
            RoomId = roomId,
            RoomName = room?.RoomName ?? "",
            TotalWaiting = stats.Waiting,
            TotalServing = stats.InProgress,
            TotalCompleted = stats.Completed,
            TotalSkipped = 0,
            AverageWaitMinutes = 15
        };
    }

    public async Task<List<QueueRoomStatisticsDto>> GetDepartmentQueueStatisticsAsync(Guid departmentId, DateTime date)
    {
        var rooms = await _context.Rooms.Where(r => r.DepartmentId == departmentId).ToListAsync();
        var result = new List<QueueRoomStatisticsDto>();

        foreach (var room in rooms)
        {
            result.Add(await GetRoomQueueStatisticsAsync(room.Id, date));
        }

        return result;
    }

    public async Task<QueueDailyStatisticsDto> GetDailyStatisticsAsync(DateTime date, Guid? departmentId)
    {
        var query = _context.QueueTickets.Where(t => t.IssueDate.Date == date.Date);

        if (departmentId.HasValue)
        {
            var roomIds = await _context.Rooms
                .Where(r => r.DepartmentId == departmentId.Value)
                .Select(r => r.Id)
                .ToListAsync();
            query = query.Where(t => t.RoomId.HasValue && roomIds.Contains(t.RoomId.Value));
        }

        var tickets = await query.ToListAsync();

        return new QueueDailyStatisticsDto
        {
            Date = date,
            TotalTickets = tickets.Count,
            ServedTickets = tickets.Count(t => t.Status == 3),
            SkippedTickets = tickets.Count(t => t.Status == 4),
            AverageWaitingTime = 15,
            AverageServiceTime = 10
        };
    }

    public async Task<AverageWaitingTimeDto> GetAverageWaitingTimeAsync(DateTime fromDate, DateTime toDate, Guid? roomId)
    {
        return new AverageWaitingTimeDto
        {
            OverallAverage = 15,
            InsurancePatientAverage = 20,
            FeePatientAverage = 10,
            ServicePatientAverage = 8
        };
    }

    public async Task<byte[]> ExportQueueReportAsync(QueueReportRequestDto dto)
    {
        // TODO: Implement report export
        return Array.Empty<byte>();
    }

    public async Task<QueueConfigurationDto?> GetQueueConfigurationAsync(Guid roomId, int queueType)
    {
        var config = await _context.QueueConfigurations
            .FirstOrDefaultAsync(c => c.RoomId == roomId && c.QueueType == queueType);

        if (config == null) return null;

        return new QueueConfigurationDto
        {
            RoomId = config.RoomId,
            QueueType = config.QueueType,
            NumberPrefix = config.Prefix,
            StartNumber = config.StartNumber,
            ResetDaily = config.ResetDaily,
            MaxCallCount = 3,
            CallIntervalSeconds = 30,
            AutoSkipMinutes = 15,
            EnableVoiceCall = true,
            DisplayRows = 5
        };
    }

    public async Task<QueueConfigurationDto> SaveQueueConfigurationAsync(QueueConfigurationDto dto)
    {
        var config = await _context.QueueConfigurations
            .FirstOrDefaultAsync(c => c.RoomId == dto.RoomId && c.QueueType == dto.QueueType);

        if (config == null)
        {
            config = new QueueConfiguration
            {
                Id = Guid.NewGuid(),
                RoomId = dto.RoomId,
                QueueType = dto.QueueType
            };
            await _context.QueueConfigurations.AddAsync(config);
        }

        config.Prefix = dto.NumberPrefix;
        config.StartNumber = dto.StartNumber;
        config.ResetDaily = dto.ResetDaily;

        await _unitOfWork.SaveChangesAsync();
        return dto;
    }

    #endregion

    #region Private Helper Methods

    private static byte[] BuildSimplePdf(
        string title,
        IEnumerable<KeyValuePair<string, string>> fields,
        IEnumerable<string>? details = null)
    {
        using var memoryStream = new MemoryStream();
        using var writer = new PdfWriter(memoryStream);
        using var pdf = new PdfDocument(writer);
        using var document = new Document(pdf);

        var regularFont = PdfFontFactory.CreateFont(StandardFonts.HELVETICA);
        var boldFont = PdfFontFactory.CreateFont(StandardFonts.HELVETICA_BOLD);

        document.Add(new iText.Layout.Element.Paragraph(title)
            .SetFont(boldFont)
            .SetTextAlignment(TextAlignment.CENTER)
            .SetFontSize(16)
            .SetMarginBottom(12));

        foreach (var field in fields)
        {
            var key = string.IsNullOrWhiteSpace(field.Key) ? "-" : field.Key;
            var value = string.IsNullOrWhiteSpace(field.Value) ? "-" : field.Value;
            document.Add(new iText.Layout.Element.Paragraph($"{key}: {value}")
                .SetFont(regularFont)
                .SetFontSize(10)
                .SetMarginBottom(4));
        }

        if (details != null)
        {
            var detailItems = details.Where(x => !string.IsNullOrWhiteSpace(x)).ToList();
            if (detailItems.Count > 0)
            {
                document.Add(new iText.Layout.Element.Paragraph("DETAILS")
                    .SetFont(boldFont)
                    .SetFontSize(12)
                    .SetMarginTop(12)
                    .SetMarginBottom(6));

                foreach (var detail in detailItems)
                {
                    document.Add(new iText.Layout.Element.Paragraph($"- {detail}")
                        .SetFont(regularFont)
                        .SetFontSize(9)
                        .SetMarginBottom(2));
                }
            }
        }

        document.Add(new iText.Layout.Element.Paragraph($"Generated at: {DateTime.Now:yyyy-MM-dd HH:mm:ss}")
            .SetFont(regularFont)
            .SetFontSize(8)
            .SetTextAlignment(TextAlignment.RIGHT)
            .SetMarginTop(16));

        document.Close();
        return memoryStream.ToArray();
    }

    private async Task<(int Total, int Waiting, int InProgress, int WaitingResult, int Completed, int DoingLab, int InsuranceCount)> GetRoomStatsAsync(Guid roomId, DateTime date)
    {
        var examinations = await _context.Examinations
            .Include(e => e.MedicalRecord)
            .Where(e => e.RoomId == roomId && e.MedicalRecord.AdmissionDate.Date == date.Date)
            .ToListAsync();

        return (
            Total: examinations.Count,
            Waiting: examinations.Count(e => e.Status == 0),
            InProgress: examinations.Count(e => e.Status == 1),
            WaitingResult: examinations.Count(e => e.Status == 2 || e.Status == 3),
            Completed: examinations.Count(e => e.Status == 4),
            DoingLab: examinations.Count(e => e.Status == 2),
            InsuranceCount: examinations.Count(e => e.MedicalRecord.PatientType == 1)
        );
    }

    private async Task<int> CalculateEstimatedWaitAsync(Guid roomId, int queueType)
    {
        var waitingCount = await _context.QueueTickets
            .CountAsync(t => t.RoomId == roomId && t.QueueType == queueType && t.IssueDate.Date == DateTime.Today && t.Status == 0);

        return waitingCount * 5; // 5 minutes per patient average
    }

    private async Task<string> GeneratePatientCodeAsync()
    {
        var today = DateTime.Today;
        var prefix = $"BN{today:yyyyMMdd}";

        // Get the max patient code with today's prefix
        var maxCode = await _context.Patients
            .Where(p => p.PatientCode.StartsWith(prefix))
            .OrderByDescending(p => p.PatientCode)
            .Select(p => p.PatientCode)
            .FirstOrDefaultAsync();

        int nextNumber = 1;
        if (!string.IsNullOrEmpty(maxCode) && maxCode.Length > prefix.Length)
        {
            if (int.TryParse(maxCode.Substring(prefix.Length), out int currentNumber))
            {
                nextNumber = currentNumber + 1;
            }
        }

        return $"{prefix}{nextNumber:D4}";
    }

    private async Task<string> GenerateMedicalRecordCodeAsync()
    {
        var today = DateTime.Today;
        var prefix = $"MR{today:yyyyMMdd}";

        var maxCode = await _context.MedicalRecords
            .Where(m => m.MedicalRecordCode.StartsWith(prefix))
            .OrderByDescending(m => m.MedicalRecordCode)
            .Select(m => m.MedicalRecordCode)
            .FirstOrDefaultAsync();

        int nextNumber = 1;
        if (!string.IsNullOrEmpty(maxCode) && maxCode.Length > prefix.Length)
        {
            if (int.TryParse(maxCode.Substring(prefix.Length), out int currentNumber))
            {
                nextNumber = currentNumber + 1;
            }
        }

        return $"{prefix}{nextNumber:D4}";
    }

    private async Task<string> GenerateDepositReceiptNumberAsync()
    {
        var today = DateTime.Today;
        var count = await _context.Deposits.CountAsync(d => d.ReceiptDate.Date == today);
        return $"TU{today:yyyyMMdd}{(count + 1):D4}";
    }

    private async Task<string> GeneratePaymentReceiptNumberAsync()
    {
        var today = DateTime.Today;
        var count = await _context.Payments.CountAsync(p => p.ReceiptDate.Date == today);
        return $"PT{today:yyyyMMdd}{(count + 1):D4}";
    }

    private QueueTicketDto MapToQueueTicketDto(QueueTicket ticket)
    {
        return new QueueTicketDto
        {
            Id = ticket.Id,
            TicketCode = ticket.TicketNumber,
            QueueNumber = ticket.QueueNumber,
            QueueDate = ticket.IssueDate,
            PatientId = ticket.PatientId,
            PatientCode = ticket.Patient?.PatientCode,
            PatientName = ticket.Patient?.FullName,
            RoomId = ticket.RoomId ?? Guid.Empty,
            RoomName = ticket.Room?.RoomName ?? "",
            QueueType = ticket.QueueType,
            Priority = ticket.Priority,
            Status = ticket.Status,
            CalledCount = 1,
            CalledAt = ticket.CalledTime,
            CompletedAt = ticket.CompletedTime,
            CalledBy = ticket.CalledByUser?.FullName
        };
    }

    private async Task<DocumentHoldDto> MapToDocumentHoldDtoAsync(DocumentHold hold)
    {
        var medicalRecord = await _context.MedicalRecords
            .Include(m => m.Patient)
            .FirstOrDefaultAsync(m => m.Id == hold.MedicalRecordId);

        return new DocumentHoldDto
        {
            Id = hold.Id,
            AdmissionId = hold.MedicalRecordId ?? Guid.Empty,
            PatientCode = medicalRecord?.Patient?.PatientCode ?? "",
            PatientName = medicalRecord?.Patient?.FullName ?? "",
            MedicalRecordCode = medicalRecord?.MedicalRecordCode ?? "",
            DocumentType = hold.DocumentType.ToString(),
            DocumentNumber = hold.DocumentNumber ?? "",
            Description = hold.Description ?? "",
            HoldDate = hold.HoldDate,
            ReturnDate = hold.ReturnDate,
            Status = hold.Status == 1 ? "Holding" : "Returned",
            Note = hold.Notes ?? ""
        };
    }

    private AdmissionDto MapToAdmissionDto(MedicalRecord record, Patient patient, Room? room, QueueTicketDto? ticket)
    {
        return new AdmissionDto
        {
            Id = record.Id,
            AdmissionCode = record.MedicalRecordCode,
            PatientId = patient.Id,
            PatientCode = patient.PatientCode,
            PatientName = patient.FullName,
            DateOfBirth = patient.DateOfBirth,
            YearOfBirth = patient.YearOfBirth,
            Gender = patient.Gender == 1 ? "Nam" : patient.Gender == 2 ? "Nữ" : "Khác",
            Address = patient.Address ?? "",
            PhoneNumber = patient.PhoneNumber ?? "",
            IdentityNumber = patient.IdentityNumber ?? "",
            InsuranceNumber = record.InsuranceNumber ?? "",
            AdmissionDate = record.AdmissionDate,
            DepartmentId = room?.DepartmentId ?? Guid.Empty,
            DepartmentName = room?.Department?.DepartmentName ?? "",
            RoomId = room?.Id,
            RoomName = room?.RoomName ?? "",
            Status = record.Status == 0 ? "Waiting" : record.Status == 1 ? "InProgress" : "Completed",
            QueueNumber = ticket?.QueueNumber ?? 0,
            QueueCode = ticket?.TicketCode ?? "",
            Priority = ticket?.Priority ?? 0,
            IsEmergency = record.TreatmentType == 3,
            IsPriority = (ticket?.Priority ?? 0) > 0,
            CreatedDate = record.CreatedAt
        };
    }

    private string GetDocumentTypeName(int documentType)
    {
        return documentType switch
        {
            1 => "CCCD/CMND",
            2 => "The BHYT",
            3 => "Giay gioi thieu",
            4 => "Giay chuyen vien",
            _ => "Giay to khac"
        };
    }

    #endregion
}
