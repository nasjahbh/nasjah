import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI API endpoint
  app.post("/api/insights", async (req, res) => {
    try {
      const { sales = 0, expenses = 0, instagram = { followers: 0 } } = req.body || {};
      
      // If sales and expenses are 0, return immediate clean response without calling AI
      if (sales === 0 && expenses === 0) {
        return res.json({
          insights: {
            business_summary: "المتجر جاهز ومستعد لتسجيل الطلبات والمصروفات الجديدة.",
            account_growth: `حساب @${instagram?.username || 'nasjah.bh'} متصل وجاهز للرصد.`
          }
        });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({
          insights: {
            business_summary: `إجمالي المبيعات ${sales} د.ب مقابل مصروفات ${expenses} د.ب، وصافي الأرباح ${sales - expenses} د.ب.`,
            account_growth: "جاري تتبع نمو الحساب."
          }
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `
        You are an expert business analyst for 'Nasjah', a luxury fabric business in Bahrain.
        Analyze the following real-time business data:
        - Total Sales Revenue: ${sales} BHD
        - Total Expenses: ${expenses} BHD
        - Instagram Data: ${instagram?.followers || 0} followers.
        
        Provide a professional business summary based ONLY on these exact numbers. 
        Do NOT invent, estimate, or mock any growth percentages or compare to previous weeks since there is no historical data yet.
        
        Respond ONLY with a valid JSON object in this exact format, with all values in Arabic:
        {
          "business_summary": "string (A professional Arabic summary of the current sales and expenses)",
          "account_growth": "string (Analysis of the current Instagram followers count)"
        }
        Do not include markdown blocks like \`\`\`json.
      `;

      try {
        // Safe call with timeout fallback
        const aiPromise = ai.models.generateContent({
          model: "gemini-flash-latest",
          contents: prompt
        });

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Timeout")), 8000)
        );

        const response: any = await Promise.race([aiPromise, timeoutPromise]);
        
        let responseText = response.text || "";
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
          business_summary: "المتجر جاهز ومستعد لتسجيل الطلبات والمصروفات.",
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
      server: { middlewareMode: true },
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
