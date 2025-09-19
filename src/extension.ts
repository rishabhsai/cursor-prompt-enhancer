import * as vscode from 'vscode';

type Provider = 'local' | 'openai';

interface Config {
  provider: Provider;
  defaultAction: 'insertBelow' | 'replaceSelection' | 'openNew' | 'none';
  tone: 'concise' | 'balanced' | 'detailed';
  systemPrompt?: string;
  copyToClipboard: boolean;
  openai: {
    model: string;
    apiKey?: string;
    apiBase?: string; // e.g., https://api.openai.com/v1 or https://api.aimlapi.com/v1
    temperature?: number; // value if useTemperature is true
    useTemperature: boolean;
    streaming: boolean;
  };
}

export function activate(context: vscode.ExtensionContext) {
  // Status bar: quick entry point
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  status.text = '$(wand) Enhance';
  status.tooltip = 'Enhance Prompt (use selection or input)';
  status.command = 'cursorPromptEnhancer.enhanceSelection';
  status.show();
  context.subscriptions.push(status);

  const enhanceCmd = vscode.commands.registerCommand(
    'cursorPromptEnhancer.enhanceSelection',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('Open a file to enhance a prompt.');
        return;
      }

      const cfg = getConfig();
      const selection = editor.selection;
      let text = editor.document.getText(selection);

      // Handle no-selection cases (e.g., Cursor Chat input fields are not editors)
      if (!text || text.trim().length < 3) {
        if (vscode.workspace.getConfiguration('cursorPromptEnhancer').get('askInputSourceWhenNoSelection') as boolean) {
          const clip = await vscode.env.clipboard.readText();
          const clipPreview = clip ? `${clip.slice(0, 60)}${clip.length > 60 ? '…' : ''}` : '(clipboard empty)';
          const pick = await vscode.window.showQuickPick(
            [
              { label: 'Use Clipboard', description: clipPreview, value: 'clipboard' },
              { label: 'Type/Paste Input…', description: 'Open input box to paste or type', value: 'input' },
              { label: 'Cancel', value: 'cancel' },
            ],
            { placeHolder: 'No selection found. Choose input source' }
          );
          if (!pick || pick.value === 'cancel') return;
          if (pick.value === 'clipboard') {
            if (!clip || clip.trim().length < 3) {
              vscode.window.showWarningMessage('Clipboard is empty or too short.');
              return;
            }
            text = clip;
          } else {
            const input = await vscode.window.showInputBox({
              prompt: 'Enter the prompt to enhance',
              placeHolder: 'Describe your goal/problem…',
              ignoreFocusOut: true,
              validateInput: (v) => (v.trim().length < 3 ? 'Please enter more detail' : undefined),
            });
            if (!input) return;
            text = input;
          }
        } else {
          const input = await vscode.window.showInputBox({
            prompt: 'Enter the prompt to enhance',
            placeHolder: 'Describe your goal/problem…',
            ignoreFocusOut: true,
            validateInput: (v) => (v.trim().length < 3 ? 'Please enter more detail' : undefined),
          });
          if (!input) return;
          text = input;
        }
      }

      const title = cfg.provider === 'openai' ? 'Enhancing prompt via OpenAI…' : 'Enhancing prompt…';
      const enhanced = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title,
          cancellable: false,
        },
        async () => {
          let result = '';
          try {
            if (cfg.provider === 'openai') {
              const apiKey = (await context.secrets.get('openaiApiKey')) || cfg.openai.apiKey || '';
              if (!apiKey) {
                vscode.window.showWarningMessage('OpenAI API key not set. Using local enhancer instead.');
                result = enhanceLocally(text, cfg);
              } else if (cfg.openai.streaming) {
                result = await streamEnhanceOpenAI(text, cfg, apiKey);
              } else {
                result = await enhanceWithOpenAI(text, cfg, apiKey);
              }
            } else {
              result = enhanceLocally(text, cfg);
            }
          } catch (err: any) {
            console.error('Enhance error', err);
            vscode.window.showErrorMessage(`Enhancement failed: ${err?.message || String(err)}`);
            result = enhanceLocally(text, cfg);
          }
          return result;
        }
      );

      // Decide final action: optional post-action picker
      let finalAction: 'insertBelow' | 'replaceSelection' | 'openNew' | 'none' = cfg.defaultAction;
      let finalCopy = cfg.copyToClipboard;
      const ask = vscode.workspace.getConfiguration('cursorPromptEnhancer').get('postActionPrompt') as boolean;
      if (ask) {
        const choice = await vscode.window.showQuickPick(
          [
            { label: 'Copy to Clipboard', value: 'copy' },
            { label: 'Insert Below', value: 'insertBelow' },
            { label: 'Replace Selection', value: 'replaceSelection' },
            { label: 'Open New Document', value: 'openNew' },
          ],
          { placeHolder: 'Apply enhanced prompt as…' }
        );
        if (!choice) return;
        if (choice.value === 'copy') {
          finalAction = 'none';
          finalCopy = true;
        } else {
          finalAction = choice.value as any;
        }
      }

      await applyEnhancedText(editor, enhanced, finalAction);
      if (finalCopy) {
        await vscode.env.clipboard.writeText(enhanced);
        vscode.window.showInformationMessage('Enhanced prompt copied to clipboard');
      }
    }
  );

  const setKeyCmd = vscode.commands.registerCommand(
    'cursorPromptEnhancer.setOpenAIApiKey',
    async () => {
      const current = await context.secrets.get('openaiApiKey');
      const key = await vscode.window.showInputBox({
        prompt: 'Enter your OpenAI API key',
        value: current || '',
        ignoreFocusOut: true,
        password: true,
        placeHolder: 'sk-…',
        validateInput: (v) => (v.trim().length < 10 ? 'That key looks too short.' : undefined),
      });
      if (!key) return;
      await context.secrets.store('openaiApiKey', key);
      vscode.window.showInformationMessage('OpenAI API key saved to VS Code Secrets.');
    }
  );

  context.subscriptions.push(enhanceCmd, setKeyCmd);
}

