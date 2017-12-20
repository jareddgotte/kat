# Kentico Admin Tools (KAT)

## Summary

A browser userscript *(used with Tampermonkey and Greasemonkey)* that improves the UX of the Kentico Admin interface while working with 80-100 websites per environment.

An additional "helper script" is used alongside it to be injected into iframes so that the top level window has a better understanding at which state the children frames are in.

Each script's changelog is located inside their .js file's comment header.

## Installation

1. Download userscripts and install them into your browser of choice
2. Edit them and change their first `@match` path to point to the domain you're logging into with the Kentico Admin interface
3. Save and try it out by logging into /admin

## Usage

You can see the available settings to toggle by clicking the gear icon that now appears at the top-right of the admin header toolbar.

If you're interested, change the `debugF` value to `true` in the "Kentico Admin Tools" userscript and read the browser's developer console output while browsing through the /admin pages.

## Notes

Up to version 3.0 of KAT and 1.2 of the Helper scripts were not kept in a git repo.

Here are their estimated last modified dates:

**Kentico Admin Tools.user.js**
* v1.4 - 10/25/2017
* v1.5 - 10/27/2017
* v2.0 - 10/27/2017
* v2.1 - 10/30/2017
* v2.2 - 10/30/2017
* v2.3 - 11/02/2017
* v2.4 - 11/03/2017
* v2.5 - 11/05/2017
* v2.6 - 11/07/2017
* v2.7 - 11/10/2017
* v2.8 - 11/20/2017
* v2.9 - 12/12/2017
* v3.0 - 12/13/2017

**Kentico Admin Tools Helper.user.js**
* v1.0 - 10/30/2017
* v1.1 - 11/07/2017
* v1.2 - 12/13/2017

---

Copyright 2017 Jared Gotte

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
