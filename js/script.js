//This will add 1/10th of the total cash per second every 100ms
function AddFunds() {
	totalFunds += perSecond;
	document.getElementById("total").innerHTML = "Funds: " + numConvert(totalFunds);
}

//This is the main timer of the entire webpage
function MainTimer() {
	AddFunds();
	setInterval(function() {AddFunds()}, 100);
}

//This is in charge of adding the click value to the total funds 
function Click() {
	totalFunds += perClick;
	document.getElementById("total").innerHTML = "Funds: " + numConvert(totalFunds);
}

//Main Variables and Initialaztion of Game
function Init() {
	perClick   = 1; //This is the money you get per click
	perSecond  = 0; //This is the money you get per second
	totalFunds = 0; //This is the total amount of money
	MainTimer();
}

//This will convert the number to what will be displayed
function numConvert(x) {
	str = x.toString();
	newString = str;
	if (str.length > 15){
		newString = str[0] + "." + str.slice(1, 4) + "e" + (str.length - 1);
	}
	else if (str.length > 12) {
		newString = str.slice(0, -12) + "." + str.slice(-12, -9) + "T";
	}
	else if (str.length > 9) {
		newString = str.slice(0, -9) + "." + str.slice(-9, -6) + "B";
	}
	else if (str.length > 6) {
		newString = str.slice(0, -6) + "," + str.slice(-6, -3) + "," + str.slice(-3);
	}
	else if (str.length > 3) {
		newString = str.slice(0, -3) + "," + str.slice(-3);
	}
	return(newString)
}

//This is in charge of creating different click upgrades
class clickUpgrade {
	constructor(price, value, mult) {
		this.price = price;
		this.value = value;
		this.mult  = mult;
		this.num   = 0;
	}
}

//This is in charge of actually buying a click upgrade 
function buyClickUpgrade(upgrade) {
	if (upgrade.price > totalFunds) {
		alert("You cannot afford this upgrade");
	}
	else {
		totalFunds = Math.round(totalFunds - upgrade.price);
		perClick = perClick + upgrade.value;
		upgrade.num ++;
		upgrade.price = upgrade.price * upgrade.mult;
		document.getElementById("perClick").innerHTML = "Per Click: " + numConvert(perClick);

	}
}





////////////////////////////////////////////////////
////////////////////////////////////////////////////
////////////////////////////////////////////////////
/////////Click Upgrades/////////////////////////////
hoe = new clickUpgrade(10, 1, 1.2)


////////////////////////////////////////////////////
////////////////////////////////////////////////////
////////////////////////////////////////////////////