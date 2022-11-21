---
title: Schedule/Decision.ts
nav_order: 41
parent: Modules
---

## Decision overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [continue](#continue)
  - [continueWith](#continuewith)
  - [done](#done)
- [models](#models)
  - [Continue (interface)](#continue-interface)
  - [Done (interface)](#done-interface)
  - [ScheduleDecision (type alias)](#scheduledecision-type-alias)
- [refinements](#refinements)
  - [isContinue](#iscontinue)
  - [isDone](#isdone)

---

# constructors

## continue

**Signature**

```ts
export declare const continue: any
```

Added in v1.0.0

## continueWith

**Signature**

```ts
export declare const continueWith: any
```

Added in v1.0.0

## done

**Signature**

```ts
export declare const done: any
```

Added in v1.0.0

# models

## Continue (interface)

**Signature**

```ts
export interface Continue {
  readonly op: internal.OP_CONTINUE
  readonly intervals: Intervals.Intervals
}
```

Added in v1.0.0

## Done (interface)

**Signature**

```ts
export interface Done {
  readonly op: internal.OP_DONE
}
```

Added in v1.0.0

## ScheduleDecision (type alias)

**Signature**

```ts
export type ScheduleDecision = Continue | Done
```

Added in v1.0.0

# refinements

## isContinue

**Signature**

```ts
export declare const isContinue: any
```

Added in v1.0.0

## isDone

**Signature**

```ts
export declare const isDone: any
```

Added in v1.0.0