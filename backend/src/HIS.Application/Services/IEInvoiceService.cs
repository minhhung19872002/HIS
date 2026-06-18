using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace HIS.Application.Services
{
    /// <summary>
    /// Dịch vụ Hóa đơn điện tử (HĐĐT) đa NCC — VNPT / Viettel / MISA. Issue #24.
    /// MockMode=true (mặc định): sinh InvoiceNo giả, không gọi API NCC.
    /// MockMode=false + Enabled=true: gọi NCC thật (cần credential EInvoice:&lt;NCC&gt;:* qua env).
    /// </summary>
    public interface IEInvoiceService
    {
        Task<IReadOnlyList<EInvoiceDto>> GetListAsync(Guid? receiptId, int? status, int pageSize, CancellationToken ct = default);
        Task<EInvoiceDetailDto> GetDetailAsync(Guid id, CancellationToken ct = default);
        Task<EInvoiceDto> IssueAsync(IssueEInvoiceRequestDto dto, string issuedBy, CancellationToken ct = default);
        Task<EInvoiceDto> CancelAsync(Guid id, string cancelledBy, CancellationToken ct = default);
        Task<EInvoiceDto> SyncStatusAsync(Guid id, CancellationToken ct = default);
        EInvoiceConfigDto GetConfig();
        Task SaveConfigAsync(EInvoiceConfigDto dto, CancellationToken ct = default);
    }

    /// <summary>HĐĐT (danh sách + sau phát hành). Status: 0=draft,1=issued,2=signed,3=cancelled,4=failed.</summary>
    public class EInvoiceDto
    {
        public Guid Id { get; set; }
        public Guid? ReceiptId { get; set; }
        public string Provider { get; set; } = string.Empty;
        public string? InvoiceNo { get; set; }
        public string? InvoiceCode { get; set; }
        public string? TemplateCode { get; set; }
        public string? SerialNo { get; set; }
        public int Status { get; set; }
        public string StatusName { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public decimal? TaxAmount { get; set; }
        public DateTime? IssuedAt { get; set; }
        public string? ErrorMessage { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>Chi tiết HĐĐT — kèm raw PortalResponse từ NCC.</summary>
    public class EInvoiceDetailDto : EInvoiceDto
    {
        public string? PortalResponse { get; set; }
    }

    /// <summary>Yêu cầu phát hành HĐĐT từ phiếu thu (module #24 đa NCC — đặt tên Request để tránh trùng DTO Billing cũ).</summary>
    public class IssueEInvoiceRequestDto
    {
        public Guid ReceiptId { get; set; }

        /// <summary>NCC muốn dùng — bỏ trống thì lấy từ server config.</summary>
        public string? Provider { get; set; }
    }

    /// <summary>Cấu hình HĐĐT (chỉ đọc/runtime — persist qua Cloud Run env EInvoice__*).</summary>
    public class EInvoiceConfigDto
    {
        public string Provider { get; set; } = string.Empty;
        public bool MockMode { get; set; }
        public bool Enabled { get; set; }
    }
}
