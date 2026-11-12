import SwiftUI

// The widget's faces, drawn like the site: taxi-yellow field, sumi ink, heavy
// type, the vermilion of the seal. Plain SwiftUI so the same file renders in
// the widget and in ios/App/WidgetPreview (PNG previews on a Mac). The widget
// supplies SealImage, TapLink and the yellow field (CountWidget.swift).

enum Poster {
    static let field = Color(.sRGB, red: 242 / 255.0, green: 196 / 255.0, blue: 0 / 255.0, opacity: 1)
    static let ink = Color(.sRGB, red: 23 / 255.0, green: 17 / 255.0, blue: 6 / 255.0, opacity: 1)
    static let vermilion = Color(.sRGB, red: 224 / 255.0, green: 32 / 255.0, blue: 42 / 255.0, opacity: 1)
}

enum PosterFamily {
    case small
    case medium
}

// Type colors for the two grounds the widget can sit on: its own yellow field,
// or black when iOS takes the field away (StandBy, some tinted modes).
struct PosterInk {
    let text: Color
    let chipFill: Color
    let chipText: Color

    static let onField = PosterInk(text: Poster.ink, chipFill: Poster.ink, chipText: Poster.field)
    static let onDark = PosterInk(text: Poster.field, chipFill: Poster.field, chipText: Poster.ink)
}

struct PosterWidgetView: View {
    let state: CountState
    let family: PosterFamily
    var onField: Bool = true

    private var ink: PosterInk { onField ? .onField : .onDark }

    var body: some View {
        switch state {
        case .signedOut:
            NoteFace(line: "Sign in to see your count.", family: family, ink: ink)
        case .unavailable:
            NoteFace(line: "Tap to open.", family: family, ink: ink)
        case .count(let payload):
            if family == .medium {
                MediumCountFace(payload: payload, ink: ink)
            } else {
                CountBlock(month: payload.month, count: payload.count, ink: ink, numeral: 72)
            }
        }
    }
}

// Month, seal, the count, "pieces". The whole small widget; the left half of
// the medium one.
struct CountBlock: View {
    let month: String
    let count: Int
    let ink: PosterInk
    let numeral: CGFloat
    var seal: CGFloat = 30

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top, spacing: 4) {
                Text(month.uppercased())
                    .font(.system(size: 13, weight: .black))
                    .tracking(-0.4)
                    .foregroundColor(ink.text)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                Spacer(minLength: 0)
                SealImage()
                    .frame(width: seal, height: seal)
                    .offset(x: 3, y: -3)
            }
            Spacer(minLength: 0)
            Numeral(count: count, size: numeral, ink: ink)
            Text(count == 1 ? "piece" : "pieces")
                .font(.system(size: 17, weight: .heavy))
                .tracking(-0.4)
                .foregroundColor(ink.text)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .accessibilityElement(children: .combine)
    }
}

// The count, very large, over a vermilion copy set a few points off register,
// the way a two-colour poster print misses.
struct Numeral: View {
    let count: Int
    let size: CGFloat
    let ink: PosterInk

    var body: some View {
        let shift = (size * 0.05).rounded()
        ZStack(alignment: .bottomLeading) {
            digits.foregroundColor(Poster.vermilion).offset(x: shift, y: shift)
            digits.foregroundColor(ink.text)
        }
        .lineLimit(1)
        .minimumScaleFactor(0.35)
        // Digits have no descenders: trim the line box so the numeral sits
        // tight on "pieces" the way poster type is set.
        .padding(.top, -size * 0.14)
        .padding(.bottom, -size * 0.1)
        .padding(.trailing, shift)
    }

    private var digits: Text {
        Text(String(count))
            .font(.system(size: size, weight: .black))
            .tracking(-size * 0.045)
    }
}

// The medium widget: the count on the left, the newest piece on the right.
// With no piece to show, the count takes the whole width.
struct MediumCountFace: View {
    let payload: WidgetPayload
    let ink: PosterInk

    var body: some View {
        if let piece = payload.shownPiece {
            HStack(alignment: .top, spacing: 12) {
                TapLink(destination: AppLink.home) {
                    CountBlock(month: payload.month, count: payload.count, ink: ink, numeral: 62)
                }
                .frame(width: 112)
                Rectangle()
                    .fill(Poster.vermilion)
                    .frame(width: 4)
                pieceArea(piece)
            }
        } else {
            TapLink(destination: AppLink.home) {
                CountBlock(month: payload.month, count: payload.count, ink: ink, numeral: 76, seal: 40)
            }
        }
    }

    @ViewBuilder
    private func pieceArea(_ piece: WidgetPayload.Piece) -> some View {
        if let link = AppLink.work(piece.workId) {
            TapLink(destination: link) { PieceBlock(piece: piece, ink: ink) }
        } else {
            PieceBlock(piece: piece, ink: ink)
        }
    }
}

// "@<by>", the title (up to three lines), "<form> · <source>".
struct PieceBlock: View {
    let piece: WidgetPayload.Piece
    let ink: PosterInk

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if let by = piece.shownBy {
                Text("@" + by.uppercased())
                    .font(.system(size: 11, weight: .black))
                    .tracking(-0.2)
                    .foregroundColor(ink.chipText)
                    .lineLimit(1)
                    .padding(.horizontal, 5)
                    .padding(.vertical, 2)
                    .background(ink.chipFill)
            }
            Text(piece.title.trimmed)
                .font(.system(size: 17, weight: .heavy))
                .tracking(-0.4)
                .foregroundColor(ink.text)
                .lineLimit(3)
                .minimumScaleFactor(0.85)
            Spacer(minLength: 0)
            if let detail = piece.detailLine {
                Text(detail)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(ink.text)
                    .lineLimit(1)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .accessibilityElement(children: .combine)
    }
}

// Signed out, or nothing to show yet: the seal and one line.
struct NoteFace: View {
    let line: String
    let family: PosterFamily
    let ink: PosterInk

    var body: some View {
        if family == .medium {
            HStack(spacing: 16) {
                SealImage().frame(width: 84, height: 84)
                note(size: 20)
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        } else {
            VStack(alignment: .leading, spacing: 0) {
                SealImage().frame(width: 54, height: 54).offset(x: -4)
                Spacer(minLength: 0)
                note(size: 17)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
    }

    private func note(size: CGFloat) -> some View {
        Text(line)
            .font(.system(size: size, weight: .heavy))
            .tracking(-0.4)
            .foregroundColor(ink.text)
            .lineLimit(3)
            .minimumScaleFactor(0.8)
    }
}
