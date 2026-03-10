/**
 * 💬 بوت تعليقات مكتبة ميار
 * ميزات: رد تلقائي + لايك + تحويل للـ Messenger
 */

const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "maktaba_secret_2024";
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const PAGE_ID = process.env.PAGE_ID; // ID صفحة فيسبوك

// ===== ردود التعليقات =====
const COMMENT_REPLIES = {
  // أسئلة الأسعار
  price: {
    keywords: ["بكاش", "ثمن", "prix", "combien", "بكم", "غالي", "رخيص"],
    reply: "مرحباً! 😊 الأسعار ممتازة وفي متناول الجميع 💚\n👉 راسلنا على Messenger نعطيك كل التفاصيل والباكجات بالأسعار الكاملة!"
  },
  // أسئلة الباكجات
  packs: {
    keywords: ["باكج", "pack", "أدوات", "قائمة", "سنة", "ابتدائي"],
    reply: "عندنا باكجات جاهزة لكل السنوات من 1 إلى 6 📦✨\n👉 راسلنا على Messenger وابعثلنا السنة — نبعثوا القائمة الكاملة فوراً!"
  },
  // الخدمات
  services: {
    keywords: ["نسخ", "بحث", "سيرة", "ترسيم", "فحص", "خدمات", "service"],
    reply: "نعم توفر هذه الخدمة! ✅\n👉 راسلنا على Messenger للمزيد من التفاصيل 😊"
  },
  // التوصيل
  delivery: {
    keywords: ["توصيل", "livraison", "يوصل", "delivery", "تبعث"],
    reply: "نعم نوصّلو داخل منزل كامل بـ 2 DT فقط! 🚚✨\n👉 راسلنا على Messenger لتسجيل طلبيتك"
  },
  // المدح والإطراء
  positive: {
    keywords: ["برشة", "ممتاز", "بارك", "شكرا", "merci", "super", "مزيان", "زوين", "باهي"],
    reply: "شكراً جزيلاً على كلامك الطيب! 🙏❤️\nيسعدنا خدمتك دائماً في مكتبة ميار 📚"
  },
  // طلب معلومات
  info: {
    keywords: ["فين", "عنوان", "وقت", "ساعة", "أوقات", "adresse", "horaire", "متى", "وقتاش"],
    reply: "📍 شارع البيئة، مقابل معهد منزل كامل\n🕐 8h - 19h كل الأيام\n👉 راسلنا على Messenger لأي معلومة إضافية!"
  },
  // الافتراضي
  default: {
    reply: "مرحباً! 😊 شكراً على تعليقك ❤️\n👉 راسلنا على Messenger وسنجيب على كل أسئلتك فوراً! 📚✨"
  }
};

// ===== كشف نوع التعليق =====
function detectCommentType(text) {
  if (!text) return 'default';
  const lower = text.toLowerCase();
  for (const [type, data] of Object.entries(COMMENT_REPLIES)) {
    if (type === 'default') continue;
    if (data.keywords && data.keywords.some(k => lower.includes(k))) {
      return type;
    }
  }
  return 'default';
}

// ===== رد على تعليق =====
async function replyToComment(commentId, message) {
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/${commentId}/comments`,
      { message },
      { params: { access_token: PAGE_ACCESS_TOKEN } }
    );
    console.log(`✅ رد على تعليق: ${commentId}`);
  } catch (e) {
    console.error("❌ خطأ في الرد:", e.response?.data?.error?.message);
  }
}

// ===== لايك على تعليق =====
async function likeComment(commentId) {
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/${commentId}/likes`,
      {},
      { params: { access_token: PAGE_ACCESS_TOKEN } }
    );
    console.log(`👍 لايك على: ${commentId}`);
  } catch (e) {
    console.error("❌ خطأ في اللايك:", e.response?.data?.error?.message);
  }
}

// ===== Webhook Verification =====
app.get('/comments-webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log("✅ Webhook تعليقات مُفعَّل");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ===== استقبال التعليقات =====
app.post('/comments-webhook', async (req, res) => {
  const body = req.body;
  res.status(200).send('EVENT_RECEIVED');

  if (body.object !== 'page') return;

  for (const entry of body.entry) {
    // تعليقات على المنشورات
    if (entry.changes) {
      for (const change of entry.changes) {
        if (change.field === 'feed' && change.value?.item === 'comment') {
          await handleComment(change.value);
        }
      }
    }
  }
});

// ===== معالجة التعليق =====
async function handleComment(data) {
  // تجاهل تعليقات الصفحة نفسها
  if (data.from?.id === PAGE_ID) return;
  // تجاهل ردود التعليقات (تعليق على تعليق)
  if (data.parent_id && data.parent_id !== data.post_id) return;

  const commentId = data.comment_id;
  const text = data.message || "";
  const userName = data.from?.name || "زبون";

  console.log(`💬 تعليق جديد من ${userName}: ${text}`);

  // 1. لايك تلقائي
  await likeComment(commentId);
  await delay(500);

  // 2. كشف نوع التعليق + رد مناسب
  const type = detectCommentType(text);
  const replyData = COMMENT_REPLIES[type];
  const replyText = `${userName.split(' ')[0]}، ${replyData.reply}`;

  await replyToComment(commentId, replyText);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== تشغيل =====
const PORT = process.env.COMMENTS_PORT || 3001;
app.listen(PORT, () => {
  console.log(`💬 بوت التعليقات يعمل على المنفذ ${PORT}`);
  console.log(`🔗 Webhook: /comments-webhook`);
});
