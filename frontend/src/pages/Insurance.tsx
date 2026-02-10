import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Tag,
  Row,
  Col,
  Modal,
  Typography,
  message,
  Tabs,
  Badge,
  Descriptions,
  DatePicker,
  Alert,
  Statistic,
  Progress,
  Select,
  Tooltip,
} from 'antd';
import {
  SearchOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  FileExcelOutlined,
  CloudUploadOutlined,
  SyncOutlined,
  FileDoneOutlined,
  LockOutlined,
  ExportOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import * as insuranceApi from '../api/insurance';

const { Title, Text } = Typography;
const { Search } = Input;
const { RangePicker } = DatePicker;

// Interfaces
interface InsuranceClaim {
  id: string;
  claimCode: string;
  patientCode: string;
  patientName: string;
  insuranceNumber: string;
  visitDate: string;
  dischargeDate?: string;
  department: string;
  diagnosis: string;
  totalAmount: number;
  insuranceAmount: number;
  patientAmount: number;
  status: number; // 0: Draft, 1: Pending, 2: Submitted, 3: Approved, 4: Rejected, 5: Locked
  xmlStatus?: string;
  submittedDate?: string;
  approvedDate?: string;
  rejectReason?: string;
}

interface XmlBatch {
  id: string;
  batchCode: string;
  period: string;
  claimCount: number;
  totalAmount: number;
  createdDate: string;
  submittedDate?: string;
  status: number; // 0: Draft, 1: Ready, 2: Submitted, 3: Confirmed
  xmlType: string;
}

const Insurance: React.FC = () => {
  const [activeTab, setActiveTab] = useState('claims');
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [xmlBatches, setXmlBatches] = useState<XmlBatch[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<InsuranceClaim | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    fetchClaims();
    fetchXmlBatches();
  }, []);

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const result = await insuranceApi.searchInsuranceClaims({
        pageNumber: 1,
        pageSize: 100,
      });
      const mappedClaims: InsuranceClaim[] = ((result as any).data?.items || []).map((item: any) => ({
        id: item.id,
        claimCode: item.maLk,
        patientCode: item.patientCode,
        patientName: item.patientName,
        insuranceNumber: item.insuranceNumber,
        visitDate: item.admissionDate,
        dischargeDate: item.dischargeDate,
        department: '',
        diagnosis: `${item.diagnosisCode} - ${item.diagnosisName}`,
        totalAmount: item.totalAmount,
        insuranceAmount: item.insuranceAmount,
        patientAmount: item.patientAmount,
        status: item.status,
        submittedDate: item.submitDate,
        rejectReason: item.rejectReason,
      }));
      setClaims(mappedClaims);
    } catch (error) {
      message.error('Không thể tải danh sách hồ sơ giám định');
      console.error('Failed to fetch claims:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchXmlBatches = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const batches = await insuranceApi.getSettlementBatches(currentYear);
      const mappedBatches: XmlBatch[] = ((batches as any).data || []).map((batch: any) => ({
        id: batch.id,
        batchCode: batch.batchCode,
        period: `${batch.month.toString().padStart(2, '0')}/${batch.year}`,
        claimCount: batch.totalRecords,
        totalAmount: batch.totalAmount,
        createdDate: batch.createdAt,
        submittedDate: batch.submitDate,
        status: batch.status,
        xmlType: 'QĐ 4210',
      }));
      setXmlBatches(mappedBatches);
    } catch (error) {
      message.error('Không thể tải danh sách lô XML');
      console.error('Failed to fetch XML batches:', error);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  // Get status tag
  const getClaimStatusTag = (status: number) => {
    switch (status) {
      case 0:
        return <Tag color="default">Nháp</Tag>;
      case 1:
        return <Tag color="orange" icon={<ClockCircleOutlined />}>Chờ giám định</Tag>;
      case 2:
        return <Tag color="blue" icon={<CloudUploadOutlined />}>Đã gửi BHXH</Tag>;
      case 3:
        return <Tag color="green" icon={<CheckCircleOutlined />}>Đã duyệt</Tag>;
      case 4:
        return <Tag color="red" icon={<WarningOutlined />}>Từ chối</Tag>;
      case 5:
        return <Tag color="purple" icon={<LockOutlined />}>Đã khóa</Tag>;
      default:
        return <Tag>Không xác định</Tag>;
    }
  };

  // Get XML batch status tag
  const getXmlStatusTag = (status: number) => {
    switch (status) {
      case 0:
        return <Tag color="default">Nháp</Tag>;
      case 1:
        return <Tag color="blue">Sẵn sàng</Tag>;
      case 2:
        return <Tag color="orange" icon={<CloudUploadOutlined />}>Đã gửi</Tag>;
      case 3:
        return <Tag color="green" icon={<CheckCircleOutlined />}>Xác nhận</Tag>;
      default:
        return <Tag>Không xác định</Tag>;
    }
  };

  // Handle approve claims
  const handleApproveClaims = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Vui lòng chọn hồ sơ cần duyệt');
      return;
    }
    Modal.confirm({
      title: 'Xác nhận duyệt giám định',
      content: `Bạn có chắc chắn muốn duyệt ${selectedRowKeys.length} hồ sơ đã chọn?`,
      onOk: () => {
        message.success(`Đã duyệt ${selectedRowKeys.length} hồ sơ`);
        setSelectedRowKeys([]);
      },
    });
  };

  // Handle lock claims
  const handleLockClaims = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Vui lòng chọn hồ sơ cần khóa');
      return;
    }
    Modal.confirm({
      title: 'Xác nhận khóa giám định',
      content: `Bạn có chắc chắn muốn khóa ${selectedRowKeys.length} hồ sơ đã chọn? Hồ sơ sau khi khóa không thể chỉnh sửa.`,
      onOk: () => {
        message.success(`Đã khóa ${selectedRowKeys.length} hồ sơ`);
        setSelectedRowKeys([]);
      },
    });
  };

  // Handle export XML
  const handleExportXml = (type: string) => {
    Modal.confirm({
      title: `Xuất XML ${type}`,
      content: 'Bạn có chắc chắn muốn xuất file XML?',
      onOk: () => {
        message.success(`Đang xuất XML ${type}...`);
      },
    });
  };

  // Stats
  const totalClaims = claims.length;
  const pendingClaims = claims.filter(c => c.status === 1).length;
  const approvedClaims = claims.filter(c => c.status === 3).length;
  const rejectedClaims = claims.filter(c => c.status === 4).length;
  const totalInsuranceAmount = claims.reduce((sum, c) => sum + c.insuranceAmount, 0);

  // Claim columns
  const claimColumns: ColumnsType<InsuranceClaim> = [
    {
      title: 'Mã giám định',
      dataIndex: 'claimCode',
      key: 'claimCode',
      width: 130,
      fixed: 'left',
    },
    {
      title: 'Mã BN',
      dataIndex: 'patientCode',
      key: 'patientCode',
      width: 120,
    },
    {
      title: 'Họ tên BN',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 150,
    },
    {
      title: 'Số thẻ BHYT',
      dataIndex: 'insuranceNumber',
      key: 'insuranceNumber',
      width: 160,
      render: (num) => <Text code>{num}</Text>,
    },
    {
      title: 'Ngày khám',
      dataIndex: 'visitDate',
      key: 'visitDate',
      width: 110,
      render: (date) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Khoa/Phòng',
      dataIndex: 'department',
      key: 'department',
      width: 120,
    },
    {
      title: 'Chẩn đoán',
      dataIndex: 'diagnosis',
      key: 'diagnosis',
      width: 250,
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: 'BHYT chi trả',
      dataIndex: 'insuranceAmount',
      key: 'insuranceAmount',
      width: 140,
      align: 'right',
      render: (amount) => <Text type="success">{formatCurrency(amount)}</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status) => getClaimStatusTag(status),
      filters: [
        { text: 'Chờ giám định', value: 1 },
        { text: 'Đã gửi BHXH', value: 2 },
        { text: 'Đã duyệt', value: 3 },
        { text: 'Từ chối', value: 4 },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<FileSearchOutlined />}
            onClick={() => {
              setSelectedClaim(record);
              setIsDetailModalOpen(true);
            }}
          >
            Chi tiết
          </Button>
        </Space>
      ),
    },
  ];

  // XML batch columns
  const xmlColumns: ColumnsType<XmlBatch> = [
    {
      title: 'Mã lô',
      dataIndex: 'batchCode',
      key: 'batchCode',
      width: 150,
    },
    {
      title: 'Loại XML',
      dataIndex: 'xmlType',
      key: 'xmlType',
      width: 130,
      render: (type) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: 'Kỳ',
      dataIndex: 'period',
      key: 'period',
      width: 100,
    },
    {
      title: 'Số hồ sơ',
      dataIndex: 'claimCount',
      key: 'claimCount',
      width: 100,
      align: 'right',
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 180,
      align: 'right',
      render: (amount) => <Text strong>{formatCurrency(amount)}</Text>,
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdDate',
      key: 'createdDate',
      width: 120,
      render: (date) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Ngày gửi',
      dataIndex: 'submittedDate',
      key: 'submittedDate',
      width: 120,
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => getXmlStatusTag(status),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<ExportOutlined />}>
            Tải xuống
          </Button>
          {record.status === 1 && (
            <Button size="small" type="primary" icon={<CloudUploadOutlined />}>
              Gửi BHXH
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
    getCheckboxProps: (record: InsuranceClaim) => ({
      disabled: record.status === 5,
    }),
  };

  return (
    <div>
      <Title level={4}>Giám định BHYT</Title>

      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Tổng hồ sơ"
              value={totalClaims}
              prefix={<FileDoneOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Chờ giám định"
              value={pendingClaims}
              valueStyle={{ color: pendingClaims > 0 ? '#faad14' : '#52c41a' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Đã duyệt / Từ chối"
              value={approvedClaims}
              suffix={`/ ${rejectedClaims}`}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
            <Progress
              percent={Math.round((approvedClaims / (approvedClaims + rejectedClaims || 1)) * 100)}
              size="small"
              strokeColor="#52c41a"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Tổng BHYT chi trả"
              value={totalInsuranceAmount}
              precision={0}
              valueStyle={{ color: '#1890ff' }}
              suffix="VNĐ"
              formatter={(value) => new Intl.NumberFormat('vi-VN').format(value as number)}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'claims',
              label: (
                <span>
                  <FileDoneOutlined />
                  Hồ sơ giám định
                  {pendingClaims > 0 && <Badge count={pendingClaims} style={{ marginLeft: 8 }} />}
                </span>
              ),
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col flex="auto">
                      <Space>
                        <Search
                          placeholder="Tìm theo mã giám định, mã BN, số thẻ BHYT..."
                          allowClear
                          enterButton={<SearchOutlined />}
                          style={{ width: 400 }}
                        />
                        <RangePicker format="DD/MM/YYYY" />
                      </Space>
                    </Col>
                    <Col>
                      <Space>
                        <Button
                          type="primary"
                          icon={<CheckCircleOutlined />}
                          onClick={handleApproveClaims}
                          disabled={selectedRowKeys.length === 0}
                        >
                          Duyệt giám định
                        </Button>
                        <Button
                          icon={<LockOutlined />}
                          onClick={handleLockClaims}
                          disabled={selectedRowKeys.length === 0}
                        >
                          Khóa giám định
                        </Button>
                        <Button icon={<SyncOutlined />} onClick={() => message.info('Đang đồng bộ...')}>
                          Đồng bộ
                        </Button>
                      </Space>
                    </Col>
                  </Row>

                  {rejectedClaims > 0 && (
                    <Alert
                      message={`Có ${rejectedClaims} hồ sơ bị từ chối cần xử lý`}
                      type="warning"
                      showIcon
                      style={{ marginBottom: 16 }}
                      action={
                        <Button size="small" type="link">
                          Xem chi tiết
                        </Button>
                      }
                    />
                  )}

                  <Table
                    rowSelection={rowSelection}
                    columns={claimColumns}
                    dataSource={claims}
                    rowKey="id"
                    size="small"
                    loading={loading}
                    scroll={{ x: 1600 }}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} hồ sơ`,
                    }}
                  />
                </>
              ),
            },
            {
              key: 'xml',
              label: (
                <span>
                  <CloudUploadOutlined />
                  Xuất XML
                </span>
              ),
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col flex="auto">
                      <Space>
                        <Select defaultValue="4210" style={{ width: 200 }}>
                          <Select.Option value="4210">QĐ 4210 (Bảng 1,2,3,4,5)</Select.Option>
                          <Select.Option value="130">QĐ 130</Select.Option>
                          <Select.Option value="4750">QĐ 4750</Select.Option>
                          <Select.Option value="3176">QĐ 3176</Select.Option>
                          <Select.Option value="917">QĐ 917</Select.Option>
                        </Select>
                        <RangePicker picker="month" format="MM/YYYY" />
                      </Space>
                    </Col>
                    <Col>
                      <Space>
                        <Button
                          type="primary"
                          icon={<FileExcelOutlined />}
                          onClick={() => handleExportXml('QĐ 4210')}
                        >
                          Tạo XML
                        </Button>
                        <Button
                          icon={<CloudUploadOutlined />}
                          onClick={() => message.info('Gửi tự động lên cổng BHXH')}
                        >
                          Gửi tự động
                        </Button>
                      </Space>
                    </Col>
                  </Row>

                  <Table
                    columns={xmlColumns}
                    dataSource={xmlBatches}
                    rowKey="id"
                    size="small"
                    loading={loading}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} lô`,
                    }}
                  />
                </>
              ),
            },
            {
              key: 'reports',
              label: (
                <span>
                  <PrinterOutlined />
                  Báo cáo BHYT
                </span>
              ),
              children: (
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <Card
                      hoverable
                      onClick={() => message.info('Xuất báo cáo mẫu 19')}
                    >
                      <Space>
                        <PrinterOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                        <div>
                          <Text strong>Báo cáo mẫu 19</Text>
                          <br />
                          <Text type="secondary">Báo cáo tổng hợp KCB BHYT</Text>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card
                      hoverable
                      onClick={() => message.info('Xuất báo cáo mẫu 20')}
                    >
                      <Space>
                        <PrinterOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                        <div>
                          <Text strong>Báo cáo mẫu 20</Text>
                          <br />
                          <Text type="secondary">Chi tiết chi phí KCB BHYT</Text>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card
                      hoverable
                      onClick={() => message.info('Xuất báo cáo mẫu 21')}
                    >
                      <Space>
                        <PrinterOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
                        <div>
                          <Text strong>Báo cáo mẫu 21</Text>
                          <br />
                          <Text type="secondary">Báo cáo chi tiết theo đối tượng</Text>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card
                      hoverable
                      onClick={() => message.info('Xuất báo cáo mẫu 79')}
                    >
                      <Space>
                        <PrinterOutlined style={{ fontSize: 24, color: '#722ed1' }} />
                        <div>
                          <Text strong>Báo cáo mẫu 79</Text>
                          <br />
                          <Text type="secondary">Báo cáo chi tiết PTTT</Text>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card
                      hoverable
                      onClick={() => message.info('Xuất báo cáo mẫu 80')}
                    >
                      <Space>
                        <PrinterOutlined style={{ fontSize: 24, color: '#faad14' }} />
                        <div>
                          <Text strong>Báo cáo mẫu 80</Text>
                          <br />
                          <Text type="secondary">Tổng hợp chi phí thuốc BHYT</Text>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card
                      hoverable
                      onClick={() => message.info('Xuất báo cáo TT102')}
                    >
                      <Space>
                        <PrinterOutlined style={{ fontSize: 24, color: '#13c2c2' }} />
                        <div>
                          <Text strong>Báo cáo TT 102/2018</Text>
                          <br />
                          <Text type="secondary">Báo cáo theo Thông tư 102/2018/TT-BTC</Text>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                </Row>
              ),
            },
          ]}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title="Chi tiết hồ sơ giám định"
        open={isDetailModalOpen}
        onCancel={() => {
          setIsDetailModalOpen(false);
          setSelectedClaim(null);
        }}
        footer={[
          <Button key="print" icon={<PrinterOutlined />} onClick={() => message.info('In bảng kê')}>
            In bảng kê
          </Button>,
          <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
            Đóng
          </Button>,
        ]}
        width={800}
      >
        {selectedClaim && (
          <>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Mã giám định">{selectedClaim.claimCode}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">{getClaimStatusTag(selectedClaim.status)}</Descriptions.Item>
              <Descriptions.Item label="Mã BN">{selectedClaim.patientCode}</Descriptions.Item>
              <Descriptions.Item label="Họ tên BN">{selectedClaim.patientName}</Descriptions.Item>
              <Descriptions.Item label="Số thẻ BHYT" span={2}>
                <Text code>{selectedClaim.insuranceNumber}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Ngày khám">
                {dayjs(selectedClaim.visitDate).format('DD/MM/YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày ra viện">
                {selectedClaim.dischargeDate ? dayjs(selectedClaim.dischargeDate).format('DD/MM/YYYY') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Khoa/Phòng">{selectedClaim.department}</Descriptions.Item>
              <Descriptions.Item label="Chẩn đoán" span={2}>{selectedClaim.diagnosis}</Descriptions.Item>
              <Descriptions.Item label="Tổng chi phí">
                <Text strong>{formatCurrency(selectedClaim.totalAmount)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="BHYT chi trả">
                <Text type="success" strong>{formatCurrency(selectedClaim.insuranceAmount)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="BN chi trả">
                {formatCurrency(selectedClaim.patientAmount)}
              </Descriptions.Item>
              {selectedClaim.submittedDate && (
                <Descriptions.Item label="Ngày gửi BHXH">
                  {dayjs(selectedClaim.submittedDate).format('DD/MM/YYYY')}
                </Descriptions.Item>
              )}
              {selectedClaim.approvedDate && (
                <Descriptions.Item label="Ngày duyệt">
                  {dayjs(selectedClaim.approvedDate).format('DD/MM/YYYY')}
                </Descriptions.Item>
              )}
              {selectedClaim.rejectReason && (
                <Descriptions.Item label="Lý do từ chối" span={2}>
                  <Text type="danger">{selectedClaim.rejectReason}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>

            {selectedClaim.status === 4 && (
              <Alert
                message="Hồ sơ bị từ chối"
                description={`Lý do: ${selectedClaim.rejectReason}. Vui lòng kiểm tra và cập nhật hồ sơ.`}
                type="error"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
          </>
        )}
      </Modal>
    </div>
  );
};

export default Insurance;
