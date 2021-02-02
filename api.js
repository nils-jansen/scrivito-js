const axios = require("axios").default;

/**
 * Returns a Promise which resolves to the requested object.
 *
 * @param {String} id - The ID of the object to get
 * @param {String} workspace - ID of the workspace to get the object from, "published" by default.
 * @param {String} tenant - Scrivito Tenant ID
 * @param {String} apiKey - Scrivito Tenant Rest API Key
 */
async function getObject(id, workspace = "published", tenant, apiKey) {
	return new Promise(async (resolve, reject) => {
		try {
			let response = await axios.get(
				`https://api.scrivito.com/tenants/${tenant}/workspaces/${workspace}/objs/${id}`,
				{
					auth: {
						username: "api_token",
						password: apiKey,
					},
				}
			);
			if (Math.floor(response.status / 100) == 2) {
				resolve(response.data);
			} else {
				reject(response);
			}
		} catch (error) {
			reject(error.response.data.code || error);
		}
	});
}

/**
 * Returns a promise which resolves if the Object is deleted successfully.
 *
 * @param {String} id - The ID of the object to be deleted
 * @param {String} workspace - ID of the workspace to delete the object from, "published" by default.
 * @param {String} tenant - Scrivito Tenant ID
 * @param {String} apiKey - Scrivito Tenant Rest API Key
 */
async function deleteObject(id, workspace = "published", tenant, apiKey) {
	return new Promise(async (resolve, reject) => {
		if (workspace == "published") {
			reject('Workspace can\'t be "published" when deleting an object.');
		}
		try {
			let response = await axios.delete(
				`https://api.scrivito.com/tenants/${tenant}/workspaces/${workspace}/objs/${id}`,
				{
					auth: {
						username: "api_token",
						password: apiKey,
					},
				}
			);
			if (Math.floor(response.status / 100) == 2) {
				// TODO: Test if success response is actually 2xx code
				resolve();
			} else {
				reject(response);
			}
		} catch (error) {
			reject(error.response.data.code || error);
		}
	});
}

/**
 * Returns a promise which resolves if the Object is updated successfully.
 * The id is extracted from the Object parameter.
 *
 * @param {Object} obj - Object to update. Needs to have a "_id" property
 * @param {String} workspace - ID of the workspace to update the object in, must not be left blank.
 * @param {String} tenant - Scrivito Tenant ID
 * @param {String} apiKey - Scrivito Tenant Rest API Key
 */
async function updateObject(obj, workspace = "published", tenant, apiKey) {
	if (workspace == "published") {
		reject('Workspace can\'t be "published" when updating an object.');
	}
	return new Promise(async (resolve, reject) => {
		if (obj && obj._id) {
			try {
				let response = await axios.post(
					`https://api.scrivito.com/tenants/${tenant}/workspaces/${workspace}/objs`,
					obj,
					{
						auth: {
							username: "api_token",
							password: apiKey,
						},
					}
				);
				if (Math.floor(response.status / 100) == 2) {
					// TODO: Test if success response is actually 2xx code
					resolve(obj);
				} else {
					reject(response);
				}
			} catch (error) {
				reject(error);
			}
		} else {
			reject('Object needs to have a "_id" property.');
		}
	});
}

/**
 * Returns a promise which resolves to the new workspace ID
 *
 * @param {String} title - The title of the workspace to be created
 * @param {String} tenant - Scrivito Tenant ID
 * @param {String} apiKey - Scrivito Tenant Rest API Key
 */
async function createWorkspace(title, tenant, apiKey) {
	return new Promise(async (resolve, reject) => {
		if (title) {
			try {
				let response = await axios.post(
					`https://api.scrivito.com/tenants/${tenant}/workspaces`,
					{
						workspace: {
							auto_update: true, // what is this?
							title: title,
						},
					},
					{
						auth: {
							username: "api_token",
							password: apiKey,
						},
					}
				);

				var interval = setInterval(async () => {
					try {
						let task = await axios.get(
							`https://api.scrivito.com/tenants/${tenant}/tasks/${response.data.task.id}`,
							{
								auth: {
									username: "api_token",
									password: apiKey,
								},
							}
						);
						if (
							task.data.status == "open" ||
							(task.data.status == "success" &&
								task.data.result.id)
						) {
							resolve(task.data.result.id);
						} else {
							reject("Failed to create working copy.");
						}
						clearInterval(interval);
					} catch (error) {
						reject(error);
						clearInterval(interval);
					}
				}, 500);
			} catch (error) {
				reject(error);
			}
		} else {
			reject("Workspace title is required.");
		}
	});
}

