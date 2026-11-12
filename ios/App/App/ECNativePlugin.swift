import Foundation
import UIKit
import Capacitor
import WidgetKit

// The app's own native calls, reached from the site as Capacitor plugin
// "ECNative" (registered by ViewController.capacitorDidLoad):
//
//   peekClipboard()          -> { hasLink, changeCount }   no paste prompt
//   readClipboardLink()      -> { url: string | null }     after a tap only
//   setWidgetAccount({ handle: string | null })            who the widget counts for
//   reloadWidgets()                                        after a save
//   event "foreground"                                     the app came back up
@objc(ECNativePlugin)
public class ECNativePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ECNativePlugin"
    public let jsName = "ECNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "peekClipboard", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readClipboardLink", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setWidgetAccount", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reloadWidgets", returnType: CAPPluginReturnPromise)
    ]

    private static let webLinkPattern: PartialKeyPath<UIPasteboard.DetectedValues> =
        \UIPasteboard.DetectedValues.probableWebURL

    private var foregroundObserver: NSObjectProtocol?

    override public func load() {
        foregroundObserver = NotificationCenter.default.addObserver(
            forName: UIApplication.willEnterForegroundNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.notifyListeners("foreground", data: [:])
        }
        #if DEBUG
        NSLog("EC native: registered")
        #endif
    }

    deinit {
        if let observer = foregroundObserver {
            NotificationCenter.default.removeObserver(observer)
        }
    }

    // Is there a link on the clipboard? Asked without reading the clipboard:
    // hasURLs and pattern detection never trigger iOS's paste prompt or the
    // "pasted from" banner. Never touch .string or .url in here.
    @objc func peekClipboard(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let board = UIPasteboard.general
            let changeCount = board.changeCount
            var answered = false
            let answer = { (hasLink: Bool) in
                guard !answered else { return }
                answered = true
                call.resolve(["hasLink": hasLink, "changeCount": changeCount])
            }

            if board.hasURLs {
                answer(true)
            } else if board.hasStrings {
                board.detectPatterns(for: [Self.webLinkPattern]) { result in
                    let found = (try? result.get())?.contains(Self.webLinkPattern) ?? false
                    DispatchQueue.main.async { answer(found) }
                }
                // Detection always calls back; this only keeps a stalled
                // pasteboard from leaving the page waiting.
                DispatchQueue.main.asyncAfter(deadline: .now() + 2) { answer(false) }
            } else {
                answer(false)
            }
        }
    }

    // Read the link itself. Only ever called right after the reader taps a
    // button, so iOS's own paste prompt is expected here.
    @objc func readClipboardLink(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let board = UIPasteboard.general
            if board.hasURLs {
                guard let url = board.url else {
                    // Paste refused (or nothing readable): don't ask a second time.
                    call.resolve(["url": NSNull()])
                    return
                }
                if Self.isWebLink(url) {
                    call.resolve(["url": url.absoluteString])
                    return
                }
            }
            let link = board.hasStrings ? board.string.flatMap(Self.firstWebLink(in:)) : nil
            call.resolve(["url": link ?? NSNull()])
        }
    }

    // Who the widget counts for. A new handle (or signing out) drops the
    // widget's cached count so it never shows the last reader's number.
    @objc func setWidgetAccount(_ call: CAPPluginCall) {
        let handle = WidgetAccount.normalized(call.getString("handle"))
        if let defaults = WidgetAccount.defaults {
            let previous = WidgetAccount.normalized(defaults.string(forKey: WidgetAccount.handleKey))
            if let handle = handle {
                defaults.set(handle, forKey: WidgetAccount.handleKey)
            } else {
                defaults.removeObject(forKey: WidgetAccount.handleKey)
            }
            if previous != handle {
                defaults.removeObject(forKey: WidgetAccount.payloadKey)
            }
        }
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    @objc func reloadWidgets(_ call: CAPPluginCall) {
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    // MARK: - Links

    private static func isWebLink(_ url: URL) -> Bool {
        guard let scheme = url.scheme?.lowercased(), let host = url.host, !host.isEmpty else { return false }
        return scheme == "http" || scheme == "https"
    }

    // The first http(s) address in a stretch of copied text.
    private static func firstWebLink(in text: String) -> String? {
        guard let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue) else {
            return nil
        }
        let range = NSRange(text.startIndex..<text.endIndex, in: text)
        for match in detector.matches(in: text, options: [], range: range) {
            if let url = match.url, isWebLink(url) {
                return url.absoluteString
            }
        }
        return nil
    }
}
