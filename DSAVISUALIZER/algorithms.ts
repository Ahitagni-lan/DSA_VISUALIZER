import { Mode, Result, Step } from "./types";

export const modeLabels: Record<Mode, string> = {
  "infix-prefix": "Infix → Prefix",
  "infix-postfix": "Infix → Postfix",
  "prefix-infix": "Prefix → Infix",
  "prefix-postfix": "Prefix → Postfix",
  "postfix-infix": "Postfix → Infix",
  "postfix-prefix": "Postfix → Prefix"
};

export const examples: Record<Mode, string> = {
  "infix-prefix": "A+B*(C-D)",
  "infix-postfix": "A+B*(C-D)",
  "prefix-infix": "-+A*BCD",
  "prefix-postfix": "-+A*BCD",
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

  if (/\s/.test(cleaned)) {
    return cleaned.split(/\s+/).filter(Boolean);
  }

  return cleaned.split("");
}

function makeStep(
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

function infixToPostfix(expression: string): Result {
  const tokens = tokenize(expression);
  const steps: Step[] = [];
  const stack: string[] = [];
  const output: string[] = [];

  if (!tokens.length) {
    return {
      output: [],
      steps: [],
      error: "Expression cannot be empty."
    };
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (isOperand(token)) {
      output.push(token);

      makeStep(
        steps,
        "ADD TO OUTPUT",
        token,
        `Operand "${token}" is added directly to the output.`,
        "Operands do not need to wait for operator precedence.",
        tokens,
        i,
        stack,
        output
      );
    } else if (token === "(") {
      stack.push(token);

      makeStep(
        steps,
        "PUSH",
        token,
        `Opening parenthesis "${token}" is pushed onto the stack.`,
        "Parentheses temporarily control operator precedence.",
        tokens,
        i,
        stack,
        output
      );
    } else if (token === ")") {
      let foundOpening = false;

      while (stack.length) {
        const top = stack.pop()!;

        if (top === "(") {
          foundOpening = true;

          makeStep(
            steps,
            "POP",
            token,
            "Opening parenthesis is removed from the stack.",
            "The matching parenthesis has been found.",
            tokens,
            i,
            stack,
            output
          );

          break;
        }

        output.push(top);

        makeStep(
          steps,
          "POP TO OUTPUT",
          top,
          `Operator "${top}" is moved from the stack to the output.`,
          "Operators inside the parentheses must be completed first.",
          tokens,
          i,
          stack,
          output
        );
      }

      if (!foundOpening) {
        return {
          output: [],
          steps: [],
          error: `Mismatched parenthesis near "${token}".`
        };
      }
    } else if (isOperator(token)) {
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

        makeStep(
          steps,
          "POP TO OUTPUT",
          top,
          `Operator "${top}" is popped before pushing "${token}".`,
          `"${top}" has higher or equal precedence and must be processed first.`,
          tokens,
          i,
          stack,
          output
        );
      }

      stack.push(token);

      makeStep(
        steps,
        "PUSH",
        token,
        `Operator "${token}" is pushed onto the stack.`,
        `Its precedence is compared with operators already on the stack.`,
        tokens,
        i,
        stack,
        output
      );
    } else {
      return {
        output: [],
        steps: [],
        error: `Invalid token "${token}".`
      };
    }
  }

  while (stack.length) {
    const top = stack.pop()!;

    if (top === "(" || top === ")") {
      return {
        output: [],
        steps: [],
        error: "Mismatched parentheses."
      };
    }

    output.push(top);

    makeStep(
      steps,
      "POP TO OUTPUT",
      top,
      `Remaining operator "${top}" is moved to the output.`,
      "All input tokens have been processed.",
      tokens,
      tokens.length - 1,
      stack,
      output
    );
  }

  return { output, steps };
}

function infixToPrefix(expression: string): Result {
  const tokens = tokenize(expression);
  const steps: Step[] = [];
  const stack: string[] = [];
  const output: string[] = [];

  if (!tokens.length) {
    return {
      output: [],
      steps: [],
      error: "Expression cannot be empty."
    };
  }

  const reversed = [...tokens].reverse().map(token => {
    if (token === "(") return ")";
    if (token === ")") return "(";
    return token;
  });

  const postfixResult = infixToPostfix(reversed.join(" "));

  if (postfixResult.error) {
    return {
      output: [],
      steps: [],
      error: postfixResult.error
    };
  }

  const prefix = [...postfixResult.output].reverse();

  for (let i = 0; i < tokens.length; i++) {
    makeStep(
      steps,
      "PROCESS",
      tokens[i],
      `Processing "${tokens[i]}" for prefix conversion.`,
      "The expression is reversed and operator precedence is applied.",
      tokens,
      i,
      stack,
      prefix.slice(0, Math.min(i + 1, prefix.length))
    );
  }

  return {
    output: prefix,
    steps
  };
}