export function deactivate() {}

function getConfig(): Config {
  const cfg = vscode.workspace.getConfiguration('cursorPromptEnhancer');
  const rawAction = (cfg.get('defaultAction') as string) || 'insertBelowAndCopy';
  const copyViaAction = /AndCopy$/i.test(rawAction);
  const isCopyOnly = /^copyOnly$/i.test(rawAction);
  const baseAction = (isCopyOnly ? 'none' : rawAction.replace(/AndCopy$/i, '')) as
    | 'insertBelow'
    | 'replaceSelection'
    | 'openNew'
    | 'none';
  return {
    provider: (cfg.get('provider') as Provider) || 'local',
    defaultAction: baseAction,
    tone: (cfg.get('tone') as any) || 'balanced',
    systemPrompt: (cfg.get('systemPrompt') as string | undefined),
    copyToClipboard: isCopyOnly || copyViaAction || ((cfg.get('copyToClipboard') as boolean | undefined) ?? false),
    openai: {
      model: (cfg.get('openai.model') as string) || 'gpt-4o-mini',
      apiKey: (cfg.get('openai.apiKey') as string) || undefined,
      apiBase: (cfg.get('openai.apiBase') as string) || 'https://api.openai.com/v1',
      temperature: (cfg.get('openai.temperature') as number | undefined),
      useTemperature: (cfg.get('openai.useTemperature') as boolean) ?? false,
      streaming: (cfg.get('openai.streaming') as boolean) ?? true,
    },
  };
}

async function applyEnhancedText(
  editor: vscode.TextEditor,
  enhanced: string,
  action: 'insertBelow' | 'replaceSelection' | 'openNew' | 'none'
) {
  const selection = editor.selection;
  const edit = new vscode.WorkspaceEdit();
  const doc = editor.document;

  if (action === 'none') {
    return; // do nothing in the editor
  }

  if (action === 'replaceSelection' && !selection.isEmpty) {
    edit.replace(doc.uri, selection, enhanced);
    await vscode.workspace.applyEdit(edit);
    return;
  }

  if (action === 'insertBelow' && !selection.isEmpty) {
    const line = selection.end.line;
    const pos = new vscode.Position(line + 1, 0);
    edit.insert(doc.uri, pos, `\n${enhanced}\n`);
    await vscode.workspace.applyEdit(edit);
    return;
  }

  // openNew or no selection
  const newDoc = await vscode.workspace.openTextDocument({
    content: enhanced,
    language: 'markdown',
  });
  await vscode.window.showTextDocument(newDoc, { preview: true });
}

