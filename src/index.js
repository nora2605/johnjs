// TODO: linked lists
// 0x00 and 0b00 notation
// booleans
// null
// Line numbers in parser errors
// serializer


/// Name "Parse function for JOHN"
/// Arguments [
///     johntext "supplies a JOHN formatted text"
/// ]
export function parse(johntext) {
    if (typeof (johntext) !== typeof ("string")) {
        throw new Error("Argument supplied to 'parse' function must be a string");
    }

    let tokens = tokenize(johntext).map(t => [t, token_type(t)]);
    console.log(tokens);

    return parse_tokens(tokens);
}

function parse_tokens(tokens) {
    // No tokens :(
    if (!tokens || !tokens[0]) return {};
    
    let john_object = {};
    let closing_index = -1;

    // Single object parsing
    if (tokens[0][1] === token_types.object && tokens.length === 1) {
        return parse_object(tokens[0][0]);
    }
    // First token must be an identifier:
    if (tokens[0][1] !== token_types.identifier) {
        throw new JOHNError(`Parser Error: Expected an identifier, instead found ${tokens[0][1]} at "${tokens[0][0]}"`);
        // TODO: get line number
    }

    let i = 0;
    while (i < tokens.length) {
        let identifier = tokens[i++][0];
        switch(tokens[i][1]) {
            case token_types.identifier:
                throw new JOHNError(`Parser error: Invalid object content: "${tokens[i][0]}"`);
            case token_types.right_curly_brace:
            case token_types.right_paranthesis:
            case token_types.right_square_brace:
                // This just shouldn't happen tbh
                throw new JOHNError(`Parser error: Unopened "${tokens[i][0]}" found`);
            case token_types.link:
                // circular linked list
                break;
            case token_types.object:
                john_object[identifier] = parse_object(tokens[i++][0]);
                break;
            case token_types.left_curly_brace:
                // nested object
                closing_index = find_matching_bracket(tokens, i);
                // Recursively parse nested objects
                john_object[identifier] = parse_tokens(tokens.slice(i + 1, closing_index));
                // Next index is index after the closing curly brace
                i = closing_index + 1;
                break;
            case token_types.left_square_brace:
                // array
                closing_index = find_matching_bracket(tokens, i);
                // Parse the array
                john_object[identifier] = parse_array(tokens.slice(i + 1, closing_index));
                // Next index is index after the closing curly brace
                i = closing_index + 1;
                break;
            case token_types.left_paranthesis:
                // tuple
                closing_index = find_matching_bracket(tokens, i);
                // Parse the tuple (as array)
                john_object[identifier] = parse_array(tokens.slice(i + 1, closing_index));
                i = closing_index + 1;
                break;
        }
    }
    return john_object;
}

function find_matching_bracket(tokens, index) {
    let leftb = tokens[index][1];
    let rightb =
        leftb === token_types.left_curly_brace ? 
            token_types.right_curly_brace :
            leftb === token_types.left_square_brace ? 
                token_types.right_square_brace : 
                token_types.right_paranthesis;
    let nesting_level = 0;
    for (let i = index; i < tokens.length; i++) {
        if (tokens[i][1] === leftb) nesting_level++;
        if (tokens[i][1] === rightb) {
            nesting_level--;
            if (nesting_level === 0) {
                return i;
            }
        }
    }
    throw new JOHNError(`Parser error: No matching bracket found for token ${index}`);
}

// Same method as for tuple parsing, because javascript does not have tuples
// (or type safety for that matter)
function parse_array(tokens) {
    let arr = [];
    for (let i = 0; i < tokens.length; i++) {
        if (tokens[i][1] === token_types.identifier) {
            throw new JOHNError("Parser error: Identifiers can't be inside an array: " + tokens[i][0]);
        }
        switch(tokens[i][1]) {
            case token_types.right_curly_brace:
            case token_types.right_paranthesis:
            case token_types.right_square_brace: // <- THIS SHOULD NEVER BE THE CASE EVER HOW THE FUCK
                throw new JOHNError(`Parser error: Unopened "${tokens[i][0]}" found`);
            case token_types.link:
                throw new JOHNError(`Parser error: Unexpected link symbol in array`);
            case token_types.object:
                arr.push(parse_object(tokens[i][0]));
                break;
            case token_types.left_curly_brace:
                closing_index = find_matching_bracket(tokens, i);
                arr.push(parse_tokens(tokens.slice(i + 1, closing_index)));
                i = closing_index;
                break;
            case token_types.left_square_brace:
                closing_index = find_matching_bracket(tokens, i);
                arr.push(parse_array(tokens.slice(i + 1, closing_index)));
                i = closing_index;
                break;
            case token_types.left_paranthesis:
                // tuple
                closing_index = find_matching_bracket(tokens, i);
                // Parse the tuple (as array)
                arr.push(parse_array(tokens.slice(i + 1, closing_index)));
                i = closing_index;
                break;
        }
    }
    return arr;
}

