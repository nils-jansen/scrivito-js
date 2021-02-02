# scrivito-js
API Wrapper for interacting with the [Scrivito CMS](https://www.scrivito.com/) API. This repository is not associated with Scrivito or Infopark.

## Installation
Using npm:
```terminal
$ npm install scrivito-js
```

## Usage
```javascript
const scrivito = require("scrivito-js");

let workspace = await scrivito.createWorkspace("Fancy name", TENANT_ID, API_KEY);

let images = await scrivito.getObjectsByQuery(
  [
    {
      field: "_obj_class",
      operator: "equals",
      value: "Image",
    },
  ],
  workspace,
  TENANT_ID,
  API_KEY
);

```

## API
- [`createWorkspace(title: string, tenant: string, apiKey: string): Promise`](#createworkspacetitle-string-tenant-string-apikey-string-promise)
- [`getObject(id: string, workspace: string, tenant: string, apiKey: string): Promise`](#getobjectid-string-workspace-string-tenant-string-apikey-string-promise)

#### `createWorkspace(title: string, tenant: string, apiKey: string): Promise`
Creates a new workspace using the title argument and returns a promise that resolves to its new ID.
```javascript
let workspace = await scrivito.createWorkspace("Fancy name", TENANT_ID, API_KEY);
```

#### `getObject(id: string, workspace: string, tenant: string, apiKey: string): Promise`
Returns a promise that resolves to the object with given ID. Also works with a blank workspace argument, will then use published content.
```javascript
let obj = await scrivito.getObject(
  "someLongId",
  WORKSPACE_ID,
  TENANT_ID,
  API_KEY
);
```










