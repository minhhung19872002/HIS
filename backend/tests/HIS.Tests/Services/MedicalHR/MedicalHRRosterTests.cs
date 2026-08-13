using HIS.Core.Entities;
using HIS.Infrastructure.Services;
using HIS.Tests.Fixtures;
using Xunit;

namespace HIS.Tests.Services.MedicalHR;

public class MedicalHRRosterTests
{
    [Fact]
    public async Task GetStaffRoster_ResolvesLoginUser_AndMapsOvernightShift()
    {
        await using var db = TestDb.NewInMemory();
        var userId = Guid.NewGuid();
        var staffId = Guid.NewGuid();
        var departmentId = Guid.NewGuid();
        var rosterId = Guid.NewGuid();

        db.Departments.Add(new Department
        {
            Id = departmentId,
            DepartmentCode = "KCC",
            DepartmentName = "Khoa Cấp cứu"
        });
        db.Users.Add(new User
        {
            Id = userId,
            Username = "doctor-test",
            FullName = "Bác sĩ kiểm thử"
        });
        db.MedicalStaffs.Add(new MedicalStaff
        {
            Id = staffId,
            UserId = userId,
            StaffCode = "BS001",
            FullName = "Bác sĩ kiểm thử",
            StaffType = "Doctor",
            PrimaryDepartmentId = departmentId
        });
        db.DutyRosters.Add(new DutyRoster
        {
            Id = rosterId,
            DepartmentId = departmentId,
            Year = 2026,
            Month = 8,
            Status = "Published"
        });
        db.DutyShifts.Add(new DutyShift
        {
            Id = Guid.NewGuid(),
            DutyRosterId = rosterId,
            StaffId = staffId,
            ShiftDate = new DateTime(2026, 8, 14),
            ShiftType = "Night",
            StartTime = new TimeSpan(20, 0, 0),
            EndTime = new TimeSpan(8, 0, 0),
            Status = "Confirmed"
        });
        await db.SaveChangesAsync();

        var rows = await new MedicalHRServiceImpl(db).GetStaffRosterAsync(userId, 2026, 8);

        var row = Assert.Single(rows);
        Assert.Equal("Ca đêm", row.ShiftName);
        Assert.Equal("20:00", row.ShiftStart);
        Assert.Equal("08:00", row.ShiftEnd);
        Assert.Equal("Khoa Cấp cứu", row.Location);
        Assert.True(row.IsOvertime);
        Assert.Equal(4m, row.OvertimeHours);
        Assert.Equal(2, row.Status);
    }

    [Fact]
    public async Task GetStaffRoster_ReturnsEmpty_WhenUserHasNoMedicalStaffProfile()
    {
        await using var db = TestDb.NewInMemory();

        var rows = await new MedicalHRServiceImpl(db)
            .GetStaffRosterAsync(Guid.NewGuid(), 2026, 8);

        Assert.Empty(rows);
    }
}
