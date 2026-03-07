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
const GROQ_API_KEY = process.env.GROQ_API_KEY;
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

 const GROQ_API_KEY = process.env.GROQ_API_KEY;

async function askGroq(userText, senderId, conversations) {
  // ذاكرة بسيطة (اختياري)
  conversations[senderId] = conversations[senderId] || [];

  // أضف رسالة المستخدم للذاكرة
  conversations[senderId].push({ role: "user", content: userText });

  // قصّ الذاكرة لآخر 10 رسائل مثلاً
  conversations[senderId] = conversations[senderId].slice(-10);

  const payload = {
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...conversations[senderId]
    ],
    temperature: 0.7
  };

  try {
    const r = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      payload,
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const reply = r.data?.choices?.[0]?.message?.content?.trim() || "ما نجمتش نجاوب توّا.";

    // أضف ردّ المساعد للذاكرة
    conversations[senderId].push({ role: "assistant", content: reply });
    conversations[senderId] = conversations[senderId].slice(-10);

    return reply;
  } catch (err) {
    console.error("Groq error:", err.response?.data || err.message);
    if (err.response?.status === 429) return "الخدمة مزحومة توّا، جرّب بعد شوية.";
    if (err.response?.status === 401) return "المفتاح متاع Groq غلط/منتهي.";
    return "آسف، صار مشكل تقني.";
  }
}

    const reply = response.data.candidates[0].content.parts[0].text;
    conversations[senderId].push({ role: "model", parts: [{ text: reply }] });

    await sendMessage(senderId, reply);
    console.log(`✉️ رد للزبون: ${reply}`);
 async function getGroqResponse(messagesHistory) {
  try {
    const formattedMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messagesHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text || msg.content
      }))
    ];

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 1024
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices[0].message.content;

  } catch (err) {
    console.error("❌ خطأ Groq:", err.response?.data || err.message);
    
    if (err.response?.status === 401) return "مفتاح API غير صالح.";
    if (err.response?.status === 429) return "الخدمة مزدحمة، حاول لاحقاً.";
    
    return "عذراً، حدث خطأ تقني.";
  } // <--- تأكد وجود هذا القوس هنا
} // <--- وهذا القوس يغلق الدالة
