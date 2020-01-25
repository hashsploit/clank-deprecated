const NodeRSA = require('node-rsa');
var crypto = require('crypto');

var key = new NodeRSA(null, "components-pkcs1-der", {
	encryptionScheme: {
		scheme: "pkcs1",
		hash: "sha1",
		padding: crypto.constants.RSA_NO_PADDING
	}
});

var expected = [
	"3425C89A6DA9DDEBABA83CA6E6B4726DEF512300DEEA43D58F22503FAF9C5296107CA4BEA9578AAE4968062073C624A807AD44D254298D58B63CDA3BE4338C57",
	"578C33E43BDA3CB6588D2954D244AD07A824C67320066849AE8A57A9BEA47C1096529CAF3F50228FD543EADE002351EF6D72B4E6A63CA8ABEBDDA96D9AC82534"
];

var data = [
	"6B8F99EC1BAF06D2674284B5305EE6E38B1DE7331F2FBF31DE497228B7C52162F18DAE8913C40C43C0E890D14EEE16AD07C64FD9281D8B972D78BE78D1B290CE",
	"CE90B2D178BE782D978B1D28D94FC607AD16EE4ED190E8C0430CC41389AE8DF16221C5B7287249DE31BF2F1F33E71D8BE3E65E30B5844267D206AF1BEC998F6B",
];

var privexp = Buffer.from("5501861498e06dbd110bb324d1d13454736e57ae7fb8ab3e7e9e45efa054800002289d564e262e85414f169cdb1132fc9bed85ff919f6825235d83ec1657f7c4", "hex");
var privexp = 5;
var exp = Buffer.from("11", "hex");

function test(data) {
	//var mod = Buffer.from("C4F75716EC835D2325689F91FF85ED9BFC3211DB9C164F41852E264E569D2802008054A0EF459E7E3EABB87FAE576E735434D1D124B30B11BD6DE09814860155", "hex");
	var public_key = Buffer.from("305a300d06092a864886f70d01010105000349003046024100c4f75716ec835d2325689f91ff85ed9bfc3211db9c164f41852e264e569d2802008054a0ef459e7e3eabb87fae576e735434d1d124b30b11bd6de09814860155020111", "hex");
	//var privexp = Buffer.from("85A8EC2D3002C63B9E4AF4C014248F3224B47C14E1F45A5E4980BB1BB370F26DD8B80978FC2DCEC8B28563F1659A00B65C843D20732D3773E6AA95C37F9D5511", "hex");

	/*
	key.importKey({
		n: mod,
		e: exp,
		d: privexp,
		p: 2,
		q: 7
	});
	*/

	key.importKey(public_key, "public-der");

	console.log("Private Key = " + key.isPrivate());
	console.log("Public Key = " + key.isPublic());
	console.log("Empty Key = " + key.isEmpty());
	console.log("Key Size = " + key.getKeySize());
	console.log("Max Message Size = " + key.getMaxMessageSize());
	console.log("");
	var output = key.encrypt(data, "hex");
	console.log("Output: " + output);
	console.log();
	console.log("Length: " + output.length + " bits");
	console.log("Correct? " + (output == expected[0] ? "YES!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!" : "NO"));
	if (output != expected[0]) {
		console.log("Trying inverse endian, correct? " + (output == expected[1] ? "YES!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!" : "NO"));
	}

}

test(Buffer.from(data[0], "hex"));
test(Buffer.from(data[1], "hex"));
