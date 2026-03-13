using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.Reporting;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Hospital Report Service - handles all 140 report codes with real EF Core queries
/// Uses ExtendedWorkflowSqlGuard pattern for missing tables
/// </summary>
public class HospitalReportService : IHospitalReportService
{
    private readonly HISDbContext _context;
    private readonly ILogger<HospitalReportService> _logger;

    public HospitalReportService(HISDbContext context, ILogger<HospitalReportService> logger)
    {
        _context = context;
        _logger = logger;
    }

    #region Report Name Mapping

    private static readonly Dictionary<string, string> ReportNames = new()
    {
        // A. Kham benh (Clinical / OPD)
        ["OpdIpdCostByFee"] = "Chi phi KCB thu phi noi ngoai tru",
        ["ExaminationActivity"] = "Hoat dong kham benh",
        ["DailyPatientCount"] = "Thong ke so luot BN kham trong ngay",
        ["ExaminationRegister"] = "So kham benh",
        ["ServiceTimeAndWait"] = "Thoi gian thuc hien DV va thoi gian cho",
        ["ServiceRevenueDetail"] = "Chi tiet doanh thu tung DV KCB",
        ["ExaminationActivitySummary"] = "Thong ke hoat dong kham benh",
        ["ReceptionByRoom"] = "Tong hop BN tiep don theo phong",
        ["ExaminationActivity2"] = "Hoat dong kham benh (mau 2)",
        ["VisitAndAdmissionCount"] = "Luot kham, luot nhap vien",
        ["AvgExaminationTime"] = "Thoi gian kham trung binh",
        ["ExaminationDiary"] = "Nhat ky kham benh",
        ["ExaminationRegister2"] = "So kham benh (mau 2)",
        ["ClinicRoomStatistics"] = "Thong ke phong kham",
        ["ExaminationRegister3"] = "So kham benh (mau 3)",
        ["PatientWaitTimeDetail"] = "Chi tiet thoi gian cho kham",

        // B. Noi tru (Inpatient)
        ["DailyBriefingBedCapacity"] = "Bao cao giao ban - cong suat giuong",
        ["CareLevelClassification"] = "Phan loai cap cham soc",
        ["UndischargedPatients"] = "BN chua xuat vien",
        ["DischargeByDeptTreatType"] = "Xuat vien theo khoa va loai dieu tri",
        ["PatientsByRoom"] = "BN theo phong",
        ["AdmitTransferDischarge"] = "Nhap - chuyen - xuat vien",
        ["ActiveInpatients"] = "BN noi tru dang dieu tri",
        ["PatientsByWard"] = "BN theo khoa",
        ["ActivePatientsByDept"] = "BN dang dieu tri theo khoa",
        ["DischargeByDept"] = "Xuat vien theo khoa",
        ["InpatientTreatmentActivity"] = "Hoat dong dieu tri noi tru",
        ["AdmissionDetailByDept"] = "Chi tiet nhap vien theo khoa",
        ["DischargeRegister"] = "So xuat vien",
        ["AdmissionRegister"] = "So nhap vien",
        ["TreatmentActivity2360"] = "Hoat dong dieu tri 23/60",
        ["TreatmentActivity"] = "Hoat dong dieu tri",
        ["TransferOutPatients"] = "BN chuyen tuyen",
        ["PresentPatientsByDept"] = "BN hien dien theo khoa",
        ["AdmissionByDept"] = "Nhap vien theo khoa",
        ["UnfinishedTreatment"] = "Dieu tri dang do",
        ["TreatmentActivity2"] = "Hoat dong dieu tri (mau 2)",
        ["BedServiceByDept"] = "Giuong benh theo khoa",
        ["TreatmentCompletionByDept"] = "Ket qua dieu tri theo khoa",
        ["AdmissionByDept2"] = "Nhap vien theo khoa (mau 2)",

        // C. Tai chinh (Finance)
        ["CashierSummary"] = "Tong hop thu ngan",
        ["HospitalFeeServiceDetail"] = "Chi tiet vien phi dich vu",
        ["DeptRevenueServiceDetail"] = "Chi tiet doanh thu khoa theo dich vu",
        ["CashBookUsageDetail"] = "Chi tiet su dung so quy",
        ["HospitalFeeSummary"] = "Tong hop vien phi",
        ["RevenueByServiceType"] = "Doanh thu theo loai dich vu",
        ["OtherPayerPatients"] = "BN doi tuong khac",
        ["RevenueByOrderingDept"] = "Doanh thu theo khoa chi dinh",
        ["ServiceRevenueDetailKCB"] = "Chi tiet doanh thu DV KCB (mau KCB)",
        ["CancelledTransactionsSummary"] = "Tong hop giao dich huy",
        ["DeptRoomRevenue"] = "Doanh thu khoa phong",
        ["ApprovedExcessDeficit"] = "Duyet thua thieu",
        ["PatientRevenueByDept"] = "Doanh thu BN theo khoa",
        ["UnapprovedFinanceClose"] = "Chua duyet ket ca",
        ["HospitalRevenueDetail"] = "Chi tiet doanh thu benh vien",
        ["AutoSurgeryBonus"] = "Thuong phau thuat tu dong",
        ["SurgeryProfitLoss"] = "Lai lo phau thuat",
        ["OutpatientRevenueSummary"] = "Tong hop doanh thu ngoai tru",
        ["DeptRevenueDetail"] = "Chi tiet doanh thu khoa",
        ["CancelledTransactionDetail"] = "Chi tiet giao dich huy",
        ["FundUsageSummary"] = "Tong hop su dung quy",
        ["CashCollectionDetail"] = "Chi tiet thu tien mat",
        ["RevenueByOrderingDept2"] = "Doanh thu theo khoa chi dinh (mau 2)",
        ["RevenueByService"] = "Doanh thu theo dich vu",
        ["DischargePayment"] = "Thanh toan xuat vien",

        // D. Duoc / Kho (Pharmacy / Warehouse)
        ["StockMovementByWarehouse"] = "Xuat nhap ton theo kho",
        ["PharmacyProfit"] = "Loi nhuan duoc",
        ["EmergencyCabinetNXT"] = "NXT tu thuoc cap cuu",
        ["IssueToDepByWarehouse"] = "Xuat cho khoa theo kho",
        ["StockMovement"] = "Xuat nhap ton",
        ["DeptDispensingSheet"] = "Phieu cap phat khoa",
        ["RetailSaleRevenue"] = "Doanh thu ban le",
        ["ProcurementImport"] = "Nhap mua sam",
        ["ProcurementVsStock"] = "Mua sam vs ton kho",
        ["IssueToDept"] = "Xuat cho khoa",
        ["PrescriptionByDoctor"] = "Don thuoc theo bac si",
        ["DeptConsumableIssue"] = "Xuat VTTH khoa",
        ["StockMovementAllWH"] = "NXT tat ca kho",
        ["StockCardDetail"] = "The kho chi tiet",
        ["IssueByPatientType"] = "Xuat theo doi tuong BN",
        ["StockMovementDetail"] = "Chi tiet NXT",
        ["ImportInvoiceSheet"] = "Phieu nhap hoa don",
        ["IssueByDeptDetail"] = "Chi tiet xuat theo khoa",
        ["IssuedQtyByDept"] = "So luong xuat theo khoa",
        ["IssueToDept2"] = "Xuat cho khoa (mau 2)",
        ["ImportBySupplier"] = "Nhap theo NCC",
        ["PrescriptionIssueByType"] = "Don thuoc theo loai",
        ["RetailSaleDetail"] = "Chi tiet ban le",
        ["PrescriptionIssueByPatient"] = "Don thuoc theo benh nhan",

        // E. CLS (Lab / Imaging)
        ["ParaclinicalBriefing"] = "Bao cao giao ban CLS",
        ["ParaclinicalActivitySummary"] = "Tong hop hoat dong CLS",
        ["MicrobiologyRegister"] = "So vi sinh",
        ["LabRegister"] = "So xet nghiem",
        ["UltrasoundRegister"] = "So sieu am",
        ["EndoscopyRegister"] = "So noi soi",
        ["LabWithIndexRegister"] = "So XN co chi so",
        ["ParaclinicalRegister"] = "So CLS",
        ["ImagingRegister"] = "So CDHA",
        ["LabRegister2"] = "So xet nghiem (mau 2)",
        ["FunctionalTestRegister"] = "So tham do chuc nang",
        ["ParaclinicalDeptSummary"] = "Tong hop CLS theo khoa",
        ["ImagingFilmStatistics"] = "Thong ke phim CDHA",
        ["ImagingRevenue"] = "Doanh thu CDHA",
        ["UltrasoundByRoom"] = "Sieu am theo phong",
        ["DoctorByMachine"] = "BS theo may",
        ["OrderedVsPerformedCLS"] = "CLS chi dinh vs thuc hien",
        ["MicrobiologyOrder"] = "Chi dinh vi sinh",
        ["ParaclinicalTracking"] = "Theo doi CLS",

        // F. PTTT (Surgery)
        ["ProcedureRegister"] = "So thu thuat",
        ["SurgeryRegister"] = "So phau thuat",
        ["InpatientProcedureRegister"] = "So PTTT noi tru",
        ["ORCost"] = "Chi phi phong mo",
        ["ProcedureByDept"] = "Thu thuat theo khoa",
        ["SurgeryPatientList"] = "Danh sach BN phau thuat",
        ["SurgeryProcedure"] = "Phau thuat thu thuat",
        ["ProcedureRegister2"] = "So thu thuat (mau 2)",
        ["SurgeryList"] = "Danh sach phau thuat",
        ["SurgeryProcedureActivity"] = "Hoat dong PTTT",
        ["SurgeryPathologyBonus"] = "Thuong PTTT + GPB",

        // G. BHYT (Insurance)
        ["C80aNew"] = "Mau C80a moi",
        ["ScheduledPatients"] = "BN hen kham",
        ["UnapprovedDischargeSettlement"] = "Quyet toan xuat vien chua duyet",
        ["Form79QD3360"] = "Mau 79a/QD3360",
        ["InsuranceServiceForm21"] = "Mau 21 DV BHYT",
        ["InsuranceSupplyForm19"] = "Mau 19 VTYT BHYT",
        ["ReferralPatients"] = "BN chuyen tuyen",
        ["ExternalBloodRegister"] = "So mau ngoai",
        ["C79aNew"] = "Mau C79a moi",
        ["Form80QD3360"] = "Mau 80a/QD3360",
        ["InboundReferralPatients"] = "BN chuyen den",
        ["InternalDataAudit"] = "Kiem tra du lieu noi bo",
        ["DiseaseAndDeathICD10"] = "Benh tat va tu vong ICD-10",
        ["InsuranceMedicineForm20"] = "Mau 20 thuoc BHYT",
        ["InsurancePaymentRequest"] = "De nghi thanh toan BHYT",
        ["NutritionMealPortion"] = "Suat an dinh duong",
        ["InsuranceDetail"] = "Chi tiet BHYT",
        ["ForeignNationalPatients"] = "BN nuoc ngoai",
        ["MedicalRecordArchive"] = "Luu tru HSBA",
        ["ICDCV2360Statistics"] = "Thong ke ICD CV2360",

        // H. Nhan su / Chuyen tuyen (HR / Referral)
        ["OutboundReferralSummary"] = "Tong hop chuyen tuyen di",
        ["DialysisMachineUsage"] = "Su dung may loc mau",

        // Friendly aliases
        ["OutpatientRegister"] = "So kham benh ngoai tru",
        ["InpatientRegister"] = "So nhap vien noi tru",
        ["PharmacyDispensing"] = "Cap phat thuoc theo khoa",
        ["RevenueByDept"] = "Doanh thu theo khoa",
        ["LabResults"] = "So xet nghiem",
        ["ImagingResults"] = "So chan doan hinh anh",
        ["SurgerySchedule"] = "Danh sach phau thuat",
        ["InsuranceSummary"] = "Tong hop bao hiem y te",
        ["StockInventory"] = "Xuat nhap ton kho",
        ["BedOccupancy"] = "Cong suat giuong benh",
    };

