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
    
    // Query: From whitelist, has attachment, is Unread
    const senderQuery = "from:{" + ALLOWED_SENDERS.join(" ") + "}";
    const query = `${senderQuery} has:attachment is:unread`;
    
    Logger.log(`Searching: ${query}`);
    const threads = GmailApp.search(query);
    
    if (threads.length === 0) {
      Logger.log("No new emails found.");
      return;
    }

    threads.forEach(thread => {
      const messages = thread.getMessages();
      
      messages.forEach(message => {
        if (message.isUnread()) {
          const sender = message.getFrom(); // Get who sent it (e.g. "Name <email@Example.com>")
          const attachments = message.getAttachments();
          
          let uploadedList = [];
          let ignoredList = [];
          let errorList = [];

          // Process Attachments
          attachments.forEach(att => {
            try {
              if (att.getContentType() === MimeType.PDF) {
                folder.createFile(att);
                uploadedList.push(att.getName());
                Logger.log(`✅ Uploaded: ${att.getName()}`);
              } else {
                ignoredList.push(att.getName() + " (Not a PDF)");
              }
            } catch (err) {
              errorList.push(att.getName() + " (Drive Error)");
              Logger.log(`❌ Error uploading ${att.getName()}: ${err.toString()}`);
            }
          });

          // SECURITY CHECK: Verify sender is in whitelist before replying
          // Extracts email if format is "Name <email@example.com>" or just "email@example.com"
          const emailMatch = sender.match(/<([^>]+)>/);
          const pureEmail = emailMatch ? emailMatch[1] : sender;

          if (ALLOWED_SENDERS.includes(pureEmail)) {
            // Send Confirmation Email Back to Sender
            sendConfirmation(sender, uploadedList, ignoredList, errorList);
          } else {
            Logger.log(`⚠️ Skipped confirmation to unauthorized sender: ${pureEmail}`);
          }
          
          message.markRead(); // Mark read so we don't re-process
        }
      });
      
      // Archive email to keep inbox clean
      thread.moveToArchive();
    });
    
    Logger.log(`Bridge Complete.`);
    
  } catch (e) {
    Logger.log(`❌ Critical Error: ${e.toString()}`);
  }
}

// --- HELPER: SEND CONFIRMATION ---
function sendConfirmation(recipient, uploaded, ignored, errors) {
  let subject = "";
  let body = "";

  if (uploaded.length > 0 && errors.length === 0) {
    subject = "✅ Success: Statements Uploaded";
    body = `The following files were successfully saved to Google Drive:\n\n`;
    body += uploaded.map(f => `📄 ${f}`).join("\n");
  } else if (errors.length > 0) {
    subject = "⚠️ Issue: Upload Failed";
    body = `There were issues uploading your files:\n\n`;
    if (uploaded.length > 0) body += `Saved:\n${uploaded.join("\n")}\n\n`;
    body += `Errors:\n${errors.join("\n")}`;
  } else if (ignored.length > 0) {
    subject = "ℹ️ Skipped: Non-PDF Files Detected";
    body = `No PDFs were found. The following files were ignored:\n\n`;
    body += ignored.join("\n");
  } else {
    return; // Don't send empty emails
  }

  if (ignored.length > 0 && uploaded.length > 0) {
    body += `\n\n(Ignored non-PDF files: ${ignored.join(", ")})`;
  }

  body += `\n\n- Project Ledger Bot`;

  MailApp.sendEmail({
    to: recipient,
    subject: subject,
    body: body
  });
}
