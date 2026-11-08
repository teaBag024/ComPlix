# Editor instructions

The first prototype runs a newly added `@complix` comment automatically after the complete draft autosaves and you pause typing for two seconds, while the component is open in the workspace (any view). Operator chat configuration and a supported generation adapter are required.

In React (`.tsx`, `.ts`, `.jsx`, `.js`), any real comment that starts with `@complix` works: a line comment, a block comment, or a JSX comment.

```tsx
// @complix Make this button green using the project palette.
export function Button() {
  return <>
    {/* @complix Add a loading state. */}
    <button>Save</button>
  </>;
}
```

In Blazor markup, use a Razor or HTML comment:

```razor
@* @complix Make this button green using the project palette. *@
<!-- @complix Add a loading state. -->
<button class="btn btn-primary">Save</button>
```

Keep the instruction complete and specific before pausing. The comment must *start* with `@complix`; a comment that merely mentions it later is ignored. Source that does not currently parse (for example, mid-edit) does not execute, and `@complix` inside strings, template literals or regular expressions is never an instruction. Razor support covers markup comments before executable Razor transitions, including comments before a trailing `@code` block; comments in C# blocks/expressions are unsupported.

Everything happens in the component chat: a detected comment appears as your message ("from your comment in Button.tsx:3") with its status, a typing indicator shows while Gemini plans and Nemotron writes, and the reply arrives with the edited portion of the code (changed lines per file) and an Open in editor button. Once the backend accepts an instruction, component chat immediately acknowledges its text and location ("I see your @complix request…"). This is a ComPlix receipt acknowledgment before provider calls, not a claim that Nemotron has already responded. It is recorded once per accepted job, including across duplicate submissions. Gemini receives the saved component, guidance, Common contracts, conversation and all project references through the existing pipeline. A result remains an unverified candidate; the current preview flow can build it separately. Compilation is not complete validation or promotion.

Saved or unsaved human changes prevent automatic replacement by an outdated result. Cancel reply (on the typing indicator) prevents further authorized work and discards late results. A provider call already underway can still finish and incur usage; the saved code and last working preview are preserved.

Processing identity survives reloads, transcript clearing and unrelated saves. Repeated identical markers in one file are ambiguous and inactive. Moving a processed instruction does not automatically rerun it. Generated/inherited markers remain inactive until Run again / enable is selected. Failed admissions (for example, another job already running or the chat rate limit) are blocked until explicitly retried. ComPlix does not automatically remove completed comments.

Sign-in renewal does not interrupt editing. ID tokens last 15 minutes and renew 5 minutes before expiry; the workspace swaps to the renewed connection only once it is subscribed, so the editor stays mounted. If a save or instruction is rejected because the session expired or the connection dropped, the editor shows "Waiting to save…", keeps your text and retries automatically on the next connection, and the instruction runs once the save succeeds.

Requests share the existing project active-job guard, five-per-minute identity limit, 64 KiB complete-context limit and provider budgets with chat. The browser submits while the component is open in the workspace; this is not a continuously running server agent. An unsubmitted pending instruction can resume when that saved source is reopened.

The implementation adds a private `editor_instruction` table and generated client API. The running backend must be updated using the existing data-preserving publish workflow and the browser reloaded before use. This increment does not publish the local application or make live paid-provider acceptance calls.

## Newly changed code

When a new agent result reaches the workspace, added/replaced lines in Code receive a soft green highlight that fades out over ten seconds. Unchanged lines and existing history do not light up. Typing clears the highlight to avoid marking shifted lines. With reduced motion enabled, the highlight stays steady and clears after ten seconds.
