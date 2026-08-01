namespace HIS.Core.Entities;

/// <summary>
/// #441 (carve từ #434): đợt xuất XML BHYT theo QĐ4210.
///
/// Trước đây `ExportToXmlAsync` ghi 14 file ra `exports/xml/{batchCode}` nhưng trả về
/// `BatchId = Guid.NewGuid()` **không lưu ở đâu** → không tra ngược được từ BatchId ra
/// thư mục file. Hệ quả: download phải đoán "thư mục mới nhất" (tải nhầm đợt) và submit
/// gửi payload giả. Bảng này là mắt xích còn thiếu: BatchId ↔ FilePath.
/// </summary>
public class InsuranceXmlBatch : BaseEntity
{
    /// <summary>Mã đợt, trùng tên thư mục dưới `exports/xml/` (vd `XML-202608-143012`).</summary>
    public string BatchCode { get; set; } = string.Empty;

    public int PeriodMonth { get; set; }
    public int PeriodYear { get; set; }

    /// <summary>Lọc theo khoa khi xuất (null = toàn viện).</summary>
    public Guid? DepartmentId { get; set; }

    /// <summary>Thư mục chứa 14 file XML của đợt.</summary>
    public string FilePath { get; set; } = string.Empty;
    public long FileSize { get; set; }

    public int TotalRecords { get; set; }
    public int SuccessRecords { get; set; }
    public int FailedRecords { get; set; }
    public string? FileChecksum { get; set; }

    /// <summary>0-Đã xuất · 1-Đã ký số · 2-Đã gửi BHXH · 3-Bị từ chối.</summary>
    public int Status { get; set; }

    public DateTime? SubmittedAt { get; set; }
    public string? SubmitTransactionId { get; set; }

    public DateTime ExportTime { get; set; }
}
