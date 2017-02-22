asynctest(
  'SelectionInFramePositionTest',
 
  [
    'ephox.agar.api.Chain',
    'ephox.agar.api.Cursors',
    'ephox.agar.api.Guard',
    'ephox.agar.api.NamedChain',
    'ephox.alloy.alien.DomSelection',
    'ephox.alloy.api.component.GuiFactory',
    'ephox.alloy.api.ui.Container',
    'ephox.alloy.test.ChainUtils',
    'ephox.alloy.test.GuiSetup',
    'ephox.alloy.test.PositionTestUtils',
    'ephox.alloy.test.Sinks',
    'ephox.katamari.api.Option',
    'ephox.katamari.api.Result',
    'ephox.alloy.frame.Writer',
    'ephox.sugar.api.properties.Css',
    'ephox.sugar.api.events.DomEvent',
    'ephox.sugar.api.node.Element',
    'ephox.sugar.api.node.Node',
    'ephox.sugar.api.view.Scroll',
    'ephox.sugar.api.search.SelectorFind',
    'ephox.sugar.api.search.Traverse',
    'global!Error',
    'global!setTimeout',
    'global!window'
  ],
 
  function (
    Chain, Cursors, Guard, NamedChain, DomSelection, GuiFactory, Container, ChainUtils, GuiSetup, PositionTestUtils, Sinks, Option, Result, Writer, Css, DomEvent,
    Element, Node, Scroll, SelectorFind, Traverse, Error, setTimeout, window
  ) {
    var success = arguments[arguments.length - 2];
    var failure = arguments[arguments.length - 1];

    GuiSetup.setup(function (store, doc, body) {
      var content = '';
      for (var i = 0; i < 20; i++) {
        content += '<p>paragraph ' + i  + '</p>';
      }

      var frame = Element.fromTag('iframe');
      var onload = DomEvent.bind(frame, 'load', function () {
        onload.unbind();
        Writer.write(frame, '<html><body contenteditable="true">' + content + '</body></html>');
      });

      var classicEditor = GuiFactory.build(
        GuiFactory.external({
          uid: 'classic-editor',
          element: frame
        })
      );

      Css.set(classicEditor.element(), 'margin-top', '300px');

      return GuiFactory.build(
        Container.sketch({
          components: [
            GuiFactory.premade(Sinks.fixedSink()),
            GuiFactory.premade(Sinks.relativeSink()),
            GuiFactory.premade(Sinks.popup()),
            GuiFactory.premade(classicEditor)
          ]
        })
      );

    }, function (doc, body, gui, component, store) {
      var cSetupAnchor = Chain.mapper(function (data) {
        return {
          anchor: 'selection',
          root: Element.fromDom(data.classic.element().dom().contentWindow.document.body)
        };
      });

      var cGetWin = Chain.mapper(function (frame) {
        return frame.element().dom().contentWindow;
      });

      var cSetPath = function (rawPath) {
        var path = Cursors.path(rawPath);

        return Chain.binder(function (win) {
          var body = Element.fromDom(win.document.body);
          var range = Cursors.calculate(body, path);
           DomSelection.setExact(
            win,
            range.start(),
            range.soffset(),
            range.finish(),
            range.foffset()
          );
          return DomSelection.get(win).fold(function () {
            return Result.error('Could not retrieve the set selection');
          }, Result.value);
        });
      };

      return [
        Chain.asStep({}, [
          NamedChain.asChain([
            ChainUtils.cFindUids(gui, {
              'fixed': 'fixed-sink',
              'relative': 'relative-sink',
              'popup': 'popup',
              'classic': 'classic-editor'
            }),
            NamedChain.direct('classic', cGetWin, 'iWin'),

            // Wait until the content has loaded
            ChainUtils.cLogging(
              'Waiting for iframe to load content.',
              [
                Chain.control(
                  Chain.binder(function (data) {
                    var root = Element.fromDom(data.classic.element().dom().contentWindow.document.body);
                    return SelectorFind.descendant(root, 'p').fold(function () {
                      return Result.error('Could not find paragraph yet');
                    }, function (p) {
                      return Result.value(data);
                    });
                  }),
                  Guard.tryUntil('Waiting for content to load in iframe', 100, 10000)
                )
              ]
            ),
            
            ChainUtils.cLogging(
              'Selecting 3rd paragraph',
              [
                NamedChain.direct('iWin', cSetPath({
                  startPath: [ 2, 0 ],
                  soffset: 0,
                  finishPath: [ 3, 0 ],
                  foffset: 0
                }), 'range'),
                NamedChain.write('anchor', cSetupAnchor)
              ]
            ),

            PositionTestUtils.cTestSink(
              'Relative, Selected: 3rd paragraph, no page scroll, no editor scroll',
              'relative'
            ),
            PositionTestUtils.cTestSink(
              'Fixed, Selected: 3rd paragraph, no page scroll, no editor scroll',
              'fixed'
            ),

            PositionTestUtils.cScrollDown('classic', '2000px'),
            PositionTestUtils.cTestSink(
              'Relative, Selected: 3rd paragraph, 2000px scroll, no editor scroll',
              'relative'
            ),
            PositionTestUtils.cTestSink(
              'Fixed, Selected: 3rd paragraph, 2000px scroll, no editor scroll',
              'fixed'
            ),


            ChainUtils.cLogging(
              'Selecting 13th paragraph and scrolling to it',
              [
                NamedChain.direct('iWin', cSetPath({
                  startPath: [ 12 ],
                  soffset: 0,
                  finishPath: [ 13 ],
                  foffset: 0
                }), 'range2'),
                NamedChain.direct('range2', Chain.binder(function (range2) {
                  var start = range2.start();
                  // NOTE: Safari likes to select the text node.
                  var optElement = Node.isText(start) ? Traverse.parent(start) : Option.some(start);
                  return optElement.map(function (elem) {
                    elem.dom().scrollIntoView();
                    return Scroll.get(
                      Traverse.owner(elem)
                    );
                  });
                }), 'scroll2'),
                NamedChain.write('anchor', cSetupAnchor)
              ]
            ),


            PositionTestUtils.cTestSink(
              'Relative, Selected: 13rd paragraph, 2000px scroll, no editor scroll',
              'relative'
            ),
            PositionTestUtils.cTestSink(
              'Fixed, Selected: 13rd paragraph, 2000px scroll, no editor scroll',
              'fixed'
            )
          ])
        ])
      ];
    }, function () { success(); }, failure);
 

  }
);