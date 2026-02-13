using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HIS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddLISEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AntibioticStewardships",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AdmissionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PrescriptionDetailId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AntibioticName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DayOfTherapy = table.Column<int>(type: "int", nullable: false),
                    RequiresReview = table.Column<bool>(type: "bit", nullable: false),
                    ReviewReason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ReviewDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReviewedById = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReviewOutcome = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ReviewNotes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AntibioticStewardships", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AntibioticStewardships_Admissions_AdmissionId",
                        column: x => x.AdmissionId,
                        principalTable: "Admissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AntibioticStewardships_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AntibioticStewardships_Users_ReviewedById",
                        column: x => x.ReviewedById,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "AuditPlans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AuditCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AuditName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AuditType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Standard = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Year = table.Column<int>(type: "int", nullable: false),
                    PlannedStartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PlannedEndDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ActualStartDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ActualEndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LeadAuditorId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AuditTeam = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ScopeDescription = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DepartmentsAudited = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TotalFindings = table.Column<int>(type: "int", nullable: true),
                    MajorNonconformities = table.Column<int>(type: "int", nullable: true),
                    MinorNonconformities = table.Column<int>(type: "int", nullable: true),
                    Observations = table.Column<int>(type: "int", nullable: true),
                    SummaryReport = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditPlans", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AuditPlans_Users_LeadAuditorId",
                        column: x => x.LeadAuditorId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DietTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    NameEnglish = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Category = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    BaseCalories = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    MacroDistribution = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Restrictions = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DietTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DutyRosters",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Year = table.Column<int>(type: "int", nullable: false),
                    Month = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedById = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PublishedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DutyRosters", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DutyRosters_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DutyRosters_Users_CreatedById",
                        column: x => x.CreatedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ElectronicReferrals",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReferralCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ExaminationId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AdmissionId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    FromFacilityCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FromFacilityName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ReferredById = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ToFacilityCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ToFacilityName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ToDepartment = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Diagnosis = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IcdCodes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ReferralReason = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ClinicalSummary = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TreatmentGiven = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AttachedDocuments = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SentAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReceivedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ResponseAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ResponseMessage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ElectronicReferrals", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ElectronicReferrals_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ElectronicReferrals_Users_ReferredById",
                        column: x => x.ReferredById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "HandHygieneObservations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ObservationDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ObservedById = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TotalOpportunities = table.Column<int>(type: "int", nullable: false),
                    ComplianceCount = table.Column<int>(type: "int", nullable: false),
                    ComplianceRate = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    BeforePatientContact = table.Column<int>(type: "int", nullable: true),
                    BeforeAseptic = table.Column<int>(type: "int", nullable: true),
                    AfterBodyFluid = table.Column<int>(type: "int", nullable: true),
                    AfterPatientContact = table.Column<int>(type: "int", nullable: true),
                    AfterEnvironment = table.Column<int>(type: "int", nullable: true),
                    DoctorOpportunities = table.Column<int>(type: "int", nullable: true),
                    DoctorCompliance = table.Column<int>(type: "int", nullable: true),
                    NurseOpportunities = table.Column<int>(type: "int", nullable: true),
                    NurseCompliance = table.Column<int>(type: "int", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HandHygieneObservations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HandHygieneObservations_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_HandHygieneObservations_Users_ObservedById",
                        column: x => x.ObservedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "HIEConnections",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ConnectionName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ConnectionType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EndpointUrl = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AuthType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ClientId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ClientSecretEncrypted = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CertificatePath = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastSuccessfulConnection = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastFailedConnection = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastErrorMessage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HIEConnections", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "IncidentReports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReportCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IncidentDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReportDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReportedById = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IncidentType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Severity = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    HarmLevel = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ImmediateActions = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ContributingFactors = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    InvestigatorId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    InvestigationStartDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    InvestigationEndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RootCause = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RCAMethod = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsAnonymous = table.Column<bool>(type: "bit", nullable: false),
                    ReportedToAuthority = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IncidentReports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_IncidentReports_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_IncidentReports_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_IncidentReports_Users_InvestigatorId",
                        column: x => x.InvestigatorId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_IncidentReports_Users_ReportedById",
                        column: x => x.ReportedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "InsuranceXMLSubmissions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SubmissionCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    XMLType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PeriodFrom = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PeriodTo = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TotalRecords = table.Column<int>(type: "int", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    GeneratedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    SubmittedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ResponseAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    FilePath = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Checksum = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SubmittedById = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PortalTransactionId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PortalResponse = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AcceptedRecords = table.Column<int>(type: "int", nullable: true),
                    RejectedRecords = table.Column<int>(type: "int", nullable: true),
                    RejectionReasons = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InsuranceXMLSubmissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InsuranceXMLSubmissions_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_InsuranceXMLSubmissions_Users_SubmittedById",
                        column: x => x.SubmittedById,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "LabAnalyzers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Manufacturer = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Model = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SerialNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DepartmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ConnectionType = table.Column<int>(type: "int", nullable: false),
                    Protocol = table.Column<int>(type: "int", nullable: false),
                    ConnectionMethod = table.Column<int>(type: "int", nullable: false),
                    ComPort = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    BaudRate = table.Column<int>(type: "int", nullable: true),
                    DataBits = table.Column<int>(type: "int", nullable: true),
                    Parity = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    StopBits = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IpAddress = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Port = table.Column<int>(type: "int", nullable: true),
                    InputFilePath = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    OutputFilePath = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    LastConnectedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastDataReceivedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LabAnalyzers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LabAnalyzers_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "LabConclusionTemplates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ServiceId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TestCode = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TemplateCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TemplateName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ConclusionText = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Condition = table.Column<string>(type: "nvarchar(max)", nullable: true),
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
                    table.PrimaryKey("PK_LabConclusionTemplates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LabConclusionTemplates_Services_ServiceId",
                        column: x => x.ServiceId,
                        principalTable: "Services",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "LabCriticalValueAlerts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LabResultId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TestCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TestName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Result = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NumericResult = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    Unit = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CriticalLow = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    CriticalHigh = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    AlertType = table.Column<int>(type: "int", nullable: false),
                    AlertTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    IsAcknowledged = table.Column<bool>(type: "bit", nullable: false),
                    AcknowledgedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    AcknowledgedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    NotifiedPerson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NotificationMethod = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NotificationTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AcknowledgedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LabCriticalValueAlerts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LabCriticalValueAlerts_LabResults_LabResultId",
                        column: x => x.LabResultId,
                        principalTable: "LabResults",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LabCriticalValueAlerts_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LabCriticalValueAlerts_Users_AcknowledgedByUserId",
                        column: x => x.AcknowledgedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "LabCriticalValueConfigs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ServiceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TestCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Gender = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AgeFromDays = table.Column<int>(type: "int", nullable: true),
                    AgeToDays = table.Column<int>(type: "int", nullable: true),
                    CriticalLow = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    CriticalHigh = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    PanicLow = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    PanicHigh = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    RequireAcknowledgment = table.Column<bool>(type: "bit", nullable: false),
                    AcknowledgmentTimeoutMinutes = table.Column<int>(type: "int", nullable: true),
                    NotificationMethod = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LabCriticalValueConfigs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LabCriticalValueConfigs_Services_ServiceId",
                        column: x => x.ServiceId,
                        principalTable: "Services",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LabReferenceRanges",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ServiceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TestCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Gender = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AgeFromDays = table.Column<int>(type: "int", nullable: true),
                    AgeToDays = table.Column<int>(type: "int", nullable: true),
                    LowValue = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    HighValue = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    TextRange = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Unit = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LabReferenceRanges", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LabReferenceRanges_Services_ServiceId",
                        column: x => x.ServiceId,
                        principalTable: "Services",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LabSampleTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CollectionMethod = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PreparationInstructions = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    StabilityHours = table.Column<int>(type: "int", nullable: true),
                    StorageConditions = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LabSampleTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "LabTestGroups",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LabTestGroups", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "LabTubeTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Color = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ColorHex = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Additive = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Volume = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    VolumeUnit = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LabTubeTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MCIEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EventCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EventName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EventType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EventLocation = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AlertReceivedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ActivatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DeactivatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    AlertLevel = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EstimatedVictims = table.Column<int>(type: "int", nullable: false),
                    ActualVictims = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IncidentCommanderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BedsActivated = table.Column<int>(type: "int", nullable: false),
                    StaffMobilized = table.Column<int>(type: "int", nullable: false),
                    BloodBankAlerted = table.Column<bool>(type: "bit", nullable: false),
                    ORsCleared = table.Column<bool>(type: "bit", nullable: false),
                    ReportedToAuthority = table.Column<bool>(type: "bit", nullable: false),
                    ReportedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    AfterActionReport = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MCIEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MCIEvents_Users_IncidentCommanderId",
                        column: x => x.IncidentCommanderId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MealPlans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    MealType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TotalPatients = table.Column<int>(type: "int", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MealPlans", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MealPlans_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "MedicalEquipments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EquipmentCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EquipmentName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    NameEnglish = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Category = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RiskClass = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SerialNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Model = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Manufacturer = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CountryOfOrigin = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    YearOfManufacture = table.Column<int>(type: "int", nullable: true),
                    DepartmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Location = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PurchaseDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PurchasePrice = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    PurchaseSource = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    WarrantyExpiry = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    StatusReason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastMaintenanceDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    NextMaintenanceDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastCalibrationDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    NextCalibrationDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TotalRuntimeHours = table.Column<int>(type: "int", nullable: true),
                    UsageCount = table.Column<int>(type: "int", nullable: true),
                    ExpectedLifeYears = table.Column<int>(type: "int", nullable: true),
                    DecommissionDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DecommissionReason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MedicalEquipments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MedicalEquipments_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "MedicalStaffs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StaffCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    StaffType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    HighestDegree = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Specialty = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SubSpecialty = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    YearsOfExperience = table.Column<int>(type: "int", nullable: true),
                    LicenseNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LicenseIssueDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LicenseExpiryDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LicenseIssuedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LicenseActive = table.Column<bool>(type: "bit", nullable: false),
                    PrimaryDepartmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SecondaryDepartmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PersonalPhone = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    WorkPhone = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PersonalEmail = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    JoinDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TerminationDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MedicalStaffs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MedicalStaffs_Departments_PrimaryDepartmentId",
                        column: x => x.PrimaryDepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_MedicalStaffs_Departments_SecondaryDepartmentId",
                        column: x => x.SecondaryDepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_MedicalStaffs_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NutritionMonitorings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AdmissionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RecordedById = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BreakfastIntakePercent = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    LunchIntakePercent = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    DinnerIntakePercent = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    SnackIntakePercent = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    TotalCaloriesConsumed = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    FluidIntakeMl = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    CurrentWeight = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    WeightChange = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    GISymptoms = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AppetiteLevel = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NutritionMonitorings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NutritionMonitorings_Admissions_AdmissionId",
                        column: x => x.AdmissionId,
                        principalTable: "Admissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_NutritionMonitorings_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_NutritionMonitorings_Users_RecordedById",
                        column: x => x.RecordedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NutritionScreenings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AdmissionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ScreeningDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ScreenedById = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Weight = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Height = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    BMI = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    WeightLossPercent = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    WeightLossPeriodWeeks = table.Column<int>(type: "int", nullable: true),
                    NutritionScore = table.Column<int>(type: "int", nullable: false),
                    DiseaseScore = table.Column<int>(type: "int", nullable: false),
                    AgeScore = table.Column<int>(type: "int", nullable: false),
                    TotalScore = table.Column<int>(type: "int", nullable: false),
                    SGACategory = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RiskLevel = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RequiresIntervention = table.Column<bool>(type: "bit", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NutritionScreenings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NutritionScreenings_Admissions_AdmissionId",
                        column: x => x.AdmissionId,
                        principalTable: "Admissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_NutritionScreenings_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_NutritionScreenings_Users_ScreenedById",
                        column: x => x.ScreenedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Outbreaks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OutbreakCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DetectionDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DetectedById = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Organism = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SourceSuspected = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AffectedAreas = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    InitialCases = table.Column<int>(type: "int", nullable: false),
                    TotalCases = table.Column<int>(type: "int", nullable: false),
                    Deaths = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ContainedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ResolvedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReportedToAuthority = table.Column<bool>(type: "bit", nullable: false),
                    ReportedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ControlMeasures = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LessonsLearned = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Outbreaks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Outbreaks_Users_DetectedById",
                        column: x => x.DetectedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PortalAccounts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Username = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsEmailVerified = table.Column<bool>(type: "bit", nullable: false),
                    IsPhoneVerified = table.Column<bool>(type: "bit", nullable: false),
                    IsKYCVerified = table.Column<bool>(type: "bit", nullable: false),
                    KYCDocumentType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    KYCDocumentNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastLoginAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    FailedLoginAttempts = table.Column<int>(type: "int", nullable: false),
                    LockedUntil = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReceiveEmailNotifications = table.Column<bool>(type: "bit", nullable: false),
                    ReceiveSMSNotifications = table.Column<bool>(type: "bit", nullable: false),
                    PreferredLanguage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PortalAccounts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PortalAccounts_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "QualityIndicators",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IndicatorCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Category = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MeasurementType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    NumeratorDefinition = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DenominatorDefinition = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MeasurementFrequency = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TargetValue = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    ThresholdLow = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    ThresholdHigh = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    ThresholdDirection = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    StandardReference = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QualityIndicators", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RehabReferrals",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReferralCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AdmissionId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ExaminationId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReferredById = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AcceptedById = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    RehabType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Diagnosis = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IcdCode = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Reason = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Goals = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Precautions = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AcceptedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeclineReason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RehabReferrals", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RehabReferrals_Admissions_AdmissionId",
                        column: x => x.AdmissionId,
                        principalTable: "Admissions",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_RehabReferrals_Examinations_ExaminationId",
                        column: x => x.ExaminationId,
                        principalTable: "Examinations",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_RehabReferrals_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RehabReferrals_Users_AcceptedById",
                        column: x => x.AcceptedById,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_RehabReferrals_Users_ReferredById",
                        column: x => x.ReferredById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SatisfactionSurveys",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    VisitId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SurveyType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SurveyDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    OverallRating = table.Column<int>(type: "int", nullable: true),
                    WaitTimeRating = table.Column<int>(type: "int", nullable: true),
                    StaffCourtesyRating = table.Column<int>(type: "int", nullable: true),
                    CommunicationRating = table.Column<int>(type: "int", nullable: true),
                    CleanlinessRating = table.Column<int>(type: "int", nullable: true),
                    FacilitiesRating = table.Column<int>(type: "int", nullable: true),
                    WouldRecommend = table.Column<bool>(type: "bit", nullable: false),
                    PositiveFeedback = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NegativeFeedback = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Suggestions = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsAnonymous = table.Column<bool>(type: "bit", nullable: false),
                    RequiresFollowUp = table.Column<bool>(type: "bit", nullable: false),
                    FollowedUp = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SatisfactionSurveys", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SatisfactionSurveys_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SatisfactionSurveys_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "TeleAppointments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AppointmentCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DoctorId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SpecialityId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AppointmentDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    StartTime = table.Column<TimeSpan>(type: "time", nullable: false),
                    EndTime = table.Column<TimeSpan>(type: "time", nullable: true),
                    DurationMinutes = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ChiefComplaint = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CancellationReason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConfirmedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TeleAppointments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TeleAppointments_Departments_SpecialityId",
                        column: x => x.SpecialityId,
                        principalTable: "Departments",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_TeleAppointments_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TeleAppointments_Users_DoctorId",
                        column: x => x.DoctorId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TeleconsultationRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RequestCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AdmissionId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    RequestingFacilityCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RequestingFacilityName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RequestedById = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ConsultingFacilityCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ConsultingFacilityName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ConsultingSpecialty = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CaseDescription = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Diagnosis = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConsultationQuestion = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AttachedFiles = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Urgency = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ScheduledDateTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    StartedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    EndedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SessionUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConsultantName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConsultationOpinion = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Recommendations = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TeleconsultationRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TeleconsultationRequests_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TeleconsultationRequests_Users_RequestedById",
                        column: x => x.RequestedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TPNOrders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AdmissionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderedById = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Dextrose = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    AminoAcids = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Lipids = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TotalVolume = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    InfusionRate = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    InfusionHours = table.Column<int>(type: "int", nullable: false),
                    Sodium = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    Potassium = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    Calcium = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    Magnesium = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    Phosphate = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    AddMultivitamins = table.Column<bool>(type: "bit", nullable: false),
                    AddTraceElements = table.Column<bool>(type: "bit", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TPNOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TPNOrders_Admissions_AdmissionId",
                        column: x => x.AdmissionId,
                        principalTable: "Admissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TPNOrders_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TPNOrders_Users_OrderedById",
                        column: x => x.OrderedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DietOrders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AdmissionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DietTypeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderedById = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TextureModification = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FluidConsistency = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Allergies = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FoodPreferences = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Restrictions = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TargetCalories = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    TargetProtein = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    SpecialInstructions = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DiscontinuationReason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DietOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DietOrders_Admissions_AdmissionId",
                        column: x => x.AdmissionId,
                        principalTable: "Admissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DietOrders_DietTypes_DietTypeId",
                        column: x => x.DietTypeId,
                        principalTable: "DietTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DietOrders_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DietOrders_Users_OrderedById",
                        column: x => x.OrderedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CAPAs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CAPACode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IncidentReportId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AuditFindingId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Source = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ActionDescription = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ExpectedOutcome = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AssignedToId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DueDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CompletedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Priority = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsEffective = table.Column<bool>(type: "bit", nullable: false),
                    VerifiedById = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    VerifiedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    VerificationNotes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CAPAs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CAPAs_IncidentReports_IncidentReportId",
                        column: x => x.IncidentReportId,
                        principalTable: "IncidentReports",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_CAPAs_Users_AssignedToId",
                        column: x => x.AssignedToId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CAPAs_Users_VerifiedById",
                        column: x => x.VerifiedById,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "LabAnalyzerTestMappings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AnalyzerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ServiceId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    HisTestCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    HisTestName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AnalyzerTestCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AnalyzerTestName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConversionFactor = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    Unit = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LabAnalyzerTestMappings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LabAnalyzerTestMappings_LabAnalyzers_AnalyzerId",
                        column: x => x.AnalyzerId,
                        principalTable: "LabAnalyzers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LabAnalyzerTestMappings_Services_ServiceId",
                        column: x => x.ServiceId,
                        principalTable: "Services",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "LabConnectionLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AnalyzerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EventTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EventType = table.Column<int>(type: "int", nullable: false),
                    EventDescription = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RawData = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ParsedData = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsSuccess = table.Column<bool>(type: "bit", nullable: false),
                    ErrorMessage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LabConnectionLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LabConnectionLogs_LabAnalyzers_AnalyzerId",
                        column: x => x.AnalyzerId,
                        principalTable: "LabAnalyzers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LabQCResults",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AnalyzerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ServiceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TestCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    QCLevel = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    QCLotNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RunTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Value = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Mean = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    SD = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    CV = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    ZScore = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    IsAccepted = table.Column<bool>(type: "bit", nullable: false),
                    WestgardRule = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Violations = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PerformedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PerformedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LabQCResults", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LabQCResults_LabAnalyzers_AnalyzerId",
                        column: x => x.AnalyzerId,
                        principalTable: "LabAnalyzers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LabQCResults_Services_ServiceId",
                        column: x => x.ServiceId,
                        principalTable: "Services",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LabQCResults_Users_PerformedByUserId",
                        column: x => x.PerformedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "LabRawResults",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AnalyzerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SampleId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PatientId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TestCode = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Result = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Unit = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Flag = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ResultTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RawMessage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    MappedToLabRequestItemId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    MappedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    MappedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    MappedLabRequestItemId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LabRawResults", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LabRawResults_LabAnalyzers_AnalyzerId",
                        column: x => x.AnalyzerId,
                        principalTable: "LabAnalyzers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LabRawResults_LabRequestItems_MappedLabRequestItemId",
                        column: x => x.MappedLabRequestItemId,
                        principalTable: "LabRequestItems",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "LabWorklists",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AnalyzerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LabRequestItemId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SampleBarcode = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TestCodes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SentAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    MessageControlId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RawMessage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AckMessage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AcknowledgedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ResultReceivedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RetryCount = table.Column<int>(type: "int", nullable: false),
                    ErrorMessage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LabWorklists", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LabWorklists_LabAnalyzers_AnalyzerId",
                        column: x => x.AnalyzerId,
                        principalTable: "LabAnalyzers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LabWorklists_LabRequestItems_LabRequestItemId",
                        column: x => x.LabRequestItemId,
                        principalTable: "LabRequestItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MCISituationReports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MCIEventId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReportNumber = table.Column<int>(type: "int", nullable: false),
                    ReportTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReportedById = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TotalArrived = table.Column<int>(type: "int", nullable: false),
                    RedCount = table.Column<int>(type: "int", nullable: false),
                    YellowCount = table.Column<int>(type: "int", nullable: false),
                    GreenCount = table.Column<int>(type: "int", nullable: false),
                    BlackCount = table.Column<int>(type: "int", nullable: false),
                    InED = table.Column<int>(type: "int", nullable: false),
                    InOR = table.Column<int>(type: "int", nullable: false),
                    InICU = table.Column<int>(type: "int", nullable: false),
                    Admitted = table.Column<int>(type: "int", nullable: false),
                    Discharged = table.Column<int>(type: "int", nullable: false),
                    Transferred = table.Column<int>(type: "int", nullable: false),
                    Deceased = table.Column<int>(type: "int", nullable: false),
                    BedsAvailable = table.Column<int>(type: "int", nullable: false),
                    ORsInUse = table.Column<int>(type: "int", nullable: false),
                    VentilatorsInUse = table.Column<int>(type: "int", nullable: false),
                    BloodSupplyStatus = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CriticalSupplyIssues = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DoctorsOnDuty = table.Column<int>(type: "int", nullable: false),
                    NursesOnDuty = table.Column<int>(type: "int", nullable: false),
                    Comments = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ImmediateNeeds = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MCISituationReports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MCISituationReports_MCIEvents_MCIEventId",
                        column: x => x.MCIEventId,
                        principalTable: "MCIEvents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MCISituationReports_Users_ReportedById",
                        column: x => x.ReportedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MCIVictims",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MCIEventId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TagNumber = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    EstimatedAge = table.Column<int>(type: "int", nullable: true),
                    Gender = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IdentifyingFeatures = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ArrivalTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TriageCategory = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TriageTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TriagedById = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TriageNotes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CanWalk = table.Column<bool>(type: "bit", nullable: true),
                    RespiratoryRate = table.Column<int>(type: "int", nullable: true),
                    HasRadialPulse = table.Column<bool>(type: "bit", nullable: true),
                    FollowsCommands = table.Column<bool>(type: "bit", nullable: true),
                    InjuryDescription = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    BodyAreasAffected = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CurrentLocation = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    InitialTreatment = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AdmissionId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    FamilyNotified = table.Column<bool>(type: "bit", nullable: false),
                    FamilyContactName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FamilyContactPhone = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FamilyNotifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MCIVictims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MCIVictims_Admissions_AdmissionId",
                        column: x => x.AdmissionId,
                        principalTable: "Admissions",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_MCIVictims_MCIEvents_MCIEventId",
                        column: x => x.MCIEventId,
                        principalTable: "MCIEvents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MCIVictims_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_MCIVictims_Users_TriagedById",
                        column: x => x.TriagedById,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "CalibrationRecords",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EquipmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ScheduledDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PerformedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PerformedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CertificateNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CalibrationStandard = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PassedCalibration = table.Column<bool>(type: "bit", nullable: false),
                    DeviationFindings = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AdjustmentsMade = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CalibrationCost = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    ValidFrom = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ValidUntil = table.Column<DateTime>(type: "datetime2", nullable: true),
                    NextCalibrationDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CalibrationRecords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CalibrationRecords_MedicalEquipments_EquipmentId",
                        column: x => x.EquipmentId,
                        principalTable: "MedicalEquipments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MaintenanceRecords",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EquipmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MaintenanceType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ScheduledDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PerformedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PerformedById = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    WorkDescription = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PartsReplaced = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PartsCost = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    LaborCost = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    TotalCost = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    IsInternal = table.Column<bool>(type: "bit", nullable: false),
                    VendorName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ServiceReportNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Findings = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Recommendations = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NextMaintenanceDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaintenanceRecords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MaintenanceRecords_MedicalEquipments_EquipmentId",
                        column: x => x.EquipmentId,
                        principalTable: "MedicalEquipments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MaintenanceRecords_Users_PerformedById",
                        column: x => x.PerformedById,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "RepairRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RequestCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EquipmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RequestedById = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    RequestDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ProblemDescription = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Priority = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AssignedToId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AssignedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    StartedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CompletedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DiagnosisFindings = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RepairActions = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PartsUsed = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PartsCost = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    LaborCost = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    ExternalServiceCost = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    TotalCost = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    IsRepaired = table.Column<bool>(type: "bit", nullable: false),
                    UnrepairableReason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RecommendReplacement = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RepairRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RepairRequests_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_RepairRequests_MedicalEquipments_EquipmentId",
                        column: x => x.EquipmentId,
                        principalTable: "MedicalEquipments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RepairRequests_Users_AssignedToId",
                        column: x => x.AssignedToId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_RepairRequests_Users_RequestedById",
                        column: x => x.RequestedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ClinicAssignments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssignmentDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RoomId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StaffId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ShiftType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    StartTime = table.Column<TimeSpan>(type: "time", nullable: false),
                    EndTime = table.Column<TimeSpan>(type: "time", nullable: false),
                    MaxPatients = table.Column<int>(type: "int", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClinicAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClinicAssignments_MedicalStaffs_StaffId",
                        column: x => x.StaffId,
                        principalTable: "MedicalStaffs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ClinicAssignments_Rooms_RoomId",
                        column: x => x.RoomId,
                        principalTable: "Rooms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CMERecords",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StaffId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ActivityName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ActivityType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ActivityDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreditHours = table.Column<int>(type: "int", nullable: false),
                    Provider = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CertificateNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DocumentPath = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsVerified = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CMERecords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CMERecords_MedicalStaffs_StaffId",
                        column: x => x.StaffId,
                        principalTable: "MedicalStaffs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DutyShifts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DutyRosterId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StaffId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ShiftDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ShiftType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    StartTime = table.Column<TimeSpan>(type: "time", nullable: false),
                    EndTime = table.Column<TimeSpan>(type: "time", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SwappedWithId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SwapReason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SwapApproved = table.Column<bool>(type: "bit", nullable: false),
                    CheckInTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CheckOutTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    AttendanceNotes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DutyShifts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DutyShifts_DutyRosters_DutyRosterId",
                        column: x => x.DutyRosterId,
                        principalTable: "DutyRosters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DutyShifts_MedicalStaffs_StaffId",
                        column: x => x.StaffId,
                        principalTable: "MedicalStaffs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DutyShifts_MedicalStaffs_SwappedWithId",
                        column: x => x.SwappedWithId,
                        principalTable: "MedicalStaffs",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "StaffQualifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StaffId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    QualificationType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IssuedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IssueDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ExpiryDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DocumentPath = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsVerified = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StaffQualifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StaffQualifications_MedicalStaffs_StaffId",
                        column: x => x.StaffId,
                        principalTable: "MedicalStaffs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NutritionAssessments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ScreeningId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssessmentDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AssessedById = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Albumin = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    Prealbumin = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    Transferrin = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    TotalProtein = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    TotalLymphocyteCount = table.Column<int>(type: "int", nullable: true),
                    EnergyRequirement = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    ProteinRequirement = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    FluidRequirement = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    CalculationMethod = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ActivityFactor = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    StressFactor = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    NutritionGoals = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    InterventionPlan = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NextReviewDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NutritionAssessments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NutritionAssessments_NutritionScreenings_ScreeningId",
                        column: x => x.ScreeningId,
                        principalTable: "NutritionScreenings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_NutritionAssessments_Users_AssessedById",
                        column: x => x.AssessedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "HAICases",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CaseCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AdmissionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OnsetDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReportedById = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InfectionType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    InfectionSite = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Organism = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsMDRO = table.Column<bool>(type: "bit", nullable: false),
                    ResistancePattern = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeviceAssociated = table.Column<bool>(type: "bit", nullable: false),
                    DeviceType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DeviceDays = table.Column<int>(type: "int", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ConfirmedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ResolvedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Outcome = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsInvestigated = table.Column<bool>(type: "bit", nullable: false),
                    RootCause = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ContributingFactors = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PreventiveMeasures = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    OutbreakId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HAICases", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HAICases_Admissions_AdmissionId",
                        column: x => x.AdmissionId,
                        principalTable: "Admissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_HAICases_Outbreaks_OutbreakId",
                        column: x => x.OutbreakId,
                        principalTable: "Outbreaks",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_HAICases_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_HAICases_Users_ReportedById",
                        column: x => x.ReportedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OutbreakCases",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OutbreakId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AdmissionId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    OnsetDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OutbreakCases", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OutbreakCases_Admissions_AdmissionId",
                        column: x => x.AdmissionId,
                        principalTable: "Admissions",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_OutbreakCases_Outbreaks_OutbreakId",
                        column: x => x.OutbreakId,
                        principalTable: "Outbreaks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OutbreakCases_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OnlinePayments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TransactionCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PortalAccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PaymentType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ReferenceId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PaymentMethod = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    GatewayTransactionId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    GatewayResponse = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PaidAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsRefunded = table.Column<bool>(type: "bit", nullable: false),
                    RefundAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    RefundedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RefundReason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OnlinePayments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OnlinePayments_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OnlinePayments_PortalAccounts_PortalAccountId",
                        column: x => x.PortalAccountId,
                        principalTable: "PortalAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PortalAppointments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BookingCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PortalAccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DoctorId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AppointmentDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    SlotTime = table.Column<TimeSpan>(type: "time", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ChiefComplaint = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsPaid = table.Column<bool>(type: "bit", nullable: false),
                    BookingFee = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    PaymentMethod = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PaymentReference = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PaidAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CancelledAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CancellationReason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsRefunded = table.Column<bool>(type: "bit", nullable: false),
                    CheckedInAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    QueueNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ReminderSent = table.Column<bool>(type: "bit", nullable: false),
                    ReminderSentAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PortalAppointments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PortalAppointments_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PortalAppointments_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PortalAppointments_PortalAccounts_PortalAccountId",
                        column: x => x.PortalAccountId,
                        principalTable: "PortalAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PortalAppointments_Users_DoctorId",
                        column: x => x.DoctorId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "QualityIndicatorValues",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IndicatorId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PeriodStart = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PeriodEnd = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Numerator = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    Denominator = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    Value = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Trend = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    RecordedById = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QualityIndicatorValues", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QualityIndicatorValues_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_QualityIndicatorValues_QualityIndicators_IndicatorId",
                        column: x => x.IndicatorId,
                        principalTable: "QualityIndicators",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_QualityIndicatorValues_Users_RecordedById",
                        column: x => x.RecordedById,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "FunctionalAssessments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReferralId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssessmentDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AssessedById = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BarthelIndex = table.Column<int>(type: "int", nullable: true),
                    FIMScore = table.Column<int>(type: "int", nullable: true),
                    MoCAScore = table.Column<int>(type: "int", nullable: true),
                    BergBalanceScale = table.Column<int>(type: "int", nullable: true),
                    TinettiFallRisk = table.Column<int>(type: "int", nullable: true),
                    MobilityStatus = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    GaitPattern = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RequiresAssistiveDevice = table.Column<bool>(type: "bit", nullable: false),
                    AssistiveDeviceType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ROMFindings = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    StrengthFindings = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SensoryFindings = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SpeechStatus = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SwallowingStatus = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CognitiveStatus = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ADLStatus = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IADLStatus = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ShortTermGoals = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LongTermGoals = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PlanSummary = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FunctionalAssessments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FunctionalAssessments_RehabReferrals_ReferralId",
                        column: x => x.ReferralId,
                        principalTable: "RehabReferrals",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_FunctionalAssessments_Users_AssessedById",
                        column: x => x.AssessedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RehabTreatmentPlans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PlanCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ReferralId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedById = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RehabType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PlannedSessions = table.Column<int>(type: "int", nullable: false),
                    CompletedSessions = table.Column<int>(type: "int", nullable: false),
                    Frequency = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DurationMinutesPerSession = table.Column<int>(type: "int", nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpectedEndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ActualEndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ShortTermGoals = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LongTermGoals = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Interventions = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Precautions = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DiscontinuationReason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DischargeSummary = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RehabTreatmentPlans", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RehabTreatmentPlans_RehabReferrals_ReferralId",
                        column: x => x.ReferralId,
                        principalTable: "RehabReferrals",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RehabTreatmentPlans_Users_CreatedById",
                        column: x => x.CreatedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TeleSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SessionCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AppointmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RoomId = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    StartTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    EndTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DurationMinutes = table.Column<int>(type: "int", nullable: true),
                    RecordingUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsRecorded = table.Column<bool>(type: "bit", nullable: false),
                    ConnectionQuality = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TeleSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TeleSessions_TeleAppointments_AppointmentId",
                        column: x => x.AppointmentId,
                        principalTable: "TeleAppointments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MealPlanItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MealPlanId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DietOrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RoomBed = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDelivered = table.Column<bool>(type: "bit", nullable: false),
                    DeliveredAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IntakePercent = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MealPlanItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MealPlanItems_DietOrders_DietOrderId",
                        column: x => x.DietOrderId,
                        principalTable: "DietOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MealPlanItems_MealPlans_MealPlanId",
                        column: x => x.MealPlanId,
                        principalTable: "MealPlans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MealPlanItems_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "IsolationOrders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    HAICaseId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AdmissionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderedById = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IsolationType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Precautions = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Reason = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RequiresGown = table.Column<bool>(type: "bit", nullable: false),
                    RequiresGloves = table.Column<bool>(type: "bit", nullable: false),
                    RequiresMask = table.Column<bool>(type: "bit", nullable: false),
                    RequiresN95 = table.Column<bool>(type: "bit", nullable: false),
                    RequiresEyeProtection = table.Column<bool>(type: "bit", nullable: false),
                    RequiresNegativePressure = table.Column<bool>(type: "bit", nullable: false),
                    SpecialInstructions = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DiscontinuationReason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IsolationOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_IsolationOrders_Admissions_AdmissionId",
                        column: x => x.AdmissionId,
                        principalTable: "Admissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_IsolationOrders_HAICases_HAICaseId",
                        column: x => x.HAICaseId,
                        principalTable: "HAICases",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_IsolationOrders_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_IsolationOrders_Users_OrderedById",
                        column: x => x.OrderedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RehabSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TreatmentPlanId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SessionNumber = table.Column<int>(type: "int", nullable: false),
                    SessionDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    StartTime = table.Column<TimeSpan>(type: "time", nullable: false),
                    EndTime = table.Column<TimeSpan>(type: "time", nullable: true),
                    DurationMinutes = table.Column<int>(type: "int", nullable: true),
                    TherapistId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    InterventionsProvided = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ExercisesPerformed = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ModalitiesUsed = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PatientResponse = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ProgressNotes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    GoalProgress = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CancellationReason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    HomeExercises = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RehabSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RehabSessions_RehabTreatmentPlans_TreatmentPlanId",
                        column: x => x.TreatmentPlanId,
                        principalTable: "RehabTreatmentPlans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RehabSessions_Users_TherapistId",
                        column: x => x.TherapistId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TeleConsultations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Symptoms = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Diagnosis = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IcdCode = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TreatmentPlan = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RequiresFollowUp = table.Column<bool>(type: "bit", nullable: false),
                    FollowUpDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RequiresInPerson = table.Column<bool>(type: "bit", nullable: false),
                    InPersonReason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TeleConsultations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TeleConsultations_TeleSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "TeleSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TeleFeedbacks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OverallRating = table.Column<int>(type: "int", nullable: false),
                    VideoQualityRating = table.Column<int>(type: "int", nullable: true),
                    DoctorRating = table.Column<int>(type: "int", nullable: true),
                    EaseOfUseRating = table.Column<int>(type: "int", nullable: true),
                    Comments = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    WouldRecommend = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TeleFeedbacks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TeleFeedbacks_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TeleFeedbacks_TeleSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "TeleSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TelePrescriptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PrescriptionCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PrescriptionDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DigitalSignature = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SignedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    QRCode = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SentToPharmacyId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SentToPharmacyAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TelePrescriptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TelePrescriptions_TeleSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "TeleSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TelePrescriptionItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PrescriptionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MedicineId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MedicineName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Quantity = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Unit = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Dosage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Frequency = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DurationDays = table.Column<int>(type: "int", nullable: true),
                    Instructions = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TelePrescriptionItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TelePrescriptionItems_Medicines_MedicineId",
                        column: x => x.MedicineId,
                        principalTable: "Medicines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TelePrescriptionItems_TelePrescriptions_PrescriptionId",
                        column: x => x.PrescriptionId,
                        principalTable: "TelePrescriptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AntibioticStewardships_AdmissionId",
                table: "AntibioticStewardships",
                column: "AdmissionId");

            migrationBuilder.CreateIndex(
                name: "IX_AntibioticStewardships_PatientId",
                table: "AntibioticStewardships",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_AntibioticStewardships_ReviewedById",
                table: "AntibioticStewardships",
                column: "ReviewedById");

            migrationBuilder.CreateIndex(
                name: "IX_AuditPlans_LeadAuditorId",
                table: "AuditPlans",
                column: "LeadAuditorId");

            migrationBuilder.CreateIndex(
                name: "IX_CalibrationRecords_EquipmentId",
                table: "CalibrationRecords",
                column: "EquipmentId");

            migrationBuilder.CreateIndex(
                name: "IX_CAPAs_AssignedToId",
                table: "CAPAs",
                column: "AssignedToId");

            migrationBuilder.CreateIndex(
                name: "IX_CAPAs_IncidentReportId",
                table: "CAPAs",
                column: "IncidentReportId");

            migrationBuilder.CreateIndex(
                name: "IX_CAPAs_VerifiedById",
                table: "CAPAs",
                column: "VerifiedById");

            migrationBuilder.CreateIndex(
                name: "IX_ClinicAssignments_RoomId",
                table: "ClinicAssignments",
                column: "RoomId");

            migrationBuilder.CreateIndex(
                name: "IX_ClinicAssignments_StaffId",
                table: "ClinicAssignments",
                column: "StaffId");

            migrationBuilder.CreateIndex(
                name: "IX_CMERecords_StaffId",
                table: "CMERecords",
                column: "StaffId");

            migrationBuilder.CreateIndex(
                name: "IX_DietOrders_AdmissionId",
                table: "DietOrders",
                column: "AdmissionId");

            migrationBuilder.CreateIndex(
                name: "IX_DietOrders_DietTypeId",
                table: "DietOrders",
                column: "DietTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_DietOrders_OrderedById",
                table: "DietOrders",
                column: "OrderedById");

            migrationBuilder.CreateIndex(
                name: "IX_DietOrders_PatientId",
                table: "DietOrders",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_DutyRosters_CreatedById",
                table: "DutyRosters",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_DutyRosters_DepartmentId",
                table: "DutyRosters",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_DutyShifts_DutyRosterId",
                table: "DutyShifts",
                column: "DutyRosterId");

            migrationBuilder.CreateIndex(
                name: "IX_DutyShifts_StaffId",
                table: "DutyShifts",
                column: "StaffId");

            migrationBuilder.CreateIndex(
                name: "IX_DutyShifts_SwappedWithId",
                table: "DutyShifts",
                column: "SwappedWithId");

            migrationBuilder.CreateIndex(
                name: "IX_ElectronicReferrals_PatientId",
                table: "ElectronicReferrals",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_ElectronicReferrals_ReferredById",
                table: "ElectronicReferrals",
                column: "ReferredById");

            migrationBuilder.CreateIndex(
                name: "IX_FunctionalAssessments_AssessedById",
                table: "FunctionalAssessments",
                column: "AssessedById");

            migrationBuilder.CreateIndex(
                name: "IX_FunctionalAssessments_ReferralId",
                table: "FunctionalAssessments",
                column: "ReferralId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_HAICases_AdmissionId",
                table: "HAICases",
                column: "AdmissionId");

            migrationBuilder.CreateIndex(
                name: "IX_HAICases_OutbreakId",
                table: "HAICases",
                column: "OutbreakId");

            migrationBuilder.CreateIndex(
                name: "IX_HAICases_PatientId",
                table: "HAICases",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_HAICases_ReportedById",
                table: "HAICases",
                column: "ReportedById");

            migrationBuilder.CreateIndex(
                name: "IX_HandHygieneObservations_DepartmentId",
                table: "HandHygieneObservations",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_HandHygieneObservations_ObservedById",
                table: "HandHygieneObservations",
                column: "ObservedById");

            migrationBuilder.CreateIndex(
                name: "IX_IncidentReports_DepartmentId",
                table: "IncidentReports",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_IncidentReports_InvestigatorId",
                table: "IncidentReports",
                column: "InvestigatorId");

            migrationBuilder.CreateIndex(
                name: "IX_IncidentReports_PatientId",
                table: "IncidentReports",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_IncidentReports_ReportedById",
                table: "IncidentReports",
                column: "ReportedById");

            migrationBuilder.CreateIndex(
                name: "IX_InsuranceXMLSubmissions_DepartmentId",
                table: "InsuranceXMLSubmissions",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_InsuranceXMLSubmissions_SubmittedById",
                table: "InsuranceXMLSubmissions",
                column: "SubmittedById");

            migrationBuilder.CreateIndex(
                name: "IX_IsolationOrders_AdmissionId",
                table: "IsolationOrders",
                column: "AdmissionId");

            migrationBuilder.CreateIndex(
                name: "IX_IsolationOrders_HAICaseId",
                table: "IsolationOrders",
                column: "HAICaseId",
                unique: true,
                filter: "[HAICaseId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_IsolationOrders_OrderedById",
                table: "IsolationOrders",
                column: "OrderedById");

            migrationBuilder.CreateIndex(
                name: "IX_IsolationOrders_PatientId",
                table: "IsolationOrders",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_LabAnalyzers_DepartmentId",
                table: "LabAnalyzers",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_LabAnalyzerTestMappings_AnalyzerId",
                table: "LabAnalyzerTestMappings",
                column: "AnalyzerId");

            migrationBuilder.CreateIndex(
                name: "IX_LabAnalyzerTestMappings_ServiceId",
                table: "LabAnalyzerTestMappings",
                column: "ServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_LabConclusionTemplates_ServiceId",
                table: "LabConclusionTemplates",
                column: "ServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_LabConnectionLogs_AnalyzerId",
                table: "LabConnectionLogs",
                column: "AnalyzerId");

            migrationBuilder.CreateIndex(
                name: "IX_LabCriticalValueAlerts_AcknowledgedByUserId",
                table: "LabCriticalValueAlerts",
                column: "AcknowledgedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_LabCriticalValueAlerts_LabResultId",
                table: "LabCriticalValueAlerts",
                column: "LabResultId");

            migrationBuilder.CreateIndex(
                name: "IX_LabCriticalValueAlerts_PatientId",
                table: "LabCriticalValueAlerts",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_LabCriticalValueConfigs_ServiceId",
                table: "LabCriticalValueConfigs",
                column: "ServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_LabQCResults_AnalyzerId",
                table: "LabQCResults",
                column: "AnalyzerId");

            migrationBuilder.CreateIndex(
                name: "IX_LabQCResults_PerformedByUserId",
                table: "LabQCResults",
                column: "PerformedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_LabQCResults_ServiceId",
                table: "LabQCResults",
                column: "ServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_LabRawResults_AnalyzerId",
                table: "LabRawResults",
                column: "AnalyzerId");

            migrationBuilder.CreateIndex(
                name: "IX_LabRawResults_MappedLabRequestItemId",
                table: "LabRawResults",
                column: "MappedLabRequestItemId");

            migrationBuilder.CreateIndex(
                name: "IX_LabReferenceRanges_ServiceId",
                table: "LabReferenceRanges",
                column: "ServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_LabWorklists_AnalyzerId",
                table: "LabWorklists",
                column: "AnalyzerId");

            migrationBuilder.CreateIndex(
                name: "IX_LabWorklists_LabRequestItemId",
                table: "LabWorklists",
                column: "LabRequestItemId");

            migrationBuilder.CreateIndex(
                name: "IX_MaintenanceRecords_EquipmentId",
                table: "MaintenanceRecords",
                column: "EquipmentId");

            migrationBuilder.CreateIndex(
                name: "IX_MaintenanceRecords_PerformedById",
                table: "MaintenanceRecords",
                column: "PerformedById");

            migrationBuilder.CreateIndex(
                name: "IX_MCIEvents_IncidentCommanderId",
                table: "MCIEvents",
                column: "IncidentCommanderId");

            migrationBuilder.CreateIndex(
                name: "IX_MCISituationReports_MCIEventId",
                table: "MCISituationReports",
                column: "MCIEventId");

            migrationBuilder.CreateIndex(
                name: "IX_MCISituationReports_ReportedById",
                table: "MCISituationReports",
                column: "ReportedById");

            migrationBuilder.CreateIndex(
                name: "IX_MCIVictims_AdmissionId",
                table: "MCIVictims",
                column: "AdmissionId");

            migrationBuilder.CreateIndex(
                name: "IX_MCIVictims_MCIEventId",
                table: "MCIVictims",
                column: "MCIEventId");

            migrationBuilder.CreateIndex(
                name: "IX_MCIVictims_PatientId",
                table: "MCIVictims",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_MCIVictims_TriagedById",
                table: "MCIVictims",
                column: "TriagedById");

            migrationBuilder.CreateIndex(
                name: "IX_MealPlanItems_DietOrderId",
                table: "MealPlanItems",
                column: "DietOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_MealPlanItems_MealPlanId",
                table: "MealPlanItems",
                column: "MealPlanId");

            migrationBuilder.CreateIndex(
                name: "IX_MealPlanItems_PatientId",
                table: "MealPlanItems",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_MealPlans_DepartmentId",
                table: "MealPlans",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_MedicalEquipments_DepartmentId",
                table: "MedicalEquipments",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_MedicalStaffs_PrimaryDepartmentId",
                table: "MedicalStaffs",
                column: "PrimaryDepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_MedicalStaffs_SecondaryDepartmentId",
                table: "MedicalStaffs",
                column: "SecondaryDepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_MedicalStaffs_UserId",
                table: "MedicalStaffs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_NutritionAssessments_AssessedById",
                table: "NutritionAssessments",
                column: "AssessedById");

            migrationBuilder.CreateIndex(
                name: "IX_NutritionAssessments_ScreeningId",
                table: "NutritionAssessments",
                column: "ScreeningId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NutritionMonitorings_AdmissionId",
                table: "NutritionMonitorings",
                column: "AdmissionId");

            migrationBuilder.CreateIndex(
                name: "IX_NutritionMonitorings_PatientId",
                table: "NutritionMonitorings",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_NutritionMonitorings_RecordedById",
                table: "NutritionMonitorings",
                column: "RecordedById");

            migrationBuilder.CreateIndex(
                name: "IX_NutritionScreenings_AdmissionId",
                table: "NutritionScreenings",
                column: "AdmissionId");

            migrationBuilder.CreateIndex(
                name: "IX_NutritionScreenings_PatientId",
                table: "NutritionScreenings",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_NutritionScreenings_ScreenedById",
                table: "NutritionScreenings",
                column: "ScreenedById");

            migrationBuilder.CreateIndex(
                name: "IX_OnlinePayments_PatientId",
                table: "OnlinePayments",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_OnlinePayments_PortalAccountId",
                table: "OnlinePayments",
                column: "PortalAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_OutbreakCases_AdmissionId",
                table: "OutbreakCases",
                column: "AdmissionId");

            migrationBuilder.CreateIndex(
                name: "IX_OutbreakCases_OutbreakId",
                table: "OutbreakCases",
                column: "OutbreakId");

            migrationBuilder.CreateIndex(
                name: "IX_OutbreakCases_PatientId",
                table: "OutbreakCases",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_Outbreaks_DetectedById",
                table: "Outbreaks",
                column: "DetectedById");

            migrationBuilder.CreateIndex(
                name: "IX_PortalAccounts_PatientId",
                table: "PortalAccounts",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_PortalAppointments_DepartmentId",
                table: "PortalAppointments",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_PortalAppointments_DoctorId",
                table: "PortalAppointments",
                column: "DoctorId");

            migrationBuilder.CreateIndex(
                name: "IX_PortalAppointments_PatientId",
                table: "PortalAppointments",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_PortalAppointments_PortalAccountId",
                table: "PortalAppointments",
                column: "PortalAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_QualityIndicatorValues_DepartmentId",
                table: "QualityIndicatorValues",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_QualityIndicatorValues_IndicatorId",
                table: "QualityIndicatorValues",
                column: "IndicatorId");

            migrationBuilder.CreateIndex(
                name: "IX_QualityIndicatorValues_RecordedById",
                table: "QualityIndicatorValues",
                column: "RecordedById");

            migrationBuilder.CreateIndex(
                name: "IX_RehabReferrals_AcceptedById",
                table: "RehabReferrals",
                column: "AcceptedById");

            migrationBuilder.CreateIndex(
                name: "IX_RehabReferrals_AdmissionId",
                table: "RehabReferrals",
                column: "AdmissionId");

            migrationBuilder.CreateIndex(
                name: "IX_RehabReferrals_ExaminationId",
                table: "RehabReferrals",
                column: "ExaminationId");

            migrationBuilder.CreateIndex(
                name: "IX_RehabReferrals_PatientId",
                table: "RehabReferrals",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_RehabReferrals_ReferredById",
                table: "RehabReferrals",
                column: "ReferredById");

            migrationBuilder.CreateIndex(
                name: "IX_RehabSessions_TherapistId",
                table: "RehabSessions",
                column: "TherapistId");

            migrationBuilder.CreateIndex(
                name: "IX_RehabSessions_TreatmentPlanId",
                table: "RehabSessions",
                column: "TreatmentPlanId");

            migrationBuilder.CreateIndex(
                name: "IX_RehabTreatmentPlans_CreatedById",
                table: "RehabTreatmentPlans",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_RehabTreatmentPlans_ReferralId",
                table: "RehabTreatmentPlans",
                column: "ReferralId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RepairRequests_AssignedToId",
                table: "RepairRequests",
                column: "AssignedToId");

            migrationBuilder.CreateIndex(
                name: "IX_RepairRequests_DepartmentId",
                table: "RepairRequests",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_RepairRequests_EquipmentId",
                table: "RepairRequests",
                column: "EquipmentId");

            migrationBuilder.CreateIndex(
                name: "IX_RepairRequests_RequestedById",
                table: "RepairRequests",
                column: "RequestedById");

            migrationBuilder.CreateIndex(
                name: "IX_SatisfactionSurveys_DepartmentId",
                table: "SatisfactionSurveys",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_SatisfactionSurveys_PatientId",
                table: "SatisfactionSurveys",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_StaffQualifications_StaffId",
                table: "StaffQualifications",
                column: "StaffId");

            migrationBuilder.CreateIndex(
                name: "IX_TeleAppointments_DoctorId",
                table: "TeleAppointments",
                column: "DoctorId");

            migrationBuilder.CreateIndex(
                name: "IX_TeleAppointments_PatientId",
                table: "TeleAppointments",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_TeleAppointments_SpecialityId",
                table: "TeleAppointments",
                column: "SpecialityId");

            migrationBuilder.CreateIndex(
                name: "IX_TeleconsultationRequests_PatientId",
                table: "TeleconsultationRequests",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_TeleconsultationRequests_RequestedById",
                table: "TeleconsultationRequests",
                column: "RequestedById");

            migrationBuilder.CreateIndex(
                name: "IX_TeleConsultations_SessionId",
                table: "TeleConsultations",
                column: "SessionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TeleFeedbacks_PatientId",
                table: "TeleFeedbacks",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_TeleFeedbacks_SessionId",
                table: "TeleFeedbacks",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_TelePrescriptionItems_MedicineId",
                table: "TelePrescriptionItems",
                column: "MedicineId");

            migrationBuilder.CreateIndex(
                name: "IX_TelePrescriptionItems_PrescriptionId",
                table: "TelePrescriptionItems",
                column: "PrescriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_TelePrescriptions_SessionId",
                table: "TelePrescriptions",
                column: "SessionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TeleSessions_AppointmentId",
                table: "TeleSessions",
                column: "AppointmentId");

            migrationBuilder.CreateIndex(
                name: "IX_TPNOrders_AdmissionId",
                table: "TPNOrders",
                column: "AdmissionId");

            migrationBuilder.CreateIndex(
                name: "IX_TPNOrders_OrderedById",
                table: "TPNOrders",
                column: "OrderedById");

            migrationBuilder.CreateIndex(
                name: "IX_TPNOrders_PatientId",
                table: "TPNOrders",
                column: "PatientId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AntibioticStewardships");

            migrationBuilder.DropTable(
                name: "AuditPlans");

            migrationBuilder.DropTable(
                name: "CalibrationRecords");

            migrationBuilder.DropTable(
                name: "CAPAs");

            migrationBuilder.DropTable(
                name: "ClinicAssignments");

            migrationBuilder.DropTable(
                name: "CMERecords");

            migrationBuilder.DropTable(
                name: "DutyShifts");

            migrationBuilder.DropTable(
                name: "ElectronicReferrals");

            migrationBuilder.DropTable(
                name: "FunctionalAssessments");

            migrationBuilder.DropTable(
                name: "HandHygieneObservations");

            migrationBuilder.DropTable(
                name: "HIEConnections");

            migrationBuilder.DropTable(
                name: "InsuranceXMLSubmissions");

            migrationBuilder.DropTable(
                name: "IsolationOrders");

            migrationBuilder.DropTable(
                name: "LabAnalyzerTestMappings");

            migrationBuilder.DropTable(
                name: "LabConclusionTemplates");

            migrationBuilder.DropTable(
                name: "LabConnectionLogs");

            migrationBuilder.DropTable(
                name: "LabCriticalValueAlerts");

            migrationBuilder.DropTable(
                name: "LabCriticalValueConfigs");

            migrationBuilder.DropTable(
                name: "LabQCResults");

            migrationBuilder.DropTable(
                name: "LabRawResults");

            migrationBuilder.DropTable(
                name: "LabReferenceRanges");

            migrationBuilder.DropTable(
                name: "LabSampleTypes");

            migrationBuilder.DropTable(
                name: "LabTestGroups");

            migrationBuilder.DropTable(
                name: "LabTubeTypes");

            migrationBuilder.DropTable(
                name: "LabWorklists");

            migrationBuilder.DropTable(
                name: "MaintenanceRecords");

            migrationBuilder.DropTable(
                name: "MCISituationReports");

            migrationBuilder.DropTable(
                name: "MCIVictims");

            migrationBuilder.DropTable(
                name: "MealPlanItems");

            migrationBuilder.DropTable(
                name: "NutritionAssessments");

            migrationBuilder.DropTable(
                name: "NutritionMonitorings");

            migrationBuilder.DropTable(
                name: "OnlinePayments");

            migrationBuilder.DropTable(
                name: "OutbreakCases");

            migrationBuilder.DropTable(
                name: "PortalAppointments");

            migrationBuilder.DropTable(
                name: "QualityIndicatorValues");

            migrationBuilder.DropTable(
                name: "RehabSessions");

            migrationBuilder.DropTable(
                name: "RepairRequests");

            migrationBuilder.DropTable(
                name: "SatisfactionSurveys");

            migrationBuilder.DropTable(
                name: "StaffQualifications");

            migrationBuilder.DropTable(
                name: "TeleconsultationRequests");

            migrationBuilder.DropTable(
                name: "TeleConsultations");

            migrationBuilder.DropTable(
                name: "TeleFeedbacks");

            migrationBuilder.DropTable(
                name: "TelePrescriptionItems");

            migrationBuilder.DropTable(
                name: "TPNOrders");

            migrationBuilder.DropTable(
                name: "IncidentReports");

            migrationBuilder.DropTable(
                name: "DutyRosters");

            migrationBuilder.DropTable(
                name: "HAICases");

            migrationBuilder.DropTable(
                name: "LabAnalyzers");

            migrationBuilder.DropTable(
                name: "MCIEvents");

            migrationBuilder.DropTable(
                name: "DietOrders");

            migrationBuilder.DropTable(
                name: "MealPlans");

            migrationBuilder.DropTable(
                name: "NutritionScreenings");

            migrationBuilder.DropTable(
                name: "PortalAccounts");

            migrationBuilder.DropTable(
                name: "QualityIndicators");

            migrationBuilder.DropTable(
                name: "RehabTreatmentPlans");

            migrationBuilder.DropTable(
                name: "MedicalEquipments");

            migrationBuilder.DropTable(
                name: "MedicalStaffs");

            migrationBuilder.DropTable(
                name: "TelePrescriptions");

            migrationBuilder.DropTable(
                name: "Outbreaks");

            migrationBuilder.DropTable(
                name: "DietTypes");

            migrationBuilder.DropTable(
                name: "RehabReferrals");

            migrationBuilder.DropTable(
                name: "TeleSessions");

            migrationBuilder.DropTable(
                name: "TeleAppointments");
        }
    }
}
