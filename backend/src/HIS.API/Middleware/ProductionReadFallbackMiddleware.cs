using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.Data.SqlClient;

namespace HIS.API.Middleware;

/// <summary>
/// Keeps production pages alive when the restored demo database is missing optional module tables.
/// For read-only screen loads we prefer returning empty-state JSON over surfacing a 500/CORS failure.
/// </summary>
public sealed class ProductionReadFallbackMiddleware
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly RequestDelegate _next;
    private readonly ILogger<ProductionReadFallbackMiddleware> _logger;

    public ProductionReadFallbackMiddleware(
        RequestDelegate next,
        ILogger<ProductionReadFallbackMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (TryGetSyntheticResponse(context, out var syntheticStatusCode, out var syntheticPayload))
        {
            await WriteJsonAsync(context, syntheticStatusCode, syntheticPayload);
            return;
        }

        try
        {
            await _next(context);
        }
        catch (Exception ex) when (!context.Response.HasStarted &&
                                   TryGetFallbackResponse(context, ex, out var fallbackStatusCode, out var fallbackPayload))
        {
            _logger.LogWarning(
                ex,
                "Returning production fallback for {Method} {Path}",
                context.Request.Method,
                context.Request.Path);

            await WriteJsonAsync(context, fallbackStatusCode, fallbackPayload);
        }
    }

    private static async Task WriteJsonAsync(HttpContext context, int statusCode, object payload)
    {
        context.Response.Clear();
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json; charset=utf-8";
        await JsonSerializer.SerializeAsync(context.Response.Body, payload, JsonOptions);
    }

    private static bool TryGetSyntheticResponse(HttpContext context, out int statusCode, out object payload)
    {
        statusCode = StatusCodes.Status200OK;
        payload = null!;

        // Synthetic empty responses were a temporary workaround while Cloud SQL was
        // missing module tables. After the local→Cloud SQL migration the DB has all
        // 370+ tables, so real controllers can answer these routes. Keep only the
        // exception-path fallback below (TryGetFallbackResponse) so a genuine failure
        // still returns an empty shape instead of a 500.
        return false;

#pragma warning disable CS0162 // Unreachable code retained for quick re-enable if a route regresses
        var method = context.Request.Method;
        var path = NormalizePath(context);

        if (HttpMethods.IsGet(method))
        {
            switch (path)
            {
                case "/api/hospital-pharmacy/dashboard":
                    payload = new { todayRevenue = 0m, todaySaleCount = 0, lowStockCount = 0 };
                    return true;
                case "/api/hospital-pharmacy/stock":
                    payload = new { items = Array.Empty<object>(), totalCount = 0 };
                    return true;
                case "/api/hospital-pharmacy/revenue":
                case "/api/hospital-pharmacy/medicines/search":
                    payload = Array.Empty<object>();
                    return true;
                case "/api/health-checkup":
                    payload = Array.Empty<object>();
                    return true;
                case "/api/health-checkup/campaigns":
                    payload = Array.Empty<object>();
                    return true;
                case "/api/health-checkup/types":
                    payload = new[]
                    {
                        new { code = "general_adult", name = "Tong quat >= 18 tuoi" },
                        new { code = "general_child", name = "Tong quat < 18 tuoi" },
                        new { code = "periodic", name = "Dinh ky" },
                        new { code = "driver", name = "Lai xe" },
                        new { code = "student", name = "Hoc sinh" },
                        new { code = "elderly", name = "Nguoi cao tuoi" },
                        new { code = "occupational", name = "Nghe nghiep" },
                        new { code = "infant", name = "Tre < 24 thang" }
                    };
                    return true;
                case "/api/epidemiology/reports":
                case "/api/school-health/exams":
                case "/api/school-health/schools":
                case "/api/occupational-health/exams":
                    payload = Array.Empty<object>();
                    return true;
                case "/api/epidemiology/statistics":
                    payload = new
                    {
                        totalReports = 0,
                        confirmedCases = 0,
                        activeOutbreaks = 0,
                        deathCount = 0,
                        monthlyTrend = Array.Empty<object>(),
                        diseaseDistribution = Array.Empty<object>()
                    };
                    return true;
                case "/api/epidemiology/notifiable-diseases":
                    payload = new[]
                    {
                        new { code = "A00", name = "Ta", group = "A" },
                        new { code = "A20", name = "Dich hach", group = "A" },
                        new { code = "A33-A35", name = "Bach hau", group = "A" },
                        new { code = "A80", name = "Bai liet", group = "A" },
                        new { code = "A98.5", name = "Ebola", group = "A" },
                        new { code = "A90-A91", name = "Sot xuat huyet Dengue", group = "B" },
                        new { code = "B05", name = "Soi", group = "B" },
                        new { code = "A37", name = "Ho ga", group = "B" },
                        new { code = "A01", name = "Thuong han", group = "B" },
                        new { code = "A39", name = "Viem nao mo cau", group = "B" },
                        new { code = "B15-B17", name = "Viem gan virus", group = "B" },
                        new { code = "J09-J11", name = "Cum", group = "B" },
                        new { code = "A82", name = "Dai", group = "B" },
                        new { code = "B50-B54", name = "Sot ret", group = "B" },
                        new { code = "A15-A19", name = "Lao phoi", group = "C" },
                        new { code = "B20-B24", name = "HIV/AIDS", group = "C" },
                        new { code = "A54", name = "Lau", group = "C" },
                        new { code = "A51-A53", name = "Giang mai", group = "C" }
                    };
                    return true;
                case "/api/occupational-health/hazard-types":
                    payload = new[]
                    {
                        new { code = "dust", name = "Bui", description = "Bui phoi, bui silic, bui amiang" },
                        new { code = "chemical", name = "Hoa chat", description = "Hoa chat doc hai, dung moi huu co" },
                        new { code = "noise", name = "Tieng on", description = "Tieng on > 85dB" },
                        new { code = "vibration", name = "Rung", description = "Rung toan than, rung cuc bo" },
                        new { code = "heat", name = "Nhiet", description = "Lam viec moi truong nong" },
                        new { code = "radiation", name = "Buc xa", description = "Buc xa ion hoa, buc xa tia UV" },
                        new { code = "biological", name = "Vi sinh", description = "Vi khuan, virus, nam" }
                    };
                    return true;
                case "/api/insurance-xml/claims/search":
                case "/api/insurance/claims/search":
                    payload = EmptyPagedResult(context, pageQueryKey: "pageIndex", pageSizeQueryKey: "pageSize", pageIndexDefault: 0);
                    return true;
                case "/api/bhxh-audit/records":
                    payload = EmptyPageIndexResult(context);
                    return true;
                case "/api/bhxh-audit/auditor-accounts":
                    payload = Array.Empty<object>();
                    return true;
            }

            if (path.StartsWith("/api/health-checkup/campaigns/", StringComparison.Ordinal) &&
                path.EndsWith("/groups", StringComparison.Ordinal))
            {
                payload = Array.Empty<object>();
                return true;
            }

            if (path.StartsWith("/api/health-checkup/campaigns/", StringComparison.Ordinal) &&
                path.EndsWith("/cost-report", StringComparison.Ordinal))
            {
                payload = new
                {
                    totalCost = 0m,
                    totalMembers = 0,
                    completedMembers = 0,
                    averageCostPerMember = 0m
                };
                return true;
            }
        }

        if (HttpMethods.IsPost(method))
        {
            switch (NormalizePath(context))
            {
                case "/api/insurance-xml/submit":
                    payload = new
                    {
                        success = true,
                        message = "Queued in fallback mode",
                        transactionId = Guid.NewGuid().ToString("N")
                    };
                    return true;
                case "/api/bhxh-audit/import-excel":
                    payload = new
                    {
                        totalRows = 0,
                        matchedRows = 0,
                        unmatchedRows = 0,
                        records = Array.Empty<object>()
                    };
                    return true;
                case "/api/bhxh-audit/approve":
                    payload = new
                    {
                        success = true,
                        approvedCount = 0
                    };
                    return true;
                case "/api/bhxh-audit/auditor-accounts":
                    payload = new
                    {
                        id = Guid.NewGuid(),
                        createdAt = DateTime.UtcNow,
                        success = true
                    };
                    return true;
            }
        }

        return false;
#pragma warning restore CS0162
    }

    private static bool TryGetFallbackResponse(HttpContext context, Exception exception, out int statusCode, out object payload)
    {
        statusCode = StatusCodes.Status200OK;
        payload = null!;

        if (!IsSchemaDriftException(exception) && !IsLinuxCryptoException(context.Request.Path, exception))
        {
            return false;
        }

        var path = NormalizePath(context);

        switch (path)
        {
            case "/api/examination/templates/prescription":
            case "/api/examination/appointments/overdue":
            case "/api/culture-stock":
            case "/api/culture-stock/freezer-codes":
            case "/api/pathology/requests":
            case "/api/bloodbankcomplete/stock/detail":
            case "/api/bloodbankcomplete/issue-requests":
            case "/api/emr-admin/signing-roles":
            case "/api/emr-admin/cover-types":
            case "/api/emr-admin/document-types":
            case "/api/emr-admin/signing-operations":
            case "/api/emr-admin/signers":
            case "/api/emr-admin/document-groups":
            case "/api/equipment":
            case "/api/equipment/repairs":
            case "/api/quality/audits":
            case "/api/quality/capas":
            case "/api/quality/indicators":
            case "/api/hie/connections":
            case "/api/hie/referrals":
            case "/api/hie/teleconsults":
            case "/api/hie/insurance/submissions":
            case "/api/mci/events":
            case "/api/mci/events/active":
            case "/api/signing-workflow/pending":
            case "/api/signing-workflow/submitted":
            case "/api/signing-workflow/history":
            case "/api/infectioncontrol/hai-cases/active":
            case "/api/infectioncontrol/isolation-orders":
            case "/api/infectioncontrol/hand-hygiene/observations":
            case "/api/rehabilitation/referrals":
            case "/api/rehabilitation/sessions/by-date":
                payload = Array.Empty<object>();
                return true;
            case "/api/examination/appointments":
            case "/api/telemedicine/appointments":
            case "/api/nutrition/screenings":
                payload = EmptyPagedResult(context, pageQueryKey: "page", pageSizeQueryKey: "pageSize", pageIndexDefault: 1);
                return true;
            case "/api/booking-management/bookings":
                payload = EmptyPageIndexResult(context);
                return true;
            case "/api/booking-management/stats":
                payload = new
                {
                    totalBookings = 0,
                    pending = 0,
                    confirmed = 0,
                    attended = 0,
                    noShow = 0,
                    cancelled = 0,
                    noShowRate = 0,
                    byDept = Array.Empty<object>()
                };
                return true;
            case "/api/sms/stats":
                payload = new
                {
                    totalSent = 0,
                    totalFailed = 0,
                    totalDevMode = 0,
                    successRate = 0,
                    byType = Array.Empty<object>(),
                    byDay = Array.Empty<object>()
                };
                return true;
            case "/api/culture-stock/statistics":
                payload = new
                {
                    totalStocks = 0,
                    activeCount = 0,
                    lowStockCount = 0,
                    expiredCount = 0,
                    depletedCount = 0,
                    expiringIn30Days = 0,
                    needViabilityCheck = 0,
                    topOrganisms = Array.Empty<object>()
                };
                return true;
            case "/api/pathology/statistics":
                payload = new
                {
                    totalRequests = 0,
                    pendingCount = 0,
                    completedCount = 0,
                    avgTurnaroundDays = 0,
                    specimenTypeBreakdown = Array.Empty<object>()
                };
                return true;
            case "/api/central-signing/admin/transactions":
                payload = new { items = Array.Empty<object>(), total = 0 };
                return true;
            case "/api/central-signing/admin/certificates":
                payload = Array.Empty<object>();
                return true;
            case "/api/central-signing/admin/appearance":
                payload = new
                {
                    position = "BottomRight",
                    page = 1,
                    x = 420,
                    y = 680,
                    width = 180,
                    height = 70,
                    fontFamily = "Times New Roman",
                    fontSize = 10,
                    fontColor = "#1f2937",
                    showSignerName = true,
                    showDate = true,
                    showCertSerial = true,
                    showCaLogo = false
                };
                return true;
            case "/api/central-signing/admin/statistics":
                payload = new
                {
                    totalTransactions = 0,
                    totalSuccess = 0,
                    totalFailed = 0,
                    activeCertificates = 0,
                    expiringSoon = 0,
                    expiredCertificates = 0,
                    activeUsers = 0,
                    todayTransactions = 0,
                    dailyTrend = Array.Empty<object>(),
                    byType = Array.Empty<object>(),
                    topUsers = Array.Empty<object>()
                };
                return true;
            case "/api/asset-management/assets":
                payload = EmptyPageIndexResult(context);
                return true;
            case "/api/medicalhr/staff":
                payload = EmptyPagedResult(context, pageQueryKey: "page", pageSizeQueryKey: "pageSize", pageIndexDefault: 1);
                return true;
            case "/api/medicalhr/certifications/expiring":
                payload = Array.Empty<object>();
                return true;
            case "/api/quality/incidents":
                payload = EmptyPagedResult(context, pageQueryKey: "page", pageSizeQueryKey: "pageSize", pageIndexDefault: 1);
                return true;
            case "/api/quality/surveys/statistics":
                payload = new
                {
                    fromDate = context.Request.Query["fromDate"].ToString(),
                    toDate = context.Request.Query["toDate"].ToString(),
                    departmentId = context.Request.Query["departmentId"].ToString(),
                    totalSurveys = 0,
                    completedSurveys = 0,
                    responseRate = 0,
                    averageSatisfaction = 0,
                    npsScore = 0,
                    promotersPct = 0,
                    passivesPct = 0,
                    detractorsPct = 0,
                    byDepartment = Array.Empty<object>(),
                    byCategory = Array.Empty<object>(),
                    byDoctor = Array.Empty<object>(),
                    trend = Array.Empty<object>(),
                    topComplaints = Array.Empty<object>()
                };
                return true;
            case "/api/bhxh-audit/sessions":
                payload = EmptyPageIndexResult(context);
                return true;
            case "/api/signing-workflow/stats":
                payload = new
                {
                    pendingCount = 0,
                    approvedCount = 0,
                    rejectedCount = 0,
                    cancelledCount = 0,
                    totalCount = 0,
                    todaySubmitted = 0,
                    todayApproved = 0
                };
                return true;
            case "/api/treatment-protocols/disease-groups":
                payload = Array.Empty<string>();
                return true;
            case "/api/treatment-protocols":
                payload = new
                {
                    items = Array.Empty<object>(),
                    totalCount = 0,
                    pageIndex = GetIntQuery(context, "pageIndex", 1),
                    pageSize = GetIntQuery(context, "pageSize", 20),
                    totalPages = 0
                };
                return true;
            case "/api/methadone/patients":
                payload = EmptyPageIndexResult(context);
                return true;
            case "/api/methadone/dashboard":
                payload = new
                {
                    activePatients = 0,
                    todayDoses = 0,
                    monthlyUrineTests = 0,
                    missedDoses = 0
                };
                return true;
            case "/api/nutrition/screenings/pending":
            case "/api/nutrition/screenings/high-risk":
                payload = Array.Empty<object>();
                return true;
            case "/api/occupational-health/statistics":
                payload = new
                {
                    totalExams = 0,
                    diseaseDetected = 0,
                    needsFollowUp = 0,
                    companies = 0
                };
                return true;
            case "/api/school-health/statistics":
                payload = new
                {
                    schoolsExamined = 0,
                    studentsExamined = 0,
                    completionRate = 0,
                    needsFollowUp = 0
                };
                return true;
            case "/api/epidemiology/outbreaks":
                payload = Array.Empty<object>();
                return true;
            case "/api/immunization":
                payload = new
                {
                    items = Array.Empty<object>(),
                    totalCount = 0
                };
                return true;
            case "/api/immunization/statistics":
                payload = new
                {
                    totalRecords = 0,
                    completedCount = 0,
                    scheduledCount = 0,
                    missedCount = 0,
                    aefiCount = 0
                };
                return true;
            case "/api/health-checkup/statistics":
                payload = new
                {
                    totalCheckups = 0,
                    todayCount = 0,
                    passCount = 0,
                    failCount = 0
                };
                return true;
        }

        if (path.StartsWith("/api/insurance/settlement/list/", StringComparison.Ordinal))
        {
            payload = Array.Empty<object>();
            return true;
        }

        if (path == "/api/insurance/claims/search")
        {
            payload = EmptyPagedResult(context, pageQueryKey: "pageIndex", pageSizeQueryKey: "pageSize", pageIndexDefault: 0);
            return true;
        }

        return false;
    }

    private static string NormalizePath(HttpContext context) =>
        context.Request.Path.Value?.TrimEnd('/').ToLowerInvariant() ?? string.Empty;

    private static object EmptyPagedResult(
        HttpContext context,
        string pageQueryKey,
        string pageSizeQueryKey,
        int pageIndexDefault)
    {
        var pageNumber = GetIntQuery(context, pageQueryKey, pageIndexDefault);
        var pageSize = GetIntQuery(context, pageSizeQueryKey, 20);

        return new
        {
            items = Array.Empty<object>(),
            totalCount = 0,
            pageNumber,
            pageSize,
            totalPages = 0
        };
    }

    private static object EmptyPageIndexResult(HttpContext context)
    {
        var pageIndex = GetIntQuery(context, "pageIndex", 0);
        var pageSize = GetIntQuery(context, "pageSize", 20);

        return new
        {
            items = Array.Empty<object>(),
            totalCount = 0,
            pageIndex,
            pageSize
        };
    }

    private static int GetIntQuery(HttpContext context, string key, int defaultValue)
    {
        var raw = context.Request.Query[key].ToString();
        return int.TryParse(raw, out var parsed) ? parsed : defaultValue;
    }

    private static bool IsSchemaDriftException(Exception exception)
    {
        for (var current = exception; current != null; current = current.InnerException!)
        {
            if (current is SqlException sqlException &&
                (sqlException.Number == 207 || sqlException.Number == 208))
            {
                return true;
            }
        }

        return false;
    }

    private static bool IsLinuxCryptoException(PathString path, Exception exception)
    {
        if (!path.StartsWithSegments("/api/digital-signature", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        for (var current = exception; current != null; current = current.InnerException!)
        {
            if (current is CryptographicException or PlatformNotSupportedException)
            {
                return true;
            }
        }

        return false;
    }
}
