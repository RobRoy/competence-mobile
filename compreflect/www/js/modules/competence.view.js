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
	

  /**
  * UserCompetences represents a collection of competences that the current user
  * has succesfully acquired. 
  *
  **/

	var UserCompetences = Backbone.Collection.extend({
    url: function () {

        this.session = new Session();		
        var user = this.session.get('up.session.username');
        
        var serverUrl = "http://localhost:8084";  // this needs to be a URL to a production server once done
        
        // Debug & Dev Switches
        var useLocalServer = true;
        var localHandling = true; // switch this to enable legacy mode (old code) or when the backend is production ready

        if (!window.cordova && useLocalServer) {
          if (localHandling) {
            serverUrl = "/js/json/user_dummy_competences.json";
          }
          else {
            serverUrl = "http://localhost:8084";
          }
        }
        
        if (localHandling) {
          serverUrl = serverUrl;
        }
        else {
					serverUrl = serverUrl+"/competences/link/overview/"+user+"/";
				}  
        return serverUrl;
    },
    
    parse: function(data) {  
      
      var userCompetences = _.map(data.mapUserCompetenceLinks, function (competenceData, competenceName) {
        return {name: competenceName};
      });
      return userCompetences;
    }
	});
 

  /**
  * CompetenceTree represents a collection of competences on the basis of a chosen
  * single competence - can be used both for connected competences and suggestions
  *
  * The API endpoint needs to be adapted when the suggestions are working in 
  * competence database
  *
  **/
 
  
  var CompetenceTree = Backbone.Collection.extend({
    
  /**
  * Add a callback to the success condition of the fetch method to insert another call
  * for additional data in the collection.
  *
  **/
    
    
      initialize: function(){
        this.fetch({
            success: this.fetchSuccess,
        });            
      },
      
  /**
  * This needs to be switched according to context in the future. As of April 2016 there was
  * no API endpoint for suggestions - this needs to be added here.
  *
  **/
      
      
      url: function () {

          this.session = new Session();		
          var compcontext = this.session.get('up.session.competenceName');
          
          var serverUrl = "http://localhost:8084";  // this needs to be a URL to a production server once done
          
          // Debug & Dev Switches
          var useLocalServer = true;
          var localHandling = true; // switch this to enable legacy mode (old code) or when the backend is production ready

          if (!window.cordova && useLocalServer) {
            if (localHandling) {
              serverUrl = "/js/json/dummy_competencetree.json";
            }
            else {
              serverUrl = "http://localhost:8084";
            }
          }
          
          if (localHandling) {
            serverUrl = "/js/json/dummy_competencetree.json";
          }
          else {
            
            //TODO: add another endpoint for suggestions here and switch according to context
            
						serverUrl = serverUrl+"/competences/competencetree/"+this.session.get('up.session.courseId')+"/";
					}          
          return serverUrl;
          
      },
      
  /**
  * The callback from fetch() - get the suggested courses for every competence in the current collection
  * 
  * So far there is no way to get the Moodle name for these courses, so for now (April 2016) there are only
  * course IDs added to the collection (and a mockup integration in the UI) - as soon as the name is returned
  * properly there needs to be an adaption of the parsing here.
  *    
  **/
      
      
      fetchSuccess: function (collection, response) {
        
        _.each(collection.models, function(competence, index){
          var getCoursesUrl = "http://localhost:8084/competences/SuggestedCourseForCompetence/?competence="+competence.attributes.name;
          $.ajax({
              url: getCoursesUrl,
              headers: {
                  'Content-Type': 'application/json',
                  'Accept':'application/json'
              },
              type: "GET",
              dataType: "text",
              success: function(response){
                //TODO: add names for the courses to this endpoint in the competence database and parse those names here
                collection.models[index].attributes['courses'] = JSON.parse(response);
              },
              error: function(response) {
                  console.log("Error: "+response);
              }
          });
        });
      },
      			
      parse: function(data) {
				var context = this.session.get("up.session.compcontext");
				var currentCompetence = this.session.get('up.session.competenceName');
        var connectedCompetences;
        _.each(data[0].competence,function(competence) {
          if (competence.name == currentCompetence) { 
            connectedCompetences = competence.competence;
          }
        });
        return connectedCompetences;
				
      }
  });

  /**
  * The view used to display a CompetenceTree with a template switched according to context.
  * 
  *    
  **/
  
  
  
  
  var CompetencesListView = Backbone.View.extend({
      initialize: function () {
        this.session = new Session();
        
        switch (this.session.get("up.session.compcontext")) {
          case "coursecompetences":
            this.template = utils.rendertmpl("competences.list");
            break;
          case "mycompetences":
            this.template = utils.rendertmpl("competences_with_courses.list");
            break;
          case "mycompetencepaths":
            this.template = utils.rendertmpl("competences_with_courses.list");
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
  
  var CompetenceView = Backbone.View.extend({
    
    attributes: {"id": "competenceView"},
    events : {'submit': 'saveCompetence'},
    
    initialize: function (options) {
        this.session = new Session();
        this.template = utils.rendertmpl("competence.view");
        _.bindAll(this, 'render');

    },
    
    render: function () {
      that = this;
      this.$el.html(this.template({competence: this.model}));
      this.$el.trigger("create");
      this.$el.trigger("circle");      
      
      
      var competenceTree = new CompetenceTree();
      var userCompetences = new UserCompetences();
      
      
      // call intersectCompetences only when both collections have fetched their data
      competenceTree.fetch({ success: function() {
        userCompetences.fetch({ success: function() {
          that.intersectCompetences(competenceTree,userCompetences)
        }});
      }});

      new CompetencesListView({el: this.$("#competenceTree"), collection: competenceTree});
      
      return this;
    },

  /**
  * intersect the competences of a course with the acquired competences of the current user
  * to see whether the currently shown competence has already been acquired (plus UI changes)
  *    
  **/
    
    
    
    intersectCompetences: function(competenceTree, userCompetences) {
      that = this;
      
      var intersect = function(firstArray, secondArray) {
          var temp;
          if (secondArray.length > firstArray.length) temp = secondArray, secondArray = firstArray, firstArray = temp;
          return firstArray.filter(function (e) {
              if (secondArray.indexOf(e) !== -1) return true;
          });
      }
      
      var currentCompetenceCompleted = false;      
      var connectedCompetences = [];
      var completedCompetences = [];
      
      _.each(competenceTree.models, function(competence){
        connectedCompetences.push(competence.attributes.name);
      });

      _.each(userCompetences.models, function(competence){
        completedCompetences.push(competence.attributes.name);
        if (that.session.get('up.session.competenceName') == competence.attributes.name) {
          currentCompetenceCompleted = true;
        }
      });
      
      connectedCompetences.push(that.session.get('up.session.competenceName'));
      
      var diffArray = intersect(connectedCompetences,completedCompetences);      
      var percentage = (100 / connectedCompetences.length) * diffArray.length;
      
      // make UI changes
      if (currentCompetenceCompleted) {
        this.$(".btn-add-competence").hide();
      }
      
      this.$("#compcircle").circliful({
        animationStep: 5,
        foregroundBorderWidth: 5,
        backgroundBorderWidth: 15,
        percent: percentage
      });
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
    
    saveCompetence: function (event) {
      event.preventDefault();
      
      that = this;
      
      var serverUrl = "http://localhost:8084";
      
      var courseId = this.session.get('up.session.courseId');
      var newCompetence = this.session.get('up.session.competenceName')
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
              that.createEvidenceLink(newCompetence,courseId);
          },
          error: function(response) {
              console.log("Error1: "+response);
          }
      });
            
    }
  });

  return CompetenceView;  


});