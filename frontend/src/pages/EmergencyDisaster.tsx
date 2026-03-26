import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
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
  Typography,
  Tabs,
  Statistic,
  Descriptions,
  Timeline,
  Divider,
  message,
  Badge,
  Progress,
  Alert,
  Steps,
  Avatar,
  Spin,
} from 'antd';
import {
  AlertOutlined,
  TeamOutlined,
  UserOutlined,
  PhoneOutlined,
  PrinterOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  BellOutlined,
  MedicineBoxOutlined,
  EnvironmentOutlined,
  ReloadOutlined,
  SoundOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  getActiveEvent,
  getEvents,
  getDashboard,
  activateMCI,
  deactivateMCI,
  getVictims,
  registerVictim,
  getResources,
  getCommandCenter,
  updateVictim,
  notifyFamily,
  getActivityLog,
  type MCIEventDto,
  type MCIVictimDto,
  type MCIResourceDto,
  type MCIDashboardDto,
  type ActivityLogDto,
  type CommandCenterDto,
  type ActivateMCIDto,
  type RegisterVictimDto,
  type DepartmentStaffDto,
} from '../api/massCasualty';

const { Title, Text } = Typography;
const { TextArea } = Input;

type ActivateFormValues = {
  description: string;
  eventType?: string;
  alertLevel: number;
  location: string;
  estimatedCasualties?: number | string;
};

type VictimFormValues = {
  name?: string;
  estimatedAge?: number | string;
  gender?: string;
  currentLocation?: string;
  injuries?: string;
  triageCategory?: string;
};

