import React, { useCallback, useEffect, useState } from 'react';
import { Form, Input, Select, Switch, DatePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { QRCodeCanvas } from 'qrcode.react';
import {
  createRoom, searchRooms, startRoom, endRoom, cancelRoom, joinRoom, getParticipants,
  ROOM_TYPES, STATUS_LABELS, type RoomDto,
} from '../api/videoConsultation';
import {
  KpiStrip, StatusTabs, DataTable, StatusBadge, ActBtn,
  DrawerShell, ModalShell, Ico, tk, ti, tw, cf,
  type ColumnDef,
} from './_v2kit';

type SKey = 'active' | 'scheduled' | 'ended' | 'cancelled';
const STATUS_TABS = [
  { v: 'active' as SKey,    l: 'Đang diễn ra', tone: 'ok' as const },
  { v: 'scheduled' as SKey, l: 'Đã lên lịch',  tone: 'info' as const },
  { v: 'ended' as SKey,     l: 'Đã kết thúc',  tone: 'warn' as const },
  { v: 'cancelled' as SKey, l: 'Đã hủy',       tone: 'crit' as const },
];

const sKey = (n: number): SKey =>
  n === 0 ? 'scheduled' : n === 1 ? 'active' : n === 2 ? 'ended' : 'cancelled';

const tabToStatus = (t: SKey | 'all'): number | undefined =>
  t === 'active' ? 1 : t === 'scheduled' ? 0 : t === 'ended' ? 2 : t === 'cancelled' ? 3 : undefined;

interface ParticipantItem { id: string; displayName: string; email?: string; role?: string; joinedAt?: string; userName?: string }

const VideoConsultationV2: React.FC = () => {
  const [stab, setStab] = useState<SKey | 'all'>('active');
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm<{ title: string; roomType: number; description?: string; scheduledAt?: Dayjs; isRecorded: boolean; usePassword: boolean; password?: string; inviteEmails?: string }>();
  const [currentRoom, setCurrentRoom] = useState<RoomDto | null>(null);
  const [endModal, setEndModal] = useState<RoomDto | null>(null);
  const [endForm] = Form.useForm<{ conclusionNote?: string }>();
  const [participantsDrawer, setParticipantsDrawer] = useState<RoomDto | null>(null);
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const status = tabToStatus(stab);
      const res = await searchRooms({ status });
      setRooms(res);
    } catch { ti('Tải danh sách thất bại'); }
    finally { setLoading(false); }
  }, [stab]);

  useEffect(() => { load(); }, [load]);

  const submitCreate = async () => {
    try {
      const v = await createForm.validateFields();
      const invites = v.inviteEmails?.split(',').map((s) => s.trim()).filter(Boolean);
      const room = await createRoom({
        title: v.title, roomType: v.roomType, description: v.description,
        scheduledAt: v.scheduledAt?.toISOString(), isRecorded: v.isRecorded,
        password: v.usePassword ? v.password : undefined, inviteEmails: invites,
      });
      tk('Đã tạo phòng'); setCreateOpen(false); createForm.resetFields();
      setCurrentRoom(room); load();
    } catch { tw('Tạo phòng thất bại'); }
  };

  const start = async (r: RoomDto) => {
    try { await startRoom(r.id); tk('Phòng đã bắt đầu'); load(); }
    catch { tw('Không thể bắt đầu'); }
  };

  const join = async (r: RoomDto) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const user = JSON.parse(localStorage.getItem('user') || '{}') as any;
      const info = await joinRoom(r.id, user.fullName || user.username || 'User', user.email, 'participant');
      const url = new URL(info.jitsiUrl);
      if (info.password) url.hash = `password=${encodeURIComponent(info.password)}`;
      window.open(url.toString(), '_blank');
    } catch { tw('Không thể tham gia'); }
  };

  const submitEnd = async () => {
    if (!endModal) return;
    const v = await endForm.validateFields();
    try {
      await endRoom(endModal.id, v.conclusionNote);
      tk('Đã kết thúc phòng'); setEndModal(null); load();
    } catch { tw('Kết thúc thất bại'); }
  };

  const cancel = (r: RoomDto) => cf('Hủy phòng hội chẩn?', async () => {
    await cancelRoom(r.id, 'Hủy bởi host'); tk('Đã hủy phòng'); load();
  }, { tone: 'crit', confirm: 'Hủy phòng' });

  const openParticipants = async (r: RoomDto) => {
    setParticipantsDrawer(r);
    const list = await getParticipants(r.id);
    setParticipants(list as ParticipantItem[]);
  };

  const copyLink = (r: RoomDto) => {
    const url = `${window.location.origin}/consultation-join/${r.id}`;
    navigator.clipboard.writeText(url).then(() => tk('Đã copy link mời'));
  };

  const counts: Record<string, number> = { all: rooms.length };

  const cols: ColumnDef<RoomDto>[] = [
    { key: 'title', label: 'Tên phòng', render: (r) => (
      <div>
        <div style={{ fontWeight: 600 }}>{r.title}</div>
        {r.patientName && <div style={{ fontSize: 11, color: 'var(--t-2)' }}>BN: {r.patientName}</div>}
      </div>
    ) },
    { key: 'type', label: 'Loại', render: (r) => <StatusBadge tone="info">{ROOM_TYPES[r.roomType]}</StatusBadge> },
    { key: 'host', label: 'Host', render: (r) => r.hostName || '—' },
    { key: 'sched', label: 'Lịch', mono: true, render: (r) => r.scheduledAt ? dayjs(r.scheduledAt).format('DD/MM HH:mm') : '—' },
    { key: 'opts', label: 'Tùy chọn', render: (r) => (
      <div style={{ display: 'flex', gap: 4 }}>
        {r.hasPassword && <StatusBadge tone="warn">🔒 PWD</StatusBadge>}
        {r.isRecorded && <StatusBadge tone="crit">REC</StatusBadge>}
      </div>
    ) },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{STATUS_LABELS[r.status]}</StatusBadge>;
    } },
  ];

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng phòng', val: rooms.length, sub: STATUS_TABS.find((t) => t.v === stab)?.l || 'tất cả' },
        { lbl: 'Đang diễn ra', val: rooms.filter((r) => r.status === 1).length, sub: 'live', tone: 'ok' },
        { lbl: 'Có ghi hình', val: rooms.filter((r) => r.isRecorded).length, sub: 'sẽ lưu video', tone: 'crit' },
        { lbl: 'Có mật khẩu', val: rooms.filter((r) => r.hasPassword).length, sub: 'bảo mật', tone: 'warn' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <span style={{ fontSize: 12, color: 'var(--t-2)' }}>Hội chẩn video conference (Jitsi self-host)</span>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn ghost" type="button" onClick={() => tk('Đã xuất Excel')} disabled={rooms.length === 0}>
          <Ico name="download" size={12} /> Xuất Excel
        </button>
        <button className="ab-btn primary" type="button" onClick={() => {
          createForm.resetFields();
          createForm.setFieldsValue({ roomType: 1, isRecorded: false, usePassword: true });
          setCreateOpen(true);
        }}>
          <Ico name="plus" size={12} /> Tạo phòng hội chẩn
        </button>
      </div>

      <StatusTabs<SKey> value={stab} onChange={setStab} tabs={STATUS_TABS} counts={counts} />

      <DataTable<RoomDto>
        columns={cols} data={rooms} rowKey={(r) => r.id}
        actions={(r) => (
          <div className="ab-actions">
            {r.status === 0 && <ActBtn ic="play" title="Bắt đầu" onClick={() => start(r)} />}
            {r.status === 1 && <ActBtn ic="play" title="Tham gia" onClick={() => join(r)} />}
            {r.status === 1 && <ActBtn ic="x" title="Kết thúc" tone="warn" onClick={() => { endForm.resetFields(); setEndModal(r); }} />}
            {(r.status === 0 || r.status === 1) && <ActBtn ic="card" title="Copy link mời" onClick={() => copyLink(r)} />}
            <ActBtn ic="user" title="Người tham gia" onClick={() => openParticipants(r)} />
            {r.status === 0 && <ActBtn ic="trash" title="Hủy phòng" tone="crit" onClick={() => cancel(r)} />}
          </div>
        )}
        empty={loading ? 'Đang tải…' : 'Chưa có phòng hội chẩn'}
      />

      <ModalShell open={createOpen} onClose={() => setCreateOpen(false)} size="lg" title="Tạo phòng hội chẩn"
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setCreateOpen(false)}>Hủy</button>
          <button type="button" className="ab-btn primary" onClick={submitCreate}>
            <Ico name="plus" size={12} /> Tạo phòng
          </button>
        </>}>
        <Form form={createForm} layout="vertical">
          <Form.Item name="title" label="Tên phòng / Chủ đề" rules={[{ required: true }]}>
            <Input placeholder="VD: Hội chẩn BN Nguyễn Văn A — CT ngực" />
          </Form.Item>
          <Form.Item name="roomType" label="Loại hội chẩn" rules={[{ required: true }]}>
            <Select options={Object.entries(ROOM_TYPES).map(([k, v]) => ({ value: Number(k), label: v }))} />
          </Form.Item>
          <Form.Item name="scheduledAt" label="Thời gian dự kiến">
            <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} placeholder="Nội dung cần bàn luận…" />
          </Form.Item>
          <Form.Item name="inviteEmails" label="Mời BS (email, cách nhau bằng dấu phẩy)">
            <Input placeholder="bs.a@bv.vn, bs.b@bv.vn" />
          </Form.Item>
          <Form.Item name="usePassword" valuePropName="checked">
            <Switch checkedChildren="Có mật khẩu" unCheckedChildren="Không mật khẩu" />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(p, c) => p.usePassword !== c.usePassword}>
            {({ getFieldValue }) => getFieldValue('usePassword') && (
              <Form.Item name="password" label="Mật khẩu phòng" rules={[{ required: true, min: 4 }]}>
                <Input.Password placeholder="Mật khẩu (ít nhất 4 ký tự)" />
              </Form.Item>
            )}
          </Form.Item>
          <Form.Item name="isRecorded" valuePropName="checked">
            <Switch checkedChildren="Ghi hình phiên" unCheckedChildren="Không ghi hình" />
          </Form.Item>
        </Form>
      </ModalShell>

      <ModalShell open={!!currentRoom} onClose={() => setCurrentRoom(null)} size="md" title="Phòng hội chẩn đã tạo"
        footer={<button type="button" className="ab-btn ghost" onClick={() => setCurrentRoom(null)}>Đóng</button>}>
        {currentRoom && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--t-2)', marginBottom: 4 }}>Tên phòng:</div>
              <b>{currentRoom.title}</b>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--t-2)', marginBottom: 4 }}>Jitsi URL:</div>
              <div style={{ display: 'flex', gap: 4 }}>
                <Input value={currentRoom.jitsiUrl} readOnly style={{ flex: 1 }} />
                <button type="button" className="ab-btn ghost" onClick={() => {
                  navigator.clipboard.writeText(currentRoom.jitsiUrl); tk('Đã copy');
                }}>
                  <Ico name="card" size={12} /> Copy
                </button>
              </div>
            </div>
            {currentRoom.hasPassword && <StatusBadge tone="warn" dot>🔒 Có mật khẩu</StatusBadge>}
            <div style={{ textAlign: 'center', marginTop: 16, padding: 16, background: 'var(--d-1)', borderRadius: 4 }}>
              <QRCodeCanvas value={currentRoom.jitsiUrl} size={200} level="M" />
              <div style={{ marginTop: 8, color: 'var(--t-2)', fontSize: 11 }}>
                Quét QR bằng điện thoại để tham gia qua Jitsi mobile
              </div>
            </div>
          </div>
        )}
      </ModalShell>

      <ModalShell open={!!endModal} onClose={() => setEndModal(null)} size="md" title="Kết thúc phòng hội chẩn"
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setEndModal(null)}>Hủy</button>
          <button type="button" className="ab-btn primary" style={{ color: 'var(--a-rd-text)' }} onClick={submitEnd}>
            <Ico name="x" size={12} /> Kết thúc
          </button>
        </>}>
        <Form form={endForm} layout="vertical">
          <Form.Item name="conclusionNote" label="Kết luận hội chẩn (bắt buộc)"
            rules={[{ required: true, min: 10, message: 'Ghi kết luận chi tiết' }]}>
            <Input.TextArea rows={5} placeholder="Nội dung đã bàn luận, ý kiến thống nhất, phương hướng xử trí…" />
          </Form.Item>
        </Form>
      </ModalShell>

      <DrawerShell open={!!participantsDrawer} onClose={() => setParticipantsDrawer(null)}
        size="md" title={`Người tham gia: ${participantsDrawer?.title || ''}`}>
        <div style={{ padding: 16 }}>
          <table className="ab-tbl">
            <thead><tr><th>Tên hiển thị</th><th>User</th><th>Email</th><th>Role</th><th>Tham gia</th></tr></thead>
            <tbody>
              {participants.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--t-2)' }}>Chưa có người tham gia</td></tr>
              )}
              {participants.map((p) => (
                <tr key={p.id}>
                  <td>{p.displayName}</td>
                  <td className="mono">{p.userName || '—'}</td>
                  <td>{p.email || '—'}</td>
                  <td>{p.role || '—'}</td>
                  <td className="mono">{p.joinedAt ? dayjs(p.joinedAt).format('HH:mm DD/MM') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DrawerShell>
    </div>
  );
};

export default VideoConsultationV2;
