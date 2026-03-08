/**
 * 📚 بوت مكتبة ميار - Facebook Messenger + Groq AI
 * ميزات: ترحيب، عروض، تقييم، إحصاء، تحويل لتليفون
 */

const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());
app.use(express.static('.'));

// ===== إعدادات =====
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "maktaba_secret_2024";
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const PHONE_NUMBER = process.env.PHONE_NUMBER || "29464720";

// ===== إحصاءات =====
const stats = {
  totalConversations: 0,
  todayConversations: 0,
  lastReset: new Date().toDateString(),
};

function updateStats() {
  const today = new Date().toDateString();
  if (stats.lastReset !== today) {
    stats.todayConversations = 0;
    stats.lastReset = today;
  }
}

// ===== العروض =====
const CURRENT_OFFERS = `🎉 عروض مكتبة ميار هذا الأسبوع:
• كراسات الرسم بـ -20%
• أقلام الألوان الكبيرة بـ -15%
• عند شراء 5 كراسات، الـ 6 مجانية!`;

// ===== شخصية البوت =====
const SYSTEM_PROMPT = `أنت مساعد ذكي لمكتبة ميار منزل كامل - "فين تقع المكتبة؟" → "تلقانا في شارع البيئة، مقابل معهد منزل كامل 📍 هاك الموقع على الخريطة: https://maps.app.goo.gl/3N9tuVpED4GxcpWz9"
، متخصصة في الأدوات المدرسية والكراسات.
تجاوب الزبائن باللهجة التونسية عبر Facebook Messenger.

المنتجات المتوفرة:
- كراسات (مسطرة، كوس، رسم، موسيقى)
- أقلام (حبر، رصاص، ألوان، فلوماستر)
- أدوات هندسية (مسطرة، أدوات هندسة، منقلة، مثلث)
- حقائب مدرسية
- ورق وكرتون
- غراء ومقص
- محافظ وملفات

معلومات المكتبة:
- العنوان: شارع البيئة، مقابل معهد منزل كامل
- رابط الموقع: https://maps.app.goo.gl/3N9tuVpED4GxcpWz9
- ساعات العمل: 8 صباحاً إلى 7 مساءً
- التوصيل متوفر داخل منزل كامل
- للسعر والتوفر: اتصل بنا مباشرة على 29464720

تعليمات:
- ردود قصيرة ومباشرة بالدارجة التونسية
- ما تتكلمش على كتب أو خدمات أخرى
- إذا سألوك "فين المكتبة" أو "العنوان" أو "وينكم"، جاوب بالعنوان الكامل + رابط الخريطة
- إذا الطلب معقد أو يحتاج سعر محدد، قل "سنحولك لفريقنا"
- إذا سألوك على شيء ما عندناش، قلهم بصراحة`;
 ===== تخزين =====
const conversations = {};
const awaitingRating = {};
const newUsers = new Set();

// ===== Groq API =====
async function getGroqResponse(senderId, userText) {
  if (!conversations[senderId]) conversations[senderId] = [];
  conversations[senderId].push({ role: "user", text: userText });
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
        max_tokens: 500
      },
      {
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const replyText = response.data.choices[0].message.content;
    conversations[senderId].push({ role: "assistant", text: replyText });
    return replyText;

  } catch (err) {
    console.error("❌ خطأ في Groq:", err.response?.data || err.message);
    if (err.response?.status === 401) return "عذراً، مفتاح API غير صالح.";
    if (err.response?.status === 429) return "الخدمة مزدحمة، حاول بعد قليل.";
    return "آسف، حدث خطأ تقني أثناء معالجة طلبك.";
  }
}

// ===== Webhook Verification =====
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

// ===== إحصاءات =====
app.get('/stats', (req, res) => {
  updateStats();
  res.json({
    totalConversations: stats.totalConversations,
    todayConversations: stats.todayConversations,
    activeConversations: Object.keys(conversations).length,
    date: new Date().toLocaleDateString('ar-TN'),
  });
});

