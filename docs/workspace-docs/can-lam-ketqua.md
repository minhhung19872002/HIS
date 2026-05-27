# Kết quả chuẩn hoá Shared Component V2

> Thực hiện theo `can-lam.md`. Nguyên tắc: **ưu tiên Antd base · chỉ wrap cần thiết · không đổi
> behavior/style hiện tại · không duplicate · config-driven options · backward compatible**.
> Vị trí kit: `frontend/src/pages-v2/_v2kit.tsx` (kit chuẩn V2, nạp CSS qua `layouts/terminal/ab-module.css`).

## 1. Danh sách shared component đã tạo (mới trong đợt này)

| Component | Base | Mục đích | Props/API chính |
|---|---|---|---|
| `Btn` | raw `<button class="ab-btn">` (giữ style terminal) | Chuẩn hoá **687 nút raw** rải khắp V2 | `variant` (default/primary/ghost/ok/crit), `size='sm'`, `icon`/`iconRight` (TermIcon), `loading`, `disabled`, `active`, `onClick`, `type`, `title` |
| `OptionsSelect` | Antd `Select` | Select **config-driven** (thay inline `<Option>`) | `options` (JSON), `fieldNames`, `multiple`, `showSearch`, `allowClear`, `loading`, `disabled`, `placeholder` |
| `RadioField` | Antd `Radio.Group` | Radio group config-driven | `options`, `fieldNames`, `optionType`, `disabled` |
| `CheckboxField` | Antd `Checkbox.Group` | Checkbox **group** config-driven (multiple) | `options`, `fieldNames`, `disabled` |
| `AutoCompleteField` | Antd `AutoComplete` | Gợi ý + **debounce** + datasource async | `options`, `fieldNames`, `onSearch`, `debounce`, `allowClear` |
| `AbSelect` | native `<select class="ab-sel">` (giữ style) | Select native cho modal ab-sel — config-driven, **0 đổi style** | `options`, `fieldNames`, `value/onChange`, `placeholder`, `disabled` |
| `normalizeOptions()` + `OptItem`/`OptFieldNames` | — | Helper map datasource thô → option chuẩn | label/value/disabled/group/children + **custom field name** |

### Đã có sẵn từ trước (kit chuẩn, tái dùng — không tạo lại)
`KpiStrip` · `TopTabs` · `StatusTabs` · `SearchBox` · `Filter` (select ab-sel toolbar) · `DataTable`
(thay `<table>` thuần) · `Pager` · `StatusBadge` · `ActBtn` (nút icon trong bảng) · `DrawerShell` ·
`ModalShell` · `DrSec`/`DrField` · `CrudModal` (form CRUD config-driven + validate + map lỗi BE→field) ·
`SimpleV2Page` · helper `tk/ti/tw/te/cf` · `fmtVNDg/fmtHMg/fmtDMYg/fmtDTg`.

## 2. Các variant thực tế đã cover

- **Button**: variant default/primary/ghost/ok/crit · size sm · có/không icon · iconRight · loading ·
  disabled · active · type submit/button · title tooltip → gói trong `Btn` (giữ nguyên class `ab-btn`).
- **Select**: single/multiple · search · clearable · group (optgroup) · loading async · disabled ·
  custom fieldNames (label/value khác tên) → `OptionsSelect`; bản native giữ style ab-sel → `AbSelect`;
  bản toolbar filter → `Filter` (sẵn có).
- **Radio**: option list config-driven, optionType button/default → `RadioField`.
  (Radio có style/mô tả riêng từng dòng → giữ Antd `Radio` trực tiếp, xem mục 4.)
- **Checkbox**: **group nhiều lựa chọn** → `CheckboxField`; **toggle boolean đơn** → giữ Antd `Checkbox`
  (đúng ngữ nghĩa, không gom nhầm thành group — xem mục 4).
