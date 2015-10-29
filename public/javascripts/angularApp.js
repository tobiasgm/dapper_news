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
                    // By using the resolve property in this way, we are ensuring that anytime our home state is entered, we will automatically query all posts from our backend before the state actually finishes loading.
                    resolve: {
                        postPromise: ['posts', function(posts){
                            return posts.getAll();
                        }]
                    }
                })
            // Notice that we define our URL with brackets around 'id'.
            // This means that 'id' is actually a route parameter that will be made available to our controller.
                .state('posts', {
                    url: '/posts/{id}',
                    templateUrl: '/posts.html',
                    controller: 'PostsCtrl',
                    // The Angular ui-router detects we are entering the posts state and will then automatically query the server for the full post object, including comments. Only after the request has returned will the state finish loading.
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

            // Use otherwise() to redirect unspecified routes    
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


    // {info} By Angular conventions, lowerCamelCase is used for factory names that won't be new'ed.
    // You may be wondering why we're using the keyword factory instead of service.
    // In angular, factory and service are related in that they are both instances of a third entity called provider.
    // posts service
    .factory('posts', ['$http', 'auth', function($http, auth){

        // What we're doing here is creating a new object that has an array property called posts.
        // We then return that variable so that our o object essentially becomes exposed to any other Angular module that cares to inject it.
        // You'll note that we could have simply exported the posts array directly,
        // however, by exporting an object that contains the posts array we can add new objects and methods to our services in the future.
        var o = {
            posts: []
        };
        
        // get all posts
        // {info} It's important to use the angular.copy() method to create a deep copy of the returned data. This ensures that the $scope.posts variable in MainCtrl will also be updated, ensuring the new values are reflect in our view.
        // In this function we're using the Angular $http service to query our posts route. The success() function allows us to bind function that will be executed when the request returns. Because our route will return a list of posts, all we need to do is copy that list to the client side posts object. Notice that we're using the angular.copy() function to do this as it will make our UI update properly.
        o.getAll = function() {
            return $http.get('/posts').success(function(data){
                angular.copy(data, o.posts);
            });
        };
        
        // get single post
        // {info} MongoDB uses the _id property natively, so it's usually easier to just write our application with that in mind rather than have to translate it to an id field, which some might consider more intuitive.
        // Notice that instead of using the success() method we have traditionally used, we are instead using a promise.
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
                angular.copy(data, post);
                //console.log(data);
            });
        };

        // downvote post
        o.downvote = function(post) {
            return $http.put('/posts/' + post._id + '/downvote', null, {
                headers: {Authorization: 'Bearer '+auth.getToken()}
            }).success(function(data){
                angular.copy(data, post);
                //console.log(data);
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
                angular.copy(data, comment);
            });
        };

        // downvote comment
        o.downvoteComment = function(post, comment) {
            return $http.put('/posts/' + post._id + '/comments/'+ comment._id + '/downvote', null, {
                headers: {Authorization: 'Bearer '+auth.getToken()}
            }).success(function(data){
                angular.copy(data, comment);
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
            // two-way data-binding only applies to variables bound to $scope.
            // To display our array of posts that exist in the posts factory (posts.posts),
            // we'll need to set a scope variable in our controller to mirror the array returned from the service.
            $scope.posts = posts.posts; 
            // $scope.posts = [
            // {title: 'post 1', upvotes: 5},
            // {title: 'post 2', upvotes: 2},
            // {title: 'post 3', upvotes: 15},
            // {title: 'post 4', upvotes: 9},
            // {title: 'post 5', upvotes: 4}
            // ];
            // Have the addPost function retrieve the title/ link entered into our form,
            // which is bound to the $scope variable title/ link, and set title/ link to blank once it has been added to the posts array:
            $scope.addPost = function(){
                if(!$scope.title || $scope.title === '') { return; } //prevent submitting blank post
                posts.create({
                    title: $scope.title,
                    link: $scope.link,
                });
                $scope.title = '';
                $scope.link = '';
            };
            // upvote post
            $scope.incrementUpvotes = function(post) {
                posts.upvote(post);
            };
            // downvote post
            $scope.incrementDownvotes = function(post) {
                posts.downvote(post);
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
            // To get access to the post object we just retrieved in the PostsCtrl,
            // instead of going through the posts service, the specific object will be directly injected into our PostsCtrl.
            $scope.post = post;
            // add comment
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
            //upvote comment
            $scope.incrementUpvotes = function(comment){
                posts.upvoteComment(post, comment);
            };
            //downvote comment
            $scope.incrementDownvotes = function(comment){
                posts.downvoteComment(post, comment);
            };
        }])

    // authentication controller
    .controller('AuthCtrl', [
        '$scope',
        '$state',
        'auth',
        function($scope, $state, auth){
            $scope.user = {};
            // register user
            $scope.register = function(){
                auth.register($scope.user).error(function(error){
                    $scope.error = error;
                }).then(function(){
                    $state.go('home');
                });
            };
            // login user
            $scope.logIn = function(){
                auth.logIn($scope.user).error(function(error){
                    $scope.error = error;
                }).then(function(){
                    $state.go('home');
                });
            };
        }])

     // nav controller
    .controller('NavCtrl', [
        '$scope',
        'auth',
        function($scope, auth){
            $scope.isLoggedIn = auth.isLoggedIn;
            $scope.currentUser = auth.currentUser;
            $scope.logOut = auth.logOut;
        }])
