import React, { forwardRef } from 'react';
import dayjs from 'dayjs';
import { HOSPITAL_NAME, HOSPITAL_ADDRESS, HOSPITAL_PHONE } from '../constants/hospital';
import { PRINT_STYLES_BASE, PRINT_STYLES_DIGITAL_SIG } from '../constants/printStyles';
import { DigitalSignatureStamp } from './EMRPrintTemplates';
import type { SignatureStampInfo } from './EMRPrintTemplates';

const printStyles = PRINT_STYLES_BASE + PRINT_STYLES_DIGITAL_SIG;

const PrintHeader: React.FC<{ formNumber?: string }> = ({ formNumber }) => (
  <div className="header">
    <div className="ministry">BO Y TE</div>
    <div className="hospital-name">{HOSPITAL_NAME}</div>
    <div style={{ fontSize: 11 }}>{HOSPITAL_ADDRESS} - DT: {HOSPITAL_PHONE}</div>
    {formNumber && <div className="form-number">Mau so: {formNumber}</div>}
  </div>
);

const Field: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => (
  <div className="field">
    <span className="field-label">{label}: </span>
    <span className="field-value">{value ?? '...........................'}</span>
  </div>
);

const SignatureBlock: React.FC<{
  leftTitle: string;
  rightTitle: string;
  date?: Date;
  leftStamp?: SignatureStampInfo;
  rightStamp?: SignatureStampInfo;
}> = ({ leftTitle, rightTitle, date, leftStamp, rightStamp }) => (
  <div className="signature-row">
    <div className="sig">
      <div className="sig-title">{leftTitle}</div>
      {leftStamp ? (
        <DigitalSignatureStamp stamp={leftStamp} />
      ) : (
        <div className="sig-date">(Ky, ghi ro ho ten)</div>
      )}
    </div>
    <div className="sig">
      <div className="sig-date">
        {date ? `Ngay ${dayjs(date).format('DD')} thang ${dayjs(date).format('MM')} nam ${dayjs(date).format('YYYY')}` : ''}
      </div>
      <div className="sig-title">{rightTitle}</div>
      {rightStamp ? (
        <DigitalSignatureStamp stamp={rightStamp} />
      ) : (
        <div className="sig-date">(Ky, ghi ro ho ten)</div>
      )}
    </div>
  </div>
);

/** Shared patient header block */
const PatientBlock: React.FC<{ d: Record<string, any> }> = ({ d }) => (
  <div className="section">
    <div className="row">
      <div className="col"><Field label="Ho va ten" value={d.patientName} /></div>
      <div className="col"><Field label="Gioi tinh" value={d.gender} /></div>
      <div className="col"><Field label="Tuoi" value={d.age} /></div>
    </div>
    <div className="row">
      <div className="col"><Field label="Ma BN" value={d.patientCode} /></div>
      <div className="col"><Field label="Ma HSBA" value={d.medicalRecordCode} /></div>
    </div>
    <Field label="Dia chi" value={d.address} />
    <div className="row">
      <div className="col"><Field label="Nghe nghiep" value={d.occupation} /></div>
      <div className="col"><Field label="Dan toc" value={d.ethnicity} /></div>
    </div>
    <div className="row">
      <div className="col"><Field label="Ngay vao vien" value={d.admissionDate ? dayjs(d.admissionDate).format('DD/MM/YYYY') : undefined} /></div>
      <div className="col"><Field label="Khoa" value={d.departmentName} /></div>
    </div>
  </div>
);

/** Dotted area for free text */
const DottedArea: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div style={{ minHeight: lines * 22, borderBottom: '1px dotted #999', marginBottom: 4 }}>&nbsp;</div>
);

// ============================================================
// 1. BA Noi khoa (MS:01/BV1)
// ============================================================
export const InternalMedicineMRPrint = forwardRef<HTMLDivElement, { data: Record<string, any> }>(
  ({ data: d }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS:01/BV1" />
      <h2>BENH AN NOI KHOA</h2>
      <PatientBlock d={d} />
      <div className="section">
        <div className="section-title">I. LY DO VAO VIEN</div>
        <Field label="Ly do" value={d.admissionReason} />
      </div>
      <div className="section">
        <div className="section-title">II. BENH SU</div>
        <Field label="Qua trinh benh ly" value={d.historyOfPresentIllness} />
        <Field label="Tien su ban than" value={d.pastMedicalHistory} />
        <Field label="Tien su gia dinh" value={d.familyHistory} />
      </div>
      <div className="section">
        <div className="section-title">III. KHAM HIEN TAI</div>
        <div className="row">
          <div className="col"><Field label="Mach" value={d.pulse} /></div>
          <div className="col"><Field label="Nhiet do" value={d.temperature} /></div>
          <div className="col"><Field label="HA" value={d.bloodPressure} /></div>
          <div className="col"><Field label="Nhip tho" value={d.respiratoryRate} /></div>
        </div>
        <Field label="Toan than" value={d.generalExam} />
        <Field label="Tim mach" value={d.cardiovascular} />
        <Field label="Ho hap" value={d.respiratory} />
        <Field label="Tieu hoa" value={d.gastrointestinal} />
        <Field label="Than - Tiet nieu" value={d.renal} />
        <Field label="Than kinh" value={d.neurological} />
        <Field label="Co xuong khop" value={d.musculoskeletal} />
        <Field label="Cac co quan khac" value={d.otherOrgans} />
      </div>
      <div className="section">
        <div className="section-title">IV. CAN LAM SANG</div>
        <Field label="Xet nghiem mau" value={d.labBlood} />
        <Field label="Xet nghiem nuoc tieu" value={d.labUrine} />
        <Field label="Chan doan hinh anh" value={d.imaging} />
        <Field label="Tham do chuc nang" value={d.functionalTests} />
      </div>
      <div className="section">
        <div className="section-title">V. CHAN DOAN</div>
        <Field label="Chan doan so bo" value={d.preliminaryDiagnosis} />
        <Field label="Chan doan xac dinh" value={d.finalDiagnosis} />
        <Field label="Chan doan phan biet" value={d.differentialDiagnosis} />
        <Field label="Ma ICD" value={d.icdCode} />
      </div>
      <div className="section">
        <div className="section-title">VI. DIEU TRI</div>
        <Field label="Phuong phap dieu tri" value={d.treatmentPlan} />
        <Field label="Thuoc" value={d.medications} />
        <Field label="Che do dinh duong" value={d.nutritionPlan} />
        <Field label="Che do cham soc" value={d.carePlan} />
      </div>
      <div className="section">
        <div className="section-title">VII. TIEN LUONG</div>
        <Field label="Tien luong" value={d.prognosis} />
      </div>
      <SignatureBlock leftTitle="TRUONG KHOA" rightTitle="BAC SI DIEU TRI" date={new Date()} />
    </div>
  )
);
InternalMedicineMRPrint.displayName = 'InternalMedicineMRPrint';

// ============================================================
// 2. BA Truyen nhiem (MS:03/BV1)
// ============================================================
export const InfectiousDiseaseMRPrint = forwardRef<HTMLDivElement, { data: Record<string, any> }>(
  ({ data: d }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS:03/BV1" />
      <h2>BENH AN TRUYEN NHIEM</h2>
      <PatientBlock d={d} />
      <div className="section">
        <div className="section-title">I. DICH TE</div>
        <Field label="Noi o/den trong 14 ngay" value={d.epidemiologyTravel} />
        <Field label="Tiep xuc nguoi benh" value={d.contactHistory} />
        <Field label="Nguon lay nhiem nghi ngo" value={d.suspectedSource} />
        <Field label="Tien su tiem chung" value={d.vaccinationHistory} />
      </div>
      <div className="section">
        <div className="section-title">II. TRIEU CHUNG LAM SANG</div>
        <Field label="Ngay khoi phat" value={d.onsetDate} />
        <Field label="Sot" value={d.fever} />
        <Field label="Phat ban" value={d.rash} />
        <Field label="Trieu chung ho hap" value={d.respiratorySymptoms} />
        <Field label="Trieu chung tieu hoa" value={d.giSymptoms} />
        <Field label="Trieu chung than kinh" value={d.neuroSymptoms} />
        <Field label="Trieu chung khac" value={d.otherSymptoms} />
      </div>
      <div className="section">
        <div className="section-title">III. KHAM HIEN TAI</div>
        <div className="row">
          <div className="col"><Field label="Mach" value={d.pulse} /></div>
          <div className="col"><Field label="Nhiet do" value={d.temperature} /></div>
          <div className="col"><Field label="HA" value={d.bloodPressure} /></div>
        </div>
        <Field label="Toan than" value={d.generalExam} />
        <Field label="Kham cac co quan" value={d.organExam} />
      </div>
      <div className="section">
        <div className="section-title">IV. XN VI SINH</div>
        <Field label="Cay mau" value={d.bloodCulture} />
        <Field label="PCR" value={d.pcrResult} />
        <Field label="Huyet thanh hoc" value={d.serologyResult} />
        <Field label="Soi/nuoi cay khac" value={d.otherMicrobiology} />
      </div>
      <div className="section">
        <div className="section-title">V. CACH LY</div>
        <Field label="Hinh thuc cach ly" value={d.isolationType} />
        <Field label="Thoi gian cach ly" value={d.isolationDuration} />
      </div>
      <div className="section">
        <div className="section-title">VI. CHAN DOAN VA DIEU TRI</div>
        <Field label="Chan doan" value={d.diagnosis} />
        <Field label="Khang sinh" value={d.antibiotics} />
        <Field label="Khang virus" value={d.antivirals} />
        <Field label="Dieu tri ho tro" value={d.supportiveCare} />
      </div>
      <SignatureBlock leftTitle="TRUONG KHOA" rightTitle="BAC SI DIEU TRI" date={new Date()} />
    </div>
  )
);
InfectiousDiseaseMRPrint.displayName = 'InfectiousDiseaseMRPrint';

