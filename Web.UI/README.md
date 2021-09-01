# Fuse - Admin template and Starter project for Angular

This project was generated with [Angular CLI](https://github.com/angular/angular-cli)

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice.  To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.





https://www.youtube.com/watch?v=B416AxHoMJ4
https://github.com/AzureAD/microsoft-authentication-library-for-js
https://github.com/Azure-Samples/ms-identity-javascript-angular-tutorial

https://github.com/Azure-Samples/ms-identity-javascript-angular-tutorial/tree/main/6-Multitenancy/1-call-api-mt
auth-config.ts
```
export const msalConfig: Configuration = {
    auth: {
        clientId: 'b0d156f7-f1b5-431d-81c6-c169d6e01405', // This is the ONLY mandatory field that you need to supply.
        authority: 'https://login.microsoftonline.com/b3f2bf8d-6397-4c87-9c9a-ec7ce704004c', // Defaults to "https://login.microsoftonline.com/common"
        redirectUri: '/', // Points to window.location.origin. You must register this URI on Azure portal/App Registration.
...
export const protectedResources = {
    graphApi: {
        endpoint: "https://graph.microsoft.com/v1.0/users",
        scopes: ["User.Read.All"]
    },
    todoListApi: {
        endpoint: "https://management.azure.com",
        scopes: ["https://management.azure.com/user_impersonation"],
    },
}
```


