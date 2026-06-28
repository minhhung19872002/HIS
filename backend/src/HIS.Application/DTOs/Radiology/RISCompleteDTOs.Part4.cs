using System;
using System.Collections.Generic;

namespace HIS.Application.DTOs.Radiology
{

    /// <summary>
    /// Cấu hình HL7 CDA
    /// </summary>
    public class HL7CDAConfigDto
    {
        public Guid Id { get; set; }
        public string ConfigName { get; set; }
        public string HL7Version { get; set; }
        public string CDAVersion { get; set; }
        public string SendingApplication { get; set; }
        public string SendingFacility { get; set; }
        public string ReceivingApplication { get; set; }
        public string ReceivingFacility { get; set; }
        public string ConnectionType { get; set; } // MLLP, HTTP, File
        public string ServerAddress { get; set; }
        public int? ServerPort { get; set; }
        public string FilePath { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Lưu cấu hình HL7 CDA
    /// </summary>
    public class SaveHL7CDAConfigDto
    {
        public Guid? Id { get; set; }
        public string ConfigName { get; set; }
        public string HL7Version { get; set; }
        public string CDAVersion { get; set; }
        public string SendingApplication { get; set; }
        public string SendingFacility { get; set; }
        public string ReceivingApplication { get; set; }
        public string ReceivingFacility { get; set; }
        public string ConnectionType { get; set; }
        public string ServerAddress { get; set; }
        public int? ServerPort { get; set; }
        public string FilePath { get; set; }
        public bool IsActive { get; set; }
        public string ConfigJson { get; set; }
    }

    /// <summary>
    /// Message HL7
    /// </summary>
    public class HL7MessageDto
    {
        public Guid Id { get; set; }
        public string MessageControlId { get; set; }
        public string MessageType { get; set; }
        public string TriggerEvent { get; set; }
        public string Direction { get; set; }
        public Guid? RadiologyRequestId { get; set; }
        public string PatientId { get; set; }
        public string AccessionNumber { get; set; }
        public string RawMessage { get; set; }
        public string ParsedData { get; set; }
        public DateTime MessageDateTime { get; set; }
        public int Status { get; set; }
        public string StatusName { get; set; }
        public string AckCode { get; set; }
        public string ErrorMessage { get; set; }
        public int RetryCount { get; set; }
    }

    /// <summary>
    /// Gửi HL7 message
    /// </summary>
    public class SendHL7MessageDto
    {
        public string MessageType { get; set; }
        public string TriggerEvent { get; set; }
        public Guid? RadiologyRequestId { get; set; }
        public string PatientId { get; set; }
        public string AccessionNumber { get; set; }
        public Dictionary<string, object> Segments { get; set; }
    }

    /// <summary>
    /// Kết quả gửi HL7
    /// </summary>
    public class SendHL7ResultDto
    {
        public bool Success { get; set; }
        public string MessageControlId { get; set; }
        public string AckCode { get; set; }
        public string ErrorMessage { get; set; }
        public DateTime SentAt { get; set; }
    }

    /// <summary>
    /// Tài liệu CDA
    /// </summary>
    public class CDADocumentDto
    {
        public Guid Id { get; set; }
        public string DocumentId { get; set; }
        public string DocumentType { get; set; }
        public Guid RadiologyReportId { get; set; }
        public string OrderCode { get; set; }
        public string PatientName { get; set; }
        public string CDAContent { get; set; }
        public string PdfPath { get; set; }
        public bool IsSigned { get; set; }
        public string SignatureType { get; set; }
        public DateTime? SignedAt { get; set; }
        public int Status { get; set; }
        public string StatusName { get; set; }
        public DateTime? SentAt { get; set; }
        public string AckStatus { get; set; }
    }

    /// <summary>
    /// Tạo tài liệu CDA
    /// </summary>
    public class CreateCDADocumentDto
    {
        public Guid RadiologyReportId { get; set; }
        public string DocumentType { get; set; }
        public string SignatureType { get; set; }
    }

    /// <summary>
    /// Gửi CDA document
    /// </summary>
    public class SendCDADocumentDto
    {
        public Guid DocumentId { get; set; }
        public Guid? ConfigId { get; set; }
    }

    /// <summary>
    /// Tìm kiếm HL7 messages
    /// </summary>
    public class SearchHL7MessageDto
    {
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public string? MessageType { get; set; }
        public string? Direction { get; set; }
        public int? Status { get; set; }
        public string? PatientId { get; set; }
        public string? AccessionNumber { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 50;
    }

    /// <summary>
    /// Kết quả tìm kiếm HL7 messages
    /// </summary>
    public class HL7MessageSearchResultDto
    {
        public List<HL7MessageDto> Items { get; set; }
        public int TotalCount { get; set; }
        public int TotalPages { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }



    /// <summary>
    /// Danh mục hướng dẫn
    /// </summary>
    public class HelpCategoryDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string IconClass { get; set; }
        public Guid? ParentId { get; set; }
        public string ParentName { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
        public int ArticleCount { get; set; }
        public List<HelpCategoryDto> Children { get; set; }
    }

    /// <summary>
    /// Tạo/Cập nhật danh mục
    /// </summary>
    public class SaveHelpCategoryDto
    {
        public Guid? Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string IconClass { get; set; }
        public Guid? ParentId { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Bài viết hướng dẫn
    /// </summary>
    public class HelpArticleDto
    {
        public Guid Id { get; set; }
        public Guid CategoryId { get; set; }
        public string CategoryName { get; set; }
        public string Title { get; set; }
        public string Summary { get; set; }
        public string Content { get; set; }
        public string VideoUrl { get; set; }
        public string ArticleType { get; set; } // Guide, FAQ, Troubleshooting, Video
        public int SortOrder { get; set; }
        public int ViewCount { get; set; }
        public bool IsPublished { get; set; }
        public string CreatedByUserName { get; set; }
        public DateTime? PublishedAt { get; set; }
        public string Tags { get; set; }
    }

    /// <summary>
    /// Tạo/Cập nhật bài viết
    /// </summary>
    public class SaveHelpArticleDto
    {
        public Guid? Id { get; set; }
        public Guid CategoryId { get; set; }
        public string Title { get; set; }
        public string Summary { get; set; }
        public string Content { get; set; }
        public string VideoUrl { get; set; }
        public string ArticleType { get; set; }
        public int SortOrder { get; set; }
        public bool IsPublished { get; set; }
        public string Tags { get; set; }
    }

    /// <summary>
    /// Lỗi thường gặp
    /// </summary>
    public class TroubleshootingDto
    {
        public Guid Id { get; set; }
        public string ErrorCode { get; set; }
        public string ErrorTitle { get; set; }
        public string ErrorDescription { get; set; }
        public string Symptoms { get; set; }
        public string Causes { get; set; }
        public string Solution { get; set; }
        public string RelatedModule { get; set; }
        public int Severity { get; set; }
        public string SeverityName { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Tạo/Cập nhật troubleshooting
    /// </summary>
    public class SaveTroubleshootingDto
    {
        public Guid? Id { get; set; }
        public string ErrorCode { get; set; }
        public string ErrorTitle { get; set; }
        public string ErrorDescription { get; set; }
        public string Symptoms { get; set; }
        public string Causes { get; set; }
        public string Solution { get; set; }
        public string RelatedModule { get; set; }
        public int Severity { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Tìm kiếm hướng dẫn
    /// </summary>
    public class SearchHelpDto
    {
        public string? Keyword { get; set; }
        public Guid? CategoryId { get; set; }
        public string? ArticleType { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }

    /// <summary>
    /// Kết quả tìm kiếm hướng dẫn
    /// </summary>
    public class HelpSearchResultDto
    {
        public List<HelpArticleDto> Items { get; set; }
        public int TotalCount { get; set; }
        public int TotalPages { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }



    /// <summary>
    /// Cấu hình màn hình CLS
    /// </summary>
    public class CLSScreenConfigDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string DefaultFilters { get; set; }
        public string ColumnSettings { get; set; }
        public int PageSize { get; set; }
        public bool AutoLoadTemplate { get; set; }
        public bool ShowPatientHistory { get; set; }
        public bool EnableShortcuts { get; set; }
        public string CustomSettings { get; set; }
    }

    /// <summary>
    /// Lưu cấu hình CLS
    /// </summary>
    public class SaveCLSScreenConfigDto
    {
        public string DefaultFilters { get; set; }
        public string ColumnSettings { get; set; }
        public int PageSize { get; set; }
        public bool AutoLoadTemplate { get; set; }
        public bool ShowPatientHistory { get; set; }
        public bool EnableShortcuts { get; set; }
        public string CustomSettings { get; set; }
    }

    /// <summary>
    /// Mẫu mô tả dịch vụ
    /// </summary>
    public class ServiceDescriptionTemplateDto
    {
        public Guid Id { get; set; }
        public Guid ServiceId { get; set; }
        public string ServiceName { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string Conclusion { get; set; }
        public string Notes { get; set; }
        public bool IsDefault { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
        public string CreatedByUserName { get; set; }
    }

    /// <summary>
    /// Lưu mẫu mô tả
    /// </summary>
    public class SaveServiceDescriptionTemplateDto
    {
        public Guid? Id { get; set; }
        public Guid ServiceId { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string Conclusion { get; set; }
        public string Notes { get; set; }
        public bool IsDefault { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Lịch sử chẩn đoán ca chụp
    /// </summary>
    public class DiagnosisHistoryDto
    {
        public Guid Id { get; set; }
        public Guid RadiologyRequestId { get; set; }
        public string OrderCode { get; set; }
        public DateTime DiagnosisDate { get; set; }
        public string DoctorName { get; set; }
        public string Description { get; set; }
        public string Conclusion { get; set; }
        public string Notes { get; set; }
        public int Version { get; set; }
    }




    /// <summary>
    /// Request h?y phi�n h?i ch?n
    /// </summary>
    public class CancelConsultationRequest
    {
        public string Reason { get; set; }
    }

    /// <summary>
    /// Request nh?n ch? d?nh HL7
    /// </summary>
    public class ReceiveHL7OrderRequest
    {
        public string HL7Message { get; set; }
    }

    /// <summary>
    /// Request h?y k?t qu? HL7
    /// </summary>
    public class CancelHL7ResultRequest
    {
        public string Reason { get; set; }
    }



    /// <summary>
    /// Ca chup da ghim yeu thich (dung cho list endpoint)
    /// </summary>
    public class RadiologyFavoriteDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public Guid RequestId { get; set; }
        public string RequestCode { get; set; }
        public string PatientName { get; set; }
        public string PatientCode { get; set; }
        public string ServiceName { get; set; }
        public DateTime RequestDate { get; set; }
        public int Status { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>
    /// Request ghim / bo ghim ca chup
    /// </summary>
    public class ToggleFavoriteDto
    {
        public Guid RequestId { get; set; }
    }

    /// <summary>
    /// Ket qua sau khi toggle favorite
    /// </summary>
    public class FavoriteToggleResultDto
    {
        public bool IsFavorited { get; set; }
        public Guid RequestId { get; set; }
    }



    /// <summary>
    /// Them BS dong doc vao mot RadiologyReport
    /// </summary>
    public class AddCoReaderDto
    {
        public Guid RadiologyReportId { get; set; }
        public Guid ReaderId { get; set; }
        /// <summary>Snapshot ten — optional, tu dong lay tu User neu null.</summary>
        public string? ReaderName { get; set; }
        /// <summary>CoReader | Consultant | Supervisor</summary>
        public string? Role { get; set; }
        /// <summary>Y kien ban dau (co the null, cap nhat sau).</summary>
        public string? Opinion { get; set; }
    }

    /// <summary>
    /// Cap nhat y kien cua 1 dong doc
    /// </summary>
    public class UpdateCoReaderOpinionDto
    {
        public Guid CoReaderId { get; set; }
        public string? Opinion { get; set; }
        public string? Role { get; set; }
    }

    /// <summary>
    /// Xem thong tin 1 dong doc
    /// </summary>
    public class CoReaderDto
    {
        public Guid Id { get; set; }
        public Guid RadiologyReportId { get; set; }
        public Guid ReaderId { get; set; }
        public string? ReaderName { get; set; }
        public string? Role { get; set; }
        public string? Opinion { get; set; }
        public Guid? CopiedFromReportId { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>
    /// Copy ket qua (Findings / Impression / Recommendations) tu report nguon sang report dich
    /// </summary>
    public class CopyReportResultDto
    {
        public Guid SourceReportId { get; set; }
        public Guid TargetReportId { get; set; }
        /// <summary>
        /// Them ban ghi co-reader tu BS doc nguon vao report dich hay khong.
        /// Mac dinh true.
        /// </summary>
        public bool TrackAsCoReader { get; set; } = true;
    }

    /// <summary>
    /// Gop y kien cua tat ca dong doc vao truong Impression cua report (merge workflow)
    /// </summary>
    public class MergeCoReaderOpinionsDto
    {
        public Guid RadiologyReportId { get; set; }
        /// <summary>
        /// Neu true, append y kien co-reader vao cuoi Impression hien tai.
        /// Neu false, ghi de Impression bang y kien da gop.
        /// </summary>
        public bool AppendMode { get; set; } = true;
    }

    /// <summary>
    /// Ket qua sau khi merge
    /// </summary>
    public class MergeResultDto
    {
        public string MergedImpression { get; set; } = string.Empty;
        public int CoReaderCount { get; set; }
    }

}
