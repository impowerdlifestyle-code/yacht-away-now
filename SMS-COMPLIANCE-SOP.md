# SMS Compliance SOP — Yacht Away Now

For Josh / anyone handling customer support after SMS launches.

---

## Scenario: customer says "I'm not getting your text reminders"

### Step 1 — Check Telnyx for opt-out status

1. Telnyx Portal → Messaging → Number Lookup → enter their phone number
2. Look at "Opt-out status" and inbound message history
3. If you see a STOP / UNSUBSCRIBE / CANCEL / END / QUIT message anywhere in their history → they're opted out (Telnyx + the carrier are blocking all our texts to that number)

### Step 2 — What to say (by phone or email — NOT SMS, since SMS to them is blocked)

> "It looks like our text-message system shows your number opted out at some point — that can happen if you ever replied STOP, even by accident. Our system isn't allowed to text you again unless you opt back in yourself. The fastest fix: text the word **START** to (727) 609-2248 from the same phone, and it'll re-enable texts immediately. Or if you'd rather just stick with email, that works too — what's easier for you?"

### Step 3 — What you must NOT do

- **Do not** manually flip the number back on in Telnyx. There is no toggle you can flip — and even if there were, doing so without an inbound START is a TCPA violation. Penalty: $500–$1,500 per unauthorized text.
- **Do not** send a "test" text "just to see if it goes through."
- **Do not** add the number to a different SMS platform or text from your personal phone "to work around it." That's the same TCPA violation.
- **Do not** add a family member's / spouse's number on their behalf without that person's own consent.

### Step 4 — When they text START back

- Telnyx auto-clears the block within seconds.
- The system will auto-send the START confirmation message.
- Send the booking-confirmation text manually if they were missing one.
- Note in their booking record: `Re-opted in via START on YYYY-MM-DD`.

### Step 5 — If they don't want to re-opt-in

- Switch them to **email-only** communication. Tag the booking record: `SMS opt-out — email only`.
- This stays in effect forever. Do not re-add them to SMS even months later, even if they make a new booking. If they want SMS again, they have to text START themselves.

---

## Audit trail — keep these on file for every customer

For every opt-in event (initial form submit OR inbound START), record:

1. Date and time of consent
2. Method (`web form` or `inbound START SMS`)
3. The phone number
4. Source — for web form: the form submission email from Web3Forms; for SMS: Telnyx inbound message ID
5. The exact disclosure language shown at consent (the privacy-policy URL is sufficient since the form text + policy are versioned)

Telnyx retains inbound message logs — don't delete the message history. That **is** your audit trail if a TCPA complaint ever comes in.

---

## Edge cases

| Situation | What to do |
|---|---|
| Customer says they never opted in, but you have a Web3Forms submission with the box checked | Email them: "Here's the form submission from {date} at {time} where the SMS box was checked. Here's our privacy policy: yachtawaynow.com/privacy-policy. We'll opt you out now — no further texts." Then opt them out manually in Telnyx and stop. |
| Customer changes phone numbers | New number = new consent. Don't move SMS consent from the old number. They need to fill out the form (or text START to a campaign-approved keyword if you set one up) from the new number. |
| Group bookings — can I text the bachelorette party guests? | No. Consent is per phone number, between you and the booking party only. Send a single confirmation to the booker; the booker shares with their group via their own channels. |
| Customer texts a question to (727) 609-2248 before opting in | You can reply once to answer their question (consumer-initiated conversation). After that, if you want to send any future booking-related texts, route them through the form opt-in. |
| Customer threatens "I'm reporting this as TCPA / spam" | Stop all SMS to that number immediately. Save all logs (Telnyx history + Web3Forms submission). Email them an apology + opt-out confirmation. If they file a formal complaint, contact the attorney who reviewed your terms before responding further. |

---

## Common mistakes that get carriers to suspend campaigns

- Sending **marketing** content from a **transactional** campaign (e.g., "Book again this fall — 10% off!"). Marketing requires its own campaign + use case + consent.
- Using **shortened links** (bit.ly, tinyurl). Carriers flag these as phishing and block delivery.
- Sending SMS **outside 8am–9pm** local time. TCPA quiet hours.
- Replying to STOP with anything other than the registered STOP confirmation. Don't argue, don't ask "are you sure?" — just let the auto-handler do its job.
- Including pricing or discount language in transactional messages. "Your charter is confirmed" = OK. "Your charter is confirmed — and check out our Bahamas package!" = marketing, suspend-worthy.

---

## Quick reference — keywords Telnyx auto-handles

| Inbound keyword | What happens |
|---|---|
| STOP, UNSUBSCRIBE, CANCEL, END, QUIT, STOPALL | Block + send STOP auto-reply |
| HELP, INFO | Send HELP auto-reply, no block |
| START, UNSTOP, YES (sometimes) | Unblock + send re-opt-in confirmation |

These are carrier-mandated and work even if you don't configure them in Telnyx — but the auto-reply text will be Telnyx's generic default unless you've replaced it (see Inbound Settings on the Messaging Profile).
