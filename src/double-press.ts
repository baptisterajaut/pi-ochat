export interface DoublePress {
  press(
    key: string,
    prompt: string,
    action: () => void,
    onPrompt: (text: string) => void,
    now?: number,
  ): void;
}

export function createDoublePress(windowMs: number): DoublePress {
  const lastPress = new Map<string, number>();
  return {
    press(key, prompt, action, onPrompt, now = Date.now()) {
      const last = lastPress.get(key) ?? 0;
      if (now - last < windowMs && last !== 0) {
        lastPress.delete(key);
        action();
      } else {
        lastPress.set(key, now);
        onPrompt(prompt);
      }
    },
  };
}
