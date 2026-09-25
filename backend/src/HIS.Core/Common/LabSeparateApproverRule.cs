namespace HIS.Core.Common;

/// <summary>
/// QA-R12: "4-eyes" rule for the final release of a lab result — the user who releases it should not be the one
/// who entered it or pre-approved it. LAB_TECH holds LabResult.Validate (pre-approve AND final approve), so one
/// technician could release their own numbers unchecked. Small labs with a single technician must keep working,
/// so the behaviour is a SystemConfigs switch: Off (default when the row is missing = old behaviour) / Warn / Block.
/// </summary>
public static class LabSeparateApproverRule
{
    public const string ConfigKey = "Lab.SeparateApproverMode";

    public enum Mode { Off, Warn, Block }

    public static Mode ParseMode(string? value) => value?.Trim().ToUpperInvariant() switch
    {
        "WARN" => Mode.Warn,
        "BLOCK" => Mode.Block,
        _ => Mode.Off,
    };

    /// <summary>Who entered (ResultUserId) and who pre-approved (TechnicianUserId) one result line.</summary>
    public sealed record Line(Guid? ResultUserId, Guid? TechnicianUserId);

    /// <summary>
    /// Message when the approver entered or pre-approved any of the lines being released, else null.
    /// No approver id or no recorded author → no finding (no positive evidence).
    /// </summary>
    public static string? Finding(Guid? approverUserId, IEnumerable<Line> lines)
    {
        if (approverUserId is not Guid approver || approver == Guid.Empty || lines == null) return null;
        var list = lines.ToList();
        var entered = list.Any(l => l.ResultUserId == approver);
        var preApproved = list.Any(l => l.TechnicianUserId == approver);
        if (!entered && !preApproved) return null;
        var what = entered && preApproved ? "đã nhập và duyệt sơ bộ" : entered ? "đã nhập" : "đã duyệt sơ bộ";
        return $"Người duyệt chính thức {what} chính kết quả này — nguyên tắc 2 người (người nhập/sơ duyệt khác người duyệt).";
    }

    /// <summary>Applies the mode: Off → nothing; Warn → warning text; Block → blocked with the same text.</summary>
    public static (bool Blocked, string? Warning) Evaluate(Mode mode, Guid? approverUserId, IEnumerable<Line> lines)
    {
        if (mode == Mode.Off) return (false, null);
        var finding = Finding(approverUserId, lines);
        if (finding == null) return (false, null);
        return mode == Mode.Block
            ? (true, finding + " Nhờ người khác duyệt (cấu hình Lab.SeparateApproverMode = Block).")
            : (false, "[Cảnh báo] " + finding);
    }
}
