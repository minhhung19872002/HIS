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
  PieChartOutlined,
  ExperimentOutlined,
  ReloadOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import bloodBankApi from '../api/bloodBank';
import { HOSPITAL_NAME } from '../constants/hospital';

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
  bagCode?: string;
  collectionDate?: string;
  source?: string;
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
  const [selectedRequest, setSelectedRequest] = useState<BloodRequest | null>(null);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isRequestDetailModalOpen, setIsRequestDetailModalOpen] = useState(false);
  const [receiveForm] = Form.useForm();
  const [issueForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [inventorySearchText, setInventorySearchText] = useState('');
  const [requestSearchText, setRequestSearchText] = useState('');
  const [gelcardModalOpen, setGelcardModalOpen] = useState(false);
  const [gelcardForm] = Form.useForm();

  // Print blood unit label (Nhãn đơn vị máu)
  const executePrintBloodLabel = (unit: BloodUnit) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      message.error('Không thể mở cửa sổ in. Vui lòng cho phép popup.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Nhãn đơn vị máu - ${unit.unitCode}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 11px; padding: 5px; }
          .label { border: 2px solid #000; padding: 8px; width: 280px; }
          .header { text-align: center; font-weight: bold; font-size: 12px; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 5px; }
          .blood-type { font-size: 36px; font-weight: bold; color: #d00; text-align: center; margin: 10px 0; }
          .info-row { display: flex; justify-content: space-between; margin: 3px 0; }
          .barcode { text-align: center; font-family: monospace; font-size: 14px; letter-spacing: 2px; margin: 8px 0; padding: 5px; background: #f0f0f0; }
          .warning { background: #ffcc00; padding: 3px; text-align: center; font-weight: bold; margin-top: 5px; }
          @media print {
            body { padding: 0; }
            .label { border: 2px solid #000; }
          }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="header">${HOSPITAL_NAME}</div>
          <div class="header" style="font-size: 11px;">NGÂN HÀNG MÁU</div>

          <div class="blood-type">${unit.bloodType}</div>

          <div class="barcode">${unit.unitCode}</div>

          <div class="info-row">
            <span>Thành phần:</span>
            <span><strong>${unit.component}</strong></span>
          </div>
          <div class="info-row">
            <span>Thể tích:</span>
            <span><strong>${unit.volume} ml</strong></span>
          </div>
          <div class="info-row">
            <span>Ngày nhập:</span>
            <span>${dayjs(unit.receiveDate).format('DD/MM/YYYY')}</span>
          </div>
          <div class="info-row">
            <span>Hạn SD:</span>
            <span style="color: #d00;"><strong>${dayjs(unit.expiryDate).format('DD/MM/YYYY')}</strong></span>
          </div>
          <div class="info-row">
            <span>Vị trí:</span>
            <span>${unit.location}</span>
          </div>

          <div class="warning">BẢO QUẢN 2-6°C</div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  // Print blood transfusion request (Phiếu yêu cầu máu)
  const executePrintBloodRequest = (request: BloodRequest) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      message.error('Không thể mở cửa sổ in. Vui lòng cho phép popup.');
      return;
    }

    const urgencyText = request.urgency === 2 ? 'CẤP CỨU' : request.urgency === 1 ? 'Cần gấp' : 'Bình thường';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Phiếu yêu cầu truyền máu - ${request.requestCode}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', serif; font-size: 13px; line-height: 1.5; padding: 20px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 15px; }
          .header-left { width: 50%; }
          .title { font-size: 18px; font-weight: bold; text-align: center; margin: 15px 0; text-transform: uppercase; }
          .urgency { font-size: 16px; font-weight: bold; text-align: center; color: ${request.urgency === 2 ? '#ff0000' : request.urgency === 1 ? '#ff8800' : '#000'}; margin-bottom: 15px; }
          .info-section { border: 1px solid #000; padding: 10px; margin-bottom: 15px; }
          .section-title { font-weight: bold; margin-bottom: 5px; background: #f0f0f0; padding: 5px; }
          .info-row { margin: 5px 0; }
          .field { border-bottom: 1px dotted #000; min-width: 100px; display: inline-block; padding: 0 5px; }
          .blood-request { border: 2px solid #000; padding: 15px; margin: 15px 0; background: #fff0f0; }
          .blood-type-large { font-size: 28px; font-weight: bold; color: #d00; text-align: center; }
          .signature-row { display: flex; justify-content: space-between; margin-top: 40px; text-align: center; }
          .signature-col { width: 30%; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <div><strong>${HOSPITAL_NAME}</strong></div>
            <div>Khoa: ${request.department}</div>
          </div>
          <div style="text-align: right;">
            <div><strong>Số phiếu: ${request.requestCode}</strong></div>
            <div>Ngày: ${dayjs(request.requestDate).format('DD/MM/YYYY HH:mm')}</div>
          </div>
        </div>

        <div class="title">PHIẾU YÊU CẦU TRUYỀN MÁU</div>
        <div class="urgency">[${urgencyText}]</div>

        <div class="info-section">
          <div class="section-title">THÔNG TIN BỆNH NHÂN</div>
          <div class="info-row">Mã bệnh nhân: <span class="field">${request.patientCode}</span></div>
          <div class="info-row">Họ và tên: <span class="field" style="width: 300px;"><strong>${request.patientName}</strong></span></div>
        </div>

        <div class="blood-request">
          <div class="section-title" style="background: #ffcccc;">YÊU CẦU MÁU</div>
          <div style="display: flex; justify-content: space-around; margin: 15px 0;">
            <div style="text-align: center;">
              <div>Nhóm máu:</div>
              <div class="blood-type-large">${request.bloodType}</div>
            </div>
            <div style="text-align: center;">
              <div>Thành phần:</div>
              <div style="font-size: 18px; font-weight: bold;">${request.component}</div>
            </div>
            <div style="text-align: center;">
              <div>Số lượng:</div>
              <div style="font-size: 24px; font-weight: bold;">${request.quantity} đơn vị</div>
            </div>
          </div>
        </div>

        <div class="info-section">
          <div class="section-title">CHỈ ĐỊNH LÂM SÀNG</div>
          <div style="min-height: 60px; padding: 10px;">${request.reason || 'Không có thông tin'}</div>
        </div>

        <div class="signature-row">
          <div class="signature-col">
            <div><strong>BÁC SĨ YÊU CẦU</strong></div>
            <div style="margin-top: 50px;">${request.requestedBy}</div>
          </div>
          <div class="signature-col">
            <div><strong>TRƯỞNG KHOA</strong></div>
            <div style="margin-top: 50px;"></div>
          </div>
          <div class="signature-col">
            <div><strong>NGÂN HÀNG MÁU</strong></div>
            <div style="margin-top: 50px;"></div>
          </div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
  };

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
      console.warn('Error fetching blood inventory:', error);
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
      console.warn('Error fetching blood requests:', error);
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
    receiveForm.validateFields().then(async (values) => {
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

      // Optimistic UI update
      setInventory(prev => [...prev, newUnit]);
      setIsReceiveModalOpen(false);
      receiveForm.resetFields();

      try {
        // Parse bloodType into type + rhFactor (e.g. "A+" -> "A", "+")
        const bloodTypeStr = values.bloodType as string;
        const rhFactor = bloodTypeStr.endsWith('+') ? '+' : '-';
        const bloodType = bloodTypeStr.replace(/[+-]$/, '');

        const importDto = {
          receiptDate: values.receiveDate.format('YYYY-MM-DD'),
          supplierId: values.supplier,
          note: `Nhập từ ${values.supplier}`,
          items: [{
            bagCode: newUnit.unitCode,
            barcode: newUnit.unitCode,
            bloodType,
            rhFactor,
            productTypeId: values.component,
            volume: values.volume,
            collectionDate: values.receiveDate.format('YYYY-MM-DD'),
            expiryDate: values.expiryDate.format('YYYY-MM-DD'),
            price: 0,
          }],
        };

        await bloodBankApi.createImportReceipt(importDto);
        message.success(`Đã nhập đơn vị máu ${newUnit.unitCode}`);
      } catch (error) {
        console.warn('Error saving blood unit to API:', error);
        message.warning('Đã thêm vào danh sách nhưng chưa lưu được lên hệ thống. Vui lòng thử lại.');
        // Revert optimistic update on failure
        setInventory(prev => prev.filter(u => u.id !== newUnit.id));
      }
    });
  };

  // Handle approve request
  const handleApproveRequest = (record: BloodRequest) => {
    // Status validation: only allow approving pending requests (status === 0)
    if (record.status !== 0) {
      message.warning('Chỉ có thể duyệt yêu cầu đang ở trạng thái "Chờ duyệt"');
      return;
    }

    Modal.confirm({
      title: 'Xác nhận duyệt yêu cầu',
      content: `Bạn có chắc chắn muốn duyệt yêu cầu ${record.requestCode}?`,
      onOk: async () => {
        try {
          await bloodBankApi.approveIssueRequest(record.id);
          setRequests(prev =>
            prev.map(req =>
              req.id === record.id ? { ...req, status: 1 } : req
            )
          );
          message.success('Đã duyệt yêu cầu');
        } catch (error) {
          console.warn('Error approving blood request:', error);
          message.error('Lỗi khi duyệt yêu cầu. Vui lòng thử lại.');
        }
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
    issueForm.validateFields().then(async (values) => {
      if (!selectedRequest) return;

      try {
        // Call API to record the blood issuance
        const issueDto = {
          requestId: selectedRequest.id,
          bloodBagIds: values.selectedUnits as string[],
          note: `Xuất máu cho BN ${selectedRequest.patientName} - ${selectedRequest.patientCode}`,
        };

        await bloodBankApi.issueBlood(issueDto);

        // Update request status
        setRequests(prev =>
          prev.map(req =>
            req.id === selectedRequest.id ? { ...req, status: 2 } : req
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
      } catch (error) {
        console.warn('Error issuing blood:', error);
        message.error('Lỗi khi xuất máu. Vui lòng thử lại.');
      }
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
        <Space orientation="vertical" size={0}>
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
            onClick={() => executePrintBloodLabel(record)}
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

  // Filtered data based on search
  const filteredInventory = inventorySearchText
    ? inventory.filter(u =>
        u.unitCode.toLowerCase().includes(inventorySearchText.toLowerCase()) ||
        u.bloodType.toLowerCase().includes(inventorySearchText.toLowerCase()) ||
        u.component.toLowerCase().includes(inventorySearchText.toLowerCase())
      )
    : inventory;

  const filteredRequests = requestSearchText
    ? requests.filter(r =>
        r.requestCode.toLowerCase().includes(requestSearchText.toLowerCase()) ||
        r.patientCode.toLowerCase().includes(requestSearchText.toLowerCase()) ||
        r.patientName.toLowerCase().includes(requestSearchText.toLowerCase())
      )
    : requests;

  // Stats
  const availableUnits = inventory.filter(u => u.status === 0).length;
  const reservedUnits = inventory.filter(u => u.status === 1).length;
  const expiringUnits = inventory.filter(u => u.status === 0 && dayjs(u.expiryDate).diff(dayjs(), 'day') <= 7).length;
  const pendingRequests = requests.filter(r => r.status === 0).length;

  // Blood group inventory
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const groupInventory = bloodGroups.map(group => {
    const units = inventory.filter(u => u.bloodType === group);
    const available = units.filter(u => u.status === 0);
    const totalVolume = available.reduce((sum, u) => sum + (u.volume || 0), 0);
    return {
      group,
      total: units.length,
      available: available.length,
      reserved: units.filter(u => u.status === 1).length,
      used: units.filter(u => u.status === 2).length,
      expired: units.filter(u => u.status === 3).length,
      totalVolume,
      expiringIn7Days: available.filter(u => dayjs(u.expiryDate).diff(dayjs(), 'day') <= 7).length,
    };
  });

  // Expiry inventory
  const now = dayjs();
  const activeUnits = inventory.filter(u => u.status === 0 || u.status === 1);
  const expiredUnits = activeUnits.filter(u => dayjs(u.expiryDate).isBefore(now));
  const expiring7d = activeUnits.filter(u => { const d = dayjs(u.expiryDate).diff(now, 'day'); return d >= 0 && d <= 7; });
  const expiring30d = activeUnits.filter(u => { const d = dayjs(u.expiryDate).diff(now, 'day'); return d > 7 && d <= 30; });
  const safeUnits = activeUnits.filter(u => dayjs(u.expiryDate).diff(now, 'day') > 30);

  // Gelcard handler
  const handleGelcardSubmit = async () => {
    try {
      const values = await gelcardForm.validateFields();
      const unit = inventory.find(u => u.id === values.unitId);
      if (unit) {
        // Update test results field on the unit
        const testResult = `Gelcard ${values.testType}: ${values.bloodTypeResult || ''} Rh${values.rhResult || ''} - ${values.result} (${dayjs().format('DD/MM/YYYY HH:mm')})`;
        setInventory(prev => prev.map(u => u.id === unit.id ? { ...u, testResults: testResult } : u));
        message.success(`Ghi nhận kết quả Gelcard cho ${unit.unitCode}`);
      }
      setGelcardModalOpen(false);
      gelcardForm.resetFields();
    } catch {
      message.warning('Vui lòng điền đầy đủ thông tin');
    }
  };

  return (
    <div>
      <Title level={4}>Quản lý Ngân hàng Máu</Title>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Đơn vị sẵn sàng"
              value={availableUnits}
              styles={{ content: { color: '#52c41a' } }}
              prefix={<MedicineBoxOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Đã đặt trước"
              value={reservedUnits}
              styles={{ content: { color: '#1890ff' } }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Sắp hết hạn"
              value={expiringUnits}
              styles={{ content: { color: expiringUnits > 0 ? '#faad14' : '#52c41a' } }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Yêu cầu chờ duyệt"
              value={pendingRequests}
              styles={{ content: { color: pendingRequests > 0 ? '#ff4d4f' : '#52c41a' } }}
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
                        value={inventorySearchText}
                        onChange={(e) => setInventorySearchText(e.target.value)}
                        onSearch={(value) => setInventorySearchText(value)}
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
                      title={`Có ${expiringUnits} đơn vị máu sắp hết hạn trong 7 ngày tới`}
                      type="warning"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                  )}

                  <Table
                    columns={inventoryColumns}
                    dataSource={filteredInventory}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1400 }}
                    loading={loading}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} đơn vị`,
                    }}
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        Modal.info({
                          title: `Chi tiết đơn vị máu - ${record.bagCode}`,
                          width: 600,
                          content: (
                            <Descriptions bordered size="small" column={2} style={{ marginTop: 16 }}>
                              <Descriptions.Item label="Mã túi">{record.bagCode}</Descriptions.Item>
                              <Descriptions.Item label="Nhóm máu">
                                <Tag color="red">{record.bloodType}</Tag>
                              </Descriptions.Item>
                              <Descriptions.Item label="Thành phần">{record.component}</Descriptions.Item>
                              <Descriptions.Item label="Thể tích">{record.volume} ml</Descriptions.Item>
                              <Descriptions.Item label="Ngày thu thập">
                                {record.collectionDate ? dayjs(record.collectionDate).format('DD/MM/YYYY') : '-'}
                              </Descriptions.Item>
                              <Descriptions.Item label="Hạn sử dụng">
                                {record.expiryDate ? dayjs(record.expiryDate).format('DD/MM/YYYY') : '-'}
                              </Descriptions.Item>
                              <Descriptions.Item label="Nguồn">{record.source || '-'}</Descriptions.Item>
                              <Descriptions.Item label="Trạng thái">{record.status}</Descriptions.Item>
                            </Descriptions>
                          ),
                        });
                      },
                      style: { cursor: 'pointer' },
                    })}
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
                        value={requestSearchText}
                        onChange={(e) => setRequestSearchText(e.target.value)}
                        onSearch={(value) => setRequestSearchText(value)}
                      />
                    </Col>
                  </Row>

                  <Table
                    columns={requestColumns}
                    dataSource={filteredRequests}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1500 }}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} yêu cầu`,
                    }}
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        setSelectedRequest(record);
                        setIsRequestDetailModalOpen(true);
                      },
                      style: { cursor: 'pointer' },
                    })}
                  />
                </>
              ),
            },
            {
              key: 'bloodGroup',
              label: (
                <span>
                  <PieChartOutlined />
                  Theo nhóm máu
                </span>
              ),
              children: (
                <>
                  <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
                    {groupInventory.map(g => (
                      <Col span={3} key={g.group}>
                        <Card size="small" style={{ textAlign: 'center', borderColor: g.available > 0 ? '#52c41a' : '#ff4d4f' }}>
                          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#cf1322' }}>{g.group}</div>
                          <Statistic title="Sẵn sàng" value={g.available} styles={{ content: { fontSize: 20, color: g.available > 0 ? '#52c41a' : '#ff4d4f' } }} />
                          <div style={{ fontSize: 11, color: '#999' }}>
                            {g.totalVolume > 0 ? `${g.totalVolume} ml` : '0 ml'} | Đặt: {g.reserved}
                          </div>
                          {g.expiringIn7Days > 0 && <Tag color="orange" style={{ marginTop: 4 }}>SHH: {g.expiringIn7Days}</Tag>}
                        </Card>
                      </Col>
                    ))}
                  </Row>
                  <Table
                    columns={[
                      { title: 'Nhóm máu', dataIndex: 'group', key: 'group', width: 100, render: (v: string) => <Tag color="red" style={{ fontSize: 16 }}>{v}</Tag> },
                      { title: 'Tổng', dataIndex: 'total', key: 'total', width: 80, align: 'center' as const },
                      { title: 'Sẵn sàng', dataIndex: 'available', key: 'available', width: 100, align: 'center' as const, render: (v: number) => <Tag color={v > 0 ? 'green' : 'red'}>{v}</Tag> },
                      { title: 'Đã đặt', dataIndex: 'reserved', key: 'reserved', width: 80, align: 'center' as const },
                      { title: 'Đã dùng', dataIndex: 'used', key: 'used', width: 80, align: 'center' as const },
                      { title: 'Hết hạn', dataIndex: 'expired', key: 'expired', width: 80, align: 'center' as const, render: (v: number) => v > 0 ? <Tag color="red">{v}</Tag> : '0' },
                      { title: 'Thể tích (ml)', dataIndex: 'totalVolume', key: 'vol', width: 120, align: 'right' as const, render: (v: number) => v.toLocaleString() },
                      { title: 'SHH 7 ngày', dataIndex: 'expiringIn7Days', key: 'exp7', width: 100, align: 'center' as const, render: (v: number) => v > 0 ? <Tag color="orange">{v}</Tag> : '0' },
                    ]}
                    dataSource={groupInventory}
                    rowKey="group"
                    size="small"
                    pagination={false}
                    summary={() => (
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0}><strong>Tổng</strong></Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="center"><strong>{groupInventory.reduce((s, g) => s + g.total, 0)}</strong></Table.Summary.Cell>
                        <Table.Summary.Cell index={2} align="center"><strong>{groupInventory.reduce((s, g) => s + g.available, 0)}</strong></Table.Summary.Cell>
                        <Table.Summary.Cell index={3} align="center"><strong>{groupInventory.reduce((s, g) => s + g.reserved, 0)}</strong></Table.Summary.Cell>
                        <Table.Summary.Cell index={4} align="center"><strong>{groupInventory.reduce((s, g) => s + g.used, 0)}</strong></Table.Summary.Cell>
                        <Table.Summary.Cell index={5} align="center"><strong>{groupInventory.reduce((s, g) => s + g.expired, 0)}</strong></Table.Summary.Cell>
                        <Table.Summary.Cell index={6} align="right"><strong>{groupInventory.reduce((s, g) => s + g.totalVolume, 0).toLocaleString()}</strong></Table.Summary.Cell>
                        <Table.Summary.Cell index={7} align="center"><strong>{groupInventory.reduce((s, g) => s + g.expiringIn7Days, 0)}</strong></Table.Summary.Cell>
                      </Table.Summary.Row>
                    )}
                  />
                </>
              ),
            },
            {
              key: 'expiry',
              label: (
                <span>
                  <WarningOutlined />
                  Hạn sử dụng
                  {(expiredUnits.length + expiring7d.length) > 0 && <Badge count={expiredUnits.length + expiring7d.length} style={{ marginLeft: 8, backgroundColor: '#ff4d4f' }} />}
                </span>
              ),
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={6}>
                      <Card size="small"><Statistic title="Đã hết hạn" value={expiredUnits.length} styles={{ content: { color: '#ff4d4f' } }} prefix={<WarningOutlined />} /></Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small"><Statistic title="Sắp hết hạn (≤7 ngày)" value={expiring7d.length} styles={{ content: { color: '#fa8c16' } }} /></Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small"><Statistic title="8-30 ngày" value={expiring30d.length} styles={{ content: { color: '#fadb14' } }} /></Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small"><Statistic title="> 30 ngày (an toàn)" value={safeUnits.length} styles={{ content: { color: '#52c41a' } }} prefix={<CheckCircleOutlined />} /></Card>
                    </Col>
                  </Row>
                  {expiredUnits.length > 0 && (
                    <Alert title={`${expiredUnits.length} đơn vị máu ĐÃ HẾT HẠN cần xử lý ngay!`} type="error" showIcon style={{ marginBottom: 16 }} />
                  )}
                  <Tabs
                    defaultActiveKey="expired"
                    size="small"
                    items={[
                      { key: 'expired', label: <Tag color="red">Hết hạn ({expiredUnits.length})</Tag>,
                        children: <Table columns={inventoryColumns} dataSource={expiredUnits} rowKey="id" size="small" pagination={{ pageSize: 10 }} scroll={{ x: 1200 }} /> },
                      { key: 'exp7', label: <Tag color="orange">≤7 ngày ({expiring7d.length})</Tag>,
                        children: <Table columns={inventoryColumns} dataSource={expiring7d} rowKey="id" size="small" pagination={{ pageSize: 10 }} scroll={{ x: 1200 }} /> },
                      { key: 'exp30', label: <Tag color="gold">8-30 ngày ({expiring30d.length})</Tag>,
                        children: <Table columns={inventoryColumns} dataSource={expiring30d} rowKey="id" size="small" pagination={{ pageSize: 10 }} scroll={{ x: 1200 }} /> },
                      { key: 'safe', label: <Tag color="green">&gt;30 ngày ({safeUnits.length})</Tag>,
                        children: <Table columns={inventoryColumns} dataSource={safeUnits} rowKey="id" size="small" pagination={{ pageSize: 10 }} scroll={{ x: 1200 }} /> },
                    ]}
                  />
                </>
              ),
            },
            {
              key: 'gelcard',
              label: (
                <span>
                  <ExperimentOutlined />
                  Gelcard
                </span>
              ),
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col flex="auto">
                      <Alert title="Gelcard: Phương pháp xác định nhóm máu và thử phản ứng chéo bằng gel card" type="info" showIcon />
                    </Col>
                    <Col>
                      <Button type="primary" icon={<PlusOutlined />} onClick={() => { gelcardForm.resetFields(); setGelcardModalOpen(true); }}>
                        Ghi kết quả Gelcard
                      </Button>
                    </Col>
                  </Row>
                  <Table
                    columns={[
                      { title: 'Mã đơn vị', dataIndex: 'unitCode', key: 'unitCode', width: 130, render: (v: string) => <Text code strong>{v}</Text> },
                      { title: 'Nhóm máu', dataIndex: 'bloodType', key: 'bloodType', width: 90, render: (v: string) => <Tag color="red">{v}</Tag> },
                      { title: 'Thành phần', dataIndex: 'component', key: 'component', width: 130 },
                      { title: 'Hạn SD', dataIndex: 'expiryDate', key: 'expiryDate', width: 110, render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '-' },
                      { title: 'Kết quả Gelcard', dataIndex: 'testResults', key: 'testResults', width: 300,
                        render: (v: string) => v ? <Tag color="green">{v}</Tag> : <Tag color="default">Chưa test</Tag> },
                      { title: 'TT', dataIndex: 'status', key: 'status', width: 100, render: (s: number) => getUnitStatusTag(s) },
                    ]}
                    dataSource={inventory.filter(u => u.status === 0 || u.status === 1)}
                    rowKey="id"
                    size="small"
                    pagination={{ pageSize: 15 }}
                  />
                </>
              ),
            },
          ]}
        />
      </Card>

      {/* Gelcard Result Modal */}
      <Modal title="Ghi nhận kết quả Gelcard" open={gelcardModalOpen} onOk={handleGelcardSubmit} onCancel={() => setGelcardModalOpen(false)} destroyOnHidden width={600}>
        <Form form={gelcardForm} layout="vertical">
          <Form.Item name="unitId" label="Đơn vị máu" rules={[{ required: true }]}>
            <Select placeholder="Chọn đơn vị máu" showSearch optionFilterProp="label"
              options={inventory.filter(u => u.status === 0 || u.status === 1).map(u => ({
                value: u.id, label: `${u.unitCode} - ${u.bloodType} - ${u.component}`,
              }))} />
          </Form.Item>
          <Form.Item name="testType" label="Loại xét nghiệm" rules={[{ required: true }]}>
            <Select options={[
              { value: 'ABO/Rh', label: 'Định nhóm ABO/Rh' },
              { value: 'CrossMatch', label: 'Phản ứng chéo (Cross-match)' },
              { value: 'Antibody', label: 'Sàng lọc kháng thể bất thường' },
              { value: 'DAT', label: 'Direct Antiglobulin Test (DAT)' },
            ]} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="bloodTypeResult" label="Nhóm máu xác nhận">
                <Select allowClear options={bloodGroups.map(g => ({ value: g, label: g }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="rhResult" label="Rh">
                <Select allowClear options={[{ value: '+', label: 'Rh (+)' }, { value: '-', label: 'Rh (-)' }]} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="result" label="Kết quả" rules={[{ required: true }]}>
            <Select options={[
              { value: 'Phù hợp', label: 'Phù hợp (Compatible)' },
              { value: 'Không phù hợp', label: 'Không phù hợp (Incompatible)' },
              { value: 'Dương tính', label: 'Dương tính (Positive)' },
              { value: 'Âm tính', label: 'Âm tính (Negative)' },
            ]} />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

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
              title="Lưu ý: Kiểm tra kỹ nhóm máu và thông tin bệnh nhân trước khi xuất"
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
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => selectedRequest && executePrintBloodRequest(selectedRequest)}>
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
