const ownerState = {
  customers: [],
  selectedCustomer: null,
  message: ""
};

const ownerAuth = document.querySelector("#ownerAuth");
const ownerShell = document.querySelector("#ownerShell");
const ownerLoginForm = document.querySelector("#ownerLoginForm");
const ownerAuthError = document.querySelector("#ownerAuthError");
const ownerLogoutBtn = document.querySelector("#ownerLogoutBtn");
const customerSearch = document.querySelector("#customerSearch");
const customerList = document.querySelector("#customerList");
const customerCount = document.querySelector("#customerCount");
const ownerDetail = document.querySelector("#ownerDetail");

const plans = {
  silver: "Silver Package",
  gold: "Gold Package",
  platinum: "Platinum Package"
};

async function ownerApi(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "same-origin",
    ...options
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(payload.error || "Something went wrong.");
  return payload;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function moneyStatus(customer) {
  if (customer.firstMonthPaid) return "First month paid";
  return "First month not marked paid";
}

function showOwnerApp() {
  ownerAuth.classList.add("hidden");
  ownerShell.classList.remove("hidden");
}

function showOwnerLogin() {
  ownerShell.classList.add("hidden");
  ownerAuth.classList.remove("hidden");
}

async function restoreOwnerSession() {
  try {
    await ownerApi("/api/owner/session");
    showOwnerApp();
    await loadCustomers();
  } catch {
    showOwnerLogin();
  }
}

async function loadCustomers(query = "") {
  const payload = await ownerApi(`/api/owner/customers?q=${encodeURIComponent(query)}`);
  ownerState.customers = payload.customers || [];
  renderCustomerList();
}

async function loadCustomer(id) {
  const payload = await ownerApi(`/api/owner/customers/${id}`);
  ownerState.selectedCustomer = payload.customer;
  ownerState.message = "";
  renderCustomerList();
  renderCustomerDetail();
}

function renderCustomerList() {
  customerCount.textContent = `${ownerState.customers.length} accounts`;
  customerList.innerHTML = ownerState.customers.map((customer) => `
    <button class="owner-customer ${ownerState.selectedCustomer?.id === customer.id ? "active" : ""}" type="button" data-customer-id="${customer.id}">
      <strong>${escapeHtml(customer.businessName)}</strong>
      <span>${escapeHtml(customer.email)}</span>
      <small>${escapeHtml(customer.subscriptionName)} · ${customer.status} · ${customer.scannerIssueCount} scan issues</small>
    </button>
  `).join("") || `<p class="muted">No customers found.</p>`;
}

function renderCustomerDetail() {
  const customer = ownerState.selectedCustomer;
  if (!customer) return;
  const accessRows = customer.drivers.map((driver) => `
    <tr>
      <td><strong>${escapeHtml(driver.name)}</strong><br><span class="muted">${escapeHtml(driver.roleLabel || driver.role)}</span></td>
      <td class="owner-wrap">${escapeHtml(driver.email)}</td>
      <td>${escapeHtml(driver.status || "Access sent")}</td>
      <td><button class="chip-button" type="button" data-resend-invite="${driver.id}">Resend Invite</button></td>
    </tr>
  `).join("") || `<tr><td colspan="4">No account access invites yet.</td></tr>`;

  const documentRows = [...customer.documents, ...customer.complianceDocuments].map((document) => `
    <tr>
      <td><strong>${escapeHtml(document.fileName)}</strong><br><span class="muted">${escapeHtml(document.type || "Document")}</span></td>
      <td>${escapeHtml(document.scanStatus || "Stored")}</td>
      <td>${document.expirationDate ? formatDate(document.expirationDate) : document.amount ? `$${Number(document.amount).toLocaleString()}` : "Not required"}</td>
      <td>${document.aiError ? `<span class="status Overdue">Review</span>` : `<span class="status Paid">OK</span>`}</td>
    </tr>
  `).join("") || `<tr><td colspan="4">No uploaded documents yet.</td></tr>`;

  const scannerRows = customer.scannerErrors.map((item) => `
    <tr>
      <td><strong>${escapeHtml(item.fileName)}</strong><br><span class="muted">${escapeHtml(item.type)}</span></td>
      <td>${escapeHtml(item.scanStatus)}</td>
      <td class="owner-wrap">${escapeHtml(item.message)}</td>
      <td>${formatDate(item.uploadedAt)}</td>
    </tr>
  `).join("") || `<tr><td colspan="4">No scanner errors found.</td></tr>`;

  ownerDetail.innerHTML = `
    <div class="metric-grid">
      <article class="metric-card"><header><span>Status</span></header><strong class="metric-value-long">${escapeHtml(customer.status)}</strong><span class="delta">${moneyStatus(customer)}</span></article>
      <article class="metric-card"><header><span>Plan</span></header><strong class="metric-value-long">${escapeHtml(customer.subscriptionName)}</strong><span class="delta">${customer.trucksUsed}/${customer.trucksAllowed} trucks</span></article>
      <article class="metric-card"><header><span>Payment</span></header><strong class="metric-value-long">${escapeHtml(customer.paymentMethod)}</strong><span class="delta">${escapeHtml(customer.paymentInfo?.billingEmail || customer.email)}</span></article>
      <article class="metric-card"><header><span>Scanner Issues</span></header><strong>${customer.scannerErrors.length}</strong><span class="delta">${customer.documentCount} total documents</span></article>
    </div>

    <section class="panel">
      <div class="panel-header"><h2>Account Settings</h2><span class="muted">${escapeHtml(customer.email)}</span></div>
      <div class="panel-body">
        <form class="billing-form" id="ownerAccountForm">
          <label>Business name<input name="businessName" required value="${escapeHtml(customer.businessName)}" /></label>
          <label>Email<input name="email" type="email" required value="${escapeHtml(customer.email)}" /></label>
          <label>Subscription
            <select name="subscriptionTier">
              ${Object.entries(plans).map(([id, name]) => `<option value="${id}" ${customer.subscriptionTier === id ? "selected" : ""}>${name}</option>`).join("")}
            </select>
          </label>
          <label>Account status
            <select name="accountStatus">
              ${["Active", "Needs Support", "Paused"].map((status) => `<option value="${status}" ${customer.status === status ? "selected" : ""}>${status}</option>`).join("")}
            </select>
          </label>
          <label class="owner-checkbox"><input name="firstMonthPaid" type="checkbox" ${customer.firstMonthPaid ? "checked" : ""} /> First month paid</label>
          <div class="billing-actions">
            <button class="primary-button" type="submit">Update Account</button>
            <button class="ghost-button" type="button" data-reset-password>Reset Password</button>
          </div>
        </form>
        ${ownerState.message ? `<p class="form-message">${escapeHtml(ownerState.message)}</p>` : ""}
      </div>
    </section>

    <section class="panel">
      <div class="panel-header"><h2>Account Access</h2><span class="muted">Drivers, bookkeepers/accountants, and dispatchers</span></div>
      <table class="data-table owner-table"><thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Action</th></tr></thead><tbody>${accessRows}</tbody></table>
    </section>

    <section class="panel">
      <div class="panel-header"><h2>Uploaded Documents</h2><span class="muted">Document scan results</span></div>
      <table class="data-table owner-table"><thead><tr><th>File</th><th>Scan</th><th>Result</th><th>Review</th></tr></thead><tbody>${documentRows}</tbody></table>
    </section>

    <section class="panel">
      <div class="panel-header"><h2>Scanner Errors</h2><span class="muted">Items that may need support</span></div>
      <table class="data-table owner-table"><thead><tr><th>File</th><th>Status</th><th>Message</th><th>Uploaded</th></tr></thead><tbody>${scannerRows}</tbody></table>
    </section>
  `;
}

ownerLoginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  (async () => {
    try {
      ownerAuthError.textContent = "";
      const formData = new FormData(ownerLoginForm);
      await ownerApi("/api/owner/login", {
        method: "POST",
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password")
        })
      });
      ownerLoginForm.reset();
      showOwnerApp();
      await loadCustomers();
    } catch (error) {
      ownerAuthError.textContent = error.message;
    }
  })();
});

