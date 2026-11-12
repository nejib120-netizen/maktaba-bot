/**
 * 📚 بوت مكتبة ميار - Messenger + Comments + Groq AI  (نسخة محسّنة)
 * - بدون أي أسعار في الردود
 * - جمع رقم الهاتف في الطلبية + تنبيه صاحب المحل
 * - تحويل لإنسان + إيقاف البوت كي ترد أنت من Inbox
 * - حماية الصفحات الإدارية
 */

const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));
// ملاحظة: ما عادش نكشفو كامل المجلد. حط الملفات العامة (إن وجدت) في مجلد public
app.use(express.static(path.join(__dirname, "public")));

// ===== الإعدادات (Render > Environment) =====
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "maktaba_secret_2024";
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const PAGE_ID = process.env.PAGE_ID || "507054946388416";
const PHONE_NUMBER = process.env.PHONE_NUMBER || "29464720";
const MAPS_LINK = process.env.MAPS_LINK || "https://maps.app.goo.gl/6hqYVVZWf7V9eF9L9";
const HOURS = process.env.HOURS || "8h - 22h (كل الأيام)";
const ADMIN_KEY = process.env.ADMIN_KEY;       // اختياري لكن مهم: يحمي /orders /dashboard ...
const OWNER_PSID = process.env.OWNER_PSID;     // اختياري: تنبيه Messenger عند كل طلبية
const APP_SECRET = process.env.APP_SECRET;     // اختياري: التحقق من توقيع Meta
const APP_ID = process.env.APP_ID;             // اختياري: يوقف البوت كي ترد أنت من Inbox
const PAUSE_HOURS = Number(process.env.PAUSE_HOURS || 12);
const GRAPH = "https://graph.facebook.com/v18.0";
const HUMAN_MARK = "[HUMAN]";

const stats = { totalConversations: 0, todayConversations: 0, totalOrders: 0, todayOrders: 0, lastReset: new Date().toDateString() };
function updateStats() {
  const today = new Date().toDateString();
  if (stats.lastReset !== today) { stats.todayConversations = 0; stats.todayOrders = 0; stats.lastReset = today; }
}

