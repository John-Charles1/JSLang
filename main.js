// import {run} from "./basic.js"

const utils = require("./basic");
const prompt = require('prompt-sync')();

while(true){
	let text = prompt('basic>');
	//console.log(text);
	let result = utils.run("<stdin>", text);
	// const fs = require('fs');

	// const obj = {
	//   something: 1
	// };

	// const str = JSON.stringify(obj);

	// fs.writeFile('output.json', str, 'utf8', (err) => {
	//   if (err) {
	//     console.error('Error writing to file:', err);
	//     return;
	//   }
	//   console.log('Object has been written to output.json');
	// });

	console.log(result);
	if(text === 'stop'){
		break;
	}
}