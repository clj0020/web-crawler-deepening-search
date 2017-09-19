var express = require('express');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var shortid = require('shortid');
const url = require('url');
const bodyParser = require('body-parser');
var app = express();

var numCrawled = 0;
var filepaths = [];

app.use(bodyParser.urlencoded({
	extended: true
}));

app.use(bodyParser.json());

app.post('/scrape', function(req, res) {
	var rootUrl = req.body.rootUrl; // url to scrape
	var depth = req.body.depth; // depth to search

	// get the date and parse to milliseconds for naming of folder
	var date = new Date();
	date = Date.parse(date);

	// create a directory to hold html of scraped sites.
	fs.mkdir("html/" + date, function(error) {
		if (error) {
				console.log(err);
		}
		else {
			// begin deepening search.
			iterativeDeepeningDepthFirstSearch(rootUrl, depth, date);
		}
	});
});

function iterativeDeepeningDepthFirstSearch(url, depth, date) {
    // Repeatedly depth-first search up-to a maximum depth of specified.
    for (var maxDepth = 1; maxDepth < depth; maxDepth++) {
				depthFirstSearch(url, date, maxDepth);
    }
}

function depthFirstSearch(url, date, maxDepth) {
	// console.log("Crawling " + url);
	numCrawled++;

	if (maxDepth <= 0) {
		return;
	}

	findChildren(url, date, function(children) {
		for (var i = 0; i < children.length; i++) {
				depthFirstSearch(children[i], date, maxDepth - 1);
		}
	});
}

function findChildren(rootUrl, date, callback) {
	var hrefs = [];

	request(rootUrl, function(error, response, html) {
		if( !error ) {
			var $ = cheerio.load(html);

			var links = $('a'); //jquery get all hyperlinks

			$(links).each(function(i, link){
				var href = $(link).attr('href');

				if (href !== undefined) {
					if (!href.startsWith("http")) {
						if (href.startsWith("/")) {
							// add the rootUrl to the beginning of the href.
							hrefs.push(rootUrl.concat(href));
						}
						else if (href.startsWith("#")) {
							// ignore # links
						}
						else {
							// add rootUrl/ to the beginning of the href.
							hrefs.push(rootUrl.concat("/" + href));
						}
					}
					else {
							hrefs.push(href);
					}
				}
  		});
		}
		else {
			console.error(error);
		}

		// create a random id for the filename
		var id = shortid.generate();
		var filepath = "html/" + date + "/" + id + ".txt";
		filepaths.push(filepath);

		// Write the html to a unique file
		// Parameter 1 :  html/date/randomId.txt - this is what the created filename will be called
		// Parameter 2 :  html - the data to write
		// Parameter 3 :  callback function - a callback function to let us know the status of our function
		fs.writeFile(filepath, html, function(err) {
			if (err) {
				console.log(err);
			}
			else {
				console.log('File successfully written! - Check the html directory for ' + id + ".txt");
			}
		});

		// send array back in the callback
		if (typeof callback === "function") {
		    // Call it, since we have confirmed it is callable​
		    callback(hrefs);
		}
	});
}

app.post('/extractWords', function(req, res) {
	var filepath = req.body.filepath;

	extractWords(filepath);
})

function extractWords(filepath) {
	fs.readFile(filepath, 'utf8', function(err, data) {
		if (err) {
			console.log(err);
		}

		// Split all of the data by spaces
		var array = data.toString().split(" ");

		// create a dictionary
		var dictionary = [{}];

		// iterate through the array and check against dictionary,
		// if a value is already in the dictionary, then increment the count of the word.
		// else add the word to the dictionary with a count of 1.
		for (var i = 0; i < array.length; i++) {
			if (array[i].startsWith(' ')) {

			}
			else {
				var response = isWordInDictionary(array[i], dictionary);
				if (response.found) {
					dictionary[response.index].count = dictionary[response.index].count + 1;
				}
				else {
					var word = {
						value: array[i],
						count: 1
					}

					dictionary.push(word);
					}
			}
		}

		console.log("Total number of words: " + array.length);
		console.log("Total number of unique words: " + dictionary.length);

		dictionary.sort(function(a, b) {
			return b.count - a.count;
		});

		console.log("Most Used Words");
		for (var i = 0; i < 5; i++) {
			console.log(i + ". " + dictionary[i].value);
			console.log(dictionary[i].value + " is used " + dictionary[i].count + " times.");
		}
	});
}

function isWordInDictionary(string, dictionary) {
	var found = false;
	var index;
	for(var i = 0; i < dictionary.length; i++) {
    if (dictionary[i].value == string) {
        found = true;
				index = i;
        break;
    }
	}

	return {
		found: found,
		index: index
	};
}


app.listen('8081');

console.log('Magic happens on port 8081');

exports = module.exports = app;