// ===== استقبال الرسائل =====
app.post('/webhook', async (req, res) => {
  const body = req.body;
  if (body.object !== 'page') return res.sendStatus(404);
  res.status(200).send('EVENT_RECEIVED');

  for (const entry of body.entry) {
    for (const event of entry.messaging) {
      if (event.message && !event.message.is_echo) {
        await handleMessage(event);
      }
    }
  }
});

async function handleMessage(event) {
  const senderId = event.sender.id;
  const text = event.message?.text || event.message?.quick_reply?.payload;
  if (!text) return;

  console.log(`📨 رسالة من ${senderId}: ${text}`);
  updateStats();

  // ===== ترحيب بالزبون الجديد =====
  if (!newUsers.has(senderId)) {
    newUsers.add(senderId);
    stats.totalConversations++;
    stats.todayConversations++;
    conversations[senderId] = [];

    await sendMessage(senderId,
      `أهلاً وسهلاً في مكتبة ميار! 📚✨\nيسعدنا نخدموك. شنوة نقدر نعاونك فيه اليوم؟`
    );
    await delay(800);
    await sendMessageWithQuickReplies(senderId, CURRENT_OFFERS,
      ["واش عندكم توصيل؟", "أوقات العمل؟", "أقلام وكراسات", "شنوا العروض؟"]
    );
    return;
  }

  // ===== تقييم =====
  if (awaitingRating[senderId]) {
    awaitingRating[senderId] = false;
    const isRating = ["⭐⭐⭐⭐⭐", "⭐⭐⭐⭐", "⭐⭐⭐"].includes(text);
    if (isRating) {
      console.log(`⭐ تقييم من ${senderId}: ${text}`);
      await sendMessage(senderId, `شكراً على تقييمك ${text} 🙏\nنتمنى نشوفك قريباً في مكتبة ميار! 📚`);
    } else {
      await sendMessage(senderId, `شكراً على تواصلك مع مكتبة ميار! 📚`);
    }
    return;
  }

  // ===== طلب العروض =====
  if (text.includes("عروض") || text.includes("تخفيض")) {
    await sendMessage(senderId, CURRENT_OFFERS);
    return;
  }

  // ===== رد Groq =====
  const reply = await getGroqResponse(senderId, text);

  // ===== تحويل لتليفون =====
  if (reply.includes("سنحولك لفريقنا") || text.includes("سعر") || text.includes("طلب كبير")) {
    await sendMessage(senderId, reply);
    await delay(600);
    await sendMessage(senderId, `📞 للتواصل المباشر مع فريقنا:\n${PHONE_NUMBER}\nنحكيوا معك على طول! 😊`);
  } else {
    await sendMessage(senderId, reply);
  }

  console.log(`✉️ رد: ${reply.substring(0, 60)}...`);

  // ===== طلب تقييم بعد 5 ردود =====
  if (conversations[senderId] && conversations[senderId].length === 10) {
    await delay(1500);
    awaitingRating[senderId] = true;
    await sendMessageWithQuickReplies(
      senderId,
      "كيفاش تقيّم تجربتك معانا اليوم؟ 😊",
      ["⭐⭐⭐⭐⭐", "⭐⭐⭐⭐", "⭐⭐⭐"]
    );
  }
}

// ===== دوال مساعدة =====
async function sendMessageWithQuickReplies(recipientId, text, replies) {
  await axios.post(
    `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    {
      recipient: { id: recipientId },
      message: {
        text,
        quick_replies: replies.map(q => ({
          content_type: "text",
          title: q,
          payload: q,
        })),
      },
    }
  ).catch(e => console.error("Quick reply error:", e.response?.data));
}

async function sendMessage(recipientId, text) {
  await axios.post(
    `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    { recipient: { id: recipientId }, message: { text } }
  ).catch(e => console.error("Send error:", e.response?.data));
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 البوت يعمل على المنفذ ${PORT}`);
});
