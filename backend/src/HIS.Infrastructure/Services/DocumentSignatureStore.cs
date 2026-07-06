using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

// Issue #202 (2026-07-06): persistence/query cho DocumentSignatures — bỏ HISDbContext khỏi
// DigitalSignatureController (3 partial). Logic verbatim; orchestration ký số giữ ở controller.
public class DocumentSignatureStore : IDocumentSignatureStore
{
    private readonly HISDbContext _context;
    public DocumentSignatureStore(HISDbContext context) => _context = context;

    public async Task<Guid?> RevokeActiveSignatureAsync(Guid documentId, string documentType, Guid revokedByUserId)
    {
        var existingSignature = await _context.DocumentSignatures
            .FirstOrDefaultAsync(ds => ds.DocumentId == documentId
                                       && ds.DocumentType == documentType
                                       && ds.Status == 0);
        if (existingSignature == null) return null;

        existingSignature.Status = 1; // Revoked
        existingSignature.RevokeReason = "Tự động thu hồi để ký lại";
        existingSignature.RevokedAt = DateTime.UtcNow;
        existingSignature.RevokedByUserId = revokedByUserId;
        await _context.SaveChangesAsync();
        return existingSignature.Id;
    }

    public Task<bool> IsDocumentSignedAsync(Guid documentId, string documentType)
        => _context.DocumentSignatures
            .AnyAsync(ds => ds.DocumentId == documentId && ds.DocumentType == documentType && ds.Status == 0);

    public async Task AddSignatureAsync(DocumentSignature signature)
    {
        _context.DocumentSignatures.Add(signature);
        await _context.SaveChangesAsync();
    }

    public async Task RevokeThenAddInOneSaveAsync(Guid documentId, string documentType, Guid revokedByUserId, DocumentSignature newSignature)
    {
        // Tự thu hồi chữ ký cũ đang hiệu lực để ký lại (KHÔNG save riêng — gộp cùng add bên dưới).
        var existing = await _context.DocumentSignatures.FirstOrDefaultAsync(ds =>
            ds.DocumentId == documentId && ds.DocumentType == documentType && ds.Status == 0);
        if (existing != null)
        {
            existing.Status = 1;
            existing.RevokeReason = "Tự động thu hồi để ký lại";
            existing.RevokedAt = DateTime.UtcNow;
            existing.RevokedByUserId = revokedByUserId;
        }

        _context.DocumentSignatures.Add(newSignature);
        await _context.SaveChangesAsync();
    }

    public Task<List<DocumentSignature>> GetActiveSignaturesForDocumentAsync(Guid documentId)
        => _context.DocumentSignatures
            .Where(ds => ds.DocumentId == documentId && ds.Status == 0)
            .Include(ds => ds.SignedByUser)
            .OrderByDescending(ds => ds.SignedAt)
            .ToListAsync();

    public async Task<List<DocumentSignature>> GetRecordSignaturesAsync(Guid medicalRecordId, string? documentType)
    {
        // Lấy danh sách examId thuộc record
        var examIds = await _context.Examinations
            .Where(e => e.MedicalRecordId == medicalRecordId && !e.IsDeleted)
            .Select(e => e.Id)
            .ToListAsync();

        // Lấy prescriptionId thuộc HSBA (dùng MedicalRecordId để tránh null-nullable Guid? mismatch)
        var rxIds = await _context.Prescriptions
            .Where(rx => rx.MedicalRecordId == medicalRecordId && !rx.IsDeleted)
            .Select(rx => rx.Id).ToListAsync();

        // Lấy serviceRequestId thuộc HSBA
        var srIds = await _context.ServiceRequests
            .Where(sr => sr.MedicalRecordId == medicalRecordId && !sr.IsDeleted)
            .Select(sr => sr.Id).ToListAsync();

        var allDocIds = examIds
            .Concat(rxIds)
            .Concat(srIds)
            .Concat(new[] { medicalRecordId }) // chính record
            .ToHashSet();

        var query = _context.DocumentSignatures
            .Include(ds => ds.SignedByUser)
            .Where(ds => allDocIds.Contains(ds.DocumentId));

        if (!string.IsNullOrEmpty(documentType))
            query = query.Where(ds => ds.DocumentType == documentType);

        return await query
            .OrderByDescending(ds => ds.SignedAt)
            .ToListAsync();
    }

    public Task<List<DocumentSignature>> GetLatestActiveSignaturesBatchAsync(List<Guid> documentIds)
    {
        // Limit batch size
        var ids = documentIds.Take(100).ToList();

        return _context.DocumentSignatures
            .Where(ds => ids.Contains(ds.DocumentId) && ds.Status == 0)
            .Include(ds => ds.SignedByUser)
            .GroupBy(ds => ds.DocumentId)
            .Select(g => g.OrderByDescending(ds => ds.SignedAt).First())
            .ToListAsync();
    }

    public async Task<object> GetPendingDocumentsAsync(Guid userId)
    {
        // Find examinations completed but not signed by current doctor
        var pendingExams = await _context.Examinations
            .Where(e => e.DoctorId == userId && e.Status >= 2 && e.Status < 4 && !e.IsDeleted)
            .Join(_context.MedicalRecords, e => e.MedicalRecordId, m => m.Id, (e, m) => new { e, m })
            .Join(_context.Patients, em => em.m.PatientId, p => p.Id, (em, p) => new
            {
                DocumentId = em.e.Id,
                DocumentType = "Examination",
                DocumentName = $"Phiếu khám - {p.FullName}",
                PatientName = p.FullName,
                PatientCode = p.PatientCode,
                CreatedAt = em.e.CreatedAt,
                Status = "Chờ ký"
            })
            .OrderByDescending(x => x.CreatedAt)
            .Take(50)
            .ToListAsync();

        // Find prescriptions not signed
        var pendingRx = await _context.Prescriptions
            .Where(p => p.DoctorId == userId && p.Status >= 1 && p.Status < 3 && !p.IsDeleted)
            .Join(_context.Examinations, rx => rx.ExaminationId, e => e.Id, (rx, e) => new { rx, e })
            .Join(_context.MedicalRecords, re => re.e.MedicalRecordId, m => m.Id, (re, m) => new { re.rx, m })
            .Join(_context.Patients, rm => rm.m.PatientId, p => p.Id, (rm, p) => new
            {
                DocumentId = rm.rx.Id,
                DocumentType = "Prescription",
                DocumentName = $"Đơn thuốc - {p.FullName}",
                PatientName = p.FullName,
                PatientCode = p.PatientCode,
                CreatedAt = rm.rx.CreatedAt,
                Status = "Chờ ký"
            })
            .OrderByDescending(x => x.CreatedAt)
            .Take(50)
            .ToListAsync();

        return pendingExams.Cast<object>().Concat(pendingRx.Cast<object>())
            .OrderByDescending(x => ((dynamic)x).CreatedAt)
            .Take(50)
            .ToList();
    }

    public async Task<DocumentSignature?> GetSignatureByIdAsync(Guid signatureId)
        => await _context.DocumentSignatures.FindAsync(signatureId);

    public async Task<bool> RevokeSignatureAsync(Guid signatureId, string? reason, Guid revokedByUserId)
    {
        var signature = await _context.DocumentSignatures.FindAsync(signatureId);
        if (signature == null) return false;

        signature.Status = 1; // Revoked
        signature.RevokeReason = reason;
        signature.RevokedAt = DateTime.UtcNow;
        signature.RevokedByUserId = revokedByUserId;
        await _context.SaveChangesAsync();
        return true;
    }
}
