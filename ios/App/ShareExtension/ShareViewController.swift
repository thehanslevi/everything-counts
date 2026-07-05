import UIKit
import Social
import UniformTypeIdentifiers

// Everything Counts share extension. Receives a URL (or page text containing
// one) from the share sheet and hands it to the main app via the
// everythingcounts:// scheme, where it lands on the log form pre-filled.
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

        // Prefer a real URL attachment; fall back to plain text that is a URL.
        for provider in attachments {
            if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { [weak self] data, _ in
                    let url = (data as? URL)?.absoluteString ?? (data as? String)
                    self?.openApp(with: url)
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
                    self?.openApp(with: url)
                }
                return
            }
        }
        complete()
    }

    private func openApp(with sharedUrl: String?) {
        DispatchQueue.main.async {
            defer { self.complete() }
            guard
                let sharedUrl = sharedUrl,
                let encoded = sharedUrl.addingPercentEncoding(withAllowedCharacters: .alphanumerics),
                let deepLink = URL(string: "everythingcounts://log?url=\(encoded)")
            else { return }

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
