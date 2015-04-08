
Ai('Box.View', (function () {

	var tpl = [
		'<div class="overlay" ai:click="{view.close}">',
		'</div>',
		'<div class="box">',
			'<div class="title">',
				'<div class="icon" ai:class="{model#type}" ai:click="{model.changeType}">',
				'</div>',
				'<div class="name">',
					'{{lang#title}}',
				'</div>',
				'<a href="#" class="btn close" ai:click="{view.close}">',
				'</a>',
			'</div>',
			'<div class="body">',
				'<div class="indent">',
					'<div class="description">',
						'{{lang#confirm}}',
					'</div>',
					'<div class="field">',
						'<input type="text" ai:bind-value="{model#confirm}" />',
					'</div>',
				'</div>',
			'</div>',
			'<div class="footer">',
				'<div class="indent">',
					'<ul>',
						'<li>',
							'<a href="#" class="btn btn-default" ai:click="{view.close}">{{lang#cancel}}</a>',
						'</li>',
						'{{#if "{model#confirm} === {model.confirm}"}}',
							'<li>',
								'<a href="#" ai:class="\'btn btn-\' + {model#type}" ai:click="{view.delete}">{{lang#remove}}</a>',
							'</li>',
						'{{/if}}',
					'</ul>',
				'</div>',
			'</div>',
		'</div>'
	].join('');

	var ext = {};

	ext.extend = 'View';

	console.time('Timer compile');

	ext.tpl = new Ai.TPL(tpl);

	console.timeEnd('Timer compile');

	ext.dataMixin = function () {
		return {
			lang: this.options.lang
		};
	};

	ext['delete'] = function (event) {
		event.preventDefault();

		console.log('Delete!!!');

		this.close(true);
	};

	ext.show = function () {
		document.body.clientHeight;

		$(this.liveDOM.subdom.childs[1]).css({
			opacity: 1,
			transform: 'scale(1)'
		});

		$(this.liveDOM.subdom.childs[0]).css({opacity: 0.6});

		this.wrapper.css({transform: 'scale(0.95)'});
	};

	ext.close = function (event) {
		event instanceof $.Event && event.preventDefault();

		var self = this;

		$(this.liveDOM.subdom.childs[1]).css({
			opacity: 0,
			transform: 'scale(1.2)'
		});

		$(this.liveDOM.subdom.childs[0]).css({opacity: 0});

		this.wrapper.css({transform: ''});

		setTimeout(function () {
			self.remove();
		
			event === true && this.model.unset('confirm');
		}, 400);
	};

	ext.initialize = function () {
		_.bindAll(this, 'close', 'delete', 'remove');

		this.wrapper = $('#wrapper');
	};

	return ext;
})());
