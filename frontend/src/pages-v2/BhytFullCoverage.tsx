import React, { useState, useCallback } from 'react';
import { App as AntdApp, DatePicker, Form, Input, Modal } from 'antd';
import dayjs from 'dayjs';
import {
  SimpleV2Page,
  StatusBadge,
  type ColumnDef,
  type KpiItem,
} from './_v2kit';
import {
  searchBhytFullCoverage,
  createBhytFullCoverage,
  updateBhytFullCoverage,
  deleteBhytFullCoverage,
  type BhytFullCoveragePatientDto,
  type CreateBhytFullCoverageDto,
} from '../api/bhytFullCoverage';

// ── helpers ──

const fmtDate = (iso: string) => dayjs(iso).format('DD/MM/YYYY');
const today = dayjs();

// ── Form modal (them / sua) ──

interface FormModalProps {
  open: boolean;
  initial?: BhytFullCoveragePatientDto | null;
  onClose: () => void;
  onSaved: () => void;
}

const FormModal: React.FC<FormModalProps> = ({ open, initial, onClose, onSaved }) => {
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm<{
    patientId: string;
    effectiveFrom: dayjs.Dayjs;
    effectiveTo: dayjs.Dayjs;
    medicineScopeJson: string;
    note: string;
  }>();
  const [saving, setSaving] = useState(false);

  const handleOpen = useCallback(() => {
    if (initial) {
      form.setFieldsValue({
        patientId: initial.patientId,
        effectiveFrom: dayjs(initial.effectiveFrom),
        effectiveTo: dayjs(initial.effectiveTo),
        medicineScopeJson: initial.medicineScopeJson ?? '',
        note: initial.note ?? '',
      });
    } else {
      form.resetFields();
    }
  }, [form, initial]);

  const handleSubmit = async () => {
    try {
      const vals = await form.validateFields();
      setSaving(true);
      const dto: CreateBhytFullCoverageDto = {
        patientId: vals.patientId,
        effectiveFrom: vals.effectiveFrom.format('YYYY-MM-DD'),
        effectiveTo: vals.effectiveTo.format('YYYY-MM-DD'),
        medicineScopeJson: vals.medicineScopeJson?.trim() || null,
        note: vals.note?.trim() || null,
      };
      if (initial?.id) {
        await updateBhytFullCoverage(initial.id, dto);
        message.success('Cap nhat thanh cong');
      } else {
        await createBhytFullCoverage(dto);
        message.success('Them moi thanh cong');
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return; // validation error
      message.warning('Luu that bai: ' + String((err as { message?: string }).message ?? err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={initial ? 'Sua khai bao BN full-coverage' : 'Them BN BHYT 100% thuoc dac tri'}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="Luu"
      cancelText="Huy"
      confirmLoading={saving}
      afterOpenChange={(vis) => { if (vis) handleOpen(); }}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" style={{ marginTop: 'var(--space-8)' }}>
        <Form.Item
          name="patientId"
          label="ID Benh nhan (GUID)"
          rules={[{ required: true, message: 'Bat buoc nhap PatientId' }]}
        >
          <Input placeholder="00000000-0000-0000-0000-000000000000" disabled={!!initial} />
        </Form.Item>
        <Form.Item
          name="effectiveFrom"
          label="Hieu luc tu ngay"
          rules={[{ required: true, message: 'Bat buoc chon ngay' }]}
        >
          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          name="effectiveTo"
          label="Hieu luc den ngay"
          rules={[{ required: true, message: 'Bat buoc chon ngay' }]}
        >
          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          name="medicineScopeJson"
          label='Pham vi thuoc (JSON array MedicineCode — de trong = tat ca thuoc dac tri)'
          extra='Vi du: ["ABC001","DEF002"]. De trong de ap dung cho tat ca.'
        >
          <Input.TextArea rows={2} placeholder='["ABC001","DEF002"]' />
        </Form.Item>
        <Form.Item name="note" label="Ghi chu">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

// ── Main page ──

const COLUMNS: ColumnDef<BhytFullCoveragePatientDto>[] = [
  { key: 'patientCode', label: 'Ma BN', render: (r) => r.patientCode },
  { key: 'patientName', label: 'Ho ten', render: (r) => r.patientName },
  { key: 'insuranceNumber', label: 'So the BHYT', render: (r) => r.insuranceNumber || '—' },
  {
    key: 'effectiveFrom',
    label: 'Hieu luc tu',
    render: (r) => fmtDate(r.effectiveFrom),
  },
  {
    key: 'effectiveTo',
    label: 'Hieu luc den',
    render: (r) => fmtDate(r.effectiveTo),
  },
  {
    key: 'isActive',
    label: 'Trang thai',
    render: (r) => {
      const expired = dayjs(r.effectiveTo).isBefore(today, 'day');
      if (!r.isActive || expired) return <StatusBadge tone="crit">Khong hieu luc</StatusBadge>;
      return <StatusBadge tone="ok">Dang hieu luc</StatusBadge>;
    },
  },
  {
    key: 'medicineScopeJson',
    label: 'Pham vi thuoc',
    render: (r) => r.medicineScopeJson ? r.medicineScopeJson : <span style={{ color: '#aaa' }}>Tat ca</span>,
  },
  { key: 'note', label: 'Ghi chu', render: (r) => r.note || '—' },
];

const BhytFullCoveragePage: React.FC = () => {
  const { message, modal } = AntdApp.useApp();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BhytFullCoveragePatientDto | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(async () => {
    const res = await searchBhytFullCoverage({ pageSize: 200 });
    return Array.isArray(res.data?.items) ? res.data.items : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadToken]);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  const kpis = useCallback((rows: BhytFullCoveragePatientDto[]): KpiItem[] => {
    const active = rows.filter(
      (r) => r.isActive && !dayjs(r.effectiveTo).isBefore(today, 'day'),
    );
    const expiring = active.filter((r) =>
      dayjs(r.effectiveTo).isBefore(today.add(30, 'day'), 'day'),
    );
    return [
      { lbl: 'Tong khai bao', val: rows.length },
      { lbl: 'Dang hieu luc', val: active.length, tone: 'ok' as const },
      { lbl: 'Sap het han (30 ngay)', val: expiring.length, tone: expiring.length > 0 ? 'warn' as const : undefined },
    ];
  }, []);

  const handleDelete = useCallback(async (row: BhytFullCoveragePatientDto) => {
    modal.confirm({
      title: 'Xac nhan xoa?',
      content: `Xoa khai bao full-coverage cho BN ${row.patientName}?`,
      okText: 'Xoa',
      okType: 'danger',
      cancelText: 'Huy',
      onOk: async () => {
        try {
          await deleteBhytFullCoverage(row.id);
          message.success('Da xoa');
          reload();
        } catch {
          message.warning('Xoa that bai');
        }
      },
    });
  }, [modal, message, reload]);

  const rowActions = useCallback(
    (row: BhytFullCoveragePatientDto, _reload: () => void) => (
      <>
        <button
          className="ab-btn ab-btn--ghost ab-btn--sm"
          onClick={(e) => { e.stopPropagation(); setEditing(row); setFormOpen(true); }}
          type="button"
        >
          Sua
        </button>
        <button
          className="ab-btn ab-btn--ghost ab-btn--sm ab-btn--danger"
          onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
          type="button"
        >
          Xoa
        </button>
      </>
    ),
    [handleDelete],
  );

  return (
    <>
      <SimpleV2Page<BhytFullCoveragePatientDto>
        title="BN BHYT 100% thuoc dac tri"
        load={load}
        rowKey={(r) => r.id}
        columns={COLUMNS}
        searchPlaceholder="Tim theo ten, ma BN, so the BHYT..."
        searchOf={(r) => `${r.patientCode} ${r.patientName} ${r.insuranceNumber}`}
        kpis={kpis}
        pageSize={16}
        rowActions={rowActions}
        headerActions={(_r) => (
          <button
            className="ab-btn ab-btn--primary ab-btn--sm"
            onClick={() => { setEditing(null); setFormOpen(true); }}
            type="button"
          >
            + Them BN
          </button>
        )}
        emptyMessage="Chua co khai bao nao"
      />
      <FormModal
        open={formOpen}
        initial={editing}
        onClose={() => setFormOpen(false)}
        onSaved={reload}
      />
    </>
  );
};

export default BhytFullCoveragePage;
