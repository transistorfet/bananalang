
const fs = require('fs');

const OPEN_BRACKET = '(';
const CLOSE_BRACKET = ')';


function main() {
    const text = "(+ 1 (* 2 3))";
    const tokens = lex(text);
    const ast = parse_exprs(tokens)
    const result = execute_exprs(GlobalScope, ast);
    console.log("RESULT:", result);
}



/****************************************************
 *                                                  *
 * Lexer                                            *
 *                                                  *
 ****************************************************/

function lex(text) {
    const tokens = [];

    text = text.trimLeft();
    while (text !== '') {
        const token = read_token(text);
        text = text.substr(token.length).trimLeft();
        tokens.push(token);
    }

    return tokens;
}

function read_token(text) {
    switch (text[0]) {
        case '(':
            return OPEN_BRACKET;
        case ')':
            return CLOSE_BRACKET;
        default:
            const parts = text.match(/^([^ \n\r\t\)])+/);
            return parts[0];
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
            throw new Exception(`ParseError: unexpected end of input, expected close bracket`);
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
            throw new Exception(`ParseError: expected ref but found ${token}`);
        }
    }

    throw new Exception(`ParseError: unexpected end of input, expected close bracket`);
}



/****************************************************
 *                                                  *
 * Executor                                         *
 *                                                  *
 ****************************************************/

function execute_exprs(scope, exprs) {
    const results = [];

    for (let expr of exprs) {
        results.push( execute_expr(scope, expr));
    }
    return results;
}

function execute_expr(scope, expr) {
    switch (expr.type) {
        case 'number':
            console.log("NUMBER", expr.value);
            return expr.value;
        case 'ref':
            console.log("REF", expr.value);
            return find_ref(scope, expr.value);
        case 'expr':
            const args = execute_exprs(scope, expr.elements);
            const func = args.shift();

            if (typeof func === 'function') {
                return func(scope, args);
            } else {
                throw new Exception(`RuntimeError: attempting to call a non-function: ${func}`);
            }
        default:
            throw new Exception(`RuntimeError: invalid ast element ${expr.type}`);
    }
}

function find_ref(scope, name) {
    if (scope[name] !== undefined) {
        return scope[name];
    } else if (scope['__parent__'] !== undefined) {
        return find_ref(scope['__parent__'], name);
    } else {
        return null;
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
        throw new Exception(`Error: expected ref but found ${expr.type}`);
    }
}

function expect_nargs(elements, min, max) {
    if (elements.length >= min && (!max || elements.length <= max)) {
        return true;
    } else {
        throw new Exception(`Error: expected ${min} to ${max} args but found ${elements.length}`);
    }
}

const GlobalScope = {
    '+': function (scope, args) {
        let sum = 0;

        for (let arg of args) {
            sum += arg;
        }

        return sum;
    },
    '*': function (scope, args) {
        let prod = args[0];

        for (let i = 1; i < args.length; i++) {
            prod *= args[i];
        }

        return prod;
    },
};

main()

