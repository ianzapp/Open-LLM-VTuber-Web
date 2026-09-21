import { describe, expect, it } from 'vitest';
import { TaskQueue } from './task-queue';

describe('TaskQueue', () => {
  it('clearQueue() does not let two tasks run at once', async () => {
    const queue = new TaskQueue(0);
    const order: string[] = [];
    let resolveSlow: () => void;
    const slow = () => new Promise<void>((resolve) => {
      resolveSlow = resolve;
    }).then(() => {
      order.push('slow-done');
    });

    queue.addTask(slow);
    // Let the slow task actually start running.
    await new Promise((resolve) => setTimeout(resolve, 10));

    queue.clearQueue();

    const second = () => {
      order.push('second-start');
      return Promise.resolve();
    };
    queue.addTask(second);

    // The second task must not have started while the slow one is still in flight.
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(order).toEqual([]);

    resolveSlow!();
    await queue.waitForCompletion();

    expect(order).toEqual(['slow-done', 'second-start']);
  });
});
