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
  Timeline,
  DatePicker,
  Alert,
  Divider,
  Tooltip,
} from 'antd';
import {
  SearchOutlined,
  PrinterOutlined,
  BarcodeOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  FileSearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import laboratoryApi from '../api/laboratory';

const { Title, Text } = Typography;
const { Search } = Input;
const { TextArea } = Input;

// Interfaces
interface LabRequest {
  id: string;
  requestCode: string;
  patientCode: string;
  patientName: string;
  gender: number;
  dateOfBirth?: string;
  requestedTests: string[];
  priority: number; // 0: Normal, 1: Urgent, 2: Emergency
  requestDate: string;
  status: number; // 0: Pending, 1: Collected, 2: Processing, 3: ResultsEntered, 4: Approved
  departmentName?: string;
  doctorName?: string;
  sampleBarcode?: string;
  sampleType?: string;
  collectionTime?: string;
  collectorName?: string;
  analyzer?: string;
  processingStartTime?: string;
  processingEndTime?: string;
}

interface TestResult {
  id: string;
  requestId: string;
  requestCode: string;
  patientName: string;
  patientCode: string;
  testName: string;
  parameters: TestParameter[];
  status: number; // 0: Pending, 1: Entered, 2: Approved
  enteredBy?: string;
  enteredTime?: string;
  approvedBy?: string;
  approvedTime?: string;
  notes?: string;
}

interface TestParameter {
  id: string;
  name: string;
  value: string | number | null;
  unit: string;
  referenceRange: string;
  normalMin?: number;
  normalMax?: number;
  criticalLow?: number;
  criticalHigh?: number;
  status: 'normal' | 'high' | 'low' | 'critical' | null;
  previousValue?: string | number;
  inputType: 'number' | 'text';
}

// No mock data - using real API

const Laboratory: React.FC = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [labRequests, setLabRequests] = useState<LabRequest[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<LabRequest | null>(null);
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [isResultEntryModalOpen, setIsResultEntryModalOpen] = useState(false);
  const [isResultViewModalOpen, setIsResultViewModalOpen] = useState(false);
  const [collectionForm] = Form.useForm();
  const [_resultForm] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch data from API
  const fetchLabRequests = async () => {
    setLoading(true);
    try {
      const response = await laboratoryApi.getLabRequests({ search: searchText || undefined });
      const data = (response as any)?.data || response;
      if (data && Array.isArray(data)) {
        setLabRequests(data);
      }
    } catch (error) {
      console.error('Error fetching lab requests:', error);
      message.error('Không thể tải danh sách yêu cầu xét nghiệm');
    } finally {
      setLoading(false);
    }
  };

  const fetchTestResults = async () => {
    try {
      const response = await laboratoryApi.getTestResults({ search: searchText || undefined });
      const data = (response as any)?.data || response;
      if (data && Array.isArray(data)) {
        setTestResults(data);
      }
    } catch (error) {
      console.error('Error fetching test results:', error);
    }
  };

  // Load data on mount
  useEffect(() => {
    fetchLabRequests();
    fetchTestResults();
  }, []);

  // Reload when search text changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLabRequests();
      fetchTestResults();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Get priority tag
  const getPriorityBadge = (priority: number) => {
    switch (priority) {
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

  // Get status tag
  const getStatusTag = (status: number) => {
    switch (status) {
      case 0:
        return <Tag color="orange" icon={<ClockCircleOutlined />}>Chờ lấy mẫu</Tag>;
      case 1:
        return <Tag color="blue" icon={<BarcodeOutlined />}>Đã lấy mẫu</Tag>;
      case 2:
        return <Tag color="purple" icon={<ExperimentOutlined />}>Đang xử lý</Tag>;
      case 3:
        return <Tag color="cyan" icon={<FileSearchOutlined />}>Đã nhập KQ</Tag>;
      case 4:
        return <Tag color="green" icon={<CheckCircleOutlined />}>Đã duyệt</Tag>;
      default:
        return <Tag>Không xác định</Tag>;
    }
  };

  // Get parameter status
  const getParameterStatus = (param: TestParameter): 'normal' | 'high' | 'low' | 'critical' | null => {
    if (param.value === null || param.value === '') return null;

    const numValue = typeof param.value === 'number' ? param.value : parseFloat(param.value as string);
    if (isNaN(numValue)) return null;

    if (param.criticalLow !== undefined && numValue < param.criticalLow) return 'critical';
    if (param.criticalHigh !== undefined && numValue > param.criticalHigh) return 'critical';
    if (param.normalMin !== undefined && numValue < param.normalMin) return 'low';
    if (param.normalMax !== undefined && numValue > param.normalMax) return 'high';

    return 'normal';
  };

  // Get parameter color
  const getParameterColor = (status: 'normal' | 'high' | 'low' | 'critical' | null) => {
    switch (status) {
      case 'normal':
        return '#52c41a';
      case 'high':
        return '#faad14';
      case 'low':
        return '#1890ff';
      case 'critical':
        return '#f5222d';
      default:
        return '#000000';
    }
  };

  // Handle sample collection
  const handleCollectSample = (record: LabRequest) => {
    setSelectedRequest(record);
    collectionForm.setFieldsValue({
      sampleType: record.requestedTests[0],
      collectionTime: dayjs(),
      collectorName: 'Điều dưỡng Nguyễn D',
    });
    setIsCollectionModalOpen(true);
  };

  const handleCollectionSubmit = async () => {
    try {
      const values = await collectionForm.validateFields();

      if (!selectedRequest) return;

      // Call API to collect sample
      const collectData = {
        sampleType: values.sampleType,
        collectionTime: values.collectionTime.format('YYYY-MM-DDTHH:mm:ss'),
        collectorName: values.collectorName,
        notes: values.notes,
      };

      const result = await laboratoryApi.collectSample(selectedRequest.id, collectData);

      // Update local state with API response
      setLabRequests(prev =>
        prev.map(req =>
          req.id === selectedRequest.id
            ? {
                ...req,
                status: 1,
                sampleBarcode: result?.sampleBarcode || `BC${dayjs().format('YYMMDD')}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
                sampleType: values.sampleType,
                collectionTime: values.collectionTime.format('YYYY-MM-DDTHH:mm:ss'),
                collectorName: values.collectorName,
              }
            : req
        )
      );

      message.success(`Đã lấy mẫu thành công!`);
      setIsCollectionModalOpen(false);
      collectionForm.resetFields();
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error collecting sample:', error);
      message.error('Có lỗi xảy ra khi lấy mẫu. Vui lòng thử lại.');
    }
  };

  // Handle start processing
  const handleStartProcessing = async (record: LabRequest) => {
    try {
      const processData = {
        startTime: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
        analyzer: 'Máy xét nghiệm tự động',
      };

      await laboratoryApi.startProcessing(record.id, processData);

      setLabRequests(prev =>
        prev.map(req =>
          req.id === record.id
            ? {
                ...req,
                status: 2,
                processingStartTime: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
              }
            : req
        )
      );
      message.success('Đã bắt đầu xử lý mẫu');
    } catch (error) {
      console.error('Error starting processing:', error);
      message.error('Có lỗi xảy ra khi bắt đầu xử lý mẫu');
    }
  };

  // Handle complete processing
  const handleCompleteProcessing = async (record: LabRequest) => {
    try {
      await laboratoryApi.completeProcessing(record.id);

      setLabRequests(prev =>
        prev.map(req =>
          req.id === record.id
            ? {
                ...req,
                status: 3,
                processingEndTime: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
              }
            : req
        )
      );
      message.success('Đã hoàn thành xử lý mẫu');
    } catch (error) {
      console.error('Error completing processing:', error);
      message.error('Có lỗi xảy ra khi hoàn thành xử lý mẫu');
    }
  };

  // Handle result entry
  const handleEnterResults = (record: LabRequest) => {
    setSelectedRequest(record);

    // Find or create test result
    let result = testResults.find(r => r.requestId === record.id);
    if (!result) {
      result = {
        id: `result_${record.id}`,
        requestId: record.id,
        requestCode: record.requestCode,
        patientName: record.patientName,
        patientCode: record.patientCode,
        testName: record.requestedTests[0],
        status: 0,
        parameters: [], // Parameters will be loaded from API
      };
      setTestResults(prev => [...prev, result!]);
    }

    setSelectedResult(result);
    setIsResultEntryModalOpen(true);
  };

  // Handle save results
  const handleSaveResults = async (parameters: TestParameter[]) => {
    if (!selectedResult || !selectedRequest) return;

    try {
      // Call API to save results
      const saveData = {
        parameters,
        notes: selectedResult.notes,
      };

      await laboratoryApi.saveTestResults(selectedRequest.id, saveData);

      // Check for critical values
      const criticalParams = parameters.filter(p => p.status === 'critical');

      setTestResults(prev =>
        prev.map(result =>
          result.id === selectedResult.id
            ? {
                ...result,
                parameters,
                status: 1,
                enteredBy: 'KTV. Nguyễn Văn X',
                enteredTime: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
              }
            : result
        )
      );

      if (criticalParams.length > 0) {
        Modal.warning({
          title: 'Cảnh báo giá trị nguy hiểm',
          content: (
            <div>
              <p>Phát hiện các giá trị nguy hiểm:</p>
              <ul>
                {criticalParams.map(p => (
                  <li key={p.id}>
                    <strong>{p.name}</strong>: {p.value} {p.unit}
                  </li>
                ))}
              </ul>
              <p>Vui lòng thông báo ngay cho bác sĩ điều trị!</p>
            </div>
          ),
        });
      }

      message.success('Đã lưu kết quả xét nghiệm');
      setIsResultEntryModalOpen(false);
      setSelectedResult(null);
    } catch (error) {
      console.error('Error saving results:', error);
      message.error('Có lỗi xảy ra khi lưu kết quả. Vui lòng thử lại.');
    }
  };

  // Handle approve results
  const handleApproveResults = (result: TestResult) => {
    Modal.confirm({
      title: 'Xác nhận duyệt kết quả',
      content: `Bạn có chắc chắn muốn duyệt kết quả xét nghiệm ${result.requestCode}?`,
      onOk: async () => {
        try {
          // Call API to approve results
          const approveData = {
            approvedBy: 'BS. Lê Thị Y',
            approvedTime: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
          };

          await laboratoryApi.approveTestResults(result.id, approveData);

          setTestResults(prev =>
            prev.map(r =>
              r.id === result.id
                ? {
                    ...r,
                    status: 2,
                    approvedBy: 'BS. Lê Thị Y',
                    approvedTime: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
                  }
                : r
            )
          );

          setLabRequests(prev =>
            prev.map(req =>
              req.id === result.requestId
                ? { ...req, status: 4 }
                : req
            )
          );

          message.success('Đã duyệt kết quả xét nghiệm');
        } catch (error) {
          console.error('Error approving results:', error);
          message.error('Có lỗi xảy ra khi duyệt kết quả. Vui lòng thử lại.');
        }
      },
    });
  };

  // Handle print result
  const handlePrintResult = (result: TestResult) => {
    message.info(`In kết quả xét nghiệm ${result.requestCode}`);
  };

  // Pending Requests columns
  const pendingColumns: ColumnsType<LabRequest> = [
    {
      title: 'Mã phiếu',
      dataIndex: 'requestCode',
      key: 'requestCode',
      width: 120,
      fixed: 'left',
    },
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
      title: 'Xét nghiệm',
      dataIndex: 'requestedTests',
      key: 'requestedTests',
      width: 200,
      render: (tests: string[]) => (
        <div>
          {tests.map((test, idx) => (
            <Tag key={idx} color="blue" style={{ marginBottom: 4 }}>
              {test}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: 'Độ ưu tiên',
      dataIndex: 'priority',
      key: 'priority',
      width: 130,
      render: (priority) => getPriorityBadge(priority),
      sorter: (a, b) => b.priority - a.priority,
    },
    {
      title: 'Ngày chỉ định',
      dataIndex: 'requestDate',
      key: 'requestDate',
      width: 150,
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Khoa/Phòng',
      dataIndex: 'departmentName',
      key: 'departmentName',
      width: 120,
    },
    {
      title: 'Bác sĩ',
      dataIndex: 'doctorName',
      key: 'doctorName',
      width: 130,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<BarcodeOutlined />}
          onClick={() => handleCollectSample(record)}
        >
          Lấy mẫu
        </Button>
      ),
    },
  ];

  // Sample Collection columns
  const collectionColumns: ColumnsType<LabRequest> = [
    {
      title: 'Mã phiếu',
      dataIndex: 'requestCode',
      key: 'requestCode',
      width: 120,
      fixed: 'left',
    },
    {
      title: 'Mã barcode',
      dataIndex: 'sampleBarcode',
      key: 'sampleBarcode',
      width: 130,
      render: (barcode) => (
        <Text strong code>
          {barcode}
        </Text>
      ),
    },
    {
      title: 'Họ tên',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 150,
    },
    {
      title: 'Loại mẫu',
      dataIndex: 'sampleType',
      key: 'sampleType',
      width: 150,
    },
    {
      title: 'Thời gian lấy',
      dataIndex: 'collectionTime',
      key: 'collectionTime',
      width: 150,
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Người lấy',
      dataIndex: 'collectorName',
      key: 'collectorName',
      width: 150,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<PrinterOutlined />}
            onClick={() => message.info(`In nhãn barcode ${record.sampleBarcode}`)}
          >
            In nhãn
          </Button>
        </Space>
      ),
    },
  ];

  // Processing columns
  const processingColumns: ColumnsType<LabRequest> = [
    {
      title: 'Mã barcode',
      dataIndex: 'sampleBarcode',
      key: 'sampleBarcode',
      width: 130,
      fixed: 'left',
      render: (barcode) => (
        <Text strong code>
          {barcode}
        </Text>
      ),
    },
    {
      title: 'Mã phiếu',
      dataIndex: 'requestCode',
      key: 'requestCode',
      width: 120,
    },
    {
      title: 'Họ tên',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 150,
    },
    {
      title: 'Xét nghiệm',
      dataIndex: 'requestedTests',
      key: 'requestedTests',
      width: 180,
      render: (tests: string[]) => tests.join(', '),
    },
    {
      title: 'Máy xét nghiệm',
      dataIndex: 'analyzer',
      key: 'analyzer',
      width: 180,
    },
    {
      title: 'Thời gian bắt đầu',
      dataIndex: 'processingStartTime',
      key: 'processingStartTime',
      width: 150,
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {record.status === 1 && (
            <Button
              type="primary"
              size="small"
              icon={<ExperimentOutlined />}
              onClick={() => handleStartProcessing(record)}
            >
              Bắt đầu
            </Button>
          )}
          {record.status === 2 && (
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleCompleteProcessing(record)}
            >
              Hoàn thành
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // Results Entry columns
  const resultsEntryColumns: ColumnsType<LabRequest> = [
    {
      title: 'Mã phiếu',
      dataIndex: 'requestCode',
      key: 'requestCode',
      width: 120,
      fixed: 'left',
    },
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
      title: 'Xét nghiệm',
      dataIndex: 'requestedTests',
      key: 'requestedTests',
      width: 180,
      render: (tests: string[]) => tests.join(', '),
    },
    {
      title: 'Thời gian xử lý',
      dataIndex: 'processingEndTime',
      key: 'processingEndTime',
      width: 150,
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<FileSearchOutlined />}
          onClick={() => handleEnterResults(record)}
        >
          Nhập KQ
        </Button>
      ),
    },
  ];

  // Approved Results columns
  const approvedColumns: ColumnsType<TestResult> = [
    {
      title: 'Mã phiếu',
      dataIndex: 'requestCode',
      key: 'requestCode',
      width: 120,
      fixed: 'left',
    },
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
      title: 'Xét nghiệm',
      dataIndex: 'testName',
      key: 'testName',
      width: 180,
    },
    {
      title: 'Người nhập',
      dataIndex: 'enteredBy',
      key: 'enteredBy',
      width: 130,
    },
    {
      title: 'Thời gian nhập',
      dataIndex: 'enteredTime',
      key: 'enteredTime',
      width: 150,
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => {
        if (status === 1) return <Tag color="cyan">Đã nhập KQ</Tag>;
        if (status === 2) return <Tag color="green" icon={<CheckCircleOutlined />}>Đã duyệt</Tag>;
        return <Tag>Chưa nhập</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {record.status === 1 && (
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleApproveResults(record)}
            >
              Duyệt
            </Button>
          )}
          {record.status === 2 && (
            <>
              <Button
                size="small"
                icon={<FileSearchOutlined />}
                onClick={() => {
                  setSelectedResult(record);
                  setIsResultViewModalOpen(true);
                }}
              >
                Xem
              </Button>
              <Button
                size="small"
                icon={<PrinterOutlined />}
                onClick={() => handlePrintResult(record)}
              >
                In
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  // Filter data by status
  const pendingRequests = labRequests.filter(r => r.status === 0);
  const collectedSamples = labRequests.filter(r => r.status === 1);
  const processingSamples = labRequests.filter(r => r.status === 1 || r.status === 2);
  const readyForResults = labRequests.filter(r => r.status === 3);
  const enteredResults = testResults.filter(r => r.status === 1 || r.status === 2);

  return (
    <div>
      <Title level={4}>Quản lý Xét nghiệm</Title>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'pending',
              label: (
                <span>
                  <ClockCircleOutlined />
                  Chờ lấy mẫu
                  {pendingRequests.length > 0 && (
                    <Badge count={pendingRequests.length} style={{ marginLeft: 8 }} />
                  )}
                </span>
              ),
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col flex="auto">
                      <Search
                        placeholder="Tìm theo mã phiếu, mã BN, tên bệnh nhân..."
                        allowClear
                        enterButton={<SearchOutlined />}
                        style={{ maxWidth: 400 }}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                      />
                    </Col>
                    <Col>
                      <Button icon={<ReloadOutlined />} onClick={() => message.info('Đã làm mới danh sách')}>
                        Làm mới
                      </Button>
                    </Col>
                  </Row>

                  <Table
                    columns={pendingColumns}
                    dataSource={pendingRequests}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1400 }}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} phiếu`,
                    }}
                  />
                </>
              ),
            },
            {
              key: 'collection',
              label: (
                <span>
                  <BarcodeOutlined />
                  Đã lấy mẫu
                  {collectedSamples.length > 0 && (
                    <Badge count={collectedSamples.length} style={{ marginLeft: 8 }} />
                  )}
                </span>
              ),
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col flex="auto">
                      <Search
                        placeholder="Tìm theo mã barcode, mã phiếu..."
                        allowClear
                        enterButton={<SearchOutlined />}
                        style={{ maxWidth: 400 }}
                      />
                    </Col>
                  </Row>

                  <Table
                    columns={collectionColumns}
                    dataSource={collectedSamples}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1200 }}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} mẫu`,
                    }}
                  />
                </>
              ),
            },
            {
              key: 'processing',
              label: (
                <span>
                  <ExperimentOutlined />
                  Đang xử lý
                  {processingSamples.length > 0 && (
                    <Badge count={processingSamples.length} style={{ marginLeft: 8 }} />
                  )}
                </span>
              ),
              children: (
                <>
                  <Alert
                    message="Lưu ý"
                    description="Gán mẫu cho máy xét nghiệm phù hợp và theo dõi quá trình xử lý"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />

                  <Table
                    columns={processingColumns}
                    dataSource={processingSamples}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1300 }}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} mẫu`,
                    }}
                  />
                </>
              ),
            },
            {
              key: 'results',
              label: (
                <span>
                  <FileSearchOutlined />
                  Nhập kết quả
                  {readyForResults.length > 0 && (
                    <Badge count={readyForResults.length} style={{ marginLeft: 8 }} />
                  )}
                </span>
              ),
              children: (
                <>
                  <Alert
                    message="Nhập kết quả xét nghiệm"
                    description="Nhập kết quả từ máy xét nghiệm hoặc nhập thủ công. Hệ thống sẽ tự động kiểm tra và cảnh báo các giá trị bất thường."
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />

                  <Table
                    columns={resultsEntryColumns}
                    dataSource={readyForResults}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1200 }}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} phiếu`,
                    }}
                  />
                </>
              ),
            },
            {
              key: 'approved',
              label: (
                <span>
                  <CheckCircleOutlined />
                  Kết quả đã duyệt
                  {enteredResults.filter(r => r.status === 2).length > 0 && (
                    <Badge count={enteredResults.filter(r => r.status === 2).length} style={{ marginLeft: 8 }} />
                  )}
                </span>
              ),
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col flex="auto">
                      <Search
                        placeholder="Tìm theo mã phiếu, mã BN..."
                        allowClear
                        enterButton={<SearchOutlined />}
                        style={{ maxWidth: 400 }}
                      />
                    </Col>
                  </Row>

                  <Table
                    columns={approvedColumns}
                    dataSource={enteredResults}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1300 }}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} kết quả`,
                    }}
                  />
                </>
              ),
            },
          ]}
        />
      </Card>

      {/* Sample Collection Modal */}
      <Modal
        title={
          <Space>
            <BarcodeOutlined />
            <span>Lấy mẫu xét nghiệm</span>
          </Space>
        }
        open={isCollectionModalOpen}
        onOk={handleCollectionSubmit}
        onCancel={() => {
          setIsCollectionModalOpen(false);
          collectionForm.resetFields();
          setSelectedRequest(null);
        }}
        width={700}
        okText="Lưu"
        cancelText="Hủy"
      >
        {selectedRequest && (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Mã phiếu">{selectedRequest.requestCode}</Descriptions.Item>
              <Descriptions.Item label="Mã BN">{selectedRequest.patientCode}</Descriptions.Item>
              <Descriptions.Item label="Họ tên">{selectedRequest.patientName}</Descriptions.Item>
              <Descriptions.Item label="Ngày sinh">
                {selectedRequest.dateOfBirth ? dayjs(selectedRequest.dateOfBirth).format('DD/MM/YYYY') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Xét nghiệm" span={2}>
                {selectedRequest.requestedTests.map((test, idx) => (
                  <Tag key={idx} color="blue">
                    {test}
                  </Tag>
                ))}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Form form={collectionForm} layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="sampleType"
                    label="Loại mẫu"
                    rules={[{ required: true, message: 'Vui lòng chọn loại mẫu' }]}
                  >
                    <Select placeholder="Chọn loại mẫu">
                      <Select.Option value="Máu tĩnh mạch">Máu tĩnh mạch</Select.Option>
                      <Select.Option value="Máu mao mạch">Máu mao mạch</Select.Option>
                      <Select.Option value="Nước tiểu">Nước tiểu</Select.Option>
                      <Select.Option value="Phân">Phân</Select.Option>
                      <Select.Option value="Dịch não tủy">Dịch não tủy</Select.Option>
                      <Select.Option value="Khác">Khác</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="collectionTime"
                    label="Thời gian lấy mẫu"
                    rules={[{ required: true, message: 'Vui lòng chọn thời gian' }]}
                  >
                    <DatePicker
                      showTime
                      format="DD/MM/YYYY HH:mm"
                      style={{ width: '100%' }}
                      placeholder="Chọn thời gian"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="collectorName"
                label="Người lấy mẫu"
                rules={[{ required: true, message: 'Vui lòng nhập tên người lấy mẫu' }]}
              >
                <Input placeholder="Nhập tên người lấy mẫu" />
              </Form.Item>

              <Form.Item name="notes" label="Ghi chú">
                <TextArea rows={3} placeholder="Nhập ghi chú (nếu có)" />
              </Form.Item>

              <Alert
                message="Mã barcode sẽ được tự động tạo sau khi lưu"
                type="info"
                showIcon
              />
            </Form>
          </>
        )}
      </Modal>

      {/* Result Entry Modal */}
      <Modal
        title={
          <Space>
            <FileSearchOutlined />
            <span>Nhập kết quả xét nghiệm</span>
          </Space>
        }
        open={isResultEntryModalOpen}
        onOk={() => {
          if (selectedResult) {
            handleSaveResults(selectedResult.parameters);
          }
        }}
        onCancel={() => {
          setIsResultEntryModalOpen(false);
          setSelectedResult(null);
        }}
        width={900}
        okText="Lưu kết quả"
        cancelText="Hủy"
      >
        {selectedResult && selectedRequest && (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Mã phiếu">{selectedRequest.requestCode}</Descriptions.Item>
              <Descriptions.Item label="Mã BN">{selectedRequest.patientCode}</Descriptions.Item>
              <Descriptions.Item label="Họ tên">{selectedRequest.patientName}</Descriptions.Item>
              <Descriptions.Item label="Ngày sinh">
                {selectedRequest.dateOfBirth ? dayjs(selectedRequest.dateOfBirth).format('DD/MM/YYYY') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Xét nghiệm" span={2}>
                <Tag color="blue">{selectedResult.testName}</Tag>
              </Descriptions.Item>
            </Descriptions>

            <Divider>Kết quả xét nghiệm</Divider>

            <Table
              dataSource={selectedResult.parameters}
              rowKey="id"
              pagination={false}
              size="small"
              columns={[
                {
                  title: 'Chỉ số',
                  dataIndex: 'name',
                  key: 'name',
                  width: 200,
                },
                {
                  title: 'Giá trị',
                  dataIndex: 'value',
                  key: 'value',
                  width: 150,
                  render: (_, record, index) => {
                    const status = getParameterStatus(record);
                    const color = getParameterColor(status);

                    return (
                      <div>
                        {record.inputType === 'number' ? (
                          <InputNumber
                            value={record.value as number}
                            onChange={(value) => {
                              const newParams = [...selectedResult.parameters];
                              newParams[index].value = value;
                              newParams[index].status = getParameterStatus({
                                ...record,
                                value,
                              });
                              setSelectedResult({
                                ...selectedResult,
                                parameters: newParams,
                              });
                            }}
                            style={{
                              width: '100%',
                              color: color,
                              fontWeight: status === 'critical' ? 'bold' : 'normal',
                            }}
                            placeholder="Nhập giá trị"
                          />
                        ) : (
                          <Input
                            value={record.value as string}
                            onChange={(e) => {
                              const newParams = [...selectedResult.parameters];
                              newParams[index].value = e.target.value;
                              setSelectedResult({
                                ...selectedResult,
                                parameters: newParams,
                              });
                            }}
                            placeholder="Nhập kết quả"
                          />
                        )}
                      </div>
                    );
                  },
                },
                {
                  title: 'Đơn vị',
                  dataIndex: 'unit',
                  key: 'unit',
                  width: 80,
                },
                {
                  title: 'Giá trị tham chiếu',
                  dataIndex: 'referenceRange',
                  key: 'referenceRange',
                  width: 150,
                },
                {
                  title: 'KQ trước',
                  dataIndex: 'previousValue',
                  key: 'previousValue',
                  width: 100,
                  render: (value, record) =>
                    value ? (
                      <Tooltip title="Kết quả lần xét nghiệm trước">
                        <Text type="secondary">
                          {value} {record.unit}
                        </Text>
                      </Tooltip>
                    ) : (
                      '-'
                    ),
                },
                {
                  title: 'Trạng thái',
                  key: 'status',
                  width: 120,
                  render: (_, record) => {
                    const status = getParameterStatus(record);
                    if (!status) return '-';

                    const statusConfig = {
                      normal: { color: 'success', text: 'Bình thường', icon: <CheckCircleOutlined /> },
                      high: { color: 'warning', text: 'Cao', icon: <WarningOutlined /> },
                      low: { color: 'processing', text: 'Thấp', icon: <WarningOutlined /> },
                      critical: { color: 'error', text: 'Nguy hiểm', icon: <WarningOutlined /> },
                    };

                    const config = statusConfig[status];
                    return (
                      <Tag color={config.color} icon={config.icon}>
                        {config.text}
                      </Tag>
                    );
                  },
                },
              ]}
            />

            <Divider />

            <Form.Item label="Ghi chú">
              <TextArea
                rows={3}
                placeholder="Nhập ghi chú về kết quả xét nghiệm (nếu có)"
                value={selectedResult.notes}
                onChange={(e) =>
                  setSelectedResult({
                    ...selectedResult,
                    notes: e.target.value,
                  })
                }
              />
            </Form.Item>

            <Alert
              message="Hệ thống sẽ tự động kiểm tra và cảnh báo các giá trị bất thường khi lưu kết quả"
              type="warning"
              showIcon
            />
          </>
        )}
      </Modal>

      {/* Result View Modal */}
      <Modal
        title={
          <Space>
            <FileSearchOutlined />
            <span>Xem kết quả xét nghiệm</span>
          </Space>
        }
        open={isResultViewModalOpen}
        onCancel={() => {
          setIsResultViewModalOpen(false);
          setSelectedResult(null);
        }}
        width={900}
        footer={[
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => selectedResult && handlePrintResult(selectedResult)}>
            In kết quả
          </Button>,
          <Button key="close" onClick={() => setIsResultViewModalOpen(false)}>
            Đóng
          </Button>,
        ]}
      >
        {selectedResult && (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Mã phiếu">{selectedResult.requestCode}</Descriptions.Item>
              <Descriptions.Item label="Mã BN">{selectedResult.patientCode}</Descriptions.Item>
              <Descriptions.Item label="Họ tên">{selectedResult.patientName}</Descriptions.Item>
              <Descriptions.Item label="Xét nghiệm">
                <Tag color="blue">{selectedResult.testName}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Người nhập KQ">{selectedResult.enteredBy}</Descriptions.Item>
              <Descriptions.Item label="Thời gian nhập">
                {selectedResult.enteredTime ? dayjs(selectedResult.enteredTime).format('DD/MM/YYYY HH:mm') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Người duyệt">{selectedResult.approvedBy || '-'}</Descriptions.Item>
              <Descriptions.Item label="Thời gian duyệt">
                {selectedResult.approvedTime ? dayjs(selectedResult.approvedTime).format('DD/MM/YYYY HH:mm') : '-'}
              </Descriptions.Item>
            </Descriptions>

            <Divider>Kết quả xét nghiệm</Divider>

            <Table
              dataSource={selectedResult.parameters}
              rowKey="id"
              pagination={false}
              size="small"
              columns={[
                {
                  title: 'Chỉ số',
                  dataIndex: 'name',
                  key: 'name',
                  width: 200,
                },
                {
                  title: 'Giá trị',
                  dataIndex: 'value',
                  key: 'value',
                  width: 150,
                  render: (value, record) => {
                    const status = getParameterStatus(record);
                    const color = getParameterColor(status);
                    return (
                      <Text
                        strong
                        style={{
                          color: color,
                          fontSize: status === 'critical' ? 16 : 14,
                          fontWeight: status === 'critical' ? 'bold' : 'normal',
                        }}
                      >
                        {value || '-'}
                      </Text>
                    );
                  },
                },
                {
                  title: 'Đơn vị',
                  dataIndex: 'unit',
                  key: 'unit',
                  width: 80,
                },
                {
                  title: 'Giá trị tham chiếu',
                  dataIndex: 'referenceRange',
                  key: 'referenceRange',
                  width: 150,
                },
                {
                  title: 'Trạng thái',
                  key: 'status',
                  width: 120,
                  render: (_, record) => {
                    const status = getParameterStatus(record);
                    if (!status) return '-';

                    const statusConfig = {
                      normal: { color: 'success', text: 'Bình thường', icon: <CheckCircleOutlined /> },
                      high: { color: 'warning', text: 'Cao', icon: <WarningOutlined /> },
                      low: { color: 'processing', text: 'Thấp', icon: <WarningOutlined /> },
                      critical: { color: 'error', text: 'Nguy hiểm', icon: <WarningOutlined /> },
                    };

                    const config = statusConfig[status];
                    return (
                      <Tag color={config.color} icon={config.icon}>
                        {config.text}
                      </Tag>
                    );
                  },
                },
              ]}
            />

            {selectedResult.notes && (
              <>
                <Divider>Ghi chú</Divider>
                <Text>{selectedResult.notes}</Text>
              </>
            )}

            <Divider>Lịch sử</Divider>
            <Timeline
              items={[
                {
                  color: 'blue',
                  children: (
                    <>
                      <Text strong>Yêu cầu xét nghiệm</Text>
                      <br />
                      <Text type="secondary">BS. Trần Văn B - 30/01/2026 08:00</Text>
                    </>
                  ),
                },
                {
                  color: 'green',
                  children: (
                    <>
                      <Text strong>Lấy mẫu</Text>
                      <br />
                      <Text type="secondary">ĐD. Nguyễn D - 30/01/2026 08:30</Text>
                    </>
                  ),
                },
                {
                  color: 'purple',
                  children: (
                    <>
                      <Text strong>Xử lý mẫu</Text>
                      <br />
                      <Text type="secondary">KTV. Nguyễn Văn X - 30/01/2026 09:00</Text>
                    </>
                  ),
                },
                selectedResult.enteredTime && {
                  color: 'cyan',
                  children: (
                    <>
                      <Text strong>Nhập kết quả</Text>
                      <br />
                      <Text type="secondary">
                        {selectedResult.enteredBy} -{' '}
                        {dayjs(selectedResult.enteredTime).format('DD/MM/YYYY HH:mm')}
                      </Text>
                    </>
                  ),
                },
                selectedResult.approvedTime && {
                  color: 'green',
                  children: (
                    <>
                      <Text strong>Duyệt kết quả</Text>
                      <br />
                      <Text type="secondary">
                        {selectedResult.approvedBy} -{' '}
                        {dayjs(selectedResult.approvedTime).format('DD/MM/YYYY HH:mm')}
                      </Text>
                    </>
                  ),
                },
              ].filter(Boolean) as any}
            />
          </>
        )}
      </Modal>
    </div>
  );
};

export default Laboratory;
