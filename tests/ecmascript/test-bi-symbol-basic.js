/*
 *  Basic Symbol behavior.
 */

if (typeof print === 'undefined') {
    print = function (x) {
        console.log(Array.prototype.map.call(arguments, function (v) { return String(v); }).join(' '));
    };
}

function restoreSymbolCoercionMethods(old) {
    Object.defineProperty(Symbol.prototype, Symbol.toPrimitive, { writable: true });

    Symbol.prototype.toString = old.oldToString;
    Symbol.prototype.valueOf = old.oldValueOf;
    Symbol.prototype[Symbol.toPrimitive] = old.oldToPrimitive;

    Object.defineProperty(Symbol.prototype, Symbol.toPrimitive, { writable: false });

    if (Symbol.prototype.toString !== old.oldToString) {
        throw new Error('failed to restore .toString');
    }
    if (Symbol.prototype.valueOf !== old.oldValueOf) {
        throw new Error('failed to restore .valueOf');
    }
    if (Symbol.prototype[Symbol.toPrimitive] !== old.oldToPrimitive) {
        throw new Error('failed to restore @@toPrimitive');
    }
}

function setupLoggingSymbolCoercionMethods() {
    var oldToString = Symbol.prototype.toString;
    var oldValueOf = Symbol.prototype.valueOf;
    var oldToPrimitive = Symbol.prototype[Symbol.toPrimitive];

    Object.defineProperty(Symbol.prototype, Symbol.toPrimitive, { writable: true });

    Symbol.prototype.toString = function replacementToString() {
        print('replacement toString called:', String(this));
        return oldToString.call(this);
    };
    Symbol.prototype.valueOf = function replacementValueOf() {
        print('replacement valueOf called:', String(this));
        return oldValueOf.call(this);
    };
    Symbol.prototype[Symbol.toPrimitive] = function replacementToPrimitive() {
        // Avoid String(this) here, it causes infinite recursion and a RangeError.
        print('replacement @@toPrimitive called', typeof this, Object.prototype.toString.call(this));
        return oldValueOf.call(this);
    };

    Object.defineProperty(Symbol.prototype, Symbol.toPrimitive, { writable: false });

    if (Symbol.prototype.toString === oldToString) {
        throw new Error('failed to replace .toString');
    }
    if (Symbol.prototype.valueOf === oldValueOf) {
        throw new Error('failed to replace .valueOf');
    }
    if (Symbol.prototype[Symbol.toPrimitive] === oldToPrimitive) {
        throw new Error('failed to replace @@toPrimitive');
    }

    return {
        oldToString: oldToString,
        oldValueOf: oldValueOf,
        oldToPrimitive: oldToPrimitive
    };
}

/*===
symbol creation
TypeError
TypeError
Symbol()
Symbol()
Symbol()
Symbol()
false false
Symbol(123)
Symbol(123)
Symbol(123)
Symbol(123)
false false
Symbol(123)
Symbol(123)
Symbol(123)
Symbol(123)
false false
false false
true true
Symbol(123)
Symbol(true)
Symbol()
Symbol()
Symbol(null)
Symbol([object ArrayBuffer])
Symbol(undefined)
Symbol(undefined)
Symbol(null)
Symbol([object ArrayBuffer])
===*/

