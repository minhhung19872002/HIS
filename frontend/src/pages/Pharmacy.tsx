import React, { useState } from 'react';
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
  Typography,
  message,
  Tabs,
  Badge,
  Alert,
  Statistic,
  InputNumber,
  Drawer,
  Divider,
  Progress,
  Radio,
  Descriptions,
} from 'antd';
import {
  SearchOutlined,
  CheckOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  SyncOutlined,
  FileTextOutlined,
  SwapOutlined,
  BellOutlined,
  MedicineBoxOutlined,
  FilterOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Search } = Input;
const { TextArea } = Input;

// ==================== INTERFACES ====================

interface PendingPrescription {
  id: string;
  prescriptionCode: string;
  patientName: string;
  patientCode: string;
  doctorName: string;
  itemsCount: number;
  totalAmount: number;
  status: 'pending' | 'accepted' | 'dispensing' | 'completed' | 'rejected';
  priority: 'urgent' | 'normal';
  createdDate: string;
  department: string;
}

interface MedicationItem {
  id: string;
  medicationCode: string;
  medicationName: string;
  unit: string;
  quantity: number;
  dispensedQuantity: number;
  dosage: string;
  instruction: string;
  batches: BatchInfo[];
  selectedBatch?: string;
}

interface BatchInfo {
  batchNumber: string;
  expiryDate: string;
  availableQuantity: number;
  warehouse: string;
  manufacturingDate: string;
  recommendedFEFO: boolean;
}

interface InventoryItem {
  id: string;
  medicationCode: string;
  medicationName: string;
  category: string;
  unit: string;
  totalStock: number;
  minStock: number;
  maxStock: number;
  warehouse: string;
  nearestExpiry: string;
  averagePrice: number;
  status: 'normal' | 'low' | 'out' | 'expiring';
}

interface TransferRequest {
  id: string;
  transferCode: string;
  fromWarehouse: string;
  toWarehouse: string;
  requestedBy: string;
  requestedDate: string;
  itemsCount: number;
  status: 'pending' | 'approved' | 'rejected' | 'received';
  note?: string;
}

interface AlertItem {
  id: string;
  type: 'low_stock' | 'expiry' | 'interaction' | 'out_of_stock';
  severity: 'high' | 'medium' | 'low';
  medicationName?: string;
  message: string;
  createdDate: string;
  acknowledged: boolean;
}

// ==================== MOCK DATA ====================

const mockPendingPrescriptions: PendingPrescription[] = [
  {
    id: '1',
    prescriptionCode: 'PT26010001',
    patientName: 'Nguyễn Văn A',
    patientCode: 'BN26000001',
    doctorName: 'BS. Trần Văn B',
    itemsCount: 5,
    totalAmount: 450000,
    status: 'pending',
    priority: 'urgent',
    createdDate: '2026-01-30T08:30:00',
    department: 'Khoa Nội',
  },
  {
    id: '2',
    prescriptionCode: 'PT26010002',
    patientName: 'Trần Thị C',
    patientCode: 'BN26000002',
    doctorName: 'BS. Lê Thị D',
    itemsCount: 3,
    totalAmount: 280000,
    status: 'accepted',
    priority: 'normal',
    createdDate: '2026-01-30T09:00:00',
    department: 'Khoa Ngoại',
  },
  {
    id: '3',
    prescriptionCode: 'PT26010003',
    patientName: 'Phạm Văn E',
    patientCode: 'BN26000003',
    doctorName: 'BS. Hoàng Văn F',
    itemsCount: 7,
    totalAmount: 650000,
    status: 'pending',
    priority: 'normal',
    createdDate: '2026-01-30T09:15:00',
    department: 'Khoa Nhi',
  },
];

