import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Input,
  Tag,
  Modal,
  Form,
  Select,
  message,
  Tabs,
  Badge,
  Alert,
  InputNumber,
  Drawer,
  Radio,
  Descriptions,
  Spin,
  Timeline
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
  ScanOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import pharmacyApi from '../api/pharmacy';
import { HOSPITAL_NAME } from '../constants/hospital';
import BarcodeScanner from '../components/BarcodeScanner';

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

type TransferDrugItem = {
  _key: string;
  medicationCode: string;
  medicationName: string;
  quantity: number;
  unit: string;
};

interface ClinicalReview {
  id: string;
  prescriptionCode: string;
  patientName: string;
  patientCode: string;
  doctorName: string;
  reviewType: 'routine' | 'interaction' | 'dose' | 'allergy' | 'duplicate' | 'renal' | 'adr';
  status: 'pending' | 'approved' | 'flagged' | 'rejected';
  severity: 'high' | 'medium' | 'low';
  findings: string;
  recommendation: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

interface AdrReport {
  id: string;
  patientName: string;
  patientCode: string;
  medicationName: string;
  reactionType: string;
  severity: 'mild' | 'moderate' | 'severe' | 'fatal';
  onsetDate: string;
  reportedBy: string;
  description: string;
  outcome: string;
  status: 'reported' | 'investigating' | 'confirmed' | 'closed';
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
  const [filteredPrescriptions, setFilteredPrescriptions] = useState<PendingPrescription[]>([]);
  const [selectedPrescription, setSelectedPrescription] = useState<PendingPrescription | null>(null);
  const [medicationItems, setMedicationItems] = useState<MedicationItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [filteredTransfers, setFilteredTransfers] = useState<TransferRequest[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [dispensingDrawerVisible, setDispensingDrawerVisible] = useState(false);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [inventoryDetailVisible, setInventoryDetailVisible] = useState(false);
  const [inventoryHistoryVisible, setInventoryHistoryVisible] = useState(false);
  const [transferDetailVisible, setTransferDetailVisible] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferRequest | null>(null);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transferForm] = Form.useForm();

  // Filter states
  const [prescriptionSearch, setPrescriptionSearch] = useState('');
  const [prescriptionStatusFilter, setPrescriptionStatusFilter] = useState('all');
  const [prescriptionPriorityFilter, setPrescriptionPriorityFilter] = useState('all');
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryWarehouseFilter, setInventoryWarehouseFilter] = useState('all');
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState('all');
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState('all');
  const [transferSearch, setTransferSearch] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [transferDrugItems, setTransferDrugItems] = useState<TransferDrugItem[]>([]);
  const [inventoryHistory, setInventoryHistory] = useState<{ id: string; transactionType: string; quantity: number; batchNumber?: string; referenceCode?: string; note?: string; createdDate: string; createdBy: string }[]>([]);
  const [inventoryHistoryLoading, setInventoryHistoryLoading] = useState(false);

  // Clinical Pharmacy states
  const [clinicalReviews, setClinicalReviews] = useState<ClinicalReview[]>([]);
  const [adrReports, setAdrReports] = useState<AdrReport[]>([]);
  const [clinicalSubTab, setClinicalSubTab] = useState('reviews');
  const [adrModalVisible, setAdrModalVisible] = useState(false);
  const [adrForm] = Form.useForm();

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
      setFilteredPrescriptions(prescriptions.data);
      setInventoryItems(inventory.data);
      setFilteredInventory(inventory.data);
      setTransfers(transferList.data);
      setFilteredTransfers(transferList.data);
      setAlerts(alertList.data);

