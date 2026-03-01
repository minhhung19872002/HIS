using HIS.Application.DTOs.Examination;
using HIS.Application.Services;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;

namespace HIS.Infrastructure.Services;

public class ClinicalDecisionSupportService : IClinicalDecisionSupportService
{
    private readonly HISDbContext _context;

    public ClinicalDecisionSupportService(HISDbContext context)
    {
        _context = context;
    }

    // ========== SYMPTOM → DIAGNOSIS MAPPING ==========
    // Rule-based clinical knowledge base: Vietnamese symptoms → ICD-10 codes
    private static readonly List<SymptomDiagnosisRule> _rules = new()
    {
        // Respiratory
        new("J00", "Viêm mũi họng cấp [cảm lạnh thông thường]", "Acute nasopharyngitis [common cold]",
            new[] { "ho", "sổ mũi", "hắt hơi", "đau họng", "nghẹt mũi" },
            new[] { "sốt nhẹ", "họng đỏ" }, "Hô hấp"),
        new("J02.9", "Viêm họng cấp, không đặc hiệu", "Acute pharyngitis, unspecified",
            new[] { "đau họng", "nuốt đau", "ho" },
            new[] { "họng đỏ", "amidan sưng", "sốt" }, "Hô hấp"),
        new("J06.9", "Nhiễm khuẩn đường hô hấp trên cấp, không đặc hiệu", "Acute upper respiratory infection",
            new[] { "ho", "sốt", "đau họng", "sổ mũi" },
            new[] { "sốt", "họng đỏ" }, "Hô hấp"),
        new("J18.9", "Viêm phổi, không đặc hiệu", "Pneumonia, unspecified",
            new[] { "ho", "sốt cao", "khó thở", "đau ngực" },
            new[] { "ran phổi", "sốt cao", "thở nhanh", "SpO2 giảm" }, "Hô hấp"),
        new("J45.9", "Hen phế quản, không đặc hiệu", "Asthma, unspecified",
            new[] { "khó thở", "thở khò khè", "ho đêm", "tức ngực" },
            new[] { "thở khò khè", "thở rít", "ran rít", "ran ngáy" }, "Hô hấp"),
        new("J20.9", "Viêm phế quản cấp, không đặc hiệu", "Acute bronchitis, unspecified",
            new[] { "ho", "ho đàm", "sốt", "khó thở nhẹ" },
            new[] { "ran phổi", "sốt" }, "Hô hấp"),

        // Cardiovascular
        new("I10", "Tăng huyết áp vô căn (nguyên phát)", "Essential (primary) hypertension",
            new[] { "đau đầu", "chóng mặt", "ù tai" },
            new[] { "huyết áp cao", "HA tâm thu > 140", "HA tâm trương > 90" }, "Tim mạch"),
        new("I20.9", "Đau thắt ngực, không đặc hiệu", "Angina pectoris, unspecified",
            new[] { "đau ngực", "tức ngực", "đau ngực khi gắng sức", "khó thở" },
            new[] { "đau ngực trái", "mạch nhanh", "huyết áp thay đổi" }, "Tim mạch"),
        new("I50.9", "Suy tim, không đặc hiệu", "Heart failure, unspecified",
            new[] { "khó thở", "phù chân", "mệt mỏi", "khó thở khi nằm" },
            new[] { "phù chi dưới", "tĩnh mạch cổ nổi", "ran phổi", "nhịp tim nhanh" }, "Tim mạch"),

        // GI
        new("K29.7", "Viêm dạ dày, không đặc hiệu", "Gastritis, unspecified",
            new[] { "đau bụng", "đau thượng vị", "buồn nôn", "ợ chua", "ợ hơi" },
            new[] { "đau ấn thượng vị" }, "Tiêu hóa"),
        new("K21.0", "Trào ngược dạ dày thực quản kèm viêm thực quản", "GERD with esophagitis",
            new[] { "ợ nóng", "ợ chua", "đau ngực sau xương ức", "nuốt nghẹn" },
            new[] { "đau ấn thượng vị" }, "Tiêu hóa"),
        new("A09", "Viêm dạ dày ruột và viêm đại tràng do nhiễm khuẩn", "Infectious gastroenteritis and colitis",
            new[] { "tiêu chảy", "nôn", "đau bụng", "sốt" },
            new[] { "mất nước", "sốt", "đau bụng" }, "Tiêu hóa"),
        new("K80.2", "Sỏi túi mật không có viêm túi mật", "Calculus of gallbladder without cholecystitis",
            new[] { "đau hạ sườn phải", "buồn nôn", "nôn", "đầy bụng" },
            new[] { "đau ấn hạ sườn phải", "Murphy dương tính" }, "Tiêu hóa"),

        // Musculoskeletal
        new("M54.5", "Đau lưng dưới", "Low back pain",
            new[] { "đau lưng", "đau thắt lưng", "cứng lưng" },
            new[] { "co cứng cơ lưng", "hạn chế vận động" }, "Cơ xương khớp"),
        new("M79.3", "Viêm cân cốt", "Panniculitis, unspecified",
            new[] { "đau khớp", "sưng khớp", "cứng khớp" },
            new[] { "sưng khớp", "nóng đỏ khớp" }, "Cơ xương khớp"),
        new("M15.9", "Thoái hóa đa khớp, không đặc hiệu", "Polyarthrosis, unspecified",
            new[] { "đau khớp", "cứng khớp buổi sáng", "kêu lục cục" },
            new[] { "hạn chế vận động khớp", "lệch trục khớp" }, "Cơ xương khớp"),

        // Neurological
        new("G43.9", "Đau nửa đầu Migraine, không đặc hiệu", "Migraine, unspecified",
            new[] { "đau đầu", "đau nửa đầu", "buồn nôn", "sợ ánh sáng" },
            new[] { "đau một bên đầu" }, "Thần kinh"),
        new("G44.1", "Đau đầu do mạch máu", "Vascular headache",
            new[] { "đau đầu", "chóng mặt", "buồn nôn" },
            new[] { "đau đầu lan tỏa" }, "Thần kinh"),
        new("G47.0", "Mất ngủ", "Insomnia",
            new[] { "mất ngủ", "khó ngủ", "ngủ không sâu", "mệt mỏi" },
            new string[] { }, "Thần kinh"),

        // Endocrine
        new("E11.9", "Đái tháo đường type 2 không biến chứng", "Type 2 diabetes mellitus without complications",
            new[] { "khát nhiều", "tiểu nhiều", "sụt cân", "mệt mỏi" },
            new[] { "đường huyết cao" }, "Nội tiết"),
        new("E03.9", "Suy giáp, không đặc hiệu", "Hypothyroidism, unspecified",
            new[] { "mệt mỏi", "tăng cân", "sợ lạnh", "táo bón", "da khô" },
            new[] { "phù mặt", "nhịp tim chậm", "phản xạ chậm" }, "Nội tiết"),

        // Urogenital
        new("N39.0", "Nhiễm khuẩn đường tiết niệu, vị trí không đặc hiệu", "UTI, site not specified",
            new[] { "tiểu buốt", "tiểu rắt", "tiểu đau", "đau bụng dưới" },
            new[] { "ấn đau vùng hạ vị" }, "Tiết niệu"),
        new("N20.0", "Sỏi thận", "Calculus of kidney",
            new[] { "đau hông lưng", "tiểu máu", "đau quặn thận" },
            new[] { "ấn đau hố thận" }, "Tiết niệu"),

        // Dermatology
        new("L30.9", "Viêm da, không đặc hiệu", "Dermatitis, unspecified",
            new[] { "ngứa", "nổi mẩn", "đỏ da", "phát ban" },
            new[] { "ban đỏ", "mẩn ngứa", "da bong tróc" }, "Da liễu"),
        new("L50.9", "Mày đay, không đặc hiệu", "Urticaria, unspecified",
            new[] { "nổi mề đay", "ngứa", "sưng phù", "nổi mẩn" },
            new[] { "sẩn phù", "ban mề đay" }, "Da liễu"),

        // ENT
        new("H66.9", "Viêm tai giữa, không đặc hiệu", "Otitis media, unspecified",
            new[] { "đau tai", "ù tai", "chảy mủ tai", "nghe kém" },
            new[] { "màng nhĩ đỏ", "dịch tai giữa" }, "Tai mũi họng"),
        new("J01.9", "Viêm xoang cấp, không đặc hiệu", "Acute sinusitis, unspecified",
            new[] { "đau đầu", "nghẹt mũi", "chảy dịch mũi", "đau vùng xoang" },
            new[] { "ấn đau xoang", "dịch mũi đục" }, "Tai mũi họng"),

        // Ophthalmology
        new("H10.9", "Viêm kết mạc, không đặc hiệu", "Conjunctivitis, unspecified",
            new[] { "đau mắt", "đỏ mắt", "chảy nước mắt", "ngứa mắt" },
            new[] { "kết mạc đỏ", "tiết dịch mắt" }, "Mắt"),

        // Infectious
        new("A90", "Sốt Dengue [sốt xuất huyết Dengue cổ điển]", "Dengue fever",
            new[] { "sốt cao", "đau đầu", "đau cơ", "đau khớp", "phát ban" },
            new[] { "sốt cao", "xuất huyết dưới da", "gan to" }, "Nhiễm trùng"),
        new("B34.9", "Nhiễm virus, không đặc hiệu", "Viral infection, unspecified",
            new[] { "sốt", "mệt mỏi", "đau cơ", "đau đầu" },
            new[] { "sốt", "hạch to" }, "Nhiễm trùng"),

        // General/Other
        new("R51", "Đau đầu", "Headache",
            new[] { "đau đầu" },
            new string[] { }, "Triệu chứng"),
        new("R10.4", "Đau bụng khác và không xác định", "Other and unspecified abdominal pain",
            new[] { "đau bụng" },
            new string[] { }, "Triệu chứng"),
        new("R50.9", "Sốt, không đặc hiệu", "Fever, unspecified",
            new[] { "sốt" },
            new string[] { }, "Triệu chứng"),
        new("R53", "Mệt mỏi, yếu sức", "Malaise and fatigue",
            new[] { "mệt mỏi", "yếu sức", "kiệt sức" },
            new string[] { }, "Triệu chứng"),
    };

