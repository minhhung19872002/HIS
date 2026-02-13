using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HIS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixLISEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_LabRawResults_LabRequestItems_MappedLabRequestItemId",
                table: "LabRawResults");

            migrationBuilder.DropIndex(
                name: "IX_LabRawResults_MappedLabRequestItemId",
                table: "LabRawResults");

            migrationBuilder.DropColumn(
                name: "MappedLabRequestItemId",
                table: "LabRawResults");

            migrationBuilder.CreateIndex(
                name: "IX_LabRawResults_MappedToLabRequestItemId",
                table: "LabRawResults",
                column: "MappedToLabRequestItemId");

            migrationBuilder.AddForeignKey(
                name: "FK_LabRawResults_LabRequestItems_MappedToLabRequestItemId",
                table: "LabRawResults",
                column: "MappedToLabRequestItemId",
                principalTable: "LabRequestItems",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_LabRawResults_LabRequestItems_MappedToLabRequestItemId",
                table: "LabRawResults");

            migrationBuilder.DropIndex(
                name: "IX_LabRawResults_MappedToLabRequestItemId",
                table: "LabRawResults");

            migrationBuilder.AddColumn<Guid>(
                name: "MappedLabRequestItemId",
                table: "LabRawResults",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_LabRawResults_MappedLabRequestItemId",
                table: "LabRawResults",
                column: "MappedLabRequestItemId");

            migrationBuilder.AddForeignKey(
                name: "FK_LabRawResults_LabRequestItems_MappedLabRequestItemId",
                table: "LabRawResults",
                column: "MappedLabRequestItemId",
                principalTable: "LabRequestItems",
                principalColumn: "Id");
        }
    }
}
