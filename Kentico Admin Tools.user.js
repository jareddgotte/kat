// ==UserScript==
// @name         Kentico Admin Tools
// @namespace    http://jaredgotte.com
// @version      2
// @description  Helps with working in the Kentico /admin interface. Depends on the Kentico Admin Tools Helper userscript. List of compatible Kentico versions can be found in the `listOfCompatibleKenticoVersions` variable defined below.
// @author       Jared Gotte
// @match        http://*.tamu.edu/Admin/*
// @match        https://*.tamu.edu/Admin/*
// @grant        none
// @require      http://code.jquery.com/jquery-3.2.1.min.js
// ==/UserScript==

/*
# List of Current Features:
  1. Only runs on a defined list of Kentico versions
  2. Allows users to close out of modals (e.g. web part properties) by clicking outside of them (rather than having to click on the top-right X or Cancel buttons)
  3. Automatically moves the "(more sites...)" option to the top of Site List dropdowns (beforehand you'd have to scroll all the way down to the bottom of the list)
  4. Enables the ability to open up the current window in a new tab when middle clicking on the breadcrumb link (whereas it did nothing before)
  5. Adds a "Current Site" button to the Sites app search form to help quickly filter out every site but the current one
  6. Adds a "Current Site" button to the "Select Site" dialog after choosing the "(more sites...)" option
  7. Prevents Kentico's Loader from appearing (improves page load performance)
*/

/*
# List of Future Ideas:
  * While in the Site Export wizard, automatically change the item listing dropdown to 100 from 10 (or at least move the dropdown to the top)
  * Move the current site near the top of Site List dropdowns (under "(more sites...)")
  * In the CSS stylesheet (and Smart search) app, add a button -- similar to the "Current Site" one for Sites -- to where it grabs the site's abbreviation within the parenthesis and filters based on that (won't work for all sites)
*/

/*
# List of Possible Bugs:
  * After completing/cancelling the Site/Object Export/Import wizard (and thereby getting bounced back to the Sites app), the "Current Site" button may not reappear automatically on the form
    * might be fixed
  * Event log -> Select site does not inherit Feature 3
  * Users -> edit -> Sites tab -> Add sites does not inherit Feature 6
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
*/

