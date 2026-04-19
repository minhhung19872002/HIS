import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import * as examApi from '../api/examination';
import type { RoomDto, RoomPatientListDto } from '../api/examination';
import TermIcon from '../layouts/terminal/Icon';

const priorityChip = (p: RoomPatientListDto) => {
  if (p.isEmergency) return <span className="chip crit">Cấp cứu</span>;
  if (p.isPriority) return <span className="chip warn">Ưu tiên</span>;
  if (p.isChronic) return <span className="chip info">Mạn tính</span>;
  return null;
};

const statusChip = (s: number) => {
  switch (s) {
    case 0: return <span className="chip warn">Chờ khám</span>;
    case 1: return <span className="chip cy">Đang khám</span>;
    case 2: return <span className="chip info">Chờ CLS</span>;
    case 3: return <span className="chip mag">Chờ kết luận</span>;
    case 4: return <span className="chip ok">Hoàn tất</span>;
    default: return <span className="chip">—</span>;
  }
};

const OPDV2: React.FC = () => {
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [queue, setQueue] = useState<RoomPatientListDto[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  useEffect(() => {
    const loadRooms = async () => {
      setLoadingRooms(true);
      try {
        const res = await examApi.getActiveExaminationRooms();
        const list = Array.isArray(res.data) ? res.data : [];
        setRooms(list);
        if (list.length > 0 && !selectedRoomId) setSelectedRoomId(list[0].id);
      } finally {
        setLoadingRooms(false);
      }
    };
    loadRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedRoomId) return;
    const loadQueue = async () => {
      setLoadingQueue(true);
      try {
        const res = await examApi.getRoomPatientList(selectedRoomId);
        setQueue(Array.isArray(res.data) ? res.data : []);
        setSelectedPatientId(null);
      } finally {
        setLoadingQueue(false);
      }
    };
    loadQueue();
  }, [selectedRoomId]);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
  const selectedPatient = queue.find((p) => p.examinationId === selectedPatientId);

  const stats = useMemo(
    () => ({
      total: queue.length,
      waiting: queue.filter((q) => q.status === 0).length,
      inProgress: queue.filter((q) => q.status === 1).length,
      done: queue.filter((q) => q.status === 4).length,
    }),
    [queue],
  );

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '220px 1fr 420px', gap: 16, height: '100%', minHeight: 0 }}>
      {/* Room list */}
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <span className="title">Phòng khám · <b>{rooms.length}</b></span>
        </div>
        <div className="panel-body">
          {loadingRooms ? (
            <div className="ph" style={{ margin: 12 }}>Đang tải…</div>
          ) : rooms.length === 0 ? (
            <div className="ph" style={{ margin: 12 }}>Không có phòng</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {rooms.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={'subnav-item ' + (r.id === selectedRoomId ? 'active' : '')}
                  onClick={() => setSelectedRoomId(r.id)}
                  style={{ marginInline: 8, marginTop: 4 }}
                >
                  <span className="lbl" style={{ textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
                  {r.currentQueueCount ? <span className="tag">{r.currentQueueCount}</span> : null}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Queue */}
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <span className="title">
            {selectedRoom ? selectedRoom.name : 'Chọn phòng'}{' '}
            {queue.length > 0 && <span className="sub">· {queue.length} bệnh nhân</span>}
          </span>
          <div className="actions">
            <button className="btn" type="button">
              <TermIcon name="search" size={13} />
              Tìm BN
            </button>
            <button className="btn primary" type="button">
              <TermIcon name="plus" size={13} />
              Gọi số tiếp
            </button>
          </div>
        </div>
        <div className="panel-body">
          {loadingQueue ? (
            <div className="ph" style={{ margin: 12 }}>Đang tải danh sách…</div>
          ) : queue.length === 0 ? (
            <div className="ph" style={{ margin: 12 }}>Chưa có bệnh nhân trong phòng này</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 56 }}>STT</th>
                  <th>Mã BN</th>
                  <th>Họ tên</th>
                  <th>Tuổi</th>
                  <th>Chẩn đoán sơ bộ</th>
                  <th>Trạng thái</th>
                  <th>Ưu tiên</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((p) => (
                  <tr
                    key={p.examinationId}
                    className={p.examinationId === selectedPatientId ? 'sel' : ''}
                    onClick={() => setSelectedPatientId(p.examinationId)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="mono">{p.queueNumber || '—'}</td>
                    <td className="mono">{p.patientCode}</td>
                    <td>{p.patientName}</td>
                    <td className="num">{p.age || '—'}</td>
                    <td className="muted">{p.preliminaryDiagnosis || '—'}</td>
                    <td>{statusChip(p.status)}</td>
                    <td>{priorityChip(p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail + stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
        <div className="panel">
          <div className="panel-h">
            <span className="title">Tổng quan phòng</span>
            <span className="sub">{dayjs().format('DD/MM · HH:mm')}</span>
          </div>
          <div className="panel-body pad">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <StatCell label="Tổng" value={stats.total} />
              <StatCell label="Chờ" value={stats.waiting} warn />
              <StatCell label="Đang khám" value={stats.inProgress} cy />
              <StatCell label="Hoàn tất" value={stats.done} ok />
            </div>
          </div>
        </div>

        <div className="panel" style={{ flex: 1, minHeight: 0 }}>
          <div className="panel-h">
            <span className="title">Chi tiết BN</span>
            <span className="sub">{selectedPatient ? selectedPatient.patientName : 'Chọn một dòng'}</span>
          </div>
          <div className="panel-body pad">
            {!selectedPatient ? (
              <div className="ph">Chọn bệnh nhân trong danh sách để xem chi tiết</div>
            ) : (
              <div className="stack-sm">
                <Field label="Mã BN" value={<span className="mono">{selectedPatient.patientCode}</span>} />
                <Field label="Họ tên" value={selectedPatient.patientName} />
                <Field label="Tuổi / Giới" value={`${selectedPatient.age || '—'} · ${selectedPatient.gender === 1 ? 'Nam' : 'Nữ'}`} />
                {selectedPatient.insuranceNumber && (
                  <Field
                    label="BHYT"
                    value={
                      <span className="mono">
                        {selectedPatient.insuranceNumber}{' '}
                        {selectedPatient.isInsuranceValid ? (
                          <span className="chip ok" style={{ marginLeft: 6 }}>Hợp lệ</span>
                        ) : (
                          <span className="chip warn" style={{ marginLeft: 6 }}>Hết hạn</span>
                        )}
                      </span>
                    }
                  />
                )}
                <Field
                  label="Cờ"
                  value={
                    <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                      {selectedPatient.isEmergency && <span className="chip crit">Cấp cứu</span>}
                      {selectedPatient.isPriority && <span className="chip warn">Ưu tiên</span>}
                      {selectedPatient.isChronic && <span className="chip info">Mạn tính</span>}
                      {selectedPatient.hasDebt && <span className="chip warn">Còn nợ</span>}
                      {selectedPatient.hasPendingLabs && <span className="chip mag">Chờ CLS</span>}
                      {!selectedPatient.isEmergency && !selectedPatient.isPriority && !selectedPatient.isChronic && !selectedPatient.hasDebt && !selectedPatient.hasPendingLabs && (
                        <span className="muted">Không</span>
                      )}
                    </div>
                  }
                />
                <Field label="Chẩn đoán sơ bộ" value={selectedPatient.preliminaryDiagnosis || '—'} />
                <Field label="CLS" value={`${selectedPatient.completedLabOrders}/${selectedPatient.totalLabOrders} hoàn tất`} />
                <div className="row" style={{ marginTop: 12, gap: 8 }}>
                  <button className="btn primary" type="button">
                    <TermIcon name="stethoscope" size={13} />
                    Bắt đầu khám
                  </button>
                  <button className="btn" type="button">Mở hồ sơ</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCell: React.FC<{ label: string; value: number; warn?: boolean; cy?: boolean; ok?: boolean }> = ({ label, value, warn, cy, ok }) => (
  <div style={{ padding: '10px 12px', background: 'var(--d-1)', borderRadius: 8 }}>
    <div className="mono up" style={{ fontSize: 10, color: 'var(--t-3)', letterSpacing: '0.1em' }}>{label}</div>
    <div
      style={{
        fontSize: 26, fontWeight: 600, marginTop: 4,
        color: warn ? 'var(--s-warn)' : cy ? 'var(--a-cy)' : ok ? 'var(--s-ok)' : 'var(--t-0)',
      }}
    >
      {value}
    </div>
  </div>
);

const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <div className="label">{label}</div>
    <div style={{ fontSize: 13, color: 'var(--t-0)' }}>{value}</div>
  </div>
);

export default OPDV2;
