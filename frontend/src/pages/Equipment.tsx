import React, { useState, useEffect, useCallback } from 'react';
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
      message.warning('Khong the tai du lieu trang thiet bi');
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
      1: { color: 'green', text: 'Hoat dong' },
      2: { color: 'blue', text: 'Bao tri' },
      3: { color: 'red', text: 'Ngung hoat dong' },
      4: { color: 'default', text: 'Thanh ly' },
    };
    const c = config[status] || { color: 'default', text: `Status ${status}` };
    return <Tag color={c.color}>{c.text}</Tag>;
  };

  const getRiskClassTag = (riskClass: string) => {
    const config: Record<string, { color: string; text: string }> = {
      'I': { color: 'default', text: 'Loai I' },
      'II': { color: 'blue', text: 'Loai II' },
      'III': { color: 'orange', text: 'Loai III' },
      'A': { color: 'red', text: 'Loai A' },
      'B': { color: 'orange', text: 'Loai B' },
      'C': { color: 'blue', text: 'Loai C' },
      'D': { color: 'default', text: 'Loai D' },
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
      message.success('Da gui yeu cau sua chua');
      setIsRepairModalOpen(false);
      repairForm.resetFields();
      fetchData();
    } catch {
      message.warning('Khong the gui yeu cau sua chua');
    }
  };

  const handleScheduleMaintenance = async (values: any) => {
    try {
      await createMaintenanceRecord({
        equipmentId: values.equipmentId,
        maintenanceType: values.maintenanceType,
        performedDate: values.scheduledDate?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD'),
        description: `Bao tri ${values.maintenanceType === 'preventive' ? 'phong ngua' : 'kiem dinh'}`,
        workPerformed: values.technician ? `Don vi thuc hien: ${values.technician}` : '',
        afterStatus: 1,
      });
      message.success('Da len lich bao tri');
      setIsMaintenanceModalOpen(false);
      maintenanceForm.resetFields();
      fetchData();
    } catch {
      message.warning('Khong the len lich bao tri');
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
        <title>Phieu thiet bi</title>
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
          <strong>BENH VIEN DA KHOA</strong><br/>
          Phong Vat tu - Thiet bi y te
        </div>
        <div class="title">PHIEU LY LICH THIET BI Y TE</div>
        <table>
          <tr><th>Ma thiet bi</th><td>${selectedEquipment.equipmentCode}</td></tr>
          <tr><th>Ten thiet bi</th><td>${selectedEquipment.name}</td></tr>
          <tr><th>Hang san xuat</th><td>${selectedEquipment.manufacturer}</td></tr>
          <tr><th>Model</th><td>${selectedEquipment.model}</td></tr>
          <tr><th>So seri</th><td>${selectedEquipment.serialNumber}</td></tr>
          <tr><th>Khoa/Phong</th><td>${selectedEquipment.departmentName}</td></tr>
          <tr><th>Vi tri</th><td>${selectedEquipment.locationName || selectedEquipment.roomName || '-'}</td></tr>
          <tr><th>Ngay mua</th><td>${selectedEquipment.purchaseDate || '-'}</td></tr>
          <tr><th>Han bao hanh</th><td>${selectedEquipment.warrantyExpiry || 'Het bao hanh'}</td></tr>
          <tr><th>Nhom nguy co</th><td>${selectedEquipment.riskClass}</td></tr>
          <tr><th>Nguyen gia</th><td>${(selectedEquipment.purchasePrice || 0).toLocaleString('vi-VN')} VND</td></tr>
          <tr><th>Trang thai</th><td>${selectedEquipment.operationalStatusName}</td></tr>
        </table>
        <div style="margin-top: 50px; text-align: right;">
          <p>Ngay ${dayjs().format('DD/MM/YYYY')}</p>
          <p><strong>Truong phong VTYT</strong></p>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const equipmentColumns: ColumnsType<EquipmentDto> = [
    {
      title: 'Ma TB',
      dataIndex: 'equipmentCode',
      key: 'equipmentCode',
      width: 100,
    },
    {
      title: 'Ten thiet bi',
      key: 'name',
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{record.name}</Text>
          <Text type="secondary">{record.manufacturer} - {record.model}</Text>
        </Space>
      ),
    },
    {
      title: 'Khoa/Phong',
      dataIndex: 'departmentName',
      key: 'departmentName',
    },
    {
      title: 'Nhom',
      dataIndex: 'riskClass',
      key: 'riskClass',
      width: 80,
      render: (riskClass) => getRiskClassTag(riskClass),
    },
    {
      title: 'Bao tri tiep',
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
      title: 'Trang thai',
      dataIndex: 'operationalStatus',
      key: 'operationalStatus',
      width: 120,
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Thao tac',
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
      title: 'Thiet bi',
      dataIndex: 'equipmentName',
      key: 'equipmentName',
    },
    {
      title: 'Loai',
      dataIndex: 'maintenanceTypeName',
      key: 'maintenanceTypeName',
    },
    {
      title: 'Ngay den han',
      dataIndex: 'nextDueDate',
      key: 'nextDueDate',
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Don vi',
      dataIndex: 'assignedToName',
      key: 'assignedToName',
      render: (name) => name || '-',
    },
    {
      title: 'Trang thai',
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
      title: 'Thiet bi',
      dataIndex: 'equipmentName',
      key: 'equipmentName',
    },
    {
      title: 'Khoa',
      dataIndex: 'departmentName',
      key: 'departmentName',
    },
    {
      title: 'Mo ta loi',
      dataIndex: 'problemDescription',
      key: 'problemDescription',
      ellipsis: true,
    },
    {
      title: 'Uu tien',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority, record) => {
        const colorMap: Record<number, string> = { 1: 'default', 2: 'blue', 3: 'orange', 4: 'red' };
        return <Tag color={colorMap[priority] || 'default'}>{record.priorityName}</Tag>;
      },
    },
    {
      title: 'Trang thai',
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
          Quan ly trang thiet bi y te
          <Button icon={<ReloadOutlined />} onClick={fetchData} style={{ marginLeft: 12 }} size="small">
            Lam moi
          </Button>
        </Title>

        {/* Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Thiet bi hoat dong"
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
                title="Can bao tri"
                value={maintenanceDue}
                prefix={<CalendarOutlined style={{ color: '#faad14' }} />}
                styles={{ content: { color: '#faad14' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Yeu cau sua chua"
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
              Them thiet bi
            </Button>
          }
        >
          <Tabs
            defaultActiveKey="equipment"
            items={[
              {
                key: 'equipment',
                label: 'Danh sach thiet bi',
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
                    Lich bao tri
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
                      Len lich bao tri
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
                    Yeu cau sua chua
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
                label: 'Kiem dinh',
                children: (
                  <div>
                    <Title level={5}>Quy dinh kiem dinh</Title>
                    <ul>
                      <li><strong>Nhom A:</strong> Kiem dinh moi 1 nam (X-quang, CT, MRI, may gia toc)</li>
                      <li><strong>Nhom B:</strong> Kiem dinh moi 2 nam</li>
                      <li><strong>Nhom C:</strong> Kiem dinh khi can</li>
                    </ul>
                    <Divider />
                    <Table
                      columns={[
                        { title: 'Thiet bi', dataIndex: 'name', key: 'name' },
                        { title: 'Nhom', dataIndex: 'riskClass', key: 'riskClass', render: (c: string) => getRiskClassTag(c) },
                        { title: 'Kiem dinh gan nhat', dataIndex: 'lastCalibrationDate', key: 'lastCalibrationDate', render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
                        { title: 'Kiem dinh tiep theo', dataIndex: 'nextCalibrationDate', key: 'nextCalibrationDate', render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
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
          title="Chi tiet thiet bi"
          open={isDetailModalOpen}
          onCancel={() => setIsDetailModalOpen(false)}
          footer={[
            <Button key="print" icon={<PrinterOutlined />} onClick={executePrintEquipmentCard}>
              In phieu
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
                <Descriptions.Item label="Trang thai">
                  {getStatusTag(selectedEquipment.operationalStatus)}
                </Descriptions.Item>
                <Descriptions.Item label="Ten" span={2}>
                  {selectedEquipment.name}
                </Descriptions.Item>
                <Descriptions.Item label="Hang SX">{selectedEquipment.manufacturer}</Descriptions.Item>
                <Descriptions.Item label="Model">{selectedEquipment.model}</Descriptions.Item>
                <Descriptions.Item label="Serial">{selectedEquipment.serialNumber}</Descriptions.Item>
                <Descriptions.Item label="Nhom">{getRiskClassTag(selectedEquipment.riskClass)}</Descriptions.Item>
                <Descriptions.Item label="Khoa/Phong">{selectedEquipment.departmentName}</Descriptions.Item>
                <Descriptions.Item label="Vi tri">{selectedEquipment.locationName || selectedEquipment.roomName || '-'}</Descriptions.Item>
                <Descriptions.Item label="Ngay mua">{selectedEquipment.purchaseDate ? dayjs(selectedEquipment.purchaseDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                <Descriptions.Item label="Bao hanh">{selectedEquipment.warrantyExpiry ? dayjs(selectedEquipment.warrantyExpiry).format('DD/MM/YYYY') : 'Het'}</Descriptions.Item>
                <Descriptions.Item label="Nguyen gia" span={2}>
                  {(selectedEquipment.purchasePrice || 0).toLocaleString('vi-VN')} VND
                </Descriptions.Item>
              </Descriptions>

              <Divider>Thong tin bao tri</Divider>

              <Row gutter={16}>
                <Col span={12}>
                  <Card size="small" title="Bao tri">
                    <p><strong>Lan cuoi:</strong> {selectedEquipment.lastMaintenanceDate ? dayjs(selectedEquipment.lastMaintenanceDate).format('DD/MM/YYYY') : '-'}</p>
                    <p><strong>Lan tiep:</strong> {selectedEquipment.nextMaintenanceDate ? dayjs(selectedEquipment.nextMaintenanceDate).format('DD/MM/YYYY') : '-'}</p>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small" title="Kiem dinh">
                    <p><strong>Lan cuoi:</strong> {selectedEquipment.lastCalibrationDate ? dayjs(selectedEquipment.lastCalibrationDate).format('DD/MM/YYYY') : '-'}</p>
                    <p><strong>Lan tiep:</strong> {selectedEquipment.nextCalibrationDate ? dayjs(selectedEquipment.nextCalibrationDate).format('DD/MM/YYYY') : '-'}</p>
                  </Card>
                </Col>
              </Row>
            </>
          )}
        </Modal>

        {/* Repair Modal */}
        <Modal
          title="Bao cao hong"
          open={isRepairModalOpen}
          onCancel={() => setIsRepairModalOpen(false)}
          onOk={() => repairForm.submit()}
        >
          <Form form={repairForm} layout="vertical" onFinish={handleSubmitRepair}>
            <Form.Item label="Thiet bi">
              <Input value={selectedEquipment?.name} disabled />
            </Form.Item>
            <Form.Item name="reportedBy" label="Nguoi bao cao" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="issueDescription" label="Mo ta loi" rules={[{ required: true }]}>
              <TextArea rows={3} />
            </Form.Item>
            <Form.Item name="priority" label="Muc do uu tien" rules={[{ required: true }]}>
              <Select>
                <Select.Option value={1}>Thap</Select.Option>
                <Select.Option value={2}>Trung binh</Select.Option>
                <Select.Option value={3}>Cao</Select.Option>
                <Select.Option value={4}>Khan cap</Select.Option>
              </Select>
            </Form.Item>
          </Form>
        </Modal>

        {/* Maintenance Modal */}
        <Modal
          title="Len lich bao tri"
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
            <Form.Item name="maintenanceType" label="Loai bao tri" rules={[{ required: true }]}>
              <Select>
                <Select.Option value="Preventive">Bao tri phong ngua</Select.Option>
                <Select.Option value="Calibration">Kiem dinh</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="scheduledDate" label="Ngay du kien" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="technician" label="Don vi thuc hien">
              <Input placeholder="VD: Siemens VN, GE Healthcare" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default Equipment;
