import { forwardRef } from 'react';
import { printStyles, PrintHeader, Field, SignatureBlock, PatientBlock } from './_shared';
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
