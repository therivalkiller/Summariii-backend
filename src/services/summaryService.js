import ProviderFactory from '../ai/providerFactory.js';

class SummaryService {
  /**
   * GENERATE SUMMARY ONLY
   * Triggers when user views the "Summary" tab
   */
  async generateSummaryOnly({ text, userId, provider }) {
    try {
      const aiProvider = await ProviderFactory.getProvider(userId, provider);
      // Truncate to safe limit
      const truncatedText = text.length > 50000 ? text.substring(0, 50000) : text;

      const summaryPrompt = `Analyze this document and create a comprehensive summary.

DOCUMENT:
${truncatedText}

INSTRUCTIONS:
1. First line: [TYPE: Document Type] (e.g., Legal Contract, Research Paper)
2. Second line: [INTENT: One sentence purpose]
3. Create 3-5 detailed sections with headers.

FORMAT:
[TYPE: <type>]
[INTENT: <intent>]

### <Section 1>
<content>

### <Section 2>
<content>

### Key Highlights
- Point 1
- Point 2

(Minimum 800 words, detailed)`;

      console.log('🔄 Generating Summary Only...');
      const summary = await aiProvider.generateCompletion(summaryPrompt, {
        maxTokens: 4000,
        temperature: 0.3,
      });

      return summary.trim();
    } catch (error) {
      console.error('Summary Gen Error:', error.message);
      throw new Error('Failed to generate summary');
    }
  }

  /**
   * GENERATE NOTES ONLY
   * Triggers when user views the "Notes" tab
   */
  async generateNotesOnly({ text, userId, provider }) {
    try {
      const aiProvider = await ProviderFactory.getProvider(userId, provider);
      const truncatedText = text.length > 50000 ? text.substring(0, 50000) : text;

      const notesPrompt = `Create EXAM REVISION NOTES for this document.

DOCUMENT:
${truncatedText}

FORMAT REQUIRED (Strict Markdown):

## 📌 Quick Facts
- [Fact 1]
- [Fact 2]
(5-7 high-yield facts)

## 🔑 Core Concepts
**[Term]**: [Definition]
**[Term]**: [Definition]
(3-5 key terms)

## 📊 Important Data
(Use table or write "N/A")
| Metric | Value | Context |
|--------|-------|---------|
| X | Y | Z |

## ❓ Study Questions
Q: [Question?]
A: [Answer]
(3-5 pairs)

Keep punchy and scannable.`;

      console.log('🔄 Generating Notes Only...');
      const notes = await aiProvider.generateCompletion(notesPrompt, {
        maxTokens: 2000,
        temperature: 0.4,
      });

      return notes.trim();
    } catch (error) {
      console.error('Notes Gen Error:', error.message);
      throw new Error('Failed to generate notes');
    }
  }

  async generateQuickSummary(text, userId, provider) {
    try {
      const aiProvider = await ProviderFactory.getProvider(userId, provider);
      const prompt = `Summarize in 2-3 sentences:\n\n${text.substring(0, 5000)}`;
      return (await aiProvider.generateCompletion(prompt, {
        maxTokens: 256,
        temperature: 0.5,
      })).trim();
    } catch (error) {
      return 'Summary generation failed';
    }
  }
}

export default new SummaryService();