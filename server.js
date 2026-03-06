/**
 * 🕌 بوت مكتبة - Facebook Messenger + Google Gemini
 * ===================================================
 * كيفاش تشغّل: node server.js
 */

const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

// ===== إعدادات =====
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "maktaba_secret_2024";
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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

// تخزين محادثات الزبائن
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

  res.sendStatus(200);

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
  await sendTypingOn(senderId);

  // تاريخ المحادثة
  if (!conversations[senderId]) conversations[senderId] = [];
  conversations[senderId].push({ role: "user", parts: [{ text }] });

  if (conversations[senderId].length > 10) {
    conversations[senderId] = conversations[senderId].slice(-10);
  }

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: conversations[senderId],
      }
    );

    const reply = response.data.candidates[0].content.parts[0].text;
    conversations[senderId].push({ role: "model", parts: [{ text: reply }] });

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
    { recipient: { id: recipientId }, message: { text } },
    { params: { access_token: PAGE_ACCESS_TOKEN } }
  );
}

async function sendTypingOn(recipientId) {
  await axios.post(
    `https://graph.facebook.com/v19.0/me/messages`,
    { recipient: { id: recipientId }, sender_action: "typing_on" },
    { params: { access_token: PAGE_ACCESS_TOKEN } }
  ).catch(() => {});
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 البوت يشتغل على port ${PORT}`);
});
