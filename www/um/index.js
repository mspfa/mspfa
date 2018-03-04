window.addEventListener("message", function(evt) {
	if(evt.data === "refresh") {
		location.reload();
	}
});