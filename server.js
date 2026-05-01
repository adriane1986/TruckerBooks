const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");

const port = Number(process.env.PORT || 3000);
const rootDir = __dirname;
const dataDir = path.join(rootDir, "data");
const uploadDir = path.join(dataDir, "uploads");
const dbPath = path.join(dataDir, "truckerbooks-db.json");
const openaiModel = process.env.OPENAI_MODEL || "gpt-5-mini";
const openaiVisionModel = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";
const ownerEmail = normalizeEmail(process.env.OWNER_EMAIL || "owner@truckerbooks.local");
const ownerPassword = process.env.OWNER_PASSWORD || "";

const sampleRecords = {
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

const subscriptionPlans = {
  silver: { id: "silver", name: "Silver Package", minTrucks: 1, maxTrucks: 5, monthlyPrice: 49, annualPrice: 499 },
  gold: { id: "gold", name: "Gold Package", minTrucks: 6, maxTrucks: 10, monthlyPrice: 99, annualPrice: 999 },
  platinum: { id: "platinum", name: "Platinum Package", minTrucks: 11, maxTrucks: 20, monthlyPrice: 179, annualPrice: 1799 }
};

const complianceTypes = {
  insurance: { id: "insurance", name: "Insurance" },
  dotPhysical: { id: "dotPhysical", name: "DOT Physical" },
  ucr: { id: "ucr", name: "UCR" },
  form2290: { id: "form2290", name: "2290" },
  w9: { id: "w9", name: "W9" },
  noa: { id: "noa", name: "NOA" }
};

const accountAccessRoles = {
  driver: "Driver",
  bookkeeper: "Bookkeeper/Accountant",
  dispatcher: "Dispatcher"
};

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function ensureDb() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  if (!fs.existsSync(dbPath)) {
    writeDb({ users: [], sessions: {} });
  }
}

function readDb() {
  ensureDb();
  const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
  db.users = (db.users || []).map(normalizeUser);
  db.sessions = db.sessions || {};
  db.ownerSessions = db.ownerSessions || {};
  return db;
}

function writeDb(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function publicUser(user) {
  const tier = subscriptionPlans[user.subscriptionTier] ? user.subscriptionTier : "silver";
  return {
    id: user.id,
    businessName: user.businessName,
    email: user.email,
    role: user.role || "admin",
    subscriptionTier: tier,
    subscription: subscriptionPlans[tier],
    trucks: user.trucks || [],
    drivers: user.drivers || [],
    documents: user.documents || [],
    complianceDocuments: user.complianceDocuments || [],
    complianceAlerts: complianceAlerts(user),
    paymentInfo: user.paymentInfo || {},
    supportIssues: user.supportIssues || [],
    affiliateCode: user.affiliateCode,
    referredBy: user.referredBy || "",
    firstMonthPaid: Boolean(user.firstMonthPaid),
    affiliateStats: affiliateStats(user)
  };
}

function cloneStarterRecords() {
  return JSON.parse(JSON.stringify(sampleRecords));
}

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(":");
  if (!salt || !hash) return false;
  const attempted = hashPassword(password, salt).split(":")[1];
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(attempted, "hex"));
}

function parseCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function setSession(res, db, userId) {
  const token = crypto.randomBytes(32).toString("hex");
  db.sessions[token] = { userId, createdAt: new Date().toISOString() };
  res.setHeader("Set-Cookie", `tb_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`);
}

