class John {
    token_breaks = [' ', '\n', '\r', '\t', ',', ':', ';', '='];
    non_delim_tokens = ['[', ']', '{', '}', '(', ')', '|', '#'];

    input = '';
    pos = 0;
    cur_token = '';
    line = 1;
    column = 1;

    cur_key = '';

    tokenizer = this.tokens();

    no_parse = Symbol('no_parse');
    node_compat;

    constructor(input, { node_compat } = { }) {
        this.input = input;
        this.node_compat = node_compat;
    }

    *tokens() {
        let token = '';
        let in_string = false;
        let in_char = false;
        while (this.pos < this.input.length) {
            let char = this.input[this.pos];
            if (char === '\'') {
                in_char = !in_char;
                token += char;
                this.pos++;
                this.column++;
                if (!in_char) {
                    this.cur_token = token;
                    token = '';
                    yield;
                }
                continue;
            }
            if (char === '"') {
                in_string = !in_string;
                token += char;
                this.pos++;
                this.column++;
                if (!in_string) {
                    this.cur_token = token;
                    token = '';
                    yield;
                }
                continue;
            }
            if (in_char || in_string) {
                if (char === '\n') {
                    // disallow newlines in strings
                    this.throw_with_message('Newline in strings are forbidden');
                }
                token += char;
                this.pos++;
                this.column++;
                continue;
            }

            if (this.token_breaks.includes(char)) {
                // special case for time string
                if (char === ':' && token.match(/^\d([\d-]+T)?[\d:\+\.]+$/)) {
                    token += char;
                    this.pos++;
                    this.column++;
                    continue;
                }

                this.pos++;
                if (token) {
                    this.cur_token = token;
                    token = '';
                    yield;
                }
                if (char === '\n') {
                    this.line++;
                    this.column = 1;
                } else {
                    this.column++;
                }
                
            } else if (this.non_delim_tokens.includes(char)) {
                if (token) {
                    this.cur_token = token;
                    token = '';
                    yield;
                }
                this.cur_token = char;
                this.pos++;
                this.column++;
                yield;
            } else if (char === '/' && this.input[this.pos + 1] === '/') {
                while (this.input[this.pos] !== '\n' && this.pos < this.input.length) {
                    this.pos++;
                }
                this.line++;
                this.column = 1;
                // don't count line twice
                this.pos++;
            }
            else {
                token += char;
                this.pos++;
                this.column++;
            }
        }
        if (token) {
            this.cur_token = token;
            token = '';
            yield;
        }
        this.cur_token = '';
        return;
    }

    parse() {
        this.tokenizer.next();
        let val = this.parse_value();
        let result = val == this.no_parse ? this.parse_object() : val;
        return result;
    }

    parse_value() {
        if (this.cur_token === '{') {
            this.tokenizer.next();
            if (this.cur_token === '[') {
                this.tokenizer.next();
                return this.parse_set();
            } else if (this.cur_token === '{') {
                this.tokenizer.next();
                return this.parse_dict();
            } else {
                return this.parse_object();
            }
        } else if (this.cur_token === '[') {
            this.tokenizer.next();
            return this.parse_array();
        } else if (this.cur_token === '(') {
            this.tokenizer.next();
            return this.parse_tuple();
        } else if (this.cur_token === '|') {
            this.tokenizer.next();
            return this.parse_node();  
        } else if (this.cur_token.startsWith('@')) {
            // annotation
            switch (this.cur_token) {
                case '@as_dict':
                    this.parse_as_dict = true;
                    break;
                case '@mini':
                    // not relevant as this is a superset parser
                    break;
                case '@schema':
                    // ignore for parsing but do assert parentheses
                    this.tokenizer.next();
                    if (this.cur_token !== '(') this.throw_with_message('Schema annotation needs to be followed by a schema name');
                    while (this.cur_token !== ')' && this.cur_token) {
                        this.tokenizer.next();
                    }
                    break;
            }
            // parse the actual thing if annotation ignored
            this.tokenizer.next();
            return this.parse_value();
        } else {
            let prim = this.parse_primitive();
            // if successfully parsed, move to next token, otherwise it is a key and should be handled by the object parser
            if (prim !== this.no_parse) this.tokenizer.next();
            return prim;
        }
    }

