// Constants
const DIGITS = "0123456789";

const TT_INT 	= 'INT';
const TT_FLOAT 	= 'FLOAT';
const TT_PLUS 	= 'PLUS';
const TT_MINUS 	= 'MINUS';
const TT_MUL 	= 'MUL';
const TT_DIV 	= 'DIV';
const TT_LPAREN = 'LPAREN';
const TT_RPAREN = 'RPAREN';
const TT_EOF 	= 'EOF';


// Error class
class Error{
	constructor(pos_start, pos_end, error_name, details){
		this.pos_start = pos_start;
		this.pos_end = pos_end;
		this.error_name = error_name;
		this.details = details;
	}

	as_string(){
		let result = `${this.error_name}: ${this.details} `;
		result += `File ${this.pos_start.fn}, Line ${this.pos_start.line}`;
		return result;
	}
}

class IllegalCharError extends Error{
	constructor(pos_start, pos_end, details){
		super(pos_start, pos_end, 'Illegal Character', details);
	}
}

class InvalidSyntaxError extends Error{
	constructor(pos_start, pos_end, details){
		super(pos_start, pos_end, 'Illegal Character', details);
	}
}

class RTError extends Error{
	constructor(pos_start, pos_end, details, context){
		super(pos_start, pos_end, 'Runtime Error', details);
		this.context = context;
	}

	as_string(){
		let result = this.generate_traceback();
		result += `${this.error_name}: ${this.details} `;
		return result;
	}

	generate_traceback(){
		let result = "";
		let pos = this.pos_start;
		let ctx = this.context;

		while(ctx != null){
			// console.log("a");
			result = `File ${pos.fn}, Line ${pos.line}, ${ctx.display_name}\n`+result;	
			pos = ctx.parent_entry_pos;
			ctx = ctx.parent;
		}

		return "Traceback (most recent call last ):\n" + result;
	}
}

// Position class
class Position{
	constructor(index, line, column, file_name, file_text){
		this.index = index;
		this.line = line;
		this.column = column;
		this.fn = file_name;
		this.ftxt = file_text;
	}

	advance(current_char){
		this.index++;
		this.column++;

		if(this.current_char == '\n'){
			this.line++;
			this.column = 0;
		}
		return this;
	}

	copy(){
		let pos = new Position(this.index, this.line, this.column, this.fn, this.ftxt);
		return pos;
	}
}

// Token Class
class Token{
	constructor(type, value, pos_start, pos_end){
		this.type = type;
		this.value = value;

		if(pos_start != null){
			this.pos_start = pos_start.copy();
			this.pos_end = pos_start.copy();
			this.pos_end.advance();
		}

		if(pos_end != null){
			this.pos_end = pos_end;
		}
	}
}

// Lexer Class
class Lexer{
	constructor(fn, text){
		this.fn = fn;
		this.text = text;
		this.pos = new Position(-1, 0, -1, fn, text);
		this.current_char = null;
		this.advance();
	}

	// increment the pos to traverse the text then set the text to
	// null if the text is fully traversed
	advance(){
		this.pos.advance(this.current_char);
		this.current_char = this.pos.index < this.text.length ? this.text[this.pos.index] : null;
	}

	make_number(){
		let num_str = '';
		let dot_count = 0;
		let pos_start = this.pos.copy();

		while(this.current_char != null && (DIGITS.includes(this.current_char) || this.current_char == '.')){
			if(this.current_char == '.'){
				if(dot_count == 1)
					break;
				dot_count++;
				num_str += '.';
			}else {
				num_str += this.current_char;
			}
			this.advance();
		}

		if(dot_count == 0){
			let token = new Token(TT_INT, parseInt(num_str), pos_start, this.pos);
			return token;
		}else{
			let token = new Token(TT_FLOAT, parseFloat(num_str), pos_start, this.pos);
			return token;
		}
	}

