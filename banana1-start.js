
const OPEN_BRACKET = '(';
const CLOSE_BRACKET = ')';


const text = `
    (+ 1 (* 2 3))
`;

function main() {
    const tokens = lex(text);
    console.log("TOKENS:", tokens);

    //const ast = parse_exprs(tokens)
    //console.log("AST:");
    //print_exprs(ast);

    //const result = execute_exprs(GlobalScope, ast);
    //console.log("RESULT:", result);
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
            throw new Error(`ParseError: unexpected end of input, expected close bracket`);
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

}

function execute_expr(scope, expr) {

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
        let prod = args[0];

        for (let i = 1; i < args.length; i++) {
            prod *= args[i];
        }

        return prod;
    },
};

main()
