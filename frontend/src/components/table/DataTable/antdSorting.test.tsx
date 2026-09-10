import React from 'react';
import { describe, expect, it } from 'vitest';
import { withSorters } from './antdSorting';

/**
 * `withSorters` gắn `sorter` cho bảng `<Table>` Antd còn sót trong modal/tab phụ của v2.
 *
 * Bộ kiểm này canh hai thứ dễ hỏng nhất: (1) khoá so sánh lấy đúng chỗ — `dataIndex` trước, chữ
 * hiển thị sau — vì đọc nhầm chỗ thì cột ngày/tiền sắp sai mà nhìn bằng mắt không ra; (2) những
 * cột KHÔNG được đụng vào (cột nút bấm không tiêu đề, cột đã tự khai `sorter`).
 */

type Col = {
  title?: unknown;
  dataIndex?: string | readonly string[];
  key?: string;
  render?: (value: unknown, record: unknown, index: number) => unknown;
  sorter?: unknown;
  children?: unknown;
};

const sorterOf = (cols: Col[], index: number) => {
  const s = withSorters(cols)[index].sorter;
  if (typeof s !== 'function') throw new Error(`cột ${index} không được gắn sorter`);
  return s as (a: unknown, b: unknown) => number;
};

describe('withSorters — gắn sắp xếp cho bảng Antd', () => {
  it('so theo giá trị thô ở `dataIndex`, không so theo chữ đã định dạng', () => {
    const cols: Col[] = [{ title: 'Tồn', dataIndex: 'qty' }];
    const sorter = sorterOf(cols, 0);
    // 9 < 10: so bằng chữ thì "10" đứng trước "9".
    expect(sorter({ qty: 10 }, { qty: 9 })).toBeGreaterThan(0);
  });

  it('đọc được `dataIndex` dạng đường dẫn lồng', () => {
    const cols: Col[] = [{ title: 'Khoa', dataIndex: ['dept', 'name'] }];
    const sorter = sorterOf(cols, 0);
    expect(sorter({ dept: { name: 'An' } }, { dept: { name: 'Bình' } })).toBeLessThan(0);
  });

  it('cột chỉ có `render` thì so theo chữ người dùng nhìn thấy', () => {
    const cols: Col[] = [{
      title: 'Bệnh nhân',
      key: 'pt',
      render: (_v, record) => <b>{(record as { name: string }).name}</b>,
    }];
    const sorter = sorterOf(cols, 0);
    expect(sorter({ name: 'Ánh' }, { name: 'Bảo' })).toBeLessThan(0);
  });

  it('hiểu ngày kiểu Việt Nam qua chữ hiển thị — "08/11" là tháng 11', () => {
    const cols: Col[] = [{
      title: 'Ngày',
      dataIndex: 'when',
      render: (v) => String(v),
    }];
    const sorter = sorterOf(cols, 0);
    // dataIndex được ưu tiên: giá trị thô đã là chuỗi ngày dd/mm/yyyy.
    expect(sorter({ when: '08/11/2026' }, { when: '09/09/2026' })).toBeGreaterThan(0);
  });

  it('KHÔNG đụng vào cột đã tự khai `sorter` (kể cả `sorter: false`)', () => {
    const own = () => 0;
    const cols: Col[] = [
      { title: 'A', dataIndex: 'a', sorter: own },
      { title: 'B', dataIndex: 'b', sorter: false },
    ];
    const out = withSorters(cols);
    expect(out[0].sorter).toBe(own);
    expect(out[1].sorter).toBe(false);
  });

  it('bỏ qua cột nút bấm — cột không có tiêu đề thì không gắn sorter', () => {
    const cols: Col[] = [
      { title: '', key: 'actions', render: () => <button type="button">Xoá</button> },
      { key: 'more', render: () => <button type="button">…</button> },
    ];
    const out = withSorters(cols);
    expect(out[0].sorter).toBeUndefined();
    expect(out[1].sorter).toBeUndefined();
  });

  it('bỏ qua cột không có cả `dataIndex` lẫn `render`', () => {
    const cols: Col[] = [{ title: 'Trống', key: 'x' }];
    expect(withSorters(cols)[0].sorter).toBeUndefined();
  });

  it('đi vào cột con của cột nhóm, giữ nguyên vỏ nhóm', () => {
    const cols: Col[] = [{
      title: 'Tổng hợp',
      children: [{ title: 'Số lượng', dataIndex: 'qty' }],
    }];
    const out = withSorters(cols) as Array<{ title: unknown; children: Col[] }>;
    expect(out[0].title).toBe('Tổng hợp');
    expect(typeof out[0].children[0].sorter).toBe('function');
  });

  it('ô trống chìm xuống cuối khi sắp tăng dần', () => {
    const cols: Col[] = [{ title: 'Ghi chú', dataIndex: 'note' }];
    const sorter = sorterOf(cols, 0);
    expect(sorter({ note: null }, { note: 'abc' })).toBeGreaterThan(0);
    expect(sorter({ note: '—' }, { note: 'abc' })).toBeGreaterThan(0);
  });
});
