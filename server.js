console.log("< Server >");
const fs = require("fs-extra");
const {serve, html} = require("servecube");
const cookieParser = require("cookie-parser");
const mime = require("mime");
const {MongoClient} = require("mongodb");
const youKnow = require("./youknow.js");
const production = process.argv[2] === "production";
(async () => {
	const myEval = v => eval(v);
	require("replthis")(myEval);
	const client = await MongoClient.connect(youKnow.db, {
		compression: "snappy"
	});
	const db = client.db("mspfa");
	const cube = await serve({
		eval: myEval,
		domain: production ? "mspfa.com" : "localhost:8082",
		errorDir: "error",
		httpPort: 8082,
		httpsRedirect: production,
		subdomains: {
			d: "www/",
			beta: "www/",
			api: "api/"
		},
		githubSubdomain: "api",
		githubPayloadURL: "/githubwebhook",
		githubSecret: youKnow.github.secret,
		githubToken: youKnow.github.token,
		middleware: [cookieParser()]
	});
	const {load} = cube;
})();
