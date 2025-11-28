const INBOX_ID = PropertiesService.getScriptProperties().getProperty('INBOX_FOLDER_ID');
const PROCESSED_FOLDER_NAME = "Processed";
const FAILED_FOLDER_NAME = "Failed";

// --- CONFIGURATION ZONE ---
// 1. Enter the email addresses that should receive the report (separated by comma)
const EMAIL_RECIPIENTS = "husband@example.com, wife@example.com";

// 2. Map your Credit Card Last 4 Digits to a Person and Bank Name.
// The AI reads the PDF, finds the number "1234", and uses this map to know who it belongs to.
const ACCOUNT_MAP = {
  "1234": { user: "Husband", bank: "Chase Sapphire" },
  "5678": { user: "Husband", bank: "BoA Checking" },
  "9012": { user: "Wife", bank: "Amex Gold" },
  "3456": { user: "Wife", bank: "Capital One" }
};
// --------------------------

// --- TRIGGER: FILE INGESTION (Drive Watcher) ---
function checkInbox() {
  Logger.log("--- Starting Drive Inbox Check ---");
  const folder = DriveApp.getFolderById(INBOX_ID);
  const files = folder.getFiles();
  
  while (files.hasNext()) {
    const file = files.next();
    if (file.getMimeType() !== MimeType.PDF) continue;
    processFile(file);
  }
  Logger.log("--- Drive Inbox Check Complete ---");
}

// --- CORE PROCESSING LOGIC ---

function processFile(file) {
  try {
    const fileName = file.getName();
    const parentFolder = file.getParents().next();
    Logger.log(`Processing PDF: ${fileName}`);
    
    // Call the "Brain" script
    const agentOutput = processDocumentWithAgent(file.getBlob(), fileName);

    if (!agentOutput || !agentOutput.transactions || agentOutput.transactions.length === 0) {
      Logger.log("⚠️ WARNING: Agent returned 0 transactions.");
      return; 
    }
    
    const identity = identifySource(agentOutput.metadata);
    Logger.log(`Identified: ${identity.user} - ${identity.bank}`);
    
    saveToDatabase(agentOutput.transactions, identity);
    
    // Rename and Move file
    const newName = `${identity.user}_${identity.bank}_${fileName}`;
    file.setName(newName);
    moveFileToSubfolder(file, parentFolder, PROCESSED_FOLDER_NAME);
    
  } catch (e) {
    Logger.log(`❌ ERROR processing ${file.getName()}: ${e.toString()}`);
    
    // Send Alert Email
    MailApp.sendEmail({
      to: EMAIL_RECIPIENTS,
      subject: `⚠️ Processing Error: ${file.getName()}`,
      body: `The system failed to process the file: ${file.getName()}.\n\nError Details:\n${e.toString()}\n\nPlease check the 'Inbox' folder in Google Drive.`
    });
  }
}

// Logic to identify user based on Account Map or Name Guessing
function identifySource(metadata) {
  const last4 = String(metadata.account_last_4 || "").trim();
  
  // 1. Check the Map (Most Reliable)
  if (ACCOUNT_MAP[last4]) {
    return ACCOUNT_MAP[last4];
  }

  // 2. Fallback: Guess based on name
  const rawName = (metadata.account_holder || "").toLowerCase();
  
  // You can customize these keywords for your family names
  if (rawName.includes("husband_name")) return { user: "Husband", bank: "Unknown Bank" };
  if (rawName.includes("wife_name")) return { user: "Wife", bank: "Unknown Bank" };

  return {
    user: "Unknown User",
    bank: metadata.bank_name || "Unknown Bank"
  };
}

function saveToDatabase(transactions, identity) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Transactions");
  
  const newRows = [];
  transactions.forEach(tx => {
    // Round to 2 decimals
    const cleanAmount = Math.round(Number(tx.amount) * 100) / 100;

    newRows.push([
      tx.date,
      tx.description,
      tx.category,
      cleanAmount,
      identity.user, 
      identity.bank, 
      tx.notes || ""
    ]);
  });
  
  if (newRows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
  }
}

function moveFileToSubfolder(file, currentFolder, targetFolderName) {
  const folders = currentFolder.getFoldersByName(targetFolderName);
  let targetFolder = folders.hasNext() ? folders.next() : currentFolder.createFolder(targetFolderName);
  file.moveTo(targetFolder);
}
