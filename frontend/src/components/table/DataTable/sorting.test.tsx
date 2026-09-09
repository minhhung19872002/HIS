import React from 'react';
import { describe, expect, it } from 'vitest';
import { cellSortKey, nextSort, nodeText, sortRows, type SortableColumn } from './sorting';

/**
 * Bộ máy sắp xếp dùng chung cho 176 bảng của HIS.
 *
 * Bộ kiểm này canh đúng những chỗ mà một hàm so sánh "ngây thơ" sẽ sai và cái sai đó rất khó nhìn
 * ra bằng mắt: ngày kiểu Việt Nam đọc nhầm thành số, tiền "1.234.567" đọc nhầm thành 1.234, ô trống
 * nổi lên đầu khi sắp giảm dần, và chữ có dấu xếp sai thứ tự bảng chữ cái tiếng Việt.
 */

const col = <T,>(c: SortableColumn<T>) => c;
const order = <T,>(rows: T[], columns: SortableColumn<T>[], key: string, dir: 'asc' | 'desc') =>
  sortRows(rows, columns, { key, dir }).map((r) => (r as { id: string }).id);

describe('nodeText — lấy chữ người dùng thật sự nhìn thấy', () => {
  it('gộp chữ từ JSX lồng nhiều lớp', () => {
    const cell = (
      <div>
        <div>Nguyễn Văn A</div>
        <div>📞 0399166923</div>
      </div>
    );
    expect(nodeText(cell)).toBe('Nguyễn Văn A 📞 0399166923');
  });

  it('bỏ qua null/false/undefined thay vì in ra chữ "false"', () => {
    expect(nodeText(<span>{null}{false}{undefined}Hà Nội</span>)).toBe('Hà Nội');
  });

  it('trả chuỗi rỗng cho ô chỉ có biểu tượng, không có chữ', () => {
    expect(nodeText(<img src="x.png" alt="" />)).toBe('');
  });
});

describe('ngày tháng — phải so theo mốc thời gian, không so theo chữ', () => {
  const rows = [
    { id: 'b', when: '09/09/2026' },
    { id: 'a', when: '20/09/2026' },
    { id: 'c', when: '08/11/2026' },
  ];
  const cols = [col<typeof rows[0]>({ key: 'when', render: (r) => r.when })];

  it('"08/11" là tháng 11, không phải "nhỏ hơn 09/09"', () => {
    // So bằng chữ thì "08/11/2026" < "09/09/2026" < "20/09/2026" — sai hoàn toàn.
    expect(order(rows, cols, 'when', 'asc')).toEqual(['b', 'a', 'c']);
  });

  it('giảm dần là đảo đúng chiều', () => {
    expect(order(rows, cols, 'when', 'desc')).toEqual(['c', 'a', 'b']);
  });

  it('ngày kèm giờ tách được hai lịch cùng ngày', () => {
    const same = [
      { id: 'chieu', when: '20/09/2026 14:30' },
      { id: 'sang', when: '20/09/2026 07:30' },
    ];
    expect(order(same, [col<typeof same[0]>({ key: 'when', render: (r) => r.when })], 'when', 'asc'))
      .toEqual(['sang', 'chieu']);
  });

  it('giờ trần HH:mm cũng so được', () => {
    const hours = [{ id: 'muon', t: '13:05' }, { id: 'som', t: '09:45' }];
    expect(order(hours, [col<typeof hours[0]>({ key: 't', render: (r) => r.t })], 't', 'asc'))
      .toEqual(['som', 'muon']);
  });
});

describe('số và tiền kiểu Việt Nam', () => {
  it('"1.234.567" là hơn một triệu, không phải 1.234', () => {
    const rows = [
      { id: 'nho', tien: '900.000 ₫' },
      { id: 'to', tien: '1.234.567 ₫' },
    ];
    const cols = [col<typeof rows[0]>({ key: 'tien', render: (r) => r.tien })];
    expect(order(rows, cols, 'tien', 'desc')).toEqual(['to', 'nho']);
  });

  it('dấu chấm thập phân không bị bỏ nhầm thành phân nhóm nghìn', () => {
    const rows = [{ id: 'cao', v: '12.5' }, { id: 'thap', v: '9.8' }];
    const cols = [col<typeof rows[0]>({ key: 'v', render: (r) => r.v })];
    expect(order(rows, cols, 'v', 'asc')).toEqual(['thap', 'cao']);
  });

  it('phần trăm so theo trị số', () => {
    const rows = [{ id: 'b', p: '9%' }, { id: 'a', p: '100%' }];
    const cols = [col<typeof rows[0]>({ key: 'p', render: (r) => r.p })];
    expect(order(rows, cols, 'p', 'desc')).toEqual(['a', 'b']);
  });

  it('số nằm trong mã được so theo trị số, không so từng ký tự', () => {
    // "A-10" so từng ký tự thì đứng TRƯỚC "A-9" vì '1' < '9'.
    const rows = [{ id: 'muoi', m: 'A-10' }, { id: 'chin', m: 'A-9' }];
    const cols = [col<typeof rows[0]>({ key: 'm', render: (r) => r.m })];
    expect(order(rows, cols, 'm', 'asc')).toEqual(['chin', 'muoi']);
  });
});

