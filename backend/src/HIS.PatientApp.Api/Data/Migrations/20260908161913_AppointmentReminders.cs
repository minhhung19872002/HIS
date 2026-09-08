using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HIS.PatientApp.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AppointmentReminders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "appointment_reminders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    AppointmentCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    AppointmentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DepartmentName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    DoctorName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    RoomName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    RemindedDayBeforeAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RemindedHourBeforeAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SyncedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_appointment_reminders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_appointment_reminders_app_accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "app_accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_appointment_reminders_AccountId_AppointmentCode",
                table: "appointment_reminders",
                columns: new[] { "AccountId", "AppointmentCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_appointment_reminders_AppointmentAt_Status",
                table: "appointment_reminders",
                columns: new[] { "AppointmentAt", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "appointment_reminders");
        }
    }
}
