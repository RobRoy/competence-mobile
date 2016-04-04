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
          var user = this.session.get('up.session.username');
          
          var serverUrl = "http://localhost:8084";  // this needs to be a URL to a production server once done
          
          // Debug & Dev Switches
          var useLocalServer = true;
          var localHandling = false; // switch this to enable legacy mode (old code) or when the backend is production ready

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
                serverUrl = serverUrl+"/competences/SuggestedCompetencesForCourse/"+this.session.get('up.session.courseId')+"/";
              }
              break;
            case "mycompetences":
              if (localHandling) {
                serverUrl = "/js/json/user_dummy_competences.json";
              }
              else {
                // for productivity switch the URLs
                //serverUrl = serverUrl+"/competences/link/overview/"+user+"/";
                serverUrl = "/js/json/user_dummy_competences.json";
              }
              break;
            case "mycompetencepaths":
              if (localHandling) {
                serverUrl = "/js/json/user_dummy_competences.json";
              }
              else {
                // for productivity switch the URLs
                //serverUrl = serverUrl+"/competences/link/overview/"+user+"/";
                serverUrl = "/js/json/user_dummy_competences.json";
              }
              break;
            default:
              console.log("Error: Undefined context.");
              break;
          }
          return serverUrl;
          
      },
			parse: function (competences) {
        this.session = new Session();		        
        var compcontext = this.session.get('up.session.compcontext');
        switch (compcontext) {
        case "coursecompetences":
          var parsedCompetence = _.map(competences, function (n) {
            return {name: n};
          });
          break;
        case "mycompetences":
          var parsedCompetence = _.map(competences.mapUserCompetenceLinks, function (competenceData, competenceName) {
            return {name: competenceName};
          });
          break;
        case "mycompetencepaths":
          var parsedCompetence = _.map(competences.mapUserCompetenceLinks, function (competenceData, competenceName) {
            return {name: competenceName};
          });
          break;        
        default:
          console.log("Error: Undefined context.");
          break;
        }        
        return parsedCompetence;
      }
  });

  var CompetencesListView = Backbone.View.extend({
      initialize: function () {
        this.session = new Session();
        console.log(this.session.get("up.session.compcontext"));
        switch (this.session.get("up.session.compcontext")) {
        case "coursecompetences":
          this.template = utils.rendertmpl("coursecompetences.list");
          break;
        case "mycompetences":
          this.template = utils.rendertmpl("mycompetences.list");
          break;
        case "mycompetencepaths":
          this.template = utils.rendertmpl("mycompetences.list");
          break;
        default:
          this.template = utils.rendertmpl("competences.list");
        }
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
      
      createEvidenceComment: function(competenceString, courseId) {
        that = this;
        
        var user = this.session.get('up.session.username');
        var competenceComment = $("#competencecomment").val();

        var serverUrl = "http://localhost:8084";
        
        var linkId = competenceString+"von student";
        var evidenceLinkUrl = serverUrl + "/competences/link/comment/"+linkId+"/"+user+"/"+courseId+"/student/";
        
        evidenceLinkUrl = evidenceLinkUrl + "?text="+competenceComment;
        
        
        $.ajax({
            url: evidenceLinkUrl,
            headers: {
                'Content-Type': 'application/json',
                'Accept':'application/json'
            },
            type: "POST",
            dataType: "text",
            success: function(response){
                console.log("Success: "+response);
                Backbone.history.loadUrl();
            },
            error: function(response) {
                console.log("Error4: "+response);
            }
        });
        
        
        
      },
      
      createEvidenceLink: function (competenceString, courseId) {
        that = this;
        
        var user = this.session.get('up.session.username');

        var serverUrl = "http://localhost:8084";
        var evidenceLinkUrl = serverUrl + "/competences/link/create/"+courseId+"/"+user+"/student/"+user+"/";
        
        evidenceLinkUrl = evidenceLinkUrl + "?competences=" + competenceString;
        evidencesString="app,von student";
        evidenceLinkUrl = evidenceLinkUrl + "&evidences="+evidencesString;
        
        $.ajax({
            url: evidenceLinkUrl,
            headers: {
                'Content-Type': 'application/json',
                'Accept':'application/json'
            },
            type: "POST",
            dataType: "text",
            success: function(response){
              that.createEvidenceComment(competenceString, courseId);
            },
            error: function(response) {
              console.log("Error3: "+response);
            }
        });
        
        
      },
      

            
      connectCompetenceWithCourse: function (competenceString, courseId) {
        that = this;

        var serverUrl = "http://localhost:8084";
        var courseCompetenceUrl = serverUrl + "/competences/SuggestedCourseForCompetence/create/";

        courseCompetenceUrl = courseCompetenceUrl + "?competence="+competenceString;
        courseCompetenceUrl = courseCompetenceUrl + "&course="+courseId;

        $.ajax({
            url: courseCompetenceUrl,
            headers: {
                'Content-Type': 'application/json',
                'Accept':'application/json'
            },
            type: "POST",
            dataType: "text",
            success: function(response){
              that.createEvidenceLink(competenceString, courseId);
            },
            error: function(response) {
              console.log("Error2: "+response);
            }
        });

      },


      newCompetence: function (event) {
        event.preventDefault();
        that = this;
        
        var serverUrl = "http://localhost:8084";
        
        var courseId = this.session.get('up.session.courseId');
        var newCompetence = $("#newcompetence").val();
        var catchWords = $("#competencetags").val().split(",");
        var operator = "operieren";
        var templateName = this.session.get('up.session.username');
        
        var addCompetenceURL = serverUrl + "/competences/addOne/";
        
        addCompetenceURL = addCompetenceURL + "?competence="+newCompetence;
        addCompetenceURL = addCompetenceURL + "&operator="+operator;
        addCompetenceURL = addCompetenceURL + "&learningTemplateName="+templateName;
        $(catchWords).each(function(index){
            addCompetenceURL = addCompetenceURL + "&catchwords="+this;
        });
        addCompetenceURL = addCompetenceURL + "&catchwords=studentenkompetenz";
        addCompetenceURL = addCompetenceURL + "&operator="+operator;
        
        $.ajax({
            url: addCompetenceURL,
            headers: {
                'Content-Type': 'application/json',
                'Accept':'application/json'
            },
            type: "POST",
            dataType: "text",
            success: function(response){
                that.connectCompetenceWithCourse(newCompetence,courseId);
            },
            error: function(response) {
                console.log("Error1: "+response);
            }
        });
        
      }
  });

  return CompetenceOverviewPageView;  

;
});