const EmergencyDisaster: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [mciEvent, setMciEvent] = useState<MCIEventDto | null>(null);
  const [victims, setVictims] = useState<MCIVictimDto[]>([]);
  const [resources, setResources] = useState<MCIResourceDto | null>(null);
  const [dashboard, setDashboard] = useState<MCIDashboardDto | null>(null);
  const [commandCenter, setCommandCenter] = useState<CommandCenterDto | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityLogDto[]>([]);
  const [eventHistory, setEventHistory] = useState<MCIEventDto[]>([]);

  const [activateModalVisible, setActivateModalVisible] = useState(false);
  const [addVictimModalVisible, setAddVictimModalVisible] = useState(false);
  const [victimDetailModalVisible, setVictimDetailModalVisible] = useState(false);
  const [selectedVictim, setSelectedVictim] = useState<MCIVictimDto | null>(null);

  const [activateForm] = Form.useForm();
  const [victimForm] = Form.useForm();

  // Statistics derived from victims
  const redCount = victims.filter(v => v.triageCategory === 'Immediate' || v.triageColor === 'red').length;
  const yellowCount = victims.filter(v => v.triageCategory === 'Delayed' || v.triageColor === 'yellow').length;
  const greenCount = victims.filter(v => v.triageCategory === 'Minor' || v.triageColor === 'green').length;
  const blackCount = victims.filter(v => v.triageCategory === 'Expectant' || v.triageCategory === 'Deceased' || v.triageColor === 'black').length;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [activeRes, dashboardRes, eventsRes] = await Promise.allSettled([
        getActiveEvent(),
        getDashboard(),
        getEvents(),
      ]);

      // Active event
      if (activeRes.status === 'fulfilled' && activeRes.value.data) {
        const event = activeRes.value.data;
        setMciEvent(event);

        // Fetch event-specific data
        const [victimsRes, resourcesRes, cmdRes, logRes] = await Promise.allSettled([
          getVictims(event.id),
          getResources(event.id),
          getCommandCenter(event.id),
          getActivityLog(event.id),
        ]);

        if (victimsRes.status === 'fulfilled' && victimsRes.value.data) {
          setVictims(Array.isArray(victimsRes.value.data) ? victimsRes.value.data : []);
        }
        if (resourcesRes.status === 'fulfilled' && resourcesRes.value.data) {
          setResources(resourcesRes.value.data);
        }
        if (cmdRes.status === 'fulfilled' && cmdRes.value.data) {
          setCommandCenter(cmdRes.value.data);
        }
        if (logRes.status === 'fulfilled' && logRes.value.data) {
          setActivityLog(Array.isArray(logRes.value.data) ? logRes.value.data : []);
        }
      } else {
        setMciEvent(null);
        setVictims([]);
        setResources(null);
        setCommandCenter(null);
        setActivityLog([]);
      }

      // Dashboard
      if (dashboardRes.status === 'fulfilled' && dashboardRes.value.data) {
        setDashboard(dashboardRes.value.data);
      }

      // Event history
      if (eventsRes.status === 'fulfilled' && eventsRes.value.data) {
        setEventHistory(Array.isArray(eventsRes.value.data) ? eventsRes.value.data : []);
      }
    } catch {
      message.warning('Không thể tải dữ liệu cấp cứu thảm họa');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getAlertLevelColor = (level: number) => {
    switch (level) {
      case 2: return '#faad14'; // Yellow
      case 3: return '#fa8c16'; // Orange
      case 4: return '#f5222d'; // Red
      default: return '#52c41a'; // Green
    }
  };

  const getAlertLevelLabel = (level: number, name?: string) => {
    if (name) return name;
    switch (level) {
      case 1: return 'CODE GREEN (sẵn sàng)';
      case 2: return 'CODE YELLOW (5-10 nạn nhân)';
      case 3: return 'CODE ORANGE (10-50 nạn nhân)';
      case 4: return 'CODE RED (>50 nạn nhân hoặc CBRN)';
      default: return `Level ${level}`;
    }
  };

  const getTriageColor = (category: string, color?: string) => {
    if (color) return color;
    switch (category) {
      case 'Immediate': return '#f5222d';
      case 'Delayed': return '#faad14';
      case 'Minor': return '#52c41a';
      case 'Expectant':
      case 'Deceased': return '#000000';
      default: return '#1890ff';
    }
  };

  const getTriageLabel = (category: string, name?: string) => {
    if (name) return name;
    switch (category) {
      case 'Immediate': return 'ĐỎ - Cấp cứu ngay';
      case 'Delayed': return 'VÀNG - Trì hoãn được';
      case 'Minor': return 'XANH - Nhẹ';
      case 'Expectant': return 'ĐEN - Không cứu được';
      case 'Deceased': return 'ĐEN - Tử vong';
      default: return category;
    }
  };

  const getStatusTag = (status: number, statusName?: string) => {
    const configs: Record<number, { color: string; label: string }> = {
      1: { color: 'processing', label: 'Phân loại' },
      2: { color: 'blue', label: 'Điều trị' },
      3: { color: 'green', label: 'Đã xử lý' },
    };
    const config = configs[status] || { color: 'default', label: statusName || `Status ${status}` };
    return <Tag color={config.color}>{statusName || config.label}</Tag>;
  };

  const getDispositionTag = (disposition?: string, dispositionName?: string) => {
    if (!disposition) return '-';
    const configs: Record<string, { color: string; label: string }> = {
      Admitted: { color: 'blue', label: 'Nhập viện' },
      OR: { color: 'orange', label: 'Phẫu thuật' },
      ICU: { color: 'red', label: 'ICU' },
      Discharged: { color: 'green', label: 'Xuất viện' },
      Transferred: { color: 'purple', label: 'Chuyển viện' },
      Deceased: { color: 'default', label: 'Tử vong' },
    };
    const config = configs[disposition] || { color: 'default', label: dispositionName || disposition };
    return <Tag color={config.color}>{dispositionName || config.label}</Tag>;
  };

  const victimColumns: ColumnsType<MCIVictimDto> = [
    {
      title: 'Tag',
      dataIndex: 'victimCode',
      key: 'victimCode',
      render: (code, record) => (
        <Tag
          color={getTriageColor(record.triageCategory, record.triageColor)}
          style={{ fontWeight: 'bold', fontSize: 14 }}
        >
          {code || record.temporaryId}
        </Tag>
      ),
    },
    {
      title: 'Phân loại',
      dataIndex: 'triageCategory',
      key: 'triageCategory',
      filters: [
        { text: 'Đỏ', value: 'Immediate' },
        { text: 'Vàng', value: 'Delayed' },
        { text: 'Xanh', value: 'Minor' },
        { text: 'Đen', value: 'Expectant' },
      ],
      onFilter: (value, record) => record.triageCategory === value,
      render: (category, record) => (
        <Badge color={getTriageColor(category, record.triageColor)} text={getTriageLabel(category, record.triageCategoryName)} />
      ),
    },
    {
      title: 'Họ tên',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (name) => name || <Text type="secondary">Chưa xác định</Text>,
    },
    {
      title: 'Thương tích',
      key: 'injuries',
      width: 200,
      ellipsis: true,
      render: (_, record) => {
        const injuries = record.injuries;
        if (!injuries || injuries.length === 0) return record.chiefComplaint || '-';
        return injuries.join(', ');
      },
    },
    {
      title: 'Vị trí',
      dataIndex: 'assignedAreaName',
      key: 'assignedAreaName',
      render: (loc, record) => (
        <Space>
          <EnvironmentOutlined />
          {loc || record.assignedArea || '-'}
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_, record) => record.disposition
        ? getDispositionTag(record.disposition, record.dispositionName)
        : getStatusTag(record.status, record.statusName),
    },
    {
      title: 'Bác sĩ',
      dataIndex: 'attendingDoctorName',
      key: 'attendingDoctorName',
      render: (doc) => doc || '-',
    },
    {
      title: 'Liên lạc GĐ',
      dataIndex: 'familyNotified',
      key: 'familyNotified',
      render: (notified, record) => (
        notified ? (
          <Tag icon={<CheckCircleOutlined />} color="success">Đã liên lạc</Tag>
        ) : (
          <Button
            size="small"
            type="link"
            icon={<PhoneOutlined />}
            onClick={async () => {
              if (!record.familyContactPhone) {
                message.warning('Chưa có thông tin liên lạc gia đình');
                return;
              }
              try {
                await notifyFamily({
                  victimId: record.id,
                  contactName: record.familyContactName || '',
                  relationship: '',
                  phone: record.familyContactPhone,
                  notificationType: 'Initial',
                  message: `Thông báo về nạn nhân ${record.fullName || record.victimCode}`,
                  notificationMethod: 'Phone',
                });
                message.success('Đã gửi thông báo cho gia đình');
                fetchData();
              } catch {
                message.warning('Không thể gửi thông báo');
              }
            }}
          >
            Liên lạc
          </Button>
        )
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            onClick={() => {
              setSelectedVictim(record);
              setVictimDetailModalVisible(true);
            }}
          >
            Chi tiết
          </Button>
          <Button
            type="link"
            onClick={async () => {
              try {
                await updateVictim({
                  victimId: record.id,
                  treatmentNotes: record.treatmentNotes,
                });
                message.success('Đã cập nhật');
                fetchData();
              } catch {
                message.warning('Không thể cập nhật nạn nhân');
              }
            }}
          >
            Cập nhật
          </Button>
        </Space>
      ),
    },
  ];

  const handleActivateMCI = async (values: ActivateFormValues) => {
    try {
      const dto: ActivateMCIDto = {
        eventName: values.description,
        eventType: values.eventType || 'Transport',
        alertLevel: values.alertLevel,
        location: values.location,
        estimatedCasualties: values.estimatedCasualties ? Number(values.estimatedCasualties) : 0,
        description: values.description,
      };
      const res = await activateMCI(dto);
      if (res.data) {
        message.success(`Đã kích hoạt ${getAlertLevelLabel(values.alertLevel)}! Mã sự kiện: ${res.data.eventCode || ''}`);
        if (res.data.warnings && res.data.warnings.length > 0) {
          res.data.warnings.forEach((w: string) => message.warning(w));
        }
      }
      setActivateModalVisible(false);
      activateForm.resetFields();
      fetchData();
    } catch {
      message.warning('Không thể kích hoạt sự kiện MCI');
    }
  };

  const handleAddVictim = async (values: VictimFormValues) => {
    if (!mciEvent) return;
    try {
      const dto: RegisterVictimDto = {
        eventId: mciEvent.id,
        fullName: values.name || undefined,
        estimatedAge: values.estimatedAge ? Number(values.estimatedAge) : undefined,
        gender: values.gender || undefined,
        chiefComplaint: values.currentLocation || undefined,
        injuries: values.injuries ? [values.injuries] : undefined,
        ambulatory: values.triageCategory === 'green',
      };
      await registerVictim(dto);
      message.success('Đã thêm nạn nhân mới!');
      setAddVictimModalVisible(false);
      victimForm.resetFields();
      fetchData();
    } catch {
      message.warning('Không thể thêm nạn nhân');
    }
  };

  const handleEndMCI = () => {
    Modal.confirm({
      title: 'Kết thúc sự kiện MCI?',
      content: 'Bạn chắc chắn muốn kết thúc sự kiện cấp cứu thảm họa này?',
      onOk: async () => {
        if (mciEvent) {
          try {
            await deactivateMCI({
              eventId: mciEvent.id,
              reason: 'Kết thúc sự kiện',
            });
            message.success('Đã kết thúc sự kiện MCI');
            fetchData();
          } catch {
            message.warning('Không thể kết thúc sự kiện');
          }
        }
      },
    });
  };

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && mciEvent) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Báo cáo Cấp cứu Thảm họa</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { text-align: center; color: #f5222d; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #000; padding: 8px; text-align: left; }
              th { background-color: #f0f0f0; }
              .header { text-align: center; margin-bottom: 20px; }
              .stats { display: flex; justify-content: space-around; margin: 20px 0; }
              .stat-box { text-align: center; padding: 10px; border: 1px solid #ddd; }
              .red { color: red; }
              .yellow { color: orange; }
              .green { color: green; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>BỆNH VIỆN CẤP CỨU</h2>
              <h1>BÁO CÁO SỰ KIỆN CẤP CỨU THẢM HỌA</h1>
            </div>

            <h3>Thông tin sự kiện</h3>
            <table>
              <tr><td><strong>Mã sự kiện:</strong></td><td>${mciEvent.eventCode}</td></tr>
              <tr><td><strong>Cấp độ:</strong></td><td>${getAlertLevelLabel(mciEvent.alertLevel, mciEvent.alertLevelName)}</td></tr>
              <tr><td><strong>Mô tả:</strong></td><td>${mciEvent.eventName}</td></tr>
              <tr><td><strong>Địa điểm:</strong></td><td>${mciEvent.location}</td></tr>
              <tr><td><strong>Thời gian kích hoạt:</strong></td><td>${mciEvent.activatedAt}</td></tr>
              <tr><td><strong>Người kích hoạt:</strong></td><td>${mciEvent.activatedByName || mciEvent.activatedBy}</td></tr>
            </table>

            <h3>Thống kê nạn nhân</h3>
            <div class="stats">
              <div class="stat-box"><span class="red">ĐỎ: ${mciEvent.immediateRed ?? redCount}</span></div>
              <div class="stat-box"><span class="yellow">VÀNG: ${mciEvent.delayedYellow ?? yellowCount}</span></div>
              <div class="stat-box"><span class="green">XANH: ${mciEvent.minorGreen ?? greenCount}</span></div>
              <div class="stat-box">ĐEN: ${mciEvent.expectantBlack ?? blackCount}</div>
              <div class="stat-box"><strong>TỔNG: ${mciEvent.totalVictims ?? victims.length}</strong></div>
            </div>

            <h3>Danh sách nạn nhân</h3>
            <table>
              <tr>
                <th>Tag</th>
                <th>Phân loại</th>
                <th>Họ tên</th>
                <th>Thương tích</th>
                <th>Vị trí</th>
                <th>Trạng thái</th>
              </tr>
              ${victims.map(v => `
                <tr>
                  <td>${v.victimCode || v.temporaryId}</td>
                  <td>${getTriageLabel(v.triageCategory, v.triageCategoryName)}</td>
                  <td>${v.fullName || 'Chưa xác định'}</td>
                  <td>${v.injuries ? v.injuries.join(', ') : v.chiefComplaint || ''}</td>
                  <td>${v.assignedAreaName || v.assignedArea || ''}</td>
                  <td>${v.dispositionName || v.statusName || ''}</td>
                </tr>
              `).join('')}
            </table>

            <p style="margin-top: 30px; text-align: right;">
              Ngày in: ${dayjs().format('DD/MM/YYYY HH:mm')}
            </p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Build resource display items from MCIResourceDto
  const resourceItems: { id: string; type: string; name: string; total: number; available: number; reserved: number }[] = [];
  if (resources) {
    const bed = resources.bedSummary;
    if (bed) {
      resourceItems.push(
        { id: 'bed', type: 'bed', name: 'Giường cấp cứu', total: bed.totalReserved + bed.available, available: bed.available, reserved: bed.occupied },
        { id: 'icu', type: 'icu', name: 'Giường ICU', total: bed.icuReserved + bed.icuAvailable, available: bed.icuAvailable, reserved: bed.icuOccupied },
      );
    }
    const or = resources.orSummary;
    if (or) {
      resourceItems.push(
        { id: 'or', type: 'or', name: 'Phòng mổ', total: or.totalReady, available: or.available, reserved: or.inUse },
      );
    }
    const equip = resources.equipmentSummary;
    if (equip?.ventilators) {
      resourceItems.push(
        { id: 'vent', type: 'ventilator', name: 'Máy thở', total: equip.ventilators.total, available: equip.ventilators.available, reserved: equip.ventilators.inUse },
      );
    }
    const blood = resources.bloodSummary;
    if (blood) {
      resourceItems.push(
        { id: 'blood-o', type: 'blood', name: 'Máu O+ (đơn vị)', total: blood.unitsReady, available: blood.oPositive, reserved: blood.unitsReady - blood.oPositive },
        { id: 'blood-a', type: 'blood', name: 'Máu A+ (đơn vị)', total: blood.unitsReady, available: blood.aPositive, reserved: blood.unitsReady - blood.aPositive },
      );
    }
    const staff = resources.staffSummary;
    if (staff) {
      resourceItems.push(
        { id: 'staff-doc', type: 'staff', name: 'Bác sĩ', total: staff.physicians + staff.nurses, available: staff.physicians, reserved: staff.present },
        { id: 'staff-nurse', type: 'staff', name: 'Điều dưỡng', total: staff.nurses + staff.support, available: staff.nurses, reserved: staff.present },
      );
    }
  }

  // If no resource data yet, show empty
  if (resourceItems.length === 0 && mciEvent) {
    // Fallback using event-level stats
    resourceItems.push(
      { id: 'bed-f', type: 'bed', name: 'Giường đã phân bổ', total: mciEvent.bedsReserved || 0, available: mciEvent.bedsReserved || 0, reserved: 0 },
      { id: 'icu-f', type: 'icu', name: 'Giường ICU', total: mciEvent.icuBedsReady || 0, available: mciEvent.icuBedsReady || 0, reserved: 0 },
      { id: 'or-f', type: 'or', name: 'Phòng mổ', total: mciEvent.orsReady || 0, available: mciEvent.orsReady || 0, reserved: 0 },
      { id: 'blood-f', type: 'blood', name: 'Máu (đơn vị)', total: mciEvent.bloodUnitsReady || 0, available: mciEvent.bloodUnitsReady || 0, reserved: 0 },
    );
  }

  // Build staff cards from command center or resources
  const staffCards: { id: string; name: string; role: string; department: string; status: string; phone: string; notifiedAt?: string }[] = [];
  if (commandCenter) {
    if (commandCenter.incidentCommander) {
      const ic = commandCenter.incidentCommander;
      staffCards.push({
        id: ic.staffId, name: ic.staffName, role: 'Chỉ huy trưởng', department: ic.position,
        status: 'arrived', phone: ic.phone, notifiedAt: ic.assignedAt,
      });
    }
    if (commandCenter.sectionChiefs) {
      commandCenter.sectionChiefs.forEach(sc => {
        staffCards.push({
          id: sc.staffId, name: sc.staffName, role: sc.sectionName, department: sc.section,
          status: 'arrived', phone: sc.phone,
        });
      });
    }
  }
  if (resources?.staffSummary?.byDepartment) {
    resources.staffSummary.byDepartment.forEach((dept: DepartmentStaffDto) => {
      staffCards.push({
        id: dept.departmentId, name: `${dept.total} nhân viên`, role: dept.departmentName,
        department: dept.departmentName, status: 'on_duty', phone: '',
      });
    });
  }

  // Build timeline items from activity log
  const timelineItems = activityLog.length > 0
    ? activityLog.slice(0, 10).map((log, idx) => ({
        key: log.id || `log-${idx}`,
        color: log.activityType === 'Alert' ? 'red' : log.activityType === 'Resource' ? 'blue' : 'green',
        content: (
          <>
            <Text strong>{dayjs(log.timestamp).format('HH:mm')} - {log.description}</Text>
            <br />
            <Text type="secondary">{log.performedBy}{log.details ? ` - ${log.details}` : ''}</Text>
          </>
        ),
      }))
    : mciEvent ? [
        {
          key: 'activated',
          color: 'red' as const,
          content: (
            <>
              <Text strong>{dayjs(mciEvent.activatedAt).format('HH:mm')} - Kích hoạt {getAlertLevelLabel(mciEvent.alertLevel, mciEvent.alertLevelName)}</Text>
              <br />
              <Text type="secondary">{mciEvent.eventName}</Text>
            </>
          ),
        },
        {
          key: 'staff',
          color: 'blue' as const,
          content: (
            <>
              <Text strong>{dayjs(mciEvent.activatedAt).add(2, 'minute').format('HH:mm')} - Huy động nhân lực</Text>
              <br />
              <Text type="secondary">{mciEvent.staffActivated} nhân viên được thông báo</Text>
            </>
          ),
        },
        ...(victims.length > 0 ? [{
          key: 'first-victim',
          color: 'green' as const,
          content: (
            <>
              <Text strong>{dayjs(victims[victims.length - 1]?.arrivalTime || mciEvent.activatedAt).format('HH:mm')} - Nạn nhân đầu tiên đến</Text>
              <br />
              <Text type="secondary">Đã tiếp nhận {victims.length} nạn nhân</Text>
            </>
          ),
        }] : []),
      ] : [];

  const tabItems = [
    {
      key: 'dashboard',
      label: (
        <span>
          <AlertOutlined />
          Dashboard
        </span>
      ),
      children: (
        <div>
          {/* Triage Summary */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card style={{ backgroundColor: '#fff1f0', borderColor: '#ffa39e' }}>
                <Statistic
                  title={<span style={{ color: '#cf1322' }}>ĐỎ - Cấp cứu ngay</span>}
                  value={mciEvent?.immediateRed ?? redCount}
                  styles={{ content: { color: '#cf1322', fontSize: 48 } }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card style={{ backgroundColor: '#fffbe6', borderColor: '#ffe58f' }}>
                <Statistic
                  title={<span style={{ color: '#d48806' }}>VÀNG - Trì hoãn được</span>}
                  value={mciEvent?.delayedYellow ?? yellowCount}
                  styles={{ content: { color: '#d48806', fontSize: 48 } }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card style={{ backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}>
                <Statistic
                  title={<span style={{ color: '#389e0d' }}>XANH - Nhẹ</span>}
                  value={mciEvent?.minorGreen ?? greenCount}
                  styles={{ content: { color: '#389e0d', fontSize: 48 } }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card style={{ backgroundColor: '#f5f5f5', borderColor: '#d9d9d9' }}>
                <Statistic
                  title="ĐEN - Tử vong"
                  value={(mciEvent?.expectantBlack ?? 0) + (mciEvent?.deceased ?? blackCount)}
                  styles={{ content: { fontSize: 48 } }}
                />
              </Card>
            </Col>
          </Row>

          {/* Resources */}
          <Card title="Tài nguyên khả dụng" style={{ marginBottom: 24 }}>
            <Row gutter={16}>
              {resourceItems.slice(0, 4).map(r => (
                <Col span={6} key={r.id}>
                  <Card size="small">
                    <Statistic
                      title={r.name}
                      value={r.available}
                      suffix={`/ ${r.total}`}
                      styles={{ content: { color: r.available < 3 ? '#cf1322' : '#3f8600' } }}
                    />
                    <Progress
                      percent={r.total > 0 ? Math.round((r.available / r.total) * 100) : 0}
                      status={r.available < 3 ? 'exception' : 'normal'}
                      size="small"
                    />
                    <Text type="secondary">Đã phân bổ: {r.reserved}</Text>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>

          {/* Timeline */}
          <Card title="Diễn biến sự kiện">
            {timelineItems.length > 0 ? (
              <Timeline items={timelineItems} />
            ) : (
              <Text type="secondary">Chưa có diễn biến nào</Text>
            )}
          </Card>
        </div>
      ),
    },
    {
      key: 'victims',
      label: (
        <span>
          <UserOutlined />
          Nạn nhân ({mciEvent?.totalVictims ?? victims.length})
        </span>
      ),
      children: (
        <div>
          <Space style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAddVictimModalVisible(true)}
            >
              Thêm nạn nhân
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>
              Làm mới
            </Button>
            <Button icon={<PrinterOutlined />} onClick={handlePrintReport}>
              In báo cáo
            </Button>
          </Space>
          <Table
            columns={victimColumns}
            dataSource={victims}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            rowClassName={(record) => {
              if (record.triageCategory === 'Immediate' || record.triageColor === 'red') return 'ant-table-row-red';
              return '';
            }}
            onRow={(record) => ({
              onDoubleClick: () => {
                setSelectedVictim(record);
                setVictimDetailModalVisible(true);
              },
              style: { cursor: 'pointer' },
            })}
          />
        </div>
      ),
    },
    {
      key: 'resources',
      label: (
        <span>
          <MedicineBoxOutlined />
          Tài nguyên
        </span>
      ),
      children: (
        <div>
          <Row gutter={16}>
            <Col span={12}>
              <Card title="Giường & Phòng">
                <div>
                  {resourceItems.filter(r => ['bed', 'icu', 'or'].includes(r.type)).map((item) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500 }}>{item.name}</div>
                        <div style={{ color: 'rgba(0,0,0,0.45)', fontSize: 14 }}>{`Khả dụng: ${item.available} / ${item.total}`}</div>
                      </div>
                      <Progress
                        percent={item.total > 0 ? Math.round((item.available / item.total) * 100) : 0}
                        status={item.available < 3 ? 'exception' : 'normal'}
                        style={{ width: 100 }}
                      />
                    </div>
                  ))}
                </div>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="Máu & Thiết bị">
                <div>
                  {resourceItems.filter(r => ['blood', 'ventilator', 'staff'].includes(r.type)).map((item) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500 }}>{item.name}</div>
                        <div style={{ color: 'rgba(0,0,0,0.45)', fontSize: 14 }}>{`Khả dụng: ${item.available} / ${item.total}`}</div>
                      </div>
                      <Progress
                        percent={item.total > 0 ? Math.round((item.available / item.total) * 100) : 0}
                        status={item.available < 10 ? 'exception' : 'normal'}
                        style={{ width: 100 }}
                      />
                    </div>
                  ))}
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'staff',
      label: (
        <span>
          <TeamOutlined />
          Nhân sự ({staffCards.length || (mciEvent?.staffActivated ?? 0)})
        </span>
      ),
      children: (
        <div>
          <Alert
            title="Tình trạng nhân sự"
            description={`${staffCards.filter(s => s.status === 'arrived').length} nhân viên đã có mặt, ${staffCards.filter(s => s.status === 'notified').length} đang trên đường. Tổng đã huy động: ${mciEvent?.staffActivated ?? 0}`}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          {staffCards.length > 0 ? (
            <Row gutter={16}>
              {staffCards.map((item) => (
                <Col key={item.id} span={8} style={{ marginBottom: 16 }}>
                  <Card size="small">
                    <Card.Meta
                      avatar={<Avatar icon={<UserOutlined />} />}
                      title={item.name}
                      description={
                        <>
                          <Text>{item.role} - {item.department}</Text>
                          <br />
                          <Tag
                            color={
                              item.status === 'arrived' ? 'success' :
                              item.status === 'on_duty' ? 'processing' :
                              item.status === 'notified' ? 'warning' : 'default'
                            }
                          >
                            {item.status === 'arrived' ? 'Đã có mặt' :
                             item.status === 'on_duty' ? 'Đang trực' :
                             item.status === 'notified' ? 'Đã thông báo' : 'Chờ'}
                          </Tag>
                          <br />
                          {item.phone && <><PhoneOutlined /> {item.phone}</>}
                        </>
                      }
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          ) : (
            <Text type="secondary">Chưa có dữ liệu nhân sự</Text>
          )}
        </div>
      ),
    },
    {
      key: 'triage',
      label: (
        <span>
          <AlertOutlined />
          Hướng dẫn START
        </span>
      ),
      children: (
        <Card title="Quy trình Phân loại START">
          <Steps
            direction="vertical"
            items={[
              {
                title: 'Bước 1: Đi lại được?',
                description: 'Có → XANH (Minor). Không → Tiếp tục',
                status: 'process',
              },
              {
                title: 'Bước 2: Tự thở?',
                description: 'Không → Mở đường thở → Vẫn không thở → ĐEN (Tử vong)',
                status: 'process',
              },
              {
                title: 'Bước 3: Nhịp thở',
                description: '>30 lần/phút → ĐỎ (Immediate)',
                status: 'process',
              },
              {
                title: 'Bước 4: Mạch quay',
                description: 'Không có mạch quay → ĐỎ (Immediate)',
                status: 'process',
              },
              {
                title: 'Bước 5: Làm theo lệnh',
                description: 'Không làm theo lệnh đơn giản → ĐỎ. Có → VÀNG (Delayed)',
                status: 'process',
              },
            ]}
          />
          <Divider />
          <Row gutter={16}>
            <Col span={6}>
              <Card size="small" style={{ backgroundColor: '#fff1f0' }}>
                <Title level={4} style={{ color: '#cf1322' }}>ĐỎ</Title>
                <Text>Cấp cứu ngay lập tức</Text>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ backgroundColor: '#fffbe6' }}>
                <Title level={4} style={{ color: '#d48806' }}>VÀNG</Title>
                <Text>Có thể trì hoãn 1-4h</Text>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ backgroundColor: '#f6ffed' }}>
                <Title level={4} style={{ color: '#389e0d' }}>XANH</Title>
                <Text>Thương tích nhẹ</Text>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ backgroundColor: '#f5f5f5' }}>
                <Title level={4}>ĐEN</Title>
                <Text>Tử vong/Không cứu</Text>
              </Card>
            </Col>
          </Row>
        </Card>
      ),
    },
  ];

  return (
    <Spin spinning={loading}>
      <div style={{ position: 'relative', minHeight: '100vh' }}>
        {/* Gradient mesh background */}
        <div style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '10%', left: '20%', width: 300, height: 300, background: 'rgba(59,130,246,0.08)', borderRadius: '50%', filter: 'blur(80px)' }} />
          <div style={{ position: 'absolute', top: '40%', right: '20%', width: 300, height: 300, background: 'rgba(168,85,247,0.08)', borderRadius: '50%', filter: 'blur(80px)' }} />
        </div>
        {/* Header with MCI Status */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        {mciEvent && (mciEvent.status === 1 || mciEvent.status === 2) ? (
          <Alert
            title={
              <Space>
                <SoundOutlined />
                <Text strong style={{ fontSize: 18 }}>
                  {getAlertLevelLabel(mciEvent.alertLevel, mciEvent.alertLevelName)} - {mciEvent.statusName || 'ĐANG HOẠT ĐỘNG'}
                </Text>
              </Space>
            }
            description={
              <Row gutter={16}>
                <Col span={8}>
                  <Text>Mô tả: {mciEvent.eventName}</Text>
                </Col>
                <Col span={8}>
                  <Text>Địa điểm: {mciEvent.location}</Text>
                </Col>
                <Col span={8}>
                  <Text>Kích hoạt: {dayjs(mciEvent.activatedAt).format('YYYY-MM-DD HH:mm:ss')}</Text>
                </Col>
              </Row>
            }
            type="error"
            showIcon
            icon={<AlertOutlined />}
            action={
              <Space orientation="vertical">
                <Button danger onClick={handleEndMCI}>
                  Kết thúc sự kiện
                </Button>
                <Button onClick={handlePrintReport} icon={<PrinterOutlined />}>
                  Báo cáo
                </Button>
                <Button icon={<ReloadOutlined />} onClick={fetchData}>
                  Làm mới
                </Button>
              </Space>
            }
            style={{ marginBottom: 24 }}
          />
        ) : (
          <Card style={{ marginBottom: 24 }}>
            <Row justify="space-between" align="middle">
              <Col>
                <Title level={3} style={{ margin: 0 }}>
                  <AlertOutlined /> Cấp cứu Thảm họa (MCI)
                </Title>
                <Text type="secondary">Không có sự kiện MCI đang hoạt động</Text>
                {dashboard && (
                  <div style={{ marginTop: 8 }}>
                    <Space>
                      <Text type="secondary">Sự kiện trong năm: {dashboard.eventsThisYear}</Text>
                      <Text type="secondary">|</Text>
                      <Text type="secondary">Nạn nhân trong năm: {dashboard.totalVictimsThisYear}</Text>
                      <Text type="secondary">|</Text>
                      <Text type="secondary">Điểm sẵn sàng: {dashboard.readinessScore}%</Text>
                      <Text type="secondary">|</Text>
                      <Text type="secondary">Nhân viên trực: {dashboard.staffOnCall}</Text>
                    </Space>
                  </div>
                )}
              </Col>
              <Col>
                <Space>
                  <Button icon={<ReloadOutlined />} onClick={fetchData}>
                    Làm mới
                  </Button>
                  <Button
                    type="primary"
                    danger
                    size="large"
                    icon={<BellOutlined />}
                    onClick={() => setActivateModalVisible(true)}
                  >
                    KÍCH HOẠT MCI
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>
        )}
        </motion.div>

        {/* Main Content */}
        {mciEvent && (mciEvent.status === 1 || mciEvent.status === 2) && (
          <Card>
            <Tabs items={tabItems} />
          </Card>
        )}

        {/* Event History when no active event */}
        {(!mciEvent || (mciEvent.status !== 1 && mciEvent.status !== 2)) && eventHistory.length > 0 && (
          <Card title="Lịch sử sự kiện MCI" style={{ marginTop: 16 }}>
            <Table
              dataSource={eventHistory}
              rowKey="id"
              pagination={{ pageSize: 5 }}
              columns={[
                { title: 'Mã', dataIndex: 'eventCode', key: 'eventCode' },
                { title: 'Tên sự kiện', dataIndex: 'eventName', key: 'eventName' },
                {
                  title: 'Cấp độ', dataIndex: 'alertLevel', key: 'alertLevel',
                  render: (level: number, record: MCIEventDto) => (
                    <Tag color={getAlertLevelColor(level)}>{record.alertLevelName || `Level ${level}`}</Tag>
                  ),
                },
                { title: 'Địa điểm', dataIndex: 'location', key: 'location' },
                {
                  title: 'Thời gian', dataIndex: 'activatedAt', key: 'activatedAt',
                  render: (val: string) => dayjs(val).format('DD/MM/YYYY HH:mm'),
                },
                {
                  title: 'Nạn nhân', dataIndex: 'totalVictims', key: 'totalVictims',
                },
                {
                  title: 'Trạng thái', dataIndex: 'statusName', key: 'statusName',
                  render: (name: string, record: MCIEventDto) => {
                    const color = record.status === 4 ? 'default' : record.status === 3 ? 'warning' : 'success';
                    return <Tag color={color}>{name || `Status ${record.status}`}</Tag>;
                  },
                },
              ]}
            />
          </Card>
        )}

        {/* Activate MCI Modal */}
        <Modal
          title={
            <Space>
              <AlertOutlined style={{ color: '#f5222d' }} />
              <span>Kích hoạt Code Cấp cứu Thảm họa</span>
            </Space>
          }
          open={activateModalVisible}
          onCancel={() => setActivateModalVisible(false)}
          onOk={() => activateForm.submit()}
          okText="KÍCH HOẠT"
          okButtonProps={{ danger: true }}
          width={600}
        >
          <Alert
            title="Cảnh báo"
            description="Kích hoạt Code MCI sẽ gửi thông báo đến tất cả nhân viên và khởi động quy trình cấp cứu thảm họa."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Form form={activateForm} layout="vertical" onFinish={handleActivateMCI}>
            <Form.Item name="alertLevel" label="Cấp độ" rules={[{ required: true, message: 'Vui lòng chọn cấp độ' }]}>
              <Select>
                <Select.Option value={2}>
                  <Tag color="yellow">CODE YELLOW</Tag> - 5-10 nạn nhân
                </Select.Option>
                <Select.Option value={3}>
                  <Tag color="orange">CODE ORANGE</Tag> - 10-50 nạn nhân
                </Select.Option>
                <Select.Option value={4}>
                  <Tag color="red">CODE RED</Tag> - {'>'}50 nạn nhân hoặc CBRN
                </Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="eventType" label="Loại sự kiện" rules={[{ required: true, message: 'Vui lòng chọn loại sự kiện' }]}>
              <Select>
                <Select.Option value="Natural">Thiên tai</Select.Option>
                <Select.Option value="Industrial">Công nghiệp</Select.Option>
                <Select.Option value="Transport">Giao thông</Select.Option>
                <Select.Option value="Violence">Bạo lực</Select.Option>
                <Select.Option value="Other">Khác</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="description" label="Mô tả sự kiện" rules={[{ required: true, message: 'Vui lòng nhập mô tả' }]}>
              <Input placeholder="VD: Tai nạn giao thông, Hỏa hoạn..." />
            </Form.Item>
            <Form.Item name="location" label="Địa điểm" rules={[{ required: true, message: 'Vui lòng nhập địa điểm' }]}>
              <Input placeholder="VD: Cao tốc TP.HCM - Long Thành" />
            </Form.Item>
            <Form.Item name="estimatedCasualties" label="Số nạn nhân dự kiến">
              <Input type="number" />
            </Form.Item>
          </Form>
        </Modal>

        {/* Add Victim Modal */}
        <Modal
          title="Thêm nạn nhân"
          open={addVictimModalVisible}
          onCancel={() => setAddVictimModalVisible(false)}
          onOk={() => victimForm.submit()}
          width={600}
        >
          <Form form={victimForm} layout="vertical" onFinish={handleAddVictim}>
            <Form.Item
              name="triageCategory"
              label="Phân loại START"
              rules={[{ required: true, message: 'Vui lòng chọn phân loại' }]}
            >
              <Select>
                <Select.Option value="red">
                  <Tag color="red">ĐỎ</Tag> - Cấp cứu ngay
                </Select.Option>
                <Select.Option value="yellow">
                  <Tag color="orange">VÀNG</Tag> - Trì hoãn được
                </Select.Option>
                <Select.Option value="green">
                  <Tag color="green">XANH</Tag> - Nhẹ
                </Select.Option>
                <Select.Option value="black">
                  <Tag>ĐEN</Tag> - Tử vong
                </Select.Option>
              </Select>
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="name" label="Họ tên (nếu biết)">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="gender" label="Giới tính">
                  <Select>
                    <Select.Option value="male">Nam</Select.Option>
                    <Select.Option value="female">Nữ</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="estimatedAge" label="Tuổi ước tính">
                  <Input type="number" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="injuries" label="Mô tả thương tích" rules={[{ required: true, message: 'Vui lòng nhập mô tả thương tích' }]}>
              <TextArea rows={3} />
            </Form.Item>
            <Form.Item name="currentLocation" label="Vị trí hiện tại" rules={[{ required: true, message: 'Vui lòng chọn vị trí' }]}>
              <Select>
                <Select.Option value="Phòng mổ 1">Phòng mổ 1</Select.Option>
                <Select.Option value="Phòng mổ 2">Phòng mổ 2</Select.Option>
                <Select.Option value="ICU">ICU</Select.Option>
                <Select.Option value="Khu điều trị 1">Khu điều trị 1</Select.Option>
                <Select.Option value="Khu điều trị 2">Khu điều trị 2</Select.Option>
                <Select.Option value="Khu chờ">Khu chờ</Select.Option>
                <Select.Option value="Nhà xác">Nhà xác</Select.Option>
              </Select>
            </Form.Item>
          </Form>
        </Modal>

        {/* Victim Detail Modal */}
        <Modal
          title="Chi tiết nạn nhân"
          open={victimDetailModalVisible}
          onCancel={() => setVictimDetailModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setVictimDetailModalVisible(false)}>
              Đóng
            </Button>,
            <Button key="print" icon={<PrinterOutlined />}>
              In thẻ
            </Button>,
          ]}
          width={700}
        >
          {selectedVictim && (
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Tag" span={1}>
                <Tag
                  color={getTriageColor(selectedVictim.triageCategory, selectedVictim.triageColor)}
                  style={{ fontSize: 16, fontWeight: 'bold' }}
                >
                  {selectedVictim.victimCode || selectedVictim.temporaryId}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Phân loại" span={1}>
                <Badge
                  color={getTriageColor(selectedVictim.triageCategory, selectedVictim.triageColor)}
                  text={getTriageLabel(selectedVictim.triageCategory, selectedVictim.triageCategoryName)}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Họ tên" span={1}>
                {selectedVictim.fullName || 'Chưa xác định'}
              </Descriptions.Item>
              <Descriptions.Item label="Giới tính" span={1}>
                {selectedVictim.gender === 'male' ? 'Nam' : selectedVictim.gender === 'female' ? 'Nữ' : selectedVictim.gender || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Tuổi ước tính" span={1}>
                {selectedVictim.estimatedAge || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Thời gian đến" span={1}>
                {selectedVictim.arrivalTime ? dayjs(selectedVictim.arrivalTime).format('YYYY-MM-DD HH:mm:ss') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Thương tích" span={2}>
                {selectedVictim.injuries ? selectedVictim.injuries.join(', ') : selectedVictim.chiefComplaint || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Vị trí hiện tại" span={1}>
                {selectedVictim.assignedAreaName || selectedVictim.assignedArea || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái" span={1}>
                {selectedVictim.disposition
                  ? getDispositionTag(selectedVictim.disposition, selectedVictim.dispositionName)
                  : getStatusTag(selectedVictim.status, selectedVictim.statusName)}
              </Descriptions.Item>
              <Descriptions.Item label="Bác sĩ phụ trách" span={1}>
                {selectedVictim.attendingDoctorName || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Liên lạc gia đình" span={1}>
                {selectedVictim.familyNotified ? (
                  <Tag color="success">Đã liên lạc: {selectedVictim.familyContactPhone || selectedVictim.familyContactName}</Tag>
                ) : (
                  <Tag color="warning">Chưa liên lạc</Tag>
                )}
              </Descriptions.Item>
              {selectedVictim.vitalSigns && (
                <>
                  <Descriptions.Item label="Huyết áp" span={1}>
                    {selectedVictim.vitalSigns.bloodPressure || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Nhịp tim" span={1}>
                    {selectedVictim.vitalSigns.heartRate ? `${selectedVictim.vitalSigns.heartRate} bpm` : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="SpO2" span={1}>
                    {selectedVictim.vitalSigns.oxygenSaturation ? `${selectedVictim.vitalSigns.oxygenSaturation}%` : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="GCS" span={1}>
                    {selectedVictim.gcsScore || '-'}
                  </Descriptions.Item>
                </>
              )}
              {selectedVictim.treatmentNotes && (
                <Descriptions.Item label="Ghi chú điều trị" span={2}>
                  {selectedVictim.treatmentNotes}
                </Descriptions.Item>
              )}
            </Descriptions>
          )}
        </Modal>
      </div>
    </Spin>
  );
};

export default EmergencyDisaster;
