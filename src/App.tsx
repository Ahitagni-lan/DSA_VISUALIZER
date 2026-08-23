import { useEffect, useState } from "react";
import { convert, examples, modeLabels } from "./algorithms";
import type { Mode, Result, Step } from "./types";

const modes = Object.keys(modeLabels) as Mode[];

export default function App() {
  const [mode, setMode] = useState<Mode>("infix-postfix");
  const [expression, setExpression] = useState(examples["infix-postfix"]);
  const [result, setResult] = useState<Result | null>(null);
  const [stepIndex, setStepIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(700);

  const currentStep: Step | undefined =
    result && stepIndex >= 0 ? result.steps[stepIndex] : undefined;

  useEffect(() => {
    setExpression(examples[mode]);
    setResult(null);
    setStepIndex(-1);
    setPlaying(false);
  }, [mode]);

  useEffect(() => {
    if (!playing || !result) return;

    if (stepIndex >= result.steps.length - 1) {
      setPlaying(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setStepIndex(value => value + 1);
    }, speed);

    return () => window.clearTimeout(timer);
  }, [playing, result, stepIndex, speed]);

  const convertNow = () => {
    const converted = convert(mode, expression);
    setResult(converted);
    setStepIndex(
      converted.error || converted.steps.length === 0 ? -1 : 0
    );
    setPlaying(false);
  };

  const reset = () => {
    setExpression(examples[mode]);
    setResult(null);
    setStepIndex(-1);
    setPlaying(false);
  };

  const next = () => {
    if (!result) return;
    setStepIndex(value => Math.min(value + 1, result.steps.length - 1));
  };

  const previous = () => {
    setStepIndex(value => Math.max(value - 1, 0));
  };

  const visibleTokens =
    currentStep?.tokens ??
    expression.replace(/\s+/g, "").split("").filter(Boolean);

  const activeIndex = currentStep?.current ?? -1;
  const stack = currentStep?.stack ?? [];
  const output = currentStep?.output ?? [];
  const finalOutput = result?.output.join(" ") ?? "—";

  const progress =
    result && result.steps.length
      ? ((Math.max(stepIndex, 0) + 1) / result.steps.length) * 100
      : 0;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span>DSA</span>
          <strong>Visualizer</strong>
        </div>
        <div className="badge">STACK LAB</div>
      </header>

      <main className="container">
        <section className="hero">
          <div className="eyebrow">DATA STRUCTURES • EXPRESSION NOTATION</div>
          <h1>Infix, Prefix & Postfix Visualizer</h1>
          <p>
            Watch every token, stack operation and conversion decision one
            step at a time.
          </p>
        </section>

        <section className="panel controls">
          <label>CONVERSION TYPE</label>

          <select
            value={mode}
            onChange={event => setMode(event.target.value as Mode)}
          >
            {modes.map(item => (
              <option key={item} value={item}>
                {modeLabels[item]}
              </option>
            ))}
          </select>

          <label>EXPRESSION</label>

          <input
            value={expression}
            onChange={event => setExpression(event.target.value)}
            spellCheck={false}
            placeholder="Example: A+B*(C-D)"
          />

          <div className="button-row">
            <button className="primary" onClick={convertNow}>
              Convert →
            </button>
            <button className="secondary" onClick={reset}>
              Reset
            </button>
          </div>

          {result?.error && <div className="error">{result.error}</div>}

          {result && !result.error && (
            <div className="success">
              Result: <strong>{finalOutput}</strong>
            </div>
          )}
        </section>

        {result && !result.error && (
          <>
            <section className="panel player">
              <div className="player-head">
                <div>
                  <span className="muted">STEP</span>
                  <strong>
                    {stepIndex + 1} / {result.steps.length}
                  </strong>
                </div>

                <select
                  value={speed}
                  onChange={event => setSpeed(Number(event.target.value))}
                >
                  <option value={1200}>Slow</option>
                  <option value={700}>Normal</option>
                  <option value={300}>Fast</option>
                </select>
              </div>

              <div className="progress">
                <span style={{ width: `${progress}%` }} />
              </div>

              <div className="button-row">
                <button
                  className="secondary"
                  onClick={previous}
                  disabled={stepIndex <= 0}
                >
                  ← Previous
                </button>

                <button
                  className="play"
                  onClick={() => setPlaying(value => !value)}
                >
                  {playing ? "Pause" : "▶ Play"}
                </button>

                <button
                  className="secondary"
                  onClick={next}
                  disabled={stepIndex >= result.steps.length - 1}
                >
                  Next →
                </button>
              </div>
            </section>

            <section className="visual-grid">
              <div className="panel visual">
                <div className="section-title">SCAN</div>
                <div className="tokens">
                  {visibleTokens.map((token, index) => (
                    <span
                      key={`${token}-${index}`}
                      className={`token ${
                        index === activeIndex ? "current" : ""
                      } ${index < activeIndex ? "done" : ""}`}
                    >
                      {token}
                    </span>
                  ))}
                </div>
              </div>

              <div className="panel visual">
                <div className="section-title">
                  STACK <small>TOP ↑</small>
                </div>

                <div className="stack-box">
                  {stack.length ? (
                    [...stack].reverse().map((item, index) => (
                      <div
                        className={`stack-item ${index === 0 ? "top" : ""}`}
                        key={`${item}-${index}`}
                      >
                        {item}
                      </div>
                    ))
                  ) : (
                    <div className="empty">empty</div>
                  )}
                </div>
              </div>

              <div className="panel visual">
                <div className="section-title">OUTPUT</div>

                <div className="tokens output">
                  {output.length ? (
                    output.map((token, index) => (
                      <span
                        className="out-token"
                        key={`${token}-${index}`}
                      >
                        {token}
                      </span>
                    ))
                  ) : (
                    <span className="empty">empty</span>
                  )}
                </div>
              </div>
            </section>

            <section className="panel status">
              <div className="section-title">CONVERSION STATUS</div>

              {currentStep && (
                <>
                  <div className="status-action">
                    {currentStep.action}
                    <span>{currentStep.character}</span>
                  </div>

                  <p>
                    <strong>{currentStep.description}</strong>
                  </p>

                  <p className="remarks">
                    <b>Why?</b> {currentStep.remarks}
                  </p>
                </>
              )}
            </section>

            <section className="panel">
              <div className="section-title">CONVERSION STEPS</div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Step</th>
                      <th>Action</th>
                      <th>Character</th>
                      <th>Description</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>

                  <tbody>
                    {result.steps.map((step, index) => (
                      <tr
                        key={step.number}
                        className={index === stepIndex ? "active-row" : ""}
                        onClick={() => setStepIndex(index)}
                      >
                        <td>{step.number}</td>
                        <td>{step.action}</td>
                        <td><code>{step.character}</code></td>
                        <td>{step.description}</td>
                        <td>{step.remarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        <section className="panel reference">
          <div className="section-title">REFERENCE</div>
          <h2>Operator Precedence</h2>

          <div className="precedence">
            <div><code>()</code><span>Parentheses</span><b>Highest</b></div>
            <div><code>^</code><span>Exponentiation</span><b>3 • Right → Left</b></div>
            <div><code>* / %</code><span>Multiply / Divide / Modulus</span><b>2 • Left → Right</b></div>
            <div><code>+ -</code><span>Add / Subtract</span><b>1 • Left → Right</b></div>
          </div>
        </section>
      </main>
    </div>
  );
}