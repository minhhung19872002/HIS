using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HIS.PatientApp.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AppQueueTickets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "app_queue_tickets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    HisTicketId = table.Column<Guid>(type: "uuid", nullable: false),
                    TicketCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    QueueNumber = table.Column<int>(type: "integer", nullable: false),
                    RoomId = table.Column<Guid>(type: "uuid", nullable: false),
                    RoomName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    QueueType = table.Column<int>(type: "integer", nullable: false),
                    QueueDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Priority = table.Column<int>(type: "integer", nullable: false),
                    PriorityVerified = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_app_queue_tickets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_app_queue_tickets_app_accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "app_accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_app_queue_tickets_AccountId_RoomId_QueueDate",
                table: "app_queue_tickets",
                columns: new[] { "AccountId", "RoomId", "QueueDate" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_app_queue_tickets_HisTicketId",
                table: "app_queue_tickets",
                column: "HisTicketId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "app_queue_tickets");
        }
    }
}
