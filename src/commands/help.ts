import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const LINES = [
  "pi-ochat commands:",
  "  /p, /personality [n|name]   List or switch personality",
  "  /profile [n|name]           List or switch profile (model + personality)",
  "  /impersonate, /imp, /gen, /generate  Long user suggestion → editor",
  "  /imps                       Short user suggestion → editor",
  "  /retry, /r                  Regenerate the last response (branches)",
  "  /undo, /u                   Remove last exchange, restore prompt to editor",
  "  /stats, /st                 Show TTFT / t/s / tokens / ctx%",
  "  /suggest                    Toggle auto-suggest ghost line",
  "  /stream                     Toggle streaming vs buffered output",
  "  /thinking [level]           Set thinking level (off/minimal/low/medium/high/xhigh)",
  "  /project                    Toggle project-local AGENTS.md in system prompt",
  "  /help                       This help",
  "Shortcuts: Ctrl+L clear, Ctrl+R retry, Ctrl+U undo (all double-press); Ctrl+G impersonate.",
  "Pi built-ins still apply: /compact, /tree, /fork, /resume, /new, /model, etc.",
];

export function registerHelpCommand(pi: ExtensionAPI): void {
  pi.registerCommand("help", {
    description: "Show pi-ochat commands and shortcuts",
    handler: async (_args, ctx) => {
      ctx.ui.notify(LINES.join("\n"), "info");
    },
  });
}