	make_token(){
		let tokens = [];
		while(this.current_char != null){
			if(this.current_char === ' ' || this.current_char === '\t'){
				this.advance();
			}else if(DIGITS.includes(this.current_char)){

				tokens.push(this.make_number());
			}else if(this.current_char == '+'){
				let token = new Token(TT_PLUS, null, this.pos);
				tokens.push(token);
				this.advance();
			}else if(this.current_char == '-'){
				let token = new Token(TT_MINUS, null, this.pos);
				tokens.push(token);
				this.advance();
			}else if(this.current_char == '*'){
				let token = new Token(TT_MUL, null, this.pos);
				tokens.push(token);
				this.advance();
			}else if(this.current_char == '/'){
				let token = new Token(TT_DIV, null, this.pos);
				tokens.push(token);
				this.advance();
			}else if(this.current_char == '('){
				let token = new Token(TT_LPAREN, null, this.pos);
				tokens.push(token);
				this.advance();
			}else if(this.current_char == ')'){
				let token = new Token(TT_RPAREN, null, this.pos);
				tokens.push(token);
				this.advance();
			}else{
				// return some error
				let pos_start = this.pos.copy();
				let char = this.current_char;
				this.advance();
				let err = new IllegalCharError(pos_start, this.pos, char);
				console.log(err.as_string());
				return tokens;
			}
		}

		let token = new Token(TT_EOF, null, this.pos);
		tokens.push(token);
		return tokens;
	}
}

class NumberNode{
	constructor(token){
		this.token = token;

		this.pos_start = this.token.pos_start;
		this.pos_end = this.token.pos_end;
	}
}

class BinOp{
	constructor(left_node, op_tok, right_node){
		this.left_node = left_node;
		this.op_tok = op_tok;
		this.right_node = right_node;

		this.pos_start = this.left_node.pos_start;
		this.pos_end = this.right_node.pos_end;
	}
}

class UnaryOpNode{
	constructor(op_tok, node){
		this.op_tok = op_tok;
		this.node = node;

		this.pos_start = this.op_tok.pos_start;
		this.pos_end = node.pos_end;
	}
}

class ParseResult{
	constructor(){
		this.error = null;
		this.node = null;
	}

	register(res){
		if(res instanceof ParseResult){
			if(res.error != null)
				this.error = res.error;
			return res.node;
		}
		return res;
	}
	success(node){
		this.node = node;
		return this;
	}
	failure(error){
		this.error = error;
		return this;
	}
}

//parser
class Parser{
	constructor(tokens){
		this.tokens = tokens;
		this.token_index = -1;
		// this.current_token = null;
		this.advance();
	}

	advance(){
		this.token_index++;
		if(this.token_index < this.tokens.length){
			this.current_token = this.tokens[this.token_index];
		}
		return this.current_token;
	}

	parse(){
		let res = this.expr();
		if(res.error == null && this.current_token.type != TT_EOF){
			let er = new InvalidSyntaxError(this.current_token.pos_start, this.current_token.pos_end, "Expected '+' etc");
			return res.failure(er);
		}
		return res;
	}

	factor(){
		let res = new ParseResult();
		let tok = this.current_token;

		if(tok != null && (tok.type == TT_PLUS || tok.type == TT_MINUS)){
			res.register(this.advance());
			let factor = res.register(this.factor());
			if(res.error != null)
				return res;
			let uni = new UnaryOpNode(tok, factor);
			return res.success(uni);
		}else if(tok != null && (tok.type == TT_INT || tok.type == TT_FLOAT)){
			res.register(this.advance());
			let number_node = new NumberNode(tok);
			return res.success(number_node);
		}else if(tok != null && tok.type == TT_LPAREN){
			res.register(this.advance());
			let exp = res.register(this.expr());
			if(res.error != null) return res;
			if(tok != null && this.current_token.type == TT_RPAREN){
				res.register(this.advance());
				return res.success(exp);
			}else{
				let fail = new InvalidSyntaxError(this.current_token.pos_start, this.current_token.pos_end, "Expected ')'");
				return res.failure();
			}
		}
		let er = new InvalidSyntaxError(0, 0, "Expected int or float");
		return res.failure(er);
	}

	term(){
		let res = new ParseResult();
		let left = res.register(this.factor());
		if(res.error != null)
			return res;
		// console.log(left);
		while(this.current_token.type == TT_MUL || this.current_token.type == TT_DIV){
			let op_tok = this.current_token;
			res.register(this.advance());
			let right = res.register(this.factor());
			if(res.error != null)
				return res;
			// console.log(right);
			left = new BinOp(left, op_tok, right);
		}

		return res.success(left);
	}

	expr(){
		let res = new ParseResult();
		let left = res.register(this.term());
		if(res.error != null)
			return res;
		// console.log(left);
		while(this.current_token.type == TT_PLUS || this.current_token.type == TT_MINUS){
			let op_tok = this.current_token
			res.register(this.advance());
			let right = res.register(this.term());
			if(res.error != null)
				return res;
			// console.log(right);
			left = new BinOp(left, op_tok, right);
		}

		return res.success(left);
	}

	
}