// ===== باكجات الصفوف (بدون أسعار) =====
const GRADE_PACKAGES = {
  "1": { nameAR: "السنة الأولى ابتدائي", items: [
    "3 كتب مدرسية", "3 غلاف كتب", "2 كراس 12", "4 كراس 24", "2 كراس 48",
    "1 كراس محفوظات", "1 كراس موسيقى", "1 كراس تصوير حجم صغير",
    "12 غلاف كراس", "12 اقلام جافة", "12 أقلام لبدية",
    "1 كراس ايقاظ حجم صغير", "1 اوراق تصوير + اوراق ملونة",
    "12 اقلام زينة 12/18", "12 اقلام شمعية",
    "1 قلم رصاص + ممحاة + مبراة", "1 مسطرة + كوس", "1 لصق + مقص",
    "6 الوان مائية", "1 لوحة + قلم + طلاسة", "1 معداد",
    "6 صلصال", "1 اقراص و اعواد + نقود مزيفة", "1 كنش" ] },
  "2": { nameAR: "السنة الثانية ابتدائي", items: [
    "3 كتب مدرسية", "3 غلاف كتب", "3 كراس 12", "4 كراس 24", "2 كراس 48",
    "1 كراس محفوظات", "1 كراس موسيقى", "1 كراس تصوير حجم صغير",
    "12 غلاف كراس", "12 اقلام جافة", "12 أقلام لبدية",
    "1 اوراق تصوير + اوراق ملونة", "12 اقلام زينة 12/18", "12 اقلام شمعية",
    "1 قلم رصاص + ممحاة + مبراة", "1 مسطرة + كوس", "1 لصق + مقص",
    "6 الوان مائية", "1 معداد", "6 صلصال", "1 كنش" ] },
  "3": { nameAR: "السنة الثالثة ابتدائي", items: [
    "4 كتب مدرسية", "4 غلاف كتب", "4 كراس 24", "3 كراس 48",
    "1 كراس محفوظات", "1 كراس موسيقى", "1 كراس رسم",
    "12 غلاف كراس", "12 اقلام جافة", "12 أقلام لبدية",
    "1 اوراق تصوير + اوراق ملونة", "12 اقلام زينة 12/18", "12 اقلام شمعية",
    "1 قلم رصاص + ممحاة + مبراة",
    "1 طقم هندسة (مسطرة + كوس + منقلة + مثلث)",
    "1 لصق + مقص", "6 الوان مائية", "1 كنش" ] },
  "4": { nameAR: "السنة الرابعة ابتدائي", items: [
    "5 كتب مدرسية", "5 غلاف كتب", "4 كراس 24", "4 كراس 48",
    "1 كراس محفوظات", "1 كراس موسيقى", "1 كراس رسم",
    "12 غلاف كراس", "12 اقلام جافة", "12 أقلام لبدية",
    "12 اقلام زينة 12/18", "1 قلم رصاص + ممحاة + مبراة",
    "1 طقم هندسة كامل", "1 لصق + مقص",
    "6 الوان مائية", "1 كلاسور + بوشات", "1 كنش" ] },
  "5": { nameAR: "السنة الخامسة ابتدائي", items: [
    "6 كتب مدرسية", "6 غلاف كتب", "5 كراس 24", "4 كراس 48",
    "1 كراس محفوظات", "1 كراس موسيقى", "1 كراس رسم",
    "12 غلاف كراس", "12 اقلام جافة", "12 أقلام لبدية",
    "12 اقلام زينة 12/18", "1 قلم رصاص + ممحاة + مبراة",
    "1 طقم هندسة كامل", "1 لصق + مقص",
    "6 الوان مائية", "1 كلاسور كبير + بوشات", "1 كنش" ] },
  "6": { nameAR: "السنة السادسة ابتدائي", note: "🏆 باكج خاص بمناظرة السنة السادسة!", items: [
    "7 كتب مدرسية", "7 غلاف كتب", "5 كراس 24", "5 كراس 48",
    "1 كراس محفوظات", "1 كراس موسيقى", "1 كراس رسم",
    "12 غلاف كراس", "12 اقلام جافة", "12 أقلام لبدية",
    "12 اقلام زينة 12/18", "1 قلم رصاص + ممحاة + مبراة",
    "1 طقم هندسة كامل", "1 لصق + مقص",
    "6 الوان مائية", "1 كلاسور كبير + بوشات", "1 كنش" ] },
};

function formatPackage(grade) {
  const pkg = GRADE_PACKAGES[grade];
  if (!pkg) return null;
  let text = `📦 ${pkg.nameAR}:\n\n`;
  pkg.items.forEach((item) => { text += `• ${item}\n`; });
  if (pkg.note) text += `\n${pkg.note}`;
  text += `\n📞 للسعر والتفاصيل: ${PHONE_NUMBER}`;
  return text;
}

const GRADE_BUTTONS = ["📦 سنة 1", "📦 سنة 2", "📦 سنة 3", "📦 سنة 4", "📦 سنة 5", "📦 سنة 6"];

// تأكد أن العروض هذي مازالت صحيحة قبل ما تخليها
const CURRENT_OFFERS = `🎉 عروض مكتبة ميار:
• كراريس الرسم -20%
• أقلام التلوين -15%
• اشري 5 كراريس والسادس هدية!`;

const BACK_TO_SCHOOL = `🎒 الدخول المدرسي قرب! 📚
باكجاتنا جاهزة لكل السنوات من 1 إلى 6
✅ كل شي في باكج واحد
🚚 توصيل داخل منزل كامل
💵 الدفع عند الاستلام`;

const SERVICES = `🛠️ خدماتنا / Nos Services:
✅ طباعة ونسخ
✅ بحوث مدرسية
✅ ترسيم تلاميذ وطلاب
✅ معالجة النصوص
✅ حجز الفحص الفني للكرهبة
✅ سيرة ذاتية احترافية

📞 ${PHONE_NUMBER}
🕐 ${HOURS}`;

