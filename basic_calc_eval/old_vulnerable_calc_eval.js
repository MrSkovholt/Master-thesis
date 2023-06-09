// Basic calculator app, using eval() to experiment with possible exploits
// Author: Sindre Holtskog

/*
* IDEA: [Client] -> [Server] -> [Server calculating] -> [Server responds] -> [Client reads response]
* Analyze possible vulnerabilities, read about possibilities, test them, and write some documentation for them. 
* Can i access filesystem? RCE? Reverse shell?
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


app.post('/calc', function(req, res) {
    /* 
    Receive userinput, eval() with error-handling and send response. 
    This is a great example of very bad practice, where unsanitized userinput is sent directly to eval()
    * Errors where the input supplied is invalid JS-code is one thing, but there is a lot of malicious valid JS-code...  
    */
    var fop = req.body.foperand 
    var op = req.body.operator 
    var lop = req.body.loperand;
    
    var to_be_evaluated = fop + op + lop;
    console.log("To_be_evaluated = " + to_be_evaluated);
    var resultString = `<h2>Question: ${to_be_evaluated} </h2>`;

    try {
        // DANGER ZONE
        var result = eval(to_be_evaluated);
        // would be a shame if a childProcess.execSync() snuck in here... 

        console.log(`eval(${to_be_evaluated}) succeeded`);
        resultString += '<h2>The result is: ' + result + `\n\n`
        resultString += '<h2><br>Go back to to do another calculation :) </br></h2>';

    } catch (error) {
        console.log(`eval(${to_be_evaluated}) failed`)        
        resultString = `<h2>I'm terribly sorry, but I did not understand that. Please try again! </h2>`;
    }
  
    res.send(resultString);
});


// ENV port is the clean way to do it, can be set on server by running $ export PORT=5000
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));