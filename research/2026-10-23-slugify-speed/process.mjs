import { fork } from 'node:child_process';
import { repository } from './adapters.mjs';

export async function startWorker(adapter) {
  const child = fork(new URL('./worker.mjs', import.meta.url), [adapter.id], {
    cwd: repository,
    execArgv: ['--expose-gc'],
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  let diagnostic = '';
  let pending;
  let requestId = 0;
  let alive = true;
  let readyTimer;
  let resolveReady;
  let rejectReady;
  const ready = new Promise((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
    readyTimer = setTimeout(
      () => fail(new Error('Worker startup exceeded 30 seconds')),
      30_000
    );
  });
  const appendDiagnostic = (chunk) => {
    diagnostic = `${diagnostic}${chunk}`.slice(-8192);
  };
  child.stdout.on('data', appendDiagnostic);
  child.stderr.on('data', appendDiagnostic);

  function fail(error) {
    clearTimeout(readyTimer);
    rejectReady(error);
    if (pending) {
      clearTimeout(pending.timer);
      pending.reject(error);
      pending = undefined;
    }
    alive = false;
    child.kill();
  }

  child.on('error', fail);
  child.on('exit', (code, signal) => {
    alive = false;
    clearTimeout(readyTimer);
    const error = new Error(
      `Worker exited (code ${code}, signal ${signal ?? 'none'})${diagnostic ? `: ${diagnostic.trim()}` : ''}`
    );
    rejectReady(error);
    if (pending) {
      clearTimeout(pending.timer);
      pending.reject(error);
      pending = undefined;
    }
  });
  child.on('message', (message) => {
    if (message.type === 'ready') {
      clearTimeout(readyTimer);
      resolveReady(message);
    } else if (message.type === 'startup-error') {
      fail(new Error(message.error));
    } else if (pending && message.requestId === pending.id) {
      const current = pending;
      pending = undefined;
      clearTimeout(current.timer);
      if (message.ok) current.resolve(message.result);
      else
        current.reject(
          Object.assign(new Error(message.error.message), {
            details: message.error,
          })
        );
    }
  });

  const { metadata, startup } = await ready;
  return {
    metadata,
    startup,
    request(type, parameters = {}) {
      if (!alive)
        return Promise.reject(new Error('Worker is no longer running'));
      if (pending)
        return Promise.reject(
          new Error('Only one worker request may be active')
        );
      return new Promise((resolve, reject) => {
        const id = ++requestId;
        const timer = setTimeout(
          () => fail(new Error(`${type} exceeded 30 seconds`)),
          30_000
        );
        pending = { id, resolve, reject, timer };
        child.send({ requestId: id, type, ...parameters }, (error) => {
          if (error) fail(error);
        });
      });
    },
    close() {
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
