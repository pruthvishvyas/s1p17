# Consumer Lending Portfolio Intelligence - Your Business Dashboard

## What this is
Your private business analytics dashboard. It shows you what's happening
in your business, helps you decide what to do about it, and tracks whether
you're on target - all in one place.

## Your 3 sections
**UNDERSTAND** - See your key numbers, charts, and any unusual patterns
**DECIDE** - Read insights and recommendations written in plain English
**MONITOR** - Track forecasts, set targets, and get alerts automatically

## New here? Start with the User Manual tab
Click "User Manual" in the sidebar. It explains every section in plain English.

## Deployment Checklist
- [ ] npm install (run once - generates package-lock.json)
- [ ] wrangler.toml: name = "loan_portfolio", main before [site], bucket = "./dist"
- [ ] npm run build -> check dist/ folder was created
- [ ] npx wrangler deploy -> note the live URL
- [ ] (optional) wrangler secret put FORECAST_LOOKUP -> numeric-key lookup JSON; without it the credit-score risk check uses the pipeline's score-band data
- [ ] Test: open live URL -> dashboard loads with data
- [ ] Test: open live URL/mcp -> MCP manifest appears

## How to run locally
1. npm install
2. npm run dev -> open http://localhost:5173

## How to deploy
1. npm run build
2. npx wrangler deploy
-> Live at: https://loan_portfolio.<your-subdomain>.workers.dev

## MCP Integration (for Claude)
Add this URL to Claude as an MCP connector:
https://loan_portfolio.<your-subdomain>.workers.dev/mcp
Claude can then read your live business data directly (read-only tools:
get_kpis, get_insights, get_anomalies, get_recommendations, get_forecast, get_alerts, get_summary).

## How to update your dashboard
Run the pipeline: python main.py
Then: python export_for_frontend.py
Then: python generate_react_frontend.py (refreshes public/data) and npm run build && npx wrangler deploy

## Support
[Your contact details]
