import { forwardRef } from 'react';
import dayjs from 'dayjs';
import type { HealthCheckup } from '../../../api/healthCheckup';
import { printStyles, PrintHeader, SignatureBlock, Field } from './EMRPrintTemplates/_shared';

// =====================================================================
// F10.5 — KSK Chuyen biet Print Templates
// 3 mau bieu ket luan suc khoe:
//   1. DriverCheckupPrint  — TT36/2021/TT-BYT (Lai xe)
//   2. VsattpCheckupPrint  — TT15/2012/TT-BYT (VSATTP)
//   3. StudentCheckupPrint — TT14/2013/TT-BYT (Di hoc / Tre em)
// Convention: forwardRef<HTMLDivElement, Props> + printStyles + PrintHeader + SignatureBlock
// =====================================================================

interface KskPrintProps {
  record: HealthCheckup;
}

// =====================================================================
// 1. Lai xe — Thong tu 36/2021/TT-BYT
// =====================================================================
export const DriverCheckupPrint = forwardRef<HTMLDivElement, KskPrintProps>(({ record }, ref) => {
  const today = dayjs();
  const examDate = record.checkupDate ? dayjs(record.checkupDate) : today;

  return (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="TT36/2021/TT-BYT" />
      <h2 style={{ textAlign: 'center', marginTop: 12, marginBottom: 4 }}>
        GIAY KHAM SUC KHOE LAI XE
      </h2>
      <div style={{ textAlign: 'center', fontStyle: 'italic', fontSize: 12, marginBottom: 16 }}>
        (Ban hanh kem theo Thong tu so 36/2021/TT-BYT ngay 30/12/2021 cua Bo Y te)
      </div>

      <div className="section">
        <h3>I. THONG TIN NGUOI DUOC KHAM</h3>
        <Field label="Ho va ten" value={record.patientName} />
        <div className="row">
          <div className="col"><Field label="Ngay sinh" value={record.dateOfBirth ? dayjs(record.dateOfBirth).format('DD/MM/YYYY') : undefined} /></div>
          <div className="col"><Field label="Gioi tinh" value={record.gender === 1 ? 'Nam' : 'Nu'} /></div>
        </div>
        <Field label="Hang lai xe de nghi kham" value={record.driverLicenseClass} />
        <Field label="Ngay kham" value={examDate.format('DD/MM/YYYY')} />
        <Field label="Bac si kham" value={record.examDoctor} />
      </div>

      <div className="section">
        <h3>II. KET QUA KHAM</h3>
        <Field label="Noi khoa" value={record.internalMedicine} />
        <Field label="Ngoai khoa" value={record.surgery} />
        <Field label="Mat" value={record.ophthalmology} />
        <Field label="Tai Mui Hong" value={record.entExam} />
        <Field label="Rang Ham Mat" value={record.dentalExam} />
        <Field label="Da lieu" value={record.dermatology} />
        <Field label="Than kinh - Tam than" value={record.psychiatry} />
        <Field label="Thu nghiem phan xa thi giac - van dong" value={record.driverReactionTest} />
        <Field label="Phan biet mau sac" value={record.driverColorVision} />
        <Field label="XN mau - nuoc tieu" value={record.labResults} />
        <Field label="X-quang phoi" value={record.xrayResults} />
      </div>

      <div className="section">
        <h3>III. KET LUAN</h3>
        <Field label="Phan loai suc khoe" value={record.conclusion === 'pass' ? 'Du dieu kien suc khoe' : record.conclusion === 'fail' ? 'Khong du dieu kien suc khoe' : 'Co dieu kien'} />
        <Field label="Ghi chu" value={record.notes} />
      </div>

      <div style={{ marginTop: 20, textAlign: 'right', fontStyle: 'italic', fontSize: 12 }}>
        Ngay {today.date()} thang {today.month() + 1} nam {today.year()}
      </div>

      <SignatureBlock
        leftTitle="NGUOI DUOC KHAM"
        rightTitle="BAC SI KHAM"
      />
    </div>
  );
});
DriverCheckupPrint.displayName = 'DriverCheckupPrint';