function symbolCreationTest() {
    var s, s1, s2, s3;

    // Constructing as 'new' is a TypeError.
    try {
        s = new Symbol();
    } catch (e) {
        print(e.name);
    }
    try {
        s = new Symbol('123');
    } catch (e) {
        print(e.name);
    }

    // Creating an anonymous symbol.
    s1 = Symbol();
    s2 = Symbol();
    print(String(s1));
    print(s1.toString());
    print(String(s2));
    print(s2.toString());
    print(s1 == s2, s1 === s2);  // never equal

    // Creating a symbol with a description.
    s1 = Symbol('123');
    s2 = Symbol('123');
    print(String(s1));
    print(s1.toString());
    print(String(s2));
    print(s2.toString());
    print(s1 == s2, s1 === s2);  // never equal

    // Creating a global symbol.
    s1 = Symbol('123');
    s2 = Symbol.for('123');
    s3 = Symbol.for('123');
    print(String(s1));
    print(s1.toString());
    print(String(s2));
    print(s2.toString());
    print(s1 == s2, s1 === s2);  // never equal
    print(s1 == s3, s1 === s3);  // never equal
    print(s2 == s3, s2 === s3);  // equal

    // Symbol() argument is string coerced.
    s1 = Symbol(123);
    s2 = Symbol(true);
    print(String(s1));
    print(String(s2));

    // Missing argument and undefined are treated specially and create a
    // a Symbol with internal "description" set to undefined.  This is
    // technically different from a Symbol with an empty string as its
    // internal description, but the difference doesn't seem to be
    // externally visible.  Other argument types are string coerced (even
    // when it makes little sense).
    s1 = Symbol();
    s2 = Symbol(void 0);
    print(String(s1));
    print(String(s2));
    s1 = Symbol(null);
    print(String(s1));
    s1 = Symbol(new ArrayBuffer(9));
    print(String(s1));

    // Symbol.for coerces an undefined argument to 'undefined' rather than
    // empty string.
    s1 = Symbol.for();
    s2 = Symbol.for(void 0);
    print(String(s1));
    print(String(s2));
    s1 = Symbol.for(null);
    print(String(s1));
    s1 = Symbol.for(new ArrayBuffer(9));
    print(String(s1));
}

try {
    print('symbol creation');
    symbolCreationTest();
} catch (e) {
    print(e.stack || e);
}

/*===
symbol coercion
true false
[object Symbol]
[object Symbol]
true false
true true
true true
TypeError
TypeError
Symbol(Symbol(foo))
Symbol(123)
TypeError
Symbol(noSideEffects)
true
true
true
TypeError
val
undefined
Symbol(foo)
Symbol(foo)
Symbol(foo)
Symbol(foo)
true false
false false
false false
TypeError
TypeError
===*/

