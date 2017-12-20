// ==UserScript==
// @name         Kentico Admin Tools Helper
// @namespace    http://jaredgotte.com
// @version      1.1
// @description  Helps with the Kentico Admin Tools by triggering faux load events for iframe pages
// @author       Jared Gotte
// @match        http://*.tamu.edu/CMSModules/AdminControls/Pages/UIPage.aspx*
// @match        https://*.tamu.edu/CMSModules/AdminControls/Pages/UIPage.aspx*
// @grant        none
// ==/UserScript==

/*
# Changelog:
  1.0 | Default features (checks frame depth, sends console.log info, dispatches fauxLoad event to frame element)
  1.1 | Bug fixes/refactoring
*/

(function() {
    'use strict';


    /** DEFINE VARIABLES **/

    // override local console.log method if we're in iframe
    console.log = top.console.iframeLog || console.log;
    // stores iframe depth
    var iframeDepth;
    // for checkLive()
    var checkLiveIterator = 0;
    // checkLive() interval reference
    var checkLiveID;


    /** DEFINE FUNCTIONS **/

    // gets the iframe depth
    function getFrameDepth (win) {
        if (win === window.top) {
            return 0;
        }
        else if (win.parent === window.top) {
            return 1;
        }

        return 1 + getFrameDepth(win.parent);
    }

    // used to determine if/when the current iframe gets replaced via JS (unseen by userscripts)
    //   Note: "faux load events not triggering on iframe changes due to JS actions being unseen by userscripts" is speculation.
    //     Steps to reproduce: Widgets -> edit Widget -> See what happens when you click through the different tabs (especially back and forth between Security and General)
    function checkLive () {
        if (checkLiveIterator > 9) {
            console.log('checkLive halted\n ');
            clearInterval(checkLiveID);
            return;
        }

        console.log(window.location.href, checkLiveIterator);

        checkLiveIterator++;
    }


    /** PREPARE DATA **/

    // get current iframe depth
    iframeDepth = getFrameDepth(window.self);


    /** INITIALIZE APP **/

    // do following only if we're in an iframe
    if (iframeDepth > 0) {
        // check to see if/when the current iframe gets replaced (read notes above checkLive())
        //checkLiveID = setInterval(checkLive, 1000); // commented out to disable; i.e., uncomment to enable

        // get id's
        var ifid = window.frameElement && window.frameElement.id || 'undef';
        var pifid = window.parent && window.parent.frameElement && window.parent.frameElement.id || 'undef';

        // log ready
        console.log('(ui page ready)', iframeDepth, ifid, pifid);

        // send event
        if (window.frameElement !== null) {
            console.log('  triggering fauxLoad', iframeDepth, ifid, pifid);
            window.frameElement.dispatchEvent(new Event('fauxLoad'));
        }
    }
})();
