import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { DataTable, EmptyState, ErrorState, Ico, LoadingState, StatusBadge, type ColumnDef } from '@/_v2kit';
import { HOSPITAL_NAME } from '../../../constants/hospital';
import { getPublicLabResult, type PublicLabResult, type PublicLabResultItem } from '../api/publicLabResult';
import '../../../components/layout/terminal/ab-module.css';

/* ==========================================================================
   Xem kết quả xét nghiệm qua link SMS (public, /lab-result?token=…).
   Standalone: ngoài ProtectedRoute/TerminalLayout. Token là "chìa khóa" duy nhất —
   BE chỉ trả KQ ĐÃ DUYỆT của đúng 1 phiếu, tên BN che bớt, link hết hạn sau 72h.
   ========================================================================== */

const flagTone = (flag?: string | null): 'ok' | 'warn' | 'crit' => {
  const f = (flag ?? '').toUpperCase();
  if (f === 'HH' || f === 'LL') return 'crit';
  if (f === 'H' || f === 'L') return 'warn';
  return 'ok';
};

const flagLabel = (flag?: string | null): string => {
  switch ((flag ?? '').toUpperCase()) {
    case 'H': return 'Cao';
    case 'L': return 'Thấp';
    case 'HH': return 'Rất cao';
    case 'LL': return 'Rất thấp';
    default: return 'Bình thường';
  }
};

const ITEM_COLUMNS: ColumnDef<PublicLabResultItem>[] = [
  { key: 'name', label: 'Chỉ số' },
  { key: 'value', label: 'Kết quả', render: (r) => <b>{r.value ?? ''}</b> },
  { key: 'unit', label: 'Đơn vị', render: (r) => r.unit ?? '' },
  { key: 'referenceRange', label: 'Tham chiếu', render: (r) => r.referenceRange ?? '' },
  {
    key: 'flag', label: 'Đánh giá', sortable: false,
    render: (r) => <StatusBadge tone={flagTone(r.flag)} dot>{flagLabel(r.flag)}</StatusBadge>,
  },
];

export default function PublicLabResult() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [data, setData] = useState<PublicLabResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!token) {
      setError('Link không hợp lệ hoặc đã hết hạn');
      setLoading(false);
      return;
    }
    setLoading(true);
    getPublicLabResult(token)
      .then((d) => { if (alive) { setData(d); setError(null); } })
      .catch((e: unknown) => {
        if (!alive) return;
        const err = e as { response?: { status?: number; data?: { message?: string } } };
        setError(err.response?.status === 429
          ? 'Bạn thao tác quá nhanh, vui lòng thử lại sau 1 phút.'
          : err.response?.data?.message || 'Link không hợp lệ hoặc đã hết hạn');
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--d-0, var(--d-1))' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '20px 14px' }}>
        <div style={{ textAlign: 'center', marginBottom: 16, paddingBottom: 14, borderBottom: '2px solid var(--a-cy)' }}>
          <div style={{ color: 'var(--a-cy)', marginBottom: 6 }}><Ico name="flask" size={36} /></div>
          <h1 style={{ margin: '0 0 2px', fontSize: 20, color: 'var(--t-0)' }}>Kết quả xét nghiệm</h1>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>{HOSPITAL_NAME}</div>
        </div>

        {loading && <LoadingState />}
        {!loading && error && <ErrorState message={error} />}

        {!loading && !error && data && (
          <>
            <div className="panel" style={{ marginBottom: 12 }}>
              <div className="panel-body pad" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 'var(--fs-sm)' }}>
                <div>Người bệnh: <b>{data.patientNameMasked || '—'}</b></div>
                <div>Mã phiếu: <b>{data.requestCode}</b></div>
                {data.requestDate && <div>Ngày chỉ định: <b>{dayjs(data.requestDate).format('DD/MM/YYYY')}</b></div>}
                <div style={{ color: 'var(--t-2)' }}>Link hết hạn: {dayjs(data.expiresAt).format('HH:mm DD/MM/YYYY')}</div>
              </div>
            </div>

            {data.pendingCount > 0 && (
              <div className="panel" style={{ marginBottom: 12 }}>
                <div className="panel-body pad" style={{ fontSize: 'var(--fs-sm)', color: 'var(--s-warn)' }}>
                  Còn {data.pendingCount} xét nghiệm chưa có kết quả được duyệt — vui lòng xem lại sau.
                </div>
              </div>
            )}

            {data.results.length === 0 && <EmptyState message="Chưa có kết quả nào được duyệt cho phiếu này." />}

            {data.results.map((s, idx) => (
              <div className="panel" key={`${s.serviceName}-${idx}`} style={{ marginBottom: 12 }}>
                <div className="panel-body pad">
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                    <b style={{ color: 'var(--t-0)' }}>{s.serviceName}</b>
                    {s.resultDate && (
                      <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
                        Trả kết quả: {dayjs(s.resultDate).format('HH:mm DD/MM/YYYY')}
                      </span>
                    )}
                  </div>
                  {s.items.length > 0 ? (
                    <DataTable
                      columns={ITEM_COLUMNS}
                      data={s.items}
                      rowKey={(r) => r.name}
                      sortable={false}
                    />
                  ) : (
                    <div style={{ fontSize: 'var(--fs-sm)' }}>{s.result || '—'}</div>
                  )}
                  {s.conclusion && (
                    <div style={{ marginTop: 8, fontSize: 'var(--fs-sm)' }}>Kết luận: {s.conclusion}</div>
                  )}
                </div>
              </div>
            ))}

            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', textAlign: 'center', marginTop: 16 }}>
              Kết quả chỉ mang tính tham khảo — vui lòng liên hệ bác sĩ điều trị để được tư vấn.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
