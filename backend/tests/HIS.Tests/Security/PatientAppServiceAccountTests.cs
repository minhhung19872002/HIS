using System.Security.Claims;
using AutoMapper;
using HIS.API.Middleware;
using HIS.Application.Mappings;
using HIS.Application.Services;
using HIS.Core.Constants;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Services;
using HIS.Tests.Fixtures;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace HIS.Tests.Security;

/// <summary>
/// Tài khoản dịch vụ của BFF app người bệnh (role PATIENT_APP_SERVICE) thay cho `admin`.
///
/// <para>Hai mệnh đề phải cùng đúng: (1) nó gọi được ĐÚNG các route BFF cần và không gì khác — lộ mật
/// khẩu trên VM dùng chung thì không mở ra cả HIS; (2) nó không bao giờ bị buộc đổi mật khẩu vì quá
/// hạn — không có người ngồi đổi, tới hạn là app người bệnh chết im lặng.</para>
/// </summary>
public sealed class PatientAppServiceAccountTests
{
    private static async Task<int> InvokeAsync(string path, string role)
    {
        var nextCalled = false;
        var middleware = new ExternalActorScopeMiddleware(
            _ => { nextCalled = true; return Task.CompletedTask; },
            NullLogger<ExternalActorScopeMiddleware>.Instance);

        var context = new DefaultHttpContext();
        context.Request.Path = path;
        context.Response.Body = new MemoryStream();
        context.User = new ClaimsPrincipal(new ClaimsIdentity(
            new[] { new Claim(ClaimTypes.Role, role) }, authenticationType: "Bearer"));

        await middleware.InvokeAsync(context);
        return nextCalled ? StatusCodes.Status200OK : context.Response.StatusCode;
    }

    /// <summary>Đúng những route HIS.PatientApp.Api/Connector/HisRestConnector.cs gọi.</summary>
    [Theory]
    [InlineData("/api/portal/lab-results")]
    [InlineData("/api/portal/admissions/7b0c/medicine-disclosure")]
    [InlineData("/api/patients/by-code/BN001")]
    [InlineData("/api/patients/search")]
    [InlineData("/api/booking/book")]
    [InlineData("/api/booking/lookup")]
    [InlineData("/api/reception/rooms/overview")]
    [InlineData("/api/reception/queue/issue-mobile")]
    [InlineData("/api/reception/queue/ticket/7b0c/status")]
    [InlineData("/health")]
    public async Task Tai_khoan_dich_vu_goi_duoc_route_BFF_can(string path)
    {
        Assert.Equal(StatusCodes.Status200OK, await InvokeAsync(path, RoleNames.PatientAppService));
    }

    [Theory]
    [InlineData("/api/users")]
    [InlineData("/api/billing/receipts")]
    [InlineData("/api/reception/opd-flow-stats")]
    [InlineData("/api/reception/queue/call-next")]
    [InlineData("/api/inpatient/patients")]
    [InlineData("/api/portal-staff/anything")]
    public async Task Tai_khoan_dich_vu_bi_chan_o_moi_route_khac(string path)
    {
        Assert.Equal(StatusCodes.Status403Forbidden, await InvokeAsync(path, RoleNames.PatientAppService));
    }

