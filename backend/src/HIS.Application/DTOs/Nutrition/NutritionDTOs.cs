using System;
using System.Collections.Generic;

namespace HIS.Application.DTOs.Nutrition
{
    #region Nutrition Screening DTOs

    /// <summary>
    /// Sàng lọc dinh dưỡng
    /// </summary>
    public class NutritionScreeningDto
    {
        public Guid Id { get; set; }
        public Guid AdmissionId { get; set; }
        public Guid PatientId { get; set; }
        public string PatientName { get; set; }
        public string PatientCode { get; set; }
        public string DepartmentName { get; set; }
        public string BedNumber { get; set; }

        // Anthropometric
        public decimal? Weight { get; set; }
        public decimal? Height { get; set; }
        public decimal? BMI { get; set; }
        public decimal? WeightLoss6Months { get; set; }
        public decimal? WeightLossPercent { get; set; }

        // Screening Tool (NRS-2002)
        public int? NutritionScore { get; set; } // 0-3
        public int? DiseaseScore { get; set; } // 0-3
        public int? AgeScore { get; set; } // 0-1
        public int? TotalScore { get; set; } // 0-7

        // SGA (Subjective Global Assessment)
        public string SGACategory { get; set; } // A, B, C

        // Result
        public string RiskLevel { get; set; } // Low, Medium, High
        public bool RequiresIntervention { get; set; }
        public DateTime ScreeningDate { get; set; }
        public string ScreenedBy { get; set; }
        public DateTime? NextScreeningDate { get; set; }
    }

    /// <summary>
    /// Thực hiện sàng lọc dinh dưỡng
    /// </summary>
    public class PerformNutritionScreeningDto
    {
        public Guid AdmissionId { get; set; }
        public decimal Weight { get; set; }
        public decimal Height { get; set; }
        public decimal? WeightLoss6Months { get; set; }
        public int NutritionScore { get; set; }
        public int DiseaseScore { get; set; }
        public string SGACategory { get; set; }
        public string Notes { get; set; }
    }

    #endregion

    #region Nutrition Assessment DTOs

    /// <summary>
    /// Đánh giá dinh dưỡng chi tiết
    /// </summary>
    public class NutritionAssessmentDto
    {
        public Guid Id { get; set; }
        public Guid ScreeningId { get; set; }
        public Guid PatientId { get; set; }
        public string PatientName { get; set; }

        // Anthropometric
        public decimal Weight { get; set; }
        public decimal Height { get; set; }
        public decimal BMI { get; set; }
        public decimal IdealBodyWeight { get; set; }
        public decimal AdjustedBodyWeight { get; set; }
        public decimal? ArmCircumference { get; set; }
        public decimal? TricepsSkinfold { get; set; }
        public decimal? CalfCircumference { get; set; }

        // Biochemical
        public decimal? Albumin { get; set; }
        public decimal? Prealbumin { get; set; }
        public decimal? Transferrin { get; set; }
        public decimal? TotalLymphocyte { get; set; }
        public decimal? Hemoglobin { get; set; }

        // Clinical
        public string ClinicalFindings { get; set; }
        public List<string> NutritionProblems { get; set; }

        // Dietary
        public string DietaryHistory { get; set; }
        public string FoodAllergies { get; set; }
        public string FoodIntolerances { get; set; }
        public string DietaryRestrictions { get; set; }

        // Energy Requirements
        public decimal EstimatedBMR { get; set; } // Harris-Benedict
        public decimal ActivityFactor { get; set; }
        public decimal StressFactor { get; set; }
        public decimal TotalEnergyRequirement { get; set; }
        public decimal ProteinRequirement { get; set; }
        public decimal FluidRequirement { get; set; }

        // Assessment
        public string NutritionDiagnosis { get; set; } // PES Format
        public string Goals { get; set; }
        public DateTime AssessmentDate { get; set; }
        public string AssessedBy { get; set; }
    }

    /// <summary>
    /// Lưu đánh giá dinh dưỡng
    /// </summary>
    public class SaveNutritionAssessmentDto
    {
        public Guid? Id { get; set; }
        public Guid ScreeningId { get; set; }
        public decimal Weight { get; set; }
        public decimal Height { get; set; }
        public decimal? ArmCircumference { get; set; }
        public decimal? TricepsSkinfold { get; set; }
        public decimal? CalfCircumference { get; set; }
        public decimal? Albumin { get; set; }
        public decimal? Prealbumin { get; set; }
        public string ClinicalFindings { get; set; }
        public List<string> NutritionProblems { get; set; }
        public string DietaryHistory { get; set; }
        public string FoodAllergies { get; set; }
        public string FoodIntolerances { get; set; }
        public decimal ActivityFactor { get; set; }
        public decimal StressFactor { get; set; }
        public string NutritionDiagnosis { get; set; }
        public string Goals { get; set; }
    }

