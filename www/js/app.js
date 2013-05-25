
// This uses require.js to structure javascript:
// http://requirejs.org/docs/api.html#define

define(function(require) {
    // Receipt verification (https://github.com/mozilla/receiptverifier)
    require('receiptverifier');

    // Installation button
    require('./install-button');

    // Install the layouts
    require('layouts/layouts');
	
	var Controller = function (spec) {
		if (spec) {
			$.extend(this, spec);
			this.initEvents();
			this.init();
		}
	};
	Controller.prototype.init = function () {},
	Controller.prototype.initEvents = function() {
		var that = this;
		if (this.clicks) {
			$.each(this.clicks, function (selector, handler) {
				$(selector).click(function () {
					handler.apply(that, arguments);
				});
			});
		}
	};
	

    // Write your app here.
	var Application = function ($, spec) {

		Controller.call(this, spec);
		
		var secret,
			selectedItem,
			list = $('.list').get(0),
			detail = $('.detail').get(0),
			edit = $('.edit').get(0),
			storeButton = $("#store-btn"),
			getSecret = function () {
				if (!secret) {
					secret = prompt("Enter secret for encryption");
				}
				return secret;
			},
			loadData = function (collection) {
				var i, storedData;
				if (localStorage.passwords) {
					console.log("loadData: encrypted password data available in localstore");
					try {
						storedData = JSON.parse(sjcl.decrypt(getSecret(), localStorage.passwords));
					} catch (e) {
						
						alert(document.webL10n.get("alert-decryption-failed"));
						secret = undefined;
						loadData(collection);
						return;
					}
					for (i = 0; i < storedData.length; i++) {
						collection.add(storedData[i]);
					}
				}
			},
			storeData = function (data, callback, error) {
				var textRepresentation = JSON.stringify(data),
					encryptedRepresentation = sjcl.encrypt(getSecret(), textRepresentation);
				
					if (localStorage.passwords) {
						try {
							sjcl.decrypt(getSecret(), localStorage.passwords);
						} catch (e) {
							error(e);
							return;
						}
					}
					localStorage.passwords = encryptedRepresentation;
					callback(data);
			},
			initViews = function () {
			    detail.render = function(item) {
					selectedItem = item;
			        $('.user', this).html(item.get('user'));
			        $('.password', this).text(item.get('password'));
			    };
			    edit.render = function(item) {
			        item = item || { id: '', get: function() { return ''; } };
			        $('input[name=site]', this).val(item.get('title'));
			        $('input[name=user]', this).val(item.get('user'));
			        $('input[name=password]', this).val(item.get('password'));
					storeButton.text(document.webL10n.get("button-save"));
			    };
			    edit.getTitle = function() {
			        var model = this.view.model;
			        if(model) {
			            return model.get('title');
			        } else {
			            return document.webL10n.get("header-new");
			        }
			    };
			},
			initEventHandling = function () {
				$("p.password", detail).click(function (e) {
					var target = $(e.target);
					target.addClass("password-unveiled");
					setTimeout(function () {
						target.removeClass("password-unveiled");
					}, 10 * 1000);
				});
	
			    $('button.add', edit).click(function() {
			        var el = $(edit),
						model = edit.model,
						title = el.find('input[name=site]'),
						user = el.find('input[name=user]'),
						pwd = el.find('input[name=password]'),
						uiInputData = {
							title: title.val(),
							user: user.val(),
							password: pwd.val()
						},
						dataToStore = list.collection.toJSON();
				
					dataToStore.push(uiInputData);
					storeData(dataToStore,
						function success () {
					        if(model) {
					            model.set(uiInputData);
					        } else {
					            list.add(uiInputData);
					        }
					        edit.close();
						},
						function error () {
							alert(document.webL10n.get("alert-storing-failed"));
			            	secret = undefined;
						}
					);
			    });

			    $('button.delete', detail).click(function() {
					var title = selectedItem.get("title"), item, i;
		
					for (i = 0; i < list.collection.length; i++) {
						item = list.collection.at(i);
						if (item.get("title") === title) {
							list.collection.remove(item);
							storeData(list.collection.toJSON(), 
								function success () {
							        detail.close();
									list.view.render();
								}, 
								function error () {
									alert(document.webL10n.get("alert-storing-failed")
									secret = undefined;
								}
							);
							break;
						}
					}
			    });
			};
    
		this.dropSecret = function () {
			secret = undefined;
		};
		loadData(list.collection);
		initViews();
		initEventHandling();
	};
	Application.prototype = new Controller();
	
	
	new Application($, {
		clicks: {
			"button.dropSecret": function () {
				this.dropSecret();
				alert(document.webL10n.get("alert-secret-dropped"));
			},
			"button.delete": function () {
				
			}
		}
	});
	
});