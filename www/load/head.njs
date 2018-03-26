this.title = this.title === undefined ? "MS Paint Fan Adventures" : this.title;
this.author = this.author === undefined ? "Grant Gryczan" : this.author;
this.description = this.description === undefined ? "Hello, welcome to the bath house" : this.description;
this.tags = this.tags instanceof Array ? this.tags : [];
this.image = this.image === undefined ? "/images/ico.png" : this.image; // Perfectly Generic Icon courtesy of heyitskane
const userAgent = this.req.get("User-Agent");
this.value = html`
<!DOCTYPE html>
<html>
	<head>
		<title>${this.title}</title>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width,initial-scale=1">
		<meta name="author" content="${this.author}">
		<meta name="description" content="${this.description}">
		<meta name="keywords" content="${["miroware", "miro", "ware", "grantgryczan", "grant", "gryczan", "mspfa", "mspfanventures", "mspfanventure", "mspaintfanventures", "mspaintfanventure", "mspfanadventures", "mspfanadventure", "mspaintfanadventures", "mspaintfanadventure", "mspaint", "ms", "paint", "fanventures", "fanventure", "fan", "adventures", "adventure", "fans", "mspa", "mspaintadventures", "mspafa", "forums", "forum", ...this.tags].join(",")}">
		<meta name="theme-color" content="${userAgent && userAgent.includes("Discordbot") ? "#00cc13" : "#eeeeee"}">
		<meta property="og:type" content="website">
		<meta property="og:url" content="https://mspfa.com/">
		<meta property="og:site_name" content="MS Paint Fan Adventures">
		<meta property="og:image" content="${this.image}">
		<meta property="og:title" content="${this.title}">
		<meta property="og:description" content="${this.description}">
		<meta name="google-signin-client_id" content="${youKnow.google.clientId}">
		<link rel="icon" href="/images/ico.png">
		<link href="//fonts.googleapis.com/css?family=Press+Start+2P" rel="stylesheet">
		<link rel="stylesheet" href="/css/mspfa.css">
		<script src="https://www.googletagmanager.com/gtag/js?id=UA-110090319-2" async></script>
		<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date),gtag("config","UA-110090319-2");</script>`;
this.done();
