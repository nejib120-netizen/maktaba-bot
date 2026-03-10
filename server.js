/**
 * 📚 بوت مكتبة ميار - Facebook Messenger + Comments + Groq AI
 */

const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());
app.use(express.static('.'));

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "maktaba_secret_2024";
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const PAGE_ID = process.env.PAGE_ID || "507054946388416";
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

const BACK_TO_SCHOOL = `🎒 الدخول المدرسي قرب! 📚
باكجاتنا جاهزة لكل السنوات من 1 إلى 6
✅ كل شي في باكج واحد بثمن ممتاز
🚚 توصيل داخل منزل كامل بـ 2 DT فقط
⏰ احجز باكجك قبل ما ينفد المخزون!`;

const SERVICES = `🛠️ خدماتنا / Nos Services:
✅ نسخ وثائق
✅ بحوث مدرسية
✅ ترسيم تلاميذ وطلاب
✅ معالجة النصوص
✅ حجز الفحص الفني للكرهبة
✅ سيرة ذاتية احترافية

📞 للمزيد اتصل: 29464720
🕐 8h - 19h`;

const BACK_TO_SCHOOL_MSG = `🎒 الدخول المدرسي قريب!
لا تستنى الضغطة الأخيرة 😅
✅ باكجات جاهزة من السنة 1 إلى 6
✅ توصيل لباب الدار
✅ الدفع عند الاستلام
احجز باكاجك دبا قبل ما ينقص! 📚`;

const IMAGES = {
  welcome: "https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?w=800",
  packs: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800",
  services: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800",
  promos: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800",
};

// ===== ردود التعليقات =====
const COMMENT_REPLIES = {
  price: {
    keywords: ["بكاش", "ثمن", "prix", "combien", "بكم", "غالي", "رخيص"],
    reply: "مرحباً! 😊 الأسعار ممتازة 💚\n👉 راسلنا على Messenger نعطيك كل الباكجات بالأسعار الكاملة!"
  },
  packs: {
    keywords: ["باكج", "pack", "أدوات", "قائمة", "ابتدائي"],
    reply: "عندنا باكجات جاهزة لكل السنوات من 1 إلى 6 📦✨\n👉 راسلنا على Messenger وابعثلنا السنة — نبعثوا القائمة فوراً!"
  },
  services: {
    keywords: ["نسخ", "بحث", "سيرة", "ترسيم", "فحص", "خدمات", "service"],
    reply: "نعم نوفر هذه الخدمة! ✅\n👉 راسلنا على Messenger للمزيد من التفاصيل 😊"
  },
  delivery: {
    keywords: ["توصيل", "livraison", "يوصل", "delivery"],
    reply: "نعم نوصّلو داخل منزل كامل بـ 2 DT فقط! 🚚✨\n👉 راسلنا على Messenger لتسجيل طلبيتك"
  },
  positive: {
    keywords: ["برشة", "ممتاز", "بارك", "شكرا", "merci", "super", "مزيان", "زوين", "باهي"],
    reply: "شكراً جزيلاً على كلامك الطيب! 🙏❤️\nيسعدنا خدمتك دائماً في مكتبة ميار 📚"
  },
  info: {
    keywords: ["فين", "عنوان", "ساعة", "أوقات", "adresse", "horaire", "وقتاش"],
    reply: "📍 شارع البيئة، مقابل معهد منزل كامل\n🕐 8h - 19h كل الأيام\n👉 راسلنا على Messenger لأي معلومة!"
  },
  default: {
    reply: "مرحباً! 😊 شكراً على تعليقك ❤️\n👉 راسلنا على Messenger وسنجيب على كل أسئلتك فوراً! 📚✨"
  }
};

function detectCommentType(text) {
  if (!text) return 'default';
  const lower = text.toLowerCase();
  for (const [type, data] of Object.entries(COMMENT_REPLIES)) {
    if (type === 'default') continue;
    if (data.keywords && data.keywords.some(k => lower.includes(k))) return type;
  }
  return 'default';
}