const mockMedicationItems: MedicationItem[] = [
  {
    id: '1',
    medicationCode: 'TH001',
    medicationName: 'Paracetamol 500mg',
    unit: 'Viên',
    quantity: 60,
    dispensedQuantity: 0,
    dosage: '1 viên x 3 lần/ngày',
    instruction: 'Uống sau ăn 30 phút',
    batches: [
      {
        batchNumber: 'LOT2024001',
        expiryDate: '2026-06-30',
        availableQuantity: 500,
        warehouse: 'Kho thuốc chính',
        manufacturingDate: '2024-06-01',
        recommendedFEFO: true,
      },
      {
        batchNumber: 'LOT2024015',
        expiryDate: '2026-12-31',
        availableQuantity: 1000,
        warehouse: 'Kho thuốc chính',
        manufacturingDate: '2024-12-01',
        recommendedFEFO: false,
      },
    ],
  },
  {
    id: '2',
    medicationCode: 'TH002',
    medicationName: 'Amoxicillin 500mg',
    unit: 'Viên',
    quantity: 30,
    dispensedQuantity: 0,
    dosage: '1 viên x 2 lần/ngày',
    instruction: 'Uống trước ăn 1 giờ',
    batches: [
      {
        batchNumber: 'LOT2024020',
        expiryDate: '2026-08-15',
        availableQuantity: 300,
        warehouse: 'Kho thuốc chính',
        manufacturingDate: '2024-08-01',
        recommendedFEFO: true,
      },
    ],
  },
];

const mockInventoryItems: InventoryItem[] = [
  {
    id: '1',
    medicationCode: 'TH001',
    medicationName: 'Paracetamol 500mg',
    category: 'Thuốc giảm đau',
    unit: 'Viên',
    totalStock: 1500,
    minStock: 500,
    maxStock: 2000,
    warehouse: 'Kho thuốc chính',
    nearestExpiry: '2026-06-30',
    averagePrice: 500,
    status: 'normal',
  },
  {
    id: '2',
    medicationCode: 'TH002',
    medicationName: 'Amoxicillin 500mg',
    category: 'Kháng sinh',
    unit: 'Viên',
    totalStock: 300,
    minStock: 400,
    maxStock: 1500,
    warehouse: 'Kho thuốc chính',
    nearestExpiry: '2026-08-15',
    averagePrice: 1200,
    status: 'low',
  },
  {
    id: '3',
    medicationCode: 'TH003',
    medicationName: 'Vitamin C 1000mg',
    category: 'Vitamin & khoáng chất',
    unit: 'Viên',
    totalStock: 50,
    minStock: 200,
    maxStock: 1000,
    warehouse: 'Kho thuốc chính',
    nearestExpiry: '2026-03-15',
    averagePrice: 800,
    status: 'expiring',
  },
  {
    id: '4',
    medicationCode: 'TH004',
    medicationName: 'Ibuprofen 400mg',
    category: 'Thuốc giảm đau',
    unit: 'Viên',
    totalStock: 0,
    minStock: 300,
    maxStock: 1200,
    warehouse: 'Kho thuốc chính',
    nearestExpiry: '',
    averagePrice: 900,
    status: 'out',
  },
];

const mockTransfers: TransferRequest[] = [
  {
    id: '1',
    transferCode: 'TF26010001',
    fromWarehouse: 'Kho thuốc chính',
    toWarehouse: 'Nhà thuốc tầng 1',
    requestedBy: 'Dược sĩ Nguyễn A',
    requestedDate: '2026-01-30T08:00:00',
    itemsCount: 5,
    status: 'pending',
    note: 'Yêu cầu bổ sung thuốc cấp cứu',
  },
  {
    id: '2',
    transferCode: 'TF26010002',
    fromWarehouse: 'Kho thuốc chính',
    toWarehouse: 'Nhà thuốc tầng 2',
    requestedBy: 'Dược sĩ Trần B',
    requestedDate: '2026-01-29T15:30:00',
    itemsCount: 3,
    status: 'approved',
  },
];

const mockAlerts: AlertItem[] = [
  {
    id: '1',
    type: 'low_stock',
    severity: 'high',
    medicationName: 'Amoxicillin 500mg',
    message: 'Thuốc Amoxicillin 500mg sắp hết (còn 300 viên, mức tối thiểu 400 viên)',
    createdDate: '2026-01-30T07:00:00',
    acknowledged: false,
  },
  {
    id: '2',
    type: 'expiry',
    severity: 'medium',
    medicationName: 'Vitamin C 1000mg',
    message: 'Lô thuốc LOT2024005 sắp hết hạn vào 15/03/2026 (còn 45 ngày)',
    createdDate: '2026-01-30T07:00:00',
    acknowledged: false,
  },
  {
    id: '3',
    type: 'out_of_stock',
    severity: 'high',
    medicationName: 'Ibuprofen 400mg',
    message: 'Thuốc Ibuprofen 400mg đã hết trong kho',
    createdDate: '2026-01-30T06:30:00',
    acknowledged: false,
  },
];