/**
 * @param {String} id - ID of the workspace to be published
 * @param {String} tenant - Scrivito Tenant ID
 * @param {String} apiKey - Scrivito Tenant Rest API Key
 */
async function publishWorkspace(id, tenant, apiKey) {
	return new Promise(async (resolve, reject) => {
		if (id) {
			try {
				let response = await axios.put(
					`https://api.scrivito.com/tenants/${tenant}/workspaces/${id}/publish`,
					undefined,
					{
						auth: {
							username: "api_token",
							password: apiKey,
						},
					}
				);
				if (Math.floor(response.status / 100) == 2) {
					// TODO: Test if success response is actually 2xx code
					resolve();
				} else {
					reject(response);
				}
			} catch (error) {
				reject(error);
			}
		} else {
			reject("Workspace ID is required.");
		}
	});
}

/**
 * @returns An array of IDs
 * @param {Object[]} query - The query is an array of objects: [Scrivito Docs](https://www.scrivito.com/search-objects-ec774706d7cb5434)
 * @param {String} workspace - ID of the workspace to get the objects from, "published" by default.
 * @param {String} tenant - Scrivito Tenant ID
 * @param {String} apiKey - Scrivito Tenant Rest API Key
 */
async function getIdsByQuery(query, workspace = "published", tenant, apiKey) {
	return getIdsByQueryHelper(query, workspace, tenant, apiKey, undefined);
}

async function getIdsByQueryHelper(
	query,
	workspace,
	tenant,
	apiKey,
	continuation
) {
	return new Promise(async (resolve, reject) => {
		if (!query) {
			reject("No query provided");
		}
		try {
			let response = await axios.post(
				`https://api.scrivito.com/tenants/${tenant}/workspaces/${workspace}/objs/search`,
				{
					query: query,
					continuation: continuation,
				},
				{
					auth: {
						username: "api_token",
						password: apiKey,
					},
				}
			);
			if (response.data.continuation) {
				resolve(
					response.data.results.concat(
						await getIdsByQueryHelper(
							query,
							workspace,
							tenant,
							apiKey,
							response.data.continuation
						)
					)
				);
			} else {
				resolve(response.data.results);
			}
		} catch (error) {
			reject(error);
		}
	});
}

/**
 * @returns An array of objects
 * @param {Object[]} query - The query is an array of objects: [Scrivito Docs](https://www.scrivito.com/search-objects-ec774706d7cb5434)
 * @param {String} workspace - ID of the workspace to get the objects from, "published" by default.
 * @param {String} tenant - Scrivito Tenant ID
 * @param {String} apiKey - Scrivito Tenant Rest API Key
 */
async function getObjectsByQuery(
	query,
	workspace = "published",
	tenant,
	apiKey
) {
	return getObjectsByQueryHelper(query, workspace, tenant, apiKey, undefined);
}

async function getObjectsByQueryHelper(
	query,
	workspace,
	tenant,
	apiKey,
	continuation
) {
	return new Promise(async (resolve, reject) => {
		if (!query) {
			reject("No query provided");
		}
		try {
			let response = await axios.post(
				`https://api.scrivito.com/tenants/${tenant}/workspaces/${workspace}/objs/search`,
				{
					query: query,
					continuation: continuation,
					include_objs: true,
				},
				{
					auth: {
						username: "api_token",
						password: apiKey,
					},
				}
			);
			if (response.data.continuation) {
				resolve(
					response.data.objs.concat(
						await getObjectsByQueryHelper(
							query,
							workspace,
							tenant,
							apiKey,
							response.data.continuation
						)
					)
				);
			} else {
				resolve(response.data.objs);
			}
		} catch (error) {
			reject(error);
		}
	});
}

module.exports = {
	getObject: getObject,
	deleteObject: deleteObject,
	updateObject: updateObject,
	createWorkspace: createWorkspace,
	publishWorkspace: publishWorkspace,
	getIdsByQuery: getIdsByQuery,
	getObjectsByQuery: getObjectsByQuery,
};
