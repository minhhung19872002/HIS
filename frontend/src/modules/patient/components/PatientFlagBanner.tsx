/**
 * Patient flag banner — Sprint 3 Item 2.3
 * Hiển thị trên mọi màn hình có BN để cảnh báo nhân viên y tế.
 * Admin click tag để mở modal quản lý CRUD.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, Modal, Form, Select, Input, DatePicker, List, Tag, Popconfirm, Popover, Space, message,
} from 'antd';
import { PlusOutlined, WarningFilled } from '@ant-design/icons';
import dayjs from 'dayjs';
import { can } from '../../../services/permission.service';
import {
  getPatientFlags,
  savePatientFlag,
  deletePatientFlag,
  PATIENT_FLAG_TYPES,
  type PatientFlagDto,
} from '../api/patientFlag';

interface Props {
  patientId: string;
  patientName?: string;
  compact?: boolean;
  onCountChange?: (count: number) => void;
}

const COLOR_OPTIONS = [
  { value: 'red', label: 'Đỏ (nghiêm trọng)' },
  { value: 'volcano', label: 'Cam (cảnh giác)' },
  { value: 'gold', label: 'Vàng (lưu ý)' },
  { value: 'blue', label: 'Xanh (thông tin)' },
  { value: 'purple', label: 'Tím (VIP)' },
];

/** Backend đã chặn ghi bằng policy perm:MedicalRecord.Update (WritePermissionMap.cs:82 —
 *  chỉ Bác sĩ / Điều dưỡng / Quản trị có). Nhưng giao diện vẫn bày nút Thêm/Sửa/Xoá cho MỌI
 *  người: Tiếp đón, Thu ngân, Dược sĩ, KTV bấm vào chỉ nhận 403. Ẩn đúng những nút đó đi —
 *  ĐỌC thì vẫn cho tất cả, vì cảnh báo an toàn người bệnh ai cũng cần thấy.
 *
 *  Dùng can() của permission.service (nguồn quyền chuẩn, nạp từ GET /me/permissions) chứ KHÔNG
 *  dùng AuthContext.hasPermission — hàm đó đọc user.permissions vốn không được nạp. can() cũng
 *  tôn trọng công tắc tổng ACCESS_GATING_ENABLED (mặc định TẮT): gating tắt thì giao diện giữ
 *  nguyên như cũ, an ninh thật vẫn do backend giữ. */
const FLAG_WRITE_PERMISSION = 'MedicalRecord.Update';

