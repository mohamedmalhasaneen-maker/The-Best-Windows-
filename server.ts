import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { BRAND_NAME, COMPANY_CONTACTS, COMPANY_LOCATIONS } from "./src/constants";

dotenv.config();

const QUOTES_FILE = path.join(process.cwd(), "saved_quotes.json");
const CUSTOMERS_FILE = path.join(process.cwd(), "saved_customers.json");

function readSavedQuotes(): any[] {
  try {
    if (fs.existsSync(QUOTES_FILE)) {
      const data = fs.readFileSync(QUOTES_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading saved quotes:", err);
  }
  return [];
}

function writeSavedQuotes(quotes: any[]) {
  try {
    fs.writeFileSync(QUOTES_FILE, JSON.stringify(quotes, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing saved quotes:", err);
  }
}

function readSavedCustomers(): any[] {
  try {
    if (fs.existsSync(CUSTOMERS_FILE)) {
      const data = fs.readFileSync(CUSTOMERS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading saved customers:", err);
  }
  return [];
}

function writeSavedCustomers(customers: any[]) {
  try {
    fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify(customers, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing saved customers:", err);
  }
}

function normalizePhone(phone: any): string {
  if (!phone) return "";
  const arabicDigits = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
  let cleaned = phone.toString().trim();
  for (let i = 0; i < 10; i++) {
    cleaned = cleaned.replaceAll(arabicDigits[i], i.toString());
  }
  let digits = cleaned.replace(/\D/g, "");
  if (digits.startsWith("0020")) {
    digits = digits.slice(4);
  } else if (digits.startsWith("20") && digits.length === 12) {
    digits = digits.slice(2);
  }
  if (digits.length === 10 && (digits.startsWith("10") || digits.startsWith("11") || digits.startsWith("12") || digits.startsWith("15"))) {
    digits = "0" + digits;
  }
  return digits;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Quotes API Endpoints
  app.get("/api/quotes", (req, res) => {
    const quotes = readSavedQuotes();
    res.json(quotes);
  });

  app.post("/api/quotes", (req, res) => {
    try {
      const newQuote = req.body;
      if (!newQuote || !newQuote.id || !newQuote.name) {
        return res.status(400).json({ error: "بيانات عرض السعر غير مكتملة" });
      }
      const quotes = readSavedQuotes();
      const filtered = quotes.filter((q: any) => q.id !== newQuote.id);
      const updated = [newQuote, ...filtered];
      writeSavedQuotes(updated);

      // Automatically sync customer name and phone to customers directory
      if (newQuote.customer && newQuote.customer.name && newQuote.customer.name.trim()) {
        try {
          const custName = newQuote.customer.name.trim();
          const rawPhone = (newQuote.customer.phone || '').trim();
          const cleanPhone = normalizePhone(rawPhone);
          const customerId = cleanPhone.length >= 7 
            ? `cust_${cleanPhone}` 
            : `cust_${Buffer.from(custName).toString('hex').slice(0, 16)}`;
          
          const customerRecord = {
            id: customerId,
            name: custName,
            phone: cleanPhone || rawPhone,
            address: (newQuote.customer.address || '').trim(),
            notes: '',
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
          };

          const customers = readSavedCustomers();
          const filteredCust = customers.filter((c: any) => {
            const cClean = normalizePhone(c.phone);
            const samePhone = cleanPhone.length >= 7 && cClean.length >= 7 && cleanPhone === cClean;
            const sameId = c.id === customerId;
            return !samePhone && !sameId;
          });
          writeSavedCustomers([customerRecord, ...filteredCust]);
        } catch (custSyncErr) {
          console.error("Auto customer sync error in server.ts:", custSyncErr);
        }
      }

      res.json({ success: true, quote: newQuote });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/quotes/:id", (req, res) => {
    try {
      const { id } = req.params;
      const quotes = readSavedQuotes();
      const updated = quotes.filter((q: any) => q.id !== id);
      writeSavedQuotes(updated);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Customers API Endpoints
  app.get("/api/customers", (req, res) => {
    let customers = readSavedCustomers();
    // Auto sync any customers found inside existing saved quotes
    try {
      const quotes = readSavedQuotes();
      let hasNewSync = false;
      for (const q of quotes) {
        if (q.customer && q.customer.name && q.customer.name.trim()) {
          const name = q.customer.name.trim();
          const rawPhone = (q.customer.phone || '').trim();
          const cleanPhone = normalizePhone(rawPhone);
          const exists = customers.some((c: any) => {
            const cClean = normalizePhone(c.phone);
            const samePhone = cleanPhone.length >= 7 && cClean.length >= 7 && cleanPhone === cClean;
            return samePhone || (c.name && c.name.toLowerCase() === name.toLowerCase());
          });
          if (!exists) {
            customers.push({
              id: cleanPhone.length >= 7 ? `cust_${cleanPhone}` : `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              name,
              phone: cleanPhone || rawPhone,
              address: (q.customer.address || '').trim(),
              notes: '',
              createdAt: q.date || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            hasNewSync = true;
          }
        }
      }
      if (hasNewSync) {
        writeSavedCustomers(customers);
      }
    } catch (e) {
      console.warn("Quote to customer auto-sync on GET error:", e);
    }

    res.json(customers);
  });

  app.post("/api/customers", (req, res) => {
    try {
      const customer = req.body;
      if (!customer || !customer.name) {
        return res.status(400).json({ error: "اسم العميل مطلوب" });
      }
      const rawPhone = (customer.phone || '').trim();
      const cleanPhone = normalizePhone(rawPhone);
      const customerId = cleanPhone.length >= 7 ? `cust_${cleanPhone}` : (customer.id || `cust_${Date.now()}`);
      const customerRecord = {
        ...customer,
        id: customerId,
        phone: cleanPhone || rawPhone,
        updatedAt: new Date().toISOString()
      };
      const customers = readSavedCustomers();
      const filtered = customers.filter((c: any) => {
        const cClean = normalizePhone(c.phone);
        const samePhone = cleanPhone.length >= 7 && cClean.length >= 7 && cleanPhone === cClean;
        const sameId = c.id === customerId;
        return !samePhone && !sameId;
      });
      const updated = [customerRecord, ...filtered];
      writeSavedCustomers(updated);
      res.json({ success: true, customer: customerRecord });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/customers/:id", (req, res) => {
    try {
      const { id } = req.params;
      const customers = readSavedCustomers();
      const updated = customers.filter((c: any) => c.id !== id);
      writeSavedCustomers(updated);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Initialize Gemini Client safely
  let ai: GoogleGenAI | null = null;
  function getAiClient(): GoogleGenAI {
    if (!ai) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not defined. Please add it to your Settings > Secrets panel.");
      }
      ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return ai;
  }

  // API Route for The Best Windows AI
  app.post("/api/ai", async (req, res) => {
    try {
      const { messages } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "تنسيق الرسائل غير صالح" });
      }

      // Format messages into what Gemini chat/generateContent expects
      const formattedMessages = messages.map(msg => ({
        role: msg.role === "assistant" ? "model" as const : "user" as const,
        parts: [{ text: msg.content }]
      }));

      const contactsSummary = COMPANY_CONTACTS.map(
        (c) => `${c.name}${c.role ? ` (${c.role})` : ''}: ${c.phone}`
      ).join(' | ');
      const locationsSummary = COMPANY_LOCATIONS.map(
        (l) => `${l.name}${l.address ? ` - ${l.address}` : ''}`
      ).join(' | ');

      const systemInstruction = `
أنت المساعد الذكي لمصنع ومعرض "${BRAND_NAME}" المتخصص في توريد وتركيب شبابيك وأبواب UPVC و WPC.
اسمك: "مساعد ${BRAND_NAME}".

معلومات عن الشركة (${BRAND_NAME}):
- التخصص الأساسي: توريد وتركيب شبابيك وأبواب UPVC و WPC بأعلى جودة.
- أرقام التواصل ومسؤولو المبيعات والفروع: ${contactsSummary}
- فروع ومعارض ومصنع الشركة: ${locationsSummary}

القطاعات والأسعار الرسمية المعتمدة (سعر المتر المربع يشمل التصنيع، الاكسسوارات، والتركيب بالكامل):
1- نيولاين (مصري اقتصادي)
- السعر: 3400 جنيه / متر مربع
- الفئة: اقتصادية
- مناسب للشقق السكنية والمشروعات متوسطة التكلفة.

2- بريمير (أوروبي – تقفيل مصري)
- السعر: 3800 جنيه / متر مربع
- الفئة: متوسطة
- يوفر عزلًا جيدًا للصوت والحرارة.

3- كرافت لاين (تركي – تقفيل مصري)
- السعر: 4000 جنيه / متر مربع
- الفئة: متوسطة إلى عالية
- جودة تصنيع قوية ومظهر عصري.

4- وينتك Wintech (تركي – تقفيل تركي)
- السعر: 4500 جنيه / متر مربع
- الفئة: عالية الجودة
- عزل ممتاز وتشطيب احترافي.

5- برو لاين (تركي – تقفيل تركي)
- السعر: 4500 جنيه / متر مربع
- الفئة: عالية الجودة
- أداء قوي ومناسب للواجهات والفيلات.

6- كومبن (تركي – تقفيل تركي)
- السعر: 5000 جنيه / متر مربع
- الفئة: فاخرة
- أعلى مستوى من الجودة والعزل.

الإضافات الاختيارية (سعر المتر المربع):
- سلك بليسيه للحشرات: 850 جنيه / متر مربع
- بلاك أوت + سلك بليسيه: 1600 جنيه / متر مربع (حزمة كاملة عازلة للضوء والحشرات)
- زجاج دبل جلاس: 850 جنيه / متر مربع
- زجاج ألوان خاصة: 1000 جنيه / متر مربع

ألوان وأنواع الزجاج المتاحة للعميل للاختيار:
- أبيض شفاف
- مصنفر
- بني عاكس
- أبيض عاكس
- بني سن دبوس
- أزرق عاكس
- أخضر عاكس
- أسود عاكس
- زجاج مع جورجيا

أنظمة الفتح المتاحة:
- مفصلي
- جرار
- قلاب
- ثابت

مميزات UPVC & WPC من ${BRAND_NAME}:
- عزل حراري وصوتي ممتاز
- مقاوم للرطوبة والمياه والحرارة
- مقاوم للتآكل والصدأ
- عمر افتراضي طويل وضمان معتمد
- سهل التنظيف والصيانة

مميزات ${BRAND_NAME}:
- خامات تركية وأوروبية معتمدة عالية الجودة
- تركيب احترافي بفرق متخصصة
- تشطيب دقيق والتزام تام بالمواعيد
- معاينة مجانية لرفع المقاسات بالموقع

طريقة حساب السعر في الحاسبة:
السعر الأساسي = العرض × الارتفاع × سعر القطاع المختار
السعر النهائي = السعر الأساسي + سعر الزجاج الإضافي + سعر السلك أو البلاك أوت + أي إضافات أخرى يطلبها العميل.

ملاحظات هامة إضافية لمساعد ${BRAND_NAME}:
- المساحة تحسب بالمتر المربع (العرض × الارتفاع / 10000). في حال كانت المساحة الإجمالية للبند الواحد أقل من 1.0 متر مربع، يتم احتسابها كبند مستوفي للحد الأدنى (1.0 متر مربع) تلقائياً.
- تحدث دائماً بلهجة مصرية ودية ترحيبية للغاية ومحترفة في نفس الوقت تعكس جودة ومصداقية ${BRAND_NAME} (استعمل ألفاظ مثل: "يا فندم"، "تحت أمرك"، "منورنا").
- أرشد العميل لاستخدام الحاسبة التفاعلية المدمجة بالموقع بأبسط صورة لإدخال المقاسات وتصميم بنودهم والحصول على كشف أسعار فوري مع خيار التنزيل والطباعة كـ PDF مجاناً.
- شجعهم على طلب وتأكيد الخدمة الممتازة وحجز موعد لمعاينة فنية مجانية تماماً وبدون أي التزام عليهم عبر الاتصال الهاتفي بمسؤولي المبيعات والفروع: ${contactsSummary}.
`;

      const aiClient = getAiClient();
      let response = null;
      let retries = 3;
      let delay = 1000;

      while (retries > 0) {
        try {
          response = await aiClient.models.generateContent({
            model: "gemini-3.5-flash",
            contents: formattedMessages,
            config: {
              systemInstruction: systemInstruction,
              temperature: 0.7,
            }
          });
          break; // success
        } catch (err: any) {
          retries--;
          const errStatus = err?.status || err?.code || (err?.message && err.message.includes("503") ? 503 : 0);
          const isRateLimitOrUnavailable = errStatus === 503 || errStatus === 429 || (err?.message && (err.message.includes("high demand") || err.message.includes("503") || err.message.includes("UNAVAILABLE")));
          
          if (retries > 0 && isRateLimitOrUnavailable) {
            console.log(`[Gemini API Info] Model busy or experiencing high demand. Retrying in ${delay}ms... (Retries left: ${retries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
          } else {
            throw err;
          }
        }
      }

      const replyText = response?.text || "عذراً، لم أستطع صياغة رد مناسب حالياً. يمكنك الاتصال بنا مباشرة لمساعدتك فورا!";
      return res.json({ reply: replyText });
    } catch (error: any) {
      console.warn("[Gemini API Info] Call was not completed successfully:", error?.message || error);
      return res.status(200).json({ 
        reply: `أهلاً بك في ${BRAND_NAME}! يمكنك التواصل الفوري معنا عبر الاتصال بـ ${COMPANY_CONTACTS[0].name} (${COMPANY_CONTACTS[0].phone}) أو مديرة السيلز ${COMPANY_CONTACTS[3].name} (${COMPANY_CONTACTS[3].phone}) للحصول على كافة عروض الأسعار والاستشارات مجاناً!` 
      });
    }
  });

  // Explicit SEO endpoints (/sitemap.xml & /robots.txt) so SPA catch-all never returns HTML for them
  app.get("/sitemap.xml", (_req, res) => {
    const candidates = [
      path.join(process.cwd(), "dist", "sitemap.xml"),
      path.join(process.cwd(), "public", "sitemap.xml"),
    ];
    for (const filePath of candidates) {
      if (fs.existsSync(filePath)) {
        res.status(200).type("application/xml; charset=utf-8").send(fs.readFileSync(filePath, "utf-8"));
        return;
      }
    }
    res.status(404).type("text/plain; charset=utf-8").send("Sitemap not found");
  });

  app.get("/robots.txt", (_req, res) => {
    const candidates = [
      path.join(process.cwd(), "dist", "robots.txt"),
      path.join(process.cwd(), "public", "robots.txt"),
    ];
    for (const filePath of candidates) {
      if (fs.existsSync(filePath)) {
        res.status(200).type("text/plain; charset=utf-8").send(fs.readFileSync(filePath, "utf-8"));
        return;
      }
    }
    res.status(404).type("text/plain; charset=utf-8").send("robots.txt not found");
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started successfully on http://0.0.0.0:${PORT}`);
  });
}

startServer();
