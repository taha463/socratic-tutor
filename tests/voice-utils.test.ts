import { describe, it, expect } from "./test-utils";
import { cleanTextForSpeech } from "../components/audio/voiceUtils";

describe("Voice Socratic Co-Pilot Utilities Tests", () => {
  it("cleans markdown syntax for clear speech synthesis", () => {
    const raw = `
### Let's analyze recursion!
When we call \`factorial(3)\`, notice how **base case** is reached.
\`\`\`python
if n <= 1:
    return 1
\`\`\`
What happens to the [call stack](https://en.wikipedia.org/wiki/Call_stack)?
    `;

    const cleaned = cleanTextForSpeech(raw);
    expect(cleaned).toContain("Let's analyze recursion!");
    expect(cleaned).toContain("factorial(3)");
    expect(cleaned).toContain("base case");
    expect(cleaned).toContain("call stack");
    // Ensure raw markdown syntax is stripped
    expect(cleaned).not.toContain("###");
    expect(cleaned).not.toContain("```python");
    expect(cleaned).not.toContain("**");
    expect(cleaned).not.toContain("https://en.wikipedia.org");
  });

  it("handles empty or whitespace strings gracefully", () => {
    expect(cleanTextForSpeech("")).toBe("");
    expect(cleanTextForSpeech("    ")).toBe("");
  });
});