      // Load clinical pharmacy reviews (optional API)
      try {
        const reviewsRes = await pharmacyApi.getClinicalReviews?.();
        if (reviewsRes?.data) setClinicalReviews(reviewsRes.data);
      } catch { /* Clinical reviews API optional */ }
      try {
        const adrRes = await pharmacyApi.getAdrReports?.();
        if (adrRes?.data) setAdrReports(adrRes.data);
      } catch { /* ADR reports API optional */ }
    } catch (error) {
      message.warning('Không thể tải dữ liệu. Vui lòng thử lại.');
      console.warn('Error fetching pharmacy data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ==================== FILTER FUNCTIONS ====================

  const applyPrescriptionFilters = (records: PendingPrescription[], search: string, status: string, priority: string) => {
    let filtered = [...records];
    if (search) {
      const lower = search.toLowerCase();
      filtered = filtered.filter(p =>
        p.prescriptionCode.toLowerCase().includes(lower) ||
        p.patientCode.toLowerCase().includes(lower) ||
        p.patientName.toLowerCase().includes(lower)
      );
    }
    if (status !== 'all') {
      filtered = filtered.filter(p => p.status === status);
    }
    if (priority !== 'all') {
      filtered = filtered.filter(p => p.priority === priority);
    }
    setFilteredPrescriptions(filtered);
  };

  const applyInventoryFilters = (records: InventoryItem[], search: string, warehouse: string, category: string, status: string) => {
    let filtered = [...records];
    if (search) {
      const lower = search.toLowerCase();
      filtered = filtered.filter(i =>
        i.medicationCode.toLowerCase().includes(lower) ||
        i.medicationName.toLowerCase().includes(lower)
      );
    }
    if (warehouse !== 'all') {
      const warehouseMap: Record<string, string> = { main: 'Kho thuốc chính', floor1: 'Nhà thuốc tầng 1' };
      filtered = filtered.filter(i => i.warehouse.includes(warehouseMap[warehouse] || warehouse));
    }
    if (category !== 'all') {
      const catMap: Record<string, string> = { pain: 'giảm đau', antibiotic: 'Kháng sinh', vitamin: 'Vitamin' };
      filtered = filtered.filter(i => i.category.toLowerCase().includes((catMap[category] || category).toLowerCase()));
    }
    if (status !== 'all') {
      filtered = filtered.filter(i => i.status === status);
    }
    setFilteredInventory(filtered);
  };

  const handleBarcodeScan = useCallback((decodedText: string) => {
    message.success(`Đã quét: ${decodedText}`);
    setInventorySearch(decodedText);
    applyInventoryFilters(inventoryItems, decodedText, inventoryWarehouseFilter, inventoryCategoryFilter, inventoryStatusFilter);
  }, [inventoryItems, inventoryWarehouseFilter, inventoryCategoryFilter, inventoryStatusFilter]);

  const applyTransferFilters = (records: TransferRequest[], search: string) => {
    let filtered = [...records];
    if (search) {
      const lower = search.toLowerCase();
      filtered = filtered.filter(t =>
        t.transferCode.toLowerCase().includes(lower) ||
        t.fromWarehouse.toLowerCase().includes(lower) ||
        t.toWarehouse.toLowerCase().includes(lower)
      );
    }
    setFilteredTransfers(filtered);
  };

  // Handle view prescription detail
  const handleViewPrescriptionDetail = async (record: PendingPrescription) => {
    try {
      setLoading(true);
      const medicationsResponse = await pharmacyApi.getMedicationItems(record.id);
      setMedicationItems(medicationsResponse.data);
      setSelectedPrescription(record);
      setDetailDrawerVisible(true);
    } catch (error) {
      message.warning('Không thể tải chi tiết đơn thuốc');
      console.warn('Error loading prescription detail:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle inventory detail
  const handleViewInventoryDetail = (record: InventoryItem) => {
    setSelectedInventoryItem(record);
    setInventoryDetailVisible(true);
  };

  // Handle inventory history
  const handleViewInventoryHistory = async (record: InventoryItem) => {
    setSelectedInventoryItem(record);
    setInventoryHistoryVisible(true);
    setInventoryHistoryLoading(true);
    try {
      const response = await pharmacyApi.getInventoryHistory(record.id);
      setInventoryHistory(response.data);
    } catch (error) {
      console.warn('Error loading inventory history:', error);
      message.warning('Không thể tải lịch sử xuất nhập');
      setInventoryHistory([]);
    } finally {
      setInventoryHistoryLoading(false);
    }
  };

  // Handle "Loc" in inventory
  const handleInventoryFilter = () => {
    applyInventoryFilters(inventoryItems, inventorySearch, inventoryWarehouseFilter, inventoryCategoryFilter, inventoryStatusFilter);
  };

  // Handle "Dong bo" in inventory
  const handleInventorySync = async () => {
    try {
      setLoading(true);
      const inventory = await pharmacyApi.getInventoryItems();
      setInventoryItems(inventory.data);
      setFilteredInventory(inventory.data);
      message.success('Đã đồng bộ dữ liệu tồn kho');
    } catch (error) {
      message.warning('Lỗi khi đồng bộ tồn kho');
      console.warn('Error syncing inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle transfer detail
  const handleViewTransferDetail = (record: TransferRequest) => {
    setSelectedTransfer(record);
    setTransferDetailVisible(true);
  };

  // Handle "Them thuoc" in transfer modal
  const handleAddTransferDrug = () => {
    setTransferDrugItems(prev => [...prev, { _key: `td-${Date.now()}-${prev.length}`, medicationCode: '', medicationName: '', quantity: 1, unit: 'viên' }]);
  };

  // Handle update transfer drug item
  const handleUpdateTransferDrug = <K extends keyof TransferDrugItem>(index: number, field: K, value: TransferDrugItem[K]) => {
    setTransferDrugItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Handle remove transfer drug item
  const handleRemoveTransferDrug = (index: number) => {
    setTransferDrugItems(prev => prev.filter((_, i) => i !== index));
  };

  // Handle resolve alert
  const handleResolveAlert = async (alertId: string) => {
    try {
      await pharmacyApi.resolveAlert(alertId);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      message.success('Đã xử lý cảnh báo');
    } catch (error) {
      message.warning('Không thể xử lý cảnh báo');
      console.warn('Error resolving alert:', error);
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
      message.warning('Không thể tiếp nhận đơn thuốc. Vui lòng thử lại.');
      console.warn('Error accepting prescription:', error);
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
          message.warning('Không thể từ chối đơn thuốc. Vui lòng thử lại.');
          console.warn('Error rejecting prescription:', error);
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
      sorter: (a) => (a.priority === 'urgent' ? -1 : 1),
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
          <span className="text-gray-500 text-xs">
            {record.patientCode}
          </span>
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
        <div className="flex items-center gap-2">
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
                  message.warning('Không thể tải thông tin thuốc. Vui lòng thử lại.');
                  console.warn('Error loading medications:', error);
                } finally {
                  setLoading(false);
                }
              }}
            >
              Cấp phát
            </Button>
          )}
          <Button size="small" icon={<FileTextOutlined />} onClick={() => handleViewPrescriptionDetail(record)}>
            Chi tiết
          </Button>
        </div>
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
      message.warning('Không thể mở cửa sổ in. Vui lòng cho phép popup.');
      return;
    }

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
        <div className="header">
          <div className="header-left">
            <div><strong>${HOSPITAL_NAME}</strong></div>
            <div>Khoa Dược</div>
          </div>
          <div style="text-align: right;">
            <div><strong>MS: 05/BV-02</strong></div>
            <div>Số: ${selectedPrescription.prescriptionCode}</div>
          </div>
        </div>

        <div className="title">PHIẾU XUẤT THUỐC</div>
        <div style="text-align: center; margin-bottom: 10px;">Ngày ${dayjs().format('DD')} tháng ${dayjs().format('MM')} năm ${dayjs().format('YYYY')}</div>

        <div className="info-row">Mã BN: <span className="field">${selectedPrescription.patientCode}</span> Họ tên: <span className="field" style="width: 200px;"><strong>${selectedPrescription.patientName}</strong></span></div>
        <div className="info-row">Khoa/Phòng: <span className="field">${selectedPrescription.department}</span> Bác sĩ kê: <span className="field">${selectedPrescription.doctorName}</span></div>

        <table>
          <thead>
            <tr>
              <th className="text-center" style="width: 30px;">STT</th>
              <th>Tên thuốc</th>
              <th className="text-center" style="width: 50px;">ĐVT</th>
              <th className="text-center" style="width: 40px;">SL</th>
              <th style="width: 80px;">Số lô</th>
              <th style="width: 65px;">Hạn SD</th>
              <th style="width: 100px;">Cách dùng</th>
            </tr>
          </thead>
          <tbody>
            ${medicationItems.filter(item => item.dispensedQuantity > 0).map((item, index) => {
              const batch = item.batches?.find(b => b.batchNumber === item.selectedBatch) || item.batches?.[0];
              return `
                <tr>
                  <td className="text-center">${index + 1}</td>
                  <td><strong>${item.medicationName}</strong></td>
                  <td className="text-center">${item.unit}</td>
                  <td className="text-center">${item.dispensedQuantity}</td>
                  <td>${batch?.batchNumber || 'N/A'}</td>
                  <td>${batch?.expiryDate ? dayjs(batch.expiryDate).format('DD/MM/YY') : 'N/A'}</td>
                  <td style="font-size: 10px;">${item.dosage}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div className="instructions">
          <strong>Hướng dẫn sử dụng:</strong>
          <ul style="margin-left: 15px; margin-top: 5px;">
            ${medicationItems.filter(item => item.dispensedQuantity > 0 && item.instruction).map(item =>
              `<li><strong>${item.medicationName}:</strong> ${item.instruction}</li>`
            ).join('')}
          </ul>
        </div>

        <div className="signature-row">
          <div className="signature-col">
            <div><strong>NGƯỜI NHẬN</strong></div>
            <div>(Ký, ghi rõ họ tên)</div>
          </div>
          <div className="signature-col">
            <div><strong>DƯỢC SĨ PHÁT</strong></div>
            <div>(Ký, ghi rõ họ tên)</div>
          </div>
          <div className="signature-col">
            <div><strong>TRƯỞNG KHOA</strong></div>
            <div>(Ký, ghi rõ họ tên)</div>
          </div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.focus(); printWindow.print(); }, 500);
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
            message.warning('Không thể hoàn thành cấp phát. Vui lòng thử lại.');
            console.warn('Error completing dispensing:', error);
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
        message.warning('Không thể hoàn thành cấp phát. Vui lòng thử lại.');
        console.warn('Error completing dispensing:', error);
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
          <span className="text-gray-500 text-xs">
            Min: {record.minStock}
          </span>
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
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <Button size="small" onClick={() => handleViewInventoryDetail(record)}>Chi tiết</Button>
          <Button size="small" type="link" onClick={() => handleViewInventoryHistory(record)}>
            Lịch sử
          </Button>
        </div>
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
      message.warning('Không thể duyệt phiếu điều chuyển. Vui lòng thử lại.');
      console.warn('Error approving transfer:', error);
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
          message.warning('Không thể từ chối phiếu điều chuyển. Vui lòng thử lại.');
          console.warn('Error rejecting transfer:', error);
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
      message.warning('Không thể xác nhận nhận hàng. Vui lòng thử lại.');
      console.warn('Error receiving transfer:', error);
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
        <div className="flex items-center gap-2">
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
          <Button size="small" onClick={() => handleViewTransferDetail(record)}>Chi tiết</Button>
        </div>
      ),
    },
  ];

  const handleCreateTransfer = async () => {
    try {
      const values = await transferForm.validateFields();
      await pharmacyApi.createTransfer({
        ...values,
        items: transferDrugItems.filter(item => item.medicationCode && item.quantity > 0),
      });
      message.success('Tạo phiếu điều chuyển thành công');
      setTransferModalVisible(false);
      transferForm.resetFields();
      setTransferDrugItems([]);

      // Refresh transfers list
      const transferList = await pharmacyApi.getTransferRequests();
      setTransfers(transferList.data);
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        // Form validation error, no need to show message
        return;
      }
      message.warning('Không thể tạo phiếu điều chuyển. Vui lòng thử lại.');
      console.warn('Error creating transfer:', error);
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
      message.warning('Không thể xác nhận cảnh báo. Vui lòng thử lại.');
      console.warn('Error acknowledging alert:', error);
    }
  };

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;

  // ==================== RENDER ====================

  const renderPendingPrescriptionsTab = () => (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="w-full lg:w-1/4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div><div className="text-xs text-gray-500 font-semibold">Chờ xử lý</div><div className="text-2xl font-bold">{pendingPrescriptions.filter((p) => p.status === 'pending').length}</div></div>
          </div>
        </div>
        <div className="w-full lg:w-1/4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div><div className="text-xs text-gray-500 font-semibold">Đang cấp phát</div><div className="text-2xl font-bold">{pendingPrescriptions.filter((p) => p.status === 'dispensing').length}</div></div>
          </div>
        </div>
        <div className="w-full lg:w-1/4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div><div className="text-xs text-gray-500 font-semibold">Hoàn thành hôm nay</div><div className="text-2xl font-bold">{15}</div></div>
          </div>
        </div>
        <div className="w-full lg:w-1/4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div><div className="text-xs text-gray-500 font-semibold">Khẩn cấp</div><div className="text-2xl font-bold">{pendingPrescriptions.filter((p) => p.priority === 'urgent').length}</div></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="flex-1">
            <Search
              placeholder="Tìm theo mã đơn, mã BN, tên bệnh nhân..."
              allowClear
              enterButton={<SearchOutlined />}
              style={{ maxWidth: 400 }}
              value={prescriptionSearch}
              onChange={(e) => setPrescriptionSearch(e.target.value)}
              onSearch={(value) => {
                setPrescriptionSearch(value);
                applyPrescriptionFilters(pendingPrescriptions, value, prescriptionStatusFilter, prescriptionPriorityFilter);
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Select
                value={prescriptionStatusFilter}
                style={{ width: 150 }}
                onChange={(value) => {
                  setPrescriptionStatusFilter(value);
                  applyPrescriptionFilters(pendingPrescriptions, prescriptionSearch, value, prescriptionPriorityFilter);
                }}
              >
                <Select.Option value="all">Tất cả trạng thái</Select.Option>
                <Select.Option value="pending">Chờ xử lý</Select.Option>
                <Select.Option value="dispensing">Đang cấp phát</Select.Option>
              </Select>
              <Select
                value={prescriptionPriorityFilter}
                style={{ width: 150 }}
                onChange={(value) => {
                  setPrescriptionPriorityFilter(value);
                  applyPrescriptionFilters(pendingPrescriptions, prescriptionSearch, prescriptionStatusFilter, value);
                }}
              >
                <Select.Option value="all">Tất cả mức độ</Select.Option>
                <Select.Option value="urgent">Khẩn cấp</Select.Option>
                <Select.Option value="normal">Bình thường</Select.Option>
              </Select>
            </div>
          </div>
        </div>

        <Table
          columns={pendingPrescriptionsColumns}
          dataSource={filteredPrescriptions}
          rowKey="id"
          size="small"
          scroll={{ x: 1400 }}
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Tổng: ${total} đơn thuốc`,
          }}
          onRow={(record) => ({
            onDoubleClick: () => handleViewPrescriptionDetail(record),
            style: { cursor: 'pointer' },
          })}
        />
      </div>
    </div>
  );

  const renderDispensingDrawer = () => (
    <Drawer
      title={
        <div>
          <div>Cấp phát thuốc</div>
          {selectedPrescription && (
            <span className="text-gray-500 text-xs">
              Đơn thuốc: {selectedPrescription.prescriptionCode} - Bệnh nhân:{' '}
              {selectedPrescription.patientName}
            </span>
          )}
        </div>
      }
      placement="right"
      size="large"
      open={dispensingDrawerVisible}
      onClose={() => setDispensingDrawerVisible(false)}
      footer={
        <div className="flex items-center gap-2">
          <Button onClick={() => setDispensingDrawerVisible(false)}>Hủy</Button>
          <Button icon={<PrinterOutlined />} onClick={executePrintDispensingSlip}>
            In phiếu xuất
          </Button>
          <Button type="primary" icon={<CheckOutlined />} onClick={handleCompleteDispensing}>
            Hoàn thành cấp phát
          </Button>
        </div>
      }
    >
      {selectedPrescription && (
        <>
          <Alert
            title="Thông tin đơn thuốc"
            description={
              <Descriptions size="small" column={{ xs: 1, sm: 2 }} style={{ marginTop: 4 }}>
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
            }
            type="info"
            style={{ marginBottom: 16 }}
          />

          <div style={{ marginBottom: 16 }}>
            <span className="font-semibold">Tiến độ cấp phát:</span>
            
          </div>

          <hr className="border-gray-200 my-4" />

          {medicationItems.map((item, index) => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-3">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                <span className="font-semibold">
                  {index + 1}. {item.medicationName}
                </span>
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
              </h4>
              <div className="flex gap-4 flex-wrap">
                <div className="w-full">
                  <div className="flex flex-col gap-2">
                    <div>
                      <span className="text-gray-500 text-sm">Liều lượng:</span> <span className="text-sm">{item.dosage}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-sm">Hướng dẫn:</span> <span className="text-sm">{item.instruction}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-sm">Số lượng cần cấp:</span>{' '}
                      <span className="font-semibold">
                        {item.quantity} {item.unit}
                      </span>
                    </div>

                    <hr className="border-gray-200 my-4" />

                    <div>
                      <span className="font-semibold">Chọn lô thuốc:</span>
                      <Radio.Group
                        style={{ width: '100%', marginTop: 8 }}
                        value={item.selectedBatch}
                        onChange={(e) => handleBatchSelect(item.id, e.target.value)}
                      >
                        <div className="flex flex-col gap-2">
                          {item.batches.map((batch) => (
                            <Radio key={batch.batchNumber} value={batch.batchNumber}>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">Lô: {batch.batchNumber}</span>
                                  {getBatchStatusTag(batch)}
                                </div>
                                <div style={{ marginLeft: 24, marginTop: 4 }}>
                                  <span className="text-gray-500 text-xs">
                                    HSD: {dayjs(batch.expiryDate).format('DD/MM/YYYY')} | Tồn:{' '}
                                    {batch.availableQuantity} {item.unit} | Kho:{' '}
                                    {batch.warehouse}
                                  </span>
                                </div>
                              </div>
                            </Radio>
                          ))}
                        </div>
                      </Radio.Group>
                    </div>

                    <hr className="border-gray-200 my-4" />

                    <div>
                      <span className="font-semibold">Số lượng cấp phát:</span>
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
                  </div>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </Drawer>
  );

  const renderInventoryTab = () => (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="w-full lg:w-1/4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div><div className="text-xs text-gray-500 font-semibold">Tổng mặt hàng</div><div className="text-2xl font-bold">{inventoryItems.length}</div></div>
          </div>
        </div>
        <div className="w-full lg:w-1/4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div><div className="text-xs text-gray-500 font-semibold">Sắp hết hàng</div><div className="text-2xl font-bold">{inventoryItems.filter((i) => i.status === 'low').length}</div></div>
          </div>
        </div>
        <div className="w-full lg:w-1/4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div><div className="text-xs text-gray-500 font-semibold">Hết hàng</div><div className="text-2xl font-bold">{inventoryItems.filter((i) => i.status === 'out').length}</div></div>
          </div>
        </div>
        <div className="w-full lg:w-1/4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div><div className="text-xs text-gray-500 font-semibold">Sắp hết hạn</div><div className="text-2xl font-bold">{inventoryItems.filter((i) => i.status === 'expiring').length}</div></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Search
                placeholder="Tìm theo mã thuốc, tên thuốc..."
                allowClear
                enterButton={<SearchOutlined />}
                style={{ maxWidth: 400 }}
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                onSearch={(value) => {
                  setInventorySearch(value);
                  applyInventoryFilters(inventoryItems, value, inventoryWarehouseFilter, inventoryCategoryFilter, inventoryStatusFilter);
                }}
              />
              <Button icon={<ScanOutlined />} onClick={() => setIsScannerOpen(true)} title="Quét mã vạch thuốc" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Select
                value={inventoryWarehouseFilter}
                style={{ width: 150 }}
                placeholder="Kho"
                onChange={(value) => {
                  setInventoryWarehouseFilter(value);
                  applyInventoryFilters(inventoryItems, inventorySearch, value, inventoryCategoryFilter, inventoryStatusFilter);
                }}
              >
                <Select.Option value="all">Tất cả kho</Select.Option>
                <Select.Option value="main">Kho thuốc chính</Select.Option>
                <Select.Option value="floor1">Nhà thuốc tầng 1</Select.Option>
              </Select>
              <Select
                value={inventoryCategoryFilter}
                style={{ width: 150 }}
                placeholder="Danh mục"
                onChange={(value) => {
                  setInventoryCategoryFilter(value);
                  applyInventoryFilters(inventoryItems, inventorySearch, inventoryWarehouseFilter, value, inventoryStatusFilter);
                }}
              >
                <Select.Option value="all">Tất cả danh mục</Select.Option>
                <Select.Option value="pain">Thuốc giảm đau</Select.Option>
                <Select.Option value="antibiotic">Kháng sinh</Select.Option>
                <Select.Option value="vitamin">Vitamin</Select.Option>
              </Select>
              <Select
                value={inventoryStatusFilter}
                style={{ width: 150 }}
                placeholder="Trạng thái"
                onChange={(value) => {
                  setInventoryStatusFilter(value);
                  applyInventoryFilters(inventoryItems, inventorySearch, inventoryWarehouseFilter, inventoryCategoryFilter, value);
                }}
              >
                <Select.Option value="all">Tất cả</Select.Option>
                <Select.Option value="low">Sắp hết</Select.Option>
                <Select.Option value="out">Hết hàng</Select.Option>
                <Select.Option value="expiring">Gần hết hạn</Select.Option>
              </Select>
              <Button icon={<FilterOutlined />} onClick={handleInventoryFilter}>Lọc</Button>
              <Button icon={<SyncOutlined />} onClick={handleInventorySync} loading={loading}>Đồng bộ</Button>
            </div>
          </div>
        </div>

        <Table
          columns={inventoryColumns}
          dataSource={filteredInventory}
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
          onRow={(record) => ({
            onDoubleClick: () => handleViewInventoryDetail(record),
            style: { cursor: 'pointer' },
          })}
        />
      </div>
    </div>
  );

  const renderTransfersTab = () => (
    <div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="flex-1">
            <Search
              placeholder="Tìm theo mã phiếu, kho..."
              allowClear
              enterButton={<SearchOutlined />}
              style={{ maxWidth: 400 }}
              value={transferSearch}
              onChange={(e) => setTransferSearch(e.target.value)}
              onSearch={(value) => {
                setTransferSearch(value);
                applyTransferFilters(transfers, value);
              }}
            />
          </div>
          <div>
            <Button
              type="primary"
              icon={<SwapOutlined />}
              onClick={() => setTransferModalVisible(true)}
            >
              Tạo phiếu điều chuyển
            </Button>
          </div>
        </div>

        <Table
          columns={transferColumns}
          dataSource={filteredTransfers}
          rowKey="id"
          size="small"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Tổng: ${total} phiếu`,
          }}
          onRow={(record) => ({
            onDoubleClick: () => handleViewTransferDetail(record),
            style: { cursor: 'pointer' },
          })}
        />
      </div>

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
          <div className="flex gap-4 flex-wrap">
            <div className="w-full lg:w-1/2">
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
            </div>
            <div className="w-full lg:w-1/2">
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
            </div>
          </div>

          <Form.Item name="note" label="Ghi chú">
            <TextArea rows={3} placeholder="Nhập lý do điều chuyển..." />
          </Form.Item>

          <div className="flex items-center gap-3 my-4"><hr className="flex-1 border-gray-200" /><span className="text-xs text-gray-500 font-medium whitespace-nowrap">Danh sách thuốc điều chuyển</span><hr className="flex-1 border-gray-200" /></div>

          {transferDrugItems.map((item, index) => (
            <div className="flex gap-2 flex-wrap mb-2">
              <div className="w-full lg:w-1/3">
                <Input
                  placeholder="Tên thuốc"
                  value={item.medicationName}
                  onChange={(e) => handleUpdateTransferDrug(index, 'medicationName', e.target.value)}
                />
              </div>
              <div className="w-full lg:w-1/6">
                <Input
                  placeholder="Mã thuốc"
                  value={item.medicationCode}
                  onChange={(e) => handleUpdateTransferDrug(index, 'medicationCode', e.target.value)}
                />
              </div>
              <div className="w-full lg:w-1/6">
                <InputNumber
                  min={1}
                  placeholder="SL"
                  value={item.quantity}
                  onChange={(value) => handleUpdateTransferDrug(index, 'quantity', value || 1)}
                  style={{ width: '100%' }}
                />
              </div>
              <div className="w-full lg:w-1/6">
                <Input
                  placeholder="ĐVT"
                  value={item.unit}
                  onChange={(e) => handleUpdateTransferDrug(index, 'unit', e.target.value)}
                />
              </div>
              <div className="w-full lg:w-1/6">
                <Button danger icon={<CloseOutlined />} onClick={() => handleRemoveTransferDrug(index)} />
              </div>
            </div>
          ))}

          <Button type="dashed" block icon={<PlusOutlined />} onClick={handleAddTransferDrug}>
            Thêm thuốc
          </Button>
        </Form>
      </Modal>
    </div>
  );

  const renderAlertsTab = () => (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="w-full lg:w-1/3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div><div className="text-xs text-gray-500 font-semibold">Cảnh báo chưa xử lý</div><div className="text-2xl font-bold">{unacknowledgedCount}</div></div>
          </div>
        </div>
        <div className="w-full lg:w-1/3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div><div className="text-xs text-gray-500 font-semibold">Sắp hết hàng</div><div className="text-2xl font-bold">{alerts.filter((a) => a.type === 'low_stock').length}</div></div>
          </div>
        </div>
        <div className="w-full lg:w-1/3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div><div className="text-xs text-gray-500 font-semibold">Sắp hết hạn</div><div className="text-2xl font-bold">{alerts.filter((a) => a.type === 'expiry').length}</div></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-col gap-2">
          {alerts.map((alert) => (
            <Alert
              key={alert.id}
              title={
                <div>
                  <div className="flex items-center gap-2">
                    {getAlertIcon(alert.type)}
                    <span className="font-semibold">{alert.medicationName || 'Cảnh báo hệ thống'}</span>
                    <Tag color={getAlertSeverityColor(alert.severity)}>
                      {alert.severity === 'high'
                        ? 'Cao'
                        : alert.severity === 'medium'
                        ? 'Trung bình'
                        : 'Thấp'}
                    </Tag>
                  </div>
                </div>
              }
              description={
                <div>
                  <div>{alert.message}</div>
                  <div style={{ marginTop: 8 }}>
                    <span className="text-gray-500 text-xs">
                      {dayjs(alert.createdDate).format('DD/MM/YYYY HH:mm')}
                    </span>
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
                  <div className="flex items-center gap-2">
                    <Button size="small" onClick={() => handleAcknowledgeAlert(alert.id)}>
                      Xác nhận
                    </Button>
                    <Button size="small" type="primary" onClick={() => handleResolveAlert(alert.id)}>
                      Xử lý
                    </Button>
                  </div>
                )
              }
              style={{
                opacity: alert.acknowledged ? 0.6 : 1,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );

  // ==================== CLINICAL PHARMACY TAB ====================

  const reviewTypeLabels: Record<string, { text: string; color: string }> = {
    routine: { text: 'Thường quy', color: 'blue' },
    interaction: { text: 'Tương tác', color: 'red' },
    dose: { text: 'Liều lượng', color: 'orange' },
    allergy: { text: 'Dị ứng', color: 'volcano' },
    duplicate: { text: 'Trùng lặp', color: 'gold' },
    renal: { text: 'Chức năng thận', color: 'purple' },
    adr: { text: 'ADR', color: 'magenta' },
  };

  const reviewColumns: ColumnsType<ClinicalReview> = [
    { title: 'Mã đơn', dataIndex: 'prescriptionCode', key: 'prescriptionCode', width: 120 },
    { title: 'Bệnh nhân', dataIndex: 'patientName', key: 'patientName', width: 150 },
    {
      title: 'Loại', key: 'reviewType', width: 120,
      render: (_, r) => <Tag color={reviewTypeLabels[r.reviewType]?.color}>{reviewTypeLabels[r.reviewType]?.text || r.reviewType}</Tag>,
    },
    {
      title: 'Mức độ', key: 'severity', width: 100,
      render: (_, r) => <Tag color={r.severity === 'high' ? 'red' : r.severity === 'medium' ? 'orange' : 'green'}>{r.severity === 'high' ? 'Cao' : r.severity === 'medium' ? 'TB' : 'Thấp'}</Tag>,
    },
    { title: 'Phát hiện', dataIndex: 'findings', key: 'findings', ellipsis: true },
    { title: 'Khuyến cáo', dataIndex: 'recommendation', key: 'recommendation', ellipsis: true },
    {
      title: 'Trạng thái', key: 'status', width: 110,
      render: (_, r) => {
        const m: Record<string, { text: string; color: string }> = { pending: { text: 'Chờ duyệt', color: 'gold' }, approved: { text: 'Đã duyệt', color: 'green' }, flagged: { text: 'Cảnh báo', color: 'red' }, rejected: { text: 'Từ chối', color: 'default' } };
        return <Tag color={m[r.status]?.color}>{m[r.status]?.text || r.status}</Tag>;
      },
    },
    { title: 'Ngày', dataIndex: 'createdAt', key: 'createdAt', width: 100, render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
  ];

  const adrColumns: ColumnsType<AdrReport> = [
    { title: 'Bệnh nhân', dataIndex: 'patientName', key: 'patientName', width: 140 },
    { title: 'Thuốc gây ADR', dataIndex: 'medicationName', key: 'medicationName', width: 150 },
    { title: 'Phản ứng', dataIndex: 'reactionType', key: 'reactionType', width: 130 },
    {
      title: 'Mức độ', key: 'severity', width: 100,
      render: (_, r) => {
        const c: Record<string, string> = { mild: 'green', moderate: 'gold', severe: 'orange', fatal: 'red' };
        const t: Record<string, string> = { mild: 'Nhẹ', moderate: 'TB', severe: 'Nặng', fatal: 'Tử vong' };
        return <Tag color={c[r.severity]}>{t[r.severity]}</Tag>;
      },
    },
    { title: 'Ngày khởi phát', dataIndex: 'onsetDate', key: 'onsetDate', width: 110, render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
    { title: 'Người báo cáo', dataIndex: 'reportedBy', key: 'reportedBy', width: 130 },
    {
      title: 'Trạng thái', key: 'status', width: 110,
      render: (_, r) => {
        const m: Record<string, { text: string; color: string }> = { reported: { text: 'Đã báo', color: 'blue' }, investigating: { text: 'Đang ĐT', color: 'gold' }, confirmed: { text: 'Xác nhận', color: 'red' }, closed: { text: 'Đóng', color: 'default' } };
        return <Tag color={m[r.status]?.color}>{m[r.status]?.text}</Tag>;
      },
    },
    { title: 'Kết quả', dataIndex: 'outcome', key: 'outcome', ellipsis: true },
  ];

  const handleSubmitAdr = async () => {
    try {
      const values = await adrForm.validateFields();
      try {
        await pharmacyApi.submitAdrReport?.(values);
        message.success('Báo cáo ADR đã được gửi');
      } catch {
        message.warning('Chưa kết nối API báo cáo ADR');
      }
      setAdrModalVisible(false);
      adrForm.resetFields();
    } catch { /* validation */ }
  };

  const renderClinicalPharmacyTab = () => (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="w-full lg:w-1/4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div><div className="text-xs text-gray-500 font-semibold">Tổng review</div><div className="text-2xl font-bold">{clinicalReviews.length}</div></div>
          </div>
        </div>
        <div className="w-full lg:w-1/4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div><div className="text-xs text-gray-500 font-semibold">Cần xử lý</div><div className="text-2xl font-bold">{clinicalReviews.filter(r => r.status === 'pending' || r.status === 'flagged').length}</div></div>
          </div>
        </div>
        <div className="w-full lg:w-1/4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div><div className="text-xs text-gray-500 font-semibold">Báo cáo ADR</div><div className="text-2xl font-bold">{adrReports.length}</div></div>
          </div>
        </div>
        <div className="w-full lg:w-1/4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div><div className="text-xs text-gray-500 font-semibold">ADR nghiêm trọng</div><div className="text-2xl font-bold">{adrReports.filter(r => r.severity === 'severe' || r.severity === 'fatal').length}</div></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <Tabs activeKey={clinicalSubTab} onChange={setClinicalSubTab} items={[
          {
            key: 'reviews',
            label: <span><FileTextOutlined /> Duyệt đơn thuốc ({clinicalReviews.filter(r => r.status === 'pending').length} chờ)</span>,
            children: (
              <div>
                <div className="flex items-center gap-2">
                  <Select defaultValue="all" style={{ width: 160 }} options={[
                    { value: 'all', label: 'Tất cả loại' },
                    { value: 'interaction', label: 'Tương tác thuốc' },
                    { value: 'dose', label: 'Liều lượng' },
                    { value: 'allergy', label: 'Dị ứng' },
                    { value: 'duplicate', label: 'Trùng lặp' },
                    { value: 'renal', label: 'Chức năng thận' },
                    { value: 'adr', label: 'ADR' },
                  ]} />
                  <Select defaultValue="all" style={{ width: 140 }} options={[
                    { value: 'all', label: 'Tất cả TT' },
                    { value: 'pending', label: 'Chờ duyệt' },
                    { value: 'flagged', label: 'Cảnh báo' },
                    { value: 'approved', label: 'Đã duyệt' },
                  ]} />
                </div>
                <Table<ClinicalReview>
                  dataSource={clinicalReviews}
                  columns={reviewColumns}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 10 }}
                  rowClassName={(r) => r.severity === 'high' && r.status !== 'approved' ? 'ant-table-row-danger' : ''}
                />
              </div>
            ),
          },
          {
            key: 'adr',
            label: <span><WarningOutlined /> Báo cáo ADR ({adrReports.filter(r => r.status !== 'closed').length} đang xử lý)</span>,
            children: (
              <div>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                  <div className="flex items-center gap-2">
                    <Select defaultValue="all" style={{ width: 140 }} options={[
                      { value: 'all', label: 'Tất cả mức độ' },
                      { value: 'mild', label: 'Nhẹ' },
                      { value: 'moderate', label: 'Trung bình' },
                      { value: 'severe', label: 'Nặng' },
                      { value: 'fatal', label: 'Tử vong' },
                    ]} />
                  </div>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setAdrModalVisible(true)}>Báo cáo ADR mới</Button>
                </div>
                <Table<AdrReport>
                  dataSource={adrReports}
                  columns={adrColumns}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 10 }}
                />
              </div>
            ),
          },
          {
            key: 'reconciliation',
            label: <span><SyncOutlined /> Đối chiếu thuốc</span>,
            children: (
              <div>
                <Alert title="Đối chiếu thuốc (Medication Reconciliation)" description="Quy trình đối chiếu danh sách thuốc bệnh nhân đang sử dụng khi nhập viện, chuyển khoa và xuất viện. Phát hiện sai khác, bỏ sót hoặc trùng lặp thuốc giữa các giai đoạn điều trị." type="info" showIcon style={{ marginBottom: 16 }} />
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                    <MedicineBoxOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                    <div>Chọn bệnh nhân để bắt đầu đối chiếu thuốc</div>
                    <Button type="primary" style={{ marginTop: 16 }} icon={<SearchOutlined />}>Tìm bệnh nhân</Button>
                  </div>
                </div>
              </div>
            ),
          },
        ]} />
      </div>

      <Modal title="Báo cáo phản ứng có hại (ADR)" open={adrModalVisible} onCancel={() => setAdrModalVisible(false)} onOk={handleSubmitAdr} okText="Gửi báo cáo" width={600} destroyOnHidden>
        <Form form={adrForm} layout="vertical">
          <div className="flex gap-4 flex-wrap">
            <div className="w-full lg:w-1/2"><Form.Item name="patientCode" label="Mã bệnh nhân" rules={[{ required: true }]}><Input /></Form.Item></div>
            <div className="w-full lg:w-1/2"><Form.Item name="patientName" label="Họ tên" rules={[{ required: true }]}><Input /></Form.Item></div>
          </div>
          <div className="flex gap-4 flex-wrap">
            <div className="w-full lg:w-1/2"><Form.Item name="medicationName" label="Thuốc nghi ngờ" rules={[{ required: true }]}><Input /></Form.Item></div>
            <div className="w-full lg:w-1/2"><Form.Item name="reactionType" label="Loại phản ứng" rules={[{ required: true }]}><Select options={[
              { value: 'skin', label: 'Da (phát ban, mề đay)' },
              { value: 'gi', label: 'Tiêu hóa (buồn nôn, tiêu chảy)' },
              { value: 'liver', label: 'Gan (tăng men gan)' },
              { value: 'kidney', label: 'Thận (suy thận)' },
              { value: 'blood', label: 'Huyết học (giảm BC, TC)' },
              { value: 'neuro', label: 'Thần kinh (chóng mặt)' },
              { value: 'cardiac', label: 'Tim mạch (loạn nhịp)' },
              { value: 'anaphylaxis', label: 'Sốc phản vệ' },
              { value: 'other', label: 'Khác' },
            ]} /></Form.Item></div>
          </div>
          <div className="flex gap-4 flex-wrap">
            <div className="w-full lg:w-1/2"><Form.Item name="severity" label="Mức độ" rules={[{ required: true }]}><Select options={[
              { value: 'mild', label: 'Nhẹ' },
              { value: 'moderate', label: 'Trung bình' },
              { value: 'severe', label: 'Nặng' },
              { value: 'fatal', label: 'Tử vong' },
            ]} /></Form.Item></div>
            <div className="w-full lg:w-1/2"><Form.Item name="onsetDate" label="Ngày khởi phát"><Input type="date" /></Form.Item></div>
          </div>
          <Form.Item name="description" label="Mô tả chi tiết"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="outcome" label="Kết quả xử trí"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-800 m-0">Quản lý nhà thuốc</h2>
        <Button icon={<ReloadOutlined />} onClick={() => fetchData()} size="small">Làm mới</Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
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
            {
              key: 'clinical',
              label: (
                <span>
                  <ExclamationCircleOutlined />
                  Dược lâm sàng
                  <Badge count={clinicalReviews.filter(r => r.status === 'pending' || r.status === 'flagged').length} offset={[10, 0]} />
                </span>
              ),
              children: renderClinicalPharmacyTab(),
            },
          ]}
        />
      </div>

      {renderDispensingDrawer()}

      {/* Prescription Detail Drawer */}
      <Drawer
        title="Chi tiết đơn thuốc"
        placement="right"
        size="large"
        open={detailDrawerVisible}
        onClose={() => {
          setDetailDrawerVisible(false);
          setSelectedPrescription(null);
        }}
        footer={
          <Button onClick={() => setDetailDrawerVisible(false)}>Đóng</Button>
        }
      >
        {selectedPrescription && (
          <>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Mã đơn thuốc">{selectedPrescription.prescriptionCode}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">{getPrescriptionStatusTag(selectedPrescription.status)}</Descriptions.Item>
              <Descriptions.Item label="Bệnh nhân">{selectedPrescription.patientName}</Descriptions.Item>
              <Descriptions.Item label="Mã BN">{selectedPrescription.patientCode}</Descriptions.Item>
              <Descriptions.Item label="Bác sĩ">{selectedPrescription.doctorName}</Descriptions.Item>
              <Descriptions.Item label="Khoa">{selectedPrescription.department}</Descriptions.Item>
              <Descriptions.Item label="Mức độ">{getPriorityTag(selectedPrescription.priority)}</Descriptions.Item>
              <Descriptions.Item label="Thời gian">{dayjs(selectedPrescription.createdDate).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
              <Descriptions.Item label="Tổng tiền" span={2}>
                <span className="font-semibold">{selectedPrescription.totalAmount.toLocaleString('vi-VN')} đ</span>
              </Descriptions.Item>
            </Descriptions>

            <div className="flex items-center gap-3 my-4"><hr className="flex-1 border-gray-200" /><span className="text-xs text-gray-500 font-medium whitespace-nowrap">Danh sách thuốc ({medicationItems.length})</span><hr className="flex-1 border-gray-200" /></div>

            {medicationItems.map((item, index) => (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex gap-4 flex-wrap">
                  <div className="w-full lg:w-2/3">
                    <span className="font-semibold">{index + 1}. {item.medicationName}</span>
                    <br />
                    <span className="text-gray-500 text-sm">Mã: {item.medicationCode} | ĐVT: {item.unit}</span>
                    <br />
                    <span className="text-gray-500 text-sm">Liều: {item.dosage}</span>
                    <br />
                    <span className="text-gray-500 text-sm">Hướng dẫn: {item.instruction}</span>
                  </div>
                  <div>
                    <span className="font-semibold">SL: {item.quantity} {item.unit}</span>
                    <br />
                    <span className="text-gray-500 text-sm">Đã cấp: {item.dispensedQuantity}</span>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </Drawer>

      {/* Inventory Detail Drawer */}
      <Drawer
        title="Chi tiết thuốc tồn kho"
        placement="right"
        open={inventoryDetailVisible}
        onClose={() => {
          setInventoryDetailVisible(false);
          setSelectedInventoryItem(null);
        }}
        footer={
          <Button onClick={() => setInventoryDetailVisible(false)}>Đóng</Button>
        }
      >
        {selectedInventoryItem && (
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="Mã thuốc">{selectedInventoryItem.medicationCode}</Descriptions.Item>
            <Descriptions.Item label="Tên thuốc">{selectedInventoryItem.medicationName}</Descriptions.Item>
            <Descriptions.Item label="Danh mục">{selectedInventoryItem.category}</Descriptions.Item>
            <Descriptions.Item label="ĐVT">{selectedInventoryItem.unit}</Descriptions.Item>
            <Descriptions.Item label="Kho">{selectedInventoryItem.warehouse}</Descriptions.Item>
            <Descriptions.Item label="Tồn kho">{selectedInventoryItem.totalStock} {selectedInventoryItem.unit}</Descriptions.Item>
            <Descriptions.Item label="Tồn tối thiểu">{selectedInventoryItem.minStock} {selectedInventoryItem.unit}</Descriptions.Item>
            <Descriptions.Item label="Tồn tối đa">{selectedInventoryItem.maxStock} {selectedInventoryItem.unit}</Descriptions.Item>
            <Descriptions.Item label="Hạn sử dụng gần nhất">
              {selectedInventoryItem.nearestExpiry ? dayjs(selectedInventoryItem.nearestExpiry).format('DD/MM/YYYY') : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Giá trung bình">
              {selectedInventoryItem.averagePrice.toLocaleString('vi-VN')} đ
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              {getInventoryStatusTag(selectedInventoryItem.status)}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      {/* Inventory History Drawer */}
      <Drawer
        title={`Lịch sử xuất nhập - ${selectedInventoryItem?.medicationName || ''}`}
        placement="right"
        open={inventoryHistoryVisible}
        onClose={() => {
          setInventoryHistoryVisible(false);
          setSelectedInventoryItem(null);
        }}
        footer={
          <Button onClick={() => setInventoryHistoryVisible(false)}>Đóng</Button>
        }
      >
        {selectedInventoryItem && (
          <div className="flex flex-col gap-2">
            <Alert
              title={`Thuốc: ${selectedInventoryItem.medicationName}`}
              description={`Mã: ${selectedInventoryItem.medicationCode} | Kho: ${selectedInventoryItem.warehouse} | Tồn hiện tại: ${selectedInventoryItem.totalStock} ${selectedInventoryItem.unit}`}
              type="info"
            />
            {inventoryHistoryLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin tip="Đang tải lịch sử..." />
              </div>
            ) : inventoryHistory.length === 0 ? (
              <Alert
                title="Chưa có lịch sử"
                description="Chưa ghi nhận lịch sử xuất nhập cho thuốc này."
                type="info"
                showIcon
              />
            ) : (
              <Timeline
                items={inventoryHistory.map((entry) => {
                  const typeMap: Record<string, { color: string; label: string }> = {
                    import: { color: 'green', label: 'Nhập kho' },
                    export: { color: 'red', label: 'Xuất kho' },
                    transfer: { color: 'blue', label: 'Điều chuyển' },
                    adjust: { color: 'orange', label: 'Điều chỉnh' },
                  };
                  const { color, label } = typeMap[entry.transactionType] || { color: 'gray', label: entry.transactionType };
                  return {
                    color,
                    content: (
                      <div>
                        <div>
                          <Tag color={color}>{label}</Tag>
                          <span className="font-semibold">{entry.quantity > 0 ? `+${entry.quantity}` : entry.quantity}</span>
                          {' '}{selectedInventoryItem.unit}
                        </div>
                        {entry.batchNumber && <div><span className="text-gray-500 text-sm">Lô: {entry.batchNumber}</span></div>}
                        {entry.referenceCode && <div><span className="text-gray-500 text-sm">Mã tham chiếu: {entry.referenceCode}</span></div>}
                        {entry.note && <div><span className="text-gray-500 text-sm">Ghi chú: {entry.note}</span></div>}
                        <div>
                          <span className="text-gray-500 text-xs">
                            {dayjs(entry.createdDate).format('DD/MM/YYYY HH:mm')} - {entry.createdBy}
                          </span>
                        </div>
                      </div>
                    ),
                  };
                })}
              />
            )}
          </div>
        )}
      </Drawer>

      {/* Transfer Detail Drawer */}
      <Drawer
        title="Chi tiết phiếu điều chuyển"
        placement="right"
        open={transferDetailVisible}
        onClose={() => {
          setTransferDetailVisible(false);
          setSelectedTransfer(null);
        }}
        footer={
          <Button onClick={() => setTransferDetailVisible(false)}>Đóng</Button>
        }
      >
        {selectedTransfer && (
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="Mã phiếu">{selectedTransfer.transferCode}</Descriptions.Item>
            <Descriptions.Item label="Từ kho">{selectedTransfer.fromWarehouse}</Descriptions.Item>
            <Descriptions.Item label="Đến kho">{selectedTransfer.toWarehouse}</Descriptions.Item>
            <Descriptions.Item label="Người yêu cầu">{selectedTransfer.requestedBy}</Descriptions.Item>
            <Descriptions.Item label="Thời gian">{dayjs(selectedTransfer.requestedDate).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
            <Descriptions.Item label="Số mặt hàng">{selectedTransfer.itemsCount}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">{getTransferStatusTag(selectedTransfer.status)}</Descriptions.Item>
            {selectedTransfer.note && (
              <Descriptions.Item label="Ghi chú">{selectedTransfer.note}</Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Drawer>

      {/* Barcode/QR Scanner */}
      <BarcodeScanner
        open={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScan}
        title="Quét mã vạch thuốc / vật tư"
      />
    </div>
  );
};

export default Pharmacy;
