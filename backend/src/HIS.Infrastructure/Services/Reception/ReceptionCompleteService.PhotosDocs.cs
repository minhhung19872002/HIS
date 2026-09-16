using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Insurance;
using HIS.Application.DTOs.Reception;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Configuration;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
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
        // QA-R4: a zero-GUID patient/record surfaced as an FK violation (HTTP 500), and the image itself
        // was never written anywhere — the row pointed at a file that did not exist, so every photo
        // "uploaded" from the reception modal was silently lost.
        if (string.IsNullOrWhiteSpace(dto.Base64Data))
            throw new ArgumentException("Chưa có dữ liệu ảnh (base64Data)", nameof(dto.Base64Data));
        if (!await _context.Patients.AnyAsync(p => p.Id == dto.PatientId && !p.IsDeleted))
            throw new KeyNotFoundException("Không tìm thấy bệnh nhân");
        if (dto.MedicalRecordId.HasValue
            && !await _context.MedicalRecords.AnyAsync(m => m.Id == dto.MedicalRecordId.Value && !m.IsDeleted))
            throw new KeyNotFoundException("Không tìm thấy hồ sơ khám");

        byte[] bytes;
        try
        {
            // Accept both raw base64 and a data URL ("data:image/png;base64,...").
            var raw = dto.Base64Data.Trim();
            var comma = raw.IndexOf(',');
            if (raw.StartsWith("data:", StringComparison.OrdinalIgnoreCase) && comma > 0) raw = raw[(comma + 1)..];
            bytes = Convert.FromBase64String(raw);
        }
        catch (FormatException)
        {
            throw new ArgumentException("Dữ liệu ảnh không phải base64 hợp lệ", nameof(dto.Base64Data));
        }
        // The payload is decoded into memory and written to container disk, so it needs a ceiling: an ID-card
        // photo is well under this, and without it one request can exhaust the disk. NOTE (known debt, not fixed
        // here): the folder is container-local and is lost on the next deploy — the image is stored, not durable.
        const int maxPhotoBytes = 8 * 1024 * 1024;
        if (bytes.LongLength > maxPhotoBytes)
            throw new ArgumentException($"Ảnh vượt quá {maxPhotoBytes / (1024 * 1024)} MB, vui lòng chụp lại ở kích thước nhỏ hơn.", nameof(dto.Base64Data));

        var fileName = string.IsNullOrWhiteSpace(dto.FileName) ? $"photo_{DateTime.Now:yyyyMMddHHmmss}.jpg" : dto.FileName.Trim();
        var extension = Path.GetExtension(fileName);
        if (string.IsNullOrEmpty(extension)) extension = ".jpg";
        var storedName = $"{Guid.NewGuid()}{extension}";
        var filePath = $"/photos/{dto.PatientId}/{storedName}";
        // Same folder UpdatePatientPhotoAsync (ExaminationCompleteService.WaitingList) writes to, so both photo
        // flows are served from one place.
        var photoDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "photos", dto.PatientId.ToString());
        Directory.CreateDirectory(photoDir);
        await File.WriteAllBytesAsync(Path.Combine(photoDir, storedName), bytes);

        var photo = new PatientPhoto
        {
            Id = Guid.NewGuid(),
            PatientId = dto.PatientId,
            MedicalRecordId = dto.MedicalRecordId,
            PhotoType = dto.PhotoType,
            FileName = fileName,
            FilePath = filePath,
            MimeType = extension.ToLowerInvariant() == ".png" ? "image/png" : "image/jpeg",
            FileSize = bytes.LongLength,
            Notes = dto.Notes,
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
            .ToBoundedListAsync("ReceptionCompleteService.GetPatientPhotosAsync");
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

    // DocumentHold.Status as the EXISTING rows use it: 1 = đang giữ, 2 = đã trả. QA round 4 briefly renumbered
    // this to 0/1, which would have read every document already held on production as "đã trả" — the receipt
    // desk would believe it had handed back ID and insurance cards it is still holding. Never renumber a status
    // column that has live rows; name the values instead.
    private const int HoldStatusHolding = 1;
    private const int HoldStatusReturned = 2;

    public async Task<DocumentHoldDto> CreateDocumentHoldAsync(CreateDocumentHoldDto dto, Guid userId)
    {
        // QA-R4: the v2 modal sends {patientId, medicalRecordId, documentType:int, documentNumber,
        // documentDescription, holdNotes}. The old DTO only knew AdmissionId + string DocumentType, so every
        // hold from the screen failed (400 on the body, or an FK 500 on the zero-GUID record, and
        // PatientId — a NOT NULL FK — was never set at all). DocumentHolds was empty in every environment.
        if (string.IsNullOrWhiteSpace(dto.DocumentNumber))
            throw new ArgumentException("Chưa nhập số / mã giấy tờ", nameof(dto.DocumentNumber));

        var medicalRecordId = dto.MedicalRecordId ?? dto.AdmissionId;
        if (medicalRecordId == Guid.Empty) medicalRecordId = null;

        Guid patientId;
        if (medicalRecordId.HasValue)
        {
            var record = await _context.MedicalRecords.AsNoTracking()
                .FirstOrDefaultAsync(m => m.Id == medicalRecordId.Value && !m.IsDeleted)
                ?? throw new KeyNotFoundException("Không tìm thấy hồ sơ khám");
            if (dto.PatientId.HasValue && dto.PatientId.Value != Guid.Empty && dto.PatientId.Value != record.PatientId)
                throw new ArgumentException("Hồ sơ khám không thuộc bệnh nhân này", nameof(dto.MedicalRecordId));
            patientId = record.PatientId;
        }
        else
        {
            patientId = dto.PatientId ?? Guid.Empty;
            if (patientId == Guid.Empty || !await _context.Patients.AnyAsync(p => p.Id == patientId && !p.IsDeleted))
                throw new KeyNotFoundException("Không tìm thấy bệnh nhân");
        }

        var holderName = await _context.Users.AsNoTracking()
            .Where(u => u.Id == userId).Select(u => u.FullName).FirstOrDefaultAsync();
        var description = dto.DocumentDescription ?? dto.Description;
        var holdNotes = dto.HoldNotes ?? dto.Note;

        var docHold = new DocumentHold
        {
            Id = Guid.NewGuid(),
            PatientId = patientId,
            MedicalRecordId = medicalRecordId,
            DocumentType = dto.DocumentType > 0 ? dto.DocumentType : 1,
            DocumentNumber = dto.DocumentNumber.Trim(),
            DocumentDescription = description,
            Description = description,
            Quantity = dto.Quantity > 0 ? dto.Quantity : 1,
            HoldDate = HIS.Core.Common.VnTime.NowVn, // business timestamp = VN local
            HoldBy = holderName ?? userId.ToString(),
            HeldByUserId = userId,
            HoldNotes = holdNotes,
            Notes = holdNotes,
            Status = HoldStatusHolding, // keep the numbering the existing rows already use
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId.ToString()
        };

        await _context.DocumentHolds.AddAsync(docHold);
        await _unitOfWork.SaveChangesAsync();

        return await MapToDocumentHoldDtoAsync(docHold);
    }

    public async Task<DocumentHoldDto> ReturnDocumentAsync(ReturnDocumentDto dto, Guid userId)
    {
        var docHold = await _context.DocumentHolds.FindAsync(dto.DocumentHoldId);
        if (docHold == null) throw new KeyNotFoundException("Document hold not found");
        if (docHold.Status == HoldStatusReturned)
            throw new InvalidOperationException("Giấy tờ này đã được trả trước đó rồi.");

        var returnerName = await _context.Users.AsNoTracking()
            .Where(u => u.Id == userId).Select(u => u.FullName).FirstOrDefaultAsync();

        docHold.ReturnDate = HIS.Core.Common.VnTime.NowVn;
        docHold.ReturnedByUserId = userId;
        docHold.ReturnBy = returnerName ?? userId.ToString();
        docHold.Status = HoldStatusReturned;
        docHold.ReturnNotes = dto.ReturnNotes ?? dto.Note;
        docHold.ReturnToPersonName = dto.ReturnToPersonName;
        docHold.ReturnToPersonPhone = dto.ReturnToPersonPhone;
        docHold.ReturnToPersonRelation = dto.ReturnToPersonRelation;
        docHold.UpdatedAt = DateTime.UtcNow;
        docHold.UpdatedBy = userId.ToString();

        await _unitOfWork.SaveChangesAsync();

        return await MapToDocumentHoldDtoAsync(docHold);
    }

    public async Task<PagedResultDto<DocumentHoldDto>> SearchDocumentHoldsAsync(DocumentHoldSearchDto dto)
    {
        var query = _context.DocumentHolds.Where(d => !d.IsDeleted);

        if (dto.PatientId.HasValue)
        {
            // PatientId is stored on the hold itself (a hold may exist without a visit).
            query = query.Where(d => d.PatientId == dto.PatientId.Value);
        }

        if (dto.DocumentType.HasValue)
            query = query.Where(d => d.DocumentType == dto.DocumentType.Value);

        if (dto.Status.HasValue)
            query = query.Where(d => d.Status == dto.Status.Value);

        var total = await query.CountAsync();
        var page = Math.Max(1, dto.Page);
        var pageSize = Math.Clamp(dto.PageSize, 1, 200);
        var items = await query
            .OrderByDescending(d => d.HoldDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
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
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<List<DocumentHoldDto>> GetPatientDocumentHoldsAsync(Guid patientId)
    {
        var holds = await _context.DocumentHolds
            .Where(d => d.PatientId == patientId && d.Status == HoldStatusHolding && !d.IsDeleted)
            .ToBoundedListAsync("ReceptionCompleteService.GetPatientDocumentHoldsAsync");

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
            .Include(d => d.Patient)
            .Include(d => d.MedicalRecord)
            .ThenInclude(m => m.Patient)
            .FirstOrDefaultAsync(d => d.Id == documentHoldId);

        if (hold == null) throw new KeyNotFoundException("Document hold not found");

        var patient = hold.Patient ?? hold.MedicalRecord?.Patient;
        return new DocumentHoldReceiptDto
        {
            ReceiptNumber = $"GGT{hold.HoldDate:yyyyMMdd}{hold.Id.ToString().Substring(0, 4).ToUpper()}",
            ReceiptDate = hold.HoldDate,
            PatientCode = patient?.PatientCode ?? "",
            PatientName = patient?.FullName ?? "",
            PatientPhone = patient?.PhoneNumber,
            Documents = new List<DocumentHoldItemDto>
            {
                new DocumentHoldItemDto
                {
                    DocumentTypeName = GetDocumentTypeName(hold.DocumentType),
                    DocumentNumber = hold.DocumentNumber ?? "",
                    Quantity = hold.Quantity > 0 ? hold.Quantity : 1,
                    Description = hold.DocumentDescription ?? hold.Description
                }
            },
            Notes = hold.HoldNotes ?? hold.Notes
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
