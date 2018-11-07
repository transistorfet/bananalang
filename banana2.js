
const fs = require('fs');

const OPEN_BRACKET = '(';
const CLOSE_BRACKET = ')';


function main() {
    /*
    const text = fs.readFileSync('test.lsp', 'utf8');
    const tokens = lex(text);
    console.log("TOKENS", tokens);
    const ast = parse_exprs(tokens);
    console.dir(ast, { depth: null });
    execute_exprs(GlobalScope, ast);
    */

    const result = execute_exprs(GlobalScope, parse_exprs(lex("(if 1 (+ 1 2) (+ 1 (* 2 3)))")));
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
 * AST Pretty Printer                               *
 *                                                  *
 ****************************************************/

function print_exprs(exprs, indent='') {
    for (let expr of exprs) {
        print_expr(expr, indent);
    }
}

function print_expr(expr, indent) {
    switch (expr.type) {
        case 'number':
            console.log(indent, expr.value);
            break;
        case 'ref':
            console.log(indent, expr.value);
            break;
        case 'expr':
            console.log(indent, '(');
            print_exprs(expr.elements, indent + '  ');
            console.log(indent, ')');
            break;
        default:
            break;
    }
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
            const first = expr.elements[0];
            if (first.type === 'ref' && SpecialForms[first.value]) {
                console.log("SPECIAL FORM", first.value);
                return SpecialForms[first.value](scope, expr.elements.slice(1));
            } else {
                const args = execute_exprs(scope, expr.elements);
                const func = args.shift();

                if (typeof func === 'function') {
                    return func(scope, args);
                } else {
                    throw new Exception(`RuntimeError: attempting to call a non-function: ${func}`);
                }
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

const SpecialForms = {
    'if': function (scope, elements) {
        expect_nargs(elements, 2, 3);

        const result = execute_expr(scope, elements[0]);
        if (result) {
            return execute_expr(scope, elements[1]);
        } else if (elements.length === 3) {
            return execute_expr(scope, elements[2]);
        }
    },

    'defun': function (scope, elements) {
        expect_nargs(elements, 3);

        const name = expect_ref(elements[0]);
        const args = elements[1];
        const body = elements[2];

        execute_expr(scope, body);
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
    '*': function (scope, args) {
        let prod = args[0];

        for (let i = 1; i < args.length; i++) {
            prod *= args[i];
        }

        return prod;
    },
};

main()

