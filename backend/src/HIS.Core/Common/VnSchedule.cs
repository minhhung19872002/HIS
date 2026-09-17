namespace HIS.Core.Common;

/// <summary>
/// Wall-clock (VN, UTC+7) scheduling for maintenance workers. Anchoring to a fixed VN time instead of
/// "N hours after boot" keeps heavy jobs (audit purge, backup, token cleanup) in the night window no
/// matter when the container was last deployed.
/// </summary>
public static class VnSchedule
{
    /// <summary>Parses "HH:mm" (VN time of day); invalid/out-of-range → <paramref name="fallback"/>.</summary>
    public static TimeSpan ParseTimeOfDay(string? raw, TimeSpan fallback) =>
        TimeSpan.TryParse(raw, out var t) && t >= TimeSpan.Zero && t < TimeSpan.FromDays(1) ? t : fallback;

    /// <summary>
    /// Next VN run strictly after <paramref name="nowVn"/> on the grid runAt + k·interval.
    /// interval &lt; 24h: slots repeat through the day around the anchor (02:00 every 6h → 02, 08, 14, 20).
    /// interval ≥ 24h (≤ 0 → 24h): the first slot is the next runAt; later slots are
    /// <paramref name="previousSlotVn"/> + interval, so 48h really skips a day while keeping the time of day.
    /// </summary>
    public static DateTime NextRunVn(TimeSpan runAtVn, TimeSpan interval, DateTime nowVn, DateTime? previousSlotVn = null)
    {
        if (interval <= TimeSpan.Zero) interval = TimeSpan.FromDays(1);
        DateTime next;
        if (interval < TimeSpan.FromDays(1))
        {
            next = nowVn.Date.Add(runAtVn);
            // Step back to the earliest slot of the grid that is still after "now".
            while (next - interval > nowVn) next -= interval;
        }
        else
        {
            next = previousSlotVn.HasValue ? previousSlotVn.Value + interval : nowVn.Date.Add(runAtVn);
        }
        while (next <= nowVn) next += interval < TimeSpan.FromDays(1) ? interval : TimeSpan.FromDays(1);
        return next;
    }

    /// <summary>Delay until <see cref="NextRunVn"/> from the current VN time (floor 1 minute against busy loops).</summary>
    public static TimeSpan DelayUntilNextRun(TimeSpan runAtVn, TimeSpan interval, DateTime? previousSlotVn, out DateTime nextRunVn)
    {
        var nowVn = VnTime.NowVn;
        // A timer can fire a few ms before the slot: never hand back the slot that just ran.
        if (previousSlotVn.HasValue && previousSlotVn.Value > nowVn) nowVn = previousSlotVn.Value;
        nextRunVn = NextRunVn(runAtVn, interval, nowVn, previousSlotVn);
        var delay = nextRunVn - nowVn;
        return delay < TimeSpan.FromMinutes(1) ? TimeSpan.FromMinutes(1) : delay;
    }
}
