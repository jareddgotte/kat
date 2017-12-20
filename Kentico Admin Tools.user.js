// ==UserScript==
// @name         Kentico Admin Tools
// @namespace    jdg
// @version      1.5
// @description  Helps with working in the Kentico /admin interface. List of compatible Kentico versions can be found in the `listOfCompatibleKenticoVersions` variable defined below.
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
*/

/*
# Changelog:
  1.0 | Default features (clicking outside of modal closes it, add `more sites` to the top of dropdown lists)
  1.1 | Tidied up structure, added more areas where `more sites` can appear at the top, paved way of being able to drill down into iframes
  1.2 | Added 'middle button click to open up breadcrumbs in new tab' feature, added Kentico version detection so that it only runs when we want it
  1.3 | Added 'quickly search for current site in Sites app' feature
  1.4 | Separated methods between Static and Dynamic regions (since navigating through the admin interface uses the same iframe instead of refreshing the page)
  1.5 | Enabled ability to toggle on/off particular features
*/

jQuery(function ($, undefined) {
    'use strict';

    //// # Variables

    // (General settings)
    var debug = false;   // if true, prints out BASIC   debug messages to console.log
    var debugV = false;  // if true, prints out VERBOSE debug messages to console.log
    var debugF = true;   // if true, prints out IFRAME  debug messages to console.log

    // (Feature toggling)
    var enableKenticoVersionDetection = true;          // if true, enables Feature 1
    var enableModalClosingHelper = true;               // if true, enables Feature 2
    var enableSiteListDropdownHelper = true;           // if true, enables Feature 3
    var enableBreadcrumbMiddleClickHelper = true;      // if true, enables Feature 4
    var enableCurrentSiteButtonHelper = true;          // if true, enables Feature 5
    var enableCurrentSiteButtonHelperExtension = true; // if true, enables Feature 6

    // (Settings for Feature 1)
    var currentKenticoVersion = $('#m_c_layoutElem_h_Header_contextHelp_lblVersion').html().match(/\d+(\.\d+)*/g); // gets version of Kentico
    var listOfCompatibleKenticoVersions = [ // defines list of versions of Kentico which are compatible with this tool
        '9.0.48',
        '9.0.49',
        '9.0.50'
    ];

    // (Static variables)
    var hash = window.location.hash; // gets hash of window at load

    //// # Methods

    //// Static Code

    /// Do not run if current version of Kentico isn't in the list of compatible versions
    if (enableKenticoVersionDetection) {
        if (currentKenticoVersion.length === 0 || !~listOfCompatibleKenticoVersions.indexOf(currentKenticoVersion[0])) {
            console.log('Kentico Admin Tools only runs on certain versions of Kentico. Detected version: ' + currentKenticoVersion + '. List of compatible versions: ', listOfCompatibleKenticoVersions);

            return;
        }
        else {
            console.log('Kentico Admin Tools successfully loaded');
        }
    }
    else if (debugV) {
        console.log('KenticoVersionDetection disabled');
    }

    /// Close top-most modal when clicking out of it
    //    Scenarios: opening a widget within a widget, opening the site list dialog, what else?
    if (enableModalClosingHelper) {
        $('body').on('click', '.ui-widget-overlay', function (e) {
            if (debug) console.log('attempting to close modal');

            // grab iframe contents
            var $iframeContents = $(e.target).next().find('iframe.ui-widget-content').contents();
            if (debugV) console.log('$iframeContents', $iframeContents);

            // Essentially what we're doing:
            //   iterate through the iframes/frames until close button is found then click it

            // (Site List dialog)
            // try to find a close button
            var $closeButton = $iframeContents.find('.close-button a i');
            if (debugV) console.log('$closeButton', $closeButton);
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
                if (debugV) console.log('frameHeaderContents', $frameHeaderContents);
                if (debugV) console.log('close-button', $frameHeaderContents.find('.close-button'));
                $frameHeaderContents.find('.close-button a i').click();

                return; // stop processing
            }

            // (Detect other possible versions of dialogs)
            alert('Kentico Admin Tools Exception! Check the console for details.');
            console.log('Kentico Admin Tools Exception! Top most modal may not have been clicked out of. $iframeContents: ', $iframeContents);
        });
    }
    else if (debugV) {
        console.log('ModalClosingHelper disabled');
    }

    /// Enable middle-clicking to work for the breadcrumb in the top header
    if (enableBreadcrumbMiddleClickHelper) {
        $('.main-header').on('mouseup', '#js-nav-breadcrumb > li:nth-child(3)', function (e) {
            if (e.which === 2 && e.target.tagName !== 'A') {
                if (debug) console.log('middle button clicked on the third .main-header li element');
                window.open(window.location, '_blank');
            }
        });
    }
    else if (debugV) {
        console.log('BreadcrumbMiddleClickHelper disabled');
    }

    /// Move `(more sites...)` to the top of all site list dropdowns (the rest of these cases are found under the Dynamic Code region below)
    // (very top of all admin pages)
    if (enableSiteListDropdownHelper) {
        //if (debugV) console.log('loading SiteListDropdownHelper');
        // find the site selector and bind the click event to the dropdown
        $('.main-header').on('click', '.header-site-selector', function (e) {
            if (debugF) console.log('  SiteListDropdownHelper clicked');
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
                if (debugV) console.log('  (more sites...) moved');
            }
        });
    }
    else if (debugV) {
        console.log('SiteListDropdownHelper disabled');
    }

    //// Dynamic Code

    // for Feature 6
    var enforceHrefPathIterator = 0;

    // spam handler for enforceHrefPathHelper()
    function enforceHrefPath () {
        if (debug) console.log('enforceHrefPathIterator', enforceHrefPathIterator);
        enforceHrefPathIterator = 0;
        clearInterval(enforceHrefPath.timeout);
        enforceHrefPath.timeout = setInterval(enforceHrefPathHelper, 50);
    }

    // loops to ensure breadcrumb a href is set to the current page
    function enforceHrefPathHelper () {
        if (enforceHrefPathIterator > 19) {
            if (debug) console.log('boop\n ');
            clearInterval(enforceHrefPath.timeout);
            return;
        }
        if ($('.main-header').find('#js-nav-breadcrumb > li:nth-child(3) > a').length > 0) {
            $('.main-header').find('#js-nav-breadcrumb > li:nth-child(3) > a').attr('href', window.location);
        }
        enforceHrefPathIterator++;
    }

    // recursively apply event listeners to all iframes
    function applyLoadToIframes ($body, lvl, ch) {
        if (debugF) console.log('attempt to aLTI on iframe', lvl, ch);

        if ($body.length === 0) console.log('  unexpected $body size!');
        else $body[0].addEventListener('load', function (e) {
            if (e.target.tagName === 'IFRAME') {
                var tar = e.target;
                var $tar = $(tar);
                if (debugF) console.log(lvl + '(an iframe loaded); id[' + $tar.attr('id') + ']; name[' + $tar.attr('name') + ']');
                if (debugV) console.log('  ', tar);

                $tar.ready(function () {
                    // set breadcrumb a href to current page
                    if (enableBreadcrumbMiddleClickHelper) enforceHrefPath();
                });

                // handle modal iframe logic
                if ($tar.attr('name') === 'SelectionDialog') {
                    var $tarChildren = $tar.contents().find('body').children();
                    if ($tarChildren.length > 0) {
                        if (debugF) console.log('modal iframe loaded');

                        if (enableCurrentSiteButtonHelperExtension && $('#m_pt_headTitle', $tarChildren).text().trim() === 'Select site') {
                            if (debugF) console.log('  in "Select site" modal');

                            // add our button next to search and bind the click event to it
                            $('#m_c_selectionDialog_pnlSearch .filter-form-buttons-cell', $tarChildren)
                                .prepend('<button type="button" name="searchCurrentSite" value="Current Site" id="searchCurrentSite" class="btn btn-primary">Current Site</button>')
                                .on('click', 'button', function (e) {
                                if ($(this).attr('id') === 'searchCurrentSite') {
                                    if (debugF) console.log('"Current Site" button clicked in "Select site" dialog');

                                    // insert name of current site into the 'Name' input
                                    $('#m_c_selectionDialog_txtSearch', $tarChildren).val($('#m_c_layoutElem_h_Header_ss_pnlSelector .dropdown').text());

                                    // click Search
                                    $('#m_c_selectionDialog_btnSearch', $tarChildren).click();
                                }
                            });
                        }
                    }
                }
            }
        }, true);

        var iframeArr = $('iframe', $body).toArray();
        for (var i = 0, len = iframeArr.length, $v; i < len; ++i) {
            $v = $(iframeArr[i]);
            if (debugF) console.log('  ', i, $v);

            applyLoadToIframes($('body', $v.contents()), lvl + 1, '(instant)');

            $v.on('load', function (e) {
                if (debugF) console.log('aLTI loaded frame', lvl, $(this).attr('id'));

                applyLoadToIframes($('body', $v.contents()), lvl + 1, '(delayed)');

                $(this).ready(function () {
                    // set breadcrumb a href to current page
                    if (enableBreadcrumbMiddleClickHelper) enforceHrefPath();
                });

                // handle main iframe logic
                //if (lvl === 1) {
                if ($(this).attr('id') === 'm_c_layoutElem_cmsdesktop') {
                    if (debugF) console.log('main iframe loaded; hash[' + window.location.hash + ']');

                    hash = window.location.hash; // update hash of window at every iframe load
                }

                // only run the following code while in the Settings app (by checking the hash)
                if (hash == '#02cded6b-aa35-4a82-a5f3-e5a5fe82e58b' && lvl === 1) {
                    if (debugF) console.log('Settings app detected');

                    /// Move `(more sites...)` to the top of all site list dropdowns (continued)
                    // (top left of Settings app)
                    if (enableSiteListDropdownHelper) {
                        if (debugV) console.log('loading SiteListDropdownHelper');
                        // drill down to the site selector (through an iframe and frame) in this order:
                        //   1) iframe#m_c_layoutElem_cmsdesktop (already in)
                        //   2) frame[name="categories"]
                        // and bind the click event to the dropdown
                        //var $frame = $(this).contents().find('frame[name="categories"]');
                        var $frame = $('frame[name="categories"]', $(this).contents());
                        //if (debugF) console.log('$frame', $frame.attr('name'));
                        if ($frame.length > 0) {
                            $($frame[0].contentDocument).on('click', '.DropDownField', function (e) {
                                if (debugF) console.log('  SiteListDropdownHelper clicked');
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
                                    if (debugV) console.log('  (more sites...) moved');
                                }
                            });
                        }
                    }
                    else if (debugV) {
                        console.log('SiteListDropdownHelper disabled');
                    }
                }
                // only run the following code while in the Sites app (by checking the hash)
                else if (hash == '#5576826f-328b-4b53-9f4b-e877fabd4d63' && lvl === 1) {
                    if (debugF) console.log('Sites app detected');

                    /// Enable ability to quickly search for the current site in the site list
                    if (enableCurrentSiteButtonHelper) {
                        // drill down to the button group through any iframes:
                        //   1) iframe#m_c_layoutElem_cmsdesktop (already in)
                        // then add our button next to reset/search and bind the click event to it
                        var $contents = $(this).contents();
                        $('#m_c_plc_lt_ctl01_Listing_gridElem_filterForm_pnlForm .form-group-buttons', $contents)
                            .prepend('<button type="button" name="searchCurrentSite" value="Current Site" id="searchCurrentSite" class="btn btn-primary">Current Site</button>')
                            .on('click', 'button', function (e) {
                            if ($(this).attr('id') === 'searchCurrentSite') {
                                if (debugF) console.log('Current Site button clicked');

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
                        console.log('CurrentSiteButtonHelper disabled');
                    }
                }
                // only run the following code while in the Widgets app (by checking the hash)
                else if (hash == '#ef314079-8dbb-4273-bed1-a4af14d0cbf7') {
                    if (lvl === 1) {
                        if (debugF) console.log('Widgets app detected');
                    }
                    // (Widgets app -> Widget Security tab)
                    else if (lvl === 3) {
                        if (enableSiteListDropdownHelper) {
                            if (debugV) console.log('loading SiteListDropdownHelper');
                            // drill down to the site selector (through 3 iframes) in this order:
                            //   1) iframe#m_c_layoutElem_cmsdesktop
                            //   2) iframe#m_c_plc_lt_ctl00_ObjectTreeMenu_layoutElem_paneContentTMain
                            //   3) iframe#m_c_plc_lt_ctl00_HorizontalTabs_l_c (already here)
                            // and bind the click event to the dropdown
                            $(this).contents().on('click', '.DropDownField', function (e) {
                                if (debugF) console.log('  SiteListDropdownHelper clicked');
                                //if (debugV) console.log(e.target, this);

                                // get the site list dropdown element
                                var $dropdownSel = $(this);
                                //if (debugV) console.log('$dropdownSel', $dropdownSel);


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
                                    if (debugV) console.log('  (more sites...) moved');
                                }
                            });
                        }
                        else if (debugV) {
                            console.log('SiteListDropdownHelper disabled');
                        }
                    }
                }
            });
        }
    }

    applyLoadToIframes($('body'), 1, '(instant)');

    //window.Loader = null;
    console.log(window);
    //window.Loader.show();

    var watc = 0;
    var tid = setInterval(wat, 10);

    // loops to ensure breadcrumb a href is set to the current page
    function wat () {
        if (watc > 199) {
            console.log('boop2\n ');
            clearInterval(tid);
            return;
        }
        if (window.Loader !== undefined) {
            window.Loader.hide();
        }
        watc++;
    }
});
