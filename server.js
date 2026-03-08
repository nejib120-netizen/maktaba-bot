/**
 * 📚 بوت مكتبة ميار - Facebook Messenger + Groq AI
 * ميزات: ترحيب، بيع، سلة مشتريات، عروض، تقييم، إحصاء، تحويل لتليفون
 */

const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());
app.use(express.static('.'));

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "maktaba_secret_2024";
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const PHONE_NUMBER = process.env.PHONE_NUMBER || "29464720";

const stats = {
  totalConversations: 0,
  todayConversations: 0,
  totalOrders: 0,
  todayOrders: 0,
  lastReset: new Date().toDateString(),
};

function updateStats() {
  const today = new Date().toDateString();
  if (stats.lastReset !== today) {
    stats.todayConversations = 0;
    stats.todayOrders = 0;
    stats.lastReset = today;
  }
}

const PRODUCTS = {
  "كراس مسطر": { price: 1.5, nameFR: "Cahier ligné" },
  "كراس كوس": { price: 1.5, nameFR: "Cahier quadrillé" },
  "كراس رسم": { price: 2.0, nameFR: "Cahier de dessin" },
  "كراس موسيقى": { price: 2.0, nameFR: "Cahier de musique" },
  "قلم حبر": { price: 0.8, nameFR: "Stylo à encre" },
  "قلم رصاص": { price: 0.5, nameFR: "Crayon" },
  "أقلام ألوان 12": { price: 4.5, nameFR: "Crayons couleur 12" },
  "فلوماستر 12": { price: 6.0, nameFR: "Feutres 12 couleurs" },
  "مسطرة": { price: 1.0, nameFR: "Règle" },
  "أدوات هندسة كاملة": { price: 5.0, nameFR: "Kit géométrie" },
  "محفظة": { price: 3.0, nameFR: "Pochette" },
  "غراء": { price: 1.2, nameFR: "Colle" },
  "مقص": { price: 2.0, nameFR: "Ciseaux" },
  "حقيبة مدرسية": { price: 25.0, nameFR: "Cartable" },
};

const CURRENT_OFFERS = `🎉 عروض مكتبة ميار / Promotions:
• كراسات الرسم بـ -20% / Cahiers dessin -20%
• أقلام الألوان الكبيرة بـ -15% / Crayons couleur -15%
• 5 كراسات = الـ 6 مجانية! / 5 cahiers = le 6ème offert!`;

const SYSTEM_PROMPT = `أنت بائع محترف في مكتبة ميار بمنزل كامل، تونس.

🌐 اللغة — قاعدة صارمة جداً:
- رسالة بالفرنسية → جاوب بالفرنسية UNIQUEMENT، ممنوع تحط كلمة عربية
- رسالة بالعربية أو الدارجة → جاوب بالدارجة التونسية UNIQUEMENT، ممنوع تحط كلمة فرنسية

🗣️ الدارجة التونسية — كلمات إجبارية:
شنوة (مش إيه/ماذا) | بكاش (مش بكام) | نجم (مش أقدر) | باهي (مش تمام)
يزي (مش كفاية) | واش (مش هل) | برشة (مش كثير) | هاك (مش هذا)
تحب (مش تريد) | قداش (مش كم) | مليح (مش جيد) | يعطيك الصحة (للشكر)
ما تستعملش أبداً: عايز، إزيك، تمام، أهلاً، جداً، ماذا، كيف حالك

✂️ الردود — قاعدة صارمة:
- 3 أسطر maximum
- ما تكررش نفس المعلومة مرتين أبداً
- سؤال واحد بس في الرد

🚫 ممنوعات: "غالي"، "cher"، "غالية"، خلط اللغات

✅ أسلوب البيع: الأسعار "رخيصة وممتازة" دايماً، اقترح باكاجات، شجع على الشراء

📍 الموقع:
بالدارجة: "تلقانا في شارع البيئة، مقابل معهد منزل كامل 📍 https://maps.app.goo.gl/3N9tuVpED4GxcpWz9"
بالفرنسية: "Rue de l'Environnement, face au lycée Menzel Kamel 📍 https://maps.app.goo.gl/3N9tuVpED4GxcpWz9"

💰 الأسعار:
كراسات: مسطر/كوس 1.5DT | رسم/موسيقى 2DT
أقلام: حبر 0.8DT | رصاص 0.5DT | ألوان×12 4.5DT | فلوماستر 6DT
هندسة: مسطرة 1DT | طقم 5DT
أخرى: محفظة 3DT | غراء 1.2DT | مقص 2DT | حقيبة 25DT
🎉 عروض: 5 كراسات=الـ6 مجاني | رسم -20% | ألوان -15%
معلومات: 8h-19h | توصيل 2DT | دفع عند الاستلام | هاتف: 29464720`;

