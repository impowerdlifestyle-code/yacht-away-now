function doPost(e) {
  var data = JSON.parse(e.postData.contents);

  var calendar = CalendarApp.getDefaultCalendar();

  var dateStr = data.preferred_date; // e.g. "2026-05-15"
  var timeStr = data.preferred_time || "10:00";

  // Determine if the booking date falls in EDT or EST
  // EDT (UTC-4): second Sunday of March → first Sunday of November
  // EST (UTC-5): rest of the year
  var offset = isEasternDST_(dateStr) ? "-04:00" : "-05:00";

  // Create date with explicit Eastern Time offset so it's correct regardless
  // of what timezone the Apps Script runtime uses
  var startDate = new Date(dateStr + "T" + timeStr + ":00" + offset);

  var durationHours = 4;
  if (data.duration === "5hr") durationHours = 5;
  else if (data.duration === "6hr") durationHours = 6;
  else if (data.duration === "overnight") durationHours = 24;
  else if (data.duration === "multi") durationHours = 48;

  var endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);

  var title = "Charter - " + data.first_name + " " + (data.last_name || "") + " (" + (data.charter_type || "TBD") + ")";

  var description = "Name: " + data.first_name + " " + (data.last_name || "") +
    "\nPhone: " + (data.phone || "") +
    "\nEmail: " + (data.email || "") +
    "\nCharter Type: " + (data.charter_type || "TBD") +
    "\nGuests: " + (data.guests || "TBD") +
    "\nDuration: " + (data.duration || "TBD") +
    "\nSpecial Requests: " + (data.message || "None") +
    "\nTimezone: US Eastern (Tampa Bay)" +
    "\n\n-- Created automatically from yachtawaynow.com";

  calendar.createEvent(title, startDate, endDate, {
    description: description,
    guests: data.email || ""
  });

  return ContentService.createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Check if a date string (YYYY-MM-DD) falls within US Eastern Daylight Time
function isEasternDST_(dateStr) {
  var parts = dateStr.split("-");
  var year = parseInt(parts[0]);
  var month = parseInt(parts[1]);
  var day = parseInt(parts[2]);

  // DST starts second Sunday of March at 2am, ends first Sunday of November at 2am
  if (month < 3 || month > 11) return false;
  if (month > 3 && month < 11) return true;

  if (month === 3) {
    // Second Sunday: find first Sunday, add 7
    var firstDay = new Date(year, 2, 1).getDay(); // 0=Sun
    var secondSunday = firstDay === 0 ? 8 : (7 - firstDay) + 8;
    return day >= secondSunday;
  }

  if (month === 11) {
    // First Sunday of November
    var firstDayNov = new Date(year, 10, 1).getDay();
    var firstSunday = firstDayNov === 0 ? 1 : (7 - firstDayNov) + 1;
    return day < firstSunday;
  }

  return false;
}
