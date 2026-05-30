import { forwardRef } from 'react';
import { printStyles, PrintHeader, Field, SignatureBlock, PatientBlock } from './_shared';
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