// ============================================================
// 3. BA Phu khoa (MS:04/BV1)
// ============================================================
export const GynecologyMRPrint = forwardRef<HTMLDivElement, { data: Record<string, any> }>(
  ({ data: d }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS:04/BV1" />
      <h2>BENH AN PHU KHOA</h2>
      <PatientBlock d={d} />
      <div className="section">
        <div className="section-title">I. TIEN SU KINH NGUYET</div>
        <div className="row">
          <div className="col"><Field label="Co kinh lan dau" value={d.menarcheAge} /></div>
          <div className="col"><Field label="Chu ky" value={d.menstrualCycle} /></div>
          <div className="col"><Field label="So ngay hanh kinh" value={d.menstrualDays} /></div>
        </div>
        <Field label="Kinh cuoi" value={d.lastMenstrualPeriod} />
        <Field label="Tinh chat kinh" value={d.menstrualCharacter} />
        <Field label="Roi loan kinh nguyet" value={d.menstrualDisorders} />
      </div>
      <div className="section">
        <div className="section-title">II. TIEN SU SAN KHOA</div>
        <div className="row">
          <div className="col"><Field label="PARA" value={d.para} /></div>
          <div className="col"><Field label="So lan sinh" value={d.deliveries} /></div>
          <div className="col"><Field label="So lan say/hut" value={d.abortions} /></div>
        </div>
        <Field label="Bien phap tranh thai" value={d.contraception} />
      </div>
      <div className="section">
        <div className="section-title">III. BENH SU</div>
        <Field label="Ly do kham" value={d.chiefComplaint} />
        <Field label="Qua trinh benh" value={d.historyOfPresentIllness} />
      </div>
      <div className="section">
        <div className="section-title">IV. KHAM PHU KHOA</div>
        <Field label="Kham ngoai" value={d.externalExam} />
        <Field label="Kham bang mo vit" value={d.speculumExam} />
        <Field label="Kham bang tay" value={d.bimanualExam} />
        <Field label="Kham truc trang" value={d.rectalExam} />
      </div>
      <div className="section">
        <div className="section-title">V. SIEU AM</div>
        <Field label="Sieu am bung" value={d.abdominalUltrasound} />
        <Field label="Sieu am dau do" value={d.transvaginalUltrasound} />
      </div>
      <div className="section">
        <div className="section-title">VI. CHAN DOAN VA DIEU TRI</div>
        <Field label="Chan doan" value={d.diagnosis} />
        <Field label="Phuong phap dieu tri" value={d.treatmentPlan} />
      </div>
      <SignatureBlock leftTitle="TRUONG KHOA" rightTitle="BAC SI DIEU TRI" date={new Date()} />
    </div>
  )
);
GynecologyMRPrint.displayName = 'GynecologyMRPrint';

// ============================================================
// 4. BA Tam than (MS:07/BV1)
// ============================================================
export const PsychiatryMRPrint = forwardRef<HTMLDivElement, { data: Record<string, any> }>(
  ({ data: d }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS:07/BV1" />
      <h2>BENH AN TAM THAN</h2>
      <PatientBlock d={d} />
      <div className="section">
        <div className="section-title">I. TIEN SU</div>
        <Field label="Tien su gia dinh (tam than)" value={d.familyPsychHistory} />
        <Field label="Tien su ban than" value={d.personalHistory} />
        <Field label="Tien su benh tam than" value={d.pastPsychHistory} />
        <Field label="Su dung chat gay nghien" value={d.substanceUse} />
      </div>
      <div className="section">
        <div className="section-title">II. BENH SU</div>
        <Field label="Hoan canh phat benh" value={d.onsetCircumstances} />
        <Field label="Dien bien benh" value={d.courseOfIllness} />
      </div>
      <div className="section">
        <div className="section-title">III. TRIEU CHUNG TAM THAN</div>
        <Field label="Bieu hien chung" value={d.generalAppearance} />
        <Field label="Y thuc" value={d.consciousness} />
        <Field label="Dinh huong" value={d.orientation} />
        <Field label="Cam xuc" value={d.mood} />
        <Field label="Tu duy (noi dung)" value={d.thoughtContent} />
        <Field label="Tu duy (hinh thuc)" value={d.thoughtProcess} />
        <Field label="Tri giac" value={d.perception} />
        <Field label="Hanh vi" value={d.behavior} />
        <Field label="Tri nho" value={d.memory} />
        <Field label="Tri tue" value={d.intelligence} />
        <Field label="Nhan thuc benh" value={d.insight} />
      </div>
      <div className="section">
        <div className="section-title">IV. DANH GIA CHUC NANG</div>
        <Field label="GAF Score" value={d.gafScore} />
        <Field label="Kha nang tu cham soc" value={d.selfCareAbility} />
        <Field label="Kha nang giao tiep" value={d.socialFunctioning} />
      </div>
      <div className="section">
        <div className="section-title">V. CHAN DOAN VA DIEU TRI</div>
        <Field label="Chan doan (ICD-10)" value={d.diagnosis} />
        <Field label="Thuoc huong than" value={d.psychotropicMeds} />
        <Field label="Lieu luong" value={d.dosage} />
        <Field label="Lieu phap tam ly" value={d.psychotherapy} />
      </div>
      <SignatureBlock leftTitle="TRUONG KHOA" rightTitle="BAC SI DIEU TRI" date={new Date()} />
    </div>
  )
);
PsychiatryMRPrint.displayName = 'PsychiatryMRPrint';

// ============================================================
// 5. BA Da lieu (MS:08/BV1)
// ============================================================
export const DermatologyMRPrint = forwardRef<HTMLDivElement, { data: Record<string, any> }>(
  ({ data: d }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS:08/BV1" />
      <h2>BENH AN DA LIEU</h2>
      <PatientBlock d={d} />
      <div className="section">
        <div className="section-title">I. BENH SU</div>
        <Field label="Ly do kham" value={d.chiefComplaint} />
        <Field label="Thoi gian khoi phat" value={d.onsetDuration} />
        <Field label="Dien bien" value={d.courseOfIllness} />
        <Field label="Dieu tri truoc do" value={d.previousTreatment} />
      </div>
      <div className="section">
        <div className="section-title">II. MO TA TON THUONG</div>
        <Field label="Vi tri" value={d.lesionLocation} />
        <Field label="Hinh thai" value={d.lesionMorphology} />
        <Field label="Kich thuoc" value={d.lesionSize} />
        <Field label="Mau sac" value={d.lesionColor} />
        <Field label="Dien tich (cm2)" value={d.lesionArea} />
        <Field label="Phan bo" value={d.distribution} />
        <Field label="Ranh gioi" value={d.border} />
        <Field label="Be mat" value={d.surface} />
      </div>
      <div className="section">
        <div className="section-title">III. XN DA</div>
        <Field label="Soi truc tiep (KOH)" value={d.kohExam} />
        <Field label="Soi dermoscopy" value={d.dermoscopy} />
        <Field label="Soi Wood lamp" value={d.woodLamp} />
        <Field label="Sinh thiet da" value={d.skinBiopsy} />
        <Field label="Mo benh hoc" value={d.histopathology} />
        <Field label="XN di ung (patch test)" value={d.patchTest} />
      </div>
      <div className="section">
        <div className="section-title">IV. CHAN DOAN VA DIEU TRI</div>
        <Field label="Chan doan" value={d.diagnosis} />
        <Field label="Thuoc boi" value={d.topicalTreatment} />
        <Field label="Thuoc uong" value={d.systemicTreatment} />
        <Field label="Thu thuat" value={d.procedures} />
      </div>
      <SignatureBlock leftTitle="TRUONG KHOA" rightTitle="BAC SI DIEU TRI" date={new Date()} />
    </div>
  )
);
DermatologyMRPrint.displayName = 'DermatologyMRPrint';

// ============================================================
// 6. BA Huyet hoc - Truyen mau (MS:09/BV1)
// ============================================================
export const HematologyMRPrint = forwardRef<HTMLDivElement, { data: Record<string, any> }>(
  ({ data: d }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS:09/BV1" />
      <h2>BENH AN HUYET HOC - TRUYEN MAU</h2>
      <PatientBlock d={d} />
      <div className="section">
        <div className="section-title">I. BENH SU VA TIEN SU</div>
        <Field label="Ly do vao vien" value={d.admissionReason} />
        <Field label="Benh su" value={d.historyOfPresentIllness} />
        <Field label="Tien su xuat huyet" value={d.bleedingHistory} />
        <Field label="Tien su truyen mau" value={d.transfusionHistory} />
      </div>
      <div className="section">
        <div className="section-title">II. KHAM LAM SANG</div>
        <Field label="Thieu mau" value={d.anemiaExam} />
        <Field label="Xuat huyet" value={d.bleedingExam} />
        <Field label="Gan - Lach" value={d.hepatosplenomegaly} />
        <Field label="Hach" value={d.lymphadenopathy} />
      </div>
      <div className="section">
        <div className="section-title">III. CONG THUC MAU (CTM)</div>
        <div className="row">
          <div className="col"><Field label="RBC" value={d.rbc} /></div>
          <div className="col"><Field label="Hb" value={d.hemoglobin} /></div>
          <div className="col"><Field label="Hct" value={d.hematocrit} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="WBC" value={d.wbc} /></div>
          <div className="col"><Field label="PLT" value={d.platelet} /></div>
          <div className="col"><Field label="MCV" value={d.mcv} /></div>
        </div>
      </div>
      <div className="section">
        <div className="section-title">IV. TUY DO</div>
        <Field label="Ket qua tuy do" value={d.boneMarrowResult} />
        <Field label="Te bao hoc" value={d.cytology} />
      </div>
      <div className="section">
        <div className="section-title">V. DONG MAU</div>
        <Field label="PT/INR" value={d.ptInr} />
        <Field label="aPTT" value={d.aptt} />
        <Field label="Fibrinogen" value={d.fibrinogen} />
        <Field label="D-dimer" value={d.dDimer} />
      </div>
      <div className="section">
        <div className="section-title">VI. NHOM MAU VA TRUYEN MAU</div>
        <Field label="Nhom mau ABO" value={d.aboGroup} />
        <Field label="Rh" value={d.rhFactor} />
        <Field label="Phan ung cheo" value={d.crossMatch} />
        <Field label="So don vi truyen" value={d.unitsTransfused} />
        <Field label="Phan ung truyen mau" value={d.transfusionReaction} />
      </div>
      <div className="section">
        <div className="section-title">VII. CHAN DOAN VA DIEU TRI</div>
        <Field label="Chan doan" value={d.diagnosis} />
        <Field label="Hoa tri" value={d.chemotherapy} />
        <Field label="Phac do" value={d.protocol} />
        <Field label="Dieu tri ho tro" value={d.supportiveCare} />
      </div>
      <SignatureBlock leftTitle="TRUONG KHOA" rightTitle="BAC SI DIEU TRI" date={new Date()} />
    </div>
  )
);
HematologyMRPrint.displayName = 'HematologyMRPrint';

