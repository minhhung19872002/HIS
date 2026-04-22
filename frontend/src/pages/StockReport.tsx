/**
 * Báo cáo tồn kho — N1.06.
 * 4 tab: chi tiết theo lô, tổng hợp theo thuốc, sắp hết hạn, tồn thấp.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Card, Tabs, Table, Space, Input, Select, Button, Tag, Statistic, Row, Col, message, InputNumber,
} from 'antd';
import { ReloadOutlined, DatabaseOutlined, WarningOutlined, AlertOutlined, ExportOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import { getWarehouses } from '../api/warehouse';

interface Warehouse { id: string; warehouseName: string }

export default function StockReport() {
  const [tab, setTab] = useState('detail');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState<string | undefined>();
  const [keyword, setKeyword] = useState('');
  const [days, setDays] = useState(90);
  const [threshold, setThreshold] = useState(10);

  const [detail, setDetail] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [expiring, setExpiring] = useState<any>(null);
  const [lowStock, setLowStock] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getWarehouses(1).then(r => setWarehouses(((r as any)?.data?.items || (r as any)?.data || []))).catch(() => {/* empty */});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'detail') {
        const { data } = await apiClient.get('/stock-report/detail', { params: { warehouseId, keyword } });
        setDetail(data);
      } else if (tab === 'summary') {
        const { data } = await apiClient.get('/stock-report/summary', { params: { warehouseId, keyword } });
        setSummary(data);
      } else if (tab === 'expiring') {
        const { data } = await apiClient.get('/stock-report/expiring', { params: { warehouseId, days } });
        setExpiring(data);
      } else if (tab === 'low-stock') {
        const { data } = await apiClient.get('/stock-report/low-stock', { params: { warehouseId, threshold } });
        setLowStock(data);
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Tải báo cáo thất bại');
    } finally { setLoading(false); }
  }, [tab, warehouseId, keyword, days, threshold]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    const rows = tab === 'detail' ? detail?.items
      : tab === 'summary' ? summary?.items
      : tab === 'expiring' ? expiring?.items
      : lowStock?.items;
    if (!rows || rows.length === 0) return message.warning('Không có dữ liệu');
    const keys = Object.keys(rows[0]).filter(k => typeof rows[0][k] !== 'object' || rows[0][k] instanceof Date);
    const csv = [keys.join(',')].concat(rows.map((r: any) => keys.map(k => {
      const v = r[k];
      if (v == null) return '';
      if (typeof v === 'string' && (v.includes(',') || v.includes('"'))) return `"${v.replace(/"/g, '""')}"`;
      return v;
    }).join(','))).join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-${tab}-${dayjs().format('YYYYMMDD-HHmm')}.csv`;
    a.click();
  };

  return (
    <div>
      <Card
        title={<Space><DatabaseOutlined /> Báo cáo tồn kho (N1.06)</Space>}
        extra={<Space>
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Làm mới</Button>
          <Button icon={<ExportOutlined />} onClick={exportCsv}>Xuất CSV</Button>
        </Space>}
      >
        <Space wrap style={{ marginBottom: 16 }}>
          <Select
            placeholder="Chọn kho"
            style={{ width: 240 }}
            allowClear
            value={warehouseId}
            onChange={setWarehouseId}
            options={warehouses.map(w => ({ label: w.warehouseName, value: w.id }))}
            showSearch
            optionFilterProp="label"
          />
          {(tab === 'detail' || tab === 'summary') && (
            <Input.Search
              placeholder="Tên thuốc / mã thuốc / số lô"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onSearch={load}
              style={{ width: 280 }}
            />
          )}
          {tab === 'expiring' && (
            <Space>Hết hạn trong <InputNumber min={1} max={365} value={days} onChange={v => setDays(v ?? 90)} /> ngày</Space>
          )}
          {tab === 'low-stock' && (
            <Space>Ngưỡng tồn <InputNumber min={1} value={threshold} onChange={v => setThreshold(v ?? 10)} /></Space>
          )}
        </Space>

        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            {
              key: 'detail',
              label: 'Chi tiết theo lô',
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col><Statistic title="Số dòng" value={detail?.count || 0} /></Col>
                    <Col><Statistic title="Tổng giá trị" value={detail?.totalValue || 0} precision={0} suffix="đ" /></Col>
                  </Row>
                  <Table
                    size="small"
                    rowKey="id"
                    loading={loading}
                    dataSource={detail?.items || []}
                    pagination={{ pageSize: 50, showSizeChanger: true }}
                    scroll={{ x: 1500 }}
                    columns={[
                      { title: 'Kho', dataIndex: 'warehouseName', width: 140, fixed: 'left' },
                      { title: 'Mã', dataIndex: 'itemCode', width: 100 },
                      { title: 'Tên', dataIndex: 'itemName', width: 220 },
                      { title: 'ĐV', dataIndex: 'unit', width: 70 },
                      { title: 'Số lô', dataIndex: 'batchNumber', width: 120 },
                      { title: 'HSD', dataIndex: 'expiryDate', width: 110,
                        render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '-' },
                      { title: 'Còn', dataIndex: 'daysToExpiry', width: 80, align: 'right',
                        render: (d: number) => d == null ? '-' : d < 0 ? <Tag color="red">Hết hạn</Tag>
                          : d <= 30 ? <Tag color="volcano">{d}d</Tag>
                          : d <= 90 ? <Tag color="orange">{d}d</Tag>
                          : `${d}d` },
                      { title: 'SL', dataIndex: 'quantity', width: 90, align: 'right',
                        render: (v: number) => v?.toLocaleString('vi-VN') },
                      { title: 'Reserved', dataIndex: 'reservedQuantity', width: 90, align: 'right',
                        render: (v: number) => v?.toLocaleString('vi-VN') },
                      { title: 'Khả dụng', dataIndex: 'available', width: 90, align: 'right',
                        render: (v: number) => v?.toLocaleString('vi-VN') },
                      { title: 'Giá nhập', dataIndex: 'importPrice', width: 110, align: 'right',
                        render: (v: number) => v?.toLocaleString('vi-VN') },
                      { title: 'Giá trị', dataIndex: 'value', width: 130, align: 'right',
                        render: (v: number) => v?.toLocaleString('vi-VN') },
                      { title: 'Khóa', dataIndex: 'isLocked', width: 70,
                        render: (v: boolean) => v ? <Tag color="red">Khóa</Tag> : '-' },
                    ]}
                  />
                </>
              ),
            },
            {
              key: 'summary',
              label: 'Tổng hợp theo thuốc',
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col><Statistic title="Số thuốc" value={summary?.count || 0} /></Col>
                    <Col><Statistic title="Tổng giá trị" value={summary?.totalValue || 0} precision={0} suffix="đ" /></Col>
                  </Row>
                  <Table
                    size="small"
                    rowKey={(_, idx) => String(idx)}
                    loading={loading}
                    dataSource={summary?.items || []}
                    pagination={{ pageSize: 50, showSizeChanger: true }}
                    columns={[
                      { title: 'Mã', dataIndex: 'itemCode', width: 100 },
                      { title: 'Tên', dataIndex: 'itemName' },
                      { title: 'ĐV', dataIndex: 'unit', width: 70 },
                      { title: 'Số lô', dataIndex: 'batchCount', width: 80, align: 'right' },
                      { title: 'Tổng SL', dataIndex: 'totalQuantity', width: 100, align: 'right',
                        render: (v: number) => v?.toLocaleString('vi-VN') },
                      { title: 'Đã đặt', dataIndex: 'reservedQuantity', width: 90, align: 'right',
                        render: (v: number) => v?.toLocaleString('vi-VN') },
                      { title: 'Khả dụng', dataIndex: 'available', width: 100, align: 'right',
                        render: (v: number) => v?.toLocaleString('vi-VN') },
                      { title: 'HSD gần', dataIndex: 'nearestExpiry', width: 110,
                        render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '-' },
                      { title: 'Giá trị', dataIndex: 'totalValue', width: 130, align: 'right',
                        render: (v: number) => v?.toLocaleString('vi-VN') },
                    ]}
                  />
                </>
              ),
            },
            {
              key: 'expiring',
              label: <Space><WarningOutlined /> Sắp hết hạn</Space>,
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col><Statistic title="Số dòng" value={expiring?.count || 0} valueStyle={{ color: '#cf1322' }} /></Col>
                    <Col><Statistic title="Tổng giá trị" value={expiring?.totalValue || 0} precision={0} suffix="đ" /></Col>
                  </Row>
                  <Table
                    size="small"
                    rowKey="id"
                    loading={loading}
                    dataSource={expiring?.items || []}
                    pagination={{ pageSize: 50 }}
                    columns={[
                      { title: 'Kho', dataIndex: 'warehouseName', width: 140 },
                      { title: 'Mã', dataIndex: 'itemCode', width: 100 },
                      { title: 'Tên', dataIndex: 'itemName' },
                      { title: 'Số lô', dataIndex: 'batchNumber', width: 120 },
                      { title: 'HSD', dataIndex: 'expiryDate', width: 110,
                        render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
                      { title: 'Còn (ngày)', dataIndex: 'daysToExpiry', width: 110, align: 'right',
                        render: (d: number, r: any) => {
                          const color = r.severity === 'expired' ? 'red' : r.severity === 'critical' ? 'volcano' : 'orange';
                          return <Tag color={color}>{d < 0 ? `Quá ${Math.abs(d)}d` : `${d}d`}</Tag>;
                        } },
                      { title: 'SL', dataIndex: 'quantity', width: 90, align: 'right',
                        render: (v: number) => v?.toLocaleString('vi-VN') },
                      { title: 'Giá trị', dataIndex: 'value', width: 130, align: 'right',
                        render: (v: number) => v?.toLocaleString('vi-VN') },
                    ]}
                  />
                </>
              ),
            },
            {
              key: 'low-stock',
              label: <Space><AlertOutlined /> Tồn thấp</Space>,
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col><Statistic title="Số thuốc" value={lowStock?.count || 0} valueStyle={{ color: '#faad14' }} /></Col>
                  </Row>
                  <Table
                    size="small"
                    rowKey={(_, idx) => String(idx)}
                    loading={loading}
                    dataSource={lowStock?.items || []}
                    pagination={{ pageSize: 50 }}
                    columns={[
                      { title: 'Mã', dataIndex: 'itemCode', width: 100 },
                      { title: 'Tên', dataIndex: 'itemName' },
                      { title: 'ĐV', dataIndex: 'unit', width: 70 },
                      { title: 'Khả dụng', dataIndex: 'available', width: 110, align: 'right',
                        render: (v: number) => <Tag color="orange">{v?.toLocaleString('vi-VN')}</Tag> },
                      { title: 'Tổng', dataIndex: 'totalQuantity', width: 100, align: 'right',
                        render: (v: number) => v?.toLocaleString('vi-VN') },
                      { title: 'Ngưỡng', dataIndex: 'threshold', width: 90, align: 'right' },
                    ]}
                  />
                </>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