function clearSession(res, db, token) {
  if (token) delete db.sessions[token];
  res.setHeader("Set-Cookie", "tb_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
}

function getCurrentUser(req, db) {
  const token = parseCookies(req).tb_session;
  const session = token ? db.sessions[token] : null;
  const user = session ? db.users.find((item) => item.id === session.userId) : null;
  return { token, user };
}

function getOwnerSession(req, db) {
  const token = parseCookies(req).tb_owner_session;
  const session = token ? db.ownerSessions[token] : null;
  return { token, owner: session?.email === ownerEmail ? { email: ownerEmail } : null };
}

function setOwnerSession(res, db) {
  const token = crypto.randomBytes(32).toString("hex");
  db.ownerSessions[token] = { email: ownerEmail, createdAt: new Date().toISOString() };
  res.setHeader("Set-Cookie", `tb_owner_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`);
}

function clearOwnerSession(res, db, token) {
  if (token) delete db.ownerSessions[token];
  res.setHeader("Set-Cookie", "tb_owner_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
}

function requireOwner(req, res, db) {
  const session = getOwnerSession(req, db);
  if (!session.owner) {
    sendError(res, 401, "Owner sign in required.");
    return null;
  }
  return session;
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getOpenAiKey() {
  return String(process.env.OPENAI_API_KEY || "").trim().replace(/^["']|["']$/g, "");
}

function openAiKeyStatus() {
  const key = getOpenAiKey();
  return {
    present: Boolean(key),
    startsWithSk: key.startsWith("sk-"),
    length: key.length,
    model: openaiModel
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 14_000_000) {
        reject(new Error("Request is too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON."));
      }
    });
  });
}

function isAllowedCollection(collection) {
  return ["trips", "expenses", "invoices", "maintenance"].includes(collection);
}

function complianceTypeName(type) {
  return complianceTypes[type]?.name || "Compliance Document";
}

function inferComplianceType(type, fileName = "") {
  const cleanType = String(type || "");
  const cleanName = String(fileName || "").toLowerCase();
  if (/\bw-?9\b/.test(cleanName)) return "w9";
  if (/\bnoa\b|notice\s+of\s+assignment/.test(cleanName)) return "noa";
  return complianceTypes[cleanType] ? cleanType : "insurance";
}

function findComplianceShare(db, token) {
  for (const user of db.users || []) {
    const share = (user.complianceShares || []).find((item) => item.token === token);
    if (share) return { user, share };
  }
  return null;
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function normalizeDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  const parts = value.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (!parts) return "";
  const year = parts[3].length === 2 ? `20${parts[3]}` : parts[3];
  return `${year}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
}

function extractDateCandidates(text) {
  const matches = [
    ...text.matchAll(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2},?\s+\d{4}\b/gi),
    ...text.matchAll(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g),
    ...text.matchAll(/\b\d{4}-\d{1,2}-\d{1,2}\b/g)
  ].map((match) => normalizeDate(match[0])).filter(Boolean);

  return [...new Set(matches)].sort();
}

function extractLabeledDateCandidates(text) {
  const datePattern = /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{1,2}-\d{1,2}/gi;
  return [...text.matchAll(datePattern)]
    .map((match) => {
      const date = normalizeDate(match[0]);
      if (!date) return null;
      const start = Math.max(0, match.index - 70);
      const end = Math.min(text.length, match.index + match[0].length + 70);
      return {
        date,
        label: text.slice(start, end).replace(/\s+/g, " ").trim()
      };
    })
    .filter(Boolean);
}

function chooseBestComplianceDate({ type, expirationDate, dates = [], dateCandidates = [] }) {
  const explicit = normalizeDate(expirationDate || "");
  if (explicit) return explicit;

  const labeled = dateCandidates
    .map((item) => ({ date: normalizeDate(item.date), label: String(item.label || "").toLowerCase() }))
    .filter((item) => item.date);

  const expirationWords = /(exp|expires|expiration|valid until|valid through|thru|through|to|end|ending|coverage end|policy exp|policy expires|policy expiration|policy period|medical card|certification expires|renewal)/i;
  const issueWords = /(issue|issued|effective|start|begin|created|printed|invoice|payment|paid|signature|signed)/i;

  const labeledExpiration = labeled
    .filter((item) => expirationWords.test(item.label))
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);
  if (labeledExpiration) return labeledExpiration.date;

  if (type === "ucr") {
    const year = labeled.map((item) => Number(item.date.slice(0, 4))).sort().at(-1);
    if (year) return `${year}-12-31`;
  }

  if (type === "form2290") {
    const years = labeled.map((item) => Number(item.date.slice(0, 4))).sort();
    if (years.length) return `${years.at(-1)}-06-30`;
  }

  const cleanDates = [
    ...dates.map(normalizeDate),
    ...labeled.filter((item) => !issueWords.test(item.label)).map((item) => item.date)
  ].filter(Boolean);

  return [...new Set(cleanDates)].sort().at(-1) || "";
}

function parseDocumentText(text, type) {
  const clean = text.replace(/\r/g, "\n").replace(/[ \t]+/g, " ");
  const amount = firstMatch(clean, [
    /(?:carrier pay|carrier rate|agreed rate|load pay|total pay|line haul|linehaul|freight charge|total due|total amount|amount due|rate|total|amount)\s*(?:amount|pay|rate)?\s*:?\s*\$?\s*([0-9,]+(?:\.\d{2})?)/i,
    /(?:pay|rate)\s+to\s+carrier\s*:?\s*\$?\s*([0-9,]+(?:\.\d{2})?)/i,
    /\$\s*([0-9,]+(?:\.\d{2})?)/
  ]);
  const miles = firstMatch(clean, [
    /(?:miles|distance)\s*:?\s*([0-9,]+)/i
  ]);
  const date = firstMatch(clean, [
    /(?:pickup date|ship date|date)\s*:?\s*([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i
  ]);
  const origin = firstMatch(clean, [
    /(?:origin|pickup|shipper)\s*:?\s*([A-Za-z .'-]+,\s*[A-Z]{2})/i,
    /from\s*:?\s*([A-Za-z .'-]+,\s*[A-Z]{2})/i
  ]);
  const destination = firstMatch(clean, [
    /(?:destination|delivery|consignee)\s*:?\s*([A-Za-z .'-]+,\s*[A-Z]{2})/i,
    /to\s*:?\s*([A-Za-z .'-]+,\s*[A-Z]{2})/i
  ]);
  const loadNumber = firstMatch(clean, [
    /(?:load|pro|bol|shipment)\s*(?:#|number|no\.?)?\s*:?\s*([A-Z0-9-]+)/i
  ]);

  return {
    type,
    loadNumber,
    date: normalizeDate(date),
    origin,
    destination,
    miles: Number(String(miles).replace(/,/g, "")) || 0,
    amount: Number(String(amount).replace(/,/g, "")) || 0,
    textPreview: clean.slice(0, 800)
  };
}

function parseComplianceText(text) {
  const clean = text.replace(/\r/g, "\n").replace(/[ \t]+/g, " ");
  const expiration = firstMatch(clean, [
    /(?:expiration date|expiration|expires on|expires|expiry date|valid until|medical card expires|policy exp\.?|policy expires|policy expiration|coverage end date|coverage ends|policy end date|end date|valid through|thru|through)\s*:?\s*([A-Za-z]{3,9}\.?\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{1,2}-\d{1,2})/i,
    /(?:exp\.?|expires)\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{1,2}-\d{1,2})/i,
    /(?:from|effective)\s+[A-Za-z0-9/.,\s-]{0,40}\s(?:to|through|thru|-)\s*([A-Za-z]{3,9}\.?\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{1,2}-\d{1,2})/i,
    /(?:period|term)\s*:?\s*[A-Za-z0-9/.,\s-]{0,40}\s(?:to|through|thru|-)\s*([A-Za-z]{3,9}\.?\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{1,2}-\d{1,2})/i
  ]);
  const candidates = extractDateCandidates(clean);
  const labeledCandidates = extractLabeledDateCandidates(clean);
  const expirationDate = chooseBestComplianceDate({
    expirationDate: normalizeDate(expiration),
    dates: candidates,
    dateCandidates: labeledCandidates
  });
  return {
    expirationDate,
    dateDetection: normalizeDate(expiration) ? "labeled_expiration" : expirationDate ? "latest_document_date" : "not_found",
    dateCandidates: labeledCandidates,
    textPreview: clean.slice(0, 800)
  };
}

function parseGenericDocumentText(text) {
  const clean = text.replace(/\r/g, "\n").replace(/[ \t]+/g, " ");
  const dates = extractDateCandidates(clean);
  const amount = firstMatch(clean, [
    /(?:carrier pay|carrier rate|agreed rate|load pay|total pay|line haul|linehaul|freight charge|total due|total amount|amount due|rate|total|amount)\s*(?:amount|pay|rate)?\s*:?\s*\$?\s*([0-9,]+(?:\.\d{2})?)/i,
    /(?:pay|rate)\s+to\s+carrier\s*:?\s*\$?\s*([0-9,]+(?:\.\d{2})?)/i,
    /\$\s*([0-9,]+(?:\.\d{2})?)/
  ]);
  const compliance = parseComplianceText(clean);
  const load = parseDocumentText(clean, "document");
  return {
    dates,
    dateCandidates: extractLabeledDateCandidates(clean),
    amount: Number(String(amount).replace(/,/g, "")) || load.amount || 0,
    expirationDate: compliance.expirationDate,
    dateDetection: compliance.dateDetection,
    loadNumber: load.loadNumber,
    origin: load.origin,
    destination: load.destination,
    miles: load.miles,
    aiUsed: false,
    textPreview: clean.slice(0, 1000)
  };
}

function categorizeExpense(text) {
  const clean = text.toLowerCase();
  if (/(fuel|diesel|gas|pilot|flying j|love'?s|ta travel|petro|shell|bp|chevron|exxon|ta-petro)/i.test(clean)) return "Fuel";
  if (/(toll|scale|weigh|parking|lumper|permit|ifta|ucr|2290)/i.test(clean)) return "Road costs";
  if (/(repair|service|oil|tire|brake|maintenance|mechanic|parts)/i.test(clean)) return "Maintenance";
  if (/(insurance|policy|premium)/i.test(clean)) return "Insurance";
  return "General";
}

function parseReceiptText(text) {
  const clean = text.replace(/\r/g, "\n").replace(/[ \t]+/g, " ");
  const generic = parseGenericDocumentText(clean);
  const totalAmount = firstMatch(clean, [
    /(?:total\s+purchases\s+(?:for\s+)?(?:this\s+)?account|total\s+purchases)\s*:?\s*\$?\s*([0-9,]+(?:\.\d{2})?)/i,
    /\*\*\s*total\s+purchases\s+(?:for\s+)?(?:this\s+)?account\s*:?\s*\$?\s*([0-9,]+(?:\.\d{2})?)/i,
    /(?:grand\s+total|total\s+sale|total\s+paid|amount\s+paid|balance\s+due|total)\s*:?\s*\$?\s*([0-9,]+(?:\.\d{2})?)/i,
    /\$\s*([0-9,]+(?:\.\d{2})?)/
  ]);
  const vendor = firstMatch(clean, [
    /(?:merchant|vendor|store|supplier)\s*:?\s*([A-Za-z0-9 &'#.,-]{2,60})/i,
    /^([A-Za-z0-9 &'#.,-]{2,60})/m
  ]);
  const amount = Number(String(totalAmount || generic.amount || "").replace(/,/g, "")) || 0;
  const date = generic.dates?.[0] || new Date().toISOString().slice(0, 10);
  const category = categorizeExpense(clean);
  return {
    date,
    amount,
    category,
    description: vendor ? `${category} - ${vendor.trim()}` : `${category} receipt`,
    textPreview: clean.slice(0, 800)
  };
}

async function scanDocument(buffer, mimeType, type) {
  const documentContext = type === "bol"
    ? "This is a BOL/delivery confirmation upload. Prioritize delivery confirmation, load number, shipper/receiver, pickup/delivery route, and dates. BOLs usually do not include carrier pay, so amount can be null or 0."
    : "This is a Rate Confirmation upload. Prioritize carrier pay/rate, route, mileage, load details, and load number.";
  const scan = await runAiScanner(buffer, mimeType, documentContext);
  const local = parseDocumentText(scan.text, type);
  const generic = scan.extracted || {};
  return {
    ...scan,
    extracted: {
      ...local,
      loadNumber: local.loadNumber || generic.loadNumber || "",
      origin: local.origin || generic.origin || "",
      destination: local.destination || generic.destination || "",
      miles: local.miles || generic.miles || 0,
      amount: local.amount || generic.amount || 0,
      date: local.date || generic.dates?.[0] || "",
      generic
    }
  };
}

async function scanReceiptDocument(buffer, mimeType) {
  const scan = await runAiScanner(buffer, mimeType, "This is an expense receipt or fuel card summary. Prioritize merchant/vendor name, purchase date, total amount paid, and trucking expense category such as Fuel, Road costs, Maintenance, Insurance, or General. For fuel card summary reports, use the line labeled Total Purchases This Account or Total Purchases for this Account as the expense amount, not an individual transaction amount.");
  const local = parseReceiptText(scan.text);
  const generic = scan.extracted || {};
  const category = categorizeExpense(`${scan.text} ${generic.notes || ""} ${generic.documentType || ""}`);
  return {
    ...scan,
    extracted: {
      ...local,
      date: generic.dates?.[0] || local.date,
      amount: local.amount || generic.amount || 0,
      category: category || local.category,
      description: generic.notes ? `${category || local.category} - ${generic.notes.slice(0, 50)}` : local.description,
      generic
    }
  };
}

async function scanComplianceDocument(buffer, mimeType, complianceType = "") {
  if (["w9", "noa"].includes(complianceType)) {
    const scan = await runAiScanner(buffer, mimeType, "This is a carrier packet compliance document. W9 and NOA documents do not have renewal dates. Store the document for broker packet sharing and do not require an expiration date.");
    return {
      ...scan,
      extracted: {
        ...(scan.extracted || {}),
        expirationDate: "",
        dateDetection: "not_required",
        carrierPacketDocument: true
      }
    };
  }
  const scan = await runAiScanner(buffer, mimeType, "This is a Compliance upload. Prioritize renewal, expiration, valid-through, policy end, coverage end, Policy Exp., DOT physical expiration, UCR, and 2290 tax period dates.", openaiVisionModel);
  const local = parseComplianceText(scan.text);
  const generic = scan.extracted || {};
  const aiExpiration = normalizeDate(generic.expirationDate || "");
  const aiDateCandidates = Array.isArray(generic.dateCandidates) ? generic.dateCandidates : [];
  const bestAiDate = chooseBestComplianceDate({
    type: complianceType,
    expirationDate: aiExpiration,
    dates: generic.dates || [],
    dateCandidates: aiDateCandidates
  });
  const bestLocalDate = chooseBestComplianceDate({
    type: complianceType,
    expirationDate: local.expirationDate,
    dates: local.dateCandidates?.map((item) => item.date) || [],
    dateCandidates: local.dateCandidates || []
  });
  const narrowAiDate = bestLocalDate || bestAiDate
    ? ""
    : await runOpenAiExpirationOnlyScanner(buffer, mimeType, scan.text, complianceType, openaiVisionModel).catch(() => "");
  return {
    ...scan,
    extracted: {
      ...local,
      expirationDate: bestLocalDate || bestAiDate || narrowAiDate || "",
      generic
    }
  };
}

async function runAiScanner(buffer, mimeType, documentContext = "", modelOverride = "") {
  let text = "";
  let scanStatus = "Scanned";
  if (/^text\//.test(mimeType) || /json|csv|xml/.test(mimeType)) {
    text = buffer.toString("utf8");
  } else if (/^image\//.test(mimeType)) {
    try {
      const tesseract = require("tesseract.js");
      const result = await tesseract.recognize(buffer, "eng");
      text = result?.data?.text || "";
    } catch {
      scanStatus = "Stored - OCR unavailable";
    }
  } else if (/pdf/i.test(mimeType)) {
    try {
      text = await extractPdfText(buffer);
      scanStatus = text ? "Scanned" : "Stored - no PDF text found";
    } catch {
      scanStatus = "Stored - PDF scan failed";
    }
  } else {
    scanStatus = "Stored - unsupported scan type";
  }
  const localExtracted = parseGenericDocumentText(text);
  let aiError = "";
  const aiExtracted = await runOpenAiDocumentScanner(buffer, mimeType, text, documentContext, modelOverride).catch((error) => {
    aiError = error.message;
    return null;
  });
  const extracted = aiExtracted ? { ...localExtracted, ...aiExtracted, aiUsed: true } : { ...localExtracted, aiUsed: false };
  return {
    scanStatus: aiExtracted ? "AI scanned" : `${scanStatus} - local fallback`,
    text,
    extracted: { ...extracted, aiError }
  };
}

function responseText(payload) {
  if (payload.output_text) return payload.output_text;
  return (payload.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || "")
    .join("\n")
    .trim();
}

function parseAiJson(text) {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(cleaned);
}

function buildOpenAiFileInput(buffer, mimeType, filename) {
  const normalizedMimeType = mimeType || "application/octet-stream";
  const base64File = buffer.toString("base64");
  if (normalizedMimeType.startsWith("image/")) {
    return {
      type: "input_image",
      image_url: `data:${normalizedMimeType};base64,${base64File}`
    };
  }

  return {
    type: "input_file",
    filename,
    file_data: base64File
  };
}

async function uploadOpenAiFile(openAiKey, buffer, mimeType, filename) {
  const form = new FormData();
  form.append("purpose", "user_data");
  form.append("file", new Blob([buffer], { type: mimeType || "application/octet-stream" }), filename);
  const response = await fetch("https://api.openai.com/v1/files", {
    method: "POST",
    headers: { "Authorization": `Bearer ${openAiKey}` },
    body: form
  });
  if (!response.ok) throw new Error(`OpenAI file upload failed: ${response.status} ${(await response.text()).slice(0, 200)}`);
  const payload = await response.json();
  return payload.id;
}

async function buildOpenAiFileInputWithUpload(openAiKey, buffer, mimeType, filename) {
  if (/pdf/i.test(mimeType || "")) {
    try {
      const fileId = await uploadOpenAiFile(openAiKey, buffer, mimeType, filename);
      return { type: "input_file", file_id: fileId };
    } catch {
      return buildOpenAiFileInput(buffer, mimeType, filename);
    }
  }
  return buildOpenAiFileInput(buffer, mimeType, filename);
}

async function runOpenAiDocumentScanner(buffer, mimeType, extractedText, documentContext = "", modelOverride = "") {
  const openAiKey = getOpenAiKey();
  if (!openAiKey || !openAiKey.startsWith("sk-")) return null;
  const fileInput = await buildOpenAiFileInputWithUpload(openAiKey, buffer, mimeType, mimeType?.includes("pdf") ? "uploaded-document.pdf" : "uploaded-document");
  const prompt = [
    "You are the AI document scanner for TruckerBooks.",
    "Extract structured trucking document data from the uploaded file.",
    documentContext,
    "Return JSON only, with these keys:",
    "documentType, dates, dateCandidates, expirationDate, amount, loadNumber, origin, destination, miles, confidence, notes.",
    "Use null for unknown scalar values and [] for no dates.",
    "dateCandidates must be an array of objects like {date: 'YYYY-MM-DD', label: 'nearby text label or context'} for every visible date.",
    "Dates must be ISO YYYY-MM-DD. Amount must be a number.",
    "For compliance documents, expirationDate should be the renewal/expiration date.",
    "For Insurance, DOT Physical, UCR, or 2290 documents, prioritize labels like Expiration Date, Expires, Valid Until, Policy Exp., Policy Period end date, Coverage End Date, Medical Card Expires, UCR year end, and Form 2290 tax period ending date.",
    "For ACORD insurance certificates, read Policy Exp., the insurance table columns labeled EFF and EXP, or policy period end. Use the Policy Exp. or EXP date, not the EFF date.",
    "If no explicit expiration label exists but there is a date range, use the later/end date as expirationDate.",
    "If multiple dates appear, choose the most likely future renewal/expiration/end date, not the issue date.",
    "For Rate Cons/BOLs, amount should be carrier pay, total carrier pay, linehaul plus fuel, or agreed rate.",
    "Do not guess wildly; use confidence from 0 to 1.",
    extractedText ? `OCR/text layer already extracted:\n${extractedText.slice(0, 6000)}` : "No text layer was available; inspect the file visually if possible."
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openAiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: modelOverride || openaiModel,
      text: {
        format: {
          type: "json_schema",
          name: "truckerbooks_document_scan",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              documentType: { type: ["string", "null"] },
              dates: { type: "array", items: { type: "string" } },
              dateCandidates: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    date: { type: "string" },
                    label: { type: "string" }
                  },
                  required: ["date", "label"]
                }
              },
              expirationDate: { type: ["string", "null"] },
              amount: { type: ["number", "null"] },
              loadNumber: { type: ["string", "null"] },
              origin: { type: ["string", "null"] },
              destination: { type: ["string", "null"] },
              miles: { type: ["number", "null"] },
              confidence: { type: "number" },
              notes: { type: ["string", "null"] }
            },
            required: ["documentType", "dates", "dateCandidates", "expirationDate", "amount", "loadNumber", "origin", "destination", "miles", "confidence", "notes"]
          }
        }
      },
      input: [
        {
          role: "user",
          content: [
            fileInput,
            {
              type: "input_text",
              text: prompt
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI scan failed: ${response.status} ${errorText.slice(0, 300)}`);
  }
  const payload = await response.json();
  const parsed = parseAiJson(responseText(payload));
  return {
    documentType: parsed.documentType || "",
    dates: Array.isArray(parsed.dates) ? parsed.dates.filter(Boolean) : [],
    dateCandidates: Array.isArray(parsed.dateCandidates) ? parsed.dateCandidates.filter((item) => item?.date) : [],
    expirationDate: parsed.expirationDate || "",
    amount: Number(parsed.amount) || 0,
    loadNumber: parsed.loadNumber || "",
    origin: parsed.origin || "",
    destination: parsed.destination || "",
    miles: Number(parsed.miles) || 0,
    confidence: Number(parsed.confidence) || 0,
    notes: parsed.notes || ""
  };
}