    /// <summary>
    /// Rào route chưa đủ: cổng quyền ghi (<c>WritePermissionConvention</c>) còn gate mọi POST/PUT theo
    /// permission. Ban đầu role dịch vụ để 0 quyền và bài test rào route vẫn xanh — trong khi tra cứu bệnh
    /// nhân theo SĐT ở màn nhân viên của app trả 503 vì <c>POST /api/patients/search</c> đòi Patient.Read.
    /// Bài này tính quyền đúng như convention cho từng route ghi mà HisRestConnector gọi.
    /// </summary>
    [Theory]
    [InlineData(typeof(HIS.API.Controllers.PatientsController), "Search")]
    [InlineData(typeof(HIS.API.Controllers.PatientsController), "LookupMergeSuccessors")]
    [InlineData(typeof(HIS.API.Controllers.ReceptionCompleteController), "IssueQueueTicketMobile")]
    [InlineData(typeof(HIS.API.Controllers.AppointmentBookingController), "BookAppointment")]
    [InlineData(typeof(HIS.API.Controllers.AppointmentBookingController), "CancelAppointment")]
    [InlineData(typeof(HIS.API.Controllers.AppointmentBookingController), "Reschedule")]
    public void Route_ghi_BFF_goi_khong_bi_cong_quyen_chan(Type controller, string action)
    {
        var method = controller.GetMethod(action)!;
        bool Anonymous(System.Reflection.MemberInfo m) =>
            m.GetCustomAttributes(true).OfType<Microsoft.AspNetCore.Authorization.IAllowAnonymous>().Any();
        bool ExplicitGate(System.Reflection.MemberInfo m) =>
            m.GetCustomAttributes(true).OfType<Microsoft.AspNetCore.Authorization.AuthorizeAttribute>()
                .Any(a => !string.IsNullOrWhiteSpace(a.Roles) || !string.IsNullOrWhiteSpace(a.Policy));

        if (Anonymous(controller) || Anonymous(method) || ExplicitGate(controller) || ExplicitGate(method))
            return;   // convention không gắn permission cho các action này

        var required = HIS.API.Authorization.WritePermissionMap.Resolve(
            controller.Name[..^"Controller".Length], action);
        if (required is null) return;

        var granted = HIS.Infrastructure.Data.PermissionCatalogSeeder.ServiceRoleMatrix[RoleNames.PatientAppServiceCode];
        Assert.Contains(required, granted);
    }

    [Fact]
    public async Task Nhan_vien_khong_bi_anh_huong()
    {
        Assert.Equal(StatusCodes.Status200OK, await InvokeAsync("/api/users", RoleNames.Admin));
    }

    [Fact]
    public async Task Tai_khoan_dich_vu_khong_bi_buoc_doi_mat_khau_khi_qua_han()
    {
        using var context = TestDb.NewInMemory();
        var serviceRole = new Role { Id = Guid.NewGuid(), RoleCode = RoleNames.PatientAppServiceCode, RoleName = "Dịch vụ" };
        var staffRole = new Role { Id = Guid.NewGuid(), RoleCode = "RECEPTIONIST", RoleName = "Lễ tân" };
        context.Roles.AddRange(serviceRole, staffRole);

        User NewUser(string name, Role role)
        {
            var user = new User
            {
                Id = Guid.NewGuid(), Username = name, FullName = name, PasswordHash = "x", IsActive = true,
                PasswordChangedAt = DateTime.UtcNow.AddDays(-400),   // quá hạn 90 ngày từ lâu
            };
            user.UserRoles.Add(new UserRole { Id = Guid.NewGuid(), UserId = user.Id, RoleId = role.Id });
            context.Users.Add(user);
            return user;
        }

        var service = NewUser("svc-patientapp", serviceRole);
        var staff = NewUser("letan01", staffRole);
        await context.SaveChangesAsync();

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Auth:PasswordMaxAgeDays"] = "90" })
            .Build();
        var mapper = new MapperConfiguration(cfg => cfg.AddProfile<MappingProfile>()).CreateMapper();
        var auth = new AuthService(context, config, mapper, new Mock<IEmailService>().Object,
            NullLogger<AuthService>.Instance, new Mock<IRefreshTokenService>().Object,
            new Mock<IRealtimeNotifier>().Object);

        Assert.False((await auth.GetCurrentUserAsync(service.Id))!.MustChangePassword);
        // Luật hạn mật khẩu của nhân viên giữ nguyên.
        Assert.True((await auth.GetCurrentUserAsync(staff.Id))!.MustChangePassword);
    }
}
