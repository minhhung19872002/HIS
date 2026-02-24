using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HIS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRISCompleteTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RadiologyAbbreviations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Abbreviation = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FullText = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Category = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ServiceTypeId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsGlobal = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RadiologyAbbreviations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RadiologyAbbreviations_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "RadiologyCaptureDevices",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DeviceCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DeviceName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DeviceType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Manufacturer = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Model = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SerialNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RoomId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ConnectionType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IpAddress = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Port = table.Column<int>(type: "int", nullable: true),
                    ComPort = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    BaudRate = table.Column<int>(type: "int", nullable: true),
                    FolderPath = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AETitle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SupportsDicom = table.Column<bool>(type: "bit", nullable: false),
                    SupportsWorklist = table.Column<bool>(type: "bit", nullable: false),
                    SupportsMPPS = table.Column<bool>(type: "bit", nullable: false),
                    MaxExamsPerDay = table.Column<int>(type: "int", nullable: false),
                    AutoSelectThumbnail = table.Column<bool>(type: "bit", nullable: false),
                    SendOnlyThumbnail = table.Column<bool>(type: "bit", nullable: false),
                    DefaultFrameFormat = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    VideoFormat = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    LastCommunication = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ConfigJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RadiologyCaptureDevices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RadiologyCaptureDevices_Rooms_RoomId",
                        column: x => x.RoomId,
                        principalTable: "Rooms",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "RadiologyCDADocuments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DocumentId = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DocumentType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RadiologyReportId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CDAContent = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PdfPath = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsSigned = table.Column<bool>(type: "bit", nullable: false),
                    SignatureType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SignedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    SentAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    AckStatus = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Metadata = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RadiologyCDADocuments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RadiologyCDADocuments_RadiologyReports_RadiologyReportId",
                        column: x => x.RadiologyReportId,
                        principalTable: "RadiologyReports",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RadiologyCLSScreenConfigs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DefaultFilters = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ColumnSettings = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PageSize = table.Column<int>(type: "int", nullable: false),
                    AutoLoadTemplate = table.Column<bool>(type: "bit", nullable: false),
                    ShowPatientHistory = table.Column<bool>(type: "bit", nullable: false),
                    EnableShortcuts = table.Column<bool>(type: "bit", nullable: false),
                    CustomSettings = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RadiologyCLSScreenConfigs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RadiologyCLSScreenConfigs_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RadiologyConsultationSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SessionCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ScheduledStartTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ScheduledEndTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ActualStartTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ActualEndTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    OrganizerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LeaderId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SecretaryId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    MeetingUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    QRCodeData = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RecordingPath = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsRecording = table.Column<bool>(type: "bit", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RadiologyConsultationSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RadiologyConsultationSessions_Users_LeaderId",
                        column: x => x.LeaderId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_RadiologyConsultationSessions_Users_OrganizerId",
                        column: x => x.OrganizerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RadiologyConsultationSessions_Users_SecretaryId",
                        column: x => x.SecretaryId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "RadiologyDiagnosisTemplates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Conclusion = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Recommendation = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ServiceTypeId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ServiceId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Gender = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MinAge = table.Column<int>(type: "int", nullable: true),
                    MaxAge = table.Column<int>(type: "int", nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsDefault = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RadiologyDiagnosisTemplates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RadiologyDiagnosisTemplates_Services_ServiceId",
                        column: x => x.ServiceId,
                        principalTable: "Services",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_RadiologyDiagnosisTemplates_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "RadiologyDigitalSignatureConfigs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SignatureType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ProviderUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ApiKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ApiSecret = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CertificatePath = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CertificatePassword = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDefault = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    ConfigJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RadiologyDigitalSignatureConfigs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RadiologyDutySchedules",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RoomId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DutyDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ShiftType = table.Column<int>(type: "int", nullable: false),
                    StartTime = table.Column<TimeSpan>(type: "time", nullable: false),
                    EndTime = table.Column<TimeSpan>(type: "time", nullable: false),
                    DoctorId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TechnicianId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AssistantTechnicianId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    ApprovedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RadiologyDutySchedules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RadiologyDutySchedules_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RadiologyDutySchedules_Rooms_RoomId",
                        column: x => x.RoomId,
                        principalTable: "Rooms",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_RadiologyDutySchedules_Users_AssistantTechnicianId",
                        column: x => x.AssistantTechnicianId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_RadiologyDutySchedules_Users_DoctorId",
                        column: x => x.DoctorId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_RadiologyDutySchedules_Users_TechnicianId",
                        column: x => x.TechnicianId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "RadiologyHelpCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IconClass = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ParentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RadiologyHelpCategories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RadiologyHelpCategories_RadiologyHelpCategories_ParentId",
                        column: x => x.ParentId,
                        principalTable: "RadiologyHelpCategories",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "RadiologyHL7CDAConfigs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ConfigName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    HL7Version = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CDAVersion = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SendingApplication = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SendingFacility = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ReceivingApplication = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ReceivingFacility = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ConnectionType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ServerAddress = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ServerPort = table.Column<int>(type: "int", nullable: true),
                    FilePath = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    ConfigJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RadiologyHL7CDAConfigs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RadiologyHL7Messages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MessageControlId = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MessageType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TriggerEvent = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Direction = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RadiologyRequestId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PatientId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AccessionNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RawMessage = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ParsedData = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MessageDateTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    AckCode = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ErrorMessage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RetryCount = table.Column<int>(type: "int", nullable: false),
                    LastRetryAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RadiologyHL7Messages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RadiologyHL7Messages_RadiologyRequests_RadiologyRequestId",
                        column: x => x.RadiologyRequestId,
                        principalTable: "RadiologyRequests",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "RadiologyIntegrationLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LogCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Direction = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MessageType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RadiologyRequestId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PatientCode = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MedicalRecordCode = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RequestCode = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SentAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RequestPayload = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ResponsePayload = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    ErrorMessage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RetryCount = table.Column<int>(type: "int", nullable: false),
                    LastRetryAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SourceSystem = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TargetSystem = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TransactionId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RadiologyIntegrationLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RadiologyIntegrationLogs_RadiologyRequests_RadiologyRequestId",
                        column: x => x.RadiologyRequestId,
                        principalTable: "RadiologyRequests",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "RadiologyLabelConfigs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LabelWidth = table.Column<int>(type: "int", nullable: false),
                    LabelHeight = table.Column<int>(type: "int", nullable: false),
                    TemplateHtml = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TemplateZpl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IncludeQRCode = table.Column<bool>(type: "bit", nullable: false),
                    IncludeBarcode = table.Column<bool>(type: "bit", nullable: false),
                    BarcodeFormat = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ServiceTypeId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DepartmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsDefault = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RadiologyLabelConfigs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RadiologyRoomAssignments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RadiologyRequestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RoomId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ModalityId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    QueueNumber = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AssignedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CalledAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    StartedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RadiologyRoomAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RadiologyRoomAssignments_RadiologyModalities_ModalityId",
                        column: x => x.ModalityId,
                        principalTable: "RadiologyModalities",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_RadiologyRoomAssignments_RadiologyRequests_RadiologyRequestId",
                        column: x => x.RadiologyRequestId,
                        principalTable: "RadiologyRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RadiologyRoomAssignments_Rooms_RoomId",
                        column: x => x.RoomId,
                        principalTable: "Rooms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RadiologyRoomAssignments_Users_AssignedByUserId",
                        column: x => x.AssignedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "RadiologyServiceDescriptionTemplates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ServiceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Conclusion = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDefault = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RadiologyServiceDescriptionTemplates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RadiologyServiceDescriptionTemplates_Services_ServiceId",
                        column: x => x.ServiceId,
                        principalTable: "Services",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RadiologyServiceDescriptionTemplates_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "RadiologySignatureHistories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RadiologyReportId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SignedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SignatureType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SignedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CertificateSerial = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CertificateSubject = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CertificateIssuer = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CertificateValidFrom = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CertificateValidTo = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SignatureValue = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SignedDocumentPath = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    RejectReason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TransactionId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RadiologySignatureHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RadiologySignatureHistories_RadiologyReports_RadiologyReportId",
                        column: x => x.RadiologyReportId,
                        principalTable: "RadiologyReports",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RadiologySignatureHistories_Users_SignedByUserId",
                        column: x => x.SignedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RadiologyTags",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Color = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ParentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RadiologyTags", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RadiologyTags_RadiologyTags_ParentId",
                        column: x => x.ParentId,
                        principalTable: "RadiologyTags",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "RadiologyTroubleshootings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ErrorCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ErrorTitle = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ErrorDescription = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Symptoms = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Causes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Solution = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RelatedModule = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Severity = table.Column<int>(type: "int", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RadiologyTroubleshootings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RadiologyWorkstations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WorkstationCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    WorkstationName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ComputerName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IpAddress = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RoomId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DefaultDeviceId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    HotkeysConfig = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    BrightnessLevel = table.Column<int>(type: "int", nullable: true),
                    ContrastLevel = table.Column<int>(type: "int", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RadiologyWorkstations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RadiologyWorkstations_RadiologyCaptureDevices_DefaultDeviceId",
                        column: x => x.DefaultDeviceId,
                        principalTable: "RadiologyCaptureDevices",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_RadiologyWorkstations_Rooms_RoomId",
                        column: x => x.RoomId,
                        principalTable: "Rooms",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "RadiologyConsultationCases",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RadiologyRequestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderNumber = table.Column<int>(type: "int", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PreliminaryDiagnosis = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Conclusion = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Recommendation = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RadiologyConsultationCases", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RadiologyConsultationCases_RadiologyConsultationSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "RadiologyConsultationSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RadiologyConsultationCases_RadiologyRequests_RadiologyRequestId",
                        column: x => x.RadiologyRequestId,
                        principalTable: "RadiologyRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RadiologyConsultationImageNotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StudyInstanceUID = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SeriesInstanceUID = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SOPInstanceUID = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AnnotationType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AnnotationData = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsShared = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RadiologyConsultationImageNotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RadiologyConsultationImageNotes_RadiologyConsultationSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "RadiologyConsultationSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RadiologyConsultationImageNotes_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RadiologyConsultationMinutes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MinutesCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TemplateUsed = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Conclusions = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Recommendations = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    ApprovedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PdfPath = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RadiologyConsultationMinutes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RadiologyConsultationMinutes_RadiologyConsultationSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "RadiologyConsultationSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RadiologyConsultationMinutes_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "RadiologyConsultationParticipants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Role = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    InvitedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    JoinedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LeftAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsAudioEnabled = table.Column<bool>(type: "bit", nullable: false),
                    IsVideoEnabled = table.Column<bool>(type: "bit", nullable: false),
                    IsScreenSharing = table.Column<bool>(type: "bit", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RadiologyConsultationParticipants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RadiologyConsultationParticipants_RadiologyConsultationSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "RadiologyConsultationSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RadiologyConsultationParticipants_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RadiologyHelpArticles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CategoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Summary = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    VideoUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ArticleType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    ViewCount = table.Column<int>(type: "int", nullable: false),
                    IsPublished = table.Column<bool>(type: "bit", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PublishedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Tags = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RadiologyHelpArticles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RadiologyHelpArticles_RadiologyHelpCategories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "RadiologyHelpCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RadiologyHelpArticles_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "RadiologyRequestTags",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RadiologyRequestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TagId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AddedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RadiologyRequestTags", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RadiologyRequestTags_RadiologyRequests_RadiologyRequestId",
                        column: x => x.RadiologyRequestId,
                        principalTable: "RadiologyRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RadiologyRequestTags_RadiologyTags_TagId",
                        column: x => x.TagId,
                        principalTable: "RadiologyTags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RadiologyRequestTags_Users_AddedByUserId",
                        column: x => x.AddedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "RadiologyCaptureSession",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DeviceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WorkstationId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    RadiologyRequestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OperatorId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    StartTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CapturedImageCount = table.Column<int>(type: "int", nullable: false),
                    CapturedVideoCount = table.Column<int>(type: "int", nullable: false),
                    SessionData = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RadiologyCaptureSession", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RadiologyCaptureSession_RadiologyCaptureDevices_DeviceId",
                        column: x => x.DeviceId,
                        principalTable: "RadiologyCaptureDevices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RadiologyCaptureSession_RadiologyRequests_RadiologyRequestId",
                        column: x => x.RadiologyRequestId,
                        principalTable: "RadiologyRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RadiologyCaptureSession_RadiologyWorkstations_WorkstationId",
                        column: x => x.WorkstationId,
                        principalTable: "RadiologyWorkstations",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_RadiologyCaptureSession_Users_OperatorId",
                        column: x => x.OperatorId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "RadiologyConsultationAttachments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CaseId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    FileName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FilePath = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FileType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FileSize = table.Column<long>(type: "bigint", nullable: false),
                    UploadedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UploadedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RadiologyConsultationAttachments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RadiologyConsultationAttachments_RadiologyConsultationCases_CaseId",
                        column: x => x.CaseId,
                        principalTable: "RadiologyConsultationCases",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_RadiologyConsultationAttachments_RadiologyConsultationSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "RadiologyConsultationSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RadiologyConsultationAttachments_Users_UploadedByUserId",
                        column: x => x.UploadedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RadiologyConsultationDiscussions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CaseId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ParticipantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MessageType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AttachmentPath = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PostedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RadiologyConsultationDiscussions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RadiologyConsultationDiscussions_RadiologyConsultationCases_CaseId",
                        column: x => x.CaseId,
                        principalTable: "RadiologyConsultationCases",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_RadiologyConsultationDiscussions_RadiologyConsultationSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "RadiologyConsultationSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RadiologyConsultationDiscussions_Users_ParticipantId",
                        column: x => x.ParticipantId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RadiologyCapturedMedia",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MediaType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FileName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FilePath = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ThumbnailPath = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FileSize = table.Column<long>(type: "bigint", nullable: false),
                    MimeType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SequenceNumber = table.Column<int>(type: "int", nullable: false),
                    IsThumbnail = table.Column<bool>(type: "bit", nullable: false),
                    IsSentToPacs = table.Column<bool>(type: "bit", nullable: false),
                    SentToPacsAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DicomStudyUID = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DicomSeriesUID = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DicomInstanceUID = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Annotations = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RadiologyCapturedMedia", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RadiologyCapturedMedia_RadiologyCaptureSession_SessionId",
                        column: x => x.SessionId,
                        principalTable: "RadiologyCaptureSession",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyAbbreviations_CreatedByUserId",
                table: "RadiologyAbbreviations",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyCaptureDevices_RoomId",
                table: "RadiologyCaptureDevices",
                column: "RoomId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyCapturedMedia_SessionId",
                table: "RadiologyCapturedMedia",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyCaptureSession_DeviceId",
                table: "RadiologyCaptureSession",
                column: "DeviceId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyCaptureSession_OperatorId",
                table: "RadiologyCaptureSession",
                column: "OperatorId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyCaptureSession_RadiologyRequestId",
                table: "RadiologyCaptureSession",
                column: "RadiologyRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyCaptureSession_WorkstationId",
                table: "RadiologyCaptureSession",
                column: "WorkstationId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyCDADocuments_RadiologyReportId",
                table: "RadiologyCDADocuments",
                column: "RadiologyReportId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyCLSScreenConfigs_UserId",
                table: "RadiologyCLSScreenConfigs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyConsultationAttachments_CaseId",
                table: "RadiologyConsultationAttachments",
                column: "CaseId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyConsultationAttachments_SessionId",
                table: "RadiologyConsultationAttachments",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyConsultationAttachments_UploadedByUserId",
                table: "RadiologyConsultationAttachments",
                column: "UploadedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyConsultationCases_RadiologyRequestId",
                table: "RadiologyConsultationCases",
                column: "RadiologyRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyConsultationCases_SessionId",
                table: "RadiologyConsultationCases",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyConsultationDiscussions_CaseId",
                table: "RadiologyConsultationDiscussions",
                column: "CaseId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyConsultationDiscussions_ParticipantId",
                table: "RadiologyConsultationDiscussions",
                column: "ParticipantId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyConsultationDiscussions_SessionId",
                table: "RadiologyConsultationDiscussions",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyConsultationImageNotes_CreatedByUserId",
                table: "RadiologyConsultationImageNotes",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyConsultationImageNotes_SessionId",
                table: "RadiologyConsultationImageNotes",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyConsultationMinutes_CreatedByUserId",
                table: "RadiologyConsultationMinutes",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyConsultationMinutes_SessionId",
                table: "RadiologyConsultationMinutes",
                column: "SessionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyConsultationParticipants_SessionId",
                table: "RadiologyConsultationParticipants",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyConsultationParticipants_UserId",
                table: "RadiologyConsultationParticipants",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyConsultationSessions_LeaderId",
                table: "RadiologyConsultationSessions",
                column: "LeaderId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyConsultationSessions_OrganizerId",
                table: "RadiologyConsultationSessions",
                column: "OrganizerId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyConsultationSessions_SecretaryId",
                table: "RadiologyConsultationSessions",
                column: "SecretaryId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyDiagnosisTemplates_CreatedByUserId",
                table: "RadiologyDiagnosisTemplates",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyDiagnosisTemplates_ServiceId",
                table: "RadiologyDiagnosisTemplates",
                column: "ServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyDutySchedules_AssistantTechnicianId",
                table: "RadiologyDutySchedules",
                column: "AssistantTechnicianId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyDutySchedules_DepartmentId",
                table: "RadiologyDutySchedules",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyDutySchedules_DoctorId",
                table: "RadiologyDutySchedules",
                column: "DoctorId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyDutySchedules_RoomId",
                table: "RadiologyDutySchedules",
                column: "RoomId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyDutySchedules_TechnicianId",
                table: "RadiologyDutySchedules",
                column: "TechnicianId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyHelpArticles_CategoryId",
                table: "RadiologyHelpArticles",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyHelpArticles_CreatedByUserId",
                table: "RadiologyHelpArticles",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyHelpCategories_ParentId",
                table: "RadiologyHelpCategories",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyHL7Messages_RadiologyRequestId",
                table: "RadiologyHL7Messages",
                column: "RadiologyRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyIntegrationLogs_RadiologyRequestId",
                table: "RadiologyIntegrationLogs",
                column: "RadiologyRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyRequestTags_AddedByUserId",
                table: "RadiologyRequestTags",
                column: "AddedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyRequestTags_RadiologyRequestId",
                table: "RadiologyRequestTags",
                column: "RadiologyRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyRequestTags_TagId",
                table: "RadiologyRequestTags",
                column: "TagId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyRoomAssignments_AssignedByUserId",
                table: "RadiologyRoomAssignments",
                column: "AssignedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyRoomAssignments_ModalityId",
                table: "RadiologyRoomAssignments",
                column: "ModalityId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyRoomAssignments_RadiologyRequestId",
                table: "RadiologyRoomAssignments",
                column: "RadiologyRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyRoomAssignments_RoomId",
                table: "RadiologyRoomAssignments",
                column: "RoomId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyServiceDescriptionTemplates_CreatedByUserId",
                table: "RadiologyServiceDescriptionTemplates",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyServiceDescriptionTemplates_ServiceId",
                table: "RadiologyServiceDescriptionTemplates",
                column: "ServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologySignatureHistories_RadiologyReportId",
                table: "RadiologySignatureHistories",
                column: "RadiologyReportId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologySignatureHistories_SignedByUserId",
                table: "RadiologySignatureHistories",
                column: "SignedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyTags_ParentId",
                table: "RadiologyTags",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyWorkstations_DefaultDeviceId",
                table: "RadiologyWorkstations",
                column: "DefaultDeviceId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyWorkstations_RoomId",
                table: "RadiologyWorkstations",
                column: "RoomId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RadiologyAbbreviations");

            migrationBuilder.DropTable(
                name: "RadiologyCapturedMedia");

            migrationBuilder.DropTable(
                name: "RadiologyCDADocuments");

            migrationBuilder.DropTable(
                name: "RadiologyCLSScreenConfigs");

            migrationBuilder.DropTable(
                name: "RadiologyConsultationAttachments");

            migrationBuilder.DropTable(
                name: "RadiologyConsultationDiscussions");

            migrationBuilder.DropTable(
                name: "RadiologyConsultationImageNotes");

            migrationBuilder.DropTable(
                name: "RadiologyConsultationMinutes");

            migrationBuilder.DropTable(
                name: "RadiologyConsultationParticipants");

            migrationBuilder.DropTable(
                name: "RadiologyDiagnosisTemplates");

            migrationBuilder.DropTable(
                name: "RadiologyDigitalSignatureConfigs");

            migrationBuilder.DropTable(
                name: "RadiologyDutySchedules");

            migrationBuilder.DropTable(
                name: "RadiologyHelpArticles");

            migrationBuilder.DropTable(
                name: "RadiologyHL7CDAConfigs");

            migrationBuilder.DropTable(
                name: "RadiologyHL7Messages");

            migrationBuilder.DropTable(
                name: "RadiologyIntegrationLogs");

            migrationBuilder.DropTable(
                name: "RadiologyLabelConfigs");

            migrationBuilder.DropTable(
                name: "RadiologyRequestTags");

            migrationBuilder.DropTable(
                name: "RadiologyRoomAssignments");

            migrationBuilder.DropTable(
                name: "RadiologyServiceDescriptionTemplates");

            migrationBuilder.DropTable(
                name: "RadiologySignatureHistories");

            migrationBuilder.DropTable(
                name: "RadiologyTroubleshootings");

            migrationBuilder.DropTable(
                name: "RadiologyCaptureSession");

            migrationBuilder.DropTable(
                name: "RadiologyConsultationCases");

            migrationBuilder.DropTable(
                name: "RadiologyHelpCategories");

            migrationBuilder.DropTable(
                name: "RadiologyTags");

            migrationBuilder.DropTable(
                name: "RadiologyWorkstations");

            migrationBuilder.DropTable(
                name: "RadiologyConsultationSessions");

            migrationBuilder.DropTable(
                name: "RadiologyCaptureDevices");
        }
    }
}
