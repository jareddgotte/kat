// ==UserScript==
// @name         Kentico Admin Tools
// @namespace    http://jaredgotte.com
// @version      2.8
// @description  Helps with working in the Kentico /admin interface. Depends on the Kentico Admin Tools Helper userscript. List of compatible Kentico versions can be found in the `listOfCompatibleKenticoVersions` variable defined below.
// @author       Jared Gotte
// @match        http://*.tamu.edu/Admin/*
// @match        https://*.tamu.edu/Admin/*
// @grant        none
// @require      http://code.jquery.com/jquery-3.2.1.min.js
// @run-at       document-start
// ==/UserScript==

// remove unnecessary warnings
/*jshint scripturl:true*/

/*
# List of Current Features:
  1. Only runs on a defined list of Kentico versions
  2. Allows users to close out of modals (e.g. web part properties) by clicking outside of them (rather than having to click on the top-right X or Cancel buttons)
  3. Automatically moves the "(more sites...)" option to the top of Site List dropdowns (beforehand you'd have to scroll all the way down to the bottom of the list)
  4. Enables the ability to open up the current window in a new tab when middle clicking on the breadcrumb link (whereas it did nothing before)
  5. Adds a "Current Site" button to the Sites app search form to help quickly filter out every site but the current one
  6. Adds a "Current Site" button to the "Select Site" dialog after choosing the "(more sites...)" option
  7. Prevents Kentico's Loader from appearing (improves page load performance)
  8. Auto selects "(more sites...)" instead of moving the option to the top of the list
*/

/*
# List of Future Ideas:
  * While in the Site Export wizard:
      * Add a button to automatically and safely deselect all (from the starting/main page, as well)
      * When able, automatically change the item listing dropdown to 100 from 10 (and/or move the dropdown to the top)
  * In the CSS stylesheet (and Smart search) app, add a button -- similar to the "Current Site" one for Sites -- to where it grabs the site's abbreviation within the parenthesis and filters based on that (won't work for all sites)
  * Use the "Last selected sites" feature/logic for past searches in css stylesheets, custom tables, page templates and other apps
  * For Settings:
      * Update from latest cookie each time it's opened/closed
      * Add more options, like:
          * How many last sites get listed
  * Able to edit a user straight from the Roles app
*/

/*
# List of Confirmed Bugs:
  * Firefox: Does not load frames in the same order as Chrome. This leads to the frame input keyup events not triggering properly within the widget properties dialog.
*/

/*
# List of Possible Bugs:
  * After completing/cancelling the Site/Object Export/Import wizard (and thereby getting bounced back to the Sites app), the "Current Site" button may not reappear automatically on the form
    * might be fixed
*/

/*
# Changelog:
  1.0 | Default features (clicking outside of modal closes it, add `more sites` to the top of dropdown lists)
  1.1 | Tidied up structure, added more areas where `more sites` can appear at the top, paved way of being able to drill down into iframes
  1.2 | Added 'middle button click to open up breadcrumbs in new tab' feature, added Kentico version detection so that it only runs when we want it
  1.3 | Added 'quickly search for current site in Sites app' feature
  1.4 | Separated methods between Static and Dynamic regions (since navigating through the admin interface uses the same iframe instead of refreshing the page)
  2.0 | * Enabled ability to toggle on/off particular features
        * Added better iframe support
        * Added ability to remove Kentico's loader
        * Added dependency: Kentico Admin Tools Helper userscript
        * Refactored code / improved formatting
  2.1 | * Added ability to automatically select "more sites" once the dropdown opens instead of waiting for it to move to the top of the list
        * Added a history of "last selected sites" to the 'Select site' dialog
        * Broke repeated code out into modularized functions
        * Created a hash-to-app library for the modularized functions
  2.2 | * Added ability to save/load settings from cookies
        * Added way to toggle settings from the admin bar
        * Added styles
  2.3 | * Bug fixes
        * Added ability to delete sites from "last selected sites" list
        * Added ability to store/retrieve "last selected sites" list via a cookie
        * Added ability to keep the "last selected sites" list cookie up-to-date
        * Added ability to easily override settings
  2.4 | * Bug fixes
  2.5 | * Bug fixes/refactoring
  2.6 | * Added "Refresh sites" button to "Last selected sites" list
        * Implemented Saby's suggestion: Reverted the ability to easily close out of a modal/dialog once you begin editing its values (e.g., while in the accordion widget properties)
        * Bug fixes/refactoring
  2.7 | * Added/updated comments
        * Added warning about overriding variables in the settings area
        * Bug fixes:
            * Added web part properties modal closure support in Page templates app
            * Improved katSettings cookie setting logic (to support cross-tab changes and dealing with overriding variables)
  2.8 | * Adapted the "Select site" logic with the "Select sites" dialog
*/

