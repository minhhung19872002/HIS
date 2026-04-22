/**
 * Sổ hội chẩn + trích biên bản — N1.20.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Card, Table, Button, Space, DatePicker, Select, Input, Tag, message, Drawer, Descriptions,
  Typography, Divider,
} from 'antd';
import { ReloadOutlined, PrinterOutlined, EyeOutlined, BookOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import apiClient from '../api/client';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

interface RegisterEntry {
  id: string; consultationDate: string; consultationType: number; consultationTypeName: string;
  reason?: string; summary?: string; conclusion?: string; treatmentPlan?: string;
  presidedBy?: string; secretary?: string; participants?: string;
  patientCode: string; patientName: string; departmentName?: string;
  examinationId: string;
}

interface Detail {
  id: string; consultationDate: string; consultationType: number; consultationTypeName: string;
  reason?: string; summary?: string; conclusion?: string; treatmentPlan?: string;
  presidedBy?: string; secretary?: string; participants?: string[] | null;
  patient: { code: string; name: string; gender: number; dateOfBirth?: string; address?: string; insuranceNumber?: string };
  examination: { examinationId: string; medicalRecordCode?: string; departmentName?: string; mainDiagnosis?: string; mainIcdCode?: string };
}

const TYPE_OPTIONS = [
  { label: 'Hội chẩn khoa', value: 1 },
  { label: 'Hội chẩn liên khoa', value: 2 },
  { label: 'Hội chẩn bệnh viện', value: 3 },
];

export default function ConsultationRegister() {
  const [data, setData] = useState<RegisterEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<[any, any] | null>([dayjs().subtract(30, 'day'), dayjs()]);
  const [filterType, setFilterType] = useState<number | undefined>();
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<Detail | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (range?.[0]) params.fromDate = range[0].toISOString();
      if (range?.[1]) params.toDate = range[1].toISOString();
      if (filterType) params.consultationType = filterType;
      if (keyword) params.keyword = keyword;
      const { data } = await apiClient.get<RegisterEntry[]>('/consultation-register', { params });
      setData(data || []);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Tải sổ thất bại');
    } finally { setLoading(false); }
  }, [range, filterType, keyword]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (row: RegisterEntry) => {
    try {
      const { data } = await apiClient.get<Detail>(`/consultation-register/${row.id}`);
      setDetail(data);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Tải chi tiết thất bại');
    }
  };

  const printMinutes = () => {
    if (!detail) return;
    const w = window.open('', '_blank');
    if (!w) return;
    const list = Array.isArray(detail.participants) ? detail.participants.map(p => `<li>${p}</li>`).join('') : '';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>BBHC</title>
      <style>
        body { font-family: "Times New Roman", serif; padding: 32px; font-size: 13.5pt; }
        h1 { text-align: center; font-size: 18pt; margin: 20px 0 6px; }
        .subtitle { text-align: center; font-style: italic; margin-bottom: 24px; }
        .row { margin: 4px 0; }
        .section { margin: 16px 0; }
        .section-title { font-weight: bold; margin-top: 12px; }
        .sig { display: flex; justify-content: space-around; margin-top: 40px; }
        .sig > div { text-align: center; width: 30%; }
        ul { margin: 4px 0 4px 16px; padding: 0; }
      </style></head><body>
      <div style="text-align:center">
        <div>BỘ Y TẾ</div>
        <div style="font-weight:bold">BỆNH VIỆN</div>
        <div style="margin-top:6px">Mẫu số: MS. 03/BV</div>
      </div>
      <h1>BIÊN BẢN HỘI CHẨN</h1>
      <div class="subtitle">(${detail.consultationTypeName})</div>
      <div class="row"><b>Thời gian hội chẩn:</b> ${dayjs(detail.consultationDate).format('HH:mm DD/MM/YYYY')}</div>
      <div class="row"><b>Địa điểm:</b> ${detail.examination.departmentName ?? '-'}</div>
      <div class="row"><b>Họ tên BN:</b> ${detail.patient.name} — <b>Mã BN:</b> ${detail.patient.code}</div>
      <div class="row"><b>Giới tính:</b> ${detail.patient.gender === 1 ? 'Nam' : detail.patient.gender === 2 ? 'Nữ' : '-'} — <b>Ngày sinh:</b> ${detail.patient.dateOfBirth ? dayjs(detail.patient.dateOfBirth).format('DD/MM/YYYY') : '-'}</div>
      <div class="row"><b>Địa chỉ:</b> ${detail.patient.address ?? ''}</div>
      <div class="row"><b>Số thẻ BHYT:</b> ${detail.patient.insuranceNumber ?? ''}</div>
      <div class="row"><b>HSBA:</b> ${detail.examination.medicalRecordCode ?? ''} — <b>Chẩn đoán:</b> ${detail.examination.mainDiagnosis ?? ''} ${detail.examination.mainIcdCode ? `(${detail.examination.mainIcdCode})` : ''}</div>

      <div class="section">
        <div class="section-title">Thành phần tham dự:</div>
        <div>Chủ trì: ${detail.presidedBy ?? '________________'}</div>
        <div>Thư ký: ${detail.secretary ?? '________________'}</div>
        ${list ? `<div>Thành viên:</div><ul>${list}</ul>` : ''}
      </div>

      <div class="section">
        <div class="section-title">I. LÝ DO HỘI CHẨN</div>
        <div>${(detail.reason ?? '').replace(/\n/g, '<br/>') || '...'}</div>
      </div>
      <div class="section">
        <div class="section-title">II. TÓM TẮT BỆNH ÁN</div>
        <div>${(detail.summary ?? '').replace(/\n/g, '<br/>') || '...'}</div>
      </div>
      <div class="section">
        <div class="section-title">III. KẾT LUẬN HỘI CHẨN</div>
        <div>${(detail.conclusion ?? '').replace(/\n/g, '<br/>') || '...'}</div>
      </div>
      <div class="section">
        <div class="section-title">IV. HƯỚNG ĐIỀU TRỊ / CHẾ ĐỘ TIẾP THEO</div>
        <div>${(detail.treatmentPlan ?? '').replace(/\n/g, '<br/>') || '...'}</div>
      </div>

      <div class="sig">
        <div><b>THƯ KÝ</b><br/><br/><br/>${detail.secretary ?? ''}</div>
        <div><b>CHỦ TRÌ HỘI CHẨN</b><br/><br/><br/>${detail.presidedBy ?? ''}</div>
      </div>
      </body></html>`;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div>
      <Card title={<Space><BookOutlined /> Sổ hội chẩn + trích biên bản (N1.20)</Space>}>
        <Space wrap style={{ marginBottom: 16 }}>
          <RangePicker format="DD/MM/YYYY" value={range as any} onChange={v => setRange(v as any)} />
          <Select placeholder="Loại hội chẩn" allowClear style={{ width: 200 }}
            value={filterType} onChange={setFilterType} options={TYPE_OPTIONS} />
          <Input.Search placeholder="Tên BN / mã BN / lý do / kết luận..." style={{ width: 320 }}
            value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={load} allowClear />
          <Button icon={<ReloadOutlined />} onClick={load}>Tra cứu</Button>
        </Space>

        <Table
          size="small"
          rowKey="id"
          dataSource={data}
          loading={loading}
          pagination={{ pageSize: 20 }}
          columns={[
            { title: 'Ngày', dataIndex: 'consultationDate', width: 140,
              render: (v: string) => dayjs(v).format('DD/MM HH:mm') },
            { title: 'Loại', dataIndex: 'consultationTypeName', width: 160,
              render: (v: string, r: RegisterEntry) => <Tag color={r.consultationType === 3 ? 'red' : r.consultationType === 2 ? 'orange' : 'blue'}>{v}</Tag> },
            { title: 'Mã BN', dataIndex: 'patientCode', width: 120 },
            { title: 'Họ tên', dataIndex: 'patientName' },
            { title: 'Khoa', dataIndex: 'departmentName' },
            { title: 'Lý do', dataIndex: 'reason', ellipsis: true },
            { title: 'Chủ trì', dataIndex: 'presidedBy', width: 160 },
            { title: 'Thao tác', width: 160,
              render: (_: any, r: RegisterEntry) => <Space size="small">
                <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)}>Xem</Button>
                <Button size="small" icon={<PrinterOutlined />} type="primary" onClick={async () => {
                  await openDetail(r);
                  setTimeout(() => printMinutes(), 250);
                }}>In BBHC</Button>
              </Space> },
          ]}
        />
      </Card>

      {/* Detail drawer */}
      <Drawer open={!!detail} title={detail ? `Biên bản hội chẩn - ${dayjs(detail.consultationDate).format('DD/MM/YYYY HH:mm')}` : ''}
        onClose={() => setDetail(null)} size="large"
        extra={detail && <Button type="primary" icon={<PrinterOutlined />} onClick={printMinutes}>In BBHC</Button>}>
        {detail && (
          <>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="Loại hội chẩn" span={2}>
                <Tag color="blue">{detail.consultationTypeName}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Họ tên BN">{detail.patient.name}</Descriptions.Item>
              <Descriptions.Item label="Mã BN">{detail.patient.code}</Descriptions.Item>
              <Descriptions.Item label="Giới tính">{detail.patient.gender === 1 ? 'Nam' : detail.patient.gender === 2 ? 'Nữ' : '-'}</Descriptions.Item>
              <Descriptions.Item label="Ngày sinh">{detail.patient.dateOfBirth ? dayjs(detail.patient.dateOfBirth).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
              <Descriptions.Item label="Số thẻ BHYT" span={2}>{detail.patient.insuranceNumber || '-'}</Descriptions.Item>
              <Descriptions.Item label="Địa chỉ" span={2}>{detail.patient.address || '-'}</Descriptions.Item>
              <Descriptions.Item label="Mã HSBA">{detail.examination.medicalRecordCode || '-'}</Descriptions.Item>
              <Descriptions.Item label="Khoa">{detail.examination.departmentName || '-'}</Descriptions.Item>
              <Descriptions.Item label="Chẩn đoán chính" span={2}>{detail.examination.mainDiagnosis} {detail.examination.mainIcdCode ? `(${detail.examination.mainIcdCode})` : ''}</Descriptions.Item>
              <Descriptions.Item label="Chủ trì">{detail.presidedBy || '-'}</Descriptions.Item>
              <Descriptions.Item label="Thư ký">{detail.secretary || '-'}</Descriptions.Item>
              {detail.participants && Array.isArray(detail.participants) && (
                <Descriptions.Item label="Tham dự" span={2}>
                  {detail.participants.map((p, i) => <Tag key={i}>{p}</Tag>)}
                </Descriptions.Item>
              )}
            </Descriptions>
            <Divider>I. Lý do hội chẩn</Divider>
            <Text>{detail.reason || '-'}</Text>
            <Divider>II. Tóm tắt bệnh án</Divider>
            <Text style={{ whiteSpace: 'pre-wrap' }}>{detail.summary || '-'}</Text>
            <Divider>III. Kết luận</Divider>
            <Text strong style={{ whiteSpace: 'pre-wrap' }}>{detail.conclusion || '-'}</Text>
            <Divider>IV. Hướng điều trị</Divider>
            <Text style={{ whiteSpace: 'pre-wrap' }}>{detail.treatmentPlan || '-'}</Text>
          </>
        )}
      </Drawer>
    </div>
  );
}
