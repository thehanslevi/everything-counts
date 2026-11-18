import UIKit
import Social
import UniformTypeIdentifiers

// Everything Counts share extension. From Safari it gets what Action.js read
// off the page (address, title, author, publication, picture). From any
// other app it takes whatever was shared that can name a piece: a link, text
// with a link in it, or a short line of text to use as the title. Either way
// it hands the lot to the main app over the everythingcounts:// scheme,
// where it lands on the log form filled in.
//
// Info.plist decides where the option shows: any share that carries a link
// or text, whatever else rides along (a picture, a subject line), and never
// a file.
class ShareViewController: UIViewController {

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        handleSharedItem()
    }

    private func handleSharedItem() {
        let items = (extensionContext?.inputItems as? [NSExtensionItem]) ?? []
        let providers = items.flatMap { $0.attachments ?? [] }

        let pages = providers.filter { $0.hasItemConformingToTypeIdentifier(UTType.propertyList.identifier) }
        let links = providers.filter {
            $0.hasItemConformingToTypeIdentifier(UTType.url.identifier)
                && !$0.hasItemConformingToTypeIdentifier(UTType.fileURL.identifier)
        }
        let texts = providers.filter { $0.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) }
        // What some apps put beside the attachments: the message they would post.
        let spoken = items.compactMap { $0.attributedContentText?.string }

        // Safari runs Action.js on the page and sends back what it found,
        // as a property list. Everything the form can use is in there.
        loadPage(pages) { [weak self] details in
            if let details = details {
                self?.openApp(with: details["url"] as? String, details: details)
                return
            }
            // Elsewhere: a link attachment; failing that, text.
            self?.loadLink(links, at: 0) { link in
                if let link = link {
                    self?.openApp(with: link, details: [:])
                    return
                }
                self?.loadTexts(texts, at: 0, found: spoken) { found in
                    // A link anywhere in the text wins.
                    if let link = found.lazy.compactMap(ShareViewController.webLink(in:)).first {
                        self?.openApp(with: link, details: [:])
                        return
                    }
                    // No link: a short single line is taken as the title.
                    // Anything longer opens the form empty.
                    let title = found.lazy.compactMap(ShareViewController.titleLine(from:)).first
                    self?.openApp(with: nil, details: title.map { ["title": $0] } ?? [:])
                }
            }
        }
    }

    // What Action.js sent back, when it names the page's address.
    private func loadPage(_ providers: [NSItemProvider], done: @escaping ([String: Any]?) -> Void) {
        guard let provider = providers.first else { return done(nil) }
        provider.loadItem(forTypeIdentifier: UTType.propertyList.identifier, options: nil) { data, _ in
            let results = (data as? [String: Any])?[NSExtensionJavaScriptPreprocessingResultsKey] as? [String: Any]
            if let url = results?["url"] as? String, ShareViewController.isWeb(url) {
                done(results)
            } else {
                done(nil)
            }
        }
    }

    // The first attachment that is a web address.
    private func loadLink(_ providers: [NSItemProvider], at index: Int, done: @escaping (String?) -> Void) {
        guard index < providers.count else { return done(nil) }
        providers[index].loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { [weak self] data, _ in
            let url = (data as? URL)?.absoluteString ?? (data as? String)
            if let url = url, ShareViewController.isWeb(url) {
                done(url)
            } else {
                self?.loadLink(providers, at: index + 1, done: done)
            }
        }
    }

    // Every piece of shared text, in order.
    private func loadTexts(_ providers: [NSItemProvider], at index: Int, found: [String], done: @escaping ([String]) -> Void) {
        guard index < providers.count else { return done(found) }
        providers[index].loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { [weak self] data, _ in
            var text: String?
            if let string = data as? String {
                text = string
            } else if let attributed = data as? NSAttributedString {
                text = attributed.string
            } else if let bytes = data as? Data {
                text = String(data: bytes, encoding: .utf8)
            }
            self?.loadTexts(providers, at: index + 1, found: found + (text.map { [$0] } ?? []), done: done)
        }
    }

    private static func isWeb(_ address: String) -> Bool {
        guard let scheme = URL(string: address)?.scheme?.lowercased() else { return false }
        return scheme == "http" || scheme == "https"
    }

    // The first web address written in the text, wherever it sits: after a
    // title, on its own line, in the middle of a sentence.
    static func webLink(in text: String) -> String? {
        guard let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue) else {
            return nil
        }
        let range = NSRange(text.startIndex..., in: text)
        for match in detector.matches(in: text, options: [], range: range) {
            if let url = match.url?.absoluteString, isWeb(url) { return url }
        }
        return nil
    }

    // Text short enough to be a title: one line, 300 characters at most.
    static func titleLine(from text: String) -> String? {
        let line = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !line.isEmpty, line.count <= 300,
              line.rangeOfCharacter(from: .newlines) == nil
        else { return nil }
        return line
    }

    // The details ride in the deep link's query, each value percent-encoded
    // down to letters and digits so nothing in a title can break the link.
    // With nothing to pass, the link is everythingcounts://log and the form
    // opens empty.
    private func openApp(with sharedUrl: String?, details: [String: Any]) {
        DispatchQueue.main.async {
            defer { self.complete() }

            var query: [String] = []
            var values: [(String, String)] = []
            if let sharedUrl = sharedUrl, !sharedUrl.isEmpty {
                values.append(("url", sharedUrl))
            }
            for key in ["title", "author", "source", "image"] {
                if let value = details[key] as? String, !value.isEmpty {
                    values.append((key, value))
                }
            }
            for (key, value) in values {
                if let encoded = value.addingPercentEncoding(withAllowedCharacters: .alphanumerics) {
                    query.append("\(key)=\(encoded)")
                }
            }
            let address = "everythingcounts://log" + (query.isEmpty ? "" : "?" + query.joined(separator: "&"))
            guard let deepLink = URL(string: address) else { return }

            // Extensions cannot call UIApplication.shared.open; walk the
            // responder chain to reach the hosting app's opener.
            var responder: UIResponder? = self
            while let current = responder {
                if let application = current as? UIApplication {
                    application.open(deepLink, options: [:], completionHandler: nil)
                    break
                }
                responder = current.next
            }
        }
    }

    private func complete() {
        extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
    }
}