    parse_primitive() {
        let token = this.cur_token;

        // keywords
        if (token === 'false') {
            return false;
        } else if (token === 'true') {
            return true;
        } else if (token === 'abyss' || token === '#') {
            return undefined;
        }
        // numbers
        else if (this.is_integer(token)) {
            return this.parse_integer(token);
        } else if (this.is_float(token)) {
            return this.parse_float(token);
        }
        // strings and chars
        else if (token.startsWith('"') && token.endsWith('"')) {
            return this.unescape(token.slice(1, -1));
        } else if (token.startsWith('\'') && token.endsWith('\'')) {
            return this.unescape(token.slice(1, -1));
        }
        // datetime stuff
        else if (this.is_ISO_date(token)) {
            return new Date(token);
        } else if (this.is_ISO_time(token)) {
            // gives a number of milliseconds into the day
            return new Date("1970-01-01T" + token);
        } else if (this.is_ISO_datetime(token)) {
            return new Date(token);
        } else if (this.is_ISO_time_interval(token)) {
            return this.parse_ISO_time_interval(token);
        }
        // scalar units
        else if (token.endsWith('b') || token.endsWith('B')) {
            let match = /(\d+)([KMGTPE]i?)?([Bb])/.exec(token);
            if (!match) this.throw_with_message('Invalid information unit');
            let val = parseInt(match[1]);
            let unit = match[2];
            let bit_or_byte = match[3];
            if (bit_or_byte === 'B') val *= 8;
            switch (unit) {
                case 'K': val *= 1000; break;
                case 'M': val *= 1000 ** 2; break;
                case 'G': val *= 1000 ** 3; break;
                case 'T': val *= 1000 ** 4; break;
                case 'P': val *= 1000 ** 5; break;
                case 'E': val *= 1000 ** 6; break;
                case 'Ki': val *= 1024; break;
                case 'Mi': val *= 1024 ** 2; break;
                case 'Gi': val *= 1024 ** 3; break;
                case 'Ti': val *= 1024 ** 4; break;
                case 'Pi': val *= 1024 ** 5; break;
                case 'Ei': val *= 1024 ** 6; break;
            }
            if (!isFinite(val) || val >= Number.MAX_SAFE_INTEGER) this.throw_with_message('Information unit is too large');
            return val;
        } else if (this.is_range(token)) {
          return this.parse_range(token);  
        } else if (token.startsWith('*') || token.startsWith('^')) {
            let val = (token.startsWith('*') ? 1 : -1) * parseInt(token.slice(1));
            if (isNaN(val)) this.throw_with_message('Invalid index');
            return val;
        } else if (token.startsWith('v')) {
            let match = /^v(\d+)((\.\d+){0,3})(-\w+)?$/.exec(token);
            let sub_majors = match[2]?.slice(1)?.split('.')?.map(x => parseInt(x)).map(x => isNaN(x) ? undefined : x) ?? [];
            return {
                major: parseInt(match[1]),
                minor: sub_majors[0] ?? 0,
                patch: sub_majors[1] ?? 0,
                build: sub_majors[2] ?? 0,
                tag: match[4]?.slice(1) ?? ''
            };
        }

        return this.no_parse;
    }

    parse_object() {
        if (this.parse_as_dict) {
            this.parse_as_dict = false;
            let dict = new Map();
            while (this.cur_token !== '}' && this.cur_token) {
                let key = this.cur_token;
                this.tokenizer.next();
                let value = this.parse_value();
                if (value !== this.no_parse)
                    dict.set(key, value);
                else this.throw_with_message('Invalid value');
            }
            if (this.cur_token === '}') this.tokenizer.next();
            return dict;
        }
        let obj = {};
        while (this.cur_token !== '}' && this.cur_token) {
            let key = this.validate_key(this.cur_token);
            this.tokenizer.next();
            let value = this.parse_value();
            if (value !== this.no_parse)
                obj[key] = value;
            else this.throw_with_message('Invalid value');
        }
        if (this.cur_token === '}') this.tokenizer.next();
        return obj;
    }

