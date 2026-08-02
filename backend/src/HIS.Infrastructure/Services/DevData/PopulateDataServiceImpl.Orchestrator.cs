using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services.DevData;

public partial class PopulateDataServiceImpl
{
    // ==========================================================================
    // ALL-IN-ONE
    // ==========================================================================
    public async Task<object> PopulateAllAsync()
    {
        var all = new Dictionary<string, object>();
        foreach (var (name, fn) in new (string, Func<Task<object>>)[]
        {
            ("prereqs", PopulatePrereqsAsync),
            ("infection-control", PopulateInfectionControlAsync),
            ("patient-portal", PopulatePatientPortalAsync),
            ("equipment", PopulateEquipmentAsync),
            ("pathology", PopulatePathologyAsync),
            ("functional-diagnostics", PopulateFunctionalDiagnosticsAsync),
            ("quality", PopulateQualityAsync),
            ("rehab-sessions", PopulateRehabSessionsAsync),
            ("tele-sessions", PopulateTeleSessionsAsync),
            ("diet-orders", PopulateDietOrdersAsync),
            ("blood-bank", PopulateBloodBankAsync),
            ("culture-stock", PopulateCultureStockAsync),
            ("public-health", PopulatePublicHealthAsync),
            ("methadone", PopulateMethadoneAsync),
            ("lab-qc", PopulateLabQCAsync),
            ("mci", PopulateMCIAsync),
            ("cme", PopulateCMEAsync),
            ("medinet-extras", PopulateMedinetExtrasAsync),
            ("finishing", PopulateFinishingAsync),
        })
        {
            try
            {
                // Sub-methods used to return IActionResult and this loop unwrapped
                // ObjectResult.Value; the sub-methods now return the raw object
                // directly (same value), so we can assign it straight through.
                var r = await fn();
                all[name] = r;
            }
            catch (Exception e)
            {
                all[name] = new { error = e.Message };
                _logger.LogError(e, "Populate {Module} failed", name);
            }
            // If any sub-call failed mid-flight its entities stay tracked; clear
            // between modules so the next module's SaveChangesAsync isn't polluted
            // by the previous module's unpersisted inserts.
            _db.ChangeTracker.Clear();
        }
        return Ok(new { modules = all });
    }
}
