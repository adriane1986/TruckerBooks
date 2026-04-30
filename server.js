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
const bundledNodeModules = path.join(
  process.env.USERPROFILE || "",
  ".cache",
  "codex-runtimes",
  "codex-primary-runtime",
  "dependencies",
  "node",
  "node_modules"
);

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
  form2290: { id: "form2290", name: "2290" }
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

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendError(res, status, message) {
  sendJson(res, status, { error: message });
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
    /(?:expiration date|expiration|expires on|expires|expiry date|valid until|medical card expires|policy expires|coverage end date|coverage ends|policy end date|end date|valid through|thru|through)\s*:?\s*([A-Za-z]{3,9}\.?\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{1,2}-\d{1,2})/i,
    /(?:exp\.?|expires)\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{1,2}-\d{1,2})/i,
    /(?:from|effective)\s+[A-Za-z0-9/.,\s-]{0,40}\s(?:to|through|thru|-)\s*([A-Za-z]{3,9}\.?\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{1,2}-\d{1,2})/i,
    /(?:period|term)\s*:?\s*[A-Za-z0-9/.,\s-]{0,40}\s(?:to|through|thru|-)\s*([A-Za-z]{3,9}\.?\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{1,2}-\d{1,2})/i
  ]);
  const candidates = extractDateCandidates(clean);
  const expirationDate = normalizeDate(expiration) || candidates.at(-1) || "";
  return {
    expirationDate,
    dateDetection: normalizeDate(expiration) ? "labeled_expiration" : expirationDate ? "latest_document_date" : "not_found",
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

async function scanDocument(buffer, mimeType, type) {
  const scan = await runAiScanner(buffer, mimeType);
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

async function scanComplianceDocument(buffer, mimeType) {
  const scan = await runAiScanner(buffer, mimeType);
  const local = parseComplianceText(scan.text);
  const generic = scan.extracted || {};
  return {
    ...scan,
    extracted: {
      ...local,
      expirationDate: local.expirationDate || generic.expirationDate || "",
      generic
    }
  };
}

async function runAiScanner(buffer, mimeType) {
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
  const aiExtracted = await runOpenAiDocumentScanner(buffer, mimeType, text).catch((error) => {
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

async function runOpenAiDocumentScanner(buffer, mimeType, extractedText) {
  if (!process.env.OPENAI_API_KEY) return null;
  const fileData = buffer.toString("base64");
  const prompt = [
    "You are the AI document scanner for TruckerBooks.",
    "Extract structured trucking document data from the uploaded file.",
    "Return JSON only, with these keys:",
    "documentType, dates, expirationDate, amount, loadNumber, origin, destination, miles, confidence, notes.",
    "Use null for unknown scalar values and [] for no dates.",
    "Dates must be ISO YYYY-MM-DD. Amount must be a number.",
    "For compliance documents, expirationDate should be the renewal/expiration date.",
    "For Insurance, DOT Physical, UCR, or 2290 documents, prioritize labels like Expiration Date, Expires, Valid Until, Policy Period end date, Coverage End Date, Medical Card Expires, UCR year end, and Form 2290 tax period ending date.",
    "If no explicit expiration label exists but there is a date range, use the later/end date as expirationDate.",
    "If multiple dates appear, choose the most likely future renewal/expiration/end date, not the issue date.",
    "For Rate Cons/BOLs, amount should be carrier pay, total carrier pay, linehaul plus fuel, or agreed rate.",
    "Do not guess wildly; use confidence from 0 to 1.",
    extractedText ? `OCR/text layer already extracted:\n${extractedText.slice(0, 6000)}` : "No text layer was available; inspect the file visually if possible."
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: openaiModel,
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
              expirationDate: { type: ["string", "null"] },
              amount: { type: ["number", "null"] },
              loadNumber: { type: ["string", "null"] },
              origin: { type: ["string", "null"] },
              destination: { type: ["string", "null"] },
              miles: { type: ["number", "null"] },
              confidence: { type: "number" },
              notes: { type: ["string", "null"] }
            },
            required: ["documentType", "dates", "expirationDate", "amount", "loadNumber", "origin", "destination", "miles", "confidence", "notes"]
          }
        }
      },
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_file",
              filename: "uploaded-document",
              file_data: fileData
            },
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

async function extractPdfText(buffer) {
  const pdfPath = path.join(bundledNodeModules, "pdfjs-dist", "legacy", "build", "pdf.mjs");
  const pdfjs = await import(`file:///${pdfPath.replace(/\\/g, "/").replace(/ /g, "%20")}`);
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
  user.documents = Array.isArray(user.documents) ? user.documents : [];
  user.complianceDocuments = Array.isArray(user.complianceDocuments) ? user.complianceDocuments : [];
  user.affiliateCode = user.affiliateCode || crypto.randomBytes(5).toString("hex");
  user.referredBy = user.referredBy || "";
  user.firstMonthPaid = Boolean(user.firstMonthPaid);
  user.commissions = Array.isArray(user.commissions) ? user.commissions : [];
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
    { label: "January IFTA Taxes", date: lastDayOfMonth(year, 0) },
    { label: "April IFTA Taxes", date: lastDayOfMonth(year, 3) },
    { label: "July IFTA Taxes", date: lastDayOfMonth(year, 6) },
    { label: "October IFTA Taxes", date: lastDayOfMonth(year, 9) },
    { label: "January IFTA Taxes", date: lastDayOfMonth(year + 1, 0) }
  ];
  return deadlines.filter((item) => daysUntil(item.date) >= 0).slice(0, 4);
}

function complianceAlerts(user) {
  const documentAlerts = (user.complianceDocuments || [])
    .filter((item) => item.expirationDate)
    .map((item) => ({
      id: item.id,
      label: `${complianceTypeName(item.type)} renewal`,
      date: item.expirationDate,
      daysUntil: daysUntil(item.expirationDate),
      source: "document"
    }))
    .filter((item) => item.daysUntil !== null && item.daysUntil <= 45)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const iftaAlerts = upcomingIftaDeadlines().map((item) => ({
    id: `ifta-${item.date}`,
    label: item.label,
    date: item.date,
    daysUntil: daysUntil(item.date),
    source: "ifta"
  }));

  return [...documentAlerts, ...iftaAlerts].sort((a, b) => a.daysUntil - b.daysUntil);
}

function currentPlan(user) {
  return subscriptionPlans[user.subscriptionTier] || subscriptionPlans.silver;
}

function requireAdmin(user, res) {
  if ((user.role || "admin") !== "admin") {
    sendError(res, 403, "Only account admins can manage trucks and driver access.");
    return false;
  }
  return true;
}

async function handleApi(req, res, pathname) {
  const db = readDb();
  const { token, user } = getCurrentUser(req, db);

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

  if (!user) return sendError(res, 401, "Please sign in first.");

  if (req.method === "GET" && pathname === "/api/scanner-status") {
    return sendJson(res, 200, {
      aiConfigured: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith("sk-")),
      model: openaiModel,
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
    if (user.drivers.length >= plan.maxTrucks) return sendError(res, 400, `${plan.name} allows driver access for up to ${plan.maxTrucks} drivers.`);
    const body = await readBody(req);
    const email = normalizeEmail(body.email);
    if (!email) return sendError(res, 400, "Enter the driver's email.");
    if (user.drivers.some((driver) => driver.email === email)) return sendError(res, 409, "That driver already has access or an invite.");
    const inviteToken = crypto.randomBytes(24).toString("hex");
    const driver = {
      id: crypto.randomUUID(),
      name: String(body.name || "").trim() || "Driver",
      email,
      truckId: String(body.truckId || ""),
      status: "Access sent",
      inviteToken,
      inviteLink: `/driver-access/${inviteToken}`,
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

  if (req.method === "POST" && pathname === "/api/compliance") {
    const body = await readBody(req);
    const type = complianceTypes[body.type] ? body.type : "insurance";
    const fileName = path.basename(String(body.fileName || "compliance-document"));
    const mimeType = String(body.mimeType || "application/octet-stream");
    const base64 = String(body.data || "").replace(/^data:[^;]+;base64,/, "");
    if (!base64) return sendError(res, 400, "Choose a compliance document to upload.");
    const buffer = Buffer.from(base64, "base64");
    if (buffer.length > 10_000_000) return sendError(res, 400, "Uploads are limited to 10 MB each.");
    const id = crypto.randomUUID();
    const storedName = `${user.id}-${id}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    fs.writeFileSync(path.join(uploadDir, storedName), buffer);
    const scan = await scanComplianceDocument(buffer, mimeType);
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
  const requested = pathname === "/" ? "/index.html" : pathname;
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

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url.pathname);
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
