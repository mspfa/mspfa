console.log("< Server >");
const ServeCube = require("servecube");
const youKnow = require("./data/youknow.js");
let tls;
try {
	tls = {
		key: fs.readFileSync("certs/privkey1.pem"),
		cert: fs.readFileSync("certs/cert1.pem"),
		ca: fs.readFileSync("certs/chain1.pem")
	};
} catch(err) {}
ServeCube.serve({
	basePath: `${__dirname}/`,
	httpPort: 8082,
	httpsPort: 8443,
	tls,
	errorRedirect: {
		404: "/?s=20784"
	},
	githubSecret: youKnow.github.secret
});
const stdin = process.openStdin();
stdin.on("data", function(input) {
	console.log(eval(String(input)));
});
