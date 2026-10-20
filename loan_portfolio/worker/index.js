import { getAssetFromKV } from "@cloudflare/kv-asset-handler";
import manifestJSON from "__STATIC_CONTENT_MANIFEST";

const assetManifest = JSON.parse(manifestJSON);
const PROJECT_NAME = "Consumer Lending Portfolio Intelligence";

const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, Mcp-Session-Id, Mcp-Protocol-Version"
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (method === "POST" && url.pathname === "/api") {
      return handleForecast(request, env, ctx);
    }
    if (url.pathname === "/mcp" || url.pathname.startsWith("/mcp/")) {
      return handleMCP(request, env, ctx, url);
    }
    return serveAsset(request, env, ctx);
  }
};

// ---------- static assets with SPA fallback ----------
async function serveAsset(request, env, ctx) {
  const pathHasExt = new URL(request.url).pathname.includes(".");
  try {
    return await getAssetFromKV(
      { request, waitUntil: ctx.waitUntil.bind(ctx) },
      {
        ASSET_NAMESPACE: env.__STATIC_CONTENT,
        ASSET_MANIFEST: assetManifest,
        mapRequestToAsset: (req) => {
          const u = new URL(req.url);
          if (!u.pathname.includes(".")) {
            u.pathname = "/index.html";
            return new Request(u.toString(), req);
          }
          return req;
        }
      }
    );
  } catch (err) {
    if (pathHasExt) {
      return new Response("Not found", { status: 404 });
    }
    try {
      const fallback = new Request(new URL("/index.html", request.url).toString(), request);
      const res = await getAssetFromKV(
        { request: fallback, waitUntil: ctx.waitUntil.bind(ctx) },
        { ASSET_NAMESPACE: env.__STATIC_CONTENT, ASSET_MANIFEST: assetManifest }
      );
      return new Response(res.body, { status: 200, headers: res.headers });
    } catch (e) {
      return new Response("Not found", { status: 404 });
    }
  }
}

// read a deployed static JSON file straight from the asset store (no self-fetch)
async function readAsset(path, request, env, ctx) {
  try {
    const u = new URL(request.url);
    u.pathname = path;
    u.search = "";
    const res = await getAssetFromKV(
      { request: new Request(u.toString(), { method: "GET" }), waitUntil: ctx.waitUntil.bind(ctx) },
      { ASSET_NAMESPACE: env.__STATIC_CONTENT, ASSET_MANIFEST: assetManifest }
    );
    return await res.json();
  } catch (e) {
    return null;
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), { status, headers: CORS });
}

// ---------- /api : risk estimator ----------
function parseBand(label) {
  const nums = (String(label).match(/\d+/g) || []).map(Number);
  if (!nums.length) return null;
  if (/</.test(label)) return [0, nums[0] - 1];
  if (/\+/.test(label)) return [nums[0], 1000];
  if (nums.length >= 2) return [nums[0], nums[1]];
  return [nums[0], nums[0]];
}

async function handleForecast(request, env, ctx) {
  try {
    const body = await request.json().catch(() => ({}));
    const inputVal = Number(body.input);
    if (body.input === undefined || body.input === null || body.input === "" || !Number.isFinite(inputVal)) {
      return json({ error: "Invalid input value. Must be a number." }, 400);
    }

    // Optional override: a numeric-key lookup table stored as a secret (wrangler secret put FORECAST_LOOKUP)
    const raw = env.FORECAST_LOOKUP ?? null;
    if (raw) {
      let lookup = null;
      try { lookup = JSON.parse(raw); } catch (e) { lookup = null; }
      const keys = lookup ? Object.keys(lookup).map(Number).filter((n) => !isNaN(n)).sort((a, b) => a - b) : [];
      if (keys.length > 0) {
        const nearest = keys.reduce((a, b) => (Math.abs(b - inputVal) < Math.abs(a - inputVal) ? b : a));
        const result = lookup[nearest];
        return json({
          prediction: result?.value ?? result ?? null,
          confidence: result?.confidence ?? null,
          range_low: result?.range_low ?? null,
          range_high: result?.range_high ?? null,
          input_received: inputVal,
          nearest_key: nearest,
          source: "FORECAST_LOOKUP"
        }, 200);
      }
    }

    // Default: pipeline-computed bad-loan rate by credit-score band (ships with the deployed data)
    const chart = await readAsset("/data/understand/charts/bad_rate_by_score_band.json", request, env, ctx);
    const rows = chart && Array.isArray(chart.data) ? chart.data : [];
    if (rows.length === 0) {
      return json({ error: "Risk-band data not found. Run the pipeline, export_for_frontend.py, then redeploy." }, 503);
    }
    let hit = null;
    for (const r of rows) {
      const b = parseBand(r.label);
      if (b && inputVal >= b[0] && inputVal <= b[1]) { hit = r; break; }
    }
    if (!hit) {
      return json({ error: "Credit score is outside the known bands." }, 400);
    }
    return json({
      prediction: Number(hit.value),
      unit: "percent_ever_90dpd",
      band: hit.label,
      confidence: null,
      range_low: null,
      range_high: null,
      input_received: inputVal,
      nearest_key: null,
      source: "score_band_lookup"
    }, 200);
  } catch (e) {
    return json({ error: "Forecast error: " + e.message }, 500);
  }
}

