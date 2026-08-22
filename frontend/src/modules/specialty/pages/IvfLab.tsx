import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import {
  message, Select, Input, DatePicker, InputNumber, Form, Tag, Progress, Tooltip, Row, Col,
} from 'antd';
import {
  getCouples, getIvfDashboard, saveCouple, getCycles, getEmbryos,
  saveCycle, saveEmbryo, freezeEmbryo, thawEmbryo,
  getSpermSamples, saveSpermSample, getExpiringStorage, getDailyReport,
} from '../api/ivfLab';
import type {
  IvfCouple, IvfDashboard, IvfEmbryo, IvfCycle, IvfSpermSample, IvfDailyReport,
} from '../api/ivfLab';
import { patientApi } from '../../patient/api/patient';
import { friendlyErrorMessage } from '../../../utils/friendlyError';
import {
  KpiStrip, TopTabs, SearchBox, DataTable, Pager, ActBtn, Btn, ModalShell,
  DrawerShell, DrSec, DrField, tk, ti, te, tw, Ico,
  type ColumnDef, type TopTab,
} from '@/_v2kit';
import { RefreshButton } from '../../../components/actions';

const PER = 18;

// ── Status maps — VERBATIM từ v1 (không đổi mapping) ────────────────────────
const cycleStatusColor: Record<number, string> = {
  1: 'processing', 2: 'warning', 3: 'orange', 4: 'purple', 5: 'cyan', 6: 'success', 7: 'error',
};
const embryoStatusColor: Record<number, string> = {
  1: 'processing', 2: 'green', 3: 'cyan', 4: 'orange', 5: 'success', 6: 'error',
};
const spermStatusColor: Record<number, string> = { 1: 'cyan', 2: 'default', 3: 'error' };

type TabKey = 'couples' | 'cycles' | 'embryos' | 'cryo' | 'sperm' | 'dashboard';

const TABS: TopTab<TabKey>[] = [
  { v: 'couples', l: 'Cặp vợ chồng', ic: 'users' },
  { v: 'cycles', l: 'Chu kỳ IVF', ic: 'activity' },
  { v: 'embryos', l: 'Phôi', ic: 'flask' },
  { v: 'cryo', l: 'Trữ đông', ic: 'archive' },
  { v: 'sperm', l: 'NH tinh trùng', ic: 'layers' },
  { v: 'dashboard', l: 'Dashboard', ic: 'chart' },
];

