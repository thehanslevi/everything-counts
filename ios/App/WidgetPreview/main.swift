import SwiftUI
import AppKit

// Renders the widget's faces to PNGs on a Mac, no device or simulator:
//
//   ios/App/WidgetPreview/render.sh
//
// Compiles Widget/WidgetPayload.swift + Widget/PosterViews.swift (the files
// the widget ships) with Shim.swift, then writes ios/App/widget-previews/*.png
// (git-ignored) at 3x, on iPhone 15/16-size widgets (158pt small, 338x158pt
// medium). The data below is preview data only.

let arguments = CommandLine.arguments
guard arguments.count == 3 else {
    print("usage: render <output dir> <seal png>")
    exit(2)
}
let outputDirectory = URL(fileURLWithPath: arguments[1], isDirectory: true)
SealImage.file = URL(fileURLWithPath: arguments[2])

let smallSize = CGSize(width: 158, height: 158)
let mediumSize = CGSize(width: 338, height: 158)

let piece = WidgetPayload.Piece(
    title: "Politics and the English Language",
    author: "George Orwell",
    source: "Horizon",
    form: "essay",
    by: "stephanie",
    workId: "abc123"
)
let november = WidgetPayload(handle: "hrlevinson", month: "November", count: 4, latest: piece)
let longTitle = WidgetPayload(
    handle: "hrlevinson",
    month: "September",
    count: 128,
    latest: WidgetPayload.Piece(
        title: "A Supposedly Fun Thing I'll Never Do Again: Essays and Arguments",
        author: "David Foster Wallace",
        source: "Harper's Magazine",
        form: "essay",
        by: "averyveryveryverylonghandle",
        workId: "xyz"
    )
)
let onePiece = WidgetPayload(handle: "hrlevinson", month: "May", count: 1, latest: nil)
let noLatest = WidgetPayload(handle: "hrlevinson", month: "November", count: 12, latest: nil)

struct Shot {
    let name: String
    let state: CountState
    let family: PosterFamily
    var onField: Bool = true
}

let shots = [
    Shot(name: "small", state: .count(november), family: .small),
    Shot(name: "medium", state: .count(november), family: .medium),
    Shot(name: "signedout", state: .signedOut, family: .small),
    Shot(name: "signedout-medium", state: .signedOut, family: .medium),
    Shot(name: "tap-to-open", state: .unavailable, family: .small),
    Shot(name: "tap-to-open-medium", state: .unavailable, family: .medium),
    Shot(name: "medium-no-piece", state: .count(noLatest), family: .medium),
    Shot(name: "medium-long", state: .count(longTitle), family: .medium),
    Shot(name: "small-long", state: .count(longTitle), family: .small),
    Shot(name: "small-one", state: .count(onePiece), family: .small),
    Shot(name: "small-standby", state: .count(november), family: .small, onField: false),
    Shot(name: "medium-standby", state: .count(november), family: .medium, onField: false),
    Shot(name: "gallery-sample", state: .count(.sample), family: .medium),
]

@MainActor
func render(_ shot: Shot) throws {
    let size = shot.family == .medium ? mediumSize : smallSize
    let face = PosterWidgetView(state: shot.state, family: shot.family, onField: shot.onField)
        .previewWidget(width: size.width, height: size.height, onField: shot.onField)
        .padding(20)
        .background(Color(white: 0.16))
    let renderer = ImageRenderer(content: face)
    renderer.scale = 3
    guard let image = renderer.cgImage else {
        throw NSError(domain: "render", code: 1, userInfo: [NSLocalizedDescriptionKey: "no image for \(shot.name)"])
    }
    let png = NSBitmapImageRep(cgImage: image).representation(using: .png, properties: [:])
    try png?.write(to: outputDirectory.appendingPathComponent(shot.name + ".png"))
    print("wrote \(shot.name).png  \(image.width)x\(image.height)")
}

try FileManager.default.createDirectory(at: outputDirectory, withIntermediateDirectories: true)
try MainActor.assumeIsolated {
    for shot in shots {
        try render(shot)
    }
}
