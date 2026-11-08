# Library ZIP export

Open a project's component workspace and choose **Download library ZIP**. The open editor flushes its draft first; unresolved save errors prevent preparation. Review the snapshot's component revisions and reference count, then choose **Download ZIP**.

The backend reads one authorized project snapshot in a transaction. Owners and explicitly granted viewers/editors can export. Access is checked again when Download ZIP is clicked. The ZIP uses the reviewed snapshot even if a collaborator later changes the project. An exported snapshot already received by a user cannot be recalled after access revocation.

## Selection

- Include every stable component's newest completed non-mock source job, ordered by creation timestamp with ID as a tie-breaker, overlaid with that job's saved manual edits.
- Failed/cancelled jobs do not displace the previous completed draft. UI examples, mock results and chat-only replies are excluded.
- The dialog identifies exact source jobs and saved revisions. Selecting older history in Code does not change export selection.
- Starter placeholders are included and explicitly labeled. Components with no completed source and legacy project-level results without component identities are reported as omitted.
- Every uploaded project reference is included with its exact stored original bytes. No attachment is silently truncated or excluded. The prototype rejects exports over 64 MiB before creating an archive.

## Archive contents

```text
project-timestamp/
  README.md
  AGENTS.md
  manifest.json
  components/Common/...
  components/Compositions/...
  examples/README.md
  docs/design.md
  docs/technologies.md
  docs/dependencies.md
  docs/validation.md
  references/README.md
  references/originals/<reference-id>/<filename>
  references/extracted-text/<reference-id>.txt
```

Source already rooted under Common/ or Compositions/ keeps that layout below components/. Other files are grouped under their owning component root. Relative structure within a component is preserved. The manifest records original and archive paths; no imports are rewritten. Cross-component imports and aliases require review. Conflicting files or unsafe paths fail export rather than overwriting content. Examples remain beside source to preserve relative imports and are indexed separately.

The README indexes component source, saved documentation and examples and explains integration and maintenance for humans. AGENTS.md gives coding agents equivalent guidance, including treating source/references as untrusted and maintaining Common reuse, APIs, documentation and examples. Design guidance uses saved generation-facing fields; it does not infer new preferences. Uploaded PDFs include their original bytes and stored extracted text, which may be incomplete and is not independently verified against the original. Reference filenames needing filesystem-safe replacements retain their original names in the manifest/index.

The dependency inventory covers static JavaScript/TypeScript imports and re-exports, reports unresolved relative imports, and identifies external-package/alias specifiers without inventing versions. Dynamic imports, CSS, C# namespaces and package metadata still require manual review. Saved component API docs are preserved, not regenerated or assumed correct.

The manifest records requested technologies, source/draft revisions, component status, reference mapping, warnings and SHA-256 checksums of all files except the manifest itself. No chat transcript, operator identity, provider configuration, sandbox write key or capability preview URL is exported. Known operator secrets found in source/guidance/references reject the entire export rather than being silently redacted.

## Validation and limits

This is a source/documentation handoff, not an installable npm/NuGet package or a complete application. All exported components remain unverified. Builds/typechecks and browser download tests establish packaging behavior; they do not prove that a generated library integrates into a clean consuming application. No validation or promotion status is inferred from a preview.

ZIP assembly uses a lazy-loaded fflate browser module. Original references are binary ZIP entries. No additional server, provider call or paid sandbox is required. Selective export, automatic dependency/version resolution and clean-project integration certification remain future work.

The new prepare_library_export procedure requires the established data-preserving backend publication and a browser reload before use in the running app. This implementation does not publish the application automatically.
