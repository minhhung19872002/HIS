import React, { useState, useEffect, useCallback } from 'react';
import { Tag, Input, Space, Spin, Empty, Tooltip } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { catalogApi, type ClinicalTermCatalogDto } from '../api/system';

const { Search } = Input;

interface ClinicalTermSelectorProps {
  category: string; // Symptom, Sign, Examination
  bodySystem?: string; // Filter by body system
  value?: string; // Current free-text value (for backward compatibility)
  selectedTerms?: string[]; // Selected term IDs
  onChange?: (text: string, termIds: string[]) => void;
  placeholder?: string;
  maxHeight?: number;
}

const categoryLabels: Record<string, string> = {
  Symptom: 'Triệu chứng',
  Sign: 'Dấu hiệu',
  Examination: 'Khám lâm sàng',
  ReviewOfSystems: 'Hệ cơ quan',
  Procedure: 'Thủ thuật',
  Other: 'Khác',
};

const bodySystemLabels: Record<string, string> = {
  General: 'Toàn thân',
  Cardiovascular: 'Tim mạch',
  Respiratory: 'Hô hấp',
  GI: 'Tiêu hóa',
  Neuro: 'Thần kinh',
  MSK: 'Cơ xương khớp',
  Skin: 'Da',
  ENT: 'Tai mũi họng',
  Eye: 'Mắt',
  Urogenital: 'Tiết niệu - Sinh dục',
};

const ClinicalTermSelector: React.FC<ClinicalTermSelectorProps> = ({
  category,
  bodySystem,
  value = '',
  selectedTerms = [],
  onChange,
  placeholder,
  maxHeight = 200,
}) => {
  const [terms, setTerms] = useState<ClinicalTermCatalogDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedTerms));
  const [freeText, setFreeText] = useState(value);

  // Load terms from API
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const resp = await catalogApi.getClinicalTerms(undefined, category, bodySystem, true);
        if (active) {
          const data = (resp as any)?.data ?? resp;
          setTerms(Array.isArray(data) ? data : []);
        }
      } catch {
        // Silently fail - checklist is optional enhancement
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [category, bodySystem]);

  // Sync external selectedTerms prop
  useEffect(() => {
    setSelected(new Set(selectedTerms));
  }, [selectedTerms]);

  // Sync external value prop
  useEffect(() => {
    setFreeText(value);
  }, [value]);

  const toggleTerm = useCallback((term: ClinicalTermCatalogDto) => {
    setSelected(prev => {
      const next = new Set(prev);
      const termId = term.id!;
      if (next.has(termId)) {
        next.delete(termId);
      } else {
        next.add(termId);
      }

      // Build text from selected terms + free text
      const selectedNames = terms
        .filter(t => next.has(t.id!))
        .map(t => t.name);
      const combinedText = [...selectedNames, freeText].filter(Boolean).join('; ');
      onChange?.(combinedText, Array.from(next));
      return next;
    });
  }, [terms, freeText, onChange]);

  const handleFreeTextChange = useCallback((newText: string) => {
    setFreeText(newText);
    const selectedNames = terms
      .filter(t => selected.has(t.id!))
      .map(t => t.name);
    const combinedText = [...selectedNames, newText].filter(Boolean).join('; ');
    onChange?.(combinedText, Array.from(selected));
  }, [terms, selected, onChange]);

  // Filter terms by search
  const filtered = searchKeyword
    ? terms.filter(t =>
        t.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        t.code.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        (t.nameEnglish && t.nameEnglish.toLowerCase().includes(searchKeyword.toLowerCase()))
      )
    : terms;

  // Group by body system
  const grouped = filtered.reduce<Record<string, ClinicalTermCatalogDto[]>>((acc, t) => {
    const key = t.bodySystem || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  if (loading) return <Spin size="small" />;

  return (
    <div>
      {/* Checklist area */}
      {terms.length > 0 && (
        <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, padding: 8, marginBottom: 8 }}>
          <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#666' }}>
              {categoryLabels[category] || category} - Chọn nhanh:
            </span>
            <Search
              size="small"
              placeholder="Tìm..."
              style={{ width: 160 }}
              allowClear
              onChange={e => setSearchKeyword(e.target.value)}
            />
          </div>
          <div style={{ maxHeight, overflowY: 'auto' }}>
            {Object.keys(grouped).length === 0 ? (
              <Empty description="Không tìm thấy" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              Object.entries(grouped).map(([system, sysTerms]) => (
                <div key={system} style={{ marginBottom: 4 }}>
                  {Object.keys(grouped).length > 1 && (
                    <div style={{ fontSize: 11, color: '#999', fontWeight: 600, marginBottom: 2 }}>
                      {bodySystemLabels[system] || system}
                    </div>
                  )}
                  <Space wrap style={{ marginBottom: 4 }}>
                    {sysTerms.map(t => {
                      const isSelected = selected.has(t.id!);
                      return (
                        <Tooltip key={t.id} title={t.nameEnglish || t.description || t.code}>
                          <Tag
                            color={isSelected ? 'blue' : undefined}
                            icon={isSelected ? <CheckCircleOutlined /> : undefined}
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                            onClick={() => toggleTerm(t)}
                          >
                            {t.name}
                          </Tag>
                        </Tooltip>
                      );
                    })}
                  </Space>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Free text area for additional notes */}
      <Input.TextArea
        rows={2}
        value={freeText}
        onChange={e => handleFreeTextChange(e.target.value)}
        placeholder={placeholder || `Ghi thêm ${(categoryLabels[category] || '').toLowerCase()}...`}
      />
    </div>
  );
};

export default ClinicalTermSelector;
