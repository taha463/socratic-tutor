/**
 * Client-Side Pyodide Execution Worker (Lazy-Loaded)
 * Runs Python code entirely in the browser with step-by-step frame capture.
 */

let pyodidePromise = null;

async function getPyodide() {
  if (!pyodidePromise) {
    // Import Pyodide from official CDN
    importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js");
    pyodidePromise = self.loadPyodide();
  }
  return pyodidePromise;
}

self.onmessage = async function (e) {
  const { code, id } = e.data;

  try {
    const pyodide = await getPyodide();
    
    // Setup stdout capture and frame tracer
    pyodide.runPython(`
import sys
import io

sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
frames = []

def tracer(frame, event, arg):
    if event == 'call' or event == 'line':
        code_obj = frame.f_code
        # Filter for user script only
        if code_obj.co_filename == '<string>':
            frames.append({
                'line': frame.f_lineno,
                'func': code_obj.co_name,
                'locals': {k: str(v) for k, v in frame.f_locals.items() if not k.startswith('__') and k not in ('sys', 'io', 'frames', 'tracer')}
            })
    return tracer

sys.settrace(tracer)
`);

    pyodide.runPython(code);

    const result = pyodide.runPython(`
sys.settrace(None)
stdout_val = sys.stdout.getvalue()
stderr_val = sys.stderr.getvalue()
(stdout_val, frames)
`);

    const stdout = result.get(0);
    const rawFrames = result.get(1).toJs();

    self.postMessage({
      id,
      success: true,
      stdout,
      frames: rawFrames,
    });
  } catch (err) {
    self.postMessage({
      id,
      success: false,
      error: err.message,
    });
  }
};

