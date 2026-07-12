import React from 'react';
import { ModalShell, Btn } from '../../../pages-v2/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import type { LabDefaultRoles } from '../../system/api/userSettings';

export const LabRolesModal: React.FC<{
  open: boolean;
  onClose: () => void;
  saving: boolean;
  value: LabDefaultRoles;
  onChange: React.Dispatch<React.SetStateAction<LabDefaultRoles>>;
  onSave: () => void;
}> = ({ open, onClose, saving, value, onChange, onSave }) => (
  <ModalShell
    open={open}
    onClose={() => { if (!saving) onClose(); }}
    title="Cài đặt vai trò mặc định (LIS)"
    sub="Auto-fill KTV và Người duyệt khi thao tác trên phiếu XN"
    size="sm"
    footer={
      <div style={{ display: 'flex', gap: 'var(--space-8)', justifyContent: 'flex-end' }}>
        <Btn variant="ghost" size="sm" disabled={saving} onClick={onClose}>Hủy</Btn>
        <Btn variant="primary" size="sm" disabled={saving} onClick={onSave}>
          <TermIcon name="check" size={11} /> {saving ? 'Đang lưu…' : 'Lưu cài đặt'}
        </Btn>
      </div>
    }
  >
    <div style={{ display: 'grid', gap: 'var(--space-14)' }}>
      <div>
        <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', display: 'block', marginBottom: 'var(--space-4)' }}>
          Tên KTV mặc định (auto-fill khi nhận mẫu)
        </label>
        <input
          className="hui-inp"
          style={{ width: '100%' }}
          placeholder="Ví dụ: Nguyễn Văn A"
          value={value.defaultKtvName || ''}
          onChange={(e) => onChange((p) => ({ ...p, defaultKtvName: e.target.value || null }))}
        />
      </div>
      <div>
        <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', display: 'block', marginBottom: 'var(--space-4)' }}>
          Tên Người duyệt mặc định (auto-fill khi duyệt chính thức)
        </label>
        <input
          className="hui-inp"
          style={{ width: '100%' }}
          placeholder="Ví dụ: BS. Trần Thị B"
          value={value.defaultApproverName || ''}
          onChange={(e) => onChange((p) => ({ ...p, defaultApproverName: e.target.value || null }))}
        />
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--t-2)', padding: '6px 8px', background: 'var(--d-1)', borderRadius: 4, borderLeft: '3px solid var(--a-cy)' }}>
        Cài đặt này lưu riêng theo tài khoản đăng nhập. Sau khi lưu, tên sẽ tự động điền vào các thao tác lấy mẫu và duyệt kết quả.
      </div>
    </div>
  </ModalShell>
);
