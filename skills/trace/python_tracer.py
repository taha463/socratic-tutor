#!/usr/bin/env python3
"""
Sandboxed Python Execution Tracer
Executes student Python code under AST security checks, strict step bounds,
and snapshots line-by-line memory states (locals) for interactive step-debugging.
"""

import sys
import json
import io
import ast

FORBIDDEN_NAMES = {
    "os", "subprocess", "sys", "socket", "urllib", "http", "requests",
    "shutil", "pathlib", "ctypes", "multiprocessing", "threading",
    "builtins", "__import__", "eval", "exec", "open", "compile",
    "breakpoint", "globals", "locals"
}

def validate_ast_security(code_str: str):
    """
    Statically analyzes code to block dangerous modules, builtins, and attribute tampering.
    """
    try:
        tree = ast.parse(code_str)
    except SyntaxError as e:
        return f"SyntaxError on line {e.lineno}: {e.msg}"

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                base = alias.name.split('.')[0]
                if base in FORBIDDEN_NAMES:
                    return f"Security Violation: Import of module '{alias.name}' is prohibited in the Socratic sandbox."
        elif isinstance(node, ast.ImportFrom):
            base = (node.module or '').split('.')[0]
            if base in FORBIDDEN_NAMES:
                return f"Security Violation: Import from module '{node.module}' is prohibited in the Socratic sandbox."
        elif isinstance(node, ast.Name):
            if node.id in {"eval", "exec", "open", "__import__"}:
                return f"Security Violation: Builtin function '{node.id}' is prohibited in the Socratic sandbox."
        elif isinstance(node, ast.Attribute):
            if node.attr.startswith("__") and node.attr.endswith("__"):
                if node.attr in {"__subclasses__", "__bases__", "__globals__", "__code__"}:
                    return f"Security Violation: Access to dunder attribute '{node.attr}' is prohibited."
    return None

def trace_execution(code_str: str, max_steps: int = 300):
    """
    Traces code execution and captures line-by-line local variables.
    """
    sec_err = validate_ast_security(code_str)
    if sec_err:
        return {
            "success": False,
            "error": sec_err,
            "steps": [],
            "stdout": "",
            "totalSteps": 0,
            "timedOut": False
        }

    steps = []
    lines = code_str.split('\n')
    step_count = 0

    def tracer(frame, event, arg):
        nonlocal step_count
        if event == 'line' and frame.f_code.co_filename == '<string>':
            step_count += 1
            if step_count > max_steps:
                raise RuntimeError(f"Step limit exceeded ({max_steps} execution steps). Check for infinite recursion or unbreaking loops.")

            lineno = frame.f_lineno
            line_text = lines[lineno - 1] if 1 <= lineno <= len(lines) else ''

            # Snapshot frame locals cleanly
            safe_locals = {}
            for k, v in frame.f_locals.items():
                if not k.startswith('_'):
                    try:
                        v_repr = repr(v)
                        if len(v_repr) > 100:
                            v_repr = v_repr[:97] + '...'
                        safe_locals[k] = v_repr
                    except Exception:
                        safe_locals[k] = '<unprintable>'

            steps.append({
                "step": step_count,
                "line": lineno,
                "code": line_text.strip(),
                "rawCode": line_text,
                "function": frame.f_code.co_name,
                "locals": safe_locals
            })
        return tracer

    old_stdout = sys.stdout
    sys.stdout = capture_buffer = io.StringIO()
    err_msg = None
    success = False

    try:
        sys.settrace(tracer)
        # Execute in isolated clean namespace with standard safe builtins
        safe_builtins = {
            k: v for k, v in __builtins__.__dict__.items()
            if k not in FORBIDDEN_NAMES and not k.startswith('_')
        }
        namespace = {'__name__': '__main__', '__builtins__': safe_builtins}
        exec(code_str, namespace)
        success = True
    except Exception as e:
        err_msg = f"{type(e).__name__}: {str(e)}"
    finally:
        sys.settrace(None)
        sys.stdout = old_stdout

    return {
        "success": success and err_msg is None,
        "error": err_msg,
        "steps": steps,
        "stdout": capture_buffer.getvalue(),
        "totalSteps": len(steps),
        "timedOut": "Step limit exceeded" in (err_msg or "")
    }

if __name__ == '__main__':
    try:
        input_data = sys.stdin.read()
        if not input_data.strip():
            print(json.dumps({"success": False, "error": "No code provided", "steps": []}))
            sys.exit(0)
        
        parsed = json.loads(input_data)
        code = parsed.get("code", "")
        max_steps = int(parsed.get("maxSteps", 300))
        result = trace_execution(code, max_steps=max_steps)
        print(json.dumps(result))
    except Exception as ex:
        print(json.dumps({"success": False, "error": f"Fatal tracer error: {str(ex)}", "steps": []}))
