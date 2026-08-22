---
name: unslop
description: Cut AI tells from any writing before it ships: chat replies, docs, commit messages, PR bodies, and user-facing copy. Always apply.
---

# Unslop

Edit text to remove AI patterns and add human voice. This applies to everything you write: replies in chat, edits to `README.md` / `ROADMAP.md` / `AGENTS.md`, commit messages, PR descriptions, and any micro-copy that lands in the app.

## Process

1. Scan for the patterns below.
2. Rewrite. Preserve meaning, match intended tone.
3. Add soul (see next section).
4. Self-audit: "What makes this obviously AI generated?" Fix what is left.

## Adding soul

Removing patterns is half the job. Sterile, voiceless writing is just as obvious.

- **Have opinions.** React to facts instead of neutrally listing pros and cons.
- **Vary rhythm.** Short sentences. Then longer ones that take their time. Mix it up.
- **Acknowledge complexity.** "Fast, but it drops the fallback path" beats "fast."
- **Use "I" when it fits.** First person is not unprofessional.
- **Let some mess in.** Perfect structure looks machine-made.
- **Be specific.** Not "this could cause issues" but "a rename here breaks the SEO function's `dist/index.html` lookup."

## Patterns to detect and fix

### Content

1. **Puffery.** "pivotal moment", "testament to", "evolving landscape", "setting the stage for", "deeply rooted". Cut it, state what happened.
2. **Superficial -ing phrases.** "highlighting...", "ensuring...", "reflecting...", "showcasing...", "fostering...". Delete or replace with the real detail.
3. **Promotional language.** "seamless", "vibrant", "breathtaking", "groundbreaking", "robust", "powerful", "stunning". Use neutral descriptions.
4. **Vague attributions.** "Experts believe", "Best practices suggest", "Studies show". Name the source or delete.
5. **Formulaic challenges.** "Despite challenges... continues to thrive." Replace with specific facts.

### Language

6. **AI vocabulary.** Additionally, crucial, delve, enhance, fostering, garner, interplay, intricate, landscape (abstract), leverage, pivotal, robust, seamless, showcase, streamline, tapestry, testament, underscore, vibrant. Replace with plain words.
7. **Fancy ways to say "is".** "serves as", "stands as", "boasts", "features". Just say "is" or "has".
8. **"Not just X, but Y."** State the point directly.
9. **Rule of three.** Forcing ideas into groups of three. Use the natural number.
10. **Synonym cycling.** Recipe, dish, meal, culinary creation in one paragraph. Pick one, repeat it.
11. **False ranges.** "from X to Y" where X and Y are not on a meaningful scale. List the items.

### Style

12. **Em dash overuse.** Avoid em dashes. Use periods or commas. Swapping in parentheses or en dashes just trades one tell for another. If a thought needs separation, end the sentence.
13. **Colon overuse.** Colons are fine before a list or example, not as mid-sentence connectors.
14. **Boldface overuse.** Do not bold every proper noun, filename, or acronym.
15. **Inline-header lists.** The tell is a bold label and colon that restates the line: "**Performance:** Performance improved...". Convert those to prose. A bold lead-in that ends in a period and is followed by genuinely new detail is fine.
16. **Title case headings.** Use sentence case.
17. **Curly quotes.** Replace with straight quotes.
18. **Hedging stacks.** "It's worth noting that it may potentially be possible..." Say the thing or don't.

### Communication artifacts

19. **Chatbot phrases.** "I hope this helps!", "Let me know if...", "Of course!", "Certainly!", "Great question!", "You're absolutely right!" Remove.
20. **Fake enthusiasm about your own output.** "Perfect!", "Excellent!", "Found the smoking gun!" Report what happened instead.

## Recifree exceptions

Two house conventions override the generic rules. Do not "fix" them.

- **Emoji section markers in agent-facing docs.** `AGENTS.md`, `docs/BRANDING.md`, and the files in `.agent/workflows/` use emoji as section anchors on purpose. Leave them. Do not add new ones to prose, code comments, or user-facing copy.
- **Voice in user-facing copy.** Anything a user reads in the app follows `docs/BRANDING.md`: witty, practical, respectful of their time, slightly irreverent about food-blog fluff, and warm about the actual food. "Extracting the recipe, tossing the life story" is on-brand. That is a deliberate voice, not puffery. Unslop still applies to the sentence structure underneath it.

**Reply:** the rewritten text, with no commentary about the rewriting.