const conversations = {};
const awaitingRating = {};
const newUsers = new Set();
const customerCarts = {};
const customerInfo = {};

async function getGroqResponse(senderId, userText) {
  if (!conversations[senderId]) conversations[senderId] = [];
  conversations[senderId].push({ role: "user", text: userText });
  if (conversations[senderId].length > 20) {
    conversations[senderId] = conversations[senderId].slice(-20);
  }

  try {
    const cartInfo = customerCarts[senderId]?.length > 0
      ? `\n[سلة الزبون: ${customerCarts[senderId].length} منتج]`
      : "\n[السلة فارغة - شجعه على الشراء]";

    const formattedMessages = [
      { role: "system", content: SYSTEM_PROMPT + cartInfo },
      ...conversations[senderId].map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text
      }))
    ];

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: formattedMessages,
        temperature: 0.5,
        max_tokens: 500,
        top_p: 0.9
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
    console.error("خطأ في Groq:", err.response?.data || err.message);
    if (err.response?.status === 429) return "الخدمة مزدحمة، حاول بعد شوية 🙏";
    return "آسف، صرالي مشكل. اتصل بنا: " + PHONE_NUMBER;
  }
}

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.get('/stats', (req, res) => {
  updateStats();
  res.json({
    totalConversations: stats.totalConversations,
    todayConversations: stats.todayConversations,
    totalOrders: stats.totalOrders,
    todayOrders: stats.todayOrders,
    activeConversations: Object.keys(conversations).length,
    activeCarts: Object.keys(customerCarts).filter(k => customerCarts[k]?.length > 0).length,
    date: new Date().toLocaleDateString('ar-TN'),
  });
});