const IMAGES = {
  welcome: "https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?w=800",
  packs: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800",
};

// ===== ردود التعليقات (بدون أسعار) =====
const COMMENT_REPLIES = {
  price: {
    keywords: ["بكاش", "ثمن", "prix", "combien", "بكم", "غالي", "رخيص"],
    reply: `الأسعار نعطيوها في المحل ولا بالهاتف 📞 ${PHONE_NUMBER} 😊\n👉 وتنجم تراسلنا على Messenger للباكجات والتفاصيل!`,
  },
  packs: {
    keywords: ["باكج", "pack", "أدوات", "قائمة", "ابتدائي"],
    reply: "عندنا باكجات جاهزة لكل السنوات من 1 إلى 6 📦✨\n👉 راسلنا على Messenger وابعثلنا السنة، نبعثوا القائمة فوراً!",
  },
  services: {
    keywords: ["نسخ", "طباعة", "بحث", "سيرة", "ترسيم", "فحص", "خدمات", "service"],
    reply: "نعم نوفّروا هذه الخدمة! ✅\n👉 راسلنا على Messenger للمزيد من التفاصيل 😊",
  },
  delivery: {
    keywords: ["توصيل", "livraison", "يوصل", "delivery"],
    reply: "نعم نوصّلو داخل منزل كامل! 🚚✨\n👉 راسلنا على Messenger لتسجيل طلبيتك",
  },
  positive: {
    keywords: ["برشة", "ممتاز", "بارك", "شكرا", "merci", "super", "مزيان", "زوين", "باهي"],
    reply: "شكراً جزيلاً على كلامك الطيب! 🙏❤️\nيسعدنا خدمتك دائماً في مكتبة ميار 📚",
  },
  info: {
    keywords: ["فين", "عنوان", "ساعة", "أوقات", "adresse", "horaire", "وقتاش"],
    reply: `📍 شارع البيئة، مقابل معهد منزل كامل\n🕐 ${HOURS}\n👉 راسلنا على Messenger لأي معلومة!`,
  },
  default: {
    reply: "مرحباً! 😊 شكراً على تعليقك ❤️\n👉 راسلنا على Messenger وسنجيب على كل أسئلتك فوراً! 📚✨",
  },
};

function detectCommentType(text) {
  if (!text) return "default";
  const lower = text.toLowerCase();
  for (const [type, data] of Object.entries(COMMENT_REPLIES)) {
    if (type === "default") continue;
    if (data.keywords.some((k) => lower.includes(k))) return type;
  }
  return "default";
}

async function replyToComment(commentId, message) {
  try {
    await axios.post(`${GRAPH}/${commentId}/comments`, { message }, { params: { access_token: PAGE_ACCESS_TOKEN } });
  } catch (e) { console.error("❌ خطأ في الرد على التعليق:", e.response?.data || e.message); }
}

async function likeComment(commentId) {
  try {
    await axios.post(`${GRAPH}/${commentId}/likes`, {}, { params: { access_token: PAGE_ACCESS_TOKEN } });
  } catch (e) { console.error("❌ خطأ في اللايك:", e.response?.data || e.message); }
}

async function handleComment(data) {
  if (data.from && data.from.id === PAGE_ID) return;                       // تعليق من الصفحة نفسها
  if (data.verb && data.verb !== "add") return;                            // تجاهل التعديل والحذف
  if (data.parent_id && data.post_id && data.parent_id !== data.post_id) return; // تجاهل الردود المتداخلة

  const commentId = data.comment_id;
  const text = data.message || "";
  const userName = (data.from?.name || "").split(" ")[0] || "صديقنا";

  await likeComment(commentId);
  await delay(1000);
  const type = detectCommentType(text);
  await replyToComment(commentId, `${userName}، ${COMMENT_REPLIES[type].reply}`);
}

