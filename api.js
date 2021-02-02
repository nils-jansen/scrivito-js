const axios = require("axios").default;
class Scrivito {
	#tenantID;
	#workspaceID;
	#apiKey;

	constructor(tenantID, apiKey, workspaceID = "published") {
		if (tenantID && apiKey) {
			this.#tenantID = tenantID;
			this.#apiKey = apiKey;
			this.#workspaceID = workspaceID;
		} else {
			throw new Error("Tenant ID and API Key are required.");
		}
	}

	/**
	 * @returns currently set workspace
	 */
	getWorkspace() {
		return this.#workspaceID;
	}

	/**
	 * @returns currently set tenant ID
	 */
	getTenant() {
		return this.#tenantID;
	}

	/**
	 *
	 * @param {String} workspaceID - ID of the workspace to use for following operations
	 */
	setWorkspace(workspaceID) {
		this.#workspaceID = workspaceID;
	}

	/**
	 * Sets the Tenant/API Key to new credentials.
	 *
	 * @param {String} tenantID - Scrivito Tenant ID
	 * @param {String} apiKey - Scrivito API Key / Token
	 */
	setTenant(tenantID, apiKey) {
		this.#tenantID = tenantID;
		this.#apiKey = apiKey;
	}

	/**
	 * Returns a Promise which resolves to the requested object in JSON Format.
	 *
	 * @param {String} id - The ID of the object to get
	 */
	async getObject(id) {
		return new Promise(async (resolve, reject) => {
			try {
				let response = await axios.get(
					`https://api.scrivito.com/tenants/${
						this.#tenantID
					}/workspaces/${this.#workspaceID}/objs/${id}`,
					{
						auth: {
							username: "api_token",
							password: this.#apiKey,
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
	 */
	async deleteObject(id) {
		return new Promise(async (resolve, reject) => {
			if (this.#workspaceID == "published") {
				reject(
					'Workspace can\'t be "published" when deleting an object.'
				);
			}
			try {
				let response = await axios.delete(
					`https://api.scrivito.com/tenants/${
						this.#tenantID
					}/workspaces/${this.#workspaceID}/objs/${id}`,
					{
						auth: {
							username: "api_token",
							password: this.#apiKey,
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
	 */
	async updateObject(obj) {
		if (this.#workspaceID == "published") {
			reject('Workspace can\'t be "published" when updating an object.');
		}
		return new Promise(async (resolve, reject) => {
			if (obj && obj._id) {
				try {
					let response = await axios.post(
						`https://api.scrivito.com/tenants/${
							this.#tenantID
						}/workspaces/${this.#workspaceID}/objs`,
						obj,
						{
							auth: {
								username: "api_token",
								password: this.#apiKey,
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
	 * Returns a promise which resolves if the new workspace is successfully created.
	 *
	 * @param {String} title - The title of the workspace to be created
	 */
	async createWorkspace(title) {
		return new Promise(async (resolve, reject) => {
			if (title) {
				try {
					let response = await axios.post(
						`https://api.scrivito.com/tenants/${
							this.#tenantID
						}/workspaces`,
						{
							workspace: {
								auto_update: true, // what is this?
								title: title,
							},
						},
						{
							auth: {
								username: "api_token",
								password: this.#apiKey,
							},
						}
					);

					var interval = setInterval(async () => {
						try {
							let task = await axios.get(
								`https://api.scrivito.com/tenants/${
									this.#tenantID
								}/tasks/${response.data.task.id}`,
								{
									auth: {
										username: "api_token",
										password: this.#apiKey,
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
								reject("Task failed internally.");
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
	 */
	async publishWorkspace(id) {
		if (this.#workspaceID == "published") {
			reject('Can\'t publish workspace "published".');
		}
		return new Promise(async (resolve, reject) => {
			if (id) {
				try {
					let response = await axios.put(
						`https://api.scrivito.com/tenants/${
							this.#tenantID
						}/workspaces/${id}/publish`,
						undefined,
						{
							auth: {
								username: "api_token",
								password: this.#apiKey,
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
	 *
	 * @param {Object[]} query - The query is an array of objects: [Scrivito Docs](https://www.scrivito.com/search-objects-ec774706d7cb5434)
	 * @returns An array of IDs
	 */
	async getIdsByQuery(query) {
		return this.#getIdsByQueryHelper(query, undefined);
	}

	async #getIdsByQueryHelper(query, continuation) {
		return new Promise(async (resolve, reject) => {
			if (!query) {
				reject("No query provided");
			}
			try {
				let response = await axios.post(
					`https://api.scrivito.com/tenants/${
						this.#tenantID
					}/workspaces/${this.#workspaceID}/objs/search`,
					{
						query: query,
						continuation: continuation,
					},
					{
						auth: {
							username: "api_token",
							password: this.#apiKey,
						},
					}
				);
				if (response.data.continuation) {
					resolve(
						response.data.results.concat(
							await this.#getIdsByQueryHelper(
								query,
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
	 *
	 * @param {Object[]} query - The query is an array of objects: [Scrivito Docs](https://www.scrivito.com/search-objects-ec774706d7cb5434)
	 * @returns An array of objects
	 */
	async getObjectsByQuery(query) {
		return this.#getObjectsByQueryHelper(query, undefined);
	}

	async #getObjectsByQueryHelper(query, continuation) {
		return new Promise(async (resolve, reject) => {
			if (!query) {
				reject("No query provided");
			}
			try {
				let response = await axios.post(
					`https://api.scrivito.com/tenants/${
						this.#tenantID
					}/workspaces/${this.#workspaceID}/objs/search`,
					{
						query: query,
						continuation: continuation,
						include_objs: true,
					},
					{
						auth: {
							username: "api_token",
							password: this.#apiKey,
						},
					}
				);
				if (response.data.continuation) {
					resolve(
						response.data.objs.concat(
							await this.#getObjectsByQueryHelper(
								query,
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
}
