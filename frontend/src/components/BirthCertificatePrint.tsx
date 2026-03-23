import dayjs from 'dayjs';
import { HOSPITAL_NAME, HOSPITAL_ADDRESS, HOSPITAL_PHONE } from '../constants/hospital';

export interface BirthCertificateData {
  // Certificate info
  certificateNumber?: string;
  issueDate?: string;
  // Baby info
  babyFullName?: string;
  babyGender?: string; // 'Nam' | 'Nu'
  dateOfBirth?: string;
  timeOfBirth?: string;
  birthWeight?: number; // grams
  birthLength?: number; // cm
  gestationalAge?: number; // weeks
  apgar1?: number;
  apgar5?: number;
  apgar10?: number;
  deliveryMethod?: string; // 'normal' | 'c-section' | 'forceps' | 'vacuum'
  birthOrder?: number;
  pregnancyOrder?: number;
  numberOfBabies?: number;
  // Mother info
  motherFullName?: string;
  motherDateOfBirth?: string;
  motherIdNumber?: string;
  motherNationality?: string;
  motherEthnicity?: string;
  motherAddress?: string;
  motherOccupation?: string;
  // Father info
  fatherFullName?: string;
  fatherDateOfBirth?: string;
  fatherIdNumber?: string;
  fatherNationality?: string;
  fatherEthnicity?: string;
  fatherAddress?: string;
  fatherOccupation?: string;
  // Doctor info
  doctorName?: string;
  midwifeName?: string;
  departmentName?: string;
}

const deliveryMethodLabels: Record<string, string> = {
  normal: 'Đẻ thường',
  'c-section': 'Mổ lấy thai',
  forceps: 'Forceps',
  vacuum: 'Giác hút',
};

void deliveryMethodLabels;
/**
 * Print a Vietnamese birth certificate (Giấy chứng sinh) in a new popup window.
 * Uses the same print-in-popup pattern as Inpatient.tsx medical records.
 */
