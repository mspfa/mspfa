console.log("< Server >");
const fs = require("fs");
const ServeCube = require("servecube");
const {html} = ServeCube;
const mime = require("mime");
const {MongoClient} = require("mongodb");
const session = require("express-session");
const MongoStore = require("connect-mongo")(session);
const youKnow = require("./data/youknow.js");
(async () => {
	const client = await MongoClient.connect(youKnow.db.url, {
		compression: "snappy"
	});
	const db = client.db("mspfa");
	const cube = ServeCube.serve({
		eval: v => {
			return eval(v);
		},
		domain: "mspfa.com",
		httpPort: 8082,
		httpsRedirect: true,
		subdomain: ["", "d", "beta"],
		githubSecret: youKnow.github.secret,
		githubPayloadURL: "/githubwebhook",
		uncacheModified: process.argv[2] !== "production",
		middleware: [session({
			secret: youKnow.session.secret,
			resave: false,
			saveUninitialized: false,
			name: "sess",
			cookie: {
				secure: true,
				maxAge: 604800000
			},
			store: new MongoStore({
				db,
				collection: "sessions",
				stringify: false
			})
		})]
	});
	const {load} = cube;
	process.openStdin().on("data", input => {
		console.log(eval(String(input)));
	});
})();
	