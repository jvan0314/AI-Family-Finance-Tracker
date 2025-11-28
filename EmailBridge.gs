// --- CONFIGURATION ---
// Paste the Folder ID of the 'Inbox' folder shared from your Main Account
const DESTINATION_FOLDER_ID = "PASTE_SHARED_FOLDER_ID_HERE";

// Only process emails from these senders (Security Whitelist)
const ALLOWED_SENDERS = [
  "husband@email.com", 
  "wife@email.com"
];

/**
 * TRIGGER: Run this 'Every 10 Minutes' or 'Every Hour'
 */
function bridgeEmailsToDrive() {
  Logger.log("--- Starting Email Bridge ---");
  
  try {
    const folder = DriveApp.getFolderById(DESTINATION_FOLDER_ID);
    
    // Query: From whitelist, has PDF, is Unread
    const senderQuery = "from:{" + ALLOWED_SENDERS.join(" ") + "}";
    const query = `${senderQuery} has:attachment is:unread`;
    
    Logger.log(`Searching: ${query}`);
    const threads = GmailApp.search(query);
    
    if (threads.length === 0) {
      Logger.log("No new emails found.");
      return;
    }

    let count = 0;
    
    threads.forEach(thread => {
      const messages = thread.getMessages();
      messages.forEach(message => {
        if (message.isUnread()) {
          const attachments = message.getAttachments();
          
          attachments.forEach(att => {
            if (att.getContentType() === MimeType.PDF) {
              folder.createFile(att);
              Logger.log(`✅ Uploaded: ${att.getName()}`);
              count++;
            }
          });
          
          message.markRead(); // Mark read so we don't re-process
        }
      });
      
      // Optional: Archive email to keep inbox clean
      thread.moveToArchive();
    });
    
    Logger.log(`Bridge Complete. Transferred ${count} files.`);
    
  } catch (e) {
    Logger.log(`❌ Critical Error: ${e.toString()}`);
    // If the Shared Folder ID is wrong, this will fail.
    if (e.toString().includes("Access denied")) {
      Logger.log("💡 TIP: Make sure the Main Account shared the folder with this email address as EDITOR.");
    }
  }
}
