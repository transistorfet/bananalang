
const text1 = "(+ 1 (* 2 3))";

const text2 = `
    (define loop
        (lambda (x)
            (print x)
            (loop (+ x 1))))
    (loop 1)
`;

const text3 = `
    (define fac
        (lambda (x)
            (if (= x 0)
                1
                (* x (fac (- x 1))))))

    (fac 4)
`;


function main() {
    const tokens = lex(text2);
    //console.log("TOKENS:", tokens);

    const ast = parse_exprs(tokens);
    //console.log("AST:");
    //console.dir(ast, { depth: null });

    const result = evaluate_exprs(GlobalScope, ast, 0);
    console.log("RESULT:", result);
}



/****************************************************
 *                                                  *
 * Lexer                                            *
 *                                                  *
 ****************************************************/

const OPEN_BRACKET = '(';
const CLOSE_BRACKET = ')';

function lex(text) {
    const tokens = [];

    text = text.trimLeft();
    while (text !== '') {
        const [ token, remain ] = read_token(text);
        text = remain.trimLeft();
        tokens.push(token);
    }

    return tokens;
}

function read_token(text) {
    switch (text[0]) {
        case '(':
            return [ OPEN_BRACKET, text.substr(1) ];
        case ')':
            return [ CLOSE_BRACKET, text.substr(1) ];
        default:
            const parts = text.match(/^([^ \n\r\t\)])+/);
            return [ parts[0], text.substr(parts[0].length) ];
    }
}



/****************************************************
 *                                                  *
 * Parser                                           *
 *                                                  *
 ****************************************************/

function parse_exprs(tokens) {
    const exprs = [];

    while (tokens.length > 0) {
        const token = tokens.shift();

        if (token === OPEN_BRACKET) {
            const [ result, remain ] = parse_expr(tokens);
            exprs.push(result);
            tokens = remain;
        } else {
            throw new Error(`ParseError: expected open bracket but found ${token}`);
        }
    }

    return exprs;
}

function parse_expr(tokens) {
    const elements = [];

    while (tokens.length > 0) {
        const token = tokens.shift();

        if (token === CLOSE_BRACKET) {

            const expr = {
                type: 'expr',
                elements,
            }
            return [ expr, tokens ];

        } else if (token === OPEN_BRACKET) {

            const [ result, remain ] = parse_expr(tokens);
            elements.push(result);
            tokens = remain;

        } else if (token.match(/^(\-|)[0-9]+$/)) {

            elements.push({
                type: 'number',
                value: parseInt(token),
            });

        } else if (token.match(/^[^0-9\(\)][^\(\)]*$/)) {

            elements.push({
                type: 'ref',
                value: token,
            });

        } else {
            throw new Error(`ParseError: expected ref but found ${token}`);
        }
    }

    throw new Error(`ParseError: unexpected end of input, expected close bracket`);
}



/****************************************************
 *                                                  *
 * AST Pretty Printer                               *
 *                                                  *
 ****************************************************/

function print_exprs(exprs) {
    const output = [];

    for (let expr of exprs) {
        output.push(print_expr(expr));
    }
    return output.join(' ');
}

function print_expr(expr) {
    switch (expr.type) {
        case 'number':
            return expr.value.toString();
        case 'ref':
            return expr.value;
        case 'expr':
            return '(' + print_exprs(expr.elements) + ')';
        default:
            return '';
    }
}



/****************************************************
 *                                                  *
 * Evaluator                                        *
 *                                                  *
 ****************************************************/

function evaluate_exprs(scope, exprs, depth) {
    let last;

    for (let expr of exprs) {
        last = evaluate_expr(scope, expr, depth + 1);
    }
    return last;
}

function evaluate_func_call(scope, exprs, depth) {
    const args = [];

    for (let expr of exprs) {
        args.push(evaluate_expr(scope, expr, depth + 1));
    }

    const func = args.shift();

    if (typeof func === 'function') {
        return func(scope, args, depth + 1);
    } else {
        throw new Error(`RuntimeError: attempting to call a non-function: ${func}`);
    }
    return results;
}

