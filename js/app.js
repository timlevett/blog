(function(){

  var timHome = angular.module('timHome', ['ngMaterial',
                                           'ngSanitize',
                                           'ui.router',
                                           'ui.gravatar',
                                           'angulartics',
                                           'angulartics.google.analytics',
                                           'hc.marked',
                                           'angular-jqcloud']);

//configuration -----------------------------------------------------------------------
  timHome.config(function($mdThemingProvider, $stateProvider, $urlRouterProvider, $analyticsProvider) {

    Array.prototype.getUnique = function(){
       var u = {}, a = [];
       for(var i = 0, l = this.length; i < l; ++i){
          if(u.hasOwnProperty(this[i])) {
             u[this[i]] += 1;
             continue;
          }
          a.push(this[i]);
          u[this[i]] = 1;
       }
       var ret = [];
       for(var j = 0; j < a.length; j++) {
         var obj = {};
         obj.text = a[j];
         obj.link = '#/tag/' + obj.text;
         obj.weight = u[obj.text];
         ret.push(obj);
       }
       return ret;
    }

    String.prototype.replaceAll = function(search, replacement) {
        var target = this;
        return target.split(search).join(replacement);
    };


    $analyticsProvider.firstPageview(true);

    $mdThemingProvider.theme('default')
      .primaryPalette('green')
      .accentPalette('blue')
      .backgroundPalette('grey');

    $mdThemingProvider.theme('altTheme')
      .primaryPalette('orange')
      .accentPalette('amber');

    $mdThemingProvider.alwaysWatchTheme(true);


    $urlRouterProvider.otherwise("/");
    $stateProvider
      .state('home', { url: '/', templateUrl : "partials/home.html", controller : "HomeController"})
      .state('gist', { url: '/gists', templateUrl : "partials/home.html", controller : "GistController"})
      .state('home-detail', { url: '/post/:postid', templateUrl : "partials/detail.html", controller : "HomeController"})
      .state('tag-home', { url: '/tag', templateUrl : "partials/tag-home.html", controller : "TagHomeController"})
      .state('tags', { url : '/tag/:tag', templateUrl : "partials/home.html", controller : "TagController"})
      .state('cards', {url : '/cards', templateUrl : "partials/cards.html", controller : "HomeController"});
  });

  timHome.run(['$rootScope', '$state', '$stateParams',
    function ($rootScope,   $state,   $stateParams) {
        $rootScope.theme = 'default';
        $rootScope.$state = $state;
        $rootScope.$stateParams = $stateParams;
    }
  ]
);

//services -------------------------------------------------------------------------

timHome.factory('PostService', ['$http', 'filterFilter', function($http, filterFilter){

    var getPosts = function() {
      return $http.get('/json/posts.json', { cache : true})
      .then(function(result){
        var posts = result.data;
        var posts = filterFilter(posts, {draft : false});
        return posts;
      }, function(){console.warn('issue getting posts')});
    }

    var getNav = function() {
      return $http.get('/json/nav.json', { cache : true})
        .then(function(result){
          return result.data;
        }, function(){console.warn('issue getting nav')});
    }

    var getGists = function (){
      var foo;
      return $http.jsonp('https://api.github.com/gists/22dadc049152f2b1d4df?callback=JSON_CALLBACK', { cache : true})
                  .then(function(result){
                    return result.data
                  },function(){
                    console.error('issue getting gists');
                  });
    }

    return {
      getPosts : getPosts,
      getNav : getNav,
      getGists : getGists
    };
  }]);


//controllers -----------------------------------------------------------------------

    timHome.controller('SidebarController', function($mdSidenav, $rootScope, $scope, $http, PostService){
      $scope.toggleSidebar = function() {
        $mdSidenav('left').toggle();
      };

      $scope.switchTheme = function() {
        $rootScope.theme = $rootScope.theme === 'default' ? 'altTheme' : 'default';
      };

      $scope.nav = [];

      var init = function(){
        PostService.getNav().then(function(result){$scope.nav = result;});
      };

      init();
    });

  timHome.controller('GistController', function($scope, PostService){
    $scope.posts = [];
    PostService.getGists().then(function(gist){
      $scope.posts = [{
        "id" : 1,
        "title" : "Test",
        "date" : "01-13-1990",
        "mdBody" : gist.data.files['doc.md'].content,
        "draft" : false,
        "tags" : ["first", "blog update"]
      }];
      console.log($scope.posts);
    })
  });

  timHome.controller('HomeController',function ($scope, $filter, PostService, filterFilter) {
    $scope.posts = [];
    $scope.height = 90;
    $scope.postid = $scope.$stateParams.postid;
    PostService.getPosts()
      .then(function(result){
        $scope.posts = result;
        if($scope.postid) {
          for(var index in $scope.posts) {
            var value = $scope.posts[index];
            if(value) {
              if(value.title === $scope.postid) {//exact match (legacy)
                $scope.post = value;
                break;
              } else if(value.id == $scope.postid) { //based on id
                $scope.post = value;
                break;
              } else if(value.title && value.title.replaceAll(" ","_").toLowerCase() === $scope.postid.toLowerCase()) { //perdy url
                $scope.post = value;
                break;
              }
            }
          }
          if(!$scope.post) {
            $scope.post = {title : '404 : not found', body: 'The page you are looking for does not exist, please try <a href="#/">going home</a>.', date: '01-01-1970'};
          }
          $scope.tags = $scope.post.tags;
          $scope.crumbs = [{title: 'Post'}, {title: $scope.post.date}];
        }
      });
  });

  timHome.controller('TagHomeController', function(PostService, $scope){
    $scope.wordz = [];
    $scope.crumbs = [{title: 'tag'}];
    PostService.getPosts()
      .then(function(result){
        angular.forEach(result, function(value, key){
          $scope.wordz = $scope.wordz.concat(value.tags);
        });
        $scope.words = $scope.wordz.getUnique();
        var what = 'yep';
      });
  });

  timHome.controller('TagController',function ($scope, PostService, filterFilter) {
    $scope.posts = [];
    $scope.height = 80;
    $scope.tag = $scope.$stateParams.tag;
    $scope.crumbs = [{title: 'tag', url: '#/tag'}];
    PostService.getPosts()
      .then(function(result){
        if($scope.tag) {
          $scope.posts = filterFilter(result, {tags : $scope.tag});
          $scope.crumbs.push({title: $scope.tag});
        }
      });
  });

//directives -----------------------------------------------------------------------

  timHome.directive('blogPost', function(){
    return {
      restrict : 'E',
      scope : {
        title : '@',
        body : '@',
        mdBody : '@',
        date : '@',
        md : '@',
        id : '@',
        tags : '='
      },
      templateUrl : 'partials/bp.html'
    }
  });

  timHome.directive('tags', function(){
    return {
      restrict : 'E',
      templateUrl : 'partials/tags.html'
    };
  });

  timHome.directive('breadcrumbs', function(){
    return {
      restrict : 'E',
      templateUrl : 'partials/breadcrumbs.html',
      scope : {
        crumbs : '='
      }
    }
  })

  timHome.directive('sidebar', function(){
    return {
      restrict : 'E',
      templateUrl : 'partials/sidebar.html',
      controller : 'SidebarController'
    };
  });
})();
