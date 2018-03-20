console.log("< Server >");
const fs = require("fs-extra");
const ServeCube = require("servecube");
const {html} = ServeCube;
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const mime = require("mime");
const {MongoClient} = require("mongodb");
const session = require("express-session");
const MongoStore = require("connect-mongo")(session);
const youKnow = require("./data/youknow.js");
const production = process.argv[2] === "production";
(async () => {
	const client = await MongoClient.connect(youKnow.db.url, {
		compression: "snappy"
	});
	const db = client.db("mspfa");
	const cube = await ServeCube.serve({
		eval: v => {
			return eval(v);
		},
		domain: "mspfa.com",
		httpPort: 8082,
		httpsRedirect: production,
		subdomains: {
			d: "www/",
			beta: "www/",
			api: "api/"
		},
		githubPayloadURL: "/githubwebhook",
		githubSecret: youKnow.github.secret,
		githubToken: youKnow.github.token,
		uncacheModified: !production,
		middleware: [cookieParser(), bodyParser.raw({
			limit: "100mb",
			type: "*/*"
		}), session({
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
	