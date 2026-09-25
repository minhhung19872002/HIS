import React, { useState, useCallback } from 'react';
import { App as AntdApp, DatePicker, Form, Input, Modal } from 'antd';
import dayjs from 'dayjs';
import {
  SimpleV2Page,
  StatusBadge,
  type ColumnDef,
  type KpiItem,
} from '@/_v2kit';
import { friendlyErrorMessage } from '@/utils/friendlyError';
import {
  searchBhytFullCoverage,
  createBhytFullCoverage,
  updateBhytFullCoverage,
  deleteBhytFullCoverage,
  type BhytFullCoveragePatientDto,
  type CreateBhytFullCoverageDto,
} from '../api/bhytFullCoverage';
import PatientSearchPicker from '../../patient/components/PatientSearchPicker';

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
        message.success('Cập nhật thành công');
      } else {
        await createBhytFullCoverage(dto);
        message.success('Thêm mới thành công');
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return; // validation error
      message.warning(friendlyErrorMessage(err, 'Lưu thất bại. Vui lòng thử lại.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={initial ? 'Sửa khai báo BN full-coverage' : 'Thêm BN BHYT 100% thuốc đặc trị'}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="Lưu"
      cancelText="Hủy"
      confirmLoading={saving}
      afterOpenChange={(vis) => { if (vis) handleOpen(); }}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" style={{ marginTop: 'var(--space-8)' }}>
        <Form.Item
          name="patientId"
          label="Bệnh nhân"
          rules={[{ required: true, message: 'Chọn bệnh nhân' }]}
        >
          {/* QA-R11: was a raw GUID text box — nobody at the counter knows a patient's GUID */}
          <PatientSearchPicker
            disabled={!!initial}
            seedLabel={initial ? `${initial.patientCode} — ${initial.patientName}` : undefined}
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item
          name="effectiveFrom"
          label="Hiệu lực từ ngày"
          rules={[{ required: true, message: 'Bắt buộc chọn ngày' }]}
        >
          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          name="effectiveTo"
          label="Hiệu lực đến ngày"
          rules={[{ required: true, message: 'Bắt buộc chọn ngày' }]}
        >
          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          name="medicineScopeJson"
          label='Phạm vi thuốc (mảng JSON mã thuốc — để trống = tất cả thuốc đặc trị)'
          extra='Ví dụ: ["ABC001","DEF002"]. Để trống để áp dụng cho tất cả.'
        >
          <Input.TextArea rows={2} placeholder='["ABC001","DEF002"]' />
        </Form.Item>
        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

// ── Main page ──

const COLUMNS: ColumnDef<BhytFullCoveragePatientDto>[] = [
  { key: 'patientCode', label: 'Mã BN', render: (r) => r.patientCode },
  { key: 'patientName', label: 'Họ tên', render: (r) => r.patientName },
  { key: 'insuranceNumber', label: 'Số thẻ BHYT', render: (r) => r.insuranceNumber || '—' },
  {
    key: 'effectiveFrom',
    label: 'Hiệu lực từ',
    render: (r) => fmtDate(r.effectiveFrom),
  },
  {
    key: 'effectiveTo',
    label: 'Hiệu lực đến',
    render: (r) => fmtDate(r.effectiveTo),
  },
  {
    key: 'isActive',
    label: 'Trạng thái',
    render: (r) => {
      const expired = dayjs(r.effectiveTo).isBefore(today, 'day');
      if (!r.isActive || expired) return <StatusBadge tone="crit">Không hiệu lực</StatusBadge>;
      return <StatusBadge tone="ok">Đang hiệu lực</StatusBadge>;
    },
  },
  {
    key: 'medicineScopeJson',
    label: 'Phạm vi thuốc',
    render: (r) => r.medicineScopeJson ? r.medicineScopeJson : <span style={{ color: 'var(--t-3)' }}>Tất cả</span>,
  },
  { key: 'note', label: 'Ghi chú', render: (r) => r.note || '—' },
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
      { lbl: 'Tổng khai báo', val: rows.length },
      { lbl: 'Đang hiệu lực', val: active.length, tone: 'ok' as const },
      { lbl: 'Sắp hết hạn (30 ngày)', val: expiring.length, tone: expiring.length > 0 ? 'warn' as const : undefined },
    ];
  }, []);

  const handleDelete = useCallback(async (row: BhytFullCoveragePatientDto) => {
    modal.confirm({
      title: 'Xác nhận xóa?',
      content: `Xóa khai báo full-coverage cho BN ${row.patientName}?`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await deleteBhytFullCoverage(row.id);
          message.success('Đã xóa');
          reload();
        } catch (err) {
          message.warning(friendlyErrorMessage(err, 'Xóa thất bại'));
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
          Sửa
        </button>
        <button
          className="ab-btn ab-btn--ghost ab-btn--sm ab-btn--danger"
          onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
          type="button"
        >
          Xóa
        </button>
      </>
    ),
    [handleDelete],
  );

  return (
    <>
      <SimpleV2Page<BhytFullCoveragePatientDto>
        title="BN BHYT 100% thuốc đặc trị"
        load={load}
        rowKey={(r) => r.id}
        columns={COLUMNS}
        searchPlaceholder="Tìm theo tên, mã BN, số thẻ BHYT..."
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
            + Thêm BN
          </button>
        )}
        emptyMessage="Chưa có khai báo nào"
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
