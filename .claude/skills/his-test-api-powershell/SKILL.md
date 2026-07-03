---
name: his-test-api-powershell
description: Use this skill when writing or modifying PowerShell test scripts (`test-*.ps1`) that exercise the HIS backend API at `localhost:5106`. Triggers include creating tests for Reception/OPD/IPD/Surgery/Billing/Pharmacy/Ward/Payment modules, login with admin/Admin@123, calling an API with a Bearer JWT, or parsing the response wrapper `data`/`items`/`value`.
metadata:
  type: project
---

# HIS API Test (PowerShell)

This skill standardizes how to write HIS API test scripts in PowerShell. The project has 21+ `test-*.ps1` files with the same pattern — each new script must follow it to run on Windows + reuse the existing helpers.

## When to use

- Creating a new `test-<module>.ps1` to smoke-test the API after adding an endpoint.
- Editing an existing script (`test-reception-full.ps1`, `test-ipd-flow.ps1`, `test-billing.ps1`, ...) when a DTO or route changes.
- Writing a multi-step E2E flow (register patient → exam → prescribe → pay) to run fast outside Cypress/Playwright.

## When NOT to use

- UI/route/flow tests in the browser (Cypress/Playwright) → `his-test-e2e`.
- Backend service/controller code → `his-be-module-scaffold` (this skill only tests, doesn't edit app code).

## Standard process

1. **Read the skeleton**: `references/test-script-template.ps1`. Copy it whole, change `<MODULE>` and the test steps.
2. **Identify the endpoint**: check `references/api-endpoints-cheatsheet.md` for the verified route + DTO. If not there → read the matching controller in `backend/src/HIS.API/Controllers/`.
3. **Place the file** at the project root: `C:\Source\HIS\test-<module>-<scenario>.ps1`. Do NOT put it in a subfolder, to keep convention with the 21 existing scripts.
4. **Test it**: `powershell -ExecutionPolicy Bypass -File .\test-<module>.ps1` (requires the backend running at `localhost:5106`).
5. **Output format**: each step is a `=== N. NAME ===` section in Cyan, success in Green, error in Red. Don't invent a different format.

## Mandatory conventions

### Login + headers
```powershell
$baseUrl = "http://localhost:5106"
$loginBody = @{ username = "admin"; password = "Admin@123" } | ConvertTo-Json
$loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
$token = $loginResponse.data.token
$headers = @{ Authorization = "Bearer $token" }
```

### Helper `Get-ResultItems` (MANDATORY, copy verbatim)
The HIS API returns different wrappers per endpoint: some return `{ data: [...] }`, some `{ items: [...] }`, some `{ value: [...] }`, some return a direct array. This helper normalizes them all:

```powershell
function Get-ResultItems($response) {
    if ($null -eq $response) { return @() }
    if ($response -is [System.Array]) { return $response }
    if ($response.PSObject.Properties.Name -contains "data" -and $null -ne $response.data) { return $response.data }
    if ($response.PSObject.Properties.Name -contains "items" -and $null -ne $response.items) { return $response.items }
    if ($response.PSObject.Properties.Name -contains "value" -and $null -ne $response.value) { return $response.value }
    return @($response)
}
```

### Chain steps via `$global:`
When step N needs an ID from step N-1 → save it to `$global:`:
```powershell
$global:newPatientId = $regData.patientId
$global:newAdmissionId = $regData.id
```

### Test marker for easy cleanup
```powershell
$testMarker = "[AUTO-REG]"
$patient.fullName = "$testMarker Patient $timestamp"
```
A name with the `[AUTO-REG]` prefix so test data is easy to filter/delete later with `DELETE FROM Patients WHERE FullName LIKE '%[AUTO-REG]%'`.

### Try/catch per step
Don't let one failed step crash the whole script. Wrap each `Invoke-RestMethod` in:
```powershell
try {
    $resp = Invoke-RestMethod -Uri "..." -Headers $headers
    Write-Host "SUCCESS" -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
```

### Section format
```powershell
Write-Host ""
Write-Host "=== 3. REGISTER NEW PATIENT (Dang ky vien phi) ===" -ForegroundColor Cyan
```
- English title + a no-diacritic Vietnamese annotation in parentheses (the Windows console often breaks Unicode).
- At the end of the script print `=== <MODULE> TEST COMPLETE ===` in Green.

## Pitfalls

- **Don't use `$response.data` directly** — different endpoints have different wrappers → use `Get-ResultItems`.
- **Don't hard-code a GUID** unless referencing already-seeded master data (room ID, department ID). When you need a dynamic ID → query first then pick the first item.
- **Console Unicode**: `Write-Host` with diacritic characters often breaks on Windows → use no-diacritic Vietnamese in logs (`Dang ky`, not the diacritic form).
- **Backend not running** → the script fails at step 1. Before running: `cd backend\src\HIS.API; dotnet run --launch-profile http`.
- **Token expires mid-run** → a long script (>30 min) must re-login. No script is that long yet, but remember.
- **Database state**: many tests write real data (Patients, Admissions, Receipts...). Clean up with the `[AUTO-REG]` filter after each run if you need to repeat.

## Reference

- `references/test-script-template.ps1` — a copy-paste-ready skeleton
- `references/api-endpoints-cheatsheet.md` — route + DTO verified from the 21 existing scripts

## When to update
- When the response parse helper (`Get-ResultItems`) or the login/headers convention changes.
