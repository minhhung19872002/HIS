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
  Typography,
  message,
  Tabs,
  Tree,
  Select,
  Switch,
  InputNumber,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DatabaseOutlined,
  MedicineBoxOutlined,
  UserOutlined,
  HomeOutlined,
  FileTextOutlined,
  FolderOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { DataNode } from 'antd/es/tree';
import { catalogApi } from '../api/system';

const { Title, Text } = Typography;
const { Search } = Input;
const { TextArea } = Input;

// Interfaces
interface ServiceItem {
  id: string;
  code: string;
  name: string;
  bhytCode?: string;
  groupName: string;
  price: number;
  bhytPrice?: number;
  unit: string;
  isActive: boolean;
}

interface Medicine {
  id: string;
  code: string;
  name: string;
  activeIngredient: string;
  registrationNumber: string;
  manufacturer: string;
  country: string;
  unit: string;
  dosageForm: string;
  bhytCode?: string;
  price: number;
  bhytPrice?: number;
  isActive: boolean;
}

interface Department {
  id: string;
  code: string;
  name: string;
  bhytCode?: string;
  type: string;
  parentId?: string;
  isActive: boolean;
}

interface IcdCode {
  id: string;
  code: string;
  name: string;
  nameEnglish?: string;
  chapter: string;
  group: string;
  isActive: boolean;
}

// Mock data removed - data will be fetched from API

// Category tree data
const categoryTreeData: DataNode[] = [
  {
    title: 'Dịch vụ kỹ thuật',
    key: 'services',
    icon: <MedicineBoxOutlined />,
    children: [
      { title: 'Khám bệnh', key: 'exam', icon: <FolderOutlined /> },
      { title: 'Xét nghiệm', key: 'lab', icon: <FolderOutlined /> },
      { title: 'Chẩn đoán hình ảnh', key: 'imaging', icon: <FolderOutlined /> },
      { title: 'Thăm dò chức năng', key: 'functional', icon: <FolderOutlined /> },
      { title: 'Phẫu thuật thủ thuật', key: 'surgery', icon: <FolderOutlined /> },
      { title: 'Ngày giường', key: 'bedday', icon: <FolderOutlined /> },
    ],
  },
  {
    title: 'Thuốc - Vật tư',
    key: 'pharmacy',
    icon: <MedicineBoxOutlined />,
    children: [
      { title: 'Thuốc', key: 'medicine', icon: <FolderOutlined /> },
      { title: 'Vật tư tiêu hao', key: 'supplies', icon: <FolderOutlined /> },
      { title: 'Máu - Chế phẩm máu', key: 'blood', icon: <FolderOutlined /> },
    ],
  },
  {
    title: 'Danh mục BYT',
    key: 'byt',
    icon: <FileTextOutlined />,
    children: [
      { title: 'ICD-10', key: 'icd10', icon: <FolderOutlined /> },
      { title: 'Đường dùng', key: 'route', icon: <FolderOutlined /> },
      { title: 'Hoạt chất', key: 'ingredient', icon: <FolderOutlined /> },
    ],
  },
  {
    title: 'Tổ chức',
    key: 'organization',
    icon: <HomeOutlined />,
    children: [
      { title: 'Khoa/Phòng', key: 'departments', icon: <FolderOutlined /> },
      { title: 'Kho', key: 'warehouses', icon: <FolderOutlined /> },
      { title: 'Phòng khám', key: 'clinics', icon: <FolderOutlined /> },
    ],
  },
  {
    title: 'Người dùng',
    key: 'users',
    icon: <UserOutlined />,
    children: [
      { title: 'Nhân viên', key: 'employees', icon: <FolderOutlined /> },
      { title: 'Bác sĩ', key: 'doctors', icon: <FolderOutlined /> },
      { title: 'Điều dưỡng', key: 'nurses', icon: <FolderOutlined /> },
    ],
  },
];

