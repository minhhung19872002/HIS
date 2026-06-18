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
    /// MockMode=true (mặc định) hoặc Enabled=false: sinh InvoiceNo giả, KHÔNG gọi API NCC.
    /// MockMode=false + Enabled=true: adapter NCC thật (chưa triển khai — đánh dấu Status=4 với lỗi rõ ràng,
    /// giữ bản ghi để truy vết; cần credential EInvoice:&lt;NCC&gt;:* qua env).
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

        private bool MockMode => _config.GetValue<bool>("EInvoice:MockMode", true);
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

            var receipt = await _db.Receipts.FirstOrDefaultAsync(r => r.Id == dto.ReceiptId && !r.IsDeleted, ct)
                ?? throw new InvalidOperationException($"Không tìm thấy phiếu thu {dto.ReceiptId}");

            var provider = string.IsNullOrWhiteSpace(dto.Provider) ? DefaultProvider : dto.Provider!;
            var now = DateTime.UtcNow;

            var e = new EInvoice
            {
                Id = Guid.NewGuid(),
                ReceiptId = receipt.Id,
                Provider = provider,
                TotalAmount = receipt.FinalAmount,
                CreatedAt = now,
                CreatedBy = issuedBy,
            };

            if (MockMode || !Enabled)
            {
                // MockMode: sinh số giả, không gọi NCC.
                e.InvoiceNo = $"MOCK-{now:yyyyMMdd-HHmmss}-{e.Id.ToString("N").Substring(0, 6)}";
                e.InvoiceCode = $"MOCKCQT{now:yyyyMMddHHmmss}";
                e.TemplateCode = "1/001";
                e.SerialNo = "C24M" + provider.Substring(0, Math.Min(3, provider.Length)).ToUpperInvariant();
                e.Status = 1; // issued
                e.IssuedAt = now;
                e.PortalResponse = $"{{\"mock\":true,\"provider\":\"{provider}\",\"issuedAt\":\"{now:O}\"}}";
                _logger.LogInformation("[MockMode] EInvoice phát hành cho phiếu thu {ReceiptId}: {InvoiceNo}", receipt.Id, e.InvoiceNo);
            }
            else
            {
                // Real mode: adapter NCC chưa triển khai — ghi nhận Status=4 + lỗi rõ ràng, giữ bản ghi để truy vết.
                e.Status = 4; // failed
                e.ErrorMessage = $"Adapter NCC '{provider}' chưa triển khai (cần credential EInvoice:{provider}:* + tích hợp API NCC).";
                _logger.LogWarning("EInvoice real-mode chưa triển khai cho NCC {Provider}", provider);
            }

            _db.EInvoices.Add(e);
            await _db.SaveChangesAsync(ct);
            return ToDto(e);
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
            // Runtime config KHÔNG persist qua restart — set Cloud Run env EInvoice__* để cố định.
            _logger.LogInformation(
                "EInvoice config save: Provider={Provider} MockMode={MockMode} Enabled={Enabled} (không persist — set qua env)",
                dto.Provider, dto.MockMode, dto.Enabled);
            return Task.CompletedTask;
        }
    }
}
