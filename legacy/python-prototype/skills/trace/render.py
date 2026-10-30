"""Interactive execution trace viewer skill with predict/compare workflow."""

from __future__ import annotations

import json
from typing import Any, Dict

from skills.registry import BaseSkill, VisualOutput, wrap_in_html_page
from skills.trace.sandbox import execute_sandboxed_trace


class TraceSkill(BaseSkill):
    name = "trace"
    description = "Executes code in a sandbox and renders an interactive step-by-step trace viewer."

    def render(self, spec: Dict[str, Any]) -> VisualOutput:
        concept = spec.get("concept", "code-execution")
        code = spec.get("code", "def countdown(n):\n    if n <= 0: return\n    print(n)\n    countdown(n - 1)\n\ncountdown(3)")
        prediction_prompt = spec.get(
            "prediction_prompt",
            "Predict what will be printed or what variable states change on the first step!",
        )

        trace_res = execute_sandboxed_trace(code)

        if trace_res.status != "SUCCESS":
            # Render error or security notice
            err_body = f"""
            <div style="background: #450a0a; border: 1px solid #dc2626; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
              <h3 style="color: #f87171; margin-top: 0;">⚠️ Sandbox Notice: {trace_res.status}</h3>
              <p style="color: #fca5a5; font-family: monospace; white-space: pre-wrap;">{trace_res.error_message}</p>
            </div>
            <pre style="background: #020617; padding: 1rem; border-radius: 6px; color: #94a3b8;"><code>{code}</code></pre>
            """
            html = wrap_in_html_page(title=f"Trace: {concept.title()}", body_content=err_body)
            return VisualOutput(
                skill=self.name,
                concept=concept,
                html=html,
                has_blanks=True,
                metadata={"status": trace_res.status, "error": trace_res.error_message},
            )

        # Successful trace: bundle steps into JSON for client-side step-through
        steps_json = json.dumps([
            {
                "line_no": s.line_no,
                "line_code": s.line_code,
                "func_name": s.func_name,
                "call_depth": s.call_depth,
                "locals": s.locals,
                "stdout": s.stdout,
            }
            for s in trace_res.steps
        ])

        code_lines_html = "".join([
            f'<div class="code-line" id="line-{i+1}"><span class="line-num">{i+1}</span><span class="line-text">{line}</span></div>'
            for i, line in enumerate(code.splitlines())
        ])

        body_content = f"""
        <!-- Predict First Card -->
        <div style="background: #1e1b4b; border: 1px solid #4338ca; border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 1.5rem;">
          <strong style="color: #a5b4fc;">🔮 Predict First:</strong>
          <p style="margin: 0.25rem 0 0 0; color: #e0e7ff; font-size: 1.05rem;">{prediction_prompt}</p>
        </div>

        <!-- Two Column Trace Viewer -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
          <!-- Left: Code Lines -->
          <div style="background: #020617; border: 1px solid #334155; border-radius: 8px; padding: 0.75rem; font-family: monospace; font-size: 0.9rem; overflow-x: auto; max-height: 380px;">
            <div style="color: #64748b; font-size: 0.8rem; margin-bottom: 0.5rem; text-transform: uppercase;">Source Code</div>
            {code_lines_html}
          </div>

          <!-- Right: Execution State -->
          <div style="background: #020617; border: 1px solid #334155; border-radius: 8px; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.75rem; max-height: 380px; overflow-y: auto;">
            <div>
              <div style="color: #64748b; font-size: 0.8rem; text-transform: uppercase;">Call Stack (Depth)</div>
              <div id="stack-frame" style="color: #38bdf8; font-family: monospace; font-weight: bold; margin-top: 0.25rem;">Global</div>
            </div>
            <div>
              <div style="color: #64748b; font-size: 0.8rem; text-transform: uppercase;">Variables</div>
              <div id="vars-table" style="font-family: monospace; color: #34d399; margin-top: 0.25rem; font-size: 0.85rem;">None</div>
            </div>
            <div>
              <div style="color: #64748b; font-size: 0.8rem; text-transform: uppercase;">Standard Output</div>
              <pre id="stdout-box" style="margin: 0.25rem 0 0 0; background: #0f172a; padding: 0.5rem; border-radius: 4px; color: #f8fafc; font-family: monospace; min-height: 40px; font-size: 0.85rem;"></pre>
            </div>
          </div>
        </div>

        <!-- Controls -->
        <div style="display: flex; align-items: center; justify-content: space-between; background: #0f172a; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid #334155;">
          <div>
            <button id="btn-prev" onclick="changeStep(-1)" style="padding: 0.4rem 0.8rem; background: #334155; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">◀ Previous</button>
            <button id="btn-next" onclick="changeStep(1)" style="padding: 0.4rem 0.8rem; background: #0284c7; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; margin-left: 0.5rem;">Next Step ▶</button>
          </div>
          <div id="step-counter" style="font-family: monospace; color: #94a3b8; font-weight: 600;">Step 1 of {len(trace_res.steps)}</div>
        </div>

        <style>
          .code-line {{ display: flex; padding: 0.15rem 0.5rem; border-radius: 3px; }}
          .code-line.active {{ background: #0369a1; color: #ffffff; font-weight: bold; border-left: 3px solid #38bdf8; }}
          .line-num {{ width: 30px; color: #475569; user-select: none; }}
          .line-text {{ white-space: pre; }}
        </style>

        <script>
          const steps = {steps_json};
          let curIdx = 0;

          function renderStep(idx) {{
            if (!steps || steps.length === 0) return;
            const s = steps[idx];

            // Highlight code line
            document.querySelectorAll('.code-line').forEach(el => el.classList.remove('active'));
            const activeLine = document.getElementById('line-' + s.line_no);
            if (activeLine) activeLine.classList.add('active');

            // Update call stack
            let depthStr = "Depth " + s.call_depth + ": " + s.func_name + "()";
            document.getElementById('stack-frame').innerText = depthStr;

            // Update variables
            const varBox = document.getElementById('vars-table');
            const keys = Object.keys(s.locals);
            if (keys.length === 0) {{
              varBox.innerText = "(No local variables)";
            }} else {{
              varBox.innerHTML = keys.map(k => "<div><strong>" + k + "</strong> = " + s.locals[k] + "</div>").join("");
            }}

            // Update output
            document.getElementById('stdout-box').innerText = s.stdout || "(no output yet)";
            document.getElementById('step-counter').innerText = "Step " + (idx + 1) + " of " + steps.length;

            document.getElementById('btn-prev').disabled = (idx === 0);
            document.getElementById('btn-next').disabled = (idx === steps.length - 1);
          }}

          function changeStep(delta) {{
            const nextIdx = curIdx + delta;
            if (nextIdx >= 0 && nextIdx < steps.length) {{
              curIdx = nextIdx;
              renderStep(curIdx);
            }}
          }}

          // Initial render
          renderStep(0);
        </script>
        """

        html = wrap_in_html_page(title=f"Trace: {concept.title()}", body_content=body_content)
        return VisualOutput(
            skill=self.name,
            concept=concept,
            html=html,
            has_blanks=True,
            metadata={"steps_count": len(trace_res.steps), "status": trace_res.status},
        )
