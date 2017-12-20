// ==UserScript==
// @name         Kentico Admin Tools
// @namespace    http://jaredgotte.com
// @version      2.4
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
  * While in the Site Export wizard, automatically change the item listing dropdown to 100 from 10 (or at least move the dropdown to the top)
  * In the CSS stylesheet (and Smart search) app, add a button -- similar to the "Current Site" one for Sites -- to where it grabs the site's abbreviation within the parenthesis and filters based on that (won't work for all sites)
  * For Settings:
      * Create custom show/hide logic for dropdown/expand
      * Ensure latest settings are loaded (via cookie)
      * Add more options
  * Add "refresh/update" button to the "last selected sites" table
*/

/*
# List of Possible Bugs:
  * After completing/cancelling the Site/Object Export/Import wizard (and thereby getting bounced back to the Sites app), the "Current Site" button may not reappear automatically on the form
    * might be fixed
  * Users -> edit -> Sites tab -> Add sites does not inherit Feature 6
  * KAT settings -> toggle on/off auto-select
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
*/

jQuery(function ($, undefined) {
    'use strict';


    /** DEFINE VARIABLES **/

    // # User defined variables
    // (Debug message switches)
    // prints out basic debug messages to console.log when true
    var debug  = false;
    // prints out verbose debug messages to console.log when true
    var debugV = false;
    // prints out iframe related debug messages to console.log when true
    var debugF = false;

    // (Feature toggling) | NOTE: These are just the default settings and they get overwritten by cookie values after the first time a user loads this script
    // enables Feature 1 when true
    var enableKenticoVersionDetection = true; // katSettings.feature1
    // enables Feature 2 when true
    var enableModalClosingHelper = true; // katSettings.feature2
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
    var enableSiteListDropdownAutoHelper = true; // katSettings.feature8

    // (Feature toggling manual overrides)
    // forces Feature 1 to be enabled/disabled when defined
    //var enableKenticoVersionDetectionOverride = true;
    // forces Feature 2 to be enabled/disabled when defined
    //var enableModalClosingHelperOverride = true;
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
    //var enableSiteListDropdownAutoHelperOverride = true;

    // name of our settings cookie
    var settingsCookieName = 'PITOWebCMS_KATSettings';

    // name of our site list cookie
    var lastSelectedSitesCookieName = 'PITOWebCMS_KATLastSelectedSites';

    // (Settings for Feature 1)
    // gets version of Kentico
    var currentKenticoVersion = $('#m_c_layoutElem_h_Header_contextHelp_lblVersion').html().match(/\d+(\.\d+)*/g);
    // defines list of versions of Kentico which are compatible with this tool
    var listOfCompatibleKenticoVersions = [
        '9.0.48',
        '9.0.49',
        '9.0.50'
    ];

    // (Iframe management)
    // mapping of iframe attribute id's to my own designated id's
    var iframeMap = {
        undef: 'N/A',
        m_c_layoutElem_cmsdesktop: 1,
        m_c_plc_lt_ctl00_ObjectTreeMenu_layoutElem_paneContentTMain: 2,
        m_c_plc_lt_ctl00_HorizontalTabs_l_c: 3,
        m_c_layoutElem_contentview: 4 // Pages
    };
    // mapping of hash id's to my own designated app id's
    var hashAppMap = {
        undef: 'N/A',
        '#': 99, // Dashboard
        '': 98, // Dashboard
        '#02cded6b-aa35-4a82-a5f3-e5a5fe82e58b': 1, // Settings
        '#5576826f-328b-4b53-9f4b-e877fabd4d63': 2, // Sites
        '#ef314079-8dbb-4273-bed1-a4af14d0cbf7': 3, // Widgets
        '#e7c58bcc-a132-40cf-b587-c11fbf146963': 4, // Event log
        '#95a82f36-9c40-45f0-86f1-39aa44db9a77': 5 // Pages
    };

    // (Feature 6,7)
    // how long brute force runs for (in seconds)
    var bruteForceLooperPollSeconds = 1;
    // the timeout between intervals (in milliseconds)
    var bruteForceLooperPollRate = 50;

    // # Static variables
    // gets hash of window at load
    var hash = window.location.hash;
    // current site
    var currentSite = '';
    // this holds an object of our setting values (gets stored/retrieved via cookies)
    var katSettings = {};
    // settings cookie val
    var settingsCookie = null;
    // Select Site dialog observer
    var selectSiteObserver = null;
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
    // if (debugF) console.log(iframeMap, iframeMapRev, iframeMap['undef']);
    // reverse mapping for easy lookup (essentially flips the keys and values of hashAppMap)
    /*var hashAppMapRev = Object.keys(iframeMap).reduce((acc, propName) => {
        acc[iframeMap[propName]] = propName;
        return acc;
    }, {});*/

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

    // ensure lastSelectedSites cookie is up-to-date
    function loadLatestSettingsCookie () {
        // attempts to get the cookie which stores our settings
        settingsCookie = getCookie(settingsCookieName);
        //console.log('settingsCookie len', settingsCookie.length);

        // if the settings cookie exists, load our settings
        if (settingsCookie.length > 0) {
            katSettings = JSON.parse(settingsCookie);
            //console.log('parsed katSettings', katSettings);
        }
        // otherwise, set our default settings cookie
        else {
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
            //console.log('defaulted katSettings', katSettings);

            setCookie(settingsCookieName, JSON.stringify(katSettings), 365);
        }

        // manual overrides
        if (typeof enableKenticoVersionDetectionOverride !== 'undefined') katSettings.feature1 = enableKenticoVersionDetectionOverride;
        if (typeof enableModalClosingHelperOverride !== 'undefined') katSettings.feature2 = enableModalClosingHelperOverride;
        if (typeof enableSiteListDropdownHelperOverride !== 'undefined') katSettings.feature3 = enableSiteListDropdownHelperOverride;
        if (typeof enableBreadcrumbMiddleClickHelperOverride !== 'undefined') katSettings.feature4 = enableBreadcrumbMiddleClickHelperOverride;
        if (typeof enableCurrentSiteButtonHelperOverride !== 'undefined') katSettings.feature5 = enableCurrentSiteButtonHelperOverride;
        if (typeof enableCurrentSiteButtonHelperExtensionOverride !== 'undefined') katSettings.feature6 = enableCurrentSiteButtonHelperExtensionOverride;
        if (typeof enableKenticoLoaderHiderOverride !== 'undefined') katSettings.feature7 = enableKenticoLoaderHiderOverride;
        if (typeof enableSiteListDropdownAutoHelperOverride !== 'undefined') katSettings.feature8 = enableSiteListDropdownAutoHelperOverride;
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
        var d = new Date();
        d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
        var expires = 'expires=' + d.toUTCString();
        document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/Admin;domain=.tamu.edu';
    }

    // gets cookie
    function getCookie (cname) {
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
            // ensures breadcrumb a href is set to the current page
            if (katSettings.feature4) { // enableBreadcrumbMiddleClickHelper
                var $link = $('#m_c_layoutElem_h_pnlUpdate > .navbar').find('#js-nav-breadcrumb > li:nth-child(3) > a');
                if ($link.length > 0 && $link.attr('href') === 'javascript:void(0)') {
                    $link.attr('href', window.location);
                }
            }

            // ensures Kentico's loader stays hidden (improves performance)
            if (katSettings.feature7 && window.Loader) { // enableKenticoLoaderHider
                window.Loader.hide();
            }

            bruteForceLooperIterator++;
        }
        else {
            if (debugF) console.log('(bruteForceLooper done)\n ');
            clearInterval(bruteForceLooperHelper.timeout);
        }
    }

    // (Feature 3)
    // helper function to SiteListDropdownHelper()
    function SiteListDropdownHelperHelper ($dropdownSel, moreSitesSel, autoOption) {
        // get the site list dropdown element
        //var $dropdownSel = $(this);
        //if (debugV) console.log('$dropdownSel', $dropdownSel);

        // now get the `(more sites...)` option element
        var $moreSitesSel = $dropdownSel.find(moreSitesSel);
        //if (debugV) console.log('$moreSitesSel', $moreSitesSel, 'index', $moreSitesSel.index());

        // if auto select option on
        if (katSettings.feature8 && autoOption) { // enableSiteListDropdownAutoHelper
            // auto select "(more sites...)"
            $dropdownSel.val('-2').change();
        }
        // if auto select option off
        else {
            // alternate approach
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
    function SiteListDropdownHelper (hashId, $this) {
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
                    if (debugF || debugV) console.log('  SiteListDropdownHelper clicked');
                    //if (debugV) console.log(e.target, this);

                    // arguments: dropdown menu jQuery selector, more sites option selector, auto select option to click it instead of move it
                    SiteListDropdownHelperHelper($(this).find('.dropdown-menu'), 'li[data-raw-value="-2"]', false);
                });
                break;
            case 1: // Settings app (top left)
                if (debugF || debugV) console.log('  (for Settings app)');
                // drill down to the site selector (through an iframe and frame) in this order:
                //   1) iframe#m_c_layoutElem_cmsdesktop (already here)
                //   2) frame[name="categories"]
                // and bind the click event to the dropdown
                var $frame = $('frame[name="categories"]', $this.contents());
                //if (debugV) console.log('$frame', $frame);
                if ($frame.length > 0) {
                    $($frame[0].contentDocument).on('click', '.DropDownField', function (e) {
                        if (debugF || debugV) console.log('  SiteListDropdownHelper clicked');
                        //if (debugV) console.log(e.target, this);

                        // arguments: dropdown menu jQuery selector, more sites option selector, auto select option to click it instead of move it
                        SiteListDropdownHelperHelper($(this), 'option[value="-2"]', true);
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
                    if (debugF || debugV) console.log('  SiteListDropdownHelper clicked', $(this).is(':focus'));
                    //if (debugV) console.log(e.target, this);

                    // arguments: dropdown menu jQuery selector, more sites option selector, auto select option to click it instead of move it
                    SiteListDropdownHelperHelper($(this), 'option[value="-2"]', true);
                });
                break;
            case 4: // Event log app (top right)
                if (debugF || debugV) console.log('  (for Event log app)');
                // drill down to the site selector (through 1 iframe) in this order:
                //   1) iframe#m_c_layoutElem_cmsdesktop (already here)
                // and bind the click event to the dropdown
                $('#m_plcSiteSelector_siteSelector_ss', $this.contents()).on('click', '.DropDownField', function (e) {
                    if (debugF || debugV) console.log('  SiteListDropdownHelper clicked');
                    //if (debugV) console.log(e.target, this);

                    // arguments: dropdown menu jQuery selector, more sites option selector, auto select option to click it instead of move it
                    SiteListDropdownHelperHelper($(this), 'option[value="-2"]', false);
                });
                break;
            default:
                console.log('  ! Unexpected id given for SiteListDropdownHelper(): ', id);
                break;
        }
    }

    // (All features)
    // only run certain code while in its respective app (by checking the hash)
    function checkHash (listener, hash, $this, ifid) {
        var hashId = hashAppMap[hash] || -1;
        switch (hashId) {
            case 99: case 98: // Dashboard
                if (debugV && debugF) console.log('  (Dashboard detected); hashId[' + hashId + ']');
                break;
            case 1: // Settings
                if (ifid === 1) {
                    if (debugF) console.log('  (Settings app detected)');
                    if (listener === 1) console.log('  ! Why was Settings app detected by fauxLoad?');

                    // Feature 3 => top left of Settings app
                    SiteListDropdownHelper(hashId, $this);
                }
                break;
            case 2: // Sites
                if (ifid === 1) {
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
                                    if (debugF) console.log('    Current Site button clicked');

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
                break;
            case 3: // Widgets
                if (ifid === 1) {
                    if (debugF) console.log('  (Widgets app detected)');
                }
                else if (ifid === 3) {
                    // Feature 3 => Widget Security tab
                    SiteListDropdownHelper(hashId, $this);
                }
                break;
            case 4: // Event log
                if (ifid === 1) {
                    if (debugF) console.log('  (Event log app detected)');
                    // (Feature 3)
                    // create and set mutation observer
                    var $dropdown = $('#m_plcSiteSelector_siteSelector_pnlUpdate', $this.contents());
                    if ($dropdown.length !== 0) {
                        var observer = new MutationObserver(function (mutations) {
                            // init helper on change
                            SiteListDropdownHelper(hashId, $this);
                        });
                        observer.observe($dropdown[0], { childList: true });
                    }
                    // initialize helper
                    SiteListDropdownHelper(hashId, $this);
                }
                break;
            case 5:
                if (ifid === 1) {
                    if (debugF) console.log('  (Pages app detected)');
                    // (Feature 6,7)
                    bruteForceLooperHelper();
                }
                break;
            default:
                console.log('! Unexpected hash passed to checkHash(); hash[' + hash + ']; hashId[' + hashId + ']');
                break;
        }
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

    // recursively applies event listeners to all containing iframes
    function applyLoadToIframes ($body, lvl, ch) {
        if (debugF) console.log('  '.repeat(lvl - 1) + '# attempting aLTI; lvl[' + lvl + ']; ch[' + ch + ']');
        $body = $($body);

        // add iframe load event listener (with capture) to body so we can see iframe load events otherwise not capturable by our $.on('load') listener below
        if ($body.length === 0) console.log('  ! Warning: Unexpected $body size');
        else $body[0].addEventListener('load', function (e) {
            //console.log('realLoad', e);
            var tar = e.target;
            if (tar.tagName === 'IFRAME' && tar.name !== 'QuickInsertImage') {
                var $this = $(tar);
                var ifid = iframeMap[tar.id] || tar.id;
                if (debugF) console.log('# aLTI realLoaded iframe; lvl[' + lvl + ']; ifid[' + ifid + ']');
                if (debugF && debugV) console.log('  ', tar);

                // recursively apply on triggered event
                applyLoadToIframes($('body', $this.contents()), lvl + 1, 'delayed');

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

                // handle modal iframe logic
                if ($this.attr('name') === 'SelectionDialog') {
                    var $children = $this.contents().find('body').children();
                    if ($children.length > 0) {
                        if (debugF) console.log('  (modal iframe loaded)');

                        if (katSettings.feature6 && $('#m_pt_headTitle', $children).text().trim() === 'Select site') { // enableCurrentSiteButtonHelperExtension
                            if (debugF) console.log('    (in "Select site" modal)');

                            // adds our 'current site' or 'reset' button next to search and binds the click event to it
                            var addButton = function (a) {
                                var $contents = $this.contents();
                                //console.log('addButton', a);

                                // push selected site name (from normal table listing) to our lastSelectedSites array
                                $('#m_c_selectionDialog_uniGrid_v', $this.contents()).on('click', '.SelectableItem', function (e) {
                                    loadLatestLastSelectedSitesCookie();
                                    //console.log(e.target.textContent, lastSelectedSites);
                                    //console.log('lastSelectedSites before', lastSelectedSites.slice());
                                    // push site name
                                    lastSelectedSites.push(trimSiteName(e.target.textContent));
                                    // truncate list (if over 100 elements)
                                    if (lastSelectedSites.length > 100) {
                                        lastSelectedSites = lastSelectedSites.slice(-100);
                                    }
                                    // filter out duplicates (saving the last occurrence)
                                    lastSelectedSites = lastSelectedSites.filter((el, i, ar) => ar.lastIndexOf(el) === i);
                                    //console.log('lastSelectedSites after', lastSelectedSites);
                                    // update cookie
                                    setCookie(lastSelectedSitesCookieName, JSON.stringify(lastSelectedSites), 365);
                                });

                                var nameVal = trimSiteName($('#m_c_selectionDialog_txtSearch', $contents).val());
                                // if name field is current site
                                //   select the site
                                if (nameVal === currentSiteName() || nameVal === lastSelectedSite) {
                                    $('#m_c_selectionDialog_uniGrid_v tr:first-child .SelectableItem', $contents).click();
                                }
                                // otherwise, add the buttons
                                else {
                                    var $buttonRow = $('#m_c_selectionDialog_pnlSearch .filter-form-buttons-cell', $contents).css('padding-right', '4px');
                                    // if name field is not current site
                                    //   add current site button and attach click event
                                    if (nameVal !== currentSiteName()) {
                                        $buttonRow
                                            .prepend('<button type="button" value="Current Site" id="searchCurrentSite" class="btn btn-secondary" style="margin-right:4px">Current Site</button>')
                                            .on('click', 'button#searchCurrentSite', function () {
                                            if (debugF) console.log('    "Current Site" button clicked in "Select site" dialog');

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
                                            .prepend('<button type="button" value="Reset" id="resetName" class="btn btn-default" style="margin-right:4px">Reset</button>')
                                            .on('click', 'button#resetName', function () {
                                            if (debugF) console.log('    "Reset" button clicked in "Select site" dialog');

                                            // insert name of current site into the 'Name' input
                                            $('#m_c_selectionDialog_txtSearch', $contents).val('');

                                            // click Search
                                            $('#m_c_selectionDialog_btnSearch', $contents).click();
                                        });
                                    }
                                }
                            };

                            // adds our last selected sites to the table html
                            var lastSelectedHTML = function () {
                                var itemsPerPage = $('#m_c_selectionDialog_uniGrid_p_drpPageSize', $children).val() || 10;
                                var html = '';
                                // build html table rows
                                for (var len = lastSelectedSites.length, i = len - 1, max = Math.min(len, itemsPerPage), count = 0; count < max; --i, ++count) {
                                    if (i < 0) break;
                                    var siteName = lastSelectedSites[i];
                                    html += '<tr><td><div class="SelectableItem" title="Select &quot;' + siteName + '&quot;">' + siteName + '</div><a role="button" title="Delete &quot;' + siteName + '&quot; from list?">×</a></td></tr>';
                                }
                                return html;
                            };

                            // inject last selected sites table
                            var addLastSelectedSites = function (a) {
                                //console.log('addLastSelectedSites', a);
                                loadLatestLastSelectedSitesCookie();
                                if (lastSelectedSites.length > 0) {
                                    // generate and inject table HTML
                                    var divContent = $('#divContent', $children)[0];
                                    var scrollbarDiff = divContent.offsetWidth - divContent.clientWidth;
                                    var tableWidth = 275 - scrollbarDiff;
                                    $('#m_c_selectionDialog_pnlUpdate', $children).prepend('<div id="lastSitesSelect" style="width:' + tableWidth + 'px;"><table class="table"><thead><tr><th>Last selected sites</th></tr></thead><tbody>' + lastSelectedHTML() + '</tbody></table></div>');

                                    // attach click events
                                    var $contents = $this.contents();
                                    $('#lastSitesSelect', $contents).on('click', 'div.SelectableItem', function () {
                                        if (debugF) console.log('    "Site" item clicked in "Select site" dialog');

                                        // record name of selected site to use for addButton() (so we can auto select it once it gets filtered)
                                        lastSelectedSite = $(this).text();

                                        // insert name of current site into the 'Name' input
                                        $('#m_c_selectionDialog_txtSearch', $contents).val(lastSelectedSite);

                                        // click Search
                                        $('#m_c_selectionDialog_btnSearch', $contents).click();
                                    });

                                    $('#lastSitesSelect', $contents).on('click', 'div.SelectableItem + a', function () {
                                        if (debugF) console.log('    "Delete site" item clicked in "Select site" dialog; name[' + $(this).text() + ']');

                                        loadLatestLastSelectedSitesCookie();

                                        // remove site from list if it exists
                                        var i = lastSelectedSites.indexOf($(this).prev().text());
                                        if (~i) lastSelectedSites.splice(i, 1);

                                        // update cookie
                                        setCookie(lastSelectedSitesCookieName, JSON.stringify(lastSelectedSites), 365);

                                        // redraw table
                                        $('#lastSitesSelect tbody', $contents).html(lastSelectedHTML());
                                    });

                                    // add styles
                                    var iframeStyles = '';
                                    iframeStyles += '#lastSitesSelect { background:#fff;position:absolute;right:0;border-left:1px solid #e5e5e5;overflow:hidden; }';
                                    iframeStyles += '#lastSitesSelect .table { margin-bottom:0; }';
                                    iframeStyles += '#lastSitesSelect .table tbody tr td { position:relative; }';
                                    iframeStyles += '#lastSitesSelect .table tbody tr td a { position:absolute;background:#fff;top:0;left:' + (tableWidth - 17) + 'px;padding:6px 3px;color:#b12628;border-left:1px solid #e5e5e5;text-decoration:none; }';
                                    iframeStyles += '#lastSitesSelect .table tbody tr td a:hover { border-left:1px solid #b12628;background:#b12628;color:#fff; }';
                                    addStyles($('head', $this.contents()), iframeStyles);
                                }
                            };

                            // create and set mutation observer
                            var $panel = $('#m_c_selectionDialog_pnlUpdate', $children);
                            if ($panel.length !== 0) {
                                var observer = new MutationObserver(function (mutations) {
                                    //console.log(mutations);
                                    if (mutations[0].addedNodes.length > 1) {
                                        addButton(1);
                                        addLastSelectedSites(1);
                                    }
                                });
                                observer.observe($panel[0], { childList: true });
                            }

                            // add current site button
                            addButton(0);

                            // inject last selected table
                            addLastSelectedSites(0);
                        }
                    }
                }
                // perform logic based on hash
                else checkHash(0, hash, $this, ifid);
            }
        }, true);

        // add iframe faux load event listeners to all iframes within current body so we can see events triggered by the Kentico Admin Tools Helper userscript
        var iframeArr = $('iframe', $body).toArray();
        for (var i = 0, len = iframeArr.length, $v; i < len; ++i) {
            $v = $(iframeArr[i]);
            if (debugF) console.log('  '.repeat(lvl) + '(applying to iframe); ifid[' + iframeMap[$v.attr('id')] + ']');

            // recursively apply immediately
            applyLoadToIframes($('body', $v.contents()), lvl + 1, 'instant');

            // attach event handler to current iframe
            $v.on('fauxLoad', function (e) {
                var $this = $(this);
                var currentIframeAttrID = $this.attr('id');
                var ifid = iframeMap[currentIframeAttrID] || currentIframeAttrID;
                if (debugF) console.log('# aLTI fauxLoaded iframe; lvl[' + lvl + ']; ifid[' + ifid + ']');

                // recursively apply on triggered event
                applyLoadToIframes($('body', $v.contents()), lvl + 1, 'delayed');

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
                checkHash(1, hash, $this, ifid);
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

    // initialize Feature 2
    function initFeature2 () {
        $('body').on('click', '.ui-widget-overlay', function (e) {
            if (katSettings.feature2) {
                if (debug) console.log('# attempting to close modal');

                // grab iframe contents
                var $iframeContents = $(e.target).next().find('iframe.ui-widget-content').contents();
                //if (debugV) console.log('$iframeContents', $iframeContents);

                // Essentially what we're doing:
                //   iterate through the iframes/frames until close button is found then click it

                // (Site List dialog)
                // try to find a close button
                var $closeButton = $iframeContents.find('.close-button a i');
                //if (debugV) console.log('$closeButton', $closeButton);
                if ($closeButton.length > 0) {
                    // if found, try to click the close button
                    $iframeContents.find('.close-button a i').click();

                    return; // stop processing
                }

                // (Widget Properties dialog)
                //   Accordiception testing: http://testregistrar.tamu.edu/Courses,-Registration,-Scheduling/Final-Examination-Schedules
                // try to find a #frameHeader
                var $frameHeader = $iframeContents.find('frame#frameHeader');
                if ($frameHeader.length > 0) {
                    // if found, try to click the close button
                    var $frameHeaderContents = $($frameHeader[0].contentDocument);
                    //if (debugV) console.log('frameHeaderContents', $frameHeaderContents);
                    //if (debugV) console.log('close-button', $frameHeaderContents.find('.close-button'));
                    $frameHeaderContents.find('.close-button a i').click();

                    return; // stop processing
                }

                // (Detect other possible versions of dialogs)
                alert('Kentico Admin Tools Exception! Check the console for details.');
                console.log('! Kentico Admin Tools Exception: Top most modal may not have been clicked out of. $iframeContents: ', $iframeContents);
            }
        });
    }

    // reinitialize Feature 2
    function reInitFeature2 () {
        $('body').off('click', '.ui-widget-overlay');
        initFeature2();
    }


    /** INITIALIZE APP **/

    loadLatestSettingsCookie();

    /// Do not run if current version of Kentico isn't in the list of compatible versions
    if (katSettings.feature1) { // enableKenticoVersionDetection
        if (currentKenticoVersion.length === 0 || !~listOfCompatibleKenticoVersions.indexOf(currentKenticoVersion[0])) {
            console.log('! Kentico Admin Tools only runs on certain versions of Kentico. Detected version: ' + currentKenticoVersion + '. List of compatible versions: ', listOfCompatibleKenticoVersions);

            return;
        }
        else {
            console.log('# Kentico Admin Tools successfully loaded');
        }
    }
    else if (debugV) {
        console.log('! KenticoVersionDetection disabled');
    }

    // add styles
    var globalStyles = '';
    globalStyles += '#cms-header-katsettings .navbar-left li { padding-left:15px; }';
    globalStyles += '#cms-header-katsettings .navbar-right li label { cursor:pointer; }';
    globalStyles += '#cms-header-katsettings .navbar-right li input { cursor:pointer;margin:-2px 10px 0 5px;vertical-align:middle; }';
    addStyles($('head'), globalStyles);

    /// Close top-most modal when clicking out of it
    //    Scenarios: opening a widget within a widget, opening the site list dialog, what else?
    if (katSettings.feature2) { // enableModalClosingHelper
        initFeature2();
    }
    else if (debugV) {
        console.log('! ModalClosingHelper disabled');
    }

    /// Enable middle-clicking to work for the breadcrumb in the top header
    if (katSettings.feature4) { // enableBreadcrumbMiddleClickHelper
        $('.main-header').on('mouseup', '#js-nav-breadcrumb > li:nth-child(3)', function (e) {
            if (e.which === 2 && e.target.tagName !== 'A') {
                if (debug) console.log('# middle button clicked on the third .main-header li element');
                window.open(window.location, '_blank');
            }
        });
    }
    else if (debugV) {
        console.log('! BreadcrumbMiddleClickHelper disabled');
    }

    loadLatestLastSelectedSitesCookie();

    /// Feature 3 => very top of all admin pages
    SiteListDropdownHelper(0);

    /// Recursively apply event listeners to all containing iframes
    applyLoadToIframes($('body'), 1, 'instant');

    /// Draw and bind events to Kentico Admin Settings
    // draw setting html
    function drawSettings () {
        var settings = [2, 8];
        var settingNames = ['Modal Closer', 'Auto-select "(more sites...)"'];
        var html = '';
        for (var i = 1, len = Object.keys(katSettings).length; i <= len; ++i) {
            var ind = settings.indexOf(i);
            //console.log(i, ind);
            if (~ind) {
                html += '<li><label for="feature' + i + '">' + settingNames[ind] + '</label><input type="checkbox" id="feature' + i + '"' + (katSettings['feature' + i] ? ' checked' : '') + '></li>';
            }
        }
        return html;
    }

    // User dropdown test
    //$('#m_c_layoutElem_h_pnlUpdate > div > ul.navbar-right').prepend('<li><h2 class="sr-only">KAT Settings</h2><div class="navbar-inverse cms-navbar"><ul class="nav navbar-nav navbar-right navbar-inverse"><li class=""><a href="#" data-toggle="dropdown" class="dropdown-toggle" title="KAT Settings menu"><i aria-hidden="true" class="icon-cogwheel-square cms-nav-icon-large"></i><span class="sr-only">Open KAT Settings menu</span></a><ul class="dropdown-menu" role="menu"><li><label for="setting1">Setting 1</label><input type="checkbox" name="setting1" id="setting1"></li><li><label for="setting2">Setting 2</label><input type="checkbox" name="setting2" id="setting2" checked></li></li>');

    // KAT icon
    $('#m_c_layoutElem_h_pnlUpdate > div > ul.navbar-right').prepend('<li><h2 class="sr-only">KAT Settings</h2><a class="accordion-toggle collapsed" href="#kat-nav-settings" data-toggle="collapse" title="Open KAT Settings"><i class="icon-cogwheel-square cms-nav-icon-large" aria-hidden="true"></i><span class="sr-only">Open KAT Settings</span></a></li>');
    // KAT panel
    $('#m_c_layoutElem_h_pnlUpdate').append('<div id="cms-header-katsettings"><div id="m_c_layoutElem_h_Header_katSettings_pnlToolbar"><div id="kat-nav-settings" class="navbar cms-navbar-help panel-collapse no-transition collapse"><ul class="nav navbar-nav navbar-left"><li>Jared&apos;s Kentico Admin Tools (KAT)</li></ul><ul class="nav navbar-nav navbar-right">' + drawSettings() + '</ul></div></div></div>');

    // how to break this: click the cog/settings button real fast and you'll see the de-sync of console logs
    /*$('#m_c_layoutElem_h_pnlUpdate > div > ul.navbar-right').on('click', 'a[href="#kat-nav-settings"].collapsed', function (e) {
        console.log('show');
    });
    $('#m_c_layoutElem_h_pnlUpdate > div > ul.navbar-right').on('click', 'a[href="#kat-nav-settings"]', function (e) {
        if (!$(this).hasClass('collapsed')) {
            console.log('hide');
        }
    });*/

    // bind click event and set cookie
    $('#m_c_layoutElem_h_pnlUpdate #kat-nav-settings').on('click', 'input', function (e) {
        var tar = e.target;
        //console.log(tar.id, tar.checked);
        katSettings[tar.id] = tar.checked;
        setCookie(settingsCookieName, JSON.stringify(katSettings), 365);
        if (tar.id === 'feature2' && tar.checked) {
            // rebind click event to ui-overlay of body
            reInitFeature2();
        }
        //console.log('cookie', JSON.parse(getCookie(settingsCookieName)));
    });
});
