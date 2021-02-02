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

#### `deleteObject(id: string, workspace: string, tenant: string, apiKey: string): Promise`
Returns a promise which resolves if the Object is deleted successfully.
```javascript
try {
  let deleted = await scrivito.deleteObject(
    "id",
    WORKSPACE_ID,
    TENANT_ID,
    API_KEY
  );
  if (deleted) {
    // do something else
  }
} catch (error) {
  console.error(error);
}
```

#### `updateObject(obj: any, workspace: string, tenant: string, apiKey: string): Promise`
Returns a promise which resolves if the Object is updated successfully. The id is extracted from the Object parameter, if an Object already exists with the same ID, it will be overridden.
```javascript
try {
  let updated = await scrivito.updateObject(
    newObject,
    WORKSPACE_ID,
    TENANT_ID,
    API_KEY
  );
} catch (error) {
  console.error(error);
}
```

#### `publishWorkspace(id: string, tenant: string, apiKey: string): Promise`
Publishes the workspace with given ID. This will work even with publish-preventing warnings and errors.
```javascript
try {
  await scrivito.publishWorkspace(WORKSPACE_ID, TENANT_ID, API_KEY);
} catch (error) {
  console.error(error);
}
```

#### `getIdsByQuery(query: any[], workspace: string, tenant: string, apiKey: string): Promise`
Resolves to an array of objects, containing the IDs of all objects found by given query.
```javascript
try {
  let images = await scrivito.getIdsByQuery(
    [
      {
        field: "_obj_class",
        operator: "equals",
        value: "Image",
      },
    ],
    WORKSPACE_ID,
    TENANT_ID,
    API_KEY
  );

  for (let i = 0; i < images.length; i++) {
    const image = images[i].id;
    // do something with each ID
  }
} catch (error) {
  console.error(error);
}
```

#### `getObjectsByQuery(query: any[], workspace: string, tenant: string, apiKey: string): Promise`
Works like [`getIdsByQuery`](#i), but returns objects instead of IDs inside array.
```javascript
try {
  let pagesToEdit = await scrivito.getObjectsByQuery(
    [
      {
        field: "*",
        operator: "contains",
        value: "some_word",
      },
    ],
    WORKSPACE_ID,
    TENANT_ID,
    API_KEY
  );

  for (let i = 0; i < pagesToEdit.length; i++) {
    const pageObject = pagesToEdit[i];
    // do something with each object, maybe call update updateObject(...) after modifying it
  }
} catch (error) {
  console.error(error);
}
```
