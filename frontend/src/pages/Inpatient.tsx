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
  Badge,
  Divider,
  Spin,
  Descriptions,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  SwapOutlined,
  ExportOutlined,
  ReloadOutlined,
  PrinterOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  getInpatientList,
  getBedStatus,
  admitFromOpd,
  createTreatmentSheet,
  createNursingCareSheet,
  dischargePatient,
  type InpatientListDto,
  type BedStatusDto,
  type InpatientSearchDto,
  type AdmitFromOpdDto,
  type CreateTreatmentSheetDto,
  type CreateNursingCareSheetDto,
  type CompleteDischargeDto,
} from '../api/inpatient';

const { Title, Text } = Typography;
const { Search } = Input;
const { TextArea } = Input;

// Danh sách tất cả loại bệnh án nội trú theo Bộ Y tế
const MEDICAL_RECORD_TYPES = [
  { value: 'noi_khoa', label: 'Bệnh án Nội khoa', code: '01/BV-01' },
  { value: 'nhi_khoa', label: 'Bệnh án Nhi khoa', code: '02/BV-01' },
  { value: 'truyen_nhiem', label: 'Bệnh án Truyền nhiễm', code: '03/BV-01' },
  { value: 'phu_khoa', label: 'Bệnh án Phụ khoa', code: '04/BV-01' },
  { value: 'san_khoa', label: 'Bệnh án Sản khoa', code: '05/BV-01' },
  { value: 'so_sinh', label: 'Bệnh án Sơ sinh', code: '06/BV-01' },
  { value: 'tam_than', label: 'Bệnh án Tâm thần', code: '07/BV-01' },
  { value: 'da_lieu', label: 'Bệnh án Da liễu', code: '08/BV-01' },
  { value: 'huyet_hoc', label: 'Bệnh án Huyết học - Truyền máu', code: '09/BV-01' },
  { value: 'ngoai_khoa', label: 'Bệnh án Ngoại khoa', code: '10/BV-01' },
  { value: 'bong', label: 'Bệnh án Bỏng', code: '11/BV-01' },
  { value: 'ung_buou', label: 'Bệnh án Ung bướu', code: '12/BV-01' },
  { value: 'rhm', label: 'Bệnh án Răng hàm mặt', code: '13/BV-01' },
  { value: 'tmh', label: 'Bệnh án Tai mũi họng', code: '14/BV-01' },
  { value: 'yhct', label: 'Bệnh án YHCT nội trú', code: '18/BV-01' },
  { value: 'yhct_nhi', label: 'Bệnh án YHCT Nhi nội trú', code: '20/BV-01' },
  { value: 'mat_chan_thuong', label: 'Bệnh án Mắt chấn thương', code: '21/BV-01' },
  { value: 'mat_ban_phan_truoc', label: 'Bệnh án Mắt bán phần trước', code: '22/BV-01' },
  { value: 'mat_day_mat', label: 'Bệnh án Mắt đáy mắt', code: '23/BV-01' },
  { value: 'mat_glocom', label: 'Bệnh án Mắt Glocom', code: '24/BV-01' },
  { value: 'mat_sup_mi', label: 'Bệnh án Mắt sụp mi, lác', code: '25/BV-01' },
  { value: 'mat_tre_em', label: 'Bệnh án Mắt trẻ em', code: '26/BV-01' },
  { value: 'phcn', label: 'Bệnh án Phục hồi chức năng', code: '27/BV-01' },
  { value: 'phcn_nhi', label: 'Bệnh án PHCN Nhi', code: '28/BV-01' },
];

