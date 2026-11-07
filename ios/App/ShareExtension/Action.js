// Runs on the page in Safari when it is shared to Everything Counts, and
// hands the extension what the page says about itself: its address, title,
// author, publication and picture. The same tags the "Log this" bookmark
// reads on a desktop, so a paywalled page the reader has open comes
// through filled in. Written for the extension's JavaScript runtime, which
// expects an object named ExtensionPreprocessingJS with run and finalize.
var ExtensionPreprocessingJS = {
  run: function (args) {
    function meta(selector) {
      var node = document.querySelector(selector);
      return (node && node.getAttribute("content")) || "";
    }
    var author =
      meta('meta[name="author"]') ||
      meta('meta[name="byl"]') ||
      meta('meta[name="parsely-author"]') ||
      meta('meta[name="sailthru.author"]') ||
      meta('meta[name="citation_author"]') ||
      meta('meta[property="article:author"]');
    args.completionFunction({
      url: location.href,
      title: (meta('meta[property="og:title"]') || document.title || "").slice(0, 300),
      author: author.slice(0, 200),
      source: meta('meta[property="og:site_name"]').slice(0, 120),
      image: meta('meta[property="og:image"]') || meta('meta[name="twitter:image"]') || "",
    });
  },
  finalize: function () {},
};