function enhanceLocally(input: string, cfg: Config): string {
  const trimmed = input.trim();
  const goal = summarizeOneLiner(trimmed);
  // Lightweight, deterministic template that mirrors the system prompt output.
  const enhanced = `# Enhanced Prompt
**Goal:** ${goal}

**Inputs:**
- Codebase context (selected text or relevant files)
- User notes and constraints

**Deliverables:**
- Concrete changes or files to modify
- Focused code snippets or commands

**Constraints:**
- Keep to the existing stack and naming
- No invented APIs or filenames

**Steps (High-Level Plan):**
1. Clarify unknowns with 1–3 precise questions if needed
2. Propose a minimal, testable plan
3. Produce the output artifacts concisely
`;
  return enhanced;
}

function summarizeOneLiner(text: string): string {
  // Naive heuristic: take first sentence or 140 chars.
  const firstStop = text.search(/[.!?]/);
  const slice = firstStop > -1 ? text.slice(0, firstStop + 1) : text.slice(0, 140);
  return slice.trim();
}

function inferDomain(text: string): string {
  const t = text.toLowerCase();
  if (/react|next\.js|jsx|tsx/.test(t)) return 'frontend (React)';
  if (/node|express|typescript|javascript/.test(t)) return 'JavaScript/TypeScript';
  if (/python|pandas|django|fastapi/.test(t)) return 'Python';
  if (/(go\b|golang)/.test(t)) return 'Go';
  if (/rust|cargo/.test(t)) return 'Rust';
  if (/java\b|spring/.test(t)) return 'Java';
  if (/sql|postgres|mysql|sqlite/.test(t)) return 'Databases';
  if (/ml|ai|model|prompt|fine-?tune|embedding/.test(t)) return 'ML/AI';
  if (/devops|docker|kubernetes|terraform/.test(t)) return 'DevOps';
  return 'software';
}

async function enhanceWithOpenAI(text: string, cfg: Config, apiKey: string): Promise<string> {
  const fetchFn: any = (globalThis as any).fetch;
  if (!fetchFn) {
    throw new Error('Global fetch is unavailable in this runtime.');
  }
  const model = cfg.openai.model || 'gpt-4o-mini';
  const systemPrompt =
    cfg.systemPrompt ||
    `You are PromptEnhancer, a terse, reliable prompt rewriter for software builders using Cursor.
Your job: transform a rough user intent into a crystal-clear, actionable prompt that a coding/model assistant can execute.

## Output format (markdown):
# Enhanced Prompt
**Goal:** <1–2 lines; the essential outcome>

**Inputs:** 
- <bullet list of concrete inputs the model will receive>

**Deliverables:**
- <bullet list of exact artifacts to produce (files, functions, components, tests)>

**Constraints:**
- <tech stack, style guides, limits, non-goals>

**Steps (High-Level Plan):**
1. <step>
2. <step>
3. <step>

## Rules:
- Be concise; prefer bullets over prose.
- Never invent APIs or filenames—ask for them only if missing.
- Keep to the user’s stack and naming; no boilerplate essays.
- If any information is unclear or missing, or if you are confused about the intent, **ask the user for clarification** before finalizing the enhanced prompt.
- Default to sane limits (e.g., 3–5 items) unless the user requests more.
- Output ONLY the “Enhanced Prompt” section in markdown—no commentary.`;

  const apiBase = cfg.openai.apiBase || 'https://api.openai.com/v1';
  const body: any = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `User prompt to enhance:\n\n"""\n${text}\n"""\n\nTone: ${cfg.tone}.` ,
      },
    ],
  };
  if (cfg.openai.useTemperature && typeof cfg.openai.temperature === 'number') {
    body.temperature = cfg.openai.temperature;
  }
  // no max tokens param to maximize compatibility

  const url = `${apiBase.replace(/\/$/, '')}/chat/completions`;
  let resp = await fetchFn(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  // If the model rejects temperature, retry once without it
  if (!resp.ok) {
    let msgText = await safeText(resp);
    if (
      resp.status === 400 &&
      /temperature/i.test(msgText) &&
      typeof body.temperature !== 'undefined'
    ) {
      delete body.temperature;
      resp = await fetchFn(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        msgText = await safeText(resp);
      }
    }
    if (!resp.ok) {
      throw new Error(`OpenAI error ${resp.status}: ${msgText}`);
    }
  }
  const data = await resp.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content returned from OpenAI');
  return content.trim();
}

