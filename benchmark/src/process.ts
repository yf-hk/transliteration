import { fork } from 'node:child_process';
import { object, text } from './json.js';
import { repository } from './paths.js';
import { metadata, startup } from './protocol.js';
import type { Metadata, NodeAdapter, Startup, WorkerJob } from './types.js';

type Pending = {
  id: number;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};
export async function startWorker(adapter: NodeAdapter) {
  const child = fork(new URL('./worker.js', import.meta.url), [], {
    cwd: repository,
    execArgv: ['--expose-gc'],
    env: { ...process.env, BENCHMARK_ADAPTER: JSON.stringify(adapter) },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  let pending: Pending | undefined;
  let requestId = 0;
  let diagnostic = '';
  let alive = true;
  const append = (chunk: Buffer) => {
    diagnostic = `${diagnostic}${chunk.toString()}`.slice(-8192);
  };
  child.stdout?.on('data', append);
  child.stderr?.on('data', append);
  const ready = new Promise<{ metadata: Metadata; startup: Startup }>(
    (resolve, reject) => {
      const timer = setTimeout(
        () => fail(new Error('Worker startup exceeded 30 seconds')),
        30_000
      );
      function fail(error: Error): void {
        clearTimeout(timer);
        reject(error);
        if (pending) {
          clearTimeout(pending.timer);
          pending.reject(error);
          pending = undefined;
        }
        alive = false;
        child.kill();
      }
      child.on('error', fail);
      child.on('exit', (code, signal) =>
        fail(
          new Error(
            `Worker exited (${code}, ${signal ?? 'none'}): ${diagnostic}`
          )
        )
      );
      child.on('message', (value: unknown) => {
        try {
          const record = object(value);
          if (record.type === 'ready') {
            clearTimeout(timer);
            resolve({
              metadata: metadata(record.metadata),
              startup: startup(record.startup),
            });
            return;
          }
          if (record.type === 'startup-error') {
            fail(new Error(text(record.error)));
            return;
          }
          if (!pending || record.requestId !== pending.id)
            throw new Error('Unexpected worker response');
          const current = pending;
          pending = undefined;
          clearTimeout(current.timer);
          settle(current, record);
        } catch (error) {
          fail(toError(error));
        }
      });
    }
  );
  const loaded = await ready;
  return {
    ...loaded,
    request(job: WorkerJob): Promise<unknown> {
      if (!alive || pending)
        return Promise.reject(
          new Error('Worker request requires an idle live process')
        );
      return new Promise((resolve, reject) => {
        const id = ++requestId;
        const timer = setTimeout(() => {
          pending = undefined;
          alive = false;
          child.kill();
          reject(new Error(`${job.type} exceeded 30 seconds`));
        }, 30_000);
        pending = { id, resolve, reject, timer };
        child.send({ ...job, requestId: id }, (error) => {
          if (error && pending) {
            clearTimeout(pending.timer);
            pending.reject(error);
            pending = undefined;
            child.kill();
          }
        });
      });
    },
    close(): Promise<void> {
      if (!alive) return Promise.resolve();
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          child.kill();
          resolve();
        }, 1000);
        child.once('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
        if (child.connected) child.disconnect();
        else child.kill();
      });
    },
  };
}

function settle(pending: Pending, response: Record<string, unknown>): void {
  if (response.ok === true) pending.resolve(response.result);
  else pending.reject(new Error(text(response.error)));
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}
