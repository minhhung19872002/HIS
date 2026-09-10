/**
 * Màn hình gọi số — trang ĐIỀU KHIỂN, không phải bảng chiếu.
 *
 * Bảng chiếu (`/v2/queue-display`) vốn đã dựng đủ, nhưng nó là trang CÔNG KHAI (không đăng nhập,
 * để cắm thẳng lên TV phòng chờ) nên không tự bày ra danh sách phòng được — máy chủ không có
 * endpoint liệt kê phòng cho khách vãng lai. Hệ quả: muốn chiếu phải tự gõ `?rooms=<guid>,<guid>`
 * vào URL, mà GUID thì không ai thuộc. Không gõ thì bảng chiếu chỉ hiện "Chưa cấu hình phòng khám".
 *
 * Trang này lấp đúng khoảng đó: nhân viên đăng nhập, tích phòng, bấm mở — địa chỉ cho TV được dựng
 * sẵn. Lựa chọn giữ trong máy để lần sau mở là có luôn.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as receptionApi from '../api/reception';
import type { RoomOverviewDto, QueueDisplayDto } from '../api/reception';
import {
  KpiStrip, SearchBox, Filter, DataTable, StatusBadge, Btn, Ico,
  tk, tw, type KpiItem, type ColumnDef,
} from '@/_v2kit';
import { RefreshButton } from '../../../components/actions';
import { friendlyErrorMessage } from '../../../utils/friendlyError';

/**
 * Loại hàng đợi — chép NGUYÊN từ `QueueTicketDto.QueueTypeName`
 * (`backend/src/HIS.Application/DTOs/Reception/ReceptionCompleteDTOs.Part1.cs`).
 *
 * Đặt tên khác backend là tự tạo ra hai ngôn ngữ cho cùng một con số: nhân viên chọn "Thu ngân" ở
 * đây rồi mở bảng chiếu ra thấy đề "Lĩnh thuốc" thì không ai biết tin cái nào.
 */
const QUEUE_TYPES = [
  { v: '2', l: 'Khám bệnh' },
  { v: '1', l: 'Tiếp đón' },
  { v: '3', l: 'Cận lâm sàng' },
  { v: '4', l: 'Thanh toán' },
  { v: '5', l: 'Lĩnh thuốc' },
];

/** Nhớ lựa chọn theo máy: cái TV phòng chờ mở lại là có sẵn, khỏi chọn từ đầu mỗi sáng. */
const STORE_KEY = 'his.queueBoard.rooms';
const STORE_TYPE_KEY = 'his.queueBoard.queueType';

const readStored = (key: string): string[] => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};

