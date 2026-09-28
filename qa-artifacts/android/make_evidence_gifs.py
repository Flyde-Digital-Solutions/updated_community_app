from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).parent
FRAMES = ROOT / "frames"
CAPTIONS = {
    "I60": ["RFID Cards: Export action", "Export saved successfully on device"],
    "I61": ["RFID import: Download Sample", "Sample CSV saved successfully on device"],
    "I66": ["Booking price shown before payment", "Confirmed booking visible in list"],
    "I68": ["Day Pass: immediate Razorpay payment only", "No Pay Later option is present"],
    "I69": ["Pending booking offers Complete Payment", "Complete Payment opens Razorpay"],
    "I70": ["Meeting-room payment options", "No Pay Later popup or option is present"],
    "I72": [
        "All six dashboard cards",
        "Tickets Raised opens Tickets",
        "Tickets Solved opens Tickets",
        "Day Pass Users opens Day Passes",
        "Visitors Today opens Guests",
        "Room Bookings opens Room Bookings",
        "Active Events opens Events",
    ],
    "I76": [
        "RFID actions on live cards",
        "Issued: Deactivate • Assigned: Unassign",
    ],
}


def font(size: int):
    path = "/System/Library/Fonts/Supplemental/Arial.ttf"
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


for ticket, captions in CAPTIONS.items():
    paths = sorted((FRAMES / ticket).glob("*.png"))
    if not paths:
        raise RuntimeError(f"No frames found for {ticket}")
    images = []
    for index, caption in enumerate(captions):
        source = paths[min(index, len(paths) - 1)]
        with Image.open(source) as original:
            image = original.convert("RGB")
        width = 430
        height = round(image.height * width / image.width)
        image = image.resize((width, height), Image.Resampling.LANCZOS)
        canvas = Image.new("RGB", (width, height + 54), "#111111")
        canvas.paste(image, (0, 54))
        draw = ImageDraw.Draw(canvas)
        draw.text((14, 15), f"OSM-{ticket}  •  {caption}", fill="#ffffff", font=font(18))
        images.append(canvas.quantize(colors=128, method=Image.Quantize.MEDIANCUT))
    output = ROOT / f"OSM-{ticket}-Android-evidence.gif"
    images[0].save(
        output,
        save_all=True,
        append_images=images[1:],
        duration=2200,
        loop=0,
        optimize=True,
    )
    print(f"{output.name}: {output.stat().st_size} bytes")
