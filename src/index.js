exports.parse = (johntext) => {
    if (typeof (johntext) !== typeof ("string")) {
        throw new Error("Argument supplied to 'parse' function must be a string");
    }

    let tokens = tokenize(johntext).map(t => [t[0], token_type(t[0]), t[1]]);

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
        throw new JOHNError(`Parser Error: Line ${tokens[0][2]}: Expected an identifier, instead found ${tokens[0][1]}`);
        // TODO: get line number
    }

    let i = 0;
    let identifier = '';
    while (i < tokens.length) {
        if (!tokens[i]) throw new JOHNError(`Parser error: Line ${tokens[i][2]}: Expected object content`);
        identifier = tokens[i++][0];
        switch (tokens[i][1]) {
            case token_types.identifier:
                throw new JOHNError(`Parser error: Line ${tokens[i][2]}: Invalid object content: "${tokens[i][0]}"`);
            case token_types.right_curly_brace:
            case token_types.right_paranthesis:
            case token_types.right_square_brace:
                // This just shouldn't happen tbh
                throw new JOHNError(`Parser error: Line ${tokens[i][2]}: Unopened "${tokens[i][0]}" found`);
            case token_types.link:
                if (!identifier) throw new JOHNError(`Parser error: Line ${tokens[i][2]}: Unexpected link symbol`);
                i++;
                let llist = [];
                while (tokens[i] && tokens[i][1] !== token_types.identifier && tokens[i][1] !== token_types.link) {
                    switch (tokens[i][1]) {
                        case token_types.object:
                            llist.push(parse_object(tokens[i++][0]));
                            break;
                        case token_types.left_curly_brace:
                            closing_index = find_matching_bracket(tokens, i);
                            llist.push(parse_tokens(tokens.slice(i + 1, closing_index)));
                            i = closing_index + 1;
                            break;
                        case token_types.left_square_brace:
                            closing_index = find_matching_bracket(tokens, i);
                            llist.push(parse_array(tokens.slice(i + 1, closing_index)));
                            i = closing_index + 1;
                            break;
                        case token_types.left_paranthesis:
                            closing_index = find_matching_bracket(tokens, i);
                            llist.push(parse_array(tokens.slice(i + 1, closing_index)));
                            i = closing_index + 1;
                            break;
                    }
                }
                if (!tokens[i] || tokens[i][1] === token_types.identifier) {
                    let nodes = [];
                    nodes.push({value: llist[0], next: null});
                    for (let j = 1; j < llist.length; j++) {
                        nodes.push({value: llist[j], next: null});
                        nodes[j - 1].next = nodes[j];
                    }
                    john_object[identifier] = nodes[0];
                    break;
                }
                else {
                    let nodes = [];
                    nodes.push({value: llist[0], next: null});
                    for (let j = 1; j < llist.length; j++) {
                        nodes.push({value: llist[j], next: null});
                        nodes[j - 1].next = nodes[j];
                    }
                    nodes[llist.length - 1].next = nodes[0];
                    john_object[identifier] = nodes[0];
                    i++;
                    break;
                }
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
    throw new JOHNError(`Parser error: Line ${tokens[index][2]}: No matching bracket found for token ${index}`);
}

// Same method as for tuple parsing, because javascript does not have tuples
// (or type safety for that matter)
function parse_array(tokens) {
    let arr = [];
    let closing_index = -1;
    for (let i = 0; i < tokens.length; i++) {
        if (tokens[i][1] === token_types.identifier) {
            throw new JOHNError(`Parser error: Line ${tokens[i][2]}: Identifiers can't be inside an array`);
        }
        switch (tokens[i][1]) {
            case token_types.right_curly_brace:
            case token_types.right_paranthesis:
            case token_types.right_square_brace: // <- THIS SHOULD NEVER BE THE CASE EVER HOW THE FUCK
                throw new JOHNError(`Parser error: How the hell did you even do that`);
            case token_types.link:
                throw new JOHNError(`Parser error: Line ${tokens[i][2]}: Unexpected link symbol in array`);
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
    if (token === "#") {
        return null;
    }
    // string/char
    if ((/^[\"\'].*[\"\']$/).test(token)) {
        return eval(token); // too lazy to replace \n and such by hand
    }
    // boolean
    if (token === "true" || token === "false") {
        return token === "true";
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
    if (token.startsWith('0')) {
        if (token.charAt(2) === 'b') {
            return Number.parseInt(token.substring(2), 2);
        } else if (token.charAt(2) === 'x') {
            return Number.parseInt(token.substring(2), 16);
        } else {
            throw new JOHNError(`Unknown number base: ${token}`);
        }
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
        return Number.parseInt(token.replace('*', '').replace('^', '-')); // yeah...
    }
    // range
    if ((/^\d+(?:\.\d+)?\.\.\d+(?:\.\d+)?(?:\.\.\d+(?:\.\d+)?)?$/).test(token)) {
        let range_elements = token.split('..').map(x => Number.parseFloat(x));
        let range = [];
        for (let i = range_elements[0]; i < range_elements[1]; i += range_elements[2] ?? 1)
            range.push(i);
        return range;
    }

    throw new JOHNError("Unrecognized object type: " + token);
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
                        tokens.push([currentToken, line]);
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
                        tokens.push([currentToken, line]);
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
                        tokens.push([currentToken, line]);
                    currentToken = "";
                } else {
                    currentToken += input.charAt(i);
                }
                break;
            case '\n':
                if (str || chr) throw new JOHNError(`Tokenizer error: Line ${line}: Literal may not contain a newline. To include a newline use \\n instead.`);
                if (currentToken)
                    tokens.push([currentToken, line]);
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
                    tokens.push([currentToken, line]);
                tokens.push([input.charAt(i), line]);
                currentToken = "";
                break;
            default:
                currentToken += input.charAt(i);
                break;
        }
    }
    if (currentToken) tokens.push([currentToken, line]);
    if (str || chr) {
        const unmatchedQuoteLine = 1 + input.split('')
            .filter((c, i) => c === '\n' && i <= input.lastIndexOf(str ? '"' : '\''))
            .length;
        throw new JOHNError(`Tokenizer Error: Unmatched quote at line ${unmatchedQuoteLine}`);
    }

    return tokens;
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
    return (/^[a-zA-Z\_]+[a-zA-Z0-9\-\_]*$/).test(token) && !["true", "false", "#"].includes(token);
}

exports.serialize = (object) => {
    let johntext = "";
    if (Array.isArray(object)) {
        return "[" + serialize_array(object) + "]";
    }
    if (typeof (object) !== 'object') {
        return stringify_prim(object);
    }
    let keys = Object.keys(object);
    keys.forEach(key => {
        johntext += " " + key + " ";
        if (Array.isArray(object[key]))
            johntext += " [ " + serialize_array(object[key]) + " ] ";
        else if (typeof (object[key]) === 'object' && object[key] !== null)
            johntext += " { " + serialize(object[key]) + " } ";
        else if (object[key] !== null)
            johntext += stringify_prim(object[key]);
        else
            johntext += " # ";
    });
    return johntext.replace(/\s+/g, ' ').trim();
}

exports.minify = (johntext) => {
    return tokenize(johntext).map(t => t[0]).join(' ').replace(/\s*[\[\{\(\]\}\)]\s*/g, s => s.replace(/\s+/g, ''));
}

function serialize_array(arr) {
    let ser = "";
    for (let i = 0; i < arr.length; i++) {
        if (Array.isArray(arr[i]))
            ser += " [ " + serialize_array(arr[i]) + " ] ";
        else if (typeof (arr[i]) === 'object' && arr[i] !== null)
            ser += " { " + serialize(arr[i]) + " } ";
        else if (arr[i] !== null)
            ser += stringify_prim(arr[i]);
        else
            ser += " # ";
        ser += " ";
    }
    return ser;
}

function stringify_prim(object) {
    if (typeof (object) === "string") {
        return `"${object}"`;
    }
    if (typeof (object) === "number") {
        return `${object}`;
    }
    if (typeof (object) === "boolean") {
        return `${object}`;
    }
    if (!object) {
        return `#`;
    }
    try {
        return object.toString();
    }
    catch {
        throw new JOHNError(`Unable to stringify ${object}`);
    }
}