function symbolCoercionTest() {
    var s1, s2, s3, o1, o2, o3;
    var t;
    var obj;

    // Object coercion creates a wrapped Symbol which non-strict equals
    // the plain symbol.  Double Object coercion is idempotent (of course).
    s1 = Symbol('123');
    o1 = Object(s1);
    print(s1 == o1, s1 === o1);
    print(Object.prototype.toString.call(o1));  // [object Symbol]
    o2 = Object(o1);
    print(Object.prototype.toString.call(o2));
    print(s1 == o2, s1 === o2);
    print(o1 == o1, o1 === o1);
    print(o1 == o2, o1 === o2);

    // ToString coercion is a TypeError.  We need an internal operation that
    // invokes the conceptual ToString() operation directly.  Note that in ES6
    // String(x) doesn't do that: it has specific support for (plain) Symbols.
    // Use parseFloat() here, it ToString() coerces its argument before parsing.
    try {
        s1 = Symbol('123');
        t = parseFloat(s1);
        print(t);
    } catch (e) {
        //print(e.stack);
        print(e.name);
    }

    // Similarly, here Symbol() does a ToString() on its argument (a symbol here).
    try {
        s1 = Symbol(Symbol('foo'));
        print(String(s1));
    } catch (e) {
        //print(e.stack);
        print(e.name);
    }

    // But explicit .toString() returns e.g. "Symbol(foo)" which works as an
    // argument for creating an odd symbol.
    try {
        s1 = Symbol(Symbol('foo').toString());
        print(String(s1));
    } catch (e) {
        //print(e.stack);
        print(e.name);
    }

    // In ES6 String() is not a direct call to the internal ToString()
    // algorithm.  Instead, it has special support for plain symbols while
    // other values get a straight ToString() coercion.
    try {
        s1 = Symbol('123');
        print(String(s1));
    } catch (e) {
        //print(e.stack);
        print(e.name);
    }

    // Interestingly, String(Object(Symbol(...))) doesn't invoke the special
    // symbol behavior because the E6 Section 21.1.1.1 check in step 2.a is
    // only for plain symbols.  So, a Symbol object goes through ToString().
    // ToString() for an object invokes ToPrimitive() which usually returns
    // the plain symbol.  That is then ToString() coerced which results in a
    // TypeError.  At least Firefox and recent V8 behave this way also.
    s1 = Symbol('foo');
    o1 = Object(s1);
    try {
        print(String(o1));
    } catch (e) {
        //print(e.stack);
        print(e.name);
    }

    // Note that the special symbol support in String() formats the
    // symbol as "Symbol(<description>)" without invoking Symbol.prototype.toString()!
    var old = setupLoggingSymbolCoercionMethods();
    try {
        s1 = Symbol('noSideEffects');
        print(String(s1));
    } catch (e) {
        print(e.name, e);
    }
    restoreSymbolCoercionMethods(old);

    // ToBoolean(): symbol coerces to true, even empty symbol description.
    s1 = Symbol('123');
    s2 = Symbol();
    s3 = Symbol.for('');
    print(Boolean(s1));
    print(Boolean(s2));
    print(Boolean(s3));

    // ToNumber coercion is a TypeError.  Same for all ToInteger() etc variants.
    try {
        s1 = Symbol('123');
        t = Number(s1);
    } catch (e) {
        //print(e.stack);
        print(e.name);
    }

    // ToObject() coercion creates a Symbol object.  That Symbol object references
    // the argument symbol as its internal value, and non-strict compares true
    // with the symbol.  The object can also be used as a property key and will
    // reference the same property slot as the plain symbol.  (However, the object
    // is rejected by String().)
    s1 = Symbol('foo');
    o1 = Object(s1);
    s2 = Symbol('foo');
    o2 = Object(s2);

    obj = {};
    obj[s1] = 'val';
    print(obj[o1]);
    print(obj[o2]);

    print(String(s1));
    print(o1.toString());  // String(Object(Symbol(...))) is a TypeError
    print(String(s2));
    print(o2.toString());
    print(s1 == o1, s1 === o1);
    print(s1 == s2, s1 === o2);
    print(o1 == s2, o1 === o2);

    // ToPrimitive() for a plain symbol returns the symbol itself with no
    // side effects.
    //
    // ToPrimitive() for an object symbol coerces using a more complicated
    // algorithm.  If the value has @@toPrimitive it gets called.  Otherwise
    // the .valueOf() and/or .toString() methods are called depending on the
    // coercion hint.
    //
    // new Date(value) first ToPrimitive() coerces its argument, and for a
    // symbol it will then ToNumber() coerce it leading to a TypeError.
    // It will shake out side effects though which we test for here.

    // XXX: For now Duktape special cases symbols in ToPrimitive() as if
    // they had the default @@toPrimitive in E6 Section 19.4.3.4.  So this
    // test currently doesn't (correctly) trigger the @@toPrimitive side effect.

    var old = setupLoggingSymbolCoercionMethods();
    try {
        t = new Date(Symbol('foo'));
        print(t);
    } catch (e) {
        //print(e.stack);
        print(e.name);
    }
    try {
        t = new Date(Object(Symbol('foo')));
        print(t);
    } catch (e) {
        print(e.stack);
        print(e.name);
    }
    restoreSymbolCoercionMethods(old);
}

try {
    print('symbol coercion');
    symbolCoercionTest();
} catch (e) {
    print(e.stack || e);
}

/*===
symbol operator
TypeError
TypeError
TypeError
TypeError
TypeError
TypeError
TypeError
TypeError
TypeError
TypeError
TypeError
TypeError
TypeError
TypeError
TypeError
TypeError
TypeError
TypeError
TypeError
TypeError
TypeError
TypeError
TypeError
TypeError
TypeError
TypeError
TypeError
TypeError
TypeError
TypeError
===*/

