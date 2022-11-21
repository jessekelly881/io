---
title: Hub.ts
nav_order: 19
parent: Modules
---

## Hub overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [bounded](#bounded)
  - [dropping](#dropping)
  - [sliding](#sliding)
  - [unbounded](#unbounded)
- [getters](#getters)
  - [capacity](#capacity)
  - [isEmpty](#isempty)
  - [isFull](#isfull)
  - [isShutdown](#isshutdown)
  - [size](#size)
- [models](#models)
  - [Hub (interface)](#hub-interface)
- [mutations](#mutations)
  - [awaitShutdown](#awaitshutdown)
  - [publish](#publish)
  - [publishAll](#publishall)
  - [shutdown](#shutdown)
  - [subscribe](#subscribe)

---

# constructors

## bounded

Creates a bounded hub with the back pressure strategy. The hub will retain
messages until they have been taken by all subscribers, applying back
pressure to publishers if the hub is at capacity.

For best performance use capacities that are powers of two.

**Signature**

```ts
export declare const bounded: any
```

Added in v1.0.0

## dropping

Creates a bounded hub with the dropping strategy. The hub will drop new
messages if the hub is at capacity.

For best performance use capacities that are powers of two.

**Signature**

```ts
export declare const dropping: any
```

Added in v1.0.0

## sliding

Creates a bounded hub with the sliding strategy. The hub will add new
messages and drop old messages if the hub is at capacity.

For best performance use capacities that are powers of two.

**Signature**

```ts
export declare const sliding: any
```

Added in v1.0.0

## unbounded

Creates an unbounded hub.

**Signature**

```ts
export declare const unbounded: any
```

Added in v1.0.0

# getters

## capacity

Returns the number of elements the queue can hold.

**Signature**

```ts
export declare const capacity: any
```

Added in v1.0.0

## isEmpty

Returns `true` if the `Queue` contains zero elements, `false` otherwise.

**Signature**

```ts
export declare const isEmpty: any
```

Added in v1.0.0

## isFull

Returns `true` if the `Queue` contains at least one element, `false`
otherwise.

**Signature**

```ts
export declare const isFull: any
```

Added in v1.0.0

## isShutdown

Returns `true` if `shutdown` has been called, otherwise returns `false`.

**Signature**

```ts
export declare const isShutdown: any
```

Added in v1.0.0

## size

Retrieves the size of the queue, which is equal to the number of elements
in the queue. This may be negative if fibers are suspended waiting for
elements to be added to the queue.

**Signature**

```ts
export declare const size: any
```

Added in v1.0.0

# models

## Hub (interface)

A `Hub<A>` is an asynchronous message hub into which publishers can publish
messages of type `A` and subscribers can subscribe to take messages of type
`A`.

**Signature**

```ts
export interface Hub<A> extends Queue.Enqueue<A> {
  /**
   * Publishes a message to the hub, returning whether the message was published
   * to the hub.
   *
   * @macro traced
   */
  publish(value: A): Effect.Effect<never, never, boolean>

  /**
   * Publishes all of the specified messages to the hub, returning whether they
   * were published to the hub.
   *
   * @macro traced
   */
  publishAll(elements: Iterable<A>): Effect.Effect<never, never, boolean>

  /**
   * Subscribes to receive messages from the hub. The resulting subscription can
   * be evaluated multiple times within the scope to take a message from the hub
   * each time.
   *
   * @macro traced
   */
  subscribe(): Effect.Effect<Scope.Scope, never, Queue.Dequeue<A>>
}
```

Added in v1.0.0

# mutations

## awaitShutdown

Waits until the queue is shutdown. The `Effect` returned by this method will
not resume until the queue has been shutdown. If the queue is already
shutdown, the `Effect` will resume right away.

**Signature**

```ts
export declare const awaitShutdown: any
```

Added in v1.0.0

## publish

Publishes a message to the hub, returning whether the message was published
to the hub.

**Signature**

```ts
export declare const publish: any
```

Added in v1.0.0

## publishAll

Publishes all of the specified messages to the hub, returning whether they
were published to the hub.

**Signature**

```ts
export declare const publishAll: any
```

Added in v1.0.0

## shutdown

Interrupts any fibers that are suspended on `offer` or `take`. Future calls
to `offer*` and `take*` will be interrupted immediately.

**Signature**

```ts
export declare const shutdown: any
```

Added in v1.0.0

## subscribe

Subscribes to receive messages from the hub. The resulting subscription can
be evaluated multiple times within the scope to take a message from the hub
each time.

**Signature**

```ts
export declare const subscribe: any
```

Added in v1.0.0