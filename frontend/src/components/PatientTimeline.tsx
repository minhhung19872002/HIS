import React, { useState, useEffect, useCallback } from 'react';
import { Timeline, Tag, Typography, Spin, Empty, Select, Space, Button, Card, Descriptions, Tooltip } from 'antd';
import {
  UserOutlined, ExperimentOutlined, ScanOutlined, MedicineBoxOutlined,
  DollarOutlined, FileTextOutlined, HeartOutlined, CalendarOutlined,
  ReloadOutlined, FilterOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getPatientMedicalHistory } from '../api/examination';
import { getLabResultHistory } from '../api/lis';
import { getPatientRadiologyHistory } from '../api/ris';
import { getPaymentHistory } from '../api/billing';

const { Text } = Typography;

export interface TimelineEvent {
  id: string;
  date: string;
  module: 'OPD' | 'IPD' | 'Lab' | 'Radiology' | 'Pharmacy' | 'Billing' | 'Surgery' | 'Reception';
  type: string;
  title: string;
  description?: string;
  status?: string;
  extra?: Record<string, unknown>;
}

const moduleConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  OPD: { color: '#1890ff', icon: <UserOutlined />, label: 'Khám bệnh' },
  IPD: { color: '#722ed1', icon: <FileTextOutlined />, label: 'Nội trú' },
  Lab: { color: '#52c41a', icon: <ExperimentOutlined />, label: 'Xét nghiệm' },
  Radiology: { color: '#fa8c16', icon: <ScanOutlined />, label: 'CĐHA' },
  Pharmacy: { color: '#eb2f96', icon: <MedicineBoxOutlined />, label: 'Nhà thuốc' },
  Billing: { color: '#faad14', icon: <DollarOutlined />, label: 'Thanh toán' },
  Surgery: { color: '#f5222d', icon: <HeartOutlined />, label: 'Phẫu thuật' },
  Reception: { color: '#13c2c2', icon: <CalendarOutlined />, label: 'Tiếp đón' },
};

interface PatientTimelineProps {
  patientId: string;
  onExaminationClick?: (examinationId: string) => void;
}

