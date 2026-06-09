# Release Notes

## v0.2.1

- Added monthly category budgets using the configured base currency.
- Added budget usage summaries in Budgets, Dashboard, Reports, and exports.

## v0.2.0

- Added Subscriptions management for recurring services, memberships, plans, insurance, and trials.
- Added subscription payment tracking with transaction linkage when a billing account is selected.
- Added Dashboard, Reports, and Settings export coverage for subscriptions and subscription payments.

## v0.1.1

- Corrected the default manual USD -> CNY rate from 7.20 to 6.77.
- Corrected the default manual CNY -> USD rate to `1 / 6.77` (about 0.14771049).
- The v0.1.1 migration may overwrite the existing USD -> CNY and CNY -> USD defaults to apply this correction. Other manually maintained exchange rates are not changed.