function evaluate_expr(scope, expr, depth) {
    //console.log('*'.repeat(depth), depth, expr.elements ? expr.elements[0].value : '');

    switch (expr.type) {
        case 'number':
            return expr.value;
        case 'ref':
            return find_ref(scope, expr.value);
        case 'expr':
            const first = expr.elements[0];

            if (first.type === 'ref' && SpecialForms[first.value]) {
                return SpecialForms[first.value](scope, expr.elements.slice(1), depth + 1);
            } else {
                return evaluate_func_call(scope, expr.elements, depth + 1);
            }
        default:
            throw new Error(`RuntimeError: invalid ast element ${expr.type}`);
    }
}

function find_ref(scope, name) {
    if (scope[name] !== undefined) {
        return scope[name];
    } else if (scope['__parent__'] !== undefined) {
        return find_ref(scope['__parent__'], name);
    } else {
        throw new Error(`RuntimeError: undefined reference ${name}`);
    }
}


/****************************************************
 *                                                  *
 * Environment                                      *
 *                                                  *
 ****************************************************/

function expect_ref(expr) {
    if (expr.type === 'ref') {
        return expr.value;
    } else {
        throw new Error(`Error: expected ref but found ${expr.type}`);
    }
}

function expect_expr(expr) {
    if (expr.type === 'expr') {
        return expr.elements;
    } else {
        throw new Error(`Error: expected expr but found ${expr.type}`);
    }
}

function expect_nargs(elements, min, max) {
    if (elements.length >= min && (!max || elements.length <= max)) {
        return true;
    } else {
        throw new Error(`Error: expected ${min} to ${max} args but found ${elements.length}`);
    }
}

const SpecialForms = {
    'if': function (scope, elements, depth) {
        expect_nargs(elements, 3, 3);

        const result = evaluate_expr(scope, elements[0], depth + 1);
        if (result) {
            return evaluate_expr(scope, elements[1], depth + 1);
        } else if (elements.length === 3) {
            return evaluate_expr(scope, elements[2], depth + 1);
        }
    },

    'define': function (scope, elements, depth) {
        expect_nargs(elements, 2, 2);

        const ref_name = expect_ref(elements[0]);

        const value = evaluate_expr(scope, elements[1], depth + 1);

        if (scope[ref_name]) {
            throw new Error(`RuntimeError: ${ref_name} is already defined`);
        }

        scope[ref_name] = value;

        return undefined;
    },

    'lambda': function (scope, elements, depth) {
        expect_nargs(elements, 2);

        const arg_names = expect_expr(elements[0]);
        const body = elements.slice(1);

        return function call_lambda(caller_scope, args, depth) {
            const local = { '__parent__': scope };

            if (arg_names.length !== args.length) {
                throw new Error(`RuntimeError: expected ${arg_names.length} args, but was given ${args.length}`);
            }

            for (let i = 0; i < args.length; i++) {
                const name = expect_ref(arg_names[i]);
                local[name] = args[i];
            }

            return evaluate_exprs(local, body, depth + 1);
        };
    },
};

const GlobalScope = {
    '+': function (scope, args) {
        let sum = 0;

        for (let arg of args) {
            sum += arg;
        }

        return sum;
    },

    '-': function (scope, args) {
        let diff = args[0];

        for (let i = 1; i < args.length; i++) {
            diff -= args[i];
        }

        return diff;
    },

    '*': function (scope, args) {
        let prod = 1;

        for (let arg of args) {
            prod *= arg;
        }

        return prod;
    },

    '=': function (scope, args) {
        let val = args[0];

        for (let i = 1; i < args.length; i++) {
            if (!(val == args[i])) {
                return false;
            }
        }

        return true;
    },

    'print': function (scope, args) {
        console.log.apply(null, args);
    },
};

main()

