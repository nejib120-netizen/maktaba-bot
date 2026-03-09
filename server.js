/**
 * 📚 بوت مكتبة ميار - Facebook Messenger + Groq AI
 * ميزات: بيع كامل، باكجات 1-6، ترحيب، عروض، تقييم، إحصاء
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
      "3 كتب مدرسية", "3 غلاف كتب", "2 كراس 12", "4 كراس 24", "2 كراس 48",
      "1 كراس محفوظات", "1 كراس موسيقى", "1 كراس تصوير حجم صغير",
      "12 غلاف كراس", "12 اقلام جافة", "12 أقلام لبدية",
      "1 كراس ايقاظ حجم صغير", "1 اوراق تصوير + اوراق ملونة",
      "12 اقلام زينة 12/18", "12 اقلام شمعية",
      "1 قلم رصاص + ممحاة + مبراة", "1 مسطرة + كوس", "1 لصق + مقص",
      "6 الوان مائية", "1 لوحة + قلم + طلاسة", "1 معداد",
      "6 صلصال", "1 اقراص و اعواد + نقود مزيفة", "1 كنش",
    ],
    total: 110,
  },
  "2": {
    nameFR: "2ème année primaire",
    nameAR: "السنة الثانية ابتدائي",
    items: [
      "3 كتب مدرسية", "3 غلاف كتب", "3 كراس 12", "4 كراس 24", "2 كراس 48",
      "1 كراس محفوظات", "1 كراس موسيقى", "1 كراس تصوير حجم صغير",
      "12 غلاف كراس", "12 اقلام جافة", "12 أقلام لبدية",
      "1 اوراق تصوير + اوراق ملونة", "12 اقلام زينة 12/18", "12 اقلام شمعية",
      "1 قلم رصاص + ممحاة + مبراة", "1 مسطرة + كوس", "1 لصق + مقص",
      "6 الوان مائية", "1 معداد", "6 صلصال", "1 كنش",
    ],
    total: 120,
  },
  "3": {
    nameFR: "3ème année primaire",
    nameAR: "السنة الثالثة ابتدائي",
    items: [
      "4 كتب مدرسية", "4 غلاف كتب", "4 كراس 24", "3 كراس 48",
      "1 كراس محفوظات", "1 كراس موسيقى", "1 كراس رسم",
      "12 غلاف كراس", "12 اقلام جافة", "12 أقلام لبدية",
      "1 اوراق تصوير + اوراق ملونة", "12 اقلام زينة 12/18", "12 اقلام شمعية",
      "1 قلم رصاص + ممحاة + مبراة",
      "1 طقم هندسة (مسطرة + كوس + منقلة + مثلث)",
      "1 لصق + مقص", "6 الوان مائية", "1 كنش",
    ],
    total: 135,
  },
  "4": {
    nameFR: "4ème année primaire",
    nameAR: "السنة الرابعة ابتدائي",
    items: [
      "5 كتب مدرسية", "5 غلاف كتب", "4 كراس 24", "4 كراس 48",
      "1 كراس محفوظات", "1 كراس موسيقى", "1 كراس رسم",
      "12 غلاف كراس", "12 اقلام جافة", "12 أقلام لبدية",
      "12 اقلام زينة 12/18", "1 قلم رصاص + ممحاة + مبراة",
      "1 طقم هندسة كامل", "1 لصق + مقص",
      "6 الوان مائية", "1 كلاسور + بوشات", "1 كنش",
    ],
    total: 145,
  },
  "5": {
    nameFR: "5ème année primaire",
    nameAR: "السنة الخامسة ابتدائي",
    items: [
      "6 كتب مدرسية", "6 غلاف كتب", "5 كراس 24", "4 كراس 48",
      "1 كراس محفوظات", "1 كراس موسيقى", "1 كراس رسم",
      "12 غلاف كراس", "12 اقلام جافة", "12 أقلام لبدية",
      "12 اقلام زينة 12/18", "1 قلم رصاص + ممحاة + مبراة",
      "1 طقم هندسة كامل", "1 لصق + مقص",
      "6 الوان مائية", "1 كلاسور كبير + بوشات", "1 كنش",
    ],
    total: 155,
  },
  "6": {
    nameFR: "6ème année primaire",
    nameAR: "السنة السادسة ابتدائي",
    items: [
      "7 كتب مدرسية", "7 غلاف كتب", "5 كراس 24", "5 كراس 48",
      "1 كراس محفوظات", "1 كراس موسيقى", "1 كراس رسم",
      "12 غلاف كراس", "12 اقلام جافة", "12 أقلام لبدية",
      "12 اقلام زينة 12/18", "1 قلم رصاص + ممحاة + مبراة",
      "1 طقم هندسة كامل", "1 لصق + مقص",
      "6 الوان مائية", "1 كلاسور كبير + بوشات", "1 كنش",
    ],
    total: 165,
    note: "🏆 Pack spécial concours national!"
  },
};

function formatPackage(grade) {
  const pkg = GRADE_PACKAGES[grade];
  if (!pkg) return null;
  let text = `📦 ${pkg.nameAR}:\n\n`;
  pkg.items.forEach(item => { text += `• ${item}\n`; });
  text += `\n💰 Prix total: ${pkg.total} DT`;
  if (pkg.note) text += `\n${pkg.note}`;
  return text;
}

const CURRENT_OFFERS = `🎉 Promotions Mayar:
• Cahiers dessin -20%
• Crayons couleur -15%
• 5 cahiers achetés = le 6ème offert!`;

const SYSTEM_PROMPT = `Tu es le vendeur expert de la Librairie Mayar à Menzel Kamel.
TON RÔLE: VENDRE, pas juste présenter. Conclure la vente dans Messenger.

🌐 LANGUE - RÈGLE ABSOLUE:
- Message en français → réponds UNIQUEMENT en français
- Message en arabe/dialecte tunisien → réponds UNIQUEMENT en dialecte tunisien
- Exemples dialecte tunisien:
  * "شنوة" | "بكاش" | "نجم" | "باهي" | "واش" | "برشة" | "يزي" | "نحب" | "حاجة"

✂️ LONGUEUR: Maximum 3 lignes. Pas de répétition.

🚫 INTERDIT:
- Dire "غالي" ou "cher"
- Envoyer vers téléphone pour conclure la vente
- Inventer les prix des packs (le bot les envoie automatiquement)
- Mélanger arabe et français

✅ OBJECTIF VENTE:
- Quand client intéressé → guide vers commande directe
- Pose UNE question pour avancer la vente
- "تحب تطلب الباكج؟" → si oui → bot demande nom et adresse
- Prix toujours "ممتاز" / "très abordable"

📍 Rue de l'Environnement, en face du lycée Menzel Kamel
🗺️ https://maps.app.goo.gl/3N9tuVpED4GxcpWz9
🕐 8h-19h | 📞 ${PHONE_NUMBER} | Livraison: 2DT`;

const conversations = {};
const awaitingRating = {};
const newUsers = new Set();
const customerInfo = {};

// مراحل البيع
const ORDER_STEPS = {};
// step: null | 'ask_name' | 'ask_address' | 'confirm' | 'done'

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
    if (err.response?.status === 429) return "Service occupé 🙏 Réessayez dans un moment.";
    return `Erreur technique. Appelez-nous: ${PHONE_NUMBER}`;
  }
}

function detectGrade(text) {
  const t = text.toLowerCase();
  if (t.includes("1") && (t.includes("سنة") || t.includes("nة") || t.includes("1ère") || t.includes("première") || t.includes("اول") || t.includes("الأولى"))) return "1";
  if (t.includes("2") && (t.includes("سنة") || t.includes("nة") || t.includes("2ème") || t.includes("deuxième") || t.includes("ثاني") || t.includes("الثانية"))) return "2";
  if (t.includes("3") && (t.includes("سنة") || t.includes("nة") || t.includes("3ème") || t.includes("troisième") || t.includes("ثالث") || t.includes("الثالثة"))) return "3";
  if (t.includes("4") && (t.includes("سنة") || t.includes("nة") || t.includes("4ème") || t.includes("quatrième") || t.includes("رابع") || t.includes("الرابعة"))) return "4";
  if (t.includes("5") && (t.includes("سنة") || t.includes("nة") || t.includes("5ème") || t.includes("cinquième") || t.includes("خامس") || t.includes("الخامسة"))) return "5";
  if (t.includes("6") && (t.includes("سنة") || t.includes("nة") || t.includes("6ème") || t.includes("sixième") || t.includes("سادس") || t.includes("السادسة"))) return "6";
  return null;
}

// ===== كشف طلبيات متعددة =====
function detectMultipleOrders(text) {
  const orders = [];
  // نمط: رقم + سنة + رقم
  // مثال: "2 سنة 3 و 4 سنة 5" أو "باكجين سنة 3 و 3 سنة 6"
  const patterns = [
    /(\d+)\s*(?:باكج|pack|نسخ|قطع)?\s*(?:سنة|année|nة)\s*(\d)/gi,
    /(\d+)\s*x\s*(?:سنة|année|nة)\s*(\d)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const qty = parseInt(match[1]);
      const grade = match[2];
      if (GRADE_PACKAGES[grade] && qty > 0 && qty <= 20) {
        orders.push({ qty, grade });
      }
    }
  }

  // إذا ما لقاش نمط متعدد، جرب نمط بسيط
  if (orders.length === 0) {
    const simple = /(?:سنة|année|nة)\s*(\d)/gi;
    let match;
    while ((match = simple.exec(text)) !== null) {
      const grade = match[1];
      if (GRADE_PACKAGES[grade]) {
        orders.push({ qty: 1, grade });
      }
    }
  }

  return orders;
}

function calculateTotal(orders) {
  let subtotal = 0;
  let lines = "";
  orders.forEach(({ qty, grade }) => {
    const pkg = GRADE_PACKAGES[grade];
    if (pkg) {
      const lineTotal = qty * pkg.total;
      subtotal += lineTotal;
      lines += `• ${qty} × ${pkg.nameAR}: ${qty} × ${pkg.total} = ${lineTotal} DT\n`;
    }
  });
  return { subtotal, lines };
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
  const orders = Object.entries(customerInfo)
    .filter(([, info]) => info.orderConfirmed)
    .map(([id, info]) => ({
      id,
      name: info.orderName,
      address: info.orderAddress,
      grade: info.lastGrade,
      total: info.lastGrade ? GRADE_PACKAGES[info.lastGrade]?.total : '?',
      time: info.orderTime,
    }));
  res.json(orders);
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

  if (!customerInfo[senderId]) customerInfo[senderId] = {};
  if (!ORDER_STEPS[senderId]) ORDER_STEPS[senderId] = null;

  // ===== ترحيب =====
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
    await sendMessageWithQuickReplies(senderId, CURRENT_OFFERS,
      ["📦 Pack par classe", "🎉 Promos", "📍 Adresse", "📞 Appeler"]
    );
    return;
  }

  const lowerText = text.toLowerCase().trim();

  // ===== سيرورة البيع =====

  // المرحلة 1: طلب الاسم
  if (ORDER_STEPS[senderId] === 'ask_name') {
    customerInfo[senderId].orderName = text;
    ORDER_STEPS[senderId] = 'ask_address';
    await sendMessage(senderId, `شكراً ${text}! 😊\nاكتب عنوانك الكامل باش نوصلوا ليك 📍`);
    return;
  }

  // المرحلة 2: طلب العنوان
  if (ORDER_STEPS[senderId] === 'ask_address') {
    customerInfo[senderId].orderAddress = text;
    ORDER_STEPS[senderId] = 'confirm';

    const pendingOrders = customerInfo[senderId].pendingOrders;
    let orderSummary = "";
    let subtotal = 0;

    if (pendingOrders && pendingOrders.length > 1) {
      // طلبيات متعددة
      const { subtotal: st, lines } = calculateTotal(pendingOrders);
      subtotal = st;
      orderSummary = lines;
    } else {
      // طلبية واحدة
      const pkg = GRADE_PACKAGES[customerInfo[senderId].lastGrade];
      subtotal = pkg ? pkg.total : 0;
      orderSummary = `📦 ${pkg?.nameAR || 'باكج'}: ${subtotal} DT\n`;
    }

    const total = subtotal + 2;
    await sendMessage(senderId,
      `✅ تأكيد الطلبية:\n👤 ${customerInfo[senderId].orderName}\n📍 ${text}\n\n${orderSummary}\n🚚 توصيل: 2 DT\n💰 المجموع: ${total} DT\n💵 الدفع عند الاستلام`
    );
    await delay(600);
    await sendMessageWithQuickReplies(senderId, "واش تؤكد الطلبية؟ 😊",
      ["✅ نعم، أؤكد!", "❌ إلغاء"]
    );
    return;
  }

  // المرحلة 3: تأكيد نهائي
  if (ORDER_STEPS[senderId] === 'confirm') {
    if (text === "✅ نعم، أؤكد!") {
      customerInfo[senderId].orderConfirmed = true;
      customerInfo[senderId].orderTime = new Date().toLocaleString('fr-TN');
      ORDER_STEPS[senderId] = 'done';
      stats.totalOrders++;
      stats.todayOrders++;
      console.log(`🛒 طلبية جديدة: ${customerInfo[senderId].orderName} - ${customerInfo[senderId].orderAddress}`);
      await sendMessage(senderId,
        `🎉 طلبيتك مسجّلة!\nسنتصل بيك قريباً على Facebook للتأكيد.\nشكراً على ثقتك في مكتبة ميار! 📚🙏`
      );
      await delay(1000);
      awaitingRating[senderId] = true;
      await sendMessageWithQuickReplies(senderId, "كيفاش تقيّم تجربتك؟ 😊",
        ["⭐⭐⭐⭐⭐", "⭐⭐⭐⭐", "⭐⭐⭐"]
      );
    } else {
      ORDER_STEPS[senderId] = null;
      await sendMessage(senderId, "باهي، تلغينا الطلبية. إذا بديت نعاونك! 😊");
    }
    return;
  }

  // ===== تقييم =====
  if (awaitingRating[senderId]) {
    awaitingRating[senderId] = false;
    if (["⭐⭐⭐⭐⭐", "⭐⭐⭐⭐", "⭐⭐⭐"].includes(text)) {
      await sendMessage(senderId, `Merci pour votre ${text}! À bientôt à la Librairie Mayar 📚🙏`);
    }
    return;
  }

  // ===== باكجات =====
  if (lowerText.includes("pack") || lowerText.includes("باكج") || lowerText.includes("مجموعة") || text === "📦 Pack par classe") {
    await sendMessageWithQuickReplies(senderId,
      "📦 اختار السنة / Choisissez la classe:",
      ["📦 Sسنة 1", "📦 Sسنة 2", "📦 Sسنة 3", "📦 Sسنة 4", "📦 Sسنة 5", "📦 Sسنة 6"]
    );
    return;
  }

  // كشف السنة مع كميات ذكية
  const multiOrders = detectMultipleOrders(text);
  if (multiOrders.length > 0) {
    ORDER_STEPS[senderId] = null;

    if (multiOrders.length === 1 && multiOrders[0].qty === 1) {
      // باكج واحد عادي
      const grade = multiOrders[0].grade;
      customerInfo[senderId].lastGrade = grade;
      customerInfo[senderId].pendingOrders = multiOrders;
      const pkg = formatPackage(grade);
      await sendMessage(senderId, pkg);
      await delay(600);
      await sendMessageWithQuickReplies(senderId,
        "تحب تطلب هذا الباكج مع توصيل؟ 🚚",
        ["✅ نعم، نطلبه!", "📦 باكج آخر", "📞 Appeler"]
      );
    } else {
      // باكجات متعددة → حساب تلقائي
      customerInfo[senderId].pendingOrders = multiOrders;
      customerInfo[senderId].lastGrade = multiOrders[0].grade;
      const { subtotal, lines } = calculateTotal(multiOrders);
      const delivery = 2;
      const total = subtotal + delivery;

      let msg = "🧮 حساب طلبيتك:\n\n";
      msg += lines;
      msg += `\n🚚 توصيل: ${delivery} DT`;
      msg += `\n💰 المجموع الكامل: ${total} DT`;
      msg += `\n💵 الدفع عند الاستلام`;

      await sendMessage(senderId, msg);
      await delay(600);
      await sendMessageWithQuickReplies(senderId,
        "تحب تطلب كل هذي الباكجات؟ 🎉",
        ["✅ نعم، نطلبهم!", "📦 باكج آخر", "📞 Appeler"]
      );
    }
    return;
  }

  // زر تأكيد الطلب → يبدأ سيرورة البيع
  if (text === "✅ نعم، نطلبه!" || text === "✅ نعم، نطلبه" || text === "✅ نعم، نطلبهم!") {
    if (!customerInfo[senderId].lastGrade) {
      await sendMessageWithQuickReplies(senderId, "أي سنة تحب تطلب؟",
        ["📦 Sنة 1", "📦 Sنة 2", "📦 Sنة 3", "📦 Sنة 4", "📦 Sنة 5", "📦 Sنة 6"]
      );
      return;
    }
    ORDER_STEPS[senderId] = 'ask_name';
    await sendMessage(senderId, "ممتاز! 🎉\nاكتب اسمك الكامل باش نسجلو الطلبية:");
    return;
  }

  // طلب السعر بدون سنة
  const wantsPrice = lowerText.includes("ثمن") || lowerText.includes("بكاش") || 
    lowerText.includes("prix") || lowerText.includes("combien") || lowerText.includes("tarif");
  if (wantsPrice && !customerInfo[senderId].lastGrade) {
    await sendMessageWithQuickReplies(senderId, "أي سنة تحب نعطيك الثمن؟",
      ["📦 Sنة 1", "📦 Sنة 2", "📦 Sنة 3", "📦 Sنة 4", "📦 Sنة 5", "📦 Sنة 6"]
    );
    return;
  }
  if (wantsPrice && customerInfo[senderId].lastGrade) {
    const pkg = formatPackage(customerInfo[senderId].lastGrade);
    await sendMessage(senderId, pkg);
    await delay(500);
    await sendMessageWithQuickReplies(senderId, "تحب تطلب؟ 🚚",
      ["✅ نعم، نطلبه!", "📦 باكج آخر", "📞 Appeler"]
    );
    return;
  }



  // العروض
  if (lowerText.includes("promo") || lowerText.includes("عروض") || lowerText.includes("réduction") || text === "🎉 Promos") {
    await sendMessage(senderId, CURRENT_OFFERS);
    await delay(400);
    await sendMessageWithQuickReplies(senderId, "Vous souhaitez commander? 😊",
      ["📦 Pack par classe", "🎉 Promos", "📞 Appeler"]
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

  // Groq للأسئلة الأخرى
  const reply = await getGroqResponse(senderId, text);
  await sendMessage(senderId, reply);

  if (conversations[senderId].length % 4 === 0) {
    await delay(400);
    await sendMessageWithQuickReplies(senderId, "Autre chose? 😊",
      ["📦 Pack par classe", "🎉 Promos", "📍 Adresse", "📞 Appeler"]
    );
  }
}

async function sendMessageWithQuickReplies(recipientId, text, replies) {
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
  console.log(`🛒 Orders: http://localhost:${PORT}/orders`);
});
