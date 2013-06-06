test(
  'extract.Find.find',

  [
    'ephox.phoenix.extract.Find',
    'ephox.phoenix.test.Page',
    'ephox.sugar.api.Compare'
  ],

  function (Find, Page, Compare) {

    var check = function (eNode, eOffset, pNode, pOffset) {
      var actual = Find.find(pNode, pOffset).getOrDie();
      assert.eq(true, Compare.eq(eNode, actual.element()));
      assert.eq(eOffset, actual.offset());
    };

    var checkNone = function (pNode, pOffset) {
      assert.eq(true, Find.find(pNode, pOffset).isNone());
    };

    var page = Page();


    check(page.t1, 1, page.p1, 1);
    check(page.t1, 5, page.p1, 5);
    check(page.t4, 1, page.p2, 12);
    check(page.t5, 1, page.p2, 16);

    checkNone(page.p1, 16);
  }
);