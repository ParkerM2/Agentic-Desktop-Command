# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records (ADRs) - documents that capture important architectural decisions made during the project's development.

## What is an ADR?

An ADR is a document that captures an important architectural decision made along with its context and consequences.

## When to write an ADR

Write an ADR when you:
- Choose between competing architectural approaches
- Make decisions that will be expensive to change later
- Select technologies, frameworks, or patterns
- Establish conventions that the whole team should follow
- Make trade-offs between different quality attributes (performance vs. maintainability, etc.)

## ADR Format

Use this template for new ADRs:

```markdown
# [ADR-NNNN] Title

**Date**: YYYY-MM-DD  
**Status**: Proposed | Accepted | Deprecated | Superseded  
**Superseded by**: [ADR-NNNN] (if applicable)

## Context

What is the issue that we're seeing that is motivating this decision?

## Decision

What is the decision that we're making?

## Consequences

What becomes easier or more difficult as a result of this decision?

### Positive
- 
- 

### Negative
- 
- 

## Alternatives Considered

What other options did we consider and why didn't we choose them?
```

## Naming Convention

ADRs should be named: `ADR-NNNN-brief-description.md`

Examples:
- `ADR-0001-use-react-for-frontend.md`
- `ADR-0002-microservices-architecture.md`
- `ADR-0003-postgresql-for-persistence.md`

## Best Practices

1. **Keep ADRs short** - Aim for 1-2 pages max
2. **Use simple language** - Avoid unnecessary jargon
3. **Be specific** - Include concrete examples where helpful
4. **Date everything** - Context changes over time
5. **Don't delete ADRs** - Mark them as deprecated or superseded instead