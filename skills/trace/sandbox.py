"""Sandboxed Python code tracer with strict security controls and step-by-step state capture."""

from __future__ import annotations

import ast
import json
import subprocess
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional

FORBIDDEN_MODULES = {
    "socket",
    "http",
    "urllib",
    "requests",
    "httpx",
    "subprocess",
    "multiprocessing",
    "ctypes",
    "posix",
    "winreg",
    "pty",
    "pickle",
    "shutil",
    "webbrowser",
}

FORBIDDEN_CALLS = {
    "eval",
    "exec",
    "compile",
    "__import__",
    "globals",
    "locals",
}


@dataclass
class TraceStep:
    line_no: int
    line_code: str
    func_name: str
    call_depth: int
    locals: Dict[str, str] = field(default_factory=dict)
    stdout: str = ""
    event: str = "line"


@dataclass
class SandboxResult:
    status: str  # "SUCCESS", "TIMEOUT", "SECURITY_VIOLATION", "RUNTIME_ERROR"
    steps: List[TraceStep] = field(default_factory=list)
    stdout: str = ""
    error_message: Optional[str] = None
    code: str = ""


def check_code_safety(code: str) -> Optional[str]:
    """Inspect AST to statically forbid hazardous modules, network libraries, or shell execution."""
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return f"Syntax error: {e}"

    for node in ast.walk(tree):
        # Disallow forbidden imports
        if isinstance(node, ast.Import):
            for alias in node.names:
                root_pkg = alias.name.split(".")[0]
                if root_pkg in FORBIDDEN_MODULES:
                    return f"Import of forbidden module '{alias.name}' is prohibited in sandbox."
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                root_pkg = node.module.split(".")[0]
                if root_pkg in FORBIDDEN_MODULES:
                    return f"Import from forbidden module '{node.module}' is prohibited in sandbox."
        # Disallow dangerous built-in invocations
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id in FORBIDDEN_CALLS:
                return f"Use of built-in function '{node.func.id}()' is prohibited in sandbox."

    return None


TRACER_HARNESS_TEMPLATE = """
import sys
import json
import io

code_str = {code_repr}
lines = code_str.splitlines()

captured_steps = []
stdout_capture = io.StringIO()
original_stdout = sys.stdout
sys.stdout = stdout_capture

MAX_STEPS = 120

def tracer(frame, event, arg):
    if len(captured_steps) >= MAX_STEPS:
        return None
    # Only trace user code in <string>
    if frame.f_code.co_filename != "<string>":
        return tracer

    line_no = frame.f_lineno
    line_text = lines[line_no - 1] if 0 < line_no <= len(lines) else ""
    func = frame.f_code.co_name

    # Calculate call depth
    depth = 0
    cur = frame
    while cur:
        if cur.f_code.co_filename == "<string>":
            depth += 1
        cur = cur.f_back

    # Capture primitive/safe locals
    local_vars = {{}}
    for k, v in frame.f_locals.items():
        if not k.startswith("__"):
            try:
                local_vars[k] = repr(v)[:60]
            except Exception:
                local_vars[k] = "<unrepr>"

    captured_steps.append({{
        "line_no": line_no,
        "line_code": line_text.strip(),
        "func_name": func,
        "call_depth": depth,
        "locals": local_vars,
        "stdout": stdout_capture.getvalue(),
        "event": event
    }})
    return tracer

sys.settrace(tracer)
try:
    exec(compile(code_str, "<string>", "exec"), {{}})
except Exception as e:
    sys.settrace(None)
    sys.stdout = original_stdout
    err_type = type(e).__name__
    print("RUNTIME_ERROR:" + err_type + ": " + str(e), file=sys.stderr)
    sys.exit(1)
finally:
    sys.settrace(None)
    sys.stdout = original_stdout

print(json.dumps({{
    "status": "SUCCESS",
    "stdout": stdout_capture.getvalue(),
    "steps": captured_steps
}}))
"""


def execute_sandboxed_trace(code: str, timeout_seconds: float = 5.0) -> SandboxResult:
    """Run Python code inside a sandboxed subprocess and extract execution trace."""
    safety_err = check_code_safety(code)
    if safety_err:
        return SandboxResult(
            status="SECURITY_VIOLATION",
            error_message=safety_err,
            code=code,
        )

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        harness_code = TRACER_HARNESS_TEMPLATE.format(code_repr=repr(code))
        script_file = tmp_path / "run_trace.py"
        script_file.write_text(harness_code, encoding="utf-8")

        try:
            proc = subprocess.run(
                [sys.executable, str(script_file)],
                cwd=str(tmp_path),
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
            )
        except subprocess.TimeoutExpired:
            return SandboxResult(
                status="TIMEOUT",
                error_message=f"Execution exceeded hard timeout limit of {timeout_seconds}s (possible infinite loop).",
                code=code,
            )
        except Exception as e:
            return SandboxResult(
                status="RUNTIME_ERROR",
                error_message=str(e),
                code=code,
            )

        if proc.returncode != 0:
            stderr_out = proc.stderr.strip()
            return SandboxResult(
                status="RUNTIME_ERROR",
                error_message=stderr_out or "Runtime exception occurred during execution.",
                stdout=proc.stdout,
                code=code,
            )

        try:
            data = json.loads(proc.stdout)
            steps = [
                TraceStep(
                    line_no=s["line_no"],
                    line_code=s["line_code"],
                    func_name=s["func_name"],
                    call_depth=s["call_depth"],
                    locals=s["locals"],
                    stdout=s["stdout"],
                    event=s["event"],
                )
                for s in data.get("steps", [])
            ]
            return SandboxResult(
                status="SUCCESS",
                steps=steps,
                stdout=data.get("stdout", ""),
                code=code,
            )
        except Exception as e:
            return SandboxResult(
                status="RUNTIME_ERROR",
                error_message=f"Failed to parse trace output: {e}\nRaw output: {proc.stdout}",
                code=code,
            )