const Inpatient: React.FC = () => {
  const [admissions, setAdmissions] = useState<InpatientListDto[]>([]);
  const [beds, setBeds] = useState<BedStatusDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingBeds, setLoadingBeds] = useState(false);
  const [searchParams, setSearchParams] = useState<InpatientSearchDto>({
    page: 1,
    pageSize: 20,
  });
  const [total, setTotal] = useState(0);

  const [isAdmitModalOpen, setIsAdmitModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [isCareModalOpen, setIsCareModalOpen] = useState(false);
  const [isDischargeModalOpen, setIsDischargeModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isTreatmentTrackingModalOpen, setIsTreatmentTrackingModalOpen] = useState(false);
  const [printType, setPrintType] = useState<string>('noi_khoa');
  const [selectedAdmission, setSelectedAdmission] = useState<InpatientListDto | null>(null);
  const [form] = Form.useForm();
  const [medicalRecordForm] = Form.useForm();
  const [treatmentTrackingForm] = Form.useForm();

  // Load data on mount
  useEffect(() => {
    loadAdmissions();
    loadBeds();
  }, []);

  // Reload when search params change
  useEffect(() => {
    loadAdmissions();
  }, [searchParams]);

  const loadAdmissions = async () => {
    try {
      setLoading(true);
      const response = await getInpatientList(searchParams);
      // axios returns data in response.data
      const data = response.data;
      if (data) {
        setAdmissions(data.items || []);
        setTotal(data.totalCount || 0);
      } else {
        setAdmissions([]);
      }
    } catch (error) {
      console.error('Load admissions error:', error);
      message.error('Không thể tải danh sách bệnh nhân nội trú');
      setAdmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadBeds = async () => {
    try {
      setLoadingBeds(true);
      const response = await getBedStatus();
      // axios returns data in response.data
      const data = response.data;
      if (data) {
        setBeds(Array.isArray(data) ? data : []);
      } else {
        setBeds([]);
      }
    } catch (error) {
      console.error('Load beds error:', error);
      message.error('Không thể tải danh sách giường');
      setBeds([]);
    } finally {
      setLoadingBeds(false);
    }
  };

  const handleSearch = (keyword: string) => {
    setSearchParams(prev => ({ ...prev, keyword, page: 1 }));
  };

  // Status tags
  const getStatusTag = (status: number, statusName?: string) => {
    const colorMap: Record<number, string> = {
      0: 'blue',     // Đang điều trị
      1: 'orange',   // Chuyển khoa
      2: 'green',    // Xuất viện
      3: 'red',      // Tử vong
      4: 'default',  // Bỏ về
    };
    const defaultNames: Record<number, string> = {
      0: 'Đang điều trị',
      1: 'Chuyển khoa',
      2: 'Xuất viện',
      3: 'Tử vong',
      4: 'Bỏ về',
    };
    return <Tag color={colorMap[status] || 'default'}>{statusName || defaultNames[status] || 'Không xác định'}</Tag>;
  };

  const getBedStatusBadge = (status: number, statusName?: string) => {
    const statusMap: Record<number, { status: 'success' | 'processing' | 'warning' | 'default'; text: string }> = {
      0: { status: 'success', text: statusName || 'Trống' },
      1: { status: 'processing', text: statusName || 'Đang sử dụng' },
      2: { status: 'warning', text: statusName || 'Bảo trì' },
    };
    const s = statusMap[status] || { status: 'default' as const, text: statusName || 'Không xác định' };
    return <Badge status={s.status} text={s.text} />;
  };

  // Admission columns - matches InpatientListDto
  const admissionColumns: ColumnsType<InpatientListDto> = [
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
      title: 'Giới tính',
      dataIndex: 'gender',
      key: 'gender',
      width: 80,
      render: (gender) => (gender === 1 ? 'Nam' : 'Nữ'),
    },
    {
      title: 'Tuổi',
      dataIndex: 'age',
      key: 'age',
      width: 60,
      render: (age) => age || 'N/A',
    },
    {
      title: 'Mã HS',
      dataIndex: 'medicalRecordCode',
      key: 'medicalRecordCode',
      width: 120,
    },
    {
      title: 'Ngày nhập viện',
      dataIndex: 'admissionDate',
      key: 'admissionDate',
      width: 140,
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '',
    },
    {
      title: 'BHYT',
      dataIndex: 'isInsurance',
      key: 'isInsurance',
      width: 80,
      render: (isInsurance) => isInsurance ? <Tag color="green">Có</Tag> : <Tag>Không</Tag>,
    },
    {
      title: 'Khoa',
      dataIndex: 'departmentName',
      key: 'departmentName',
      width: 120,
    },
    {
      title: 'Phòng/Giường',
      key: 'roomBed',
      width: 150,
      render: (_, record) => (
        <div>
          <div>{record.roomName}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.bedName || 'Chưa phân giường'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Số ngày',
      dataIndex: 'daysOfStay',
      key: 'daysOfStay',
      width: 80,
      align: 'center',
      render: (days) => <strong>{days}</strong>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'statusName',
      key: 'statusName',
      width: 120,
      render: (statusName, record) => getStatusTag(record.status, statusName),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedAdmission(record);
              setIsDetailModalOpen(true);
            }}
          >
            Chi tiết
          </Button>
        </Space>
      ),
    },
  ];

  // Bed columns - matches BedStatusDto
  const bedColumns: ColumnsType<BedStatusDto> = [
    {
      title: 'Mã giường',
      dataIndex: 'bedCode',
      key: 'bedCode',
      width: 100,
    },
    {
      title: 'Tên giường',
      dataIndex: 'bedName',
      key: 'bedName',
      width: 120,
    },
    {
      title: 'Phòng',
      dataIndex: 'roomName',
      key: 'roomName',
      width: 150,
    },
    {
      title: 'Khoa',
      dataIndex: 'departmentName',
      key: 'departmentName',
      width: 120,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'bedStatus',
      key: 'bedStatus',
      width: 120,
      render: (status, record) => getBedStatusBadge(status, record.bedStatusName),
    },
    {
      title: 'Bệnh nhân',
      key: 'patient',
      width: 200,
      render: (_, record) =>
        record.bedStatus === 1 && record.patientName ? (
          <div>
            <div>
              <strong>{record.patientName}</strong>
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.patientCode}
            </Text>
          </div>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Ngày nhập viện',
      dataIndex: 'admissionDate',
      key: 'admissionDate',
      width: 140,
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-'),
    },
    {
      title: 'Số ngày',
      dataIndex: 'daysOfStay',
      key: 'daysOfStay',
      width: 80,
      align: 'center',
      render: (days) => (days ? <strong>{days}</strong> : '-'),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      render: (_, record) =>
        record.bedStatus === 1 ? (
          <Button
            size="small"
            icon={<SwapOutlined />}
            onClick={() => message.info('Chuyển giường')}
          >
            Chuyển giường
          </Button>
        ) : (
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() => message.info('Phân giường')}
          >
            Phân giường
          </Button>
        ),
    },
  ];

  const handleAdmitPatient = async () => {
    try {
      const values = await form.validateFields();

      const admitDto: AdmitFromOpdDto = {
        medicalRecordId: values.medicalRecordId,
        departmentId: values.departmentId,
        roomId: values.roomId,
        bedId: values.bedId,
        admissionType: values.admissionType,
        diagnosisOnAdmission: values.diagnosisOnAdmission,
        reasonForAdmission: values.reasonForAdmission,
        attendingDoctorId: values.admittingDoctorId,
      };

      await admitFromOpd(admitDto);
      message.success('Nhập viện thành công!');
      setIsAdmitModalOpen(false);
      form.resetFields();
      loadAdmissions(); // Refresh the list
    } catch (error) {
      console.error('Admit patient error:', error);
      message.error('Lỗi khi nhập viện. Vui lòng thử lại.');
    }
  };

  const handleCreateProgress = async () => {
    try {
      const values = await form.validateFields();

      const progressDto: CreateTreatmentSheetDto = {
        admissionId: values.admissionId,
        treatmentDate: values.progressDate ? dayjs(values.progressDate).format('YYYY-MM-DD HH:mm:ss') : dayjs().format('YYYY-MM-DD HH:mm:ss'),
        progressNotes: [
          values.subjectiveFindings ? `S: ${values.subjectiveFindings}` : '',
          values.objectiveFindings ? `O: ${values.objectiveFindings}` : '',
          values.assessment ? `A: ${values.assessment}` : '',
          values.plan ? `P: ${values.plan}` : '',
        ].filter(Boolean).join('\n'),
        dietOrders: values.dietOrder,
        nursingOrders: values.activityOrder,
      };

      await createTreatmentSheet(progressDto);
      message.success('Ghi nhận diễn biến thành công!');
      setIsProgressModalOpen(false);
      form.resetFields();
    } catch (error) {
      console.error('Create progress error:', error);
      message.error('Lỗi khi ghi nhận diễn biến. Vui lòng thử lại.');
    }
  };

  const handleCreateCare = async () => {
    try {
      const values = await form.validateFields();

      const careDto: CreateNursingCareSheetDto = {
        admissionId: values.admissionId,
        careDate: values.careDate ? dayjs(values.careDate).format('YYYY-MM-DD HH:mm:ss') : dayjs().format('YYYY-MM-DD HH:mm:ss'),
        shift: 1, // Default to morning shift
        patientCondition: values.description,
        notes: `Loại chăm sóc: ${values.careType}`,
      };

      await createNursingCareSheet(careDto);
      message.success('Ghi nhận chăm sóc thành công!');
      setIsCareModalOpen(false);
      form.resetFields();
    } catch (error) {
      console.error('Create care error:', error);
      message.error('Lỗi khi ghi nhận chăm sóc. Vui lòng thử lại.');
    }
  };

  const handleDischarge = async () => {
    try {
      const values = await form.validateFields();

      const dischargeDto: CompleteDischargeDto = {
        admissionId: values.admissionId,
        dischargeDate: values.dischargeDate ? dayjs(values.dischargeDate).format('YYYY-MM-DD HH:mm:ss') : dayjs().format('YYYY-MM-DD HH:mm:ss'),
        dischargeType: values.dischargeType,
        dischargeCondition: values.dischargeCondition,
        dischargeDiagnosis: values.dischargeDiagnosis,
        dischargeInstructions: values.dischargeInstructions,
        followUpDate: values.followUpDate ? dayjs(values.followUpDate).format('YYYY-MM-DD') : undefined,
      };

      await dischargePatient(dischargeDto);
      message.success('Xuất viện thành công!');
      setIsDischargeModalOpen(false);
      form.resetFields();
      loadAdmissions(); // Refresh the list
    } catch (error) {
      console.error('Discharge error:', error);
      message.error('Lỗi khi xuất viện. Vui lòng thử lại.');
    }
  };

  // Determine print type based on department
  const determinePrintType = (departmentName?: string): 'noi_khoa' | 'ngoai_khoa' => {
    if (!departmentName) return 'noi_khoa';
    const lowerName = departmentName.toLowerCase();
    if (lowerName.includes('ngoại') || lowerName.includes('phẫu thuật') || lowerName.includes('chấn thương')) {
      return 'ngoai_khoa';
    }
    return 'noi_khoa';
  };

  // Handle print medical record
  const handlePrintMedicalRecord = (type?: string) => {
    if (!selectedAdmission) return;

    const finalType = type || determinePrintType(selectedAdmission.departmentName);
    setPrintType(finalType);

    // Pre-fill form with patient data
    medicalRecordForm.setFieldsValue({
      hospitalName: 'Bệnh viện Đa khoa ABC',
      departmentName: selectedAdmission.departmentName,
      bedNumber: selectedAdmission.bedName,
      patientName: selectedAdmission.patientName?.toUpperCase(),
      dateOfBirth: selectedAdmission.dateOfBirth ? dayjs(selectedAdmission.dateOfBirth).format('DD/MM/YYYY') : '',
      gender: selectedAdmission.gender === 1 ? 'Nam' : 'Nữ',
      age: selectedAdmission.age,
      insuranceNumber: selectedAdmission.insuranceNumber,
      admissionDate: selectedAdmission.admissionDate ? dayjs(selectedAdmission.admissionDate) : dayjs(),
      diagnosis: selectedAdmission.mainDiagnosis,
    });

    setIsPrintModalOpen(true);
  };

  // Print the form
  const executePrint = () => {
    const formValues = medicalRecordForm.getFieldsValue();
    const recordType = MEDICAL_RECORD_TYPES.find(t => t.value === printType) || MEDICAL_RECORD_TYPES[0];
    const isNgoaiKhoa = ['ngoai_khoa', 'bong', 'ung_buou', 'rhm', 'tmh'].includes(printType);
    const isNhiKhoa = ['nhi_khoa', 'so_sinh', 'yhct_nhi', 'mat_tre_em', 'phcn_nhi'].includes(printType);
    const isSanPhuKhoa = ['phu_khoa', 'san_khoa'].includes(printType);
    const isMat = printType.startsWith('mat_');
    const isYHCT = printType.startsWith('yhct');
    const isPHCN = printType.startsWith('phcn');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      message.error('Không thể mở cửa sổ in. Vui lòng cho phép popup.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${recordType.label}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', serif; font-size: 13px; line-height: 1.4; padding: 20px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 10px; }
          .header-left { width: 40%; }
          .header-center { width: 30%; text-align: center; }
          .header-right { width: 30%; text-align: right; }
          .title { font-size: 18px; font-weight: bold; text-align: center; margin: 15px 0; }
          .section { margin: 10px 0; }
          .section-title { font-weight: bold; margin: 10px 0 5px 0; }
          .row { display: flex; margin: 3px 0; }
          .col { flex: 1; }
          .col-2 { flex: 2; }
          .col-3 { flex: 3; }
          .field { border-bottom: 1px dotted #000; min-width: 100px; display: inline-block; padding: 0 5px; }
          .field-long { border-bottom: 1px dotted #000; width: 100%; display: block; min-height: 20px; padding: 0 5px; }
          .checkbox { width: 14px; height: 14px; border: 1px solid #000; display: inline-block; margin-right: 3px; vertical-align: middle; text-align: center; line-height: 12px; }
          .checkbox.checked::after { content: '✓'; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          table th, table td { border: 1px solid #000; padding: 5px; text-align: left; }
          table th { background: #f0f0f0; }
          .signature-row { display: flex; justify-content: space-between; margin-top: 30px; }
          .signature-box { text-align: center; width: 200px; }
          .signature-title { font-weight: bold; margin-bottom: 50px; }
          .vital-signs { float: right; width: 150px; margin-left: 20px; }
          .vital-signs div { margin: 3px 0; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            Sở Y tế: <span class="field">${formValues.healthDepartment || '........................'}</span><br/>
            Bệnh viện: <span class="field">${formValues.hospitalName || '........................'}</span><br/>
            Khoa: <span class="field">${formValues.departmentName || '............'}</span> Giường: <span class="field">${formValues.bedNumber || '......'}</span>
          </div>
          <div class="header-center">
            <div class="title">${recordType.label.toUpperCase()}</div>
          </div>
          <div class="header-right">
            MS: ${recordType.code}<br/>
            Số lưu trữ: <span class="field">${formValues.archiveNumber || '............'}</span><br/>
            Mã YT: <span class="field">${formValues.medicalCode || '...../...../...../.....'}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">I. HÀNH CHÍNH:</div>
          <div class="row">
            <div class="col-2">1. Họ và tên (In hoa): <span class="field">${formValues.patientName || ''}</span></div>
            <div class="col">2. Sinh ngày: <span class="field">${formValues.dateOfBirth || ''}</span></div>
            <div>Tuổi: <span class="field">${formValues.age || ''}</span></div>
          </div>
          <div class="row">
            <div class="col">3. Giới: <span class="checkbox ${formValues.gender === 'Nam' ? 'checked' : ''}"></span>Nam <span class="checkbox ${formValues.gender === 'Nữ' ? 'checked' : ''}"></span>Nữ</div>
            <div class="col-2">4. Nghề nghiệp: <span class="field">${formValues.occupation || ''}</span></div>
          </div>
          <div class="row">
            <div class="col">5. Dân tộc: <span class="field">${formValues.ethnicity || ''}</span></div>
            <div class="col">6. Ngoại kiều: <span class="field">${formValues.nationality || ''}</span></div>
          </div>
          <div class="row">
            <div>7. Địa chỉ: Số nhà <span class="field">${formValues.houseNumber || ''}</span> Thôn, phố <span class="field">${formValues.street || ''}</span> Xã, phường <span class="field">${formValues.ward || ''}</span></div>
          </div>
          <div class="row">
            <div>Huyện (Q, Tx) <span class="field">${formValues.district || ''}</span> Tỉnh, thành phố <span class="field">${formValues.province || ''}</span></div>
          </div>
          <div class="row">
            <div class="col">8. Nơi làm việc: <span class="field">${formValues.workplace || ''}</span></div>
            <div class="col">9. Đối tượng: <span class="checkbox ${formValues.patientType === 'bhyt' ? 'checked' : ''}"></span>BHYT <span class="checkbox ${formValues.patientType === 'fee' ? 'checked' : ''}"></span>Thu phí <span class="checkbox ${formValues.patientType === 'free' ? 'checked' : ''}"></span>Miễn <span class="checkbox ${formValues.patientType === 'other' ? 'checked' : ''}"></span>Khác</div>
          </div>
          <div class="row">
            <div>10. BHYT giá trị đến ngày <span class="field">${formValues.insuranceValidDate || ''}</span> Số thẻ BHYT: <span class="field">${formValues.insuranceNumber || ''}</span></div>
          </div>
          <div class="row">
            <div>11. Họ tên, địa chỉ người nhà khi cần báo tin: <span class="field">${formValues.emergencyContact || ''}</span> Điện thoại: <span class="field">${formValues.emergencyPhone || ''}</span></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">II. QUẢN LÝ NGƯỜI BỆNH</div>
          <div class="row">
            <div class="col">12. Vào viện: <span class="field">${formValues.admissionDate ? dayjs(formValues.admissionDate).format('HH') : ''}</span> giờ <span class="field">${formValues.admissionDate ? dayjs(formValues.admissionDate).format('mm') : ''}</span> ph ngày <span class="field">${formValues.admissionDate ? dayjs(formValues.admissionDate).format('DD/MM/YYYY') : ''}</span></div>
            <div class="col">14. Nơi giới thiệu: <span class="checkbox"></span>Cơ quan y tế <span class="checkbox"></span>Tự đến <span class="checkbox"></span>Khác</div>
          </div>
          <div class="row">
            <div class="col">13. Trực tiếp vào: <span class="checkbox"></span>Cấp cứu <span class="checkbox"></span>KKB <span class="checkbox"></span>Khoa điều trị</div>
            <div class="col">- Vào viện do bệnh này lần thứ: <span class="field">${formValues.visitNumber || ''}</span></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">III. CHẨN ĐOÁN</div>
          <div class="row">
            <div class="col">20. Nơi chuyển đến: <span class="field-long">${formValues.referralFrom || ''}</span></div>
            <div class="col">23. Ra viện:</div>
          </div>
          <div class="row">
            <div class="col">21. KKB, Cấp cứu: <span class="field-long">${formValues.emergencyDiagnosis || ''}</span></div>
            <div class="col">+ Bệnh chính: <span class="field-long">${formValues.mainDiagnosis || formValues.diagnosis || ''}</span></div>
          </div>
          <div class="row">
            <div class="col">22. Khi vào khoa điều trị: <span class="field-long">${formValues.admissionDiagnosis || ''}</span></div>
            <div class="col">+ Bệnh kèm theo: <span class="field-long">${formValues.comorbidity || ''}</span></div>
          </div>
          ${isNgoaiKhoa ? `
          <div class="row">
            <div class="col">+ Chẩn đoán trước phẫu thuật: <span class="field-long">${formValues.preOpDiagnosis || ''}</span></div>
          </div>
          <div class="row">
            <div class="col">+ Chẩn đoán sau phẫu thuật: <span class="field-long">${formValues.postOpDiagnosis || ''}</span></div>
          </div>
          <div class="row">
            <div>23. Tổng số ngày điều trị sau phẫu thuật: <span class="field">${formValues.postOpDays || ''}</span></div>
            <div>24. Tổng số lần phẫu thuật: <span class="field">${formValues.surgeryCount || ''}</span></div>
          </div>
          ` : ''}
        </div>

        <div class="section">
          <div class="section-title">IV. TÌNH TRẠNG RA VIỆN</div>
          <div class="row">
            <div class="col">
              ${isNgoaiKhoa ? '26' : '24'}. Kết quả điều trị:<br/>
              <span class="checkbox"></span>1. Khỏi <span class="checkbox"></span>4. Nặng hơn<br/>
              <span class="checkbox"></span>2. Đỡ, giảm <span class="checkbox"></span>5. Tử vong<br/>
              <span class="checkbox"></span>3. Không thay đổi
            </div>
            <div class="col">
              ${isNgoaiKhoa ? '28' : '26'}. Tình hình tử vong: <span class="field"></span> giờ <span class="field"></span> ph ngày <span class="field"></span><br/>
              <span class="checkbox"></span>1. Do bệnh <span class="checkbox"></span>2. Do tai biến điều trị <span class="checkbox"></span>3. Khác<br/>
              <span class="checkbox"></span>1. Trong 24 giờ vào viện <span class="checkbox"></span>2. Sau 24 giờ vào viện
            </div>
          </div>
        </div>

        <div style="page-break-before: always;"></div>

        <div class="section">
          <div class="section-title">A - BỆNH ÁN</div>
          <div><strong>I. Lý do vào viện:</strong> <span class="field-long">${formValues.admissionReason || ''}</span> Vào ngày thứ <span class="field">${formValues.illnessDay || ''}</span> của bệnh</div>

          <div><strong>II. Hỏi bệnh:</strong></div>
          <div>1. Quá trình bệnh lý: (khởi phát, diễn biến, chẩn đoán, điều trị của tuyến dưới v.v..)</div>
          <div class="field-long" style="min-height: 80px;">${formValues.illnessHistory || ''}</div>

          <div>2. Tiền sử bệnh:</div>
          <div>+ Bản thân: (phát triển thể lực từ nhỏ đến lớn, những bệnh đã mắc, phương pháp ĐTr, tiêm phòng, ăn uống, sinh hoạt vv...)</div>
          <div class="field-long" style="min-height: 60px;">${formValues.personalHistory || ''}</div>

          <div>Đặc điểm liên quan bệnh:</div>
          <table>
            <tr>
              <th>TT</th><th>Ký hiệu</th><th>Thời gian (tháng)</th>
              <th>TT</th><th>Ký hiệu</th><th>Thời gian (tháng)</th>
            </tr>
            <tr>
              <td>01</td><td>- Dị ứng (dị nguyên)</td><td>${formValues.allergy || ''}</td>
              <td>04</td><td>- Thuốc lá</td><td>${formValues.smoking || ''}</td>
            </tr>
            <tr>
              <td>02</td><td>- Ma tuý</td><td>${formValues.drugs || ''}</td>
              <td>05</td><td>- Thuốc lào</td><td>${formValues.tobacco || ''}</td>
            </tr>
            <tr>
              <td>03</td><td>- Rượu bia</td><td>${formValues.alcohol || ''}</td>
              <td>06</td><td>- Khác</td><td>${formValues.otherHabits || ''}</td>
            </tr>
          </table>

          <div>+ Gia đình: (Những người trong gia đình: bệnh đã mắc, đời sống, tinh thần, vật chất v.v...)</div>
          <div class="field-long" style="min-height: 40px;">${formValues.familyHistory || ''}</div>
        </div>

        <div class="section">
          <div><strong>III - Khám bệnh:</strong></div>
          <div class="vital-signs">
            Mạch: <span class="field">${formValues.pulse || ''}</span> lần/ph<br/>
            Nhiệt độ: <span class="field">${formValues.temperature || ''}</span> °C<br/>
            Huyết áp: <span class="field">${formValues.bloodPressure || ''}</span> mmHg<br/>
            Nhịp thở: <span class="field">${formValues.respRate || ''}</span> lần/ph<br/>
            Cân nặng: <span class="field">${formValues.weight || ''}</span> kg
          </div>
          <div>1. Toàn thân: (ý thức, da niêm mạc, hệ thống hạch, tuyến giáp, vị trí, kích thước, số lượng, di động v.v)</div>
          <div class="field-long" style="min-height: 60px;">${formValues.generalExam || ''}</div>

          ${isNgoaiKhoa ? `
          <div>2. Bệnh ngoại khoa:</div>
          <div class="field-long" style="min-height: 100px;">${formValues.surgicalExam || ''}</div>
          ` : ''}

          <div>${isNgoaiKhoa ? '3' : '2'}. Các cơ quan:</div>
          <div>+ Tuần hoàn: <span class="field-long">${formValues.cardiovascular || ''}</span></div>
          <div>+ Hô hấp: <span class="field-long">${formValues.respiratory || ''}</span></div>
          <div>+ Tiêu hoá: <span class="field-long">${formValues.digestive || ''}</span></div>
          <div>+ Thận - Tiết niệu - Sinh dục: <span class="field-long">${formValues.urogenital || ''}</span></div>
          <div>+ Thần Kinh: <span class="field-long">${formValues.neurological || ''}</span></div>
          <div>+ Cơ - Xương - Khớp: <span class="field-long">${formValues.musculoskeletal || ''}</span></div>
          <div>+ Tai - Mũi - Họng: <span class="field-long">${formValues.ent || ''}</span></div>
          <div>+ Răng - Hàm - Mặt: <span class="field-long">${formValues.dental || ''}</span></div>
          <div>+ Mắt: <span class="field-long">${formValues.eye || ''}</span></div>
          <div>+ Nội tiết, dinh dưỡng và các bệnh lý khác: <span class="field-long">${formValues.other || ''}</span></div>
        </div>

        <div class="section">
          <div>${isNgoaiKhoa ? '4' : '3'}. Các xét nghiệm cận lâm sàng cần làm:</div>
          <div class="field-long" style="min-height: 40px;">${formValues.labTests || ''}</div>

          <div>${isNgoaiKhoa ? '5' : '4'}. Tóm tắt bệnh án:</div>
          <div class="field-long" style="min-height: 80px;">${formValues.summary || ''}</div>
        </div>

        <div class="section">
          <div><strong>IV. Chẩn đoán khi vào khoa điều trị:</strong></div>
          <div>+ Bệnh chính: <span class="field-long">${formValues.mainDiagnosis || formValues.diagnosis || ''}</span></div>
          <div>+ Bệnh kèm theo (nếu có): <span class="field-long">${formValues.comorbidity || ''}</span></div>
          <div>+ Phân biệt: <span class="field-long">${formValues.differentialDiagnosis || ''}</span></div>
        </div>

        <div class="section">
          <div><strong>V. Tiên lượng:</strong> <span class="field-long">${formValues.prognosis || ''}</span></div>
          <div><strong>VI. Hướng điều trị:</strong> <span class="field-long">${formValues.treatmentPlan || ''}</span></div>
        </div>

        <div class="signature-row">
          <div></div>
          <div class="signature-box">
            <div>Ngày <span class="field">${dayjs().format('DD')}</span> tháng <span class="field">${dayjs().format('MM')}</span> năm <span class="field">${dayjs().format('YYYY')}</span></div>
            <div class="signature-title">Bác sỹ làm bệnh án</div>
            <div>Họ và tên: <span class="field">${formValues.doctorName || ''}</span></div>
          </div>
        </div>

        ${isNgoaiKhoa ? `
        <div style="page-break-before: always;"></div>
        <div class="section">
          <div class="section-title">B. TỔNG KẾT BỆNH ÁN</div>
          <div>3. Phương pháp điều trị:</div>
          <table>
            <tr>
              <th colspan="2">- Phẫu thuật</th>
              <th colspan="2">- Thủ thuật</th>
            </tr>
            <tr>
              <th>Giờ, ngày</th>
              <th>Phương pháp phẫu thuật/vô cảm</th>
              <th>Bác sỹ phẫu thuật</th>
              <th>Bác sỹ gây mê</th>
            </tr>
            <tr>
              <td>${formValues.surgeryDateTime || ''}</td>
              <td>${formValues.surgeryMethod || ''}</td>
              <td>${formValues.surgeonName || ''}</td>
              <td>${formValues.anesthesiologistName || ''}</td>
            </tr>
          </table>
        </div>
        ` : ''}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // Handle print treatment tracking form (Phiếu theo dõi điều trị - MS: 36/BV2)
  const handlePrintTreatmentTracking = () => {
    if (!selectedAdmission) return;

    treatmentTrackingForm.setFieldsValue({
      hospitalName: 'Bệnh viện Đa khoa ABC',
      departmentName: selectedAdmission.departmentName,
      patientName: selectedAdmission.patientName,
      age: selectedAdmission.age,
      gender: selectedAdmission.gender === 1 ? 'Nam' : 'Nữ',
      roomName: selectedAdmission.roomName,
      bedName: selectedAdmission.bedName,
      diagnosis: selectedAdmission.mainDiagnosis,
      differentialDiagnosis: '',
      sheetNumber: 1,
      admissionCode: selectedAdmission.medicalRecordCode,
      patientCode: selectedAdmission.patientCode,
    });

    setIsTreatmentTrackingModalOpen(true);
  };

  // Execute print for treatment tracking form
  const executePrintTreatmentTracking = () => {
    const formValues = treatmentTrackingForm.getFieldsValue();

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      message.error('Không thể mở cửa sổ in. Vui lòng cho phép popup.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Phiếu theo dõi điều trị - MS: 36/BV2</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', serif; font-size: 13px; line-height: 1.4; padding: 20px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 10px; }
          .header-left { width: 40%; }
          .header-right { width: 30%; text-align: right; }
          .title { font-size: 16px; font-weight: bold; text-align: center; margin: 15px 0; text-transform: uppercase; }
          .subtitle { text-align: center; margin-bottom: 15px; }
          .row { margin: 5px 0; }
          .field { border-bottom: 1px dotted #000; min-width: 100px; display: inline-block; padding: 0 5px; }
          .field-long { border-bottom: 1px dotted #000; width: 100%; display: block; min-height: 20px; padding: 2px 5px; }
          .checkbox { display: inline-block; width: 14px; height: 14px; border: 1px solid #000; margin-right: 5px; vertical-align: middle; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          table th, table td { border: 1px solid #000; padding: 8px; text-align: left; vertical-align: top; }
          table th { background-color: #f5f5f5; text-align: center; }
          .note { font-style: italic; margin-top: 15px; font-size: 12px; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <div>Cơ sở KB, CB: <span class="field">${formValues.hospitalName || ''}</span></div>
            <div>Khoa: <span class="field">${formValues.departmentName || ''}</span></div>
          </div>
          <div style="text-align: center;">
            <div style="font-weight: bold;">PHIẾU THEO DÕI ĐIỀU TRỊ</div>
            <div>Tờ số: <span class="field">${formValues.sheetNumber || '1'}</span></div>
          </div>
          <div style="text-align: right;">
            <div><strong>MS: 36/BV2</strong></div>
            <div>Số vào viện: <span class="field">${formValues.admissionCode || ''}</span></div>
            <div>Mã người bệnh: <span class="field">${formValues.patientCode || ''}</span></div>
          </div>
        </div>

        <div class="row">
          Họ và tên người bệnh: <span class="field" style="width: 300px;">${formValues.patientName || ''}</span>
          Tuổi: <span class="field">${formValues.age || ''}</span>
          <span class="checkbox ${formValues.gender === 'Nam' ? 'checked' : ''}"></span>Nam
          <span class="checkbox ${formValues.gender === 'Nữ' ? 'checked' : ''}"></span>Nữ
        </div>
        <div class="row">
          Khoa: <span class="field">${formValues.departmentName || ''}</span>
          Phòng: <span class="field">${formValues.roomName || ''}</span>
          Giường: <span class="field">${formValues.bedName || ''}</span>
        </div>
        <div class="row">
          Chẩn đoán: <span class="field-long">${formValues.diagnosis || ''}</span>
        </div>
        <div class="row">
          Chẩn đoán phân biệt: <span class="field-long">${formValues.differentialDiagnosis || ''}</span>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 15%;">Thời gian<br/>(Ngày, giờ)</th>
              <th style="width: 55%;">Diễn biến bệnh<br/><i>(Viết diễn biến theo cấu trúc như SOAP)</i></th>
              <th style="width: 30%;">Chỉ định</th>
            </tr>
          </thead>
          <tbody>
            ${(formValues.trackingEntries || []).map((entry: { time: string; progress: string; orders: string }) => `
              <tr>
                <td>${entry.time || ''}</td>
                <td style="white-space: pre-wrap;">${entry.progress || ''}</td>
                <td style="white-space: pre-wrap;">${entry.orders || ''}</td>
              </tr>
            `).join('') || `
              <tr><td style="height: 60px;"></td><td></td><td></td></tr>
              <tr><td style="height: 60px;"></td><td></td><td></td></tr>
              <tr><td style="height: 60px;"></td><td></td><td></td></tr>
              <tr><td style="height: 60px;"></td><td></td><td></td></tr>
              <tr><td style="height: 60px;"></td><td></td><td></td></tr>
              <tr><td style="height: 60px;"></td><td></td><td></td></tr>
              <tr><td style="height: 60px;"></td><td></td><td></td></tr>
              <tr><td style="height: 60px;"></td><td></td><td></td></tr>
            `}
          </tbody>
        </table>

        <div class="note">
          <strong>Ghi chú:</strong> Bác sỹ ký ngay sau mỗi lần ghi chép trong phần "Diễn biến bệnh" hoặc "Chỉ định".
        </div>

        <div style="margin-top: 20px; padding: 10px; border: 1px solid #ccc; font-size: 11px;">
          <div><strong>Hướng dẫn cách ghi chép theo cấu trúc (SOAP):</strong></div>
          <div>- S (Hỏi bệnh): ghi lại các thông tin của người bệnh tự khai như triệu chứng, bệnh sử, bối cảnh xuất hiện bệnh, tiến triển...</div>
          <div>- O (Kết quả khám): ghi lại các thông tin do bác sỹ thăm khám như các dấu hiệu sinh tồn, các kết quả xét nghiệm...</div>
          <div>- A (Đánh giá): Đánh giá, phân tích kết quả và chẩn đoán trên cơ sở thông tin tự khai của người bệnh và kết quả khám bệnh.</div>
          <div>- P (Kế hoạch điều trị): tóm tắt tình hình, diễn biến bệnh, đưa ra nhận định, đưa ra hướng xử trí tiếp theo.</div>
          <div>- Chỉ định: cụ thể hóa kế hoạch điều trị như các vấn đề cần theo dõi, các loại thuốc sử dụng, các thủ thuật cần làm...</div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <div>
      <Title level={4}>Quản lý nội trú (IPD)</Title>

      <Card>
        <Tabs
          items={[
            {
              key: 'current',
              label: 'Danh sách đang điều trị',
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col flex="auto">
                      <Space>
                        <Search
                          placeholder="Tìm theo mã BN, tên, mã HS..."
                          allowClear
                          enterButton={<SearchOutlined />}
                          style={{ width: 300 }}
                          onSearch={handleSearch}
                        />
                        <Select
                          placeholder="Khoa"
                          style={{ width: 150 }}
                          allowClear
                          onChange={(value) => setSearchParams(prev => ({ ...prev, departmentId: value, page: 1 }))}
                        >
                          <Select.Option value="1">Khoa Nội</Select.Option>
                          <Select.Option value="2">Khoa Ngoại</Select.Option>
                          <Select.Option value="3">Khoa Sản</Select.Option>
                        </Select>
                        <Select
                          placeholder="Trạng thái"
                          style={{ width: 150 }}
                          allowClear
                          onChange={(value) => setSearchParams(prev => ({ ...prev, status: value, page: 1 }))}
                        >
                          <Select.Option value={0}>Đang điều trị</Select.Option>
                          <Select.Option value={1}>Chuyển khoa</Select.Option>
                          <Select.Option value={2}>Xuất viện</Select.Option>
                        </Select>
                        <Button
                          icon={<ReloadOutlined />}
                          onClick={loadAdmissions}
                          loading={loading}
                        >
                          Làm mới
                        </Button>
                      </Space>
                    </Col>
                    <Col>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setIsAdmitModalOpen(true)}
                      >
                        Nhập viện
                      </Button>
                    </Col>
                  </Row>

                  <Spin spinning={loading}>
                    <Table
                      columns={admissionColumns}
                      dataSource={admissions}
                      rowKey="admissionId"
                      size="small"
                      scroll={{ x: 1400 }}
                      pagination={{
                        current: searchParams.page,
                        pageSize: searchParams.pageSize,
                        total: total,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total) => `Tổng: ${total} bệnh nhân`,
                        onChange: (page, pageSize) => setSearchParams(prev => ({ ...prev, page, pageSize })),
                      }}
                      locale={{ emptyText: 'Không có bệnh nhân nội trú' }}
                      onRow={(record) => ({
                        onDoubleClick: () => {
                          setSelectedAdmission(record);
                          setIsDetailModalOpen(true);
                        },
                        style: { cursor: 'pointer' },
                      })}
                    />
                  </Spin>
                </>
              ),
            },
            {
              key: 'beds',
              label: 'Quản lý giường',
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col flex="auto">
                      <Space>
                        <Select placeholder="Khoa" style={{ width: 150 }} allowClear>
                          <Select.Option value="1">Khoa Nội</Select.Option>
                          <Select.Option value="2">Khoa Ngoại</Select.Option>
                          <Select.Option value="3">Khoa Sản</Select.Option>
                        </Select>
                        <Select placeholder="Phòng" style={{ width: 150 }} allowClear>
                          <Select.Option value="1">Phòng Nội 1</Select.Option>
                          <Select.Option value="2">Phòng Nội 2</Select.Option>
                        </Select>
                        <Select placeholder="Trạng thái" style={{ width: 150 }} allowClear>
                          <Select.Option value={0}>Trống</Select.Option>
                          <Select.Option value={1}>Đang sử dụng</Select.Option>
                          <Select.Option value={2}>Bảo trì</Select.Option>
                        </Select>
                        <Button
                          icon={<ReloadOutlined />}
                          onClick={loadBeds}
                          loading={loadingBeds}
                        >
                          Làm mới
                        </Button>
                      </Space>
                    </Col>
                  </Row>

                  <Spin spinning={loadingBeds}>
                    <Table
                      columns={bedColumns}
                      dataSource={beds}
                      rowKey="bedId"
                      size="small"
                      scroll={{ x: 1200 }}
                      pagination={{
                        showSizeChanger: true,
                        showTotal: (total) => `Tổng: ${total} giường`,
                      }}
                      locale={{ emptyText: 'Không có giường' }}
                      onRow={(record) => ({
                        onDoubleClick: () => {
                          Modal.info({
                            title: `Chi tiết giường: ${record.bedCode}`,
                            width: 500,
                            content: (
                              <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                                <Descriptions.Item label="Mã giường">{record.bedCode}</Descriptions.Item>
                                <Descriptions.Item label="Tên giường">{record.bedName}</Descriptions.Item>
                                <Descriptions.Item label="Phòng">{record.roomName}</Descriptions.Item>
                                <Descriptions.Item label="Khoa">{record.departmentName}</Descriptions.Item>
                                <Descriptions.Item label="Trạng thái">{getBedStatusBadge(record.bedStatus, record.bedStatusName)}</Descriptions.Item>
                                <Descriptions.Item label="Bệnh nhân">{record.patientName || '-'}</Descriptions.Item>
                                <Descriptions.Item label="Mã BN">{record.patientCode || '-'}</Descriptions.Item>
                              </Descriptions>
                            ),
                          });
                        },
                        style: { cursor: 'pointer' },
                      })}
                    />
                  </Spin>
                </>
              ),
            },
            {
              key: 'progress',
              label: 'Diễn biến hàng ngày',
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col flex="auto">
                      <Search
                        placeholder="Tìm theo mã BN, tên..."
                        allowClear
                        enterButton={<SearchOutlined />}
                        style={{ width: 300 }}
                      />
                    </Col>
                    <Col>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setIsProgressModalOpen(true)}
                      >
                        Ghi nhận diễn biến
                      </Button>
                    </Col>
                  </Row>
                  <div style={{ textAlign: 'center', padding: '50px 0' }}>
                    <Text type="secondary">Chọn bệnh nhân để xem diễn biến hàng ngày</Text>
                  </div>
                </>
              ),
            },
            {
              key: 'nursing',
              label: 'Chăm sóc điều dưỡng',
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col flex="auto">
                      <Search
                        placeholder="Tìm theo mã BN, tên..."
                        allowClear
                        enterButton={<SearchOutlined />}
                        style={{ width: 300 }}
                      />
                    </Col>
                    <Col>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setIsCareModalOpen(true)}
                      >
                        Ghi nhận chăm sóc
                      </Button>
                    </Col>
                  </Row>
                  <div style={{ textAlign: 'center', padding: '50px 0' }}>
                    <Text type="secondary">Chọn bệnh nhân để xem lịch sử chăm sóc</Text>
                  </div>
                </>
              ),
            },
            {
              key: 'discharge',
              label: 'Xuất viện',
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col flex="auto">
                      <Space>
                        <Search
                          placeholder="Tìm theo mã BN, tên..."
                          allowClear
                          enterButton={<SearchOutlined />}
                          style={{ width: 300 }}
                        />
                        <DatePicker.RangePicker format="DD/MM/YYYY" />
                      </Space>
                    </Col>
                    <Col>
                      <Button
                        type="primary"
                        danger
                        icon={<ExportOutlined />}
                        onClick={() => setIsDischargeModalOpen(true)}
                      >
                        Xuất viện
                      </Button>
                    </Col>
                  </Row>
                  <div style={{ textAlign: 'center', padding: '50px 0' }}>
                    <Text type="secondary">Danh sách bệnh nhân đã xuất viện</Text>
                  </div>
                </>
              ),
            },
          ]}
        />
      </Card>

      {/* Admit Patient Modal */}
      <Modal
        title="Nhập viện"
        open={isAdmitModalOpen}
        onOk={handleAdmitPatient}
        onCancel={() => setIsAdmitModalOpen(false)}
        width={900}
        okText="Nhập viện"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="patientId"
                label="Bệnh nhân"
                rules={[{ required: true, message: 'Vui lòng chọn bệnh nhân' }]}
              >
                <Select
                  showSearch
                  placeholder="Tìm và chọn bệnh nhân"
                  optionFilterProp="children"
                >
                  <Select.Option value="1">BN26000001 - Nguyễn Văn A</Select.Option>
                  <Select.Option value="2">BN26000002 - Trần Thị B</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="medicalRecordId"
                label="Hồ sơ bệnh án"
                rules={[{ required: true }]}
              >
                <Select placeholder="Chọn hồ sơ">
                  <Select.Option value="1">HS260130001</Select.Option>
                  <Select.Option value="2">HS260130002</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="admissionDate"
                label="Ngày nhập viện"
                initialValue={dayjs()}
                rules={[{ required: true }]}
              >
                <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="admissionType"
                label="Loại nhập viện"
                rules={[{ required: true }]}
              >
                <Select placeholder="Chọn loại">
                  <Select.Option value={1}>Cấp cứu</Select.Option>
                  <Select.Option value={2}>Chuyển tuyến</Select.Option>
                  <Select.Option value={3}>Điều trị</Select.Option>
                  <Select.Option value={4}>Khác</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="referralSource" label="Nguồn chuyển đến">
                <Input placeholder="Nhập nguồn chuyển đến" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="departmentId"
                label="Khoa"
                rules={[{ required: true }]}
              >
                <Select placeholder="Chọn khoa">
                  <Select.Option value="1">Khoa Nội</Select.Option>
                  <Select.Option value="2">Khoa Ngoại</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="roomId"
                label="Phòng"
                rules={[{ required: true }]}
              >
                <Select placeholder="Chọn phòng">
                  <Select.Option value="1">Phòng Nội 1</Select.Option>
                  <Select.Option value="2">Phòng Nội 2</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="bedId" label="Giường">
                <Select placeholder="Chọn giường" allowClear>
                  <Select.Option value="1">Giường 01</Select.Option>
                  <Select.Option value="2">Giường 02</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="admittingDoctorId"
                label="Bác sĩ nhập viện"
                rules={[{ required: true }]}
              >
                <Select placeholder="Chọn bác sĩ">
                  <Select.Option value="1">BS. Nguyễn Văn A</Select.Option>
                  <Select.Option value="2">BS. Trần Thị B</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="diagnosisOnAdmission" label="Chẩn đoán khi nhập viện">
            <TextArea rows={2} placeholder="Nhập chẩn đoán" />
          </Form.Item>

          <Form.Item name="reasonForAdmission" label="Lý do nhập viện">
            <TextArea rows={2} placeholder="Nhập lý do nhập viện" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Daily Progress Modal */}
      <Modal
        title="Ghi nhận diễn biến hàng ngày"
        open={isProgressModalOpen}
        onOk={handleCreateProgress}
        onCancel={() => setIsProgressModalOpen(false)}
        width={900}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="admissionId"
                label="Bệnh nhân"
                rules={[{ required: true }]}
              >
                <Select placeholder="Chọn bệnh nhân">
                  <Select.Option value="1">BN26000001 - Nguyễn Văn A</Select.Option>
                  <Select.Option value="2">BN26000002 - Trần Thị B</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="progressDate"
                label="Ngày ghi nhận"
                initialValue={dayjs()}
                rules={[{ required: true }]}
              >
                <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Diễn biến (SOAP)</Divider>

          <Form.Item name="subjectiveFindings" label="Chủ quan (S - Subjective)">
            <TextArea rows={2} placeholder="Triệu chứng, cảm giác của bệnh nhân..." />
          </Form.Item>

          <Form.Item name="objectiveFindings" label="Khách quan (O - Objective)">
            <TextArea rows={2} placeholder="Dấu hiệu lâm sàng, kết quả xét nghiệm..." />
          </Form.Item>

          <Form.Item name="assessment" label="Đánh giá (A - Assessment)">
            <TextArea rows={2} placeholder="Đánh giá tình trạng bệnh..." />
          </Form.Item>

          <Form.Item name="plan" label="Kế hoạch (P - Plan)">
            <TextArea rows={2} placeholder="Kế hoạch điều trị..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="dietOrder" label="Chế độ ăn">
                <Input placeholder="Nhập chế độ ăn" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="activityOrder" label="Chế độ vận động">
                <Input placeholder="Nhập chế độ vận động" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Nursing Care Modal */}
      <Modal
        title="Ghi nhận chăm sóc điều dưỡng"
        open={isCareModalOpen}
        onOk={handleCreateCare}
        onCancel={() => setIsCareModalOpen(false)}
        width={700}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="admissionId"
                label="Bệnh nhân"
                rules={[{ required: true }]}
              >
                <Select placeholder="Chọn bệnh nhân">
                  <Select.Option value="1">BN26000001 - Nguyễn Văn A</Select.Option>
                  <Select.Option value="2">BN26000002 - Trần Thị B</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="careDate"
                label="Ngày chăm sóc"
                initialValue={dayjs()}
                rules={[{ required: true }]}
              >
                <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="careType"
            label="Loại chăm sóc"
            rules={[{ required: true }]}
          >
            <Select placeholder="Chọn loại chăm sóc">
              <Select.Option value={1}>Theo dõi dấu hiệu sinh tồn</Select.Option>
              <Select.Option value={2}>Chăm sóc vệ sinh</Select.Option>
              <Select.Option value={3}>Thay băng</Select.Option>
              <Select.Option value={4}>Tiêm truyền</Select.Option>
              <Select.Option value={5}>Khác</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả công việc"
            rules={[{ required: true }]}
          >
            <TextArea rows={4} placeholder="Nhập mô tả chi tiết công việc chăm sóc..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Discharge Modal */}
      <Modal
        title="Xuất viện"
        open={isDischargeModalOpen}
        onOk={handleDischarge}
        onCancel={() => setIsDischargeModalOpen(false)}
        width={900}
        okText="Xuất viện"
        okButtonProps={{ danger: true }}
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="admissionId"
                label="Bệnh nhân"
                rules={[{ required: true }]}
              >
                <Select placeholder="Chọn bệnh nhân">
                  <Select.Option value="1">BN26000001 - Nguyễn Văn A</Select.Option>
                  <Select.Option value="2">BN26000002 - Trần Thị B</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="dischargeDate"
                label="Ngày xuất viện"
                initialValue={dayjs()}
                rules={[{ required: true }]}
              >
                <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="dischargeType"
                label="Loại xuất viện"
                rules={[{ required: true }]}
              >
                <Select placeholder="Chọn loại">
                  <Select.Option value={1}>Ra viện</Select.Option>
                  <Select.Option value={2}>Chuyển viện</Select.Option>
                  <Select.Option value={3}>Bỏ về</Select.Option>
                  <Select.Option value={4}>Tử vong</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="dischargeCondition"
                label="Tình trạng ra viện"
                rules={[{ required: true }]}
              >
                <Select placeholder="Chọn tình trạng">
                  <Select.Option value={1}>Khỏi</Select.Option>
                  <Select.Option value={2}>Đỡ</Select.Option>
                  <Select.Option value={3}>Không thay đổi</Select.Option>
                  <Select.Option value={4}>Nặng hơn</Select.Option>
                  <Select.Option value={5}>Tử vong</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="dischargeDiagnosis" label="Chẩn đoán ra viện">
            <TextArea rows={2} placeholder="Nhập chẩn đoán ra viện" />
          </Form.Item>

          <Form.Item name="dischargeInstructions" label="Hướng dẫn sau xuất viện">
            <TextArea rows={3} placeholder="Nhập hướng dẫn chăm sóc, dùng thuốc..." />
          </Form.Item>

          <Form.Item name="followUpDate" label="Ngày hẹn tái khám">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        title="Chi tiết bệnh nhân nội trú"
        open={isDetailModalOpen}
        onCancel={() => {
          setIsDetailModalOpen(false);
          setSelectedAdmission(null);
        }}
        footer={[
          <Button
            key="print-record"
            type="primary"
            icon={<FileTextOutlined />}
            onClick={() => handlePrintMedicalRecord()}
          >
            In bệnh án (24 loại)
          </Button>,
          <Button
            key="print-treatment"
            icon={<PrinterOutlined />}
            onClick={handlePrintTreatmentTracking}
          >
            In phiếu theo dõi
          </Button>,
          <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
            Đóng
          </Button>,
        ]}
        width={900}
      >
        {selectedAdmission && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card size="small" title="Thông tin bệnh nhân">
                  <Row gutter={16}>
                    <Col span={8}>
                      <Text type="secondary">Mã bệnh nhân:</Text>
                      <div><strong>{selectedAdmission.patientCode}</strong></div>
                    </Col>
                    <Col span={8}>
                      <Text type="secondary">Họ tên:</Text>
                      <div><strong>{selectedAdmission.patientName}</strong></div>
                    </Col>
                    <Col span={8}>
                      <Text type="secondary">Giới tính / Tuổi:</Text>
                      <div>
                        <strong>
                          {selectedAdmission.gender === 1 ? 'Nam' : 'Nữ'} / {selectedAdmission.age || 'N/A'} tuổi
                        </strong>
                      </div>
                    </Col>
                  </Row>
                  <Divider style={{ margin: '12px 0' }} />
                  <Row gutter={16}>
                    <Col span={8}>
                      <Text type="secondary">Mã hồ sơ:</Text>
                      <div><strong>{selectedAdmission.medicalRecordCode}</strong></div>
                    </Col>
                    <Col span={8}>
                      <Text type="secondary">BHYT:</Text>
                      <div>
                        {selectedAdmission.isInsurance ? (
                          <Tag color="green">{selectedAdmission.insuranceNumber || 'Có BHYT'}</Tag>
                        ) : (
                          <Tag>Không có BHYT</Tag>
                        )}
                      </div>
                    </Col>
                    <Col span={8}>
                      <Text type="secondary">Trạng thái:</Text>
                      <div>{getStatusTag(selectedAdmission.status, selectedAdmission.statusName)}</div>
                    </Col>
                  </Row>
                </Card>
              </Col>

              <Col span={24}>
                <Card size="small" title="Thông tin nhập viện">
                  <Row gutter={16}>
                    <Col span={8}>
                      <Text type="secondary">Ngày nhập viện:</Text>
                      <div>
                        <strong>
                          {selectedAdmission.admissionDate
                            ? dayjs(selectedAdmission.admissionDate).format('DD/MM/YYYY HH:mm')
                            : 'N/A'}
                        </strong>
                      </div>
                    </Col>
                    <Col span={8}>
                      <Text type="secondary">Số ngày điều trị:</Text>
                      <div><strong>{selectedAdmission.daysOfStay} ngày</strong></div>
                    </Col>
                    <Col span={8}>
                      <Text type="secondary">Bác sĩ điều trị:</Text>
                      <div><strong>{selectedAdmission.attendingDoctorName || 'N/A'}</strong></div>
                    </Col>
                  </Row>
                  <Divider style={{ margin: '12px 0' }} />
                  <Row gutter={16}>
                    <Col span={8}>
                      <Text type="secondary">Khoa:</Text>
                      <div><strong>{selectedAdmission.departmentName}</strong></div>
                    </Col>
                    <Col span={8}>
                      <Text type="secondary">Phòng:</Text>
                      <div><strong>{selectedAdmission.roomName}</strong></div>
                    </Col>
                    <Col span={8}>
                      <Text type="secondary">Giường:</Text>
                      <div><strong>{selectedAdmission.bedName || 'Chưa phân giường'}</strong></div>
                    </Col>
                  </Row>
                </Card>
              </Col>

              <Col span={24}>
                <Card size="small" title="Chẩn đoán">
                  <Text>{selectedAdmission.mainDiagnosis || 'Chưa có chẩn đoán'}</Text>
                </Card>
              </Col>

              <Col span={24}>
                <Card size="small" title="Cảnh báo">
                  <Space wrap>
                    {selectedAdmission.hasPendingOrders && (
                      <Tag color="orange">Có y lệnh chờ xử lý</Tag>
                    )}
                    {selectedAdmission.hasPendingLabResults && (
                      <Tag color="blue">Có kết quả XN chờ</Tag>
                    )}
                    {selectedAdmission.hasUnclaimedMedicine && (
                      <Tag color="red">Thuốc chưa lĩnh</Tag>
                    )}
                    {selectedAdmission.isDebtWarning && (
                      <Tag color="red">Cảnh báo nợ: {selectedAdmission.totalDebt?.toLocaleString()} VNĐ</Tag>
                    )}
                    {selectedAdmission.isInsuranceExpiring && (
                      <Tag color="orange">BHYT sắp hết hạn</Tag>
                    )}
                    {!selectedAdmission.hasPendingOrders &&
                      !selectedAdmission.hasPendingLabResults &&
                      !selectedAdmission.hasUnclaimedMedicine &&
                      !selectedAdmission.isDebtWarning &&
                      !selectedAdmission.isInsuranceExpiring && (
                        <Text type="secondary">Không có cảnh báo</Text>
                      )}
                  </Space>
                </Card>
              </Col>
            </Row>
          </div>
        )}
      </Modal>

      {/* Print Medical Record Modal */}
      <Modal
        title={`In ${MEDICAL_RECORD_TYPES.find(t => t.value === printType)?.label || 'Bệnh án'} (MS: ${MEDICAL_RECORD_TYPES.find(t => t.value === printType)?.code || ''})`}
        open={isPrintModalOpen}
        onCancel={() => {
          setIsPrintModalOpen(false);
          medicalRecordForm.resetFields();
        }}
        width={1000}
        footer={[
          <Button key="cancel" onClick={() => setIsPrintModalOpen(false)}>
            Hủy
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={executePrint}
          >
            In bệnh án
          </Button>,
        ]}
      >
        <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
          <Form form={medicalRecordForm} layout="vertical" size="small">
            {/* Chọn loại bệnh án */}
            <Alert
              message="Chọn loại bệnh án phù hợp với chuyên khoa của bệnh nhân"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Loại bệnh án">
                  <Select
                    value={printType}
                    onChange={(value) => setPrintType(value)}
                    showSearch
                    optionFilterProp="children"
                    style={{ width: '100%' }}
                  >
                    {MEDICAL_RECORD_TYPES.map(type => (
                      <Select.Option key={type.value} value={type.value}>
                        {type.label} (MS: {type.code})
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Divider><strong>I. Hành chính</strong></Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="hospitalName" label="Bệnh viện">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="departmentName" label="Khoa">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="bedNumber" label="Giường">
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="patientName" label="Họ tên bệnh nhân (IN HOA)">
                  <Input style={{ textTransform: 'uppercase' }} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="dateOfBirth" label="Ngày sinh">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="age" label="Tuổi">
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item name="gender" label="Giới tính">
                  <Select>
                    <Select.Option value="Nam">Nam</Select.Option>
                    <Select.Option value="Nữ">Nữ</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="occupation" label="Nghề nghiệp">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="ethnicity" label="Dân tộc">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="nationality" label="Ngoại kiều">
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item name="houseNumber" label="Số nhà">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="street" label="Thôn/Phố">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="ward" label="Xã/Phường">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="district" label="Quận/Huyện">
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="province" label="Tỉnh/Thành phố">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="insuranceNumber" label="Số thẻ BHYT">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="patientType" label="Đối tượng">
                  <Select>
                    <Select.Option value="bhyt">BHYT</Select.Option>
                    <Select.Option value="fee">Thu phí</Select.Option>
                    <Select.Option value="free">Miễn</Select.Option>
                    <Select.Option value="other">Khác</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="emergencyContact" label="Người nhà (khi cần báo tin)">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="emergencyPhone" label="Điện thoại người nhà">
                  <Input />
                </Form.Item>
              </Col>
            </Row>

            <Divider><strong>II. Quản lý người bệnh</strong></Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="admissionDate" label="Ngày vào viện">
                  <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="admissionType" label="Trực tiếp vào">
                  <Select>
                    <Select.Option value="emergency">Cấp cứu</Select.Option>
                    <Select.Option value="kkb">KKB</Select.Option>
                    <Select.Option value="treatment">Khoa điều trị</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="visitNumber" label="Vào viện do bệnh này lần thứ">
                  <Input type="number" />
                </Form.Item>
              </Col>
            </Row>

            <Divider><strong>III. Chẩn đoán</strong></Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="emergencyDiagnosis" label="21. KKB, Cấp cứu">
                  <TextArea rows={2} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="admissionDiagnosis" label="22. Khi vào khoa điều trị">
                  <TextArea rows={2} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="mainDiagnosis" label="Bệnh chính">
                  <TextArea rows={2} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="comorbidity" label="Bệnh kèm theo">
                  <TextArea rows={2} />
                </Form.Item>
              </Col>
            </Row>

            {printType === 'ngoai_khoa' && (
              <>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="preOpDiagnosis" label="Chẩn đoán trước phẫu thuật">
                      <TextArea rows={2} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="postOpDiagnosis" label="Chẩn đoán sau phẫu thuật">
                      <TextArea rows={2} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item name="postOpDays" label="Số ngày ĐT sau PT">
                      <Input type="number" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="surgeryCount" label="Tổng số lần phẫu thuật">
                      <Input type="number" />
                    </Form.Item>
                  </Col>
                </Row>
              </>
            )}

            <Divider><strong>A. Bệnh án</strong></Divider>
            <Row gutter={16}>
              <Col span={18}>
                <Form.Item name="admissionReason" label="I. Lý do vào viện">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="illnessDay" label="Vào ngày thứ ... của bệnh">
                  <Input type="number" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="illnessHistory" label="II. Quá trình bệnh lý">
              <TextArea rows={3} placeholder="Khởi phát, diễn biến, chẩn đoán, điều trị của tuyến dưới..." />
            </Form.Item>
            <Form.Item name="personalHistory" label="Tiền sử bản thân">
              <TextArea rows={2} />
            </Form.Item>
            <Form.Item name="familyHistory" label="Tiền sử gia đình">
              <TextArea rows={2} />
            </Form.Item>

            <Divider><strong>III. Khám bệnh</strong></Divider>
            <Row gutter={16}>
              <Col span={4}>
                <Form.Item name="pulse" label="Mạch (lần/ph)">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item name="temperature" label="Nhiệt độ (°C)">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item name="bloodPressure" label="Huyết áp">
                  <Input placeholder="120/80" />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item name="respRate" label="Nhịp thở">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item name="weight" label="Cân nặng (kg)">
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="generalExam" label="1. Toàn thân">
              <TextArea rows={2} placeholder="Ý thức, da niêm mạc, hệ thống hạch, tuyến giáp..." />
            </Form.Item>

            {printType === 'ngoai_khoa' && (
              <Form.Item name="surgicalExam" label="2. Bệnh ngoại khoa">
                <TextArea rows={3} />
              </Form.Item>
            )}

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="cardiovascular" label="Tuần hoàn">
                  <TextArea rows={2} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="respiratory" label="Hô hấp">
                  <TextArea rows={2} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="digestive" label="Tiêu hoá">
                  <TextArea rows={2} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="urogenital" label="Thận - Tiết niệu - Sinh dục">
                  <TextArea rows={2} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="neurological" label="Thần kinh">
                  <TextArea rows={2} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="musculoskeletal" label="Cơ - Xương - Khớp">
                  <TextArea rows={2} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="labTests" label="Các xét nghiệm cận lâm sàng cần làm">
              <TextArea rows={2} />
            </Form.Item>
            <Form.Item name="summary" label="Tóm tắt bệnh án">
              <TextArea rows={3} />
            </Form.Item>

            <Divider><strong>IV. Chẩn đoán & Điều trị</strong></Divider>
            <Form.Item name="differentialDiagnosis" label="Chẩn đoán phân biệt">
              <TextArea rows={2} />
            </Form.Item>
            <Form.Item name="prognosis" label="V. Tiên lượng">
              <TextArea rows={2} />
            </Form.Item>
            <Form.Item name="treatmentPlan" label="VI. Hướng điều trị">
              <TextArea rows={2} />
            </Form.Item>
            <Form.Item name="doctorName" label="Bác sĩ làm bệnh án">
              <Input />
            </Form.Item>

            {printType === 'ngoai_khoa' && (
              <>
                <Divider><strong>B. Phẫu thuật / Thủ thuật</strong></Divider>
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item name="surgeryDateTime" label="Giờ, ngày PT">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="surgeryMethod" label="Phương pháp PT/vô cảm">
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="surgeonName" label="Bác sĩ phẫu thuật">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="anesthesiologistName" label="Bác sĩ gây mê">
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>
              </>
            )}
          </Form>
        </div>
      </Modal>

      {/* Treatment Tracking Modal - Phiếu theo dõi điều trị MS: 36/BV2 */}
      <Modal
        title="In Phiếu theo dõi điều trị (MS: 36/BV2)"
        open={isTreatmentTrackingModalOpen}
        onCancel={() => {
          setIsTreatmentTrackingModalOpen(false);
          treatmentTrackingForm.resetFields();
        }}
        width={1000}
        footer={[
          <Button key="cancel" onClick={() => setIsTreatmentTrackingModalOpen(false)}>
            Hủy
          </Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={executePrintTreatmentTracking}>
            In phiếu
          </Button>,
        ]}
      >
        <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '16px' }}>
          <Form form={treatmentTrackingForm} layout="vertical">
            <Row gutter={16}>
              <Col span={16}>
                <Form.Item name="hospitalName" label="Cơ sở khám bệnh, chữa bệnh">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="department" label="Khoa">
                  <Input />
                </Form.Item>
              </Col>
            </Row>

            <Divider><strong>Thông tin bệnh nhân</strong></Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="patientName" label="Họ tên">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="age" label="Tuổi">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="gender" label="Giới tính">
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="medicalRecordCode" label="Số hồ sơ">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="bedNumber" label="Giường số">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="roomNumber" label="Buồng">
                  <Input />
                </Form.Item>
              </Col>
            </Row>

            <Divider><strong>Chẩn đoán</strong></Divider>
            <Form.Item name="diagnosis" label="Chẩn đoán">
              <TextArea rows={2} />
            </Form.Item>

            <Divider><strong>Theo dõi hàng ngày (Mẫu SOAP)</strong></Divider>
            <Alert
              message="Hướng dẫn ghi chép theo mẫu SOAP"
              description={
                <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                  <li><strong>S (Subjective):</strong> Triệu chứng chủ quan - bệnh nhân tự kể</li>
                  <li><strong>O (Objective):</strong> Dấu hiệu khách quan - thăm khám, xét nghiệm</li>
                  <li><strong>A (Assessment):</strong> Đánh giá - chẩn đoán, tiên lượng</li>
                  <li><strong>P (Plan):</strong> Kế hoạch - điều trị, theo dõi tiếp</li>
                </ul>
              }
              type="info"
              style={{ marginBottom: 16 }}
            />
            <Form.Item name="dailyTracking" label="Nội dung theo dõi">
              <TextArea rows={8} placeholder={`Ngày ....../....../......   Giờ: ........

S - Triệu chứng chủ quan:
(Ghi lời kể của bệnh nhân về tình trạng hiện tại)

O - Dấu hiệu khách quan:
- Mạch: ...... lần/phút    Nhiệt độ: ......°C
- HA: ....../.......mmHg   Nhịp thở: ...... lần/phút
- Khám thực thể: .......

A - Đánh giá:
(Đánh giá tình trạng bệnh, diễn biến)

P - Kế hoạch điều trị:
(Y lệnh thuốc, xét nghiệm, chăm sóc)`} />
            </Form.Item>

            <Divider><strong>Điều trị</strong></Divider>
            <Form.Item name="medications" label="Thuốc điều trị">
              <TextArea rows={3} placeholder="Tên thuốc - Liều dùng - Cách dùng - Số lượng" />
            </Form.Item>
            <Form.Item name="procedures" label="Thủ thuật, phẫu thuật">
              <TextArea rows={2} />
            </Form.Item>

            <Divider />
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="attendingDoctor" label="Bác sĩ điều trị">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="nurse" label="Điều dưỡng">
                  <Input />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </div>
      </Modal>
    </div>
  );
};

export default Inpatient;
