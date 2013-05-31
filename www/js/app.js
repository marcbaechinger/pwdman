
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
		var that = this,
			container = $(this.selector);
			
		if (this.clicks) {
			$.each(this.clicks, function (selector, handler) {
				$(selector).click(function () {
					handler.apply(that, arguments);
				});
			});
		}
		
		if (this.fade) {
			container.bind("animationstart", function () {
				console.log("start");
			});
			container.bind("animationend", function () {
				console.log("end", container.css("z-index"));
				if (!that.isShown) {
					console.log("remove");
					container.removeClass("fadein").removeClass("fadeout");
				}
			});
		}
	};
	Controller.prototype.show = function () {
		if (this.fade) {
			$(this.selector)
				.addClass("fadein");
		} else {
			$(this.selector).show();
		}
		this.isShown = true;
	};
	Controller.prototype.hide = function () {
		if (this.fade) {
			$(this.selector)
				.addClass("fadeout");
		} else {
			$(this.selector).hide();
		}
		this.isShown = false;
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
			siteListController = new Controller({
				selector: "#sites",
				targetSelector: "#site",
				fade: true,
				clicks: {
					"ul": function (ev) {
						var label = $(ev.target).closest("li").find("p").text();
						$(this.targetSelector).val(label);
						this.hide();
					},
					".cancel-list": function () {
						this.hide();
					}
				}
			}),
			getSecret = function () {
				if (!secret) {
					secret = prompt(document.webL10n.get("alert-enter-secret"));
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
				var cover = $(".password-cover"),
					coverTimeout;
				$(".password-area, p.password-cover", detail).click(function (e) {
					if (!cover.hasClass("show")) {
						coverTimeout = setTimeout(function () {
							cover.removeClass("show");
							coverTimeout = undefined;
						}, 5000);
						cover.addClass("show");	
					} else {
						clearTimeout(coverTimeout);
						coverTimeout = undefined;
						cover.removeClass("show");	
					}
				});
				
				$("#site-chooser", edit).click(function () {
					siteListController.show();
				});
	
			    $('button.update', edit).click(function() {
			    	selectedItem.set("title", el.find('input[name=site]').val());
			    	selectedItem.set("user", el.find('input[name=user]').val());
			    	selectedItem.set("password", el.find('input[name=password]').val());
			    });
				
			    $('button.add', list).click(function() {
			    	selectedItem = undefined;
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
						dataToStore;
					
					if (!selectedItem) {
						dataToStore = list.collection.toJSON();
						dataToStore.push(uiInputData);
					} else {
						selectedItem.attributes.title = el.find('input[name=site]').val();
			    		selectedItem.attributes.user = el.find('input[name=user]').val();
			    		selectedItem.attributes.password = el.find('input[name=password]').val();
						dataToStore = list.collection.toJSON();
					}

					storeData(dataToStore,
						function success () {
					        if(model) {
					            model.set(uiInputData);
					        } else {
					            list.add(uiInputData);
					        }
					        edit.close();
							$(detail).find("h1").text(uiInputData.title);
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
									alert(document.webL10n.get("alert-storing-failed"));
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