// =====================================================================
// 2. VSATTP — Thong tu 15/2012/TT-BYT
// =====================================================================
export const VsattpCheckupPrint = forwardRef<HTMLDivElement, KskPrintProps>(({ record }, ref) => {
  const today = dayjs();
  const examDate = record.checkupDate ? dayjs(record.checkupDate) : today;

  return (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="TT15/2012/TT-BYT" />
      <h2 style={{ textAlign: 'center', marginTop: 12, marginBottom: 4 }}>
        GIAY XAC NHAN DU DIEU KIEN SUC KHOE
      </h2>
      <div style={{ textAlign: 'center', fontStyle: 'italic', fontSize: 12, marginBottom: 4 }}>
        DAM BAO VE SINH AN TOAN THUC PHAM
      </div>
      <div style={{ textAlign: 'center', fontStyle: 'italic', fontSize: 11, marginBottom: 16 }}>
        (Ban hanh kem theo Thong tu so 15/2012/TT-BYT ngay 12/9/2012 cua Bo Y te)
      </div>

      <div className="section">
        <h3>I. THONG TIN NGUOI DUOC KHAM</h3>
        <Field label="Ho va ten" value={record.patientName} />
        <div className="row">
          <div className="col"><Field label="Ngay sinh" value={record.dateOfBirth ? dayjs(record.dateOfBirth).format('DD/MM/YYYY') : undefined} /></div>
          <div className="col"><Field label="Gioi tinh" value={record.gender === 1 ? 'Nam' : 'Nu'} /></div>
        </div>
        <Field label="Vai tro/Chuc danh lien quan ATTP" value={record.foodHandlerRole} />
        <Field label="Ngay kham" value={examDate.format('DD/MM/YYYY')} />
        <Field label="Bac si kham" value={record.examDoctor} />
      </div>

      <div className="section">
        <h3>II. KET QUA KHAM LAM SANG</h3>
        <Field label="Noi khoa" value={record.internalMedicine} />
        <Field label="Ngoai khoa" value={record.surgery} />
        <Field label="Da lieu" value={record.dermatology} />
        <Field label="Tai Mui Hong" value={record.entExam} />
        <Field label="Rang Ham Mat" value={record.dentalExam} />
        <Field label="Ket qua xet nghiem" value={record.labResults} />
      </div>

      <div className="section">
        <h3>III. KET LUAN</h3>
        <Field
          label="Ket luan cu the"
          value={record.foodSafetyConclusion ?? (record.conclusion === 'pass' ? 'Du dieu kien suc khoe tham gia che bien, kinh doanh thuc pham' : 'Khong du dieu kien')}
        />
        <Field label="Ghi chu" value={record.notes} />
      </div>

      <div style={{ marginTop: 20, textAlign: 'right', fontStyle: 'italic', fontSize: 12 }}>
        Ngay {today.date()} thang {today.month() + 1} nam {today.year()}
      </div>

      <SignatureBlock
        leftTitle="NGUOI DUOC KHAM"
        rightTitle="THU TRUONG CO SO Y TE"
      />
    </div>
  );
});
VsattpCheckupPrint.displayName = 'VsattpCheckupPrint';

// =====================================================================
// 3. Di hoc / Tre em — Thong tu 14/2013/TT-BYT
// =====================================================================
export const StudentCheckupPrint = forwardRef<HTMLDivElement, KskPrintProps>(({ record }, ref) => {
  const today = dayjs();
  const examDate = record.checkupDate ? dayjs(record.checkupDate) : today;
  const isChild = record.checkupType === 'ChildUnder24m';

  return (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber={isChild ? 'TT14-TRE' : 'TT14/2013/TT-BYT'} />
      <h2 style={{ textAlign: 'center', marginTop: 12, marginBottom: 4 }}>
        {isChild ? 'PHIEU KHAM SUC KHOE TRE EM' : 'GIAY KHAM SUC KHOE'}
      </h2>
      <div style={{ textAlign: 'center', fontStyle: 'italic', fontSize: 12, marginBottom: 16 }}>
        {isChild
          ? '(Danh cho tre em duoi 24 thang tuoi)'
          : '(Ban hanh kem theo Thong tu so 14/2013/TT-BYT ngay 06/5/2013 cua Bo Y te)'}
      </div>

      <div className="section">
        <h3>I. THONG TIN NGUOI DUOC KHAM</h3>
        <Field label="Ho va ten" value={record.patientName} />
        <div className="row">
          <div className="col"><Field label="Ngay sinh" value={record.dateOfBirth ? dayjs(record.dateOfBirth).format('DD/MM/YYYY') : undefined} /></div>
          <div className="col"><Field label="Gioi tinh" value={record.gender === 1 ? 'Nam' : 'Nu'} /></div>
        </div>
        {isChild && <Field label="Tuoi (thang)" value={record.ageMonths != null ? `${record.ageMonths} thang` : undefined} />}
        <Field label="Ngay kham" value={examDate.format('DD/MM/YYYY')} />
        <Field label="Bac si kham" value={record.examDoctor} />
      </div>

      <div className="section">
        <h3>II. KET QUA KHAM</h3>
        <Field label="Can nang (kg)" value={undefined} />
        <Field label="Chieu cao (cm)" value={undefined} />
        <Field label="Noi khoa" value={record.internalMedicine} />
        <Field label="Ngoai khoa" value={record.surgery} />
        <Field label="Mat" value={record.ophthalmology} />
        <Field label="Tai Mui Hong" value={record.entExam} />
        <Field label="Rang Ham Mat" value={record.dentalExam} />
        {isChild && <>
          <Field label="Danh gia phat trien" value={record.developmentAssessment} />
          <Field label="Tinh trang dinh duong" value={record.nutritionStatus} />
          <Field label="Tinh trang tiem chung" value={record.vaccinationStatus} />
        </>}
        <Field label="Ket qua xet nghiem" value={record.labResults} />
      </div>

      <div className="section">
        <h3>III. KET LUAN</h3>
        <Field
          label="Phan loai suc khoe"
          value={record.conclusion === 'pass' ? 'Du dieu kien suc khoe' : record.conclusion === 'fail' ? 'Khong du dieu kien' : record.conclusion}
        />
        <Field label="Ghi chu / Khuyen nghi" value={record.notes} />
      </div>

      <div style={{ marginTop: 20, textAlign: 'right', fontStyle: 'italic', fontSize: 12 }}>
        Ngay {today.date()} thang {today.month() + 1} nam {today.year()}
      </div>

      <SignatureBlock
        leftTitle="PHU HUYNH / NGUOI GIAM HO"
        rightTitle="BAC SI KHAM"
      />
    </div>
  );
});
StudentCheckupPrint.displayName = 'StudentCheckupPrint';
