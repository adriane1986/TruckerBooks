const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "layout-dashboard", eyebrow: "Business snapshot" },
  { id: "affiliate", label: "Affiliate Program", icon: "share", eyebrow: "Referral growth" },
  { id: "compliance", label: "Compliance", icon: "shield", eyebrow: "Renewals and filings" },
  { id: "expenses", label: "Expenses", icon: "receipt", eyebrow: "Deductions and costs" },
  { id: "rateCons", label: "Rate Cons/BOLs", icon: "upload", eyebrow: "Load documents" },
  { id: "reports", label: "Reports", icon: "bar-chart", eyebrow: "Profit and tax summary" },
  { id: "userManagement", label: "User Management", icon: "users", eyebrow: "Subscription and access" }
];

const icons = {
  "layout-dashboard": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>',
  route: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7H7a3.5 3.5 0 0 1 0-7h11"/><circle cx="18" cy="5" r="3"/></svg>',
  receipt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
  "file-text": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>',
  wrench: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a4 4 0 0 0-5 5L3 18v3h3l6.7-6.7a4 4 0 0 0 5-5l-2.9 2.9-3-3Z"/></svg>',
  "bar-chart": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 16V9M12 16V5M17 16v-3"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3Z"/><path d="m9 12 2 2 4-5"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.8 6.8-4.6M8.6 13.2l6.8 4.6"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5v14"/></svg>',
  save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  "log-out": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>'
};

const sampleData = {
  trips: [
    { id: crypto.randomUUID(), date: "2026-04-03", description: "Fresh produce load", origin: "Savannah, GA", destination: "Nashville, TN", miles: 498, amount: 2450, status: "Paid" },
    { id: crypto.randomUUID(), date: "2026-04-12", description: "Dry van retail freight", origin: "Charlotte, NC", destination: "Columbus, OH", miles: 430, amount: 1985, status: "Pending" },
    { id: crypto.randomUUID(), date: "2026-04-23", description: "Machinery parts", origin: "Detroit, MI", destination: "Birmingham, AL", miles: 738, amount: 3320, status: "Scheduled" }
  ],
  expenses: [
    { id: crypto.randomUUID(), date: "2026-04-04", description: "Fuel - I-75 stop", amount: 612.44, category: "Fuel", status: "Paid" },
    { id: crypto.randomUUID(), date: "2026-04-08", description: "Truck insurance", amount: 890, category: "Insurance", status: "Paid" },
    { id: crypto.randomUUID(), date: "2026-04-20", description: "Scale ticket and tolls", amount: 76.8, category: "Road costs", status: "Paid" }
  ],
  invoices: [
    { id: crypto.randomUUID(), date: "2026-04-05", description: "Invoice 1042 - Coastal Foods", amount: 2450, status: "Paid" },
    { id: crypto.randomUUID(), date: "2026-04-13", description: "Invoice 1043 - Northline Logistics", amount: 1985, status: "Pending" }
  ],
  maintenance: [
    { id: crypto.randomUUID(), date: "2026-04-09", description: "Oil change and inspection", amount: 385, status: "Paid" },
    { id: crypto.randomUUID(), date: "2026-04-28", description: "Steer tire replacement", amount: 925, status: "Scheduled" }
  ]
};

const state = {
  view: "dashboard",
  query: "",
  status: "All",
  authMode: "signin",
  customer: null,
  records: structuredClone(sampleData),
  documents: [],
  complianceDocuments: [],
  complianceAlerts: [],
  scannerStatus: null,
  accountMessage: ""
};

const complianceTypes = {
  insurance: "Insurance",
  dotPhysical: "DOT Physical",
  ucr: "UCR",
  form2290: "2290"
};

const subscriptionPlans = {
  silver: { id: "silver", name: "Silver Package", minTrucks: 1, maxTrucks: 5, monthlyPrice: 49, annualPrice: 499 },
  gold: { id: "gold", name: "Gold Package", minTrucks: 6, maxTrucks: 10, monthlyPrice: 99, annualPrice: 999 },
  platinum: { id: "platinum", name: "Platinum Package", minTrucks: 11, maxTrucks: 20, monthlyPrice: 179, annualPrice: 1799 }
};

const authScreen = document.querySelector("#authScreen");
const appShell = document.querySelector("#appShell");
const authForm = document.querySelector("#authForm");
const authError = document.querySelector("#authError");
const authSubmit = document.querySelector("#authSubmit");
const content = document.querySelector("#content");
const navList = document.querySelector("#navList");
const sectionTitle = document.querySelector("#sectionTitle");
const sectionEyebrow = document.querySelector("#sectionEyebrow");
const customerName = document.querySelector("#customerName");
const customerFile = document.querySelector("#customerFile");
const dialog = document.querySelector("#entryDialog");
const entryForm = document.querySelector("#entryForm");
const entryType = document.querySelector("#entryType");
const referralCodeInput = document.querySelector("#referralCode");
const incomingReferralCode = new URLSearchParams(location.search).get("ref") || "";
if (referralCodeInput) referralCodeInput.value = incomingReferralCode;

function cloneStarterRecords() {
  return structuredClone(sampleData);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "same-origin",
    ...options
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(payload.error || "Something went wrong.");
  }
  return payload;
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function setAuthMode(mode) {
  state.authMode = mode;
  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.authMode === mode);
  });
  document.querySelectorAll(".signup-only").forEach((field) => {
    field.style.display = mode === "signup" ? "grid" : "none";
  });
  authSubmit.textContent = mode === "signup" ? "Create Account" : "Sign In";
  authError.textContent = "";
}

