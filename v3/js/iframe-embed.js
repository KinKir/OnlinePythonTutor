/*

Online Python Tutor
https://github.com/pgbovine/OnlinePythonTutor/

Copyright (C) 2010-2013 Philip J. Guo (philip@pgbovine.net)

Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/


// Pre-reqs:
// - pytutor.js
// - jquery.ba-bbq.min.js
// - opt-frontend-common.js
// should all be imported BEFORE this file


var myVisualizer = null; // singleton ExecutionVisualizer instance


$(document).ready(function() {
  var queryStrOptions = getQueryStringOptions();

  var preseededCode = queryStrOptions.preseededCode;
  var pyState = queryStrOptions.pyState;
  var verticalStackBool = (queryStrOptions.verticalStack == 'true');
  var heapPrimitivesBool = (queryStrOptions.heapPrimitives == 'true');
  var drawParentPointerBool = (queryStrOptions.drawParentPointers == 'true');
  var textRefsBool = (queryStrOptions.textRefs == 'true');
  var showOnlyOutputsBool = (queryStrOptions.showOnlyOutputs == 'true');
  var cumModeBool = (queryStrOptions.cumulativeState == 'true');

  // set up all options in a JS object
  var options = {cumulative_mode: cumModeBool,
                 heap_primitives: heapPrimitivesBool,
                 show_only_outputs: showOnlyOutputsBool,
                 py_crazy_mode: (pyState == '2crazy')};


  var preseededCurInstr = queryStrOptions.preseededCurInstr;
  if (!preseededCurInstr) {
    preseededCurInstr = 0;
  }

  var backend_script = null;
  if (pyState == '2') {
      backend_script = python2_backend_script;
  }
  else if (pyState == '3') {
      backend_script = python3_backend_script;
  }

  if (!backend_script) {
    alert('Error: This server is not configured to run Python ' + $('#pythonVersionSelector').val());
    return;
  }


  // David Pritchard's code for resizeContainer option ...
  var resizeContainer = ($.bbq.getState('resizeContainer') == 'true');
    
  if (resizeContainer) {
      function findContainer() {
          var ifs = window.top.document.getElementsByTagName("iframe");
          for(var i = 0, len = ifs.length; i < len; i++)  {
              var f = ifs[i];
              var fDoc = f.contentDocument || f.contentWindow.document;
              if(fDoc === document)   {
                  return f;
              }
          }
      }
      
      var container = findContainer();
      
      function resizeContainerNow() {
          $(container).height($("#vizDiv").height()+20);
      };
  }


  function executeCode(forceStartingInstr) {
    $.get(backend_script,
          {user_script : preseededCode,
           raw_input_json: rawInputLst.length > 0 ? JSON.stringify(rawInputLst) : '',
           options_json: JSON.stringify(options)},
          function(dataFromBackend) {
            var trace = dataFromBackend.trace;

            // don't enter visualize mode if there are killer errors:
            if (!trace ||
                (trace.length == 0) ||
                (trace[trace.length - 1].event == 'uncaught_exception')) {

              if (trace.length == 1) {
                alert(trace[0].exception_msg);
              }
              else if (trace[trace.length - 1].exception_msg) {
                alert(trace[trace.length - 1].exception_msg);
              }
              else {
                alert("Whoa, unknown error! Reload to try again, or report a bug to philip@pgbovine.net");
              }
            }
            else {
              var startingInstruction = 0;

              // only do this at most ONCE, and then clear out preseededCurInstr
              if (preseededCurInstr && preseededCurInstr < trace.length) { // NOP anyways if preseededCurInstr is 0
                startingInstruction = preseededCurInstr;
              }

              // forceStartingInstr overrides everything else
              if (forceStartingInstr !== undefined) {
                startingInstruction = forceStartingInstr;
              }

              myVisualizer = new ExecutionVisualizer('vizDiv',
                                                     dataFromBackend,
                                                     {startingInstruction: preseededCurInstr,
                                                      embeddedMode: true,
                                                      verticalStack: verticalStackBool,
                                                      disableHeapNesting: heapPrimitivesBool,
                                                      drawParentPointers: drawParentPointerBool,
                                                      textualMemoryLabels: textRefsBool,
                                                      showOnlyOutputs: showOnlyOutputsBool,
                                                      highlightLines: typeof $.bbq.getState("highlightLines") !== "undefined",
                                                      executeCodeWithRawInputFunc: executeCodeWithRawInput,
                                                      pyCrazyMode: (pyState == '2crazy'),
                                                      updateOutputCallback: (resizeContainer ? resizeContainerNow : null)
                                                     });

              // set keyboard bindings
              // VERY IMPORTANT to clear and reset this every time or
              // else the handlers might be bound multiple times
              $(document).unbind('keydown');
              $(document).keydown(function(k) {
                if (k.keyCode == 37) { // left arrow
                  if (myVisualizer.stepBack()) {
                    k.preventDefault(); // don't horizontally scroll the display
                  }
                }
                else if (k.keyCode == 39) { // right arrow
                  if (myVisualizer.stepForward()) {
                    k.preventDefault(); // don't horizontally scroll the display
                  }
                }
              });
            }
          },
          "json");
  }


  function executeCodeFromScratch() {
    // reset these globals
    rawInputLst = [];

    executeCode();
  }

  function executeCodeWithRawInput(rawInputStr, curInstr) {
    enterDisplayNoFrillsMode();

    // set some globals
    rawInputLst.push(rawInputStr);

    executeCode(curInstr);
  }


  // log a generic AJAX error handler
  $(document).ajaxError(function() {
    alert("Ugh, Online Python Tutor server error :(");
  });


  // redraw connector arrows on window resize
  $(window).resize(function() {
    myVisualizer.redrawConnectors();
  });

});

