define([
	'jquery',
	'underscore',
	'backbone',
	'utils',
	'moment',
	'Session',
	'underscore.string',
	'modules/competence.models',
	'cache',
	'hammerjs'
], function($, _, Backbone, utils, moment, Session, _str, Models){

	var CompetenceListView = Backbone.View.extend({

		initialize: function(options) {
			this.template = utils.rendertmpl("competence.list");

			this.parent = options.parent;
			this.listenTo(this.collection, "sync", this.render);
			this.listenTo(this.collection, "error", this.errorHappened);
		},

		errorHappened: function(a, b, c, d, e) {
		},

		render: function() {
			var competences = this.collection.filter(function(c) { return c.get("parent") == this.parent}, this);

			this.$el.html(this.template({competences: new Backbone.Collection(competences)}));
			this.$el.trigger("create");
			return this;
		}
	});

	var CompetenceView = Backbone.View.extend({

		events: {
			"submit": "submitCompetence"
		},

		initialize: function(options) {
			this.template = utils.rendertmpl("competence.item");
			this.page = options.page;

			_.bindAll(this, "render");

			this.listenTo(this.collection, "request", this.render);
			this.listenTo(this.collection, "sync", this.render);
		},

		submitCompetence: function(ev) {
			ev.preventDefault();

			var comment = this.$("#comment").val();
			var model = this.collection.find(function(competence) { return competence.get("name") === this.page}, this);

			model.set("comment", comment);
			model.save({
				success: _.bind(function() { this.collection.fetch(); }, this),
				error: function() { alert("Es ist ein Fehler aufgetreten."); }
			});
		},

		render: function() {
			var model = this.collection.find(function(competence) { return competence.get("name") === this.page}, this);
			this.$el.empty();
			if (model) {
				this.$el.append(this.template({competence: model}));
				new CompetenceListView({el: this.$(".subcompetences"), collection: this.collection, parent: model.get("name")}).render();
			} else {
				this.$el.append("<div>Wir warten noch auf Daten</div>");
			}
			this.$el.trigger("create");

			return this;
		}
	});

	var CompetenceOverviewPageView = Backbone.View.extend({

		attributes: {"id": "competenceOverview"},

		initialize: function(options) {
			this.template = utils.rendertmpl("competence.overview");
			this.page = options.page;

			this.collection = this._createCollection();
                        this.listenToOnce(this, "rendered", this.prepareData);
		},
                
                prepareData: function() {
                    new utils.LoadingView({collection: this.collection, el: this.$("#loadingSpinner")});
                    this.collection.fetch();
                },

		_createCollection: function() {
			var session = new Session();
			var username = session.get('up.session.username');
			var context = new Models.Context({username: username});
			return context.get("competences");
		},

		render: function() {
			this.$el.html(this.template({}));
			this.$el.trigger("create");
                        
			if (this.page) {
				var headerLink = this.$(".menubutton");
				headerLink.addClass("back");
				headerLink.removeClass("menubutton");
				headerLink.attr("href", "#competences");
				headerLink.attr("data-direction", "reverse");

				new CompetenceView({el: this.$("#competenceList"), collection: this.collection, page: this.page}).render();
			} else {
				new CompetenceListView({el: this.$("#competenceList"), collection: this.collection}).render();
			}
                        
                        this.trigger("rendered");
			return this;
		}
	});

	return {
		CompetenceOverviewPageView: CompetenceOverviewPageView
	};
});