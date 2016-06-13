routes.define(function($routeProvider){
	$routeProvider
		.when('/view/:blogId', {
			action: 'viewBlog'
		})
		.when('/edit/:blogId', {
			action: 'editBlog'
		})
		.when('/new-article/:blogId', {
			action: 'newArticle'
		})
		.when('/list-blogs', {
			action: 'list'
		})
		.when('/view/:blogId/:postId', {
			action: 'viewPost'
		})
		.when('/print/:blogId', {
			action: 'print'
		})
		.otherwise({
			redirectTo: '/list-blogs'
		})
});

function BlogController($scope, route, model, $location, date){
	$scope.template = template;
	template.open('filters', 'filters');
	template.open('edit-post', 'edit-post');
	template.open('read-post', 'read-post');
	template.open('share', "share");

	$scope.me = model.me;
	$scope.blogs = model.blogs;
	$scope.comment = new Comment();
	$scope.lang = idiom;

	route({
		viewBlog: function(params){
			model.blogs.deselectAll();

			model.one('blogs.sync', function(){
				$scope.blog = model.blogs.findWhere({ _id: params.blogId });
				if(!$scope.blog){
					template.open('main', 'e404');
				}
				else{
                    template.open('main', 'blog');
        			template.close('create-post');
                    if($scope.blog.posts.length() < 1){
    					$scope.blog.posts.syncPosts(function(){
                            $scope.blog.posts.forEach(function(post){
    							post.comments.sync();
    						});
                        });
                    }
				}
			});
			if(!model.blogs.length()){
				model.blogs.sync();
			}
			else{
				model.blogs.trigger('sync');
			}
		},
		print: function(params){
			model.one('blogs.sync', function(){
				$scope.blog = model.blogs.findWhere({ _id: params.blogId });
				if(!$scope.blog){
					template.open('main', 'e404');
				}
				else{
                    template.open('main', 'blog');
					$scope.blog.posts.syncPosts(function(){
                        var countDown = $scope.blog.posts.length();
                        var onFinish = function(){
                            if(--countDown <= 0){
                                $scope.$apply();
        						setTimeout(function(){
        							window.print();
        						}, 1000);
                            }
                        };

                        if(countDown === 0){
                            onFinish();
                        }
                        $scope.blog.posts.forEach(function(post){
                            post.open(function(){
                                onFinish();
                            });
                        });

					});
				}
			});
			model.blogs.sync();
		},
		viewPost: function(params){
			template.close('create-post');
			model.blogs.deselectAll();

			model.one('blogs.sync', function(){
				$scope.blog = model.blogs.findWhere({ _id: params.blogId });
				if(!$scope.blog){
					template.open('main', 'e404');
				}
				else{
                    template.open('main', 'blog');
					$scope.blog.one('posts.sync', function(){
						$scope.blog.posts.forEach(function(post){
							if(post._id === params.postId){
                                post.open(function(){
                                    post.slided = true;
                                    post.comments.sync();
                                    $scope.$apply();
                                });
                            } else {
                                post.comments.sync();
                                post.slided = false;
                            }
						});
					});
					if(!$scope.blog.posts.length()){
						$scope.blog.posts.syncPosts();
					} else {
						$scope.blog.posts.forEach(function(post){
							if(post._id === params.postId){
								post.open(function(){
                                    post.slided = true;
                                    $scope.$apply();
                                });
                            } else
								post.slided = false;
						});
					}
				}
			});
			if(!$scope.blog){
				model.blogs.sync();
			}
			else{
				model.blogs.trigger('sync');
			}
		},
		newArticle: function(params){
			$scope.post = new Post();

			model.one('blogs.sync', function(){
				$scope.blog = model.blogs.findWhere({ _id: params.blogId });
				if(!$scope.blog){
					template.open('main', 'e404');
				} else {
                    template.open('main', 'blog');
        			template.open('create-post', 'create-post');
                }
			});
			if(!$scope.blog){
				model.blogs.sync();
			}
			else{
				model.blogs.trigger('sync');
			}
		},
		list: function(){
			model.blogs.deselectAll();
			template.open('main', 'blogs-list');
		},
		editBlog: function(params){
			model.one('blogs.sync', function(){
				$scope.blog = model.blogs.findWhere({ _id: params.blogId });
				if($scope.blog){
					template.open('main', 'edit-blog');
				}
				else{
					$scope.blog = new Blog();
					template.open('main', 'edit-blog');
				}
			});
			if(!model.blogs.length()){
				model.blogs.sync();
			}
			else{
				model.blogs.trigger('sync');
			}
		}
	});

	$scope.openClosePost = function (blog, post) {
	    if (post.slided) {
	        post.slided = false;
	        $scope.redirect('/view/' + blog._id);
	    }
	    else {
	        $scope.redirect('/view/' + blog._id + '/' + post._id);
	    }
	};

    $scope.openFirstPost = function(blog, post){
        post.slided = true;
        post.open(function(){
            $scope.$apply();
        });
    };

	$scope.display = {
		filters: {
			submitted: true,
			draft: true,
			published: true,
			all: true
		}
	};

	$scope.saveBlog = function(){
		$scope.blog.save(function(){
			model.blogs.sync();
		});
		history.back();
	};

	$scope.removeBlog = function(){
		$scope.blog.remove(function(){
			model.blogs.sync();
		});
		$scope.redirect('/list-blogs')
	};

	$scope.cancel = function(){
		history.back();
	};

	$scope.count = function(state){
		return $scope.blog.posts.where({ state: state }).length;
	};

	$scope.switchAll = function(){
		for(var filter in $scope.display.filters){
			$scope.display.filters[filter] = $scope.display.filters.all;
		}
	};

	$scope.checkAll = function(){
		$scope.display.filters.all = true;
		for(var filter in $scope.display.filters){
			$scope.display.filters.all = $scope.display.filters[filter] && $scope.display.filters.all;
		}
	};

	$scope.showEditPost = function(post){
		$scope.currentPost = post;
		http().get('/blog/post/' + $scope.currentBlog._id + '/' + $scope.currentPost._id + '?state=' + post.state)
			.done(function(data){
				$scope.currentPost = data;
				$scope.editPost = post;
				$scope.$apply();
			});
	};

	$scope.saveDraft = function(){
		if(!$scope.post.content){
			notify.error('post.empty');
			return;
		}
		if(!$scope.post.title){
			notify.error('title.empty');
			return;
		}
		$scope.post.save(function(){
			$location.path('/view/' + $scope.blog._id);
			//$scope.blog.posts.syncPosts();
		}, $scope.blog, 'DRAFT');
		notify.info('draft.saved');
	};

	$scope.savePost = function(){
		if($scope.post._id !== undefined){
			$scope.post.publish();
		}
		else{
			$scope.post.save(function(){
				$location.path('/view/' + $scope.blog._id + '/' + $scope.post._id);
				//$scope.blog.posts.syncPosts();
			}, $scope.blog)
		}
	};

    $scope.setDraftCb = function(post){
        post.state = "DRAFT"
        if(!$scope.$$phase)
            $scope.$apply()
    }

	function initMaxResults(){
		$scope.maxResults = 3;
	}
	initMaxResults();
	$scope.addResults = function(){
		$scope.maxResults += 3;
	};

	$scope.updatePublishType = function(){
		model.blogs.selection().forEach(function(blog){
			blog['publish-type'] = $scope.display.publishType;
			blog.save();
		});
	};

	$scope.removePost = function(post){
		http().delete('/blog/post/' + $scope.currentBlog._id + '/' + post._id);
	};

	$scope.removeBlog = function(){
		model.blogs.remove($scope.blog);
		$location.path('/list-blogs');
	};

	$scope.applyFilters = function(item){
		return $scope.display.filters.all || $scope.display.filters[item.state.toLowerCase()];
	};

	$scope.redirect = function(path){
		$location.path(path);
	};

	$scope.shareBlog = function(){
		$scope.display.showShare = true;
		var same = true;
		var publishType = model.blogs.selection()[0]['publish-type'];
		model.blogs.selection().forEach(function(blog){
			same = same && (blog['publish-type'] === publishType);
		});
		if(same){
			$scope.display.publishType = publishType;
		}
		else{
			$scope.display.publishType = undefined;
		}
	};

	$scope.postComment = function(comment, post){
		post.comment(comment);
		$scope.comment = new Comment();
	};

	$scope.orderBlogs = function(blog){
		var discriminator = 0;
		if(blog.myRights.editBlog)
			discriminator = 2;
		if(blog.myRights.createPost)
			discriminator = 1;
		return parseInt(discriminator + '' + blog.modified.$date);
	}
}
