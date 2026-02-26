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
  DatePicker,
  Typography,
  message,
  Tabs,
  InputNumber,
  Statistic,
  Divider,
  Descriptions,
  Radio,
  Drawer,
} from 'antd';
import {
  SearchOutlined,
  PrinterOutlined,
  DollarOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  BarChartOutlined,
  WalletOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import {
  searchPatients,
  getUnpaidServices,
  getPatientDeposits,
  searchRefunds,
  createPayment,
  createDeposit,
  createRefund,
  approveRefund,
  cancelRefund,
  getDebtStatistics,
  type PatientBillingStatusDto,
  type UnpaidServiceItemDto,
  type DepositDto,
  type RefundDto,
  type CreatePaymentDto,
  type CreateDepositDto,
  type CreateRefundDto,
  type ApproveRefundDto,
  type RevenueReportRequestDto,
  type OutpatientRevenueReportDto,
  type DebtStatisticsDto,
  getOutpatientRevenueReport,
} from '../api/billing';
import { HOSPITAL_NAME } from '../constants/hospital';

const { Title, Text } = Typography;
const { Search } = Input;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

// ============= INTERFACES =============

interface Patient {
  id: string;
  code: string;
  name: string;
  gender: number;
  dateOfBirth: string;
  phoneNumber: string;
  insuranceNumber?: string;
  patientType: number;
}

interface UnpaidService {
  id: string;
  serviceCode: string;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  insuranceCoverage: number;
  insuranceAmount: number;
  patientAmount: number;
  serviceDate: string;
  departmentName: string;
  doctorName: string;
  serviceType: string;
}

// PaymentMethod interface - reserved for future use

interface Deposit {
  id: string;
  patientId: string;
  patientName: string;
  patientCode: string;
  amount: number;
  remainingAmount: number;
  depositDate: string;
  cashier: string;
  status: number;
  note?: string;
}

interface RefundRecord {
  id: string;
  patientId: string;
  patientName: string;
  patientCode: string;
  amount: number;
  reason: string;
  refundDate: string;
  requestedBy: string;
  approvedBy?: string;
  status: number;
  paymentMethod: string;
}

// DailyReport interface - reserved for future use

// ============= MAIN COMPONENT =============

const Billing: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('unpaid');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [unpaidServices, setUnpaidServices] = useState<UnpaidService[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [receiptDrawerVisible, setReceiptDrawerVisible] = useState(false);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [refundSearchText, setRefundSearchText] = useState('');
  const [refundDateRange, setRefundDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [reportData, setReportData] = useState<OutpatientRevenueReportDto | null>(null);
  const [debtData, setDebtData] = useState<DebtStatisticsDto | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [loading, setLoading] = useState(false);
  const [depositDetailVisible, setDepositDetailVisible] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [refundDetailVisible, setRefundDetailVisible] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState<RefundRecord | null>(null);
  const [serviceDetailVisible, setServiceDetailVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<UnpaidService | null>(null);

  const [paymentForm] = Form.useForm();
  const [depositForm] = Form.useForm();
  const [refundForm] = Form.useForm();

  // ============= PRINT FUNCTIONS =============

  // Print billing receipt (Phiếu thu tiền - MS: 04/BV-02)
  const executePrintReceipt = () => {
    if (!selectedPatient) return;

    const selectedItems = unpaidServices.filter((s) => selectedServices.includes(s.id));
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      message.error('Không thể mở cửa sổ in. Vui lòng cho phép popup.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Phiếu thu tiền - MS: 04/BV-02</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', serif; font-size: 13px; line-height: 1.4; padding: 20px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 10px; }
          .header-left { width: 50%; }
          .header-right { width: 30%; text-align: right; }
          .title { font-size: 20px; font-weight: bold; text-align: center; margin: 20px 0 10px; }
          .subtitle { text-align: center; margin-bottom: 20px; }
          .info-row { margin: 5px 0; }
          .field { border-bottom: 1px dotted #000; min-width: 150px; display: inline-block; padding: 0 5px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          table th, table td { border: 1px solid #000; padding: 6px; text-align: left; }
          table th { background-color: #f0f0f0; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .total-row { font-weight: bold; background-color: #f0f5ff; }
          .amount-words { font-style: italic; margin: 10px 0; }
          .signature-row { display: flex; justify-content: space-between; margin-top: 40px; text-align: center; }
          .signature-col { width: 30%; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <div><strong>${HOSPITAL_NAME}</strong></div>
            <div>Địa chỉ: 123 Đường ABC, Quận XYZ, TP.HCM</div>
            <div>ĐT: 028 1234 5678</div>
          </div>
          <div class="header-right">
            <div><strong>MS: 04/BV-02</strong></div>
            <div>Số: HD-${dayjs().format('YYYYMMDD')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}</div>
          </div>
        </div>

        <div class="title">PHIẾU THU TIỀN</div>
        <div class="subtitle">Ngày ${dayjs().format('DD')} tháng ${dayjs().format('MM')} năm ${dayjs().format('YYYY')}</div>

        <div class="info-row">Mã bệnh nhân: <span class="field">${selectedPatient.code}</span></div>
        <div class="info-row">Họ và tên: <span class="field" style="width: 300px;">${selectedPatient.name}</span> Giới tính: <span class="field">${selectedPatient.gender === 1 ? 'Nam' : 'Nữ'}</span></div>
        <div class="info-row">Ngày sinh: <span class="field">${selectedPatient.dateOfBirth ? dayjs(selectedPatient.dateOfBirth).format('DD/MM/YYYY') : ''}</span> SĐT: <span class="field">${selectedPatient.phoneNumber || ''}</span></div>
        <div class="info-row">Số thẻ BHYT: <span class="field" style="width: 200px;">${selectedPatient.insuranceNumber || 'Không có'}</span></div>
        <div class="info-row">Đối tượng: <span class="field">${selectedPatient.insuranceNumber ? 'BHYT' : 'Viện phí'}</span></div>

        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 40px;">STT</th>
              <th>Mã DV</th>
              <th>Tên dịch vụ</th>
              <th class="text-center">SL</th>
              <th class="text-right">Đơn giá</th>
              <th class="text-right">Thành tiền</th>
              <th class="text-right">BHYT trả</th>
              <th class="text-right">BN trả</th>
            </tr>
          </thead>
          <tbody>
            ${selectedItems.map((item, index) => `
              <tr>
                <td class="text-center">${index + 1}</td>
                <td>${item.serviceCode}</td>
                <td>${item.serviceName}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-right">${item.unitPrice.toLocaleString('vi-VN')}</td>
                <td class="text-right">${item.totalPrice.toLocaleString('vi-VN')}</td>
                <td class="text-right">${item.insuranceAmount.toLocaleString('vi-VN')}</td>
                <td class="text-right">${item.patientAmount.toLocaleString('vi-VN')}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="5" class="text-right">TỔNG CỘNG:</td>
              <td class="text-right">${totals.totalAmount.toLocaleString('vi-VN')} đ</td>
              <td class="text-right">${totals.insuranceAmount.toLocaleString('vi-VN')} đ</td>
              <td class="text-right">${totals.patientAmount.toLocaleString('vi-VN')} đ</td>
            </tr>
          </tbody>
        </table>

        <div class="amount-words">Số tiền bằng chữ: <strong>${numberToWords(totals.patientAmount)}</strong></div>
        <div class="info-row">Phương thức thanh toán: <span class="field">Tiền mặt / Chuyển khoản / Thẻ</span></div>

        <div class="signature-row">
          <div class="signature-col">
            <div><strong>Người nộp tiền</strong></div>
            <div>(Ký, ghi rõ họ tên)</div>
            <div style="margin-top: 60px;"></div>
          </div>
          <div class="signature-col">
            <div><strong>Kế toán</strong></div>
            <div>(Ký, ghi rõ họ tên)</div>
            <div style="margin-top: 60px;"></div>
          </div>
          <div class="signature-col">
            <div><strong>Thu ngân</strong></div>
            <div>(Ký, ghi rõ họ tên)</div>
            <div style="margin-top: 60px;"></div>
          </div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  // Print deposit receipt (Phiếu tạm ứng)
  const executePrintDeposit = (deposit: Deposit) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      message.error('Không thể mở cửa sổ in. Vui lòng cho phép popup.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Phiếu tạm ứng</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.5; padding: 30px; }
          .header { text-align: center; margin-bottom: 20px; }
          .title { font-size: 22px; font-weight: bold; margin: 20px 0; }
          .info { margin: 10px 0; }
          .field { border-bottom: 1px dotted #000; min-width: 150px; display: inline-block; padding: 0 5px; }
          .amount-box { border: 2px solid #000; padding: 15px; margin: 20px 0; text-align: center; font-size: 18px; }
          .signature-row { display: flex; justify-content: space-between; margin-top: 50px; text-align: center; }
          .signature-col { width: 45%; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div><strong>${HOSPITAL_NAME}</strong></div>
          <div>123 Đường ABC, Quận XYZ, TP.HCM - ĐT: 028 1234 5678</div>
        </div>

        <div class="title" style="text-align: center;">PHIẾU TẠM ỨNG</div>
        <div style="text-align: center; margin-bottom: 20px;">Ngày ${dayjs(deposit.depositDate).format('DD')} tháng ${dayjs(deposit.depositDate).format('MM')} năm ${dayjs(deposit.depositDate).format('YYYY')}</div>

        <div class="info">Mã bệnh nhân: <span class="field">${deposit.patientCode}</span></div>
        <div class="info">Họ và tên: <span class="field" style="width: 350px;">${deposit.patientName}</span></div>

        <div class="amount-box">
          <div>Số tiền tạm ứng:</div>
          <div style="font-size: 24px; font-weight: bold; color: #1890ff;">${deposit.amount.toLocaleString('vi-VN')} VNĐ</div>
          <div style="font-style: italic;">(${numberToWords(deposit.amount)})</div>
        </div>

        <div class="info">Ghi chú: <span class="field" style="width: 80%;">${deposit.note || ''}</span></div>
        <div class="info">Thu ngân: <span class="field">${deposit.cashier}</span></div>

        <div class="signature-row">
          <div class="signature-col">
            <div><strong>Người nộp tiền</strong></div>
            <div>(Ký, ghi rõ họ tên)</div>
          </div>
          <div class="signature-col">
            <div><strong>Thu ngân</strong></div>
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

  // Print refund receipt (Phiếu hoàn tiền)
  const executePrintRefund = (refund: RefundRecord) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      message.error('Không thể mở cửa sổ in. Vui lòng cho phép popup.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Phiếu hoàn tiền</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.5; padding: 30px; }
          .header { text-align: center; margin-bottom: 20px; }
          .title { font-size: 22px; font-weight: bold; margin: 20px 0; color: #f5222d; }
          .info { margin: 10px 0; }
          .field { border-bottom: 1px dotted #000; min-width: 150px; display: inline-block; padding: 0 5px; }
          .amount-box { border: 2px solid #f5222d; padding: 15px; margin: 20px 0; text-align: center; font-size: 18px; }
          .signature-row { display: flex; justify-content: space-between; margin-top: 50px; text-align: center; }
          .signature-col { width: 30%; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div><strong>${HOSPITAL_NAME}</strong></div>
          <div>123 Đường ABC, Quận XYZ, TP.HCM - ĐT: 028 1234 5678</div>
        </div>

        <div class="title" style="text-align: center;">PHIẾU HOÀN TIỀN</div>
        <div style="text-align: center; margin-bottom: 20px;">Ngày ${dayjs(refund.refundDate).format('DD')} tháng ${dayjs(refund.refundDate).format('MM')} năm ${dayjs(refund.refundDate).format('YYYY')}</div>

        <div class="info">Mã bệnh nhân: <span class="field">${refund.patientCode}</span></div>
        <div class="info">Họ và tên: <span class="field" style="width: 350px;">${refund.patientName}</span></div>

        <div class="amount-box">
          <div>Số tiền hoàn trả:</div>
          <div style="font-size: 24px; font-weight: bold; color: #f5222d;">${refund.amount.toLocaleString('vi-VN')} VNĐ</div>
          <div style="font-style: italic;">(${numberToWords(refund.amount)})</div>
        </div>

        <div class="info">Lý do hoàn tiền: <span class="field" style="width: 80%;">${refund.reason}</span></div>
        <div class="info">Phương thức hoàn: <span class="field">${refund.paymentMethod}</span></div>
        <div class="info">Người yêu cầu: <span class="field">${refund.requestedBy}</span></div>
        <div class="info">Người duyệt: <span class="field">${refund.approvedBy || ''}</span></div>

        <div class="signature-row">
          <div class="signature-col">
            <div><strong>Người nhận tiền</strong></div>
            <div>(Ký, ghi rõ họ tên)</div>
          </div>
          <div class="signature-col">
            <div><strong>Kế toán</strong></div>
            <div>(Ký, ghi rõ họ tên)</div>
          </div>
          <div class="signature-col">
            <div><strong>Thu ngân</strong></div>
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

  // Helper function to convert number to Vietnamese words
  const numberToWords = (num: number): string => {
    const units = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    const teens = ['mười', 'mười một', 'mười hai', 'mười ba', 'mười bốn', 'mười lăm', 'mười sáu', 'mười bảy', 'mười tám', 'mười chín'];

    if (num === 0) return 'không đồng';

    let words = '';

    if (num >= 1000000000) {
      words += units[Math.floor(num / 1000000000)] + ' tỷ ';
      num %= 1000000000;
    }
    if (num >= 1000000) {
      words += units[Math.floor(num / 1000000)] + ' triệu ';
      num %= 1000000;
    }
    if (num >= 1000) {
      const thousands = Math.floor(num / 1000);
      if (thousands < 10) {
        words += units[thousands] + ' nghìn ';
      } else if (thousands < 20) {
        words += teens[thousands - 10] + ' nghìn ';
      } else {
        words += units[Math.floor(thousands / 10)] + ' mươi ' + (thousands % 10 > 0 ? units[thousands % 10] : '') + ' nghìn ';
      }
      num %= 1000;
    }
    if (num >= 100) {
      words += units[Math.floor(num / 100)] + ' trăm ';
      num %= 100;
    }
    if (num >= 10) {
      if (num < 20) {
        words += teens[num - 10] + ' ';
      } else {
        words += units[Math.floor(num / 10)] + ' mươi ';
        if (num % 10 > 0) words += units[num % 10] + ' ';
      }
    } else if (num > 0) {
      words += units[num] + ' ';
    }

    return words.trim() + ' đồng';
  };

  // ============= FETCH DATA ON TAB CHANGE =============

  useEffect(() => {
    if (activeTab === 'deposits') {
      fetchDeposits();
    } else if (activeTab === 'refunds') {
      fetchRefunds();
    }
  }, [activeTab]);

  const [depositSearchText, setDepositSearchText] = useState('');

  const fetchDeposits = async (keyword?: string) => {
    try {
      setLoading(true);
      if (!keyword) {
        // Load deposits for selected patient if any, otherwise show empty
        if (selectedPatient) {
          const patientDeposits = await getPatientDeposits(selectedPatient.id);
          const mappedDeposits = ((patientDeposits as any).data || []).map((d: DepositDto) => ({
            id: d.id,
            patientId: d.patientId,
            patientName: d.patientName,
            patientCode: d.patientCode,
            amount: d.amount,
            remainingAmount: d.remainingAmount,
            depositDate: d.createdAt,
            cashier: d.cashierName,
            status: d.status,
            note: d.notes,
          }));
          setDeposits(mappedDeposits);
        } else {
          setDeposits([]);
        }
        return;
      }

      // Search for patient first, then get their deposits
      const response = await searchPatients({ keyword, pageSize: 10 });
      const patients = (response as any).data?.items || [];
      if (patients.length === 0) {
        message.warning('Không tìm thấy bệnh nhân');
        setDeposits([]);
        return;
      }

      const allDeposits: Deposit[] = [];
      for (const patient of patients) {
        try {
          const patientDeposits = await getPatientDeposits(patient.patientId);
          const mappedDeposits = ((patientDeposits as any).data || []).map((d: DepositDto) => ({
            id: d.id,
            patientId: d.patientId,
            patientName: d.patientName,
            patientCode: d.patientCode,
            amount: d.amount,
            remainingAmount: d.remainingAmount,
            depositDate: d.createdAt,
            cashier: d.cashierName,
            status: d.status,
            note: d.notes,
          }));
          allDeposits.push(...mappedDeposits);
        } catch {
          // Skip patients with no deposits
        }
      }

      setDeposits(allDeposits);
      if (allDeposits.length === 0) {
        message.info('Không tìm thấy tạm ứng cho bệnh nhân này');
      }
    } catch (error) {
      message.error('Không thể tải dữ liệu tạm ứng');
      console.warn('Error fetching deposits:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const response = await searchRefunds({ pageSize: 1000 });
      const mappedRefunds = ((response as any).data?.items || []).map((r: RefundDto) => ({
        id: r.id,
        patientId: r.patientId,
        patientName: r.patientName,
        patientCode: r.patientCode,
        amount: r.refundAmount,
        reason: r.reason,
        refundDate: r.createdAt,
        requestedBy: r.cashierName,
        approvedBy: r.approvedByName,
        status: r.status,
        paymentMethod: r.refundMethodName,
      }));
      setRefunds(mappedRefunds);
    } catch (error) {
      message.error('Không thể tải dữ liệu hoàn tiền');
      console.warn('Error fetching refunds:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============= UNPAID SERVICES TAB =============

  const handleSearchPatient = async (value: string) => {
    if (!value) {
      setSelectedPatient(null);
      setUnpaidServices([]);
      return;
    }

    try {
      setLoading(true);
      const response = await searchPatients({ keyword: value, pageSize: 10 });

      if (((response as any).data?.items || []).length === 0) {
        message.warning('Không tìm thấy bệnh nhân');
        setSelectedPatient(null);
        setUnpaidServices([]);
        return;
      }

      const patientData = ((response as any).data?.items || [])[0];

      // Map API patient data to local interface
      const patient: Patient = {
        id: patientData.patientId,
        code: patientData.patientCode,
        name: patientData.patientName,
        gender: 1, // Default, API doesn't provide this in billing status
        dateOfBirth: '', // API doesn't provide in billing status
        phoneNumber: '', // API doesn't provide in billing status
        insuranceNumber: '',
        patientType: 1, // Default
      };

      setSelectedPatient(patient);

      // Fetch unpaid services for the patient
      const unpaidServicesData = await getUnpaidServices(patientData.patientId);

      const mappedServices: UnpaidService[] = ((unpaidServicesData as any).data || []).map((s: UnpaidServiceItemDto) => ({
        id: s.id,
        serviceCode: s.serviceCode,
        serviceName: s.serviceName,
        quantity: s.quantity,
        unitPrice: s.unitPrice,
        totalPrice: s.amount,
        insuranceCoverage: s.insuranceRate,
        insuranceAmount: s.insuranceAmount,
        patientAmount: s.patientAmount,
        serviceDate: s.orderedAt,
        departmentName: s.executeDepartmentName || s.orderDepartmentName || '',
        doctorName: '',
        serviceType: s.serviceGroup,
      }));

      setUnpaidServices(mappedServices);
      message.success(`Tìm thấy bệnh nhân: ${patient.name}`);
    } catch (error) {
      message.error('Lỗi khi tìm kiếm bệnh nhân');
      console.warn('Error searching patient:', error);
      setSelectedPatient(null);
      setUnpaidServices([]);
    } finally {
      setLoading(false);
    }
  };

  const unpaidServicesColumns: ColumnsType<UnpaidService> = [
    {
      title: 'Mã DV',
      dataIndex: 'serviceCode',
      key: 'serviceCode',
      width: 80,
    },
    {
      title: 'Tên dịch vụ',
      dataIndex: 'serviceName',
      key: 'serviceName',
      width: 200,
    },
    {
      title: 'Loại',
      dataIndex: 'serviceType',
      key: 'serviceType',
      width: 120,
      render: (type) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: 'SL',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 50,
      align: 'center',
    },
    {
      title: 'Đơn giá',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 100,
      align: 'right',
      render: (value) => `${value.toLocaleString('vi-VN')} đ`,
    },
    {
      title: 'Thành tiền',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      width: 120,
      align: 'right',
      render: (value) => <strong>{value.toLocaleString('vi-VN')} đ</strong>,
    },
    {
      title: 'BHYT (%)',
      dataIndex: 'insuranceCoverage',
      key: 'insuranceCoverage',
      width: 80,
      align: 'center',
      render: (value) => (value > 0 ? `${value}%` : '-'),
    },
    {
      title: 'BHYT trả',
      dataIndex: 'insuranceAmount',
      key: 'insuranceAmount',
      width: 120,
      align: 'right',
      render: (value) => (value > 0 ? `${value.toLocaleString('vi-VN')} đ` : '-'),
    },
    {
      title: 'BN trả',
      dataIndex: 'patientAmount',
      key: 'patientAmount',
      width: 120,
      align: 'right',
      render: (value) => (
        <strong style={{ color: '#f5222d' }}>{value.toLocaleString('vi-VN')} đ</strong>
      ),
    },
    {
      title: 'Ngày',
      dataIndex: 'serviceDate',
      key: 'serviceDate',
      width: 100,
      render: (date) => dayjs(date).format('DD/MM/YYYY'),
    },
  ];

  const calculateTotals = () => {
    const selected = unpaidServices.filter((s) => selectedServices.includes(s.id));
    const totalAmount = selected.reduce((sum, s) => sum + s.totalPrice, 0);
    const insuranceAmount = selected.reduce((sum, s) => sum + s.insuranceAmount, 0);
    const patientAmount = selected.reduce((sum, s) => sum + s.patientAmount, 0);
    return { totalAmount, insuranceAmount, patientAmount };
  };

  const totals = calculateTotals();

  const UnpaidServicesTab = (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col flex="auto">
          <Search
            placeholder="Tìm bệnh nhân theo mã, tên, SĐT..."
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            onSearch={handleSearchPatient}
            style={{ maxWidth: 500 }}
          />
        </Col>
      </Row>

      {selectedPatient && (
        <>
          <Card size="small" style={{ marginBottom: 16 }}>
            <Descriptions column={4} size="small">
              <Descriptions.Item label="Mã BN">
                <strong>{selectedPatient.code}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Họ tên">
                <strong>{selectedPatient.name}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Giới tính">
                {selectedPatient.gender === 1 ? 'Nam' : 'Nữ'}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày sinh">
                {dayjs(selectedPatient.dateOfBirth).format('DD/MM/YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="SĐT">
                {selectedPatient.phoneNumber}
              </Descriptions.Item>
              <Descriptions.Item label="Số thẻ BHYT">
                {selectedPatient.insuranceNumber || 'Không có'}
              </Descriptions.Item>
              <Descriptions.Item label="Đối tượng">
                {selectedPatient.patientType === 1 ? (
                  <Tag color="green">BHYT</Tag>
                ) : (
                  <Tag color="blue">Viện phí</Tag>
                )}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Table
            columns={unpaidServicesColumns}
            dataSource={unpaidServices}
            rowKey="id"
            size="small"
            scroll={{ x: 1200 }}
            pagination={false}
            loading={loading}
            rowSelection={{
              selectedRowKeys: selectedServices,
              onChange: (keys) => setSelectedServices(keys as string[]),
            }}
            onRow={(record) => ({
              onDoubleClick: () => {
                setSelectedService(record);
                setServiceDetailVisible(true);
              },
              style: { cursor: 'pointer' },
            })}
            footer={() => (
              <Row gutter={16} style={{ padding: '8px 0' }}>
                <Col span={12}>
                  <Space orientation="vertical" style={{ width: '100%' }}>
                    <Row>
                      <Col span={12}>
                        <Text strong>Tổng cộng:</Text>
                      </Col>
                      <Col span={12} style={{ textAlign: 'right' }}>
                        <Text strong style={{ fontSize: 16 }}>
                          {totals.totalAmount.toLocaleString('vi-VN')} đ
                        </Text>
                      </Col>
                    </Row>
                    <Row>
                      <Col span={12}>
                        <Text>BHYT trả:</Text>
                      </Col>
                      <Col span={12} style={{ textAlign: 'right' }}>
                        <Text style={{ color: '#52c41a' }}>
                          {totals.insuranceAmount.toLocaleString('vi-VN')} đ
                        </Text>
                      </Col>
                    </Row>
                    <Row>
                      <Col span={12}>
                        <Text strong>Bệnh nhân trả:</Text>
                      </Col>
                      <Col span={12} style={{ textAlign: 'right' }}>
                        <Text strong style={{ fontSize: 16, color: '#f5222d' }}>
                          {totals.patientAmount.toLocaleString('vi-VN')} đ
                        </Text>
                      </Col>
                    </Row>
                  </Space>
                </Col>
                <Col span={12} style={{ textAlign: 'right' }}>
                  <Space>
                    <Button
                      type="primary"
                      size="large"
                      icon={<DollarOutlined />}
                      disabled={selectedServices.length === 0}
                      onClick={() => {
                        setPaymentModalVisible(true);
                        paymentForm.setFieldsValue({
                          paymentMethod: 'cash',
                          cashAmount: totals.patientAmount,
                        });
                      }}
                    >
                      Thanh toán ({selectedServices.length} dịch vụ)
                    </Button>
                  </Space>
                </Col>
              </Row>
            )}
          />
        </>
      )}
    </div>
  );

  // ============= PAYMENT TAB =============

  const handlePayment = async () => {
    try {
      const values = await paymentForm.validateFields();

      if (!selectedPatient) {
        message.error('Chưa chọn bệnh nhân');
        return;
      }

      // Build payment DTO - uses invoiceId instead of patientId
      const methodMap: Record<string, number> = { cash: 1, card: 2, transfer: 3, deposit: 1, mixed: 1 };
      const paymentDto: CreatePaymentDto = {
        invoiceId: selectedServices[0] || '', // Use first selected service as invoice reference
        paymentMethod: methodMap[values.paymentMethod] || 1,
        amount: totals.patientAmount,
        receivedAmount: values.cashAmount || totals.patientAmount,
        cardNumber: values.cardNumber,
        bankName: values.bankName,
        transactionNumber: values.transferCode,
        depositId: values.depositId,
        depositUsedAmount: values.depositId ? totals.patientAmount : undefined,
        notes: values.note,
      };

      await createPayment(paymentDto);
      message.success('Thanh toán thành công!');
      setPaymentModalVisible(false);
      setReceiptDrawerVisible(true);

      // Refresh unpaid services
      if (selectedPatient) {
        const unpaidServicesData = await getUnpaidServices(selectedPatient.id);
        const mappedServices = ((unpaidServicesData as any).data || []).map((s: UnpaidServiceItemDto) => ({
          id: s.id,
          serviceCode: s.serviceCode,
          serviceName: s.serviceName,
          quantity: s.quantity,
          unitPrice: s.unitPrice,
          totalPrice: s.amount,
          insuranceCoverage: s.insuranceRate,
          insuranceAmount: s.insuranceAmount,
          patientAmount: s.patientAmount,
          serviceDate: s.orderedAt,
          departmentName: s.executeDepartmentName || s.orderDepartmentName || '',
          doctorName: '',
          serviceType: s.serviceGroup,
        }));
        setUnpaidServices(mappedServices);
      }

      setSelectedServices([]);
      paymentForm.resetFields();
    } catch (error) {
      console.warn('Payment error:', error);
      message.error('Lỗi khi thanh toán. Vui lòng thử lại.');
    }
  };

  const PaymentModal = (
    <Modal
      title="Thanh toán dịch vụ"
      open={paymentModalVisible}
      onOk={handlePayment}
      onCancel={() => setPaymentModalVisible(false)}
      width={800}
      okText="Xác nhận thanh toán"
      cancelText="Hủy"
    >
      <Form form={paymentForm} layout="vertical">
        <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f0f5ff' }}>
          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title="Tổng tiền"
                value={totals.totalAmount}
                suffix="đ"
                styles={{ content: { fontSize: 18 } }}
                formatter={(value) => `${Number(value).toLocaleString('vi-VN')}`}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="BHYT trả"
                value={totals.insuranceAmount}
                suffix="đ"
                styles={{ content: { fontSize: 18, color: '#52c41a' } }}
                formatter={(value) => `${Number(value).toLocaleString('vi-VN')}`}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Bệnh nhân trả"
                value={totals.patientAmount}
                suffix="đ"
                styles={{ content: { fontSize: 18, color: '#f5222d' } }}
                formatter={(value) => `${Number(value).toLocaleString('vi-VN')}`}
              />
            </Col>
          </Row>
        </Card>

        <Divider>Phương thức thanh toán</Divider>

        <Form.Item name="paymentMethod" initialValue="cash">
          <Radio.Group>
            <Space orientation="vertical">
              <Radio value="cash">Tiền mặt</Radio>
              <Radio value="card">Thẻ ngân hàng</Radio>
              <Radio value="transfer">Chuyển khoản</Radio>
              <Radio value="deposit">Sử dụng tạm ứng</Radio>
              <Radio value="mixed">Kết hợp</Radio>
            </Space>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) =>
            prevValues.paymentMethod !== currentValues.paymentMethod
          }
        >
          {({ getFieldValue }) => {
            const method = getFieldValue('paymentMethod');
            if (method === 'cash') {
              return (
                <>
                  <Form.Item name="cashAmount" label="Tiền khách đưa">
                    <InputNumber
                      style={{ width: '100%' }}
                      formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, '')) as any}
                      min={0}
                      suffix="đ"
                      size="large"
                    />
                  </Form.Item>
                  <Form.Item label="Tiền thừa trả lại">
                    <InputNumber
                      style={{ width: '100%' }}
                      value={
                        (getFieldValue('cashAmount') || 0) - totals.patientAmount
                      }
                      formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      disabled
                      suffix="đ"
                      size="large"
                    />
                  </Form.Item>
                </>
              );
            }
            if (method === 'card') {
              return (
                <>
                  <Form.Item name="cardNumber" label="Số thẻ (4 số cuối)">
                    <Input placeholder="Nhập 4 số cuối thẻ" maxLength={4} />
                  </Form.Item>
                  <Form.Item name="bankName" label="Ngân hàng">
                    <Select placeholder="Chọn ngân hàng">
                      <Select.Option value="vietcombank">Vietcombank</Select.Option>
                      <Select.Option value="techcombank">Techcombank</Select.Option>
                      <Select.Option value="vcb">VCB</Select.Option>
                    </Select>
                  </Form.Item>
                </>
              );
            }
            if (method === 'transfer') {
              return (
                <Form.Item name="transferCode" label="Mã giao dịch">
                  <Input placeholder="Nhập mã giao dịch chuyển khoản" />
                </Form.Item>
              );
            }
            if (method === 'deposit') {
              return (
                <>
                  <Form.Item name="depositId" label="Chọn khoản tạm ứng">
                    <Select placeholder="Chọn khoản tạm ứng">
                      {deposits
                        .filter((d) => d.remainingAmount > 0)
                        .map((d) => (
                          <Select.Option key={d.id} value={d.id}>
                            {d.depositDate} - Còn lại:{' '}
                            {d.remainingAmount.toLocaleString('vi-VN')} đ
                          </Select.Option>
                        ))}
                    </Select>
                  </Form.Item>
                </>
              );
            }
            return null;
          }}
        </Form.Item>

        <Form.Item name="note" label="Ghi chú">
          <TextArea rows={2} placeholder="Nhập ghi chú (không bắt buộc)" />
        </Form.Item>
      </Form>
    </Modal>
  );

  // ============= RECEIPT DRAWER =============

  const ReceiptDrawer = (
    <Drawer
      title="Hóa đơn thanh toán"
      placement="right"
      onClose={() => setReceiptDrawerVisible(false)}
      open={receiptDrawerVisible}
      size={450}
      extra={
        <Space>
          <Button icon={<PrinterOutlined />} type="primary" onClick={executePrintReceipt}>
            In hóa đơn
          </Button>
        </Space>
      }
    >
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={4}>BỆNH VIỆN ĐA KHOA</Title>
        <Text>123 Đường ABC, Quận XYZ, TP.HCM</Text>
        <br />
        <Text>SĐT: 028 1234 5678</Text>
        <Divider />
        <Title level={3}>HÓA ĐƠN THANH TOÁN</Title>
        <Text>Số: HD-{dayjs().format('YYYYMMDD')}-001</Text>
        <br />
        <Text>{dayjs().format('DD/MM/YYYY HH:mm:ss')}</Text>
      </div>

      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="Mã bệnh nhân">
          {selectedPatient?.code}
        </Descriptions.Item>
        <Descriptions.Item label="Họ tên">{selectedPatient?.name}</Descriptions.Item>
        <Descriptions.Item label="Ngày sinh">
          {selectedPatient?.dateOfBirth
            ? dayjs(selectedPatient.dateOfBirth).format('DD/MM/YYYY')
            : ''}
        </Descriptions.Item>
      </Descriptions>

      <Divider>Chi tiết dịch vụ</Divider>

      <Table
        dataSource={unpaidServices.filter((s) => selectedServices.includes(s.id))}
        columns={[
          {
            title: 'Dịch vụ',
            dataIndex: 'serviceName',
            key: 'serviceName',
          },
          {
            title: 'SL',
            dataIndex: 'quantity',
            key: 'quantity',
            width: 40,
          },
          {
            title: 'Thành tiền',
            dataIndex: 'patientAmount',
            key: 'patientAmount',
            width: 100,
            render: (value) => `${value.toLocaleString('vi-VN')}`,
          },
        ]}
        pagination={false}
        size="small"
        rowKey="id"
      />

      <Divider />

      <Row style={{ marginBottom: 8 }}>
        <Col span={12}>
          <Text>Tổng cộng:</Text>
        </Col>
        <Col span={12} style={{ textAlign: 'right' }}>
          <Text>{totals.totalAmount.toLocaleString('vi-VN')} đ</Text>
        </Col>
      </Row>
      <Row style={{ marginBottom: 8 }}>
        <Col span={12}>
          <Text>BHYT trả:</Text>
        </Col>
        <Col span={12} style={{ textAlign: 'right' }}>
          <Text>{totals.insuranceAmount.toLocaleString('vi-VN')} đ</Text>
        </Col>
      </Row>
      <Row style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Text strong>Bệnh nhân trả:</Text>
        </Col>
        <Col span={12} style={{ textAlign: 'right' }}>
          <Text strong style={{ fontSize: 16 }}>
            {totals.patientAmount.toLocaleString('vi-VN')} đ
          </Text>
        </Col>
      </Row>

      <Divider />

      <div style={{ textAlign: 'center' }}>
        <Text type="secondary">Cảm ơn quý khách!</Text>
        <br />
        <Text type="secondary">Thu ngân: Admin</Text>
      </div>
    </Drawer>
  );

  // ============= DEPOSITS TAB =============

  const handleCreateDeposit = async () => {
    try {
      const values = await depositForm.validateFields();

      const depositDto: CreateDepositDto = {
        patientId: values.patientId || selectedPatient?.id || '',
        amount: values.amount,
        depositType: 1, // 1 = OPD deposit
        depositSource: 1, // 1 = Direct deposit
        paymentMethod: values.paymentMethod === 'cash' ? 1 : 3,
        notes: values.note,
      };

      await createDeposit(depositDto);
      message.success('Tạo tạm ứng thành công!');
      setDepositModalVisible(false);
      depositForm.resetFields();

      // Refresh deposits list
      await fetchDeposits();
    } catch (error) {
      console.warn('Create deposit error:', error);
      message.error('Lỗi khi tạo tạm ứng. Vui lòng thử lại.');
    }
  };

  const depositsColumns: ColumnsType<Deposit> = [
    {
      title: 'Mã BN',
      dataIndex: 'patientCode',
      key: 'patientCode',
      width: 120,
    },
    {
      title: 'Họ tên',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 150,
    },
    {
      title: 'Số tiền tạm ứng',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      align: 'right',
      render: (value) => `${value.toLocaleString('vi-VN')} đ`,
    },
    {
      title: 'Đã sử dụng',
      key: 'used',
      width: 130,
      align: 'right',
      render: (_, record) =>
        `${(record.amount - record.remainingAmount).toLocaleString('vi-VN')} đ`,
    },
    {
      title: 'Còn lại',
      dataIndex: 'remainingAmount',
      key: 'remainingAmount',
      width: 130,
      align: 'right',
      render: (value) => (
        <strong style={{ color: value > 0 ? '#52c41a' : '#999' }}>
          {value.toLocaleString('vi-VN')} đ
        </strong>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'depositDate',
      key: 'depositDate',
      width: 120,
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Thu ngân',
      dataIndex: 'cashier',
      key: 'cashier',
      width: 100,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        if (status === 1) return <Tag color="green">Còn dư</Tag>;
        if (status === 2) return <Tag color="default">Đã sử dụng</Tag>;
        return <Tag color="orange">Đã hoàn</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<PrinterOutlined />} onClick={() => executePrintDeposit(record)}>
            In
          </Button>
          {record.remainingAmount > 0 && (
            <Button size="small" type="link" danger icon={<RollbackOutlined />} onClick={() => {
              Modal.confirm({
                title: 'Hoàn tiền tạm ứng',
                content: `Hoàn lại ${record.remainingAmount.toLocaleString('vi-VN')} đ cho bệnh nhân ${record.patientName} (${record.patientCode})?`,
                okText: 'Xác nhận hoàn',
                cancelText: 'Hủy',
                onOk: async () => {
                  try {
                    const refundDto: CreateRefundDto = {
                      patientId: record.patientId,
                      refundAmount: record.remainingAmount,
                      refundType: 2, // deposit refund
                      reason: 'Hoàn tiền tạm ứng còn lại',
                      refundMethod: 1, // cash
                    };
                    await createRefund(refundDto);
                    message.success('Đã tạo yêu cầu hoàn tiền tạm ứng');
                    await fetchDeposits();
                  } catch (error) {
                    console.warn('Refund deposit error:', error);
                    message.error('Lỗi khi hoàn tiền tạm ứng');
                  }
                },
              });
            }}>
              Hoàn
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const DepositsTab = (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col flex="auto">
          <Space>
            <Search
              placeholder="Tìm tạm ứng theo mã BN, tên BN..."
              allowClear
              enterButton={<SearchOutlined />}
              style={{ width: 400 }}
              value={depositSearchText}
              onChange={(e) => setDepositSearchText(e.target.value)}
              onSearch={(value) => {
                setDepositSearchText(value);
                fetchDeposits(value || undefined);
              }}
            />
            <Statistic
              title="Tổng tạm ứng"
              value={deposits.reduce((sum, d) => sum + d.amount, 0)}
              suffix="đ"
              formatter={(value) => `${Number(value).toLocaleString('vi-VN')}`}
            />
            <Statistic
              title="Còn lại"
              value={deposits.reduce((sum, d) => sum + d.remainingAmount, 0)}
              suffix="đ"
              styles={{ content: { color: '#52c41a' } }}
              formatter={(value) => `${Number(value).toLocaleString('vi-VN')}`}
            />
          </Space>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<WalletOutlined />}
            onClick={() => setDepositModalVisible(true)}
          >
            Tạo tạm ứng mới
          </Button>
        </Col>
      </Row>

      <Table
        columns={depositsColumns}
        dataSource={deposits}
        rowKey="id"
        size="small"
        scroll={{ x: 1200 }}
        loading={loading}
        pagination={{
          showSizeChanger: true,
          showTotal: (total) => `Tổng: ${total} bản ghi`,
        }}
        onRow={(record) => ({
          onDoubleClick: () => {
            setSelectedDeposit(record);
            setDepositDetailVisible(true);
          },
          style: { cursor: 'pointer' },
        })}
      />
    </div>
  );

  const DepositModal = (
    <Modal
      title="Tạo tạm ứng"
      open={depositModalVisible}
      onOk={handleCreateDeposit}
      onCancel={() => setDepositModalVisible(false)}
      width={600}
      okText="Tạo tạm ứng"
      cancelText="Hủy"
    >
      <Form form={depositForm} layout="vertical">
        <Form.Item
          name="patientSearch"
          label="Tìm bệnh nhân"
          rules={[{ required: true, message: 'Vui lòng chọn bệnh nhân' }]}
        >
          <Search
            placeholder="Tìm theo mã BN, tên, SĐT..."
            allowClear
            enterButton={<SearchOutlined />}
            onSearch={async (value) => {
              if (!value) return;
              try {
                const response = await searchPatients({ keyword: value, pageSize: 1 });
                const items = (response as any).data?.items || [];
                if (items.length > 0) {
                  const p = items[0];
                  depositForm.setFieldsValue({
                    patientSearch: `${p.patientCode} - ${p.patientName}`,
                    patientId: p.patientId,
                  });
                  message.success(`Đã chọn: ${p.patientName}`);
                } else {
                  message.warning('Không tìm thấy bệnh nhân');
                }
              } catch (error) {
                message.error('Lỗi khi tìm kiếm bệnh nhân');
              }
            }}
          />
        </Form.Item>

        <Form.Item name="patientId" hidden>
          <Input />
        </Form.Item>

        <Form.Item
          name="amount"
          label="Số tiền tạm ứng"
          rules={[{ required: true, message: 'Vui lòng nhập số tiền' }]}
        >
          <InputNumber
            style={{ width: '100%' }}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, '')) as any}
            min={0}
            suffix="đ"
            size="large"
          />
        </Form.Item>

        <Form.Item name="paymentMethod" label="Phương thức" initialValue="cash">
          <Radio.Group>
            <Radio value="cash">Tiền mặt</Radio>
            <Radio value="transfer">Chuyển khoản</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item name="note" label="Ghi chú">
          <TextArea rows={3} placeholder="Nhập ghi chú" />
        </Form.Item>
      </Form>
    </Modal>
  );

  // ============= REFUNDS TAB =============

  const handleCreateRefund = async () => {
    try {
      const values = await refundForm.validateFields();

      const refundDto: CreateRefundDto = {
        patientId: values.patientId,
        refundAmount: values.amount,
        refundType: values.refundType === 'service' ? 1 : values.refundType === 'deposit' ? 2 : values.refundType === 'overpayment' ? 3 : 4,
        reason: values.reason,
        refundMethod: values.paymentMethod === 'cash' ? 1 : 3,
      };

      await createRefund(refundDto);
      message.success('Tạo yêu cầu hoàn tiền thành công!');
      setRefundModalVisible(false);
      refundForm.resetFields();

      // Refresh refunds list
      await fetchRefunds();
    } catch (error) {
      console.warn('Create refund error:', error);
      message.error('Lỗi khi tạo yêu cầu hoàn tiền. Vui lòng thử lại.');
    }
  };

  const refundsColumns: ColumnsType<RefundRecord> = [
    {
      title: 'Mã BN',
      dataIndex: 'patientCode',
      key: 'patientCode',
      width: 120,
    },
    {
      title: 'Họ tên',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 150,
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
      render: (value) => <strong>{value.toLocaleString('vi-VN')} đ</strong>,
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      key: 'reason',
      width: 200,
    },
    {
      title: 'Ngày hoàn',
      dataIndex: 'refundDate',
      key: 'refundDate',
      width: 120,
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Người yêu cầu',
      dataIndex: 'requestedBy',
      key: 'requestedBy',
      width: 100,
    },
    {
      title: 'Người duyệt',
      dataIndex: 'approvedBy',
      key: 'approvedBy',
      width: 100,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        if (status === 0) return <Tag color="orange">Chờ duyệt</Tag>;
        if (status === 1) return <Tag color="red">Từ chối</Tag>;
        if (status === 2) return <Tag color="green">Đã duyệt</Tag>;
        return <Tag color="blue">Đã hoàn</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          {record.status === 0 && (
            <>
              <Button
                size="small"
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={async () => {
                  try {
                    const approveDto: ApproveRefundDto = {
                      refundId: record.id,
                      isApproved: true,
                    };
                    await approveRefund(approveDto);
                    message.success('Đã duyệt yêu cầu hoàn tiền');
                    await fetchRefunds();
                  } catch (error) {
                    console.warn('Approve refund error:', error);
                    message.error('Lỗi khi duyệt yêu cầu hoàn tiền');
                  }
                }}
              >
                Duyệt
              </Button>
              <Button
                size="small"
                danger
                icon={<CloseCircleOutlined />}
                onClick={async () => {
                  try {
                    await cancelRefund(record.id, 'Từ chối bởi người duyệt');
                    message.warning('Đã từ chối yêu cầu');
                    await fetchRefunds();
                  } catch (error) {
                    console.warn('Cancel refund error:', error);
                    message.error('Lỗi khi từ chối yêu cầu hoàn tiền');
                  }
                }}
              >
                Từ chối
              </Button>
            </>
          )}
          {record.status === 2 && (
            <Button size="small" icon={<PrinterOutlined />} onClick={() => executePrintRefund(record)}>
              In
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const filteredRefunds = refunds.filter(r => {
    // Text search filter
    if (refundSearchText) {
      const text = refundSearchText.toLowerCase();
      const matchesText =
        r.patientCode?.toLowerCase().includes(text) ||
        r.patientName?.toLowerCase().includes(text) ||
        r.reason?.toLowerCase().includes(text) ||
        r.requestedBy?.toLowerCase().includes(text);
      if (!matchesText) return false;
    }
    // Date range filter
    if (refundDateRange) {
      const [from, to] = refundDateRange;
      const refundDate = dayjs(r.refundDate);
      if (refundDate.isBefore(from.startOf('day')) || refundDate.isAfter(to.endOf('day'))) {
        return false;
      }
    }
    return true;
  });

  const RefundsTab = (
    <div>
      <Row style={{ marginBottom: 16 }}>
        <Col flex="auto">
          <Space>
            <Search
              placeholder="Tìm theo mã BN, tên..."
              allowClear
              enterButton={<SearchOutlined />}
              style={{ width: 300 }}
              value={refundSearchText}
              onSearch={(value) => setRefundSearchText(value)}
              onChange={(e) => setRefundSearchText(e.target.value)}
            />
            <RangePicker
              format="DD/MM/YYYY"
              value={refundDateRange}
              onChange={(dates) => {
                setRefundDateRange(dates ? [dates[0]!, dates[1]!] as [Dayjs, Dayjs] : null);
              }}
            />
          </Space>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<RollbackOutlined />}
            onClick={() => setRefundModalVisible(true)}
          >
            Tạo yêu cầu hoàn tiền
          </Button>
        </Col>
      </Row>

      <Table
        columns={refundsColumns}
        dataSource={filteredRefunds}
        rowKey="id"
        size="small"
        scroll={{ x: 1400 }}
        loading={loading}
        pagination={{
          showSizeChanger: true,
          showTotal: (total) => `Tổng: ${total} bản ghi`,
        }}
        onRow={(record) => ({
          onDoubleClick: () => {
            setSelectedRefund(record);
            setRefundDetailVisible(true);
          },
          style: { cursor: 'pointer' },
        })}
      />
    </div>
  );

  const RefundModal = (
    <Modal
      title="Tạo yêu cầu hoàn tiền"
      open={refundModalVisible}
      onOk={handleCreateRefund}
      onCancel={() => setRefundModalVisible(false)}
      width={600}
      okText="Tạo yêu cầu"
      cancelText="Hủy"
    >
      <Form form={refundForm} layout="vertical">
        <Form.Item
          name="patientSearch"
          label="Tìm bệnh nhân"
          rules={[{ required: true, message: 'Vui lòng chọn bệnh nhân' }]}
        >
          <Search
            placeholder="Tìm theo mã BN, tên, SĐT..."
            allowClear
            enterButton={<SearchOutlined />}
            onSearch={async (value) => {
              if (!value) return;
              try {
                const response = await searchPatients({ keyword: value, pageSize: 1 });
                const items = (response as any).data?.items || [];
                if (items.length > 0) {
                  const p = items[0];
                  refundForm.setFieldsValue({
                    patientSearch: `${p.patientCode} - ${p.patientName}`,
                    patientId: p.patientId,
                  });
                  message.success(`Đã chọn: ${p.patientName}`);
                } else {
                  message.warning('Không tìm thấy bệnh nhân');
                }
              } catch (error) {
                message.error('Lỗi khi tìm kiếm bệnh nhân');
              }
            }}
          />
        </Form.Item>

        <Form.Item name="patientId" hidden>
          <Input />
        </Form.Item>

        <Form.Item
          name="refundType"
          label="Loại hoàn tiền"
          rules={[{ required: true }]}
        >
          <Select placeholder="Chọn loại hoàn tiền">
            <Select.Option value="service">Hủy dịch vụ</Select.Option>
            <Select.Option value="deposit">Hoàn tạm ứng</Select.Option>
            <Select.Option value="overpayment">Thanh toán thừa</Select.Option>
            <Select.Option value="other">Khác</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="amount"
          label="Số tiền hoàn"
          rules={[{ required: true, message: 'Vui lòng nhập số tiền' }]}
        >
          <InputNumber
            style={{ width: '100%' }}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, '')) as any}
            min={0}
            suffix="đ"
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="reason"
          label="Lý do hoàn tiền"
          rules={[{ required: true, message: 'Vui lòng nhập lý do' }]}
        >
          <TextArea rows={3} placeholder="Nhập lý do hoàn tiền" />
        </Form.Item>

        <Form.Item name="paymentMethod" label="Phương thức hoàn" initialValue="cash">
          <Radio.Group>
            <Radio value="cash">Tiền mặt</Radio>
            <Radio value="transfer">Chuyển khoản</Radio>
          </Radio.Group>
        </Form.Item>
      </Form>
    </Modal>
  );

  // ============= REPORTS TAB =============

  const [reportDateRange, setReportDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('day'),
    dayjs().endOf('day'),
  ]);

  const handleViewReport = async () => {
    try {
      setLoadingReport(true);
      const requestDto: RevenueReportRequestDto = {
        fromDate: reportDateRange[0].format('YYYY-MM-DD'),
        toDate: reportDateRange[1].format('YYYY-MM-DD'),
      };
      const [revenueResponse, debtResponse] = await Promise.all([
        getOutpatientRevenueReport(requestDto),
        getDebtStatistics().catch(() => null),
      ]);
      const data = (revenueResponse as any).data;
      if (data) {
        setReportData(data);
        message.success('Đã tải báo cáo doanh thu');
      } else {
        message.warning('Không có dữ liệu báo cáo cho khoảng thời gian này');
      }
      if (debtResponse) {
        setDebtData((debtResponse as any).data || null);
      }
    } catch (error) {
      console.warn('View report error:', error);
      message.error('Không thể tải báo cáo. Vui lòng thử lại.');
    } finally {
      setLoadingReport(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setLoadingReport(true);
      const requestDto: RevenueReportRequestDto = {
        fromDate: reportDateRange[0].format('YYYY-MM-DD'),
        toDate: reportDateRange[1].format('YYYY-MM-DD'),
      };
      const response = await getOutpatientRevenueReport(requestDto);
      const data = (response as any).data as OutpatientRevenueReportDto | undefined;
      if (!data) {
        message.warning('Không có dữ liệu để xuất');
        return;
      }

      // Build CSV content
      const headers = ['Ngày', 'Số BN', 'Số hóa đơn', 'Tổng thu', 'BHYT', 'Viện phí'];
      const rows = (data.dailyDetails || []).map(d => [
        d.date,
        d.patientCount,
        d.invoiceCount,
        d.totalAmount,
        d.insuranceAmount,
        d.patientAmount,
      ]);
      const csvContent = [
        `Báo cáo doanh thu từ ${reportDateRange[0].format('DD/MM/YYYY')} đến ${reportDateRange[1].format('DD/MM/YYYY')}`,
        '',
        headers.join(','),
        ...rows.map(r => r.join(',')),
        '',
        `Tổng doanh thu,,,${data.totalRevenue},${data.insuranceRevenue},${data.patientRevenue}`,
      ].join('\n');

      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bao-cao-doanh-thu-${reportDateRange[0].format('YYYYMMDD')}-${reportDateRange[1].format('YYYYMMDD')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success('Đã xuất file Excel (CSV) thành công');
    } catch (error) {
      console.warn('Export excel error:', error);
      message.error('Không thể xuất báo cáo. Vui lòng thử lại.');
    } finally {
      setLoadingReport(false);
    }
  };

  const ReportsTab = (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col>
          <RangePicker
            value={reportDateRange}
            onChange={(dates) => dates && setReportDateRange(dates as [Dayjs, Dayjs])}
            format="DD/MM/YYYY"
          />
        </Col>
        <Col>
          <Button type="primary" icon={<BarChartOutlined />} onClick={handleViewReport} loading={loadingReport}>
            Xem báo cáo
          </Button>
        </Col>
        <Col>
          <Button icon={<FileTextOutlined />} onClick={handleExportExcel} loading={loadingReport}>Xuất Excel</Button>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng doanh thu"
              value={reportData?.totalRevenue ?? 0}
              suffix="đ"
              prefix={<DollarOutlined style={{ color: '#1890ff' }} />}
              styles={{ content: { color: '#1890ff' } }}
              formatter={(value) => `${Number(value).toLocaleString('vi-VN')}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Viện phí"
              value={reportData?.patientRevenue ?? 0}
              suffix="đ"
              styles={{ content: { color: '#52c41a' } }}
              formatter={(value) => `${Number(value).toLocaleString('vi-VN')}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Số hóa đơn"
              value={reportData?.totalInvoices ?? 0}
              styles={{ content: { color: '#faad14' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="BHYT"
              value={reportData?.insuranceRevenue ?? 0}
              suffix="đ"
              styles={{ content: { color: '#eb2f96' } }}
              formatter={(value) => `${Number(value).toLocaleString('vi-VN')}`}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="Doanh thu theo loại dịch vụ" size="small">
            <Table
              dataSource={(reportData?.serviceDetails || []).map((s, idx) => ({
                key: s.serviceId || `svc-${idx}`,
                serviceType: s.serviceGroup || s.serviceName,
                revenue: s.totalAmount,
                count: s.quantity,
              }))}
              columns={[
                {
                  title: 'Loại dịch vụ',
                  dataIndex: 'serviceType',
                  key: 'serviceType',
                },
                {
                  title: 'Lượt',
                  dataIndex: 'count',
                  key: 'count',
                  align: 'center' as const,
                },
                {
                  title: 'Doanh thu',
                  dataIndex: 'revenue',
                  key: 'revenue',
                  align: 'right' as const,
                  render: (value: number) => `${(value || 0).toLocaleString('vi-VN')} đ`,
                },
              ]}
              pagination={false}
              size="small"
              locale={{ emptyText: 'Nhấn "Xem báo cáo" để tải dữ liệu' }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Công nợ chưa thu" size="small">
            <Table
              dataSource={(debtData?.topDebtors || []).map((d, idx) => ({
                key: d.patientId || `debt-${idx}`,
                patientCode: d.patientCode,
                patientName: d.patientName,
                amount: d.debtAmount,
                days: d.daysOverdue,
              }))}
              columns={[
                {
                  title: 'Mã BN',
                  dataIndex: 'patientCode',
                  key: 'patientCode',
                  width: 100,
                },
                {
                  title: 'Họ tên',
                  dataIndex: 'patientName',
                  key: 'patientName',
                },
                {
                  title: 'Số ngày',
                  dataIndex: 'days',
                  key: 'days',
                  align: 'center' as const,
                  width: 80,
                },
                {
                  title: 'Công nợ',
                  dataIndex: 'amount',
                  key: 'amount',
                  align: 'right' as const,
                  width: 120,
                  render: (value: number) => (
                    <Text strong style={{ color: '#f5222d' }}>
                      {(value || 0).toLocaleString('vi-VN')} đ
                    </Text>
                  ),
                },
              ]}
              pagination={false}
              size="small"
              locale={{ emptyText: 'Nhấn "Xem báo cáo" để tải dữ liệu' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );

  // ============= MAIN RENDER =============

  return (
    <div>
      <Title level={4}>Quản lý viện phí</Title>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'unpaid',
              label: (
                <span>
                  <FileTextOutlined />
                  Dịch vụ chưa thanh toán
                </span>
              ),
              children: UnpaidServicesTab,
            },
            {
              key: 'deposits',
              label: (
                <span>
                  <WalletOutlined />
                  Tạm ứng
                </span>
              ),
              children: DepositsTab,
            },
            {
              key: 'refunds',
              label: (
                <span>
                  <RollbackOutlined />
                  Hoàn tiền
                </span>
              ),
              children: RefundsTab,
            },
            {
              key: 'reports',
              label: (
                <span>
                  <BarChartOutlined />
                  Báo cáo
                </span>
              ),
              children: ReportsTab,
            },
          ]}
        />
      </Card>

      {PaymentModal}
      {DepositModal}
      {RefundModal}
      {ReceiptDrawer}

      {/* Service Detail Modal */}
      <Modal
        title="Chi tiết dịch vụ"
        open={serviceDetailVisible}
        onCancel={() => setServiceDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setServiceDetailVisible(false)}>Đóng</Button>,
        ]}
        width={600}
      >
        {selectedService && (
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Mã dịch vụ">{selectedService.serviceCode}</Descriptions.Item>
            <Descriptions.Item label="Tên dịch vụ">{selectedService.serviceName}</Descriptions.Item>
            <Descriptions.Item label="Loại dịch vụ">{selectedService.serviceType}</Descriptions.Item>
            <Descriptions.Item label="Số lượng">{selectedService.quantity}</Descriptions.Item>
            <Descriptions.Item label="Đơn giá">{selectedService.unitPrice.toLocaleString('vi-VN')} đ</Descriptions.Item>
            <Descriptions.Item label="Thành tiền">{selectedService.totalPrice.toLocaleString('vi-VN')} đ</Descriptions.Item>
            <Descriptions.Item label="BHYT chi trả">{selectedService.insuranceAmount.toLocaleString('vi-VN')} đ</Descriptions.Item>
            <Descriptions.Item label="BN chi trả">{selectedService.patientAmount.toLocaleString('vi-VN')} đ</Descriptions.Item>
            <Descriptions.Item label="Tỷ lệ BHYT">{selectedService.insuranceCoverage}%</Descriptions.Item>
            <Descriptions.Item label="Ngày thực hiện">
              {dayjs(selectedService.serviceDate).format('DD/MM/YYYY')}
            </Descriptions.Item>
            <Descriptions.Item label="Khoa/Phòng">{selectedService.departmentName}</Descriptions.Item>
            <Descriptions.Item label="Bác sĩ">{selectedService.doctorName}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Deposit Detail Modal */}
      <Modal
        title="Chi tiết tạm ứng"
        open={depositDetailVisible}
        onCancel={() => setDepositDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDepositDetailVisible(false)}>Đóng</Button>,
        ]}
        width={600}
      >
        {selectedDeposit && (
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Mã BN">{selectedDeposit.patientCode}</Descriptions.Item>
            <Descriptions.Item label="Họ tên">{selectedDeposit.patientName}</Descriptions.Item>
            <Descriptions.Item label="Số tiền">{selectedDeposit.amount.toLocaleString('vi-VN')} đ</Descriptions.Item>
            <Descriptions.Item label="Còn lại">{selectedDeposit.remainingAmount.toLocaleString('vi-VN')} đ</Descriptions.Item>
            <Descriptions.Item label="Ngày tạm ứng">
              {dayjs(selectedDeposit.depositDate).format('DD/MM/YYYY HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="Thu ngân">{selectedDeposit.cashier}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={selectedDeposit.status === 1 ? 'green' : 'orange'}>
                {selectedDeposit.status === 1 ? 'Đã sử dụng' : 'Còn hiệu lực'}
              </Tag>
            </Descriptions.Item>
            {selectedDeposit.note && (
              <Descriptions.Item label="Ghi chú" span={2}>{selectedDeposit.note}</Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* Refund Detail Modal */}
      <Modal
        title="Chi tiết hoàn tiền"
        open={refundDetailVisible}
        onCancel={() => setRefundDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setRefundDetailVisible(false)}>Đóng</Button>,
        ]}
        width={600}
      >
        {selectedRefund && (
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Mã BN">{selectedRefund.patientCode}</Descriptions.Item>
            <Descriptions.Item label="Họ tên">{selectedRefund.patientName}</Descriptions.Item>
            <Descriptions.Item label="Số tiền hoàn">{selectedRefund.amount.toLocaleString('vi-VN')} đ</Descriptions.Item>
            <Descriptions.Item label="Phương thức">{selectedRefund.paymentMethod}</Descriptions.Item>
            <Descriptions.Item label="Lý do" span={2}>{selectedRefund.reason}</Descriptions.Item>
            <Descriptions.Item label="Ngày yêu cầu">
              {dayjs(selectedRefund.refundDate).format('DD/MM/YYYY HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="Người yêu cầu">{selectedRefund.requestedBy}</Descriptions.Item>
            <Descriptions.Item label="Người duyệt">{selectedRefund.approvedBy || '-'}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={selectedRefund.status === 2 ? 'green' : selectedRefund.status === 1 ? 'blue' : selectedRefund.status === 3 ? 'red' : 'orange'}>
                {selectedRefund.status === 2 ? 'Đã duyệt' : selectedRefund.status === 1 ? 'Đang xử lý' : selectedRefund.status === 3 ? 'Từ chối' : 'Chờ duyệt'}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default Billing;
