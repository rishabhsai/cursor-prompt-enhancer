**Cursor Prompt Enhancer**

- One-click button to enhance any prompt like v0’s “Prompt Enhancer”.
- Works locally (no network) or via OpenAI if configured.

**Features**
- Editor title button: click the wand to enhance the current selection.
- Command palette: “Enhance Prompt” to enhance selection or pasted text.
- Local enhancer: deterministic template that structures your intent clearly.
- OpenAI mode: optional, for higher quality rewrites.

**Usage**
- Select the prompt text in an editor and run `Prompt: Enhance Prompt` (or click the wand in the editor title).
- If nothing is selected, you’ll be asked to paste/type your prompt.
- By default, the enhanced prompt opens in a new tab. Configure behavior in settings.

**Settings**
- `cursorPromptEnhancer.provider`: `local` (default) or `openai`.
- `cursorPromptEnhancer.defaultAction`: `insertBelow`, `replaceSelection`, or `openNew`.
- `cursorPromptEnhancer.tone`: `concise`, `balanced`, or `detailed`.
- `cursorPromptEnhancer.openai.model`: model name (default `gpt-4o-mini`).
- `cursorPromptEnhancer.openai.apiKey`: optional plaintext key; prefer the secret vault.

**OpenAI Setup (optional)**
1. Run command `Prompt: Set OpenAI API Key` to save your key in the VS Code/Cursor Secrets vault.
2. Set `cursorPromptEnhancer.provider` to `openai`.
3. Optionally adjust `cursorPromptEnhancer.openai.model`.

**Development**
- Install deps: `npm install`
- Build: `npm run compile`
- Launch Extension: F5 in VS Code/Cursor to open an Extension Development Host.

**Notes**
- Local enhancer adds structured sections: System, Goal, User Input, Requirements, Output Format.
- Undo works when replacing/inserting text.

