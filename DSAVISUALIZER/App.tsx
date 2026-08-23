import { useEffect, useState } from "react";

type Mode =
  | "infix-postfix"
  | "infix-prefix"
  | "prefix-infix"
  | "prefix-postfix"
  | "postfix-infix"
  | "postfix-prefix";

type Step = {
  number: number;
  action: string;
  character: string;
  description: string;
  remarks: string;
  tokens: string[];
  current: number;
  stack: string[];
  output: string[];
};

type Result = {
  output: string[];
  steps: Step[];
  error?: string;
};

const modeLabels: Record<Mode, string> = {
  "infix-postfix": "Infix → Postfix",
  "infix-prefix": "Infix → Prefix",
  "prefix-infix": "Prefix → Infix",
  "prefix-postfix": "Prefix → Postfix",
  "postfix-infix": "Postfix → Infix",
  "postfix-prefix": "Postfix → Prefix"
};

const examples: Record<Mode, string> = {
  "infix-postfix": "A+B*C",
  "infix-prefix": "A+B*C",
  "prefix-infix": "*+AB-CD",
  "prefix-postfix": "*+AB-CD",
  "postfix-infix": "AB+C*",
  "postfix-prefix": "AB+C*"
};

const operators = ["+", "-", "*", "/", "%", "^"];

const isOperator = (x: string) => operators.includes(x);

const isOperand = (x: string) => /^[A-Za-z0-9]$/.test(x);

const precedence = (x: string) => {
  if (x === "^") return 3;
  if (["*", "/", "%"].includes(x)) return 2;
  if (["+", "-"].includes(x)) return 1;
  return 0;
};

const tokenize = (expression: string) =>
  expression.replace(/\s+/g, "").split("").filter(Boolean);

function makeStep(
  steps: Step[],
  tokens: string[],
  current: number,
  action: string,
  character: string,
  description: string,
  remarks: string,
  stack: string[],
  output: string[]
) {
  steps.push({
    number: steps.length + 1,
    action,
    character,
    description,
    remarks,
    tokens,
    current,
    stack: [...stack],
    output: [...output]
  });
}

function infixToPostfix(tokens: string[], steps: Step[]) {
  const stack: string[] = [];
  const output: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (isOperand(token)) {
      output.push(token);
      makeStep(
        steps, tokens, i, "Output operand", token,
        `${token} is an operand, so it goes directly to the output.`,
        "Operands are written immediately.",
        stack, output
      );
      continue;
    }

    if (token === "(") {
      stack.push(token);
      makeStep(
        steps, tokens, i, "Push", token,
        "Opening parenthesis is pushed onto the stack.",
        "It marks the beginning of a grouped expression.",
        stack, output
      );
      continue;
    }

    if (token === ")") {
      while (stack.length && stack[stack.length - 1] !== "(") {
        output.push(stack.pop()!);
      }

      if (!stack.length) {
        throw new Error("Mismatched parentheses.");
      }

      stack.pop();

      makeStep(
        steps, tokens, i, "Pop until (", token,
        "Operators are popped until the opening parenthesis is reached.",
        "Parentheses themselves are not added to postfix.",
        stack, output
      );
      continue;
    }

    if (isOperator(token)) {
      while (
        stack.length &&
        isOperator(stack[stack.length - 1]) &&
        (
          precedence(stack[stack.length - 1]) > precedence(token) ||
          (
            precedence(stack[stack.length - 1]) === precedence(token) &&
            token !== "^"
          )
        )
      ) {
        output.push(stack.pop()!);
      }

      stack.push(token);

      makeStep(
        steps, tokens, i, "Push operator", token,
        `${token} is pushed after checking operator precedence.`,
        "Higher-precedence operators are handled first. ^ is right-associative.",
        stack, output
      );
      continue;
    }

    throw new Error(`Invalid character "${token}".`);
  }

  while (stack.length) {
    const top = stack.pop()!;
    if (top === "(") throw new Error("Mismatched parentheses.");
    output.push(top);
  }

  makeStep(
    steps, tokens, tokens.length - 1, "Finish", "END",
    "All remaining operators have been moved to the output.",
    "The conversion is complete.",
    stack, output
  );

  return output;
}

