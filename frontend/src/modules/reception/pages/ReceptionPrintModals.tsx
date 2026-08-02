/**
 * ReceptionPrintModals — in ấn tiếp đón port từ v1 pages/Reception.tsx (issue #409):
 *   1. PrintRequestFormModal — Giấy khám chữa bệnh theo yêu cầu (MS: 03/BV-02),
 *      form điền trước khi in (prefill từ phiên tiếp đón đang chọn).
 *   2. printBarcodeLabel     — nhãn mã vạch BN (HTML label, in tại quầy).
 * HTML template + prefill logic giữ VERBATIM từ v1; UI form chuyển sang ModalShell (_v2kit).
 */
import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Input, Select } from 'antd';
import { ModalShell, tw } from '@/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import { openPrintWindow, escapeHtml as esc } from '../../../utils/printWindow';
import { HOSPITAL_NAME } from '../../../constants/hospital';
import type { RawRow } from './shared';
import { genderLabel, ageOf } from './shared';

// ─── Shared field helpers (cùng pattern VisitActionsModals) ──────────────────

const FIELD_LABEL: React.CSSProperties = {
  fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-4)', fontWeight: 600,
};
const FIELD_WRAP: React.CSSProperties = { marginBottom: 'var(--space-12)' };

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={FIELD_WRAP}>
    <div style={FIELD_LABEL}>{label}</div>
    {children}
  </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontWeight: 700,
    margin: '8px 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em',
  }}>
    {children}
  </div>
);

// ─── 1. Giấy khám chữa bệnh theo yêu cầu (MS: 03/BV-02) ─────────────────────

interface Ms03Fields {
  hospitalName: string;
  healthDepartment: string;
  formNumber: string;
  recipient: string;
  patientName: string;
  age: string;
  gender: string;            // 'Nam' | 'Nữ' (in thẳng vào form giấy)
  identityNumber: string;
  issuingAuthority: string;
  ethnicity: string;
  nationality: string;
  occupation: string;
  workplace: string;
  address: string;
  emergencyContact: string;
  representativeName: string;
  roomName: string;
  requestedDoctor: string;
  roomType: string;
  depositAmount: string;
  depositAmountInWords: string;
}

const EMPTY_MS03: Ms03Fields = {
  hospitalName: '', healthDepartment: '', formNumber: '', recipient: '',
  patientName: '', age: '', gender: '', identityNumber: '', issuingAuthority: '',
  ethnicity: '', nationality: '', occupation: '', workplace: '', address: '',
  emergencyContact: '', representativeName: '', roomName: '', requestedDoctor: '',
  roomType: '', depositAmount: '', depositAmountInWords: '',
};

