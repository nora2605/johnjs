/// Name "Parse function for JOHN"
/// Arguments [
///     johntext "supplies a JOHN formatted text"
/// ]
//// fix: newlines in strings will be interpreted as spaces (should not be allowed)
//// fix: the space char ' ' gets mistokenized.
//// fix: doesn't recognize multiple spaces in strings (bad)
export function parse(johntext) {
    if (typeof (johntext) !== typeof ("string")) {
        throw new Error("Argument supplied to 'parse' function must be a string");
    }

    let john_object = {};

    let tokens = tokenize(johntext);

    console.log(tokens);
}

function tokenize(johntext) {
    // preprocess
    let input = johntext.trim().replace(/\r/g, '');

    let str = false;
    let chr = false;
    let tokens = [];
    let currentToken = "";
    let line = 1; // for error handling

    for (let i = 0; i < input.length; i++) {
        switch (input.charAt(i)) {
            // handles literal tokenization
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
                        if (currentToken.length > 3) throw new JOHNError(`Tokenizer error: Line ${line}: Char cannot contain more than 1 character. Consider using a string literal instead.`);
                        tokens.push(currentToken);
                        currentToken = "";
                        chr = false;
                    } else {
                        currentToken += input.charAt(i);
                        chr = true;
                    }
                }
                else {
                    currentToken += input.charAt(i);
                }
                break;
            // Breaks a token, if not in a string or char
            case ':':
            case ',':
            case ';':
            case ' ':
                if (!str && !chr) {
                    if (currentToken !== "") tokens.push(currentToken);
                    currentToken = "";
                } else {
                    currentToken += input.charAt(i);
                }
                break;
            // Breaks a token, breaks strings and chars
            case '\n':
                if (str || chr) throw new JOHNError(`Tokenizer error: Line ${line}: Literal may not contain a newline. To include a newline use \\n instead.`);
                if (currentToken !== "") tokens.push(currentToken);
                currentToken = "";
                line++;
                break;
            // Prevents tokenization of next character (including itself)
            case '\\':
                currentToken += input.charAt(i) + input.charAt(i + 1);
                i++;
                break;
            // gets own token
            case '{':
            case '[':
            case '(':
            case ')':
            case ']':
            case '}':
                if (currentToken !== "") tokens.push(currentToken);
                tokens.push(input.charAt(i));
                currentToken = "";
                break;
            default:
                currentToken += input.charAt(i);
                break;
        }
    }

    if (str || chr) {
        throw new JOHNError('Tokenizer Error: Unmatched literal at line ' +
            (1 + input.split('')
                .filter((c, i) => c === '\n' && i <= input.lastIndexOf(str ? '"' : '\''))
            )
        );
    }

    return tokens;
}

const object_type = {
    object: 'object', // contains keyed elements of various types
    array: 'array', // contains indexed elements of a strict type
    tuple: 'tuple', // contains indexed elements of various types
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
    range: 'range', // contains a range that gets compiled at read-time (array)
    index: 'index', // contains an index (from left or right)
    linked_list: 'linked_list', // contains a linked list
    circular_linked_list: 'circular_linked_list', // contains a circularly linked list
    null: 'null' // contains undefined
}

const token_types = {

}

class JOHNError extends Error {

}

export function tokenize_strings(tokens) {
    let new_tokens = [];
    for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].startsWith('"')) {
            let ni = tokens.findIndex((t, ii) => ii >= i && t.endsWith('"') && !t.endsWith('\\"'));
            if (ni < 0) {
                throw new Error(`Tokenizer terminated: String literal in ${tokens[i]} has no counterpart`);
                return [];
            }
            let new_token = tokens.slice(i, ni + 1).join(' ');
            console.log('Concatted string ' + new_token);
            new_tokens.push(new_token);
            i = ni;
            continue;
        }
        new_tokens.push(tokens[i]);
    }
    return new_tokens;
}

function token_type(token) {

}

export function stringify(object) {

}