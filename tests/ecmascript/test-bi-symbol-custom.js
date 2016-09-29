/*
 *  Some Duktape specific Symbol tests.
 */

// FIXME: creating buffer from symbol
    // FIXME: ArrayBuffer.allocPlain() coercion
    // FIXME: String.fromBuffer() and creating symbol representation directly
// FIXME: JX/JC
// FIXME: JSON and JX/JC serialization of symbols and custom hidden symbols
    print(Duktape.enc('jx', [1, 2, Symbol(), Symbol('foo'), Symbol.for('bar'), { foo: Symbol('foo'), [Symbol.for('bar')]: 'quux' }]));

