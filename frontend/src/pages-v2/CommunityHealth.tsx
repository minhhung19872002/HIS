import React from 'react';
import dayjs from 'dayjs';
import { searchHouseholds } from '../api/communityHealth';
import type { Household } from '../api/communityHealth';
import { SimpleV2Page, StatusBadge, type ColumnDef, type StatusTab } from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

type StatusKey = 'active' | 'inactive' | 'moved';
const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'active',   l: 'Đang quản lý', tone: 'ok' },
  { v: 'inactive', l: 'Tạm ngưng',    tone: 'info' },
  { v: 'moved',    l: 'Đã chuyển',    tone: 'crit' },
];
const statusKey = (s: number): StatusKey => s === 1 ? 'inactive' : s === 2 ? 'moved' : 'active';
const RISK_TONE: Record<string, 'ok' | 'warn' | 'crit'> = { Low: 'ok', Medium: 'warn', High: 'crit', VeryHigh: 'crit' };
const RISK_LABEL: Record<string, string> = { Low: 'Thấp', Medium: 'TB', High: 'Cao', VeryHigh: 'Rất cao' };
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';

const CommunityHealthV2: React.FC = () => {
  const columns: ColumnDef<Household>[] = [
    { key: 'code', label: 'Mã hộ', mono: true, width: 130, render: (r) => r.householdCode },
    { key: 'head', label: 'Chủ hộ · Địa chỉ', render: (r) => (
      <div className="cell-2l"><b>{r.headName}</b><i>{r.address}, {r.ward}, {r.district}</i></div>
    )},
    { key: 'members', label: 'Thành viên', mono: true, width: 100, render: (r) => `${r.memberCount} người` },
    { key: 'risk', label: 'Mức rủi ro', width: 110, render: (r) =>
      <span className={`chip ${RISK_TONE[r.riskLevel] || 'info'}`}>{RISK_LABEL[r.riskLevel] || r.riskLevel}</span>
    },
    { key: 'flags', label: 'Đối tượng', width: 200, render: (r) => (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {r.hasElderlyMember && <span className="chip warn">NCT</span>}
        {r.hasChildUnder5 && <span className="chip warn">Trẻ &lt;5</span>}
        {r.hasPregnant && <span className="chip warn">Thai</span>}
        {r.hasChronicDisease && <span className="chip crit">Mạn tính</span>}
      </div>
    )},
    { key: 'team', label: 'Đội phụ trách', render: (r) => r.assignedTeamName || '—' },
    { key: 'last', label: 'Thăm gần nhất', mono: true, width: 110, render: (r) => fmtDMY(r.lastVisitDate) },
    { key: 'next', label: 'Thăm tiếp', mono: true, width: 110, render: (r) => fmtDMY(r.nextVisitDate) },
    { key: 'status', label: 'TT', width: 130, render: (r) => {
      const sk = statusKey(r.status);
      return <StatusBadge tone={STATUS_TABS.find((t) => t.v === sk)?.tone} dot>{STATUS_TABS.find((t) => t.v === sk)?.l}</StatusBadge>;
    }},
  ];

  return (
    <SimpleV2Page<Household>
      title="Quản lý hộ gia đình"
      load={() => searchHouseholds()}
      rowKey={(r) => r.id}
      columns={columns}
      searchPlaceholder="Tìm chủ hộ / mã hộ / địa chỉ…"
      searchOf={(r) => `${r.headName} ${r.householdCode} ${r.address} ${r.ward}`}
      statusTabs={STATUS_TABS as unknown as StatusTab<string>[]}
      statusOf={(r) => statusKey(r.status)}
      filters={[{
        key: 'risk', placeholder: '▾ Mức rủi ro',
        options: Object.entries(RISK_LABEL).map(([v, l]) => ({ v, l })),
        valueOf: (r) => r.riskLevel,
      }]}
      kpis={(rows) => {
        const high = rows.filter((r) => r.riskLevel === 'High' || r.riskLevel === 'VeryHigh').length;
        const overdue = rows.filter((r) => r.nextVisitDate && dayjs(r.nextVisitDate).isBefore(dayjs(), 'day')).length;
        const totalMembers = rows.reduce((s, r) => s + (r.memberCount || 0), 0);
        return [
          { lbl: 'Tổng hộ', val: rows.length },
          { lbl: 'Tổng người', val: totalMembers, sub: 'thành viên' },
          { lbl: 'Rủi ro cao', val: high, tone: 'crit' },
          { lbl: 'Quá hạn thăm', val: overdue, tone: 'warn' },
          { lbl: 'Có người NCT', val: rows.filter((r) => r.hasElderlyMember).length, tone: 'warn' },
          { lbl: 'Có thai phụ', val: rows.filter((r) => r.hasPregnant).length, tone: 'warn' },
        ];
      }}
      drawer={(r) => (
        <>
          <div className="rec-section">
            <h5><TermIcon name="user" size={11} /> THÔNG TIN HỘ</h5>
            <div className="rec-kv">
              <span>Mã hộ</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.householdCode}</span>
              <span>Chủ hộ</span><b>{r.headName}</b>
              <span>Địa chỉ</span><span>{r.address}, {r.ward}, {r.district}, {r.province}</span>
              {r.phone && (<><span>Điện thoại</span><span className="mono">{r.phone}</span></>)}
              <span>Số thành viên</span><b>{r.memberCount} người</b>
              <span>Mức rủi ro</span><span className={`chip ${RISK_TONE[r.riskLevel]}`}>{RISK_LABEL[r.riskLevel]}</span>
            </div>
          </div>
          <div className="rec-section">
            <h5><TermIcon name="alert" size={11} /> ĐỐI TƯỢNG ĐẶC BIỆT</h5>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {r.hasElderlyMember && <span className="chip warn">Người cao tuổi</span>}
              {r.hasChildUnder5 && <span className="chip warn">Trẻ dưới 5 tuổi</span>}
              {r.hasPregnant && <span className="chip warn">Phụ nữ mang thai</span>}
              {r.hasChronicDisease && <span className="chip crit">Bệnh mạn tính</span>}
              {!r.hasElderlyMember && !r.hasChildUnder5 && !r.hasPregnant && !r.hasChronicDisease &&
                <span style={{ color: 'var(--t-3)' }}>Không có</span>}
            </div>
          </div>
          <div className="rec-section">
            <h5><TermIcon name="calendar" size={11} /> THĂM HỘ</h5>
            <div className="rec-kv">
              <span>Đội phụ trách</span><span>{r.assignedTeamName || '—'}</span>
              <span>Thăm gần nhất</span><span>{fmtDMY(r.lastVisitDate)}</span>
              <span>Thăm tiếp</span><span>{fmtDMY(r.nextVisitDate)}</span>
            </div>
          </div>
          {r.notes && (
            <div className="rec-section">
              <h5><TermIcon name="info" size={11} /> GHI CHÚ</h5>
              <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}>{r.notes}</div>
            </div>
          )}
        </>
      )}
      drawerTitle={(r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 13 }}>{r.householdCode}</span>
          <span style={{ fontSize: 14 }}>{r.headName}</span>
        </span>
      )}
      drawerSub={(r) => `${r.memberCount} thành viên · ${r.ward}, ${r.district}`}
    />
  );
};

export default CommunityHealthV2;