// HTML template — VERBATIM từ v1 executePrintRequestForm (pages/Reception.tsx).
const buildRequestFormHtml = (formValues: Ms03Fields): string => `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Giấy khám chữa bệnh theo yêu cầu</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.6; padding: 30px 40px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .header-left { width: 30%; }
          .header-center { width: 40%; text-align: center; }
          .header-right { width: 30%; text-align: right; font-size: 12px; }
          .title { font-size: 16px; font-weight: bold; text-align: center; margin: 20px 0 30px 0; }
          .subtitle { font-style: italic; text-align: center; margin-bottom: 20px; }
          .field { border-bottom: 1px dotted #000; min-width: 150px; display: inline-block; padding: 0 5px; }
          .field-long { border-bottom: 1px dotted #000; width: 100%; display: block; min-height: 20px; }
          .row { margin: 10px 0; }
          .indent { margin-left: 20px; }
          .section { margin: 15px 0; }
          .checkbox { width: 14px; height: 14px; border: 1px solid #000; display: inline-block; margin-right: 5px; }
          .signature-row { display: flex; justify-content: space-between; margin-top: 40px; }
          .signature-box { text-align: center; width: 40%; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            Sở Y tế: <span class="field">${esc(formValues.healthDepartment || '.....................')}</span><br/>
            BV: <span class="field">${esc(formValues.hospitalName || '.....................')}</span>
          </div>
          <div class="header-center">
            <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br/>
            <strong>Độc lập - Tự do - Hạnh phúc</strong><br/>
            <span>-----------------------------------------</span>
          </div>
          <div class="header-right">
            MS: 03/BV-02<br/>
            Số: <span class="field">${esc(formValues.formNumber || '............')}</span>
          </div>
        </div>

        <div class="title">Giấy khám chữa bệnh theo yêu cầu</div>

        <div class="subtitle">Kính gửi: <span class="field">${esc(formValues.recipient || '......................................................')}</span></div>

        <div class="section">
          <div class="row">- Tên tôi là: <span class="field">${esc(formValues.patientName || '')}</span> Tuổi: <span class="field">${esc(formValues.age || '')}</span> Nam/Nữ: <span class="field">${esc(formValues.gender || '')}</span></div>
          <div class="row">- CMND/Hộ chiếu/Hộ khẩu số: <span class="field">${esc(formValues.identityNumber || '')}</span> Cơ quan cấp: <span class="field">${esc(formValues.issuingAuthority || '')}</span></div>
          <div class="row">- Dân tộc: <span class="field">${esc(formValues.ethnicity || '')}</span> Ngoại kiều: <span class="field">${esc(formValues.nationality || '')}</span></div>
          <div class="row">- Nghề nghiệp: <span class="field">${esc(formValues.occupation || '')}</span> Nơi làm việc: <span class="field">${esc(formValues.workplace || '')}</span></div>
          <div class="row">- Địa chỉ: <span class="field" style="width: 80%">${esc(formValues.address || '')}</span></div>
          <div class="row">- Khi cần báo tin: <span class="field" style="width: 70%">${esc(formValues.emergencyContact || '')}</span></div>
          <div class="row">- Là người bệnh/đại diện gia đình người bệnh họ tên là: <span class="field">${esc(formValues.representativeName || '')}</span></div>
          <div class="row">Hiện đang khám/chữa bệnh tại Khoa: <span class="field">${esc(formValues.roomName || '')}</span> Bệnh viện: <span class="field">${esc(formValues.hospitalName || '')}</span></div>
        </div>

        <div class="section">
          <p><strong>1. Sau khi nghe bác sĩ phổ biến quy định khám/chữa bệnh theo yêu cầu của bệnh viện, tôi viết giấy này thỏa thuận xin khám/chữa bệnh theo yêu cầu và chọn dịch vụ chăm sóc như sau:</strong></p>
          <div class="indent">
            <div class="row">a. Bác sĩ khám/chữa bệnh/phẫu thuật/đỡ đẻ/chăm sóc: <span class="field">${esc(formValues.requestedDoctor || '')}</span></div>
            <div class="row">b. <span class="checkbox"></span> Y tá (điều dưỡng) chăm sóc theo chế độ bệnh lý tại giường.</div>
            <div class="row">c. <span class="checkbox"></span> Được dùng thuốc theo chỉ định của bác sĩ điều trị</div>
            <div class="row">d. Được nằm chữa bệnh tại buồng loại: <span class="field">${esc(formValues.roomType || '')}</span>, có tiện nghi: điều hòa nhiệt độ, tủ lạnh, nước nóng lạnh, buồng vệ sinh riêng.</div>
          </div>
        </div>

        <div class="section">
          <p><strong>2. Tôi xin ứng trước một khoản tiền theo quy định của bệnh viện là:</strong> <span class="field">${esc(formValues.depositAmount || '')}</span> đồng,</p>
          <p>(bằng chữ): <span class="field" style="width: 80%">${esc(formValues.depositAmountInWords || '')}</span></p>
          <p>để khám/chữa bệnh theo yêu cầu; khi ra viện tôi xin thanh toán đầy đủ.</p>
        </div>

        <div class="section">
          <p><strong>3.</strong> Trong khi thực hiện khám/chữa bệnh theo yêu cầu, nếu có vấn đề phát sinh đề nghị bác sĩ thông báo cho tôi/gia đình tôi biết để tiện thanh toán kịp thời.</p>
        </div>

        <div class="section">
          <p><strong>4.</strong> Tôi xin chấp hành đầy đủ nội quy khám/chữa bệnh của bệnh viện, yên tâm chữa bệnh và chịu trách nhiệm về những yêu cầu khám/chữa bệnh của tôi.</p>
        </div>

        <div class="signature-row">
          <div class="signature-box">
            <p>Duyệt của</p>
            <p><strong>Giám đốc bệnh viện</strong></p>
            <br/><br/><br/>
            <p>Họ tên: ................................</p>
          </div>
          <div class="signature-box">
            <p>Ngày ${esc(dayjs().format('DD'))} tháng ${esc(dayjs().format('MM'))} năm ${esc(dayjs().format('YYYY'))}</p>
            <p><strong>Người bệnh/đại diện gia đình</strong></p>
            <br/><br/><br/>
            <p>Họ tên: ................................</p>
          </div>
        </div>

      </body>
      </html>
    `;

