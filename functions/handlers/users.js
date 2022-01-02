const { admin, db } = require('../util/admin') ;

const config = require('../util/config');

const firebase = require('firebase');
firebase.initializeApp(config);

const { validateSignupData, validateLoginData, reduceUserDetails } = require('../util/validators');


// Register

exports.signup = (req, res) => {
	const newUser = {
		fName: req.body.fName,
		lName: req.body.lName,
		email: req.body.email,
		password: req.body.password,
		confirmPassword: req.body.confirmPassword,
	};

	const { valid, errors } = validateSignupData(newUser);

	if (!valid) return res.status(400).json(errors);

	let token, userId;

	db.doc(`/users/${newUser.email}`).get()
		.then((doc) => {
			if (doc.exists) {
				return res.status(400).json({ email: 'This email address already exists' });
			} else {
				return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password)
			}
		})
		.then((data) => {
			userId = data.user.uid;
			return data.user.getIdToken();
		})
		.then((idToken) => {
			token = idToken;
			const userCredentials = {
				fName: newUser.fName,
				lName: newUser.lName,
				email: newUser.email,
				moderator: false,
				createdAt: new Date().toISOString(),
				userId
			};
			return db.doc(`/users/${newUser.email}`).set(userCredentials);
		})
		.then(() => {
			return res.status(201).json({ token });
		})
		.catch((err) => {
			console.log(err);
			res.status(500).json({ error: 'Something when wrong' });
		})
};


// Login

exports.login = (req, res) => {
	const user = {
		email: req.body.email,
		password: req.body.password
	};

	const { valid, errors } = validateLoginData(user);

	if (!valid) return res.status(400).json(errors);

	firebase.auth().signInWithEmailAndPassword(user.email, user.password)
		.then((data) => {
			return data.user.getIdToken();
		})
		.then((token) => {
			return res.json({ token });
		})
		.catch((err) => {
			console.error(err);
			return res.status(403).json({ general: 'Wrong credentials. Please try again.'});
		});
};


// Ger user credentials

exports.getAuthUser = (req, res) => {

 	let userData = {};
 	db.doc(`/users/${req.user.email}`).get()
 	.then((doc) => {
 		if(doc.exists) {
 			userData.credentials = doc.data();
			return res.json(userData);
		} else {
			return res.status(404).json({ error: 'User not found'});
		}
	})
	.catch((err) => {
		console.error(err);
		return res.status(500).json({ error: err.code })
	})
};


// Upload User Image

exports.uploadImage = (req, res) => {
	const Busboy = require('busboy');
	const path = require('path');
	const os = require('os');
	const fs = require('fs');

	const busboy = new Busboy({ headers: req.headers })

	let imageFileName;
	let imageToBeUploaded = {};

	busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
		if(mimetype !== 'image/jpeg' && mimetype !== 'image/png' && mimetype !== 'image/jpg') {
			return res.status(400).json({ error: 'Not an accepted file type for image!' });
		}

		const imageExtension = filename.split('.')[filename.split('.').length - 1];
		imageFileName = `${Math.round(Math.random()*1000000000000)}.${imageExtension}`;
		const filepath = path.join(os.tmpdir(), imageFileName);
		imageToBeUploaded = { filepath, mimetype };
		file.pipe(fs.createWriteStream(filepath));
	});
	busboy.on('finish', () => {
		admin.storage().bucket().upload(imageToBeUploaded.filepath, {
			resumable: false,
			metadata: {
				metadata: {
					contentType: imageToBeUploaded.mimetype
				}
			}
		})
		.then(() => {
			const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`
			return res.json({ message: 'Image uploaded successfully', imgName: imageUrl  });
		})
		.catch((err) => {
			console.error(err);
			return res.status(500).json({ error: err.code });
		})
	})
	busboy.end(req.rawBody);
}


// Upload Document

exports.uploadDoc = (req, res) => {
	const Busboy = require('busboy');
	const path = require('path');
	const os = require('os');
	const fs = require('fs');

	const busboy = new Busboy({ headers: req.headers })

	let fileFileName;
	let fileToBeUploaded = {};

	busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {

		const fileExtension = filename.split('.')[filename.split('.').length - 1];
		fileFileName = `${Math.round(Math.random()*1000000000000)}.${fileExtension}`;
		const filepath = path.join(os.tmpdir(), fileFileName);
		fileToBeUploaded = { filepath, mimetype };
		file.pipe(fs.createWriteStream(filepath));
	});
	busboy.on('finish', () => {
		admin.storage().bucket().upload(fileToBeUploaded.filepath, {
			resumable: false,
			metadata: {
				metadata: {
					contentType: fileToBeUploaded.mimetype
				}
			}
		})
		.then(() => {
			const fileUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${fileFileName}?alt=media`
			return res.json({ message: 'File uploaded successfully', doc: fileUrl  });
		})
		.catch((err) => {
			console.error(err);
			return res.status(500).json({ error: err.code });
		})
	})
	busboy.end(req.rawBody);
}