async function replyToComment(commentId, message) {
  try {
    const result = await axios.post(
      `https://graph.facebook.com/v18.0/${commentId}/comments`,
      { message },
      { params: { access_token: PAGE_ACCESS_TOKEN } }
    );
    console.log(`✅ رد على تعليق: ${commentId}`, result.data);
  } catch (e) {
    console.error("❌ خطأ في الرد على التعليق:", e.response?.data || e.message);
  }
}

async function likeComment(commentId) {
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/${commentId}/likes`,
      {},
      { params: { access_token: PAGE_ACCESS_TOKEN } }
    );
    console.log(`👍 لايك: ${commentId}`);
  } catch (e) {
    console.error("❌ خطأ في اللايك:", e.response?.data || e.message);
  }
}

async function handleComment(data) {
  console.log('🔍 handleComment called with:', JSON.stringify(data));
  
  // تجاهل تعليقات الصفحة نفسها
  if (data.from && data.from.id === PAGE_ID) {
    console.log('⏭️ تعليق من الصفحة نفسها - تجاهل');
    return;
  }

  const commentId = data.comment_id;
  const text = data.message || "";
  const userName = (data.from?.name || "").split(' ')[0] || "صديقنا";

  console.log(`💬 تعليق من ${userName}: "${text}"`);
  console.log(`💬 Comment ID: ${commentId}`);

  // لايك
  await likeComment(commentId);
  await delay(1000);

  // رد ذكي
  const type = detectCommentType(text);
  const replyText = `${userName}، ${COMMENT_REPLIES[type].reply}`;
  console.log(`📤 الرد: ${replyText}`);
  await replyToComment(commentId, replyText);
}

const SYSTEM_PROMPT = `Tu es le vendeur expert de la Librairie Mayar à Menzel Kamel.
TON RÔLE: VENDRE, pas juste présenter. Conclure la vente dans Messenger.

🌐 LANGUE - RÈGLE ABSOLUE:
- Message en français → réponds UNIQUEMENT en français
- Message en arabe/dialecte tunisien → réponds UNIQUEMENT en dialecte tunisien

✂️ LONGUEUR: Maximum 3 lignes. Pas de répétition.

✅ OBJECTIF VENTE:
- Quand client intéressé → guide vers commande directe
- Pose UNE question pour avancer la vente

🌍 QUESTIONS HORS SUJET:
- Réponds brièvement puis ramène vers la librairie
📍 Rue de l'Environnement, en face du college  Menzel Kamel
🗺️ https://maps.app.goo.gl/usA74RUWUAcUUYwS7
🕐 8h-19h | 📞 ${PHONE_NUMBER} | Livraison: 2DT`;

const conversations = {};
const awaitingRating = {};
const newUsers = new Set();
const customerInfo = {};
const ORDER_STEPS = {};
const loyaltyPoints = {};
const POINTS_PER_ORDER = 10;
const reviews = [];
const previousOrders = {};

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
    return `Erreur technique. Appelez-nous: ${PHONE_NUMBER}`;
  }
}

function detectGrade(text) {
  const t = text.toLowerCase();
  if (t.includes("1") && (t.includes("سنة") || t.includes("1ère") || t.includes("première") || t.includes("اول") || t.includes("الأولى"))) return "1";
  if (t.includes("2") && (t.includes("سنة") || t.includes("2ème") || t.includes("deuxième") || t.includes("ثاني") || t.includes("الثانية"))) return "2";
  if (t.includes("3") && (t.includes("سنة") || t.includes("3ème") || t.includes("troisième") || t.includes("ثالث") || t.includes("الثالثة"))) return "3";
  if (t.includes("4") && (t.includes("سنة") || t.includes("4ème") || t.includes("quatrième") || t.includes("رابع") || t.includes("الرابعة"))) return "4";
  if (t.includes("5") && (t.includes("سنة") || t.includes("5ème") || t.includes("cinquième") || t.includes("خامس") || t.includes("الخامسة"))) return "5";
  if (t.includes("6") && (t.includes("سنة") || t.includes("6ème") || t.includes("sixième") || t.includes("سادس") || t.includes("السادسة"))) return "6";
  return null;
}

function detectMultipleOrders(text) {
  const orders = [];
  const t = text;
  const simple = /(?:سنة|année|pack)\s*(\d)/gi;
  let match;
  while ((match = simple.exec(t)) !== null) {
    const grade = match[1];
    if (GRADE_PACKAGES[grade] && !orders.find(o => o.grade === grade)) {
      orders.push({ qty: 1, grade });
    }
  }
  // Quick reply buttons
  const qrMatch = text.match(/[Ss]نة\s*(\d)/);
  if (qrMatch && GRADE_PACKAGES[qrMatch[1]] && !orders.find(o => o.grade === qrMatch[1])) {
    orders.push({ qty: 1, grade: qrMatch[1] });
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
      lines += `• ${qty} × ${pkg.nameAR}: ${lineTotal} DT\n`;
    }
  });
  return { subtotal, lines };
}

// ===== صفحة الحالة =====
app.get('/', (req, res) => {
  res.json({
    status: '✅ Bot is running',
    webhook: '/webhook',
    page_id: PAGE_ID || '❌ MISSING',
    has_token: PAGE_ACCESS_TOKEN ? '✅ Set' : '❌ MISSING',
    has_groq: GROQ_API_KEY ? '✅ Set' : '❌ MISSING',
    verify_token: VERIFY_TOKEN,
    features: ['Messenger', 'Comments Auto-Reply', 'Packs 1-6', 'Groq AI']
  });
});

// ===== اشتراك تلقائي =====
app.get('/subscribe', async (req, res) => {
  try {
    const result = await axios.post(
      `https://graph.facebook.com/v18.0/${PAGE_ID}/subscribed_apps`,
      {
        subscribed_fields: 'feed,messages,messaging_postbacks',
        access_token: PAGE_ACCESS_TOKEN
      }
    );
    console.log('✅ Subscription result:', result.data);
    res.json({ success: true, data: result.data });
  } catch (e) {
    console.error('❌ Subscription error:', e.response?.data);
    res.json({ success: false, error: e.response?.data });
  }
});

