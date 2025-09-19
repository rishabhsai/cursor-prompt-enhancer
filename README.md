Cursor Prompt Enhancer

Turn rough ideas into crisp, actionable prompts — instantly. One click to rewrite messy intent into a clean prompt your AI coding assistant can execute.

Note: To use OpenAI/AIML, set the provider to `openai` and paste your API key in Settings (search “Cursor Prompt Enhancer”) or run “Prompt: Set OpenAI API Key”.

Highlights
- One‑click Enhance in the editor title, context menu, and status bar.
- Super fast: optional streaming preview; minimal, focused system prompt.
- Local enhancer (no network) or OpenAI‑compatible API (AIML, OpenAI, etc.).
- Smart defaults: replace selection and copy to clipboard in one go.

Screenshots (placeholders)
- <add image of editor title wand + status bar>
- <add image of being able to right‑click>
- <add image of streaming preview>

Quick Start
1) Install the extension (VSIX or Marketplace).
2) Optional: Open Settings → search “Cursor Prompt Enhancer” → set Provider to `openai` and paste your key, or run “Prompt: Set OpenAI API Key”.
3) Select text and run “Enhance Prompt” via:
   - Right‑click context menu
   - Editor title wand
   - Status bar “Enhance”
   - Keyboard shortcut: Cmd+Shift+Alt+E (Mac) / Ctrl+Shift+Alt+E (Win/Linux)

What it does
- Rewrites your selection into a terse, high‑signal “Enhanced Prompt” in Markdown.
- Applies your Default Action (insert, replace, open new, or just copy).
- Copies to clipboard when you pick an “…AndCopy” action or “Just Copy”.

Default Actions
- `insertBelow`
- `replaceSelection`
- `openNew`
- `insertBelowAndCopy`
- `replaceSelectionAndCopy`
- `openNewAndCopy`
- `copyOnly` (Just Copy — copies to clipboard and shows a toast)

OpenAI / AIML Setup
- Provider: `openai`
- API Base: `https://api.openai.com/v1` (OpenAI) or `https://api.aimlapi.com/v1` (AIML)
- Model: e.g., `gpt-5-mini` (AIML) or `gpt-4o-mini`
- Key: set in Settings (search “OpenAI API Key”) or run “Prompt: Set OpenAI API Key”

Settings
- `cursorPromptEnhancer.provider` — `local` or `openai`
- `cursorPromptEnhancer.defaultAction` — one of the actions above (includes `copyOnly`)
- `cursorPromptEnhancer.systemPrompt` — editable system prompt used in OpenAI mode
- `cursorPromptEnhancer.tone` — `concise` | `balanced` | `detailed` (used by local enhancer)
- `cursorPromptEnhancer.openai.apiBase` — API base URL for OpenAI‑compatible services
- `cursorPromptEnhancer.openai.model` — model name
- `cursorPromptEnhancer.openai.streaming` — stream to a live preview (default: off)
- `cursorPromptEnhancer.openai.useTemperature` — include `temperature` parameter
- `cursorPromptEnhancer.openai.temperature` — value to use when `useTemperature` is on

Performance Tips
- Keep streaming OFF for clean insertion; turn ON to see tokens appear sooner.
- Use `replaceSelectionAndCopy` for the fastest workflow.
- Keep your selection focused — smaller inputs produce faster, tighter outputs.

Privacy
- Local mode never leaves your machine.
- OpenAI mode only sends your selected text and prompt to the configured API base.

Development
- Install deps: `npm install`
- Build: `npm run compile`
- Launch Extension: F5 to open an Extension Development Host
- Keybinding is defined in `package.json` (Cmd/Ctrl+Shift+Alt+E)
