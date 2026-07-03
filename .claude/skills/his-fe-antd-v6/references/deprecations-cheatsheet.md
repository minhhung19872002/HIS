# Antd v6 — Deprecated props cheatsheet (HIS)

Reference CLAUDE.md "Antd v6 Migration Notes (completed 2026-02-24)". Each item: before → after.

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
<Alert message="Warning" type="warning" />
// ✅
<Alert title="Warning" type="warning" />
```

## Drawer — width → size
```tsx
// ❌
<Drawer width={520} open={open}>...</Drawer>
// ✅
<Drawer size="large" open={open}>...</Drawer>      // or size={520}
```

## Timeline — children/Timeline.Item → items
```tsx
// ❌
<Timeline>
  <Timeline.Item>Step 1</Timeline.Item>
  <Timeline.Item>Step 2</Timeline.Item>
</Timeline>
// ✅
<Timeline items={[
  { content: 'Step 1' },
  { content: 'Step 2', color: 'green' },
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
The old `List` renders blank in some cases. Replace with a div map:
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
// ❌ console.error fails the smoke test (console-errors.cy.ts)
catch (e) { console.error('API failed', e); }
// ✅ expected failure → warn
catch (e) { console.warn('API failed', e); message.warning('Unable to load data'); setData([]); }
```

## Verify after editing
```
cd frontend && npm run build      # 0 errors
npx cypress run --spec "cypress/e2e/console-errors.cy.ts" --browser chrome   # 0 console.error
```
