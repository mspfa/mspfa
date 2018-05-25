if(this.req.subdomain === "api") {
	this.value = String(this.params.status);
} else {
	this.status = 308;
	this.redirect = "/?s=20784&p=1";
}
this.done();
