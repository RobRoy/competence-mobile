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
						serverUrl = serverUrl+"/competences/competencetree/"+this.session.get('up.session.courseId')+"/";
					}
          
          return serverUrl;
          
      },
			
      parse: function(data) {
				var context = this.session.get("up.session.compcontext");
				var currentCompetence = this.session.get('up.session.competenceName');
        var connectedCompetences;
        _.each(data[0].competence,function(competence) {
          if (competence.name == currentCompetence) { 
            connectedCompetences = competence.competence;
            console.log(connectedCompetences);
          }
        });
        return connectedCompetences;
				
      }
  });
  
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
        
      },
      
      getCoursesForCompetences: function(){
        that = this;
        that.coursesCollection = {};
        _.each(that.collection.models, function(competence){
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
                _.each(JSON.parse(response), function(course){
                  if(course != "university") {
                    if (_.has(that.coursesCollection, course)) {
                      var compArray = that.coursesCollection[course];
                      compArray.push(competence.attributes.name);
                      that.coursesCollection[course] = compArray;
                    }
                    else {
                      var compArray = [];
                      compArray.push(competence.attributes.name);
                      that.coursesCollection[course] = compArray;
                    }
                  }
                });                
              },
              error: function(response) {
                  console.log("Error: "+response);
              }
          });
        });
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