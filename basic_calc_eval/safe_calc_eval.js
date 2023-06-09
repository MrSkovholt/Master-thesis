/* 
Version 2 of the "Totally secure serverside calculator application".
This time with input-sanitization.
Author: Sindre Holtskog
*/

const bodyParser = require('body-parser');
const express = require('express');
const { type } = require('os');

const app = express();
app.use(bodyParser.urlencoded({ extended: true}));

app.get('/', (req, res) => {
    res.send('<h2>Hello world! Go to /calc to see calculator</h2>');
});

app.get('/calc', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});


function calculateResult(to_be_evaluated){
    /* Calls input-sanitization, and if input is deemed non-malicious, calculates result.
    Args: 
        @Arg1: String:to_be_evaluated - sanitized string of userinput
    Return: 
        @Ret1: If eval succeeds: String presenting the result to user
        @Ret2: If eval fails: Error message. 
        
    NB: eval() should never fail! If it does, it means that the sanitization is insufficient..?
    */
   
    var resultString = "";
    try {
        // Since to_be_evaluated is checked prior to use, the danger should now be mitigated.
        var result = eval(to_be_evaluated);

        console.log(`eval(${to_be_evaluated}) succeeded`);
        resultString = '<h1>The result is: ' + result + `\n\n`
        resultString += '<h1><br>Go back to to do another calculation :) </br></h2>';

    } catch (error) {
        console.error(`eval(${to_be_evaluated}) failed`)        
        resultString = `<h1>I'm terribly sorry, but I did not understand that. Please try again! </h2>`;
    }

    return resultString;
}


function sanitize(req){
    /*  Deconstructs the request into separate parameters, sanitizes them and
        ensures they are safe to use as argument for eval(). parseFloat() will extract 
        the numbers from the input, and discard trailing 
    Args:
        @req - request body from user
    Return:
        @Ret1: String:expression - fop+op+lop
        @Ret2: String:"Invalid" - app handles error
    */
    
    var fop = parseFloat(req.body.foperand);
    var lop = parseFloat(req.body.loperand);
    
    if(isNaN(fop) || isNaN(lop)){
        console.error("int() failed, invalid operands detected");
        return "Invalid";
    }
    
    var op = req.body.operator;
    const validOperators = ["+", "-", "*", "/"];
    if (!validOperators.includes(op)){
        console.error("Invalid operator supplied");
        return "Invalid";
    }

    const to_be_evaluated = fop.toString() + op + lop.toString();
    console.log("To_be_evaluated = " + to_be_evaluated);

    return to_be_evaluated;
}


app.post('/calc', function(req, res) {
    /* Receives request from user, deconstructs input to arguments, 
    sends the arguments to be sanitized and evaluated, then responds to user
    Args:
        @req, @res - request from user, response to user
    */
    
    console.log("\nRequest at " + new Date());

    var resultString = ""
    const sanitized = sanitize(req);
    if (sanitized === "Invalid"){
        resultString = `<h1>I'm terribly sorry, but I did not understand that. Please try again! </h2>`;
    }

    else{
        resultString = calculateResult(sanitized);
    }
  
    res.send(resultString);
});


// ENV port is the clean way to do it, can be set on server by running $ export PORT=5000
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));