function symbolOperatorTest() {
    var s1, s2;
    var t;

    function test(fn) {
        try {
            print(fn());
        } catch (e) {
            //print(e.stack);
            //print(e);
            print(e.name);
        }
    }

    // In basic arithmetic Symbols get either coerced to strings or numbers
    // which causes TypeError.
    s1 = Symbol('foo');
    s2 = Symbol('foo');
    test(function () { return s1 + s2; });
    test(function () { return s1 - s2; });
    test(function () { return s1 * s2; });
    test(function () { return s1 / s2; });
    test(function () { return +s2; });
    test(function () { return -s2; });

    // Addition is a bit special in its coercion behavior so test a few
    // type combinations.
    test(function () { return 'foo' + s1; });
    test(function () { return s1 + 'foo'; });
    test(function () { return 123 + s1; });
    test(function () { return s1 + 123; });

    // Comparison: arguments are ToPrimitive() coerced.  Symbols go on to
    // be ToNumber() coerced which ultimately fails the comparison.  Also
    // test for some mixed combinations.
    test(function () { return s1 < s2; });
    test(function () { return s1 <= s2; });
    test(function () { return s1 > s2; });
    test(function () { return s1 >= s2; });
    test(function () { return 'foo' < s1; });
    test(function () { return 'foo' <= s1; });
    test(function () { return 'foo' > s1; });
    test(function () { return 'foo' >= s1; });
    test(function () { return s1 < 'foo'; });
    test(function () { return s1 <= 'foo'; });
    test(function () { return s1 > 'foo'; });
    test(function () { return s1 >= 'foo'; });
    test(function () { return 123 < s1; });
    test(function () { return 123 <= s1; });
    test(function () { return 123 > s1; });
    test(function () { return 123 >= s1; });
    test(function () { return s1 < 123; });
    test(function () { return s1 <= 123; });
    test(function () { return s1 > 123; });
    test(function () { return s1 >= 123; });
}

try {
    print('symbol operator');
    symbolOperatorTest();
} catch (e) {
    print(e.stack || e);
}

/*===
symbol property
foo
undefined
foo
===*/

function symbolPropertyTest() {
    var s1, s2, s3, o1, o2, o3;
    var obj, child;

    obj = {};
    child = {}; Object.setPrototypeOf(child, obj);

    s1 = Symbol('123');
    s2 = Symbol('123');
    o1 = Object(s1);
    o2 = Object(s2);

    // Plain symbol and Object coerced Symbol reference the same property.
    obj[s1] = 'foo';
    print(obj[o1]);

    // Symbol with same description is a separate property if the symbol
    // instance is different.
    print(obj[s2]);

    // Symbol accesses are normal property accesses in that they're inherited.
    print(child[o1]);
}

try {
    print('symbol property');
    symbolPropertyTest();
} catch (e) {
    print(e.stack || e);
}

/*===
symbol enumeration
for-in
  - ownEnumStr
  - inhEnumStr
Object.keys()
  - ownEnumStr
Object.getOwnPropertyNames()
  - ownEnumStr
  - ownNonEnumStr
Object.getOwnPropertySymbols()
  - Symbol(ownEnumSymGlobal)
  - Symbol(ownNonEnumSymGlobal)
  - Symbol(ownEnumSymLocal)
  - Symbol(ownNonEnumSymLocal)
===*/

