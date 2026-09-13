import express from "express";
import http from "http";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import {
  getUserData,
  syncUserData,
  saveOrder,
  deleteOrder,
  saveExpense,
  deleteExpense,
  saveInventoryItem,
  deleteInventoryItem,
  resetStoreData,
} from "./server/db";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = http.createServer(app);

  // Anti-stale cache middleware for HTML and API responses
  app.use((req, res, next) => {
    res.setHeader('X-App-Version', '2.3.0');
    if (
      req.url === '/' ||
      req.url.endsWith('.html') ||
      req.url.startsWith('/api/') ||
      req.url.includes('sw.js') ||
      req.url.includes('manifest')
    ) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    next();
  });

  app.use(express.json({ limit: "25mb" }));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  // Database API Endpoints (UID and credentials strictly guarded on server)
  app.get("/api/store-data", (req, res) => {
    try {
      const data = getUserData();
      res.json({ success: true, ...data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/sync", (req, res) => {
    try {
      const { orders, expenses, inventory } = req.body || {};
      const result = syncUserData({ orders, expenses, inventory });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/orders", (req, res) => {
    try {
      const order = req.body;
      if (!order || !order.id) {
        return res.status(400).json({ success: false, message: "Order id is required" });
      }
      const saved = saveOrder(order);
      res.json({ success: true, order: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete("/api/orders/:id", (req, res) => {
    try {
      deleteOrder(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/expenses", (req, res) => {
    try {
      const expense = req.body;
      if (!expense || !expense.id) {
        return res.status(400).json({ success: false, message: "Expense id is required" });
      }
      const saved = saveExpense(expense);
      res.json({ success: true, expense: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete("/api/expenses/:id", (req, res) => {
    try {
      deleteExpense(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/inventory", (req, res) => {
    try {
      const item = req.body;
      if (!item || !item.id) {
        return res.status(400).json({ success: false, message: "Inventory item id is required" });
      }
      const saved = saveInventoryItem(item);
      res.json({ success: true, item: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete("/api/inventory/:id", (req, res) => {
    try {
      deleteInventoryItem(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/reset-data", (req, res) => {
    try {
      resetStoreData();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Fast AI Business Performance Analysis (Gemini 3.8 Flash)
  app.post("/api/ai-analysis", async (req, res) => {
    try {
      const { 
        sales = 0, 
        expenses = 0, 
        netProfit = 0, 
        ordersCount = 0, 
        pendingOrdersCount = 0, 
        deliveredOrdersCount = 0,
        fabricsCount = 0,
        totalFabricMeters = 0,
        lowStockFabricsCount = 0
      } = req.body || {};

      const salesNum = Number(sales) || 0;
      const expensesNum = Number(expenses) || 0;
      const profitNum = Number(netProfit) || (salesNum - expensesNum);
      const margin = salesNum > 0 ? ((profitNum / salesNum) * 100).toFixed(1) : "0.0";

      // Deterministic executive baseline in case of no key or timeout
      const fallbackAnalysis = {
        executive_summary: ordersCount > 0
          ? `حقق المتجر إيرادات إجمالية قدرها ${salesNum.toFixed(2)} د.ب من واقع ${ordersCount} طلب، في حين بلغت المصروفات التشغيلية ${expensesNum.toFixed(2)} د.ب، بصافي عائد قدره ${profitNum.toFixed(2)} د.ب وهامش ربحي ${margin}%.`
          : "السجل التجاري جاهز لاستقبال وتسجيل أولى المبيعات والتكاليف التشغيلية للمتجر.",
        financial_indicator: profitNum >= 0
          ? `انضباط مالي متوازن مع تحقيق هامش أرباح تشغيلي إيجابي بنسبة ${margin}% يغطي نفقات التشغيل بسلاسة.`
          : `تنبيه مالي: تجاوزت المصروفات المسجلة حجم الإيرادات بمقدار ${Math.abs(profitNum).toFixed(2)} د.ب، مما يستدعي ضبط وترشيد النفقات الحالية.`,
        operational_efficiency: ordersCount > 0
          ? `نسبة إنجاز الطلبات مستقرة مع وجود ${pendingOrdersCount} طلب قيد التجهيز و ${deliveredOrdersCount} طلب تم تسليمها بنجاح للزبائن.`
          : "كافة مسارات العمل مهيأة وجاهزة لإدراج طلبات التفصيل والخياطة الجديدة.",
        inventory_guidance: fabricsCount > 0
          ? `يتوفر في المخزن ${fabricsCount} صنف قماش بإجمالي ${totalFabricMeters} متر، مع رصد ${lowStockFabricsCount} صنف بحاجة لإعادة توريد قبل نفادها.`
          : "المخزون بانتظار إدراج أصناف الأقمشة والأمتار المتوفرة لتتبع استهلاك التفصيل بدقة."
      };

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({ success: true, analysis: fallbackAnalysis });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `
أنت مستشار استراتيجي وخبير إدارة أعمال تنفيذي لـ "دار نَسْجَة للأقمشة والعبايات الفاخرة" في مملكة البحرين.
المطلوب منك تقديم تحليل أداء مهني وموجز باللغة العربية الفصحى الراقية، مستنداً فقط وبدقة تامة إلى البيانات اللحظية التالية:
- إجمالي مبيعات المتجر: ${salesNum.toFixed(2)} دينار بحريني
- إجمالي المصروفات التشغيلية: ${expensesNum.toFixed(2)} دينار بحريني
- صافي الأرباح التشغيلية: ${profitNum.toFixed(2)} دينار بحريني (هامش الربح: ${margin}%)
- إجمالي الطلبات: ${ordersCount} (قيد التجهيز: ${pendingOrdersCount}، مسلّمة: ${deliveredOrdersCount})
- مخزون الأقمشة: ${fabricsCount} أصناف بإجمالي ${totalFabricMeters} متر (أقمشة قاربت على النفاد: ${lowStockFabricsCount})

قواعد حاسمة لجودة التحليل:
1. ممنوع منعاً باتاً استخدام أي تعليقات هزلية، أو مبالغات إنشائية، أو عبارات مبتذلة، أو رموز تعبيرية (إيموجي).
2. يجب أن تكون الصياغة جادة ورصينة كتقرير موجه لمجلس الإدارة أو المالك مباشرة.
3. كل نص يجب ألا يتجاوز جملتين مركزتين بالأرقام والحقائق.

أرجع النتيجة حصراً بصيغة JSON وفق المخطط التالي:
{
  "executive_summary": "موجز تنفيذي مكثف ودقيق لحركة المبيعات وصافي الأرباح",
  "financial_indicator": "تقييم موجز لهامش العائد المالي وكفاءة إدارة التكاليف",
  "operational_efficiency": "تقييم كفاءة إنجاز الطلبات الحالية وسرعة التسليم",
  "inventory_guidance": "توجيه إداري محدد حول مخزون الأقمشة والأمتار وإعادة التوريد"
}
`;

      try {
        const aiPromise = ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: "application/json",
            temperature: 0.2
          }
        });

        // 6-second timeout for extreme responsiveness
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Timeout")), 6000)
        );

        const response: any = await Promise.race([aiPromise, timeoutPromise]);
        const text = response.text || "{}";
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);

        return res.json({
          success: true,
          analysis: {
            executive_summary: parsed.executive_summary || fallbackAnalysis.executive_summary,
            financial_indicator: parsed.financial_indicator || fallbackAnalysis.financial_indicator,
            operational_efficiency: parsed.operational_efficiency || fallbackAnalysis.operational_efficiency,
            inventory_guidance: parsed.inventory_guidance || fallbackAnalysis.inventory_guidance
          }
        });
      } catch (err) {
        return res.json({ success: true, analysis: fallbackAnalysis });
      }
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // AI API endpoint (for backward compatibility)
  app.post("/api/insights", async (req, res) => {
    try {
      const { sales = 0, expenses = 0, instagram = { followers: 0 } } = req.body || {};
      
      // If sales and expenses are 0, return immediate clean response without calling AI
      if (sales === 0 && expenses === 0) {
        return res.json({
          insights: {
            business_summary: "سجل المتجر جاهز ومستعد لتدوين الطلبات والمصروفات التشغيلية.",
            account_growth: `حساب @${instagram?.username || 'nasjah.bh'} متصل وجاهز للرصد.`
          }
        });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({
          insights: {
            business_summary: `إجمالي المبيعات ${sales} د.ب مقابل مصروفات ${expenses} د.ب، وصافي العائد ${sales - expenses} د.ب.`,
            account_growth: "جاري تتبع نمو الحساب المهني."
          }
        });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      const prompt = `
أنت محلل أعمال مالي رفيع المستوى لدار نَسْجَة للأقمشة الراقية في البحرين.
قم بصياغة ملخص أعمال تنفيذي رصين بالأرقام الحقيقية المحددة:
- إجمالي المبيعات: ${sales} د.ب
- إجمالي المصروفات: ${expenses} د.ب
- متابعو إنستغرام: ${instagram?.followers || 0}

ممنوع استخدام إيموجي أو عبارات عاطفية، واكتب بلغة عربية إدارية فصحى موجزة.
أرجع JSON فقط:
{
  "business_summary": "ملخص تنفيذي للأداء المالي",
  "account_growth": "رصد لحساب المنصة"
}
`;

      try {
        const aiPromise = ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: "application/json"
          }
        });

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Timeout")), 6000)
        );

        const response: any = await Promise.race([aiPromise, timeoutPromise]);
        let responseText = response.text || "{}";
        responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        let insightsData;
        try {
          insightsData = JSON.parse(responseText);
        } catch {
          insightsData = {
            business_summary: `إجمالي المبيعات ${sales} د.ب والمصروفات ${expenses} د.ب وصافي الأرباح ${sales - expenses} د.ب.`,
            account_growth: "جاري متابعة تفاعل ونمو الحساب."
          };
        }

        return res.json({ insights: insightsData });
      } catch {
        return res.json({
          insights: {
            business_summary: `إجمالي المبيعات ${sales} د.ب مقابل مصروفات ${expenses} د.ب وصافي الأرباح ${sales - expenses} د.ب.`,
            account_growth: "جاري متابعة تفاعل ونمو الحساب."
          }
        });
      }
    } catch {
      return res.json({
        insights: {
          business_summary: "سجل المتجر جاهز ومستعد لتدوين الطلبات والمصروفات.",
          account_growth: "جاري تتبع نمو الحساب."
        }
      });
    }
  });

  // Instagram API Endpoint (AI Based)
  app.post("/api/instagram", async (req, res) => {
    try {
      const { username } = req.body || {};
      if (!username) {
        return res.json({ followers: 0, engagement: "0%" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({ followers: 0, engagement: "0%" });
      }

      return res.json({ followers: 0, engagement: "0%" });
    } catch {
      return res.json({ followers: 0, engagement: "0%" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: {
          server: httpServer,
        },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
