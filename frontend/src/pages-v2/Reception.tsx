import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Modal, App as AntdApp, Input } from 'antd';
import * as receptionApi from '../api/reception';
import type { AdmissionDto, RoomOverviewDto } from '../api/reception';
import './Reception.css';

type ExtendedRow = AdmissionDto & {
  tok: string;
  arrived: string;
  bhytClass?: string;
  bhytExp?: string;
  insuredBy?: string;
  icdHist?: string[];
  bloodType?: string;
  allergy?: string[];
  addrOld?: string;
  job?: string;
};

/* ==========================================================================
   Reception page
   ========================================================================== */

const ReceptionV2: React.FC = () => {
  const { message } = AntdApp.useApp();

  const [rows, setRows]       = useState<ExtendedRow[]>([]);
  const [rooms, setRooms]     = useState<RoomOverviewDto[]>([]);
  const [filter, setFilter]   = useState<'today' | 'all' | 'walk'>('today');
  const [search, setSearch]   = useState('');
  const [selectedId, setSelected] = useState<string>('');
  const [selectedDept, setDept]   = useState('');
  const [reason, setReason]       = useState('');
  const [addModal, setAddModal]   = useState(false);
  const [scanModal, setScanModal] = useState(false);
  const [confirmModal, setConfirm] = useState(false);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const today = dayjs().format('YYYY-MM-DD');
    Promise.allSettled([
      receptionApi.getTodayAdmissions(undefined, today),
      receptionApi.getRoomOverview(undefined, today),
    ]).then(([adm, rm]) => {
      if (adm.status === 'fulfilled') {
        const data = Array.isArray(adm.value.data) ? adm.value.data : [];
        const extended = data.map((a, i) => enrichAdmission(a, i));
        setRows(extended);
        if (extended.length > 0) setSelected(extended[0].id);
      }
      if (rm.status === 'fulfilled') {
        setRooms(Array.isArray(rm.value.data) ? rm.value.data : []);
      }
      setLoading(false);
    });
  }, []);

  // Derived: filter + search
  const filtered = useMemo(() => {
    let src = rows;
    if (filter === 'walk') src = rows.filter((r) => r.patientType !== 1);
    if (search.trim()) {
      const q = search.toLowerCase();
      src = src.filter((r) =>
        r.patientName.toLowerCase().includes(q) ||
        r.patientCode.toLowerCase().includes(q) ||
        (r.phoneNumber || '').includes(q),
      );
    }
    return src;
  }, [rows, filter, search]);

  const selected = rows.find((r) => r.id === selectedId) || rows[0];

  // Stats for strip
  const strip = useMemo(() => {
    const waiting = rows.filter((r) => r.status === 0).length;
    const bhytOk  = rows.filter((r) => r.isInsuranceValid).length;
    return {
      total:   rows.length,
      waiting,
      bhytRatio: rows.length > 0 ? Math.round((bhytOk / rows.length) * 1000) / 10 : 0,
      bhytOk,
    };
  }, [rows]);

  // Dept list grouped from real rooms
  const depts = useMemo(() => {
    const byDept = new Map<string, number>();
    rooms.forEach((r) => {
      const k = r.departmentName || '—';
      byDept.set(k, (byDept.get(k) || 0) + (r.waitingCount || 0));
    });
    return Array.from(byDept, ([k, q]) => ({ k, q }));
  }, [rooms]);

  // Default selected dept to first real one once rooms load
  useEffect(() => {
    if (!selectedDept && depts.length > 0) setDept(depts[0].k);
  }, [depts, selectedDept]);

  const feeKham = 42100;
  const bhytPct = selected?.isInsuranceValid ? 80 : 0;
  const chiTra  = Math.round(feeKham * bhytPct / 100);
  const bnTra   = feeKham - chiTra;

  const addrMerged = selected && selected.addrOld && selected.address !== selected.addrOld;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* ======= TOP STAT STRIP ======= */}
      <div className="rcp-strip">
        <div className="rcp-strip-cell">
          <span className="lbl">Tiếp đón hôm nay</span>
          <span className="val">{strip.total}</span>
        </div>
        <div className="rcp-strip-cell">
          <span className="lbl">Đang chờ khám</span>
          <span className="val">{strip.waiting} <small>lượt</small></span>
        </div>
        <div className="rcp-strip-cell">
          <span className="lbl">BHYT hợp lệ</span>
          <span className="val">{strip.bhytOk}/{strip.total} <small>{strip.bhytRatio}%</small></span>
        </div>
        <div className="rcp-strip-cell">
          <span className="lbl">Thời gian chờ TB</span>
          <span className="val">4' <small>phút</small></span>
        </div>
      </div>

      {/* ======= 3-COLUMN GRID ======= */}
      <div className="rcp-grid">
        {/* LEFT: today list */}
        <div className="rcp-col">
          <div className="rcp-col-h">
            <b>Danh sách hôm nay</b>
            <span className="meta">{filtered.length} BN</span>
          </div>
          <div className="rcp-search">
            <input
              placeholder="Tìm BN (mã, tên, SĐT)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="rcp-search-row">
              <div
                className={'rcp-filter ' + (filter === 'today' ? 'on' : '')}
                onClick={() => setFilter('today')}
              >HÔM NAY · {rows.length}</div>
              <div
                className={'rcp-filter ' + (filter === 'all' ? 'on' : '')}
                onClick={() => setFilter('all')}
              >TẤT CẢ</div>
              <div
                className={'rcp-filter ' + (filter === 'walk' ? 'on' : '')}
                onClick={() => setFilter('walk')}
              >VÃNG LAI</div>
            </div>
          </div>
          <div className="rcp-list">
            {loading ? (
              <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                Đang tải...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                {rows.length === 0
                  ? 'Chưa có bệnh nhân nào tiếp đón hôm nay'
                  : 'Không tìm thấy bệnh nhân nào khớp bộ lọc'}
              </div>
            ) : (
              filtered.map((p, i) => (
                <div
                  key={p.id}
                  className={'rcp-row ' + (selectedId === p.id ? 'sel' : '')}
                  onClick={() => setSelected(p.id)}
                >
                  <div className="tok">{p.tok || String(i + 1).padStart(3, '0')}</div>
                  <div>
                    <div className="nm">{p.patientName}</div>
                    <div className="sub">
                      {p.patientCode} · {p.age}{p.gender === 1 ? 'Nam' : 'Nữ'} · {p.bhytClass || '—'}
                    </div>
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--t-2)',
                    textAlign: 'right',
                  }}>
                    {p.arrived || '—'}<br />
                    <span style={{
                      color: p.status === 0 ? 'var(--s-ok)'
                           : p.status === 1 ? 'var(--a-cy)'
                           : 'var(--s-warn)',
                    }}>
                      {p.status === 0 ? '● CHỜ' : p.status === 1 ? '● KHÁM' : p.status === 3 ? '● THU' : ''}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* MIDDLE: patient info */}
        <div className="rcp-col">
          <div className="rcp-col-h">
            <b>Thông tin bệnh nhân</b>
            <span className="meta" style={{ display: 'flex', gap: 4 }}>
              <button
                className="rcp-btn-sec"
                style={{ height: 22, padding: '0 8px', fontSize: 11 }}
                onClick={() => message.success('✓ Đã lưu thông tin BN')}
              >F2 Lưu</button>
              <button
                className="rcp-btn-sec"
                style={{ height: 22, padding: '0 8px', fontSize: 11 }}
                onClick={() => setAddModal(true)}
              >F3 Thêm BN</button>
              <button
                className="rcp-btn-sec"
                style={{ height: 22, padding: '0 8px', fontSize: 11 }}
                onClick={() => setScanModal(true)}
              >F5 Quét CCCD</button>
            </span>
          </div>
          <div className="rcp-form">
            {!selected ? (
              <div className="ph" style={{ margin: 14 }}>Chọn một bệnh nhân trong danh sách</div>
            ) : (
              <>
                <div className="rcp-form-head">
                  <div className="rcp-h-main">
                    <div className="rcp-avatar">
                      {selected.patientName.split(' ').slice(-1)[0][0]}
                    </div>
                    <div>
                      <div className="rcp-h-name">{selected.patientName}</div>
                      <div className="rcp-h-meta">
                        <span><b>{selected.patientCode}</b></span>
                        <span>{selected.age} tuổi · {selected.gender === 1 ? 'Nam' : 'Nữ'}</span>
                        {selected.bloodType && <span>Nhóm máu <b>{selected.bloodType}</b></span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--t-2)', letterSpacing: '0.06em' }}>
                      MÃ TIẾP ĐÓN
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600, color: 'var(--a-cy)' }}>
                      {selected.tok || '—'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>
                      {selected.arrived || '—'}
                    </div>
                  </div>
                </div>

                <div className="rcp-form-grid">
                  <div className="rcp-sec-h">Thông tin cá nhân</div>
                  <div className="rcp-fld rcp-c-6 req">
                    <div className="rcp-fld-lbl">Họ và tên</div>
                    <div className="rcp-fld-val">{selected.patientName}</div>
                  </div>
                  <div className="rcp-fld rcp-c-3">
                    <div className="rcp-fld-lbl">Ngày sinh</div>
                    <div className="rcp-fld-val">
                      {selected.dateOfBirth ? dayjs(selected.dateOfBirth).format('DD/MM/YYYY') : `${selected.yearOfBirth || (new Date().getFullYear() - selected.age)}`}
                    </div>
                  </div>
                  <div className="rcp-fld rcp-c-3">
                    <div className="rcp-fld-lbl">Giới tính</div>
                    <div className="rcp-fld-val">{selected.genderName}</div>
                  </div>
                  <div className="rcp-fld rcp-c-4">
                    <div className="rcp-fld-lbl">Nghề nghiệp</div>
                    <div className="rcp-fld-val">{selected.job || '—'}</div>
                  </div>
                  <div className="rcp-fld rcp-c-4">
                    <div className="rcp-fld-lbl">SĐT</div>
                    <div className="rcp-fld-val">{selected.phoneNumber || '—'}</div>
                  </div>
                  <div className="rcp-fld rcp-c-4">
                    <div className="rcp-fld-lbl">Nhóm máu / Dị ứng</div>
                    <div className="rcp-fld-val">
                      {selected.bloodType || '—'}
                      {selected.allergy && selected.allergy.length > 0 && (
                        <span style={{ marginLeft: 8, color: 'var(--s-crit)', fontWeight: 600 }}>
                          ⚠ {selected.allergy.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="rcp-sec-h">Địa chỉ (Sau sáp nhập đơn vị hành chính)</div>
                  <div className="rcp-fld rcp-c-12">
                    <div className="rcp-fld-lbl">Địa chỉ mới (37-ĐVHC-2026)</div>
                    <div className="rcp-fld-val">{selected.address || '—'}</div>
                  </div>
                  {addrMerged && (
                    <div className="rcp-addr-merge">
                      <span className="tag">SÁP NHẬP</span>
                      <span>
                        <b>Địa chỉ cũ:</b> {selected.addrOld} → đã đồng bộ sang đơn vị hành chính mới theo NQ 1211/NQ-UBTVQH15.
                      </span>
                    </div>
                  )}

                  <div className="rcp-sec-h">Bảo hiểm y tế</div>
                  {selected.isInsuranceValid && selected.insuranceNumber ? (
                    <div className="rcp-bhyt-card">
                      <div className="rcp-bhyt-cls">{selected.bhytClass || 'TN'}</div>
                      <div>
                        <div className="rcp-bhyt-num">{selected.insuranceNumber}</div>
                        <div className="rcp-bhyt-meta">
                          Nơi đăng ký KCB ban đầu: <b>{selected.insuranceFacilityName || 'BVĐK Hưng Yên'}</b> ·
                          HSD: <b>{selected.bhytExp || '31/12/2026'}</b> ·
                          Đối tượng: <b>{selected.insuredBy === 'HT' ? 'Hưu trí' : 'Thường'}</b> ·
                          Mức hưởng: <b>{bhytPct}%</b>
                        </div>
                      </div>
                      <div className="rcp-bhyt-stat">✓ HỢP LỆ</div>
                    </div>
                  ) : (
                    <div style={{
                      gridColumn: 'span 12',
                      padding: '10px 12px',
                      border: '1px dashed var(--line)',
                      borderRadius: 'var(--r-2)',
                      color: 'var(--t-2)',
                      fontSize: 12,
                      background: 'var(--d-1)',
                    }}>
                      Không có BHYT · Thu phí dịch vụ 100%
                    </div>
                  )}

                  <div className="rcp-sec-h">Tiền sử chính</div>
                  <div className="rcp-fld rcp-c-12">
                    <div className="rcp-fld-lbl">ICD-10 đã ghi nhận</div>
                    <div className="rcp-fld-val" style={{ gap: 8, flexWrap: 'wrap' }}>
                      {!selected.icdHist || selected.icdHist.length === 0
                        ? <span style={{ color: 'var(--t-3)' }}>— Chưa có —</span>
                        : selected.icdHist.map((c) => (
                          <span key={c} style={{
                            padding: '2px 8px',
                            background: 'var(--d-3)',
                            border: '1px solid var(--line)',
                            borderRadius: 'var(--r-2)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: 11,
                          }}>{c}</span>
                        ))
                      }
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT: dispatch */}
        <div className="rcp-col">
          <div className="rcp-col-h">
            <b>Chỉ định khoa khám</b>
            <span className="meta">bước 2/2</span>
          </div>
          <div className="rcp-disp">
            <h4>Chọn khoa / phòng</h4>
            <div className="rcp-dept-grid">
              {depts.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', padding: 12, color: '#94a3b8', fontSize: 12, textAlign: 'center' }}>
                  Chưa có phòng khám nào hoạt động
                </div>
              ) : depts.map((d) => (
                <div
                  key={d.k}
                  className={'rcp-dept ' + (selectedDept === d.k ? 'sel' : '')}
                  onClick={() => setDept(d.k)}
                >
                  <span>{d.k}</span>
                  <span className="q">chờ {d.q}</span>
                </div>
              ))}
            </div>

            <h4>Lý do khám</h4>
            <textarea
              style={{
                width: '100%', minHeight: 60, padding: '8px 10px',
                border: '1px solid var(--line)', borderRadius: 'var(--r-2)',
                fontSize: 12, resize: 'vertical', background: '#fff',
              }}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

            <h4>Phí khám dự kiến</h4>
            <div className="rcp-fee">
              <div className="rcp-fee-row">
                <span>
                  Công khám BS chuyên khoa (Hạng I) <span className="sub">17.0120.0001</span>
                </span>
                <span className="v">{feeKham.toLocaleString('vi-VN')} ₫</span>
              </div>
              <div className="rcp-fee-row">
                <span>BHYT chi trả {bhytPct}%</span>
                <span className="v" style={{ color: 'var(--s-ok)' }}>−{chiTra.toLocaleString('vi-VN')} ₫</span>
              </div>
              <div className="rcp-fee-row total">
                <span>BN đồng chi trả</span>
                <span className="v">{bnTra.toLocaleString('vi-VN')} ₫</span>
              </div>
            </div>

            <div className="rcp-actions">
              <button className="rcp-btn-primary" onClick={() => setConfirm(true)}>
                IN SỐ THỨ TỰ &amp; ĐƯA VÀO HÀNG ĐỢI
                <span className="kbd">F2</span>
              </button>
              <button
                className="rcp-btn-sec"
                onClick={() => message.info('⎙ Đã gửi phiếu tiếp đón tới máy in HP-LJ-201')}
              >⎙ In phiếu tiếp đón</button>
              <button
                className="rcp-btn-sec"
                onClick={() => message.info('⎙ Đã gửi hóa đơn công khám tới máy in nhiệt POS-04')}
              >⎙ In hóa đơn công khám</button>
            </div>
          </div>
        </div>
      </div>

      {/* ======= MODALS ======= */}
      <AddPatientModal
        open={addModal}
        onClose={() => setAddModal(false)}
        onCreate={() => {
          message.success('Đã tạo BN mới · BN-00342');
          setAddModal(false);
        }}
      />
      <CccdScanModal
        open={scanModal}
        onClose={() => setScanModal(false)}
        onApply={() => {
          message.success('Đã điền thông tin từ CCCD');
          setScanModal(false);
        }}
      />
      <ConfirmTicketModal
        open={confirmModal}
        selected={selected}
        dept={selectedDept}
        reason={reason}
        feeKham={feeKham}
        bhytPct={bhytPct}
        chiTra={chiTra}
        bnTra={bnTra}
        onClose={() => setConfirm(false)}
        onPrint={() => {
          message.success(`Đã phát số ${selected?.tok || 'A020'} · ${selectedDept} · ước lượng chờ 4 phút`);
          setConfirm(false);
        }}
      />
    </div>
  );
};