function parse_object(token) {
    // string/char
    if ((/^[\"\'].*[\"\']$/).test(token)) {
        return eval(token); // too lazy to replace \n and such by hand
    }
    // any number type
    let dmatches = (/^-?(?:(?:\d+)|(?:\d*\.\d+))([ui](?:8|16|32|64)|f(?:32|64))?$/).exec(token);
    if (dmatches) {
        // In JS number types don't matter
        if (dmatches.groups) {
            token = token.substring(0, token.length - dmatches[1].length)
        }
        if (token.includes('.'))
            return Number.parseFloat(token);
        return Number.parseInt(token);
    }
    // version
    if ((/^v(?:\d+\.){2,3}\d+$/).test(token)) {
        let version_elements = token.substring(1).split('.');
        return {
            major: Number.parseInt(version_elements[0]),
            minor: Number.parseInt(version_elements[1]),
            patch: Number.parseInt(version_elements[2]),
            build: version_elements.length > 3 ? Number.parseInt(version_elements[2]) : undefined // if index out of range just remains undefined
        };
    }
    // index
    if ((/^([\*\^])\d+/).test(token)) {
        return Number.parseInt(token.replace('*', '').replace('^','-')); // yeah...
    }
    // range
    if ((/^\d+..\d+(?:..\d+)?$/).test(token)) {
        let range_elements = token.split('..').map(x => Number.parseInt(x));
        let range = [];
        for (let i = range_elements[0]; i < range_elements[1]; i += range_elements[2] ?? 1)
            range.push(i);
        return range;
    }
}

function tokenize(johntext) {
    let input = johntext.trim().replace(/\r/g, '');
    let str = false;
    let chr = false;
    let tokens = [];
    let currentToken = "";
    let line = 1;

    for (let i = 0; i < input.length; i++) {
        switch (input.charAt(i)) {
            case '"':
                if (!chr) {
                    if (str) {
                        currentToken += input.charAt(i);
                        tokens.push(currentToken);
                        currentToken = "";
                        str = false;
                    } else {
                        currentToken += input.charAt(i);
                        str = true;
                    }
                } else {
                    currentToken += input.charAt(i);
                }
                break;
            case '\'':
                if (!str) {
                    if (chr) {
                        currentToken += input.charAt(i);
                        if (currentToken.length > 3) {
                            throw new JOHNError(`Tokenizer error: Line ${line}: Char cannot contain more than 1 character. Consider using a string literal instead.`);
                        }
                        tokens.push(currentToken);
                        currentToken = "";
                        chr = false;
                    } else {
                        currentToken += input.charAt(i);
                        chr = true;
                    }
                } else {
                    currentToken += input.charAt(i);
                }
                break;
            case ':':
            case ',':
            case ';':
            case ' ':
                if (!str && !chr) {
                    if (currentToken)
                        tokens.push(currentToken);
                    currentToken = "";
                } else {
                    currentToken += input.charAt(i);
                }
                break;
            case '\n':
                if (str || chr) throw new JOHNError(`Tokenizer error: Line ${line}: Literal may not contain a newline. To include a newline use \\n instead.`);
                if (currentToken)
                    tokens.push(currentToken);
                currentToken = "";
                line++;
                break;
            case '\\':
                currentToken += input.charAt(i) + input.charAt(i + 1);
                i++;
                break;
            case '{':
            case '[':
            case '(':
            case ')':
            case ']':
            case '}':
                if (currentToken)
                    tokens.push(currentToken);
                tokens.push(input.charAt(i));
                currentToken = "";
                break;
            default:
                currentToken += input.charAt(i);
                break;
        }
    }

    if (currentToken) tokens.push(currentToken);

    if (str || chr) {
        const unmatchedQuoteLine = 1 + input.split('')
            .filter((c, i) => c === '\n' && i <= input.lastIndexOf(str ? '"' : '\''))
            .length;
        throw new JOHNError(`Tokenizer Error: Unmatched quote at line ${unmatchedQuoteLine}`);
    }

    return tokens;
}

const primitive_type = {
    string: 'string', // contains a sequence of characters
    char: 'char', // contains a single character
    byte: 'byte', // contains an 8-bit integer
    sbyte: 'sbyte', // contains an 8-bit signed integer
    short: 'short', // contains a signed 16-bit integer
    ushort: 'ushort', // contains an unsigned 16-bit integer
    int: 'int', // contains a signed 32-bit integer
    uint: 'uint', // contains an unsigned 32-bit integer
    long: 'long', // contains a signed 64-bit integer
    ulong: 'ulong', // contains an unsigned 64-bit integer
    float: 'float', // contains a 32-bit floating point number
    double: 'double', // contains a 64-bit floating point number
    version: 'version', // contains a semantic version
    range: 'range', // contains a range that gets compiled at read-time (array) [1..3, 1..55..0.5]
    index: 'index', // contains an index (from left or right) [*1, ^1]
    null: 'null' // contains undefined
}

const token_types = {
    identifier: 'identifier',
    object: 'object',
    left_curly_brace: 'left_curly_brace',
    right_curly_brace: 'right_curly_brace',
    left_square_brace: 'left_square_brace',
    right_square_brace: 'right_square_brace',
    left_paranthesis: 'left_paranthesis',
    right_paranthesis: 'right_paranthesis',
    link: 'link'
}

const token_dict = {
    "{": token_types.left_curly_brace,
    "}": token_types.right_curly_brace,
    "[": token_types.left_square_brace,
    "]": token_types.right_square_brace,
    "(": token_types.left_paranthesis,
    ")": token_types.right_paranthesis
}

class JOHNError extends Error {

}

function token_type(token) {
    if ("([{}])".split('').includes(token)) {
        return token_dict[token];
    }
    else if (token === '->') {
        return token_types.link;
    }
    else if (validate_identifier(token)) {
        return token_types.identifier;
    }
    else {
        return token_types.object;
    }
}

function validate_identifier(token) {
    return (/^[a-zA-Z\_]+[a-zA-Z0-9\-\_]*$/).test(token);
}

export function stringify(object) {

}