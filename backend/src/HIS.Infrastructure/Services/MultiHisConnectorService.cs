using HIS.Application.DTOs.MultiHisConnector;
using HIS.Application.Interfaces;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Quản trị kết nối API HIS đa nhà cung cấp + tự kiểm thiếu tờ phiếu.
///
/// MockMode (mặc định true): TestConnection trả Online ngay mà KHÔNG gọi HTTP thật.
/// Bật production khi có endpoint thật: appsettings.json → "MultiHisConnector:MockMode": false
/// (hoặc env var MultiHisConnector__MockMode=false).
///
/// Secret policy: KHÔNG đọc giá trị secret từ DB. ApiKeyRef là tên key trong SystemConfig
/// (bảng SystemConfigs); giá trị được resolve ở runtime qua SystemConfig / env, không log.
/// </summary>
public class MultiHisConnectorService : IMultiHisConnectorService
{
    private readonly HISDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _config;
    private readonly ILogger<MultiHisConnectorService> _logger;

    // MockMode: true = không ping HTTP thật, trả Online giả để dev/test an toàn
    private bool MockMode => _config.GetValue<bool>("MultiHisConnector:MockMode", defaultValue: true);

    // Health check path phổ biến — fallback nếu HIS đối tác không có /health
    private static readonly string[] HealthPaths = ["/health", "/api/ping", "/api/health", "/"];

