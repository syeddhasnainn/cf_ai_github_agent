import {
  routeAgentRequest,
  type Connection,
  type Schedule,
  type WSMessage
} from "agents";

import { openai } from "@ai-sdk/openai";
import { AIChatAgent } from "agents/ai-chat-agent";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  stepCountIs,
  streamText,
  type StreamTextOnFinishCallback,
  type ToolSet
} from "ai";
import { executions, tools } from "./tools";
import { cleanupMessages, processToolCalls } from "./utils";
// import { env } from "cloudflare:workers";
import { getSandbox } from "@cloudflare/sandbox";
import { Octokit } from "octokit";

export { Sandbox } from "@cloudflare/sandbox";

if (!process.env.GITHUB_CLIENT_SECRET || !process.env.GITHUB_CLIENT_ID) {
  throw new Error("GITHUB_CLIENT_SECRET and GITHUB_CLIENT_ID are required");
}

const model = openai("gpt-4o-2024-11-20");
// Cloudflare AI Gateway
// const openai = createOpenAI({
//   apiKey: env.OPENAI_API_KEY,
//   baseURL: env.GATEWAY_BASE_URL,
// });

/**
 * Chat Agent implementation that handles real-time AI chat interactions
 */

export class Chat extends AIChatAgent<Env> {
  /**
   * Handles incoming chat messages and manages the response stream
   */

  initialState = {
    accessToken: null
  };

  private currentMessage?: WSMessage;

  async onMessage(connection: Connection, message: WSMessage): Promise<void> {
    this.currentMessage = message;
    return super.onMessage(connection, message);
  }

  async onChatMessage(
    onFinish: StreamTextOnFinishCallback<ToolSet>,
    _options?: { abortSignal?: AbortSignal }
  ) {
    // const mcpConnection = await this.mcp.connect(
    //   "https://path-to-mcp-server/sse"
    // );

    const state = this.state as { accessToken: string };

    const accessToken = state.accessToken;

    // Collect all tools, including MCP tools
    const allTools = {
      ...tools,
      ...this.mcp.getAITools()
    };

    const { owner, repoName, cloneUrl } = JSON.parse(
      JSON.parse(this.currentMessage as string).init.body
    );

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        // Clean up incomplete tool calls to prevent API errors

        const cleanedMessages = cleanupMessages(this.messages);

        // Process any pending tool calls from previous messages
        // This handles human-in-the-loop confirmations for tools
        const processedMessages = await processToolCalls({
          messages: cleanedMessages,
          dataStream: writer,
          tools: allTools,
          executions
        });

        const result = streamText({
          system: `You are a software engineering agent, you can fix issues in a repo, create PRs, and do various tasks... 

          - create a feature branch
          - make the changes in the necessary files
          - commit the changes
          - push the changes
          - create a PR


          Before doing any operation, make sure to print the current working directory using the commandExecutor tool.

          You might have to use the read/write tools multiple times to fix the issue.

          when using the commandExecutor tool, make sure to print the current working directory first to avoid any errors.

Files are stored in the /workspace/${repoName} directory. So when the user asks to read a file, you should use the readFile tool to read the file. You have to add the name of the file after the /workspace/${repoName} directory.

Github Token: ${accessToken}

make sure to commit the changes before pushing the changes. use the commandExecutor tool to commit the changes.

	git commit -m "commit message"

when pushing the changes use the authenticated link and use the commandExecutor tool to push the changes. make sure you are inside the repository directory.

	git push https://oauth2:${accessToken}@github.com/${owner}/${repoName}.git branch-name

Github Repo Name: ${repoName}
Github Repo Clone URL: ${cloneUrl}
`,

          messages: convertToModelMessages(processedMessages),
          model,
          tools: allTools,
          // Type boundary: streamText expects specific tool types, but base class uses ToolSet
          // This is safe because our tools satisfy ToolSet interface (verified by 'satisfies' in tools.ts)
          onFinish: onFinish as unknown as StreamTextOnFinishCallback<
            typeof allTools
          >,
          stopWhen: stepCountIs(25)
        });

        writer.merge(result.toUIMessageStream());
      }
    });

    return createUIMessageStreamResponse({ stream });
  }
  async executeTask(description: string, _task: Schedule<string>) {
    await this.saveMessages([
      ...this.messages,
      {
        id: generateId(),
        role: "user",
        parts: [
          {
            type: "text",
            text: `Running scheduled task: ${description}`
          }
        ],
        metadata: {
          createdAt: new Date()
        }
      }
    ]);
  }
}

/**
 * Worker entry point that routes incoming requests to the appropriate handler
 */
export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext) {
    const url = new URL(request.url);

    console.log(url.pathname);

    if (url.pathname === "/api/auth") {
      const code = url.searchParams.get("code");

      if (!code) {
        return new Response("Missing Code", { status: 400 });
      }

      try {
        const token = await fetch(
          `https://github.com/login/oauth/access_token`,
          {
            method: "POST",
            body: JSON.stringify({
              client_id: process.env.GITHUB_CLIENT_ID || "",
              client_secret: process.env.GITHUB_CLIENT_SECRET || "",
              code: code
            }),
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json"
            }
          }
        );

        const data = await token.json();

        const redirectUrl = new URL(request.url);
        redirectUrl.pathname = "/";
        redirectUrl.search = "";

        redirectUrl.hash = `access_token=${data.access_token}&token_type=${data.token_type}`;

        return Response.redirect(redirectUrl.toString(), 302);
      } catch (error) {
        console.error("error:", error);
        return new Response("Internal Server Error", { status: 500 });
      }
    }

    if (url.pathname === "/api/list") {
      console.log("list");

      const sandbox = getSandbox(env.Sandbox, "user-123");

      try {
        const result = await sandbox.exec(`pwd`);
        console.log("result:", result);

        if (result.success) {
          console.log("Repository listed successfully");
          return Response.json({ result: result.stdout });
        } else {
          console.error("Error listing repository", result.stderr);

          return Response.json({ error: result.stderr });
        }
      } catch (error) {
        console.error("error:", error);
      }
    }

    if (url.pathname === "/api/getRepos") {
      const body = (await request.json()) as { accessToken: string };

      const accessToken = body.accessToken;

      const octokit = new Octokit({
        auth: accessToken
      });

      const repos = await octokit.rest.repos.listForAuthenticatedUser({
        per_page: 100
      });

      const filteredRepos = repos.data.filter(
        (repo) => repo.has_issues && repo.open_issues > 0
      );

      return Response.json(filteredRepos);
    }

    if (url.pathname === "/check-open-ai-key") {
      const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
      return Response.json({
        success: hasOpenAIKey
      });
    }
    if (!process.env.OPENAI_API_KEY) {
      console.error(
        "OPENAI_API_KEY is not set, don't forget to set it locally in .dev.vars, and use `wrangler secret bulk .dev.vars` to upload it to production"
      );
    }

    return (
      // Route the request to our agent or return 404 if not found
      (await routeAgentRequest(request, env)) ||
      new Response("Not found", { status: 404 })
    );
  }
} satisfies ExportedHandler<Env>;
