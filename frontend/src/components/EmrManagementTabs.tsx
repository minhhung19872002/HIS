import React, { useState, useEffect, useCallback } from 'react';
import {
  Tabs, Table, Button, Modal, Form, Input, Select, Tag, Space, message,
  Popconfirm, DatePicker, Switch, Badge, Tooltip, Card, Row, Col,
  Timeline, Empty, Drawer, Spin, Alert,
} from 'antd';
import {
  ShareAltOutlined, LockOutlined, FileProtectOutlined, EditOutlined,
  PictureOutlined, ThunderboltOutlined, CheckCircleOutlined,
  CloseCircleOutlined, WarningOutlined, DeleteOutlined, PlusOutlined,
  ReloadOutlined, SearchOutlined, UnlockOutlined, CopyOutlined,
  OrderedListOutlined, TagOutlined, CodeOutlined, SafetyOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import * as emrMgmt from '../api/emrManagement';
import type {
  EmrShareDto, ShareAccessLogDto, EmrExtractDto, EmrSpineDto,
  EmrSpineSectionDto, EmrImageDto, EmrShortcodeDto,
  AutoCheckRuleDto, AutoCheckViolationDto,
} from '../api/emrManagement';

const { TextArea } = Input;

// ============ Tab 1: Chia se BA (Sharing B.1.2) ============
const SharingTab: React.FC = () => {
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
const ExtractTab: React.FC = () => {
  const [extracts, setExtracts] = useState<EmrExtractDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [searchExamId, setSearchExamId] = useState('');

  const fetchExtracts = useCallback(async () => {
    if (!searchExamId) return;
    setLoading(true);
    try {
      const res = await emrMgmt.getEmrExtracts(searchExamId);
      setExtracts(res.data || []);
    } catch {
      message.warning('Khong the tai danh sach trich luc');
    } finally {
      setLoading(false);
    }
  }, [searchExamId]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await emrMgmt.createEmrExtract({
        ...values,
        expiresAt: values.expiresAt?.toISOString(),
        maxAccessCount: values.maxAccessCount || 5,
      });
      message.success('Tao trich luc thanh cong');
      setModalOpen(false);
      form.resetFields();
      fetchExtracts();
    } catch {
      message.warning('Khong the tao trich luc');
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await emrMgmt.revokeEmrExtract(id);
      message.success('Da thu hoi trich luc');
      setExtracts(prev => prev.map(e => e.id === id ? { ...e, status: 'Revoked' } : e));
    } catch {
      message.warning('Khong the thu hoi');
    }
  };

  const copyAccessCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => message.success('Da sao chep ma truy cap'));
  };

  return (
    <div>
      <Space orientation="horizontal" style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }}>
        <Space orientation="horizontal">
          <Input placeholder="Ma kham (Examination ID)" value={searchExamId}
            onChange={e => setSearchExamId(e.target.value)} style={{ width: 280 }}
            onPressEnter={() => fetchExtracts()} />
          <Button icon={<SearchOutlined />} onClick={fetchExtracts}>Tim</Button>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); form.setFieldsValue({ examinationId: searchExamId }); setModalOpen(true); }}>
          Tao trich luc
        </Button>
      </Space>

      <Table
        size="small" loading={loading} dataSource={extracts} rowKey="id"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        columns={[
          { title: 'Benh nhan', dataIndex: 'patientName', key: 'patient', width: 140, ellipsis: true },
          { title: 'Nguoi trich', dataIndex: 'extractedByName', key: 'extractedBy', width: 120 },
          { title: 'Loai', dataIndex: 'extractType', key: 'type', width: 80,
            render: (v: string) => <Tag color={v === 'Full' ? 'blue' : 'orange'}>{v === 'Full' ? 'Day du' : 'Tung phan'}</Tag> },
          { title: 'Watermark', dataIndex: 'hasWatermark', key: 'wm', width: 80, align: 'center' as const,
            render: (v: boolean) => v ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#ccc' }} /> },
          { title: 'Ma truy cap', dataIndex: 'accessCode', key: 'code', width: 120,
            render: (v: string) => v ? (
              <Space orientation="horizontal" size={4}>
                <code style={{ fontSize: 11 }}>{v}</code>
                <Tooltip title="Sao chep"><Button type="link" size="small" icon={<CopyOutlined />} onClick={() => copyAccessCode(v)} /></Tooltip>
              </Space>
            ) : '-' },
          { title: 'Truy cap', key: 'accessInfo', width: 80, align: 'center' as const,
            render: (_: unknown, r: EmrExtractDto) => `${r.accessCount}/${r.maxAccessCount}` },
          { title: 'Trang thai', dataIndex: 'status', key: 'status', width: 100,
            render: (v: string) => <Tag color={v === 'Active' ? 'green' : v === 'Revoked' ? 'red' : 'default'}>
              {v === 'Active' ? 'Hoat dong' : v === 'Revoked' ? 'Da thu hoi' : 'Het han'}</Tag> },
          { title: '', key: 'actions', width: 60,
            render: (_: unknown, r: EmrExtractDto) => r.status === 'Active' ? (
              <Popconfirm title="Thu hoi trich luc?" onConfirm={() => handleRevoke(r.id)}>
                <Button size="small" danger icon={<CloseCircleOutlined />} />
              </Popconfirm>
            ) : null },
        ]}
      />

      <Modal title="Tao trich luc benh an" open={modalOpen} onOk={handleCreate} onCancel={() => setModalOpen(false)} okText="Tao" cancelText="Huy" width={480}>
        <Form form={form} layout="vertical" size="small">
          <Form.Item name="examinationId" label="Ma kham" rules={[{ required: true }]}>
            <Input placeholder="ID kham benh" />
          </Form.Item>
          <Form.Item name="extractType" label="Loai trich luc" rules={[{ required: true }]} initialValue="Full">
            <Select>
              <Select.Option value="Full">Day du (toan bo BA)</Select.Option>
              <Select.Option value="Partial">Tung phan (chon bieu mau)</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="formTypes" label="Bieu mau (neu chon tung phan)">
            <Select mode="multiple" placeholder="Chon cac bieu mau can trich">
              <Select.Option value="treatment-sheet">Phieu dieu tri</Select.Option>
              <Select.Option value="consultation">Hoi chan</Select.Option>
              <Select.Option value="nursing">Cham soc</Select.Option>
              <Select.Option value="vital-signs">Sinh hieu</Select.Option>
              <Select.Option value="lab-results">Ket qua XN</Select.Option>
              <Select.Option value="radiology">Ket qua CDHA</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="maxAccessCount" label="So lan truy cap toi da" initialValue={5}>
            <Input type="number" min={1} max={100} />
          </Form.Item>
          <Form.Item name="expiresAt" label="Han truy cap">
            <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} placeholder="De trong = 30 ngay" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