describe('ô trống luôn nằm cuối, dù sắp tăng hay giảm', () => {
  const rows = [
    { id: 'trong', v: '—' },
    { id: 'co', v: 'Khoa Khám bệnh' },
    { id: 'rong', v: '' },
  ];
  const cols = [col<typeof rows[0]>({ key: 'v', render: (r) => r.v })];

  it('sắp tăng: dòng có dữ liệu lên trước', () => {
    expect(order(rows, cols, 'v', 'asc').slice(0, 1)).toEqual(['co']);
  });

  it('sắp giảm: ô "—" KHÔNG được nổi lên đầu', () => {
    // Đây là lỗi kinh điển: đảo dấu hàm so sánh thì ô trống trôi lên đầu và cả cột thành vô dụng.
    expect(order(rows, cols, 'v', 'desc')[0]).toBe('co');
  });
});

describe('chữ tiếng Việt', () => {
  it('xếp theo bảng chữ cái tiếng Việt, không theo mã ký tự', () => {
    const rows = [{ id: 'd', n: 'Đặng' }, { id: 'a', n: 'An' }, { id: 'b', n: 'Bình' }];
    const cols = [col<typeof rows[0]>({ key: 'n', render: (r) => r.n })];
    expect(order(rows, cols, 'n', 'asc')).toEqual(['a', 'b', 'd']);
  });
});

describe('nguồn giá trị so sánh', () => {
  it('ưu tiên sortValue do cột tự khai hơn chữ hiển thị', () => {
    // Ô hiện chữ tương đối ("3 ngày trước") nhưng phải sắp theo mốc thật.
    const rows = [
      { id: 'cu', ts: 1000, hien: '3 ngày trước' },
      { id: 'moi', ts: 9000, hien: '1 giờ trước' },
    ];
    const cols = [col<typeof rows[0]>({ key: 'x', render: (r) => r.hien, sortValue: (r) => r.ts })];
    expect(order(rows, cols, 'x', 'desc')).toEqual(['moi', 'cu']);
  });

  it('không có render thì đọc thẳng trường cùng tên với key', () => {
    const rows = [{ id: 'b', stt: 12 }, { id: 'a', stt: 3 }];
    const cols = [col<typeof rows[0]>({ key: 'stt' })];
    expect(order(rows, cols, 'stt', 'asc')).toEqual(['a', 'b']);
  });

  it('key của cột không cần trùng tên trường trong dữ liệu', () => {
    // Cột 'pt' dựng từ hai trường khác — đọc theo key sẽ ra undefined, phải đọc chữ đã hiển thị.
    const rows = [
      { id: 'b', ten: 'Bình', sdt: '0900000002' },
      { id: 'a', ten: 'An', sdt: '0900000001' },
    ];
    const cols = [col<typeof rows[0]>({
      key: 'pt',
      render: (r) => <div><div>{r.ten}</div><div>{r.sdt}</div></div>,
    })];
    expect(order(rows, cols, 'pt', 'asc')).toEqual(['a', 'b']);
  });

  it('sortValue trả Date so được', () => {
    const rows = [
      { id: 'sau', d: new Date('2026-09-20T00:00:00Z') },
      { id: 'truoc', d: new Date('2026-09-09T00:00:00Z') },
    ];
    const cols = [col<typeof rows[0]>({ key: 'd', sortValue: (r) => r.d })];
    expect(order(rows, cols, 'd', 'asc')).toEqual(['truoc', 'sau']);
  });

  it('cellSortKey đánh dấu null là ô trống', () => {
    expect(cellSortKey({ key: 'x', sortValue: () => null }, {}).blank).toBe(true);
  });
});

describe('giữ nguyên thứ tự gốc khi không sắp', () => {
  const rows = [{ id: 'c' }, { id: 'a' }, { id: 'b' }];
  const cols = [col<typeof rows[0]>({ key: 'id' })];

  it('sort = null thì trả nguyên mảng vào', () => {
    expect(sortRows(rows, cols, null)).toBe(rows);
  });

  it('cột không tồn tại thì không đụng gì tới thứ tự', () => {
    expect(sortRows(rows, cols, { key: 'khong-co', dir: 'asc' })).toBe(rows);
  });

  it('hai dòng bằng nhau thì giữ thứ tự cũ (sắp ổn định)', () => {
    const dup = [{ id: 'x', v: 'A' }, { id: 'y', v: 'A' }, { id: 'z', v: 'A' }];
    const c = [col<typeof dup[0]>({ key: 'v', render: (r) => r.v })];
    expect(order(dup, c, 'v', 'desc')).toEqual(['x', 'y', 'z']);
  });
});

describe('vòng bấm tiêu đề cột', () => {
  it('tăng → giảm → bỏ sắp', () => {
    const a = nextSort(null, 'ten');
    expect(a).toEqual({ key: 'ten', dir: 'asc' });
    const b = nextSort(a, 'ten');
    expect(b).toEqual({ key: 'ten', dir: 'desc' });
    // Nấc thứ ba phải trả về thứ tự gốc — nhiều bảng có thứ tự mặc định mang nghĩa nghiệp vụ.
    expect(nextSort(b, 'ten')).toBeNull();
  });

  it('bấm sang cột khác thì bắt đầu lại từ tăng dần', () => {
    expect(nextSort({ key: 'ten', dir: 'desc' }, 'ngay')).toEqual({ key: 'ngay', dir: 'asc' });
  });
});
