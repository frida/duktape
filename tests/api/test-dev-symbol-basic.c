/* FIXME */

/*===
+*** test_push_string (duk_safe_call)
+symbol
+Symbol(mySymbol)
+final top: 0
+==> rc=0, result='undefined'
===*/

static duk_ret_t test_push_string(duk_context *ctx, void *udata) {
	(void) udata;

	/* duk_push_(l)string() always pushes a string, but that string gets
	 * interpreted as a symbol if it is invalid CESU-8 / extended UTF-8
	 * and matches the symbol internal string formats.
	 */
	duk_eval_string(ctx, "(function (v) { print(typeof v); print(String(v)); })");
	duk_push_string(ctx, "\x81" "mySymbol" "\xff" "unique1234");
	duk_call(ctx, 1);
	duk_pop(ctx);

	printf("final top: %ld\n", (long) duk_get_top(ctx));
	return 0;
}

void test(duk_context *ctx) {
	TEST_SAFE_CALL(test_push_string);
}