    public async Task<List<DiagnosisSuggestionDto>> SuggestDiagnosesAsync(DiagnosisSuggestionRequestDto request)
    {
        var suggestions = new List<DiagnosisSuggestionDto>();
        var inputSymptoms = NormalizeTerms(request.Symptoms);
        var inputSigns = NormalizeTerms(request.Signs);

        foreach (var rule in _rules)
        {
            var matchedSymptoms = new List<string>();
            var matchedSigns = new List<string>();

            // Match symptoms
            foreach (var ruleSymptom in rule.Symptoms)
            {
                var normalizedRule = Normalize(ruleSymptom);
                if (inputSymptoms.Any(s => s.Contains(normalizedRule) || normalizedRule.Contains(s)))
                    matchedSymptoms.Add(ruleSymptom);
            }

            // Match signs
            foreach (var ruleSign in rule.Signs)
            {
                var normalizedRule = Normalize(ruleSign);
                if (inputSigns.Any(s => s.Contains(normalizedRule) || normalizedRule.Contains(s)))
                    matchedSigns.Add(ruleSign);
            }

            // Match vital signs as implicit signs
            if (request.Temperature.HasValue && request.Temperature > 38)
            {
                if (rule.Signs.Any(s => s.Contains("sốt")))
                    matchedSigns.Add($"Sốt {request.Temperature}°C");
            }
            if (request.SpO2.HasValue && request.SpO2 < 95)
            {
                if (rule.Signs.Any(s => s.Contains("SpO2")))
                    matchedSigns.Add($"SpO2 giảm ({request.SpO2}%)");
            }
            if (request.BloodPressureSystolic.HasValue && request.BloodPressureSystolic > 140)
            {
                if (rule.Signs.Any(s => s.Contains("huyết áp") || s.Contains("HA")))
                    matchedSigns.Add($"HA cao ({request.BloodPressureSystolic}/{request.BloodPressureDiastolic})");
            }

            int totalMatched = matchedSymptoms.Count + matchedSigns.Count;
            int totalRuleTerms = rule.Symptoms.Length + rule.Signs.Length;
            if (totalMatched == 0 || totalRuleTerms == 0) continue;

            // Calculate confidence: weighted (symptoms 60%, signs 40%)
            double symptomScore = rule.Symptoms.Length > 0 ? (double)matchedSymptoms.Count / rule.Symptoms.Length : 0;
            double signScore = rule.Signs.Length > 0 ? (double)matchedSigns.Count / rule.Signs.Length : 0;
            double confidence = rule.Signs.Length > 0 ? symptomScore * 0.6 + signScore * 0.4 : symptomScore;

            // Minimum threshold
            if (confidence < 0.25 || matchedSymptoms.Count == 0) continue;

            // Age/gender adjustments
            if (request.Age.HasValue)
            {
                if (rule.IcdCode == "E11.9" && request.Age < 30) confidence *= 0.5;
                if (rule.IcdCode == "I10" && request.Age < 25) confidence *= 0.5;
                if (rule.IcdCode == "M15.9" && request.Age < 40) confidence *= 0.6;
            }

            suggestions.Add(new DiagnosisSuggestionDto
            {
                IcdCode = rule.IcdCode,
                IcdName = rule.IcdName,
                EnglishName = rule.EnglishName,
                Confidence = Math.Round(confidence, 2),
                ConfidenceLevel = confidence >= 0.7 ? "Cao" : confidence >= 0.4 ? "Trung bình" : "Thấp",
                MatchedSymptoms = matchedSymptoms,
                MatchedSigns = matchedSigns,
                Reasoning = $"Khớp {matchedSymptoms.Count}/{rule.Symptoms.Length} triệu chứng" +
                    (matchedSigns.Count > 0 ? $", {matchedSigns.Count}/{rule.Signs.Length} dấu hiệu" : ""),
                Category = rule.Category,
            });
        }

        // Check department frequency
        if (!string.IsNullOrEmpty(request.DepartmentId))
        {
            var frequentCodes = await GetDepartmentFrequentCodesAsync(request.DepartmentId);
            foreach (var s in suggestions)
                s.IsCommonInDepartment = frequentCodes.Contains(s.IcdCode);
        }

        return suggestions
            .OrderByDescending(s => s.Confidence)
            .ThenByDescending(s => s.IsCommonInDepartment)
            .Take(10)
            .ToList();
    }

