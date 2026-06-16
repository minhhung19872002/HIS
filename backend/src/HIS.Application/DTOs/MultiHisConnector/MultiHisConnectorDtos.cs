namespace HIS.Application.DTOs.MultiHisConnector;

// ─── Connection CRUD ────────────────────────────────────────────────────────

public class HisConnectionDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Provider { get; set; }
    public string BaseUrl { get; set; } = string.Empty;
    public string? AuthType { get; set; }

    /// <summary>
    /// Tên key trong SystemConfig — KHÔNG phải giá trị secret.
    /// FE hiển thị tên này để admin biết đang dùng key nào.
    /// </summary>
    public string? ApiKeyRef { get; set; }
    public bool IsActive { get; set; }
    public DateTime? LastCheckedAt { get; set; }
    public string? LastStatus { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SaveHisConnectionDto
{
    public Guid? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Provider { get; set; }
    public string BaseUrl { get; set; } = string.Empty;
    public string? AuthType { get; set; }

    /// <summary>Tên key trong SystemConfig — KHÔNG nhận secret thẳng từ client</summary>
    public string? ApiKeyRef { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Notes { get; set; }
}

// ─── TestConnection ──────────────────────────────────────────────────────────

public class ConnectionTestResultDto
{
    public Guid ConnectionId { get; set; }
    public string ConnectionName { get; set; } = string.Empty;

    /// <summary>"Online" | "Offline"</summary>
    public string Status { get; set; } = "Unknown";

    /// <summary>Độ trễ round-trip ping (ms). Null khi Offline hoặc MockMode</summary>
    public int? LatencyMs { get; set; }

    public string? ErrorMessage { get; set; }

    /// <summary>True khi chạy ở MockMode (chưa có endpoint thật)</summary>
    public bool IsMock { get; set; }
    public DateTime TestedAt { get; set; }
}

// ─── CheckMissingForms ───────────────────────────────────────────────────────

public class MissingFormsCheckResultDto
{
    /// <summary>Tổng số đợt điều trị (encounter) đã kiểm tra trong khoảng ngày</summary>
    public int TotalEncountersChecked { get; set; }

    /// <summary>Số đợt thiếu ít nhất 1 tờ phiếu bắt buộc</summary>
    public int EncountersWithMissingForms { get; set; }

    public List<MissingFormEncounterDto> Items { get; set; } = [];
    public DateTime CheckedAt { get; set; }

    /// <summary>Ghi chú logic: mô tả rule kiểm tra đã áp dụng</summary>
    public string RuleDescription { get; set; } = string.Empty;
}

public class MissingFormEncounterDto
{
    /// <summary>ID đợt khám/nhập viện (MedicalRecordId hoặc InpatientAdmissionId)</summary>
    public Guid EncounterId { get; set; }

    /// <summary>"OPD" | "IPD"</summary>
    public string EncounterType { get; set; } = string.Empty;

    public string? PatientCode { get; set; }
    public string? PatientName { get; set; }
    public DateTime? EncounterDate { get; set; }

    /// <summary>Danh sách tờ phiếu bắt buộc còn thiếu</summary>
    public List<string> MissingFormNames { get; set; } = [];
}