export const PrintRequestFormModal: React.FC<{
  row: RawRow | null;
  onClose: () => void;
}> = ({ row, onClose }) => {
  const [f, setF] = useState<Ms03Fields>(EMPTY_MS03);
  const set = <K extends keyof Ms03Fields>(k: K, v: Ms03Fields[K]) => setF((p) => ({ ...p, [k]: v }));

  // Prefill VERBATIM v1 handlePrintRequestForm (+ hospitalName từ constants — v1 để trống).
  useEffect(() => {
    if (row) {
      const age = ageOf(row);
      setF({
        ...EMPTY_MS03,
        hospitalName: HOSPITAL_NAME,
        patientName: row.patientName || '',
        age: age === '—' ? '' : String(age),
        gender: genderLabel(row) === '—' ? '' : genderLabel(row),
        identityNumber: row.identityNumber || '',
        address: row.address || '',
        roomName: row.roomName || '',
      });
    }
  }, [row]);

  const doPrint = () => {
    const win = openPrintWindow(buildRequestFormHtml(f), {
      focus: true,
      print: { delayMs: 500 },
      onBlocked: () => tw('Không thể mở cửa sổ in. Vui lòng cho phép popup.'),
    });
    if (win) onClose();
  };

  return (
    <ModalShell
      open={!!row}
      onClose={onClose}
      size="lg"
      title="In Giấy khám chữa bệnh theo yêu cầu (MS: 03/BV-02)"
      sub={row?.patientName}
      footer={(
        <>
          <button type="button" className="ab-btn ghost" onClick={onClose}>Hủy</button>
          <span style={{ flex: 1 }} />
          <button type="button" className="ab-btn primary" onClick={doPrint}>
            <TermIcon name="print" size={12} /> In giấy yêu cầu
          </button>
        </>
      )}
    >
      <div style={{ padding: 0 }}>
        <div style={{
          fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-12)',
          padding: '8px 10px', background: 'var(--d-1)', borderRadius: 5,
        }}>
          <TermIcon name="info" size={11} /> Giấy khám chữa bệnh theo yêu cầu dành cho bệnh nhân dịch vụ, yêu cầu bác sĩ/buồng bệnh cụ thể
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
          <Field label="Bệnh viện">
            <Input value={f.hospitalName} onChange={(e) => set('hospitalName', e.target.value)} placeholder="Tên bệnh viện" />
          </Field>
          <Field label="Sở Y tế">
            <Input value={f.healthDepartment} onChange={(e) => set('healthDepartment', e.target.value)} placeholder="Tên Sở Y tế" />
          </Field>
        </div>

        <SectionTitle>Thông tin người bệnh</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 'var(--space-12)' }}>
          <Field label="Họ tên">
            <Input value={f.patientName} onChange={(e) => set('patientName', e.target.value)} />
          </Field>
          <Field label="Tuổi">
            <Input value={f.age} onChange={(e) => set('age', e.target.value)} />
          </Field>
          <Field label="Giới tính">
            <Select
              value={f.gender || undefined} onChange={(v) => set('gender', v)} placeholder="Chọn"
              style={{ width: '100%' }}
              options={[{ value: 'Nam', label: 'Nam' }, { value: 'Nữ', label: 'Nữ' }]}
            />
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
          <Field label="CMND/CCCD">
            <Input value={f.identityNumber} onChange={(e) => set('identityNumber', e.target.value)} placeholder="12 chữ số" maxLength={12} />
          </Field>
          <Field label="Cơ quan cấp">
            <Input value={f.issuingAuthority} onChange={(e) => set('issuingAuthority', e.target.value)} />
          </Field>
          <Field label="Dân tộc">
            <Input value={f.ethnicity} onChange={(e) => set('ethnicity', e.target.value)} placeholder="Kinh" />
          </Field>
          <Field label="Ngoại kiều">
            <Input value={f.nationality} onChange={(e) => set('nationality', e.target.value)} />
          </Field>
          <Field label="Nghề nghiệp">
            <Input value={f.occupation} onChange={(e) => set('occupation', e.target.value)} />
          </Field>
          <Field label="Nơi làm việc">
            <Input value={f.workplace} onChange={(e) => set('workplace', e.target.value)} />
          </Field>
        </div>
        <Field label="Địa chỉ">
          <Input value={f.address} onChange={(e) => set('address', e.target.value)} />
        </Field>
        <Field label="Khi cần báo tin">
          <Input value={f.emergencyContact} onChange={(e) => set('emergencyContact', e.target.value)} placeholder="Họ tên, số điện thoại người thân" />
        </Field>

        <SectionTitle>Yêu cầu dịch vụ</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
          <Field label="Khám tại Khoa/Phòng">
            <Input value={f.roomName} onChange={(e) => set('roomName', e.target.value)} />
          </Field>
          <Field label="Bác sĩ yêu cầu">
            <Input value={f.requestedDoctor} onChange={(e) => set('requestedDoctor', e.target.value)} placeholder="Tên bác sĩ muốn khám" />
          </Field>
        </div>
        <Field label="Loại buồng bệnh (nếu nằm viện)">
          <Select
            value={f.roomType || undefined} onChange={(v) => set('roomType', v ?? '')} placeholder="Chọn loại buồng"
            style={{ width: '100%' }}
            options={[
              { value: 'VIP', label: 'VIP - Phòng riêng' },
              { value: 'A', label: 'Loại A - 2 giường' },
              { value: 'B', label: 'Loại B - 4 giường' },
              { value: '', label: 'Không yêu cầu' },
            ]}
          />
        </Field>

        <SectionTitle>Thanh toán</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
          <Field label="Số tiền tạm ứng (đồng)">
            <Input type="number" value={f.depositAmount} onChange={(e) => set('depositAmount', e.target.value)} />
          </Field>
          <Field label="Bằng chữ">
            <Input value={f.depositAmountInWords} onChange={(e) => set('depositAmountInWords', e.target.value)} placeholder="Ví dụ: Một triệu đồng" />
          </Field>
        </div>
      </div>
    </ModalShell>
  );
};

