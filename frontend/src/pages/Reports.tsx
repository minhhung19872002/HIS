import React, { useState } from 'react';
import {
  Card,
  Button,
  Space,
  Row,
  Col,
  Typography,
  message,
  Tabs,
  DatePicker,
  Select,
  List,
  Divider,
  Input,
} from 'antd';
import {
  PrinterOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  BarChartOutlined,
  MedicineBoxOutlined,
  UserOutlined,
  DollarOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  SearchOutlined,
  FolderOpenOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Search } = Input;

// Report categories
const reportCategories = {
  general: {
    title: 'Báo cáo chung',
    icon: <BarChartOutlined />,
    reports: [
      { id: 'bc_giao_ban', name: 'Báo cáo giao ban', description: 'Báo cáo hoạt động toàn viện theo ngày' },
      { id: 'bc_hoat_dong', name: 'Báo cáo hoạt động BV', description: 'Thống kê hoạt động bệnh viện theo TT27/BYT' },
      { id: 'bc_benh_tat', name: 'Tình hình bệnh tật tử vong', description: 'Báo cáo theo QĐ 4069/2001/QĐ-BYT' },
      { id: 'bc_kham_benh', name: 'Báo cáo hoạt động khám bệnh', description: 'Thống kê khám bệnh ngoại trú' },
      { id: 'bc_dieu_tri', name: 'Báo cáo hoạt động điều trị', description: 'Thống kê điều trị nội trú' },
      { id: 'bc_pttt', name: 'Báo cáo hoạt động PTTT', description: 'Thống kê phẫu thuật thủ thuật' },
      { id: 'bc_cls', name: 'Báo cáo hoạt động CLS', description: 'Thống kê cận lâm sàng' },
    ],
  },
  pharmacy: {
    title: 'Báo cáo Dược',
    icon: <MedicineBoxOutlined />,
    reports: [
      { id: 'bc_duoc_khoa', name: 'Báo cáo công tác khoa Dược', description: 'Mẫu 10D/BV-01/TT22' },
      { id: 'bc_su_dung_thuoc', name: 'Báo cáo sử dụng thuốc', description: 'Mẫu 05D/BV-01/TT22' },
      { id: 'bc_khang_sinh', name: 'Báo cáo sử dụng kháng sinh', description: 'Mẫu 06D/BV-01/TT22' },
      { id: 'bc_hoa_chat', name: 'Báo cáo sử dụng hóa chất', description: 'Mẫu 08D/BV-01/TT22' },
      { id: 'bc_vtyt', name: 'Báo cáo sử dụng VTYT tiêu hao', description: 'Mẫu 09D/BV-01/TT22' },
      { id: 'so_gay_nghien', name: 'Sổ thuốc gây nghiện, hướng thần', description: 'Phụ lục VIII - TT20/2017' },
      { id: 'bc_nxt', name: 'Báo cáo xuất nhập tồn', description: 'Báo cáo NXT kho thuốc, vật tư' },
      { id: 'bc_ton_kho', name: 'Báo cáo tồn kho toàn viện', description: 'Thống kê tồn kho tất cả các kho' },
      { id: 'bc_15_ngay', name: 'Thống kê 15 ngày sử dụng', description: 'Mẫu 16D/BV-01/TT23' },
      { id: 'kiem_ke_thuoc', name: 'Biên bản kiểm kê thuốc', description: 'Mẫu 11D/BV-01/TT22' },
      { id: 'kiem_ke_hc', name: 'Biên bản kiểm kê hóa chất', description: 'Mẫu 12D/BV-01/TT22' },
      { id: 'kiem_ke_vtyt', name: 'Biên bản kiểm kê VTYT', description: 'Mẫu 13D/BV-01/TT22' },
    ],
  },
  finance: {
    title: 'Báo cáo Tài chính',
    icon: <DollarOutlined />,
    reports: [
      { id: 'bc_doanh_thu', name: 'Báo cáo doanh thu', description: 'Doanh thu theo khoa/phòng' },
      { id: 'bc_chi_phi', name: 'Báo cáo chi phí', description: 'Chi phí theo danh mục' },
      { id: 'bc_loi_nhuan', name: 'Báo cáo lợi nhuận', description: 'Báo cáo lợi nhuận tổng hợp' },
      { id: 'bc_bhyt', name: 'Báo cáo thanh toán BHYT', description: 'Mẫu 6556/QĐ-BYT' },
      { id: 'bc_vien_phi', name: 'Báo cáo viện phí', description: 'Báo cáo thu viện phí' },
      { id: 'bc_tam_ung', name: 'Báo cáo tạm ứng', description: 'Báo cáo thu tạm ứng' },
      { id: 'bc_hoan_ung', name: 'Báo cáo hoàn ứng', description: 'Báo cáo hoàn ứng bệnh nhân' },
      { id: 'bc_cong_no', name: 'Báo cáo công nợ', description: 'Báo cáo công nợ nhà cung cấp' },
    ],
  },
  laboratory: {
    title: 'Báo cáo Xét nghiệm',
    icon: <ExperimentOutlined />,
    reports: [
      { id: 'so_xn_sinh_hoa', name: 'Sổ xét nghiệm sinh hóa', description: 'Theo QĐ 4069' },
      { id: 'so_xn_vi_sinh', name: 'Sổ xét nghiệm vi sinh', description: 'Theo QĐ 4069' },
      { id: 'so_xn_huyet_hoc', name: 'Sổ xét nghiệm huyết học', description: 'Theo QĐ 4069' },
      { id: 'so_xn_nuoc_tieu', name: 'Sổ xét nghiệm nước tiểu', description: 'Theo QĐ 4069' },
      { id: 'bc_thong_ke_xn', name: 'Báo cáo thống kê xét nghiệm', description: 'Theo loại/ngày/khoa' },
      { id: 'bc_doanh_thu_xn', name: 'Báo cáo doanh thu xét nghiệm', description: 'Doanh thu khoa XN' },
    ],
  },
  imaging: {
    title: 'Báo cáo CĐHA',
    icon: <FileTextOutlined />,
    reports: [
      { id: 'so_sieu_am', name: 'Sổ siêu âm', description: 'Theo QĐ 4069' },
      { id: 'so_cdha', name: 'Sổ chẩn đoán hình ảnh', description: 'Theo QĐ 4069' },
      { id: 'so_tdcn', name: 'Sổ thăm dò chức năng', description: 'Theo QĐ 4069' },
      { id: 'bc_doanh_thu_cdha', name: 'Báo cáo doanh thu CĐHA', description: 'Doanh thu theo chi phí gốc' },
    ],
  },
  medical_records: {
    title: 'Quản lý Hồ sơ bệnh án',
    icon: <FolderOpenOutlined />,
    reports: [
      { id: 'ds_hsba', name: 'Danh sách hồ sơ bệnh án', description: 'Danh sách HSBA theo thời gian' },
      { id: 'bc_luu_tru', name: 'Báo cáo lưu trữ bệnh án', description: 'Thống kê HSBA đã/chưa lưu trữ' },
      { id: 'bc_muon_tra', name: 'Báo cáo mượn/trả hồ sơ', description: 'Theo dõi mượn trả HSBA' },
      { id: 'so_vao_vien', name: 'Sổ vào viện', description: 'Danh sách bệnh nhân vào viện' },
      { id: 'so_ra_vien', name: 'Sổ ra viện', description: 'Danh sách bệnh nhân ra viện' },
    ],
  },
  hr: {
    title: 'Báo cáo Nhân sự',
    icon: <UserOutlined />,
    reports: [
      { id: 'ds_nhan_vien', name: 'Danh sách nhân viên', description: 'Thông tin nhân viên theo khoa/phòng' },
      { id: 'bc_cham_cong', name: 'Báo cáo chấm công', description: 'Thống kê chấm công theo tháng' },
      { id: 'bc_truc', name: 'Báo cáo lịch trực', description: 'Lịch trực theo khoa/phòng' },
    ],
  },
};

