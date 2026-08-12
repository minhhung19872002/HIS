import React, { useCallback, useEffect, useState } from 'react';
import { App as AntdApp, Input, Select } from 'antd';
import * as risApi from '../api/ris';
import type { CoReaderDto } from '../api/ris';
import { Btn, ActBtn, cf, tw } from '@/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import { friendlyErrorMessage } from '../../../utils/friendlyError';

// ─────────────── Co-Reader Section (#139) ───────────────

/**
 * Section "Dong doc" hien thi trong detail drawer cua mot ca CDHA.
 * reportId = RadiologyResultDto.id (= RadiologyReport.Id tren backend).
 */
export const CoReaderSection: React.FC<{ reportId: string }> = ({ reportId }) => {
  const { message } = AntdApp.useApp();
  const [readers, setReaders] = useState<CoReaderDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newReaderId, setNewReaderId] = useState('');
  const [newReaderName, setNewReaderName] = useState('');
  const [newRole, setNewRole] = useState<string>('CoReader');
  const [editId, setEditId] = useState<string | null>(null);
  const [editOpinion, setEditOpinion] = useState('');
  const [merging, setMerging] = useState(false);
  const [adding, setAdding] = useState(false);
  const [savingOpinion, setSavingOpinion] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await risApi.getCoReaders(reportId);
      setReaders(res.data);
    } catch (e) {
      // Không chặn nghiệp vụ nhưng phải báo — nếu im lặng, "(0)" bị hiểu là chưa có BS đồng đọc
      tw(friendlyErrorMessage(e, 'Không tải được danh sách bác sĩ đồng đọc'));
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (adding) return;
    if (!newReaderId.trim()) { message.warning('Nhap Id BS dong doc'); return; }
    setAdding(true);
    try {
      await risApi.addCoReader({
        radiologyReportId: reportId,
        readerId: newReaderId.trim(),
        readerName: newReaderName.trim() || undefined,
        role: newRole,
      });
      message.success('Da them BS dong doc');
      setAddOpen(false);
      setNewReaderId(''); setNewReaderName(''); setNewRole('CoReader');
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Loi them dong doc');
    } finally {
      setAdding(false);
    }
  };

  const handleSaveOpinion = async (cr: CoReaderDto) => {
    if (savingOpinion) return;
    setSavingOpinion(true);
    try {
      await risApi.updateCoReaderOpinion({ coReaderId: cr.id, opinion: editOpinion });
      message.success('Da cap nhat y kien');
      setEditId(null);
      load();
    } catch {
      message.error('Loi cap nhat y kien');
    } finally {
      setSavingOpinion(false);
    }
  };

  const handleRemove = (coReaderId: string) => cf('Xóa bác sĩ đồng đọc này? Thao tác không thể hoàn tác.', async () => {
    try {
      await risApi.removeCoReader(coReaderId);
      message.success('Da xoa dong doc');
      load();
    } catch {
      message.error('Loi xoa dong doc');
    }
  }, { tone: 'crit', confirm: 'Xóa' });

  const handleMerge = async () => {
    setMerging(true);
    try {
      const res = await risApi.mergeCoReaderOpinions({ radiologyReportId: reportId, appendMode: true });
      message.success(`Da gop ${res.data.coReaderCount} y kien vao Impression`);
    } catch {
      message.error('Loi gop y kien');
    } finally {
      setMerging(false);
    }
  };

  const roleLabel = (r?: string) => {
    if (r === 'Consultant') return 'Hoi chan';
    if (r === 'Supervisor') return 'Giam sat';
    if (r === 'CopiedFrom') return 'Copy tu';
    return 'Dong doc';
  };

  return (
    <div className="rec-section" style={{ marginTop: 'var(--space-12)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-8)' }}>
        <h5 style={{ margin: 0 }}>
          <TermIcon name="users" size={11} /> DONG DOC ({readers.length})
        </h5>
        <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
          {readers.length > 0 && (
            <Btn size="sm" icon="git-merge" loading={merging} onClick={handleMerge}>
              Gop y kien
            </Btn>
          )}
          <Btn size="sm" icon="plus" onClick={() => setAddOpen(v => !v)}>
            Them BS
          </Btn>
        </div>
      </div>

      {/* Form them dong doc */}
      {addOpen && (
        <div style={{
          padding: 'var(--space-10)', background: 'var(--d-1)', border: '1px solid var(--line)',
          borderRadius: 'var(--r-2)', marginBottom: 'var(--space-8)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)',
        }}>
          <Input
            size="small"
            placeholder="User Id BS dong doc (Guid)"
            value={newReaderId}
            onChange={e => setNewReaderId(e.target.value)}
          />
          <Input
            size="small"
            placeholder="Ten BS (tuy chon — backend tu lay neu bo trong)"
            value={newReaderName}
            onChange={e => setNewReaderName(e.target.value)}
          />
          <Select
            size="small"
            value={newRole}
            onChange={v => setNewRole(v)}
            options={[
              { value: 'CoReader',   label: 'Dong doc' },
              { value: 'Consultant', label: 'Hoi chan' },
              { value: 'Supervisor', label: 'Giam sat' },
            ]}
          />
          <div style={{ display: 'flex', gap: 'var(--space-6)', justifyContent: 'flex-end' }}>
            <Btn size="sm" variant="ok" icon="check" onClick={handleAdd} loading={adding}>Luu</Btn>
            <Btn size="sm" variant="ghost" onClick={() => setAddOpen(false)}>Huy</Btn>
          </div>
        </div>
      )}

      {/* Danh sach dong doc */}
      {loading && <div style={{ color: 'var(--t-3)', fontSize: 'var(--fs-sm)' }}>Dang tai...</div>}
      {!loading && readers.length === 0 && (
        <div style={{ color: 'var(--t-3)', fontSize: 'var(--fs-sm)' }}>Chua co BS dong doc nao.</div>
      )}
      {readers.map(cr => (
        <div key={cr.id} style={{
          padding: '8px 0', borderBottom: '1px solid var(--line-soft)',
          fontSize: 12.5,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <b style={{ color: 'var(--t-0)' }}>{cr.readerName || cr.readerId}</b>
              <span style={{
                marginLeft: 'var(--space-6)', fontSize: 10.5, padding: '1px 6px',
                background: 'var(--d-2)', borderRadius: 'var(--r-1)', color: 'var(--t-2)',
              }}>{roleLabel(cr.role)}</span>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
              <ActBtn ic="edit" title="Sua y kien" onClick={() => {
                setEditId(cr.id);
                setEditOpinion(cr.opinion || '');
              }} />
              <ActBtn ic="trash-2" title="Xoa dong doc" tone="crit" onClick={() => handleRemove(cr.id)} />
            </div>
          </div>

          {/* Y kien */}
          {editId === cr.id ? (
            <div style={{ marginTop: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <Input.TextArea
                size="small"
                rows={3}
                value={editOpinion}
                onChange={e => setEditOpinion(e.target.value)}
                placeholder="Y kien / nhan xet..."
              />
              <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'flex-end' }}>
                <Btn size="sm" variant="ok" icon="check" onClick={() => handleSaveOpinion(cr)} loading={savingOpinion}>Luu</Btn>
                <Btn size="sm" variant="ghost" onClick={() => setEditId(null)}>Huy</Btn>
              </div>
            </div>
          ) : cr.opinion ? (
            <div style={{ marginTop: 'var(--space-4)', color: 'var(--t-1)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {cr.opinion}
            </div>
          ) : (
            <div style={{ marginTop: 'var(--space-4)', color: 'var(--t-3)', fontStyle: 'italic' }}>Chua co y kien</div>
          )}

          {cr.copiedFromReportId && (
            <div style={{ marginTop: 'var(--space-3)', fontSize: 'var(--fs-xs)', color: 'var(--t-3)' }}>
              Copy tu report: <span className="mono">{cr.copiedFromReportId.slice(0, 8)}...</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
