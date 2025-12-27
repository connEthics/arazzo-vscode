# The Arazzo Specification v1.0.1

## 1. Arazzo Specification

### 1.1 Version 1.0.1

The key words “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”, “SHOULD”, “SHOULD NOT”, “RECOMMENDED”, “NOT RECOMMENDED”, “MAY”, and “OPTIONAL” in this document are to be interpreted as described in [BCP 14](https://tools.ietf.org/html/bcp14) [RFC2119] [RFC8174] when, and only when, they appear in all capitals, as shown here.

This document is licensed under [The Apache License, Version 2.0](https://www.apache.org/licenses/LICENSE-2.0.html).

## 2. Introduction

Being able to express specific sequences of calls and articulate the dependencies between them to achieve a particular goal is desirable in the context of API descriptions. The aim of the Arazzo Specification is to provide a mechanism that can define sequences of calls and their dependencies to be woven together and expressed in the context of delivering a particular outcome or set of outcomes when dealing with API descriptions (such as OpenAPI descriptions).

The Arazzo Specification can articulate these workflows in a human-readable and machine-readable manner, thus improving the capability of API specifications to tell the story of the API in a manner that can improve the consuming developer experience.

## 3. Definitions

### 3.1 Arazzo Description

A self-contained document (or set of documents) which defines or describes API workflows (specific sequence of calls to achieve a particular goal in the context of an API definition). An Arazzo Description uses and conforms to the Arazzo Specification, and `MUST` contain a valid Arazzo Specification version field (`arazzo`), an info field, a `sourceDescriptions` field with at least one defined Source Description, and there `MUST` be at least one Workflow defined in the `workflows` fixed field.

## 4. Specification

### 4.1 Versions

The Arazzo Specification is versioned using a `major`.`minor`.`patch` versioning scheme. The `major`.`minor` portion of the version string (for example 1.0) SHALL designate the Arazzo feature set. `.patch` versions address errors in, or provide clarifications to, this document, not the feature set. The patch version SHOULD NOT be considered by tooling, making no distinction between 1.0.0 and 1.0.1 for example.

### 4.2 Format

An Arazzo Description that conforms to the Arazzo Specification is itself a JSON object, which may be represented either in JSON or YAML format.

All field names in the specification are case sensitive. This includes all fields that are used as keys in a map, except where explicitly noted that keys are case insensitive.

In order to preserve the ability to round-trip between YAML and JSON formats, YAML version [1.2](https://yaml.org/spec/1.2/spec.html) is RECOMMENDED along with some additional constraints:

• Tags MUST be limited to those allowed by the [JSON Schema ruleset](https://yaml.org/spec/1.2/spec.html#id2803231).
• Keys used in YAML maps MUST be limited to a scalar string, as defined by the [YAML Failsafe schema ruleset](https://yaml.org/spec/1.2/spec.html#id2802346).

### 4.3 Arazzo Description Structure

It is RECOMMENDED that the entry Arazzo document be named: `arazzo.json` or `arazzo.yaml`.

An Arazzo Description MAY be made up of a single document or be divided into multiple, connected parts at the discretion of the author. If workflows from other documents are being referenced, they MUST be included as a Source Description Object. In a multi-document description, the document containing the Arazzo Specification Object is known as the entry Arazzo document.

### 4.6 Schema

#### 4.6.1 Arazzo Specification Object

| Field | Type | Description |
|---|---|---|
| arazzo | string | REQUIRED. This string MUST be the version number of the Arazzo Specification that the Arazzo Description uses. |
| info | Info Object | REQUIRED. Provides metadata about the workflows contain within the Arazzo Description. |
| sourceDescriptions | [Source Description Object] | REQUIRED. A list of source descriptions (such as an OpenAPI description) this Arazzo Description SHALL apply to. |
| workflows | [Workflow Object] | REQUIRED. A list of workflows. The list MUST have at least one entry. |
| components | Components Object | An element to hold various schemas for the Arazzo Description. |

#### 4.6.1.2 Arazzo Specification Object Example

```yaml
arazzo: 1.0.1
info:
  title: A pet purchasing workflow
  summary: This Arazzo Description showcases the workflow for how to purchase a pet through a sequence of API calls
  description: |
      This Arazzo Description walks you through the workflow and steps of `searching` for, `selecting`, and `purchasing` an available pet.
  version: 1.0.1
sourceDescriptions:
- name: petStoreDescription
  url: https://github.com/swagger-api/swagger-petstore/blob/master/src/main/resources/openapi.yaml
  type: openapi

workflows:
- workflowId: loginUserAndRetrievePet
  summary: Login User and then retrieve pets
  description: This workflow lays out the steps to login a user and then retrieve pets
  inputs:
      type: object
      properties:
          username:
              type: string
          password:
              type: string
  steps:
  - stepId: loginStep
    description: This step demonstrates the user login step
    operationId: loginUser
    parameters:
      - name: username
        in: query
        value: $inputs.username
      - name: password
        in: query
        value: $inputs.password
    successCriteria:
      - condition: $statusCode == 200
    outputs:
      tokenExpires: $response.header.X-Expires-After
      rateLimit: $response.header.X-Rate-Limit
      sessionToken: $response.body
  - stepId: getPetStep
    description: retrieve a pet by status from the GET pets endpoint
    operationPath: '{$sourceDescriptions.petstoreDescription.url}#/paths/~1pet~1findByStatus/get'
    parameters:
      - name: status
        in: query
        value: 'available'
      - name: Authorization
        in: header
        value: $steps.loginUser.outputs.sessionToken
    successCriteria:
      - condition: $statusCode == 200
    outputs:
      availablePets: $response.body
  outputs:
      available: $steps.getPetStep.outputs.availablePets
```

#### 4.6.2 Info Object

| Field | Type | Description |
|---|---|---|
| title | string | REQUIRED. A human readable title of the Arazzo Description. |
| summary | string | A short summary of the Arazzo Description. |
| description | string | A description of the purpose of the workflows defined. |
| version | string | REQUIRED. The version identifier of the Arazzo document. |

#### 4.6.3 Source Description Object

| Field | Type | Description |
|---|---|---|
| name | string | REQUIRED. A unique name for the source description. |
| url | string | REQUIRED. A URL to a source description to be used by a workflow. |
| type | string | The type of source description. Possible values are "openapi" or "arazzo". |

#### 4.6.4 Workflow Object

| Field | Type | Description |
|---|---|---|
| workflowId | string | REQUIRED. Unique string to represent the workflow. |
| summary | string | A summary of the purpose or objective of the workflow. |
| description | string | A description of the workflow. |
| inputs | JSON Schema | A JSON Schema 2020-12 object representing the input parameters used by this workflow. |
| dependsOn | [string] | A list of workflows that MUST be completed before this workflow can be processed. |
| steps | [Step Object] | REQUIRED. An ordered list of steps where each step represents a call to an API operation or to another workflow. |
| successActions | [Success Action Object] | A list of success actions that are applicable for all steps described under this workflow. |
| failureActions | [Failure Action Object] | A list of failure actions that are applicable for all steps described under this workflow. |
| outputs | Map[string, {expression}] | A map between a friendly name and a dynamic output value. |
| parameters | [Parameter Object] | A list of parameters that are applicable for all steps described under this workflow. |

#### 4.6.5 Step Object

| Field | Type | Description |
|---|---|---|
| description | string | A description of the step. |
| stepId | string | REQUIRED. Unique string to represent the step. |
| operationId | string | The name of an existing, resolvable operation. |
| operationPath | string | A reference to a Source Description Object combined with a JSON Pointer to reference an operation. |
| workflowId | string | The workflowId referencing an existing workflow within the Arazzo Description. |
| parameters | [Parameter Object] | A list of parameters that MUST be passed to an operation or workflow. |
| requestBody | Request Body Object | The request body to pass to an operation. |
| successCriteria | [Criterion Object] | A list of assertions to determine the success of the step. |
| onSuccess | [Success Action Object] | An array of success action objects that specify what to do upon step success. |
| onFailure | [Failure Action Object] | An array of failure action objects that specify what to do upon step failure. |
| outputs | Map[string, {expression}] | A map between a friendly name and a dynamic output value. |

#### 4.6.11 Criterion Object

| Field | Type | Description |
|---|---|---|
| context | {expression} | A Runtime Expression used to set the context for the condition to be applied on. |
| condition | string | REQUIRED. The condition to apply. |
| type | string | The type of condition to be applied. Options: simple, regex, jsonpath, xpath. |

#### 4.7 Runtime Expressions

A runtime expression allows values to be defined based on information that will be available within the HTTP message in an actual API call, or within objects serialized from the Arazzo document.

Examples:
- `$url`
- `$method`
- `$statusCode`
- `$request.header.accept`
- `$request.body#/user/uuid`
- `$response.body#/status`
- `$inputs.username`
- `$steps.someStepId.outputs.pets`
- `$components.parameters.foo`

