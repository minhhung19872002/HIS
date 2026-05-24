import React, { useState } from 'react';
import { Form, Input, Button, Checkbox, message, Alert, Spin } from 'antd';
import {
  KpiStrip, DrawerShell, tk, te, fmtDTg
} from './_v2kit';
import { emrHl7Api } from '../api/nangcap24';
import type { Hl7ExportResponseDto } from '../api/nangcap24';

const EmrHl7Export: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Hl7ExportResponseDto | null>(null);
  const [preview, setPreview] = useState(false);

  const handleExport = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const r = await emrHl7Api.export({
        medicalRecordId: values.medicalRecordId,
        includeServices: values.includeServices,
        includePrescriptions: values.includePrescriptions,
        includeLabResults: values.includeLabResults,
        includeRadiologyReports: values.includeRadiologyReports,
      });
      setResult(r);
      tk(`Đã tạo ${r.messageCount} HL7 message (${(r.contentSizeBytes / 1024).toFixed(1)} KB)`);
    } catch (e: any) {
      te(e?.response?.data?.message || 'Xuất HL7 thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!result) return;
    const blob = new Blob([result.hl7Content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.fileName;
    a.click();
    URL.revokeObjectURL(url);
    message.success(`Đã tải xuống ${result.fileName}`);
  };

  const kpis = result ? [
    { lbl: 'Mã HSBA', val: result.medicalRecordCode },
    { lbl: 'Số HL7 message', val: result.messageCount, tone: 'ok' as const },
    { lbl: 'Dung lượng', val: `${(result.contentSizeBytes / 1024).toFixed(1)} KB` },
    { lbl: 'Tạo lúc', val: fmtDTg(result.generatedAt) },
  ] : [
    { lbl: 'Mã HSBA', val: '-' },
    { lbl: 'Số HL7 message', val: 0 },
    { lbl: 'Dung lượng', val: '0 KB' },
    { lbl: 'Tạo lúc', val: '-' },
  ];

  return (
    <div className="ab-stack">
      <KpiStrip items={kpis} />

      <Alert
        type="info"
        showIcon
        message="HL7 v2.5 Archive Export"
        description="Xuất toàn bộ HSBA (Admission ADT^A04, Service Orders ORM^O01, Pharmacy RDE^O11, Lab Results ORU^R01, Radiology ORU^R01, Discharge MDM^T02) thành 1 file HL7 chuẩn lưu trữ. Theo TT 54/2017."
      />

      <div className="panel">
        <div className="panel-h">Tham số xuất HL7</div>
        <div className="panel-body">
          <Form form={form} layout="vertical" initialValues={{
            includeServices: true, includePrescriptions: true,
            includeLabResults: true, includeRadiologyReports: true
          }}>
            <Form.Item name="medicalRecordId" label="HSBA ID (UUID)" rules={[{ required: true, message: 'Bắt buộc' }]}>
              <Input placeholder="VD: 12345678-1234-1234-1234-123456789012" data-testid="hl7-export-record-id" />
            </Form.Item>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <Form.Item name="includeServices" valuePropName="checked"><Checkbox>Bao gồm Service Orders (ORM^O01)</Checkbox></Form.Item>
              <Form.Item name="includePrescriptions" valuePropName="checked"><Checkbox>Bao gồm Prescriptions (RDE^O11)</Checkbox></Form.Item>
              <Form.Item name="includeLabResults" valuePropName="checked"><Checkbox>Bao gồm Lab Results (ORU^R01)</Checkbox></Form.Item>
              <Form.Item name="includeRadiologyReports" valuePropName="checked"><Checkbox>Bao gồm Radiology (ORU^R01)</Checkbox></Form.Item>
            </div>
            <Button type="primary" onClick={handleExport} loading={loading} data-testid="hl7-export-btn">
              Xuất HL7
            </Button>
          </Form>
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>}

      {result && (
        <div className="panel">
          <div className="panel-h">
            Kết quả xuất
            <span style={{ float: 'right' }}>
              <Button onClick={() => setPreview(true)}>Xem preview</Button>{' '}
              <Button type="primary" onClick={handleDownload} data-testid="hl7-download-btn">Tải xuống .hl7</Button>
            </span>
          </div>
          <div className="panel-body">
            <table className="tbl">
              <tbody>
                <tr><th>HSBA Code</th><td className="mono">{result.medicalRecordCode}</td></tr>
                <tr><th>File name</th><td className="mono">{result.fileName}</td></tr>
                <tr><th>Số HL7 message</th><td className="mono">{result.messageCount}</td></tr>
                <tr><th>Dung lượng</th><td className="mono">{result.contentSizeBytes.toLocaleString('vi-VN')} bytes</td></tr>
                <tr><th>Tạo lúc</th><td>{fmtDTg(result.generatedAt)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <DrawerShell open={preview} onClose={() => setPreview(false)} title={`HL7 preview: ${result?.fileName ?? ''}`}>
        {result && (
          <pre style={{
            background: '#0b1220',
            color: '#e2e8f0',
            padding: 16,
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}>
            {result.hl7Content}
          </pre>
        )}
      </DrawerShell>
    </div>
  );
};

export default EmrHl7Export;
