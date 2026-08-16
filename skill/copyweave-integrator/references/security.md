# Local save security

CopyWeave's CLI is a local authoring helper, not a remotely deployable content service.

Required boundaries:

- Bind only to numeric loopback (`127.0.0.1`).
- Check Host and Origin.
- Issue a random in-memory session token and require it on writes.
- Require `Content-Type: application/json` and an exact `If-Match` ETag.
- Limit body, page, field, key, and value sizes.
- Use the shared safe-ID grammar; reject `__proto__`, `prototype`, and
  `constructor`, normalize page maps with null prototypes, and use own-property
  lookups.
- Resolve and verify real paths; reject traversal and static symlinks escaping the served root.
- Serialize saves and use exclusively created, unique same-directory temporary files plus atomic rename
  for both backups and target replacement. Replacing destination directory
  entries prevents existing backup hard links/symlinks from redirecting writes;
  clean an owned temporary file if writing or rename fails. This is not an `fsync` or
  multi-process durability guarantee.
- Keep recoverable backups for static apply. Treat `.backup`, `.bak`, `.old`,
  and `.orig` as local recovery data that may contain removed copy. Never commit
  or deploy them; verify the host artifact excludes them.
- Deny static requests for recovery extensions and any path segment containing
  `:` (including Windows alternate data stream syntax).
- Write user copy through `textContent`, never `innerHTML`.

If localStorage contains an unreadable draft, preserve the original raw string
and pause autosave. Requesting and retaining the raw Export remains the first
recovery path. Save/import/reset may replace the active key only after archiving
the raw value to a timestamped recovery key; if archiving fails, fail closed.

For static HTML, use the shipped context-aware `doctor`/`apply` scanner. It
excludes comments and script/style/template/raw-text contexts and applies only
unique real leaf spans. Never replace fields with a whole-file regular
expression. If `<html data-copyweave-site>` is present, require it to match the
content store `siteId` before planning any write.

Do not expose the save route through a reverse proxy, bind it to a LAN/public interface, persist the session token, log private copy unnecessarily, or describe query activation as authorization.

Serve only a trusted, secret-free build. The session token is a cross-site-request safeguard, not isolation from JavaScript already running on the same origin: application scripts, third-party scripts, XSS, and a persisted service worker can request and use it. Use a fresh port when changing between projects with different trust levels.

If a user needs remote multi-user editing, stop and propose a separately authenticated, authorized, audited backend rather than expanding this local server implicitly.
