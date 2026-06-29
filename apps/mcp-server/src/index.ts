#!/usr/bin/env node
// ─── CAPGuard MCP Server ─────────────────────────────────────────────────────
// Exposes CAPGuard evaluation and proof verification as MCP tools.
// Works with Claude Desktop, Cursor, agy, and any MCP-compatible client.
//
// Tools:
//   evaluate_agents  - Trigger trust evaluation for a given intent
//   verify_report    - Verify cryptographic proof of a trust report

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

const CAPGUARD_API_URL = process.env.CAPGUARD_API_URL || "http://localhost:3001";

// ─── Server Setup ────────────────────────────────────────────────────────────

const server = new Server(
  {
    name: "capguard",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ─── Tool Definitions ────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "evaluate_agents",
      description:
        "Trigger CAPGuard TrustRouter to evaluate CROO candidate agents via real paid CAP orders. " +
        "Returns a trust report with scores, recommended agent, and cryptographic proof hashes.",
      inputSchema: {
        type: "object",
        properties: {
          intent: {
            type: "string",
            description: "The buyer's task intent — what the agent should do.",
          },
          auto_route: {
            type: "boolean",
            description:
              "If true, CAPGuard will also create a second-stage execution order to the winning agent (route-and-execute). Default: false.",
          },
          buyer_wallet: {
            type: "string",
            description: "Optional buyer wallet identifier for tracking.",
          },
        },
        required: ["intent"],
      },
    },
    {
      name: "verify_report",
      description:
        "Verify the cryptographic integrity of a CAPGuard trust report using its SHA-256 report hash. " +
        "Returns whether the report hash and execution log hash are valid.",
      inputSchema: {
        type: "object",
        properties: {
          report_hash: {
            type: "string",
            description: "The SHA-256 report hash from a CAPGuard trust report.",
          },
        },
        required: ["report_hash"],
      },
    },
  ],
}));

// ─── Tool Handlers ────────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "evaluate_agents") {
    const { intent, auto_route = false, buyer_wallet = "mcp_client" } = args as {
      intent: string;
      auto_route?: boolean;
      buyer_wallet?: string;
    };

    if (!intent?.trim()) {
      throw new McpError(ErrorCode.InvalidParams, "intent is required and cannot be empty");
    }

    try {
      const response = await fetch(`${CAPGUARD_API_URL}/api/jobs/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent, auto_route, buyer_wallet }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new McpError(
          ErrorCode.InternalError,
          `CAPGuard API error ${response.status}: ${errorBody}`
        );
      }

      const report = await response.json();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                report_id: report.report_id,
                recommended_agent: report.recommended_service_id,
                recommended_reason: report.recommended_reason,
                average_score: report.average_score,
                total_candidates: report.total_candidates,
                completed_candidates: report.completed_candidates,
                report_hash: report.report_hash,
                routed_execution: report.routed_execution,
                verify_url: `${CAPGUARD_API_URL}/api/verify/${report.report_hash}`,
                full_report: report,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error: any) {
      if (error instanceof McpError) throw error;
      throw new McpError(ErrorCode.InternalError, `Failed to call CAPGuard: ${error.message}`);
    }
  }

  if (name === "verify_report") {
    const { report_hash } = args as { report_hash: string };

    if (!report_hash?.trim()) {
      throw new McpError(ErrorCode.InvalidParams, "report_hash is required");
    }

    try {
      const response = await fetch(`${CAPGUARD_API_URL}/api/verify/${report_hash}`);
      const result = await response.json();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                ...result,
                summary: result.valid
                  ? "✅ Report proof is VALID — all hashes verified"
                  : "❌ Report proof is INVALID — hashes do not match",
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error: any) {
      throw new McpError(ErrorCode.InternalError, `Failed to verify report: ${error.message}`);
    }
  }

  throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
});

// ─── Start Server ────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("CAPGuard MCP server running — waiting for tool calls via stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