const IvfLabV2: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('couples');
  const [items, setItems] = useState<IvfCouple[]>([]);
  const [dash, setDash] = useState<IvfDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<IvfCouple | null>(null);
  const [coupleModal, setCoupleModal] = useState<{ couple: IvfCouple | null } | null>(null);

  // ── Quản lý phôi đông ─────────────────────────────────────────────────────
  const [embryoTarget, setEmbryoTarget] = useState<IvfCouple | null>(null);
  const [embryos, setEmbryos] = useState<IvfEmbryo[]>([]);
  const [embryoLoading, setEmbryoLoading] = useState(false);

  const openEmbryos = async (couple: IvfCouple) => {
    setEmbryoTarget(couple);
    setEmbryos([]);
    setEmbryoLoading(true);
    try {
      const cycles = await getCycles(couple.id);
      if (cycles.length === 0) { setEmbryoLoading(false); return; }
      const allEmbryos = await Promise.all(cycles.map((c) => getEmbryos(c.id)));
      // Chỉ hiển thị phôi đông (có freezeDate)
      const frozen = allEmbryos.flat().filter((e) => e.freezeDate);
      setEmbryos(frozen);
    } catch { message.warning('Không tải được danh sách phôi đông'); }
    finally { setEmbryoLoading(false); }
  };

  const load = async () => {
    setLoading(true);
    try {
      const [list, d] = await Promise.all([
        getCouples({ keyword: search, pageSize: 200 }),
        getIvfDashboard(),
      ]);
      setItems(list);
      setDash(d);
    } catch { ti('Không tải được dữ liệu IVF'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    if (!k) return items;
    return items.filter((r) =>
      [r.wifeName, r.husbandName, r.wifeCode, r.husbandCode]
        .some((v) => (v || '').toLowerCase().includes(k))
    );
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const calcAge = (dob?: string) => dob ? dayjs().diff(dayjs(dob), 'year') : null;

  const cols: ColumnDef<IvfCouple>[] = [
    { key: 'wife', label: 'Vợ', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.wifeName || '—'}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>
          {r.wifeCode || '—'}{calcAge(r.wifeDob) !== null && ` · ${calcAge(r.wifeDob)}t`}
        </div>
      </div>
    ) },
    { key: 'hus', label: 'Chồng', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.husbandName || '—'}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>
          {r.husbandCode || '—'}{calcAge(r.husbandDob) !== null && ` · ${calcAge(r.husbandDob)}t`}
        </div>
      </div>
    ) },
    { key: 'mar', label: 'Kết hôn', mono: true, render: (r) => r.marriageDate
      ? dayjs(r.marriageDate).format('DD/MM/YYYY')
      : '—'
    },
    { key: 'dur', label: 'Vô sinh', mono: true, render: (r) => {
      const m = r.infertilityDurationMonths || 0;
      return m >= 12 ? `${(m / 12).toFixed(1)} năm` : `${m} tháng`;
    } },
    { key: 'cause', label: 'Nguyên nhân', render: (r) => r.infertilityCause || '—' },
    { key: 'cyc', label: 'Chu kỳ', mono: true, render: (r) => (
      <span style={{ fontWeight: 600, color: r.cycleCount > 0 ? 'var(--a-em-text)' : 'var(--t-2)' }}>
        {r.cycleCount}
      </span>
    ) },
  ];

  const actions = (r: IvfCouple) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="edit" title="Sửa" onClick={() => setCoupleModal({ couple: r })} />
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Cặp đôi', val: dash?.totalCouples ?? items.length, sub: 'tổng số', tone: 'info' },
        { lbl: 'Chu kỳ đang HĐ', val: dash?.activeCycles ?? 0, sub: 'IVF/IUI', tone: 'warn' },
        { lbl: 'Phôi đông', val: dash?.frozenEmbryos ?? 0, sub: 'tủ đông', tone: 'ok' },
        { lbl: 'Tỷ lệ TC', val: `${(dash?.successRate ?? 0).toFixed(1)}`, unit: '%', sub: 'thai LS', tone: 'ok' },
      ]} />

      <TopTabs tab={tab} setTab={setTab} tabs={TABS} />

      {tab === 'couples' && <>
        <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
            placeholder="Tìm vợ/chồng / mã BN…" />
          <Btn variant="ghost" onClick={() => setSearch('')}>
            <Ico name="x" size={12} /> Bỏ lọc
          </Btn>
          <span className="spacer" />
          <RefreshButton onRefresh={async () => { await load() }} />
          <Btn variant="ghost" onClick={() => {
            if (sel) { openEmbryos(sel); setSel(null); }
            else message.info('Chọn cặp đôi từ danh sách để xem phôi đông');
          }}>
            <Ico name="archive" size={12} /> Phôi đông
          </Btn>
          <Btn variant="primary" onClick={() => setCoupleModal({ couple: null })}>
            <Ico name="plus" size={12} /> Đăng ký
          </Btn>
        </div>

        <DataTable<IvfCouple>
          columns={cols} data={paged} rowKey={(r) => r.id}
          onRowClick={setSel} actions={actions}
          empty={loading ? 'Đang tải…' : 'Chưa có cặp đôi đăng ký IVF'}
        />
        <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />
      </>}

      {tab === 'cycles' && <CyclesTab />}
      {tab === 'embryos' && <EmbryosTab />}
      {tab === 'cryo' && <CryoTab />}
      {tab === 'sperm' && <SpermBankTab />}
      {tab === 'dashboard' && <DashboardTab />}

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? `${sel.wifeName || '?'} & ${sel.husbandName || '?'}` : ''}
        sub={sel ? `${sel.cycleCount} chu kỳ điều trị` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn onClick={() => { if (sel) { openEmbryos(sel); setSel(null); } }}>
            <Ico name="archive" size={12} /> Phôi đông
          </Btn>
          <Btn variant="primary" onClick={() => { if (sel) { setCoupleModal({ couple: sel }); setSel(null); } }}>
            <Ico name="edit" size={12} /> Chỉnh sửa
          </Btn>
        </>}
      >
        {sel && <>
          <DrSec title="Vợ">
            <DrField lbl="Họ tên">{sel.wifeName || '—'}</DrField>
            <DrField lbl="Mã BN"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.wifeCode || '—'}</span></DrField>
            {sel.wifeDob && <DrField lbl="Ngày sinh">{dayjs(sel.wifeDob).format('DD/MM/YYYY')} · {calcAge(sel.wifeDob)}t</DrField>}
          </DrSec>
          <DrSec title="Chồng">
            <DrField lbl="Họ tên">{sel.husbandName || '—'}</DrField>
            <DrField lbl="Mã BN"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.husbandCode || '—'}</span></DrField>
            {sel.husbandDob && <DrField lbl="Ngày sinh">{dayjs(sel.husbandDob).format('DD/MM/YYYY')} · {calcAge(sel.husbandDob)}t</DrField>}
          </DrSec>
          <DrSec title="Tiền sử">
            {sel.marriageDate && <DrField lbl="Kết hôn">{dayjs(sel.marriageDate).format('DD/MM/YYYY')}</DrField>}
            <DrField lbl="Thời gian vô sinh"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.infertilityDurationMonths} tháng</span></DrField>
            <DrField lbl="Nguyên nhân">{sel.infertilityCause || '—'}</DrField>
            <DrField lbl="Số chu kỳ"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.cycleCount}</span></DrField>
            {sel.notes && <DrField lbl="Ghi chú">{sel.notes}</DrField>}
          </DrSec>
        </>}
      </DrawerShell>

      {/* ── Drawer Phôi đông ── */}
      {embryoTarget && (
        <DrawerShell
          open={!!embryoTarget}
          onClose={() => { setEmbryoTarget(null); setEmbryos([]); }}
          size="lg"
          title={`Phôi đông — ${embryoTarget.wifeName || '?'} & ${embryoTarget.husbandName || '?'}`}
          sub={`${embryos.length} phôi đông`}
          footer={<Btn variant="ghost" onClick={() => { setEmbryoTarget(null); setEmbryos([]); }}>Đóng</Btn>}
        >
          {embryoLoading && <div style={{ padding: 'var(--space-16)', color: 'var(--t-2)' }}>Đang tải…</div>}
          {!embryoLoading && embryos.length === 0 && (
            <div style={{ padding: 'var(--space-16)', color: 'var(--t-2)' }}>Không có phôi đông nào</div>
          )}
          {!embryoLoading && embryos.length > 0 && (
            <table className="ab-tbl">
              <thead>
                <tr>
                  <th>Mã phôi</th>
                  <th>Chất lượng</th>
                  <th>Ngày đông</th>
                  <th>Ống / Hộp / Tủ</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {embryos.map((e) => (
                  <tr key={e.id}>
                    <td className="mono">{e.embryoCode}</td>
                    <td>{e.day5Grade || e.day3Grade || e.day2Grade || '—'}</td>
                    <td className="mono">{e.freezeDate ? dayjs(e.freezeDate).format('DD/MM/YYYY') : '—'}</td>
                    <td style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
                      {[e.strawCode, e.boxCode, e.tankCode].filter(Boolean).join(' / ') || '—'}
                    </td>
                    <td>{e.statusName || e.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DrawerShell>
      )}

      {coupleModal && (
        <CoupleModal
          couple={coupleModal.couple}
          onClose={() => setCoupleModal(null)}
          onDone={() => { setCoupleModal(null); load(); }}
        />
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────
   Tab Chu kỳ IVF — port verbatim từ v1 CyclesTab (#409)
   Chọn cặp vợ chồng → danh sách chu kỳ + tạo chu kỳ (saveCycle)
   ──────────────────────────────────────────────────────────── */

const CyclesTab: React.FC = () => {
  const [couples, setCouples] = useState<IvfCouple[]>([]);
  const [cycles, setCycles] = useState<IvfCycle[]>([]);
  const [selectedCouple, setSelectedCouple] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => { getCouples().then(setCouples); }, []);

  const loadCycles = useCallback(async (coupleId: string) => {
    if (!coupleId) {
      setCycles([]);
      return;
    }
    setLoading(true);
    try {
      setCycles(await getCycles(coupleId));
    } finally {
      setLoading(false);
    }
  }, []);

  // verbatim-move từ v1: defer load qua setTimeout(0) + cleanup
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCycles(selectedCouple);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCycles, selectedCouple]);

  const handleSave = async (): Promise<void> => {
    if (saving) return;
    setSaving(true);
    try {
      const values = await form.validateFields();
      values.coupleId = selectedCouple;
      values.startDate = values.startDate?.format?.('YYYY-MM-DD') || values.startDate;
      await saveCycle(values);
      tk('Lưu chu kỳ thành công');
      setModalOpen(false);
      form.resetFields();
      getCycles(selectedCouple).then(setCycles);
    } catch { tw('Lưu thất bại'); }
    finally { setSaving(false); }
  };

  const cols: ColumnDef<IvfCycle>[] = [
    { key: 'num', label: 'Chu kỳ', mono: true, width: 70, render: (r) => r.cycleNumber },
    { key: 'start', label: 'Ngày bắt đầu', mono: true, width: 110, render: (r) => r.startDate ? dayjs(r.startDate).format('DD/MM/YYYY') : '—' },
    { key: 'status', label: 'Trạng thái', render: (r) => <Tag color={cycleStatusColor[r.status]}>{r.statusName || r.status}</Tag> },
    { key: 'protocol', label: 'Phác đồ', render: (r) => r.protocol || '—' },
    { key: 'doctor', label: 'Bác sĩ', render: (r) => r.doctorName || '—' },
    { key: 'embryo', label: 'Phôi', mono: true, width: 60, render: (r) => r.embryoCount },
    { key: 'transfer', label: 'Chuyển', mono: true, width: 70, render: (r) => r.transferCount },
  ];

  return (
    <>
      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <Select placeholder="Chọn cặp vợ chồng" style={{ width: 350 }} value={selectedCouple || undefined}
          onChange={(v) => setSelectedCouple(v)} showSearch optionFilterProp="label"
          options={couples.map((c) => ({ value: c.id, label: `${c.wifeName || ''} & ${c.husbandName || ''}` }))} />
        <span className="spacer" />
        <Btn variant="primary" disabled={!selectedCouple} onClick={() => { form.resetFields(); setModalOpen(true); }}>
          <Ico name="plus" size={12} /> Tạo chu kỳ
        </Btn>
      </div>
      <DataTable<IvfCycle>
        columns={cols} data={cycles} rowKey={(r) => r.id}
        empty={loading ? 'Đang tải…' : (selectedCouple ? 'Chưa có chu kỳ' : 'Chọn cặp vợ chồng để xem chu kỳ')}
      />
      {modalOpen && (
        <ModalShell
          open onClose={() => setModalOpen(false)} size="md" title="Tạo chu kỳ IVF"
          footer={<>
            <Btn variant="ghost" onClick={() => setModalOpen(false)}>Huỷ</Btn>
            <Btn variant="primary" onClick={handleSave} disabled={saving}>
              <Ico name="check" size={12} /> {saving ? 'Đang lưu…' : 'Lưu'}
            </Btn>
          </>}
        >
          <Form form={form} layout="vertical">
            <Row gutter={16}>
              <Col span={12}><Form.Item name="cycleNumber" label="Số chu kỳ" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={12}><Form.Item name="startDate" label="Ngày bắt đầu"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            </Row>
            <Form.Item name="protocol" label="Phác đồ"><Input placeholder="VD: Long protocol, Short protocol, Antagonist..." /></Form.Item>
            <Form.Item name="notes" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
          </Form>
        </ModalShell>
      )}
    </>
  );
};

/* ────────────────────────────────────────────────────────────
   Tab Phôi — port verbatim từ v1 EmbryosTab (#409)
   saveEmbryo / freezeEmbryo / thawEmbryo; chọn cặp → chọn chu kỳ
   (v2 thay ô "nhập Cycle ID" thô của v1 bằng picker — logic giữ nguyên)
   ──────────────────────────────────────────────────────────── */

const EmbryosTab: React.FC = () => {
  const [couples, setCouples] = useState<IvfCouple[]>([]);
  const [cycles, setCycles] = useState<IvfCycle[]>([]);
  const [coupleId, setCoupleId] = useState('');
  const [cycleId, setCycleId] = useState('');
  const [embryos, setEmbryos] = useState<IvfEmbryo[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [freezeModal, setFreezeModal] = useState<string | null>(null);
  // thao tác trên phôi không hoàn tác → khoá toàn bộ khi 1 thao tác đang chạy
  // ('save' | 'freeze' | id phôi đang rã đông)
  const [busy, setBusy] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [freezeForm] = Form.useForm();

  useEffect(() => { getCouples().then(setCouples); }, []);

  useEffect(() => {
    setCycleId('');
    setEmbryos([]);
    if (!coupleId) { setCycles([]); return; }
    getCycles(coupleId).then(setCycles);
  }, [coupleId]);

  const fetchEmbryos = useCallback(async () => {
    if (!cycleId) return;
    setLoading(true);
    try { setEmbryos(await getEmbryos(cycleId)); }
    catch { tw('Không thể tải danh sách phôi'); }
    finally { setLoading(false); }
  }, [cycleId]);

  useEffect(() => { fetchEmbryos(); }, [fetchEmbryos]);

  const handleSave = async (): Promise<void> => {
    if (busy) return;
    setBusy('save');
    try {
      const values = await form.validateFields();
      values.cycleId = cycleId;
      await saveEmbryo(values);
      tk('Lưu phôi thành công');
      setModalOpen(false);
      form.resetFields();
      fetchEmbryos();
    } catch { tw('Lưu thất bại'); }
    finally { setBusy(null); }
  };

  const handleFreeze = async (): Promise<void> => {
    if (busy) return;
    setBusy('freeze');
    try {
      const values = await freezeForm.validateFields();
      values.freezeDate = values.freezeDate?.format?.('YYYY-MM-DD') || values.freezeDate;
      await freezeEmbryo(freezeModal!, values);
      tk('Đông lạnh thành công');
      setFreezeModal(null);
      freezeForm.resetFields();
      fetchEmbryos();
    } catch { tw('Đông lạnh thất bại'); }
    finally { setBusy(null); }
  };

  const handleThaw = async (id: string): Promise<void> => {
    if (busy) return;
    setBusy(id);
    try {
      await thawEmbryo(id, { thawDate: dayjs().format('YYYY-MM-DD') });
      tk('Rã đông thành công');
      fetchEmbryos();
    } catch { tw('Rã đông thất bại'); }
    finally { setBusy(null); }
  };

  const cols: ColumnDef<IvfEmbryo>[] = [
    { key: 'code', label: 'Mã phôi', mono: true, width: 100, render: (r) => r.embryoCode },
    { key: 'd2', label: 'D2', width: 50, render: (r) => r.day2Grade || '—' },
    { key: 'd3', label: 'D3', width: 50, render: (r) => r.day3Grade || '—' },
    { key: 'd5', label: 'D5', width: 50, render: (r) => r.day5Grade || '—' },
    { key: 'd6', label: 'D6', width: 50, render: (r) => r.day6Grade || '—' },
    { key: 'd7', label: 'D7', width: 50, render: (r) => r.day7Grade || '—' },
    { key: 'status', label: 'Trạng thái', render: (r) => <Tag color={embryoStatusColor[r.status]}>{r.statusName || r.status}</Tag> },
    { key: 'tank', label: 'Bình', mono: true, width: 70, render: (r) => r.tankCode || '—' },
    { key: 'straw', label: 'Ống', mono: true, width: 70, render: (r) => r.strawCode || '—' },
  ];

  const rowActions = (r: IvfEmbryo) => (
    <div className="ab-actions">
      {r.status === 1 && (
        <Btn size="sm" onClick={(e) => { e.stopPropagation(); setFreezeModal(r.id); freezeForm.resetFields(); }}>
          Đông lạnh
        </Btn>
      )}
      {r.status === 3 && (
        <Btn size="sm" disabled={busy === r.id} onClick={(e) => { e.stopPropagation(); handleThaw(r.id); }}>
          {busy === r.id ? 'Đang rã đông…' : 'Rã đông'}
        </Btn>
      )}
    </div>
  );

  return (
    <>
      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <Select placeholder="Chọn cặp vợ chồng" style={{ width: 280 }} value={coupleId || undefined}
          onChange={(v) => setCoupleId(v)} showSearch optionFilterProp="label"
          options={couples.map((c) => ({ value: c.id, label: `${c.wifeName || ''} & ${c.husbandName || ''}` }))} />
        <Select placeholder="Chọn chu kỳ" style={{ width: 180 }} value={cycleId || undefined}
          onChange={(v) => setCycleId(v)} disabled={!coupleId}
          options={cycles.map((c) => ({ value: c.id, label: `Chu kỳ ${c.cycleNumber}${c.startDate ? ` · ${dayjs(c.startDate).format('DD/MM/YYYY')}` : ''}` }))} />
        <Btn variant="ghost" onClick={fetchEmbryos} disabled={!cycleId}>
          <Ico name="refresh" size={12} /> Tải phôi
        </Btn>
        <span className="spacer" />
        <Btn variant="primary" disabled={!cycleId} onClick={() => { form.resetFields(); setModalOpen(true); }}>
          <Ico name="plus" size={12} /> Thêm phôi
        </Btn>
      </div>
      <DataTable<IvfEmbryo>
        columns={cols} data={embryos} rowKey={(r) => r.id} actions={rowActions}
        empty={loading ? 'Đang tải…' : (cycleId ? 'Chưa có phôi' : 'Chọn cặp vợ chồng và chu kỳ để xem phôi')}
      />
      {modalOpen && (
        <ModalShell
          open onClose={() => setModalOpen(false)} size="md" title="Thêm phôi"
          footer={<>
            <Btn variant="ghost" onClick={() => setModalOpen(false)}>Huỷ</Btn>
            <Btn variant="primary" onClick={handleSave} disabled={busy === 'save'}>
              <Ico name="check" size={12} /> {busy === 'save' ? 'Đang lưu…' : 'Lưu'}
            </Btn>
          </>}
        >
          <Form form={form} layout="vertical">
            <Row gutter={16}>
              <Col span={8}><Form.Item name="embryoCode" label="Mã phôi" rules={[{ required: true }]}><Input /></Form.Item></Col>
              <Col span={8}><Form.Item name="day2Grade" label="Grade D2"><Input /></Form.Item></Col>
              <Col span={8}><Form.Item name="day3Grade" label="Grade D3"><Input /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}><Form.Item name="day5Grade" label="Grade D5"><Input /></Form.Item></Col>
              <Col span={8}><Form.Item name="day6Grade" label="Grade D6"><Input /></Form.Item></Col>
              <Col span={8}><Form.Item name="day7Grade" label="Grade D7"><Input /></Form.Item></Col>
            </Row>
            <Form.Item name="notes" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
          </Form>
        </ModalShell>
      )}
      {freezeModal && (
        <ModalShell
          open onClose={() => setFreezeModal(null)} size="md" title="Đông lạnh phôi"
          footer={<>
            <Btn variant="ghost" onClick={() => setFreezeModal(null)}>Huỷ</Btn>
            <Btn variant="primary" onClick={handleFreeze} disabled={busy === 'freeze'}>
              <Ico name="check" size={12} /> {busy === 'freeze' ? 'Đang đông lạnh…' : 'Đông lạnh'}
            </Btn>
          </>}
        >
          <Form form={freezeForm} layout="vertical">
            <Row gutter={16}>
              <Col span={12}><Form.Item name="freezeDate" label="Ngày đông lạnh"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={12}><Form.Item name="strawCode" label="Mã ống"><Input /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}><Form.Item name="strawColor" label="Màu ống"><Input /></Form.Item></Col>
              <Col span={8}><Form.Item name="tankCode" label="Bình"><Input /></Form.Item></Col>
              <Col span={8}><Form.Item name="boxCode" label="Hộp"><Input /></Form.Item></Col>
            </Row>
            <Form.Item name="rackPosition" label="Vị trí rack"><Input /></Form.Item>
          </Form>
        </ModalShell>
      )}
    </>
  );
};

/* ────────────────────────────────────────────────────────────
   Tab Trữ đông — port verbatim từ v1 CryoTab (#409)
   Kho phôi đông (placeholder như v1) + tinh trùng sắp hết hạn (90 ngày)
   ──────────────────────────────────────────────────────────── */

const CryoTab: React.FC = () => {
  // v1 parity: bảng phôi đông là placeholder (luôn rỗng) — xem phôi đông theo
  // cặp qua nút "Phôi đông" ở tab Cặp vợ chồng
  const frozenEmbryos: IvfEmbryo[] = [];
  const [expiringSperm, setExpiringSperm] = useState<IvfSpermSample[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sperm] = await Promise.all([
        getExpiringStorage(90),
      ]);
      setExpiringSperm(sperm);
    } catch { tw('Không thể tải dữ liệu trữ đông'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const embryoCols: ColumnDef<IvfEmbryo>[] = [
    { key: 'code', label: 'Mã phôi', mono: true, render: (r) => r.embryoCode },
    { key: 'tank', label: 'Bình', mono: true, render: (r) => r.tankCode || '—' },
    { key: 'rack', label: 'Rack', mono: true, render: (r) => r.rackPosition || '—' },
    { key: 'box', label: 'Hộp', mono: true, render: (r) => r.boxCode || '—' },
    { key: 'straw', label: 'Ống', mono: true, render: (r) => r.strawCode || '—' },
    { key: 'freeze', label: 'Ngày đông', mono: true, render: (r) => r.freezeDate ? dayjs(r.freezeDate).format('DD/MM/YYYY') : '—' },
  ];

  const spermCols: ColumnDef<IvfSpermSample>[] = [
    { key: 'code', label: 'Mã mẫu', mono: true, render: (r) => r.sampleCode },
    { key: 'patient', label: 'Bệnh nhân', render: (r) => r.patientName || '—' },
    { key: 'tank', label: 'Bình', mono: true, render: (r) => r.tankCode || '—' },
    { key: 'straws', label: 'Số ống', mono: true, render: (r) => r.strawCount },
    { key: 'expiry', label: 'Hạn', render: (r) => r.expiryDate ? (
      <Tag color={dayjs(r.expiryDate).isBefore(dayjs()) ? 'error' : dayjs(r.expiryDate).isBefore(dayjs().add(30, 'day')) ? 'warning' : 'default'}>
        {dayjs(r.expiryDate).format('DD/MM/YYYY')}
      </Tag>
    ) : '-' },
    { key: 'fee', label: 'Phí', mono: true, render: (r) => `${r.storageFee?.toLocaleString('vi-VN')} đ` },
  ];

  return (
    <>
      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <span style={{ fontWeight: 600, color: 'var(--t-0)' }}>Phôi đông lạnh</span>
        <span className="spacer" />
        <RefreshButton onRefresh={async () => { await fetchData() }} />
      </div>
      <DataTable<IvfEmbryo>
        columns={embryoCols} data={frozenEmbryos} rowKey={(r) => r.id}
        empty={'Xem phôi đông theo cặp: tab Cặp vợ chồng → nút "Phôi đông"'}
      />
      <div className="ab-toolbar">
        <span style={{ fontWeight: 600, color: 'var(--t-0)' }}>Tinh trùng sắp hết hạn (90 ngày)</span>
      </div>
      <DataTable<IvfSpermSample>
        columns={spermCols} data={expiringSperm} rowKey={(r) => r.id}
        empty={loading ? 'Đang tải…' : 'Không có mẫu sắp hết hạn'}
      />
    </>
  );
};

/* ────────────────────────────────────────────────────────────
   Tab Ngân hàng tinh trùng — port verbatim từ v1 SpermBankTab (#409)
   getSpermSamples(keyword) + saveSpermSample
   ──────────────────────────────────────────────────────────── */

const SpermBankTab: React.FC = () => {
  const [data, setData] = useState<IvfSpermSample[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { setData(await getSpermSamples({ keyword: keyword || undefined })); }
    catch { tw('Không thể tải ngân hàng tinh trùng'); }
    finally { setLoading(false); }
  }, [keyword]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async (): Promise<void> => {
    if (saving) return;
    setSaving(true);
    try {
      const values = await form.validateFields();
      values.collectionDate = values.collectionDate?.format?.('YYYY-MM-DD') || values.collectionDate;
      values.expiryDate = values.expiryDate?.format?.('YYYY-MM-DD') || values.expiryDate;
      await saveSpermSample(values);
      tk('Lưu thành công');
      setModalOpen(false);
      form.resetFields();
      fetchData();
    } catch { tw('Lưu thất bại'); }
    finally { setSaving(false); }
  };

  const cols: ColumnDef<IvfSpermSample>[] = [
    { key: 'code', label: 'Mã mẫu', mono: true, width: 110, render: (r) => r.sampleCode },
    { key: 'patient', label: 'Bệnh nhân', render: (r) => r.patientName || '—' },
    { key: 'date', label: 'Ngày thu', mono: true, width: 100, render: (r) => r.collectionDate ? dayjs(r.collectionDate).format('DD/MM/YYYY') : '—' },
    { key: 'vol', label: 'V (ml)', mono: true, width: 65, render: (r) => r.volume ?? '—' },
    { key: 'conc', label: 'Nồng độ', mono: true, width: 75, render: (r) => r.concentration ?? '—' },
    { key: 'mot', label: 'Di động %', mono: true, width: 80, render: (r) => r.motility ?? '—' },
    { key: 'morph', label: 'Hình thái %', mono: true, width: 85, render: (r) => r.morphology ?? '—' },
    { key: 'straws', label: 'Ống', mono: true, width: 55, render: (r) => r.strawCount },
    { key: 'status', label: 'Trạng thái', render: (r) => <Tag color={spermStatusColor[r.status]}>{r.statusName || r.status}</Tag> },
    { key: 'expiry', label: 'Hạn', mono: true, width: 100, render: (r) => r.expiryDate ? dayjs(r.expiryDate).format('DD/MM/YYYY') : '—' },
  ];

  const totalPages = Math.max(1, Math.ceil(data.length / PER));
  const paged = data.slice(page * PER, (page + 1) * PER);

  return (
    <>
      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={keyword} onChange={(v) => { setKeyword(v); setPage(0); }} placeholder="Tìm kiếm…" />
        <span className="spacer" />
        <RefreshButton onRefresh={async () => { await fetchData() }} />
        <Btn variant="primary" onClick={() => { form.resetFields(); setModalOpen(true); }}>
          <Ico name="plus" size={12} /> Thêm mẫu
        </Btn>
      </div>
      <DataTable<IvfSpermSample>
        columns={cols} data={paged} rowKey={(r) => r.id}
        empty={loading ? 'Đang tải…' : 'Chưa có mẫu tinh trùng'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={data.length} perPage={PER} />
      {modalOpen && (
        <ModalShell
          open onClose={() => setModalOpen(false)} size="lg" title="Thêm mẫu tinh trùng"
          footer={<>
            <Btn variant="ghost" onClick={() => setModalOpen(false)}>Huỷ</Btn>
            <Btn variant="primary" onClick={handleSave} disabled={saving}>
              <Ico name="check" size={12} /> {saving ? 'Đang lưu…' : 'Lưu'}
            </Btn>
          </>}
        >
          <Form form={form} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="patientId" label="Bệnh nhân" rules={[{ required: true }]}>
                  <PatientPicker placeholder="Tìm bệnh nhân…" onChange={(id) => form.setFieldValue('patientId', id)} />
                </Form.Item>
              </Col>
              <Col span={12}><Form.Item name="sampleCode" label="Mã mẫu" rules={[{ required: true }]}><Input /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}><Form.Item name="collectionDate" label="Ngày thu"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={8}><Form.Item name="volume" label="Thể tích (ml)"><InputNumber min={0} step={0.1} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={8}><Form.Item name="concentration" label="Nồng độ (triệu/ml)"><InputNumber min={0} step={0.1} style={{ width: '100%' }} /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}><Form.Item name="motility" label="Di động (%)"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={8}><Form.Item name="morphology" label="Hình thái (%)"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={8}><Form.Item name="strawCount" label="Số ống"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}><Form.Item name="tankCode" label="Bình"><Input /></Form.Item></Col>
              <Col span={8}><Form.Item name="boxCode" label="Hộp"><Input /></Form.Item></Col>
              <Col span={8}><Form.Item name="expiryDate" label="Hạn sử dụng"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}><Form.Item name="storageFee" label="Phí lưu trữ"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={12}><Form.Item name="notes" label="Ghi chú"><Input /></Form.Item></Col>
            </Row>
          </Form>
        </ModalShell>
      )}
    </>
  );
};

/* ────────────────────────────────────────────────────────────
   Tab Dashboard — port verbatim từ v1 DashboardTab (#409)
   getIvfDashboard + getDailyReport; điều kiện successRate > 30 giữ nguyên
   ──────────────────────────────────────────────────────────── */

const DashboardTab: React.FC = () => {
  const [dashboard, setDashboard] = useState<IvfDashboard | null>(null);
  const [report, setReport] = useState<IvfDailyReport | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, rep] = await Promise.all([
        getIvfDashboard(),
        getDailyReport(),
      ]);
      setDashboard(dash);
      setReport(rep);
    } catch { tw('Không thể tải dashboard'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div style={{ borderTop: '1px solid var(--line)' }}>
      <div className="ab-toolbar">
        <span style={{ fontWeight: 600, color: 'var(--t-0)' }}>Tổng quan hoạt động IVF</span>
        <span className="spacer" />
        <RefreshButton onRefresh={async () => { await fetchData() }} />
      </div>
      {dashboard && (
        <KpiStrip items={[
          { lbl: 'Chu kỳ đang hoạt động', val: dashboard.activeCycles, tone: 'warn' },
          { lbl: 'Phôi đông lạnh', val: dashboard.frozenEmbryos, tone: 'info' },
          { lbl: 'Mẫu tinh trùng', val: dashboard.spermSamples },
          { lbl: 'Chuyển phôi tháng này', val: dashboard.transfersThisMonth },
          { lbl: 'Tỷ lệ thành công', val: dashboard.successRate, unit: '%', tone: dashboard.successRate > 30 ? 'ok' : 'crit' },
          { lbl: 'Tổng cặp vợ chồng', val: dashboard.totalCouples },
          { lbl: 'Chu kỳ hoàn thành', val: dashboard.completedCycles, tone: 'ok' },
        ]} />
      )}
      <div style={{ padding: 'var(--space-12) var(--space-16)' }}>
        <div style={{ fontWeight: 600, marginBottom: 'var(--space-8)', color: 'var(--t-0)' }}>
          Báo cáo hoạt động hôm nay {report?.date ? `(${report.date})` : ''}
        </div>
        {report && report.items.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {report.items.map((item, i) => (
              <div key={i} style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-1)' }}>
                <strong>{item.activityType}</strong>: {item.count} {item.details ? `- ${item.details}` : ''}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: 'var(--t-2)' }}>Chưa có hoạt động nào hôm nay</div>
        )}
        {dashboard && dashboard.successRate > 0 && (
          <div style={{ marginTop: 16 }}>
            <Tooltip title={`${dashboard.successRate}% tỷ lệ thành công`}>
              <span>Tỷ lệ thành công tổng thể:</span>
              <Progress percent={Number(dashboard.successRate)} status={dashboard.successRate > 30 ? 'success' : 'normal'} style={{ maxWidth: 400 }} />
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────
   Đăng ký / cập nhật cặp đôi IVF — saveCouple (upsert theo id)
   Vợ + chồng là FK bệnh nhân → chọn qua tìm kiếm (patientApi.search)
   ──────────────────────────────────────────────────────────── */

const PatientPicker: React.FC<{
  value?: string;
  seedLabel?: string;
  placeholder?: string;
  onChange: (id: string) => void;
}> = ({ value, seedLabel, placeholder, onChange }) => {
  const [opts, setOpts] = useState<{ value: string; label: string }[]>(
    value && seedLabel ? [{ value, label: seedLabel }] : [],
  );
  const [fetching, setFetching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const doSearch = (kw: string): void => {
    if (timer.current) clearTimeout(timer.current);
    if (!kw || kw.trim().length < 2) return;
    timer.current = setTimeout(async () => {
      setFetching(true);
      try {
        const res = await patientApi.search({ keyword: kw.trim(), pageSize: 20 });
        const list = res.data?.items || [];
        setOpts(list.map((p) => ({ value: p.id, label: `${p.fullName} · ${p.patientCode}${p.yearOfBirth ? ` · ${p.yearOfBirth}` : ''}` })));
      } catch (e) { tw(friendlyErrorMessage(e, 'Không tìm được bệnh nhân. Vui lòng thử lại.')); }
      finally { setFetching(false); }
    }, 350);
  };

  return (
    <Select
      showSearch filterOption={false} value={value || undefined} placeholder={placeholder}
      onSearch={doSearch} onChange={(v) => onChange(v)} options={opts} loading={fetching}
      notFoundContent={fetching ? 'Đang tìm…' : 'Gõ ≥2 ký tự để tìm bệnh nhân'} style={{ width: '100%' }}
    />
  );
};

const Fld: React.FC<{ lbl: string; req?: boolean; children: React.ReactNode }> = ({ lbl, req, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
    <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-2)' }}>
      {lbl}{req && <span style={{ color: 'var(--s-crit)' }}> *</span>}
    </span>
    {children}
  </div>
);

const CoupleModal: React.FC<{ couple: IvfCouple | null; onClose: () => void; onDone: () => void }> = ({ couple, onClose, onDone }) => {
  const editing = !!couple;
  const [wifeId, setWifeId] = useState(couple?.wifePatientId || '');
  const [husbandId, setHusbandId] = useState(couple?.husbandPatientId || '');
  const [duration, setDuration] = useState<number>(couple?.infertilityDurationMonths ?? 0);
  const [cause, setCause] = useState(couple?.infertilityCause || '');
  const [marriage, setMarriage] = useState<Dayjs | null>(couple?.marriageDate ? dayjs(couple.marriageDate) : null);
  const [notes, setNotes] = useState(couple?.notes || '');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (): Promise<void> => {
    if (!wifeId || !husbandId) { setErr('Chọn cả vợ và chồng'); return; }
    setErr('');
    setSubmitting(true);
    try {
      await saveCouple({
        ...(editing ? { id: couple!.id } : {}),
        wifePatientId: wifeId,
        husbandPatientId: husbandId,
        infertilityDurationMonths: duration,
        infertilityCause: cause.trim() || undefined,
        marriageDate: marriage ? marriage.format('YYYY-MM-DD') : undefined,
        notes: notes.trim() || undefined,
      });
      tk(editing ? 'Đã cập nhật cặp đôi' : 'Đã đăng ký cặp đôi');
      onDone();
    } catch {
      te('Lưu cặp đôi thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      open
      onClose={onClose}
      size="md"
      title={editing ? 'Cập nhật cặp đôi IVF' : 'Đăng ký cặp đôi IVF'}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Huỷ</Btn>
        <Btn variant="primary" onClick={submit} disabled={submitting}>
          <Ico name="check" size={12} /> {submitting ? 'Đang lưu…' : (editing ? 'Cập nhật' : 'Đăng ký')}
        </Btn>
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
        <Fld lbl="Vợ (bệnh nhân)" req>
          <PatientPicker value={wifeId} seedLabel={couple ? `${couple.wifeName || ''} · ${couple.wifeCode || ''}` : undefined}
            placeholder="Tìm bệnh nhân nữ…" onChange={setWifeId} />
        </Fld>
        <Fld lbl="Chồng (bệnh nhân)" req>
          <PatientPicker value={husbandId} seedLabel={couple ? `${couple.husbandName || ''} · ${couple.husbandCode || ''}` : undefined}
            placeholder="Tìm bệnh nhân nam…" onChange={setHusbandId} />
        </Fld>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
          <Fld lbl="Thời gian vô sinh (tháng)">
            <InputNumber style={{ width: '100%' }} min={0} value={duration} onChange={(v) => setDuration(v ?? 0)} />
          </Fld>
          <Fld lbl="Ngày kết hôn">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" value={marriage} onChange={setMarriage} />
          </Fld>
        </div>
        <Fld lbl="Nguyên nhân vô sinh">
          <Input value={cause} onChange={(e) => setCause(e.target.value)} placeholder="VD: Tắc vòi trứng, tinh trùng yếu…" />
        </Fld>
        <Fld lbl="Ghi chú">
          <Input.TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Fld>
        {err && <div style={{ color: 'var(--s-crit)', fontSize: 'var(--fs-sm)' }}>{err}</div>}
      </div>
    </ModalShell>
  );
};

export default IvfLabV2;