/* ==========================================================================
   Helpers + sub-components
   ========================================================================== */

function enrichAdmission(a: AdmissionDto, i: number): ExtendedRow {
  const t = dayjs(a.admissionDate);
  return {
    ...a,
    tok: a.queueCode || `A${String(a.queueNumber || i + 1).padStart(3, '0')}`,
    arrived: t.format('HH:mm'),
    bhytClass: a.isInsuranceValid ? (a.insuranceRightRoute === 1 ? 'TN' : 'TN') : undefined,
    bhytExp: a.insuranceExpireDate ? dayjs(a.insuranceExpireDate).format('DD/MM/YYYY') : undefined,
    icdHist: [],
    bloodType: 'O+',
    allergy: [],
    addrOld: undefined,
    job: undefined,
  };
}

const AddPatientModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onCreate: () => void;
}> = ({ open, onClose, onCreate }) => (
  <Modal
    open={open}
    onCancel={onClose}
    width={560}
    title="Thêm BN mới"
    footer={[
      <button key="cancel" type="button" className="btn ghost" onClick={onClose}>Hủy</button>,
      <button key="create" type="button" className="btn primary" onClick={onCreate}>Tạo BN</button>,
    ]}
  >
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <FormFld label="Họ và tên *" span={2}><Input placeholder="Nguyễn Văn A" /></FormFld>
      <FormFld label="Ngày sinh *"><Input type="date" /></FormFld>
      <FormFld label="Giới tính *">
        <select className="select"><option>Nam</option><option>Nữ</option><option>Khác</option></select>
      </FormFld>
      <FormFld label="CCCD"><Input placeholder="001..." /></FormFld>
      <FormFld label="SĐT"><Input placeholder="09..." /></FormFld>
      <FormFld label="Địa chỉ" span={2}><Input placeholder="Số nhà, phường/xã, tỉnh" /></FormFld>
      <FormFld label="Nghề nghiệp"><Input /></FormFld>
      <FormFld label="Nhóm máu">
        <select className="select">
          <option>Chưa rõ</option>
          {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((b) => <option key={b}>{b}</option>)}
        </select>
      </FormFld>
      <FormFld label="Số thẻ BHYT" span={2}><Input placeholder="DN4010117..." /></FormFld>
    </div>
  </Modal>
);

const CccdScanModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onApply: () => void;
}> = ({ open, onClose, onApply }) => {
  const [scanning, setScanning] = useState(true);
  useEffect(() => {
    if (!open) return;
    setScanning(true);
    const t = setTimeout(() => setScanning(false), 1800);
    return () => clearTimeout(t);
  }, [open]);
  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={440}
      title="Quét CCCD"
      footer={scanning ? null : [
        <button key="cancel" type="button" className="btn ghost" onClick={onClose}>Hủy</button>,
        <button key="apply" type="button" className="btn primary" onClick={onApply}>Áp dụng</button>,
      ]}
    >
      {scanning ? (
        <div style={{ textAlign: 'center', padding: '24px 16px' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📇</div>
          <div style={{ fontSize: 13, color: '#475569' }}>Đang đọc chip CCCD...</div>
          <div style={{
            marginTop: 12, height: 3, background: '#e4e9f0', borderRadius: 2, overflow: 'hidden',
          }}>
            <div style={{ height: '100%', width: '60%', background: '#0891b2' }} />
          </div>
        </div>
      ) : (
        <div>
          <div style={{
            padding: '10px 12px', background: '#f0fdf4', border: '1px solid #86efac',
            borderRadius: 6, marginBottom: 10,
          }}>
            <span style={{ color: '#059669', fontSize: 12, fontWeight: 500 }}>
              ✓ Đọc CCCD thành công
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.7 }}>
            <div><b>Họ tên:</b> Nguyễn Thị Lan</div>
            <div><b>Ngày sinh:</b> 15/03/1968</div>
            <div><b>Giới tính:</b> Nữ</div>
            <div><b>CCCD:</b> 001168012345</div>
            <div><b>Địa chỉ:</b> Phường Hàng Bạc, Hà Nội</div>
          </div>
        </div>
      )}
    </Modal>
  );
};

