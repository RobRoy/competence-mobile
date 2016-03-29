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
	'hammerjs',
  'circliful'
], function($, _, Backbone, utils, moment, Session, _str, URI, Circliful){


	var serverUrl = "http://fleckenroller.cs.uni-potsdam.de/app/competence-servlet/competence/competences"; // this needs to be a URL to a production server once done
  
  // Debug and Dev switches
	var useLocalServer = true;
  var localHandling = true; // switch this to enable legacy mode (old code) or when the backend is production ready

	if (!window.cordova && useLocalServer) {
    if (localHandling) {
      serverUrl = "http://competenceserver.dev";
    }
    else {
      serverUrl = "http://localhost:8084/competences";
    }
	}
  
	app.models.Competence = Backbone.Model.extend({
		url: 'http://competenceserver.dev',
		initialize: function(options){
      var options = options || {};
      this.url = this.url + "/competence?id="+options.id+"&title="+options.competence;
      this.completed = _
		},
    parse: function(data){
      var parsedData = JSON.parse(data);
      console.log(parsedData);
      return parsedData;
    },

    save: function(options) {
      var options = options || {};
      console.log(options.test);
      return true;
    }
	});
  
  
  var CompetenceTree = Backbone.Collection.extend({
      url: function () {

          this.session = new Session();		
          var compcontext = this.session.get('up.session.competenceName');
          
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
          
          if (localHandling) {
            serverUrl = serverUrl+"/competences/coursecontext?course="+this.session.get('up.session.courseId');
          }
          else {
            var url = new URI(serverUrl + "/competences/coursecontext/selected/{course}");
            url.segment(this.session.get('up.session.courseId'))
    				  .segment("all")
              .segment("nocache");
          }
          
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
  
  var CompetenceView = Backbone.View.extend({
    
    attributes: {"id": "competenceView"},
    events : {'submit': 'saveCompetence'},
    
    initialize: function (options) {
        this.session = new Session();
        this.session.set("up.session.compcontext", "compview");
        this.template = utils.rendertmpl("competence.view");
        _.bindAll(this, 'render');
  			this.model = new app.models.Competence(options);
        this.model.fetch(utils.cacheDefaults({
          success: this.render,
          error: function(event){
            console.log(event);
          },
          dataType: 'json'
        }));
    },
    
    render: function () {
      this.$el.html(this.template({competence: this.model}));
      this.$el.trigger("create");
      this.$el.trigger("circle");      
      
      new CompetencesListView({el: this.$("#competenceTree"), collection: new CompetenceTree()});
      
      this.$("#compcircle").circliful({
        animationStep: 5,
        foregroundBorderWidth: 5,
        backgroundBorderWidth: 15,
        percent: 100
      });
      
      return this;
    },
    
    saveCompetence: function (event) {
      event.preventDefault();
      this.model.save({"test":"testfoo"});
    }
  });

  return CompetenceView;  


});