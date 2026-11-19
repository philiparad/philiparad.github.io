"""Conservative, non-evaluating LaTeX arithmetic parser for algebraic checks.

Never claims transcription correctness. Only handles supported algebraic syntax.
"""
import re
from dataclasses import dataclass
import sympy as sp

MAX_LATEX_CHARS = 900
X = sp.Symbol('x', real=True)
Y = sp.Symbol('y', real=True)
ALLOWED_VARS = {name: sp.Symbol(name, real=True) for name in ('x', 'y', 'a', 'b', 'k')}
TOKEN_RE = re.compile(r'\d+(?:\.\d+)?|[A-Za-z]+|[+\-*/^=(),]')


class UnsupportedMath(ValueError):
    pass


def _group(s, start):
    if start >= len(s) or s[start] != '{':
        raise UnsupportedMath('Expected { after a LaTeX command')
    depth = 0
    for pos in range(start, len(s)):
        if s[pos] == '{':
            depth += 1
        elif s[pos] == '}':
            depth -= 1
            if depth == 0:
                return s[start + 1:pos], pos + 1
    raise UnsupportedMath('Unbalanced LaTeX braces')


def normalize_latex(s):
    if not isinstance(s, str) or not s.strip():
        raise UnsupportedMath('No equation supplied')
    if len(s) > MAX_LATEX_CHARS:
        raise UnsupportedMath('Expression too long for safe symbolic analysis')
    s = s.strip()
    # Remove presentation-only delimiters and commands; avoid interpreting text as math.
    for cmd in ('\\displaystyle', '\\left', '\\right', '\\,', '\\;', '\\!', '\\quad', '\\qquad'):
        s = s.replace(cmd, '')
    for delim in ('\\[', '\\]', '\\(', '\\)', '$'):
        s = s.replace(delim, '')
    s = s.replace('−', '-').replace('×', '*').replace('÷', '/')
    s = s.replace('\\cdot', '*').replace('\\times', '*').replace('\\div', '/')
    s = s.replace('\\dfrac', '\\frac').replace('\\tfrac', '\\frac')
    s = s.replace('\\pi', 'pi')
    if '\\begin' in s or '\\end' in s or '&' in s or '\\\\' in s:
        raise UnsupportedMath('Multiline/system environment: algebraic parsing not implemented')
    out, i = '', 0
    while i < len(s):
        if s.startswith('\\frac', i):
            i += len('\\frac')
            while i < len(s) and s[i].isspace(): i += 1
            num, i = _group(s, i)
            while i < len(s) and s[i].isspace(): i += 1
            den, i = _group(s, i)
            out += '((' + normalize_latex(num) + ')/(' + normalize_latex(den) + '))'
        elif s[i] == '{':
            out += '('; i += 1
        elif s[i] == '}':
            out += ')'; i += 1
        elif s[i] == '\\':
            raise UnsupportedMath('Unsupported LaTeX command near: ' + s[i:i+22])
        elif s[i] == ':':
            raise UnsupportedMath('Prose is not supported for algebraic checking')
        else:
            out += s[i]; i += 1
    out = re.sub(r'\s+', '', out)
    return out


@dataclass
class Expr:
    value: object
    denominators: list


