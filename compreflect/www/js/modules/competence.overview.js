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
	'hammerjs',
  'circliful'
], function($, _, Backbone, utils, moment, Session, _str, Models, Circliful){
  
  var SelectableCompetences = Backbone.Collection.extend({
      url: function () {

          this.session = new Session();		
          var compcontext = this.session.get('up.session.compcontext');
          
          var serverUrl = "http://localhost:8084";  // this needs to be a URL to a production server once done
          
          // Debug & Dev Switches
          var useLocalServer = true;
          var localHandling = true; // switch this to enable legacy mode (old code) or when the backend is production ready

          if (!window.cordova && useLocalServer) {
            if (localHandling) {
              serverUrl = "http://competenceserver.dev";
            }
            else {
              serverUrl = "http://localhost:8084";
            }
          }
          console.log(compcontext);
          switch (compcontext) {
            case "coursecompetences":
              if (localHandling) {
                serverUrl = serverUrl+"/competences/coursecontext?course="+this.session.get('up.session.courseId');
              }
              else {
                var url = new URI(serverUrl + "/competences/coursecontext/selected/{course}");
                url.segment(this.session.get('up.session.courseId'))
        				  .segment("all")
                  .segment("nocache");
              }
              break;
            case "mycompetences":
              if (localHandling) {
                serverUrl = serverUrl+"/competences/coursecontext?course="+this.session.get('up.session.courseId');
              }
              else {
                var url = new URI(serverUrl + "/competences/coursecontext/selected/{course}");
                url.segment(this.session.get('up.session.courseId'))
        				  .segment("all")
                  .segment("nocache");
              }
              break;
            case "mycompetencepaths":
              if (localHandling) {
                serverUrl = serverUrl+"/competences/coursecontext?course="+this.session.get('up.session.courseId');
              }
              else {
                var url = new URI(serverUrl + "/competences/coursecontext/selected/{course}");
                url.segment(this.session.get('up.session.courseId'))
        				  .segment("all")
                  .segment("nocache");
              }
              break;
            default:
              break;
          }
          console.log(serverUrl);
          return serverUrl;
          
      },
      parse: function(data) {
        var parsedData = JSON.parse(data);
        return parsedData.competences;
      }
  });

  var CompetencesListView = Backbone.View.extend({
      initialize: function () {
          this.template = utils.rendertmpl("competence.list");
          this.listenTo(this.collection, "sync error", this.render);
          this.collection.fetch();
      },
      render: function () {
          this.$el.empty();
          this.$el.append(this.template({competences: this.collection}));
          this.$el.trigger("create");
      }
  });

  var CompetenceOverviewPageView = Backbone.View.extend({
      attributes: {"id": "competenceOverview"},
      events : {'submit': 'newCompetence'},
      initialize: function (options) {
          this.session = new Session();
          this.template = utils.rendertmpl("competence.overview");
          this.session.set("up.session.compcontext", options.page);
      },
      
      render: function () {
          this.$el.html(this.template({}));
          this.$el.trigger("create");

          new CompetencesListView({el: this.$("#competenceList"), collection: new SelectableCompetences()});

          return this;
      },
      newCompetence: function (event) {
        event.preventDefault();
        console.log("new competence");
      }
  });

  return CompetenceOverviewPageView;  

;
});