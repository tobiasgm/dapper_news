// create app, with name and dependencies
angular.module('dapperNews', ['ui.router'])

// router
    .config([
        '$stateProvider',
        '$urlRouterProvider',
        function($stateProvider, $urlRouterProvider) {
            $stateProvider
                .state('home', {
                    url: '/home',
                    templateUrl: '/home.html',
                    controller: 'MainCtrl',
                    resolve: {
                        postPromise: ['posts', function(posts){
                            return posts.getAll();
                        }]
                    }
                })
                .state('posts', {
                    url: '/posts/{id}',
                    templateUrl: '/posts.html',
                    controller: 'PostsCtrl',
                    resolve: {
                        post: ['$stateParams', 'posts', function($stateParams, posts) {
                            return posts.get($stateParams.id);
                        }]
                    }
                })
                .state('login', {
                    url: '/login',
                    templateUrl: '/login.html',
                    controller: 'AuthCtrl',
                    onEnter: ['$state', 'auth', function($state, auth){
                        if(auth.isLoggedIn()){
                            $state.go('home');
                        }
                    }]
                })
                .state('register', {
                    url: '/register',
                    templateUrl: '/register.html',
                    controller: 'AuthCtrl',
                    onEnter: ['$state', 'auth', function($state, auth){
                        if(auth.isLoggedIn()){
                            $state.go('home');
                        }
                    }]
                });
            
            $urlRouterProvider.otherwise('home');
        }])

    // authentication service
    // inject $http for interfacing with server,
    //and $window for interfacing with localStorage.
    .factory('auth', ['$http', '$window', function($http, $window){
        var auth = {};

        // save token to local storage
        auth.saveToken = function (token){
            $window.localStorage['flapper-news-token'] = token;
        };

        // get token from local storage
        auth.getToken = function (){
            return $window.localStorage['flapper-news-token'];
        }

        // check if user is logged in
        auth.isLoggedIn = function(){
            var token = auth.getToken();
            if(token){
                var payload = JSON.parse($window.atob(token.split('.')[1]));
                
                return payload.exp > Date.now() / 1000;
            } else {
                return false;
            }
        };

        // get current user
        auth.currentUser = function(){
            if(auth.isLoggedIn()){
                var token = auth.getToken();
                var payload = JSON.parse($window.atob(token.split('.')[1]));
                
                return payload.username;
            }
        };

        // register user
        auth.register = function(user){
            return $http.post('/register', user).success(function(data){
                auth.saveToken(data.token);
            });
        };
        
        // login user
        auth.logIn = function(user){
            return $http.post('/login', user).success(function(data){
                auth.saveToken(data.token);
            });
        };

        // logout user
        auth.logOut = function(){
            $window.localStorage.removeItem('flapper-news-token');
        };
        
        return auth;
    }])

    // posts service
    .factory('posts', ['$http', 'auth', function($http, auth){
        var o = {
            posts: []
        };
        
        // get all posts
        o.getAll = function() {
            return $http.get('/posts').success(function(data){
                angular.copy(data, o.posts);
            });
        };
        
        // get single post
        o.get = function(id) {
            return $http.get('/posts/' + id).then(function(res){
                return res.data;
            });
        };

        // create post
        o.create = function(post) {
            return $http.post('/posts', post, {
                headers: {Authorization: 'Bearer '+auth.getToken()}
            }).success(function(data){
                o.posts.push(data);
            });
        };

        // upvote post
        o.upvote = function(post) {
            return $http.put('/posts/' + post._id + '/upvote', null, {
                headers: {Authorization: 'Bearer '+auth.getToken()}
            }).success(function(data){
                post.upvotes += 1;
            });
        };

        // create comment
        o.addComment = function(id, comment) {
            return $http.post('/posts/' + id + '/comments', comment, {
                headers: {Authorization: 'Bearer '+auth.getToken()}
            });
        };

        // upvote comment
        o.upvoteComment = function(post, comment) {
            return $http.put('/posts/' + post._id + '/comments/'+ comment._id + '/upvote', null, {
                headers: {Authorization: 'Bearer '+auth.getToken()}
            }).success(function(data){
                comment.upvotes += 1;
            });
        };
        
        return o;
    }])


    // main controller
    .controller('MainCtrl', [
        '$scope',
        'posts',
        'auth',
        function($scope, posts, auth){
            $scope.isLoggedIn = auth.isLoggedIn;
            $scope.posts = posts.posts; 
            // $scope.posts = [
            // {title: 'post 1', upvotes: 5},
            // {title: 'post 2', upvotes: 2},
            // {title: 'post 3', upvotes: 15},
            // {title: 'post 4', upvotes: 9},
            // {title: 'post 5', upvotes: 4}
            // ];
            $scope.addPost = function(){
                if(!$scope.title || $scope.title === '') { return; }
                posts.create({
                    title: $scope.title,
                    link: $scope.link,
                });
                $scope.title = '';
                $scope.link = '';
            };
            $scope.incrementUpvotes = function(post) {
                posts.upvote(post);
            };
        }])

    // posts controller
    .controller('PostsCtrl', [
        '$scope',
        'posts',
        'post',
        'auth',      
        function($scope, posts, post, auth){
            $scope.isLoggedIn = auth.isLoggedIn;
            $scope.post = post;
            $scope.addComment = function(){
                if($scope.body === '') { return; }
                posts.addComment(post._id, {
                    body: $scope.body,
                    author: 'user',
                }).success(function(comment) {
                    $scope.post.comments.push(comment);
                });
                $scope.body = '';
            };
            $scope.incrementUpvotes = function(comment){
                posts.upvoteComment(post, comment);
            };
        }])

    .controller('AuthCtrl', [
        '$scope',
        '$state',
        'auth',
        function($scope, $state, auth){
            $scope.user = {};          
            $scope.register = function(){
                auth.register($scope.user).error(function(error){
                    $scope.error = error;
                }).then(function(){
                    $state.go('home');
                });
            };            
            $scope.logIn = function(){
                auth.logIn($scope.user).error(function(error){
                    $scope.error = error;
                }).then(function(){
                    $state.go('home');
                });
            };
        }])

    .controller('NavCtrl', [
        '$scope',
        'auth',
        function($scope, auth){
            $scope.isLoggedIn = auth.isLoggedIn;
            $scope.currentUser = auth.currentUser;
            $scope.logOut = auth.logOut;
        }])
