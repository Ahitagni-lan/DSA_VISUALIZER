import type { Mode, Result, Step } from "./types";

export const modeLabels: Record<Mode, string> = {
  "infix-prefix": "Infix → Prefix",
  "infix-postfix": "Infix → Postfix",
  "prefix-infix": "Prefix → Infix",
  "prefix-postfix": "Prefix → Postfix",
  "postfix-infix": "Postfix → Infix",
  "postfix-prefix": "Postfix → Prefix"
};

export const examples: Record<Mode, string> = {
  "infix-prefix": "A+B*(C-D)^E",
  "infix-postfix": "A+B*(C-D)^E",
  "prefix-infix": "-+A*B^CDE",
  "prefix-postfix": "-+A*B^CDE",
  "postfix-infix": "ABCD-*+",
  "postfix-prefix": "ABCD-*+"
};

export function isOperator(value: string): boolean {
  return ["+", "-", "*", "/", "%", "^"].includes(value);
}

function isOperand(value: string): boolean {
  return !isOperator(value) && value !== "(" && value !== ")";
}

function precedence(op: string): number {
  if (op === "^") return 3;
  if (["*", "/", "%"].includes(op)) return 2;
  if (["+", "-"].includes(op)) return 1;
  return 0;
}

function tokenize(expression: string): string[] {
  const cleaned = expression.trim();
  if (!cleaned) return [];
  return /\s/.test(cleaned)
    ? cleaned.split(/\s+/).filter(Boolean)
    : cleaned.split("");
}

function addStep(
  steps: Step[],
  action: string,
  character: string,
  description: string,
  remarks: string,
  tokens: string[],
  current: number,
  stack: string[],
  output: string[]
) {
  steps.push({
    number: steps.length + 1,
    action,
    character,
    description,
    remarks,
    tokens: [...tokens],
    current,
    stack: [...stack],
    output: [...output]
  });
}

function errorResult(message: string): Result {
  return { output: [], steps: [], error: message };
}

export function infixToPostfix(expression: string): Result {
  const tokens = tokenize(expression);
  const stack: string[] = [];
  const output: string[] = [];
  const steps: Step[] = [];

  if (!tokens.length) return errorResult("Expression cannot be empty.");

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (isOperand(token)) {
      output.push(token);
      addStep(steps, "ADD TO OUTPUT", token,
        `Operand "${token}" is added directly to the output.`,
        "Operands go directly to the output.",
        tokens, i, stack, output);
      continue;
    }

    if (token === "(") {
      stack.push(token);
      addStep(steps, "PUSH", token,
        "Opening parenthesis is pushed onto the stack.",
        "Parentheses temporarily control precedence.",
        tokens, i, stack, output);
      continue;
    }

    if (token === ")") {
      let found = false;

      while (stack.length) {
        const top = stack.pop()!;

        if (top === "(") {
          found = true;
          addStep(steps, "POP", token,
            "Matching opening parenthesis is removed.",
            "The parenthesized expression is complete.",
            tokens, i, stack, output);
          break;
        }

        output.push(top);
        addStep(steps, "POP TO OUTPUT", top,
          `Operator "${top}" moves from stack to output.`,
          "Operators inside parentheses are completed first.",
          tokens, i, stack, output);
      }

      if (!found) return errorResult("Mismatched parentheses.");
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
        const top = stack.pop()!;
        output.push(top);

        addStep(steps, "POP TO OUTPUT", top,
          `Operator "${top}" moves from stack to output.`,
          `"${top}" has higher or equal precedence and must be processed first.`,
          tokens, i, stack, output);
      }

      stack.push(token);

      addStep(steps, "PUSH", token,
        `Operator "${token}" is pushed onto the stack.`,
        "Its precedence is compared with the stack top.",
        tokens, i, stack, output);
      continue;
    }

    return errorResult(`Invalid token "${token}".`);
  }

  while (stack.length) {
    const top = stack.pop()!;

    if (top === "(") return errorResult("Mismatched parentheses.");

    output.push(top);

    addStep(steps, "POP TO OUTPUT", top,
      `Remaining operator "${top}" moves to output.`,
      "All input tokens have been processed.",
      tokens, tokens.length - 1, stack, output);
  }

  return { output, steps };
}

