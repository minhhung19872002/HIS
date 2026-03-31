import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography, Tabs, Table, Tag, Button, Space, Spin, Drawer,
  Statistic, Card, Row, Col, Input, Select, message, Modal, Popconfirm,
} from 'antd';
import {
  ReloadOutlined, CheckOutlined, CloseOutlined, EyeOutlined,
  SendOutlined, StopOutlined, FileTextOutlined, WarningOutlined,
  AlertOutlined, TeamOutlined,
} from '@ant-design/icons';
import { Alert, Badge } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  getPendingRequests,
  getSubmittedRequests,
  getHistory,
  approveSigningRequest,
  rejectSigningRequest,
  cancelSigningRequest,
  getSigningStats,
} from '../api/signingWorkflow';
import type { SigningRequestItem, SigningWorkflowStats } from '../api/signingWorkflow';

const { Title } = Typography;

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  TreatmentSheet: 'Phieu điều trị',
  NursingCare: 'Phieu chăm sóc',
  Prescription: 'Don thuoc',
  LabReport: 'Kết quả XN',
  RadiologyReport: 'Kết quả CDHA',
  DischargeSummary: 'Giay ra vien',
  SurgeryRecord: 'Phieu phẫu thuật',
  Consultation: 'Bien ban hoi chan',
  MedicalRecord: 'Ho so bệnh án',
  Other: 'Khac',
};

const STATUS_COLORS: Record<number, string> = {
  0: 'processing',
  1: 'success',
  2: 'error',
  3: 'default',
};

const STATUS_LABELS: Record<number, string> = {
  0: 'Cho duyet',
  1: 'Da duyet',
  2: 'Tu choi',
  3: 'Da huy',
};

const STATUS_ICONS: Record<number, React.ReactNode> = {
  0: <SendOutlined />,
  1: <CheckOutlined />,
  2: <CloseOutlined />,
  3: <StopOutlined />,
};

