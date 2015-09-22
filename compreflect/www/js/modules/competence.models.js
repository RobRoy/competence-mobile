define([
	'jquery',
	'underscore',
	'backbone',
	'utils',
	'moment',
	'Session',
	'underscore.string',
	'uri/URI',
	'cache',
	'hammerjs'
], function($, _, Backbone, utils, moment, Session, _str, URI){


	var serverUrl = "http://fleckenroller.cs.uni-potsdam.de/app/competence-servlet/competence/competences";
	var useLocalServer = true;

	if (!window.cordova && useLocalServer) {
		serverUrl = "http://localhost:8084/competences";
	}

	var evidence = {
		link: "https://github.com/ItsNotYou/Reflect.Competences",
		name: "Reflect.Competences"
	};

	var Context = Backbone.Model.extend({
		idAttribute: "name",

		initialize: function() {
			
                        this.session = new Session();
                        var courseId = this.session.get('up.session.courseId');
                        this.set("course", courseId);                        

			var competences = new Competences();
			competences.context = this;
			this.set("competences", competences);
		}
	});

	var Competence = Backbone.Model.extend({

		isCompletable: function() {
			var pres = this.get("prerequisites");
			var preTest = function(p) {
				var pre = this.collection.find(function(b) { b.get("name") == p; });
				return pre ? pre.get("isCompleted") : false;
			};
			return pres ? _.all(pres, preTest, this) : true;
		},

		_competenceCompletionUrl: function() {
			var url = new URI(serverUrl + "/json/link/create");
			url.segment(this.get("context").get("course"))
				.segment(this.get("context").get("username"))
				.segment("student")
				.segment(this.get("context").get("username"));
			url.search({
				competences: this.get("name"),
				//evidences: evidence.link + "," + evidence.name
                                evidences: evidence.name + "," + evidence.link
			});
			return url.toString();
		},

		_fetchCompetenceLink: function(competenceName, success, error) {
			var responseSuccess = function(response) {
				var evidences = response.mapUserCompetenceLinks[competenceName];
				var ev = _.find(evidences, function(ev) {
					return ev.evidenceTitel === evidence.link && ev.evidenceUrl === evidence.name;
				});

				if (ev) success(ev.abstractLinkId);
				else error();
			};

			$.ajax({
				url: new URI(serverUrl + "/json/link/overview").segment(this.get("context").get("username")).toString(),
				type: "GET",
				success: responseSuccess,
				error: error
			});
		},

		_commentSubmitUrl: function(abstractLinkId) {
			var url = new URI(serverUrl + "/json/link/comment");
			url.segment(abstractLinkId);
			url.segment(this.get("context").get("username"))
			url.segment(this.get("context").get("course"))
			url.segment("student");
			url.search({ text: this.get("comment") });
			return url.toString();
		},

		_wrapError: function(options) {
			var model = this;
		    var error = options.error;
		    return function(resp) {
				if (error) error(model, resp, options);
				model.trigger('error', model, resp, options);
			};
		},

		save: function(options) {
			var options = options || {};

			var saveComment = _.bind(function() {
				var saveCommentByLink = _.bind(function(abstractLinkId) {
					$.ajax({
						url: this._commentSubmitUrl(abstractLinkId),
						type: "POST",
						dataType: "text",
						success: _.bind(function() {
							if (options.success) options.success(this);
							this.trigger("sync");
						}, this),
						error: this._wrapError(options)
					});
				}, this);

				if (this.get("comment")) {
					this._fetchCompetenceLink(this.get("name"), saveCommentByLink, this._wrapError(options));
				}
			}, this);

			$.ajax({
				url: this._competenceCompletionUrl(),
				type: "POST",
				dataType: "text",
				success: saveComment,
				error: this._wrapError(options)
			});

			this.trigger("request");
			return undefined;
		}
	});

	var Competences = Backbone.Collection.extend({
		model: Competence,

		_triplesUrl: function() {
			var url = new URI(serverUrl + "/json/prerequisite/graph");
			url.segment(this.context.get("course"))
			return url.toString();
		},

		_competencesUrl: function() {
			var url = new URI(serverUrl + "/xml/competencetree/coursecontext/");
			url.segment(this.context.get("course"))
				.segment("all")
				.segment("nocache");
			return url.toString();
		},

		_achievementsUrl: function() {
			var url = new URI(serverUrl + "/json/link/overview");
			url.segment(this.context.get("username"));
			return url.toString();
		},

		_parseCompetences: function(response) {
			var competences = response.childNodes[0].childNodes[0].childNodes;

			var context = this.context;
			var parseCompetence = function(competence) {
				var result = {};
				result.name = competence.getAttribute("name");
				result.children = [];

				var childNodes = competence.childNodes;
				for (var count = 0; count < childNodes.length; count++) {
					var child = childNodes[count];
					if (child.nodeName === "isCompulsory") {
						result.isCompulsory = child.childNodes[0] === "true";
					} else if (child.nodeName === "competence") {
						result.children.push(parseCompetence(child));
					}
				}

				result.context = context;
				return result;
			};
			var nestedCompetences = _.map(competences, parseCompetence, this);

			var flattenCompetences = function(parent, competences) {
				return _.map(competences, function(competence) {
					competence.parent = parent;
					var result = flattenCompetences(competence.name, competence.children);
					competence.children = undefined;
					result.push(competence);
					return result;
				});
			};
			return _.flatten(flattenCompetences(undefined, nestedCompetences));
		},

		_parseTriples: function(response) {
			var triples = response.triples;
			var prerequisites = _.groupBy(triples, "toNode");
			return _.map(_.pairs(prerequisites), function(prerequisite) {
				return {
					name: prerequisite[0],
					prerequisites: _.pluck(prerequisite[1], "fromNode")
				};
			}, this);
		},

		_parseAchievements: function(response) {
			var achievements = response.mapUserCompetenceLinks;
			return _.map(_.keys(achievements), function(name) {
				return {name: name, isCompleted: true};
			});
		},

		_mergeByName: function(base, collection) {
			var equivalent = _.find(collection, function(item) { return item.name == base.name});
			return equivalent ? _.defaults(base, equivalent) : base;
		},

		_merge: function(achievements, triples, competences) {
			return _.map(competences, function(competence) {
				var result = this._mergeByName(competence, triples);
				return this._mergeByName(result, achievements);
			}, this);
		},

		fetch: function(options) {
			var options = options || {};

			// Wait for all three requests to finish before merging the results
			var syncGuard = _.after(3, _.bind(function() {
				// If a response is missing: go rampage
				var allResponses = result.achievements && result.triples && result.competences;
				if (!allResponses) {
					if (options.error) options.error(this, undefined, options);
					this.trigger('error', this, undefined, options);
					return;
				}

				// Otherwise: parse, merge and set
				var achievements = this._parseAchievements(result.achievements);
				var triples = this._parseTriples(result.triples);
				var competences = this._parseCompetences(result.competences);
				this.set(this._merge(achievements, triples, competences));

				if (options.success) options.success(this, undefined, options);
				this.trigger('sync', this, undefined, options);
			}, this));

			var result = {};
			var setResult = function(property) {
				return function(response) {
					result[property] = response;
					syncGuard();
				};
			};

			$.ajax({
				url: this._achievementsUrl(),
				type: "GET",
				success: setResult("achievements"),
				error: syncGuard
			});

			$.ajax({
				url: this._triplesUrl(),
				type: "GET",
				success: setResult("triples"),
				error: syncGuard
			});

			$.ajax({
				url: this._competencesUrl(),
				type: "GET",
				dataType: "xml",
				success: setResult("competences"),
				error: syncGuard
			});

			this.trigger("request");
			return undefined;
		}
	});

	/*var context = new Context({course: "2", username: "Franz"});
	var competence = new Competence({context: context, name: "Hörverstehen A2", comment: "Franz war hier"});
	competence.save({
		success: function() { console.log("success"); },
		error: function() { console.log("error"); }
	});*/

	return {
		Context: Context
	};
});