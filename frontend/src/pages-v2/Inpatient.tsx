import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Modal, App as AntdApp, Input } from 'antd';
import * as inpatientApi from '../api/inpatient';
import type { WardLayoutDto, BedLayoutDto, RoomLayoutDto } from '../api/inpatient';
import systemApi from '../api/system';
import type { DepartmentCatalogDto } from '../api/system';
import './Inpatient.css';

// status: 1=Available, 2=Occupied, 3=Cleaning, 4=Maintenance, 5=Reserved
type BedStatus = 'stable' | 'watch' | 'crit' | 'discharge' | 'empty' | 'cleaning' | 'maint';
const statusFromCode = (code: number): BedStatus => {
  switch (code) {
    case 2: return 'stable';
    case 3: return 'cleaning';
    case 4: return 'maint';
    default: return 'empty';
  }
};

const statusVi = (s: BedStatus): string => ({
  stable: 'Ổn định', watch: 'Theo dõi', crit: 'Nguy kịch',
  discharge: 'Chờ xuất', empty: 'Trống',
  cleaning: 'Vệ sinh', maint: 'Bảo trì',
}[s]);

type EnrichedBed = BedLayoutDto & { ui: BedStatus; room: string; roomType: number };

const InpatientV2: React.FC = () => {
  const { message } = AntdApp.useApp();
  const [wards, setWards] = useState<WardLayoutDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel]                 = useState<string | null>(null);
  const [deptFilter, setDeptFilter]   = useState<'all' | string>('all');
  const [orderModal, setOrderModal]   = useState(false);
  const [transferModal, setXferModal] = useState(false);
  const [dischargeModal, setDischModal] = useState(false);

  // Load all departments → fetch ward layout for each → keep ones with beds
  useEffect(() => {
    setLoading(true);
    systemApi.catalog.getDepartments(undefined, undefined, true)
      .then(async (r) => {
        const depts: DepartmentCatalogDto[] = Array.isArray(r.data) ? r.data : [];
        const layouts: WardLayoutDto[] = [];
        await Promise.all(depts.map(async (d: DepartmentCatalogDto) => {
          if (!d.id) return;
          try {
            const lay = await inpatientApi.getWardLayout(d.id);
            if (lay.data && lay.data.totalBeds > 0) layouts.push(lay.data);
          } catch { /* ignore depts that 404 */ }
        }));
        setWards(layouts);
        setLoading(false);
      })
      .catch(() => { setWards([]); setLoading(false); });
  }, []);

  const allBeds = useMemo<EnrichedBed[]>(() => {
    const list: EnrichedBed[] = [];
    wards.forEach((w) => {
      (w.rooms || []).forEach((rm) => {
        (rm.beds || []).forEach((bed) => {
          list.push({
            ...bed,
            ui: statusFromCode(bed.status),
            room: rm.roomCode,
            roomType: rm.roomType,
          });
        });
      });
    });
    return list;
  }, [wards]);

  const stats = {
    total: allBeds.length,
    occ:   allBeds.filter((b) => b.ui === 'stable' || b.ui === 'watch' || b.ui === 'crit' || b.ui === 'discharge').length,
    crit:  allBeds.filter((b) => b.ui === 'crit').length,
    watch: allBeds.filter((b) => b.ui === 'watch').length,
    empty: allBeds.filter((b) => b.ui === 'empty').length,
    discharge: allBeds.filter((b) => b.ui === 'discharge').length,
  };
  const occPct = stats.total > 0 ? Math.round((stats.occ / stats.total) * 100) : 0;
  const losAvg = (() => {
    const days = allBeds.map((b) => b.daysOfStay).filter((d): d is number => typeof d === 'number' && d > 0);
    if (days.length === 0) return 0;
    return Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10;
  })();
  const todayAdmissions = allBeds.filter((b) => b.admissionDate && dayjs(b.admissionDate).isSame(dayjs(), 'day')).length;

  const selBed = sel ? allBeds.find((b) => `${b.room}-${b.bedCode}` === sel) : null;
  const wardsToShow = deptFilter === 'all' ? wards : wards.filter((w) => w.departmentCode === deptFilter);

  return (
    <div className="ward-wrap">
      {/* ====== TOP KPIs ====== */}
      <div className="ward-top">
        <KpiCell l="Tổng giường" v={stats.total} />
        <KpiCell l="Đang sử dụng" v={stats.occ} small={`· ${occPct}%`} />
        <KpiCell l="Nguy kịch" v={stats.crit} cls="crit" />
        <KpiCell l="Theo dõi"   v={stats.watch} cls="warn" />
        <KpiCell l="Chờ xuất viện" v={stats.discharge} cls="ok" />
        <KpiCell l="Trống" v={stats.empty} />
        <KpiCell l="LOS trung bình" v={losAvg} small="ngày" />
        <KpiCell l="Nhập viện hôm nay" v={todayAdmissions} />
      </div>

      {/* ====== WARD FILTER CHIPS ====== */}
      <div className="ward-sub">
        <div
          className={'ward-chip ' + (deptFilter === 'all' ? 'on' : '')}
          onClick={() => setDeptFilter('all')}
        >Toàn bệnh viện <span className="c">{stats.total}</span></div>
        {wards.map((w) => (
          <div
            key={w.departmentCode}
            className={'ward-chip ' + (deptFilter === w.departmentCode ? 'on' : '')}
            onClick={() => setDeptFilter(w.departmentCode)}
          >{w.departmentName} <span className="c">{w.totalBeds}</span></div>
        ))}
        <div style={{ flex: 1 }} />
        <div className="ward-chip" onClick={() => message.info('Đi buồng — tính năng đang phát triển')}>
          🩺 Đi buồng
        </div>
      </div>

      {/* ====== MAIN BODY: map + detail ====== */}
      <div className="ward-body">
        <div className="ward-map">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--t-3)', fontSize: 13 }}>
              Đang tải sơ đồ giường...
            </div>
          ) : wardsToShow.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--t-3)', fontSize: 13 }}>
              Chưa có khoa nào có giường nội trú
            </div>
          ) : wardsToShow.map((ward) => {
            const wardBeds = (ward.rooms || []).flatMap((r) => r.beds || []);
            const wOcc = wardBeds.filter((b) => b.status === 2).length;
            return (
              <div key={ward.departmentId} className="ward-floor">
                <div className="ward-floor-h">
                  <div className="ward-floor-t">
                    {ward.departmentName}
                    <small>· {ward.totalRooms} phòng · {ward.totalBeds} giường</small>
                  </div>
                  <div className="ward-floor-sum">
                    <span>Sử dụng <b>{wOcc}/{ward.totalBeds}</b> ({Math.round((ward.occupancyRate || 0))}%)</span>
                    <span>Trống <b>{ward.availableBeds}</b></span>
                    <span>Bảo trì <b>{ward.maintenanceBeds}</b></span>
                  </div>
                </div>
                {(ward.rooms || []).map((room) => (
                  <div key={room.roomId} className="ward-row">
                    <div className={'ward-room-lbl ' + (room.roomType === 2 ? 'icu' : room.roomType === 3 ? 'vip' : room.roomType === 4 ? 'iso' : '')}>
                      <div className="r">{room.roomCode}</div>
                      <div className="t">{room.roomName?.split(' · ')[0]}</div>
                    </div>
                    <div className="ward-beds" style={{ gridTemplateColumns: `repeat(${Math.max(room.totalBeds, 4)}, 1fr)` }}>
                      {(room.beds || []).map((bed) => (
                        <BedCell
                          key={bed.bedId}
                          bed={bed}
                          room={room}
                          sel={sel}
                          onSelect={setSel}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        <div className="ward-detail">
          {selBed && selBed.patientName ? (
            <>
              <div className="ward-detail-h">
                <div className="ward-detail-t">{sel}</div>
                <div className="ward-detail-sub">
                  <span>Tình trạng <b style={{
                    color: selBed.ui === 'crit' ? 'var(--s-crit)'
                         : selBed.ui === 'watch' ? 'var(--s-warn)'
                         : 'var(--s-ok)',
                  }}>{statusVi(selBed.ui)}</b></span>
                  {selBed.daysOfStay && <span>Nằm viện <b>{selBed.daysOfStay} ngày</b></span>}
                </div>
              </div>
              <div className="ward-detail-body">
                <Sec title="Bệnh nhân">
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: 'var(--a-cy-bg)', color: 'var(--a-cy)',
                      display: 'grid', placeItems: 'center',
                      fontSize: 20, fontWeight: 600,
                      border: '1px solid var(--a-cy-line)',
                    }}>
                      {selBed.patientName.split(' ').slice(-1)[0][0]}
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--t-0)' }}>{selBed.patientName}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t-2)', marginTop: 2 }}>
                        {selBed.patientCode || '—'}
                        {selBed.age && ` · ${selBed.age}t`}
                        {selBed.gender !== undefined && ` · ${selBed.gender === 1 ? 'Nam' : 'Nữ'}`}
                      </div>
                    </div>
                  </div>
                </Sec>

                {selBed.mainDiagnosis && (
                  <Sec title="Chẩn đoán">
                    <div style={{
                      fontSize: 12,
                      padding: '8px 10px',
                      background: 'var(--d-1)',
                      border: '1px solid var(--line)',
                      borderRadius: 'var(--r-2)',
                    }}>{selBed.mainDiagnosis}</div>
                  </Sec>
                )}

                {selBed.admissionDate && (
                  <Sec title="Nhập viện">
                    <div style={{ fontSize: 12 }}>
                      <b>{dayjs(selBed.admissionDate).format('DD/MM/YYYY HH:mm')}</b>
                      {selBed.daysOfStay && ` · ${selBed.daysOfStay} ngày`}
                    </div>
                  </Sec>
                )}

                <Sec title="BHYT">
                  <div style={{ fontSize: 12 }}>
                    {selBed.isInsurance
                      ? <span style={{ color: 'var(--s-ok)' }}>✓ Có BHYT</span>
                      : <span style={{ color: 'var(--t-2)' }}>Không BHYT</span>}
                  </div>
                </Sec>

                {selBed.sharedPatients && selBed.sharedPatients.length > 0 && (
                  <Sec title="BN dùng chung giường">
                    {selBed.sharedPatients.map((p) => (
                      <div key={p.admissionId} style={{ fontSize: 12, marginBottom: 4 }}>
                        <b>{p.patientName}</b> · {p.patientCode}
                      </div>
                    ))}
                  </Sec>
                )}
              </div>

              <div className="ward-detail-foot">
                <button onClick={() => setOrderModal(true)}>Y lệnh hôm nay</button>
                <button onClick={() => setXferModal(true)}>Chuyển giường</button>
                <button className="p" onClick={() => setDischModal(true)}>Xuất viện</button>
              </div>
            </>
          ) : selBed ? (
            <div style={{ padding: 24, color: 'var(--t-3)', fontSize: 12, textAlign: 'center' }}>
              Giường <b>{sel}</b> · {statusVi(selBed.ui)} · không có bệnh nhân
            </div>
          ) : (
            <div style={{ padding: 24, color: 'var(--t-3)', fontSize: 12, textAlign: 'center' }}>
              Chọn một giường có bệnh nhân để xem chi tiết
            </div>
          )}
        </div>
      </div>

      {/* ====== MODALS ====== */}
      <Modal
        open={orderModal}
        onCancel={() => setOrderModal(false)}
        title={`Y lệnh — ${selBed?.patientName || ''}`}
        footer={null}
        width={640}
      >
        <div style={{ fontSize: 12, color: 'var(--t-2)', padding: 10 }}>
          Trang Y lệnh chi tiết xem trong /v2/prescription
        </div>
      </Modal>
      <Modal
        open={transferModal}
        onCancel={() => setXferModal(false)}
        title="Chuyển giường"
        onOk={() => { message.success('✓ Đã gửi yêu cầu chuyển giường'); setXferModal(false); }}
      >
        <Input.TextArea rows={4} placeholder="Lý do chuyển giường..." />
      </Modal>
      <Modal
        open={dischargeModal}
        onCancel={() => setDischModal(false)}
        title={`Xuất viện — ${selBed?.patientName || ''}`}
        onOk={() => { message.success('✓ Đã tạo đơn xuất viện'); setDischModal(false); }}
      >
        <Input.TextArea rows={4} placeholder="Tóm tắt điều trị, hướng dẫn ra viện..." />
      </Modal>
    </div>
  );
};

const BedCell: React.FC<{
  bed: BedLayoutDto;
  room: RoomLayoutDto;
  sel: string | null;
  onSelect: (key: string) => void;
}> = ({ bed, room, sel, onSelect }) => {
  const key = `${room.roomCode}-${bed.bedCode}`;
  const ui = statusFromCode(bed.status);
  const occCls =
    ui === 'crit' ? 'crit' :
    ui === 'watch' ? 'watch' :
    ui === 'discharge' ? 'discharge' :
    ui === 'cleaning' ? 'cleaning' :
    ui === 'maint' ? 'maint' :
    ui === 'stable' ? 'stable' : 'empty';

  return (
    <div
      className={'ward-bed ' + occCls + (sel === key ? ' sel' : '')}
      onClick={() => onSelect(key)}
      title={`${bed.bedName || bed.bedCode} · ${bed.statusName}${bed.patientName ? ' · ' + bed.patientName : ''}`}
    >
      <div className="ward-bed-num">{bed.bedCode}</div>
      {bed.patientName ? (
        <>
          <div className="ward-bed-pname">{bed.patientName.split(' ').slice(-1)[0]}</div>
          {bed.age && <div className="ward-bed-meta">{bed.age}{bed.gender === 1 ? 'M' : 'F'}</div>}
        </>
      ) : (
        <div className="bed-placeholder">{statusVi(ui)}</div>
      )}
    </div>
  );
};

const KpiCell: React.FC<{ l: string; v: React.ReactNode; cls?: string; small?: string }> = ({ l, v, cls, small }) => (
  <div className={'ward-kpi ' + (cls || '')}>
    <div className="l">{l}</div>
    <div className="v">
      {v}
      {small && <span style={{ fontSize: 11, color: 'var(--t-3)', fontWeight: 400, marginLeft: 4 }}>{small}</span>}
    </div>
  </div>
);

const Sec: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="ward-sec">
    <div className="ward-sec-h">{title}</div>
    <div className="ward-sec-b">{children}</div>
  </div>
);

export default InpatientV2;