export const printBirthCertificate = (data: BirthCertificateData) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    return false;
  }

  const birthDate = data.dateOfBirth ? dayjs(data.dateOfBirth) : null;
  const issueDate = data.issueDate ? dayjs(data.issueDate) : dayjs();
  const motherDob = data.motherDateOfBirth ? dayjs(data.motherDateOfBirth) : null;
  const fatherDob = data.fatherDateOfBirth ? dayjs(data.fatherDateOfBirth) : null;

  const apgarDisplay = [
    data.apgar1 != null ? `1 phút: ${data.apgar1}` : null,
    data.apgar5 != null ? `5 phút: ${data.apgar5}` : null,
    data.apgar10 != null ? `10 phút: ${data.apgar10}` : null,
  ].filter(Boolean).join(', ') || '..........';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Giấy chứng sinh</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Times New Roman', serif;
          font-size: 13px;
          line-height: 1.5;
          padding: 20mm;
          max-width: 210mm;
          margin: 0 auto;
        }
        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .header-left {
          width: 45%;
          text-align: center;
        }
        .header-right {
          width: 45%;
          text-align: center;
        }
        .header-left .ministry {
          font-size: 12px;
          text-transform: uppercase;
        }
        .header-left .hospital {
          font-size: 13px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .header-right .country {
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .header-right .slogan {
          font-size: 11px;
          border-bottom: 1px solid #000;
          display: inline-block;
          padding-bottom: 2px;
        }
        .title {
          font-size: 20px;
          font-weight: bold;
          text-align: center;
          text-transform: uppercase;
          margin: 20px 0 5px 0;
        }
        .subtitle {
          text-align: center;
          font-style: italic;
          margin-bottom: 5px;
          font-size: 12px;
        }
        .cert-number {
          text-align: center;
          margin-bottom: 15px;
          font-size: 13px;
        }
        .section {
          margin: 12px 0;
        }
        .section-title {
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 6px;
          text-transform: uppercase;
        }
        .row {
          margin: 4px 0;
        }
        .field {
          border-bottom: 1px dotted #000;
          min-width: 80px;
          display: inline-block;
          padding: 0 5px;
        }
        .field-long {
          border-bottom: 1px dotted #000;
          width: 100%;
          display: block;
          min-height: 20px;
          padding: 0 5px;
        }
        .flex-row {
          display: flex;
          gap: 16px;
        }
        .flex-row .col { flex: 1; }
        .checkbox {
          width: 14px;
          height: 14px;
          border: 1px solid #000;
          display: inline-block;
          margin-right: 3px;
          vertical-align: middle;
          text-align: center;
          line-height: 12px;
        }
        .checkbox.checked::after { content: '\\2713'; }
        .signature-section {
          display: flex;
          justify-content: space-between;
          margin-top: 30px;
        }
        .signature-box {
          text-align: center;
          width: 200px;
        }
        .signature-title {
          font-weight: bold;
          margin-bottom: 5px;
        }
        .signature-hint {
          font-style: italic;
          font-size: 11px;
          margin-bottom: 50px;
        }
        .note {
          font-style: italic;
          font-size: 11px;
          margin-top: 20px;
          border-top: 1px solid #ccc;
          padding-top: 8px;
        }
        .stamp-area {
          width: 80px;
          height: 80px;
          border: 1px dashed #ccc;
          border-radius: 50%;
          margin: 0 auto 5px auto;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: #ccc;
        }
        @media print {
          body { padding: 15mm; }
          @page { size: A4; margin: 15mm 20mm; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-left">
          <div class="ministry">Bộ Y tế</div>
          <div class="hospital">${HOSPITAL_NAME}</div>
          <div style="font-size: 11px;">${HOSPITAL_ADDRESS}</div>
          <div style="font-size: 11px;">ĐT: ${HOSPITAL_PHONE}</div>
        </div>
        <div class="header-right">
          <div class="country">Cộng hòa Xã hội Chủ nghĩa Việt Nam</div>
          <div class="slogan">Độc lập - Tự do - Hạnh phúc</div>
        </div>
      </div>

      <div class="title">Giấy Chứng Sinh</div>
      <div class="subtitle">(Ban hành kèm theo Thông tư số 17/2012/TT-BYT ngày 24/10/2012 của Bộ trưởng Bộ Y tế)</div>
      <div class="cert-number">Số: <span class="field" style="min-width: 150px;">${data.certificateNumber || ''}</span>/GCS</div>

      <!-- SECTION 1: BABY INFO -->
      <div class="section">
        <div class="section-title">I. Thông tin trẻ sơ sinh</div>
        <div class="row">
          Họ và tên: <span class="field" style="min-width: 300px;">${data.babyFullName || ''}</span>
        </div>
        <div class="flex-row">
          <div class="col">
            Giới tính:
            <span class="checkbox ${data.babyGender === 'Nam' ? 'checked' : ''}"></span>Nam
            <span class="checkbox ${data.babyGender === 'Nu' ? 'checked' : ''}"></span>Nữ
          </div>
          <div class="col">
            Con thứ: <span class="field">${data.birthOrder ?? ''}</span>
          </div>
          <div class="col">
            Số con sinh: <span class="field">${data.numberOfBabies ?? ''}</span>
          </div>
        </div>
        <div class="row">
          Sinh lúc <span class="field">${birthDate ? birthDate.format('HH') : ''}</span> giờ
          <span class="field">${birthDate ? birthDate.format('mm') : ''}</span> phút,
          ngày <span class="field">${birthDate ? birthDate.format('DD') : ''}</span>
          tháng <span class="field">${birthDate ? birthDate.format('MM') : ''}</span>
          năm <span class="field">${birthDate ? birthDate.format('YYYY') : ''}</span>
        </div>
        <div class="flex-row">
          <div class="col">
            Cân nặng: <span class="field">${data.birthWeight ? data.birthWeight + ' gram' : ''}</span>
          </div>
          <div class="col">
            Chiều dài: <span class="field">${data.birthLength ? data.birthLength + ' cm' : ''}</span>
          </div>
        </div>
        <div class="flex-row">
          <div class="col">
            Tuổi thai: <span class="field">${data.gestationalAge ? data.gestationalAge + ' tuần' : ''}</span>
          </div>
          <div class="col">
            Phương pháp đẻ:
            <span class="checkbox ${data.deliveryMethod === 'normal' ? 'checked' : ''}"></span>Đẻ thường
            <span class="checkbox ${data.deliveryMethod === 'c-section' ? 'checked' : ''}"></span>Mổ lấy thai
            <span class="checkbox ${data.deliveryMethod === 'forceps' ? 'checked' : ''}"></span>Forceps
            <span class="checkbox ${data.deliveryMethod === 'vacuum' ? 'checked' : ''}"></span>Giác hút
          </div>
        </div>
        <div class="row">
          Điểm Apgar: <span class="field" style="min-width: 250px;">${apgarDisplay}</span>
        </div>
        <div class="row">
          Tình trạng sức khỏe sơ sinh: <span class="field-long">${data.birthWeight && data.birthWeight >= 2500 ? 'Bình thường' : ''}</span>
        </div>
      </div>

      <!-- SECTION 2: MOTHER INFO -->
      <div class="section">
        <div class="section-title">II. Thông tin người mẹ</div>
        <div class="row">
          Họ và tên: <span class="field" style="min-width: 300px;">${data.motherFullName || ''}</span>
        </div>
        <div class="flex-row">
          <div class="col">
            Ngày sinh: <span class="field">${motherDob ? motherDob.format('DD/MM/YYYY') : ''}</span>
          </div>
          <div class="col">
            Dân tộc: <span class="field">${data.motherEthnicity || ''}</span>
          </div>
          <div class="col">
            Quốc tịch: <span class="field">${data.motherNationality || 'Việt Nam'}</span>
          </div>
        </div>
        <div class="row">
          Số CMND/CCCD/Hộ chiếu: <span class="field" style="min-width: 200px;">${data.motherIdNumber || ''}</span>
        </div>
        <div class="row">
          Nghề nghiệp: <span class="field" style="min-width: 200px;">${data.motherOccupation || ''}</span>
        </div>
        <div class="row">
          Nơi cư trú: <span class="field-long">${data.motherAddress || ''}</span>
        </div>
      </div>

      <!-- SECTION 3: FATHER INFO -->
      <div class="section">
        <div class="section-title">III. Thông tin người cha</div>
        <div class="row">
          Họ và tên: <span class="field" style="min-width: 300px;">${data.fatherFullName || ''}</span>
        </div>
        <div class="flex-row">
          <div class="col">
            Ngày sinh: <span class="field">${fatherDob ? fatherDob.format('DD/MM/YYYY') : ''}</span>
          </div>
          <div class="col">
            Dân tộc: <span class="field">${data.fatherEthnicity || ''}</span>
          </div>
          <div class="col">
            Quốc tịch: <span class="field">${data.fatherNationality || 'Việt Nam'}</span>
          </div>
        </div>
        <div class="row">
          Số CMND/CCCD/Hộ chiếu: <span class="field" style="min-width: 200px;">${data.fatherIdNumber || ''}</span>
        </div>
        <div class="row">
          Nghề nghiệp: <span class="field" style="min-width: 200px;">${data.fatherOccupation || ''}</span>
        </div>
        <div class="row">
          Nơi cư trú: <span class="field-long">${data.fatherAddress || ''}</span>
        </div>
      </div>

      <!-- SECTION 4: PERSON WHO ANNOUNCES BIRTH -->
      <div class="section">
        <div class="section-title">IV. Người đỡ đẻ / Người chứng kiến</div>
        <div class="row">
          Bác sĩ / Nữ hộ sinh: <span class="field" style="min-width: 200px;">${data.doctorName || ''}</span>
        </div>
        <div class="row">
          Hộ sinh (nữ hộ sinh): <span class="field" style="min-width: 200px;">${data.midwifeName || ''}</span>
        </div>
        <div class="row">
          Khoa: <span class="field" style="min-width: 200px;">${data.departmentName || ''}</span>
        </div>
      </div>

      <!-- SIGNATURES -->
      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-title">NGƯỜI ĐỠ ĐẺ</div>
          <div class="signature-hint">(Ký, ghi rõ họ tên)</div>
        </div>
        <div class="signature-box">
          <div style="font-style: italic; font-size: 12px;">
            Ngày ${issueDate.format('DD')} tháng ${issueDate.format('MM')} năm ${issueDate.format('YYYY')}
          </div>
          <div class="signature-title">GIÁM ĐỐC BỆNH VIỆN</div>
          <div class="signature-hint">(Ký tên, đóng dấu)</div>
          <div class="stamp-area">M.D</div>
        </div>
      </div>

      <div class="note">
        <strong>Ghi chú:</strong>
        <br/>- Giấy chứng sinh được cấp 02 bản: 01 bản giao cho gia đình trẻ sơ sinh, 01 bản lưu tại cơ sở y tế.
        <br/>- Giấy chứng sinh có giá trị để làm thủ tục đăng ký khai sinh tại UBND xã, phường, thị trấn nơi cư trú của người mẹ hoặc người cha.
        <br/>- Giấy chứng sinh có giá trị trong vòng 60 ngày kể từ ngày cấp.
      </div>
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
  }, 500);

  return true;
};
