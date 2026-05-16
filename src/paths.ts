import { homedir } from "node:os";
import { join } from "node:path";

const piAgentDir = (): string => join(homedir(), ".pi", "agent");

export const paths = {
  agentDir: piAgentDir,
  configFile: (): string => join(piAgentDir(), "pi-ochat.json"),
  personalitiesDir: (): string => join(piAgentDir(), "personalities"),
  profilesDir: (): string => join(piAgentDir(), "profiles"),
  globalAgentsMd: (): string => join(piAgentDir(), "AGENTS.md"),
};