function infixToPrefix(tokens: string[], steps: Step[]) {
  const reversed = [...tokens].reverse().map(token => {
    if (token === "(") return ")";
    if (token === ")") return "(";
    return token;
  });

  const tempSteps: Step[] = [];
  const postfix = infixToPostfix(reversed, tempSteps);
  const prefix = [...postfix].reverse();

  for (let i = 0; i < tempSteps.length; i++) {
    const s = tempSteps[i];
    makeStep(
      steps,
      tokens,
      Math.max(0, tokens.length - 1 - s.current),
      s.action,
      s.character,
      `Reverse-and-convert: ${s.description}`,
      "Infix is reversed, converted to postfix, then reversed to obtain prefix.",
      s.stack,
      s.output
    );
  }

  return prefix;
}

function prefixToInfix(tokens: string[], steps: Step[]) {
  const stack: string[] = [];

  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];

    if (isOperand(token)) {
      stack.push(token);

      makeStep(
        steps, tokens, i, "Push operand", token,
        `${token} is pushed onto the stack.`,
        "Prefix is scanned from right to left.",
        stack, []
      );
      continue;
    }

    if (isOperator(token)) {
      if (stack.length < 2) {
        throw new Error(`Not enough operands for "${token}".`);
      }

      const left = stack.pop()!;
      const right = stack.pop()!;
      const combined = `(${left}${token}${right})`;

      stack.push(combined);

      makeStep(
        steps, tokens, i, "Combine", token,
        `${token} combines the top two expressions.`,
        `${combined} is pushed back onto the stack.`,
        stack, []
      );
      continue;
    }

    throw new Error(`Invalid character "${token}".`);
  }

  if (stack.length !== 1) {
    throw new Error("Invalid prefix expression.");
  }

  return tokenize(stack[0]);
}

function prefixToPostfix(tokens: string[], steps: Step[]) {
  const stack: string[] = [];

  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];

    if (isOperand(token)) {
      stack.push(token);

      makeStep(
        steps, tokens, i, "Push operand", token,
        `${token} is pushed onto the stack.`,
        "Prefix is scanned from right to left.",
        stack, []
      );
      continue;
    }

    if (isOperator(token)) {
      if (stack.length < 2) {
        throw new Error(`Not enough operands for "${token}".`);
      }

      const left = stack.pop()!;
      const right = stack.pop()!;
      const combined = left + right + token;

      stack.push(combined);

      makeStep(
        steps, tokens, i, "Combine", token,
        `${token} combines the top two expressions.`,
        `${combined} is pushed back onto the stack in postfix form.`,
        stack, []
      );
      continue;
    }

    throw new Error(`Invalid character "${token}".`);
  }

  if (stack.length !== 1) {
    throw new Error("Invalid prefix expression.");
  }

  return tokenize(stack[0]);
}

function postfixToInfix(tokens: string[], steps: Step[]) {
  const stack: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (isOperand(token)) {
      stack.push(token);

      makeStep(
        steps, tokens, i, "Push operand", token,
        `${token} is pushed onto the stack.`,
        "Operands wait for an operator.",
        stack, []
      );
      continue;
    }

    if (isOperator(token)) {
      if (stack.length < 2) {
        throw new Error(`Not enough operands for "${token}".`);
      }

      const right = stack.pop()!;
      const left = stack.pop()!;
      const combined = `(${left}${token}${right})`;

      stack.push(combined);

      makeStep(
        steps, tokens, i, "Combine", token,
        `${token} combines the top two expressions.`,
        `${combined} is pushed back onto the stack.`,
        stack, []
      );
      continue;
    }

    throw new Error(`Invalid character "${token}".`);
  }

  if (stack.length !== 1) {
    throw new Error("Invalid postfix expression.");
  }

  return tokenize(stack[0]);
}

