import React from 'react';
import type { InjuryInfoDto } from '../api/examination';

/* ==========================================================================
   Khai báo tai nạn giao thông — F1.6 (Biểu 14.5 SYT).
   Extracted verbatim from OpdEditor.tsx (#205 FE-2 split, Phase 1). Pure
   presentational: state (injuryInfo) + setter stay in the main component.
   ========================================================================== */

export const InjurySection: React.FC<{
  injuryInfo: Partial<InjuryInfoDto>;
  setInjuryInfo: React.Dispatch<React.SetStateAction<Partial<InjuryInfoDto>>>;
}> = ({ injuryInfo, setInjuryInfo }) => (
  <section style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)', padding: 'var(--space-12)' }}>
    <h4 style={{ margin: '0 0 10px', fontSize: 11.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t-2)' }}>Khai báo thương tích / TNGT (Biểu 14.5)</h4>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-10)' }}>
      <div>
        <label style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)', display: 'block', marginBottom: 'var(--space-3)' }}>Loại tai nạn</label>
        <select className="hui-inp" style={{ width: '100%', height: 28, fontSize: 'var(--fs-sm)' }}
          value={injuryInfo.injuryType ?? ''}
          onChange={(e) => setInjuryInfo((s) => ({ ...s, injuryType: e.target.value ? +e.target.value : undefined }))}>
          <option value="">-- Chọn --</option>
          <option value="1">Tai nạn giao thông</option>
          <option value="2">Tai nạn lao động</option>
          <option value="3">Bạo lực</option>
          <option value="4">Khác</option>
        </select>
      </div>
      <div>
        <label style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)', display: 'block', marginBottom: 'var(--space-3)' }}>Ngày xảy ra</label>
        <input type="date" className="hui-inp" style={{ width: '100%', height: 28, fontSize: 'var(--fs-sm)' }}
          value={injuryInfo.injuryDate ? injuryInfo.injuryDate.slice(0, 10) : ''}
          onChange={(e) => setInjuryInfo((s) => ({ ...s, injuryDate: e.target.value || undefined }))} />
      </div>
      <div>
        <label style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)', display: 'block', marginBottom: 'var(--space-3)' }}>Nơi xảy ra</label>
        <input type="text" className="hui-inp" style={{ width: '100%', height: 28, fontSize: 'var(--fs-sm)' }}
          placeholder="Địa điểm tai nạn"
          value={injuryInfo.injuryLocation ?? ''}
          onChange={(e) => setInjuryInfo((s) => ({ ...s, injuryLocation: e.target.value || undefined }))} />
      </div>
    </div>
    {injuryInfo.injuryType === 1 && (
      <>
        <div style={{ marginTop: 'var(--space-10)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-10)' }}>
          <div>
            <label style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)', display: 'block', marginBottom: 'var(--space-3)' }}>Đội mũ bảo hiểm</label>
            <select className="hui-inp" style={{ width: '100%', height: 28, fontSize: 'var(--fs-sm)' }}
              value={injuryInfo.helmetWorn == null ? '' : injuryInfo.helmetWorn ? '1' : '0'}
              onChange={(e) => setInjuryInfo((s) => ({ ...s, helmetWorn: e.target.value === '' ? null : e.target.value === '1' }))}>
              <option value="">-- Chưa rõ --</option>
              <option value="1">Có đội</option>
              <option value="0">Không đội</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)', display: 'block', marginBottom: 'var(--space-3)' }}>Nồng độ cồn (mg/L khí thở)</label>
            <select className="hui-inp" style={{ width: '100%', height: 28, fontSize: 'var(--fs-sm)' }}
              value={injuryInfo.alcoholLevel ?? ''}
              onChange={(e) => setInjuryInfo((s) => ({ ...s, alcoholLevel: e.target.value || undefined }))}>
              <option value="">-- Chưa đo --</option>
              <option value="0">0 (âm tính)</option>
              <option value="<0.25">{'<0.25'}</option>
              <option value="0.25-<0.4">0.25 – {'<0.4'}</option>
              <option value=">=0.4">{'>='} 0.4</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)', display: 'block', marginBottom: 'var(--space-3)' }}>Phương tiện nạn nhân điều khiển</label>
            <select className="hui-inp" style={{ width: '100%', height: 28, fontSize: 'var(--fs-sm)' }}
              value={injuryInfo.vehicleTypeSelf ?? ''}
              onChange={(e) => setInjuryInfo((s) => ({ ...s, vehicleTypeSelf: e.target.value || undefined }))}>
              <option value="">-- Chọn --</option>
              <option value="xe_may">Xe máy / xe gắn máy</option>
              <option value="o_to">Ô tô</option>
              <option value="xe_dap">Xe đạp / xe đạp điện</option>
              <option value="xe_tai">Xe tải / xe buýt</option>
              <option value="bo">Đi bộ</option>
              <option value="khac">Khác</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: 'var(--space-10)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-10)' }}>
          <div>
            <label style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)', display: 'block', marginBottom: 'var(--space-3)' }}>Phương tiện gây tai nạn</label>
            <select className="hui-inp" style={{ width: '100%', height: 28, fontSize: 'var(--fs-sm)' }}
              value={injuryInfo.vehicleTypeCauser ?? ''}
              onChange={(e) => setInjuryInfo((s) => ({ ...s, vehicleTypeCauser: e.target.value || undefined }))}>
              <option value="">-- Chọn --</option>
              <option value="xe_may">Xe máy / xe gắn máy</option>
              <option value="o_to">Ô tô</option>
              <option value="xe_dap">Xe đạp / xe đạp điện</option>
              <option value="xe_tai">Xe tải / xe buýt</option>
              <option value="cong_trinh">Công trình / vật thể cố định</option>
              <option value="khac">Khác</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)', display: 'block', marginBottom: 'var(--space-3)' }}>Phương tiện khác liên quan</label>
            <select className="hui-inp" style={{ width: '100%', height: 28, fontSize: 'var(--fs-sm)' }}
              value={injuryInfo.vehicleTypeVictim ?? ''}
              onChange={(e) => setInjuryInfo((s) => ({ ...s, vehicleTypeVictim: e.target.value || undefined }))}>
              <option value="">-- Không có / Không rõ --</option>
              <option value="xe_may">Xe máy / xe gắn máy</option>
              <option value="o_to">Ô tô</option>
              <option value="xe_dap">Xe đạp / xe đạp điện</option>
              <option value="xe_tai">Xe tải / xe buýt</option>
              <option value="khac">Khác</option>
            </select>
          </div>
        </div>
      </>
    )}
    <div style={{ marginTop: 'var(--space-10)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-10)' }}>
      <div>
        <label style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)', display: 'block', marginBottom: 'var(--space-3)' }}>Nguyên nhân / Hoàn cảnh</label>
        <input type="text" className="hui-inp" style={{ width: '100%', height: 28, fontSize: 'var(--fs-sm)' }}
          placeholder="Mô tả nguyên nhân"
          value={injuryInfo.injuryCause ?? ''}
          onChange={(e) => setInjuryInfo((s) => ({ ...s, injuryCause: e.target.value || undefined }))} />
      </div>
      <div>
        <label style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)', display: 'block', marginBottom: 'var(--space-3)' }}>Sơ cứu ban đầu</label>
        <input type="text" className="hui-inp" style={{ width: '100%', height: 28, fontSize: 'var(--fs-sm)' }}
          placeholder="Đã xử trí gì trước khi đến viện"
          value={injuryInfo.firstAid ?? ''}
          onChange={(e) => setInjuryInfo((s) => ({ ...s, firstAid: e.target.value || undefined }))} />
      </div>
    </div>
    <div style={{ marginTop: 'var(--space-8)', display: 'flex', alignItems: 'center', gap: 'var(--space-12)' }}>
      <label style={{ fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 'var(--space-6)', cursor: 'pointer' }}>
        <input type="checkbox"
          checked={!!injuryInfo.isReportedToPolice}
          onChange={(e) => setInjuryInfo((s) => ({ ...s, isReportedToPolice: e.target.checked }))} />
        Đã báo cáo công an
      </label>
      {injuryInfo.isReportedToPolice && (
        <input type="text" className="hui-inp" style={{ height: 26, fontSize: 'var(--fs-sm)', flex: 1 }}
          placeholder="Số biên bản công an"
          value={injuryInfo.policeReportNumber ?? ''}
          onChange={(e) => setInjuryInfo((s) => ({ ...s, policeReportNumber: e.target.value || undefined }))} />
      )}
    </div>
  </section>
);
