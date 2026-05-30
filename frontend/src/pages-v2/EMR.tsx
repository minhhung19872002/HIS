import React from 'react';
import dayjs from 'dayjs';
import { App as AntdApp } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getEmrRecords } from '../api/examination';
import type { EmrRecordDto } from '../api/examination';
import { SimpleV2Page, ActBtn, Btn, type ColumnDef } from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

/* ────────────────────────────────────────────────────────────
   HSBA điện tử v2 — record-centric (theo mock EMR v2):
   danh sách theo BỆNH NHÂN với bệnh nền + dị ứng + lượt khám + lần cuối.
   Nguồn: GET /examination/emr-records (gộp server-side + chronic/allergy).
   ──────────────────────────────────────────────────────────── */

const fmtDMY = (iso?: string) => (iso ? dayjs(iso).format('DD/MM/YYYY') : '—');
const genderLabel = (g: number) => (g === 1 ? 'Nam' : g === 2 ? 'Nữ' : '—');

const EMRV2: React.FC = () => {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();

  const columns: ColumnDef<EmrRecordDto>[] = [
    { key: 'code', label: 'Mã BN', mono: true, code: true, width: 150, render: (r) => r.patientCode },
    {
      key: 'name', label: 'Họ tên',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.patientName}</b>
          <i>{genderLabel(r.gender)}{r.age != null ? ` · ${r.age}t` : ''}</i>
        </div>
      ),
    },
    {
      key: 'bhyt', label: 'BHYT', mono: true, width: 130,
      render: (r) => r.insuranceNumber ? <span style={{ fontSize: 11 }}>{r.insuranceNumber}</span> : <span style={{ color: 'var(--t-3)' }}>—</span>,
    },
    {
      key: 'chronic', label: 'Bệnh nền',
      render: (r) => (r.chronicDiseases?.length ? (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {r.chronicDiseases.slice(0, 2).map((c) => <span key={c} className="chip info" style={{ fontSize: 10 }}>{c}</span>)}
          {r.chronicDiseases.length > 2 && <span style={{ fontSize: 11, color: 'var(--t-2)' }}>+{r.chronicDiseases.length - 2}</span>}
        </div>
      ) : <span style={{ color: 'var(--t-3)' }}>—</span>),
    },
    {
      key: 'allergies', label: 'Dị ứng',
      render: (r) => (r.allergies?.length
        ? <span className="chip crit" style={{ fontSize: 10 }}>⚠ {r.allergies.join(', ')}</span>
        : <span style={{ color: 'var(--t-3)' }}>—</span>),
    },
    { key: 'visits', label: 'Lượt KB', mono: true, width: 90, render: (r) => r.visitCount },
    { key: 'last', label: 'Lần cuối', mono: true, width: 110, render: (r) => fmtDMY(r.lastVisit) },
  ];

  return (
    <SimpleV2Page<EmrRecordDto>
      title="Hồ sơ bệnh án điện tử"
      load={async () => {
        try {
          const r = await getEmrRecords(undefined, 1, 300);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return ((r as any)?.data?.items || []) as EmrRecordDto[];
        } catch {
          return [];
        }
      }}
      rowKey={(r) => r.patientId}
      columns={columns}
      searchPlaceholder="Tìm BN / mã / chẩn đoán…"
      searchOf={(r) => `${r.patientName} ${r.patientCode} ${r.lastDiagnosisName || ''} ${(r.chronicDiseases || []).join(' ')}`}
      kpis={(rows) => {
        const today = dayjs().startOf('day');
        const todayUpdated = rows.filter((r) => dayjs(r.lastVisit).isSame(today, 'day')).length;
        const chronic = rows.filter((r) => r.chronicDiseases?.length).length;
        const allergic = rows.filter((r) => r.allergies?.length).length;
        const totalVisits = rows.reduce((s, r) => s + r.visitCount, 0);
        const avgVisits = rows.length > 0 ? Math.round(totalVisits / rows.length * 10) / 10 : 0;
        return [
          { lbl: 'Tổng hồ sơ', val: rows.length, sub: 'đang theo dõi' },
          { lbl: 'Cập nhật hôm nay', val: todayUpdated, sub: 'có lượt khám', tone: 'info' },
          { lbl: 'Bệnh mạn tính', val: chronic, sub: rows.length ? `${Math.round(chronic / rows.length * 100)}% BN` : '—', tone: 'warn' },
          { lbl: 'Có dị ứng', val: allergic, sub: 'cần lưu ý', tone: 'warn' },
          { lbl: 'Lượt KB / BN', val: avgVisits, sub: 'trung bình' },
          { lbl: 'Tổng lượt khám', val: totalVisits, sub: '365 ngày' },
        ];
      }}
      rowActions={(r) => (
        <div className="ab-actions">
          <ActBtn ic="eye" title="Mở hồ sơ" onClick={() => navigate('/v2/emr/edit')} />
          <ActBtn ic="print" title="In HS" onClick={() => message.success('Đã gửi PDF')} />
        </div>
      )}
      drawer={(r) => (
        <div style={{ padding: 18 }}>
          <div className="rec-section">
            <h5><TermIcon name="user" size={11} /> BỆNH NHÂN</h5>
            <div className="rec-kv">
              <span>Họ tên</span><b>{r.patientName}</b>
              <span>Mã BN</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.patientCode}</span>
              <span>Giới · Tuổi</span><span>{genderLabel(r.gender)}{r.age != null ? ` · ${r.age}t` : ''}</span>
              <span>BHYT</span><span className="mono">{r.insuranceNumber || '—'}</span>
            </div>
          </div>
          <div className="rec-section">
            <h5><TermIcon name="heart" size={11} /> BỆNH NỀN · DỊ ỨNG</h5>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--t-2)', marginBottom: 4 }}>Bệnh nền</div>
              {r.chronicDiseases?.length ? (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {r.chronicDiseases.map((c) => <span key={c} className="chip info">{c}</span>)}
                </div>
              ) : <span style={{ color: 'var(--t-3)', fontSize: 12 }}>Không ghi nhận</span>}
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--t-2)', marginBottom: 4 }}>Dị ứng</div>
              {r.allergies?.length ? (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {r.allergies.map((a) => <span key={a} className="chip crit">⚠ {a}</span>)}
                </div>
              ) : <span style={{ color: 'var(--t-3)', fontSize: 12 }}>Không ghi nhận</span>}
            </div>
          </div>
          <div className="rec-section">
            <h5><TermIcon name="stethoscope" size={11} /> LƯỢT KHÁM GẦN NHẤT</h5>
            <div className="rec-kv">
              <span>Lượt khám</span><b>{r.visitCount}</b>
              <span>Lần cuối</span><span className="mono">{fmtDMY(r.lastVisit)}</span>
              <span>Phòng</span><span>{r.lastRoomName || '—'}</span>
              <span>Chẩn đoán</span><span>{r.lastDiagnosisName || '—'}{r.lastDiagnosisCode ? ` (${r.lastDiagnosisCode})` : ''}</span>
            </div>
          </div>
          <div className="rec-section">
            <h5><TermIcon name="info" size={11} /> THAO TÁC</h5>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Btn variant="primary" onClick={() => navigate('/v2/emr/edit')}>
                <TermIcon name="eye" size={12} /> Mở HS chi tiết
              </Btn>
              <Btn onClick={() => message.success('Đã gửi PDF')}>
                <TermIcon name="print" size={12} /> In hồ sơ
              </Btn>
              <Btn onClick={() => navigate('/v2/signing-workflow')}>
                <TermIcon name="check" size={12} /> Ký số
              </Btn>
            </div>
          </div>
        </div>
      )}
      drawerTitle={(r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 13 }}>{r.patientCode}</span>
          <span style={{ fontSize: 14 }}>{r.patientName}</span>
        </span>
      )}
      drawerSub={(r) => `${r.visitCount} lượt khám · lần cuối ${fmtDMY(r.lastVisit)}`}
    />
  );
};

export default EMRV2;
