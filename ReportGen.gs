// --- CONFIGURATION ---
// You can leave these as is.
// If your family names are very specific, update the getUserStats function below.
// Run generateCurrentMonthReport() only if you can get all the statements ready for current month during the monthly scheduled report generation.
// Otherwise, suggest to run generateMonthlyReport() as the production trigger. 

function generateCurrentMonthReport() {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  generateReportForDate(thisMonth);
}

function generateMonthlyReport() {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  generateReportForDate(lastMonth);
}

// --- CORE REPORTING ENGINE ---

function generateReportForDate(targetDate) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Transactions");
  
  const displayData = sheet.getDataRange().getDisplayValues();
  const rawData = sheet.getDataRange().getValues();
  
  // 1. Fetch Data
  const currentData = filterDataByIntegerMonth(rawData, displayData, targetDate);
  
  const prevDate = new Date(targetDate);
  prevDate.setMonth(targetDate.getMonth() - 1);
  const prevData = filterDataByIntegerMonth(rawData, displayData, prevDate);
  
  const monthName = Utilities.formatDate(targetDate, Session.getScriptTimeZone(), "MMMM yyyy");
  
  if (currentData.length === 0) {
    Logger.log(`❌ No transactions found for ${monthName}. Report skipped.`);
    return;
  }

  // 2. Calculate Financials
  Logger.log(`--- AUDITING CALCULATIONS FOR ${monthName} ---`);
  const currentFin = calculateFinancials(currentData, true); 
  const prevFin = calculateFinancials(prevData, false);
  
  // 3. Prepare Breakdown Table
  let catTableData = generateCategoryTableData(currentFin, prevFin);

  // 4. AI ANALYSIS (Pro -> Flash Cascade)
  const aiAnalysis = analyzeWithGemini(currentData, prevData, currentFin, prevFin, monthName);
  
  // 5. Merge AI Insights into Table
  if (aiAnalysis.category_insights) {
    catTableData = catTableData.map(row => {
      if (aiAnalysis.category_insights[row.name]) {
        row.insight = aiAnalysis.category_insights[row.name];
      } else {
        row.insight = ""; 
      }
      return row;
    });
  }
  
  // 6. Visuals
  const trendUrl = generateStepChartUrl(rawData, displayData, targetDate);
  const userUrl = generateUserChartUrl(currentFin.users);
  
  // 7. Template
  const template = HtmlService.createTemplateFromFile('EmailTemplate');
  template.month = Utilities.formatDate(targetDate, Session.getScriptTimeZone(), "MMMM");
  template.fin = currentFin;
  template.prevFin = prevFin;
  template.insights = aiAnalysis.insights;
  template.transactions = aiAnalysis.abnormal_transactions;
  template.granularHighlights = aiAnalysis.granular_highlights; 
  template.modelUsed = aiAnalysis.model_used; 
  template.trendUrl = trendUrl;
  template.userUrl = userUrl;
  template.catTable = catTableData; 
  
  const htmlBody = template.evaluate().getContent();
  
  // 8. Send & Save
  MailApp.sendEmail({
    to: EMAIL_RECIPIENTS, // Defined in Code.gs
    subject: `Monthly Finance Pulse: ${monthName}`,
    htmlBody: htmlBody
  });
  
  saveReportToDrive(htmlBody, trendUrl, userUrl, targetDate);
}

// --- AI AUDITOR ENGINE ---