// ─── 2. Nhãn mã vạch BN (HTML label) — VERBATIM v1 handlePrintBarcodeLabel ──

export const printBarcodeLabel = (record: RawRow): void => {
  const dob = record.dateOfBirth ? dayjs(record.dateOfBirth).format('DD/MM/YYYY') : '';
  const html = `
      <!DOCTYPE html>
      <html><head><title>Mã vạch - ${esc(record.patientCode)}</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 10px; margin: 0; }
        .label { border: 1px solid #000; padding: 8px 12px; display: inline-block; min-width: 220px; }
        .barcode { font-size: 28px; font-weight: bold; letter-spacing: 4px; font-family: 'Libre Barcode 128', monospace; margin: 6px 0; }
        .barcode-text { font-size: 16px; font-weight: bold; letter-spacing: 2px; font-family: monospace; margin: 4px 0; }
        .patient-name { font-size: 13px; font-weight: bold; margin: 4px 0; }
        .info { font-size: 11px; color: #333; margin: 2px 0; }
        @media print { body { padding: 0; } .label { border: 1px solid #000; } }
      </style></head>
      <body>
        <div class="label">
          <div class="barcode">||||| ${esc(record.patientCode)} |||||</div>
          <div class="barcode-text">${esc(record.patientCode)}</div>
          <div class="patient-name">${esc(record.patientName)}</div>
          ${dob ? `<div class="info">NS: ${esc(dob)}</div>` : ''}
          <div class="info">HSBA: ${esc(record.id.substring(0, 8).toUpperCase())}</div>
          <div class="info">${esc(dayjs().format('DD/MM/YYYY HH:mm'))}</div>
        </div>
      </body></html>
    `;
  openPrintWindow(html, {
    focus: true,
    print: { delayMs: 500 },
    onBlocked: () => tw('Không thể mở cửa sổ in. Vui lòng cho phép popup.'),
  });
};
