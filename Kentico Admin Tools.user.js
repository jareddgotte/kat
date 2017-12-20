// ==UserScript==
// @name         Kentico Admin Tools
// @namespace    jdg
// @version      1.4
// @description  Helps with working in the Kentico /admin interface. List of compatible Kentico versions can be found in the `listOfCompatibleKenticoVersions` variable defined below.
// @author       Jared Gotte
// @match        http*://*.tamu.edu/Admin/*
// @grant        none
// @require      http://code.jquery.com/jquery-3.2.1.min.js
// ==/UserScript==

/*
# Changelog:
  1.0 | Default features (clicking outside of modal closes it, add `more sites` to the top of dropdown lists)
  1.1 | Tidied up structure, added more areas where `more sites` can appear at the top, paved way of being able to drill down into iframes
  1.2 | Added 'middle button click to open up breadcrumbs in new tab' feature, added Kentico version detection so that it only runs when we want it
  1.3 | Added 'quickly search for current site in Sites app' feature
  1.4 | Separated methods between Static and Dynamic regions (since navigating through the admin interface uses the same iframe instead of refreshing the page)
*/

jQuery(function ($, undefined) {
    'use strict';

    //// # Variables

    var debug = false; // if true, print out debug messages to console.log
    var debugV = false; // if true, print out VERBOSE debug messages to console.log
    var hash = window.location.hash; // get hash of window at load
    var CurrentKenticoVersion = $('#m_c_layoutElem_h_Header_contextHelp_lblVersion').html().match(/\d+(\.\d+)*/g); // get version of Kentico
    // define list of versions of Kentico which are compatible with this tool
    var listOfCompatibleKenticoVersions = [
        '9.0.48',
        '9.0.49',
        '9.0.50'
    ];

    //// # Methods

    //// Static Code

    /// Do not run if current version of Kentico isn't in the list of compatible versions
    if (CurrentKenticoVersion.length === 0 || !~listOfCompatibleKenticoVersions.indexOf(CurrentKenticoVersion[0])) {
        console.log('Kentico Admin Tools only runs on certain versions of Kentico. Detected version: ' + CurrentKenticoVersion + '. List of compatible versions: ', listOfCompatibleKenticoVersions);
        return;
    }
    else
    {
        console.log('Kentico Admin Tools successfully loaded');
    }

    /// Close top-most modal when clicking out of it
    //    Scenarios: opening a widget within a widget, opening the site list dialog, what else?
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

    /// Enable middle-clicking to work for the breadcrumb in the top header
    $('.main-header').on('mouseup', '#js-nav-breadcrumb > li', function (e) {
        if (e.which === 2 && $(this).index() === 2) {
            if (debug) console.log('middle button clicked on the third .main-header li element');
            window.open(window.location, '_blank');
        }
    });

    /// Move `(more sites...)` to the top of all site list dropdowns (the rest of these cases are found under the Dynamic Code region below)
    // (very top of all admin pages)
    $('.main-header').on('click', '.header-site-selector', function (e) {
        if (debug) console.log('siteListDropdownClicked; e.target', e.target);

        // get the site list dropdown element
        var $dropdownSel = $(this).find('.dropdown-menu');
        if (debugV) console.log('$dropdownSel', $dropdownSel);

        // now get the `(more sites...)` li element
        var $moreSitesSel = $dropdownSel.find('li[data-raw-value="-2"]');
        if (debugV) console.log('$moreSitesSel', $moreSitesSel, 'index', $moreSitesSel.index());

        // run the following code once
        if ($moreSitesSel.index() > 0) {
            // move the li element to the top
            $moreSitesSel.prependTo($dropdownSel);
        }
    });

    //// Dynamic Code

    // handle iframe load logic
    $('iframe#m_c_layoutElem_cmsdesktop').on('load', function (e) {
        if (debug) console.log('iframe loaded; hash[' + window.location.hash + ']');

        hash = window.location.hash; // update hash of window at every iframe load

        /// Move `(more sites...)` to the top of all site list dropdowns (continued)
        // (top left of Settings app)
        // only run the following code while in the Settings app (by checking the hash)
        if (hash == '#02cded6b-aa35-4a82-a5f3-e5a5fe82e58b') {
            if (debug) console.log('Settings app detected');
            // drill down to the site selector (through an iframe and frame) in this order:
            //   1) iframe#m_c_layoutElem_cmsdesktop (already in)
            //   2) frame[name="categories"]
            // and bind the click event to the dropdown
            var $frame = $(this).contents().find('frame[name="categories"]');
            if (debugV) console.log('$frame', $frame.attr('name'));
            if ($frame.length > 0) {
                var $frameContents = $($frame[0].contentDocument);
                $frameContents.on('click', '.DropDownField', function (e) {
                    if (debug) console.log('$frame click', e.target, this);

                    // get the site list dropdown element
                    var $dropdownSel = $(this);
                    if (debugV) console.log('$dropdownSel', $dropdownSel);

                    // now get the `(more sites...)` option element
                    var $moreSitesSel = $dropdownSel.find('option[value="-2"]');
                    if (debugV) console.log('$moreSitesSel', $moreSitesSel, 'index', $moreSitesSel.index());

                    // run the following code once
                    if ($moreSitesSel.index() > 0) {
                        // move the option element to the top
                        $moreSitesSel.prependTo($dropdownSel);
                    }
                });
            }
        }
        // (Widgets app -> Widget Security tab)
        // only run the following code while in the Widgets app (by checking the hash)
        else if (hash == '#ef314079-8dbb-4273-bed1-a4af14d0cbf7') {
            if (debug) console.log('Widgets app detected');
            // drill down to the site selector (through 3 iframes) in this order:
            //   1) iframe#m_c_layoutElem_cmsdesktop (already in)
            //   2) iframe#m_c_plc_lt_ctl00_ObjectTreeMenu_layoutElem_paneContentTMain
            //   3) iframe#m_c_plc_lt_ctl00_HorizontalTabs_l_c
            // and bind the click event to the dropdown
            var $iframe2 = $(this).contents().find('iframe');
            if (debugV) console.log('$iframe2', $iframe2.attr('id'));
            var $iframe3 = $iframe2.contents().find('iframe');
            if (debugV) console.log('$iframe3', $iframe3.attr('id'));
            $iframe3.on('load', function (e) {
                if (debugV) console.log('$iframe3 load', $(this).attr('id'));
                $(this).contents().on('click', '.DropDownField', function (e) {
                    if (debug) console.log('$iframe3 click', e.target, this);

                    // get the site list dropdown element
                    var $dropdownSel = $(this);
                    if (debugV) console.log('$dropdownSel', $dropdownSel);

                    // now get the `(more sites...)` option element
                    var $moreSitesSel = $dropdownSel.find('option[value="-2"]');
                    if (debugV) console.log('$moreSitesSel', $moreSitesSel, 'index', $moreSitesSel.index());

                    // run the following code once
                    if ($moreSitesSel.index() > 0) {
                        // move the option element to the top
                        $moreSitesSel.prependTo($dropdownSel);
                    }
                });
            });
        }

        /// Enable ability to quickly search for the current site in the site list
        // only run the following code while in the Sites app (by checking the hash)
        if (hash == '#5576826f-328b-4b53-9f4b-e877fabd4d63') {
            if (debug) console.log('Sites app detected');

            // drill down to the button group through any iframes:
            //   1) iframe#m_c_layoutElem_cmsdesktop (already in)
            // then add our button next to reset/search and bind the click event to it
            var $contents = $(this).contents();
            $('#m_c_plc_lt_ctl01_Listing_gridElem_filterForm_pnlForm .form-group-buttons', $contents)
                .prepend('<button type="button" name="searchCurrentSite" value="Current Site" id="searchCurrentSite" class="btn btn-primary">Current Site</button>')
                .on('click', 'button', function (e) {
                if ($(this).attr('id') === 'searchCurrentSite') {
                    if (debug) console.log('Current Site button clicked');

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
    });
});