ownerLogoutBtn.addEventListener("click", async () => {
  await ownerApi("/api/owner/logout", { method: "POST" });
  showOwnerLogin();
});

customerSearch.addEventListener("input", () => loadCustomers(customerSearch.value));

document.addEventListener("click", (event) => {
  const customerButton = event.target.closest("[data-customer-id]");
  const resetButton = event.target.closest("[data-reset-password]");
  const resendButton = event.target.closest("[data-resend-invite]");
  if (customerButton) loadCustomer(customerButton.dataset.customerId);
  if (resetButton && ownerState.selectedCustomer) {
    (async () => {
      const payload = await ownerApi(`/api/owner/customers/${ownerState.selectedCustomer.id}/reset-password`, { method: "POST" });
      ownerState.selectedCustomer = payload.customer;
      ownerState.message = `Temporary password: ${payload.temporaryPassword}`;
      renderCustomerDetail();
    })().catch((error) => {
      ownerState.message = error.message;
      renderCustomerDetail();
    });
  }
  if (resendButton && ownerState.selectedCustomer) {
    (async () => {
      const payload = await ownerApi(`/api/owner/customers/${ownerState.selectedCustomer.id}/drivers/${resendButton.dataset.resendInvite}/resend`, { method: "POST" });
      ownerState.selectedCustomer = payload.customer;
      ownerState.message = `Invite link regenerated: ${location.origin}${payload.inviteLink}`;
      renderCustomerDetail();
    })().catch((error) => {
      ownerState.message = error.message;
      renderCustomerDetail();
    });
  }
});

document.addEventListener("submit", (event) => {
  if (event.target.id !== "ownerAccountForm") return;
  event.preventDefault();
  (async () => {
    const formData = new FormData(event.target);
    const payload = await ownerApi(`/api/owner/customers/${ownerState.selectedCustomer.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        businessName: formData.get("businessName"),
        email: formData.get("email"),
        subscriptionTier: formData.get("subscriptionTier"),
        accountStatus: formData.get("accountStatus"),
        firstMonthPaid: formData.has("firstMonthPaid")
      })
    });
    ownerState.selectedCustomer = payload.customer;
    ownerState.customers = payload.customers || ownerState.customers;
    ownerState.message = "Account updated.";
    renderCustomerList();
    renderCustomerDetail();
  })().catch((error) => {
    ownerState.message = error.message;
    renderCustomerDetail();
  });
});

restoreOwnerSession();