const MasterData: React.FC = () => {
  const [activeTab, setActiveTab] = useState('services');
  const [selectedCategory, setSelectedCategory] = useState<string>('services');
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [icdCodes, setIcdCodes] = useState<IcdCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [form] = Form.useForm();

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'services':
          const servicesResponse = await catalogApi.getParaclinicalServices();
          const mappedServices = ((servicesResponse as any).data || []).map((s: any) => ({
            id: s.id,
            code: s.code,
            name: s.name,
            bhytCode: s.bhxhCode,
            groupName: s.serviceGroupName || s.serviceType,
            price: s.unitPrice,
            bhytPrice: s.insurancePrice,
            unit: 'Lần',
            isActive: s.isActive,
          }));
          setServices(mappedServices);
          break;
        case 'medicines':
          const medicinesResponse = await catalogApi.getMedicines({});
          const mappedMedicines = ((medicinesResponse as any).data || []).map((m: any) => ({
            id: m.id,
            code: m.code,
            name: m.name,
            activeIngredient: m.activeIngredient,
            registrationNumber: m.registrationNumber || '',
            manufacturer: m.manufacturer || '',
            country: m.countryOfOrigin || '',
            unit: m.unit,
            dosageForm: m.dosageForm,
            bhytCode: m.bhxhCode,
            price: m.unitPrice,
            bhytPrice: m.insurancePrice,
            isActive: m.isActive,
          }));
          setMedicines(mappedMedicines);
          break;
        case 'departments':
          const departmentsResponse = await catalogApi.getDepartments();
          const mappedDepartments = ((departmentsResponse as any).data || []).map((d: any) => ({
            id: d.id,
            code: d.code,
            name: d.name,
            bhytCode: d.departmentType,
            type: d.departmentType,
            isActive: d.isActive,
          }));
          setDepartments(mappedDepartments);
          break;
        case 'icd':
          const icdResponse = await catalogApi.getICD10Codes();
          const mappedIcd = ((icdResponse as any).data || []).map((i: any) => ({
            id: i.id,
            code: i.code,
            name: i.name,
            nameEnglish: i.nameEnglish,
            chapter: i.chapterCode,
            group: i.groupCode,
            isActive: i.isActive,
          }));
          setIcdCodes(mappedIcd);
          break;
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      message.error('Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  // Handle add/edit
  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  const handleDelete = (record: any) => {
    Modal.confirm({
      title: 'Xác nhận xóa',
      content: `Bạn có chắc chắn muốn xóa "${record.name}"?`,
      onOk: () => {
        message.success('Đã xóa thành công');
      },
    });
  };

  const handleSave = () => {
    form.validateFields().then((_values) => {
      if (editingRecord) {
        message.success('Đã cập nhật thành công');
      } else {
        message.success('Đã thêm mới thành công');
      }
      setIsModalOpen(false);
      form.resetFields();
      setEditingRecord(null);
    });
  };

  // Service columns
  const serviceColumns: ColumnsType<ServiceItem> = [
    {
      title: 'Mã DV',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      fixed: 'left',
    },
    {
      title: 'Tên dịch vụ',
      dataIndex: 'name',
      key: 'name',
      width: 250,
    },
    {
      title: 'Mã BHYT',
      dataIndex: 'bhytCode',
      key: 'bhytCode',
      width: 140,
      render: (code) => code ? <Text code>{code}</Text> : '-',
    },
    {
      title: 'Nhóm',
      dataIndex: 'groupName',
      key: 'groupName',
      width: 150,
      render: (group) => <Tag color="blue">{group}</Tag>,
    },
    {
      title: 'Đơn vị',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
    },
    {
      title: 'Giá dịch vụ',
      dataIndex: 'price',
      key: 'price',
      width: 130,
      align: 'right',
      render: (price) => formatCurrency(price),
    },
    {
      title: 'Giá BHYT',
      dataIndex: 'bhytPrice',
      key: 'bhytPrice',
      width: 130,
      align: 'right',
      render: (price) => price ? formatCurrency(price) : '-',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Hoạt động' : 'Ngừng'}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
        </Space>
      ),
    },
  ];

  // Medicine columns
  const medicineColumns: ColumnsType<Medicine> = [
    {
      title: 'Mã thuốc',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      fixed: 'left',
    },
    {
      title: 'Tên thuốc',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: 'Hoạt chất',
      dataIndex: 'activeIngredient',
      key: 'activeIngredient',
      width: 150,
    },
    {
      title: 'Số đăng ký',
      dataIndex: 'registrationNumber',
      key: 'registrationNumber',
      width: 130,
    },
    {
      title: 'Hãng SX',
      dataIndex: 'manufacturer',
      key: 'manufacturer',
      width: 150,
    },
    {
      title: 'Nước SX',
      dataIndex: 'country',
      key: 'country',
      width: 100,
    },
    {
      title: 'Đơn vị',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
    },
    {
      title: 'Giá',
      dataIndex: 'price',
      key: 'price',
      width: 100,
      align: 'right',
      render: (price) => formatCurrency(price),
    },
    {
      title: 'Giá BHYT',
      dataIndex: 'bhytPrice',
      key: 'bhytPrice',
      width: 100,
      align: 'right',
      render: (price) => price ? formatCurrency(price) : '-',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Hoạt động' : 'Ngừng'}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
        </Space>
      ),
    },
  ];

  // Department columns
  const departmentColumns: ColumnsType<Department> = [
    {
      title: 'Mã khoa',
      dataIndex: 'code',
      key: 'code',
      width: 100,
    },
    {
      title: 'Tên khoa/phòng',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: 'Mã BYT',
      dataIndex: 'bhytCode',
      key: 'bhytCode',
      width: 100,
      render: (code) => code ? <Text code>{code}</Text> : '-',
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      width: 130,
      render: (type) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Hoạt động' : 'Ngừng'}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
        </Space>
      ),
    },
  ];

  // ICD columns
  const icdColumns: ColumnsType<IcdCode> = [
    {
      title: 'Mã ICD',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      render: (code) => <Text strong>{code}</Text>,
    },
    {
      title: 'Tên bệnh (Tiếng Việt)',
      dataIndex: 'name',
      key: 'name',
      width: 300,
    },
    {
      title: 'Tên bệnh (Tiếng Anh)',
      dataIndex: 'nameEnglish',
      key: 'nameEnglish',
      width: 250,
      render: (name) => <Text type="secondary">{name}</Text>,
    },
    {
      title: 'Chương',
      dataIndex: 'chapter',
      key: 'chapter',
      width: 80,
      align: 'center',
    },
    {
      title: 'Nhóm',
      dataIndex: 'group',
      key: 'group',
      width: 100,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Hoạt động' : 'Ngừng'}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
        </Space>
      ),
    },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'services':
        return (
          <Table
            columns={serviceColumns}
            dataSource={services}
            rowKey="id"
            size="small"
            scroll={{ x: 1300 }}
            loading={loading}
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Tổng: ${total} dịch vụ`,
            }}
          />
        );
      case 'medicines':
        return (
          <Table
            columns={medicineColumns}
            dataSource={medicines}
            rowKey="id"
            size="small"
            scroll={{ x: 1400 }}
            loading={loading}
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Tổng: ${total} thuốc`,
            }}
          />
        );
      case 'departments':
        return (
          <Table
            columns={departmentColumns}
            dataSource={departments}
            rowKey="id"
            size="small"
            loading={loading}
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Tổng: ${total} khoa/phòng`,
            }}
          />
        );
      case 'icd':
        return (
          <Table
            columns={icdColumns}
            dataSource={icdCodes}
            rowKey="id"
            size="small"
            loading={loading}
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Tổng: ${total} mã bệnh`,
            }}
          />
        );
      default:
        return null;
    }
  };

  const renderForm = () => {
    switch (activeTab) {
      case 'services':
        return (
          <>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="code" label="Mã dịch vụ" rules={[{ required: true }]}>
                  <Input placeholder="Nhập mã dịch vụ" />
                </Form.Item>
              </Col>
              <Col span={16}>
                <Form.Item name="name" label="Tên dịch vụ" rules={[{ required: true }]}>
                  <Input placeholder="Nhập tên dịch vụ" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="bhytCode" label="Mã BHYT">
                  <Input placeholder="Nhập mã BHYT" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="groupName" label="Nhóm dịch vụ" rules={[{ required: true }]}>
                  <Select placeholder="Chọn nhóm">
                    <Select.Option value="Khám bệnh">Khám bệnh</Select.Option>
                    <Select.Option value="Xét nghiệm">Xét nghiệm</Select.Option>
                    <Select.Option value="Chẩn đoán hình ảnh">Chẩn đoán hình ảnh</Select.Option>
                    <Select.Option value="Phẫu thuật thủ thuật">Phẫu thuật thủ thuật</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="unit" label="Đơn vị" rules={[{ required: true }]}>
                  <Input placeholder="Nhập đơn vị" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="price" label="Giá dịch vụ" rules={[{ required: true }]}>
                  <InputNumber
                    style={{ width: '100%' }}
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value!.replace(/\$\s?|(,*)/g, '')}
                    placeholder="Nhập giá"
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="bhytPrice" label="Giá BHYT">
                  <InputNumber
                    style={{ width: '100%' }}
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value!.replace(/\$\s?|(,*)/g, '')}
                    placeholder="Nhập giá BHYT"
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="isActive" label="Trạng thái" valuePropName="checked" initialValue={true}>
                  <Switch checkedChildren="Hoạt động" unCheckedChildren="Ngừng" />
                </Form.Item>
              </Col>
            </Row>
          </>
        );
      case 'medicines':
        return (
          <>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="code" label="Mã thuốc" rules={[{ required: true }]}>
                  <Input placeholder="Nhập mã thuốc" />
                </Form.Item>
              </Col>
              <Col span={16}>
                <Form.Item name="name" label="Tên thuốc" rules={[{ required: true }]}>
                  <Input placeholder="Nhập tên thuốc" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="activeIngredient" label="Hoạt chất" rules={[{ required: true }]}>
                  <Input placeholder="Nhập hoạt chất" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="registrationNumber" label="Số đăng ký" rules={[{ required: true }]}>
                  <Input placeholder="Nhập số đăng ký" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="manufacturer" label="Hãng sản xuất" rules={[{ required: true }]}>
                  <Input placeholder="Nhập hãng sản xuất" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="country" label="Nước sản xuất" rules={[{ required: true }]}>
                  <Input placeholder="Nhập nước sản xuất" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="dosageForm" label="Dạng bào chế" rules={[{ required: true }]}>
                  <Select placeholder="Chọn dạng bào chế">
                    <Select.Option value="Viên nén">Viên nén</Select.Option>
                    <Select.Option value="Viên nang">Viên nang</Select.Option>
                    <Select.Option value="Ống tiêm">Ống tiêm</Select.Option>
                    <Select.Option value="Chai truyền">Chai truyền</Select.Option>
                    <Select.Option value="Gói bột">Gói bột</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item name="unit" label="Đơn vị" rules={[{ required: true }]}>
                  <Input placeholder="Đơn vị" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="price" label="Giá bán" rules={[{ required: true }]}>
                  <InputNumber
                    style={{ width: '100%' }}
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value!.replace(/\$\s?|(,*)/g, '')}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="bhytPrice" label="Giá BHYT">
                  <InputNumber
                    style={{ width: '100%' }}
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value!.replace(/\$\s?|(,*)/g, '')}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="isActive" label="Trạng thái" valuePropName="checked" initialValue={true}>
                  <Switch checkedChildren="Hoạt động" unCheckedChildren="Ngừng" />
                </Form.Item>
              </Col>
            </Row>
          </>
        );
      default:
        return (
          <>
            <Form.Item name="code" label="Mã" rules={[{ required: true }]}>
              <Input placeholder="Nhập mã" />
            </Form.Item>
            <Form.Item name="name" label="Tên" rules={[{ required: true }]}>
              <Input placeholder="Nhập tên" />
            </Form.Item>
            <Form.Item name="description" label="Mô tả">
              <TextArea rows={3} placeholder="Nhập mô tả" />
            </Form.Item>
            <Form.Item name="isActive" label="Trạng thái" valuePropName="checked" initialValue={true}>
              <Switch checkedChildren="Hoạt động" unCheckedChildren="Ngừng" />
            </Form.Item>
          </>
        );
    }
  };

  return (
    <div>
      <Title level={4}>Quản lý Danh mục dùng chung</Title>

      <Row gutter={16}>
        <Col span={6}>
          <Card title={<Space><DatabaseOutlined /> Danh mục</Space>} size="small">
            <Tree
              showIcon
              defaultExpandedKeys={['services', 'pharmacy']}
              selectedKeys={[selectedCategory]}
              onSelect={(keys) => {
                if (keys.length > 0) {
                  setSelectedCategory(keys[0] as string);
                  if (keys[0] === 'services' || keys[0] === 'exam' || keys[0] === 'lab' || keys[0] === 'imaging' || keys[0] === 'surgery') {
                    setActiveTab('services');
                  } else if (keys[0] === 'medicine' || keys[0] === 'pharmacy') {
                    setActiveTab('medicines');
                  } else if (keys[0] === 'departments' || keys[0] === 'organization') {
                    setActiveTab('departments');
                  } else if (keys[0] === 'icd10' || keys[0] === 'byt') {
                    setActiveTab('icd');
                  }
                }
              }}
              treeData={categoryTreeData}
            />
          </Card>
        </Col>
        <Col span={18}>
          <Card>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              tabBarExtraContent={
                <Space>
                  <Search
                    placeholder="Tìm kiếm..."
                    allowClear
                    enterButton={<SearchOutlined />}
                    style={{ width: 300 }}
                  />
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    Thêm mới
                  </Button>
                </Space>
              }
              items={[
                {
                  key: 'services',
                  label: (
                    <span>
                      <MedicineBoxOutlined />
                      Dịch vụ kỹ thuật
                    </span>
                  ),
                  children: renderContent(),
                },
                {
                  key: 'medicines',
                  label: (
                    <span>
                      <MedicineBoxOutlined />
                      Thuốc
                    </span>
                  ),
                  children: renderContent(),
                },
                {
                  key: 'departments',
                  label: (
                    <span>
                      <HomeOutlined />
                      Khoa/Phòng
                    </span>
                  ),
                  children: renderContent(),
                },
                {
                  key: 'icd',
                  label: (
                    <span>
                      <FileTextOutlined />
                      ICD-10
                    </span>
                  ),
                  children: renderContent(),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      {/* Add/Edit Modal */}
      <Modal
        title={
          <Space>
            {editingRecord ? <EditOutlined /> : <PlusOutlined />}
            <span>{editingRecord ? 'Chỉnh sửa' : 'Thêm mới'}</span>
          </Space>
        }
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
          setEditingRecord(null);
        }}
        width={800}
        okText={<><SaveOutlined /> Lưu</>}
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          {renderForm()}
        </Form>
      </Modal>
    </div>
  );
};

export default MasterData;
