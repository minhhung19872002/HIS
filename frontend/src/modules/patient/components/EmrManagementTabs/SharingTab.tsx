import React, { useState, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Tag, Space, message,
  Popconfirm, DatePicker, Tooltip,
  Timeline, Empty, Drawer, Spin,
} from 'antd';
import {
  CloseCircleOutlined, PlusOutlined,
  SearchOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import * as emrMgmt from '../../../emr/api/emrManagement';
import type {
  EmrShareDto, ShareAccessLogDto,
} from '../../../emr/api/emrManagement';

const { TextArea } = Input;

// ============ Tab 1: Chia se BA (Sharing B.1.2) ============

export const SharingTab: React.FC = () => {
  const [shares, setShares] = useState<EmrShareDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [searchExamId, setSearchExamId] = useState('');
  const [accessLogs, setAccessLogs] = useState<ShareAccessLogDto[]>([]);
  const [logsDrawerOpen, setLogsDrawerOpen] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchShares = useCallback(async () => {
    if (!searchExamId) return;
    setLoading(true);
    try {
      const res = await emrMgmt.getEmrShares(searchExamId);
      setShares(res.data || []);
    } catch {
      message.warning('Khong the tai danh sach chia se');
    } finally {
      setLoading(false);
    }
  }, [searchExamId]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await emrMgmt.createEmrShare({
        ...values,
        expiresAt: values.expiresAt?.toISOString(),
      });
      message.success('Chia se thanh cong');
      setModalOpen(false);
      form.resetFields();
      fetchShares();
    } catch {
      message.warning('Khong the tao chia se');
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await emrMgmt.revokeEmrShare(id);
      message.success('Da thu hoi chia se');
      setShares(prev => prev.map(s => s.id === id ? { ...s, status: 'Revoked' } : s));
    } catch {
      message.warning('Khong the thu hoi');
    }
  };

  const showAccessLogs = async (shareId: string) => {
    setLogsDrawerOpen(true);
    setLogsLoading(true);
    try {
      const res = await emrMgmt.getShareAccessLogs(shareId);
      setAccessLogs(res.data || []);
    } catch {
      message.warning('Khong the tai nhat ky truy cap');
    } finally {
      setLogsLoading(false);
    }
  };

  const statusColor: Record<string, string> = { Active: 'green', Revoked: 'red', Expired: 'default' };

  return (
    <div>
      <Space orientation="horizontal" style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }}>
        <Space orientation="horizontal">
          <Input
            placeholder="Ma kham (Examination ID)"
            value={searchExamId}
            onChange={e => setSearchExamId(e.target.value)}
            style={{ width: 280 }}
            onPressEnter={() => fetchShares()}
          />
          <Button icon={<SearchOutlined />} onClick={fetchShares}>Tim</Button>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); form.setFieldsValue({ examinationId: searchExamId }); setModalOpen(true); }}>
          Tao chia se
        </Button>
      </Space>

      <Table
        size="small" loading={loading} dataSource={shares} rowKey="id"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        columns={[
          { title: 'Benh nhan', dataIndex: 'patientName', key: 'patient', width: 140, ellipsis: true },
          { title: 'Nguoi chia se', dataIndex: 'sharedByName', key: 'sharedBy', width: 120 },
          { title: 'Loai', dataIndex: 'shareTargetType', key: 'targetType', width: 90,
            render: (v: string) => <Tag>{v === 'User' ? 'Ca nhan' : 'Khoa/Phong'}</Tag> },
          { title: 'Doi tuong', dataIndex: 'shareTargetName', key: 'target', width: 130, ellipsis: true },
          { title: 'Pham vi', dataIndex: 'shareType', key: 'shareType', width: 90,
            render: (v: string) => v === 'Whole' ? 'Toan bo' : 'Bieu mau' },
          { title: 'Truy cap', dataIndex: 'accessCount', key: 'access', width: 70, align: 'center' as const },
          { title: 'Het han', dataIndex: 'expiresAt', key: 'expires', width: 130,
            render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : 'Khong gioi han' },
          { title: 'Trang thai', dataIndex: 'status', key: 'status', width: 100,
            render: (v: string) => <Tag color={statusColor[v] || 'default'}>{v === 'Active' ? 'Hoat dong' : v === 'Revoked' ? 'Da thu hoi' : 'Het han'}</Tag> },
          { title: '', key: 'actions', width: 120,
            render: (_: unknown, r: EmrShareDto) => (
              <Space orientation="horizontal" size={4}>
                <Tooltip title="Nhat ky truy cap">
                  <Button size="small" icon={<EyeOutlined />} onClick={() => showAccessLogs(r.id)} />
                </Tooltip>
                {r.status === 'Active' && (
                  <Popconfirm title="Thu hoi chia se nay?" onConfirm={() => handleRevoke(r.id)}>
                    <Button size="small" danger icon={<CloseCircleOutlined />} />
                  </Popconfirm>
                )}
              </Space>
            ),
          },
        ]}
      />

      <Modal title="Tao chia se benh an" open={modalOpen} onOk={handleCreate} onCancel={() => setModalOpen(false)} okText="Chia se" cancelText="Huy" width={500}>
        <Form form={form} layout="vertical" size="small">
          <Form.Item name="examinationId" label="Ma kham" rules={[{ required: true, message: 'Vui long nhap ma kham' }]}>
            <Input placeholder="ID kham benh" />
          </Form.Item>
          <Form.Item name="shareTargetType" label="Chia se cho" rules={[{ required: true }]} initialValue="User">
            <Select>
              <Select.Option value="User">Ca nhan (User)</Select.Option>
              <Select.Option value="Department">Khoa/Phong</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="shareTargetId" label="Doi tuong" rules={[{ required: true, message: 'Vui long nhap doi tuong' }]}>
            <Input placeholder="User ID hoac Department ID" />
          </Form.Item>
          <Form.Item name="shareType" label="Pham vi" rules={[{ required: true }]} initialValue="Whole">
            <Select>
              <Select.Option value="Whole">Toan bo benh an</Select.Option>
              <Select.Option value="Form">Chi dinh bieu mau</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="formTypes" label="Loai bieu mau (neu chon 'Chi dinh')">
            <Input placeholder="VD: treatment-sheet,consultation,nursing" />
          </Form.Item>
          <Form.Item name="expiresAt" label="Han truy cap">
            <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} placeholder="De trong = khong gioi han" />
          </Form.Item>
          <Form.Item name="note" label="Ghi chu">
            <TextArea rows={2} placeholder="Ly do chia se..." />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer title="Nhat ky truy cap chia se" open={logsDrawerOpen} onClose={() => setLogsDrawerOpen(false)} width={480}>
        <Spin spinning={logsLoading}>
          {accessLogs.length === 0 ? (
            <Empty description="Chua co truy cap nao" />
          ) : (
            <Timeline
              items={accessLogs.map(log => ({
                content: (
                  <div>
                    <div><strong>{log.accessedByName || log.accessedByUserId}</strong></div>
                    <div style={{ fontSize: 12, color: '#888' }}>{dayjs(log.accessedAt).format('DD/MM/YYYY HH:mm:ss')}</div>
                    <div style={{ fontSize: 12 }}>Hanh dong: {log.action} | IP: {log.ipAddress || 'N/A'}</div>
                  </div>
                ),
              }))}
            />
          )}
        </Spin>
      </Drawer>
    </div>
  );
};

// ============ Tab 2: Trich luc (Extract B.1.3) ============
