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
  

  /**
  * SelectableCompetences represents a collection of competences that is presented as a list
  * to the user. It can be switched according to context - both in terms of API endpoint and
  * parsing functionality.
  *
  * current contexts 
  *
  * coursecompetences: the competences of a course
  * mycompetences: the approved competences of the current user
  * mycompetencepaths: suggestions on the basis of the current user's approved competences
  *
  **/
  
  var SelectableCompetences = Backbone.Collection.extend({
    
    /**
    * set the url according to context
    *
    *
    */
    
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
            // this should work on a competence database API as of April 2016
            case "coursecompetences":
              if (localHandling) {
                serverUrl = serverUrl+"/competences/coursecontext?course="+this.session.get('up.session.courseId');
              }
              else {
                serverUrl = serverUrl+"/competences/SuggestedCompetencesForCourse/"+this.session.get('up.session.courseId')+"/";
              }
              break;
            // this endpoint ("/competences/link/overview/"+user+"/") did not work as of April 2016; the dummy JSON file linked here represents
            // a valid response according to the API documentation of the competence database
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
            // there was no API endpoint for suggestions as of April 2016, for the purpose of this UI development it is assumed
            // that the response is formatted as "/competences/link/overview/"+user+"/" is
            case "mycompetencepaths":
              if (localHandling) {
                serverUrl = "/js/json/user_dummy_competences.json";
              }
              else {
                // for productivity switch the URLs
                serverUrl = "/js/json/user_dummy_competences.json";
              }
              break;
            default:
              console.log("Error: Undefined context.");
              break;
          }
          return serverUrl;
          
      },
      
    /**
    * parse according to context
    *
    *
    */
      
      
      
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
    
    /**
    * use a different list template according to set context
    *
    *
    */
    
    
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
      
      
    /**
    * the last call in the chain to create an evidence comment
    *
    * (this AJAX POST request should be refactored together with the competence database to set the parameters as POST parameters)
    */
      
      
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

    /**
    * the last call in the chain to create create a new competence for a course
    *
    * (this AJAX POST request should be refactored together with the competence database to set the parameters as POST parameters)
    */


      
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
      
    /**
    * the second call in the chain to create a new competence for a course
    *
    * this connects the newly created competence with the course it was created for
    *
    * (this AJAX POST request should be refactored together with the competence database to set the parameters as POST parameters)
    */

            
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
              
              // if the call was successful, make the third call (see above)
              that.createEvidenceLink(competenceString, courseId);
            },
            error: function(response) {
              console.log("Error2: "+response);
            }
        });

      },
      
    /**
    * the first call in the chain to create a new competence for a course
    *
    * this sends all the parameters to the competence database REST server with some assumptions (see below)
    *
    * (this AJAX POST request should be refactored together with the competence database to set the parameters as POST parameters)
    */

      newCompetence: function (event) {
        event.preventDefault();
        that = this;
        
        var serverUrl = "http://localhost:8084";
        
        var courseId = this.session.get('up.session.courseId');
        var newCompetence = $("#newcompetence").val();
        
        // split the tags on the commas into one array
        var catchWords = $("#competencetags").val().split(",");
        
        // default operator for competences from the app
        var operator = "operieren";
        var templateName = this.session.get('up.session.username');
        
        var addCompetenceURL = serverUrl + "/competences/addOne/";
        
        addCompetenceURL = addCompetenceURL + "?competence="+newCompetence;
        addCompetenceURL = addCompetenceURL + "&operator="+operator;
        addCompetenceURL = addCompetenceURL + "&learningTemplateName="+templateName;
        
        // concatenate a string of catchwords
        $(catchWords).each(function(index){
            addCompetenceURL = addCompetenceURL + "&catchwords="+this;
        });
        // add default catchword
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
              
                // if the call was succesful, step to the second method in the chain (see above)
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