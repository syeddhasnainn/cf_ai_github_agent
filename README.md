# 🤖 GitHub AI Agent

An intelligent AI-powered agent for managing and interacting with your GitHub repositories. Built with **Cloudflare Workers** and **Vercel AI SDK**, this agent enables you to leverage AI capabilities to automate GitHub workflows, analyze code, manage issues, and perform repository operations through a conversational interface.

## ✨ Features

- 💬 **Conversational Interface** - Chat naturally with your AI GitHub assistant
- 🔐 **Secure GitHub Integration** - OAuth-based authentication with GitHub
- 📂 **Repository Management** - Clone, browse, and analyze repositories
- 🐛 **Issue Management** - List, create, and manage GitHub issues
- 🔄 **Pull Request Automation** - Create pull requests programmatically
- 📝 **Code Analysis** - Read, analyze, and modify files in repositories
- 💾 **Sandbox Environment** - Execute commands safely in isolated containers
- 🎨 **Modern UI** - Beautiful, responsive dark/light theme interface
- 🌓 **Theme Support** - Seamless dark/light mode switching
- ⚡️ **Real-time Streaming** - Stream AI responses for instant feedback

## 🚀 Quick Start

### Prerequisites

- Cloudflare account with Workers enabled (Required for Sandbox)
- GitHub account with OAuth app registered
- OpenAI API key
- Node.js 18+ and npm

### Setup

1. **Clone the repository:**

```bash
git clone <repository-url>
cd cf_ai_github_agent
npm install
```

2. **Set up environment variables:**

Create a `.dev.vars` file in the root directory:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

3. **Configure GitHub OAuth:**

- Go to GitHub Settings → Developer settings → OAuth Apps
- Create a new OAuth App
- Set Authorization callback URL to `http://localhost:8787/callback` (for local development)
- Add your `Client ID` and `Client Secret` to the `wrangler.jsonc` configuration

4. **Run locally:**

```bash
npm start
```

Visit `http://localhost:8787` in your browser and sign in with GitHub.

5. **Deploy to Cloudflare Workers:**

```bash
npm run deploy
```

## 📋 Available Tools

### GitHub Operations

- **List Issues** - Retrieve all issues from a specified repository
- **Create Pull Request** - Create pull requests programmatically
- **Clone Repository** - Clone GitHub repositories to the sandbox
- **List Repository Files** - Browse repository structure

### Code Manipulation

- **Read File** - Read and display file contents
- **Write File** - Modify or create files in repositories
- **Command Executor** - Execute arbitrary commands in the sandbox

## 🏗️ Project Structure

```
├── src/
│   ├── app.tsx                 # React chat UI component
│   ├── server.ts               # Agent logic and OpenAI integration
│   ├── tools.ts                # Tool definitions for the agent
│   ├── client.tsx              # Client entry point
│   ├── utils.ts                # Utility functions
│   ├── styles.css              # Global styles
│   ├── components/             # Reusable UI components
│   │   ├── avatar/
│   │   ├── button/
│   │   ├── card/
│   │   ├── modal/
│   │   └── ...
│   └── hooks/                  # Custom React hooks
├── public/                     # Static assets
├── dist/                       # Build output
├── wrangler.jsonc              # Cloudflare Workers configuration
├── vite.config.ts              # Vite configuration
└── package.json
```

## 🔧 Customization

### Adding New Tools

Edit `src/tools.ts` to add new tools:

```typescript
const myCustomTool = tool({
  description: "Description of what your tool does",
  inputSchema: z.object({
    param1: z.string(),
    param2: z.number().optional()
  }),
  execute: async ({ param1, param2 }) => {
    // Implementation here
    return "Result";
  }
});
```

Add the tool to the `tools` export:

```typescript
export const tools = {
  // ... existing tools
  myCustomTool
} satisfies ToolSet;
```

### Modifying the UI

The chat interface is built with React and Tailwind CSS. Customize it in `src/app.tsx`:

- Update theme colors in `src/styles.css`
- Add new UI components in `src/components/`
- Modify message rendering and tool interaction dialogs
- Customize the header and controls

### Using Different AI Models

The starter uses OpenAI GPT-4, but you can switch to other providers:

**Option 1: Cloudflare Workers AI**

```bash
npm install workers-ai-provider
```

Update `src/server.ts`:

```typescript
import { createWorkersAI } from "workers-ai-provider";

const workersai = createWorkersAI({ binding: env.AI });
const model = workersai("@cf/meta/llama-3.1-70b-instruct");
```

**Option 2: Anthropic**

```bash
npm install @anthropic-ai/sdk
```

## 🔐 Security Considerations

- **Authentication**: Uses GitHub OAuth for secure access - tokens are stored client-side
- **Sandbox Execution**: Commands execute in isolated Cloudflare Sandbox containers
- **Token Management**: Keep your OpenAI API key secure in `.dev.vars`
- **Access Control**: Only authenticated GitHub users can access the agent

## 🚢 Deployment

### Deploy to Cloudflare Workers

```bash
npm run deploy
```

This will:

1. Build the React frontend
2. Bundle the worker code
3. Deploy to your Cloudflare account
4. Build and deploy the sandbox container

Monitor deployments in your Cloudflare Dashboard.

### Environment Variables in Production

Add secrets to your Cloudflare Workers in the dashboard or via CLI:

```bash
wrangler secret put OPENAI_API_KEY
```

## 📚 Learn More

- [Cloudflare Agents Documentation](https://developers.cloudflare.com/agents/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Vercel AI SDK](https://sdk.vercel.ai/)
- [GitHub REST API](https://docs.github.com/en/rest)
- [Octokit.js](https://github.com/octokit/octokit.js)

## 🤝 Use Cases

1. **GitHub Automation**
   - Automate issue creation and management
   - Generate pull requests based on analysis
   - Monitor repositories and generate reports

2. **Code Analysis**
   - Analyze code quality and suggest improvements
   - Generate documentation from code
   - Identify potential bugs or security issues

3. **Repository Management**
   - Batch operations across multiple repositories
   - Automated code refactoring
   - Template-based file generation

4. **CI/CD Integration**
   - Intelligent workflow triggering
   - Automated testing and deployment decisions
   - Release automation

## 🐛 Troubleshooting

### "Requires authentication" Error

Ensure your GitHub OAuth token is valid:

1. Check that you're signed in with GitHub
2. Verify token permissions include `repo` and `user` scopes
3. Re-authenticate if the token has expired

### Sandbox Execution Errors

- Check that commands are valid and supported
- Ensure file paths are correctly formatted
- Verify the repository has been cloned first

### WebSocket Connection Issues

- Check your internet connection
- Ensure the Cloudflare Worker is deployed
- Check browser console for connection errors

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙋 Support

For issues, questions, or contributions, please open an issue on the repository or reach out to the development team.

---

Built with ❤️ using [Cloudflare Workers](https://workers.cloudflare.com), [Vercel AI SDK](https://sdk.vercel.ai), and [React](https://react.dev)