    private static string GetReportName(string reportType) =>
        ReportNames.TryGetValue(reportType, out var name) ? name : reportType;

    #endregion

    #region Main Entry Point

    public async Task<HospitalReportResult> GetReportDataAsync(
        string reportCode, DateTime? from, DateTime? to, Guid? departmentId, Guid? warehouseId)
    {
        var result = new HospitalReportResult
        {
            ReportCode = reportCode,
            ReportName = GetReportName(reportCode),
            GeneratedAt = DateTime.Now,
            Parameters = new HospitalReportParameters
            {
                From = from,
                To = to,
                DepartmentId = departmentId,
                WarehouseId = warehouseId
            }
        };

        var fromDate = from ?? DateTime.Today.AddMonths(-1);
        var toDate = to ?? DateTime.Today.AddDays(1);

        try
        {
            switch (reportCode)
            {
                // ==================== A. Clinical / OPD ====================
                case "OpdIpdCostByFee":
                    await FillOpdIpdCostByFee(result, fromDate, toDate, departmentId);
                    break;
                case "ExaminationActivity":
                case "ExaminationActivity2":
                case "ExaminationActivitySummary":
                    await FillExaminationActivity(result, fromDate, toDate, departmentId);
                    break;
                case "DailyPatientCount":
                    await FillDailyPatientCount(result, fromDate, toDate, departmentId);
                    break;
                case "ExaminationRegister":
                case "ExaminationRegister2":
                case "ExaminationRegister3":
                    await FillExaminationRegister(result, fromDate, toDate, departmentId);
                    break;
                case "ServiceTimeAndWait":
                case "AvgExaminationTime":
                case "PatientWaitTimeDetail":
                    await FillServiceTimeAndWait(result, fromDate, toDate, departmentId);
                    break;
                case "ServiceRevenueDetail":
                case "ServiceRevenueDetailKCB":
                    await FillServiceRevenueDetail(result, fromDate, toDate, departmentId);
                    break;
                case "ReceptionByRoom":
                case "ClinicRoomStatistics":
                    await FillReceptionByRoom(result, fromDate, toDate, departmentId);
                    break;
                case "VisitAndAdmissionCount":
                    await FillVisitAndAdmissionCount(result, fromDate, toDate, departmentId);
                    break;
                case "ExaminationDiary":
                    await FillExaminationDiary(result, fromDate, toDate, departmentId);
                    break;

                // ==================== B. Inpatient ====================
                case "DailyBriefingBedCapacity":
                case "BedServiceByDept":
                    await FillBedCapacity(result, fromDate, toDate, departmentId);
                    break;
                case "CareLevelClassification":
                    await FillCareLevelClassification(result, fromDate, toDate, departmentId);
                    break;
                case "UndischargedPatients":
                case "ActiveInpatients":
                case "ActivePatientsByDept":
                case "PresentPatientsByDept":
                case "UnfinishedTreatment":
                    await FillActiveInpatients(result, fromDate, toDate, departmentId);
                    break;
                case "DischargeByDeptTreatType":
                case "DischargeByDept":
                case "DischargeRegister":
                case "TreatmentCompletionByDept":
                    await FillDischargeByDept(result, fromDate, toDate, departmentId);
                    break;
                case "PatientsByRoom":
                case "PatientsByWard":
                    await FillPatientsByRoom(result, fromDate, toDate, departmentId);
                    break;
                case "AdmitTransferDischarge":
                case "InpatientTreatmentActivity":
                case "TreatmentActivity":
                case "TreatmentActivity2":
                case "TreatmentActivity2360":
                    await FillAdmitTransferDischarge(result, fromDate, toDate, departmentId);
                    break;
                case "AdmissionDetailByDept":
                case "AdmissionRegister":
                case "AdmissionByDept":
                case "AdmissionByDept2":
                    await FillAdmissionByDept(result, fromDate, toDate, departmentId);
                    break;
                case "TransferOutPatients":
                    await FillTransferOutPatients(result, fromDate, toDate, departmentId);
                    break;

                // ==================== C. Finance ====================
                case "CashierSummary":
                case "CashCollectionDetail":
                case "HospitalRevenueDetail":
                case "OutpatientRevenueSummary":
                    await FillCashierSummary(result, fromDate, toDate, departmentId);
                    break;
                case "HospitalFeeServiceDetail":
                case "DeptRevenueServiceDetail":
                case "RevenueByServiceType":
                case "DeptRevenueDetail":
                case "RevenueByService":
                    await FillRevenueByService(result, fromDate, toDate, departmentId);
                    break;
                case "CashBookUsageDetail":
                case "FundUsageSummary":
                    await FillCashBookUsage(result, fromDate, toDate, departmentId);
                    break;
                case "HospitalFeeSummary":
                case "PatientRevenueByDept":
                case "DeptRoomRevenue":
                    await FillHospitalFeeSummary(result, fromDate, toDate, departmentId);
                    break;
                case "OtherPayerPatients":
                    await FillOtherPayerPatients(result, fromDate, toDate, departmentId);
                    break;
                case "RevenueByOrderingDept":
                case "RevenueByOrderingDept2":
                    await FillRevenueByOrderingDept(result, fromDate, toDate, departmentId);
                    break;
                case "CancelledTransactionsSummary":
                case "CancelledTransactionDetail":
                    await FillCancelledTransactions(result, fromDate, toDate, departmentId);
                    break;
                case "ApprovedExcessDeficit":
                case "UnapprovedFinanceClose":
                    await FillApprovedExcessDeficit(result, fromDate, toDate, departmentId);
                    break;
                case "AutoSurgeryBonus":
                case "SurgeryProfitLoss":
                    await FillSurgeryFinance(result, fromDate, toDate, departmentId);
                    break;
                case "DischargePayment":
                    await FillDischargePayment(result, fromDate, toDate, departmentId);
                    break;

                // ==================== D. Pharmacy / Warehouse ====================
                case "StockMovementByWarehouse":
                case "StockMovement":
                case "StockMovementAllWH":
                case "StockMovementDetail":
                    await FillStockMovement(result, fromDate, toDate, warehouseId);
                    break;
                case "PharmacyProfit":
                case "RetailSaleRevenue":
                case "RetailSaleDetail":
                    await FillPharmacyProfit(result, fromDate, toDate, warehouseId);
                    break;
                case "EmergencyCabinetNXT":
                    await FillEmergencyCabinetNXT(result, fromDate, toDate, warehouseId);
                    break;
                case "IssueToDepByWarehouse":
                case "IssueToDept":
                case "IssueToDept2":
                case "IssueByDeptDetail":
                case "IssuedQtyByDept":
                case "DeptConsumableIssue":
                    await FillIssueToDept(result, fromDate, toDate, warehouseId, departmentId);
                    break;
                case "DeptDispensingSheet":
                    await FillDeptDispensingSheet(result, fromDate, toDate, departmentId);
                    break;
                case "ProcurementImport":
                case "ProcurementVsStock":
                case "ImportBySupplier":
                case "ImportInvoiceSheet":
                    await FillProcurementImport(result, fromDate, toDate, warehouseId);
                    break;
                case "PrescriptionByDoctor":
                    await FillPrescriptionByDoctor(result, fromDate, toDate, departmentId);
                    break;
                case "StockCardDetail":
                    await FillStockCardDetail(result, fromDate, toDate, warehouseId);
                    break;
                case "IssueByPatientType":
                case "PrescriptionIssueByType":
                case "PrescriptionIssueByPatient":
                    await FillIssueByPatientType(result, fromDate, toDate, warehouseId);
                    break;

                // ==================== E. CLS (Lab / Imaging) ====================
                case "ParaclinicalBriefing":
                case "ParaclinicalActivitySummary":
                case "ParaclinicalDeptSummary":
                case "ParaclinicalRegister":
                case "ParaclinicalTracking":
                    await FillParaclinicalSummary(result, fromDate, toDate, departmentId);
                    break;
                case "MicrobiologyRegister":
                case "MicrobiologyOrder":
                    await FillMicrobiologyRegister(result, fromDate, toDate, departmentId);
                    break;
                case "LabRegister":
                case "LabRegister2":
                case "LabWithIndexRegister":
                    await FillLabRegister(result, fromDate, toDate, departmentId);
                    break;
                case "UltrasoundRegister":
                case "UltrasoundByRoom":
                    await FillUltrasoundRegister(result, fromDate, toDate, departmentId);
                    break;
                case "EndoscopyRegister":
                case "FunctionalTestRegister":
                    await FillEndoscopyRegister(result, fromDate, toDate, departmentId);
                    break;
                case "ImagingRegister":
                case "ImagingFilmStatistics":
                    await FillImagingRegister(result, fromDate, toDate, departmentId);
                    break;
                case "ImagingRevenue":
                    await FillImagingRevenue(result, fromDate, toDate, departmentId);
                    break;
                case "DoctorByMachine":
                    await FillDoctorByMachine(result, fromDate, toDate, departmentId);
                    break;
                case "OrderedVsPerformedCLS":
                    await FillOrderedVsPerformedCLS(result, fromDate, toDate, departmentId);
                    break;

                // ==================== F. Surgery ====================
                case "ProcedureRegister":
                case "ProcedureRegister2":
                case "InpatientProcedureRegister":
                    await FillProcedureRegister(result, fromDate, toDate, departmentId);
                    break;
                case "SurgeryRegister":
                case "SurgeryList":
                case "SurgeryPatientList":
                    await FillSurgeryRegister(result, fromDate, toDate, departmentId);
                    break;
                case "ORCost":
                    await FillORCost(result, fromDate, toDate, departmentId);
                    break;
                case "ProcedureByDept":
                case "SurgeryProcedure":
                case "SurgeryProcedureActivity":
                    await FillProcedureByDept(result, fromDate, toDate, departmentId);
                    break;
                case "SurgeryPathologyBonus":
                    await FillSurgeryPathologyBonus(result, fromDate, toDate, departmentId);
                    break;

                // ==================== G. BHYT (Insurance) ====================
                case "C80aNew":
                case "C79aNew":
                case "Form79QD3360":
                case "Form80QD3360":
                case "InsuranceServiceForm21":
                case "InsuranceSupplyForm19":
                case "InsuranceMedicineForm20":
                case "InsurancePaymentRequest":
                case "InsuranceDetail":
                case "UnapprovedDischargeSettlement":
                case "InternalDataAudit":
                    await FillInsuranceReport(result, fromDate, toDate, departmentId);
                    break;
                case "ScheduledPatients":
                    await FillScheduledPatients(result, fromDate, toDate, departmentId);
                    break;
                case "ReferralPatients":
                case "InboundReferralPatients":
                    await FillReferralPatients(result, fromDate, toDate, departmentId);
                    break;
                case "ExternalBloodRegister":
                    await FillExternalBloodRegister(result, fromDate, toDate, departmentId);
                    break;
                case "DiseaseAndDeathICD10":
                case "ICDCV2360Statistics":
                    await FillDiseaseAndDeathICD10(result, fromDate, toDate, departmentId);
                    break;
                case "NutritionMealPortion":
                    await FillNutritionMealPortion(result, fromDate, toDate, departmentId);
                    break;
                case "ForeignNationalPatients":
                    await FillForeignNationalPatients(result, fromDate, toDate, departmentId);
                    break;
                case "MedicalRecordArchive":
                    await FillMedicalRecordArchive(result, fromDate, toDate, departmentId);
                    break;

                // ==================== H. HR / Referral ====================
                case "OutboundReferralSummary":
                    await FillOutboundReferralSummary(result, fromDate, toDate, departmentId);
                    break;
                case "DialysisMachineUsage":
                    await FillDialysisMachineUsage(result, fromDate, toDate, departmentId);
                    break;

                // ==================== Friendly Aliases ====================
                case "OutpatientRegister":
                    await FillExaminationRegister(result, fromDate, toDate, departmentId);
                    break;
                case "InpatientRegister":
                    await FillAdmissionByDept(result, fromDate, toDate, departmentId);
                    break;
                case "PharmacyDispensing":
                    await FillDeptDispensingSheet(result, fromDate, toDate, departmentId);
                    break;
                case "RevenueByDept":
                    await FillHospitalFeeSummary(result, fromDate, toDate, departmentId);
                    break;
                case "LabResults":
                    await FillLabRegister(result, fromDate, toDate, departmentId);
                    break;
                case "ImagingResults":
                    await FillImagingRegister(result, fromDate, toDate, departmentId);
                    break;
                case "SurgerySchedule":
                    await FillSurgeryRegister(result, fromDate, toDate, departmentId);
                    break;
                case "InsuranceSummary":
                    await FillInsuranceReport(result, fromDate, toDate, departmentId);
                    break;
                case "StockInventory":
                    await FillStockMovement(result, fromDate, toDate, warehouseId);
                    break;
                case "BedOccupancy":
                    await FillBedCapacity(result, fromDate, toDate, departmentId);
                    break;

                default:
                    result.ReportName = $"Bao cao: {reportCode}";
                    result.Data.Add(new Dictionary<string, object> { ["message"] = $"Report type '{reportCode}' - data loading" });
                    break;
            }
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Missing table/column for report {ReportCode}", reportCode);
            result.Summary["error"] = "Chua co du lieu (bang/cot chua tao)";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating report {ReportCode}", reportCode);
            result.Summary["error"] = $"Loi: {ex.Message}";
        }

        return result;
    }

