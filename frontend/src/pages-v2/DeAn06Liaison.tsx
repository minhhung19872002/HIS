import React, { useCallback, useEffect, useState } from 'react';
import {
  KpiStrip, TopTabs, DataTable, StatusBadge,
  DrawerShell, ActBtn, DrSec, DrField,
  type ColumnDef, type TopTab, type KpiItem, type StatusTone,
  tk, te, fmtDTg, fmtDMYg
} from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';
import {
  deAn06,
  type BirthCertificateDto,
  type DeathCertificateDto,
  type DrivingLicenseHealthCheckDto
} from '../api/nangcap23';

type Kind = 'birth' | 'death' | 'dlhc';
type TabKey = 'birth' | 'death' | 'driver';
const TOP_TABS: TopTab<TabKey>[] = [
  { v: 'birth',  l: 'Giấy chứng sinh', ic: 'heart' },
  { v: 'death',  l: 'Giấy báo tử',     ic: 'folder' },
  { v: 'driver', l: 'KSK lái xe',      ic: 'receipt' },
];

const DA06_STATUS: { v: number; l: string; tone: StatusTone }[] = [
  { v: 0, l: 'Chưa gửi',      tone: 'warn' },
  { v: 1, l: 'Đang xử lý',    tone: 'info' },
  { v: 2, l: 'Cổng xác nhận', tone: 'ok'   },
  { v: 3, l: 'Lỗi',           tone: 'crit' },
];
const da06Tone = (s: number): StatusTone => DA06_STATUS.find((x) => x.v === s)?.tone || 'info';
const da06Label = (s: number): string => DA06_STATUS.find((x) => x.v === s)?.l || '—';

const DeAn06LiaisonV2: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('birth');
  return (
    <div className="ab" data-testid="de-an-06-page">
      <TopTabs<TabKey> tab={tab} setTab={setTab} tabs={TOP_TABS} />
      {tab === 'birth'  && <BirthTab />}
      {tab === 'death'  && <DeathTab />}
      {tab === 'driver' && <DlhcTab />}
    </div>
  );
};

// ────────────────────────── Birth ──────────────────────────

