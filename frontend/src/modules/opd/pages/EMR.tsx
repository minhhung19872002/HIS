import React, { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp, Modal, Form, Input, Select, Table, Button, Tag, Popconfirm } from 'antd';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../services/apiClient';
import { getEmrRecords } from '../api/examination';
import type { EmrRecordDto } from '../api/examination';
import { SimpleV2Page, ActBtn, Btn, type ColumnDef } from '../../../pages-v2/_v2kit';
import TermIcon from '../../../layouts/terminal/Icon';
import * as pdf from '../../../api/pdf';

// ── Mẫu HSBA (ClinicalTemplate) ─────────────────────────────────────────────
interface ClinicalTemplateDto {
  id: string;
  templateCode: string;
  templateName: string;
  templateType: number;
  templateTypeName: string;
  icdCode?: string;
  departmentName?: string;
  isPublic: boolean;
  usageCount: number;
  isActive: boolean;
  content: string;
  createdAt: string;
}

const TEMPLATE_TYPES = [
  { value: 1, label: 'Khám ngoại trú (OPD)' },
  { value: 2, label: 'Tường trình PTTT' },
  { value: 3, label: 'Phiếu chăm sóc ĐD' },
  { value: 4, label: 'Tờ điều trị nội trú' },
  { value: 5, label: 'Tổng kết bệnh án' },
  { value: 99, label: 'Khác' },
];

const ClinicalTemplateManager: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [templates, setTemplates] = useState<ClinicalTemplateDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<ClinicalTemplateDto | null>(null);
  const [form] = Form.useForm();
  const [fType, setFType] = useState<number | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { onlyActive: false, pageSize: 200 };
      if (fType != null) params.templateType = fType;
      const r = await apiClient.get<ClinicalTemplateDto[]>('/clinical-template', { params });
      setTemplates(Array.isArray(r.data) ? r.data : []);
    } catch { setTemplates([]); }
    finally { setLoading(false); }
  }, [fType]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const openEdit = (t?: ClinicalTemplateDto) => {
    setEditing(t ?? null);
    form.resetFields();
    if (t) form.setFieldsValue({ ...t, isPublic: t.isPublic ? 'true' : 'false' });
    setEditOpen(true);
  };

  const handleSave = async () => {
    try {
      const v = await form.validateFields();
      const payload = { ...v, isPublic: v.isPublic === 'true', id: editing?.id };
      await apiClient.post('/clinical-template', payload);
      setEditOpen(false); load();
    } catch { /* form errors */ }
  };

  const handleDelete = async (id: string) => {
    await apiClient.delete(`/clinical-template/${id}`);
    load();
  };

  const cols = [
    { title: 'Tên mẫu', dataIndex: 'templateName', render: (v: string) => <b>{v}</b> },
    { title: 'Loại', dataIndex: 'templateType', width: 180, render: (_: number, r: ClinicalTemplateDto) => <Tag color="blue">{r.templateTypeName || 'Khác'}</Tag> },
    { title: 'ICD', dataIndex: 'icdCode', width: 90 },
    { title: 'Công khai', dataIndex: 'isPublic', width: 90, render: (v: boolean) => v ? <Tag color="green">Có</Tag> : <Tag>Riêng</Tag> },
    { title: 'SL dùng', dataIndex: 'usageCount', width: 80 },
    {
      title: '', width: 120,
      render: (_: unknown, r: ClinicalTemplateDto) => (
        <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
          <Button size="small" onClick={() => openEdit(r)}>Sửa</Button>
          <Popconfirm title="Xóa mẫu này?" onConfirm={() => handleDelete(r.id)} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
            <Button size="small" danger>Xóa</Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      title="Quản lý mẫu HSBA / tường trình PTTT"
      width={920}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      <div style={{ display: 'flex', gap: 'var(--space-8)', marginBottom: 'var(--space-12)', alignItems: 'center' }}>
        <Select
          allowClear placeholder="Lọc theo loại" style={{ width: 220 }}
          options={TEMPLATE_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          value={fType}
          onChange={setFType}
        />
        <Button type="primary" onClick={() => openEdit()}>+ Thêm mẫu mới</Button>
        <Button onClick={load}>Tải lại</Button>
      </div>
      <Table
        dataSource={templates}
        columns={cols}
        rowKey="id"
        size="small"
        loading={loading}
        pagination={{ pageSize: 15, hideOnSinglePage: true }}
        scroll={{ y: 400 }}
      />

      {/* Edit modal */}
      <Modal
        open={editOpen}
        title={editing ? 'Sửa mẫu HSBA' : 'Thêm mẫu HSBA mới'}
        onCancel={() => setEditOpen(false)}
        onOk={handleSave}
        okText="Lưu"
        cancelText="Hủy"
        destroyOnHidden
        width={700}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 'var(--space-8)' }}>
          <Form.Item name="templateName" label="Tên mẫu" rules={[{ required: true }]}>
            <Input placeholder="VD: Mẫu HSBA ngoại trú nội khoa" />
          </Form.Item>
          <Form.Item name="templateType" label="Loại mẫu" rules={[{ required: true }]}>
            <Select options={TEMPLATE_TYPES.map((t) => ({ value: t.value, label: t.label }))} />
          </Form.Item>
          <Form.Item name="icdCode" label="ICD (nếu chuyên biệt)">
            <Input placeholder="VD: J18.9 (tùy chọn)" />
          </Form.Item>
          <Form.Item name="isPublic" label="Phạm vi">
            <Select options={[{ value: 'true', label: 'Công khai (tất cả BS)' }, { value: 'false', label: 'Cá nhân' }]} />
          </Form.Item>
          <Form.Item name="content" label="Nội dung mẫu" rules={[{ required: true }]}>
            <Input.TextArea rows={8} placeholder="Nhập nội dung / shortcode mẫu..." />
          </Form.Item>
        </Form>
      </Modal>
    </Modal>
  );
};

