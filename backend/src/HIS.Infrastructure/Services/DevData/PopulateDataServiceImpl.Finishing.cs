using Microsoft.EntityFrameworkCore;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services.DevData;

public partial class PopulateDataServiceImpl
{
    // ==========================================================================
    // FINISHING — remaining tables not covered by any module-specific seeder
    // (certificates, lab analyzers, appointments, endpoint security, outbreak flag)
    //
    // task #364 wave-6: the body was split verbatim into 3 sibling partial files
    // (each block already owned its own try/catch, so no behavior change):
    //   - PopulateDataServiceImpl.FinishingCatalog.cs  (schema-drift fix, certs,
    //     lis analyzers, appointments, endpoint security, outbreak tagging, tbhiv)
    //   - PopulateDataServiceImpl.FinishingModules.cs  (ivf, fixed assets, training
    //     classes, radiology requests, procurement, hie connections)
    //   - PopulateDataServiceImpl.FinishingOps.cs      (signing transactions/
    //     requests, consultations, incident reports, tele/mci boost, archives,
    //     shift-to-today)
    // ==========================================================================
    public async Task<object> PopulateFinishingAsync()
    {
        var ctx = await LoadCtxAsync();
        var summary = new Dictionary<string, int>();
        var errors = new Dictionary<string, string>();
        var rng = new Random(77);

        await SeedFinishingCatalogAsync(ctx, summary, errors, rng);
        await SeedFinishingModulesAsync(ctx, summary, errors, rng);
        await SeedFinishingOpsAsync(ctx, summary, errors, rng);

        return Ok(new { module = "finishing", inserted = summary, errors });
    }

}