class RTResult{
	constructor(){
		this.value = null;
		this.error = null;
	}

	register(res){
		if(res.error != null) 
			this.error = res.error;
		return res.value;
	}

	success(value){
		this.value = value;
		return this;
	}

	failure(error){
		this.error = error;
		return this;
	}
}

class Number{
	constructor(value){
		this.value = value;
		this.set_pos();
		this.set_context();
	}

	set_pos(pos_start=null, pos_end=null){
		this.pos_start = pos_start;
		this.pos_end = pos_end;
		return this;
	}

	set_context(context=null){
		this.context = context;
		return this;
	}

	added_to(other){
		if(other instanceof Number){
			let num = new Number(this.value + other.value);
			num.set_context(this.context);
			return num;
		}
	}

	subbed_by(other){
		if(other instanceof Number){
			let num = new Number(this.value - other.value);
			num.set_context(this.context);
			return num;
		}
	}

	multed_by(other){
		if(other instanceof Number){
			let num = new Number(this.value * other.value);
			num.set_context(this.context);
			return num;
		}
	}

	dived_by(other){
		if(other instanceof Number){
			if(other.value == 0){
				let r = new RTError(other.pos_start, other.pos_end, "Division by zero", this.context);
				return r;
			}
			let num = new Number(this.value / other.value);
			num.set_context(this.context);
			return num;
		}
	}

	as_string(){
		return String(this.value);
	}
}

class Context{
	constructor(display_name, parent=null, parent_entry_pos=null){
		this. display_name = display_name;
		this.parent = parent;
		this.parent_entry_pos = parent_entry_pos;
	}
}

// Interpreter class
class Interpreter{
	// visit(node){
	// 	let method_name = `visit_${node.constructor.name}()`;
	// 	eval(method_name);
	// }

	visit(node, context) {
        let method_name = `visit_${node.constructor.name}`;
        if (typeof this[method_name] === 'function') {
            return this[method_name](node, context);
        } else {
            throw new Error(`Method ${method_name} not found`);
        }
    }

	visit_NumberNode(node, context){
		let num = new Number(node.token.value);
		num.set_context(context).set_pos(node.pos_start, node.pos_end);
		let rtres = new RTResult();

		return rtres.success(num);
	}

	visit_BinOp(node, context){
		let res = new RTResult();
		let left = res.register(this.visit(node.left_node, context));
		if(res.error != null)
			return res;
		let right = res.register(this.visit(node.right_node, context));
		if(res.error != null)
			return res;
		let result;
		if(node.op_tok.type == TT_PLUS){
			result = left.added_to(right);
		}else if(node.op_tok.type == TT_MINUS){
			result = left.subbed_by(right);
		}else if(node.op_tok.type == TT_PLUS){
			result = left.added_to(right);
		}else if(node.op_tok.type == TT_MUL){
			result = left.multed_by(right);
		}else if(node.op_tok.type == TT_DIV){
			result = left.dived_by(right);
		}
		// console.log(result.constructor.name);
		if(result.constructor.name == "RTError")
			// let rt = new RTError();
			return res.failure(result);
		return res.success(result.set_pos(node.pos_start, node.pos_end));
	}

	visit_UnaryOpNode(node, context){
		let res = new RTResult();
		let number = res.register(this.visit(node.node, context));
		if(res.error != null) return res;

		if(node.op_tok.type == TT_MINUS){
			let n = new Number(-1);
			number = number.multed_by(n);
		}

		if(number == null)
			return res.failure(result);
		return res.success(number.set_pos(node.pos_start, node.pos_end));
	}


}

function run(file_name, text){
	let lexer = new Lexer(file_name, text);
	let tokens = lexer.make_token();
	// return tokens;
	let parser = new Parser(tokens);
	// track what this return!
	let ast = parser.parse();
	// console.log(ast.node.constructor.name);
	if(ast.error != null){
		return ast.error.details;
	}
	let interpreter = new Interpreter();
	let context = new Context("<program>");
	let result = interpreter.visit(ast.node, context);

	// return ast.node;
	// console.log(result.constructor.name);

	if(result.error != null)
		return result.error.as_string();
	return result.value.as_string();
	
	// const fs = require('fs');

	// // const obj = {
	// //   something: 1
	// // };

	// const str = JSON.stringify(ast.node);

	// try {
	//   // reading a JSON file synchronously
	//   fs.writeFileSync("data.json", str);
	// } catch (error) {
	//   // logging the error
	//   console.error(error);

	//   throw error;
	// }
}

module.exports = {
	run
};
