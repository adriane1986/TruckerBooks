const partnerState = {
  mode: "signin",
  partner: null,
  message: ""
};

const partnerAuth = document.querySelector("#partnerAuth");
const partnerShell = document.querySelector("#partnerShell");
const partnerAuthForm = document.querySelector("#partnerAuthForm");
const partnerAuthSubmit = document.querySelector("#partnerAuthSubmit");
const partnerAuthError = document.querySelector("#partnerAuthError");
const partnerContent = document.querySelector("#partnerContent");
const partnerTitle = document.querySelector("#partnerTitle");
const partnerLogoutBtn = document.querySelector("#partnerLogoutBtn");

async function partnerApi(path, options = {}) {
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

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value || 0);
}

function formatDate(value) {
  if (!value) return "Not paid yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function setPartnerMode(mode) {
  partnerState.mode = mode;
  document.querySelectorAll("[data-partner-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.partnerMode === mode);
  });
  document.querySelectorAll(".partner-signup-only").forEach((field) => {
    field.style.display = mode === "signup" ? "grid" : "none";
  });
  partnerAuthSubmit.textContent = mode === "signup" ? "Create Partner Account" : "Sign In";
  partnerAuthError.textContent = "";
}

function showPartnerApp(partner) {
  partnerState.partner = partner;
  partnerTitle.textContent = partner.businessName || partner.name || "Partner Dashboard";
  partnerAuth.classList.add("hidden");
  partnerShell.classList.remove("hidden");
  renderPartnerDashboard();
}

function showPartnerLogin() {
  partnerShell.classList.add("hidden");
  partnerAuth.classList.remove("hidden");
  setPartnerMode("signin");
}

function partnerReferralLink() {
  return `${location.origin}/?ref=${partnerState.partner?.affiliateCode || ""}`;
}

function renderMetric(label, value, detail) {
  return `
    <article class="metric-card">
      <header><span>${label}</span></header>
      <strong class="metric-value-long">${escapeHtml(value)}</strong>
      <span class="delta">${escapeHtml(detail)}</span>
    </article>
  `;
}

function renderPartnerDashboard() {
  const partner = partnerState.partner;
  const stats = partner.stats || {};
  const tier = stats.tier || partner.tier || { name: "Starter", commissionRate: 0.3, threshold: 0 };
  const referrals = stats.referrals || [];
  partnerContent.innerHTML = `
    <div class="metric-grid">
      ${renderMetric("Tier", tier.name, `${Math.round((tier.commissionRate || 0.3) * 100)}% recurring commission`)}
      ${renderMetric("Monthly Recurring", money(stats.monthlyRecurringTotal || 0), "Projected monthly commission")}
      ${renderMetric("Signup Bonus", money(stats.signupBonusPendingTotal || 0), "$25 after 30 days active")}
      ${renderMetric("Customers", stats.referralCount || 0, "Growth at 10, Elite at 25")}
      ${renderMetric("Referral Code", partner.affiliateCode || "", "Unique partner link")}
    </div>

    <section class="panel">
      <div class="panel-header"><h2>Partner Tiers</h2><span class="muted">Automatic upgrades based on active customers</span></div>
      <div class="panel-body">
        <div class="package-grid">
          <article class="package-option ${tier.name === "Starter" ? "active" : ""}">
            <strong>Starter</strong>
            <span>30% commission</span>
            <small>Starts immediately</small>
          </article>
          <article class="package-option ${tier.name === "Growth" ? "active" : ""}">
            <strong>Growth</strong>
            <span>35% commission</span>
            <small>After 10 customers</small>
          </article>
          <article class="package-option ${tier.name === "Elite" ? "active" : ""}">
            <strong>Elite</strong>
            <span>40% commission</span>
            <small>After 25 customers</small>
          </article>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header"><h2>Referral Link</h2><span class="muted">Share this with potential customers</span></div>
      <div class="panel-body">
        <div class="copy-row">
          <input readonly value="${escapeHtml(partnerReferralLink())}" aria-label="Affiliate referral link" />
          <button class="primary-button" type="button" data-copy-link>Copy Link</button>
        </div>
        <p class="muted">Partners earn recurring commission for 12 months after a referred customer becomes active, plus a $25 signup bonus after that customer stays active for 30 days.</p>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header"><h2>Partner Profile</h2><span class="muted">Keep contact and payout details current</span></div>
      <div class="panel-body">
        <form class="billing-form" id="partnerProfileForm">
          <label>Name<input name="name" required value="${escapeHtml(partner.name)}" /></label>
          <label>Business or brand<input name="businessName" value="${escapeHtml(partner.businessName)}" /></label>
          <label>Phone<input name="phone" value="${escapeHtml(partner.phone)}" /></label>
          <label>Website or social<input name="website" value="${escapeHtml(partner.website || partner.socialHandle)}" /></label>
          <label>Payout method
            <select name="paymentMethod">
              ${["PayPal", "Zelle", "ACH", "Check", "Other"].map((method) => `<option value="${method}" ${partner.paymentInfo?.method === method ? "selected" : ""}>${method}</option>`).join("")}
            </select>
          </label>
          <label>Payment name<input name="paymentName" value="${escapeHtml(partner.paymentInfo?.name || partner.name)}" placeholder="Name for payout" /></label>
          <label>Payment email<input name="paymentEmail" type="email" value="${escapeHtml(partner.paymentInfo?.email || partner.email)}" placeholder="paypal@example.com" /></label>
          <label>W-9 status
            <select name="w9Status">
              ${["Needed before payout", "Requested", "Received"].map((status) => `<option value="${status}" ${partner.w9Status === status ? "selected" : ""}>${status}</option>`).join("")}
            </select>
          </label>
          <label class="support-message-field">Payout notes<input name="paymentNotes" value="${escapeHtml(partner.paymentInfo?.notes || partner.payoutPreference)}" placeholder="Zelle phone, check address, or payout notes" /></label>
          <div class="billing-actions">
            <button class="primary-button" type="submit">Update Profile</button>
            <a class="chip-button" href="https://www.irs.gov/pub/irs-pdf/fw9.pdf" target="_blank" rel="noreferrer">Download W-9</a>
            <span class="muted">A completed W-9 is needed before payouts.</span>
          </div>
        </form>
        ${partnerState.message ? `<p class="form-message">${escapeHtml(partnerState.message)}</p>` : ""}
      </div>
    </section>

    <section class="panel">
      <div class="panel-header"><h2>Referral Activity</h2><span class="muted">${referrals.length} referrals</span></div>
      <table class="data-table">
        <thead><tr><th>Customer</th><th>Email</th><th>Type</th><th>Commission</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>
          ${referrals.map((item) => `
            <tr>
              <td><strong>${escapeHtml(item.referredBusinessName)}</strong></td>
              <td class="owner-wrap">${escapeHtml(item.referredEmail)}</td>
              <td>${item.commissionType === "signup_bonus_30_day" ? "Signup bonus" : item.commissionType === "recurring_12_months" ? "12-month recurring" : "Referral"}</td>
              <td>${money(item.amount)}</td>
              <td><span class="status ${["earned", "active_recurring"].includes(item.status) ? "Paid" : "Pending"}">${item.status === "active_recurring" ? "Active" : item.status === "bonus_pending" ? "30-day pending" : item.status === "earned" ? "Earned" : "Pending"}</span></td>
              <td>${formatDate(item.earnedAt || item.eligibleAt || item.createdAt)}</td>
            </tr>
          `).join("") || `<tr><td colspan="6">No referrals yet.</td></tr>`}
        </tbody>
      </table>
    </section>
  `;
}

