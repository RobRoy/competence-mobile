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
  var localHandling = true; // switch this to enable legacy mode (old code) or when the backend is production ready

	if (!window.cordova && useLocalServer) {
    if (localHandling) {
      serverUrl = "http://competenceserver.dev";
    }
    else {
      serverUrl = "http://172.20.10.10:8084/competences";
    }
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

		_competencesUrl: function() {
      if (localHandling) {
        var url = new URI(serverUrl + "/competences/coursecontext?course="+this.context.get("course"));
      }
      else {
        var url = new URI(serverUrl + "/competences/coursecontext/selected/{course}");
        url.segment(this.context.get("course"))
				  .segment("all")
          .segment("nocache");
      }
			return url.toString();
		},
		
		fetch: function(options) {

			var options = options || {};
      console.log("foobar4");

			var result = {};
			var setResult = function(property) {
				return function(response) {
          console.log("foobar5");
          var data = JSON.parse(response);
					result[property] = data.competences;
				};
			};
      
			$.ajax({
				url: this._competencesUrl(),
				type: "GET",
				dataType: "json",
				success: setResult("competences")
			});

			this.trigger("sync");
      
			return undefined;
		}
	});
  
	return {
		Context: Context
	};
});