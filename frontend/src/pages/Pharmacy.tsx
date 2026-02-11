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
  PrinterOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import pharmacyApi from '../api/pharmacy';

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

// ==================== MAIN COMPONENT ====================

const Pharmacy: React.FC = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingPrescriptions, setPendingPrescriptions] = useState<PendingPrescription[]>([]);
  const [selectedPrescription, setSelectedPrescription] = useState<PendingPrescription | null>(null);
  const [medicationItems, setMedicationItems] = useState<MedicationItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [dispensingDrawerVisible, setDispensingDrawerVisible] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [_form] = Form.useForm();
  const [transferForm] = Form.useForm();
  void _form;

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [prescriptions, inventory, transferList, alertList] = await Promise.all([
        pharmacyApi.getPendingPrescriptions(),
        pharmacyApi.getInventoryItems(),
        pharmacyApi.getTransferRequests(),
        pharmacyApi.getAlerts(),
      ]);

      setPendingPrescriptions(prescriptions.data);
      setInventoryItems(inventory.data);
      setTransfers(transferList.data);
      setAlerts(alertList.data);
    } catch (error) {
      message.error('Không thể tải dữ liệu. Vui lòng thử lại.');
      console.error('Error fetching pharmacy data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleAcceptPrescription = async (record: PendingPrescription) => {
    try {
      setLoading(true);
      await pharmacyApi.acceptPrescription(record.id);

      // Fetch medication items for the prescription
      const medicationsResponse = await pharmacyApi.getMedicationItems(record.id);
      setMedicationItems(medicationsResponse.data);

      message.success(`Đã tiếp nhận đơn thuốc ${record.prescriptionCode}`);
      setSelectedPrescription(record);
      setDispensingDrawerVisible(true);

      // Refresh prescriptions list
      const prescriptions = await pharmacyApi.getPendingPrescriptions();
      setPendingPrescriptions(prescriptions.data);
    } catch (error) {
      message.error('Không thể tiếp nhận đơn thuốc. Vui lòng thử lại.');
      console.error('Error accepting prescription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectPrescription = (record: PendingPrescription) => {
    Modal.confirm({
      title: 'Xác nhận từ chối',
      content: `Bạn có chắc chắn muốn từ chối đơn thuốc ${record.prescriptionCode}?`,
      okText: 'Từ chối',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await pharmacyApi.rejectPrescription(record.id);
          message.warning(`Đã từ chối đơn thuốc ${record.prescriptionCode}`);

          // Refresh prescriptions list
          const prescriptions = await pharmacyApi.getPendingPrescriptions();
          setPendingPrescriptions(prescriptions.data);
        } catch (error) {
          message.error('Không thể từ chối đơn thuốc. Vui lòng thử lại.');
          console.error('Error rejecting prescription:', error);
        }
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
              onClick={async () => {
                try {
                  setLoading(true);
                  const medicationsResponse = await pharmacyApi.getMedicationItems(record.id);
                  setMedicationItems(medicationsResponse.data);
                  setSelectedPrescription(record);
                  setDispensingDrawerVisible(true);
                } catch (error) {
                  message.error('Không thể tải thông tin thuốc. Vui lòng thử lại.');
                  console.error('Error loading medications:', error);
                } finally {
                  setLoading(false);
                }
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

  // Print dispensing slip (Phiếu xuất thuốc)
  const executePrintDispensingSlip = () => {
    if (!selectedPrescription) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      message.error('Không thể mở cửa sổ in. Vui lòng cho phép popup.');
      return;
    }

    const totalAmount = medicationItems.reduce((sum, item) => {
      const batch = item.batches.find(b => b.batchNumber === item.selectedBatch);
      return sum + (batch ? item.dispensedQuantity * 10000 : 0); // Mock price
    }, 0);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Phiếu xuất thuốc - ${selectedPrescription.prescriptionCode}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', serif; font-size: 12px; line-height: 1.4; padding: 15px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 10px; }
          .header-left { width: 50%; }
          .title { font-size: 16px; font-weight: bold; text-align: center; margin: 10px 0; text-transform: uppercase; }
          .info-row { margin: 4px 0; }
          .field { border-bottom: 1px dotted #000; min-width: 80px; display: inline-block; padding: 0 3px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11px; }
          table th, table td { border: 1px solid #000; padding: 4px; text-align: left; }
          table th { background-color: #f0f0f0; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .total-row { font-weight: bold; background-color: #f0f5ff; }
          .signature-row { display: flex; justify-content: space-between; margin-top: 25px; text-align: center; font-size: 11px; }
          .signature-col { width: 30%; }
          .instructions { font-size: 10px; border: 1px dashed #999; padding: 8px; margin-top: 10px; }
          @media print { body { padding: 5px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <div><strong>BỆNH VIỆN ĐA KHOA ABC</strong></div>
            <div>Khoa Dược</div>
          </div>
          <div style="text-align: right;">
            <div><strong>MS: 05/BV-02</strong></div>
            <div>Số: ${selectedPrescription.prescriptionCode}</div>
          </div>
        </div>

        <div class="title">PHIẾU XUẤT THUỐC</div>
        <div style="text-align: center; margin-bottom: 10px;">Ngày ${dayjs().format('DD')} tháng ${dayjs().format('MM')} năm ${dayjs().format('YYYY')}</div>

        <div class="info-row">Mã BN: <span class="field">${selectedPrescription.patientCode}</span> Họ tên: <span class="field" style="width: 200px;"><strong>${selectedPrescription.patientName}</strong></span></div>
        <div class="info-row">Khoa/Phòng: <span class="field">${selectedPrescription.department}</span> Bác sĩ kê: <span class="field">${selectedPrescription.doctorName}</span></div>

        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 30px;">STT</th>
              <th>Tên thuốc</th>
              <th class="text-center" style="width: 50px;">ĐVT</th>
              <th class="text-center" style="width: 40px;">SL</th>
              <th style="width: 80px;">Số lô</th>
              <th style="width: 65px;">Hạn SD</th>
              <th style="width: 100px;">Cách dùng</th>
            </tr>
          </thead>
          <tbody>
            ${medicationItems.filter(item => item.dispensedQuantity > 0).map((item, index) => {
              const batch = item.batches.find(b => b.batchNumber === item.selectedBatch);
              return `
                <tr>
                  <td class="text-center">${index + 1}</td>
                  <td><strong>${item.medicationName}</strong></td>
                  <td class="text-center">${item.unit}</td>
                  <td class="text-center">${item.dispensedQuantity}</td>
                  <td>${batch?.batchNumber || ''}</td>
                  <td>${batch ? dayjs(batch.expiryDate).format('DD/MM/YY') : ''}</td>
                  <td style="font-size: 10px;">${item.dosage}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="instructions">
          <strong>Hướng dẫn sử dụng:</strong>
          <ul style="margin-left: 15px; margin-top: 5px;">
            ${medicationItems.filter(item => item.dispensedQuantity > 0 && item.instruction).map(item =>
              `<li><strong>${item.medicationName}:</strong> ${item.instruction}</li>`
            ).join('')}
          </ul>
        </div>

        <div class="signature-row">
          <div class="signature-col">
            <div><strong>NGƯỜI NHẬN</strong></div>
            <div>(Ký, ghi rõ họ tên)</div>
          </div>
          <div class="signature-col">
            <div><strong>DƯỢC SĨ PHÁT</strong></div>
            <div>(Ký, ghi rõ họ tên)</div>
          </div>
          <div class="signature-col">
            <div><strong>TRƯỞNG KHOA</strong></div>
            <div>(Ký, ghi rõ họ tên)</div>
          </div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  const handleDispenseQuantityChange = (itemId: string, value: number | null) => {
    setMedicationItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, dispensedQuantity: value || 0 } : item
      )
    );
  };

  const handleCompleteDispensing = async () => {
    const notDispensed = medicationItems.filter(
      (item) => item.dispensedQuantity < item.quantity
    );

    if (notDispensed.length > 0) {
      Modal.confirm({
        title: 'Cảnh báo',
        content: `Còn ${notDispensed.length} thuốc chưa cấp phát đủ số lượng. Bạn có muốn tiếp tục?`,
        okText: 'Tiếp tục',
        cancelText: 'Hủy',
        onOk: async () => {
          try {
            if (selectedPrescription) {
              await pharmacyApi.completeDispensing(selectedPrescription.id);
              message.success('Hoàn thành cấp phát đơn thuốc');
              setDispensingDrawerVisible(false);

              // Refresh prescriptions list
              const prescriptions = await pharmacyApi.getPendingPrescriptions();
              setPendingPrescriptions(prescriptions.data);
            }
          } catch (error) {
            message.error('Không thể hoàn thành cấp phát. Vui lòng thử lại.');
            console.error('Error completing dispensing:', error);
          }
        },
      });
    } else {
      try {
        if (selectedPrescription) {
          await pharmacyApi.completeDispensing(selectedPrescription.id);
          message.success('Hoàn thành cấp phát đơn thuốc');
          setDispensingDrawerVisible(false);

          // Refresh prescriptions list
          const prescriptions = await pharmacyApi.getPendingPrescriptions();
          setPendingPrescriptions(prescriptions.data);
        }
      } catch (error) {
        message.error('Không thể hoàn thành cấp phát. Vui lòng thử lại.');
        console.error('Error completing dispensing:', error);
      }
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

  const handleApproveTransfer = async (record: TransferRequest) => {
    try {
      await pharmacyApi.approveTransfer(record.id);
      message.success(`Đã duyệt phiếu điều chuyển ${record.transferCode}`);

      // Refresh transfers list
      const transferList = await pharmacyApi.getTransferRequests();
      setTransfers(transferList.data);
    } catch (error) {
      message.error('Không thể duyệt phiếu điều chuyển. Vui lòng thử lại.');
      console.error('Error approving transfer:', error);
    }
  };

  const handleRejectTransfer = (record: TransferRequest) => {
    Modal.confirm({
      title: 'Xác nhận từ chối',
      content: `Bạn có chắc chắn muốn từ chối phiếu điều chuyển ${record.transferCode}?`,
      okText: 'Từ chối',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await pharmacyApi.rejectTransfer(record.id);
          message.warning(`Đã từ chối phiếu điều chuyển ${record.transferCode}`);

          // Refresh transfers list
          const transferList = await pharmacyApi.getTransferRequests();
          setTransfers(transferList.data);
        } catch (error) {
          message.error('Không thể từ chối phiếu điều chuyển. Vui lòng thử lại.');
          console.error('Error rejecting transfer:', error);
        }
      },
    });
  };

  const handleReceiveTransfer = async (record: TransferRequest) => {
    try {
      await pharmacyApi.receiveTransfer(record.id);
      message.success(`Đã xác nhận nhận hàng phiếu ${record.transferCode}`);

      // Refresh transfers list
      const transferList = await pharmacyApi.getTransferRequests();
      setTransfers(transferList.data);
    } catch (error) {
      message.error('Không thể xác nhận nhận hàng. Vui lòng thử lại.');
      console.error('Error receiving transfer:', error);
    }
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
              <Button size="small" type="primary" onClick={() => handleApproveTransfer(record)}>
                Duyệt
              </Button>
              <Button size="small" danger onClick={() => handleRejectTransfer(record)}>
                Từ chối
              </Button>
            </>
          )}
          {record.status === 'approved' && (
            <Button size="small" type="primary" onClick={() => handleReceiveTransfer(record)}>
              Xác nhận nhận
            </Button>
          )}
          <Button size="small">Chi tiết</Button>
        </Space>
      ),
    },
  ];

  const handleCreateTransfer = async () => {
    try {
      const values = await transferForm.validateFields();
      await pharmacyApi.createTransfer(values);
      message.success('Tạo phiếu điều chuyển thành công');
      setTransferModalVisible(false);
      transferForm.resetFields();

      // Refresh transfers list
      const transferList = await pharmacyApi.getTransferRequests();
      setTransfers(transferList.data);
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        // Form validation error, no need to show message
        return;
      }
      message.error('Không thể tạo phiếu điều chuyển. Vui lòng thử lại.');
      console.error('Error creating transfer:', error);
    }
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

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await pharmacyApi.acknowledgeAlert(alertId);
      setAlerts((prev) =>
        prev.map((alert) =>
          alert.id === alertId ? { ...alert, acknowledged: true } : alert
        )
      );
      message.success('Đã xác nhận cảnh báo');
    } catch (error) {
      message.error('Không thể xác nhận cảnh báo. Vui lòng thử lại.');
      console.error('Error acknowledging alert:', error);
    }
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
          loading={loading}
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
          <Button icon={<PrinterOutlined />} onClick={executePrintDispensingSlip}>
            In phiếu xuất
          </Button>
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
          loading={loading}
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
          loading={loading}
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