async function streamEnhanceOpenAI(text: string, cfg: Config, apiKey: string): Promise<string> {
  const fetchFn: any = (globalThis as any).fetch;
  if (!fetchFn) throw new Error('Global fetch is unavailable in this runtime.');

  const model = cfg.openai.model || 'gpt-4o-mini';
  const systemPrompt = cfg.systemPrompt || `You are PromptEnhancer, a terse, reliable prompt rewriter for software builders using Cursor.\nYour job: transform a rough user intent into a crystal-clear, actionable prompt that a coding/model assistant can execute.\n\n## Output format (markdown):\n# Enhanced Prompt\n**Goal:** <1–2 lines; the essential outcome>\n\n**Inputs:** \n- <bullet list of concrete inputs the model will receive>\n\n**Deliverables:**\n- <bullet list of exact artifacts to produce (files, functions, components, tests)>\n\n**Constraints:**\n- <tech stack, style guides, limits, non-goals>\n\n**Steps (High-Level Plan):**\n1. <step>\n2. <step>\n3. <step>\n\n## Rules:\n- Be concise; prefer bullets over prose.\n- Never invent APIs or filenames—ask for them only if missing.\n- Keep to the user’s stack and naming; no boilerplate essays.\n- If any information is unclear or missing, or if you are confused about the intent, **ask the user for clarification** before finalizing the enhanced prompt.\n- Default to sane limits (e.g., 3–5 items) unless the user requests more.\n- Output ONLY the “Enhanced Prompt” section in markdown—no commentary.`;
  
  const apiBase = cfg.openai.apiBase || 'https://api.openai.com/v1';
  const body: any = {
    model,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `User prompt to enhance:\n\n"""\n${text}\n"""\n\nTone: ${cfg.tone}.` },
    ],
  };
  if (cfg.openai.useTemperature && typeof cfg.openai.temperature === 'number') {
    body.temperature = cfg.openai.temperature;
  }
  // no max tokens param to maximize compatibility

  const url = `${apiBase.replace(/\/$/, '')}/chat/completions`;
  const resp = await fetchFn(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok || !resp.body) {
    const msg = await safeText(resp);
    throw new Error(`OpenAI error ${resp.status}: ${msg}`);
  }

  const decoder = new TextDecoder('utf-8');
  const reader = (resp.body as ReadableStream<Uint8Array>).getReader();
  let buffer = '';
  let accumulated = '';

  const preview = await vscode.workspace.openTextDocument({ content: '', language: 'markdown' });
  const previewEditor = await vscode.window.showTextDocument(preview, { preview: true });

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';
    for (const part of parts) {
      const lines = part.split('\n').filter(Boolean);
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') {
          break;
        }
        try {
          const json = JSON.parse(data);
          const delta = json?.choices?.[0]?.delta?.content || json?.choices?.[0]?.message?.content || '';
          if (delta) {
            accumulated += delta;
            const end = preview.lineAt(preview.lineCount - 1).range.end;
            await previewEditor.edit((b) => b.insert(end, delta));
          }
        } catch (e) {
          // ignore parse errors from keepalive lines
        }
      }
    }
  }

  return accumulated.trim();
}

async function safeText(resp: any): Promise<string> {
  try {
    return await resp.text();
  } catch {
    return '<no body>';
  }
}

// removed max token shaping to avoid provider incompatibilities
