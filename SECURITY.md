# Security policy

## Supported versions

Until 1.0, only the latest published minor line receives security fixes.

| Version | Supported |
|---|---|
| 0.1.x | Yes |
| Earlier | No |

## Reporting a vulnerability

Use GitHub's **Report a vulnerability** / private security advisory flow for this repository. Do not include exploit details, private content files, or affected paths in a public issue.

Include:

- affected version and operating system;
- minimal reproduction;
- impact and realistic attacker position;
- whether the loopback server, browser runtime, CLI, or Skill is involved;
- any proposed mitigation.

Maintainers should acknowledge a report within three business days, provide a status update within seven, and coordinate disclosure after a fix is available. These are response targets, not a promise of bounty payment.

## Scope

Security-sensitive surfaces include path/realpath checks, Host and Origin validation, session tokens, ETags, schema and size limits, atomic writes, browser storage, HTML application, and plain-text insertion. CopyWeave deliberately has no telemetry or hosted service.

See the detailed [security model](./docs/SECURITY-MODEL.md).