function symbolEnumerationTest() {
    var obj = {};
    var ancestor = {};
    if (typeof Duktape === 'object') {
        var internalKey1 = String.fromBuffer(Duktape.dec('hex', 'ff696e68456e756d53796d48696464656e'));  // _InhEnumSymHidden
        var internalKey2 = String.fromBuffer(Duktape.dec('hex', 'ff696e684e6f6e456e756d53796d48696464656e'));  // _InhNonEnumSymHidden
        var internalKey3 = String.fromBuffer(Duktape.dec('hex', 'ff4f776e456e756d53796d48696464656e'));  // _OwnEnumSymHidden
        var internalKey4 = String.fromBuffer(Duktape.dec('hex', 'ff4f776e4e6f6e456e756d53796d48696464656e'));  // _OwnNonEnumSymHidden
    } else {
        // For manual testing with e.g. Node.js.
        var internalKey1 = 'fake1';
        var internalKey2 = 'fake2';
        var internalKey3 = 'fake3';
        var internalKey4 = 'fake4';
    }
    var k;

    // Test object: own and inherited properties, enumerable and
    // non-enumerable strings and symbols.

    Object.setPrototypeOf(obj, ancestor);

    Object.defineProperty(ancestor, 'inhEnumStr', {
        value: 'inhValue1',
        enumerable: true
    });
    Object.defineProperty(ancestor, 'inhNonEnumStr', {
        value: 'inhValue2',
        enumerable: false
    });
    Object.defineProperty(ancestor, Symbol.for('inhEnumSymGlobal'), {
        value: 'inhValue3',
        enumerable: true
    });
    Object.defineProperty(ancestor, Symbol.for('inhNonEnumSymGlobal'), {
        value: 'inhValue4',
        enumerable: false
    });
    Object.defineProperty(ancestor, Symbol('inhEnumSymLocal'), {
        value: 'inhValue5',
        enumerable: true
    });
    Object.defineProperty(ancestor, Symbol('inhNonEnumSymLocal'), {
        value: 'inhValue6',
        enumerable: false
    });
    Object.defineProperty(ancestor, internalKey1, {
        value: 'inhValue7',
        enumerable: true
    });
    Object.defineProperty(ancestor, internalKey2, {
        value: 'inhValue8',
        enumerable: false
    });

    Object.defineProperty(obj, 'ownEnumStr', {
        value: 'ownValue1',
        enumerable: true
    });
    Object.defineProperty(obj, 'ownNonEnumStr', {
        value: 'ownValue2',
        enumerable: false
    });
    Object.defineProperty(obj, Symbol.for('ownEnumSymGlobal'), {
        value: 'ownValue3',
        enumerable: true
    });
    Object.defineProperty(obj, Symbol.for('ownNonEnumSymGlobal'), {
        value: 'ownValue4',
        enumerable: false
    });
    Object.defineProperty(obj, Symbol('ownEnumSymLocal'), {
        value: 'ownValue5',
        enumerable: true
    });
    Object.defineProperty(obj, Symbol('ownNonEnumSymLocal'), {
        value: 'ownValue6',
        enumerable: false
    });
    Object.defineProperty(obj, internalKey3, {
        value: 'ownValue7',
        enumerable: true
    });
    Object.defineProperty(obj, internalKey4, {
        value: 'ownValue8',
        enumerable: false
    });

    print('for-in');
    for (k in obj) {
        print('  -', k);
    }

    print('Object.keys()');
    Object.keys(obj).forEach(function (k) {
        print('  -', k);
    });

    print('Object.getOwnPropertyNames()');
    Object.getOwnPropertyNames(obj).forEach(function (k) {
        print('  -', k);
    });

    // Duktape hidden symbols won't enumerate even with
    // Object.getOwnPropertySymbols(): they're intended to
    // be hidden from script access.
    print('Object.getOwnPropertySymbols()');
    Object.getOwnPropertySymbols(obj).forEach(function (k) {
        print('  -', k);
    });
}

try {
    print('symbol enumeration');
    symbolEnumerationTest();
} catch (e) {
    print(e.stack || e);
}

/*===
Symbol(Symbol.toPrimitive)
undefined
false
===*/

function wellKnownSymbolTest() {
    var s;

    // Well-known symbols are (unless otherwise mentioned) shared across all
    // code realms, but they're still not global symbols.

    s = Symbol.toPrimitive;  // @@toPrimitive
    print(String(s));
    print(Symbol.keyFor(s));  // -> undefined, not global
    print(s == Symbol.for('Symbol.toPrimitive'));
}

try {
    print('well-known symbols');
    wellKnownSymbolTest();
} catch (e) {
    print(e.stack || e);
}

/*===
symbol json
undefined
undefined
[1,null,null,4]
{}
"<:Symbol(foo)>"
"<:Symbol(fooX)>"
[1,"<1:Symbol(fooXYZ)>","<2:Symbol(barXYZW)>",4]
{"foo":"<foo:Symbol(foo)>","bar":"<bar:Symbol(barX)>"}
111
112
[1,114,115,4]
{"foo":111,"bar":112}
[1,2,null,null,null,{}]
{"foo":123}
{
>>>"foo": 123
}
{"foo":123}
[1,2,null,null,null,{}]
[null,null,{},{}]
{"foo":{}}
{"foo":{"foo":"bar"}}
toJSON called
{"foo":"dummy"}
===*/

