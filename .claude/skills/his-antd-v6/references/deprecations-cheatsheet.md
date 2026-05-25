# Antd v6 — Deprecated props cheatsheet (HIS)

Tham chiếu CLAUDE.md "Antd v6 Migration Notes (completed 2026-02-24)". Mỗi mục: trước → sau.

## Space — direction → orientation
```tsx
// ❌
<Space direction="vertical">...</Space>
// ✅
<Space orientation="vertical">...</Space>
```

## Alert — message → title
```tsx
// ❌
<Alert message="Cảnh báo" type="warning" />
// ✅
<Alert title="Cảnh báo" type="warning" />
```

## Drawer — width → size
```tsx
// ❌
<Drawer width={520} open={open}>...</Drawer>
// ✅
<Drawer size="large" open={open}>...</Drawer>      // hoặc size={520}
```

## Timeline — children/Timeline.Item → items
```tsx
// ❌
<Timeline>
  <Timeline.Item>Bước 1</Timeline.Item>
  <Timeline.Item>Bước 2</Timeline.Item>
</Timeline>
// ✅
<Timeline items={[
  { content: 'Bước 1' },
  { content: 'Bước 2', color: 'green' },
]} />
```

## Tabs — tabPosition → tabPlacement
```tsx
// ❌
<Tabs tabPosition="left" items={items} />
// ✅
<Tabs tabPlacement="left" items={items} />
```

## Modal / Drawer — destroyOnClose → destroyOnHidden
```tsx
// ❌
<Modal destroyOnClose open={open}>...</Modal>
// ✅
<Modal destroyOnHidden open={open}>...</Modal>
```

## Statistic — valueStyle → styles.content
```tsx
// ❌
<Statistic value={42} valueStyle={{ color: '#cf1322' }} />
// ✅
<Statistic value={42} styles={{ content: { color: '#cf1322' } }} />
```

## List (deprecated component) → div-based custom
`List` cũ render trắng ở vài case. Thay bằng map div:
```tsx
// ❌
<List dataSource={items} renderItem={(it) => <List.Item>{it.name}</List.Item>} />
// ✅
<div className="custom-list">
  {items.map((it) => (
    <div key={it.id} className="custom-list-item">{it.name}</div>
  ))}
</div>
```

## Logging convention
```tsx
// ❌ console.error làm fail smoke test (console-errors.cy.ts)
catch (e) { console.error('API failed', e); }
// ✅ expected failure → warn
catch (e) { console.warn('API failed', e); message.warning('Không thể tải dữ liệu'); setData([]); }
```

## Verify sau khi sửa
```
cd frontend && npm run build      # 0 lỗi
npx cypress run --spec "cypress/e2e/console-errors.cy.ts" --browser chrome   # 0 console.error
```
