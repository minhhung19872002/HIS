import React, { useState, useEffect, useCallback } from 'react';
import { HOSPITAL_NAME } from '../constants/hospital';
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Typography,
  Tabs,
  Statistic,
  Descriptions,
  Divider,
  message,
  Badge,
  Spin,
} from 'antd';
import {
  ToolOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
  PrinterOutlined,
  PlusOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  getEquipment,
  getMaintenanceSchedules,
  getRepairRequests,
  getDashboard,
  createRepairRequest,
  createMaintenanceRecord,
  type EquipmentDto,
  type MaintenanceScheduleDto,
  type RepairRequestDto,
  type EquipmentDashboardDto,
} from '../api/equipment';

const { Title, Text } = Typography;
const { TextArea } = Input;

const Equipment: React.FC = () => {
  const [equipmentList, setEquipmentList] = useState<EquipmentDto[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceScheduleDto[]>([]);
  const [repairList, setRepairList] = useState<RepairRequestDto[]>([]);
  const [dashboard, setDashboard] = useState<EquipmentDashboardDto | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentDto | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isRepairModalOpen, setIsRepairModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [repairForm] = Form.useForm();
  const [maintenanceForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [eqRes, maintRes, repairRes, dashRes] = await Promise.allSettled([
        getEquipment({}),
        getMaintenanceSchedules(undefined, 90),
        getRepairRequests(),
        getDashboard(dayjs().format('YYYY-MM-DD')),
      ]);
      if (eqRes.status === 'fulfilled') {
        const data = eqRes.value.data;
        setEquipmentList(Array.isArray(data) ? data : (data as any)?.items || []);
      }
      if (maintRes.status === 'fulfilled') setMaintenanceRecords(eqRes.status === 'fulfilled' ? maintRes.value.data || [] : []);
      if (repairRes.status === 'fulfilled') setRepairList(repairRes.value.data || []);
      if (dashRes.status === 'fulfilled') setDashboard(dashRes.value.data);
    } catch {
      message.warning('Không thể tải dữ liệu trang thiết bị');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Statistics from dashboard or calculated from lists
  const activeEquipment = dashboard?.operationalEquipment ?? equipmentList.filter(e => e.operationalStatus === 1).length;
  const maintenanceDue = dashboard?.maintenanceOverdue ?? maintenanceRecords.filter(m => m.status === 1 || m.status === 2).length;
  const pendingRepairs = dashboard?.openRepairRequests ?? repairList.filter(r => r.status < 4).length;

  const getStatusTag = (status: number) => {
    const config: Record<number, { color: string; text: string }> = {
      1: { color: 'green', text: 'Hoạt động' },
      2: { color: 'blue', text: 'Bảo trì' },
      3: { color: 'red', text: 'Ngừng hoạt động' },
      4: { color: 'default', text: 'Thanh lý' },
    };
    const c = config[status] || { color: 'default', text: `Status ${status}` };
    return <Tag color={c.color}>{c.text}</Tag>;
  };

  const getRiskClassTag = (riskClass: string) => {
    const config: Record<string, { color: string; text: string }> = {
      'I': { color: 'default', text: 'Loại I' },
      'II': { color: 'blue', text: 'Loại II' },
      'III': { color: 'orange', text: 'Loại III' },
      'A': { color: 'red', text: 'Loại A' },
      'B': { color: 'orange', text: 'Loại B' },
      'C': { color: 'blue', text: 'Loại C' },
      'D': { color: 'default', text: 'Loại D' },
    };
    const c = config[riskClass] || { color: 'default', text: riskClass };
    return <Tag color={c.color}>{c.text}</Tag>;
  };

  const handleSubmitRepair = async (values: any) => {
    if (!selectedEquipment) return;
    try {
      await createRepairRequest({
        equipmentId: selectedEquipment.id,
        priority: values.priority,
        problemDescription: values.issueDescription,
        equipmentLocation: selectedEquipment.locationName || selectedEquipment.departmentName,
        contactPerson: values.reportedBy,
      });
      message.success('Đã gửi yêu cầu sửa chữa');
      setIsRepairModalOpen(false);
      repairForm.resetFields();
      fetchData();
    } catch {
      message.warning('Không thể gửi yêu cầu sửa chữa');
    }
  };

  const handleScheduleMaintenance = async (values: any) => {
    try {
      await createMaintenanceRecord({
        equipmentId: values.equipmentId,
        maintenanceType: values.maintenanceType,
        performedDate: values.scheduledDate?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD'),
        description: `Bao tri ${values.maintenanceType === 'preventive' ? 'phòng ngừa' : 'kiểm định'}`,
        workPerformed: values.technician ? `Đơn vị thực hiện: ${values.technician}` : '',
        afterStatus: 1,
      });
      message.success('Đã lên lịch bảo trì');
      setIsMaintenanceModalOpen(false);
      maintenanceForm.resetFields();
      fetchData();
    } catch {
      message.warning('Không thể lên lịch bảo trì');
    }
  };

  const executePrintEquipmentCard = () => {
    if (!selectedEquipment) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Phiếu thiết bị</title>
        <style>
          body { font-family: 'Times New Roman', serif; padding: 20px; max-width: 800px; margin: auto; }
          .header { text-align: center; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: bold; margin: 20px 0; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background: #f0f0f0; width: 30%; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <strong>${HOSPITAL_NAME}</strong><br/>
          Phòng Vật tư - Thiết bị y tế
        </div>
        <div class="title">PHIẾU LÝ LỊCH THIẾT BỊ Y TẾ</div>
        <table>
          <tr><th>Mã thiết bị</th><td>${selectedEquipment.equipmentCode}</td></tr>
          <tr><th>Tên thiết bị</th><td>${selectedEquipment.name}</td></tr>
          <tr><th>Hãng sản xuất</th><td>${selectedEquipment.manufacturer}</td></tr>
          <tr><th>Model</th><td>${selectedEquipment.model}</td></tr>
          <tr><th>Số seri</th><td>${selectedEquipment.serialNumber}</td></tr>
          <tr><th>Khoa/Phòng</th><td>${selectedEquipment.departmentName}</td></tr>
          <tr><th>Vị trí</th><td>${selectedEquipment.locationName || selectedEquipment.roomName || '-'}</td></tr>
          <tr><th>Ngày mua</th><td>${selectedEquipment.purchaseDate || '-'}</td></tr>
          <tr><th>Hạn bảo hành</th><td>${selectedEquipment.warrantyExpiry || 'Hết bảo hành'}</td></tr>
          <tr><th>Nhóm nguy cơ</th><td>${selectedEquipment.riskClass}</td></tr>
          <tr><th>Nguyên giá</th><td>${(selectedEquipment.purchasePrice || 0).toLocaleString('vi-VN')} VND</td></tr>
          <tr><th>Trạng thái</th><td>${selectedEquipment.operationalStatusName}</td></tr>
        </table>
        <div style="margin-top: 50px; text-align: right;">
          <p>Ngay ${dayjs().format('DD/MM/YYYY')}</p>
          <p><strong>Trưởng phòng VTYT</strong></p>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const equipmentColumns: ColumnsType<EquipmentDto> = [
    {
      title: 'Mã TB',
      dataIndex: 'equipmentCode',
      key: 'equipmentCode',
      width: 100,
    },
    {
      title: 'Tên thiết bị',
      key: 'name',
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{record.name}</Text>
          <Text type="secondary">{record.manufacturer} - {record.model}</Text>
        </Space>
      ),
    },
    {
      title: 'Khoa/Phòng',
      dataIndex: 'departmentName',
      key: 'departmentName',
    },
    {
      title: 'Nhóm',
      dataIndex: 'riskClass',
      key: 'riskClass',
      width: 80,
      render: (riskClass) => getRiskClassTag(riskClass),
    },
    {
      title: 'Bảo trì tiếp',
      dataIndex: 'nextMaintenanceDate',
      key: 'nextMaintenanceDate',
      width: 120,
      render: (date) => {
        if (!date) return '-';
        const daysUntil = dayjs(date).diff(dayjs(), 'day');
        const color = daysUntil < 0 ? 'red' : daysUntil < 30 ? 'orange' : 'green';
        return <Tag color={color}>{dayjs(date).format('DD/MM/YYYY')}</Tag>;
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'operationalStatus',
      key: 'operationalStatus',
      width: 120,
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            onClick={() => {
              setSelectedEquipment(record);
              setIsDetailModalOpen(true);
            }}
          >
            Chi tiet
          </Button>
          <Button
            size="small"
            danger
            onClick={() => {
              setSelectedEquipment(record);
              setIsRepairModalOpen(true);
            }}
          >
            Bao hong
          </Button>
        </Space>
      ),
    },
  ];

  const maintenanceColumns: ColumnsType<MaintenanceScheduleDto> = [
    {
      title: 'Thiết bị',
      dataIndex: 'equipmentName',
      key: 'equipmentName',
    },
    {
      title: 'Loại',
      dataIndex: 'maintenanceTypeName',
      key: 'maintenanceTypeName',
    },
    {
      title: 'Ngày đến hạn',
      dataIndex: 'nextDueDate',
      key: 'nextDueDate',
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Đơn vị',
      dataIndex: 'assignedToName',
      key: 'assignedToName',
      render: (name) => name || '-',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'statusName',
      key: 'statusName',
      render: (name, record) => {
        const colorMap: Record<number, string> = { 1: 'blue', 2: 'orange', 3: 'green', 4: 'red' };
        return <Tag color={colorMap[record.status] || 'default'}>{name || `Status ${record.status}`}</Tag>;
      },
    },
  ];

  const repairColumns: ColumnsType<RepairRequestDto> = [
    {
      title: 'Thiết bị',
      dataIndex: 'equipmentName',
      key: 'equipmentName',
    },
    {
      title: 'Khoa',
      dataIndex: 'departmentName',
      key: 'departmentName',
    },
    {
      title: 'Mô tả lỗi',
      dataIndex: 'problemDescription',
      key: 'problemDescription',
      ellipsis: true,
    },
    {
      title: 'Ưu tiên',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority, record) => {
        const colorMap: Record<number, string> = { 1: 'default', 2: 'blue', 3: 'orange', 4: 'red' };
        return <Tag color={colorMap[priority] || 'default'}>{record.priorityName}</Tag>;
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => {
        const colorMap: Record<number, string> = { 1: 'orange', 2: 'blue', 3: 'cyan', 4: 'green', 5: 'default' };
        return <Tag color={colorMap[status] || 'default'}>{record.statusName}</Tag>;
      },
    },
  ];

  return (
    <Spin spinning={loading}>
      <div>
        <Title level={4}>
          Quản lý trang thiết bị y tế
          <Button icon={<ReloadOutlined />} onClick={fetchData} style={{ marginLeft: 12 }} size="small">
            Làm mới
          </Button>
        </Title>

        {/* Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Thiết bị hoạt động"
                value={activeEquipment}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                styles={{ content: { color: '#52c41a' } }}
                suffix={`/ ${dashboard?.totalEquipment ?? equipmentList.length}`}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Cần bảo trì"
                value={maintenanceDue}
                prefix={<CalendarOutlined style={{ color: '#faad14' }} />}
                styles={{ content: { color: '#faad14' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Yêu cầu sửa chữa"
                value={pendingRepairs}
                prefix={<ToolOutlined style={{ color: '#ff4d4f' }} />}
                styles={{ content: { color: '#ff4d4f' } }}
              />
            </Card>
          </Col>
        </Row>

        {/* Main Content */}
        <Card
          extra={
            <Button type="primary" icon={<PlusOutlined />}>
              Thêm thiết bị
            </Button>
          }
        >
          <Tabs
            defaultActiveKey="equipment"
            items={[
              {
                key: 'equipment',
                label: 'Danh sách thiết bị',
                children: (
                  <Table
                    columns={equipmentColumns}
                    dataSource={equipmentList}
                    rowKey="id"
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        setSelectedEquipment(record);
                        setIsDetailModalOpen(true);
                      },
                      style: { cursor: 'pointer' },
                    })}
                  />
                ),
              },
              {
                key: 'maintenance',
                label: (
                  <Badge count={maintenanceDue} offset={[10, 0]}>
                    Lịch bảo trì
                  </Badge>
                ),
                children: (
                  <>
                    <Button
                      type="primary"
                      icon={<CalendarOutlined />}
                      style={{ marginBottom: 16 }}
                      onClick={() => setIsMaintenanceModalOpen(true)}
                    >
                      Lên lịch bảo trì
                    </Button>
                    <Table
                      columns={maintenanceColumns}
                      dataSource={maintenanceRecords}
                      rowKey="id"
                    />
                  </>
                ),
              },
              {
                key: 'repairs',
                label: (
                  <Badge count={pendingRepairs} offset={[10, 0]}>
                    Yêu cầu sửa chữa
                  </Badge>
                ),
                children: (
                  <Table
                    columns={repairColumns}
                    dataSource={repairList}
                    rowKey="id"
                  />
                ),
              },
              {
                key: 'calibration',
                label: 'Kiểm định',
                children: (
                  <div>
                    <Title level={5}>Quy định kiểm định</Title>
                    <ul>
                      <li><strong>Nhom A:</strong> Kiểm định mỗi 1 năm (X-quang, CT, MRI, may gia toc)</li>
                      <li><strong>Nhom B:</strong> Kiểm định mỗi 2 năm</li>
                      <li><strong>Nhom C:</strong> Kiểm định khi cần</li>
                    </ul>
                    <Divider />
                    <Table
                      columns={[
                        { title: 'Thiết bị', dataIndex: 'name', key: 'name' },
                        { title: 'Nhóm', dataIndex: 'riskClass', key: 'riskClass', render: (c: string) => getRiskClassTag(c) },
                        { title: 'Kiểm định gần nhất', dataIndex: 'lastCalibrationDate', key: 'lastCalibrationDate', render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
                        { title: 'Kiểm định tiếp theo', dataIndex: 'nextCalibrationDate', key: 'nextCalibrationDate', render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
                      ]}
                      dataSource={equipmentList.filter((e) => e.riskClass === 'A' || e.riskClass === 'B' || e.riskClass === 'I' || e.riskClass === 'II')}
                      rowKey="id"
                    />
                  </div>
                ),
              },
            ]}
          />
        </Card>

        {/* Detail Modal */}
        <Modal
          title="Chi tiết thiết bị"
          open={isDetailModalOpen}
          onCancel={() => setIsDetailModalOpen(false)}
          footer={[
            <Button key="print" icon={<PrinterOutlined />} onClick={executePrintEquipmentCard}>
              In phiếu
            </Button>,
            <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
              Dong
            </Button>,
          ]}
          width={700}
        >
          {selectedEquipment && (
            <>
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="Ma TB">{selectedEquipment.equipmentCode}</Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  {getStatusTag(selectedEquipment.operationalStatus)}
                </Descriptions.Item>
                <Descriptions.Item label="Ten" span={2}>
                  {selectedEquipment.name}
                </Descriptions.Item>
                <Descriptions.Item label="Hãng SX">{selectedEquipment.manufacturer}</Descriptions.Item>
                <Descriptions.Item label="Model">{selectedEquipment.model}</Descriptions.Item>
                <Descriptions.Item label="Serial">{selectedEquipment.serialNumber}</Descriptions.Item>
                <Descriptions.Item label="Nhom">{getRiskClassTag(selectedEquipment.riskClass)}</Descriptions.Item>
                <Descriptions.Item label="Khoa/Phòng">{selectedEquipment.departmentName}</Descriptions.Item>
                <Descriptions.Item label="Vị trí">{selectedEquipment.locationName || selectedEquipment.roomName || '-'}</Descriptions.Item>
                <Descriptions.Item label="Ngày mua">{selectedEquipment.purchaseDate ? dayjs(selectedEquipment.purchaseDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                <Descriptions.Item label="Bảo hành">{selectedEquipment.warrantyExpiry ? dayjs(selectedEquipment.warrantyExpiry).format('DD/MM/YYYY') : 'Hết'}</Descriptions.Item>
                <Descriptions.Item label="Nguyên giá" span={2}>
                  {(selectedEquipment.purchasePrice || 0).toLocaleString('vi-VN')} VND
                </Descriptions.Item>
              </Descriptions>

              <Divider>Thông tin bảo trì</Divider>

              <Row gutter={16}>
                <Col span={12}>
                  <Card size="small" title="Bao tri">
                    <p><strong>Lần cuối:</strong> {selectedEquipment.lastMaintenanceDate ? dayjs(selectedEquipment.lastMaintenanceDate).format('DD/MM/YYYY') : '-'}</p>
                    <p><strong>Lần tiếp:</strong> {selectedEquipment.nextMaintenanceDate ? dayjs(selectedEquipment.nextMaintenanceDate).format('DD/MM/YYYY') : '-'}</p>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small" title="Kiểm định">
                    <p><strong>Lần cuối:</strong> {selectedEquipment.lastCalibrationDate ? dayjs(selectedEquipment.lastCalibrationDate).format('DD/MM/YYYY') : '-'}</p>
                    <p><strong>Lần tiếp:</strong> {selectedEquipment.nextCalibrationDate ? dayjs(selectedEquipment.nextCalibrationDate).format('DD/MM/YYYY') : '-'}</p>
                  </Card>
                </Col>
              </Row>
            </>
          )}
        </Modal>

        {/* Repair Modal */}
        <Modal
          title="Báo cáo hỏng"
          open={isRepairModalOpen}
          onCancel={() => setIsRepairModalOpen(false)}
          onOk={() => repairForm.submit()}
        >
          <Form form={repairForm} layout="vertical" onFinish={handleSubmitRepair}>
            <Form.Item label="Thiet bi">
              <Input value={selectedEquipment?.name} disabled />
            </Form.Item>
            <Form.Item name="reportedBy" label="Người báo cáo" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="issueDescription" label="Mô tả lỗi" rules={[{ required: true }]}>
              <TextArea rows={3} />
            </Form.Item>
            <Form.Item name="priority" label="Mức độ ưu tiên" rules={[{ required: true }]}>
              <Select>
                <Select.Option value={1}>Thấp</Select.Option>
                <Select.Option value={2}>Trung bình</Select.Option>
                <Select.Option value={3}>Cao</Select.Option>
                <Select.Option value={4}>Khẩn cấp</Select.Option>
              </Select>
            </Form.Item>
          </Form>
        </Modal>

        {/* Maintenance Modal */}
        <Modal
          title="Lên lịch bảo trì"
          open={isMaintenanceModalOpen}
          onCancel={() => setIsMaintenanceModalOpen(false)}
          onOk={() => maintenanceForm.submit()}
        >
          <Form form={maintenanceForm} layout="vertical" onFinish={handleScheduleMaintenance}>
            <Form.Item name="equipmentId" label="Thiet bi" rules={[{ required: true }]}>
              <Select>
                {equipmentList.map((e) => (
                  <Select.Option key={e.id} value={e.id}>
                    {e.equipmentCode} - {e.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="maintenanceType" label="Loại bảo trì" rules={[{ required: true }]}>
              <Select>
                <Select.Option value="Preventive">Bao tri phòng ngừa</Select.Option>
                <Select.Option value="Calibration">Kiểm định</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="scheduledDate" label="Ngày dự kiến" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="technician" label="Đơn vị thực hiện">
              <Input placeholder="VD: Siemens VN, GE Healthcare" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default Equipment;
