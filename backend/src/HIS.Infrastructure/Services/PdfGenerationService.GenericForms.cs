using System.Text;
using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

public partial class PdfGenerationService
{
    // ========== Private helpers ==========

    /// <summary>
    /// Sinh generic form HTML cho cac form MS. 06-17, DD. 01-21
    /// Dung thong tin chung tu examination/patient + noi dung template rong cho dien tay
    /// </summary>
    private string GenerateGenericFormHtml(
        string formType,
        HIS.Core.Entities.Patient? patient,
        HIS.Core.Entities.MedicalRecord? mr,
        HIS.Core.Entities.Examination exam)
    {
        var (title, number) = GetFormTitleAndNumber(formType);

        var bodyContent = formType.ToLower() switch
        {
            "preanesthetic" => GetPreAnestheticContent(exam),
            "consent" => GetSurgeryConsentContent(patient),
            "progress" => GetProgressNoteContent(exam),
            "counseling" => GetCounselingContent(),
            "deathreview" => GetDeathReviewContent(exam),
            "finalsummary" => GetFinalSummaryContent(exam, mr),
            _ => GetDefaultFormContent(formType)
        };

        return GetGenericForm(title, number,
            patient?.PatientCode, patient?.FullName, patient?.Gender ?? 0, patient?.DateOfBirth,
            patient?.Address, patient?.PhoneNumber, patient?.InsuranceNumber,
            mr?.MedicalRecordCode, mr?.Department?.DepartmentName,
            bodyContent, exam.Doctor?.FullName);
    }

    private static (string title, string number) GetFormTitleAndNumber(string formType)
    {
        return formType.ToLower() switch
        {
            "preanesthetic" => ("PHI\u1EBEU KH\u00C1M TI\u1EC0N M\u00CA", "MS. 06/BV"),
            "consent" => ("CAM K\u1EBET PH\u1EAAU THU\u1EACT", "MS. 07/BV"),
            "progress" => ("S\u01A0 K\u1EBET 15 NG\u00C0Y \u0110I\u1EC0U TR\u1ECA", "MS. 08/BV"),
            "counseling" => ("PHI\u1EBEU T\u01AF V\u1EA4N", "MS. 09/BV"),
            "deathreview" => ("KI\u1EC2M \u0110I\u1EC2M T\u1EEC VONG", "MS. 10/BV"),
            "finalsummary" => ("T\u1ED4NG K\u1EBET H\u1ED2 S\u01A0 B\u1EC6NH \u00C1N", "MS. 11/BV"),
            "nutrition" => ("PHI\u1EBEU KH\u00C1M DINH D\u01AF\u1EE0NG", "MS. 12/BV"),
            "surgeryrecord" => ("PHI\u1EBEU PH\u1EAAU THU\u1EACT", "MS. 13/BV"),
            "surgeryapproval" => ("DUY\u1EC6T PH\u1EAAU THU\u1EACT", "MS. 14/BV"),
            "surgerysummary" => ("S\u01A0 K\u1EBET PH\u1EAAU THU\u1EACT", "MS. 15/BV"),
            "depttransfer" => ("B\u00C0N GIAO CHUY\u1EC2N KHOA", "MS. 16/BV"),
            "admission" => ("KH\u00C1M V\u00C0O VI\u1EC6N", "MS. 17/BV"),
            // Nursing forms DD. 01-21
            "dd01-careplan" => ("K\u1EBEHO\u1EA0CH CH\u0102M S\u00D3C", "DD. 01"),
            "dd02-icucare" => ("K\u1EBEHO\u1EA0CH CH\u0102M S\u00D3C HSCC", "DD. 02"),
            "dd03-assessment" => ("NH\u1EACN \u0110\u1ECBNH \u0110I\u1EC0U D\u01AF\u1EE0NG", "DD. 03"),
            "dd04-dailycare" => ("THEO D\u00D5I CH\u0102M S\u00D3C", "DD. 04"),
            "dd05-infusion" => ("TRUY\u1EC0N D\u1ECACH", "DD. 05"),
            "dd06-bloodlab" => ("TRUY\u1EC0N M\u00C1U (X\u00C9T NGHI\u1EC6M)", "DD. 06"),
            "dd07-bloodclinical" => ("TRUY\u1EC0N M\u00C1U (L\u00C2M S\u00C0NG)", "DD. 07"),
            "dd08-vitalsigns" => ("CH\u1EE8C N\u0102NG S\u1ED0NG", "DD. 08"),
            "dd09-meddisclosure" => ("C\u00D4NG KHAI THU\u1ED0C", "DD. 09"),
            "dd10-preop" => ("CHU\u1EA8N B\u1ECA TR\u01AF\u1EDAC M\u1ED4", "DD. 10"),
            "dd11-icutransfer" => ("CHUY\u1EC2N KH\u1ECEI H\u1ED2I S\u1EE8C", "DD. 11"),
            "dd12-nursetransfer" => ("B\u00C0N GIAO B\u1EC6NH NH\u00C2N (\u0110D)", "DD. 12"),
            "dd13-preeclampsia" => ("TI\u1EC0N S\u1EA2N GI\u1EACT", "DD. 13"),
            "dd14-ipdhandover" => ("B\u00C0N GIAO N\u1ED8I TR\u00DA", "DD. 14"),
            "dd15-orhandover" => ("B\u00C0N GIAO CHUY\u1EC2N M\u1ED4", "DD. 15"),
            "dd16-safetychecklist" => ("AN TO\u00C0N PH\u1EAAU THU\u1EACT (WHO)", "DD. 16"),
            "dd17-glucose" => ("\u0110\u01AF\u1EDCNG HUY\u1EBET", "DD. 17"),
            "dd18-pregnancyrisk" => ("THAI K\u1EF2 NGUY C\u01A0", "DD. 18"),
            "dd19-swallowing" => ("TEST NU\u1ED0T", "DD. 19"),
            "dd20-docscan" => ("SCAN T\u00C0I LI\u1EC6U", "DD. 20"),
            "dd21-vap" => ("VIPH\u1ED4I TH\u1EDE M\u00C1Y", "DD. 21"),
            _ => ("BI\u1EC2U M\u1EAAU EMR", formType.ToUpper())
        };
    }

