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
            
            this.session.set('up.session.password', "voyager1;A");
            this.session.set('up.session.username', "test2");
            
            var username = this.session.get('up.session.username');
            var password = this.session.get('up.session.password');
            
            
            // TODO: einkommmentieren, wenn auf die echte Moodle-Schnittstelle zugegriffen werden kann
            return "http://localhost:8084/lms/courses/moodle/"+username+"@uni-potsdam.de"+"?organization=irgendwas&password="+password;
//            return "http://localhost:8084/lms/courses/moodle/test2@uni-potsdam.de?organization=irgendwas&password=voyager1;A";
        }
    });

    var CourseListView = Backbone.View.extend({
        initialize: function() {            
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