app.get('/orders', (req, res) => {
  const allCarts = {};
  for (const [userId, cart] of Object.entries(customerCarts)) {
    if (cart.length > 0) {
      allCarts[userId] = {
        items: cart,
        info: customerInfo[userId] || {},
        total: cart.reduce((sum, item) => sum + (item.price * item.qty), 0)
      };
    }
  }
  res.json(allCarts);
});

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

  console.log(`📨 ${senderId}: ${text}`);
  updateStats();

  if (!customerCarts[senderId]) customerCarts[senderId] = [];
  if (!customerInfo[senderId]) customerInfo[senderId] = {};

  if (!newUsers.has(senderId)) {
    newUsers.add(senderId);
    stats.totalConversations++;
    stats.todayConversations++;
    conversations[senderId] = [];

    try {
      const profile = await axios.get(
        `https://graph.facebook.com/${senderId}?fields=first_name&access_token=${PAGE_ACCESS_TOKEN}`
      );
      customerInfo[senderId].name = profile.data.first_name;
    } catch (e) {
      customerInfo[senderId].name = "";
    }

    const name = customerInfo[senderId].name;
    await sendMessage(senderId,
      `مرحبا بيك ${name} في مكتبة ميار! 📚✨\nنقدرو نعاونوك تلقى كل ما تحتاج للدراسة.\n\nBienvenue ${name} à la Librairie Mayar! 📚✨`
    );
    await delay(800);
    await sendMessageWithQuickReplies(senderId,
      `شنوة تحب؟ / Que souhaitez-vous ?`,
      ["🛒 نحب نشري", "📋 قائمة المنتجات", "🎉 العروض", "📍 العنوان", "📞 اتصل بنا"]
    );
    return;
  }

  const lowerText = text.toLowerCase().trim();

  if (lowerText.includes("قائمة") || lowerText.includes("منتجات") || lowerText.includes("catalogue") || lowerText.includes("produits") || text === "📋 قائمة المنتجات") {
    await sendMessage(senderId,
`📋 منتجاتنا / Nos produits:
📒 مسطر/كوس 1.5DT | رسم/موسيقى 2DT
✏️ حبر 0.8DT | رصاص 0.5DT | ألوان×12 4.5DT | فلوماستر 6DT
📐 مسطرة 1DT | طقم هندسة 5DT
🎒 محفظة 3DT | غراء 1.2DT | مقص 2DT | حقيبة 25DT`
    );
    await delay(400);
    await sendMessageWithQuickReplies(senderId, "شنوة تحب تشري؟ 😊",
      ["🛒 نحب نشري", "🎉 العروض", "📞 اتصل بنا"]
    );
    return;
  }

  if (lowerText.includes("عروض") || lowerText.includes("تخفيض") || lowerText.includes("promo") || text === "🎉 العروض") {
    await sendMessage(senderId, CURRENT_OFFERS);
    await delay(400);
    await sendMessageWithQuickReplies(senderId, "تحب تستفيد؟ 😊",
      ["🛒 نحب نشري", "📋 قائمة المنتجات", "📞 اتصل بنا"]
    );
    return;
  }

  if (lowerText.includes("عنوان") || lowerText.includes("فين") || lowerText.includes("وين") || lowerText.includes("adresse") || lowerText.includes("où") || text === "📍 العنوان") {
    await sendMessage(senderId,
      `📍 شارع البيئة، مقابل معهد منزل كامل\n🗺️ https://maps.app.goo.gl/3N9tuVpED4GxcpWz9\n🕐 8h-19h كل يوم`
    );
    return;
  }

  if (lowerText.includes("اتصل") || lowerText.includes("تليفون") || lowerText.includes("appel") || lowerText.includes("téléphone") || text === "📞 اتصل بنا") {
    await sendMessage(senderId, `📞 ${PHONE_NUMBER}\n📍 شارع البيئة، مقابل معهد منزل كامل\n🕐 8h-19h`);
    return;
  }

  if (lowerText.includes("سلة") || lowerText.includes("panier") || text === "🛒 سلتي") {
    if (customerCarts[senderId].length === 0) {
      await sendMessage(senderId, "🛒 السلة فارغة! شنوة تحب تشري؟");
      await sendMessageWithQuickReplies(senderId, "اختار:", ["📋 قائمة المنتجات", "🎉 العروض"]);
    } else {
      let cartText = "🛒 سلتك:\n";
      let total = 0;
      customerCarts[senderId].forEach((item, i) => {
        cartText += `${i+1}. ${item.name} ×${item.qty} = ${(item.price*item.qty).toFixed(3)}DT\n`;
        total += item.price * item.qty;
      });
      cartText += `\n💰 المجموع: ${total.toFixed(3)}DT`;
      await sendMessage(senderId, cartText);
      await sendMessageWithQuickReplies(senderId, "شنوة تحب تعمل؟",
        ["✅ أكّد الطلبية", "🗑️ فرّغ السلة", "📞 اتصل بنا"]
      );
    }
    return;
  }

  if (lowerText.includes("فرّغ") || lowerText.includes("امسح") || text === "🗑️ فرّغ السلة") {
    customerCarts[senderId] = [];
    await sendMessage(senderId, "🗑️ تم تفريغ السلة! شنوة تحب تشري؟");
    await sendMessageWithQuickReplies(senderId, "اختار:", ["📋 قائمة المنتجات", "🎉 العروض"]);
    return;
  }

  if (lowerText.includes("أكّد") || lowerText.includes("أكد") || lowerText.includes("confirmer") || text === "✅ أكّد الطلبية") {
    if (customerCarts[senderId].length === 0) {
      await sendMessage(senderId, "السلة فارغة! اختار منتجات أولاً 😊");
      return;
    }
    let cartText = "✅ تأكيد الطلبية:\n";
    let total = 0;
    customerCarts[senderId].forEach((item, i) => {
      cartText += `${i+1}. ${item.name} ×${item.qty} = ${(item.price*item.qty).toFixed(3)}DT\n`;
      total += item.price * item.qty;
    });
    cartText += `\n💰 المجموع: ${total.toFixed(3)}DT\n📦 توصيل: 2DT\n💵 الإجمالي: ${(total+2).toFixed(3)}DT`;
    await sendMessage(senderId, cartText);
    await delay(400);
    await sendMessageWithQuickReplies(senderId, "كيفاش تحب تستلم؟",
      ["🚚 توصيل", "🏪 نجي للمكتبة"]
    );
    stats.totalOrders++;
    stats.todayOrders++;
    return;
  }

  if (text === "🚚 توصيل") {
    customerInfo[senderId].delivery = true;
    await sendMessage(senderId, "🚚 باهي! اكتب عنوانك الكامل باش نوصلوهالك:");
    return;
  }

  if (text === "🏪 نجي للمكتبة") {
    customerInfo[senderId].delivery = false;
    await sendMessage(senderId,
      `🏪 طلبيتك جاهزة!\n📍 شارع البيئة، مقابل معهد منزل كامل\n🕐 8h-19h | يعطيك الصحة ${customerInfo[senderId]?.name || ''} 🙏`
    );
    customerCarts[senderId] = [];
    return;
  }

  if (awaitingRating[senderId]) {
    awaitingRating[senderId] = false;
    if (["⭐⭐⭐⭐⭐", "⭐⭐⭐⭐", "⭐⭐⭐"].includes(text)) {
      await sendMessage(senderId, `يعطيك الصحة على تقييمك ${text} 🙏\nنتمنى نشوفك قريباً! 📚`);
    }
    return;
  }

  const reply = await getGroqResponse(senderId, text);

  if (reply.includes("سنحولك") || reply.includes("je vous transfère")) {
    await sendMessage(senderId, reply);
    await delay(600);
    await sendMessage(senderId, `📞 ${PHONE_NUMBER}\nنردّو عليك على طول! 😊`);
  } else {
    await sendMessage(senderId, reply);
    if (!reply.includes("✅") && conversations[senderId].length % 4 === 0) {
      await delay(400);
      await sendMessageWithQuickReplies(senderId, "حاجة أخرى؟ 😊",
        ["🛒 سلتي", "📋 قائمة المنتجات", "🎉 العروض", "📞 اتصل بنا"]
      );
    }
  }

  if (conversations[senderId]?.length === 16) {
    await delay(2000);
    awaitingRating[senderId] = true;
    await sendMessageWithQuickReplies(senderId,
      `${customerInfo[senderId]?.name || ''} كيفاش تقيّم تجربتك معانا؟ 😊`,
      ["⭐⭐⭐⭐⭐", "⭐⭐⭐⭐", "⭐⭐⭐"]
    );
  }
}

async function sendMessageWithQuickReplies(recipientId, text, replies) {
  await axios.post(
    `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    {
      recipient: { id: recipientId },
      message: {
        text,
        quick_replies: replies.map(q => ({ content_type: "text", title: q, payload: q })),
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
  console.log(`📊 إحصاءات: http://localhost:${PORT}/stats`);
  console.log(`📦 طلبيات: http://localhost:${PORT}/orders`);
});
