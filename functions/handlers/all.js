const { db } = require('../util/admin');


// Get All Posts

exports.getAllPosts = (req, res) => {
	db
	.collection('posts')
	.orderBy('createdAt', 'desc')
	.get()
	.then((data) => {
		let posts = [];
		data.forEach((doc) => {
			posts.push({
				postsid: doc.id,
				...doc.data()
			});
		});
		return res.json(posts);
	})
	.catch((err) => {
	console.error(err);
	res.status(500).json({ error: err.code });
	});	
}


// Get Topic

exports.getTopic = (req, res) => {
	db
	.collection('posts')
	.orderBy('createdAt', 'desc')
	.where('topic', '==', req.params.topic)
	.get()
	.then((data) => {
		let posts = [];
		data.forEach((doc) => {
			posts.push({
				postsid: doc.id,
				...doc.data()
			});
		});
		return res.json(posts);
	})
	.catch((err) => {
	console.error(err);
	res.status(500).json({ error: err.code });
	});
}

// Fetch one post

exports.getPost = (req, res) => {
	let postData = {};
	db
	.collection('posts')
	.where('id', '==', req.params.id)
	.get()
	.then((doc) => {
		doc.forEach((doc) => {
			postData = doc.data()
			postData.postsid = doc.id
		});
		return db
		.collection('comments')
		.where('postsid', '==', postData.postsid)
		.get();
	})
	.then((data) => {
		postData.comments = [];
		data.forEach((doc) => {
			postData.comments.push({
				commentsid: doc.id,
				...doc.data()
			});
		});
		postData.comments.sort((a, b) => {
				return new Date(a.createdAt) - new Date(b.createdAt);
			});
		return res.json(postData)
	})
	.catch((err) => {
		console.error(err);
		res.status(500).json({ error: err.code});
	});
}; 


// Post

