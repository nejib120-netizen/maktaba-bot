
/**
 * 📚 بوت مكتبة ميار - Facebook Messenger + Groq AI
 * ميزات: ترحيب، بيع، سلة مشتريات، عروض، تقييم، إحصاء، تحويل لتليفون
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

// ===== قائمة المنتجات مع الأسعار =====
const PRODUCTS = {
  "كراس مسطر": { price: 1.5, priceFR: "1.500 DT", nameAR: "كراس مسطر", nameFR: "Cahier ligné" },
  "كراس كوس": { price: 1.5, priceFR: "1.500 DT", nameAR: "كراس كوس", nameFR: "Cahier quadrillé" },
  "كراس رسم": { price: 2.0, priceFR: "2.000 DT", nameAR: "كراس رسم", nameFR: "Cahier de dessin" },
  "كراس موسيقى": { price: 2.0, priceFR: "2.000 DT", nameAR: "كراس موسيقى", nameFR: "Cahier de musique" },
  "قلم حبر": { price: 0.8, priceFR: "0.800 DT", nameAR: "قلم حبر", nameFR: "Stylo à encre" },
  "قلم رصاص": { price: 0.5, priceFR: "0.500 DT", nameAR: "قلم رصاص", nameFR: "Crayon" },
  "أقلام ألوان 12": { price: 4.5, priceFR: "4.500 DT", nameAR: "أقلام ألوان 12 لون", nameFR: "Crayons couleur 12" },
  "فلوماستر 12": { price: 6.0, priceFR: "6.000 DT", nameAR: "فلوماستر 12 لون", nameFR: "Feutres 12 couleurs" },
  "مسطرة": { price: 1.0, priceFR: "1.000 DT", nameAR: "مسطرة", nameFR: "Règle" },
  "أدوات هندسة كاملة": { price: 5.0, priceFR: "5.000 DT", nameAR: "طقم أدوات هندسة", nameFR: "Kit géométrie" },
  "محفظة": { price: 3.0, priceFR: "3.000 DT", nameAR: "محفظة", nameFR: "Pochette" },
  "غراء": { price: 1.2, priceFR: "1.200 DT", nameAR: "غراء", nameFR: "Colle" },
  "مقص": { price: 2.0, priceFR: "2.000 DT", nameAR: "مقص", nameFR: "Ciseaux" },
  "حقيبة مدرسية": { price: 25.0, priceFR: "25.000 DT", nameAR: "حقيبة مدرسية", nameFR: "Cartable" },
};

// ===== العروض =====
const CURRENT_OFFERS = `🎉 عروض مكتبة ميار / Promotions:
• كراسات الرسم بـ -20% / Cahiers dessin -20%
• أقلام الألوان الكبيرة بـ -15% / Crayons couleur -15%
• 5 كراسات = الـ 6 مجانية! / 5 cahiers = le 6ème offert!`;

// ===== شخصية البوت =====
const SYSTEM_PROMPT = `أنت أفضل بائع محترف في مكتبة ميار منزل كامل.
أنت خبير في البيع والإقناع - هدفك تبيع أكثر وتخلي الزبون راضي.

🚫 ممنوعات مطلقة:
- ما تقولش أبداً "غالي" أو "cher" أو "غالية"
- ما تقولش "ما عندكش ميزانية كافية"
- ما تخوّفش الزبون من الأسعار
- ما تتكلمش على كتب أو خدمات خارج المكتبة

✅ واجباتك:
- دائماً شجّع على الشراء
- أعطي الزبون الإحساس أنو الأسعار رخيصة وممتازة
- اقترح باكاجات كاملة تملا الميزانية
- قل "سعر ممتاز" و "فرصة" و "عرض خاص"
- إذا عندو 20 دينار، وريهالو شحال حاجات يقدر يشري!

📍 الموقع:
"فين المكتبة؟" → "تلقانا في شارع البيئة، مقابل معهد منزل كامل 📍 هاك الموقع: https://maps.app.goo.gl/3N9tuVpED4GxcpWz9"
"Où est la librairie ?" → "Rue de l'Environnement, en face du lycée Menzel Kamel 📍 https://maps.app.goo.gl/3N9tuVpED4GxcpWz9"

🌐 اللغة:
- عربي/دارجة → جاوب بالدارجة التونسية
- فرنسية → جاوب بالفرنسية

💰 الأسعار (كلها رخيصة وممتازة!):
كراسات:
- كراس مسطر/كوس: 1.500 DT ✨
- كراس رسم/موسيقى: 2.000 DT ✨
أقلام:
- قلم حبر: 0.800 DT ✨
- قلم رصاص: 0.500 DT ✨
- أقلام ألوان 12 لون: 4.500 DT ✨
- فلوماستر 12: 6.000 DT ✨
أدوات هندسية:
- مسطرة: 1.000 DT ✨
- طقم هندسة كامل: 5.000 DT ✨
أخرى:
- محفظة: 3.000 DT ✨
- غراء: 1.200 DT ✨
- مقص: 2.000 DT ✨
- حقيبة مدرسية: 25.000 DT ✨

🎉 العروض:
- 5 كراسات = الـ 6 مجانية!
- كراسات الرسم -20%
- أقلام ألوان -15%

🛒 أسلوب البيع الاحترافي:

مثال 1: "عندي 20 دينار"
✅ الصحيح: "20 دينار ممتاز! 🎉 تنجّم تاخذ طقم كامل:
• 8 كراسات مسطرة = 12.000 DT (+ واحد مجاني بالعرض!)
• 3 أقلام حبر = 2.400 DT
• قلمين رصاص = 1.000 DT
• مسطرة = 1.000 DT
• غراء = 1.200 DT
• مقص = 2.000 DT
💰 المجموع: 19.600 DT فقط!
وزادة كراس مجاني هدية! 🎁"
❌ الخطأ: "غالي على ميزانيتك"

مثال 2: "نحب كراسات"
✅ "ممتاز! عندنا أحسن كراسات 📒
• مسطر ولا كوس بـ 1.500 DT فقط
• كراس رسم بـ 2.000 DT
🎉 والعرض: 5 كراسات = الـ 6 مجاني!
شحال تحب تاخذ؟"

مثال 3: "عندي ولد في 5ème"
✅ "ممتاز! باكاج 5ème الكامل:
• 6 كراسات مسطرة
• 3 كراسات كوس
• كراس رسم + كراس موسيقى
• طقم أقلام + أدوات هندسة
الكل بسعر ممتاز! تحب نحسبهالك؟ 😊"

📦 تأكيد الطلبية:
- اكتب ✅ طلبيتك: + التفاصيل + السعر الإجمالي
- اسأل: "تحب توصيل (2.000 DT) ولا تجي للمكتبة؟"
- إذا توصيل: اسأل العنوان
- إذا يجي: أعطيه الأوقات 8h-19h

معلومات المكتبة:
- العنوان: شارع البيئة، مقابل معهد منزل كامل
- ساعات العمل: 8h - 19h
- التوصيل: داخل منزل كامل (2.000 DT)
- الدفع: عند الاستلام
- هاتف: 29464720

تذكّر: أنت بائع محترف! كل سعر هو "ممتاز" و "رخيص" و "فرصة"!
ما تقولش أبداً "غالي"! 🚫`;

// ===== تخزين =====
const conversations = {};
const awaitingRating = {};
const newUsers = new Set();
const customerCarts = {};
const customerInfo = {};

// ===== ✅ Groq API (مرة وحدة فقط!) =====
async function getGroqResponse(senderId, userText) {
  if (!conversations[senderId]) conversations[senderId] = [];
  conversations[senderId].push({ role: "user", text: userText });
  if (conversations[senderId].length > 20) {
    conversations[senderId] = conversations[senderId].slice(-20);
  }

  try {
    const cartInfo = customerCarts[senderId]?.length > 0
      ? `\n\n[معلومات مهمة: سلة الزبون الحالية تحتوي على ${customerCarts[senderId].length} منتج]`
      : "\n\n[سلة الزبون فارغة - شجعه على الشراء]";

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
        temperature: 0.6,
        max_tokens: 1200,
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
    console.error("❌ خطأ في Groq:", err.response?.data || err.message);
    if (err.response?.status === 401) return "عذراً، خطأ تقني. اتصل بنا: " + PHONE_NUMBER;
    if (err.response?.status === 429) return "الخدمة مزدحمة، حاول بعد شوية 🙏";
    return "آسف، حدث خطأ. اتصل بنا: " + PHONE_NUMBER;
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
    totalOrders: stats.totalOrders,
    todayOrders: stats.todayOrders,
    activeConversations: Object.keys(conversations).length,
    activeCarts: Object.keys(customerCarts).filter(k => customerCarts[k]?.length > 0).length,
    date: new Date().toLocaleDateString('ar-TN'),
  });
});

// ===== الطلبيات =====
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

  if (!customerCarts[senderId]) customerCarts[senderId] = [];
  if (!customerInfo[senderId]) customerInfo[senderId] = {};

  // ===== ترحيب بالزبون الجديد =====
  if (!newUsers.has(senderId)) {
    newUsers.add(senderId);
    stats.totalConversations++;
    stats.todayConversations++;
    conversations[senderId] = [];

    try {
      const profile = await axios.get(
        `https://graph.facebook.com/${senderId}?fields=first_name,last_name&access_token=${PAGE_ACCESS_TOKEN}`
      );
      customerInfo[senderId].name = `${profile.data.first_name} ${profile.data.last_name}`;
    } catch (e) {
      customerInfo[senderId].name = "زبون";
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

  // قائمة المنتجات
  if (lowerText.includes("قائمة") || lowerText.includes("منتجات") || lowerText.includes("catalogue") || lowerText.includes("produits") || text === "📋 قائمة المنتجات") {
    const catalog = `📋 منتجاتنا / Nos produits:

📒 كراسات / Cahiers:
• كراس مسطر/كوس - 1.500 DT
• كراس رسم/موسيقى - 2.000 DT

✏️ أقلام / Stylos:
• قلم حبر - 0.800 DT
• قلم رصاص - 0.500 DT
• ألوان 12 - 4.500 DT
• فلوماستر 12 - 6.000 DT

📐 أدوات هندسية / Géométrie:
• مسطرة - 1.000 DT
• طقم هندسة - 5.000 DT

🎒 أخرى / Autres:
• محفظة - 3.000 DT
• غراء - 1.200 DT
• مقص - 2.000 DT
• حقيبة مدرسية - 25.000 DT`;

    await sendMessage(senderId, catalog);
    await delay(500);
    await sendMessageWithQuickReplies(senderId,
      "شنوة تحب تشري؟ 😊",
      ["🛒 نحب نشري", "🎉 العروض", "📞 اتصل بنا"]
    );
    return;
  }

  // العروض
  if (lowerText.includes("عروض") || lowerText.includes("تخفيض") || lowerText.includes("promo") || text === "🎉 العروض") {
    await sendMessage(senderId, CURRENT_OFFERS);
    await delay(500);
    await sendMessageWithQuickReplies(senderId,
      "تحب تستفيد من العروض؟ 😊",
      ["🛒 نحب نشري", "📋 قائمة المنتجات", "📞 اتصل بنا"]
    );
    return;
  }

  // العنوان
  if (lowerText.includes("عنوان") || lowerText.includes("فين") || lowerText.includes("وين") || lowerText.includes("adresse") || lowerText.includes("où") || text === "📍 العنوان") {
    await sendMessage(senderId,
      `📍 تلقانا في شارع البيئة، مقابل معهد منزل كامل\n🗺️ الموقع: https://maps.app.goo.gl/3N9tuVpED4GxcpWz9\n🕐 8h - 19h كل يوم`
    );
    return;
  }

  // اتصل بنا
  if (lowerText.includes("اتصل") || lowerText.includes("تليفون") || lowerText.includes("هاتف") || lowerText.includes("appel") || lowerText.includes("téléphone") || text === "📞 اتصل بنا") {
    await sendMessage(senderId,
      `📞 اتصل بنا مباشرة:\n${PHONE_NUMBER}\n\n📍 ولا إجي للمكتبة: شارع البيئة، مقابل معهد منزل كامل\n🕐 8h - 19h`
    );
    return;
  }

  // السلة
  if (lowerText.includes("سلة") || lowerText.includes("panier") || lowerText.includes("طلبيتي") || text === "🛒 سلتي") {
    if (customerCarts[senderId].length === 0) {
      await sendMessage(senderId, "🛒 السلة فارغة! شنوة تحب تشري؟");
      await sendMessageWithQuickReplies(senderId, "اختار:", ["📋 قائمة المنتجات", "🎉 العروض"]);
    } else {
      let cartText = "🛒 سلتك:\n";
      let total = 0;
      customerCarts[senderId].forEach((item, i) => {
        cartText += `${i + 1}. ${item.name} × ${item.qty} = ${(item.price * item.qty).toFixed(3)} DT\n`;
        total += item.price * item.qty;
      });
      cartText += `\n💰 المجموع: ${total.toFixed(3)} DT`;
      await sendMessage(senderId, cartText);
      await sendMessageWithQuickReplies(senderId, "شنوة تحب تعمل؟",
        ["✅ أكّد الطلبية", "🗑️ فرّغ السلة", "🛒 زيد حاجة", "📞 اتصل بنا"]
      );
    }
    return;
  }

  // تفريغ السلة
  if (lowerText.includes("فرّغ") || lowerText.includes("امسح") || lowerText.includes("vider") || text === "🗑️ فرّغ السلة") {
    customerCarts[senderId] = [];
    await sendMessage(senderId, "🗑️ تم تفريغ السلة!\nتحب تشري حاجة أخرى؟");
    await sendMessageWithQuickReplies(senderId, "اختار:", ["📋 قائمة المنتجات", "🎉 العروض"]);
    return;
  }

  // تأكيد الطلبية
  if (lowerText.includes("أكّد") || lowerText.includes("أكد") || lowerText.includes("confirmer") || text === "✅ أكّد الطلبية") {
    if (customerCarts[senderId].length === 0) {
      await sendMessage(senderId, "السلة فارغة! اختار منتجات أولاً 😊");
      return;
    }
    let cartText = "✅ تأكيد الطلبية:\n";
    let total = 0;
    customerCarts[senderId].forEach((item, i) => {
      cartText += `${i + 1}. ${item.name} × ${item.qty} = ${(item.price * item.qty).toFixed(3)} DT\n`;
      total += item.price * item.qty;
    });
    cartText += `\n💰 المجموع: ${total.toFixed(3)} DT`;
    cartText += `\n📦 التوصيل: 2.000 DT`;
    cartText += `\n💵 الإجمالي مع التوصيل: ${(total + 2).toFixed(3)} DT`;

    await sendMessage(senderId, cartText);
    await delay(500);
    await sendMessageWithQuickReplies(senderId,
      "كيفاش تحب تستلم؟",
      ["🚚 توصيل", "🏪 نجي للمكتبة"]
    );

    stats.totalOrders++;
    stats.todayOrders++;
    console.log(`🛒 طلبية جديدة من ${customerInfo[senderId]?.name}: ${total.toFixed(3)} DT`);
    return;
  }

  // التوصيل
  if (text === "🚚 توصيل" || lowerText.includes("توصيل") || lowerText.includes("livraison")) {
    if (customerCarts[senderId].length > 0) {
      customerInfo[senderId].delivery = true;
      await sendMessage(senderId, "🚚 ممتاز! أعطينا عنوانك باش نوصلوهالك.\nاكتب العنوان الكامل:");
      return;
    }
  }

  // نجي للمكتبة
  if (text === "🏪 نجي للمكتبة") {
    customerInfo[senderId].delivery = false;
    await sendMessage(senderId,
      `🏪 ممتاز! طلبيتك جاهزة، تنجم تجي تاخذها من:\n📍 شارع البيئة، مقابل معهد منزل كامل\n🕐 8h - 19h\n\nشكراً ${customerInfo[senderId]?.name || ''} على ثقتك في مكتبة ميار! 🙏📚`
    );
    customerCarts[senderId] = [];
    return;
  }

  // تقييم
  if (awaitingRating[senderId]) {
    awaitingRating[senderId] = false;
    const isRating = ["⭐⭐⭐⭐⭐", "⭐⭐⭐⭐", "⭐⭐⭐"].includes(text);
    if (isRating) {
      console.log(`⭐ تقييم من ${customerInfo[senderId]?.name}: ${text}`);
      await sendMessage(senderId, `شكراً على تقييمك ${text} 🙏\nنتمنى نشوفك قريباً! 📚`);
    } else {
      await sendMessage(senderId, `شكراً على تواصلك مع مكتبة ميار! 📚`);
    }
    return;
  }

  // ===== رد Groq =====
  const reply = await getGroqResponse(senderId, text);

  if (reply.includes("سنحولك") || reply.includes("je vous transfère")) {
    await sendMessage(senderId, reply);
    await delay(600);
    await sendMessage(senderId, `📞 للتواصل المباشر:\n${PHONE_NUMBER}\nنردّو عليك على طول! 😊`);
  } else {
    await sendMessage(senderId, reply);

    if (!reply.includes("✅") && conversations[senderId].length % 4 === 0) {
      await delay(500);
      await sendMessageWithQuickReplies(senderId, "حاجة أخرى؟ 😊",
        ["🛒 سلتي", "📋 قائمة المنتجات", "🎉 العروض", "📞 اتصل بنا"]
      );
    }
  }

  console.log(`✉️ رد: ${reply.substring(0, 60)}...`);

  if (conversations[senderId] && conversations[senderId].length === 16) {
    await delay(2000);
    awaitingRating[senderId] = true;
    await sendMessageWithQuickReplies(
      senderId,
      `${customerInfo[senderId]?.name || ''} كيفاش تقيّم تجربتك معانا؟ 😊`,
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

// ===== تشغيل السيرفر =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 البوت يعمل على المنفذ ${PORT}`);
  console.log(`🧠 الموديل: llama-3.3-70b-versatile`);
  console.log(`📊 إحصاءات: http://localhost:${PORT}/stats`);
  console.log(`📦 طلبيات: http://localhost:${PORT}/orders`);
});