/* ────────────────────────────────────────────────────────────
   HSBA điện tử v2 — record-centric (theo mock EMR v2):
   danh sách theo BỆNH NHÂN với bệnh nền + dị ứng + lượt khám + lần cuối.
   Nguồn: GET /examination/emr-records (gộp server-side + chronic/allergy).
   ──────────────────────────────────────────────────────────── */

const fmtDMY = (iso?: string) => (iso ? dayjs(iso).format('DD/MM/YYYY') : '—');
const genderLabel = (g: number) => (g === 1 ? 'Nam' : g === 2 ? 'Nữ' : '—');

const EMRV2: React.FC = () => {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const [templateMgrOpen, setTemplateMgrOpen] = useState(false);

  const columns: ColumnDef<EmrRecordDto>[] = [
    { key: 'code', label: 'Mã BN', mono: true, code: true, width: 150, render: (r) => r.patientCode },
    {
      key: 'name', label: 'Họ tên',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.patientName}</b>
          <i>{genderLabel(r.gender)}{r.age != null ? ` · ${r.age}t` : ''}</i>
        </div>
      ),
    },
    {
      key: 'bhyt', label: 'BHYT', mono: true, width: 130,
      render: (r) => r.insuranceNumber ? <span style={{ fontSize: 'var(--fs-xs)' }}>{r.insuranceNumber}</span> : <span style={{ color: 'var(--t-3)' }}>—</span>,
    },
    {
      key: 'chronic', label: 'Bệnh nền',
      render: (r) => (r.chronicDiseases?.length ? (
        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          {r.chronicDiseases.slice(0, 2).map((c) => <span key={c} className="chip info" style={{ fontSize: 'var(--fs-xxs)' }}>{c}</span>)}
          {r.chronicDiseases.length > 2 && <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>+{r.chronicDiseases.length - 2}</span>}
        </div>
      ) : <span style={{ color: 'var(--t-3)' }}>—</span>),
    },
    {
      key: 'allergies', label: 'Dị ứng',
      render: (r) => (r.allergies?.length
        ? <span className="chip crit" style={{ fontSize: 'var(--fs-xxs)' }}>⚠ {r.allergies.join(', ')}</span>
        : <span style={{ color: 'var(--t-3)' }}>—</span>),
    },
    { key: 'visits', label: 'Lượt KB', mono: true, width: 90, render: (r) => r.visitCount },
    { key: 'last', label: 'Lần cuối', mono: true, width: 110, render: (r) => fmtDMY(r.lastVisit) },
  ];

  return (
    <>
    <SimpleV2Page<EmrRecordDto>
      title="Hồ sơ bệnh án điện tử"
      load={async () => {
        try {
          const r = await getEmrRecords(undefined, 1, 300);
          return r.data?.items || [];
        } catch {
          return [];
        }
      }}
      rowKey={(r) => r.patientId}
      columns={columns}
      searchPlaceholder="Tìm BN / mã / chẩn đoán…"
      searchOf={(r) => `${r.patientName} ${r.patientCode} ${r.lastDiagnosisName || ''} ${(r.chronicDiseases || []).join(' ')}`}
      kpis={(rows) => {
        const today = dayjs().startOf('day');
        const todayUpdated = rows.filter((r) => dayjs(r.lastVisit).isSame(today, 'day')).length;
        const chronic = rows.filter((r) => r.chronicDiseases?.length).length;
        const allergic = rows.filter((r) => r.allergies?.length).length;
        const totalVisits = rows.reduce((s, r) => s + r.visitCount, 0);
        const avgVisits = rows.length > 0 ? Math.round(totalVisits / rows.length * 10) / 10 : 0;
        return [
          { lbl: 'Tổng hồ sơ', val: rows.length, sub: 'đang theo dõi' },
          { lbl: 'Cập nhật hôm nay', val: todayUpdated, sub: 'có lượt khám', tone: 'info' },
          { lbl: 'Bệnh mạn tính', val: chronic, sub: rows.length ? `${Math.round(chronic / rows.length * 100)}% BN` : '—', tone: 'warn' },
          { lbl: 'Có dị ứng', val: allergic, sub: 'cần lưu ý', tone: 'warn' },
          { lbl: 'Lượt KB / BN', val: avgVisits, sub: 'trung bình' },
          { lbl: 'Tổng lượt khám', val: totalVisits, sub: '365 ngày' },
        ];
      }}
      rowActions={(r) => (
        <div className="ab-actions">
          <ActBtn ic="eye" title="Mở hồ sơ" onClick={() => navigate('/v2/emr/edit')} />
          <ActBtn ic="print" title="In hồ sơ" onClick={() => {
            if (r.medicalRecordId) {
              pdf.printMedicalRecord(r.medicalRecordId);
            } else {
              message.warning(`Để in HS của ${r.patientName}: mở hồ sơ chi tiết rồi bấm In`);
            }
          }} />
        </div>
      )}
      drawer={(r) => (
        <div style={{ padding: 'var(--space-18)' }}>
          <div className="rec-section">
            <h5><TermIcon name="user" size={11} /> BỆNH NHÂN</h5>
            <div className="rec-kv">
              <span>Họ tên</span><b>{r.patientName}</b>
              <span>Mã BN</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.patientCode}</span>
              <span>Giới · Tuổi</span><span>{genderLabel(r.gender)}{r.age != null ? ` · ${r.age}t` : ''}</span>
              <span>BHYT</span><span className="mono">{r.insuranceNumber || '—'}</span>
            </div>
          </div>
          <div className="rec-section">
            <h5><TermIcon name="heart" size={11} /> BỆNH NỀN · DỊ ỨNG</h5>
            <div style={{ marginBottom: 'var(--space-8)' }}>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-4)' }}>Bệnh nền</div>
              {r.chronicDiseases?.length ? (
                <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                  {r.chronicDiseases.map((c) => <span key={c} className="chip info">{c}</span>)}
                </div>
              ) : <span style={{ color: 'var(--t-3)', fontSize: 'var(--fs-sm)' }}>Không ghi nhận</span>}
            </div>
            <div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-4)' }}>Dị ứng</div>
              {r.allergies?.length ? (
                <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                  {r.allergies.map((a) => <span key={a} className="chip crit">⚠ {a}</span>)}
                </div>
              ) : <span style={{ color: 'var(--t-3)', fontSize: 'var(--fs-sm)' }}>Không ghi nhận</span>}
            </div>
          </div>
          <div className="rec-section">
            <h5><TermIcon name="stethoscope" size={11} /> LƯỢT KHÁM GẦN NHẤT</h5>
            <div className="rec-kv">
              <span>Lượt khám</span><b>{r.visitCount}</b>
              <span>Lần cuối</span><span className="mono">{fmtDMY(r.lastVisit)}</span>
              <span>Phòng</span><span>{r.lastRoomName || '—'}</span>
              <span>Chẩn đoán</span><span>{r.lastDiagnosisName || '—'}{r.lastDiagnosisCode ? ` (${r.lastDiagnosisCode})` : ''}</span>
            </div>
          </div>
          <div className="rec-section">
            <h5><TermIcon name="info" size={11} /> THAO TÁC</h5>
            <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
              <Btn variant="primary" onClick={() => navigate('/v2/emr/edit')}>
                <TermIcon name="eye" size={12} /> Mở HS chi tiết
              </Btn>
              <Btn onClick={() => {
                if (r.medicalRecordId) {
                  pdf.printMedicalRecord(r.medicalRecordId);
                } else {
                  message.warning('Chưa có mã hồ sơ bệnh án — mở hồ sơ chi tiết để in');
                }
              }}>
                <TermIcon name="print" size={12} /> In hồ sơ
              </Btn>
              <Btn onClick={() => navigate('/v2/signing-workflow')}>
                <TermIcon name="check" size={12} /> Ký số
              </Btn>
            </div>
          </div>
        </div>
      )}
      drawerTitle={(r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-10)' }}>
          <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 'var(--fs-md)' }}>{r.patientCode}</span>
          <span style={{ fontSize: 14 }}>{r.patientName}</span>
        </span>
      )}
      drawerSub={(r) => `${r.visitCount} lượt khám · lần cuối ${fmtDMY(r.lastVisit)}`}
      toolbarRight={
        <Btn onClick={() => setTemplateMgrOpen(true)}>
          <TermIcon name="file-text" size={12} /> Mẫu HSBA
        </Btn>
      }
    />
    <ClinicalTemplateManager open={templateMgrOpen} onClose={() => setTemplateMgrOpen(false)} />
    </>
  );
};

export default EMRV2;