const Reports: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('general');
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [_dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs(),
  ]);
  const [_department, setDepartment] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  // Handle export
  const handleExport = (format: 'excel' | 'pdf' | 'print') => {
    if (!selectedReport) {
      message.warning('Vui lòng chọn báo cáo');
      return;
    }

    const formatName = format === 'excel' ? 'Excel' : format === 'pdf' ? 'PDF' : 'máy in';
    message.success(`Đang xuất báo cáo ra ${formatName}...`);
  };

  // Get all reports for search
  const allReports = Object.values(reportCategories).flatMap(cat =>
    cat.reports.map(r => ({ ...r, category: cat.title }))
  );

  // Filter reports by search
  const filteredReports = searchText
    ? allReports.filter(
        r =>
          r.name.toLowerCase().includes(searchText.toLowerCase()) ||
          r.description.toLowerCase().includes(searchText.toLowerCase())
      )
    : null;

  const currentCategory = reportCategories[activeCategory as keyof typeof reportCategories];

  return (
    <div>
      <Title level={4}>Hồ sơ bệnh án & Báo cáo thống kê</Title>

      <Row gutter={16}>
        {/* Left panel - Report categories */}
        <Col span={6}>
          <Card title="Danh mục báo cáo" size="small">
            <Search
              placeholder="Tìm báo cáo..."
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ marginBottom: 16 }}
            />

            {filteredReports ? (
              <List
                size="small"
                dataSource={filteredReports}
                renderItem={(item) => (
                  <List.Item
                    style={{
                      cursor: 'pointer',
                      backgroundColor: selectedReport === item.id ? '#e6f7ff' : 'transparent',
                      padding: '8px',
                      borderRadius: 4,
                    }}
                    onClick={() => setSelectedReport(item.id)}
                  >
                    <List.Item.Meta
                      title={<Text strong={selectedReport === item.id}>{item.name}</Text>}
                      description={<Text type="secondary" style={{ fontSize: 12 }}>{item.category}</Text>}
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Tabs
                tabPosition="left"
                activeKey={activeCategory}
                onChange={setActiveCategory}
                items={Object.entries(reportCategories).map(([key, value]) => ({
                  key,
                  label: (
                    <Space>
                      {value.icon}
                      <span>{value.title}</span>
                    </Space>
                  ),
                }))}
              />
            )}
          </Card>
        </Col>

        {/* Right panel - Report list and options */}
        <Col span={18}>
          <Card
            title={
              <Space>
                {currentCategory?.icon}
                <span>{currentCategory?.title}</span>
              </Space>
            }
          >
            {/* Report options */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Text strong>Thời gian:</Text>
                <br />
                <RangePicker
                  format="DD/MM/YYYY"
                  style={{ width: '100%', marginTop: 8 }}
                  onChange={(dates) => {
                    if (dates) {
                      setDateRange([dates[0]!, dates[1]!]);
                    }
                  }}
                  defaultValue={[dayjs().startOf('month'), dayjs()]}
                />
              </Col>
              <Col span={8}>
                <Text strong>Khoa/Phòng:</Text>
                <br />
                <Select
                  style={{ width: '100%', marginTop: 8 }}
                  defaultValue="all"
                  onChange={(value) => setDepartment(value)}
                >
                  <Select.Option value="all">Tất cả khoa/phòng</Select.Option>
                  <Select.Option value="noi">Khoa Nội</Select.Option>
                  <Select.Option value="ngoai">Khoa Ngoại</Select.Option>
                  <Select.Option value="san">Khoa Sản</Select.Option>
                  <Select.Option value="nhi">Khoa Nhi</Select.Option>
                  <Select.Option value="xn">Khoa Xét nghiệm</Select.Option>
                  <Select.Option value="cdha">Khoa CĐHA</Select.Option>
                  <Select.Option value="duoc">Khoa Dược</Select.Option>
                </Select>
              </Col>
              <Col span={8}>
                <Text strong>Xuất báo cáo:</Text>
                <br />
                <Space style={{ marginTop: 8 }}>
                  <Button
                    icon={<FileExcelOutlined />}
                    onClick={() => handleExport('excel')}
                    style={{ backgroundColor: '#52c41a', color: 'white' }}
                  >
                    Excel
                  </Button>
                  <Button
                    icon={<FilePdfOutlined />}
                    onClick={() => handleExport('pdf')}
                    danger
                  >
                    PDF
                  </Button>
                  <Button
                    icon={<PrinterOutlined />}
                    onClick={() => handleExport('print')}
                  >
                    In
                  </Button>
                </Space>
              </Col>
            </Row>

            <Divider />

            {/* Report list */}
            <List
              grid={{ gutter: 16, column: 2 }}
              dataSource={currentCategory?.reports || []}
              renderItem={(item) => (
                <List.Item>
                  <Card
                    hoverable
                    size="small"
                    style={{
                      borderColor: selectedReport === item.id ? '#1890ff' : undefined,
                      backgroundColor: selectedReport === item.id ? '#e6f7ff' : undefined,
                    }}
                    onClick={() => setSelectedReport(item.id)}
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Space>
                        <FileTextOutlined style={{ color: '#1890ff' }} />
                        <Text strong>{item.name}</Text>
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {item.description}
                      </Text>
                      {selectedReport === item.id && (
                        <Space style={{ marginTop: 8 }}>
                          <Button
                            type="primary"
                            size="small"
                            icon={<SearchOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              message.info(`Xem trước báo cáo: ${item.name}`);
                            }}
                          >
                            Xem trước
                          </Button>
                          <Button
                            size="small"
                            icon={<DownloadOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              message.info(`Tải xuống: ${item.name}`);
                            }}
                          >
                            Tải xuống
                          </Button>
                        </Space>
                      )}
                    </Space>
                  </Card>
                </List.Item>
              )}
            />
          </Card>

          {/* Quick access to common reports */}
          <Card title="Báo cáo thường dùng" style={{ marginTop: 16 }}>
            <Row gutter={[16, 16]}>
              <Col span={6}>
                <Button
                  block
                  icon={<BarChartOutlined />}
                  onClick={() => {
                    setActiveCategory('general');
                    setSelectedReport('bc_giao_ban');
                  }}
                >
                  Báo cáo giao ban
                </Button>
              </Col>
              <Col span={6}>
                <Button
                  block
                  icon={<DollarOutlined />}
                  onClick={() => {
                    setActiveCategory('finance');
                    setSelectedReport('bc_doanh_thu');
                  }}
                >
                  Báo cáo doanh thu
                </Button>
              </Col>
              <Col span={6}>
                <Button
                  block
                  icon={<MedicineBoxOutlined />}
                  onClick={() => {
                    setActiveCategory('pharmacy');
                    setSelectedReport('bc_nxt');
                  }}
                >
                  Báo cáo NXT kho
                </Button>
              </Col>
              <Col span={6}>
                <Button
                  block
                  icon={<FileTextOutlined />}
                  onClick={() => {
                    setActiveCategory('finance');
                    setSelectedReport('bc_bhyt');
                  }}
                >
                  Bảng kê BHYT
                </Button>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Reports;
