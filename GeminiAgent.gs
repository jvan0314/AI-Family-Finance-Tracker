// Configuration
// We use 'flash' here because it is fast and has high limits (10 requests per minute).
const MODEL_NAME = 'gemini-2.5-flash'; 

const API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

function processDocumentWithAgent(fileBlob, fileName) {
  const base64Data = Utilities.base64Encode(fileBlob.getBytes());
  const mimeType = fileBlob.getContentType(); 

  // --- CUSTOMIZATION ZONE: TEACH THE AI HERE ---
  const systemPrompt = `
    You are an expert Financial Analyst Agent for a family. 
    Your goal is to extract transaction data from bank statements AND identify the account owner.
    
    Step 1: IDENTIFY. Scan the header/summary sections for the "Account Holder Name" and "Account Number".
    
    Step 2: EXTRACT. Get every transaction row.
    CRITICAL SIGN STANDARDIZATION: 
    - Expenses (Money leaving account): MUST be a POSITIVE number (e.g., 50.25).
    - Money In (Refunds, Credits, Income): MUST be a NEGATIVE number (e.g., -50.25).
    - PRECISION: Round to exactly 2 decimal places.
    
    Step 3: CATEGORIZE. Strictly use ONLY these categories: 
    [Mortgage, Utilities, Groceries, Food and Drink, Travel, Shopping, Health, Entertainment, Subscription, Income, Money Transfer, Credit Card Payment, Others].
    
    CRITICAL CATEGORIZATION RULES (Customize these if needed):
    - Travel: Uber, Metro, flights, hotels, gas stations, EV charging.
    - Utilities: Water, electric, internet, car maintenance.
    - Food and Drink: Restaurants, cafes, bars (distinct from Groceries).
    - Subscription: Netflix, Gym, Software, Streaming.
    - Mortgage: Mortgage payments/Rent.
    - Groceries: Supermarkets.
    - Income: Salary, interest, deposits. (Do NOT include refunds here).
    - Money Transfer: Venmo, Zelle, CashApp withdrawals.
    - Credit Card Payment: Internal transfers to pay off cards.
    - Shopping: Clothes, electronics, furniture.
    - REFUND RULE: Refunds must go back to their original category (e.g. Shopping), NOT Income.
    
    Step 4: Output the final data in valid JSON format only.
    
    JSON Structure required:
    {
      "metadata": {
        "bank_name": "str",
        "account_holder": "str",
        "account_last_4": "str"
      },
      "transactions": [
        {"date": "YYYY-MM-DD", "description": "str", "category": "str", "amount": 0.00, "notes": "str"}
      ]
    }
  `;

  const payload = {
    "contents": [{
      "parts": [
        { "text": systemPrompt },
        { "text": `Process this file: ${fileName}` },
        { "inline_data": { "mime_type": mimeType, "data": base64Data } }
      ]
    }],
    "safetySettings": [
      { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
      { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
      { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
      { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
    ]
  };

  const options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  // Retry Logic (Handles occasional API hiccups)
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      let response = UrlFetchApp.fetch(API_URL, options);
      
      if (response.getResponseCode() !== 200) {
        Logger.log(`❌ API Error: ${response.getContentText()}`);
        if (response.getResponseCode() === 404) throw new Error(`Model '${MODEL_NAME}' Not Found.`);
        return null; 
      }

      const responseText = response.getContentText();
      let json = JSON.parse(responseText);

      if (!json.candidates || json.candidates.length === 0) return null;

      const part = json.candidates[0].content.parts[0];
      const cleanJson = part.text.replace(/```json/g, "").replace(/```/g, "");
      return JSON.parse(cleanJson);

    } catch (e) {
      if (attempt < maxRetries - 1) Utilities.sleep(2000 * Math.pow(2, attempt)); 
      else throw e; 
    }
  }
}
