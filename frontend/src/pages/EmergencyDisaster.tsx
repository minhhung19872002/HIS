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
  Tooltip,
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
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
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
  type StaffResourceDto,
  type DepartmentStaffDto,
} from '../api/massCasualty';

const { Title, Text } = Typography;
const { TextArea } = Input;

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
      message.warning('Khong the tai du lieu cap cuu tham hoa');
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
      case 1: return 'CODE GREEN (san sang)';
      case 2: return 'CODE YELLOW (5-10 nan nhan)';
      case 3: return 'CODE ORANGE (10-50 nan nhan)';
      case 4: return 'CODE RED (>50 nan nhan hoac CBRN)';
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
      case 'Immediate': return 'DO - Cap cuu ngay';
      case 'Delayed': return 'VANG - Tri hoan duoc';
      case 'Minor': return 'XANH - Nhe';
      case 'Expectant': return 'DEN - Khong cuu duoc';
      case 'Deceased': return 'DEN - Tu vong';
      default: return category;
    }
  };

  const getStatusTag = (status: number, statusName?: string) => {
    const configs: Record<number, { color: string; label: string }> = {
      1: { color: 'processing', label: 'Phan loai' },
      2: { color: 'blue', label: 'Dieu tri' },
      3: { color: 'green', label: 'Da xu ly' },
    };
    const config = configs[status] || { color: 'default', label: statusName || `Status ${status}` };
    return <Tag color={config.color}>{statusName || config.label}</Tag>;
  };

  const getDispositionTag = (disposition?: string, dispositionName?: string) => {
    if (!disposition) return '-';
    const configs: Record<string, { color: string; label: string }> = {
      Admitted: { color: 'blue', label: 'Nhap vien' },
      OR: { color: 'orange', label: 'Phau thuat' },
      ICU: { color: 'red', label: 'ICU' },
      Discharged: { color: 'green', label: 'Xuat vien' },
      Transferred: { color: 'purple', label: 'Chuyen vien' },
      Deceased: { color: 'default', label: 'Tu vong' },
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
      title: 'Phan loai',
      dataIndex: 'triageCategory',
      key: 'triageCategory',
      filters: [
        { text: 'Do', value: 'Immediate' },
        { text: 'Vang', value: 'Delayed' },
        { text: 'Xanh', value: 'Minor' },
        { text: 'Den', value: 'Expectant' },
      ],
      onFilter: (value, record) => record.triageCategory === value,
      render: (category, record) => (
        <Badge color={getTriageColor(category, record.triageColor)} text={getTriageLabel(category, record.triageCategoryName)} />
      ),
    },
    {
      title: 'Ho ten',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (name) => name || <Text type="secondary">Chua xac dinh</Text>,
    },
    {
      title: 'Thuong tich',
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
      title: 'Vi tri',
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
      title: 'Trang thai',
      key: 'status',
      render: (_, record) => record.disposition
        ? getDispositionTag(record.disposition, record.dispositionName)
        : getStatusTag(record.status, record.statusName),
    },
    {
      title: 'Bac si',
      dataIndex: 'attendingDoctorName',
      key: 'attendingDoctorName',
      render: (doc) => doc || '-',
    },
    {
      title: 'Lien lac GD',
      dataIndex: 'familyNotified',
      key: 'familyNotified',
      render: (notified, record) => (
        notified ? (
          <Tag icon={<CheckCircleOutlined />} color="success">Da lien lac</Tag>
        ) : (
          <Button
            size="small"
            type="link"
            icon={<PhoneOutlined />}
            onClick={async () => {
              if (!record.familyContactPhone) {
                message.warning('Chua co thong tin lien lac gia dinh');
                return;
              }
              try {
                await notifyFamily({
                  victimId: record.id,
                  contactName: record.familyContactName || '',
                  relationship: '',
                  phone: record.familyContactPhone,
                  notificationType: 'Initial',
                  message: `Thong bao ve nan nhan ${record.fullName || record.victimCode}`,
                  notificationMethod: 'Phone',
                });
                message.success('Da gui thong bao cho gia dinh');
                fetchData();
              } catch {
                message.warning('Khong the gui thong bao');
              }
            }}
          >
            Lien lac
          </Button>
        )
      ),
    },
    {
      title: 'Thao tac',
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
            Chi tiet
          </Button>
          <Button
            type="link"
            onClick={async () => {
              try {
                await updateVictim({
                  victimId: record.id,
                  treatmentNotes: record.treatmentNotes,
                });
                message.success('Da cap nhat');
                fetchData();
              } catch {
                message.warning('Khong the cap nhat nan nhan');
              }
            }}
          >
            Cap nhat
          </Button>
        </Space>
      ),
    },
  ];

  const handleActivateMCI = async (values: any) => {
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
        message.success(`Da kich hoat ${getAlertLevelLabel(values.alertLevel)}! Ma su kien: ${res.data.eventCode || ''}`);
        if (res.data.warnings && res.data.warnings.length > 0) {
          res.data.warnings.forEach((w: string) => message.warning(w));
        }
      }
      setActivateModalVisible(false);
      activateForm.resetFields();
      fetchData();
    } catch {
      message.warning('Khong the kich hoat su kien MCI');
    }
  };

  const handleAddVictim = async (values: any) => {
    if (!mciEvent) return;
    try {
      const triageCategoryMap: Record<string, string> = {
        red: 'Immediate',
        yellow: 'Delayed',
        green: 'Minor',
        black: 'Expectant',
      };
      await registerVictim({
        eventId: mciEvent.id,
        fullName: values.name || undefined,
        estimatedAge: values.estimatedAge ? Number(values.estimatedAge) : undefined,
        gender: values.gender || undefined,
        chiefComplaint: values.currentLocation || undefined,
        injuries: values.injuries ? [values.injuries] : undefined,
        ambulatory: values.triageCategory === 'green',
      });
      message.success('Da them nan nhan moi!');
      setAddVictimModalVisible(false);
      victimForm.resetFields();
      fetchData();
    } catch {
      message.warning('Khong the them nan nhan');
    }
  };

  const handleEndMCI = () => {
    Modal.confirm({
      title: 'Ket thuc su kien MCI?',
      content: 'Ban chac chan muon ket thuc su kien cap cuu tham hoa nay?',
      onOk: async () => {
        if (mciEvent) {
          try {
            await deactivateMCI({
              eventId: mciEvent.id,
              reason: 'Ket thuc su kien',
            });
            message.success('Da ket thuc su kien MCI');
            fetchData();
          } catch {
            message.warning('Khong the ket thuc su kien');
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
            <title>Bao cao Cap cuu Tham hoa</title>
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
              <h2>BENH VIEN CAP CUU</h2>
              <h1>BAO CAO SU KIEN CAP CUU THAM HOA</h1>
            </div>

            <h3>Thong tin su kien</h3>
            <table>
              <tr><td><strong>Ma su kien:</strong></td><td>${mciEvent.eventCode}</td></tr>
              <tr><td><strong>Cap do:</strong></td><td>${getAlertLevelLabel(mciEvent.alertLevel, mciEvent.alertLevelName)}</td></tr>
              <tr><td><strong>Mo ta:</strong></td><td>${mciEvent.eventName}</td></tr>
              <tr><td><strong>Dia diem:</strong></td><td>${mciEvent.location}</td></tr>
              <tr><td><strong>Thoi gian kich hoat:</strong></td><td>${mciEvent.activatedAt}</td></tr>
              <tr><td><strong>Nguoi kich hoat:</strong></td><td>${mciEvent.activatedByName || mciEvent.activatedBy}</td></tr>
            </table>

            <h3>Thong ke nan nhan</h3>
            <div class="stats">
              <div class="stat-box"><span class="red">DO: ${mciEvent.immediateRed ?? redCount}</span></div>
              <div class="stat-box"><span class="yellow">VANG: ${mciEvent.delayedYellow ?? yellowCount}</span></div>
              <div class="stat-box"><span class="green">XANH: ${mciEvent.minorGreen ?? greenCount}</span></div>
              <div class="stat-box">DEN: ${mciEvent.expectantBlack ?? blackCount}</div>
              <div class="stat-box"><strong>TONG: ${mciEvent.totalVictims ?? victims.length}</strong></div>
            </div>

            <h3>Danh sach nan nhan</h3>
            <table>
              <tr>
                <th>Tag</th>
                <th>Phan loai</th>
                <th>Ho ten</th>
                <th>Thuong tich</th>
                <th>Vi tri</th>
                <th>Trang thai</th>
              </tr>
              ${victims.map(v => `
                <tr>
                  <td>${v.victimCode || v.temporaryId}</td>
                  <td>${getTriageLabel(v.triageCategory, v.triageCategoryName)}</td>
                  <td>${v.fullName || 'Chua xac dinh'}</td>
                  <td>${v.injuries ? v.injuries.join(', ') : v.chiefComplaint || ''}</td>
                  <td>${v.assignedAreaName || v.assignedArea || ''}</td>
                  <td>${v.dispositionName || v.statusName || ''}</td>
                </tr>
              `).join('')}
            </table>

            <p style="margin-top: 30px; text-align: right;">
              Ngay in: ${dayjs().format('DD/MM/YYYY HH:mm')}
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
        { id: 'bed', type: 'bed', name: 'Giuong cap cuu', total: bed.totalReserved + bed.available, available: bed.available, reserved: bed.occupied },
        { id: 'icu', type: 'icu', name: 'Giuong ICU', total: bed.icuReserved + bed.icuAvailable, available: bed.icuAvailable, reserved: bed.icuOccupied },
      );
    }
    const or = resources.orSummary;
    if (or) {
      resourceItems.push(
        { id: 'or', type: 'or', name: 'Phong mo', total: or.totalReady, available: or.available, reserved: or.inUse },
      );
    }
    const equip = resources.equipmentSummary;
    if (equip?.ventilators) {
      resourceItems.push(
        { id: 'vent', type: 'ventilator', name: 'May tho', total: equip.ventilators.total, available: equip.ventilators.available, reserved: equip.ventilators.inUse },
      );
    }
    const blood = resources.bloodSummary;
    if (blood) {
      resourceItems.push(
        { id: 'blood-o', type: 'blood', name: 'Mau O+ (don vi)', total: blood.unitsReady, available: blood.oPositive, reserved: blood.unitsReady - blood.oPositive },
        { id: 'blood-a', type: 'blood', name: 'Mau A+ (don vi)', total: blood.unitsReady, available: blood.aPositive, reserved: blood.unitsReady - blood.aPositive },
      );
    }
    const staff = resources.staffSummary;
    if (staff) {
      resourceItems.push(
        { id: 'staff-doc', type: 'staff', name: 'Bac si', total: staff.physicians + staff.nurses, available: staff.physicians, reserved: staff.present },
        { id: 'staff-nurse', type: 'staff', name: 'Dieu duong', total: staff.nurses + staff.support, available: staff.nurses, reserved: staff.present },
      );
    }
  }

  // If no resource data yet, show empty
  if (resourceItems.length === 0 && mciEvent) {
    // Fallback using event-level stats
    resourceItems.push(
      { id: 'bed-f', type: 'bed', name: 'Giuong da phan bo', total: mciEvent.bedsReserved || 0, available: mciEvent.bedsReserved || 0, reserved: 0 },
      { id: 'icu-f', type: 'icu', name: 'Giuong ICU', total: mciEvent.icuBedsReady || 0, available: mciEvent.icuBedsReady || 0, reserved: 0 },
      { id: 'or-f', type: 'or', name: 'Phong mo', total: mciEvent.orsReady || 0, available: mciEvent.orsReady || 0, reserved: 0 },
      { id: 'blood-f', type: 'blood', name: 'Mau (don vi)', total: mciEvent.bloodUnitsReady || 0, available: mciEvent.bloodUnitsReady || 0, reserved: 0 },
    );
  }

  // Build staff cards from command center or resources
  const staffCards: { id: string; name: string; role: string; department: string; status: string; phone: string; notifiedAt?: string }[] = [];
  if (commandCenter) {
    if (commandCenter.incidentCommander) {
      const ic = commandCenter.incidentCommander;
      staffCards.push({
        id: ic.staffId, name: ic.staffName, role: 'Chi huy truong', department: ic.position,
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
        id: dept.departmentId, name: `${dept.total} nhan vien`, role: dept.departmentName,
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
              <Text strong>{dayjs(mciEvent.activatedAt).format('HH:mm')} - Kich hoat {getAlertLevelLabel(mciEvent.alertLevel, mciEvent.alertLevelName)}</Text>
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
              <Text strong>{dayjs(mciEvent.activatedAt).add(2, 'minute').format('HH:mm')} - Huy dong nhan luc</Text>
              <br />
              <Text type="secondary">{mciEvent.staffActivated} nhan vien duoc thong bao</Text>
            </>
          ),
        },
        ...(victims.length > 0 ? [{
          key: 'first-victim',
          color: 'green' as const,
          content: (
            <>
              <Text strong>{dayjs(victims[victims.length - 1]?.arrivalTime || mciEvent.activatedAt).format('HH:mm')} - Nan nhan dau tien den</Text>
              <br />
              <Text type="secondary">Da tiep nhan {victims.length} nan nhan</Text>
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
                  title={<span style={{ color: '#cf1322' }}>DO - Cap cuu ngay</span>}
                  value={mciEvent?.immediateRed ?? redCount}
                  styles={{ content: { color: '#cf1322', fontSize: 48 } }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card style={{ backgroundColor: '#fffbe6', borderColor: '#ffe58f' }}>
                <Statistic
                  title={<span style={{ color: '#d48806' }}>VANG - Tri hoan duoc</span>}
                  value={mciEvent?.delayedYellow ?? yellowCount}
                  styles={{ content: { color: '#d48806', fontSize: 48 } }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card style={{ backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}>
                <Statistic
                  title={<span style={{ color: '#389e0d' }}>XANH - Nhe</span>}
                  value={mciEvent?.minorGreen ?? greenCount}
                  styles={{ content: { color: '#389e0d', fontSize: 48 } }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card style={{ backgroundColor: '#f5f5f5', borderColor: '#d9d9d9' }}>
                <Statistic
                  title="DEN - Tu vong"
                  value={(mciEvent?.expectantBlack ?? 0) + (mciEvent?.deceased ?? blackCount)}
                  styles={{ content: { fontSize: 48 } }}
                />
              </Card>
            </Col>
          </Row>

          {/* Resources */}
          <Card title="Tai nguyen kha dung" style={{ marginBottom: 24 }}>
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
                    <Text type="secondary">Da phan bo: {r.reserved}</Text>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>

          {/* Timeline */}
          <Card title="Dien bien su kien">
            {timelineItems.length > 0 ? (
              <Timeline items={timelineItems} />
            ) : (
              <Text type="secondary">Chua co dien bien nao</Text>
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
          Nan nhan ({mciEvent?.totalVictims ?? victims.length})
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
              Them nan nhan
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>
              Lam moi
            </Button>
            <Button icon={<PrinterOutlined />} onClick={handlePrintReport}>
              In bao cao
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
          Tai nguyen
        </span>
      ),
      children: (
        <div>
          <Row gutter={16}>
            <Col span={12}>
              <Card title="Giuong & Phong">
                <div>
                  {resourceItems.filter(r => ['bed', 'icu', 'or'].includes(r.type)).map((item) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500 }}>{item.name}</div>
                        <div style={{ color: 'rgba(0,0,0,0.45)', fontSize: 14 }}>{`Kha dung: ${item.available} / ${item.total}`}</div>
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
              <Card title="Mau & Thiet bi">
                <div>
                  {resourceItems.filter(r => ['blood', 'ventilator', 'staff'].includes(r.type)).map((item) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500 }}>{item.name}</div>
                        <div style={{ color: 'rgba(0,0,0,0.45)', fontSize: 14 }}>{`Kha dung: ${item.available} / ${item.total}`}</div>
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
          Nhan su ({staffCards.length || (mciEvent?.staffActivated ?? 0)})
        </span>
      ),
      children: (
        <div>
          <Alert
            title="Tinh trang nhan su"
            description={`${staffCards.filter(s => s.status === 'arrived').length} nhan vien da co mat, ${staffCards.filter(s => s.status === 'notified').length} dang tren duong. Tong da huy dong: ${mciEvent?.staffActivated ?? 0}`}
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
                            {item.status === 'arrived' ? 'Da co mat' :
                             item.status === 'on_duty' ? 'Dang truc' :
                             item.status === 'notified' ? 'Da thong bao' : 'Cho'}
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
            <Text type="secondary">Chua co du lieu nhan su</Text>
          )}
        </div>
      ),
    },
    {
      key: 'triage',
      label: (
        <span>
          <AlertOutlined />
          Huong dan START
        </span>
      ),
      children: (
        <Card title="Quy trinh Phan loai START">
          <Steps
            direction="vertical"
            items={[
              {
                title: 'Buoc 1: Di lai duoc?',
                description: 'Co → XANH (Minor). Khong → Tiep tuc',
                status: 'process',
              },
              {
                title: 'Buoc 2: Tu tho?',
                description: 'Khong → Mo duong tho → Van khong tho → DEN (Tu vong)',
                status: 'process',
              },
              {
                title: 'Buoc 3: Nhip tho',
                description: '>30 lan/phut → DO (Immediate)',
                status: 'process',
              },
              {
                title: 'Buoc 4: Mach quay',
                description: 'Khong co mach quay → DO (Immediate)',
                status: 'process',
              },
              {
                title: 'Buoc 5: Lam theo lenh',
                description: 'Khong lam theo lenh don gian → DO. Co → VANG (Delayed)',
                status: 'process',
              },
            ]}
          />
          <Divider />
          <Row gutter={16}>
            <Col span={6}>
              <Card size="small" style={{ backgroundColor: '#fff1f0' }}>
                <Title level={4} style={{ color: '#cf1322' }}>DO</Title>
                <Text>Cap cuu ngay lap tuc</Text>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ backgroundColor: '#fffbe6' }}>
                <Title level={4} style={{ color: '#d48806' }}>VANG</Title>
                <Text>Co the tri hoan 1-4h</Text>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ backgroundColor: '#f6ffed' }}>
                <Title level={4} style={{ color: '#389e0d' }}>XANH</Title>
                <Text>Thuong tich nhe</Text>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ backgroundColor: '#f5f5f5' }}>
                <Title level={4}>DEN</Title>
                <Text>Tu vong/Khong cuu</Text>
              </Card>
            </Col>
          </Row>
        </Card>
      ),
    },
  ];

  return (
    <Spin spinning={loading}>
      <div>
        {/* Header with MCI Status */}
        {mciEvent && (mciEvent.status === 1 || mciEvent.status === 2) ? (
          <Alert
            title={
              <Space>
                <SoundOutlined />
                <Text strong style={{ fontSize: 18 }}>
                  {getAlertLevelLabel(mciEvent.alertLevel, mciEvent.alertLevelName)} - {mciEvent.statusName || 'DANG HOAT DONG'}
                </Text>
              </Space>
            }
            description={
              <Row gutter={16}>
                <Col span={8}>
                  <Text>Mo ta: {mciEvent.eventName}</Text>
                </Col>
                <Col span={8}>
                  <Text>Dia diem: {mciEvent.location}</Text>
                </Col>
                <Col span={8}>
                  <Text>Kich hoat: {dayjs(mciEvent.activatedAt).format('YYYY-MM-DD HH:mm:ss')}</Text>
                </Col>
              </Row>
            }
            type="error"
            showIcon
            icon={<AlertOutlined />}
            action={
              <Space orientation="vertical">
                <Button danger onClick={handleEndMCI}>
                  Ket thuc su kien
                </Button>
                <Button onClick={handlePrintReport} icon={<PrinterOutlined />}>
                  Bao cao
                </Button>
                <Button icon={<ReloadOutlined />} onClick={fetchData}>
                  Lam moi
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
                  <AlertOutlined /> Cap cuu Tham hoa (MCI)
                </Title>
                <Text type="secondary">Khong co su kien MCI dang hoat dong</Text>
                {dashboard && (
                  <div style={{ marginTop: 8 }}>
                    <Space>
                      <Text type="secondary">Su kien trong nam: {dashboard.eventsThisYear}</Text>
                      <Text type="secondary">|</Text>
                      <Text type="secondary">Nan nhan trong nam: {dashboard.totalVictimsThisYear}</Text>
                      <Text type="secondary">|</Text>
                      <Text type="secondary">Diem san sang: {dashboard.readinessScore}%</Text>
                      <Text type="secondary">|</Text>
                      <Text type="secondary">Nhan vien truc: {dashboard.staffOnCall}</Text>
                    </Space>
                  </div>
                )}
              </Col>
              <Col>
                <Space>
                  <Button icon={<ReloadOutlined />} onClick={fetchData}>
                    Lam moi
                  </Button>
                  <Button
                    type="primary"
                    danger
                    size="large"
                    icon={<BellOutlined />}
                    onClick={() => setActivateModalVisible(true)}
                  >
                    KICH HOAT MCI
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>
        )}

        {/* Main Content */}
        {mciEvent && (mciEvent.status === 1 || mciEvent.status === 2) && (
          <Card>
            <Tabs items={tabItems} />
          </Card>
        )}

        {/* Event History when no active event */}
        {(!mciEvent || (mciEvent.status !== 1 && mciEvent.status !== 2)) && eventHistory.length > 0 && (
          <Card title="Lich su su kien MCI" style={{ marginTop: 16 }}>
            <Table
              dataSource={eventHistory}
              rowKey="id"
              pagination={{ pageSize: 5 }}
              columns={[
                { title: 'Ma', dataIndex: 'eventCode', key: 'eventCode' },
                { title: 'Ten su kien', dataIndex: 'eventName', key: 'eventName' },
                {
                  title: 'Cap do', dataIndex: 'alertLevel', key: 'alertLevel',
                  render: (level: number, record: MCIEventDto) => (
                    <Tag color={getAlertLevelColor(level)}>{record.alertLevelName || `Level ${level}`}</Tag>
                  ),
                },
                { title: 'Dia diem', dataIndex: 'location', key: 'location' },
                {
                  title: 'Thoi gian', dataIndex: 'activatedAt', key: 'activatedAt',
                  render: (val: string) => dayjs(val).format('DD/MM/YYYY HH:mm'),
                },
                {
                  title: 'Nan nhan', dataIndex: 'totalVictims', key: 'totalVictims',
                },
                {
                  title: 'Trang thai', dataIndex: 'statusName', key: 'statusName',
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
              <span>Kich hoat Code Cap cuu Tham hoa</span>
            </Space>
          }
          open={activateModalVisible}
          onCancel={() => setActivateModalVisible(false)}
          onOk={() => activateForm.submit()}
          okText="KICH HOAT"
          okButtonProps={{ danger: true }}
          width={600}
        >
          <Alert
            title="Canh bao"
            description="Kich hoat Code MCI se gui thong bao den tat ca nhan vien va khoi dong quy trinh cap cuu tham hoa."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Form form={activateForm} layout="vertical" onFinish={handleActivateMCI}>
            <Form.Item name="alertLevel" label="Cap do" rules={[{ required: true, message: 'Vui long chon cap do' }]}>
              <Select>
                <Select.Option value={2}>
                  <Tag color="yellow">CODE YELLOW</Tag> - 5-10 nan nhan
                </Select.Option>
                <Select.Option value={3}>
                  <Tag color="orange">CODE ORANGE</Tag> - 10-50 nan nhan
                </Select.Option>
                <Select.Option value={4}>
                  <Tag color="red">CODE RED</Tag> - {'>'}50 nan nhan hoac CBRN
                </Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="eventType" label="Loai su kien" rules={[{ required: true, message: 'Vui long chon loai su kien' }]}>
              <Select>
                <Select.Option value="Natural">Thien tai</Select.Option>
                <Select.Option value="Industrial">Cong nghiep</Select.Option>
                <Select.Option value="Transport">Giao thong</Select.Option>
                <Select.Option value="Violence">Bao luc</Select.Option>
                <Select.Option value="Other">Khac</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="description" label="Mo ta su kien" rules={[{ required: true, message: 'Vui long nhap mo ta' }]}>
              <Input placeholder="VD: Tai nan giao thong, Hoa hoan..." />
            </Form.Item>
            <Form.Item name="location" label="Dia diem" rules={[{ required: true, message: 'Vui long nhap dia diem' }]}>
              <Input placeholder="VD: Cao toc TP.HCM - Long Thanh" />
            </Form.Item>
            <Form.Item name="estimatedCasualties" label="So nan nhan du kien">
              <Input type="number" />
            </Form.Item>
          </Form>
        </Modal>

        {/* Add Victim Modal */}
        <Modal
          title="Them nan nhan"
          open={addVictimModalVisible}
          onCancel={() => setAddVictimModalVisible(false)}
          onOk={() => victimForm.submit()}
          width={600}
        >
          <Form form={victimForm} layout="vertical" onFinish={handleAddVictim}>
            <Form.Item
              name="triageCategory"
              label="Phan loai START"
              rules={[{ required: true, message: 'Vui long chon phan loai' }]}
            >
              <Select>
                <Select.Option value="red">
                  <Tag color="red">DO</Tag> - Cap cuu ngay
                </Select.Option>
                <Select.Option value="yellow">
                  <Tag color="orange">VANG</Tag> - Tri hoan duoc
                </Select.Option>
                <Select.Option value="green">
                  <Tag color="green">XANH</Tag> - Nhe
                </Select.Option>
                <Select.Option value="black">
                  <Tag>DEN</Tag> - Tu vong
                </Select.Option>
              </Select>
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="name" label="Ho ten (neu biet)">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="gender" label="Gioi tinh">
                  <Select>
                    <Select.Option value="male">Nam</Select.Option>
                    <Select.Option value="female">Nu</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="estimatedAge" label="Tuoi uoc tinh">
                  <Input type="number" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="injuries" label="Mo ta thuong tich" rules={[{ required: true, message: 'Vui long nhap mo ta thuong tich' }]}>
              <TextArea rows={3} />
            </Form.Item>
            <Form.Item name="currentLocation" label="Vi tri hien tai" rules={[{ required: true, message: 'Vui long chon vi tri' }]}>
              <Select>
                <Select.Option value="Phong mo 1">Phong mo 1</Select.Option>
                <Select.Option value="Phong mo 2">Phong mo 2</Select.Option>
                <Select.Option value="ICU">ICU</Select.Option>
                <Select.Option value="Khu dieu tri 1">Khu dieu tri 1</Select.Option>
                <Select.Option value="Khu dieu tri 2">Khu dieu tri 2</Select.Option>
                <Select.Option value="Khu cho">Khu cho</Select.Option>
                <Select.Option value="Nha xac">Nha xac</Select.Option>
              </Select>
            </Form.Item>
          </Form>
        </Modal>

        {/* Victim Detail Modal */}
        <Modal
          title="Chi tiet nan nhan"
          open={victimDetailModalVisible}
          onCancel={() => setVictimDetailModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setVictimDetailModalVisible(false)}>
              Dong
            </Button>,
            <Button key="print" icon={<PrinterOutlined />}>
              In the
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
              <Descriptions.Item label="Phan loai" span={1}>
                <Badge
                  color={getTriageColor(selectedVictim.triageCategory, selectedVictim.triageColor)}
                  text={getTriageLabel(selectedVictim.triageCategory, selectedVictim.triageCategoryName)}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Ho ten" span={1}>
                {selectedVictim.fullName || 'Chua xac dinh'}
              </Descriptions.Item>
              <Descriptions.Item label="Gioi tinh" span={1}>
                {selectedVictim.gender === 'male' ? 'Nam' : selectedVictim.gender === 'female' ? 'Nu' : selectedVictim.gender || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Tuoi uoc tinh" span={1}>
                {selectedVictim.estimatedAge || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Thoi gian den" span={1}>
                {selectedVictim.arrivalTime ? dayjs(selectedVictim.arrivalTime).format('YYYY-MM-DD HH:mm:ss') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Thuong tich" span={2}>
                {selectedVictim.injuries ? selectedVictim.injuries.join(', ') : selectedVictim.chiefComplaint || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Vi tri hien tai" span={1}>
                {selectedVictim.assignedAreaName || selectedVictim.assignedArea || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Trang thai" span={1}>
                {selectedVictim.disposition
                  ? getDispositionTag(selectedVictim.disposition, selectedVictim.dispositionName)
                  : getStatusTag(selectedVictim.status, selectedVictim.statusName)}
              </Descriptions.Item>
              <Descriptions.Item label="Bac si phu trach" span={1}>
                {selectedVictim.attendingDoctorName || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Lien lac gia dinh" span={1}>
                {selectedVictim.familyNotified ? (
                  <Tag color="success">Da lien lac: {selectedVictim.familyContactPhone || selectedVictim.familyContactName}</Tag>
                ) : (
                  <Tag color="warning">Chua lien lac</Tag>
                )}
              </Descriptions.Item>
              {selectedVictim.vitalSigns && (
                <>
                  <Descriptions.Item label="Huyet ap" span={1}>
                    {selectedVictim.vitalSigns.bloodPressure || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Nhip tim" span={1}>
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
                <Descriptions.Item label="Ghi chu dieu tri" span={2}>
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