// ===== الذكاء الاصطناعي =====
const SYSTEM_PROMPT = `Tu es l'assistant de la Librairie Mayar (مكتبة ميار), papeterie et services à Menzel Kamel, Tunisie. Tu réponds aux clients sur Messenger.

LANGUE ET STYLE
- Le client écrit en arabe ou en dialecte tunisien (même en lettres latines, ex: "3andkom kraris?") → réponds en dialecte tunisien, écriture arabe, ton chaleureux et simple (باهي، دبا، تحب، برشا، عسلامة).
- Le client écrit en français → réponds en français simple.
- Ne mélange pas les deux langues sans raison.
- 2 à 3 lignes maximum, 1 emoji maximum, pas de longues listes.
- Pose une seule question à la fois pour avancer (classe de l'enfant, produit voulu, commande).

RÈGLES STRICTES
- JAMAIS de prix, de tarif ni de montant (produits, packs, impression, copie, livraison…), même si le client insiste. Dis que les prix sont donnés à la librairie ou par téléphone au ${PHONE_NUMBER}.
- N'invente rien (stock, délais, promotions, services). Utilise seulement les informations ci-dessous. Si tu ne sais pas → dis d'appeler le ${PHONE_NUMBER}.
- Pour voir ou commander un pack scolaire, le client écrit "باكج" puis choisit la classe (1 à 6). Tu ne prends pas la commande toi-même.
- Si le client veut parler à un humain, se plaint, veut une commande spéciale ou en gros, négocie, ou insiste encore sur un prix → commence ta réponse par ${HUMAN_MARK} suivi d'une phrase courte disant qu'un membre de l'équipe va répondre bientôt.
- Question hors sujet → réponds en une phrase puis ramène vers la librairie.

INFORMATIONS
- Adresse: شارع البيئة، مقابل معهد منزل كامل (Rue de l'Environnement, en face du collège, Menzel Kamel) - ${MAPS_LINK}
- Horaires: ${HOURS}
- Téléphone: ${PHONE_NUMBER}
- Livraison: داخل منزل كامل فقط. Paiement à la livraison.
- Services: impression, photocopie, recherches scolaires, inscription d'élèves et d'étudiants, traitement de texte, réservation de la visite technique auto, CV professionnel.
- Packs scolaires disponibles pour les classes 1 à 6 du primaire.`;

const conversations = {};
const awaitingRating = {};
const newUsers = new Set();
const customerInfo = {};
const ORDER_STEPS = {};
const loyaltyPoints = {};
const POINTS_PER_ORDER = 10;
const reviews = [];
const paused = new Map(); // psid -> timestamp

function pause(psid) { paused.set(psid, Date.now() + PAUSE_HOURS * 3600 * 1000); }
function isPaused(psid) {
  const until = paused.get(psid);
  if (!until) return false;
  if (Date.now() > until) { paused.delete(psid); return false; }
  return true;
}

async function getGroqResponse(senderId, userText) {
  if (!conversations[senderId]) conversations[senderId] = [];
  conversations[senderId].push({ role: "user", text: userText });
  if (conversations[senderId].length > 20) conversations[senderId] = conversations[senderId].slice(-20);

  try {
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...conversations[senderId].map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.text })),
    ];
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
    { model: process.env.GROQ_MODEL || "llama-3.1-8b-instant", messages, temperature: 0.3, max_tokens: 300 },
      { headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" } }
    );
    const replyText = response.data.choices[0].message.content.trim();
    conversations[senderId].push({ role: "assistant", text: replyText });
    return replyText;
  } catch (err) {
    console.error("❌ Groq error:", err.response?.data || err.message);
    conversations[senderId].pop();
    return `سامحنا، صار مشكل تقني صغير 🙏 اتصل بينا على ${PHONE_NUMBER}`;
  }
}

// ===== أدوات التحليل =====
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
function normalize(text) {
  return String(text || "").replace(/[٠-٩]/g, (d) => AR_DIGITS.indexOf(d));
}

