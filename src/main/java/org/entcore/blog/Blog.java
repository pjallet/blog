/*
 * Copyright © WebServices pour l'Éducation, 2014
 *
 * This file is part of ENT Core. ENT Core is a versatile ENT engine based on the JVM.
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation (version 3 of the License).
 *
 * For the sake of explanation, any module that communicate over native
 * Web protocols, such as HTTP, with ENT Core is outside the scope of this
 * license and could be license under its own terms. This is merely considered
 * normal use of ENT Core, and does not fall under the heading of "covered work".
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 */

package org.entcore.blog;

import org.entcore.blog.controllers.BlogController;
import org.entcore.blog.controllers.PostController;
import org.entcore.blog.events.BlogSearchingEvents;
import org.entcore.blog.security.BlogResourcesProvider;
import org.entcore.blog.services.impl.BlogRepositoryEvents;
import org.entcore.common.events.EventStoreFactory;
import org.entcore.common.http.BaseServer;
import org.entcore.common.mongodb.MongoDbConf;

public class Blog extends BaseServer {

    public static final String POSTS_COLLECTION = "posts";
    public static final String BLOGS_COLLECTION = "blogs";

	@Override
	public void start() {
		setResourceProvider(new BlogResourcesProvider());
		super.start();

		MongoDbConf.getInstance().setCollection("blogs");

		EventStoreFactory eventStoreFactory = EventStoreFactory.getFactory();
		eventStoreFactory.setContainer(container);
		eventStoreFactory.setVertx(vertx);

		setRepositoryEvents(new BlogRepositoryEvents());

        if (config.getBoolean("searching-event", true)) {
            setSearchingEvents(new BlogSearchingEvents());
        }

        final MongoDbConf conf = MongoDbConf.getInstance();
        conf.setCollection(BLOGS_COLLECTION);
        conf.setResourceIdLabel("id");

		addController(new BlogController());
		addController(new PostController());

	}

}