function postfixToPrefix(tokens: string[], steps: Step[]) {
  const stack: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (isOperand(token)) {
      stack.push(token);

      makeStep(
        steps, tokens, i, "Push operand", token,
        `${token} is pushed onto the stack.`,
        "Operands wait for an operator.",
        stack, []
      );
      continue;
    }

    if (isOperator(token)) {
      if (stack.length < 2) {
        throw new Error(`Not enough operands for "${token}".`);
      }

      const right = stack.pop()!;
      const left = stack.pop()!;
      const combined = token + left + right;

      stack.push(combined);

      makeStep(
        steps, tokens, i, "Combine", token,
        `${token} combines the top two expressions.`,
        `${combined} is pushed back onto the stack in prefix form.`,
        stack, []
      );
      continue;
    }

    throw new Error(`Invalid character "${token}".`);
  }

  if (stack.length !== 1) {
    throw new Error("Invalid postfix expression.");
  }

  return tokenize(stack[0]);
}

function convertExpression(mode: Mode, expression: string): Result {
  const tokens = tokenize(expression);
  const steps: Step[] = [];

  if (!tokens.length) {
    return {
      output: [],
      steps: [],
      error: "Please enter an expression."
    };
  }

  try {
    let output: string[];

    switch (mode) {
      case "infix-postfix":
        output = infixToPostfix(tokens, steps);
        break;
      case "infix-prefix":
        output = infixToPrefix(tokens, steps);
        break;
      case "prefix-infix":
        output = prefixToInfix(tokens, steps);
        break;
      case "prefix-postfix":
        output = prefixToPostfix(tokens, steps);
        break;
      case "postfix-infix":
        output = postfixToInfix(tokens, steps);
        break;
      case "postfix-prefix":
        output = postfixToPrefix(tokens, steps);
        break;
    }

    return { output, steps };
  } catch (error) {
    return {
      output: [],
      steps,
      error: error instanceof Error
        ? error.message
        : "Conversion failed."
    };
  }
}