// ===== تجريب التعليقات =====
app.get('/test-comment', async (req, res) => {
  const testData = {
    from: { id: '123', name: 'Test User' },
    comment_id: 'test_123',
    message: 'بكاش الباكج؟',
    post_id: 'post_123'
  };
  const type = detectCommentType(testData.message);
  res.json({
    test_message: testData.message,
    detected_type: type,
    reply: COMMENT_REPLIES[type].reply,
    page_id: PAGE_ID,
    has_token: !!PAGE_ACCESS_TOKEN
  });
});

// ===== Webhook Verify =====
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  console.log('🔐 Webhook verification:', { mode, token, challenge: challenge?.substring(0, 20) });
  
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verified!');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Webhook verification failed!');
    res.sendStatus(403);
  }
});

// ===== Webhook POST =====
app.post('/webhook', async (req, res) => {
  const body = req.body;

  console.log('📥 ====== Webhook Received ======');
  console.log('📥 Object:', body.object);
  console.log('📥 Body:', JSON.stringify(body).substring(0, 1000));

  if (body.object !== 'page') return res.sendStatus(404);
  res.status(200).send('EVENT_RECEIVED');

  for (const entry of body.entry) {

    // ===== تعليقات =====
    if (entry.changes) {
      console.log('📢 Changes:', JSON.stringify(entry.changes));
      for (const change of entry.changes) {
        console.log('📢 Field:', change.field, '| Item:', change.value?.item);

        if (change.field === 'feed' && change.value?.item === 'comment') {
          console.log('💬 ===== تعليق جديد! =====');
          await handleComment(change.value);
        }
      }
    }

    // ===== رسائل Messenger =====
    if (entry.messaging) {
      for (const event of entry.messaging) {
        if (event.message && !event.message.is_echo) {
          await handleMessage(event);
        }
      }
    }
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

app.get('/reviews', (req, res) => {
  res.json({ total: reviews.length, reviews });
});

async function handleMessage(event) {
  const senderId = event.sender.id;
  const text = event.message?.text || event.message?.quick_reply?.payload;

  if (!text && event.message?.attachments) {
    const hasImage = event.message.attachments.some(a => a.type === 'image');
    if (hasImage) {
      if (!customerInfo[senderId]) customerInfo[senderId] = {};
      await sendMessage(senderId, "📸 شفت صورتك! دبا نحللوا القائمة...");
      await delay(1000);
      await sendMessageWithQuickReplies(senderId,
        "أي سنة ولدك/بنتك؟",
        ["📦 Sنة 1", "📦 Sنة 2", "📦 Sنة 3", "📦 Sنة 4", "📦 Sنة 5", "📦 Sنة 6"]
      );
    }
    return;
  }

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
    await sendImage(senderId, IMAGES.welcome);
    await delay(500);
    await sendMessage(senderId, `Bienvenue ${name} à la Librairie Mayar! 📚✨\n\n${BACK_TO_SCHOOL}`);
    await delay(800);
    await sendMessage(senderId, SERVICES);
    await delay(800);
    await sendMessageWithQuickReplies(senderId, CURRENT_OFFERS,
      ["📦 Pack par classe", "🛠️ Services", "📍 Adresse", "📞 Appeler"]
    );
    return;
  }

  const lowerText = text.toLowerCase().trim();

  // ===== سيرورة البيع =====
  if (ORDER_STEPS[senderId] === 'ask_name') {
    customerInfo[senderId].orderName = text;
    ORDER_STEPS[senderId] = 'ask_address';
    await sendMessage(senderId, `شكراً ${text}! 😊\nاكتب عنوانك الكامل باش نوصلوا ليك 📍`);
    return;
  }

  if (ORDER_STEPS[senderId] === 'ask_address') {
    customerInfo[senderId].orderAddress = text;
    ORDER_STEPS[senderId] = 'confirm';
    const pkg = GRADE_PACKAGES[customerInfo[senderId].lastGrade];
    const subtotal = pkg ? pkg.total : 0;
    const total = subtotal + 2;
    await sendMessage(senderId,
      `✅ تأكيد الطلبية:\n👤 ${customerInfo[senderId].orderName}\n📍 ${text}\n📦 ${pkg?.nameAR}: ${subtotal} DT\n🚚 توصيل: 2 DT\n💰 المجموع: ${total} DT\n💵 الدفع عند الاستلام`
    );
    await delay(600);
    await sendMessageWithQuickReplies(senderId, "واش تؤكد الطلبية؟ 😊",
      ["✅ نعم، أؤكد!", "❌ إلغاء"]
    );
    return;
  }

  if (ORDER_STEPS[senderId] === 'confirm') {
    if (text === "✅ نعم، أؤكد!") {
      customerInfo[senderId].orderConfirmed = true;
      customerInfo[senderId].orderTime = new Date().toLocaleString('fr-TN');
      ORDER_STEPS[senderId] = 'done';
      stats.totalOrders++;
      stats.todayOrders++;
      loyaltyPoints[senderId] = (loyaltyPoints[senderId] || 0) + POINTS_PER_ORDER;
      console.log(`🛒 طلبية: ${customerInfo[senderId].orderName} - ${customerInfo[senderId].orderAddress}`);
      await sendMessage(senderId,
        `🎉 طلبيتك مسجّلة!\nسنتصل بيك قريباً للتأكيد.\nشكراً على ثقتك في مكتبة ميار! 📚🙏`
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

  if (awaitingRating[senderId]) {
    awaitingRating[senderId] = false;
    if (["⭐⭐⭐⭐⭐", "⭐⭐⭐⭐", "⭐⭐⭐"].includes(text)) {
      reviews.push({
        name: customerInfo[senderId]?.orderName || 'زبون',
        rating: text,
        time: new Date().toLocaleString('fr-TN'),
      });
      await sendMessage(senderId, `Merci pour votre ${text}! À bientôt! 📚🙏`);
    }
    return;
  }

  // ===== باكجات =====
  if (lowerText.includes("pack") || lowerText.includes("باكج") || text === "📦 Pack par classe") {
    await sendImage(senderId, IMAGES.packs);
    await delay(400);
    await sendMessageWithQuickReplies(senderId,
      "📦 اختار السنة:",
      ["📦 Sنة 1", "📦 Sنة 2", "📦 Sنة 3", "📦 Sنة 4", "📦 Sنة 5", "📦 Sنة 6"]
    );
    return;
  }

  const multiOrders = detectMultipleOrders(text);
  if (multiOrders.length > 0) {
    const grade = multiOrders[0].grade;
    customerInfo[senderId].lastGrade = grade;
    const pkg = formatPackage(grade);
    await sendMessage(senderId, pkg);
    await delay(600);
    await sendMessageWithQuickReplies(senderId,
      "تحب تطلب هذا الباكج مع توصيل؟ 🚚",
      ["✅ نعم، نطلبه!", "📦 باكج آخر", "📞 Appeler"]
    );
    return;
  }

  if (text === "✅ نعم، نطلبه!" || lowerText === "نعم" || lowerText === "oui") {
    if (!customerInfo[senderId].lastGrade) {
      await sendMessageWithQuickReplies(senderId, "أي سنة تحب تطلب؟",
        ["📦 Sنة 1", "📦 Sنة 2", "📦 Sنة 3", "📦 Sنة 4", "📦 Sنة 5", "📦 Sنة 6"]
      );
      return;
    }
    ORDER_STEPS[senderId] = 'ask_name';
    await sendMessage(senderId, "ممتاز! 🎉\nاكتب اسمك الكامل:");
    return;
  }

  if (lowerText.includes("service") || lowerText.includes("خدم") || text === "🛠️ Services") {
    await sendMessage(senderId, SERVICES);
    return;
  }

  if (lowerText.includes("adresse") || lowerText.includes("فين") || text === "📍 Adresse") {
    await sendMessage(senderId, `📍 شارع البيئة، مقابل معهد منزل كامل\n🗺️ https://maps.app.goo.gl/3N9tuVpED4GxcpWz9\n🕐 8h - 19h`);
    return;
  }

  if (lowerText.includes("appel") || text === "📞 Appeler") {
    await sendMessage(senderId, `📞 ${PHONE_NUMBER}\n🕐 8h - 19h`);
    return;
  }

  // Groq AI
  const reply = await getGroqResponse(senderId, text);
  await sendMessage(senderId, reply);
}

async function sendImage(recipientId, imageUrl) {
  await axios.post(
    `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    {
      recipient: { id: recipientId },
      message: { attachment: { type: "image", payload: { url: imageUrl, is_reusable: true } } }
    }
  ).catch(e => console.error("Image error:", e.response?.data));
}

async function sendMessageWithQuickReplies(recipientId, text, replies) {
  await axios.post(
    `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    {
      recipient: { id: recipientId },
      message: {
        text,
        quick_replies: replies.map(q => ({
          content_type: "text", title: q.substring(0, 20), payload: q.substring(0, 20),
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

app.get('/dashboard', (req, res) => {
  res.sendFile(__dirname + '/dashboard.html');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 البوت يعمل على المنفذ ${PORT}`);
  console.log(`💬 التعليقات: مفعّلة`);
  console.log(`📦 باكجات: السنة 1 → 6`);
  console.log(`📊 PAGE_ID: ${PAGE_ID}`);
  console.log(`🔑 Token: ${PAGE_ACCESS_TOKEN ? '✅' : '❌'}`);
});
