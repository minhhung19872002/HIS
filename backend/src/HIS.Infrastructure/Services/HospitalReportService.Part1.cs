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
        // NangCap27 (HSMT 13.2.7)
        ["SurgeryPlanApprovalRegister"] = "So duyet ke hoach phau thuat",

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
        // NangCap27 (HSMT 13.2.10)
        ["DailyMedicineSummaryRegister"] = "So tong hop thuoc hang ngay",
    };

    private static string GetReportName(string reportType) =>
        ReportNames.TryGetValue(reportType, out var name) ? name : reportType;

    // #363 [REFAC-2b]: dispatch registry thay cho switch 151-case (control-flow refactor, behavior-preserving).
    // Mỗi report-code map tới đúng Fill* handler + đúng bộ tham số như switch cũ
    // (chú ý: nhóm Pharmacy/Warehouse dùng warehouseId (w); IssueToDept dùng cả w + d; còn lại dùng departmentId (d)).
    private delegate Task ReportFiller(
        HospitalReportService svc, HospitalReportResult result, DateTime from, DateTime to, Guid? deptId, Guid? whId);

    private static readonly Dictionary<string, ReportFiller> ReportHandlers = new()
    {
        // ==================== A. Clinical / OPD ====================
        ["OpdIpdCostByFee"] = (s, r, f, t, d, w) => s.FillOpdIpdCostByFee(r, f, t, d),
        ["ExaminationActivity"] = (s, r, f, t, d, w) => s.FillExaminationActivity(r, f, t, d),
        ["ExaminationActivity2"] = (s, r, f, t, d, w) => s.FillExaminationActivity(r, f, t, d),
        ["ExaminationActivitySummary"] = (s, r, f, t, d, w) => s.FillExaminationActivity(r, f, t, d),
        ["DailyPatientCount"] = (s, r, f, t, d, w) => s.FillDailyPatientCount(r, f, t, d),
        ["ExaminationRegister"] = (s, r, f, t, d, w) => s.FillExaminationRegister(r, f, t, d),
        ["ExaminationRegister2"] = (s, r, f, t, d, w) => s.FillExaminationRegister(r, f, t, d),
        ["ExaminationRegister3"] = (s, r, f, t, d, w) => s.FillExaminationRegister(r, f, t, d),
        ["ServiceTimeAndWait"] = (s, r, f, t, d, w) => s.FillServiceTimeAndWait(r, f, t, d),
        ["AvgExaminationTime"] = (s, r, f, t, d, w) => s.FillServiceTimeAndWait(r, f, t, d),
        ["PatientWaitTimeDetail"] = (s, r, f, t, d, w) => s.FillServiceTimeAndWait(r, f, t, d),
        ["ServiceRevenueDetail"] = (s, r, f, t, d, w) => s.FillServiceRevenueDetail(r, f, t, d),
        ["ServiceRevenueDetailKCB"] = (s, r, f, t, d, w) => s.FillServiceRevenueDetail(r, f, t, d),
        ["ReceptionByRoom"] = (s, r, f, t, d, w) => s.FillReceptionByRoom(r, f, t, d),
        ["ClinicRoomStatistics"] = (s, r, f, t, d, w) => s.FillReceptionByRoom(r, f, t, d),
        ["VisitAndAdmissionCount"] = (s, r, f, t, d, w) => s.FillVisitAndAdmissionCount(r, f, t, d),
        ["ExaminationDiary"] = (s, r, f, t, d, w) => s.FillExaminationDiary(r, f, t, d),

        // ==================== B. Inpatient ====================
        ["DailyBriefingBedCapacity"] = (s, r, f, t, d, w) => s.FillBedCapacity(r, f, t, d),
        ["BedServiceByDept"] = (s, r, f, t, d, w) => s.FillBedCapacity(r, f, t, d),
        ["CareLevelClassification"] = (s, r, f, t, d, w) => s.FillCareLevelClassification(r, f, t, d),
        ["UndischargedPatients"] = (s, r, f, t, d, w) => s.FillActiveInpatients(r, f, t, d),
        ["ActiveInpatients"] = (s, r, f, t, d, w) => s.FillActiveInpatients(r, f, t, d),
        ["ActivePatientsByDept"] = (s, r, f, t, d, w) => s.FillActiveInpatients(r, f, t, d),
        ["PresentPatientsByDept"] = (s, r, f, t, d, w) => s.FillActiveInpatients(r, f, t, d),
        ["UnfinishedTreatment"] = (s, r, f, t, d, w) => s.FillActiveInpatients(r, f, t, d),
        ["DischargeByDeptTreatType"] = (s, r, f, t, d, w) => s.FillDischargeByDept(r, f, t, d),
        ["DischargeByDept"] = (s, r, f, t, d, w) => s.FillDischargeByDept(r, f, t, d),
        ["DischargeRegister"] = (s, r, f, t, d, w) => s.FillDischargeByDept(r, f, t, d),
        ["TreatmentCompletionByDept"] = (s, r, f, t, d, w) => s.FillDischargeByDept(r, f, t, d),
        ["PatientsByRoom"] = (s, r, f, t, d, w) => s.FillPatientsByRoom(r, f, t, d),
        ["PatientsByWard"] = (s, r, f, t, d, w) => s.FillPatientsByRoom(r, f, t, d),
        ["AdmitTransferDischarge"] = (s, r, f, t, d, w) => s.FillAdmitTransferDischarge(r, f, t, d),
        ["InpatientTreatmentActivity"] = (s, r, f, t, d, w) => s.FillAdmitTransferDischarge(r, f, t, d),
        ["TreatmentActivity"] = (s, r, f, t, d, w) => s.FillAdmitTransferDischarge(r, f, t, d),
        ["TreatmentActivity2"] = (s, r, f, t, d, w) => s.FillAdmitTransferDischarge(r, f, t, d),
        ["TreatmentActivity2360"] = (s, r, f, t, d, w) => s.FillAdmitTransferDischarge(r, f, t, d),
        ["AdmissionDetailByDept"] = (s, r, f, t, d, w) => s.FillAdmissionByDept(r, f, t, d),
        ["AdmissionRegister"] = (s, r, f, t, d, w) => s.FillAdmissionByDept(r, f, t, d),
        ["AdmissionByDept"] = (s, r, f, t, d, w) => s.FillAdmissionByDept(r, f, t, d),
        ["AdmissionByDept2"] = (s, r, f, t, d, w) => s.FillAdmissionByDept(r, f, t, d),
        ["TransferOutPatients"] = (s, r, f, t, d, w) => s.FillTransferOutPatients(r, f, t, d),

        // ==================== C. Finance ====================
        ["CashierSummary"] = (s, r, f, t, d, w) => s.FillCashierSummary(r, f, t, d),
        ["CashCollectionDetail"] = (s, r, f, t, d, w) => s.FillCashierSummary(r, f, t, d),
        ["HospitalRevenueDetail"] = (s, r, f, t, d, w) => s.FillCashierSummary(r, f, t, d),
        ["OutpatientRevenueSummary"] = (s, r, f, t, d, w) => s.FillCashierSummary(r, f, t, d),
        ["HospitalFeeServiceDetail"] = (s, r, f, t, d, w) => s.FillRevenueByService(r, f, t, d),
        ["DeptRevenueServiceDetail"] = (s, r, f, t, d, w) => s.FillRevenueByService(r, f, t, d),
        ["RevenueByServiceType"] = (s, r, f, t, d, w) => s.FillRevenueByService(r, f, t, d),
        ["DeptRevenueDetail"] = (s, r, f, t, d, w) => s.FillRevenueByService(r, f, t, d),
        ["RevenueByService"] = (s, r, f, t, d, w) => s.FillRevenueByService(r, f, t, d),
        ["CashBookUsageDetail"] = (s, r, f, t, d, w) => s.FillCashBookUsage(r, f, t, d),
        ["FundUsageSummary"] = (s, r, f, t, d, w) => s.FillCashBookUsage(r, f, t, d),
        ["HospitalFeeSummary"] = (s, r, f, t, d, w) => s.FillHospitalFeeSummary(r, f, t, d),
        ["PatientRevenueByDept"] = (s, r, f, t, d, w) => s.FillHospitalFeeSummary(r, f, t, d),
        ["DeptRoomRevenue"] = (s, r, f, t, d, w) => s.FillHospitalFeeSummary(r, f, t, d),
        ["OtherPayerPatients"] = (s, r, f, t, d, w) => s.FillOtherPayerPatients(r, f, t, d),
        ["RevenueByOrderingDept"] = (s, r, f, t, d, w) => s.FillRevenueByOrderingDept(r, f, t, d),
        ["RevenueByOrderingDept2"] = (s, r, f, t, d, w) => s.FillRevenueByOrderingDept(r, f, t, d),
        ["CancelledTransactionsSummary"] = (s, r, f, t, d, w) => s.FillCancelledTransactions(r, f, t, d),
        ["CancelledTransactionDetail"] = (s, r, f, t, d, w) => s.FillCancelledTransactions(r, f, t, d),
        ["ApprovedExcessDeficit"] = (s, r, f, t, d, w) => s.FillApprovedExcessDeficit(r, f, t, d),
        ["UnapprovedFinanceClose"] = (s, r, f, t, d, w) => s.FillApprovedExcessDeficit(r, f, t, d),
        ["AutoSurgeryBonus"] = (s, r, f, t, d, w) => s.FillSurgeryFinance(r, f, t, d),
        ["SurgeryProfitLoss"] = (s, r, f, t, d, w) => s.FillSurgeryFinance(r, f, t, d),
        ["DischargePayment"] = (s, r, f, t, d, w) => s.FillDischargePayment(r, f, t, d),

        // ==================== D. Pharmacy / Warehouse ====================
        ["StockMovementByWarehouse"] = (s, r, f, t, d, w) => s.FillStockMovement(r, f, t, w),
        ["StockMovement"] = (s, r, f, t, d, w) => s.FillStockMovement(r, f, t, w),
        ["StockMovementAllWH"] = (s, r, f, t, d, w) => s.FillStockMovement(r, f, t, w),
        ["StockMovementDetail"] = (s, r, f, t, d, w) => s.FillStockMovement(r, f, t, w),
        ["PharmacyProfit"] = (s, r, f, t, d, w) => s.FillPharmacyProfit(r, f, t, w),
        ["RetailSaleRevenue"] = (s, r, f, t, d, w) => s.FillPharmacyProfit(r, f, t, w),
        ["RetailSaleDetail"] = (s, r, f, t, d, w) => s.FillPharmacyProfit(r, f, t, w),
        ["EmergencyCabinetNXT"] = (s, r, f, t, d, w) => s.FillEmergencyCabinetNXT(r, f, t, w),
        ["IssueToDepByWarehouse"] = (s, r, f, t, d, w) => s.FillIssueToDept(r, f, t, w, d),
        ["IssueToDept"] = (s, r, f, t, d, w) => s.FillIssueToDept(r, f, t, w, d),
        ["IssueToDept2"] = (s, r, f, t, d, w) => s.FillIssueToDept(r, f, t, w, d),
        ["IssueByDeptDetail"] = (s, r, f, t, d, w) => s.FillIssueToDept(r, f, t, w, d),
        ["IssuedQtyByDept"] = (s, r, f, t, d, w) => s.FillIssueToDept(r, f, t, w, d),
        ["DeptConsumableIssue"] = (s, r, f, t, d, w) => s.FillIssueToDept(r, f, t, w, d),
        ["DeptDispensingSheet"] = (s, r, f, t, d, w) => s.FillDeptDispensingSheet(r, f, t, d),
        ["ProcurementImport"] = (s, r, f, t, d, w) => s.FillProcurementImport(r, f, t, w),
        ["ProcurementVsStock"] = (s, r, f, t, d, w) => s.FillProcurementImport(r, f, t, w),
        ["ImportBySupplier"] = (s, r, f, t, d, w) => s.FillProcurementImport(r, f, t, w),
        ["ImportInvoiceSheet"] = (s, r, f, t, d, w) => s.FillProcurementImport(r, f, t, w),
        ["PrescriptionByDoctor"] = (s, r, f, t, d, w) => s.FillPrescriptionByDoctor(r, f, t, d),
        ["StockCardDetail"] = (s, r, f, t, d, w) => s.FillStockCardDetail(r, f, t, w),
        ["IssueByPatientType"] = (s, r, f, t, d, w) => s.FillIssueByPatientType(r, f, t, w),
        ["PrescriptionIssueByType"] = (s, r, f, t, d, w) => s.FillIssueByPatientType(r, f, t, w),
        ["PrescriptionIssueByPatient"] = (s, r, f, t, d, w) => s.FillIssueByPatientType(r, f, t, w),

        // ==================== E. CLS (Lab / Imaging) ====================
        ["ParaclinicalBriefing"] = (s, r, f, t, d, w) => s.FillParaclinicalSummary(r, f, t, d),
        ["ParaclinicalActivitySummary"] = (s, r, f, t, d, w) => s.FillParaclinicalSummary(r, f, t, d),
        ["ParaclinicalDeptSummary"] = (s, r, f, t, d, w) => s.FillParaclinicalSummary(r, f, t, d),
        ["ParaclinicalRegister"] = (s, r, f, t, d, w) => s.FillParaclinicalSummary(r, f, t, d),
        ["ParaclinicalTracking"] = (s, r, f, t, d, w) => s.FillParaclinicalSummary(r, f, t, d),
        ["MicrobiologyRegister"] = (s, r, f, t, d, w) => s.FillMicrobiologyRegister(r, f, t, d),
        ["MicrobiologyOrder"] = (s, r, f, t, d, w) => s.FillMicrobiologyRegister(r, f, t, d),
        ["LabRegister"] = (s, r, f, t, d, w) => s.FillLabRegister(r, f, t, d),
        ["LabRegister2"] = (s, r, f, t, d, w) => s.FillLabRegister(r, f, t, d),
        ["LabWithIndexRegister"] = (s, r, f, t, d, w) => s.FillLabRegister(r, f, t, d),
        ["UltrasoundRegister"] = (s, r, f, t, d, w) => s.FillUltrasoundRegister(r, f, t, d),
        ["UltrasoundByRoom"] = (s, r, f, t, d, w) => s.FillUltrasoundRegister(r, f, t, d),
        ["EndoscopyRegister"] = (s, r, f, t, d, w) => s.FillEndoscopyRegister(r, f, t, d),
        ["FunctionalTestRegister"] = (s, r, f, t, d, w) => s.FillEndoscopyRegister(r, f, t, d),
        ["ImagingRegister"] = (s, r, f, t, d, w) => s.FillImagingRegister(r, f, t, d),
        ["ImagingFilmStatistics"] = (s, r, f, t, d, w) => s.FillImagingRegister(r, f, t, d),
        ["ImagingRevenue"] = (s, r, f, t, d, w) => s.FillImagingRevenue(r, f, t, d),
        ["DoctorByMachine"] = (s, r, f, t, d, w) => s.FillDoctorByMachine(r, f, t, d),
        ["OrderedVsPerformedCLS"] = (s, r, f, t, d, w) => s.FillOrderedVsPerformedCLS(r, f, t, d),

        // ==================== F. Surgery ====================
        ["ProcedureRegister"] = (s, r, f, t, d, w) => s.FillProcedureRegister(r, f, t, d),
        ["ProcedureRegister2"] = (s, r, f, t, d, w) => s.FillProcedureRegister(r, f, t, d),
        ["InpatientProcedureRegister"] = (s, r, f, t, d, w) => s.FillProcedureRegister(r, f, t, d),
        ["SurgeryRegister"] = (s, r, f, t, d, w) => s.FillSurgeryRegister(r, f, t, d),
        ["SurgeryList"] = (s, r, f, t, d, w) => s.FillSurgeryRegister(r, f, t, d),
        ["SurgeryPatientList"] = (s, r, f, t, d, w) => s.FillSurgeryRegister(r, f, t, d),
        ["ORCost"] = (s, r, f, t, d, w) => s.FillORCost(r, f, t, d),
        ["ProcedureByDept"] = (s, r, f, t, d, w) => s.FillProcedureByDept(r, f, t, d),
        ["SurgeryProcedure"] = (s, r, f, t, d, w) => s.FillProcedureByDept(r, f, t, d),
        ["SurgeryProcedureActivity"] = (s, r, f, t, d, w) => s.FillProcedureByDept(r, f, t, d),
        ["SurgeryPathologyBonus"] = (s, r, f, t, d, w) => s.FillSurgeryPathologyBonus(r, f, t, d),
        // NangCap27 (HSMT 13.2.7 + 13.2.10)
        ["SurgeryPlanApprovalRegister"] = (s, r, f, t, d, w) => s.FillSurgeryPlanApprovalRegister(r, f, t, d),
        ["DailyMedicineSummaryRegister"] = (s, r, f, t, d, w) => s.FillDailyMedicineSummaryRegister(r, f, t, w),

        // ==================== G. BHYT (Insurance) ====================
        ["C80aNew"] = (s, r, f, t, d, w) => s.FillInsuranceReport(r, f, t, d),
        ["C79aNew"] = (s, r, f, t, d, w) => s.FillInsuranceReport(r, f, t, d),
        ["Form79QD3360"] = (s, r, f, t, d, w) => s.FillInsuranceReport(r, f, t, d),
        ["Form80QD3360"] = (s, r, f, t, d, w) => s.FillInsuranceReport(r, f, t, d),
        ["InsuranceServiceForm21"] = (s, r, f, t, d, w) => s.FillInsuranceReport(r, f, t, d),
        ["InsuranceSupplyForm19"] = (s, r, f, t, d, w) => s.FillInsuranceReport(r, f, t, d),
        ["InsuranceMedicineForm20"] = (s, r, f, t, d, w) => s.FillInsuranceReport(r, f, t, d),
        ["InsurancePaymentRequest"] = (s, r, f, t, d, w) => s.FillInsuranceReport(r, f, t, d),
        ["InsuranceDetail"] = (s, r, f, t, d, w) => s.FillInsuranceReport(r, f, t, d),
        ["UnapprovedDischargeSettlement"] = (s, r, f, t, d, w) => s.FillInsuranceReport(r, f, t, d),
        ["InternalDataAudit"] = (s, r, f, t, d, w) => s.FillInsuranceReport(r, f, t, d),
        ["ScheduledPatients"] = (s, r, f, t, d, w) => s.FillScheduledPatients(r, f, t, d),
        ["ReferralPatients"] = (s, r, f, t, d, w) => s.FillReferralPatients(r, f, t, d),
        ["InboundReferralPatients"] = (s, r, f, t, d, w) => s.FillReferralPatients(r, f, t, d),
        ["ExternalBloodRegister"] = (s, r, f, t, d, w) => s.FillExternalBloodRegister(r, f, t, d),
        ["DiseaseAndDeathICD10"] = (s, r, f, t, d, w) => s.FillDiseaseAndDeathICD10(r, f, t, d),
        ["ICDCV2360Statistics"] = (s, r, f, t, d, w) => s.FillDiseaseAndDeathICD10(r, f, t, d),
        ["NutritionMealPortion"] = (s, r, f, t, d, w) => s.FillNutritionMealPortion(r, f, t, d),
        ["ForeignNationalPatients"] = (s, r, f, t, d, w) => s.FillForeignNationalPatients(r, f, t, d),
        ["MedicalRecordArchive"] = (s, r, f, t, d, w) => s.FillMedicalRecordArchive(r, f, t, d),

        // ==================== H. HR / Referral ====================
        ["OutboundReferralSummary"] = (s, r, f, t, d, w) => s.FillOutboundReferralSummary(r, f, t, d),
        ["DialysisMachineUsage"] = (s, r, f, t, d, w) => s.FillDialysisMachineUsage(r, f, t, d),

        // ==================== Friendly Aliases ====================
        ["OutpatientRegister"] = (s, r, f, t, d, w) => s.FillExaminationRegister(r, f, t, d),
        ["InpatientRegister"] = (s, r, f, t, d, w) => s.FillAdmissionByDept(r, f, t, d),
        ["PharmacyDispensing"] = (s, r, f, t, d, w) => s.FillDeptDispensingSheet(r, f, t, d),
        ["RevenueByDept"] = (s, r, f, t, d, w) => s.FillHospitalFeeSummary(r, f, t, d),
        ["LabResults"] = (s, r, f, t, d, w) => s.FillLabRegister(r, f, t, d),
        ["ImagingResults"] = (s, r, f, t, d, w) => s.FillImagingRegister(r, f, t, d),
        ["SurgerySchedule"] = (s, r, f, t, d, w) => s.FillSurgeryRegister(r, f, t, d),
        ["InsuranceSummary"] = (s, r, f, t, d, w) => s.FillInsuranceReport(r, f, t, d),
        ["StockInventory"] = (s, r, f, t, d, w) => s.FillStockMovement(r, f, t, w),
        ["BedOccupancy"] = (s, r, f, t, d, w) => s.FillBedCapacity(r, f, t, d),
    };

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
            if (ReportHandlers.TryGetValue(reportCode, out var handler))
            {
                await handler(this, result, fromDate, toDate, departmentId, warehouseId);
            }
            else
            {
                result.ReportName = $"Bao cao: {reportCode}";
                result.Data.Add(new Dictionary<string, object> { ["message"] = $"Report type '{reportCode}' - data loading" });
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
