/* Phase 9 reference capture plan; intentionally contains NO observed CASIO outputs.
 * These are exploratory semantic-key sequences, NOT verified physical keystroke maps.
 * Unsupported physical sequences are research questions, not evidence of parity.
 */
(function(global){'use strict';
const CASES=Object.freeze([
  {
    "id": "A01",
    "area": "arithmetic",
    "title": "Addition",
    "model": "standard",
    "keys": [
      "2",
      "ADD",
      "3",
      "="
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "A02",
    "area": "arithmetic",
    "title": "Subtraction",
    "model": "standard",
    "keys": [
      "9",
      "SUB",
      "4",
      "="
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "A03",
    "area": "arithmetic",
    "title": "Multiplication",
    "model": "standard",
    "keys": [
      "7",
      "MUL",
      "8",
      "="
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "A04",
    "area": "arithmetic",
    "title": "Division",
    "model": "standard",
    "keys": [
      "8",
      "DIV",
      "2",
      "="
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "A05",
    "area": "arithmetic",
    "title": "Order of operations",
    "model": "standard",
    "keys": [
      "2",
      "ADD",
      "3",
      "MUL",
      "4",
      "="
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "A06",
    "area": "arithmetic",
    "title": "Parentheses",
    "model": "standard",
    "keys": [
      "LP",
      "2",
      "ADD",
      "3",
      "RP",
      "MUL",
      "4",
      "="
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "A07",
    "area": "arithmetic",
    "title": "Unary negative",
    "model": "standard",
    "keys": [
      "NEG",
      "3",
      "ADD",
      "5",
      "="
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "A08",
    "area": "arithmetic",
    "title": "Negative square precedence",
    "model": "standard",
    "keys": [
      "NEG",
      "2",
      "POW",
      "2",
      "="
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "A09",
    "area": "arithmetic",
    "title": "Decimal entry",
    "model": "standard",
    "keys": [
      "2",
      ".",
      "5",
      "MUL",
      "4",
      "="
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "A10",
    "area": "arithmetic",
    "title": "Ans continuation",
    "model": "standard",
    "keys": [
      "2",
      "ADD",
      "3",
      "=",
      "MUL",
      "4",
      "="
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "E01",
    "area": "exact",
    "title": "Simple rational",
    "model": "standard",
    "keys": [
      "1",
      "DIV",
      "2",
      "="
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "E02",
    "area": "exact",
    "title": "One third",
    "model": "standard",
    "keys": [
      "1",
      "DIV",
      "3",
      "="
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "E03",
    "area": "exact",
    "title": "Rational addition",
    "model": "standard",
    "keys": [
      "1",
      "DIV",
      "3",
      "ADD",
      "1",
      "DIV",
      "6",
      "="
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "E04",
    "area": "exact",
    "title": "Rational subtraction",
    "model": "standard",
    "keys": [
      "5",
      "DIV",
      "6",
      "SUB",
      "1",
      "DIV",
      "3",
      "="
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "E05",
    "area": "exact",
    "title": "Rational multiplication",
    "model": "standard",
    "keys": [
      "2",
      "DIV",
      "3",
      "MUL",
      "3",
      "DIV",
      "4",
      "="
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "E06",
    "area": "exact",
    "title": "Exact square root",
    "model": "standard",
    "keys": [
      "SQRT",
      "9",
      "RP",
      "="
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "E07",
    "area": "exact",
    "title": "Irrational radical",
    "model": "standard",
    "keys": [
      "SQRT",
      "8",
      "RP",
      "="
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "E08",
    "area": "exact",
    "title": "Exact pi",
    "model": "standard",
    "keys": [
      "PI",
      "="
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "E09",
    "area": "exact",
    "title": "Pi divided by two",
    "model": "standard",
    "keys": [
      "PI",
      "DIV",
      "2",
      "="
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "E10",
    "area": "exact",
    "title": "S-D fraction toggle",
    "model": "standard",
    "keys": [
      "1",
      "DIV",
      "2",
      "=",
      "S-D"
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "T01",
    "area": "trigonometry",
    "title": "Sine of thirty degrees",
    "model": "standard",
    "keys": [
      "SIN",
      "3",
      "0",
      "RP",
      "="
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "T02",
    "area": "trigonometry",
    "title": "Cosine of sixty degrees",
    "model": "standard",
    "keys": [
      "COS",
      "6",
      "0",
      "RP",
      "="
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "T03",
    "area": "trigonometry",
    "title": "Tangent of forty-five degrees",
    "model": "standard",
    "keys": [
      "TAN",
      "4",
      "5",
      "RP",
      "="
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "T04",
    "area": "trigonometry",
    "title": "Sine of pi/2 in radians",
    "model": "standard",
    "keys": [
      "SIN",
      "PI",
      "DIV",
      "2",
      "RP",
      "="
    ],
    "setup": {
      "angle": "RAD",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "T05",
    "area": "trigonometry",
    "title": "Cosine of pi in radians",
    "model": "standard",
    "keys": [
      "COS",
      "PI",
      "RP",
      "="
    ],
    "setup": {
      "angle": "RAD",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "T06",
    "area": "trigonometry",
    "title": "Sine of zero grads",
    "model": "standard",
    "keys": [
      "SIN",
      "0",
      "RP",
      "="
    ],
    "setup": {
      "angle": "GRAD",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "T07",
    "area": "trigonometry",
    "title": "Negative sine input",
    "model": "standard",
    "keys": [
      "SIN",
      "NEG",
      "3",
      "0",
      "RP",
      "="
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "T08",
    "area": "trigonometry",
    "title": "Tangent of zero",
    "model": "standard",
    "keys": [
      "TAN",
      "0",
      "RP",
      "="
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "S01",
    "area": "setup",
    "title": "Open SETUP",
    "model": "standard",
    "keys": [
      "SHIFT",
      "MODE"
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "S02",
    "area": "setup",
    "title": "Degrees",
    "model": "standard",
    "keys": [
      "SHIFT",
      "MODE",
      "3"
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "S03",
    "area": "setup",
    "title": "Radians",
    "model": "standard",
    "keys": [
      "SHIFT",
      "MODE",
      "4"
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "S04",
    "area": "setup",
    "title": "Gradians",
    "model": "standard",
    "keys": [
      "SHIFT",
      "MODE",
      "5"
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "S05",
    "area": "setup",
    "title": "Fix 2 digits",
    "model": "standard",
    "keys": [
      "SHIFT",
      "MODE",
      "6",
      "2"
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "S06",
    "area": "setup",
    "title": "Sci 3 digits",
    "model": "standard",
    "keys": [
      "SHIFT",
      "MODE",
      "7",
      "3"
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "S07",
    "area": "setup",
    "title": "Norm 1",
    "model": "standard",
    "keys": [
      "SHIFT",
      "MODE",
      "8",
      "1"
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "S08",
    "area": "setup",
    "title": "MathO preference",
    "model": "standard",
    "keys": [
      "SHIFT",
      "MODE",
      "1",
      "1"
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "N01",
    "area": "navigation",
    "title": "Open mode list",
    "model": "standard",
    "keys": [
      "MODE"
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "N02",
    "area": "navigation",
    "title": "Enter CMPLX",
    "model": "standard",
    "keys": [
      "MODE",
      "2"
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "N03",
    "area": "navigation",
    "title": "Enter STAT",
    "model": "standard",
    "keys": [
      "MODE",
      "3"
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "N04",
    "area": "navigation",
    "title": "Enter BASE-N",
    "model": "standard",
    "keys": [
      "MODE",
      "4"
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "N05",
    "area": "navigation",
    "title": "Enter TABLE",
    "model": "standard",
    "keys": [
      "MODE",
      "7"
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "N06",
    "area": "navigation",
    "title": "Enter VECTOR",
    "model": "standard",
    "keys": [
      "MODE",
      "8"
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "R01",
    "area": "errors",
    "title": "Division by zero",
    "model": "standard",
    "keys": [
      "1",
      "DIV",
      "0",
      "="
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "R02",
    "area": "errors",
    "title": "Incomplete division",
    "model": "standard",
    "keys": [
      "1",
      "DIV",
      "="
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "R03",
    "area": "errors",
    "title": "Incomplete parentheses",
    "model": "standard",
    "keys": [
      "LP",
      "1",
      "ADD",
      "2",
      "="
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "R04",
    "area": "errors",
    "title": "Missing denominator",
    "model": "standard",
    "keys": [
      "FRAC",
      "1",
      "="
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "L01",
    "area": "lcd",
    "title": "Long expression and cursor",
    "model": "standard",
    "keys": [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "0",
      "1",
      "2",
      "3",
      "4",
      "5"
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "L02",
    "area": "lcd",
    "title": "Long expression left navigation",
    "model": "standard",
    "keys": [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "0",
      "LEFT",
      "LEFT",
      "LEFT"
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "L03",
    "area": "lcd",
    "title": "Stacked fraction input",
    "model": "standard",
    "keys": [
      "FRAC",
      "1",
      "RIGHT",
      "2"
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  },
  {
    "id": "L04",
    "area": "lcd",
    "title": "S-D result layout",
    "model": "standard",
    "keys": [
      "SQRT",
      "8",
      "RP",
      "=",
      "S-D"
    ],
    "setup": {
      "angle": "DEG",
      "format": "Norm2",
      "digits": 3,
      "displayStyle": "MathO"
    },
    "stepHint": "Record the exact LCD text or a photo after the final key. Use intermediate checkpoints to isolate differences.",
    "sourceStatus": "planned-unobserved"
  }
].map(x=>Object.freeze({...x,keys:Object.freeze(x.keys),setup:Object.freeze(x.setup)})));
const CATEGORIES=Object.freeze(['arithmetic','exact','trigonometry','setup','navigation','errors','lcd']);
function get(id){return CASES.find(c=>c.id===id)||null}
function coverage(evidence){
 const observations=Array.isArray(evidence?.records)?evidence.records:[];
 const ids=new Set(observations.map(r=>r.scenarioId).filter(id=>!!get(id)));
 const categories=Object.fromEntries(CATEGORIES.map(area=>{
  const group=CASES.filter(c=>c.area===area),count=group.filter(c=>ids.has(c.id)).length;
  return [area,{planned:group.length,recorded:count,unrecorded:group.length-count}];
 }));
 return {planned:CASES.length,recorded:ids.size,unrecorded:CASES.length-ids.size,
  categories,authenticated:false,physicalDeviceAgreementVerified:false};
}
global.FX991_REFERENCE_PLAN=Object.freeze({CASES,CATEGORIES,get,coverage});
})(typeof window!=='undefined'?window:globalThis);