export function infixToPrefix(expression: string): Result {
  const tokens = tokenize(expression);

  if (!tokens.length) return errorResult("Expression cannot be empty.");

  const reversed = [...tokens]
    .reverse()
    .map(t => t === "(" ? ")" : t === ")" ? "(" : t);

  const postfix = infixToPostfix(reversed.join(" "));

  if (postfix.error) return postfix;

  const prefix = [...postfix.output].reverse();
  const steps: Step[] = [];

  for (let i = 0; i < tokens.length; i++) {
    addStep(
      steps,
      "PROCESS",
      tokens[i],
      `Processing "${tokens[i]}" for prefix conversion.`,
      "The expression is reversed and precedence is applied.",
      tokens,
      i,
      [],
      prefix.slice(0, Math.min(i + 1, prefix.length))
    );
  }

  return { output: prefix, steps };
}

export function prefixToInfix(expression: string): Result {
  const tokens = tokenize(expression);
  const stack: string[] = [];
  const steps: Step[] = [];

  if (!tokens.length) return errorResult("Expression cannot be empty.");

  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];

    if (isOperand(token)) {
      stack.push(token);

      addStep(steps, "PUSH", token,
        `Operand "${token}" is pushed onto the stack.`,
        "Prefix expressions are scanned from right to left.",
        tokens, i, stack, []);
    } else if (isOperator(token)) {
      if (stack.length < 2) {
        return errorResult(`Not enough operands for "${token}".`);
      }

      const left = stack.pop()!;
      const right = stack.pop()!;
      const combined = `(${left}${token}${right})`;

      stack.push(combined);

      addStep(steps, "COMBINE", token,
        `Combine "${left}" and "${right}" using "${token}".`,
        "A binary operator requires two operands.",
        tokens, i, stack, []);
    } else {
      return errorResult(`Invalid token "${token}".`);
    }
  }

  if (stack.length !== 1) return errorResult("Invalid prefix expression.");

  return { output: [stack[0]], steps };
}

export function postfixToInfix(expression: string): Result {
  const tokens = tokenize(expression);
  const stack: string[] = [];
  const steps: Step[] = [];

  if (!tokens.length) return errorResult("Expression cannot be empty.");

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (isOperand(token)) {
      stack.push(token);

      addStep(steps, "PUSH", token,
        `Operand "${token}" is pushed onto the stack.`,
        "Operands wait until an operator is encountered.",
        tokens, i, stack, []);
    } else if (isOperator(token)) {
      if (stack.length < 2) {
        return errorResult(`Not enough operands for "${token}".`);
      }

      const right = stack.pop()!;
      const left = stack.pop()!;
      const combined = `(${left}${token}${right})`;

      stack.push(combined);

      addStep(steps, "COMBINE", token,
        `Combine "${left}" and "${right}" using "${token}".`,
        `"${right}" is the right operand; "${left}" is the left operand.`,
        tokens, i, stack, []);
    } else {
      return errorResult(`Invalid token "${token}".`);
    }
  }

  if (stack.length !== 1) return errorResult("Invalid postfix expression.");

  return { output: [stack[0]], steps };
}

export function prefixToPostfix(expression: string): Result {
  const infix = prefixToInfix(expression);
  if (infix.error) return infix;
  return infixToPostfix(infix.output[0]);
}

export function postfixToPrefix(expression: string): Result {
  const infix = postfixToInfix(expression);
  if (infix.error) return infix;
  return infixToPrefix(infix.output[0]);
}

export function convert(mode: Mode, expression: string): Result {
  switch (mode) {
    case "infix-prefix":
      return infixToPrefix(expression);
    case "infix-postfix":
      return infixToPostfix(expression);
    case "prefix-infix":
      return prefixToInfix(expression);
    case "prefix-postfix":
      return prefixToPostfix(expression);
    case "postfix-infix":
      return postfixToInfix(expression);
    case "postfix-prefix":
      return postfixToPrefix(expression);
  }
}