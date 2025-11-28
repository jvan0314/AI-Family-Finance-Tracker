# 🏦 Project Ledger: The AI Family Finance Tracker

> **"Financial clarity without the manual labor."**

Project Ledger is a private, automated system that turns **your boring** PDF **bank statements into a smart** "Financial Pulse" report every month.

It uses Artificial Intelligence (Google Gemini) to read your statements, categorize every transaction (even the weird ones), and tell you exactly where your money went—and who spent it.

**✅ No Monthly Fees** • **✅ No Data Sharing** • **✅ 100% Automated**

## 🧐 How It Works

Imagine a digital assistant that wakes up once an hour to check your drive for new bills.

1. **Upload:** You drop a bank statement PDF (e.g., `Chase_Oct2025.pdf`) into a Google Drive folder once it's ready (the only manual part you need to do).

1. **The Brain:** The script detects the file, reads it using AI, and extracts every single transaction.

1. **The Database:** It saves clean, standardized data into a Google Sheet.

1. **The Report:** Every month the AI analyzes the data and emails you a "Financial Pulse" report with trends, charts, and insights. (see `demo_report.gs` in this repository as an example).

## 🛠️ Setup Guide (Start Here)

### Phase 1: Google Drive Setup

1. Go to your **Google Drive**.

2. Create a new folder named `Family Finance`.

3. Inside that folder, create a new Google Sheet named `Master Ledger`.

   * **Crucial Step:** Open the sheet and rename the tab "Sheet1" to `Transactions` (Case sensitive!).

4. Inside `Family Finance`, create a folder named `Inbox`.

   * **Important:** Open the `Inbox` folder. Look at your browser's address bar. Copy the long string of random letters/numbers after `https://drive.google.com/drive/u/0/folders/` (e.g., `1aBcD_eFgH...`). Save this; this is your **Folder ID**.

### Phase 2: Get Your AI Key

1. Go to [Google AI Studio](https://aistudio.google.com/).

2. Click **Get API Key** (top left) -> **Create API Key**.

3. Copy this key. You will need it in Phase 3.

### Phase 3: The Code Setup

1. Open your `Master Ledger` Google Sheet.

2. Click **Extensions** > **Apps Script** in the top menu.

3. **Settings:** Click the ⚙️ (Gear icon) on the left sidebar.

   * Scroll to the bottom to **Script Properties**.

   * Click **Add script property**.

   * **Property:** `GEMINI_API_KEY` | **Value:** (Paste your API Key from Phase 2).

   * Click **Add script property** again.

   * **Property:** `INBOX_FOLDER_ID` | **Value:** (Paste your Folder ID from Phase 1).

   * Click **Save script properties**.

### Phase 4: Installing the Files

On the left side of the Apps Script editor, you will see `Code.gs`. We need to create 4 specific files.

#### 1. `Code.gs` (The Orchestrator)

* Delete any code currently in `Code.gs`.

* Copy the code from the `Code.gs` file in this repository and paste it in.

* **ACTION REQUIRED:** Look at the top of the file. Update `EMAIL_RECIPIENTS` with your email. Then, update `ACCOUNT_MAP` with all your accounts, mapping the real last 4 digits to the correct account owner.

  ```javascript
  const EMAIL_RECIPIENTS = "alex@example.com, sam@example.com";
  const ACCOUNT_MAP = {
    "1234": { user: "Alex", bank: "Chase Sapphire" }, // Change "1234" to your card's last 4 digits, update your and bank's name.
    "5678": { user: "Sam", bank: "Amex Gold" }, // Copy this line for additional account entries
  };+
  ```
#### 2. `GeminiAgent.gs` (The Brain)

* Click the **+** (Plus sign) next to **Files** > Select **Script**.

* Name it `GeminiAgent` (Do not add .gs manually).

* Copy the code from `GeminiAgent.gs` in this repository and paste it in.

#### 3. `ReportGen.gs` (The Reporter)

* Click the **+** (Plus sign) next to **Files** > Select **Script**.

* Name it `ReportGen` (Do not add .gs manually).

* Copy the code from `ReportGen.gs` in this repository and paste it in.

#### 4. `EmailTemplate.html` (The Look)

* Click the **+** (Plus sign) next to **Files** > Select **HTML**.

* Name it `EmailTemplate` (Do not add .html manually).

* Copy the code from `EmailTemplate.html` in this repository and paste it in.

### Phase 5: Turn on the Automation

1. Click the **Clock Icon (Triggers)** on the left sidebar.

2. Click the blue **+ Add Trigger** button (bottom right).

   * **Function:** `checkInbox` | **Event source:** Time-driven | **Timer:** Hour timer | **Interval:** Every hour.

   * *Click Save.*

3. Click **+ Add Trigger** again.

   * **Function:** `generateMonthlyReport` | **Event source:** Time-driven | **Timer:** Month timer | **Day:** 1st | **Time:** 8am.

   * *Click Save.*

4. Click **+ Add Trigger** again.

   * **Function:** `sendUploadReminder` | **Event source:** Time-driven | **Timer:** Month timer | **Day:** 28th.

   * Be mindful that if you set it up to 29th, 30th, or 31st, the trigger will not run for the months that does not have these days. 

   * *Click Save.*

## 🎨 Customization: Teaching the AI

The AI uses a "System Prompt" to decide how to categorize your spending. You can change this to fit your life!

**To change categories:**

1. Open `GeminiAgent.gs`.

2. Scroll down to the `Step 3: CATEGORIZE` section (around line 25).

3. **Edit the text** like you are talking to a human.

   * *Example:* If you want a "Pet" category, add: `Pets` in the category bracket (line 26) and under `CRITICAL CATEGORIZATION RULES` add a new line of description like `- Pets: Includes Chewy, Vet bills, and Petco.`

   * *Example:* If you want "Target" to be "Groceries" instead of "Shopping", change the Grocery rule: `- Groceries: Supermarkets, food markets, and Target.`

## 🎁 Bonus: Email-to-Drive (Optional)

Don't want to manually upload PDFs to Google Drive?

1. Create a separate, dedicated Gmail account (e.g., `family.receipts@gmail.com`).

2. Go to your Main Account's Google Drive -> Right-click `Inbox` -> Share -> Add the new email address as **Editor**.

3. Log into the *new* email account -> Go to script.google.com -> New Project.

4. Paste the "Email Bridge" code (found in `EmailBridge.gs` in this repo).

5. Update the `DESTINATION_FOLDER_ID` in the first line with your Inbox ID.

6. Set a trigger to run every 10 minutes.

7. **Done!** Just forward your statement PDF to this email, and it appears in your tracker automatically.

