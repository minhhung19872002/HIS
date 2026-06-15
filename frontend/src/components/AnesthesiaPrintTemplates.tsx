/**
 * AnesthesiaPrintTemplates — 3 phiếu gây mê
 *
 * Presentational thuần: nhận data qua props (Record<string, unknown>),
 * KHÔNG gọi API bên trong. Caller fetch AnesthesiaRecordDto rồi truyền vào.
 *
 * PrintTypes đăng ký:
 *  gayme-monitor   — Phiếu theo dõi gây mê (Monitors[])
 *  gayme-recovery  — Phiếu hồi tỉnh (RecoveryNotes + điểm Aldrete)
 *  gayme-record    — Biên bản gây mê (thông tin tổng + Drugs[] + Fluids[])
 */

import React from 'react';
import { HOSPITAL_NAME, HOSPITAL_ADDRESS, HOSPITAL_PHONE } from '../constants/hospital';

// ---------------------------------------------------------------------------
// Local shared helpers (không re-export để tránh circular dep với ClinicalFormPrintTemplates)
// ---------------------------------------------------------------------------

const Header: React.FC<{ formCode: string; formTitle: string }> = ({ formCode, formTitle }) => (
  <div style={{ textAlign: 'center', marginBottom: 16 }}>
    <div style={{ fontSize: 11, fontWeight: 'bold' }}>BỘ Y TẾ</div>
    <div style={{ fontSize: 13, fontWeight: 'bold' }}>{HOSPITAL_NAME}</div>
    <div style={{ fontSize: 10 }}>{HOSPITAL_ADDRESS} — ĐT: {HOSPITAL_PHONE}</div>
    <div style={{ fontSize: 16, fontWeight: 'bold', marginTop: 12 }}>{formTitle}</div>
    <div style={{ fontSize: 10, fontStyle: 'italic' }}>(Mẫu số: {formCode})</div>
  </div>
);

const Fld: React.FC<{ label: string; value?: string | number | null; inline?: boolean }> = ({ label, value, inline }) => (
  <div style={inline ? { display: 'inline-block', marginRight: 24 } : { marginBottom: 4 }}>
    <span style={{ fontWeight: 'bold' }}>{label}: </span>
    <span>{value ?? '...........'}</span>
  </div>
);

const SigBlock: React.FC<{ titles: string[] }> = ({ titles }) => (
  <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 32 }}>
    {titles.map((t, i) => (
      <div key={i} style={{ textAlign: 'center', minWidth: 150 }}>
        <div style={{ fontWeight: 'bold' }}>{t}</div>
        <div style={{ fontStyle: 'italic', fontSize: 10 }}>(Ký, ghi rõ họ tên)</div>
        <div style={{ height: 60 }} />
      </div>
    ))}
  </div>
);

const TH: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <th style={{ border: '1px solid #999', padding: '4px 6px', background: '#f0f0f0', textAlign: 'center', fontWeight: 600, fontSize: 11 }}>
    {children}
  </th>
);

const TD: React.FC<{ children?: React.ReactNode; center?: boolean }> = ({ children, center }) => (
  <td style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: center ? 'center' : 'left', fontSize: 11, minHeight: 22 }}>
    {children}
  </td>
);

// ---------------------------------------------------------------------------
// Type helpers for DTO sub-arrays
// ---------------------------------------------------------------------------

interface MonitorRow {
  monitorTime?: string;
  systolicBP?: number;
  diastolicBP?: number;
  heartRate?: number;
  spO2?: number;
  etCO2?: number;
  temperature?: number;
  notes?: string;
}

interface DrugRow {
  givenTime?: string;
  drugName?: string;
  dose?: string;
  route?: string;
}

interface FluidRow {
  fluidType?: string;
  volume?: number;
  startTime?: string;
  endTime?: string;
}

function asMonitors(raw: unknown): MonitorRow[] {
  if (!Array.isArray(raw)) return [];
  return raw as MonitorRow[];
}

function asDrugs(raw: unknown): DrugRow[] {
  if (!Array.isArray(raw)) return [];
  return raw as DrugRow[];
}

