// JS cookies for emulating session id
// Mihai Cirlanaru

function setCookie(c_name,value,exdays) {
	var exdate = new Date();
	exdate.setDate(exdate.getDate() + exdays);
	var c_value = escape(value) +
		((exdays == null) ? "" : "; expires=" + exdate.toUTCString());
	document.cookie = c_name + "=" + c_value;
}

function getCookie(c_name) {
	var i, x, y, ARRcookies = document.cookie.split(";");
	for (i = 0; i < ARRcookies.length; i++) {
	  x = ARRcookies[i].substr(0, ARRcookies[i].indexOf("="));
	  y = ARRcookies[i].substr(ARRcookies[i].indexOf("=") + 1);
	  x = x.replace(/^\s+|\s+$/g,"");
	  if (x == c_name) {
	    return unescape(y);
	  }
	}
}

function checkCookie() {
	var sessionID = getCookie("sessionID");
	if (sessionID != null && sessionID != "") {
	  	return sessionID;
	} else {
		// set random session id
		sessionID = Math.floor(Math.random()*100000);
	  	setCookie("sessionID", sessionID, 365);
	  	return sessionID;
	}
}
