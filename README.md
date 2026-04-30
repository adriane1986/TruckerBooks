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
- Silver, Gold, and Platinum subscription packages
- Truck limits by package:
  - Silver: 1 to 5 trucks
  - Gold: 6 to 10 trucks
  - Platinum: 11 to 20 trucks
- Admin-managed truck slots
- Admin-created driver access invites
- Affiliate Program tab
- Unique affiliate link generated for each customer
- One-time $10 commission tracking when a referred customer pays the first month
- Compliance tab for Insurance, DOT Physical, UCR, and 2290 uploads
- Compliance AI scanning for expiration dates
- Renewal alerts for expiring compliance documents
- IFTA deadline alerts for January, April, July, and October filings due by the last day of the month
- Rate Con and BOL document uploads
- Document library with download and delete actions
- Automatic document scanning for supported uploads
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