    #endregion

    #region Diet Order DTOs

    /// <summary>
    /// Y lệnh dinh dưỡng
    /// </summary>
    public class DietOrderDto
    {
        public Guid Id { get; set; }
        public string OrderCode { get; set; }
        public Guid AdmissionId { get; set; }
        public Guid PatientId { get; set; }
        public string PatientName { get; set; }
        public string DepartmentName { get; set; }
        public string BedNumber { get; set; }

        // Diet Type
        public Guid DietTypeId { get; set; }
        public string DietTypeCode { get; set; }
        public string DietTypeName { get; set; }
        public string DietCategory { get; set; } // Regular, Therapeutic, Enteral, Parenteral

        // Specifications
        public string Texture { get; set; } // Regular, Soft, Pureed, Liquid
        public string Consistency { get; set; }
        public decimal? CalorieLevel { get; set; }
        public decimal? ProteinLevel { get; set; }
        public decimal? SodiumRestriction { get; set; }
        public decimal? FluidRestriction { get; set; }
        public List<string> Allergies { get; set; }
        public List<string> Dislikes { get; set; }
        public string SpecialInstructions { get; set; }

        // Schedule
        public List<string> MealTimes { get; set; } // Breakfast, Lunch, Dinner, Snacks
        public bool IncludeSnacks { get; set; }
        public string FeedingRoute { get; set; } // Oral, NGT, PEG, TPN

        // Status
        public string Status { get; set; } // Active, OnHold, Discontinued
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string OrderedBy { get; set; }
        public DateTime OrderedAt { get; set; }
    }

    /// <summary>
    /// Tạo y lệnh dinh dưỡng
    /// </summary>
    public class CreateDietOrderDto
    {
        public Guid AdmissionId { get; set; }
        public Guid DietTypeId { get; set; }
        public string Texture { get; set; }
        public decimal? CalorieLevel { get; set; }
        public decimal? ProteinLevel { get; set; }
        public decimal? SodiumRestriction { get; set; }
        public decimal? FluidRestriction { get; set; }
        public List<string> Allergies { get; set; }
        public List<string> Dislikes { get; set; }
        public string SpecialInstructions { get; set; }
        public List<string> MealTimes { get; set; }
        public string FeedingRoute { get; set; }
        public DateTime StartDate { get; set; }
    }

