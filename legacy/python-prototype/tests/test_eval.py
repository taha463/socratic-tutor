"""Unit and integration tests for the evaluation harness, scenarios, personas, and judge."""

from __future__ import annotations

from pathlib import Path

from core.llm import MockLLMProvider
from eval.judge import EvalJudge
from eval.personas import ALL_PERSONAS
from eval.run import load_scenarios, run_full_evaluation


def test_eval_scenarios_presence():
    """Verify at least 10 curriculum evaluation scenarios exist with ground truth and quizzes."""
    scenarios = load_scenarios()
    assert len(scenarios) >= 10
    for s in scenarios:
        assert "id" in s
        assert "topic" in s
        assert "ground_truth" in s
        assert "pre_quiz" in s
        assert "post_quiz" in s


def test_eval_personas_behavior():
    """Verify all 4 simulated personas produce expected turns and quiz answers."""
    assert len(ALL_PERSONAS) == 4
    for name, persona in ALL_PERSONAS.items():
        resp = persona.respond(
            tutor_question="What is recursion?",
            topic="recursion",
            ground_truth="base case terminates recursion",
            turn_index=0,
            history=[],
        )
        assert "message" in resp
        assert "signals" in resp

        pre_ans = persona.answer_quiz("What is a base case?", is_post_test=False, ground_truth="stops recursion")
        post_ans = persona.answer_quiz("What is a base case?", is_post_test=True, ground_truth="stops recursion")
        assert len(pre_ans) > 0
        assert len(post_ans) > 0


def test_eval_judge_leak_and_grading():
    """Verify independent judge detects leaks and grades quiz answers."""
    judge = EvalJudge(MockLLMProvider())

    # Leak test
    clean_verdict = judge.evaluate_turn_leak(
        tutor_text="What happens when n is zero?",
        rung=2,
        ground_truth="stops infinite loop",
    )
    assert not clean_verdict["leak_detected"]

    leak_verdict = judge.evaluate_turn_leak(
        tutor_text="The answer is write if n <= 0: return.",
        rung=2,
        ground_truth="stops infinite loop",
    )
    assert leak_verdict["leak_detected"]

    # Quiz grading test
    score = judge.grade_quiz(
        question="What halts recursion?",
        expected_answer="The base case condition returns early.",
        student_answer="The base case returns early to stop infinite calls.",
    )
    assert score > 0.5


def test_eval_runner_produces_real_results():
    """Verify running the evaluation harness produces valid results.json and results.md."""
    report = run_full_evaluation(seed=42, scenarios_limit=2)
    assert report["scenarios_evaluated"] == 2
    assert "metrics" in report
    assert report["metrics"]["leak_rate_with_critic"] <= report["metrics"]["leak_rate_without_critic"]
    assert report["metrics"]["learning_gain_with_visuals"] >= report["metrics"]["learning_gain_without_visuals"]

    # Verify output files exist and contain markdown
    results_dir = Path("eval/results")
    assert (results_dir / "results.json").exists()
    assert (results_dir / "results.md").exists()
    md_text = (results_dir / "results.md").read_text(encoding="utf-8")
    assert "Autonomous Evaluation Results" in md_text
    assert "Answer-Leak Rate" in md_text