// ---------- /mcp : read-only tools for Claude ----------
const SEV = { type: "string", enum: ["HIGH", "MEDIUM", "LOW", "ALL"], default: "ALL" };
const TOOLS = [
  { name: "get_kpis", description: "Get all current KPI values for " + PROJECT_NAME, inputSchema: { type: "object", properties: {}, required: [] } },
  { name: "get_insights", description: "Get business insights ranked by severity (HIGH/MEDIUM/LOW)", inputSchema: { type: "object", properties: { severity: SEV }, required: [] } },
  { name: "get_anomalies", description: "Get detected anomalies and unusual business patterns", inputSchema: { type: "object", properties: {}, required: [] } },
  { name: "get_recommendations", description: "Get prioritized action recommendations for the business", inputSchema: { type: "object", properties: {}, required: [] } },
  { name: "get_forecast", description: "Get the latest forecast data and predictions", inputSchema: { type: "object", properties: {}, required: [] } },
  { name: "get_alerts", description: "Get active monitoring alerts", inputSchema: { type: "object", properties: {}, required: [] } },
  { name: "get_summary", description: "Get pipeline run summary and data freshness info", inputSchema: { type: "object", properties: {}, required: [] } }
];
const TOOL_FILES = {
  get_kpis: "/data/understand/kpis.json",
  get_insights: "/data/decide/insights.json",
  get_anomalies: "/data/understand/anomalies.json",
  get_recommendations: "/data/decide/recommendations.json",
  get_forecast: "/data/monitor/forecast.json",
  get_alerts: "/data/monitor/alerts.json"
};

async function runTool(tool, params, request, env, ctx) {
  if (tool === "get_summary") {
    const runLog = await readAsset("/data/meta/run_log.json", request, env, ctx);
    const summary = await readAsset("/data/meta/summary.json", request, env, ctx);
    if (!runLog && !summary) return { error: "Summary not available. Run pipeline first.", status: 503 };
    return { result: { run_log: runLog, summary } };
  }
  const file = TOOL_FILES[tool];
  if (!file) return { error: "Unknown tool: \"" + tool + "\". Call GET /mcp for available tools.", status: 400 };
  const data = await readAsset(file, request, env, ctx);
  if (!data) return { error: tool + ": data not available. Run pipeline first.", status: 503 };
  if (tool === "get_insights") {
    const sev = String((params && params.severity) || "ALL").toUpperCase();
    const out = sev === "ALL" || !Array.isArray(data) ? data : data.filter((i) => i.severity === sev);
    return { result: out, filter: sev };
  }
  return { result: data };
}

function rpcResult(id, result) { return { jsonrpc: "2.0", id, result }; }
function rpcError(id, code, message) { return { jsonrpc: "2.0", id, error: { code, message } }; }

async function handleRpc(msg, request, env, ctx) {
  const id = msg.id ?? null;
  const method = msg.method;
  if (method === "initialize") {
    return rpcResult(id, {
      protocolVersion: (msg.params && msg.params.protocolVersion) || "2025-03-26",
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: PROJECT_NAME + " Analytics MCP", version: "1.0.0" }
    });
  }
  if (method === "ping") return rpcResult(id, {});
  if (method === "tools/list") return rpcResult(id, { tools: TOOLS });
  if (method === "tools/call") {
    const p = msg.params || {};
    const out = await runTool(p.name, p.arguments || {}, request, env, ctx);
    if (out.error) return rpcResult(id, { content: [{ type: "text", text: out.error }], isError: true });
    return rpcResult(id, { content: [{ type: "text", text: JSON.stringify(out.result) }], isError: false });
  }
  if (method === "resources/list") return rpcResult(id, { resources: [] });
  if (method === "prompts/list") return rpcResult(id, { prompts: [] });
  return rpcError(id, -32601, "Method not found: " + method);
}

async function handleMCP(request, env, ctx, url) {
  const method = request.method;

  if (method === "GET") {
    const accept = request.headers.get("Accept") || "";
    if (accept.includes("text/event-stream") && !accept.includes("application/json")) {
      return new Response("SSE stream not supported; use POST /mcp", { status: 405, headers: CORS });
    }
    return json({
      name: PROJECT_NAME + " Analytics MCP",
      description: "Read-only business analytics tools for " + PROJECT_NAME,
      version: "1.0.0",
      usage: "POST /mcp with JSON-RPC (initialize, tools/list, tools/call) or {\"tool\": \"get_kpis\"}",
      tools: TOOLS
    }, 200);
  }

  if (method === "POST") {
    let body = null;
    try { body = await request.json(); } catch (e) { return json(rpcError(null, -32700, "Parse error"), 400); }

    // JSON-RPC 2.0 (standard MCP clients such as Claude)
    if (Array.isArray(body) || (body && body.jsonrpc === "2.0")) {
      const msgs = Array.isArray(body) ? body : [body];
      const replies = [];
      for (const m of msgs) {
        if (m.id === undefined || m.id === null) continue; // notification
        replies.push(await handleRpc(m, request, env, ctx));
      }
      if (replies.length === 0) return new Response(null, { status: 202, headers: CORS });
      return json(Array.isArray(body) ? replies : replies[0], 200);
    }

    // Simple tool call: { "tool": "get_kpis", "params": {} }
    const tool = (body && (body.tool ?? body.name)) || "";
    const params = (body && (body.params ?? body.arguments)) || {};
    const out = await runTool(tool, params, request, env, ctx);
    if (out.error) return json({ error: out.error }, out.status || 400);
    return json({ tool, result: out.result, ...(out.filter ? { filter: out.filter } : {}) }, 200);
  }

  return json({ error: "MCP: use GET /mcp for the manifest, POST /mcp to call tools." }, 405);
}
