import json, os
import zxingcpp
from PIL import Image, ImageDraw

DIR = os.path.dirname(os.path.abspath(__file__))
CERT = "SLAB-E2E-0001"
DIG_URL = f"https://my.taggrading.com/card/{CERT}"
CARD_IDENTITY = "Charizard Base Set Unlimited #4"
IMAGE_URL = f"https://my.taggrading.com/img/{CERT}.jpg"

# 1. QR PNG encoding the fake DIG URL
qr = zxingcpp.write_barcode(zxingcpp.BarcodeFormat.QRCode, DIG_URL)
qr_img = Image.fromarray(qr) if not isinstance(qr, Image.Image) else qr
# write_barcode returns a numpy array (grayscale); upscale for readability
qr_img = qr_img.convert("L").resize((qr_img.width * 8, qr_img.height * 8), Image.NEAREST)
qr_path = os.path.join(DIR, "slab-qr.png")
qr_img.save(qr_path)

# 2. Fake DIG report JSON
dig = {
    "certNumber": CERT,
    "cardName": CARD_IDENTITY,
    "grade": 9,
    "gradedBy": "TAG",
    "imageUrl": IMAGE_URL,
}
dig_path = os.path.join(DIR, f"dig-{CERT}.json")
with open(dig_path, "w") as f:
    json.dump(dig, f, indent=2)

# 3. Fake slab photo (placeholder generated image)
photo = Image.new("RGB", (300, 420), (28, 32, 40))
d = ImageDraw.Draw(photo)
d.rectangle([20, 20, 280, 400], outline=(220, 180, 60), width=4)
d.rectangle([40, 50, 260, 300], fill=(200, 60, 40))  # card art block
d.text((48, 320), "Charizard", fill=(240, 240, 240))
d.text((48, 340), "Base Set Unl #4", fill=(200, 200, 200))
d.text((48, 360), "TAG 9", fill=(240, 200, 80))
d.text((48, 380), CERT, fill=(160, 160, 160))
photo_path = os.path.join(DIR, "slab-photo.png")
photo.save(photo_path)

# 4. Synthetic spread fixture
spread = {
    "card": CARD_IDENTITY,
    "buyVenue": "TCGplayer",
    "buyUsd": 31.50,
    "sellVenue": "eBay (graded sold)",
    "sellUsd": 102.00,
    "fees": 6.00,
    "netUsd": 64.50,
    "conf": "high",
    "soldCount": 5,
}
spread_path = os.path.join(DIR, "spread.json")
with open(spread_path, "w") as f:
    json.dump(spread, f, indent=2)

# Round-trip: decode the QR we just wrote
decoded = zxingcpp.read_barcode(Image.open(qr_path))
decoded_text = decoded.text if decoded else None
roundtrip_ok = decoded_text == DIG_URL

print(json.dumps({
    "qr_path": qr_path,
    "dig_path": dig_path,
    "photo_path": photo_path,
    "spread_path": spread_path,
    "card_identity": CARD_IDENTITY,
    "dig_url": DIG_URL,
    "decoded_text": decoded_text,
    "roundtrip_ok": roundtrip_ok,
}, indent=2))
