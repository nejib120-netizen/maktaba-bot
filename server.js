/**
 * 📚 بوت مكتبة ميار - Facebook Messenger + Groq AI
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

const CURRENT_OFFERS = `🎉 Promotions Mayar:
• Cahiers dessin -20%
• Crayons couleur -15%
• 5 cahiers achetés = le 6ème offert!`;

const SYSTEM_PROMPT = `Tu es le vendeur de la Librairie Mayar à Menzel Kamel.

🌐 LANGUE - RÈGLE ABSOLUE:
- Message en français → réponds UNIQUEMENT en français
- Message en arabe/dialecte → réponds UNIQUEMENT en dialecte tunisien
- Exemples de dialecte tunisien OBLIGATOIRES:
  * "شنوة" (pas "إيه" أو "ماذا")
  * "بكاش" (pas "بكام")  
  * "نجم" (pas "أقدر" أو "أعرف")
  * "باهي" (pas "تمام" أو "أوكي")
  * "يزي" (pas "كفاية")
  * "واش" (pas "هل")
  * "حبيت" (pas "أردت")
  * "برشة" (pas "كثير")
  * "نحب نشري" (pas "أريد أن أشتري")
- Ne mélange JAMAIS les deux langues dans le même message

✂️ LONGUEUR - RÈGLE ABSOLUE:
- Maximum 3 lignes par réponse
- Ne répète jamais la même information deux fois
- Une seule question à la fois
- Pas de listes longues sauf si demandé explicitement

🚫 INTERDIT:
- Répéter "Librairie Mayar" plus d'une fois par message
- Dire "غالي" ou "cher"
- Répéter ce qui a déjà été dit dans la conversation

✅ STYLE:
- Direct, chaleureux, professionnel
- Encourage l'achat naturellement
- Prix toujours "excellent" et "abordable"

💰 PRIX:
Cahiers: mسطر/كوس 1.500DT | رسم/موسيقى 2.000DT
Stylos: حبر 0.800DT | رصاص 0.500DT | ألوان 12 4.500DT | فلوماستر 6.000DT
Géométrie: مسطرة 1.000DT | طقم 5.000DT
Autres: محفظة 3.000DT | غراء 1.200DT | مقص 2.000DT | حقيبة 25.000DT

📍 ADRESSE: Rue de l'Environnement, en face du lycée Menzel Kamel
🗺️ Maps: https://maps.app.goo.gl/3N9tuVpED4GxcpWz9
🕐 Horaires: 8h-19h | 📞 29464720 | Livraison: 2.000DT`;

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
    console.error("❌ خطأ في Groq:", err.response?.data || err.message);
    if (err.response?.status === 429) return "Service occupé, réessayez dans un moment 🙏";
    return `Désolé, erreur technique. Appelez-nous: ${PHONE_NUMBER}`;
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
    await sendMessageWithQuickReplies(senderId, CURRENT_OFFERS,
      ["🛒 Commander", "📋 Catalogue", "📍 Adresse", "📞 Appeler"]
    );
    return;
  }

  const lowerText = text.toLowerCase().trim();

  // Catalogue
  if (lowerText.includes("catalogue") || lowerText.includes("produits") || lowerText.includes("قائمة") || text === "📋 Catalogue") {
    await sendMessage(senderId,
`📋 Nos produits:
📒 Cahiers: mسطر/كوس 1.5DT | رسم/موسيقى 2DT
✏️ Stylos: حبر 0.8DT | رصاص 0.5DT | ألوان×12 4.5DT
📐 Géométrie: مسطرة 1DT | طقم 5DT
🎒 Autres: محفظة 3DT | غراء 1.2DT | مقص 2DT | حقيبة 25DT`
    );
    await delay(400);
    await sendMessageWithQuickReplies(senderId, "Que souhaitez-vous? 😊",
      ["🛒 Commander", "🎉 Promos", "📞 Appeler"]
    );
    return;
  }

  // العروض
  if (lowerText.includes("promo") || lowerText.includes("عروض") || lowerText.includes("réduction") || text === "🎉 Promos") {
    await sendMessage(senderId, CURRENT_OFFERS);
    await delay(400);
    await sendMessageWithQuickReplies(senderId, "Vous souhaitez en profiter? 😊",
      ["🛒 Commander", "📋 Catalogue", "📞 Appeler"]
    );
    return;
  }

  // العنوان
  if (lowerText.includes("adresse") || lowerText.includes("où") || lowerText.includes("فين") || text === "📍 Adresse") {
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

  // تأكيد طلبية
  if (text === "✅ Confirmer" || lowerText.includes("confirmer") || lowerText.includes("أكد")) {
    if (customerCarts[senderId].length === 0) {
      await sendMessage(senderId, "Votre panier est vide! Choisissez des produits d'abord 😊");
      return;
    }
    let total = 0;
    let cartText = "✅ Votre commande:\n";
    customerCarts[senderId].forEach((item, i) => {
      cartText += `${i+1}. ${item.name} ×${item.qty} = ${(item.price*item.qty).toFixed(3)}DT\n`;
      total += item.price * item.qty;
    });
    cartText += `\n💰 Total: ${total.toFixed(3)}DT + livraison 2DT`;
    await sendMessage(senderId, cartText);
    await delay(400);
    await sendMessageWithQuickReplies(senderId, "Mode de réception?",
      ["🚚 Livraison", "🏪 Retrait en magasin"]
    );
    stats.totalOrders++;
    stats.todayOrders++;
    return;
  }

  // توصيل
  if (text === "🚚 Livraison") {
    customerInfo[senderId].delivery = true;
    await sendMessage(senderId, "🚚 Parfait! Donnez-nous votre adresse complète:");
    return;
  }

  // استلام من المحل
  if (text === "🏪 Retrait en magasin") {
    customerInfo[senderId].delivery = false;
    await sendMessage(senderId,
      `🏪 Votre commande est prête!\n📍 Rue de l'Environnement, en face du lycée\n🕐 8h-19h\nMerci ${customerInfo[senderId]?.name || ''}! 🙏`
    );
    customerCarts[senderId] = [];
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

  // أزرار كل 4 ردود
  if (conversations[senderId].length % 4 === 0) {
    await delay(400);
    await sendMessageWithQuickReplies(senderId, "Autre chose? 😊",
      ["🛒 Commander", "📋 Catalogue", "📍 Adresse", "📞 Appeler"]
    );
  }

  // تقييم بعد 16 رسالة
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
  await axios.post(
    `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    {
      recipient: { id: recipientId },
      message: {
        text,
        quick_replies: replies.map(q => ({
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
});
