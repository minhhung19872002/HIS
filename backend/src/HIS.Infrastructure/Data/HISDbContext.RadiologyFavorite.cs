using HIS.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Data;

/// <summary>
/// Partial extension cho HISDbContext — F2.8 #138 Favorite ca chup RIS
/// </summary>
public partial class HISDbContext
{
    // F2.8: Ca chup yeu thich (per-user, server-side)
    public DbSet<RadiologyStudyFavorite> RadiologyStudyFavorites => Set<RadiologyStudyFavorite>();
}
