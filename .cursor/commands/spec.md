---
name: spec
description: Write a feature spec before building anything
---

Before we build anything, we need a spec.

Please create a spec file at docs/specs/[feature-name].md 
with this structure:

## What it does
One paragraph. What problem does this solve for the user?

## Who uses it
Which user roles or system actors use this? Describe them for this feature.

## Acceptance criteria
A checklist of conditions that must be true for this 
feature to be considered complete.

## What it does NOT do
Explicit boundaries — what is out of scope.

## Where it lives
Which project, application, or service owns this, and what are the boundaries vs other apps or services?
Which files will likely need to change?

## Dependencies
What must exist before this can be built?
Any API contracts, database changes, or env vars needed?

## Open questions
Anything that needs a decision before building.

Do not write any application code.
Present the spec for my approval before saving it.
Type "WAITING FOR APPROVAL" when done.
