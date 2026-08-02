// =====================================================================
// HIS Terminal · [25] QR ĐỘNG & ĐỐI SOÁT VCB — NangCap25 (Issue #358)
// 3 tab: Đối soát ngân hàng (VI.2) · Báo cáo người tạo QR (VI.1) ·
// Chi hộ hoàn tiền thừa (IV — MockMode đến khi có API giải ngân VCB).
// =====================================================================
import React, { useCallback, useEffect, useState } from 'react';
import {
  KpiStrip, TopTabs, ActBtn, Btn, ModalShell, DataTable, StatusBadge,
  fmtVNDg, fmtDTg, tk, te, tw, type ColumnDef, type TopTab,
} from '@/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import {
  getBankReconciliation, getQrFinanceReport,
  createDisbursement, executeDisbursement, cancelDisbursement, searchDisbursements,
  type BankReconciliationReport, type QrFinanceReport, type QrFinanceItem,
  type RefundDisbursementDto, type QrCreatorStat,
} from '../api/nangcap25';

type TabKey = 'recon' | 'creators' | 'disburse';
const TABS: TopTab<TabKey>[] = [
  { v: 'recon', l: 'Đối soát ngân hàng', ic: 'refresh' },
  { v: 'creators', l: 'Báo cáo người tạo QR', ic: 'user' },
  { v: 'disburse', l: 'Chi hộ hoàn tiền', ic: 'send' },
];

const BANKS = [
  { v: '', l: 'Tất cả ngân hàng' },
  { v: 'vcb', l: 'Vietcombank' },
  { v: 'bidv', l: 'BIDV' },
  { v: 'agribank', l: 'Agribank' },
  { v: 'vietinbank', l: 'VietinBank' },
  { v: 'msb', l: 'MSB' },
];

const todayISO = () => new Date().toISOString().slice(0, 10);
const monthAgoISO = () => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); };

const STATUS_TONE: Record<number, 'ok' | 'warn' | 'info' | 'crit'> = { 0: 'warn', 1: 'ok', 2: 'crit', 3: 'info', 4: 'info' };