    // ========== NEWS2 EARLY WARNING SCORE ==========

    public Task<EarlyWarningScoreDto> CalculateEarlyWarningScoreAsync(EarlyWarningScoreRequestDto request)
    {
        var parameters = new List<EarlyWarningParameterDto>();
        int total = 0;

        // Respiratory Rate
        if (request.RespiratoryRate.HasValue)
        {
            int rr = request.RespiratoryRate.Value;
            int score = rr <= 8 ? 3 : rr <= 11 ? 1 : rr <= 20 ? 0 : rr <= 24 ? 2 : 3;
            total += score;
            parameters.Add(new EarlyWarningParameterDto
            {
                Name = "Nhịp thở",
                Value = $"{rr} lần/phút",
                Score = score,
                Alert = score >= 3 ? "Nhịp thở bất thường nghiêm trọng" : score >= 2 ? "Nhịp thở nhanh" : null
            });
        }

        // SpO2 Scale 1 (no supplemental O2)
        if (request.SpO2.HasValue)
        {
            decimal spo2 = request.SpO2.Value;
            int score;
            if (request.IsOnSupplementalOxygen == true)
                score = spo2 <= 91 ? 3 : spo2 <= 93 ? 2 : spo2 <= 95 ? 1 : 0;
            else
                score = spo2 <= 91 ? 3 : spo2 <= 93 ? 2 : spo2 <= 95 ? 1 : 0;
            total += score;
            parameters.Add(new EarlyWarningParameterDto
            {
                Name = "SpO2",
                Value = $"{spo2}%{(request.IsOnSupplementalOxygen == true ? " (có oxy)" : "")}",
                Score = score,
                Alert = score >= 3 ? "SpO2 rất thấp - cần can thiệp" : score >= 2 ? "SpO2 thấp" : null
            });
        }

        // Supplemental oxygen
        if (request.IsOnSupplementalOxygen == true)
        {
            total += 2;
            parameters.Add(new EarlyWarningParameterDto
            {
                Name = "Thở oxy",
                Value = "Có",
                Score = 2,
            });
        }

        // Temperature
        if (request.Temperature.HasValue)
        {
            decimal temp = request.Temperature.Value;
            int score = temp <= 35.0m ? 3 : temp <= 36.0m ? 1 : temp <= 38.0m ? 0 : temp <= 39.0m ? 1 : 2;
            total += score;
            parameters.Add(new EarlyWarningParameterDto
            {
                Name = "Nhiệt độ",
                Value = $"{temp}°C",
                Score = score,
                Alert = temp <= 35 ? "Hạ thân nhiệt nặng" : temp >= 39 ? "Sốt cao" : null
            });
        }

        // Systolic BP
        if (request.BloodPressureSystolic.HasValue)
        {
            int sbp = request.BloodPressureSystolic.Value;
            int score = sbp <= 90 ? 3 : sbp <= 100 ? 2 : sbp <= 110 ? 1 : sbp <= 219 ? 0 : 3;
            total += score;
            parameters.Add(new EarlyWarningParameterDto
            {
                Name = "HA tâm thu",
                Value = $"{sbp} mmHg",
                Score = score,
                Alert = sbp <= 90 ? "Hạ huyết áp nặng" : sbp >= 220 ? "Tăng huyết áp cấp cứu" : null
            });
        }

        // Pulse
        if (request.Pulse.HasValue)
        {
            int hr = request.Pulse.Value;
            int score = hr <= 40 ? 3 : hr <= 50 ? 1 : hr <= 90 ? 0 : hr <= 110 ? 1 : hr <= 130 ? 2 : 3;
            total += score;
            parameters.Add(new EarlyWarningParameterDto
            {
                Name = "Mạch",
                Value = $"{hr} lần/phút",
                Score = score,
                Alert = hr <= 40 ? "Nhịp tim rất chậm" : hr >= 130 ? "Nhịp tim rất nhanh" : null
            });
        }

        // Consciousness (AVPU)
        if (request.ConsciousnessLevel.HasValue)
        {
            int level = request.ConsciousnessLevel.Value;
            int score = level == 0 ? 0 : 3; // Alert=0, any other=3
            string[] labels = { "Tỉnh (Alert)", "Đáp ứng lời nói (Voice)", "Đáp ứng đau (Pain)", "Không đáp ứng (Unresponsive)" };
            total += score;
            parameters.Add(new EarlyWarningParameterDto
            {
                Name = "Ý thức",
                Value = level < labels.Length ? labels[level] : "Không xác định",
                Score = score,
                Alert = level >= 2 ? "Rối loạn ý thức - cần đánh giá ngay" : null
            });
        }

        // Determine risk level
        string riskLevel, riskColor, recommendation;
        int monitoringFreq;

        if (total >= 7)
        {
            riskLevel = "Nguy kịch";
            riskColor = "red";
            recommendation = "GỌI NGAY ĐỘI CẤP CỨU. Theo dõi liên tục. Đánh giá lại mỗi 15 phút.";
            monitoringFreq = 15;
        }
        else if (total >= 5)
        {
            riskLevel = "Cao";
            riskColor = "orange";
            recommendation = "BÁO BÁC SĨ NGAY. Theo dõi mỗi 30 phút. Xem xét chuyển ICU.";
            monitoringFreq = 30;
        }
        else if (total >= 3)
        {
            riskLevel = "Trung bình";
            riskColor = "gold";
            recommendation = "Báo bác sĩ trực. Theo dõi mỗi 1 giờ. Đánh giá lại sau 30 phút.";
            monitoringFreq = 60;
        }
        else
        {
            riskLevel = "Thấp";
            riskColor = "green";
            recommendation = "Theo dõi thường quy mỗi 4-6 giờ.";
            monitoringFreq = 240;
        }

        return Task.FromResult(new EarlyWarningScoreDto
        {
            TotalScore = total,
            RiskLevel = riskLevel,
            RiskColor = riskColor,
            Recommendation = recommendation,
            MonitoringFrequencyMinutes = monitoringFreq,
            Parameters = parameters
        });
    }

