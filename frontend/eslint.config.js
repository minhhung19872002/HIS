import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    // #210 [QA-1] Bật guardrail chất lượng ở mức `warn` (KHÔNG phá `npm run lint` = eslint .,
    // không có --max-warnings). Dùng logger util (src/utils/logger.ts) thay console.log;
    // console.warn/error được phép (kênh cảnh báo/lỗi API-expected có chủ đích).
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  // UI-AUDIT #161 — lint-guard: chặn TÁI PHÁT hardcode mã màu hex trong v2 UI.
  // Ép dùng CSS token (var(--token)) đã định nghĩa ở terminal.css / ab-module.css,
  // để dark-mode (#158/#159) flip đúng. Mức `warn` (KHÔNG phá `npm run lint`) cho tới khi
  // #165 dọn hết ~270 hex residual off-palette → khi đó flip sang `error` + bỏ phần ignore.
  // Whitelist hợp lệ: đặt `// eslint-disable-next-line no-restricted-syntax -- <lý do>` ngay trên dòng
  // (chart series recharts, brand-color ngân hàng, print A4 màu giấy...).
  {
    files: ['src/pages-v2/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    ignores: [
      // Standalone portal — layout/theme riêng, cố ý hardcode, KHÔNG dùng token v2.
      'src/pages-v2/InspectorPortal.tsx',
      'src/pages-v2/PatientPortalStandalone.tsx',
      'src/pages-v2/KioskSelfService.tsx',
      // Biểu mẫu in A4 — màu giấy/mực cố định theo chuẩn in, không theme.
      'src/components/**/*Print*.tsx',
      'src/components/EMRPrintTemplates/**',
      'src/components/*PrintTemplates*.tsx',
      'src/components/PrintTemplateRenderer.tsx',
      'src/components/ClinicalFormPrintTemplates.tsx',
      // DICOM/medical-imaging overlay — màu công cụ chẩn đoán cố định, không theme.
      'src/components/CornerstoneViewer.tsx',
      'src/components/MprViewer.tsx',
      'src/components/MammoViewer.tsx',
      'src/components/MipMinIpViewer.tsx',
      'src/components/AiOverlayLayer.tsx',
      'src/components/CineControls.tsx',
      'src/components/DicomViewerConfig.tsx',
    ],
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          selector: "Literal[value=/#[0-9a-fA-F]{3,8}\\b/]",
          message:
            'Không hardcode mã màu hex trong v2 UI — dùng CSS token var(--token) (xem frontend/src/layouts/terminal/THEMING.md). Nếu thật sự cần (chart/brand/print) thêm: // eslint-disable-next-line no-restricted-syntax -- <lý do>.',
        },
        {
          selector: "TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}\\b/]",
          message:
            'Không hardcode mã màu hex (template string) trong v2 UI — dùng CSS token var(--token). Whitelist: // eslint-disable-next-line no-restricted-syntax -- <lý do>.',
        },
      ],
    },
  },
])
