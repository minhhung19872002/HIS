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
  type PatientBillingStatusDto,
  type UnpaidServiceItemDto,
  type DepositDto,
  type RefundDto,
} from '../api/billing';

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
  const [loading, setLoading] = useState(false);

  const [paymentForm] = Form.useForm();
  const [depositForm] = Form.useForm();
  const [refundForm] = Form.useForm();

  // ============= FETCH DATA ON TAB CHANGE =============

  useEffect(() => {
    if (activeTab === 'deposits') {
      fetchDeposits();
    } else if (activeTab === 'refunds') {
      fetchRefunds();
    }
  }, [activeTab]);

  const fetchDeposits = async () => {
    try {
      setLoading(true);
      const response = await searchPatients({ pageSize: 1000 });
      const allDeposits: Deposit[] = [];

      for (const patient of (response as any).data?.items || []) {
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
      }

      setDeposits(allDeposits);
    } catch (error) {
      message.error('Không thể tải dữ liệu tạm ứng');
      console.error('Error fetching deposits:', error);
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
      console.error('Error fetching refunds:', error);
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
      console.error('Error searching patient:', error);
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
            footer={() => (
              <Row gutter={16} style={{ padding: '8px 0' }}>
                <Col span={12}>
                  <Space direction="vertical" style={{ width: '100%' }}>
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

  const handlePayment = () => {
    paymentForm.validateFields().then((values) => {
      console.log('Payment values:', values);
      message.success('Thanh toán thành công!');
      setPaymentModalVisible(false);
      setReceiptDrawerVisible(true);
      setSelectedServices([]);
      paymentForm.resetFields();
    });
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
                valueStyle={{ fontSize: 18 }}
                formatter={(value) => `${Number(value).toLocaleString('vi-VN')}`}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="BHYT trả"
                value={totals.insuranceAmount}
                suffix="đ"
                valueStyle={{ fontSize: 18, color: '#52c41a' }}
                formatter={(value) => `${Number(value).toLocaleString('vi-VN')}`}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Bệnh nhân trả"
                value={totals.patientAmount}
                suffix="đ"
                valueStyle={{ fontSize: 18, color: '#f5222d' }}
                formatter={(value) => `${Number(value).toLocaleString('vi-VN')}`}
              />
            </Col>
          </Row>
        </Card>

        <Divider>Phương thức thanh toán</Divider>

        <Form.Item name="paymentMethod" initialValue="cash">
          <Radio.Group>
            <Space direction="vertical">
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
      width={450}
      extra={
        <Space>
          <Button icon={<PrinterOutlined />} type="primary">
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

  const handleCreateDeposit = () => {
    depositForm.validateFields().then((values) => {
      console.log('Deposit values:', values);
      message.success('Tạo tạm ứng thành công!');
      setDepositModalVisible(false);
      depositForm.resetFields();
    });
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
          <Button size="small" icon={<PrinterOutlined />}>
            In
          </Button>
          {record.remainingAmount > 0 && (
            <Button size="small" type="link" danger icon={<RollbackOutlined />}>
              Hoàn
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const DepositsTab = (
    <div>
      <Row style={{ marginBottom: 16 }}>
        <Col flex="auto">
          <Space size="large">
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
              valueStyle={{ color: '#52c41a' }}
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
          />
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

  const handleCreateRefund = () => {
    refundForm.validateFields().then((values) => {
      console.log('Refund values:', values);
      message.success('Tạo yêu cầu hoàn tiền thành công!');
      setRefundModalVisible(false);
      refundForm.resetFields();
    });
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
                onClick={() => message.success('Đã duyệt yêu cầu hoàn tiền')}
              >
                Duyệt
              </Button>
              <Button
                size="small"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => message.error('Đã từ chối yêu cầu')}
              >
                Từ chối
              </Button>
            </>
          )}
          {record.status === 2 && (
            <Button size="small" icon={<PrinterOutlined />}>
              In
            </Button>
          )}
        </Space>
      ),
    },
  ];

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
            />
            <RangePicker format="DD/MM/YYYY" />
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
        dataSource={refunds}
        rowKey="id"
        size="small"
        scroll={{ x: 1400 }}
        loading={loading}
        pagination={{
          showSizeChanger: true,
          showTotal: (total) => `Tổng: ${total} bản ghi`,
        }}
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
          />
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
          <Button type="primary" icon={<BarChartOutlined />}>
            Xem báo cáo
          </Button>
        </Col>
        <Col>
          <Button icon={<FileTextOutlined />}>Xuất Excel</Button>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng doanh thu"
              value={45800000}
              suffix="đ"
              prefix={<DollarOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
              formatter={(value) => `${Number(value).toLocaleString('vi-VN')}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tiền mặt"
              value={25000000}
              suffix="đ"
              valueStyle={{ color: '#52c41a' }}
              formatter={(value) => `${Number(value).toLocaleString('vi-VN')}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Chuyển khoản"
              value={15800000}
              suffix="đ"
              valueStyle={{ color: '#faad14' }}
              formatter={(value) => `${Number(value).toLocaleString('vi-VN')}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="BHYT"
              value={5000000}
              suffix="đ"
              valueStyle={{ color: '#eb2f96' }}
              formatter={(value) => `${Number(value).toLocaleString('vi-VN')}`}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="Doanh thu theo loại dịch vụ" size="small">
            <Table
              dataSource={[
                {
                  key: '1',
                  serviceType: 'Khám bệnh',
                  revenue: 15000000,
                  count: 75,
                },
                {
                  key: '2',
                  serviceType: 'Xét nghiệm',
                  revenue: 12000000,
                  count: 120,
                },
                {
                  key: '3',
                  serviceType: 'Chẩn đoán hình ảnh',
                  revenue: 10800000,
                  count: 45,
                },
                { key: '4', serviceType: 'Thuốc', revenue: 5000000, count: 200 },
                { key: '5', serviceType: 'Thủ thuật', revenue: 3000000, count: 15 },
              ]}
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
                  align: 'center',
                },
                {
                  title: 'Doanh thu',
                  dataIndex: 'revenue',
                  key: 'revenue',
                  align: 'right',
                  render: (value) => `${value.toLocaleString('vi-VN')} đ`,
                },
              ]}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Công nợ chưa thu" size="small">
            <Table
              dataSource={[
                {
                  key: '1',
                  patientCode: 'BN26000003',
                  patientName: 'Lê Văn C',
                  amount: 2500000,
                  days: 5,
                },
                {
                  key: '2',
                  patientCode: 'BN26000005',
                  patientName: 'Phạm Thị D',
                  amount: 1800000,
                  days: 3,
                },
                {
                  key: '3',
                  patientCode: 'BN26000008',
                  patientName: 'Hoàng Văn E',
                  amount: 950000,
                  days: 2,
                },
              ]}
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
                  align: 'center',
                  width: 80,
                },
                {
                  title: 'Công nợ',
                  dataIndex: 'amount',
                  key: 'amount',
                  align: 'right',
                  width: 120,
                  render: (value) => (
                    <Text strong style={{ color: '#f5222d' }}>
                      {value.toLocaleString('vi-VN')} đ
                    </Text>
                  ),
                },
              ]}
              pagination={false}
              size="small"
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
    </div>
  );
};

export default Billing;
