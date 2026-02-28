# Coding Conventions

**Analysis Date:** 2026-02-28

## Naming Patterns

**Files:**
- React components: PascalCase (e.g., `OPD.tsx`, `AuthContext.tsx`, `ClinicalTermSelector.tsx`, `NotificationBell.tsx`)
- API services: camelCase with module prefix (e.g., `patientApi`, `examinationApi`, `auth.ts`, `laboratory.ts`)
- Utilities: camelCase (e.g., `request.ts`, `client.ts`)
- Hooks: camelCase starting with `use` (e.g., `useKeyboardShortcuts.ts`)
- Contexts: PascalCase ending in `Context` (e.g., `AuthContext.tsx`, `NotificationContext.tsx`)
- Backend services: Interface `I[Module]Service`, Implementation `[Module]Service` (e.g., `IExaminationCompleteService`, `ExaminationCompleteService.cs`)
- Backend controllers: `[Module]Controller` (e.g., `AuthController.cs`, `ExaminationCompleteController.cs`)
- Database entities: PascalCase (e.g., `Patient.cs`, `Examination.cs`, `MedicalRecord.cs`)

**Functions:**
- Frontend: camelCase (e.g., `getWaitingRoomDisplayAsync`, `GetRoomPatientListAsync`)
- Backend: PascalCase async methods ending in `Async` (e.g., `GetWaitingRoomDisplayAsync`, `LoginAsync`, `VerifyOtpAsync`)
- Helper functions: camelCase, verbs first (e.g., `selectAntdOption`, `fillInputNumber`, `fillTextArea`)
- Custom hooks: `use[Functionality]` (e.g., `useKeyboardShortcuts`)

**Variables & State:**
- Frontend state variables: camelCase, descriptive names (e.g., `selectedRoomId`, `loadingRooms`, `examination`, `diagnoses`, `orders`)
- boolean flags: `is/has/can` prefix (e.g., `isLoading`, `isAuthenticated`, `hasPermission`, `canAccess`)
- DTOs: PascalCase with `Dto` suffix (e.g., `LoginResponseDto`, `PatientDto`, `ExaminationDto`, `WaitingRoomDisplayDto`)
- Backend private fields: `_camelCase` with underscore prefix (e.g., `_context`, `_authService`, `_examinationRepo`)
- Backend properties: PascalCase (e.g., `Success`, `Data`, `Message`, `Errors`)

**Types:**
- TypeScript interfaces: PascalCase starting with `I` optional but typically omitted in React (e.g., `AuthContextType`, `ShortcutConfig`, `OpdContextDto`)
- Enums: PascalCase (e.g., `PatientType`, `ExaminationStatus`)
- Generic type parameters: Single uppercase letter or `T` (e.g., `<T>` for generic responses)

## Code Style

**Formatting:**
- Tool: ESLint + Prettier (configured in `frontend/eslint.config.js` and `.prettierrc`)
- TypeScript version: Latest (configured in `frontend/tsconfig.json`)
- Indentation: 2 spaces (standard for JavaScript/TypeScript)
- Line length: No hard limit enforced but keep readable (~80-100 chars preferred)
- Quotes: Single quotes for strings in JavaScript/TypeScript
- Semicolons: Required at end of statements

**Linting:**
- Framework: ESLint 9.x with flat config (new format)
- Rules enabled:
  - `@eslint/js` recommended rules
  - `typescript-eslint` recommended rules
  - `eslint-plugin-react-hooks` recommended
  - `eslint-plugin-react-refresh` for Vite
- Key rules: No unused variables, proper React hooks dependency arrays, no console usage in production
- Console: Use `console.warn` for expected API failures (per project convention), `console.log` for debug only

