/**
 * Quản lý tài khoản app bệnh nhân — HSMT I.3 #1.1.
 *
 * Khoá tài khoản và đặt lại mật khẩu là hai quyền lớn nhất ở đây, nên cả hai đều hỏi lại trước khi
 * làm và đều ghi nhật ký kèm id nhân viên thực hiện (ghi ở phía máy chủ).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Input } from 'antd';
import {
  getAccounts,
  setAccountStatus,
  resetAccountPassword,
  type PatientAppAccount,
} from '@/api/patientApp';
import {
  ActBtn, DataTable, ErrorState, LoadingState, Pager, SearchBox, Filter,
  StatusBadge, DrawerShell, DrSec, DrField, KpiStrip,
  fmtDTg, tk, te,
  type ColumnDef, type KpiItem,
} from '@/_v2kit';

const STATUS_OPTIONS = [
  { v: 'Active', l: 'Đang hoạt động' },
  { v: 'Suspended', l: 'Tạm ngưng' },
  { v: 'Locked', l: 'Đã khoá' },
];

const statusTone = (status: string): 'ok' | 'warn' | 'crit' =>
  status === 'Active' ? 'ok' : status === 'Suspended' ? 'warn' : 'crit';

const statusLabel = (status: string): string =>
  STATUS_OPTIONS.find((s) => s.v === status)?.l ?? status;

const PAGE_SIZE = 20;

const PatientAppAccounts: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);

  const [rows, setRows] = useState<PatientAppAccount[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [detail, setDetail] = useState<PatientAppAccount | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(false);
    getAccounts({ keyword, status, page: page + 1, pageSize: PAGE_SIZE })
      .then((r) => { setRows(r.items); setTotal(r.total); })
      .catch(() => { setRows([]); setError(true); })
      .finally(() => setLoading(false));
  }, [keyword, status, page]);

  useEffect(() => { reload(); }, [reload]);

  const changeStatus = (account: PatientAppAccount, next: string) => {
    let reason = '';
    Modal.confirm({
      title: next === 'Active'
        ? `Mở khoá tài khoản ${account.phoneNumber}?`
        : `Khoá tài khoản ${account.phoneNumber}?`,
      content: (
        <div>
          <p>
            {next === 'Active'
              ? 'Người bệnh sẽ đăng nhập lại được ngay.'
              : 'Mọi thiết bị đang đăng nhập sẽ bị đăng xuất ngay lập tức.'}
          </p>
          <Input
            placeholder="Lý do (ghi vào nhật ký)"
            onChange={(e) => { reason = e.target.value; }}
          />
        </div>
      ),
      okText: next === 'Active' ? 'Mở khoá' : 'Khoá',
      cancelText: 'Huỷ',
      onOk: () => setAccountStatus(account.id, next, reason)
        .then(() => { tk(next === 'Active' ? 'Đã mở khoá' : 'Đã khoá tài khoản'); reload(); })
        .catch(() => te('Không thực hiện được')),
    });
  };

  const resetPassword = (account: PatientAppAccount) => {
    Modal.confirm({
      title: `Đặt lại mật khẩu cho ${account.fullName || account.phoneNumber}?`,
      content:
        'Mật khẩu tạm sẽ hiện ra để bạn đọc cho người bệnh. '
        + 'Người bệnh bắt buộc đổi mật khẩu ở lần đăng nhập kế tiếp.',
      okText: 'Đặt lại',
      cancelText: 'Huỷ',
      onOk: () => resetAccountPassword(account.id)
        .then((r) => {
          reload();
          // Hiện trong hộp thoại riêng, không dùng toast: nhân viên cần đọc con số này cho người
          // bệnh, mà toast thì tự biến mất sau vài giây.
          Modal.success({
            title: 'Mật khẩu tạm',
            content: (
              <div>
                <p style={{ fontSize: 24, fontFamily: 'monospace', letterSpacing: 2 }}>
                  {r.temporaryPassword}
                </p>
                <p>Đọc cho người bệnh và nhắc họ đổi ngay sau khi đăng nhập.</p>
              </div>
            ),
          });
        })
        .catch(() => te('Không đặt lại được mật khẩu')),
    });
  };

  const columns: ColumnDef<PatientAppAccount>[] = [
    { key: 'phone', label: 'Số điện thoại', render: (a) => a.phoneNumber },
    { key: 'name', label: 'Họ tên', render: (a) => a.fullName || '—' },
    {
      key: 'linked',
      label: 'Hồ sơ bệnh án',
      render: (a) => a.hisPatientCode
        ? <span style={{ fontFamily: 'monospace' }}>{a.hisPatientCode}</span>
        : <StatusBadge tone="warn">Chưa liên kết</StatusBadge>,
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (a) => <StatusBadge tone={statusTone(a.status)}>{statusLabel(a.status)}</StatusBadge>,
    },
    { key: 'devices', label: 'Thiết bị', render: (a) => a.deviceCount },
    { key: 'last', label: 'Đăng nhập cuối', render: (a) => a.lastLoginAt ? fmtDTg(a.lastLoginAt) : '—' },
  ];

  const kpis: KpiItem[] = [
    { lbl: 'Kết quả tìm được', val: total, tone: 'info' },
    { lbl: 'Đã liên kết hồ sơ', val: rows.filter((a) => a.hisPatientCode).length, tone: 'ok' },
    {
      lbl: 'Đang bị khoá',
      val: rows.filter((a) => a.status !== 'Active').length,
      tone: rows.some((a) => a.status !== 'Active') ? 'warn' : 'info',
    },
  ];

  return (
    <div className="ab" data-testid="patient-app-accounts-page">
      <KpiStrip items={kpis} />

      <div className="ab-tools">
        <SearchBox
          value={keyword}
          onChange={(v) => { setKeyword(v); setPage(0); }}
          placeholder="Số điện thoại, họ tên hoặc mã bệnh nhân…"
        />
        <Filter
          value={status}
          onChange={(v) => { setStatus(v); setPage(0); }}
          options={STATUS_OPTIONS}
          placeholder="Mọi trạng thái"
        />
      </div>

      {loading ? <LoadingState />
        : error ? <ErrorState onRetry={reload} />
          : (
            <>
              <DataTable
                sortScope="page"
                data={rows}
                columns={columns}
                rowKey={(a) => a.id}
                onRowClick={setDetail}
                empty="Không có tài khoản nào khớp điều kiện tìm."
                actions={(a) => (
                  <>
                    <ActBtn
                      ic="lock"
                      tone={a.status === 'Active' ? undefined : 'warn'}
                      title={a.status === 'Active' ? 'Khoá tài khoản' : 'Mở khoá tài khoản'}
                      onClick={() => changeStatus(a, a.status === 'Active' ? 'Locked' : 'Active')}
                    />
                    <ActBtn ic="shield" title="Đặt lại mật khẩu" onClick={() => resetPassword(a)} />
                  </>
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
        title={detail?.fullName || detail?.phoneNumber || ''}
        sub={detail ? statusLabel(detail.status) : ''}
      >
        {detail && (
          <>
            <DrSec title="Tài khoản">
              <DrField lbl="Số điện thoại">{detail.phoneNumber}</DrField>
              <DrField lbl="Họ tên">{detail.fullName || '—'}</DrField>
              <DrField lbl="Trạng thái">
                <StatusBadge tone={statusTone(detail.status)}>
                  {statusLabel(detail.status)}
                </StatusBadge>
              </DrField>
              <DrField lbl="Buộc đổi mật khẩu">{detail.mustChangePassword ? 'Có' : 'Không'}</DrField>
              <DrField lbl="Đã đặt mã PIN">{detail.hasPin ? 'Có' : 'Chưa'}</DrField>
            </DrSec>
            <DrSec title="Hồ sơ bệnh án">
              <DrField lbl="Mã bệnh nhân">{detail.hisPatientCode || 'Chưa liên kết'}</DrField>
            </DrSec>
            <DrSec title="Hoạt động">
              <DrField lbl="Thiết bị đang đăng nhập">{detail.deviceCount}</DrField>
              <DrField lbl="Đăng nhập cuối">
                {detail.lastLoginAt ? fmtDTg(detail.lastLoginAt) : 'Chưa đăng nhập lần nào'}
              </DrField>
              <DrField lbl="Ngày tạo">{fmtDTg(detail.createdAt)}</DrField>
            </DrSec>
          </>
        )}
      </DrawerShell>
    </div>
  );
};

export default PatientAppAccounts;