    private static string GetPreAnestheticContent(HIS.Core.Entities.Examination exam)
    {
        return $@"
<div class=""section-title"">1. TI\u1EC0N S\u1EEC</div>
<p>Ti\u1EC1n s\u1EED b\u1EC7nh: ................................................................</p>
<p>D\u1ECB \u1EE9ng: ................................................................</p>
<p>Thu\u1ED1c \u0111ang d\u00F9ng: ................................................................</p>

<div class=""section-title"">2. KH\u00C1M HI\u1EC6N T\u1EA0I</div>
<p>C\u00E2n n\u1EB7ng: {exam.Weight?.ToString("0.0") ?? "........"} kg &nbsp;&nbsp; Chi\u1EC1u cao: {exam.Height?.ToString("0.0") ?? "........"} cm &nbsp;&nbsp; BMI: {exam.BMI?.ToString("0.0") ?? "........"}</p>
<p>M\u1EA1ch: {exam.Pulse?.ToString() ?? "........"} l/ph &nbsp;&nbsp; HA: {exam.BloodPressureSystolic?.ToString() ?? "..."}/{exam.BloodPressureDiastolic?.ToString() ?? "..."} mmHg &nbsp;&nbsp; SpO2: {exam.SpO2?.ToString("0.0") ?? "........"} %</p>
<p>Kh\u00E1m to\u00E0n th\u00E2n: {System.Net.WebUtility.HtmlEncode(exam.PhysicalExamination ?? "............................................")}</p>

<div class=""section-title"">3. PH\u00C2N LO\u1EA0I ASA</div>
<p><span class=""checkbox""></span> I &nbsp;&nbsp; <span class=""checkbox""></span> II &nbsp;&nbsp; <span class=""checkbox""></span> III &nbsp;&nbsp; <span class=""checkbox""></span> IV &nbsp;&nbsp; <span class=""checkbox""></span> V</p>

<div class=""section-title"">4. PH\u00C2N LO\u1EA0I MALLAMPATI</div>
<p><span class=""checkbox""></span> I &nbsp;&nbsp; <span class=""checkbox""></span> II &nbsp;&nbsp; <span class=""checkbox""></span> III &nbsp;&nbsp; <span class=""checkbox""></span> IV</p>

<div class=""section-title"">5. K\u1EBEHO\u1EA0CH G\u00C2Y M\u00CA</div>
<p>Ph\u01B0\u01A1ng ph\u00E1p g\u00E2y m\u00EA/t\u00EA: ................................................................</p>
<p>Ch\u1EC9 d\u1EABn tr\u01B0\u1EDBc m\u1ED5: ................................................................</p>";
    }

