import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Tabs,
  Form,
  Input,
  InputNumber,
  Button,
  Space,
  Table,
  Tag,
  Descriptions,
  Modal,
  message,
  AutoComplete,
  DatePicker,
  Divider,
  Typography,
  Spin,
  Alert,
  Tooltip,
} from 'antd';
import {
  SaveOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  HistoryOutlined,
  SearchOutlined,
  PlusOutlined,
  DeleteOutlined,
  UserOutlined,
  HeartOutlined,
  MedicineBoxOutlined,
  FileTextOutlined,
  AimOutlined,
  OrderedListOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { patientApi, type Patient } from '../api/patient';
import {
  examinationApi,
  type QueuePatient,
  type Examination,
  type Diagnosis,
  type TreatmentOrder,
  type Service,
} from '../api/examination';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface ICDOption {
  value: string;
  label: string;
  code: string;
  name: string;
}

interface ServiceOption {
  value: string;
  label: string;
  data: Service;
}

const OPD: React.FC = () => {
  // State for patient selection
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [queueList, setQueueList] = useState<QueuePatient[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');

  // State for examination
  const [examination, setExamination] = useState<Examination | null>(null);
  const [examForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('vital-signs');
  const [saving, setSaving] = useState(false);

  // State for ICD and services
  const [icdOptions, setIcdOptions] = useState<ICDOption[]>([]);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [searchingICD, setSearchingICD] = useState(false);
  const [searchingService, setSearchingService] = useState(false);

  // State for diagnoses and orders
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [orders, setOrders] = useState<TreatmentOrder[]>([]);

  // State for modals
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [patientHistory, setPatientHistory] = useState<Examination[]>([]);

  // Load queue on mount
  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    try {
      setLoadingQueue(true);
      const response = await examinationApi.getQueue();
      if (response.success && response.data) {
        setQueueList(response.data);
      }
    } catch (error) {
      message.error('Không thể tải danh sách chờ khám');
    } finally {
      setLoadingQueue(false);
    }
  };

  const handleSelectPatientFromQueue = async (queuePatient: QueuePatient) => {
    try {
      const response = await patientApi.getById(queuePatient.patientId);
      if (response.success && response.data) {
        setSelectedPatient(response.data);
        initializeNewExamination(response.data, queuePatient);
        message.success(`Đã chọn bệnh nhân: ${queuePatient.patientName}`);
      }
    } catch (error) {
      message.error('Không thể tải thông tin bệnh nhân');
    }
  };

  const handleSearchPatient = async () => {
    if (!searchKeyword.trim()) {
      message.warning('Vui lòng nhập từ khóa tìm kiếm');
      return;
    }

    try {
      // Try different search methods
      let response;

      if (searchKeyword.startsWith('BN')) {
        response = await patientApi.getByCode(searchKeyword);
      } else if (/^\d{9,12}$/.test(searchKeyword)) {
        response = await patientApi.getByIdentityNumber(searchKeyword);
      } else if (searchKeyword.length === 15) {
        response = await patientApi.getByInsuranceNumber(searchKeyword);
      } else {
        const searchResponse = await patientApi.search({ keyword: searchKeyword, page: 1, pageSize: 1 });
        if (searchResponse.success && searchResponse.data && searchResponse.data.items.length > 0) {
          response = { success: true, data: searchResponse.data.items[0] };
        }
      }

      if (response?.success && response.data) {
        setSelectedPatient(response.data);
        initializeNewExamination(response.data);
        message.success(`Đã tìm thấy bệnh nhân: ${response.data.fullName}`);
      } else {
        message.warning('Không tìm thấy bệnh nhân');
      }
    } catch (error) {
      message.error('Lỗi khi tìm kiếm bệnh nhân');
    }
  };

  const initializeNewExamination = (patient: Patient, queue?: QueuePatient) => {
    const newExam: Examination = {
      examinationDate: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      patientId: patient.id,
      patientCode: patient.patientCode,
      patientName: patient.fullName,
      queueId: queue?.id,
      queueNumber: queue?.queueNumber,
      departmentId: queue?.departmentId || '',
      departmentName: queue?.departmentName,
      roomId: queue?.roomId || '',
      roomName: queue?.roomName,
      doctorId: '', // Should be from current user
      status: 0, // Draft
      vitalSigns: {},
      medicalHistory: {},
      physicalExamination: {},
    };

    setExamination(newExam);
    setDiagnoses([]);
    setOrders([]);
    examForm.resetFields();
  };

  const calculateAge = (dateOfBirth?: string, yearOfBirth?: number): string => {
    if (dateOfBirth) {
      const age = dayjs().diff(dayjs(dateOfBirth), 'year');
      return `${age} tuổi`;
    } else if (yearOfBirth) {
      const age = dayjs().year() - yearOfBirth;
      return `${age} tuổi`;
    }
    return 'N/A';
  };

  const handleSearchICD = async (value: string) => {
    if (!value || value.length < 2) {
      setIcdOptions([]);
      return;
    }

    try {
      setSearchingICD(true);
      const response = await examinationApi.searchICDCodes(value);
      if (response.success && response.data) {
        const options: ICDOption[] = response.data.map((icd) => ({
          value: icd.code,
          label: `${icd.code} - ${icd.name}`,
          code: icd.code,
          name: icd.name,
        }));
        setIcdOptions(options);
      }
    } catch (error) {
      console.error('Error searching ICD codes:', error);
    } finally {
      setSearchingICD(false);
    }
  };

  const handleAddDiagnosis = (icdCode: string, diagnosisType: number) => {
    const selectedICD = icdOptions.find((opt) => opt.code === icdCode);
    if (!selectedICD) return;

    const newDiagnosis: Diagnosis = {
      icdCode: selectedICD.code,
      icdName: selectedICD.name,
      diagnosisType,
    };

    setDiagnoses([...diagnoses, newDiagnosis]);
    message.success('Đã thêm chẩn đoán');
  };

  const handleRemoveDiagnosis = (index: number) => {
    const newDiagnoses = diagnoses.filter((_, i) => i !== index);
    setDiagnoses(newDiagnoses);
  };

  const handleSearchService = async (value: string) => {
    if (!value || value.length < 2) {
      setServiceOptions([]);
      return;
    }

    try {
      setSearchingService(true);
      const response = await examinationApi.searchServices(value);
      if (response.success && response.data) {
        const options: ServiceOption[] = response.data.map((service) => ({
          value: service.id,
          label: `${service.code} - ${service.name} (${service.price.toLocaleString()} đ)`,
          data: service,
        }));
        setServiceOptions(options);
      }
    } catch (error) {
      console.error('Error searching services:', error);
    } finally {
      setSearchingService(false);
    }
  };

  const handleAddOrder = (serviceId: string, orderType: number) => {
    const selectedService = serviceOptions.find((opt) => opt.value === serviceId);
    if (!selectedService) return;

    const newOrder: TreatmentOrder = {
      orderType,
      serviceId: selectedService.data.id,
      serviceName: selectedService.data.name,
      serviceCode: selectedService.data.code,
      quantity: 1,
      unit: selectedService.data.unit,
      urgency: 1,
    };

    setOrders([...orders, newOrder]);
    message.success('Đã thêm chỉ định');
  };

  const handleRemoveOrder = (index: number) => {
    const newOrders = orders.filter((_, i) => i !== index);
    setOrders(newOrders);
  };

  const handleUpdateOrderQuantity = (index: number, quantity: number) => {
    const newOrders = [...orders];
    newOrders[index].quantity = quantity;
    setOrders(newOrders);
  };

  const handleAutoSave = useCallback(async () => {
    if (!examination || !selectedPatient) return;

    try {
      const formValues = examForm.getFieldsValue();
      const examData = {
        ...examination,
        vitalSigns: formValues.vitalSigns,
        medicalHistory: formValues.medicalHistory,
        physicalExamination: formValues.physicalExamination,
        diagnoses,
        orders,
        conclusion: formValues.conclusion,
        recommendations: formValues.recommendations,
      };

      if (examination.id) {
        await examinationApi.update(examination.id, {
          ...examData,
          id: examination.id,
          status: 0, // Keep as draft
        });
      } else {
        const response = await examinationApi.create({
          ...examData,
          status: 0, // Draft
        });
        if (response.success && response.data) {
          setExamination(response.data);
        }
      }
    } catch (error) {
      console.error('Auto-save error:', error);
    }
  }, [examination, selectedPatient, examForm, diagnoses, orders]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      handleAutoSave();
    }, 30000);

    return () => clearInterval(interval);
  }, [handleAutoSave]);

  const handleSave = async () => {
    if (!examination || !selectedPatient) {
      message.warning('Vui lòng chọn bệnh nhân');
      return;
    }

    try {
      setSaving(true);
      await examForm.validateFields();
      const formValues = examForm.getFieldsValue();

      const examData = {
        patientId: selectedPatient.id,
        queueId: examination.queueId,
        departmentId: examination.departmentId,
        roomId: examination.roomId,
        vitalSigns: formValues.vitalSigns,
        medicalHistory: formValues.medicalHistory,
        physicalExamination: formValues.physicalExamination,
        diagnoses,
        orders,
        conclusion: formValues.conclusion,
        recommendations: formValues.recommendations,
        followUpDate: formValues.followUpDate?.format('YYYY-MM-DD'),
        status: 0, // Draft
      };

      if (examination.id) {
        const response = await examinationApi.update(examination.id, {
          ...examData,
          id: examination.id,
        });
        if (response.success && response.data) {
          setExamination(response.data);
          message.success('Đã lưu phiếu khám');
        }
      } else {
        const response = await examinationApi.create(examData);
        if (response.success && response.data) {
          setExamination(response.data);
          message.success('Đã tạo phiếu khám');
        }
      }
    } catch (error: any) {
      message.error(error.message || 'Lỗi khi lưu phiếu khám');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!examination?.id) {
      message.warning('Vui lòng lưu phiếu khám trước');
      return;
    }

    if (diagnoses.length === 0) {
      message.warning('Vui lòng nhập chẩn đoán');
      return;
    }

    Modal.confirm({
      title: 'Hoàn thành khám bệnh',
      content: 'Bạn có chắc chắn muốn hoàn thành phiếu khám này?',
      okText: 'Hoàn thành',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          // Save first
          await handleSave();

          // Then complete
          const response = await examinationApi.complete(examination.id!);
          if (response.success) {
            message.success('Đã hoàn thành khám bệnh');
            setExamination(response.data || null);
            loadQueue(); // Reload queue
          }
        } catch (error: any) {
          message.error(error.message || 'Lỗi khi hoàn thành khám bệnh');
        }
      },
    });
  };

  const handlePrint = () => {
    if (!examination?.id) {
      message.warning('Vui lòng lưu phiếu khám trước');
      return;
    }
    message.info('Chức năng in đang phát triển');
  };

  const handleViewHistory = async () => {
    if (!selectedPatient) {
      message.warning('Vui lòng chọn bệnh nhân');
      return;
    }

    try {
      const response = await examinationApi.getPatientHistory(selectedPatient.id, 1, 20);
      if (response.success && response.data) {
        setPatientHistory(response.data.items);
        setHistoryModalVisible(true);
      }
    } catch (error) {
      message.error('Không thể tải lịch sử khám bệnh');
    }
  };

  const diagnosisColumns: ColumnsType<Diagnosis> = [
    {
      title: 'Loại',
      dataIndex: 'diagnosisType',
      width: 100,
      render: (type) => (
        <Tag color={type === 1 ? 'red' : 'blue'}>
          {type === 1 ? 'Chính' : 'Phụ'}
        </Tag>
      ),
    },
    {
      title: 'Mã ICD',
      dataIndex: 'icdCode',
      width: 100,
    },
    {
      title: 'Tên bệnh',
      dataIndex: 'icdName',
    },
    {
      title: 'Ghi chú',
      dataIndex: 'description',
      width: 200,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 80,
      render: (_, __, index) => (
        <Button
          type="link"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveDiagnosis(index ?? 0)}
        >
          Xóa
        </Button>
      ),
    },
  ];

  const getOrderTypeName = (type: number): string => {
    switch (type) {
      case 1: return 'Xét nghiệm';
      case 2: return 'Chẩn đoán hình ảnh';
      case 3: return 'Thủ thuật';
      case 4: return 'Thuốc';
      case 5: return 'Dịch vụ';
      default: return 'Khác';
    }
  };

  const orderColumns: ColumnsType<TreatmentOrder> = [
    {
      title: 'Loại',
      dataIndex: 'orderType',
      width: 120,
      render: (type) => <Tag color="blue">{getOrderTypeName(type)}</Tag>,
    },
    {
      title: 'Mã DV',
      dataIndex: 'serviceCode',
      width: 100,
    },
    {
      title: 'Tên dịch vụ',
      dataIndex: 'serviceName',
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      width: 100,
      render: (qty, _, index) => (
        <InputNumber
          min={1}
          value={qty}
          onChange={(value) => handleUpdateOrderQuantity(index, value || 1)}
          size="small"
        />
      ),
    },
    {
      title: 'ĐVT',
      dataIndex: 'unit',
      width: 80,
    },
    {
      title: 'Hướng dẫn',
      dataIndex: 'instructions',
      width: 200,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 80,
      render: (_, __, index) => (
        <Button
          type="link"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveOrder(index ?? 0)}
        >
          Xóa
        </Button>
      ),
    },
  ];

  const queueColumns: ColumnsType<QueuePatient> = [
    {
      title: 'STT',
      dataIndex: 'queueNumber',
      width: 60,
      align: 'center',
      render: (num) => <strong>{num}</strong>,
    },
    {
      title: 'Mã BN',
      dataIndex: 'patientCode',
      width: 110,
    },
    {
      title: 'Họ tên',
      dataIndex: 'patientName',
      render: (name) => <strong>{name}</strong>,
    },
    {
      title: 'Tuổi',
      key: 'age',
      width: 60,
      render: (_, record) => calculateAge(record.dateOfBirth, record.yearOfBirth),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 100,
      render: (status) => {
        const statusMap = {
          0: { text: 'Chờ khám', color: 'orange' },
          1: { text: 'Đang khám', color: 'blue' },
          2: { text: 'Hoàn thành', color: 'green' },
        };
        const s = statusMap[status as keyof typeof statusMap] || statusMap[0];
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4}>Khám bệnh ngoại trú</Title>
        </Col>
      </Row>

      <Row gutter={16}>
        {/* Left Sidebar - Patient Selection */}
        <Col xs={24} lg={6}>
          <Card
            title={
              <Space>
                <UserOutlined />
                Thông tin bệnh nhân
              </Space>
            }
            size="small"
            style={{ marginBottom: 16 }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input.Search
                placeholder="Mã BN, CCCD, SĐT, BHYT..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onSearch={handleSearchPatient}
                enterButton={<SearchOutlined />}
              />

              {selectedPatient && (
                <>
                  <Divider style={{ margin: '12px 0' }} />
                  <Descriptions column={1} size="small" bordered>
                    <Descriptions.Item label="Mã BN">
                      <strong>{selectedPatient.patientCode}</strong>
                    </Descriptions.Item>
                    <Descriptions.Item label="Họ tên">
                      <strong>{selectedPatient.fullName}</strong>
                    </Descriptions.Item>
                    <Descriptions.Item label="Tuổi">
                      {calculateAge(selectedPatient.dateOfBirth, selectedPatient.yearOfBirth)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Giới tính">
                      {selectedPatient.gender === 1 ? 'Nam' : selectedPatient.gender === 2 ? 'Nữ' : 'Khác'}
                    </Descriptions.Item>
                    <Descriptions.Item label="SĐT">
                      {selectedPatient.phoneNumber || 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Số BHYT">
                      {selectedPatient.insuranceNumber ? (
                        <Text copyable>{selectedPatient.insuranceNumber}</Text>
                      ) : (
                        'N/A'
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="Địa chỉ">
                      {selectedPatient.address || 'N/A'}
                    </Descriptions.Item>
                  </Descriptions>

                  <Button
                    block
                    icon={<HistoryOutlined />}
                    onClick={handleViewHistory}
                  >
                    Lịch sử khám bệnh
                  </Button>
                </>
              )}
            </Space>
          </Card>

          <Card
            title="Danh sách chờ khám"
            size="small"
            extra={
              <Button
                type="text"
                size="small"
                icon={<SearchOutlined />}
                onClick={loadQueue}
              >
                Làm mới
              </Button>
            }
          >
            <Spin spinning={loadingQueue}>
              <Table
                columns={queueColumns}
                dataSource={queueList}
                rowKey="id"
                size="small"
                pagination={false}
                scroll={{ y: 400 }}
                onRow={(record) => ({
                  onClick: () => handleSelectPatientFromQueue(record),
                  style: { cursor: 'pointer' },
                })}
              />
            </Spin>
          </Card>
        </Col>

        {/* Main Area - Examination Form */}
        <Col xs={24} lg={18}>
          {!selectedPatient ? (
            <Card>
              <Alert
                message="Vui lòng chọn bệnh nhân"
                description="Chọn bệnh nhân từ danh sách chờ khám hoặc tìm kiếm bệnh nhân để bắt đầu khám bệnh."
                type="info"
                showIcon
              />
            </Card>
          ) : (
            <Card
              title="Phiếu khám bệnh"
              extra={
                <Space>
                  <Button
                    type="default"
                    icon={<SaveOutlined />}
                    onClick={handleSave}
                    loading={saving}
                  >
                    Lưu nháp
                  </Button>
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={handleComplete}
                    disabled={!examination?.id}
                  >
                    Hoàn thành
                  </Button>
                  <Button
                    icon={<PrinterOutlined />}
                    onClick={handlePrint}
                    disabled={!examination?.id}
                  >
                    In
                  </Button>
                </Space>
              }
            >
              <Form
                form={examForm}
                layout="vertical"
                initialValues={{
                  vitalSigns: {},
                  medicalHistory: {},
                  physicalExamination: {},
                }}
              >
                <Tabs
                  activeKey={activeTab}
                  onChange={setActiveTab}
                  items={[
                    {
                      key: 'vital-signs',
                      label: (
                        <span>
                          <HeartOutlined /> Sinh hiệu
                        </span>
                      ),
                      children: (
                        <Row gutter={16}>
                          <Col xs={24} sm={12} md={8}>
                            <Form.Item
                              label="Cân nặng (kg)"
                              name={['vitalSigns', 'weight']}
                            >
                              <InputNumber
                                min={0}
                                max={300}
                                step={0.1}
                                style={{ width: '100%' }}
                                placeholder="Nhập cân nặng"
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} md={8}>
                            <Form.Item
                              label="Chiều cao (cm)"
                              name={['vitalSigns', 'height']}
                            >
                              <InputNumber
                                min={0}
                                max={250}
                                step={0.1}
                                style={{ width: '100%' }}
                                placeholder="Nhập chiều cao"
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} md={8}>
                            <Form.Item label="BMI" name={['vitalSigns', 'bmi']}>
                              <InputNumber
                                min={0}
                                max={100}
                                step={0.1}
                                style={{ width: '100%' }}
                                placeholder="Tự động tính"
                                disabled
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} md={8}>
                            <Form.Item
                              label="Huyết áp tâm thu (mmHg)"
                              name={['vitalSigns', 'bloodPressureSystolic']}
                            >
                              <InputNumber
                                min={0}
                                max={300}
                                style={{ width: '100%' }}
                                placeholder="VD: 120"
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} md={8}>
                            <Form.Item
                              label="Huyết áp tâm trương (mmHg)"
                              name={['vitalSigns', 'bloodPressureDiastolic']}
                            >
                              <InputNumber
                                min={0}
                                max={200}
                                style={{ width: '100%' }}
                                placeholder="VD: 80"
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} md={8}>
                            <Form.Item
                              label="Nhiệt độ (°C)"
                              name={['vitalSigns', 'temperature']}
                            >
                              <InputNumber
                                min={30}
                                max={45}
                                step={0.1}
                                style={{ width: '100%' }}
                                placeholder="VD: 36.5"
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} md={8}>
                            <Form.Item
                              label="Mạch (lần/phút)"
                              name={['vitalSigns', 'pulse']}
                            >
                              <InputNumber
                                min={0}
                                max={300}
                                style={{ width: '100%' }}
                                placeholder="VD: 72"
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} md={8}>
                            <Form.Item
                              label="Nhịp thở (lần/phút)"
                              name={['vitalSigns', 'respiratoryRate']}
                            >
                              <InputNumber
                                min={0}
                                max={100}
                                style={{ width: '100%' }}
                                placeholder="VD: 18"
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} md={8}>
                            <Form.Item
                              label="SpO2 (%)"
                              name={['vitalSigns', 'spo2']}
                            >
                              <InputNumber
                                min={0}
                                max={100}
                                style={{ width: '100%' }}
                                placeholder="VD: 98"
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                      ),
                    },
                    {
                      key: 'medical-history',
                      label: (
                        <span>
                          <FileTextOutlined /> Bệnh sử & Triệu chứng
                        </span>
                      ),
                      children: (
                        <Row gutter={16}>
                          <Col span={24}>
                            <Form.Item
                              label="Lý do khám"
                              name={['medicalHistory', 'chiefComplaint']}
                            >
                              <TextArea
                                rows={3}
                                placeholder="Nhập lý do khám chính..."
                              />
                            </Form.Item>
                          </Col>
                          <Col span={24}>
                            <Form.Item
                              label="Bệnh sử"
                              name={['medicalHistory', 'historyOfPresentIllness']}
                            >
                              <TextArea
                                rows={4}
                                placeholder="Nhập quá trình bệnh lý hiện tại..."
                              />
                            </Form.Item>
                          </Col>
                          <Col span={24}>
                            <Form.Item
                              label="Tiền sử bệnh"
                              name={['medicalHistory', 'pastMedicalHistory']}
                            >
                              <TextArea
                                rows={3}
                                placeholder="Các bệnh đã mắc, phẫu thuật..."
                              />
                            </Form.Item>
                          </Col>
                          <Col span={24}>
                            <Form.Item
                              label="Tiền sử gia đình"
                              name={['medicalHistory', 'familyHistory']}
                            >
                              <TextArea
                                rows={2}
                                placeholder="Bệnh lý gia đình..."
                              />
                            </Form.Item>
                          </Col>
                          <Col span={24}>
                            <Form.Item
                              label="Dị ứng"
                              name={['medicalHistory', 'allergies']}
                            >
                              <TextArea
                                rows={2}
                                placeholder="Dị ứng thuốc, thực phẩm..."
                              />
                            </Form.Item>
                          </Col>
                          <Col span={24}>
                            <Form.Item
                              label="Thuốc đang dùng"
                              name={['medicalHistory', 'currentMedications']}
                            >
                              <TextArea
                                rows={2}
                                placeholder="Các thuốc đang sử dụng..."
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                      ),
                    },
                    {
                      key: 'physical-exam',
                      label: (
                        <span>
                          <MedicineBoxOutlined /> Khám lâm sàng
                        </span>
                      ),
                      children: (
                        <Row gutter={16}>
                          <Col span={24}>
                            <Form.Item
                              label="Toàn thân"
                              name={['physicalExamination', 'generalAppearance']}
                            >
                              <TextArea
                                rows={2}
                                placeholder="Tình trạng chung, dinh dưỡng..."
                              />
                            </Form.Item>
                          </Col>
                          <Col span={24}>
                            <Form.Item
                              label="Tim mạch"
                              name={['physicalExamination', 'cardiovascular']}
                            >
                              <TextArea
                                rows={2}
                                placeholder="Khám tim mạch..."
                              />
                            </Form.Item>
                          </Col>
                          <Col span={24}>
                            <Form.Item
                              label="Hô hấp"
                              name={['physicalExamination', 'respiratory']}
                            >
                              <TextArea
                                rows={2}
                                placeholder="Khám hô hấp..."
                              />
                            </Form.Item>
                          </Col>
                          <Col span={24}>
                            <Form.Item
                              label="Tiêu hóa"
                              name={['physicalExamination', 'gastrointestinal']}
                            >
                              <TextArea
                                rows={2}
                                placeholder="Khám tiêu hóa..."
                              />
                            </Form.Item>
                          </Col>
                          <Col span={24}>
                            <Form.Item
                              label="Thần kinh"
                              name={['physicalExamination', 'neurological']}
                            >
                              <TextArea
                                rows={2}
                                placeholder="Khám thần kinh..."
                              />
                            </Form.Item>
                          </Col>
                          <Col span={24}>
                            <Form.Item
                              label="Cơ xương khớp"
                              name={['physicalExamination', 'musculoskeletal']}
                            >
                              <TextArea
                                rows={2}
                                placeholder="Khám cơ xương khớp..."
                              />
                            </Form.Item>
                          </Col>
                          <Col span={24}>
                            <Form.Item
                              label="Da"
                              name={['physicalExamination', 'skin']}
                            >
                              <TextArea rows={2} placeholder="Khám da..." />
                            </Form.Item>
                          </Col>
                          <Col span={24}>
                            <Form.Item
                              label="Khác"
                              name={['physicalExamination', 'other']}
                            >
                              <TextArea
                                rows={2}
                                placeholder="Các khám khác..."
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                      ),
                    },
                    {
                      key: 'diagnosis',
                      label: (
                        <span>
                          <AimOutlined /> Chẩn đoán
                        </span>
                      ),
                      children: (
                        <>
                          <Space style={{ marginBottom: 16 }}>
                            <AutoComplete
                              style={{ width: 400 }}
                              options={icdOptions}
                              onSearch={handleSearchICD}
                              placeholder="Tìm mã ICD-10..."
                              notFoundContent={
                                searchingICD ? <Spin size="small" /> : 'Không tìm thấy'
                              }
                            >
                              <Input.Search
                                enterButton={
                                  <Button type="primary">Thêm chẩn đoán chính</Button>
                                }
                                onSearch={(value) => handleAddDiagnosis(value, 1)}
                              />
                            </AutoComplete>
                            <Button
                              onClick={() => {
                                const value = icdOptions[0]?.code;
                                if (value) handleAddDiagnosis(value, 2);
                              }}
                            >
                              Thêm chẩn đoán phụ
                            </Button>
                          </Space>

                          <Table
                            columns={diagnosisColumns}
                            dataSource={diagnoses}
                            rowKey={(_, index) => (index ?? 0).toString()}
                            size="small"
                            pagination={false}
                            locale={{ emptyText: 'Chưa có chẩn đoán' }}
                          />

                          <Divider />

                          <Row gutter={16}>
                            <Col span={24}>
                              <Form.Item label="Kết luận" name="conclusion">
                                <TextArea
                                  rows={3}
                                  placeholder="Nhập kết luận..."
                                />
                              </Form.Item>
                            </Col>
                            <Col span={24}>
                              <Form.Item
                                label="Hướng điều trị"
                                name="recommendations"
                              >
                                <TextArea
                                  rows={3}
                                  placeholder="Nhập hướng điều trị..."
                                />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item label="Ngày tái khám" name="followUpDate">
                                <DatePicker
                                  style={{ width: '100%' }}
                                  format="DD/MM/YYYY"
                                />
                              </Form.Item>
                            </Col>
                          </Row>
                        </>
                      ),
                    },
                    {
                      key: 'treatment-orders',
                      label: (
                        <span>
                          <OrderedListOutlined /> Chỉ định
                        </span>
                      ),
                      children: (
                        <>
                          <Space style={{ marginBottom: 16 }} wrap>
                            <AutoComplete
                              style={{ width: 400 }}
                              options={serviceOptions}
                              onSearch={handleSearchService}
                              placeholder="Tìm dịch vụ..."
                              notFoundContent={
                                searchingService ? <Spin size="small" /> : 'Không tìm thấy'
                              }
                            >
                              <Input prefix={<SearchOutlined />} />
                            </AutoComplete>
                            <Tooltip title="Xét nghiệm">
                              <Button
                                icon={<PlusOutlined />}
                                onClick={() => {
                                  const value = serviceOptions[0]?.value;
                                  if (value) handleAddOrder(value, 1);
                                }}
                              >
                                XN
                              </Button>
                            </Tooltip>
                            <Tooltip title="Chẩn đoán hình ảnh">
                              <Button
                                icon={<PlusOutlined />}
                                onClick={() => {
                                  const value = serviceOptions[0]?.value;
                                  if (value) handleAddOrder(value, 2);
                                }}
                              >
                                CĐHA
                              </Button>
                            </Tooltip>
                            <Tooltip title="Thủ thuật">
                              <Button
                                icon={<PlusOutlined />}
                                onClick={() => {
                                  const value = serviceOptions[0]?.value;
                                  if (value) handleAddOrder(value, 3);
                                }}
                              >
                                TT
                              </Button>
                            </Tooltip>
                            <Tooltip title="Thuốc">
                              <Button
                                icon={<PlusOutlined />}
                                onClick={() => {
                                  const value = serviceOptions[0]?.value;
                                  if (value) handleAddOrder(value, 4);
                                }}
                              >
                                Thuốc
                              </Button>
                            </Tooltip>
                            <Tooltip title="Dịch vụ khác">
                              <Button
                                icon={<PlusOutlined />}
                                onClick={() => {
                                  const value = serviceOptions[0]?.value;
                                  if (value) handleAddOrder(value, 5);
                                }}
                              >
                                DV
                              </Button>
                            </Tooltip>
                          </Space>

                          <Table
                            columns={orderColumns}
                            dataSource={orders}
                            rowKey={(_, index) => (index ?? 0).toString()}
                            size="small"
                            pagination={false}
                            locale={{ emptyText: 'Chưa có chỉ định' }}
                          />
                        </>
                      ),
                    },
                  ]}
                />
              </Form>
            </Card>
          )}
        </Col>
      </Row>

      {/* History Modal */}
      <Modal
        title="Lịch sử khám bệnh"
        open={historyModalVisible}
        onCancel={() => setHistoryModalVisible(false)}
        footer={null}
        width={1000}
      >
        <Table
          columns={[
            {
              title: 'Ngày khám',
              dataIndex: 'examinationDate',
              render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm'),
            },
            {
              title: 'Phòng khám',
              dataIndex: 'roomName',
            },
            {
              title: 'Bác sĩ',
              dataIndex: 'doctorName',
            },
            {
              title: 'Chẩn đoán',
              dataIndex: 'diagnoses',
              render: (diagnoses: Diagnosis[]) =>
                diagnoses?.map((d) => d.icdName).join(', ') || 'N/A',
            },
            {
              title: 'Trạng thái',
              dataIndex: 'status',
              render: (status) => {
                const statusMap = {
                  0: { text: 'Nháp', color: 'default' },
                  1: { text: 'Đang khám', color: 'blue' },
                  2: { text: 'Hoàn thành', color: 'green' },
                  3: { text: 'Đã hủy', color: 'red' },
                };
                const s = statusMap[status as keyof typeof statusMap] || statusMap[0];
                return <Tag color={s.color}>{s.text}</Tag>;
              },
            },
          ]}
          dataSource={patientHistory}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10 }}
        />
      </Modal>
    </div>
  );
};

export default OPD;