function asFluids(raw: unknown): FluidRow[] {
  if (!Array.isArray(raw)) return [];
  return raw as FluidRow[];
}

// ---------------------------------------------------------------------------
// 1. Phiếu theo dõi gây mê (gayme-monitor)
//    Bảng sinh hiệu + thuốc gây mê theo mốc thời gian
// ---------------------------------------------------------------------------

export const GaymMonitorPrint: React.FC<{ record?: Record<string, unknown> }> = ({ record }) => {
  const monitors = asMonitors(record?.monitors);
  const drugs = asDrugs(record?.drugs);

  return (
    <div style={{ fontFamily: 'Times New Roman', padding: 20, maxWidth: 800 }}>
      <Header formCode="GM-01" formTitle="PHIẾU THEO DÕI GÂY MÊ" />

      <div style={{ marginBottom: 12 }}>
        <Fld label="Họ và tên" value={record?.patientName as string} inline />
        <Fld label="Phương pháp vô cảm" value={record?.anesthesiaType as string} inline />
      </div>
      <div style={{ marginBottom: 12 }}>
        <Fld label="Phân loại ASA" value={record?.asaLabel as string ?? (record?.asaClass ? `ASA ${record.asaClass}` : undefined)} inline />
        <Fld label="Mallampati" value={record?.mallampatiLabel as string ?? (record?.mallampatiScore ? `Mallampati ${record.mallampatiScore}` : undefined)} inline />
        <Fld label="Kế hoạch đường thở" value={record?.airwayPlan as string} />
      </div>

      {/* Bảng theo dõi sinh tồn */}
      <div style={{ fontWeight: 'bold', marginBottom: 6 }}>I. THEO DÕI SINH TỒN TRONG MỔ</div>
      <div style={{ overflowX: 'auto', marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <TH>Giờ</TH>
              <TH>HA tâm thu (mmHg)</TH>
              <TH>HA tâm trương (mmHg)</TH>
              <TH>Mạch (l/ph)</TH>
              <TH>SpO2 (%)</TH>
              <TH>EtCO2 (mmHg)</TH>
              <TH>Nhiệt độ (°C)</TH>
              <TH>Ghi chú</TH>
            </tr>
          </thead>
          <tbody>
            {monitors.length > 0
              ? monitors.map((m, i) => (
                <tr key={i}>
                  <TD center>{m.monitorTime ?? ''}</TD>
                  <TD center>{m.systolicBP ?? ''}</TD>
                  <TD center>{m.diastolicBP ?? ''}</TD>
                  <TD center>{m.heartRate ?? ''}</TD>
                  <TD center>{m.spO2 ?? ''}</TD>
                  <TD center>{m.etCO2 ?? ''}</TD>
                  <TD center>{m.temperature ?? ''}</TD>
                  <TD>{m.notes ?? ''}</TD>
                </tr>
              ))
              : [1, 2, 3, 4, 5].map((i) => (
                <tr key={i}>
                  {Array(8).fill(null).map((_, j) => <TD key={j} />)}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Bảng thuốc gây mê */}
      <div style={{ fontWeight: 'bold', marginBottom: 6 }}>II. THUỐC GÂY MÊ SỬ DỤNG</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead>
          <tr>
            <TH>STT</TH>
            <TH>Giờ dùng</TH>
            <TH>Tên thuốc</TH>
            <TH>Liều dùng</TH>
            <TH>Đường dùng</TH>
          </tr>
        </thead>
        <tbody>
          {drugs.length > 0
            ? drugs.map((d, i) => (
              <tr key={i}>
                <TD center>{i + 1}</TD>
                <TD center>{d.givenTime ?? ''}</TD>
                <TD>{d.drugName ?? ''}</TD>
                <TD center>{d.dose ?? ''}</TD>
                <TD center>{d.route ?? ''}</TD>
              </tr>
            ))
            : [1, 2, 3].map((i) => (
              <tr key={i}>
                {Array(5).fill(null).map((_, j) => <TD key={j} />)}
              </tr>
            ))}
        </tbody>
      </table>

      <SigBlock titles={['Bác sĩ gây mê', 'Trưởng khoa gây mê']} />
    </div>
  );
};

// ---------------------------------------------------------------------------
// 2. Phiếu hồi tỉnh (gayme-recovery)
//    Theo dõi sau mổ tại phòng hồi tỉnh + ghi chú điểm Aldrete
// ---------------------------------------------------------------------------

export const GaymRecoveryPrint: React.FC<{ record?: Record<string, unknown> }> = ({ record }) => {
  const monitors = asMonitors(record?.monitors);

  return (
    <div style={{ fontFamily: 'Times New Roman', padding: 20, maxWidth: 800 }}>
      <Header formCode="GM-02" formTitle="PHIẾU THEO DÕI HỒI TỈNH SAU MỔ" />

      <div style={{ marginBottom: 12 }}>
        <Fld label="Họ và tên" value={record?.patientName as string} inline />
        <Fld label="Phương pháp vô cảm" value={record?.anesthesiaType as string} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <Fld label="Phân loại ASA" value={record?.asaLabel as string ?? (record?.asaClass ? `ASA ${record.asaClass}` : undefined)} inline />
      </div>

      {/* Theo dõi sinh tồn tại phòng hồi tỉnh */}
      <div style={{ fontWeight: 'bold', marginBottom: 6 }}>I. THEO DÕI TẠI PHÒNG HỒI TỈNH</div>
      <div style={{ overflowX: 'auto', marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <TH>Giờ ghi</TH>
              <TH>HA (mmHg)</TH>
              <TH>Mạch (l/ph)</TH>
              <TH>SpO2 (%)</TH>
              <TH>Nhiệt độ (°C)</TH>
              <TH>Ghi chú</TH>
            </tr>
          </thead>
          <tbody>
            {monitors.length > 0
              ? monitors.map((m, i) => (
                <tr key={i}>
                  <TD center>{m.monitorTime ?? ''}</TD>
                  <TD center>{m.systolicBP && m.diastolicBP ? `${m.systolicBP}/${m.diastolicBP}` : m.systolicBP ?? ''}</TD>
                  <TD center>{m.heartRate ?? ''}</TD>
                  <TD center>{m.spO2 ?? ''}</TD>
                  <TD center>{m.temperature ?? ''}</TD>
                  <TD>{m.notes ?? ''}</TD>
                </tr>
              ))
              : [1, 2, 3, 4].map((i) => (
                <tr key={i}>
                  {Array(6).fill(null).map((_, j) => <TD key={j} />)}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Điểm Aldrete + ghi chú hồi tỉnh */}
      <div style={{ fontWeight: 'bold', marginBottom: 6 }}>II. ĐIỂM ALDRETE VÀ DIỄN BIẾN HỒI TỈNH</div>
      <div style={{ border: '1px solid #ccc', padding: 10, marginBottom: 16, minHeight: 80, fontSize: 12, whiteSpace: 'pre-wrap' }}>
        {(record?.recoveryNotes as string) || ''}
      </div>

      {/* Thang điểm Aldrete tham chiếu */}
      <div style={{ fontSize: 10, color: '#555', marginBottom: 12, border: '1px dashed #ccc', padding: 8 }}>
        <strong>Thang điểm Aldrete (điểm 0–2 mỗi mục, tổng ≥9 được chuyển khỏi phòng hồi tỉnh):</strong><br />
        Vận động: 2=cử động 4 chi · 1=2 chi · 0=không · &nbsp;
        Hô hấp: 2=tự thở sâu · 1=thở nông · 0=ngưng · &nbsp;
        Tuần hoàn: 2=HA ±20% trước mổ · 1=±20–49% · 0=&gt;50% · &nbsp;
        Ý thức: 2=tỉnh táo · 1=có gọi · 0=không đáp ứng · &nbsp;
        SpO2: 2=≥92% thở khí phòng · 1=cần O2 · 0=&lt;90%
      </div>

      {/* Kế hoạch chuyển */}
      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>III. KẾ HOẠCH CHUYỂN PHÒNG / CHẾ ĐỘ CHĂM SÓC SAU MỔ</div>
      <div style={{ border: '1px solid #ccc', padding: 8, minHeight: 60, fontSize: 12, whiteSpace: 'pre-wrap' }}>
        {(record?.postSurgeryPlan as string) || ''}
      </div>

      <SigBlock titles={['Điều dưỡng hồi tỉnh', 'Bác sĩ gây mê']} />
    </div>
  );
};

// ---------------------------------------------------------------------------
// 3. Biên bản gây mê (gayme-record)
//    Thông tin tổng thể + danh sách thuốc + dịch truyền
// ---------------------------------------------------------------------------

export const GaymRecordPrint: React.FC<{ record?: Record<string, unknown> }> = ({ record }) => {
  const drugs = asDrugs(record?.drugs);
  const fluids = asFluids(record?.fluids);

  return (
    <div style={{ fontFamily: 'Times New Roman', padding: 20, maxWidth: 800 }}>
      <Header formCode="GM-03" formTitle="BIÊN BẢN GÂY MÊ – HỒI SỨC" />

      {/* Thông tin bệnh nhân & gây mê */}
      <div style={{ marginBottom: 12, borderBottom: '1px solid #999', paddingBottom: 8 }}>
        <Fld label="Họ và tên" value={record?.patientName as string} inline />
        <Fld label="Ngày" value={record?.createdAt ? String(record.createdAt).slice(0, 10) : undefined} inline />
        <br />
        <Fld label="Phương pháp vô cảm" value={record?.anesthesiaType as string} inline />
        <Fld label="Phân loại ASA" value={record?.asaLabel as string ?? (record?.asaClass ? `ASA ${record.asaClass}` : undefined)} inline />
        <Fld label="Mallampati" value={record?.mallampatiLabel as string ?? (record?.mallampatiScore ? `Mallampati ${record.mallampatiScore}` : undefined)} inline />
        <br />
        <Fld label="Dị ứng" value={(record?.allergies as string) || 'Không'} inline />
        <Fld label="Nhịn ăn (NPO)" value={record?.npoStatus as string} inline />
        <br />
        <Fld label="Kế hoạch đường thở" value={record?.airwayPlan as string} />
        <Fld label="Đánh giá tiền mê" value={record?.preOpAssessment as string} />
        <Fld label="Khám tâm lý trước mổ" value={record?.psychologicalAssessment as string} />
      </div>

      {/* Bảng thuốc gây mê */}
      <div style={{ fontWeight: 'bold', marginBottom: 6 }}>I. DANH SÁCH THUỐC GÂY MÊ</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead>
          <tr>
            <TH>STT</TH>
            <TH>Giờ dùng</TH>
            <TH>Tên thuốc</TH>
            <TH>Liều dùng</TH>
            <TH>Đường dùng</TH>
          </tr>
        </thead>
        <tbody>
          {drugs.length > 0
            ? drugs.map((d, i) => (
              <tr key={i}>
                <TD center>{i + 1}</TD>
                <TD center>{d.givenTime ?? ''}</TD>
                <TD>{d.drugName ?? ''}</TD>
                <TD center>{d.dose ?? ''}</TD>
                <TD center>{d.route ?? ''}</TD>
              </tr>
            ))
            : [1, 2, 3].map((i) => (
              <tr key={i}>
                {Array(5).fill(null).map((_, j) => <TD key={j} />)}
              </tr>
            ))}
        </tbody>
      </table>

      {/* Bảng dịch truyền */}
      <div style={{ fontWeight: 'bold', marginBottom: 6 }}>II. DỊCH TRUYỀN</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead>
          <tr>
            <TH>STT</TH>
            <TH>Loại dịch</TH>
            <TH>Thể tích (ml)</TH>
            <TH>Bắt đầu</TH>
            <TH>Kết thúc</TH>
          </tr>
        </thead>
        <tbody>
          {fluids.length > 0
            ? fluids.map((f, i) => (
              <tr key={i}>
                <TD center>{i + 1}</TD>
                <TD>{f.fluidType ?? ''}</TD>
                <TD center>{f.volume ?? ''}</TD>
                <TD center>{f.startTime ?? ''}</TD>
                <TD center>{f.endTime ?? ''}</TD>
              </tr>
            ))
            : [1, 2].map((i) => (
              <tr key={i}>
                {Array(5).fill(null).map((_, j) => <TD key={j} />)}
              </tr>
            ))}
        </tbody>
      </table>

      {/* Tóm tắt diễn biến */}
      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>III. TÓM TẮT DIỄN BIẾN GÂY MÊ</div>
      <div style={{ border: '1px solid #ccc', padding: 8, minHeight: 60, fontSize: 12, whiteSpace: 'pre-wrap', marginBottom: 12 }}>
        {(record?.recoveryNotes as string) || ''}
      </div>

      <SigBlock titles={['Bác sĩ gây mê', 'Bác sĩ phẫu thuật', 'Trưởng khoa gây mê']} />
    </div>
  );
};

// ---------------------------------------------------------------------------
// HTML print helpers — dùng trong modals (window.open + print CSS)
// Consistent với BirthCertificatePrint.tsx + PostAnesthesiaPlanModal pattern.
// Caller gọi sau khi đã fetch AnesthesiaRecordDto.
// ---------------------------------------------------------------------------

const PRINT_BASE_CSS = `
  body { font-family: 'Times New Roman', serif; padding: 24px; font-size: 12pt; color: #111; }
  h2 { text-align: center; font-size: 14pt; margin-bottom: 4px; }
  .sub { text-align: center; font-size: 10pt; color: #444; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  th { border: 1px solid #999; padding: 4px 6px; background: #f0f0f0; text-align: center; font-size: 10pt; }
  td { border: 1px solid #ccc; padding: 4px 6px; font-size: 10pt; }
  .sig { display: flex; justify-content: space-around; margin-top: 36px; }
  .sig > div { text-align: center; min-width: 150px; }
  .sig .name { font-weight: bold; }
  .sig .hint { font-style: italic; font-size: 9pt; }
  .sig .space { height: 56px; }
  .label { font-weight: bold; }
  .section-title { font-weight: bold; margin: 10px 0 6px; }
  .notes-box { border: 1px solid #ccc; padding: 8px; min-height: 56px; white-space: pre-wrap; font-size: 11pt; margin-bottom: 10px; }
  @media print { body { padding: 0; } }
`;

function openHtmlPrint(title: string, body: string): void {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) { return; }
  w.document.write(`<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>${title}</title><style>${PRINT_BASE_CSS}</style></head><body>${body}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

function monitorTableRows(monitors: MonitorRow[]): string {
  if (!monitors.length) {
    return [1, 2, 3, 4, 5].map(() => '<tr>' + Array(8).fill('<td>&nbsp;</td>').join('') + '</tr>').join('');
  }
  return monitors.map((m) => `<tr>
    <td style="text-align:center">${m.monitorTime ?? ''}</td>
    <td style="text-align:center">${m.systolicBP ?? ''}</td>
    <td style="text-align:center">${m.diastolicBP ?? ''}</td>
    <td style="text-align:center">${m.heartRate ?? ''}</td>
    <td style="text-align:center">${m.spO2 ?? ''}</td>
    <td style="text-align:center">${m.etCO2 ?? ''}</td>
    <td style="text-align:center">${m.temperature ?? ''}</td>
    <td>${m.notes ?? ''}</td>
  </tr>`).join('');
}

function drugTableRows(drugs: DrugRow[]): string {
  if (!drugs.length) {
    return [1, 2, 3].map((i) => `<tr><td style="text-align:center">${i}</td>${Array(4).fill('<td>&nbsp;</td>').join('')}</tr>`).join('');
  }
  return drugs.map((d, i) => `<tr>
    <td style="text-align:center">${i + 1}</td>
    <td style="text-align:center">${d.givenTime ?? ''}</td>
    <td>${d.drugName ?? ''}</td>
    <td style="text-align:center">${d.dose ?? ''}</td>
    <td style="text-align:center">${d.route ?? ''}</td>
  </tr>`).join('');
}

function fluidTableRows(fluids: FluidRow[]): string {
  if (!fluids.length) {
    return [1, 2].map((i) => `<tr><td style="text-align:center">${i}</td>${Array(4).fill('<td>&nbsp;</td>').join('')}</tr>`).join('');
  }
  return fluids.map((f, i) => `<tr>
    <td style="text-align:center">${i + 1}</td>
    <td>${f.fluidType ?? ''}</td>
    <td style="text-align:center">${f.volume ?? ''}</td>
    <td style="text-align:center">${f.startTime ?? ''}</td>
    <td style="text-align:center">${f.endTime ?? ''}</td>
  </tr>`).join('');
}

function sigBlock(names: string[]): string {
  return `<div class="sig">${names.map((n) => `<div><div class="name">${n}</div><div class="hint">(Ký, ghi rõ họ tên)</div><div class="space"></div></div>`).join('')}</div>`;
}

function headerHtml(formCode: string, formTitle: string): string {
  return `
    <div style="text-align:center;margin-bottom:16px">
      <div style="font-size:10pt;font-weight:bold">BỘ Y TẾ</div>
      <div style="font-size:12pt;font-weight:bold">${HOSPITAL_NAME}</div>
      <div style="font-size:9pt">${HOSPITAL_ADDRESS} — ĐT: ${HOSPITAL_PHONE}</div>
      <h2>${formTitle}</h2>
      <div style="font-size:9pt;font-style:italic">(Mẫu số: ${formCode})</div>
    </div>`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnesDto = Record<string, any>;

export function printAnesthesiaMonitor(record: AnesDto): void {
  const monitors = asMonitors(record.monitors);
  const drugs = asDrugs(record.drugs);
  const body = `
    ${headerHtml('GM-01', 'PHIẾU THEO DÕI GÂY MÊ')}
    <p><span class="label">Họ và tên:</span> ${record.patientName ?? ''} &nbsp;
       <span class="label">Phương pháp vô cảm:</span> ${record.anesthesiaType ?? ''}</p>
    <p><span class="label">Phân loại ASA:</span> ASA ${record.asaClass ?? ''} &nbsp;
       <span class="label">Mallampati:</span> Mallampati ${record.mallampatiScore ?? ''} &nbsp;
       <span class="label">Kế hoạch đường thở:</span> ${record.airwayPlan ?? ''}</p>
    <div class="section-title">I. THEO DÕI SINH TỒN TRONG MỔ</div>
    <table>
      <thead><tr>
        <th>Giờ</th><th>HA tâm thu (mmHg)</th><th>HA tâm trương (mmHg)</th>
        <th>Mạch (l/ph)</th><th>SpO2 (%)</th><th>EtCO2 (mmHg)</th>
        <th>Nhiệt độ (°C)</th><th>Ghi chú</th>
      </tr></thead>
      <tbody>${monitorTableRows(monitors)}</tbody>
    </table>
    <div class="section-title">II. THUỐC GÂY MÊ SỬ DỤNG</div>
    <table>
      <thead><tr><th>STT</th><th>Giờ dùng</th><th>Tên thuốc</th><th>Liều dùng</th><th>Đường dùng</th></tr></thead>
      <tbody>${drugTableRows(drugs)}</tbody>
    </table>
    ${sigBlock(['Bác sĩ gây mê', 'Trưởng khoa gây mê'])}
  `;
  openHtmlPrint('Phiếu theo dõi gây mê', body);
}

export function printAnesthesiaRecovery(record: AnesDto): void {
  const monitors = asMonitors(record.monitors);
  const body = `
    ${headerHtml('GM-02', 'PHIẾU THEO DÕI HỒI TỈNH SAU MỔ')}
    <p><span class="label">Họ và tên:</span> ${record.patientName ?? ''} &nbsp;
       <span class="label">Phương pháp vô cảm:</span> ${record.anesthesiaType ?? ''} &nbsp;
       <span class="label">Phân loại ASA:</span> ASA ${record.asaClass ?? ''}</p>
    <div class="section-title">I. THEO DÕI TẠI PHÒNG HỒI TỈNH</div>
    <table>
      <thead><tr>
        <th>Giờ ghi</th><th>HA (mmHg)</th><th>Mạch (l/ph)</th>
        <th>SpO2 (%)</th><th>Nhiệt độ (°C)</th><th>Ghi chú</th>
      </tr></thead>
      <tbody>${monitors.length > 0
        ? monitors.map((m) => `<tr>
          <td style="text-align:center">${m.monitorTime ?? ''}</td>
          <td style="text-align:center">${m.systolicBP && m.diastolicBP ? `${m.systolicBP}/${m.diastolicBP}` : (m.systolicBP ?? '')}</td>
          <td style="text-align:center">${m.heartRate ?? ''}</td>
          <td style="text-align:center">${m.spO2 ?? ''}</td>
          <td style="text-align:center">${m.temperature ?? ''}</td>
          <td>${m.notes ?? ''}</td>
        </tr>`).join('')
        : [1, 2, 3, 4].map(() => '<tr>' + Array(6).fill('<td>&nbsp;</td>').join('') + '</tr>').join('')
      }</tbody>
    </table>
    <div class="section-title">II. ĐIỂM ALDRETE VÀ DIỄN BIẾN HỒI TỈNH</div>
    <div class="notes-box">${record.recoveryNotes ?? ''}</div>
    <div class="section-title">III. KẾ HOẠCH CHUYỂN PHÒNG / CHẾ ĐỘ CHĂM SÓC SAU MỔ</div>
    <div class="notes-box">${record.postSurgeryPlan ?? ''}</div>
    ${sigBlock(['Điều dưỡng hồi tỉnh', 'Bác sĩ gây mê'])}
  `;
  openHtmlPrint('Phiếu hồi tỉnh sau mổ', body);
}

export function printAnesthesiaRecord(record: AnesDto): void {
  const drugs = asDrugs(record.drugs);
  const fluids = asFluids(record.fluids);
  const body = `
    ${headerHtml('GM-03', 'BIÊN BẢN GÂY MÊ – HỒI SỨC')}
    <p>
      <span class="label">Họ và tên:</span> ${record.patientName ?? ''} &nbsp;
      <span class="label">Ngày:</span> ${record.createdAt ? String(record.createdAt).slice(0, 10) : ''}
    </p>
    <p>
      <span class="label">Phương pháp vô cảm:</span> ${record.anesthesiaType ?? ''} &nbsp;
      <span class="label">Phân loại ASA:</span> ASA ${record.asaClass ?? ''} &nbsp;
      <span class="label">Mallampati:</span> Mallampati ${record.mallampatiScore ?? ''}
    </p>
    <p>
      <span class="label">Dị ứng:</span> ${record.allergies || 'Không'} &nbsp;
      <span class="label">Nhịn ăn (NPO):</span> ${record.npoStatus ?? ''}
    </p>
    <p><span class="label">Kế hoạch đường thở:</span> ${record.airwayPlan ?? ''}</p>
    <p><span class="label">Đánh giá tiền mê:</span> ${record.preOpAssessment ?? ''}</p>
    <p><span class="label">Khám tâm lý trước mổ:</span> ${record.psychologicalAssessment ?? ''}</p>
    <div class="section-title">I. DANH SÁCH THUỐC GÂY MÊ</div>
    <table>
      <thead><tr><th>STT</th><th>Giờ dùng</th><th>Tên thuốc</th><th>Liều dùng</th><th>Đường dùng</th></tr></thead>
      <tbody>${drugTableRows(drugs)}</tbody>
    </table>
    <div class="section-title">II. DỊCH TRUYỀN</div>
    <table>
      <thead><tr><th>STT</th><th>Loại dịch</th><th>Thể tích (ml)</th><th>Bắt đầu</th><th>Kết thúc</th></tr></thead>
      <tbody>${fluidTableRows(fluids)}</tbody>
    </table>
    <div class="section-title">III. TÓM TẮT DIỄN BIẾN GÂY MÊ</div>
    <div class="notes-box">${record.recoveryNotes ?? ''}</div>
    ${sigBlock(['Bác sĩ gây mê', 'Bác sĩ phẫu thuật', 'Trưởng khoa gây mê'])}
  `;
  openHtmlPrint('Biên bản gây mê – hồi sức', body);
}
