this.cache = 2;
this.value = (await load("/load/head", this)).value;
this.value += html`
		<link rel="stylesheet" href="index.css">`;
this.value += (await load("/load/body", this)).value;
this.value += html`
			<img src="https://cdn.discordapp.com/emojis/363754135058776064.png">`;
this.value += (await load("/load/belt", this)).value;
/*this.value += html`
		<script src="index.js"></script>`;*/
this.value += (await load("/load/foot", this)).value;
this.exit();