    /// <summary>
    /// Danh mục loại chế độ ăn
    /// </summary>
    public class DietTypeDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string Category { get; set; }
        public string Description { get; set; }
        public string DefaultTexture { get; set; }
        public decimal? DefaultCalories { get; set; }
        public decimal? DefaultProtein { get; set; }
        public bool IsActive { get; set; }
    }

    #endregion

    #region Meal Planning DTOs

    /// <summary>
    /// Kế hoạch bữa ăn
    /// </summary>
    public class MealPlanDto
    {
        public Guid Id { get; set; }
        public DateTime Date { get; set; }
        public string MealType { get; set; } // Breakfast, Lunch, Dinner, Snack
        public string DepartmentName { get; set; }
        public List<MealPlanItemDto> Items { get; set; }
        public int TotalPatients { get; set; }
        public string Status { get; set; } // Planned, InPreparation, Ready, Distributed
    }

    public class MealPlanItemDto
    {
        public Guid DietOrderId { get; set; }
        public string PatientName { get; set; }
        public string BedNumber { get; set; }
        public string DietType { get; set; }
        public string Texture { get; set; }
        public List<string> Allergies { get; set; }
        public string SpecialNotes { get; set; }
        public List<MenuItemDto> MenuItems { get; set; }
        public bool IsDelivered { get; set; }
    }

    public class MenuItemDto
    {
        public string FoodName { get; set; }
        public string Portion { get; set; }
        public decimal? Calories { get; set; }
        public decimal? Protein { get; set; }
        public decimal? Carbohydrates { get; set; }
        public decimal? Fat { get; set; }
    }

    #endregion

    #region Nutrition Monitoring DTOs

    /// <summary>
    /// Theo dõi dinh dưỡng hàng ngày
    /// </summary>
    public class NutritionMonitoringDto
    {
        public Guid Id { get; set; }
        public Guid AdmissionId { get; set; }
        public Guid PatientId { get; set; }
        public string PatientName { get; set; }
        public DateTime Date { get; set; }

        // Intake
        public decimal? OralIntakePercent { get; set; }
        public decimal? EnteralIntake { get; set; }
        public decimal? ParenteralIntake { get; set; }
        public decimal? TotalCaloriesReceived { get; set; }
        public decimal? TotalProteinReceived { get; set; }
        public decimal? TotalFluidReceived { get; set; }

        // Output
        public decimal? UrineOutput { get; set; }
        public decimal? StoolOutput { get; set; }
        public decimal? DrainOutput { get; set; }
        public decimal? TotalOutput { get; set; }

        // Assessment
        public string AppetiteLevel { get; set; } // Good, Fair, Poor, None
        public string NauseaVomiting { get; set; }
        public string BowelMovement { get; set; }
        public string AbdominalDistension { get; set; }

        // Tolerance
        public bool ToleratingDiet { get; set; }
        public string IntoleranceSymptoms { get; set; }

        public string Notes { get; set; }
        public string RecordedBy { get; set; }
        public DateTime RecordedAt { get; set; }
    }

    /// <summary>
    /// Ghi nhận theo dõi dinh dưỡng
    /// </summary>
    public class RecordNutritionMonitoringDto
    {
        public Guid AdmissionId { get; set; }
        public DateTime Date { get; set; }
        public decimal? OralIntakePercent { get; set; }
        public decimal? EnteralIntake { get; set; }
        public decimal? ParenteralIntake { get; set; }
        public decimal? UrineOutput { get; set; }
        public decimal? StoolOutput { get; set; }
        public decimal? DrainOutput { get; set; }
        public string AppetiteLevel { get; set; }
        public string NauseaVomiting { get; set; }
        public string BowelMovement { get; set; }
        public bool ToleratingDiet { get; set; }
        public string IntoleranceSymptoms { get; set; }
        public string Notes { get; set; }
    }

    #endregion

    #region TPN (Total Parenteral Nutrition) DTOs

    /// <summary>
    /// Y lệnh dinh dưỡng tĩnh mạch
    /// </summary>
    public class TPNOrderDto
    {
        public Guid Id { get; set; }
        public string OrderCode { get; set; }
        public Guid AdmissionId { get; set; }
        public string PatientName { get; set; }

        // Base Solution
        public string BaseAminoAcid { get; set; }
        public decimal AminoAcidVolume { get; set; }
        public string BaseDextrose { get; set; }
        public decimal DextroseVolume { get; set; }
        public string LipidEmulsion { get; set; }
        public decimal? LipidVolume { get; set; }

        // Electrolytes
        public decimal? Sodium { get; set; }
        public decimal? Potassium { get; set; }
        public decimal? Calcium { get; set; }
        public decimal? Magnesium { get; set; }
        public decimal? Phosphate { get; set; }

        // Additives
        public decimal? MultivitaminMl { get; set; }
        public decimal? TraceElementsMl { get; set; }
        public decimal? InsulinUnits { get; set; }

        // Calculated Values
        public decimal TotalVolume { get; set; }
        public decimal TotalCalories { get; set; }
        public decimal ProteinGrams { get; set; }
        public decimal InfusionRatePerHour { get; set; }
        public int InfusionDurationHours { get; set; }

        // Access
        public string CentralLineType { get; set; } // PICC, CVC, Port
        public string CentralLineSite { get; set; }

        // Status
        public string Status { get; set; }
        public DateTime OrderDate { get; set; }
        public string OrderedBy { get; set; }
        public string PreparedBy { get; set; }
        public DateTime? PreparedAt { get; set; }
    }

    #endregion

    #region Dashboard DTOs

    /// <summary>
    /// Dashboard Dinh dưỡng
    /// </summary>
    public class NutritionDashboardDto
    {
        public DateTime Date { get; set; }

        // Screening Summary
        public int TotalAdmissions { get; set; }
        public int ScreenedToday { get; set; }
        public int PendingScreening { get; set; }
        public int HighRiskCount { get; set; }
        public int MediumRiskCount { get; set; }
        public int LowRiskCount { get; set; }

        // Diet Orders
        public int ActiveDietOrders { get; set; }
        public int RegularDiets { get; set; }
        public int TherapeuticDiets { get; set; }
        public int EnteralFeeding { get; set; }
        public int TPNPatients { get; set; }

        // Meal Service
        public int MealsPreparedToday { get; set; }
        public int MealsDeliveredToday { get; set; }
        public decimal AverageIntakePercent { get; set; }

        // By Department
        public List<DepartmentNutritionStatDto> ByDepartment { get; set; }

        // Alerts
        public List<NutritionAlertDto> Alerts { get; set; }
    }

    public class DepartmentNutritionStatDto
    {
        public string DepartmentName { get; set; }
        public int TotalPatients { get; set; }
        public int HighRisk { get; set; }
        public int ScreeningOverdue { get; set; }
    }

    public class NutritionAlertDto
    {
        public string AlertType { get; set; }
        public string PatientName { get; set; }
        public string BedNumber { get; set; }
        public string Message { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    #endregion
}
