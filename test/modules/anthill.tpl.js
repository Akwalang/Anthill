
(function (Ai, TPL, $, _) {

	var Model = Ai('Model');

	QUnit.module('Template');

	var box = $('<div />', {id: 'mount-point'});

	box.appendTo(document.body);

	var create = function (html, data) {
		var tpl = new TPL(html);

		return tpl(data);
	};

	test('print [short]', function () {
		var results, model, html, tpl;
		
		results = [];

		model = new Model({
			text: 'Test text 1'
		});

		html = [
			'<div class="binded">',
				'{{model#text}}',
			'</div>',
			'<div class="unbinded">',
				'{{model.text}}',
			'</div>'
		].join('');


		tpl = create(html, {model: model});

		tpl.appendTo(box);

		results[0] = box.find('.binded').text() === 'Test text 1';
		results[1] = box.find('.unbinded').text() === 'Test text 1';

		model.set('text', 'New text string');

		results[2] = box.find('.binded').text() === 'New text string';
		results[3] = box.find('.unbinded').text() === 'Test text 1';

		tpl.hide();

		ok(_.every(results), '[' + results.join(', ') + ']');
	});

	test('print', function () {
		var results, model, html, tpl;

		results = [];

		model = new Model({
			text: 'Test text 1'
		});

		html = [
			'<div class="binded">',
				'{{print "Test: {model#text}"}}',
			'</div>',
			'<div class="unbinded">',
				'{{print "Test: {model.text}"}}',
			'</div>'
		].join('');


		tpl = create(html, {model: model});

		tpl.appendTo(box);

		results[0] = box.find('.binded').text() === 'Test: Test text 1';
		results[1] = box.find('.unbinded').text() === 'Test: Test text 1';

		model.set('text', 'New text string');

		results[2] = box.find('.binded').text() === 'Test: New text string';
		results[3] = box.find('.unbinded').text() === 'Test: Test text 1';

		tpl.hide();

		ok(_.every(results), '[' + results.join(', ') + ']');


		results = [];

		model = new Model({
			bool: true
		});

		html = [
			'<div class="binded">',
				'{{print "`{model#bool} ? \'It is true\' : \'It is false\'`"}}',
			'</div>',
			'<div class="unbinded">',
				'{{print "`{model.bool} ? \'It is true\' : \'It is false\'`"}}',
			'</div>'
		].join('');


		tpl = create(html, {model: model});

		tpl.appendTo(box);

		results[0] = box.find('.binded').text() === 'It is true';
		results[1] = box.find('.unbinded').text() === 'It is true';

		model.set('bool', false);

		results[2] = box.find('.binded').text() === 'It is false';
		results[3] = box.find('.unbinded').text() === 'It is true';

		tpl.hide();

		ok(_.every(results), '[' + results.join(', ') + ']');
	});

	test('if elseif else', function () {
		var results, model, html, tpl;
		
		results = [];

		model = new Model({
			swither: 0
		});

		html = [
			'{{#if "{model#swither} === 0"}}',
				'Block 0',
			'{{elseif "{model#swither} === 1"}}',
				'Block 1',
			'{{elseif "{model#swither} === 2"}}',
				'Block 2',
			'{{else}}',
				'Block 3',
			'{{/if}}'
		].join('');

		tpl = create(html, {model: model});

		tpl.appendTo(box);

		results[0] = box.text() === 'Block 0';

		model.set('swither', 1);

		results[1] = box.text() === 'Block 1';

		model.set('swither', 2);

		results[2] = box.text() === 'Block 2';

		model.set('swither', 100);

		results[3] = box.text() === 'Block 3';

		model.set('swither', 1);

		results[4] = box.text() === 'Block 1';

		model.set('swither', 2);

		results[5] = box.text() === 'Block 2';

		model.set('swither', 0);

		results[6] = box.text() === 'Block 0';

		model.set('swither', 2);

		results[7] = box.text() === 'Block 2';

		model.set('swither', 1000);

		results[8] = box.text() === 'Block 3';

		tpl.hide();

		ok(_.every(results), '[' + results.join(', ') + ']');
	});

})(Anthill, Anthill.TPL, jQuery, _);
