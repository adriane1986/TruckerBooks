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

- Customer account creation
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
- Admin-created driver access invites
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