function showDashboard(account, records) {
  state.customer = account;
  state.records = records ?? cloneStarterRecords();
  state.documents = account.documents || [];
  state.complianceDocuments = account.complianceDocuments || [];
  state.complianceAlerts = account.complianceAlerts || [];
  authScreen.classList.add("hidden");
  appShell.classList.remove("hidden");
  customerName.textContent = account.businessName;
  customerFile.textContent = `${account.businessName} - 2026`;
  setView("dashboard");
}

async function restoreSession() {
  try {
    const payload = await api("/api/session");
    showDashboard(payload.customer, payload.records);
  } catch {
    setAuthMode("signin");
  }
}

async function signOut() {
  await api("/api/logout", { method: "POST" });
  state.customer = null;
  state.records = cloneStarterRecords();
  state.documents = [];
  state.complianceDocuments = [];
  state.complianceAlerts = [];
  appShell.classList.add("hidden");
  authScreen.classList.remove("hidden");
  authForm.reset();
  setAuthMode("signin");
}

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value || 0);
}

function number(value) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

function sum(items, field = "amount") {
  return items.reduce((total, item) => total + Number(item[field] || 0), 0);
}

function allExpenses() {
  return [...state.records.expenses, ...state.records.maintenance];
}

function netProfit() {
  return sum(state.records.trips) - sum(allExpenses());
}

function renderIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((node) => {
    node.innerHTML = icons[node.dataset.icon] || "";
  });
}

function renderNav() {
  navList.innerHTML = navItems.map((item) => `
    <button class="nav-button ${state.view === item.id ? "active" : ""}" type="button" data-view="${item.id}">
      <span data-icon="${item.icon}"></span>
      ${item.label}
    </button>
  `).join("");
  renderIcons(navList);
}

function setView(view) {
  state.view = view;
  const meta = navItems.find((item) => item.id === view);
  sectionTitle.textContent = meta.label;
  sectionEyebrow.textContent = meta.eyebrow;
  renderNav();
  renderContent();
}

function metric(label, value, delta, icon) {
  return `
    <article class="metric-card">
      <header><span>${label}</span><span data-icon="${icon}"></span></header>
      <strong>${value}</strong>
      <span class="delta">${delta}</span>
    </article>
  `;
}

function renderDashboard() {
  const revenue = sum(state.records.trips);
  const expenses = sum(allExpenses());
  const miles = sum(state.records.trips, "miles");
  const nextAlert = state.complianceAlerts?.[0];
  content.innerHTML = `
    <div class="metric-grid">
      ${metric("Gross revenue", money(revenue), "+12% from last month", "file-text")}
      ${metric("Net profit", money(netProfit()), "After tracked deductions", "bar-chart")}
      ${metric("Loaded miles", number(miles), `${money(revenue / Math.max(miles, 1))} per mile`, "route")}
      ${metric("Compliance", state.complianceAlerts?.length || 0, nextAlert ? `${nextAlert.label} due ${formatDate(nextAlert.date)}` : "No urgent renewals", "shield")}
    </div>
    <div class="dashboard-grid">
      <section class="panel">
        <div class="panel-header"><h2>Active Route</h2><span class="status Scheduled">Scheduled</span></div>
        <div class="route-map">
          <div class="route-line"></div>
          <div class="route-stop start"></div>
          <div class="route-stop end"></div>
          <div class="truck-visual" aria-label="Truck route visual"></div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-header"><h2>Recent Activity</h2><button class="chip-button" type="button" data-view-shortcut="rateCons">Rate Cons/BOLs</button></div>
        <div class="panel-body">
          <div class="list">
            ${recentActivity().map(listItem).join("")}
          </div>
        </div>
      </section>
    </div>
  `;
}

