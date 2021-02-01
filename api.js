const request = require("request");
const Promise = require("bluebird");
const cliProgress = require("cli-progress");
const exec = require("child_process").exec;

let conf = {
	workspace: "published",
};
// overwrite default/fallback config
const setConf = (_conf) => {
	conf = _conf;
};

const progressBar = new cliProgress.SingleBar(
	{},
	cliProgress.Presets.shades_classic
);

const getInfo = () => {
	return conf;
};

const setWorkspace = (workspace = "published") => {
	conf.workspace = workspace;
};
/*
def response_for_request_cms_api(method, path, payload)
    req = method.new(URI.parse("#{@base_url}/tenants/#{@tenant}/#{path}"))
    req.basic_auth("api_token", @api_key)
    req["Content-type"] = "application/json"
    req["Accept"] = "application/json"
    req.body = JSON.dump(payload) if payload.present?
    response = retry_on_rate_limit(Time.now + 25.seconds) do
      perform_request(req)
    end
*/
const _cmsApi = (method, path, payload = {}) =>
	new Promise((resolve, reject) => {
		request(
			{
				method: method,
				url: "https://api.scrivito.com/tenants/" + conf.id + path,
				headers: {
					Authorization:
						"Basic " +
						Buffer.from("api_token:" + conf.apiKey).toString("base64"),
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			},
			function (error, response, body) {
				if (error) {
					reject(path + " connection failed with " + error);
				} else if (
					response &&
					response.statusCode &&
					response.statusCode > 299
				) {
					reject(
						path +
							" connection returned with " +
							response.statusCode +
							" error: " +
							response.body
					);
				} else {
					try {
						resolve(JSON.parse(body));
					} catch (_error) {
						reject(path + " parsing error: " + _error);
					}
				}
			}
		);
	});

// internal
const ___searchIds = (query, continuation) =>
	new Promise((resolve, reject) => {
		const payload = {
			continuation,
			continuation,
			query: query,
		};
		_cmsApi("POST", "/workspaces/" + conf.workspace + "/objs/search", payload)
			.then((body) => {
				resolve(body);
			})
			.catch((error) => {
				reject(error);
			});
	});

async function __searchIds(query) {
	let body = {};
	let finished = false;
	do {
		try {
			body = await ___searchIds(query);
			finished = true;
		} catch (e) {
			console.debug("query: ", e, "retry ... ");
		}
	} while (!finished);
	return body;
}
const _searchIds = (query) =>
	new Promise((resolve) => {
		resolve(__searchIds(query));
	});

// internal
async function _searchIdsLoop(query, total, results) {
	let continuation = total;
	do {
		try {
			const body = await ___searchIds(query, "[1," + continuation * 10 + "]");
			if (body.results) {
				results = results.concat(body.results);
			}
			continuation = continuation - 1;
			console.debug(
				"Object query: processing page ",
				total - continuation,
				"/",
				total
			);
		} catch (e) {
			console.debug("query: retry ... ");
		}
	} while (continuation > 0);
	return results.map((result) => result["id"]);
}

// internal
async function _getPageObjs(ids, objs = [], logging_enabled = true) {
	if (logging_enabled) {
		console.log("\n\nCollecting page objects...");
		progressBar.start(ids.length, 0);
	}
	do {
		try {
			const obj = await getPageObj(ids[0]);
			if (obj) {
				objs.push(obj);
				ids.shift();
				if (logging_enabled) {
					progressBar.update(objs.length); // collecting obj #objs.length, ids.length items pending
				}
			}
		} catch (e) {
			console.debug("collect: retry ... ");
		}
	} while (ids.length);
	if (logging_enabled) {
		progressBar.stop();
		console.log("Done.\n\n");
	}
	return objs;
}

// internal
async function _updatePageObjs(objs) {
	do {
		try {
			if (objs.length % 100 == 0) {
				console.log("\t importing pages ...", objs.length, "objs to go");
			}
			const body = await updatePageObj(objs[0]);
			if (body) {
				objs.shift();
			}
		} catch (e) {
			// (size_limit_exceeded)
			if (e.search("size_limit_exceeded") != -1) {
				console.error(
					"[ERROR]",
					"Api.updatePageObj for '" +
						objs[0]._permalink +
						"' failed - size_limit_exceeded",
					e
				);
				objs.shift();

				// (multiple_reference)
			} else if (e.search("multiple_reference") != -1) {
				console.error(
					"[ERROR]",
					"Api.updatePageObj for '" +
						objs[0]._permalink +
						"' failed - multiple_reference",
					e
				);
				objs.shift();
			} else {
				// don't show TIMEOUT errors
				if (e.search("ETIMEDOUT") == -1) {
					console.warn(
						"[WARN]",
						"Api.updatePageObj for '" +
							objs[0]._permalink +
							"' failed - repeating ...",
						e
					);
				}
				const obj = objs[0];
				objs.shift();
				objs.push(obj);
			}
		}
	} while (objs.length);
}

// title = Master Pull Reuse - switzerland_de
const getWorkspaceByTitle = (title) =>
	new Promise((resolve, reject) => {
		_cmsApi("GET", "/workspaces")
			.then((body) => {
				if (body && body.results) {
					let id = "";
					body.results.forEach((element) => {
						if (element.id && element.title && element.title == title) {
							id = element.id;
						}
					});
					resolve(id);
				} else {
					reject("getWorkspaceByTitle: no data");
				}
			})
			.catch((error) => {
				reject(error);
			});
	});

// title = Master Pull Reuse - switzerland_de [switzerland]
const searchPageByContentIdAndPath = (contentId, path) =>
	new Promise((resolve, reject) => {
		const payload = {
			query: [
				{
					field: "content_id",
					operator: "equals",
					value: contentId,
				},
				{
					field: "_path",
					operator: "starts_with",
					value: path,
				},
			],
		};
		_cmsApi("POST", "/workspaces/" + conf.workspace + "/objs/search", payload)
			.then((body) => {
				//console.log("searchPageByContentIdAndPath", contentId, body );
				if (body && body.results && body.results[0] && body.results[0].id) {
					resolve(body.results[0].id);
				} else {
					resolve();
				}
			})
			.catch((error) => {
				reject(error);
			});
	});

// https://www.scrivito.com/scrivito-as-a-headless-cms-the-restful-api-7b7802659befeb98
const searchPageIdsByPath = (path) =>
	new Promise((resolve, reject) => {
		// define query
		const query = [
			{
				field: "_path",
				operator: "starts_with",
				value: path,
			},
		];
		_searchIds(query)
			.then((body) => {
				if (body && body.results) {
					// more than 10 entries -> continue with the query
					if (body && body.total && body.continuation) {
						// async - await
						resolve(
							_searchIdsLoop(query, Math.ceil(body.total / 10), body.results)
						);
					} else {
						resolve(body.results.map((result) => result["id"]));
					}
				} else {
					reject("searchPageObjs: no data");
				}
			})
			.catch((error) => {
				reject(error);
			});
	});

const searchPageIdsByPathAndType = (path, type) =>
	new Promise((resolve, reject) => {
		// define query
		const query = [
			{
				field: "_path",
				operator: "starts_with",
				value: path,
			},
			{
				field: "_obj_class",
				operator: "equals",
				value: type,
			},
		];
		_searchIds(query)
			.then((body) => {
				if (body && body.results) {
					// more than 10 entries -> continue with the query
					if (body && body.total && body.continuation) {
						// async - await
						resolve(
							_searchIdsLoop(query, Math.ceil(body.total / 10), body.results)
						);
					} else {
						resolve(body.results.map((result) => result["id"]));
					}
				} else {
					reject("searchPageObjs: no data");
				}
			})
			.catch((error) => {
				reject(error);
			});
	});

const searchPageIdsByQuery = (query) =>
	new Promise((resolve, reject) => {
		_searchIds(query)
			.then((body) => {
				if (body && body.results) {
					// more than 10 entries -> continue with the query
					if (body && body.total && body.continuation) {
						// async - await
						resolve(
							_searchIdsLoop(query, Math.ceil(body.total / 10), body.results)
						);
					} else {
						resolve(body.results.map((result) => result["id"]));
					}
				} else {
					reject("searchPageObjs: no data");
				}
			})
			.catch((error) => {
				reject(error);
			});
	});

// https://www.scrivito.com/scrivito-as-a-headless-cms-the-restful-api-7b7802659befeb98
const getPageObj = (id) =>
	new Promise((resolve, reject) => {
		_cmsApi("GET", "/workspaces/" + conf.workspace + "/objs/" + id)
			.then((body) => {
				if (body) {
					resolve(body);
				} else {
					reject("getPageObj: no data");
				}
			})
			.catch((error) => {
				reject(error);
			});
	});

// https://www.scrivito.com/scrivito-as-a-headless-cms-the-restful-api-7b7802659befeb98
const getPublishedPageObj = (id) =>
	new Promise((resolve, reject) => {
		_cmsApi("GET", "/workspaces/publishedobjs/" + id)
			.then((body) => {
				if (body) {
					resolve(body);
				} else {
					reject("getPageObj: no data");
				}
			})
			.catch((error) => {
				reject(error);
			});
	});

const getPageObjs = (ids, logging_enabled = true) =>
	new Promise((resolve) => {
		resolve(_getPageObjs(ids, [], logging_enabled));
	});

//  api.post("workspaces/#{workspace_id}/objs", "obj" => attrs)
const updatePageObj = (obj) =>
	new Promise((resolve, reject) => {
		_cmsApi("POST", "/workspaces/" + conf.workspace + "/objs", { obj: obj })
			.then((body) => {
				if (body) {
					resolve(body);
				} else {
					reject("getPageObj: no data");
				}
			})
			.catch((error) => {
				reject(error);
			});
	});

const updatePageObjs = (objs) =>
	new Promise((resolve) => {
		resolve(_updatePageObjs(objs));
	});

const createWorkspace = (title, workspace_id) =>
	new Promise((resolve, reject) => {
		if (workspace_id) {
			resolve(workspace_id);
		} else {
			// workspace_id = api.post("workspaces", "workspace" => { "auto_update" => true, "title" => "#{ARGV[2]}" })["id"]
			_cmsApi("POST", "/workspaces", {
				workspace: { auto_update: true, title: title },
			}).then((body) => {
				/*      "task": {
							"id": "0b90038f7dea17b9",
							"status": "open"
						}
				 */
				if (body && body.task && body.task.id) {
					const interval = setInterval(() => {
						_cmsApi("GET", "/tasks/" + body.task.id)
							.then((_body) => {
								if (_body && _body.status) {
									if (
										_body.status == "success" &&
										_body.result &&
										_body.result.id
									) {
										clearInterval(interval);
										resolve(_body.result.id);
									}
								} else {
									clearInterval(interval);
									console.error("API: /tasks/" + taskId + " failed: ", _body);
									reject(_body);
								}
							})
							.catch((error) => {
								if (
									error.search("ETIMEDOUT") == -1 &&
									error.search("rate_limit_exceede") == -1
								) {
									clearInterval(interval);
									console.error("API: /tasks/" + taskId + " failed: ", error);
									reject(error);
								}
							});
					}, 2000);
				} else {
					console.error("API: /workspaces failed: ", body);
					reject(body);
				}
			});
		}
	});

//  api.put("workspaces/#{workspace_id}/publish", nil)
const publishWorkspace = () =>
	new Promise((resolve, reject) => {
		exec(
			"ruby scrivito_publishWorkspace.rb " +
				conf.id +
				" " +
				conf.apiKey +
				" " +
				conf.workspace,
			function callback(error, stdout, stderr) {
				if (error) {
					reject("unable to publish scrivito working copy: " + error);
					return;
				}
				if (stderr) {
					reject("unable to publish scrivito working copy: " + stderr);
				}
				resolve(stdout.trim());
			}
		);
		/*
    _cmsApi("PUT", "/workspaces/" + conf.workspace + "/publish").then((body) => {
        resolve(body);
    })
    .catch((error) => { 
        reject(error);
    });
    */
	});

//  api.post("workspaces/#{workspace_id}/objs", "obj" => attrs)
const __deletePageObj = (id) =>
	new Promise((resolve, reject) => {
		_cmsApi("DELETE", "/workspaces/" + conf.workspace + "/objs/" + id)
			.then((body) => {
				resolve();
			})
			.catch((error) => {
				reject(error);
			});
	});

async function _deletePageObj(id) {
	let passed = false;
	do {
		try {
			await __deletePageObj(id);
			passed = true;
		} catch (e) {
			if (e.search("precondition_not_met.obj_not_found") != -1) {
				console.log("[DEBUG]", "no '" + id + "' found - skipping");
				passed = true;
			}
			// (TIMEOUT errors)
			else if (
				e.search("rate_limit_exceeded") != -1 ||
				e.search("ETIMEDOUT") != -1
			) {
				console.error(
					"[WARN]",
					"Api.deletePageObj for '" +
						id +
						"' temporary failed  - repeating ...",
					e
				);
			} else {
				console.warn(
					"[ERROR]",
					"Api.updatePageObj for '" + id + "' failed:",
					e
				);
				passed = true;
			}
		}
	} while (!passed);
}

const deletePageObj = (id) =>
	new Promise((resolve) => {
		resolve(_deletePageObj(id));
	});

/*
        def self.delete_object(data)
          {
            method: 'delete',
            path: "workspaces/#{data['workspace_id']}/objs/#{data['obj_id']}",
            payload: nil
          }
        end

*/

module.exports = {
	setConf: setConf,
	setWorkspace: setWorkspace,
	getPageObj: getPageObj,
	getPublishedPageObj: getPublishedPageObj,
	getPageObjs: getPageObjs,
	deletePageObj: deletePageObj,
	updatePageObj: updatePageObj,
	updatePageObjs: updatePageObjs,
	createWorkspace: createWorkspace,
	publishWorkspace: publishWorkspace,
	getWorkspaceByTitle: getWorkspaceByTitle,
	searchPageByContentIdAndPath: searchPageByContentIdAndPath,
	searchPageIdsByPathAndType: searchPageIdsByPathAndType,
	searchPageIdsByQuery: searchPageIdsByQuery,
	searchPageIdsByPath: searchPageIdsByPath,
	getInfo: getInfo,
};
