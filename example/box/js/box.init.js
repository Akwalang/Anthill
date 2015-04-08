
var lang, model, box;

(function (Ai, $) {


	lang = new Ai('Model', {
		title: 'Delete this blog?',
		confirm: 'For confirm enter word "yes" in text field:',
		cancel: 'Cancel',
		remove: 'Delete'
	});

	model = new Ai('Box.Model');

	var showBox = function (event) {
		event.preventDefault();

		console.time('## 1 -> Timer create');

		box = new Ai('Box.View', {
			model: model,
			lang: lang
		});

		console.timeEnd('## 1 -> Timer create');

		console.time('## 2 -> Timer insert');

		box.appendTo(document.body);

		console.timeEnd('## 2 -> Timer insert');

		box.show();
	};

	var init = function () {
		$('#delete').on('click', showBox);
	};

	$(init);

})(Anthill, jQuery);