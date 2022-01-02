const functions = require('firebase-functions');
const app = require('express')();
const FBAuth = require('./util/fbAuth');

const { db } = require('./util/admin');

const cors = require('cors');
app.use(cors());

const {
	getAllPosts,
	getPost,
	post,
	updatePost,
	deletePost,
	getTopic,
	commentOnPost,
	deleteComment,
	postDoc,
	getDocs,
	deleteDoc,
	updateEditors
} = require('./handlers/all');
const { signup, login, getAuthUser, uploadImage, uploadDoc } = require('./handlers/users');

// All Routes
app.get('/update/:postsid', updateEditors);
app.get('/posts', getAllPosts);
app.get('/posts/:topic', getTopic);
app.get('/post/:id', getPost);
app.post('/post', FBAuth, post);
app.patch('/post/:postsid', FBAuth, updatePost);
app.delete('/post/:postsid', FBAuth, deletePost);
app.post('/post/postImage', FBAuth, uploadImage);
app.post('/comment/:postsid', FBAuth, commentOnPost);
app.delete('/comment/:commentid', FBAuth, deleteComment);

// Doc
app.get('/documents', getDocs);
app.post('/document', FBAuth, postDoc);
app.post('/document/upload', FBAuth, uploadDoc);
app.delete('/document/:docid', FBAuth, deleteDoc);

// User Routes
app.post('/signup', signup);
app.post('/login', login);
app.get('/user', FBAuth, getAuthUser);

exports.api = functions.https.onRequest(app);

// Triggers

exports.onPostDelete = functions.firestore.document(`/posts/{postsid}`)
	.onDelete((snapshot, context) => {
		const postsid = context.params.postsid;
		const batch = db.batch();
		return db
		.collection('comments')
		.where('postsid', '==', postsid)
		.get()
		.then((data) => {
			data.forEach((doc) => {
				batch.delete(db.doc(`/comments/${doc.id}`));
			})
			return batch.commit();
		})
		.catch((err) => console.error(err));
	});