jQuery(function ($, undefined) {
    'use strict';


    /** DEFINE VARIABLES **/

    // (General settings)
    var debug  = false; // if true, prints out BASIC   debug messages to console.log
    var debugV = false; // if true, prints out VERBOSE debug messages to console.log
    var debugF = false; // if true, prints out IFRAME  debug messages to console.log

    // (Feature toggling)
    var enableKenticoVersionDetection          = true; // if true, enables Feature 1
    var enableModalClosingHelper               = true; // if true, enables Feature 2
    var enableSiteListDropdownHelper           = true; // if true, enables Feature 3
    var enableBreadcrumbMiddleClickHelper      = true; // if true, enables Feature 4
    var enableCurrentSiteButtonHelper          = true; // if true, enables Feature 5
    var enableCurrentSiteButtonHelperExtension = true; // if true, enables Feature 6
    var enableKenticoLoaderHider               = true; // if true, enables Feature 7

    // (Settings for Feature 1)
    var currentKenticoVersion = $('#m_c_layoutElem_h_Header_contextHelp_lblVersion').html().match(/\d+(\.\d+)*/g); // gets version of Kentico
    var listOfCompatibleKenticoVersions = [ // defines list of versions of Kentico which are compatible with this tool
        '9.0.48',
        '9.0.49',
        '9.0.50'
    ];

    // (iframe Management)
    var iframeMap = { // map of iframe attribute id's to my own designated id's
        undef: 'N/A',
        m_c_layoutElem_cmsdesktop: 1,
        m_c_plc_lt_ctl00_ObjectTreeMenu_layoutElem_paneContentTMain: 2,
        m_c_plc_lt_ctl00_HorizontalTabs_l_c: 3
    };
    var iframeMapRev = Object.keys(iframeMap).reduce((acc, propName) => { // reverse mapping for easy lookup
        acc[iframeMap[propName]] = propName;
        return acc;
    }, {});
    //console.log(iframeMap, iframeMapRev, iframeMap['undef']);
    window.console.iframeLog = function (msg, iframeDepth, attrID, parentAttrID) { // give iframes access to a nicer console.log message
        if (debugF) console.log('> ' + '  '.repeat(iframeDepth - 1) + msg + '; ifid[' + (iframeMap[attrID] || attrID) + ']; pifid[' + (iframeMap[parentAttrID] || parentAttrID || '') + ']');
    };

    // (Static variables)
    var hash = window.location.hash; // gets hash of window at load

    var bruteForceLooperIterator    = 0; // for Feature 6 and 7
    var bruteForceLooperPollSeconds = 1; // how long brute force runs for
    var bruteForceLooperPollRate    = 50; // the timeout between intervals (in milliseconds)
    var bruteForceLooperIterations = bruteForceLooperPollSeconds * 1000 / bruteForceLooperPollRate;


    /** DEFINE FUNCTIONS **/

    /// Feature 6,7
    // spam handler for bruteForceLooper()
    function bruteForceLooperHelper () {
        if (debugV) console.log('bruteForceLooperIterator', bruteForceLooperIterator);
        bruteForceLooperIterator = 0;
        bruteForceLooper();
        clearInterval(bruteForceLooperHelper.timeout);
        bruteForceLooperHelper.timeout = setInterval(bruteForceLooper, bruteForceLooperPollRate);
    }
    // loops after iframes load to ensure certain things happen
    function bruteForceLooper () {
        if (bruteForceLooperIterator < bruteForceLooperIterations) {
            // ensures breadcrumb a href is set to the current page
            if (enableBreadcrumbMiddleClickHelper) {
                var $link = $('#m_c_layoutElem_h_pnlUpdate > .navbar').find('#js-nav-breadcrumb > li:nth-child(3) > a');
                if ($link.length > 0 && $link.attr('href') === 'javascript:void(0)') {
                    $link.attr('href', window.location);
                }
            }

            // ensures Kentico's loader stays hidden (improves performance)
            if (enableKenticoLoaderHider && window.Loader) {
                window.Loader.hide();
            }

            bruteForceLooperIterator++;
        }
        else {
            if (debugF) console.log('(bruteForceLooper done)\n ');
            clearInterval(bruteForceLooperHelper.timeout);
        }
    }

    /// Feature 3
    // moves `(more sites...)` to the top of all known site list dropdowns
    function SiteListDropdownHelper (id, $this) {
        if (!enableSiteListDropdownHelper) {
            if (debugV) console.log('! SiteListDropdownHelper disabled');
            return;
        }

        if (debugF || debugV) console.log('# loading SiteListDropdownHelper');
        switch (id) {
            case 0: // main header (very top of all admin pages)
                if (debugF || debugV) console.log('  (for main header)');
                // find the site selector and bind the click event to the dropdown
                $('.main-header').on('click', '.header-site-selector', function (e) {
                    if (debugF || debugV) console.log('  SiteListDropdownHelper clicked');
                    //if (debugV) console.log(e.target, this);

                    // get the site list dropdown element
                    var $dropdownSel = $(this).find('.dropdown-menu');
                    //if (debugV) console.log('$dropdownSel', $dropdownSel);

                    // now get the `(more sites...)` li element
                    var $moreSitesSel = $dropdownSel.find('li[data-raw-value="-2"]');
                    //if (debugV) console.log('$moreSitesSel', $moreSitesSel, 'index', $moreSitesSel.index());

                    // run the following code once
                    if ($moreSitesSel.index() > 0) {
                        // move the li element to the top
                        $moreSitesSel.prependTo($dropdownSel);
                        if (debugV) console.log('  "(more sites...)" moved');
                    }
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

                        // get the site list dropdown element
                        var $dropdownSel = $(this);
                        //if (debugV) console.log('$dropdownSel', $dropdownSel);

                        // now get the `(more sites...)` option element
                        var $moreSitesSel = $dropdownSel.find('option[value="-2"]');
                        //if (debugV) console.log('$moreSitesSel', $moreSitesSel, 'index', $moreSitesSel.index());

                        // run the following code once
                        if ($moreSitesSel.index() > 0) {
                            // move the option element to the top
                            $moreSitesSel.prependTo($dropdownSel);
                            if (debugV) console.log('  "(more sites...)" moved');
                        }
                    });
                }
                break;
            case 2: // Widgets app (each Widget's Security tab)
                if (debugF || debugV) console.log('  (for Widgets app)');
                // drill down to the site selector (through 3 iframes) in this order:
                //   1) iframe#m_c_layoutElem_cmsdesktop
                //   2) iframe#m_c_plc_lt_ctl00_ObjectTreeMenu_layoutElem_paneContentTMain
                //   3) iframe#m_c_plc_lt_ctl00_HorizontalTabs_l_c (already here)
                // and bind the click event to the dropdown
                $this.contents().on('click', '.DropDownField', function (e) {
                    if (debugF || debugV) console.log('  SiteListDropdownHelper clicked');
                    //if (debugV) console.log(e.target, this);

                    // get the site list dropdown element
                    var $dropdownSel = $(this);
                    //if (debugV) console.log('$dropdownSel', $dropdownSel);

                    // alternate approach
                    /*var optionArr = $('option', $dropdownSel).toArray();
                    var last = optionArr.pop();
                    console.log(last.value);
                    if (last.value === '-2') {
                        $(last).prependTo($dropdownSel);
                    }*/

                    // now get the `(more sites...)` option element
                    var $moreSitesSel = $dropdownSel.find('option[value="-2"]');
                    //if (debugV) console.log('$moreSitesSel', $moreSitesSel, 'index', $moreSitesSel.index());

                    // run the following code once
                    if ($moreSitesSel.index() > 0) {
                        // move the option element to the top
                        $moreSitesSel.prependTo($dropdownSel);
                        if (debugV) console.log('  "(more sites...)" moved');
                    }
                });
                break;
            default:
                console.log('  ! Unexpected id given for SiteListDropdownHelper(): ', id);
                break;
        }
    }

    // recursively applies event listeners to all containing iframes
    function applyLoadToIframes ($body, lvl, ch) {
        if (debugF) console.log('  '.repeat(lvl - 1) + '# attempting aLTI; lvl[' + lvl + ']; ch[' + ch + ']');

        // add iframe load event listener (with capture) to body so we can see iframe load events otherwise not capturable by our $.on('load') listener below
        if ($body.length === 0) console.log('  ! Warning: Unexpected $body size');
        else $body[0].addEventListener('load', function (e) {
            if (e.target.tagName === 'IFRAME') {
                var tar = e.target;
                var $this = $(tar);
                var ifid = iframeMap[$this.attr('id')] || $this.attr('id');
                if (debugF) console.log('# aLTI realLoaded iframe; lvl[' + lvl + ']; ifid[' + ifid + ']');
                if (debugF && debugV) console.log('  ', tar);

                // ensure things happen after iframes load
                $this.ready(function () {
                    bruteForceLooperHelper();
                });

                if (ifid === 1) {
                    if (debugF) console.log('  (main iframe loaded); hash[' + window.location.hash + ']');

                    hash = window.location.hash; // update hash of window at every iframe load
                }

                // handle modal iframe logic
                if ($this.attr('name') === 'SelectionDialog') {
                    var $children = $this.contents().find('body').children();
                    if ($children.length > 0) {
                        if (debugF) console.log('  (modal iframe loaded)');

                        if (enableCurrentSiteButtonHelperExtension && $('#m_pt_headTitle', $children).text().trim() === 'Select site') {
                            if (debugF) console.log('    (in "Select site" modal)');

                            // add our button next to search and bind the click event to it
                            $('#m_c_selectionDialog_pnlSearch .filter-form-buttons-cell', $children)
                                .prepend('<button type="button" name="searchCurrentSite" value="Current Site" id="searchCurrentSite" class="btn btn-primary">Current Site</button>')
                                .on('click', 'button', function (e) {
                                if ($(this).attr('id') === 'searchCurrentSite') {
                                    if (debugF) console.log('    "Current Site" button clicked in "Select site" dialog');

                                    // insert name of current site into the 'Name' input
                                    $('#m_c_selectionDialog_txtSearch', $children).val($('#m_c_layoutElem_h_Header_ss_pnlSelector .dropdown').text());

                                    // click Search
                                    $('#m_c_selectionDialog_btnSearch', $children).click();
                                }
                            });
                        }
                    }
                }
                // only run the following code while in the Settings app (by checking the hash)
                else if (hash === '#02cded6b-aa35-4a82-a5f3-e5a5fe82e58b') {
                    if (ifid === 1) {
                        if (debugF) console.log('  (Settings app detected)');

                        // Feature 3 => top left of Settings app
                        SiteListDropdownHelper(1, $this);
                    }
                }
                // only run the following code while in the Widgets app (by checking the hash)
                else if (hash === '#ef314079-8dbb-4273-bed1-a4af14d0cbf7') {
                    if (ifid === 3) {
                        // Feature 3 => Widget Security tab
                        SiteListDropdownHelper(2, $this);
                    }
                }
            }
        }, true);

        // add iframe faux load event listeners to all iframes within current body so we can see events triggered by the Kentico Admin Tools Helper userscript
        var iframeArr = $('iframe', $body).toArray();
        for (var i = 0, len = iframeArr.length, $v; i < len; ++i) {
            $v = $(iframeArr[i]);
            if (debugF) console.log('  '.repeat(lvl) + '(applying to iframe); ifid[' + iframeMap[$v.attr('id')] + ']');

            applyLoadToIframes($('body', $v.contents()), lvl + 1, 'instant');

            $v.on('fauxLoad', function (e) {
                var $this = $(this);
                var currentIframeAttrID = $this.attr('id');
                var ifid = iframeMap[currentIframeAttrID] || currentIframeAttrID;
                if (debugF) console.log('# aLTI fauxLoaded iframe; lvl[' + lvl + ']; ifid[' + ifid + ']');

                applyLoadToIframes($('body', $v.contents()), lvl + 1, 'delayed');

                // ensure things happen after iframes load
                $this.ready(function () {
                    bruteForceLooperHelper();
                });

                // handle main iframe logic
                if (ifid === 1) {
                    if (debugF) console.log('  (main iframe loaded); hash[' + window.location.hash + ']');

                    hash = window.location.hash; // update hash of window at every iframe load
                }

                // only run the following code while in the Sites app (by checking the hash)
                if (hash === '#5576826f-328b-4b53-9f4b-e877fabd4d63' && ifid === 1) {
                    if (debugF) console.log('  (Sites app detected)');
                    /// Enable ability to quickly search for the current site in the site list
                    if (enableCurrentSiteButtonHelper) {
                        // drill down to the button group through any iframes:
                        //   1) iframe#m_c_layoutElem_cmsdesktop (already in)
                        // then add our button next to reset/search and bind the click event to it
                        var $contents = $this.contents();
                        $('#m_c_plc_lt_ctl01_Listing_gridElem_filterForm_pnlForm .form-group-buttons', $contents)
                            .prepend('<button type="button" name="searchCurrentSite" value="Current Site" id="searchCurrentSite" class="btn btn-primary">Current Site</button>')
                            .on('click', 'button', function (e) {
                            if ($(this).attr('id') === 'searchCurrentSite') {
                                if (debugF) console.log('    Current Site button clicked');

                                // set 'Site name' value to 0 (Contains)
                                $('#m_c_plc_lt_ctl01_Listing_gridElem_filterForm_SiteDisplayName_drpOperator', $contents).val('0').change();

                                // insert name of current site into the 'Site name' input
                                $('#m_c_plc_lt_ctl01_Listing_gridElem_filterForm_SiteDisplayName_txtText', $contents).val($('#m_c_layoutElem_h_Header_ss_pnlSelector .dropdown').text());

                                // click Search (set a timeout because an error was occurring (since there's a timeout on the select's onchange event, a race condition might've been occurring))
                                setTimeout(function () {
                                    $('#m_c_plc_lt_ctl01_Listing_gridElem_filterForm_btnShow', $contents).click();
                                }, 0);
                            }
                        });
                    }
                    else if (debugV) {
                        console.log('  ! CurrentSiteButtonHelper disabled');
                    }
                }
                // only run the following code while in the Widgets app (by checking the hash)
                else if (hash === '#ef314079-8dbb-4273-bed1-a4af14d0cbf7') {
                    if (ifid === 1) {
                        if (debugF) console.log('  (Widgets app detected)');
                    }
                    else if (ifid === 3) {
                        // Feature 3 => Widget Security tab
                        SiteListDropdownHelper(2, $this);
                    }
                }
                // only run the following code while in the Settings app (by checking the hash)
                else if (hash === '#02cded6b-aa35-4a82-a5f3-e5a5fe82e58b' && ifid === 1) {
                    console.log('  ! Why was Settings app detected?');
                }
            });
        }
    }


    /** INITIALIZE APP **/

    /// Do not run if current version of Kentico isn't in the list of compatible versions
    if (enableKenticoVersionDetection) {
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

    /// Close top-most modal when clicking out of it
    //    Scenarios: opening a widget within a widget, opening the site list dialog, what else?
    if (enableModalClosingHelper) {
        $('body').on('click', '.ui-widget-overlay', function (e) {
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
        });
    }
    else if (debugV) {
        console.log('! ModalClosingHelper disabled');
    }

    /// Enable middle-clicking to work for the breadcrumb in the top header
    if (enableBreadcrumbMiddleClickHelper) {
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

    /// Feature 3 => very top of all admin pages
    SiteListDropdownHelper(0);

    /// Recursively apply event listeners to all containing iframes
    applyLoadToIframes($('body'), 1, 'instant');
});