function symbolJsonTest() {
    function id(k, v) {
        return v;
    }
    function replacer1(key, value) {
        if (typeof value === 'symbol') {
            return '<' + key + ':' + String(value) + '>';
        } else {
            return value;
        }
    }
    function replacer2(key, value) {
        if (typeof value === 'symbol') {
            return 100 + String(value).length;
        } else {
            return value;
        }
    }

    var v1 = Symbol('foo');
    var v2 = Symbol.for('fooX');
    var v3 = [ 1, Symbol('fooXYZ'), Symbol.for('barXYZW'), 4 ];
    var v4 = {
        foo: Symbol('foo'),
        bar: Symbol.for('barX'),
        [ Symbol('quuxXY') ]: 'quux',
        [ Symbol.for('bazXYZ') ]: 'baz'
    };
    var tmp;

    // Symbols are ignored when serializing a value.
    print(JSON.stringify(v1));
    print(JSON.stringify(v2));
    print(JSON.stringify(v3));
    print(JSON.stringify(v4));

    // A replacer can allow symbol values to be serialized (after transforming
    // them to an allowed type like string or number) but symbol keys are
    // still ignored.
    print(JSON.stringify(v1, replacer1));
    print(JSON.stringify(v2, replacer1));
    print(JSON.stringify(v3, replacer1));
    print(JSON.stringify(v4, replacer1));
    print(JSON.stringify(v1, replacer2));
    print(JSON.stringify(v2, replacer2));
    print(JSON.stringify(v3, replacer2));
    print(JSON.stringify(v4, replacer2));

    // Symbols are ignored in a JSON.stringify() proplist.
    print(JSON.stringify({ foo: 123, bar: 234, [Symbol.for('quux')]: 345 }, [ 'foo', Symbol.for('quux') ]))

    // Symbols are ignored as gap values.
    print(JSON.stringify({ foo: 123 }, null, '>>>'));  // normal string case
    print(JSON.stringify({ foo: 123 }, null, Symbol.for('>>>')));  // same as no 'gap' argument

    // Random development time test: symbols in arrays serialize as 'null',
    // symbols as keys are ignored.  The 'id' replacer forces slow path.
    print(JSON.stringify([1, 2, Symbol(), Symbol('foo'), Symbol.for('bar'), { foo: Symbol('foo'), [Symbol.for('bar')]: 'quux' }]));
    print(JSON.stringify([1, 2, Symbol(), Symbol('foo'), Symbol.for('bar'), { foo: Symbol('foo'), [Symbol.for('bar')]: 'quux' }], id));

    // Symbol objects are serialized as is and usually end up as '{}'.
    // In particular, the internal symbol value is NOT looked up, as is
    // done for e.g. String objects.  .toJSON() works as expected.
    print(JSON.stringify([Symbol('foo'), Symbol.for('foo'), Object(Symbol('foo')), Object(Symbol.for('foo'))]));
    tmp = Object(Symbol('foo'));
    print(JSON.stringify({ foo: tmp }));
    tmp.foo = 'bar';
    print(JSON.stringify({ foo: tmp }));
    tmp.toJSON = function () { print('toJSON called'); return 'dummy' };
    print(JSON.stringify({ foo: tmp }));
}

try {
    print('symbol json');
    symbolJsonTest();
} catch (e) {
    print(e.stack || e);
}

/*===
===*/

