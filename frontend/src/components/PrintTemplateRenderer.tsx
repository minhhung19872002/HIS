import React, { useState, useEffect } from 'react';
import { Spin } from 'antd';

interface PrintTemplateRendererProps {
  printType: string;
  record: any;
  printRef: React.RefObject<any>;
  selectedConsultation?: any;
  treatmentSheets?: any[];
  nursingSheets?: any[];
}

async function loadTemplate(printType: string): Promise<React.ComponentType<any> | null> {
  switch (printType) {
    // EMRPrintTemplates
    case 'summary': return (await import('./EMRPrintTemplates')).MedicalRecordSummaryPrint;
    case 'treatment': return (await import('./EMRPrintTemplates')).TreatmentSheetPrint;
    case 'consultation': return (await import('./EMRPrintTemplates')).ConsultationPrint;
    case 'nursing': return (await import('./EMRPrintTemplates')).NursingCarePrint;
    case 'discharge': return (await import('./EMRPrintTemplates')).DischargeCertificatePrint;
    case 'preanesthetic': return (await import('./EMRPrintTemplates')).PreAnestheticExamPrint;
    case 'consent': return (await import('./EMRPrintTemplates')).SurgeryConsentPrint;
    case 'progress': return (await import('./EMRPrintTemplates')).TreatmentProgressNotePrint;
    case 'counseling': return (await import('./EMRPrintTemplates')).CounselingFormPrint;
    case 'deathreview': return (await import('./EMRPrintTemplates')).DeathReviewPrint;
    case 'finalsummary': return (await import('./EMRPrintTemplates')).MedicalRecordFinalSummaryPrint;
    case 'nutrition': return (await import('./EMRPrintTemplates')).NutritionExamPrint;
    case 'surgeryrecord': return (await import('./EMRPrintTemplates')).SurgeryRecordPrint;
    case 'surgeryapproval': return (await import('./EMRPrintTemplates')).SurgeryApprovalPrint;
    case 'surgerysummary': return (await import('./EMRPrintTemplates')).SurgerySummaryPrint;
    case 'depttransfer': return (await import('./EMRPrintTemplates')).DepartmentTransferPrint;
    case 'admission': return (await import('./EMRPrintTemplates')).AdmissionExamPrint;
    case 'obstetrics': return (await import('./EMRPrintTemplates')).ObstetricsMedicalRecordPrint;
    case 'neonatal': return (await import('./EMRPrintTemplates')).NeonatalMedicalRecordPrint;
    case 'pediatric': return (await import('./EMRPrintTemplates')).PediatricMedicalRecordPrint;

    // ClinicalFormPrintTemplates
    case 'cdha-xray': return (await import('./ClinicalFormPrintTemplates')).XRayReportPrint;
    case 'cdha-ct': return (await import('./ClinicalFormPrintTemplates')).CTScanReportPrint;
    case 'cdha-mri': return (await import('./ClinicalFormPrintTemplates')).MRIReportPrint;
    case 'cdha-ultrasound': return (await import('./ClinicalFormPrintTemplates')).UltrasoundReportPrint;
    case 'cdha-ecg': return (await import('./ClinicalFormPrintTemplates')).ECGReportPrint;
    case 'tdcn-eeg': return (await import('./ClinicalFormPrintTemplates')).EEGReportPrint;
    case 'tdcn-endoscopy': return (await import('./ClinicalFormPrintTemplates')).EndoscopyReportPrint;
    case 'tdcn-pft': return (await import('./ClinicalFormPrintTemplates')).PFTReportPrint;
    case 'xn-general': return (await import('./ClinicalFormPrintTemplates')).GeneralLabReportPrint;
    case 'xn-hematology': return (await import('./ClinicalFormPrintTemplates')).HematologyReportPrint;
    case 'xn-biochemistry': return (await import('./ClinicalFormPrintTemplates')).BiochemistryReportPrint;
    case 'xn-microbiology': return (await import('./ClinicalFormPrintTemplates')).MicrobiologyReportPrint;
    case 'ls-allergy': return (await import('./ClinicalFormPrintTemplates')).AllergyFormPrint;
    case 'ls-postop': return (await import('./ClinicalFormPrintTemplates')).PostOpNotePrint;
    case 'ls-icuinfo': return (await import('./ClinicalFormPrintTemplates')).ICUInfoSheetPrint;

    // EMRNursingPrintTemplates
    case 'dd01-careplan': return (await import('./EMRNursingPrintTemplates')).NursingCarePlanPrint;
    case 'dd02-icucare': return (await import('./EMRNursingPrintTemplates')).ICUNursingCarePlanPrint;
    case 'dd03-assessment': return (await import('./EMRNursingPrintTemplates')).NursingAssessmentPrint;
    case 'dd04-dailycare': return (await import('./EMRNursingPrintTemplates')).DailyNursingCarePrint;
    case 'dd05-infusion': return (await import('./EMRNursingPrintTemplates')).InfusionMonitoringPrint;
    case 'dd06-bloodlab': return (await import('./EMRNursingPrintTemplates')).BloodTransfusionLabPrint;
    case 'dd07-bloodclinical': return (await import('./EMRNursingPrintTemplates')).BloodTransfusionClinicalPrint;
    case 'dd08-vitalsigns': return (await import('./EMRNursingPrintTemplates')).VitalSignsMonitoringPrint;
    case 'dd09-meddisclosure': return (await import('./EMRNursingPrintTemplates')).MedicineDisclosurePrint;
    case 'dd10-preop': return (await import('./EMRNursingPrintTemplates')).PreOpPreparationPrint;
    case 'dd11-icutransfer': return (await import('./EMRNursingPrintTemplates')).ICUTransferCriteriaPrint;
    case 'dd12-nursetransfer': return (await import('./EMRNursingPrintTemplates')).NursingDeptTransferPrint;
    case 'dd13-preeclampsia': return (await import('./EMRNursingPrintTemplates')).PreEclampsiaPrint;
    case 'dd14-ipdhandover': return (await import('./EMRNursingPrintTemplates')).IPDHandoverChecklistPrint;
    case 'dd15-orhandover': return (await import('./EMRNursingPrintTemplates')).ORHandoverChecklistPrint;
    case 'dd16-safetychecklist': return (await import('./EMRNursingPrintTemplates')).SurgicalSafetyChecklistPrint;
    case 'dd17-glucose': return (await import('./EMRNursingPrintTemplates')).GlucoseMonitoringPrint;
    case 'dd18-pregnancyrisk': return (await import('./EMRNursingPrintTemplates')).PregnancyRiskPrint;
    case 'dd19-swallowing': return (await import('./EMRNursingPrintTemplates')).SwallowingAssessmentPrint;
    case 'dd20-docscan': return (await import('./EMRNursingPrintTemplates')).DocumentScanPrint;
    case 'dd21-vap': return (await import('./EMRNursingPrintTemplates')).VAPMonitoringPrint;

    // SpecialtyEMRForms1
    case 'sp-noikhoa': return (await import('./SpecialtyEMRForms1')).NoiKhoaBAPrint;
    case 'sp-truyennhiem': return (await import('./SpecialtyEMRForms1')).TruyenNhiemBAPrint;
    case 'sp-phukhoa': return (await import('./SpecialtyEMRForms1')).PhuKhoaBAPrint;
    case 'sp-tamthan': return (await import('./SpecialtyEMRForms1')).TamThanBAPrint;
    case 'sp-dalieu': return (await import('./SpecialtyEMRForms1')).DaLieuBAPrint;
    case 'sp-huyethoc': return (await import('./SpecialtyEMRForms1')).HuyetHocBAPrint;
    case 'sp-ngoaikhoa': return (await import('./SpecialtyEMRForms1')).NgoaiKhoaBAPrint;
    case 'sp-bong': return (await import('./SpecialtyEMRForms1')).BongBAPrint;
    case 'sp-ungbuou': return (await import('./SpecialtyEMRForms1')).UngBuouBAPrint;
    case 'sp-rhm': return (await import('./SpecialtyEMRForms1')).RHMBAPrint;
    case 'sp-tmh': return (await import('./SpecialtyEMRForms1')).TMHBAPrint;
    case 'sp-ngoaitru': return (await import('./SpecialtyEMRForms1')).NgoaiTruChungBAPrint;
    case 'sp-ngoaitrurhm': return (await import('./SpecialtyEMRForms1')).NgoaiTruRHMBAPrint;
    case 'sp-tuyenxa': return (await import('./SpecialtyEMRForms1')).TuyenXaBAPrint;
    case 'sp-yhctnoidru': return (await import('./SpecialtyEMRForms1')).YHCTNoiTruBAPrint;

    // SpecialtyEMRForms2
    case 'sp-yhctngoaitru': return (await import('./SpecialtyEMRForms2')).YHCTNgoaiTruBAPrint;
    case 'sp-nhiyhct': return (await import('./SpecialtyEMRForms2')).NhiYHCTBAPrint;
    case 'sp-matchung': return (await import('./SpecialtyEMRForms2')).MatBenhAnPrint;
    case 'sp-matglocom': return (await import('./SpecialtyEMRForms2')).MatGlaucomaPrint;
    case 'sp-matducttt': return (await import('./SpecialtyEMRForms2')).MatDucTTTPrint;
    case 'sp-matleo': return (await import('./SpecialtyEMRForms2')).MatLeoPrint;
    case 'sp-matvmcb': return (await import('./SpecialtyEMRForms2')).MatVMCBPrint;
    case 'sp-matkxt': return (await import('./SpecialtyEMRForms2')).MatKXTPrint;
    case 'sp-phcn': return (await import('./SpecialtyEMRForms2')).PHCNBAPrint;
    case 'sp-phcnnhi': return (await import('./SpecialtyEMRForms2')).PHCNNhiBAPrint;
    case 'sp-phcnngoaitru': return (await import('./SpecialtyEMRForms2')).NgoaiTruPHCNBAPrint;
    case 'sp-giaykhamsuckhoe': return (await import('./SpecialtyEMRForms2')).KhamTheoYCPrint;
    case 'sp-phieuchuyenkhoa': return (await import('./SpecialtyEMRForms2')).KhamCKPrint;
    case 'sp-chamsoccap1': return (await import('./SpecialtyEMRForms2')).CSCap1Print;
    case 'sp-chamsoccap2': return (await import('./SpecialtyEMRForms2')).CSCap2Print;

    default: return null;
  }
}