    parse_array() {
        let arr = [];
        while (this.cur_token !== ']' && this.cur_token) {
            let value = this.parse_value();
            if (value !== this.no_parse)
                arr.push(value);
            else this.throw_with_message('Invalid value');
        }
        this.tokenizer.next();
        return arr;
    }

    parse_tuple() {
        let tup = [];
        while (this.cur_token !== ')' && this.cur_token) {
            let value = this.parse_value();
            if (value !== this.no_parse)
                tup.push(value);
            else this.throw_with_message('Invalid value');
        }
        this.tokenizer.next();
        return tup;
    }

    parse_set() {
        let set = new Set();
        while (this.cur_token !== ']' && this.cur_token) {
            let value = this.parse_value();
            if (value !== this.no_parse)
                set.add(value);
            else this.throw_with_message('Invalid value');
        }
        this.tokenizer.next();
        if (this.cur_token === '}') this.tokenizer.next();
        else this.throw_with_message('Set was not closed properly');

        return set;
    }

    parse_dict() {
        let dict = new Map();
        while (this.cur_token !== '}' && this.cur_token) {
            let key = this.parse_value();
            if (key === this.no_parse)
                this.throw_with_message('Invalid dictionary key');

            let value = this.parse_value();
            if (value !== this.no_parse)
                dict.set(key, value);

            else this.throw_with_message('Invalid value');
        }
        this.tokenizer.next();
        if (this.cur_token === '}') this.tokenizer.next();
        else this.throw_with_message('Dict was not closed properly');
        
        return dict;
    }

    parse_node() {
        let node = {
            type: undefined,
            props: {
                children: undefined
            }
        };
        node.type = this.cur_token;
        this.tokenizer.next();
        while (this.cur_token !== '|' && this.cur_token) {
            let key = this.cur_token;
            this.tokenizer.next();
            let value = this.parse_value();
            if (value !== undefined)
                node.props[key] = value;
            else this.throw_with_message('Invalid value');
        }
        this.tokenizer.next();
        let children = this.parse_value();
        if (children !== undefined)
            node.props.children = children;
        else this.throw_with_message('Invalid value');

        if (this.node_compat === 'react') {
            node.$$typeof = Symbol.for('react.element');
            node.props.className = node.props.class;
            delete node.props.class;
        }

        return node;
    }

    validate_key(key) {
        if (!this.is_alpha_numeric(key)) {
            this.throw_with_message('Invalid key format');
        }
        return key;
    }

    throw_with_message(message) {
        throw new Error(`JOHN Error: ${message} at line ${this.line}, column ${this.column - this.cur_token.length}, token: ${this.cur_token}`);
    }

    is_alpha_numeric(char) {
        return /^[a-zA-Z0-9_]+$/.test(char);
    }

