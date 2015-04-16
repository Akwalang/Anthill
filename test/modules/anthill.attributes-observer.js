
(function (Ai, _) {

	var Ant = Ai({mixins: ['Attributes', 'Observer']});

	QUnit.module('AttributesObserver');

	test('.on(\'change\', path, callback)', function () {
		var results, callbacks, rabbit = new Ant();

		/* Accurate path */
		results = [];
		callbacks = [];

		callbacks[0] = function (davent) {
			results[0] = davent.eventPath = 'test_1' &&
						 davent.path === 'test_1' &&
						 davent.old === undefined &&
						 davent.cur === 'New value 1';
		};

		callbacks[1] = function (davent) {
			results[1] = davent.eventPath = 'test_1' &&
						 davent.path === 'test_1' &&
						 davent.old === 'New value 1' &&
						 davent.cur === 'New value 2';
		};

		rabbit.on('change', 'test_1', callbacks[0]);
		results[0] = false;
		rabbit.set('test_1', 'New value 1');
		rabbit.off('change', 'test_1', callbacks[0]);

		rabbit.on('change', 'test_1', callbacks[1]);
		results[1] = false;
		rabbit.set('test_1', 'New value 2');
		rabbit.off('change', 'test_1', callbacks[1]);

		ok(_.every(results), '[' + results.join(', ') + ']');

		/* Nested path */
		results = [];
		callbacks = [];

		callbacks[0] = function (davent) {
			results[0] = davent.eventPath = 'test_2' &&
						 davent.path === 'test_2.nested' &&
						 davent.old === 'Test value' &&
						 davent.cur === 'New value 1';
		};

		callbacks[1] = function (davent) {
			results[1] = davent.eventPath = 'test_2' &&
						 davent.path === 'test_2.nested' &&
						 davent.old === 'New value 1' &&
						 davent.cur === 'New value 2';
		};

		callbacks[2] = function (davent) {
			results[2] = davent.eventPath = 'test_2' &&
						 davent.path === 'test_2.nested' &&
						 davent.old === 'New value 2' &&
						 davent.cur === undefined;
		};

		rabbit.set('test_2.nested', 'Test value');

		rabbit.on('change', 'test_2.nested', callbacks[0]);
		results[0] = false;
		rabbit.set('test_2', {nested: 'New value 1'});
		rabbit.off('change', 'test_2.nested', callbacks[0]);

		rabbit.on('change', 'test_2.nested', callbacks[1]);
		results[1] = false;
		rabbit.set('test_2', {nested: 'New value 2'});
		rabbit.off('change', 'test_2.nested', callbacks[1]);

		rabbit.on('change', 'test_2.nested', callbacks[2]);
		results[2] = false;
		rabbit.unset('test_2');
		rabbit.off('change', 'test_2.nested', callbacks[2]);

		ok(_.every(results), '[' + results.join(', ') + ']');

		/* Upper path */
		results = [];
		callbacks = [];

		callbacks[0] = function (davent) {
			results[0] = davent.eventPath = 'test_3.nested' &&
						 davent.path === 'test_3' &&
						 _.isEqual(davent.old, {nested: 'Test value'}) &&
						 _.isEqual(davent.cur, {nested: 'New value 1'});
		};

		callbacks[1] = function (davent) {
			results[1] = davent.eventPath = 'test_3.nested' &&
						 davent.path === 'test_3' &&
						 _.isEqual(davent.old, {nested: 'New value 1'}) &&
						 _.isEqual(davent.cur, {nested: 'New value 2'});
		};

		callbacks[2] = function (davent) {
			results[2] = davent.eventPath = 'test_3.nested' &&
						 davent.path === 'test_3' &&
						 _.isEqual(davent.old, {nested: 'New value 2'}) &&
						 _.isEqual(davent.cur, {nested: undefined});
		};

		rabbit.set('test_3.nested', 'Test value');

		rabbit.on('change', 'test_3', callbacks[0]);
		results[0] = false;
		rabbit.set('test_3.nested', 'New value 1');
		rabbit.off('change', 'test_3', callbacks[0]);

		rabbit.on('change', 'test_3', callbacks[1]);
		results[1] = false;
		rabbit.set('test_3', {nested: 'New value 2'});
		rabbit.off('change', 'test_3', callbacks[1]);

		rabbit.on('change', 'test_3', callbacks[2]);
		results[2] = false;
		rabbit.unset('test_3.nested');
		rabbit.off('change', 'test_3', callbacks[2]);

		ok(_.every(results), '[' + results.join(', ') + ']');

		/* Array */
		results = [];
		callbacks = [];

		callbacks[0] = function (davent) {
			results[0] = davent.eventPath = 'test_4.array.{0}' &&
						 davent.path === 'test_4.array.{0}' &&
						 davent.old === 't' &&
						 davent.cur === 's';
		};

		callbacks[1] = function (davent) {
			results[1] = davent.eventPath = 'test_4.array.{0}' &&
						 davent.path === 'test_4.array.{0}' &&
						 davent.old === 's' &&
						 davent.cur === 6;
		};

		callbacks[2] = function (davent) {
			results[2] = davent.eventPath = 'test_4.array.length' &&
						 davent.path === 'test_4.array.length' &&
						 davent.old === 6 &&
						 davent.cur === 5;
		};

		rabbit.set('test_4.array', ['q', 'w', 'e', 'r', 't', 'y']);

		var sk = rabbit._getStaticKey('test_4.array', 4);

		rabbit.on('change', 'test_4.array.{' + sk + '}', callbacks[0]);
		results[0] = false;
		rabbit.unshift('test_4.array', 'a');
		rabbit.set('test_4.array.[5]', 's');
		rabbit.off('change', 'test_4.array.{' + sk + '}', callbacks[0]);

		rabbit.on('change', 'test_4.array.{' + sk + '}', callbacks[1]);
		results[1] = false;
		rabbit.set('test_4.array', [1, 2, 3, 4, 5, 6]);
		rabbit.off('change', 'test_4.array.{' + sk + '}', callbacks[1]);

		rabbit.on('change', 'test_4.array.length', callbacks[2]);
		results[2] = false;
		rabbit.splice('test_4.array', 1, 2, 'test');
		rabbit.off('change', 'test_4.array.length', callbacks[2]);

		ok(_.every(results), '[' + results.join(', ') + ']');

		window.rabbit = rabbit;
	});

})(Anthill, _);