// ============ Tab 3: Gay BA (Spine B.1.5) ============
const SpineTab: React.FC = () => {
  const [spines, setSpines] = useState<EmrSpineDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [editingSpine, setEditingSpine] = useState<EmrSpineDto | null>(null);
  const [sections, setSections] = useState<EmrSpineSectionDto[]>([]);

  const fetchSpines = useCallback(async () => {
    setLoading(true);
    try {
      const res = await emrMgmt.getEmrSpines();
      setSpines(res.data || []);
    } catch {
      message.warning('Khong the tai danh sach gay BA');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSpines(); }, [fetchSpines]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await emrMgmt.saveEmrSpine({
        id: editingSpine?.id,
        name: values.name,
        description: values.description,
        isDefault: values.isDefault || false,
        sections,
      });
      message.success(editingSpine ? 'Cap nhat thanh cong' : 'Tao gay BA thanh cong');
      setModalOpen(false);
      fetchSpines();
    } catch {
      message.warning('Khong the luu gay BA');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await emrMgmt.deleteEmrSpine(id);
      message.success('Da xoa');
      setSpines(prev => prev.filter(s => s.id !== id));
    } catch {
      message.warning('Khong the xoa gay BA');
    }
  };

  const openModal = (spine?: EmrSpineDto) => {
    if (spine) {
      setEditingSpine(spine);
      form.setFieldsValue({ name: spine.name, description: spine.description, isDefault: spine.isDefault });
      setSections(spine.sections || []);
    } else {
      setEditingSpine(null);
      form.resetFields();
      setSections([]);
    }
    setModalOpen(true);
  };

  const addSection = () => {
    setSections(prev => [...prev, { formType: '', formName: '', sortOrder: prev.length + 1, isRequired: false }]);
  };

  const updateSection = (index: number, field: string, value: unknown) => {
    setSections(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const removeSection = (index: number) => {
    setSections(prev => prev.filter((_, i) => i !== index));
  };

  const formTypeOptions = [
    { value: 'admission-exam', label: 'Kham vao vien' },
    { value: 'treatment-sheet', label: 'Phieu dieu tri' },
    { value: 'consultation', label: 'Hoi chan' },
    { value: 'nursing-care', label: 'Cham soc DD' },
    { value: 'vital-signs', label: 'Sinh hieu' },
    { value: 'prescription', label: 'Don thuoc' },
    { value: 'lab-request', label: 'Xet nghiem' },
    { value: 'radiology-request', label: 'CDHA' },
    { value: 'surgery-record', label: 'Phau thuat' },
    { value: 'discharge', label: 'Ra vien' },
    { value: 'summary', label: 'Tong ket BA' },
    { value: 'consent', label: 'Cam ket' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 500 }}>Danh sach cau truc gay benh an</span>
        <Space orientation="horizontal">
          <Button icon={<ReloadOutlined />} onClick={fetchSpines}>Tai lai</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>Them gay BA</Button>
        </Space>
      </div>

      <Table
        size="small" loading={loading} dataSource={spines} rowKey="id"
        pagination={false}
        expandable={{
          expandedRowRender: (record: EmrSpineDto) => (
            <Table
              size="small" dataSource={record.sections || []} rowKey={(_, i) => `section-${i}`}
              pagination={false}
              columns={[
                { title: 'STT', dataIndex: 'sortOrder', key: 'sort', width: 50 },
                { title: 'Loai bieu mau', dataIndex: 'formType', key: 'type', width: 150 },
                { title: 'Ten bieu mau', dataIndex: 'formName', key: 'name' },
                { title: 'Bat buoc', dataIndex: 'isRequired', key: 'req', width: 80,
                  render: (v: boolean) => v ? <Tag color="red">Bat buoc</Tag> : <Tag>Tuy chon</Tag> },
              ]}
            />
          ),
        }}
        columns={[
          { title: 'Ten gay BA', dataIndex: 'name', key: 'name', width: 200 },
          { title: 'Mo ta', dataIndex: 'description', key: 'desc', ellipsis: true },
          { title: 'So bieu mau', key: 'count', width: 100, align: 'center' as const,
            render: (_: unknown, r: EmrSpineDto) => <Badge count={r.sections?.length || 0} showZero style={{ backgroundColor: '#1677ff' }} /> },
          { title: 'Mac dinh', dataIndex: 'isDefault', key: 'default', width: 80,
            render: (v: boolean) => v ? <Tag color="green">Mac dinh</Tag> : null },
          { title: '', key: 'actions', width: 100,
            render: (_: unknown, r: EmrSpineDto) => (
              <Space orientation="horizontal" size={4}>
                <Button size="small" icon={<EditOutlined />} onClick={() => openModal(r)} />
                <Popconfirm title="Xoa gay BA nay?" onConfirm={() => handleDelete(r.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal title={editingSpine ? 'Chinh sua gay BA' : 'Them gay BA moi'} open={modalOpen}
        onOk={handleSave} onCancel={() => setModalOpen(false)} okText="Luu" cancelText="Huy" width={650}>
        <Form form={form} layout="vertical" size="small">
          <Row gutter={12}>
            <Col span={16}>
              <Form.Item name="name" label="Ten gay BA" rules={[{ required: true, message: 'Nhap ten' }]}>
                <Input placeholder="VD: Gay BA noi khoa, Gay BA ngoai khoa..." />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="isDefault" label="Mac dinh" valuePropName="checked">
                <Switch checkedChildren="Mac dinh" unCheckedChildren="Khong" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Mo ta">
            <TextArea rows={2} placeholder="Mo ta cau truc gay BA..." />
          </Form.Item>
        </Form>

        <div style={{ marginTop: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
          <strong>Cac phan (bieu mau)</strong>
          <Button size="small" icon={<PlusOutlined />} onClick={addSection}>Them phan</Button>
        </div>
        {sections.map((section, index) => (
          <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
            <Input size="small" value={section.sortOrder} style={{ width: 50 }}
              onChange={e => updateSection(index, 'sortOrder', Number(e.target.value))} placeholder="STT" />
            <Select size="small" value={section.formType} style={{ width: 160 }}
              onChange={v => { updateSection(index, 'formType', v); const opt = formTypeOptions.find(o => o.value === v); if (opt) updateSection(index, 'formName', opt.label); }}
              placeholder="Loai bieu mau" options={formTypeOptions} />
            <Input size="small" value={section.formName} style={{ flex: 1 }}
              onChange={e => updateSection(index, 'formName', e.target.value)} placeholder="Ten bieu mau" />
            <Switch size="small" checked={section.isRequired}
              onChange={v => updateSection(index, 'isRequired', v)} checkedChildren="BB" unCheckedChildren="TC" />
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeSection(index)} />
          </div>
        ))}
      </Modal>
    </div>
  );
};

// ============ Tab 4: Thu vien hinh anh (Images B.1.20) ============
const ImagesTab: React.FC = () => {
  const [images, setImages] = useState<EmrImageDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [editingImage, setEditingImage] = useState<EmrImageDto | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');

  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await emrMgmt.getEmrImages();
      setImages(res.data || []);
    } catch {
      message.warning('Khong the tai thu vien hinh anh');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await emrMgmt.saveEmrImage({
        id: editingImage?.id,
        ...values,
        tags: values.tags?.join(','),
      });
      message.success(editingImage ? 'Cap nhat thanh cong' : 'Them hinh anh thanh cong');
      setModalOpen(false);
      fetchImages();
    } catch {
      message.warning('Khong the luu hinh anh');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await emrMgmt.deleteEmrImage(id);
      message.success('Da xoa');
      setImages(prev => prev.filter(i => i.id !== id));
    } catch {
      message.warning('Khong the xoa');
    }
  };

  const openModal = (img?: EmrImageDto) => {
    if (img) {
      setEditingImage(img);
      form.setFieldsValue({ ...img, tags: img.tags?.split(',').filter(Boolean) });
    } else {
      setEditingImage(null);
      form.resetFields();
    }
    setModalOpen(true);
  };

  const categoryOptions = [
    { value: 'anatomy', label: 'Giai phau' },
    { value: 'radiology', label: 'CDHA' },
    { value: 'pathology', label: 'Giai phau benh' },
    { value: 'clinical', label: 'Lam sang' },
    { value: 'diagram', label: 'So do' },
    { value: 'other', label: 'Khac' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 500 }}>Thu vien hinh anh EMR</span>
        <Space orientation="horizontal">
          <Button icon={<ReloadOutlined />} onClick={fetchImages}>Tai lai</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>Them hinh anh</Button>
        </Space>
      </div>

      <Spin spinning={loading}>
        {images.length === 0 ? (
          <Empty description="Chua co hinh anh trong thu vien" />
        ) : (
          <Row gutter={[12, 12]}>
            {images.map(img => (
              <Col key={img.id} xs={12} sm={8} md={6}>
                <Card
                  size="small"
                  hoverable
                  cover={img.imageData ? (
                    <div style={{ height: 120, overflow: 'hidden', cursor: 'pointer', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={() => { setPreviewImage(img.imageData || ''); setPreviewOpen(true); }}>
                      <img src={img.imageData} alt={img.title} style={{ maxHeight: 120, maxWidth: '100%', objectFit: 'contain' }} />
                    </div>
                  ) : (
                    <div style={{ height: 120, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <PictureOutlined style={{ fontSize: 36, color: '#ccc' }} />
                    </div>
                  )}
                  actions={[
                    <EditOutlined key="edit" onClick={() => openModal(img)} />,
                    <Popconfirm key="del" title="Xoa hinh anh?" onConfirm={() => handleDelete(img.id)}>
                      <DeleteOutlined />
                    </Popconfirm>,
                  ]}
                >
                  <Card.Meta
                    title={<span style={{ fontSize: 12 }}>{img.title}</span>}
                    description={
                      <div style={{ fontSize: 11 }}>
                        {img.category && <Tag style={{ fontSize: 10 }}>{categoryOptions.find(c => c.value === img.category)?.label || img.category}</Tag>}
                        {img.isShared && <Tag color="blue" style={{ fontSize: 10 }}>Chia se</Tag>}
                      </div>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Spin>

      <Modal title={editingImage ? 'Chinh sua hinh anh' : 'Them hinh anh'} open={modalOpen}
        onOk={handleSave} onCancel={() => setModalOpen(false)} okText="Luu" cancelText="Huy" width={500}>
        <Form form={form} layout="vertical" size="small">
          <Form.Item name="title" label="Tieu de" rules={[{ required: true, message: 'Nhap tieu de' }]}>
            <Input placeholder="Ten hinh anh" />
          </Form.Item>
          <Form.Item name="description" label="Mo ta">
            <TextArea rows={2} placeholder="Mo ta hinh anh..." />
          </Form.Item>
          <Form.Item name="category" label="Danh muc">
            <Select placeholder="Chon danh muc" options={categoryOptions} allowClear />
          </Form.Item>
          <Form.Item name="tags" label="The (tags)">
            <Select mode="tags" placeholder="Nhap tag va nhan Enter" />
          </Form.Item>
          <Form.Item name="imageData" label="Hinh anh (base64)">
            <TextArea rows={3} placeholder="Paste base64 image data tai day (data:image/png;base64,...)" />
          </Form.Item>
          <Form.Item name="isShared" label="Chia se voi tat ca" valuePropName="checked">
            <Switch checkedChildren="Co" unCheckedChildren="Khong" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal open={previewOpen} footer={null} onCancel={() => setPreviewOpen(false)} width={700}>
        <img src={previewImage} alt="Preview" style={{ width: '100%' }} />
      </Modal>
    </div>
  );
};

// ============ Tab 5: Ma tat (Shortcodes B.1.22) ============
const ShortcodesTab: React.FC = () => {
  const [shortcodes, setShortcodes] = useState<EmrShortcodeDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [editingShortcode, setEditingShortcode] = useState<EmrShortcodeDto | null>(null);
  const [testCode, setTestCode] = useState('');
  const [expandedText, setExpandedText] = useState('');

  const fetchShortcodes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await emrMgmt.getShortcodes();
      setShortcodes(res.data || []);
    } catch {
      message.warning('Khong the tai danh sach ma tat');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchShortcodes(); }, [fetchShortcodes]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await emrMgmt.saveShortcode({ id: editingShortcode?.id, ...values });
      message.success(editingShortcode ? 'Cap nhat thanh cong' : 'Them ma tat thanh cong');
      setModalOpen(false);
      fetchShortcodes();
    } catch {
      message.warning('Khong the luu ma tat');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await emrMgmt.deleteShortcode(id);
      message.success('Da xoa');
      setShortcodes(prev => prev.filter(s => s.id !== id));
    } catch {
      message.warning('Khong the xoa');
    }
  };

  const handleExpand = async () => {
    if (!testCode) return;
    try {
      const res = await emrMgmt.expandShortcode(testCode);
      setExpandedText(res.data?.fullText || res.data || 'Khong tim thay ma tat');
    } catch {
      setExpandedText('Khong tim thay ma tat nay');
    }
  };

  const openModal = (sc?: EmrShortcodeDto) => {
    if (sc) {
      setEditingShortcode(sc);
      form.setFieldsValue(sc);
    } else {
      setEditingShortcode(null);
      form.resetFields();
      form.setFieldsValue({ scope: 'User' });
    }
    setModalOpen(true);
  };

  const scopeColors: Record<string, string> = { Global: 'red', Department: 'orange', User: 'blue' };
  const scopeLabels: Record<string, string> = { Global: 'Toan BV', Department: 'Khoa', User: 'Ca nhan' };

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
        <Space orientation="horizontal">
          <Input placeholder="Nhap ma tat de thu..." value={testCode} onChange={e => setTestCode(e.target.value)}
            style={{ width: 200 }} onPressEnter={handleExpand} />
          <Button icon={<ThunderboltOutlined />} onClick={handleExpand}>Mo rong</Button>
          {expandedText && <Tag color="green" style={{ maxWidth: 400 }}>{expandedText}</Tag>}
        </Space>
        <Space orientation="horizontal">
          <Button icon={<ReloadOutlined />} onClick={fetchShortcodes}>Tai lai</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>Them ma tat</Button>
        </Space>
      </div>

      <Table
        size="small" loading={loading} dataSource={shortcodes} rowKey="id"
        pagination={{ pageSize: 15, showSizeChanger: false }}
        columns={[
          { title: 'Ma tat', dataIndex: 'code', key: 'code', width: 120,
            render: (v: string) => <code style={{ fontWeight: 600, color: '#1677ff' }}>{v}</code> },
          { title: 'Noi dung day du', dataIndex: 'fullText', key: 'text', ellipsis: true },
          { title: 'Danh muc', dataIndex: 'category', key: 'cat', width: 100,
            render: (v: string) => v ? <Tag>{v}</Tag> : '-' },
          { title: 'Pham vi', dataIndex: 'scope', key: 'scope', width: 90,
            render: (v: string) => <Tag color={scopeColors[v] || 'default'}>{scopeLabels[v] || v}</Tag> },
          { title: '', key: 'actions', width: 80,
            render: (_: unknown, r: EmrShortcodeDto) => (
              <Space orientation="horizontal" size={4}>
                <Button size="small" icon={<EditOutlined />} onClick={() => openModal(r)} />
                <Popconfirm title="Xoa ma tat?" onConfirm={() => handleDelete(r.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal title={editingShortcode ? 'Chinh sua ma tat' : 'Them ma tat'} open={modalOpen}
        onOk={handleSave} onCancel={() => setModalOpen(false)} okText="Luu" cancelText="Huy" width={500}>
        <Form form={form} layout="vertical" size="small">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="code" label="Ma tat" rules={[{ required: true, message: 'Nhap ma tat' }]}>
                <Input placeholder="VD: bt, kbt, thb" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="scope" label="Pham vi" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="User">Ca nhan</Select.Option>
                  <Select.Option value="Department">Khoa/Phong</Select.Option>
                  <Select.Option value="Global">Toan benh vien</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="category" label="Danh muc">
            <Input placeholder="VD: Kham benh, Chan doan, Dieu tri..." />
          </Form.Item>
          <Form.Item name="fullText" label="Noi dung day du" rules={[{ required: true, message: 'Nhap noi dung' }]}>
            <TextArea rows={4} placeholder="Noi dung se duoc mo rong khi go ma tat..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

// ============ Tab 6: Kiem tra thieu sot (Auto Check B.1.25) ============
const AutoCheckTab: React.FC = () => {
  const [rules, setRules] = useState<AutoCheckRuleDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [editingRule, setEditingRule] = useState<AutoCheckRuleDto | null>(null);
  const [checkExamId, setCheckExamId] = useState('');
  const [violations, setViolations] = useState<AutoCheckViolationDto[]>([]);
  const [checking, setChecking] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await emrMgmt.getAutoCheckRules();
      setRules(res.data || []);
    } catch {
      message.warning('Khong the tai danh sach quy tac');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await emrMgmt.saveAutoCheckRule({ id: editingRule?.id, ...values });
      message.success(editingRule ? 'Cap nhat thanh cong' : 'Them quy tac thanh cong');
      setModalOpen(false);
      fetchRules();
    } catch {
      message.warning('Khong the luu quy tac');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await emrMgmt.deleteAutoCheckRule(id);
      message.success('Da xoa');
      setRules(prev => prev.filter(r => r.id !== id));
    } catch {
      message.warning('Khong the xoa');
    }
  };

  const handleRunCheck = async () => {
    if (!checkExamId) { message.warning('Vui long nhap ma kham'); return; }
    setChecking(true);
    try {
      const res = await emrMgmt.runAutoCheck(checkExamId);
      const data = res.data;
      const nextViolations = Array.isArray(data?.violations) ? data.violations : [];
      setViolations(nextViolations);
      if (nextViolations.length === 0) {
        message.success('Khong phat hien thieu sot!');
      }
    } catch {
      message.warning('Khong the chay kiem tra');
    } finally {
      setChecking(false);
    }
  };

  const openModal = (rule?: AutoCheckRuleDto) => {
    if (rule) {
      setEditingRule(rule);
      form.setFieldsValue(rule);
    } else {
      setEditingRule(null);
      form.resetFields();
      form.setFieldsValue({ severity: 'Warning', isActive: true, ruleType: 'RequiredField' });
    }
    setModalOpen(true);
  };

  const severityColors: Record<string, string> = { Error: 'red', Warning: 'orange', Info: 'blue' };

  return (
    <div>
      <Card size="small" title="Kiem tra thieu sot benh an" style={{ marginBottom: 12 }}>
        <Space orientation="horizontal">
          <Input placeholder="Ma kham (Examination ID)" value={checkExamId}
            onChange={e => setCheckExamId(e.target.value)} style={{ width: 300 }}
            onPressEnter={handleRunCheck} />
          <Button type="primary" icon={<SafetyOutlined />} loading={checking} onClick={handleRunCheck}>
            Chay kiem tra
          </Button>
        </Space>
        {violations.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Alert title={`Phat hien ${violations.length} thieu sot`} type="warning" showIcon style={{ marginBottom: 8 }} />
            <Table size="small" dataSource={violations} rowKey={(_, i) => `v-${i}`} pagination={false}
              columns={[
                { title: 'Muc do', dataIndex: 'severity', key: 'sev', width: 90,
                  render: (v: string) => <Tag color={severityColors[v] || 'default'}>
                    {v === 'Error' ? <><WarningOutlined /> Loi</> : v === 'Warning' ? <><WarningOutlined /> Canh bao</> : 'Thong tin'}
                  </Tag> },
                { title: 'Bieu mau', dataIndex: 'formType', key: 'form', width: 130 },
                { title: 'Truong', dataIndex: 'fieldName', key: 'field', width: 130 },
                { title: 'Noi dung', dataIndex: 'message', key: 'msg' },
              ]}
            />
          </div>
        )}
      </Card>

      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 500 }}>Danh sach quy tac kiem tra</span>
        <Space orientation="horizontal">
          <Button icon={<ReloadOutlined />} onClick={fetchRules}>Tai lai</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>Them quy tac</Button>
        </Space>
      </div>

      <Table
        size="small" loading={loading} dataSource={rules} rowKey="id"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        columns={[
          { title: 'Ten quy tac', dataIndex: 'name', key: 'name', width: 180, ellipsis: true },
          { title: 'Loai', dataIndex: 'ruleType', key: 'type', width: 100,
            render: (v: string) => <Tag>{v}</Tag> },
          { title: 'Bieu mau', dataIndex: 'formType', key: 'form', width: 120 },
          { title: 'Muc do', dataIndex: 'severity', key: 'sev', width: 90,
            render: (v: string) => <Tag color={severityColors[v] || 'default'}>{v === 'Error' ? 'Loi' : v === 'Warning' ? 'Canh bao' : 'Thong tin'}</Tag> },
          { title: 'Thong bao loi', dataIndex: 'errorMessage', key: 'err', ellipsis: true },
          { title: 'Trang thai', dataIndex: 'isActive', key: 'active', width: 80,
            render: (v: boolean) => v ? <Tag color="green">Hoat dong</Tag> : <Tag>Tat</Tag> },
          { title: '', key: 'actions', width: 80,
            render: (_: unknown, r: AutoCheckRuleDto) => (
              <Space orientation="horizontal" size={4}>
                <Button size="small" icon={<EditOutlined />} onClick={() => openModal(r)} />
                <Popconfirm title="Xoa quy tac?" onConfirm={() => handleDelete(r.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal title={editingRule ? 'Chinh sua quy tac' : 'Them quy tac'} open={modalOpen}
        onOk={handleSave} onCancel={() => setModalOpen(false)} okText="Luu" cancelText="Huy" width={550}>
        <Form form={form} layout="vertical" size="small">
          <Form.Item name="name" label="Ten quy tac" rules={[{ required: true, message: 'Nhap ten quy tac' }]}>
            <Input placeholder="VD: Bat buoc nhap chan doan" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="ruleType" label="Loai quy tac" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="RequiredField">Bat buoc truong</Select.Option>
                  <Select.Option value="RequiredForm">Bat buoc bieu mau</Select.Option>
                  <Select.Option value="RequiredSignature">Bat buoc chu ky</Select.Option>
                  <Select.Option value="DataValidation">Kiem tra du lieu</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="formType" label="Bieu mau ap dung">
                <Select allowClear placeholder="Tat ca">
                  <Select.Option value="examination">Kham benh</Select.Option>
                  <Select.Option value="treatment-sheet">Phieu dieu tri</Select.Option>
                  <Select.Option value="consultation">Hoi chan</Select.Option>
                  <Select.Option value="nursing-care">Cham soc</Select.Option>
                  <Select.Option value="prescription">Don thuoc</Select.Option>
                  <Select.Option value="discharge">Ra vien</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="severity" label="Muc do" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="Error">Loi (chan)</Select.Option>
                  <Select.Option value="Warning">Canh bao</Select.Option>
                  <Select.Option value="Info">Thong tin</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="fieldName" label="Ten truong">
            <Input placeholder="VD: mainIcdCode, chiefComplaint, conclusion" />
          </Form.Item>
          <Form.Item name="condition" label="Dieu kien" rules={[{ required: true, message: 'Nhap dieu kien' }]}>
            <Input placeholder="VD: NOT_EMPTY, LENGTH > 10, MATCHES [A-Z]\\d+" />
          </Form.Item>
          <Form.Item name="errorMessage" label="Thong bao loi" rules={[{ required: true, message: 'Nhap thong bao loi' }]}>
            <TextArea rows={2} placeholder="Thong bao hien khi vi pham quy tac" />
          </Form.Item>
          <Form.Item name="isActive" label="Trang thai" valuePropName="checked">
            <Switch checkedChildren="Hoat dong" unCheckedChildren="Tat" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

// ============ Main Component ============
const EmrManagementTabs: React.FC = () => {
  const items = [
    {
      key: 'sharing',
      label: <><ShareAltOutlined /> Chia se</>,
      children: <SharingTab />,
    },
    {
      key: 'extracts',
      label: <><FileProtectOutlined /> Trich luc</>,
      children: <ExtractTab />,
    },
    {
      key: 'spine',
      label: <><OrderedListOutlined /> Gay</>,
      children: <SpineTab />,
    },
    {
      key: 'images',
      label: <><PictureOutlined /> Hinh anh</>,
      children: <ImagesTab />,
    },
    {
      key: 'shortcodes',
      label: <><CodeOutlined /> Ma tat</>,
      children: <ShortcodesTab />,
    },
    {
      key: 'autocheck',
      label: <><SafetyOutlined /> Kiem tra</>,
      children: <AutoCheckTab />,
    },
  ];

  return <Tabs items={items} size="small" tabBarGutter={8} />;
};

export default EmrManagementTabs;
