/**
 * Tool definitions for the Github agent
 * Tools can either require human confirmation or execute automatically
 */
import { tool, type ToolSet } from "ai";
import { z } from "zod/v3";

import type { Chat } from "./server";
import { getCurrentAgent } from "agents";
import { scheduleSchema } from "agents/schedule";

import { getSandbox } from "@cloudflare/sandbox";
import { env } from "cloudflare:workers";
import { Octokit } from "octokit";

/**
 * Weather information tool that requires human confirmation
 * When invoked, this will present a confirmation dialog to the user
 */

const getAccessToken = () => {
  const { agent } = getCurrentAgent<Chat>();

  if (!agent) {
    throw new Error("Agent not found");
  }

  const state = agent.state as { accessToken: string };

  return state.accessToken;
};

const getWeatherInformation = tool({
  description: "show the weather in a given city to the user",
  inputSchema: z.object({ city: z.string() })
  // Omitting execute function makes this tool require human confirmation
});

/**
 * Local time tool that executes automatically
 * Since it includes an execute function, it will run without user confirmation
 * This is suitable for low-risk operations that don't need oversight
 */
const getLocalTime = tool({
  description: "get the local time for a specified location",
  inputSchema: z.object({ location: z.string() }),
  execute: async ({ location }) => {
    console.log(`Getting local time for ${location}`);
    return "10am";
  }
});

const scheduleTask = tool({
  description: "A tool to schedule a task to be executed at a later time",
  inputSchema: scheduleSchema,
  execute: async ({ when, description }) => {
    // we can now read the agent context from the ALS store
    const { agent } = getCurrentAgent<Chat>();

    function throwError(msg: string): string {
      throw new Error(msg);
    }
    if (when.type === "no-schedule") {
      return "Not a valid schedule input";
    }
    const input =
      when.type === "scheduled"
        ? when.date // scheduled
        : when.type === "delayed"
          ? when.delayInSeconds // delayed
          : when.type === "cron"
            ? when.cron // cron
            : throwError("not a valid schedule input");
    try {
      agent!.schedule(input!, "executeTask", description);
    } catch (error) {
      console.error("error scheduling task", error);
      return `Error scheduling task: ${error}`;
    }
    return `Task scheduled for type "${when.type}" : ${input}`;
  }
});

/**
 * Tool to list all scheduled tasks
 * This executes automatically without requiring human confirmation
 */
const getScheduledTasks = tool({
  description: "List all tasks that have been scheduled",
  inputSchema: z.object({}),
  execute: async () => {
    const { agent } = getCurrentAgent<Chat>();

    try {
      const tasks = agent!.getSchedules();
      if (!tasks || tasks.length === 0) {
        return "No scheduled tasks found.";
      }
      return tasks;
    } catch (error) {
      console.error("Error listing scheduled tasks", error);
      return `Error listing scheduled tasks: ${error}`;
    }
  }
});

/**
 * Tool to cancel a scheduled task by its ID
 * This executes automatically without requiring human confirmation
 */
const cancelScheduledTask = tool({
  description: "Cancel a scheduled task using its ID",
  inputSchema: z.object({
    taskId: z.string().describe("The ID of the task to cancel")
  }),
  execute: async ({ taskId }) => {
    const { agent } = getCurrentAgent<Chat>();
    try {
      await agent!.cancelSchedule(taskId);
      return `Task ${taskId} has been successfully canceled.`;
    } catch (error) {
      console.error("Error canceling scheduled task", error);
      return `Error canceling task ${taskId}: ${error}`;
    }
  }
});

const listIssues = tool({
  description: "List all issues for a given repository",
  inputSchema: z.object({
    owner: z.string(),
    repoName: z.string()
  }),
  execute: async ({ owner, repoName }) => {
    const accessToken = getAccessToken();

    const octokit = new Octokit({
      auth: accessToken
    });

    const issues = await octokit.rest.issues.listForRepo({
      owner,
      repo: repoName
    });

    return issues.data.map((issue) => ({
      id: issue.id,
      title: issue.title,
      description: issue.body,
      state: issue.state,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at
    }));
  }
});

const cloneRepository = tool({
  description: "Clone a given repository",
  inputSchema: z.object({
    repoUrl: z.string()
  }),
  execute: async ({ repoUrl }) => {
    const sandbox = getSandbox(env.Sandbox, "user-123");

    await sandbox.exec(`git config --global user.name "Github Bot"`);

    await sandbox.exec(`git config --global user.email "fake@agent.com"`);

    await sandbox.exec(`git clone ${repoUrl}`);

    return "Repository cloned successfully";
  }
});

const createPullRequest = tool({
  description: "Create a pull request for a given repository",
  inputSchema: z.object({
    repoName: z.string(),
    owner: z.string(),
    title: z.string(),
    body: z.string(),
    branchName: z.string()
  }),
  execute: async ({ repoName, owner, title, body, branchName }) => {
    const accessToken = getAccessToken();

    const octokit = new Octokit({
      auth: accessToken
    });

    await octokit.rest.pulls.create({
      owner,
      repo: repoName,
      title,
      body,
      head: branchName,
      base: "main"
    });

    return "Pull request created successfully";
  }
});

const listAllFiles = tool({
  description:
    "List all files in a given directory where directory is the name of the repository",
  inputSchema: z.object({
    repoName: z.string()
  }),
  execute: async ({ repoName }) => {
    const sandbox = getSandbox(env.Sandbox, "user-123");

    const result = await sandbox.exec(`ls -R /workspace/${repoName}`);

    return result.stdout;
  }
});

const readFile = tool({
  description: "Read a given file from a given repository",
  inputSchema: z.object({
    filePath: z.string()
  }),
  execute: async ({ filePath }: { filePath: string }) => {
    const sandbox = getSandbox(env.Sandbox, "user-123");

    const file = await sandbox.readFile(filePath, {
      encoding: "utf-8"
    });

    return file.content;
  }
});

const writeFile = tool({
  description: "Write a given file to a given repository",
  inputSchema: z.object({
    filePath: z.string(),
    content: z.string()
  }),
  execute: async ({ filePath, content }) => {
    const sandbox = getSandbox(env.Sandbox, "user-123");
    await sandbox.writeFile(filePath, content, {
      encoding: "utf-8"
    });

    return "File written successfully";
  }
});

const commandExecutor = tool({
  description: "A tool to execute a given command in the sandbox",
  inputSchema: z.object({
    command: z.string()
  }),
  execute: async ({ command }) => {
    const sandbox = getSandbox(env.Sandbox, "user-123");

    const result = await sandbox.exec(command);

    if (result.success) {
      console.log("Command executed successfully");
      return result.stdout;
    } else {
      console.error("Error executing command", result.stderr);

      return result.stderr;
    }
  }
});

/**
 * Export all available tools
 * These will be provided to the AI model to describe available capabilities
 */
export const tools = {
  getWeatherInformation,
  getLocalTime,
  scheduleTask,
  getScheduledTasks,
  cancelScheduledTask,
  listIssues,
  cloneRepository,
  listAllFiles,
  readFile,
  writeFile,
  commandExecutor,
  createPullRequest
} satisfies ToolSet;

/**
 * Implementation of confirmation-required tools
 * This object contains the actual logic for tools that need human approval
 * Each function here corresponds to a tool above that doesn't have an execute function
 */
export const executions = {
  getWeatherInformation: async ({ city }: { city: string }) => {
    console.log(`Getting weather information for ${city}`);
    return `The weather in ${city} is sunny`;
  }
};
