
(function (Ai, _) {

	var Attributes = Ai({mixins: ['Attributes']});

	QUnit.module('Attributes');

	test('.set(path, value)', function () {
		var old_1, old_2, sk, space = new Attributes();

		/* Simple */
		old_1 = space.set('test_1', 'Test string 1');

		ok(space.test_1 === 'Test string 1', 'New value 1');
		ok(old_1 === undefined, 'Old value 1');

		old_2 = space.set('test_1', 'Test string 2');

		ok(space.test_1 === 'Test string 2', 'New value 2');
		ok(old_2 === 'Test string 1', 'Old value 2');

		/* Nested */
		old_1 = space.set('test_2.value', 'Test string 1');

		ok(space.test_2.value === 'Test string 1', 'New value 3');
		ok(old_1 === undefined, 'Old value 3');

		old_2 = space.set('test_2.value', 'Test string 2');

		ok(space.test_2.value === 'Test string 2', 'New value 4');
		ok(old_2 === 'Test string 1', 'Old value 4');

		/* Arrays */
		space.set('test_3', ['Test string 1', 'Test string 2', 'Test string 3']);

		old_1 = space.set('test_3.[1]', 'New string 1');

		ok(space.test_3[1] === 'New string 1', 'New value 5');
		ok(old_1 === 'Test string 2', 'Old value 5');

		sk = space._getStaticKey('test_3', 1);

		old_2 = space.set('test_3.{' + sk + '}', 'New string 2');

		ok(space.test_3[1] === 'New string 2', 'New value 6 [static path]');
		ok(old_2 === 'New string 1', 'Old value 6 [static path]');

		/* Multiple */
		old_1 = space.set({
			'test_4.item_1': 'Test 1',
			'test_4.item_2': 'Test 2',
			'test_4.item_3': 'Test 3',
			'test_4.item_4': 'Test 4'
		});

		ok(space.test_4.item_1 === 'Test 1', 'New value 7');
		ok(space.test_4.item_2 === 'Test 2', 'New value 7');
		ok(space.test_4.item_3 === 'Test 3', 'New value 7');
		ok(space.test_4.item_4 === 'Test 4', 'New value 7');

		ok(old_1['test_4.item_1'] === undefined, 'Old value 7');
		ok(old_1['test_4.item_2'] === undefined, 'Old value 7');
		ok(old_1['test_4.item_3'] === undefined, 'Old value 7');
		ok(old_1['test_4.item_4'] === undefined, 'Old value 7');

		old_2 = space.set({
			'test_4.item_2': 'New 2',
			'test_4.item_4': 'New 4'
		});

		ok(space.test_4.item_1 === 'Test 1', 'New value 7');
		ok(space.test_4.item_2 === 'New 2', 'New value 8');
		ok(space.test_4.item_3 === 'Test 3', 'New value 7');
		ok(space.test_4.item_4 === 'New 4', 'New value 8');

		ok(old_2['test_4.item_2'] === 'Test 2', 'Old value 8');
		ok(old_2['test_4.item_4'] === 'Test 4', 'Old value 8');

		/* Error */
		try {
			space.set('', 'Test string 1');
			ok(false, 'Exaption 1');
		}
		catch (e) {
			ok(true, 'Exaption 1');
		}
	});

	test('.get(path)', function () {
		var space = new Attributes();

		/* Simple */
		space.set('test_1', 'Test string 1');
		ok(space.get('test_1') === 'Test string 1', 'Get current value 1');
		
		/* Nested */
		space.set('test_2.value', 'Test string 1');
		ok(space.get('test_2.value') === 'Test string 1', 'Get current value 2');

		/* Arrays */
	});

	test('.unset(path)', function () {
		var space = new Attributes();

		/* Simple */
		space.set('test_1', 'Test string 1');
		space.unset('test_1');

		ok(('test_1' in space) === false, 'Unset 1');

		/* Nested */
		space.set('test_2.value', 'Test string 1');
		space.unset('test_2.value');

		ok(('value' in space.test_2) === false, 'Unset 2');

		/* Arrays */
		space.set('test_3', [1, 2, 3, 4, 5, 6, 7]);

		space.unset('test_3.[0]');
		space.unset('test_3.[4]');

		ok((0 in space.test_3) === false, 'Unset 3');
		ok((4 in space.test_3) === false, 'Unset 3');

		/* Multiple */
		space.set('test_4', 'Test string 1');
		space.set('test_5.value', 'Test string 1');

		space.unset('test_4', 'test_5.value');

		ok(('test_4' in space) === false && ('value' in space.test_5) === false, 'Double unset');
	});

	test('.check(path)', function () {
		var space = new Attributes();

		/* Simple */
		space.set('test_1', 'Test string 1');
		ok(space.check('test_1') === true, 'Check 1');

		/* Nested */
		space.set('test_2.value', 'Test string 1');
		ok(space.check('test_2.value') === true, 'Check 2');

		ok(space.check('unsetted') === false, 'Check 3');
		ok(space.check('unsetted.value') === false, 'Check 4');
		ok(space.check('unsetted') === false, 'Check 5');

		/* Arrays */
		space.set('test_3', [1]);

		ok(space.check('test_3.[0]') === true, 'Check 6');
		ok(space.check('test_3.[1]') === false, 'Check 6');
		ok(space.check('test_3.length') === true, 'Check 6');
	});

	test('.merge(path, source)', function () {
		var old, space = new Attributes();

		space.set('test_1', {
			item_1: 1,
			item_2: 'test',
			item_3: [1, 2, 3, 4, 5],
			item_4: {
				sub_1: 2,
				sub_2: 'test 2',
				sub_3: ['q', 'w', 'e', 'r', 't', 'y']
			}
		});

		old = space.merge('test_1', {
			item_1: 5,
			item_2: 'test',
			item_3: ['+', '-', '='],
			item_4: {
				sub_1: 6,
				sub_2: 'test 3',
				sub_3: {
					3: '!',
					5: '$',
					6: '&'
				}
			}
		});

		ok(space.test_1.item_1 === 5, 'New value 1');
		ok(space.test_1.item_2 === 'test', 'New value 2');
		ok(_.isEqual(space.test_1.item_3, ['+', '-', '=']), 'New value 3');
		ok(space.test_1.item_4.sub_1 === 6, 'New value 4');
		ok(space.test_1.item_4.sub_2 === 'test 3', 'New value 5');
		ok(_.isEqual(space.test_1.item_4.sub_3, ['q', 'w', 'e', '!', 't', '$', '&']), 'New value 6');
		ok(space.test_1.item_4.sub_3.length === 7, 'New value 7');

		ok(old.item_1 === 1, 'Old value 1');
		ok(old.item_2 === 'test', 'Old value 2');
		ok(_.isEqual(old.item_3, [1, 2, 3, 4, 5]), 'Old value 3');
		ok(old.item_4.sub_1 === 2, 'Old value 4');
		ok(old.item_4.sub_2 === 'test 2', 'Old value 5');
		ok(old.item_4.sub_3[3] === 'r', 'Old value 6');
		ok(old.item_4.sub_3[5] === 'y', 'Old value 7');
		ok(old.item_4.sub_3[6] === undefined, 'Old value 8');
		ok(old.item_4.sub_3.length === 6, 'Old value 9');

		space.set('', {
			item_1: 1,
			item_2: 'test',
			item_3: [1, 2, 3, 4, 5],
			item_4: {
				sub_1: 2,
				sub_2: 'test 2',
				sub_3: ['q', 'w', 'e', 'r', 't', 'y']
			}
		});

		old = space.merge('', {
			item_1: 5,
			item_2: 'test',
			item_3: ['+', '-', '='],
			item_4: {
				sub_1: 6,
				sub_2: 'test 3',
				sub_3: {
					3: '!',
					5: '$',
					6: '&'
				}
			}
		});

		ok(space.item_1 === 5, 'New value 1');
		ok(space.item_2 === 'test', 'New value 2');
		ok(_.isEqual(space.item_3, ['+', '-', '=']), 'New value 3');
		ok(space.item_4.sub_1 === 6, 'New value 4');
		ok(space.item_4.sub_2 === 'test 3', 'New value 5');
		ok(_.isEqual(space.item_4.sub_3, ['q', 'w', 'e', '!', 't', '$', '&']), 'New value 6');
		ok(space.item_4.sub_3.length === 7, 'New value 7');

		ok(old.item_1 === 1, 'Old value 1');
		ok(old.item_2 === 'test', 'Old value 2');
		ok(_.isEqual(old.item_3, [1, 2, 3, 4, 5]), 'Old value 3');
		ok(old.item_4.sub_1 === 2, 'Old value 4');
		ok(old.item_4.sub_2 === 'test 2', 'Old value 5');
		ok(old.item_4.sub_3[3] === 'r', 'Old value 6');
		ok(old.item_4.sub_3[5] === 'y', 'Old value 7');
		ok(old.item_4.sub_3[6] === undefined, 'Old value 8');
		ok(old.item_4.sub_3.length === 6, 'Old value 9');
	});

	test('.splice(path, offset, remove, adds...)', function () {
		var old, space = new Attributes();

		space.set('test.array', ['q', 'w', 'e', 'r', 't', 'y']);

		old = space.splice('test.array', 2, 3, 'a', 's', 'd');

		ok(_.isEqual(space.test.array, ['q', 'w', 'a', 's', 'd', 'y']));
		ok(_.isEqual(old, {2: 'e', 3: 'r', 4: 't'}));
	});

	test('.remove(path, offset, remove)', function () {
		var old, space = new Attributes();

		space.set('test.array', ['q', 'w', 'e', 'r', 't', 'y']);

		old = space.splice('test.array', 1, 4);

		ok(_.isEqual(space.test.array, ['q', 'y']));
		ok(_.isEqual(old, {1: 'w', 2: 'e', 3: 'r', 4: 't'}));
	});

	test('.insert(path, offset, adds...)', function () {
		var old, space = new Attributes();

		space.set('test.array', ['q', 'w', 'e', 'r', 't', 'y']);

		old = space.insert('test.array', 4, 'a', 's', 'd');

		ok(_.isEqual(space.test.array, ['q', 'w', 'e', 'r', 'a', 's', 'd', 't', 'y']));
		ok(_.isEqual(old, {}));
	});

	test('.push(path, add)', function () {
		var old, space = new Attributes();

		space.set('test.array', ['q', 'w', 'e', 'r', 't', 'y']);

		old = space.push('test.array', 'a');

		ok(_.isEqual(space.test.array, ['q', 'w', 'e', 'r', 't', 'y', 'a']));
		ok(_.isEqual(old, {}));
	});

	test('.pop(path)', function () {
		var value, space = new Attributes();

		space.set('test.array', ['q', 'w', 'e', 'r', 't', 'y']);

		value = space.pop('test.array');

		ok(_.isEqual(space.test.array, ['q', 'w', 'e', 'r', 't']));
		ok(value === 'y');
	});

	test('.unshift(path, add)', function () {
		var old, space = new Attributes();

		space.set('test.array', ['q', 'w', 'e', 'r', 't', 'y']);

		old = space.unshift('test.array', 'a');

		ok(_.isEqual(space.test.array, ['a', 'q', 'w', 'e', 'r', 't', 'y']));
		ok(_.isEqual(old, {}));
	});

	test('.shift(path)', function () {
		var value, space = new Attributes();

		space.set('test.array', ['q', 'w', 'e', 'r', 't', 'y']);

		value = space.shift('test.array');

		ok(_.isEqual(space.test.array, ['w', 'e', 'r', 't', 'y']));
		ok(value === 'q');
	});

})(Anthill, _);
