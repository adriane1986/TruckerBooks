# TruckerBooks Web App

TruckerBooks is now a local web app with a backend server.

## Run It

```powershell
npm start
```

Then open:

```text
http://localhost:3000
```

## What It Supports

- Company account registration with company name, DOT number, phone, address, subscription plan, first administrator, policy acceptance, and email verification
- Secure login with email/password, show/hide password, remember-me sessions, generic login errors, account-lock protection, session expiration, and logout from all devices
- NIST-aligned password rules: 12-character minimum, long passphrases supported, compromised/common password blocklist, no forced periodic password changes, hashed password storage, short-lived single-use reset links, and password-change notification records
- Multi-factor authentication for internal administrators, company owners/admins, billing/payroll-style users, and users with financial-data access; starts with authenticator apps, temporary email codes, and recovery codes
- Enterprise MFA roadmap: hardware security keys and company-wide enforced MFA
- Phase 1 predefined user roles for company users, drivers, and TruckerBooks internal access
- Drivers cannot create themselves as company administrators; they must be invited by an existing company account
- Customer sign-in and sign-out
- Password hashing on the server
- Private customer dashboards
- Owner-Operator, Small Fleet, Growth, and Growth Plus subscription packages
- Truck limits by package:
  - Owner-Operator: 1 truck at $49/month or $490/year
  - Small Fleet: 2 to 5 trucks at $139/month or $1,390/year
  - Growth: 6 to 10 trucks at $269/month or $2,690/year
  - Growth Plus: 11 to 20 trucks at $269/month plus $20 for each truck over 10; annual billing includes two months free
- Admin-managed truck slots
- Admin-created user invitations with employee name, email, role, custom permissions, expiration date, resend, and cancel controls
- Secure one-time invitation acceptance that requires the invited user to verify their email and set a password before the invitation expires
- Account Access administration table with user name, email, role, account status, last login, MFA status, invitation status, date added, who added the user, and access history
- Account Access actions for changing roles, resetting MFA, suspending/reactivating access, forcing password resets, signing users out, removing users, and preserving users with activity as deactivated audit records
- Company audit logs for successful and failed logins, password resets, MFA changes, invitations, role and permission changes, suspensions/reactivations, exports, integrations, financial approvals, document deletions, and support access
- Controlled support access with customer-approved time windows, revocation, named TruckerBooks support accounts, sensitive-data restriction, and audit logging
- Simplified driver mobile account for assigned loads, BOL/POD and receipt uploads, pickup/delivery details, expenses, detention or delay reports, settlement statements, limited profile updates, and the driver's own compliance expirations
- Driver backend responses exclude other drivers' pay, company-wide financial reports, customer financial information, administrative settings, and other drivers' personnel files
- Affiliate Program tab
- Unique affiliate link generated for each customer
- Referral program for fleets with 1 to 20 trucks
- Referrer reward tracking for one free month after a referred customer stays active for 60 days
- New customer referral discount tracking for 10% off the first three months
- Compliance tab for Insurance, DOT Physical, Clearinghouse MVR, UCR, and 2290 uploads
- Compliance AI scanning for expiration dates
- Renewal alerts for expiring compliance documents
- IFTA deadline alerts for January, April, July, and October filings due by the last day of the month
- Rate Con and BOL document uploads
- Document library with download and delete actions
- Automatic document scanning for supported uploads
- Real AI document extraction when `OPENAI_API_KEY` is configured
- Auto-populated trip drafts from scanned Rate Cons and BOLs when route, load, rate, or mileage is detected
- Trips, expenses, invoices, maintenance, and reports per customer
- Exporting each customer's records as JSON

## Phase 1 User Roles

| Role | Recommended access |
| --- | --- |
| Company Owner | Full company access, billing, users, reports, and integrations |
| Company Administrator | Manage users, drivers, trucks, documents, and settings |
| Dispatcher | Loads, drivers, trucks, dispatch, and shipment documents |
| Bookkeeper/Accountant | Income, expenses, invoices, reports, and financial documents |
| Payroll Manager | Driver settlements, pay records, and approved payroll data |
| Compliance Manager | Driver files, expirations, and compliance documents |
| Driver | Own loads, documents, expenses, and settlement statements |
| Read-Only User | View permitted records without editing |
| TruckerBooks Support | Limited, approved support access |
| TruckerBooks Super Admin | Internal platform administration only |

Roles are presets. Access is enforced through individual permissions underneath each role, including:

- View loads
- Create loads
- Edit loads
- Assign drivers
- View financial information
- Create invoices
- Approve expenses
- Process settlements
- View payroll
- Manage company users
- Manage integrations
- Change subscription
- Export reports
- Delete documents
- View driver qualification files

Company owners can customize permissions for office users when creating account access. Driver permissions are restricted to the driver's own authorized records and cannot be expanded through the office-user permission editor.

## Company Data Separation

Every company account has a stable `companyId`. Company-owned records are stamped with that `companyId`, including drivers, trucks, loads, expenses, invoices, maintenance records, uploaded documents, compliance records, support issues, route history, and carrier packet share tokens.

The backend normalizes legacy records into the owning company scope and filters out nested records whose `companyId` does not match the signed-in company. API handlers read, edit, delete, download, export, and share records only from the current company account. This separation is enforced in server/database logic, not only by hiding screens in the browser.

## Audit Logs

The backend records security and access events in `auditLogs` inside `data/truckerbooks-db.json`. Each audit entry includes the user, company, action, status, date and time, IP address, browser/device user agent, affected record, and a short detail message.

Company administrators with the `manageCompanyUsers` permission can retrieve the company-scoped audit trail from:

```text
GET /api/audit-logs
```

Drivers cannot view audit logs, and each company only receives entries whose `companyId` matches its own account.

## Support Access

TruckerBooks support employees use separate named accounts configured in `SUPPORT_USERS`; do not use a shared support administrator login. Each configured support account needs its own email and password hash.

Customers approve support access from the Support screen or through:

```text
POST /api/support/access-grants
```

Support grants are limited to 1 to 72 hours, can keep sensitive financial and payroll data restricted, and can be revoked by the customer at:

```text
POST /api/support/access-grants/:id/revoke
```

Named support users can sign in through `/api/support/login` and can only view customer details through `/api/support/customers/:id` when the customer has an active, unexpired grant. Support access and revocation are recorded in the audit log with the named support user, company, IP address, browser/device, affected grant, and timestamp.

## Data Storage

Customer accounts and records are stored on the server in:

```text
data/truckerbooks-db.json
```

Uploaded Rate Cons and BOLs are stored in:

```text
data/uploads
```

This is a real backend-backed local app. For real public customer use, the next step is deploying it with HTTPS and a managed database.

## AI Scanner Setup

For real AI scanning, set this environment variable in Railway:

```text
OPENAI_API_KEY=your_openai_api_key
```

Optional:

```text
OPENAI_MODEL=gpt-5-mini
```

Without `OPENAI_API_KEY`, the app falls back to local OCR/text parsing for testing.

## Owner Login Password Hash

Set `OWNER_PASSWORD_HASH` instead of a readable owner password. Customer and partner passwords are also stored as hashes only.
