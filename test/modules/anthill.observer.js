
(function (Ai, _) {

	var Observer = Ai({mixins: ['Observer']});

	QUnit.module('Observer');

	test('.on(type, [name], callback)', function () {
		var result_1 = false,
			result_2 = false,
			rabbit = new Observer();

		var callback_1 = function () {
			result_1 = !result_1;
		};

		var callback_2 = function () {
			result_2 = !result_2;
		};

		rabbit.on('run', callback_1);
		rabbit.trigger('run');

		rabbit.on('run', 'forest', callback_2);
		rabbit.trigger('run', 'forest');

		ok(result_1, 'Only type');
		ok(result_2, 'Type and name');
	});

	test('.off(type, [name], [callback])', function () {
		var result_1 = true,
			result_2 = true,
			result_3 = true,
			result_4 = true,
			rabbit = new Observer();

		var callback_1 = function () {
			result_1 = !result_1;
		};

		var callback_2 = function () {
			result_2 = !result_2;
		};

		var callback_3 = function () {
			result_3 = !result_3;
		};

		var callback_4 = function () {
			result_4 = !result_4;
		};

		rabbit.on('run', callback_1);
		rabbit.off('run', callback_1);
		rabbit.trigger('run');

		rabbit.on('run', 'forest', callback_2);
		rabbit.off('run', 'forest', callback_2);
		rabbit.trigger('run', 'forest');

		rabbit.on('run', callback_3);
		rabbit.off('run');
		rabbit.trigger('run');

		rabbit.on('run', 'forest', callback_4);
		rabbit.off('run', 'forest');
		rabbit.trigger('run', 'forest');

		ok(result_1, 'Type and callback');
		ok(result_2, 'Type, name and callback');
		ok(result_3, 'Only type');
		ok(result_4, 'Type and name');
	});

	test('.trigger(type, [name], [params])', function () {
		var result_1 = false,
			result_2 = false,
			rabbit = new Observer();

		var callback_1 = function (arg_1, arg_2) {
			result_1 = arg_1 === 'qwerty' && arg_2 === 15;
		};

		var callback_2 = function (arg_1, arg_2) {
			result_2 = arg_1 === 'asd' && arg_2 === 25;
		};

		rabbit.on('run', callback_1);
		rabbit.trigger('run', ['qwerty', 15]);

		rabbit.on('run', 'forest', callback_2);
		rabbit.trigger('run', 'forest', ['asd', 25]);

		ok(result_1, 'Only type');
		ok(result_2, 'Type and name');
	});

})(Anthill, _);
