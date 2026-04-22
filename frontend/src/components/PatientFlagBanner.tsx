/**
 * Patient flag banner — Sprint 3 Item 2.3
 * Hiển thị trên mọi màn hình có BN để cảnh báo nhân viên y tế.
 * Admin click tag để mở modal quản lý CRUD.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, Modal, Form, Select, Input, DatePicker, List, Tag, Popconfirm, Space, message,
} from 'antd';
import { PlusOutlined, WarningFilled } from '@ant-design/icons';
import dayjs from 'dayjs';
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

export default function PatientFlagBanner({ patientId, patientName, compact, onCountChange }: Props) {
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

  if (flags.length === 0 && !compact) {
    return (
      <Button size="small" type="link" icon={<PlusOutlined />} onClick={openNew}>
        + Thêm cảnh báo BN
      </Button>
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
            {flags.map(f => (
              <Tag key={f.id} color={f.color} onClick={() => openEdit(f)} style={{ cursor: 'pointer' }}>
                {f.flagTypeName}: {f.note.substring(0, 60)}{f.note.length > 60 ? '…' : ''}
              </Tag>
            ))}
            <Button size="small" type="link" icon={<PlusOutlined />} onClick={openNew}>
              Thêm
            </Button>
          </Space>
        }
      />

      <Modal
        title={editing ? 'Sửa cảnh báo BN' : 'Thêm cảnh báo BN'}
        open={manageOpen}
        onOk={handleSave}
        onCancel={() => setManageOpen(false)}
        okText="Lưu"
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
                  actions={[
                    <Button size="small" key="edit" onClick={() => openEdit(f)}>Sửa</Button>,
                    <Popconfirm key="delete" title="Xóa cảnh báo?" onConfirm={() => handleDelete(f.id)}>
                      <Button size="small" danger>Xóa</Button>
                    </Popconfirm>,
                  ]}
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
    </>
  );
}
