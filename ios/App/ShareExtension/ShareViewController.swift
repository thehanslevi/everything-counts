import UIKit
import Social
import UniformTypeIdentifiers

// Everything Counts share extension. From Safari it gets what Action.js read
// off the page (address, title, author, publication, picture); from other
// apps, a URL or a line of text holding one. Either way it hands the lot to
// the main app over the everythingcounts:// scheme, where it lands on the
// log form filled in.
class ShareViewController: UIViewController {

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        handleSharedItem()
    }

    private func handleSharedItem() {
        guard
            let item = extensionContext?.inputItems.first as? NSExtensionItem,
            let attachments = item.attachments
        else {
            complete()
            return
        }

        // Safari runs Action.js on the page and sends back what it found,
        // as a property list. Everything the form can use is in there.
        for provider in attachments {
            if provider.hasItemConformingToTypeIdentifier(UTType.propertyList.identifier) {
                provider.loadItem(forTypeIdentifier: UTType.propertyList.identifier, options: nil) { [weak self] data, _ in
                    let results = (data as? [String: Any])?[NSExtensionJavaScriptPreprocessingResultsKey] as? [String: Any]
                    let details = results ?? [:]
                    self?.openApp(with: details["url"] as? String, details: details)
                }
                return
            }
        }

        // Elsewhere: a real URL attachment; failing that, text that holds one.
        for provider in attachments {
            if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { [weak self] data, _ in
                    let url = (data as? URL)?.absoluteString ?? (data as? String)
                    self?.openApp(with: url, details: [:])
                }
                return
            }
        }
        for provider in attachments {
            if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { [weak self] data, _ in
                    let text = data as? String
                    let url = text.flatMap { t in
                        t.split(separator: " ").first(where: { $0.hasPrefix("http") }).map(String.init)
                    }
                    self?.openApp(with: url, details: [:])
                }
                return
            }
        }
        complete()
    }

    // The details ride in the deep link's query, each value percent-encoded
    // down to letters and digits so nothing in a title can break the link.
    private func openApp(with sharedUrl: String?, details: [String: Any]) {
        DispatchQueue.main.async {
            defer { self.complete() }
            guard let sharedUrl = sharedUrl, !sharedUrl.isEmpty else { return }

            var query: [String] = []
            var values: [(String, String)] = [("url", sharedUrl)]
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
            guard let deepLink = URL(string: "everythingcounts://log?" + query.joined(separator: "&")) else { return }

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
