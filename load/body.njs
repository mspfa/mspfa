this.value = html`
	</head>
	<body>
		<div id="container">
			<header>
				<div class="umContainer">
					<div class="mspface"></div>
					<iframe class="um" src="/um/"></iframe>
				</div>
				<a id="flashyTitle" href="/"></a>
				<nav>
					<a id="navHome" class="group1" href="/">Home</a>
					<div class="groupSeparator"></div>
					<a class="group2" href="/stories/">Archive</a>
					<span class="itemSeparator">|</span>
					<a class="group2" href="/random/">Random</a>
					<span class="itemSeparator">|</span>
					<a class="group2" href="/stats/">Statistics</a>
					<div class="groupSeparator"></div>` + (this.in/*TODO*/ ? html`
					<a class="group4" href="/my/">My Account</a>
					<span class="itemSeparator">|</span>
					<a class="group4" href="/my/messages/">Messages (0)</a>` : html`
					<a class="group4" href="/login/">Log in</a>`) + html`
					<div class="groupSeparator"></div>
					<a class="group5" href="https://discord.mspfa.com/" target="_blank">Discord</a>
					<span class="itemSeparator">|</span>
					<a class="group5" href="mailto:support@mspfa.com">Contact</a>
					<span class="itemSeparator">|</span>
					<a class="group5" href="/donate/">Donate</a>
				</nav>
				<div id="dehydration" class="alert hidden">It seems you're blocking our ads, but we need those enabled to be able to fund this website. Please be considerate and disable your blocker for us! Don't worry; our ads aren't intrusive.</div>
				<div id="warning" class="alert">This is a beta site. Data here will not be kept when this site is released.</div>
			</header>`;
this.done();
