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
  const referrals = stats.referrals || [];
  partnerContent.innerHTML = `
    <div class="metric-grid">
      ${renderMetric("Reward", stats.rewardLabel || "One free month", "For fleets with 1-20 trucks")}
      ${renderMetric("Customer Discount", stats.discountLabel || "10% off the first 3 months", "Applied to referred customers")}
      ${renderMetric("Pending Rewards", stats.pendingRewardCount || 0, stats.eligibilityLabel || "Paid after 60 active days")}
      ${renderMetric("Customers", stats.referralCount || 0, "Referred active customers")}
      ${renderMetric("Referral Code", partner.affiliateCode || "", "Unique partner link")}
    </div>

    <section class="panel">
      <div class="panel-header"><h2>Referral Program</h2><span class="muted">For fleets with 1-20 trucks</span></div>
      <div class="panel-body">
        <div class="package-grid">
          <article class="package-option active">
            <strong>Referrer</strong>
            <span>One free month</span>
            <small>Earned after 60 active days</small>
          </article>
          <article class="package-option active">
            <strong>New customer</strong>
            <span>10% discount</span>
            <small>First three months</small>
          </article>
          <article class="package-option active">
            <strong>Fleet size</strong>
            <span>1-20 trucks</span>
            <small>Owner-Operator, Small Fleet, Growth, or Growth Plus</small>
          </article>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header"><h2>Referral Link</h2><span class="muted">One free month after 60 active days</span></div>
      <div class="panel-body">
        <div class="copy-row">
          <input readonly value="${escapeHtml(partnerReferralLink())}" aria-label="Affiliate referral link" />
          <button class="primary-button" type="button" data-copy-link>Copy Link</button>
        </div>
        <p class="muted">When a fleet with 1-20 trucks signs up with this link, they receive 10% off the first three months. The referrer receives one free month after the new customer remains active for at least 60 days.</p>
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
        <thead><tr><th>Customer</th><th>Email</th><th>Reward</th><th>Eligibility</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>
          ${referrals.map((item) => `
            <tr>
              <td><strong>${escapeHtml(item.referredBusinessName)}</strong></td>
              <td class="owner-wrap">${escapeHtml(item.referredEmail)}</td>
              <td>${escapeHtml(item.rewardLabel || (item.rewardType === "free_month" ? "One free month" : item.commissionType === "signup_bonus_30_day" ? "Signup bonus" : item.commissionType === "recurring_12_months" ? "Legacy recurring" : "Referral"))}</td>
              <td>${item.requiredActiveDays ? `${item.requiredActiveDays} active days` : item.eligibleAt ? "Eligibility pending" : "Pending activation"}</td>
              <td><span class="status ${item.status === "earned" ? "Paid" : "Pending"}">${item.status === "reward_pending_60_days" ? "60-day pending" : item.status === "earned" ? "Earned" : item.status === "active_recurring" ? "Legacy active" : "Pending"}</span></td>
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
