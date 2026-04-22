/**
 * Hiển thị giá trị KQ XN với màu sắc theo khoảng tham chiếu — N1.18.
 * - Trong khoảng: xanh (green)
 * - Cao hơn max hoặc thấp hơn min: đỏ/cam
 * - Critical (>1.5× max hoặc <0.8× min): đỏ đậm + bold + ⚠
 */

import React from 'react';
import { Tag, Tooltip, Typography } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, WarningOutlined } from '@ant-design/icons';

const { Text } = Typography;

export interface LabResultValueProps {
  numericResult?: number | null;
  textResult?: string | null;
  unit?: string;
  referenceMin?: number | null;
  referenceMax?: number | null;
  referenceRange?: string;
  isAbnormal?: boolean;
  abnormalType?: number | null;  // 1=High, 2=Low, 3=Critical
  isCritical?: boolean;
  showRange?: boolean;
}

/** Evaluate abnormal/type purely from numericResult + refMin/refMax. Used when backend flags not set. */
export function evaluateLabValue(value?: number | null, min?: number | null, max?: number | null): {
  isAbnormal: boolean; abnormalType: number | null; color: string;
} {
  if (value == null || (min == null && max == null)) return { isAbnormal: false, abnormalType: null, color: '' };
  if (min != null && value < min) {
    if (value < min * 0.8) return { isAbnormal: true, abnormalType: 3, color: '#cf1322' };
    return { isAbnormal: true, abnormalType: 2, color: '#1677ff' };
  }
  if (max != null && value > max) {
    if (value > max * 1.5) return { isAbnormal: true, abnormalType: 3, color: '#cf1322' };
    return { isAbnormal: true, abnormalType: 1, color: '#cf1322' };
  }
  return { isAbnormal: false, abnormalType: null, color: '#389e0d' };
}

export default function LabResultValue(props: LabResultValueProps) {
  const {
    numericResult, textResult, unit, referenceMin, referenceMax, referenceRange,
    isAbnormal: isAbnProp, abnormalType: abnTypeProp, isCritical, showRange = true,
  } = props;

  // Use backend flags if present, else fall back to local evaluation
  const useBackend = isAbnProp != null;
  const evalLocal = evaluateLabValue(numericResult, referenceMin, referenceMax);
  const isAbnormal = useBackend ? !!isAbnProp : evalLocal.isAbnormal;
  const abnormalType = useBackend ? abnTypeProp : evalLocal.abnormalType;
  const critical = isCritical === true || abnormalType === 3;

  let color = '';
  let icon: React.ReactNode = null;
  if (critical) {
    color = '#cf1322';
    icon = <WarningOutlined style={{ marginRight: 4 }} />;
  } else if (abnormalType === 1) {
    color = '#cf1322';
    icon = <ArrowUpOutlined style={{ marginRight: 4, fontSize: 12 }} />;
  } else if (abnormalType === 2) {
    color = '#1677ff';
    icon = <ArrowDownOutlined style={{ marginRight: 4, fontSize: 12 }} />;
  } else if (numericResult != null) {
    color = '#389e0d';
  }

  const display = numericResult != null ? String(numericResult) : (textResult ?? '-');

  const range = referenceRange
    || (referenceMin != null && referenceMax != null
        ? `${referenceMin}–${referenceMax}`
        : referenceMin != null ? `≥${referenceMin}`
        : referenceMax != null ? `≤${referenceMax}`
        : undefined);

  return (
    <Tooltip title={range ? `Khoảng tham chiếu: ${range}${unit ? ' ' + unit : ''}` : undefined}>
      <span>
        {icon}
        <Text strong={isAbnormal} style={{ color }}>
          {display}
          {unit ? <span style={{ marginLeft: 4, fontWeight: 400 }}>{unit}</span> : null}
        </Text>
        {critical && <Tag color="red" style={{ marginLeft: 6 }}>CRITICAL</Tag>}
        {showRange && range && (
          <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
            ({range})
          </Text>
        )}
      </span>
    </Tooltip>
  );
}