    private static string GetSurgeryConsentContent(HIS.Core.Entities.Patient? patient)
    {
        return $@"
<p class=""mt-10"">T\u00F4i t\u00EAn l\u00E0: ................................................................</p>
<p>L\u00E0 <span class=""checkbox""></span> Ng\u01B0\u1EDDi b\u1EC7nh &nbsp;&nbsp; <span class=""checkbox""></span> Th\u00E2n nh\u00E2n (quan h\u1EC7: ................)</p>
<p>C\u1EE7a ng\u01B0\u1EDDi b\u1EC7nh: <b>{System.Net.WebUtility.HtmlEncode(patient?.FullName ?? "")}</b></p>

<div class=""section-title"">CAM K\u1EBET</div>
<p>Sau khi \u0111\u01B0\u1EE3c b\u00E1c s\u0129 gi\u1EA3i th\u00EDch v\u1EC1:</p>
<ul style=""margin-left:20px"">
    <li>T\u00ECnh tr\u1EA1ng b\u1EC7nh</li>
    <li>Ph\u01B0\u01A1ng ph\u00E1p ph\u1EABu thu\u1EADt/th\u1EE7 thu\u1EADt</li>
    <li>C\u00E1c nguy c\u01A1, bi\u1EBFn ch\u1EE9ng c\u00F3 th\u1EC3 x\u1EA3y ra</li>
    <li>Ph\u01B0\u01A1ng ph\u00E1p thay th\u1EBF</li>
</ul>
<p class=""mt-10"">T\u00F4i \u0111\u1ED3ng \u00FD cho ph\u1EABu thu\u1EADt/th\u1EE7 thu\u1EADt: ................................................................</p>
<p>T\u00F4i hi\u1EC3u r\u00F5 v\u00E0 ch\u1EA5p nh\u1EADn c\u00E1c nguy c\u01A1 c\u00F3 th\u1EC3 x\u1EA3y ra.</p>";
    }

    private static string GetProgressNoteContent(HIS.Core.Entities.Examination exam)
    {
        return $@"
<div class=""section-title"">1. DI\u1EC4N BI\u1EBEN L\u00C2M S\u00C0NG</div>
<p>{System.Net.WebUtility.HtmlEncode(exam.PresentIllness ?? "............................................................................................................")}</p>

<div class=""section-title"">2. K\u1EBET QU\u1EA2 C\u1EACN L\u00C2M S\u00C0NG</div>
<p>............................................................................................................</p>

<div class=""section-title"">3. \u0110I\u1EC0U TR\u1ECA \u0110\u00C3 TH\u1EFACE HI\u1EC6N</div>
<p>{System.Net.WebUtility.HtmlEncode(exam.TreatmentPlan ?? "............................................................................................................")}</p>

<div class=""section-title"">4. T\u00CCNH TR\u1EA0NG HI\u1EC6N T\u1EA0I</div>
<p>............................................................................................................</p>

<div class=""section-title"">5. H\u01AF\u1EDANG \u0110I\u1EC0U TR\u1ECA TI\u1EAEP</div>
<p>............................................................................................................</p>";
    }

    private static string GetCounselingContent()
    {
        return @"
<div class=""section-title"">1. N\u1ED8I DUNG T\u01AF V\u1EA4N</div>
<p>............................................................................................................</p>
<p>............................................................................................................</p>
<p>............................................................................................................</p>

<div class=""section-title"">2. C\u00C2U H\u1ECEI C\u1EE6A NG\u01AF\u1EDCI B\u1EC6NH</div>
<p>............................................................................................................</p>
<p>............................................................................................................</p>

<div class=""section-title"">3. M\u1EE8C \u0110\u1ED8 HI\u1EC2U BI\u1EBET</div>
<p>
    <span class=""checkbox""></span> Hi\u1EC3u r\u00F5 &nbsp;&nbsp;
    <span class=""checkbox""></span> Hi\u1EC3u m\u1ED9t ph\u1EA7n &nbsp;&nbsp;
    <span class=""checkbox""></span> Ch\u01B0a hi\u1EC3u &nbsp;&nbsp;
    <span class=""checkbox""></span> Kh\u00F4ng h\u1EE3p t\u00E1c
</p>";
    }

