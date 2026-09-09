import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DataTable, type ColumnDef } from './DataTable';

/**
 * Bảng phải sắp trên TOÀN BỘ danh sách rồi mới cắt trang.
 *
 * Bộ này canh đúng cái bẫy đã có sẵn trong mã trước đây: `opd/FollowUp.tsx` sắp trên `pagedRaw` —
 * tức chỉ sắp 16 dòng đang hiện. Nhìn màn hình thì y hệt bảng sắp đúng: mũi tên đổi chiều, các
 * dòng đảo chỗ. Chỉ khi lật sang trang 2 mới lộ ra là mỗi trang tự sắp riêng, và lúc đó người dùng
 * đã tin dòng đầu bảng là lớn nhất của cả danh sách rồi.
 *
 * Vì thế phép kiểm không hỏi "bấm vào có đổi thứ tự không" mà hỏi "dòng đầu trang 1 có phải là lớn
 * nhất của CẢ 5 dòng không" — chỉ có bảng sắp đúng mới trả lời được.
 *
 * Dùng thẳng `react-dom/client` chứ không thêm `@testing-library/react`: thêm một gói phụ thuộc chỉ
 * để bấm một cái tiêu đề cột là không đáng.
 */

interface Row { id: string; ten: string; diem: number }

// Cố tình xếp lộn xộn, và cố tình để dòng điểm cao nhất / thấp nhất KHÔNG nằm ở trang đầu.
const ROWS: Row[] = [
  { id: 'r1', ten: 'Cường', diem: 5 },
  { id: 'r2', ten: 'An', diem: 9 },
  { id: 'r3', ten: 'Đức', diem: 1 },
  { id: 'r4', ten: 'Bình', diem: 7 },
  { id: 'r5', ten: 'Em', diem: 3 },
];

const COLS: ColumnDef<Row>[] = [
  { key: 'ten', label: 'Tên', render: (r) => r.ten },
  { key: 'diem', label: 'Điểm', render: (r) => String(r.diem) },
];

describe('DataTable — sắp xếp', () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  const render = (extra: Partial<React.ComponentProps<typeof DataTable<Row>>> = {}) => {
    act(() => {
      root.render(
        <DataTable<Row> columns={COLS} data={ROWS} rowKey={(r) => r.id} {...extra} />,
      );
    });
  };

  const headers = () => Array.from(host.querySelectorAll('thead th'));
  const clickHeader = (label: string) => {
    const th = headers().find((h) => h.textContent?.includes(label));
    if (!th) throw new Error(`không thấy cột "${label}"`);
    act(() => { (th as HTMLElement).click(); });
  };
  const bodyRows = () =>
    Array.from(host.querySelectorAll('tbody tr'))
      .map((tr) => Array.from(tr.querySelectorAll('td')).map((td) => td.textContent));

  it('mọi cột đều bấm sắp được mà không phải khai gì thêm', () => {
    render();
    expect(headers().every((h) => h.classList.contains('sortable'))).toBe(true);
  });

  it('cột khai sortable:false thì không bấm được', () => {
    render({ columns: [COLS[0], { ...COLS[1], sortable: false }] });
    expect(headers()[1].classList.contains('sortable')).toBe(false);
  });

  it('sắp trên TOÀN BỘ danh sách, không phải trên trang đang xem', () => {
    // 5 dòng, mỗi trang 2 dòng. Điểm cao nhất (9) nằm ở dòng thứ 2 của dữ liệu gốc, điểm thấp nhất
    // (1) nằm ở dòng thứ 3 — cả hai đều KHÔNG phải là dòng đầu.
    render({ page: 0, perPage: 2 });
    expect(bodyRows()).toHaveLength(2);

    clickHeader('Điểm'); // tăng dần
    expect(bodyRows()[0][1]).toBe('1');

    clickHeader('Điểm'); // giảm dần
    // Nếu chỉ sắp trang đang xem thì ở đây ra '5' (lớn nhất trong 2 dòng đầu), không phải '9'.
    expect(bodyRows()[0][1]).toBe('9');
  });

  it('trang 2 nối tiếp đúng thứ tự đã sắp', () => {
    render({ page: 0, perPage: 2 });
    clickHeader('Điểm');
    expect(bodyRows().map((r) => r[1])).toEqual(['1', '3']);

    render({ page: 1, perPage: 2 });
    // Trạng thái sắp giữ nguyên khi đổi trang; mỗi trang tự sắp riêng thì đây sẽ là ['1','3'] lần nữa
    // hoặc thứ tự gốc.
    expect(bodyRows().map((r) => r[1])).toEqual(['5', '7']);
  });

  it('bấm lần thứ ba trả về thứ tự gốc do máy chủ trả', () => {
    render();
    clickHeader('Tên');
    expect(bodyRows()[0][0]).toBe('An');
    clickHeader('Tên');
    expect(bodyRows()[0][0]).toBe('Em');
    clickHeader('Tên');
    expect(bodyRows().map((r) => r[0])).toEqual(['Cường', 'An', 'Đức', 'Bình', 'Em']);
  });

  it('defaultSort quyết định thứ tự ngay khi mở trang', () => {
    render({ defaultSort: { key: 'diem', dir: 'desc' } });
    expect(bodyRows()[0][1]).toBe('9');
  });

  it('tắt sortable cho cả bảng thì giữ nguyên thứ tự gốc', () => {
    render({ sortable: false });
    expect(headers().some((h) => h.classList.contains('sortable'))).toBe(false);
    expect(bodyRows()[0][0]).toBe('Cường');
  });

  it('bàn phím bấm được tiêu đề cột, không chỉ chuột', () => {
    render();
    const th = headers().find((h) => h.textContent?.includes('Điểm')) as HTMLElement;
    act(() => {
      th.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(bodyRows()[0][1]).toBe('1');
  });

  it('bảng phân trang ở máy chủ nói rõ là chỉ sắp trong trang', () => {
    render({ sortScope: 'page' });
    expect(host.querySelector('.ab-tbl-sortnote')).toBeNull();

    clickHeader('Điểm');
    const note = host.querySelector('.ab-tbl-sortnote');
    // Im lặng ở đây nghĩa là để người dùng tin dòng đầu bảng là lớn nhất của cả danh sách.
    expect(note?.textContent).toContain('trong phạm vi');
    expect(note?.textContent).toContain('Điểm');
  });

  it('chọn cả trang nhận đúng những dòng ĐANG HIỆN sau khi sắp', () => {
    let handed: Row[] = [];
    render({
      page: 0,
      perPage: 2,
      selected: new Set<string>(),
      onToggleAll: (visible) => { handed = visible; },
    });

    clickHeader('Điểm'); // tăng dần → hai dòng đầu là điểm 1 và 3
    const box = host.querySelector('thead input[type="checkbox"]') as HTMLInputElement;
    act(() => { box.click(); });

    // Trang tự cắt lại theo thứ tự cũ sẽ chọn nhầm sang hai dòng khác hẳn.
    expect(handed.map((r) => r.diem)).toEqual([1, 3]);
  });
});