function App() {
  const [mode, setMode] = useState<Mode>("prefix-infix");
  const [expression, setExpression] = useState(examples["prefix-infix"]);
  const [result, setResult] = useState<Result | null>(null);
  const [stepIndex, setStepIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(700);

  const currentStep =
    result && stepIndex >= 0
      ? result.steps[stepIndex]
      : undefined;

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
    const converted = convertExpression(mode, expression);
    setResult(converted);
    setPlaying(false);

    if (converted.error || converted.steps.length === 0) {
      setStepIndex(-1);
    } else {
      setStepIndex(0);
    }
  };

  const reset = () => {
    setExpression(examples[mode]);
    setResult(null);
    setStepIndex(-1);
    setPlaying(false);
  };

  const next = () => {
    if (!result) return;
    setStepIndex(value =>
      Math.min(value + 1, result.steps.length - 1)
    );
  };

  const previous = () => {
    setStepIndex(value => Math.max(value - 1, 0));
  };

  const tokens =
    currentStep?.tokens ?? tokenize(expression);

  const activeIndex =
    currentStep?.current ?? -1;

  const stack =
    currentStep?.stack ?? [];

  const output =
    currentStep?.output ?? [];

  const finalOutput =
    result?.output.join(" ") ?? "—";

  const progress =
    result && result.steps.length > 0
      ? ((Math.max(stepIndex, 0) + 1) /
          result.steps.length) * 100
      : 0;

  return (
    <div className="app">

      <header className="topbar">
        <div className="brand">
          <span>DSA</span>
          <b>Visualizer</b>
        </div>

        <button className="menu" aria-label="Menu">
          ☰
        </button>
      </header>

      <main className="container">

        <section className="hero">
          <div className="eyebrow">
            STACK • EXPRESSION NOTATION
          </div>

          <h1>
            Infix, Prefix &amp; Postfix Visualizer
          </h1>

          <p>
            See every token, stack operation and decision —
            one step at a time.
          </p>
        </section>

        <section className="panel controls">

          <label>CONVERSION TYPE</label>

          <select
            value={mode}
            onChange={event =>
              setMode(event.target.value as Mode)
            }
          >
            {(Object.keys(modeLabels) as Mode[]).map(key => (
              <option key={key} value={key}>
                {modeLabels[key]}
              </option>
            ))}
          </select>

          <label>EXPRESSION</label>

          <input
            value={expression}
            onChange={event =>
              setExpression(event.target.value)
            }
            spellCheck={false}
          />

          <div className="button-row">
            <button
              className="primary"
              onClick={convertNow}
            >
              Convert →
            </button>

            <button
              className="secondary"
              onClick={reset}
            >
              Reset
            </button>
          </div>

          {result?.error && (
            <div className="error">
              {result.error}
            </div>
          )}

          {result && !result.error && (
            <div className="success">
              Result: <strong>{finalOutput}</strong>
            </div>
          )}

        </section>

        {result && !result.error && (
          <>

            <section className="panel">

              <div className="player-head">

                <div>
                  <span className="muted">
                    STEP
                  </span>

                  <strong>
                    {stepIndex + 1} / {result.steps.length}
                  </strong>
                </div>

                <select
                  value={speed}
                  onChange={event =>
                    setSpeed(Number(event.target.value))
                  }
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
                  onClick={() =>
                    setPlaying(value => !value)
                  }
                >
                  {playing ? "Pause" : "▶ Play"}
                </button>

                <button
                  className="secondary"
                  onClick={next}
                  disabled={
                    stepIndex >= result.steps.length - 1
                  }
                >
                  Next →
                </button>

              </div>

            </section>

            <section className="visual-grid">

              <div className="panel">
                <div className="section-title">
                  SCAN
                </div>

                <div className="tokens">
                  {tokens.map((token, index) => (
                    <span
                      key={`${token}-${index}`}
                      className={[
                        "token",
                        index === activeIndex
                          ? "current"
                          : "",
                        index < activeIndex
                          ? "done"
                          : ""
                      ].join(" ")}
                    >
                      {token}
                    </span>
                  ))}
                </div>
              </div>

              <div className="panel">

                <div className="section-title">
                  STACK
                  <small>TOP ↑</small>
                </div>

                <div className="stack-box">
                  {stack.length > 0 ? (
                    [...stack]
                      .reverse()
                      .map((item, index) => (
                        <div
                          key={`${item}-${index}`}
                          className={
                            `stack-item ${
                              index === 0
                                ? "top"
                                : ""
                            }`
                          }
                        >
                          {item}
                        </div>
                      ))
                  ) : (
                    <div className="empty">
                      empty
                    </div>
                  )}
                </div>

              </div>

              <div className="panel">

                <div className="section-title">
                  OUTPUT
                </div>

                <div className="tokens">
                  {output.length > 0 ? (
                    output.map((item, index) => (
                      <span
                        className="out-token"
                        key={`${item}-${index}`}
                      >
                        {item}
                      </span>
                    ))
                  ) : (
                    <span className="empty">
                      empty
                    </span>
                  )}
                </div>

              </div>

            </section>

            <section className="panel">

              <div className="section-title">
                CONVERSION STATUS
              </div>

              {currentStep && (
                <>
                  <div className="status-action">
                    {currentStep.action}

                    <span>
                      {currentStep.character}
                    </span>
                  </div>

                  <p>
                    <strong>
                      {currentStep.description}
                    </strong>
                  </p>

                  <p className="remarks">
                    <b>Why?</b>{" "}
                    {currentStep.remarks}
                  </p>
                </>
              )}

            </section>

            <section className="panel">

              <div className="section-title">
                CONVERSION STEPS
              </div>

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
                        className={
                          index === stepIndex
                            ? "active-row"
                            : ""
                        }
                      >
                        <td>{step.number}</td>

                        <td>{step.action}</td>

                        <td>
                          <code>
                            {step.character}
                          </code>
                        </td>

                        <td>
                          {step.description}
                        </td>

                        <td>
                          {step.remarks}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                </table>

              </div>

            </section>

          </>
        )}

        <section className="panel reference">

          <div className="section-title">
            REFERENCE
          </div>

          <h2>
            Operator Precedence
          </h2>

          <div className="precedence">

            <div>
              <code>()</code>
              <span>Parentheses</span>
              <b>Highest</b>
            </div>

            <div>
              <code>^</code>
              <span>Exponentiation</span>
              <b>3 • Right → Left</b>
            </div>

            <div>
              <code>* / %</code>
              <span>
                Multiply / Divide / Modulus
              </span>
              <b>2 • Left → Right</b>
            </div>

            <div>
              <code>+ -</code>
              <span>Add / Subtract</span>
              <b>1 • Left → Right</b>
            </div>

          </div>

        </section>

      </main>
    </div>
  );
}

export default App;