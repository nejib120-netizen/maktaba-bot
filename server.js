/**
 * 📚 ميار بوت مكتبة - Facebook Messenger + Groq AI
 * تشغيل: node server.js
 */

const express = require("express");
const axios = require("axios");
const app = express();

app.use(express.json());

// ===== إعدادات المتغيرات =====
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "maktaba_secret_2024";
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
// نستخدم GROQ_API_KEY بدلاً من Gemini
const GROQ_API_KEY = process.env.GROQ_API_KEY; 

// ===== شخصية البوت =====
const SYSTEM_PROMPT = "أنت مساعد ذكي لمكتبة تونسية تدعى 'مكتبة ميار'. مهمتك مساعدة الزبائن باللغة التونسية .";

// تخزين المحادثات مؤقتاً (في الذاكرة)
const conversations = {};

// ===== دالة الاتصال بـ Groq =====
async function getGroqResponse(senderId, userText) {
  if (!conversations[senderId]) {
    conversations[senderId] = [];
  }

  // إضافة رسالة المستخدم للسجل
  conversations[senderId].push({ role: "user", text: userText });

  // الاحتفاظ بآخر 10 رسائل فقط لتوفير الذاكرة
  if (conversations[senderId].length > 10) {
    conversations[senderId] = conversations[senderId].slice(-10);
  }

  try {
    const formattedMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...conversations[senderId].map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text
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
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const replyText = response.data.choices[0].message.content;

    // حفظ رد البوت في السجل
    conversations[senderId].push({ role: "assistant", text: replyText });

    return replyText;

  } catch (err) {
    console.error("❌ خطأ في Groq:", err.response?.data || err.message);
    
    if (err.response?.status === 401) return "عذراً، مفتاح API غير صالح.";
    if (err.response?.status === 429) return "الخدمة مزدحمة، حاول بعد قليل.";
    
    return "آسف، حدث خطأ تقني أثناء معالجة طلبك.";
  }
}

// ===== دالة إرسال الرسالة لفيسبوك =====
async function sendMessage(recipientId, text) {
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        recipient: { id: recipientId },
        message: { text: text }
      }
    );
  } catch (error) {
    console.error("❌ فشل في إرسال الرسالة:", error.response?.data || error.message);
  }
}

// ===== مسار التحقق من الويب هوك (GET) =====
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log("✅ تم التحقق من الويب هوك بنجاح");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ===== مسار استقبال الرسائل (POST) =====
app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object === 'page') {
    for (const entry of body.entry) {
      const messagingEvents = entry.messaging;

      for (const event of messagingEvents) {
        if (event.message && event.message.text) {
          const senderId = event.sender.id;
          const userText = event.message.text;

          console.log(`📨 رسالة من ${senderId}: ${userText}`);

          // الحصول على الرد من Groq
          const reply = await getGroqResponse(senderId, userText);
          
          // إرسال الرد
          await sendMessage(senderId, reply);
        }
      }
    }
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

// ===== تشغيل السيرفر =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 البوت يعمل على المنفذ ${PORT}`);
});
