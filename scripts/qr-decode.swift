import Foundation
import CoreImage
import AppKit

// Independent QR decoder: reads a PNG and prints whatever payload macOS's own
// CoreImage detector finds. Used only to verify qr.js — not shipped.
let args = CommandLine.arguments
guard args.count > 1, let img = CIImage(contentsOf: URL(fileURLWithPath: args[1])) else {
    print("ERR could not load image"); exit(1)
}
let ctx = CIContext()
let det = CIDetector(ofType: CIDetectorTypeQRCode, context: ctx,
                     options: [CIDetectorAccuracy: CIDetectorAccuracyHigh])!
let found = det.features(in: img).compactMap { ($0 as? CIQRCodeFeature)?.messageString }
if found.isEmpty { print("ERR no QR found") } else { found.forEach { print("OK \($0)") } }
