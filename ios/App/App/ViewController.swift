import UIKit
import Capacitor

// The app's main (and only) view controller: Capacitor's bridge plus native
// pull-to-refresh, the gesture that makes a webview feel like an app.
class ViewController: CAPBridgeViewController {

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
