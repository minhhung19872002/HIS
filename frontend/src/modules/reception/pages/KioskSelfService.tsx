// =====================================================================
// HIS Terminal · KIOSK TỰ PHỤC VỤ — v2
// BN tự cấp số, checkin bằng CCCD/thẻ BHYT, xem hàng chờ, QR thanh toán.
// Issues #103 #123 #124 #125 — route /v2/kiosk
// =====================================================================
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { fmtDate, fmtTime } from '../../../utils/format';
import { Input, Select, Spin, Alert, QRCode, Divider } from 'antd';
import {
  issueTicket, checkinByCard, getQueueStatus, callNext,
  type KioskTicketDto, type CheckinResultDto, type QueueStatusDto,
} from '../api/kiosk';
import { createKioskQr, getKioskQrStatus, type KioskQrResponse } from '../../billing/api/nangcap25';
import {
  KpiStrip, TopTabs, ActBtn, Btn, ModalShell, DrSec, DrField,
  StatusBadge, DataTable, tk, te,
  type ColumnDef,
} from '@/_v2kit';

// ── Constants ─────────────────────────────────────────────────────────────────

type TabKey = 'issue' | 'checkin' | 'queue' | 'payment';

const TABS: { v: TabKey; l: string; ic: string }[] = [
  { v: 'issue',   l: 'Lấy số thứ tự', ic: 'ticket'  },
  { v: 'checkin', l: 'Checkin thẻ',   ic: 'id-card' },
  { v: 'queue',   l: 'Hàng chờ',      ic: 'clock'   },
  { v: 'payment', l: 'Thanh toán QR', ic: 'qr'      },
];

const SERVICE_OPTIONS = [
  { value: 'OPD',      label: 'Khám ngoại trú' },
  { value: 'LAB',      label: 'Xét nghiệm' },
  { value: 'IMAGING',  label: 'Chẩn đoán hình ảnh' },
  { value: 'PHARMACY', label: 'Nhà thuốc' },
];

const STATUS_TONE: Record<number, 'ok' | 'warn' | 'info' | 'crit'> = {
  0: 'info',
  1: 'warn',
  2: 'ok',
  3: 'crit',
};

// ── Sub-component: màn kết quả sau khi cấp số ─────────────────────────────────

interface TicketResultProps {
  result: KioskTicketDto | CheckinResultDto;
  onClose: () => void;
}

