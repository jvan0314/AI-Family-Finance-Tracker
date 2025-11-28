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

1. **The Report:** Every month the AI analyzes the data and emails you a "Financial Pulse" report with trends, charts, and insights.

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

* **ACTION REQUIRED:** Look at the top of the file. Update `EMAIL_RECIPIENTS` with your email, and update `ACCOUNT_MAP` with your real card last 4 digits.

  ```javascript
  const EMAIL_RECIPIENTS = "alex@example.com, sam@example.com";
  const ACCOUNT_MAP = {
    "1234": { user: "Alex", bank: "Chase Sapphire" }, // Change "1234" to your card's last 4 digits
    "5678": { user: "Sam", bank: "Amex Gold" }
  };