// ============================================================
// 7. BA Ngoai khoa (MS:10/BV1)
// ============================================================
export const SurgicalMRPrint = forwardRef<HTMLDivElement, { data: Record<string, any> }>(
  ({ data: d }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS:10/BV1" />
      <h2>BENH AN NGOAI KHOA</h2>
      <PatientBlock d={d} />
      <div className="section">
        <div className="section-title">I. BENH SU</div>
        <Field label="Ly do vao vien" value={d.admissionReason} />
        <Field label="Qua trinh benh ly" value={d.historyOfPresentIllness} />
        <Field label="Tien su" value={d.pastHistory} />
      </div>
      <div className="section">
        <div className="section-title">II. KHAM LAM SANG</div>
        <div className="row">
          <div className="col"><Field label="Mach" value={d.pulse} /></div>
          <div className="col"><Field label="HA" value={d.bloodPressure} /></div>
          <div className="col"><Field label="Nhiet do" value={d.temperature} /></div>
        </div>
        <Field label="Toan than" value={d.generalExam} />
        <Field label="Kham tai cho" value={d.localExam} />
        <Field label="Cac co quan khac" value={d.otherOrgans} />
      </div>
      <div className="section">
        <div className="section-title">III. TIEN ME</div>
        <Field label="Phan loai ASA" value={d.asaClass} />
        <Field label="Phuong phap vo cam" value={d.anesthesiaMethod} />
        <Field label="Danh gia truoc me" value={d.preAnesthesiaEval} />
      </div>
      <div className="section">
        <div className="section-title">IV. PHAU THUAT</div>
        <Field label="Phuong phap phau thuat" value={d.surgeryMethod} />
        <Field label="Ngay phau thuat" value={d.surgeryDate} />
        <Field label="Ekip phau thuat" value={d.surgeryTeam} />
        <Field label="Dien bien trong mo" value={d.intraOperativeFindings} />
        <Field label="Thoi gian phau thuat" value={d.surgeryDuration} />
      </div>
      <div className="section">
        <div className="section-title">V. HAU PHAU</div>
        <Field label="Dien bien sau mo" value={d.postOperativeCourse} />
        <Field label="Bien chung" value={d.complications} />
        <Field label="Dieu tri sau mo" value={d.postOpTreatment} />
        <Field label="Cat chi ngay" value={d.sutureRemovalDate} />
      </div>
      <div className="section">
        <div className="section-title">VI. CHAN DOAN</div>
        <Field label="Chan doan truoc mo" value={d.preOpDiagnosis} />
        <Field label="Chan doan sau mo" value={d.postOpDiagnosis} />
      </div>
      <SignatureBlock leftTitle="TRUONG KHOA" rightTitle="PHAU THUAT VIEN" date={new Date()} />
    </div>
  )
);
SurgicalMRPrint.displayName = 'SurgicalMRPrint';

// ============================================================
// 8. BA Bong (MS:11/BV1)
// ============================================================
export const BurnsMRPrint = forwardRef<HTMLDivElement, { data: Record<string, any> }>(
  ({ data: d }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS:11/BV1" />
      <h2>BENH AN BONG</h2>
      <PatientBlock d={d} />
      <div className="section">
        <div className="section-title">I. HOAN CANH BI BONG</div>
        <Field label="Nguyen nhan" value={d.burnCause} />
        <Field label="Tac nhan" value={d.burnAgent} />
        <Field label="Thoi gian bi bong" value={d.burnTime} />
        <Field label="Xu tri ban dau" value={d.initialFirstAid} />
      </div>
      <div className="section">
        <div className="section-title">II. DIEN TICH BONG (%TBSA)</div>
        <div className="row">
          <div className="col"><Field label="Dau - Co" value={d.burnHeadNeck} /></div>
          <div className="col"><Field label="Than truoc" value={d.burnAnteriorTrunk} /></div>
          <div className="col"><Field label="Than sau" value={d.burnPosteriorTrunk} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Tay phai" value={d.burnRightArm} /></div>
          <div className="col"><Field label="Tay trai" value={d.burnLeftArm} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Chan phai" value={d.burnRightLeg} /></div>
          <div className="col"><Field label="Chan trai" value={d.burnLeftLeg} /></div>
          <div className="col"><Field label="Tang sinh mon" value={d.burnPerineum} /></div>
        </div>
        <Field label="Tong dien tich bong (%)" value={d.totalBurnArea} />
      </div>
      <div className="section">
        <div className="section-title">III. DO SAU</div>
        <Field label="Do I" value={d.burnDegree1} />
        <Field label="Do II nong" value={d.burnDegree2Superficial} />
        <Field label="Do II sau" value={d.burnDegree2Deep} />
        <Field label="Do III" value={d.burnDegree3} />
      </div>
      <div className="section">
        <div className="section-title">IV. XU TRI</div>
        <Field label="Bu dich (Parkland)" value={d.fluidResuscitation} />
        <Field label="Giam dau" value={d.painManagement} />
        <Field label="Khang sinh" value={d.antibiotics} />
        <Field label="Cham soc vet bong" value={d.woundCare} />
        <Field label="Phau thuat/Ghep da" value={d.surgeryGrafting} />
        <Field label="Dinh duong" value={d.nutrition} />
      </div>
      <div className="section">
        <div className="section-title">V. CHAN DOAN</div>
        <Field label="Chan doan" value={d.diagnosis} />
        <Field label="Tien luong" value={d.prognosis} />
      </div>
      <SignatureBlock leftTitle="TRUONG KHOA" rightTitle="BAC SI DIEU TRI" date={new Date()} />
    </div>
  )
);
BurnsMRPrint.displayName = 'BurnsMRPrint';

// ============================================================
// 9. BA Ung buou (MS:12/BV1)
// ============================================================
export const OncologyMRPrint = forwardRef<HTMLDivElement, { data: Record<string, any> }>(
  ({ data: d }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS:12/BV1" />
      <h2>BENH AN UNG BUOU</h2>
      <PatientBlock d={d} />
      <div className="section">
        <div className="section-title">I. BENH SU</div>
        <Field label="Ly do kham" value={d.chiefComplaint} />
        <Field label="Qua trinh phat hien" value={d.discoveryProcess} />
        <Field label="Trieu chung" value={d.symptoms} />
      </div>
      <div className="section">
        <div className="section-title">II. GIAI DOAN TNM</div>
        <div className="row">
          <div className="col"><Field label="T (Tumor)" value={d.tumorStage} /></div>
          <div className="col"><Field label="N (Node)" value={d.nodeStage} /></div>
          <div className="col"><Field label="M (Metastasis)" value={d.metastasisStage} /></div>
        </div>
        <Field label="Giai doan lam sang" value={d.clinicalStage} />
      </div>
      <div className="section">
        <div className="section-title">III. MO BENH HOC</div>
        <Field label="Ket qua sinh thiet" value={d.biopsyResult} />
        <Field label="Loai mo hoc" value={d.histologicalType} />
        <Field label="Do biet hoa" value={d.grading} />
        <Field label="Hoa mo mien dich" value={d.immunohistochemistry} />
        <Field label="Dot bien gen" value={d.molecularMarkers} />
      </div>
      <div className="section">
        <div className="section-title">IV. PHAC DO HOA TRI</div>
        <Field label="Phac do" value={d.chemotherapyRegimen} />
        <Field label="So chu ky" value={d.numberOfCycles} />
        <Field label="Lieu luong" value={d.dosage} />
        <Field label="Tac dung phu" value={d.sideEffects} />
      </div>
      <div className="section">
        <div className="section-title">V. XA TRI</div>
        <Field label="Vung chieu" value={d.radiationField} />
        <Field label="Lieu xa" value={d.radiationDose} />
        <Field label="So buoi" value={d.numberOfFractions} />
        <Field label="Phan ung" value={d.radiationReaction} />
      </div>
      <div className="section">
        <div className="section-title">VI. DAP UNG DIEU TRI</div>
        <Field label="Danh gia dap ung" value={d.treatmentResponse} />
        <Field label="Chan doan" value={d.diagnosis} />
        <Field label="Tien luong" value={d.prognosis} />
      </div>
      <SignatureBlock leftTitle="TRUONG KHOA" rightTitle="BAC SI DIEU TRI" date={new Date()} />
    </div>
  )
);
OncologyMRPrint.displayName = 'OncologyMRPrint';