**Backend (C#):**
- Namespace: `HIS.[Layer]` (e.g., `HIS.API`, `HIS.Application.Services`, `HIS.Infrastructure.Services`)
- Class organization: properties first, then methods, grouped by region `#region/#endregion`
- Async/await: All I/O operations use `async Task` pattern
- null handling: `?` nullable reference types enabled, `??` null-coalescing operator
- LINQ: Method syntax preferred over query syntax (e.g., `.Where(...).Select(...)` not `from x in` style)

## Import Organization

**Order (Frontend):**
1. React and core library imports (`import React`, `import { useState }`)
2. Third-party UI libraries (`import { Card, Button }` from `antd`)
3. Icons (`import { SaveOutlined }` from `@ant-design/icons`)
4. Type imports (`import type { ColumnsType }`)
5. Relative API imports (`import { patientApi }` from `../api/`)
6. Relative component/utility imports (`import BarcodeScanner`, `import { useKeyboardShortcuts }`)
7. CSS imports (if any)

**Path Aliases:**
- `@` alias resolves to `./src` (configured in `frontend/vite.config.ts`)
- Not widely used but available for centralized imports
- Relative imports (../) preferred in practice for clarity

**Backend (C#):**
1. System and standard library (`using System;`)
2. Third-party libraries (`using Microsoft.AspNetCore.Mvc;`)
3. Project namespaces (`using HIS.Application.DTOs;`)
4. Alias imports when needed (`using ServiceDto = HIS.Application.Services.ServiceDto;`)

## Error Handling

**Frontend Patterns:**
- API errors logged with `console.warn` (not `console.error`) for expected failures
- User feedback via `message.error()` for user-facing errors
- 401 Unauthorized: Auto-redirect to `/login`, clear tokens
- 403 Forbidden: Show "Bạn không có quyền" message
- 404 Not Found: Show "Không tìm thấy tài nguyên" message
- 422 Validation: Extract field errors from response and display
- 500 Server: Show "Lỗi máy chủ" message
- Network errors: Show "Không thể kết nối" message
- Cypress tests catch errors with `cy.on('uncaught:exception', () => false)` to avoid test failure

**Example (from `request.ts`):**
```typescript
request.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    message.error(error.response?.data?.message || 'Đã xảy ra lỗi');
    return Promise.reject(error);
  }
);
```

**Backend Patterns:**
- Validation errors: Return `BadRequest(ApiResponse<T>.Fail(message))`
- Not found: Return `NotFound(ApiResponse<T>.Fail(message))`
- Unauthorized: Return `Unauthorized(ApiResponse<LoginResponseDto>.Fail(message))`
- Success: Return `Ok(ApiResponse<T>.Ok(data, message))`
- Async operations use try-catch, return `null` or false on failure
- No throwing raw exceptions to client (always wrapped in ApiResponse)

**Example (from `AuthController.cs`):**
```csharp
var result = await _authService.LoginAsync(dto);
if (result == null)
    return Unauthorized(ApiResponse<LoginResponseDto>.Fail("Invalid username or password"));

return Ok(ApiResponse<LoginResponseDto>.Ok(result, result.RequiresOtp ? "OTP sent" : "Login successful"));
```

## Logging

**Framework:** Console methods (browser console)

**Patterns:**
- `console.warn()`: For expected API failures, network issues, non-critical problems
- `console.log()`: Debug information during development (removed before production)
- Cypress tests capture console.warn and console.error via `cy.on('window:before:load')` hook
- Ignored patterns: ResizeObserver loop, favicon.ico, AbortError, WebSocket connection errors

**Example (from test support):**
```typescript
const origError = win.console.error;
win.console.error = (...args: any[]) => {
  const msg = args.map((a) => String(a)).join(' ');
  if (!isIgnored(msg)) {
    cy.log(`CONSOLE ERROR: ${msg.substring(0, 150)}`);
  }
  origError.apply(win.console, args);
};
```

## Comments

**When to Comment:**
- Complex business logic (especially calculations, validations, transformations)
- Non-obvious performance optimizations
- Workarounds for bugs or quirks
- API/service integration details
- Data structure explanations

**JSDoc/TSDoc:**
- Backend: XML comments on public methods in services (`/// <summary>`, `/// <param>`, `/// <returns>`)
- Frontend: Minimal—self-documenting code preferred, add JSDoc for complex utilities and hooks
- Test comments: Use as test descriptions (e.g., `it('should fill vital signs tab')`)

**Example (from backend service):**
```csharp
/// <summary>
/// Lấy thông tin hiển thị màn hình chờ của phòng khám
/// </summary>
Task<WaitingRoomDisplayDto> GetWaitingRoomDisplayAsync(Guid roomId);
```

## Function Design

**Size:**
- Frontend components: 500-800 lines typical (OPD, Prescription are ~500 lines)
- Backend service methods: 20-50 lines typical, up to 100 for complex queries
- Helper functions: 10-30 lines, single responsibility

**Parameters:**
- Frontend: Use destructuring for props, object params preferred over many positional
- Backend: Explicit parameters, optional params use `?`, no out parameters
- DTOs for complex data transfer (e.g., `RegisterPatientDto` with multiple fields)

**Return Values:**
- Frontend async: `Promise<T | null>`, `Promise<boolean>` for success/failure
- Backend async: `Task<T?>`, `Task<bool>`, null/false indicates failure
- List returns: `List<T>` or `Task<List<T>>`, empty list for no results (not null)
- Nullable types: Use `T?` for optional return values

**Example (from service):**
```typescript
async function getWaitingRoomDisplay(roomId: string): Promise<WaitingRoomDisplayDto | null> {
  try {
    const response = await apiClient.get(`/examination/waiting-room/${roomId}`);
    return response.data;
  } catch {
    return null;
  }
}
```

## Module Design

**Exports:**
- Frontend: Named exports preferred (`export const Component = ...`), default export optional for pages
- Backend: Public classes with interfaces, internal classes with `internal` modifier
- Barrel files: Use in `api/` directory (e.g., `api/index.ts` re-exports multiple APIs)

**Barrel Files:**
- `frontend/src/api/` directory has no barrel file (direct imports preferred)
- Explicit imports: `import { patientApi } from '../api/patient'` (not `from '../api'`)

**Example (API export pattern):**
```typescript
// frontend/src/api/patient.ts
export const patientApi = {
  getPatient: (id: string) => apiClient.get(`/patient/${id}`),
  createPatient: (data: PatientDto) => apiClient.post('/patient', data),
};
```

## State Management

**Frontend:**
- React hooks (`useState`, `useContext`) for local state
- Context API for global state (Auth, Notifications)
- No Redux/MobX used
- Form state managed via Ant Design `Form.useForm()` with validation

**Backend:**
- Dependency Injection for services (constructor injection)
- EF Core DbContext for data access
- Stateless controllers and services
- UnitOfWork pattern for transaction management

**Example (React hooks):**
```typescript
const [selectedRoomId, setSelectedRoomId] = useState<string>('');
const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
const [examForm] = Form.useForm();
```

## Authorization & Permissions

**Frontend:**
- JWT token stored in `localStorage` (keys: `token`, `user`)
- Auth interceptor adds `Authorization: Bearer <token>` header
- Context provides `hasRole()` and `hasPermission()` helpers
- Protected routes use `ProtectedRoute` component wrapper

**Backend:**
- `[Authorize]` attribute on controllers/endpoints
- JWT bearer token validation
- Claims extracted via `User.FindFirstValue(ClaimTypes.NameIdentifier)`
- Role-based access via `[Authorize(Roles = "Admin")]`

---

*Convention analysis: 2026-02-28*