    unescape(str) {
        // C99 escape sequences
        str = str
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\r/g, '\r')
            .replace(/\\'/g, '\'')
            .replace(/\\"/g, '\"')
            .replace(/\\a/g, '\a')
            .replace(/\\b/g, '\b')
            .replace(/\\f/g, '\f')
            .replace(/\\v/g, '\v')
            .replace(/\\\\/g, '\\');
        // unicode escape sequences
        let unicode_small = /\\u([0-9a-fA-F]{4})/g;
        let unicode_large = /\\U([0-9a-fA-F]{8})/g;
        return str
                .replace(unicode_small, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
                .replace(unicode_large, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
    }

    is_integer(str) {
        return /^-?[\d_]+(e\d+)?$/.test(str) ||
            /^-?0x[\da-fA-F]+$/.test(str) ||
            /^-?0b[01]+$/.test(str) ||
            /^-?0o[0-7]+$/.test(str);
    }

    parse_integer(str) {
        let match = /^-?[\d_]+(e\d+)?$/.exec(str);
        if (match) return parseInt(match[0].replace(/_/g, '')) * (match[1] ? 10 ** parseInt(match[1].slice(1)) : 1);
        match = /^-?0x[\da-fA-F]+$/.exec(str);
        if (match) return parseInt(match[0].replace('0x', ''), 16);
        match = /^-?0b[01]+$/.exec(str);
        if (match) return parseInt(match[0].replace('0b', ''), 2);
        match = /^-?0o[0-7]+$/.exec(str);
        if (match) return parseInt(match[0].replace('0o', ''), 8);

        this.throw_with_message('Invalid integer');
    }

    is_float(str) {
        return /^-?(\d+f|\d+e-\d+|\d*\.\d+(e-?[0-9]+)?f?)$/.test(str) ||
            /^0x([0-9a-fA-F]{8}){1,2}[rR]$/.test(str);
    }

    parse_float(str) {
        let match = /^-?(\d+f|\d+e-\d+|\d*\.\d+(e-?[0-9]+)?f?)$/.exec(str);
        if (match) return parseFloat(match[0].replace('f', ''));
        match = /^0x([0-9a-fA-F]{8}){1,2}[rR]$/.exec(str);
        if (match) {
            // actually ridiculous
            let inp = match[0].slice(2, -1);
            let buffer = new ArrayBuffer(inp.length / 2);
            let view = new DataView(buffer);
            for (let i = 0; i < inp.length; i += 2) {
                view.setUint8(i / 2, parseInt(inp.slice(i, i + 2), 16));
            }
            return inp.length === 8 ? view.getFloat32(0, false) : view.getFloat64(0, false);
        }

        this.throw_with_message('Invalid float');
    }
    
    is_ISO_date(str) {
        return /^\d{4}-\d{2}-\d{2}$/.test(str);
    }

    is_ISO_time(str) {
        return /^\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|\+\d{2}:\d{2})?$/.test(str);
    }

    is_ISO_datetime(str) {
        return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|\+\d{2}:\d{2})?$/.test(str);
    }

    is_ISO_time_interval(str) {
        return /^P(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(\d+H)?(\d+M)?(\d+S)?)?$/.test(str);
    }

    parse_ISO_time_interval(str) {
        let match = /^P(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(\d+H)?(\d+M)?(\d+S)?)?$/.exec(str);
        let obj = {};
        if (match[1]) obj.years = parseInt(match[1].slice(0, -1));
        if (match[2]) obj.months = parseInt(match[2].slice(0, -1));
        if (match[3]) obj.weeks = parseInt(match[3].slice(0, -1));
        if (match[4]) obj.days = parseInt(match[4].slice(0, -1));
        if (match[6]) obj.hours = parseInt(match[6].slice(0, -1));
        if (match[7]) obj.minutes = parseInt(match[7].slice(0, -1));
        if (match[8]) obj.seconds = parseInt(match[8].slice(0, -1));
        return obj;
    }

    is_range(str) {
        return /^(\^?-?[0-9]+(\.[0-9]+)?)\.\.(\^?-?[0-9]+(\.[0-9]+)?)(\.\.(-?[0-9]+(\.[0-9]+)?))?$/.test(str);
    }

    parse_range(str) {
        let match = /^(\^?-?[0-9]+(\.[0-9]+)?)\.\.(\^?-?[0-9]+(\.[0-9]+)?)(\.\.(-?[0-9]+(\.[0-9]+)?))?$/.exec(str);
        let decaretify = (s) => {
            if (s.startsWith('^'))
                return s.slice(1);
            return s;
        };
        let start = parseFloat(decaretify(match[1]));
        let end = parseFloat(decaretify(match[3]));
        let step = match[5] ? parseFloat(match[5].slice(2)) : 1;
        return { 
            start,
            end,
            step,
            start_exclusive: match[1].startsWith('^'),
            end_exclusive: match[3].startsWith('^') 
        };
    }

    parse_point_annotation() {
        this.tokenizer.next(); // skip paren
        let value = this.cur_token; // key-like token
        this.tokenizer.next();
        if (this.cur_token !== ')') this.throw_with_message('Annotation needs to be closed with a parenthesis');
        // push a linking operation with the objects key and the name to be linked against
        this.post_linking_operations.push({key: this.cur_key, name: value});
        // placeholder
        return undefined;
    }
}

function parse(input, options) {
    return new John(input, options).parse();
}
function stringify(input) {
    return '';
}
function minify(input) {
    return '';
}

module.exports = { parse, stringify, minify };