const SigningWorkflow: React.FC = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [pendingData, setPendingData] = useState<SigningRequestItem[]>([]);
  const [submittedData, setSubmittedData] = useState<SigningRequestItem[]>([]);
  const [historyData, setHistoryData] = useState<SigningRequestItem[]>([]);
  const [stats, setStats] = useState<SigningWorkflowStats | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SigningRequestItem | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterDocType, setFilterDocType] = useState<string | undefined>(undefined);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [batchApproving, setBatchApproving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (searchKeyword) params.keyword = searchKeyword;
      if (filterDocType) params.documentType = filterDocType;

      const results = await Promise.allSettled([
        getPendingRequests(params),
        getSubmittedRequests(params),
        getHistory(params),
        getSigningStats(),
      ]);

      if (results[0].status === 'fulfilled') setPendingData(results[0].value);
      if (results[1].status === 'fulfilled') setSubmittedData(results[1].value);
      if (results[2].status === 'fulfilled') setHistoryData(results[2].value);
      if (results[3].status === 'fulfilled') setStats(results[3].value);
    } catch {
      message.warning('Khong the tai du lieu trình ký');
    } finally {
      setLoading(false);
    }
  }, [searchKeyword, filterDocType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async (id: string) => {
    const result = await approveSigningRequest(id);
    if (result) {
      message.success('Da phe duyet thanh cong');
      fetchData();
    } else {
      message.warning('Phe duyet that bai');
    }
  };

  const handleRejectOpen = (id: string) => {
    setRejectingId(id);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectingId || !rejectReason.trim()) {
      message.warning('Vui long nhap ly do tu choi');
      return;
    }
    const result = await rejectSigningRequest(rejectingId, rejectReason);
    if (result) {
      message.success('Da tu choi yêu cầu');
      setRejectModalOpen(false);
      setRejectingId(null);
      setRejectReason('');
      fetchData();
    } else {
      message.warning('Tu choi that bai');
    }
  };

  const handleCancel = async (id: string) => {
    const result = await cancelSigningRequest(id);
    if (result) {
      message.success('Da huy yêu cầu trình ký');
      fetchData();
    } else {
      message.warning('Huy that bai');
    }
  };

  const handleBatchApprove = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Vui long chon it nhat 1 yêu cầu');
      return;
    }
    setBatchApproving(true);
    let successCount = 0;
    for (const id of selectedRowKeys) {
      const result = await approveSigningRequest(String(id));
      if (result) successCount++;
    }
    setBatchApproving(false);
    if (successCount > 0) {
      message.success(`Da phe duyet ${successCount}/${selectedRowKeys.length} yêu cầu`);
      setSelectedRowKeys([]);
      fetchData();
    } else {
      message.warning('Khong the phe duyet');
    }
  };

  const handleViewDetail = (record: SigningRequestItem) => {
    setSelectedRequest(record);
    setDrawerOpen(true);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('vi-VN');
  };

  const baseColumns: ColumnsType<SigningRequestItem> = [
    {
      title: 'Loại tài liệu',
      dataIndex: 'documentType',
      key: 'documentType',
      width: 150,
      render: (type: string) => (
        <Tag icon={<FileTextOutlined />} color="blue">
          {DOCUMENT_TYPE_LABELS[type] || type}
        </Tag>
      ),
    },
    {
      title: 'Tieu de',
      dataIndex: 'documentTitle',
      key: 'documentTitle',
      ellipsis: true,
    },
    {
      title: 'Bệnh nhân',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 150,
      render: (name: string) => name || '-',
    },
    {
      title: 'Khoa',
      dataIndex: 'departmentName',
      key: 'departmentName',
      width: 150,
      render: (name: string) => name || '-',
    },
    {
      title: 'Ngày gửi',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: formatDate,
    },
  ];

  const pendingColumns: ColumnsType<SigningRequestItem> = [
    ...baseColumns,
    {
      title: 'Người gửi',
      dataIndex: 'submittedByName',
      key: 'submittedByName',
      width: 150,
    },
    {
      title: 'Thao tac',
      key: 'actions',
      width: 250,
      render: (_: unknown, record: SigningRequestItem) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            Xem
          </Button>
          <Popconfirm title="Xac nhan phe duyet?" onConfirm={() => handleApprove(record.id)} okText="Duyet" cancelText="Huy">
            <Button size="small" type="primary" icon={<CheckOutlined />}>
              Duyet
            </Button>
          </Popconfirm>
          <Button size="small" danger icon={<CloseOutlined />} onClick={() => handleRejectOpen(record.id)}>
            Tu choi
          </Button>
        </Space>
      ),
    },
  ];

  const submittedColumns: ColumnsType<SigningRequestItem> = [
    ...baseColumns,
    {
      title: 'Nguoi duyet',
      dataIndex: 'assignedToName',
      key: 'assignedToName',
      width: 150,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: number) => (
        <Tag icon={STATUS_ICONS[status]} color={STATUS_COLORS[status]}>{STATUS_LABELS[status]}</Tag>
      ),
    },
    {
      title: 'Thao tac',
      key: 'actions',
      width: 180,
      render: (_: unknown, record: SigningRequestItem) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            Xem
          </Button>
          {record.status === 0 && (
            <Popconfirm title="Huy yêu cầu trình ký?" onConfirm={() => handleCancel(record.id)} okText="Huy" cancelText="Dong">
              <Button size="small" danger icon={<StopOutlined />}>
                Huy
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const historyColumns: ColumnsType<SigningRequestItem> = [
    ...baseColumns,
    {
      title: 'Người gửi',
      dataIndex: 'submittedByName',
      key: 'submittedByName',
      width: 130,
    },
    {
      title: 'Nguoi duyet',
      dataIndex: 'assignedToName',
      key: 'assignedToName',
      width: 130,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: number) => (
        <Tag icon={STATUS_ICONS[status]} color={STATUS_COLORS[status]}>{STATUS_LABELS[status]}</Tag>
      ),
    },
    {
      title: 'Ly do tu choi',
      dataIndex: 'rejectReason',
      key: 'rejectReason',
      width: 200,
      ellipsis: true,
      render: (reason: string) => reason || '-',
    },
    {
      title: 'Ngay ky',
      dataIndex: 'signedAt',
      key: 'signedAt',
      width: 160,
      render: formatDate,
    },
    {
      title: 'Thao tac',
      key: 'actions',
      width: 80,
      render: (_: unknown, record: SigningRequestItem) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
          Xem
        </Button>
      ),
    },
  ];

  // Warning indicators
  const overdueItems = pendingData.filter((item) => {
    if (!item.createdAt) return false;
    const created = new Date(item.createdAt).getTime();
    return Date.now() - created > 48 * 60 * 60 * 1000; // >48h
  });
  const duplicateGroups = pendingData.reduce<Record<string, SigningRequestItem[]>>((acc, item) => {
    const key = `${item.documentType}-${item.patientName || ''}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
  const duplicateCount = Object.values(duplicateGroups).filter((g) => g.length > 1).reduce((sum, g) => sum + g.length, 0);

  const pendingRowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  };

  const tabItems = [
    {
      key: 'pending',
      label: (
        <Badge count={pendingData.length} size="small" offset={[8, 0]}>
          <span>Chờ ký</span>
        </Badge>
      ),
      children: (
        <div>
          {overdueItems.length > 0 && (
            <Alert
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              title={`${overdueItems.length} yêu cầu qua han (>48h chua duyet)`}
              style={{ marginBottom: 12 }}
            />
          )}
          {duplicateCount > 0 && (
            <Alert
              type="info"
              showIcon
              icon={<AlertOutlined />}
              title={`${duplicateCount} yêu cầu trung lap (cung loai + bệnh nhân)`}
              style={{ marginBottom: 12 }}
            />
          )}
          {selectedRowKeys.length > 0 && (
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TeamOutlined />
              <span>Da chon {selectedRowKeys.length} yêu cầu</span>
              <Popconfirm
                title={`Phe duyet ${selectedRowKeys.length} yêu cầu cung luc?`}
                onConfirm={handleBatchApprove}
                okText="Duyet tat ca"
                cancelText="Huy"
              >
                <Button type="primary" size="small" icon={<CheckOutlined />} loading={batchApproving}>
                  Duyet dong loat
                </Button>
              </Popconfirm>
              <Button size="small" onClick={() => setSelectedRowKeys([])}>Bo chon</Button>
            </div>
          )}
          <Table
            rowSelection={pendingRowSelection}
            columns={pendingColumns}
            dataSource={pendingData}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: 'Không có yêu cầu chờ ký' }}
            rowClassName={(record) => {
              if (!record.createdAt) return '';
              const age = Date.now() - new Date(record.createdAt).getTime();
              if (age > 48 * 60 * 60 * 1000) return 'signing-row-overdue';
              if (age > 24 * 60 * 60 * 1000) return 'signing-row-warning';
              return '';
            }}
          />
          <style>{`
            .signing-row-overdue { background: #fff2f0 !important; }
            .signing-row-overdue:hover td { background: #ffccc7 !important; }
            .signing-row-warning { background: #fffbe6 !important; }
            .signing-row-warning:hover td { background: #fff1b8 !important; }
          `}</style>
        </div>
      ),
    },
    {
      key: 'submitted',
      label: (
        <Badge count={submittedData.filter((r) => r.status === 0).length} size="small" offset={[8, 0]}>
          <span>Đã trình</span>
        </Badge>
      ),
      children: (
        <Table
          columns={submittedColumns}
          dataSource={submittedData}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'Chua co yêu cầu nao' }}
        />
      ),
    },
    {
      key: 'history',
      label: `Đã xử lý (${historyData.length})`,

      children: (
        <Table
          columns={historyColumns}
          dataSource={historyData}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'Chua co lịch sử' }}
        />
      ),
    },
    {
      key: 'stats',
      label: 'Thống kê',
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic title="Cho duyet" value={stats?.pendingCount ?? 0} styles={{ content: { color: '#1890ff' } }} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic title="Da duyet" value={stats?.approvedCount ?? 0} styles={{ content: { color: '#52c41a' } }} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic title="Tu choi" value={stats?.rejectedCount ?? 0} styles={{ content: { color: '#ff4d4f' } }} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic title="Da huy" value={stats?.cancelledCount ?? 0} styles={{ content: { color: '#8c8c8c' } }} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic title="Tong cong" value={stats?.totalCount ?? 0} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic title="Gui hôm nay" value={stats?.todaySubmitted ?? 0} styles={{ content: { color: '#722ed1' } }} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic title="Duyet hôm nay" value={stats?.todayApproved ?? 0} styles={{ content: { color: '#13c2c2' } }} />
            </Card>
          </Col>
        </Row>
      ),
    },
  ];

  return (
    <Spin spinning={loading}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          <SendOutlined /> Trình ký
        </Title>
        <Space>
          <Input.Search
            placeholder="Tìm kiếm..."
            allowClear
            style={{ width: 220 }}
            onSearch={(val) => setSearchKeyword(val)}
          />
          <Select
            placeholder="Loại tài liệu"
            allowClear
            style={{ width: 170 }}
            onChange={(val) => setFilterDocType(val)}
            options={Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            Làm mới
          </Button>
        </Space>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

      {/* Document preview drawer */}
      <Drawer
        title={selectedRequest ? `Chi tiet: ${selectedRequest.documentTitle}` : 'Chi tiet'}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedRequest(null); }}
        size="large"
      >
        {selectedRequest && (
          <div>
            <Row gutter={[16, 12]}>
              <Col span={12}>
                <strong>Loại tài liệu:</strong>
                <br />
                <Tag color="blue">{DOCUMENT_TYPE_LABELS[selectedRequest.documentType] || selectedRequest.documentType}</Tag>
              </Col>
              <Col span={12}>
                <strong>Trạng thái:</strong>
                <br />
                <Tag color={STATUS_COLORS[selectedRequest.status]}>{STATUS_LABELS[selectedRequest.status]}</Tag>
              </Col>
              <Col span={12}>
                <strong>Người gửi:</strong>
                <br />
                {selectedRequest.submittedByName}
              </Col>
              <Col span={12}>
                <strong>Nguoi duyet:</strong>
                <br />
                {selectedRequest.assignedToName}
              </Col>
              <Col span={12}>
                <strong>Bệnh nhân:</strong>
                <br />
                {selectedRequest.patientName || '-'}
              </Col>
              <Col span={12}>
                <strong>Khoa:</strong>
                <br />
                {selectedRequest.departmentName || '-'}
              </Col>
              <Col span={12}>
                <strong>Ngày gửi:</strong>
                <br />
                {formatDate(selectedRequest.createdAt)}
              </Col>
              <Col span={12}>
                <strong>Ngay ky:</strong>
                <br />
                {formatDate(selectedRequest.signedAt)}
              </Col>
              {selectedRequest.rejectReason && (
                <Col span={24}>
                  <strong>Ly do tu choi:</strong>
                  <br />
                  <Tag color="error">{selectedRequest.rejectReason}</Tag>
                </Col>
              )}
            </Row>

            <div style={{ marginTop: 16 }}>
              <strong>Noi dung tài liệu:</strong>
              <div
                style={{
                  marginTop: 8,
                  padding: 16,
                  border: '1px solid #d9d9d9',
                  borderRadius: 8,
                  background: '#fafafa',
                  maxHeight: 400,
                  overflow: 'auto',
                }}
                dangerouslySetInnerHTML={{ __html: selectedRequest.documentContent || '<em>Không có noi dung</em>' }}
              />
            </div>

            {selectedRequest.status === 0 && (
              <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
                <Popconfirm title="Xac nhan phe duyet?" onConfirm={() => { handleApprove(selectedRequest.id); setDrawerOpen(false); }} okText="Duyet" cancelText="Huy">
                  <Button type="primary" icon={<CheckOutlined />}>Phe duyet</Button>
                </Popconfirm>
                <Button danger icon={<CloseOutlined />} onClick={() => { handleRejectOpen(selectedRequest.id); setDrawerOpen(false); }}>
                  Tu choi
                </Button>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Reject reason modal */}
      <Modal
        title="Tu choi yêu cầu trình ký"
        open={rejectModalOpen}
        onOk={handleRejectConfirm}
        onCancel={() => { setRejectModalOpen(false); setRejectingId(null); setRejectReason(''); }}
        okText="Xac nhan tu choi"
        cancelText="Dong"
        okButtonProps={{ danger: true }}
      >
        <div style={{ marginBottom: 8 }}>Ly do tu choi:</div>
        <Input.TextArea
          rows={4}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Nhap ly do tu choi..."
        />
      </Modal>
    </Spin>
  );
};

export default SigningWorkflow;
