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
      ${renderMetric("Commission", "$10", "One-time first paid month")}
      ${renderMetric("Earned", money(stats.earnedTotal || 0), `${stats.paidCount || 0} paid referrals`)}
      ${renderMetric("Pending", money(stats.pendingTotal || 0), `${stats.pendingCount || 0} waiting on first payment`)}
      ${renderMetric("Referral Code", partner.affiliateCode || "", "Unique partner link")}
    </div>

    <section class="panel">
      <div class="panel-header"><h2>Affiliate Link</h2><span class="muted">Share this with potential customers</span></div>
      <div class="panel-body">
        <div class="copy-row">
          <input readonly value="${escapeHtml(partnerReferralLink())}" aria-label="Affiliate referral link" />
          <button class="primary-button" type="button" data-copy-link>Copy Link</button>
        </div>
        <p class="muted">Commission is earned once the referred customer pays their first month. Commission is paid one time only for that referred customer.</p>
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
          <label class="support-message-field">Payout preference<input name="payoutPreference" value="${escapeHtml(partner.payoutPreference)}" placeholder="PayPal, Zelle, ACH, check..." /></label>
          <div class="billing-actions">
            <button class="primary-button" type="submit">Update Profile</button>
            <span class="muted">A W9 may be needed before payouts.</span>
          </div>
        </form>
        ${partnerState.message ? `<p class="form-message">${escapeHtml(partnerState.message)}</p>` : ""}
      </div>
    </section>

    <section class="panel">
      <div class="panel-header"><h2>Referral Activity</h2><span class="muted">${referrals.length} referrals</span></div>
      <table class="data-table">
        <thead><tr><th>Customer</th><th>Email</th><th>Commission</th><th>Status</th><th>Earned</th></tr></thead>
        <tbody>
          ${referrals.map((item) => `
            <tr>
              <td><strong>${escapeHtml(item.referredBusinessName)}</strong></td>
              <td class="owner-wrap">${escapeHtml(item.referredEmail)}</td>
              <td>${money(item.amount)}</td>
              <td><span class="status ${item.status === "earned" ? "Paid" : "Pending"}">${item.status === "earned" ? "Earned" : "Pending"}</span></td>
              <td>${formatDate(item.earnedAt)}</td>
            </tr>
          `).join("") || `<tr><td colspan="5">No referrals yet.</td></tr>`}
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
    partnerState.message = "Affiliate link copied.";
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
        payoutPreference: formData.get("payoutPreference")
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