function recentActivity() {
  return [
    ...state.records.trips.map((item) => ({ ...item, source: "Trip" })),
    ...state.records.expenses.map((item) => ({ ...item, source: "Expense" })),
    ...state.records.maintenance.map((item) => ({ ...item, source: "Maintenance" }))
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
}

function listItem(item) {
  return `
    <article class="list-item">
      <div>
        <strong>${item.description}</strong>
        <span>${item.source || item.origin || item.category} · ${formatDate(item.date)}</span>
      </div>
      <div>
        <div class="amount">${money(item.amount)}</div>
        <span class="status ${item.status}">${item.status}</span>
      </div>
    </article>
  `;
}

function formatDate(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function renderTableView(collection, title, columns) {
  const rows = filtered(state.records[collection]);
  content.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <h2>${title}</h2>
        <div class="filters">
          <input id="searchInput" type="search" value="${state.query}" placeholder="Search records" />
          <select id="statusFilter">
            ${["All", "Paid", "Pending", "Scheduled"].map((value) => `<option ${state.status === value ? "selected" : ""}>${value}</option>`).join("")}
          </select>
        </div>
      </div>
      <table class="data-table">
        <thead>
          <tr>${columns.map((column) => `<th>${column.label}</th>`).join("")}<th></th></tr>
        </thead>
        <tbody>
          ${rows.map((item) => `
            <tr>
              ${columns.map((column) => `<td>${column.render(item)}</td>`).join("")}
              <td>
                <div class="table-actions">
                  <button class="icon-button" type="button" data-delete="${item.id}" title="Delete" aria-label="Delete">
                    <span data-icon="trash"></span>
                  </button>
                </div>
              </td>
            </tr>
          `).join("") || `<tr><td colspan="${columns.length + 1}">No records match this view.</td></tr>`}
        </tbody>
      </table>
    </section>
  `;
}

function filtered(items) {
  return items.filter((item) => {
    const haystack = Object.values(item).join(" ").toLowerCase();
    const matchesQuery = haystack.includes(state.query.toLowerCase());
    const matchesStatus = state.status === "All" || item.status === state.status;
    return matchesQuery && matchesStatus;
  });
}

function renderReports() {
  const revenue = sum(state.records.trips);
  const expenses = sum(allExpenses());
  const categories = [
    { label: "Fuel", value: sum(state.records.expenses.filter((item) => item.category === "Fuel")) },
    { label: "Insurance", value: sum(state.records.expenses.filter((item) => item.category === "Insurance")) },
    { label: "Maintenance", value: sum(state.records.maintenance) },
    { label: "Road costs", value: sum(state.records.expenses.filter((item) => item.category === "Road costs")) }
  ];
  const maxCategory = Math.max(...categories.map((item) => item.value), 1);

  content.innerHTML = `
    <div class="report-grid">
      ${metric("Revenue", money(revenue), "Trips entered", "file-text")}
      ${metric("Deductible costs", money(expenses), "Expenses + service", "receipt")}
      ${metric("Estimated taxable", money(Math.max(netProfit(), 0)), "Before other adjustments", "bar-chart")}
    </div>
    <section class="panel">
      <div class="panel-header"><h2>Expense Breakdown</h2><span class="muted">Current records</span></div>
      <div class="panel-body">
        <div class="bar-list">
          ${categories.map((item) => `
            <div class="bar-row">
              <header><strong>${item.label}</strong><span>${money(item.value)}</span></header>
              <div class="bar-track"><div class="bar-fill" style="width:${Math.round((item.value / maxCategory) * 100)}%"></div></div>
            </div>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

function documentLabel(type) {
  return type === "bol" ? "BOL" : "Rate Con";
}

function complianceLabel(type) {
  return complianceTypes[type] || "Compliance";
}

function fileSize(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1_000_000) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

function planPrice(plan) {
  return `$${plan.monthlyPrice}/month or $${number(plan.annualPrice)}/year`;
}

function extractedSummary(item) {
  const data = item.extracted || {};
  const ai = item.aiScan || data.generic || {};
  const fields = [
    data.loadNumber ? `Load ${data.loadNumber}` : "",
    data.origin && data.destination ? `${data.origin} to ${data.destination}` : "",
    data.amount ? money(data.amount) : ai.amount ? money(ai.amount) : "",
    data.miles ? `${number(data.miles)} miles` : "",
    ai.dates?.length ? `${ai.dates.length} date${ai.dates.length === 1 ? "" : "s"} found` : ""
  ].filter(Boolean);
  if (!fields.length) return item.scanStatus || "Stored";
  return fields.join(" · ");
}

function scanDetail(item) {
  const ai = item.aiScan || item.extracted?.generic || item.extracted || {};
  const generic = ai.generic || {};
  const details = [
    ai.aiUsed === true || generic.aiUsed === true ? "Real AI used" : ai.aiUsed === false || generic.aiUsed === false ? "Local fallback used" : "",
    ai.aiError || generic.aiError ? `AI issue: ${(ai.aiError || generic.aiError).slice(0, 120)}` : "",
    ai.expirationDate ? `Expiration ${formatDate(ai.expirationDate)}` : generic.expirationDate ? `Expiration ${formatDate(generic.expirationDate)}` : "",
    ai.amount ? `Amount ${money(ai.amount)}` : generic.amount ? `Amount ${money(generic.amount)}` : "",
    ai.loadNumber ? `Load ${ai.loadNumber}` : generic.loadNumber ? `Load ${generic.loadNumber}` : "",
    ai.dates?.length ? `Dates ${ai.dates.map(formatDate).join(", ")}` : generic.dates?.length ? `Dates ${generic.dates.map(formatDate).join(", ")}` : ""
  ].filter(Boolean);
  return details.length ? details.join(" · ") : "AI scan complete";
}

function renderDocuments() {
  const documents = state.documents || [];
  const rateCons = documents.filter((item) => item.type === "rateCon").length;
  const bols = documents.filter((item) => item.type === "bol").length;
  content.innerHTML = `
    <div class="metric-grid">
      ${metric("Rate Cons", rateCons, "Uploaded confirmations", "file-text")}
      ${metric("BOLs", bols, "Bills of lading", "receipt")}
      ${metric("Total documents", documents.length, "Stored on the server", "upload")}
      ${metric("Auto-populated", documents.filter((item) => item.createdTripId).length, "Trips created from docs", "route")}
    </div>
    <section class="panel">
      <div class="panel-header">
        <h2>Upload Documents</h2>
        <span class="muted">AI scans every upload for dates, amounts, and load details</span>
      </div>
      <div class="panel-body">
        <form class="inline-form document-form" id="documentForm">
          <select name="type">
            <option value="rateCon">Rate Con</option>
            <option value="bol">BOL</option>
          </select>
          <input name="file" type="file" required />
          <button class="primary-button" type="submit">Upload</button>
        </form>
        ${state.accountMessage ? `<p class="form-message">${state.accountMessage}</p>` : ""}
      </div>
    </section>
    <section class="panel">
      <div class="panel-header"><h2>Document Library</h2><span class="muted">${documents.length} files</span></div>
      <table class="data-table">
        <thead>
          <tr><th>Type</th><th>File</th><th>Amount</th><th>Scan</th><th>Uploaded</th><th></th></tr>
        </thead>
        <tbody>
          ${documents.map((item) => `
            <tr>
              <td><span class="status ${item.type === "bol" ? "Scheduled" : "Paid"}">${documentLabel(item.type)}</span></td>
              <td><strong>${item.fileName}</strong><br><span class="muted">${fileSize(item.size)} · ${item.mimeType}</span></td>
              <td><strong>${item.extracted?.amount ? money(item.extracted.amount) : "Needs review"}</strong></td>
              <td><strong>${item.scanStatus || "Stored"}</strong><br><span class="muted">${extractedSummary(item)}</span>${item.createdTripId ? `<br><button class="chip-button" type="button" data-open-trip="${item.createdTripId}">View trip</button>` : ""}</td>
              <td>${formatDate(item.uploadedAt.slice(0, 10))}</td>
              <td>
                <div class="table-actions">
                  <a class="ghost-button" href="/api/documents/${item.id}">Download</a>
                  <button class="icon-button" type="button" data-delete-document="${item.id}" title="Delete document" aria-label="Delete document"><span data-icon="trash"></span></button>
                </div>
              </td>
            </tr>
          `).join("") || `<tr><td colspan="6">No Rate Cons or BOLs uploaded yet.</td></tr>`}
        </tbody>
      </table>
    </section>
  `;
}

function alertTone(days) {
  if (days < 0) return "Pending";
  if (days <= 15) return "Pending";
  return "Scheduled";
}

function renderCompliance() {
  const documents = state.complianceDocuments || [];
  const alerts = state.complianceAlerts || [];
  const scanner = state.scannerStatus;
  const scannerMessage = scanner?.aiConfigured
    ? `Using ${scanner.model}.`
    : scanner?.keyPresent
      ? `OPENAI_API_KEY is present, but it does not look valid. It should start with sk-. Current detected length: ${scanner.keyLength}.`
      : "The backend does not see OPENAI_API_KEY. Add it to the Railway app service Variables, then redeploy.";
  content.innerHTML = `
    <div class="metric-grid">
      ${metric("Compliance files", documents.length, "Insurance, DOT, UCR, 2290", "shield")}
      ${metric("Renewal alerts", alerts.length, "Includes IFTA deadlines", "receipt")}
      ${metric("IFTA due months", "Jan Apr Jul Oct", "By the last day of month", "bar-chart")}
      ${metric("Next due", alerts[0] ? formatDate(alerts[0].date) : "Clear", alerts[0]?.label || "No urgent renewals", "file-text")}
    </div>
    <section class="panel">
      <div class="panel-header">
        <h2>AI Scanner Status</h2>
        <span class="status ${scanner?.aiConfigured ? "Paid" : "Pending"}">${scanner?.aiConfigured ? "AI connected" : "AI not connected"}</span>
      </div>
      <div class="panel-body">
        <p class="muted">${scanner ? scannerMessage : "Checking scanner connection..."}</p>
      </div>
    </section>
    <section class="panel">
      <div class="panel-header">
        <h2>Upload Compliance Documents</h2>
        <span class="muted">AI scans every upload for expiration dates and renewal clues</span>
      </div>
      <div class="panel-body">
        <form class="inline-form document-form" id="complianceForm">
          <select name="type">
            ${Object.entries(complianceTypes).map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}
          </select>
          <input name="file" type="file" required />
          <button class="primary-button" type="submit">Upload</button>
        </form>
        ${state.accountMessage ? `<p class="form-message">${state.accountMessage}</p>` : ""}
      </div>
    </section>
    <div class="dashboard-grid">
      <section class="panel">
        <div class="panel-header"><h2>Renewal Alerts</h2><span class="muted">45-day document window plus IFTA</span></div>
        <div class="panel-body">
          <div class="list">
            ${alerts.map((alert) => `
              <article class="list-item">
                <div><strong>${alert.label}</strong><span>${formatDate(alert.date)} · ${alert.daysUntil} days</span></div>
                <span class="status ${alertTone(alert.daysUntil)}">${alert.daysUntil <= 15 ? "Due soon" : "Upcoming"}</span>
              </article>
            `).join("") || `<p class="muted">No compliance alerts right now.</p>`}
          </div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-header"><h2>Compliance Library</h2><span class="muted">${documents.length} files</span></div>
        <table class="data-table">
          <thead><tr><th>Type</th><th>File</th><th>Expiration</th><th>Scan</th><th></th></tr></thead>
          <tbody>
            ${documents.map((item) => `
              <tr>
                <td><span class="status Paid">${complianceLabel(item.type)}</span></td>
                <td><strong>${item.fileName}</strong><br><span class="muted">${fileSize(item.size)}</span></td>
                <td>
                  <strong>${item.expirationDate ? formatDate(item.expirationDate) : "Not detected"}</strong>
                  ${!item.expirationDate && (item.aiScan?.generic?.dates?.length || item.aiScan?.dates?.length) ? `<br><span class="muted">Dates found: ${(item.aiScan?.generic?.dates || item.aiScan?.dates || []).map(formatDate).join(", ")}</span>` : ""}
                  ${item.expirationDate ? "" : `
                    <form class="mini-date-form" data-expiration-form="${item.id}">
                      <input type="date" name="expirationDate" required />
                      <button class="chip-button" type="submit">Save</button>
                    </form>
                  `}
                </td>
                <td><strong>${item.scanStatus || "Stored"}</strong><br><span class="muted">${scanDetail(item)}</span></td>
                <td>
                  <div class="table-actions">
                    <a class="ghost-button" href="/api/compliance/${item.id}">Download</a>
                    <button class="icon-button" type="button" data-delete-compliance="${item.id}" title="Delete compliance document" aria-label="Delete compliance document"><span data-icon="trash"></span></button>
                  </div>
                </td>
              </tr>
            `).join("") || `<tr><td colspan="5">No compliance documents uploaded yet.</td></tr>`}
          </tbody>
        </table>
      </section>
    </div>
  `;
}

function renderAffiliate() {
  const stats = state.customer?.affiliateStats || { referrals: [], earnedTotal: 0, pendingCount: 0, paidCount: 0 };
  const referralLink = `${location.origin}/?ref=${state.customer?.affiliateCode || ""}`;
  content.innerHTML = `
    <div class="metric-grid">
      ${metric("Commission", "$10", "One-time first paid month", "receipt")}
      ${metric("Earned", money(stats.earnedTotal || 0), `${stats.paidCount || 0} paid referrals`, "bar-chart")}
      ${metric("Pending", stats.pendingCount || 0, "Waiting on first payment", "users")}
      ${metric("Referral code", state.customer?.affiliateCode || "None", "Unique to this customer", "share")}
    </div>
    <section class="panel">
      <div class="panel-header"><h2>Affiliate Link</h2><span class="muted">One-time $10 commission after first month is paid</span></div>
      <div class="panel-body">
        <div class="copy-row">
          <input value="${referralLink}" readonly aria-label="Affiliate referral link" />
          <button class="primary-button" type="button" data-copy-referral="${referralLink}">Copy Link</button>
        </div>
        <p class="muted">When a new customer signs up with this link and their first month is paid, this account earns one $10 commission for that referral.</p>
      </div>
    </section>
    <section class="panel">
      <div class="panel-header"><h2>Referral Activity</h2><span class="muted">${stats.referrals?.length || 0} referrals</span></div>
      <table class="data-table">
        <thead><tr><th>Customer</th><th>Email</th><th>Commission</th><th>Status</th></tr></thead>
        <tbody>
          ${(stats.referrals || []).map((item) => `
            <tr>
              <td><strong>${item.referredBusinessName}</strong></td>
              <td>${item.referredEmail}</td>
              <td>${money(item.amount)}</td>
              <td><span class="status ${item.status === "earned" ? "Paid" : "Pending"}">${item.status === "earned" ? "Earned" : "Pending"}</span></td>
            </tr>
          `).join("") || `<tr><td colspan="4">No referrals yet.</td></tr>`}
        </tbody>
      </table>
    </section>
  `;
}

function renderAccount() {
  const customer = state.customer;
  const plan = customer.subscription || subscriptionPlans[customer.subscriptionTier] || subscriptionPlans.silver;
  const trucks = customer.trucks || [];
  const drivers = customer.drivers || [];
  const truckOptions = trucks.map((truck) => `<option value="${truck.id}">${truck.unitNumber}</option>`).join("");
  content.innerHTML = `
    <div class="metric-grid">
      ${metric("Subscription", plan.name, planPrice(plan), "users")}
      ${metric("Truck slots", `${trucks.length}/${plan.maxTrucks}`, `${Math.max(plan.maxTrucks - trucks.length, 0)} slots available`, "route")}
      ${metric("Driver access", `${drivers.length}/${plan.maxTrucks}`, "Invites and active drivers", "file-text")}
      ${metric("Admin", customer.email, customer.businessName, "receipt")}
    </div>
    <section class="panel">
      <div class="panel-header">
        <h2>Subscription Packages</h2>
        <span class="muted">Choose the fleet size for this account</span>
      </div>
      <div class="panel-body">
        <div class="package-grid">
          ${Object.values(subscriptionPlans).map((item) => `
            <button class="package-option ${item.id === plan.id ? "active" : ""}" type="button" data-plan="${item.id}">
              <strong>${item.name}</strong>
              <span>${item.minTrucks}-${item.maxTrucks} trucks</span>
              <em>${planPrice(item)}</em>
            </button>
          `).join("")}
        </div>
        ${state.accountMessage ? `<p class="form-message">${state.accountMessage}</p>` : ""}
      </div>
    </section>
    <section class="panel">
      <div class="panel-header"><h2>Billing Status</h2><span class="muted">Used for affiliate commission tracking</span></div>
      <div class="panel-body">
        <div class="list-item">
          <div>
            <strong>First month payment</strong>
            <span>${customer.firstMonthPaid ? "Marked paid" : "Not marked paid yet"}</span>
          </div>
          <button class="primary-button" type="button" data-mark-first-paid ${customer.firstMonthPaid ? "disabled" : ""}>Mark First Month Paid</button>
        </div>
      </div>
    </section>
    <div class="dashboard-grid">
      <section class="panel">
        <div class="panel-header"><h2>Truck Slots</h2><span class="muted">${trucks.length} of ${plan.maxTrucks} used</span></div>
        <div class="panel-body">
          <form class="inline-form" id="truckForm">
            <input name="unitNumber" type="text" required placeholder="Truck or unit number" />
            <input name="vin" type="text" placeholder="VIN optional" />
            <button class="primary-button" type="submit">Add Truck</button>
          </form>
          <div class="list account-list">
            ${trucks.map((truck) => `
              <article class="list-item">
                <div><strong>${truck.unitNumber}</strong><span>${truck.vin || "No VIN entered"} · ${truck.status}</span></div>
                <button class="icon-button" type="button" data-delete-truck="${truck.id}" title="Remove truck" aria-label="Remove truck"><span data-icon="trash"></span></button>
              </article>
            `).join("") || `<p class="muted">No trucks added yet.</p>`}
          </div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-header"><h2>Driver Access</h2><span class="muted">Send access to each driver</span></div>
        <div class="panel-body">
          <form class="inline-form driver-form" id="driverForm">
            <input name="name" type="text" placeholder="Driver name" />
            <input name="email" type="email" required placeholder="driver@example.com" />
            <select name="truckId">
              <option value="">Assign truck</option>
              ${truckOptions}
            </select>
            <button class="primary-button" type="submit">Send Access</button>
          </form>
          <div class="list account-list">
            ${drivers.map((driver) => {
              const assignedTruck = trucks.find((truck) => truck.id === driver.truckId);
              const absoluteLink = `${location.origin}${driver.inviteLink}`;
              return `
                <article class="list-item driver-item">
                  <div>
                    <strong>${driver.name}</strong>
                    <span>${driver.email} · ${assignedTruck ? assignedTruck.unitNumber : "No truck assigned"}</span>
                    <a href="mailto:${driver.email}?subject=Your TruckerBooks access&body=${encodeURIComponent(`Use this link to access your TruckerBooks driver dashboard: ${absoluteLink}`)}">Open email</a>
                  </div>
                  <div>
                    <span class="status Scheduled">${driver.status}</span>
                    <button class="icon-button" type="button" data-delete-driver="${driver.id}" title="Remove driver access" aria-label="Remove driver access"><span data-icon="trash"></span></button>
                  </div>
                </article>
              `;
            }).join("") || `<p class="muted">No driver access has been sent yet.</p>`}
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderContent() {
  if (state.view === "dashboard") renderDashboard();
  if (state.view === "trips") renderTableView("trips", "Trip Ledger", [
    { label: "Date", render: (item) => formatDate(item.date) },
    { label: "Load", render: (item) => `<strong>${item.description}</strong><br><span class="muted">${item.origin} to ${item.destination}</span>` },
    { label: "Miles", render: (item) => number(item.miles) },
    { label: "Revenue", render: (item) => money(item.amount) },
    { label: "Status", render: (item) => `<span class="status ${item.status}">${item.status}</span>` }
  ]);
  if (state.view === "expenses") renderTableView("expenses", "Expense Ledger", [
    { label: "Date", render: (item) => formatDate(item.date) },
    { label: "Description", render: (item) => `<strong>${item.description}</strong><br><span class="muted">${item.category}</span>` },
    { label: "Amount", render: (item) => money(item.amount) },
    { label: "Status", render: (item) => `<span class="status ${item.status}">${item.status}</span>` }
  ]);
  if (state.view === "invoices") renderTableView("invoices", "Invoice Tracker", [
    { label: "Date", render: (item) => formatDate(item.date) },
    { label: "Invoice", render: (item) => `<strong>${item.description}</strong>` },
    { label: "Amount", render: (item) => money(item.amount) },
    { label: "Status", render: (item) => `<span class="status ${item.status}">${item.status}</span>` }
  ]);
  if (state.view === "maintenance") renderTableView("maintenance", "Maintenance Log", [
    { label: "Date", render: (item) => formatDate(item.date) },
    { label: "Service", render: (item) => `<strong>${item.description}</strong>` },
    { label: "Cost", render: (item) => money(item.amount) },
    { label: "Status", render: (item) => `<span class="status ${item.status}">${item.status}</span>` }
  ]);
  if (state.view === "rateCons") renderDocuments();
  if (state.view === "compliance") {
    if (!state.scannerStatus) loadScannerStatus().then(renderContent);
    renderCompliance();
  }
  if (state.view === "affiliate") renderAffiliate();
  if (state.view === "reports") renderReports();
  if (state.view === "userManagement") renderAccount();
  renderIcons(content);
}

function currentCollection() {
  if (["trips", "expenses", "invoices", "maintenance"].includes(state.view)) return state.view;
  return "trips";
}

function openEntryDialog(type = currentCollection().replace("s", "")) {
  entryForm.reset();
  entryForm.elements.date.valueAsDate = new Date();
  entryType.value = type;
  toggleTripFields();
  dialog.showModal();
}

function toggleTripFields() {
  document.querySelectorAll(".trip-only").forEach((field) => {
    field.style.display = entryType.value === "trip" ? "grid" : "none";
  });
}

async function addEntry() {
  const data = Object.fromEntries(new FormData(entryForm).entries());
  const collection = data.type === "maintenance" ? "maintenance" : `${data.type}s`;
  const base = {
    date: data.date,
    description: data.description,
    amount: Number(data.amount),
    status: data.status
  };
  if (data.type === "trip") {
    Object.assign(base, { origin: data.origin || "Origin TBD", destination: data.destination || "Destination TBD", miles: Number(data.miles || 0) });
  }
  if (data.type === "expense") {
    base.category = "General";
  }
  const payload = await api(`/api/records/${collection}`, {
    method: "POST",
    body: JSON.stringify(base)
  });
  state.records = payload.records;
  dialog.close();
  setView(collection === "maintenance" ? "maintenance" : collection);
}

async function deleteEntry(id) {
  const collection = currentCollection();
  const payload = await api(`/api/records/${collection}/${id}`, { method: "DELETE" });
  state.records = payload.records;
  renderContent();
}

function exportRecords() {
  window.location.href = "/api/export";
}

async function refreshAccount() {
  const payload = await api("/api/account");
  state.customer = payload.customer;
  customerName.textContent = payload.customer.businessName;
  customerFile.textContent = `${payload.customer.businessName} - 2026`;
  renderContent();
}

async function refreshAffiliate() {
  const payload = await api("/api/affiliate");
  state.customer = payload.customer;
  renderContent();
}

async function loadScannerStatus() {
  try {
    state.scannerStatus = await api("/api/scanner-status");
  } catch {
    state.scannerStatus = { aiConfigured: false, model: "unknown", fallbackAvailable: true };
  }
}

async function updatePlan(planId) {
  try {
    state.accountMessage = "";
    const payload = await api("/api/account/subscription", {
      method: "PATCH",
      body: JSON.stringify({ subscriptionTier: planId })
    });
    state.customer = payload.customer;
    state.accountMessage = `${payload.customer.subscription.name} is active.`;
    renderContent();
  } catch (error) {
    state.accountMessage = error.message;
    renderContent();
  }
}

async function markFirstMonthPaid() {
  try {
    const payload = await api("/api/billing/first-month-paid", { method: "POST" });
    state.customer = payload.customer;
    state.accountMessage = "First month marked paid. Any one-time referral commission is now earned.";
    renderContent();
  } catch (error) {
    state.accountMessage = error.message;
    renderContent();
  }
}

async function addTruck(form) {
  try {
    state.accountMessage = "";
    const formData = new FormData(form);
    const payload = await api("/api/trucks", {
      method: "POST",
      body: JSON.stringify({
        unitNumber: formData.get("unitNumber"),
        vin: formData.get("vin")
      })
    });
    state.customer = payload.customer;
    state.accountMessage = "Truck added.";
    renderContent();
  } catch (error) {
    state.accountMessage = error.message;
    renderContent();
  }
}

async function inviteDriver(form) {
  try {
    state.accountMessage = "";
    const formData = new FormData(form);
    const payload = await api("/api/drivers/invite", {
      method: "POST",
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        truckId: formData.get("truckId")
      })
    });
    state.customer = payload.customer;
    state.accountMessage = "Driver access created. Use the email button to send the invite.";
    renderContent();
  } catch (error) {
    state.accountMessage = error.message;
    renderContent();
  }
}

async function removeTruck(id) {
  const payload = await api(`/api/trucks/${id}`, { method: "DELETE" });
  state.customer = payload.customer;
  state.accountMessage = "Truck removed.";
  renderContent();
}

async function removeDriver(id) {
  const payload = await api(`/api/drivers/${id}`, { method: "DELETE" });
  state.customer = payload.customer;
  state.accountMessage = "Driver access removed.";
  renderContent();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

async function uploadDocument(form) {
  try {
    state.accountMessage = "";
    const formData = new FormData(form);
    const file = formData.get("file");
    if (!file || !file.name) throw new Error("Choose a Rate Con or BOL file.");
    const data = await readFileAsDataUrl(file);
    const payload = await api("/api/documents", {
      method: "POST",
      body: JSON.stringify({
        type: formData.get("type"),
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        data
      })
    });
    state.documents = payload.documents;
    if (payload.records) state.records = payload.records;
    if (state.customer) state.customer.documents = payload.documents;
    state.accountMessage = payload.document?.createdTripId ? "Document scanned and a trip was auto-populated." : "Document uploaded and scanned.";
    renderContent();
  } catch (error) {
    state.accountMessage = error.message;
    renderContent();
  }
}

async function uploadComplianceDocument(form) {
  try {
    const formData = new FormData(form);
    const file = formData.get("file");
    if (!file || !file.name) throw new Error("Choose a compliance document.");
    const documentType = formData.get("type");
    state.accountMessage = "Scanning document for expiration date...";
    renderContent();
    const data = await readFileAsDataUrl(file);
    const payload = await api("/api/compliance", {
      method: "POST",
      body: JSON.stringify({
        type: documentType,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        data
      })
    });
    state.complianceDocuments = payload.complianceDocuments;
    state.complianceAlerts = payload.complianceAlerts;
    if (state.customer) {
      state.customer.complianceDocuments = payload.complianceDocuments;
      state.customer.complianceAlerts = payload.complianceAlerts;
    }
    state.accountMessage = payload.complianceDocument?.expirationDate
      ? `Expiration detected: ${formatDate(payload.complianceDocument.expirationDate)}.`
      : "Document uploaded. No expiration date was detected.";
    renderContent();
  } catch (error) {
    state.accountMessage = error.message;
    renderContent();
  }
}

async function removeDocument(id) {
  const payload = await api(`/api/documents/${id}`, { method: "DELETE" });
  state.documents = payload.documents;
  if (state.customer) state.customer.documents = payload.documents;
  state.accountMessage = "Document removed.";
  renderContent();
}

async function removeComplianceDocument(id) {
  const payload = await api(`/api/compliance/${id}`, { method: "DELETE" });
  state.complianceDocuments = payload.complianceDocuments;
  state.complianceAlerts = payload.complianceAlerts;
  if (state.customer) {
    state.customer.complianceDocuments = payload.complianceDocuments;
    state.customer.complianceAlerts = payload.complianceAlerts;
  }
  state.accountMessage = "Compliance document removed.";
  renderContent();
}

async function saveComplianceExpiration(form) {
  try {
    const payload = await api(`/api/compliance/${form.dataset.expirationForm}`, {
      method: "PATCH",
      body: JSON.stringify({ expirationDate: new FormData(form).get("expirationDate") })
    });
    state.complianceDocuments = payload.complianceDocuments;
    state.complianceAlerts = payload.complianceAlerts;
    state.accountMessage = "Expiration date saved.";
    renderContent();
  } catch (error) {
    state.accountMessage = error.message;
    renderContent();
  }
}

document.addEventListener("click", (event) => {
  const navButton = event.target.closest("[data-view]");
  const shortcut = event.target.closest("[data-view-shortcut]");
  const deleteButton = event.target.closest("[data-delete]");
  const authModeButton = event.target.closest("[data-auth-mode]");
  const planButton = event.target.closest("[data-plan]");
  const deleteTruckButton = event.target.closest("[data-delete-truck]");
  const deleteDriverButton = event.target.closest("[data-delete-driver]");
  const deleteDocumentButton = event.target.closest("[data-delete-document]");
  const deleteComplianceButton = event.target.closest("[data-delete-compliance]");
  const openTripButton = event.target.closest("[data-open-trip]");
  const copyReferralButton = event.target.closest("[data-copy-referral]");
  const markPaidButton = event.target.closest("[data-mark-first-paid]");
  if (navButton) setView(navButton.dataset.view);
  if (shortcut) setView(shortcut.dataset.viewShortcut);
  if (deleteButton) deleteEntry(deleteButton.dataset.delete);
  if (authModeButton) setAuthMode(authModeButton.dataset.authMode);
  if (planButton) updatePlan(planButton.dataset.plan);
  if (deleteTruckButton) removeTruck(deleteTruckButton.dataset.deleteTruck);
  if (deleteDriverButton) removeDriver(deleteDriverButton.dataset.deleteDriver);
  if (deleteDocumentButton) removeDocument(deleteDocumentButton.dataset.deleteDocument);
  if (deleteComplianceButton) removeComplianceDocument(deleteComplianceButton.dataset.deleteCompliance);
  if (openTripButton) setView("rateCons");
  if (copyReferralButton) {
    navigator.clipboard?.writeText(copyReferralButton.dataset.copyReferral);
    state.accountMessage = "Affiliate link copied.";
    refreshAffiliate();
  }
  if (markPaidButton) markFirstMonthPaid();
});

document.addEventListener("submit", (event) => {
  if (event.target.id === "truckForm") {
    event.preventDefault();
    addTruck(event.target);
  }
  if (event.target.id === "driverForm") {
    event.preventDefault();
    inviteDriver(event.target);
  }
  if (event.target.id === "documentForm") {
    event.preventDefault();
    uploadDocument(event.target);
  }
  if (event.target.id === "complianceForm") {
    event.preventDefault();
    uploadComplianceDocument(event.target);
  }
  if (event.target.matches("[data-expiration-form]")) {
    event.preventDefault();
    saveComplianceExpiration(event.target);
  }
});

document.addEventListener("input", (event) => {
  if (event.target.id === "searchInput") {
    state.query = event.target.value;
    renderContent();
  }
});

document.addEventListener("change", (event) => {
  if (event.target.id === "statusFilter") {
    state.status = event.target.value;
    renderContent();
  }
  if (event.target.id === "entryType") toggleTripFields();
});

document.querySelector("#quickAddBtn").addEventListener("click", () => openEntryDialog());
document.querySelector("#saveEntryBtn").addEventListener("click", addEntry);
document.querySelector("#exportBtn").addEventListener("click", exportRecords);
document.querySelector("#logoutBtn").addEventListener("click", signOut);
authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  (async () => {
    try {
      authSubmit.disabled = true;
      authError.textContent = "";
      const path = state.authMode === "signup" ? "/api/signup" : "/api/login";
    const formData = new FormData(authForm);
      const payload = await api(path, {
        method: "POST",
        body: JSON.stringify({
          businessName: formData.get("businessName"),
          email: normalizeEmail(formData.get("email")),
          password: formData.get("password"),
          subscriptionTier: formData.get("subscriptionTier"),
          referralCode: formData.get("referralCode")
        })
      });
      authForm.reset();
      showDashboard(payload.customer, payload.records);
    } catch (error) {
      authError.textContent = error.message;
    } finally {
      authSubmit.disabled = false;
    }
  })();
});

renderIcons();
restoreSession();
