import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getAssets, getAssetDashboard } from '../api/assetManagement';
import type { FixedAssetDto, AssetDashboardDto } from '../api/assetManagement';
import { GenericListPage } from './_GenericListPage';

const STATUS: Record<number, { text: string; cls: string }> = {
  0: { text: 'Đang dùng', cls: 'ok' },
  1: { text: 'Hỏng', cls: 'crit' },
  2: { text: 'Sửa chữa', cls: 'warn' },
  3: { text: 'Chờ thanh lý', cls: 'warn' },
  4: { text: 'Đã thanh lý', cls: 'ghost' },
  5: { text: 'Đã chuyển', cls: 'cy' },
};

const fmtVnd = (n: number) => (n || 0).toLocaleString('vi-VN');

const AssetManagementV2: React.FC = () => {
  const [items, setItems] = useState<FixedAssetDto[]>([]);
  const [dash, setDash] = useState<AssetDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<FixedAssetDto | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [r, d] = await Promise.all([
        getAssets({ keyword, pageSize: 100 }),
        getAssetDashboard(),
      ]);
      setItems(r.items || []);
      setDash(d);
      if ((r.items || []).length > 0 && !sel) setSel(r.items[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const stats = useMemo(() => [
    { label: 'Tổng tài sản', value: dash?.totalAssets ?? items.length },
    { label: 'Đang dùng', value: dash?.inUseCount ?? items.filter((a) => a.status === 0).length, tone: 'ok' as const },
    { label: 'Hỏng', value: dash?.brokenCount ?? items.filter((a) => a.status === 1).length, tone: 'crit' as const },
    { label: 'Chờ thanh lý', value: dash?.pendingDisposalCount ?? items.filter((a) => a.status === 3).length, tone: 'warn' as const },
  ], [items, dash]);

  return (
    <GenericListPage<FixedAssetDto>
      title="Tài sản cố định" v1Path="/asset-management"
      items={items} loading={loading}
      keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
      searchPlaceholder="Tìm theo mã / tên TS..."
      selectedId={sel?.id} onSelect={setSel}
      stats={stats}
      columns={[
        { key: 'code', label: 'Mã TS', render: (r) => <span className="mono">{r.assetCode}</span> },
        { key: 'name', label: 'Tên', render: (r) => <span style={{ fontWeight: 500 }}>{r.assetName}</span> },
        { key: 'dept', label: 'Khoa', render: (r) => <span className="muted">{r.departmentName || '—'}</span> },
        { key: 'orig', label: 'Nguyên giá', render: (r) => <span className="mono">{fmtVnd(r.originalValue)}</span> },
        { key: 'cur', label: 'Còn lại', render: (r) => <span className="mono">{fmtVnd(r.currentValue)}</span> },
        { key: 'status', label: 'TT', render: (r) => {
          const s = STATUS[r.status] || { text: '—', cls: 'ghost' };
          return <span className={`chip ${s.cls}`}>{s.text}</span>;
        } },
      ]}
      detailTitle={sel?.assetCode || 'Chọn tài sản'}
      detailFields={!sel ? null : [
        { label: 'Mã TS', value: <span className="mono">{sel.assetCode}</span> },
        { label: 'Tên', value: sel.assetName },
        { label: 'Khoa', value: sel.departmentName || '—' },
        { label: 'Vị trí', value: sel.locationDescription || '—' },
        { label: 'Serial', value: <span className="mono">{sel.serialNumber || '—'}</span> },
        { label: 'Mua', value: <span className="mono">{dayjs(sel.purchaseDate).format('DD/MM/YYYY')}</span> },
        { label: 'Nguyên giá', value: <span className="mono">{fmtVnd(sel.originalValue)} đ</span> },
        { label: 'Hao mòn lũy kế', value: <span className="mono">{fmtVnd(sel.accumulatedDepreciation)} đ</span> },
        { label: 'Giá trị còn lại', value: <span className="mono">{fmtVnd(sel.currentValue)} đ</span> },
        { label: 'Hao mòn/tháng', value: <span className="mono">{fmtVnd(sel.monthlyDepreciation)} đ</span> },
      ]}
    />
  );
};

export default AssetManagementV2;
