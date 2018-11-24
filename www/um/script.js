window.addEventListener("message", ({data}) => {
	if(data === "refresh") {
		location.reload();
	}
});