- **AutoComplete**: gợi ý tĩnh (filter client) hoặc async (onSearch + debounce) → `AutoCompleteField`.
- **Form field (modal)**: text/textarea/number/password/switch/date + 4 type mới
  (select/multiselect/radio/checkbox/autocomplete) — khai báo bằng `CrudFieldCfg[]` (config-driven),
  validate (rules + scrollToFirstError) + **BE-authoritative** (`applyServerErrors` map lỗi server→field+focus).
- **Table / Tabs / Drawer / Modal / DatePicker / InputNumber**: dùng kit sẵn có (`DataTable`/`TopTabs`/
  `StatusTabs`/`DrawerShell`/`ModalShell` + Antd `DatePicker`/`InputNumber` trong `CrudModal`).

## 3. Page/module đã migrate

- **`CrudModal` (config-driven options)**: 19 page đang dùng field config thay vì option inline
  (17 page CRUD đợt trước + HealthCheckup/Reagent/…): toàn bộ Select/Radio/Checkbox trong modal CRUD
  giờ chạy qua `OptionsSelect/RadioField/CheckboxField` (1 nguồn render).
- **`AbSelect`**: `ZaloNotifications.tsx` (raw `<select>` → `AbSelect` config-driven, giữ style ab-sel).
- **`Btn` (reference migration)**: `TreatmentProtocol.tsx`, `FoodSafety.tsx` — toolbar + drawer footer
  buttons chuyển từ `<button class="ab-btn">` thuần → `<Btn variant icon>`, render markup **y hệt**
  (0 đổi style), gọn JSX ~50%.

## 4. Case CHƯA migrate / xử lý riêng (cố ý — "không replace cơ học")

| Trường hợp | Lý do giữ nguyên |
|---|---|
| `InspectorPortal.tsx` `<select>` + input inline | **Standalone portal light-theme** (style riêng `#cbd5e1`), KHÔNG thuộc design ab-* terminal → ép ab-sel sẽ vỡ giao diện. |
| `BiometricEnrollment.tsx` `<Radio.Group>` | Radio có style block + mô tả từng dòng (logic hiển thị đặc biệt), không phải option-list đơn thuần. |
| ~12 `<Checkbox>` đơn (CatalogsAdmin, DicomAutoSend, EmployeeProfile, Quality, ServiceRequeue…) | **Toggle boolean đơn** (không phải group) → Antd `Checkbox` lẻ là đúng ngữ nghĩa; gom vào `CheckboxField` sẽ sai logic. |
| ~680 nút `ab-btn` ở các page chưa đụng | An toàn migrate dần sang `<Btn>` (markup y hệt) — **gọi lại khi cần** theo đúng định hướng, không mass-replace cơ học để tránh rủi ro/đổi behavior. Pattern tham chiếu: `TreatmentProtocol.tsx`. |
| `_v2kit.tsx` `Filter` nội bộ dùng `<select class="ab-sel">` | Đây chính là component chuẩn (1 nơi định nghĩa) — không phải raw HTML rải rác. |

## 5. Cách dùng (tái sử dụng)

```tsx
import { Btn, OptionsSelect, RadioField, CheckboxField, AbSelect, type CrudFieldCfg } from './_v2kit';

// Nút
<Btn variant="primary" icon="plus" loading={saving} onClick={openCreate}>Thêm mới</Btn>

// Select config-driven (datasource + fieldNames tuỳ biến)
<OptionsSelect options={depts} fieldNames={{ value:'id', label:'name' }} multiple showSearch allowClear />

// Form CRUD khai báo bằng config (đã có validate + map lỗi BE)
const FIELDS: CrudFieldCfg[] = [
  { key:'name', label:'Tên', required:true },
  { key:'type', label:'Loại', type:'select', options:[{value:1,label:'A'},{value:2,label:'B'}] },
  { key:'tags', label:'Nhãn', type:'multiselect', options: tagList, fieldNames:{ value:'code', label:'title' } },
];
```
