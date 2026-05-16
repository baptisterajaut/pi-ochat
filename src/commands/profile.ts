import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { paths } from "../paths.js";
import { loadConfig, saveConfig } from "../config.js";
import { listProfiles, loadProfile } from "../profiles.js";
import { refreshHeader } from "../hooks/header.js";

export function registerProfileCommand(pi: ExtensionAPI): void {
  pi.registerCommand("profile", {
    description: "List/switch profile (model + personality bundle)",
    handler: async (args, ctx) => {
      const dir = paths.profilesDir();
      const names = listProfiles(dir);
      const arg = args.trim();
      const config = loadConfig(paths.configFile());

      if (!arg) {
        if (names.length === 0) {
          ctx.ui.notify("No profiles in " + dir, "warning");
          return;
        }
        const lines = names.map((n, i) => `${i + 1}. ${n}${n === config.profile ? " (active)" : ""}`).join("\n");
        ctx.ui.notify("Profiles:\n" + lines, "info");
        return;
      }

      let pickName: string | null = null;
      const asNum = Number.parseInt(arg, 10);
      if (Number.isFinite(asNum) && asNum >= 1 && asNum <= names.length) {
        pickName = names[asNum - 1] ?? null;
      } else if (names.includes(arg)) {
        pickName = arg;
      }
      if (!pickName) {
        ctx.ui.notify(`Unknown profile: ${arg}`, "warning");
        return;
      }

      const profile = loadProfile(dir, pickName);
      if (!profile) {
        ctx.ui.notify(`Failed to load profile: ${pickName}`, "warning");
        return;
      }

      // Resolve model: profile.model is "provider/modelId"
      const slash = profile.model.indexOf("/");
      if (slash < 0) {
        ctx.ui.notify(`Profile model must be "provider/modelId", got: ${profile.model}`, "warning");
        return;
      }
      const provider = profile.model.slice(0, slash);
      const modelId = profile.model.slice(slash + 1);
      const model = ctx.modelRegistry.find(provider, modelId);
      if (!model) {
        ctx.ui.notify(`Model not found: ${profile.model}`, "warning");
        return;
      }
      const ok = await pi.setModel(model);
      if (!ok) {
        ctx.ui.notify(`No API key for ${profile.model}`, "warning");
        return;
      }

      saveConfig(paths.configFile(), {
        ...config,
        profile: pickName,
        personality: profile.personality ?? config.personality,
      });

      ctx.ui.setStatus("ochat-profile", `profile: ${pickName}`);
      refreshHeader();
      ctx.ui.notify(`profile: ${pickName} → ${profile.model}`, "info");
    },
  });
}
