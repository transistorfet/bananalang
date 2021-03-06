

const text = `
    (+ 1 (* 2 3))
`;

function main() {
    const tokens = lex(text);
    console.log("TOKENS:", tokens);

    //const ast = parse_exprs(tokens);
    //console.log("AST:");
    //console.dir(ast, { depth: null });

    //console.log("PRETTY:", print_exprs(ast));

    //const result = evaluate_exprs(GlobalScope, ast);
    //console.log("RESULT:", result);
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

}

function evaluate_expr(scope, expr) {

}


/****************************************************
 *                                                  *
 * Environment                                      *
 *                                                  *
 ****************************************************/

const GlobalScope = {
    '+': function (scope, args) {
        let sum = 0;

        for (let arg of args) {
            sum += arg;
        }

        return sum;
    },

    '*': function (scope, args) {
        let prod = 1;

        for (let arg of args) {
            prod *= arg;
        }

        return prod;
    },
};

main()

