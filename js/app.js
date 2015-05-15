
import $ from 'jquery';
import Handlebars from 'handlebars';

import App from './todo-app';

$(()=> {

	Handlebars.registerHelper('eq', function(a, b, options) {
		return a === b ? options.fn(this) : options.inverse(this);
	});

	new App();
});