function prefixToInfix(expression: string): Result {
  const tokens = tokenize(expression);
  const steps: Step[] = [];
  const stack: string[] = [];

  if (!tokens.length) {
    return {
      output: [],
      steps: [],
      error: "Expression cannot be empty."
    };
  }

  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];

    if (isOperand(token)) {
      stack.push(token);

      makeStep(
        steps,
        "PUSH",
        token,
        `Operand "${token}" is pushed onto the stack.`,
        "Prefix expressions are scanned from right to left.",
        tokens,
        i,
        stack,
        []
      );
    } else if (isOperator(token)) {
      if (stack.length < 2) {
        return {
          output: [],
          steps: [],
          error: `Not enough operands for "${token}".`
        };
      }

      const left = stack.pop()!;
      const right = stack.pop()!;
      const combined = `(${left}${token}${right})`;

      stack.push(combined);

      makeStep(
        steps,
        "COMBINE",
        token,
        `Combine "${left}" and "${right}" using "${token}".`,
        "Two operands are required for every binary operator.",
        tokens,
        i,
        stack,
        []
      );
    } else {
      return {
        output: [],
        steps: [],
        error: `Invalid token "${token}".`
      };
    }
  }

  if (stack.length !== 1) {
    return {
      output: [],
      steps: [],
      error: "Invalid prefix expression."
    };
  }

  return {
    output: [stack[0]],
    steps
  };
}

function postfixToInfix(expression: string): Result {
  const tokens = tokenize(expression);
  const steps: Step[] = [];
  const stack: string[] = [];

  if (!tokens.length) {
    return {
      output: [],
      steps: [],
      error: "Expression cannot be empty."
    };
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (isOperand(token)) {
      stack.push(token);

      makeStep(
        steps,
        "PUSH",
        token,
        `Operand "${token}" is pushed onto the stack.`,
        "Operands are stored until an operator is encountered.",
        tokens,
        i,
        stack,
        []
      );
    } else if (isOperator(token)) {
      if (stack.length < 2) {
        return {
          output: [],
          steps: [],
          error: `Not enough operands for "${token}".`
        };
      }

      const right = stack.pop()!;
      const left = stack.pop()!;
      const combined = `(${left}${token}${right})`;

      stack.push(combined);

      makeStep(
        steps,
        "COMBINE",
        token,
        `Combine "${left}" and "${right}" using "${token}".`,
        `"${right}" is the right operand and "${left}" is the left operand.`,
        tokens,
        i,
        stack,
        []
      );
    } else {
      return {
        output: [],
        steps: [],
        error: `Invalid token "${token}".`
      };
    }
  }

  if (stack.length !== 1) {
    return {
      output: [],
      steps: [],
      error: "Invalid postfix expression."
    };
  }

  return {
    output: [stack[0]],
    steps
  };
}

function prefixToPostfix(expression: string): Result {
  const infix = prefixToInfix(expression);

  if (infix.error) return infix;

  const result = infixToPostfix(infix.output[0]);

  if (result.error) return result;

  return result;
}

function postfixToPrefix(expression: string): Result {
  const infix = postfixToInfix(expression);

  if (infix.error) return infix;

  return infixToPrefix(infix.output[0]);
}

export function convert(mode: Mode, expression: string): Result {
  switch (mode) {
    case "infix-postfix":
      return infixToPostfix(expression);

    case "infix-prefix":
      return infixToPrefix(expression);

    case "prefix-infix":
      return prefixToInfix(expression);

    case "prefix-postfix":
      return prefixToPostfix(expression);

    case "postfix-infix":
      return postfixToInfix(expression);

    case "postfix-prefix":
      return postfixToPrefix(expression);

    default:
      return {
        output: [],
        steps: [],
        error: "Unsupported conversion type."
      };
  }
}
