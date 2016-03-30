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
], function ($, _, Backbone, utils, moment, Session, _str, Models) {

    var SelectableCourses = Backbone.Collection.extend({
        url: function () {

            this.session = new Session();		

            var username = this.session.get('up.session.username');
            var password = this.session.get('up.session.password');


            var serverUrl = "http://localhost:8084";
            var useLocalServer = true;
            var localHandling = false; // switch this to enable legacy mode (old code) or when the backend is production ready

            if (!window.cordova && useLocalServer) {
              if (localHandling) {
                serverUrl = "http://competenceserver.dev/lms/courses/moodle?organization=irgendwas&username="+ username +"&password=" + password;
              }
              else {
                serverUrl = "http://localhost:8084/lms/courses/moodle/"+ username +"/?organization=irgendwas&username=&password=" + password;
              }
            }
            
            return serverUrl;
            
        },
        parse: function(data) {
            console.log(data);

          //var parsedData = JSON.parse(data);
          return data;
        }
    });

    var CourseListView = Backbone.View.extend({
        initialize: function () {
            this.template = utils.rendertmpl("course_selection.courses");
            this.listenTo(this.collection, "sync error", this.render);
            this.collection.fetch();
        },
        render: function () {
            this.$el.empty();
            this.$el.append(this.template({courses: this.collection}));
            this.$el.trigger("create");
        }
    });

    var CourseSelectionPageView = Backbone.View.extend({
        attributes: {"id": "courseSelection"},
        initialize: function () {
            this.template = utils.rendertmpl("course_selection");
        },
        render: function () {
            this.$el.html(this.template({}));
            this.$el.trigger("create");

            new CourseListView({el: this.$("#courseList"), collection: new SelectableCourses()});

            return this;
        }
    });

    return CourseSelectionPageView;
});