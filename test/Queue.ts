import * as Cause from "@effect/io/Cause"
import * as Deferred from "@effect/io/Deferred"
import * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import * as Fiber from "@effect/io/Fiber"
import * as Queue from "@effect/io/Queue"
import * as Ref from "@effect/io/Ref"
import * as it from "@effect/io/test/utils/extend"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Either from "@fp-ts/data/Either"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"
import { assert, describe } from "vitest"

export const waitForValue = <A>(
  ref: Effect.Effect<never, never, A>,
  value: A
): Effect.Effect<never, never, A> => {
  return pipe(
    ref,
    Effect.zipLeft(Effect.yieldNow()),
    Effect.repeatUntil((a) => value === a)
  )
}

export const waitForSize = <A>(
  queue: Queue.Queue<A>,
  size: number
): Effect.Effect<never, never, number> => {
  return waitForValue(Queue.size(queue), size)
}

describe.concurrent("Queue", () => {
  it.effect("bounded - offerAll returns true when there is enough space", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(5)
      const result = yield* pipe(queue, Queue.offerAll([1, 2, 3]))
      assert.isTrue(result)
    }))

  it.effect("dropping - with offerAll", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.dropping<number>(4)
      const result1 = yield* pipe(queue, Queue.offerAll([1, 2, 3, 4, 5]))
      const result2 = yield* Queue.takeAll(queue)
      assert.isFalse(result1)
      assert.deepStrictEqual(result2, Chunk.unsafeFromArray([1, 2, 3, 4]))
    }))

  it.effect("dropping - with offerAll, check offer returns false", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.dropping<number>(2)
      const result1 = yield* pipe(queue, Queue.offerAll([1, 2, 3, 4, 5, 6]))
      const result2 = yield* Queue.takeAll(queue)
      assert.isFalse(result1)
      assert.deepStrictEqual(result2, Chunk.unsafeFromArray([1, 2]))
    }))

  it.effect("dropping - with offerAll, check ordering", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.dropping<number>(128)
      const result1 = yield* pipe(
        queue,
        Queue.offerAll(Array.from(new Array(256), (_, i) => i + 1))
      )
      const result2 = yield* Queue.takeAll(queue)
      assert.isFalse(result1)
      assert.deepStrictEqual(result2, Chunk.unsafeFromArray(Array.from(new Array(128), (_, i) => i + 1)))
    }))

  it.effect("dropping - with pending taker", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.dropping<number>(2)
      const fiber = yield* Effect.fork(Queue.take(queue))
      yield* waitForSize(queue, -1)
      const result1 = yield* pipe(queue, Queue.offerAll([1, 2, 3, 4]))
      const result2 = yield* Fiber.join(fiber)
      assert.isFalse(result1)
      assert.strictEqual(result2, 1)
    }))

  it.effect("sliding - with offer", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.sliding<number>(2)
      yield* pipe(queue, Queue.offer(1))
      const result1 = yield* pipe(queue, Queue.offer(2))
      const result2 = yield* pipe(queue, Queue.offer(3))
      const result3 = yield* Queue.takeAll(queue)
      assert.isTrue(result1)
      assert.isTrue(result2)
      assert.deepStrictEqual(result3, Chunk.unsafeFromArray([2, 3]))
    }))

  it.effect("sliding - with offerAll", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.sliding<number>(2)
      const result1 = yield* pipe(queue, Queue.offerAll([1, 2, 3]))
      const result2 = yield* Queue.size(queue)
      assert.isTrue(result1)
      assert.strictEqual(result2, 2)
    }))

  it.effect("sliding - with enough capacity", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.sliding<number>(100)
      yield* pipe(queue, Queue.offer(1))
      yield* pipe(queue, Queue.offer(2))
      yield* pipe(queue, Queue.offer(3))
      const result = yield* Queue.takeAll(queue)
      assert.deepStrictEqual(result, Chunk.unsafeFromArray([1, 2, 3]))
    }))

  it.effect("sliding - with offerAll and takeAll", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.sliding<number>(2)
      const result1 = yield* pipe(queue, Queue.offerAll([1, 2, 3, 4, 5, 6]))
      const result2 = yield* Queue.takeAll(queue)
      assert.isTrue(result1)
      assert.deepStrictEqual(result2, Chunk.unsafeFromArray([5, 6]))
    }))

  it.effect("sliding - with pending taker", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.sliding<number>(2)
      yield* Effect.fork(Queue.take(queue))
      yield* waitForSize(queue, -1)
      const result1 = yield* pipe(queue, Queue.offerAll([1, 2, 3, 4]))
      const result2 = yield* Queue.take(queue)
      assert.isTrue(result1)
      assert.strictEqual(result2, 3)
    }))

  it.effect("sliding - check offerAll returns true", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.sliding<number>(5)
      const result = yield* pipe(queue, Queue.offerAll([1, 2, 3]))
      assert.isTrue(result)
    }))

  it.effect("awaitShutdown - once", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(3)
      const deferred = yield* Deferred.make<never, boolean>()
      yield* pipe(
        Queue.awaitShutdown(queue),
        Effect.zipRight(pipe(deferred, Deferred.succeed(true))),
        Effect.fork
      )
      yield* Queue.shutdown(queue)
      const result = yield* Deferred.await(deferred)
      assert.isTrue(result)
    }))

  it.effect("awaitShutdown - multiple", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(3)
      const deferred1 = yield* Deferred.make<never, boolean>()
      const deferred2 = yield* Deferred.make<never, boolean>()
      yield* pipe(Queue.awaitShutdown(queue), Effect.zipRight(pipe(deferred1, Deferred.succeed(true))), Effect.fork)
      yield* pipe(Queue.awaitShutdown(queue), Effect.zipRight(pipe(deferred2, Deferred.succeed(true))), Effect.fork)
      yield* Queue.shutdown(queue)
      const result1 = yield* Deferred.await(deferred1)
      const result2 = yield* Deferred.await(deferred2)
      assert.isTrue(result1)
      assert.isTrue(result2)
    }))

  it.effect("offers are suspended by back pressure", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(10)
      const ref = yield* Ref.make(true)
      yield* pipe(queue.offer(1), Effect.repeatN(9))
      const fiber = yield* pipe(
        queue,
        Queue.offer(2),
        Effect.zipRight(pipe(ref, Ref.set(false))),
        Effect.fork
      )
      yield* waitForSize(queue, 11)
      const result = yield* Ref.get(ref)
      yield* Fiber.interrupt(fiber)
      assert.isTrue(result)
    }))

  it.effect("back pressured offers are retrieved", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(10)
      const ref = yield* Ref.make<ReadonlyArray<number>>([])
      const values = Array.from(new Array(10), (_, i) => i + 1)
      const fiber = yield* Effect.forkAll(values.map((n) => pipe(queue, Queue.offer(n))))
      yield* waitForSize(queue, 10)
      yield* pipe(
        Queue.take(queue),
        Effect.flatMap((n) => pipe(ref, Ref.update((values) => [...values, n]))),
        Effect.repeatN(9)
      )
      const result = yield* Ref.get(ref)
      yield* Fiber.join(fiber)
      assert.deepStrictEqual(result, values)
    }))

  it.effect("back-pressured offer completes after take", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(2)
      yield* pipe(queue, Queue.offerAll([1, 2]))
      const fiber = yield* pipe(queue, Queue.offer(3), Effect.fork)
      yield* waitForSize(queue, 3)
      const result1 = yield* Queue.take(queue)
      const result2 = yield* Queue.take(queue)
      yield* Fiber.join(fiber)
      assert.strictEqual(result1, 1)
      assert.strictEqual(result2, 2)
    }))

  it.effect("back-pressured offer completes after takeAll", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(2)
      yield* pipe(queue, Queue.offerAll([1, 2]))
      const fiber = yield* pipe(queue, Queue.offer(3), Effect.fork)
      yield* waitForSize(queue, 3)
      const result = yield* Queue.takeAll(queue)
      yield* Fiber.join(fiber)
      assert.deepStrictEqual(result, Chunk.unsafeFromArray([1, 2]))
    }))

  it.effect("back-pressured offer completes after takeUpTo", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(2)
      yield* pipe(queue, Queue.offerAll([1, 2]))
      const fiber = yield* pipe(queue, Queue.offer(3), Effect.fork)
      yield* waitForSize(queue, 3)
      const result = yield* pipe(queue, Queue.takeUpTo(2))
      yield* Fiber.join(fiber)
      assert.deepStrictEqual(result, Chunk.unsafeFromArray([1, 2]))
    }))

  it.effect("back-pressured offerAll completes after takeAll", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(2)
      yield* pipe(queue, Queue.offerAll([1, 2]))
      const fiber = yield* pipe(queue, Queue.offerAll([3, 4, 5]), Effect.fork)
      yield* waitForSize(queue, 5)
      const result1 = yield* Queue.takeAll(queue)
      const result2 = yield* Queue.takeAll(queue)
      const result3 = yield* Queue.takeAll(queue)
      yield* Fiber.join(fiber)
      assert.deepStrictEqual(result1, Chunk.unsafeFromArray([1, 2]))
      assert.deepStrictEqual(result2, Chunk.unsafeFromArray([3, 4]))
      assert.deepStrictEqual(result3, Chunk.unsafeFromArray([5]))
    }))

  it.effect("take interruption", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      const fiber = yield* Effect.fork(Queue.take(queue))
      yield* waitForSize(queue, -1)
      yield* Fiber.interrupt(fiber)
      const result = yield* Queue.size(queue)
      assert.strictEqual(result, 0)
    }))

  it.effect("offer interruption", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(2)
      yield* pipe(queue, Queue.offer(1))
      yield* pipe(queue, Queue.offer(1))
      const fiber = yield* pipe(queue, Queue.offer(1), Effect.fork)
      yield* waitForSize(queue, 3)
      yield* Fiber.interrupt(fiber)
      const result = yield* Queue.size(queue)
      assert.strictEqual(result, 2)
    }))

  it.effect("offerAll with takeAll", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(10)
      const values = Chunk.range(1, 10)
      yield* pipe(queue, Queue.offerAll(values))
      yield* waitForSize(queue, 10)
      const result = yield* Queue.takeAll(queue)
      assert.deepStrictEqual(result, Chunk.range(1, 10))
    }))

  it.effect("offerAll with takeAll and back pressure", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(2)
      const values = Chunk.range(1, 3)
      const fiber = yield* pipe(queue, Queue.offerAll(values), Effect.fork)
      const size = yield* waitForSize(queue, 3)
      const result = yield* Queue.takeAll(queue)
      yield* Fiber.interrupt(fiber)
      assert.strictEqual(size, 3)
      assert.deepStrictEqual(result, Chunk.unsafeFromArray([1, 2]))
    }))

  it.effect("offerAll with takeAll and back pressure + interruption", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(2)
      const values1 = Chunk.range(1, 2)
      const values2 = Chunk.range(3, 4)
      yield* pipe(queue, Queue.offerAll(values1))
      const fiber = yield* pipe(queue, Queue.offerAll(values2), Effect.fork)
      yield* waitForSize(queue, 4)
      yield* Fiber.interrupt(fiber)
      const result1 = yield* Queue.takeAll(queue)
      const result2 = yield* Queue.takeAll(queue)
      assert.deepStrictEqual(result1, values1)
      assert.isTrue(Chunk.isEmpty(result2))
    }))

  it.effect("offerAll with takeAll and back pressure, check ordering", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(64)
      const fiber = yield* pipe(
        queue,
        Queue.offerAll(Array.from(Array(128), (_, i) => i + 1)),
        Effect.fork
      )
      yield* waitForSize(queue, 128)
      const result = yield* Queue.takeAll(queue)
      yield* Fiber.interrupt(fiber)
      assert.deepStrictEqual(result, Chunk.range(1, 64))
    }))

  it.effect("offerAll with pending takers", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(50)
      const takers = yield* Effect.forkAll(Array.from({ length: 100 }, () => Queue.take(queue)))
      yield* waitForSize(queue, -100)
      yield* queue.offerAll(Array.from(Array(100), (_, i) => i + 1))
      const result = yield* Fiber.join(takers)
      const size = yield* Queue.size(queue)
      assert.strictEqual(size, 0)
      assert.deepStrictEqual(result, Chunk.range(1, 100))
    }))

  it.effect("offerAll with pending takers, check ordering", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(256)
      const takers = yield* Effect.forkAll(Array.from({ length: 64 }, () => Queue.take(queue)))
      yield* waitForSize(queue, -64)
      yield* pipe(queue, Queue.offerAll(Array.from({ length: 128 }, (_, i) => i + 1)))
      const result = yield* Fiber.join(takers)
      const size = yield* Queue.size(queue)
      assert.strictEqual(size, 64)
      assert.deepStrictEqual(result, Chunk.range(1, 64))
    }))

  it.effect("offerAll with pending takers, check ordering of taker resolution", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(200)
      const takers = yield* Effect.forkAll(Array.from({ length: 100 }, () => Queue.take(queue)))
      yield* waitForSize(queue, -100)
      const fiber = yield* Effect.forkAll(Array.from({ length: 100 }, () => Queue.take(queue)))
      yield* waitForSize(queue, -200)
      yield* pipe(queue, Queue.offerAll(Array.from({ length: 100 }, (_, i) => i + 1)))
      const result = yield* Fiber.join(takers)
      const size = yield* Queue.size(queue)
      yield* Fiber.interrupt(fiber)
      assert.strictEqual(size, -100)
      assert.deepStrictEqual(result, Chunk.range(1, 100))
    }))

  it.effect("offerAll with take and back pressure", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(2)
      yield* pipe(queue, Queue.offerAll([1, 2, 3]), Effect.fork)
      yield* waitForSize(queue, 3)
      const result1 = yield* Queue.take(queue)
      const result2 = yield* Queue.take(queue)
      const result3 = yield* Queue.take(queue)
      assert.strictEqual(result1, 1)
      assert.strictEqual(result2, 2)
      assert.strictEqual(result3, 3)
    }))

  it.effect("offerAll multiple with back pressure", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(2)
      yield* pipe(queue, Queue.offerAll([1, 2, 3]), Effect.fork)
      yield* waitForSize(queue, 3)
      yield* pipe(queue, Queue.offerAll([4, 5]), Effect.fork)
      yield* waitForSize(queue, 5)
      const result1 = yield* Queue.take(queue)
      const result2 = yield* Queue.take(queue)
      const result3 = yield* Queue.take(queue)
      const result4 = yield* Queue.take(queue)
      const result5 = yield* Queue.take(queue)
      assert.strictEqual(result1, 1)
      assert.strictEqual(result2, 2)
      assert.strictEqual(result3, 3)
      assert.strictEqual(result4, 4)
      assert.strictEqual(result5, 5)
    }))

  it.effect("offerAll with takeAll, check ordering", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(1000)
      yield* pipe(queue, Queue.offer(1))
      yield* pipe(queue, Queue.offerAll(Chunk.range(2, 1000)))
      yield* waitForSize(queue, 1000)
      const result = yield* Queue.takeAll(queue)
      assert.deepStrictEqual(result, Chunk.range(1, 1000))
    }))

  it.effect("offerAll combination of offer, offerAll, take, takeAll", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(32)
      yield* pipe(queue, Queue.offer(1))
      yield* pipe(queue, Queue.offer(2))
      yield* pipe(queue, Queue.offerAll(Chunk.range(3, 35)), Effect.fork)
      yield* waitForSize(queue, 35)
      const result1 = yield* Queue.takeAll(queue)
      const result2 = yield* Queue.take(queue)
      const result3 = yield* Queue.take(queue)
      const result4 = yield* Queue.take(queue)
      assert.deepStrictEqual(result1, Chunk.range(1, 32))
      assert.strictEqual(result2, 33)
      assert.strictEqual(result3, 34)
      assert.strictEqual(result4, 35)
    }))

  it.effect("parallel takes and sequential offers", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      const fiber = yield* Effect.forkAll(Array.from({ length: 10 }, () => Queue.take(queue)))
      yield* Array.from({ length: 10 }, (_, i) => pipe(queue, Queue.offer(i + 1)))
        .reduce((acc, curr) => pipe(acc, Effect.zipRight(curr)), Effect.succeed(false))
      const result = yield* Fiber.join(fiber)
      assert.deepStrictEqual(result, Chunk.range(1, 10))
    }))

  it.effect("parallel offers and sequential takes", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(10)
      const fiber = yield* Effect.forkAll(Array.from({ length: 10 }, (_, i) => pipe(queue, Queue.offer(i + 1))))
      yield* waitForSize(queue, 10)
      const ref = yield* Ref.make<ReadonlyArray<number>>([])
      yield* pipe(
        Queue.take(queue),
        Effect.flatMap((n) => pipe(ref, Ref.update((ns) => [...ns, n]))),
        Effect.repeatN(9)
      )
      const result = yield* Ref.get(ref)
      yield* Fiber.join(fiber)
      assert.deepStrictEqual(result, Array.from({ length: 10 }, (_, i) => i + 1))
    }))

  it.effect("sequential offer and take", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      const offer1 = yield* pipe(queue, Queue.offer(10))
      const result1 = yield* Queue.take(queue)
      const offer2 = yield* pipe(queue, Queue.offer(20))
      const result2 = yield* Queue.take(queue)
      assert.isTrue(offer1)
      assert.strictEqual(result1, 10)
      assert.isTrue(offer2)
      assert.strictEqual(result2, 20)
    }))

  it.effect("sequential take and offer", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<string>(100)
      const fiber = yield* pipe(
        Queue.take(queue),
        Effect.zipWith(Queue.take(queue), (a, b) => a + b),
        Effect.fork
      )
      yield* pipe(
        queue,
        Queue.offer("don't "),
        Effect.zipRight(pipe(queue, Queue.offer("give up :D")))
      )
      const result = yield* Fiber.join(fiber)
      assert.strictEqual(result, "don't give up :D")
    }))

  it.effect("poll on empty queue", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(5)
      const result = yield* Queue.poll(queue)
      assert.deepStrictEqual(result, Option.none)
    }))

  it.effect("poll on queue just emptied", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(5)
      yield* pipe(queue, Queue.offerAll([1, 2, 3, 4]))
      yield* Queue.takeAll(queue)
      const result = yield* Queue.poll(queue)
      assert.deepStrictEqual(result, Option.none)
    }))

  it.effect("multiple polls", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(5)
      yield* pipe(queue, Queue.offerAll([1, 2]))
      const result1 = yield* Queue.poll(queue)
      const result2 = yield* Queue.poll(queue)
      const result3 = yield* Queue.poll(queue)
      const result4 = yield* Queue.poll(queue)
      assert.deepStrictEqual(result1, Option.some(1))
      assert.deepStrictEqual(result2, Option.some(2))
      assert.deepStrictEqual(result3, Option.none)
      assert.deepStrictEqual(result4, Option.none)
    }))

  it.effect("shutdown with take fiber", () =>
    Effect.gen(function*() {
      const fiberId = yield* Effect.fiberId()
      const queue = yield* Queue.bounded<number>(3)
      const fiber = yield* Effect.fork(Queue.take(queue))
      yield* waitForSize(queue, -1)
      yield* Queue.shutdown(queue)
      const result = yield* Effect.either(Effect.sandbox(Fiber.join(fiber)))
      assert.deepStrictEqual(result, Either.left(Cause.interrupt(fiberId)))
    }))

  it.effect("shutdown with offer fiber", () =>
    Effect.gen(function*() {
      const fiberId = yield* Effect.fiberId()
      const queue = yield* Queue.bounded<number>(2)
      yield* pipe(queue, Queue.offer(1))
      yield* pipe(queue, Queue.offer(1))
      const fiber = yield* pipe(queue, Queue.offer(1), Effect.fork)
      yield* waitForSize(queue, 3)
      yield* Queue.shutdown(queue)
      const result = yield* Effect.either(Effect.sandbox(Fiber.join(fiber)))
      assert.deepStrictEqual(result, Either.left(Cause.interrupt(fiberId)))
    }))

  it.effect("shutdown with offer", () =>
    Effect.gen(function*() {
      const fiberId = yield* Effect.fiberId()
      const queue = yield* Queue.bounded<number>(1)
      yield* Queue.shutdown(queue)
      const result = yield* pipe(queue, Queue.offer(1), Effect.sandbox, Effect.either)
      assert.deepStrictEqual(result, Either.left(Cause.interrupt(fiberId)))
    }))

  it.effect("shutdown with take", () =>
    Effect.gen(function*() {
      const fiberId = yield* Effect.fiberId()
      const queue = yield* Queue.bounded<number>(1)
      yield* Queue.shutdown(queue)
      const result = yield* pipe(Queue.take(queue), Effect.sandbox, Effect.either)
      assert.deepStrictEqual(result, Either.left(Cause.interrupt(fiberId)))
    }))

  it.effect("shutdown with takeAll", () =>
    Effect.gen(function*() {
      const fiberId = yield* Effect.fiberId()
      const queue = yield* Queue.bounded<number>(1)
      yield* Queue.shutdown(queue)
      const result = yield* pipe(Queue.takeAll(queue), Effect.sandbox, Effect.either)
      assert.deepStrictEqual(result, Either.left(Cause.interrupt(fiberId)))
    }))

  it.effect("shutdown with takeUpTo", () =>
    Effect.gen(function*() {
      const fiberId = yield* Effect.fiberId()
      const queue = yield* Queue.bounded<number>(1)
      yield* Queue.shutdown(queue)
      const result = yield* pipe(queue, Queue.takeUpTo(1), Effect.sandbox, Effect.either)
      assert.deepStrictEqual(result, Either.left(Cause.interrupt(fiberId)))
    }))

  it.effect("shutdown with size", () =>
    Effect.gen(function*() {
      const fiberId = yield* Effect.fiberId()
      const queue = yield* Queue.bounded<number>(1)
      yield* Queue.shutdown(queue)
      const result = yield* pipe(Queue.size(queue), Effect.sandbox, Effect.either)
      assert.deepStrictEqual(result, Either.left(Cause.interrupt(fiberId)))
    }))

  it.effect("shutdown race condition with offer", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(2)
      const fiber = yield* pipe(queue, Queue.offer(1), Effect.forever, Effect.fork)
      yield* Queue.shutdown(queue)
      const result = yield* Fiber.await(fiber)
      assert.isTrue(Exit.isFailure(result))
    }))

  it.effect("shutdown race condition with take", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(2)
      yield* pipe(queue, Queue.offer(1))
      yield* pipe(queue, Queue.offer(1))
      const fiber = yield* pipe(Queue.take(queue), Effect.forever, Effect.fork)
      yield* Queue.shutdown(queue)
      const result = yield* Fiber.await(fiber)
      assert.isTrue(Exit.isFailure(result))
    }))

  it.effect("isShutdown indicates shutdown status", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(5)
      const result1 = yield* Queue.isShutdown(queue)
      yield* pipe(queue, Queue.offer(1))
      const result2 = yield* Queue.isShutdown(queue)
      yield* Queue.takeAll(queue)
      const result3 = yield* Queue.isShutdown(queue)
      yield* Queue.shutdown(queue)
      const result4 = yield* Queue.isShutdown(queue)
      assert.isFalse(result1)
      assert.isFalse(result2)
      assert.isFalse(result3)
      assert.isTrue(result4)
    }))

  it.effect("takeAll returns all values from a non-empty queue", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.unbounded<number>()
      yield* pipe(queue, Queue.offer(1))
      yield* pipe(queue, Queue.offer(2))
      yield* pipe(queue, Queue.offer(3))
      const result = yield* Queue.takeAll(queue)
      assert.deepStrictEqual(result, Chunk.range(1, 3))
    }))

  it.effect("takeAll returns all values from an empty queue", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.unbounded<number>()
      const result1 = yield* Queue.takeAll(queue)
      yield* pipe(queue, Queue.offer(1))
      yield* Queue.take(queue)
      const result2 = yield* Queue.takeAll(queue)
      assert.isTrue(Chunk.isEmpty(result1))
      assert.isTrue(Chunk.isEmpty(result2))
    }))

  it.effect("takeAll does not return more than the queue size", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(4)
      yield* [1, 2, 3, 4]
        .map((n) => pipe(queue, Queue.offer(n)))
        .reduce((acc, curr) => pipe(acc, Effect.zipRight(curr)), Effect.succeed(false))
      yield* pipe(queue, Queue.offer(5), Effect.fork)
      yield* waitForSize(queue, 5)
      const result1 = yield* Queue.takeAll(queue)
      const result2 = yield* Queue.take(queue)
      assert.deepStrictEqual(result1, Chunk.range(1, 4))
      assert.strictEqual(result2, 5)
    }))

  it.effect("takeBetween returns immediately if there is enough elements", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      yield* pipe(queue, Queue.offer(1))
      yield* pipe(queue, Queue.offer(2))
      yield* pipe(queue, Queue.offer(3))
      const result = yield* pipe(queue, Queue.takeBetween(2, 5))
      assert.deepStrictEqual(result, Chunk.range(1, 3))
    }))

  it.effect("takeBetween returns an empty list if boundaries are inverted", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      yield* pipe(queue, Queue.offer(1))
      yield* pipe(queue, Queue.offer(2))
      yield* pipe(queue, Queue.offer(3))
      const result = yield* pipe(queue, Queue.takeBetween(5, 2))
      assert.isTrue(Chunk.isEmpty(result))
    }))

  it.effect("takeBetween returns an empty list if boundaries are negative", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      yield* pipe(queue, Queue.offer(1))
      yield* pipe(queue, Queue.offer(2))
      yield* pipe(queue, Queue.offer(3))
      const result = yield* pipe(queue, Queue.takeBetween(-5, -2))
      assert.isTrue(Chunk.isEmpty(result))
    }))

  it.effect("takeBetween blocks until a required minimum of elements is collected", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      const updater = pipe(queue, Queue.offer(10), Effect.forever)
      const getter = pipe(queue, Queue.takeBetween(5, 10))
      const result = yield* pipe(getter, Effect.race(updater))
      assert.isAtLeast(result.length, 5)
    }))

  it.effect("takeBetween returns elements in the correct order", () =>
    Effect.gen(function*() {
      const values = [-10, -7, -4, -1, 5, 10]
      const queue = yield* Queue.bounded<number>(100)
      const fiber = yield* pipe(values, Effect.forEach((n) => pipe(queue, Queue.offer(n))), Effect.fork)
      const result = yield* pipe(queue, Queue.takeBetween(values.length, values.length))
      yield* Fiber.interrupt(fiber)
      assert.deepStrictEqual(result, Chunk.unsafeFromArray(values))
    }))

  it.effect("takeN returns immediately if there is enough elements", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      yield* pipe(queue, Queue.offerAll([1, 2, 3, 4, 5]))
      const result = yield* pipe(queue, Queue.takeN(3))
      assert.deepStrictEqual(result, Chunk.range(1, 3))
    }))

  it.effect("takeN returns an empty list if a negative number or zero is specified", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      yield* pipe(queue, Queue.offerAll([1, 2, 3]))
      const result1 = yield* pipe(queue, Queue.takeN(-3))
      const result2 = yield* pipe(queue, Queue.takeN(0))
      assert.isTrue(Chunk.isEmpty(result1))
      assert.isTrue(Chunk.isEmpty(result2))
    }))

  it.effect("takeN blocks until the required number of elements is available", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      const updater = pipe(queue, Queue.offer(10), Effect.forever)
      const getter = pipe(queue, Queue.takeN(5))
      const result = yield* pipe(getter, Effect.race(updater))
      assert.strictEqual(result.length, 5)
    }))

  it.effect("should return the specified number of elements from a non-empty queue", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      yield* pipe(queue, Queue.offer(1))
      yield* pipe(queue, Queue.offer(2))
      const result = yield* pipe(queue, Queue.takeUpTo(2))
      assert.deepStrictEqual(result, Chunk.range(1, 2))
    }))

  it.effect("should return an empty collection from an empty queue", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      const result = yield* pipe(queue, Queue.takeUpTo(2))
      assert.isTrue(Chunk.isEmpty(result))
    }))

  it.effect("should handle an empty queue with max higher than queue size", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      const result = yield* pipe(queue, Queue.takeUpTo(101))
      assert.isTrue(Chunk.isEmpty(result))
    }))

  it.effect("should leave behind elements if necessary", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      yield* pipe(queue, Queue.offer(1))
      yield* pipe(queue, Queue.offer(2))
      yield* pipe(queue, Queue.offer(3))
      yield* pipe(queue, Queue.offer(4))
      const result = yield* pipe(queue, Queue.takeUpTo(2))
      assert.deepStrictEqual(result, Chunk.range(1, 2))
    }))

  it.effect("should handle not enough items", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      yield* pipe(queue, Queue.offer(1))
      yield* pipe(queue, Queue.offer(2))
      yield* pipe(queue, Queue.offer(3))
      yield* pipe(queue, Queue.offer(4))
      const result = yield* pipe(queue, Queue.takeUpTo(10))
      assert.deepStrictEqual(result, Chunk.range(1, 4))
    }))

  it.effect("should handle taking up to 0 items", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      yield* pipe(queue, Queue.offer(1))
      yield* pipe(queue, Queue.offer(2))
      yield* pipe(queue, Queue.offer(3))
      yield* pipe(queue, Queue.offer(4))
      const result = yield* pipe(queue, Queue.takeUpTo(0))
      assert.isTrue(Chunk.isEmpty(result))
    }))

  it.effect("should handle taking up to -1 items", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      yield* pipe(queue, Queue.offer(1))
      yield* pipe(queue, Queue.offer(2))
      yield* pipe(queue, Queue.offer(3))
      yield* pipe(queue, Queue.offer(4))
      const result = yield* pipe(queue, Queue.takeUpTo(-1))
      assert.isTrue(Chunk.isEmpty(result))
    }))

  it.effect("should handle taking up to Number.POSITIVE_INFINITY items", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      yield* pipe(queue, Queue.offer(1))
      const result = yield* pipe(queue, Queue.takeUpTo(Number.POSITIVE_INFINITY))
      assert.deepStrictEqual(result, Chunk.unsafeFromArray([1]))
    }))

  it.effect("multiple take up to calls", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      yield* pipe(queue, Queue.offer(1))
      yield* pipe(queue, Queue.offer(2))
      const result1 = yield* pipe(queue, Queue.takeUpTo(2))
      yield* pipe(queue, Queue.offer(3))
      yield* pipe(queue, Queue.offer(4))
      const result2 = yield* pipe(queue, Queue.takeUpTo(2))
      assert.deepStrictEqual(result1, Chunk.range(1, 2))
      assert.deepStrictEqual(result2, Chunk.range(3, 4))
    }))

  it.effect("consecutive take up to calls", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      yield* pipe(queue, Queue.offer(1))
      yield* pipe(queue, Queue.offer(2))
      yield* pipe(queue, Queue.offer(3))
      yield* pipe(queue, Queue.offer(4))
      const result1 = yield* pipe(queue, Queue.takeUpTo(2))
      const result2 = yield* pipe(queue, Queue.takeUpTo(2))
      assert.deepStrictEqual(result1, Chunk.range(1, 2))
      assert.deepStrictEqual(result2, Chunk.range(3, 4))
    }))

  it.effect("does not return back-pressured offers", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(4)
      yield* [1, 2, 3, 4]
        .map((n) => pipe(queue, Queue.offer(n)))
        .reduce((acc, curr) => pipe(acc, Effect.zipRight(curr)), Effect.succeed(false))
      const fiber = yield* pipe(queue, Queue.offer(5), Effect.fork)
      yield* waitForSize(queue, 5)
      const result = yield pipe(queue, Queue.takeUpTo(5))
      yield* Fiber.interrupt(fiber)
      assert.deepStrictEqual(result, Chunk.range(1, 4))
    }))

  it.effect("rts - handles falsy values", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.unbounded<number>()
      yield* pipe(queue, Queue.offer(0))
      const result = yield* Queue.take(queue)
      assert.strictEqual(result, 0)
    }))

  it.effect("rts - queue is ordered", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.unbounded<number>()
      yield* pipe(queue, Queue.offer(1))
      yield* pipe(queue, Queue.offer(2))
      yield* pipe(queue, Queue.offer(3))
      const result1 = yield* Queue.take(queue)
      const result2 = yield* Queue.take(queue)
      const result3 = yield* Queue.take(queue)
      assert.strictEqual(result1, 1)
      assert.strictEqual(result2, 2)
      assert.strictEqual(result3, 3)
    }))
})