function symbolMiscTest() {
    var s;

    s = Symbol('123');
    print(typeof s);
    print(Object.prototype.toString.call(s));
    print(s.toString());

    s = Symbol();
    print(typeof s);
    print(Object.prototype.toString.call(s));
    print(s.toString());

    s = Symbol.for('foo');
    print(typeof s);
    print(Object.prototype.toString.call(s));
    print(s.toString());

    // Symbol doesn't have a virtual .length or index properties.  This is easy
    // to get wrong in the current implementation where symbols are internally
    // strings.
    s1 = Symbol.for('123');  // internal representation: 80 '1' '2' '3'
    print(s1.length);  // Note: cannot use '0' in s1; requires Object argument
    print(typeof s1[0], typeof s1[1], typeof s1[2], typeof s1[3]);

    // Object.prototype.toString() for plain and object symbol.
    s1 = Symbol('foo');
    print(Object.prototype.toString.call(s1));
    print(Object.prototype.toString.call(Object(s1)));

    // NUL and 0xFF (codepoint) within a symbol description; tests for some
    // trivial implementation errors.  Duktape uses the byte 0xFF internally
    // to separate the symbol description and an internal unique suffix; the
    // 0xFF byte (not codepoint!) cannot occur in CESU-8 or extended UTF-8.
    s1 = Symbol('foo\u0000bar\u00ffquux\uffffbaz');
    //print(String(s1));
    print(String(s1).length);
    print(Array.prototype.map.call(String(s1), function (c) { return c.charCodeAt(0); }).join(' '));

    // eval() in general returns any non-string arguments as is, and this
    // applies to symbols too.
    print(typeof eval(Symbol('foo')));

    // Node.js Buffer fill() TypeErrors on symbol.
    var buf = new Buffer(10);
    try {
        buf.fill(Symbol.for('foo'));
        print('never here:', Duktape.enc('jx', buf));
    } catch (e) {
        //print(e.stack);
        print(e.name);
    }

    // Node.js Buffer write() TypeErrors on symbol.
    var buf = new Buffer(10);
    try {
        buf.fill(0);
        buf.write(Symbol('foo'));
        print('never here:', Duktape.enc('jx', buf));
    } catch (e) {
        //print(e.stack);
        print(e.name);
    }

    // If function .fileName or .name is a symbol, it is treated like a
    // missing property for tracebacks.
/* FIXME: must be done from C code
    function testFunc() { throw new Error('aiee'); }
    Object.defineProperty(testFunc, 'name', { value: Symbol('foo') });
    Object.defineProperty(testFunc, 'fileName', { value: Symbol('bar') });
    try {
        testFunc();
    } catch (e) {
        print(e.stack);
    }
*/

    // String.prototype.toString() rejects symbols and wrapped Symbols.
    try {
        print(typeof String.prototype.toString.call(Symbol('foo')));
    } catch (e) {
        print(e.stack);
    }
    try {
        print(typeof String.prototype.toString.call(Object(Symbol('foo'))));
    } catch (e) {
        print(e.stack);
    }
}

try {
    print('symbol misc');
    symbolMiscTest();
} catch (e) {
    print(e.stack || e);
}

    // FIXME: concatenation rule; if applied to Duktape internal symbols, breaks
    // idioms like String.fromBuffer(Duktape.dec('hex', 'ff')) + 'Value'.

    // FIXME: enumeration

    // Object.keys()
    // Object.getOwnPropertyNames()
    // Object.getOwnPropertySymbols()

// --> Separate custom test case?

// FIXME: Object.getOwnPropertyDescriptor(), Object.defineProperty(), Object.defineProperties()

// FIXME: Object.keys(), Object.getOwnPropertyNames(), and OBject.getOwnPropertySymbols() with Proxy 'keys' trap

// FIXME: Object.getOwnPropertySymbols() for non-enumerable and enumerable symbols

// FIXME: symbol primitive or object was with() target

// FIXME: Symbol.prototype.toString for a variety of values; symbol, Symbol, strings, objects, etc.

// FIXME: Object.prototype.toString() for plain symbol, symbol object

// FIXME: symbol in object
// FIXME: symbolObject in object

// FIXME: symbol properties on arrays

// FIXME: String prototype objects, when given a symbol as 'this'
//String.prototype.toString.call(Symbol('foo'))
//String.prototype.toString.call(Object(Symbol('foo'))) -- correct behavior?


//> Error.prototype.toString.call(Object(Symbol()))
//'Error'

//Date.parse()
//Date constructor

//arr = [1,2,3,Symbol()]
//[ 1, 2, 3, Symbol() ]
//> arr.sort()

// FIXME: Object.defineProperties() where keys are symbols, argument constructed manually before call.


// FIXME: .fileName and .lineNumber as symbols, in tracebacks