export default function PrintTemplateRenderer({ printType, record, printRef, selectedConsultation, treatmentSheets, nursingSheets }: PrintTemplateRendererProps) {
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadTemplate(printType).then((Comp) => {
      if (!cancelled) {
        setComponent(() => Comp);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [printType]);

  if (loading) return <Spin style={{ display: 'flex', justifyContent: 'center', padding: 40 }} />;
  if (!Component) return null;

  // Specialty forms use `data` prop
  if (printType.startsWith('sp-')) {
    return <Component ref={printRef} data={record} />;
  }
  // Clinical/radiology/lab forms use untyped `record` prop
  if (printType.startsWith('cdha-') || printType.startsWith('tdcn-') || printType.startsWith('xn-') || printType.startsWith('ls-')) {
    return <Component record={record as unknown as Record<string, unknown> | undefined} />;
  }
  // Consultation needs extra prop
  if (printType === 'consultation' && selectedConsultation) {
    return <Component ref={printRef} record={record} consultation={selectedConsultation} />;
  }
  // Treatment sheet needs sheets array
  if (printType === 'treatment') {
    return <Component ref={printRef} record={record} sheets={treatmentSheets} />;
  }
  // Nursing care needs sheets array
  if (printType === 'nursing') {
    return <Component ref={printRef} record={record} sheets={nursingSheets} />;
  }
  // Discharge certificate needs destructured patient props
  if (printType === 'discharge' && record?.patient) {
    return <Component
      patientName={record.patient.fullName ?? ''}
      patientCode={record.patient.patientCode ?? ''}
      gender={record.patient.gender ?? 1}
      age={record.patient.age ?? 0}
      address={record.patient.address}
      admissionDate=""
      dischargeDate=""
      departmentName=""
      doctorName=""
      dischargeCondition=""
      daysOfStay={0}
    />;
  }
  // Surgery consent needs destructured patient props
  if (printType === 'consent' && record?.patient) {
    return <Component
      patientName={record.patient.fullName ?? ''}
      patientCode={record.patient.patientCode ?? ''}
      gender={record.patient.gender ?? 1}
      age={record.patient.age ?? 0}
      address={record.patient.address}
    />;
  }
  // Default: record prop with ref
  return <Component ref={printRef} record={record} />;
}
