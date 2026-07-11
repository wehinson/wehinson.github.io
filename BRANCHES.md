# Branch Board

This file is the live branch status board for AI-assisted Git work in mapcrush.
Agents should update it whenever they create, change, test, review, abandon, or
merge a branch.

Current version: 2.1.2

## Rules Snapshot

- main is the trusted app state William uses.
- review is the integration and release-candidate layer when needed.
- Active work happens on named branches before review or main.
- William alone approves merges from review or feature branches into main.
- Default version bump after an approved merge to main: increment the last digit unless William says otherwise.

## Active Branches

| Branch | Category | Purpose | Agent | Base | Status | Dependencies | Verification | Version Impact | Last Update | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Review Queue

| Branch | Included In Review? | Review Result | Merge Recommendation | Notes |
| --- | --- | --- | --- | --- |

## Merged To Main

| Version | Branch Or Branch Set | Merge Date | Approved By | Summary |
| --- | --- | --- | --- | --- |
| 2.1.1 | Git fleet baseline | 2026-06-28 | William | Current project state imported into the standardized local Git fleet. |

## Abandoned Or Superseded

| Branch | Date | Reason | Notes |
| --- | --- | --- | --- |