const BirthTab: React.FC = () => {
  const [rows, setRows] = useState<BirthCertificateDto[]>([]);
  const [detail, setDetail] = useState<BirthCertificateDto | null>(null);

  const load = useCallback(async () => {
    try { setRows(await deAn06.searchBirths({ pageSize: 200 }) || []); }
    catch { te('Không tải được'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async (r: BirthCertificateDto) => {
    try {
      await deAn06.submitBirth(r.id);
      tk(`Đã gửi lên cổng Đề án 06 — ${r.certificateNumber}`);
      load();
      setDetail(null);
    } catch { te('Gửi cổng thất bại'); }
  };

  const kpis: KpiItem[] = [
    { lbl: 'Tổng GCS',      val: rows.length },
    { lbl: 'Cổng xác nhận', val: rows.filter((r) => r.da06Status === 2).length, tone: 'ok' },
    { lbl: 'Chưa gửi',      val: rows.filter((r) => r.da06Status === 0).length, tone: 'warn' },
    { lbl: 'Lỗi',           val: rows.filter((r) => r.da06Status === 3).length, tone: 'crit' },
  ];

  const columns: ColumnDef<BirthCertificateDto>[] = [
    { key: 'certificateNumber', label: 'Số GCS', mono: true, code: true, width: 200 },
    { key: 'motherFullName', label: 'Mẹ',
      render: (r) => (
        <div>
          <b>{r.motherFullName || '—'}</b>
          <div className="mono" style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.motherIdNumber}</div>
        </div>
      ) },
    { key: 'birthDateTime', label: 'Ngày sinh', mono: true,
      render: (r) => fmtDTg(r.birthDateTime) },
    { key: 'childGender', label: 'Giới', width: 80,
      render: (r) => r.childGender === 'Male' ? 'Nam' : r.childGender === 'Female' ? 'Nữ' : '—' },
    { key: 'birthWeight', label: 'Cân nặng', mono: true, width: 100,
      render: (r) => `${r.birthWeight} kg` },
    { key: 'isLiveBirth', label: 'Sống/Chết', width: 110,
      render: (r) => r.isLiveBirth ? 'Sống' : <span style={{ color: 'var(--s-crit)' }}>Chết lưu</span> },
    { key: 'da06Status', label: 'Đề án 06', width: 160,
      render: (r) => <StatusBadge tone={da06Tone(r.da06Status)} dot>{r.da06StatusName || da06Label(r.da06Status)}</StatusBadge> },
  ];

  return (
    <>
      <KpiStrip items={kpis} />
      <DataTable<BirthCertificateDto>
        rowKey={(r) => r.id} data={rows} columns={columns}
        onRowClick={setDetail}
        actions={(r) => r.da06Status < 2
          ? <ActBtn ic="external" title="Gửi lên cổng Đề án 06" onClick={() => submit(r)} />
          : null}
      />
      <DrawerShell open={!!detail} onClose={() => setDetail(null)} size="lg"
        title={`Chứng sinh · ${detail?.certificateNumber || ''}`}
        footer={detail && detail.da06Status < 2 ? (
          <>
            <button type="button" className="ab-btn ghost" onClick={() => setDetail(null)}>Đóng</button>
            <button type="button" className="ab-btn primary" onClick={() => detail && submit(detail)}>
              <TermIcon name="external" size={12} /> Gửi cổng Đề án 06
            </button>
          </>
        ) : <button type="button" className="ab-btn ghost" onClick={() => setDetail(null)}>Đóng</button>}>
        {detail && (
          <>
            <DrSec title="MẸ">
              <DrField lbl="Họ tên">{detail.motherFullName}</DrField>
              <DrField lbl="CCCD"><span className="mono">{detail.motherIdNumber}</span></DrField>
            </DrSec>
            {detail.fatherFullName && (
              <DrSec title="BỐ">
                <DrField lbl="Họ tên">{detail.fatherFullName}</DrField>
                <DrField lbl="CCCD"><span className="mono">{detail.fatherIdNumber || '—'}</span></DrField>
              </DrSec>
            )}
            <DrSec title="TRẺ">
              <DrField lbl="Ngày sinh">{fmtDTg(detail.birthDateTime)}</DrField>
              <DrField lbl="Giới tính">{detail.childGender === 'Male' ? 'Nam' : detail.childGender === 'Female' ? 'Nữ' : '—'}</DrField>
              <DrField lbl="Cân nặng">{detail.birthWeight} kg</DrField>
              <DrField lbl="Tuổi thai">{detail.gestationalAgeWeeks} tuần</DrField>
              <DrField lbl="Phương pháp">{detail.birthMethod}</DrField>
              <DrField lbl="Nơi sinh">{detail.birthLocation}</DrField>
            </DrSec>
            <DrSec title="ĐỀ ÁN 06">
              <DrField lbl="Trạng thái">
                <StatusBadge tone={da06Tone(detail.da06Status)} dot>{detail.da06StatusName}</StatusBadge>
              </DrField>
            </DrSec>
          </>
        )}
      </DrawerShell>
    </>
  );
};

// ────────────────────────── Death ──────────────────────────

const DeathTab: React.FC = () => {
  const [rows, setRows] = useState<DeathCertificateDto[]>([]);
  const [detail, setDetail] = useState<DeathCertificateDto | null>(null);

  const load = useCallback(async () => {
    try { setRows(await deAn06.searchDeaths({ pageSize: 200 }) || []); }
    catch { te('Không tải được'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async (r: DeathCertificateDto) => {
    try { await deAn06.submitDeath(r.id); tk(`Đã gửi lên cổng Đề án 06 — ${r.certificateNumber}`); load(); setDetail(null); }
    catch { te('Gửi cổng thất bại'); }
  };

  const kpis: KpiItem[] = [
    { lbl: 'Tổng GBT',      val: rows.length },
    { lbl: 'Cổng xác nhận', val: rows.filter((r) => r.da06Status === 2).length, tone: 'ok' },
    { lbl: 'Chưa gửi',      val: rows.filter((r) => r.da06Status === 0).length, tone: 'warn' },
    { lbl: 'Lỗi',           val: rows.filter((r) => r.da06Status === 3).length, tone: 'crit' },
  ];

  const columns: ColumnDef<DeathCertificateDto>[] = [
    { key: 'certificateNumber', label: 'Số GBT', mono: true, code: true, width: 200 },
    { key: 'patientName', label: 'BN tử vong',
      render: (r) => (
        <div>
          <b>{r.patientName || '—'}</b>
          <div className="mono" style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.patientCode}</div>
        </div>
      ) },
    { key: 'deathDateTime', label: 'Tử vong lúc', mono: true,
      render: (r) => fmtDTg(r.deathDateTime) },
    { key: 'cause', label: 'Nguyên nhân',
      render: (r) => (
        <div>
          <span className="mono">{r.primaryCauseIcd || '—'}</span>
          <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.primaryCauseDescription || '—'}</div>
        </div>
      ) },
    { key: 'mannerOfDeath', label: 'Kiểu', width: 110 },
    { key: 'da06Status', label: 'Đề án 06', width: 160,
      render: (r) => <StatusBadge tone={da06Tone(r.da06Status)} dot>{r.da06StatusName || da06Label(r.da06Status)}</StatusBadge> },
  ];

  return (
    <>
      <KpiStrip items={kpis} />
      <DataTable<DeathCertificateDto>
        rowKey={(r) => r.id} data={rows} columns={columns}
        onRowClick={setDetail}
        actions={(r) => r.da06Status < 2
          ? <ActBtn ic="external" title="Gửi lên cổng Đề án 06" onClick={() => submit(r)} />
          : null}
      />
      <DrawerShell open={!!detail} onClose={() => setDetail(null)} size="lg"
        title={`Báo tử · ${detail?.certificateNumber || ''}`}
        footer={detail && detail.da06Status < 2 ? (
          <>
            <button type="button" className="ab-btn ghost" onClick={() => setDetail(null)}>Đóng</button>
            <button type="button" className="ab-btn primary" onClick={() => detail && submit(detail)}>
              <TermIcon name="external" size={12} /> Gửi cổng Đề án 06
            </button>
          </>
        ) : <button type="button" className="ab-btn ghost" onClick={() => setDetail(null)}>Đóng</button>}>
        {detail && (
          <>
            <DrSec title="BỆNH NHÂN">
              <DrField lbl="Họ tên">{detail.patientName}</DrField>
              <DrField lbl="Mã BN"><span className="mono">{detail.patientCode}</span></DrField>
            </DrSec>
            <DrSec title="TỬ VONG">
              <DrField lbl="Lúc">{fmtDTg(detail.deathDateTime)}</DrField>
              <DrField lbl="Nơi">{detail.deathLocation}</DrField>
              <DrField lbl="Kiểu">{detail.mannerOfDeath}</DrField>
              <DrField lbl="ICD chính"><code>{detail.primaryCauseIcd || '—'}</code></DrField>
              <DrField lbl="Nguyên nhân chính">{detail.primaryCauseDescription || '—'}</DrField>
              {detail.secondaryCauseDescription && (
                <DrField lbl="Nguyên nhân phụ">{detail.secondaryCauseDescription}</DrField>
              )}
            </DrSec>
            <DrSec title="BS CHỨNG NHẬN">
              <DrField lbl="Họ tên">{detail.certifyingDoctorName || '—'}</DrField>
              <DrField lbl="CCHN"><span className="mono">{detail.certifyingDoctorLicense || '—'}</span></DrField>
            </DrSec>
            <DrSec title="NGƯỜI BÁO TIN">
              <DrField lbl="Họ tên">{detail.informantFullName || '—'}</DrField>
              <DrField lbl="CCCD"><span className="mono">{detail.informantIdNumber || '—'}</span></DrField>
              <DrField lbl="Quan hệ">{detail.informantRelationship || '—'}</DrField>
            </DrSec>
            <DrSec title="ĐỀ ÁN 06">
              <DrField lbl="Trạng thái">
                <StatusBadge tone={da06Tone(detail.da06Status)} dot>{detail.da06StatusName}</StatusBadge>
              </DrField>
            </DrSec>
          </>
        )}
      </DrawerShell>
    </>
  );
};

// ────────────────────────── Dlhc (KSK lái xe) ──────────────────────────

const DlhcTab: React.FC = () => {
  const [rows, setRows] = useState<DrivingLicenseHealthCheckDto[]>([]);
  const [detail, setDetail] = useState<DrivingLicenseHealthCheckDto | null>(null);

  const load = useCallback(async () => {
    try { setRows(await deAn06.searchDlhc({ pageSize: 200 }) || []); }
    catch { te('Không tải được'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async (r: DrivingLicenseHealthCheckDto) => {
    try { await deAn06.submitDlhc(r.id); tk(`Đã gửi lên cổng Đề án 06 — ${r.certificateNumber}`); load(); setDetail(null); }
    catch { te('Gửi cổng thất bại'); }
  };

  const kpis: KpiItem[] = [
    { lbl: 'Tổng GCN',      val: rows.length },
    { lbl: 'Cổng xác nhận', val: rows.filter((r) => r.da06Status === 2).length, tone: 'ok' },
    { lbl: 'Chưa gửi',      val: rows.filter((r) => r.da06Status === 0).length, tone: 'warn' },
    { lbl: 'Lỗi',           val: rows.filter((r) => r.da06Status === 3).length, tone: 'crit' },
  ];

  const columns: ColumnDef<DrivingLicenseHealthCheckDto>[] = [
    { key: 'certificateNumber', label: 'Số GCN', mono: true, code: true, width: 220 },
    { key: 'patientName', label: 'BN',
      render: (r) => (
        <div>
          <b>{r.patientName || '—'}</b>
          <div className="mono" style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.patientCode}</div>
        </div>
      ) },
    { key: 'licenseClass', label: 'Hạng GPLX', width: 90,
      render: (r) => <code style={{ padding: '1px 6px', background: 'var(--d-2)', borderRadius: 3 }}>{r.licenseClass}</code> },
    { key: 'examDate', label: 'Ngày khám', mono: true,
      render: (r) => fmtDMYg(r.examDate) },
    { key: 'eligibleToDrive', label: 'Đủ ĐK', width: 110,
      render: (r) => r.eligibleToDrive
        ? <StatusBadge tone="ok" dot>Đủ</StatusBadge>
        : <StatusBadge tone="crit" dot>Không</StatusBadge> },
    { key: 'da06Status', label: 'Đề án 06', width: 160,
      render: (r) => <StatusBadge tone={da06Tone(r.da06Status)} dot>{r.da06StatusName || da06Label(r.da06Status)}</StatusBadge> },
  ];

  return (
    <>
      <KpiStrip items={kpis} />
      <DataTable<DrivingLicenseHealthCheckDto>
        rowKey={(r) => r.id} data={rows} columns={columns}
        onRowClick={setDetail}
        actions={(r) => r.da06Status < 2
          ? <ActBtn ic="external" title="Gửi lên cổng Đề án 06" onClick={() => submit(r)} />
          : null}
      />
      <DrawerShell open={!!detail} onClose={() => setDetail(null)} size="lg"
        title={`KSK lái xe · ${detail?.certificateNumber || ''}`}
        footer={detail && detail.da06Status < 2 ? (
          <>
            <button type="button" className="ab-btn ghost" onClick={() => setDetail(null)}>Đóng</button>
            <button type="button" className="ab-btn primary" onClick={() => detail && submit(detail)}>
              <TermIcon name="external" size={12} /> Gửi cổng Đề án 06
            </button>
          </>
        ) : <button type="button" className="ab-btn ghost" onClick={() => setDetail(null)}>Đóng</button>}>
        {detail && (
          <>
            <DrSec title="BN">
              <DrField lbl="Họ tên">{detail.patientName}</DrField>
              <DrField lbl="Mã BN"><span className="mono">{detail.patientCode}</span></DrField>
              <DrField lbl="Hạng GPLX">{detail.licenseClass}</DrField>
              <DrField lbl="Ngày khám">{fmtDMYg(detail.examDate)}</DrField>
            </DrSec>
            <DrSec title="THỂ CHẤT">
              <DrField lbl="Chiều cao / cân nặng">
                <span className="mono">{detail.heightCm}cm / {detail.weightKg}kg</span>
              </DrField>
              <DrField lbl="Huyết áp">
                <span className="mono">{detail.systolicBp}/{detail.diastolicBp}</span>
              </DrField>
              <DrField lbl="Mạch"><span className="mono">{detail.heartRate} l/p</span></DrField>
            </DrSec>
            <DrSec title="THỊ LỰC">
              <DrField lbl="Phải (không kính)">{detail.visionRightWithoutGlasses || '—'}</DrField>
              <DrField lbl="Trái (không kính)">{detail.visionLeftWithoutGlasses || '—'}</DrField>
              <DrField lbl="Mù màu">
                {detail.colorBlindNormal ? 'Bình thường' : (detail.colorVisionDetail || 'Bất thường')}
              </DrField>
            </DrSec>
            <DrSec title="XN MA TUÝ / CỒN">
              <DrField lbl="Ma tuý">
                {detail.drugTestPositive
                  ? <span style={{ color: 'var(--s-crit)' }}>Dương tính</span>
                  : 'Âm tính'}
              </DrField>
              <DrField lbl="Cồn">{detail.alcoholLevelMgPercent ?? 0} mg%</DrField>
            </DrSec>
            <DrSec title="KẾT LUẬN">
              <DrField lbl="Đủ ĐK">
                {detail.eligibleToDrive
                  ? <StatusBadge tone="ok" dot>Đủ ĐK</StatusBadge>
                  : <StatusBadge tone="crit" dot>Không đủ ĐK</StatusBadge>}
              </DrField>
              <DrField lbl="Kết luận">{detail.conclusion || '—'}</DrField>
              <DrField lbl="BS chứng nhận">{detail.certifyingDoctorName || '—'}</DrField>
            </DrSec>
            <DrSec title="ĐỀ ÁN 06">
              <DrField lbl="Trạng thái">
                <StatusBadge tone={da06Tone(detail.da06Status)} dot>{detail.da06StatusName}</StatusBadge>
              </DrField>
            </DrSec>
          </>
        )}
      </DrawerShell>
    </>
  );
};

export default DeAn06LiaisonV2;
