import React from 'react';
import type { RowSorter } from './sorting';

/**
 * Ô tiêu đề bấm được cho bảng dựng tay — cùng hình thức và cùng cách bấm (chuột lẫn bàn phím) với
 * tiêu đề cột của `DataTable`, để hai loại bảng không dạy người dùng hai thói quen khác nhau.
 */
export function SortTh<T>({
  s, k, children, className, style,
}: {
  s: RowSorter<T>;
  k: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const dir = s.state?.key === k ? s.state.dir : null;
  const activate = () => s.toggle(k);
  return (
    <th
      className={className ? `${className} sortable` : 'sortable'}
      style={style}
      onClick={activate}
      tabIndex={0}
      aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
      }}
    >
      <span className="ab-th-sort">
        <span>{children} </span>
        <span className={`ab-sort-icon ${dir || ''}`} aria-hidden="true">
          {dir === 'asc' ? '↑' : dir === 'desc' ? '↓' : '↕'}
        </span>
      </span>
    </th>
  );
}
