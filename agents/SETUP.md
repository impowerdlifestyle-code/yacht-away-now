# Review Responder Agent — Setup Guide

## Step 1: Test Reply Generation (2 min)

Run the test script to see sample replies before connecting Google:

```bash
cd ~/yacht-away-now
ANTHROPIC_API_KEY=your-key-here node agents/test-review-responder.mjs
```

## Step 2: Google Cloud Setup (10 min)

1. Go to https://console.cloud.google.com
2. Create a new project (or use existing): "yacht-away-review-bot"
3. Enable the **Google My Business API**:
   - APIs & Services → Library → search "My Business" → Enable **"Google My Business API"**
4. Create OAuth2 credentials:
   - APIs & Services → Credentials → Create Credentials → **OAuth client ID**
   - Application type: **Desktop app**
   - Name: "review-responder"
   - Download the JSON — you need `client_id` and `client_secret`

## Step 3: Get OAuth2 Refresh Token (5 min)

Run this in your browser to authorize. Replace YOUR_CLIENT_ID:

```
https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost&response_type=code&scope=https://www.googleapis.com/auth/business.manage&access_type=offline&prompt=consent
```

After authorizing, you'll be redirected to `http://localhost/?code=XXXXX`. Copy the `code` value.

Exchange the code for a refresh token:

```bash
curl -X POST https://oauth2.googleapis.com/token \
  -d "code=PASTE_CODE_HERE" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=http://localhost" \
  -d "grant_type=authorization_code"
```

Save the `refresh_token` from the response. This doesn't expire.

## Step 4: Get Your GBP Account & Location IDs (2 min)

Use the access token from the previous step:

```bash
# Get account ID
curl -H "Authorization: Bearer ACCESS_TOKEN" \
  https://mybusiness.googleapis.com/v4/accounts

# Get location ID (replace ACCOUNT_ID)
curl -H "Authorization: Bearer ACCESS_TOKEN" \
  https://mybusiness.googleapis.com/v4/accounts/ACCOUNT_ID/locations
```

## Step 5: Set Environment Variables

Add to your shell profile (~/.zshrc):

```bash
export GOOGLE_REVIEW_REFRESH_TOKEN="your-refresh-token"
export GOOGLE_CLIENT_ID="your-client-id"
export GOOGLE_CLIENT_SECRET="your-client-secret"
export GBP_ACCOUNT_ID="your-account-id"
export GBP_LOCATION_ID="your-location-id"
export ANTHROPIC_API_KEY="your-anthropic-key"
```

Then `source ~/.zshrc`.

## Step 6: Test Full Pipeline

```bash
cd ~/yacht-away-now
node agents/review-responder.mjs
```

## Step 7: Schedule It

In Claude Code, run:

```
/schedule
```

Create a trigger that runs every 6 hours:
- Cron: `0 */6 * * *`
- Command: `cd ~/yacht-away-now && node agents/review-responder.mjs`
