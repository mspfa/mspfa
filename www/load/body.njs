this.value = html`
	</head>
	<body>
		<div id="main">
			<header>
				<div class="umcontainer">
					<div class="mspfalogo"></div>
					<iframe class="um" src="/um/?60252"></iframe>
				</div>
				<div id="flashytitle"></div>
				<nav>
					<a class="group1" href="/">MSPFA Home</a>
					<span class="vbar">|</span>
					<a class="group1" href="http://www.mspaintadventures.com/" target="_blank">MSPA</a>
					<div class="heart"></div>
					<a class="group2" href="/stories/">Explore</a>
					<span class="vbar">|</span>
					<a class="group2" href="/random/">Random</a>
					<span class="vbar">|</span>
					<a class="group2" href="/stats/">Statistics</a>
					<div class="heart"></div>` + (this.loggedIn/*TODO*/ ? html`
					<a class="group3" href="/my/">My MSPFA</a>
					<a id="notifications" href="/my/messages/">0</a>` : html`
					<a class="group3" href="/login/">Log in</a>`) + html`
					<span class="vbar">|</span>
					<a class="group3" href="https://discord.mspfa.com/" target="_blank">Discord</a>
					<div class="heart"></div>
					<a class="group4" href="mailto:support@mspfa.com">Contact</a>
					<span class="vbar">|</span>
					<a class="group4" href="/donate/">Donate</a>
				</nav>
				<div id="pepsidehydration" class="alert hidden">It seems you are blocking our ads, but we need those ads enabled to be able to fund this website. Please be considerate and enable ads. Don't worry; they're non-intrusive.</div>
				<div id="warning" class="alert">This is the beta site. No data here will be kept when this site is released.</div>
			</header>`;
this.done();
