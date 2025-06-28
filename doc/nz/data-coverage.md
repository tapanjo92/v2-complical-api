# New Zealand Compliance Data Coverage

## 🟡 Available Data (Limited Coverage)

### National Level - Inland Revenue Department (IRD)

| Tax Type | Description | Frequency | Due Dates | Status |
|----------|-------------|-----------|-----------|---------|
| **GST** | Goods and Services Tax (15%) | Monthly/2-Monthly/6-Monthly | 28th of following period | ⚠️ Basic |
| **PAYE** | Pay As You Earn | Monthly/Semi-monthly | 20th/5th & 20th | ⚠️ Basic |
| **Provisional Tax** | Income tax prepayments | 3 instalments | 28 Aug, 15 Jan, 7 May | ⚠️ Basic |
| **Income Tax (IR3)** | Individual tax returns | Annual | 7 July | ⚠️ Basic |
| **Company Tax (IR4)** | Company tax returns | Annual | Varies by balance date | ⚠️ Basic |
| **FBT** | Fringe Benefit Tax | Quarterly/Annual | Quarterly or 31 May | ⚠️ Basic |
| **KiwiSaver** | Employer contributions | Monthly | With PAYE | ⚠️ Basic |
| **ESCT** | Employer Superannuation Tax | Monthly | With PAYE | ⚠️ Basic |
| **Student Loan** | Employer deductions | Monthly | With PAYE | ⚠️ Basic |

## 📊 Coverage Statistics

- **Total NZ Deadlines**: 9 (Basic implementation only)
- **Agencies Covered**: 1 (IRD only)
- **Tax Types**: 9
- **Coverage Quality**: ⚠️ Minimal - dates only, no thresholds or rules

## 🔴 Critical Gaps in Current Implementation

| Issue | Current State | Required State |
|-------|---------------|----------------|
| **Filing Options** | Not captured | Need to support multiple filing frequencies |
| **Thresholds** | Missing | GST registration threshold ($60k), PAYE options |
| **Special Rules** | None | Ratio method, accounting basis options |
| **Industry Specific** | None | Construction, agriculture special provisions |
| **Balance Dates** | Generic only | Company-specific tax year ends |

## 🎯 Data Quality Assessment

| Criteria | Rating | Notes |
|----------|--------|-------|
| **Completeness** | 🔴 20% | Only basic federal taxes |
| **Accuracy** | 🟡 60% | Dates correct but lacks context |
| **Usefulness** | 🔴 30% | Missing critical business rules |
| **Coverage** | 🔴 15% | Federal only, no local compliance |