using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using HIS.Core.Entities;

namespace HIS.Application.Services
{
    /// <summary>
    /// Issue #202: tách thao tác DB (DocumentSignatures + truy vấn tài liệu chờ ký) khỏi
    /// DigitalSignatureController (bỏ HISDbContext). Chỉ persistence/query — orchestration
    /// PKCS#11/PDF/SignalR + map sang DTO (parse cert subject) vẫn ở controller.
    /// Trả về entity Core để controller giữ nguyên projection sang DTO (API layer).
    /// </summary>
    public interface IDocumentSignatureStore
    {
        /// <summary>
        /// Tự động thu hồi chữ ký đang hiệu lực (Status=0) của tài liệu để ký lại (save riêng).
        /// Trả về Id chữ ký vừa thu hồi (để controller log), hoặc null nếu không có.
        /// </summary>
        Task<Guid?> RevokeActiveSignatureAsync(Guid documentId, string documentType, Guid revokedByUserId);

        /// <summary>Tài liệu đã có chữ ký đang hiệu lực (Status=0) chưa?</summary>
        Task<bool> IsDocumentSignedAsync(Guid documentId, string documentType);

        /// <summary>Lưu bản ghi DocumentSignature mới (save riêng).</summary>
        Task AddSignatureAsync(DocumentSignature signature);

        /// <summary>
        /// SubmitSigned: thu hồi chữ ký cũ (nếu có) + thêm chữ ký mới trong CÙNG 1 SaveChanges
        /// (giữ đúng ngữ nghĩa transaction đơn của controller cũ).
        /// </summary>
        Task RevokeThenAddInOneSaveAsync(Guid documentId, string documentType, Guid revokedByUserId, DocumentSignature newSignature);

        /// <summary>Chữ ký đang hiệu lực (Status=0) của 1 tài liệu, kèm SignedByUser, mới nhất trước.</summary>
        Task<List<DocumentSignature>> GetActiveSignaturesForDocumentAsync(Guid documentId);

        /// <summary>#84: toàn bộ lịch sử ký (kể cả đã thu hồi) của 1 HSBA (gộp exam/rx/sr + record).</summary>
        Task<List<DocumentSignature>> GetRecordSignaturesAsync(Guid medicalRecordId, string? documentType);

        /// <summary>Batch: chữ ký hiệu lực mới nhất cho mỗi documentId (đã giới hạn 100).</summary>
        Task<List<DocumentSignature>> GetLatestActiveSignaturesBatchAsync(List<Guid> documentIds);

        /// <summary>Tài liệu chờ ký của bác sĩ hiện tại (Examination + Prescription).</summary>
        Task<object> GetPendingDocumentsAsync(Guid userId);

        /// <summary>Lấy 1 chữ ký theo Id (để kiểm tra quyền/tải file). null = không có.</summary>
        Task<DocumentSignature?> GetSignatureByIdAsync(Guid signatureId);

        /// <summary>Thu hồi 1 chữ ký theo Id (đã kiểm tra quyền ở controller). false = không tìm thấy.</summary>
        Task<bool> RevokeSignatureAsync(Guid signatureId, string? reason, Guid revokedByUserId);
    }
}
