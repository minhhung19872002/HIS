/**
 * NangCap24 — EMR HL7 Export v2 (port từ mod-emr-hl7-export.jsx)
 *
 * Xuất HSBA → HL7 v2.5 archive: ADT/ORM/ORU/MDM/RDE theo TT 54/2017.
 * Layout: KPI + alert info + 2-column (Form | Result) + recent exports table.
 */
import React, { useState } from 'react';
import { Form, Input, Checkbox, Button } from 'antd';
import type { AxiosError } from 'axios';
import type { ServerValidationError } from '../utils/formError';
import {
  KpiStrip, DrawerShell, StatusBadge,
  tk, te, fmtDTg, fmtDMYg, fmtHMg,
} from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';
import { emrHl7Api } from '../api/nangcap24';
import type { Hl7ExportResponseDto } from '../api/nangcap24';

const SEGMENT_OPTIONS = [
  { k: 'services',      l: 'ORM^O01 · Service Orders',   desc: 'Chỉ định dịch vụ XN / CĐHA / phẫu thuật' },
  { k: 'prescriptions', l: 'RDE^O11 · Prescriptions',    desc: 'Kê đơn thuốc — outpatient & inpatient' },
  { k: 'lab',           l: 'ORU^R01 · Lab Results',      desc: 'Kết quả xét nghiệm có LOINC code' },
  { k: 'radiology',     l: 'ORU^R01 · Radiology',        desc: 'Đọc phim CĐHA + impression' },
];

