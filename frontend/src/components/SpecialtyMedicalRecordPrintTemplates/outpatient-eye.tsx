import { forwardRef } from 'react';
import { printStyles, PrintHeader, Field, SignatureBlock, PatientBlock } from './_shared';
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