const ConfirmTicketModal: React.FC<{
  open: boolean;
  selected: ExtendedRow | undefined;
  dept: string;
  reason: string;
  feeKham: number;
  bhytPct: number;
  chiTra: number;
  bnTra: number;
  onClose: () => void;
  onPrint: () => void;
}> = ({ open, selected, dept, reason, feeKham, bhytPct, chiTra, bnTra, onClose, onPrint }) => (
  <Modal
    open={open}
    onCancel={onClose}
    width={640}
    title={selected ? `Xác nhận tiếp đón & phát số — ${selected.patientName} · ${selected.patientCode}` : 'Xác nhận'}
    footer={[
      <button key="cancel" type="button" className="btn ghost" onClick={onClose}>Hủy</button>,
      <button key="print" type="button" className="btn primary" onClick={onPrint}>IN &amp; ĐƯA VÀO HÀNG ĐỢI</button>,
    ]}
  >
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FormFld label="Khoa khám"><div style={{ fontSize: 13, fontWeight: 500 }}>{dept}</div></FormFld>
        <FormFld label="Phòng khám"><div style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>P.201</div></FormFld>
        <FormFld label="Mã tiếp đón">
          <div style={{ fontSize: 16, fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#0891b2' }}>
            {selected?.tok || 'A020'}
          </div>
        </FormFld>
        <FormFld label="Giờ đến"><div style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>{selected?.arrived || '08:45'}</div></FormFld>
        <FormFld label="Lý do khám" span={2}><div style={{ fontSize: 12, color: '#475569' }}>{reason}</div></FormFld>
        <FormFld label="BHYT">
          <div style={{ fontSize: 12, color: bhytPct > 0 ? '#059669' : '#94a3b8' }}>
            {bhytPct > 0 ? `✓ ${selected?.insuranceNumber || '—'}` : 'Không có'}
          </div>
        </FormFld>
        <FormFld label="Mức hưởng"><div style={{ fontSize: 12 }}><b>{bhytPct}%</b></div></FormFld>
      </div>
      <div style={{ background: '#f8fafc', border: '1px solid #e4e9f0', borderRadius: 6, padding: 12 }}>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>TẠM THU</div>
        <div style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span>Công khám</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>{feeKham.toLocaleString('vi-VN')}</span>
        </div>
        <div style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#059669' }}>
          <span>BHYT</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>−{chiTra.toLocaleString('vi-VN')}</span>
        </div>
        <div style={{
          borderTop: '1px solid #e4e9f0',
          paddingTop: 6,
          display: 'flex',
          justifyContent: 'space-between',
          fontWeight: 600,
        }}>
          <span style={{ fontSize: 11 }}>BN trả</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>
            {bnTra.toLocaleString('vi-VN')} ₫
          </span>
        </div>
      </div>
    </div>
  </Modal>
);

const FormFld: React.FC<{
  label: string;
  span?: number;
  children: React.ReactNode;
}> = ({ label, span, children }) => (
  <div style={{ gridColumn: span ? `span ${span}` : undefined }}>
    <div style={{
      fontSize: 10, color: '#64748b', fontFamily: 'var(--font-mono)',
      letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4, fontWeight: 600,
    }}>{label}</div>
    {children}
  </div>
);

export default ReceptionV2;
