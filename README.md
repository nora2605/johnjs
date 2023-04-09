# JOHN parser and serializer for JavaScript objects

## JOHN

John is a data serialization notation and the default for the Jane language.

The full documentation can be found in the Jane documentation at [The Jane repo](https://github.com/nora2605/jane)

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

**Warning: This project is not finished. Some parts might not work.**

johnjs is the library that connects john to js:

### Parsing

You can parse a JOHN string like you would with JSON:

```js
import JOHN from 'john'
// or
const JOHN = require('john');

JOHN.parse('hello "hi"');
// >>> { hello: "hi" }
```

And stringify it by using the `serialize` function:

```js
JOHN.serialize({hello: "hi", wow: ['Very cool']});
// >>> hello "hi" wow [ "Very cool" ]
```

Formatting might or might not be available in the future.
