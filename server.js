console.log("< Server >");
const ServeCube = require("servecube");
const {html} = ServeCube;
const youKnow = require("./data/youknow.js");
const options = {
	eval: v => {
		return eval(v);
	},
	httpPort: 8082,
	subdomain: ["", "d", "beta"],
	errorRedirect: {
		404: "/?s=20784"
	},
	githubSecret: youKnow.github.secret,
	githubPayloadURL: "/githubwebhook"
};
try {
	options.tls = {
		key: fs.readFileSync("certs/privkey1.pem"),
		cert: fs.readFileSync("certs/cert1.pem"),
		ca: fs.readFileSync("certs/chain1.pem")
	};
} catch(err) {}
const cube = ServeCube.serve(options);
const stdin = process.openStdin();
stdin.on("data", function(input) {
	console.log(eval(String(input)));
});
