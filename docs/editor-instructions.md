# Editor instructions

The first prototype runs a newly added `@complix` comment automatically after the complete draft autosaves and the open Code panel has been idle for two seconds. Operator chat configuration and a supported generation adapter are required.

In a React `.tsx` component, put the instruction inside JSX:

```tsx
export function Button() {
  return <>
    {/* @complix Make this button green using the project palette. */}
    <button>Save</button>
  </>;
}
```

In Blazor markup:

```razor
@* @complix Make this button green using the project palette. *@
<button class="btn btn-primary">Save</button>
```

Keep the instruction complete and specific before pausing. A partial TSX file or unterminated comment does not execute. Ordinary comments, string literals and documentation are inactive. Initial Razor support covers markup comments before executable Razor transitions, including comments before a trailing `@code` block; comments in C# blocks/expressions are unsupported.

The editor lists detected instructions, their file locations and status. Once the backend accepts an instruction, component chat immediately acknowledges its text and location: ?I see your @complix request??. This is a ComPlix receipt acknowledgment before provider calls, not a claim that Nemotron has already responded. It is recorded once per accepted job, including across duplicate submissions. Gemini receives the saved component, guidance, Common contracts, conversation and all project references through the existing pipeline. A result remains an unverified candidate; the current preview flow can build it separately. Compilation is not complete validation or promotion.

Saved or unsaved human changes prevent automatic replacement by an outdated result. Stop generation prevents further authorized work and discards late results. A provider call already underway can still finish and incur usage; the saved code and last working preview are preserved.

Processing identity survives reloads, transcript clearing and unrelated saves. Repeated identical markers in one file are ambiguous and inactive. Moving a processed instruction does not automatically rerun it. Generated/inherited markers remain inactive until Run again / enable is selected. Failed admissions are blocked until explicitly retried. ComPlix does not automatically remove completed comments.

Requests share the existing project active-job guard, five-per-minute identity limit, 64 KiB complete-context limit and provider budgets with chat. The browser submits only from the open Code panel; this is not a continuously running server agent. An unsubmitted pending instruction can resume when that saved source is reopened.

The implementation adds a private `editor_instruction` table and generated client API. The running backend must be updated using the existing data-preserving publish workflow and the browser reloaded before use. This increment does not publish the local application or make live paid-provider acceptance calls.
