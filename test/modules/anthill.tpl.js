
(function (Ai, TPL, $, _) {

	var Model = Ai('Model');

	QUnit.module('Template');

	var box = $('<div />', {id: 'mount-point'});

	// box.appendTo(document.body);

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

})(Anthill, Anthill.TPL, jQuery, _);
