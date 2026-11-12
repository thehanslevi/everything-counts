import SwiftUI
import AppKit

// Mac stand-ins for the two widget-only pieces PosterViews.swift leans on.
// The widget's own versions live in Widget/CountWidget.swift.

// The seal, read from the widget's asset catalog on disk.
struct SealImage: View {
    nonisolated(unsafe) static var file = URL(fileURLWithPath: "seal@3x.png")

    var body: some View {
        if let image = NSImage(contentsOf: SealImage.file) {
            Image(nsImage: image)
                .resizable()
                .interpolation(.high)
                .aspectRatio(contentMode: .fit)
        }
    }
}

// ImageRenderer can't draw a Link; the preview only needs its label.
struct TapLink<Label: View>: View {
    let destination: URL
    @ViewBuilder let label: () -> Label

    var body: some View {
        label()
    }
}

extension View {
    // What iOS 17 does with containerBackground(for: .widget): the yellow
    // field behind, 16pt content margins, the rounded widget shape.
    func previewWidget(width: CGFloat, height: CGFloat, onField: Bool = true) -> some View {
        self
            .padding(16)
            .frame(width: width, height: height)
            .background(onField ? Poster.field : Color.black)
            .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
    }
}
