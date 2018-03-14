console.log("< Server >");
const fs = require("fs");
const ServeCube = require("servecube");
const {html} = ServeCube;
const mime = require("mime");
const youKnow = require("./data/youknow.js");
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
	uncacheModified: process.argv[2] !== "production"
});
const {load} = cube;
const stdin = process.openStdin();
stdin.on("data", input => {
	console.log(eval(String(input)));
});