const QueueBoard: React.FC = () => {
  const [rooms, setRooms] = useState<RoomOverviewDto[]>([]);
  const [live, setLive] = useState<Record<string, QueueDisplayDto>>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('');
  const [queueType, setQueueType] = useState(() => localStorage.getItem(STORE_TYPE_KEY) || '2');
  const [selected, setSelected] = useState<Set<string>>(() => new Set(readStored(STORE_KEY)));
  const [page, setPage] = useState(0);
  const PER = 15;

  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      const r = await receptionApi.getRoomOverview();
      setRooms(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      tw(friendlyErrorMessage(e, 'Không tải được danh sách phòng khám.'));
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadRooms(); }, [loadRooms]);

  // Số liệu sống của riêng những phòng ĐANG CHỌN. Không nạp cho cả trăm phòng: trang này để chọn
  // phòng và gọi số, không phải để theo dõi cả bệnh viện.
  const selectedKey = useMemo(() => [...selected].sort().join(','), [selected]);

  const pullLive = useCallback(async () => {
    const ids = selectedKey ? selectedKey.split(',') : [];
    if (ids.length === 0) { setLive({}); return; }
    const results = await Promise.allSettled(
      ids.map((id) => receptionApi.getQueueDisplay(id, Number(queueType))),
    );
    const next: Record<string, QueueDisplayDto> = {};
    results.forEach((res, i) => {
      if (res.status === 'fulfilled' && res.value.data) next[ids[i]] = res.value.data;
    });
    setLive(next);
  }, [selectedKey, queueType]);

  useEffect(() => {
    void pullLive();
    const t = window.setInterval(() => void pullLive(), 10_000);
    return () => window.clearInterval(t);
  }, [pullLive]);

  /**
   * Chạy một thao tác gọi số rồi nạp lại ngay.
   *
   * `acting` khoá theo từng vé để chặn bấm hai lần — gọi trùng một vé thì bảng chiếu nhấp nháy hai
   * lần và loa đọc tên hai lượt, người bệnh không biết có phải gọi mình không.
   */
  const [acting, setActing] = useState<string | null>(null);
  const runAction = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    if (acting) return;
    setActing(key);
    try {
      await fn();
      tk(ok);
      await pullLive();
    } catch (e) {
      tw(friendlyErrorMessage(e, 'Thao tác không thành công.'));
    } finally {
      setActing(null);
    }
  };

  const callNext = (room: QueueDisplayDto) => runAction(
    `next:${room.roomId}`,
    async () => {
      const res = await receptionApi.callNextQueue(room.roomId, Number(queueType));
      // Máy chủ trả rỗng khi hàng đợi hết người — nói thẳng thay vì báo "đã gọi" cho một vé không
      // tồn tại.
      if (!res.data) throw new Error('Không còn người bệnh nào đang chờ ở phòng này.');
    },
    `Đã gọi số tiếp theo · ${room.roomName}`,
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify([...selected]));
      localStorage.setItem(STORE_TYPE_KEY, queueType);
    } catch { /* chế độ riêng tư chặn lưu — không đáng để chặn cả trang */ }
  }, [selected, queueType]);

  const deptOpts = useMemo(() => {
    const seen = new Map<string, string>();
    rooms.forEach((r) => { if (r.departmentId) seen.set(r.departmentId, r.departmentName); });
    return [...seen].map(([v, l]) => ({ v, l }));
  }, [rooms]);

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return rooms.filter((r) => {
      if (dept && r.departmentId !== dept) return false;
      if (!kw) return true;
      return `${r.roomCode} ${r.roomName} ${r.departmentName}`.toLowerCase().includes(kw);
    });
  }, [rooms, search, dept]);

  const boardUrl = useMemo(() => {
    const ids = [...selected];
    if (ids.length === 0) return '';
    return `${window.location.origin}/v2/queue-display`
      + `?rooms=${ids.join(',')}&queueType=${queueType}`;
  }, [selected, queueType]);

  const openBoard = () => {
    if (!boardUrl) { tw('Chọn ít nhất một phòng trước khi mở màn hình chiếu.'); return; }
    window.open(boardUrl, '_blank', 'noopener');
  };

  const copyUrl = async () => {
    if (!boardUrl) { tw('Chọn ít nhất một phòng đã.'); return; }
    try {
      await navigator.clipboard.writeText(boardUrl);
      tk('Đã chép liên kết — dán vào trình duyệt của TV phòng chờ.');
    } catch {
      // Trình duyệt chặn clipboard (thường do không phải HTTPS): hiện ra để chép tay còn hơn im.
      window.prompt('Chép liên kết này rồi dán vào TV phòng chờ:', boardUrl);
    }
  };

  const toggle = (id: string) => {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const kpis: KpiItem[] = useMemo(() => {
    const rows = Object.values(live);
    const calling = rows.filter((r) => r.currentServing || r.callingList.length > 0).length;
    const waiting = rows.reduce((s, r) => s + r.totalWaiting, 0);
    const avg = rows.length
      ? Math.round(rows.reduce((s, r) => s + r.averageWaitMinutes, 0) / rows.length)
      : 0;
    return [
      { lbl: 'Phòng đã chọn', val: selected.size, sub: `/ ${rooms.length} phòng` },
      { lbl: 'Đang gọi', val: calling, sub: 'phòng', tone: 'info' },
      { lbl: 'Đang chờ', val: waiting, sub: 'lượt', tone: waiting > 0 ? 'warn' : undefined },
      { lbl: 'Chờ trung bình', val: `${avg}p`, sub: 'phút' },
    ];
  }, [live, selected.size, rooms.length]);

  const columns: ColumnDef<RoomOverviewDto>[] = [
    {
      key: 'room', label: 'Phòng khám',
      render: (r) => (
        <div className="cell-2l"><b>{r.roomName}</b><i className="mono">{r.roomCode}</i></div>
      ),
    },
    { key: 'dept', label: 'Khoa', render: (r) => r.departmentName || '—' },
    { key: 'doctor', label: 'Bác sĩ trực', render: (r) => r.currentDoctorName || '—' },
    {
      key: 'calling', label: 'Đang gọi', width: 110, mono: true,
      render: (r) => {
        const d = live[r.roomId];
        if (!selected.has(r.roomId)) return <span style={{ color: 'var(--t-3)' }}>—</span>;
        const t = d?.currentServing || d?.callingList[0];
        return t
          ? <StatusBadge tone="info" dot>{t.ticketCode}</StatusBadge>
          : <span style={{ color: 'var(--t-2)' }}>chưa gọi</span>;
      },
      sortValue: (r) => live[r.roomId]?.currentServing?.ticketCode ?? '',
    },
    {
      key: 'waiting', label: 'Đang chờ', width: 90, mono: true,
      render: (r) => (selected.has(r.roomId) ? (live[r.roomId]?.totalWaiting ?? 0) : r.waitingCount),
      sortValue: (r) => (selected.has(r.roomId) ? (live[r.roomId]?.totalWaiting ?? 0) : r.waitingCount),
    },
  ];

  return (
    <div className="ab-page">
      <KpiStrip items={kpis} />

      <div className="ab-toolbar">
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm phòng, mã phòng, khoa…" />
        <Filter value={dept} onChange={(v) => { setDept(v); setPage(0); }} options={deptOpts}
          placeholder="▾ Tất cả khoa" />
        <Filter value={queueType} onChange={setQueueType} options={QUEUE_TYPES}
          placeholder="▾ Loại hàng đợi" />
        <Btn variant="ghost" icon="x" onClick={() => { setSearch(''); setDept(''); setPage(0); }}>
          Bỏ lọc
        </Btn>
        <span className="spacer" />
        <RefreshButton onRefresh={loadRooms} loading={loading} />
      </div>

      <div className="ab-toolbar" style={{ borderTop: 'none' }}>
        <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>
          {selected.size === 0
            ? 'Tích chọn phòng muốn chiếu lên TV phòng chờ'
            : `Đã chọn ${selected.size} phòng`}
        </span>
        <Btn variant="ghost" onClick={() => setSelected(new Set(filtered.map((r) => r.roomId)))}>
          Chọn hết ({filtered.length})
        </Btn>
        <Btn variant="ghost" onClick={() => setSelected(new Set())} disabled={selected.size === 0}>
          Bỏ chọn
        </Btn>
        <span className="spacer" />
        <Btn variant="ghost" icon="file" onClick={() => void copyUrl()} disabled={selected.size === 0}>
          Chép liên kết
        </Btn>
        <Btn variant="primary" onClick={openBoard} disabled={selected.size === 0}>
          <Ico name="external" size={12} /> Mở màn hình chiếu
        </Btn>
      </div>

      {boardUrl && (
        <div style={{
          margin: '0 14px 10px', padding: '8px 12px', borderRadius: 'var(--r-2)',
          border: '1px solid var(--line)', background: 'var(--d-1)',
          fontSize: 'var(--fs-xs)', color: 'var(--t-2)',
          fontFamily: 'var(--font-mono)', overflowWrap: 'anywhere',
        }}>
          {boardUrl}
        </div>
      )}

      {selected.size > 0 && (
        <div className="ab-stack" style={{ padding: '0 14px 14px', display: 'grid', gap: 'var(--space-12)' }}>
          {[...selected].map((id) => {
            const room = live[id];
            if (!room) return null;
            const now = room.currentServing || room.callingList[0];
            return (
              <div key={id} style={{
                border: '1px solid var(--line)', borderRadius: 'var(--r-3)',
                background: 'var(--d-0)', overflow: 'hidden',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-10)',
                  padding: '8px 12px', background: 'var(--d-1)', borderBottom: '1px solid var(--line)',
                }}>
                  <b>{room.roomName}</b>
                  {room.doctorName && <span className="chip info">BS. {room.doctorName}</span>}
                  <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
                    {now ? <>Đang gọi <b className="mono">{now.ticketCode}</b></> : 'Chưa gọi số nào'}
                    {' · '}{room.totalWaiting} đang chờ
                  </span>
                  <span className="spacer" />
                  {now && (
                    <Btn variant="ghost" disabled={acting !== null}
                      onClick={() => void runAction(`recall:${now.id}`,
                        () => receptionApi.recallQueue(now.id), `Đã gọi lại ${now.ticketCode}`)}>
                      Gọi lại
                    </Btn>
                  )}
                  <Btn variant="primary" disabled={acting !== null}
                    onClick={() => void callNext(room)}>
                    Gọi số tiếp
                  </Btn>
                </div>

                {room.waitingList.length === 0 ? (
                  <div style={{ padding: 'var(--space-14)', color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>
                    Không còn ai đang chờ.
                  </div>
                ) : (
                  <table className="ab-tbl">
                    <thead>
                      <tr>
                        <th style={{ width: 90 }}>Số</th>
                        <th>Bệnh nhân</th>
                        <th style={{ width: 180 }}>Ưu tiên</th>
                        <th style={{ width: 210 }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {room.waitingList.map((t) => (
                        <tr key={t.id}>
                          <td className="mono"><b>{t.ticketCode}</b></td>
                          <td>{t.patientName || <i style={{ color: 'var(--t-3)' }}>(không rõ BN)</i>}</td>
                          <td>
                            {t.priority > 0 ? (
                              <>
                                <StatusBadge tone={t.priority === 2 ? 'crit' : 'warn'} dot>
                                  {t.priorityName}
                                </StatusBadge>
                                {t.priorityReasonName && (
                                  <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginLeft: 6 }}>
                                    {t.priorityReasonName}
                                  </span>
                                )}
                                {/* Người bệnh tự khai qua app mà HIS không đối chiếu được — lễ tân
                                    phải hỏi giấy tờ lúc gọi, nếu không thì người ưu tiên THẬT chịu
                                    thiệt. Backend cấp cờ này sẵn, trước nay không màn nào hiện. */}
                                {t.priorityVerified === false && (
                                  <span className="chip warn" style={{ marginLeft: 6 }}>chưa xác minh</span>
                                )}
                              </>
                            ) : <span style={{ color: 'var(--t-3)' }}>Thường</span>}
                          </td>
                          <td>
                            <div className="ab-actions">
                              <Btn variant="ghost" disabled={acting !== null}
                                onClick={() => void runAction(`call:${t.id}`,
                                  () => receptionApi.callSpecificQueue(t.id), `Đã gọi ${t.ticketCode}`)}>
                                Gọi
                              </Btn>
                              <Btn variant="ghost" disabled={acting !== null}
                                onClick={() => void runAction(`serve:${t.id}`,
                                  () => receptionApi.startServing(t.id), `${t.ticketCode} đã vào khám`)}>
                                Vào khám
                              </Btn>
                              <Btn variant="ghost" disabled={acting !== null}
                                onClick={() => void runAction(`skip:${t.id}`,
                                  () => receptionApi.skipQueue(t.id, 'Bệnh nhân không đến'),
                                  `Đã đánh dấu vắng mặt ${t.ticketCode}`)}>
                                Vắng
                              </Btn>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}

      <DataTable<RoomOverviewDto>
        columns={columns}
        data={filtered}
        page={page}
        perPage={PER}
        onSortChange={() => setPage(0)}
        rowKey={(r) => r.roomId}
        selected={selected}
        onToggle={toggle}
        onToggleAll={(visible) => {
          const allOn = visible.length > 0 && visible.every((r) => selected.has(r.roomId));
          setSelected((cur) => {
            const next = new Set(cur);
            visible.forEach((r) => (allOn ? next.delete(r.roomId) : next.add(r.roomId)));
            return next;
          });
        }}
        loading={loading}
        empty="Không có phòng khám nào"
      />
    </div>
  );
};

export default QueueBoard;
