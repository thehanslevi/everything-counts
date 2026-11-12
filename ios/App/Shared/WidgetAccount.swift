import Foundation

// The App Group the app and the home-screen widget share. The app writes the
// signed-in reader's handle (ECNativePlugin.setWidgetAccount); the widget reads
// it and keeps its last good count beside it. Compiled into both targets.
enum WidgetAccount {
    static let appGroup = "group.com.everythingcounts.app"
    static let handleKey = "handle"
    static let payloadKey = "widgetPayload"

    static var defaults: UserDefaults? {
        UserDefaults(suiteName: appGroup)
    }

    /// The handle as the widget should ask for it: no whitespace, no leading @.
    static func normalized(_ raw: String?) -> String? {
        guard var value = raw?.trimmingCharacters(in: .whitespacesAndNewlines) else { return nil }
        while value.hasPrefix("@") { value.removeFirst() }
        return value.isEmpty ? nil : value
    }

    /// The signed-in reader's handle, or nil when nobody is signed in.
    static var handle: String? {
        normalized(defaults?.string(forKey: handleKey))
    }
}
