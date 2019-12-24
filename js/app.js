  'use strict';
  var ENTER_KEY = 13;
  var newTodoDom = document.getElementById('new-todo');
  var syncDom = document.getElementById('sync-wrapper');

  //TODO this state should be changed for a pouchdb database

  var db = new PouchDB('todos');


  //TODO add db.changes(...) and a function databaseChangeEvent that gets
  //everything from the database and redraws the UI

  db.changes({
    since: 'now',
    live: true
  }).on('change', databaseChangeEvent);

  async function databaseChangeEvent(){
    try{
      var doc = await db.allDocs({include_docs: true, descending: true});
      var todos = doc.rows.map(function(item,index){
        return item.doc;
      });
      redrawTodosUI(todos);
    } catch(err) {
      console.log(err);
    }
  }
  
  //TODO add remote couchdb database and sync function
  var remoteCouch = 'http://localhost:5984/todos_remote';

  function sync() {
    syncDom.setAttribute('data-sync-state', 'syncing');
    var opts = {live: true, retry : true};
    db.replicate.to(remoteCouch, opts, syncError);
    db.replicate.from(remoteCouch, opts, syncError);
  }

  function syncError(){
    syncDom.setAttribute('data-sync-state', 'error');
  }

  //-------------STATE modifiers, create, edit, delete todo

  // We have to create a new todo document and enter it in the database
  async function addTodo(text) {
    var todo = {
      _id: new Date().toISOString(),
      title: text,
      completed: false
    };
    try{
      let result = await db.put(todo);
      console.log('Successfully posted a todo!' + result.id + " " + result.rev);
    } catch(err){
      console.log(err);
    }
    //TODO instead of pushing to the state, add the todo to the database
    //also remove the redrawTodosUI, because with pouchdb the app redraws itself when there is a database change
  }

  //edit Todo. This is not necessary because todo is passed as reference and so when we modify
  //it  in the calling method it is modified in the state
  async function editTodo(todo){
    await db.put(todo);
  }

  // User pressed the delete button for a todo, delete it
  async function deleteTodo(todo) {
    await db.remove(todo);
  }

  //------------- EVENTS HANDLERS

  function checkboxChanged(todo, event) {
    todo.completed = event.target.checked;
    editTodo(todo);
  }

  // The input box when editing a todo has blurred (lost focus),
  // so save the new title or delete the todo if the title is empty
  function todoBlurred(todo, event) {
    var trimmedText = event.target.value.trim();
    if (!trimmedText) {
      deleteTodo(todo);
    } else {
      todo.title = trimmedText;
      editTodo(todo);
    }
  }

  function newTodoKeyPressHandler( event ) {
    if (event.keyCode === ENTER_KEY) {
      addTodo(newTodoDom.value);
      newTodoDom.value = '';
    }
  }

  function deleteButtonPressed(todo){
    deleteTodo(todo);
  }

  // User has double clicked a todo, display an input so they can edit the title
  function todoDblClicked(todo) {
    var div = document.getElementById('li_' + todo._id);
    var inputEditTodo = document.getElementById('input_' + todo._id);
    div.className = 'editing';
    inputEditTodo.focus();
  }

  // If they press enter while editing an entry, blur it to trigger save (or delete)
  function todoKeyPressed(todo, event) {
    if (event.keyCode === ENTER_KEY) {
      var inputEditTodo = document.getElementById('input_' + todo._id);
      inputEditTodo.blur();
    }
  }

  //------------- UI FUNCTIONS

  function redrawTodosUI(todos) {
    var ul = document.getElementById('todo-list');
    ul.innerHTML = '';
    todos.forEach(function(todo) {
      ul.appendChild(createTodoListItem(todo));
    });
  }

  // Given an object representing a todo, this will create a list item
  // to display it.
  function createTodoListItem(todo) {
    var checkbox = document.createElement('input');
    checkbox.className = 'toggle';
    checkbox.type = 'checkbox';
    checkbox.addEventListener('change', checkboxChanged.bind(this, todo));

    var label = document.createElement('label');
    label.appendChild( document.createTextNode(todo.title));
    label.addEventListener('dblclick', todoDblClicked.bind(this, todo));

    var deleteLink = document.createElement('button');
    deleteLink.className = 'destroy';
    deleteLink.addEventListener( 'click', deleteButtonPressed.bind(this, todo));

    var divDisplay = document.createElement('div');
    divDisplay.className = 'view';
    divDisplay.appendChild(checkbox);
    divDisplay.appendChild(label);
    divDisplay.appendChild(deleteLink);

    var inputEditTodo = document.createElement('input');
    inputEditTodo.id = 'input_' + todo._id;
    inputEditTodo.className = 'edit';
    inputEditTodo.value = todo.title;
    inputEditTodo.addEventListener('keypress', todoKeyPressed.bind(this, todo));
    inputEditTodo.addEventListener('blur', todoBlurred.bind(this, todo));

    var li = document.createElement('li');
    li.id = 'li_' + todo._id;
    li.appendChild(divDisplay);
    li.appendChild(inputEditTodo);

    if (todo.completed) {
      li.className += 'complete';
      checkbox.checked = true;
    }

    return li;
  }

  function addEventListeners() {
    newTodoDom.addEventListener('keypress', newTodoKeyPressHandler, false);
  }

  //------------- START EVERYTHING WHEN DOM READY
  document.addEventListener('DOMContentLoaded', (event) => {
    //the event occurred
    addEventListeners();

    //TODO add a call to sync method if remotedb exist
    if (remoteCouch){
      sync();
    }
  });
