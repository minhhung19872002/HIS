import React, { useEffect, useMemo, useState } from 'react';
import risApi from '../api/ris';
import type { HelpCategoryDto, HelpArticleDto, TroubleshootingDto } from '../api/ris';
import {
  KpiStrip, TopTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

type Tab = 'articles' | 'categories' | 'troubleshooting';
const TABS = [
  { v: 'articles' as Tab,        l: 'Bài viết',    ic: 'file-text' },
  { v: 'categories' as Tab,      l: 'Danh mục',    ic: 'archive' },
  { v: 'troubleshooting' as Tab, l: 'Sửa lỗi',     ic: 'alert' },
];

const PER = 18;

const HelpV2: React.FC = () => {
  const [tab, setTab] = useState<Tab>('articles');
  const [categories, setCategories] = useState<HelpCategoryDto[]>([]);
  const [articles, setArticles] = useState<HelpArticleDto[]>([]);
  const [troubleshooting, setTroubleshooting] = useState<TroubleshootingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fCat, setFCat] = useState('');
  const [page, setPage] = useState(0);
  const [selArt, setSelArt] = useState<HelpArticleDto | null>(null);
  const [selTrouble, setSelTrouble] = useState<TroubleshootingDto | null>(null);
  const [selCat, setSelCat] = useState<HelpCategoryDto | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [cats, arts, trbs] = await Promise.all([
        risApi.getHelpCategories(),
        risApi.searchHelpArticles({ keyword: search || undefined, page: 1, pageSize: 200 }),
        risApi.getTroubleshootingList(),
      ]);
      setCategories(cats.data || []);
      setArticles(arts.data?.items || []);
      setTroubleshooting(trbs.data || []);
    } catch { ti('Không tải được dữ liệu trợ giúp'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const catOpts = useMemo(() => categories.map((c) => ({ v: c.id, l: c.name })), [categories]);

  const filteredArticles = useMemo(() => {
    const k = search.trim().toLowerCase();
    return articles.filter((a) => {
      if (fCat && a.categoryId !== fCat) return false;
      if (!k) return true;
      return [a.title, a.summary, a.tags, a.categoryName]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [articles, search, fCat]);

  const filteredCategories = useMemo(() => {
    const k = search.trim().toLowerCase();
    if (!k) return categories;
    return categories.filter((c) =>
      [c.code, c.name, c.description].some((v) => (v || '').toLowerCase().includes(k))
    );
  }, [categories, search]);

  const filteredTroubleshooting = useMemo(() => {
    const k = search.trim().toLowerCase();
    if (!k) return troubleshooting;
    return troubleshooting.filter((t) =>
      [t.code, t.category, t.problem, t.solution].some((v) => (v || '').toLowerCase().includes(k))
    );
  }, [troubleshooting, search]);

  const totalPages = useMemo(() => {
    const len = tab === 'articles' ? filteredArticles.length
      : tab === 'categories' ? filteredCategories.length
      : filteredTroubleshooting.length;
    return Math.max(1, Math.ceil(len / PER));
  }, [tab, filteredArticles.length, filteredCategories.length, filteredTroubleshooting.length]);

  const pagedArticles = filteredArticles.slice(page * PER, (page + 1) * PER);
  const pagedCategories = filteredCategories.slice(page * PER, (page + 1) * PER);
  const pagedTroubleshooting = filteredTroubleshooting.slice(page * PER, (page + 1) * PER);

  const articleCols: ColumnDef<HelpArticleDto>[] = [
    { key: 'title', label: 'Tiêu đề', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.title}</div>
        {r.summary && <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.summary}</div>}
      </div>
    ) },
    { key: 'cat', label: 'Danh mục', render: (r) => (
      <StatusBadge tone="info">{r.categoryName || '—'}</StatusBadge>
    ) },
    { key: 'tags', label: 'Tags', render: (r) => r.tags
      ? <span style={{ fontSize: 11, color: 'var(--a-cy-text)' }}>{r.tags}</span>
      : <span style={{ color: 'var(--t-2)' }}>—</span>
    },
    { key: 'video', label: 'Video', render: (r) => r.videoUrl
      ? <StatusBadge tone="ok" dot>Có</StatusBadge>
      : <span style={{ color: 'var(--t-2)' }}>—</span>
    },
    { key: 'views', label: 'Lượt xem', mono: true, render: (r) => r.viewCount.toLocaleString('vi-VN') },
    { key: 'st', label: 'Trạng thái', render: (r) => r.isActive
      ? <StatusBadge tone="ok" dot>Hiển thị</StatusBadge>
      : <StatusBadge tone="warn" dot>Ẩn</StatusBadge>
    },
  ];

  const categoryCols: ColumnDef<HelpCategoryDto>[] = [
    { key: 'code', label: 'Mã', code: true, render: (r) => r.code },
    { key: 'name', label: 'Tên danh mục', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.name}</div>
        {r.description && <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.description}</div>}
      </div>
    ) },
    { key: 'order', label: 'Thứ tự', mono: true, render: (r) => r.sortOrder },
    { key: 'st', label: 'Trạng thái', render: (r) => r.isActive
      ? <StatusBadge tone="ok" dot>Hoạt động</StatusBadge>
      : <StatusBadge tone="warn" dot>Tắt</StatusBadge>
    },
  ];

  const troubleshootingCols: ColumnDef<TroubleshootingDto>[] = [
    { key: 'code', label: 'Mã', code: true, render: (r) => r.code },
    { key: 'cat', label: 'Loại', render: (r) => <StatusBadge tone="warn">{r.category}</StatusBadge> },
    { key: 'problem', label: 'Vấn đề', render: (r) => (
      <div style={{ fontWeight: 500 }}>{r.problem}</div>
    ) },
    { key: 'sol', label: 'Giải pháp', render: (r) => (
      <span style={{ fontSize: 12, color: 'var(--t-1)' }}>
        {r.solution.length > 80 ? r.solution.slice(0, 80) + '…' : r.solution}
      </span>
    ) },
    { key: 'st', label: 'Trạng thái', render: (r) => r.isActive
      ? <StatusBadge tone="ok" dot>Hiển thị</StatusBadge>
      : <StatusBadge tone="warn" dot>Ẩn</StatusBadge>
    },
  ];

  const totalViews = articles.reduce((s, a) => s + (a.viewCount || 0), 0);

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Bài viết', val: articles.length, sub: `${articles.filter((a) => a.isActive).length} hiển thị` },
        { lbl: 'Danh mục', val: categories.length, sub: 'phân loại', tone: 'info' },
        { lbl: 'Sửa lỗi', val: troubleshooting.length, sub: 'mục hướng dẫn', tone: 'warn' },
        { lbl: 'Tổng lượt xem', val: totalViews.toLocaleString('vi-VN'), sub: 'bài viết', tone: 'ok' },
      ]} />

      <TopTabs<Tab> tab={tab} setTab={(v) => { setTab(v); setPage(0); }} tabs={TABS} actions={
        <>
          <button className="ab-btn ghost" type="button" onClick={load}>
            <Ico name="refresh" size={12} /> Làm mới
          </button>
          <button className="ab-btn primary" type="button" onClick={() => tk(`Mở thêm ${tab}`)}>
            <Ico name="plus" size={12} /> Thêm mới
          </button>
        </>
      } />

      <div className="ab-toolbar" style={{ borderTop: 'none' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder={tab === 'articles' ? 'Tìm tiêu đề / tags / tóm tắt…'
            : tab === 'categories' ? 'Tìm tên danh mục / mã…'
            : 'Tìm vấn đề / giải pháp…'} />
        {tab === 'articles' && (
          <Filter value={fCat} onChange={setFCat} options={catOpts} placeholder="▾ Danh mục" />
        )}
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFCat(''); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={() => tk('Mở docs')}>
          <Ico name="archive" size={12} /> Tài liệu PDF
        </button>
      </div>

      {tab === 'articles' && <>
        <DataTable<HelpArticleDto>
          columns={articleCols} data={pagedArticles} rowKey={(r) => r.id}
          onRowClick={setSelArt}
          actions={(r) => (
            <div className="ab-actions">
              <ActBtn ic="eye" title="Đọc bài" onClick={() => setSelArt(r)} />
              {r.videoUrl && <ActBtn ic="play" title="Xem video" onClick={() => tk(`Mở video ${r.title}`)} />}
            </div>
          )}
          empty={loading ? 'Đang tải…' : 'Chưa có bài viết'}
        />
      </>}

      {tab === 'categories' && <>
        <DataTable<HelpCategoryDto>
          columns={categoryCols} data={pagedCategories} rowKey={(r) => r.id}
          onRowClick={setSelCat}
          actions={(r) => (
            <div className="ab-actions">
              <ActBtn ic="eye" title="Chi tiết" onClick={() => setSelCat(r)} />
              <ActBtn ic="edit" title="Sửa" onClick={() => tk(`Sửa ${r.name}`)} />
            </div>
          )}
          empty={loading ? 'Đang tải…' : 'Chưa có danh mục'}
        />
      </>}

      {tab === 'troubleshooting' && <>
        <DataTable<TroubleshootingDto>
          columns={troubleshootingCols} data={pagedTroubleshooting} rowKey={(r) => r.id}
          onRowClick={setSelTrouble}
          actions={(r) => (
            <div className="ab-actions">
              <ActBtn ic="eye" title="Xem" onClick={() => setSelTrouble(r)} />
            </div>
          )}
          empty={loading ? 'Đang tải…' : 'Chưa có hướng dẫn sửa lỗi'}
        />
      </>}

      <Pager page={page} setPage={setPage} totalPages={totalPages}
        total={tab === 'articles' ? filteredArticles.length : tab === 'categories' ? filteredCategories.length : filteredTroubleshooting.length}
        perPage={PER} />

      <DrawerShell
        open={!!selArt}
        onClose={() => setSelArt(null)}
        size="xl"
        title={selArt?.title || ''}
        sub={selArt ? `${selArt.categoryName || '—'} · ${selArt.viewCount.toLocaleString('vi-VN')} lượt xem` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSelArt(null)}>Đóng</button>
          {selArt?.videoUrl && (
            <button type="button" className="ab-btn" onClick={() => tk('Mở video')}>
              <Ico name="play" size={12} /> Xem video
            </button>
          )}
          <button type="button" className="ab-btn primary" onClick={() => tk('Đã in')}>
            <Ico name="print" size={12} /> In bài viết
          </button>
        </>}
      >
        {selArt && <>
          {selArt.summary && (
            <DrSec title="Tóm tắt">
              <div style={{ fontSize: 13, color: 'var(--t-1)', fontStyle: 'italic' }}>{selArt.summary}</div>
            </DrSec>
          )}
          <DrSec title="Nội dung">
            <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.6, color: 'var(--t-0)' }}>
              {selArt.content || 'Chưa có nội dung'}
            </div>
          </DrSec>
          {selArt.tags && (
            <DrSec title="Tags">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {selArt.tags.split(',').map((t, i) => (
                  <StatusBadge key={i} tone="info">{t.trim()}</StatusBadge>
                ))}
              </div>
            </DrSec>
          )}
        </>}
      </DrawerShell>

      <DrawerShell
        open={!!selTrouble}
        onClose={() => setSelTrouble(null)}
        size="lg"
        title={selTrouble?.problem || ''}
        sub={selTrouble ? `${selTrouble.code} · ${selTrouble.category}` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSelTrouble(null)}>Đóng</button>
          <button type="button" className="ab-btn primary" onClick={() => tk('Đã in')}>
            <Ico name="print" size={12} /> In hướng dẫn
          </button>
        </>}
      >
        {selTrouble && <>
          <DrSec title="Vấn đề">
            <div style={{ fontSize: 13, color: 'var(--t-0)', fontWeight: 500 }}>{selTrouble.problem}</div>
          </DrSec>
          <DrSec title="Giải pháp">
            <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.6, color: 'var(--t-1)' }}>
              {selTrouble.solution}
            </div>
          </DrSec>
          {selTrouble.steps && (
            <DrSec title="Các bước">
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.6, color: 'var(--t-1)' }}>
                {selTrouble.steps}
              </div>
            </DrSec>
          )}
        </>}
      </DrawerShell>

      <DrawerShell
        open={!!selCat}
        onClose={() => setSelCat(null)}
        size="md"
        title={selCat?.name || ''}
        sub={selCat?.code || ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSelCat(null)}>Đóng</button>
          <button type="button" className="ab-btn primary" onClick={() => tk('Mở chỉnh sửa')}>
            <Ico name="edit" size={12} /> Chỉnh sửa
          </button>
        </>}
      >
        {selCat && <>
          <DrSec title="Danh mục">
            <DrField lbl="Mã"><span style={{ fontFamily: 'var(--font-mono)' }}>{selCat.code}</span></DrField>
            <DrField lbl="Tên">{selCat.name}</DrField>
            <DrField lbl="Mô tả">{selCat.description || '—'}</DrField>
            <DrField lbl="Thứ tự"><span style={{ fontFamily: 'var(--font-mono)' }}>{selCat.sortOrder}</span></DrField>
            <DrField lbl="Trạng thái">
              {selCat.isActive
                ? <StatusBadge tone="ok" dot>Hoạt động</StatusBadge>
                : <StatusBadge tone="warn" dot>Tắt</StatusBadge>}
            </DrField>
          </DrSec>
        </>}
      </DrawerShell>
    </div>
  );
};

export default HelpV2;
