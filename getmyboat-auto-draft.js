// GetMyBoat Auto-Draft Responder for Google Apps Script
// Checks for new GetMyBoat inquiry emails, generates AI draft replies

var ANTHROPIC_API_KEY = PropertiesService.getScriptProperties().getProperty("ANTHROPIC_API_KEY");
var LABEL_PROCESSED = "GetMyBoat-Processed";

function checkGetMyBoatInquiries() {
  // Ensure the processed label exists
  var label = GmailApp.getUserLabelByName(LABEL_PROCESSED);
  if (!label) {
    label = GmailApp.createLabel(LABEL_PROCESSED);
  }

  // Search for unprocessed GetMyBoat inquiry emails
  var threads = GmailApp.search("from:support@getmyboat.com subject:Inquiry -label:" + LABEL_PROCESSED, 0, 10);

  if (threads.length === 0) {
    Logger.log("No new GetMyBoat inquiries found.");
    return;
  }

  for (var i = 0; i < threads.length; i++) {
    var thread = threads[i];
    var messages = thread.getMessages();
    var latestMessage = messages[messages.length - 1];
    var body = latestMessage.getPlainBody();
    var subject = latestMessage.getSubject();

    // Extract trip details from email body
    var details = extractTripDetails(body, subject);

    // Generate AI response
    var draftReply = generateAIResponse(details);

    if (draftReply) {
      // Create a draft reply
      thread.createDraftReply(draftReply);
      Logger.log("Draft created for inquiry from: " + details.guestName);
    }

    // Mark as processed
    thread.addLabel(label);
  }
}

function extractTripDetails(body, subject) {
  var details = {
    guestName: "",
    date: "",
    time: "",
    duration: "",
    groupSize: "",
    specialRequest: "",
    departureLocation: ""
  };

  // Extract guest name - appears before "is actively comparing"
  var nameMatch = body.match(/(?:NEW BOOKING REQUEST\s*\n?\s*)([A-Za-z\s\u00C0-\u024F]+?)(?:\s+is actively comparing)/);
  if (nameMatch) {
    details.guestName = nameMatch[1].trim();
  }

  // Also try to get full name from "Special request from:" section
  var fullNameMatch = body.match(/Special request from:\s*\n?\s*([^\n]+)/);
  if (fullNameMatch) {
    details.guestName = fullNameMatch[1].trim();
  }

  // Extract date
  var dateMatch = body.match(/(?:Depart|Departure)[\s\S]*?(\w+,\s+\w+\s+\d+,\s+\d{4})/);
  if (dateMatch) {
    details.date = dateMatch[1].trim();
  }

  // Extract time
  var timeMatch = body.match(/Depart\s*\n?\s*(\d+:\d+\s*[APM]+)/i);
  if (timeMatch) {
    details.time = timeMatch[1].trim();
  }

  // Extract duration
  var durationMatch = body.match(/Duration\s*\n?\s*(\d+\s*hours?)/i);
  if (durationMatch) {
    details.duration = durationMatch[1].trim();
  }

  // Extract group size
  var groupMatch = body.match(/Group Size\s*\n?\s*(\d+\s*Guests?)/i);
  if (groupMatch) {
    details.groupSize = groupMatch[1].trim();
  }

  // Extract special request (text after the guest name in the special request section)
  var requestMatch = body.match(/Special request from:[\s\S]*?Info\s*\n([\s\S]*?)(?:Guests are much more|$)/i);
  if (requestMatch && requestMatch[1].trim().length > 2) {
    details.specialRequest = requestMatch[1].trim();
  }

  // Extract departure location
  var locationMatch = body.match(/Departure Location\s*\n?\s*Departure Location\s*\n?\s*[\d.,\s-]+\s*\n?\s*([^\n]+)/);
  if (locationMatch) {
    details.departureLocation = locationMatch[1].trim();
  }

  return details;
}

function generateAIResponse(details) {
  if (!ANTHROPIC_API_KEY) {
    Logger.log("ERROR: ANTHROPIC_API_KEY not set in script properties");
    return null;
  }

  var firstName = details.guestName.split(" ")[0] || "there";

  var prompt = "You are responding to a GetMyBoat booking inquiry for Yacht Away Now, a luxury private yacht charter company in St. Petersburg, Florida operating a 52ft Marquis Flybridge.\n\n" +
    "Trip details:\n" +
    "- Guest name: " + details.guestName + "\n" +
    "- Date: " + details.date + "\n" +
    "- Time: " + details.time + "\n" +
    "- Duration: " + details.duration + "\n" +
    "- Group size: " + details.groupSize + "\n" +
    "- Departure: " + details.departureLocation + "\n" +
    "- Special request: " + (details.specialRequest || "None") + "\n\n" +
    "Write a warm, personal, and enthusiastic response. Guidelines:\n" +
    "- Address them by first name (" + firstName + ")\n" +
    "- Confirm you received their inquiry and are excited about their trip\n" +
    "- Reference the specific details (date, group size, duration)\n" +
    "- Briefly highlight what makes the experience special (3 decks, BYOB, swim platform, Bluetooth stereo)\n" +
    "- Mention that charters are private — they won't share with strangers\n" +
    "- Let them know you'll send an official offer shortly\n" +
    "- Invite them to call or text (727) 609-2248 with any questions\n" +
    "- Sign off as Captain Josh, Yacht Away Now\n" +
    "- Keep it 4-6 sentences, conversational and genuine\n" +
    "- Do not use excessive emojis — one at most";

  var payload = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 400,
    messages: [
      { role: "user", content: prompt }
    ]
  };

  var options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch("https://api.anthropic.com/v1/messages", options);
    var data = JSON.parse(response.getContentText());

    if (data.content && data.content[0] && data.content[0].text) {
      return data.content[0].text;
    } else {
      Logger.log("AI response error: " + response.getContentText());
      return null;
    }
  } catch (e) {
    Logger.log("API call failed: " + e.toString());
    return null;
  }
}

// Set up trigger to run every 5 minutes
function createTrigger() {
  // Remove existing triggers first
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "checkGetMyBoatInquiries") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger("checkGetMyBoatInquiries")
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log("Trigger created: checkGetMyBoatInquiries runs every 5 minutes");
}
