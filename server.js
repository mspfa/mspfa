console.log("< Server >");
const fs = require("fs");
const ServeCube = require("servecube");
const {html} = ServeCube;
const mime = require("mime");
const youKnow = require("./data/youknow.js");
const options = {
	eval: v => {
		return eval(v);
	},
	httpPort: 8082,
	subdomain: ["", "d", "beta"],
	githubSecret: youKnow.github.secret,
	githubPayloadURL: "/githubwebhook",
	uncacheModified: process.argv[2] !== "production"
};
const cube = ServeCube.serve(options);
const {load} = cube;
const stdin = process.openStdin();
stdin.on("data", function(input) {
	console.log(eval(String(input)));
});
