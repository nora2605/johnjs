# JOHN parser and serializer for JavaScript objects

## JOHN

John is a data serialization notation and the default for the Jane language.

The full specification can be found in the Jane documentation at [The Jane repo](https://github.com/nora2605/jane)

Here's an example of how to use JOHN:

```john
first_name "Nora"
last_name "Nijimi"
age 21
hobbies [
    "programming"
    "gaming"
]
graduation_grades [
    ("maths" 100.0)
    ("science" 100.0)
    ("physical education" 0.0)
]
best_friend {
    first_name "Rashi"
    last_name "Klavae"
    age 20
    hobbies [
        "sleeping very long"
    ]
}
```

## JOHNjs

**Warning: The formatter is not currently in a production-ready state.**

johnjs is the library that connects john to js:

### Parsing

You can parse a JOHN string like you would with JSON:

```js
import JOHN from 'johnjs'
// or
const JOHN = require('johnjs');

JOHN.parse('hello "hi"');
// >>> { hello: "hi" }
```

And stringify it by using the `stringify` function:

```js
JOHN.stringify({hello: "hi", wow: ['Very cool']});
// >>> hello "hi" wow [ "Very cool" ]
```

You can also format JOHN using the `format` function (this might not work!):

```js
JOHN.format(`key "value" obj { key2 "value2" key3 "value3" }`);
// >>> key: "value",
// >>> obj {
// >>>     key2: "value2",
// >>>     key3: "value3",
// >>> }
```

JOHNjs includes typescript definitions for ease of use.