// ==================== MAIN COMPONENT ====================

const Pharmacy: React.FC = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingPrescriptions] = useState<PendingPrescription[]>(mockPendingPrescriptions);
  const [selectedPrescription, setSelectedPrescription] = useState<PendingPrescription | null>(null);
  const [medicationItems, setMedicationItems] = useState<MedicationItem[]>(mockMedicationItems);
  const [inventoryItems] = useState<InventoryItem[]>(mockInventoryItems);
  const [transfers] = useState<TransferRequest[]>(mockTransfers);
  const [alerts, setAlerts] = useState<AlertItem[]>(mockAlerts);
  const [dispensingDrawerVisible, setDispensingDrawerVisible] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [_form] = Form.useForm();
  const [transferForm] = Form.useForm();
  void _form;

  // ==================== TAB 1: PENDING PRESCRIPTIONS ====================

  const getPriorityTag = (priority: string) => {
    return priority === 'urgent' ? (
      <Tag icon={<ExclamationCircleOutlined />} color="error">
        Khẩn cấp
      </Tag>
    ) : (
      <Tag color="default">Bình thường</Tag>
    );
  };

  const getPrescriptionStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: { color: 'orange', text: 'Chờ xử lý' },
      accepted: { color: 'blue', text: 'Đã tiếp nhận' },
      dispensing: { color: 'processing', text: 'Đang cấp phát' },
      completed: { color: 'success', text: 'Hoàn thành' },
      rejected: { color: 'error', text: 'Từ chối' },
    };
    const { color, text } = statusMap[status] || { color: 'default', text: 'Không xác định' };
    return <Tag color={color}>{text}</Tag>;
  };

  const handleAcceptPrescription = (record: PendingPrescription) => {
    message.success(`Đã tiếp nhận đơn thuốc ${record.prescriptionCode}`);
    setSelectedPrescription(record);
    setDispensingDrawerVisible(true);
  };

  const handleRejectPrescription = (record: PendingPrescription) => {
    Modal.confirm({
      title: 'Xác nhận từ chối',
      content: `Bạn có chắc chắn muốn từ chối đơn thuốc ${record.prescriptionCode}?`,
      okText: 'Từ chối',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: () => {
        message.warning(`Đã từ chối đơn thuốc ${record.prescriptionCode}`);
      },
    });
  };

  const pendingPrescriptionsColumns: ColumnsType<PendingPrescription> = [
    {
      title: 'Mức độ',
      dataIndex: 'priority',
      key: 'priority',
      width: 120,
      render: (priority) => getPriorityTag(priority),
      sorter: (a, _b) => (a.priority === 'urgent' ? -1 : 1),
    },
    {
      title: 'Mã đơn thuốc',
      dataIndex: 'prescriptionCode',
      key: 'prescriptionCode',
      width: 130,
    },
    {
      title: 'Bệnh nhân',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 150,
      render: (text, record) => (
        <div>
          <div>{text}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.patientCode}
          </Text>
        </div>
      ),
    },
    {
      title: 'Bác sĩ',
      dataIndex: 'doctorName',
      key: 'doctorName',
      width: 140,
    },
    {
      title: 'Khoa',
      dataIndex: 'department',
      key: 'department',
      width: 120,
    },
    {
      title: 'Số loại thuốc',
      dataIndex: 'itemsCount',
      key: 'itemsCount',
      width: 100,
      align: 'center',
      render: (count) => <Badge count={count} showZero color="blue" />,
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 120,
      align: 'right',
      render: (amount) => `${amount.toLocaleString('vi-VN')} đ`,
    },
    {
      title: 'Thời gian',
      dataIndex: 'createdDate',
      key: 'createdDate',
      width: 150,
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => getPrescriptionStatusTag(status),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {record.status === 'pending' && (
            <>
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => handleAcceptPrescription(record)}
              >
                Tiếp nhận
              </Button>
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={() => handleRejectPrescription(record)}
              >
                Từ chối
              </Button>
            </>
          )}
          {record.status === 'accepted' && (
            <Button
              size="small"
              type="primary"
              icon={<MedicineBoxOutlined />}
              onClick={() => {
                setSelectedPrescription(record);
                setDispensingDrawerVisible(true);
              }}
            >
              Cấp phát
            </Button>
          )}
          <Button size="small" icon={<FileTextOutlined />}>
            Chi tiết
          </Button>
        </Space>
      ),
    },
  ];

  // ==================== TAB 2: DISPENSING ====================

  const getBatchStatusTag = (batch: BatchInfo) => {
    const daysUntilExpiry = dayjs(batch.expiryDate).diff(dayjs(), 'day');
    if (daysUntilExpiry < 90) {
      return <Tag color="warning">Gần hết hạn</Tag>;
    }
    if (batch.recommendedFEFO) {
      return <Tag color="success">Khuyến nghị FEFO</Tag>;
    }
    return <Tag color="default">Bình thường</Tag>;
  };

  const handleBatchSelect = (itemId: string, batchNumber: string) => {
    setMedicationItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, selectedBatch: batchNumber } : item
      )
    );
  };

  const handleDispenseQuantityChange = (itemId: string, value: number | null) => {
    setMedicationItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, dispensedQuantity: value || 0 } : item
      )
    );
  };

  const handleCompleteDispensing = () => {
    const notDispensed = medicationItems.filter(
      (item) => item.dispensedQuantity < item.quantity
    );

    if (notDispensed.length > 0) {
      Modal.confirm({
        title: 'Cảnh báo',
        content: `Còn ${notDispensed.length} thuốc chưa cấp phát đủ số lượng. Bạn có muốn tiếp tục?`,
        okText: 'Tiếp tục',
        cancelText: 'Hủy',
        onOk: () => {
          message.success('Hoàn thành cấp phát đơn thuốc');
          setDispensingDrawerVisible(false);
        },
      });
    } else {
      message.success('Hoàn thành cấp phát đơn thuốc');
      setDispensingDrawerVisible(false);
    }
  };

  const calculateDispenseProgress = () => {
    const totalQuantity = medicationItems.reduce((sum, item) => sum + item.quantity, 0);
    const dispensedQuantity = medicationItems.reduce(
      (sum, item) => sum + item.dispensedQuantity,
      0
    );
    return totalQuantity > 0 ? (dispensedQuantity / totalQuantity) * 100 : 0;
  };

  // ==================== TAB 3: INVENTORY ====================

  const getInventoryStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string; icon?: React.ReactNode }> = {
      normal: { color: 'success', text: 'Bình thường' },
      low: { color: 'warning', text: 'Sắp hết', icon: <WarningOutlined /> },
      out: { color: 'error', text: 'Hết hàng', icon: <ExclamationCircleOutlined /> },
      expiring: { color: 'orange', text: 'Gần hết hạn', icon: <ExclamationCircleOutlined /> },
    };
    const { color, text, icon } = statusMap[status] || {
      color: 'default',
      text: 'Không xác định',
    };
    return (
      <Tag icon={icon} color={color}>
        {text}
      </Tag>
    );
  };

  const inventoryColumns: ColumnsType<InventoryItem> = [
    {
      title: 'Mã thuốc',
      dataIndex: 'medicationCode',
      key: 'medicationCode',
      width: 100,
    },
    {
      title: 'Tên thuốc',
      dataIndex: 'medicationName',
      key: 'medicationName',
      width: 200,
    },
    {
      title: 'Danh mục',
      dataIndex: 'category',
      key: 'category',
      width: 150,
    },
    {
      title: 'Kho',
      dataIndex: 'warehouse',
      key: 'warehouse',
      width: 130,
    },
    {
      title: 'Tồn kho',
      dataIndex: 'totalStock',
      key: 'totalStock',
      width: 100,
      align: 'right',
      render: (stock, record) => (
        <div>
          <div>
            {stock} {record.unit}
          </div>
          <Text type="secondary" style={{ fontSize: 11 }}>
            Min: {record.minStock}
          </Text>
        </div>
      ),
    },
    {
      title: 'Hạn sử dụng gần nhất',
      dataIndex: 'nearestExpiry',
      key: 'nearestExpiry',
      width: 130,
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY') : 'N/A'),
    },
    {
      title: 'Giá TB',
      dataIndex: 'averagePrice',
      key: 'averagePrice',
      width: 100,
      align: 'right',
      render: (price) => `${price.toLocaleString('vi-VN')} đ`,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => getInventoryStatusTag(status),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 150,
      render: () => (
        <Space>
          <Button size="small">Chi tiết</Button>
          <Button size="small" type="link">
            Lịch sử
          </Button>
        </Space>
      ),
    },
  ];

  // ==================== TAB 4: TRANSFERS ====================

  const getTransferStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: { color: 'orange', text: 'Chờ duyệt' },
      approved: { color: 'blue', text: 'Đã duyệt' },
      rejected: { color: 'error', text: 'Từ chối' },
      received: { color: 'success', text: 'Đã nhận' },
    };
    const { color, text } = statusMap[status] || { color: 'default', text: 'Không xác định' };
    return <Tag color={color}>{text}</Tag>;
  };

  const transferColumns: ColumnsType<TransferRequest> = [
    {
      title: 'Mã phiếu',
      dataIndex: 'transferCode',
      key: 'transferCode',
      width: 120,
    },
    {
      title: 'Từ kho',
      dataIndex: 'fromWarehouse',
      key: 'fromWarehouse',
      width: 150,
    },
    {
      title: 'Đến kho',
      dataIndex: 'toWarehouse',
      key: 'toWarehouse',
      width: 150,
    },
    {
      title: 'Người yêu cầu',
      dataIndex: 'requestedBy',
      key: 'requestedBy',
      width: 130,
    },
    {
      title: 'Thời gian',
      dataIndex: 'requestedDate',
      key: 'requestedDate',
      width: 150,
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Số mặt hàng',
      dataIndex: 'itemsCount',
      key: 'itemsCount',
      width: 100,
      align: 'center',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => getTransferStatusTag(status),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          {record.status === 'pending' && (
            <>
              <Button size="small" type="primary">
                Duyệt
              </Button>
              <Button size="small" danger>
                Từ chối
              </Button>
            </>
          )}
          {record.status === 'approved' && (
            <Button size="small" type="primary">
              Xác nhận nhận
            </Button>
          )}
          <Button size="small">Chi tiết</Button>
        </Space>
      ),
    },
  ];

  const handleCreateTransfer = () => {
    transferForm.validateFields().then(() => {
      message.success('Tạo phiếu điều chuyển thành công');
      setTransferModalVisible(false);
      transferForm.resetFields();
    });
  };

  // ==================== TAB 5: ALERTS ====================

  const getAlertSeverityColor = (severity: string) => {
    const colorMap: Record<string, string> = {
      high: 'error',
      medium: 'warning',
      low: 'info',
    };
    return colorMap[severity] || 'default';
  };

  const getAlertIcon = (type: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      low_stock: <WarningOutlined />,
      expiry: <ExclamationCircleOutlined />,
      interaction: <ExclamationCircleOutlined />,
      out_of_stock: <CloseOutlined />,
    };
    return iconMap[type] || <BellOutlined />;
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      )
    );
    message.success('Đã xác nhận cảnh báo');
  };

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;

  // ==================== RENDER ====================

  const renderPendingPrescriptionsTab = () => (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Chờ xử lý"
              value={pendingPrescriptions.filter((p) => p.status === 'pending').length}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Đang cấp phát"
              value={pendingPrescriptions.filter((p) => p.status === 'dispensing').length}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Hoàn thành hôm nay"
              value={15}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Khẩn cấp"
              value={pendingPrescriptions.filter((p) => p.priority === 'urgent').length}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col flex="auto">
            <Search
              placeholder="Tìm theo mã đơn, mã BN, tên bệnh nhân..."
              allowClear
              enterButton={<SearchOutlined />}
              style={{ maxWidth: 400 }}
            />
          </Col>
          <Col>
            <Space>
              <Select defaultValue="all" style={{ width: 150 }}>
                <Select.Option value="all">Tất cả trạng thái</Select.Option>
                <Select.Option value="pending">Chờ xử lý</Select.Option>
                <Select.Option value="dispensing">Đang cấp phát</Select.Option>
              </Select>
              <Select defaultValue="all" style={{ width: 150 }}>
                <Select.Option value="all">Tất cả mức độ</Select.Option>
                <Select.Option value="urgent">Khẩn cấp</Select.Option>
                <Select.Option value="normal">Bình thường</Select.Option>
              </Select>
            </Space>
          </Col>
        </Row>

        <Table
          columns={pendingPrescriptionsColumns}
          dataSource={pendingPrescriptions}
          rowKey="id"
          size="small"
          scroll={{ x: 1400 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Tổng: ${total} đơn thuốc`,
          }}
        />
      </Card>
    </div>
  );

  const renderDispensingDrawer = () => (
    <Drawer
      title={
        <div>
          <div>Cấp phát thuốc</div>
          {selectedPrescription && (
            <Text type="secondary" style={{ fontSize: 14 }}>
              Đơn thuốc: {selectedPrescription.prescriptionCode} - Bệnh nhân:{' '}
              {selectedPrescription.patientName}
            </Text>
          )}
        </div>
      }
      placement="right"
      width={900}
      open={dispensingDrawerVisible}
      onClose={() => setDispensingDrawerVisible(false)}
      footer={
        <Space style={{ float: 'right' }}>
          <Button onClick={() => setDispensingDrawerVisible(false)}>Hủy</Button>
          <Button type="primary" icon={<CheckOutlined />} onClick={handleCompleteDispensing}>
            Hoàn thành cấp phát
          </Button>
        </Space>
      }
    >
      {selectedPrescription && (
        <>
          <Alert
            message={
              <div>
                <strong>Thông tin đơn thuốc</strong>
                <Descriptions size="small" column={2} style={{ marginTop: 8 }}>
                  <Descriptions.Item label="Bác sĩ">
                    {selectedPrescription.doctorName}
                  </Descriptions.Item>
                  <Descriptions.Item label="Khoa">
                    {selectedPrescription.department}
                  </Descriptions.Item>
                  <Descriptions.Item label="Tổng tiền">
                    {selectedPrescription.totalAmount.toLocaleString('vi-VN')} đ
                  </Descriptions.Item>
                  <Descriptions.Item label="Thời gian">
                    {dayjs(selectedPrescription.createdDate).format('DD/MM/YYYY HH:mm')}
                  </Descriptions.Item>
                </Descriptions>
              </div>
            }
            type="info"
            style={{ marginBottom: 16 }}
          />

          <div style={{ marginBottom: 16 }}>
            <Text strong>Tiến độ cấp phát:</Text>
            <Progress percent={Math.round(calculateDispenseProgress())} status="active" />
          </div>

          <Divider />

          {medicationItems.map((item, index) => (
            <Card
              key={item.id}
              size="small"
              style={{ marginBottom: 16 }}
              title={
                <div>
                  <Text strong>
                    {index + 1}. {item.medicationName}
                  </Text>
                  {item.dispensedQuantity >= item.quantity && (
                    <Tag color="success" style={{ marginLeft: 8 }}>
                      Đã đủ
                    </Tag>
                  )}
                  {item.dispensedQuantity > 0 && item.dispensedQuantity < item.quantity && (
                    <Tag color="warning" style={{ marginLeft: 8 }}>
                      Chưa đủ
                    </Tag>
                  )}
                </div>
              }
            >
              <Row gutter={16}>
                <Col span={24}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <Text type="secondary">Liều lượng:</Text> <Text>{item.dosage}</Text>
                    </div>
                    <div>
                      <Text type="secondary">Hướng dẫn:</Text> <Text>{item.instruction}</Text>
                    </div>
                    <div>
                      <Text type="secondary">Số lượng cần cấp:</Text>{' '}
                      <Text strong>
                        {item.quantity} {item.unit}
                      </Text>
                    </div>

                    <Divider style={{ margin: '12px 0' }} />

                    <div>
                      <Text strong>Chọn lô thuốc:</Text>
                      <Radio.Group
                        style={{ width: '100%', marginTop: 8 }}
                        value={item.selectedBatch}
                        onChange={(e) => handleBatchSelect(item.id, e.target.value)}
                      >
                        <Space direction="vertical" style={{ width: '100%' }}>
                          {item.batches.map((batch) => (
                            <Radio key={batch.batchNumber} value={batch.batchNumber}>
                              <div>
                                <Space>
                                  <Text strong>Lô: {batch.batchNumber}</Text>
                                  {getBatchStatusTag(batch)}
                                </Space>
                                <div style={{ marginLeft: 24, marginTop: 4 }}>
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    HSD: {dayjs(batch.expiryDate).format('DD/MM/YYYY')} | Tồn:{' '}
                                    {batch.availableQuantity} {item.unit} | Kho:{' '}
                                    {batch.warehouse}
                                  </Text>
                                </div>
                              </div>
                            </Radio>
                          ))}
                        </Space>
                      </Radio.Group>
                    </div>

                    <Divider style={{ margin: '12px 0' }} />

                    <div>
                      <Text strong>Số lượng cấp phát:</Text>
                      <InputNumber
                        min={0}
                        max={item.quantity}
                        value={item.dispensedQuantity}
                        onChange={(value) => handleDispenseQuantityChange(item.id, value)}
                        addonAfter={item.unit}
                        style={{ width: 200, marginLeft: 8 }}
                      />
                      <Button
                        type="link"
                        size="small"
                        onClick={() => handleDispenseQuantityChange(item.id, item.quantity)}
                      >
                        Cấp đủ
                      </Button>
                    </div>
                  </Space>
                </Col>
              </Row>
            </Card>
          ))}
        </>
      )}
    </Drawer>
  );

  const renderInventoryTab = () => (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Tổng mặt hàng"
              value={inventoryItems.length}
              prefix={<MedicineBoxOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Sắp hết hàng"
              value={inventoryItems.filter((i) => i.status === 'low').length}
              valueStyle={{ color: '#faad14' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Hết hàng"
              value={inventoryItems.filter((i) => i.status === 'out').length}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Sắp hết hạn"
              value={inventoryItems.filter((i) => i.status === 'expiring').length}
              valueStyle={{ color: '#ff7a45' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col flex="auto">
            <Search
              placeholder="Tìm theo mã thuốc, tên thuốc..."
              allowClear
              enterButton={<SearchOutlined />}
              style={{ maxWidth: 400 }}
            />
          </Col>
          <Col>
            <Space>
              <Select defaultValue="all" style={{ width: 150 }} placeholder="Kho">
                <Select.Option value="all">Tất cả kho</Select.Option>
                <Select.Option value="main">Kho thuốc chính</Select.Option>
                <Select.Option value="floor1">Nhà thuốc tầng 1</Select.Option>
              </Select>
              <Select defaultValue="all" style={{ width: 150 }} placeholder="Danh mục">
                <Select.Option value="all">Tất cả danh mục</Select.Option>
                <Select.Option value="pain">Thuốc giảm đau</Select.Option>
                <Select.Option value="antibiotic">Kháng sinh</Select.Option>
                <Select.Option value="vitamin">Vitamin</Select.Option>
              </Select>
              <Select defaultValue="all" style={{ width: 150 }} placeholder="Trạng thái">
                <Select.Option value="all">Tất cả</Select.Option>
                <Select.Option value="low">Sắp hết</Select.Option>
                <Select.Option value="out">Hết hàng</Select.Option>
                <Select.Option value="expiring">Gần hết hạn</Select.Option>
              </Select>
              <Button icon={<FilterOutlined />}>Lọc</Button>
              <Button icon={<SyncOutlined />}>Đồng bộ</Button>
            </Space>
          </Col>
        </Row>

        <Table
          columns={inventoryColumns}
          dataSource={inventoryItems}
          rowKey="id"
          size="small"
          scroll={{ x: 1200 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Tổng: ${total} mặt hàng`,
          }}
          rowClassName={(record) => {
            if (record.status === 'out') return 'row-out-of-stock';
            if (record.status === 'low') return 'row-low-stock';
            if (record.status === 'expiring') return 'row-expiring';
            return '';
          }}
        />
      </Card>
    </div>
  );

  const renderTransfersTab = () => (
    <div>
      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col flex="auto">
            <Search
              placeholder="Tìm theo mã phiếu, kho..."
              allowClear
              enterButton={<SearchOutlined />}
              style={{ maxWidth: 400 }}
            />
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<SwapOutlined />}
              onClick={() => setTransferModalVisible(true)}
            >
              Tạo phiếu điều chuyển
            </Button>
          </Col>
        </Row>

        <Table
          columns={transferColumns}
          dataSource={transfers}
          rowKey="id"
          size="small"
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Tổng: ${total} phiếu`,
          }}
        />
      </Card>

      <Modal
        title="Tạo phiếu điều chuyển"
        open={transferModalVisible}
        onOk={handleCreateTransfer}
        onCancel={() => setTransferModalVisible(false)}
        width={700}
        okText="Tạo phiếu"
        cancelText="Hủy"
      >
        <Form form={transferForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="fromWarehouse"
                label="Từ kho"
                rules={[{ required: true, message: 'Vui lòng chọn kho xuất' }]}
              >
                <Select placeholder="Chọn kho xuất">
                  <Select.Option value="main">Kho thuốc chính</Select.Option>
                  <Select.Option value="floor1">Nhà thuốc tầng 1</Select.Option>
                  <Select.Option value="floor2">Nhà thuốc tầng 2</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="toWarehouse"
                label="Đến kho"
                rules={[{ required: true, message: 'Vui lòng chọn kho nhập' }]}
              >
                <Select placeholder="Chọn kho nhập">
                  <Select.Option value="main">Kho thuốc chính</Select.Option>
                  <Select.Option value="floor1">Nhà thuốc tầng 1</Select.Option>
                  <Select.Option value="floor2">Nhà thuốc tầng 2</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="note" label="Ghi chú">
            <TextArea rows={3} placeholder="Nhập lý do điều chuyển..." />
          </Form.Item>

          <Divider>Danh sách thuốc điều chuyển</Divider>

          <Button type="dashed" block icon={<PlusOutlined />}>
            Thêm thuốc
          </Button>
        </Form>
      </Modal>
    </div>
  );

  const renderAlertsTab = () => (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Cảnh báo chưa xử lý"
              value={unacknowledgedCount}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<BellOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Sắp hết hàng"
              value={alerts.filter((a) => a.type === 'low_stock').length}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Sắp hết hạn"
              value={alerts.filter((a) => a.type === 'expiry').length}
              valueStyle={{ color: '#ff7a45' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {alerts.map((alert) => (
            <Alert
              key={alert.id}
              message={
                <div>
                  <Space>
                    {getAlertIcon(alert.type)}
                    <Text strong>{alert.medicationName || 'Cảnh báo hệ thống'}</Text>
                    <Tag color={getAlertSeverityColor(alert.severity)}>
                      {alert.severity === 'high'
                        ? 'Cao'
                        : alert.severity === 'medium'
                        ? 'Trung bình'
                        : 'Thấp'}
                    </Tag>
                  </Space>
                </div>
              }
              description={
                <div>
                  <div>{alert.message}</div>
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(alert.createdDate).format('DD/MM/YYYY HH:mm')}
                    </Text>
                  </div>
                </div>
              }
              type={
                alert.severity === 'high'
                  ? 'error'
                  : alert.severity === 'medium'
                  ? 'warning'
                  : 'info'
              }
              showIcon
              action={
                !alert.acknowledged && (
                  <Space>
                    <Button size="small" onClick={() => handleAcknowledgeAlert(alert.id)}>
                      Xác nhận
                    </Button>
                    <Button size="small" type="primary">
                      Xử lý
                    </Button>
                  </Space>
                )
              }
              style={{
                opacity: alert.acknowledged ? 0.6 : 1,
              }}
            />
          ))}
        </Space>
      </Card>
    </div>
  );

  return (
    <div>
      <Title level={4}>Quản lý nhà thuốc</Title>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'pending',
              label: (
                <span>
                  <FileTextOutlined />
                  Đơn thuốc chờ xử lý
                  <Badge
                    count={pendingPrescriptions.filter((p) => p.status === 'pending').length}
                    offset={[10, 0]}
                  />
                </span>
              ),
              children: renderPendingPrescriptionsTab(),
            },
            {
              key: 'inventory',
              label: (
                <span>
                  <MedicineBoxOutlined />
                  Tồn kho
                  <Badge
                    count={inventoryItems.filter((i) => i.status === 'low' || i.status === 'out').length}
                    offset={[10, 0]}
                  />
                </span>
              ),
              children: renderInventoryTab(),
            },
            {
              key: 'transfers',
              label: (
                <span>
                  <SwapOutlined />
                  Điều chuyển
                  <Badge
                    count={transfers.filter((t) => t.status === 'pending').length}
                    offset={[10, 0]}
                  />
                </span>
              ),
              children: renderTransfersTab(),
            },
            {
              key: 'alerts',
              label: (
                <span>
                  <BellOutlined />
                  Cảnh báo
                  <Badge count={unacknowledgedCount} offset={[10, 0]} />
                </span>
              ),
              children: renderAlertsTab(),
            },
          ]}
        />
      </Card>

      {renderDispensingDrawer()}
    </div>
  );
};

export default Pharmacy;
