this.cache = context => `${context.rawPath}?${context.req.queryString}`;
this.value = html`
<html>
	<head>
		<meta charset="UTF-8">
	</head>
	<body style="margin: 0; overflow: hidden;">
		<!-- Project Wonderful Ad Box Loader -->
		<script type="text/javascript">
		   (function(){function pw_load(){
			  if(arguments.callee.z)return;else arguments.callee.z=true;
			  var d=document;var s=d.createElement('script');
			  var x=d.getElementsByTagName('script')[0];
			  s.type='text/javascript';s.async=true;
			  s.src='//www.projectwonderful.com/pwa.js';
			  x.parentNode.insertBefore(s,x)}
		   if (window.attachEvent){
			window.attachEvent('DOMContentLoaded',pw_load);
			window.attachEvent('onload',pw_load)}
		   else{
			window.addEventListener('DOMContentLoaded',pw_load,false);
			window.addEventListener('load',pw_load,false);}})();
		</script>
		<!-- End Project Wonderful Ad Box Loader -->
		<!-- Project Wonderful Ad Box Code -->
		<div id="pw_adbox_${this.req.queryString}_5_0"></div>
		<script type="text/javascript"></script>
		<noscript><map name="admap${this.req.queryString}" id="admap${this.req.queryString}"><area href="http://www.projectwonderful.com/out_nojs.php?r=0&c=0&id=${this.req.queryString}&type=5" shape="rect" coords="0,0,728,90" title="" alt="" target="_blank" rel="noopener noreferrer" /></map>
		<table cellpadding="0" cellspacing="0" style="width:728px;border-style:none;background-color:#ffffff;"><tr><td><img src="http://www.projectwonderful.com/nojs.php?id=${this.req.queryString}&type=5" style="width:728px;height:90px;border-style:none;" usemap="#admap${this.req.queryString}" alt="" /></td></tr><tr><td style="background-color:#ffffff;" colspan="1"><center><a style="font-size:10px;color:#737373;text-decoration:none;line-height:1.2;font-weight:bold;font-family:Tahoma, verdana,arial,helvetica,sans-serif;text-transform: none;letter-spacing:normal;text-shadow:none;white-space:normal;word-spacing:normal;" href="http://www.projectwonderful.com/advertisehere.php?id=${this.req.queryString}&type=5&tag=42864" target="_blank">Ads by Project Wonderful!  Your ad could be here, right now.</a></center></td></tr></table>
		</noscript>
		<!-- End Project Wonderful Ad Box Code -->
		<script src="index.js"></script>
	</body>
</html>`;
this.done();
