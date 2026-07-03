using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.API.Filters;

namespace HIS.API.Controllers;

public partial class PopulateDataController
{
    // ==========================================================================
    // ALL-IN-ONE
    // ==========================================================================
    [HttpPost("all")]
    public async Task<IActionResult> PopulateAll()
    {
        var all = new Dictionary<string, object>();
        foreach (var (name, fn) in new (string, Func<Task<IActionResult>>)[]
        {
            ("prereqs", PopulatePrereqs),
            ("infection-control", PopulateInfectionControl),
            ("patient-portal", PopulatePatientPortal),
            ("equipment", PopulateEquipment),
            ("pathology", PopulatePathology),
            ("quality", PopulateQuality),
            ("rehab-sessions", PopulateRehabSessions),
            ("tele-sessions", PopulateTeleSessions),
            ("diet-orders", PopulateDietOrders),
            ("blood-bank", PopulateBloodBank),
            ("culture-stock", PopulateCultureStock),
            ("public-health", PopulatePublicHealth),
            ("methadone", PopulateMethadone),
            ("lab-qc", PopulateLabQC),
            ("mci", PopulateMCI),
            ("cme", PopulateCME),
            ("medinet-extras", PopulateMedinetExtras),
            ("finishing", PopulateFinishing),
        })
        {
            try
            {
                var r = await fn();
                if (r is ObjectResult { Value: var v }) all[name] = v!;
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
