/**
 * 🕌 بوت مكتبة - Facebook Messenger + Claude AI
 * ================================================
 * كيفاش تشغّل: node server.js
 */

const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

// ===== إعدادات =====
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "maktaba_secret_2024";
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN; // من Meta for Developers
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY; // من Anthropic Console

// ===== شخصية البوت =====
const SYSTEM_PROMPT = `أنت مساعد ذكي لمكتبة تونسية تُدعى "المكتبة". 
مهمتك مساعدة الزبائن باللهجة التونسية عبر Facebook Messenger.

معلومات المكتبة:
- تبيع كتب (روايات، كتب مدرسية، أطفال، دينية، علمية)
- أدوات مكتبية (أقلام، كراسات، حقائب، مسطرة...)
- ساعات العمل: من 8 صباحاً إلى 7 مساءً، كل أيام الأسبوع
- التوصيل متوفر داخل تونس العاصمة
- رقم التليفون: +216 XX XXX XXX

تعليمات:
- ردود قصيرة وواضحة (Messenger مش بريد إلكتروني)
- دايماً بالدارجة التونسية
- إذا سألوك على سعر كتاب معين، قلهم يتصلوا بالمكتبة
- كن ودوداً ومرحباً`;

// تخزين محادثات الزبائن في الذاكرة (للإنتاج استعمل Redis/MongoDB)
const conversations = {};

// ===== Webhook Verification =====
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified!");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ===== استقبال الرسائل =====
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.object !== "page") return res.sendStatus(404);

  res.sendStatus(200); // رد سريع لفيسبوك

  for (const entry of body.entry || []) {
    for (const event of entry.messaging || []) {
      if (event.message && !event.message.is_echo) {
        await handleMessage(event);
      }
    }
  }
});

// ===== معالجة الرسالة =====
async function handleMessage(event) {
  const senderId = event.sender.id;
  const text = event.message?.text;

  if (!text) return;

  console.log(`📩 رسالة من ${senderId}: ${text}`);

  // إظهار "يكتب..." لفيسبوك
  await sendTypingOn(senderId);

  // تاريخ المحادثة
  if (!conversations[senderId]) conversations[senderId] = [];
  conversations[senderId].push({ role: "user", content: text });

  // احتفظ بآخر 10 رسائل فقط
  if (conversations[senderId].length > 10) {
    conversations[senderId] = conversations[senderId].slice(-10);
  }

  try {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: conversations[senderId],
      },
      {
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
      }
    );

    const reply = response.data.content[0].text;
    conversations[senderId].push({ role: "assistant", content: reply });

    await sendMessage(senderId, reply);
    console.log(`✉️ رد للزبون: ${reply}`);
  } catch (err) {
    console.error("خطأ:", err.response?.data || err.message);
    await sendMessage(senderId, "آسف، صرالي مشكل تقني. عاود حاول بعد شوية 🙏");
  }
}

// ===== إرسال رسالة لفيسبوك =====
async function sendMessage(recipientId, text) {
  await axios.post(
    `https://graph.facebook.com/v19.0/me/messages`,
    {
      recipient: { id: recipientId },
      message: { text },
    },
    {
      params: { access_token: PAGE_ACCESS_TOKEN },
    }
  );
}

async function sendTypingOn(recipientId) {
  await axios.post(
    `https://graph.facebook.com/v19.0/me/messages`,
    {
      recipient: { id: recipientId },
      sender_action: "typing_on",
    },
    { params: { access_token: PAGE_ACCESS_TOKEN } }
  ).catch(() => {});
}

// ===== تشغيل السيرفر =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 البوت يشتغل على port ${PORT}`);
});
