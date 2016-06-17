console.log('blog behaviours file');

Behaviours.register('blog', {
	model: {
		Comment: function(data){
			if(data && data.created){
				this.created = moment(this.created.$date);
			}
		},
		Post: function(data){
			var that = this;
			if(data){
				this.created = data.created ? moment(data.created.$date) : moment();
				this.modified = data.modified ? moment(data.modified.$date) : moment();
			}
			this.collection(Behaviours.applicationsBehaviours.blog.model.Comment, {
				sync: '/blog/comments/:blogId/:_id',
				remove: function(comment){
					http().delete('/blog/comment/' + that.blogId + '/' + that._id + '/' + comment.id);
					Collection.prototype.remove.call(this, comment);
				}
			});
		},
		Blog: function(data){
			var that = this;
			if(data && data._id){
				this._id = data._id;
				this.owner = data.author;
				this.shortenedTitle = data.title || '';
				if(this.shortenedTitle.length > 40){
					this.shortenedTitle = this.shortenedTitle.substr(0, 38) + '...';
				}
				if(data.thumbnail){
					this.icon = data.thumbnail + '?thumbnail=290x290';
				}
				else{
					this.icon = '/img/illustrations/blog.png';
				}
				this.updateData(data);
                this.fetchPosts = _.map(this.fetchPosts, function(post){
                    return new Post(post);
                });
			}

			this.collection(Behaviours.applicationsBehaviours.blog.model.Post, {
			    syncPosts: function (cb) {
			        if (this.postsLoading) {
			            return;
			        }
			        this.postsLoading = true;
					http().get('/blog/post/list/all/' + that._id).done(function(posts){
						posts.map(function(item){
							item.blogId = data._id;
							item['publish-type'] = data['publish-type'];
                            item['firstPublishDate'] = item['firstPublishDate'] || item['modified']
							return item;
						});
						this.load(posts);
						this.postsLoading = false;
                        if(typeof cb === 'function')
                            cb();
					}.bind(this))
			        .e401(function () { })
			        .e404(function () { });
				},
				addDraft: function(post, callback){
					http().postJson('/blog/post/' + that._id, post).done(function(result){
						post._id = result._id;
						this.push(post);
						var newPost = this.last();
						newPost.blogId = that._id;
						if(typeof callback === 'function'){
							callback(newPost);
						}
					}.bind(this));
				},
				remove: function(post){
					post.remove();
					Collection.prototype.remove.call(this, post);
				},
				behaviours: 'blog'
			});

			if(this._id){
				this.posts.sync();
			}
		},
		App: function(){
			this.collection(Behaviours.applicationsBehaviours.blog.model.Blog, {
			    sync: function (cb) {
			        if (this.blogsLoading) {
			            return;
			        }
			        this.blogsLoading = true;
					http().get('/blog/list/all').done(function(blogs) {
					    this.load(blogs);
					    this.blogsLoading = false;
						if(typeof cb === "function"){
							cb();
						}
					}.bind(this));
				},
				remove: function(blog){
					blog.remove();
					Collection.prototype.remove.call(this, blog);
				},
				behaviours: 'blog'
			});
		},
		register: function(){
			this.Blog.prototype.toJSON = function(){
				return {
					_id: this._id,
					title: this.title,
					thumbnail: this.thumbnail || '',
					'comment-type': this['comment-type'] || 'IMMEDIATE',
					'publish-type': this['publish-type'] || 'RESTRAINT',
					description: this.description || ''
				};
			};

			this.Blog.prototype.create = function(fn){
				http().postJson('/blog', this)
					.done(function(newBlog) {
						this._id = newBlog._id;
						if(typeof fn === 'function'){
							fn();
						}
					}.bind(this));
			};

			this.Blog.prototype.saveModifications = function(fn){
				http().putJson('/blog/' + this._id, this).done(function(){
					if(typeof fn === 'function'){
						fn();
					}
				});
			};

			this.Blog.prototype.save = function(fn){
				if(this._id){
					this.saveModifications(fn);
				}
				else{
					this.create(fn);
				}
			};

            this.Post.prototype.open = function(cb){
                http().get('/blog/post/' + this.blogId + '/' + this._id, {state: this.state}).done(function(data){
                    this.content = data.content;
                    if(typeof cb === 'function')
                        cb();
                }.bind(this));
            };

			this.Post.prototype.submit = function(callback){
				this.state = 'SUBMITTED';
				http().putJson('/blog/post/submit/' + this.blogId + '/' + this._id).done(function(){
					if(typeof callback === 'function'){
						callback();
					}
					this.trigger('change');
				}.bind(this));
			};

			this.Post.prototype.publish = function(callback){
				this.state = 'PUBLISHED';
				if(this['publish-type'] === 'IMMEDIATE'){
					http().putJson('/blog/post/publish/' + this.blogId + '/' + this._id);
					return;
				}
				http().putJson('/blog/post/publish/' + this.blogId + '/' + this._id).done(function(){
					if(typeof callback === 'function'){
						callback();
						this.trigger('change');
					}
				}.bind(this))
				.e401(function(){
					this.submit(callback);
				}.bind(this));
			};

			this.Post.prototype.create = function(callback, blog, state){
				this.blogId = blog._id;
				http().postJson('/blog/post/' + blog._id, {
					content: this.content,
					title: this.title
				})
				.done(function(data){
					this.updateData(data);
					blog.posts.push(this);
					if(state !== 'DRAFT'){
						this.publish(callback);
					}
					else{
						if(typeof  callback === 'function'){
							callback();
						}
					}
				}.bind(this));
			};

			this.Post.prototype.saveModifications = function(callback){
				http().putJson('/blog/post/' + this.blogId + '/' + this._id, {
					content: this.content,
					title: this.title
				}).done(function(){
                    if(typeof  callback === 'function'){
                        callback();
                    }
                });
			};

			this.Post.prototype.save = function(callback, blog, state){
				if(this._id){
					this.saveModifications(callback);
				}
				else{
					this.create(callback, blog, state);
				}
			};

			this.Post.prototype.remove = function(callback){
				http().delete('/blog/post/' + this.blogId + '/' + this._id)
					.done(function(){
						if(typeof callback === 'function'){
							callback();
						}
					});
			};

			this.Post.prototype.comment = function(comment){
				http().postJson('/blog/comment/' + this.blogId + '/' + this._id, comment).done(function(){
					this.comments.sync();
				}.bind(this))
			};

			this.Blog.prototype.open = function(success, error){
			    http().get('/blog/' + this._id)
                    .done(function (blog) {
					    this.owner = blog.author;
					    this.shortenedTitle = blog.title || '';
					    if(this.shortenedTitle.length > 40){
						    this.shortenedTitle = this.shortenedTitle.substr(0, 38) + '...';
					    }
					    this.updateData(blog);
					    if (typeof success === 'function') {
					        success();
					    }
				    }.bind(this))
			        .e404(function () {
			            if (typeof error === 'function') {
			                error();
			            }
			        }.bind(this))
			        .e401(function () {
			            if (typeof error === 'function') {
			                error();
			            }
			        }.bind(this));
			};

			this.Blog.prototype.remove = function(){
				http().delete('/blog/' + this._id);
			};

			this.Comment.prototype.toJSON = function(){
				return {
					comment: this.comment
				}
			};

			model.makeModels(this);
			this.app = new this.App();
		}
	},
	rights: {
		resource: {
			update: {
				right: 'org-entcore-blog-controllers-PostController|create'
			},
			removePost: {
				right: 'org-entcore-blog-controllers-PostController|delete'
			},
			editPost: {
				right: 'org-entcore-blog-controllers-PostController|update'
			},
			createPost: {
				right: 'org-entcore-blog-controllers-PostController|create'
			},
			publishPost: {
				right: 'org-entcore-blog-controllers-PostController|publish'
			},
			share: {
				right: 'org-entcore-blog-controllers-BlogController|shareJson'
			},
			removeBlog: {
				right: 'org-entcore-blog-controllers-BlogController|delete'
			},
			editBlog: {
				right: 'org-entcore-blog-controllers-BlogController|update'
			},
			removeComment: {
				right: 'org-entcore-blog-controllers-BlogController|delete'
			},
			comment: {
			    right: 'org-entcore-blog-controllers-PostController|comment'
			}
		},
		workflow: {
			create: 'org.entcore.blog.controllers.BlogController|create',
			print: 'org.entcore.blog.controllers.BlogController|print'
		}
	},
	loadResources: function(callback){
		this.model.register();
		this.model.app.blogs.sync(function(){
			this.resources = this.model.app.blogs.map(function(blog){
				if(blog.thumbnail){
					blog.thumbnail = blog.thumbnail + '?thumbnail=48x48';
				}
				else{
					blog.thumbnail = '/img/illustrations/blog.png'
				}
				return {
					title: blog.title,
					owner: {
						name: blog.author.username,
						userId: blog.author.userId
					},
					icon: blog.thumbnail,
					path: '/blog#/view/' + blog._id,
					_id: blog._id
				};
			});
			callback(this.resources);
		}.bind(this));
	},
	sniplets: {
		articles: {
			title: 'sniplet.title',
			description: 'sniplet.desc',
			controller: {
			    init: function () {
			        this.foundBlog = true;
					this.me = model.me;
					Behaviours.applicationsBehaviours.blog.model.register();
					var blog = new Behaviours.applicationsBehaviours.blog.model.Blog({ _id: this.source._id });
					this.newPost = new Behaviours.applicationsBehaviours.blog.model.Post();
					blog.open(undefined, function () {
					    this.foundBlog = false;
					    this.$apply();
					}.bind(this));
					blog.on('posts.sync, change', function () {
					    this.blog = blog;
					    this.blog.behaviours('blog');
					    this.$apply();
					}.bind(this));
				},
				initSource: function(){
					Behaviours.applicationsBehaviours.blog.model.register();
					var app = new Behaviours.applicationsBehaviours.blog.model.App();
					this.blog = new Behaviours.applicationsBehaviours.blog.model.Blog();
					app.blogs.sync(function(){
						this.blogs = app.blogs;
					}.bind(this));
				},
                pickBlog: function(blog) {
                    this.setSnipletSource(blog);
                    this.snipletResource.synchronizeRights();
                },
				createBlog: function(){
					console.log('automatic blog creation');
					if(this.snipletResource){
						this.blog.thumbnail = this.snipletResource.icon || '';
						this.blog.title = 'Les actualités du site ' + this.snipletResource.title;
						this.blog['comment-type'] = 'IMMEDIATE';
						this.blog.description = '';
					}
					this.blog.save(function(){
						//filler post publication
						var post = {
							state: 'SUBMITTED',
							content: '<p>Voici le premier billet publié sur votre site !</p><p>Vous pouvez créer de nouveaux billets (si vous êtes contributeur) en cliquant sur le bouton "Ajouter un billet" ' +
							'ci-dessus, ou en accédant directement à l\'application Blog. Vos visiteurs pourront également suivre vos actualités depuis leur application, ' +
							'et seront notifiés lorsque votre site sera mis à jour.</p><p>La navigation, à gauche des billets, est automatiquement mise à jour lorsque vous ajoutez'+
							' des pages à votre site.</p>',
							title: 'Votre premier billet !'
						};
						this.blog.posts.addDraft(post, function(post){
							post.publish(function(){
								this.setSnipletSource(this.blog);
								//sharing rights copy
								this.snipletResource.synchronizeRights();
							}.bind(this));
						}.bind(this));
					}.bind(this));

				},
				addPost: function(){
					this.newPost.showCreateBlog = false;
					this.newPost.save(function(){
						this.blog.posts.sync();
						delete(this.newPost._id);
						this.newPost.content = "";
						this.newPost.title = "";
					}.bind(this), this.blog);
				},
				removePost: function(post){
					post.remove(function(){
						this.blog.posts.sync();
					}.bind(this));
				},
				addArticle: function(){
					this.editBlog = {};
				},
				saveEdit: function(post){
					post.save();
                    post.publish();
					post.edit = false;
				},
				formatDate: function(date){
					return moment(date).format('D/MM/YYYY');
				},
				getReferencedResources: function(source){
					if(source._id){
						return [source._id];
					}
				},
				publish: function(post){
					post.publish(function(){
						this.blog.posts.sync();
					}.bind(this));
				}
			}
		}
	}
});
