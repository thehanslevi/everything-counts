import UIKit
import Capacitor

// The app's main (and only) view controller: Capacitor's bridge plus native
// pull-to-refresh, the gesture that makes a webview feel like an app, plus the
// app's own ECNative plugin.
class ViewController: CAPBridgeViewController {

    // The app's own plugin (clipboard, widget account, foreground event),
    // registered before the page loads so the site can call it right away.
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(ECNativePlugin())
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        let refresh = UIRefreshControl()
        refresh.tintColor = UIColor(red: 0.88, green: 0.13, blue: 0.16, alpha: 1.0) // vermilion
        refresh.addTarget(self, action: #selector(reloadWebView(_:)), for: .valueChanged)
        webView?.scrollView.refreshControl = refresh
    }

    @objc private func reloadWebView(_ sender: UIRefreshControl) {
        webView?.reload()
        // The reload is fire-and-forget; give the spinner a beat and let go.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            sender.endRefreshing()
        }
    }
}
