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
public partial class HospitalReportService : IHospitalReportService
{
    private readonly HISDbContext _context;
    private readonly ILogger<HospitalReportService> _logger;

    public HospitalReportService(HISDbContext context, ILogger<HospitalReportService> logger)
    {
        _context = context;
        _logger = logger;
    }


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


}
