import React from 'react';
import dayjs from 'dayjs';
import { getScreeningRequests } from '../api/screening';
import type { ScreeningRequest } from '../api/screening';
import { SimpleV2Page, StatusBadge, type ColumnDef, type StatusTab } from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

type StatusKey = 'pending' | 'collected' | 'processing' | 'ready' | 'completed';
const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'pending',    l: 'Chờ lấy mẫu',  tone: 'info' },
  { v: 'collected',  l: 'Đã lấy mẫu',   tone: 'warn' },
  { v: 'processing', l: 'Đang chạy',    tone: 'warn' },
  { v: 'ready',      l: 'Có kết quả',   tone: 'ok' },
  { v: 'completed',  l: 'Hoàn tất',     tone: 'ok' },
];
const statusKey = (s: number): StatusKey =>
  s === 1 ? 'collected' : s === 2 ? 'processing' : s === 3 ? 'ready' : s === 4 ? 'completed' : 'pending';
const TYPE_LABEL: Record<string, string> = { newborn: 'SL sơ sinh', prenatal: 'SL trước sinh' };
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';

const ScreeningV2: React.FC = () => {
  const columns: ColumnDef<ScreeningRequest>[] = [
    { key: 'code', label: 'Mã SL', mono: true, width: 130, render: (r) => r.requestCode },
    { key: 'type', label: 'Loại', width: 140, render: (r) =>
      <span className={`chip ${r.screeningType === 'newborn' ? 'info' : 'warn'}`}>{TYPE_LABEL[r.screeningType] || r.screeningType}</span>
    },
    { key: 'subject', label: 'Đối tượng', render: (r) => (
      <div className="cell-2l">
        <b>{r.babyName || r.patientName}</b>
        <i className="mono">{r.patientCode}{r.motherName ? ` · Mẹ: ${r.motherName}` : ''}{r.maternalAge ? ` · ${r.maternalAge}t` : ''}</i>
      </div>
    )},
    { key: 'detail', label: 'Chi tiết', width: 200, render: (r) =>
      r.screeningType === 'newborn' ? (
        <div className="cell-2l">
          <b>{r.birthWeight}g · {r.gestationalAge}t</b>
          <i>Apgar {r.apgarScore} · {r.deliveryMethod}</i>
        </div>
      ) : (
        <div className="cell-2l">
          <b>Tuần {r.pregnancyWeek}</b>
          <i>G{r.gravida || 0}P{r.para || 0}</i>
        </div>
      )
    },
    { key: 'sample', label: 'Barcode mẫu', mono: true, width: 140, render: (r) => r.sampleBarcode || '—' },
    { key: 'collected', label: 'Lấy mẫu', mono: true, width: 100, render: (r) => fmtDMY(r.collectionDate) },
    { key: 'request', label: 'Ngày YC', mono: true, width: 100, render: (r) => fmtDMY(r.requestDate) },
    { key: 'results', label: 'KQ', mono: true, width: 70, render: (r) => `${r.results?.length || 0}` },
    { key: 'status', label: 'TT', width: 130, render: (r) => {
      const sk = statusKey(r.status);
      return <StatusBadge tone={STATUS_TABS.find((t) => t.v === sk)?.tone} dot>{STATUS_TABS.find((t) => t.v === sk)?.l}</StatusBadge>;
    }},
  ];

  return (
    <SimpleV2Page<ScreeningRequest>
      title="Sàng lọc sơ sinh / trước sinh"
      load={async () => {
        const r = await getScreeningRequests();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return Array.isArray(r) ? r : ((r as any)?.items || (r as any)?.data || []);
      }}
      rowKey={(r) => r.id}
      columns={columns}
      searchPlaceholder="Tìm BN / mẹ / mã / barcode…"
      searchOf={(r) => `${r.patientName} ${r.babyName || ''} ${r.motherName || ''} ${r.requestCode} ${r.sampleBarcode || ''}`}
      statusTabs={STATUS_TABS as unknown as StatusTab<string>[]}
      statusOf={(r) => statusKey(r.status)}
      filters={[{
        key: 'type', placeholder: '▾ Loại sàng lọc',
        options: [{ v: 'newborn', l: 'Sơ sinh' }, { v: 'prenatal', l: 'Trước sinh' }],
        valueOf: (r) => r.screeningType,
      }]}
      kpis={(rows) => {
        const newborn = rows.filter((r) => r.screeningType === 'newborn').length;
        const prenatal = rows.filter((r) => r.screeningType === 'prenatal').length;
        return [
          { lbl: 'Tổng SL', val: rows.length },
          { lbl: 'SL sơ sinh', val: newborn, tone: 'info' },
          { lbl: 'SL trước sinh', val: prenatal, tone: 'warn' },
          { lbl: 'Có KQ', val: rows.filter((r) => r.status >= 3).length, tone: 'ok' },
          { lbl: 'Đang xử lý', val: rows.filter((r) => r.status >= 1 && r.status <= 2).length, tone: 'warn' },
          { lbl: 'Hoàn tất', val: rows.filter((r) => r.status === 4).length, tone: 'ok' },
        ];
      }}
      drawer={(r) => (
        <>
          <div className="rec-section">
            <h5><TermIcon name="info" size={11} /> THÔNG TIN SÀNG LỌC</h5>
            <div className="rec-kv">
              <span>Mã SL</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.requestCode}</span>
              <span>Loại</span><b>{TYPE_LABEL[r.screeningType]}</b>
              <span>BN</span><b>{r.patientName}</b>
              <span>Mã BN</span><span className="mono">{r.patientCode}</span>
              <span>Ngày YC</span><span>{fmtDMY(r.requestDate)}</span>
            </div>
          </div>
          {r.screeningType === 'newborn' && (
            <div className="rec-section">
              <h5><TermIcon name="user" size={11} /> THÔNG TIN BÉ</h5>
              <div className="rec-kv">
                {r.babyName && (<><span>Tên bé</span><b>{r.babyName}</b></>)}
                {r.babyGender && (<><span>Giới tính</span><span>{r.babyGender === 1 ? 'Nam' : 'Nữ'}</span></>)}
                {r.birthWeight && (<><span>Cân khi sinh</span><b>{r.birthWeight} g</b></>)}
                {r.gestationalAge && (<><span>Tuổi thai</span><span>{r.gestationalAge} tuần</span></>)}
                {r.birthDate && (<><span>Ngày sinh</span><span>{fmtDMY(r.birthDate)}</span></>)}
                {r.deliveryMethod && (<><span>PP sinh</span><span>{r.deliveryMethod}</span></>)}
                {r.apgarScore && (<><span>Apgar</span><span>{r.apgarScore}</span></>)}
                {r.feedingType && (<><span>Cho bú</span><span>{r.feedingType}</span></>)}
                {r.motherName && (<><span>Mẹ</span><span>{r.motherName}{r.motherAge ? ` · ${r.motherAge}t` : ''}</span></>)}
              </div>
            </div>
          )}
          {r.screeningType === 'prenatal' && (
            <div className="rec-section">
              <h5><TermIcon name="heart" size={11} /> THÔNG TIN MẸ</h5>
              <div className="rec-kv">
                {r.maternalAge && (<><span>Tuổi mẹ</span><b>{r.maternalAge}</b></>)}
                {r.pregnancyWeek && (<><span>Tuần thai</span><b>{r.pregnancyWeek}</b></>)}
                {r.gravida && (<><span>Số lần có thai</span><span>G{r.gravida}P{r.para || 0}</span></>)}
                {r.lastMenstrualDate && (<><span>Kinh cuối</span><span>{fmtDMY(r.lastMenstrualDate)}</span></>)}
                {r.ultrasoundDate && (<><span>Siêu âm gần nhất</span><span>{fmtDMY(r.ultrasoundDate)}</span></>)}
              </div>
            </div>
          )}
          <div className="rec-section">
            <h5><TermIcon name="flask" size={11} /> MẪU</h5>
            <div className="rec-kv">
              <span>Barcode</span><span className="mono">{r.sampleBarcode || '—'}</span>
              <span>Lấy mẫu</span><span>{fmtDMY(r.collectionDate)}</span>
              <span>Số test</span><b>{r.results?.length || 0}</b>
            </div>
          </div>
        </>
      )}
      drawerTitle={(r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 13 }}>{r.requestCode}</span>
          <span style={{ fontSize: 14 }}>{r.babyName || r.patientName}</span>
        </span>
      )}
      drawerSub={(r) => `${TYPE_LABEL[r.screeningType]} · ${fmtDMY(r.requestDate)}`}
    />
  );
};

export default ScreeningV2;
