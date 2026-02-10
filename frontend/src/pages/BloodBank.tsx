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
  Form,
  Select,
  InputNumber,
  Typography,
  message,
  Tabs,
  Badge,
  Descriptions,
  DatePicker,
  Alert,
  Divider,
  Statistic,
} from 'antd';
import {
  SearchOutlined,
  PrinterOutlined,
  ExportOutlined,
  ImportOutlined,
  MedicineBoxOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  BarcodeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import bloodBankApi from '../api/bloodBank';

const { Title, Text } = Typography;
const { Search } = Input;

// Interfaces
interface BloodUnit {
  id: string;
  unitCode: string;
  bloodType: string;
  component: string;
  volume: number;
  expiryDate: string;
  receiveDate: string;
  supplier: string;
  status: number; // 0: Available, 1: Reserved, 2: Used, 3: Expired, 4: Discarded
  location: string;
  donorId?: string;
  testResults?: string;
}

interface BloodRequest {
  id: string;
  requestCode: string;
  patientCode: string;
  patientName: string;
  bloodType: string;
  component: string;
  quantity: number;
  urgency: number; // 0: Normal, 1: Urgent, 2: Emergency
  requestDate: string;
  requestedBy: string;
  department: string;
  status: number; // 0: Pending, 1: Approved, 2: Issued, 3: Transfused, 4: Cancelled
  reason: string;
}

const BloodBank: React.FC = () => {
  const [activeTab, setActiveTab] = useState('inventory');
  const [inventory, setInventory] = useState<BloodUnit[]>([]);
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [_selectedUnit, _setSelectedUnit] = useState<BloodUnit | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<BloodRequest | null>(null);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isRequestDetailModalOpen, setIsRequestDetailModalOpen] = useState(false);
  const [receiveForm] = Form.useForm();
  const [issueForm] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Fetch blood inventory data from API
  const fetchBloodInventory = async () => {
    setLoading(true);
    try {
      const response = await bloodBankApi.getBloodStockDetail();
      if (response && response.data) {
        // Map API data to local BloodUnit format
        const units: BloodUnit[] = response.data.map((item: any) => ({
          id: item.bloodBagId,
          unitCode: item.bagCode,
          bloodType: item.bloodType + item.rhFactor,
          component: item.productTypeName,
          volume: item.volume,
          expiryDate: item.expiryDate,
          receiveDate: item.collectionDate,
          supplier: '',
          status: item.status === 'Available' ? 0 : item.status === 'Reserved' ? 1 : item.status === 'Used' ? 2 : item.status === 'Expired' ? 3 : 4,
          location: item.storageLocation || '',
        }));
        setInventory(units);
      }
    } catch (error) {
      console.error('Error fetching blood inventory:', error);
      message.error('Không thể tải danh sách tồn kho máu');
    } finally {
      setLoading(false);
    }
  };

  // Fetch blood requests data from API
  const fetchBloodRequests = async () => {
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const monthAgo = dayjs().subtract(30, 'day').format('YYYY-MM-DD');
      const response = await bloodBankApi.getIssueRequests(monthAgo, today);
      if (response && response.data) {
        // Map API data to local BloodRequest format
        const reqs: BloodRequest[] = response.data.map((item: any) => ({
          id: item.id,
          requestCode: item.requestCode,
          patientCode: item.patientCode || '',
          patientName: item.patientName || '',
          bloodType: item.bloodType + item.rhFactor,
          component: item.productTypeName,
          quantity: item.requestedQuantity,
          urgency: item.urgency === 'Emergency' ? 2 : item.urgency === 'Urgent' ? 1 : 0,
          requestDate: item.requestDate,
          requestedBy: item.requestedByName,
          department: item.departmentName,
          status: item.status === 'Pending' ? 0 : item.status === 'Approved' ? 1 : item.status === 'Issued' ? 2 : item.status === 'Transfused' ? 3 : 4,
          reason: item.clinicalIndication || '',
        }));
        setRequests(reqs);
      }
    } catch (error) {
      console.error('Error fetching blood requests:', error);
      message.error('Không thể tải danh sách yêu cầu máu');
    }
  };

  useEffect(() => {
    fetchBloodInventory();
    fetchBloodRequests();
  }, []);

  // Get status tag for blood unit
  const getUnitStatusTag = (status: number) => {
    switch (status) {
      case 0:
        return <Tag color="green" icon={<CheckCircleOutlined />}>Sẵn sàng</Tag>;
      case 1:
        return <Tag color="blue" icon={<ClockCircleOutlined />}>Đã đặt</Tag>;
      case 2:
        return <Tag color="purple">Đã sử dụng</Tag>;
      case 3:
        return <Tag color="red" icon={<WarningOutlined />}>Hết hạn</Tag>;
      case 4:
        return <Tag color="default">Đã hủy</Tag>;
      default:
        return <Tag>Không xác định</Tag>;
    }
  };

  // Get status tag for request
  const getRequestStatusTag = (status: number) => {
    switch (status) {
      case 0:
        return <Tag color="orange" icon={<ClockCircleOutlined />}>Chờ duyệt</Tag>;
      case 1:
        return <Tag color="blue" icon={<CheckCircleOutlined />}>Đã duyệt</Tag>;
      case 2:
        return <Tag color="purple" icon={<ExportOutlined />}>Đã xuất</Tag>;
      case 3:
        return <Tag color="green" icon={<CheckCircleOutlined />}>Đã truyền</Tag>;
      case 4:
        return <Tag color="red">Đã hủy</Tag>;
      default:
        return <Tag>Không xác định</Tag>;
    }
  };

  // Get urgency badge
  const getUrgencyBadge = (urgency: number) => {
    switch (urgency) {
      case 0:
        return <Badge status="default" text="Bình thường" />;
      case 1:
        return <Badge status="warning" text="Cần gấp" />;
      case 2:
        return <Badge status="error" text="Cấp cứu" />;
      default:
        return <Badge status="default" text="Không xác định" />;
    }
  };

  // Check expiry status
  const getExpiryStatus = (expiryDate: string) => {
    const daysUntilExpiry = dayjs(expiryDate).diff(dayjs(), 'day');
    if (daysUntilExpiry < 0) {
      return <Tag color="red">Đã hết hạn</Tag>;
    } else if (daysUntilExpiry <= 7) {
      return <Tag color="orange">Sắp hết hạn ({daysUntilExpiry} ngày)</Tag>;
    } else if (daysUntilExpiry <= 30) {
      return <Tag color="gold">{daysUntilExpiry} ngày</Tag>;
    }
    return <Tag color="green">{daysUntilExpiry} ngày</Tag>;
  };

  // Handle receive blood
  const handleReceiveBlood = () => {
    setIsReceiveModalOpen(true);
    receiveForm.resetFields();
    receiveForm.setFieldsValue({
      receiveDate: dayjs(),
    });
  };

  const handleReceiveSubmit = () => {
    receiveForm.validateFields().then((values) => {
      const newUnit: BloodUnit = {
        id: `${Date.now()}`,
        unitCode: `BU${dayjs().format('YYMMDD')}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        bloodType: values.bloodType,
        component: values.component,
        volume: values.volume,
        expiryDate: values.expiryDate.format('YYYY-MM-DD'),
        receiveDate: values.receiveDate.format('YYYY-MM-DD'),
        supplier: values.supplier,
        status: 0,
        location: values.location,
      };

      setInventory(prev => [...prev, newUnit]);
      message.success(`Đã nhập đơn vị máu ${newUnit.unitCode}`);
      setIsReceiveModalOpen(false);
      receiveForm.resetFields();
    });
  };

  // Handle approve request
  const handleApproveRequest = (record: BloodRequest) => {
    Modal.confirm({
      title: 'Xác nhận duyệt yêu cầu',
      content: `Bạn có chắc chắn muốn duyệt yêu cầu ${record.requestCode}?`,
      onOk: () => {
        setRequests(prev =>
          prev.map(req =>
            req.id === record.id ? { ...req, status: 1 } : req
          )
        );
        message.success('Đã duyệt yêu cầu');
      },
    });
  };

  // Handle issue blood
  const handleIssueBlood = (record: BloodRequest) => {
    setSelectedRequest(record);
    setIsIssueModalOpen(true);
    issueForm.resetFields();
  };

  const handleIssueSubmit = () => {
    issueForm.validateFields().then((values) => {
      // Update request status
      setRequests(prev =>
        prev.map(req =>
          req.id === selectedRequest?.id ? { ...req, status: 2 } : req
        )
      );

      // Update inventory status
      values.selectedUnits.forEach((unitId: string) => {
        setInventory(prev =>
          prev.map(unit =>
            unit.id === unitId ? { ...unit, status: 2 } : unit
          )
        );
      });

      message.success('Đã xuất máu cho bệnh nhân');
      setIsIssueModalOpen(false);
      setSelectedRequest(null);
      issueForm.resetFields();
    });
  };

  // Inventory columns
  const inventoryColumns: ColumnsType<BloodUnit> = [
    {
      title: 'Mã đơn vị',
      dataIndex: 'unitCode',
      key: 'unitCode',
      width: 130,
      fixed: 'left',
      render: (code) => <Text code strong>{code}</Text>,
    },
    {
      title: 'Nhóm máu',
      dataIndex: 'bloodType',
      key: 'bloodType',
      width: 100,
      render: (type) => <Tag color="red">{type}</Tag>,
      filters: [
        { text: 'A+', value: 'A+' },
        { text: 'A-', value: 'A-' },
        { text: 'B+', value: 'B+' },
        { text: 'B-', value: 'B-' },
        { text: 'AB+', value: 'AB+' },
        { text: 'AB-', value: 'AB-' },
        { text: 'O+', value: 'O+' },
        { text: 'O-', value: 'O-' },
      ],
      onFilter: (value, record) => record.bloodType === value,
    },
    {
      title: 'Thành phần',
      dataIndex: 'component',
      key: 'component',
      width: 150,
    },
    {
      title: 'Thể tích (ml)',
      dataIndex: 'volume',
      key: 'volume',
      width: 100,
      align: 'right',
    },
    {
      title: 'Hạn sử dụng',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      width: 150,
      render: (date) => (
        <Space direction="vertical" size={0}>
          <Text>{dayjs(date).format('DD/MM/YYYY')}</Text>
          {getExpiryStatus(date)}
        </Space>
      ),
      sorter: (a, b) => dayjs(a.expiryDate).unix() - dayjs(b.expiryDate).unix(),
    },
    {
      title: 'Nhà cung cấp',
      dataIndex: 'supplier',
      key: 'supplier',
      width: 150,
    },
    {
      title: 'Vị trí',
      dataIndex: 'location',
      key: 'location',
      width: 130,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => getUnitStatusTag(status),
      filters: [
        { text: 'Sẵn sàng', value: 0 },
        { text: 'Đã đặt', value: 1 },
        { text: 'Đã sử dụng', value: 2 },
        { text: 'Hết hạn', value: 3 },
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
            icon={<PrinterOutlined />}
            onClick={() => message.info(`In nhãn ${record.unitCode}`)}
          >
            In nhãn
          </Button>
        </Space>
      ),
    },
  ];

  // Request columns
  const requestColumns: ColumnsType<BloodRequest> = [
    {
      title: 'Mã yêu cầu',
      dataIndex: 'requestCode',
      key: 'requestCode',
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
      title: 'Nhóm máu',
      dataIndex: 'bloodType',
      key: 'bloodType',
      width: 100,
      render: (type) => <Tag color="red">{type}</Tag>,
    },
    {
      title: 'Thành phần',
      dataIndex: 'component',
      key: 'component',
      width: 130,
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      align: 'center',
    },
    {
      title: 'Độ ưu tiên',
      dataIndex: 'urgency',
      key: 'urgency',
      width: 120,
      render: (urgency) => getUrgencyBadge(urgency),
      sorter: (a, b) => b.urgency - a.urgency,
    },
    {
      title: 'Khoa/Phòng',
      dataIndex: 'department',
      key: 'department',
      width: 130,
    },
    {
      title: 'Bác sĩ yêu cầu',
      dataIndex: 'requestedBy',
      key: 'requestedBy',
      width: 150,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => getRequestStatusTag(status),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            onClick={() => {
              setSelectedRequest(record);
              setIsRequestDetailModalOpen(true);
            }}
          >
            Chi tiết
          </Button>
          {record.status === 0 && (
            <Button
              type="primary"
              size="small"
              onClick={() => handleApproveRequest(record)}
            >
              Duyệt
            </Button>
          )}
          {record.status === 1 && (
            <Button
              type="primary"
              size="small"
              icon={<ExportOutlined />}
              onClick={() => handleIssueBlood(record)}
            >
              Xuất
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // Stats
  const availableUnits = inventory.filter(u => u.status === 0).length;
  const reservedUnits = inventory.filter(u => u.status === 1).length;
  const expiringUnits = inventory.filter(u => u.status === 0 && dayjs(u.expiryDate).diff(dayjs(), 'day') <= 7).length;
  const pendingRequests = requests.filter(r => r.status === 0).length;

  return (
    <div>
      <Title level={4}>Quản lý Ngân hàng Máu</Title>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Đơn vị sẵn sàng"
              value={availableUnits}
              valueStyle={{ color: '#52c41a' }}
              prefix={<MedicineBoxOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Đã đặt trước"
              value={reservedUnits}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Sắp hết hạn"
              value={expiringUnits}
              valueStyle={{ color: expiringUnits > 0 ? '#faad14' : '#52c41a' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Yêu cầu chờ duyệt"
              value={pendingRequests}
              valueStyle={{ color: pendingRequests > 0 ? '#ff4d4f' : '#52c41a' }}
              prefix={<ClockCircleOutlined />}
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
              key: 'inventory',
              label: (
                <span>
                  <MedicineBoxOutlined />
                  Kho máu
                  {availableUnits > 0 && <Badge count={availableUnits} style={{ marginLeft: 8 }} />}
                </span>
              ),
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col flex="auto">
                      <Search
                        placeholder="Tìm theo mã đơn vị, nhóm máu..."
                        allowClear
                        enterButton={<SearchOutlined />}
                        style={{ maxWidth: 400 }}
                      />
                    </Col>
                    <Col>
                      <Button
                        type="primary"
                        icon={<ImportOutlined />}
                        onClick={handleReceiveBlood}
                      >
                        Nhập máu
                      </Button>
                    </Col>
                  </Row>

                  {expiringUnits > 0 && (
                    <Alert
                      message={`Có ${expiringUnits} đơn vị máu sắp hết hạn trong 7 ngày tới`}
                      type="warning"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                  )}

                  <Table
                    columns={inventoryColumns}
                    dataSource={inventory}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1400 }}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} đơn vị`,
                    }}
                  />
                </>
              ),
            },
            {
              key: 'requests',
              label: (
                <span>
                  <ClockCircleOutlined />
                  Yêu cầu máu
                  {pendingRequests > 0 && <Badge count={pendingRequests} style={{ marginLeft: 8 }} />}
                </span>
              ),
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col flex="auto">
                      <Search
                        placeholder="Tìm theo mã yêu cầu, mã BN, tên BN..."
                        allowClear
                        enterButton={<SearchOutlined />}
                        style={{ maxWidth: 400 }}
                      />
                    </Col>
                  </Row>

                  <Table
                    columns={requestColumns}
                    dataSource={requests}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1500 }}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} yêu cầu`,
                    }}
                  />
                </>
              ),
            },
          ]}
        />
      </Card>

      {/* Receive Blood Modal */}
      <Modal
        title={
          <Space>
            <ImportOutlined />
            <span>Nhập máu từ nhà cung cấp</span>
          </Space>
        }
        open={isReceiveModalOpen}
        onOk={handleReceiveSubmit}
        onCancel={() => {
          setIsReceiveModalOpen(false);
          receiveForm.resetFields();
        }}
        width={700}
        okText="Nhập kho"
        cancelText="Hủy"
      >
        <Form form={receiveForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="bloodType"
                label="Nhóm máu"
                rules={[{ required: true, message: 'Vui lòng chọn nhóm máu' }]}
              >
                <Select placeholder="Chọn nhóm máu">
                  <Select.Option value="A+">A+</Select.Option>
                  <Select.Option value="A-">A-</Select.Option>
                  <Select.Option value="B+">B+</Select.Option>
                  <Select.Option value="B-">B-</Select.Option>
                  <Select.Option value="AB+">AB+</Select.Option>
                  <Select.Option value="AB-">AB-</Select.Option>
                  <Select.Option value="O+">O+</Select.Option>
                  <Select.Option value="O-">O-</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="component"
                label="Thành phần máu"
                rules={[{ required: true, message: 'Vui lòng chọn thành phần' }]}
              >
                <Select placeholder="Chọn thành phần">
                  <Select.Option value="Máu toàn phần">Máu toàn phần</Select.Option>
                  <Select.Option value="Hồng cầu khối">Hồng cầu khối</Select.Option>
                  <Select.Option value="Hồng cầu rửa">Hồng cầu rửa</Select.Option>
                  <Select.Option value="Tiểu cầu">Tiểu cầu</Select.Option>
                  <Select.Option value="Huyết tương tươi">Huyết tương tươi</Select.Option>
                  <Select.Option value="Tủa lạnh">Tủa lạnh</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="volume"
                label="Thể tích (ml)"
                rules={[{ required: true, message: 'Vui lòng nhập thể tích' }]}
              >
                <InputNumber style={{ width: '100%' }} min={100} max={500} placeholder="Nhập thể tích" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="supplier"
                label="Nhà cung cấp"
                rules={[{ required: true, message: 'Vui lòng chọn nhà cung cấp' }]}
              >
                <Select placeholder="Chọn nhà cung cấp">
                  <Select.Option value="Viện Huyết học">Viện Huyết học</Select.Option>
                  <Select.Option value="Ngân hàng máu TP">Ngân hàng máu TP</Select.Option>
                  <Select.Option value="Trung tâm Truyền máu">Trung tâm Truyền máu</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="receiveDate"
                label="Ngày nhập"
                rules={[{ required: true, message: 'Vui lòng chọn ngày nhập' }]}
              >
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="expiryDate"
                label="Hạn sử dụng"
                rules={[{ required: true, message: 'Vui lòng chọn hạn sử dụng' }]}
              >
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="location"
            label="Vị trí lưu trữ"
            rules={[{ required: true, message: 'Vui lòng chọn vị trí' }]}
          >
            <Select placeholder="Chọn vị trí lưu trữ">
              <Select.Option value="Kho A - Ngăn 1">Kho A - Ngăn 1</Select.Option>
              <Select.Option value="Kho A - Ngăn 2">Kho A - Ngăn 2</Select.Option>
              <Select.Option value="Kho B - Ngăn 1">Kho B - Ngăn 1</Select.Option>
              <Select.Option value="Kho B - Ngăn 2">Kho B - Ngăn 2</Select.Option>
              <Select.Option value="Kho C - Ngăn 1">Kho C - Ngăn 1</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Issue Blood Modal */}
      <Modal
        title={
          <Space>
            <ExportOutlined />
            <span>Xuất máu cho bệnh nhân</span>
          </Space>
        }
        open={isIssueModalOpen}
        onOk={handleIssueSubmit}
        onCancel={() => {
          setIsIssueModalOpen(false);
          setSelectedRequest(null);
          issueForm.resetFields();
        }}
        width={800}
        okText="Xuất máu"
        cancelText="Hủy"
      >
        {selectedRequest && (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Mã yêu cầu">{selectedRequest.requestCode}</Descriptions.Item>
              <Descriptions.Item label="Mã BN">{selectedRequest.patientCode}</Descriptions.Item>
              <Descriptions.Item label="Họ tên BN">{selectedRequest.patientName}</Descriptions.Item>
              <Descriptions.Item label="Nhóm máu">
                <Tag color="red">{selectedRequest.bloodType}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Thành phần">{selectedRequest.component}</Descriptions.Item>
              <Descriptions.Item label="Số lượng yêu cầu">{selectedRequest.quantity} đơn vị</Descriptions.Item>
              <Descriptions.Item label="Lý do" span={2}>{selectedRequest.reason}</Descriptions.Item>
            </Descriptions>

            <Divider>Chọn đơn vị máu</Divider>

            <Form form={issueForm} layout="vertical">
              <Form.Item
                name="selectedUnits"
                label="Đơn vị máu"
                rules={[{ required: true, message: 'Vui lòng chọn đơn vị máu' }]}
              >
                <Select
                  mode="multiple"
                  placeholder="Chọn các đơn vị máu"
                  style={{ width: '100%' }}
                >
                  {inventory
                    .filter(u => u.status === 0 && u.bloodType === selectedRequest.bloodType && u.component === selectedRequest.component)
                    .map(unit => (
                      <Select.Option key={unit.id} value={unit.id}>
                        <Space>
                          <BarcodeOutlined />
                          {unit.unitCode} - {unit.volume}ml - HSD: {dayjs(unit.expiryDate).format('DD/MM/YYYY')}
                        </Space>
                      </Select.Option>
                    ))}
                </Select>
              </Form.Item>
            </Form>

            <Alert
              message="Lưu ý: Kiểm tra kỹ nhóm máu và thông tin bệnh nhân trước khi xuất"
              type="warning"
              showIcon
            />
          </>
        )}
      </Modal>

      {/* Request Detail Modal */}
      <Modal
        title="Chi tiết yêu cầu máu"
        open={isRequestDetailModalOpen}
        onCancel={() => {
          setIsRequestDetailModalOpen(false);
          setSelectedRequest(null);
        }}
        footer={[
          <Button key="close" onClick={() => setIsRequestDetailModalOpen(false)}>
            Đóng
          </Button>,
          <Button key="print" icon={<PrinterOutlined />} onClick={() => message.info('In phiếu yêu cầu')}>
            In phiếu
          </Button>,
        ]}
        width={700}
      >
        {selectedRequest && (
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Mã yêu cầu">{selectedRequest.requestCode}</Descriptions.Item>
            <Descriptions.Item label="Ngày yêu cầu">
              {dayjs(selectedRequest.requestDate).format('DD/MM/YYYY HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="Mã BN">{selectedRequest.patientCode}</Descriptions.Item>
            <Descriptions.Item label="Họ tên BN">{selectedRequest.patientName}</Descriptions.Item>
            <Descriptions.Item label="Nhóm máu">
              <Tag color="red">{selectedRequest.bloodType}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Thành phần">{selectedRequest.component}</Descriptions.Item>
            <Descriptions.Item label="Số lượng">{selectedRequest.quantity} đơn vị</Descriptions.Item>
            <Descriptions.Item label="Độ ưu tiên">{getUrgencyBadge(selectedRequest.urgency)}</Descriptions.Item>
            <Descriptions.Item label="Khoa/Phòng">{selectedRequest.department}</Descriptions.Item>
            <Descriptions.Item label="Bác sĩ yêu cầu">{selectedRequest.requestedBy}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">{getRequestStatusTag(selectedRequest.status)}</Descriptions.Item>
            <Descriptions.Item label="Lý do" span={2}>{selectedRequest.reason}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default BloodBank;
