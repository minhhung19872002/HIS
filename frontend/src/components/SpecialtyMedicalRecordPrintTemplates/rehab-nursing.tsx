import React, { forwardRef } from 'react';
import dayjs from 'dayjs';
import { HOSPITAL_NAME, HOSPITAL_ADDRESS, HOSPITAL_PHONE } from '../../constants/hospital';
import { DigitalSignatureStamp } from '../EMRPrintTemplates';
import type { SignatureStampInfo } from '../EMRPrintTemplates';
import { printStyles, PrintHeader, Field, SignatureBlock, PatientBlock, DottedArea } from './_shared';
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