    // ========== CLINICAL ALERTS ==========

    public async Task<List<ClinicalAlertDto>> GetClinicalAlertsAsync(Guid patientId, Guid? examinationId = null)
    {
        var alerts = new List<ClinicalAlertDto>();

        // 1. Check allergies
        try
        {
            var allergies = await _context.Set<HIS.Core.Entities.Allergy>()
                .Where(a => a.PatientId == patientId && !a.IsDeleted)
                .ToListAsync();

            foreach (var allergy in allergies.Where(a => a.Severity >= 2))
            {
                alerts.Add(new ClinicalAlertDto
                {
                    AlertType = "Allergy",
                    Severity = allergy.Severity >= 3 ? "Critical" : "Warning",
                    SeverityColor = allergy.Severity >= 3 ? "red" : "orange",
                    Title = $"Dị ứng: {allergy.AllergenName}",
                    Message = $"BN có tiền sử dị ứng {(allergy.AllergyType == 1 ? "thuốc" : allergy.AllergyType == 2 ? "thực phẩm" : "khác")}: {allergy.AllergenName}. Phản ứng: {allergy.Reaction ?? "N/A"}",
                    ActionRecommendation = "Kiểm tra kỹ trước khi kê đơn thuốc liên quan",
                    Source = "Tiền sử dị ứng",
                    Timestamp = allergy.CreatedAt
                });
            }
        }
        catch { }

        // 2. Check abnormal lab results (recent 7 days)
        try
        {
            using var connection = new SqlConnection(_context.Database.GetConnectionString());
            await connection.OpenAsync();
            var sql = @"SELECT TOP 10 lr.TestName, lr.NumericResult, lr.ReferenceRange, lr.AbnormalType, lr.IsCritical, lr.CreatedAt
                FROM LabResults lr
                INNER JOIN LabRequestItems lri ON lr.LabRequestItemId = lri.Id
                INNER JOIN LabRequests lo ON lri.LabRequestId = lo.Id
                WHERE lo.PatientId = @PatientId AND lr.IsAbnormal = 1 AND lr.IsDeleted = 0
                AND lr.CreatedAt >= DATEADD(DAY, -7, GETDATE())
                ORDER BY lr.IsCritical DESC, lr.CreatedAt DESC";
            using var cmd = new SqlCommand(sql, connection);
            cmd.Parameters.AddWithValue("@PatientId", patientId);
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var isCritical = !reader.IsDBNull(4) && reader.GetBoolean(4);
                var abnormalType = reader.IsDBNull(3) ? 0 : reader.GetInt32(3);
                alerts.Add(new ClinicalAlertDto
                {
                    AlertType = "Lab",
                    Severity = isCritical ? "Critical" : "Warning",
                    SeverityColor = isCritical ? "red" : "orange",
                    Title = $"XN bất thường: {reader.GetString(0)}",
                    Message = $"Kết quả: {(reader.IsDBNull(1) ? "N/A" : reader.GetDecimal(1).ToString("F2"))} (GTBT: {(reader.IsDBNull(2) ? "N/A" : reader.GetString(2))})" +
                        (abnormalType == 1 ? " - CAO" : abnormalType == 2 ? " - THẤP" : abnormalType == 3 ? " - NGUY KỊCH" : ""),
                    ActionRecommendation = isCritical ? "Xử trí cấp cứu ngay" : "Theo dõi và đánh giá lại",
                    Source = "Xét nghiệm",
                    Timestamp = reader.IsDBNull(5) ? null : reader.GetDateTime(5)
                });
            }
        }
        catch (SqlException) { }

