import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Widget hand-off: the widget opens everythingcounts://open?path=<path>
        // (path=/ for the count, path=/work/<id> for a piece). Only those two
        // paths are followed; anything else falls through.
        if url.scheme == "everythingcounts", url.host?.lowercased() == "open" {
            let path = URLComponents(url: url, resolvingAgainstBaseURL: false)?
                .queryItems?.first(where: { $0.name == "path" })?.value
            if let path = path,
               let target = AppDelegate.siteURL(forPath: path),
               let bridgeVC = self.window?.rootViewController as? CAPBridgeViewController {
                #if DEBUG
                NSLog("EC open route: %@", target.absoluteString)
                #endif
                DispatchQueue.main.async {
                    _ = bridgeVC.webView?.load(URLRequest(url: target))
                }
                return true
            }
        }

        // Share-sheet hand-off: the share extension opens
        // everythingcounts://log?url=<shared url>&title=…&author=…&source=…&image=…
        // (the details are there when the page was shared from Safari). Route
        // it into the webview as /log?… so the form opens filled in.
        if url.scheme == "everythingcounts" {
            let items = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? []
            let value = { (name: String) -> String? in
                items.first(where: { $0.name == name })?.value
            }
            if let shared = value("url"), !shared.isEmpty {
                var query: [String] = []
                for name in ["url", "title", "author", "source", "image"] {
                    if let v = value(name), !v.isEmpty,
                       let encoded = v.addingPercentEncoding(withAllowedCharacters: .alphanumerics) {
                        query.append("\(name)=\(encoded)")
                    }
                }
                if let target = URL(string: "https://everything-counts.vercel.app/log?" + query.joined(separator: "&")),
                   let bridgeVC = self.window?.rootViewController as? CAPBridgeViewController {
                    #if DEBUG
                    NSLog("EC share route: %@", target.absoluteString)
                    #endif
                    DispatchQueue.main.async {
                        _ = bridgeVC.webView?.load(URLRequest(url: target))
                    }
                    return true
                }
            }
        }
        // Keep the Capacitor App API informed for any other URL opens.
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    private static let siteHost = "everything-counts.vercel.app"

    /// The site page a widget link asks for, or nil unless `path` is one the
    /// widget makes: "/" or "/work/<id>", with no query or fragment. Any app
    /// or web page can open this route, so it stops short of other pages of
    /// our own site too: the sign-in page's `next`, for one, could send the
    /// webview on to another host. The plain-path checks stay underneath:
    /// starts with "/" but not "//", no backslash, whitespace or control
    /// character, parses as a URL path, and the address it makes still
    /// points at everything-counts.vercel.app.
    static func siteURL(forPath path: String) -> URL? {
        guard isWidgetPath(path),
              path.hasPrefix("/"), !path.hasPrefix("//"),
              !path.contains("\\"),
              path.rangeOfCharacter(from: .whitespacesAndNewlines) == nil,
              path.rangeOfCharacter(from: .controlCharacters) == nil,
              let parts = URLComponents(string: path),
              parts.scheme == nil, parts.host == nil, parts.path.hasPrefix("/"),
              parts.query == nil, parts.fragment == nil,
              let target = URL(string: "https://" + siteHost + path),
              target.scheme == "https", target.host == siteHost
        else { return nil }
        return target
    }

    /// "/" or "/work/<id>", taken literally: the id is letters, digits, "-"
    /// and "_" (work ids are base-36, the no-link ones with "t-" in front),
    /// so a "%", "?", "#", "." or "/" never gets through.
    private static func isWidgetPath(_ path: String) -> Bool {
        if path == "/" { return true }
        let prefix = "/work/"
        guard path.hasPrefix(prefix) else { return false }
        let id = path.unicodeScalars.dropFirst(prefix.unicodeScalars.count)
        return !id.isEmpty && id.allSatisfy { workIdCharacters.contains($0) }
    }

    private static let workIdCharacters = CharacterSet(
        charactersIn: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_"
    )

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        // Hand the APNs device token to Capacitor's PushNotifications plugin,
        // which surfaces it to the web layer via the "registration" event.
        NotificationCenter.default.post(
            name: .capacitorDidRegisterForRemoteNotifications,
            object: deviceToken
        )
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(
            name: .capacitorDidFailToRegisterForRemoteNotifications,
            object: error
        )
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