const QrPaymentCenter: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('recon');
  const [from, setFrom] = useState(monthAgoISO());
  const [to, setTo] = useState(todayISO());
  const [bank, setBank] = useState('');
  const [loading, setLoading] = useState(false);

  const [recon, setRecon] = useState<BankReconciliationReport | null>(null);
  const [finance, setFinance] = useState<QrFinanceReport | null>(null);
  const [disb, setDisb] = useState<RefundDisbursementDto[]>([]);
  const [disbTotals, setDisbTotals] = useState<{ total: number; transferred: number }>({ total: 0, transferred: 0 });

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cform, setCform] = useState({
    patientId: '', amount: '', bankBin: '970436', bankName: 'Vietcombank',
    accountNumber: '', accountHolder: '', reason: '',
  });

  const load = useCallback(async (t: TabKey) => {
    setLoading(true);
    try {
      if (t === 'recon') setRecon(await getBankReconciliation(from, to, bank || undefined));
      else if (t === 'creators') setFinance(await getQrFinanceReport(from, to));
      else {
        const r = await searchDisbursements({ fromDate: from, toDate: to, pageIndex: 1, pageSize: 100 });
        setDisb(r.items || []);
        setDisbTotals({ total: r.totalAmount, transferred: r.transferredAmount });
      }
    } catch { te('Không tải được dữ liệu'); }
    finally { setLoading(false); }
  }, [from, to, bank]);

  useEffect(() => { void load(tab); }, [tab, load]);

  const txnCols: ColumnDef<QrFinanceItem>[] = [
    { key: 'ref', label: 'Mã GD', mono: true, code: true, width: 170, render: (r) => r.txnRef },
    { key: 'bank', label: 'NH', width: 90, render: (r) => r.provider.toUpperCase() },
    { key: 'patient', label: 'Bệnh nhân', render: (r) => r.patientName || '—' },
    { key: 'info', label: 'Nội dung', render: (r) => r.orderInfo },
    { key: 'amount', label: 'Số tiền', mono: true, width: 120, render: (r) => fmtVNDg(r.amount) },
    { key: 'creator', label: 'Người tạo QR', width: 140, render: (r) => r.creatorName },
    { key: 'created', label: 'Tạo lúc', mono: true, width: 140, render: (r) => fmtDTg(r.createdAt) },
    { key: 'status', label: 'TT', width: 120, render: (r) => <StatusBadge tone={STATUS_TONE[r.status] ?? 'info'} dot>{r.statusText}</StatusBadge> },
  ];

  const creatorCols: ColumnDef<QrCreatorStat>[] = [
    { key: 'name', label: 'Người tạo mã QR', render: (r) => <b>{r.creatorName}</b> },
    { key: 'count', label: 'Số GD', mono: true, width: 100, render: (r) => r.count },
    { key: 'amount', label: 'Tổng tiền', mono: true, width: 150, render: (r) => fmtVNDg(r.amount) },
    { key: 'paid', label: 'Đã thu', mono: true, width: 150, render: (r) => <b style={{ color: 'var(--s-ok)' }}>{fmtVNDg(r.paidAmount)}</b> },
  ];

  const disbCols: ColumnDef<RefundDisbursementDto>[] = [
    { key: 'code', label: 'Mã lệnh', mono: true, code: true, width: 150, render: (r) => r.disbursementCode },
    { key: 'patient', label: 'Bệnh nhân', render: (r) => <>{r.patientName || '—'}<div style={{ fontSize: 10.5, color: 'var(--t-2)' }} className="mono">{r.patientCode}</div></> },
    { key: 'amount', label: 'Số tiền', mono: true, width: 130, render: (r) => fmtVNDg(r.amount) },
    { key: 'account', label: 'TK nhận', render: (r) => <>{r.bankName} · <span className="mono">{r.accountNumber}</span><div style={{ fontSize: 10.5, color: 'var(--t-2)' }}>{r.accountHolder}</div></> },
    { key: 'reason', label: 'Lý do', render: (r) => r.reason || '—' },
    { key: 'status', label: 'TT', width: 110, render: (r) => <StatusBadge tone={r.status === 2 ? 'ok' : r.status === 4 || r.status === 3 ? 'crit' : 'warn'} dot>{r.statusText}</StatusBadge> },
    { key: 'transfer', label: 'Lệnh chi', mono: true, width: 150, render: (r) => r.transferRef || '—' },
  ];

  const doCreate = async () => {
    const amt = Number(cform.amount);
    if (!cform.patientId.trim()) { tw('Nhập ID bệnh nhân (lấy từ giao dịch gốc hoặc hồ sơ)'); return; }
    if (!amt || amt <= 0) { tw('Nhập số tiền hợp lệ'); return; }
    if (!cform.accountNumber.trim() || !cform.accountHolder.trim()) { tw('Nhập đầy đủ tài khoản nhận'); return; }
    setSaving(true);
    try {
      await createDisbursement({
        patientId: cform.patientId.trim(),
        amount: amt,
        bankBin: cform.bankBin,
        bankName: cform.bankName,
        accountNumber: cform.accountNumber.trim(),
        accountHolder: cform.accountHolder.trim(),
        reason: cform.reason || undefined,
      });
      tk('Đã tạo lệnh chi hộ — chờ duyệt');
      setCreateOpen(false);
      void load('disburse');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      te(e?.response?.data?.message || 'Tạo lệnh chi thất bại');
    } finally { setSaving(false); }
  };

  const doExecute = async (r: RefundDisbursementDto) => {
    try {
      await executeDisbursement(r.id);
      tk(`Đã chi ${fmtVNDg(r.amount)} → ${r.accountNumber}`);
      void load('disburse');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      te(e?.response?.data?.message || 'Thực hiện chi thất bại');
    }
  };

  const doCancel = async (r: RefundDisbursementDto) => {
    try {
      await cancelDisbursement(r.id);
      tk('Đã hủy lệnh chi');
      void load('disburse');
    } catch { te('Hủy thất bại'); }
  };

  const kpis = tab === 'recon' && recon ? [
    { lbl: 'Tổng GD', val: recon.totalCount, sub: fmtVNDg(recon.totalAmount) },
    { lbl: 'Đã thanh toán', val: recon.paidCount, tone: 'ok' as const, sub: fmtVNDg(recon.paidAmount) },
    { lbl: 'Chờ TT', val: recon.pendingCount, tone: 'warn' as const, sub: fmtVNDg(recon.pendingAmount) },
    { lbl: 'Khớp sao kê', val: `${recon.matchedCount}/${recon.paidCount}`, tone: recon.matchedCount === recon.paidCount ? 'ok' as const : 'warn' as const },
    { lbl: 'Hết hạn / lỗi', val: recon.expiredCount + recon.failedCount, tone: 'info' as const },
  ] : tab === 'creators' && finance ? [
    { lbl: 'Tổng GD QR', val: finance.totalCount },
    { lbl: 'Tổng tiền', val: fmtVNDg(finance.totalAmount), tone: 'info' as const },
    { lbl: 'Đã thu', val: fmtVNDg(finance.paidAmount), tone: 'ok' as const },
    { lbl: 'Người tạo', val: finance.byCreator.length },
  ] : [
    { lbl: 'Lệnh chi', val: disb.length },
    { lbl: 'Tổng tiền', val: fmtVNDg(disbTotals.total), tone: 'info' as const },
    { lbl: 'Đã chi', val: fmtVNDg(disbTotals.transferred), tone: 'ok' as const },
    { lbl: 'Chờ duyệt', val: disb.filter((d) => d.status === 0).length, tone: 'warn' as const },
  ];

  return (
    <div className="ab-module">
      <div className="ab-header">
        <h1 className="ab-title">QR động &amp; Đối soát VCB</h1>
        <div className="ab-actions">
          <input type="date" className="ed-fld" value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: 140 }} />
          <input type="date" className="ed-fld" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: 140 }} />
          {tab === 'recon' && (
            <select className="ed-fld" value={bank} onChange={(e) => setBank(e.target.value)} style={{ width: 160 }}>
              {BANKS.map((b) => <option key={b.v} value={b.v}>{b.l}</option>)}
            </select>
          )}
          <ActBtn ic="refresh" title="Làm mới" onClick={() => load(tab)} />
        </div>
      </div>

      <KpiStrip items={kpis} />
      <TopTabs<TabKey> tabs={TABS} tab={tab} setTab={setTab} />

      {tab === 'recon' && (
        <div style={{ padding: 'var(--space-12) 0' }}>
          {recon && recon.unmatchedPaid.length > 0 && (
            <div style={{ margin: '0 0 var(--space-12)', padding: 'var(--space-10)', border: '1px solid var(--s-warn)', borderRadius: 'var(--r-2)', fontSize: 'var(--fs-sm)' }}>
              <b>⚠ {recon.unmatchedPaid.length} giao dịch đã thu nhưng THIẾU mã tham chiếu ngân hàng</b> — cần đối soát lại với sao kê.
            </div>
          )}
          <DataTable<QrFinanceItem> columns={txnCols} data={recon?.items ?? []} rowKey={(r) => r.id} empty={loading ? 'Đang tải…' : 'Không có giao dịch QR trong kỳ'} />
        </div>
      )}

      {tab === 'creators' && (
        <div style={{ padding: 'var(--space-12) 0', display: 'grid', gap: 'var(--space-14)' }}>
          <DataTable<QrCreatorStat> columns={creatorCols} data={finance?.byCreator ?? []} rowKey={(r) => r.creatorName} empty={loading ? 'Đang tải…' : 'Không có dữ liệu'} />
          <div>
            <div style={{ fontSize: 10.5, color: 'var(--t-2)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600, margin: '0 0 var(--space-6)' }}>Chi tiết giao dịch</div>
            <DataTable<QrFinanceItem> columns={txnCols} data={finance?.items ?? []} rowKey={(r) => r.id} empty="—" />
          </div>
        </div>
      )}

      {tab === 'disburse' && (
        <div style={{ padding: 'var(--space-12) 0' }}>
          <div style={{ marginBottom: 'var(--space-12)' }}>
            <Btn variant="primary" onClick={() => setCreateOpen(true)}><TermIcon name="plus" size={12} /> Tạo lệnh chi hộ</Btn>
          </div>
          <DataTable<RefundDisbursementDto>
            columns={disbCols}
            data={disb}
            rowKey={(r) => r.id}
            empty={loading ? 'Đang tải…' : 'Chưa có lệnh chi hộ'}
            actions={(r) => (r.status === 0 || r.status === 1) ? (
              <>
                <ActBtn ic="check" title="Duyệt + chi" onClick={() => doExecute(r)} />
                <ActBtn ic="x" title="Hủy lệnh" onClick={() => doCancel(r)} />
              </>
            ) : null}
          />
        </div>
      )}

      {/* Modal tạo lệnh chi hộ */}
      <ModalShell open={createOpen} onClose={() => setCreateOpen(false)} title="Tạo lệnh chi hộ hoàn tiền" sub="Chi tiền thừa qua TK Vietcombank BV → TK bệnh nhân" size="sm"
        footer={<>
          <Btn variant="ghost" onClick={() => setCreateOpen(false)}>Hủy</Btn>
          <Btn variant="primary" disabled={saving} onClick={doCreate}><TermIcon name="check" size={12} /> Tạo lệnh</Btn>
        </>}>
        <div style={{ padding: 'var(--space-18)', display: 'flex', flexDirection: 'column', gap: 'var(--space-10)' }}>
          <label style={{ display: 'block', fontSize: 11.5 }}>
            <span style={{ display: 'block', color: 'var(--t-2)', marginBottom: 'var(--space-3)' }}>ID bệnh nhân (patientId)</span>
            <input className="ed-fld mono" value={cform.patientId} onChange={(e) => setCform((p) => ({ ...p, patientId: e.target.value }))} placeholder="GUID bệnh nhân" autoFocus />
          </label>
          <label style={{ display: 'block', fontSize: 11.5 }}>
            <span style={{ display: 'block', color: 'var(--t-2)', marginBottom: 'var(--space-3)' }}>Số tiền chi hộ</span>
            <input type="number" className="ed-fld mono" style={{ textAlign: 'right' }} value={cform.amount} onChange={(e) => setCform((p) => ({ ...p, amount: e.target.value }))} placeholder="0" />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-8)' }}>
            <label style={{ display: 'block', fontSize: 11.5 }}>
              <span style={{ display: 'block', color: 'var(--t-2)', marginBottom: 'var(--space-3)' }}>Ngân hàng nhận</span>
              <select className="ed-fld" value={cform.bankBin} onChange={(e) => {
                const bin = e.target.value;
                const names: Record<string, string> = { '970436': 'Vietcombank', '970418': 'BIDV', '970405': 'Agribank', '970415': 'VietinBank', '970426': 'MSB' };
                setCform((p) => ({ ...p, bankBin: bin, bankName: names[bin] || bin }));
              }}>
                <option value="970436">Vietcombank</option>
                <option value="970418">BIDV</option>
                <option value="970405">Agribank</option>
                <option value="970415">VietinBank</option>
                <option value="970426">MSB</option>
              </select>
            </label>
            <label style={{ display: 'block', fontSize: 11.5 }}>
              <span style={{ display: 'block', color: 'var(--t-2)', marginBottom: 'var(--space-3)' }}>Số tài khoản</span>
              <input className="ed-fld mono" value={cform.accountNumber} onChange={(e) => setCform((p) => ({ ...p, accountNumber: e.target.value }))} />
            </label>
          </div>
          <label style={{ display: 'block', fontSize: 11.5 }}>
            <span style={{ display: 'block', color: 'var(--t-2)', marginBottom: 'var(--space-3)' }}>Chủ tài khoản</span>
            <input className="ed-fld" value={cform.accountHolder} onChange={(e) => setCform((p) => ({ ...p, accountHolder: e.target.value.toUpperCase() }))} placeholder="NGUYEN VAN A" />
          </label>
          <label style={{ display: 'block', fontSize: 11.5 }}>
            <span style={{ display: 'block', color: 'var(--t-2)', marginBottom: 'var(--space-3)' }}>Lý do</span>
            <textarea className="ed-fld" rows={2} value={cform.reason} onChange={(e) => setCform((p) => ({ ...p, reason: e.target.value }))} placeholder="Hoàn tiền thừa viện phí…" />
          </label>
        </div>
      </ModalShell>
    </div>
  );
};

export default QrPaymentCenter;
