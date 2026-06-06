using System.Text;
using System.Text.Json;
using HIS.Application.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services.External;

// ============================================================================
// VnptEInvoiceProvider — phát hành HĐĐT thật qua REST API của nhà cung cấp.
//
// Cấu hình-driven (section "EInvoice:Vnpt:*" trong appsettings/env) — KHÔNG
// hardcode endpoint/tài khoản/mật khẩu thật. Nếu chưa bật ("EInvoice:Enabled"
// = false) hoặc thiếu thông tin bắt buộc → IsConfigured=false, IssueAsync trả
// EInvoiceResult.Disabled() để caller fallback an toàn (không vỡ luồng).
//
// Tái dùng GatewayHttpHelper.PostWithRetryAsync (retry/backoff/timeout/log
// thống nhất với các cổng QG khác). Response của NCC được parse linh hoạt theo
// nhiều tên field để lấy: số hóa đơn, mã CQT (mã cơ quan thuế), URL tra cứu.
//
// ⚠️ Schema request/response cụ thể PHẢI khớp tài liệu API của NCC khi tích hợp
// thật — phần build payload + parse dưới đây là khung chuẩn, chỉnh theo NCC.
// ============================================================================

public sealed class VnptEInvoiceProvider : IElectronicInvoiceProvider
{
    private readonly HttpClient _http;
    private readonly IConfiguration _cfg;
    private readonly ILogger<VnptEInvoiceProvider> _log;

    public VnptEInvoiceProvider(HttpClient http, IConfiguration cfg, ILogger<VnptEInvoiceProvider> log)
    {
        _http = http;
        _cfg = cfg;
        _log = log;
    }

    private string? Cfg(string key) => _cfg[$"EInvoice:Vnpt:{key}"];

    public bool IsConfigured
    {
        get
        {
            if (!_cfg.GetValue<bool>("EInvoice:Enabled", false)) return false;
            // Bắt buộc tối thiểu để gọi NCC: endpoint + tài khoản dịch vụ + mật khẩu + ký hiệu + mẫu số.
            return !string.IsNullOrWhiteSpace(Cfg("BaseUrl"))
                && !string.IsNullOrWhiteSpace(Cfg("Account"))
                && !string.IsNullOrWhiteSpace(Cfg("Password"))
                && !string.IsNullOrWhiteSpace(Cfg("Serial"))
                && !string.IsNullOrWhiteSpace(Cfg("Pattern"));
        }
    }

    public async Task<EInvoiceResult> IssueAsync(EInvoiceRequest req, CancellationToken ct = default)
    {
        if (!IsConfigured)
            return EInvoiceResult.Disabled();

        // Validate trước khi gọi NCC (không tin dữ liệu rỗng/âm).
        if (string.IsNullOrWhiteSpace(req.BuyerName))
            return Fail("INVALID_REQUEST", "Thiếu tên người mua trên hóa đơn.");
        if (req.TotalAmount <= 0)
            return Fail("INVALID_REQUEST", "Tổng tiền hóa đơn phải lớn hơn 0.");
        if (req.Items.Count == 0)
            return Fail("INVALID_REQUEST", "Hóa đơn không có dòng hàng hóa/dịch vụ.");

        var maxAttempts = _cfg.GetValue<int>("EInvoice:RetryCount", 3);
        var issuePath = Cfg("IssuePath");
        if (string.IsNullOrWhiteSpace(issuePath)) issuePath = "/api/einvoice/issue";

        var payloadJson = BuildPayload(req);
        // Idempotency: cùng 1 hóa đơn nội bộ = cùng key → NCC dedupe nếu hỗ trợ.
        var idempotencyKey = $"einv:{req.EInvoiceId:N}";

        GatewaySubmissionResult gw;
        try
        {
            gw = await GatewayHttpHelper.PostWithRetryAsync(
                _http,
                issuePath,
                () =>
                {
                    var c = new StringContent(payloadJson, Encoding.UTF8, "application/json");
                    var account = Cfg("Account");
                    var password = Cfg("Password");
                    if (!string.IsNullOrEmpty(account)) c.Headers.TryAddWithoutValidation("X-Account", account);
                    if (!string.IsNullOrEmpty(password)) c.Headers.TryAddWithoutValidation("X-ACPass", password);
                    return c;
                },
                maxAttempts,
                idempotencyKey,
                _log,
                ct);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "EInvoice issue exception for {EInvoiceId}", req.EInvoiceId);
            return Fail("EINVOICE_EXCEPTION", "Lỗi gọi NCC HĐĐT: " + ex.Message);
        }

