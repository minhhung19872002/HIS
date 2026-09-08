using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HIS.PatientApp.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class NotificationCampaigns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "notification_campaigns",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Body = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    Category = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    DeepLink = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    Audience = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    TargetAccountIdsJson = table.Column<string>(type: "text", nullable: true),
                    ScheduledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    RecipientCount = table.Column<int>(type: "integer", nullable: false),
                    SentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    FailureReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedByName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_notification_campaigns", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_app_notifications_CampaignId",
                table: "app_notifications",
                column: "CampaignId");

            migrationBuilder.CreateIndex(
                name: "IX_notification_campaigns_Status_ScheduledAt",
                table: "notification_campaigns",
                columns: new[] { "Status", "ScheduledAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "notification_campaigns");

            migrationBuilder.DropIndex(
                name: "IX_app_notifications_CampaignId",
                table: "app_notifications");
        }
    }
}
