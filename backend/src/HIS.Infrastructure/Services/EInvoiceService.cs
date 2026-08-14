using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services
{
    /// <summary>
    /// HĐĐT đa NCC (VNPT/Viettel/MISA). Issue #24.
    /// Đây là luồng phiếu thu cũ. Không được phát hành mô phỏng: khi chưa có
    /// adapter NCC thật, API phải từ chối thay vì sinh số hóa đơn/mã CQT giả.
    /// </summary>
    public class EInvoiceService : IEInvoiceService
    {
        private readonly HISDbContext _db;
        private readonly IConfiguration _config;
        private readonly ILogger<EInvoiceService> _logger;

        public EInvoiceService(HISDbContext db, IConfiguration config, ILogger<EInvoiceService> logger)
        {
            _db = db;
            _config = config;
            _logger = logger;
        }

        private bool MockMode => _config.GetValue<bool>("EInvoice:MockMode", false);
        private bool Enabled => _config.GetValue<bool>("EInvoice:Enabled", false);
        private string DefaultProvider => _config["EInvoice:Provider"] ?? "VNPT";

        private static string StatusName(int s) => s switch
        {
            0 => "Nháp",
            1 => "Đã phát hành",
            2 => "Đã ký",
            3 => "Đã hủy",
            4 => "Lỗi",
            _ => "Không rõ"
        };

        private static void Fill(EInvoiceDto dto, EInvoice e)
        {
            dto.Id = e.Id;
            dto.ReceiptId = e.ReceiptId;
            dto.Provider = e.Provider;
            dto.InvoiceNo = e.InvoiceNo;
            dto.InvoiceCode = e.InvoiceCode;
            dto.TemplateCode = e.TemplateCode;
            dto.SerialNo = e.SerialNo;
            dto.Status = e.Status;
            dto.StatusName = StatusName(e.Status);
            dto.TotalAmount = e.TotalAmount;
            dto.TaxAmount = e.TaxAmount;
            dto.IssuedAt = e.IssuedAt;
            dto.ErrorMessage = e.ErrorMessage;
            dto.CreatedAt = e.CreatedAt;
        }

        private static EInvoiceDto ToDto(EInvoice e)
        {
            var dto = new EInvoiceDto();
            Fill(dto, e);
            return dto;
        }

        private static EInvoiceDetailDto ToDetail(EInvoice e)
        {
            var dto = new EInvoiceDetailDto { PortalResponse = e.PortalResponse };
            Fill(dto, e);
            return dto;
        }

        public async Task<IReadOnlyList<EInvoiceDto>> GetListAsync(Guid? receiptId, int? status, int pageSize, CancellationToken ct = default)
        {
            var q = _db.EInvoices.Where(e => !e.IsDeleted);
            if (receiptId.HasValue) q = q.Where(e => e.ReceiptId == receiptId.Value);
            if (status.HasValue) q = q.Where(e => e.Status == status.Value);

            var rows = await q.OrderByDescending(e => e.CreatedAt)
                .Take(pageSize)
                .ToListAsync(ct);
            return rows.Select(ToDto).ToList();
        }

        public async Task<EInvoiceDetailDto> GetDetailAsync(Guid id, CancellationToken ct = default)
        {
            var e = await _db.EInvoices.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct)
                ?? throw new KeyNotFoundException($"Không tìm thấy HĐĐT {id}");
            return ToDetail(e);
        }

        public async Task<EInvoiceDto> IssueAsync(IssueEInvoiceRequestDto dto, string issuedBy, CancellationToken ct = default)
        {
            if (dto.ReceiptId == Guid.Empty)
                throw new InvalidOperationException("Thiếu receiptId");

            _ = await _db.Receipts.FirstOrDefaultAsync(r => r.Id == dto.ReceiptId && !r.IsDeleted, ct)
                ?? throw new InvalidOperationException($"Không tìm thấy phiếu thu {dto.ReceiptId}");

            var provider = string.IsNullOrWhiteSpace(dto.Provider) ? DefaultProvider : dto.Provider!;

            if (MockMode || !Enabled)
            {
                _logger.LogWarning(
                    "Từ chối phát hành HĐĐT phiếu thu {ReceiptId}: Enabled={Enabled}, MockMode={MockMode}",
                    dto.ReceiptId, Enabled, MockMode);
                throw new InvalidOperationException(
                    "Chưa cấu hình nhà cung cấp hóa đơn điện tử thật. Không thể phát hành hóa đơn mô phỏng.");
            }

            _logger.LogWarning("Luồng HĐĐT phiếu thu cũ chưa có adapter NCC {Provider}", provider);
            throw new NotSupportedException(
                $"Luồng HĐĐT phiếu thu chưa hỗ trợ NCC '{provider}'. Hãy phát hành từ tab HĐĐT bảng kê.");
        }

        public async Task<EInvoiceDto> CancelAsync(Guid id, string cancelledBy, CancellationToken ct = default)
        {
            var e = await _db.EInvoices.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct)
                ?? throw new KeyNotFoundException($"Không tìm thấy HĐĐT {id}");
            if (e.Status == 3)
                throw new InvalidOperationException("HĐĐT đã hủy trước đó");

            // MockMode: chỉ đổi trạng thái. Real-mode: cần gọi NCC hủy (chưa triển khai).
            e.Status = 3; // cancelled
            e.UpdatedAt = DateTime.UtcNow;
            e.UpdatedBy = cancelledBy;
            await _db.SaveChangesAsync(ct);
            _logger.LogInformation("EInvoice {Id} đã hủy bởi {User}", id, cancelledBy);
            return ToDto(e);
        }

        public async Task<EInvoiceDto> SyncStatusAsync(Guid id, CancellationToken ct = default)
        {
            var e = await _db.EInvoices.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct)
                ?? throw new KeyNotFoundException($"Không tìm thấy HĐĐT {id}");
            // MockMode: trả current status không đổi. Real-mode: query NCC (chưa triển khai).
            return ToDto(e);
        }

        public EInvoiceConfigDto GetConfig() => new()
        {
            Provider = DefaultProvider,
            MockMode = MockMode,
            Enabled = Enabled
        };

        public Task SaveConfigAsync(EInvoiceConfigDto dto, CancellationToken ct = default)
        {
            _logger.LogWarning(
                "Từ chối lưu cấu hình HĐĐT runtime: Provider={Provider}, MockMode={MockMode}, Enabled={Enabled}",
                dto.Provider, dto.MockMode, dto.Enabled);
            throw new NotSupportedException(
                "Cấu hình hóa đơn điện tử là cấu hình triển khai chỉ đọc. Hãy cập nhật biến môi trường EInvoice__* và triển khai lại dịch vụ.");
        }
    }
}