const TicketResult: React.FC<TicketResultProps> = ({ result, onClose }) => {
  const ticket = 'ticket' in result ? result.ticket : result;
  const checkinResult = 'ticket' in result ? result as CheckinResultDto : null;

  return (
    <div style={{ textAlign: 'center', padding: '24px 16px' }}>
      {/* Số thứ tự — to, nổi bật */}
      <div style={{
        fontSize: 96,
        fontWeight: 900,
        lineHeight: 1,
        color: '#1677ff',
        letterSpacing: 4,
        margin: '0 0 8px',
      }}>
        {ticket.ticketNumber}
      </div>

      <div style={{ fontSize: 'var(--fs-xl)', color: '#555', marginBottom: 'var(--space-4)' }}>
        {ticket.departmentName || 'Tiếp đón chung'}
        {ticket.roomName && <> — {ticket.roomName}</>}
      </div>

      {ticket.patientName && (
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 'var(--space-4)' }}>
          {checkinResult?.maskedPatientName ?? ticket.patientName}
        </div>
      )}

      {checkinResult?.patientFound && (
        <span style={{ marginBottom: 'var(--space-8)', display: 'inline-block' }}>
          <StatusBadge tone="ok" dot>Đã nhận dạng BN trong hệ thống</StatusBadge>
        </span>
      )}

      {checkinResult?.insuranceWarning && (
        <Alert title={checkinResult.insuranceWarning} type="warning" showIcon style={{ marginBottom: 'var(--space-12)', textAlign: 'left' }} />
      )}

      {typeof ticket.peopleAheadInQueue === 'number' && (
        <div style={{ fontSize: 16, color: '#888', margin: '8px 0 16px' }}>
          Số người chờ trước bạn: <strong>{ticket.peopleAheadInQueue}</strong>
        </div>
      )}

      <div style={{ fontSize: 'var(--fs-md)', color: '#aaa', marginBottom: 'var(--space-20)' }}>
        Phát lúc {fmtTime(ticket.issuedAt)}
      </div>

      {/* QR thanh toán — reuse PaymentGateway endpoint nếu BN chọn dịch vụ có phí */}
      {ticket.serviceType && ticket.serviceType !== 'PHARMACY' && (
        <>
          <Divider>Thanh toán trước (tuỳ chọn)</Divider>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-12)' }}>
            {/* VietQR deeplink: BN quét bằng app ngân hàng.
                PaymentGatewayService (api/payment/create-url) cần access token — không dùng được từ
                kiosk AllowAnonymous. Hiển thị QR tĩnh hướng dẫn đến quầy thu ngân thay thế.
                Khi kiosk có tài khoản riêng hoặc token kiosk, thay bằng gọi createPaymentUrl(). */}
            <QRCode
              value={`his://payment?ticket=${ticket.id}&type=${ticket.serviceType}`}
              size={160}
              errorLevel="M"
            />
          </div>
          <div style={{ fontSize: 'var(--fs-md)', color: '#aaa' }}>
            Quét mã để thanh toán tại quầy hoặc qua app ngân hàng
          </div>
        </>
      )}

      <div style={{ marginTop: 'var(--space-24)' }}>
        <ActBtn ic="check" title="Xác nhận — Đóng" onClick={onClose} />
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const KioskSelfService: React.FC = () => {
  const [tab, setTab]         = useState<TabKey>('issue');
  const [loading, setLoading] = useState(false);
  const [queue, setQueue]     = useState<QueueStatusDto | null>(null);

  // Issue form
  const [deptId] = useState<string | undefined>();
  const [svcType, setSvcType] = useState<string>('OPD');
  const [pName, setPName]     = useState('');

  // Checkin form
  const [citizenId, setCitizenId]       = useState('');
  const [insCard, setInsCard]           = useState('');
  const [checkinDept] = useState<string | undefined>();
  const [checkinSvc, setCheckinSvc]     = useState<string>('OPD');

  // Result modal
  const [ticketResult, setTicketResult] = useState<KioskTicketDto | CheckinResultDto | null>(null);

  // NangCap25 — Thanh toán QR tại kiosk
  const [payCode, setPayCode] = useState('');
  const [payDob, setPayDob] = useState('');
  const [payResult, setPayResult] = useState<KioskQrResponse | null>(null);
  const [payPaid, setPayPaid] = useState(false);
  const payTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPayPoll = () => { if (payTimer.current) { clearInterval(payTimer.current); payTimer.current = null; } };

  const handlePayLookup = async () => {
    if (!payCode.trim() || !payDob) { te('Nhập mã bệnh nhân và ngày sinh.'); return; }
    setLoading(true);
    setPayPaid(false);
    stopPayPoll();
    try {
      const r = await createKioskQr(payCode.trim(), payDob);
      setPayResult(r);
      if (r.qr) {
        const txnId = r.qr.transactionId;
        payTimer.current = setInterval(async () => {
          try {
            const s = await getKioskQrStatus(txnId);
            if (s.status === 1) { setPayPaid(true); stopPayPoll(); tk('Thanh toán thành công!'); }
            if (s.status === 2 || s.status === 4) stopPayPoll();
          } catch { /* poll tolerant */ }
        }, 4000);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      te(e?.response?.data?.message || 'Không tra cứu được — kiểm tra mã BN và ngày sinh.');
      setPayResult(null);
    } finally { setLoading(false); }
  };

  const resetPayment = () => { stopPayPoll(); setPayResult(null); setPayPaid(false); setPayCode(''); setPayDob(''); };

  useEffect(() => stopPayPoll, []);

  // Queue refresh
  const queueTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadQueue = useCallback(async () => {
    try {
      setQueue(await getQueueStatus(undefined, undefined));
    } catch {
      // queue refresh lỗi thầm lặng — kiosk không cần toast mỗi 10s
    }
  }, []);

  useEffect(() => {
    if (tab === 'queue') {
      void loadQueue();
      queueTimer.current = setInterval(() => void loadQueue(), 10_000);
    }
    return () => {
      if (queueTimer.current) clearInterval(queueTimer.current);
    };
  }, [tab, loadQueue]);

  // ── Issue ticket ────────────────────────────────────────────────────────────

  const handleIssue = async () => {
    setLoading(true);
    try {
      const result = await issueTicket({ departmentId: deptId, serviceType: svcType, patientName: pName.trim() || undefined });
      setTicketResult(result);
      setPName('');
    } catch { te('Không thể cấp số — vui lòng thử lại.'); }
    finally { setLoading(false); }
  };

  // ── Checkin by card ─────────────────────────────────────────────────────────

  const handleCheckin = async () => {
    if (!citizenId.trim() && !insCard.trim()) {
      te('Vui lòng nhập CCCD hoặc số thẻ BHYT.');
      return;
    }
    setLoading(true);
    try {
      const result = await checkinByCard({
        citizenId:     citizenId.trim() || undefined,
        insuranceCard: insCard.trim()   || undefined,
        departmentId:  checkinDept,
        serviceType:   checkinSvc,
      });
      setTicketResult(result);
      setCitizenId(''); setInsCard('');
    } catch { te('Không thể checkin — vui lòng thử lại hoặc gặp nhân viên.'); }
    finally { setLoading(false); }
  };

  // ── Queue columns ───────────────────────────────────────────────────────────

  const queueCols: ColumnDef<KioskTicketDto>[] = [
    { key: 'ticketNumber', label: 'Số thứ tự', width: 120,
      render: r => <span style={{ fontSize: 24, fontWeight: 700, color: '#1677ff' }}>{r.ticketNumber}</span> },
    { key: 'patientName', label: 'Tên BN', render: r => r.patientName ?? <span style={{ color: '#bbb' }}>—</span> },
    { key: 'departmentName', label: 'Khoa', width: 180 },
    { key: 'status', label: 'Trạng thái', width: 140,
      render: r => <StatusBadge tone={STATUS_TONE[r.status] ?? 'info'} dot>{r.statusLabel}</StatusBadge> },
    { key: 'issuedAt', label: 'Giờ lấy số', width: 90,
      render: r => fmtTime(r.issuedAt) },
  ];

  // ── KPI strip ───────────────────────────────────────────────────────────────

  const kpis = [
    { lbl: 'Đang chờ', val: queue?.waitingCount ?? 0, tone: 'warn' as const },
    { lbl: 'Đang gọi', val: queue?.currentCalledTicket ?? '—', tone: 'ok' as const },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="ab-module" style={{ maxWidth: 860, margin: '0 auto' }}>

      {/* Header — to, dễ đọc trên màn kiosk */}
      <div className="ab-header">
        <h1 className="ab-title" style={{ fontSize: 28, letterSpacing: 1 }}>
          Kiosk Tự Phục Vụ
        </h1>
        <div className="ab-actions">
          <ActBtn ic="refresh" title="Làm mới" onClick={loadQueue} />
        </div>
      </div>

      <KpiStrip items={kpis} />

      <TopTabs<TabKey> tabs={TABS} tab={tab} setTab={t => setTab(t)} />

      {/* ── Tab: Lấy số thứ tự ──────────────────────────────────────────── */}
      {tab === 'issue' && (
        <div style={{ padding: '32px 24px' }}>
          <DrSec title="Chọn dịch vụ">
            <DrField lbl="Loại dịch vụ">
              <Select
                value={svcType}
                onChange={v => setSvcType(v)}
                options={SERVICE_OPTIONS}
                style={{ width: '100%', height: 52, fontSize: 18 }}
                size="large"
              />
            </DrField>

            <DrField lbl="Tên (không bắt buộc)">
              <Input
                value={pName}
                onChange={e => setPName(e.target.value)}
                placeholder="Nhập tên để hiển thị trên phiếu..."
                size="large"
                style={{ height: 52, fontSize: 18 }}
                onPressEnter={handleIssue}
              />
            </DrField>
          </DrSec>

          <div style={{ marginTop: 'var(--space-32)', textAlign: 'center' }}>
            <Btn
              variant="primary"
              icon="ticket"
              onClick={handleIssue}
              loading={loading}
              style={{ height: 72, fontSize: 22, padding: '0 60px', borderRadius: 'var(--r-4)' }}
            >LẤY SỐ THỨ TỰ</Btn>
          </div>
        </div>
      )}

      {/* ── Tab: Checkin thẻ ────────────────────────────────────────────── */}
      {tab === 'checkin' && (
        <div style={{ padding: '32px 24px' }}>
          <DrSec title="Quét hoặc nhập số thẻ">
            <DrField lbl="Số CCCD / CMND">
              <Input
                value={citizenId}
                onChange={e => setCitizenId(e.target.value)}
                placeholder="Nhập hoặc quét CCCD..."
                size="large"
                style={{ height: 52, fontSize: 18, letterSpacing: 2 }}
                maxLength={12}
                allowClear
                onPressEnter={handleCheckin}
              />
            </DrField>

            <DrField lbl="Số thẻ BHYT">
              <Input
                value={insCard}
                onChange={e => setInsCard(e.target.value)}
                placeholder="Nhập hoặc quét thẻ BHYT..."
                size="large"
                style={{ height: 52, fontSize: 18, letterSpacing: 2 }}
                maxLength={15}
                allowClear
                onPressEnter={handleCheckin}
              />
            </DrField>

            <DrField lbl="Dịch vụ">
              <Select
                value={checkinSvc}
                onChange={v => setCheckinSvc(v)}
                options={SERVICE_OPTIONS}
                style={{ width: '100%', height: 52, fontSize: 18 }}
                size="large"
              />
            </DrField>
          </DrSec>

          {loading && (
            <div style={{ textAlign: 'center', margin: '24px 0' }}>
              <Spin size="large" tip="Đang tra cứu..." />
            </div>
          )}

          <div style={{ marginTop: 'var(--space-32)', textAlign: 'center' }}>
            <Btn
              variant="primary"
              icon="id-card"
              onClick={handleCheckin}
              loading={loading}
              style={{ height: 72, fontSize: 22, padding: '0 60px', borderRadius: 'var(--r-4)' }}
            >CHECKIN</Btn>
          </div>

          <div style={{ marginTop: 'var(--space-16)', textAlign: 'center', color: '#aaa', fontSize: 'var(--fs-md)' }}>
            Nếu không có thẻ, hãy chuyển sang tab <strong>Lấy số thứ tự</strong>
          </div>
        </div>
      )}

      {/* ── Tab: Hàng chờ ───────────────────────────────────────────────── */}
      {tab === 'queue' && (
        <div style={{ padding: '16px 0' }}>
          {queue?.currentCalledTicket && (
            <div style={{
              background: '#f6ffed',
              border: '1px solid #b7eb8f',
              borderRadius: 'var(--r-3)',
              padding: '16px 24px',
              marginBottom: 'var(--space-16)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 14, color: '#52c41a', marginBottom: 'var(--space-4)' }}>Đang gọi số</div>
              <div style={{ fontSize: 56, fontWeight: 900, color: '#389e0d', letterSpacing: 4 }}>
                {queue.currentCalledTicket}
              </div>
            </div>
          )}

          <DataTable<KioskTicketDto>
            columns={queueCols}
            data={queue?.waitingTickets ?? []}
            rowKey={r => r.id}
          />

          {queue?.waitingCount === 0 && (
            <div style={{ textAlign: 'center', color: '#bbb', padding: 'var(--space-32)', fontSize: 18 }}>
              Hàng chờ rỗng
            </div>
          )}

          <div style={{ marginTop: 'var(--space-16)', display: 'flex', gap: 'var(--space-12)', justifyContent: 'flex-end' }}>
            <ActBtn ic="phone" title="Gọi số tiếp theo" onClick={async () => {
              try {
                const r = await callNext({});
                if (r && 'ticketNumber' in r) {
                  tk(`Đã gọi số ${(r as KioskTicketDto).ticketNumber}`);
                  void loadQueue();
                } else {
                  tk('Hàng chờ rỗng');
                }
              } catch { te('Không thể gọi số.'); }
            }} />
          </div>
        </div>
      )}

      {/* ── Tab: Thanh toán QR (NangCap25) ─────────────────────────────── */}
      {tab === 'payment' && (
        <div style={{ padding: '32px 24px' }}>
          {!payResult && (
            <>
              <DrSec title="Tra cứu khoản chờ thanh toán">
                <DrField lbl="Mã bệnh nhân">
                  <Input
                    value={payCode}
                    onChange={e => setPayCode(e.target.value)}
                    placeholder="VD: BN000123..."
                    size="large"
                    style={{ height: 52, fontSize: 18, letterSpacing: 1 }}
                    allowClear
                  />
                </DrField>
                <DrField lbl="Ngày sinh">
                  <Input
                    type="date"
                    value={payDob}
                    onChange={e => setPayDob(e.target.value)}
                    size="large"
                    style={{ height: 52, fontSize: 18 }}
                    onPressEnter={handlePayLookup}
                  />
                </DrField>
              </DrSec>
              <div style={{ marginTop: 'var(--space-32)', textAlign: 'center' }}>
                <Btn variant="primary" icon="qr" onClick={handlePayLookup} loading={loading}
                  style={{ height: 72, fontSize: 22, padding: '0 60px', borderRadius: 'var(--r-4)' }}>
                  TRA CỨU & TẠO MÃ QR
                </Btn>
              </div>
            </>
          )}

          {payResult && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 'var(--space-4)' }}>{payResult.patientName}</div>
              <div style={{ color: '#888', marginBottom: 'var(--space-12)' }}>Mã BN: {payResult.patientCode}</div>

              {payPaid ? (
                <>
                  <div style={{ fontSize: 64 }}>✅</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#389e0d', margin: '8px 0 16px' }}>THANH TOÁN THÀNH CÔNG</div>
                  <div style={{ color: '#888', marginBottom: 'var(--space-16)' }}>Mời bạn đến phòng thực hiện dịch vụ.</div>
                </>
              ) : payResult.totalAmount <= 0 ? (
                <Alert title="Bạn không có khoản nào chờ thanh toán." type="success" showIcon style={{ margin: '16px 0' }} />
              ) : (
                <>
                  <div style={{ fontSize: 15, color: '#888' }}>Tổng cần thanh toán ({payResult.pendingCount} chỉ định)</div>
                  <div style={{ fontSize: 40, fontWeight: 900, color: '#1677ff', margin: '4px 0 12px' }}>
                    {payResult.totalAmount.toLocaleString('vi-VN')} đ
                  </div>
                  {payResult.qr && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-8)' }}>
                        <QRCode value={payResult.qr.qrCodeContent || payResult.qr.paymentUrl} size={220} errorLevel="M" />
                      </div>
                      <div style={{ color: '#888', fontSize: 15, marginBottom: 'var(--space-8)' }}>
                        Quét mã bằng app ngân hàng bất kỳ · Mã GD: {payResult.qr.txnRef}
                      </div>
                      <div style={{ color: '#aaa', fontSize: 13 }}>
                        <Spin size="small" /> Đang chờ thanh toán — màn hình tự cập nhật
                      </div>
                    </>
                  )}
                  <Divider />
                  <div style={{ maxHeight: 180, overflow: 'auto', textAlign: 'left', margin: '0 auto', maxWidth: 480 }}>
                    {payResult.items.map(it => (
                      <div key={it.serviceRequestId} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 4px', borderBottom: '1px solid #f0f0f0', fontSize: 14 }}>
                        <span>{it.requestCode} · {fmtDate(it.requestDate)}</span>
                        <b>{it.amount.toLocaleString('vi-VN')} đ</b>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div style={{ marginTop: 'var(--space-24)' }}>
                <Btn variant="ghost" icon="refresh" onClick={resetPayment} style={{ height: 48, fontSize: 16, padding: '0 32px' }}>
                  Tra cứu bệnh nhân khác
                </Btn>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modal kết quả phiếu số ───────────────────────────────────────── */}
      <ModalShell
        open={ticketResult !== null}
        onClose={() => setTicketResult(null)}
        title="Phiếu số của bạn"
        size="sm"
        footer={null}
      >
        {ticketResult && (
          <TicketResult result={ticketResult} onClose={() => setTicketResult(null)} />
        )}
      </ModalShell>
    </div>
  );
};

export default KioskSelfService;