class Parser:
    def __init__(self, source):
        matches = list(TOKEN_RE.finditer(source))
        if ''.join(m.group(0) for m in matches) != source:
            raise UnsupportedMath('Unrecognized notation in expression')
        self.tokens = [m.group(0) for m in matches]
        if len(self.tokens) > 220:
            raise UnsupportedMath('Expression has too many terms')
        self.pos = 0

    def peek(self):
        return self.tokens[self.pos] if self.pos < len(self.tokens) else None

    def eat(self, token=None):
        t = self.peek()
        if t is None or (token is not None and t != token):
            raise UnsupportedMath('Expected ' + str(token or 'term'))
        self.pos += 1
        return t

    def equation(self):
        lhs = self.sum()
        self.eat('=')
        rhs = self.sum()
        if self.peek() is not None:
            raise UnsupportedMath('Additional symbols after equation')
        return lhs, rhs

    def sum(self):
        left = self.product()
        while self.peek() in ('+', '-'):
            sign = self.eat()
            right = self.product()
            left = Expr(left.value + right.value if sign == '+' else left.value - right.value,
                        left.denominators + right.denominators)
        return left

    def product(self):
        left = self.unary()
        while True:
            t = self.peek()
            implicit = t is not None and (t == '(' or t[0].isdigit() or t[0].isalpha())
            if t not in ('*', '/') and not implicit:
                break
            op = self.eat() if t in ('*', '/') else '*'
            right = self.unary()
            if op == '*':
                left = Expr(left.value * right.value, left.denominators + right.denominators)
            else:
                left = Expr(left.value / right.value, left.denominators + right.denominators + [right.value])
        return left

    def unary(self):
        if self.peek() in ('+', '-'):
            sign = self.eat()
            e = self.unary()
            return Expr(-e.value if sign == '-' else e.value, e.denominators)
        return self.power()

    def power(self):
        base = self.atom()
        if self.peek() == '^':
            self.eat('^')
            exponent = self.unary()
            if exponent.value.is_number is not True or not exponent.value.is_Integer or abs(int(exponent.value)) > 12:
                raise UnsupportedMath('Only small integer exponents are supported')
            p = int(exponent.value)
            dens = base.denominators + exponent.denominators
            if p < 0: dens.append(base.value)
            return Expr(base.value ** p, dens)
        return base

    def atom(self):
        t = self.eat()
        if t == '(':
            e = self.sum()
            self.eat(')')
            return e
        if t[0].isdigit():
            return Expr(sp.Rational(t), [])
        if t in ALLOWED_VARS:
            return Expr(ALLOWED_VARS[t], [])
        if t == 'pi':
            return Expr(sp.pi, [])
        raise UnsupportedMath('Unsupported symbol: ' + t)


def _fmt(expr):
    return sp.latex(expr)


def check_equation(latex):
    """Return analytical hints, never a pass/fail verification of image transcription."""
    result = {'supported': False, 'warning': 'Symbolic analysis is advisory; verify the source image.',
              'excluded': [], 'solutions': [], 'domain_conditions': [], 'normalized': '', 'notes': []}
    try:
        source = normalize_latex(latex)
        result['normalized'] = source
        lhs, rhs = Parser(source).equation()
        denominators = []
        for d in lhs.denominators + rhs.denominators:
            if not any(sp.simplify(d - other) == 0 for other in denominators):
                denominators.append(d)
        result['domain_conditions'] = [_fmt(d) + r' \ne 0' for d in denominators]
        symbols = (lhs.value - rhs.value).free_symbols | set().union(*(d.free_symbols for d in denominators)) if denominators else (lhs.value - rhs.value).free_symbols
        if symbols and symbols != {X}:
            result['notes'].append('Multivariable / non-x equation: solve manually or with dedicated system support.')
            result['supported'] = True
            return result
        for d in denominators:
            if X in d.free_symbols:
                try:
                    if sp.Poly(d, X).degree() <= 4:
                        for root in sp.solve(d, X):
                            label = _fmt(root)
                            if label not in result['excluded']:
                                result['excluded'].append(label)
                    else:
                        result['notes'].append('Denominator has degree > 4; exclusions not solved.')
                except (sp.PolynomialError, NotImplementedError, ValueError):
                    result['notes'].append('Denominator exclusion requires manual review.')
        difference = sp.together(lhs.value - rhs.value)
        numerator, _ = sp.fraction(difference)
        if not numerator.has(X):
            if sp.simplify(numerator) == 0:
                result['notes'].append('Identity on its valid domain; all allowed x satisfy it.')
            else:
                result['notes'].append('No solutions (for the parsed expression).')
        elif numerator.is_polynomial(X) and sp.Poly(numerator, X).degree() <= 4:
            for root in sp.solve(numerator, X):
                if root.is_real is False:
                    continue
                excluded = False
                ambiguous = False
                for d in denominators:
                    val = sp.simplify(d.subs(X, root))
                    if val == 0:
                        excluded = True
                    if val.is_zero is None:
                        ambiguous = True
                if not excluded and not ambiguous:
                    result['solutions'].append(_fmt(root))
                elif ambiguous:
                    result['notes'].append('A candidate has uncertain domain membership; inspect manually.')
        else:
            result['notes'].append('Equation is outside the supported polynomial-degree checks.')
        result['supported'] = True
    except (UnsupportedMath, ValueError, TypeError, ZeroDivisionError, OverflowError) as err:
        result['notes'].append(str(err))
    except Exception:
        result['notes'].append('Symbolic processing failed; use manual verification.')
    return result