function parseGrade(text) {
  const t = normalize(text).toLowerCase();
  let m = t.match(/(?:سنة|السنة|année|annee|classe|pack|باكج|باك)\s*([1-6])(?!\d)/i);
  if (m) return m[1];
  m = t.match(/(?<!\d)([1-6])\s*(?:ème|eme|ère|ere|e\b|ابتدائي|primaire)/i);
  if (m) return m[1];
  const words = [
    [/اولى|أولى|premi[eè]re/, "1"], [/ثانية|deuxi[eè]me/, "2"], [/ثالثة|troisi[eè]me/, "3"],
    [/رابعة|quatri[eè]me/, "4"], [/خامسة|cinqui[eè]me/, "5"], [/سادسة|sixi[eè]me/, "6"],
  ];
  for (const [re, g] of words) if (re.test(t)) return g;
  return null;
}

function isArabicText(text) { return /[\u0600-\u06FF]/.test(text); }
function isGreeting(text) {
  return text.length < 25 && /^(salut|bonjour|bonsoir|hello|hi|salam|slm|سلام|مرحبا|اهلا|أهلا|صباح|مساء|عسلامة|السلام)/i.test(text.trim());
}
const CANCEL_RE = /^(إلغاء|الغاء|annuler|cancel|❌ إلغاء)$/i;
const PHONE_RE = /(?:\d[\s.\-]?){8,}/;