        // 3. Check vital signs from current examination
        if (examinationId.HasValue)
        {
            try
            {
                var exam = await _context.Examinations
                    .FirstOrDefaultAsync(e => e.Id == examinationId.Value);
                if (exam != null)
                {
                    if (exam.Temperature.HasValue && exam.Temperature > 39)
                        alerts.Add(new ClinicalAlertDto
                        {
                            AlertType = "VitalSign",
                            Severity = exam.Temperature > 40 ? "Critical" : "Warning",
                            SeverityColor = exam.Temperature > 40 ? "red" : "orange",
                            Title = "Sốt cao",
                            Message = $"Nhiệt độ: {exam.Temperature}°C",
                            ActionRecommendation = "Hạ sốt, tìm nguyên nhân nhiễm trùng"
                        });

                    if (exam.BloodPressureSystolic.HasValue && exam.BloodPressureSystolic > 180)
                        alerts.Add(new ClinicalAlertDto
                        {
                            AlertType = "VitalSign",
                            Severity = "Critical",
                            SeverityColor = "red",
                            Title = "Tăng huyết áp cấp cứu",
                            Message = $"HA: {exam.BloodPressureSystolic}/{exam.BloodPressureDiastolic} mmHg",
                            ActionRecommendation = "Hạ áp cấp cứu, theo dõi sát"
                        });

                    if (exam.SpO2.HasValue && exam.SpO2 < 92)
                        alerts.Add(new ClinicalAlertDto
                        {
                            AlertType = "VitalSign",
                            Severity = exam.SpO2 < 88 ? "Critical" : "Warning",
                            SeverityColor = exam.SpO2 < 88 ? "red" : "orange",
                            Title = "SpO2 thấp",
                            Message = $"SpO2: {exam.SpO2}%",
                            ActionRecommendation = "Cho thở oxy, đánh giá hô hấp"
                        });

                    if (exam.Pulse.HasValue && (exam.Pulse > 130 || exam.Pulse < 40))
                        alerts.Add(new ClinicalAlertDto
                        {
                            AlertType = "VitalSign",
                            Severity = "Critical",
                            SeverityColor = "red",
                            Title = exam.Pulse > 130 ? "Nhịp tim rất nhanh" : "Nhịp tim rất chậm",
                            Message = $"Mạch: {exam.Pulse} lần/phút",
                            ActionRecommendation = "Đánh giá tim mạch ngay, monitor"
                        });
                }
            }
            catch { }
        }

