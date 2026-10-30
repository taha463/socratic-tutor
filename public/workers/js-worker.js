/**
 * Client-Side Sandboxed JavaScript Execution Worker
 */

self.onmessage = function (e) {
  const { code, id } = e.data;
  const logs = [];

  const originalLog = console.log;
  console.log = function (...args) {
    logs.push(args.map(String).join(" "));
    originalLog.apply(console, args);
  };

  try {
    const fn = new Function(code);
    const result = fn();
    self.postMessage({
      id,
      success: true,
      logs: logs.join("\n"),
      returnValue: result !== undefined ? String(result) : undefined,
    });
  } catch (err) {
    self.postMessage({
      id,
      success: false,
      error: err.message,
      logs: logs.join("\n"),
    });
  } finally {
    console.log = originalLog;
  }
};
