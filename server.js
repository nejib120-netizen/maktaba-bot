/**
 * 📚 بوت مكتبة ميار - Facebook Messenger + Groq AI
 * ميزات: باكجات صفوف 1-6، ترحيب، عروض، تقييم، إحصاء، تحويل لتليفون
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

// ===== باكجات الصفوف =====
const GRADE_PACKAGES = {
  "1": {
    nameFR: "1ère année primaire",
    nameAR: "السنة الأولى ابتدائي",
    items: [
      "3 كتب مدرسية",
      "3 غلاف كتب",
      "2 كراس 12",
      "4 كراس 24",
      "2 كراس 48",
      "1 كراس محفوظات",
      "1 كراس موسيقى",
      "1 كراس تصوير حجم صغير",
      "12 غلاف كراس",
      "12 اقلام جافة",
      "12 أقلام لبدية",
      "1 كراس ايقاظ حجم صغير",
      "1 اوراق تصوير + اوراق ملونة",
      "12 اقلام زينة 12/18",
      "12 اقلام شمعية",
      "1 قلم رصاص + ممحاة + مبراة",
      "1 مسطرة + كوس",
      "1 لصق + مقص",
      "6 الوان مائية",
      "1 لوحة + قلم + طلاسة",
      "1 معداد",
      "6 صلصال",
      "1 اقراص و اعواد + نقود مزيفة",
      "1 كنش",
    ],
    total: 110,
  },
  "2": {
    nameFR: "2ème année primaire",
    nameAR: "السنة الثانية ابتدائي",
    items: [
      "3 كتب مدرسية",
      "3 غلاف كتب",
      "3 كراس 12",
      "4 كراس 24",
      "2 كراس 48",
      "1 كراس محفوظات",
      "1 كراس موسيقى",
      "1 كراس تصوير حجم صغير",
      "12 غلاف كراس",
      "12 اقلام جافة",
      "12 أقلام لبدية",
      "1 اوراق تصوير + اوراق ملونة",
      "12 اقلام زينة 12/18",
      "12 اقلام شمعية",
      "1 قلم رصاص + ممحاة + مبراة",
      "1 مسطرة + كوس",
      "1 لصق + مقص",
      "6 الوان مائية",
      "1 معداد",
      "6 صلصال",
      "1 كنش",
    ],
    total: 120,
  },
  "3": {
    nameFR: "3ème année primaire",
    nameAR: "السنة الثالثة ابتدائي",
    items: [
      "4 كتب مدرسية",
      "4 غلاف كتب",
      "4 كراس 24",
      "3 كراس 48",
      "1 كراس محفوظات",
      "1 كراس موسيقى",
      "1 كراس رسم",
      "12 غلاف كراس",
      "12 اقلام جافة",
      "12 أقلام لبدية",
      "1 اوراق تصوير + اوراق ملونة",
      "12 اقلام زينة 12/18",
      "12 اقلام شمعية",
      "1 قلم رصاص + ممحاة + مبراة",
      "1 طقم هندسة (مسطرة + كوس + منقلة + مثلث)",
      "1 لصق + مقص",
      "6 الوان مائية",
      "1 كنش",
    ],
    total: 135,
  },
  "4": {
    nameFR: "4ème année primaire",
    nameAR: "السنة الرابعة ابتدائي",
    items: [
      "5 كتب مدرسية",
      "5 غلاف كتب",
      "4 كراس 24",
      "4 كراس 48",
      "1 كراس محفوظات",
      "1 كراس موسيقى",
      "1 كراس رسم",
      "12 غلاف كراس",
      "12 اقلام جافة",
      "12 أقلام لبدية",
      "12 اقلام زينة 12/18",
      "1 قلم رصاص + ممحاة + مبراة",
      "1 طقم هندسة كامل",
      "1 لصق + مقص",
      "6 الوان مائية",
      "1 كلاسور + بوشات",
      "1 كنش",
    ],
    total: 145,
  },
  "5": {
    nameFR: "5ème année primaire",
    nameAR: "السنة الخامسة ابتدائي",
    items: [
      "6 كتب مدرسية",
      "6 غلاف كتب",
      "5 كراس 24",
      "4 كراس 48",
      "1 كراس محفوظات",
      "1 كراس موسيقى",
      "1 كراس رسم",
      "12 غلاف كراس",
      "12 اقلام جافة",
      "12 أقلام لبدية",
      "12 اقلام زينة 12/18",
      "1 قلم رصاص + ممحاة + مبراة",
      "1 طقم هندسة كامل",
      "1 لصق + مقص",
      "6 الوان مائية",
      "1 كلاسور كبير + بوشات",
      "1 كنش",
    ],
    total: 155,
  },
  "6": {
    nameFR: "6ème année primaire",
    nameAR: "السنة السادسة ابتدائي",
    items: [
      "7 كتب مدرسية",
      "7 غلاف كتب",
      "5 كراس 24",
      "5 كراس 48",
      "1 كراس محفوظات",
      "1 كراس موسيقى",
      "1 كراس رسم",
      "12 غلاف كراس",
      "12 اقلام جافة",
      "12 أقلام لبدية",
      "12 اقلام زينة 12/18",
      "1 قلم رصاص + ممحاة + مبراة",
      "1 طقم هندسة كامل",
      "1 لصق + مقص",
      "6 الوان مائية",
      "1 كلاسور كبير + بوشات",
      "1 كنش",
    ],
    total: 165,
    note: "🏆 Pack spécial concours national!"
  },
};

function formatPackage(grade, withTools = false) {
  const pkg = GRADE_PACKAGES[grade];
  if (!pkg) return null;
  if (withTools) {
    let text = `📦 ${pkg.nameAR} — قائمة الأدوات الكاملة:\n\n`;
    pkg.items.forEach(item => { text += `• ${item}\n`; });
    text += `\n💰 السعر الإجمالي: ${pkg.total} DT`;
    if (pkg.note) text += `\n${pkg.note}`;
    return text;
  } else {
    let text = `📦 Pack ${pkg.nameFR} (${pkg.nameAR}):\n`;
    text += `${pkg.items.length} منتج شامل\n`;
    text += `\n💰 Total: ${pkg.total} DT`;
    if (pkg.note) text += `\n${pkg.note}`;
    return text;
  }
}

const CURRENT_OFFERS = `🎉 Promotions Mayar:
• Cahiers dessin -20%
• Crayons couleur -15%
• 5 cahiers achetés = le 6ème offert!`;

const SYSTEM_PROMPT = `Tu es le vendeur expert de la Librairie Mayar à Menzel Kamel.

🌐 LANGUE - RÈGLE ABSOLUE:
- Message en français → réponds UNIQUEMENT en français
- Message en arabe/dialecte tunisien → réponds UNIQUEMENT en dialecte tunisien
- Exemples dialecte tunisien OBLIGATOIRES:
  * "شنوة" (jamais "إيه" أو "ماذا")
  * "بكاش" (jamais "بكام")
  * "نجم" (jamais "أقدر")
  * "باهي" (jamais "تمام")
  * "واش" (jamais "هل")
  * "برشة" (jamais "كثير")
  * "يزي" (jamais "كفاية")
  * "نحب" (jamais "أريد")
  * "حاجة" (jamais "شيء")

✂️ LONGUEUR - RÈGLE ABSOLUE:
- Maximum 3 lignes par réponse
- Ne répète JAMAIS la même information
- Une seule question par réponse

🚫 INTERDIT:
- Dire "غالي" ou "cher"
- Répéter "Librairie Mayar" plus d'une fois
- Mélanger arabe et français dans le même message
- JAMAIS inventer ou mentionner les prix des packs (110DT, 120DT...)
- Si on demande le contenu d'un pack → dis "le bot va t'envoyer la liste complète"

✅ STYLE VENDEUR:
- Prix toujours "ممتاز" / "excellent" / "très abordable"
- Encourage les packs complets (plus économique)
- Si budget mentionné → propose max de produits dans ce budget

💰 PRIX:
Cahiers: مسطر/كوس 1.5DT | رسم/موسيقى 2DT
Stylos: حبر 0.8DT | رصاص 0.5DT | ألوان×12 4.5DT | فلوماستر 6DT
Géométrie: مسطرة 1DT | طقم 5DT
Autres: محفظة 3DT | غراء 1.2DT | مقص 2DT | حقيبة 25DT

📦 PACKS DISPONIBLES (السنة 1 إلى 6):
- Le bot envoie automatiquement le pack quand le client précise sa classe
- Si client dit "سنة 3" ou "3ème année" → dis-lui que le pack est disponible

📍 Rue de l'Environnement, en face du lycée Menzel Kamel
🗺️ https://maps.app.goo.gl/3N9tuVpED4GxcpWz9
🕐 8h-19h | 📞 29464720 | Livraison Menzel Kamel: 2DT`;

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
        model: "llama-3.3-70b-versatile",
        messages: formattedMessages,
        temperature: 0.5,
        max_tokens: 400,
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
    console.error("❌ Groq error:", err.response?.data || err.message);
    if (err.response?.status === 429) return "Service occupé, réessayez dans un moment 🙏";
    return `Erreur technique. Appelez-nous: ${PHONE_NUMBER}`;
  }
}

// دالة تكشف الصف من الرسالة
function detectGrade(text) {
  const t = text.toLowerCase();
  // كشف الأرقام مباشرة من الأزرار أو النص
  if (t.includes("1") && (t.includes("سنة") || t.includes("nة") || t.includes("1ère") || t.includes("première") || t.includes("اول") || t.includes("الأولى"))) return "1";
  if (t.includes("2") && (t.includes("سنة") || t.includes("nة") || t.includes("2ème") || t.includes("deuxième") || t.includes("ثاني") || t.includes("الثانية"))) return "2";
  if (t.includes("3") && (t.includes("سنة") || t.includes("nة") || t.includes("3ème") || t.includes("troisième") || t.includes("ثالث") || t.includes("الثالثة"))) return "3";
  if (t.includes("4") && (t.includes("سنة") || t.includes("nة") || t.includes("4ème") || t.includes("quatrième") || t.includes("رابع") || t.includes("الرابعة"))) return "4";
  if (t.includes("5") && (t.includes("سنة") || t.includes("nة") || t.includes("5ème") || t.includes("cinquième") || t.includes("خامس") || t.includes("الخامسة"))) return "5";
  if (t.includes("6") && (t.includes("سنة") || t.includes("nة") || t.includes("6ème") || t.includes("sixième") || t.includes("سادس") || t.includes("السادسة"))) return "6";
  return null;
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
    date: new Date().toLocaleDateString('fr-TN'),
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

  // ترحيب
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
    await sendMessage(senderId, `Bienvenue ${name} à la Librairie Mayar! 📚✨`);
    await delay(700);
    await sendMessageWithQuickReplies(senderId,
      `${CURRENT_OFFERS}`,
      ["📦 Pack par classe", "📋 Catalogue", "📍 Adresse", "📞 Appeler"]
    );
    return;
  }

  const lowerText = text.toLowerCase().trim();

  // ===== باكجات الصفوف =====
  if (lowerText.includes("pack") || lowerText.includes("باكج") || lowerText.includes("مجموعة") || text === "📦 Pack par classe") {
    await sendMessageWithQuickReplies(senderId,
      "📦 Choisissez la classe / اختار السنة:",
      ["📦 Sنة 1", "📦 Sنة 2", "📦 Sنة 3", "📦 Sنة 4", "📦 Sنة 5", "📦 Sنة 6"]
    );
    return;
  }

  // كشف الصف تلقائياً → دائماً يبعث القائمة الكاملة
  const grade = detectGrade(text);
  if (grade) {
    customerInfo[senderId].lastGrade = grade;
    const pkg = formatPackage(grade, true);
    await sendMessage(senderId, pkg);
    await delay(600);
    await sendMessageWithQuickReplies(senderId,
      "تحب تطلب هذا الباكج؟ 😊",
      ["✅ نعم، نطلبه", "📦 باكج آخر", "📞 Appeler"]
    );
    return;
  }

  // طلب السعر أو التفصيل → يبعث القائمة الكاملة إذا عنده سنة محفوظة
  const wantsDetail = lowerText.includes("تفصيل") || lowerText.includes("détail") ||
    lowerText.includes("أدوات") || lowerText.includes("ادوات") ||
    lowerText.includes("فيه شنوة") || lowerText.includes("شنوة فيه") ||
    lowerText.includes("ممكن") || lowerText.includes("ثمن") ||
    lowerText.includes("بكم") || lowerText.includes("بكاش") ||
    lowerText.includes("combien") || lowerText.includes("prix") ||
    lowerText.includes("tarif") || text === "📋 أدوات السنة";

  if (wantsDetail && customerInfo[senderId]?.lastGrade) {
    const pkg = formatPackage(customerInfo[senderId].lastGrade, true);
    await sendMessage(senderId, pkg);
    await delay(600);
    await sendMessageWithQuickReplies(senderId, "تحب تطلب؟ 😊",
      ["✅ نعم، نطلبه", "📦 باكج آخر", "📞 Appeler"]
    );
    return;
  }

  // إذا سأل على الثمن بدون ما حدد سنة
  if (wantsDetail && !customerInfo[senderId]?.lastGrade) {
    await sendMessageWithQuickReplies(senderId,
      "📦 أي سنة تحب نعطيك الثمن ديالها؟",
      ["📦 Sنة 1", "📦 Sنة 2", "📦 Sنة 3", "📦 Sنة 4", "📦 Sنة 5", "📦 Sنة 6"]
    );
    return;
  }

  // تأكيد طلب الباكج
  if (text === "✅ نعم، نطلبه") {
    await sendMessage(senderId,
      `ممتاز! 🎉\nاتصل بنا نكملوا الطلبية:\n📞 ${PHONE_NUMBER}\nأو إجي للمكتبة: شارع البيئة، مقابل المعهد 🕐 8h-19h`
    );
    stats.totalOrders++;
    stats.todayOrders++;
    return;
  }

  // Catalogue
  if (lowerText.includes("catalogue") || lowerText.includes("produits") || lowerText.includes("قائمة") || text === "📋 Catalogue") {
    await sendMessage(senderId,
`📋 Nos produits:
📒 Cahiers: مسطر/كوس 1.5DT | رسم/موسيقى 2DT
✏️ Stylos: حبر 0.8DT | رصاص 0.5DT | ألوان×12 4.5DT
📐 Géométrie: مسطرة 1DT | طقم 5DT
🎒 Autres: محفظة 3DT | غراء 1.2DT | مقص 2DT | حقيبة 25DT`
    );
    await delay(400);
    await sendMessageWithQuickReplies(senderId, "Que souhaitez-vous? 😊",
      ["📦 Pack par classe", "🎉 Promos", "📞 Appeler"]
    );
    return;
  }

  // العروض
  if (lowerText.includes("promo") || lowerText.includes("عروض") || lowerText.includes("réduction") || text === "🎉 Promos") {
    await sendMessage(senderId, CURRENT_OFFERS);
    await delay(400);
    await sendMessageWithQuickReplies(senderId, "Vous souhaitez commander? 😊",
      ["📦 Pack par classe", "📋 Catalogue", "📞 Appeler"]
    );
    return;
  }

  // العنوان
  if (lowerText.includes("adresse") || lowerText.includes("où") || lowerText.includes("فين") || lowerText.includes("عنوان") || text === "📍 Adresse") {
    await sendMessage(senderId,
      `📍 Rue de l'Environnement, en face du lycée Menzel Kamel\n🗺️ https://maps.app.goo.gl/3N9tuVpED4GxcpWz9\n🕐 8h - 19h`
    );
    return;
  }

  // اتصل
  if (lowerText.includes("appel") || lowerText.includes("téléphone") || lowerText.includes("تليفون") || text === "📞 Appeler") {
    await sendMessage(senderId, `📞 ${PHONE_NUMBER}\n🕐 8h - 19h, tous les jours`);
    return;
  }

  // تقييم
  if (awaitingRating[senderId]) {
    awaitingRating[senderId] = false;
    if (["⭐⭐⭐⭐⭐", "⭐⭐⭐⭐", "⭐⭐⭐"].includes(text)) {
      await sendMessage(senderId, `Merci pour votre ${text}! À bientôt à la Librairie Mayar 📚🙏`);
    }
    return;
  }

  // Groq
  const reply = await getGroqResponse(senderId, text);
  await sendMessage(senderId, reply);

  if (conversations[senderId].length % 4 === 0) {
    await delay(400);
    await sendMessageWithQuickReplies(senderId, "Autre chose? 😊",
      ["📦 Pack par classe", "📋 Catalogue", "📍 Adresse", "📞 Appeler"]
    );
  }

  if (conversations[senderId].length === 16) {
    await delay(2000);
    awaitingRating[senderId] = true;
    await sendMessageWithQuickReplies(senderId,
      `${customerInfo[senderId]?.name || ''} comment évaluez-vous votre expérience? 😊`,
      ["⭐⭐⭐⭐⭐", "⭐⭐⭐⭐", "⭐⭐⭐"]
    );
  }
}

async function sendMessageWithQuickReplies(recipientId, text, replies) {
  // Messenger يقبل max 13 حرف في عنوان الزر
  const trimmedReplies = replies.map(q => q.substring(0, 20));
  await axios.post(
    `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    {
      recipient: { id: recipientId },
      message: {
        text,
        quick_replies: trimmedReplies.map(q => ({
          content_type: "text", title: q, payload: q,
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
  console.log(`📦 باكجات: السنة 1 → 6`);
  console.log(`📊 Stats: http://localhost:${PORT}/stats`);
});
