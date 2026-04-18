import { test, expect, Page } from '@playwright/test';

/**
 * Walks every authenticated page on prod and classifies each as:
 *   - has-data: the page's tables/cards show at least one row
 *   - empty:    page renders .ant-empty OR 0 rows OR "Không có dữ liệu" text
 *   - skip:     page intentionally shows no list (e.g. wizards, forms, static)
 *
 * The list is written to test-results/empty-pages.json so the follow-up seed
 * work has a deterministic target list.
 */

const ROUTES: Array<{ path: string; skip?: boolean; label: string }> = [
  { path: '/reception', label: 'Reception' },
  { path: '/opd', label: 'OPD', skip: true },
  { path: '/prescription', label: 'Prescription' },
  { path: '/ipd', label: 'Inpatient' },
  { path: '/surgery', label: 'Surgery' },
  { path: '/pharmacy', label: 'Pharmacy' },
  { path: '/medical-supply', label: 'MedicalSupply' },
  { path: '/follow-up', label: 'FollowUp' },
  { path: '/booking-management', label: 'BookingManagement' },
  { path: '/sms-management', label: 'SmsManagement' },
  { path: '/lab', label: 'Laboratory' },
  { path: '/lab-qc', label: 'LabQC' },
  { path: '/microbiology', label: 'Microbiology' },
  { path: '/culture-collection', label: 'CultureCollection' },
  { path: '/sample-storage', label: 'SampleStorage' },
  { path: '/screening', label: 'Screening' },
  { path: '/reagent-management', label: 'ReagentManagement' },
  { path: '/sample-tracking', label: 'SampleTracking' },
  { path: '/pathology', label: 'Pathology' },
  { path: '/ivf-lab', label: 'IvfLab' },
  { path: '/radiology', label: 'Radiology' },
  { path: '/blood-bank', label: 'BloodBank' },
  { path: '/billing', label: 'Billing' },
  { path: '/finance', label: 'Finance' },
  { path: '/insurance', label: 'Insurance' },
  { path: '/reports', label: 'Reports' },
  { path: '/telemedicine', label: 'Telemedicine' },
  { path: '/nutrition', label: 'Nutrition' },
  { path: '/infection-control', label: 'InfectionControl' },
  { path: '/rehabilitation', label: 'Rehabilitation' },
  { path: '/equipment', label: 'Equipment' },
  { path: '/hr', label: 'HR' },
  { path: '/quality', label: 'Quality' },
  { path: '/patient-portal', label: 'PatientPortal' },
  { path: '/health-exchange', label: 'HealthExchange' },
  { path: '/emergency-disaster', label: 'EmergencyDisaster' },
  { path: '/emr', label: 'EMR' },
  { path: '/consultation', label: 'Consultation' },
  { path: '/medical-record-archive', label: 'MedicalRecordArchive' },
  { path: '/bhxh-audit', label: 'BhxhAudit' },
  { path: '/doctor-portal', label: 'DoctorPortal' },
  { path: '/satisfaction-survey', label: 'SatisfactionSurvey' },
  { path: '/signing-workflow', label: 'SigningWorkflow' },
  { path: '/medical-record-planning', label: 'MedicalRecordPlanning' },
  { path: '/treatment-protocols', label: 'TreatmentProtocol' },
  { path: '/chronic-disease', label: 'ChronicDisease' },
  { path: '/hospital-pharmacy', label: 'HospitalPharmacy' },
  { path: '/clinical-guidance', label: 'ClinicalGuidance' },
  { path: '/tb-hiv', label: 'TbHivManagement' },
  { path: '/health-checkup', label: 'HealthCheckup' },
  { path: '/immunization', label: 'Immunization' },
  { path: '/epidemiology', label: 'Epidemiology' },
  { path: '/school-health', label: 'SchoolHealth' },
  { path: '/occupational-health', label: 'OccupationalHealth' },
  { path: '/methadone-treatment', label: 'MethadoneTreatment' },
  { path: '/food-safety', label: 'FoodSafety' },
  { path: '/community-health', label: 'CommunityHealth' },
  { path: '/hiv-management', label: 'HivManagement' },
  { path: '/medical-forensics', label: 'MedicalForensics' },
  { path: '/traditional-medicine', label: 'TraditionalMedicine' },
  { path: '/reproductive-health', label: 'ReproductiveHealth' },
  { path: '/mental-health', label: 'MentalHealth' },
  { path: '/environmental-health', label: 'EnvironmentalHealth' },
  { path: '/trauma-registry', label: 'TraumaRegistry' },
  { path: '/population-health', label: 'PopulationHealth' },
  { path: '/health-education', label: 'HealthEducation' },
  { path: '/practice-license', label: 'PracticeLicense' },
  { path: '/inter-hospital', label: 'InterHospitalSharing' },
  { path: '/asset-management', label: 'AssetManagement' },
  { path: '/training-research', label: 'TrainingResearch' },
  { path: '/procurement', label: 'Procurement' },
];

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[placeholder*="đăng nhập" i], input[name="username"], #username', 'admin');
  await page.fill('input[type="password"], #password', 'Admin@123');
  await page.getByRole('button', { name: /đăng nhập/i }).first().click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20000 });
}

