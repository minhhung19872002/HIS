using HIS.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Data;

/// <summary>
/// Partial extension cho HISDbContext — F11.7 Anti-Fraud Booking
/// </summary>
public partial class HISDbContext
{
    // Anti-fraud tables (F11.7)
    public DbSet<BookingAttemptLog> BookingAttemptLogs => Set<BookingAttemptLog>();
    public DbSet<BookingBlacklist> BookingBlacklists => Set<BookingBlacklist>();
}
