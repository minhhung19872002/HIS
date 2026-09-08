/**
 * Quản lý nhóm gia đình — HSMT I.3 #1.5.
 *
 * Trả lời một câu duy nhất nhưng quan trọng: **ai đang xem được hồ sơ của ai**. Gỡ liên kết ở đây có
 * hiệu lực ngay ở lần gọi API kế tiếp của app, không đợi token hết hạn.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Input, Modal } from 'antd';
import {
  getFamilyLinks,
  revokeFamilyLink,
  type PatientAppFamilyLink,
} from '@/api/patientApp';
import {
  ActBtn, DataTable, DrawerShell, DrSec, DrField, ErrorState, KpiStrip, LoadingState,
  Pager, SearchBox, StatusBadge, fmtDTg, tk, te,
  type ColumnDef, type KpiItem,
} from '@/_v2kit';

const PAGE_SIZE = 20;

const statusLabel = (status: string): string => ({
  Pending: 'Chờ xác minh',
  Verified: 'Đã xác minh',
  Revoked: 'Đã gỡ',
}[status] ?? status);

const statusTone = (status: string): 'ok' | 'warn' | 'crit' =>
  status === 'Verified' ? 'ok' : status === 'Pending' ? 'warn' : 'crit';

const methodLabel = (method?: string | null): string =>
  method === 'member_otp' ? 'Người thân tự xác nhận bằng OTP'
    : method === 'identity_data' ? 'Khai đúng CCCD / ngày sinh trên hồ sơ'
      : '—';

const PatientAppFamilies: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<PatientAppFamilyLink[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [detail, setDetail] = useState<PatientAppFamilyLink | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(false);
    getFamilyLinks({ keyword, page: page + 1, pageSize: PAGE_SIZE })
      .then((r) => { setRows(r.items); setTotal(r.total); })
      .catch(() => { setRows([]); setError(true); })
      .finally(() => setLoading(false));
  }, [keyword, page]);

  useEffect(() => { reload(); }, [reload]);

  const revoke = (link: PatientAppFamilyLink) => {
    let reason = '';
    Modal.confirm({
      title: `Gỡ liên kết ${link.ownerName} → ${link.memberName}?`,
      content: (
        <div>
          <p>{link.ownerName} sẽ mất quyền xem hồ sơ của {link.memberName} ngay lập tức.</p>
          <Input
            placeholder="Lý do (ghi vào nhật ký)"
            onChange={(e) => { reason = e.target.value; }}
          />
        </div>
      ),
      okText: 'Gỡ liên kết',
      cancelText: 'Huỷ',
      onOk: () => revokeFamilyLink(link.id, reason)
        .then(() => { tk('Đã gỡ liên kết'); reload(); })
        .catch(() => te('Không gỡ được liên kết')),
    });
  };

  const columns: ColumnDef<PatientAppFamilyLink>[] = [
    { key: 'owner', label: 'Người xem', render: (l) => `${l.ownerName || '—'} (${l.ownerPhone})` },
    { key: 'member', label: 'Hồ sơ được xem', render: (l) => l.memberName },
    { key: 'code', label: 'Mã BN', render: (l) => l.memberPatientCode, mono: true },
    { key: 'rel', label: 'Quan hệ', render: (l) => l.relationship || '—' },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (l) => <StatusBadge tone={statusTone(l.status)}>{statusLabel(l.status)}</StatusBadge>,
    },
    {
      key: 'view',
      label: 'Quyền xem KQ',
      render: (l) => l.canViewResults
        ? <StatusBadge tone="ok">Có</StatusBadge>
        : <StatusBadge tone="info">Đã tắt</StatusBadge>,
    },
    {
      key: 'verified',
      label: 'Xác minh lúc',
      render: (l) => l.verifiedAt ? fmtDTg(l.verifiedAt) : '—',
    },
  ];

  const kpis: KpiItem[] = [
    { lbl: 'Tổng liên kết', val: total, tone: 'info' },
    { lbl: 'Đã xác minh', val: rows.filter((l) => l.status === 'Verified').length, tone: 'ok' },
    { lbl: 'Chờ xác minh', val: rows.filter((l) => l.status === 'Pending').length, tone: 'warn' },
  ];

  return (
    <div className="ab">
      <KpiStrip items={kpis} />

      <div className="ab-tools">
        <SearchBox
          value={keyword}
          onChange={(v) => { setKeyword(v); setPage(0); }}
          placeholder="Tên, số điện thoại hoặc mã bệnh nhân…"
        />
      </div>

      {loading ? <LoadingState />
        : error ? <ErrorState onRetry={reload} />
          : (
            <>
              <DataTable
                data={rows}
                columns={columns}
                rowKey={(l) => l.id}
                onRowClick={setDetail}
                empty="Chưa có liên kết gia đình nào."
                actions={(l) => (
                  l.status === 'Revoked'
                    ? null
                    : <ActBtn ic="x" tone="crit" title="Gỡ liên kết" onClick={() => revoke(l)} />
                )}
              />
              <Pager
                page={page}
                totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
                setPage={setPage}
                total={total}
                perPage={PAGE_SIZE}
              />
            </>
          )}

      <DrawerShell
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.ownerName} → ${detail.memberName}` : ''}
        sub={detail ? statusLabel(detail.status) : ''}
      >
        {detail && (
          <>
            <DrSec title="Người xem">
              <DrField lbl="Họ tên">{detail.ownerName || '—'}</DrField>
              <DrField lbl="Số điện thoại">{detail.ownerPhone}</DrField>
            </DrSec>
            <DrSec title="Hồ sơ được xem">
              <DrField lbl="Họ tên">{detail.memberName}</DrField>
              <DrField lbl="Mã bệnh nhân">{detail.memberPatientCode}</DrField>
              <DrField lbl="Quan hệ khai báo">{detail.relationship || '—'}</DrField>
            </DrSec>
            <DrSec title="Xác minh">
              <DrField lbl="Trạng thái">
                <StatusBadge tone={statusTone(detail.status)}>
                  {statusLabel(detail.status)}
                </StatusBadge>
              </DrField>
              <DrField lbl="Cách xác minh">{methodLabel(detail.verificationMethod)}</DrField>
              <DrField lbl="Lúc">{detail.verifiedAt ? fmtDTg(detail.verifiedAt) : '—'}</DrField>
              <DrField lbl="Được xem kết quả">{detail.canViewResults ? 'Có' : 'Đã tắt'}</DrField>
            </DrSec>
          </>
        )}
      </DrawerShell>
    </div>
  );
};

export default PatientAppFamilies;