const EmrHl7Export: React.FC = () => {
  const [recordId, setRecordId] = useState('');
  const [opts, setOpts] = useState({ services: true, prescriptions: true, lab: true, radiology: true });
  const [result, setResult] = useState<Hl7ExportResponseDto | null>(null);
  const [running, setRunning] = useState(false);
  const [preview, setPreview] = useState(false);

  const doExport = async () => {
    if (!recordId.trim()) { te('Cần nhập HSBA ID'); return; }
    setRunning(true);
    try {
      const r = await emrHl7Api.export({
        medicalRecordId: recordId,
        includeServices: opts.services,
        includePrescriptions: opts.prescriptions,
        includeLabResults: opts.lab,
        includeRadiologyReports: opts.radiology,
      });
      setResult(r);
      tk(`Đã tạo ${r.messageCount} HL7 message · ${(r.contentSizeBytes / 1024).toFixed(1)} KB`);
    } catch (e: unknown) {
      const ax = e as AxiosError<ServerValidationError>;
      te(ax?.response?.data?.message ?? 'Xuất HL7 thất bại');
    } finally { setRunning(false); }
  };

  const download = () => {
    if (!result) return;
    const blob = new Blob([result.hl7Content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = result.fileName; a.click();
    URL.revokeObjectURL(url);
    tk(`Đang tải ${result.fileName}`);
  };

  const kpis = result ? [
    { lbl: 'HSBA', val: result.medicalRecordCode, sub: 'đã xuất' },
    { lbl: 'HL7 message', val: result.messageCount, tone: 'ok' as const },
    { lbl: 'Dung lượng', val: `${(result.contentSizeBytes / 1024).toFixed(1)} KB`, sub: 'v2.5 archive' },
    { lbl: 'Tạo lúc', val: fmtHMg(result.generatedAt), sub: fmtDMYg(result.generatedAt) },
    { lbl: 'TT 54/2017', val: 'OK', tone: 'info' as const, sub: 'BYT compliant' },
  ] : [
    { lbl: 'HSBA', val: '—' },
    { lbl: 'HL7 message', val: 0 },
    { lbl: 'Dung lượng', val: '0 KB' },
    { lbl: 'Tạo lúc', val: '—' },
    { lbl: 'TT 54/2017', val: 'Chuẩn', tone: 'info' as const, sub: 'BYT compliant' },
  ];

  return (
    <div className="ab" data-testid="emr-hl7-export-page">
      <KpiStrip items={kpis} />

      <div style={{
        padding: '12px 14px', background: 'var(--s-info-soft)',
        borderTop: '1px solid var(--line)', borderBottom: '1px solid #bfdbfe',
        color: 'var(--a-cy-dim)', fontSize: 12.5,
      }}>
        <TermIcon name="info" size={13} /> <b>HL7 v2.5 Archive Export</b> — Xuất toàn bộ HSBA dưới dạng các message HL7 chuẩn lưu trữ:
        ADT^A04 (nhập viện), ORM^O01 (chỉ định DV), RDE^O11 (kê đơn),
        ORU^R01 (KQ CLS + đọc phim), MDM^T02 (giấy ra viện). Theo TT 54/2017/TT-BYT.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: 14 }}>
        {/* Form panel */}
        <div style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 8, padding: 18 }}>
          <h3 style={{
            margin: '0 0 14px', fontSize: 13, fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase', color: 'var(--t-2)', letterSpacing: '0.06em',
          }}>Tham số xuất HL7</h3>

          <Form layout="vertical">
            <Form.Item
              label={<span>HSBA ID hoặc Mã <span style={{ color: '#ef4444' }}>*</span></span>}
              extra="UUID 36-ký tự hoặc mã HSBA dạng HSBA-xxxx-xxxxx"
            >
              <Input
                data-testid="hl7-export-record-id"
                value={recordId}
                onChange={e => setRecordId(e.target.value)}
                placeholder="12345678-1234-… hoặc HSBA-1018-20100"
              />
            </Form.Item>

            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 12, color: 'var(--t-2)', marginBottom: 8, display: 'block' }}>Bao gồm các segment:</label>
              <div style={{ display: 'grid', gap: 6 }}>
                {SEGMENT_OPTIONS.map(o => {
                  const on = opts[o.k as keyof typeof opts];
                  return (
                    <label
                      key={o.k}
                      style={{
                        display: 'grid', gridTemplateColumns: '20px 1fr', gap: 8, padding: 8,
                        background: on ? 'var(--c-pri-bg)' : 'var(--d-1)',
                        borderRadius: 6, cursor: 'pointer',
                        border: on ? '1px solid var(--a-cy)' : '1px solid transparent',
                      }}
                    >
                      <Checkbox checked={on} onChange={e => setOpts(s => ({ ...s, [o.k]: e.target.checked }))} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 12.5, fontFamily: 'var(--font-mono)' }}>{o.l}</div>
                        <div style={{ fontSize: 11, color: 'var(--t-2)', marginTop: 2 }}>{o.desc}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <Button
              type="primary"
              data-testid="hl7-export-btn"
              loading={running}
              onClick={doExport}
              style={{ marginTop: 16, width: '100%', height: 38 }}
            >
              <TermIcon name="download" size={13} /> {running ? 'Đang xuất…' : 'Xuất HL7'}
            </Button>
          </Form>
        </div>

        {/* Result panel */}
        <div style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 8, padding: 18, minHeight: 360 }}>
          <h3 style={{
            margin: '0 0 14px', fontSize: 13, fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase', color: 'var(--t-2)', letterSpacing: '0.06em',
          }}>Kết quả</h3>
          {!result ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--t-3)' }}>
              <TermIcon name="folder" size={32} />
              <div style={{ marginTop: 8, fontSize: 13 }}>Nhập HSBA ID rồi bấm "Xuất HL7" để bắt đầu.</div>
            </div>
          ) : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--line-soft)' }}><td style={{ color: 'var(--t-2)', width: 130, padding: '6px 0' }}>Mã HSBA</td><td className="mono">{result.medicalRecordCode}</td></tr>
                  <tr style={{ borderBottom: '1px solid var(--line-soft)' }}><td style={{ color: 'var(--t-2)', padding: '6px 0' }}>Tên file</td><td className="mono" style={{ fontSize: 11 }}>{result.fileName}</td></tr>
                  <tr style={{ borderBottom: '1px solid var(--line-soft)' }}><td style={{ color: 'var(--t-2)', padding: '6px 0' }}>Số HL7 message</td><td className="mono" style={{ fontWeight: 700 }}>{result.messageCount}</td></tr>
                  <tr style={{ borderBottom: '1px solid var(--line-soft)' }}><td style={{ color: 'var(--t-2)', padding: '6px 0' }}>Dung lượng</td><td className="mono">{result.contentSizeBytes.toLocaleString('vi-VN')} bytes ({(result.contentSizeBytes / 1024).toFixed(1)} KB)</td></tr>
                  <tr style={{ borderBottom: '1px solid var(--line-soft)' }}><td style={{ color: 'var(--t-2)', padding: '6px 0' }}>Tạo lúc</td><td className="mono">{fmtDTg(result.generatedAt)}</td></tr>
                  <tr><td style={{ color: 'var(--t-2)', padding: '6px 0' }}>Trạng thái</td><td><StatusBadge tone="ok" dot>Hoàn tất</StatusBadge></td></tr>
                </tbody>
              </table>
              <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                <Button style={{ flex: 1 }} onClick={() => setPreview(true)} data-testid="hl7-preview-btn">
                  <TermIcon name="eye" size={12} /> Xem preview HL7
                </Button>
                <Button type="primary" style={{ flex: 1 }} onClick={download} data-testid="hl7-download-btn">
                  <TermIcon name="download" size={12} /> Tải xuống .hl7
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Preview drawer */}
      <DrawerShell
        open={preview && !!result}
        onClose={() => setPreview(false)}
        title={result ? `HL7 preview · ${result.fileName}` : ''}
        sub={result ? `${result.messageCount} message · ${(result.contentSizeBytes / 1024).toFixed(1)} KB` : undefined}
        size="xl"
        footer={(
          <>
            <Button onClick={() => setPreview(false)}>Đóng</Button>
            <Button type="primary" onClick={download}><TermIcon name="download" size={12} /> Tải xuống</Button>
          </>
        )}
      >
        {result && (
          <pre style={{
            background: '#0b1220', color: '#86efac', padding: 16, margin: 0,
            fontSize: 11, fontFamily: 'var(--font-mono)', lineHeight: 1.6,
            whiteSpace: 'pre-wrap', wordBreak: 'break-all', minHeight: 400,
          }}>
            {result.hl7Content}
          </pre>
        )}
      </DrawerShell>
    </div>
  );
};

export default EmrHl7Export;
