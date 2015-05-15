
import $ from 'jquery';
import Handlebars from 'handlebars';
import director from 'director';

import * as util from './util';

const ENTER_KEY = 13;
const ESCAPE_KEY = 27;

export default class App {

	constructor() {
		this.todos = util.store('todos-jquery');
		this.cacheElements();
		this.bindEvents();

		director.Router({
			'/:filter': (filter) => {
				this.filter = filter;
				this.render();
			}
		}).init('/all');
	}

	cacheElements() {
		this.todoTemplate = Handlebars.compile($('#todo-template').html());
		this.footerTemplate = Handlebars.compile($('#footer-template').html());
		this.$todoApp = $('.todoapp');
		this.$header = this.$todoApp.find('.header');
		this.$main = this.$todoApp.find('.main');
		this.$footer = this.$todoApp.find('.footer');
		this.$newTodo = this.$header.find('.new-todo');
		this.$toggleAll = this.$main.find('.toggle-all');
		this.$todoList = this.$main.find('.todo-list');
		this.$count = this.$footer.find('.todo-count');
		this.$clearBtn = this.$footer.find('.clear-completed');
	}

	bindEvents() {
		var list = this.$todoList;
		this.$newTodo.on('keyup', (e)=> this.create(e));
		this.$toggleAll.on('change', (e)=> this.toggleAll(e));
		this.$footer.on('click', '.clear-completed', (e)=> this.destroyCompleted(e));
		list.on('change', '.toggle', (e)=> this.toggle(e));
		list.on('dblclick', 'label', (e)=> this.edit(e));
		list.on('keyup', '.edit', (e)=> this.editKeyup(e));
		list.on('focusout', '.edit', (e)=> this.update(e));
		list.on('click', '.destroy', (e)=> this.destroy(e));
	}

	render() {
		var todos = this.getFilteredTodos();
		this.$todoList.html(this.todoTemplate(todos));
		this.$main.toggle(todos.length > 0);
		this.$toggleAll.prop('checked', this.getActiveTodos().length === 0);
		this.renderFooter();
		this.$newTodo.focus();
		util.store('todos-jquery', this.todos);
	}

	renderFooter() {
		var todoCount = this.todos.length;
		var activeTodoCount = this.getActiveTodos().length;
		var template = this.footerTemplate({
			activeTodoCount: activeTodoCount,
			activeTodoWord: util.pluralize(activeTodoCount, 'item'),
			completedTodos: todoCount - activeTodoCount,
			filter: this.filter
		});

		this.$footer.toggle(todoCount > 0).html(template);
	}

	toggleAll(e) {
		var isChecked = $(e.target).prop('checked');

		this.todos.forEach((todo) => todo.completed = isChecked);

		this.render();
	}

	getActiveTodos() {
		return this.todos.filter((todo) => !todo.completed);
	}

	getCompletedTodos() {
		return this.todos.filter((todo) => todo.completed);
	}

	getFilteredTodos() {
		if (this.filter === 'active') {
			return this.getActiveTodos();
		}

		if (this.filter === 'completed') {
			return this.getCompletedTodos();
		}

		return this.todos;
	}

	destroyCompleted() {
		this.todos = this.getActiveTodos();
		this.filter = 'all';
		this.render();
	}

	// accepts an element from inside the `.item` div and
	// returns the corresponding index in the `todos` array
	indexFromEl(el) {
		var id = $(el).closest('li').data('id');
		var todos = this.todos;
		var i = todos.length;

		while (i--) {
			if (todos[i].id === id) {
				return i;
			}
		}
	}

	create(e) {
		var $input = $(e.target);
		var val = $input.val().trim();

		if (e.which !== ENTER_KEY || !val) {
			return;
		}

		this.todos.push({
			id: util.uuid(),
			title: val,
			completed: false
		});

		$input.val('');

		this.render();
	}

	toggle(e) {
		var i = this.indexFromEl(e.target);
		this.todos[i].completed = !this.todos[i].completed;
		this.render();
	}

	edit(e) {
		var $input = $(e.target).closest('li').addClass('editing').find('.edit');
		$input.val($input.val()).focus();
	}

	editKeyup(e) {
		if (e.which === ENTER_KEY) {
			e.target.blur();
		}

		if (e.which === ESCAPE_KEY) {
			$(e.target).data('abort', true).blur();
		}
	}

	update(e) {
		var el = e.target;
		var $el = $(el);
		var val = $el.val().trim();

		if ($el.data('abort')) {
			$el.data('abort', false);
			this.render();
			return;
		}

		var i = this.indexFromEl(el);

		if (val) {
			this.todos[i].title = val;
		} else {
			this.todos.splice(i, 1);
		}

		this.render();
	}

	destroy(e) {
		this.todos.splice(this.indexFromEl(e.target), 1);
		this.render();
	}

};