export default function PatientFlagBanner({ patientId, patientName, compact, onCountChange }: Props) {
  const canWrite = can(FLAG_WRITE_PERMISSION);
  const [flags, setFlags] = useState<PatientFlagDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [editing, setEditing] = useState<PatientFlagDto | null>(null);
  const [form] = Form.useForm<{
    flagType: number;
    color: string;
    note: string;
    expiresAt?: dayjs.Dayjs;
  }>();

  const load = useCallback(async () => {
    if (!patientId) { setFlags([]); return; }
    setLoading(true);
    try {
      const list = await getPatientFlags(patientId);
      setFlags(list);
      onCountChange?.(list.length);
    } catch {
      setFlags([]);
    } finally {
      setLoading(false);
    }
  }, [patientId, onCountChange]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await savePatientFlag({
        id: editing?.id,
        patientId,
        flagType: values.flagType,
        color: values.color,
        note: values.note,
        expiresAt: values.expiresAt?.toISOString(),
      });
      message.success(editing ? 'Đã cập nhật cảnh báo' : 'Đã thêm cảnh báo');
      form.resetFields();
      setEditing(null);
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Lưu thất bại');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePatientFlag(id);
      message.success('Đã xóa cảnh báo');
      load();
    } catch {
      message.error('Xóa thất bại');
    }
  };

  const openEdit = (f: PatientFlagDto) => {
    setEditing(f);
    form.setFieldsValue({
      flagType: f.flagType,
      color: f.color,
      note: f.note,
      expiresAt: f.expiresAt ? dayjs(f.expiresAt) : undefined,
    });
    setManageOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ flagType: 1, color: 'red' });
    setManageOpen(true);
  };

  if (!patientId || loading) return null;

  const mostSevere = flags.find(f => f.color === 'red') || flags[0];
  const alertType = mostSevere?.color === 'red' ? 'error'
    : mostSevere?.color === 'volcano' || mostSevere?.color === 'gold' ? 'warning'
    : 'info';

  // Modal phải dùng chung cho CẢ HAI nhánh render bên dưới.
  //
  // ⚠️ Trước đây khi bệnh nhân CHƯA có cảnh báo nào, component return SỚM và chỉ trả về mỗi
  // nút "+ Thêm cảnh báo BN" — <Modal> nằm ở nhánh return kia nên KHÔNG HỀ được mount. Bấm nút
  // set manageOpen=true nhưng không có gì hiện ra: nút chết đúng trong tình huống nó sinh ra để
  // phục vụ (thêm cảnh báo ĐẦU TIÊN). Chỉ khi BN đã có sẵn cảnh báo thì nút "Thêm" mới chạy.
  const manageModal = (
    <Modal
      title={editing ? 'Sửa cảnh báo BN' : 'Thêm cảnh báo BN'}
      open={manageOpen}
      onOk={handleSave}
      onCancel={() => setManageOpen(false)}
      okText="Lưu"
      cancelText="Huỷ"
      width={560}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item name="flagType" label="Loại cảnh báo" rules={[{ required: true }]}>
          <Select options={Object.entries(PATIENT_FLAG_TYPES).map(([k, v]) => ({ value: Number(k), label: v }))} />
        </Form.Item>
        <Form.Item name="color" label="Mức độ (màu)" rules={[{ required: true }]}>
          <Select options={COLOR_OPTIONS} />
        </Form.Item>
        <Form.Item name="note" label="Ghi chú" rules={[{ required: true, message: 'Nhập ghi chú' }]}>
          <Input.TextArea rows={3} placeholder="Chi tiết cảnh báo..." />
        </Form.Item>
        <Form.Item name="expiresAt" label="Hết hiệu lực (tùy chọn)">
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
        </Form.Item>
      </Form>

      {flags.length > 0 && (
        <>
          <h4 style={{ marginTop: 16 }}>Danh sách cảnh báo hiện tại</h4>
          <List<PatientFlagDto>
            dataSource={flags}
            renderItem={f => (
              <List.Item
                actions={canWrite ? [
                  <Button size="small" key="edit" onClick={() => openEdit(f)}>Sửa</Button>,
                  <Popconfirm key="delete" title="Xóa cảnh báo?" onConfirm={() => handleDelete(f.id)}>
                    <Button size="small" danger>Xóa</Button>
                  </Popconfirm>,
                ] : []}
              >
                <List.Item.Meta
                  title={<Space><Tag color={f.color}>{f.flagTypeName}</Tag></Space>}
                  description={f.note}
                />
              </List.Item>
            )}
          />
        </>
      )}
    </Modal>
  );

  if (flags.length === 0 && !compact) {
    if (!canWrite) return null;   // khong co quyen thi khong bay nut Them
    return (
      <>
        <Button size="small" type="link" icon={<PlusOutlined />} onClick={openNew}>
          + Thêm cảnh báo BN
        </Button>
        {manageModal}
      </>
    );
  }
  if (flags.length === 0) return null;

  return (
    <>
      <Alert
        type={alertType}
        showIcon
        icon={<WarningFilled />}
        style={{ marginBottom: 8 }}
        title={
          <Space wrap>
            <strong>Cảnh báo BN{patientName ? ` — ${patientName}` : ''}:</strong>
            {/* Bấm thẻ = XEM CHI TIẾT, không phải sửa thẳng.
                Ghi chú bị cắt ở 60 ký tự nên người ta bấm chính vì muốn đọc tiếp — trước đây
                lại rơi vào form sửa. Đọc là việc hằng ngày, sửa là việc hiếm, mà đây là hồ sơ
                an toàn người bệnh nên sửa phải là hành động CHỦ Ý thêm một bước.
                Popover cũng là chỗ để lộ ra người đặt / thời điểm / hạn hiệu lực — DTO có sẵn
                nhưng trước giờ không hiển thị ở đâu cả. */}
            {flags.map(f => (
              <Popover
                key={f.id}
                trigger="click"
                placement="bottomLeft"
                title={<Space><Tag color={f.color} style={{ marginInlineEnd: 0 }}>{f.flagTypeName}</Tag></Space>}
                content={
                  <div style={{ maxWidth: 380 }}>
                    <div style={{ whiteSpace: 'pre-wrap', marginBottom: 10 }}>{f.note}</div>
                    <div style={{ fontSize: 12, color: 'var(--t-2, #64748b)', lineHeight: 1.7 }}>
                      <div>Người đặt: <strong>{f.createdByName || '—'}</strong></div>
                      <div>Đặt lúc: {dayjs(f.createdAt).format('HH:mm DD/MM/YYYY')}</div>
                      <div>
                        Hiệu lực đến:{' '}
                        {f.expiresAt
                          ? <strong>{dayjs(f.expiresAt).format('DD/MM/YYYY')}</strong>
                          : 'không thời hạn'}
                      </div>
                    </div>
                    {canWrite && (
                      <div style={{ marginTop: 10, textAlign: 'right' }}>
                        <Button size="small" onClick={() => openEdit(f)}>Sửa</Button>
                      </div>
                    )}
                  </div>
                }
              >
                <Tag color={f.color} style={{ cursor: 'pointer' }}>
                  {f.flagTypeName}: {f.note.substring(0, 60)}{f.note.length > 60 ? '…' : ''}
                </Tag>
              </Popover>
            ))}
            {canWrite && (
              <Button size="small" type="link" icon={<PlusOutlined />} onClick={openNew}>
                Thêm
              </Button>
            )}
          </Space>
        }
      />

      {manageModal}
    </>
  );
}