test.describe('Prod page emptiness sweep', () => {
  test.describe.configure({ mode: 'serial', timeout: 600000 });

  test('find pages without data', async ({ page }) => {
    test.setTimeout(600000);
    await login(page);

    const results: Array<{
      path: string;
      label: string;
      status: 'has-data' | 'empty' | 'skip' | 'error';
      emptyCount: number;
      rowCount: number;
      detail?: string;
    }> = [];

    for (const route of ROUTES) {
      if (route.skip) {
        results.push({ path: route.path, label: route.label, status: 'skip', emptyCount: 0, rowCount: 0 });
        continue;
      }
      try {
        await page.goto(route.path, { waitUntil: 'domcontentloaded', timeout: 20000 });
        // Give XHRs time to populate
        await page.waitForTimeout(2500);

        // Count Antd empty markers vs actual table/card rows
        const emptyCount = await page.locator('.ant-empty').count();
        const rowCount = await page.locator('.ant-table-tbody > tr:not(.ant-table-placeholder)').count();
        const listItemCount = await page.locator('.ant-list-item:not(.ant-list-empty-text)').count();
        const cardBodyCount = await page.locator('.ant-pro-card-body, .ant-card-body').count();

        const hasText = await page.locator('text=/Không có d[ữ u]\\s*liệu|Chưa có|No data/i').count();

        const totalRows = rowCount + listItemCount;
        let status: 'has-data' | 'empty';
        if (totalRows > 0) status = 'has-data';
        else if (emptyCount > 0 || hasText > 0) status = 'empty';
        else status = cardBodyCount > 0 ? 'has-data' : 'empty';

        results.push({
          path: route.path,
          label: route.label,
          status,
          emptyCount,
          rowCount: totalRows,
          detail: status === 'empty' ? `empty=${emptyCount} text=${hasText}` : undefined,
        });
      } catch (e) {
        results.push({
          path: route.path,
          label: route.label,
          status: 'error',
          emptyCount: 0,
          rowCount: 0,
          detail: (e as Error).message,
        });
      }
    }

    const summary = {
      total: results.length,
      hasData: results.filter((r) => r.status === 'has-data').length,
      empty: results.filter((r) => r.status === 'empty').length,
      skipped: results.filter((r) => r.status === 'skip').length,
      error: results.filter((r) => r.status === 'error').length,
    };

    const emptyPages = results.filter((r) => r.status === 'empty');
    console.log('SUMMARY:', JSON.stringify(summary));
    console.log('EMPTY PAGES:');
    for (const r of emptyPages) console.log('  -', r.path, r.label, r.detail);

    // Also write a JSON report for downstream automation
    const fs = await import('fs');
    fs.writeFileSync(
      'test-results/empty-pages.json',
      JSON.stringify({ summary, emptyPages, all: results }, null, 2),
    );

    // This test is diagnostic — never fail CI just for empty pages.
    expect(summary.error).toBeLessThanOrEqual(5);
  });
});