        if (!gw.Acknowledged)
        {
            _log.LogWarning("EInvoice NCC từ chối phát hành {EInvoiceId}: {Code} {Msg}",
                req.EInvoiceId, gw.ErrorCode, gw.ErrorMessage);
            return new EInvoiceResult
            {
                Success = false,
                ErrorCode = gw.ErrorCode ?? "EINVOICE_REJECTED",
                ErrorMessage = gw.ErrorMessage ?? "NCC HĐĐT từ chối phát hành.",
                RawResponse = gw.RawResponse
            };
        }

        var parsed = ParseResponse(gw.RawResponse);
        _log.LogInformation("EInvoice issued for {EInvoiceId}: no={No} cqt={Cqt}",
            req.EInvoiceId, parsed.InvoiceNumber, parsed.TaxAuthorityCode);

        return new EInvoiceResult
        {
            Success = true,
            ProviderInvoiceId = parsed.ProviderInvoiceId ?? gw.TransactionId,
            InvoiceNumber = parsed.InvoiceNumber,
            TaxAuthorityCode = parsed.TaxAuthorityCode,
            LookupCode = parsed.LookupCode,
            LookupUrl = parsed.LookupUrl,
            RawResponse = gw.RawResponse
        };
    }

    private static EInvoiceResult Fail(string code, string message) => new()
    {
        Success = false,
        ErrorCode = code,
        ErrorMessage = message
    };

    // Khung payload chuẩn — chỉnh theo tài liệu API NCC khi tích hợp thật.
    private string BuildPayload(EInvoiceRequest req)
    {
        return JsonSerializer.Serialize(new
        {
            // Định danh đơn vị bán + ký hiệu/mẫu số lấy từ config (không hardcode).
            sellerTaxCode = Cfg("TaxCode"),
            pattern = Cfg("Pattern"),       // Mẫu số
            serial = Cfg("Serial"),         // Ký hiệu
            invoiceDate = req.InvoiceDate.ToString("yyyy-MM-ddTHH:mm:ss"),
            // Thông tin người mua
            buyerName = req.BuyerName,
            buyerAddress = req.BuyerAddress,
            buyerTaxCode = req.BuyerTaxCode,
            buyerEmail = req.BuyerEmail,
            paymentMethod = req.PaymentMethod,
            // Tổng tiền
            subTotal = req.SubTotal,
            vatRate = req.VatRate,
            vatAmount = req.VatAmount,
            discountAmount = req.DiscountAmount,
            totalAmount = req.TotalAmount,
            // Mã tham chiếu nội bộ để đối soát
            referenceId = req.EInvoiceId.ToString("N"),
            items = req.Items.Select(i => new
            {
                name = i.Name,
                unit = i.Unit,
                quantity = i.Quantity,
                unitPrice = i.UnitPrice,
                amount = i.Amount,
                vatRate = i.VatRate
            })
        });
    }

    private sealed record ParsedInvoice(
        string? ProviderInvoiceId,
        string? InvoiceNumber,
        string? TaxAuthorityCode,
        string? LookupCode,
        string? LookupUrl);

    // Parse linh hoạt theo nhiều tên field thường gặp (VNPT/Viettel/Misa khác nhau).
    private ParsedInvoice ParseResponse(string body)
    {
        if (string.IsNullOrWhiteSpace(body))
            return new ParsedInvoice(null, null, null, null, null);
        try
        {
            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;
            return new ParsedInvoice(
                ProviderInvoiceId: GetStr(root, "providerInvoiceId", "fkey", "invoiceId", "id"),
                InvoiceNumber: GetStr(root, "invoiceNo", "invoiceNumber", "no", "soHoaDon"),
                TaxAuthorityCode: GetStr(root, "taxAuthorityCode", "mccqt", "codeOfTax", "maCQT", "cqtCode"),
                LookupCode: GetStr(root, "lookupCode", "searchCode", "maTraCuu"),
                LookupUrl: GetStr(root, "lookupUrl", "searchUrl", "urlTraCuu", "link"));
        }
        catch (JsonException)
        {
            return new ParsedInvoice(null, null, null, null, null);
        }
    }

    private static string? GetStr(JsonElement root, params string[] names)
    {
        if (root.ValueKind != JsonValueKind.Object) return null;
        foreach (var name in names)
        {
            foreach (var prop in root.EnumerateObject())
            {
                if (string.Equals(prop.Name, name, StringComparison.OrdinalIgnoreCase))
                {
                    return prop.Value.ValueKind switch
                    {
                        JsonValueKind.String => prop.Value.GetString(),
                        JsonValueKind.Number => prop.Value.ToString(),
                        _ => null
                    };
                }
            }
        }
        return null;
    }
}