const PatientTimeline: React.FC<PatientTimelineProps> = ({ patientId, onExaminationClick }) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [moduleFilter, setModuleFilter] = useState<string[]>([]);

  const fetchTimeline = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const [historyRes, labRes, radioRes, billingRes] = await Promise.allSettled([
        getPatientMedicalHistory(patientId, 50),
        getLabResultHistory(patientId, undefined, 12),
        getPatientRadiologyHistory(patientId, undefined, 12),
        getPaymentHistory(patientId),
      ]);

      const allEvents: TimelineEvent[] = [];

      // OPD examinations
      if (historyRes.status === 'fulfilled') {
        const data = (historyRes.value?.data as unknown as Array<Record<string, unknown>>) ?? [];
        data.forEach((h: Record<string, unknown>) => {
          allEvents.push({
            id: (h.examinationId as string) ?? (h.id as string) ?? '',
            date: (h.examinationDate as string) ?? (h.occurrenceDate as string) ?? '',
            module: (h.historyType as string) === 'Noi tru' ? 'IPD' : 'OPD',
            type: 'examination',
            title: `${(h.historyType as string) === 'Noi tru' ? 'Nội trú' : 'Khám'} - ${(h.roomName as string) ?? 'N/A'}`,
            description: (h.diagnosisName as string) ?? (h.description as string) ?? '',
            status: (h.conclusionType as number) === 2 ? 'Nhập viện' : 'Hoàn thành',
            extra: h,
          });
        });
      }

      // Lab results
      if (labRes.status === 'fulfilled') {
        const data = (labRes.value?.data as unknown as Array<Record<string, unknown>>) ?? [];
        data.forEach((l: Record<string, unknown>) => {
          allEvents.push({
            id: (l.id as string) ?? `lab-${l.testCode}`,
            date: (l.resultDate as string) ?? (l.requestDate as string) ?? '',
            module: 'Lab',
            type: 'lab_result',
            title: `XN: ${(l.testName as string) ?? (l.testCode as string) ?? 'N/A'}`,
            description: (l.result as string) ? `Kết quả: ${l.result} ${(l.unit as string) ?? ''}` : undefined,
            status: (l.isAbnormal as boolean) ? 'Bất thường' : 'Bình thường',
            extra: l,
          });
        });
      }

      // Radiology results
      if (radioRes.status === 'fulfilled') {
        const data = (radioRes.value?.data as unknown as Array<Record<string, unknown>>) ?? [];
        data.forEach((r: Record<string, unknown>) => {
          allEvents.push({
            id: (r.id as string) ?? `radio-${r.orderCode}`,
            date: (r.completedDate as string) ?? (r.orderDate as string) ?? '',
            module: 'Radiology',
            type: 'radiology_result',
            title: `CĐHA: ${(r.serviceName as string) ?? (r.examType as string) ?? 'N/A'}`,
            description: (r.conclusion as string) ?? undefined,
            status: (r.statusName as string) ?? 'Hoàn thành',
            extra: r,
          });
        });
      }

      // Billing/payments
      if (billingRes.status === 'fulfilled') {
        const billingData = billingRes.value?.data as unknown as Record<string, unknown>;
        const payments = (billingData?.payments as Array<Record<string, unknown>>) ?? (billingData as unknown as Array<Record<string, unknown>>) ?? [];
        if (Array.isArray(payments)) {
          payments.forEach((p: Record<string, unknown>) => {
            allEvents.push({
              id: (p.id as string) ?? (p.receiptId as string) ?? `bill-${p.paymentDate}`,
              date: (p.paymentDate as string) ?? (p.createdAt as string) ?? '',
              module: 'Billing',
              type: 'payment',
              title: `Thanh toán: ${Number(p.amount ?? 0).toLocaleString('vi-VN')} đ`,
              description: (p.paymentMethod as string) ?? undefined,
              status: (p.statusName as string) ?? 'Đã thanh toán',
              extra: p,
            });
          });
        }
      }

      // Sort by date descending
      allEvents.sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return db - da;
      });

      setEvents(allEvents);
    } catch {
      // Silent fail - partial data is OK
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  const filteredEvents = moduleFilter.length > 0
    ? events.filter(e => moduleFilter.includes(e.module))
    : events;

  const getEventColor = (event: TimelineEvent) => {
    if (event.module === 'Lab' && event.status === 'Bất thường') return 'red';
    return moduleConfig[event.module]?.color ?? 'blue';
  };

  const getStatusTag = (event: TimelineEvent) => {
    if (!event.status) return null;
    const color = event.status === 'Bất thường' ? 'red'
      : event.status === 'Nhập viện' ? 'purple'
      : event.status === 'Hoàn thành' ? 'green'
      : event.status === 'Đã thanh toán' ? 'gold'
      : 'default';
    return <Tag color={color} style={{ fontSize: 11 }}>{event.status}</Tag>;
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><Spin tip="Đang tải timeline..." /></div>;
  if (!events.length && !loading) return <Empty description="Chưa có dữ liệu timeline" />;

  // Group by month for better readability
  const monthGroups: Record<string, TimelineEvent[]> = {};
  filteredEvents.forEach(e => {
    const month = e.date ? dayjs(e.date).format('MM/YYYY') : 'Không rõ';
    if (!monthGroups[month]) monthGroups[month] = [];
    monthGroups[month].push(e);
  });

  return (
    <div>
      <Space style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }}>
        <Space>
          <FilterOutlined />
          <Select
            mode="multiple"
            placeholder="Lọc theo module"
            value={moduleFilter}
            onChange={setModuleFilter}
            style={{ minWidth: 200 }}
            allowClear
            options={Object.entries(moduleConfig).map(([key, cfg]) => ({
              value: key, label: <Space>{cfg.icon} {cfg.label}</Space>,
            }))}
          />
          <Text type="secondary">{filteredEvents.length} sự kiện</Text>
        </Space>
        <Button icon={<ReloadOutlined />} size="small" onClick={fetchTimeline}>Tải lại</Button>
      </Space>

      {/* Module legend */}
      <div style={{ marginBottom: 12 }}>
        {Object.entries(moduleConfig).map(([key, cfg]) => {
          const count = events.filter(e => e.module === key).length;
          if (count === 0) return null;
          return (
            <Tag key={key} color={cfg.color} style={{ marginBottom: 4, cursor: 'pointer' }}
              onClick={() => setModuleFilter(prev => prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key])}>
              {cfg.icon} {cfg.label} ({count})
            </Tag>
          );
        })}
      </div>

      <div style={{ maxHeight: 'calc(100vh - 380px)', overflowY: 'auto' }}>
        {Object.entries(monthGroups).map(([month, groupEvents]) => (
          <Card key={month} size="small" title={<Text type="secondary" style={{ fontSize: 13 }}>Tháng {month}</Text>}
            style={{ marginBottom: 8 }} styles={{ body: { padding: '8px 16px' } }}>
            <Timeline
              items={groupEvents.map(event => ({
                key: event.id,
                color: getEventColor(event),
                dot: moduleConfig[event.module]?.icon,
                content: (
                  <div
                    style={{ cursor: event.module === 'OPD' || event.module === 'IPD' ? 'pointer' : 'default' }}
                    onClick={() => {
                      if ((event.module === 'OPD' || event.module === 'IPD') && onExaminationClick) {
                        onExaminationClick(event.id);
                      }
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <Tooltip title={event.module}>
                          <Tag color={moduleConfig[event.module]?.color} style={{ fontSize: 10, padding: '0 4px' }}>
                            {moduleConfig[event.module]?.label}
                          </Tag>
                        </Tooltip>
                        <Text strong style={{ fontSize: 13 }}>{event.title}</Text>
                      </div>
                      <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap', marginLeft: 8 }}>
                        {event.date ? dayjs(event.date).format('DD/MM HH:mm') : ''}
                      </Text>
                    </div>
                    {event.description && (
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
                        {event.description.length > 120 ? event.description.substring(0, 120) + '...' : event.description}
                      </Text>
                    )}
                    {getStatusTag(event)}

                    {/* Extra details for lab results */}
                    {event.module === 'Lab' && event.extra && (
                      <Descriptions size="small" column={3} style={{ marginTop: 4 }}>
                        {(event.extra as Record<string, unknown>).normalRange && (
                          <Descriptions.Item label="GTBT">
                            {String((event.extra as Record<string, unknown>).normalRange)}
                          </Descriptions.Item>
                        )}
                      </Descriptions>
                    )}
                  </div>
                ),
              }))}
            />
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PatientTimeline;