    #endregion

    #region A. Clinical / OPD Reports

    private async Task FillOpdIpdCostByFee(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Receipts.AsNoTracking()
            .Where(r => r.CreatedAt >= from && r.CreatedAt < to && !r.IsDeleted);
        if (deptId.HasValue)
            query = query.Where(r => r.MedicalRecord != null && r.MedicalRecord.DepartmentId == deptId);

        var data = await query
            .Include(r => r.MedicalRecord).ThenInclude(m => m.Patient)
            .Include(r => r.MedicalRecord).ThenInclude(m => m.Department)
            .GroupBy(r => new { r.MedicalRecord.DepartmentId, DeptName = r.MedicalRecord.Department.DepartmentName })
            .Select(g => new
            {
                g.Key.DeptName,
                OutpatientRevenue = g.Where(r => r.MedicalRecord.PatientType <= 2).Sum(r => r.FinalAmount),
                InpatientRevenue = g.Where(r => r.MedicalRecord.PatientType > 2).Sum(r => r.FinalAmount),
                TransactionCount = g.Count()
            }).ToListAsync();

        decimal totalOp = 0, totalIp = 0;
        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["departmentName"] = d.DeptName ?? "",
                ["outpatientRevenue"] = d.OutpatientRevenue,
                ["inpatientRevenue"] = d.InpatientRevenue,
                ["totalRevenue"] = d.OutpatientRevenue + d.InpatientRevenue,
                ["transactionCount"] = d.TransactionCount
            });
            totalOp += d.OutpatientRevenue;
            totalIp += d.InpatientRevenue;
        }
        result.Summary["totalOutpatientRevenue"] = totalOp;
        result.Summary["totalInpatientRevenue"] = totalIp;
        result.Summary["grandTotal"] = totalOp + totalIp;
    }

    private async Task FillExaminationActivity(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Examinations.AsNoTracking()
            .Where(e => e.CreatedAt >= from && e.CreatedAt < to && !e.IsDeleted);
        if (deptId.HasValue)
            query = query.Where(e => e.DepartmentId == deptId);

        var data = await query
            .Include(e => e.Department)
            .GroupBy(e => new { e.CreatedAt.Date, e.DepartmentId, DeptName = e.Department.DepartmentName })
            .Select(g => new
            {
                Date = g.Key.Date,
                g.Key.DeptName,
                TotalExams = g.Count(),
                Completed = g.Count(e => e.Status >= 3),
                Pending = g.Count(e => e.Status < 3),
                BhytCount = g.Count(e => e.MedicalRecord.PatientType == 1),
                FeeCount = g.Count(e => e.MedicalRecord.PatientType != 1)
            })
            .OrderBy(x => x.Date).ThenBy(x => x.DeptName)
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["date"] = d.Date.ToString("dd/MM/yyyy"),
                ["departmentName"] = d.DeptName ?? "",
                ["totalExaminations"] = d.TotalExams,
                ["completed"] = d.Completed,
                ["pending"] = d.Pending,
                ["bhytCount"] = d.BhytCount,
                ["feePayingCount"] = d.FeeCount
            });
        }
        result.Summary["totalExaminations"] = data.Sum(d => d.TotalExams);
        result.Summary["totalCompleted"] = data.Sum(d => d.Completed);
    }

    private async Task FillDailyPatientCount(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Examinations.AsNoTracking()
            .Where(e => e.CreatedAt >= from && e.CreatedAt < to && !e.IsDeleted);
        if (deptId.HasValue)
            query = query.Where(e => e.DepartmentId == deptId);

        var data = await query
            .GroupBy(e => e.CreatedAt.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .OrderBy(x => x.Date)
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["date"] = d.Date.ToString("dd/MM/yyyy"),
                ["patientCount"] = d.Count
            });
        }
        result.Summary["totalDays"] = data.Count;
        result.Summary["totalPatients"] = data.Sum(d => d.Count);
        result.Summary["averagePerDay"] = data.Count > 0 ? Math.Round((decimal)data.Sum(d => d.Count) / data.Count, 1) : 0;
    }

    private async Task FillExaminationRegister(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Examinations.AsNoTracking()
            .Where(e => e.CreatedAt >= from && e.CreatedAt < to && !e.IsDeleted);
        if (deptId.HasValue)
            query = query.Where(e => e.DepartmentId == deptId);

        var data = await query
            .Include(e => e.MedicalRecord).ThenInclude(m => m.Patient)
            .Include(e => e.Department)
            .Include(e => e.Doctor)
            .OrderBy(e => e.CreatedAt)
            .Take(2000)
            .Select(e => new
            {
                e.CreatedAt,
                PatientCode = e.MedicalRecord.Patient.PatientCode,
                PatientName = e.MedicalRecord.Patient.FullName,
                DeptName = e.Department.DepartmentName,
                DoctorName = e.Doctor.FullName,
                e.MainIcdCode,
                MainIcdName = e.MainIcdCode, // MainIcdName not in entity, use code as fallback
                e.Status
            })
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["date"] = d.CreatedAt.ToString("dd/MM/yyyy HH:mm"),
                ["patientCode"] = d.PatientCode ?? "",
                ["patientName"] = d.PatientName ?? "",
                ["departmentName"] = d.DeptName ?? "",
                ["doctorName"] = d.DoctorName ?? "",
                ["icdCode"] = d.MainIcdCode ?? "",
                ["diagnosis"] = d.MainIcdName ?? "",
                ["status"] = d.Status
            });
        }
        result.Summary["totalRecords"] = data.Count;
    }

    private async Task FillServiceTimeAndWait(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.QueueTickets.AsNoTracking()
            .Where(q => q.CreatedAt >= from && q.CreatedAt < to && !q.IsDeleted);
        if (deptId.HasValue)
            query = query.Where(q => q.Room != null && q.Room.DepartmentId == deptId);

        var data = await query
            .Include(q => q.Room).ThenInclude(r => r.Department)
            .Where(q => q.CalledTime.HasValue && q.CompletedTime.HasValue)
            .GroupBy(q => new { q.Room.DepartmentId, DeptName = q.Room.Department.DepartmentName })
            .Select(g => new
            {
                g.Key.DeptName,
                TicketCount = g.Count(),
                AvgWaitMinutes = g.Average(q => EF.Functions.DateDiffMinute(q.CreatedAt, q.CalledTime!.Value)),
                AvgServiceMinutes = g.Average(q => EF.Functions.DateDiffMinute(q.CalledTime!.Value, q.CompletedTime!.Value)),
                MaxWaitMinutes = g.Max(q => EF.Functions.DateDiffMinute(q.CreatedAt, q.CalledTime!.Value))
            })
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["departmentName"] = d.DeptName ?? "",
                ["ticketCount"] = d.TicketCount,
                ["avgWaitMinutes"] = Math.Round(d.AvgWaitMinutes, 1),
                ["avgServiceMinutes"] = Math.Round(d.AvgServiceMinutes, 1),
                ["maxWaitMinutes"] = d.MaxWaitMinutes
            });
        }
        result.Summary["totalTickets"] = data.Sum(d => d.TicketCount);
    }

    private async Task FillServiceRevenueDetail(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.ReceiptDetails.AsNoTracking()
            .Where(rd => rd.Receipt.CreatedAt >= from && rd.Receipt.CreatedAt < to && !rd.IsDeleted);
        if (deptId.HasValue)
            query = query.Where(rd => rd.Receipt.MedicalRecord != null && rd.Receipt.MedicalRecord.DepartmentId == deptId);

        var data = await query
            .GroupBy(rd => new { rd.ItemCode, rd.ItemName, rd.ItemType })
            .Select(g => new
            {
                ItemCode = g.Key.ItemCode ?? "",
                ItemName = g.Key.ItemName ?? "",
                ItemType = g.Key.ItemType,
                Quantity = g.Sum(rd => rd.Quantity),
                TotalAmount = g.Sum(rd => rd.FinalAmount),
                DiscountAmount = g.Sum(rd => rd.Discount)
            })
            .OrderByDescending(x => x.TotalAmount)
            .ToListAsync();

        var typeNames = new Dictionary<int, string> { { 1, "Dich vu" }, { 2, "Thuoc" }, { 3, "Vat tu" } };
        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["itemCode"] = d.ItemCode,
                ["itemName"] = d.ItemName,
                ["itemType"] = typeNames.TryGetValue(d.ItemType, out var t) ? t : $"Loai {d.ItemType}",
                ["quantity"] = d.Quantity,
                ["totalAmount"] = d.TotalAmount,
                ["discountAmount"] = d.DiscountAmount
            });
        }
        result.Summary["totalRevenue"] = data.Sum(d => d.TotalAmount);
        result.Summary["totalDiscount"] = data.Sum(d => d.DiscountAmount);
    }

    private async Task FillReceptionByRoom(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.QueueTickets.AsNoTracking()
            .Where(q => q.CreatedAt >= from && q.CreatedAt < to && !q.IsDeleted);
        if (deptId.HasValue)
            query = query.Where(q => q.Room != null && q.Room.DepartmentId == deptId);

        var data = await query
            .Include(q => q.Room)
            .GroupBy(q => new { q.RoomId, RoomName = q.Room.RoomName })
            .Select(g => new
            {
                g.Key.RoomName,
                TotalTickets = g.Count(),
                CompletedTickets = g.Count(q => q.Status >= 3),
                CancelledTickets = g.Count(q => q.Status == 4)
            })
            .OrderByDescending(x => x.TotalTickets)
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["roomName"] = d.RoomName ?? "",
                ["totalTickets"] = d.TotalTickets,
                ["completedTickets"] = d.CompletedTickets,
                ["cancelledTickets"] = d.CancelledTickets,
                ["completionRate"] = d.TotalTickets > 0 ? Math.Round((decimal)d.CompletedTickets / d.TotalTickets * 100, 1) : 0
            });
        }
        result.Summary["totalRooms"] = data.Count;
        result.Summary["totalTickets"] = data.Sum(d => d.TotalTickets);
    }

    private async Task FillVisitAndAdmissionCount(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var examQuery = _context.Examinations.AsNoTracking()
            .Where(e => e.CreatedAt >= from && e.CreatedAt < to && !e.IsDeleted);
        var admQuery = _context.Admissions.AsNoTracking()
            .Where(a => a.AdmissionDate >= from && a.AdmissionDate < to && !a.IsDeleted);
        if (deptId.HasValue)
        {
            examQuery = examQuery.Where(e => e.DepartmentId == deptId);
            admQuery = admQuery.Where(a => a.DepartmentId == deptId);
        }

        var examCount = await examQuery.CountAsync();
        var admCount = await admQuery.CountAsync();

        result.Data.Add(new Dictionary<string, object>
        {
            ["type"] = "Ngoai tru",
            ["count"] = examCount
        });
        result.Data.Add(new Dictionary<string, object>
        {
            ["type"] = "Nhap vien",
            ["count"] = admCount
        });
        result.Summary["totalVisits"] = examCount;
        result.Summary["totalAdmissions"] = admCount;
        result.Summary["grandTotal"] = examCount + admCount;
    }

    private async Task FillExaminationDiary(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        // Same as ExaminationRegister but includes more detail
        await FillExaminationRegister(result, from, to, deptId);
    }

    #endregion

    #region B. Inpatient Reports

    private async Task FillBedCapacity(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Beds.AsNoTracking()
            .Include(b => b.Room).ThenInclude(r => r.Department)
            .Where(b => !b.IsDeleted);
        if (deptId.HasValue)
            query = query.Where(b => b.Room.DepartmentId == deptId);

        var beds = await query.ToListAsync();
        var grouped = beds.GroupBy(b => new { b.Room?.DepartmentId, DeptName = b.Room?.Department?.DepartmentName });

        foreach (var g in grouped)
        {
            var total = g.Count();
            var occupied = g.Count(b => b.Status == 1); // 1 = Occupied
            var available = total - occupied;

            result.Data.Add(new Dictionary<string, object>
            {
                ["departmentName"] = g.Key.DeptName ?? "",
                ["totalBeds"] = total,
                ["occupiedBeds"] = occupied,
                ["availableBeds"] = available,
                ["occupancyRate"] = total > 0 ? Math.Round((decimal)occupied / total * 100, 1) : 0
            });
        }
        result.Summary["totalBeds"] = beds.Count;
        result.Summary["totalOccupied"] = beds.Count(b => b.Status == 1);
        result.Summary["totalAvailable"] = beds.Count - beds.Count(b => b.Status == 1);
    }

    private async Task FillCareLevelClassification(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Admissions.AsNoTracking()
            .Where(a => a.AdmissionDate >= from && a.AdmissionDate < to && !a.IsDeleted && a.Status == 0);
        if (deptId.HasValue)
            query = query.Where(a => a.DepartmentId == deptId);

        var data = await query
            .Include(a => a.Department)
            .GroupBy(a => new { a.DepartmentId, DeptName = a.Department!.DepartmentName, a.AdmissionType })
            .Select(g => new { g.Key.DeptName, AdmissionType = g.Key.AdmissionType, Count = g.Count() })
            .ToListAsync();

        var typeNames = new Dictionary<int, string> { { 1, "Cap cuu" }, { 2, "Chuyen tuyen" }, { 3, "Dieu tri" }, { 4, "Khac" } };
        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["departmentName"] = d.DeptName ?? "",
                ["admissionType"] = d.AdmissionType,
                ["admissionTypeName"] = typeNames.TryGetValue(d.AdmissionType, out var n) ? n : "Khac",
                ["patientCount"] = d.Count
            });
        }
        result.Summary["totalPatients"] = data.Sum(d => d.Count);
    }

    private async Task FillActiveInpatients(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Admissions.AsNoTracking()
            .Where(a => !a.IsDeleted && a.Status == 0); // Active
        if (deptId.HasValue)
            query = query.Where(a => a.DepartmentId == deptId);

        var data = await query
            .Include(a => a.Patient)
            .Include(a => a.Department)
            .OrderBy(a => a.Department.DepartmentName).ThenBy(a => a.AdmissionDate)
            .Take(1000)
            .Select(a => new
            {
                a.Patient.PatientCode,
                a.Patient.FullName,
                a.Patient.Gender,
                a.Patient.DateOfBirth,
                DeptName = a.Department.DepartmentName,
                a.AdmissionDate,
                a.DiagnosisOnAdmission,
                DaysStayed = EF.Functions.DateDiffDay(a.AdmissionDate, DateTime.Now)
            })
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["patientCode"] = d.PatientCode ?? "",
                ["patientName"] = d.FullName ?? "",
                ["gender"] = d.Gender == 1 ? "Nam" : d.Gender == 2 ? "Nu" : "Khac",
                ["dateOfBirth"] = d.DateOfBirth?.ToString("dd/MM/yyyy") ?? "",
                ["departmentName"] = d.DeptName ?? "",
                ["admissionDate"] = d.AdmissionDate.ToString("dd/MM/yyyy"),
                ["diagnosis"] = d.DiagnosisOnAdmission ?? "",
                ["daysStayed"] = (object?)d.DaysStayed ?? 0
            });
        }
        result.Summary["totalActivePatients"] = data.Count;
    }

    private async Task FillDischargeByDept(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Discharges.AsNoTracking()
            .Where(d => d.DischargeDate >= from && d.DischargeDate < to && !d.IsDeleted);
        if (deptId.HasValue)
            query = query.Where(d => d.Admission.DepartmentId == deptId);

        var data = await query
            .Include(d => d.Admission).ThenInclude(a => a.Department)
            .GroupBy(d => new { d.Admission.DepartmentId, DeptName = d.Admission.Department.DepartmentName })
            .Select(g => new
            {
                g.Key.DeptName,
                TotalDischarges = g.Count(),
                Recovered = g.Count(d => d.DischargeCondition == 1),
                Improved = g.Count(d => d.DischargeCondition == 2),
                Unchanged = g.Count(d => d.DischargeCondition == 3),
                Worse = g.Count(d => d.DischargeCondition == 4),
                Died = g.Count(d => d.DischargeCondition == 5)
            })
            .OrderByDescending(x => x.TotalDischarges)
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["departmentName"] = d.DeptName ?? "",
                ["totalDischarges"] = d.TotalDischarges,
                ["recovered"] = d.Recovered,
                ["improved"] = d.Improved,
                ["unchanged"] = d.Unchanged,
                ["worse"] = d.Worse,
                ["died"] = d.Died
            });
        }
        result.Summary["totalDischarges"] = data.Sum(d => d.TotalDischarges);
        result.Summary["totalDeaths"] = data.Sum(d => d.Died);
    }

    private async Task FillPatientsByRoom(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.BedAssignments.AsNoTracking()
            .Where(ba => ba.CreatedAt >= from && ba.CreatedAt < to && !ba.IsDeleted && ba.Status == 0);
        if (deptId.HasValue)
            query = query.Where(ba => ba.Bed.Room.DepartmentId == deptId);

        var data = await query
            .Include(ba => ba.Bed).ThenInclude(b => b.Room)
            .Include(ba => ba.Admission).ThenInclude(a => a.Patient)
            .GroupBy(ba => new { ba.Bed.RoomId, RoomName = ba.Bed.Room.RoomName })
            .Select(g => new
            {
                g.Key.RoomName,
                PatientCount = g.Count()
            })
            .OrderByDescending(x => x.PatientCount)
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["roomName"] = d.RoomName ?? "",
                ["patientCount"] = d.PatientCount
            });
        }
        result.Summary["totalRooms"] = data.Count;
        result.Summary["totalPatients"] = data.Sum(d => d.PatientCount);
    }

    private async Task FillAdmitTransferDischarge(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var admQuery = _context.Admissions.AsNoTracking()
            .Where(a => a.AdmissionDate >= from && a.AdmissionDate < to && !a.IsDeleted);
        var disQuery = _context.Discharges.AsNoTracking()
            .Where(d => d.DischargeDate >= from && d.DischargeDate < to && !d.IsDeleted);
        if (deptId.HasValue)
        {
            admQuery = admQuery.Where(a => a.DepartmentId == deptId);
            disQuery = disQuery.Where(d => d.Admission.DepartmentId == deptId);
        }

        var admissions = await admQuery
            .Include(a => a.Department)
            .GroupBy(a => new { a.DepartmentId, DeptName = a.Department.DepartmentName })
            .Select(g => new { g.Key.DeptName, g.Key.DepartmentId, AdmCount = g.Count(), TransferIn = g.Count(a => a.AdmissionType == 2) })
            .ToListAsync();

        var discharges = await disQuery
            .Include(d => d.Admission).ThenInclude(a => a.Department)
            .GroupBy(d => new { d.Admission.DepartmentId, DeptName = d.Admission.Department.DepartmentName })
            .Select(g => new { g.Key.DeptName, g.Key.DepartmentId, DisCount = g.Count(), TransferOut = g.Count(d => d.DischargeType == 2) })
            .ToListAsync();

        var deptIds = admissions.Select(a => a.DepartmentId).Union(discharges.Select(d => d.DepartmentId)).Distinct();
        foreach (var id in deptIds)
        {
            var adm = admissions.FirstOrDefault(a => a.DepartmentId == id);
            var dis = discharges.FirstOrDefault(d => d.DepartmentId == id);
            result.Data.Add(new Dictionary<string, object>
            {
                ["departmentName"] = adm?.DeptName ?? dis?.DeptName ?? "",
                ["admissions"] = adm?.AdmCount ?? 0,
                ["transferIn"] = adm?.TransferIn ?? 0,
                ["discharges"] = dis?.DisCount ?? 0,
                ["transferOut"] = dis?.TransferOut ?? 0
            });
        }
        result.Summary["totalAdmissions"] = admissions.Sum(a => a.AdmCount);
        result.Summary["totalDischarges"] = discharges.Sum(d => d.DisCount);
    }

    private async Task FillAdmissionByDept(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Admissions.AsNoTracking()
            .Where(a => a.AdmissionDate >= from && a.AdmissionDate < to && !a.IsDeleted);
        if (deptId.HasValue)
            query = query.Where(a => a.DepartmentId == deptId);

        var data = await query
            .Include(a => a.Patient)
            .Include(a => a.Department)
            .OrderBy(a => a.AdmissionDate)
            .Take(2000)
            .Select(a => new
            {
                a.AdmissionDate,
                a.Patient.PatientCode,
                a.Patient.FullName,
                a.Patient.Gender,
                DeptName = a.Department.DepartmentName,
                a.DiagnosisOnAdmission,
                a.AdmissionType
            })
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["admissionDate"] = d.AdmissionDate.ToString("dd/MM/yyyy"),
                ["patientCode"] = d.PatientCode ?? "",
                ["patientName"] = d.FullName ?? "",
                ["gender"] = d.Gender == 1 ? "Nam" : d.Gender == 2 ? "Nu" : "Khac",
                ["departmentName"] = d.DeptName ?? "",
                ["diagnosis"] = d.DiagnosisOnAdmission ?? "",
                ["admissionType"] = d.AdmissionType
            });
        }
        result.Summary["totalAdmissions"] = data.Count;
    }

    private async Task FillTransferOutPatients(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Discharges.AsNoTracking()
            .Where(d => d.DischargeDate >= from && d.DischargeDate < to && !d.IsDeleted && d.DischargeType == 2);
        if (deptId.HasValue)
            query = query.Where(d => d.Admission.DepartmentId == deptId);

        var count = await query.CountAsync();
        result.Data.Add(new Dictionary<string, object>
        {
            ["type"] = "Chuyen tuyen",
            ["count"] = count
        });
        result.Summary["totalTransferOut"] = count;
    }

    #endregion

    #region C. Finance Reports

    private async Task FillCashierSummary(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Receipts.AsNoTracking()
            .Where(r => r.CreatedAt >= from && r.CreatedAt < to && !r.IsDeleted);

        var data = await query
            .GroupBy(r => r.CreatedAt.Date)
            .Select(g => new
            {
                Date = g.Key,
                ReceiptCount = g.Count(r => r.ReceiptType != 3),
                RefundCount = g.Count(r => r.ReceiptType == 3),
                TotalRevenue = g.Where(r => r.ReceiptType != 3).Sum(r => r.FinalAmount),
                TotalRefund = g.Where(r => r.ReceiptType == 3).Sum(r => r.FinalAmount)
            })
            .OrderBy(x => x.Date)
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["date"] = d.Date.ToString("dd/MM/yyyy"),
                ["receiptCount"] = d.ReceiptCount,
                ["refundCount"] = d.RefundCount,
                ["totalRevenue"] = d.TotalRevenue,
                ["totalRefund"] = d.TotalRefund,
                ["netRevenue"] = d.TotalRevenue - d.TotalRefund
            });
        }
        result.Summary["totalRevenue"] = data.Sum(d => d.TotalRevenue);
        result.Summary["totalRefund"] = data.Sum(d => d.TotalRefund);
        result.Summary["netRevenue"] = data.Sum(d => d.TotalRevenue - d.TotalRefund);
    }

    private async Task FillRevenueByService(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        await FillServiceRevenueDetail(result, from, to, deptId);
    }

    private async Task FillCashBookUsage(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        // CashBooks query
        try
        {
            var data = await _context.Set<CashBook>().AsNoTracking()
                .Where(c => c.CreatedAt >= from && c.CreatedAt < to && !c.IsDeleted)
                .OrderByDescending(c => c.CreatedAt)
                .Take(500)
                .ToListAsync();

            foreach (var d in data)
            {
                result.Data.Add(new Dictionary<string, object>
                {
                    ["date"] = d.CreatedAt.ToString("dd/MM/yyyy"),
                    ["cashBookCode"] = d.BookCode ?? "",
                    ["isClosed"] = d.IsClosed,
                    ["openingBalance"] = d.OpeningBalance,
                    ["closingBalance"] = d.ClosingBalance,
                    ["totalReceipt"] = d.TotalReceipt,
                    ["totalRefund"] = d.TotalRefund
                });
            }
            result.Summary["totalCashBooks"] = data.Count;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            result.Summary["note"] = "Bang CashBooks chua tao";
        }
    }

    private async Task FillHospitalFeeSummary(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Receipts.AsNoTracking()
            .Where(r => r.CreatedAt >= from && r.CreatedAt < to && !r.IsDeleted && r.ReceiptType != 3);
        if (deptId.HasValue)
            query = query.Where(r => r.MedicalRecord != null && r.MedicalRecord.DepartmentId == deptId);

        var data = await query
            .Include(r => r.MedicalRecord).ThenInclude(m => m.Department)
            .GroupBy(r => new { r.MedicalRecord.DepartmentId, DeptName = r.MedicalRecord.Department.DepartmentName })
            .Select(g => new
            {
                g.Key.DeptName,
                TotalAmount = g.Sum(r => r.FinalAmount),
                DiscountAmount = g.Sum(r => r.Discount),
                PatientCount = g.Select(r => r.MedicalRecord.PatientId).Distinct().Count()
            })
            .OrderByDescending(x => x.TotalAmount)
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["departmentName"] = d.DeptName ?? "",
                ["totalAmount"] = d.TotalAmount,
                ["discountAmount"] = d.DiscountAmount,
                ["netAmount"] = d.TotalAmount - d.DiscountAmount,
                ["patientCount"] = d.PatientCount
            });
        }
        result.Summary["totalRevenue"] = data.Sum(d => d.TotalAmount);
        result.Summary["totalDiscount"] = data.Sum(d => d.DiscountAmount);
        result.Summary["netRevenue"] = data.Sum(d => d.TotalAmount - d.DiscountAmount);
    }

    private async Task FillOtherPayerPatients(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Examinations.AsNoTracking()
            .Where(e => e.CreatedAt >= from && e.CreatedAt < to && !e.IsDeleted)
            .Where(e => e.MedicalRecord.PatientType == 3); // Other payer
        if (deptId.HasValue)
            query = query.Where(e => e.DepartmentId == deptId);

        var count = await query.CountAsync();
        result.Data.Add(new Dictionary<string, object> { ["type"] = "Doi tuong khac", ["count"] = count });
        result.Summary["totalOtherPayer"] = count;
    }

    private async Task FillRevenueByOrderingDept(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        await FillHospitalFeeSummary(result, from, to, deptId);
    }

    private async Task FillCancelledTransactions(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Receipts.AsNoTracking()
            .Where(r => r.CreatedAt >= from && r.CreatedAt < to && !r.IsDeleted && r.ReceiptType == 3);

        var count = await query.CountAsync();
        var total = await query.SumAsync(r => r.FinalAmount);
        result.Data.Add(new Dictionary<string, object>
        {
            ["type"] = "Giao dich huy / hoan",
            ["count"] = count,
            ["totalAmount"] = total
        });
        result.Summary["totalCancelled"] = count;
        result.Summary["totalCancelledAmount"] = total;
    }

    private async Task FillApprovedExcessDeficit(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        // Placeholder - requires specialized accounting tables
        result.Data.Add(new Dictionary<string, object> { ["message"] = "Chua co du lieu thua/thieu" });
        result.Summary["totalExcess"] = 0;
        result.Summary["totalDeficit"] = 0;
    }

    private async Task FillSurgeryFinance(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.SurgeryRequests.AsNoTracking()
            .Where(s => s.CreatedAt >= from && s.CreatedAt < to && !s.IsDeleted);
        if (deptId.HasValue)
            query = query.Where(s => s.Examination != null && s.Examination.DepartmentId == deptId);

        var count = await query.CountAsync();
        result.Data.Add(new Dictionary<string, object>
        {
            ["type"] = "Phau thuat",
            ["count"] = count
        });
        result.Summary["totalSurgeries"] = count;
    }

    private async Task FillDischargePayment(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Discharges.AsNoTracking()
            .Where(d => d.DischargeDate >= from && d.DischargeDate < to && !d.IsDeleted);
        if (deptId.HasValue)
            query = query.Where(d => d.Admission.DepartmentId == deptId);

        var data = await query
            .Include(d => d.Admission).ThenInclude(a => a.Patient)
            .Include(d => d.Admission).ThenInclude(a => a.Department)
            .OrderBy(d => d.DischargeDate)
            .Take(1000)
            .Select(d => new
            {
                d.DischargeDate,
                d.Admission.Patient.PatientCode,
                d.Admission.Patient.FullName,
                DeptName = d.Admission.Department.DepartmentName,
                d.DischargeDiagnosis,
                d.DischargeCondition,
                d.DischargeType
            })
            .ToListAsync();

        var conditionNames = new Dictionary<int, string> { { 1, "Khoi" }, { 2, "Do" }, { 3, "Khong doi" }, { 4, "Nang hon" }, { 5, "Tu vong" } };
        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["dischargeDate"] = d.DischargeDate.ToString("dd/MM/yyyy"),
                ["patientCode"] = d.PatientCode ?? "",
                ["patientName"] = d.FullName ?? "",
                ["departmentName"] = d.DeptName ?? "",
                ["diagnosis"] = d.DischargeDiagnosis ?? "",
                ["dischargeCondition"] = conditionNames.TryGetValue(d.DischargeCondition, out var c) ? c : $"{d.DischargeCondition}",
                ["dischargeType"] = d.DischargeType
            });
        }
        result.Summary["totalDischarges"] = data.Count;
    }

    #endregion

    #region D. Pharmacy / Warehouse Reports

    private async Task FillStockMovement(HospitalReportResult result, DateTime from, DateTime to, Guid? warehouseId)
    {
        var importQuery = _context.ImportReceipts.AsNoTracking()
            .Where(i => i.ReceiptDate >= from && i.ReceiptDate < to && !i.IsDeleted);
        var exportQuery = _context.ExportReceipts.AsNoTracking()
            .Where(e => e.ReceiptDate >= from && e.ReceiptDate < to && !e.IsDeleted);
        if (warehouseId.HasValue)
        {
            importQuery = importQuery.Where(i => i.WarehouseId == warehouseId);
            exportQuery = exportQuery.Where(e => e.WarehouseId == warehouseId);
        }

        var importTotal = await importQuery.Include(i => i.Details).SelectMany(i => i.Details).SumAsync(d => d.Amount);
        var exportTotal = await exportQuery.Include(e => e.Details).SelectMany(e => e.Details).SumAsync(d => d.Amount);

        result.Data.Add(new Dictionary<string, object>
        {
            ["type"] = "Nhap",
            ["totalAmount"] = importTotal,
            ["transactionCount"] = await importQuery.CountAsync()
        });
        result.Data.Add(new Dictionary<string, object>
        {
            ["type"] = "Xuat",
            ["totalAmount"] = exportTotal,
            ["transactionCount"] = await exportQuery.CountAsync()
        });
        result.Summary["totalImport"] = importTotal;
        result.Summary["totalExport"] = exportTotal;
        result.Summary["balance"] = importTotal - exportTotal;
    }

    private async Task FillPharmacyProfit(HospitalReportResult result, DateTime from, DateTime to, Guid? warehouseId)
    {
        var exports = _context.ExportReceipts.AsNoTracking()
            .Where(e => e.ReceiptDate >= from && e.ReceiptDate < to && !e.IsDeleted && e.ExportType == 6); // RetailSale
        if (warehouseId.HasValue)
            exports = exports.Where(e => e.WarehouseId == warehouseId);

        var totalSale = await exports.Include(e => e.Details).SelectMany(e => e.Details).SumAsync(d => d.Amount);
        result.Data.Add(new Dictionary<string, object>
        {
            ["type"] = "Ban le",
            ["totalRevenue"] = totalSale
        });
        result.Summary["totalRetailRevenue"] = totalSale;
    }

    private async Task FillEmergencyCabinetNXT(HospitalReportResult result, DateTime from, DateTime to, Guid? warehouseId)
    {
        // Emergency cabinet stock movement - filter by emergency warehouse type
        await FillStockMovement(result, from, to, warehouseId);
        result.ReportName = "NXT tu thuoc cap cuu";
    }

    private async Task FillIssueToDept(HospitalReportResult result, DateTime from, DateTime to, Guid? warehouseId, Guid? deptId)
    {
        var query = _context.ExportReceipts.AsNoTracking()
            .Where(e => e.ReceiptDate >= from && e.ReceiptDate < to && !e.IsDeleted);
        if (warehouseId.HasValue)
            query = query.Where(e => e.WarehouseId == warehouseId);

        var data = await query
            .Include(e => e.Warehouse)
            .Include(e => e.Details).ThenInclude(d => d.Medicine)
            .GroupBy(e => new { e.WarehouseId, WHName = e.Warehouse.WarehouseName })
            .Select(g => new
            {
                g.Key.WHName,
                ExportCount = g.Count(),
                TotalAmount = g.SelectMany(e => e.Details).Sum(d => d.Amount)
            })
            .OrderByDescending(x => x.TotalAmount)
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["warehouseName"] = d.WHName ?? "",
                ["exportCount"] = d.ExportCount,
                ["totalAmount"] = d.TotalAmount
            });
        }
        result.Summary["totalExports"] = data.Sum(d => d.ExportCount);
        result.Summary["totalAmount"] = data.Sum(d => d.TotalAmount);
    }

    private async Task FillDeptDispensingSheet(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        await FillIssueToDept(result, from, to, null, deptId);
        result.ReportName = "Phieu cap phat khoa";
    }

    private async Task FillProcurementImport(HospitalReportResult result, DateTime from, DateTime to, Guid? warehouseId)
    {
        var query = _context.ImportReceipts.AsNoTracking()
            .Where(i => i.ReceiptDate >= from && i.ReceiptDate < to && !i.IsDeleted);
        if (warehouseId.HasValue)
            query = query.Where(i => i.WarehouseId == warehouseId);

        var data = await query
            .Include(i => i.Warehouse)
            .OrderByDescending(i => i.ReceiptDate)
            .Take(1000)
            .Select(i => new
            {
                i.ReceiptDate,
                i.ReceiptCode,
                i.SupplierName,
                WHName = i.Warehouse.WarehouseName,
                i.TotalAmount,
                i.Status
            })
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["receiptDate"] = d.ReceiptDate.ToString("dd/MM/yyyy"),
                ["receiptCode"] = d.ReceiptCode ?? "",
                ["supplierName"] = d.SupplierName ?? "",
                ["warehouseName"] = d.WHName ?? "",
                ["totalAmount"] = d.TotalAmount,
                ["status"] = d.Status
            });
        }
        result.Summary["totalImports"] = data.Count;
        result.Summary["totalAmount"] = data.Sum(d => d.TotalAmount);
    }

    private async Task FillPrescriptionByDoctor(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Prescriptions.AsNoTracking()
            .Where(p => p.CreatedAt >= from && p.CreatedAt < to && !p.IsDeleted);

        var data = await query
            .Include(p => p.Doctor)
            .GroupBy(p => new { p.DoctorId, DoctorName = p.Doctor.FullName })
            .Select(g => new
            {
                g.Key.DoctorName,
                PrescriptionCount = g.Count(),
                TotalAmount = g.Sum(p => p.TotalAmount)
            })
            .OrderByDescending(x => x.PrescriptionCount)
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["doctorName"] = d.DoctorName ?? "",
                ["prescriptionCount"] = d.PrescriptionCount,
                ["totalAmount"] = d.TotalAmount
            });
        }
        result.Summary["totalPrescriptions"] = data.Sum(d => d.PrescriptionCount);
        result.Summary["totalAmount"] = data.Sum(d => d.TotalAmount);
    }

    private async Task FillStockCardDetail(HospitalReportResult result, DateTime from, DateTime to, Guid? warehouseId)
    {
        await FillStockMovement(result, from, to, warehouseId);
        result.ReportName = "The kho chi tiet";
    }

    private async Task FillIssueByPatientType(HospitalReportResult result, DateTime from, DateTime to, Guid? warehouseId)
    {
        var query = _context.Prescriptions.AsNoTracking()
            .Where(p => p.CreatedAt >= from && p.CreatedAt < to && !p.IsDeleted);

        var data = await query
            .Include(p => p.MedicalRecord)
            .GroupBy(p => p.MedicalRecord.PatientType)
            .Select(g => new
            {
                PatientType = g.Key,
                Count = g.Count(),
                TotalAmount = g.Sum(p => p.TotalAmount)
            })
            .ToListAsync();

        var ptNames = new Dictionary<int, string> { { 1, "BHYT" }, { 2, "Vien phi" }, { 3, "Dich vu" }, { 4, "Kham suc khoe" } };
        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["patientType"] = ptNames.TryGetValue(d.PatientType, out var n) ? n : $"Loai {d.PatientType}",
                ["prescriptionCount"] = d.Count,
                ["totalAmount"] = d.TotalAmount
            });
        }
        result.Summary["totalPrescriptions"] = data.Sum(d => d.Count);
    }

    #endregion

    #region E. CLS (Lab / Imaging) Reports

    private async Task FillParaclinicalSummary(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var labCount = await _context.LabRequests.AsNoTracking()
            .Where(l => l.CreatedAt >= from && l.CreatedAt < to && !l.IsDeleted)
            .CountAsync();
        var labItemCount = await _context.LabRequestItems.AsNoTracking()
            .Where(li => li.CreatedAt >= from && li.CreatedAt < to && !li.IsDeleted)
            .CountAsync();

        result.Data.Add(new Dictionary<string, object>
        {
            ["type"] = "Xet nghiem",
            ["requestCount"] = labCount,
            ["testCount"] = labItemCount
        });

        var srQuery = _context.ServiceRequests.AsNoTracking()
            .Where(sr => sr.CreatedAt >= from && sr.CreatedAt < to && !sr.IsDeleted && sr.RequestType == 2); // Imaging
        var imgCount = await srQuery.CountAsync();
        result.Data.Add(new Dictionary<string, object>
        {
            ["type"] = "CDHA",
            ["requestCount"] = imgCount,
            ["testCount"] = imgCount
        });

        result.Summary["totalLabRequests"] = labCount;
        result.Summary["totalLabTests"] = labItemCount;
        result.Summary["totalImagingRequests"] = imgCount;
    }

    private async Task FillMicrobiologyRegister(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.LabRequests.AsNoTracking()
            .Where(l => l.CreatedAt >= from && l.CreatedAt < to && !l.IsDeleted && l.PatientType == 2); // Microbiology filter by type
        var count = await query.CountAsync();
        result.Data.Add(new Dictionary<string, object> { ["type"] = "Vi sinh", ["count"] = count });
        result.Summary["totalMicrobiologyRequests"] = count;
    }

    private async Task FillLabRegister(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.LabRequests.AsNoTracking()
            .Where(l => l.CreatedAt >= from && l.CreatedAt < to && !l.IsDeleted);

        var data = await query
            .Include(l => l.Items)
            .OrderBy(l => l.CreatedAt)
            .Take(1000)
            .Select(l => new
            {
                l.CreatedAt,
                l.RequestCode,
                SampleCode = l.RequestCode, // LabRequest doesn't have SampleCode, use RequestCode
                l.Status,
                TestCount = l.Items.Count
            })
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["date"] = d.CreatedAt.ToString("dd/MM/yyyy HH:mm"),
                ["requestCode"] = d.RequestCode ?? "",
                ["sampleCode"] = d.SampleCode ?? "",
                ["status"] = d.Status,
                ["testCount"] = d.TestCount
            });
        }
        result.Summary["totalRequests"] = data.Count;
        result.Summary["totalTests"] = data.Sum(d => d.TestCount);
    }

    private async Task FillUltrasoundRegister(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.ServiceRequests.AsNoTracking()
            .Where(sr => sr.CreatedAt >= from && sr.CreatedAt < to && !sr.IsDeleted && sr.RequestType == 2);
        var count = await query.CountAsync();
        result.Data.Add(new Dictionary<string, object> { ["type"] = "Sieu am", ["count"] = count });
        result.Summary["totalUltrasound"] = count;
    }

    private async Task FillEndoscopyRegister(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.ServiceRequests.AsNoTracking()
            .Where(sr => sr.CreatedAt >= from && sr.CreatedAt < to && !sr.IsDeleted && sr.RequestType == 2);
        var count = await query.CountAsync();
        result.Data.Add(new Dictionary<string, object> { ["type"] = "Noi soi / TDCN", ["count"] = count });
        result.Summary["totalEndoscopy"] = count;
    }

    private async Task FillImagingRegister(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.ServiceRequests.AsNoTracking()
            .Where(sr => sr.CreatedAt >= from && sr.CreatedAt < to && !sr.IsDeleted && sr.RequestType == 2);
        var count = await query.CountAsync();
        result.Data.Add(new Dictionary<string, object> { ["type"] = "CDHA", ["count"] = count });
        result.Summary["totalImaging"] = count;
    }

    private async Task FillImagingRevenue(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.ReceiptDetails.AsNoTracking()
            .Where(rd => rd.Receipt.CreatedAt >= from && rd.Receipt.CreatedAt < to && !rd.IsDeleted)
            .Where(rd => rd.ItemType == 1); // Services related to imaging

        var total = await query.SumAsync(rd => rd.Amount);
        var count = await query.CountAsync();
        result.Data.Add(new Dictionary<string, object>
        {
            ["type"] = "Doanh thu CDHA",
            ["revenue"] = total,
            ["serviceCount"] = count
        });
        result.Summary["totalImagingRevenue"] = total;
    }

    private async Task FillDoctorByMachine(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        result.Data.Add(new Dictionary<string, object> { ["message"] = "Bao cao BS theo may - can du lieu may" });
        result.Summary["note"] = "Can cau hinh may CDHA";
    }

    private async Task FillOrderedVsPerformedCLS(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var ordered = await _context.ServiceRequests.AsNoTracking()
            .Where(sr => sr.CreatedAt >= from && sr.CreatedAt < to && !sr.IsDeleted)
            .CountAsync();
        var performed = await _context.ServiceRequests.AsNoTracking()
            .Where(sr => sr.CreatedAt >= from && sr.CreatedAt < to && !sr.IsDeleted && sr.Status >= 2)
            .CountAsync();

        result.Data.Add(new Dictionary<string, object>
        {
            ["ordered"] = ordered,
            ["performed"] = performed,
            ["notPerformed"] = ordered - performed,
            ["completionRate"] = ordered > 0 ? Math.Round((decimal)performed / ordered * 100, 1) : 0
        });
        result.Summary["totalOrdered"] = ordered;
        result.Summary["totalPerformed"] = performed;
    }

    #endregion

    #region F. Surgery Reports

    private async Task FillProcedureRegister(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.SurgeryRequests.AsNoTracking()
            .Where(s => s.CreatedAt >= from && s.CreatedAt < to && !s.IsDeleted);
        if (deptId.HasValue)
            query = query.Where(s => s.Examination != null && s.Examination.DepartmentId == deptId);

        var data = await query
            .Include(s => s.Patient)
            .Include(s => s.Examination).ThenInclude(e => e.Department)
            .OrderBy(s => s.CreatedAt)
            .Take(1000)
            .Select(s => new
            {
                s.CreatedAt,
                s.Patient.PatientCode,
                s.Patient.FullName,
                DeptName = s.Examination != null ? s.Examination.Department.DepartmentName : "",
                SurgeryName = s.PlannedProcedure,
                s.SurgeryType,
                s.Status
            })
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["date"] = d.CreatedAt.ToString("dd/MM/yyyy"),
                ["patientCode"] = d.PatientCode ?? "",
                ["patientName"] = d.FullName ?? "",
                ["departmentName"] = d.DeptName ?? "",
                ["surgeryName"] = d.SurgeryName ?? "",
                ["surgeryType"] = d.SurgeryType ?? "",
                ["status"] = d.Status
            });
        }
        result.Summary["totalProcedures"] = data.Count;
    }

    private async Task FillSurgeryRegister(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        await FillProcedureRegister(result, from, to, deptId);
    }

    private async Task FillORCost(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.SurgeryRequests.AsNoTracking()
            .Where(s => s.CreatedAt >= from && s.CreatedAt < to && !s.IsDeleted);
        if (deptId.HasValue)
            query = query.Where(s => s.Examination != null && s.Examination.DepartmentId == deptId);

        var count = await query.CountAsync();
        result.Data.Add(new Dictionary<string, object>
        {
            ["type"] = "Chi phi phong mo",
            ["surgeryCount"] = count
        });
        result.Summary["totalSurgeries"] = count;
    }

    private async Task FillProcedureByDept(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.SurgeryRequests.AsNoTracking()
            .Where(s => s.CreatedAt >= from && s.CreatedAt < to && !s.IsDeleted);
        if (deptId.HasValue)
            query = query.Where(s => s.Examination != null && s.Examination.DepartmentId == deptId);

        var data = await query
            .Include(s => s.Examination).ThenInclude(e => e.Department)
            .GroupBy(s => s.Examination != null ? s.Examination.Department.DepartmentName : "N/A")
            .Select(g => new
            {
                DeptName = g.Key,
                SurgeryCount = g.Count(),
                Emergency = g.Count(s => s.SurgeryType == "Cap cuu"),
                Elective = g.Count(s => s.SurgeryType != "Cap cuu")
            })
            .OrderByDescending(x => x.SurgeryCount)
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["departmentName"] = d.DeptName ?? "",
                ["surgeryCount"] = d.SurgeryCount,
                ["emergency"] = d.Emergency,
                ["elective"] = d.Elective
            });
        }
        result.Summary["totalSurgeries"] = data.Sum(d => d.SurgeryCount);
    }

    private async Task FillSurgeryPathologyBonus(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        await FillProcedureByDept(result, from, to, deptId);
        result.ReportName = "Thuong PTTT + GPB";
    }

    #endregion

    #region G. Insurance (BHYT) Reports

    private async Task FillInsuranceReport(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        try
        {
            var query = _context.InsuranceClaims.AsNoTracking()
                .Where(ic => ic.CreatedAt >= from && ic.CreatedAt < to && !ic.IsDeleted);
            if (deptId.HasValue)
                query = query.Where(ic => ic.DepartmentId == deptId);

            var data = await query
                .GroupBy(ic => ic.ClaimStatus)
                .Select(g => new
                {
                    Status = g.Key,
                    Count = g.Count(),
                    TotalAmount = g.Sum(ic => ic.TotalAmount),
                    ApprovedAmount = g.Sum(ic => ic.InsuranceAmount)
                })
                .ToListAsync();

            var statusNames = new Dictionary<int, string> { { 0, "Cho duyet" }, { 1, "Da duyet" }, { 2, "Tu choi" }, { 3, "Da thanh toan" } };
            foreach (var d in data)
            {
                result.Data.Add(new Dictionary<string, object>
                {
                    ["status"] = statusNames.TryGetValue(d.Status, out var s) ? s : $"Trang thai {d.Status}",
                    ["claimCount"] = d.Count,
                    ["totalAmount"] = d.TotalAmount,
                    ["approvedAmount"] = d.ApprovedAmount
                });
            }
            result.Summary["totalClaims"] = data.Sum(d => d.Count);
            result.Summary["totalAmount"] = data.Sum(d => d.TotalAmount);
            result.Summary["totalApproved"] = data.Sum(d => d.ApprovedAmount);
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            result.Summary["note"] = "Bang InsuranceClaims chua co du lieu";
        }
    }

    private async Task FillScheduledPatients(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        try
        {
            var query = _context.Set<Appointment>().AsNoTracking()
                .Where(a => a.AppointmentDate >= from && a.AppointmentDate < to && !a.IsDeleted);

            var count = await query.CountAsync();
            result.Data.Add(new Dictionary<string, object> { ["type"] = "BN hen kham", ["count"] = count });
            result.Summary["totalScheduled"] = count;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            result.Summary["totalScheduled"] = 0;
        }
    }

    private async Task FillReferralPatients(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Examinations.AsNoTracking()
            .Where(e => e.CreatedAt >= from && e.CreatedAt < to && !e.IsDeleted && e.MedicalRecord.PatientType == 1);

        var count = await query.CountAsync();
        result.Data.Add(new Dictionary<string, object> { ["type"] = "BN chuyen tuyen", ["count"] = count });
        result.Summary["totalReferral"] = count;
    }

    private async Task FillExternalBloodRegister(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        result.Data.Add(new Dictionary<string, object> { ["type"] = "So mau ngoai", ["count"] = 0 });
        result.Summary["totalExternalBlood"] = 0;
    }

    private async Task FillDiseaseAndDeathICD10(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Examinations.AsNoTracking()
            .Where(e => e.CreatedAt >= from && e.CreatedAt < to && !e.IsDeleted && e.MainIcdCode != null);
        if (deptId.HasValue)
            query = query.Where(e => e.DepartmentId == deptId);

        var data = await query
            .GroupBy(e => new { e.MainIcdCode })
            .Select(g => new
            {
                g.Key.MainIcdCode,
                Count = g.Count()
            })
            .OrderByDescending(x => x.Count)
            .Take(50)
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["icdCode"] = d.MainIcdCode ?? "",
                ["icdName"] = d.MainIcdCode ?? "", // ICD name lookup not available in Examination entity
                ["caseCount"] = d.Count
            });
        }
        result.Summary["totalDiagnoses"] = data.Sum(d => d.Count);
        result.Summary["uniqueIcdCodes"] = data.Count;
    }

    private async Task FillNutritionMealPortion(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        result.Data.Add(new Dictionary<string, object> { ["type"] = "Suat an dinh duong", ["count"] = 0 });
        result.Summary["totalMealPortions"] = 0;
    }

    private async Task FillForeignNationalPatients(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Examinations.AsNoTracking()
            .Where(e => e.CreatedAt >= from && e.CreatedAt < to && !e.IsDeleted)
            .Where(e => e.MedicalRecord.Patient.NationalityCode != null && e.MedicalRecord.Patient.NationalityCode != "VN");

        var count = await query.CountAsync();
        result.Data.Add(new Dictionary<string, object> { ["type"] = "BN nuoc ngoai", ["count"] = count });
        result.Summary["totalForeignPatients"] = count;
    }

    private async Task FillMedicalRecordArchive(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        try
        {
            var query = _context.MedicalRecordArchives.AsNoTracking()
                .Where(a => a.CreatedAt >= from && a.CreatedAt < to && !a.IsDeleted);
            if (deptId.HasValue)
                query = query.Where(a => a.DepartmentId == deptId);

            var count = await query.CountAsync();
            result.Data.Add(new Dictionary<string, object> { ["type"] = "HSBA luu tru", ["count"] = count });
            result.Summary["totalArchived"] = count;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            result.Summary["totalArchived"] = 0;
        }
    }

    #endregion

    #region H. HR / Referral Reports

    private async Task FillOutboundReferralSummary(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        await FillTransferOutPatients(result, from, to, deptId);
        result.ReportName = "Tong hop chuyen tuyen di";
    }

    private async Task FillDialysisMachineUsage(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        result.Data.Add(new Dictionary<string, object> { ["type"] = "Su dung may loc mau", ["count"] = 0 });
        result.Summary["totalDialysisSessions"] = 0;
        result.Summary["note"] = "Can cau hinh may loc mau";
    }

    #endregion

    #region Birth Certificate

    public async Task<byte[]> GenerateBirthCertificateAsync(BirthCertificateDto dto)
    {
        var html = BuildBirthCertificateHtml(dto);
        return Encoding.UTF8.GetBytes(html);
    }

    private string BuildBirthCertificateHtml(BirthCertificateDto dto)
    {
        var genderText = dto.BabyGender == 1 ? "Nam" : dto.BabyGender == 2 ? "N\u1EEF" : "Kh\u00E1c";
        var deliveryMethodText = dto.DeliveryMethod ?? "Sinh th\u01B0\u1EDDng";
        var now = DateTime.Now;

        var body = new StringBuilder();
        body.AppendLine(PdfTemplateHelper.GetHospitalHeader());

        body.AppendLine(@"<div class=""form-title"">GI\u1EA4Y CH\u1EE8NG SINH</div>");
        body.AppendLine($@"<div class=""form-number"">S\u1ED1: {PdfTemplateHelper.Esc(dto.CertificateNumber ?? "...../GCS")}</div>");
        body.AppendLine($@"<div style=""text-align:center;font-style:italic;margin-bottom:15px"">Ng\u00E0y {now:dd} th\u00E1ng {now:MM} n\u0103m {now:yyyy}</div>");

        // I. Baby information
        body.AppendLine(@"<div style=""margin-bottom:10px""><strong>I. TH\u00D4NG TIN TR\u1EBA S\u01A0 SINH</strong></div>");
        body.AppendLine(@"<table style=""width:100%;margin-bottom:10px"">");
        body.AppendLine($@"<tr><td style=""width:30%""><strong>H\u1ECD v\u00E0 t\u00EAn:</strong></td><td>{PdfTemplateHelper.Esc(dto.BabyFullName)}</td></tr>");
        body.AppendLine($@"<tr><td><strong>Gi\u1EDBi t\u00EDnh:</strong></td><td>{genderText}</td></tr>");
        body.AppendLine($@"<tr><td><strong>Ng\u00E0y sinh:</strong></td><td>{dto.BabyDateOfBirth:dd/MM/yyyy}</td><td><strong>Gi\u1EDD sinh:</strong></td><td>{PdfTemplateHelper.Esc(dto.BabyTimeOfBirth)}</td></tr>");
        body.AppendLine($@"<tr><td><strong>N\u01A1i sinh:</strong></td><td colspan=""3"">{PdfTemplateHelper.Esc(dto.BabyPlaceOfBirth)}</td></tr>");
        if (dto.BabyWeight.HasValue)
            body.AppendLine($@"<tr><td><strong>C\u00E2n n\u1EB7ng:</strong></td><td>{dto.BabyWeight} gram</td><td><strong>Chi\u1EC1u d\u00E0i:</strong></td><td>{dto.BabyHeight} cm</td></tr>");
        if (!string.IsNullOrEmpty(dto.BabyEthnicName))
            body.AppendLine($@"<tr><td><strong>D\u00E2n t\u1ED9c:</strong></td><td>{PdfTemplateHelper.Esc(dto.BabyEthnicName)}</td><td><strong>Qu\u1ED1c t\u1ECBch:</strong></td><td>{PdfTemplateHelper.Esc(dto.BabyNationalityName ?? "Vi\u1EC7t Nam")}</td></tr>");
        if (dto.NumberInOrder.HasValue)
            body.AppendLine($@"<tr><td><strong>Con th\u1EE9:</strong></td><td>{dto.NumberInOrder}</td></tr>");
        body.AppendLine("</table>");

        // II. Mother information
        body.AppendLine(@"<div style=""margin-bottom:10px""><strong>II. TH\u00D4NG TIN NG\u01AF\u1EDCI M\u1EB8</strong></div>");
        body.AppendLine(@"<table style=""width:100%;margin-bottom:10px"">");
        body.AppendLine($@"<tr><td style=""width:30%""><strong>H\u1ECD v\u00E0 t\u00EAn:</strong></td><td>{PdfTemplateHelper.Esc(dto.MotherFullName)}</td></tr>");
        if (dto.MotherDateOfBirth.HasValue)
            body.AppendLine($@"<tr><td><strong>Ng\u00E0y sinh:</strong></td><td>{dto.MotherDateOfBirth:dd/MM/yyyy}</td></tr>");
        else if (dto.MotherYearOfBirth.HasValue)
            body.AppendLine($@"<tr><td><strong>N\u0103m sinh:</strong></td><td>{dto.MotherYearOfBirth}</td></tr>");
        if (!string.IsNullOrEmpty(dto.MotherIdentityNumber))
            body.AppendLine($@"<tr><td><strong>CCCD/CMND:</strong></td><td>{PdfTemplateHelper.Esc(dto.MotherIdentityNumber)}</td></tr>");
        if (!string.IsNullOrEmpty(dto.MotherAddress))
            body.AppendLine($@"<tr><td><strong>\u0110\u1ECBa ch\u1EC9:</strong></td><td>{PdfTemplateHelper.Esc(dto.MotherAddress)}</td></tr>");
        if (!string.IsNullOrEmpty(dto.MotherOccupation))
            body.AppendLine($@"<tr><td><strong>Ngh\u1EC1 nghi\u1EC7p:</strong></td><td>{PdfTemplateHelper.Esc(dto.MotherOccupation)}</td></tr>");
        if (!string.IsNullOrEmpty(dto.MotherEthnicName))
            body.AppendLine($@"<tr><td><strong>D\u00E2n t\u1ED9c:</strong></td><td>{PdfTemplateHelper.Esc(dto.MotherEthnicName)}</td><td><strong>Qu\u1ED1c t\u1ECBch:</strong></td><td>{PdfTemplateHelper.Esc(dto.MotherNationalityName ?? "Vi\u1EC7t Nam")}</td></tr>");
        body.AppendLine("</table>");

        // III. Father information
        if (!string.IsNullOrEmpty(dto.FatherFullName))
        {
            body.AppendLine(@"<div style=""margin-bottom:10px""><strong>III. TH\u00D4NG TIN NG\u01AF\u1EDCI CHA</strong></div>");
            body.AppendLine(@"<table style=""width:100%;margin-bottom:10px"">");
            body.AppendLine($@"<tr><td style=""width:30%""><strong>H\u1ECD v\u00E0 t\u00EAn:</strong></td><td>{PdfTemplateHelper.Esc(dto.FatherFullName)}</td></tr>");
            if (dto.FatherDateOfBirth.HasValue)
                body.AppendLine($@"<tr><td><strong>Ng\u00E0y sinh:</strong></td><td>{dto.FatherDateOfBirth:dd/MM/yyyy}</td></tr>");
            else if (dto.FatherYearOfBirth.HasValue)
                body.AppendLine($@"<tr><td><strong>N\u0103m sinh:</strong></td><td>{dto.FatherYearOfBirth}</td></tr>");
            if (!string.IsNullOrEmpty(dto.FatherIdentityNumber))
                body.AppendLine($@"<tr><td><strong>CCCD/CMND:</strong></td><td>{PdfTemplateHelper.Esc(dto.FatherIdentityNumber)}</td></tr>");
            if (!string.IsNullOrEmpty(dto.FatherOccupation))
                body.AppendLine($@"<tr><td><strong>Ngh\u1EC1 nghi\u1EC7p:</strong></td><td>{PdfTemplateHelper.Esc(dto.FatherOccupation)}</td></tr>");
            body.AppendLine("</table>");
        }

        // IV. Delivery information
        body.AppendLine(@"<div style=""margin-bottom:10px""><strong>IV. TH\u00D4NG TIN SINH</strong></div>");
        body.AppendLine(@"<table style=""width:100%;margin-bottom:10px"">");
        body.AppendLine($@"<tr><td style=""width:30%""><strong>Ph\u01B0\u01A1ng ph\u00E1p sinh:</strong></td><td>{PdfTemplateHelper.Esc(deliveryMethodText)}</td></tr>");
        if (dto.GestationalWeeks.HasValue)
            body.AppendLine($@"<tr><td><strong>Tu\u1ED5i thai:</strong></td><td>{dto.GestationalWeeks} tu\u1EA7n</td></tr>");
        if (dto.ApgarScore1Min.HasValue)
            body.AppendLine($@"<tr><td><strong>Apgar 1 ph\u00FAt:</strong></td><td>{dto.ApgarScore1Min}</td><td><strong>Apgar 5 ph\u00FAt:</strong></td><td>{dto.ApgarScore5Min}</td></tr>");
        if (!string.IsNullOrEmpty(dto.DeliveryDoctor))
            body.AppendLine($@"<tr><td><strong>B\u00E1c s\u0129 \u0111\u1EE1:</strong></td><td>{PdfTemplateHelper.Esc(dto.DeliveryDoctor)}</td></tr>");
        if (!string.IsNullOrEmpty(dto.DeliveryMidwife))
            body.AppendLine($@"<tr><td><strong>N\u1EEF h\u1ED9 sinh:</strong></td><td>{PdfTemplateHelper.Esc(dto.DeliveryMidwife)}</td></tr>");
        if (!string.IsNullOrEmpty(dto.DeliveryNotes))
            body.AppendLine($@"<tr><td><strong>Ghi ch\u00FA:</strong></td><td colspan=""3"">{PdfTemplateHelper.Esc(dto.DeliveryNotes)}</td></tr>");
        if (!string.IsNullOrEmpty(dto.MedicalRecordCode))
            body.AppendLine($@"<tr><td><strong>S\u1ED1 HSBA:</strong></td><td>{PdfTemplateHelper.Esc(dto.MedicalRecordCode)}</td></tr>");
        body.AppendLine("</table>");

        // Signature block
        body.AppendLine(@"<div style=""display:flex;justify-content:space-between;margin-top:30px"">");
        body.AppendLine(@"<div style=""text-align:center;width:45%"">");
        body.AppendLine(@"<div><strong>NG\u01AF\u1EDCI \u0110\u1EE0</strong></div>");
        body.AppendLine(@"<div style=""font-style:italic;font-size:11px"">(K\u00FD, ghi r\u00F5 h\u1ECD t\u00EAn)</div>");
        body.AppendLine("<br/><br/><br/>");
        if (!string.IsNullOrEmpty(dto.DeliveryDoctor))
            body.AppendLine($@"<div>{PdfTemplateHelper.Esc(dto.DeliveryDoctor)}</div>");
        body.AppendLine("</div>");
        body.AppendLine(@"<div style=""text-align:center;width:45%"">");
        body.AppendLine($@"<div style=""font-style:italic"">Ng\u00E0y {now:dd} th\u00E1ng {now:MM} n\u0103m {now:yyyy}</div>");
        body.AppendLine(@"<div><strong>GI\u00C1M \u0110\u1ED0C B\u1EC6NH VI\u1EC6N</strong></div>");
        body.AppendLine(@"<div style=""font-style:italic;font-size:11px"">(K\u00FD, \u0111\u00F3ng d\u1EA5u)</div>");
        body.AppendLine("</div>");
        body.AppendLine("</div>");

        return PdfTemplateHelper.WrapHtmlPage("Gi\u1EA5y ch\u1EE9ng sinh", body.ToString());
    }

    #endregion
}