        // 4. Check contraindications
        try
        {
            var contraindications = await _context.Set<HIS.Core.Entities.Contraindication>()
                .Where(c => c.PatientId == patientId && !c.IsDeleted &&
                    (c.EndDate == null || c.EndDate >= DateTime.UtcNow))
                .ToListAsync();

            foreach (var ci in contraindications)
            {
                alerts.Add(new ClinicalAlertDto
                {
                    AlertType = "Drug",
                    Severity = "Warning",
                    SeverityColor = "orange",
                    Title = $"Chống chỉ định: {ci.ItemName}",
                    Message = ci.Reason ?? "Có chống chỉ định",
                    ActionRecommendation = "Tránh sử dụng, tìm phương án thay thế",
                    Source = "Chống chỉ định"
                });
            }
        }
        catch { }

        return alerts.OrderByDescending(a => a.Severity == "Critical" ? 2 : a.Severity == "Warning" ? 1 : 0)
            .ThenByDescending(a => a.Timestamp)
            .ToList();
    }

    // ========== FULL CDS ==========

    public async Task<ClinicalDecisionSupportResultDto> GetFullCdsAsync(
        Guid patientId, Guid? examinationId, DiagnosisSuggestionRequestDto? suggestionRequest = null)
    {
        var result = new ClinicalDecisionSupportResultDto();

        // Run in parallel
        var alertsTask = GetClinicalAlertsAsync(patientId, examinationId);
        var frequentTask = GetFrequentDiagnosesAsync(suggestionRequest?.DepartmentId, 10);

        if (suggestionRequest != null && (suggestionRequest.Symptoms.Any() || suggestionRequest.Signs.Any()))
        {
            result.SuggestedDiagnoses = await SuggestDiagnosesAsync(suggestionRequest);
        }

        // Calculate NEWS2 if vital signs present
        if (suggestionRequest != null && (suggestionRequest.Pulse.HasValue || suggestionRequest.SpO2.HasValue))
        {
            result.EarlyWarningScore = await CalculateEarlyWarningScoreAsync(new EarlyWarningScoreRequestDto
            {
                Pulse = suggestionRequest.Pulse,
                BloodPressureSystolic = suggestionRequest.BloodPressureSystolic,
                RespiratoryRate = suggestionRequest.RespiratoryRate,
                Temperature = suggestionRequest.Temperature,
                SpO2 = suggestionRequest.SpO2,
            });
        }

        result.Alerts = await alertsTask;
        result.FrequentDiagnoses = await frequentTask;

        return result;
    }

    // ========== FREQUENT DIAGNOSES ==========

    public async Task<List<IcdCodeFullDto>> GetFrequentDiagnosesAsync(string? departmentId, int limit = 10)
    {
        try
        {
            using var connection = new SqlConnection(_context.Database.GetConnectionString());
            await connection.OpenAsync();
            var sql = @"SELECT TOP (@Limit) e.MainIcdCode, COUNT(*) as Cnt
                FROM Examinations e
                WHERE e.IsDeleted = 0 AND e.MainIcdCode IS NOT NULL AND e.MainIcdCode != ''
                AND e.CreatedAt >= DATEADD(MONTH, -3, GETDATE())
                " + (departmentId != null ? "AND e.DepartmentId = @DeptId" : "") + @"
                GROUP BY e.MainIcdCode
                ORDER BY Cnt DESC";
            using var cmd = new SqlCommand(sql, connection);
            cmd.Parameters.AddWithValue("@Limit", limit);
            if (departmentId != null)
                cmd.Parameters.AddWithValue("@DeptId", Guid.Parse(departmentId));

            var codes = new List<string>();
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
                codes.Add(reader.GetString(0));

            if (!codes.Any()) return new List<IcdCodeFullDto>();

            // Look up ICD details
            var icds = await _context.Set<HIS.Core.Entities.IcdCode>()
                .Where(i => codes.Contains(i.Code) && i.IsActive)
                .Select(i => new IcdCodeFullDto
                {
                    Code = i.Code,
                    Name = i.Name,
                    EnglishName = i.NameEnglish ?? "",
                    IsActive = i.IsActive,
                })
                .ToListAsync();

            // Preserve frequency order
            return codes.Select(c => icds.FirstOrDefault(i => i.Code == c))
                .Where(i => i != null).Cast<IcdCodeFullDto>().ToList();
        }
        catch
        {
            return new List<IcdCodeFullDto>();
        }
    }

    // ========== HELPERS ==========

    private async Task<HashSet<string>> GetDepartmentFrequentCodesAsync(string departmentId)
    {
        try
        {
            using var connection = new SqlConnection(_context.Database.GetConnectionString());
            await connection.OpenAsync();
            var sql = @"SELECT DISTINCT TOP 50 e.MainIcdCode
                FROM Examinations e
                WHERE e.IsDeleted = 0 AND e.MainIcdCode IS NOT NULL
                AND e.DepartmentId = @DeptId
                AND e.CreatedAt >= DATEADD(MONTH, -6, GETDATE())";
            using var cmd = new SqlCommand(sql, connection);
            cmd.Parameters.AddWithValue("@DeptId", Guid.Parse(departmentId));
            var codes = new HashSet<string>();
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
                codes.Add(reader.GetString(0));
            return codes;
        }
        catch { return new HashSet<string>(); }
    }

    private static List<string> NormalizeTerms(List<string> terms)
    {
        return terms.Select(Normalize).Where(t => t.Length > 0).ToList();
    }

    private static string Normalize(string text)
    {
        return text.Trim().ToLowerInvariant()
            .Replace(".", "").Replace(",", "").Replace(";", "");
    }

    private record SymptomDiagnosisRule(
        string IcdCode, string IcdName, string EnglishName,
        string[] Symptoms, string[] Signs, string Category);
}
