export type Mode =
  | "infix-prefix"
  | "infix-postfix"
  | "prefix-infix"
  | "prefix-postfix"
  | "postfix-infix"
  | "postfix-prefix";

export interface Step {
  number: number;
  action: string;
  character: string;
  description: string;
  remarks: string;
  tokens: string[];
  current: number;
  stack: string[];
  output: string[];
}

export interface Result {
  output: string[];
  steps: Step[];
  error?: string;
}