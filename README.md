# ✨ Cursor Prompt Enhancer

Turn rough ideas into crisp, **actionable prompts** — instantly.  
One click to rewrite messy intent into a clean prompt your AI coding assistant can execute.

---

## ✨ Features
- **One-click Enhance**: available in the editor title, context menu, and status bar.  
- **Super fast**: optional streaming preview; lean, optimized system prompt.  
- **Flexible backends**: local enhancer (never leaves your machine) or OpenAI-compatible APIs.  
- **Smart defaults**: actions include `insertBelow`, `replaceSelection`, `openNew`, `insertBelowAndCopy`, `replaceSelectionAndCopy`, `openNewAndCopy`, `copyOnly`.  
- **Customizable**: system prompt, tone (`concise`, `balanced`, `detailed`), and API parameters can all be adjusted.  

---

## 🚀 Quick Start
1. **Install the extension** (from Cursor, VS Code Marketplace, or via VSIX).  
2. **(Optional)** Open Settings → search `Cursor Prompt Enhancer` → set **Provider** to `openai` and paste your API key, or run:  
   > **Prompt: Set OpenAI API Key**  
3. Select text and run **Enhance Prompt** via:  
   - Right-click **context menu**  
   - Editor title bar **wand icon**  
   - **Status bar** button  
   - Keyboard shortcut:  
     - **Mac:** `Cmd+Shift+Alt+E`  
     - **Win/Linux:** `Ctrl+Shift+Alt+E`

---

https://imgur.com/a/ajfTQM9

---

## ⚙️ Settings

| Setting | Values | Description |
| --- | --- | --- |
| `cursorPromptEnhancer.provider` | `local`, `openai` | Backend to use |
| `cursorPromptEnhancer.defaultAction` | `insertBelow`, `replaceSelection`, `openNew`, `insertBelowAndCopy`, `replaceSelectionAndCopy`, `openNewAndCopy`, `copyOnly` | Default insertion behavior |
| `cursorPromptEnhancer.systemPrompt` | string | Custom system prompt (OpenAI mode) |
| `cursorPromptEnhancer.tone` | `concise`, `balanced`, `detailed` | Tone for local enhancer |
| `cursorPromptEnhancer.openai.apiBase` | URL | API base for OpenAI-compatible services |
| `cursorPromptEnhancer.openai.model` | string | Model name |
| `cursorPromptEnhancer.openai.streaming` | true/false | Stream live preview (default: off) |
| `cursorPromptEnhancer.openai.useTemperature` | true/false | Toggle temperature parameter |
| `cursorPromptEnhancer.openai.temperature` | 0.0–1.0 | Value if above is true |

---

## ⚡ Performance Tips
- Keep **streaming OFF** for clean insertion; turn it ON for real-time previews.  
- Use `replaceSelectionAndCopy` for the fastest workflow.  
- Smaller selections → faster, sharper results.  
