import Foundation

// What https://everything-counts.vercel.app/api/widget returns for a reader:
// this month's count (the month named in the reader's own time zone) and the
// newest shared piece from someone they follow, if there is one.
struct WidgetPayload: Codable, Equatable {
    struct Piece: Codable, Equatable {
        let title: String
        let author: String?
        let source: String?
        let form: String?
        let by: String?
        let workId: String?
    }

    let handle: String
    let month: String
    let count: Int
    let latest: Piece?
}

extension WidgetPayload {
    init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        handle = try values.decode(String.self, forKey: .handle)
        month = try values.decode(String.self, forKey: .month)
        count = try values.decode(Int.self, forKey: .count)
        // A piece the widget can't read is left out; the count still shows.
        latest = try? values.decodeIfPresent(Piece.self, forKey: .latest)
    }

    /// The piece to show, when it has a title to show.
    var shownPiece: Piece? {
        guard let piece = latest, !piece.title.trimmed.isEmpty else { return nil }
        return piece
    }
}

extension WidgetPayload.Piece {
    /// "<form> · <source>", leaving out whichever is missing.
    var detailLine: String? {
        let parts = [form, source].compactMap { $0?.trimmed }.filter { !$0.isEmpty }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }

    /// The handle of the reader who logged it, without a leading @.
    var shownBy: String? {
        guard var value = by?.trimmed else { return nil }
        while value.hasPrefix("@") { value.removeFirst() }
        return value.isEmpty ? nil : value
    }
}

// What the widget is showing.
enum CountState: Equatable {
    case signedOut          // no handle from the app
    case unavailable        // signed in, but no count fetched and none kept
    case count(WidgetPayload)
}

// Sample data for the widget gallery and the loading placeholder.
extension WidgetPayload {
    static var sample: WidgetPayload {
        WidgetPayload(
            handle: "reader",
            month: monthName(of: Date()),
            count: 4,
            latest: Piece(
                title: "Politics and the English Language",
                author: "George Orwell",
                source: "Horizon",
                form: "essay",
                by: "reader",
                workId: nil
            )
        )
    }

    static func monthName(of date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "LLLL"
        return formatter.string(from: date)
    }
}

// Where a tap goes: everythingcounts://open?path=<path>, which the app opens
// as that page of the site (AppDelegate.siteURL(forPath:)).
enum AppLink {
    static let home = URL(string: "everythingcounts://open?path=/")!

    static func work(_ workId: String?) -> URL? {
        guard let id = workId?.trimmed, !id.isEmpty else { return nil }
        return open(path: "/work/" + escape(id, keeping: ""))
    }

    static func open(path: String) -> URL? {
        URL(string: "everythingcounts://open?path=" + escape(path, keeping: "/"))
    }

    /// Percent-encodes everything but ASCII letters, digits, "-._~" and `extra`.
    static func escape(_ value: String, keeping extra: String) -> String {
        var allowed = CharacterSet(charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~")
        allowed.insert(charactersIn: extra)
        return value.addingPercentEncoding(withAllowedCharacters: allowed) ?? ""
    }
}

extension String {
    var trimmed: String { trimmingCharacters(in: .whitespacesAndNewlines) }
}