async function runOpenAiExpirationOnlyScanner(buffer, mimeType, extractedText, complianceType = "", modelOverride = "") {
  const openAiKey = getOpenAiKey();
  if (!openAiKey || !openAiKey.startsWith("sk-")) return "";
  const fileInput = await buildOpenAiFileInputWithUpload(openAiKey, buffer, mimeType, mimeType?.includes("pdf") ? "compliance-document.pdf" : "compliance-document");
  const typeName = complianceTypeName(complianceType);
  const prompt = [
    `This is a ${typeName} compliance document for a trucking business.`,
    "Find the document expiration, renewal, valid-through, coverage end, policy end, DOT physical expiration, UCR year end, or 2290 tax period ending date.",
    "For ACORD certificates of liability insurance, read Policy Exp., the table columns labeled EFF and EXP, or policy period end. Use the Policy Exp. or EXP date as the expiration date.",
    "Insurance certificates often show dates in compact MM/DD/YYYY boxes near policy numbers. Use the later date in the EFF/EXP pair.",
    "Return JSON only with this exact shape:",
    "{\"expirationDate\":\"YYYY-MM-DD or null\",\"reason\":\"short explanation\",\"allDates\":[\"YYYY-MM-DD\"]}",
    "If there is a date range, use the later/end date.",
    "If there are multiple dates, do not use issue date, printed date, signed date, or effective/start date unless it is the only date.",
    extractedText ? `Extracted text:\n${extractedText.slice(0, 10000)}` : "No text was extracted; inspect the uploaded file visually."
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openAiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: modelOverride || openaiVisionModel,
      input: [
        {
          role: "user",
          content: [
            fileInput,
            {
              type: "input_text",
              text: prompt
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) return "";
  const payload = await response.json();
  const text = responseText(payload);
  const parsed = parseAiJson(text);
  return normalizeDate(parsed.expirationDate || "");
}

async function extractPdfText(buffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const document = await pdfjs.getDocument({ data: new Uint8Array(buffer), disableWorker: true }).promise;
  let text = "";
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    text += `${content.items.map((item) => item.str).join(" ")}\n`;
  }
  return text;
}

function buildTripFromDocument(document) {
  const extracted = document.extracted || {};
  if (!extracted.origin && !extracted.destination && !extracted.amount && !extracted.loadNumber) return null;
  return {
    id: crypto.randomUUID(),
    date: extracted.date || new Date().toISOString().slice(0, 10),
    description: `${document.type === "bol" ? "BOL" : "Rate Con"} ${extracted.loadNumber || document.fileName}`,
    origin: extracted.origin || "Origin TBD",
    destination: extracted.destination || "Destination TBD",
    miles: extracted.miles || 0,
    amount: extracted.amount || 0,
    status: "Scheduled",
    sourceDocumentId: document.id,
    autoPopulated: true
  };
}

async function rescanPendingDocuments(user) {
  let changed = false;
  for (const document of user.documents || []) {
    if (document.extracted?.amount && document.scanStatus === "Scanned") continue;
    const filePath = path.join(uploadDir, document.storedName);
    if (!fs.existsSync(filePath)) continue;
    const scan = await scanDocument(fs.readFileSync(filePath), document.mimeType, document.type);
    document.scanStatus = scan.scanStatus;
    document.extracted = scan.extracted;
    if (!document.createdTripId) {
      const trip = buildTripFromDocument(document);
      if (trip) {
        user.records.trips.push(trip);
        document.createdTripId = trip.id;
      }
    } else {
      const trip = user.records.trips.find((item) => item.id === document.createdTripId);
      if (trip && scan.extracted?.amount) trip.amount = scan.extracted.amount;
    }
    changed = true;
  }
  return changed;
}

async function rescanAllStoredDocuments() {
  const db = readDb();
  let changed = false;
  for (const user of db.users) {
    if (await rescanPendingDocuments(user)) changed = true;
  }
  if (changed) writeDb(db);
}

function normalizeUser(user) {
  user.subscriptionTier = subscriptionPlans[user.subscriptionTier] ? user.subscriptionTier : "silver";
  user.trucks = Array.isArray(user.trucks) ? user.trucks : [];
  user.drivers = Array.isArray(user.drivers) ? user.drivers : [];
  user.drivers = user.drivers.map((driver) => ({
    ...driver,
    role: accountAccessRoles[driver.role] ? driver.role : "driver",
    roleLabel: accountAccessRoles[driver.role] || "Driver"
  }));
  user.documents = Array.isArray(user.documents) ? user.documents : [];
  user.complianceDocuments = Array.isArray(user.complianceDocuments) ? user.complianceDocuments : [];
  user.complianceDocuments = user.complianceDocuments.map((document) => {
    const type = inferComplianceType(document.type, document.fileName);
    if (["w9", "noa"].includes(type)) {
      return {
        ...document,
        type,
        expirationDate: "",
        extracted: { ...(document.extracted || {}), expirationDate: "", dateDetection: "not_required", carrierPacketDocument: true },
        aiScan: { ...(document.aiScan || {}), expirationDate: "", dateDetection: "not_required", carrierPacketDocument: true }
      };
    }
    return { ...document, type };
  });
  user.complianceShares = Array.isArray(user.complianceShares) ? user.complianceShares : [];
  user.completedComplianceAlerts = Array.isArray(user.completedComplianceAlerts) ? user.completedComplianceAlerts : [];
  user.affiliateCode = user.affiliateCode || crypto.randomBytes(5).toString("hex");
  user.referredBy = user.referredBy || "";
  user.firstMonthPaid = Boolean(user.firstMonthPaid);
  user.commissions = Array.isArray(user.commissions) ? user.commissions : [];
  user.paymentInfo = user.paymentInfo && typeof user.paymentInfo === "object" ? user.paymentInfo : {};
  user.supportIssues = Array.isArray(user.supportIssues) ? user.supportIssues : [];
  user.role = user.role || "admin";
  return user;
}

function affiliateStats(user) {
  const referrals = user.commissions || [];
  return {
    referralCount: referrals.length,
    paidCount: referrals.filter((item) => item.status === "earned").length,
    pendingCount: referrals.filter((item) => item.status === "pending").length,
    earnedTotal: referrals.filter((item) => item.status === "earned").reduce((total, item) => total + item.amount, 0),
    referrals
  };
}

function ownerCustomerSummary(user) {
  const plan = currentPlan(user);
  const documents = [...(user.documents || []), ...(user.complianceDocuments || [])];
  const scannerErrors = documents.filter((item) => item.extracted?.aiError || item.aiScan?.aiError || /fallback|failed|unavailable|not detected/i.test(`${item.scanStatus || ""} ${item.extracted?.dateDetection || ""}`));
  return {
    id: user.id,
    businessName: user.businessName,
    email: user.email,
    status: user.accountStatus || "Active",
    subscriptionTier: user.subscriptionTier,
    subscriptionName: plan.name,
    trucksUsed: (user.trucks || []).length,
    trucksAllowed: plan.maxTrucks,
    driverAccessCount: (user.drivers || []).length,
    documentCount: documents.length,
    scannerIssueCount: scannerErrors.length,
    supportIssueCount: (user.supportIssues || []).filter((item) => item.status !== "Closed").length,
    firstMonthPaid: Boolean(user.firstMonthPaid),
    paymentMethod: user.paymentInfo?.last4 ? `${user.paymentInfo.cardBrand || "Card"} ending ${user.paymentInfo.last4}` : "No payment saved",
    createdAt: user.createdAt || "",
    updatedAt: user.updatedAt || ""
  };
}

function ownerCustomerDetail(user) {
  return {
    ...ownerCustomerSummary(user),
    businessName: user.businessName,
    email: user.email,
    subscriptionTier: user.subscriptionTier,
    paymentInfo: user.paymentInfo || {},
    trucks: user.trucks || [],
    drivers: user.drivers || [],
    documents: (user.documents || []).map((item) => ({
      id: item.id,
      type: item.type,
      fileName: item.fileName,
      scanStatus: item.scanStatus || "Stored",
      amount: item.extracted?.amount || 0,
      aiUsed: Boolean(item.extracted?.aiUsed),
      aiError: item.extracted?.aiError || item.aiScan?.aiError || "",
      uploadedAt: item.uploadedAt || ""
    })),
    complianceDocuments: (user.complianceDocuments || []).map((item) => ({
      id: item.id,
      type: item.type,
      fileName: item.fileName,
      scanStatus: item.scanStatus || "Stored",
      expirationDate: item.expirationDate || item.extracted?.expirationDate || "",
      dateDetection: item.extracted?.dateDetection || "",
      aiUsed: Boolean(item.extracted?.generic?.aiUsed || item.aiScan?.generic?.aiUsed),
      aiError: item.extracted?.generic?.aiError || item.extracted?.aiError || item.aiScan?.aiError || "",
      uploadedAt: item.uploadedAt || ""
    })),
    complianceAlerts: complianceAlerts(user),
    supportIssues: user.supportIssues || [],
    scannerErrors: [
      ...(user.documents || []).filter((item) => item.extracted?.aiError || /fallback|failed|unavailable/i.test(item.scanStatus || "")).map((item) => ({
        type: "Rate Con/BOL",
        fileName: item.fileName,
        scanStatus: item.scanStatus || "Stored",
        message: item.extracted?.aiError || "Review scan status",
        uploadedAt: item.uploadedAt || ""
      })),
      ...(user.complianceDocuments || []).filter((item) => item.extracted?.generic?.aiError || item.extracted?.aiError || /fallback|failed|unavailable|not detected/i.test(`${item.scanStatus || ""} ${item.extracted?.dateDetection || ""}`)).map((item) => ({
        type: "Compliance",
        fileName: item.fileName,
        scanStatus: item.scanStatus || "Stored",
        message: item.extracted?.generic?.aiError || item.extracted?.aiError || item.extracted?.dateDetection || "Review scan status",
        uploadedAt: item.uploadedAt || ""
      }))
    ]
  };
}

function daysUntil(date) {
  const target = new Date(`${date}T12:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.ceil((target - start) / 86400000);
}

function lastDayOfMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).toISOString().slice(0, 10);
}

function upcomingIftaDeadlines() {
  const today = new Date();
  const year = today.getFullYear();
  const deadlines = [
    { label: "October IFTA Taxes", date: lastDayOfMonth(year - 1, 9) },
    { label: "January IFTA Taxes", date: lastDayOfMonth(year, 0) },
    { label: "April IFTA Taxes", date: lastDayOfMonth(year, 3) },
    { label: "July IFTA Taxes", date: lastDayOfMonth(year, 6) },
    { label: "October IFTA Taxes", date: lastDayOfMonth(year, 9) },
    { label: "January IFTA Taxes", date: lastDayOfMonth(year + 1, 0) }
  ];
  return deadlines.filter((item) => {
    const days = daysUntil(item.date);
    return days !== null && days <= 45 && days >= -120;
  }).slice(0, 4);
}

function complianceAlerts(user) {
  const completed = new Set(user.completedComplianceAlerts || []);
  const documentAlerts = (user.complianceDocuments || [])
    .filter((item) => !["w9", "noa"].includes(item.type) && item.expirationDate)
    .map((item) => ({
      id: item.id,
      label: `${complianceTypeName(item.type)} renewal`,
      date: item.expirationDate,
      daysUntil: daysUntil(item.expirationDate),
      source: "document"
    }))
    .filter((item) => item.daysUntil !== null && item.daysUntil <= 45 && !completed.has(item.id))
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const iftaAlerts = upcomingIftaDeadlines()
    .map((item) => ({
      id: `ifta-${item.date}`,
      label: item.label,
      date: item.date,
      daysUntil: daysUntil(item.date),
      source: "ifta"
    }))
    .filter((item) => !completed.has(item.id));

  return [...documentAlerts, ...iftaAlerts].sort((a, b) => a.daysUntil - b.daysUntil);
}

function currentPlan(user) {
  return subscriptionPlans[user.subscriptionTier] || subscriptionPlans.silver;
}

function requireAdmin(user, res) {
  if ((user.role || "admin") !== "admin") {
    sendError(res, 403, "Only account admins can manage trucks and account access.");
    return false;
  }
  return true;
}

async function handleApi(req, res, pathname) {
  const db = readDb();
  const { token, user } = getCurrentUser(req, db);

  if (req.method === "GET" && pathname.match(/^\/api\/shared-compliance\/[^/]+\/[^/]+$/)) {
    const [, , , tokenValue, documentId] = pathname.split("/");
    const found = findComplianceShare(db, tokenValue);
    if (!found || !found.share.documentIds.includes(documentId)) return sendError(res, 404, "Shared document not found.");
    const document = found.user.complianceDocuments.find((item) => item.id === documentId);
    if (!document) return sendError(res, 404, "Shared document not found.");
    const filePath = path.join(uploadDir, document.storedName);
    if (!fs.existsSync(filePath)) return sendError(res, 404, "Uploaded file is missing.");
    res.writeHead(200, {
      "Content-Type": document.mimeType,
      "Content-Disposition": `attachment; filename="${document.fileName.replace(/"/g, "")}"`
    });
    return fs.createReadStream(filePath).pipe(res);
  }

  if (req.method === "POST" && pathname === "/api/signup") {
    const body = await readBody(req);
    const email = normalizeEmail(body.email);
    const password = String(body.password || "");
    if (!email || !password || password.length < 4) return sendError(res, 400, "Enter an email and password with at least 4 characters.");
    if (db.users.some((item) => item.email === email)) return sendError(res, 409, "An account already exists for that email.");

    const newUser = {
      id: crypto.randomUUID(),
      businessName: String(body.businessName || "").trim() || "My Trucking Business",
      email,
      passwordHash: hashPassword(password),
      role: "admin",
      subscriptionTier: subscriptionPlans[body.subscriptionTier] ? body.subscriptionTier : "silver",
      trucks: [],
      drivers: [],
      documents: [],
      complianceDocuments: [],
      affiliateCode: crypto.randomBytes(5).toString("hex"),
      referredBy: db.users.some((item) => item.affiliateCode === body.referralCode) ? body.referralCode : "",
      firstMonthPaid: false,
      commissions: [],
      records: cloneStarterRecords(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.users.push(newUser);
    if (newUser.referredBy) {
      const referrer = db.users.find((item) => item.affiliateCode === newUser.referredBy);
      if (referrer) {
        referrer.commissions = Array.isArray(referrer.commissions) ? referrer.commissions : [];
        referrer.commissions.push({
          id: crypto.randomUUID(),
          referredUserId: newUser.id,
          referredBusinessName: newUser.businessName,
          referredEmail: newUser.email,
          amount: 10,
          commissionType: "one_time_first_paid_month",
          status: "pending",
          createdAt: new Date().toISOString()
        });
      }
    }
    setSession(res, db, newUser.id);
    writeDb(db);
    return sendJson(res, 201, { customer: publicUser(newUser), records: newUser.records });
  }

  if (req.method === "POST" && pathname === "/api/login") {
    const body = await readBody(req);
    const email = normalizeEmail(body.email);
    const userMatch = db.users.find((item) => item.email === email);
    if (!userMatch || !verifyPassword(body.password || "", userMatch.passwordHash)) return sendError(res, 401, "Email or password did not match an account.");
    setSession(res, db, userMatch.id);
    writeDb(db);
    return sendJson(res, 200, { customer: publicUser(userMatch), records: userMatch.records });
  }

  if (req.method === "POST" && pathname === "/api/logout") {
    clearSession(res, db, token);
    writeDb(db);
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "POST" && pathname === "/api/owner/login") {
    const body = await readBody(req);
    const email = normalizeEmail(body.email);
    if (!ownerPassword) return sendError(res, 503, "Owner login is not configured yet. Add OWNER_EMAIL and OWNER_PASSWORD in Railway.");
    if (email !== ownerEmail || String(body.password || "") !== ownerPassword) {
      return sendError(res, 401, "Owner email or password did not match.");
    }
    setOwnerSession(res, db);
    writeDb(db);
    return sendJson(res, 200, { owner: { email: ownerEmail } });
  }

  if (req.method === "POST" && pathname === "/api/owner/logout") {
    const ownerSession = getOwnerSession(req, db);
    clearOwnerSession(res, db, ownerSession.token);
    writeDb(db);
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "GET" && pathname === "/api/owner/session") {
    const ownerSession = getOwnerSession(req, db);
    if (!ownerSession.owner) return sendError(res, 401, "Owner sign in required.");
    return sendJson(res, 200, { owner: ownerSession.owner });
  }

  if (req.method === "GET" && pathname === "/api/owner/customers") {
    if (!requireOwner(req, res, db)) return;
    const query = String(new URL(req.url, `http://${req.headers.host}`).searchParams.get("q") || "").toLowerCase();
    const customers = db.users
      .filter((item) => !query || `${item.businessName} ${item.email}`.toLowerCase().includes(query))
      .map(ownerCustomerSummary)
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    return sendJson(res, 200, { customers });
  }

  if (req.method === "GET" && pathname.startsWith("/api/owner/customers/")) {
    if (!requireOwner(req, res, db)) return;
    const id = pathname.split("/")[4];
    const customer = db.users.find((item) => item.id === id);
    if (!customer) return sendError(res, 404, "Customer not found.");
    return sendJson(res, 200, { customer: ownerCustomerDetail(customer) });
  }

  if (req.method === "PATCH" && pathname.startsWith("/api/owner/customers/")) {
    if (!requireOwner(req, res, db)) return;
    const id = pathname.split("/")[4];
    const customer = db.users.find((item) => item.id === id);
    if (!customer) return sendError(res, 404, "Customer not found.");
    const body = await readBody(req);
    const businessName = String(body.businessName || "").trim();
    const email = normalizeEmail(body.email);
    const tier = subscriptionPlans[body.subscriptionTier] ? body.subscriptionTier : customer.subscriptionTier;
    const accountStatus = ["Active", "Needs Support", "Paused"].includes(body.accountStatus) ? body.accountStatus : "Active";
    if (!businessName) return sendError(res, 400, "Enter the business name.");
    if (!email) return sendError(res, 400, "Enter the customer email.");
    if (db.users.some((item) => item.id !== customer.id && item.email === email)) return sendError(res, 409, "Another customer already uses that email.");
    customer.businessName = businessName;
    customer.email = email;
    customer.subscriptionTier = tier;
    customer.accountStatus = accountStatus;
    customer.firstMonthPaid = Boolean(body.firstMonthPaid);
    customer.updatedAt = new Date().toISOString();
    writeDb(db);
    return sendJson(res, 200, { customer: ownerCustomerDetail(customer), customers: db.users.map(ownerCustomerSummary) });
  }

  if (req.method === "POST" && pathname.match(/^\/api\/owner\/customers\/[^/]+\/reset-password$/)) {
    if (!requireOwner(req, res, db)) return;
    const id = pathname.split("/")[4];
    const customer = db.users.find((item) => item.id === id);
    if (!customer) return sendError(res, 404, "Customer not found.");
    const temporaryPassword = crypto.randomBytes(5).toString("hex");
    customer.passwordHash = hashPassword(temporaryPassword);
    customer.updatedAt = new Date().toISOString();
    writeDb(db);
    return sendJson(res, 200, { temporaryPassword, customer: ownerCustomerDetail(customer) });
  }

  if (req.method === "POST" && pathname.match(/^\/api\/owner\/customers\/[^/]+\/drivers\/[^/]+\/resend$/)) {
    if (!requireOwner(req, res, db)) return;
    const [, , , , customerId, , driverId] = pathname.split("/");
    const customer = db.users.find((item) => item.id === customerId);
    if (!customer) return sendError(res, 404, "Customer not found.");
    const driver = customer.drivers.find((item) => item.id === driverId);
    if (!driver) return sendError(res, 404, "Account access invite not found.");
    driver.inviteToken = crypto.randomBytes(24).toString("hex");
    driver.inviteLink = `/account-access/${driver.inviteToken}`;
    driver.status = "Access resent";
    driver.resentAt = new Date().toISOString();
    customer.updatedAt = new Date().toISOString();
    writeDb(db);
    return sendJson(res, 200, { inviteLink: driver.inviteLink, customer: ownerCustomerDetail(customer) });
  }

  if (!user) return sendError(res, 401, "Please sign in first.");

  if (req.method === "GET" && pathname === "/api/scanner-status") {
    const keyStatus = openAiKeyStatus();
    return sendJson(res, 200, {
      aiConfigured: keyStatus.present && keyStatus.startsWithSk,
      model: keyStatus.model,
      keyPresent: keyStatus.present,
      keyStartsWithSk: keyStatus.startsWithSk,
      keyLength: keyStatus.length,
      fallbackAvailable: true
    });
  }

  if (req.method === "GET" && pathname === "/api/session") {
    if (await rescanPendingDocuments(user)) writeDb(db);
    return sendJson(res, 200, { customer: publicUser(user), records: user.records });
  }

  if (req.method === "GET" && pathname === "/api/account") {
    if (await rescanPendingDocuments(user)) writeDb(db);
    return sendJson(res, 200, { customer: publicUser(user) });
  }

  if (req.method === "GET" && pathname === "/api/affiliate") {
    return sendJson(res, 200, { customer: publicUser(user) });
  }

  if (req.method === "POST" && pathname === "/api/support/issues") {
    const body = await readBody(req);
    const category = String(body.category || "Other").trim() || "Other";
    const subject = String(body.subject || "").trim();
    const message = String(body.message || "").trim();
    if (!subject) return sendError(res, 400, "Enter a subject for the issue.");
    if (!message) return sendError(res, 400, "Describe the issue.");
    const issue = {
      id: crypto.randomUUID(),
      category,
      subject,
      message,
      status: "Open",
      customerEmail: user.email,
      customerBusinessName: user.businessName,
      createdAt: new Date().toISOString()
    };
    user.supportIssues.push(issue);
    user.accountStatus = "Needs Support";
    user.updatedAt = new Date().toISOString();
    writeDb(db);
    return sendJson(res, 201, { issue, supportIssues: user.supportIssues, customer: publicUser(user) });
  }

  if (req.method === "POST" && pathname === "/api/billing/first-month-paid") {
    if (!requireAdmin(user, res)) return;
    user.firstMonthPaid = true;
    user.updatedAt = new Date().toISOString();
    if (user.referredBy) {
      const referrer = db.users.find((item) => item.affiliateCode === user.referredBy);
      const commission = referrer?.commissions?.find((item) => item.referredUserId === user.id);
      if (commission && commission.status !== "earned") {
        commission.status = "earned";
        commission.earnedAt = new Date().toISOString();
      }
    }
    writeDb(db);
    return sendJson(res, 200, { customer: publicUser(user) });
  }

  if (req.method === "PATCH" && pathname === "/api/account/subscription") {
    if (!requireAdmin(user, res)) return;
    const body = await readBody(req);
    if (!subscriptionPlans[body.subscriptionTier]) return sendError(res, 400, "Choose Silver, Gold, or Platinum.");
    const nextPlan = subscriptionPlans[body.subscriptionTier];
    if (user.trucks.length > nextPlan.maxTrucks) {
      return sendError(res, 400, `Remove trucks before changing to ${nextPlan.name}. It allows up to ${nextPlan.maxTrucks}.`);
    }
    user.subscriptionTier = body.subscriptionTier;
    user.updatedAt = new Date().toISOString();
    writeDb(db);
    return sendJson(res, 200, { customer: publicUser(user) });
  }

  if (req.method === "PATCH" && pathname === "/api/account/payment") {
    if (!requireAdmin(user, res)) return;
    const body = await readBody(req);
    const billingName = String(body.billingName || "").trim();
    const billingEmail = normalizeEmail(body.billingEmail);
    const cardBrand = String(body.cardBrand || "Other").trim() || "Other";
    const cardDigits = String(body.cardNumber || "").replace(/\D/g, "");
    const expMonth = String(body.expMonth || "").padStart(2, "0");
    const expYear = String(body.expYear || "");
    const billingZip = String(body.billingZip || "").trim();
    const previous = user.paymentInfo || {};

    if (!billingName) return sendError(res, 400, "Enter the billing name.");
    if (!billingEmail) return sendError(res, 400, "Enter the billing email.");
    if (!/^(0[1-9]|1[0-2])$/.test(expMonth)) return sendError(res, 400, "Choose a valid expiration month.");
    if (!/^20\d{2}$/.test(expYear)) return sendError(res, 400, "Choose a valid expiration year.");
    if (!billingZip) return sendError(res, 400, "Enter the billing ZIP.");
    if (!previous.last4 && cardDigits.length < 4) return sendError(res, 400, "Enter the card number.");
    if (cardDigits && cardDigits.length < 12) return sendError(res, 400, "Enter a valid card number.");

    user.paymentInfo = {
      billingName,
      billingEmail,
      cardBrand,
      last4: cardDigits ? cardDigits.slice(-4) : previous.last4 || "",
      expMonth,
      expYear,
      billingZip,
      updatedAt: new Date().toISOString()
    };
    user.updatedAt = new Date().toISOString();
    writeDb(db);
    return sendJson(res, 200, { customer: publicUser(user) });
  }

  if (req.method === "POST" && pathname === "/api/trucks") {
    if (!requireAdmin(user, res)) return;
    const plan = currentPlan(user);
    if (user.trucks.length >= plan.maxTrucks) return sendError(res, 400, `${plan.name} allows up to ${plan.maxTrucks} trucks.`);
    const body = await readBody(req);
    const truck = {
      id: crypto.randomUUID(),
      unitNumber: String(body.unitNumber || "").trim() || `Truck ${user.trucks.length + 1}`,
      vin: String(body.vin || "").trim(),
      status: String(body.status || "Active").trim() || "Active",
      createdAt: new Date().toISOString()
    };
    user.trucks.push(truck);
    user.updatedAt = new Date().toISOString();
    writeDb(db);
    return sendJson(res, 201, { truck, customer: publicUser(user) });
  }

  if (req.method === "DELETE" && pathname.startsWith("/api/trucks/")) {
    if (!requireAdmin(user, res)) return;
    const id = pathname.split("/")[3];
    user.trucks = user.trucks.filter((truck) => truck.id !== id);
    user.drivers = user.drivers.map((driver) => driver.truckId === id ? { ...driver, truckId: "" } : driver);
    user.updatedAt = new Date().toISOString();
    writeDb(db);
    return sendJson(res, 200, { customer: publicUser(user) });
  }

  if (req.method === "POST" && pathname === "/api/drivers/invite") {
    if (!requireAdmin(user, res)) return;
    const plan = currentPlan(user);
    const body = await readBody(req);
    const role = accountAccessRoles[body.role] ? body.role : "driver";
    const currentDriverCount = user.drivers.filter((driver) => (driver.role || "driver") === "driver").length;
    if (role === "driver" && currentDriverCount >= plan.maxTrucks) {
      return sendError(res, 400, `${plan.name} allows driver access for up to ${plan.maxTrucks} drivers.`);
    }
    const email = normalizeEmail(body.email);
    if (!email) return sendError(res, 400, "Enter the user's email.");
    if (user.drivers.some((driver) => driver.email === email)) return sendError(res, 409, "That user already has access or an invite.");
    const truckNumber = String(body.truckNumber || "").trim();
    let truckId = "";
    if (role === "driver" && truckNumber) {
      let truck = user.trucks.find((item) => item.unitNumber.toLowerCase() === truckNumber.toLowerCase());
      if (!truck) {
        if (user.trucks.length >= plan.maxTrucks) return sendError(res, 400, `${plan.name} allows up to ${plan.maxTrucks} trucks. Add this driver to an existing truck number or upgrade the plan.`);
        truck = {
          id: crypto.randomUUID(),
          unitNumber: truckNumber,
          vin: "",
          status: "Active",
          createdAt: new Date().toISOString()
        };
        user.trucks.push(truck);
      }
      truckId = truck.id;
    }
    const inviteToken = crypto.randomBytes(24).toString("hex");
    const driver = {
      id: crypto.randomUUID(),
      name: String(body.name || "").trim() || accountAccessRoles[role],
      email,
      role,
      roleLabel: accountAccessRoles[role],
      truckId,
      truckNumber: role === "driver" ? truckNumber : "",
      status: "Access sent",
      inviteToken,
      inviteLink: `/account-access/${inviteToken}`,
      createdAt: new Date().toISOString()
    };
    user.drivers.push(driver);
    user.updatedAt = new Date().toISOString();
    writeDb(db);
    return sendJson(res, 201, { driver, customer: publicUser(user) });
  }

  if (req.method === "DELETE" && pathname.startsWith("/api/drivers/")) {
    if (!requireAdmin(user, res)) return;
    const id = pathname.split("/")[3];
    user.drivers = user.drivers.filter((driver) => driver.id !== id);
    user.updatedAt = new Date().toISOString();
    writeDb(db);
    return sendJson(res, 200, { customer: publicUser(user) });
  }

  if (req.method === "GET" && pathname === "/api/records") {
    return sendJson(res, 200, { records: user.records });
  }

  if (req.method === "GET" && pathname === "/api/documents") {
    if (await rescanPendingDocuments(user)) writeDb(db);
    return sendJson(res, 200, { documents: user.documents });
  }

  if (req.method === "GET" && pathname === "/api/compliance") {
    return sendJson(res, 200, {
      complianceDocuments: user.complianceDocuments,
      complianceAlerts: complianceAlerts(user)
    });
  }

  if (req.method === "POST" && pathname === "/api/compliance-alerts/complete") {
    const body = await readBody(req);
    const alertId = String(body.alertId || "").trim();
    if (!alertId) return sendError(res, 400, "Choose an alert to complete.");
    if (!user.completedComplianceAlerts.includes(alertId)) user.completedComplianceAlerts.push(alertId);
    user.updatedAt = new Date().toISOString();
    writeDb(db);
    return sendJson(res, 200, { complianceAlerts: complianceAlerts(user), customer: publicUser(user) });
  }

  if (req.method === "POST" && pathname === "/api/compliance") {
    const body = await readBody(req);
    const fileName = path.basename(String(body.fileName || "compliance-document"));
    const type = inferComplianceType(body.type, fileName);
    const mimeType = String(body.mimeType || "application/octet-stream");
    const base64 = String(body.data || "").replace(/^data:[^;]+;base64,/, "");
    if (!base64) return sendError(res, 400, "Choose a compliance document to upload.");
    const buffer = Buffer.from(base64, "base64");
    if (buffer.length > 10_000_000) return sendError(res, 400, "Uploads are limited to 10 MB each.");
    const id = crypto.randomUUID();
    const storedName = `${user.id}-${id}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    fs.writeFileSync(path.join(uploadDir, storedName), buffer);
    const scan = await scanComplianceDocument(buffer, mimeType, type);
    const complianceDocument = {
      id,
      type,
      fileName,
      mimeType,
      storedName,
      size: buffer.length,
      scanStatus: scan.scanStatus,
      expirationDate: scan.extracted.expirationDate,
      extracted: scan.extracted,
      aiScan: scan.extracted,
      uploadedAt: new Date().toISOString()
    };
    user.complianceDocuments.push(complianceDocument);
    user.updatedAt = new Date().toISOString();
    writeDb(db);
    return sendJson(res, 201, {
      complianceDocument,
      complianceDocuments: user.complianceDocuments,
      complianceAlerts: complianceAlerts(user)
    });
  }

  if (req.method === "GET" && pathname.startsWith("/api/compliance/")) {
    const id = pathname.split("/")[3];
    const document = user.complianceDocuments.find((item) => item.id === id);
    if (!document) return sendError(res, 404, "Compliance document not found.");
    const filePath = path.join(uploadDir, document.storedName);
    if (!fs.existsSync(filePath)) return sendError(res, 404, "Uploaded file is missing.");
    res.writeHead(200, {
      "Content-Type": document.mimeType,
      "Content-Disposition": `attachment; filename="${document.fileName.replace(/"/g, "")}"`
    });
    return fs.createReadStream(filePath).pipe(res);
  }

  if (req.method === "POST" && pathname === "/api/compliance/share") {
    const body = await readBody(req);
    const ids = Array.isArray(body.documentIds) ? body.documentIds.map(String) : [];
    const selectedDocuments = user.complianceDocuments.filter((item) => ids.includes(item.id));
    if (!selectedDocuments.length) return sendError(res, 400, "Select at least one compliance document to share.");
    const tokenValue = crypto.randomBytes(18).toString("hex");
    const share = {
      token: tokenValue,
      documentIds: selectedDocuments.map((item) => item.id),
      createdAt: new Date().toISOString()
    };
    user.complianceShares.push(share);
    user.updatedAt = new Date().toISOString();
    writeDb(db);
    return sendJson(res, 201, {
      shareUrl: `${body.origin || ""}/shared-compliance/${tokenValue}`,
      documents: selectedDocuments.map((item) => ({ id: item.id, fileName: item.fileName, type: item.type }))
    });
  }

  if (req.method === "DELETE" && pathname.startsWith("/api/compliance/")) {
    const id = pathname.split("/")[3];
    const document = user.complianceDocuments.find((item) => item.id === id);
    user.complianceDocuments = user.complianceDocuments.filter((item) => item.id !== id);
    if (document) {
      const filePath = path.join(uploadDir, document.storedName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    user.updatedAt = new Date().toISOString();
    writeDb(db);
    return sendJson(res, 200, {
      complianceDocuments: user.complianceDocuments,
      complianceAlerts: complianceAlerts(user)
    });
  }

  if (req.method === "PATCH" && pathname.startsWith("/api/compliance/")) {
    const id = pathname.split("/")[3];
    const body = await readBody(req);
    const document = user.complianceDocuments.find((item) => item.id === id);
    if (!document) return sendError(res, 404, "Compliance document not found.");
    const expirationDate = normalizeDate(String(body.expirationDate || ""));
    if (!expirationDate) return sendError(res, 400, "Enter a valid expiration date.");
    document.expirationDate = expirationDate;
    document.manualExpirationDate = true;
    document.extracted = { ...(document.extracted || {}), expirationDate, dateDetection: "manual" };
    document.aiScan = { ...(document.aiScan || {}), expirationDate, dateDetection: "manual" };
    user.updatedAt = new Date().toISOString();
    writeDb(db);
    return sendJson(res, 200, {
      complianceDocuments: user.complianceDocuments,
      complianceAlerts: complianceAlerts(user)
    });
  }

  if (req.method === "POST" && pathname.match(/^\/api\/compliance\/[^/]+\/rescan$/)) {
    const id = pathname.split("/")[3];
    const document = user.complianceDocuments.find((item) => item.id === id);
    if (!document) return sendError(res, 404, "Compliance document not found.");
    const filePath = path.join(uploadDir, document.storedName);
    if (!fs.existsSync(filePath)) return sendError(res, 404, "Uploaded file is missing.");
    const scan = await scanComplianceDocument(fs.readFileSync(filePath), document.mimeType, document.type);
    document.scanStatus = scan.scanStatus;
    document.expirationDate = scan.extracted.expirationDate;
    document.extracted = scan.extracted;
    document.aiScan = scan.extracted;
    document.rescannedAt = new Date().toISOString();
    user.updatedAt = new Date().toISOString();
    writeDb(db);
    return sendJson(res, 200, {
      complianceDocuments: user.complianceDocuments,
      complianceAlerts: complianceAlerts(user)
    });
  }

  if (req.method === "POST" && pathname === "/api/documents") {
    const body = await readBody(req);
    const type = body.type === "bol" ? "bol" : "rateCon";
    const fileName = path.basename(String(body.fileName || "document"));
    const mimeType = String(body.mimeType || "application/octet-stream");
    const base64 = String(body.data || "").replace(/^data:[^;]+;base64,/, "");
    if (!base64) return sendError(res, 400, "Choose a file to upload.");
    const buffer = Buffer.from(base64, "base64");
    if (buffer.length > 10_000_000) return sendError(res, 400, "Uploads are limited to 10 MB each.");
    const id = crypto.randomUUID();
    const storedName = `${user.id}-${id}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    fs.writeFileSync(path.join(uploadDir, storedName), buffer);
    const scan = await scanDocument(buffer, mimeType, type);
    const document = {
      id,
      type,
      fileName,
      mimeType,
      storedName,
      size: buffer.length,
      scanStatus: scan.scanStatus,
      extracted: scan.extracted,
      aiScan: scan.extracted.generic,
      uploadedAt: new Date().toISOString()
    };
    user.documents.push(document);
    const trip = buildTripFromDocument(document);
    if (trip) {
      user.records.trips.push(trip);
      document.createdTripId = trip.id;
    }
    user.updatedAt = new Date().toISOString();
    writeDb(db);
    return sendJson(res, 201, { document, documents: user.documents, records: user.records });
  }

  if (req.method === "POST" && pathname === "/api/expenses/receipt") {
    const body = await readBody(req);
    const fileName = path.basename(String(body.fileName || "receipt"));
    const mimeType = String(body.mimeType || "application/octet-stream");
    const categoryOverride = String(body.category || "").trim();
    const base64 = String(body.data || "").replace(/^data:[^;]+;base64,/, "");
    if (!base64) return sendError(res, 400, "Choose a receipt to upload.");
    const buffer = Buffer.from(base64, "base64");
    if (buffer.length > 10_000_000) return sendError(res, 400, "Uploads are limited to 10 MB each.");
    const id = crypto.randomUUID();
    const storedName = `${user.id}-${id}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    fs.writeFileSync(path.join(uploadDir, storedName), buffer);
    const scan = await scanReceiptDocument(buffer, mimeType);
    const expense = {
      id: crypto.randomUUID(),
      date: scan.extracted.date || new Date().toISOString().slice(0, 10),
      description: scan.extracted.description || fileName,
      amount: scan.extracted.amount || 0,
      category: categoryOverride || scan.extracted.category || "General",
      status: "Paid",
      sourceReceipt: {
        id,
        fileName,
        mimeType,
        storedName,
        size: buffer.length,
        scanStatus: scan.scanStatus,
        extracted: scan.extracted,
        uploadedAt: new Date().toISOString()
      }
    };
    user.records.expenses.push(expense);
    user.updatedAt = new Date().toISOString();
    writeDb(db);
    return sendJson(res, 201, { expense, records: user.records });
  }

  if (req.method === "GET" && pathname.startsWith("/api/documents/")) {
    const id = pathname.split("/")[3];
    const document = user.documents.find((item) => item.id === id);
    if (!document) return sendError(res, 404, "Document not found.");
    const filePath = path.join(uploadDir, document.storedName);
    if (!fs.existsSync(filePath)) return sendError(res, 404, "Uploaded file is missing.");
    res.writeHead(200, {
      "Content-Type": document.mimeType,
      "Content-Disposition": `attachment; filename="${document.fileName.replace(/"/g, "")}"`
    });
    return fs.createReadStream(filePath).pipe(res);
  }

  if (req.method === "PATCH" && pathname.startsWith("/api/documents/")) {
    const id = pathname.split("/")[3];
    const body = await readBody(req);
    const document = user.documents.find((item) => item.id === id);
    if (!document) return sendError(res, 404, "Document not found.");
    const fileName = path.basename(String(body.fileName || "").trim());
    if (!fileName) return sendError(res, 400, "Enter a file name.");
    if (fileName.length > 120) return sendError(res, 400, "File name must be 120 characters or less.");
    document.fileName = fileName;
    user.updatedAt = new Date().toISOString();
    writeDb(db);
    return sendJson(res, 200, { document, documents: user.documents });
  }

  if (req.method === "DELETE" && pathname.startsWith("/api/documents/")) {
    const id = pathname.split("/")[3];
    const document = user.documents.find((item) => item.id === id);
    user.documents = user.documents.filter((item) => item.id !== id);
    if (document) {
      const filePath = path.join(uploadDir, document.storedName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    user.updatedAt = new Date().toISOString();
    writeDb(db);
    return sendJson(res, 200, { documents: user.documents });
  }

  if (req.method === "POST" && pathname.startsWith("/api/records/")) {
    const collection = pathname.split("/")[3];
    if (!isAllowedCollection(collection)) return sendError(res, 404, "Unknown record type.");
    const body = await readBody(req);
    const record = { id: crypto.randomUUID(), ...body };
    user.records[collection].push(record);
    user.updatedAt = new Date().toISOString();
    writeDb(db);
    return sendJson(res, 201, { record, records: user.records });
  }

  if (req.method === "DELETE" && pathname.startsWith("/api/records/")) {
    const [, , , collection, id] = pathname.split("/");
    if (!isAllowedCollection(collection)) return sendError(res, 404, "Unknown record type.");
    user.records[collection] = user.records[collection].filter((record) => record.id !== id);
    user.updatedAt = new Date().toISOString();
    writeDb(db);
    return sendJson(res, 200, { records: user.records });
  }

  if (req.method === "GET" && pathname === "/api/export") {
    const fileName = `${user.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "truckerbooks"}-records.json`;
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`
    });
    return res.end(JSON.stringify(user.records, null, 2));
  }

  sendError(res, 404, "Not found.");
}

function serveStatic(req, res, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname === "/owner" ? "/owner.html" : pathname;
  const filePath = path.normalize(path.join(rootDir, requested));
  if (!filePath.startsWith(rootDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const extension = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": mimeTypes[extension] || "application/octet-stream" });
    res.end(content);
  });
}

function serveComplianceShare(res, tokenValue) {
  const db = readDb();
  const found = findComplianceShare(db, tokenValue);
  if (!found) {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h1>Carrier packet not found</h1>");
    return;
  }
  const documents = found.share.documentIds
    .map((id) => found.user.complianceDocuments.find((item) => item.id === id))
    .filter(Boolean);
  const links = documents.map((document) => `
    <li><a href="/api/shared-compliance/${found.share.token}/${document.id}">${escapeHtml(complianceTypeName(document.type))}: ${escapeHtml(document.fileName)}</a></li>
  `).join("");
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Carrier Packet - ${escapeHtml(found.user.businessName)}</title>
        <style>
          body{font-family:Arial,sans-serif;margin:0;background:#f5f7f8;color:#10222b}
          main{max-width:760px;margin:40px auto;background:#fff;border:1px solid #dbe4e7;border-radius:8px;padding:24px}
          h1{margin:0 0 8px;font-size:28px} p{color:#5f6f76} li{margin:12px 0} a{color:#0f6f72;font-weight:700}
        </style>
      </head>
      <body>
        <main>
          <h1>${escapeHtml(found.user.businessName)} Carrier Packet</h1>
          <p>Download the selected compliance documents below.</p>
          <ul>${links || "<li>No documents are currently available.</li>"}</ul>
        </main>
      </body>
    </html>`);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url.pathname);
      return;
    }
    if (url.pathname.startsWith("/shared-compliance/")) {
      serveComplianceShare(res, decodeURIComponent(url.pathname.split("/")[2] || ""));
      return;
    }
    serveStatic(req, res, decodeURIComponent(url.pathname));
  } catch (error) {
    sendError(res, 500, error.message || "Server error.");
  }
});

rescanAllStoredDocuments()
  .catch((error) => console.warn(`Document rescan skipped: ${error.message}`))
  .finally(() => {
    server.listen(port, () => {
      console.log(`TruckerBooks is running at http://localhost:${port}`);
    });
  });
