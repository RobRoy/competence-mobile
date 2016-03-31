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
      serverUrl = "http://172.20.10.10:8084/competences";
    }
	}
  
	app.models.Competence = Backbone.Model.extend({
		url: 'http://competenceserver.dev',
		initialize: function(options){
      var options = options || {};
      this.session = new Session();
      this.url = this.url + "/competence?id="+options.id+"&title="+options.competence;
      this.completed = this._getCompletion(options);
		},
    parse: function(data){
      var parsedData = JSON.parse(data);
      return parsedData;
    },

    save: function(options) {
      var options = options || {};
      console.log(options.test);
      return true;
    },
    
    _getCompletion: function(options) {
      var completed = false;
      var completionURL = "http://competenceserver.dev/competence/user?id="+options.id+"&user="+this.session.get('up.session.username')+"@uni-potsdam.de";
			$.ajax({
				url: completionURL,
				type: "GET",
				dataType: "json",
        success: function(data) {
          console.log(data);
          var parsedData = JSON.parse(data);
        }
			});
      return completed;
    }
	});
	
	var UserCompetences = Backbone.Collection.extend({
    url: function () {

        this.session = new Session();		
        var user = this.session.get('up.session.username');
        
        var serverUrl = "http://172.20.10.10:8084";  // this needs to be a URL to a production server once done
        
        // Debug & Dev Switches
        var useLocalServer = true;
        var localHandling = false; // switch this to enable legacy mode (old code) or when the backend is production ready

        if (!window.cordova && useLocalServer) {
          if (localHandling) {
            serverUrl = "http://competenceserver.dev";
          }
          else {
            serverUrl = "http://172.20.10.10:8084";
          }
        }
        
        if (localHandling) {
          serverUrl = serverUrl+"/competences/link/overview/?user="+user;
        }
        else {
					serverUrl = serverUrl+"/competences/link/overview/"+user+"/";
				}
        
        return serverUrl;
        
    },
		
		
		
	});
  
  
  var CompetenceTree = Backbone.Collection.extend({
      url: function () {

          this.session = new Session();		
          var compcontext = this.session.get('up.session.competenceName');
          
          var serverUrl = "http://172.20.10.10:8084";  // this needs to be a URL to a production server once done
          
          // Debug & Dev Switches
          var useLocalServer = true;
          var localHandling = false; // switch this to enable legacy mode (old code) or when the backend is production ready

          if (!window.cordova && useLocalServer) {
            if (localHandling) {
              serverUrl = "http://competenceserver.dev";
            }
            else {
              serverUrl = "http://172.20.10.10:8084";
            }
          }
          
          if (localHandling) {
            serverUrl = serverUrl+"/competences/coursecontext?course="+this.session.get('up.session.courseId');
          }
          else {
						serverUrl = serverUrl+"/competences/competencetree/"+this.session.get('up.session.courseId')+"/";
					}
          
          return serverUrl;
          
      },
			
      parse: function(data) {
				var context = this.session.get("up.session.compcontext");
				var currentCompetence = this.session.get('up.session.competenceName');
				
				if (context == "compview") {
					var parsedCompetences = data[0].competence;
					// _.each(competenceTree,function(competence) {
					// 	if (competence.name == currentCompetence) {
					// 		var parsedCompetences = competence[0];
					// 	}
					// });
				}
				else if (context == "suggestions") {
					var parsedCompetences = data[0];
				}
				else {
					var parsedCompetences = data;
					console.log("Error. Unkown context.");
				}
        return parsedCompetences;
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