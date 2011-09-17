var testCase = require('nodeunit').testCase,
    swig = require('../index');

exports['custom tags'] =  function (test) {
    var tags = {
            foo: function (indent) {
                return '__output.push("hi!");';
            }
        },
        tmpl8;

    tags.foo.ends = true;

    swig.init({ tags: tags });

    tmpl8 = swig.fromString('{% foo %}{% endfoo %}');
    test.strictEqual(tmpl8.render({}), 'hi!');
    test.done();
};

exports.if = testCase({
    setUp: function (callback) {
        swig.init({});
        callback();
    },

    basic: function (test) {
        var tmpl8 = swig.fromString('{% if foo %}hi!{% endif %}{% if bar %}nope{% endif %}');
        test.strictEqual(tmpl8.render({ foo: 1, bar: false }), 'hi!');

        tmpl8 = swig.fromString('{% if !foo %}hi!{% endif %}{% if !bar %}nope{% endif %}');
        test.strictEqual(tmpl8.render({ foo: 1, bar: false }), 'nope');

        test.done();
    },

    'var literals in tags allow filters': function (test) {
        var tmpl8 = swig.fromString('{% if foo|length > 1 %}hi!{% endif %}');
        test.strictEqual(tmpl8.render({ foo: [1, 2, 3] }), 'hi!');

        tmpl8 = swig.fromString('{% if foo|length === bar|length %}hi!{% endif %}{% if foo|length !== bar|length %}fail{% endif %}');
        test.strictEqual(tmpl8.render({ foo: [1, 2], bar: [3, 4] }), 'hi!');
        test.done();
    },

    else: function (test) {
        var tmpl8 = swig.fromString('{% if foo|length > 1 %}hi!{% else %}nope{% endif %}');
        test.strictEqual(tmpl8.render({ foo: [1, 2, 3] }), 'hi!');
        test.strictEqual(tmpl8.render({ foo: [1] }), 'nope');

        test.throws(function () {
            swig.fromString('{% for i in foo %}hi!{% else %}nope{% endfor %}');
        }, Error, 'Cannot call else tag outside of "if" context.');
        test.done();
    },

    'else if': function (test) {
        var tmpl8 = swig.fromString('{% if foo|length > 2 %}foo{% else if foo|length < 2 %}bar{% endif %}');
        test.strictEqual(tmpl8.render({ foo: [1, 2, 3] }), 'foo');
        test.strictEqual(tmpl8.render({ foo: [1, 2] }), '');
        test.strictEqual(tmpl8.render({ foo: [1] }), 'bar');

        test.done();
    },

    'multiple else if and else': function (test) {
        var tmpl8 = swig.fromString('{% if foo %}foo{% else if bar === "bar" %}bar{% else if 3 in baz %}baz{% else %}bop{% endif %}');
        test.strictEqual(tmpl8.render({ foo: true }), 'foo');
        test.strictEqual(tmpl8.render({ bar: "bar" }), 'bar');
        test.strictEqual(tmpl8.render({ baz: [3] }), 'baz');
        test.strictEqual(tmpl8.render({ baz: [2] }), 'bop');
        test.strictEqual(tmpl8.render({ bar: false }), 'bop');

        test.done();
    }
});

exports.for = testCase({
    setUp: function (callback) {
        swig.init({});
        callback();
    },

    basic: function (test) {
        var tmpl8 = swig.fromString('{% for foo in bar %}{{ foo }}, {% endfor %}');
        test.strictEqual(tmpl8.render({ bar: ['foo', 'bar', 'baz'] }), 'foo, bar, baz, ', 'array loop');
        test.strictEqual(tmpl8.render({ bar: { baz: 'foo', pow: 'bar', foo: 'baz' }}), 'foo, bar, baz, ', 'object loop');
        test.done();
    },

    variables: function (test) {
        var tmpl8 = swig.fromString('{% for foo in bar %}[{{ forloop.index }}, {{ forloop.key }}]{% endfor %}');
        test.strictEqual(tmpl8.render({ bar: ['foo', 'bar', 'baz'] }), '[0, 0][1, 1][2, 2]', 'array loop');
        test.strictEqual(tmpl8.render({ bar: { baz: 'foo', pow: 'bar', foo: 'baz' }}), '[0, baz][1, pow][2, foo]', 'object loop');
        test.done();
    },

    index: function (test) {
        var tmpl8 = swig.fromString('{% for foo in bar %}{{ forloop.index }}{% endfor %}');
        test.strictEqual(tmpl8.render({ bar: ['foo', 'bar', 'baz'] }), '012', 'index in object');
        test.strictEqual(tmpl8.render({ bar: { baz: 'foo', pow: 'bar', foo: 'baz' }}), '012', 'index in object');
        test.done();
    },

    first: function (test) {
        var tmpl8 = swig.fromString('{% for foo in bar %}{% if forloop.first %}{{ foo }}{% endif %}{% endfor %}');
        test.strictEqual(tmpl8.render({ bar: ['foo', 'bar', 'baz'] }), 'foo', 'first in array');
        test.strictEqual(tmpl8.render({ bar: { baz: 'foo', pow: 'bar', foo: 'baz' }}), 'foo', 'first in object');
        test.done();
    },

    last: function (test) {
        var tmpl8 = swig.fromString('{% for foo in bar %}{% if forloop.last %}{{ foo }}{% endif %}{% endfor %}');
        test.strictEqual(tmpl8.render({ bar: ['foo', 'bar', 'baz'] }), 'baz', 'last in array');
        test.strictEqual(tmpl8.render({ bar: { baz: 'foo', pow: 'bar', foo: 'baz' }}), 'baz', 'last in object');
        test.done();
    },

    empty: function (test) {
        var tmpl8 = swig.fromString('{% for foo in bar %}blah{% empty %}hooray!{% endfor %}');
        test.strictEqual(tmpl8.render({ bar: [] }), 'hooray!', 'empty in array');
        test.strictEqual(tmpl8.render({ bar: {}}), 'hooray!', 'empty in object');

        test.strictEqual(tmpl8.render({ bar: [1] }), 'blah', 'not empty in array');
        test.strictEqual(tmpl8.render({ bar: { foo: 'foo' }}), 'blah', 'not empty in object');

        test.throws(function () {
            swig.fromString('{% if foo %}hi!{% empty %}nope{% endif %}');
        }, Error, 'Cannot call "empty" tag outside of "for" context.');
        test.done();
    },

    'loop object allows filters': function (test) {
        var tmpl8 = swig.fromString('{% for foo in bar|reverse %}{{ foo }}{% endfor %}');
        test.strictEqual(tmpl8.render({ bar: ['baz', 'bar', 'foo'] }), 'foobarbaz');
        test.done();
    }
});
