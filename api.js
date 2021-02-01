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
					undefined,
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
				reject(error);
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
			try {
				let response = axios.delete(
					`https://api.scrivito.com/tenants/${
						this.#tenantID
					}/workspaces/${this.#workspaceID}/objs/${id}`,
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
		});
	}

	/**
	 * Returns a promise which resolves if the Object is updated successfully.
	 * The id is extracted from the Object parameter.
	 *
	 * @param {Object} obj - Object to update. Needs to have a "_id" property
	 */
	async updateObject(obj) {
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
						resolve();
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
							auto_update: true, // what is this?
							title: title,
						},
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
				reject("Workspace title is required.");
			}
		});
	}

	/**
	 * @param {String} id - ID of the workspace to be published
	 */
	async publishWorkspace(id) {
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
}