jQuery(function ($, undefined) {
    'use strict';


    /** DEFINE VARIABLES **/

    // # User defined variables
    // (Debug message switches)
    // prints out iframe/frame related debug messages to console.log when true
    var debugF = false;
    // prints out action (e.g., clicks) debug messages to console.log when true
    var debugA = false;
    // prints out verbose/secondary debug messages to console.log when true
    var debugV = false;

    // (Feature 6,7)
    // how long brute force runs for (in seconds)
    var bruteForceLooperPollSeconds = 1;
    // the timeout between intervals (in milliseconds)
    var bruteForceLooperPollRate = 50;

    // (OVERRIDING feature settings) | NOTE: Uncomment these to manually override and update the cookie settings the next time the script loads
    // forces Feature 1 to be enabled/disabled when defined
    //var enableKenticoVersionDetectionOverride = true;
    // forces Feature 2 to be enabled/disabled when defined
    //var enableModalClosingHelperOverride = false;
    // forces Feature 3 to be enabled/disabled when defined
    //var enableSiteListDropdownHelperOverride = true;
    // forces Feature 4 to be enabled/disabled when defined
    //var enableBreadcrumbMiddleClickHelperOverride = true;
    // forces Feature 5 to be enabled/disabled when defined
    //var enableCurrentSiteButtonHelperOverride = true;
    // forces Feature 6 to be enabled/disabled when defined
    //var enableCurrentSiteButtonHelperExtensionOverride = true;
    // forces Feature 7 to be enabled/disabled when defined
    //var enableKenticoLoaderHiderOverride = true;
    // forces Feature 8 to be enabled/disabled when defined
    //var enableSiteListDropdownAutoHelperOverride = false;

    // (DEFAULT feature settings) | NOTE: Since these are just the default settings, they get set then overridden by cookie values afterwards following the first time this script is loaded
    // enables Feature 1 when true
    var enableKenticoVersionDetection = true; // katSettings.feature1
    // enables Feature 2 when true
    var enableModalClosingHelper = false; // katSettings.feature2
    // enables Feature 3 when true
    var enableSiteListDropdownHelper = true; // katSettings.feature3
    // enables Feature 4 when true
    var enableBreadcrumbMiddleClickHelper = true; // katSettings.feature4
    // enables Feature 5 when true
    var enableCurrentSiteButtonHelper = true; // katSettings.feature5
    // enables Feature 6 when true
    var enableCurrentSiteButtonHelperExtension = true; // katSettings.feature6
    // enables Feature 7 when true
    var enableKenticoLoaderHider = true; // katSettings.feature7
    // enables Feature 8 when true
    var enableSiteListDropdownAutoHelper = false; // katSettings.feature8

    // (Settings for iframe/frame management)
    // mapping of iframe id HTML attribute values to my own designated id's
    var iframeMap = {
        undef: 'N/A',
        m_c_layoutElem_cmsdesktop: 1, // all
        m_c_plc_lt_ctl00_ObjectTreeMenu_layoutElem_paneContentTMain: 2, // Widgets
        m_c_plc_lt_ctl00_HorizontalTabs_l_c: 3, // Pages, Widgets
        m_c_layoutElem_contentview: 4, // Pages
        m_c_widgetProperties: 5 // Pages
    };
    // mapping of frame name HTML attribute values to my own designated id's
    var frameMap = {
        undef: 'N/A',
        categories: 1, // Settings
        keys: 2, // Settings
        widgetpropertiesheader: 3, // Pages
        widgetpropertiescontent: 4, // Pages
        widgetpropertiesbuttons: 5, // Pages
        webpartpropertiesheader: 6, // Page templates
        webpartpropertiescontent: 7, // Page templates
        webpartpropertiesbuttons: 8 // Page templates
    };
    // mapping of Kentico App GUID hash values to my own designated id's
    var hashAppMap = {
        undef: 'N/A',
        '#': 99, // Dashboard
        '': 98, // Dashboard
        '#02cded6b-aa35-4a82-a5f3-e5a5fe82e58b': 1, // Settings
        '#5576826f-328b-4b53-9f4b-e877fabd4d63': 2, // Sites
        '#ef314079-8dbb-4273-bed1-a4af14d0cbf7': 3, // Widgets
        '#e7c58bcc-a132-40cf-b587-c11fbf146963': 4, // Event log
        '#95a82f36-9c40-45f0-86f1-39aa44db9a77': 5, // Pages
        '#06a4451b-3356-45c5-8b60-9ed0b2dd7151': 6 // Page templates
    };

    // (Settings for Feature 1)
    // gets version of Kentico
    var currentKenticoVersion = $('#m_c_layoutElem_h_Header_contextHelp_lblVersion').html().match(/\d+(\.\d+)*/g);
    // defines list of versions of Kentico which are compatible with this tool
    var listOfCompatibleKenticoVersions = [
        '9.0.48',
        '9.0.49',
        '9.0.50'
    ];

    // (Cookies)
    // name of our settings cookie
    var settingsCookieName = 'PITOWebCMS_KATSettings';
    // name of our site list cookie
    var lastSelectedSitesCookieName = 'PITOWebCMS_KATLastSelectedSites';


    // # STATIC VARIABLES (I.E., NO REAL REASON TO MODIFY THEM)
    // gets hash of window at load
    var hash = window.location.hash;
    // current site
    var currentSite = '';
    // this holds an object of our setting values (gets stored/retrieved via cookies)
    var katSettings = {};
    // settings cookie val
    var settingsCookie = null;
    // flag becomes true if any settings are being manually overridden
    var settingOverrideFlag = false;
    // select site last selected list
    var lastSelectedSites = [];
    // last site selected from list
    var lastSelectedSite = null;
    // lastSelectedSites cookie val
    var lastSelectedSitesCookie = null;

    // reverse mapping for easy lookup (essentially flips the keys and values of iframeMap)
    /*var iframeMapRev = Object.keys(iframeMap).reduce((acc, propName) => {
        acc[iframeMap[propName]] = propName;
        return acc;
    }, {});*/

    // reverse mapping for easy lookup (essentially flips the keys and values of frameMap)
    var frameMapRev = Object.keys(frameMap).reduce((acc, propName) => {
        acc[frameMap[propName]] = propName;
        return acc;
    }, {});

    // reverse mapping for easy lookup (essentially flips the keys and values of hashAppMap)
    /*var hashAppMapRev = Object.keys(iframeMap).reduce((acc, propName) => {
        acc[iframeMap[propName]] = propName;
        return acc;
    }, {});*/

    // body element event listener function storage
    var eventListenerFuncStore = {};

    // (Feature 2)
    var f2Status = 0;

    // (Feature 6,7)
    // iterator for bruteForceLooper()
    var bruteForceLooperIterator = 0;
    // pre-calculates the intervals
    var bruteForceLooperIterations = bruteForceLooperPollSeconds * 1000 / bruteForceLooperPollRate;


    /** DEFINE FUNCTIONS **/

    // give iframes access to a nicer console.log message
    window.console.iframeLog = function (msg, iframeDepth, attrID, parentAttrID) {
        if (debugF) console.log('> ' + '  '.repeat(iframeDepth - 1) + msg + '; ifid[' + (iframeMap[attrID] || attrID) + ']; pifid[' + (iframeMap[parentAttrID] || parentAttrID || '') + ']');
    };

    // sets styles (todo: reference external CSS stylesheet)
    function addStyles ($head, css) {
        if (!$head) return;
        $head.append('<style>' + css + '</style>');
    }

    // called when a setting is being manually overriden
    function setOverrideSetting (featureName, overrideValue) {
        if (katSettings[featureName] !== overrideValue) katSettings[featureName] = overrideValue;
        if (!settingOverrideFlag) settingOverrideFlag = true;
    }

    // ensure lastSelectedSites cookie is up-to-date
    function loadLatestSettingsCookie () {
        // attempts to get the cookie which stores our settings
        settingsCookie = getCookie(settingsCookieName);

        // get current state of katSettings
        var oldKatSettings = JSON.stringify(katSettings);
        // set first-time load flag (becomes true if we've never ran this script or our cookies got cleared)
        var firstLoadFlag = false;

        // if the settings cookie exists, load our settings
        if (settingsCookie.length > 0) {
            katSettings = JSON.parse(settingsCookie);
            //console.log('parsed katSettings', JSON.stringify(katSettings));

            // updates current katSettings state if this was just the first time hitting the page (as opposed to first time ever loading it)
            if (oldKatSettings === '{}') oldKatSettings = JSON.stringify(katSettings);
        }
        // otherwise, set our default settings cookie
        else {
            // update first-time load flag
            firstLoadFlag = true;

            // set default settings
            katSettings = {
                feature1: enableKenticoVersionDetection,
                feature2: enableModalClosingHelper,
                feature3: enableSiteListDropdownHelper,
                feature4: enableBreadcrumbMiddleClickHelper,
                feature5: enableCurrentSiteButtonHelper,
                feature6: enableCurrentSiteButtonHelperExtension,
                feature7: enableKenticoLoaderHider,
                feature8: enableSiteListDropdownAutoHelper
            };
            //console.log('defaulted katSettings', JSON.stringify(katSettings));

            // update our current katSettings state
            oldKatSettings = JSON.stringify(katSettings);
        }

        // apply manual overrides
        if (typeof enableKenticoVersionDetectionOverride !== 'undefined') setOverrideSetting('feature1', enableKenticoVersionDetectionOverride);
        if (typeof enableModalClosingHelperOverride !== 'undefined') setOverrideSetting('feature2', enableModalClosingHelperOverride);
        if (typeof enableSiteListDropdownHelperOverride !== 'undefined') setOverrideSetting('feature3', enableSiteListDropdownHelperOverride);
        if (typeof enableBreadcrumbMiddleClickHelperOverride !== 'undefined') setOverrideSetting('feature4', enableBreadcrumbMiddleClickHelperOverride);
        if (typeof enableCurrentSiteButtonHelperOverride !== 'undefined') setOverrideSetting('feature5', enableCurrentSiteButtonHelperOverride);
        if (typeof enableCurrentSiteButtonHelperExtensionOverride !== 'undefined') setOverrideSetting('feature6', enableCurrentSiteButtonHelperExtensionOverride);
        if (typeof enableKenticoLoaderHiderOverride !== 'undefined') setOverrideSetting('feature7', enableKenticoLoaderHiderOverride);
        if (typeof enableSiteListDropdownAutoHelperOverride !== 'undefined') setOverrideSetting('feature8', enableSiteListDropdownAutoHelperOverride);

        // get state of katSettings after overrides were applied so we can compare
        var newKatSettings = JSON.stringify(katSettings);

        // update cookie for the following scenarios:
        //   1. first time load, regardless of overrides
        //   2. reload with overrides differing from original settings
        //   3. setting change made (handled near the bottom of the code)
        // do not update cookie when:
        //   1. reload with no overrides
        //   2. reload with overrides but no change from what was loaded
        if (firstLoadFlag) setCookie(settingsCookieName, newKatSettings, 365);
        else {
            //console.log('json compare', oldKatSettings, newKatSettings, oldKatSettings === newKatSettings);
            if (oldKatSettings !== newKatSettings) setCookie(settingsCookieName, newKatSettings, 365);
        }
    }

    // ensure lastSelectedSites cookie is up-to-date
    function loadLatestLastSelectedSitesCookie () {
        // attempts to get the cookie which stores our last selected sites list
        lastSelectedSitesCookie = getCookie(lastSelectedSitesCookieName);
        //console.log('lastSelectedSitesCookie len', lastSelectedSitesCookie.length);

        // if the "last selected sites" cookie exists, load it
        if (lastSelectedSitesCookie.length > 0) {
            lastSelectedSites = JSON.parse(lastSelectedSitesCookie);
            //console.log('parsed lastSelectedSites', lastSelectedSites);
        }
        // otherwise, set our default "last selected sites" cookie
        else {
            //console.log('defaulted lastSelectedSites', lastSelectedSites);
            setCookie(lastSelectedSitesCookieName, JSON.stringify(lastSelectedSites), 365);
        }
    }

    // sets cookie
    function setCookie (cname, cvalue, exdays) {
        //console.log('setting cookie: ' + cname);
        var d = new Date();
        d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
        var expires = 'expires=' + d.toUTCString();
        document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/Admin;domain=.tamu.edu';
    }

    // gets cookie
    function getCookie (cname) {
        //console.log('getting cookie: ' + cname);
        var name = cname + '=';
        var ca = document.cookie.split(';');
        for(var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) === ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) === 0) {
                return c.substring(name.length, c.length);
            }
        }
        return '';
    }

    // removes Dev/Test from end of site name
    function trimSiteName (siteName) {
        var tmp = siteName.split(' ');
        if (~['Dev', 'Test'].indexOf(tmp[tmp.length - 1])) {
            tmp.pop();
            return tmp.join(' ');
        }
        return siteName;
    }

    // gets/sets current site name we're in /admin of
    function currentSiteName () {
        if (currentSite.length === 0) {
            currentSite = trimSiteName($('#m_c_layoutElem_h_Header_ss_pnlSelector .dropdown').text());
        }
        return currentSite;
    }

    // (Feature 6,7)
    // spam handler for bruteForceLooper(), so we aren't executing overlapping loops
    function bruteForceLooperHelper () {
        //console.log('bruteForceLooperIterator', bruteForceLooperIterator);
        bruteForceLooperIterator = 0;
        bruteForceLooper();
        clearInterval(bruteForceLooperHelper.timeout);
        bruteForceLooperHelper.timeout = setInterval(bruteForceLooper, bruteForceLooperPollRate);
    }
    // loops after iframes load to ensure certain things happen
    function bruteForceLooper () {
        if (bruteForceLooperIterator < bruteForceLooperIterations) {
            // ensures Kentico's loader stays hidden (improves performance)
            if (katSettings.feature7 && window.Loader) { // enableKenticoLoaderHider
                window.Loader.hide();
                //delete window.Loader;
            }

            bruteForceLooperIterator++;
        }
        else {
            if (debugF) console.log('(bruteForceLooper done)\n ');
            clearInterval(bruteForceLooperHelper.timeout);
        }
    }

    // (Feature 3)
    // helper function to siteListDropdownHelper()
    function siteListDropdownHelperHelper ($dropdownSel, moreSitesSel, autoOption) {
        // get the site list dropdown element
        //var $dropdownSel = $(this);
        //console.log('$dropdownSel', $dropdownSel);

        // now get the `(more sites...)` option element
        var $moreSitesSel = $dropdownSel.find(moreSitesSel);
        //console.log('$moreSitesSel', $moreSitesSel, 'index', $moreSitesSel.index());

        // if auto select option on
        if (katSettings.feature8 && autoOption) { // enableSiteListDropdownAutoHelper
            // auto select "(more sites...)"
            $dropdownSel.val('-2').change();
        }
        // if auto select option off
        else {
            // alternate approach (not sure which one is more efficient or if there is an even better alternative)
            /*var optionArr = $('option', $dropdownSel).toArray();
            var last = optionArr.pop();
            if (last.value === '-2') {
                $(last).prependTo($dropdownSel);
                if (debugV) console.log('  "(more sites...)" moved');
            }*/

            // run the following code once
            if ($moreSitesSel.index() > 0) {
                // move the option element to the top
                $moreSitesSel.prependTo($dropdownSel);
                if (debugV) console.log('  "(more sites...)" moved');
            }
        }
    }
    // moves `(more sites...)` to the top of all known site list dropdowns
    function siteListDropdownHelper (hashId, $this) {
        if (!katSettings.feature3) { // enableSiteListDropdownHelper
            if (debugV) console.log('! SiteListDropdownHelper disabled');
            return;
        }

        if (debugF || debugV) console.log('# loading SiteListDropdownHelper');
        switch (hashId) {
            case 0: // main header (very top of all admin pages)
                if (debugF || debugV) console.log('  (for main header)');
                // find the site selector and bind the click event to the dropdown
                $('.main-header').on('click', '.header-site-selector', function (e) {
                    if (debugA || debugV) console.log('  SiteListDropdownHelper clicked');
                    //console.log(e.target, this);

                    // arguments: dropdown menu jQuery selector, more sites option selector, auto select option to click it instead of move it
                    siteListDropdownHelperHelper($(this).find('.dropdown-menu'), 'li[data-raw-value="-2"]', false);
                });
                break;
            case 1: // Settings app (top left)
                if (debugF || debugV) console.log('  (for Settings app)');
                // drill down to the site selector (through an iframe and frame) in this order:
                //   1) iframe#m_c_layoutElem_cmsdesktop (already here)
                //   2) frame[name="categories"]
                // and bind the click event to the dropdown
                var $frame = $('frame[name="' + frameMapRev['1'] + '"]', $this.contents()); //categories
                //console.log('$frame', $frame);
                if ($frame.length > 0) {
                    $($frame[0].contentDocument).on('click', '.DropDownField', function (e) {
                        if (debugA || debugV) console.log('  SiteListDropdownHelper clicked');
                        //console.log(e.target, this);

                        // arguments: dropdown menu jQuery selector, more sites option selector, auto select option to click it instead of move it
                        siteListDropdownHelperHelper($(this), 'option[value="-2"]', true); // set to false if necessary
                    });
                }
                break;
            case 3: // Widgets app (each Widget's Security tab)
                if (debugF || debugV) console.log('  (for Widgets app)');
                // drill down to the site selector (through 3 iframes) in this order:
                //   1) iframe#m_c_layoutElem_cmsdesktop
                //   2) iframe#m_c_plc_lt_ctl00_ObjectTreeMenu_layoutElem_paneContentTMain
                //   3) iframe#m_c_plc_lt_ctl00_HorizontalTabs_l_c (already here)
                // and bind the click event to the dropdown
                $this.contents().on('click', '.DropDownField', function (e) {
                    if (debugA || debugV) console.log('  SiteListDropdownHelper clicked');
                    //console.log(e.target, this);

                    // arguments: dropdown menu jQuery selector, more sites option selector, auto select option to click it instead of move it
                    siteListDropdownHelperHelper($(this), 'option[value="-2"]', true); // set to false if necessary
                });
                break;
            case 4: // Event log app (top right)
                if (debugF || debugV) console.log('  (for Event log app)');
                // drill down to the site selector (through 1 iframe) in this order:
                //   1) iframe#m_c_layoutElem_cmsdesktop (already here)
                // and bind the click event to the dropdown
                $('#m_plcSiteSelector_siteSelector_ss', $this.contents()).on('click', '.DropDownField', function (e) {
                    if (debugA || debugV) console.log('  SiteListDropdownHelper clicked');
                    //console.log(e.target, this);

                    // arguments: dropdown menu jQuery selector, more sites option selector, auto select option to click it instead of move it
                    siteListDropdownHelperHelper($(this), 'option[value="-2"]', true); // set to false if necessary
                });
                break;
            default:
                console.log('  ! Unexpected id given for SiteListDropdownHelper(): ', hashId);
                break;
        }
    }

    // (All features)
    // only run certain code while in its respective app (by checking the hash)
    function checkHash (listener, hash, $this, idType, id) {
        var hashId = hashAppMap[hash] || -1;
        switch (hashId) {
            case 99: case 98: // Dashboard
                if (debugF && debugV) console.log('  (Dashboard detected); hashId[' + hashId + ']');
                break;
            case 1: // Settings
                if (idType === 1) { // iframe
                    if (id === 1) {
                        if (debugF) console.log('  (Settings app detected)');
                        if (listener === 1) console.log('  ! Why was Settings app detected by fauxLoad?');

                        // Feature 3 => top left of Settings app
                        siteListDropdownHelper(hashId, $this);
                    }
                }
                break;
            case 2: // Sites
                if (idType === 1) { // iframe
                    if (id === 1) {
                        if (debugF) console.log('  (Sites app detected)');
                        /// Enable ability to quickly search for the current site in the site list
                        if (katSettings.feature5) { // enableCurrentSiteButtonHelper
                            // drill down to the button group through any iframes:
                            //   1) iframe#m_c_layoutElem_cmsdesktop (already in)
                            // then add our button next to reset/search and bind the click event to it
                            var $contents = $this.contents();
                            if ($('#searchCurrentSite', $contents).length === 0) {
                                $('#m_c_plc_lt_ctl01_Listing_gridElem_filterForm_pnlForm .form-group-buttons', $contents)
                                    .prepend('<button type="button" value="Current Site" id="searchCurrentSite" class="btn btn-secondary">Current Site</button>')
                                    .on('click', 'button', function (e) {
                                    if ($(this).attr('id') === 'searchCurrentSite') {
                                        if (debugF || debugA) console.log('    Current Site button clicked');

                                        // set 'Site name' value to 0 (Contains)
                                        $('#m_c_plc_lt_ctl01_Listing_gridElem_filterForm_SiteDisplayName_drpOperator', $contents).val('0').change();

                                        // insert name of current site into the 'Site name' input
                                        $('#m_c_plc_lt_ctl01_Listing_gridElem_filterForm_SiteDisplayName_txtText', $contents).val(currentSiteName());

                                        // click Search (set a timeout because an error was occurring (since there's a timeout on the select's onchange event, a race condition might've been occurring))
                                        setTimeout(function () {
                                            $('#m_c_plc_lt_ctl01_Listing_gridElem_filterForm_btnShow', $contents).click();
                                        }, 0);
                                    }
                                });
                            }
                        }
                        else if (debugV) {
                            console.log('  ! CurrentSiteButtonHelper disabled');
                        }
                    }
                }
                break;
            case 3: // Widgets
                if (idType === 1) { // iframe
                    if (id === 1) {
                        if (debugF) console.log('  (Widgets app detected)');
                    }
                    else if (id === 3) {
                        // Feature 3 => Widget Security tab
                        siteListDropdownHelper(hashId, $this);
                    }
                }
                break;
            case 4: // Event log
                if (idType === 1) { // iframe
                    if (id === 1) {
                        if (debugF) console.log('  (Event log app detected)');
                        // (Feature 3)
                        // create and set mutation observer
                        var $dropdown = $('#m_plcSiteSelector_siteSelector_pnlUpdate', $this.contents());
                        if ($dropdown.length !== 0) {
                            var observer = new MutationObserver(function (mutations) {
                                // init helper on change
                                siteListDropdownHelper(hashId, $this);
                            });
                            observer.observe($dropdown[0], { childList: true });
                        }
                        // initialize helper
                        siteListDropdownHelper(hashId, $this);
                    }
                }
                break;
            case 5: // Pages
                if (idType === 1) { // iframe
                    if (id === 1) {
                        if (debugF) console.log('  (Pages app detected)');
                        // (Feature 6,7)
                        bruteForceLooperHelper();
                    }
                    if (id === 5) { // Pages app -> Widget properties -> framecontent
                        if (debugF) console.log('  (iframe load detected in Pages app)');
                        //console.log($this);
                        //console.log($('body', $this.contents()));
                        //console.log($this[0].contentWindow.parent.parent.frameElement.parentElement);
                        //console.log($this.contents());
                        $this.ready(function () {
                            $('body', $this.contents()).on('keyup', function (e) {
                                if (debugF) console.log('# modified via iframe');
                                $($this[0].contentWindow.parent.parent.frameElement.parentElement).trigger('modified');
                            });
                        });
                    }
                }
                else if (idType === 2) { // frame
                    if (id === 4) { // Pages app -> Widget properties -> framecontent
                        if (debugF) console.log('  (frame load detected in Pages app)');
                        //console.log($($this[0].contentDocument));
                        //console.log($this);
                        var $iframeFrameset = $('frameset', $($this[0].contentDocument));
                        if ($iframeFrameset.length > 0) {
                            var $frameContent = $('frame[name="' + frameMapRev['4'] + '"]', $iframeFrameset); //widgetpropertiescontent
                            if ($frameContent.length > 0) {
                                var $contents = $($frameContent[0].contentDocument);
                                //console.log('$contents', $contents);
                                $contents.on('keyup change', 'input, textarea', function (e) {
                                    if (debugF) console.log('# modified via frame');
                                    $($this[0].parentElement).trigger('modified');
                                });
                            }
                        }
                    }
                }
                break;
            case 6: // Page templates
                if (idType === 1) { // iframe
                    if (id === 1) {
                        if (debugF) console.log('  (Page templates app detected)');
                        // (Feature 6,7)
                        bruteForceLooperHelper();
                    }
                    /*if (id === ?) { // Page templates app -> Web part properties -> framecontent
                        if (debugF) console.log('  (iframe load detected in Page templates app)');
                        //console.log($this);
                        //console.log($('body', $this.contents()));
                        //console.log($this[0].contentWindow.parent.parent.frameElement.parentElement);
                        //console.log($this.contents());
                        $this.ready(function () {
                            $('body', $this.contents()).on('keyup', function (e) {
                                if (debugF) console.log('# modified via iframe');
                                $($this[0].contentWindow.parent.parent.frameElement.parentElement).trigger('modified');
                            });
                        });
                    }*/
                }
                else if (idType === 2) { // frame
                    if (id === 7) { // Page templates app -> Web part properties -> framecontent
                        if (debugF) console.log('  (frame load detected in Page templates app)');
                        //console.log($($this[0].contentDocument));
                        //console.log($this);
                        var $iframeFrameset = $('frameset', $($this[0].contentDocument));
                        if ($iframeFrameset.length > 0) {
                            var $frameContent = $('frame[name="' + frameMapRev['7'] + '"]', $iframeFrameset); //webpartpropertiescontent
                            if ($frameContent.length > 0) {
                                var $contents = $($frameContent[0].contentDocument);
                                //console.log('$contents', $contents);
                                $contents.on('keyup change', 'input, textarea', function (e) {
                                    if (debugF) console.log('# modified via frame');
                                    $($this[0].parentElement).trigger('modified');
                                });
                            }
                        }
                    }
                }
                break;
            default:
                console.log('! Unexpected hash passed to checkHash(); hash[' + hash + ']; hashId[' + hashId + ']');
                break;
        }
    }

    // function to handle 'realLoad' via applyLoadToIframes()
    function handleRealLoad (e, lvl) {
        //console.log('realLoad', e, lvl);
        var tar = e && e.target;
        if (tar && tar.tagName === 'IFRAME' && tar.name !== 'QuickInsertImage') {
            var $this = $(tar);
            var ifid = iframeMap[tar.id] || tar.id;
            if (ifid === '') {
                var title = $this.attr('title') || '';
                if (title.length > 0) {
                    var titleX = title.split(',');
                    if (titleX.length > 1) {
                        titleX = titleX[1].trim().split('_');
                        title = titleX.slice(0, 3).join('_');
                        //console.log('title', title);
                        ifid = iframeMap[title] || title;
                    }
                }
            }
            if (debugF) console.log('# aLTI realLoaded iframe; lvl[' + lvl + ']; ifid[' + ifid + ']');
            //console.log('  ', tar);

            // recursively apply on triggered event
            applyLoadToIframes($this.contents(), lvl + 1, 1, ifid, 'delayed');

            // ensure things happen after iframes load
            bruteForceLooperHelper();
            $this.ready(function () {
                bruteForceLooperHelper();
            });

            // handle main iframe logic
            if (ifid === 1) {
                if (debugF) console.log('  (main iframe loaded); hash[' + window.location.hash + ']');

                hash = window.location.hash; // update hash of window at every iframe load
            }

            //console.log('realLoad name', $this.attr('name'), $this.attr('id'));
            // handle modal iframe logic
            if ($this.hasClass('UIPopupDialog')) {
                //console.log($this.contents());
                if (debugF) console.log('  (modal iframe loaded)');

                // "Select site" or "Select sites" modal
                if ($this.attr('name') === 'SelectionDialog') {
                    var $children = $('body', $this.contents()).children();

                    if ($children.length > 0) {
                        if (katSettings.feature6) {
                            var headTitle = $('#m_pt_headTitle', $children).text().trim();
                            var inSelectSite = (headTitle === 'Select site');

                            if (inSelectSite || headTitle === 'Select sites') { // enableCurrentSiteButtonHelperExtension
                                if (debugF) console.log('    (in "' + headTitle + '" modal)');

                                // adds our 'current site' or 'reset' button next to search and binds the click event to it
                                var addButtons = function () {
                                    var $contents = $this.contents();
                                    var nameVal = trimSiteName($('#m_c_selectionDialog_txtSearch', $contents).val());

                                    // push selected site name (from normal table listing) to our lastSelectedSites array on click
                                    if (inSelectSite) $('#m_c_selectionDialog_uniGrid_v', $this.contents()).on('click', '.SelectableItem', function (e) {
                                        loadLatestLastSelectedSitesCookie();
                                        //console.log('lastSelectedSites before', lastSelectedSites.slice()); // debug

                                        // push site name
                                        lastSelectedSites.push(trimSiteName(e.target.textContent));

                                        // truncate list (if over 100 elements)
                                        if (lastSelectedSites.length > 100) {
                                            lastSelectedSites = lastSelectedSites.slice(-100);
                                        }

                                        // filter out duplicates (saving the last occurrence)
                                        lastSelectedSites = lastSelectedSites.filter((el, i, ar) => ar.lastIndexOf(el) === i);
                                        //console.log('lastSelectedSites after', lastSelectedSites); // debug

                                        // update cookie
                                        setCookie(lastSelectedSitesCookieName, JSON.stringify(lastSelectedSites), 365);
                                    });

                                    // if in "Select site" and (name field is current site or last selected site)
                                    //   select the site
                                    if (inSelectSite && (nameVal === currentSiteName() || nameVal === lastSelectedSite)) {
                                        var divArr = $('#m_c_selectionDialog_uniGrid_v tr .SelectableItem', $contents);
                                        for (var i = 0, len = divArr.length, $v; i < len; ++i) {
                                            $v = $(divArr[i]);
                                            if (trimSiteName($v.text()) === nameVal) {
                                                $v.click();
                                                // exit addButtons(); don't bother drawing buttons since clicking closes out of dialog/modal
                                                return;
                                            }
                                        }
                                    }

                                    // add the buttons
                                    var $buttonRow = $('#m_c_selectionDialog_pnlSearch .filter-form-buttons-cell', $contents);
                                    // if name field is not current site
                                    //   add current site button and attach click event
                                    if (nameVal !== currentSiteName()) {
                                        $buttonRow
                                            .prepend('<button type="button" value="Current Site" id="searchCurrentSite" class="btn btn-secondary">Current Site</button>')
                                            .on('click', 'button#searchCurrentSite', function () {
                                            if (debugF || debugA) console.log('    "Current Site" button clicked in "' + headTitle + '" dialog');

                                            // insert name of current site into the 'Name' input
                                            $('#m_c_selectionDialog_txtSearch', $contents).val(currentSiteName());

                                            // click Search
                                            $('#m_c_selectionDialog_btnSearch', $contents).click();
                                        });
                                    }
                                    // and if name field is not empty
                                    //   add reset button and attach click event
                                    if (nameVal.length !== 0) {
                                        $buttonRow
                                            .prepend('<button type="button" value="Reset" id="resetName" class="btn btn-default">Reset</button>')
                                            .on('click', 'button#resetName', function () {
                                            if (debugF || debugA) console.log('    "Reset" button clicked in "' + headTitle + '" dialog');

                                            // insert name of current site into the 'Name' input
                                            $('#m_c_selectionDialog_txtSearch', $contents).val('');

                                            // click Search
                                            $('#m_c_selectionDialog_btnSearch', $contents).click();
                                        });
                                    }
                                };

                                // adds our last selected sites to the table html
                                var lastSelectedHTML = function (tableWidth) {
                                    var itemsPerPage = $('#m_c_selectionDialog_uniGrid_p_drpPageSize', $children).val() || 10;
                                    var html = '';
                                    var leftOffset = tableWidth - 17;

                                    // build html table rows
                                    for (var len = lastSelectedSites.length, i = len - 1, max = Math.min(len, itemsPerPage), count = 0, siteName; count < max; --i, ++count) {
                                        if (i < 0) break;
                                        siteName = lastSelectedSites[i];
                                        html += '<tr><td><div class="SelectableItem" title="Select &quot;' + siteName + '&quot;">' + siteName + '</div><a role="button" title="Delete &quot;' + siteName + '&quot; from list?" style="left:' + leftOffset + 'px;">×</a></td></tr>';
                                    }
                                    return html;
                                };

                                // inject last selected sites table
                                var addLastSelectedSites = function () {
                                    loadLatestLastSelectedSitesCookie();

                                    if (lastSelectedSites.length > 0) {
                                        // generate and inject table HTML
                                        var divContent = $('#divContent', $children)[0];
                                        var scrollbarDiff = divContent.offsetWidth - divContent.clientWidth;
                                        var tableWidth = 275 - scrollbarDiff;
                                        $('#m_c_selectionDialog_pnlUpdate', $children).prepend('<div id="lastSitesSelect" style="width:' + tableWidth + 'px;"><table class="table"><thead><tr><th>Last selected sites<a role="button" title="Refresh list" style="margin-right:' + scrollbarDiff + 'px"><i class="icon-rotate-double-right"></i></a></th></tr></thead><tbody>' + lastSelectedHTML(tableWidth) + '</tbody></table></div>');

                                        // attach click event for selecting a site from the "Last selected sites" list
                                        var $contents = $this.contents();
                                        $('#lastSitesSelect', $contents).on('click', 'div.SelectableItem', function () {
                                            if (debugF || debugA) console.log('    "Site" item clicked in "' + headTitle + '" dialog');

                                            // record name of selected site to use for addButtons() (so we can auto select it once it gets filtered)
                                            lastSelectedSite = $(this).text();

                                            // insert name of current site into the 'Name' input
                                            $('#m_c_selectionDialog_txtSearch', $contents).val(lastSelectedSite);

                                            // click Search
                                            $('#m_c_selectionDialog_btnSearch', $contents).click();
                                        });

                                        // attach click events to the refresh and site delete buttons on the "Last selected sites" list
                                        $('#lastSitesSelect', $contents).on('click', 'a', function () { //div.SelectableItem + a
                                            var $this = $(this);
                                            var $prev = $this.prev();

                                            loadLatestLastSelectedSitesCookie();

                                            if ($prev.length === 0) {
                                                if (debugF || debugA) console.log('    "Refresh list" link clicked in "' + headTitle + '" dialog');
                                            }
                                            else {
                                                if (debugF || debugA) console.log('    "Delete site" link clicked in "' + headTitle + '" dialog; name[' + $this.parent().text() + ']');

                                                // remove site from list if it exists
                                                var i = lastSelectedSites.indexOf($prev.text());
                                                if (~i) lastSelectedSites.splice(i, 1);

                                                // update cookie
                                                setCookie(lastSelectedSitesCookieName, JSON.stringify(lastSelectedSites), 365);
                                            }

                                            // redraw table
                                            $('#lastSitesSelect tbody', $contents).html(lastSelectedHTML(tableWidth));
                                        });
                                    }
                                };

                                // create and set mutation observer
                                var $panel = $('#m_c_selectionDialog_pnlUpdate', $children);
                                if ($panel.length !== 0) {
                                    var observer = new MutationObserver(function (mutations) {
                                        if (mutations[0].addedNodes.length > 1) {
                                            addButtons();
                                            addLastSelectedSites();
                                        }
                                    });
                                    observer.observe($panel[0], { childList: true });
                                }

                                // add current site button
                                addButtons();

                                // inject last selected table
                                addLastSelectedSites();

                                // add styles
                                var iframeStyles = '';
                                iframeStyles += '#lastSitesSelect { background:#fff;position:absolute;right:0;border-left:1px solid #e5e5e5;overflow:hidden; }';
                                iframeStyles += '#lastSitesSelect .table { margin-bottom:0; }';
                                iframeStyles += '#lastSitesSelect .table thead tr a { float:right; }';
                                iframeStyles += '#lastSitesSelect .table thead tr a:hover i { color:#000; }';
                                iframeStyles += '#lastSitesSelect .table tbody tr td { position:relative; }';
                                iframeStyles += '#lastSitesSelect .table tbody tr td a { position:absolute;background:#fff;top:0;padding:6px 3px;color:#b12628;border-left:1px solid #e5e5e5;text-decoration:none; }';
                                iframeStyles += '#lastSitesSelect .table tbody tr td a:hover { border-left:1px solid #b12628;background:#b12628;color:#fff; }';
                                iframeStyles += '#m_c_selectionDialog_pnlSearch .filter-form-buttons-cell { padding-right:4px; }';
                                iframeStyles += '#m_c_selectionDialog_pnlSearch .filter-form-buttons-cell #resetName,';
                                iframeStyles += '#m_c_selectionDialog_pnlSearch .filter-form-buttons-cell #searchCurrentSite { margin-right:4px; }';
                                addStyles($('head', $this.contents()), iframeStyles);
                            }
                        }
                    }
                }
                // "Widget/Web part properties" modal
                else {
                    var $iframeFrameset = $('frameset', $this.contents());
                    if ($iframeFrameset.length > 0) {
                        //console.log('$iframeFrameset', $iframeFrameset);
                        var $frameContent = $('frame[name="' + frameMapRev['4'] + '"], frame[name="' + frameMapRev['7'] + '"]', $iframeFrameset); //widgetpropertiescontent/webpartpropertiescontent
                        if ($frameContent.length > 0) {
                            //console.log('binding event');
                            //console.log('$frameContent', $frameContent, $($frameContent[0].contentDocument));
                            //console.log($iframeFrameset);
                            $iframeFrameset.on('modified', function () {
                                if (debugF) console.log('  (modified triggered)');
                                $iframeFrameset.data('modified', true);
                            });
                        }
                    }
                }
            }
            // perform logic based on hash
            else checkHash(0, hash, $this, 1, ifid);
        }
    }

    // this allows me to store and retrieve the function (with arguments) I bind to addEventListener so I can remove it later in applyLoadToIframes()
    //   thanks to https://stackoverflow.com/a/31195862
    function handleRealLoadHandler (elem, func, args) {
        var f = function (ff, vv) {
            return (function (e) {
                ff(e, vv);
            });
        }(func, args);

        elem.addEventListener('load', f, true);

        return f;
    }

    // recursively applies event listeners to all containing iframes
    function applyLoadToIframes ($contents, lvl, idType, id, ch) {
        if (debugF) console.log('  '.repeat(lvl - 1) + '# attempting aLTI; lvl[' + lvl + ']; idType[' + idType + ']; id[' + id + ']; ch[' + ch + ']');
        var $body = $('body', $contents);
        var $frameset;

        // add frame faux load event listeners to all frames within current page so we can see events triggered by the Kentico Admin Tools Helper userscript
        if ($body.length === 0) {
            $frameset = $('frameset', $contents);
            if ($frameset.length === 0) console.log('  ! Warning: Unexpected $body and $frameset size');
            else {
                // recursively apply listeners to all frames
                var frameArr = $('frame', $frameset).toArray();
                for (var i = 0, len = frameArr.length, $v; i < len; ++i) {
                    $v = $(frameArr[i]);
                    var fid = frameMap[$v.attr('name')] || $v.attr('name');
                    if (debugF) console.log('  '.repeat(lvl) + '(applying to frame); fid[' + fid + ']');

                    // recursively apply immediately
                    applyLoadToIframes($($v[0].contentDocument), lvl + 1, 2, fid, 'instant');

                    // attach event handler to current iframe
                    $v.off('load').on('load', function (e) {
                        var $this = $(this);
                        var currentFrameAttrName = $this.attr('name');
                        var fid = frameMap[currentFrameAttrName] || currentFrameAttrName;
                        if (debugF) console.log('# aLTI loaded frame; lvl[' + lvl + ']; fid[' + fid + ']');

                        //console.log($($v[0].contentDocument), $($this[0].contentDocument));
                        // recursively apply on triggered event
                        applyLoadToIframes($($this[0].contentDocument), lvl + 1, 2, fid, 'delayed');

                        // ensure things happen after iframes load
                        bruteForceLooperHelper();
                        $this.ready(function () {
                            //console.log('delayed frame load ready');
                            bruteForceLooperHelper();
                        });

                        // perform logic based on hash
                        checkHash(3, hash, $this, 2, fid);
                    });
                }
            }
        }
        // add iframe load event listener (with capture) to body so we can see iframe load events otherwise not capturable by our $.on('load') listener below
        else {
            // add/remove event listeners to body
            var elfsProp = lvl + ',' + idType + ',' + id; // eventListenerFuncStore prop
            if (eventListenerFuncStore.hasOwnProperty(elfsProp)) {
                $body[0].removeEventListener('load', eventListenerFuncStore[elfsProp], true);
            }
            eventListenerFuncStore[elfsProp] = handleRealLoadHandler($body[0], handleRealLoad, lvl);
            //console.log('elfsProp', elfsProp, eventListenerFuncStore);

            // add iframe faux load event listeners to all iframes within current body so we can see events triggered by the Kentico Admin Tools Helper userscript
            var iframeArr = $('iframe', $body).toArray();
            for (var i = 0, len = iframeArr.length, $v; i < len; ++i) {
                $v = $(iframeArr[i]);
                var ifid = iframeMap[$v.attr('id')];
                if (debugF) console.log('  '.repeat(lvl) + '(applying to iframe); ifid[' + ifid + ']');

                // recursively apply immediately
                applyLoadToIframes($v.contents(), lvl + 1, 1, ifid, 'instant');

                // attach event handler to current iframe
                $v.off('fauxLoad').on('fauxLoad', function (e) {
                    var $this = $(this);
                    var currentIframeAttrID = $this.attr('id');
                    var ifid = iframeMap[currentIframeAttrID] || currentIframeAttrID;
                    if (debugF) console.log('# aLTI fauxLoaded iframe; lvl[' + lvl + ']; ifid[' + ifid + ']');

                    // recursively apply on triggered event
                    applyLoadToIframes($this.contents(), lvl + 1, 1, ifid, 'delayed');

                    // ensure things happen after iframes load
                    bruteForceLooperHelper();
                    $this.ready(function () {
                        bruteForceLooperHelper();
                    });

                    // handle main iframe logic
                    if (ifid === 1) {
                        if (debugF) console.log('  (main iframe loaded); hash[' + window.location.hash + ']');

                        hash = window.location.hash; // update hash of window at every iframe load
                    }

                    // perform logic based on hash
                    checkHash(1, hash, $this, 1, ifid);
                });

                // attach regular event handler to current iframe  (for testing reasons)
                /*$v.on('load', function (e) {
                    var $this = $(this);
                    var currentIframeAttrID = $this.attr('id');
                    var ifid = iframeMap[currentIframeAttrID] || currentIframeAttrID;
                    if (debugF) console.log('# aLTI testLoaded iframe; lvl[' + lvl + ']; ifid[' + ifid + ']');
                });*/
            }
        }
    }

    // unload Feature 2
    function unloadFeature2 () {
        if (f2Status) {
            $('body').off('click', '.ui-widget-overlay');
        }
        f2Status = 0;
    }

    // initialize Feature 2
    function initFeature2 () {
        if (!katSettings.feature2) { // enableModalClosingHelper
            if (debugV) console.log('! ModalClosingHelper disabled');
            return;
        }

        // unbinds click event from body
        unloadFeature2();

        // bind click event to body
        $('body').on('click', '.ui-widget-overlay', function (e) {
            if (debugA) console.log('# attempting to close modal');

            // grab iframe contents
            var $iframeContents = $(e.target).next().find('iframe.ui-widget-content').contents();

            // Essentially what we're doing below:
            //   iterate through the iframes/frames until close button is found then click it

            // (Site List dialog)
            // try to find a close button
            var $closeButton = $('.close-button a i', $iframeContents);
            if ($closeButton.length > 0) {
                // if found, try to click the close button
                $closeButton.click();

                // stop processing
                return;
            }

            // (Widget/Web part Properties dialog)
            //   Accordiception testing: http://testregistrar.tamu.edu/Courses,-Registration,-Scheduling/Final-Examination-Schedules
            // try to find a #frameHeader
            var $frameHeader = $('frame[name="' + frameMapRev['3'] + '"], frame[name="' + frameMapRev['6'] + '"]', $iframeContents); //widgetpropertiesheader, webpartpropertiesheader
            if ($frameHeader.length > 0) {
                // if found but modified, do not click the close button (stop processing)
                if ($('frameset', $iframeContents).data('modified') === true) return;

                // if found, try to find a close button
                $closeButton = $('.close-button a i', $($frameHeader[0].contentDocument));
                if ($closeButton.length > 0) {
                    // if found, try to click the close button
                    $closeButton.click();

                    // stop processing
                    return;
                }
            }

            // (Detect other possible versions of dialogs)
            if (debugF || debugA || debugV) alert('Kentico Admin Tools Exception! Check the console for details.');
            console.log('! Kentico Admin Tools Exception: Top most modal may not have been clicked out of. $iframeContents: ', $iframeContents);
        });

        f2Status = 1;
    }

    // initialize Feature 3
    function initFeature3 () {
        siteListDropdownHelper(0);
    }

    // initialize Feature 4
    function initFeature4 () {
        if (!katSettings.feature4) { // enableBreadcrumbMiddleClickHelper
            if (debugV) console.log('! BreadcrumbMiddleClickHelper disabled');
            return;
        }

        // bind mouseup event to li element
        $('.main-header').on('mouseup', '#js-nav-breadcrumb > li:nth-child(3)', function (e) {
            if (e.which === 2 && e.target.tagName !== 'A') {
                if (debugA) console.log('# middle button clicked on the third .main-header li element');
                window.open(window.location, '_blank');
            }
        });

        // add mutation observer; instead of doing this in the brute force manner, observe when the breadcrumb gets changed and then update it
        var observer = new MutationObserver(function (mutations) {
            //console.log(mutations);
            for (var i = 0, len = mutations.length, v; i < len; ++i) {
                for (var j = 0, len2 = mutations[i].addedNodes.length, $w; j < len2; ++j) {
                    $w = $(mutations[i].addedNodes[j]);
                    if ($w.index() === 2) {
                        //console.log($('a', $w).attr('href')); // debug
                        var $a = $('a', $w);
                        if ($a.attr('href') === 'javascript:void(0)') {
                            $a.attr('href', window.location);
                        }
                    }
                }
            }
        });
        observer.observe($('#js-nav-breadcrumb')[0], { childList: true });//, characterData: true, subtree: true
    }

    // draw setting html
    function drawSettings () {
        //loadLatestSettingsCookie(); // no reason to do this unless we're redrawing (since we are already loading the cookie at init)
        // feature id's of the only settings allowed to be drawn
        var toggleableSettings = [2, 8];
        // associated names to the id's above
        var toggleableSettingNames = ['Modal Closer', 'Auto-select "(more sites...)"'];
        var html = '';
        for (var i = 1, len = Object.keys(katSettings).length, ind; i <= len; ++i) {
            ind = toggleableSettings.indexOf(i);
            //console.log(i, ind);
            if (~ind) {
                html += '<li><label for="feature' + i + '">' + toggleableSettingNames[ind] + '</label><input type="checkbox" id="feature' + i + '"' + (katSettings['feature' + i] ? ' checked' : '') + '></li>';
            }
        }
        return html;
    }

    // draw settings
    function initSettings () {
        // User dropdown test
        //$('#m_c_layoutElem_h_pnlUpdate > div > ul.navbar-right').prepend('<li><h2 class="sr-only">KAT Settings</h2><div class="navbar-inverse cms-navbar"><ul class="nav navbar-nav navbar-right navbar-inverse"><li class=""><a href="#" data-toggle="dropdown" class="dropdown-toggle" title="KAT Settings menu"><i aria-hidden="true" class="icon-cogwheel-square cms-nav-icon-large"></i><span class="sr-only">Open KAT Settings menu</span></a><ul class="dropdown-menu" role="menu"><li><label for="setting1">Setting 1</label><input type="checkbox" name="setting1" id="setting1"></li><li><label for="setting2">Setting 2</label><input type="checkbox" name="setting2" id="setting2" checked></li></li>');

        // KAT icon
        $('#m_c_layoutElem_h_pnlUpdate > div > ul.navbar-right').prepend('<li><h2 class="sr-only">KAT Settings</h2><a class="accordion-toggle collapsed" href="#kat-nav-settings" data-toggle="collapse" title="Open KAT Settings"><i class="icon-cogwheel-square cms-nav-icon-large" aria-hidden="true"></i><span class="sr-only">Open KAT Settings</span></a></li>');
        // KAT panel
        $('#m_c_layoutElem_h_pnlUpdate').append('<div id="cms-header-katsettings"><div id="m_c_layoutElem_h_Header_katSettings_pnlToolbar"><div id="kat-nav-settings" class="navbar cms-navbar-help panel-collapse no-transition collapse"><ul class="nav navbar-nav navbar-left"><li>Jared&apos;s Kentico Admin Tools (KAT)</li>' + (settingOverrideFlag ? '<li><span class="alert-warning" title="Since any override values are already saved in the cookie, you may re-comment back out any setting override variables in the userscript code again. Otherwise, any setting changes made here may not be saved."><strong>WARNING:</strong> Setting override detected!</span></li>' : '') + '</ul><ul class="nav navbar-nav navbar-right">' + drawSettings() + '</ul></div></div></div>');

        // how to break this: click the cog/settings button real fast and you'll see the de-sync of console logs
        /*$('#m_c_layoutElem_h_pnlUpdate > div > ul.navbar-right').on('click', 'a[href="#kat-nav-settings"].collapsed', function (e) {
            console.log('show');
        });
        $('#m_c_layoutElem_h_pnlUpdate > div > ul.navbar-right').on('click', 'a[href="#kat-nav-settings"]', function (e) {
            if (!$(this).hasClass('collapsed')) {
                console.log('hide');
            }
        });*/

        var $settingsElem = $('#m_c_layoutElem_h_pnlUpdate #kat-nav-settings');

        // add mutation observer; force the top bar to adjust its height every time settings gets opened and closed
        var observer = new MutationObserver(function (mutations) {
            //console.log(mutations);
            //console.log('sh', $settingsElem[0].clientHeight, $settingsElem[0].offsetTop);
            //console.log('bh', $('#m_c_layoutElem_h')[0].clientHeight, $('#m_c_layoutElem_h')[0].offsetTop);
            // get height of topbar
            var topBarHt = $('#m_c_layoutElem_h')[0].clientHeight;
            // get height of KAT settings bar
            var settingsHt = $settingsElem[0].clientHeight;
            // get offsetTop of KAT settings bar
            var settingsOST = $settingsElem[0].offsetTop;
            var settingsTotal = settingsHt + settingsOST;
            // if height of top bar != to KAT settings height + offsetTop, set it and adjust iframe top
            if (topBarHt !== settingsTotal) {
                $('#m_c_layoutElem_h').css('height', settingsTotal + 'px');
                $('#m_c_layoutElem_cmsdesktop').css('top', settingsTotal + 'px');
            }
            /*for (var i = 0, len = mutations.length, v; i < len; ++i) {
                v = mutations[i];
                if (v.type === 'attributes') {
                    //console.log(v.attributeName + '; oldv[' + v.oldValue + ']; newv[' + v.target.getAttribute(v.attributeName) + ']');
                }
            }*/
        });
        observer.observe($settingsElem[0], { attributes: true, attributeFilter: ['style'] });

        // bind click event and set cookie
        $settingsElem.on('click', 'input', function (e) {
            var tar = e.target;
            //console.log(tar.id, tar.checked);

            // get latest
            loadLatestSettingsCookie();

            // set change
            katSettings[tar.id] = tar.checked;

            // save settings
            //console.log(JSON.stringify(katSettings));
            setCookie(settingsCookieName, JSON.stringify(katSettings), 365);

            // initialize/unload any affected features
            if (tar.id === 'feature2') {
                if (tar.checked) {
                    initFeature2();
                }
                else {
                    unloadFeature2();
                }
            }
            //console.log('cookie', JSON.parse(getCookie(settingsCookieName)));
        });
    }


    /** INITIALIZE APP **/

    loadLatestSettingsCookie();

    /// Do not run if current version of Kentico isn't in the list of compatible versions
    if (katSettings.feature1) { // enableKenticoVersionDetection
        if (currentKenticoVersion.length === 0 || !~listOfCompatibleKenticoVersions.indexOf(currentKenticoVersion[0])) {
            console.log("! Jared's Kentico Admin Tools only runs on certain versions of Kentico. Detected version: " + currentKenticoVersion + '. List of compatible versions: ', listOfCompatibleKenticoVersions);

            return;
        }
    }
    else if (debugV) {
        console.log('! KenticoVersionDetection disabled');
    }
    console.log("# Jared's Kentico Admin Tools loaded successfully");

    loadLatestLastSelectedSitesCookie();

    // add styles
    var globalStyles = '';
    globalStyles += '#cms-header-katsettings .navbar-left li { padding-left:15px; }';
    globalStyles += '#cms-header-katsettings .navbar-left li span { border-radius:5px;padding:5px 10px;cursor:pointer; }';
    globalStyles += '#cms-header-katsettings .navbar-right li label { cursor:pointer; }';
    globalStyles += '#cms-header-katsettings .navbar-right li input { cursor:pointer;margin:-2px 10px 0 5px;vertical-align:middle; }';
    addStyles($('head'), globalStyles);

    /// Close top-most modal when clicking out of it
    //    Scenarios: opening a widget within a widget, opening the site list dialog, what else?
    initFeature2();

    /// Enable middle-clicking to work for the breadcrumb in the top header
    initFeature4();

    /// Feature 3 => very top of all admin pages
    initFeature3();

    /// Draw and bind events to the Kentico Admin Tools Settings
    initSettings();

    /// Recursively apply event listeners to all containing iframes
    applyLoadToIframes($('html'), 1, 0, 0, 'instant');
});