    private static string GetDeathReviewContent(HIS.Core.Entities.Examination exam)
    {
        return $@"
<div class=""section-title"">1. CH\u1EA8N \u0110O\u00C1N</div>
<p>{System.Net.WebUtility.HtmlEncode(exam.MainDiagnosis ?? "............................................................................................................")}</p>

<div class=""section-title"">2. QU\u00C1 TR\u00CCNH \u0110I\u1EC0U TR\u1ECA</div>
<p>............................................................................................................</p>
<p>............................................................................................................</p>

<div class=""section-title"">3. NH\u1EACN X\u00C9T</div>
<p>............................................................................................................</p>
<p>............................................................................................................</p>

<div class=""section-title"">4. B\u00C0I H\u1ECCC KINH NGHI\u1EC6M</div>
<p>............................................................................................................</p>
<p>............................................................................................................</p>

<div class=""section-title"">5. TH\u00C0NH PH\u1EA6N THAM D\u1EF0</div>
<p>............................................................................................................</p>";
    }

    private static string GetFinalSummaryContent(HIS.Core.Entities.Examination exam, HIS.Core.Entities.MedicalRecord? mr)
    {
        return $@"
<div class=""section-title"">1. QU\u00C1 TR\u00CCNH B\u1EC6NH L\u00DD V\u00C0 DI\u1EC4N BI\u1EBEN L\u00C2M S\u00C0NG</div>
<p>{System.Net.WebUtility.HtmlEncode(exam.PresentIllness ?? "............................................................................................................")}</p>

<div class=""section-title"">2. K\u1EBET QU\u1EA2 C\u1EACN L\u00C2M S\u00C0NG</div>
<p>............................................................................................................</p>

<div class=""section-title"">3. CH\u1EA8N \u0110O\u00C1N</div>
<p><b>Ch\u1EA9n \u0111o\u00E1n ch\u00EDnh:</b> {System.Net.WebUtility.HtmlEncode(exam.MainDiagnosis ?? mr?.MainDiagnosis ?? "")} ({System.Net.WebUtility.HtmlEncode(exam.MainIcdCode ?? mr?.MainIcdCode ?? "")})</p>
<p><b>Ch\u1EA9n \u0111o\u00E1n ph\u1EE5:</b> {System.Net.WebUtility.HtmlEncode(exam.SubDiagnosis ?? mr?.SubDiagnosis ?? "")}</p>

<div class=""section-title"">4. \u0110I\u1EC0U TR\u1ECA</div>
<p>{System.Net.WebUtility.HtmlEncode(exam.TreatmentPlan ?? "............................................................................................................")}</p>

<div class=""section-title"">5. K\u1EBET QU\u1EA2 \u0110I\u1EC0U TR\u1ECA</div>
<p>
    <span class=""checkbox""></span> Kh\u1ECFi &nbsp;&nbsp;
    <span class=""checkbox""></span> \u0110\u1EE1, gi\u1EA3m &nbsp;&nbsp;
    <span class=""checkbox""></span> Kh\u00F4ng thay \u0111\u1ED5i &nbsp;&nbsp;
    <span class=""checkbox""></span> N\u1EB7ng h\u01A1n &nbsp;&nbsp;
    <span class=""checkbox""></span> T\u1EED vong
</p>

<div class=""section-title"">6. H\u01AF\u1EDANG TI\u1EAEP</div>
<p>............................................................................................................</p>";
    }

    private static string GetDefaultFormContent(string formType)
    {
        // Tra ve form rong voi dong ke de dien tay, ap dung cho cac form DD. 01-21
        return @"
<div class=""mt-10"">
    <p>............................................................................................................</p>
    <p>............................................................................................................</p>
    <p>............................................................................................................</p>
    <p>............................................................................................................</p>
    <p>............................................................................................................</p>
    <p>............................................................................................................</p>
    <p>............................................................................................................</p>
    <p>............................................................................................................</p>
    <p>............................................................................................................</p>
    <p>............................................................................................................</p>
</div>";
    }

}
