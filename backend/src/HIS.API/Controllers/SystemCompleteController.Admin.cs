using System;
using HIS.Core.Constants;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs.System;
using HIS.Application.Services;

namespace HIS.API.Controllers
{
    public partial class SystemCompleteController
    {
        // 17.1 Quản lý người dùng
        [HttpGet("api/admin/users")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<List<SystemUserDto>>> GetUsers(
            [FromQuery] string keyword = null,
            [FromQuery] Guid? departmentId = null,
            [FromQuery] bool? isActive = null)
        {
            var result = await _service.GetUsersAsync(keyword, departmentId, isActive);
            return Ok(result);
        }

        [HttpGet("api/admin/users/{userId}")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<SystemUserDto>> GetUser(Guid userId)
        {
            var result = await _service.GetUserAsync(userId);
            return Ok(result);
        }

        [HttpPost("api/admin/users")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<SystemUserDto>> CreateUser([FromBody] CreateUserDto dto)
        {
            // [ApiController] tự validate DataAnnotations (Required/Email/MinLength) -> 400 field-level.
            // Quy tắc nghiệp vụ (trùng username) -> 400 rõ field để client focus.
            var result = await _service.CreateUserAsync(dto);
            if (result == null)
                return BadRequest(new { error = "VALIDATION_FAILED", field = "username", message = "Tài khoản đã tồn tại" });
            return Ok(result);
        }

        [HttpPut("api/admin/users/{userId}")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<SystemUserDto>> UpdateUser(Guid userId, [FromBody] UpdateUserDto dto)
        {
            var result = await _service.UpdateUserAsync(userId, dto);
            return Ok(result);
        }

        [HttpDelete("api/admin/users/{userId}")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<bool>> DeleteUser(Guid userId)
        {
            var result = await _service.DeleteUserAsync(userId);
            return Ok(result);
        }

        [HttpPost("api/admin/users/{userId}/reset-password")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<bool>> ResetPassword(Guid userId)
        {
            var result = await _service.ResetPasswordAsync(userId);
            return Ok(result);
        }

        [HttpPost("api/admin/users/{userId}/change-password")]
        [Authorize]
        public async Task<ActionResult<bool>> ChangePassword(Guid userId, [FromBody] AdminChangePasswordDto dto)
        {
            var result = await _service.ChangePasswordAsync(userId, dto);
            return Ok(result);
        }

        [HttpPost("api/admin/users/{userId}/lock")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<bool>> LockUser(Guid userId, [FromBody] string reason)
        {
            var result = await _service.LockUserAsync(userId, reason);
            return Ok(result);
        }

        [HttpPost("api/admin/users/{userId}/unlock")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<bool>> UnlockUser(Guid userId)
        {
            var result = await _service.UnlockUserAsync(userId);
            return Ok(result);
        }

        // 17.2 Quản lý vai trò
        [HttpGet("api/admin/roles")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<List<RoleDto>>> GetRoles([FromQuery] bool? isActive = null)
        {
            var result = await _service.GetRolesAsync(isActive);
            return Ok(result);
        }

        [HttpGet("api/admin/roles/{roleId}")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<RoleDto>> GetRole(Guid roleId)
        {
            var result = await _service.GetRoleAsync(roleId);
            return Ok(result);
        }

        [HttpPost("api/admin/roles")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<RoleDto>> SaveRole([FromBody] RoleDto dto)
        {
            var result = await _service.SaveRoleAsync(dto);
            return Ok(result);
        }

        [HttpDelete("api/admin/roles/{roleId}")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<bool>> DeleteRole(Guid roleId)
        {
            var result = await _service.DeleteRoleAsync(roleId);
            return Ok(result);
        }

        // 17.3 Quản lý quyền
        [HttpGet("api/admin/permissions")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<List<PermissionDto>>> GetPermissions([FromQuery] string module = null)
        {
            var result = await _service.GetPermissionsAsync(module);
            return Ok(result);
        }

        [HttpGet("api/admin/roles/{roleId}/permissions")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<List<PermissionDto>>> GetRolePermissions(Guid roleId)
        {
            var result = await _service.GetRolePermissionsAsync(roleId);
            return Ok(result);
        }

        [HttpPut("api/admin/roles/{roleId}/permissions")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<bool>> UpdateRolePermissions(Guid roleId, [FromBody] List<Guid> permissionIds)
        {
            var result = await _service.UpdateRolePermissionsAsync(roleId, permissionIds);
            return Ok(result);
        }

        [HttpGet("api/admin/users/{userId}/permissions")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<List<PermissionDto>>> GetUserPermissions(Guid userId)
        {
            var result = await _service.GetUserPermissionsAsync(userId);
            return Ok(result);
        }

        [HttpPut("api/admin/users/{userId}/permissions")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<bool>> UpdateUserPermissions(Guid userId, [FromBody] List<Guid> permissionIds)
        {
            var result = await _service.UpdateUserPermissionsAsync(userId, permissionIds);
            return Ok(result);
        }

        // 17.4 Nhật ký hệ thống
        [HttpGet("api/admin/audit-logs")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<List<AuditLogDto>>> GetAuditLogs([FromQuery] AuditLogSearchDto search)
        {
            var result = await _service.GetAuditLogsAsync(search);
            return Ok(result);
        }

        [HttpGet("api/admin/audit-logs/{logId}")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<AuditLogDto>> GetAuditLog(Guid logId)
        {
            var result = await _service.GetAuditLogAsync(logId);
            return Ok(result);
        }

        [HttpPost("api/admin/audit-logs/export")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<IActionResult> ExportAuditLogs([FromBody] AuditLogSearchDto search)
        {
            var result = await _service.ExportAuditLogsToExcelAsync(search);
            return File(result, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "AuditLogs.xlsx");
        }

        // 17.5 Cấu hình hệ thống
        [HttpGet("api/admin/configs")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<List<SystemConfigDto>>> GetSystemConfigs([FromQuery] string category = null)
        {
            var result = await _service.GetSystemConfigsAsync(category);
            return Ok(result);
        }

        [HttpGet("api/admin/configs/{configKey}")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<SystemConfigDto>> GetSystemConfig(string configKey)
        {
            var result = await _service.GetSystemConfigAsync(configKey);
            return Ok(result);
        }

        [HttpPost("api/admin/configs")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<SystemConfigDto>> SaveSystemConfig([FromBody] SystemConfigDto dto)
        {
            var result = await _service.SaveSystemConfigAsync(dto);
            return Ok(result);
        }

        [HttpDelete("api/admin/configs/{configKey}")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<bool>> DeleteSystemConfig(string configKey)
        {
            var result = await _service.DeleteSystemConfigAsync(configKey);
            return Ok(result);
        }

        // 17.6 Quản lý phiên đăng nhập
        [HttpGet("api/admin/sessions")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<List<UserSessionDto>>> GetActiveSessions([FromQuery] Guid? userId = null)
        {
            var result = await _service.GetActiveSessionsAsync(userId);
            return Ok(result);
        }

        [HttpDelete("api/admin/sessions/{sessionId}")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<bool>> TerminateSession(Guid sessionId)
        {
            var result = await _service.TerminateSessionAsync(sessionId);
            return Ok(result);
        }

        [HttpDelete("api/admin/users/{userId}/sessions")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<bool>> TerminateAllSessions(Guid userId)
        {
            var result = await _service.TerminateAllSessionsAsync(userId);
            return Ok(result);
        }

        // 17.7 Quản lý thông báo hệ thống
        [HttpGet("api/admin/notifications")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<List<SystemNotificationDto>>> GetSystemNotifications([FromQuery] bool? isActive = null)
        {
            var result = await _service.GetSystemNotificationsAsync(isActive);
            return Ok(result);
        }

        [HttpGet("api/admin/notifications/{notificationId}")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<SystemNotificationDto>> GetSystemNotification(Guid notificationId)
        {
            var result = await _service.GetSystemNotificationAsync(notificationId);
            return Ok(result);
        }

        [HttpPost("api/admin/notifications")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<SystemNotificationDto>> SaveSystemNotification([FromBody] SystemNotificationDto dto)
        {
            var result = await _service.SaveSystemNotificationAsync(dto);
            return Ok(result);
        }

        [HttpDelete("api/admin/notifications/{notificationId}")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<bool>> DeleteSystemNotification(Guid notificationId)
        {
            var result = await _service.DeleteSystemNotificationAsync(notificationId);
            return Ok(result);
        }

        // 17.8 Sao lưu dữ liệu
        [HttpGet("api/admin/backups")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<List<BackupHistoryDto>>> GetBackupHistory(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null)
        {
            var result = await _service.GetBackupHistoryAsync(fromDate, toDate);
            return Ok(result);
        }

        [HttpPost("api/admin/backups")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<BackupHistoryDto>> CreateBackup([FromBody] CreateBackupDto dto)
        {
            var result = await _service.CreateBackupAsync(dto);
            return Ok(result);
        }

        [HttpPost("api/admin/backups/{backupId}/restore")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<bool>> RestoreBackup(Guid backupId)
        {
            var result = await _service.RestoreBackupAsync(backupId);
            return Ok(result);
        }

        [HttpDelete("api/admin/backups/{backupId}")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<bool>> DeleteBackup(Guid backupId)
        {
            var result = await _service.DeleteBackupAsync(backupId);
            return Ok(result);
        }

        // 17.9 Giám sát hệ thống
        [HttpGet("api/admin/health")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<SystemHealthDto>> GetSystemHealth()
        {
            var result = await _service.GetSystemHealthAsync();
            return Ok(result);
        }

        [HttpGet("api/admin/resources")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<List<SystemResourceDto>>> GetSystemResources()
        {
            var result = await _service.GetSystemResourcesAsync();
            return Ok(result);
        }

        [HttpGet("api/admin/database-statistics")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<List<DatabaseStatisticsDto>>> GetDatabaseStatistics()
        {
            var result = await _service.GetDatabaseStatisticsAsync();
            return Ok(result);
        }

        // 17.10 Quản lý tích hợp
        [HttpGet("api/admin/integrations")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<List<IntegrationConfigDto>>> GetIntegrationConfigs([FromQuery] bool? isActive = null)
        {
            var result = await _service.GetIntegrationConfigsAsync(isActive);
            return Ok(result);
        }

        [HttpGet("api/admin/integrations/{integrationId}")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<IntegrationConfigDto>> GetIntegrationConfig(Guid integrationId)
        {
            var result = await _service.GetIntegrationConfigAsync(integrationId);
            return Ok(result);
        }

        [HttpPost("api/admin/integrations")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<IntegrationConfigDto>> SaveIntegrationConfig([FromBody] IntegrationConfigDto dto)
        {
            var result = await _service.SaveIntegrationConfigAsync(dto);
            return Ok(result);
        }

        [HttpPost("api/admin/integrations/{integrationId}/test")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<bool>> TestIntegrationConnection(Guid integrationId)
        {
            var result = await _service.TestIntegrationConnectionAsync(integrationId);
            return Ok(result);
        }

        [HttpGet("api/admin/integrations/{integrationId}/logs")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<List<IntegrationLogDto>>> GetIntegrationLogs(
            Guid integrationId,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null)
        {
            var result = await _service.GetIntegrationLogsAsync(integrationId, fromDate, toDate);
            return Ok(result);
        }

        // 13.20 Nghề nghiệp (Occupation)
        [HttpGet("api/catalog/occupations")]
        public async Task<ActionResult<List<OccupationCatalogDto>>> GetOccupations(
            [FromQuery] string? keyword = null, [FromQuery] bool? isActive = null)
        {
            var result = await _service.GetOccupationsAsync(keyword, isActive);
            return Ok(result);
        }

        [HttpPost("api/catalog/occupations")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.CatalogManager)]
        public async Task<ActionResult<OccupationCatalogDto>> SaveOccupation([FromBody] OccupationCatalogDto dto)
        {
            var result = await _service.SaveOccupationAsync(dto);
            return Ok(result);
        }

        [HttpDelete("api/catalog/occupations/{occupationId}")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<bool>> DeleteOccupation(Guid occupationId)
        {
            var result = await _service.DeleteOccupationAsync(occupationId);
            return Ok(result);
        }

        // 13.21 Giới tính (Gender)
        [HttpGet("api/catalog/genders")]
        public async Task<ActionResult<List<GenderCatalogDto>>> GetGenders(
            [FromQuery] string? keyword = null, [FromQuery] bool? isActive = null)
        {
            var result = await _service.GetGendersAsync(keyword, isActive);
            return Ok(result);
        }

        [HttpPost("api/catalog/genders")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.CatalogManager)]
        public async Task<ActionResult<GenderCatalogDto>> SaveGender([FromBody] GenderCatalogDto dto)
        {
            var result = await _service.SaveGenderAsync(dto);
            return Ok(result);
        }

        [HttpDelete("api/catalog/genders/{genderId}")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<bool>> DeleteGender(Guid genderId)
        {
            var result = await _service.DeleteGenderAsync(genderId);
            return Ok(result);
        }

        // 13.22 Đơn vị hành chính (Administrative Division)
        [HttpGet("api/catalog/administrative-divisions")]
        public async Task<ActionResult<List<AdministrativeDivisionCatalogDto>>> GetAdministrativeDivisions(
            [FromQuery] string? keyword = null, [FromQuery] int? level = null,
            [FromQuery] string? parentCode = null, [FromQuery] bool? isActive = null)
        {
            var result = await _service.GetAdministrativeDivisionsAsync(keyword, level, parentCode, isActive);
            return Ok(result);
        }

        [HttpPost("api/catalog/administrative-divisions")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.CatalogManager)]
        public async Task<ActionResult<AdministrativeDivisionCatalogDto>> SaveAdministrativeDivision([FromBody] AdministrativeDivisionCatalogDto dto)
        {
            var result = await _service.SaveAdministrativeDivisionAsync(dto);
            return Ok(result);
        }

        [HttpDelete("api/catalog/administrative-divisions/{divisionId}")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<bool>> DeleteAdministrativeDivision(Guid divisionId)
        {
            var result = await _service.DeleteAdministrativeDivisionAsync(divisionId);
            return Ok(result);
        }

        // 13.23 Quốc gia (Country)
        [HttpGet("api/catalog/countries")]
        public async Task<ActionResult<List<CountryCatalogDto>>> GetCountries(
            [FromQuery] string? keyword = null, [FromQuery] bool? isActive = null)
        {
            var result = await _service.GetCountriesAsync(keyword, isActive);
            return Ok(result);
        }

        [HttpPost("api/catalog/countries")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.CatalogManager)]
        public async Task<ActionResult<CountryCatalogDto>> SaveCountry([FromBody] CountryCatalogDto dto)
        {
            var result = await _service.SaveCountryAsync(dto);
            return Ok(result);
        }

        [HttpDelete("api/catalog/countries/{countryId}")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<bool>> DeleteCountry(Guid countryId)
        {
            var result = await _service.DeleteCountryAsync(countryId);
            return Ok(result);
        }

        // 13.24 Cơ sở KCB (Healthcare Facility)
        [HttpGet("api/catalog/healthcare-facilities")]
        public async Task<ActionResult<List<HealthcareFacilityCatalogDto>>> GetHealthcareFacilities(
            [FromQuery] string? keyword = null, [FromQuery] string? level = null,
            [FromQuery] string? provinceCode = null, [FromQuery] bool? isActive = null)
        {
            var result = await _service.GetHealthcareFacilitiesAsync(keyword, level, provinceCode, isActive);
            return Ok(result);
        }

        [HttpPost("api/catalog/healthcare-facilities")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.CatalogManager)]
        public async Task<ActionResult<HealthcareFacilityCatalogDto>> SaveHealthcareFacility([FromBody] HealthcareFacilityCatalogDto dto)
        {
            var result = await _service.SaveHealthcareFacilityAsync(dto);
            return Ok(result);
        }

        [HttpDelete("api/catalog/healthcare-facilities/{facilityId}")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<bool>> DeleteHealthcareFacility(Guid facilityId)
        {
            var result = await _service.DeleteHealthcareFacilityAsync(facilityId);
            return Ok(result);
        }

        /// <summary>
        /// Danh sách dịch vụ bị khóa
        /// </summary>
        [HttpGet("api/admin/locked-services")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<List<LockedServiceDto>>> GetLockedServices()
        {
            var result = await _service.GetLockedServicesAsync();
            return Ok(result);
        }

        /// <summary>
        /// Khóa dịch vụ
        /// </summary>
        [HttpPost("api/admin/lock-service")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<LockedServiceDto>> LockService([FromBody] LockServiceRequestDto dto)
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "";
                var userName = User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value ?? User.Identity?.Name ?? "";
                var result = await _service.LockServiceAsync(dto, userId, userName);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Mở khóa dịch vụ
        /// </summary>
        [HttpPost("api/admin/unlock-service")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<bool>> UnlockService([FromBody] UnlockServiceRequestDto dto)
        {
            var result = await _service.UnlockServiceAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Danh sách yêu cầu CNTT
        /// </summary>
        [HttpGet("api/system/it-tickets")]
        public async Task<ActionResult<List<ItTicketDto>>> GetItTickets([FromQuery] ItTicketSearchDto search)
        {
            var result = await _service.GetItTicketsAsync(search);
            return Ok(result);
        }

        /// <summary>
        /// Tạo yêu cầu CNTT mới
        /// </summary>
        [HttpPost("api/system/it-tickets")]
        public async Task<ActionResult<ItTicketDto>> CreateItTicket([FromBody] CreateItTicketDto dto)
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "";
            var userName = User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value ?? User.Identity?.Name ?? "";
            var departmentName = User.FindFirst("DepartmentName")?.Value ?? "";
            var result = await _service.CreateItTicketAsync(dto, userId, userName, departmentName);
            return Ok(result);
        }

        /// <summary>
        /// IT phản hồi yêu cầu
        /// </summary>
        [HttpPut("api/system/it-tickets/{id}/respond")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.IT)]
        public async Task<ActionResult<ItTicketDto>> RespondToItTicket(Guid id, [FromBody] RespondItTicketDto dto)
        {
            var userName = User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value ?? User.Identity?.Name ?? "";
            var result = await _service.RespondToItTicketAsync(id, dto, userName);
            return Ok(result);
        }

        /// <summary>
        /// Đóng yêu cầu CNTT
        /// </summary>
        [HttpPut("api/system/it-tickets/{id}/close")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.IT)]
        public async Task<ActionResult<bool>> CloseItTicket(Guid id)
        {
            var result = await _service.CloseItTicketAsync(id);
            return Ok(result);
        }

        /// <summary>
        /// Thống kê yêu cầu CNTT
        /// </summary>
        [HttpGet("api/system/it-tickets/stats")]
        public async Task<ActionResult<ItTicketStatsDto>> GetItTicketStats()
        {
            var result = await _service.GetItTicketStatsAsync();
            return Ok(result);
        }
    }
}
