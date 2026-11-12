import WidgetKit
import SwiftUI

// The home-screen widget: this month's count, and in the medium size the
// newest piece. It counts for the handle the app last wrote to the shared
// App Group (ECNativePlugin.setWidgetAccount), asks the site for the numbers
// every half hour, and keeps the last good answer for when the site can't be
// reached.
@main
struct CountWidget: Widget {
    let kind = "CountWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: CountProvider()) { entry in
            CountWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Everything Counts")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct CountEntry: TimelineEntry {
    let date: Date
    let state: CountState
}

struct CountProvider: TimelineProvider {
    func placeholder(in context: Context) -> CountEntry {
        CountEntry(date: Date(), state: .count(.sample))
    }

    func getSnapshot(in context: Context, completion: @escaping (CountEntry) -> Void) {
        let state: CountState = context.isPreview ? .count(.sample) : CountLoader.storedState()
        completion(CountEntry(date: Date(), state: state))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<CountEntry>) -> Void) {
        CountLoader.load { state in
            let now = Date()
            let entry = CountEntry(date: now, state: state)
            completion(Timeline(entries: [entry], policy: .after(now.addingTimeInterval(30 * 60))))
        }
    }
}

struct CountWidgetEntryView: View {
    let entry: CountEntry
    @Environment(\.widgetFamily) private var widgetFamily

    var body: some View {
        FieldAware { onField in
            PosterWidgetView(
                state: entry.state,
                family: widgetFamily == .systemMedium ? .medium : .small,
                onField: onField
            )
        }
        .posterBackground()
        .widgetURL(AppLink.home)
    }
}

// MARK: - Data

enum CountLoader {
    private static let endpoint = "https://everything-counts.vercel.app/api/widget"

    /// Ask the site for the signed-in reader's numbers. Any failure falls back
    /// to the last good answer for the same handle; with none kept, the
    /// widget says "Tap to open."
    static func load(completion: @escaping (CountState) -> Void) {
        guard let handle = WidgetAccount.handle else {
            completion(.signedOut)
            return
        }
        let fallback = { CountCache.payload(for: handle).map(CountState.count) ?? .unavailable }
        let query = "?handle=" + AppLink.escape(handle, keeping: "")
            + "&tz=" + AppLink.escape(TimeZone.current.identifier, keeping: "")
        guard let url = URL(string: endpoint + query) else {
            completion(fallback())
            return
        }

        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 15)
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        URLSession.shared.dataTask(with: request) { data, response, _ in
            let status = (response as? HTTPURLResponse)?.statusCode
            if status == 200, let data = data,
               let payload = try? JSONDecoder().decode(WidgetPayload.self, from: data) {
                CountCache.save(payload, for: handle)
                completion(.count(payload))
            } else if status == 404 {
                // The site has no reader by that handle (renamed, or gone).
                // Drop their old count; opening the app sets the handle again.
                CountCache.clear()
                completion(.unavailable)
            } else {
                completion(fallback())
            }
        }.resume()
    }

    /// What can be shown without the network: for snapshots.
    static func storedState() -> CountState {
        guard let handle = WidgetAccount.handle else { return .signedOut }
        return CountCache.payload(for: handle).map(CountState.count) ?? .count(.sample)
    }
}

// The last good answer, kept in the App Group beside the handle it was for.
enum CountCache {
    private struct Stored: Codable {
        let handle: String
        let payload: WidgetPayload
    }

    static func payload(for handle: String) -> WidgetPayload? {
        guard let data = WidgetAccount.defaults?.data(forKey: WidgetAccount.payloadKey),
              let stored = try? JSONDecoder().decode(Stored.self, from: data),
              stored.handle.caseInsensitiveCompare(handle) == .orderedSame
        else { return nil }
        return stored.payload
    }

    static func save(_ payload: WidgetPayload, for handle: String) {
        guard let data = try? JSONEncoder().encode(Stored(handle: handle, payload: payload)) else { return }
        WidgetAccount.defaults?.set(data, forKey: WidgetAccount.payloadKey)
    }

    static func clear() {
        WidgetAccount.defaults?.removeObject(forKey: WidgetAccount.payloadKey)
    }
}

// MARK: - Widget-only pieces of the poster views

// A tap target in the medium widget (the small one only takes widgetURL).
struct TapLink<Label: View>: View {
    let destination: URL
    @ViewBuilder let label: () -> Label

    var body: some View {
        Link(destination: destination, label: label)
    }
}

struct SealImage: View {
    var body: some View {
        Image("Seal")
            .resizable()
            .interpolation(.high)
            .aspectRatio(contentMode: .fit)
            .unredacted()
            .accessibilityHidden(true)
    }
}

extension View {
    /// The yellow field. iOS 17 draws it as the widget's container background
    /// (and adds the margins); earlier versions get it, and the margins, here.
    @ViewBuilder
    func posterBackground() -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            containerBackground(for: .widget) {
                Poster.field
            }
        } else {
            padding()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Poster.field)
        }
    }
}

// Whether the yellow field is showing. iOS 17 can take a widget's background
// away (StandBy, some tinted modes); the type then turns yellow on black.
private struct FieldAware<Content: View>: View {
    let content: (Bool) -> Content

    var body: some View {
        if #available(iOSApplicationExtension 17.0, *) {
            FieldAware17(content: content)
        } else {
            content(true)
        }
    }
}

@available(iOSApplicationExtension 17.0, *)
private struct FieldAware17<Content: View>: View {
    @Environment(\.showsWidgetContainerBackground) private var showsBackground
    let content: (Bool) -> Content

    var body: some View {
        content(showsBackground)
    }
}
