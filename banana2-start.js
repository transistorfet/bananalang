

const text = `
    (if 1
        (print 10)
        (print 20))
`;

/*
const text = `
    (define fac
        (lambda (x)
            (if (= x 0)
                1
                (* x (fac (- x 1))))))

    (fac 4)
`;
*/

function main() {
    const tokens = lex(text);
    //console.log("TOKENS:", tokens);

    const ast = parse_exprs(tokens);
    //console.log("AST:");
    //console.dir(ast, { depth: null });

    const result = evaluate_exprs(GlobalScope, ast);
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

function evaluate_exprs(scope, exprs) {
    let last;

    for (let expr of exprs) {
        last = evaluate_expr(scope, expr);
    }
    return last;
}

function evaluate_expr_list(scope, exprs) {
    const results = [];

    for (let expr of exprs) {
        results.push(evaluate_expr(scope, expr));
    }
    return results;
}

function evaluate_expr(scope, expr) {
    switch (expr.type) {
        case 'number':
            return expr.value;
        case 'ref':
            return find_ref(scope, expr.value);
        case 'expr':
            const args = evaluate_expr_list(scope, expr.elements);
            const func = args.shift();

            if (typeof func === 'function') {
                return func(scope, args);
            } else {
                throw new Error(`RuntimeError: attempting to call a non-function: ${func}`);
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

