/**
 * NangCap10 Report Tab (Items 376-415) — generic tab component cho 3 nhóm
 * báo cáo: BHYT Cost · Administrative & CLS · Pharmacy.
 *
 * Extracted khỏi pages/Reports.tsx (K17 Batch 2). Logic preserve 100%.
 * 3 wrapper component (`BhytCostReportsTab`/`AdminClsReportsTab`/
 * `PharmacyExtReportsTab`) chỉ truyền props khác nhau (color/icon/title/apiFn).
 */
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Drawer,
  Empty,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tooltip,
  Typography,
  message,
} from 'antd';
import {
  ContainerOutlined,
  EyeOutlined,
  FileExcelOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SolutionOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { getBhytReport, getAdminReport, getPharmacyReport } from '../../api/bhytReports';
import type { Nc10ReportDef } from './types';
import { bhytCostReports, adminClsReports, pharmacyExtReports } from './constants';

const { Text } = Typography;
const { RangePicker } = DatePicker;

interface Nc10ReportTabProps {
  reports: Nc10ReportDef[];
  tabColor: string;
  tabIcon: React.ReactNode;
  tabTitle: string;
  tabDescription: string;
  apiFn: (reportId: string, params?: Record<string, unknown>) => Promise<unknown>;
}

const Nc10ReportTab: React.FC<Nc10ReportTabProps> = ({
  reports,
  tabColor,
  tabIcon,
  tabTitle,
  tabDescription,
  apiFn,
}) => {
  const [selectedReport, setSelectedReport] = useState<Nc10ReportDef | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs(),
  ]);
  const [departmentFilter, setDepartmentFilter] = useState<string | undefined>(undefined);
  const [patientTypeFilter, setPatientTypeFilter] = useState<string | undefined>(undefined);
  const [reportData, setReportData] = useState<Record<string, unknown>[]>([]);
  const [reportColumns, setReportColumns] = useState<ColumnsType<Record<string, unknown>>>([]);

  const handleOpenReport = useCallback((report: Nc10ReportDef) => {
    setSelectedReport(report);
    setReportData([]);
    setReportColumns([]);
    setDrawerOpen(true);
  }, []);

  const handleGenerateReport = useCallback(async () => {
    if (!selectedReport) return;
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        fromDate: dateRange[0].format('YYYY-MM-DD'),
        toDate: dateRange[1].format('YYYY-MM-DD'),
      };
      if (departmentFilter) params.departmentId = departmentFilter;
      if (patientTypeFilter) params.patientType = patientTypeFilter;

      const response = await apiFn(selectedReport.id, params);
      // apiFn() có shape không thống nhất giữa các module (AxiosResponse vs unwrapped)
      // — đọc qua cast tối thiểu rồi narrow runtime.
      const data = (response as { data?: unknown })?.data;
      const dataItems =
        data && typeof data === 'object' && 'items' in data && Array.isArray((data as { items?: unknown }).items)
          ? (data as { items: Record<string, unknown>[] }).items
          : null;
      if (dataItems) {
        setReportData(dataItems);
        if (dataItems.length > 0) {
          const cols = Object.keys(dataItems[0]).map((key) => ({
            title: key,
            dataIndex: key,
            key,
            width: 150,
            render: (v: unknown) =>
              typeof v === 'number' ? v.toLocaleString('vi-VN') : String(v ?? ''),
          }));
          setReportColumns(cols);
        }
        message.success(`Da tai bao cao: ${selectedReport.name}`);
      } else if (Array.isArray(data)) {
        const rows = data as Record<string, unknown>[];
        setReportData(rows);
        if (rows.length > 0) {
          const cols = Object.keys(rows[0]).map((key) => ({
            title: key,
            dataIndex: key,
            key,
            width: 150,
            render: (v: unknown) =>
              typeof v === 'number' ? v.toLocaleString('vi-VN') : String(v ?? ''),
          }));
          setReportColumns(cols);
        }
        message.success(`Da tai bao cao: ${selectedReport.name}`);
      } else {
        setReportData([]);
        setReportColumns([]);
        message.warning('Khong co du lieu cho ky bao cao nay');
      }
    } catch {
      console.warn(`Error loading report ${selectedReport.id}`);
      setReportData([]);
      setReportColumns([]);
      message.warning('Bao cao chua co du lieu. He thong se cap nhat sau.');
    } finally {
      setLoading(false);
    }
  }, [selectedReport, dateRange, departmentFilter, patientTypeFilter, apiFn]);

  const handleExportExcel = useCallback(() => {
    message.info('Chuc nang xuat Excel dang duoc phat trien. Vui long thu lai sau.');
  }, []);

  return (
    <div>
      <Alert
        title={tabTitle}
        description={tabDescription}
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Row gutter={[16, 16]}>
        {reports.map((report) => (
          <Col key={report.id} xs={24} sm={12} md={8}>
            <Card
              hoverable
              size="small"
              style={{ height: '100%', borderLeft: `3px solid ${tabColor}` }}
              onClick={() => handleOpenReport(report)}
            >
              <Space orientation="vertical" style={{ width: '100%' }}>
                <Space>
                  {tabIcon}
                  <Text strong style={{ fontSize: 13 }}>{report.name}</Text>
                </Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {report.description}
                </Text>
                <Button
                  type="primary"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenReport(report);
                  }}
                  style={{ marginTop: 4 }}
                >
                  Xem bao cao
                </Button>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Drawer
        title={
          <Space>
            {tabIcon}
            <span>{selectedReport?.name || 'Bao cao'}</span>
          </Space>
        }
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={900}
        destroyOnHidden
      >
        {selectedReport && (
          <div>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Text type="secondary">{selectedReport.description}</Text>
            </Card>

            {/* Filters */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Text strong>Thoi gian:</Text>
                <br />
                <RangePicker
                  format="DD/MM/YYYY"
                  style={{ width: '100%', marginTop: 8 }}
                  value={dateRange}
                  onChange={(dates) => {
                    if (dates) setDateRange([dates[0]!, dates[1]!]);
                  }}
                />
              </Col>
              <Col span={6}>
                <Text strong>Khoa/Phong:</Text>
                <br />
                <Select
                  style={{ width: '100%', marginTop: 8 }}
                  value={departmentFilter}
                  onChange={setDepartmentFilter}
                  allowClear
                  placeholder="Tat ca khoa/phong"
                >
                  <Select.Option value="noi">Khoa Noi</Select.Option>
                  <Select.Option value="ngoai">Khoa Ngoai</Select.Option>
                  <Select.Option value="san">Khoa San</Select.Option>
                  <Select.Option value="nhi">Khoa Nhi</Select.Option>
                  <Select.Option value="xn">Khoa Xet nghiem</Select.Option>
                  <Select.Option value="cdha">Khoa CDHA</Select.Option>
                  <Select.Option value="duoc">Khoa Duoc</Select.Option>
                  <Select.Option value="cap_cuu">Khoa Cap cuu</Select.Option>
                </Select>
              </Col>
              <Col span={5}>
                <Text strong>Doi tuong:</Text>
                <br />
                <Select
                  style={{ width: '100%', marginTop: 8 }}
                  value={patientTypeFilter}
                  onChange={setPatientTypeFilter}
                  allowClear
                  placeholder="Tat ca"
                >
                  <Select.Option value="bhyt">BHYT</Select.Option>
                  <Select.Option value="vp">Vien phi</Select.Option>
                  <Select.Option value="yc">Dich vu</Select.Option>
                </Select>
              </Col>
              <Col span={5}>
                <Text strong>&nbsp;</Text>
                <br />
                <Space style={{ marginTop: 8 }}>
                  <Button
                    type="primary"
                    icon={<SearchOutlined />}
                    onClick={handleGenerateReport}
                    loading={loading}
                  >
                    Tao bao cao
                  </Button>
                  <Tooltip title="Xuat Excel">
                    <Button
                      icon={<FileExcelOutlined />}
                      onClick={handleExportExcel}
                      style={{ backgroundColor: '#52c41a', color: 'white' }}
                    >
                      Excel
                    </Button>
                  </Tooltip>
                </Space>
              </Col>
            </Row>

            <Divider style={{ margin: '12px 0' }} />

            {/* Report Data Table */}
            <Spin spinning={loading} tip="Dang tai du lieu...">
              {reportData.length > 0 ? (
                <Table
                  columns={reportColumns}
                  dataSource={reportData}
                  rowKey={(_record, index) => `row-${index}`}
                  size="small"
                  scroll={{ x: 'max-content' }}
                  pagination={{
                    pageSize: 20,
                    showSizeChanger: true,
                    showTotal: (total) => `Tong: ${total} dong`,
                  }}
                  bordered
                />
              ) : (
                <Empty
                  description={
                    <Text type="secondary">
                      Chon thoi gian va nhan &quot;Tao bao cao&quot; de xem du lieu
                    </Text>
                  }
                  style={{ padding: '40px 0' }}
                />
              )}
            </Spin>
          </div>
        )}
      </Drawer>
    </div>
  );
};

// ============================================================================
// BHYT Cost Reports Tab (Items 376-385)
// ============================================================================

export const BhytCostReportsTab: React.FC = () => (
  <Nc10ReportTab
    reports={bhytCostReports}
    tabColor="#13c2c2"
    tabIcon={<SafetyCertificateOutlined style={{ color: '#13c2c2' }} />}
    tabTitle="Bao cao Chi phi KCB BHYT (10 bao cao)"
    tabDescription="Cac bieu mau bao cao chi phi kham chua benh BHYT theo quy dinh: mau 16-21/BHYT, C79a-HD, C80a-HD, C79B/C80B-HD, va mau 21/BHYT theo CV 285 BHXH."
    apiFn={getBhytReport}
  />
);

// ============================================================================
// Administrative & CLS Reports Tab (Items 386-403)
// ============================================================================

export const AdminClsReportsTab: React.FC = () => (
  <Nc10ReportTab
    reports={adminClsReports}
    tabColor="#722ed1"
    tabIcon={<SolutionOutlined style={{ color: '#722ed1' }} />}
    tabTitle="Bao cao Hanh chinh & Can lam sang (18 bao cao)"
    tabDescription="So kham benh, so vao/ra vien, so phau thuat/thu thuat, so xet nghiem/CDHA/noi soi/vi sinh, so luu tru HSBA, bao cao hoat dong kham benh/dieu tri/PTTT/CLS va tai nan thuong tich."
    apiFn={getAdminReport}
  />
);

// ============================================================================
// Pharmacy Reports Tab (Items 404-415)
// ============================================================================

export const PharmacyExtReportsTab: React.FC = () => (
  <Nc10ReportTab
    reports={pharmacyExtReports}
    tabColor="#52c41a"
    tabIcon={<ContainerOutlined style={{ color: '#52c41a' }} />}
    tabTitle="Bao cao Duoc (12 bao cao)"
    tabDescription="The kho, bao cao cong tac duoc/su dung thuoc/khang sinh/hoa chat/VTYT, bien ban kiem ke thuoc/hoa chat/VTYT, bien ban xac nhan mat-hong, thanh ly thuoc va so kiem nhap."
    apiFn={getPharmacyReport}
  />
);