// ===== الإرسال =====
async function graphSend(body) {
  await axios.post(`${GRAPH}/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, body)
    .catch((e) => console.error("Send error:", e.response?.data || e.message));
}
const sendMessage = (id, text) => graphSend({ recipient: { id }, message: { text } });
const sendImage = (id, url) => graphSend({ recipient: { id }, message: { attachment: { type: "image", payload: { url, is_reusable: true } } } });
const sendMessageWithQuickReplies = (id, text, replies) => graphSend({
  recipient: { id },
  message: { text, quick_replies: replies.map((q) => ({ content_type: "text", title: q.substring(0, 20), payload: q.substring(0, 20) })) },
});
function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function notifyOwner(text) {
  if (!OWNER_PSID) return;
  await sendMessage(OWNER_PSID, text);
}

// ===== حماية الصفحات الإدارية =====
function admin(req, res, next) {
  if (!ADMIN_KEY) return next(); // بدون ADMIN_KEY تبقى مفتوحة (غير مستحسن)
  if (req.query.key === ADMIN_KEY || req.get("x-admin-key") === ADMIN_KEY) return next();
  res.sendStatus(403);
}

app.get("/", (_req, res) => res.json({ status: "✅ Bot is running" }));

app.get("/subscribe", admin, async (_req, res) => {
  try {
    const result = await axios.post(`${GRAPH}/${PAGE_ID}/subscribed_apps`, {
      subscribed_fields: "feed,messages,messaging_postbacks", access_token: PAGE_ACCESS_TOKEN,
    });
    res.json({ success: true, data: result.data });
  } catch (e) { res.json({ success: false, error: e.response?.data }); }
});

app.get("/test-comment", admin, (_req, res) => {
  const msg = "بكاش الباكج؟";
  const type = detectCommentType(msg);
  res.json({ test_message: msg, detected_type: type, reply: COMMENT_REPLIES[type].reply });
});

// ===== Webhook =====
app.get("/webhook", (req, res) => {
  if (req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"] === VERIFY_TOKEN) {
    return res.status(200).send(req.query["hub.challenge"]);
  }
  res.sendStatus(403);
});

function validSignature(req) {
  if (!APP_SECRET) return true; // التحقق اختياري
  const sig = req.get("x-hub-signature-256") || "";
  if (!req.rawBody) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", APP_SECRET).update(req.rawBody).digest("hex");
  const a = Buffer.from(sig), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

app.post("/webhook", async (req, res) => {
  if (!validSignature(req)) return res.sendStatus(403);
  const body = req.body;
  if (body.object !== "page") return res.sendStatus(404);
  res.status(200).send("EVENT_RECEIVED");

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field === "feed" && change.value?.item === "comment") {
        await handleComment(change.value).catch((e) => console.error(e));
      }
    }
    for (const event of entry.messaging || []) {
      try {
        if (event.message?.is_echo) {
          // رسالة خارجة من الصفحة: إذا مش من تطبيقنا يعني إنسان ردّ → البوت يسكت
          if (APP_ID && String(event.message.app_id) !== String(APP_ID)) pause(event.recipient.id);
          continue;
        }
        if (event.message) await handleMessage(event);
      } catch (e) { console.error("handleMessage error:", e); }
    }
  }
});

app.get("/stats", admin, (_req, res) => {
  updateStats();
  res.json({
    totalConversations: stats.totalConversations, todayConversations: stats.todayConversations,
    totalOrders: stats.totalOrders, todayOrders: stats.todayOrders,
    activeConversations: Object.keys(conversations).length,
  });
});

app.get("/orders", admin, (_req, res) => {
  const orders = Object.entries(customerInfo)
    .filter(([, info]) => info.orderConfirmed)
    .map(([id, info]) => ({
      id, name: info.orderName, phone: info.orderPhone, address: info.orderAddress,
      grade: info.lastGrade, time: info.orderTime,
    }));
  res.json(orders);
});

app.get("/reviews", admin, (_req, res) => res.json({ total: reviews.length, reviews }));

app.get("/dashboard", admin, (_req, res) => {
  try {
    let html = fs.readFileSync(path.join(__dirname, "dashboard.html"), "utf8");
    if (ADMIN_KEY) {
      const k = JSON.stringify(ADMIN_KEY);
      html = html.replace("</head>",
        `<script>(function(){var k=${k},f=window.fetch;window.fetch=function(u,o){if(typeof u==='string'&&u.charAt(0)==='/'){u+=(u.indexOf('?')>-1?'&':'?')+'key='+encodeURIComponent(k);}return f.call(this,u,o);};})();</script></head>`);
    }
    res.type("html").send(html);
  } catch (e) { res.sendStatus(404); }
});

// ===== معالجة الرسائل =====
async function handleMessage(event) {
  const senderId = event.sender.id;
  if (isPaused(senderId)) return;

  const text = event.message?.text || event.message?.quick_reply?.payload;

  // صور وملفات (مثلاً قائمة الأدوات): ما نحللوهاش، نبلّغو الفريق
  if (!text && event.message?.attachments) {
    if (!customerInfo[senderId]) customerInfo[senderId] = {};
    await sendMessage(senderId, "وصلتنا 📎 واحد من الفريق باش يشوفها ويرد عليك قريب إن شاء الله.");
    await delay(600);
    await sendMessageWithQuickReplies(senderId, "وإذا تحب تشوف الباكج حسب السنة، اختار 👇", GRADE_BUTTONS);
    await notifyOwner(`🔔 زبون بعث صورة/ملف على الصفحة. ID: ${senderId}`);
    return;
  }
  if (!text) return;

  updateStats();
  if (!customerInfo[senderId]) customerInfo[senderId] = {};
  if (!ORDER_STEPS[senderId]) ORDER_STEPS[senderId] = null;
  const lowerText = text.toLowerCase().trim();

  // إلغاء الطلبية في أي وقت
  const step = ORDER_STEPS[senderId];
  if (step && step !== "done" && CANCEL_RE.test(text.trim())) {
    ORDER_STEPS[senderId] = null;
    await sendMessage(senderId, "باهي، تلغات الطلبية. وقتما تحب نعاودو 😊");
    return;
  }

  // ===== ترحيب أول مرة =====
  if (!newUsers.has(senderId)) {
    newUsers.add(senderId);
    stats.totalConversations++; stats.todayConversations++;
    conversations[senderId] = [];
    try {
      const profile = await axios.get(`https://graph.facebook.com/${senderId}?fields=first_name&access_token=${PAGE_ACCESS_TOKEN}`);
      customerInfo[senderId].name = profile.data.first_name;
    } catch (e) { customerInfo[senderId].name = ""; }

    const name = customerInfo[senderId].name || "";
    const hello = isArabicText(text) || !/[a-z]{3}/i.test(text)
      ? `مرحبا ${name} في مكتبة ميار! 📚✨`
      : `Bienvenue ${name} à la Librairie Mayar ! 📚✨`;
    await sendImage(senderId, IMAGES.welcome);
    await delay(500);
    await sendMessage(senderId, `${hello}\n\n${BACK_TO_SCHOOL}`);
    await delay(700);
    await sendMessageWithQuickReplies(senderId, CURRENT_OFFERS, ["📦 Pack par classe", "🛠️ Services", "📍 Adresse", "📞 Appeler"]);
    if (isGreeting(text)) return; // إذا السؤال محدد نواصلو نجاوبو عليه
    await delay(500);
  }

  // ===== سيرورة الطلبية =====
  if (ORDER_STEPS[senderId] === "ask_name") {
    customerInfo[senderId].orderName = text.trim().substring(0, 60);
    ORDER_STEPS[senderId] = "ask_phone";
    await sendMessage(senderId, `شكراً ${customerInfo[senderId].orderName}! 😊\nاكتب رقم هاتفك باش نتصلو بيك 📞`);
    return;
  }

  if (ORDER_STEPS[senderId] === "ask_phone") {
    if (!PHONE_RE.test(normalize(text))) {
      await sendMessage(senderId, "الرقم ما يبانش صحيح 🤔 اكتب رقم الهاتف (8 أرقام)، ولا اكتب «إلغاء».");
      return;
    }
    customerInfo[senderId].orderPhone = normalize(text).replace(/[^\d+]/g, "");
    ORDER_STEPS[senderId] = "ask_address";
    await sendMessage(senderId, "وعنوانك الكامل باش نوصلو ليك 📍");
    return;
  }

  if (ORDER_STEPS[senderId] === "ask_address") {
    customerInfo[senderId].orderAddress = text.trim().substring(0, 200);
    ORDER_STEPS[senderId] = "confirm";
    const pkg = GRADE_PACKAGES[customerInfo[senderId].lastGrade];
    await sendMessage(senderId,
      `✅ ملخص الطلبية:\n👤 ${customerInfo[senderId].orderName}\n📞 ${customerInfo[senderId].orderPhone}\n📍 ${customerInfo[senderId].orderAddress}\n📦 ${pkg?.nameAR}\n💵 الدفع عند الاستلام\n\nنتصلو بيك باش نأكدو الطلبية.`
    );
    await delay(600);
    await sendMessageWithQuickReplies(senderId, "واش تؤكد الطلبية؟ 😊", ["✅ نعم، أؤكد!", "❌ إلغاء"]);
    return;
  }

  if (ORDER_STEPS[senderId] === "confirm") {
    if (text === "✅ نعم، أؤكد!") {
      const info = customerInfo[senderId];
      info.orderConfirmed = true;
      info.orderTime = new Date().toLocaleString("fr-TN");
      ORDER_STEPS[senderId] = "done";
      stats.totalOrders++; stats.todayOrders++;
      loyaltyPoints[senderId] = (loyaltyPoints[senderId] || 0) + POINTS_PER_ORDER;
      const pkg = GRADE_PACKAGES[info.lastGrade];
      console.log("🛒 ORDER", JSON.stringify({ id: senderId, name: info.orderName, phone: info.orderPhone, address: info.orderAddress, pack: pkg?.nameAR, time: info.orderTime }));
      await notifyOwner(`🛒 طلبية جديدة!\n👤 ${info.orderName}\n📞 ${info.orderPhone}\n📍 ${info.orderAddress}\n📦 ${pkg?.nameAR}`);
      await sendMessage(senderId, `🎉 طلبيتك مسجّلة!\nنتصلو بيك قريباً للتأكيد.\n🎁 ربحت ${POINTS_PER_ORDER} نقاط (المجموع: ${loyaltyPoints[senderId]})\nشكراً على ثقتك في مكتبة ميار 📚🙏`);
      await delay(1000);
      awaitingRating[senderId] = true;
      await sendMessageWithQuickReplies(senderId, "كيفاش تقيّم تجربتك؟ 😊", ["⭐⭐⭐⭐⭐", "⭐⭐⭐⭐", "⭐⭐⭐"]);
    } else {
      ORDER_STEPS[senderId] = null;
      await sendMessage(senderId, "باهي، تلغات الطلبية. وقتما تحب نعاونك 😊");
    }
    return;
  }

  if (awaitingRating[senderId]) {
    awaitingRating[senderId] = false;
    if (["⭐⭐⭐⭐⭐", "⭐⭐⭐⭐", "⭐⭐⭐"].includes(text)) {
      reviews.push({ name: customerInfo[senderId]?.orderName || "زبون", rating: text, time: new Date().toLocaleString("fr-TN") });
      await sendMessage(senderId, `شكراً على تقييمك ${text} 🙏 نستناوك في مكتبة ميار! 📚`);
      return;
    }
  }

  // ===== باكجات: نتعرف على السنة أولاً =====
  const grade = parseGrade(text);
  if (grade && GRADE_PACKAGES[grade]) {
    customerInfo[senderId].lastGrade = grade;
    await sendMessage(senderId, formatPackage(grade));
    await delay(600);
    await sendMessageWithQuickReplies(senderId, "تحب تطلب هذا الباكج مع توصيل؟ 🚚", ["✅ نعم، نطلبه!", "📦 باكج آخر", "📞 Appeler"]);
    return;
  }

  if (lowerText.includes("pack") || lowerText.includes("باكج") || text === "📦 Pack par classe" || text === "📦 باكج آخر") {
    await sendImage(senderId, IMAGES.packs);
    await delay(400);
    await sendMessageWithQuickReplies(senderId, "📦 اختار السنة:", GRADE_BUTTONS);
    return;
  }

  if (text === "✅ نعم، نطلبه!" || ((lowerText === "نعم" || lowerText === "oui") && customerInfo[senderId].lastGrade)) {
    if (!customerInfo[senderId].lastGrade) {
      await sendMessageWithQuickReplies(senderId, "أي سنة تحب تطلب؟", GRADE_BUTTONS);
      return;
    }
    ORDER_STEPS[senderId] = "ask_name";
    await sendMessage(senderId, "ممتاز! 🎉\nاكتب اسمك الكامل:");
    return;
  }

  if (lowerText.includes("service") || lowerText.includes("خدم") || text === "🛠️ Services") {
    await sendMessage(senderId, SERVICES);
    return;
  }

  if (lowerText.includes("adresse") || lowerText.includes("فين") || lowerText.includes("عنوان") || text === "📍 Adresse") {
    await sendMessage(senderId, `📍 شارع البيئة، مقابل معهد منزل كامل\n🗺️ ${MAPS_LINK}\n🕐 ${HOURS}`);
    return;
  }

  if (lowerText.includes("appel") || text === "📞 Appeler") {
    await sendMessage(senderId, `📞 ${PHONE_NUMBER}\n🕐 ${HOURS}`);
    return;
  }

  // ===== الذكاء الاصطناعي + التحويل لإنسان =====
  const reply = await getGroqResponse(senderId, text);
  if (reply.includes(HUMAN_MARK)) {
    const clean = reply.replace(HUMAN_MARK, "").trim() || "باش يرد عليك واحد من الفريق قريب إن شاء الله 🙏";
    pause(senderId);
    await sendMessage(senderId, clean);
    await notifyOwner(`🔔 زبون يحتاج ردك. افتح Inbox متاع الصفحة. ID: ${senderId}\nآخر رسالة: ${text.substring(0, 200)}`);
  } else {
    await sendMessage(senderId, reply);
  }
}

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 البوت يعمل على المنفذ ${PORT}`);
    console.log(`🔑 Token: ${PAGE_ACCESS_TOKEN ? "✅" : "❌"} | Groq: ${GROQ_API_KEY ? "✅" : "❌"} | Admin key: ${ADMIN_KEY ? "✅" : "⚠️ غير مفعّل"}`);
  });
} else {
  module.exports = { app, parseGrade, detectCommentType, formatPackage, SYSTEM_PROMPT, COMMENT_REPLIES, SERVICES, CURRENT_OFFERS, BACK_TO_SCHOOL };
}
