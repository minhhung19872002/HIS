using HIS.Infrastructure.Services;
using Xunit;

namespace HIS.Tests.Services.Billing;

/// <summary>
/// QA round 3 (r3-billing): the pure parts of the invoice ledger — bed-day counting and the patient share of a line.
/// Over-counting bills the patient for days never stayed; under-counting loses the hospital's bed revenue.
/// </summary>
public class InvoiceLedgerTests
{
    private static readonly DateTime Now = new(2026, 9, 15, 10, 0, 0);

    [Fact]
    public void Nights_between_assignment_and_release_are_the_bed_days()
    {
        var days = InvoiceLedger.ComputeBedDays(new[] { (new DateTime(2026, 9, 10, 22, 0, 0), (DateTime?)new DateTime(2026, 9, 13, 8, 0, 0)) }, Now);
        Assert.Equal(new[] { 3 }, days);
    }

    [Fact]
    public void An_active_assignment_counts_until_now()
    {
        var days = InvoiceLedger.ComputeBedDays(new[] { (new DateTime(2026, 9, 12, 9, 0, 0), (DateTime?)null) }, Now);
        Assert.Equal(new[] { 3 }, days);
    }

    [Fact]
    public void A_transfer_splits_the_nights_without_counting_the_transfer_day_twice()
    {
        var days = InvoiceLedger.ComputeBedDays(new[]
        {
            (new DateTime(2026, 9, 10, 8, 0, 0), (DateTime?)new DateTime(2026, 9, 12, 14, 0, 0)),
            (new DateTime(2026, 9, 12, 14, 0, 0), (DateTime?)new DateTime(2026, 9, 14, 9, 0, 0)),
        }, Now);
        Assert.Equal(new[] { 2, 2 }, days);
    }

    [Fact]
    public void Same_day_stay_of_at_least_four_hours_is_one_day_on_the_longest_bed()
    {
        var days = InvoiceLedger.ComputeBedDays(new[]
        {
            (new DateTime(2026, 9, 14, 8, 0, 0), (DateTime?)new DateTime(2026, 9, 14, 9, 0, 0)),
            (new DateTime(2026, 9, 14, 9, 0, 0), (DateTime?)new DateTime(2026, 9, 14, 15, 0, 0)),
        }, Now);
        Assert.Equal(new[] { 0, 1 }, days);
    }

    [Fact]
    public void Same_day_stay_under_four_hours_is_not_charged()
    {
        var days = InvoiceLedger.ComputeBedDays(new[] { (new DateTime(2026, 9, 14, 8, 0, 0), (DateTime?)new DateTime(2026, 9, 14, 11, 30, 0)) }, Now);
        Assert.Equal(new[] { 0 }, days);
    }

    [Fact]
    public void Release_before_assignment_never_gives_negative_days()
    {
        var days = InvoiceLedger.ComputeBedDays(new[] { (new DateTime(2026, 9, 14, 8, 0, 0), (DateTime?)new DateTime(2026, 9, 13, 8, 0, 0)) }, Now);
        Assert.Equal(new[] { 0 }, days);
    }

    [Fact]
    public void Open_assignment_after_discharge_stops_at_the_discharge_date()
    {
        // review B4: bed never released, patient discharged on the 12th, report run on the 15th
        var days = InvoiceLedger.ComputeBedDays(new[] { (new DateTime(2026, 9, 10, 9, 0, 0), (DateTime?)null) }, new DateTime(2026, 9, 12, 10, 0, 0));
        Assert.Equal(new[] { 2 }, days);
    }

    [Fact]
    public void Release_recorded_after_discharge_is_capped_at_discharge()
    {
        var days = InvoiceLedger.ComputeBedDays(new[] { (new DateTime(2026, 9, 10, 9, 0, 0), (DateTime?)new DateTime(2026, 9, 14, 9, 0, 0)) }, new DateTime(2026, 9, 12, 10, 0, 0));
        Assert.Equal(new[] { 2 }, days);
    }

    [Fact]
    public void Stale_open_assignment_ends_when_the_next_bed_starts_so_no_night_is_charged_twice()
    {
        // two beds left open (06-12 and 09-10): each night counted once, the old bed stops at the new one
        var days = InvoiceLedger.ComputeBedDays(new[]
        {
            (new DateTime(2026, 9, 10, 8, 0, 0), (DateTime?)null),
            (new DateTime(2026, 6, 12, 8, 0, 0), (DateTime?)null),
        }, Now);
        Assert.Equal(new[] { 5, 90 }, days); // 09-10..09-14 on the new bed; 06-12..09-09 on the old one
        Assert.Equal((Now.Date - new DateTime(2026, 6, 12)).Days, days.Sum());
    }

    [Fact]
    public void Overlapping_released_assignments_do_not_double_charge()
    {
        var days = InvoiceLedger.ComputeBedDays(new[]
        {
            (new DateTime(2026, 9, 10, 8, 0, 0), (DateTime?)new DateTime(2026, 9, 13, 8, 0, 0)),
            (new DateTime(2026, 9, 11, 9, 0, 0), (DateTime?)new DateTime(2026, 9, 14, 9, 0, 0)),
        }, Now);
        Assert.Equal(new[] { 1, 3 }, days); // nights 10 | 11,12,13
    }

    [Fact]
    public void Transferred_admission_without_release_ends_at_the_stay_end_given()
    {
        // admission status 5 (moved to another department): the caller passes its last update as the stay end
        var days = InvoiceLedger.ComputeBedDays(new[] { (new DateTime(2026, 9, 1, 8, 0, 0), (DateTime?)null) }, new DateTime(2026, 9, 3, 15, 0, 0));
        Assert.Equal(new[] { 2 }, days);
    }

    [Fact]
    public void Duplicate_open_beds_on_one_record_charge_each_night_once_on_the_latest_assignment()
    {
        // three duplicate admissions of one record, each with a bed opened at the same time and never released
        var start = new DateTime(2026, 6, 12, 9, 13, 0);
        var days = InvoiceLedger.ComputeBedDays(new[] { (start, (DateTime?)null), (start, (DateTime?)null), (start.AddMinutes(1), (DateTime?)null) }, Now);
        Assert.Equal(new[] { 0, 0, (Now.Date - start.Date).Days }, days);
    }

    [Fact]
    public void No_assignment_gives_no_days()
        => Assert.Empty(InvoiceLedger.ComputeBedDays(Array.Empty<(DateTime, DateTime?)>(), Now));

    [Theory]
    [InlineData(100_000, 0, 0, 100_000)]      // never split (fee patient / legacy row) → patient pays all
    [InlineData(100_000, 80_000, 20_000, 20_000)] // insured co-pay
    [InlineData(100_000, 100_000, 0, 0)]      // fully covered → nothing to collect
    [InlineData(100_000, 0, 100_000, 100_000)]
    public void Patient_share_of_a_line(decimal amount, decimal insurance, decimal patient, decimal expected)
        => Assert.Equal(expected, InvoiceLedger.PatientShare(amount, insurance, patient));
}
