
const fs = require('fs');

const OPEN_BRACKET = '(';
const CLOSE_BRACKET = ')';


function main() {
    //const text = fs.readFileSync('test.lsp', 'utf8');
    const text = '(if (> 1 2) (+ 1 (* 2 3)) (+ 1 2))';

    const tokens = lex(text);
    //console.log("TOKENS:", tokens);

    const ast = parse_exprs(tokens);
    //console.log("AST:");
    //console.dir(ast, { depth: null });

    const [ results, preamble ] = transpile_exprs(ast);
    const js_ast = preamble.concat(results);
    console.log("JS AST:");
    console.dir(js_ast, { depth: null });

    const output = output_js_exprs(js_ast);
    console.log("OUTPUT:");
    console.log(output);
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

function print_exprs(exprs) {
    const output = [];

    for (let expr of exprs) {
        output.push(print_expr(expr));
    }
    return output.join(' ');
}

function print_expr(expr, indent) {
    switch (expr.type) {
        case 'number':
            return expr.value.toString();
        case 'ref':
            return expr.value;
        case 'expr':
            console.log(indent, '(');
            return '(' + print_exprs(expr.elements) + ')';
        default:
            return '';
    }
}



/****************************************************
 *                                                  *
 * Transpiler                                       *
 *                                                  *
 ****************************************************/

function transpile_exprs(exprs) {
    const preambles = [];
    const results = [];

    for (let expr of exprs) {
        const [ result, preamble ] = transpile_expr(expr);
        preambles.push.apply(preambles, preamble);
        results.push(result);
    }
    return [ results, preambles ];
}

function transpile_expr(expr) {
    switch (expr.type) {
        case 'number':
        case 'ref':
            return [ expr, [] ];
        case 'expr':
            const first = expr.elements[0];

            if (first.type === 'ref') {
                if (Transforms[first.value]) {
                    return Transforms[first.value](first.value, expr.elements.slice(1));
                } else {
                    const [ results, preambles ] = transpile_exprs(expr.elements.slice(1));

                    return [
                        {
                            type: 'call',
                            func: first.value,
                            args: results,
                        },
                        preambles,
                    ];
                }
            } else {
                throw new Error(`TranspileError: not implemented for ${expr}`);
            }
        default:
            throw new Error(`TranspileError: invalid ast element ${expr.type}`);
    }
}

let next_var = 0;

function next_name() {
    next_var += 1;
    return `r${next_var}`;
}



/****************************************************
 *                                                  *
 * Transpiler Transforms                            *
 *                                                  *
 ****************************************************/

function transform_op(op, elements) {
    const [ results, preambles ] = transpile_exprs(elements);

    return [
        {
            type: 'op',
            op: op,
            args: results,
        },
        preambles,
    ];
}

const Transforms = {
    '+': transform_op,
    '-': transform_op,
    '*': transform_op,
    '/': transform_op,
    '>': transform_op,
    '<': transform_op,
    '>=': transform_op,
    '<=': transform_op,

    'if': function (op, elements) {
        const block = [];
        const name = next_name();
        const cond = transpile_expr(elements[0]);
        let texpr = transpile_expr(elements[1]);
        let fexpr = transpile_expr(elements[2]);

        texpr[1].push({
            type: 'assign',
            ref: name,
            value: texpr[0],
        });

        fexpr[1].push({
            type: 'assign',
            ref: name,
            value: fexpr[0],
        });

        block.push({
            type: 'let',
            name: name,
            value: { type: 'string', value: '' },
        });

        block.push.apply(block, cond[1]);

        block.push({
            type: 'if',
            cond: cond[0],
            texpr: texpr[1],
            fexpr: fexpr[1],
        });

        return [ { type: 'ref', value: name }, block ];
    },
};



/****************************************************
 *                                                  *
 * JS Output Generator                              *
 *                                                  *
 ****************************************************/

function output_js_exprs(exprs, indent='') {
    const results = [];

    for (let expr of exprs) {
        results.push(indent + output_js_expr(expr, indent));
    }

    return results.join('\n');
}

function output_js_expr_list(exprs, indent) {
    const results = [];

    for (let expr of exprs) {
        results.push(output_js_expr(expr, indent));
    }

    return results;
}

function output_js_expr(expr, indent) {
    switch (expr.type) {
        case 'number':
            return expr.value.toString();
        case 'string':
            return `"${expr.value}"`;
        case 'ref':
            return expr.value;
        case 'op': {
            const left = output_js_expr(expr.args[0], indent);
            const right = output_js_expr(expr.args[1], indent);
            return `${left} ${expr.op} ${right}`;
        }
        case 'call': {
            const args = output_js_expr_list(expr.args, indent).join(', ');
            return `${expr.func}(${args})`;
        }
        case 'let': {
            const value = output_js_expr(expr.value, indent);
            return `let ${expr.name} = ${value};\n`;
        }
        case 'assign': {
            const value = output_js_expr(expr.value, indent);
            return `${expr.ref} = ${value};\n`;
        }
        case 'if': {
            const cond = output_js_expr(expr.cond, indent);
            const texpr = output_js_exprs(expr.texpr, indent + '  ');
            const fexpr = output_js_exprs(expr.fexpr, indent + '  ');
            return `if (${cond}) {\n${texpr}} else {\n${fexpr}}\n`;
        }
        default:
            return '';
    }
}

main()