async function restorePartnerSession() {
  try {
    const payload = await partnerApi("/api/partners/session");
    showPartnerApp(payload.partner);
  } catch {
    showPartnerLogin();
  }
}

document.addEventListener("click", (event) => {
  const modeButton = event.target.closest("[data-partner-mode]");
  const copyButton = event.target.closest("[data-copy-link]");
  if (modeButton) setPartnerMode(modeButton.dataset.partnerMode);
  if (copyButton) {
    navigator.clipboard?.writeText(partnerReferralLink());
    partnerState.message = "Referral link copied.";
    renderPartnerDashboard();
  }
});

partnerAuthForm.addEventListener("submit", (event) => {
  event.preventDefault();
  (async () => {
    try {
      partnerAuthError.textContent = "";
      const formData = new FormData(partnerAuthForm);
      const path = partnerState.mode === "signup" ? "/api/partners/signup" : "/api/partners/login";
      const payload = await partnerApi(path, {
        method: "POST",
        body: JSON.stringify({
          name: formData.get("name"),
          businessName: formData.get("businessName"),
          email: formData.get("email"),
          password: formData.get("password"),
          website: formData.get("website"),
          payoutPreference: formData.get("payoutPreference")
        })
      });
      partnerAuthForm.reset();
      showPartnerApp(payload.partner);
    } catch (error) {
      partnerAuthError.textContent = error.message;
    }
  })();
});

partnerLogoutBtn.addEventListener("click", async () => {
  await partnerApi("/api/partners/logout", { method: "POST" });
  partnerState.partner = null;
  showPartnerLogin();
});

document.addEventListener("submit", (event) => {
  if (event.target.id !== "partnerProfileForm") return;
  event.preventDefault();
  (async () => {
    const formData = new FormData(event.target);
    const payload = await partnerApi("/api/partners/profile", {
      method: "PATCH",
      body: JSON.stringify({
        name: formData.get("name"),
        businessName: formData.get("businessName"),
        phone: formData.get("phone"),
        website: formData.get("website"),
        paymentMethod: formData.get("paymentMethod"),
        paymentName: formData.get("paymentName"),
        paymentEmail: formData.get("paymentEmail"),
        paymentNotes: formData.get("paymentNotes"),
        w9Status: formData.get("w9Status"),
        payoutPreference: formData.get("paymentNotes")
      })
    });
    partnerState.partner = payload.partner;
    partnerState.message = "Partner profile updated.";
    renderPartnerDashboard();
  })().catch((error) => {
    partnerState.message = error.message;
    renderPartnerDashboard();
  });
});

setPartnerMode("signin");
restorePartnerSession();