// ============================================================
// 10. BA Rang Ham Mat (MS:13/BV1)
// ============================================================
export const DentalMRPrint = forwardRef<HTMLDivElement, { data: Record<string, any> }>(
  ({ data: d }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS:13/BV1" />
      <h2>BENH AN RANG HAM MAT</h2>
      <PatientBlock d={d} />
      <div className="section">
        <div className="section-title">I. BENH SU</div>
        <Field label="Ly do kham" value={d.chiefComplaint} />
        <Field label="Qua trinh benh" value={d.historyOfPresentIllness} />
        <Field label="Tien su rang mieng" value={d.dentalHistory} />
      </div>
      <div className="section">
        <div className="section-title">II. SO DO RANG</div>
        <div style={{ textAlign: 'center', margin: '8px 0' }}>
          <div style={{ fontWeight: 'bold', fontSize: 12 }}>Ham tren</div>
          <table style={{ margin: '0 auto', width: '80%' }}>
            <tbody>
              <tr>
                {[18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28].map(t => (
                  <td key={t} style={{ width: 24, textAlign: 'center', fontSize: 10 }}>{t}</td>
                ))}
              </tr>
              <tr>
                {[18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28].map(t => (
                  <td key={t} style={{ height: 24, textAlign: 'center', fontSize: 10 }}>{d[`tooth${t}`] ?? ''}</td>
                ))}
              </tr>
            </tbody>
          </table>
          <div style={{ fontWeight: 'bold', fontSize: 12, marginTop: 4 }}>Ham duoi</div>
          <table style={{ margin: '0 auto', width: '80%' }}>
            <tbody>
              <tr>
                {[48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38].map(t => (
                  <td key={t} style={{ height: 24, textAlign: 'center', fontSize: 10 }}>{d[`tooth${t}`] ?? ''}</td>
                ))}
              </tr>
              <tr>
                {[48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38].map(t => (
                  <td key={t} style={{ width: 24, textAlign: 'center', fontSize: 10 }}>{t}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="section">
        <div className="section-title">III. TINH TRANG NUOU - QUANH RANG</div>
        <Field label="Nuou rang" value={d.gingivaCondition} />
        <Field label="Tui quanh rang" value={d.periodontalPocket} />
        <Field label="Do lung lay" value={d.toothMobility} />
      </div>
      <div className="section">
        <div className="section-title">IV. PHIM X-QUANG</div>
        <Field label="Panorex" value={d.panorexResult} />
        <Field label="Phim can canh" value={d.periapicalResult} />
        <Field label="Cone beam CT" value={d.cbctResult} />
      </div>
      <div className="section">
        <div className="section-title">V. CHAN DOAN VA KE HOACH DIEU TRI</div>
        <Field label="Chan doan" value={d.diagnosis} />
        <Field label="Ke hoach dieu tri" value={d.treatmentPlan} />
      </div>
      <SignatureBlock leftTitle="TRUONG KHOA" rightTitle="BAC SI DIEU TRI" date={new Date()} />
    </div>
  )
);
DentalMRPrint.displayName = 'DentalMRPrint';

// ============================================================
// 11. BA Tai Mui Hong (MS:14/BV1)
// ============================================================
export const ENTMRPrint = forwardRef<HTMLDivElement, { data: Record<string, any> }>(
  ({ data: d }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS:14/BV1" />
      <h2>BENH AN TAI MUI HONG</h2>
      <PatientBlock d={d} />
      <div className="section">
        <div className="section-title">I. BENH SU</div>
        <Field label="Ly do kham" value={d.chiefComplaint} />
        <Field label="Qua trinh benh" value={d.historyOfPresentIllness} />
        <Field label="Tien su" value={d.pastHistory} />
      </div>
      <div className="section">
        <div className="section-title">II. KHAM TAI</div>
        <Field label="Tai phai" value={d.rightEarExam} />
        <Field label="Tai trai" value={d.leftEarExam} />
        <Field label="Thinh luc do" value={d.audiogramResult} />
        <Field label="Nhip do" value={d.tympanogramResult} />
      </div>
      <div className="section">
        <div className="section-title">III. KHAM MUI - XOANG</div>
        <Field label="Noi soi mui" value={d.nasalEndoscopy} />
        <Field label="CT Scan xoang" value={d.sinusCT} />
        <Field label="Tinh trang mang mui" value={d.nasalMucosa} />
      </div>
      <div className="section">
        <div className="section-title">IV. KHAM HONG - THANH QUAN</div>
        <Field label="Hong" value={d.pharynxExam} />
        <Field label="Amidan" value={d.tonsilExam} />
        <Field label="Noi soi thanh quan" value={d.laryngoscopy} />
      </div>
      <div className="section">
        <div className="section-title">V. CHAN DOAN VA DIEU TRI</div>
        <Field label="Chan doan" value={d.diagnosis} />
        <Field label="Dieu tri noi khoa" value={d.medicalTreatment} />
        <Field label="Phau thuat" value={d.surgicalTreatment} />
      </div>
      <SignatureBlock leftTitle="TRUONG KHOA" rightTitle="BAC SI DIEU TRI" date={new Date()} />
    </div>
  )
);
ENTMRPrint.displayName = 'ENTMRPrint';

// ============================================================
// 12. BA Ngoai tru chung (MS:15/BV1)
// ============================================================
export const OutpatientGeneralMRPrint = forwardRef<HTMLDivElement, { data: Record<string, any> }>(
  ({ data: d }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS:15/BV1" />
      <h2>BENH AN NGOAI TRU</h2>
      <PatientBlock d={d} />
      <div className="section">
        <div className="section-title">I. LY DO KHAM</div>
        <Field label="Ly do" value={d.chiefComplaint} />
      </div>
      <div className="section">
        <div className="section-title">II. KHAM LAM SANG</div>
        <div className="row">
          <div className="col"><Field label="Mach" value={d.pulse} /></div>
          <div className="col"><Field label="HA" value={d.bloodPressure} /></div>
          <div className="col"><Field label="Nhiet do" value={d.temperature} /></div>
          <div className="col"><Field label="Can nang" value={d.weight} /></div>
        </div>
        <Field label="Toan than" value={d.generalExam} />
        <Field label="Cac co quan" value={d.organExam} />
      </div>
      <div className="section">
        <div className="section-title">III. CAN LAM SANG</div>
        <Field label="Xet nghiem" value={d.labTests} />
        <Field label="Chan doan hinh anh" value={d.imaging} />
      </div>
      <div className="section">
        <div className="section-title">IV. CHAN DOAN</div>
        <Field label="Chan doan" value={d.diagnosis} />
        <Field label="Ma ICD" value={d.icdCode} />
      </div>
      <div className="section">
        <div className="section-title">V. KE DON</div>
        <Field label="Don thuoc" value={d.prescription} />
        <Field label="Loi dan" value={d.instructions} />
        <Field label="Hen tai kham" value={d.followUpDate} />
      </div>
      <SignatureBlock leftTitle="TRUONG KHOA" rightTitle="BAC SI KHAM" date={new Date()} />
    </div>
  )
);
OutpatientGeneralMRPrint.displayName = 'OutpatientGeneralMRPrint';

// ============================================================
// 13. BA Ngoai tru RHM (MS:16/BV1)
// ============================================================
export const OutpatientDentalMRPrint = forwardRef<HTMLDivElement, { data: Record<string, any> }>(
  ({ data: d }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS:16/BV1" />
      <h2>BENH AN NGOAI TRU RANG HAM MAT</h2>
      <PatientBlock d={d} />
      <div className="section">
        <div className="section-title">I. LY DO KHAM</div>
        <Field label="Ly do" value={d.chiefComplaint} />
        <Field label="Tien su rang mieng" value={d.dentalHistory} />
      </div>
      <div className="section">
        <div className="section-title">II. KHAM RANG MIENG</div>
        <Field label="Rang" value={d.toothExam} />
        <Field label="Nuou" value={d.gingivaExam} />
        <Field label="Niem mac mieng" value={d.oralMucosa} />
        <Field label="Khop can" value={d.occlusion} />
      </div>
      <div className="section">
        <div className="section-title">III. PHIM X-QUANG</div>
        <Field label="Ket qua" value={d.xrayResult} />
      </div>
      <div className="section">
        <div className="section-title">IV. CHAN DOAN VA DIEU TRI</div>
        <Field label="Chan doan" value={d.diagnosis} />
        <Field label="Xu tri" value={d.treatment} />
        <Field label="Don thuoc" value={d.prescription} />
        <Field label="Hen tai kham" value={d.followUpDate} />
      </div>
      <SignatureBlock leftTitle="TRUONG KHOA" rightTitle="BAC SI KHAM" date={new Date()} />
    </div>
  )
);
OutpatientDentalMRPrint.displayName = 'OutpatientDentalMRPrint';

// ============================================================
// 14. BA tuyen xa/phuong (MS:17/BV1)
// ============================================================
export const CommuneHealthMRPrint = forwardRef<HTMLDivElement, { data: Record<string, any> }>(
  ({ data: d }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS:17/BV1" />
      <h2>BENH AN TUYEN XA / PHUONG</h2>
      <PatientBlock d={d} />
      <div className="section">
        <div className="section-title">I. LY DO DEN KHAM</div>
        <Field label="Ly do" value={d.chiefComplaint} />
      </div>
      <div className="section">
        <div className="section-title">II. TIEN SU</div>
        <Field label="Benh da mac" value={d.pastIllness} />
        <Field label="Dang dieu tri" value={d.currentTreatment} />
        <Field label="Di ung" value={d.allergies} />
      </div>
      <div className="section">
        <div className="section-title">III. KHAM BENH</div>
        <div className="row">
          <div className="col"><Field label="Mach" value={d.pulse} /></div>
          <div className="col"><Field label="HA" value={d.bloodPressure} /></div>
          <div className="col"><Field label="Nhiet do" value={d.temperature} /></div>
        </div>
        <Field label="Kham lam sang" value={d.clinicalExam} />
      </div>
      <div className="section">
        <div className="section-title">IV. CHAN DOAN VA XU TRI</div>
        <Field label="Chan doan" value={d.diagnosis} />
        <Field label="Xu tri tai cho" value={d.localTreatment} />
        <Field label="Don thuoc" value={d.prescription} />
        <Field label="Chuyen tuyen" value={d.referral} />
        <Field label="Hen tai kham" value={d.followUpDate} />
      </div>
      <SignatureBlock leftTitle="TRUONG TRAM Y TE" rightTitle="NGUOI KHAM" date={new Date()} />
    </div>
  )
);
CommuneHealthMRPrint.displayName = 'CommuneHealthMRPrint';

// ============================================================
// 15. BA Noi tru YHCT (MS:18/BV1)
// ============================================================
export const TraditionalMedInpatientMRPrint = forwardRef<HTMLDivElement, { data: Record<string, any> }>(
  ({ data: d }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS:18/BV1" />
      <h2>BENH AN NOI TRU Y HOC CO TRUYEN</h2>
      <PatientBlock d={d} />
      <div className="section">
        <div className="section-title">I. TU CHAN</div>
        <h3>1. Vong chan (Nhin)</h3>
        <Field label="Than hinh" value={d.bodyAppearance} />
        <Field label="Sac mat" value={d.faceColor} />
        <Field label="Luoi (chat, rêu)" value={d.tongueExam} />
        <Field label="Mat - Than sac" value={d.spiritAppearance} />
        <h3>2. Van chan (Nghe - Ngui)</h3>
        <Field label="Giong noi" value={d.voiceExam} />
        <Field label="Hoi tho" value={d.breathExam} />
        <Field label="Mui" value={d.smellExam} />
        <h3>3. Van chan (Hoi)</h3>
        <Field label="Trieu chung chinh" value={d.mainComplaint} />
        <Field label="Han nhiet" value={d.hotColdPattern} />
        <Field label="Mo hoi" value={d.sweating} />
        <Field label="An uong" value={d.appetite} />
        <Field label="Dai - Tieu tien" value={d.urineStool} />
        <Field label="Giac ngu" value={d.sleep} />
        <Field label="Kinh nguyet (nu)" value={d.menstruation} />
        <h3>4. Thiet chan (So)</h3>
        <Field label="Mach (Thon/Hao/Hoat/Sac...)" value={d.pulseExam} />
        <Field label="Phu mach" value={d.abdomenPalpation} />
        <Field label="An chan" value={d.pressurePointExam} />
      </div>
      <div className="section">
        <div className="section-title">II. BIEN CHUNG LUAN TRI</div>
        <Field label="Bat cuong" value={d.eightPrinciples} />
        <Field label="Tang phu" value={d.organPattern} />
        <Field label="Benh danh YHCT" value={d.tcmDiagnosis} />
        <Field label="Benh danh YHHD (ICD)" value={d.westernDiagnosis} />
        <Field label="Phap dieu tri" value={d.treatmentPrinciple} />
      </div>
      <div className="section">
        <div className="section-title">III. DIEU TRI</div>
        <Field label="Bai thuoc thang" value={d.herbalPrescription} />
        <Field label="Thuoc che pham" value={d.preparedMedicine} />
        <Field label="Cham cuu" value={d.acupuncture} />
        <Field label="Xoa bop - Bat huyet" value={d.massage} />
        <Field label="Phuong phap khac" value={d.otherMethods} />
      </div>
      <SignatureBlock leftTitle="TRUONG KHOA" rightTitle="BAC SI DIEU TRI" date={new Date()} />
    </div>
  )
);
TraditionalMedInpatientMRPrint.displayName = 'TraditionalMedInpatientMRPrint';

// ============================================================
// 16. BA Ngoai tru YHCT (MS:19/BV1)
// ============================================================
export const TraditionalMedOutpatientMRPrint = forwardRef<HTMLDivElement, { data: Record<string, any> }>(
  ({ data: d }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS:19/BV1" />
      <h2>BENH AN NGOAI TRU Y HOC CO TRUYEN</h2>
      <PatientBlock d={d} />
      <div className="section">
        <div className="section-title">I. TU CHAN</div>
        <Field label="Vong chan" value={d.inspection} />
        <Field label="Van chan" value={d.auscultation} />
        <Field label="Van chan (hoi)" value={d.inquiry} />
        <Field label="Thiet chan (mach)" value={d.palpation} />
        <Field label="Luoi" value={d.tongueExam} />
      </div>
      <div className="section">
        <div className="section-title">II. BIEN CHUNG LUAN TRI</div>
        <Field label="Benh danh YHCT" value={d.tcmDiagnosis} />
        <Field label="Benh danh YHHD" value={d.westernDiagnosis} />
        <Field label="Phap dieu tri" value={d.treatmentPrinciple} />
      </div>
      <div className="section">
        <div className="section-title">III. DON THUOC</div>
        <Field label="Thuoc thang" value={d.herbalPrescription} />
        <Field label="Thuoc che pham" value={d.preparedMedicine} />
        <Field label="Cham cuu" value={d.acupuncture} />
        <Field label="Loi dan" value={d.instructions} />
        <Field label="Hen tai kham" value={d.followUpDate} />
      </div>
      <SignatureBlock leftTitle="TRUONG KHOA" rightTitle="BAC SI KHAM" date={new Date()} />
    </div>
  )
);
TraditionalMedOutpatientMRPrint.displayName = 'TraditionalMedOutpatientMRPrint';

// ============================================================
// 17. BA Noi tru Nhi YHCT (MS:20/BV1)
// ============================================================
export const PediatricTCMMRPrint = forwardRef<HTMLDivElement, { data: Record<string, any> }>(
  ({ data: d }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS:20/BV1" />
      <h2>BENH AN NOI TRU NHI Y HOC CO TRUYEN</h2>
      <PatientBlock d={d} />
      <div className="section">
        <div className="section-title">I. THONG TIN TRE</div>
        <div className="row">
          <div className="col"><Field label="Ngay sinh" value={d.dateOfBirth} /></div>
          <div className="col"><Field label="Can nang (kg)" value={d.weight} /></div>
          <div className="col"><Field label="Chieu cao (cm)" value={d.height} /></div>
        </div>
        <Field label="Tien su sinh" value={d.birthHistory} />
        <Field label="Tien su benh" value={d.pastIllness} />
        <Field label="Tiem chung" value={d.vaccinationHistory} />
      </div>
      <div className="section">
        <div className="section-title">II. TU CHAN</div>
        <Field label="Vong chan (than sac, hinh thai)" value={d.inspection} />
        <Field label="Van chan (tieng khoc, hoi tho)" value={d.auscultation} />
        <Field label="Van chan (hoi me)" value={d.inquiry} />
        <Field label="Thiet chan (chi van tay)" value={d.fingerVeinExam} />
        <Field label="Mach (tre > 3 tuoi)" value={d.pulseExam} />
        <Field label="Luoi" value={d.tongueExam} />
      </div>
      <div className="section">
        <div className="section-title">III. BIEN CHUNG LUAN TRI</div>
        <Field label="Benh danh YHCT" value={d.tcmDiagnosis} />
        <Field label="Benh danh YHHD" value={d.westernDiagnosis} />
        <Field label="Phap dieu tri" value={d.treatmentPrinciple} />
      </div>
      <div className="section">
        <div className="section-title">IV. DIEU TRI</div>
        <Field label="Bai thuoc (lieu nhi)" value={d.herbalPrescription} />
        <Field label="Thuoc che pham" value={d.preparedMedicine} />
        <Field label="Cham cuu (day nhi)" value={d.pediatricTuina} />
        <Field label="Che do an" value={d.dietAdvice} />
      </div>
      <SignatureBlock leftTitle="TRUONG KHOA" rightTitle="BAC SI DIEU TRI" date={new Date()} />
    </div>
  )
);
PediatricTCMMRPrint.displayName = 'PediatricTCMMRPrint';

// ============================================================
// 18. BA Mat - Chan thuong (MS:21/BV1)
// ============================================================
export const EyeTraumaMRPrint = forwardRef<HTMLDivElement, { data: Record<string, any> }>(
  ({ data: d }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS:21/BV1" />
      <h2>BENH AN MAT - CHAN THUONG</h2>
      <PatientBlock d={d} />
      <div className="section">
        <div className="section-title">I. HOAN CANH CHAN THUONG</div>
        <Field label="Nguyen nhan" value={d.traumaCause} />
        <Field label="Co che" value={d.traumaMechanism} />
        <Field label="Thoi gian" value={d.traumaTime} />
        <Field label="Xu tri ban dau" value={d.initialTreatment} />
      </div>
      <div className="section">
        <div className="section-title">II. KHAM MAT</div>
        <table>
          <thead><tr><th></th><th>Mat phai (MP)</th><th>Mat trai (MT)</th></tr></thead>
          <tbody>
            <tr><td style={{ fontWeight: 'bold' }}>Thi luc</td><td>{d.vaRight ?? '...'}</td><td>{d.vaLeft ?? '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Nhan ap</td><td>{d.iopRight ?? '...'}</td><td>{d.iopLeft ?? '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Mi mat</td><td>{d.eyelidRight ?? '...'}</td><td>{d.eyelidLeft ?? '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Ket mac</td><td>{d.conjunctivaRight ?? '...'}</td><td>{d.conjunctivaLeft ?? '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Giac mac</td><td>{d.corneaRight ?? '...'}</td><td>{d.corneaLeft ?? '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Tien phong</td><td>{d.anteriorChamberRight ?? '...'}</td><td>{d.anteriorChamberLeft ?? '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Thuy tinh the</td><td>{d.lensRight ?? '...'}</td><td>{d.lensLeft ?? '...'}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="section">
        <div className="section-title">III. CHAN DOAN HINH ANH</div>
        <Field label="Sieu am mat" value={d.eyeUltrasound} />
        <Field label="CT/MRI ho mat" value={d.orbitalImaging} />
      </div>
      <div className="section">
        <div className="section-title">IV. CHAN DOAN VA DIEU TRI</div>
        <Field label="Chan doan" value={d.diagnosis} />
        <Field label="Xu tri noi khoa" value={d.medicalTreatment} />
        <Field label="Phau thuat" value={d.surgery} />
      </div>
      <SignatureBlock leftTitle="TRUONG KHOA" rightTitle="BAC SI DIEU TRI" date={new Date()} />
    </div>
  )
);
EyeTraumaMRPrint.displayName = 'EyeTraumaMRPrint';

// ============================================================
// 19. BA Mat - Ban phan truoc (MS:22/BV1)
// ============================================================
export const EyeAnteriorMRPrint = forwardRef<HTMLDivElement, { data: Record<string, any> }>(
  ({ data: d }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS:22/BV1" />
      <h2>BENH AN MAT - BAN PHAN TRUOC</h2>
      <PatientBlock d={d} />
      <div className="section">
        <div className="section-title">I. BENH SU</div>
        <Field label="Ly do kham" value={d.chiefComplaint} />
        <Field label="Dien bien" value={d.courseOfIllness} />
      </div>
      <div className="section">
        <div className="section-title">II. KHAM MAT</div>
        <table>
          <thead><tr><th></th><th>Mat phai</th><th>Mat trai</th></tr></thead>
          <tbody>
            <tr><td style={{ fontWeight: 'bold' }}>Thi luc</td><td>{d.vaRight ?? '...'}</td><td>{d.vaLeft ?? '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Nhan ap</td><td>{d.iopRight ?? '...'}</td><td>{d.iopLeft ?? '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Mi mat</td><td>{d.eyelidRight ?? '...'}</td><td>{d.eyelidLeft ?? '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Le dao</td><td>{d.lacrimalRight ?? '...'}</td><td>{d.lacrimalLeft ?? '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Ket mac</td><td>{d.conjunctivaRight ?? '...'}</td><td>{d.conjunctivaLeft ?? '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Giac mac</td><td>{d.corneaRight ?? '...'}</td><td>{d.corneaLeft ?? '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Tien phong</td><td>{d.anteriorChamberRight ?? '...'}</td><td>{d.anteriorChamberLeft ?? '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Mong mat</td><td>{d.irisRight ?? '...'}</td><td>{d.irisLeft ?? '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Dong tu</td><td>{d.pupilRight ?? '...'}</td><td>{d.pupilLeft ?? '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Thuy tinh the</td><td>{d.lensRight ?? '...'}</td><td>{d.lensLeft ?? '...'}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="section">
        <div className="section-title">III. CAN LAM SANG</div>
        <Field label="Sinh hien vi" value={d.slitLampExam} />
        <Field label="Do giac mac" value={d.topography} />
        <Field label="Sieu am" value={d.ultrasound} />
      </div>
      <div className="section">
        <div className="section-title">IV. CHAN DOAN VA DIEU TRI</div>
        <Field label="Chan doan" value={d.diagnosis} />
        <Field label="Dieu tri" value={d.treatmentPlan} />
      </div>
      <SignatureBlock leftTitle="TRUONG KHOA" rightTitle="BAC SI DIEU TRI" date={new Date()} />
    </div>
  )
);
EyeAnteriorMRPrint.displayName = 'EyeAnteriorMRPrint';

// ============================================================
// 20. BA Mat - Day mat (MS:23/BV1)
// ============================================================
export const EyePosteriorMRPrint = forwardRef<HTMLDivElement, { data: Record<string, any> }>(
  ({ data: d }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS:23/BV1" />
      <h2>BENH AN MAT - DAY MAT</h2>
      <PatientBlock d={d} />
      <div className="section">
        <div className="section-title">I. BENH SU</div>
        <Field label="Ly do kham" value={d.chiefComplaint} />
        <Field label="Dien bien" value={d.courseOfIllness} />
        <Field label="Benh toan than kem theo" value={d.systemicDisease} />
      </div>
      <div className="section">
        <div className="section-title">II. KHAM MAT</div>
        <table>
          <thead><tr><th></th><th>Mat phai</th><th>Mat trai</th></tr></thead>
          <tbody>
            <tr><td style={{ fontWeight: 'bold' }}>Thi luc</td><td>{d.vaRight ?? '...'}</td><td>{d.vaLeft ?? '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Nhan ap</td><td>{d.iopRight ?? '...'}</td><td>{d.iopLeft ?? '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Dich kinh</td><td>{d.vitreousRight ?? '...'}</td><td>{d.vitreousLeft ?? '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Dia thi</td><td>{d.opticDiscRight ?? '...'}</td><td>{d.opticDiscLeft ?? '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Hoang diem</td><td>{d.maculaRight ?? '...'}</td><td>{d.maculaLeft ?? '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Mach mau VM</td><td>{d.retinalVesselsRight ?? '...'}</td><td>{d.retinalVesselsLeft ?? '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Vong mac ngoai vi</td><td>{d.peripheralRetinaRight ?? '...'}</td><td>{d.peripheralRetinaLeft ?? '...'}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="section">
        <div className="section-title">III. CAN LAM SANG</div>
        <Field label="OCT" value={d.octResult} />
        <Field label="Chup huynh quang (FFA)" value={d.ffaResult} />
        <Field label="Sieu am B-scan" value={d.bScanResult} />
        <Field label="Dien vong mac (ERG)" value={d.ergResult} />
      </div>
      <div className="section">
        <div className="section-title">IV. CHAN DOAN VA DIEU TRI</div>
        <Field label="Chan doan" value={d.diagnosis} />
        <Field label="Dieu tri noi khoa" value={d.medicalTreatment} />
        <Field label="Laser/Tiem noi nhan" value={d.laserInjection} />
        <Field label="Phau thuat" value={d.surgery} />
      </div>
      <SignatureBlock leftTitle="TRUONG KHOA" rightTitle="BAC SI DIEU TRI" date={new Date()} />
    </div>
  )
);
EyePosteriorMRPrint.displayName = 'EyePosteriorMRPrint';

// ============================================================
// 21. BA Mat - Glocom (MS:24/BV1)
// ============================================================
export const EyeGlaucomaMRPrint = forwardRef<HTMLDivElement, { data: Record<string, any> }>(
  ({ data: d }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS:24/BV1" />
      <h2>BENH AN MAT - GLOCOM</h2>
      <PatientBlock d={d} />
      <div className="section">
        <div className="section-title">I. BENH SU</div>
        <Field label="Ly do kham" value={d.chiefComplaint} />
        <Field label="Tien su glocom gia dinh" value={d.familyGlaucomaHistory} />
        <Field label="Dieu tri truoc" value={d.previousTreatment} />
      </div>
      <div className="section">
        <div className="section-title">II. KHAM MAT</div>
        <table>
          <thead><tr><th></th><th>Mat phai</th><th>Mat trai</th></tr></thead>
          <tbody>
            <tr><td style={{ fontWeight: 'bold' }}>Thi luc</td><td>{d.vaRight ?? '...'}</td><td>{d.vaLeft ?? '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Nhan ap (mmHg)</td><td>{d.iopRight ?? '...'}</td><td>{d.iopLeft ?? '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Do day giac mac (CCT)</td><td>{d.cctRight ?? '...'}</td><td>{d.cctLeft ?? '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Goc tien phong</td><td>{d.angleRight ?? '...'}</td><td>{d.angleLeft ?? '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Ty C/D</td><td>{d.cdRatioRight ?? '...'}</td><td>{d.cdRatioLeft ?? '...'}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="section">
        <div className="section-title">III. CAN LAM SANG</div>
        <Field label="Thi truong (Humphrey/Goldmann)" value={d.visualFieldResult} />
        <Field label="OCT RNFL" value={d.octRnflResult} />
        <Field label="OCT GCC" value={d.octGccResult} />
        <Field label="Soi goc (gonioscopy)" value={d.gonioscopyResult} />
      </div>
      <div className="section">
        <div className="section-title">IV. PHAN LOAI GLOCOM</div>
        <Field label="Loai" value={d.glaucomaType} />
        <Field label="Giai doan" value={d.glaucomaStage} />
      </div>
      <div className="section">
        <div className="section-title">V. DIEU TRI</div>
        <Field label="Thuoc ha nhan ap" value={d.iopLoweringMeds} />
        <Field label="Laser" value={d.laserTreatment} />
        <Field label="Phau thuat" value={d.surgery} />
        <Field label="Nhan ap muc tieu" value={d.targetIOP} />
      </div>
      <SignatureBlock leftTitle="TRUONG KHOA" rightTitle="BAC SI DIEU TRI" date={new Date()} />
    </div>
  )
);
EyeGlaucomaMRPrint.displayName = 'EyeGlaucomaMRPrint';

// ============================================================
// 22. BA Mat - Lac (MS:25/BV1)
// ============================================================
export const EyeStrabismusMRPrint = forwardRef<HTMLDivElement, { data: Record<string, any> }>(
  ({ data: d }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS:25/BV1" />
      <h2>BENH AN MAT - LAC</h2>
      <PatientBlock d={d} />
      <div className="section">
        <div className="section-title">I. BENH SU</div>
        <Field label="Tuoi phat hien lac" value={d.onsetAge} />
        <Field label="Huong lac" value={d.deviationDirection} />
        <Field label="Lien tuc / gian doan" value={d.constancy} />
        <Field label="Tien su dieu tri" value={d.previousTreatment} />
      </div>
      <div className="section">
        <div className="section-title">II. KHAM MAT</div>
        <table>
          <thead><tr><th></th><th>Mat phai</th><th>Mat trai</th></tr></thead>
          <tbody>
            <tr><td style={{ fontWeight: 'bold' }}>Thi luc</td><td>{d.vaRight ?? '...'}</td><td>{d.vaLeft ?? '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Khuc xa</td><td>{d.refractionRight ?? '...'}</td><td>{d.refractionLeft ?? '...'}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="section">
        <div className="section-title">III. DO DO LAC</div>
        <Field label="Do lac xa (PD)" value={d.deviationDistance} />
        <Field label="Do lac gan (PD)" value={d.deviationNear} />
        <Field label="Phuong phap do" value={d.measurementMethod} />
        <Field label="Van nhan" value={d.ductions} />
        <Field label="Dong van nhan" value={d.versions} />
      </div>
      <div className="section">
        <div className="section-title">IV. CHUC NANG THI GIAC HAI MAT</div>
        <Field label="Dong thi" value={d.simultaneousPerception} />
        <Field label="Hop thi" value={d.fusion} />
        <Field label="Lap the" value={d.stereopsis} />
        <Field label="Nhi thi" value={d.diplopia} />
      </div>
      <div className="section">
        <div className="section-title">V. CHAN DOAN VA DIEU TRI</div>
        <Field label="Chan doan" value={d.diagnosis} />
        <Field label="Kinh" value={d.spectacles} />
        <Field label="Bịt mat" value={d.occlusion} />
        <Field label="Phau thuat" value={d.surgery} />
      </div>
      <SignatureBlock leftTitle="TRUONG KHOA" rightTitle="BAC SI DIEU TRI" date={new Date()} />
    </div>
  )
);
EyeStrabismusMRPrint.displayName = 'EyeStrabismusMRPrint';

// ============================================================
// 23. BA Mat tre em (MS:26/BV1)
// ============================================================
export const PediatricEyeMRPrint = forwardRef<HTMLDivElement, { data: Record<string, any> }>(
  ({ data: d }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS:26/BV1" />
      <h2>BENH AN MAT TRE EM</h2>
      <PatientBlock d={d} />
      <div className="section">
        <div className="section-title">I. THONG TIN TRE</div>
        <div className="row">
          <div className="col"><Field label="Ngay sinh" value={d.dateOfBirth} /></div>
          <div className="col"><Field label="Tuan thai khi sinh" value={d.gestationalAge} /></div>
          <div className="col"><Field label="Can nang sinh" value={d.birthWeight} /></div>
        </div>
        <Field label="Tien su san khoa" value={d.birthHistory} />
        <Field label="Tien su benh mat gia dinh" value={d.familyEyeHistory} />
      </div>
      <div className="section">
        <div className="section-title">II. KHAM MAT</div>
        <table>
          <thead><tr><th></th><th>Mat phai</th><th>Mat trai</th></tr></thead>
          <tbody>
            <tr><td style={{ fontWeight: 'bold' }}>Thi luc</td><td>{d.vaRight ?? '...'}</td><td>{d.vaLeft ?? '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Khuc xa</td><td>{d.refractionRight ?? '...'}</td><td>{d.refractionLeft ?? '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Ban phan truoc</td><td>{d.anteriorRight ?? '...'}</td><td>{d.anteriorLeft ?? '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Day mat</td><td>{d.fundusRight ?? '...'}</td><td>{d.fundusLeft ?? '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Van nhan</td><td>{d.motilityRight ?? '...'}</td><td>{d.motilityLeft ?? '...'}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="section">
        <div className="section-title">III. KHAM CHUYEN BIET</div>
        <Field label="Do lac (neu co)" value={d.strabismus} />
        <Field label="Nhi thi / Lap the" value={d.binocularVision} />
        <Field label="Test phu mat" value={d.coverTest} />
        <Field label="Kham ROP (neu sinh non)" value={d.ropExam} />
      </div>
      <div className="section">
        <div className="section-title">IV. CHAN DOAN VA DIEU TRI</div>
        <Field label="Chan doan" value={d.diagnosis} />
        <Field label="Dieu tri" value={d.treatmentPlan} />
        <Field label="Hen tai kham" value={d.followUpDate} />
      </div>
      <SignatureBlock leftTitle="TRUONG KHOA" rightTitle="BAC SI DIEU TRI" date={new Date()} />
    </div>
  )
);
PediatricEyeMRPrint.displayName = 'PediatricEyeMRPrint';

// ============================================================
// 24. BA PHCN (MS:27/BV1)
// ============================================================
export const RehabilitationMRPrint = forwardRef<HTMLDivElement, { data: Record<string, any> }>(
  ({ data: d }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS:27/BV1" />
      <h2>BENH AN PHUC HOI CHUC NANG</h2>
      <PatientBlock d={d} />
      <div className="section">
        <div className="section-title">I. BENH SU</div>
        <Field label="Ly do vao vien" value={d.admissionReason} />
        <Field label="Chan doan benh chinh" value={d.primaryDiagnosis} />
        <Field label="Thoi gian mac benh" value={d.diseaseDuration} />
      </div>
      <div className="section">
        <div className="section-title">II. LUONG GIA CHUC NANG</div>
        <Field label="Van dong" value={d.motorFunction} />
        <Field label="Tam van dong" value={d.rangeOfMotion} />
        <Field label="Co luc (MRC)" value={d.muscleStrength} />
        <Field label="Truong luc co" value={d.muscleTone} />
        <Field label="Thang bang" value={d.balance} />
        <Field label="Di chuyen" value={d.mobility} />
        <Field label="Sinh hoat hang ngay (Barthel)" value={d.barthelIndex} />
        <Field label="Giao tiep" value={d.communication} />
        <Field label="Nuot" value={d.swallowing} />
        <Field label="Nhan thuc" value={d.cognition} />
      </div>
      <div className="section">
        <div className="section-title">III. MUC TIEU PHCN</div>
        <Field label="Ngan han" value={d.shortTermGoal} />
        <Field label="Dai han" value={d.longTermGoal} />
      </div>
      <div className="section">
        <div className="section-title">IV. CHUONG TRINH PHCN</div>
        <Field label="Vat ly tri lieu" value={d.physicalTherapy} />
        <Field label="Hoat dong tri lieu" value={d.occupationalTherapy} />
        <Field label="Ngon ngu tri lieu" value={d.speechTherapy} />
        <Field label="Dung cu tro giup" value={d.assistiveDevices} />
        <Field label="Dieu tri khac" value={d.otherTreatments} />
      </div>
      <div className="section">
        <div className="section-title">V. DANH GIA TIEN TRIEN</div>
        <Field label="Ket qua" value={d.outcome} />
        <Field label="Barthel khi ra vien" value={d.dischargeBarthel} />
      </div>
      <SignatureBlock leftTitle="TRUONG KHOA" rightTitle="BAC SI PHCN" date={new Date()} />
    </div>
  )
);
RehabilitationMRPrint.displayName = 'RehabilitationMRPrint';

// ============================================================
// 25. BA PHCN Nhi (MS:28/BV1)
// ============================================================
export const PediatricRehabMRPrint = forwardRef<HTMLDivElement, { data: Record<string, any> }>(
  ({ data: d }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS:28/BV1" />
      <h2>BENH AN PHUC HOI CHUC NANG NHI</h2>
      <PatientBlock d={d} />
      <div className="section">
        <div className="section-title">I. THONG TIN TRE</div>
        <div className="row">
          <div className="col"><Field label="Ngay sinh" value={d.dateOfBirth} /></div>
          <div className="col"><Field label="Can nang" value={d.weight} /></div>
          <div className="col"><Field label="Chieu cao" value={d.height} /></div>
        </div>
        <Field label="Tien su thai san" value={d.perinatalHistory} />
        <Field label="Cac moc phat trien" value={d.developmentalMilestones} />
      </div>
      <div className="section">
        <div className="section-title">II. CHAN DOAN</div>
        <Field label="Chan doan chinh" value={d.primaryDiagnosis} />
        <Field label="Di tat bam sinh" value={d.congenitalAbnormalities} />
        <Field label="Benh kem theo" value={d.comorbidities} />
      </div>
      <div className="section">
        <div className="section-title">III. LUONG GIA CHUC NANG TRE</div>
        <Field label="Van dong tho" value={d.grossMotor} />
        <Field label="Van dong tinh" value={d.fineMotor} />
        <Field label="Ngon ngu" value={d.language} />
        <Field label="Nhan thuc" value={d.cognition} />
        <Field label="Xa hoi - Cam xuc" value={d.socialEmotional} />
        <Field label="Tu phuc vu" value={d.selfCare} />
        <Field label="GMFCS (bai nao)" value={d.gmfcsLevel} />
      </div>
      <div className="section">
        <div className="section-title">IV. CHUONG TRINH PHCN</div>
        <Field label="Vat ly tri lieu" value={d.physicalTherapy} />
        <Field label="Hoat dong tri lieu" value={d.occupationalTherapy} />
        <Field label="Ngon ngu tri lieu" value={d.speechTherapy} />
        <Field label="Can thiep som" value={d.earlyIntervention} />
        <Field label="Dung cu chinh hinh" value={d.orthotics} />
        <Field label="Huong dan gia dinh" value={d.familyTraining} />
      </div>
      <div className="section">
        <div className="section-title">V. MUC TIEU VA TIEN TRIEN</div>
        <Field label="Muc tieu" value={d.goals} />
        <Field label="Danh gia tien trien" value={d.progressEvaluation} />
      </div>
      <SignatureBlock leftTitle="TRUONG KHOA" rightTitle="BAC SI PHCN" date={new Date()} />
    </div>
  )
);
PediatricRehabMRPrint.displayName = 'PediatricRehabMRPrint';

// ============================================================
// 26. BA Ngoai tru PHCN (MS:29/BV1)
// ============================================================
export const OutpatientRehabMRPrint = forwardRef<HTMLDivElement, { data: Record<string, any> }>(
  ({ data: d }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS:29/BV1" />
      <h2>BENH AN NGOAI TRU PHUC HOI CHUC NANG</h2>
      <PatientBlock d={d} />
      <div className="section">
        <div className="section-title">I. CHAN DOAN</div>
        <Field label="Chan doan chinh" value={d.primaryDiagnosis} />
        <Field label="Benh kem theo" value={d.comorbidities} />
      </div>
      <div className="section">
        <div className="section-title">II. LUONG GIA CHUC NANG</div>
        <Field label="Van dong" value={d.motorFunction} />
        <Field label="Sinh hoat hang ngay" value={d.adl} />
        <Field label="Dau" value={d.painLevel} />
        <Field label="Ghi chu luong gia" value={d.assessmentNotes} />
      </div>
      <div className="section">
        <div className="section-title">III. KE HOACH PHCN</div>
        <Field label="Muc tieu" value={d.rehabGoals} />
        <Field label="Vat ly tri lieu" value={d.physicalTherapy} />
        <Field label="Hoat dong tri lieu" value={d.occupationalTherapy} />
        <Field label="Bai tap tai nha" value={d.homeExercises} />
        <Field label="Tan suat tap" value={d.frequency} />
      </div>
      <div className="section">
        <div className="section-title">IV. THEO DOI</div>
        <Field label="Ket qua" value={d.outcome} />
        <Field label="Hen tai kham" value={d.followUpDate} />
      </div>
      <SignatureBlock leftTitle="TRUONG KHOA" rightTitle="BAC SI PHCN" date={new Date()} />
    </div>
  )
);
OutpatientRehabMRPrint.displayName = 'OutpatientRehabMRPrint';

// ============================================================
// 27. Giay kham theo yeu cau (MS:03/BV2)
// ============================================================
export const OnDemandExamPrint = forwardRef<HTMLDivElement, { data: Record<string, any> }>(
  ({ data: d }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS:03/BV2" />
      <h2>GIAY KHAM BENH THEO YEU CAU</h2>
      <div className="section">
        <div className="row">
          <div className="col"><Field label="Ho va ten" value={d.patientName} /></div>
          <div className="col"><Field label="Gioi tinh" value={d.gender} /></div>
          <div className="col"><Field label="Tuoi" value={d.age} /></div>
        </div>
        <Field label="Dia chi" value={d.address} />
        <Field label="So CCCD/CMND" value={d.nationalId} />
        <Field label="So dien thoai" value={d.phone} />
      </div>
      <div className="section">
        <div className="section-title">I. YEU CAU KHAM</div>
        <Field label="Muc dich kham" value={d.examPurpose} />
        <Field label="Co quan yeu cau" value={d.requestingOrganization} />
      </div>
      <div className="section">
        <div className="section-title">II. KHAM LAM SANG</div>
        <div className="row">
          <div className="col"><Field label="Mach" value={d.pulse} /></div>
          <div className="col"><Field label="HA" value={d.bloodPressure} /></div>
          <div className="col"><Field label="Nhiet do" value={d.temperature} /></div>
          <div className="col"><Field label="Can nang" value={d.weight} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Chieu cao" value={d.height} /></div>
          <div className="col"><Field label="BMI" value={d.bmi} /></div>
        </div>
        <Field label="Noi khoa" value={d.internalMedicine} />
        <Field label="Ngoai khoa" value={d.surgery} />
        <Field label="San phu khoa" value={d.obstetrics} />
        <Field label="Mat" value={d.ophthalmology} />
        <Field label="Tai Mui Hong" value={d.ent} />
        <Field label="Rang Ham Mat" value={d.dental} />
        <Field label="Da lieu" value={d.dermatology} />
        <Field label="Tam than kinh" value={d.neuropsych} />
      </div>
      <div className="section">
        <div className="section-title">III. CAN LAM SANG</div>
        <Field label="Xet nghiem mau" value={d.bloodTests} />
        <Field label="Xet nghiem nuoc tieu" value={d.urineTests} />
        <Field label="X-quang" value={d.xray} />
        <Field label="Dien tam do" value={d.ecg} />
        <Field label="Sieu am" value={d.ultrasound} />
        <Field label="Khac" value={d.otherTests} />
      </div>
      <div className="section">
        <div className="section-title">IV. KET LUAN</div>
        <Field label="Ket luan" value={d.conclusion} />
        <Field label="Phan loai suc khoe" value={d.healthClassification} />
      </div>
      <SignatureBlock leftTitle="TRUONG KHOA" rightTitle="BAC SI KHAM" date={new Date()} />
    </div>
  )
);
OnDemandExamPrint.displayName = 'OnDemandExamPrint';

// ============================================================
// 28. Phieu kham chuyen khoa (MS:04/BV2)
// ============================================================
export const SpecialtyExamPrint = forwardRef<HTMLDivElement, { data: Record<string, any> }>(
  ({ data: d }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS:04/BV2" />
      <h2>PHIEU KHAM CHUYEN KHOA</h2>
      <div className="section">
        <div className="row">
          <div className="col"><Field label="Ho va ten" value={d.patientName} /></div>
          <div className="col"><Field label="Gioi tinh" value={d.gender} /></div>
          <div className="col"><Field label="Tuoi" value={d.age} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Ma BN" value={d.patientCode} /></div>
          <div className="col"><Field label="Ma HSBA" value={d.medicalRecordCode} /></div>
        </div>
        <Field label="Khoa gui" value={d.referringDepartment} />
        <Field label="Khoa kham" value={d.examiningDepartment} />
      </div>
      <div className="section">
        <div className="section-title">I. LY DO KHAM CHUYEN KHOA</div>
        <Field label="Ly do" value={d.reason} />
        <Field label="Chan doan cua khoa gui" value={d.referringDiagnosis} />
      </div>
      <div className="section">
        <div className="section-title">II. KHAM LAM SANG CHUYEN KHOA</div>
        <Field label="Trieu chung" value={d.symptoms} />
        <Field label="Kham thuc the" value={d.physicalExam} />
      </div>
      <div className="section">
        <div className="section-title">III. CAN LAM SANG</div>
        <Field label="Xet nghiem / CDHA de nghi" value={d.requestedTests} />
        <Field label="Ket qua" value={d.testResults} />
      </div>
      <div className="section">
        <div className="section-title">IV. KET LUAN VA KIEN NGHI</div>
        <Field label="Chan doan chuyen khoa" value={d.specialtyDiagnosis} />
        <Field label="Huong xu tri" value={d.treatmentAdvice} />
        <Field label="Kien nghi" value={d.recommendations} />
      </div>
      <SignatureBlock leftTitle="BS CHUYEN KHOA" rightTitle="TRUONG KHOA" date={new Date()} />
    </div>
  )
);
SpecialtyExamPrint.displayName = 'SpecialtyExamPrint';

// ============================================================
// 29. Phieu cham soc cap 1 (MS:37/BV2)
// ============================================================
export const NursingCareLevel1Print = forwardRef<HTMLDivElement, { data: Record<string, any> }>(
  ({ data: d }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS:37/BV2" />
      <h2>PHIEU CHAM SOC CAP 1</h2>
      <div className="section">
        <div className="row">
          <div className="col"><Field label="Ho va ten" value={d.patientName} /></div>
          <div className="col"><Field label="Tuoi" value={d.age} /></div>
          <div className="col"><Field label="Giuong" value={d.bedNumber} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Ma BN" value={d.patientCode} /></div>
          <div className="col"><Field label="Khoa" value={d.departmentName} /></div>
        </div>
        <Field label="Chan doan" value={d.diagnosis} />
        <Field label="Phan loai cham soc" value="Cap 1 - Cham soc dac biet" />
      </div>
      <div className="section">
        <div className="section-title">I. TINH TRANG BENH NHAN</div>
        <Field label="Tri giac" value={d.consciousness} />
        <Field label="Dau hieu sinh ton" value={d.vitalSigns} />
        <Field label="Tinh trang nang" value={d.criticalCondition} />
        <Field label="Ong noi khi quan / May tho" value={d.airwayDevice} />
        <Field label="Truyen dich / Bom tiem dien" value={d.ivAccess} />
      </div>
      <div className="section">
        <div className="section-title">II. KE HOACH CHAM SOC</div>
        <Field label="Theo doi dau hieu sinh ton moi" value={d.vitalSignFrequency} />
        <Field label="Cham soc duong tho" value={d.airwayCare} />
        <Field label="Cham soc ong dan luu" value={d.drainCare} />
        <Field label="Cham soc vet thuong" value={d.woundCare} />
        <Field label="Dinh duong" value={d.nutrition} />
        <Field label="Ve sinh ca nhan" value={d.hygiene} />
        <Field label="Phong loet" value={d.pressureUlcerPrevention} />
        <Field label="An toan (thanh giuong, chong nga)" value={d.safetyMeasures} />
      </div>
      <div className="section">
        <div className="section-title">III. THEO DOI</div>
        <table>
          <thead>
            <tr><th>Gio</th><th>Mach</th><th>HA</th><th>Nhiet do</th><th>SpO2</th><th>Ghi chu</th><th>DD</th></tr>
          </thead>
          <tbody>
            {(d.monitoringRecords ?? []).length > 0
              ? (d.monitoringRecords as Record<string, any>[]).map((r: Record<string, any>, i: number) => (
                <tr key={i}>
                  <td>{r.time ?? ''}</td><td>{r.pulse ?? ''}</td><td>{r.bp ?? ''}</td>
                  <td>{r.temp ?? ''}</td><td>{r.spo2 ?? ''}</td><td>{r.notes ?? ''}</td><td>{r.nurse ?? ''}</td>
                </tr>
              ))
              : <tr><td colSpan={7} style={{ height: 120 }}>&nbsp;</td></tr>
            }
          </tbody>
        </table>
      </div>
      <SignatureBlock leftTitle="DIEU DUONG TRUONG" rightTitle="DIEU DUONG THUC HIEN" date={new Date()} />
    </div>
  )
);
NursingCareLevel1Print.displayName = 'NursingCareLevel1Print';

// ============================================================
// 30. Phieu cham soc cap 2 (MS:38/BV2)
// ============================================================
export const NursingCareLevel2Print = forwardRef<HTMLDivElement, { data: Record<string, any> }>(
  ({ data: d }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS:38/BV2" />
      <h2>PHIEU CHAM SOC CAP 2</h2>
      <div className="section">
        <div className="row">
          <div className="col"><Field label="Ho va ten" value={d.patientName} /></div>
          <div className="col"><Field label="Tuoi" value={d.age} /></div>
          <div className="col"><Field label="Giuong" value={d.bedNumber} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Ma BN" value={d.patientCode} /></div>
          <div className="col"><Field label="Khoa" value={d.departmentName} /></div>
        </div>
        <Field label="Chan doan" value={d.diagnosis} />
        <Field label="Phan loai cham soc" value="Cap 2 - Cham soc thuong xuyen" />
      </div>
      <div className="section">
        <div className="section-title">I. NHAN DINH DIEU DUONG</div>
        <Field label="Tri giac" value={d.consciousness} />
        <Field label="Van dong" value={d.mobility} />
        <Field label="Tu cham soc" value={d.selfCare} />
        <Field label="Dau" value={d.painLevel} />
        <Field label="Nguy co te nga" value={d.fallRisk} />
        <Field label="Nguy co loet" value={d.pressureUlcerRisk} />
      </div>
      <div className="section">
        <div className="section-title">II. KE HOACH CHAM SOC</div>
        <Field label="Theo doi sinh hieu moi" value={d.vitalSignFrequency} />
        <Field label="Ho tro an uong" value={d.feedingAssistance} />
        <Field label="Ho tro ve sinh" value={d.hygieneAssistance} />
        <Field label="Ho tro van dong" value={d.mobilityAssistance} />
        <Field label="Cham soc vet thuong" value={d.woundCare} />
        <Field label="Giao duc suc khoe" value={d.healthEducation} />
        <Field label="Chuan bi xuat vien" value={d.dischargePreparation} />
      </div>
      <div className="section">
        <div className="section-title">III. THUC HIEN CHAM SOC</div>
        <table>
          <thead>
            <tr><th>Ngay</th><th>Ca</th><th>Noi dung cham soc</th><th>Danh gia BN</th><th>DD thuc hien</th></tr>
          </thead>
          <tbody>
            {(d.careRecords ?? []).length > 0
              ? (d.careRecords as Record<string, any>[]).map((r: Record<string, any>, i: number) => (
                <tr key={i}>
                  <td>{r.date ?? ''}</td><td>{r.shift ?? ''}</td>
                  <td>{r.careContent ?? ''}</td><td>{r.evaluation ?? ''}</td><td>{r.nurse ?? ''}</td>
                </tr>
              ))
              : <tr><td colSpan={5} style={{ height: 120 }}>&nbsp;</td></tr>
            }
          </tbody>
        </table>
      </div>
      <SignatureBlock leftTitle="DIEU DUONG TRUONG" rightTitle="DIEU DUONG THUC HIEN" date={new Date()} />
    </div>
  )
);
NursingCareLevel2Print.displayName = 'NursingCareLevel2Print';

// ============================================================
// SPECIALTY_FORM_MAP - maps form codes to component names + titles
// ============================================================
export const SPECIALTY_FORM_MAP: Record<string, { component: string; title: string }> = {
  'MS:01/BV1': { component: 'InternalMedicineMRPrint', title: 'Benh an Noi khoa' },
  'MS:03/BV1': { component: 'InfectiousDiseaseMRPrint', title: 'Benh an Truyen nhiem' },
  'MS:04/BV1': { component: 'GynecologyMRPrint', title: 'Benh an Phu khoa' },
  'MS:07/BV1': { component: 'PsychiatryMRPrint', title: 'Benh an Tam than' },
  'MS:08/BV1': { component: 'DermatologyMRPrint', title: 'Benh an Da lieu' },
  'MS:09/BV1': { component: 'HematologyMRPrint', title: 'Benh an Huyet hoc - Truyen mau' },
  'MS:10/BV1': { component: 'SurgicalMRPrint', title: 'Benh an Ngoai khoa' },
  'MS:11/BV1': { component: 'BurnsMRPrint', title: 'Benh an Bong' },
  'MS:12/BV1': { component: 'OncologyMRPrint', title: 'Benh an Ung buou' },
  'MS:13/BV1': { component: 'DentalMRPrint', title: 'Benh an Rang Ham Mat' },
  'MS:14/BV1': { component: 'ENTMRPrint', title: 'Benh an Tai Mui Hong' },
  'MS:15/BV1': { component: 'OutpatientGeneralMRPrint', title: 'Benh an Ngoai tru chung' },
  'MS:16/BV1': { component: 'OutpatientDentalMRPrint', title: 'Benh an Ngoai tru Rang Ham Mat' },
  'MS:17/BV1': { component: 'CommuneHealthMRPrint', title: 'Benh an tuyen xa/phuong' },
  'MS:18/BV1': { component: 'TraditionalMedInpatientMRPrint', title: 'Benh an Noi tru Y hoc co truyen' },
  'MS:19/BV1': { component: 'TraditionalMedOutpatientMRPrint', title: 'Benh an Ngoai tru Y hoc co truyen' },
  'MS:20/BV1': { component: 'PediatricTCMMRPrint', title: 'Benh an Noi tru Nhi Y hoc co truyen' },
  'MS:21/BV1': { component: 'EyeTraumaMRPrint', title: 'Benh an Mat - Chan thuong' },
  'MS:22/BV1': { component: 'EyeAnteriorMRPrint', title: 'Benh an Mat - Ban phan truoc' },
  'MS:23/BV1': { component: 'EyePosteriorMRPrint', title: 'Benh an Mat - Day mat' },
  'MS:24/BV1': { component: 'EyeGlaucomaMRPrint', title: 'Benh an Mat - Glocom' },
  'MS:25/BV1': { component: 'EyeStrabismusMRPrint', title: 'Benh an Mat - Lac' },
  'MS:26/BV1': { component: 'PediatricEyeMRPrint', title: 'Benh an Mat tre em' },
  'MS:27/BV1': { component: 'RehabilitationMRPrint', title: 'Benh an Phuc hoi chuc nang' },
  'MS:28/BV1': { component: 'PediatricRehabMRPrint', title: 'Benh an Phuc hoi chuc nang Nhi' },
  'MS:29/BV1': { component: 'OutpatientRehabMRPrint', title: 'Benh an Ngoai tru Phuc hoi chuc nang' },
  'MS:03/BV2': { component: 'OnDemandExamPrint', title: 'Giay kham benh theo yeu cau' },
  'MS:04/BV2': { component: 'SpecialtyExamPrint', title: 'Phieu kham chuyen khoa' },
  'MS:37/BV2': { component: 'NursingCareLevel1Print', title: 'Phieu cham soc cap 1' },
  'MS:38/BV2': { component: 'NursingCareLevel2Print', title: 'Phieu cham soc cap 2' },
};
