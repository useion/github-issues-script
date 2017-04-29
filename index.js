var Promise = require('promise'),
	sequential = require('promise-sequential'),
	request = require('request');


function options(url){
	return {
		url: url,
		headers: {
			'User-Agent': 'dashko',
			'username': 'dashko',
			'Authorization': "token fe123c6662bb5333b7e612e864d76c29dc662187"
		}
	}
}

function getIssuesPageCount (owner, repo) {
	return new Promise(function (resolve, reject) {

		var url = "https://api.github.com/repos/"+owner+"/"+repo+"/issues?state=all&page=1";

		request(options(url), function (error, response, body) {
			if (!error && response.statusCode == 200) {
				var pageCount = response.headers.link.substring(0, response.headers.link.length-13).match(/[0-9]+$/)[0];
				resolve(pageCount);
			} else {
				console.log(response)
				console.log("Error ", error);
				reject(error);
			}
		});
	})


}

function getIssues(owner, repo, page) {
	return new Promise(function (resolve, reject) {

		var url = "https://api.github.com/repos/"+owner+"/"+repo+"/issues?state=all&page="+page;

		request(options(url), function (error, response, body) {
			if (!error && response.statusCode == 200) {
				var issuesObj = JSON.parse(body);
				resolve(issuesObj);
			} else {
				console.log("Error ", error);
				reject(error);
			}
		});
	})
}

var words = require('fs').readFileSync('dict.txt', 'utf8').replace(/[^a-zA-Z\s]/g, '').replace(/\s+/g, ' ').toLowerCase().split(' ');
words.pop();
//console.log("Loaded dict.txt", words);

function processIssue (issue) {
	if (!issue.body) return {r:0,found:0};
	var issue_body = issue.body.replace(/[^a-zA-Z\s]/g, '').replace(/\s+/g, ' ').toLowerCase().split(' ');
	var found = 0, all = issue_body.length;
	for (var i in words) {
		if(include(issue_body, words[i]))
			found++;
	}
	return {r:found/all,found:found};
}

function include(arr,obj) {
	return (arr.indexOf(obj) != -1);
}

function main() {

	var owner = 'opencart', repo = 'opencart';

	getIssuesPageCount(owner, repo).then(function (pageCount) {
		console.log('Number of pages:', pageCount);
		//pageCount = 19;

		var seq = [],
			inSeq = function (owner, repo, i) { return function () {
				console.log('Processing page...', i);

				return new Promise(function (f, r) {
					getIssues(owner, repo, i).then(function (issues) {
						console.log('Issues in the page: '+issues.length);
						for (var i in issues) {
							issues[i].r = processIssue(issues[i]);
						}
						console.log("Proc. finished")
						f(issues);
					})
				});
			}};

		for (var i = 1; i<=pageCount; i++) {
			seq.push(inSeq(owner, repo, i));
		}

		return sequential(seq).then(function (issues, a) {

			var one = 0, found_count = 0, found_sum = 0;

			for (var j in issues) {
				var issue_r = issues[j].r;
				if (issue_r.r>0) {
					one++;
					found_count++;
					found_sum += issue_r.found;
				}
			}

			console.log('All issues: ', issues.length);
			console.log('At least one word was found in ', one, ' issues');
			console.log('Average word count that was found: ', found_sum/found_count)

			console.log('Done!');
		});

	});
}

main();