function analyzeWithGemini(currRows, prevRows, currFin, prevFin, monthName) {
  function tryModel(modelName) {
    const KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${KEY}`;
    const payload = {
        "contents": [{ "parts": [ { "text": systemPrompt }, { "text": JSON.stringify(payloadData) } ] }],
        "generationConfig": { "responseMimeType": "application/json" },
        "safetySettings": [
        { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
        { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
        ]
    };
    const options = { "method": "post", "contentType": "application/json", "payload": JSON.stringify(payload), "muteHttpExceptions": true };
    try {
      Logger.log(`Attempting Analysis with ${modelName}...`);
      const response = UrlFetchApp.fetch(URL, options);
      if (response.getResponseCode() !== 200) return null;
      const json = JSON.parse(response.getContentText());
      if (!json.candidates) return null;
      const text = json.candidates[0].content.parts[0].text;
      const parsed = JSON.parse(text.replace(/```json/g, "").replace(/```/g, ""));
      parsed.model_used = modelName === 'gemini-2.5-pro' ? 'Gemini 2.5 Pro' : 'Gemini 2.5 Flash';
      return parsed;
    } catch (e) { return null; }
  }

  // Payload Prep
  const formatTx = (rows) => rows.map(r => ({ date: Utilities.formatDate(new Date(r[0]), Session.getScriptTimeZone(), "yyyy-MM-dd"), desc: r[1], cat: r[2], amt: r[3], user: r[4], bank: r[5] }));
  const topMerchantsSpend = Object.entries(currFin.merchants).sort((a, b) => b[1].amount - a[1].amount).slice(0, 5).map(e => `${e[0]} ($${e[1].amount.toFixed(2)})`);
  const topMerchantsFreq = Object.entries(currFin.merchants).sort((a, b) => b[1].count - a[1].count).slice(0, 5).map(e => `${e[0]} (${e[1].count} times)`);

  const payloadData = {
    context: {
      report_month: monthName,
      verified_totals: { current_expense: currFin.outflow, previous_expense: prevFin.outflow },
      lifestyle_check: {
        ratio: `${Math.round(currFin.fixedSpend/currFin.outflow*100)}% Fixed / ${Math.round(currFin.flexibleSpend/currFin.outflow*100)}% Flexible`
      },
      top_merchants_spend: topMerchantsSpend,
      top_merchants_freq: topMerchantsFreq,
      user_breakdown: currFin.users
    },
    transactions: { current: formatTx(currRows), previous: formatTx(prevRows) }
  };

  const systemPrompt = `
    You are a cynical, eagle-eyed Family Financial Auditor. 
    1. **Generate 4 Insights (Executive Summary):** Trends, Lifestyle, Merchant Intel.
    2. **Generate "Granular Highlights" (Who Spent What?):** 3-4 bullet points on specific users/merchants.
    3. **Category Explanations:** Brief reason (max 10 words) for change vs last month for EACH category.
    4. **Watchlist:** Max 5 suspicious items (> $300, Price Hikes). Ignore Income/CC Payment.
    
    OUTPUT JSON:
    {
      "insights": [{ "type": "positive", "text": "..." }],
      "granular_highlights": [{ "icon": "👤", "text": "..." }],
      "category_insights": { "Groceries": "Reason..." },
      "abnormal_transactions": [{ "date": "...", "description": "...", "category": "...", "amount": 0.00, "user": "...", "bank": "...", "reason": "..." }]
    }
  `;

  // Cascade Strategy
  const proResult = tryModel('gemini-2.5-pro');
  if (proResult) return proResult;
  const flashResult = tryModel('gemini-2.5-flash');
  if (flashResult) return flashResult;
  
  const fallback = getFallbackAnalysis(currRows);
  fallback.model_used = "Basic Stats (Fallback)";
  return fallback;
}

function getFallbackAnalysis(rows) {
  return {
    insights: [{ type: 'neutral', text: 'AI Analysis unavailable. Reviewing basic stats.' }],
    granular_highlights: [{ icon: "⚠️", text: "Granular analysis unavailable in fallback mode." }],
    category_insights: {}, 
    abnormal_transactions: rows
      .filter(r => Math.abs(r[3]) > 300 && r[2] !== 'Mortgage' && r[2] !== 'Income' && r[2] !== 'Credit Card Payment')
      .slice(0, 5)
      .map(r => ({ date: "N/A", description: r[1], category: r[2], amount: r[3], user: r[4], bank: r[5], reason: "Large Transaction" }))
  };
}

// --- FINANCIAL HELPERS ---

function calculateFinancials(rows) {
  let inflow = 0, outflow = 0, fixedSpend = 0, flexibleSpend = 0;
  const categories = {}, users = {}, merchants = {};
  const fixedCats = ['Mortgage', 'Utilities', 'Groceries', 'Health', 'Subscription'];

  rows.forEach(row => {
    const desc = row[1], category = row[2], amount = Number(row[3]);
    let user = row[4] || "Unknown";

    if (category === 'Credit Card Payment') return;

    if (category === 'Income') {
      inflow += Math.abs(amount);
    } else {
      outflow += amount;
      if (!categories[category]) categories[category] = 0;
      categories[category] += amount;
      
      // User Normalization (Edit this if you have specific family names)
      const lowerUser = user.toLowerCase();
      // Example: If name contains "husb", map to "Husband"
      if (lowerUser.includes('husband')) user = "Husband";
      else if (lowerUser.includes('wife')) user = "Wife";
      // else leave as is
      
      if (!users[user]) users[user] = 0;
      users[user] += amount;
      
      if (fixedCats.includes(category)) fixedSpend += amount; else flexibleSpend += amount;
      
      const cleanDesc = desc.split('  ')[0].trim();
      if (!merchants[cleanDesc]) merchants[cleanDesc] = { amount: 0, count: 0 };
      merchants[cleanDesc].amount += amount;
      merchants[cleanDesc].count++;
    }
  });
  
  return {
    inflow: Math.round(inflow*100)/100,
    outflow: Math.round(outflow*100)/100,
    net: Math.round((inflow - outflow)*100)/100,
    savingsRate: inflow > 0 ? ((inflow - outflow) / inflow) * 100 : 0,
    categories: categories, users: users, merchants: merchants,
    fixedSpend: fixedSpend, flexibleSpend: flexibleSpend
  };
}

// --- HELPERS & CHARTS (Simplified for brevity) ---
// (Copy previous generateStepChartUrl, generateUserChartUrl, filterDataByIntegerMonth, saveReportToDrive, sendUploadReminder here)
// Ensure they are present in the final file.
