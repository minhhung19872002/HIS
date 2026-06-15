using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Insurance;
using HIS.Application.DTOs.Reception;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Configuration;
using HIS.Infrastructure.Data;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using iText.IO.Font.Constants;
using iText.Kernel.Font;
using iText.Kernel.Pdf;
using iText.Layout;
using iText.Layout.Properties;
using iText.Barcodes;
using IxPageSize = iText.Kernel.Geom.PageSize;
using QueueDailyStatisticsDto = HIS.Application.DTOs.Reception.QueueDailyStatisticsDto;
using AverageWaitingTimeDto = HIS.Application.DTOs.Reception.AverageWaitingTimeDto;
using QueueReportRequestDto = HIS.Application.DTOs.Reception.QueueReportRequestDto;
using QueueConfigurationDto = HIS.Application.DTOs.Reception.QueueConfigurationDto;


namespace HIS.Infrastructure.Services;

// K9 phien 4 (2026-05-30): tach 1.5 Patient Photos + 1.6 & 1.15 Document Hold (~257 dong).
public partial class ReceptionCompleteService {
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

    /// <summary>F11.2: lưu dấu vân tay tiếp đón + cờ không thu thập được vào hồ sơ bệnh nhân.</summary>
    public async Task<bool> SaveFingerprintAsync(Guid patientId, string? fingerprintData, bool notCollected, Guid userId)
    {
        var patient = await _context.Patients.FindAsync(patientId);
        if (patient == null) return false;
        patient.FingerprintData = string.IsNullOrWhiteSpace(fingerprintData) ? null : fingerprintData;
        patient.FingerprintNotCollected = notCollected;
        patient.UpdatedAt = DateTime.UtcNow;
        patient.UpdatedBy = userId.ToString();
        await _unitOfWork.SaveChangesAsync();
        return true;
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
}