exports.post = (req, res) => {
	if (req.body.body.trim() === '') {
		return res.status(400).json({ body: 'Body must not be empty' });
	}

	const newPosts = {
		body: req.body.body,
		createdAt: new Date().toISOString(),
		link: req.body.link,
		editors_pick: false,
		postImage: req.body.postImage,
		postedBy: req.body.postedBy,
		subTitle: req.body.subTitle,
		title: req.body.title,
		topic: req.body.topic,
		important: req.body.important,
		id: req.body.title.replace(/[,-.–—"':?!$&;`’@#%^*()~]/g, '').replace(/\s+/g, '-').toLowerCase(),
		commentCount: 0
	};

		db.collection('posts').where('id', '==', newPosts.id).get()
		.then((data) => {

			let checkId;
			data.forEach((doc) => {
				if (doc.data().id === newPosts.id) {
					checkId = true;
				}
			})
			
			if (checkId) {
				return res.status(400).json({ email: 'Similar title already exists. Please change the title.' });
			} else {
				return db.collection('posts').add(newPosts)
			}
		})
		.then((doc) => {
			const resPost = newPosts;
			resPost.postsid = doc.id;
			res.json({ resPost });
		})
		.catch((err) => {
			res.status(500).json({ error: 'Something went wrong' });
			console.error(err);
		});
}


//Comment on post

exports.commentOnPost = (req, res) => {
	if (req.body.body.trim() === '')
		return res.status(400).json({ comment: 'Must not be empty' });

	const newComment = {
		body: req.body.body,
		createdAt: new Date().toISOString(),
		postsid: req.params.postsid,
		id: req.body.id,
		user: req.body.user,
		email: req.user.email,
	};

	db.doc(`/posts/${req.params.postsid}`)
	.get()
	.then((doc) => {
		if(!doc.exists) {
			return res.status(404).json({ error: 'Post not found' });
		}
		return doc.ref.update({ commentCount: doc.data().commentCount + 1 })
	})
	.then(() => {
		return db.collection('comments').add(newComment);
	})
	.then(() => {
		res.json(newComment);
	})
	.catch((err) => {
		console.log(err);
		res.status(500).json({ error: 'Something when wrong' });
	})
}


// Delete Comment

exports.deleteComment = (req, res) => {
	const document = db.doc(`/comments/${req.params.commentid}`);
	document.get()
	.then((doc) => {
		let commentData = doc.data();
		if (!doc.exists) {
			return res.status(403).json({ error: 'Comment not found' });
		}
		if ((req.user.moderator === false) && (req.user.email !== commentData['email'])) {
			return res.status(403).json({ error: 'Unauthorized' });
		} else {
			document.delete();
		}
		return db.doc(`/posts/${commentData['postsid']}`).get()
	})
	.then((doc) => {
		if(!doc.exists) {
			return res.status(404).json({ error: 'Post not found' });
		}
		res.json({ message: 'Comment deleted successfully' });
		return doc.ref.update({ commentCount: doc.data().commentCount - 1 })
	})
	.catch((err) => {
		console.error(err);
		return res.status(500).json({ error: err.code });
	});
};


// Editors Pick

exports.updateEditors = (req, res) => {
	const document = db.doc(`/posts/${req.params.postsid}`);

	return document.update({
		editors_pick: true
	})
	.then(() => {
		res.json("Document successfully updated!");
	})
	.catch((error) => {
		console.error("Error updating document: ", error);
	});
}


// Delete Posts

exports.deletePost = (req, res) => {
	const document = db.doc(`/posts/${req.params.postsid}`);
	document.get()
	.then((doc) => {
		if (!doc.exists) {
			return res.status(403).json({ error: 'Post not found' });
		}
		if (req.user.moderator === false) {
			return res.status(403).json({ error: 'Unauthorized' });
		} else {
			return document.delete();
		}
	})
	.then(() => {
		res.json({ message: 'Post deleted successfully' });
	})
	.catch((err) => {
		console.error(err);
		return res.status(500).json({ error: err.code });
	});
};


// Get documents

exports.getDocs = (req, res) => {
	db
	.collection('documents')
	.orderBy('createdAt', 'desc')
	.get()
	.then((data) => {
		let docs = [];
		data.forEach((doc) => {
			docs.push({
				docid: doc.id,
				...doc.data()
			});
		});
		return res.json(docs);
	})
	.catch((err) => {
	console.error(err);
	res.status(500).json({ error: err.code });
	});	
}


// Add Document

exports.postDoc = (req, res) => {
	if (req.body.url.trim() === '') {
		return res.status(400).json({ body: 'Document must not be empty' });
	}

	const newDoc = {
		title: req.body.title,
		info: req.body.info,
		url: req.body.url,
		postedBy: req.body.postedBy,
		createdAt: new Date().toISOString(),
	};

	db.collection('documents').add(newDoc)
		.then((doc) => {
			const resDoc = newDoc;
			resDoc.docid = doc.id;
			res.json({ resDoc });
		})
		.catch((err) => {
			res.status(500).json({ error: 'Something went wrong' });
			console.error(err);
		});
}


// Delete Document

exports.deleteDoc = (req, res) => {
	const document = db.doc(`/documents/${req.params.docid}`);
	document.get()
	.then((doc) => {
		if (!doc.exists) {
			return res.status(403).json({ error: 'Document not found' });
		}
		if (req.user.moderator === false) {
			return res.status(403).json({ error: 'Unauthorized' });
		} else {
			return document.delete();
		}
	})
	.then(() => {
		res.json({ message: 'Document deleted successfully' });
	})
	.catch((err) => {
		console.error(err);
		return res.status(500).json({ error: err.code });
	});
};


// Update posts

exports.updatePost = (req, res) => {

	const postUpdate = {
		title: req.body.title,
		subTitle: req.body.subTitle,
		body: req.body.body,
		link: req.body.link,
		postImage: req.body.postImage
	};

	const document = db.doc(`/posts/${req.params.postsid}`);

	return document.update({
		title: postUpdate.title,
		subTitle: postUpdate.subTitle,
		body: postUpdate.body,
		link: postUpdate.link,
		postImage: postUpdate.postImage
	})
	.then(() => {
		res.json("Document successfully updated!");
	})
	.catch((error) => {
		console.error("Error updating document: ", error);
	});
}