    public MultiHisConnectorService(
        HISDbContext db,
        IHttpClientFactory httpClientFactory,
        IConfiguration config,
        ILogger<MultiHisConnectorService> logger)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
        _config = config;
        _logger = logger;
    }

    // ────────────────────────────────────────────────────────────────────────
    // Connection CRUD
    // ────────────────────────────────────────────────────────────────────────

    public async Task<List<HisConnectionDto>> GetConnectionsAsync()
    {
        var rows = await _db.Set<HisConnection>()
            .Where(x => !x.IsDeleted)
            .OrderBy(x => x.Name)
            .ToListAsync();
        return rows.Select(ToDto).ToList();
    }

    public async Task<HisConnectionDto?> GetConnectionByIdAsync(Guid id)
    {
        var row = await _db.Set<HisConnection>()
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        return row is null ? null : ToDto(row);
    }

    public async Task<HisConnectionDto> SaveConnectionAsync(SaveHisConnectionDto dto, string? userId)
    {
        HisConnection entity;
        if (dto.Id.HasValue && dto.Id != Guid.Empty)
        {
            entity = await _db.Set<HisConnection>()
                .FirstOrDefaultAsync(x => x.Id == dto.Id.Value && !x.IsDeleted)
                ?? throw new InvalidOperationException($"HisConnection {dto.Id} không tồn tại.");
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;
        }
        else
        {
            entity = new HisConnection
            {
                Id = Guid.NewGuid(),
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId,
                LastStatus = "Unknown",
            };
            _db.Set<HisConnection>().Add(entity);
        }

        entity.Name = dto.Name.Trim();
        entity.Provider = dto.Provider?.Trim();
        entity.BaseUrl = dto.BaseUrl.TrimEnd('/');
        entity.AuthType = dto.AuthType?.Trim();
        entity.ApiKeyRef = dto.ApiKeyRef?.Trim();   // Tên key — không phải secret
        entity.IsActive = dto.IsActive;
        entity.Notes = dto.Notes?.Trim();

        await _db.SaveChangesAsync();
        return ToDto(entity);
    }

    public async Task<bool> DeleteConnectionAsync(Guid id)
    {
        var entity = await _db.Set<HisConnection>()
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (entity is null) return false;

        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    // ────────────────────────────────────────────────────────────────────────
    // TestConnection
    // ────────────────────────────────────────────────────────────────────────

    public async Task<ConnectionTestResultDto> TestConnectionAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.Set<HisConnection>()
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct)
            ?? throw new InvalidOperationException($"HisConnection {id} không tồn tại.");

        var result = new ConnectionTestResultDto
        {
            ConnectionId = entity.Id,
            ConnectionName = entity.Name,
            IsMock = MockMode,
            TestedAt = DateTime.UtcNow,
        };

        if (MockMode)
        {
            // MockMode: trả Online giả — phù hợp khi endpoint thật chưa sẵn sàng
            result.Status = "Online";
            result.LatencyMs = null;
            _logger.LogInformation(
                "[MultiHisConnector] MockMode=true — TestConnection '{Name}' trả Online giả.", entity.Name);
        }
        else
        {
            // Production: thử ping từng path, lấy kết quả đầu tiên thành công
            result.Status = "Offline";
            var http = _httpClientFactory.CreateClient("MultiHisConnector");
            var sw = System.Diagnostics.Stopwatch.StartNew();
            foreach (var path in HealthPaths)
            {
                try
                {
                    var url = entity.BaseUrl + path;
                    using var resp = await http.GetAsync(url, ct);
                    sw.Stop();
                    // Coi 2xx–4xx là "Online" (server phản hồi); chỉ 5xx / exception = Offline
                    if (resp.IsSuccessStatusCode || (int)resp.StatusCode < 500)
                    {
                        result.Status = "Online";
                        result.LatencyMs = (int)sw.ElapsedMilliseconds;
                        break;
                    }
                }
                catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or OperationCanceledException)
                {
                    _logger.LogWarning(
                        "[MultiHisConnector] Ping {Name}{Path} lỗi: {Msg}", entity.Name, path, ex.Message);
                }
            }
            if (result.Status == "Offline")
                result.ErrorMessage = "Không thể kết nối đến BaseUrl. Kiểm tra network/firewall hoặc URL.";
        }

        // Cập nhật DB — không throw nếu persist lỗi (tránh fail cả TestConnection)
        try
        {
            entity.LastCheckedAt = result.TestedAt;
            entity.LastStatus = result.Status;
            entity.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "[MultiHisConnector] Không lưu được LastStatus vào DB cho connection {Id}.", id);
        }

        return result;
    }

    // ────────────────────────────────────────────────────────────────────────
    // CheckMissingForms
    // ────────────────────────────────────────────────────────────────────────
    //
    // Rule áp dụng (đơn giản — có thể mở rộng sang config table khi cần):
    //
    //   OPD (Examination):
    //     Thiếu "Phiếu khám bệnh" khi cả ChiefComplaint và PresentIllness đều null/empty
    //     (bác sĩ chưa nhập nội dung khám bệnh).
    //
    //   IPD (Admission):
    //     Thiếu "Tờ ra viện / tóm tắt" khi Admission.Discharge == null
    //     (bệnh nhân đã nhập viện nhưng chưa có record ra viện).
    //     Thiếu "Chẩn đoán ra viện" khi Discharge.DischargeDiagnosis null/empty.
    //
    // Lý do dùng rule nội tuyến: HIS không có bảng "FormType" riêng theo tên tờ phiếu;
    // tờ phiếu được ánh xạ từ field content. Mở rộng bằng cách inject config/table sau.
    // ────────────────────────────────────────────────────────────────────────

    public async Task<MissingFormsCheckResultDto> CheckMissingFormsAsync(
        DateTime fromDate,
        DateTime toDate,
        string? encounterType = null)
    {
        var result = new MissingFormsCheckResultDto
        {
            CheckedAt = DateTime.UtcNow,
            RuleDescription =
                "OPD: cần có nội dung khám (ChiefComplaint hoặc PresentIllness). " +
                "IPD: cần có record ra viện (Discharge) và chẩn đoán ra viện (DischargeDiagnosis). " +
                "Rule mở rộng theo bảng cấu hình khi có yêu cầu."
        };

        var toInclusive = toDate.Date.AddDays(1).AddTicks(-1);
        bool checkOpd = encounterType is null or "OPD";
        bool checkIpd = encounterType is null or "IPD";

        // ── OPD: Examination ─────────────────────────────────────────────
        if (checkOpd)
        {
            var opdRows = await _db.Set<Examination>()
                .Include(e => e.MedicalRecord)
                    .ThenInclude(mr => mr.Patient)
                .Where(e => !e.IsDeleted
                    && e.CreatedAt >= fromDate.Date
                    && e.CreatedAt <= toInclusive
                    && !e.MedicalRecord.IsDeleted)
                .ToListAsync();

            result.TotalEncountersChecked += opdRows.Count;

            foreach (var exam in opdRows)
            {
                var missing = new List<string>();

                // Rule OPD: phải có nội dung khám
                bool hasContent =
                    !string.IsNullOrWhiteSpace(exam.ChiefComplaint) ||
                    !string.IsNullOrWhiteSpace(exam.PresentIllness);
                if (!hasContent)
                    missing.Add("Phiếu khám bệnh (nội dung EMR OPD)");

                if (missing.Count > 0)
                {
                    result.Items.Add(new MissingFormEncounterDto
                    {
                        EncounterId = exam.Id,
                        EncounterType = "OPD",
                        PatientCode = exam.MedicalRecord?.Patient?.PatientCode,
                        PatientName = exam.MedicalRecord?.Patient?.FullName,
                        EncounterDate = exam.CreatedAt,
                        MissingFormNames = missing,
                    });
                }
            }
        }

        // ── IPD: Admission ───────────────────────────────────────────────
        if (checkIpd)
        {
            var ipdRows = await _db.Set<Admission>()
                .Include(a => a.Patient)
                .Include(a => a.Discharge)
                .Where(a => !a.IsDeleted
                    && a.AdmissionDate >= fromDate.Date
                    && a.AdmissionDate <= toInclusive)
                .ToListAsync();

            result.TotalEncountersChecked += ipdRows.Count;

            foreach (var adm in ipdRows)
            {
                var missing = new List<string>();

                // Rule IPD: phải có record ra viện
                if (adm.Discharge is null)
                {
                    missing.Add("Tờ ra viện (chưa lập Discharge)");
                }
                else if (string.IsNullOrWhiteSpace(adm.Discharge.DischargeDiagnosis))
                {
                    missing.Add("Chẩn đoán ra viện (DischargeDiagnosis)");
                }

                if (missing.Count > 0)
                {
                    result.Items.Add(new MissingFormEncounterDto
                    {
                        EncounterId = adm.Id,
                        EncounterType = "IPD",
                        PatientCode = adm.Patient?.PatientCode,
                        PatientName = adm.Patient?.FullName,
                        EncounterDate = adm.AdmissionDate,
                        MissingFormNames = missing,
                    });
                }
            }
        }

        result.EncountersWithMissingForms = result.Items.Count;
        return result;
    }

    // ────────────────────────────────────────────────────────────────────────
    // Mapper
    // ────────────────────────────────────────────────────────────────────────

    private static HisConnectionDto ToDto(HisConnection e) => new()
    {
        Id = e.Id,
        Name = e.Name,
        Provider = e.Provider,
        BaseUrl = e.BaseUrl,
        AuthType = e.AuthType,
        ApiKeyRef = e.ApiKeyRef,
        IsActive = e.IsActive,
        LastCheckedAt = e.LastCheckedAt,
        LastStatus = e.LastStatus,
        Notes = e.Notes,
        CreatedAt = e.CreatedAt,
    };
}
